/**
 * js/component/header-admin.js
 */

function loadAdminHeader() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    // Lấy thông tin user an toàn
    const user = (typeof Storage !== "undefined") ? Storage.getCurrentUser() : null;
    const ROLE_ADMIN = (typeof VAI_TRO !== "undefined" && VAI_TRO.QUAN_LY) ? VAI_TRO.QUAN_LY : "quan_ly";

    // Chỉ quản lý mới được vào trang admin
    if (!user || user.vai_tro !== ROLE_ADMIN) {
        window.location.replace("../../index.html");
        return;
    }

    const rootPath = "../../";
    
    // FIX LỖI Ở ĐÂY: Hỗ trợ lấy tên trang từ cả thuộc tính data-page hoặc data-admin-page
    const currentPage = document.body.dataset.page || document.body.dataset.adminPage || "";

    const menu = [
        { page: "dashboard", href: "dashboard.html",  text: "Dashboard" },
        { page: "user",      href: "user.html",       text: "Người dùng" },
        { page: "service",   href: "service.html",    text: "Dịch vụ" },
        { page: "booking",   href: "booking.html",    text: "Lịch hẹn" },
        { page: "review",    href: "review-mnm.html", text: "Đánh giá" },
        { page: "profile",   href: "profile.html",    text: "Hồ sơ" }
    ];

    const menuHtml = menu.map(function (item) {
        // So sánh tên trang hiện tại với cấu hình menu để thêm class active
        const isActive = item.page === currentPage;

        return `
            <li>
                <a
                    href="${item.href}"
                    class="${isActive ? "active" : ""}"
                    ${isActive ? 'aria-current="page"' : ""}
                >
                    ${item.text}
                </a>
            </li>
        `;
    }).join("");

    navbar.innerHTML = `
        <a href="dashboard.html" class="logo">
            <img
                src="${rootPath}assets/images/logo.jpg"
                alt="PawPaw Logo"
                class="logo-icon"
            >
            <img
                src="${rootPath}assets/images/pawpawheader.png"
                alt="PawPaw"
                class="logo-text"
            >
        </a>

        <ul class="nav-links">
            ${menuHtml}
        </ul>

        <div class="auth-buttons">
            <a
                href="${rootPath}index.html"
                class="btn btn-primary"
                id="btn-logout"
            >
                Đăng xuất
            </a>
        </div>
    `;

    // Xử lý sự kiện đăng xuất
    document.getElementById("btn-logout").addEventListener("click", function () {
        if (typeof Storage !== "undefined") {
            Storage.clearCurrentUser();
        }
    });
}

loadAdminHeader();