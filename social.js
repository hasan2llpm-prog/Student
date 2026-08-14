(function(){
"use strict";

/* =========================================================
   Student - Internal Profile + Suggestions
========================================================= */

const PROFILE_VERSION = 2;

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function safeUrl(value, allowData = false) {
    if (window.StudentSecurity?.safeURL) return window.StudentSecurity.safeURL(value, { allowData });
    try {
        const u = new URL(String(value || ""), window.location.origin);
        return ["http:", "https:", "blob:"].includes(u.protocol) ? u.href : "";
    } catch (_) { return ""; }
}

function safeSearch(value) {
    if (window.StudentSecurity?.sanitizeSearchTerm) return window.StudentSecurity.sanitizeSearchTerm(value);
    return String(value || "").replace(/[,%()]/g, " ").trim().slice(0, 80);
}

function ensureCosmeticStyles() {
    if (document.getElementById("student-profile-cosmetics-style")) return;
    const style = document.createElement("style");
    style.id = "student-profile-cosmetics-style";
    style.textContent = `
        .student-avatar-frame{position:relative;display:inline-grid;place-items:center;flex:0 0 auto}
        .student-avatar-frame:after{content:"";position:absolute;inset:-6px;background-image:var(--student-profile-frame);background-size:100% 100%;background-position:center;background-repeat:no-repeat;pointer-events:none;z-index:2}
        .student-custom-badge{display:inline-grid;place-items:center;min-width:15px;height:15px;padding:0 2px;border-radius:999px;color:#fff;font-size:10px;font-weight:900;line-height:1;margin-inline-start:3px;vertical-align:-1px;box-sizing:border-box}
    `;
    document.head.appendChild(style);
}
ensureCosmeticStyles();

function verificationBadge(profile, size = 15) {
    if (!profile) return "";
    let html = "";
    if (profile.is_verified === true) {
        const colorName = String(profile.verification_color || "").toLowerCase();
        const color = colorName === "orange" ? "#ff8a00" : colorName === "red" ? "#e53935" : "#0095f6";
        const label = colorName === "orange" ? "حساب أدمن موثّق" : colorName === "red" ? "حساب أستاذ موثّق" : "حساب موثّق";
        const px = Math.max(12, Number(size) || 15);
        html += `<span class="student-verification-badge" title="${esc(label)}" aria-label="${esc(label)}" style="--verification-color:${color};--verification-size:${px}px;display:inline-flex;width:var(--verification-size);height:var(--verification-size);margin-inline-start:4px;vertical-align:-2px;position:relative;align-items:center;justify-content:center;flex:0 0 auto"><span aria-hidden="true" style="position:absolute;inset:1px;background:var(--verification-color);clip-path:polygon(50% 0%,61% 8%,74% 5%,82% 18%,95% 26%,92% 40%,100% 50%,92% 61%,95% 74%,82% 82%,74% 95%,61% 92%,50% 100%,39% 92%,26% 95%,18% 82%,5% 74%,8% 61%,0% 50%,8% 40%,5% 26%,18% 18%,26% 5%,39% 8%)"></span><i class="fa-solid fa-check" aria-hidden="true" style="position:relative;z-index:1;color:#fff;font-size:calc(var(--verification-size) * .55);line-height:1"></i></span>`;
    }
    const icon = String(profile.custom_badge_icon || "").trim().slice(0, 8);
    if (icon) {
        const color = /^#[0-9a-f]{6}$/i.test(String(profile.custom_badge_color || "")) ? profile.custom_badge_color : "#7c3aed";
        const label = String(profile.custom_badge_label || "علامة مميزة").slice(0, 60);
        html += `<span class="student-custom-badge" title="${esc(label)}" aria-label="${esc(label)}" style="background:${esc(color)}">${esc(icon)}</span>`;
    }
    return html;
}

function profileFrameWrap(profile, innerHtml) {
    const url = safeUrl(profile?.profile_frame_url || "", false);
    if (!url) return innerHtml;
    return `<span class="student-avatar-frame" style="--student-profile-frame:url('${esc(url)}')">${innerHtml}</span>`;
}

window.studentVerificationBadge = verificationBadge;
window.studentProfileFrameWrap = profileFrameWrap;

function db() {
    return typeof supabaseClient !== "undefined" ? supabaseClient : null;
}

async function sessionUser() {
    if (typeof currentUser !== "undefined" && currentUser) return currentUser;
    const client = db();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user || null;
}

function injectStyles() {
    if (document.getElementById("student-profile-v2-style")) return;

    const style = document.createElement("style");
    style.id = "student-profile-v2-style";
    style.textContent = `
        .sp2-internal-page{
            position:fixed !important;
            inset:0 !important;
            width:100% !important;
            height:100% !important;
            z-index:2147482200 !important;
            background:#f7f9fb !important;
            display:flex !important;
            flex-direction:column !important;
            overflow:hidden !important;
        }
        .sp2-internal-page[hidden]{
            display:none !important;
        }
        .sp2-internal-page .student-internal-header{
            flex:0 0 auto !important;
            background:#fff !important;
            border-bottom:1px solid #e5e9ed !important;
        }
        .sp2-internal-page .student-internal-body{
            flex:1 1 auto !important;
            min-height:0 !important;
            overflow-y:auto !important;
            background:#f7f9fb !important;
            -webkit-overflow-scrolling:touch;
        }
        .sp2-wrap{
            width:min(860px,100%);
            margin:0 auto;
            padding:14px 14px 90px;
            direction:rtl;
            color:#172033;
        }
        .sp2-card{
            background:#fff;
            border:1px solid #e6ebf0;
            border-radius:18px;
            padding:16px;
            margin-bottom:12px;
        }
        .sp2-head{
            display:grid;
            grid-template-columns:88px 1fr;
            gap:14px;
            align-items:center;
        }
        .sp2-avatar{
            width:88px;height:88px;border-radius:50%;object-fit:cover;
            background:#eef3f7;display:grid;place-items:center;
            color:#0095f6;font-size:34px;
        }
        .sp2-name{font-size:21px;font-weight:900;display:flex;align-items:center;flex-wrap:wrap}
        .sp2-user{color:#77818c;font-size:13px;margin-top:4px;direction:ltr;text-align:right}
        .sp2-role{
            display:inline-flex;margin-top:8px;padding:5px 9px;border-radius:9px;
            background:#eef7ff;color:#0878c9;font-size:12px;font-weight:800;
        }
        .sp2-stats{
            display:grid;grid-template-columns:repeat(3,1fr);
            border-top:1px solid #edf0f3;margin-top:15px;padding-top:14px;
        }
        .sp2-stat{text-align:center}
        .sp2-stat strong{display:block;font-size:18px}
        .sp2-stat span{display:block;color:#7c8792;font-size:11px;margin-top:2px}
        .sp2-actions{display:flex;gap:9px;margin-top:14px}
        .sp2-btn{
            flex:1;border:0;border-radius:12px;padding:11px 12px;
            font:inherit;font-weight:800;cursor:pointer;background:#0095f6;color:#fff;
        }
        .sp2-btn.secondary{background:#eef2f5;color:#263442}
        .sp2-btn.following{background:#eef2f5;color:#263442}
        .sp2-title{font-size:15px;font-weight:900;margin-bottom:11px}
        .sp2-bio{line-height:1.8;color:#44515f;white-space:pre-wrap}
        .sp2-info{
            display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;
        }
        .sp2-info-item{
            min-width:0;border:1px solid #edf0f3;background:#fafbfc;
            border-radius:13px;padding:11px;
        }
        .sp2-info-item small{display:block;color:#8a949e;font-size:10px;margin-bottom:4px}
        .sp2-info-item strong{font-size:13px;overflow-wrap:anywhere}
        .sp2-note{
            background:#fff8df;border:1px solid #f3df91;color:#725b00;
            border-radius:14px;padding:13px 14px;line-height:1.7;margin-bottom:12px;
        }
        .sp2-form{display:grid;gap:11px}
        .sp2-field label{display:block;font-size:12px;font-weight:800;margin-bottom:6px}
        .sp2-field input,.sp2-field textarea,.sp2-field select{
            width:100%;box-sizing:border-box;border:1px solid #dce2e8;background:#fff;
            border-radius:12px;padding:11px 12px;font:inherit;outline:0;
        }
        .sp2-field textarea{min-height:82px;resize:vertical}
        .sp2-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .sp2-save{border:0;border-radius:13px;background:#0095f6;color:#fff;padding:13px;font:inherit;font-weight:900}
        .sp2-message{min-height:22px;text-align:center;font-size:12px}
        .sp2-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .sp2-suggestion{
            background:#fff;border:1px solid #e6ebf0;border-radius:16px;padding:12px;min-width:0;
        }
        .sp2-suggestion-top{display:flex;gap:9px;align-items:center;cursor:pointer}
        .sp2-suggestion-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#eef3f7;display:grid;place-items:center}
        .sp2-suggestion-name{font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sp2-suggestion-user{font-size:11px;color:#89939d;direction:ltr;text-align:right}
        .sp2-reasons{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
        .sp2-reason{font-size:10px;background:#eef7ff;color:#0878c9;border-radius:8px;padding:4px 6px}
        .sp2-empty{text-align:center;color:#7b8590;padding:55px 15px}
        @media(max-width:520px){
            .sp2-wrap{padding:10px 10px 85px}
            .sp2-head{grid-template-columns:74px 1fr}
            .sp2-avatar{width:74px;height:74px}
            .sp2-info,.sp2-grid{grid-template-columns:1fr 1fr}
            .sp2-suggestions{grid-template-columns:1fr}
        }
    `;
    document.head.appendChild(style);
}

function roleLabel(role) {
    const value = String(role || "student").toLowerCase();
    if (value === "admin") return "أدمن";
    if (value === "teacher" || value === "instructor" || value === "professor") return "مدرس";
    return "طالب";
}

function avatarHTML(profile, cls = "sp2-avatar") {
    if (profile?.avatar_url) {
        return profileFrameWrap(profile, `<img class="${cls}" src="${esc(safeUrl(profile.avatar_url, true))}" alt="" loading="lazy" decoding="async">`);
    }
    return profileFrameWrap(profile, `<div class="${cls}"><i class="fa-solid fa-user"></i></div>`);
}

async function getStats(userId) {
    const client = db();
    if (!client || !userId) return { followers:0, following:0, posts:0 };

    const [statsRes, postsRes] = await Promise.all([
        client.rpc("get_profile_stats", { p_user_id:userId }),
        client.from("posts").select("id", { count:"exact", head:true }).eq("user_id", userId)
    ]);

    const row = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
    return {
        followers:Number(row?.followers_count || 0),
        following:Number(row?.following_count || 0),
        posts:Number(postsRes.count || 0)
    };
}

async function getOwnProfile(userId) {
    const client = db();
    if (!client) return null;

    const fields = [
        "id","full_name","username","email","bio","avatar_url","account_status","role",
        "is_verified","verification_color","verified_at","custom_badge_icon","custom_badge_label","custom_badge_color","profile_frame_url",
        "school_name","education_stage","grade_name","favorite_subject",
        "teaching_subject","city","hobbies","profile_version"
    ].join(",");

    const { data, error } = await client.from("profiles").select(fields).eq("id", userId).maybeSingle();
    if (error) {
        console.error("Own profile:", error);
        return null;
    }
    if (typeof currentProfile !== "undefined") currentProfile = data;
    return data;
}

async function getPublicProfile(userId) {
    const client = db();
    if (!client) return null;

    try {
        const { data, error } = await client.rpc("student_get_public_profile", { p_user_id:userId });
        if (!error && data) return Array.isArray(data) ? data[0] : data;
    } catch (_) {}

    const safe = [
        "id","full_name","username","bio","avatar_url","account_status","role",
        "is_verified","verification_color","custom_badge_icon","custom_badge_label","custom_badge_color","profile_frame_url","school_name","education_stage",
        "grade_name","favorite_subject","teaching_subject","city","hobbies"
    ].join(",");

    const { data, error } = await client.from("profiles").select(safe).eq("id", userId).maybeSingle();
    if (error) return null;
    return data;
}

async function isFollowing(userId) {
    const me = await sessionUser();
    const client = db();
    if (!me || !client || String(me.id) === String(userId)) return false;

    const { data } = await client.from("follows")
        .select("follower_id")
        .eq("follower_id", me.id)
        .eq("following_id", userId)
        .maybeSingle();

    return !!data;
}

async function toggleFollow(userId, button) {
    const me = await sessionUser();
    const client = db();
    if (!me || !client || String(me.id) === String(userId)) return;

    button && (button.disabled = true);
    try {
        const following = await isFollowing(userId);
        if (following) {
            const { error } = await client.from("follows")
                .delete()
                .eq("follower_id", me.id)
                .eq("following_id", userId);
            if (error) throw error;
            if (button) {
                button.textContent = "متابعة";
                button.classList.remove("following");
            }
        } else {
            const { error } = await client.from("follows")
                .insert({ follower_id:me.id, following_id:userId });
            if (error && String(error.code) !== "23505") throw error;
            if (button) {
                button.textContent = "متابَع";
                button.classList.add("following");
            }
        }
    } catch (error) {
        console.error("Follow:", error);
    } finally {
        if (button) button.disabled = false;
    }
}

function infoItem(label, value) {
    if (!value) return "";
    return `<div class="sp2-info-item"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
}

function openInternal(title, id) {
    injectStyles();

    let body = null;

    if (window.StudentNavigation?.openPage) {
        const page = window.StudentNavigation.openPage({ id, title, html:"" });

        if (page) {
            page.classList.add("sp2-internal-page");
            page.style.position = "fixed";
            page.style.inset = "0";
            page.style.zIndex = "2147482200";
            page.style.background = "#f7f9fb";
            page.style.display = "flex";
            page.style.flexDirection = "column";
            page.style.overflow = "hidden";

            const header = page.querySelector(".student-internal-header");
            if (header) {
                header.style.flex = "0 0 auto";
                header.style.background = "#ffffff";
                header.style.borderBottom = "1px solid #e5e9ed";
                header.style.zIndex = "2";
            }

            body = page.querySelector(".student-internal-body") || null;
            if (body) {
                body.style.flex = "1 1 auto";
                body.style.minHeight = "0";
                body.style.overflowY = "auto";
                body.style.background = "#f7f9fb";
                body.style.webkitOverflowScrolling = "touch";
            }
        }
    } else {
        const old = document.getElementById("student-profile-fallback");
        old?.remove();

        const section = document.createElement("section");
        section.id = "student-profile-fallback";
        section.style.cssText = "position:fixed;inset:0;z-index:2147482200;background:#f7f9fb;overflow:auto";
        section.innerHTML = `<div style="height:60px;background:#fff;border-bottom:1px solid #e5e9ed;display:flex;align-items:center;padding:0 12px;gap:10px"><button data-sp2-fallback-back style="width:40px;height:40px;border:0;border-radius:50%;background:#eef2f5">←</button><strong>${esc(title)}</strong></div><div class="student-internal-body"></div>`;
        document.body.appendChild(section);
        section.querySelector("[data-sp2-fallback-back]").onclick = () => section.remove();
        body = section.querySelector(".student-internal-body");
    }

    /*
       مهم للموبايل/WebView:
       لا نغلق القائمة قبل إنشاء الصفحة حتى لا تمر نفس اللمسة
       إلى زر الرئيسية الموجود خلف القائمة.
    */
    requestAnimationFrame(() => {
        try { window.closeStudentMenu?.(); } catch (_) {}
    });

    return body;
}

async function renderProfile(userId) {
    const me = await sessionUser();
    if (!me) return;

    const targetId = userId || me.id;
    const own = String(targetId) === String(me.id);
    const body = openInternal("الملف الشخصي", `profile-${targetId}`);
    if (!body) return;
    body.innerHTML = `<div class="sp2-wrap"><div class="sp2-card" style="text-align:center">جارٍ تحميل الملف...</div></div>`;

    const [profile, stats, following] = await Promise.all([
        own ? getOwnProfile(targetId) : getPublicProfile(targetId),
        getStats(targetId),
        own ? Promise.resolve(false) : isFollowing(targetId)
    ]);

    if (!profile) {
        body.innerHTML = `<div class="sp2-wrap"><div class="sp2-empty">تعذر تحميل الملف الشخصي.</div></div>`;
        return;
    }

    const oldNotice = own && Number(profile.profile_version || 1) < PROFILE_VERSION
        ? `<div class="sp2-note"><strong>ملفك الشخصي صار أكثر تفصيلاً.</strong><br>حدّث المدرسة والمرحلة أو الصف والمادة المفضلة والهوايات حتى تظهر لك اقتراحات طلاب أدق.</div>`
        : "";

    const role = roleLabel(profile.role);
    const academic = `
        ${infoItem("الصفة", role)}
        ${infoItem("المدرسة / المؤسسة", profile.school_name)}
        ${infoItem("المرحلة", profile.education_stage)}
        ${infoItem("الصف", profile.grade_name)}
        ${infoItem("المادة المفضلة", profile.favorite_subject)}
        ${infoItem("مادة التدريس", profile.teaching_subject)}
        ${infoItem("المدينة", profile.city)}
        ${infoItem("الهوايات", profile.hobbies)}
    `;

    body.innerHTML = `
        <div class="sp2-wrap">
            ${oldNotice}
            <section class="sp2-card">
                <div class="sp2-head">
                    ${avatarHTML(profile)}
                    <div>
                        <div class="sp2-name">${esc(profile.full_name || profile.username || "مستخدم")}${verificationBadge(profile,18)}</div>
                        <div class="sp2-user">@${esc(profile.username || "user")}</div>
                        <span class="sp2-role">${esc(role)}</span>
                    </div>
                </div>

                <div class="sp2-stats">
                    <div class="sp2-stat"><strong>${stats.posts}</strong><span>المنشورات</span></div>
                    <div class="sp2-stat"><strong>${stats.followers}</strong><span>المتابعون</span></div>
                    <div class="sp2-stat"><strong>${stats.following}</strong><span>يتابع</span></div>
                </div>

                <div class="sp2-actions">
                    ${own
                        ? `<button class="sp2-btn" type="button" data-sp2-edit>تعديل الملف</button>
                           ${String(profile.role || "student").toLowerCase() === "student" ? `<button class="sp2-btn secondary" type="button" data-sp2-apply-teacher>تقديم على مدرس</button>` : ""}`
                        : `<button class="sp2-btn ${following ? "following" : ""}" type="button" data-sp2-follow="${esc(targetId)}">${following ? "متابَع" : "متابعة"}</button>`
                    }
                </div>
            </section>

            ${profile.bio ? `<section class="sp2-card"><div class="sp2-title">نبذة</div><div class="sp2-bio">${esc(profile.bio)}</div></section>` : ""}

            <section class="sp2-card">
                <div class="sp2-title">المعلومات</div>
                <div class="sp2-info">${academic || `<div style="color:#8a949e">لم تُضف معلومات دراسية بعد.</div>`}</div>
            </section>
        </div>
    `;

    body.querySelector("[data-sp2-edit]")?.addEventListener("click", () => renderEdit(body, profile));
    body.querySelector("[data-sp2-apply-teacher]")?.addEventListener("click", async () => {
        try {
            if (!window.StudentTeachersEducation) throw new Error("وحدة المدرسين غير جاهزة.");
            await window.StudentTeachersEducation.openTeacherPortal(db());
        } catch (error) { console.error("Teacher application:", error); }
    });
    const followButton = body.querySelector("[data-sp2-follow]");
    followButton?.addEventListener("click", async () => {
        await toggleFollow(targetId, followButton);
        const freshStats = await getStats(targetId);
        const nodes = body.querySelectorAll(".sp2-stat strong");
        if (nodes[1]) nodes[1].textContent = freshStats.followers;
    });
}

function renderEdit(body, profile) {
    const teacher = ["teacher","instructor","professor"].includes(String(profile.role || "").toLowerCase());

    body.innerHTML = `
        <div class="sp2-wrap">
            <section class="sp2-card">
                <div class="sp2-title">تعديل الملف الشخصي</div>
                <form class="sp2-form" id="sp2-edit-form">
                    <div style="text-align:center">
                        <div id="sp2-avatar-preview">${avatarHTML(profile)}</div>
                        <label class="sp2-btn secondary" style="display:inline-block;margin-top:10px;cursor:pointer">
                            تغيير الصورة
                            <input id="sp2-avatar-input" type="file" accept="image/*" hidden>
                        </label>
                    </div>

                    <div class="sp2-grid">
                        <div class="sp2-field"><label>الاسم</label><input id="sp2-name" maxlength="70" value="${esc(profile.full_name || "")}" required></div>
                        <div class="sp2-field"><label>اسم المستخدم</label><input id="sp2-username" maxlength="30" value="${esc(profile.username || "")}" required></div>
                    </div>

                    <div class="sp2-field"><label>النبذة</label><textarea id="sp2-bio" maxlength="240">${esc(profile.bio || "")}</textarea></div>

                    <div class="sp2-grid">
                        <div class="sp2-field"><label>المدرسة / المؤسسة</label><input id="sp2-school" maxlength="100" value="${esc(profile.school_name || "")}" placeholder="مثال: مدرسة المثنى"></div>
                        <div class="sp2-field"><label>المدينة</label><input id="sp2-city" maxlength="70" value="${esc(profile.city || "")}"></div>
                    </div>

                    <div class="sp2-grid">
                        <div class="sp2-field"><label>${teacher ? "المرحلة التي تدرّسها" : "المرحلة الدراسية"}</label><input id="sp2-stage" maxlength="70" value="${esc(profile.education_stage || "")}" placeholder="ابتدائي، إعدادي، ثانوي، جامعة"></div>
                        <div class="sp2-field"><label>${teacher ? "الصفوف التي تدرّسها" : "الصف"}</label><input id="sp2-grade" maxlength="70" value="${esc(profile.grade_name || "")}"></div>
                    </div>

                    ${teacher
                        ? `<div class="sp2-field"><label>مادة التدريس</label><input id="sp2-teaching-subject" maxlength="80" value="${esc(profile.teaching_subject || "")}"></div>`
                        : `<div class="sp2-field"><label>المادة المفضلة</label><input id="sp2-favorite-subject" maxlength="80" value="${esc(profile.favorite_subject || "")}"></div>`
                    }

                    <div class="sp2-field"><label>الهوايات والاهتمامات</label><input id="sp2-hobbies" maxlength="180" value="${esc(profile.hobbies || "")}" placeholder="مثال: القراءة، البرمجة، كرة القدم"></div>

                    <button class="sp2-save" id="sp2-save" type="submit">حفظ التغييرات</button>
                    <div class="sp2-message" id="sp2-message"></div>
                </form>
            </section>
        </div>
    `;

    const fileInput = body.querySelector("#sp2-avatar-input");
    fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file || !file.type.startsWith("image/") || file.size > 5*1024*1024) return;
        const url = URL.createObjectURL(file);
        body.querySelector("#sp2-avatar-preview").innerHTML = `<img class="sp2-avatar" src="${url}" alt="">`;
    });

    body.querySelector("#sp2-edit-form")?.addEventListener("submit", event => saveProfile(event, body, profile));
}

async function saveProfile(event, body, oldProfile) {
    event.preventDefault();
    const client = db();
    const me = await sessionUser();
    if (!client || !me) return;

    const msg = body.querySelector("#sp2-message");
    const save = body.querySelector("#sp2-save");
    save.disabled = true;
    save.textContent = "جارٍ الحفظ...";

    try {
        let avatarUrl = oldProfile.avatar_url || null;
        const image = body.querySelector("#sp2-avatar-input")?.files?.[0];

        if (image) {
            if (!image.type.startsWith("image/") || image.size > 5*1024*1024) {
                throw new Error("الصورة يجب أن تكون أقل من 5MB.");
            }
            const ext = (image.name.split(".").pop() || "jpg").toLowerCase();
            const path = `${me.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await client.storage.from("avatars").upload(path, image, {
                cacheControl:"3600", upsert:false, contentType:image.type
            });
            if (uploadError) throw uploadError;
            avatarUrl = client.storage.from("avatars").getPublicUrl(path).data?.publicUrl || avatarUrl;
        }

        const name = body.querySelector("#sp2-name").value.trim();
        const username = body.querySelector("#sp2-username").value.trim().toLowerCase();
        const bio = body.querySelector("#sp2-bio").value.trim();

        const base = await client.rpc("update_profile", {
            p_full_name:name,
            p_username:username,
            p_bio:bio,
            p_avatar_url:avatarUrl
        });
        if (base.error) throw base.error;
        if (base.data === "username_taken") throw new Error("اسم المستخدم مستخدم بالفعل.");
        if (base.data === "invalid_username") throw new Error("اسم المستخدم غير صالح.");

        const extended = await client.rpc("student_update_extended_profile", {
            p_school_name:body.querySelector("#sp2-school").value.trim(),
            p_education_stage:body.querySelector("#sp2-stage").value.trim(),
            p_grade_name:body.querySelector("#sp2-grade").value.trim(),
            p_favorite_subject:body.querySelector("#sp2-favorite-subject")?.value.trim() || "",
            p_teaching_subject:body.querySelector("#sp2-teaching-subject")?.value.trim() || "",
            p_city:body.querySelector("#sp2-city").value.trim(),
            p_hobbies:body.querySelector("#sp2-hobbies").value.trim()
        });
        if (extended.error) throw extended.error;

        msg.style.color = "#16803c";
        msg.textContent = "تم حفظ الملف.";
        setTimeout(() => renderProfile(me.id), 450);
    } catch (error) {
        console.error("Profile save:", error);
        msg.style.color = "#c62828";
        msg.textContent = error?.message || "تعذر حفظ الملف.";
    } finally {
        save.disabled = false;
        save.textContent = "حفظ التغييرات";
    }
}

async function openSuggestions() {
    const me = await sessionUser();
    const client = db();
    if (!me || !client) return;

    const body = openInternal("اقتراحات المتابعة", "profile-suggestions");
    if (!body) return;
    body.innerHTML = `<div class="sp2-wrap"><div class="sp2-card" style="text-align:center">جارٍ البحث عن طلاب يشتركون معك باهتمامات ومعلومات دراسية...</div></div>`;

    let rows = [];
    const { data, error } = await client.rpc("student_get_profile_suggestions", { p_limit:30 });
    if (!error) rows = data || [];

    if (!rows.length) {
        body.innerHTML = `<div class="sp2-wrap"><div class="sp2-empty">لا توجد اقتراحات كافية حاليًا.<br>حدّث المدرسة والمرحلة والصف والمادة المفضلة والهوايات حتى تصبح الاقتراحات أدق.</div></div>`;
        return;
    }

    body.innerHTML = `
        <div class="sp2-wrap">
            <section class="sp2-card">
                <div class="sp2-title">طلاب قد تعرفهم</div>
                <div style="font-size:12px;color:#7c8792;line-height:1.7">الاقتراحات مبنية على المعلومات المشتركة في الملف الدراسي والهوايات، ولا تستخدم البريد الإلكتروني أو أي معلومات سرية.</div>
            </section>
            <div class="sp2-suggestions">
                ${rows.map(row => {
                    const reasons = Array.isArray(row.common_reasons) ? row.common_reasons : [];
                    return `<article class="sp2-suggestion">
                        <div class="sp2-suggestion-top" data-sp2-open-profile="${esc(row.id)}">
                            ${avatarHTML(row,"sp2-suggestion-avatar")}
                            <div style="min-width:0;flex:1">
                                <div class="sp2-suggestion-name">${esc(row.full_name || row.username || "طالب")}${verificationBadge(row,13)}</div>
                                <div class="sp2-suggestion-user">@${esc(row.username || "user")}</div>
                            </div>
                        </div>
                        <div class="sp2-reasons">${reasons.slice(0,4).map(x => `<span class="sp2-reason">${esc(x)}</span>`).join("")}</div>
                        <button type="button" class="sp2-btn ${row.is_following ? "following" : ""}" style="margin-top:10px;width:100%" data-sp2-suggest-follow="${esc(row.id)}">${row.is_following ? "متابَع" : "متابعة"}</button>
                    </article>`;
                }).join("")}
            </div>
        </div>
    `;

    body.querySelectorAll("[data-sp2-open-profile]").forEach(el => {
        el.addEventListener("click", () => renderProfile(el.dataset.sp2OpenProfile));
    });
    body.querySelectorAll("[data-sp2-suggest-follow]").forEach(button => {
        button.addEventListener("click", () => toggleFollow(button.dataset.sp2SuggestFollow, button));
    });
}

window.showProfilePanel = renderProfile;
window.StudentProfile = {
    open: renderProfile,
    edit: async function() {
        const me = await sessionUser();
        if (me) renderProfile(me.id);
    },
    refresh: async function() {
        const me = await sessionUser();
        return me ? getOwnProfile(me.id) : null;
    }
};
window.StudentSuggestions = { open:openSuggestions };

})();


