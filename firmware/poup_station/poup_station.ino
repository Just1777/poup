// ============================================================
//  Gardien des fleurs — Poup Station (ESP32, J3)
//  J1 (WiFi + DHT22 + eau mockée + POST Supabase) CONSERVÉ tel quel
//  + OLED SSD1306 128x64 : Poup vit sur l'écran
//  + bouton tactile D4 (touch T0) : on touche -> Poup se réveille ~45 s -> écran off
//
//  Sur secteur, PAS de deep sleep (ça viendra avec la batterie, J4).
//
//  Librairies (Library Manager) :
//    - "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"
//    - "Adafruit SSD1306" + "Adafruit GFX Library"
//  WiFi / HTTPClient / WiFiClientSecure / Wire : inclus dans le core ESP32.
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Les humeurs de Poup. ⚠️ DÉCLARÉ EN HAUT : l'IDE Arduino génère les prototypes
// de fonctions tout en haut du sketch ; ce type doit exister avant eux.
enum PoupState { POUP_CONTENT, POUP_CHAUD, POUP_FROID, POUP_SOIF /* inerte */ };

// ----------------- Secrets (réseau / Supabase) -----------------
// Les identifiants vivent dans secrets.h (NON versionné). Copie secrets.example.h
// en secrets.h et renseigne tes valeurs. Voir firmware/README.md.
#include "secrets.h"   // définit WIFI_SSID, WIFI_PASS, INGEST_URL, DEVICE_SECRET

#define DEVICE_ID     "vase-chambre"   // identifiant de l'appareil (pas un secret)

#define DHT_PIN   23           // broche DHT22 (PAS D4 = tactile)
#define DHT_TYPE  DHT22

#define USE_MOCK_WATER 1       // 1 = sonde simulée (jusqu'à vendredi) | 0 = vraie DS18B20

// Intervalle d'envoi des mesures vers Supabase.
// 10 min = largement suffisant pour les graphes, et évite de gonfler la base.
// (30 s = 2880 lignes/jour -> dépasse vite le plafond Supabase ; 10 min = 144/jour.)
#define SEND_INTERVAL_MS 600000UL   // 10 minutes

// ----------------- OLED -----------------
#define OLED_W      128
#define OLED_H      64
#define OLED_ADDR   0x3C       // si l'écran reste noir -> essayer 0x3D
#define OLED_SDA    21
#define OLED_SCL    22

// ----------------- Tactile (auto-calibré, anti-bruit) -----------------
// Le capteur capacitif est BRUITÉ et sa valeur de repos DÉRIVE (boîtier, WiFi,
// alim). Plutôt qu'un seuil fixe fragile, on mesure le repos au boot et on
// déclenche sur une CHUTE relative, en moyennant plusieurs lectures.
#define TOUCH_PIN        T0    // T0 = GPIO4 = D4
#define TOUCH_SAMPLES    8     // nb de lectures moyennées (lisse le bruit)
#define TOUCH_DROP_PCT   30    // touché si la valeur chute de > 30 % sous le repos
#define TOUCH_DEBUG      0     // 1 = imprime les valeurs tactiles (moniteur série) pour régler
#define ANIM_MS          45000UL  // durée d'affichage de Poup au réveil (~45 s)

// ----------------- Seuils d'état (GARDER EN PHASE avec config/poup.ts) -----------------
#define HOT_ROOM_C   27.0f     // > -> chaud
#define COLD_ROOM_C  15.0f     // < -> froid
// (soif : écart eau/air < 1.5 °C — désactivée tant que l'eau est mockée, comme dans l'app)
// (change_eau + nuit : nécessitent NTP + lecture care_log -> fast-follow, pas ce soir)
// --------------------------------------------------------------------------------------

DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_SSD1306 display(OLED_W, OLED_H, &Wire, -1);
bool oledOK = false;

unsigned long lastSend = 0;

// Tactile auto-calibré
int touchBaseline = 0;  // valeur au repos (mesurée au boot)
int touchTrigger  = 0;  // seuil = baseline * (100 - TOUCH_DROP_PCT) / 100

