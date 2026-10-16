console.log("LOGIN.JS ĐÃ CHẠY");
(function () {

    async function initLogin() {

        // Wait for JSON data to be loaded into LocalStorage
        await Storage.initData();

        const loginForm =
            document.getElementById("login-form");

        if (!loginForm) return;


        loginForm.addEventListener(
            "submit",
            function (event) {
                console.log("SUBMIT LOGIN ĐÃ CHẠY");
                event.preventDefault();


                // =========================
                // 1. GET FORM DATA
                // =========================

                const email =
                    document
                        .getElementById("email")
                        .value
                        .trim();

                const password =
                    document
                        .getElementById("mat-khau")
                        .value;


                // =========================
                // 2. CLEAR OLD ERRORS
                // =========================

                clearErrors();

                const message =
                    document.getElementById(
                        "login-message"
                    );

                message.textContent = "";
                message.style.color = "";


                // =========================
                // 3. VALIDATE DATA
                // =========================

                let isValid = true;


                // Email
                if (!email) {

                    showError(
                        "email-error",
                        "Vui lòng nhập email."
                    );

                    isValid = false;

                } else if (!isValidEmail(email)) {

                    showError(
                        "email-error",
                        "Email không đúng định dạng."
                    );

                    isValid = false;
                }


                // Password
                if (!password) {

                    showError(
                        "mat-khau-error",
                        "Vui lòng nhập mật khẩu."
                    );

                    isValid = false;
                }


                // Stop if validation fails
                if (!isValid) return;


                // =========================
                // 4. GET USER LIST
                // =========================

                const users =
                    Storage.getData(DATA_KEYS.USERS) || [];
                    /*thêm tạm*/
                    console.log("USERS:", users);
                    console.log("EMAIL NHẬP:", email);

                // =========================
                // 5. FIND USER
                // =========================

                const user =
                    users.find(function (item) {

                        return String(
                            item.email || ""
                        )
                            .trim()
                            .toLowerCase() ===
                            email.toLowerCase();

                    });
                    /* thêm tạm */
                    console.log("USER TÌM ĐƯỢC:", user);

                // =========================
                // 6. CHECK LOGIN INFORMATION
                // =========================
                /*thêm tạm*/
                console.log("MẬT KHẨU NHẬP:", password);
                console.log("MẬT KHẨU TRONG JSON:", user.mat_khau);
                console.log("MẬT KHẨU CÓ KHỚP:", user.mat_khau === password);
                if (!user || user.mat_khau !== password) {

                    message.textContent =
                        "Email hoặc mật khẩu không chính xác.";

                    return;
                }


                // =========================
                // 7. SAVE CURRENT USER
                // =========================
                /* thêm tạm*/
                console.log("CHUẨN BỊ LƯU USER:", user);
                Storage.setCurrentUser(user);
                /* thêm tạm*/
                console.log("VAI TRÒ USER:", user.vai_tro);
                console.log("VAI TRÒ KHÁCH HÀNG:", VAI_TRO.KHACH_HANG);
                /* thêm tạm*/
                console.log("USER SAU KHI LƯU:", Storage.getCurrentUser());

                // =========================
                // 8. REDIRECT BY ROLE
                // =========================

                if (
                    user.vai_tro ===
                    VAI_TRO.KHACH_HANG
                ) {
                    console.log("ĐÃ VÀO NHÁNH KHÁCH HÀNG");
                    console.log("ĐƯỜNG DẪN CHUYỂN:", "../customer/about.html");
                    window.location.href =
                        "../customer/about.html";

                    return;
                }


                if (
                    user.vai_tro ===
                    VAI_TRO.QUAN_LY
                ) {

                    window.location.href =
                        "../admin/dashboard.html";

                    return;
                }


                // =========================
                // 9. INVALID ROLE
                // =========================

                Storage.clearCurrentUser();

                message.textContent =
                    "Tài khoản không có quyền truy cập.";

            }
        );
    }


    // =========================
    // VALIDATE EMAIL
    // =========================

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);

    }


    // =========================
    // SHOW ERROR
    // =========================

    function showError(elementId, message) {

        const element =
            document.getElementById(elementId);

        if (element) {

            element.textContent = message;

        }
    }


    // =========================
    // CLEAR ERRORS
    // =========================

    function clearErrors() {

        document
            .querySelectorAll(".form-error")
            .forEach(function (errorElement) {

                errorElement.textContent = "";

            });

    }


    // Run when the page is loaded
    initLogin();

})();