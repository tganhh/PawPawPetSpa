document.addEventListener("DOMContentLoaded", () => {
  // 1. Kiểm tra xác thực (chỉ cho phép khách hàng truy cập)
  let currentUser = AuthGuard.requireLogin(VAI_TRO.KHACH_HANG);
  if (!currentUser) return;

  if (typeof currentUser === "string") {
    currentUser = Storage.getItemById(DATA_KEYS.USERS, "ma_nguoi_dung", currentUser);
  }

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

  // Biến lưu trữ dữ liệu ảnh đại diện
  let currentAvatarData = (currentUser && currentUser.anh_dai_dien) ? currentUser.anh_dai_dien : "";

  // 3. Đổ thông tin người dùng lên form
  function renderUserData() {
    if (!currentUser) return;

    if (maNguoiDungInput) maNguoiDungInput.value = currentUser.ma_nguoi_dung || "";
    if (emailInput) emailInput.value = currentUser.email || "";
    if (hoTenInput) hoTenInput.value = currentUser.ho_ten || "";
    if (soDienThoaiInput) soDienThoaiInput.value = currentUser.so_dien_thoai || "";
    if (diaChiInput) diaChiInput.value = currentUser.dia_chi || "";

    updateAvatarDisplay(currentAvatarData, currentUser.ho_ten);
  }

  function updateAvatarDisplay(src, name) {
    if (!avatarPreview) return;
    if (src && src.trim()) {
      avatarPreview.src = src;
    } else {
      avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
      )}&background=99B4DA&color=fff`;
    }
  }

  renderUserData();

  // 4. Xử lý nút Quay lại duy nhất
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "about.html";
      }
    });
  }

  // 5. Bấm vào avatar để chọn file ảnh từ máy
  if (avatarWrapper && avatarFileInput) {
    avatarWrapper.addEventListener("click", () => {
      avatarFileInput.click();
    });

    avatarFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước ảnh đại diện không được vượt quá 2MB!");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        currentAvatarData = event.target.result;
        if (avatarPreview) avatarPreview.src = currentAvatarData;
      };
      reader.readAsDataURL(file);
    });
  }

  // 6. Validate trường Họ và tên
  function validateNameField() {
    if (!hoTenInput) return false;
    return Validation.validateField(hoTenInput, (val) =>
      Validation.validateRequired(val, "Họ và tên")
    );
  }

  // 7. Validate trường Số điện thoại & Check trùng lặp
  function validatePhoneField() {
    if (!soDienThoaiInput) return false;
    const phoneVal = soDienThoaiInput.value.trim();

    const errorMsg = Validation.validatePhone(phoneVal);
    if (errorMsg) {
      Validation.showError(soDienThoaiInput, errorMsg);
      return false;
    }

    const users = Storage.getData(DATA_KEYS.USERS) || [];
    const currentId = String(currentUser ? currentUser.ma_nguoi_dung : "");

    const isExisted = users.some((u) => {
      const isSamePhone = String(u.so_dien_thoai || "").trim() === phoneVal;
      const isOtherUser = String(u.ma_nguoi_dung || "").trim() !== currentId;
      return isSamePhone && isOtherUser;
    });

    if (isExisted) {
      Validation.showError(soDienThoaiInput, "Số điện thoại này đã được sử dụng bởi tài khoản khác");
      return false;
    }

    Validation.clearError(soDienThoaiInput);
    return true;
  }

  if (hoTenInput) {
    hoTenInput.addEventListener("blur", validateNameField);
    hoTenInput.addEventListener("input", () => Validation.clearError(hoTenInput));
  }

  if (soDienThoaiInput) {
    soDienThoaiInput.addEventListener("blur", validatePhoneField);
    soDienThoaiInput.addEventListener("input", () => validatePhoneField());
  }

  // 8. Submit form lưu thông tin
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (alertSuccess) alertSuccess.style.display = "none";
      if (formGeneralError) formGeneralError.style.display = "none";

      const isNameValid = validateNameField();
      const isPhoneValid = validatePhoneField();

      if (!isNameValid || !isPhoneValid) {
        return;
      }

      const updatedUser = {
        ...currentUser,
        ho_ten: hoTenInput.value.trim(),
        so_dien_thoai: soDienThoaiInput.value.trim(),
        dia_chi: diaChiInput ? diaChiInput.value.trim() : "",
        anh_dai_dien: currentAvatarData
      };

      const isSuccess = Storage.updateItem(DATA_KEYS.USERS, "ma_nguoi_dung", updatedUser);

      if (isSuccess) {
        Storage.setCurrentUser(updatedUser);
        currentUser = updatedUser;

        if (alertSuccess) {
          alertSuccess.style.display = "block";
          setTimeout(() => {
            alertSuccess.style.display = "none";
          }, 3000);
        }
      } else {
        if (formGeneralError) {
          formGeneralError.textContent = "Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại!";
          formGeneralError.style.display = "block";
        }
      }
    });
  }
});