// Moyenne de plusieurs lectures du capteur (réduit le bruit).
int readTouchAvg() {
  long sum = 0;
  for (int i = 0; i < TOUCH_SAMPLES; i++) sum += touchRead(TOUCH_PIN);
  return (int)(sum / TOUCH_SAMPLES);
}

// Mesure la valeur au repos au démarrage (NE PAS toucher pendant le boot).
void calibrateTouch() {
  int mx = 0;
  for (int i = 0; i < 20; i++) { int v = readTouchAvg(); if (v > mx) mx = v; delay(15); }
  touchBaseline = mx;
  touchTrigger  = (int)((long)mx * (100 - TOUCH_DROP_PCT) / 100);
  Serial.printf("Touch calibre : repos=%d  seuil=%d (touche si < seuil)\n", touchBaseline, touchTrigger);
}

// true si le capteur est touché (chute sous le seuil), confirmé pour éviter le bruit.
bool isTouched() {
  if (touchTrigger <= 0) return false;
  if (readTouchAvg() >= touchTrigger) return false;
  delay(20);
  return readTouchAvg() < touchTrigger;   // 2e confirmation
}

// ====================== CAPTEURS / RÉSEAU (J1) ======================

float readWaterTemp() {
#if USE_MOCK_WATER
  return 18.0 + 2.0 * sinf(millis() / 60000.0);   // sinusoïde douce ~18 °C ±2
#else
  return 0.0;   // vendredi : vraie lecture DS18B20
#endif
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi ");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? (" OK  " + WiFi.localIP().toString()) : " (timeout)");
}

void sendReading(float roomTemp, float humidity, float waterTemp) {
  WiFiClientSecure client;
  client.setInsecure();              // device perso : on saute la validation du certif

  HTTPClient http;
  http.begin(client, INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SECRET);

  char body[160];
  snprintf(body, sizeof(body),
    "{\"device_id\":\"%s\",\"room_temp\":%.1f,\"humidity\":%.1f,\"water_temp\":%.1f}",
    DEVICE_ID, roomTemp, humidity, waterTemp);

  int code = http.POST((uint8_t *)body, strlen(body));
  Serial.printf("POST -> %d : %s\n", code, http.getString().c_str());
  http.end();
}

// ====================== LOGIQUE D'ÉTAT (miroir de plantState.ts, capteurs-seuls) ======================

PoupState computeState(float roomTemp, float waterTemp) {
  // soif : seulement si la vraie sonde est branchée (sinon peu fiable -> inerte)
#if !USE_MOCK_WATER
  if (!isnan(roomTemp) && fabsf(waterTemp - roomTemp) < 1.5f) return POUP_SOIF;
#endif
  if (!isnan(roomTemp) && roomTemp > HOT_ROOM_C)  return POUP_CHAUD;
  if (!isnan(roomTemp) && roomTemp < COLD_ROOM_C) return POUP_FROID;
  return POUP_CONTENT;
}

// ====================== PHRASES (ASCII : accents/emoji retirés pour la police OLED) ======================
// Reprend l'esprit des phrases de l'app (config/poup.ts). Plusieurs variantes -> tirage.
const char* PH_content[] = { "On est au prime de fou", "Tout va bien ici" };
const char* PH_chaud[]   = { "Il fait chaud sa mere wsh", "Au frigo svp on creve" };
const char* PH_froid[]   = { "C'est le pole nord ou quoi", "Mets le chauffage on clamse" };
const char* PH_soif[]    = { "On a soif pitie de l'eau" };

String pickPhrase(PoupState s) {
  const char** arr; int n;
  switch (s) {
    case POUP_CHAUD: arr = PH_chaud;   n = sizeof(PH_chaud) / sizeof(PH_chaud[0]);     break;
    case POUP_FROID: arr = PH_froid;   n = sizeof(PH_froid) / sizeof(PH_froid[0]);     break;
    case POUP_SOIF:  arr = PH_soif;    n = sizeof(PH_soif) / sizeof(PH_soif[0]);       break;
    default:         arr = PH_content; n = sizeof(PH_content) / sizeof(PH_content[0]);
  }
  return String(arr[millis() % n]);
}

// ====================== DESSIN DE POUP (OLED 1-bit) ======================
// Blob blanc + visage noir creusé dedans. Poup paramétrable (centre + taille) pour
// pouvoir le placer petit dans un coin (mode Compact).

