let supabaseClient = null;

async function initApp() {
    try {
        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("تعذر تحميل config.json");
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

    } catch (error) {
        console.error("خطأ في تشغيل التطبيق:", error);
    }
}

function openStage(stageName) {
    console.log("تم الانتقال إلى المرحلة الدراسية:", stageName);
}

initApp();
