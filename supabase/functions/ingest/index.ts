// ============================================================
//  Edge Function "ingest" — reçoit les mesures de l'ESP32
//  Fichier : supabase/functions/ingest/index.ts
// ============================================================
//  Si l'import jsr ci-dessous pose souci, remplace-le par :
//  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "jsr:@supabase/supabase-js@2";

// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement
// dans les fonctions déployées. DEVICE_SECRET, c'est toi qui le poses
// (supabase secrets set DEVICE_SECRET="...").
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const DEVICE_SECRET = Deno.env.get("DEVICE_SECRET")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth simple par secret partagé (l'ESP32 ne fait pas d'auth Supabase)
  if (req.headers.get("x-device-secret") !== DEVICE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const { device_id, room_temp, humidity, water_temp } = body ?? {};
  if (!device_id) {
    return new Response("Missing device_id", { status: 400 });
  }

  const { error } = await supabase.from("readings").insert({
    device_id,
    room_temp,
    humidity,
    water_temp,
  });

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});