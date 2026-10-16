(function () {
  // Các trang protected nằm ở pages/customer/ hoặc pages/admin/ nên cách gốc 2 cấp
  const ROOT = "../../";
  const LOGIN_URL = ROOT + "pages/auth/login.html";

  // Khu vực mặc định của từng role
  const HOME_BY_ROLE = {
    [VAI_TRO.KHACH_HANG]: ROOT + "pages/customer/about.html",
    [VAI_TRO.QUAN_LY]: ROOT + "pages/admin/dashboard.html"
  };

  let lastRequiredRole = null;

  // Tự xác định role yêu cầu theo đường dẫn trang
  function detectRequiredRole() {
    const path = window.location.pathname;

    if (path.includes("/pages/admin/")) return VAI_TRO.QUAN_LY;
    if (path.includes("/pages/customer/")) return VAI_TRO.KHACH_HANG;

    return null;
  }

  function redirect(url) {
    window.location.replace(url);
  }

  // Trả về currentUser nếu hợp lệ, ngược lại redirect và trả về null
  function requireLogin(requiredRole) {
    const role = requiredRole || detectRequiredRole();
    lastRequiredRole = role;

    // Ẩn trang cho đến khi kiểm tra xong, tránh nháy nội dung
    document.documentElement.style.visibility = "hidden";

    const user = Storage.getCurrentUser();

    // 1. Chưa đăng nhập → login
    if (!user) {
      redirect(LOGIN_URL);
      return null;
    }

    // 2. Role không hợp lệ → xóa phiên, về login
    if (!HOME_BY_ROLE[user.vai_tro]) {
      Storage.clearCurrentUser();
      redirect(LOGIN_URL);
      return null;
    }

    // 3. Sai khu vực → về khu vực đúng của role
    if (role && user.vai_tro !== role) {
      redirect(HOME_BY_ROLE[user.vai_tro]);
      return null;
    }

    // 4. Hợp lệ → hiện trang
    document.documentElement.style.visibility = "";
    return user;
  }

  // Bấm Back sau khi logout (trang lấy từ bfcache) thì kiểm tra lại
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && lastRequiredRole !== null) {
      requireLogin(lastRequiredRole);
    }
  });

  const AuthGuard = Object.freeze({ requireLogin, detectRequiredRole });

  window.AuthGuard = AuthGuard;
  window.requireLogin = requireLogin;
})();