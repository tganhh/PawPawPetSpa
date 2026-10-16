function loadCustomerHeader() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    // Xác định đang ở trang gốc hay trang customer
    const isCustomerPage = window.location.pathname.includes("/pages/customer/");

    const rootPath = isCustomerPage ? "../../" : "";
    const customerPath = isCustomerPage ? "" : "pages/customer/";

    // Lấy tên trang hiện tại từ body
    const currentPage = document.body.dataset.page || "";

    const menu = [
        { page: "about",       href: "about.html",       text: "Trang chủ" },
        { page: "service",     href: "service.html",     text: "Dịch vụ" },
        { page: "booking",     href: "booking.html",     text: "Đặt lịch" },
        { page: "my-booking",  href: "my-booking.html",  text: "Lịch hẹn" },
        { page: "pet",         href: "pet.html",         text: "Thú cưng" },
        { page: "profile",     href: "profile.html",     text: "Hồ sơ" }
    ];

    const menuHtml = menu.map(function (item) {
        const isActive = item.page === currentPage;

        return `
            <li>
                <a
                    href="${customerPath}${item.href}"
                    class="${isActive ? "active" : ""}"
                    ${isActive ? 'aria-current="page"' : ""}
                >
                    ${item.text}
                </a>
            </li>
        `;
    }).join("");

    navbar.innerHTML = `
        <a href="${rootPath}index.html" class="logo">
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

    // Đăng xuất
    document.getElementById("btn-logout").addEventListener("click", function () {
        if (typeof Storage !== "undefined") {
            Storage.clearCurrentUser();
        }
    });
}

loadCustomerHeader();