void drawEye(int x, int y, PoupState s, bool blink, int r) {
  if (blink) { display.fillRect(x - r, y - 1, 2 * r + 1, 2, SSD1306_BLACK); return; }
  if (s == POUP_CHAUD) { display.fillRect(x - r, y, 2 * r + 1, 2, SSD1306_BLACK); return; } // yeux fatigués
  display.fillCircle(x, y, r, SSD1306_BLACK);
  display.fillCircle(x - 1, y - 1, 1, SSD1306_WHITE);                                       // petit reflet
}

void drawMouth(int cx, int y, PoupState s) {
  switch (s) {
    case POUP_CONTENT: // grand sourire
      display.drawLine(cx - 9, y,     cx - 4, y + 5, SSD1306_BLACK);
      display.drawLine(cx - 4, y + 5, cx + 4, y + 5, SSD1306_BLACK);
      display.drawLine(cx + 4, y + 5, cx + 9, y,     SSD1306_BLACK);
      break;
    case POUP_CHAUD:   // petite bouche ouverte (halète)
      display.drawCircle(cx, y + 2, 3, SSD1306_BLACK);
      break;
    case POUP_SOIF:    // langue qui pend
      display.drawLine(cx - 5, y, cx + 5, y, SSD1306_BLACK);
      display.fillTriangle(cx - 1, y, cx + 3, y, cx + 1, y + 5, SSD1306_BLACK);
      break;
    case POUP_FROID:   // bouche serrée
    default:
      display.drawLine(cx - 5, y + 2, cx + 5, y + 2, SSD1306_BLACK);
      break;
  }
}

// Larme NOIRE en forme de goutte qui glisse sur le corps (au lieu d'un rond).
void drawTeardrop(int x, int y, uint16_t c) {
  display.fillCircle(x, y, 3, c);
  display.fillTriangle(x, y - 7, x - 3, y, x + 3, y, c);
}

// Poup paramétrable : centre (cx,cy) + taille de base (w0,h0).
void drawPoup(int cx, int cy, int w0, int h0, PoupState s, unsigned long t) {
  int dx = (s == POUP_FROID) ? (((t / 80) % 2) ? 1 : -1) : 0;       // frisson
  int squash = (int)lround(2.0 * sin((t % 2200) / 2200.0 * 6.2832));// respiration
  int w = w0 - squash, h = h0 + squash;
  int x = cx - w / 2 + dx, y = cy - h / 2;

  display.fillRoundRect(x, y, w, h, min(14, h / 2), SSD1306_WHITE);

  bool blink = (t % 3000) < 140;
  int eDX = (int)lround(w0 * 0.21), eY = cy - (int)lround(h0 * 0.09);
  int eR  = max(2, (int)lround(h0 * 0.09));
  drawEye(cx - eDX + dx, eY, s, blink, eR);
  drawEye(cx + eDX + dx, eY, s, blink, eR);
  drawMouth(cx + dx, cy + (int)lround(h0 * 0.22), s);

  // larme qui glisse sur le corps quand il fait chaud
  if (s == POUP_CHAUD) {
    int top = y + 4, bot = y + h - 4;
    if (bot > top) {
      int dropY = top + (int)((t / 40) % (unsigned long)(bot - top));
      drawTeardrop(cx + (int)lround(w0 * 0.16) + dx, dropY, SSD1306_BLACK);
    }
  }
}

// Texte mot-à-mot avec retour à la ligne (largeur en nb de caractères, ~6 px chacun).
void printWrapped(int x, int y, int maxChars, const String& text, int maxLines) {
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  String cur = "";
  int line = 0, i = 0;
  int len = text.length();
  while (i <= len && line < maxLines) {
    int sp = text.indexOf(' ', i);
    String word = (sp == -1) ? text.substring(i) : text.substring(i, sp);
    String trial = cur.length() ? cur + " " + word : word;
    if ((int)trial.length() <= maxChars) {
      cur = trial;
    } else {
      display.setCursor(x, y + line * 9); display.print(cur);
      line++; cur = word;
    }
    if (sp == -1) { if (line < maxLines) { display.setCursor(x, y + line * 9); display.print(cur); } break; }
    i = sp + 1;
  }
}

