/* =========================================================
   Student - Store
   منتجات + أسعار مالية/ألماس + مهام كسب الألماس
   إدارة المنتجات تظهر للمشرف فقط
========================================================= */

(function () {
    "use strict";

    if (window.StudentStore?.version) return;

    const PRODUCT_IMAGE_MAX = 5 * 1024 * 1024;
    const STORE_MASTER_NUMBER = "6783943118";
    const STORE_MASTER_NAME = "JAWAD R SAGBAN";
    const STORE_WHATSAPP = "9647725541189";

    const state = {
        products: [],
        tasks: [],
        balance: 0,
        currentOrder: null,
        activeTab: "products",
        isAdmin: false,
        user: null,
        historyActive: false,
        closingFromHistory: false,
        loading: false,
        saving: false
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
        return `${formatted} ${esc(currency || "IQD")}`;
    }

    function isMissingTable(error) {
        const code = String(error?.code || "");
        const message = String(error?.message || "").toLowerCase();
        return code === "42P01" || code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
    }

    function isMissingColumn(error, column) {
        const message = String(error?.message || "").toLowerCase();
        return message.includes("column") && message.includes(String(column || "").toLowerCase());
    }

    function injectStyles() {
        if (document.getElementById("student-store-style")) return;

        const style = document.createElement("style");
        style.id = "student-store-style";
        style.textContent = `
            #student-store-overlay {
                position:fixed; inset:0; z-index:9999994; display:none;
                flex-direction:column; background:#f7f8fa; color:#1f2937;
                direction:rtl; box-sizing:border-box;
            }
            #student-store-overlay.show { display:flex; }
            .student-store-header {
                min-height:64px; display:grid;
                grid-template-columns:44px minmax(70px,1fr) auto auto;
                align-items:center; gap:8px; padding:9px 12px;
                border-bottom:1px solid #e6e8ec; background:#fff; flex-shrink:0;
            }
            .student-store-close {
                width:42px; height:42px; border:0; border-radius:50%;
                background:#f1f3f5; color:#222; font-size:21px;
                cursor:pointer; touch-action:manipulation;
            }
            .student-store-title { text-align:center; font-size:20px; font-weight:900; }
            .student-store-admin-add {
                display:none; min-height:40px; align-items:center; gap:6px;
                padding:8px 11px; border:0; border-radius:12px;
                background:#1473e6; color:#fff; font-weight:900;
                cursor:pointer; white-space:nowrap;
            }
            .student-store-admin-add.show { display:inline-flex; }
            .student-store-balance {
                min-width:72px; display:flex; align-items:center; justify-content:center;
                gap:6px; padding:9px 10px; border-radius:14px;
                background:#eef5ff; color:#1757b8; font-weight:800; white-space:nowrap;
            }
            .student-store-diamond { color:#00a6ff; }
            .student-store-tabs {
                display:grid; grid-template-columns:1fr 1fr; gap:8px;
                padding:10px 14px; background:#fff; border-bottom:1px solid #eceef1;
                flex-shrink:0;
            }
            .student-store-tab {
                min-height:44px; border:0; border-radius:13px;
                background:#f2f4f7; color:#596273; font-size:14px;
                font-weight:800; cursor:pointer;
            }
            .student-store-tab.active { background:#0095f6; color:#fff; }
            .student-store-body {
                flex:1; overflow-y:auto; padding:14px; -webkit-overflow-scrolling:touch;
            }
            .student-store-grid {
                width:100%; max-width:920px; margin:0 auto; display:grid;
                grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px;
            }
            .student-store-card {
                overflow:hidden; border:1px solid #e2e5e9; border-radius:18px;
                background:#fff; box-shadow:0 4px 16px rgba(15,23,42,.04);
            }
            .student-store-card.inactive { opacity:.72; }
            .student-store-image {
                width:100%; aspect-ratio:4/3; object-fit:cover; display:block; background:#edf2f7;
            }
            .student-store-image-placeholder {
                width:100%; aspect-ratio:4/3; display:flex; align-items:center;
                justify-content:center; background:linear-gradient(135deg,#edf6ff,#f6f8fb);
                color:#0095f6; font-size:42px;
            }
            .student-store-card-body { padding:14px; }
            .student-store-card-top { display:flex; align-items:flex-start; gap:8px; }
            .student-store-product-name {
                flex:1; font-size:17px; font-weight:900; line-height:1.5; color:#17202a;
            }
            .student-store-status {
                padding:5px 8px; border-radius:999px; background:#fff2dc;
                color:#98610b; font-size:11px; font-weight:900; white-space:nowrap;
            }
            .student-store-description {
                margin-top:7px; min-height:42px; color:#697386; font-size:13px;
                line-height:1.7; display:-webkit-box; -webkit-line-clamp:2;
                -webkit-box-orient:vertical; overflow:hidden;
            }
            .student-store-prices { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
            .student-store-price {
                display:inline-flex; align-items:center; gap:6px; padding:8px 10px;
                border-radius:12px; background:#f6f7f9; color:#263238;
                font-size:13px; font-weight:800;
            }
            .student-store-price.diamonds { background:#eef8ff; color:#096aa8; }
            .student-store-stock { margin-top:8px; font-size:12px; color:#7b8491; }
            .student-store-buy {
                width:100%; min-height:45px; margin-top:13px; border:0;
                border-radius:13px; background:#0095f6; color:#fff;
                font-size:14px; font-weight:900; cursor:pointer;
            }
            .student-store-buy:disabled { opacity:.55; cursor:not-allowed; }
            .student-store-admin-tools { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:9px; }
            .student-store-admin-tool {
                min-height:40px; border:0; border-radius:11px; font-weight:900; cursor:pointer;
            }
            .student-store-admin-tool.edit { background:#edf5ff; color:#1767c2; }
            .student-store-admin-tool.delete { background:#fff0f0; color:#bb2525; }
            .student-store-empty, .student-store-loading {
                max-width:560px; margin:52px auto; padding:34px 18px; text-align:center;
                border:1px solid #e5e7eb; border-radius:20px; background:#fff;
                color:#717b8a; line-height:1.8;
            }
            .student-store-empty i, .student-store-loading i {
                display:block; margin-bottom:14px; color:#0095f6; font-size:40px;
            }
            .student-store-empty-add {
                margin-top:16px; min-height:43px; padding:0 18px; border:0;
                border-radius:12px; background:#1473e6; color:#fff; font-weight:900; cursor:pointer;
            }
            .student-store-task-list { width:100%; max-width:720px; margin:0 auto; display:grid; gap:12px; }
            .student-store-task {
                display:grid; grid-template-columns:54px 1fr auto; align-items:center;
                gap:12px; padding:14px; border:1px solid #e2e5e9;
                border-radius:17px; background:#fff;
            }
            .student-store-task-icon {
                width:52px; height:52px; display:flex; align-items:center;
                justify-content:center; border-radius:16px; background:#eef8ff;
                color:#0095f6; font-size:23px;
            }
            .student-store-task-title { font-weight:900; color:#1f2937; }
            .student-store-task-description { margin-top:4px; color:#77808f; font-size:12px; line-height:1.6; }
            .student-store-task-reward { margin-top:6px; color:#0878bd; font-size:13px; font-weight:900; }
            .student-store-claim {
                min-width:82px; min-height:40px; border:0; border-radius:12px;
                background:#e9f6ff; color:#0878bd; font-weight:900; cursor:pointer;
            }
            .student-store-modal {
                position:absolute; inset:0; z-index:4; display:none; align-items:center;
                justify-content:center; padding:16px; background:rgba(0,0,0,.46);
            }
            .student-store-modal.show { display:flex; }
            .student-store-modal-card {
                width:100%; max-width:470px; max-height:90vh; overflow-y:auto;
                padding:18px; border-radius:20px; background:#fff;
                box-shadow:0 20px 60px rgba(0,0,0,.24); box-sizing:border-box;
            }
            .student-store-modal-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
            .student-store-modal-title { flex:1; font-size:18px; font-weight:900; }
            .student-store-modal-close {
                width:38px; height:38px; border:0; border-radius:50%;
                background:#f1f3f5; cursor:pointer; font-size:20px;
            }
            .student-store-payment-options { display:grid; gap:10px; }
            .student-store-payment {
                width:100%; min-height:52px; display:flex; align-items:center;
                justify-content:space-between; gap:12px; border:1px solid #dfe4ea;
                border-radius:14px; padding:12px 14px; background:#fff;
                color:#27313c; font-weight:800; cursor:pointer;
            }
            .student-store-note {
                margin-top:13px; padding:11px 12px; border-radius:12px;
                background:#fff8e8; color:#7b5b12; font-size:12px; line-height:1.7;
            }
            .student-store-form { display:grid; gap:12px; }
            .student-store-field { display:grid; gap:6px; }
            .student-store-field label { font-size:13px; font-weight:900; color:#384252; }
            .student-store-input, .student-store-textarea {
                width:100%; border:1px solid #d9dee5; border-radius:12px;
                padding:11px 12px; outline:none; background:#fff; box-sizing:border-box;
                font:inherit;
            }
            .student-store-textarea { min-height:90px; resize:vertical; }
            .student-store-input:focus, .student-store-textarea:focus {
                border-color:#0095f6; box-shadow:0 0 0 3px rgba(0,149,246,.08);
            }
            .student-store-form-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
            .student-store-check {
                display:flex; align-items:center; gap:8px; min-height:42px;
                padding:9px 11px; border:1px solid #e2e5e9; border-radius:12px;
                background:#fafbfc; font-weight:800;
            }
            .student-store-image-preview {
                width:100%; max-height:230px; object-fit:contain; display:none;
                border-radius:14px; background:#f2f4f7;
            }
            .student-store-save {
                min-height:48px; border:0; border-radius:13px; background:#1473e6;
                color:#fff; font-size:15px; font-weight:900; cursor:pointer;
            }
            .student-store-save:disabled { opacity:.6; cursor:not-allowed; }
            .student-store-form-message { min-height:22px; text-align:center; color:#687384; font-size:12px; }
            .student-store-form-message.error { color:#b42318; }
            .student-store-confirm-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; }
            .student-store-confirm-button { min-height:44px; border:0; border-radius:12px; font-weight:900; cursor:pointer; }
            .student-store-confirm-button.cancel { background:#eef0f3; color:#374151; }
            .student-store-confirm-button.danger { background:#c62828; color:#fff; }
            .student-store-task-admin { display:flex; gap:8px; margin-top:10px; }
            .student-store-task-admin button { flex:1; min-height:38px; border:0; border-radius:10px; font-weight:900; cursor:pointer; }
            .student-store-task-admin .edit { background:#edf5ff; color:#1767c2; }
            .student-store-task-admin .delete { background:#fff0f0; color:#bb2525; }
            .student-store-payment-card { border:1px solid #d9e7f6; border-radius:18px; padding:16px; background:linear-gradient(180deg,#f7fbff,#fff); }
            .student-store-payment-card h3 { margin:0 0 12px; font-size:18px; color:#17324d; }
            .student-store-payment-row { display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px dashed #d9e2ec; font-size:13px; }
            .student-store-payment-row:last-child { border-bottom:0; }
            .student-store-payment-row strong { direction:ltr; text-align:left; word-break:break-all; }
            .student-store-master-box { margin-top:12px; padding:14px; border-radius:15px; background:#eef7ff; border:1px solid #cfe6fb; }
            .student-store-master-number { direction:ltr; font-size:22px; font-weight:900; letter-spacing:1px; text-align:center; margin:8px 0; }
            .student-store-action-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:14px; }
            .student-store-action { min-height:45px; border:0; border-radius:12px; font-weight:900; cursor:pointer; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:7px; }
            .student-store-action.primary { background:#1473e6; color:#fff; }
            .student-store-action.whatsapp { background:#20b15a; color:#fff; }
            .student-store-action.light { background:#edf1f5; color:#263442; }
            .student-store-paid-check { display:flex; align-items:flex-start; gap:9px; margin-top:14px; padding:12px; border-radius:12px; background:#fff8e8; color:#71540d; line-height:1.6; font-size:13px; }
            .student-store-toast {
                position:fixed; left:50%; bottom:82px; z-index:100000000;
                transform:translateX(-50%); max-width:88vw; padding:11px 16px;
                border-radius:13px; background:#20242a; color:#fff; text-align:center;
                font-size:13px; box-shadow:0 10px 28px rgba(0,0,0,.25);
            }
            @media (max-width:560px) {
                .student-store-header { grid-template-columns:42px minmax(60px,1fr) auto auto; padding-inline:8px; gap:5px; }
                .student-store-title { font-size:17px; }
                .student-store-admin-add { padding-inline:9px; font-size:12px; }
                .student-store-balance { min-width:58px; padding-inline:7px; font-size:12px; }
                .student-store-grid { grid-template-columns:1fr; }
                .student-store-task { grid-template-columns:48px 1fr; }
                .student-store-claim { grid-column:1/-1; width:100%; }
                .student-store-form-row { grid-template-columns:1fr; }
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
                <button id="student-store-admin-add" class="student-store-admin-add" type="button">
                    <i class="fa-solid fa-plus"></i><span id="student-store-admin-add-label">منتج</span>
                </button>
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

        document.getElementById("student-store-admin-add")?.addEventListener("click", function (event) {
            event.preventDefault();
            if (!state.isAdmin) return;
            if (state.activeTab === "tasks") openTaskForm(null);
            else openProductForm(null);
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
        document.getElementById("student-store-modal")?.addEventListener("change", handleModalChange);
    }

    function toast(message) {
        const old = document.querySelector(".student-store-toast");
        old?.remove();
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

    function updateAdminUI() {
        const button = document.getElementById("student-store-admin-add");
        button?.classList.toggle("show", state.isAdmin);
        const label = document.getElementById("student-store-admin-add-label");
        if (label) label.textContent = state.activeTab === "tasks" ? "مهمة" : "منتج";
    }

    function updateTabs() {
        overlay?.querySelectorAll("[data-store-tab]").forEach(function (button) {
            button.classList.toggle("active", button.dataset.storeTab === state.activeTab);
        });
        updateAdminUI();
    }

    function renderLoading() {
        const body = document.getElementById("student-store-body");
        if (!body) return;
        body.innerHTML = `<div class="student-store-loading"><i class="fa-solid fa-spinner fa-spin"></i>جارٍ تحميل المتجر...</div>`;
    }

    function renderProducts() {
        const body = document.getElementById("student-store-body");
        if (!body) return;

        if (!state.products.length) {
            body.innerHTML = `
                <div class="student-store-empty">
                    <i class="fa-solid fa-store"></i>
                    <strong>لا توجد منتجات حاليًا</strong>
                    <div>${state.isAdmin ? "أضف أول منتج من زر منتج في الأعلى." : "ستظهر المنتجات هنا عند إضافتها لاحقًا."}</div>
                    ${state.isAdmin ? `<button class="student-store-empty-add" type="button" data-store-add-product>إضافة منتج</button>` : ""}
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div class="student-store-grid">
                ${state.products.map(function (product) {
                    const soldOut = product.stock !== null && Number(product.stock) <= 0;
                    const inactive = product.is_active === false;
                    return `
                        <article class="student-store-card ${inactive ? "inactive" : ""}">
                            ${product.image_url
                                ? `<img class="student-store-image" src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy">`
                                : `<div class="student-store-image-placeholder"><i class="fa-solid fa-box-open"></i></div>`}
                            <div class="student-store-card-body">
                                <div class="student-store-card-top">
                                    <div class="student-store-product-name">${esc(product.name)}</div>
                                    ${state.isAdmin && inactive ? `<span class="student-store-status">مخفي</span>` : ""}
                                </div>
                                <div class="student-store-description">${esc(product.description || "لا يوجد وصف للمنتج.")}</div>
                                <div class="student-store-prices">
                                    ${product.allow_money ? `<span class="student-store-price"><i class="fa-solid fa-money-bill-wave"></i>${money(product.price_money, product.currency)}</span>` : ""}
                                    ${product.allow_diamonds ? `<span class="student-store-price diamonds"><i class="fa-solid fa-gem"></i>${Number(product.price_diamonds || 0)} ألماسة</span>` : ""}
                                </div>
                                <div class="student-store-stock">${soldOut ? "نفد المخزون" : product.stock === null ? "متوفر" : `المتوفر: ${Number(product.stock)}`}</div>
                                ${inactive ? "" : `<button class="student-store-buy" type="button" data-store-product="${esc(product.id)}" ${soldOut ? "disabled" : ""}>${soldOut ? "غير متوفر" : "شراء"}</button>`}
                                ${state.isAdmin ? `
                                    <div class="student-store-admin-tools">
                                        <button class="student-store-admin-tool edit" type="button" data-store-edit-product="${esc(product.id)}">تعديل</button>
                                        <button class="student-store-admin-tool delete" type="button" data-store-delete-product="${esc(product.id)}">حذف</button>
                                    </div>
                                ` : ""}
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
            body.innerHTML = `<div class="student-store-empty"><i class="fa-solid fa-list-check"></i><strong>لا توجد مهام متاحة حاليًا</strong>${state.isAdmin ? `<button class="student-store-empty-add" type="button" data-store-add-task>إضافة مهمة</button>` : ""}</div>`;
            return;
        }

        body.innerHTML = `
            <div class="student-store-task-list">
                ${state.tasks.map(function (task) {
                    const claimable = task.verification_type === "daily_visit";
                    return `
                        <article class="student-store-task">
                            <div class="student-store-task-icon"><i class="fa-solid fa-gem"></i></div>
                            <div>
                                <div class="student-store-task-title">${esc(task.title)}</div>
                                <div class="student-store-task-description">${esc(task.description || "")}</div>
                                <div class="student-store-task-reward">+${Number(task.reward_diamonds || 0)} ألماسة</div>
                            </div>
                            ${claimable ? `<button class="student-store-claim" type="button" data-store-task="${esc(task.id)}">استلام</button>` : `<span class="student-store-status">تلقائي</span>`}
                            ${state.isAdmin ? `<div class="student-store-task-admin" style="grid-column:1/-1"><button class="edit" type="button" data-store-edit-task="${esc(task.id)}">تعديل</button><button class="delete" type="button" data-store-delete-task="${esc(task.id)}">حذف</button></div>` : ""}
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function render() {
        updateBalance();
        updateAdminUI();
        if (state.loading) return renderLoading();
        if (state.activeTab === "tasks") renderTasks();
        else renderProducts();
    }

    async function currentUser(client) {
        if (!client) return null;
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data?.session?.user || null;
    }

    async function checkAdmin(client, user) {
        if (!client || !user) return false;
        try {
            const { data, error } = await client.rpc("current_user_is_admin");
            if (error) throw error;
            return data === true;
        } catch (error) {
            console.warn("Store admin check:", error);
            return false;
        }
    }

    async function loadProducts(client) {
        const fields = "id,name,description,image_url,image_path,price_money,currency,price_diamonds,allow_money,allow_diamonds,stock,sort_order,is_active,created_at";
        let query = client.from("store_products").select(fields);
        if (!state.isAdmin) query = query.eq("is_active", true);
        let result = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

        if (result.error && isMissingColumn(result.error, "image_path")) {
            let fallback = client.from("store_products").select(fields.replace(",image_path", ""));
            if (!state.isAdmin) fallback = fallback.eq("is_active", true);
            result = await fallback.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
            if (result.data) result.data = result.data.map(function (item) { return { ...item, image_path: null }; });
        }

        if (result.error) {
            if (isMissingTable(result.error)) return [];
            throw result.error;
        }
        return result.data || [];
    }

    async function loadTasks(client) {
        let query = client
            .from("store_tasks")
            .select("id,title,description,reward_diamonds,repeat_kind,verification_type,starts_at,ends_at,sort_order,is_active");
        if (!state.isAdmin) query = query.eq("is_active", true);
        const { data, error } = await query.order("sort_order", { ascending: true });

        if (error) {
            if (isMissingTable(error)) return [];
            throw error;
        }

        if (state.isAdmin) return data || [];
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
            state.isAdmin = false;
            state.user = null;
            render();
            return;
        }

        state.loading = true;
        render();

        try {
            state.user = await currentUser(client);
            state.isAdmin = await checkAdmin(client, state.user);
            const [products, tasks, balance] = await Promise.all([
                loadProducts(client),
                loadTasks(client),
                loadBalance(client, state.user)
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

        state.historyActive = true;
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

    function close() {
        state.historyActive = false;
        hide();
    }

    function selectedProduct(id) {
        return state.products.find(function (product) { return product.id === id; }) || null;
    }

    function modalElement() {
        return document.getElementById("student-store-modal");
    }

    function showModal(html) {
        const modal = modalElement();
        if (!modal) return;
        modal.innerHTML = html;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        const modal = modalElement();
        if (!modal) return;
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = "";
        state.saving = false;
    }

    function openPaymentModal(product) {
        if (!product) return;
        showModal(`
            <div class="student-store-modal-card" role="dialog" aria-modal="true">
                <div class="student-store-modal-head">
                    <div class="student-store-modal-title">${esc(product.name)}</div>
                    <button class="student-store-modal-close" type="button" data-store-modal-close aria-label="إغلاق">×</button>
                </div>
                <div class="student-store-payment-options">
                    ${product.allow_money ? `<button class="student-store-payment" type="button" data-store-pay="money" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-money-bill-wave"></i> الدفع المالي</span><strong>${money(product.price_money, product.currency)}</strong></button>` : ""}
                    ${product.allow_diamonds ? `<button class="student-store-payment" type="button" data-store-pay="diamonds" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-gem student-store-diamond"></i> الدفع بالألماس</span><strong>${Number(product.price_diamonds || 0)} ألماسة</strong></button>` : ""}
                </div>
                ${product.allow_money ? `<div class="student-store-note">حوّل المبلغ إلى رقم الماستر، ثم أنشئ الطلب وأرسل صورة بطاقة الدفع عبر تواصل معنا.</div>` : ""}
            </div>
        `);
    }

    function openProductForm(product) {
        if (!state.isAdmin) return;
        const editing = Boolean(product?.id);
        const allowMoney = product ? Boolean(product.allow_money) : true;
        const allowDiamonds = product ? Boolean(product.allow_diamonds) : false;

        showModal(`
            <div class="student-store-modal-card" role="dialog" aria-modal="true">
                <div class="student-store-modal-head">
                    <div class="student-store-modal-title">${editing ? "تعديل المنتج" : "إضافة منتج"}</div>
                    <button class="student-store-modal-close" type="button" data-store-modal-close aria-label="إغلاق">×</button>
                </div>
                <form id="student-store-product-form" class="student-store-form" novalidate>
                    <input type="hidden" id="student-store-product-id" value="${esc(product?.id || "")}">
                    <input type="hidden" id="student-store-product-old-image-path" value="${esc(product?.image_path || "")}">
                    <img id="student-store-product-image-preview" class="student-store-image-preview" ${product?.image_url ? `src="${esc(product.image_url)}" style="display:block"` : ""} alt="معاينة المنتج">
                    <div class="student-store-field">
                        <label for="student-store-product-image">صورة المنتج (اختيارية، حتى 5MB)</label>
                        <input id="student-store-product-image" class="student-store-input" type="file" accept="image/jpeg,image/png,image/webp">
                    </div>
                    <div class="student-store-field">
                        <label for="student-store-product-name">اسم المنتج</label>
                        <input id="student-store-product-name" class="student-store-input" type="text" maxlength="120" value="${esc(product?.name || "")}" placeholder="مثال: كتاب قواعد اللغة">
                    </div>
                    <div class="student-store-field">
                        <label for="student-store-product-description">الوصف</label>
                        <textarea id="student-store-product-description" class="student-store-textarea" maxlength="2000" placeholder="اكتب وصفًا واضحًا للمنتج">${esc(product?.description || "")}</textarea>
                    </div>
                    <div class="student-store-form-row">
                        <label class="student-store-check"><input id="student-store-allow-money" type="checkbox" ${allowMoney ? "checked" : ""}> الدفع بالمال</label>
                        <label class="student-store-check"><input id="student-store-allow-diamonds" type="checkbox" ${allowDiamonds ? "checked" : ""}> الدفع بالألماس</label>
                    </div>
                    <div class="student-store-form-row">
                        <div class="student-store-field">
                            <label for="student-store-price-money">السعر بالدينار</label>
                            <input id="student-store-price-money" class="student-store-input" type="number" min="0" step="1" value="${product?.price_money ?? ""}" ${allowMoney ? "" : "disabled"}>
                        </div>
                        <div class="student-store-field">
                            <label for="student-store-price-diamonds">السعر بالألماس</label>
                            <input id="student-store-price-diamonds" class="student-store-input" type="number" min="0" step="1" value="${product?.price_diamonds ?? ""}" ${allowDiamonds ? "" : "disabled"}>
                        </div>
                    </div>
                    <div class="student-store-form-row">
                        <div class="student-store-field">
                            <label for="student-store-product-stock">المخزون (اتركه فارغًا لغير محدود)</label>
                            <input id="student-store-product-stock" class="student-store-input" type="number" min="0" step="1" value="${product?.stock ?? ""}">
                        </div>
                        <div class="student-store-field">
                            <label for="student-store-product-sort">ترتيب الظهور</label>
                            <input id="student-store-product-sort" class="student-store-input" type="number" step="1" value="${product?.sort_order ?? 0}">
                        </div>
                    </div>
                    <label class="student-store-check"><input id="student-store-product-active" type="checkbox" ${product?.is_active === false ? "" : "checked"}> المنتج ظاهر للمستخدمين</label>
                    <button id="student-store-product-save" class="student-store-save" type="button">${editing ? "حفظ التعديلات" : "إضافة المنتج"}</button>
                    <div id="student-store-product-message" class="student-store-form-message" role="status"></div>
                </form>
            </div>
        `);
    }

    function selectedTask(id) {
        return state.tasks.find(function (task) { return task.id === id; }) || null;
    }

    function openTaskForm(task) {
        if (!state.isAdmin) return;
        const editing = Boolean(task?.id);
        showModal(`
            <div class="student-store-modal-card" role="dialog" aria-modal="true">
                <div class="student-store-modal-head"><div class="student-store-modal-title">${editing ? "تعديل المهمة" : "إضافة مهمة"}</div><button class="student-store-modal-close" type="button" data-store-modal-close>×</button></div>
                <form class="student-store-form" novalidate>
                    <input type="hidden" id="student-store-task-id" value="${esc(task?.id || "")}">
                    <div class="student-store-field"><label>اسم المهمة</label><input id="student-store-task-title" class="student-store-input" maxlength="120" value="${esc(task?.title || "")}"></div>
                    <div class="student-store-field"><label>الوصف</label><textarea id="student-store-task-description" class="student-store-textarea" maxlength="1000">${esc(task?.description || "")}</textarea></div>
                    <div class="student-store-form-row">
                        <div class="student-store-field"><label>مكافأة الألماس</label><input id="student-store-task-reward" class="student-store-input" type="number" min="1" step="1" value="${task?.reward_diamonds ?? 5}"></div>
                        <div class="student-store-field"><label>التكرار</label><select id="student-store-task-repeat" class="student-store-input"><option value="once" ${task?.repeat_kind === "once" ? "selected" : ""}>مرة واحدة</option><option value="daily" ${task?.repeat_kind === "daily" ? "selected" : ""}>يوميًا</option></select></div>
                    </div>
                    <div class="student-store-field"><label>نوع التحقق</label><select id="student-store-task-verification" class="student-store-input"><option value="daily_visit" ${task?.verification_type === "daily_visit" ? "selected" : ""}>زيارة المتجر</option><option value="manual" ${task?.verification_type === "manual" ? "selected" : ""}>تحقق يدوي</option></select></div>
                    <div class="student-store-form-row"><div class="student-store-field"><label>الترتيب</label><input id="student-store-task-sort" class="student-store-input" type="number" step="1" value="${task?.sort_order ?? 0}"></div><label class="student-store-check"><input id="student-store-task-active" type="checkbox" ${task?.is_active === false ? "" : "checked"}> المهمة مفعلة</label></div>
                    <button class="student-store-save" type="button" data-store-save-task>${editing ? "حفظ التعديلات" : "إضافة المهمة"}</button>
                    <div id="student-store-task-message" class="student-store-form-message"></div>
                </form>
            </div>`);
    }

    async function saveTask(button) {
        if (!state.isAdmin || state.saving) return;
        const client = db();
        if (!client || !state.user) return;
        const title = document.getElementById("student-store-task-title")?.value.trim() || "";
        const reward = Number(document.getElementById("student-store-task-reward")?.value || 0);
        const id = document.getElementById("student-store-task-id")?.value || "";
        const msg = document.getElementById("student-store-task-message");
        if (!title || !Number.isInteger(reward) || reward < 1) { if (msg) { msg.textContent = "اكتب اسمًا ومكافأة صحيحة."; msg.classList.add("error"); } return; }
        const payload = {
            title,
            description: document.getElementById("student-store-task-description")?.value.trim() || "",
            reward_diamonds: reward,
            repeat_kind: document.getElementById("student-store-task-repeat")?.value || "once",
            verification_type: document.getElementById("student-store-task-verification")?.value || "manual",
            sort_order: Number(document.getElementById("student-store-task-sort")?.value || 0),
            is_active: Boolean(document.getElementById("student-store-task-active")?.checked)
        };
        state.saving = true; button.disabled = true; button.textContent = "جارٍ الحفظ...";
        try {
            const result = id ? await client.from("store_tasks").update(payload).eq("id", id) : await client.from("store_tasks").insert({ ...payload, created_by: state.user.id });
            if (result.error) throw result.error;
            toast(id ? "تم تعديل المهمة." : "تمت إضافة المهمة."); closeModal(); await refresh();
        } catch (error) { console.error(error); if (msg) { msg.textContent = error?.message || "تعذر حفظ المهمة."; msg.classList.add("error"); } }
        finally { state.saving = false; if (button.isConnected) { button.disabled = false; button.textContent = id ? "حفظ التعديلات" : "إضافة المهمة"; } }
    }

    function openDeleteTask(task) {
        if (!state.isAdmin || !task) return;
        showModal(`<div class="student-store-modal-card"><div class="student-store-modal-head"><div class="student-store-modal-title">حذف المهمة</div><button class="student-store-modal-close" data-store-modal-close>×</button></div><div class="student-store-note">سيتم حذف المهمة «${esc(task.title)}» نهائيًا.</div><div class="student-store-confirm-actions"><button class="student-store-confirm-button cancel" data-store-modal-close>إلغاء</button><button class="student-store-confirm-button danger" data-store-confirm-delete-task="${esc(task.id)}">حذف</button></div></div>`);
    }

    async function deleteTask(id, button) {
        if (!state.isAdmin || state.saving) return;
        state.saving = true; button.disabled = true;
        try { const { error } = await db().from("store_tasks").delete().eq("id", id); if (error) throw error; toast("تم حذف المهمة."); closeModal(); await refresh(); }
        catch (error) { toast(error?.message || "تعذر حذف المهمة."); button.disabled = false; }
        finally { state.saving = false; }
    }

    function openMoneyInstructions(product) {
        showModal(`<div class="student-store-modal-card"><div class="student-store-modal-head"><div class="student-store-modal-title">الدفع المالي</div><button class="student-store-modal-close" data-store-modal-close>×</button></div>
            <div class="student-store-payment-card"><h3>بيانات التحويل</h3><div class="student-store-payment-row"><span>المنتج</span><strong>${esc(product.name)}</strong></div><div class="student-store-payment-row"><span>المبلغ</span><strong>${money(product.price_money, product.currency)}</strong></div>
            <div class="student-store-master-box"><div style="text-align:center;font-weight:900">رقم الماستر</div><div class="student-store-master-number">${STORE_MASTER_NUMBER}</div><div style="text-align:center">${STORE_MASTER_NAME}</div></div>
            <label class="student-store-paid-check"><input id="student-store-paid-confirm" type="checkbox"><span>أؤكد أنني حوّلت المبلغ، وسأرسل صورة بطاقة الطلب عبر تواصل معنا.</span></label>
            <div class="student-store-action-grid"><button class="student-store-action light" type="button" data-store-copy-master><i class="fa-regular fa-copy"></i>نسخ الرقم</button><button class="student-store-action primary" type="button" data-store-create-money-order="${esc(product.id)}">تم الدفع وإنشاء الطلب</button></div></div></div>`);
    }

    function showPaymentReceipt(product, result) {
        const orderId = result?.order_id || result?.id || result?.orderId || `ST-${Date.now().toString().slice(-8)}`;
        const text = `مرحبًا، أرسل إثبات دفع طلب متجر Student%0Aرقم الطلب: ${encodeURIComponent(orderId)}%0Aالمنتج: ${encodeURIComponent(product.name)}%0Aالمبلغ: ${encodeURIComponent(money(product.price_money, product.currency))}%0Aرقم الماستر: ${STORE_MASTER_NUMBER}`;
        state.currentOrder = { orderId, productId: product.id };
        showModal(`<div class="student-store-modal-card"><div class="student-store-modal-head"><div class="student-store-modal-title">بطاقة الطلب</div><button class="student-store-modal-close" data-store-modal-close>×</button></div><div class="student-store-payment-card" id="student-store-receipt"><h3>بانتظار إثبات الدفع</h3><div class="student-store-payment-row"><span>رقم الطلب</span><strong>${esc(orderId)}</strong></div><div class="student-store-payment-row"><span>المنتج</span><strong>${esc(product.name)}</strong></div><div class="student-store-payment-row"><span>المبلغ</span><strong>${money(product.price_money, product.currency)}</strong></div><div class="student-store-payment-row"><span>التحويل إلى</span><strong>${STORE_MASTER_NUMBER}</strong></div><div class="student-store-payment-row"><span>اسم المستلم</span><strong>${STORE_MASTER_NAME}</strong></div><div class="student-store-note">التقط صورة لهذه البطاقة، ثم اضغط تواصل معنا وأرسل الصورة لإكمال مراجعة طلبك.</div><div class="student-store-action-grid"><button class="student-store-action light" type="button" data-store-copy-order="${esc(orderId)}">نسخ رقم الطلب</button><a class="student-store-action whatsapp" href="https://wa.me/${STORE_WHATSAPP}?text=${text}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>تواصل معنا</a></div></div></div>`);
    }

    function setProductMessage(message, isError = false) {
        const element = document.getElementById("student-store-product-message");
        if (!element) return;
        element.textContent = message || "";
        element.classList.toggle("error", Boolean(isError));
    }

    function productFormValue(id) {
        return document.getElementById(id);
    }

    function readProductForm() {
        const name = productFormValue("student-store-product-name")?.value?.trim() || "";
        const description = productFormValue("student-store-product-description")?.value?.trim() || "";
        const allowMoney = Boolean(productFormValue("student-store-allow-money")?.checked);
        const allowDiamonds = Boolean(productFormValue("student-store-allow-diamonds")?.checked);
        const moneyRaw = productFormValue("student-store-price-money")?.value ?? "";
        const diamondRaw = productFormValue("student-store-price-diamonds")?.value ?? "";
        const stockRaw = productFormValue("student-store-product-stock")?.value ?? "";
        const sortRaw = productFormValue("student-store-product-sort")?.value ?? "0";

        if (!name) throw new Error("اكتب اسم المنتج.");
        if (!allowMoney && !allowDiamonds) throw new Error("اختر طريقة دفع واحدة على الأقل.");

        const priceMoney = allowMoney ? Number(moneyRaw) : null;
        const priceDiamonds = allowDiamonds ? Number(diamondRaw) : null;
        if (allowMoney && (moneyRaw === "" || !Number.isFinite(priceMoney) || priceMoney < 0)) throw new Error("اكتب سعرًا ماليًا صحيحًا.");
        if (allowDiamonds && (diamondRaw === "" || !Number.isInteger(priceDiamonds) || priceDiamonds < 0)) throw new Error("اكتب سعر ألماس صحيحًا.");

        const stock = stockRaw === "" ? null : Number(stockRaw);
        if (stock !== null && (!Number.isInteger(stock) || stock < 0)) throw new Error("قيمة المخزون غير صحيحة.");

        const sortOrder = Number(sortRaw || 0);
        if (!Number.isInteger(sortOrder)) throw new Error("ترتيب الظهور يجب أن يكون رقمًا صحيحًا.");

        return {
            name,
            description,
            price_money: priceMoney,
            currency: "IQD",
            price_diamonds: priceDiamonds,
            allow_money: allowMoney,
            allow_diamonds: allowDiamonds,
            stock,
            sort_order: sortOrder,
            is_active: Boolean(productFormValue("student-store-product-active")?.checked)
        };
    }

    async function uploadProductImage(client, userId, file) {
        if (!file) return null;
        if (!String(file.type || "").startsWith("image/")) throw new Error("صورة المنتج غير صالحة.");
        if (file.size > PRODUCT_IMAGE_MAX) throw new Error("صورة المنتج أكبر من 5MB.");

        const ext = String(file.name || "").toLowerCase().match(/\.([a-z0-9]{2,6})$/)?.[1] || "jpg";
        const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const path = `${userId}/products/${Date.now()}-${id}.${ext}`;

        const { error } = await client.storage.from("store-media").upload(path, file, {
            cacheControl: "31536000",
            upsert: false,
            contentType: file.type
        });
        if (error) throw error;

        const { data } = client.storage.from("store-media").getPublicUrl(path);
        if (!data?.publicUrl) {
            await client.storage.from("store-media").remove([path]).catch(function () {});
            throw new Error("تعذر إنشاء رابط صورة المنتج.");
        }
        return { path, url: data.publicUrl };
    }

    async function saveProduct(button) {
        if (!state.isAdmin || state.saving || !button) return;
        const client = db();
        if (!client || !state.user) return setProductMessage("يجب تسجيل الدخول بحساب الأدمن.", true);

        let uploaded = null;
        state.saving = true;
        button.disabled = true;
        const oldText = button.textContent;

        try {
            const payload = readProductForm();
            const productId = productFormValue("student-store-product-id")?.value || "";
            const oldImagePath = productFormValue("student-store-product-old-image-path")?.value || "";
            const file = productFormValue("student-store-product-image")?.files?.[0] || null;

            if (file) {
                button.textContent = "جارٍ رفع الصورة...";
                setProductMessage("جارٍ رفع صورة المنتج.");
                uploaded = await uploadProductImage(client, state.user.id, file);
                payload.image_url = uploaded.url;
                payload.image_path = uploaded.path;
            }

            button.textContent = "جارٍ الحفظ...";
            if (productId) {
                const { error } = await client.from("store_products").update(payload).eq("id", productId);
                if (error) throw error;
            } else {
                payload.created_by = state.user.id;
                const { error } = await client.from("store_products").insert(payload);
                if (error) throw error;
            }

            if (uploaded && oldImagePath && oldImagePath !== uploaded.path) {
                client.storage.from("store-media").remove([oldImagePath]).catch(function () {});
            }

            toast(productId ? "تم تعديل المنتج." : "تمت إضافة المنتج.");
            closeModal();
            await refresh();
        } catch (error) {
            console.error("Store product save:", error);
            if (uploaded?.path) {
                try { await client.storage.from("store-media").remove([uploaded.path]); } catch (_) {}
            }
            const message = String(error?.message || "");
            if (message.includes("row-level security") || message.includes("permission denied")) {
                setProductMessage("صلاحية إدارة المتجر غير مفعلة. نفّذ ملف SQL الجديد.", true);
            } else if (message.includes("Bucket not found")) {
                setProductMessage("مجلد صور المتجر غير موجود. نفّذ ملف SQL الجديد.", true);
            } else {
                setProductMessage(message || "تعذر حفظ المنتج.", true);
            }
        } finally {
            state.saving = false;
            const current = document.getElementById("student-store-product-save");
            if (current) {
                current.disabled = false;
                current.textContent = oldText;
            }
        }
    }

    function openDeleteProduct(product) {
        if (!state.isAdmin || !product) return;
        showModal(`
            <div class="student-store-modal-card" role="dialog" aria-modal="true">
                <div class="student-store-modal-head">
                    <div class="student-store-modal-title">حذف المنتج</div>
                    <button class="student-store-modal-close" type="button" data-store-modal-close aria-label="إغلاق">×</button>
                </div>
                <div class="student-store-note">سيُحذف المنتج «${esc(product.name)}» نهائيًا من المتجر. الطلبات السابقة ستبقى محفوظة.</div>
                <div class="student-store-confirm-actions">
                    <button class="student-store-confirm-button cancel" type="button" data-store-modal-close>إلغاء</button>
                    <button class="student-store-confirm-button danger" type="button" data-store-confirm-delete="${esc(product.id)}">حذف نهائي</button>
                </div>
            </div>
        `);
    }

    async function deleteProduct(productId, button) {
        if (!state.isAdmin || state.saving || !productId || !button) return;
        const client = db();
        const product = selectedProduct(productId);
        if (!client || !product) return;

        state.saving = true;
        button.disabled = true;
        button.textContent = "جارٍ الحذف...";

        try {
            const { error } = await client.from("store_products").delete().eq("id", productId);
            if (error) throw error;
            if (product.image_path) client.storage.from("store-media").remove([product.image_path]).catch(function () {});
            toast("تم حذف المنتج.");
            closeModal();
            await refresh();
        } catch (error) {
            console.error("Store product delete:", error);
            toast(error?.message || "تعذر حذف المنتج.");
            button.disabled = false;
            button.textContent = "حذف نهائي";
        } finally {
            state.saving = false;
        }
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
        const product = selectedProduct(productId);
        if (!product) return toast("المنتج غير موجود.");
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
            if (paymentMethod === "money") showPaymentReceipt(product, result || {});
            else { closeModal(); toast("تم شراء المنتج بالألماس."); }
            await refresh();
        } catch (error) {
            console.error("Create store order:", error);
            toast(error?.message || "تعذر إنشاء الطلب.");
            button.disabled = false;
            button.innerHTML = oldText;
        }
    }

    function handleBodyClick(event) {
        const addTask = event.target.closest("[data-store-add-task]");
        if (addTask) { event.preventDefault(); openTaskForm(null); return; }
        const editTask = event.target.closest("[data-store-edit-task]");
        if (editTask) { event.preventDefault(); openTaskForm(selectedTask(editTask.dataset.storeEditTask)); return; }
        const deleteTaskButton = event.target.closest("[data-store-delete-task]");
        if (deleteTaskButton) { event.preventDefault(); openDeleteTask(selectedTask(deleteTaskButton.dataset.storeDeleteTask)); return; }

        const addButton = event.target.closest("[data-store-add-product]");
        if (addButton) {
            event.preventDefault();
            openProductForm(null);
            return;
        }

        const editButton = event.target.closest("[data-store-edit-product]");
        if (editButton) {
            event.preventDefault();
            openProductForm(selectedProduct(editButton.dataset.storeEditProduct));
            return;
        }

        const deleteButton = event.target.closest("[data-store-delete-product]");
        if (deleteButton) {
            event.preventDefault();
            openDeleteProduct(selectedProduct(deleteButton.dataset.storeDeleteProduct));
            return;
        }

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

        const saveButton = event.target.closest("#student-store-product-save");
        if (saveButton) {
            event.preventDefault();
            saveProduct(saveButton);
            return;
        }

        const deleteButton = event.target.closest("[data-store-confirm-delete]");
        if (deleteButton) {
            event.preventDefault();
            deleteProduct(deleteButton.dataset.storeConfirmDelete, deleteButton);
            return;
        }

        const saveTaskButton = event.target.closest("[data-store-save-task]");
        if (saveTaskButton) { event.preventDefault(); saveTask(saveTaskButton); return; }
        const deleteTaskButton = event.target.closest("[data-store-confirm-delete-task]");
        if (deleteTaskButton) { event.preventDefault(); deleteTask(deleteTaskButton.dataset.storeConfirmDeleteTask, deleteTaskButton); return; }
        const copyMaster = event.target.closest("[data-store-copy-master]");
        if (copyMaster) { event.preventDefault(); navigator.clipboard?.writeText(STORE_MASTER_NUMBER).then(() => toast("تم نسخ رقم الماستر.")).catch(() => toast(STORE_MASTER_NUMBER)); return; }
        const copyOrder = event.target.closest("[data-store-copy-order]");
        if (copyOrder) { event.preventDefault(); navigator.clipboard?.writeText(copyOrder.dataset.storeCopyOrder).then(() => toast("تم نسخ رقم الطلب.")).catch(() => toast(copyOrder.dataset.storeCopyOrder)); return; }
        const createMoney = event.target.closest("[data-store-create-money-order]");
        if (createMoney) { event.preventDefault(); if (!document.getElementById("student-store-paid-confirm")?.checked) return toast("أكد أنك حوّلت المبلغ أولًا."); createOrder(createMoney.dataset.storeCreateMoneyOrder, "money", createMoney); return; }
        const paymentButton = event.target.closest("[data-store-pay]");
        if (paymentButton) {
            event.preventDefault();
            const method = paymentButton.dataset.storePay;
            const product = selectedProduct(paymentButton.dataset.productId);
            if (method === "money") openMoneyInstructions(product);
            else createOrder(paymentButton.dataset.productId, method, paymentButton);
        }
    }

    function handleModalChange(event) {
        if (event.target.id === "student-store-product-image") {
            const file = event.target.files?.[0];
            const preview = document.getElementById("student-store-product-image-preview");
            if (!file || !preview) return;
            if (!String(file.type || "").startsWith("image/") || file.size > PRODUCT_IMAGE_MAX) {
                event.target.value = "";
                setProductMessage("اختر صورة JPG أو PNG أو WEBP بحجم أقل من 5MB.", true);
                return;
            }
            preview.src = URL.createObjectURL(file);
            preview.style.display = "block";
            setProductMessage("");
            return;
        }

        if (event.target.id === "student-store-allow-money") {
            const input = document.getElementById("student-store-price-money");
            if (input) input.disabled = !event.target.checked;
            return;
        }

        if (event.target.id === "student-store-allow-diamonds") {
            const input = document.getElementById("student-store-price-diamonds");
            if (input) input.disabled = !event.target.checked;
        }
    }

    window.StudentStore = {
        version: "1.2.0",
        open,
        close,
        refresh
    };
    window.openStudentStore = open;
})();
