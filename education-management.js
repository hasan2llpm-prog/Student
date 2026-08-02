/* =========================================================
   Student - Education Management
   إدارة المراحل والصفوف والمواد والجامعات من ملف واحد
========================================================= */

(function () {
    "use strict";

    if (window.StudentEducationManagement) return;

    let client = null;
    let overlay = null;
    let currentEntity = "education_stages";
    let rows = [];
    let editingId = null;

    const entities = {
        education_stages: {
            label: "المراحل الدراسية",
            table: "education_stages",
            fields: [
                { key: "name", label: "اسم المرحلة", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "icon_url", label: "رابط الأيقونة", ltr: true },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        education_levels: {
            label: "الصفوف والمستويات",
            table: "education_levels",
            parent: { key: "stage_id", label: "المرحلة", table: "education_stages" },
            fields: [
                { key: "name", label: "اسم الصف", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        education_subjects: {
            label: "المواد المدرسية",
            table: "education_subjects",
            fields: [
                { key: "name", label: "اسم المادة", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "icon_url", label: "رابط الأيقونة", ltr: true },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        education_level_subjects: {
            label: "مواد الصفوف",
            table: "education_level_subjects",
            relationFields: [
                { key: "level_id", label: "الصف", table: "education_levels" },
                { key: "subject_id", label: "المادة", table: "education_subjects" }
            ],
            fields: [
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        education_tracks: {
            label: "فروع الإعدادية",
            table: "education_tracks",
            parent: { key: "level_id", label: "الصف", table: "education_levels" },
            fields: [
                { key: "name", label: "اسم الفرع", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        education_track_subjects: {
            label: "مواد الفروع",
            table: "education_track_subjects",
            relationFields: [
                { key: "track_id", label: "الفرع", table: "education_tracks" },
                { key: "subject_id", label: "المادة", table: "education_subjects" }
            ],
            fields: [
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        universities: {
            label: "الجامعات",
            table: "universities",
            fields: [
                { key: "name", label: "اسم الجامعة", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "city", label: "المدينة" },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "logo_url", label: "رابط الشعار", ltr: true },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        university_colleges: {
            label: "الكليات",
            table: "university_colleges",
            parent: { key: "university_id", label: "الجامعة", table: "universities" },
            fields: [
                { key: "name", label: "اسم الكلية", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "logo_url", label: "رابط الشعار", ltr: true },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        university_departments: {
            label: "الأقسام الجامعية",
            table: "university_departments",
            parent: { key: "college_id", label: "الكلية", table: "university_colleges" },
            fields: [
                { key: "name", label: "اسم القسم", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        university_levels: {
            label: "المراحل الجامعية",
            table: "university_levels",
            parent: { key: "department_id", label: "القسم", table: "university_departments" },
            fields: [
                { key: "name", label: "اسم المرحلة", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        university_subjects: {
            label: "مواد الجامعة",
            table: "university_subjects",
            fields: [
                { key: "name", label: "اسم المادة", required: true },
                { key: "slug", label: "المعرّف المختصر", required: true, ltr: true },
                { key: "description", label: "الوصف", type: "textarea" },
                { key: "icon_url", label: "رابط الأيقونة", ltr: true },
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        },
        university_level_subjects: {
            label: "مواد المراحل الجامعية",
            table: "university_level_subjects",
            relationFields: [
                { key: "university_level_id", label: "المرحلة الجامعية", table: "university_levels" },
                { key: "subject_id", label: "المادة", table: "university_subjects" }
            ],
            fields: [
                { key: "sort_order", label: "الترتيب", type: "number", default: 0 }
            ]
        }
    };

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function createUI() {
        if (overlay) return;

        const style = document.createElement("style");
        style.textContent = `
            .sem-overlay{position:fixed;inset:0;background:rgba(0,0,0,.48);z-index:100100;display:none;padding:12px;direction:rtl}
            .sem-overlay.show{display:flex;align-items:center;justify-content:center}
            .sem-panel{width:min(980px,100%);height:min(92vh,900px);background:#fff;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 60px rgba(0,0,0,.25)}
            .sem-header{padding:14px 16px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:10px}
            .sem-title{font-weight:800;font-size:18px}.sem-close,.sem-back{border:0;background:#f2f2f2;width:38px;height:38px;border-radius:50%;cursor:pointer}
            .sem-body{display:grid;grid-template-columns:220px 1fr;min-height:0;flex:1}.sem-nav{padding:12px;border-left:1px solid #eee;overflow:auto;background:#fafafa}
            .sem-nav button{width:100%;border:0;background:transparent;text-align:right;padding:10px;border-radius:10px;margin-bottom:4px;cursor:pointer;font-size:13px}.sem-nav button.active{background:#eaf5ff;color:#0878c9;font-weight:700}
            .sem-main{padding:14px;overflow:auto}.sem-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.sem-add{border:0;background:#0095f6;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:700}
            .sem-status{font-size:12px;color:#666}.sem-card{border:1px solid #e8e8e8;border-radius:13px;padding:12px;margin-bottom:9px;display:flex;justify-content:space-between;gap:10px;align-items:center}
            .sem-card h4{margin:0 0 4px;font-size:14px}.sem-meta{font-size:11px;color:#888}.sem-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.sem-badge{font-size:10px;padding:3px 7px;border-radius:20px;background:#f1f1f1}.sem-badge.on{background:#e9f8ee;color:#16733a}.sem-badge.off{background:#fff0ef;color:#b3261e}
            .sem-actions{display:flex;gap:5px;flex-wrap:wrap}.sem-actions button{border:0;border-radius:8px;padding:7px 9px;cursor:pointer;font-size:11px}.sem-edit{background:#eaf5ff;color:#0878c9}.sem-archive{background:#fff4df;color:#9a6500}.sem-delete{background:#fff0ef;color:#b3261e}
            .sem-form-layer,.sem-confirm-layer{position:absolute;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;padding:12px;z-index:2}.sem-form-layer.show,.sem-confirm-layer.show{display:flex}
            .sem-dialog{width:min(520px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;padding:16px}.sem-dialog h3{margin:0 0 14px}.sem-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sem-field{margin-bottom:10px}.sem-field.full{grid-column:1/-1}.sem-field label{display:block;font-size:12px;color:#666;margin-bottom:5px}.sem-field input,.sem-field textarea,.sem-field select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:10px;background:#fff}.sem-field textarea{min-height:75px;resize:vertical}.sem-checks{display:flex;gap:16px;margin:10px 0}.sem-dialog-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.sem-dialog-actions button{border:0;border-radius:9px;padding:9px 14px;cursor:pointer}.sem-primary{background:#0095f6;color:#fff}.sem-secondary{background:#eee}.sem-danger{background:#d93025;color:#fff}.sem-empty{text-align:center;color:#888;padding:35px}
            @media(max-width:720px){
                .sem-overlay{padding:0;align-items:stretch;justify-content:stretch}
                .sem-panel{width:100%;height:100dvh;max-height:none;border-radius:0}
                .sem-header{flex:0 0 auto;padding:14px 16px}
                .sem-body{display:flex;flex-direction:column;min-height:0;flex:1}
                .sem-nav{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;padding:8px;border-left:0;border-bottom:1px solid #eee;background:#fafafa;scrollbar-width:none}
                .sem-nav::-webkit-scrollbar{display:none}
                .sem-nav button{width:auto;min-width:max-content;flex:0 0 auto;margin:0;padding:9px 12px}
                .sem-main{flex:1;min-height:0;overflow-y:auto;padding:12px}
                .sem-toolbar{position:sticky;top:0;z-index:1;background:#fff;padding:4px 0 10px}
                .sem-grid{grid-template-columns:1fr}
                .sem-card{align-items:flex-start;flex-direction:column}
                .sem-actions{width:100%}
            }
        `;
        document.head.appendChild(style);

        overlay = document.createElement("div");
        overlay.className = "sem-overlay";
        overlay.innerHTML = `
            <div class="sem-panel" style="position:relative">
                <div class="sem-header">
                    <button class="sem-back" title="العودة"><i class="fa-solid fa-arrow-right"></i></button>
                    <div class="sem-title">إدارة التعليم</div>
                    <button class="sem-close" title="إغلاق"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="sem-body">
                    <div class="sem-nav"></div>
                    <div class="sem-main">
                        <div class="sem-toolbar">
                            <div><strong class="sem-section-title"></strong><div class="sem-status"></div></div>
                            <button class="sem-add"><i class="fa-solid fa-plus"></i> إضافة</button>
                        </div>
                        <div class="sem-list"></div>
                    </div>
                </div>
                <div class="sem-form-layer"></div>
                <div class="sem-confirm-layer"></div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.querySelector(".sem-close").addEventListener("click", close);
        overlay.querySelector(".sem-back").addEventListener("click", close);
        overlay.querySelector(".sem-add").addEventListener("click", () => openForm());
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close();
        });

        renderNavigation();
    }

    function renderNavigation() {
        const nav = overlay.querySelector(".sem-nav");
        nav.innerHTML = "";
        Object.entries(entities).forEach(([key, item]) => {
            const button = document.createElement("button");
            button.textContent = item.label;
            button.dataset.entity = key;
            button.classList.toggle("active", key === currentEntity);
            button.addEventListener("click", async () => {
                currentEntity = key;
                editingId = null;
                renderNavigation();
                await loadRows();
            });
            nav.appendChild(button);
        });
    }

    async function loadRows() {
        const config = entities[currentEntity];
        const list = overlay.querySelector(".sem-list");
        const status = overlay.querySelector(".sem-status");
        overlay.querySelector(".sem-section-title").textContent = config.label;
        status.textContent = "جاري التحميل...";
        list.innerHTML = "";

        const { data, error } = await client
            .from(config.table)
            .select("*")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            status.textContent = "فشل التحميل: " + error.message;
            return;
        }

        rows = data || [];
        status.textContent = `العدد: ${rows.length}`;
        renderRows();
    }

    function renderRows() {
        const list = overlay.querySelector(".sem-list");
        list.innerHTML = "";

        if (!rows.length) {
            list.innerHTML = '<div class="sem-empty">لا توجد عناصر بعد.</div>';
            return;
        }

        rows.forEach(row => {
            const card = document.createElement("div");
            card.className = "sem-card";
            const title = row.name || row.title || "رابط تعليمي";
            const secondary = row.slug || row.id;
            card.innerHTML = `
                <div>
                    <h4>${escapeHTML(title)}</h4>
                    <div class="sem-meta">${escapeHTML(secondary)}</div>
                    <div class="sem-badges">
                        <span class="sem-badge ${row.is_active === false ? "off" : "on"}">${row.is_active === false ? "معطّل" : "مفعّل"}</span>
                        <span class="sem-badge ${row.is_visible === false ? "off" : "on"}">${row.is_visible === false ? "مخفي" : "ظاهر"}</span>
                        ${row.archived_at ? '<span class="sem-badge off">مؤرشف</span>' : ""}
                        <span class="sem-badge">ترتيب ${Number(row.sort_order || 0)}</span>
                    </div>
                </div>
                <div class="sem-actions">
                    <button class="sem-edit">تعديل</button>
                    <button class="sem-archive">${row.archived_at ? "استعادة" : "أرشفة"}</button>
                    <button class="sem-delete">حذف نهائي</button>
                </div>`;

            card.querySelector(".sem-edit").addEventListener("click", () => openForm(row));
            card.querySelector(".sem-archive").addEventListener("click", () => confirmArchive(row));
            card.querySelector(".sem-delete").addEventListener("click", () => confirmDelete(row));
            list.appendChild(card);
        });
    }

    async function fetchOptions(table) {
        const { data, error } = await client
            .from(table)
            .select("id,name,slug,sort_order")
            .order("sort_order", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async function openForm(row = null) {
        const config = entities[currentEntity];
        const layer = overlay.querySelector(".sem-form-layer");
        editingId = row ? row.id : null;
        layer.innerHTML = '<div class="sem-dialog"><h3>جاري تجهيز النموذج...</h3></div>';
        layer.classList.add("show");

        try {
            const selectors = [];
            if (config.parent) selectors.push(config.parent);
            if (config.relationFields) selectors.push(...config.relationFields);

            const optionMaps = {};
            await Promise.all(selectors.map(async selector => {
                optionMaps[selector.key] = await fetchOptions(selector.table);
            }));

            let fieldsHTML = "";
            selectors.forEach(selector => {
                const value = row?.[selector.key] || "";
                fieldsHTML += `<div class="sem-field full"><label>${escapeHTML(selector.label)}</label><select name="${selector.key}" required><option value="">اختر...</option>${optionMaps[selector.key].map(item => `<option value="${item.id}" ${String(value) === String(item.id) ? "selected" : ""}>${escapeHTML(item.name || item.slug || item.id)}</option>`).join("")}</select></div>`;
            });

            config.fields.forEach(field => {
                const value = row?.[field.key] ?? field.default ?? "";
                const full = field.type === "textarea" ? " full" : "";
                if (field.type === "textarea") {
                    fieldsHTML += `<div class="sem-field${full}"><label>${escapeHTML(field.label)}</label><textarea name="${field.key}" ${field.required ? "required" : ""}>${escapeHTML(value)}</textarea></div>`;
                } else {
                    fieldsHTML += `<div class="sem-field${full}"><label>${escapeHTML(field.label)}</label><input name="${field.key}" type="${field.type || "text"}" value="${escapeHTML(value)}" ${field.required ? "required" : ""} ${field.ltr ? 'dir="ltr"' : ""}></div>`;
                }
            });

            layer.innerHTML = `
                <form class="sem-dialog sem-edit-form">
                    <h3>${row ? "تعديل" : "إضافة"} — ${escapeHTML(config.label)}</h3>
                    <div class="sem-grid">${fieldsHTML}</div>
                    <div class="sem-checks">
                        <label><input type="checkbox" name="is_active" ${row?.is_active === false ? "" : "checked"}> مفعّل</label>
                        <label><input type="checkbox" name="is_visible" ${row?.is_visible === false ? "" : "checked"}> ظاهر</label>
                    </div>
                    <div class="sem-status sem-form-status"></div>
                    <div class="sem-dialog-actions">
                        <button type="button" class="sem-secondary sem-cancel">إلغاء</button>
                        <button type="submit" class="sem-primary">حفظ</button>
                    </div>
                </form>`;

            const form = layer.querySelector("form");
            layer.querySelector(".sem-cancel").addEventListener("click", () => layer.classList.remove("show"));
            form.addEventListener("submit", saveForm);
        } catch (error) {
            layer.innerHTML = `<div class="sem-dialog"><h3>تعذر فتح النموذج</h3><div>${escapeHTML(error.message)}</div><div class="sem-dialog-actions"><button class="sem-secondary sem-cancel">إغلاق</button></div></div>`;
            layer.querySelector(".sem-cancel").addEventListener("click", () => layer.classList.remove("show"));
        }
    }

    async function saveForm(event) {
        event.preventDefault();
        const config = entities[currentEntity];
        const form = event.currentTarget;
        const submit = form.querySelector('[type="submit"]');
        const status = form.querySelector(".sem-form-status");
        const formData = new FormData(form);
        const payload = {};

        if (config.parent) payload[config.parent.key] = formData.get(config.parent.key);
        (config.relationFields || []).forEach(item => payload[item.key] = formData.get(item.key));
        config.fields.forEach(field => {
            let value = formData.get(field.key);
            if (field.type === "number") value = Number(value || 0);
            if (typeof value === "string") value = value.trim();
            payload[field.key] = value || (field.type === "number" ? 0 : null);
        });
        payload.is_active = form.elements.is_active.checked;
        payload.is_visible = form.elements.is_visible.checked;

        submit.disabled = true;
        status.textContent = "جارٍ الحفظ...";

        let query;
        if (editingId) {
            query = client.from(config.table).update(payload).eq("id", editingId);
        } else {
            query = client.from(config.table).insert(payload);
        }
        const { error } = await query;

        if (error) {
            console.error(error);
            status.textContent = "فشل الحفظ: " + error.message;
            submit.disabled = false;
            return;
        }

        overlay.querySelector(".sem-form-layer").classList.remove("show");
        await loadRows();
    }

    function openConfirm({ title, text, danger = false, confirmText = "تأكيد", onConfirm }) {
        const layer = overlay.querySelector(".sem-confirm-layer");
        layer.innerHTML = `
            <div class="sem-dialog">
                <h3>${escapeHTML(title)}</h3>
                <div>${escapeHTML(text)}</div>
                <div class="sem-status sem-confirm-status"></div>
                <div class="sem-dialog-actions">
                    <button class="sem-secondary sem-cancel">إلغاء</button>
                    <button class="${danger ? "sem-danger" : "sem-primary"} sem-confirm">${escapeHTML(confirmText)}</button>
                </div>
            </div>`;
        layer.classList.add("show");
        layer.querySelector(".sem-cancel").addEventListener("click", () => layer.classList.remove("show"));
        layer.querySelector(".sem-confirm").addEventListener("click", async event => {
            const button = event.currentTarget;
            const status = layer.querySelector(".sem-confirm-status");
            button.disabled = true;
            status.textContent = "جارٍ التنفيذ...";
            try {
                await onConfirm();
                layer.classList.remove("show");
                await loadRows();
            } catch (error) {
                console.error(error);
                status.textContent = "فشل التنفيذ: " + (error.message || error);
                button.disabled = false;
            }
        });
    }

    function confirmArchive(row) {
        const config = entities[currentEntity];
        const restoring = !!row.archived_at;
        openConfirm({
            title: restoring ? "استعادة العنصر" : "أرشفة العنصر",
            text: restoring ? "سيعود العنصر للظهور بحسب حالة التفعيل والإظهار." : "سيُخفى العنصر دون حذف بياناته أو روابطه.",
            confirmText: restoring ? "استعادة" : "أرشفة",
            onConfirm: async () => {
                const { error } = await client
                    .from(config.table)
                    .update({ archived_at: restoring ? null : new Date().toISOString() })
                    .eq("id", row.id);
                if (error) throw error;
            }
        });
    }

    function confirmDelete(row) {
        const config = entities[currentEntity];
        openConfirm({
            title: "حذف نهائي",
            text: "هذا الإجراء لا يمكن التراجع عنه. إذا كان العنصر مرتبطًا ببيانات أخرى فستمنع قاعدة البيانات الحذف لحمايتها.",
            danger: true,
            confirmText: "حذف نهائي",
            onConfirm: async () => {
                const { error } = await client.from(config.table).delete().eq("id", row.id);
                if (error) throw error;
            }
        });
    }

    async function open(supabaseClient) {
        if (!supabaseClient) throw new Error("اتصال Supabase غير متوفر");
        client = supabaseClient;
        createUI();
        overlay.classList.add("show");
        renderNavigation();
        await loadRows();
    }

    function close() {
        if (overlay) overlay.classList.remove("show");
    }

    window.StudentEducationManagement = { open, close };
})();