/* ===== MERGED MODULE: stories.js ===== */
(function () {
    "use strict";

    let sb = null;
    let currentUser = null;

    let stories = [];
    let currentGroup = [];
    let currentIndex = 0;
    let currentStory = null;
    let editStory = null;
    let storyMode = "text";

    let storyTimer = null;
    let videoTimer = null;
    let storyPaused = false;
    let storyDurationMs = 5000;
    let storyElapsedMs = 0;
    let storyLastTick = 0;
    let storySwipeStartX = 0;
    let storySwipeStartY = 0;
    let storySwipeMoved = false;

    let editorObjectUrl = null;
    let editorImage = null;
    let editorFilter = "none";
    let editorBrightness = 100;
    let editorSaturation = 100;
    let editorTextFont = "system-ui";
    let editorTextAlign = "center";
    let editorTextSize = 42;
    let editorBackground = "#1877f2";

    const REACTIONS = ["❤️", "😂", "🔥", "👏"];

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    /* =========================================================
       HELPERS
    ========================================================= */

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function timeAgo(dateString) {
        const diff = Math.max(
            0,
            Date.now() - new Date(dateString).getTime()
        );

        const min = 60 * 1000;
        const hour = 60 * min;

        if (diff < min) return "الآن";
        if (diff < hour) {
            return `${Math.floor(diff / min)} د`;
        }

        if (diff < 24 * hour) {
            return `${Math.floor(diff / hour)} س`;
        }

        return new Date(dateString).toLocaleDateString(
            "ar-IQ",
            {
                day: "numeric",
                month: "short"
            }
        );
    }

    function toast(message, type = "success") {
        let box = $("#studentToastContainer");

        if (!box) {
            box = document.createElement("div");
            box.id = "studentToastContainer";

            box.style.cssText = `
                position:fixed;
                top:80px;
                left:50%;
                transform:translateX(-50%);
                z-index:300000;
                width:min(92%,420px);
                display:flex;
                flex-direction:column;
                gap:8px;
                pointer-events:none;
            `;

            document.body.appendChild(box);
        }

        const item = document.createElement("div");

        item.textContent = message;

        item.style.cssText = `
            background:${type === "error" ? "#dc2626" : "#16a34a"};
            color:#fff;
            padding:13px 16px;
            border-radius:14px;
            text-align:center;
            font-weight:600;
            direction:rtl;
            box-shadow:0 10px 30px rgba(0,0,0,.25);
            opacity:0;
            transform:translateY(-10px);
            transition:.2s ease;
        `;

        box.appendChild(item);

        requestAnimationFrame(() => {
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
        });

        setTimeout(() => {
            item.style.opacity = "0";
            item.style.transform = "translateY(-10px)";

            setTimeout(() => {
                item.remove();
            }, 220);
        }, 2500);
    }

    /* =========================================================
       SUPABASE
    ========================================================= */

    async function initSupabase() {
        if (window.studentSupabase) {
            sb = window.studentSupabase;
            return true;
        }

        if (window.supabaseClient) {
            sb = window.supabaseClient;
            return true;
        }

        if (
            !window.supabase ||
            !window.supabase.createClient
        ) {
            toast(
                "تعذر تحميل Supabase",
                "error"
            );

            return false;
        }

        try {
            const response = await fetch(
                "/config.json",
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "تعذر قراءة config.json"
                );
            }

            const config =
                await response.json();

            const url =
                config.supabase_url ||
                config.url ||
                config.SUPABASE_URL;

            const key =
                config.supabase_key ||
                config.anon_key ||
                config.SUPABASE_ANON_KEY;

            if (!url || !key) {
                throw new Error(
                    "بيانات Supabase ناقصة"
                );
            }

            sb =
                window.supabase.createClient(
                    url,
                    key
                );

            window.studentSupabase = sb;

            return true;

        } catch (error) {
            console.error(error);

            toast(
                error.message ||
                "تعذر الاتصال بـ Supabase",
                "error"
            );

            return false;
        }
    }

    async function loadUser() {
        if (!sb) return null;

        const {
            data,
            error
        } = await sb.auth.getUser();

        if (error) {
            currentUser = null;
            return null;
        }

        currentUser =
            data.user || null;

        return currentUser;
    }

    /* =========================================================
       PROFILES
    ========================================================= */

    async function getProfiles(ids) {
        ids = [
            ...new Set(
                (ids || []).filter(Boolean)
            )
        ];

        if (!ids.length) {
            return new Map();
        }

        const {
            data,
            error
        } = await sb
            .from("profiles")
            .select(
                "id,display_name,full_name,username,avatar_url,is_verified,verification_color,custom_badge_icon,custom_badge_label,custom_badge_color,profile_frame_url"
            )
            .in("id", ids);

        if (error) {
            console.error(error);
            return new Map();
        }

        (data || []).forEach(cacheStoryAvatar);

        return new Map(
            (data || []).map(
                row => [
                    row.id,
                    row
                ]
            )
        );
    }

    function getProfileName(
        profile,
        fallback = "مستخدم"
    ) {
        return (
            profile?.display_name?.trim() ||
            profile?.full_name?.trim() ||
            profile?.username?.trim() ||
            fallback
        );
    }

    function storyAvatarCacheKey(userId) {
        return `student_story_avatar_${userId || ""}`;
    }

    function cacheStoryAvatar(profile) {
        if (!profile?.id || !profile?.avatar_url) return;
        try {
            localStorage.setItem(
                storyAvatarCacheKey(profile.id),
                profile.avatar_url
            );
        } catch (_) {}
    }

    function getCachedStoryAvatar(userId) {
        if (!userId) return "";
        try {
            return localStorage.getItem(storyAvatarCacheKey(userId)) || "";
        } catch (_) {
            return "";
        }
    }

    function avatar(
        profile,
        fallback = "S"
    ) {
        if (profile?.avatar_url) {
            return window.studentProfileFrameWrap(profile, `
                <img
                    class="student-story-avatar"
                    src="${escapeHtml(profile.avatar_url)}"
                    alt=""
                >
            `);
        }

        return window.studentProfileFrameWrap(profile, `
            <div class="student-story-avatar student-story-avatar-fallback">
                ${escapeHtml(getProfileName(profile, fallback).charAt(0) || fallback)}
            </div>
        `);
    }

    /* =========================================================
       STYLES
    ========================================================= */

    function addStyles() {
        if ($("#studentStoriesStyles")) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "studentStoriesStyles";

        style.textContent = `

        .stories-container{
            display:flex!important;
            overflow-x:auto!important;
            gap:14px!important;
            padding:14px!important;
            scrollbar-width:none!important;
        }

        .stories-container::-webkit-scrollbar{
            display:none!important;
        }

        .stories-container .story{
            flex:0 0 auto!important;
            width:74px!important;
            text-align:center!important;
            cursor:pointer!important;
        }

        .stories-container .story-ring{
            width:68px!important;
            height:68px!important;
            padding:3px!important;
            border-radius:50%!important;
            background:#ed1c24!important;
        }

        .stories-container .story-ring.seen{
            background:
                linear-gradient(
                    135deg,
                    #999,
                    #777
                )!important;
        }

        .stories-container
        .story-ring.seen
        .student-story-preview{
            filter:saturate(.35);
            opacity:.85;
        }

        .stories-container .story-ring-inner{
            width:100%!important;
            height:100%!important;
            border-radius:50%!important;
            background:#fff!important;
            overflow:hidden!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
        }

        .stories-container .story-name{
            display:block!important;
            margin-top:6px!important;
            font-size:11px!important;
            white-space:nowrap!important;
            overflow:hidden!important;
            text-overflow:ellipsis!important;
        }

        .stories-add-new .story-ring{
            border:2px dashed #ed1c24!important;
            background:#fff!important;
            padding:0!important;
        }

        .stories-add-new i{
            color:#ed1c24!important;
            font-size:25px!important;
        }

        .student-story-preview{
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:50%;
        }

        .student-story-placeholder{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:50%;
            color:#fff;
            font-size:20px;
            font-weight:700;
        }

        #studentStoryCreateModal,
        #studentStoryViewer,
        #studentStoryDeleteConfirm,
        #studentStoryViewersModal,
        #studentStoryRepliesModal{
            position:fixed;
            inset:0;
            z-index:100000;
            display:none;
        }

        #studentStoryCreateModal.active,
        #studentStoryViewer.active,
        #studentStoryDeleteConfirm.active,
        #studentStoryViewersModal.active,
        #studentStoryRepliesModal.active{
            display:flex;
        }

        #studentStoryCreateModal{
            align-items:center;
            justify-content:center;
            padding:16px;
            background:rgba(0,0,0,.65);
        }

        .student-story-form{
            width:min(460px,100%);
            max-height:92vh;
            overflow:auto;
            background:#fff;
            border-radius:22px;
            padding:22px;
            direction:rtl;
        }

        .student-story-form h2{
            margin:0 0 18px;
            font-size:24px;
        }

        .student-story-types{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-bottom:12px;
        }

        .student-story-types button{
            border:1px solid #ddd;
            background:#f7f7f7;
            border-radius:13px;
            padding:13px;
            font-size:15px;
            cursor:pointer;
        }

        .student-story-types button.active{
            background:#0095f6;
            color:#fff;
            border-color:#0095f6;
        }

        #studentStoryText{
            width:100%;
            min-height:130px;
            resize:vertical;
            border:1px solid #ddd;
            border-radius:14px;
            padding:13px;
            font-size:16px;
            direction:rtl;
            outline:none;
            margin-bottom:10px;
        }

        #studentStoryFile{
            width:100%;
            display:none;
            margin-bottom:12px;
        }

        .student-story-field{
            margin-bottom:10px;
        }

        .student-story-field label{
            display:block;
            font-size:13px;
            color:#666;
            margin-bottom:6px;
        }

        .student-story-field select{
            width:100%;
            border:1px solid #ddd;
            border-radius:12px;
            padding:12px;
            font-size:14px;
            background:#fff;
        }

        .student-story-color-row{
            display:flex;
            align-items:center;
            justify-content:space-between;
            border:1px solid #e5e5e5;
            border-radius:12px;
            padding:10px 12px;
            margin-bottom:10px;
        }

        .student-story-color-row input{
            width:48px;
            height:38px;
            border:none;
            background:none;
            padding:0;
        }

        .student-story-switch{
            display:flex;
            justify-content:space-between;
            align-items:center;
            border:1px solid #e5e5e5;
            border-radius:12px;
            padding:12px;
            margin-bottom:10px;
        }

        .student-story-switch input{
            width:20px;
            height:20px;
        }

        .student-story-preview-box{
            display:none;
            width:100%;
            height:220px;
            background:#111;
            border-radius:14px;
            overflow:hidden;
            align-items:center;
            justify-content:center;
            margin-bottom:10px;
        }

        .student-story-preview-box img,
        .student-story-preview-box video{
            width:100%;
            height:100%;
            object-fit:contain;
        }

        .student-story-actions{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:12px;
        }

        .student-story-actions button{
            border:none;
            border-radius:13px;
            padding:13px;
            cursor:pointer;
        }

        #studentStoryPublish{
            background:#0095f6;
            color:#fff;
        }

        #studentStoryCancel{
            background:#eee;
        }

        #studentStoryViewer{
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.92);
            padding:8px;
        }

        .student-story-viewer-box{
            width:min(440px,100%);
            height:min(790px,96vh);
            background:#111;
            border-radius:20px;
            overflow:hidden;
            position:relative;
            color:#fff;
        }

        .student-story-progress-list{
            position:absolute;
            top:8px;
            left:9px;
            right:9px;
            z-index:30;
            display:flex;
            gap:4px;
        }

        .student-story-progress-item{
            flex:1;
            height:3px;
            background:rgba(255,255,255,.25);
            border-radius:9px;
            overflow:hidden;
        }

        .student-story-progress-item span{
            display:block;
            width:0;
            height:100%;
            background:#fff;
        }

        .student-story-top{
            position:absolute;
            top:18px;
            left:12px;
            right:12px;
            z-index:50;
            display:flex;
            justify-content:space-between;
        }

        .student-story-top button{
            width:40px;
            height:40px;
            border:none;
            border-radius:50%;
            background:rgba(0,0,0,.35);
            color:#fff;
            font-size:22px;
            cursor:pointer;
        }

        .student-story-user{
            position:absolute;
            top:20px;
            left:60px;
            right:60px;
            z-index:50;
            display:flex;
            align-items:center;
            gap:9px;
            direction:rtl;
        }

        .student-story-user-name{
            font-size:14px;
            font-weight:700;
            text-shadow:0 1px 4px rgba(0,0,0,.55);
        }

        .student-story-user-time{
            font-size:11px;
            opacity:.85;
        }

        .student-story-avatar{
            width:36px;
            height:36px;
            border-radius:50%;
            object-fit:cover;
            background:#fff;
        }

        .student-story-avatar-fallback{
            display:flex;
            align-items:center;
            justify-content:center;
            background:#0095f6;
            color:#fff;
            font-weight:700;
        }

        .student-story-avatar-skeleton,
        .student-story-own-skeleton{
            position:relative;
            overflow:hidden;
            background:#e9edf2;
        }

        .student-story-avatar-skeleton::after,
        .student-story-own-skeleton::after{
            content:"";
            position:absolute;
            inset:0;
            transform:translateX(-100%);
            background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);
            animation:studentStorySkeleton 1.1s infinite;
        }

        @keyframes studentStorySkeleton{
            100%{transform:translateX(100%);}
        }

        .student-story-replies-btn{
            display:none;
        }

        .student-story-reply-owner-row{
            display:flex;
            gap:10px;
            padding:12px 0;
            border-bottom:1px solid rgba(0,0,0,.08);
            align-items:flex-start;
        }

        .student-story-reply-owner-message{
            margin-top:4px;
            line-height:1.55;
            white-space:pre-wrap;
            word-break:break-word;
        }

        .student-story-content{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        }

        .student-story-content img,
        .student-story-content video{
            width:100%;
            height:100%;
            object-fit:contain;
        }

        .student-story-text-view{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:38px;
            font-size:30px;
            font-weight:700;
            line-height:1.5;
            word-break:break-word;
        }

        .student-story-nav{
            position:absolute;
            inset:0;
            z-index:35;
            display:grid;
            grid-template-columns:1fr 1fr;
        }

        .student-story-nav button{
            border:none;
            background:transparent;
            cursor:pointer;
        }

        .student-story-bottom{
            position:absolute;
            left:12px;
            right:12px;
            bottom:13px;
            z-index:50;
        }

        .student-story-reactions{
            display:flex;
            gap:6px;
            margin-bottom:8px;
        }

        .student-story-reaction{
            flex:1;
            border:none;
            border-radius:20px;
            padding:9px 7px;
            background:rgba(255,255,255,.17);
            color:#fff;
            cursor:pointer;
            font-size:15px;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:3px;
        }

        .student-story-reaction.active{
            background:rgba(255,255,255,.34);
        }

        .student-story-reaction .reaction-count{
            font-size:11px;
        }

        .student-story-reply-row{
            display:flex;
            gap:7px;
            align-items:center;
        }

        .student-story-reply-input{
            flex:1;
            border:none;
            outline:none;
            border-radius:20px;
            padding:10px 14px;
            background:rgba(255,255,255,.14);
            color:#fff;
        }

        .student-story-reply-input::placeholder{
            color:rgba(255,255,255,.8);
        }

        .student-story-reply-send,
        .student-story-viewers-btn{
            border:none;
            cursor:pointer;
            color:#fff;
            background:transparent;
            padding:8px;
            text-shadow:0 1px 4px rgba(0,0,0,.7);
        }

        .student-story-owner-menu{
            position:absolute;
            top:65px;
            left:12px;
            width:180px;
            z-index:70;
            background:rgba(20,20,20,.96);
            border-radius:14px;
            padding:7px;
            display:none;
        }

        .student-story-owner-menu.show{
            display:block;
        }

        .student-story-owner-menu button{
            width:100%;
            border:none;
            background:transparent;
            color:#fff;
            text-align:right;
            padding:11px;
            border-radius:10px;
            cursor:pointer;
        }

        .student-story-owner-menu button:hover{
            background:rgba(255,255,255,.08);
        }

        .student-story-side{
            position:absolute;
            right:10px;
            bottom:111px;
            z-index:55;
            display:flex;
            flex-direction:column;
            gap:6px;
        }

        .student-story-side button{
            width:38px;
            height:38px;
            border:none;
            border-radius:50%;
            background:transparent;
            color:#fff;
            cursor:pointer;
            text-shadow:0 1px 5px rgba(0,0,0,.7);
        }

        #studentStoryDeleteConfirm,
        #studentStoryViewersModal,
        #studentStoryRepliesModal{
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.66);
            padding:16px;
        }

        .student-story-confirm-card,
        .student-story-viewers-card{
            width:min(390px,100%);
            max-height:82vh;
            overflow:auto;
            background:#fff;
            color:#222;
            border-radius:22px;
            padding:20px;
            direction:rtl;
        }

        .student-story-confirm-card{
            text-align:center;
        }

        .student-story-confirm-icon{
            font-size:38px;
        }

        .student-story-confirm-card h3{
            margin:8px 0 10px;
        }

        .student-story-confirm-card p{
            color:#666;
            line-height:1.7;
        }

        .student-story-confirm-actions{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:9px;
            margin-top:16px;
        }

        .student-story-confirm-actions button{
            border:none;
            border-radius:12px;
            padding:13px;
            cursor:pointer;
        }

        #studentStoryDeleteConfirmBtn{
            background:#dc2626;
            color:#fff;
        }

        #studentStoryDeleteCancel{
            background:#eee;
        }

        .student-story-viewers-head{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:10px;
        }

        .student-story-viewers-head button{
            border:none;
            background:#eee;
            width:34px;
            height:34px;
            border-radius:50%;
            cursor:pointer;
        }

        .student-story-viewer-row{
            display:flex;
            align-items:center;
            gap:10px;
            padding:10px 0;
            border-bottom:1px solid #eee;
        }

        .student-story-viewer-meta{
            flex:1;
        }

        .student-story-viewer-name{
            font-weight:700;
        }

        .student-story-viewer-time{
            font-size:11px;
            color:#777;
            margin-top:3px;
        }

        .student-story-empty{
            text-align:center;
            color:#777;
            padding:25px 10px;
        }

        .student-story-own-ring{
            position:relative!important;
            background:#fff!important;
            border:2px solid #e7e7e7!important;
            padding:2px!important;
            overflow:visible!important;
        }

        .student-story-own-placeholder{
            background:linear-gradient(145deg,#f2f3f5,#dfe3e8)!important;
            color:#30343b!important;
        }

        .student-story-add-badge{
            position:absolute;
            right:-2px;
            bottom:-1px;
            width:24px;
            height:24px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#ed1c24;
            color:#fff;
            border:3px solid #fff;
            font-size:18px;
            line-height:1;
            font-weight:700;
            box-sizing:border-box;
        }

        #studentStoryCreateModal{
            padding:0!important;
            background:#fff!important;
            align-items:stretch!important;
            justify-content:stretch!important;
            overflow:hidden;
        }

        .student-story-form{
            width:100%!important;
            max-width:none!important;
            max-height:none!important;
            height:100%!important;
            border-radius:0!important;
            padding:0 16px 24px!important;
            background:#fff!important;
            overflow:auto!important;
            overscroll-behavior:contain;
        }

        .student-story-editor-head{
            position:sticky;
            top:0;
            z-index:4;
            min-height:72px;
            display:grid;
            grid-template-columns:44px 1fr 44px;
            align-items:center;
            gap:8px;
            margin:0 -16px 18px;
            padding:env(safe-area-inset-top,0) 16px 0;
            background:rgba(255,255,255,.96);
            border-bottom:1px solid #f0f0f0;
            backdrop-filter:blur(12px);
        }

        .student-story-editor-head button{
            width:40px;
            height:40px;
            border:0;
            border-radius:50%;
            background:#f3f4f6;
            font-size:30px;
            line-height:1;
            cursor:pointer;
        }

        .student-story-editor-head h2{
            margin:0!important;
            font-size:19px!important;
            text-align:center;
        }

        .student-story-editor-head small{
            display:block;
            margin-top:2px;
            color:#8a8f98;
            text-align:center;
            font-size:11px;
        }

        .student-story-types{
            grid-template-columns:repeat(3,1fr)!important;
            max-width:520px;
            margin:0 auto 16px!important;
        }

        .student-story-types button{
            display:flex;
            align-items:center;
            justify-content:center;
            gap:7px;
            min-height:48px;
        }

        #studentStoryText,
        #studentStoryFile,
        #studentStoryPreview,
        .student-story-color-row,
        .student-story-field,
        .student-story-switch,
        .student-story-actions{
            max-width:520px;
            margin-left:auto;
            margin-right:auto;
        }

        #studentStoryText{
            min-height:170px!important;
            background:#f7f8fa;
            border-color:#eceef1!important;
        }

        #studentStoryFile{
            padding:12px;
            border:1px dashed #cfd4da;
            border-radius:14px;
            background:#fafafa;
        }

        .student-story-preview-box{
            height:min(58vh,520px)!important;
            border-radius:18px!important;
        }

        .student-story-actions{
            position:sticky;
            bottom:0;
            z-index:3;
            padding:12px 0 calc(6px + env(safe-area-inset-bottom,0));
            background:linear-gradient(to top,#fff 80%,rgba(255,255,255,0));
        }

        #studentStoryPublish{
            min-height:48px;
            font-weight:700;
        }

        .student-story-content{
            touch-action:pan-y;
            user-select:none;
            -webkit-user-select:none;
        }

        #studentStoryViewer.story-paused .student-story-content::after{
            content:'Ⅱ';
            position:absolute;
            inset:50% auto auto 50%;
            transform:translate(-50%,-50%);
            width:58px;
            height:58px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.38);
            color:#fff;
            font-size:25px;
            pointer-events:none;
        }

        .student-story-advanced-tools{
            max-width:520px;
            margin:0 auto 14px;
            padding:14px;
            border:1px solid #eceef1;
            border-radius:16px;
            background:#fafbfc;
        }
        .student-story-tool-title{font-weight:800;margin-bottom:10px;color:#20242a}
        .student-story-chip-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
        .student-story-chip-row::-webkit-scrollbar{display:none}
        .student-story-chip-row button{flex:0 0 auto;border:1px solid #dfe3e8;background:#fff;border-radius:999px;padding:8px 12px;font-weight:700;cursor:pointer}
        .student-story-chip-row button.active{border-color:#1877f2;box-shadow:0 0 0 2px rgba(24,119,242,.12)}
        .student-story-tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
        .student-story-tool-grid label,.student-story-range-label{font-size:12px;font-weight:700;color:#555}
        .student-story-tool-grid select,.student-story-overlay-input{width:100%;margin-top:6px;border:1px solid #dfe3e8;border-radius:12px;padding:10px;background:#fff;box-sizing:border-box}
        .student-story-range-label{display:block;margin-top:12px}
        .student-story-range-label input{width:100%;margin-top:8px}
        .student-story-preview-box{position:relative;overflow:hidden;background:#101114}
        .student-story-editor-image{width:100%;height:100%;object-fit:cover;display:block}
        .student-story-editor-overlay{position:absolute;left:8%;right:8%;top:50%;transform:translateY(-50%);padding:8px 10px;color:#fff;text-align:center;font-weight:800;font-size:34px;line-height:1.2;text-shadow:0 2px 8px rgba(0,0,0,.7);pointer-events:none;overflow-wrap:anywhere}
        .student-story-text-live{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere}
        @media (min-width:700px){
            .student-story-form{
                padding-left:max(24px,calc((100vw - 620px)/2))!important;
                padding-right:max(24px,calc((100vw - 620px)/2))!important;
            }
            .student-story-editor-head{
                margin-left:calc(-1 * max(24px,calc((100vw - 620px)/2)));
                margin-right:calc(-1 * max(24px,calc((100vw - 620px)/2)));
                padding-left:max(24px,calc((100vw - 620px)/2));
                padding-right:max(24px,calc((100vw - 620px)/2));
            }
        }
        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       UI
    ========================================================= */

    function ensureUI() {

        if (!$("#studentStoryCreateModal")) {

            const modal =
                document.createElement("div");

            modal.id =
                "studentStoryCreateModal";

            modal.innerHTML = `
                <div
                    class="student-story-form"
                >

                    <div class="student-story-editor-head">
                        <button id="studentStoryEditorBack" type="button" aria-label="رجوع">‹</button>
                        <div>
                            <h2 id="studentStoryTitle">إنشاء ستوري</h2>
                            <small>صمّم قصتك ثم انشرها</small>
                        </div>
                        <span class="student-story-editor-head-space" aria-hidden="true"></span>
                    </div>

                    <div class="student-story-types" role="tablist" aria-label="نوع الستوري">
                        <button id="studentStoryTextMode" class="active" type="button" role="tab">
                            <i class="fa-solid fa-font"></i><span>نص</span>
                        </button>
                        <button id="studentStoryImageMode" type="button" role="tab">
                            <i class="fa-regular fa-image"></i><span>صورة</span>
                        </button>
                        <button id="studentStoryVideoMode" type="button" role="tab">
                            <i class="fa-solid fa-video"></i><span>فيديو</span>
                        </button>
                    </div>

                    <textarea
                        id="studentStoryText"
                        placeholder="اكتب شيئًا..."
                    ></textarea>

                    <input
                        id="studentStoryFile"
                        type="file"
                        accept="image/*,video/*"
                    >
                    <small id="studentStoryVideoHint" style="display:none;color:#6b7280;margin:-2px 0 10px">فيديو حتى 30 ثانية بصوته الأصلي، بدون مونتاج.</small>

                    <div
                        id="studentStoryPreview"
                        class="student-story-preview-box"
                    ></div>

                    <div id="studentStoryTextTools" class="student-story-advanced-tools">
                        <div class="student-story-tool-title">ستايل النص</div>
                        <div class="student-story-chip-row" id="studentStoryBackgroundPresets">
                            <button type="button" data-bg="#1877f2" class="active">أزرق</button>
                            <button type="button" data-bg="#111827">داكن</button>
                            <button type="button" data-bg="#7c3aed">بنفسجي</button>
                            <button type="button" data-bg="linear-gradient(135deg,#ff7a18,#af002d 70%)">غروب</button>
                            <button type="button" data-bg="linear-gradient(135deg,#00c6ff,#0072ff)">سماوي</button>
                        </div>
                        <div class="student-story-tool-grid">
                            <label>الخط
                                <select id="studentStoryFont">
                                    <option value="system-ui">افتراضي</option>
                                    <option value="serif">كلاسيكي</option>
                                    <option value="monospace">مميز</option>
                                </select>
                            </label>
                            <label>المحاذاة
                                <select id="studentStoryTextAlign">
                                    <option value="center">وسط</option>
                                    <option value="right">يمين</option>
                                    <option value="left">يسار</option>
                                </select>
                            </label>
                        </div>
                        <label class="student-story-range-label">حجم النص <span id="studentStoryTextSizeValue">42</span>
                            <input id="studentStoryTextSize" type="range" min="24" max="72" value="42">
                        </label>
                    </div>

                    <div id="studentStoryImageTools" class="student-story-advanced-tools" style="display:none">
                        <div class="student-story-tool-title">تحرير الصورة</div>
                        <div class="student-story-chip-row" id="studentStoryFilterPresets">
                            <button type="button" data-filter="none" class="active">أصلي</button>
                            <button type="button" data-filter="contrast(1.08) saturate(1.08)">حيوي</button>
                            <button type="button" data-filter="sepia(.28) contrast(1.05)">دافئ</button>
                            <button type="button" data-filter="grayscale(1)">أبيض وأسود</button>
                            <button type="button" data-filter="contrast(1.12) brightness(.96)">سينمائي</button>
                        </div>
                        <label class="student-story-range-label">السطوع <span id="studentStoryBrightnessValue">100</span>%
                            <input id="studentStoryBrightness" type="range" min="70" max="130" value="100">
                        </label>
                        <label class="student-story-range-label">التشبع <span id="studentStorySaturationValue">100</span>%
                            <input id="studentStorySaturation" type="range" min="0" max="160" value="100">
                        </label>
                        <div class="student-story-tool-title">نص فوق الصورة</div>
                        <input id="studentStoryOverlayText" class="student-story-overlay-input" type="text" maxlength="120" placeholder="اكتب نصًا اختياريًا فوق الصورة">
                    </div>

                    <div
                        class="student-story-color-row"
                    >

                        <span>
                            لون الخلفية
                        </span>

                        <input
                            id="studentStoryBackground"
                            type="color"
                            value="#1877f2"
                        >

                    </div>

                    <div
                        class="student-story-color-row"
                    >

                        <span>
                            لون النص
                        </span>

                        <input
                            id="studentStoryTextColor"
                            type="color"
                            value="#ffffff"
                        >

                    </div>

                    <div
                        class="student-story-field"
                    >

                        <label>
                            الخصوصية
                        </label>

                        <select
                            id="studentStoryVisibility"
                        >

                            <option
                                value="public"
                            >
                                الجميع
                            </option>

                            <option
                                value="private"
                            >
                                أنا فقط
                            </option>

                        </select>

                    </div>

                    <div
                        class="student-story-switch"
                    >

                        <span>
                            السماح بالرد على الستوري
                        </span>

                        <input
                            id="studentStoryReplyEnabled"
                            type="checkbox"
                            checked
                        >

                    </div>

                    <div
                        class="student-story-actions"
                    >

                        <button
                            id="studentStoryCancel"
                            type="button"
                        >
                            إلغاء
                        </button>

                        <button
                            id="studentStoryPublish"
                            type="button"
                        >
                            نشر
                        </button>

                    </div>

                </div>
            `;

            document.body.appendChild(
                modal
            );
        }

        if (!$("#studentStoryViewer")) {

            const viewer =
                document.createElement("div");

            viewer.id =
                "studentStoryViewer";

            viewer.innerHTML = `
                <div
                    class="student-story-viewer-box"
                >

                    <div
                        id="studentStoryProgressList"
                        class="student-story-progress-list"
                    ></div>

                    <div
                        class="student-story-top"
                    >

                        <button
                            id="studentStoryClose"
                            type="button"
                        >
                            ×
                        </button>

                        <button
                            id="studentStoryMenu"
                            type="button"
                        >
                            ⋮
                        </button>

                    </div>

                    <div
                        id="studentStoryUser"
                        class="student-story-user"
                    ></div>

                    <div
                        id="studentStoryContent"
                        class="student-story-content"
                    ></div>

                    <div
                        class="student-story-nav"
                    >

                        <button
                            id="studentStoryPrev"
                            type="button"
                        ></button>

                        <button
                            id="studentStoryNext"
                            type="button"
                        ></button>

                    </div>

                    <div
                        id="studentStoryOwnerMenu"
                        class="student-story-owner-menu"
                    ></div>

                    <div
                        class="student-story-side"
                    >

                        <button
                            id="studentStoryViewsBtn"
                            type="button"
                            title="المشاهدون"
                        >

                            <i
                                class="fa-regular fa-eye"
                            ></i>

                            <span
                                id="studentStoryViewNumber"
                            >
                                0
                            </span>

                        </button>

                        <button
                            id="studentStoryRepliesBtn"
                            class="student-story-replies-btn"
                            type="button"
                            title="الردود"
                        >
                            <i class="fa-regular fa-comment"></i>
                            <span id="studentStoryReplyNumber">0</span>
                        </button>

                    </div>

                    <div
                        class="student-story-bottom"
                    >

                        <div
                            id="studentStoryReactions"
                            class="student-story-reactions"
                        ></div>

                        <div
                            id="studentStoryReplyRow"
                            class="student-story-reply-row"
                        >

                            <input
                                id="studentStoryReplyInput"
                                class="student-story-reply-input"
                                type="text"
                                maxlength="500"
                                placeholder="إرسال رد..."
                            >

                            <button
                                id="studentStoryReplySend"
                                class="student-story-reply-send"
                                type="button"
                            >
                                إرسال
                            </button>

                        </div>

                    </div>

                </div>
            `;

            document.body.appendChild(
                viewer
            );
        }

        if (!$("#studentStoryDeleteConfirm")) {

            const confirmBox =
                document.createElement(
                    "div"
                );

            confirmBox.id =
                "studentStoryDeleteConfirm";

            confirmBox.innerHTML = `
                <div
                    class="student-story-confirm-card"
                >

                    <div
                        class="student-story-confirm-icon"
                    >
                        🗑️
                    </div>

                    <h3>
                        حذف الستوري
                    </h3>

                    <p>
                        هل أنت متأكد أنك تريد حذف هذه الستوري؟
                    </p>

                    <div
                        class="student-story-confirm-actions"
                    >

                        <button
                            id="studentStoryDeleteCancel"
                            type="button"
                        >
                            إلغاء
                        </button>

                        <button
                            id="studentStoryDeleteConfirmBtn"
                            type="button"
                        >
                            حذف
                        </button>

                    </div>

                </div>
            `;

            document.body.appendChild(
                confirmBox
            );
        }

        if (!$("#studentStoryViewersModal")) {

            const modal =
                document.createElement(
                    "div"
                );

            modal.id =
                "studentStoryViewersModal";

            modal.innerHTML = `
                <div
                    class="student-story-viewers-card"
                >

                    <div
                        class="student-story-viewers-head"
                    >

                        <strong>
                            المشاهدون
                        </strong>

                        <button
                            id="studentStoryViewersClose"
                            type="button"
                        >
                            ×
                        </button>

                    </div>

                    <div
                        id="studentStoryViewersList"
                    ></div>

                </div>
            `;

            document.body.appendChild(
                modal
            );
        }

        if (!$("#studentStoryRepliesModal")) {
            const modal = document.createElement("div");
            modal.id = "studentStoryRepliesModal";
            modal.innerHTML = `
                <div class="student-story-viewers-card">
                    <div class="student-story-viewers-head">
                        <strong>ردود الستوري</strong>
                        <button id="studentStoryRepliesClose" type="button">×</button>
                    </div>
                    <div id="studentStoryRepliesList"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    /* =========================================================
       STORIES STRIP
    ========================================================= */

    function setupStoriesContainer() {

        const container =
            $(".stories-container");

        if (!container) {
            return;
        }

        container.innerHTML =
            "";

        createAddButton(
            container
        );
    }

    function createAddButton(
        container
    ) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "story stories-add-new";

        const profile =
            typeof currentProfile !== "undefined" &&
            currentProfile?.id === currentUser?.id
                ? currentProfile
                : null;

        const cachedAvatar =
            profile?.avatar_url ||
            getCachedStoryAvatar(currentUser?.id);

        if (profile?.avatar_url) cacheStoryAvatar(profile);

        const picture = cachedAvatar
            ? `<img class="student-story-preview" src="${escapeHtml(cachedAvatar)}" alt="صورتك" loading="eager" decoding="async">`
            : `<div class="student-story-placeholder student-story-own-placeholder student-story-own-skeleton" aria-label="جاري تحميل صورة الحساب"></div>`;

        item.innerHTML = `
            <div
                class="story-ring student-story-own-ring"
                aria-label="إضافة ستوري"
            >

                <div
                    class="story-ring-inner"
                >
                    ${picture}
                </div>

                <span
                    class="student-story-add-badge"
                    aria-hidden="true"
                >+</span>

            </div>

            <span
                class="story-name"
            >
                ستوري
            </span>
        `;

        item.addEventListener(
            "click",
            () => openCreateModal()
        );

        container.appendChild(
            item
        );

        if (!cachedAvatar && currentUser?.id) {
            sb.from("profiles")
                .select("id,display_name,avatar_url")
                .eq("id", currentUser.id)
                .maybeSingle()
                .then(({ data }) => {
                    if (!data?.avatar_url || !item.isConnected) return;
                    cacheStoryAvatar(data);
                    const inner = item.querySelector(".story-ring-inner");
                    if (!inner) return;
                    const img = document.createElement("img");
                    img.className = "student-story-preview";
                    img.alt = "صورتك";
                    img.loading = "eager";
                    img.decoding = "async";
                    img.src = data.avatar_url;
                    inner.replaceChildren(img);
                })
                .catch(() => {});
        }
    }

    /* =========================================================
       LOAD STORIES
    ========================================================= */

    async function cleanupOwnExpiredStories() {

        if (!currentUser) {
            return;
        }

        const {
            data,
            error
        } =
            await sb
                .from("stories")
                .select(
                    "id,media_path"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .lte(
                    "expires_at",
                    new Date().toISOString()
                );

        if (
            error ||
            !data?.length
        ) {
            return;
        }

        for (
            const story of data
        ) {

            if (
                story.media_path
            ) {

                await removeStorageFile(
                    story.media_path
                );
            }

            await sb
                .from("stories")
                .delete()
                .eq(
                    "id",
                    story.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );
        }
    }

    async function loadStories() {

        if (!currentUser) {
            return;
        }

        await cleanupOwnExpiredStories();

        const {
            data,
            error
        } =
            await sb
                .from("stories")
                .select("*")
                .gt(
                    "expires_at",
                    new Date().toISOString()
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true
                    }
                );

        if (error) {

            console.error(
                error
            );

            toast(
                "تعذر تحميل القصص",
                "error"
            );

            return;
        }

        stories =
            data || [];

        const ids =
            stories.map(
                story =>
                    story.user_id
            );

        const profiles =
            await getProfiles(
                ids
            );

        const storyIds =
            stories.map(
                story =>
                    story.id
            );

        let viewed =
            new Set();

        if (
            storyIds.length
        ) {

            const {
                data:
                    rows
            } =
                await sb
                    .from(
                        "story_views"
                    )
                    .select(
                        "story_id"
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .in(
                        "story_id",
                        storyIds
                    );

            viewed =
                new Set(
                    (
                        rows ||
                        []
                    ).map(
                        row =>
                            row.story_id
                    )
                );
        }

        renderStories(
            profiles,
            viewed
        );
    }

    function renderStories(
        profiles,
        viewed
    ) {

        const container =
            $(".stories-container");

        if (!container) {
            return;
        }

        container.innerHTML =
            "";

        createAddButton(
            container
        );

        const groups =
            new Map();

        for (
            const story of stories
        ) {

            if (
                !groups.has(
                    story.user_id
                )
            ) {

                groups.set(
                    story.user_id,
                    []
                );
            }

            groups
                .get(
                    story.user_id
                )
                .push(
                    story
                );
        }

        for (
            const [
                userId,
                group
            ] of groups
        ) {

            const profile =
                profiles.get(
                    userId
                );

            const latest =
                group[
                    group.length - 1
                ];

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "story";

            const allSeen =
                group.every(
                    story =>
                        viewed.has(
                            story.id
                        )
                );

            let preview = "";

            if (
                latest.type === "image" &&
                latest.media_url
            ) {

                preview = `
                    <img
                        class="student-story-preview"
                        src="${escapeHtml(
                            latest.media_url
                        )}"
                        alt=""
                    >
                `;

            } else {

                preview = `
                    <div
                        class="student-story-placeholder"
                        style="
                            background:${
                                escapeHtml(
                                    latest.background_color ||
                                    "#1877f2"
                                )
                            };
                            color:${
                                escapeHtml(
                                    latest.text_color ||
                                    "#fff"
                                )
                            };
                        "
                    >
                        ${
                            escapeHtml(
                                getProfileName(
                                    profile,
                                    userId === currentUser.id
                                        ? "أنت"
                                        : "S"
                                ).charAt(0)
                            ) || "S"
                        }
                    </div>
                `;
            }

            item.innerHTML = `
                <div
                    class="
                        story-ring
                        ${allSeen ? "seen" : ""}
                    "
                >

                    <div
                        class="story-ring-inner"
                    >
                        ${preview}
                    </div>

                </div>

                <span
                    class="story-name"
                >
                    ${escapeHtml(
                        userId === currentUser.id
                            ? "قصتي"
                            : getProfileName(
                                profile,
                                "ستوري"
                            )
                    )}${userId === currentUser.id ? "" : studentVerificationBadge(profile, 11)}
                </span>
            `;

            item.addEventListener(
                "click",
                () => {
                    openStoryGroup(
                        group,
                        0
                    );
                }
            );

            container.appendChild(
                item
            );
        }
    }

    /* =========================================================
       CREATE / EDIT
    ========================================================= */

    function getVideoDurationSeconds(file) {

        return new Promise((resolve, reject) => {

            const url = URL.createObjectURL(file);
            const video = document.createElement("video");

            video.preload = "metadata";
            video.playsInline = true;

            const cleanup = () => {
                try { URL.revokeObjectURL(url); } catch (_) {}
                video.removeAttribute("src");
                try { video.load(); } catch (_) {}
            };

            video.onloadedmetadata = () => {
                const duration = Number(video.duration || 0);
                cleanup();
                resolve(duration);
            };

            video.onerror = () => {
                cleanup();
                reject(new Error("تعذر قراءة مدة الفيديو"));
            };

            video.src = url;
        });
    }

    function setStoryMode(
        mode
    ) {

        storyMode =
            mode;

        const isText =
            mode === "text";

        const isImage =
            mode === "image";

        const isVideo =
            mode === "video";

        $("#studentStoryTextMode")
            .classList.toggle(
                "active",
                isText
            );

        $("#studentStoryImageMode")
            ?.classList.toggle(
                "active",
                isImage
            );

        $("#studentStoryVideoMode")
            ?.classList.toggle(
                "active",
                isVideo
            );

        const input =
            $("#studentStoryFile");

        input.style.display =
            isText
                ? "none"
                : "block";

        if (isImage) {
            input.accept =
                "image/*";
        } else if (isVideo) {
            input.accept =
                "video/*";
        } else {
            input.accept =
                "image/*,video/*";
        }

        $("#studentStoryText")
            .style.display =
            isText
                ? "block"
                : "none";

        const textTools = $("#studentStoryTextTools");
        const imageTools = $("#studentStoryImageTools");
        if (textTools) textTools.style.display = isText ? "block" : "none";
        if (imageTools) imageTools.style.display = isImage ? "block" : "none";
        const videoHint = $("#studentStoryVideoHint");
        if (videoHint) videoHint.style.display = isVideo ? "block" : "none";

        if (isText) updateTextStoryPreview();
        if (isImage) updateImageEditorPreview();
    }

    function clearPreview() {

        const box =
            $("#studentStoryPreview");

        box.innerHTML =
            "";

        box.style.display =
            "none";
    }

    function buildEditorFilter() {
        const extras = ` brightness(${editorBrightness}%) saturate(${editorSaturation}%)`;
        return `${editorFilter === "none" ? "" : editorFilter}${extras}`.trim();
    }

    function updateTextStoryPreview() {
        if (storyMode !== "text") return;
        const box = $("#studentStoryPreview");
        if (!box) return;
        const text = $("#studentStoryText")?.value || "اكتب شيئًا...";
        box.style.display = "flex";
        box.style.background = editorBackground;
        box.innerHTML = "";
        const live = document.createElement("div");
        live.className = "student-story-text-live";
        live.textContent = text;
        live.style.color = $("#studentStoryTextColor")?.value || "#fff";
        live.style.fontFamily = editorTextFont;
        live.style.textAlign = editorTextAlign;
        live.style.fontSize = `${editorTextSize}px`;
        live.style.justifyContent = editorTextAlign === "left" ? "flex-start" : editorTextAlign === "right" ? "flex-end" : "center";
        box.appendChild(live);
    }

    function updateImageEditorPreview() {
        if (storyMode !== "image" || !editorImage) return;
        const box = $("#studentStoryPreview");
        if (!box) return;
        box.style.display = "flex";
        box.style.background = "#000";
        box.innerHTML = "";
        const img = document.createElement("img");
        img.className = "student-story-editor-image";
        img.src = editorImage.src;
        img.style.filter = buildEditorFilter();
        box.appendChild(img);
        const overlayValue = $("#studentStoryOverlayText")?.value?.trim();
        if (overlayValue) {
            const overlay = document.createElement("div");
            overlay.className = "student-story-editor-overlay";
            overlay.textContent = overlayValue;
            overlay.style.color = $("#studentStoryTextColor")?.value || "#fff";
            overlay.style.fontFamily = editorTextFont;
            overlay.style.textAlign = editorTextAlign;
            overlay.style.fontSize = `${Math.max(24, editorTextSize * .8)}px`;
            box.appendChild(overlay);
        }
    }

    async function createEditedImageFile(originalFile) {
        if (!editorImage) return originalFile;
        const canvas = document.createElement("canvas");
        const targetW = 1080, targetH = 1920;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { alpha:false });
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,targetW,targetH);
        const iw = editorImage.naturalWidth || editorImage.width;
        const ih = editorImage.naturalHeight || editorImage.height;
        const scale = Math.max(targetW/iw, targetH/ih);
        const dw = iw*scale, dh = ih*scale;
        const dx = (targetW-dw)/2, dy=(targetH-dh)/2;
        ctx.filter = buildEditorFilter();
        ctx.drawImage(editorImage, dx, dy, dw, dh);
        ctx.filter = "none";
        const overlay = $("#studentStoryOverlayText")?.value?.trim();
        if (overlay) {
            const size = Math.max(48, Math.min(110, editorTextSize*1.8));
            ctx.font = `800 ${size}px ${editorTextFont}`;
            ctx.fillStyle = $("#studentStoryTextColor")?.value || "#fff";
            ctx.textAlign = editorTextAlign === "left" ? "left" : editorTextAlign === "right" ? "right" : "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,.65)";
            ctx.shadowBlur = 12;
            const x = editorTextAlign === "left" ? 90 : editorTextAlign === "right" ? targetW-90 : targetW/2;
            const maxWidth = targetW-180;
            const words = overlay.split(/\s+/);
            const lines=[]; let line="";
            for (const word of words) {
                const test = line ? `${line} ${word}` : word;
                if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line=word; } else line=test;
            }
            if (line) lines.push(line);
            const lineH = size*1.18;
            const startY = targetH/2 - ((lines.length-1)*lineH)/2;
            lines.slice(0,5).forEach((ln,i)=>ctx.fillText(ln,x,startY+i*lineH,maxWidth));
            ctx.shadowBlur = 0;
        }
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .88));
        if (!blob) return originalFile;
        return new File([blob], `story_${Date.now()}.jpg`, { type:"image/jpeg" });
    }

    function previewFile(file) {
        const box = $("#studentStoryPreview");
        if (!file) { clearPreview(); return; }
        if (editorObjectUrl) { URL.revokeObjectURL(editorObjectUrl); editorObjectUrl = null; }
        editorObjectUrl = URL.createObjectURL(file);
        box.innerHTML = "";
        if (file.type.startsWith("image/")) {
            const img = new Image();
            img.onload = () => { editorImage = img; updateImageEditorPreview(); };
            img.src = editorObjectUrl;
            return;
        }
        editorImage = null;
        if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = editorObjectUrl; video.controls = true; video.playsInline = true;
            box.appendChild(video); box.style.display = "flex"; return;
        }
        toast("اختر صورة أو فيديو فقط","error"); clearPreview();
    }

    function openCreateModal(
        story = null
    ) {

        if (!currentUser) {

            toast(
                "يجب تسجيل الدخول أولًا",
                "error"
            );

            return;
        }

        editStory =
            story;

        $("#studentStoryTitle")
            .textContent =
            story
                ? "تعديل الستوري"
                : "إنشاء ستوري";

        let initialStoryText = story?.content || "";
        let initialTextConfig = null;
        if (initialStoryText.startsWith("__STORYV2__")) {
            try {
                initialTextConfig = JSON.parse(initialStoryText.slice(11));
                initialStoryText = initialTextConfig?.text || "";
            } catch (_) {
                initialTextConfig = null;
            }
        }

        $("#studentStoryText")
            .value =
            initialStoryText;

        $("#studentStoryBackground")
            .value =
            story?.background_color ||
            "#1877f2";

        $("#studentStoryTextColor")
            .value =
            story?.text_color ||
            "#ffffff";

        $("#studentStoryVisibility")
            .value =
            story?.visibility ||
            "public";

        $("#studentStoryReplyEnabled")
            .checked =
            story?.reply_enabled ??
            true;

        $("#studentStoryFile")
            .value =
            "";

        if (editorObjectUrl) { URL.revokeObjectURL(editorObjectUrl); editorObjectUrl = null; }
        editorImage = null;
        editorFilter = "none";
        editorBrightness = 100;
        editorSaturation = 100;
        editorTextFont = initialTextConfig?.font || "system-ui";
        editorTextAlign = initialTextConfig?.align || "center";
        editorTextSize = Math.max(24, Math.min(72, Number(initialTextConfig?.size) || 42));
        editorBackground = initialTextConfig?.background || story?.background_color || "#1877f2";
        if ($("#studentStoryFont")) $("#studentStoryFont").value = editorTextFont;
        if ($("#studentStoryTextAlign")) $("#studentStoryTextAlign").value = editorTextAlign;
        if ($("#studentStoryTextSize")) $("#studentStoryTextSize").value = String(editorTextSize);
        if ($("#studentStoryTextSizeValue")) $("#studentStoryTextSizeValue").textContent = String(editorTextSize);
        if ($("#studentStoryBrightness")) $("#studentStoryBrightness").value = "100";
        if ($("#studentStorySaturation")) $("#studentStorySaturation").value = "100";
        if ($("#studentStoryOverlayText")) $("#studentStoryOverlayText").value = "";

        clearPreview();

        setStoryMode(
            story?.type === "image"
                ? "image"
                : story?.type === "video"
                    ? "video"
                    : "text"
        );

        $("#studentStoryCreateModal")
            .classList
            .add(
                "active"
            );

        if (storyMode === "text") updateTextStoryPreview();
    }

    function closeCreateModal() {

        $("#studentStoryCreateModal")
            .classList
            .remove(
                "active"
            );

        editStory =
            null;
        if (editorObjectUrl) {
            URL.revokeObjectURL(editorObjectUrl);
            editorObjectUrl = null;
        }
        editorImage = null;
    }

    async function uploadStorageFile(
        file
    ) {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const path =
            `${currentUser.id}/${Date.now()}_${Math.random()
                .toString(36)
                .slice(2,10)}.${extension}`;

        const {
            error
        } =
            await sb.storage
                .from("stories")
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",
                        contentType:
                            file.type,
                        upsert:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        const {
            data
        } =
            sb.storage
                .from("stories")
                .getPublicUrl(
                    path
                );

        return {
            path,
            url:
                data.publicUrl
        };
    }

    async function removeStorageFile(
        path
    ) {

        if (!path) {
            return;
        }

        const {
            error
        } =
            await sb.storage
                .from("stories")
                .remove([
                    path
                ]);

        if (error) {
            console.warn(
                "Storage cleanup:",
                error
            );
        }
    }

    async function saveStory() {

        if (!currentUser) {
            toast(
                "يجب تسجيل الدخول أولًا",
                "error"
            );
            return;
        }

        const button =
            $("#studentStoryPublish");

        let newPath =
            null;

        try {

            button.disabled =
                true;

            button.textContent =
                "جاري الحفظ...";

            const text =
                $("#studentStoryText")
                    .value
                    .trim();

            const background =
                storyMode === "text" && editorBackground.startsWith("#")
                    ? editorBackground
                    : $("#studentStoryBackground").value;

            const textColor =
                $("#studentStoryTextColor")
                    .value;

            const visibility =
                $("#studentStoryVisibility")
                    .value;

            const replyEnabled =
                $("#studentStoryReplyEnabled")
                    .checked;

            let file =
                $("#studentStoryFile")
                    .files[0] ||
                null;

            let storedText = text;
            if (storyMode === "text") {
                storedText = "__STORYV2__" + JSON.stringify({
                    text,
                    background: editorBackground,
                    font: editorTextFont,
                    align: editorTextAlign,
                    size: editorTextSize
                });
            }

            let type =
                "text";

            let mediaUrl =
                editStory
                    ? editStory.media_url
                    : null;

            let mediaPath =
                editStory
                    ? editStory.media_path
                    : null;

            if (
                storyMode === "text"
            ) {

                if (!text) {
                    toast(
                        "اكتب نص الستوري أولًا",
                        "error"
                    );
                    return;
                }

                type =
                    "text";

                mediaUrl =
                    null;

                mediaPath =
                    null;

            } else {

                if (
                    !file &&
                    !editStory?.media_url
                ) {

                    toast(
                        "اختر صورة أو فيديو أولًا",
                        "error"
                    );

                    return;
                }

                if (file) {

                    if (storyMode === "image" && file.type.startsWith("image/")) {
                        file = await createEditedImageFile(file);
                    }

                    if (
                        !file.type.startsWith(
                            "image/"
                        ) &&
                        !file.type.startsWith(
                            "video/"
                        )
                    ) {

                        toast(
                            "نوع الملف غير مدعوم",
                            "error"
                        );

                        return;
                    }

                    if (file.type.startsWith("video/")) {
                        let videoDuration = 0;
                        try {
                            videoDuration = await getVideoDurationSeconds(file);
                        } catch (error) {
                            toast(error?.message || "تعذر قراءة الفيديو", "error");
                            return;
                        }

                        if (!Number.isFinite(videoDuration) || videoDuration <= 0) {
                            toast("الفيديو غير صالح", "error");
                            return;
                        }

                        if (videoDuration > 30.05) {
                            toast("مدة فيديو الستوري يجب ألا تتجاوز 30 ثانية", "error");
                            return;
                        }
                    }

                    const max =
                        50 *
                        1024 *
                        1024;

                    if (
                        file.size >
                        max
                    ) {

                        toast(
                            "حجم الملف يجب ألا يتجاوز 50 MB",
                            "error"
                        );

                        return;
                    }

                    type =
                        file.type.startsWith(
                            "video/"
                        )
                            ? "video"
                            : "image";

                    if (
                        storyMode === "image" &&
                        type !== "image"
                    ) {
                        toast(
                            "اختر صورة فقط",
                            "error"
                        );
                        return;
                    }

                    if (
                        storyMode === "video" &&
                        type !== "video"
                    ) {
                        toast(
                            "اختر فيديو فقط",
                            "error"
                        );
                        return;
                    }

                    const uploaded =
                        await uploadStorageFile(
                            file
                        );

                    newPath =
                        uploaded.path;

                    mediaPath =
                        uploaded.path;

                    mediaUrl =
                        uploaded.url;

                } else {

                    type =
                        editStory.type;
                }
            }

            if (
                editStory
            ) {

                const {
                    error
                } =
                    await sb
                        .from(
                            "stories"
                        )
                        .update({
                            type,
                            content:
                                storedText,
                            media_url:
                                mediaUrl,
                            media_path:
                                mediaPath,
                            background_color:
                                background,
                            text_color:
                                textColor,
                            visibility,
                            reply_enabled:
                                replyEnabled
                        })
                        .eq(
                            "id",
                            editStory.id
                        )
                        .eq(
                            "user_id",
                            currentUser.id
                        );

                if (error) {

                    if (
                        newPath
                    ) {

                        await removeStorageFile(
                            newPath
                        );
                    }

                    throw error;
                }

                if (
                    newPath &&
                    editStory.media_path &&
                    editStory.media_path !==
                        newPath
                ) {

                    await removeStorageFile(
                        editStory.media_path
                    );
                }

                toast(
                    "تم تعديل الستوري بنجاح"
                );

            } else {

                const now =
                    new Date();

                const expires =
                    new Date(
                        now.getTime() +
                        24 *
                        60 *
                        60 *
                        1000
                    );

                const {
                    error
                } =
                    await sb
                        .from(
                            "stories"
                        )
                        .insert({
                            user_id:
                                currentUser.id,
                            type,
                            content:
                                storedText,
                            media_url:
                                mediaUrl,
                            media_path:
                                mediaPath,
                            background_color:
                                background,
                            text_color:
                                textColor,
                            visibility,
                            reply_enabled:
                                replyEnabled,
                            created_at:
                                now.toISOString(),
                            expires_at:
                                expires.toISOString()
                        });

                if (error) {

                    if (
                        newPath
                    ) {

                        await removeStorageFile(
                            newPath
                        );
                    }

                    throw error;
                }

                toast(
                    "تم نشر الستوري بنجاح"
                );
            }

            closeCreateModal();

            await loadStories();

        } catch (error) {

            console.error(
                "SAVE STORY:",
                error
            );

            toast(
                error.message ||
                "حدث خطأ أثناء حفظ الستوري",
                "error"
            );

        } finally {

            button.disabled =
                false;

            button.textContent =
                "نشر";
        }
    }

    /* =========================================================
       VIEWER
    ========================================================= */

    async function openStoryGroup(
        group,
        index = 0
    ) {

        if (
            !group?.length
        ) {
            return;
        }

        currentGroup =
            group;

        currentIndex =
            Math.max(
                0,
                Math.min(
                    index,
                    group.length - 1
                )
            );

        $("#studentStoryViewer")
            .classList
            .add(
                "active"
            );

        await renderCurrentStory();
    }

    async function renderCurrentStory() {

        clearTimers();

        currentStory =
            currentGroup[
                currentIndex
            ];

        if (!currentStory) {
            closeViewer();
            return;
        }

        renderProgress();

        const profileMap =
            await getProfiles([
                currentStory.user_id
            ]);

        const profile =
            profileMap.get(
                currentStory.user_id
            );

        $("#studentStoryUser")
            .innerHTML = `
                ${avatar(profile,"S")}

                <div>

                    <div
                        class="student-story-user-name"
                    >
                        ${escapeHtml(
                            currentStory.user_id ===
                                currentUser.id
                                ? "قصتي"
                                : getProfileName(
                                    profile,
                                    "مستخدم"
                                )
                        )}${currentStory.user_id === currentUser.id ? "" : studentVerificationBadge(profile, 12)}
                    </div>

                    <div
                        class="student-story-user-time"
                    >
                        ${escapeHtml(
                            timeAgo(
                                currentStory.created_at
                            )
                        )}
                    </div>

                </div>
            `;

        renderContent();

        renderOwnerMenu();

        $("#studentStoryReplyRow")
            .style.display =
                currentStory.reply_enabled &&
                currentStory.user_id !==
                    currentUser.id
                    ? "flex"
                    : "none";

        await registerView(
            currentStory.id
        );

        await updateViewCount();

        await updateReplyCount();

        await loadReactionCounts();

        startTimer();
    }

    function renderProgress() {

        const box =
            $("#studentStoryProgressList");

        box.innerHTML =
            "";

        currentGroup.forEach(
            (_, index) => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "student-story-progress-item";

                const span =
                    document.createElement(
                        "span"
                    );

                if (
                    index <
                    currentIndex
                ) {

                    span.style.width =
                        "100%";
                }

                item.appendChild(
                    span
                );

                box.appendChild(
                    item
                );
            }
        );
    }

    function updateProgress(
        percent
    ) {

        const spans =
            $$(".student-story-progress-item span");

        if (
            spans[currentIndex]
        ) {

            spans[
                currentIndex
            ].style.width =
                `${Math.max(
                    0,
                    Math.min(
                        100,
                        percent
                    )
                )}%`;
        }
    }

    function renderContent() {

        const box =
            $("#studentStoryContent");

        box.innerHTML =
            "";

        if (
            currentStory.type ===
            "text"
        ) {

            let cfg = null;
            const rawContent = currentStory.content || "";
            if (rawContent.startsWith("__STORYV2__")) {
                try { cfg = JSON.parse(rawContent.slice(11)); } catch (_) { cfg = null; }
            }

            box.style.background =
                cfg?.background ||
                currentStory.background_color ||
                "#1877f2";

            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "student-story-text-view";

            text.style.color =
                currentStory.text_color ||
                "#fff";
            if (cfg) {
                text.style.fontFamily = cfg.font || "system-ui";
                text.style.textAlign = cfg.align || "center";
                text.style.fontSize = `${Math.max(24, Math.min(72, Number(cfg.size) || 42))}px`;
            }

            text.textContent =
                cfg?.text ?? rawContent;

            box.appendChild(
                text
            );

            return;
        }

        box.style.background =
            "#000";

        if (
            currentStory.type ===
            "image"
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                currentStory.media_url;

            img.alt =
                "Story";

            box.appendChild(
                img
            );

            return;
        }

        if (
            currentStory.type ===
            "video"
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.src =
                currentStory.media_url;

            video.controls =
                false;

            video.autoplay =
                true;

            video.playsInline =
                true;

            box.appendChild(
                video
            );

            video.addEventListener(
                "loadedmetadata",
                () => {

                    startVideoTimer(
                        video.duration ||
                        5
                    );
                },
                {
                    once:
                        true
                }
            );
        }
    }

    function startTimer() {

        if (
            currentStory.type ===
            "video"
        ) {
            return;
        }

        storyDurationMs =
            5000;

        storyElapsedMs =
            0;

        storyPaused =
            false;

        runStoryClock();
    }

    function startVideoTimer(
        seconds
    ) {

        clearTimers();

        storyDurationMs =
            Math.max(
                3000,
                seconds * 1000
            );

        storyElapsedMs =
            0;

        storyPaused =
            false;

        runStoryClock();
    }

    function runStoryClock() {

        clearInterval(
            storyTimer
        );

        storyLastTick =
            performance.now();

        storyTimer =
            setInterval(
                () => {

                    const now =
                        performance.now();

                    const delta =
                        now -
                        storyLastTick;

                    storyLastTick =
                        now;

                    if (storyPaused) {
                        return;
                    }

                    storyElapsedMs +=
                        delta;

                    updateProgress(
                        storyElapsedMs /
                        storyDurationMs *
                        100
                    );

                    if (
                        storyElapsedMs >=
                        storyDurationMs
                    ) {

                        clearTimers();
                        nextStory();
                    }

                },
                80
            );
    }

    function setStoryPaused(
        paused
    ) {

        if (!currentStory) {
            return;
        }

        storyPaused =
            Boolean(paused);

        const video =
            $("#studentStoryContent video");

        if (video) {
            if (storyPaused) {
                video.pause();
            } else {
                video.play()
                    .catch(() => {});
            }
        }

        $("#studentStoryViewer")
            ?.classList.toggle(
                "story-paused",
                storyPaused
            );
    }

    function toggleStoryPause() {
        setStoryPaused(
            !storyPaused
        );
    }

    function clearTimers() {

        if (storyTimer) {
            clearInterval(
                storyTimer
            );
            storyTimer =
                null;
        }

        if (videoTimer) {
            clearTimeout(
                videoTimer
            );
            videoTimer =
                null;
        }

        storyPaused =
            false;

        storyElapsedMs =
            0;

        $("#studentStoryViewer")
            ?.classList.remove(
                "story-paused"
            );
    }

    function getOrderedStoryGroups() {

        const groups =
            new Map();

        for (const story of stories) {
            if (!groups.has(story.user_id)) {
                groups.set(
                    story.user_id,
                    []
                );
            }
            groups.get(story.user_id)
                .push(story);
        }

        return Array.from(
            groups.values()
        );
    }

    async function nextStory() {

        if (
            currentIndex <
            currentGroup.length - 1
        ) {

            currentIndex += 1;
            await renderCurrentStory();
            return;
        }

        const groups =
            getOrderedStoryGroups();

        const groupIndex =
            groups.findIndex(
                group =>
                    group[0]?.user_id ===
                    currentStory?.user_id
            );

        if (
            groupIndex >= 0 &&
            groupIndex < groups.length - 1
        ) {
            await openStoryGroup(
                groups[groupIndex + 1],
                0
            );
            return;
        }

        closeViewer();
    }

    async function previousStory() {

        if (currentIndex > 0) {
            currentIndex -= 1;
            await renderCurrentStory();
            return;
        }

        const groups =
            getOrderedStoryGroups();

        const groupIndex =
            groups.findIndex(
                group =>
                    group[0]?.user_id ===
                    currentStory?.user_id
            );

        if (groupIndex > 0) {
            const previousGroup =
                groups[groupIndex - 1];
            await openStoryGroup(
                previousGroup,
                previousGroup.length - 1
            );
            return;
        }

        updateProgress(0);
    }

    function closeViewer() {

        clearTimers();

        $("#studentStoryViewer")
            .classList
            .remove(
                "active"
            );

        $("#studentStoryContent")
            .innerHTML =
            "";

        currentStory =
            null;

        currentGroup =
            [];

        currentIndex =
            0;
    }

    /* =========================================================
       MENU
    ========================================================= */

    function renderOwnerMenu() {

        const menu =
            $("#studentStoryOwnerMenu");

        if (
            currentStory.user_id ===
            currentUser.id
        ) {

            menu.innerHTML = `

                <button
                    id="storyMenuEdit"
                    type="button"
                >
                    تعديل
                </button>

                <button
                    id="storyMenuDelete"
                    type="button"
                >
                    حذف
                </button>
            `;

        } else {

            menu.innerHTML = `

                <button
                    id="storyMenuMute"
                    type="button"
                >
                    كتم قصص هذا المستخدم
                </button>
            `;
        }

        menu.classList.remove(
            "show"
        );

        $("#storyMenuEdit")?.addEventListener(
            "click",
            () => {

                const story =
                    currentStory;

                menu.classList.remove(
                    "show"
                );

                closeViewer();

                openCreateModal(
                    story
                );
            }
        );

        $("#storyMenuDelete")?.addEventListener(
            "click",
            () => {

                menu.classList.remove(
                    "show"
                );

                openDeleteConfirm();
            }
        );

        $("#storyMenuMute")?.addEventListener(
            "click",
            toggleMute
        );
    }

    /* =========================================================
       VIEWS
    ========================================================= */

    async function registerView(
        storyId
    ) {

        if (
            !currentUser
        ) {
            return;
        }

        const {
            data
        } =
            await sb
                .from(
                    "story_views"
                )
                .select(
                    "id"
                )
                .eq(
                    "story_id",
                    storyId
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        if (
            data
        ) {
            return;
        }

        await sb
            .from(
                "story_views"
            )
            .insert({
                story_id:
                    storyId,
                user_id:
                    currentUser.id
            });
    }

    async function updateViewCount() {

        const {
            count
        } =
            await sb
                .from(
                    "story_views"
                )
                .select(
                    "*",
                    {
                        count:
                            "exact",
                        head:
                            true
                    }
                )
                .eq(
                    "story_id",
                    currentStory.id
                );

        $("#studentStoryViewNumber")
            .textContent =
            count ||
            0;
    }

    async function openViewers() {

        if (
            !currentStory ||
            currentStory.user_id !==
                currentUser.id
        ) {
            return;
        }

        const {
            data,
            error
        } =
            await sb
                .from(
                    "story_views"
                )
                .select(
                    "user_id,viewed_at"
                )
                .eq(
                    "story_id",
                    currentStory.id
                )
                .order(
                    "viewed_at",
                    {
                        ascending:
                            false
                    }
                );

        if (
            error
        ) {

            toast(
                "تعذر تحميل المشاهدين",
                "error"
            );

            return;
        }

        const profiles =
            await getProfiles(
                (
                    data ||
                    []
                ).map(
                    row =>
                        row.user_id
                )
            );

        const list =
            $("#studentStoryViewersList");

        if (
            !data?.length
        ) {

            list.innerHTML = `
                <div
                    class="student-story-empty"
                >
                    لا توجد مشاهدات بعد
                </div>
            `;

        } else {

            list.innerHTML =
                data.map(
                    row => {

                        const profile =
                            profiles.get(
                                row.user_id
                            );

                        return `
                            <div
                                class="
                                    student-story-viewer-row
                                "
                            >

                                ${avatar(
                                    profile,
                                    "U"
                                )}

                                <div
                                    class="
                                        student-story-viewer-meta
                                    "
                                >

                                    <div
                                        class="
                                            student-story-viewer-name
                                        "
                                    >
                                        ${escapeHtml(
                                            getProfileName(
                                                profile,
                                                "مستخدم"
                                            )
                                        )}
                                    </div>

                                    <div
                                        class="
                                            student-story-viewer-time
                                        "
                                    >
                                        ${escapeHtml(
                                            timeAgo(
                                                row.viewed_at
                                            )
                                        )}
                                    </div>

                                </div>

                            </div>
                        `;
                    }
                ).join("");
        }

        $("#studentStoryViewersModal")
            .classList
            .add(
                "active"
            );
    }

    async function updateReplyCount() {
        const button = $("#studentStoryRepliesBtn");
        const number = $("#studentStoryReplyNumber");
        if (!button || !number || !currentStory || !currentUser) return;

        const isOwner = currentStory.user_id === currentUser.id;
        button.style.display = isOwner ? "flex" : "none";
        if (!isOwner) { number.textContent = "0"; return; }

        const { count, error } = await sb
            .from("story_replies")
            .select("id", { count: "exact", head: true })
            .eq("story_id", currentStory.id);

        number.textContent = error ? "0" : String(count || 0);
    }

    async function openStoryReplies() {
        if (!currentStory || !currentUser || currentStory.user_id !== currentUser.id) return;

        const { data, error } = await sb
            .from("story_replies")
            .select("user_id,message,created_at")
            .eq("story_id", currentStory.id)
            .order("created_at", { ascending: false });

        if (error) {
            toast(error.message || "تعذر تحميل الردود", "error");
            return;
        }

        const profiles = await getProfiles((data || []).map(row => row.user_id));
        const list = $("#studentStoryRepliesList");

        if (!data?.length) {
            list.innerHTML = `<div class="student-story-empty">لا توجد ردود بعد</div>`;
        } else {
            list.innerHTML = data.map(row => {
                const profile = profiles.get(row.user_id);
                return `
                    <div class="student-story-reply-owner-row">
                        ${avatar(profile, "U")}
                        <div class="student-story-viewer-meta">
                            <div class="student-story-viewer-name">${escapeHtml(getProfileName(profile, "مستخدم"))}${studentVerificationBadge(profile, 11)}</div>
                            <div class="student-story-viewer-time">${escapeHtml(timeAgo(row.created_at))}</div>
                            <div class="student-story-reply-owner-message">${escapeHtml(row.message || "")}</div>
                        </div>
                    </div>
                `;
            }).join("");
        }

        $("#studentStoryRepliesModal").classList.add("active");
    }

    /* =========================================================
       REACTIONS
    ========================================================= */

    async function loadReactionCounts() {

        const {
            data,
            error
        } =
            await sb
                .from(
                    "story_reactions"
                )
                .select(
                    "reaction,user_id"
                )
                .eq(
                    "story_id",
                    currentStory.id
                );

        if (
            error
        ) {
            return;
        }

        const counts = {
            "❤️": 0,
            "😂": 0,
            "🔥": 0,
            "👏": 0
        };

        let myReaction =
            null;

        for (
            const row of
            data || []
        ) {

            if (
                counts[
                    row.reaction
                ] !==
                    undefined
            ) {

                counts[
                    row.reaction
                ] +=
                    1;
            }

            if (
                row.user_id ===
                currentUser.id
            ) {

                myReaction =
                    row.reaction;
            }
        }

        const box =
            $("#studentStoryReactions");

        box.innerHTML =
            REACTIONS.map(
                reaction => `
                    <button
                        type="button"
                        class="
                            student-story-reaction
                            ${
                                reaction ===
                                myReaction
                                    ? "active"
                                    : ""
                            }
                        "
                        data-reaction="${reaction}"
                    >
                        ${reaction}

                        <span
                            class="reaction-count"
                        >
                            ${
                                counts[
                                    reaction
                                ] || 0
                            }
                        </span>

                    </button>
                `
            ).join("");

        $$(".student-story-reaction")
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            reactToStory(
                                button.dataset
                                    .reaction
                            );
                        }
                    );
                }
            );
    }

    async function reactToStory(
        reaction
    ) {

        if (
            !currentStory ||
            !currentUser
        ) {
            return;
        }

        const {
            data:
                existing
        } =
            await sb
                .from(
                    "story_reactions"
                )
                .select(
                    "id,reaction"
                )
                .eq(
                    "story_id",
                    currentStory.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        try {

            if (
                existing &&
                existing.reaction ===
                    reaction
            ) {

                const {
                    error
                } =
                    await sb
                        .from(
                            "story_reactions"
                        )
                        .delete()
                        .eq(
                            "id",
                            existing.id
                        );

                if (
                    error
                ) {
                    throw error;
                }

                toast(
                    "تم إلغاء التفاعل"
                );

            } else {

                const {
                    error
                } =
                    await sb
                        .from(
                            "story_reactions"
                        )
                        .upsert(
                            {
                                story_id:
                                    currentStory.id,
                                user_id:
                                    currentUser.id,
                                reaction
                            },
                            {
                                onConflict:
                                    "story_id,user_id"
                            }
                        );

                if (
                    error
                ) {
                    throw error;
                }

                toast(
                    "تم تسجيل التفاعل"
                );
            }

            await loadReactionCounts();

        } catch (error) {

            console.error(
                error
            );

            toast(
                error.message ||
                "تعذر تسجيل التفاعل",
                "error"
            );
        }
    }

    /* =========================================================
       REPLY
    ========================================================= */

    async function sendReply() {

        if (
            !currentStory ||
            !currentUser
        ) {
            return;
        }

        const input =
            $("#studentStoryReplyInput");

        const message =
            input.value.trim();

        if (
            !message
        ) {
            return;
        }

        if (
            !currentStory.reply_enabled
        ) {

            toast(
                "الردود مغلقة",
                "error"
            );

            return;
        }

        const {
            error
        } =
            await sb
                .from(
                    "story_replies"
                )
                .insert({
                    story_id:
                        currentStory.id,
                    user_id:
                        currentUser.id,
                    message
                });

        if (
            error
        ) {

            toast(
                error.message ||
                "تعذر إرسال الرد",
                "error"
            );

            return;
        }

        input.value =
            "";

        toast(
            "تم إرسال الرد"
        );
    }

    /* =========================================================
       MUTE
    ========================================================= */

    async function toggleMute() {

        if (
            !currentStory ||
            currentStory.user_id ===
                currentUser.id
        ) {
            return;
        }

        const {
            data:
                existing
        } =
            await sb
                .from(
                    "story_mutes"
                )
                .select(
                    "id"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .eq(
                    "muted_user_id",
                    currentStory.user_id
                )
                .maybeSingle();

        if (
            existing
        ) {

            await sb
                .from(
                    "story_mutes"
                )
                .delete()
                .eq(
                    "id",
                    existing.id
                );

            toast(
                "تم إلغاء الكتم"
            );

        } else {

            await sb
                .from(
                    "story_mutes"
                )
                .insert({
                    user_id:
                        currentUser.id,

                    muted_user_id:
                        currentStory.user_id
                });

            toast(
                "تم كتم قصص هذا المستخدم"
            );
        }

        $("#studentStoryOwnerMenu")
            .classList
            .remove(
                "show"
            );

        closeViewer();

        await loadStories();
    }

    /* =========================================================
       DELETE
    ========================================================= */

    function openDeleteConfirm() {

        if (
            !currentStory ||
            currentStory.user_id !==
                currentUser.id
        ) {
            return;
        }

        $("#studentStoryDeleteConfirm")
            .classList
            .add(
                "active"
            );
    }

    function closeDeleteConfirm() {

        $("#studentStoryDeleteConfirm")
            .classList
            .remove(
                "active"
            );
    }

    async function deleteCurrentStory() {

        if (
            !currentStory ||
            currentStory.user_id !==
                currentUser.id
        ) {
            return;
        }

        try {

            if (
                currentStory.media_path
            ) {

                await removeStorageFile(
                    currentStory.media_path
                );
            }

            const {
                error
            } =
                await sb
                    .from(
                        "stories"
                    )
                    .delete()
                    .eq(
                        "id",
                        currentStory.id
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (
                error
            ) {
                throw error;
            }

            closeDeleteConfirm();

            closeViewer();

            toast(
                "تم حذف الستوري"
            );

            await loadStories();

        } catch (error) {

            console.error(
                error
            );

            toast(
                error.message ||
                "تعذر حذف الستوري",
                "error"
            );
        }
    }

    /* =========================================================
       EVENTS
    ========================================================= */

    function setupEvents() {

        $("#studentStoryTextMode")
            .addEventListener(
                "click",
                () => {

                    setStoryMode(
                        "text"
                    );
                }
            );

        $("#studentStoryImageMode")
            .addEventListener(
                "click",
                () => {
                    setStoryMode(
                        "image"
                    );
                    const input =
                        $("#studentStoryFile");
                    input.value =
                        "";
                    input.click();
                }
            );

        $("#studentStoryVideoMode")
            .addEventListener(
                "click",
                () => {
                    setStoryMode(
                        "video"
                    );
                    const input =
                        $("#studentStoryFile");
                    input.value =
                        "";
                    input.click();
                }
            );

        $("#studentStoryEditorBack")
            .addEventListener(
                "click",
                closeCreateModal
            );

        $("#studentStoryFile")
            .addEventListener(
                "change",
                event => {

                    previewFile(
                        event.target.files[0]
                    );
                }
            );

        $("#studentStoryText")?.addEventListener("input", () => {
            if (storyMode === "text") updateTextStoryPreview();
            else if (storyMode === "image") {
                const overlay = $("#studentStoryOverlayText");
                if (overlay && !overlay.value) overlay.value = $("#studentStoryText").value;
                updateImageEditorPreview();
            }
        });

        $("#studentStoryTextColor")?.addEventListener("input", () => { updateTextStoryPreview(); updateImageEditorPreview(); });
        $("#studentStoryBackground")?.addEventListener("input", event => { editorBackground = event.target.value; updateTextStoryPreview(); });
        $("#studentStoryFont")?.addEventListener("change", event => { editorTextFont = event.target.value; updateTextStoryPreview(); updateImageEditorPreview(); });
        $("#studentStoryTextAlign")?.addEventListener("change", event => { editorTextAlign = event.target.value; updateTextStoryPreview(); updateImageEditorPreview(); });
        $("#studentStoryTextSize")?.addEventListener("input", event => { editorTextSize = Number(event.target.value); $("#studentStoryTextSizeValue").textContent = String(editorTextSize); updateTextStoryPreview(); updateImageEditorPreview(); });
        $("#studentStoryBrightness")?.addEventListener("input", event => { editorBrightness = Number(event.target.value); $("#studentStoryBrightnessValue").textContent = String(editorBrightness); updateImageEditorPreview(); });
        $("#studentStorySaturation")?.addEventListener("input", event => { editorSaturation = Number(event.target.value); $("#studentStorySaturationValue").textContent = String(editorSaturation); updateImageEditorPreview(); });
        $("#studentStoryOverlayText")?.addEventListener("input", updateImageEditorPreview);

        $("#studentStoryBackgroundPresets")?.addEventListener("click", event => {
            const btn = event.target.closest("button[data-bg]"); if (!btn) return;
            editorBackground = btn.dataset.bg;
            $$("#studentStoryBackgroundPresets button").forEach(b => b.classList.toggle("active", b === btn));
            if (editorBackground.startsWith("#")) $("#studentStoryBackground").value = editorBackground;
            updateTextStoryPreview();
        });

        $("#studentStoryFilterPresets")?.addEventListener("click", event => {
            const btn = event.target.closest("button[data-filter]"); if (!btn) return;
            editorFilter = btn.dataset.filter || "none";
            $$("#studentStoryFilterPresets button").forEach(b => b.classList.toggle("active", b === btn));
            updateImageEditorPreview();
        });

        $("#studentStoryCancel")
            .addEventListener(
                "click",
                closeCreateModal
            );

        $("#studentStoryPublish")
            .addEventListener(
                "click",
                saveStory
            );

        $("#studentStoryClose")
            .addEventListener(
                "click",
                closeViewer
            );

        $("#studentStoryPrev")
            .addEventListener(
                "click",
                previousStory
            );

        $("#studentStoryNext")
            .addEventListener(
                "click",
                nextStory
            );

        const storyContent =
            $("#studentStoryContent");

        storyContent.addEventListener(
            "click",
            event => {
                if (storySwipeMoved) {
                    storySwipeMoved = false;
                    return;
                }
                if (event.target.closest("button,input,textarea")) {
                    return;
                }
                toggleStoryPause();
            }
        );

        storyContent.addEventListener(
            "touchstart",
            event => {
                const touch =
                    event.touches[0];
                storySwipeStartX =
                    touch.clientX;
                storySwipeStartY =
                    touch.clientY;
                storySwipeMoved =
                    false;
            },
            { passive:true }
        );

        storyContent.addEventListener(
            "touchend",
            event => {
                const touch =
                    event.changedTouches[0];
                const dx =
                    touch.clientX -
                    storySwipeStartX;
                const dy =
                    touch.clientY -
                    storySwipeStartY;

                if (
                    Math.abs(dx) < 45 ||
                    Math.abs(dx) <= Math.abs(dy)
                ) {
                    return;
                }

                storySwipeMoved =
                    true;

                setStoryPaused(false);

                if (dx < 0) {
                    nextStory();
                } else {
                    previousStory();
                }
            },
            { passive:true }
        );

        $("#studentStoryMenu")
            .addEventListener(
                "click",
                () => {

                    $("#studentStoryOwnerMenu")
                        .classList
                        .toggle(
                            "show"
                        );
                }
            );

        $("#studentStoryDeleteCancel")
            .addEventListener(
                "click",
                closeDeleteConfirm
            );

        $("#studentStoryDeleteConfirmBtn")
            .addEventListener(
                "click",
                deleteCurrentStory
            );

        $("#studentStoryViewsBtn")
            .addEventListener(
                "click",
                openViewers
            );

        $("#studentStoryRepliesBtn")
            .addEventListener(
                "click",
                openStoryReplies
            );

        $("#studentStoryRepliesClose")
            .addEventListener(
                "click",
                () => {
                    $("#studentStoryRepliesModal")
                        .classList
                        .remove("active");
                }
            );

        $("#studentStoryViewersClose")
            .addEventListener(
                "click",
                () => {

                    $("#studentStoryViewersModal")
                        .classList
                        .remove(
                            "active"
                        );
                }
            );

        $("#studentStoryReplySend")
            .addEventListener(
                "click",
                sendReply
            );

        $("#studentStoryReplyInput")
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        sendReply();
                    }
                }
            );

        $("#studentStoryViewer")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryViewer"
                    ) {

                        closeViewer();
                    }
                }
            );

        $("#studentStoryRepliesModal")
            .addEventListener(
                "click",
                event => {
                    if (event.target.id === "studentStoryRepliesModal") {
                        $("#studentStoryRepliesModal").classList.remove("active");
                    }
                }
            );

        $("#studentStoryDeleteConfirm")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryDeleteConfirm"
                    ) {

                        closeDeleteConfirm();
                    }
                }
            );

        $("#studentStoryViewersModal")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryViewersModal"
                    ) {

                        $("#studentStoryViewersModal")
                            .classList
                            .remove(
                                "active"
                            );
                    }
                }
            );
    }

    /* =========================================================
       AUTH
    ========================================================= */

    function watchAuth() {

        if (
            !sb
        ) {
            return;
        }

        sb.auth.onAuthStateChange(
            async (
                _event,
                session
            ) => {

                currentUser =
                    session?.user ||
                    null;

                if (
                    currentUser
                ) {

                    await loadStories();
                }
            }
        );
    }

    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.openStudentStoryCreator =
        function() {

            openCreateModal();
        };

    window.StudentOpenStoryCreator =
        window.openStudentStoryCreator;


    window.StudentStories = window.StudentStories || {};
    window.StudentStories.openById = async function(storyId) {
        if (!storyId) return false;
        if (!stories.length) await loadStories();
        const target = stories.find(item => String(item.id) === String(storyId));
        if (!target) return false;
        const group = stories.filter(item => String(item.user_id) === String(target.user_id));
        const index = group.findIndex(item => String(item.id) === String(storyId));
        await openStoryGroup(group, Math.max(0, index));
        return true;
    };

    /* =========================================================
       INIT
    ========================================================= */

    async function init() {

        addStyles();

        ensureUI();

        /*
         * Render the permanent Add Story entry immediately.
         * It must not depend on Supabase/session initialization, otherwise
         * a slow or failed connection leaves the stories strip empty.
         */
        setupStoriesContainer();
        document.body.classList.add("student-stories-ready");

        const ready =
            await initSupabase();

        if (
            !ready
        ) {
            return;
        }

        await loadUser();

        setupEvents();

        watchAuth();

        if (
            currentUser
        ) {

            await loadStories();
        } else {
            document.body.classList.add("student-stories-ready");
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();


/* ===== MERGED MODULE: feed.js ===== */
/* =========================================================
   Student - Feed System
   Text Posts + Images ONLY
   Lightweight text and image feed
========================================================= */

(function () {

    "use strict";


    if (
        window.__studentFeedLoaded
    ) {
        return;
    }


    window.__studentFeedLoaded =
        true;


    let feedContainer = null;
    let loading = false;
    let started = false;


    /* =====================================================
       Supabase
    ===================================================== */

    function getSupabase() {

        if (
            typeof supabaseClient !==
                "undefined" &&
            supabaseClient
        ) {

            return supabaseClient;
        }

        return null;
    }


    async function waitForSupabase(
        maxAttempts = 50
    ) {

        for (
            let i = 0;
            i < maxAttempts;
            i++
        ) {

            if (
                getSupabase()
            ) {

                return getSupabase();
            }

            await new Promise(
                function(resolve) {

                    setTimeout(
                        resolve,
                        200
                    );

                }
            );
        }

        return null;
    }


    /* =====================================================
       حماية HTML
    ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value || ""
        )

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );
    }


    /* =====================================================
       CSS
    ===================================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "student-feed-style"
            )
        ) {

            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "student-feed-style";


        style.textContent = `

            .student-feed-container {
                width:100%;
                max-width:680px;
                margin:18px auto 0;
                padding:0 10px 100px;
                box-sizing:border-box;
            }


            .student-feed-loading {
                text-align:center;
                padding:35px 15px;
                color:#888;
            }


            .student-feed-spinner {
                width:32px;
                height:32px;
                border:3px solid #e5e7eb;
                border-top-color:#0095f6;
                border-radius:50%;
                margin:0 auto 12px;
                animation:
                    studentFeedSpin
                    .7s linear infinite;
            }


            @keyframes studentFeedSpin {

                to {
                    transform:rotate(360deg);
                }

            }


            .student-feed-empty {
                text-align:center;
                padding:45px 15px;
                color:#888;
            }


            .student-feed-empty-icon {
                width:75px;
                height:75px;
                margin:0 auto 15px;
                border-radius:22px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:30px;
            }


            .student-feed-error {
                text-align:center;
                padding:30px 15px;
                color:#d93025;
                line-height:1.8;
            }


            .student-feed-refresh {
                width:100%;
                border:none;
                background:#f7f8fa;
                color:#0095f6;
                padding:11px;
                border-radius:12px;
                cursor:pointer;
                font-size:13px;
                margin-bottom:10px;
            }


            .student-feed-card {
                background:#fff;
                border:1px solid #eee;
                border-radius:18px;
                margin:12px 0;
                overflow:hidden;
                box-shadow:
                    0 3px 15px
                    rgba(0,0,0,.04);
            }


            .student-feed-header {
                display:flex;
                align-items:center;
                gap:10px;
                padding:13px;
            }


            .student-feed-avatar {
                width:42px;
                height:42px;
                border-radius:50%;
                object-fit:cover;
                background:#eaf5ff;
                flex-shrink:0;
            }


            .student-feed-avatar-placeholder {
                width:42px;
                height:42px;
                border-radius:50%;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-shrink:0;
            }


            .student-feed-user {
                flex:1;
                min-width:0;
            }


            .student-feed-name {
                font-size:14px;
                font-weight:800;
                color:#222;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
            }


            .student-feed-username {
                margin-top:3px;
                font-size:11px;
                color:#0095f6;
                direction:ltr;
                text-align:right;
            }


            .student-feed-time {
                font-size:10px;
                color:#999;
                white-space:nowrap;
            }


            .student-feed-text {
                padding:
                    0 14px 15px;
                color:#333;
                line-height:1.9;
                white-space:pre-wrap;
                word-break:break-word;
                font-size:15px;
            }


            .student-feed-image {
                width:100%;
                max-height:680px;
                display:block;
                object-fit:cover;
                background:#f3f4f6;
            }


            .student-feed-caption {
                padding:13px 14px;
                color:#444;
                line-height:1.8;
                font-size:14px;
                white-space:pre-wrap;
                word-break:break-word;
            }


            .student-feed-actions {
                display:flex;
                align-items:center;
                gap:4px;
                padding:9px 10px;
                border-top:1px solid #f0f0f0;
            }


            .student-feed-action {
                width:42px;
                height:42px;
                border:none;
                border-radius:50%;
                background:transparent;
                color:#444;
                cursor:pointer;
                font-size:17px;
                display:flex;
                align-items:center;
                justify-content:center;
            }


            .student-feed-action:hover {
                background:#f3f5f7;
            }


            .student-feed-action.save {
                margin-right:auto;
            }


            .student-feed-type {
                padding:5px 8px;
                border-radius:8px;
                background:#f1f3f5;
                color:#777;
                font-size:10px;
            }


            @media (max-width:680px) {

                .student-feed-container {
                    padding-left:5px;
                    padding-right:5px;
                }


                .student-feed-card {
                    border-radius:14px;
                }

            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       إنشاء مكان Feed
    ===================================================== */

    function createFeedContainer() {

        if (
            feedContainer &&
            document.body.contains(
                feedContainer
            )
        ) {

            return feedContainer;
        }


        const host =
            document.querySelector(
                ".main-content"
            ) ||
            document.querySelector(
                "#main-screen"
            ) ||
            document.querySelector(
                "main"
            );


        if (!host) {

            console.warn(
                "Feed host not found."
            );

            return null;
        }


        feedContainer =
            document.createElement(
                "div"
            );


        feedContainer.id =
            "student-feed-container";


        feedContainer.className =
            "student-feed-container";


        host.appendChild(
            feedContainer
        );


        return feedContainer;
    }


    /* =====================================================
       تحميل المنشورات فقط
       مهم:
       لا نحمل جدول reels هنا
    ===================================================== */

    async function loadPosts(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from("posts")
                .select(`
                    id,
                    user_id,
                    post_type,
                    content,
                    media_url,
                    created_at,
                    updated_at
                `)

                .in(
                    "post_type",
                    [
                        "text",
                        "image"
                    ]
                )

                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                )

                .limit(
                    50
                );


        if (error) {
            throw error;
        }


        return data || [];
    }


    /* =====================================================
       Profiles
    ===================================================== */

    async function loadProfiles(
        client,
        ids
    ) {

        if (
            !ids.length
        ) {

            return {};
        }


        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    username,
                    avatar_url,
                    role,
                    is_verified,
                    verification_color,
                    custom_badge_icon,
                    custom_badge_label,
                    custom_badge_color,
                    profile_frame_url
                `)
                .in(
                    "id",
                    ids
                );


        if (error) {

            console.error(
                "Feed profiles error:",
                error
            );

            return {};
        }


        const result = {};


        (data || [])
            .forEach(
                function(profile) {

                    result[
                        profile.id
                    ] =
                        profile;
                }
            );


        return result;
    }


    /* =====================================================
       Avatar
    ===================================================== */

    function avatarHTML(
        profile
    ) {

        if (profile?.avatar_url) {
            return window.studentProfileFrameWrap(profile, `<img class="student-feed-avatar" src="${escapeHTML(profile.avatar_url)}" alt="" loading="lazy" decoding="async">`);
        }
        return window.studentProfileFrameWrap(profile, `<div class="student-feed-avatar-placeholder"><i class="fa-solid fa-user"></i></div>`);
    }


    /* =====================================================
       التاريخ
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(
                value
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        return date.toLocaleString(
            "ar-IQ",
            {
                dateStyle:
                    "medium",

                timeStyle:
                    "short"
            }
        );
    }


    /* =====================================================
       بطاقة المنشور
    ===================================================== */

    function renderCard(
        post,
        profiles
    ) {

        const profile =
            profiles[
                post.user_id
            ] || {};


        const name =
            profile.full_name ||
            profile.username ||
            "مستخدم";


        const username =
            profile.username ||
            "username";


        let contentHTML =
            "";


        let typeLabel =
            "نص";


        if (
            post.post_type ===
            "image"
        ) {

            typeLabel =
                "صورة";


            contentHTML = `

                ${
                    post.media_url
                        ? `

                            <img
                                class="
                                    student-feed-image
                                "
                                src="${escapeHTML(
                                    post.media_url
                                )}"
                                alt=""
                                loading="lazy"
                            >

                        `
                        : ""
                }


                ${
                    post.content
                        ? `

                            <div class="
                                student-feed-caption
                            ">

                                ${escapeHTML(
                                    post.content
                                )}

                            </div>

                        `
                        : ""
                }

            `;

        } else {

            typeLabel =
                "نص";


            contentHTML = `

                <div class="
                    student-feed-text
                ">

                    ${escapeHTML(
                        post.content ||
                        ""
                    )}

                </div>

            `;
        }


        return `

            <article
                class="
                    student-feed-card
                "
                data-feed-id="${escapeHTML(
                    post.id
                )}"
                data-feed-kind="post"
            >

                <div class="
                    student-feed-header
                "
                data-feed-profile="${escapeHTML(post.user_id)}"
                style="cursor:pointer"
                >

                    ${avatarHTML(
                        profile
                    )}


                    <div class="
                        student-feed-user
                    ">

                        <div class="
                            student-feed-name
                        ">

                            ${escapeHTML(
                                name
                            )}
                            ${studentVerificationBadge(profile, 14)}

                        </div>


                        <div class="
                            student-feed-username
                        ">

                            @${escapeHTML(
                                username
                            )}

                        </div>

                    </div>


                    <div class="
                        student-feed-time
                    ">

                        ${escapeHTML(
                            formatDate(
                                post.created_at
                            )
                        )}

                    </div>

                </div>


                ${contentHTML}


                <div class="
                    student-feed-actions
                ">

                    <span class="
                        student-feed-type
                    ">
                        ${typeLabel}
                    </span>


                    <button
                        type="button"
                        class="
                            student-feed-action
                        "
                        data-feed-like
                        title="إعجاب"
                    >

                        <i class="
                            fa-regular
                            fa-heart
                        "></i>

                    </button>


                    <button
                        type="button"
                        class="
                            student-feed-action
                        "
                        data-feed-comment
                        title="تعليق"
                    >

                        <i class="
                            fa-regular
                            fa-comment
                        "></i>

                    </button>


                    <button
                        type="button"
                        class="
                            student-feed-action
                        "
                        data-feed-share
                        title="مشاركة"
                    >

                        <i class="
                            fa-solid
                            fa-share
                        "></i>

                    </button>


                    <button
                        type="button"
                        class="
                            student-feed-action
                            save
                        "
                        data-feed-save
                        title="حفظ"
                    >

                        <i class="
                            fa-regular
                            fa-bookmark
                        "></i>

                    </button>

                </div>

            </article>

        `;
    }


    /* =====================================================
       حالة فارغة
    ===================================================== */

    function renderEmpty() {

        if (!feedContainer) {
            return;
        }


        feedContainer.innerHTML = `

            <div class="
                student-feed-empty
            ">

                <div class="
                    student-feed-empty-icon
                ">

                    <i class="
                        fa-regular
                        fa-newspaper
                    "></i>

                </div>


                <div style="
                    font-weight:800;
                    color:#555;
                    margin-bottom:7px;
                ">

                    لا توجد منشورات بعد

                </div>


                <div style="
                    font-size:13px;
                    line-height:1.8;
                ">

                    كن أول من ينشر شيئًا
                    في Student.

                </div>

            </div>

        `;
    }


    /* =====================================================
       تحميل Feed
    ===================================================== */

    async function loadFeed() {

        if (loading) {
            return;
        }


        loading =
            true;


        try {

            const client =
                await waitForSupabase();


            if (!client) {

                throw new Error(
                    "Supabase لم يجهز بعد."
                );
            }


            const container =
                createFeedContainer();


            if (!container) {

                throw new Error(
                    "لم يتم العثور على مكان Feed."
                );
            }


            container.innerHTML = `

                <div class="
                    student-feed-loading
                ">

                    <div class="
                        student-feed-spinner
                    "></div>

                    جاري تحميل المنشورات...

                </div>

            `;


            /*
               مهم جدًا:
               هنا نحمل posts فقط.
               لا يوجد loadReels().
            */

            const posts =
                await loadPosts(
                    client
                );


            if (
                !posts.length
            ) {

                renderEmpty();

                return;
            }


            const userIds =
                Array.from(
                    new Set(
                        posts.map(
                            function(post) {

                                return post.user_id;
                            }
                        )
                    )
                );


            const profiles =
                await loadProfiles(
                    client,
                    userIds
                );


            feedContainer.innerHTML = `

                <button
                    id="student-feed-refresh"
                    class="
                        student-feed-refresh
                    "
                    type="button"
                >

                    <i class="
                        fa-solid
                        fa-rotate
                    "></i>

                    تحديث المنشورات

                </button>


                ${posts.map(
                    function(post) {

                        return renderCard(
                            post,
                            profiles
                        );

                    }
                ).join("")}

            `;


            bindFeedActions();


            document
                .getElementById(
                    "student-feed-refresh"
                )
                ?.addEventListener(
                    "click",
                    loadFeed
                );


        } catch (error) {

            console.error(
                "Feed error:",
                error
            );


            if (feedContainer) {

                feedContainer.innerHTML = `

                    <div class="
                        student-feed-error
                    ">

                        ⚠️

                        <div>
                            تعذر تحميل المنشورات حاليًا.
                        </div>


                        <div style="
                            color:#999;
                            font-size:11px;
                            margin-top:8px;
                        ">

                            ${escapeHTML(
                                error?.message ||
                                ""
                            )}

                        </div>


                        <button
                            id="student-feed-retry"
                            style="
                                margin-top:12px;
                                border:none;
                                background:#0095f6;
                                color:white;
                                padding:10px 18px;
                                border-radius:10px;
                                cursor:pointer;
                            "
                        >
                            إعادة المحاولة
                        </button>

                    </div>

                `;


                document
                    .getElementById(
                        "student-feed-retry"
                    )
                    ?.addEventListener(
                        "click",
                        loadFeed
                    );
            }

        } finally {

            loading =
                false;
        }
    }


    /* =====================================================
       المحفوظات
    ===================================================== */

    async function ensureSavedSystem() {

        if (
            typeof window.saveStudentItem ===
            "function"
        ) {

            return true;
        }


        return new Promise(
            function(resolve) {

                const existing =
                    document.querySelector(
                        'script[data-student-saved="true"]'
                    );


                if (existing) {

                    let attempts =
                        0;


                    const timer =
                        setInterval(
                            function() {

                                attempts++;


                                if (
                                    typeof window.saveStudentItem ===
                                    "function"
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(
                                        true
                                    );

                                    return;
                                }


                                if (
                                    attempts >=
                                    30
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(
                                        false
                                    );
                                }

                            },
                            100
                        );


                    return;
                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "settings.js?v=3.0.0";


                script.async =
                    true;


                script.dataset.studentSaved =
                    "true";


                script.onload =
                    function() {

                        resolve(
                            typeof window.saveStudentItem ===
                            "function"
                        );
                    };


                script.onerror =
                    function() {

                        resolve(
                            false
                        );
                    };


                document.body.appendChild(
                    script
                );

            }
        );
    }


    /* =====================================================
       إجراءات Feed
    ===================================================== */

    function bindFeedActions() {

        if (!feedContainer) {
            return;
        }


        /* فتح ملف صاحب المنشور */

        feedContainer
            .querySelectorAll("[data-feed-profile]")
            .forEach(function(element) {
                element.addEventListener("click", function(event) {
                    if (event.target.closest("button")) return;
                    window.StudentProfile?.open?.(element.dataset.feedProfile);
                });
            });


        /* إعجاب */

        feedContainer
            .querySelectorAll(
                "[data-feed-like]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            button.classList.toggle(
                                "active"
                            );

                            toast(
                                button.classList.contains(
                                    "active"
                                )
                                    ? "❤️ تمت الإعجاب"
                                    : "تم إلغاء الإعجاب"
                            );
                        }
                    );
                }
            );


        /* تعليق */

        feedContainer
            .querySelectorAll(
                "[data-feed-comment]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            toast(
                                "التعليقات ستُفعّل قريبًا."
                            );

                        }
                    );
                }
            );


        /* مشاركة */

        feedContainer
            .querySelectorAll(
                "[data-feed-share]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            if (
                                navigator.share
                            ) {

                                try {

                                    await navigator.share({

                                        title:
                                            "Student",

                                        text:
                                            "شاهد هذا المنشور في Student",

                                        url:
                                            window.location.href

                                    });

                                } catch (error) {

                                    if (
                                        error?.name !==
                                        "AbortError"
                                    ) {

                                        toast(
                                            "تعذر المشاركة."
                                        );
                                    }

                                }

                            } else {

                                toast(
                                    "المشاركة غير متاحة."
                                );
                            }
                        }
                    );
                }
            );


        /* حفظ */

        feedContainer
            .querySelectorAll(
                "[data-feed-save]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const ready =
                                await ensureSavedSystem();


                            if (!ready) {

                                toast(
                                    "تعذر تحميل المحفوظات."
                                );

                                return;
                            }


                            const card =
                                button.closest(
                                    "[data-feed-id]"
                                );


                            const id =
                                card?.dataset.feedId;


                            const result =
                                await window.saveStudentItem(
                                    "post",
                                    id
                                );


                            if (
                                result?.success
                            ) {

                                button.innerHTML =
                                    `
                                    <i class="
                                        fa-solid
                                        fa-bookmark
                                    "></i>
                                    `;


                                toast(
                                    result.alreadySaved
                                        ? "المحتوى محفوظ مسبقًا."
                                        : "تم حفظ المنشور."
                                );

                            } else {

                                toast(
                                    result?.error ||
                                    "تعذر الحفظ."
                                );
                            }

                        }
                    );
                }
            );
    }


    /* =====================================================
       رسالة مؤقتة
    ===================================================== */

    function toast(
        message
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.textContent =
            message;


        element.style.position =
            "fixed";

        element.style.left =
            "50%";

        element.style.bottom =
            "90px";

        element.style.transform =
            "translateX(-50%)";

        element.style.zIndex =
            "10000000";

        element.style.background =
            "#222";

        element.style.color =
            "#fff";

        element.style.padding =
            "11px 16px";

        element.style.borderRadius =
            "12px";

        element.style.fontSize =
            "13px";

        element.style.direction =
            "rtl";

        element.style.boxShadow =
            "0 8px 30px rgba(0,0,0,.2)";


        document.body.appendChild(
            element
        );


        setTimeout(
            function() {

                element.remove();

            },
            2200
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.loadStudentFeed =
        loadFeed;


    /* =====================================================
       تشغيل
    ===================================================== */

    function startFeed() {

        if (started) {
            return;
        }


        started =
            true;


        injectStyles();


        createFeedContainer();


        setTimeout(
            loadFeed,
            1000
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startFeed
        );

    } else {

        startFeed();
    }


})();


/* ===== MERGED MODULE: search.js optimized ===== */

(function(){
"use strict";
if(window.__studentSearchLoaded) return;
window.__studentSearchLoaded=true;
let fallbackPage=null,timer=null,controller=null;
let lastQuery="", lastScroll=0;
const db=()=>typeof supabaseClient!=="undefined"?supabaseClient:null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safeUrl=(value,allowData=false)=>{
 if(window.StudentSecurity?.safeURL)return window.StudentSecurity.safeURL(value,{allowData});
 try{const u=new URL(String(value||""),window.location.origin);return ["http:","https:","blob:"].includes(u.protocol)?u.href:""}catch(_){return""}
};
const safeSearch=value=>window.StudentSecurity?.sanitizeSearchTerm?window.StudentSecurity.sanitizeSearchTerm(value):String(value||"").replace(/[,%()]/g," ").trim().slice(0,80);
const BODY_HTML=`<div class="student-search-shell" style="height:100%;display:flex;flex-direction:column;background:#f7f8fb"><div style="padding:12px;background:#fff;border-bottom:1px solid #edf0f4"><input id="student-search-input" placeholder="ابحث بالاسم أو اسم المستخدم" autocomplete="off" style="width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:14px;padding:13px;font:inherit;background:#fff;outline:none"></div><div id="student-search-results" style="padding:12px 12px 90px;overflow:auto;display:grid;gap:8px;flex:1;min-height:0"></div></div>`;

function bind(body){
 const input=body.querySelector('#student-search-input');
 const box=body.querySelector('#student-search-results');
 if(!input||!box||body.dataset.searchBound==='1')return;
 body.dataset.searchBound='1';
 input.value=lastQuery;
 input.addEventListener('input',e=>{lastQuery=e.target.value;clearTimeout(timer);timer=setTimeout(()=>run(lastQuery,body),260)});
 box.addEventListener('scroll',()=>{lastScroll=box.scrollTop},{passive:true});
 body.addEventListener('click',async e=>{
   const r=e.target.closest('[data-search-target]');
   if(!r)return;
   e.preventDefault();
   const type=r.dataset.searchTarget;
   const id=r.dataset.targetId||'';
   await openTarget(type,id,r.dataset);
 });
 if(lastQuery.trim().length>=2) run(lastQuery,body); else box.innerHTML='<div style="text-align:center;color:#7b8491;padding:45px 12px">اكتب حرفين على الأقل</div>';
 requestAnimationFrame(()=>{box.scrollTop=lastScroll});
}

async function openTarget(type,id,data={}){
 if(type==='profile'&&id){
   if(window.StudentProfile?.open){window.StudentProfile.open(id);return;}
   if(typeof window.openStudentProfile==='function'){window.openStudentProfile(id);return;}
 }
 if(type==='messages'){
   if(window.StudentMessages?.openTarget){await window.StudentMessages.openTarget(id);return;}
   if(window.StudentMessages?.open){await window.StudentMessages.open();return;}
 }
 if(type==='story'&&id&&window.StudentStories?.openById){await window.StudentStories.openById(id);return;}
 if(type==='store'&&typeof window.openStudentStoreSection==='function'){window.openStudentStoreSection();return;}
 document.dispatchEvent(new CustomEvent('student:search-target',{detail:{type,id,data}}));
}

function getBody(){
 if(window.StudentNavigation?.openPage){
   const page=window.StudentNavigation.openPage({id:'search',title:'البحث',html:BODY_HTML,reuse:true});
   const body=page?.querySelector('.student-internal-body');
   if(body)bind(body);
   return body;
 }
 if(!fallbackPage){
   fallbackPage=document.createElement('section');
   fallbackPage.id='student-search-page';
   fallbackPage.style.cssText='position:fixed;inset:0;z-index:2147482400;background:#f7f8fb;display:none;flex-direction:column;direction:rtl';
   fallbackPage.innerHTML=`<header style="height:62px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 14px"><button data-search-back style="border:0;background:#eef2f6;width:40px;height:40px;border-radius:50%;font-size:22px">‹</button><strong style="font-size:19px">البحث</strong></header><main style="flex:1;min-height:0">${BODY_HTML}</main>`;
   document.body.appendChild(fallbackPage);
   fallbackPage.querySelector('[data-search-back]').onclick=close;
   bind(fallbackPage);
 }
 fallbackPage.style.display='flex';
 return fallbackPage;
}

async function run(value,root){
 const q=String(value||'').trim();
 const box=(root||document).querySelector('#student-search-results');
 if(!box)return;
 if(q.length<2){box.innerHTML='<div style="text-align:center;color:#7b8491;padding:45px 12px">اكتب حرفين على الأقل</div>';return;}
 controller?.abort(); controller=new AbortController();
 box.innerHTML='<div style="text-align:center;padding:35px;color:#777">جارٍ البحث...</div>';
 try{
   const client=db(); if(!client)throw new Error('Supabase غير جاهز');
   const safe=safeSearch(q);
   const {data,error}=await client.from('profiles').select('id,full_name,username,avatar_url,role,is_verified,verification_color,custom_badge_icon,custom_badge_label,custom_badge_color,profile_frame_url').or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`).limit(30);
   if(error)throw error;
   box.innerHTML=(data||[]).map(x=>`<button type="button" data-search-target="profile" data-target-id="${esc(x.id)}" style="border:1px solid #e5e7eb;background:#fff;border-radius:16px;padding:10px;display:grid;grid-template-columns:48px 1fr auto;gap:10px;text-align:right;align-items:center;box-shadow:0 2px 9px rgba(16,24,40,.04)">${studentProfileFrameWrap(x, `<img src="${esc(safeUrl(x.avatar_url||'',true))}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#edf1f5">`)}<span><strong>${esc(x.full_name||x.username||'مستخدم')}${studentVerificationBadge(x,14)}</strong><small style="display:block;color:#7b8491;margin-top:3px">@${esc(x.username||'')}</small></span><span aria-hidden="true" style="color:#9aa3af;font-size:20px">‹</span></button>`).join('')||'<div style="text-align:center;color:#7b8491;padding:45px 12px">لا توجد نتائج</div>';
   requestAnimationFrame(()=>{box.scrollTop=lastScroll});
 }catch(err){if(err.name!=='AbortError')box.innerHTML='<div style="text-align:center;color:#b3261e;padding:35px">تعذر البحث حاليًا</div>';}
}
function open(){const body=getBody();setTimeout(()=>body?.querySelector('#student-search-input')?.focus(),50)}
function close(){controller?.abort();if(window.StudentNavigation?.closeById){window.StudentNavigation.closeById('search');return;}if(fallbackPage)fallbackPage.style.display='none'}
window.openStudentSearch=open;window.closeStudentSearch=close;
})();


