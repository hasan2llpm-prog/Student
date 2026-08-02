/* =========================================================
   Student - Store
   منتجات + أسعار مالية/ألماس + مهام كسب الألماس
========================================================= */

(function () {
    "use strict";

    if (window.StudentStore?.version) return;

    const state = {
        products: [],
        tasks: [],
        balance: 0,
        activeTab: "products",
        historyActive: false,
        closingFromHistory: false,
        loading: false
    };

    let overlay = null;

    function db() {
        if (typeof supabaseClient !== "undefined" && supabaseClient) return supabaseClient;
        return window.supabaseClient || null;
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function money(value, currency) {
        const amount = Number(value || 0);
        const formatted = new Intl.NumberFormat("ar-IQ", {
            maximumFractionDigits: amount % 1 ? 2 : 0
        }).format(amount);
        return `${formatted} ${esc(currency || "د.ع")}`;
    }

    function injectStyles() {
        if (document.getElementById("student-store-style")) return;

        const style = document.createElement("style");
        style.id = "student-store-style";
        style.textContent = `
            #student-store-overlay {
                position:fixed;
                inset:0;
                z-index:9999994;
                display:none;
                flex-direction:column;
                background:#f7f8fa;
                color:#1f2937;
                direction:rtl;
            }
            #student-store-overlay.show { display:flex; }
            .student-store-header {
                min-height:64px;
                display:grid;
                grid-template-columns:46px 1fr auto;
                align-items:center;
                gap:10px;
                padding:9px 14px;
                border-bottom:1px solid #e6e8ec;
                background:#fff;
                flex-shrink:0;
            }
            .student-store-close {
                width:42px;
                height:42px;
                border:0;
                border-radius:50%;
                background:#f1f3f5;
                color:#222;
                font-size:21px;
                cursor:pointer;
                touch-action:manipulation;
            }
            .student-store-title {
                text-align:center;
                font-size:20px;
                font-weight:900;
            }
            .student-store-balance {
                min-width:82px;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:6px;
                padding:9px 11px;
                border-radius:14px;
                background:#eef5ff;
                color:#1757b8;
                font-weight:800;
                white-space:nowrap;
            }
            .student-store-diamond { color:#00a6ff; }
            .student-store-tabs {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:8px;
                padding:10px 14px;
                background:#fff;
                border-bottom:1px solid #eceef1;
                flex-shrink:0;
            }
            .student-store-tab {
                min-height:44px;
                border:0;
                border-radius:13px;
                background:#f2f4f7;
                color:#596273;
                font-size:14px;
                font-weight:800;
                cursor:pointer;
            }
            .student-store-tab.active {
                background:#0095f6;
                color:#fff;
            }
            .student-store-body {
                flex:1;
                overflow-y:auto;
                padding:14px;
                -webkit-overflow-scrolling:touch;
            }
            .student-store-grid {
                width:100%;
                max-width:920px;
                margin:0 auto;
                display:grid;
                grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
                gap:14px;
            }
            .student-store-card {
                overflow:hidden;
                border:1px solid #e2e5e9;
                border-radius:18px;
                background:#fff;
                box-shadow:0 4px 16px rgba(15,23,42,.04);
            }
            .student-store-image {
                width:100%;
                aspect-ratio:4/3;
                object-fit:cover;
                display:block;
                background:#edf2f7;
            }
            .student-store-image-placeholder {
                width:100%;
                aspect-ratio:4/3;
                display:flex;
                align-items:center;
                justify-content:center;
                background:linear-gradient(135deg,#edf6ff,#f6f8fb);
                color:#0095f6;
                font-size:42px;
            }
            .student-store-card-body { padding:14px; }
            .student-store-product-name {
                font-size:17px;
                font-weight:900;
                line-height:1.5;
                color:#17202a;
            }
            .student-store-description {
                margin-top:7px;
                min-height:42px;
                color:#697386;
                font-size:13px;
                line-height:1.7;
                display:-webkit-box;
                -webkit-line-clamp:2;
                -webkit-box-orient:vertical;
                overflow:hidden;
            }
            .student-store-prices {
                display:flex;
                flex-wrap:wrap;
                gap:7px;
                margin-top:12px;
            }
            .student-store-price {
                display:inline-flex;
                align-items:center;
                gap:6px;
                padding:8px 10px;
                border-radius:12px;
                background:#f6f7f9;
                color:#263238;
                font-size:13px;
                font-weight:800;
            }
            .student-store-price.diamonds {
                background:#eef8ff;
                color:#096aa8;
            }
            .student-store-buy {
                width:100%;
                min-height:45px;
                margin-top:13px;
                border:0;
                border-radius:13px;
                background:#0095f6;
                color:#fff;
                font-size:14px;
                font-weight:900;
                cursor:pointer;
            }
            .student-store-buy:disabled { opacity:.55; cursor:not-allowed; }
            .student-store-stock {
                margin-top:8px;
                font-size:12px;
                color:#7b8491;
            }
            .student-store-empty,
            .student-store-loading {
                max-width:560px;
                margin:52px auto;
                padding:34px 18px;
                text-align:center;
                border:1px solid #e5e7eb;
                border-radius:20px;
                background:#fff;
                color:#717b8a;
                line-height:1.8;
            }
            .student-store-empty i,
            .student-store-loading i {
                display:block;
                margin-bottom:14px;
                color:#0095f6;
                font-size:40px;
            }
            .student-store-task-list {
                width:100%;
                max-width:720px;
                margin:0 auto;
                display:grid;
                gap:12px;
            }
            .student-store-task {
                display:grid;
                grid-template-columns:54px 1fr auto;
                align-items:center;
                gap:12px;
                padding:14px;
                border:1px solid #e2e5e9;
                border-radius:17px;
                background:#fff;
            }
            .student-store-task-icon {
                width:52px;
                height:52px;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:16px;
                background:#eef8ff;
                color:#0095f6;
                font-size:23px;
            }
            .student-store-task-title { font-weight:900; color:#1f2937; }
            .student-store-task-description {
                margin-top:4px;
                color:#77808f;
                font-size:12px;
                line-height:1.6;
            }
            .student-store-task-reward {
                margin-top:6px;
                color:#0878bd;
                font-size:13px;
                font-weight:900;
            }
            .student-store-claim {
                min-width:82px;
                min-height:40px;
                border:0;
                border-radius:12px;
                background:#e9f6ff;
                color:#0878bd;
                font-weight:900;
                cursor:pointer;
            }
            .student-store-modal {
                position:absolute;
                inset:0;
                z-index:4;
                display:none;
                align-items:center;
                justify-content:center;
                padding:16px;
                background:rgba(0,0,0,.46);
            }
            .student-store-modal.show { display:flex; }
            .student-store-modal-card {
                width:100%;
                max-width:430px;
                max-height:88vh;
                overflow-y:auto;
                padding:18px;
                border-radius:20px;
                background:#fff;
                box-shadow:0 20px 60px rgba(0,0,0,.24);
            }
            .student-store-modal-head {
                display:flex;
                align-items:center;
                gap:10px;
                margin-bottom:14px;
            }
            .student-store-modal-title { flex:1; font-size:18px; font-weight:900; }
            .student-store-modal-close {
                width:38px;
                height:38px;
                border:0;
                border-radius:50%;
                background:#f1f3f5;
                cursor:pointer;
                font-size:20px;
            }
            .student-store-payment-options { display:grid; gap:10px; }
            .student-store-payment {
                width:100%;
                min-height:52px;
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                border:1px solid #dfe4ea;
                border-radius:14px;
                padding:12px 14px;
                background:#fff;
                color:#27313c;
                font-weight:800;
                cursor:pointer;
            }
            .student-store-payment:hover { border-color:#0095f6; }
            .student-store-note {
                margin-top:13px;
                padding:11px 12px;
                border-radius:12px;
                background:#fff8e8;
                color:#7b5b12;
                font-size:12px;
                line-height:1.7;
            }
            .student-store-toast {
                position:fixed;
                left:50%;
                bottom:82px;
                z-index:100000000;
                transform:translateX(-50%);
                max-width:88vw;
                padding:11px 16px;
                border-radius:13px;
                background:#20242a;
                color:#fff;
                text-align:center;
                font-size:13px;
                box-shadow:0 10px 28px rgba(0,0,0,.25);
            }
            @media (max-width:560px) {
                .student-store-header { grid-template-columns:44px 1fr auto; padding-inline:10px; }
                .student-store-balance { min-width:70px; padding-inline:8px; font-size:13px; }
                .student-store-grid { grid-template-columns:1fr; }
                .student-store-task { grid-template-columns:48px 1fr; }
                .student-store-claim { grid-column:1/-1; width:100%; }
            }
        `;
        document.head.appendChild(style);
    }

    function createOverlay() {
        if (overlay) return;

        overlay = document.createElement("section");
        overlay.id = "student-store-overlay";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
            <header class="student-store-header">
                <button id="student-store-close" class="student-store-close" type="button" aria-label="رجوع">‹</button>
                <div class="student-store-title">المتجر</div>
                <div class="student-store-balance" title="رصيد الألماس">
                    <i class="fa-solid fa-gem student-store-diamond"></i>
                    <span id="student-store-balance-value">0</span>
                </div>
            </header>
            <div class="student-store-tabs" role="tablist">
                <button class="student-store-tab active" type="button" data-store-tab="products">المنتجات</button>
                <button class="student-store-tab" type="button" data-store-tab="tasks">مهام الألماس</button>
            </div>
            <main id="student-store-body" class="student-store-body"></main>
            <div id="student-store-modal" class="student-store-modal" aria-hidden="true"></div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("student-store-close")?.addEventListener("click", function (event) {
            event.preventDefault();
            close();
        });

        overlay.querySelectorAll("[data-store-tab]").forEach(function (button) {
            button.addEventListener("click", function () {
                state.activeTab = this.dataset.storeTab || "products";
                updateTabs();
                render();
            });
        });

        document.getElementById("student-store-body")?.addEventListener("click", handleBodyClick);
        document.getElementById("student-store-modal")?.addEventListener("click", handleModalClick);
    }

    function toast(message) {
        const element = document.createElement("div");
        element.className = "student-store-toast";
        element.textContent = message;
        document.body.appendChild(element);
        setTimeout(function () { element.remove(); }, 2600);
    }

    function updateBalance() {
        const element = document.getElementById("student-store-balance-value");
        if (element) element.textContent = String(Math.max(0, Number(state.balance || 0)));
    }

    function updateTabs() {
        overlay?.querySelectorAll("[data-store-tab]").forEach(function (button) {
            button.classList.toggle("active", button.dataset.storeTab === state.activeTab);
        });
    }

    function renderLoading() {
        const body = document.getElementById("student-store-body");
        if (!body) return;
        body.innerHTML = `
            <div class="student-store-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                جارٍ تحميل المتجر...
            </div>
        `;
    }

    function renderProducts() {
        const body = document.getElementById("student-store-body");
        if (!body) return;

        if (!state.products.length) {
            body.innerHTML = `
                <div class="student-store-empty">
                    <i class="fa-solid fa-store"></i>
                    <strong>لا توجد منتجات حاليًا</strong>
                    <div>ستظهر المنتجات هنا عند إضافتها لاحقًا.</div>
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div class="student-store-grid">
                ${state.products.map(function (product) {
                    const soldOut = product.stock !== null && Number(product.stock) <= 0;
                    return `
                        <article class="student-store-card">
                            ${product.image_url
                                ? `<img class="student-store-image" src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy">`
                                : `<div class="student-store-image-placeholder"><i class="fa-solid fa-box-open"></i></div>`}
                            <div class="student-store-card-body">
                                <div class="student-store-product-name">${esc(product.name)}</div>
                                <div class="student-store-description">${esc(product.description || "لا يوجد وصف للمنتج.")}</div>
                                <div class="student-store-prices">
                                    ${product.allow_money
                                        ? `<span class="student-store-price"><i class="fa-solid fa-money-bill-wave"></i>${money(product.price_money, product.currency)}</span>`
                                        : ""}
                                    ${product.allow_diamonds
                                        ? `<span class="student-store-price diamonds"><i class="fa-solid fa-gem"></i>${Number(product.price_diamonds || 0)} ألماسة</span>`
                                        : ""}
                                </div>
                                <div class="student-store-stock">${soldOut ? "نفد المخزون" : product.stock === null ? "متوفر" : `المتوفر: ${Number(product.stock)}`}</div>
                                <button class="student-store-buy" type="button" data-store-product="${esc(product.id)}" ${soldOut ? "disabled" : ""}>${soldOut ? "غير متوفر" : "شراء"}</button>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderTasks() {
        const body = document.getElementById("student-store-body");
        if (!body) return;

        if (!state.tasks.length) {
            body.innerHTML = `
                <div class="student-store-empty">
                    <i class="fa-solid fa-list-check"></i>
                    <strong>لا توجد مهام متاحة حاليًا</strong>
                    <div>ستضاف مهام كسب الألماس داخل المتجر لاحقًا.</div>
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div class="student-store-task-list">
                ${state.tasks.map(function (task) {
                    const canClaim = task.verification_type === "daily_visit";
                    return `
                        <article class="student-store-task">
                            <div class="student-store-task-icon"><i class="fa-solid fa-bullseye"></i></div>
                            <div>
                                <div class="student-store-task-title">${esc(task.title)}</div>
                                <div class="student-store-task-description">${esc(task.description || "أكمل المهمة للحصول على الألماس.")}</div>
                                <div class="student-store-task-reward"><i class="fa-solid fa-gem"></i> +${Number(task.reward_diamonds || 0)} ألماسة</div>
                            </div>
                            <button class="student-store-claim" type="button" data-store-task="${esc(task.id)}" ${canClaim ? "" : "disabled"}>${canClaim ? "استلام" : "تلقائي"}</button>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function render() {
        updateBalance();
        updateTabs();
        if (state.loading) return renderLoading();
        if (state.activeTab === "tasks") return renderTasks();
        renderProducts();
    }

    function isMissingTable(error) {
        const code = String(error?.code || "");
        const message = String(error?.message || "").toLowerCase();
        return code === "42P01" || code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
    }

    async function currentUser() {
        const client = db();
        if (!client) return null;
        const { data } = await client.auth.getUser();
        return data?.user || null;
    }

    async function loadProducts(client) {
        const { data, error } = await client
            .from("store_products")
            .select("id,name,description,image_url,price_money,currency,price_diamonds,allow_money,allow_diamonds,stock,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            if (isMissingTable(error)) return [];
            throw error;
        }
        return data || [];
    }

    async function loadTasks(client) {
        const { data, error } = await client
            .from("store_tasks")
            .select("id,title,description,reward_diamonds,repeat_kind,verification_type,starts_at,ends_at,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            if (isMissingTable(error)) return [];
            throw error;
        }

        const now = Date.now();
        return (data || []).filter(function (task) {
            const startsAt = task.starts_at ? Date.parse(task.starts_at) : null;
            const endsAt = task.ends_at ? Date.parse(task.ends_at) : null;
            return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
        });
    }

    async function loadBalance(client, user) {
        if (!user) return 0;
        const { data, error } = await client
            .from("store_user_diamonds")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
            if (isMissingTable(error)) return 0;
            throw error;
        }
        return Number(data?.balance || 0);
    }

    async function refresh() {
        if (state.loading) return;
        const client = db();
        if (!client) {
            state.products = [];
            state.tasks = [];
            state.balance = 0;
            render();
            return;
        }

        state.loading = true;
        render();

        try {
            const user = await currentUser();
            const [products, tasks, balance] = await Promise.all([
                loadProducts(client),
                loadTasks(client),
                loadBalance(client, user)
            ]);
            state.products = products;
            state.tasks = tasks;
            state.balance = balance;
        } catch (error) {
            console.error("Student Store:", error);
            toast("تعذر تحميل المتجر حاليًا.");
        } finally {
            state.loading = false;
            render();
        }
    }

    function open() {
        injectStyles();
        createOverlay();
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (typeof closeFloatingPanel === "function") closeFloatingPanel();

        if (!state.historyActive) {
            history.pushState({ studentStore: true }, "", location.href);
            state.historyActive = true;
        }

        refresh();
    }

    function hide() {
        if (!overlay) return;
        closeModal();
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        document.querySelectorAll("nav a").forEach(function (link) {
            link.classList.toggle("active", link.dataset.section === "home");
        });
    }

    function close(fromHistory = false) {
        if (fromHistory) {
            state.historyActive = false;
            hide();
            return;
        }

        if (state.historyActive && !state.closingFromHistory) {
            state.closingFromHistory = true;
            state.historyActive = false;
            history.back();
            setTimeout(function () { state.closingFromHistory = false; }, 0);
            return;
        }

        hide();
    }

    window.addEventListener("popstate", function () {
        if (state.historyActive && overlay?.classList.contains("show")) {
            close(true);
        }
    });

    function selectedProduct(id) {
        return state.products.find(function (product) { return product.id === id; }) || null;
    }

    function openPaymentModal(product) {
        const modal = document.getElementById("student-store-modal");
        if (!modal || !product) return;

        modal.innerHTML = `
            <div class="student-store-modal-card" role="dialog" aria-modal="true">
                <div class="student-store-modal-head">
                    <div class="student-store-modal-title">${esc(product.name)}</div>
                    <button class="student-store-modal-close" type="button" data-store-modal-close aria-label="إغلاق">×</button>
                </div>
                <div class="student-store-payment-options">
                    ${product.allow_money
                        ? `<button class="student-store-payment" type="button" data-store-pay="money" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-money-bill-wave"></i> الدفع المالي</span><strong>${money(product.price_money, product.currency)}</strong></button>`
                        : ""}
                    ${product.allow_diamonds
                        ? `<button class="student-store-payment" type="button" data-store-pay="diamonds" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-gem student-store-diamond"></i> الدفع بالألماس</span><strong>${Number(product.price_diamonds || 0)} ألماسة</strong></button>`
                        : ""}
                </div>
                ${product.allow_money ? `<div class="student-store-note">الدفع المالي يُسجل كطلب قيد المراجعة. ربط بوابة دفع إلكترونية يتم لاحقًا.</div>` : ""}
            </div>
        `;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        const modal = document.getElementById("student-store-modal");
        if (!modal) return;
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = "";
    }

    async function claimTask(taskId, button) {
        const client = db();
        if (!client) return toast("الخدمة غير متاحة حاليًا.");
        if (!taskId || button?.disabled) return;

        button.disabled = true;
        const oldText = button.textContent;
        button.textContent = "...";

        try {
            const { data, error } = await client.rpc("claim_store_task", { p_task_id: taskId });
            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;
            state.balance = Number(result?.new_balance ?? result?.balance ?? state.balance);
            updateBalance();
            toast(`تمت إضافة ${Number(result?.reward_diamonds || 0)} ألماسة.`);
            button.textContent = "تم";
        } catch (error) {
            console.error("Claim store task:", error);
            toast(error?.message || "تعذر استلام المكافأة.");
            button.disabled = false;
            button.textContent = oldText;
        }
    }

    async function createOrder(productId, paymentMethod, button) {
        const client = db();
        if (!client) return toast("الخدمة غير متاحة حاليًا.");
        if (!productId || !paymentMethod || button?.disabled) return;

        button.disabled = true;
        const oldText = button.innerHTML;
        button.textContent = "جارٍ إنشاء الطلب...";

        try {
            const { data, error } = await client.rpc("create_store_order", {
                p_product_id: productId,
                p_payment_method: paymentMethod
            });
            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;
            if (result?.new_balance !== undefined && result?.new_balance !== null) {
                state.balance = Number(result.new_balance);
                updateBalance();
            }

            closeModal();
            toast(paymentMethod === "diamonds" ? "تم شراء المنتج بالألماس." : "تم تسجيل الطلب المالي للمراجعة.");
            await refresh();
        } catch (error) {
            console.error("Create store order:", error);
            toast(error?.message || "تعذر إنشاء الطلب.");
            button.disabled = false;
            button.innerHTML = oldText;
        }
    }

    function handleBodyClick(event) {
        const productButton = event.target.closest("[data-store-product]");
        if (productButton) {
            event.preventDefault();
            const product = selectedProduct(productButton.dataset.storeProduct);
            if (product) openPaymentModal(product);
            return;
        }

        const taskButton = event.target.closest("[data-store-task]");
        if (taskButton) {
            event.preventDefault();
            claimTask(taskButton.dataset.storeTask, taskButton);
        }
    }

    function handleModalClick(event) {
        if (event.target.id === "student-store-modal" || event.target.closest("[data-store-modal-close]")) {
            event.preventDefault();
            closeModal();
            return;
        }

        const paymentButton = event.target.closest("[data-store-pay]");
        if (paymentButton) {
            event.preventDefault();
            createOrder(paymentButton.dataset.productId, paymentButton.dataset.storePay, paymentButton);
        }
    }

    window.StudentStore = {
        version: "1.0.0",
        open,
        close,
        refresh
    };
    window.openStudentStore = open;
})();
