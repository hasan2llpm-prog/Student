/* =========================================================
   Student AI — Smart Learning + Freemium
   Free: pronunciation, basic translation, quizzes, daily challenge, progress
   Premium: AI chat, lesson explanation, AI question generation, advanced translation
========================================================= */
(function () {
    "use strict";

    if (window.StudentAI?.version === "1.0.0") return;

    const PAGE_ID = "student-ai-page";
    const state = {
        subscription: null,
        stats: null,
        quiz: [],
        quizIndex: 0,
        score: 0,
        answered: false,
        currentTool: "home",
        adminSearchTimer: null
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
            .sai-paywall{text-align:center;padding:28px 16px}.sai-lock{font-size:46px}.sai-paywall h3{font-size:20px;margin:12px 0 7px}.sai-paywall p{color:#697386;line-height:1.8;font-size:13px}.sai-price-info{background:#f7f9fc;border-radius:14px;padding:12px;margin:12px 0;font-size:12px;color:#4d596c}
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
        await Promise.allSettled([loadSubscription(), loadStats()]);
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
                ${toolCard("translate", "fa-solid fa-language", "الترجمة", "عربي ⇄ إنجليزي مع إمكانية سماع النطق.")}
                ${toolCard("pronounce", "fa-solid fa-volume-high", "النطق", "اكتب كلمة أو جملة واستمع إلى نطق الجهاز.")}
                ${toolCard("quiz", "fa-solid fa-list-check", "اختبرني", "أسئلة قصيرة وتصحيح فوري مع XP.")}
                ${toolCard("daily", "fa-solid fa-fire", "تحدي اليوم", "سؤال يومي للحفاظ على سلسلة التعلم.")}
                ${toolCard("progress", "fa-solid fa-chart-line", "تقدمي", "شاهد نقاطك ودقة إجاباتك واستمرارك.")}
            </div>
            <div class="sai-section-title">Student AI Premium</div>
            <div class="sai-grid">
                ${toolCard("chat", "fa-solid fa-comments", "اسأل Student AI", "اسأل عن أي موضوع دراسي واحصل على شرح منظم.", true)}
                ${toolCard("explain", "fa-solid fa-person-chalkboard", "اشرح لي درسًا", "تبسيط الدرس حسب مستواك مع أمثلة.", true)}
                ${toolCard("generate", "fa-solid fa-wand-magic-sparkles", "ولّد لي أسئلة", "أنشئ تدريبًا جديدًا من أي موضوع.", true)}
                ${toolCard("smart_translate", "fa-solid fa-earth-americas", "ترجمة ذكية", "ترجمة سياقية مع شرح الكلمات والأسلوب.", true)}
            </div>
            ${isAdmin() ? `<div class="sai-section-title">الإدارة</div><div class="sai-grid">${toolCard("admin_subscriptions", "fa-solid fa-user-shield", "إدارة Premium", "بحث المستخدمين وتفعيل أو إلغاء الاشتراك.")}</div>` : ""}
        </div>`;
        body.querySelectorAll("[data-sai-tool]").forEach((btn) => btn.addEventListener("click", () => openTool(btn.dataset.saiTool)));
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
        if (id === "translate") return renderTranslate();
        if (id === "pronounce") return renderPronounce();
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
            <div class="sai-note">الترجمة الأساسية تستخدم خدمة ترجمة عامة مجانية وقد تطبق الخدمة حدًا يوميًا خارجيًا. لا ترسل نصوصًا شخصية أو سرية.</div>
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

    function speak(text, lang) {
        if (!("speechSynthesis" in window)) return toast("النطق غير مدعوم على هذا الجهاز.");
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(String(text || ""));
        utter.lang = lang || "en-US";
        utter.rate = 0.88;
        window.speechSynthesis.speak(utter);
    }

    function renderPronounce() {
        renderTool("النطق", `<div class="sai-panel">
            <textarea id="sai-pronounce-text" class="sai-field" maxlength="500" placeholder="مثال: Education is the key to success."></textarea>
            <div class="sai-row" style="margin-top:10px"><select id="sai-pronounce-lang" class="sai-field"><option value="en-US">English — US</option><option value="en-GB">English — UK</option><option value="ar-IQ">العربية — العراق</option></select><button id="sai-pronounce-go" class="sai-btn" type="button">🔊 استمع</button></div>
            <div class="sai-note">يستخدم محرك النطق الموجود في الهاتف/المتصفح؛ لذلك لا يستهلك API مدفوعًا.</div>
        </div>`);
        document.getElementById("sai-pronounce-go")?.addEventListener("click", () => {
            const text = document.getElementById("sai-pronounce-text")?.value.trim();
            if (!text) return toast("اكتب كلمة أو جملة أولاً.");
            speak(text, document.getElementById("sai-pronounce-lang")?.value || "en-US");
        });
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
        renderTool("تقدمي", `<div class="sai-panel"><div class="sai-stats" style="margin-top:0"><div class="sai-stat" style="background:#f3f6fb"><b>${Number(s.xp || 0)}</b><span>XP</span></div><div class="sai-stat" style="background:#f3f6fb"><b>${Number(s.streak || 0)} 🔥</b><span>أيام متتالية</span></div><div class="sai-stat" style="background:#f3f6fb"><b>${accuracy}%</b><span>الدقة</span></div></div><div class="sai-result">إجمالي الإجابات: ${answered}\nالإجابات الصحيحة: ${correct}\nأفضل استمرار: ${Number(s.best_streak || 0)} يوم\nآخر نشاط: ${esc(formatDate(s.last_activity_date))}</div></div>`);
    }

    function renderPaywall(tool) {
        const names = { chat:"اسأل Student AI", explain:"اشرح لي درسًا", generate:"ولّد لي أسئلة", smart_translate:"ترجمة ذكية" };
        renderTool(names[tool] || "Student Premium", `<div class="sai-panel sai-paywall"><div class="sai-lock">🔒</div><h3>هذه الميزة ضمن Student Premium</h3><p>الأدوات المجانية ستبقى مفتوحة. ميزات الذكاء الاصطناعي تحتاج اشتراكًا لأنها تستخدم API مدفوعًا.</p><div class="sai-price-info">يتم تفعيل الاشتراك من إدارة Student. يمكنك إرسال طلب اشتراك، وبعد الموافقة ستفتح ميزات Premium تلقائيًا.</div><button id="sai-request-sub" class="sai-btn" type="button">طلب اشتراك Premium</button></div>`);
        document.getElementById("sai-request-sub")?.addEventListener("click", requestSubscription);
    }

    async function requestSubscription() {
        const c = client(); if (!c) return;
        const btn = document.getElementById("sai-request-sub"); if (btn) btn.disabled = true;
        const { error } = await c.rpc("student_request_premium_subscription", { p_plan: "premium" });
        if (error) toast(error.message.includes("already") ? "لديك طلب اشتراك قيد المراجعة بالفعل." : "تعذر إرسال الطلب.");
        else { toast("تم إرسال طلب الاشتراك إلى الإدارة."); if (btn) btn.textContent = "تم إرسال الطلب ✓"; }
        if (btn) btn.disabled = false;
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
        renderTool(cfg.title, `<div class="sai-panel"><textarea id="sai-ai-prompt" class="sai-field" maxlength="4000" placeholder="${esc(cfg.placeholder)}"></textarea><button id="sai-ai-send" class="sai-btn" style="margin-top:10px" type="button">${esc(cfg.action)}</button><div id="sai-ai-result" class="sai-result" hidden></div><div class="sai-note">Premium • يتم تطبيق حد استخدام يومي لحماية تكلفة الخدمة وجودتها.</div></div>`);
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
        renderTool("إدارة Premium", `<div class="sai-panel"><input id="sai-admin-search" class="sai-field" placeholder="ابحث بالاسم أو البريد أو اسم المستخدم..."><div class="sai-row" style="margin-top:10px"><button id="sai-admin-pending" class="sai-btn secondary" type="button">طلبات الاشتراك</button></div><div id="sai-admin-results" class="sai-admin-list"><div class="sai-note">ابدأ بالبحث عن مستخدم أو افتح الطلبات.</div></div></div>`);
        const input = document.getElementById("sai-admin-search");
        input?.addEventListener("input", () => { clearTimeout(state.adminSearchTimer); state.adminSearchTimer = setTimeout(() => adminSearch(input.value.trim()), 350); });
        document.getElementById("sai-admin-pending")?.addEventListener("click", adminPendingRequests);
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

    async function adminPendingRequests() {
        const box = document.getElementById("sai-admin-results"); box.innerHTML = '<div class="sai-note">جارٍ تحميل الطلبات...</div>';
        const { data, error } = await client().rpc("student_admin_subscription_requests", { p_limit: 30 });
        if (error) { box.textContent = "تعذر تحميل الطلبات."; return; }
        renderAdminUsers((data || []).map(r => ({ ...r, id: r.user_id })));
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

    window.StudentAI = Object.freeze({ version: "1.0.0", open, close: () => window.StudentNavigation?.closeById?.(PAGE_ID) });
    window.openStudentAI = open;
})();
