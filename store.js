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
        orders: [],
        balance: 0,
        currentOrder: null,
        activeTab: "home",
        isAdmin: false,
        user: null,
        historyActive: false,
        closingFromHistory: false,
        loading: false,
        saving: false,
        diamondPackages: [],
        agents: [],
        agencyStatus: null,
        diamondRequests: [],
        agencyApplications: [],
        agentStockRequests: [],
        agentSales: [],
        walletTransactions: [],
        walletSummary: null,
        savedAddresses: []
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
                display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px;
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
                grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; align-items:stretch;
            }
            .student-store-card {
                min-width:0; overflow:hidden; position:relative;
                border:1px solid #e2e5e9; border-radius:16px;
                background:#fff; box-shadow:0 3px 12px rgba(15,23,42,.06);
            }
            .student-store-card.inactive { opacity:.72; }
            .student-store-image {
                width:100%; aspect-ratio:1/1; object-fit:cover; display:block; background:#edf2f7;
            }
            .student-store-image-placeholder {
                width:100%; aspect-ratio:1/1; display:flex; align-items:center;
                justify-content:center; background:linear-gradient(135deg,#edf6ff,#f6f8fb);
                color:#0095f6; font-size:42px;
            }
            .student-store-card-body { padding:9px 10px 11px; }
            .student-store-card-top { display:flex; align-items:flex-start; gap:8px; }
            .student-store-product-name {
                flex:1; min-width:0; font-size:14px; font-weight:800; line-height:1.55; color:#222;
                display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
            }
            .student-store-status {
                padding:5px 8px; border-radius:999px; background:#fff2dc;
                color:#98610b; font-size:11px; font-weight:900; white-space:nowrap;
            }
            .student-store-description {
                margin-top:5px; min-height:20px; color:#777; font-size:11px;
                line-height:1.55; display:-webkit-box; -webkit-line-clamp:1;
                -webkit-box-orient:vertical; overflow:hidden;
            }
            .student-store-prices { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
            .student-store-price {
                display:inline-flex; align-items:center; gap:4px; padding:4px 6px;
                border-radius:9px; background:#f6f7f9; color:#263238;
                font-size:10px; font-weight:800;
            }
            .student-store-price.diamonds { background:#eef8ff; color:#096aa8; }
            .student-store-stock { margin-top:6px; font-size:10px; color:#8a8a8a; }
            .student-store-buy {
                position:absolute; left:10px; top:calc(50% - 9px);
                width:42px; height:42px; min-height:42px; margin:0; border:0;
                border-radius:12px; background:#f4e9fb; color:#7b2ca0;
                font-size:0; font-weight:900; cursor:pointer; z-index:2;
                box-shadow:0 2px 8px rgba(70,30,90,.08);
            }
            .student-store-buy::before { content:"+"; font-size:28px; font-weight:400; line-height:1; }
            .student-store-buy:disabled::before { content:"×"; font-size:24px; }
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
            .student-store-task-list { width:100%; max-width:920px; margin:0 auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; align-items:stretch; }
            .student-store-task {
                min-width:0; display:flex; flex-direction:column; align-items:stretch;
                gap:7px; padding:9px; border:1px solid #e2e5e9;
                border-radius:13px; background:#fff;
            }
            .student-store-task-icon {
                width:38px; height:38px; display:flex; align-items:center;
                justify-content:center; border-radius:16px; background:#eef8ff;
                color:#0095f6; font-size:17px;
            }
            .student-store-task-title { font-weight:900; color:#1f2937; }
            .student-store-task-description { margin-top:4px; color:#77808f; font-size:12px; line-height:1.6; }
            .student-store-task-reward { margin-top:6px; color:#0878bd; font-size:13px; font-weight:900; }
            .student-store-claim {
                width:100%; min-width:0; min-height:34px; border:0; border-radius:12px;
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
            .student-store-order-list{width:100%;max-width:920px;margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.student-store-order{padding:14px;border:1px solid #e1e6ec;border-radius:16px;background:#fff}.student-store-order-head{display:flex;justify-content:space-between;gap:10px}.student-store-order-status{padding:5px 9px;border-radius:999px;background:#fff3d8;color:#8b5d08;font-size:12px;font-weight:900}.student-store-order-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.student-store-order-actions button{min-height:38px;padding:0 12px;border:0;border-radius:10px;font-weight:900;cursor:pointer}.student-store-order-actions .ok{background:#e8f8ee;color:#15713a}.student-store-order-actions .done{background:#e8f2ff;color:#1a5faf}.student-store-order-actions .no{background:#fff0f0;color:#b3261e}.student-store-paid-check { display:flex; align-items:flex-start; gap:9px; margin-top:14px; padding:12px; border-radius:12px; background:#fff8e8; color:#71540d; line-height:1.6; font-size:13px; }
            .student-store-toast {
                position:fixed; left:50%; bottom:82px; z-index:100000000;
                transform:translateX(-50%); max-width:88vw; padding:11px 16px;
                border-radius:13px; background:#20242a; color:#fff; text-align:center;
                font-size:13px; box-shadow:0 10px 28px rgba(0,0,0,.25);
            }

            .student-store-guide{max-width:920px;margin:0 auto 14px;padding:16px;border-radius:18px;background:linear-gradient(135deg,#eaf5ff,#fff);border:1px solid #d9eaff}
            .student-store-guide h3{margin:0 0 8px;color:#0f5fae;font-size:18px}.student-store-guide p{margin:5px 0;line-height:1.8;color:#536273;font-size:13px}
            .student-store-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
            .student-store-info-box{padding:13px;border-radius:15px;background:#fff;border:1px solid #e1e8f0}.student-store-info-box strong{display:block;color:#102a43;margin-bottom:5px}
            .student-store-section{max-width:920px;margin:0 auto 18px}.student-store-section-title{font-size:17px;font-weight:900;margin:0 0 10px;color:#17202a}
            .student-store-package{padding:14px;border:1px solid #dfe5ec;border-radius:16px;background:#fff;display:grid;gap:8px}
            .student-store-package strong{font-size:16px}.student-store-package-row{display:flex;justify-content:space-between;gap:10px;color:#596273;font-size:13px}
            .student-store-primary{min-height:43px;border:0;border-radius:12px;background:#0095f6;color:#fff;font-weight:900;cursor:pointer}
            .student-store-secondary{min-height:43px;border:1px solid #ccd7e2;border-radius:12px;background:#fff;color:#24455f;font-weight:900;cursor:pointer}
            .student-store-agent-card{padding:14px;border:1px solid #dfe5ec;border-radius:16px;background:#fff}.student-store-agent-card h4{margin:0 0 7px}.student-store-agent-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
            .student-store-agent-actions a,.student-store-agent-actions button{padding:9px 12px;border:0;border-radius:11px;background:#edf6ff;color:#096aa8;text-decoration:none;font-weight:900}
            .student-store-form-lite{display:grid;gap:10px}.student-store-form-lite input,.student-store-form-lite textarea,.student-store-form-lite select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d7dee7;border-radius:12px;font:inherit}.student-store-form-lite textarea{min-height:80px;resize:vertical}
            .student-store-badge{display:inline-flex;padding:5px 9px;border-radius:999px;background:#eef5ff;color:#1757b8;font-size:12px;font-weight:900}
            @media (max-width:560px) {
                .student-store-header { grid-template-columns:42px minmax(60px,1fr) auto auto; padding-inline:8px; gap:5px; }
                .student-store-title { font-size:17px; }
                .student-store-admin-add { padding-inline:9px; font-size:12px; }
                .student-store-balance { min-width:58px; padding-inline:7px; font-size:12px; }
                .student-store-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .student-store-task { grid-template-columns:48px 1fr; }
                .student-store-claim { grid-column:1/-1; width:100%; }
                .student-store-form-row { grid-template-columns:1fr; }
            }

            .student-store-wallet-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}
            .student-store-wallet-box{background:#fff;border:1px solid #e2e5e9;border-radius:14px;padding:12px;text-align:center}
            .student-store-wallet-box strong{display:block;font-size:18px;color:#0878bd}
            .student-store-wallet-box span{font-size:11px;color:#6b7280}
            .student-store-ledger{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
            .student-store-ledger-row{background:#fff;border:1px solid #e5e7eb;border-radius:13px;padding:11px;display:grid;grid-template-columns:1fr auto;gap:8px}
            .student-store-ledger-row .plus{color:#14803c;font-weight:900}
            .student-store-ledger-row .minus{color:#c62828;font-weight:900}
            .student-store-cod-form{display:grid;gap:9px}
            .student-store-cod-form input,.student-store-cod-form textarea{width:100%;box-sizing:border-box;border:1px solid #dfe4ea;border-radius:11px;padding:11px;font:inherit}
            .student-store-tabs{display:none!important}
            .student-store-home{max-width:920px;margin:0 auto;display:grid;gap:16px}
            .student-store-hero{position:relative;overflow:hidden;padding:22px;border-radius:24px;background:linear-gradient(135deg,#0878d1,#00a6ff);color:#fff;box-shadow:0 14px 34px rgba(0,149,246,.22)}
            .student-store-hero:after{content:"";position:absolute;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.12);left:-45px;top:-75px}
            .student-store-hero h2{margin:0 0 7px;font-size:22px;font-weight:950}
            .student-store-hero p{margin:0;max-width:520px;line-height:1.8;font-size:13px;color:rgba(255,255,255,.9)}
            .student-store-home-balance{margin-top:15px;display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border-radius:14px;background:rgba(255,255,255,.16);font-weight:900}
            .student-store-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
            .student-store-section-card{position:relative;min-width:0;min-height:138px;padding:16px;border:1px solid #e7ebf0;border-radius:20px;background:#fff;text-align:right;cursor:pointer;box-shadow:0 7px 22px rgba(15,23,42,.055);transition:transform .16s ease,box-shadow .16s ease}
            .student-store-section-card:active{transform:scale(.98)}
            .student-store-section-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:linear-gradient(135deg,#edf7ff,#dff1ff);color:#0878d1;font-size:22px;margin-bottom:12px}
            .student-store-section-card strong{display:block;font-size:15px;color:#162033}
            .student-store-section-card span{display:block;margin-top:5px;color:#798394;font-size:11px;line-height:1.6}
            .student-store-section-count{position:absolute;top:13px;left:13px;min-width:24px;height:24px;padding:0 7px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#eff7ff;color:#0878d1;font-size:11px;font-weight:900}
            .student-store-page-head{max-width:920px;margin:0 auto 14px;display:flex;align-items:center;gap:10px}
            .student-store-page-head h2{flex:1;margin:0;font-size:20px;color:#172033}
            .student-store-page-head p{margin:4px 0 0;color:#7b8492;font-size:12px}
            .student-store-page-back{width:42px;height:42px;border:0;border-radius:14px;background:#edf5ff;color:#0878d1;font-size:22px;cursor:pointer}
            .student-store-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
            .student-store-card{border-radius:18px;box-shadow:0 8px 25px rgba(15,23,42,.07)}
            .student-store-image,.student-store-image-placeholder{aspect-ratio:4/3}
            .student-store-card-body{padding:12px}
            .student-store-product-name{font-size:14px}
            .student-store-description{font-size:11px;min-height:36px}
            .student-store-price{font-size:11px;padding:6px 8px}
            .student-store-buy{min-height:40px;font-size:13px}
            .student-store-task-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
            .student-store-task{padding:14px;border-radius:18px}
            .student-store-task-icon{width:44px;height:44px}
            .student-store-section{max-width:920px;margin:0 auto 18px}
            @media(max-width:700px){.student-store-sections{grid-template-columns:repeat(2,minmax(0,1fr))}.student-store-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
            @media(max-width:420px){
              .student-store-body{padding:8px}
              .student-store-grid,.student-store-task-list{gap:8px}
              .student-store-card-body{padding:9px}
              .student-store-product-name{font-size:13px}
              .student-store-section-card{min-height:128px;padding:13px}
              .student-store-tabs{overflow-x:auto;display:flex}
              .student-store-tab{min-width:76px;padding:0 8px}
              .student-store-wallet-summary{grid-template-columns:1fr}
            }


            .student-store-card-bookmark{
                position:absolute;top:10px;right:10px;z-index:2;width:34px;height:34px;
                display:flex;align-items:center;justify-content:center;border-radius:9px;
                background:rgba(255,255,255,.94);color:#666;font-size:20px;
                box-shadow:0 2px 8px rgba(0,0,0,.08);pointer-events:none;
            }
            .student-store-task{
                min-width:0;display:flex;flex-direction:column;align-items:stretch;gap:7px;
                padding:12px 10px;border:1px solid #e2e5e9;border-radius:16px;
                background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.05)
            }
            .student-store-task-icon{width:48px;height:48px;border-radius:14px;font-size:21px}
            .student-store-task-title{font-size:14px;line-height:1.45}
            .student-store-package,.student-store-agent-card,.student-store-order,.student-store-ledger-row,.student-store-wallet-box,.student-store-info-box{
                min-width:0;border-radius:16px;box-shadow:0 3px 12px rgba(15,23,42,.05)
            }
            @media(max-width:430px){
                .student-store-body{padding:10px}
                .student-store-grid,.student-store-task-list,.student-store-order-list,.student-store-ledger{gap:9px}
                .student-store-card-body{padding:8px}
                .student-store-product-name{font-size:13px}
                .student-store-buy{width:40px;height:40px;min-height:40px;left:8px}
                .student-store-package,.student-store-agent-card,.student-store-order{padding:10px}
                .student-store-package strong,.student-store-agent-card strong{font-size:13px}
                .student-store-package-row{font-size:11px}
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
                <div id="student-store-title" class="student-store-title">المتجر</div>
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
                <button class="student-store-tab" type="button" data-store-tab="diamonds">الألماس</button>
                <button class="student-store-tab" type="button" data-store-tab="wallet">المحفظة</button>
                <button class="student-store-tab" type="button" data-store-tab="tasks">المهام</button>
                <button class="student-store-tab" type="button" data-store-tab="orders">${state.isAdmin ? "الطلبات" : "طلباتي"}</button>
            </div>
            <main id="student-store-body" class="student-store-body"></main>
            <div id="student-store-modal" class="student-store-modal" aria-hidden="true"></div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("student-store-close")?.addEventListener("click", function (event) {
            event.preventDefault();
            if (state.activeTab !== "home") setSection("home", false);
            else close();
        });

        document.getElementById("student-store-admin-add")?.addEventListener("click", function (event) {
            event.preventDefault();
            if (!state.isAdmin) return;
            if (state.activeTab === "tasks") openTaskForm(null);
            else openProductForm(null);
        });

        overlay.querySelectorAll("[data-store-tab]").forEach(function (button) {
            button.addEventListener("click", function () {
                setSection(this.dataset.storeTab || "home");
            });
        });

        document.getElementById("student-store-body")?.addEventListener("click", handleBodyClick);
        document.getElementById("student-store-body")?.addEventListener("submit", handleBodySubmit);
        document.getElementById("student-store-modal")?.addEventListener("click", handleModalClick);
        document.getElementById("student-store-modal")?.addEventListener("change", handleModalChange);
        document.getElementById("student-store-modal")?.addEventListener("submit", function(event){ const form=event.target.closest("#student-store-cod-form"); if(form){ event.preventDefault(); const b=form.querySelector("[data-store-submit-cod]"); if(b) submitCodOrder(form,b); }});
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
        if (button) button.style.visibility = ["home","orders","diamonds","wallet","agency"].includes(state.activeTab) ? "hidden" : "visible";
        if (label) label.textContent = state.activeTab === "tasks" ? "مهمة" : "منتج";
    }

    function updateTabs() {
        overlay?.querySelectorAll("[data-store-tab]").forEach(function (button) {
            button.classList.toggle("active", button.dataset.storeTab === state.activeTab);
        });
        updateAdminUI();
    }

    const STORE_SECTION_META = {
        home: ["المتجر", ""],
        products: ["المنتجات", "تصفّح المنتجات الرقمية والحقيقية"],
        tasks: ["المهام والمكافآت", "أكمل المهام واجمع الألماس"],
        wallet: ["المحفظة", "رصيدك وسجل جميع الحركات"],
        diamonds: ["شراء الألماس", "اختر الباقة المناسبة واشحن محفظتك"],
        agency: ["الوكالة", "الوكلاء المعتمدون والتقديم على وكالة"],
        orders: [state.isAdmin ? "إدارة الطلبات" : "طلباتي", "تابع حالة الطلبات والمشتريات"]
    };

    function setSection(section, pushHistory = true) {
        state.activeTab = section || "home";
        updateTabs();
        updateStoreHeader();
        render();
        document.getElementById("student-store-body")?.scrollTo({ top: 0, behavior: "instant" });
        if (pushHistory && state.activeTab !== "home") {
            try { history.pushState({ studentStore: state.activeTab }, "", location.href); } catch (_) {}
        }
    }

    function updateStoreHeader() {
        const title = document.getElementById("student-store-title");
        const closeButton = document.getElementById("student-store-close");
        const meta = STORE_SECTION_META[state.activeTab] || STORE_SECTION_META.home;
        if (title) title.textContent = meta[0];
        if (closeButton) closeButton.setAttribute("aria-label", state.activeTab === "home" ? "إغلاق المتجر" : "الرجوع إلى أقسام المتجر");
    }

    function pageHead(icon, title, description) {
        return `<div class="student-store-page-head"><button class="student-store-page-back" type="button" data-store-home aria-label="رجوع">‹</button><div><h2><i class="${icon}"></i> ${title}</h2><p>${description}</p></div></div>`;
    }

    function renderHome() {
        const body = document.getElementById("student-store-body");
        if (!body) return;
        const pendingOrders = (state.orders || []).filter(order => !["completed","cancelled","refunded"].includes(order.status)).length;
        const sections = [
            ["products","fa-solid fa-bag-shopping","المنتجات","منتجات رقمية وحقيقية بطرق دفع متعددة",state.products.length],
            ["tasks","fa-solid fa-list-check","المهام","نفّذ المهام واحصل على مكافآت ألماس",state.tasks.length],
            ["wallet","fa-solid fa-wallet","المحفظة","الرصيد المتاح وسجل الإضافة والخصم",Number(state.balance||0).toLocaleString("ar-IQ")],
            ["diamonds","fa-solid fa-gem","شراء الألماس","باقات الشحن المباشر من التطبيق",state.diamondPackages.length],
            ["agency","fa-solid fa-user-shield","الوكالة","الوكلاء المعتمدون وطلبات الوكالة",state.agents.length],
            ["orders","fa-solid fa-box","الطلبات",state.isAdmin?"مراجعة وإدارة طلبات المستخدمين":"متابعة مشترياتك وحالة التوصيل",pendingOrders]
        ];
        body.innerHTML = `<div class="student-store-home">
            <section class="student-store-hero"><h2>مرحبًا بك في متجر Student</h2><p>كل ما تحتاجه من منتجات ومزايا رقمية، مع محفظة ألماس ونظام وكلاء وطلبات آمن.</p><div class="student-store-home-balance"><i class="fa-solid fa-gem"></i>${Number(state.balance||0).toLocaleString("ar-IQ")} ألماسة</div></section>
            <div class="student-store-sections">${sections.map(item=>`<button class="student-store-section-card" type="button" data-store-section="${item[0]}"><span class="student-store-section-count">${item[4]}</span><span class="student-store-section-icon"><i class="${item[1]}"></i></span><strong>${item[2]}</strong><span>${item[3]}</span></button>`).join("")}</div>
        </div>`;
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
            body.innerHTML = `${pageHead("fa-solid fa-bag-shopping", "المنتجات", "منتجات مختارة بعرض واضح وطرق دفع متعددة")}
                <div class="student-store-empty">
                    <i class="fa-solid fa-store"></i>
                    <strong>لا توجد منتجات حاليًا</strong>
                    <div>${state.isAdmin ? "أضف أول منتج من زر منتج في الأعلى." : "ستظهر المنتجات هنا عند إضافتها لاحقًا."}</div>
                    ${state.isAdmin ? `<button class="student-store-empty-add" type="button" data-store-add-product>إضافة منتج</button>` : ""}
                </div>
            `;
            return;
        }

        body.innerHTML = `${pageHead("fa-solid fa-bag-shopping", "المنتجات", "منتجات مختارة بعرض واضح وطرق دفع متعددة")}
            <div class="student-store-grid">
                ${state.products.map(function (product) {
                    const soldOut = product.stock !== null && Number(product.stock) <= 0;
                    const inactive = product.is_active === false;
                    return `
                        <article class="student-store-card ${inactive ? "inactive" : ""}">
                            <span class="student-store-card-bookmark" aria-hidden="true"><i class="fa-regular fa-bookmark"></i></span>
                            ${product.image_url
                                ? `<img class="student-store-image" src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy" decoding="async">`
                                : `<div class="student-store-image-placeholder"><i class="fa-solid fa-box-open"></i></div>`}
                            <div class="student-store-card-body">
                                <div class="student-store-card-top">
                                    <div class="student-store-product-name">${esc(product.name)}</div>
                                    ${state.isAdmin && inactive ? `<span class="student-store-status">مخفي</span>` : ""}
                                </div>
                                <div class="student-store-description">${esc(product.description || "لا يوجد وصف للمنتج.")}</div>
                                <div class="student-store-prices">
                                    ${product.allow_money ? `<span class="student-store-price"><i class="fa-solid fa-money-bill-wave"></i>${money(product.price_money, product.currency)}</span>` : ""}
                                    ${product.allow_diamonds ? `<span class="student-store-price diamonds"><i class="fa-solid fa-gem"></i>${Number(product.price_diamonds || 0)} ألماسة</span>` : ""}${product.allow_cod ? `<span class="student-store-price"><i class="fa-solid fa-truck"></i>عند الاستلام</span>` : ""}${product.product_type === "verification" ? `<span class="student-store-price diamonds"><i class="fa-solid fa-circle-check"></i>توثيق الحساب</span>` : ""}
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
            body.innerHTML = `${pageHead("fa-solid fa-list-check", "المهام والمكافآت", "أكمل المهام واجمع الألماس")} <div class="student-store-empty"><i class="fa-solid fa-list-check"></i><strong>لا توجد مهام متاحة حاليًا</strong>${state.isAdmin ? `<button class="student-store-empty-add" type="button" data-store-add-task>إضافة مهمة</button>` : ""}</div>`;
            return;
        }

        body.innerHTML = `${pageHead("fa-solid fa-list-check", "المهام والمكافآت", "مهام مرتبة في بطاقات واضحة")}
            <div class="student-store-task-list">
                ${state.tasks.map(function (task) {
                    const claimable = task.verification_type === "daily_visit" && !task.condition_type;
                    const conditionLabels = {
                        english_open_daily: "دخول Daily English",
                        english_open_challenge: "دخول الاختبارات",
                        english_vocabulary: "تعلم مفردات",
                        english_grammar: "إكمال قواعد",
                        english_daily_complete: "إكمال درس اليوم",
                        english_mcq_answered: "حل أسئلة MCQ",
                        english_mcq_correct: "إجابات MCQ صحيحة",
                        english_level_reached: "الوصول إلى Level"
                    };
                    const conditionText = task.condition_type
                        ? `${conditionLabels[task.condition_type] || "مهمة تلقائية"}${Number(task.target_count || 1) > 1 ? ` × ${Number(task.target_count)}` : ""}`
                        : "";
                    return `
                        <article class="student-store-task">
                            <div class="student-store-task-icon"><i class="fa-solid fa-gem"></i></div>
                            <div>
                                <div class="student-store-task-title">${esc(task.title)}</div>
                                <div class="student-store-task-description">${esc(task.description || "")}</div>
                                ${conditionText ? `<div class="student-store-task-description"><strong>${esc(conditionText)}</strong></div>` : ""}
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

    function renderOrders() {
        const body=document.getElementById("student-store-body"); if(!body)return;
        if(!state.orders.length){body.innerHTML=`<div class="student-store-empty"><i class="fa-solid fa-receipt"></i><strong>${state.isAdmin?"لا توجد طلبات حاليًا":"لم تنشئ أي طلب بعد"}</strong></div>`;return;}
        const labels={pending:"قيد المراجعة",confirmed:"مقبول",completed:"تم التسليم",cancelled:"مرفوض",refunded:"مسترجع"};
        body.innerHTML=`${pageHead("fa-solid fa-receipt", state.isAdmin ? "طلبات المتجر" : "طلباتي", "تابع الطلبات وحالتها بسهولة")}<div class="student-store-order-list">${state.orders.map(o=>`<article class="student-store-order"><div class="student-store-order-head"><strong>${esc(o.product_name)}</strong><span class="student-store-order-status">${labels[o.status]||esc(o.status)}</span></div><div class="student-store-description">رقم الطلب: ${esc(o.id)}</div><div class="student-store-prices"><span class="student-store-price">${o.payment_method==='diamonds'?`${Number(o.diamond_amount||0)} ألماسة`:money(o.money_amount,o.currency)}</span></div><div class="student-store-stock">${new Date(o.created_at).toLocaleString('ar-IQ')}</div>${state.isAdmin&&o.status==='pending'?`<div class="student-store-order-actions"><button class="ok" data-store-order-status="confirmed" data-order-id="${esc(o.id)}">قبول</button><button class="no" data-store-order-status="cancelled" data-order-id="${esc(o.id)}">رفض</button></div>`:''}${state.isAdmin&&o.status==='confirmed'?`<div class="student-store-order-actions"><button class="done" data-store-order-status="completed" data-order-id="${esc(o.id)}">تم التسليم</button></div>`:''}</article>`).join('')}</div>`;
    }

    function renderDiamonds() {
        const body = document.getElementById("student-store-body");
        if (!body) return;
        const packages = state.diamondPackages || [];
        body.innerHTML = `${pageHead("fa-solid fa-gem", "شراء الألماس", "اختر باقة الشحن المناسبة وسيُراجع طلبك بأمان")}
            <section class="student-store-section"><div class="student-store-guide"><h3>سعر الألماس</h3><p>السعر الرسمي المعتمد داخل التطبيق يظهر داخل كل باقة. بعد إرسال الطلب تتم مراجعته وإضافة الألماس إلى محفظتك.</p></div></section>
            <section class="student-store-section"><div class="student-store-grid">${packages.map(p=>`<article class="student-store-package"><strong>${esc(p.title)}</strong><div class="student-store-package-row"><span>${Number(p.diamonds).toLocaleString('ar-IQ')} ألماسة</span><b>${Number(p.user_price_iqd).toLocaleString('ar-IQ')} د.ع</b></div><button class="student-store-primary" data-store-buy-diamond="${esc(p.id)}">شراء الباقة</button></article>`).join('') || '<div class="student-store-empty">لا توجد باقات حاليًا.</div>'}</div></section>`;
    }

    function renderAgency() {
        const body = document.getElementById("student-store-body");
        if (!body) return;
        const status = state.agencyStatus || {};
        let content = '';
        if (state.isAdmin) content = renderDiamondAdminArea();
        else if (status.is_agent) content = renderAgentDashboard(status, state.diamondPackages || []);
        else content = renderUserAgencyArea(state.agents || [], status.application || null);
        body.innerHTML = `${pageHead("fa-solid fa-user-shield", "الوكالة", "الوكلاء المعتمدون، الأرباح، والتقديم على وكالة")}<section class="student-store-section"><div class="student-store-guide"><h3>كيف تعمل الوكالة؟</h3><p>الوكيل يشتري الألماس من خزنة التطبيق بسعر مخفّض ثم يبيعه بالسعر الرسمي، ويكون فرق السعر هو ربحه. حساب الوكيل مخصص للبيع ولا يشتري منتجات المتجر.</p></div></section>${content}`;
    }

    function renderUserAgencyArea(agents, application) {
        const applicationBox = application?.status === 'pending'
            ? `<div class="student-store-guide"><h3>طلبك قيد المراجعة</h3><p>سيظهر لك إشعار بعد مراجعة طلب الوكالة.</p></div>`
            : application?.status === 'rejected'
                ? `<div class="student-store-guide"><h3>تم رفض الطلب السابق</h3><p>${esc(application.admin_note || "يمكنك تقديم طلب جديد بعد مراجعة البيانات.")}</p><button class="student-store-primary" data-store-open-agency-form>تقديم طلب جديد</button></div>`
                : `<div class="student-store-guide"><h3>هل تريد العمل كوكيل؟</h3><p>قدّم معلوماتك ووسائل التواصل وخطة العمل، ثم ينتقل الطلب إلى مراجعة الأدمن.</p><button class="student-store-primary" data-store-open-agency-form>تقديم على وكالة</button></div>`;
        return `<section class="student-store-section"><h3 class="student-store-section-title">الوكلاء المعتمدون</h3><div class="student-store-grid">${agents.map(a=>`<article class="student-store-agent-card"><h4><i class="fa-solid fa-user-shield"></i> ${esc(a.display_name)}</h4><div class="student-store-description">${esc(a.province)} · وكيل معتمد</div><div class="student-store-agent-actions">${a.whatsapp?`<a href="https://wa.me/${esc(String(a.whatsapp).replace(/\D/g,''))}" target="_blank">واتساب</a>`:''}${a.telegram?`<a href="https://t.me/${esc(String(a.telegram).replace(/^@/,''))}" target="_blank">تيليغرام</a>`:''}${a.phone?`<a href="tel:${esc(a.phone)}">اتصال</a>`:''}</div></article>`).join('') || '<div class="student-store-empty">لا يوجد وكلاء متاحون حاليًا.</div>'}</div></section>${applicationBox}`;
    }

    function renderUserDiamondArea(packages, agents, application) {
        const applicationBox = application?.status === "pending"
            ? `<div class="student-store-guide"><h3>طلب الوكالة قيد المراجعة</h3><p>سيظهر حسابك كوكيل بعد قبول الأدمن.</p></div>`
            : application?.status === "rejected"
                ? `<div class="student-store-guide"><h3>تم رفض الطلب السابق</h3><p>${esc(application.admin_note || "يمكنك تقديم طلب جديد بعد مراجعة البيانات.")}</p><button class="student-store-primary" data-store-open-agency-form>تقديم طلب جديد</button></div>`
                : `<div class="student-store-guide"><h3>هل تريد العمل كوكيل؟</h3><p>اشترِ الألماس من الخزنة بسعر الوكلاء وبعه للمستخدمين بالسعر الرسمي. أرباحك هي فرق السعر.</p><button class="student-store-primary" data-store-open-agency-form>تقديم على وكالة</button></div>`;
        return `
            <section class="student-store-section"><h3 class="student-store-section-title">شراء الألماس من التطبيق</h3><div class="student-store-grid">${packages.map(p=>`<article class="student-store-package"><strong>${esc(p.title)}</strong><div class="student-store-package-row"><span>${Number(p.diamonds).toLocaleString('ar-IQ')} ألماسة</span><b>${Number(p.user_price_iqd).toLocaleString('ar-IQ')} د.ع</b></div><button class="student-store-primary" data-store-buy-diamond="${esc(p.id)}">شراء الباقة</button></article>`).join('') || '<div class="student-store-empty">لا توجد باقات حاليًا.</div>'}</div></section>
            <section class="student-store-section"><h3 class="student-store-section-title">اشترِ الألماس من وكيل</h3><div class="student-store-grid">${agents.map(a=>`<article class="student-store-agent-card"><h4><i class="fa-solid fa-user-shield"></i> ${esc(a.display_name)}</h4><div class="student-store-description">${esc(a.province)} · وكيل معتمد</div><div class="student-store-agent-actions">${a.whatsapp?`<a href="https://wa.me/${esc(String(a.whatsapp).replace(/\D/g,''))}" target="_blank">واتساب</a>`:''}${a.telegram?`<a href="https://t.me/${esc(String(a.telegram).replace(/^@/,''))}" target="_blank">تيليغرام</a>`:''}${a.phone?`<a href="tel:${esc(a.phone)}">اتصال</a>`:''}</div></article>`).join('') || '<div class="student-store-empty">لا يوجد وكلاء متاحون حاليًا.</div>'}</div></section>
            ${applicationBox}`;
    }

    function renderAgentDashboard(agent, packages) {
        return `<section class="student-store-section"><h3 class="student-store-section-title">لوحة الوكيل</h3><div class="student-store-guide"><p><strong>${esc(agent.display_name || 'الوكيل')}</strong> — ${esc(agent.province || '')}</p><div class="student-store-info-grid"><div class="student-store-info-box"><strong>رصيد الخزنة</strong><span>${Number(agent.vault_balance||0).toLocaleString('ar-IQ')} ألماسة</span></div><div class="student-store-info-box"><strong>إجمالي المبيعات</strong><span>${Number(agent.total_sold||0).toLocaleString('ar-IQ')} ألماسة</span></div><div class="student-store-info-box"><strong>حالة الوكالة</strong><span>فعّالة</span></div></div></div>
        <div class="student-store-grid">${packages.map(p=>`<article class="student-store-package"><strong>${esc(p.title)}</strong><div class="student-store-package-row"><span>سعر الوكيل</span><b>${Number(p.agent_price_iqd).toLocaleString('ar-IQ')} د.ع</b></div><div class="student-store-package-row"><span>سعر البيع الرسمي</span><b>${Number(p.user_price_iqd).toLocaleString('ar-IQ')} د.ع</b></div><div class="student-store-package-row"><span>الربح المتوقع</span><b>${Number(p.user_price_iqd-p.agent_price_iqd).toLocaleString('ar-IQ')} د.ع</b></div><button class="student-store-secondary" data-store-agent-stock="${esc(p.id)}">طلب من الخزنة</button></article>`).join('')}</div>
        <div class="student-store-guide"><h3>بيع ألماس لمستخدم</h3><form id="student-store-agent-sale-form" class="student-store-form-lite"><input id="student-store-sale-username" placeholder="يوزر المستخدم بدون @" required><input id="student-store-sale-diamonds" type="number" min="1" placeholder="كمية الألماس" required><input id="student-store-sale-amount" type="number" min="0" placeholder="المبلغ المستلم بالدينار" required><button class="student-store-primary" type="submit">تحويل الألماس</button></form></div></section>`;
    }

    function renderDiamondAdminArea() {
        const dr = state.diamondRequests || [], aa = state.agencyApplications || [], sr = state.agentStockRequests || [];
        const row=(title,items,type)=>`<section class="student-store-section"><h3 class="student-store-section-title">${title}</h3><div class="student-store-task-list">${items.map(x=>`<article class="student-store-agent-card"><strong>${type==='agency'?esc(x.full_name):Number(x.diamonds||0).toLocaleString('ar-IQ')+' ألماسة'}</strong><div class="student-store-description">${type==='agency'?esc(x.province+' · '+x.phone):Number(x.amount_iqd||0).toLocaleString('ar-IQ')+' د.ع'}</div><div class="student-store-agent-actions"><button data-store-admin-review="${type}" data-id="${esc(x.id)}" data-approve="1">قبول</button><button data-store-admin-review="${type}" data-id="${esc(x.id)}" data-approve="0">رفض</button></div></article>`).join('')||'<div class="student-store-empty">لا توجد طلبات معلقة.</div>'}</div></section>`;
        return row('طلبات شراء الألماس',dr,'diamond')+row('طلبات الوكالة',aa,'agency')+row('طلبات شحن خزنة الوكيل',sr,'stock');
    }


    function renderWallet() {
        const body = document.getElementById("student-store-body");
        if (!body) return;
        const s = state.walletSummary || {};
        const tx = state.walletTransactions || [];
        body.innerHTML = `${pageHead("fa-solid fa-wallet", "المحفظة", "رصيدك وسجل جميع الحركات المالية")}
          <section class="student-store-section">
            <h3 class="student-store-section-title">محفظتي</h3>
            <div class="student-store-wallet-summary">
              <div class="student-store-wallet-box"><strong>${Number(s.available_balance ?? state.balance ?? 0).toLocaleString("ar-IQ")}</strong><span>متاح</span></div>
              <div class="student-store-wallet-box"><strong>${Number(s.held_balance ?? 0).toLocaleString("ar-IQ")}</strong><span>محجوز</span></div>
              <div class="student-store-wallet-box"><strong>${Number(s.total_spent ?? 0).toLocaleString("ar-IQ")}</strong><span>إجمالي المصروف</span></div>
            </div>
            <div class="student-store-ledger">
              ${tx.map(t => {
                const amount = Number(t.amount || 0);
                return `<article class="student-store-ledger-row">
                  <div><strong>${esc(t.description || t.transaction_type || "حركة محفظة")}</strong><div class="student-store-stock">${new Date(t.created_at).toLocaleString("ar-IQ")}</div></div>
                  <div class="${amount >= 0 ? "plus" : "minus"}">${amount >= 0 ? "+" : ""}${amount.toLocaleString("ar-IQ")} ألماسة</div>
                </article>`;
              }).join("") || `<div class="student-store-empty">لا توجد حركات في المحفظة بعد.</div>`}
            </div>
          </section>`;
    }

    async function loadWallet(client) {
        if (!client || !state.user) return;
        try {
            const [summary, ledger] = await Promise.all([
                client.rpc("store_get_wallet_summary"),
                client.from("store_wallet_transactions").select("id,amount,transaction_type,description,created_at").eq("user_id", state.user.id).order("created_at",{ascending:false}).limit(100)
            ]);
            if (!summary.error) state.walletSummary = Array.isArray(summary.data) ? summary.data[0] : summary.data;
            if (!ledger.error) state.walletTransactions = ledger.data || [];
        } catch (e) { console.warn("Store wallet:", e); }
    }

    function render() {
        updateBalance();
        updateAdminUI();
        if (state.loading) return renderLoading();
        if (state.activeTab === "home") renderHome();
        else if (state.activeTab === "diamonds") renderDiamonds();
        else if (state.activeTab === "agency") renderAgency();
        else if (state.activeTab === "wallet") renderWallet();
        else if (state.activeTab === "tasks") renderTasks();
        else if (state.activeTab === "orders") renderOrders();
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
        const fields = "id,name,description,image_url,image_path,price_money,currency,price_diamonds,allow_money,allow_diamonds,allow_cod,product_type,delivery_fee,stock,sort_order,is_active,created_at";
        let query = client.from("store_products").select(fields);
        if (!state.isAdmin) query = query.eq("is_active", true);
        let result = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

        if (result.error && isMissingColumn(result.error, "image_path")) {
            let fallback = client.from("store_products").select(fields.replace(",image_path", "").replace(",allow_cod,product_type,delivery_fee", ""));
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
            .select("id,title,description,reward_diamonds,repeat_kind,verification_type,condition_type,target_count,starts_at,ends_at,sort_order,is_active");
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

    async function loadOrders(client) {
        if (!state.user) return [];
        let query = client.from("store_orders").select("id,user_id,product_name,payment_method,money_amount,currency,diamond_amount,status,created_at,updated_at").order("created_at", { ascending:false });
        if (!state.isAdmin) query = query.eq("user_id", state.user.id);
        const { data, error } = await query;
        if (error) { if (isMissingTable(error)) return []; throw error; }
        return data || [];
    }

    async function loadDiamondSystem(client) {
        if (!state.user) return;
        const [packs, agents, agency] = await Promise.all([
            client.from("store_diamond_packages").select("*").eq("is_active",true).order("sort_order"),
            client.from("store_agents").select("user_id,display_name,province,phone,whatsapp,telegram,is_active,vault_balance,total_sold").eq("is_active",true).order("display_name"),
            client.rpc("store_get_my_agency_status")
        ]);
        state.diamondPackages = packs.data || [];
        state.agents = agents.data || [];
        state.agencyStatus = agency.data || null;
        if (state.isAdmin) {
            const [d,a,st] = await Promise.all([
                client.from("store_diamond_purchase_requests").select("*").eq("status","pending").order("created_at",{ascending:false}),
                client.from("store_agency_applications").select("*").eq("status","pending").order("created_at",{ascending:false}),
                client.from("store_agent_stock_requests").select("*").eq("status","pending").order("created_at",{ascending:false})
            ]);
            state.diamondRequests=d.data||[]; state.agencyApplications=a.data||[]; state.agentStockRequests=st.data||[];
        }
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
            await loadWallet(client);
            await loadDiamondSystem(client);
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
        state.activeTab = "home";
        updateStoreHeader();
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
        modal.innerHTML = window.StudentSecurity?.sanitizeHTML?.(html) ?? html;
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
        if (state.agencyStatus?.is_agent) return toast("حساب الوكيل مخصص لبيع الألماس ولا يمكنه شراء المنتجات.");
        showModal(`
            <div class="student-store-modal-card" role="dialog" aria-modal="true">
                <div class="student-store-modal-head">
                    <div class="student-store-modal-title">${esc(product.name)}</div>
                    <button class="student-store-modal-close" type="button" data-store-modal-close aria-label="إغلاق">×</button>
                </div>
                <div class="student-store-payment-options">
                    ${product.allow_money ? `<button class="student-store-payment" type="button" data-store-pay="money" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-money-bill-wave"></i> الدفع المالي</span><strong>${money(product.price_money, product.currency)}</strong></button>` : ""}
                    ${product.allow_diamonds ? `<button class="student-store-payment" type="button" data-store-pay="diamonds" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-gem student-store-diamond"></i> الدفع بالألماس</span><strong>${Number(product.price_diamonds || 0)} ألماسة</strong></button>` : ""}${product.allow_cod ? `<button class="student-store-payment" type="button" data-store-pay="cod" data-product-id="${esc(product.id)}"><span><i class="fa-solid fa-truck"></i> الدفع عند الاستلام</span><strong>${money(Number(product.price_money||0)+Number(product.delivery_fee||0), product.currency)}</strong></button>` : ""}
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
                        <label class="student-store-check"><input id="student-store-allow-cod" type="checkbox" ${product?.allow_cod ? "checked" : ""}> الدفع عند الاستلام</label>
                        <div class="student-store-field"><label>نوع المنتج</label><select id="student-store-product-type" class="student-store-input"><option value="physical" ${product?.product_type === "physical" ? "selected" : ""}>منتج حقيقي</option><option value="digital" ${product?.product_type === "digital" ? "selected" : ""}>منتج رقمي</option><option value="verification" ${product?.product_type === "verification" ? "selected" : ""}>علامة توثيق</option></select></div>
                        <div class="student-store-field"><label>أجور التوصيل</label><input id="student-store-delivery-fee" class="student-store-input" type="number" min="0" value="${Number(product?.delivery_fee || 0)}"></div>
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
                    <div class="student-store-field"><label>نوع المهمة</label>
                        <select id="student-store-task-verification" class="student-store-input">
                            <option value="daily_visit" ${task?.verification_type === "daily_visit" ? "selected" : ""}>زيارة المتجر / استلام يدوي</option>
                            <option value="automatic" ${task?.verification_type === "automatic" ? "selected" : ""}>تلقائية حسب الإنجاز</option>
                        </select>
                    </div>
                    <div class="student-store-field"><label>شرط المهمة التلقائية</label>
                        <select id="student-store-task-condition" class="student-store-input">
                            <option value="">بدون شرط تلقائي</option>
                            <option value="english_open_daily" ${task?.condition_type === "english_open_daily" ? "selected" : ""}>دخول Daily English</option>
                            <option value="english_open_challenge" ${task?.condition_type === "english_open_challenge" ? "selected" : ""}>دخول English Challenge</option>
                            <option value="english_vocabulary" ${task?.condition_type === "english_vocabulary" ? "selected" : ""}>تعلم عدد من المفردات</option>
                            <option value="english_grammar" ${task?.condition_type === "english_grammar" ? "selected" : ""}>إكمال عدد من القواعد</option>
                            <option value="english_daily_complete" ${task?.condition_type === "english_daily_complete" ? "selected" : ""}>إكمال درس اليوم</option>
                            <option value="english_mcq_answered" ${task?.condition_type === "english_mcq_answered" ? "selected" : ""}>حل عدد من أسئلة MCQ</option>
                            <option value="english_mcq_correct" ${task?.condition_type === "english_mcq_correct" ? "selected" : ""}>إجابات MCQ صحيحة</option>
                            <option value="english_level_reached" ${task?.condition_type === "english_level_reached" ? "selected" : ""}>الوصول إلى Level</option>
                        </select>
                    </div>
                    <div class="student-store-field"><label>العدد المطلوب / رقم Level</label>
                        <input id="student-store-task-target" class="student-store-input" type="number" min="1" step="1" value="${Number(task?.target_count || 1)}">
                    </div>
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
            verification_type: document.getElementById("student-store-task-verification")?.value || "daily_visit",
            condition_type: document.getElementById("student-store-task-condition")?.value || null,
            target_count: Math.max(1, Number(document.getElementById("student-store-task-target")?.value || 1)),
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
        const allowCod = Boolean(productFormValue("student-store-allow-cod")?.checked);
        const moneyRaw = productFormValue("student-store-price-money")?.value ?? "";
        const diamondRaw = productFormValue("student-store-price-diamonds")?.value ?? "";
        const stockRaw = productFormValue("student-store-product-stock")?.value ?? "";
        const sortRaw = productFormValue("student-store-product-sort")?.value ?? "0";

        if (!name) throw new Error("اكتب اسم المنتج.");
        if (!allowMoney && !allowDiamonds && !allowCod) throw new Error("اختر طريقة دفع واحدة على الأقل.");
        const productType = productFormValue("student-store-product-type")?.value || "physical";
        if ((productType === "digital" || productType === "verification") && allowCod) {
            throw new Error("الدفع عند الاستلام متاح للمنتجات الحقيقية فقط.");
        }

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
            allow_cod: allowCod,
            product_type: productType,
            delivery_fee: Number(productFormValue("student-store-delivery-fee")?.value || 0),
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

    async function updateOrderStatus(orderId,status,button){
        if(!state.isAdmin||!orderId||!status||button?.disabled)return; const client=db(); if(!client)return; button.disabled=true;
        try{const {error}=await client.rpc("admin_update_store_order",{p_order_id:orderId,p_status:status}); if(error)throw error; toast("تم تحديث حالة الطلب."); await refresh();}
        catch(error){console.error(error);toast(error?.message||"تعذر تحديث الطلب.");button.disabled=false;}
    }

    function openAgencyForm() {
        showModal(`<div class="student-store-modal-card"><div class="student-store-modal-head"><div class="student-store-modal-title">التقديم على وكالة</div><button class="student-store-modal-close" data-store-modal-close>×</button></div><div class="student-store-note">الوكيل يشتري الألماس من الخزنة بسعر مخفض، ويبيعه بالسعر الرسمي. لا يستطيع الوكيل شراء منتجات المتجر.</div><form id="student-store-agency-form" class="student-store-form-lite"><input id="agency-name" placeholder="الاسم الكامل" required><input id="agency-province" placeholder="المحافظة والمنطقة" required><input id="agency-phone" placeholder="رقم الهاتف" required><input id="agency-whatsapp" placeholder="رقم واتساب"><input id="agency-telegram" placeholder="معرف تيليغرام"><textarea id="agency-experience" placeholder="خبرتك وطريقة عملك المقترحة"></textarea><button class="student-store-primary" type="submit">إرسال الطلب</button></form></div>`);
        document.getElementById("student-store-agency-form")?.addEventListener("submit", submitAgencyApplication);
    }

    async function requestDiamondPackage(id, button) { const client=db(); if(!client)return; button.disabled=true; try{const {error}=await client.rpc("store_request_diamonds",{p_package_id:id,p_payment_reference:null});if(error)throw error;toast("تم إنشاء طلب شراء الألماس. حوّل المبلغ ثم تواصل مع الإدارة.");await refresh();}catch(e){toast(e.message||"تعذر إنشاء الطلب.");}finally{button.disabled=false;} }
    async function submitAgencyApplication(e){e.preventDefault();const client=db();const b=e.submitter;b.disabled=true;try{const {error}=await client.rpc("store_apply_for_agency",{p_full_name:document.getElementById('agency-name').value,p_province:document.getElementById('agency-province').value,p_phone:document.getElementById('agency-phone').value,p_whatsapp:document.getElementById('agency-whatsapp').value,p_telegram:document.getElementById('agency-telegram').value,p_experience:document.getElementById('agency-experience').value});if(error)throw error;closeModal();toast("تم إرسال طلب الوكالة.");await refresh();}catch(x){toast(x.message||"تعذر إرسال الطلب.");b.disabled=false;}}
    async function requestAgentStock(id,button){const client=db();button.disabled=true;try{const {error}=await client.rpc("store_agent_request_stock",{p_package_id:id});if(error)throw error;toast("تم إرسال طلب شحن الخزنة.");await refresh();}catch(e){toast(e.message||"تعذر إرسال الطلب.");}finally{button.disabled=false;}}
    async function reviewStoreRequest(type,id,approve,button){const client=db();button.disabled=true;const rpc=type==='diamond'?'admin_review_diamond_request':type==='agency'?'admin_review_agency_application':'admin_review_agent_stock';const args=type==='diamond'?{p_request_id:id,p_approve:approve}:type==='agency'?{p_application_id:id,p_approve:approve,p_note:null}:{p_request_id:id,p_approve:approve};try{const {error}=await client.rpc(rpc,args);if(error)throw error;toast("تم تحديث الطلب.");await refresh();}catch(e){toast(e.message||"تعذر تحديث الطلب.");button.disabled=false;}}
    async function handleBodySubmit(event){if(event.target.id!=="student-store-agent-sale-form")return;event.preventDefault();const client=db();const b=event.submitter;b.disabled=true;try{const {data,error}=await client.rpc("store_agent_sell_diamonds",{p_customer_username:document.getElementById('student-store-sale-username').value,p_diamonds:Number(document.getElementById('student-store-sale-diamonds').value),p_sale_amount_iqd:Number(document.getElementById('student-store-sale-amount').value)});if(error)throw error;toast("تم تحويل الألماس للمستخدم.");event.target.reset();await refresh();}catch(e){toast(e.message||"تعذر تنفيذ البيع.");b.disabled=false;}}

    function handleBodyClick(event) {
        const sectionButton = event.target.closest("[data-store-section]");
        if (sectionButton) { event.preventDefault(); setSection(sectionButton.dataset.storeSection); return; }
        const homeButton = event.target.closest("[data-store-home]");
        if (homeButton) { event.preventDefault(); setSection("home", false); return; }
        const buyDiamond = event.target.closest("[data-store-buy-diamond]");
        if (buyDiamond) { event.preventDefault(); requestDiamondPackage(buyDiamond.dataset.storeBuyDiamond, buyDiamond); return; }
        const agencyForm = event.target.closest("[data-store-open-agency-form]");
        if (agencyForm) { event.preventDefault(); openAgencyForm(); return; }
        const stock = event.target.closest("[data-store-agent-stock]");
        if (stock) { event.preventDefault(); requestAgentStock(stock.dataset.storeAgentStock, stock); return; }
        const review = event.target.closest("[data-store-admin-review]");
        if (review) { event.preventDefault(); reviewStoreRequest(review.dataset.storeAdminReview, review.dataset.id, review.dataset.approve === "1", review); return; }
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


    function openCodForm(product) {
        if (!product) return;
        if (product.product_type === "digital" || product.product_type === "verification") return toast("هذا المنتج لا يدعم الدفع عند الاستلام.");
        showModal(`<div class="student-store-modal-card">
          <div class="student-store-modal-head"><div class="student-store-modal-title">بيانات التوصيل</div><button class="student-store-modal-close" data-store-modal-close>×</button></div>
          <form id="student-store-cod-form" class="student-store-cod-form">
            <input id="store-cod-name" placeholder="الاسم الكامل" required>
            <input id="store-cod-phone" placeholder="رقم الهاتف" required>
            <input id="store-cod-province" placeholder="المحافظة" required>
            <input id="store-cod-area" placeholder="المنطقة" required>
            <textarea id="store-cod-address" placeholder="العنوان الكامل وأقرب نقطة دالة" required></textarea>
            <textarea id="store-cod-note" placeholder="ملاحظات إضافية"></textarea>
            <div class="student-store-note">السعر: ${money(product.price_money, product.currency)} — التوصيل: ${money(product.delivery_fee || 0, product.currency)}</div>
            <button class="student-store-save" type="submit" data-store-submit-cod="${esc(product.id)}">تأكيد الطلب</button>
          </form>
        </div>`);
    }

    async function submitCodOrder(form, button) {
        const client = db();
        const productId = button.dataset.storeSubmitCod;
        button.disabled = true;
        try {
            const { data, error } = await client.rpc("store_create_cod_order", {
                p_product_id: productId,
                p_full_name: document.getElementById("store-cod-name").value,
                p_phone: document.getElementById("store-cod-phone").value,
                p_province: document.getElementById("store-cod-province").value,
                p_area: document.getElementById("store-cod-area").value,
                p_address_text: document.getElementById("store-cod-address").value,
                p_notes: document.getElementById("store-cod-note").value
            });
            if (error) throw error;
            closeModal();
            toast("تم إنشاء طلب الدفع عند الاستلام.");
            await refresh();
        } catch (e) {
            toast(e.message || "تعذر إنشاء الطلب.");
            button.disabled = false;
        }
    }

    function handleModalClick(event) {
        if (event.target.id === "student-store-modal" || event.target.closest("[data-store-modal-close]")) {
            event.preventDefault();
            closeModal();
            return;
        }

        const codForm = event.target.closest("#student-store-cod-form");
        if (codForm && event.type === "click") {
            const submit = event.target.closest("[data-store-submit-cod]");
            if (submit) { event.preventDefault(); submitCodOrder(codForm, submit); return; }
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
            else if (method === "cod") openCodForm(product);
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

    window.addEventListener("popstate", function () {
        if (!overlay?.classList.contains("show")) return;
        if (state.activeTab !== "home") {
            setSection("home", false);
        }
    });

    window.StudentStore = {
        version: "2.2.0",
        open,
        close,
        refresh
    };
    window.openStudentStore = open;
})();
