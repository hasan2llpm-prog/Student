import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AccessToken } from "npm:livekit-server-sdk@2.18.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) throw new Error("auth_required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const livekitUrl = Deno.env.get("LIVEKIT_URL")!;
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")!;
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;
    if (!livekitUrl || !apiKey || !apiSecret) throw new Error("livekit_not_configured");

    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("auth_required");

    const { room_id } = await req.json();
    if (!room_id) throw new Error("room_id_required");

    const { data: ctx, error: ctxError } = await supabase.rpc("student_voice_room_token_context_v24", { p_room_id: room_id });
    if (ctxError) throw new Error(ctxError.message);

    const identity = `u_${userData.user.id.replaceAll("-", "")}`; // pseudonymous identity; no name/email/phone
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: "Student user",
      ttl: "2h",
      metadata: JSON.stringify({ user_id: userData.user.id, room_role: ctx.room_role }),
    });
    at.addGrant({
      roomJoin: true,
      room: ctx.room_name,
      canSubscribe: true,
      canPublish: Boolean(ctx.can_publish),
      canPublishData: true,
    });
    const token = await at.toJwt();
    return new Response(JSON.stringify({ url: livekitUrl, token, can_publish: Boolean(ctx.can_publish), room_role: ctx.room_role }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
