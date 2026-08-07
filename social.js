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

function verificationBadge(profile, size = 15) {
    if (!profile || profile.is_verified !== true) return "";

    const colorName = String(profile.verification_color || "").toLowerCase();
    const color =
        colorName === "orange" ? "#ff8a00" :
        colorName === "red" ? "#e53935" :
        "#0095f6";

    const label =
        colorName === "orange" ? "حساب أدمن موثّق" :
        colorName === "red" ? "حساب أستاذ موثّق" :
        "حساب موثّق";

    const px = Math.max(12, Number(size) || 15);

    return `<span class="student-verification-badge"
        title="${esc(label)}"
        aria-label="${esc(label)}"
        style="
            --verification-color:${color};
            --verification-size:${px}px;
            display:inline-flex;
            width:var(--verification-size);
            height:var(--verification-size);
            margin-inline-start:4px;
            vertical-align:-2px;
            position:relative;
            align-items:center;
            justify-content:center;
            flex:0 0 auto;
        ">
        <span aria-hidden="true" style="
            position:absolute;
            inset:1px;
            background:var(--verification-color);
            clip-path:polygon(
                50% 0%,61% 8%,74% 5%,82% 18%,95% 26%,92% 40%,
                100% 50%,92% 61%,95% 74%,82% 82%,74% 95%,61% 92%,
                50% 100%,39% 92%,26% 95%,18% 82%,5% 74%,8% 61%,
                0% 50%,8% 40%,5% 26%,18% 18%,26% 5%,39% 8%
            );
        "></span>
        <i class="fa-solid fa-check" aria-hidden="true" style="
            position:relative;
            z-index:1;
            color:#fff;
            font-size:calc(var(--verification-size) * .55);
            line-height:1;
        "></i>
    </span>`;
}

