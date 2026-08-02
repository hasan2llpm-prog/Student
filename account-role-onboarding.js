/* =========================================================
   Student - Account Role Onboarding
   اختيار حساب طالب أو مدرس
========================================================= */

(function () {
    "use strict";

    if (window.StudentAccountRoleOnboarding) return;

    const STORAGE_KEY = "student_pending_account_role";
    const GUEST_DONE_KEY = "student_guest_role_selected";
    let overlay = null;
    let busy = false;

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function close() {
        overlay?.remove();
        overlay = null;
        document.body.style.overflow = "";
    }

    function setMessage(message, type) {
        const el = document.getElementById("student-role-message");
        if (!el) return;
        el.textContent = message || "";
        el.style.color = type === "error" ? "#b42318" : "#18794e";
    }

    function setBusy(value) {
        busy = value;
        document.querySelectorAll("[data-student-role]").forEach((button) => {
            button.disabled = value;
            button.style.opacity = value ? "0.65" : "1";
        });
    }

    async function isAdmin(client) {
        if (!client) return false;
        const { data, error } = await client.rpc("current_user_is_admin");
        if (error) {
            console.warn("Admin role check failed:", error);
            return false;
        }
        return data === true;
    }

    async function openTeacherPortal() {
        try {
            if (!window.StudentTeachersEducation) {
                await new Promise((resolve, reject) => {
                    const old = document.querySelector('script[data-student-teachers="true"]');
                    if (old) {
                        old.addEventListener("load", resolve, { once: true });
                        old.addEventListener("error", reject, { once: true });
                        return;
                    }
                    const script = document.createElement("script");
                    script.src = "teachers-education.js";
                    script.async = true;
                    script.dataset.studentTeachers = "true";
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            window.StudentTeachersEducation?.openTeacherPortal?.();
        } catch (error) {
            console.error("Teacher portal loading failed:", error);
        }
    }

    async function chooseRole(role, options) {
        if (busy || !["student", "teacher"].includes(role)) return;

        const { supabaseClient, user, onSelected } = options;

        if (!user) {
            localStorage.setItem(STORAGE_KEY, role);
            localStorage.setItem(GUEST_DONE_KEY, "1");
            close();
            return;
        }

        setBusy(true);
        setMessage("جارٍ حفظ اختيارك...", "success");

        try {
            const { data, error } = await supabaseClient.rpc(
                "choose_account_role",
                { selected_role: role }
            );

            if (error) throw error;

            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(GUEST_DONE_KEY, "1");
            await onSelected?.(data || null);
            close();

            if (role === "teacher") {
                await openTeacherPortal();
            }
        } catch (error) {
            console.error("Choose account role error:", error);
            setMessage(error?.message || "تعذر حفظ نوع الحساب.", "error");
            setBusy(false);
        }
    }

    function render(options, pendingRole) {
        close();
        document.body.style.overflow = "hidden";

        overlay = document.createElement("div");
        overlay.id = "student-account-role-onboarding";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:2147483000;background:rgba(8,18,35,.72);
            display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;
            font-family:Tahoma,Arial,sans-serif;box-sizing:border-box;
        `;

        overlay.innerHTML = `
            <section style="width:100%;max-width:560px;max-height:94vh;overflow:auto;background:#fff;border-radius:24px;padding:22px;box-sizing:border-box;box-shadow:0 24px 70px rgba(0,0,0,.3);">
                <div style="text-align:center;margin-bottom:18px;">
                    <div style="width:58px;height:58px;border-radius:18px;background:#eaf4ff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;">🎓</div>
                    <h2 style="margin:0 0 8px;color:#14213d;font-size:23px;">اختر طريقة استخدام Student</h2>
                    <p style="margin:0;color:#667085;line-height:1.75;font-size:14px;">يمكنك إكمال الاستخدام كطالب، أو اختيار حساب مدرس وإرسال طلب اعتماد.</p>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                    <button type="button" data-student-role="student" style="text-align:right;border:2px solid ${pendingRole === "student" ? "#1877f2" : "#e4e7ec"};background:#fff;border-radius:18px;padding:17px;cursor:pointer;">
                        <strong style="display:block;color:#101828;font-size:18px;margin-bottom:9px;">👨‍🎓 الاستمرار كطالب</strong>
                        <span style="display:block;color:#475467;font-size:13px;line-height:1.8;">تصفح المراحل والمواد والمدرسين، والاستفادة من الملفات والشروحات المنشورة.</span>
                        <span style="display:block;color:#b42318;font-size:12px;line-height:1.7;margin-top:8px;">لا يجوز نشر محتوى تعليمي أو الظهور باسم مدرس.</span>
                    </button>

                    <button type="button" data-student-role="teacher" style="text-align:right;border:2px solid ${pendingRole === "teacher" ? "#d92d20" : "#e4e7ec"};background:#fff;border-radius:18px;padding:17px;cursor:pointer;">
                        <strong style="display:block;color:#101828;font-size:18px;margin-bottom:9px;">👨‍🏫 اختيار حساب مدرس</strong>
                        <span style="display:block;color:#475467;font-size:13px;line-height:1.8;">إنشاء صفحة مدرس، اختيار التخصص والمواد، ورفع الشروحات بعد اعتماد الطلب.</span>
                        <span style="display:block;color:#b42318;font-size:12px;line-height:1.7;margin-top:8px;">يلزم تقديم معلومات صحيحة والالتزام بجودة المحتوى وسياسات التطبيق.</span>
                    </button>
                </div>

                <div style="margin-top:14px;padding:13px 14px;background:#fff4f2;border:1px solid #fecdca;border-radius:14px;color:#912018;font-size:13px;line-height:1.8;">
                    🔴 يحصل المدرس المقبول على <strong>علامة توثيق حمراء مجانية</strong>. اختيار حساب مدرس لا يمنح التوثيق أو صلاحية النشر مباشرة؛ يبدأ ذلك بعد مراجعة الأدمن والموافقة.
                </div>

                <div id="student-role-message" style="min-height:22px;margin-top:10px;text-align:center;font-size:13px;"></div>
            </section>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll("[data-student-role]").forEach((button) => {
            button.addEventListener("click", () => {
                chooseRole(button.dataset.studentRole, options);
            });
        });
    }

    async function open(options = {}) {
        const profile = options.profile || null;
        const user = options.user || null;
        const client = options.supabaseClient || window.supabaseClient || null;

        if (user) {
            if (profile?.account_type_selected === true) return;
            if (await isAdmin(client)) return;
        } else if (localStorage.getItem(GUEST_DONE_KEY) === "1") {
            return;
        }

        const pendingRole = localStorage.getItem(STORAGE_KEY) || "";
        render({ ...options, supabaseClient: client }, pendingRole);
    }

    window.StudentAccountRoleOnboarding = { open, close };
})();
