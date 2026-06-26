# Firmware Poup — `poup_station`

Sketch unique pour l'ESP32 : il **conserve** le pipeline J1 (WiFi + DHT22 + eau mockée
→ POST Supabase) et **ajoute** l'OLED + le réveil tactile pour faire **vivre Poup** sur
l'écran.

## Comportement
- Sur secteur, **pas de deep sleep**. L'OLED est **éteint par défaut**.
- Les mesures continuent de partir vers Supabase (toutes les 30 s en test).
- On **touche D4** → Poup s'allume, affiche son humeur selon les **vraies conditions**,
  s'anime **~45 s** (respiration + clignement), puis l'écran s'éteint.
- États (capteurs seuls, mêmes seuils que l'app `config/poup.ts`) :
  - **chaud** si température chambre > 27 °C
  - **froid** si < 15 °C
  - **content** sinon
  - *(soif / change_eau / nuit : viendront plus tard — voir bas du sketch)*

## Installation
1. Arduino IDE → **Library Manager**, installer :
   - **Adafruit SSD1306**
   - **Adafruit GFX Library**
   - (DHT sensor library + Adafruit Unified Sensor : déjà là depuis le J1)
2. **Configurer les identifiants** : copie `poup_station/secrets.example.h` en
   `poup_station/secrets.h` et renseigne ton WiFi + l'URL/secret de ton Edge Function.
   (`secrets.h` est ignoré par git, il ne sera jamais publié.)
3. Ouvrir `poup_station/poup_station.ino`, sélectionner ta carte ESP32 + le bon port.
4. **Téléverser**.

## 2 constantes à ajuster si besoin (le reste marche tel quel)
- `OLED_ADDR` (par défaut `0x3C`) → si l'écran **reste noir**, mets **`0x3D`**.
- `TOUCH_THRESHOLD` (par défaut `40`) → si le toucher ne déclenche pas, ou se déclenche
  tout seul : décommente la ligne `// Serial.println(touchRead(TOUCH_PIN));` dans `loop()`,
  ouvre le **moniteur série** (115200), relève la valeur **au repos** vs **au toucher**,
  et fixe le seuil entre les deux.

> Câblage attendu (déjà en place) : DHT22 sur GPIO 23 · OLED I2C SDA=GPIO 21 / SCL=GPIO 22 ·
> tactile sur **D4 (GPIO 4 = T0)**.

## Tester vite
- Au boot : écran éteint, et les POST apparaissent dans le moniteur série + l'app.
- **Souffle chaud** sur le DHT puis touche D4 → Poup passe en **chaud** (goutte de sueur).
- Pour forcer « chaud » à coup sûr : baisse `HOT_ROOM_C` (ex. `20.0f`) et re-téléverse.
