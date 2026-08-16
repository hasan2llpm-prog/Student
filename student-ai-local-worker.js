let generator = null;
const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
async function ensureModel(){
  if(generator) return generator;
  postMessage({type:'status',message:'جارٍ تجهيز المساعد المجاني لأول مرة…'});
  const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
  const device = self.navigator && navigator.gpu ? 'webgpu' : 'wasm';
  generator = await mod.pipeline('text-generation', MODEL, {
    dtype:'q4', device,
    progress_callback:(p)=>{
      if(p && p.status==='progress' && typeof p.progress==='number') postMessage({type:'progress',value:Math.round(p.progress)});
    }
  });
  postMessage({type:'ready'});
  return generator;
}
self.onmessage = async (ev)=>{
  if(ev.data?.type!=='generate') return;
  try{
    const pipe = await ensureModel();
    const messages = [
      {role:'system',content:'You are Student AI, a concise tutor for Iraqi students learning English. Answer in clear Arabic when the user writes Arabic, and include useful English examples. Never claim certainty when unsure. Keep answers under 220 words unless asked for more.'},
      {role:'user',content:String(ev.data.prompt||'').slice(0,1800)}
    ];
    const out = await pipe(messages,{max_new_tokens:220,temperature:0.55,do_sample:true,top_p:0.9});
    const generated = out?.[0]?.generated_text;
    let answer='';
    if(Array.isArray(generated)) answer=generated[generated.length-1]?.content||'';
    else answer=String(generated||'').trim();
    postMessage({type:'answer',answer});
  }catch(err){postMessage({type:'error',message:err?.message||'تعذر تشغيل المساعد على هذا الجهاز.'});}
};
