import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}});

function extractJson(raw:string){
  const clean=raw.replace(/```json|```/gi,"").trim();
  try{return JSON.parse(clean)}catch{}
  const start=clean.indexOf("{"); const end=clean.lastIndexOf("}");
  if(start>=0&&end>start){try{return JSON.parse(clean.slice(start,end+1))}catch{}}
  return null;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openRouterKey=Deno.env.get("OPENROUTER_API_KEY")||"";
    const model=Deno.env.get("PUBLIC_MEDIA_MODERATION_MODEL")||"google/gemini-2.5-flash";
    if(!openRouterKey) return json({status:"review",reason:"moderation_unavailable",message:"خدمة فحص المحتوى غير مفعّلة على الخادم."},503);

    const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
    const {data:userData,error:userError}=await admin.auth.getUser(token);
    if(userError||!userData.user) return json({error:"UNAUTHORIZED"},401);
    const userId=userData.user.id;

    const body=await req.json();
    const mediaUrl=String(body?.media_url||"").trim();
    const mediaType=String(body?.media_type||"").trim().toLowerCase();
    const text=String(body?.text||"").trim().slice(0,1000);
    const previews=Array.isArray(body?.preview_urls)?body.preview_urls.map((v:unknown)=>String(v||"").trim()).filter(Boolean).slice(0,3):[];
    if(!mediaUrl||!["image","video"].includes(mediaType)) return json({error:"INVALID_MEDIA"},400);

    const imageUrls=mediaType==="image"?[mediaUrl]:previews;
    if(mediaType==="video"&&imageUrls.length===0){
      await admin.from("student_public_media_moderation_v27").insert({user_id:userId,media_url:mediaUrl,media_type:mediaType,status:"review",reason:"video_preview_missing",provider:"openrouter",details:{preview_count:0}});
      return json({status:"review",reason:"video_preview_missing"});
    }

    const content:any[]=[{
      type:"text",
      text:`Classify only whether this public Student-app media contains clear visible nudity or explicit sexual imagery. Do not reject ordinary clothing, swimwear, medical/educational non-explicit context, faces, or ambiguous skin exposure. Return ONLY JSON: {"status":"approved"|"rejected"|"review","reason":"short_reason"}. Use rejected only for clear nudity/explicit sexual imagery; use review when uncertain. Caption: ${text}`
    }];
    for(const url of imageUrls) content.push({type:"image_url",image_url:{url}});

    const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${openRouterKey}`,
        "Content-Type":"application/json",
        "HTTP-Referer":Deno.env.get("STUDENT_APP_URL")||"https://student-b1v.pages.dev",
        "X-Title":"Student Public Media Moderation"
      },
      body:JSON.stringify({
        model,
        messages:[
          {role:"system",content:"You are a strict but conservative media safety classifier. Output JSON only."},
          {role:"user",content}
        ],
        temperature:0,
        max_tokens:100
      })
    });
    const raw=await response.text();
    if(!response.ok){
      console.error("moderation provider",raw.slice(0,500));
      await admin.from("student_public_media_moderation_v27").insert({user_id:userId,media_url:mediaUrl,media_type:mediaType,status:"review",reason:"provider_error",provider:"openrouter",details:{http_status:response.status}});
      return json({status:"review",reason:"provider_error",message:"تعذر الوصول إلى خدمة فحص المحتوى الآن."},502);
    }
    let provider:any={}; try{provider=JSON.parse(raw)}catch{}
    const answer=String(provider?.choices?.[0]?.message?.content||"");
    const parsed=extractJson(answer)||{};
    const requested=String(parsed.status||"review").toLowerCase();
    const status=["approved","rejected","review"].includes(requested)?requested:"review";
    const reason=String(parsed.reason||"classified").slice(0,200);

    const {error:insertError}=await admin.from("student_public_media_moderation_v27").insert({
      user_id:userId,media_url:mediaUrl,media_type:mediaType,status,reason,provider:"openrouter",details:{model,preview_count:imageUrls.length}
    });
    if(insertError){ console.error(insertError); return json({error:"AUDIT_WRITE_FAILED",message:"تعذر حفظ نتيجة فحص المحتوى على الخادم."},500); }
    return json({status,reason});
  }catch(e){
    console.error(e);
    return json({status:"review",reason:"server_error",message:"حدث خطأ مؤقت أثناء فحص المحتوى."},500);
  }
});
