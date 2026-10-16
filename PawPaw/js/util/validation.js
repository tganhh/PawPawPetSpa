(function () {
  // Hiển thị lỗi cho input
  function showError(input, message) {
    if (!input) {
      return;
    }

    input.classList.add("error");
    input.setAttribute("aria-invalid", "true");

    let errorElement = input.parentElement
      ? input.parentElement.querySelector(".error-message")
      : null;

    if (!errorElement) {
      errorElement = document.createElement("small");
      errorElement.className = "error-message";

      if (input.parentElement) {
        input.parentElement.appendChild(errorElement);
      }
    }

    errorElement.textContent = message || "";
    errorElement.style.display = message ? "block" : "none";
  }

  // Xóa lỗi của input
  function clearError(input) {
    if (!input) {
      return;
    }

    input.classList.remove("error");
    input.removeAttribute("aria-invalid");

    const errorElement = input.parentElement
      ? input.parentElement.querySelector(".error-message")
      : null;

    if (errorElement) {
      errorElement.textContent = "";
      errorElement.style.display = "none";
    }
  }

  // Kiểm tra trường bắt buộc
  function validateRequired(value, fieldName = "Trường này") {
    const text = value == null ? "" : String(value).trim();

    if (!text) {
      return `${fieldName} không được để trống`;
    }

    return "";
  }

  // Kiểm tra email
  function validateEmail(value) {
    const email = value == null ? "" : String(value).trim();

    if (!email) {
      return "Email không được để trống";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return "Email không hợp lệ";
    }

    return "";
  }

  // Kiểm tra số điện thoại Việt Nam
  function validatePhone(value) {
    const phone = value == null ? "" : String(value).trim();

    if (!phone) {
      return "Số điện thoại không được để trống";
    }

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

    if (!phoneRegex.test(phone)) {
      return "Số điện thoại không hợp lệ";
    }

    return "";
  }

  // Kiểm tra mật khẩu
  // Quy tắc: tối thiểu 6 ký tự
  function validatePassword(value) {
    const password = value == null ? "" : String(value);

    if (!password) {
      return "Mật khẩu không được để trống";
    }

    if (password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự";
    }

    return "";
  }

  // Validate một input
  function validateField(input, validator) {
    if (!input || typeof validator !== "function") {
      return false;
    }

    const message = validator(input.value);

    if (message) {
      showError(input, message);
      return false;
    }

    clearError(input);
    return true;
  }

  const Validation = Object.freeze({
    showError,
    clearError,
    validateRequired,
    validateEmail,
    validatePhone,
    validatePassword,
    validateField
  });

  window.Validation = Validation;

  window.showError = showError;
  window.clearError = clearError;
  window.validateRequired = validateRequired;
  window.validateEmail = validateEmail;
  window.validatePhone = validatePhone;
  window.validatePassword = validatePassword;
  window.validateField = validateField;
})();