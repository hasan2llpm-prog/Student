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
        if (typeof showFloatingPanel === "function") {
            showFloatingPanel(title, body);
            return true;
        }
        return false;
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

            renderList(level.name, tracks.map((x) => ({ ...x, icon: "🧭" })), "لا توجد فروع مضافة لهذا الصف.", (track) => {
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
                level_id: level.id,
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
        return new Promise(function (resolve, reject) {
            if (window.StudentTeachersEducation) return resolve();

            const existing = document.querySelector(
                'script[data-student-teachers-education="true"]'
            );

            if (existing) {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "teachers-education.js";
            script.async = true;
            script.dataset.studentTeachersEducation = "true";
            script.onload = resolve;
            script.onerror = function () {
                reject(new Error("تعذر تحميل teachers-education.js"));
            };
            document.body.appendChild(script);
        });
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

    window.StudentEducationOpenStage = function (stageSlug) {
        state.history = [];
        if (stageSlug === "university") return openUniversities();
        return openSchoolStage(stageSlug);
    };
})();