window.studentVerificationBadge = verificationBadge;

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
        return `<img class="${cls}" src="${esc(profile.avatar_url)}" alt="" loading="lazy" decoding="async">`;
    }
    return `<div class="${cls}"><i class="fa-solid fa-user"></i></div>`;
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
        "is_verified","verification_color","verified_at",
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
        "is_verified","verification_color","school_name","education_stage",
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
        body = page?.querySelector(".student-internal-body") || null;
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
                        ? `<button class="sp2-btn" type="button" data-sp2-edit>تعديل الملف</button>`
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
                "id,display_name,avatar_url"
            )
            .in("id", ids);

        if (error) {
            console.error(error);
            return new Map();
        }

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
            fallback
        );
    }

    function avatar(
        profile,
        fallback = "S"
    ) {
        if (profile?.avatar_url) {
            return `
                <img
                    class="student-story-avatar"
                    src="${escapeHtml(
                        profile.avatar_url
                    )}"
                    alt=""
                >
            `;
        }

        return `
            <div
                class="
                    student-story-avatar
                    student-story-avatar-fallback
                "
            >
                ${escapeHtml(
                    getProfileName(
                        profile,
                        fallback
                    ).charAt(0) || fallback
                )}
            </div>
        `;
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
        #studentStoryViewersModal{
            position:fixed;
            inset:0;
            z-index:100000;
            display:none;
        }

        #studentStoryCreateModal.active,
        #studentStoryViewer.active,
        #studentStoryDeleteConfirm.active,
        #studentStoryViewersModal.active{
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
        #studentStoryViewersModal{
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

                    <h2
                        id="studentStoryTitle"
                    >
                        إضافة ستوري
                    </h2>

                    <div
                        class="student-story-types"
                    >

                        <button
                            id="studentStoryTextMode"
                            class="active"
                            type="button"
                        >
                            نص
                        </button>

                        <button
                            id="studentStoryMediaMode"
                            type="button"
                        >
                            صورة / فيديو
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

                    <div
                        id="studentStoryPreview"
                        class="student-story-preview-box"
                    ></div>

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

        item.innerHTML = `
            <div
                class="story-ring"
            >

                <div
                    class="story-ring-inner"
                >

                    <i
                        class="fa-solid fa-plus"
                    ></i>

                </div>

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
                    )}
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

    function setStoryMode(
        mode
    ) {

        storyMode =
            mode;

        $("#studentStoryTextMode")
            .classList
            .toggle(
                "active",
                mode === "text"
            );

        $("#studentStoryMediaMode")
            .classList
            .toggle(
                "active",
                mode === "media"
            );

        $("#studentStoryFile")
            .style.display =
            mode === "media"
                ? "block"
                : "none";
    }

    function clearPreview() {

        const box =
            $("#studentStoryPreview");

        box.innerHTML =
            "";

        box.style.display =
            "none";
    }

    function previewFile(
        file
    ) {

        const box =
            $("#studentStoryPreview");

        if (!file) {

            clearPreview();

            return;
        }

        const url =
            URL.createObjectURL(
                file
            );

        box.innerHTML =
            "";

        if (
            file.type.startsWith(
                "image/"
            )
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                url;

            box.appendChild(
                img
            );

        } else if (
            file.type.startsWith(
                "video/"
            )
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.src =
                url;

            video.controls =
                true;

            video.playsInline =
                true;

            box.appendChild(
                video
            );

        } else {

            toast(
                "اختر صورة أو فيديو فقط",
                "error"
            );

            clearPreview();

            return;
        }

        box.style.display =
            "flex";
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
                : "إضافة ستوري";

        $("#studentStoryText")
            .value =
            story?.content || "";

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

        clearPreview();

        setStoryMode(
            story &&
            (
                story.type === "image" ||
                story.type === "video"
            )
                ? "media"
                : "text"
        );

        $("#studentStoryCreateModal")
            .classList
            .add(
                "active"
            );
    }

    function closeCreateModal() {

        $("#studentStoryCreateModal")
            .classList
            .remove(
                "active"
            );

        editStory =
            null;
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
                $("#studentStoryBackground")
                    .value;

            const textColor =
                $("#studentStoryTextColor")
                    .value;

            const visibility =
                $("#studentStoryVisibility")
                    .value;

            const replyEnabled =
                $("#studentStoryReplyEnabled")
                    .checked;

            const file =
                $("#studentStoryFile")
                    .files[0] ||
                null;

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
                                text,
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
                                text,
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
                        )}
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

            box.style.background =
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

            text.textContent =
                currentStory.content ||
                "";

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
                true;

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

        let elapsed =
            0;

        const duration =
            5000;

        storyTimer =
            setInterval(
                () => {

                    elapsed +=
                        100;

                    updateProgress(
                        elapsed /
                        duration *
                        100
                    );

                    if (
                        elapsed >=
                        duration
                    ) {

                        clearTimers();

                        nextStory();
                    }

                },
                100
            );
    }

    function startVideoTimer(
        seconds
    ) {

        clearTimers();

        const duration =
            Math.max(
                3000,
                seconds * 1000
            );

        const started =
            Date.now();

        storyTimer =
            setInterval(
                () => {

                    const elapsed =
                        Date.now() -
                        started;

                    updateProgress(
                        elapsed /
                        duration *
                        100
                    );

                    if (
                        elapsed >=
                        duration
                    ) {

                        clearTimers();

                        nextStory();
                    }

                },
                100
            );
    }

    function clearTimers() {

        if (
            storyTimer
        ) {

            clearInterval(
                storyTimer
            );

            storyTimer =
                null;
        }

        if (
            videoTimer
        ) {

            clearTimeout(
                videoTimer
            );

            videoTimer =
                null;
        }
    }

    async function nextStory() {

        if (
            currentIndex <
            currentGroup.length -
                1
        ) {

            currentIndex +=
                1;

            await renderCurrentStory();

        } else {

            closeViewer();
        }
    }

    async function previousStory() {

        if (
            currentIndex >
            0
        ) {

            currentIndex -=
                1;

            await renderCurrentStory();

        } else {

            updateProgress(
                0
            );
        }
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

        $("#studentStoryMediaMode")
            .addEventListener(
                "click",
                () => {

                    setStoryMode(
                        "media"
                    );

                    const input =
                        $("#studentStoryFile");

                    input.value =
                        "";

                    input.click();
                }
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
                    verification_color
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

        if (
            profile?.avatar_url
        ) {

            return `

                <img
                    class="
                        student-feed-avatar
                    "
                    src="${escapeHTML(
                        profile.avatar_url
                    )}"
                    alt=""
                    loading="lazy"
                >

            `;
        }


        return `

            <div class="
                student-feed-avatar-placeholder
            ">

                <i class="
                    fa-solid
                    fa-user
                "></i>

            </div>

        `;
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
let page=null,timer=null,controller=null;
const db=()=>typeof supabaseClient!=="undefined"?supabaseClient:null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function ensure(){
 if(page) return page;
 page=document.createElement("section"); page.id="student-search-page";
 page.style.cssText="position:fixed;inset:0;z-index:2147482400;background:#f7f8fb;display:none;flex-direction:column;direction:rtl";
 page.innerHTML=`<header style="height:62px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 14px"><button data-search-back style="border:0;background:#eef2f6;width:40px;height:40px;border-radius:50%;font-size:22px">‹</button><strong style="font-size:19px">البحث</strong></header><div style="padding:12px"><input id="student-search-input" placeholder="ابحث بالاسم أو اسم المستخدم" style="width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:14px;padding:13px;font:inherit;background:#fff"></div><div id="student-search-results" style="padding:0 12px 90px;overflow:auto;display:grid;gap:8px"></div>`;
 document.body.appendChild(page);
 page.addEventListener("click",e=>{const b=e.target.closest("[data-search-back]");if(b){close();return;}const r=e.target.closest("[data-profile-id]");if(r){window.StudentProfile?.open?.(r.dataset.profileId);}});
 page.querySelector("#student-search-input").addEventListener("input",e=>{clearTimeout(timer);timer=setTimeout(()=>run(e.target.value),300);});
 return page;
}
async function run(value){
 const q=String(value||"").trim(); const box=page.querySelector("#student-search-results");
 if(q.length<2){box.innerHTML='<div style="text-align:center;color:#7b8491;padding:45px 12px">اكتب حرفين على الأقل</div>';return;}
 controller?.abort(); controller=new AbortController(); box.innerHTML='<div style="text-align:center;padding:35px;color:#777">جارٍ البحث...</div>';
 try{const client=db(); if(!client) throw new Error("Supabase غير جاهز"); const safe=q.replace(/[,%()]/g,""); const {data,error}=await client.from("profiles").select("id,full_name,username,avatar_url,role,is_verified,verification_color").or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`).limit(30); if(error) throw error; box.innerHTML=(data||[]).map(x=>`<button data-profile-id="${esc(x.id)}" style="border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:10px;display:grid;grid-template-columns:48px 1fr;gap:10px;text-align:right;align-items:center"><img src="${esc(x.avatar_url||'')}" onerror="this.style.visibility='hidden'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#edf1f5"><span><strong>${esc(x.full_name||x.username||'مستخدم')}${studentVerificationBadge(x,14)}</strong><small style="display:block;color:#7b8491;margin-top:3px">@${esc(x.username||'')}</small></span></button>`).join('')||'<div style="text-align:center;color:#7b8491;padding:45px 12px">لا توجد نتائج</div>';
 }catch(err){if(err.name!=="AbortError") box.innerHTML='<div style="text-align:center;color:#b3261e;padding:35px">تعذر البحث حاليًا</div>';}
}
function open(){ensure();page.style.display="flex";history.pushState({studentPage:"search"},"","#search");setTimeout(()=>page.querySelector("#student-search-input")?.focus(),50);}
function close(){if(!page)return;page.style.display="none";controller?.abort();}
window.openStudentSearch=open; window.closeStudentSearch=close;
})();