// Bandeau data en bas : chambre / humidite / eau.
void drawDataBand(float tC, float h, float w) {
  display.drawFastHLine(0, 49, 128, SSD1306_WHITE);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  char b[12];
  display.setCursor(4, 54);  snprintf(b, sizeof(b), "%.0fC", tC); display.print(b);
  display.setCursor(50, 54); snprintf(b, sizeof(b), "%.0f%%", h); display.print(b);
  display.setCursor(92, 54); snprintf(b, sizeof(b), "%.0fCe", w); display.print(b);
}

// Réveille Poup : lit l'état réel, anime ~45 s (mode COMPACT), puis éteint l'écran.
void wakePoup() {
  float h = dht.readHumidity();
  float tC = dht.readTemperature();
  float w = readWaterTemp();
  if (isnan(tC)) tC = 20;   // repli pour que l'affichage marche même si lecture ratée
  if (isnan(h))  h = 0;
  PoupState s = computeState(tC, w);
  String phrase = pickPhrase(s);
  Serial.printf("Touch -> T=%.1f H=%.1f Weau=%.1f  etat=%d\n", tC, h, w, s);

  if (!oledOK) return;
  display.ssd1306_command(SSD1306_DISPLAYON);
  display.setTextWrap(false);

  unsigned long animStart = millis();
  while (millis() - animStart < ANIM_MS) {
    unsigned long t = millis() - animStart;
    display.clearDisplay();

    // petit Poup dans le coin haut-gauche
    drawPoup(22, 22, 30, 28, s, t);
    // nom + phrase à droite de Poup
    display.setTextSize(1); display.setTextColor(SSD1306_WHITE);
    display.setCursor(42, 3); display.print("Poup");
    printWrapped(42, 14, 14, phrase, 3);
    // bandeau data en bas
    drawDataBand(tC, h, w);

    display.display();

    if (readTouchAvg() < touchTrigger) animStart = millis(); // re-toucher prolonge
    delay(40); // ~25 img/s
  }

  display.clearDisplay();
  display.display();
  display.ssd1306_command(SSD1306_DISPLAYOFF);
}

// ====================== SETUP / LOOP ======================

void setup() {
  Serial.begin(115200);
  delay(200);
  dht.begin();

  Wire.begin(OLED_SDA, OLED_SCL);
  oledOK = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (!oledOK) {
    Serial.println("OLED introuvable : verifier le cablage / essayer OLED_ADDR 0x3D");
  } else {
    display.clearDisplay();
    display.display();
    display.ssd1306_command(SSD1306_DISPLAYOFF); // éteint par défaut
  }

  calibrateTouch();   // mesure le repos du capteur (ne pas toucher au boot)
  connectWiFi();
}

void loop() {
  // 1) POST périodique vers Supabase (inchangé J1) — l'app garde ses données
  if (lastSend == 0 || millis() - lastSend >= SEND_INTERVAL_MS) {
    connectWiFi();
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    float w = readWaterTemp();
    if (isnan(h) || isnan(t)) {
      Serial.println("Lecture DHT22 ratee, on reessaie au prochain tour");
    } else {
      Serial.printf("T=%.1f  H=%.1f  Weau=%.1f\n", t, h, w);
      sendReading(t, h, w);
    }
    lastSend = millis();
  }

  // 2) Tactile : on touche D4 -> Poup se réveille (auto-calibré + moyenné)
#if TOUCH_DEBUG
  Serial.printf("touch=%d  (repos=%d seuil=%d)\n", readTouchAvg(), touchBaseline, touchTrigger);
#endif
  if (isTouched()) {
    wakePoup();
  }

  delay(20);   // polling plus serré -> ne rate plus les touches courtes
}

// ============================================================
//  FAST-FOLLOW (plus tard, pas ce soir) :
//   - change_eau + nuit : NTP (configTzTime, TZ Paris) + GET care_log (REST anon)
//   - vendredi : vraie sonde DS18B20 -> USE_MOCK_WATER 0, réactive 'soif'
//   - J4 : deep sleep (réveil timer + tactile), WiFiManager, boîtier
// ============================================================
