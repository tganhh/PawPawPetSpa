(function () {

    async function initRegister() {

        // Wait for JSON data to be loaded into LocalStorage
        await Storage.initData();

        const registerForm =
            document.getElementById("register-form");

        if (!registerForm) return;


        registerForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                // =========================
                // 1. GET FORM DATA
                // =========================

                const fullName =
                    document
                        .getElementById("ho-ten")
                        .value
                        .trim();

                const email =
                    document
                        .getElementById("email")
                        .value
                        .trim();

                const phoneNumber =
                    document
                        .getElementById("so-dien-thoai")
                        .value
                        .trim();

                const password =
                    document
                        .getElementById("mat-khau")
                        .value;

                const confirmPassword =
                    document
                        .getElementById("xac-nhan-mat-khau")
                        .value;


                // =========================
                // 2. CLEAR OLD ERRORS
                // =========================

                clearErrors();

                const message =
                    document.getElementById(
                        "register-message"
                    );

                message.textContent = "";
                message.style.color = "";


                // =========================
                // 3. VALIDATE DATA
                // =========================

                let isValid = true;


                // Full name
                if (!fullName) {

                    showError(
                        "ho-ten-error",
                        "Vui lòng nhập họ và tên."
                    );

                    isValid = false;
                }


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


                // Phone number
                if (!phoneNumber) {

                    showError(
                        "so-dien-thoai-error",
                        "Vui lòng nhập số điện thoại."
                    );

                    isValid = false;

                } else if (!isValidPhone(phoneNumber)) {

                    showError(
                        "so-dien-thoai-error",
                        "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0."
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

                } else if (password.length < 6) {

                    showError(
                        "mat-khau-error",
                        "Mật khẩu phải có ít nhất 6 ký tự."
                    );

                    isValid = false;
                }


                // Confirm password
                if (!confirmPassword) {

                    showError(
                        "xac-nhan-mat-khau-error",
                        "Vui lòng xác nhận mật khẩu."
                    );

                    isValid = false;

                } else if (password !== confirmPassword) {

                    showError(
                        "xac-nhan-mat-khau-error",
                        "Mật khẩu xác nhận không khớp."
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


                // =========================
                // 5. CHECK DUPLICATE EMAIL
                // =========================

                const emailExists =
                    users.some(function (user) {

                        return String(user.email || "")
                            .trim()
                            .toLowerCase() ===
                            email.toLowerCase();

                    });


                if (emailExists) {

                    showError(
                        "email-error",
                        "Email này đã được đăng ký."
                    );

                    return;
                }


                // =========================
                // 6. CHECK DUPLICATE PHONE
                // =========================

                const phoneExists =
                    users.some(function (user) {

                        return String(
                            user.so_dien_thoai || ""
                        ).trim() === phoneNumber;

                    });


                if (phoneExists) {

                    showError(
                        "so-dien-thoai-error",
                        "Số điện thoại này đã được đăng ký."
                    );

                    return;
                }


                // =========================
                // 7. GENERATE USER ID
                // =========================

                const userId =
                    Storage.generateId(
                        "KH",
                        DATA_KEYS.USERS,
                        "ma_nguoi_dung"
                    );


                // =========================
                // 8. CREATE NEW USER
                // =========================

                const newUser = {

                    ma_nguoi_dung: userId,

                    ho_ten: fullName,

                    email: email,

                    so_dien_thoai: phoneNumber,

                    mat_khau: password,

                    anh_dai_dien: "",

                    dia_chi: "",

                    vai_tro: VAI_TRO.KHACH_HANG
                };


                // =========================
                // 9. SAVE USER
                // =========================

                Storage.addItem(
                    DATA_KEYS.USERS,
                    newUser
                );


                // =========================
                // 10. SHOW SUCCESS MESSAGE
                // =========================

                message.textContent =
                    "Đăng ký thành công. Đang chuyển đến trang đăng nhập...";

                message.style.color =
                    "#6982D5";


                // =========================
                // 11. REDIRECT TO LOGIN
                // =========================

                setTimeout(
                    function () {

                        window.location.href =
                            "login.html";

                    },
                    800
                );

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
    // VALIDATE PHONE NUMBER
    // =========================

    function isValidPhone(phoneNumber) {

        return /^0\d{9}$/
            .test(phoneNumber);

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
    initRegister();

})();