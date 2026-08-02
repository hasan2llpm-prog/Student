/* =========================================================
   Student - Teachers & Educational Materials
   المدرسون وطلبات الاعتماد والمحتوى التعليمي
========================================================= */

(function () {
    "use strict";

    if (window.__studentTeachersEducationLoaded) return;
    window.__studentTeachersEducationLoaded = true;

    let client = null;
    let currentContext = null;

    function db(passedClient) {
        if (passedClient) client = passedClient;
        if (client) return client;
        if (typeof supabaseClient !== "undefined" && supabaseClient) return supabaseClient;
        if (window.supabaseClient) return window.supabaseClient;
        return null;
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function injectStyles() {
        if (document.getElementById("student-teachers-education-style")) return;
        const style = document.createElement("style");
        style.id = "student-teachers-education-style";
        style.textContent = `
            .ste-overlay{position:fixed;inset:0;background:rgba(15,23,42,.52);z-index:10040;display:none;align-items:flex-end;justify-content:center}
            .ste-overlay.show{display:flex}
            .ste-panel{width:min(720px,100%);max-height:92vh;background:#fff;border-radius:24px 24px 0 0;overflow:hidden;box-shadow:0 -18px 50px rgba(0,0,0,.18);direction:rtl}
            .ste-head{display:flex;align-items:center;gap:10px;padding:15px 16px;border-bottom:1px solid #eef0f4;background:#fff;position:sticky;top:0;z-index:2}
            .ste-title{font-weight:800;font-size:17px;flex:1;color:#111827}
            .ste-close,.ste-back{border:1px solid #e5e7eb;background:#fff;border-radius:11px;width:39px;height:39px;cursor:pointer;font-size:18px}
            .ste-body{padding:14px;overflow:auto;max-height:calc(92vh - 70px);background:#f8fafc}
            .ste-card{background:#fff;border:1px solid #e7eaf0;border-radius:16px;padding:14px;margin-bottom:10px}
            .ste-row{display:flex;align-items:center;gap:10px}
            .ste-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#eef2ff;display:grid;place-items:center;font-size:22px;flex:0 0 auto}
            .ste-grow{flex:1;min-width:0}.ste-name{font-weight:800;color:#111827}.ste-muted{color:#6b7280;font-size:13px;line-height:1.6}
            .ste-btn{border:0;border-radius:12px;padding:11px 14px;cursor:pointer;font-weight:700;font-size:14px;background:#2563eb;color:#fff}
            .ste-btn.secondary{background:#fff;color:#1f2937;border:1px solid #dfe3ea}.ste-btn.danger{background:#dc2626}.ste-btn:disabled{opacity:.55;cursor:not-allowed}
            .ste-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
            .ste-input,.ste-select,.ste-textarea{width:100%;border:1px solid #dfe3ea;border-radius:12px;padding:12px;background:#fff;font:inherit;outline:none;margin-top:6px}
            .ste-textarea{min-height:92px;resize:vertical}.ste-label{display:block;font-size:13px;font-weight:700;color:#374151;margin-top:12px}
            .ste-empty{text-align:center;padding:32px 14px;color:#6b7280}.ste-status{padding:10px 12px;border-radius:12px;background:#eff6ff;color:#1d4ed8;margin-bottom:12px;font-size:13px;line-height:1.6}
            .ste-badge{display:inline-block;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:700;background:#eef2ff;color:#4338ca;margin-top:5px}
            .ste-material{display:block;text-decoration:none;color:inherit}.ste-material:hover{border-color:#bfdbfe}
            .ste-confirm{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10060;display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl}
            .ste-confirm-box{background:#fff;width:min(420px,100%);border-radius:18px;padding:18px;box-shadow:0 20px 55px rgba(0,0,0,.25)}
            @media(min-width:760px){.ste-overlay{align-items:center}.ste-panel{border-radius:24px;max-height:88vh}.ste-body{max-height:calc(88vh - 70px)}}
        `;
        document.head.appendChild(style);
    }

    function ensureOverlay() {
        injectStyles();
        let overlay = document.getElementById("student-teachers-education-overlay");
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = "student-teachers-education-overlay";
        overlay.className = "ste-overlay";
        overlay.innerHTML = `
            <section class="ste-panel" role="dialog" aria-modal="true">
                <header class="ste-head">
                    <button class="ste-back" id="ste-back" type="button" style="display:none">→</button>
                    <div class="ste-title" id="ste-title">المدرسون</div>
                    <button class="ste-close" id="ste-close" type="button">×</button>
                </header>
                <div class="ste-body" id="ste-body"></div>
            </section>`;
        document.body.appendChild(overlay);
        overlay.querySelector("#ste-close").addEventListener("click", close);
        overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
        return overlay;
    }

    function openPanel(title, html, backAction) {
        const overlay = ensureOverlay();
        overlay.querySelector("#ste-title").textContent = title;
        overlay.querySelector("#ste-body").innerHTML = html;
        const back = overlay.querySelector("#ste-back");
        back.style.display = backAction ? "inline-grid" : "none";
        back.onclick = backAction || null;
        overlay.classList.add("show");
        return overlay;
    }

    function close() {
        const overlay = document.getElementById("student-teachers-education-overlay");
        if (overlay) overlay.classList.remove("show");
    }

    function loading(title) {
        openPanel(title, `<div class="ste-empty">جارٍ التحميل...</div>`);
    }

    function showError(title, error) {
        console.error("Student Teachers Education:", error);
        openPanel(title, `<div class="ste-empty">تعذر إكمال العملية حاليًا.<br>${esc(error && error.message ? error.message : "")}</div>`);
    }

    function confirmAction(message, confirmText = "تأكيد") {
        return new Promise((resolve) => {
            const layer = document.createElement("div");
            layer.className = "ste-confirm";
            layer.innerHTML = `<div class="ste-confirm-box"><div style="font-weight:800;font-size:17px;margin-bottom:10px">تأكيد العملية</div><div class="ste-muted">${esc(message)}</div><div class="ste-actions"><button class="ste-btn danger" data-ok>${esc(confirmText)}</button><button class="ste-btn secondary" data-cancel>إلغاء</button></div></div>`;
            document.body.appendChild(layer);
            layer.querySelector("[data-ok]").onclick = () => { layer.remove(); resolve(true); };
            layer.querySelector("[data-cancel]").onclick = () => { layer.remove(); resolve(false); };
        });
    }

    function askReason() {
        return new Promise((resolve) => {
            const layer = document.createElement("div");
            layer.className = "ste-confirm";
            layer.innerHTML = `<div class="ste-confirm-box"><div style="font-weight:800;font-size:17px;margin-bottom:10px">سبب الرفض</div><textarea class="ste-textarea" data-reason placeholder="اكتب سببًا واضحًا للمدرس"></textarea><div class="ste-actions"><button class="ste-btn danger" data-ok>متابعة</button><button class="ste-btn secondary" data-cancel>إلغاء</button></div></div>`;
            document.body.appendChild(layer);
            const input = layer.querySelector("[data-reason]");
            layer.querySelector("[data-ok]").onclick = () => {
                const value = input.value.trim();
                if (!value) {
                    input.focus();
                    return;
                }
                layer.remove();
                resolve(value);
            };
            layer.querySelector("[data-cancel]").onclick = () => { layer.remove(); resolve(null); };
            input.focus();
        });
    }

    async function sessionUser() {
        const database = db();
        if (!database) return null;
        const { data, error } = await database.auth.getSession();
        if (error) throw error;
        return data && data.session ? data.session.user : null;
    }

    async function profileMap(userIds) {
        const database = db();
        if (!userIds.length) return new Map();
        const unique = [...new Set(userIds)];
        const { data, error } = await database.from("profiles").select("id,full_name,username,avatar_url,bio").in("id", unique);
        if (error) throw error;
        return new Map((data || []).map((row) => [row.id, row]));
    }

    async function openSubject(context) {
        currentContext = context;
        const database = db(context && context.client);
        if (!database) return showError("المدرسون", new Error("Supabase غير جاهز"));
        loading(context.title || "المدرسون");
        try {
            const table = context.education_type === "university" ? "teacher_university_assignments" : "teacher_school_assignments";
            let query = database.from(table).select("id,teacher_id,subject_id,level_id,track_id,university_level_id").eq("subject_id", context.subject_id);
            if (context.education_type === "university") query = query.eq("university_level_id", context.university_level_id);
            else {
                query = query.eq("level_id", context.level_id);
                query = context.track_id ? query.eq("track_id", context.track_id) : query.is("track_id", null);
            }
            const { data: assignments, error } = await query;
            if (error) throw error;
            const rows = assignments || [];
            const profiles = await profileMap(rows.map((x) => x.teacher_id));
            const cards = rows.map((assignment) => {
                const p = profiles.get(assignment.teacher_id) || {};
                return `<button type="button" class="ste-card ste-row" data-assignment="${esc(assignment.id)}" style="width:100%;text-align:right;cursor:pointer">
                    <span class="ste-avatar">${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : "👨‍🏫"}</span>
                    <span class="ste-grow"><span class="ste-name">${esc(p.full_name || p.username || "مدرس")}</span><span class="ste-muted" style="display:block">${esc(p.bio || "اضغط لعرض الملفات والشروحات")}</span></span><span>‹</span>
                </button>`;
            }).join("");
            const overlay = openPanel(context.title || "المدرسون", cards || `<div class="ste-empty">لا يوجد مدرسون معتمدون لهذه المادة حاليًا.</div>`);
            overlay.querySelectorAll("[data-assignment]").forEach((button) => {
                button.onclick = () => openTeacherMaterials(rows.find((x) => x.id === button.dataset.assignment), context, profiles);
            });
        } catch (error) { showError(context.title || "المدرسون", error); }
    }

    async function openTeacherMaterials(assignment, context, profiles) {
        const database = db();
        loading("ملفات المدرس");
        try {
            let query = database.from("teacher_educational_materials")
                .select("id,title,description,material_type,file_url,external_url,thumbnail_url,published_at,sort_order")
                .eq("teacher_id", assignment.teacher_id)
                .eq(context.education_type === "university" ? "university_assignment_id" : "school_assignment_id", assignment.id)
                .order("sort_order", { ascending: true });
            const { data, error } = await query;
            if (error) throw error;
            const p = profiles.get(assignment.teacher_id) || {};
            const materials = data || [];
            const html = `<div class="ste-card ste-row"><span class="ste-avatar">${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : "👨‍🏫"}</span><span class="ste-grow"><span class="ste-name">${esc(p.full_name || p.username || "مدرس")}</span><span class="ste-muted" style="display:block">${esc(p.bio || "")}</span></span></div>` +
                (materials.length ? materials.map((m) => {
                    const url = m.file_url || m.external_url || "";
                    const tag = url ? "a" : "div";
                    const attrs = url ? `href="${esc(url)}" target="_blank" rel="noopener"` : "";
                    return `<${tag} ${attrs} class="ste-card ste-material"><div class="ste-name">${esc(m.title)}</div><div class="ste-muted">${esc(m.description || m.material_type)}</div>${url ? `<div class="ste-badge">فتح المحتوى</div>` : ""}</${tag}>`;
                }).join("") : `<div class="ste-empty">لم ينشر المدرس ملفات لهذه المادة بعد.</div>`);
            openPanel("ملفات المدرس", html, () => openSubject(context));
        } catch (error) { showError("ملفات المدرس", error); }
    }

    async function openTeacherPortal(passedClient) {
        db(passedClient);
        loading("مساحة المدرس");
        try {
            const user = await sessionUser();
            if (!user) return openPanel("مساحة المدرس", `<div class="ste-empty">سجّل الدخول أولًا.</div>`);
            const { data: teacher, error } = await db().from("teacher_profiles").select("*").eq("user_id", user.id).maybeSingle();
            if (error) throw error;
            if (!teacher) return renderTeacherRegistration(user);
            if (teacher.verification_status !== "approved") return renderPendingTeacher(teacher);
            return renderApprovedTeacher(user, teacher);
        } catch (error) { showError("مساحة المدرس", error); }
    }

    function renderTeacherRegistration(user) {
        const overlay = openPanel("طلب اعتماد مدرس", `<div class="ste-status">أدخل معلوماتك بدقة. سيراجع الأدمن الطلب قبل ظهور حسابك للطلاب.</div>
            <label class="ste-label">التخصص<input id="ste-specialization" class="ste-input" placeholder="مثال: اللغة الإنجليزية"></label>
            <label class="ste-label">نبذة<textarea id="ste-bio" class="ste-textarea"></textarea></label>
            <label class="ste-label">المؤهلات<textarea id="ste-qualifications" class="ste-textarea"></textarea></label>
            <label class="ste-label">سنوات الخبرة<input id="ste-experience" class="ste-input" type="number" min="0" value="0"></label>
            <label class="ste-label">رابط وثيقة أو شهادة (اختياري)<input id="ste-document" class="ste-input" type="url"></label>
            <div class="ste-actions"><button id="ste-submit-request" class="ste-btn">إرسال الطلب</button></div>`);
        overlay.querySelector("#ste-submit-request").onclick = async function () {
            const specialization = overlay.querySelector("#ste-specialization").value.trim();
            if (!specialization) return alert("اكتب التخصص");
            this.disabled = true;
            try {
                const experience = Math.max(0, Number(overlay.querySelector("#ste-experience").value || 0));
                const bio = overlay.querySelector("#ste-bio").value.trim();
                const qualifications = overlay.querySelector("#ste-qualifications").value.trim();
                const documentUrl = overlay.querySelector("#ste-document").value.trim() || null;
                const { error: profileError } = await db().from("teacher_profiles").insert({ user_id: user.id, specialization, bio, qualifications, experience_years: experience });
                if (profileError) throw profileError;
                const { error: requestError } = await db().from("teacher_verification_requests").insert({ teacher_id: user.id, specialization, qualifications, experience_years: experience, document_url: documentUrl });
                if (requestError) throw requestError;
                openPanel("طلب الاعتماد", `<div class="ste-empty">تم إرسال الطلب بنجاح. ستظهر حالته هنا بعد المراجعة.</div>`);
            } catch (error) { showError("طلب الاعتماد", error); }
            finally { this.disabled = false; }
        };
    }

    function renderPendingTeacher(teacher) {
        const labels = { pending: "قيد المراجعة", rejected: "مرفوض", suspended: "معلّق" };
        openPanel("حالة الاعتماد", `<div class="ste-card"><div class="ste-name">${esc(labels[teacher.verification_status] || teacher.verification_status)}</div><div class="ste-muted">التخصص: ${esc(teacher.specialization || "غير محدد")}</div>${teacher.rejection_reason ? `<div class="ste-status" style="margin-top:12px;background:#fef2f2;color:#b91c1c">سبب الرفض: ${esc(teacher.rejection_reason)}</div>` : ""}</div>`);
    }

    async function renderApprovedTeacher(user, teacher) {
        try {
            const [schoolResult, universityResult, materialsResult] = await Promise.all([
                db().from("teacher_school_assignments").select("id,subject_id,level_id,track_id").eq("teacher_id", user.id),
                db().from("teacher_university_assignments").select("id,subject_id,university_level_id").eq("teacher_id", user.id),
                db().from("teacher_educational_materials").select("id,title,publication_status,material_type,created_at").eq("teacher_id", user.id).order("created_at", { ascending: false })
            ]);
            if (schoolResult.error) throw schoolResult.error;
            if (universityResult.error) throw universityResult.error;
            if (materialsResult.error) throw materialsResult.error;
            const assignments = [
                ...(schoolResult.data || []).map((x) => ({ ...x, education_type: "school", label: `مادة مدرسية — ${x.subject_id}` })),
                ...(universityResult.data || []).map((x) => ({ ...x, education_type: "university", label: `مادة جامعية — ${x.subject_id}` }))
            ];
            const materials = materialsResult.data || [];
            const options = assignments.map((a) => `<option value="${esc(a.education_type + ":" + a.id)}">${esc(a.label)}</option>`).join("");
            const overlay = openPanel("مساحة المدرس", `<div class="ste-status">حسابك معتمد. يمكنك إضافة شرح نصي أو رابط PDF/صورة/فيديو، ثم إرساله للمراجعة.</div>
                ${assignments.length ? `<label class="ste-label">المادة المرتبطة<select id="ste-assignment" class="ste-select">${options}</select></label>
                <label class="ste-label">العنوان<input id="ste-material-title" class="ste-input"></label>
                <label class="ste-label">نوع المحتوى<select id="ste-material-type" class="ste-select"><option value="text">شرح نصي</option><option value="pdf">PDF</option><option value="image">صورة</option><option value="video">فيديو</option><option value="link">رابط</option><option value="other">أخرى</option></select></label>
                <label class="ste-label">الشرح أو الوصف<textarea id="ste-material-description" class="ste-textarea"></textarea></label>
                <label class="ste-label">رابط الملف أو المحتوى (ليس مطلوبًا للشرح النصي)<input id="ste-material-url" class="ste-input" type="url"></label>
                <div class="ste-actions"><button id="ste-save-material" class="ste-btn">إرسال للمراجعة</button></div>` : `<div class="ste-empty">لم يربطك الأدمن بأي مادة بعد.</div>`}
                <div style="font-weight:800;margin:18px 0 8px">محتواي</div>
                ${materials.length ? materials.map((m) => `<div class="ste-card"><div class="ste-name">${esc(m.title)}</div><span class="ste-badge">${esc(m.publication_status)}</span></div>`).join("") : `<div class="ste-empty">لا يوجد محتوى بعد.</div>`}`);
            const save = overlay.querySelector("#ste-save-material");
            if (save) save.onclick = async function () {
                const assignmentValue = overlay.querySelector("#ste-assignment").value;
                const [type, assignmentId] = assignmentValue.split(":");
                const title = overlay.querySelector("#ste-material-title").value.trim();
                const materialType = overlay.querySelector("#ste-material-type").value;
                const description = overlay.querySelector("#ste-material-description").value.trim();
                const url = overlay.querySelector("#ste-material-url").value.trim() || null;
                if (!title) return alert("اكتب عنوان المحتوى");
                if (materialType !== "text" && !url) return alert("أضف رابط الملف أو المحتوى");
                this.disabled = true;
                try {
                    const payload = { teacher_id: user.id, education_type: type, title, description, material_type: materialType, publication_status: "pending" };
                    if (materialType === "link" || materialType === "video") payload.external_url = url;
                    else if (url) payload.file_url = url;
                    if (type === "school") payload.school_assignment_id = assignmentId;
                    else payload.university_assignment_id = assignmentId;
                    const { error } = await db().from("teacher_educational_materials").insert(payload);
                    if (error) throw error;
                    await renderApprovedTeacher(user, teacher);
                } catch (error) { showError("إضافة المحتوى", error); }
                finally { this.disabled = false; }
            };
        } catch (error) { showError("مساحة المدرس", error); }
    }

    async function openAdmin(passedClient) {
        db(passedClient);
        loading("طلبات المدرسين");
        try {
            const { data: requests, error } = await db().from("teacher_verification_requests").select("*").eq("status", "pending").order("created_at", { ascending: true });
            if (error) throw error;
            const rows = requests || [];
            const profiles = await profileMap(rows.map((x) => x.teacher_id));
            const html = rows.length ? rows.map((r) => {
                const p = profiles.get(r.teacher_id) || {};
                return `<div class="ste-card" data-request="${esc(r.id)}"><div class="ste-row"><span class="ste-avatar">👨‍🏫</span><span class="ste-grow"><div class="ste-name">${esc(p.full_name || p.username || "مدرس")}</div><div class="ste-muted">${esc(r.specialization)} — خبرة ${esc(r.experience_years)} سنة</div></span></div><div class="ste-muted" style="margin-top:9px">${esc(r.qualifications || "لا توجد مؤهلات مكتوبة")}</div>${r.document_url ? `<a href="${esc(r.document_url)}" target="_blank" rel="noopener" class="ste-badge">فتح الوثيقة</a>` : ""}<div class="ste-actions"><button class="ste-btn" data-approve>قبول</button><button class="ste-btn danger" data-reject>رفض</button></div></div>`;
            }).join("") : `<div class="ste-empty">لا توجد طلبات معلقة.</div>`;
            const overlay = openPanel("طلبات اعتماد المدرسين", html);
            overlay.querySelectorAll("[data-request]").forEach((card) => {
                const request = rows.find((x) => x.id === card.dataset.request);
                card.querySelector("[data-approve]").onclick = () => approveTeacher(request);
                card.querySelector("[data-reject]").onclick = () => rejectTeacher(request);
            });
        } catch (error) { showError("طلبات المدرسين", error); }
    }

    async function approveTeacher(request) {
        const ok = await confirmAction("سيتم اعتماد المدرس وإظهار إمكانية ربطه بالمواد.", "اعتماد");
        if (!ok) return;
        try {
            const user = await sessionUser();
            const now = new Date().toISOString();
            const { error: requestError } = await db().from("teacher_verification_requests").update({ status: "approved", reviewed_by: user.id, reviewed_at: now }).eq("id", request.id);
            if (requestError) throw requestError;
            const { error: profileError } = await db().from("teacher_profiles").update({ verification_status: "approved", is_visible: true, verified_by: user.id, verified_at: now, rejection_reason: null }).eq("user_id", request.teacher_id);
            if (profileError) throw profileError;
            await openAdmin();
        } catch (error) { showError("اعتماد المدرس", error); }
    }

    async function rejectTeacher(request) {
        const reason = await askReason();
        if (!reason) return;
        const ok = await confirmAction("سيتم رفض الطلب وإرسال السبب إلى المدرس.", "رفض الطلب");
        if (!ok) return;
        try {
            const user = await sessionUser();
            const now = new Date().toISOString();
            const { error: requestError } = await db().from("teacher_verification_requests").update({ status: "rejected", rejection_reason: reason, reviewed_by: user.id, reviewed_at: now }).eq("id", request.id);
            if (requestError) throw requestError;
            const { error: profileError } = await db().from("teacher_profiles").update({ verification_status: "rejected", rejection_reason: reason, is_visible: false }).eq("user_id", request.teacher_id);
            if (profileError) throw profileError;
            await openAdmin();
        } catch (error) { showError("رفض الطلب", error); }
    }

    window.StudentTeachersEducation = {
        openSubject,
        openTeacherPortal,
        openAdmin,
        close
    };
})();