/* ===== MERGED MODULE: messages.js ===== */
/* =========================================================
   Student Messages - Full page chat, groups and channels
========================================================= */
(function(){
'use strict';
if(window.StudentMessages) return;
const S={user:null,page:null,view:'list',conversations:[],current:null,messages:[],members:[],profiles:{},channel:null,typing:null,reply:null,editing:null,loading:false,historyOpen:false};
const sb=()=>typeof supabaseClient!=='undefined'?supabaseClient:null;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const fmt=v=>{try{return new Intl.DateTimeFormat('ar-IQ',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return''}};
function css(){if(document.getElementById('student-messages-style'))return;let s=document.createElement('style');s.id='student-messages-style';s.textContent=`
#student-messages-page{position:fixed;inset:0;z-index:10040;background:#f7f9fc;display:none;direction:rtl;color:#172033}.sm-open{display:flex!important;flex-direction:column}.sm-head{height:64px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#fff;border-bottom:1px solid #e7ebf1;flex:0 0 auto}.sm-back,.sm-icon,.sm-send,.sm-fab,.sm-mini{border:0;cursor:pointer;font:inherit}.sm-back,.sm-icon{width:42px;height:42px;border-radius:50%;background:#eef2f7;display:grid;place-items:center;font-size:20px}.sm-title{font-size:19px;font-weight:800;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sm-sub{font-size:12px;color:#7b8695}.sm-search{padding:12px 14px;background:#fff;border-bottom:1px solid #edf0f4}.sm-searchbox{display:flex;align-items:center;gap:9px;background:#f0f3f7;border-radius:14px;padding:0 12px}.sm-searchbox input{width:100%;border:0;background:transparent;outline:0;padding:12px 0;font:inherit}.sm-body{flex:1;overflow:auto;max-width:900px;width:100%;margin:0 auto}.sm-list{padding:10px}.sm-row{display:flex;gap:12px;align-items:center;background:#fff;padding:12px;border-radius:16px;margin-bottom:8px;border:1px solid #e8ecf2;cursor:pointer}.sm-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#e8eef7;display:grid;place-items:center;font-weight:800;flex:0 0 48px}.sm-main{min-width:0;flex:1}.sm-name{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sm-preview{font-size:13px;color:#737f8f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}.sm-time{font-size:11px;color:#919baa}.sm-count{min-width:21px;height:21px;border-radius:11px;background:#ef3340;color:#fff;font-size:11px;display:grid;place-items:center;padding:0 6px;margin-top:5px}.sm-fab{position:fixed;left:20px;bottom:86px;width:58px;height:58px;border-radius:50%;background:#087cff;color:#fff;font-size:25px;box-shadow:0 8px 24px rgba(8,124,255,.3)}.sm-empty{text-align:center;color:#788495;padding:70px 20px}.sm-chat{display:flex;flex-direction:column;height:100%}.sm-msgs{flex:1;overflow:auto;padding:16px 12px 100px;background:#eef3f8}.sm-day{text-align:center;font-size:12px;color:#7f8b99;margin:14px}.sm-msg{max-width:78%;margin:5px 0;padding:9px 11px;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.05);position:relative}.sm-msg.mine{margin-right:auto;background:#dff0ff}.sm-msg.system{margin:10px auto;background:#dfe7ef;color:#526171;text-align:center;max-width:90%}.sm-author{font-size:12px;font-weight:800;color:#087cff;margin-bottom:4px}.sm-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}.sm-reply{border-right:3px solid #087cff;background:rgba(8,124,255,.08);padding:6px 8px;border-radius:8px;margin-bottom:6px;font-size:12px}.sm-media{max-width:100%;max-height:320px;border-radius:12px;margin-top:6px}.sm-file{display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.05);padding:9px;border-radius:10px;margin-top:6px}.sm-meta{font-size:10px;color:#8994a2;text-align:left;margin-top:4px}.sm-actions{display:none;position:absolute;top:-36px;left:0;background:#172033;color:#fff;border-radius:10px;padding:4px;gap:2px;z-index:2}.sm-msg:focus-within .sm-actions,.sm-msg:hover .sm-actions{display:flex}.sm-mini{background:transparent;color:inherit;padding:6px;border-radius:7px}.sm-compose{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #dfe5ec;padding:8px 10px calc(8px + env(safe-area-inset-bottom));display:flex;align-items:flex-end;gap:8px;z-index:2}.sm-compose textarea{flex:1;max-height:120px;min-height:44px;border:1px solid #dbe2ea;border-radius:18px;padding:11px 13px;font:inherit;resize:none;outline:0}.sm-send{width:46px;height:46px;border-radius:50%;background:#087cff;color:#fff;font-size:19px}.sm-replybar{position:fixed;bottom:63px;left:10px;right:10px;background:#fff;border:1px solid #dfe5ec;border-radius:12px;padding:8px 12px;display:none;z-index:3}.sm-replybar.show{display:flex}.sm-sheet{position:fixed;inset:0;background:rgba(8,17,30,.52);z-index:10080;display:flex;align-items:flex-end;justify-content:center;padding:12px}.sm-card{background:#fff;width:min(620px,100%);max-height:90vh;overflow:auto;border-radius:22px;padding:18px}.sm-card h3{margin:0 0 14px}.sm-field{margin-bottom:12px}.sm-field label{display:block;font-weight:700;margin-bottom:6px}.sm-field input,.sm-field textarea,.sm-field select{width:100%;border:1px solid #d9e0e8;border-radius:12px;padding:11px;font:inherit}.sm-actions-row{display:flex;gap:8px;justify-content:flex-end}.sm-btn{border:0;border-radius:12px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;background:#087cff;color:#fff}.sm-btn.secondary{background:#eef2f6;color:#243247}.sm-btn.danger{background:#e83d50}.sm-user-results{display:grid;gap:8px;max-height:360px;overflow:auto}.sm-badge{position:absolute;min-width:18px;height:18px;border-radius:9px;background:#ef3340;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px;transform:translate(45%,-45%)}
`;document.head.appendChild(s)}
function page(){css();let p=document.getElementById('student-messages-page');if(p)return p;p=document.createElement('section');p.id='student-messages-page';document.body.appendChild(p);S.page=p;return p}
function toast(t){let e=document.createElement('div');e.style='position:fixed;z-index:10100;left:50%;bottom:90px;transform:translateX(-50%);background:#172033;color:#fff;padding:11px 16px;border-radius:12px;max-width:88%';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2500)}
async function user(){let c=sb();if(!c)return null;let{data}=await c.auth.getUser();return data?.user||null}
async function init(){S.user=await user();if(!S.user){toast('\u0633\u062C\u0651\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u064B\u0627');return false}return true}
function avatar(p){return p?.avatar_url?`<img class="sm-avatar" src="${esc(p.avatar_url)}">`:`<div class="sm-avatar">${esc((p?.full_name||p?.username||'?').slice(0,1))}</div>`}
async function open(){if(!await init())return;let p=page();p.classList.add('sm-open');document.body.style.overflow='hidden';S.view='list';if(!S.historyOpen){history.pushState({studentMessages:'list'},'',location.href);S.historyOpen=true}renderList();await loadConversations();subscribeGlobal()}
function handleBack(){
    const p=document.getElementById('student-messages-page');
    if(!p||!p.classList.contains('sm-open'))return false;
    document.querySelectorAll('.sm-sheet').forEach(sheet=>sheet.remove());
    if(S.view==='chat'){
        showList();
        return true
    }
    hidePage();
    return true
}
function close(){handleBack()}
function hidePage(){S.page?.classList.remove('sm-open');document.body.style.overflow='';unsubscribeChat();S.historyOpen=false;S.view='list';S.current=null}
function showList(){S.view='list';S.current=null;S.messages=[];unsubscribeChat();renderList()}
async function loadConversations(){let c=sb();S.loading=true;renderList();let{data,error}=await c.rpc('student_get_conversations');S.loading=false;if(error){console.error(error);S.conversations=[];renderList();toast(error.message||'\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A');return}S.conversations=data||[];renderList();updateBadge()}
function renderList(){let p=page();p.innerHTML=`<header class="sm-head"><button class="sm-back">\u2039</button><div class="sm-title">\u0627\u0644\u0631\u0633\u0627\u0626\u0644</div><button class="sm-icon" id="sm-create" title="\u0625\u0646\u0634\u0627\u0621">\uFF0B</button></header><div class="sm-search"><div class="sm-searchbox">\uD83D\uDD0E<input id="sm-search-users" placeholder="\u0627\u0628\u062D\u062B \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u064A\u0648\u0632\u0631"></div></div><main class="sm-body"><div id="sm-user-search"></div><div class="sm-list" id="sm-conversations"></div></main><button class="sm-fab" id="sm-new">\u270E</button>`;p.querySelector('.sm-back').onclick=close;p.querySelector('#sm-create').onclick=openCreate;p.querySelector('#sm-new').onclick=()=>openUserSearch('direct');let input=p.querySelector('#sm-search-users');let timer;input.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>searchUsers(input.value),300)};let list=p.querySelector('#sm-conversations');if(S.loading){list.innerHTML='<div class="sm-empty">\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...</div>';return}if(!S.conversations.length){list.innerHTML='<div class="sm-empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0628\u0639\u062F.<br>\u0627\u0628\u062D\u062B \u0639\u0646 \u0634\u062E\u0635 \u0648\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0629.</div>';return}list.innerHTML=S.conversations.map(x=>`<article class="sm-row" data-id="${esc(x.conversation_id)}">${x.avatar_url?`<img class="sm-avatar" src="${esc(x.avatar_url)}">`:`<div class="sm-avatar">${esc((x.title||'?').slice(0,1))}</div>`}<div class="sm-main"><div class="sm-name">${esc(x.title||'\u0645\u062D\u0627\u062F\u062B\u0629')}</div><div class="sm-preview">${esc(x.last_message||'\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644')}</div></div><div><div class="sm-time">${esc(fmt(x.last_message_at))}</div>${Number(x.unread_count)>0?`<div class="sm-count">${x.unread_count}</div>`:''}</div></article>`).join('');list.querySelectorAll('.sm-row').forEach(e=>{
        e.setAttribute('role','button');
        e.setAttribute('tabindex','0');
        const activate=()=>openChat(e.dataset.id);
        e.onclick=activate;
        e.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate()}}
    })}
