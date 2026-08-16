/* =========================================================
   Student AI — Smart Learning + Freemium
   Free: pronunciation, basic translation, quizzes, daily challenge, progress
   Premium: AI chat, lesson explanation, AI question generation, advanced translation
========================================================= */
(function () {
    "use strict";

    if (window.StudentAI?.version === "2.0.0") return;

    const PAGE_ID = "student-ai-page";
    const state = {
        subscription: null,
        stats: null,
        quiz: [],
        quizIndex: 0,
        score: 0,
        answered: false,
        currentTool: "home",
        adminSearchTimer: null,
        englishProfile: null,
        localAIWorker: null,
        localAIReady: false
    };

    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));

    function client() {
        try { return typeof supabaseClient !== "undefined" ? supabaseClient : null; }
        catch (_) { return null; }
    }

    function user() {
        try { return typeof currentUser !== "undefined" ? currentUser : null; }
        catch (_) { return null; }
    }

    function profile() {
        try { return typeof currentProfile !== "undefined" ? currentProfile : null; }
        catch (_) { return null; }
    }

    function isAdmin() {
        return String(profile()?.role || "").toLowerCase() === "admin";
    }

    function isPremium() {
        const sub = state.subscription;
        if (!sub?.active) return false;
        if (!sub.expires_at) return true;
        return new Date(sub.expires_at).getTime() > Date.now();
    }

    function formatDate(value) {
        if (!value) return "—";
        try { return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium" }).format(new Date(value)); }
        catch (_) { return String(value); }
    }

    function injectStyle() {
        if (document.getElementById("student-ai-style")) return;
        const style = document.createElement("style");
        style.id = "student-ai-style";
        style.textContent = `
            .sai-wrap{max-width:780px;margin:0 auto;padding:16px 14px 88px;direction:rtl;color:#172033;font-family:inherit}
            .sai-hero{background:linear-gradient(135deg,#182848,#4b6cb7);border-radius:24px;padding:22px;color:#fff;box-shadow:0 15px 35px rgba(28,53,105,.22);margin-bottom:15px}
            .sai-hero-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.sai-brand{font-weight:1000;font-size:25px}.sai-sub{opacity:.9;font-size:13px;line-height:1.8;margin-top:6px}
            .sai-plan{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900;white-space:nowrap}
            .sai-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.sai-stat{background:rgba(255,255,255,.11);border-radius:14px;padding:10px;text-align:center}.sai-stat b{display:block;font-size:19px}.sai-stat span{font-size:11px;opacity:.9}
            .sai-section-title{font-size:16px;font-weight:1000;margin:18px 2px 10px}.sai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.sai-card{border:0;background:#fff;border-radius:18px;padding:16px;box-shadow:0 5px 18px rgba(15,23,42,.07);text-align:right;min-height:122px;position:relative;color:#172033}.sai-card:active{transform:scale(.985)}
            .sai-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#eef3ff;color:#3155a4;font-size:20px;margin-bottom:10px}.sai-card-title{font-weight:1000;font-size:15px}.sai-card-desc{font-size:11.5px;color:#697386;line-height:1.6;margin-top:5px}.sai-badge{position:absolute;top:11px;left:11px;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:1000;background:#fff2cc;color:#8a5d00}.sai-free{background:#eafaf0;color:#17713b}
            .sai-panel{background:#fff;border-radius:20px;padding:16px;box-shadow:0 5px 18px rgba(15,23,42,.07)}.sai-field{width:100%;border:1px solid #dce2ea;background:#fbfcfe;border-radius:14px;padding:12px 13px;box-sizing:border-box;font:inherit;color:#172033;outline:none}.sai-field:focus{border-color:#5977bd;box-shadow:0 0 0 3px rgba(89,119,189,.1)} textarea.sai-field{min-height:120px;resize:vertical}
            .sai-row{display:flex;gap:9px;align-items:center}.sai-row>*{min-width:0}.sai-btn{border:0;border-radius:13px;padding:11px 14px;font:inherit;font-weight:900;background:#3155a4;color:#fff}.sai-btn.secondary{background:#eef2f7;color:#29364b}.sai-btn.success{background:#16884a}.sai-btn.danger{background:#bb3241}.sai-btn:disabled{opacity:.55}.sai-result{margin-top:12px;border-radius:14px;padding:13px;background:#f5f7fb;line-height:1.9;white-space:pre-wrap}.sai-note{font-size:11px;color:#778195;line-height:1.7;margin-top:8px}
            .sai-tool-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.sai-tool-title{font-size:19px;font-weight:1000}.sai-back{border:0;background:#eef2f7;border-radius:12px;width:40px;height:40px;font-size:17px;color:#24334b}
            .sai-paywall{text-align:center;padding:28px 16px}.sai-lock{font-size:46px}.sai-paywall h3{font-size:20px;margin:12px 0 7px}.sai-paywall p{color:#697386;line-height:1.8;font-size:13px}.sai-price-info{background:#f7f9fc;border-radius:14px;padding:12px;margin:12px 0;font-size:12px;color:#4d596c}.sai-checkout{text-align:right}.sai-plan-list{display:grid;gap:10px;margin:14px 0}.sai-plan-option{border:1px solid #dce2ea;background:#fff;border-radius:16px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:right}.sai-plan-option.active{border-color:#3155a4;box-shadow:0 0 0 3px rgba(49,85,164,.10);background:#f7f9ff}.sai-plan-option b{font-size:15px}.sai-plan-option span{font-weight:1000;color:#3155a4}.sai-paybox{border:1px solid #e0e5ec;border-radius:16px;padding:14px;background:#fbfcfe;margin:12px 0}.sai-payline{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed #e0e5ec}.sai-payline:last-child{border-bottom:0}.sai-copy{border:0;background:#eef2f7;border-radius:9px;padding:5px 8px;font:inherit;font-size:11px;font-weight:900}.sai-whatsapp{background:#16884a}.sai-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sai-admin-grid .sai-field{text-align:center}
            .sai-option{display:block;width:100%;border:1px solid #dce2ea;background:#fff;border-radius:13px;padding:12px;text-align:right;margin:8px 0;font:inherit}.sai-option.good{border-color:#2d9c62;background:#effbf4}.sai-option.bad{border-color:#cf5967;background:#fff1f3}.sai-progress{height:7px;border-radius:99px;background:#edf0f5;overflow:hidden;margin:9px 0 14px}.sai-progress>span{display:block;height:100%;background:#3155a4;border-radius:99px}
            .sai-admin-list{display:grid;gap:9px;margin-top:12px}.sai-user{border:1px solid #e0e5ec;border-radius:14px;padding:11px}.sai-user strong{display:block}.sai-user small{color:#727d8e}.sai-pill{display:inline-block;border-radius:999px;padding:4px 8px;background:#eef2f7;font-size:10px;font-weight:900;margin-top:6px}.sai-pill.on{background:#e8f8ee;color:#18753e}
            .sai-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:2147483647;background:#172033;color:#fff;padding:10px 14px;border-radius:12px;font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,.22);max-width:85%;text-align:center}
            @media(max-width:380px){.sai-grid{grid-template-columns:1fr}.sai-stats{grid-template-columns:repeat(3,1fr)}.sai-hero-top{align-items:flex-start}.sai-brand{font-size:22px}}
        `;
        document.head.appendChild(style);
    }

    function toast(message) {
        document.querySelector(".sai-toast")?.remove();
        const el = document.createElement("div");
        el.className = "sai-toast";
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2600);
    }

    function pageBody() {
        return document.querySelector(`[data-student-nav-page="${PAGE_ID}"] .student-internal-body`);
    }

    async function open() {
        injectStyle();
        if (!user()) {
            toast("سجّل الدخول أولاً لاستخدام التعلّم الذكي.");
            return;
        }
        const nav = window.StudentNavigation;
        if (!nav?.openPage) {
            toast("تعذر فتح الصفحة حاليًا.");
            return;
        }
        nav.openPage({ id: PAGE_ID, title: "Student AI", html: '<div class="sai-wrap"><div class="sai-panel">جارٍ تجهيز التعلّم الذكي...</div></div>', reuse: true });
        await Promise.allSettled([loadSubscription(), loadStats(), loadEnglishProfile()]);
        renderHome();
    }

    async function loadSubscription() {
        const c = client();
        if (!c) return;
        const { data, error } = await c.rpc("student_get_my_subscription");
        if (!error) state.subscription = Array.isArray(data) ? data[0] : data;
        else state.subscription = { active: false, plan: "free" };
    }

    async function loadStats() {
        const c = client();
        if (!c) return;
        const { data, error } = await c.rpc("student_get_my_learning_stats");
        if (!error) state.stats = Array.isArray(data) ? data[0] : data;
        else state.stats = { xp: 0, streak: 0, answered: 0, correct: 0 };
    }

    function toolCard(id, icon, title, desc, premium = false) {
        return `<button class="sai-card" type="button" data-sai-tool="${esc(id)}">
            <span class="sai-badge ${premium ? "" : "sai-free"}">${premium ? "PREMIUM" : "مجاني"}</span>
            <span class="sai-icon"><i class="${esc(icon)}"></i></span>
            <div class="sai-card-title">${esc(title)}</div><div class="sai-card-desc">${esc(desc)}</div>
        </button>`;
    }

    function renderHome() {
        state.currentTool = "home";
        const body = pageBody();
        if (!body) return;
        const s = state.stats || {};
        const premium = isPremium();
        body.innerHTML = `<div class="sai-wrap">
            <section class="sai-hero">
                <div class="sai-hero-top"><div><div class="sai-brand">✨ Student AI</div><div class="sai-sub">تعلّم، اختبر نفسك، حسّن لغتك وتابع تقدمك من مكان واحد.</div></div><span class="sai-plan">${premium ? "👑 Premium" : "🟢 Free"}</span></div>
                <div class="sai-stats"><div class="sai-stat"><b>${Number(s.xp || 0)}</b><span>XP</span></div><div class="sai-stat"><b>${Number(s.streak || 0)} 🔥</b><span>الاستمرار</span></div><div class="sai-stat"><b>${Number(s.answered || 0)}</b><span>إجابة</span></div></div>
            </section>
            <div class="sai-section-title">أدوات مجانية</div>
            <div class="sai-grid">
                ${toolCard("local_ai", "fa-solid fa-robot", "اسأل Student AI مجانًا", "مساعد تعليمي مجاني يجيبك مباشرة على جهازك.")}
                ${toolCard("placement", "fa-solid fa-gauge-high", "حدد مستواي", `اختبار ذكي يحدد مستواك ${esc(getEnglishLevel())} ويخصص التدريب لك.`)}
                ${toolCard("translate", "fa-solid fa-language", "الترجمة", "عربي ⇄ إنجليزي مع إمكانية سماع النطق.")}
                ${toolCard("pronounce", "fa-solid fa-volume-high", "النطق الأمريكي والبريطاني", "🇺🇸 أمريكي و🇬🇧 بريطاني + سرعة بطيئة واختبار نطقك.")}
                ${toolCard("word_day", "fa-solid fa-calendar-day", "كلمة اليوم", "كلمة جديدة تلقائيًا كل يوم حسب مستواك.")}
                ${toolCard("flashcards", "fa-solid fa-layer-group", "بطاقات المفردات", "تدريب تلقائي ومراجعة كلمات مناسبة لمستواك.")}
                ${toolCard("word_bank", "fa-solid fa-book-open", "بنك 5000 كلمة", "ابحث في كلمات مرتبة حسب A1–C2 واستمع لنطقها.")}
                ${toolCard("listen_write", "fa-solid fa-headphones", "استمع واكتب", "اسمع جملة واكتبها لتحسين الاستماع والإملاء.")}
                ${toolCard("sentence_order", "fa-solid fa-arrow-down-a-z", "رتّب الجملة", "كوّن الجملة الصحيحة من كلمات مبعثرة.")}
                ${toolCard("irregular", "fa-solid fa-shuffle", "الأفعال الشاذة", "تدريب تلقائي على الماضي والتصريف الثالث.")}
                ${toolCard("quiz", "fa-solid fa-list-check", "اختبرني", "أسئلة قصيرة وتصحيح فوري مع XP.")}
                ${toolCard("daily", "fa-solid fa-fire", "تحدي اليوم", "سؤال يومي للحفاظ على سلسلة التعلم.")}
                ${toolCard("progress", "fa-solid fa-chart-line", "تقدمي", "شاهد مستواك ونقاطك ودقة إجاباتك واستمرارك.")}
            </div>
            <div class="sai-section-title">Student AI Premium</div>
            <div class="sai-grid">
                ${toolCard("chat", "fa-solid fa-comments", "اسأل Student AI", "اسأل عن أي موضوع دراسي واحصل على شرح منظم.", true)}
                ${toolCard("explain", "fa-solid fa-person-chalkboard", "اشرح لي درسًا", "تبسيط الدرس حسب مستواك مع أمثلة.", true)}
                ${toolCard("generate", "fa-solid fa-wand-magic-sparkles", "ولّد لي أسئلة", "أنشئ تدريبًا جديدًا من أي موضوع.", true)}
                ${toolCard("smart_translate", "fa-solid fa-earth-americas", "ترجمة ذكية", "ترجمة سياقية مع شرح الكلمات والأسلوب.", true)}
            </div>
            ${isAdmin() ? `<div class="sai-section-title">الإدارة</div><div class="sai-grid">${toolCard("admin_subscriptions", "fa-solid fa-user-shield", "إدارة Premium", "بحث المستخدمين وتفعيل أو إلغاء الاشتراك.")}</div>` : ""}
            <div class="sai-note" style="text-align:center;margin-top:18px"><button id="sai-open-data-notices" class="sai-copy" type="button">مصادر المحتوى المفتوح</button></div>
        </div>`;
        body.querySelectorAll("[data-sai-tool]").forEach((btn) => btn.addEventListener("click", () => openTool(btn.dataset.saiTool)));
        body.querySelector("#sai-open-data-notices")?.addEventListener("click",()=>window.open("OPEN_DATA_NOTICES.txt","_blank","noopener"));
    }

    function renderTool(title, html) {
        const body = pageBody();
        if (!body) return;
        body.innerHTML = `<div class="sai-wrap"><div class="sai-tool-head"><div class="sai-tool-title">${esc(title)}</div><button class="sai-back" type="button" data-sai-home aria-label="رجوع"><i class="fa-solid fa-arrow-right"></i></button></div>${html}</div>`;
        body.querySelector("[data-sai-home]")?.addEventListener("click", renderHome);
    }

    function openTool(id) {
        state.currentTool = id;
        const premiumTools = new Set(["chat", "explain", "generate", "smart_translate"]);
        if (premiumTools.has(id) && !isPremium()) return renderPaywall(id);
        if (id === "local_ai") return renderLocalAI();
        if (id === "placement") return startPlacement();
        if (id === "translate") return renderTranslate();
        if (id === "pronounce") return renderPronounce();
        if (id === "word_day") return renderWordOfDay();
        if (id === "flashcards") return renderFlashcards();
        if (id === "word_bank") return renderWordBank();
        if (id === "listen_write") return renderListenWrite();
        if (id === "sentence_order") return renderSentenceOrder();
        if (id === "irregular") return renderIrregular();
        if (id === "quiz") return startQuiz();
        if (id === "daily") return renderDailyChallenge();
        if (id === "progress") return renderProgress();
        if (premiumTools.has(id)) return renderPremiumAI(id);
        if (id === "admin_subscriptions" && isAdmin()) return renderAdminSubscriptions();
    }

    function renderTranslate() {
        renderTool("الترجمة", `<div class="sai-panel">
            <div class="sai-row"><select id="sai-translate-dir" class="sai-field"><option value="ar|en">العربية ← الإنجليزية</option><option value="en|ar">الإنجليزية ← العربية</option></select></div>
            <textarea id="sai-translate-text" class="sai-field" maxlength="450" placeholder="اكتب النص هنا..." style="margin-top:10px"></textarea>
            <div class="sai-row" style="margin-top:10px"><button id="sai-translate-go" class="sai-btn" type="button">ترجم</button><button id="sai-translate-speak" class="sai-btn secondary" type="button">🔊 نطق النتيجة</button></div>
            <div id="sai-translate-result" class="sai-result" hidden></div>
            <div class="sai-note">ترجمة سريعة عربي ⇄ إنجليزي مع إمكانية سماع النتيجة.</div>
        </div>`);
        const result = document.getElementById("sai-translate-result");
        document.getElementById("sai-translate-go")?.addEventListener("click", async (e) => {
            const text = document.getElementById("sai-translate-text")?.value.trim();
            const dir = document.getElementById("sai-translate-dir")?.value || "ar|en";
            if (!text) return toast("اكتب نصًا للترجمة.");
            e.currentTarget.disabled = true; e.currentTarget.textContent = "جارٍ الترجمة...";
            try {
                const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(dir)}`;
                const response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
                if (!response.ok) throw new Error("translation_failed");
                const json = await response.json();
                const translated = String(json?.responseData?.translatedText || "").trim();
                if (!translated) throw new Error("empty_translation");
                result.hidden = false; result.textContent = translated; result.dataset.lang = dir.split("|")[1];
            } catch (_) {
                result.hidden = false; result.textContent = "تعذر الوصول إلى خدمة الترجمة المجانية الآن. حاول لاحقًا.";
            } finally { e.currentTarget.disabled = false; e.currentTarget.textContent = "ترجم"; }
        });
        document.getElementById("sai-translate-speak")?.addEventListener("click", () => {
            if (!result || result.hidden || !result.textContent) return toast("ترجم النص أولاً.");
            speak(result.textContent, result.dataset.lang === "ar" ? "ar-IQ" : "en-US");
        });
    }

    function availableVoices(lang) {
        if (!("speechSynthesis" in window)) return [];
        const base = String(lang || "en-US").toLowerCase();
        const exact = (speechSynthesis.getVoices() || []).filter(v => String(v.lang || "").toLowerCase() === base);
        const family = (speechSynthesis.getVoices() || []).filter(v => String(v.lang || "").toLowerCase().startsWith(base.slice(0,2)));
        const list = exact.length ? exact : family;
        return list.sort((a,b) => voiceScore(b,base)-voiceScore(a,base));
    }

    function voiceScore(v, lang) {
        let n=0, name=String(v.name||"").toLowerCase(), vl=String(v.lang||"").toLowerCase();
        if(vl===lang) n+=10; if(v.localService) n+=3;
        if(/google|microsoft|natural|neural|enhanced|premium|samantha|daniel/.test(name)) n+=4;
        return n;
    }

    function speak(text, lang, rate=0.92) {
        if (!("speechSynthesis" in window)) return toast("النطق غير مدعوم على هذا الجهاز.");
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(String(text || ""));
        utter.lang = lang || "en-US";
        utter.rate = Number(rate || .92);
        const voices=availableVoices(utter.lang);
        if(voices[0]) utter.voice=voices[0];
        window.speechSynthesis.speak(utter);
    }

    function renderPronounce() {
        renderTool("النطق", `<div class="sai-panel">
            <textarea id="sai-pronounce-text" class="sai-field" maxlength="500" placeholder="مثال: Education is the key to success."></textarea>
            <div class="sai-row" style="margin-top:10px;flex-wrap:wrap">
              <button class="sai-btn" data-accent="en-US" type="button">🇺🇸 أمريكي</button>
              <button class="sai-btn secondary" data-accent="en-GB" type="button">🇬🇧 بريطاني</button>
            </div>
            <div class="sai-row" style="margin-top:9px"><button id="sai-pronounce-normal" class="sai-btn" type="button">🔊 نطق واضح</button><button id="sai-pronounce-slow" class="sai-btn secondary" type="button">🐢 بطيء للتدريب</button></div>
            <button id="sai-pronounce-test" class="sai-btn success" style="width:100%;margin-top:9px" type="button">🎤 اختبر نطقي</button>
            <div id="sai-pronounce-result" class="sai-result" hidden></div>
            <div class="sai-note">يختار Student تلقائيًا أفضل صوت متاح على جهازك للهجة التي تختارها.</div>
        </div>`);
        let accent="en-US";
        document.querySelectorAll("[data-accent]").forEach(btn=>btn.addEventListener("click",()=>{
            accent=btn.dataset.accent; document.querySelectorAll("[data-accent]").forEach(x=>x.classList.toggle("secondary",x!==btn));
        }));
        const run=(rate)=>{const text=document.getElementById("sai-pronounce-text")?.value.trim();if(!text)return toast("اكتب كلمة أو جملة أولاً.");speak(text,accent,rate);};
        document.getElementById("sai-pronounce-normal")?.addEventListener("click",()=>run(.92));
        document.getElementById("sai-pronounce-slow")?.addEventListener("click",()=>run(.66));
        document.getElementById("sai-pronounce-test")?.addEventListener("click",()=>testPronunciation(accent));
    }

    function normalizeSpeech(s){return String(s||"").toLowerCase().replace(/[^a-z0-9' ]/g,' ').replace(/\s+/g,' ').trim();}
    function wordSimilarity(a,b){
        const x=normalizeSpeech(a).split(' ').filter(Boolean), y=normalizeSpeech(b).split(' ').filter(Boolean);
        if(!x.length||!y.length)return 0; const used=new Set(); let hit=0;
        x.forEach(w=>{const i=y.findIndex((z,j)=>!used.has(j)&&z===w);if(i>=0){used.add(i);hit++;}});
        return Math.round((2*hit/(x.length+y.length))*100);
    }
    function testPronunciation(accent){
        const target=document.getElementById("sai-pronounce-text")?.value.trim(); if(!target)return toast("اكتب الجملة التي تريد التدرب عليها.");
        const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR)return toast("اختبار النطق الصوتي غير متاح على هذا الجهاز، لكن الاستماع يعمل.");
        const btn=document.getElementById("sai-pronounce-test"), out=document.getElementById("sai-pronounce-result");
        const rec=new SR(); rec.lang=accent; rec.interimResults=false; rec.maxAlternatives=1; btn.disabled=true; btn.textContent="🎙️ تكلّم الآن…";
        rec.onresult=(e)=>{const heard=e.results?.[0]?.[0]?.transcript||''; const score=wordSimilarity(target,heard);out.hidden=false;out.textContent=`سمعت: ${heard}\nالتطابق: ${score}%${score>=85?' ✅ ممتاز':score>=65?' 👍 جيد':' 🔁 حاول مرة أخرى'}`;recordFreeAttempt(score>=70,'pronunciation'); const levels=['A1','A2','B1','B2','C1','C2']; let li=Math.max(0,levelIndex(getEnglishLevel())); if(score<60)li=Math.max(0,li-1); const lvl=levels[li]; state.englishProfile={...(state.englishProfile||{}),pronunciation_level:lvl}; const c=client(); if(c)c.rpc('student_update_english_skill',{p_skill:'pronunciation',p_level:lvl}).then(()=>{});};
        rec.onerror=()=>{out.hidden=false;out.textContent="تعذر التقاط الصوت. تأكد من إذن الميكروفون وحاول مجددًا.";};
        rec.onend=()=>{btn.disabled=false;btn.textContent="🎤 اختبر نطقي";}; rec.start();
    }

    async function startQuiz() {
        renderTool("اختبرني", `<div class="sai-panel" id="sai-quiz-box">جارٍ تحميل الأسئلة...</div>`);
        const c = client();
        if (!c) return;
        let { data, error } = await c.rpc("student_get_quiz_questions", { p_limit: 10 });
        if (error || !data?.length) {
            document.getElementById("sai-quiz-box").textContent = "لا توجد أسئلة متاحة حاليًا. شغّل ملف SQL المرفق لإضافة بنك الأسئلة.";
            return;
        }
        state.quiz = data; state.quizIndex = 0; state.score = 0; state.answered = false;
        renderQuizQuestion();
    }

    function parseOptions(q) {
        if (Array.isArray(q.options)) return q.options;
        try { return JSON.parse(q.options || "[]"); } catch (_) { return []; }
    }

    function renderQuizQuestion() {
        const box = document.getElementById("sai-quiz-box");
        const q = state.quiz[state.quizIndex];
        if (!box || !q) return finishQuiz();
        const options = parseOptions(q);
        const percent = Math.round((state.quizIndex / state.quiz.length) * 100);
        box.innerHTML = `<div style="font-size:12px;color:#6e7888">السؤال ${state.quizIndex + 1} من ${state.quiz.length}</div><div class="sai-progress"><span style="width:${percent}%"></span></div><div style="font-size:17px;font-weight:1000;line-height:1.8">${esc(q.question)}</div><div id="sai-options">${options.map((o, i) => `<button class="sai-option" type="button" data-answer="${i}">${esc(o)}</button>`).join("")}</div><div id="sai-explanation" class="sai-result" hidden></div><button id="sai-next-q" class="sai-btn" type="button" hidden style="margin-top:9px">التالي</button>`;
        box.querySelectorAll("[data-answer]").forEach((btn) => btn.addEventListener("click", () => answerQuiz(Number(btn.dataset.answer), q)));
        box.querySelector("#sai-next-q")?.addEventListener("click", () => { state.quizIndex += 1; state.answered = false; renderQuizQuestion(); });
    }

    async function answerQuiz(index, q) {
        if (state.answered) return;
        state.answered = true;
        const correct = Number(q.correct_index) === index;
        if (correct) state.score += 1;
        document.querySelectorAll("#sai-options [data-answer]").forEach((btn) => {
            const i = Number(btn.dataset.answer);
            if (i === Number(q.correct_index)) btn.classList.add("good");
            else if (i === index) btn.classList.add("bad");
            btn.disabled = true;
        });
        const expl = document.getElementById("sai-explanation");
        if (expl) { expl.hidden = false; expl.textContent = `${correct ? "✅ إجابة صحيحة" : "❌ إجابة غير صحيحة"}${q.explanation ? `\n${q.explanation}` : ""}`; }
        document.getElementById("sai-next-q").hidden = false;
        const c = client();
        if (c) c.rpc("student_record_learning_answer", { p_correct: correct, p_kind: "quiz", p_question_id: q.id }).then(() => {});
    }

    async function finishQuiz() {
        const box = document.getElementById("sai-quiz-box");
        if (!box) return;
        const total = state.quiz.length || 1;
        const pct = Math.round((state.score / total) * 100);
        box.innerHTML = `<div style="text-align:center;padding:15px"><div style="font-size:44px">${pct >= 70 ? "🎉" : "📚"}</div><h3>نتيجتك ${state.score}/${total}</h3><div style="font-size:26px;font-weight:1000">${pct}%</div><p style="color:#697386">${pct >= 70 ? "أداء ممتاز، استمر." : "أعد التدريب وستتحسن نتيجتك."}</p><button class="sai-btn" id="sai-retry" type="button">اختبار جديد</button></div>`;
        await loadStats();
        document.getElementById("sai-retry")?.addEventListener("click", startQuiz);
    }

    async function renderDailyChallenge() {
        renderTool("تحدي اليوم", `<div class="sai-panel" id="sai-daily-box">جارٍ تحميل تحدي اليوم...</div>`);
        const c = client(); if (!c) return;
        const { data, error } = await c.rpc("student_get_daily_challenge");
        const q = Array.isArray(data) ? data[0] : data;
        const box = document.getElementById("sai-daily-box");
        if (error || !q) { box.textContent = "لا يوجد تحدٍ متاح اليوم."; return; }
        if (q.already_completed) {
            box.innerHTML = `<div style="text-align:center;padding:18px"><div style="font-size:46px">🔥</div><h3>أكملت تحدي اليوم</h3><p>ارجع غدًا للحفاظ على سلسلة التعلم.</p></div>`;
            return;
        }
        const options = parseOptions(q);
        box.innerHTML = `<div style="font-size:12px;color:#6e7888">🔥 تحدي اليوم • +10 XP عند الإجابة الصحيحة</div><div style="font-size:18px;font-weight:1000;line-height:1.8;margin-top:12px">${esc(q.question)}</div><div>${options.map((o,i)=>`<button class="sai-option" data-daily-answer="${i}" type="button">${esc(o)}</button>`).join("")}</div><div id="sai-daily-result" class="sai-result" hidden></div>`;
        box.querySelectorAll("[data-daily-answer]").forEach((btn) => btn.addEventListener("click", async () => {
            const idx = Number(btn.dataset.dailyAnswer);
            box.querySelectorAll("[data-daily-answer]").forEach(b => b.disabled = true);
            const { data: res } = await c.rpc("student_complete_daily_challenge", { p_question_id: q.id, p_answer_index: idx });
            const r = Array.isArray(res) ? res[0] : res;
            const result = document.getElementById("sai-daily-result"); result.hidden = false;
            result.textContent = r?.correct ? `✅ صحيح! حصلت على ${r.xp_awarded || 10} XP.` : "❌ غير صحيح. يمكنك العودة غدًا بتحدٍ جديد.";
            await loadStats();
        }));
    }

    async function renderProgress() {
        await loadStats();
        const s = state.stats || {};
        const answered = Number(s.answered || 0), correct = Number(s.correct || 0);
        const accuracy = answered ? Math.round(correct / answered * 100) : 0;
        renderTool("تقدمي", `<div class="sai-panel"><div style="text-align:center;margin-bottom:12px"><span style="font-size:12px;color:#778195">مستواك في الإنجليزية</span><div style="font-size:42px;font-weight:1000;color:#3155a4">${esc(getEnglishLevel())}</div></div><div class="sai-stats" style="margin-top:0"><div class="sai-stat" style="background:#f3f6fb"><b>${Number(s.xp || 0)}</b><span>XP</span></div><div class="sai-stat" style="background:#f3f6fb"><b>${Number(s.streak || 0)} 🔥</b><span>أيام متتالية</span></div><div class="sai-stat" style="background:#f3f6fb"><b>${accuracy}%</b><span>الدقة</span></div></div><div class="sai-result">القواعد: ${esc(state.englishProfile?.grammar_level || getEnglishLevel())}\nالمفردات: ${esc(state.englishProfile?.vocabulary_level || getEnglishLevel())}\nالاستماع: ${esc(state.englishProfile?.listening_level || getEnglishLevel())}\nالنطق: ${esc(state.englishProfile?.pronunciation_level || getEnglishLevel())}\nإجمالي الإجابات: ${answered}\nالإجابات الصحيحة: ${correct}\nأفضل استمرار: ${Number(s.best_streak || 0)} يوم\nآخر نشاط: ${esc(formatDate(s.last_activity_date))}</div><button class="sai-btn secondary" type="button" id="sai-retest" style="margin-top:10px;width:100%">إعادة اختبار المستوى</button></div>`); document.getElementById('sai-retest')?.addEventListener('click',startPlacement);
    }

    function moneyIQD(value) {
        const n = Number(value || 0);
        try { return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع"; }
        catch (_) { return String(n) + " د.ع"; }
    }

    function renderPaywall(tool) {
        const names = { chat:"اسأل Student AI", explain:"اشرح لي درسًا", generate:"ولّد لي أسئلة", smart_translate:"ترجمة ذكية" };
        renderTool(names[tool] || "Student Premium", `<div class="sai-panel sai-paywall"><div class="sai-lock">👑</div><h3>اشترك في Student Premium</h3><p>افتح جميع أدوات Student AI المتقدمة بحسابك.</p><button id="sai-open-checkout" class="sai-btn" type="button">عرض خطط الاشتراك</button></div>`);
        document.getElementById("sai-open-checkout")?.addEventListener("click", renderCheckout);
    }

    async function renderCheckout() {
        renderTool("اشتراك Student Premium", `<div class="sai-panel sai-checkout"><div class="sai-note">جارٍ تحميل خطط الاشتراك...</div></div>`);
        const c = client(); if (!c) return;
        const { data, error } = await c.rpc("student_get_premium_checkout");
        const box = pageBody()?.querySelector(".sai-checkout");
        if (!box) return;
        if (error || !data) { box.innerHTML = '<div class="sai-result">تعذر تحميل صفحة الدفع الآن. حاول لاحقًا.</div>'; return; }
        const checkout = data;
        if (checkout.pending_order) {
            box.innerHTML = `<div style="text-align:center;padding:10px"><div style="font-size:42px">⏳</div><h3>طلبك قيد المراجعة</h3><p style="color:#697386;line-height:1.8">وصل طلب اشتراكك إلى الإدارة. سيتم تفعيل Premium بعد تأكيد الدفع.</p>${checkout.whatsapp ? `<button id="sai-proof-wa" class="sai-btn sai-whatsapp" type="button">إرسال إثبات الدفع عبر واتساب</button>` : ""}</div>`;
            if (checkout.whatsapp) document.getElementById("sai-proof-wa")?.addEventListener("click", () => openPaymentWhatsApp(checkout.whatsapp, checkout.pending_order));
            return;
        }
        const plans = (checkout.plans || []).filter(p => Number(p.price_iqd || 0) > 0);
        if (!checkout.enabled || !plans.length || !checkout.account_number) {
            box.innerHTML = '<div style="text-align:center;padding:14px"><div style="font-size:40px">🛠️</div><h3>الدفع غير متاح حاليًا</h3><p style="color:#697386">سيتم فتح الاشتراكات قريبًا.</p></div>';
            return;
        }
        let selected = String(plans[0].code);
        box.innerHTML = `<h3 style="margin:0 0 5px">اختر خطة الاشتراك</h3>
            <div class="sai-plan-list">${plans.map((p,i)=>`<button class="sai-plan-option ${i===0?"active":""}" data-plan="${esc(p.code)}" type="button"><b>${esc(p.name)}</b><span>${moneyIQD(p.price_iqd)}</span></button>`).join("")}</div>
            <div class="sai-paybox">
                <div class="sai-payline"><b>طريقة الدفع</b><span>${esc(checkout.method_name || "تحويل")}</span></div>
                ${checkout.account_name ? `<div class="sai-payline"><b>اسم الحساب</b><span>${esc(checkout.account_name)}</span></div>` : ""}
                <div class="sai-payline"><b>رقم/حساب التحويل</b><span>${esc(checkout.account_number)} <button class="sai-copy" id="sai-copy-account" type="button">نسخ</button></span></div>
                ${checkout.instructions ? `<div class="sai-note" style="margin-top:10px">${esc(checkout.instructions)}</div>` : ""}
            </div>
            <button id="sai-payment-done" class="sai-btn" style="width:100%" type="button">حوّلت المبلغ — إرسال طلب التفعيل</button>
            ${checkout.whatsapp ? `<button id="sai-payment-wa" class="sai-btn sai-whatsapp" style="width:100%;margin-top:8px" type="button">التواصل عبر واتساب</button>` : ""}`;
        box.querySelectorAll("[data-plan]").forEach(btn => btn.addEventListener("click", () => {
            selected = btn.dataset.plan;
            box.querySelectorAll("[data-plan]").forEach(x => x.classList.toggle("active", x === btn));
        }));
        document.getElementById("sai-copy-account")?.addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(String(checkout.account_number || "")); toast("تم نسخ بيانات التحويل."); }
            catch (_) { toast("تعذر النسخ تلقائيًا."); }
        });
        document.getElementById("sai-payment-wa")?.addEventListener("click", () => openPaymentWhatsApp(checkout.whatsapp, { plan_code:selected }));
        document.getElementById("sai-payment-done")?.addEventListener("click", async (e) => {
            const chosen = plans.find(p => String(p.code) === String(selected));
            if (!chosen) return;
            const text = `تأكيد أنك حوّلت ${moneyIQD(chosen.price_iqd)} لخطة ${chosen.name}؟`;
            if (window.StudentAskConfirmation) {
                const ok = await window.StudentAskConfirmation("تأكيد الدفع", text, "إرسال الطلب");
                if (!ok) return;
            }
            e.currentTarget.disabled = true;
            const { error: orderError } = await c.rpc("student_request_premium_payment", { p_plan_code: String(selected) });
            if (orderError) {
                e.currentTarget.disabled = false;
                toast(orderError.message.includes("pending") ? "لديك طلب دفع قيد المراجعة بالفعل." : "تعذر إرسال طلب التفعيل.");
                return;
            }
            toast("تم إرسال طلب التفعيل.");
            await renderCheckout();
        });
    }

    function openPaymentWhatsApp(number, order) {
        const phone = String(number || "").replace(/[^0-9]/g, "");
        if (!phone) return;
        const plan = order?.plan_code ? ` لخطة ${order.plan_code} يوم` : "";
        const msg = `مرحبًا، أرسلت دفعة اشتراك Student Premium${plan}. سأرسل إثبات التحويل هنا.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    }

    function aiToolConfig(mode) {
        const map = {
            chat: { title:"اسأل Student AI", placeholder:"مثال: اشرح لي الفرق بين Present Perfect وPast Simple", action:"اسأل" },
            explain: { title:"اشرح لي درسًا", placeholder:"اكتب اسم الدرس أو الموضوع الذي تريد شرحه...", action:"اشرح" },
            generate: { title:"ولّد لي أسئلة", placeholder:"مثال: 10 أسئلة اختيار من متعدد عن Present Simple", action:"ولّد الأسئلة" },
            smart_translate: { title:"ترجمة ذكية", placeholder:"اكتب النص، وسيتم شرحه وترجمته حسب السياق...", action:"ترجم بذكاء" }
        };
        return map[mode] || map.chat;
    }

    function renderPremiumAI(mode) {
        const cfg = aiToolConfig(mode);
        renderTool(cfg.title, `<div class="sai-panel"><textarea id="sai-ai-prompt" class="sai-field" maxlength="4000" placeholder="${esc(cfg.placeholder)}"></textarea><button id="sai-ai-send" class="sai-btn" style="margin-top:10px" type="button">${esc(cfg.action)}</button><div id="sai-ai-result" class="sai-result" hidden></div><div class="sai-note">Premium • قد تُطبق حدود استخدام عادلة للحفاظ على جودة الخدمة.</div></div>`);
        document.getElementById("sai-ai-send")?.addEventListener("click", async (e) => {
            const prompt = document.getElementById("sai-ai-prompt")?.value.trim();
            if (!prompt) return toast("اكتب سؤالك أولاً.");
            const c = client(); if (!c) return;
            e.currentTarget.disabled = true; const old = e.currentTarget.textContent; e.currentTarget.textContent = "جارٍ التفكير...";
            const result = document.getElementById("sai-ai-result"); result.hidden = false; result.textContent = "جارٍ تجهيز الإجابة...";
            try {
                const { data, error } = await c.functions.invoke("student-ai", { body: { mode, prompt } });
                if (error) throw error;
                if (data?.code === "PREMIUM_REQUIRED") { await loadSubscription(); renderPaywall(mode); return; }
                if (data?.code === "DAILY_LIMIT") throw new Error("وصلت إلى الحد اليومي لطلبات AI. حاول غدًا.");
                if (!data?.answer) throw new Error(data?.error || "الخدمة غير متاحة الآن.");
                result.textContent = data.answer;
            } catch (err) { result.textContent = err?.message || "تعذر الاتصال بخدمة Student AI الآن."; }
            finally { if (e.currentTarget?.isConnected) { e.currentTarget.disabled = false; e.currentTarget.textContent = old; } }
        });
    }

    function renderAdminSubscriptions() {
        renderTool("إدارة Premium", `<div class="sai-panel"><input id="sai-admin-search" class="sai-field" placeholder="ابحث بالاسم أو البريد أو اسم المستخدم..."><div class="sai-row" style="margin-top:10px;flex-wrap:wrap"><button id="sai-admin-payments" class="sai-btn secondary" type="button">طلبات الدفع</button><button id="sai-admin-setup" class="sai-btn secondary" type="button">إعداد الدفع</button></div><div id="sai-admin-results" class="sai-admin-list"><div class="sai-note">ابحث عن مستخدم، أو افتح طلبات الدفع.</div></div></div>`);
        const input = document.getElementById("sai-admin-search");
        input?.addEventListener("input", () => { clearTimeout(state.adminSearchTimer); state.adminSearchTimer = setTimeout(() => adminSearch(input.value.trim()), 350); });
        document.getElementById("sai-admin-payments")?.addEventListener("click", adminPaymentOrders);
        document.getElementById("sai-admin-setup")?.addEventListener("click", renderAdminPaymentSetup);
    }

    async function adminSearch(query) {
        const box = document.getElementById("sai-admin-results"); if (!box) return;
        if (query.length < 2) { box.innerHTML = '<div class="sai-note">اكتب حرفين على الأقل.</div>'; return; }
        box.innerHTML = '<div class="sai-note">جارٍ البحث...</div>';
        const { data, error } = await client().rpc("student_admin_search_subscription_users", { p_query: query, p_limit: 20 });
        if (error) { box.textContent = "تعذر البحث."; return; }
        renderAdminUsers(data || []);
    }

    function renderAdminUsers(users) {
        const box = document.getElementById("sai-admin-results"); if (!box) return;
        if (!users.length) { box.innerHTML = '<div class="sai-note">لا توجد نتائج.</div>'; return; }
        box.innerHTML = users.map((u) => `<div class="sai-user" data-user-id="${esc(u.id)}"><strong>${esc(u.full_name || "بدون اسم")}</strong><small>${esc(u.email || "")} • @${esc(u.username || "")}</small><br><span class="sai-pill ${u.subscription_active ? "on" : ""}">${u.subscription_active ? `Premium إلى ${esc(formatDate(u.expires_at))}` : "Free"}</span><div class="sai-row" style="margin-top:9px;flex-wrap:wrap"><button class="sai-btn success" data-days="30" type="button">30 يوم</button><button class="sai-btn success" data-days="90" type="button">90 يوم</button><button class="sai-btn success" data-days="365" type="button">سنة</button><button class="sai-btn danger" data-cancel type="button">إلغاء</button></div></div>`).join("");
        box.querySelectorAll("[data-user-id]").forEach((row) => {
            row.querySelectorAll("[data-days]").forEach((b) => b.addEventListener("click", () => adminSetSubscription(row.dataset.userId, Number(b.dataset.days))));
            row.querySelector("[data-cancel]")?.addEventListener("click", () => adminSetSubscription(row.dataset.userId, 0));
        });
    }

    async function adminPaymentOrders() {
        const box = document.getElementById("sai-admin-results"); if (!box) return;
        box.innerHTML = '<div class="sai-note">جارٍ تحميل طلبات الدفع...</div>';
        const { data, error } = await client().rpc("student_admin_payment_orders", { p_limit: 50 });
        if (error) { box.textContent = "تعذر تحميل طلبات الدفع."; return; }
        if (!(data || []).length) { box.innerHTML = '<div class="sai-note">لا توجد طلبات دفع معلقة.</div>'; return; }
        box.innerHTML = data.map(o => `<div class="sai-user" data-order-id="${esc(o.order_id)}"><strong>${esc(o.full_name || "بدون اسم")}</strong><small>${esc(o.email || "")} • ${esc(o.payment_method || "")}</small><div class="sai-payline"><b>${esc(o.duration_days)} يوم</b><span>${moneyIQD(o.amount_iqd)}</span></div><div class="sai-row" style="margin-top:9px"><button class="sai-btn success" data-approve type="button">تأكيد وتفعيل</button><button class="sai-btn danger" data-reject type="button">رفض</button></div></div>`).join("");
        box.querySelectorAll("[data-order-id]").forEach(row => {
            row.querySelector("[data-approve]")?.addEventListener("click", () => adminReviewPayment(row.dataset.orderId, true));
            row.querySelector("[data-reject]")?.addEventListener("click", () => adminReviewPayment(row.dataset.orderId, false));
        });
    }

    async function adminReviewPayment(orderId, approve) {
        if (window.StudentAskConfirmation) {
            const ok = await window.StudentAskConfirmation("طلب الدفع", approve ? "تأكيد استلام المبلغ وتفعيل Premium؟" : "رفض طلب الدفع؟", approve ? "تفعيل" : "رفض");
            if (!ok) return;
        }
        const { error } = await client().rpc("student_admin_review_payment_order", { p_order: orderId, p_approve: !!approve });
        if (error) return toast("تعذر تحديث الطلب.");
        toast(approve ? "تم تفعيل Premium للمستخدم." : "تم رفض الطلب.");
        adminPaymentOrders();
    }

    async function renderAdminPaymentSetup() {
        const box = document.getElementById("sai-admin-results"); if (!box) return;
        box.innerHTML = '<div class="sai-note">جارٍ تحميل إعدادات الدفع...</div>';
        const { data, error } = await client().rpc("student_admin_get_payment_setup");
        if (error) { box.textContent = "تعذر تحميل إعدادات الدفع."; return; }
        const d = data || {};
        box.innerHTML = `<div class="sai-user">
            <strong>أسعار Premium بالدينار العراقي</strong>
            <div class="sai-admin-grid" style="margin-top:9px"><input id="sai-p30" class="sai-field" type="number" min="0" placeholder="30 يوم" value="${Number(d.monthly_price_iqd||0)}"><input id="sai-p90" class="sai-field" type="number" min="0" placeholder="90 يوم" value="${Number(d.quarterly_price_iqd||0)}"><input id="sai-p365" class="sai-field" type="number" min="0" placeholder="سنة" value="${Number(d.yearly_price_iqd||0)}"></div>
            <input id="sai-pay-method" class="sai-field" style="margin-top:9px" placeholder="طريقة الدفع: زين كاش / آسيا حوالة..." value="${esc(d.payment_method_name||"")}">
            <input id="sai-pay-name" class="sai-field" style="margin-top:9px" placeholder="اسم صاحب الحساب" value="${esc(d.account_name||"")}">
            <input id="sai-pay-account" class="sai-field" style="margin-top:9px" placeholder="رقم الهاتف / رقم الحساب" value="${esc(d.account_number||"")}">
            <input id="sai-pay-wa" class="sai-field" style="margin-top:9px" inputmode="tel" placeholder="رقم واتساب مع رمز الدولة 964..." value="${esc(d.whatsapp||"")}">
            <textarea id="sai-pay-info" class="sai-field" style="margin-top:9px" placeholder="تعليمات قصيرة للمستخدم">${esc(d.instructions||"")}</textarea>
            <label class="sai-row" style="margin-top:10px"><input id="sai-pay-enabled" type="checkbox" ${d.is_enabled?"checked":""}> <b>تفعيل صفحة الدفع للمستخدمين</b></label>
            <button id="sai-save-payment" class="sai-btn" style="margin-top:10px" type="button">حفظ إعدادات الدفع</button>
        </div>`;
        document.getElementById("sai-save-payment")?.addEventListener("click", async (e) => {
            e.currentTarget.disabled = true;
            const args = {
                p_monthly: Number(document.getElementById("sai-p30")?.value || 0),
                p_quarterly: Number(document.getElementById("sai-p90")?.value || 0),
                p_yearly: Number(document.getElementById("sai-p365")?.value || 0),
                p_method: document.getElementById("sai-pay-method")?.value || "",
                p_account_name: document.getElementById("sai-pay-name")?.value || "",
                p_account_number: document.getElementById("sai-pay-account")?.value || "",
                p_instructions: document.getElementById("sai-pay-info")?.value || "",
                p_whatsapp: document.getElementById("sai-pay-wa")?.value || "",
                p_enabled: !!document.getElementById("sai-pay-enabled")?.checked
            };
            const { error: saveError } = await client().rpc("student_admin_save_payment_setup", args);
            e.currentTarget.disabled = false;
            if (saveError) return toast("تعذر حفظ إعدادات الدفع.");
            toast("تم حفظ إعدادات الدفع.");
        });
    }

    function bank(){return window.StudentAIBank || {bilingual:[],irregular:[],sentences:[],placement:[]};}
    function getEnglishLevel(){return state.englishProfile?.overall_level || localStorage.getItem('student_english_level') || 'A1';}
    async function loadEnglishProfile(){
        const c=client(); if(!c)return; try{const {data,error}=await c.rpc('student_get_my_english_profile'); if(!error&&data){state.englishProfile=Array.isArray(data)?data[0]:data; if(state.englishProfile?.overall_level)localStorage.setItem('student_english_level',state.englishProfile.overall_level);}}catch(_){ }
    }
    async function savePlacement(profileData){
        state.englishProfile={...(state.englishProfile||{}),...profileData}; localStorage.setItem('student_english_level',profileData.overall_level||'A1');
        const c=client(); if(c){try{await c.rpc('student_save_placement_result',{p_overall:profileData.overall_level,p_grammar:profileData.grammar_level,p_vocabulary:profileData.vocabulary_level,p_score:Number(profileData.placement_score||0)}); if(profileData.listening_level) await c.rpc('student_update_english_skill',{p_skill:'listening',p_level:profileData.listening_level});}catch(_){}}
    }
    function levelIndex(l){return ['A1','A2','B1','B2','C1','C2'].indexOf(String(l||'A1').toUpperCase());}
    function suitable(items,key='level'){const li=Math.max(0,levelIndex(getEnglishLevel()));const f=items.filter(x=>levelIndex(x[key])<=li);return f.length?f:items;}
    function pick(arr,seed){if(!arr?.length)return null;const n=seed==null?Math.floor(Math.random()*arr.length):Math.abs(seed)%arr.length;return arr[n];}
    function daySeed(){const d=new Date();return Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);}
    function recordFreeAttempt(ok,kind){const c=client();if(c)c.rpc('student_record_learning_answer',{p_correct:!!ok,p_kind:String(kind||'practice'),p_question_id:null}).then(()=>{});}

    function renderWordOfDay(){
        const words=suitable(bank().bilingual); const w=pick(words,daySeed()); if(!w)return renderTool('كلمة اليوم','<div class="sai-panel">البنك غير متاح.</div>');
        renderTool('كلمة اليوم',`<div class="sai-panel" style="text-align:center"><div style="font-size:12px;color:#778195">${esc(w.level)} • ${esc(w.pos)}</div><div style="font-size:34px;font-weight:1000;margin:8px">${esc(w.word)}</div><div style="font-size:20px;font-weight:900">${esc(w.ar)}</div><div class="sai-row" style="justify-content:center;margin-top:14px"><button class="sai-btn" id="sai-wod-us">🇺🇸 استمع</button><button class="sai-btn secondary" id="sai-wod-uk">🇬🇧 استمع</button></div><div class="sai-note">تتغير الكلمة تلقائيًا كل يوم حسب مستواك.</div></div>`);
        document.getElementById('sai-wod-us')?.addEventListener('click',()=>speak(w.word,'en-US',.9));document.getElementById('sai-wod-uk')?.addEventListener('click',()=>speak(w.word,'en-GB',.9));
    }

    function renderFlashcards(){
        const words=suitable(bank().bilingual); let current=null,shown=false;
        renderTool('بطاقات المفردات','<div class="sai-panel" id="sai-flash"></div>'); const box=document.getElementById('sai-flash');
        const next=()=>{current=pick(words);shown=false;box.innerHTML=`<div style="text-align:center;padding:16px"><div style="font-size:12px;color:#778195">${esc(current.level)} • ${esc(current.pos)}</div><div style="font-size:30px;font-weight:1000;margin:12px">${esc(current.word)}</div><button id="sai-flip" class="sai-btn secondary">إظهار المعنى</button><div id="sai-flash-meaning" style="font-size:21px;font-weight:900;margin:14px" hidden>${esc(current.ar)}</div><div class="sai-row" style="justify-content:center"><button id="sai-know" class="sai-btn success">أعرفها ✓</button><button id="sai-again" class="sai-btn secondary">أراجعها</button><button id="sai-card-speak" class="sai-btn secondary">🔊</button></div></div>`;
            box.querySelector('#sai-flip')?.addEventListener('click',()=>{shown=true;box.querySelector('#sai-flash-meaning').hidden=false;}); box.querySelector('#sai-card-speak')?.addEventListener('click',()=>speak(current.word,'en-US',.9));
            box.querySelector('#sai-know')?.addEventListener('click',()=>{recordFreeAttempt(true,'flashcard');next();});box.querySelector('#sai-again')?.addEventListener('click',()=>{recordFreeAttempt(false,'flashcard');box.querySelector('#sai-flash-meaning').hidden=false;setTimeout(next,900);});
        }; next();
    }

    function renderWordBank(){
        const all=Array.isArray(window.StudentAICEFREntries)?window.StudentAICEFREntries:[];let level=getEnglishLevel();
        renderTool('بنك 5000 كلمة',`<div class="sai-panel"><div class="sai-row"><input id="sai-bank-search" class="sai-field" placeholder="ابحث عن كلمة..."><select id="sai-bank-level" class="sai-field" style="max-width:100px">${['A1','A2','B1','B2','C1','C2'].map(l=>`<option ${l===level?'selected':''}>${l}</option>`).join('')}</select></div><div id="sai-bank-list" style="margin-top:10px"></div></div>`);
        const box=document.getElementById('sai-bank-list'),input=document.getElementById('sai-bank-search'),sel=document.getElementById('sai-bank-level');
        const draw=()=>{const q=String(input.value||'').trim().toLowerCase();level=sel.value;let rows=all.filter(x=>x.l===level&&(!q||x.w.toLowerCase().includes(q))).slice(0,40);if(!rows.length){box.innerHTML='<div class="sai-note">لا توجد نتائج.</div>';return;}box.innerHTML=rows.map((x,i)=>`<div class="sai-user"><strong>${esc(x.w)} <span class="sai-pill">${esc(x.l)}</span></strong><small>${esc(x.p||'word')}</small><div class="sai-row" style="margin-top:7px"><button class="sai-btn secondary" data-bank-us="${i}">🇺🇸</button><button class="sai-btn secondary" data-bank-uk="${i}">🇬🇧</button><button class="sai-btn secondary" data-bank-tr="${i}">ترجمة</button></div><div class="sai-note" data-bank-result="${i}" hidden></div></div>`).join('');box.querySelectorAll('[data-bank-us]').forEach(b=>b.onclick=()=>speak(rows[Number(b.dataset.bankUs)].w,'en-US',.9));box.querySelectorAll('[data-bank-uk]').forEach(b=>b.onclick=()=>speak(rows[Number(b.dataset.bankUk)].w,'en-GB',.9));box.querySelectorAll('[data-bank-tr]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.bankTr),r=box.querySelector(`[data-bank-result="${i}"]`),w=rows[i].w;const known=bank().bilingual.find(z=>z.word.toLowerCase()===w.toLowerCase());if(known){r.hidden=false;r.textContent=known.ar;return;}b.disabled=true;try{const res=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|ar`);const j=await res.json();r.hidden=false;r.textContent=String(j?.responseData?.translatedText||'تعذر جلب الترجمة.');}catch(_){r.hidden=false;r.textContent='تعذر جلب الترجمة الآن.';}finally{b.disabled=false;}});};
        input.addEventListener('input',draw);sel.addEventListener('change',draw);draw();
    }

    function renderListenWrite(){
        const items=suitable(bank().sentences); const q=pick(items); let accent='en-US';
        renderTool('استمع واكتب',`<div class="sai-panel"><div class="sai-note">استمع للجملة ثم اكتب ما سمعته.</div><div class="sai-row" style="margin-top:10px"><button id="sai-lw-us" class="sai-btn">🇺🇸 استمع</button><button id="sai-lw-uk" class="sai-btn secondary">🇬🇧 استمع</button><button id="sai-lw-slow" class="sai-btn secondary">🐢 بطيء</button></div><textarea id="sai-lw-input" class="sai-field" style="margin-top:10px" placeholder="اكتب الجملة هنا..."></textarea><button id="sai-lw-check" class="sai-btn success" style="margin-top:9px">تحقق</button><div id="sai-lw-result" class="sai-result" hidden></div></div>`);
        document.getElementById('sai-lw-us')?.addEventListener('click',()=>{accent='en-US';speak(q.text,accent,.9)});document.getElementById('sai-lw-uk')?.addEventListener('click',()=>{accent='en-GB';speak(q.text,accent,.9)});document.getElementById('sai-lw-slow')?.addEventListener('click',()=>speak(q.text,accent,.65));
        document.getElementById('sai-lw-check')?.addEventListener('click',()=>{const typed=document.getElementById('sai-lw-input').value;const score=wordSimilarity(q.text,typed);const out=document.getElementById('sai-lw-result');out.hidden=false;out.textContent=`التطابق: ${score}%\nالجملة الصحيحة: ${q.text}`;recordFreeAttempt(score>=80,'listening');});
    }

    function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
    function renderSentenceOrder(){
        const q=pick(suitable(bank().sentences));const original=q.text.replace(/[.!?]$/,'');const words=original.split(/\s+/);let chosen=[];
        renderTool('رتّب الجملة','<div class="sai-panel" id="sai-order"></div>');const box=document.getElementById('sai-order');
        const draw=()=>{const remaining=shuffle(words.map((w,i)=>({w,i})).filter(o=>!chosen.includes(o.i)));box.innerHTML=`<div class="sai-note">اضغط الكلمات بالترتيب الصحيح.</div><div class="sai-result" id="sai-built">${chosen.map(i=>esc(words[i])).join(' ')||'…'}</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">${remaining.map(o=>`<button class="sai-btn secondary" data-ow="${o.i}">${esc(o.w)}</button>`).join('')}</div><div class="sai-row" style="margin-top:10px"><button id="sai-order-check" class="sai-btn success">تحقق</button><button id="sai-order-reset" class="sai-btn secondary">إعادة</button></div><div id="sai-order-result" class="sai-result" hidden></div>`;box.querySelectorAll('[data-ow]').forEach(b=>b.onclick=()=>{chosen.push(Number(b.dataset.ow));draw();});box.querySelector('#sai-order-reset').onclick=()=>{chosen=[];draw();};box.querySelector('#sai-order-check').onclick=()=>{const built=chosen.map(i=>words[i]).join(' ');const ok=normalizeSpeech(built)===normalizeSpeech(original);const r=box.querySelector('#sai-order-result');r.hidden=false;r.textContent=ok?'✅ ممتاز! الجملة صحيحة.':`❌ حاول مرة أخرى.\nالصحيح: ${q.text}`;recordFreeAttempt(ok,'sentence_order');};};draw();
    }

    function renderIrregular(){
        const v=pick(bank().irregular);const askPast=Math.random()<.5;
        renderTool('الأفعال الشاذة',`<div class="sai-panel"><div style="text-align:center;font-size:28px;font-weight:1000">${esc(v.base)}</div><div class="sai-note" style="text-align:center">اكتب ${askPast?'الماضي':'التصريف الثالث'} للفعل.</div><input id="sai-ir-input" class="sai-field" style="margin-top:10px" autocomplete="off"><button id="sai-ir-check" class="sai-btn success" style="margin-top:9px">تحقق</button><div id="sai-ir-result" class="sai-result" hidden></div></div>`);
        document.getElementById('sai-ir-check')?.addEventListener('click',()=>{const expected=askPast?v.past:v.participle;const got=document.getElementById('sai-ir-input').value.trim().toLowerCase();const ok=expected.toLowerCase().split('/').includes(got);const r=document.getElementById('sai-ir-result');r.hidden=false;r.textContent=ok?`✅ صحيح: ${expected}`:`❌ الصحيح: ${expected}`;recordFreeAttempt(ok,'irregular');});
    }

    async function startPlacement(){
        const questions=bank().placement||[]; if(!questions.length)return; let level=1,asked=0,correct=0,wrongAt=0,correctAt=0;const skill={grammar:{a:0,c:0},vocabulary:{a:0,c:0},listening:{a:0,c:0}};const used=new Set();
        renderTool('تحديد مستوى الإنجليزية','<div class="sai-panel" id="sai-place"></div>');const box=document.getElementById('sai-place');
        const levels=['A1','A2','B1','B2','C1'];
        const next=()=>{if(asked>=15)return finish();let candidates=questions.map((q,i)=>({...q,_i:i})).filter(q=>q.l===levels[level]&&!used.has(q._i));if(!candidates.length){level=Math.min(4,level+1);candidates=questions.map((q,i)=>({...q,_i:i})).filter(q=>q.l===levels[level]&&!used.has(q._i));}const q=pick(candidates);if(!q)return finish();used.add(q._i);box.innerHTML=`<div style="font-size:12px;color:#778195">السؤال ${asked+1} • المستوى الحالي ${levels[level]}</div><div class="sai-progress"><span style="width:${Math.min(100,asked/15*100)}%"></span></div><div style="font-size:18px;font-weight:1000;line-height:1.8">${esc(q.q)}</div>${q.audio?'<button id="sai-place-listen" class="sai-btn secondary" style="margin:8px 0">🔊 استمع</button>':''}${q.o.map((o,i)=>`<button class="sai-option" data-pa="${i}">${esc(o)}</button>`).join('')}`;if(q.audio)box.querySelector('#sai-place-listen').onclick=()=>speak(q.audio,'en-US',.88);box.querySelectorAll('[data-pa]').forEach(b=>b.onclick=()=>{const ok=Number(b.dataset.pa)===q.a;asked++;skill[q.s].a++;if(ok){correct++;correctAt++;skill[q.s].c++;wrongAt=0;if(correctAt>=2&&level<4){level++;correctAt=0;}}else{wrongAt++;correctAt=0;if(wrongAt>=2&&level>0){level--;wrongAt=0;}}next();});};
        const finish=async()=>{const pct=Math.round(correct/Math.max(1,asked)*100);let overall=levels[Math.max(0,Math.min(4,level))];if(pct<45&&level>0)overall=levels[level-1];const calc=(s)=>{const x=skill[s];if(!x.a)return overall;const ratio=x.c/x.a;let i=levelIndex(overall)+(ratio>=.8?1:ratio<.45?-1:0);return ['A1','A2','B1','B2','C1'][Math.max(0,Math.min(4,i))];};const pr={overall_level:overall,grammar_level:calc('grammar'),vocabulary_level:calc('vocabulary'),listening_level:calc('listening'),placement_score:pct};await savePlacement(pr);box.innerHTML=`<div style="text-align:center"><div style="font-size:13px;color:#778195">مستواك الحالي</div><div style="font-size:48px;font-weight:1000;color:#3155a4">${overall}</div><div class="sai-result">القواعد: ${pr.grammar_level}\nالمفردات: ${pr.vocabulary_level}\nالاستماع: ${pr.listening_level}\nنتيجة الاختبار: ${pct}%</div><button id="sai-place-home" class="sai-btn" style="margin-top:10px">ابدأ التدريب المناسب</button></div>`;box.querySelector('#sai-place-home').onclick=renderHome;};next();
    }

    function localTutorFallback(prompt){
        const p=String(prompt||'').toLowerCase();const w=bank().bilingual.find(x=>p.includes(x.word.toLowerCase()));if(w)return `الكلمة: ${w.word}\nالمعنى: ${w.ar}\nالمستوى: ${w.level}\nالنوع: ${w.pos}\n\nجرّب استخدامها في جملة قصيرة، ثم استمع لنطقها من أداة النطق.`;
        if(/present perfect|المضارع التام/.test(p))return 'المضارع التام Present Perfect يتكوّن من have/has + past participle. نستخدمه لتجربة أو حدث له صلة بالحاضر. مثال: I have finished my homework.';
        if(/past simple|الماضي البسيط/.test(p))return 'الماضي البسيط Past Simple يصف حدثًا انتهى في وقت ماضٍ محدد. مثال: I visited Baghdad yesterday. مع الأفعال المنتظمة نضيف -ed، وهناك أفعال شاذة مثل go → went.';
        if(/present simple|المضارع البسيط/.test(p))return 'المضارع البسيط Present Simple يستخدم للعادات والحقائق. مثال: I study English every day. مع he/she/it غالبًا نضيف s للفعل: She studies English.';
        return 'أستطيع مساعدتك في الإنجليزية: معنى كلمة، قاعدة، مثال، تصحيح جملة أو تدريب. اكتب سؤالك بشكل محدد مثل: «اشرح Present Perfect» أو «ما معنى achievement؟».\n\nإذا كان جهازك يدعم المحرك المحلي الكامل سيظهر لك جواب أوسع تلقائيًا.';
    }
    function renderLocalAI(){
        renderTool('اسأل Student AI مجانًا',`<div class="sai-panel"><textarea id="sai-local-prompt" class="sai-field" maxlength="1800" placeholder="اسأل عن قاعدة، كلمة، جملة أو موضوع دراسي..."></textarea><button id="sai-local-send" class="sai-btn" style="margin-top:10px">اسأل</button><div id="sai-local-status" class="sai-note">المساعد يعمل مجانًا. أول تشغيل قد يستغرق وقتًا أطول، وبعدها يصبح أسرع.</div><div id="sai-local-result" class="sai-result" hidden></div></div>`);
        document.getElementById('sai-local-send')?.addEventListener('click',()=>runLocalAI());
    }
    function runLocalAI(){
        const prompt=document.getElementById('sai-local-prompt')?.value.trim();if(!prompt)return toast('اكتب سؤالك أولاً.');const out=document.getElementById('sai-local-result'),status=document.getElementById('sai-local-status'),btn=document.getElementById('sai-local-send');out.hidden=false;out.textContent='جارٍ تجهيز الإجابة…';btn.disabled=true;
        try{if(!state.localAIWorker)state.localAIWorker=new Worker('student-ai-local-worker.js?v=2.0.0',{type:'module'});const w=state.localAIWorker;let timer=setTimeout(()=>{out.textContent=localTutorFallback(prompt);btn.disabled=false;},45000);w.onmessage=(e)=>{const d=e.data||{};if(d.type==='progress')status.textContent=`جارٍ تجهيز المساعد لأول مرة… ${d.value||0}%`;if(d.type==='ready')status.textContent='المساعد جاهز على جهازك.';if(d.type==='answer'){clearTimeout(timer);out.textContent=d.answer||localTutorFallback(prompt);btn.disabled=false;recordFreeAttempt(true,'local_ai');}if(d.type==='error'){clearTimeout(timer);out.textContent=localTutorFallback(prompt);status.textContent='المساعد جاهز.';btn.disabled=false;}};w.postMessage({type:'generate',prompt});}catch(_){out.textContent=localTutorFallback(prompt);status.textContent='المساعد جاهز.';btn.disabled=false;}
    }

    async function adminSetSubscription(userId, days) {
        if (!userId) return;
        const text = days > 0 ? `تفعيل Premium لمدة ${days} يوم؟` : "إلغاء اشتراك Premium لهذا المستخدم؟";
        if (window.StudentAskConfirmation) {
            const ok = await window.StudentAskConfirmation("إدارة Premium", text, days > 0 ? "تفعيل" : "إلغاء");
            if (!ok) return;
        }
        const { error } = await client().rpc("student_admin_set_subscription", { p_user: userId, p_days: days, p_plan: "premium" });
        if (error) return toast("تعذر تحديث الاشتراك: " + error.message);
        toast(days > 0 ? "تم تفعيل Premium وإشعار المستخدم." : "تم إلغاء الاشتراك.");
        const q = document.getElementById("sai-admin-search")?.value.trim();
        if (q) adminSearch(q); else adminPendingRequests();
    }

    window.StudentAI = Object.freeze({ version: "2.0.0", open, close: () => window.StudentNavigation?.closeById?.(PAGE_ID) });
    window.openStudentAI = open;
})();
