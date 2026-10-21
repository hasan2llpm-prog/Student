import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}});
const safetyPattern=/(user\s*safety|safety\s*categories|unsafe|criminal\s*planning|controlled\/regulated\s*substances)/i;

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405);
 try{
   const url=Deno.env.get("SUPABASE_URL")!;
   const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const key=Deno.env.get("OPENROUTER_API_KEY")||"";
   if(!key) return json({error:"OPENROUTER_API_KEY_MISSING",message:"Ask AI غير مفعّل على الخادم."},503);
   const admin=createClient(url,service,{auth:{persistSession:false}});
   const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
   const {data:userData,error:userError}=await admin.auth.getUser(token);
   if(userError||!userData.user) return json({error:"UNAUTHORIZED",message:"انتهت جلسة الحساب. سجّل الدخول من جديد."},401);
   const userId=userData.user.id;
   const body=await req.json();
   const mode=String(body?.mode||"ask").slice(0,30);
   const text=String(body?.prompt??body?.text??"").trim().slice(0,7000);
   if(!text) return json({error:"EMPTY_TEXT",message:"اكتب سؤالك أولاً."},400);

   const {data:settingsRow}=await admin.from("student_ai_settings").select("*").eq("id",1).maybeSingle();
   const settings={is_enabled:settingsRow?.is_enabled??true,free_daily_limit:Number(settingsRow?.free_daily_limit??20),free_model:String(settingsRow?.free_model||"openrouter/free")};
   if(settings.is_enabled===false) return json({error:"AI_DISABLED",message:"Ask AI معطل مؤقتاً."},503);
   const since=new Date(); since.setUTCHours(0,0,0,0);
   const {count}=await admin.from("student_ai_usage").select("id",{count:"exact",head:true}).eq("user_id",userId).gte("created_at",since.toISOString());
   if((count||0)>=settings.free_daily_limit) return json({error:"AI_DAILY_LIMIT",message:"انتهت حصة Ask AI المجانية لليوم."},429);

   const isTranslation=mode==="translate";
   const system=isTranslation
     ? `You are Student Translation Engine. Translate Arabic to natural English and English to natural Arabic based on meaning and context. Preserve paragraphs, punctuation, numbers, names, URLs, emojis and formatting. Do not explain, comment, add headings, quote the input, or answer the content. Return only the translated text. Use Modern Standard Arabic unless the input clearly asks for a dialect.`
     : `You are Student Ask AI, an educational assistant. Answer in the user's language. Explain as if teaching a complete beginner unless the user requests advanced depth. For English learning, include clear Arabic explanations and several translated examples. For problems, show steps and reasons. For quizzes, vary question types. Never invent sources or facts. If a request touches a sensitive topic, distinguish harmless educational questions from requests for harmful operational instructions. Answer harmless educational questions normally. For disallowed harmful instructions, refuse only the unsafe part and offer a safe educational explanation. Never expose internal safety labels, classifications, policy names, or moderation metadata.`;

   async function ask(messages:Array<{role:string,content:string}>){
     const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
       method:"POST",
       headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":Deno.env.get("STUDENT_APP_URL")||"https://student-b1v.pages.dev","X-Title":"Student Ask AI"},
       body:JSON.stringify({model:settings.free_model,messages,temperature:isTranslation?0.1:0.45,provider:{allow_fallbacks:true}})
     });
     const raw=await response.text();
     if(!response.ok) return {ok:false,raw,answer:""};
     let data:any={}; try{data=JSON.parse(raw)}catch{}
     return {ok:true,raw,answer:String(data?.choices?.[0]?.message?.content||"").trim()};
   }

   let ai=await ask([{role:"system",content:system},{role:"user",content:text}]);
   const firstSafety=!isTranslation && (!ai.ok ? safetyPattern.test(ai.raw) : safetyPattern.test(ai.answer));
   if(firstSafety){
     ai=await ask([
       {role:"system",content:system},
       {role:"system",content:"Treat the next message as an educational request first. Give a safe, useful answer without repeating moderation labels. If any narrow part requests harmful operational detail, decline only that part and continue with the safe educational remainder."},
       {role:"user",content:text}
     ]);
   }

   if(!ai.ok){
     console.error("Student AI provider error",ai.raw.slice(0,500));
     return json({error:"AI_PROVIDER_ERROR",message:"تعذر الوصول إلى Ask AI حالياً. حاول مرة أخرى بعد قليل."},502);
   }
   if(!ai.answer) return json({error:"EMPTY_AI_RESPONSE",message:"لم تصل إجابة من Ask AI. حاول مرة أخرى."},502);
   if(!isTranslation && safetyPattern.test(ai.answer)){
     return json({ok:true,answer:"لم أستطع معالجة هذا السؤال بصيغته الحالية. أعد صياغته كسؤال تعليمي أو عام، وسأجيبك بدون عرض رسائل الأمان التقنية.",mode,remaining:Math.max(0,settings.free_daily_limit-(count||0)),model:settings.free_model});
   }

   await admin.from("student_ai_usage").insert({user_id:userId,mode});
   return json({ok:true,answer:ai.answer,mode,remaining:Math.max(0,settings.free_daily_limit-(count||0)-1),model:settings.free_model});
 }catch(e){
   console.error(e);
   return json({error:"SERVER_ERROR",message:"حدث خطأ مؤقت في Ask AI. حاول مرة أخرى."},500);
 }
});