/* ===== MERGED MODULE: messages.js ===== */
/* =========================================================
   Student Messages - Fast modern chat, groups and channels
========================================================= */
(function(){
'use strict';
if(window.StudentMessages) return;

const S={
    user:null,page:null,view:'list',conversations:[],current:null,messages:[],members:[],profiles:{},
    channel:null,typing:null,reply:null,editing:null,loading:false,chatLoading:false,historyOpen:false,
    chatRefreshTimer:null,listRefreshTimer:null,searchSeq:0,lastReadAt:0
};
const sb=()=>typeof supabaseClient!=='undefined'?supabaseClient:null;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const safeUrl=(value,allowData=false)=>{
 if(window.StudentSecurity?.safeURL)return window.StudentSecurity.safeURL(value,{allowData});
 try{const u=new URL(String(value||''),window.location.origin);return ['http:','https:','blob:'].includes(u.protocol)?u.href:''}catch(_){return''}
};
const safeSearch=value=>window.StudentSecurity?.sanitizeSearchTerm?window.StudentSecurity.sanitizeSearchTerm(value):String(value||'').replace(/[,%()]/g,' ').trim().slice(0,80);
const fmt=v=>{try{const d=new Date(v);const now=new Date();if(d.toDateString()===now.toDateString())return new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit'}).format(d);return new Intl.DateTimeFormat('ar-IQ',{month:'short',day:'numeric'}).format(d)}catch{return''}};
const badge=(p,size=13)=>typeof window.studentVerificationBadge==='function'?window.studentVerificationBadge(p,size):'';

function css(){if(document.getElementById('student-messages-style'))return;const s=document.createElement('style');s.id='student-messages-style';s.textContent=`
#student-messages-page{position:fixed;inset:0;z-index:10040;background:#f4f7fb;display:none;direction:rtl;color:#111827;overflow:hidden}.sm-open{display:flex!important;flex-direction:column}.sm-head{height:68px;display:flex;align-items:center;gap:10px;padding:0 14px;background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border-bottom:1px solid #e8edf4;flex:0 0 auto;z-index:5}.sm-back,.sm-icon,.sm-send,.sm-fab,.sm-mini{border:0;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent}.sm-back,.sm-icon{width:42px;height:42px;border-radius:14px;background:#eef2f7;color:#172033;display:grid;place-items:center;font-size:20px;flex:0 0 42px}.sm-back:active,.sm-icon:active,.sm-send:active,.sm-fab:active{transform:scale(.96)}.sm-heading{min-width:0;flex:1}.sm-title{font-size:18px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:2px}.sm-sub{font-size:11px;color:#7b8695;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sm-search{padding:10px 14px 8px;background:#fff}.sm-searchbox{display:flex;align-items:center;gap:9px;background:#f0f3f7;border:1px solid transparent;border-radius:16px;padding:0 13px;transition:.15s}.sm-searchbox:focus-within{background:#fff;border-color:#bfdbfe;box-shadow:0 0 0 3px rgba(8,124,255,.08)}.sm-searchbox input{width:100%;border:0;background:transparent;outline:0;padding:12px 0;font:inherit;font-size:14px}.sm-body{flex:1;overflow:auto;max-width:860px;width:100%;margin:0 auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.sm-list{padding:7px 10px 92px}.sm-row{display:flex;gap:12px;align-items:center;background:#fff;padding:11px 12px;border-radius:18px;margin-bottom:7px;border:1px solid #e9edf3;cursor:pointer;min-height:62px;box-shadow:0 4px 14px rgba(15,23,42,.025);content-visibility:auto;contain-intrinsic-size:72px}.sm-row:active{background:#f7faff;transform:scale(.995)}.sm-avatar{width:50px;height:50px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,#eaf2ff,#dfe8f5);display:grid;place-items:center;font-weight:900;flex:0 0 50px;color:#47709f}.sm-avatar.sm-small{width:42px;height:42px;flex-basis:42px}.sm-main{min-width:0;flex:1}.sm-name{font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:2px}.sm-preview{font-size:12px;color:#737f8f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}.sm-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.sm-time{font-size:10px;color:#98a2b1;white-space:nowrap}.sm-count{min-width:21px;height:21px;border-radius:11px;background:#087cff;color:#fff;font-size:10px;font-weight:900;display:grid;place-items:center;padding:0 6px}.sm-fab{position:fixed;left:20px;bottom:84px;width:56px;height:56px;border-radius:18px;background:#087cff;color:#fff;font-size:23px;box-shadow:0 12px 28px rgba(8,124,255,.3);z-index:4}.sm-empty{text-align:center;color:#788495;padding:64px 20px}.sm-empty-icon{width:74px;height:74px;border-radius:24px;background:#fff;display:grid;place-items:center;margin:0 auto 14px;font-size:28px;box-shadow:0 10px 28px rgba(20,40,70,.07)}.sm-skeleton{height:68px;border-radius:18px;margin:0 0 8px;background:linear-gradient(90deg,#eef2f6 25%,#f8fafc 45%,#eef2f6 65%);background-size:220% 100%;animation:smShimmer 1.2s infinite}@keyframes smShimmer{to{background-position:-220% 0}}.sm-chat{display:flex;flex-direction:column;height:100%;min-height:0}.sm-msgs{flex:1;overflow:auto;padding:14px 12px 96px;background:linear-gradient(180deg,#edf3f9 0,#f4f7fb 100%);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.sm-msg{max-width:min(78%,620px);margin:4px 0;padding:8px 11px 7px;border-radius:17px 17px 17px 5px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.07);position:relative;content-visibility:auto;contain-intrinsic-size:48px}.sm-msg.mine{margin-right:auto;background:#dff0ff;border-radius:17px 17px 5px 17px}.sm-msg.pending{opacity:.66}.sm-msg.system{margin:10px auto;background:#dde6ef;color:#526171;text-align:center;max-width:90%;border-radius:999px;font-size:11px;padding:7px 12px}.sm-author{font-size:11px;font-weight:900;color:#087cff;margin-bottom:3px;display:flex;align-items:center;gap:2px}.sm-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;font-size:14px}.sm-reply{border-right:3px solid #087cff;background:rgba(8,124,255,.08);padding:6px 8px;border-radius:9px;margin-bottom:6px;font-size:11px;color:#526171}.sm-media{display:block;max-width:100%;max-height:340px;border-radius:12px;margin-top:6px;background:#e7edf4}.sm-file{display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.05);padding:9px;border-radius:10px;margin-top:6px;color:inherit;text-decoration:none}.sm-meta{font-size:9px;color:#8792a0;text-align:left;margin-top:3px;min-height:12px}.sm-actions{display:none;position:absolute;top:-38px;left:0;background:#172033;color:#fff;border-radius:11px;padding:3px;gap:1px;z-index:3;box-shadow:0 8px 20px rgba(0,0,0,.18)}.sm-msg:focus-within .sm-actions,.sm-msg:hover .sm-actions{display:flex}.sm-mini{background:transparent;color:inherit;padding:7px;border-radius:8px}.sm-compose{position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,.97);backdrop-filter:blur(14px);border-top:1px solid #dfe5ec;padding:8px 10px calc(8px + env(safe-area-inset-bottom));display:flex;align-items:flex-end;gap:7px;z-index:4}.sm-compose textarea{flex:1;max-height:112px;min-height:44px;border:1px solid #dbe2ea;border-radius:18px;padding:11px 13px;font:inherit;resize:none;outline:0;background:#f8fafc;line-height:1.45}.sm-compose textarea:focus{background:#fff;border-color:#b7d7ff}.sm-send{width:46px;height:46px;border-radius:15px;background:#087cff;color:#fff;font-size:18px;flex:0 0 46px}.sm-replybar{position:fixed;bottom:64px;left:10px;right:10px;background:#fff;border:1px solid #dfe5ec;border-radius:13px;padding:8px 12px;display:none;z-index:5;box-shadow:0 7px 18px rgba(15,23,42,.08)}.sm-replybar.show{display:flex}.sm-sheet{position:fixed;inset:0;background:rgba(8,17,30,.5);z-index:10080;display:flex;align-items:flex-end;justify-content:center;padding:12px}.sm-card{background:#fff;width:min(620px,100%);max-height:90vh;overflow:auto;border-radius:24px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.2)}.sm-card h3{margin:0 0 14px}.sm-field{margin-bottom:12px}.sm-field label{display:block;font-weight:800;margin-bottom:6px}.sm-field input,.sm-field textarea,.sm-field select{width:100%;box-sizing:border-box;border:1px solid #d9e0e8;border-radius:12px;padding:11px;font:inherit}.sm-actions-row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.sm-btn{border:0;border-radius:12px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer;background:#087cff;color:#fff}.sm-btn.secondary{background:#eef2f6;color:#243247}.sm-btn.danger{background:#e83d50}.sm-user-results{display:grid;gap:7px;max-height:360px;overflow:auto}.sm-badge{position:absolute;min-width:18px;height:18px;border-radius:9px;background:#ef3340;color:#fff;font-size:10px;font-weight:900;display:grid;place-items:center;padding:0 5px;transform:translate(45%,-45%)}
`;document.head.appendChild(s)}
function page(){css();let p=document.getElementById('student-messages-page');if(p){S.page=p;return p}p=document.createElement('section');p.id='student-messages-page';p.setAttribute('aria-label','الرسائل');document.body.appendChild(p);S.page=p;return p}
function toast(t){document.querySelector('.sm-toast')?.remove();let e=document.createElement('div');e.className='sm-toast';e.style='position:fixed;z-index:10100;left:50%;bottom:90px;transform:translateX(-50%);background:#172033;color:#fff;padding:11px 16px;border-radius:12px;max-width:88%;box-shadow:0 8px 22px rgba(0,0,0,.18)';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2400)}
async function user(){if(typeof currentUser!=='undefined'&&currentUser?.id)return currentUser;let c=sb();if(!c)return null;let{data}=await c.auth.getUser();return data?.user||null}
async function init(){if(S.user?.id)return true;S.user=await user();if(!S.user){toast('سجّل الدخول أولًا');return false}return true}
function avatar(p,small=false){const cls=`sm-avatar${small?' sm-small':''}`;const inner=p?.avatar_url?`<img class="${cls}" src="${esc(safeUrl(p.avatar_url,true))}" loading="lazy" decoding="async" alt="">`:`<div class="${cls}">${esc((p?.full_name||p?.display_name||p?.username||'?').slice(0,1))}</div>`;return typeof window.studentProfileFrameWrap==='function'?window.studentProfileFrameWrap(p,inner):inner}
function profileId(row){return row?.other_user_id||row?.peer_id||row?.participant_id||row?.user_id||row?.profile_id||null}
async function ensureProfiles(ids){ids=[...new Set((ids||[]).filter(Boolean).map(String))].filter(id=>!S.profiles[id]);if(!ids.length)return;const{data,error}=await sb().from('profiles').select('id,full_name,display_name,username,avatar_url,role,is_verified,verification_color,custom_badge_icon,custom_badge_label,custom_badge_color,profile_frame_url').in('id',ids);if(error){console.warn('Message profiles:',error);return}(data||[]).forEach(p=>{S.profiles[String(p.id)]=p})}
function rowProfile(row){const id=profileId(row);return (id&&S.profiles[String(id)])||row||{}}
function nameHtml(row,fallback='محادثة',size=13){const p=rowProfile(row);const name=p.full_name||p.display_name||p.title||p.username||row?.title||fallback;return `${esc(name)}${badge(p,size)}`}

async function open(){if(!await init())return;const p=page();p.classList.add('sm-open');document.body.style.overflow='hidden';S.view='list';if(!S.historyOpen){try{history.pushState({studentMessages:'list'},'',location.href)}catch(_){}S.historyOpen=true}renderListShell();subscribeGlobal();loadConversations({silent:S.conversations.length>0}).catch(console.error)}
function handleBack(){const p=document.getElementById('student-messages-page');if(!p||!p.classList.contains('sm-open'))return false;const sheet=document.querySelector('.sm-sheet');if(sheet){sheet.remove();return true}if(S.view==='chat'){showList();return true}hidePage();return true}
function close(){handleBack()}
function hidePage(){S.page?.classList.remove('sm-open');document.body.style.overflow='';unsubscribeChat();S.historyOpen=false;S.view='list';S.current=null}
function showList(){S.view='list';S.current=null;S.messages=[];S.members=[];S.reply=null;S.editing=null;unsubscribeChat();renderListShell();renderConversationRows()}

function renderListShell(){const p=page();if(S.view!=='list')return;p.innerHTML=`<header class="sm-head"><button class="sm-back" aria-label="رجوع"><i class="fa-solid fa-arrow-right"></i></button><div class="sm-heading"><div class="sm-title">الرسائل</div><div class="sm-sub">محادثاتك في Student</div></div><button class="sm-icon" id="sm-create" title="إنشاء"><i class="fa-solid fa-pen-to-square"></i></button></header><div class="sm-search"><div class="sm-searchbox"><i class="fa-solid fa-magnifying-glass"></i><input id="sm-search-users" autocomplete="off" placeholder="ابحث بالاسم أو اليوزر"></div></div><main class="sm-body"><div id="sm-user-search"></div><div class="sm-list" id="sm-conversations"></div></main><button class="sm-fab" id="sm-new" aria-label="رسالة جديدة"><i class="fa-solid fa-pen"></i></button>`;p.querySelector('.sm-back').onclick=close;p.querySelector('#sm-create').onclick=openCreate;p.querySelector('#sm-new').onclick=()=>openUserSearch();let input=p.querySelector('#sm-search-users');let timer;input.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>searchUsers(input.value),260)};renderConversationRows()}
function renderConversationRows(){const list=document.getElementById('sm-conversations');if(!list||S.view!=='list')return;if(S.loading&&!S.conversations.length){list.innerHTML='<div class="sm-skeleton"></div><div class="sm-skeleton"></div><div class="sm-skeleton"></div>';return}if(!S.conversations.length){list.innerHTML='<div class="sm-empty"><div class="sm-empty-icon"><i class="fa-regular fa-paper-plane"></i></div><strong>لا توجد محادثات بعد</strong><div style="margin-top:6px;font-size:12px">ابحث عن شخص وابدأ المراسلة.</div></div>';return}list.innerHTML=S.conversations.map(x=>{const p=rowProfile(x);const title=p.full_name||p.display_name||x.title||p.username||'محادثة';return `<article class="sm-row" data-id="${esc(x.conversation_id||x.id)}" role="button" tabindex="0">${avatar({...p,avatar_url:p.avatar_url||x.avatar_url,full_name:title})}<div class="sm-main"><div class="sm-name">${esc(title)}${badge(p,13)}</div><div class="sm-preview">${esc(x.last_message||'لا توجد رسائل')}</div></div><div class="sm-side"><div class="sm-time">${esc(fmt(x.last_message_at))}</div>${Number(x.unread_count)>0?`<div class="sm-count">${Number(x.unread_count)>99?'99+':Number(x.unread_count)}</div>`:''}</div></article>`}).join('');list.querySelectorAll('.sm-row').forEach(e=>{const activate=()=>openChat(e.dataset.id);e.onclick=activate;e.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate()}}})}
async function loadConversations({silent=false}={}){if(S.loading)return;const c=sb();S.loading=true;if(!silent)renderConversationRows();const{data,error}=await c.rpc('student_get_conversations');S.loading=false;if(error){console.error(error);if(!S.conversations.length)renderConversationRows();toast(error.message||'تعذر تحميل المحادثات');return}S.conversations=data||[];await ensureProfiles(S.conversations.map(profileId));renderConversationRows();updateBadge().catch(()=>{})}
async function searchUsers(q){const box=document.getElementById('sm-user-search');if(!box)return;q=safeSearch(q);const seq=++S.searchSeq;if(q.length<2){box.innerHTML='';return}box.innerHTML='<div style="padding:10px 14px;color:#8a95a4;font-size:12px">جارٍ البحث...</div>';const{data,error}=await sb().from('profiles').select('id,full_name,username,avatar_url,role,is_verified,verification_color,custom_badge_icon,custom_badge_label,custom_badge_color,profile_frame_url').neq('id',S.user.id).or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);if(seq!==S.searchSeq||!box.isConnected)return;if(error){box.innerHTML='';return}box.innerHTML=`<div class="sm-list" style="padding-bottom:6px">${(data||[]).map(p=>`<article class="sm-row" data-user="${esc(p.id)}">${avatar(p)}<div class="sm-main"><div class="sm-name">${esc(p.full_name||p.username||'مستخدم')}${badge(p,13)}</div><div class="sm-preview">@${esc(p.username||'')}</div></div><button class="sm-icon" aria-label="مراسلة"><i class="fa-regular fa-paper-plane"></i></button></article>`).join('')||'<div class="sm-empty" style="padding:24px">لا توجد نتائج</div>'}</div>`;box.querySelectorAll('[data-user]').forEach(e=>e.onclick=()=>startDirect(e.dataset.user))}
function conversationId(value){if(!value)return null;if(typeof value==='string')return value;if(Array.isArray(value))return conversationId(value[0]);return value.conversation_id||value.id||value.conversation||value.chat_id||null}
async function startDirect(uid){if(!uid||S.loading)return;S.loading=true;try{const{data,error}=await sb().rpc('student_start_direct_chat',{p_other_user:uid});if(error)throw error;const id=conversationId(data);if(!id)throw new Error('لم يرجع النظام رقم المحادثة.');await openChat(id)}catch(error){console.error('Start direct chat:',error);toast(error?.message||'تعذر فتح المحادثة.')}finally{S.loading=false}}

