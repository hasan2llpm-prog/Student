/* =========================================================
   Student - Education Browser
   المراحل والصفوف والفروع والمواد والجامعة
========================================================= */

(function () {
    "use strict";

    if (window.__studentEducationLoaded) return;
    window.__studentEducationLoaded = true;

    const state = {
        history: []
    };

    function db() {
        if (typeof supabaseClient !== "undefined" && supabaseClient) {
            return supabaseClient;
        }
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

    function panel(title, body) {
        if (window.StudentNavigation?.openPage) {
            return window.StudentNavigation.openPage({ id:"education-browser", title:title || "التعليم", html:body || "", reuse:true, onClose:function(){ state.history=[]; } });
        }
        if (typeof showFloatingPanel === "function") return showFloatingPanel(title, body);
        return null;
    }

    function loading(title) {
        panel(title, `
            <div style="padding:34px 12px;text-align:center;color:#666;">
                <div style="font-size:30px;margin-bottom:12px;">⏳</div>
                جارٍ التحميل...
            </div>
        `);
    }

    function message(title, text) {
        panel(title, `
            <div style="padding:30px 14px;text-align:center;color:#666;line-height:1.8;">
                ${esc(text)}
            </div>
        `);
    }

    function errorMessage(error) {
        console.error("Student Education:", error);
        message("التعليم", "تعذر تحميل البيانات حاليًا. حاول مرة أخرى.");
    }

    function pushHistory(action) {
        state.history.push(action);
    }

    function backButton() {
        if (!state.history.length) return "";
        return `
            <button id="edu-back-btn" type="button" style="
                border:1px solid #e5e7eb;background:#fff;color:#222;
                padding:9px 14px;border-radius:11px;font-size:14px;
                cursor:pointer;margin-bottom:12px;width:100%;
            ">الرجوع</button>
        `;
    }

    function bindBack() {
        const button = document.getElementById("edu-back-btn");
        if (!button) return;
        button.addEventListener("click", function () {
            const previous = state.history.pop();
            if (typeof previous === "function") previous();
        });
    }

    function listMarkup(items, emptyText) {
        if (!items.length) {
            return `<div style="padding:28px 12px;text-align:center;color:#777;">${esc(emptyText)}</div>`;
        }

        return `
            <div style="display:grid;gap:10px;max-height:62vh;overflow:auto;padding:2px;">
                ${items.map((item) => `
                    <button type="button" class="edu-list-item" data-id="${esc(item.id)}" style="
                        border:1px solid #e7e9ee;background:#fff;text-align:right;
                        padding:14px;border-radius:14px;cursor:pointer;width:100%;
                        display:flex;align-items:center;gap:11px;
                    ">
                        <span style="font-size:24px;min-width:30px;text-align:center;">${esc(item.icon || "📘")}</span>
                        <span style="flex:1;min-width:0;">
                            <strong style="display:block;color:#111;font-size:15px;white-space:normal;">${esc(item.name)}</strong>
                            ${item.description ? `<small style="display:block;color:#777;margin-top:4px;line-height:1.5;">${esc(item.description)}</small>` : ""}
                        </span>
                        <span style="color:#999;font-size:20px;">‹</span>
                    </button>
                `).join("")}
            </div>
        `;
    }

    function renderList(title, items, emptyText, onSelect) {
        panel(title, `${backButton()}${listMarkup(items, emptyText)}
            <button id="edu-teacher-portal-btn" type="button" style="
                border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;
                padding:11px 14px;border-radius:12px;font-size:14px;font-weight:700;
                cursor:pointer;margin-top:12px;width:100%;
            ">مساحة المدرس وطلب الاعتماد</button>`);
        bindBack();

        const teacherPortalButton = document.getElementById("edu-teacher-portal-btn");
        if (teacherPortalButton) {
            teacherPortalButton.addEventListener("click", async function () {
                try {
                    await loadTeachersEducation();
                    await window.StudentTeachersEducation.openTeacherPortal(db());
                } catch (error) {
                    errorMessage(error);
                }
            });
        }

        document.querySelectorAll(".edu-list-item").forEach((button) => {
            button.addEventListener("click", function () {
                const selected = items.find((item) => item.id === this.dataset.id);
                if (selected) onSelect(selected);
            });
        });
    }

    async function getRows(table, columns, filters = [], order = "sort_order") {
        const client = db();
        if (!client) throw new Error("Supabase client is unavailable");

        let query = client.from(table).select(columns);
        filters.forEach(([method, column, value]) => {
            query = query[method](column, value);
        });
        if (order) query = query.order(order, { ascending: true });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async function openSchoolStage(stageSlug, addHistory = false) {
        const titles = {
            primary: "المرحلة الابتدائية",
            middle: "المرحلة المتوسطة",
            secondary: "المرحلة الإعدادية"
        };
        const title = titles[stageSlug] || "المرحلة الدراسية";
        loading(title);

        try {
            const stages = await getRows(
                "education_stages",
                "id,name,slug,description",
                [["eq", "slug", stageSlug]],
                null
            );
            const stage = stages[0];
            if (!stage) return message(title, "هذه المرحلة غير متاحة حاليًا.");

            const levels = await getRows(
                "education_levels",
                "id,name,slug,description,sort_order",
                [["eq", "stage_id", stage.id]]
            );

            renderList(title, levels.map((x) => ({ ...x, icon: "📚" })), "لا توجد صفوف مضافة حاليًا.", (level) => {
                pushHistory(() => openSchoolStage(stageSlug));
                if (stageSlug === "secondary") openTracks(level);
                else openLevelSubjects(level);
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openTracks(level) {
        loading(level.name);
        try {
            const tracks = await getRows(
                "education_tracks",
                "id,name,slug,description,sort_order",
                [["eq", "level_id", level.id]]
            );

            renderList(level.name, tracks.map((x) => ({ ...x, level_id: level.id, icon: "🧭" })), "لا توجد فروع مضافة لهذا الصف.", (track) => {
                pushHistory(() => openTracks(level));
                openTrackSubjects(track);
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openLevelSubjects(level) {
        loading(level.name);
        try {
            const links = await getRows(
                "education_level_subjects",
                "id,subject_id,sort_order",
                [["eq", "level_id", level.id]]
            );
            const subjects = await resolveSubjects("education_subjects", links);
            renderSubjects(level.name, subjects, {
                education_type: "school",
                level_id: level.id,
                track_id: null
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openTrackSubjects(track) {
        loading(track.name);
        try {
            const links = await getRows(
                "education_track_subjects",
                "id,subject_id,sort_order",
                [["eq", "track_id", track.id]]
            );
            const subjects = await resolveSubjects("education_subjects", links);
            renderSubjects(track.name, subjects, {
                education_type: "school",
                level_id: track.level_id || null,
                track_id: track.id
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function resolveSubjects(table, links) {
        if (!links.length) return [];
        const ids = links.map((x) => x.subject_id);
        const client = db();
        const { data, error } = await client
            .from(table)
            .select("id,name,slug,description,icon_url,sort_order")
            .in("id", ids);
        if (error) throw error;

        const orderMap = new Map(links.map((x) => [x.subject_id, x.sort_order]));
        return (data || [])
            .map((x) => ({ ...x, link_order: orderMap.get(x.id) ?? x.sort_order ?? 0 }))
            .sort((a, b) => a.link_order - b.link_order);
    }

    function loadTeachersEducation() {
        return window.StudentTeachersEducation ? Promise.resolve() : Promise.reject(new Error("وحدة المدرسين غير جاهزة"));
    }

    function renderSubjects(title, subjects, context) {
        renderList(title, subjects.map((x) => ({
            id: x.id,
            name: x.name,
            description: x.description,
            icon: "📖"
        })), "لا توجد مواد مضافة حاليًا.", async (subject) => {
            try {
                await loadTeachersEducation();
                if (
                    !window.StudentTeachersEducation ||
                    typeof window.StudentTeachersEducation.openSubject !== "function"
                ) {
                    throw new Error("واجهة المدرسين غير جاهزة");
                }

                await window.StudentTeachersEducation.openSubject({
                    ...context,
                    subject_id: subject.id,
                    title: subject.name,
                    client: db()
                });
            } catch (error) {
                errorMessage(error);
            }
        });
    }

    async function openUniversities() {
        loading("المرحلة الجامعية");
        try {
            const rows = await getRows("universities", "id,name,slug,description,city,sort_order");
            renderList("المرحلة الجامعية", rows.map((x) => ({
                ...x,
                icon: "🏛️",
                description: x.city || x.description
            })), "لا توجد جامعات مضافة حاليًا.", (university) => {
                pushHistory(openUniversities);
                openColleges(university);
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openColleges(university) {
        loading(university.name);
        try {
            const rows = await getRows(
                "university_colleges",
                "id,name,slug,description,sort_order",
                [["eq", "university_id", university.id]]
            );
            renderList(university.name, rows.map((x) => ({ ...x, icon: "🏫" })), "لا توجد كليات مضافة لهذه الجامعة.", (college) => {
                pushHistory(() => openColleges(university));
                openDepartments(college);
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openDepartments(college) {
        loading(college.name);
        try {
            const rows = await getRows(
                "university_departments",
                "id,name,slug,description,sort_order",
                [["eq", "college_id", college.id]]
            );
            renderList(college.name, rows.map((x) => ({ ...x, icon: "📂" })), "لا توجد أقسام مضافة لهذه الكلية.", (department) => {
                pushHistory(() => openDepartments(college));
                openUniversityLevels(department);
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openUniversityLevels(department) {
        loading(department.name);
        try {
            const rows = await getRows(
                "university_levels",
                "id,name,slug,description,sort_order",
                [["eq", "department_id", department.id]]
            );
            renderList(department.name, rows.map((x) => ({ ...x, icon: "🎓" })), "لا توجد مراحل مضافة لهذا القسم.", (level) => {
                pushHistory(() => openUniversityLevels(department));
                openUniversitySubjects(level);
            });
        } catch (error) {
            errorMessage(error);
        }
    }

    async function openUniversitySubjects(level) {
        loading(level.name);
        try {
            const links = await getRows(
                "university_level_subjects",
                "id,subject_id,sort_order",
                [["eq", "university_level_id", level.id]]
            );
            const subjects = await resolveSubjects("university_subjects", links);
            renderSubjects(level.name, subjects, {
                education_type: "university",
                university_level_id: level.id
            });
        } catch (error) {
            errorMessage(error);
        }
    }


    window.StudentEducationBack = function () {
        const previous = state.history.pop();
        if (typeof previous === "function") {
            previous();
            return true;
        }
        return false;
    };

    window.StudentEducationReset = function () {
        state.history = [];
    };

    window.StudentEducationOpenStage = function (stageSlug) {
        state.history = [];
        if (stageSlug === "university") return openUniversities();
        return openSchoolStage(stageSlug);
    };
})();


/* ===== MERGED MODULE: education-management.js ===== */
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


/* ===== MERGED MODULE: teachers-education.js ===== */
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
    let closeCallback = null;

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
            .ste-overlay{position:fixed;inset:0;background:#fff;z-index:100120;display:none;direction:rtl}
            .ste-overlay.show{display:block}
            .ste-panel{width:100%;height:100%;max-height:none;background:#fff;border-radius:0;overflow:hidden;box-shadow:none;direction:rtl;display:flex;flex-direction:column}
            .ste-head{display:flex;align-items:center;gap:10px;padding:15px 16px;border-bottom:1px solid #eef0f4;background:#fff;position:sticky;top:0;z-index:2}
            .ste-title{font-weight:800;font-size:17px;flex:1;color:#111827}
            .ste-close,.ste-back{border:1px solid #e5e7eb;background:#fff;border-radius:11px;width:39px;height:39px;cursor:pointer;font-size:18px}
            .ste-body{padding:14px;overflow:auto;max-height:none;flex:1;background:#f8fafc;-webkit-overflow-scrolling:touch}
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
            .ste-confirm{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100140;display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl}
            .ste-confirm-box{background:#fff;width:min(420px,100%);border-radius:18px;padding:18px;box-shadow:0 20px 55px rgba(0,0,0,.25)}
            .ste-content-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
            .ste-content-card{background:#fff;border:1px solid #e5e9ed;border-radius:15px;padding:12px;min-width:0}
            .ste-content-icon{width:42px;height:42px;border-radius:12px;background:#eef7ff;color:#0878c9;display:grid;place-items:center;font-size:19px}
            .ste-upload-card{background:#fff;border:1px solid #d9e8f5;border-radius:16px;padding:14px;margin-bottom:14px}
            .ste-file-input{width:100%;padding:10px;border:1px dashed #b7c6d4;border-radius:12px;background:#f9fbfd}
            @media(max-width:480px){.ste-content-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ste-content-card{padding:10px}}

        `;
        document.head.appendChild(style);
    }

    function ensureOverlay(title = "المدرسون") {
        injectStyles();
        if (window.StudentNavigation?.openPage) {
            const page=window.StudentNavigation.openPage({id:"teachers-education",title,html:`<div class="ste-body" id="ste-body"></div>`,reuse:true,onClose:function(){const cb=closeCallback;closeCallback=null;try{cb?.()}catch(_){}}});
            page.classList.add("ste-page");
            return page;
        }
        let page=document.getElementById("student-teachers-education-overlay");
        if(page)return page;
        page=document.createElement("section"); page.id="student-teachers-education-overlay"; page.className="student-internal-page";
        page.innerHTML=`<header class="student-internal-header"><button class="student-internal-back" type="button">→</button><div class="student-internal-title">${esc(title)}</div></header><div class="student-internal-body"><div class="ste-body" id="ste-body"></div></div>`;
        document.body.appendChild(page); page.querySelector(".student-internal-back").onclick=close; return page;
    }
    function openPanel(title, html, backAction) {
        const page=ensureOverlay(title);
        const t=page.querySelector(".student-internal-title"); if(t)t.textContent=title;
        let body=page.querySelector("#ste-body"); if(!body){const host=page.querySelector(".student-internal-body")||page;host.innerHTML=`<div class="ste-body" id="ste-body"></div>`;body=page.querySelector("#ste-body");}
        body.innerHTML=window.StudentSecurity?.sanitizeHTML?.(html)??html;
        page.querySelector("[data-ste-local-back]")?.remove();
        if(backAction){const b=document.createElement("button");b.type="button";b.dataset.steLocalBack="1";b.className="ste-btn secondary";b.textContent="رجوع";b.style.margin="12px 14px 0";b.onclick=backAction;body.parentElement?.insertBefore(b,body);}
        return page;
    }
    function close() {
        if(window.StudentNavigation?.closeById)return window.StudentNavigation.closeById("teachers-education");
        document.getElementById("student-teachers-education-overlay")?.remove();
        const cb=closeCallback;closeCallback=null;try{cb?.()}catch(_){} return true;
    }
    window.closeStudentTeachersEducation = close;

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

    function materialIcon(type){return ({pdf:"fa-solid fa-file-pdf",image:"fa-solid fa-image",video:"fa-solid fa-circle-play",book:"fa-solid fa-book",summary:"fa-solid fa-note-sticky",text:"fa-solid fa-align-right",link:"fa-solid fa-link"})[type]||"fa-solid fa-file";}
    function materialCard(m){return `<article class="ste-content-card" data-edu-material="${esc(m.id)}" style="cursor:pointer"><div class="ste-row"><span class="ste-content-icon"><i class="${materialIcon(m.material_type)}"></i></span><span class="ste-grow"><span class="ste-name">${esc(m.title)}</span><span class="ste-muted" style="display:block">${esc(m.material_type||"محتوى")}</span></span></div>${m.description?`<div class="ste-muted" style="margin-top:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(m.description)}</div>`:""}</article>`;}
    async function canAddMaterial(context,user){if(!user)return false;const d=db();const{data:p}=await d.from("profiles").select("role").eq("id",user.id).maybeSingle();if(String(p?.role||"").toLowerCase()==="admin")return true;const{data,error}=await d.rpc("student_can_add_education_material",{p_education_type:context.education_type,p_subject_id:context.subject_id,p_level_id:context.level_id||null,p_track_id:context.track_id||null,p_university_level_id:context.university_level_id||null});return !error&&data===true;}
    async function openSubject(context){
        currentContext=context;const d=db(context&&context.client);if(!d)return showError("المادة",new Error("Supabase غير جاهز"));loading(context.title||"المادة");
        try{const user=await sessionUser();let mq=d.from("education_materials").select("id,title,description,material_type,file_url,external_url,file_name,mime_type,file_size,created_by,created_at").eq("education_type",context.education_type).eq("subject_id",context.subject_id).eq("status","published").order("created_at",{ascending:false});
        if(context.education_type==="university")mq=mq.eq("university_level_id",context.university_level_id);else{mq=mq.eq("level_id",context.level_id);mq=context.track_id?mq.eq("track_id",context.track_id):mq.is("track_id",null);}
        const table=context.education_type==="university"?"teacher_university_assignments":"teacher_school_assignments";let tq=d.from(table).select("id,teacher_id,subject_id,level_id,track_id,university_level_id").eq("subject_id",context.subject_id);
        if(context.education_type==="university")tq=tq.eq("university_level_id",context.university_level_id);else{tq=tq.eq("level_id",context.level_id);tq=context.track_id?tq.eq("track_id",context.track_id):tq.is("track_id",null);}
        const[mr,tr,allow]=await Promise.all([mq,tq,canAddMaterial(context,user)]);if(mr.error)throw mr.error;if(tr.error)throw tr.error;const mats=mr.data||[],assign=tr.data||[],profiles=await profileMap(assign.map(x=>x.teacher_id));
        const upload=allow?`<section class="ste-upload-card"><div class="ste-name">إضافة محتوى للمادة</div><div class="ste-muted">ارفع صورة، PDF/كتاب، ملخص، فيديو، أو أضف شرحًا نصيًا/رابطًا.</div><label class="ste-label">العنوان<input id="edu-material-title" class="ste-input" maxlength="140"></label><label class="ste-label">النوع<select id="edu-material-type" class="ste-select"><option value="summary">ملخص</option><option value="book">كتاب</option><option value="pdf">PDF</option><option value="image">صورة</option><option value="video">فيديو</option><option value="text">شرح نصي</option><option value="link">رابط</option></select></label><label class="ste-label">الوصف / الشرح<textarea id="edu-material-description" class="ste-textarea"></textarea></label><label class="ste-label">ملف من الهاتف<input id="edu-material-file" class="ste-file-input" type="file" accept="image/*,video/*,application/pdf,.pdf"></label><label class="ste-label">رابط خارجي اختياري<input id="edu-material-link" class="ste-input" type="url"></label><div class="ste-actions"><button id="edu-material-save" class="ste-btn">نشر المحتوى</button></div><div id="edu-material-message" class="ste-muted" style="margin-top:8px"></div></section>`:"";
        const teachers=assign.length?`<div class="ste-name" style="margin:15px 0 8px">مدرسو المادة</div>${assign.map(a=>{const p=profiles.get(a.teacher_id)||{};return `<button type="button" class="ste-card ste-row" data-assignment="${esc(a.id)}" style="width:100%;text-align:right;cursor:pointer"><span class="ste-avatar">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="" loading="lazy" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:"👨‍🏫"}</span><span class="ste-grow"><span class="ste-name">${esc(p.full_name||p.username||"مدرس")}</span><span class="ste-muted" style="display:block">${esc(p.bio||"عرض محتوى المدرس")}</span></span><span>‹</span></button>`}).join("")}`:"";
        const page=openPanel(context.title||"المادة",`${upload}<div class="ste-name" style="margin-bottom:8px">محتوى المادة</div>${mats.length?`<div class="ste-content-grid">${mats.map(materialCard).join("")}</div>`:`<div class="ste-empty">لا يوجد محتوى منشور لهذه المادة بعد.</div>`}${teachers}`);
        page.querySelectorAll("[data-edu-material]").forEach(c=>{const m=mats.find(x=>String(x.id)===c.dataset.eduMaterial);c.onclick=()=>openMaterial(m,context)});page.querySelectorAll("[data-assignment]").forEach(b=>{const a=assign.find(x=>String(x.id)===b.dataset.assignment);b.onclick=()=>openTeacherMaterials(a,context,profiles)});const save=page.querySelector("#edu-material-save");if(save)save.onclick=()=>saveEducationMaterial(page,context,user);
        }catch(e){showError(context.title||"المادة",e);}
    }
    async function saveEducationMaterial(page,context,user){const d=db(),title=page.querySelector("#edu-material-title")?.value.trim(),type=page.querySelector("#edu-material-type")?.value||"summary",description=page.querySelector("#edu-material-description")?.value.trim()||"",link=page.querySelector("#edu-material-link")?.value.trim()||"",file=page.querySelector("#edu-material-file")?.files?.[0]||null,msg=page.querySelector("#edu-material-message"),btn=page.querySelector("#edu-material-save");if(!title){if(msg)msg.textContent="اكتب عنوان المحتوى.";return}if(!file&&!link&&type!=="text"&&!description){if(msg)msg.textContent="أضف ملفًا أو رابطًا أو شرحًا.";return}btn.disabled=true;if(msg)msg.textContent="جارٍ رفع المحتوى...";try{let fileUrl=null,fileName=null,mimeType=null,fileSize=null;if(file){if(file.size>60*1024*1024)throw new Error("حجم الملف الأقصى 60MB.");const safe=file.name.replace(/[^\w.\-]+/g,"_");const path=`${user.id}/${Date.now()}-${safe}`;const{error:u}=await d.storage.from("education-content").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type||undefined});if(u)throw u;fileUrl=d.storage.from("education-content").getPublicUrl(path).data?.publicUrl||null;fileName=file.name;mimeType=file.type||null;fileSize=file.size;}const{data:profile,error:profileError}=await d.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profileError)throw profileError;const isAdmin=String(profile?.role||"").toLowerCase()==="admin";const rpcName=isAdmin?"student_admin_add_education_material":"student_add_education_material";const{error}=await d.rpc(rpcName,{p_education_type:context.education_type,p_subject_id:context.subject_id,p_level_id:context.level_id||null,p_track_id:context.track_id||null,p_university_level_id:context.university_level_id||null,p_title:title,p_description:description,p_material_type:type,p_file_url:fileUrl,p_external_url:link||null,p_file_name:fileName,p_mime_type:mimeType,p_file_size:fileSize});if(error)throw error;if(msg)msg.textContent="تم نشر المحتوى.";await openSubject(context);}catch(e){console.error(e);if(msg)msg.textContent=e?.message||"تعذر نشر المحتوى.";}finally{btn.disabled=false}}

    async function downloadMaterial(m){const raw=m.file_url||m.external_url;const url=window.StudentSecurity?.safeURL?.(raw)||"";if(!url)return;try{const r=await fetch(url);if(!r.ok)throw 0;const blob=await r.blob(),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=m.file_name||m.title||"student-file";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}catch(_){window.open(url,"_blank","noopener")}}
    function openMaterial(m,context){if(!m)return;const url=window.StudentSecurity?.safeURL?.(m.file_url||m.external_url)||"",type=m.material_type||"";let viewer;if(url&&(type==="image"||String(m.mime_type||"").startsWith("image/")))viewer=`<img src="${esc(url)}" alt="${esc(m.title)}" style="display:block;max-width:100%;max-height:65vh;margin:auto;border-radius:12px">`;else if(url&&(type==="video"||String(m.mime_type||"").startsWith("video/")))viewer=`<video src="${esc(url)}" controls playsinline preload="metadata" style="width:100%;max-height:65vh;background:#000;border-radius:12px"></video>`;else if(url&&(type==="pdf"||type==="book"||type==="summary"||String(m.mime_type||"").includes("pdf")))viewer=`<iframe src="${esc(url)}" title="${esc(m.title)}" style="width:100%;height:68vh;border:0;border-radius:12px;background:#fff"></iframe>`;else if(url)viewer=`<div class="ste-card"><a href="${esc(url)}" target="_blank" rel="noopener">فتح الرابط</a></div>`;else viewer=`<div class="ste-card"><div class="ste-muted" style="white-space:pre-wrap">${esc(m.description||"لا يوجد ملف مرفق.")}</div></div>`;const page=window.StudentNavigation?.openPage({id:`education-material-${m.id}`,title:m.title,html:`<div style="padding:12px;direction:rtl">${viewer}${m.description?`<div class="ste-card" style="margin-top:12px"><div class="ste-muted" style="white-space:pre-wrap">${esc(m.description)}</div></div>`:""}${url?`<button type="button" class="ste-btn" data-download-material style="width:100%;margin-top:12px">تحميل الملف</button>`:""}</div>`,reuse:true});page?.querySelector("[data-download-material]")?.addEventListener("click",()=>downloadMaterial(m));}

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
        const overlay = openPanel("طلب اعتماد مدرس", `<div class="ste-status">إذا كان حسابك طالبًا وتريد أن تصبح مدرسًا، قدّم الطلب هنا. أدخل معلوماتك بدقة وسيحوّل الأدمن حسابك إلى مدرس بعد الاعتماد.</div>
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

    async function openAdmin(passedClient, options = {}) {
        closeCallback = typeof options.onClose === "function" ? options.onClose : null;
        try { history.pushState({ studentPage: "teachers-admin" }, "", location.href); } catch (_) {}
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
            const { error: approveError } = await db().rpc("student_admin_approve_teacher", { p_request_id: request.id });
            if (approveError) throw approveError;
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


/* ===== MERGED MODULE: admin.js ===== */
/* =========================================================
   Student - Admin Control Center
   لوحة تحكم المشرف

   لا تظهر إلا للحساب الذي لديه role = admin
========================================================= */

(function () {
    "use strict";

    if (window.__studentAdminLoaded) return;
    window.__studentAdminLoaded = true;

    let client = null;
    let features = [];

    /* =====================================================
       إنشاء اتصال Supabase مستقل
       باستخدام config.json
    ===================================================== */

    async function initSupabase() {
        try {
            if (
                window.supabaseClient &&
                window.supabaseClient.auth
            ) {
                client = window.supabaseClient;
                return true;
            }

            const response = await fetch("config.json", {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("تعذر تحميل config.json");
            }

            const config = await response.json();

            if (
                !config.supabase_url ||
                !config.supabase_key
            ) {
                throw new Error("إعدادات Supabase غير موجودة");
            }

            client = window.supabase.createClient(
                config.supabase_url,
                config.supabase_key,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

            return true;

        } catch (error) {
            console.error(
                "Student Admin Supabase Error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       التحقق من المشرف
    ===================================================== */

    async function checkAdmin() {

        if (!client) return false;

        try {

            const {
                data: sessionData,
                error: sessionError
            } = await client.auth.getSession();

            if (
                sessionError ||
                !sessionData ||
                !sessionData.session ||
                !sessionData.session.user
            ) {
                return false;
            }

            const user =
                sessionData.session.user;

            const {
                data,
                error
            } = await client
                .from("admin_users")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "admin")
                .maybeSingle();

            if (error) {
                console.error(
                    "Admin verification error:",
                    error
                );

                return false;
            }

            return !!data;

        } catch (error) {

            console.error(
                "Admin check error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       التنسيق
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
        .student-admin-open {
            position: fixed;
            right: 18px;
            bottom: 85px;
            width: 52px;
            height: 52px;
            border: none;
            border-radius: 50%;
            background: #0095f6;
            color: #fff;
            font-size: 19px;
            cursor: pointer;
            z-index: 99990;
            box-shadow: 0 6px 20px rgba(0,0,0,.18);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .student-admin-overlay {
            position: fixed;
            inset: 0;
            background: #fff;
            z-index: 99991;
            display: none;
            padding: 0;
            direction: rtl;
        }

        .student-admin-overlay.show { display: block; }

        .student-admin-panel {
            width: 100%;
            height: 100%;
            max-width: none;
            max-height: none;
            overflow: hidden;
            background: #fff;
            border-radius: 0;
            direction: rtl;
            box-shadow: none;
            display: flex;
            flex-direction: column;
        }

        .student-admin-header {
            position: sticky;
            top: 0;
            background: #fff;
            padding: 18px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 2;
        }

        .student-admin-title {
            font-size: 20px;
            font-weight: 700;
            color: #222;
        }

        .student-admin-subtitle {
            margin-top: 4px;
            font-size: 12px;
            color: #888;
        }

        .student-admin-close {
            width: 38px;
            height: 38px;
            border: none;
            border-radius: 50%;
            background: #f2f2f2;
            cursor: pointer;
            color: #555;
            font-size: 16px;
        }

        .student-admin-content {
            padding: 15px;
            overflow-y: auto;
            flex: 1;
            -webkit-overflow-scrolling: touch;
        }

        .student-admin-status {
            margin-bottom: 15px;
            padding: 12px 14px;
            border-radius: 12px;
            background: #f5f9ff;
            color: #555;
            font-size: 13px;
        }

        .student-feature-card {
            border: 1px solid #e8e8e8;
            border-radius: 15px;
            padding: 14px;
            margin-bottom: 10px;
            background: #fff;
        }

        .student-feature-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .student-feature-name {
            font-size: 15px;
            font-weight: 700;
            color: #222;
        }

        .student-feature-key {
            margin-top: 3px;
            font-size: 10px;
            color: #aaa;
            direction: ltr;
            text-align: right;
        }

        .student-feature-description {
            margin-top: 7px;
            font-size: 12px;
            color: #777;
            line-height: 1.6;
        }

        .student-feature-bottom {
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
        }

        .student-feature-release {
            flex: 1;
            min-width: 180px;
        }

        .student-feature-release label {
            display: block;
            font-size: 11px;
            color: #888;
            margin-bottom: 5px;
        }

        .student-feature-date {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 9px;
            padding: 8px;
            font-size: 12px;
            background: #fff;
        }

        .student-toggle {
            position: relative;
            width: 48px;
            height: 27px;
            flex-shrink: 0;
        }

        .student-toggle input {
            display: none;
        }

        .student-slider {
            position: absolute;
            inset: 0;
            background: #ccc;
            border-radius: 30px;
            cursor: pointer;
            transition: .2s;
        }

        .student-slider:before {
            content: "";
            position: absolute;
            width: 21px;
            height: 21px;
            left: 3px;
            top: 3px;
            background: #fff;
            border-radius: 50%;
            transition: .2s;
            box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }

        .student-toggle input:checked + .student-slider {
            background: #0095f6;
        }

        .student-toggle input:checked + .student-slider:before {
            transform: translateX(21px);
        }

        .student-save-button {
            width: 100%;
            border: none;
            background: #0095f6;
            color: #fff;
            padding: 12px;
            border-radius: 11px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 6px;
        }

        .student-save-button:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .student-feature-state {
            font-size: 11px;
            font-weight: 700;
        }

        .student-feature-state.on {
            color: #16803c;
        }

        .student-feature-state.off {
            color: #d93025;
        }

        .student-admin-tools {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }

        .student-admin-tool-button {
            border: 1px solid #dcecff;
            background: #f5f9ff;
            color: #0878c9;
            padding: 13px 12px;
            border-radius: 13px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .student-admin-tool-button:disabled {
            opacity: .6;
            cursor: wait;
        }

        .student-admin-empty {
            text-align: center;
            color: #888;
            padding: 30px 10px;
        }
    `;

    document.head.appendChild(style);


    /* =====================================================
       إنشاء زر المشرف
    ===================================================== */

    const adminButton =
        document.createElement("button");

    adminButton.className =
        "student-admin-open";

    adminButton.title =
        "لوحة تحكم المشرف";

    adminButton.innerHTML =
        '<i class="fa-solid fa-shield-halved"></i>';

    adminButton.style.display = "none";

    document.body.appendChild(adminButton);


    /* =====================================================
       إنشاء لوحة المشرف
    ===================================================== */

    const overlay =
        document.createElement("div");

    overlay.className =
        "student-admin-overlay student-fullscreen-page";

    overlay.innerHTML = `
        <div class="student-admin-panel">

            <div class="student-admin-header">

                <div>
                    <div class="student-admin-title">
                        لوحة تحكم Student
                    </div>

                    <div class="student-admin-subtitle">
                        إدارة جميع ميزات التطبيق
                    </div>
                </div>

                <button
                    class="student-admin-close"
                    id="student-admin-close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div class="student-admin-content">

                <div class="student-admin-tools">
                    <button
                        class="student-admin-tool-button"
                        id="student-open-education-management"
                    >
                        <i class="fa-solid fa-graduation-cap"></i>
                        إدارة التعليم
                    </button>

                    <button
                        class="student-admin-tool-button"
                        id="student-open-teachers-management"
                    >
                        <i class="fa-solid fa-chalkboard-user"></i>
                        طلبات المدرسين
                    </button>
                </div>

                <div
                    class="student-admin-status"
                    id="student-admin-status"
                >
                    جاري تحميل الميزات...
                </div>

                <div id="student-features-list"></div>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);


    /* =====================================================
       العناصر
    ===================================================== */

    const closeButton =
        document.getElementById(
            "student-admin-close"
        );

    const status =
        document.getElementById(
            "student-admin-status"
        );

    const list =
        document.getElementById(
            "student-features-list"
        );


    const educationButton =
        document.getElementById(
            "student-open-education-management"
        );

    const teachersButton =
        document.getElementById(
            "student-open-teachers-management"
        );


    /* =====================================================
       تحميل الميزات
    ===================================================== */

    async function loadFeatures() {

        if (!client) return;

        status.textContent =
            "جاري تحميل الميزات...";

        const {
            data,
            error
        } = await client
            .from("feature_flags")
            .select("*")
            .order("id", {
                ascending: true
            });

        if (error) {

            console.error(
                "Feature flags error:",
                error
            );

            status.textContent =
                "حدث خطأ أثناء تحميل الميزات.";

            return;
        }

        features = data || [];

        renderFeatures();

        status.textContent =
            `تم تحميل ${features.length} ميزة.`;
    }


    /* =====================================================
       عرض الميزات
    ===================================================== */

    function renderFeatures() {

        list.innerHTML = "";

        if (!features.length) {

            list.innerHTML = `
                <div class="student-admin-empty">
                    لا توجد ميزات.
                </div>
            `;

            return;
        }

        features.forEach(function (feature) {

            const card =
                document.createElement("div");

            card.className =
                "student-feature-card";

            let dateValue = "";

            if (feature.release_at) {

                const date =
                    new Date(feature.release_at);

                if (!isNaN(date.getTime())) {

                    dateValue =
                        date.toISOString()
                            .slice(0, 16);
                }
            }


            card.innerHTML = `

                <div class="student-feature-top">

                    <div>

                        <div class="student-feature-name">
                            ${escapeHTML(feature.name)}
                        </div>

                        <div class="student-feature-key">
                            ${escapeHTML(feature.feature_key)}
                        </div>

                    </div>

                    <div
                        class="student-feature-state ${
                            feature.enabled
                                ? "on"
                                : "off"
                        }"
                        data-state
                    >
                        ${
                            feature.enabled
                                ? "ON"
                                : "OFF"
                        }
                    </div>

                </div>

                <div class="student-feature-description">
                    ${
                        escapeHTML(
                            feature.description || ""
                        )
                    }
                </div>

                <div class="student-feature-bottom">

                    <label class="student-toggle">

                        <input
                            type="checkbox"
                            data-feature-toggle
                            data-id="${feature.id}"
                            ${feature.enabled ? "checked" : ""}
                        >

                        <span class="student-slider"></span>

                    </label>

                    <div class="student-feature-release">

                        <label>
                            موعد الإطلاق
                        </label>

                        <input
                            type="datetime-local"
                            class="student-feature-date"
                            data-release
                            data-id="${feature.id}"
                            value="${dateValue}"
                        >

                    </div>

                    <button
                        class="student-save-button"
                        data-save
                        data-id="${feature.id}"
                    >
                        حفظ
                    </button>

                </div>
            `;

            list.appendChild(card);
        });


        /* تحديث الحالة */

        document
            .querySelectorAll(
                "[data-feature-toggle]"
            )
            .forEach(function (toggle) {

                toggle.addEventListener(
                    "change",
                    function () {

                        const card =
                            toggle.closest(
                                ".student-feature-card"
                            );

                        const state =
                            card.querySelector(
                                "[data-state]"
                            );

                        if (toggle.checked) {

                            state.textContent =
                                "ON";

                            state.classList
                                .remove("off");

                            state.classList
                                .add("on");

                        } else {

                            state.textContent =
                                "OFF";

                            state.classList
                                .remove("on");

                            state.classList
                                .add("off");
                        }
                    }
                );
            });


        /* أزرار الحفظ */

        document
            .querySelectorAll(
                "[data-save]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    async function () {

                        await saveFeature(
                            button.dataset.id,
                            button
                        );
                    }
                );
            });
    }


    /* =====================================================
       حفظ الميزة
    ===================================================== */

    async function saveFeature(
        id,
        button
    ) {

        const card =
            button.closest(
                ".student-feature-card"
            );

        const toggle =
            card.querySelector(
                "[data-feature-toggle]"
            );

        const releaseInput =
            card.querySelector(
                "[data-release]"
            );

        const enabled =
            toggle.checked;

        let release_at = null;

        if (releaseInput.value) {

            const date =
                new Date(
                    releaseInput.value
                );

            if (!isNaN(date.getTime())) {
                release_at =
                    date.toISOString();
            }
        }

        button.disabled = true;
        button.textContent =
            "جارٍ الحفظ...";

        try {

            const {
                error
            } = await client
                .from("feature_flags")
                .update({
                    enabled: enabled,
                    release_at: release_at,
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {
                throw error;
            }

            button.textContent =
                "تم الحفظ ✓";

            setTimeout(function () {
                button.textContent =
                    "حفظ";
                button.disabled = false;
            }, 1200);

        } catch (error) {

            console.error(
                "Save feature error:",
                error
            );

            button.textContent =
                "فشل الحفظ";

            setTimeout(function () {
                button.textContent =
                    "حفظ";
                button.disabled = false;
            }, 1500);
        }
    }


    /* =====================================================
       أدوات
    ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       إدارة التعليم
    ===================================================== */

    function loadEducationManagement() {
        return new Promise(function (resolve, reject) {

            if (window.StudentEducationManagement) {
                resolve();
                return;
            }

            const existing = document.querySelector(
                'script[data-student-education-management="true"]'
            );

            if (existing) {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "education-admin.js?v=1.0.0";
            script.async = true;
            script.dataset.studentEducationManagement = "true";
            script.onload = resolve;
            script.onerror = function () {
                reject(new Error("تعذر تحميل education-management.js"));
            };

            document.body.appendChild(script);
        });
    }

    async function openEducationManagement() {
        if (!educationButton) return;

        educationButton.disabled = true;

        try {
            await loadEducationManagement();

            if (
                !window.StudentEducationManagement ||
                typeof window.StudentEducationManagement.open !== "function"
            ) {
                throw new Error("ملف إدارة التعليم غير صالح");
            }

            overlay.classList.remove("show");
            await window.StudentEducationManagement.open(client);
            if (window.StudentNavigation?.registerReturn) {
                window.StudentNavigation.registerReturn("education-management", function(){ overlay.classList.add("show"); });
            }

        } catch (error) {
            console.error("Education management error:", error);
            status.textContent = error.message || "تعذر فتح إدارة التعليم.";
        } finally {
            educationButton.disabled = false;
        }
    }

    if (educationButton) {
        educationButton.addEventListener(
            "click",
            openEducationManagement
        );
    }



    /* =====================================================
       إدارة طلبات المدرسين
    ===================================================== */

    function loadTeachersEducation() {
        return window.StudentTeachersEducation
            ? Promise.resolve()
            : Promise.reject(new Error("واجهة طلبات المدرسين غير جاهزة"));
    }

    async function openTeachersManagement() {
        if (!teachersButton) return;
        teachersButton.disabled = true;

        try {
            await loadTeachersEducation();

            if (
                !window.StudentTeachersEducation ||
                typeof window.StudentTeachersEducation.openAdmin !== "function"
            ) {
                throw new Error("ملف إدارة المدرسين غير صالح");
            }

            overlay.classList.remove("show");
            document.body.classList.remove("student-admin-page-open");

            await window.StudentTeachersEducation.openAdmin(client, {
                onClose: function () {
                    overlay.classList.add("show");
                    document.body.classList.add("student-admin-page-open");
                }
            });

        } catch (error) {
            console.error("Teachers management error:", error);
            status.textContent = error.message || "تعذر فتح طلبات المدرسين.";
        } finally {
            teachersButton.disabled = false;
        }
    }

    if (teachersButton) {
        teachersButton.addEventListener("click", openTeachersManagement);
    }

    /* =====================================================
       فتح اللوحة
    ===================================================== */

    async function openAdminPanel() {
        overlay.classList.add("show");
        document.body.classList.add("student-admin-page-open");
        try { history.pushState({ studentPage: "admin" }, "", location.href); } catch (_) {}
        await loadFeatures();
    }


    /* =====================================================
       إغلاق اللوحة
    ===================================================== */

    function closeAdminPanel() {
        overlay.classList.remove("show");
        document.body.classList.remove("student-admin-page-open");
        return true;
    }

    window.closeStudentAdminPanel = closeAdminPanel;


    adminButton.addEventListener(
        "click",
        openAdminPanel
    );


    closeButton.addEventListener(
        "click",
        closeAdminPanel
    );


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {
                closeAdminPanel();
            }
        }
    );


    /* =====================================================
       بدء النظام
    ===================================================== */

    async function start() {

        const ready =
            await initSupabase();

        if (!ready) {
            console.warn(
                "Student Admin: Supabase غير جاهز."
            );
            return;
        }

        const admin =
            await checkAdmin();

        if (!admin) {

            /* لا يظهر أي شيء للمستخدم العادي */

            adminButton.remove();
            overlay.remove();

            return;
        }

        /* المشرف فقط */

        adminButton.style.display =
            "flex";

        console.log(
            "Student Admin: تم التحقق من المشرف."
        );
    }


    /* انتظار تحميل الصفحة */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();
    }

})();

/* =========================================================
   Student Admin - Home Ads Management
========================================================= */
(function () {
    "use strict";

    let client = null;
    let currentAdmin = null;
    let editingId = null;
    let editingImagePath = null;
    let adsCache = null;
    let adsCacheAt = 0;
    let adsLoadingPromise = null;

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>'"]/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
        }[ch]));
    }

    function ensureStyles() {
        if (document.getElementById("student-ads-admin-style")) return;
        const style = document.createElement("style");
        style.id = "student-ads-admin-style";
        style.textContent = `
            .student-ads-admin-page{position:fixed;inset:0;z-index:10080;background:#fff;display:none;flex-direction:column;direction:rtl}
            .student-ads-admin-page.show{display:flex}
            .student-ads-admin-head{height:68px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;background:#fff}
            .student-ads-admin-head h2{margin:0;font-size:21px;color:#171717}
            .student-ads-admin-back,.student-ads-primary,.student-ads-secondary,.student-ads-danger{border:0;border-radius:12px;padding:11px 15px;font-size:15px;cursor:pointer}
            .student-ads-admin-back,.student-ads-secondary{background:#f0f2f5;color:#222}
            .student-ads-primary{background:#0095f6;color:#fff}
            .student-ads-danger{background:#fff0f0;color:#d93025}
            .student-ads-admin-body{flex:1;overflow:auto;padding:16px;max-width:900px;width:100%;margin:auto}
            .student-ads-form{display:grid;gap:12px;padding:15px;border:1px solid #e4e7eb;border-radius:16px;margin-bottom:18px;background:#fafbfc}
            .student-ads-form label{display:grid;gap:7px;font-weight:700;color:#333}
            .student-ads-form input{width:100%;padding:12px;border:1px solid #d9dde3;border-radius:11px;font-size:15px;background:#fff}
            .student-ads-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
            .student-ads-form-actions{display:flex;gap:9px;flex-wrap:wrap}
            .student-ads-list{display:grid;gap:12px}
            .student-ad-admin-card{display:grid;grid-template-columns:145px 1fr;gap:13px;padding:12px;border:1px solid #e1e4e8;border-radius:16px;background:#fff}
            .student-ad-admin-card img{width:145px;height:88px;object-fit:cover;border-radius:12px;background:#eee}
            .student-ad-admin-info{min-width:0}.student-ad-admin-title{font-size:17px;font-weight:800;margin-bottom:5px}.student-ad-admin-meta{font-size:13px;color:#6b7280;word-break:break-word}
            .student-ad-admin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
            .student-ads-empty{text-align:center;color:#777;padding:38px 10px}
            .student-ads-status{min-height:22px;color:#555;font-size:14px}.student-ads-status.error{color:#c62828}.student-ads-status.success{color:#12833b}
            @media(max-width:600px){.student-ads-form-row{grid-template-columns:1fr}.student-ad-admin-card{grid-template-columns:105px 1fr}.student-ad-admin-card img{width:105px;height:82px}}
        `;
        document.head.appendChild(style);
    }

    function buildPage() {
        if (document.getElementById("student-ads-admin-page")) return;
        const page = document.createElement("section");
        page.id = "student-ads-admin-page";
        page.className = "student-ads-admin-page";
        page.innerHTML = `
            <header class="student-ads-admin-head">
                <button type="button" class="student-ads-admin-back" id="student-ads-admin-back"><i class="fa-solid fa-arrow-right"></i></button>
                <h2>إدارة إعلانات الرئيسية</h2>
                <span></span>
            </header>
            <div class="student-ads-admin-body">
                <form class="student-ads-form" id="student-ads-form">
                    <label>صورة الإعلان
                        <input type="file" id="student-ad-image" accept="image/jpeg,image/png,image/webp">
                    </label>
                    <label>العنوان (اختياري)
                        <input type="text" id="student-ad-title" maxlength="100" placeholder="عنوان قصير">
                    </label>
                    <label>الرابط (اختياري)
                        <input type="url" id="student-ad-link" maxlength="500" placeholder="https://example.com">
                    </label>
                    <div class="student-ads-form-row">
                        <label>الترتيب
                            <input type="number" id="student-ad-order" value="0" min="0" max="9999">
                        </label>
                        <label>الحالة
                            <select id="student-ad-active" style="padding:12px;border:1px solid #d9dde3;border-radius:11px;background:#fff;font-size:15px">
                                <option value="true">ظاهر</option><option value="false">مخفي</option>
                            </select>
                        </label>
                    </div>
                    <div class="student-ads-form-row">
                        <label>يبدأ في (اختياري)<input type="datetime-local" id="student-ad-start"></label>
                        <label>ينتهي في (اختياري)<input type="datetime-local" id="student-ad-end"></label>
                    </div>
                    <div class="student-ads-form-actions">
                        <button type="submit" class="student-ads-primary" id="student-ad-save">إضافة الإعلان</button>
                        <button type="button" class="student-ads-secondary" id="student-ad-cancel" style="display:none">إلغاء التعديل</button>
                    </div>
                    <div class="student-ads-status" id="student-ads-status"></div>
                </form>
                <div class="student-ads-list" id="student-ads-list"></div>
            </div>`;
        document.body.appendChild(page);

        document.getElementById("student-ads-admin-back").addEventListener("click", closePage);
        document.getElementById("student-ad-cancel").addEventListener("click", resetForm);
        document.getElementById("student-ads-form").addEventListener("submit", saveAd);
    }

    function setStatus(text, type = "") {
        const el = document.getElementById("student-ads-status");
        if (!el) return;
        el.textContent = text || "";
        el.className = `student-ads-status ${type}`.trim();
    }

    function closePage() {
        document.getElementById("student-ads-admin-page")?.classList.remove("show");
        resetForm();
        document.querySelector(".student-admin-overlay")?.classList.add("show");
        return true;
    }

    async function openPage() {
        buildPage();
        document.querySelector(".student-admin-overlay")?.classList.remove("show");
        const page = document.getElementById("student-ads-admin-page");
        page.classList.add("show");
        try { history.pushState({ studentPage: "ads-admin" }, "", location.href); } catch (_) {}
        if (adsCache && Date.now() - adsCacheAt < 60000) renderAdsRows(adsCache);
        loadAds();
    }

    window.closeStudentAdsAdmin = closePage;

    function resetForm() {
        editingId = null;
        editingImagePath = null;
        document.getElementById("student-ads-form")?.reset();
        const order = document.getElementById("student-ad-order");
        if (order) order.value = "0";
        const save = document.getElementById("student-ad-save");
        if (save) save.textContent = "إضافة الإعلان";
        const cancel = document.getElementById("student-ad-cancel");
        if (cancel) cancel.style.display = "none";
        setStatus("");
    }

    function renderAdsRows(data) {
        const list = document.getElementById("student-ads-list");
        if (!list) return;
        if (!data?.length) { list.innerHTML = '<div class="student-ads-empty">لا توجد إعلانات بعد.</div>'; return; }
        list.innerHTML = data.map(ad => `
            <article class="student-ad-admin-card" data-id="${ad.id}">
                <img src="${escapeHtml(ad.image_url)}" alt="إعلان">
                <div class="student-ad-admin-info">
                    <div class="student-ad-admin-title">${escapeHtml(ad.title || "إعلان بدون عنوان")}</div>
                    <div class="student-ad-admin-meta">${ad.is_active ? "ظاهر" : "مخفي"} • ترتيب ${ad.sort_order || 0}</div>
                    ${ad.link_url ? `<div class="student-ad-admin-meta">${escapeHtml(ad.link_url)}</div>` : ""}
                    <div class="student-ad-admin-actions">
                        <button class="student-ads-secondary" data-action="edit" type="button">تعديل</button>
                        <button class="student-ads-danger" data-action="delete" type="button">حذف</button>
                    </div>
                </div>
            </article>`).join("");
        list.querySelectorAll("[data-action=edit]").forEach((btn, i) => btn.addEventListener("click", () => editAd(data[i])));
        list.querySelectorAll("[data-action=delete]").forEach((btn, i) => btn.addEventListener("click", () => deleteAd(data[i])));
    }

    async function loadAds(force = false) {
        const list = document.getElementById("student-ads-list");
        if (!list || !client) return;
        if (!force && adsCache && Date.now() - adsCacheAt < 60000) {
            renderAdsRows(adsCache);
            return;
        }
        if (adsLoadingPromise) return adsLoadingPromise;
        if (!adsCache) list.innerHTML = '<div class="student-ads-empty">جاري التحميل...</div>';
        adsLoadingPromise = (async function () {
            const { data, error } = await client.from("home_ads").select("*")
                .order("sort_order", {ascending:true})
                .order("created_at", {ascending:false});
            if (error) {
                if (!adsCache) list.innerHTML = `<div class="student-ads-empty">${escapeHtml(error.message)}</div>`;
                return;
            }
            adsCache = data || [];
            adsCacheAt = Date.now();
            renderAdsRows(adsCache);
        })().finally(() => { adsLoadingPromise = null; });
        return adsLoadingPromise;
    }

    function localDateValue(value) {
        if (!value) return "";
        const d = new Date(value);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0,16);
    }

    function editAd(ad) {
        editingId = ad.id;
        editingImagePath = ad.image_path || null;
        document.getElementById("student-ad-title").value = ad.title || "";
        document.getElementById("student-ad-link").value = ad.link_url || "";
        document.getElementById("student-ad-order").value = ad.sort_order || 0;
        document.getElementById("student-ad-active").value = String(Boolean(ad.is_active));
        document.getElementById("student-ad-start").value = localDateValue(ad.starts_at);
        document.getElementById("student-ad-end").value = localDateValue(ad.ends_at);
        document.getElementById("student-ad-save").textContent = "حفظ التعديل";
        document.getElementById("student-ad-cancel").style.display = "inline-block";
        window.scrollTo({top:0,behavior:"smooth"});
    }

    async function uploadImage(file) {
        if (!file) return null;
        if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة يجب ألا يتجاوز 5MB.");
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${currentAdmin.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await client.storage.from("home-ads").upload(path, file, {cacheControl:"3600", upsert:false});
        if (error) throw error;
        const { data } = client.storage.from("home-ads").getPublicUrl(path);
        return { path, url: data.publicUrl };
    }

    async function saveAd(event) {
        event.preventDefault();
        const saveButton = document.getElementById("student-ad-save");
        saveButton.disabled = true;
        setStatus("جاري الحفظ...");
        try {
            const file = document.getElementById("student-ad-image").files[0];
            if (!editingId && !file) throw new Error("اختر صورة الإعلان.");
            const uploaded = file ? await uploadImage(file) : null;
            const payload = {
                title: document.getElementById("student-ad-title").value.trim() || null,
                link_url: document.getElementById("student-ad-link").value.trim() || null,
                sort_order: Number(document.getElementById("student-ad-order").value || 0),
                is_active: document.getElementById("student-ad-active").value === "true",
                starts_at: document.getElementById("student-ad-start").value ? new Date(document.getElementById("student-ad-start").value).toISOString() : null,
                ends_at: document.getElementById("student-ad-end").value ? new Date(document.getElementById("student-ad-end").value).toISOString() : null,
                updated_at: new Date().toISOString()
            };
            if (uploaded) {
                payload.image_path = uploaded.path;
                payload.image_url = uploaded.url;
            }
            let result;
            if (editingId) result = await client.from("home_ads").update(payload).eq("id", editingId);
            else result = await client.from("home_ads").insert({...payload, created_by: currentAdmin.id});
            if (result.error) {
                if (uploaded) await client.storage.from("home-ads").remove([uploaded.path]);
                throw result.error;
            }
            if (uploaded && editingImagePath) await client.storage.from("home-ads").remove([editingImagePath]);
            setStatus("تم الحفظ بنجاح.", "success");
            resetForm();
            await loadAds(true);
            window.StudentHomeAds?.reload?.();
        } catch (error) {
            setStatus(error.message || "تعذر حفظ الإعلان.", "error");
        } finally {
            saveButton.disabled = false;
        }
    }

    async function deleteAd(ad) {
        const card = document.querySelector(`.student-ad-admin-card[data-id="${ad.id}"]`);
        const button = card?.querySelector('[data-action="delete"]');
        if (button && button.dataset.confirmDelete !== "1") {
            button.dataset.confirmDelete = "1";
            button.textContent = "اضغط مرة ثانية للتأكيد";
            setTimeout(() => {
                if (button.isConnected) {
                    button.dataset.confirmDelete = "0";
                    button.textContent = "حذف";
                }
            }, 5000);
            return;
        }
        if (button) button.disabled = true;
        const { error } = await client.from("home_ads").delete().eq("id", ad.id);
        if (error) {
            setStatus(error.message, "error");
            return;
        }
        if (ad.image_path) await client.storage.from("home-ads").remove([ad.image_path]);
        await loadAds(true);
        window.StudentHomeAds?.reload?.();
    }

    async function initialize(attempt = 0) {
        client = typeof supabaseClient !== "undefined" ? supabaseClient : null;
        if (!client) {
            if (attempt < 40) setTimeout(() => initialize(attempt + 1), 250);
            return;
        }
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;
        const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (String(data?.role || "").toLowerCase() !== "admin") return;
        currentAdmin = user;
        ensureStyles();
        buildPage();
        const tools = document.querySelector(".student-admin-tools");
        if (tools && !document.getElementById("student-open-ads-management")) {
            const button = document.createElement("button");
            button.type = "button";
            button.id = "student-open-ads-management";
            button.className = "student-admin-tool-button";
            button.innerHTML = '<i class="fa-solid fa-images"></i> إدارة الإعلانات';
            button.addEventListener("click", openPage);
            tools.appendChild(button);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize());
    else initialize();
})();
