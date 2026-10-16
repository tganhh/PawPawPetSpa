
document.addEventListener("DOMContentLoaded", () => {
  // 1. Kiểm tra xác thực: chỉ cho phép quản lý truy cập
  let currentUser = AuthGuard.requireLogin(VAI_TRO.QUAN_LY);
  if (!currentUser) return;

  if (typeof currentUser === "string") {
    currentUser = Storage.getItemById(
      DATA_KEYS.USERS,
      "ma_nguoi_dung",
      currentUser
    );
  }

  if (!currentUser) return;

  // 2. DOM elements
  const form = document.getElementById("profileForm");
  const maNguoiDungInput = document.getElementById("maNguoiDung");
  const emailInput = document.getElementById("email");
  const hoTenInput = document.getElementById("hoTen");
  const soDienThoaiInput = document.getElementById("soDienThoai");
  const diaChiInput = document.getElementById("diaChi");
  const avatarWrapper = document.getElementById("avatarWrapper");
  const avatarFileInput = document.getElementById("avatarFileInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const alertSuccess = document.getElementById("alertSuccess");
  const formGeneralError = document.getElementById("formGeneralError");
  const btnBack = document.getElementById("btnBack");

  // 3. Lưu ảnh đại diện hiện tại
  let currentAvatarData = currentUser.anh_dai_dien || "";

  // 4. Hiển thị dữ liệu quản lý
  function renderUserData() {
    if (maNguoiDungInput) {
      maNguoiDungInput.value = currentUser.ma_nguoi_dung || "";
    }

    if (emailInput) {
      emailInput.value = currentUser.email || "";
    }

    if (hoTenInput) {
      hoTenInput.value = currentUser.ho_ten || "";
    }

    if (soDienThoaiInput) {
      soDienThoaiInput.value = currentUser.so_dien_thoai || "";
    }

    if (diaChiInput) {
      diaChiInput.value = currentUser.dia_chi || "";
    }

    updateAvatarDisplay(currentAvatarData, currentUser.ho_ten);
  }

  function updateAvatarDisplay(src, name) {
    if (!avatarPreview) return;

    if (src && src.trim()) {
      avatarPreview.src = src;
    } else {
      avatarPreview.src =
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name || "Admin"
        )}&background=806E83&color=fff`;
    }
  }

  renderUserData();

  // 5. Nút quay lại trang quản trị
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }

  // 6. Chọn ảnh đại diện từ máy tính
  if (avatarWrapper && avatarFileInput) {
    avatarWrapper.addEventListener("click", () => {
      avatarFileInput.click();
    });

    avatarFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Vui lòng chọn một file hình ảnh!");
        avatarFileInput.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước ảnh đại diện không được vượt quá 2MB!");
        avatarFileInput.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        currentAvatarData = event.target.result;

        if (avatarPreview) {
          avatarPreview.src = currentAvatarData;
        }
      };

      reader.readAsDataURL(file);
    });
  }

  // 7. Validate họ tên
  function validateNameField() {
    if (!hoTenInput) return false;

    return Validation.validateField(hoTenInput, (value) =>
      Validation.validateRequired(value, "Họ và tên")
    );
  }

  // 8. Validate số điện thoại và kiểm tra trùng
  function validatePhoneField() {
    if (!soDienThoaiInput) return false;

    const phoneValue = soDienThoaiInput.value.trim();
    const errorMessage = Validation.validatePhone(phoneValue);

    if (errorMessage) {
      Validation.showError(soDienThoaiInput, errorMessage);
      return false;
    }

    const users = Storage.getData(DATA_KEYS.USERS) || [];
    const currentId = String(currentUser.ma_nguoi_dung || "");

    const isExisted = users.some((user) => {
      const samePhone =
        String(user.so_dien_thoai || "").trim() === phoneValue;

      const otherUser =
        String(user.ma_nguoi_dung || "").trim() !== currentId;

      return samePhone && otherUser;
    });

    if (isExisted) {
      Validation.showError(
        soDienThoaiInput,
        "Số điện thoại này đã được sử dụng bởi tài khoản khác"
      );
      return false;
    }

    Validation.clearError(soDienThoaiInput);
    return true;
  }

  if (hoTenInput) {
    hoTenInput.addEventListener("blur", validateNameField);

    hoTenInput.addEventListener("input", () => {
      Validation.clearError(hoTenInput);
    });
  }

  if (soDienThoaiInput) {
    soDienThoaiInput.addEventListener("blur", validatePhoneField);
    soDienThoaiInput.addEventListener("input", validatePhoneField);
  }

  // 9. Hiển thị thông báo
  function showMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.classList.remove("success", "error");

    if (type) {
      element.classList.add(type);
    }

    element.style.display = "block";
  }

  // 10. Lưu thông tin hồ sơ quản lý
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (alertSuccess) {
        alertSuccess.style.display = "none";
      }

      if (formGeneralError) {
        formGeneralError.style.display = "none";
      }

      const isNameValid = validateNameField();
      const isPhoneValid = validatePhoneField();

      if (!isNameValid || !isPhoneValid) return;

      const updatedUser = {
        ...currentUser,
        ho_ten: hoTenInput.value.trim(),
        so_dien_thoai: soDienThoaiInput.value.trim(),
        dia_chi: diaChiInput ? diaChiInput.value.trim() : "",
        anh_dai_dien: currentAvatarData
      };

      const isSuccess = Storage.updateItem(
        DATA_KEYS.USERS,
        "ma_nguoi_dung",
        updatedUser
      );

      if (isSuccess) {
        Storage.setCurrentUser(updatedUser);
        currentUser = updatedUser;

        if (alertSuccess) {
          showMessage(
            alertSuccess,
            "Cập nhật hồ sơ quản lý thành công!",
            "success"
          );

          setTimeout(() => {
            alertSuccess.style.display = "none";
          }, 3000);
        }
      } else {
        showMessage(
          formGeneralError,
          "Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại!",
          "error"
        );
      }
    });
  }
});