async function searchUsers(q){let box=document.getElementById('sm-user-search');if(!box)return;q=q.trim();if(q.length<2){box.innerHTML='';return}let c=sb();let{data}=await c.from('profiles').select('id,full_name,username,avatar_url,role,is_verified,verification_color').neq('id',S.user.id).or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(25);box.innerHTML=`<div class="sm-list">${(data||[]).map(p=>`<article class="sm-row" data-user="${p.id}">${avatar(p)}<div class="sm-main"><div class="sm-name">${esc(p.full_name||p.username)}${studentVerificationBadge(p,13)}</div><div class="sm-preview">@${esc(p.username||'')}</div></div><button class="sm-icon">\u2709</button></article>`).join('')}</div>`;box.querySelectorAll('[data-user]').forEach(e=>e.onclick=()=>startDirect(e.dataset.user))}
function conversationId(value){
    if(!value)return null;
    if(typeof value==='string')return value;
    if(Array.isArray(value))return conversationId(value[0]);
    return value.conversation_id||value.id||value.conversation||value.chat_id||null
}
async function startDirect(uid){
    if(!uid||S.loading)return;
    let c=sb();
    S.loading=true;
    toast('جارٍ فتح المحادثة...');
    try{
        let{data,error}=await c.rpc('student_start_direct_chat',{p_other_user:uid});
        if(error)throw error;
        const id=conversationId(data);
        if(!id)throw new Error('لم يرجع النظام رقم المحادثة.');
        await openChat(id)
    }catch(error){
        console.error('Start direct chat:',error);
        toast(error?.message||'تعذر فتح المحادثة.')
    }finally{S.loading=false}
}
async function openChat(value){
    const id=conversationId(value);
    if(!id){toast('رقم المحادثة غير صالح.');return}
    let c=sb();
    try{
        let{data:conv,error}=await c.rpc('student_get_conversation',{p_conversation:id});
        if(error)throw error;
        if(Array.isArray(conv))conv=conv[0];
        if(!conv)throw new Error('تعذر العثور على المحادثة.');
        S.current=conv;
        S.view='chat';
        history.pushState({studentMessages:'chat'},'',location.href);
        const [messagesResult,membersResult]=await Promise.all([
            c.rpc('student_get_messages',{p_conversation:id,p_before:null,p_limit:100}),
            c.rpc('student_get_conversation_members',{p_conversation:id})
        ]);
        if(messagesResult.error)throw messagesResult.error;
        S.messages=(messagesResult.data||[]).reverse();
        S.members=membersResult.error?[]:(membersResult.data||[]);
        renderChat();
        await markRead();
        subscribeChat(id)
    }catch(error){
        console.error('Open chat:',error);
        S.view='list';
        toast(error?.message||'تعذر فتح المحادثة.');
        renderList()
    }
}
function canPost(){return S.current?.kind!=='channel'||S.current?.my_role==='owner'||S.current?.my_role==='admin'}
function renderChat(){let p=page();let title=S.current?.title||'\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629';p.innerHTML=`<div class="sm-chat"><header class="sm-head"><button class="sm-back">\u2039</button>${S.current?.avatar_url?`<img class="sm-avatar" src="${esc(S.current.avatar_url)}">`:`<div class="sm-avatar">${esc(title.slice(0,1))}</div>`}<div style="min-width:0;flex:1"><div class="sm-title">${esc(title)}</div><div class="sm-sub">${esc(S.current?.kind==='channel'?'\u0642\u0646\u0627\u0629':S.current?.kind==='group'?`${S.members.length} \u0623\u0639\u0636\u0627\u0621`:'\u0645\u062D\u0627\u062F\u062B\u0629 \u062E\u0627\u0635\u0629')}</div></div><button class="sm-icon" id="sm-info">\u22EE</button></header><div class="sm-msgs" id="sm-msgs"></div><div class="sm-replybar" id="sm-replybar"></div>${canPost()?`<div class="sm-compose"><button class="sm-icon" id="sm-attach">\uFF0B</button><textarea id="sm-input" placeholder="\u0627\u0643\u062A\u0628 \u0631\u0633\u0627\u0644\u0629..."></textarea><button class="sm-send" id="sm-send">\u27A4</button><input type="file" id="sm-file" hidden></div>`:`<div class="sm-compose" style="justify-content:center;color:#758091">\u0627\u0644\u0646\u0634\u0631 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0641\u0642\u0637</div>`}</div>`;p.querySelector('.sm-back').onclick=handleBack;p.querySelector('#sm-info').onclick=openInfo;let box=p.querySelector('#sm-msgs');box.innerHTML=S.messages.map(messageHtml).join('')||'<div class="sm-empty">\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0622\u0646</div>';box.scrollTop=box.scrollHeight;box.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>messageAction(b.dataset.action,b.dataset.id));if(canPost()){p.querySelector('#sm-send').onclick=send;p.querySelector('#sm-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};p.querySelector('#sm-attach').onclick=()=>p.querySelector('#sm-file').click();p.querySelector('#sm-file').onchange=e=>upload(e.target.files[0])}}
function messageHtml(m){if(m.message_type==='system')return`<div class="sm-msg system">${esc(m.body)}</div>`;let mine=m.sender_id===S.user.id;let media='';if(m.media_url){if(m.message_type==='image')media=`<img class="sm-media" src="${esc(m.media_url)}">`;else if(m.message_type==='video')media=`<video class="sm-media" controls src="${esc(m.media_url)}"></video>`;else if(m.message_type==='audio')media=`<audio controls src="${esc(m.media_url)}"></audio>`;else media=`<a class="sm-file" href="${esc(m.media_url)}" target="_blank">\uD83D\uDCCE ${esc(m.file_name||'\u0645\u0644\u0641')}</a>`}return`<article class="sm-msg ${mine?'mine':''}" tabindex="0">${S.current?.kind!=='direct'&&!mine?`<div class="sm-author">${esc(m.sender_name||m.sender_username||'\u0645\u0633\u062A\u062E\u062F\u0645')}</div>`:''}${m.reply_body?`<div class="sm-reply">${esc(m.reply_body)}</div>`:''}<div class="sm-text">${esc(m.deleted_at?'\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629':m.body||'')}</div>${media}<div class="sm-meta">${esc(fmt(m.created_at))}${m.edited_at?' \u00B7 \u0645\u0639\u062F\u0644\u0629':''}${mine?m.read_count>0?' \u00B7 \u2713\u2713':' \u00B7 \u2713':''}</div>${!m.deleted_at?`<div class="sm-actions"><button class="sm-mini" data-action="reply" data-id="${m.id}">\u21A9</button>${mine?`<button class="sm-mini" data-action="edit" data-id="${m.id}">\u270E</button><button class="sm-mini" data-action="delete" data-id="${m.id}">\uD83D\uDDD1</button>`:''}${S.current?.my_role==='owner'||S.current?.my_role==='admin'?`<button class="sm-mini" data-action="pin" data-id="${m.id}">\uD83D\uDCCC</button>`:''}</div>`:''}</article>`}
function messageAction(a,id){let m=S.messages.find(x=>String(x.id)===String(id));if(!m)return;if(a==='reply'){S.reply=m;showReply('\u0631\u062F \u0639\u0644\u0649: '+(m.body||m.file_name||'\u0631\u0633\u0627\u0644\u0629'))}if(a==='edit'){S.editing=m;let i=document.getElementById('sm-input');i.value=m.body||'';i.focus();showReply('\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629')}if(a==='delete')removeMessage(id);if(a==='pin')pinMessage(id)}
function showReply(t){let b=document.getElementById('sm-replybar');if(!b)return;b.classList.add('show');b.innerHTML=`<div style="flex:1">${esc(t)}</div><button class="sm-mini" id="sm-cancel-reply">\u2715</button>`;b.querySelector('#sm-cancel-reply').onclick=()=>{S.reply=null;S.editing=null;b.classList.remove('show')}}
async function send(){let i=document.getElementById('sm-input'),body=i?.value.trim();if(!body)return;let c=sb();if(S.editing){let{error}=await c.rpc('student_edit_message',{p_message:S.editing.id,p_body:body});if(error){toast(error.message);return}S.editing=null}else{let{error}=await c.rpc('student_send_message',{p_conversation:S.current.id,p_body:body,p_reply_to:S.reply?.id||null,p_message_type:'text',p_media_url:null,p_file_name:null,p_file_size:null});if(error){toast(error.message);return}}i.value='';S.reply=null;document.getElementById('sm-replybar')?.classList.remove('show')}
async function upload(file){if(!file)return;if(file.size>20*1024*1024){toast('\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 20MB');return}let c=sb(),ext=file.name.split('.').pop(),path=`${S.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;toast('\u062C\u0627\u0631\u064D \u0627\u0644\u0631\u0641\u0639...');let{error}=await c.storage.from('chat-media').upload(path,file);if(error){toast(error.message);return}let{data}=c.storage.from('chat-media').getPublicUrl(path);let type=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'file';let r=await c.rpc('student_send_message',{p_conversation:S.current.id,p_body:'',p_reply_to:S.reply?.id||null,p_message_type:type,p_media_url:data.publicUrl,p_file_name:file.name,p_file_size:file.size});if(r.error)toast(r.error.message);S.reply=null}
async function removeMessage(id){if(!confirm('\u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629\u061F'))return;let{error}=await sb().rpc('student_delete_message',{p_message:id});if(error)toast(error.message)}
async function pinMessage(id){let{error}=await sb().rpc('student_pin_message',{p_conversation:S.current.id,p_message:id});if(error)toast(error.message);else toast('\u062A\u0645 \u062A\u062B\u0628\u064A\u062A \u0627\u0644\u0631\u0633\u0627\u0644\u0629')}
async function markRead(){await sb().rpc('student_mark_conversation_read',{p_conversation:S.current.id});updateBadge()}
function subscribeChat(id){unsubscribeChat();S.channel=sb().channel('student-chat-'+id).on('postgres_changes',{event:'*',schema:'public',table:'chat_messages',filter:`conversation_id=eq.${id}`},async()=>{let{data}=await sb().rpc('student_get_messages',{p_conversation:id,p_before:null,p_limit:100});S.messages=(data||[]).reverse();renderChat();await markRead()}).subscribe()}
function unsubscribeChat(){if(S.channel){sb()?.removeChannel(S.channel);S.channel=null}}
function subscribeGlobal(){if(window.__studentMessagesGlobal)return;window.__studentMessagesGlobal=sb().channel('student-messages-global').on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},()=>{if(S.view==='list')loadConversations();else updateBadge()}).subscribe()}
async function updateBadge(){if(!S.user)S.user=await user();if(!S.user)return;let{data}=await sb().rpc('student_unread_messages_count');let n=Number(data||0);document.querySelectorAll('[data-section="messages"]').forEach(a=>{a.style.position='relative';a.querySelector('.sm-badge')?.remove();if(n>0){let b=document.createElement('span');b.className='sm-badge';b.textContent=n>99?'99+':n;a.appendChild(b)}})}
function openCreate(){let sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML=`<div class="sm-card"><h3>\u0625\u0646\u0634\u0627\u0621 \u062C\u062F\u064A\u062F</h3><div class="sm-actions-row" style="justify-content:stretch"><button class="sm-btn" id="sm-direct" style="flex:1">\u0645\u062D\u0627\u062F\u062B\u0629</button><button class="sm-btn" id="sm-group" style="flex:1">\u0645\u062C\u0645\u0648\u0639\u0629</button><button class="sm-btn" id="sm-channel" style="flex:1">\u0642\u0646\u0627\u0629</button></div><div class="sm-actions-row"><button class="sm-btn secondary" id="sm-close">\u0625\u0644\u063A\u0627\u0621</button></div></div>`;document.body.appendChild(sh);sh.querySelector('#sm-close').onclick=()=>sh.remove();sh.querySelector('#sm-direct').onclick=()=>{sh.remove();openUserSearch('direct')};sh.querySelector('#sm-group').onclick=()=>{sh.remove();createCommunity('group')};sh.querySelector('#sm-channel').onclick=()=>{sh.remove();createCommunity('channel')}}
function openUserSearch(){let i=document.getElementById('sm-search-users');i?.focus()}
function createCommunity(kind){let sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML=`<div class="sm-card"><h3>${kind==='group'?'\u0625\u0646\u0634\u0627\u0621 \u0645\u062C\u0645\u0648\u0639\u0629':'\u0625\u0646\u0634\u0627\u0621 \u0642\u0646\u0627\u0629'}</h3><div class="sm-field"><label>\u0627\u0644\u0627\u0633\u0645</label><input id="sm-name"></div><div class="sm-field"><label>\u0627\u0644\u0648\u0635\u0641</label><textarea id="sm-desc"></textarea></div><div class="sm-field"><label>\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629</label><select id="sm-public"><option value="false">\u062E\u0627\u0635\u0629</option><option value="true">\u0639\u0627\u0645\u0629</option></select></div><div class="sm-actions-row"><button class="sm-btn secondary" id="sm-cancel">\u0625\u0644\u063A\u0627\u0621</button><button class="sm-btn" id="sm-save">\u0625\u0646\u0634\u0627\u0621</button></div></div>`;document.body.appendChild(sh);sh.querySelector('#sm-cancel').onclick=()=>sh.remove();sh.querySelector('#sm-save').onclick=async()=>{let name=sh.querySelector('#sm-name').value.trim();if(!name)return toast('\u0627\u0643\u062A\u0628 \u0627\u0644\u0627\u0633\u0645');let{data,error}=await sb().rpc('student_create_community',{p_kind:kind,p_title:name,p_description:sh.querySelector('#sm-desc').value.trim(),p_is_public:sh.querySelector('#sm-public').value==='true'});if(error)return toast(error.message);sh.remove();openChat(data)}}
function openInfo(){let sh=document.createElement('div');sh.className='sm-sheet';let admin=S.current?.my_role==='owner'||S.current?.my_role==='admin';sh.innerHTML=`<div class="sm-card"><h3>${esc(S.current.title)}</h3><p>${esc(S.current.description||'')}</p>${S.current.kind!=='direct'?`<h4>\u0627\u0644\u0623\u0639\u0636\u0627\u0621 (${S.members.length})</h4><div class="sm-user-results">${S.members.map(m=>`<div class="sm-row">${avatar(m)}<div class="sm-main"><div class="sm-name">${esc(m.full_name||m.username)}</div><div class="sm-preview">${esc(m.role)}</div></div>${admin&&m.user_id!==S.user.id?`<button class="sm-mini" data-remove="${m.user_id}">\u062D\u0630\u0641</button>`:''}</div>`).join('')}</div>${admin?`<button class="sm-btn" id="sm-add-member">\u0625\u0636\u0627\u0641\u0629 \u0639\u0636\u0648</button>`:''}<button class="sm-btn danger" id="sm-leave">\u0645\u063A\u0627\u062F\u0631\u0629</button>`:''}<div class="sm-actions-row"><button class="sm-btn secondary" id="sm-close-info">\u0625\u063A\u0644\u0627\u0642</button></div></div>`;document.body.appendChild(sh);sh.querySelector('#sm-close-info').onclick=()=>sh.remove();sh.querySelector('#sm-leave')&&(sh.querySelector('#sm-leave').onclick=async()=>{let{error}=await sb().rpc('student_leave_conversation',{p_conversation:S.current.id});if(error)return toast(error.message);sh.remove();showList();loadConversations()});sh.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{let{error}=await sb().rpc('student_remove_member',{p_conversation:S.current.id,p_user:b.dataset.remove});if(error)toast(error.message);else{sh.remove();openChat(S.current.id)}});sh.querySelector('#sm-add-member')&&(sh.querySelector('#sm-add-member').onclick=()=>{sh.remove();addMemberSheet()})}
function addMemberSheet(){let sh=document.createElement('div');sh.className='sm-sheet';sh.innerHTML=`<div class="sm-card"><h3>\u0625\u0636\u0627\u0641\u0629 \u0639\u0636\u0648</h3><div class="sm-field"><input id="sm-member-search" placeholder="\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u064A\u0648\u0632\u0631"></div><div id="sm-member-results"></div><div class="sm-actions-row"><button class="sm-btn secondary" id="sm-member-close">\u0625\u063A\u0644\u0627\u0642</button></div></div>`;document.body.appendChild(sh);sh.querySelector('#sm-member-close').onclick=()=>sh.remove();let t;sh.querySelector('#sm-member-search').oninput=e=>{clearTimeout(t);t=setTimeout(async()=>{let q=e.target.value.trim();if(q.length<2)return;let{data}=await sb().from('profiles').select('id,full_name,username,avatar_url,role,is_verified,verification_color').or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);let box=sh.querySelector('#sm-member-results');box.innerHTML=(data||[]).map(p=>`<div class="sm-row" data-add="${p.id}">${avatar(p)}<div class="sm-main"><div class="sm-name">${esc(p.full_name||p.username)}${studentVerificationBadge(p,13)}</div><div class="sm-preview">@${esc(p.username||'')}</div></div></div>`).join('');box.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{let{error}=await sb().rpc('student_add_member',{p_conversation:S.current.id,p_user:b.dataset.add});if(error)toast(error.message);else{toast('\u062A\u0645\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u0629');sh.remove();openChat(S.current.id)}});},300);};}

window.addEventListener('popstate',()=>{
    if(!S.historyOpen)return;
    handleBack();
});
window.StudentMessages={open,close,handleBack,updateBadge};window.openStudentMessages=open;document.addEventListener('DOMContentLoaded',()=>setTimeout(updateBadge,1800));setTimeout(updateBadge,2200);
})();
