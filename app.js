let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-prog/Student/main/config.json";

async function initApp() {
    try {
        const response = await fetch(CONFIG_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("تعذر تحميل config.json من GitHub");
        }

        const config = await response.json();

        if (!config.supabase_url || !config.supabase_key) {
            throw new Error("بيانات Supabase ناقصة في config.json");
        }

        if (!window.supabase) {
            throw new Error("مكتبة Supabase لم يتم تحميلها");
        }

        supabaseClient = window.supabase.createClient(
            config.supabase_url,
            config.supabase_key
        );

        console.log("تم تشغيل Supabase بنجاح");
        console.log("رابط التطبيق:", config.app_url);
        console.log("الإصدار:", config.version);

    } catch (error) {
        console.error("خطأ في تشغيل التطبيق:", error);
    }
}

function openStage(stageName) {
    console.log("تم الانتقال إلى المرحلة الدراسية:", stageName);
}

initApp();