function cachedConversation(id){return S.conversations.find(x=>String(x.conversation_id||x.id)===String(id))||null}
async function openChat(value){const id=conversationId(value);if(!id){toast('رقم المحادثة غير صالح.');return}const cached=cachedConversation(id);S.current=cached?{...cached,id}: {id,title:'المحادثة',kind:'direct'};S.view='chat';S.chatLoading=true;try{history.pushState({studentMessages:'chat'},'',location.href)}catch(_){}renderChatShell();try{const c=sb();const [convResult,messagesResult,membersResult]=await Promise.all([c.rpc('student_get_conversation',{p_conversation:id}),c.rpc('student_get_messages',{p_conversation:id,p_before:null,p_limit:60}),c.rpc('student_get_conversation_members',{p_conversation:id})]);if(convResult.error)throw convResult.error;let conv=Array.isArray(convResult.data)?convResult.data[0]:convResult.data;if(conv)S.current=conv;S.messages=(messagesResult.error?[]:(messagesResult.data||[])).reverse();S.members=membersResult.error?[]:(membersResult.data||[]);await ensureProfiles([profileId(S.current),...S.members.map(m=>m.user_id||m.id),...S.messages.map(m=>m.sender_id)]);S.chatLoading=false;renderChatHeader();renderMessages({stick:true});markReadSoon();subscribeChat(id)}catch(error){console.error('Open chat:',error);S.chatLoading=false;toast(error?.message||'تعذر فتح المحادثة.');showList()}}
function canPost(){return S.current?.kind!=='channel'||S.current?.my_role==='owner'||S.current?.my_role==='admin'}
function currentProfile(){return rowProfile(S.current)}
function renderChatShell(){const p=page(),title=S.current?.title||'المحادثة',cp=currentProfile();p.innerHTML=`<div class="sm-chat"><header class="sm-head" id="sm-chat-head"><button class="sm-back"><i class="fa-solid fa-arrow-right"></i></button>${avatar({...cp,avatar_url:cp.avatar_url||S.current?.avatar_url,full_name:title},true)}<div class="sm-heading"><div class="sm-title" id="sm-chat-title">${esc(title)}${badge(cp,14)}</div><div class="sm-sub" id="sm-chat-sub">${S.chatLoading?'جارٍ تحميل المحادثة...':chatSubtitle()}</div></div><button class="sm-icon" id="sm-info"><i class="fa-solid fa-ellipsis-vertical"></i></button></header><div class="sm-msgs" id="sm-msgs">${S.chatLoading?'<div class="sm-skeleton"></div><div class="sm-skeleton"></div>':''}</div><div class="sm-replybar" id="sm-replybar"></div>${canPost()?`<div class="sm-compose"><button class="sm-icon" id="sm-attach" aria-label="إرفاق"><i class="fa-solid fa-plus"></i></button><textarea id="sm-input" rows="1" placeholder="اكتب رسالة..."></textarea><button class="sm-send" id="sm-send" aria-label="إرسال"><i class="fa-solid fa-paper-plane"></i></button><input type="file" id="sm-file" hidden></div>`:`<div class="sm-compose" style="justify-content:center;color:#758091">النشر للمشرفين فقط</div>`}</div>`;p.querySelector('.sm-back').onclick=handleBack;p.querySelector('#sm-info').onclick=openInfo;if(canPost()){const input=p.querySelector('#sm-input');p.querySelector('#sm-send').onclick=send;input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};input.oninput=()=>{input.style.height='44px';input.style.height=Math.min(input.scrollHeight,112)+'px'};p.querySelector('#sm-attach').onclick=()=>p.querySelector('#sm-file').click();p.querySelector('#sm-file').onchange=e=>upload(e.target.files[0])}}
function chatSubtitle(){return S.current?.kind==='channel'?'قناة':S.current?.kind==='group'?`${S.members.length} أعضاء`:'محادثة خاصة'}
function renderChatHeader(){if(S.view!=='chat')return;const h=document.getElementById('sm-chat-head');if(!h)return;const cp=currentProfile(),title=cp.full_name||cp.display_name||S.current?.title||'المحادثة';const titleEl=document.getElementById('sm-chat-title'),sub=document.getElementById('sm-chat-sub');if(titleEl)titleEl.innerHTML=`${esc(title)}${badge(cp,14)}`;if(sub)sub.textContent=chatSubtitle()}
function renderMessages({stick=false,preserve=false}={}){const box=document.getElementById('sm-msgs');if(!box||S.view!=='chat')return;const distance=box.scrollHeight-box.scrollTop-box.clientHeight;const oldHeight=box.scrollHeight;if(S.chatLoading&&!S.messages.length){box.innerHTML='<div class="sm-skeleton"></div><div class="sm-skeleton"></div>';return}box.innerHTML=S.messages.map(messageHtml).join('')||'<div class="sm-empty"><div class="sm-empty-icon"><i class="fa-regular fa-comments"></i></div>ابدأ المحادثة الآن</div>';bindMessageActions(box);requestAnimationFrame(()=>{if(stick||distance<100)box.scrollTop=box.scrollHeight;else if(preserve)box.scrollTop+=box.scrollHeight-oldHeight})}
function senderProfile(m){return S.profiles[String(m.sender_id)]||m||{}}
function messageHtml(m){if(m.message_type==='system')return`<div class="sm-msg system">${esc(m.body)}</div>`;const mine=m.sender_id===S.user.id;const p=senderProfile(m);let media='';if(m.media_url){const url=esc(safeUrl(m.media_url,true));if(m.message_type==='image')media=`<img class="sm-media" loading="lazy" decoding="async" src="${url}" alt="">`;else if(m.message_type==='video')media=`<video class="sm-media" controls preload="metadata" src="${url}"></video>`;else if(m.message_type==='audio')media=`<audio controls preload="metadata" src="${url}"></audio>`;else media=`<a class="sm-file" href="${esc(safeUrl(m.media_url))}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-paperclip"></i> ${esc(m.file_name||'ملف')}</a>`}const senderName=p.full_name||p.display_name||m.sender_name||p.username||m.sender_username||'مستخدم';return`<article class="sm-msg ${mine?'mine':''} ${m.__pending?'pending':''}" tabindex="0" data-message-id="${esc(m.id)}">${S.current?.kind!=='direct'&&!mine?`<div class="sm-author">${esc(senderName)}${badge(p,12)}</div>`:''}${m.reply_body?`<div class="sm-reply">${esc(m.reply_body)}</div>`:''}<div class="sm-text">${esc(m.deleted_at?'تم حذف الرسالة':m.body||'')}</div>${media}<div class="sm-meta">${m.__pending?'جارٍ الإرسال…':esc(fmt(m.created_at))}${m.edited_at?' · معدلة':''}${mine&&!m.__pending?(m.read_count>0?' · ✓✓':' · ✓'):''}</div>${!m.deleted_at&&!m.__pending?`<div class="sm-actions"><button class="sm-mini" data-action="reply" data-id="${esc(m.id)}" title="رد"><i class="fa-solid fa-reply"></i></button>${mine?`<button class="sm-mini" data-action="edit" data-id="${esc(m.id)}" title="تعديل"><i class="fa-solid fa-pen"></i></button><button class="sm-mini" data-action="delete" data-id="${esc(m.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button>`:''}${S.current?.my_role==='owner'||S.current?.my_role==='admin'?`<button class="sm-mini" data-action="pin" data-id="${esc(m.id)}" title="تثبيت"><i class="fa-solid fa-thumbtack"></i></button>`:''}</div>`:''}</article>`}
function bindMessageActions(box){box.querySelectorAll('[data-action]').forEach(b=>b.onclick=e=>{e.stopPropagation();messageAction(b.dataset.action,b.dataset.id)})}
function messageAction(a,id){const m=S.messages.find(x=>String(x.id)===String(id));if(!m)return;if(a==='reply'){S.reply=m;S.editing=null;showReply(`رد على: ${(m.body||'رسالة').slice(0,60)}`)}if(a==='edit'){S.editing=m;S.reply=null;const i=document.getElementById('sm-input');if(i){i.value=m.body||'';i.focus()}showReply('تعديل الرسالة')}if(a==='delete')confirmRemoveMessage(id);if(a==='pin')pinMessage(id)}
function showReply(t){const b=document.getElementById('sm-replybar');if(!b)return;b.classList.add('show');b.innerHTML=`<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t)}</div><button class="sm-mini" id="sm-cancel-reply"><i class="fa-solid fa-xmark"></i></button>`;b.querySelector('#sm-cancel-reply').onclick=()=>{S.reply=null;S.editing=null;b.classList.remove('show')}}
async function send(){const i=document.getElementById('sm-input'),body=i?.value.trim();if(!body||!S.current?.id)return;const c=sb();const reply=S.reply;const editing=S.editing;if(editing){const old=editing.body;editing.body=body;editing.edited_at=new Date().toISOString();i.value='';S.editing=null;document.getElementById('sm-replybar')?.classList.remove('show');renderMessages();const{error}=await c.rpc('student_edit_message',{p_message:editing.id,p_body:body});if(error){editing.body=old;renderMessages();toast(error.message)}return}const temp={id:`tmp-${Date.now()}`,conversation_id:S.current.id,sender_id:S.user.id,body,message_type:'text',created_at:new Date().toISOString(),reply_body:reply?.body||null,__pending:true};S.messages.push(temp);i.value='';i.style.height='44px';S.reply=null;document.getElementById('sm-replybar')?.classList.remove('show');renderMessages({stick:true});const{error}=await c.rpc('student_send_message',{p_conversation:S.current.id,p_body:body,p_reply_to:reply?.id||null,p_message_type:'text',p_media_url:null,p_file_name:null,p_file_size:null});if(error){S.messages=S.messages.filter(x=>x.id!==temp.id);renderMessages();toast(error.message);return}scheduleChatRefresh(90)}
async function upload(file){if(!file)return;if(file.size>20*1024*1024){toast('الحد الأقصى 20MB');return}const c=sb(),ext=(file.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,''),path=`${S.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;toast('جارٍ رفع الملف...');const{error}=await c.storage.from('chat-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error){toast(error.message);return}const{data}=c.storage.from('chat-media').getPublicUrl(path);const type=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'file';const r=await c.rpc('student_send_message',{p_conversation:S.current.id,p_body:'',p_reply_to:S.reply?.id||null,p_message_type:type,p_media_url:data.publicUrl,p_file_name:file.name,p_file_size:file.size});if(r.error)toast(r.error.message);else scheduleChatRefresh(90);S.reply=null}
function confirmRemoveMessage(id){const sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML='<div class="sm-card"><h3>حذف الرسالة؟</h3><p style="color:#657184;line-height:1.7">سيتم حذف هذه الرسالة من المحادثة.</p><div class="sm-actions-row"><button class="sm-btn secondary" data-cancel>إلغاء</button><button class="sm-btn danger" data-delete>حذف</button></div></div>';document.body.appendChild(sh);sh.querySelector('[data-cancel]').onclick=()=>sh.remove();sh.querySelector('[data-delete]').onclick=async e=>{e.currentTarget.disabled=true;const{error}=await sb().rpc('student_delete_message',{p_message:id});if(error){e.currentTarget.disabled=false;toast(error.message);return}sh.remove();const m=S.messages.find(x=>String(x.id)===String(id));if(m)m.deleted_at=new Date().toISOString();renderMessages()}}
async function pinMessage(id){const{error}=await sb().rpc('student_pin_message',{p_conversation:S.current.id,p_message:id});if(error)toast(error.message);else toast('تم تثبيت الرسالة')}
async function refreshMessages(){if(S.view!=='chat'||!S.current?.id)return;const id=S.current.id;const{data,error}=await sb().rpc('student_get_messages',{p_conversation:id,p_before:null,p_limit:60});if(error)return;const rows=(data||[]).reverse();await ensureProfiles(rows.map(m=>m.sender_id));S.messages=rows;renderMessages({preserve:true});markReadSoon()}
function scheduleChatRefresh(delay=180){clearTimeout(S.chatRefreshTimer);S.chatRefreshTimer=setTimeout(()=>refreshMessages().catch(console.error),delay)}
function markReadSoon(){const now=Date.now();if(now-S.lastReadAt<700)return;S.lastReadAt=now;setTimeout(()=>markRead().catch(()=>{}),60)}
async function markRead(){if(!S.current?.id)return;await sb().rpc('student_mark_conversation_read',{p_conversation:S.current.id});updateBadge().catch(()=>{})}
function subscribeChat(id){unsubscribeChat();S.channel=sb().channel('student-chat-'+id).on('postgres_changes',{event:'*',schema:'public',table:'chat_messages',filter:`conversation_id=eq.${id}`},()=>scheduleChatRefresh()).subscribe()}
function unsubscribeChat(){clearTimeout(S.chatRefreshTimer);if(S.channel){sb()?.removeChannel(S.channel);S.channel=null}}
function scheduleListRefresh(){clearTimeout(S.listRefreshTimer);S.listRefreshTimer=setTimeout(()=>{if(S.view==='list')loadConversations({silent:true}).catch(console.error);else updateBadge().catch(()=>{})},350)}
function subscribeGlobal(){if(window.__studentMessagesGlobal)return;window.__studentMessagesGlobal=sb().channel('student-messages-global').on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},scheduleListRefresh).subscribe()}
async function updateBadge(){if(!S.user)S.user=await user();if(!S.user)return;const{data,error}=await sb().rpc('student_unread_messages_count');if(error)return;const n=Number(data||0);document.querySelectorAll('[data-section="messages"]').forEach(a=>{a.style.position='relative';a.querySelector('.sm-badge')?.remove();if(n>0){const b=document.createElement('span');b.className='sm-badge';b.textContent=n>99?'99+':n;a.appendChild(b)}})}
function openCreate(){const sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML='<div class="sm-card"><h3>إنشاء جديد</h3><div class="sm-actions-row" style="justify-content:stretch"><button class="sm-btn" id="sm-direct" style="flex:1">محادثة</button><button class="sm-btn" id="sm-group" style="flex:1">مجموعة</button><button class="sm-btn" id="sm-channel" style="flex:1">قناة</button></div><div class="sm-actions-row"><button class="sm-btn secondary" id="sm-close">إلغاء</button></div></div>';document.body.appendChild(sh);sh.querySelector('#sm-close').onclick=()=>sh.remove();sh.querySelector('#sm-direct').onclick=()=>{sh.remove();openUserSearch()};sh.querySelector('#sm-group').onclick=()=>{sh.remove();createCommunity('group')};sh.querySelector('#sm-channel').onclick=()=>{sh.remove();createCommunity('channel')}}
function openUserSearch(){document.getElementById('sm-search-users')?.focus()}
function createCommunity(kind){const sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML=`<div class="sm-card"><h3>${kind==='group'?'إنشاء مجموعة':'إنشاء قناة'}</h3><div class="sm-field"><label>الاسم</label><input id="sm-name" maxlength="80"></div><div class="sm-field"><label>الوصف</label><textarea id="sm-desc" maxlength="300"></textarea></div><div class="sm-field"><label>الخصوصية</label><select id="sm-public"><option value="false">خاصة</option><option value="true">عامة</option></select></div><div class="sm-actions-row"><button class="sm-btn secondary" id="sm-cancel">إلغاء</button><button class="sm-btn" id="sm-save">إنشاء</button></div></div>`;document.body.appendChild(sh);sh.querySelector('#sm-cancel').onclick=()=>sh.remove();sh.querySelector('#sm-save').onclick=async()=>{const name=sh.querySelector('#sm-name').value.trim();if(!name)return toast('اكتب الاسم');const{data,error}=await sb().rpc('student_create_community',{p_kind:kind,p_title:name,p_description:sh.querySelector('#sm-desc').value.trim(),p_is_public:sh.querySelector('#sm-public').value==='true'});if(error)return toast(error.message);sh.remove();openChat(data)}}
async function enrichMembers(){await ensureProfiles(S.members.map(m=>m.user_id||m.id));S.members=S.members.map(m=>({...m,...(S.profiles[String(m.user_id||m.id)]||{})}))}
async function openInfo(){await enrichMembers();const sh=document.createElement('div');sh.className='sm-sheet';const admin=S.current?.my_role==='owner'||S.current?.my_role==='admin';sh.innerHTML=`<div class="sm-card"><h3>${esc(S.current.title||'المحادثة')}</h3><p>${esc(S.current.description||'')}</p>${S.current.kind!=='direct'?`<h4>الأعضاء (${S.members.length})</h4><div class="sm-user-results">${S.members.map(m=>`<div class="sm-row">${avatar(m)}<div class="sm-main"><div class="sm-name">${esc(m.full_name||m.display_name||m.username||'مستخدم')}${badge(m,13)}</div><div class="sm-preview">${esc(m.role||'عضو')}</div></div>${admin&&(m.user_id||m.id)!==S.user.id?`<button class="sm-mini" data-remove="${esc(m.user_id||m.id)}" title="إزالة"><i class="fa-solid fa-user-minus"></i></button>`:''}</div>`).join('')}</div>${admin?'<button class="sm-btn" id="sm-add-member">إضافة عضو</button>':''}<button class="sm-btn danger" id="sm-leave">مغادرة</button>`:''}<div class="sm-actions-row"><button class="sm-btn secondary" id="sm-close-info">إغلاق</button></div></div>`;document.body.appendChild(sh);sh.querySelector('#sm-close-info').onclick=()=>sh.remove();sh.querySelector('#sm-leave')&&(sh.querySelector('#sm-leave').onclick=()=>confirmLeave(sh));sh.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>confirmRemoveMember(b.dataset.remove,sh));sh.querySelector('#sm-add-member')&&(sh.querySelector('#sm-add-member').onclick=()=>{sh.remove();addMemberSheet()})}
function confirmLeave(parent){const sh=document.createElement('div');sh.className='sm-sheet';sh.style.zIndex='10090';sh.innerHTML='<div class="sm-card"><h3>مغادرة المحادثة؟</h3><p style="color:#657184">لن تظهر لك رسائلها الجديدة بعد المغادرة.</p><div class="sm-actions-row"><button class="sm-btn secondary" data-no>إلغاء</button><button class="sm-btn danger" data-yes>مغادرة</button></div></div>';document.body.appendChild(sh);sh.querySelector('[data-no]').onclick=()=>sh.remove();sh.querySelector('[data-yes]').onclick=async e=>{e.currentTarget.disabled=true;const{error}=await sb().rpc('student_leave_conversation',{p_conversation:S.current.id});if(error){e.currentTarget.disabled=false;toast(error.message);return}sh.remove();parent.remove();showList();loadConversations({silent:true})}}
function confirmRemoveMember(uid,parent){const sh=document.createElement('div');sh.className='sm-sheet';sh.style.zIndex='10090';sh.innerHTML='<div class="sm-card"><h3>إزالة العضو؟</h3><p style="color:#657184">سيتم إخراجه من هذه المحادثة.</p><div class="sm-actions-row"><button class="sm-btn secondary" data-no>إلغاء</button><button class="sm-btn danger" data-yes>إزالة</button></div></div>';document.body.appendChild(sh);sh.querySelector('[data-no]').onclick=()=>sh.remove();sh.querySelector('[data-yes]').onclick=async e=>{e.currentTarget.disabled=true;const{error}=await sb().rpc('student_remove_member',{p_conversation:S.current.id,p_user:uid});if(error){e.currentTarget.disabled=false;toast(error.message);return}sh.remove();parent.remove();openChat(S.current.id)}}
function addMemberSheet(){const sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML='<div class="sm-card"><h3>إضافة عضو</h3><div class="sm-field"><input id="sm-member-search" placeholder="الاسم أو اليوزر"></div><div id="sm-member-results"></div><div class="sm-actions-row"><button class="sm-btn secondary" id="sm-member-close">إغلاق</button></div></div>';document.body.appendChild(sh);sh.querySelector('#sm-member-close').onclick=()=>sh.remove();let t,seq=0;sh.querySelector('#sm-member-search').oninput=e=>{clearTimeout(t);t=setTimeout(async()=>{const q=safeSearch(e.target.value),mySeq=++seq;if(q.length<2){sh.querySelector('#sm-member-results').innerHTML='';return}const{data}=await sb().from('profiles').select('id,full_name,username,avatar_url,role,is_verified,verification_color,custom_badge_icon,custom_badge_label,custom_badge_color,profile_frame_url').or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);if(mySeq!==seq)return;const box=sh.querySelector('#sm-member-results');box.innerHTML=(data||[]).map(p=>`<div class="sm-row" data-add="${esc(p.id)}">${avatar(p)}<div class="sm-main"><div class="sm-name">${esc(p.full_name||p.username||'مستخدم')}${badge(p,13)}</div><div class="sm-preview">@${esc(p.username||'')}</div></div></div>`).join('');box.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{const{error}=await sb().rpc('student_add_member',{p_conversation:S.current.id,p_user:b.dataset.add});if(error)toast(error.message);else{toast('تمت الإضافة');sh.remove();openChat(S.current.id)}})},260)}}

window.addEventListener('popstate',()=>{if(S.historyOpen)handleBack()});
window.StudentMessages={open,close,handleBack,updateBadge,openTarget:async function(id){await open();if(id)await openChat(id)}};
window.openStudentMessages=open;
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>updateBadge().catch(()=>{}),1600));
setTimeout(()=>updateBadge().catch(()=>{}),2100);
})();
