import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")!;
    if (!openRouterKey) throw new Error("OPENROUTER_API_KEY_MISSING");

    const authHeader = req.headers.get("Authorization") || "";
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "UNAUTHORIZED" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const department = String(body.department || "").trim();
    const topic = String(body.topic || "").trim();
    const language = String(body.language || "العربية").trim();
    const pages = Math.min(20, Math.max(1, Number(body.pages || 4)));
    const citationStyle = String(body.citation_style || "APA").trim();
    const mode = body.mode === "premium" ? "premium" : "free";
    if (department.length < 2 || topic.length < 3) return json({ error: "INVALID_INPUT" }, 400);

    const { data: settings, error: settingsError } = await admin
      .from("academic_report_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (settingsError || !settings?.is_enabled) return json({ error: "REPORTS_DISABLED" }, 503);

    let remainingFree: number | null = null;
    let remainingCredits: number | null = null;
    if (mode === "free") {
      const { data: remaining, error } = await admin.rpc("academic_report_free_remaining", { p_user_id: userId });
      if (error) throw error;
      if ((remaining ?? 0) <= 0) return json({ error: "FREE_DAILY_LIMIT_REACHED", message: "انتهت حصتك المجانية لليوم." }, 429);
    } else {
      const { data: balance, error } = await admin.rpc("academic_report_consume_premium_credit", { p_user_id: userId });
      if (error) {
        if (String(error.message).includes("INSUFFICIENT_REPORT_CREDITS")) return json({ error: "INSUFFICIENT_REPORT_CREDITS", message: "لا يوجد رصيد كافٍ للتقارير الاحترافية." }, 402);
        throw error;
      }
      remainingCredits = Number(balance ?? 0);
    }

    const model = mode === "premium"
      ? (Deno.env.get("ACADEMIC_REPORT_PREMIUM_MODEL") || settings.premium_model || "openai/gpt-5-mini")
      : (Deno.env.get("ACADEMIC_REPORT_FREE_MODEL") || settings.free_model || "openrouter/free");

    const system = `You are Student Academic Report Studio. Produce original university-level academic reports for any field.\nRules:\n- Match the requested department and academic level.\n- Use a professional structure: title, introduction, clearly headed sections, conclusion, references.\n- For mathematical/scientific topics include correct equations/examples when relevant.\n- Never fabricate citations, DOIs, books, authors, or URLs. Use only references you are confident are real; if unsure, provide a short 'Suggested sources to verify' section instead of inventing a reference.\n- Avoid plagiarism and do not reproduce copyrighted source text.\n- Write in ${language}.\n- Target roughly ${pages} pages of normal academic prose.\n- Citation style: ${citationStyle}.`;
    const prompt = `Department: ${department}\nTopic: ${topic}\nMode: ${mode}\nCreate the complete report now.`;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("STUDENT_APP_URL") || "https://student-b1v.pages.dev",
        "X-Title": "Student",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: mode === "premium" ? 0.45 : 0.6,
      }),
    });
    const aiRaw = await aiResponse.text();
    if (!aiResponse.ok) {
      if (mode === "premium") {
        await admin.from("academic_report_balances").update({ premium_credits: (remainingCredits ?? 0) + Number(settings.premium_credit_cost || 1), updated_at: new Date().toISOString() }).eq("user_id", userId);
      }
      return json({ error: "AI_PROVIDER_ERROR", detail: aiRaw.slice(0, 500) }, 502);
    }
    const ai = JSON.parse(aiRaw);
    const content = String(ai?.choices?.[0]?.message?.content || "").trim();
    if (!content) return json({ error: "EMPTY_REPORT" }, 502);
    const title = content.split("\n").map((x:string)=>x.replace(/^#+\s*/,"").trim()).find((x:string)=>x.length > 3)?.slice(0,180) || topic;

    const { error: insertError } = await admin.from("academic_report_requests").insert({
      user_id: userId, department, topic, language, pages, citation_style: citationStyle,
      mode, status: "completed", title, content, provider_model: model,
    });
    if (insertError) console.error("academic_report_requests insert", insertError);

    if (mode === "free") {
      const { data: r } = await admin.rpc("academic_report_free_remaining", { p_user_id: userId });
      remainingFree = Number(r ?? 0);
    }

    return json({ ok: true, title, content, mode, remaining_free: remainingFree, remaining_credits: remainingCredits });
  } catch (e) {
    console.error(e);
    return json({ error: "SERVER_ERROR", message: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
