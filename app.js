/* =========================================================
   تهيئة Supabase مباشرة داخل الكود
========================================================= */

const SUPABASE_URL = "https://mlcbixsyizsuxxfjwrym.supabase.co";
const SUPABASE_KEY = "sb_publishable_DDvBmb3o1x_VfArVUg-mzw_nbsR7rRA";

let supabaseClient = null;

try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase connected successfully.");
    } else {
        console.error("مكتبة Supabase غير محملة في النافذة.");
    }
} catch (error) {
    console.error("خطأ في تهيئة Supabase:", error);
}

/* =========================================================
   التحقق من جاهزية التطبيق وتسجيل الدخول
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");
    const loginMessage = document.getElementById("login-message");

    if (supabaseClient) {
        if (loginMessage) {
            loginMessage.textContent = "";
        }
        if (loginBtn) loginBtn.disabled = false;
        if (registerBtn) registerBtn.disabled = false;
    } else {
        if (loginMessage) {
            loginMessage.textContent = "خطأ في الاتصال بقاعدة البيانات.";
            loginMessage.className = "auth-message error";
        }
    }

    // تبديل واجهات تسجيل الدخول وإنشاء الحساب
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");
    const loginSection = document.getElementById("login-section");
    const registerSection = document.getElementById("register-section");

    if (showRegister && showLogin && loginSection && registerSection) {
        showRegister.addEventListener("click", () => {
            loginSection.classList.add("hidden");
            registerSection.classList.remove("hidden");
        });

        showLogin.addEventListener("click", () => {
            registerSection.classList.add("hidden");
            loginSection.classList.remove("hidden");
        });
    }

    // التعامل مع نموذج تسجيل الدخول
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            if (!supabaseClient) {
                alert("عفواً، الاتصال بقاعدة البيانات غير جاهز.");
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // الانتقال للشاشة الرئيسية عند نجاح الدخول
                document.getElementById("auth-screen").classList.add("hidden");
                document.getElementById("main-screen").classList.remove("hidden");
            } catch (err) {
                if (loginMessage) {
                    loginMessage.textContent = "خطأ: " + err.message;
                    loginMessage.className = "auth-message error";
                }
            }
        });
    }

    // التعامل مع نموذج إنشاء الحساب
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const name = document.getElementById("register-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("register-password-confirm").value;
            const registerMessage = document.getElementById("register-message");

            if (password !== confirmPassword) {
                if (registerMessage) {
                    registerMessage.textContent = "كلمتا المرور غير متطابقتين.";
                    registerMessage.className = "auth-message error";
                }
                return;
            }

            if (!supabaseClient) {
                alert("عفواً، الاتصال بقاعدة البيانات غير جاهز.");
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { full_name: name }
                    }
                });

                if (error) throw error;

                if (registerMessage) {
                    registerMessage.textContent = "تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.";
                    registerMessage.className = "auth-message success";
                }
            } catch (err) {
                if (registerMessage) {
                    registerMessage.textContent = "خطأ: " + err.message;
                    registerMessage.className = "auth-message error";
                }
            }
        });
    }
});
