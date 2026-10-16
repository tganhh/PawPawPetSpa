
/**
 * js/customer/booking.js
 * Nhiệm vụ G2: Xử lý luồng đặt lịch hoàn chỉnh
 */

(function (global) {
  "use strict";

  function getDK() {
    return (typeof DATA_KEYS !== "undefined")
      ? DATA_KEYS
      : (
          typeof CONSTANTS !== "undefined" && CONSTANTS.DATA_KEYS
            ? CONSTANTS.DATA_KEYS
            : {
                PETS: "thu_cung",
                SERVICES: "dich_vu",
                APPOINTMENTS: "lich_hen",
                APPOINTMENT_DETAILS: "chi_tiet_lich_hen"
              }
        );
  }

  // Biến trạng thái
  let currentUser = null;
  let userPets = [];
  let allServices = [];
  let existingAppointments = [];
  let nextPetIndex = 0;

  // DOM Elements
  let petContainer = null;
  let btnAddPet = null;
  let dateInput = null;
  let slotsContainer = null;
  let selectedSlotInput = null;
  let bookingForm = null;
  let noteInput = null;

  // Summary Elements
  let summaryPetCount = null;
  let summaryServiceCount = null;
  let summaryDuration = null;
  let summaryTotalPrice = null;
  let durationBadge = null;

  // Lấy các phần tử HTML
  function queryElements() {
    bookingForm =
      document.getElementById("booking-form") ||
      document.querySelector("form");

    petContainer =
      document.getElementById("pet-items-container") ||
      document.querySelector(".pet-items-container");

    btnAddPet =
      document.getElementById("btn-add-pet-row") ||
      document.getElementById("btn-add-pet");

    dateInput =
      document.getElementById("booking-date") ||
      document.querySelector('input[type="date"]');

    slotsContainer = document.getElementById("slots-container");
    selectedSlotInput = document.getElementById("selected-slot");

    noteInput =
      document.getElementById("booking-note") ||
      document.querySelector("textarea");

    summaryPetCount = document.getElementById("summary-pet-count");
    summaryServiceCount = document.getElementById("summary-service-count");
    summaryDuration = document.getElementById("summary-duration");
    summaryTotalPrice = document.getElementById("summary-total-price");
    durationBadge = document.getElementById("estimated-duration-badge");
  }

  // Chuẩn hóa loại thú cưng
  function getPetTypeString(loai) {
    if (
      loai === 2 ||
      loai === "2" ||
      loai === "cho" ||
      loai === "Chó"
    ) {
      return "Chó";
    }

    return "Mèo";
  }

  // Tải dữ liệu từ LocalStorage
  function loadDataSync() {
    if (typeof Storage !== "undefined") {
      currentUser = Storage.getCurrentUser();
    }

    const role =
      typeof VAI_TRO !== "undefined" && VAI_TRO.KHACH_HANG
        ? VAI_TRO.KHACH_HANG
        : "khach_hang";

    if (
      !currentUser &&
      typeof AuthGuard !== "undefined" &&
      AuthGuard.requireLogin
    ) {
      try {
        currentUser = AuthGuard.requireLogin(role);
      } catch (e) {
        // Giữ trang không bị dừng nếu AuthGuard chuyển hướng.
      }
    }

    const DK = getDK();

    const allPets =
      typeof Storage !== "undefined" && Storage.getData(DK.PETS)
        ? Storage.getData(DK.PETS)
        : [];

    if (currentUser && currentUser.ma_nguoi_dung) {
      userPets = allPets.filter(
        (pet) =>
          String(pet.ma_nguoi_dung) ===
          String(currentUser.ma_nguoi_dung)
      );

      // Không hiển thị thú cưng của người khác nếu tài khoản không có thú cưng.
    } else {
      userPets = [];
    }

    allServices =
      typeof Storage !== "undefined" && Storage.getData(DK.SERVICES)
        ? Storage.getData(DK.SERVICES)
        : [];

    existingAppointments =
      typeof Storage !== "undefined" && Storage.getData(DK.APPOINTMENTS)
        ? Storage.getData(DK.APPOINTMENTS)
        : [];
  }

  // Tạo một nhóm chọn thú cưng và dịch vụ
  function createPetRow() {
    if (!petContainer) return null;

    const rowIndex = nextPetIndex++;

    const petCard = document.createElement("div");
    petCard.className = "pet-item-card";
    petCard.dataset.index = rowIndex;

    let optionsHtml = `<option value="">-- Chọn thú cưng --</option>`;

    userPets.forEach((pet) => {
      const typeStr = getPetTypeString(pet.loai);

      optionsHtml += `
        <option value="${pet.ma_thu_cung}">
          ${pet.ten_thu_cung} (${typeStr} - ${pet.can_nang}kg)
        </option>
      `;
    });

    petCard.innerHTML = `
      <div class="booking-pet-header">
        <span class="booking-pet-title">Thú cưng thực hiện</span>

        <button
          type="button"
          class="btn btn-danger btn-sm btn-remove-pet"
        >
          Xóa
        </button>
      </div>

      <div class="form-group">
        <select class="pet-select" name="ma_thu_cung" required>
          ${optionsHtml}
        </select>

        <small class="error-message"></small>
      </div>

      <div class="pet-services-wrapper" style="display: none;">
        <div class="service-checkbox-grid"></div>
        <small class="error-message service-error"></small>
      </div>
    `;

    petContainer.appendChild(petCard);

    const petSelect = petCard.querySelector(".pet-select");

    // Xử lý khi thay đổi thú cưng
    petSelect.addEventListener("change", function () {
      const petId = this.value;

      if (!petId) {
        handlePetSelection(petCard, "");
        return;
      }

      const allSelects = petContainer.querySelectorAll(".pet-select");

      const isDuplicate = Array.from(allSelects).some(
        (otherSelect) =>
          otherSelect !== this && otherSelect.value === petId
      );

      if (isDuplicate) {
        this.value = "";

        handlePetSelection(petCard, "");

        if (
          typeof Common !== "undefined" &&
          typeof Common.showToast === "function"
        ) {
          Common.showToast(
            "Bé thú cưng này đã được chọn ở mục khác!",
            "error"
          );
        }

        return;
      }

      handlePetSelection(petCard, petId);
    });

    // FIX: Gắn đúng class nút Xóa
    const removeBtn = petCard.querySelector(".btn-remove-pet");

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        const cardCount =
          petContainer.querySelectorAll(".pet-item-card").length;

        // Không cho xóa nhóm cuối cùng
        if (cardCount <= 1) {
          if (
            typeof Common !== "undefined" &&
            typeof Common.showToast === "function"
          ) {
            Common.showToast(
              "Cần giữ lại ít nhất một nhóm thú cưng!",
              "error"
            );
          }

          return;
        }

        petCard.remove();

        updatePetSelectOptions();
        recalculate();
      });
    }

    updatePetSelectOptions();

    return petCard;
  }

  // Hiển thị dịch vụ phù hợp với thú cưng đã chọn
  function handlePetSelection(petCard, petId) {
    const wrapper = petCard.querySelector(".pet-services-wrapper");
    const grid = petCard.querySelector(".service-checkbox-grid");

    if (!wrapper || !grid) return;

    if (!petId) {
      wrapper.style.display = "none";
      grid.innerHTML = "";

      updatePetSelectOptions();
      recalculate();

      return;
    }

    const pet = userPets.find(
      (item) => String(item.ma_thu_cung) === String(petId)
    );

    const applicable = allServices.filter((service) => {
      if (!service.loai_ap_dung) return true;
      if (!pet) return true;

      const petType = getPetTypeString(pet.loai).toLowerCase();
      const serviceType = String(service.loai_ap_dung).toLowerCase();

      if (petType === "chó" || petType === "cho") {
        return serviceType === "cho" || serviceType === "2";
      }

      if (petType === "mèo" || petType === "meo") {
        return serviceType === "meo" || serviceType === "1";
      }

      return true;
    });

    let html = "";

    applicable.forEach((service) => {
      const price =
        typeof BookingRules !== "undefined" &&
        typeof BookingRules.calculateServicePrice === "function"
          ? BookingRules.calculateServicePrice(service, pet)
          : Number(
              service.gia_duoi_5kg ||
              service.gia_5_15kg ||
              service.gia_tren_15kg ||
              0
            );

      const priceStr =
        typeof Common !== "undefined" &&
        typeof Common.formatCurrency === "function"
          ? Common.formatCurrency(price)
          : `${price.toLocaleString("vi-VN")} ₫`;

      html += `
        <label class="service-checkbox-label">
          <input
            type="checkbox"
            class="service-checkbox"
            value="${service.ma_dich_vu}"
            data-price="${Number(price) || 0}"
            data-duration="${Number(service.thoi_gian_du_kien) || 30}"
          >

          <span>
            ${service.ten_dich_vu} (${priceStr})
          </span>
        </label>
      `;
    });

    grid.innerHTML = html;
    wrapper.style.display = "block";

    // Cập nhật tổng tiền và thời lượng khi chọn dịch vụ
    grid.querySelectorAll(".service-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", recalculate);
    });

    updatePetSelectOptions();
    recalculate();
  }

  // Không cho chọn trùng thú cưng giữa các nhóm
  function updatePetSelectOptions() {
    if (!petContainer) return;

    const selects = petContainer.querySelectorAll(".pet-select");

    const chosen = Array.from(selects)
      .map((select) => select.value)
      .filter(Boolean);

    selects.forEach((select) => {
      Array.from(select.options).forEach((option) => {
        if (!option.value) return;

        option.disabled =
          chosen.includes(option.value) &&
          option.value !== select.value;
      });
    });

    // Chỉ hiện nút Xóa khi có nhiều hơn một nhóm
    const removeBtns = petContainer.querySelectorAll(".btn-remove-pet");

    removeBtns.forEach((button) => {
      button.style.display =
        selects.length > 1 ? "inline-block" : "none";
    });
  }

  // Tính tổng số thú cưng, dịch vụ, thời lượng và chi phí
  function recalculate() {
    if (!petContainer) return;

    let pets = 0;
    let services = 0;
    let minutes = 0;
    let total = 0;

    const cards = petContainer.querySelectorAll(".pet-item-card");

    cards.forEach((card) => {
      const select = card.querySelector(".pet-select");
      const checkedServices = card.querySelectorAll(
        ".service-checkbox:checked"
      );

      if (select && select.value && checkedServices.length > 0) {
        pets++;

        checkedServices.forEach((checkbox) => {
          services++;
          total += Number(checkbox.dataset.price) || 0;
          minutes += Number(checkbox.dataset.duration) || 0;
        });
      }
    });

    const formatted =
      typeof Common !== "undefined" &&
      typeof Common.formatCurrency === "function"
        ? Common.formatCurrency(total)
        : `${total.toLocaleString("vi-VN")} ₫`;

    if (summaryPetCount) {
      summaryPetCount.textContent = `${pets} bé`;
    }

    if (summaryServiceCount) {
      summaryServiceCount.textContent = `${services} dịch vụ`;
    }

    if (summaryDuration) {
      summaryDuration.textContent = `${minutes} phút`;
    }

    if (summaryTotalPrice) {
      summaryTotalPrice.textContent = formatted;
    }

    if (durationBadge) {
      durationBadge.textContent = `Tổng thời gian: ${minutes} phút`;
    }

    if (dateInput && dateInput.value) {
      renderSlots(dateInput.value);
    }
  }

  // Hiển thị các khung giờ
  function renderSlots(dateStr) {
    if (!slotsContainer) return;

    slotsContainer.innerHTML = "";

    if (selectedSlotInput) {
      selectedSlotInput.value = "";
    }

    if (!dateStr) return;

    const allSlots =
      typeof CONSTANTS !== "undefined" && CONSTANTS.KHUNG_GIO
        ? CONSTANTS.KHUNG_GIO
        : [
            "08:30:00",
            "09:00:00",
            "09:30:00",
            "10:00:00",
            "10:30:00",
            "11:00:00",
            "13:30:00",
            "14:00:00",
            "15:00:00",
            "15:30:00",
            "16:00:00"
          ];

    allSlots.forEach((slot) => {
      const isAvailable =
        typeof BookingRules !== "undefined" &&
        typeof BookingRules.isNotPastDateTime === "function"
          ? BookingRules.isNotPastDateTime(dateStr, slot)
          : true;

      const pill = document.createElement("div");

      pill.className = `slot-pill ${!isAvailable ? "disabled" : ""}`;
      pill.textContent = slot.slice(0, 5);

      if (isAvailable) {
        pill.addEventListener("click", () => {
          slotsContainer.querySelectorAll(".slot-pill").forEach((item) => {
            item.classList.remove("active");
          });

          pill.classList.add("active");

          if (selectedSlotInput) {
            selectedSlotInput.value = slot;
          }

          const error = document.getElementById("slot-error-message");

          if (error) {
            error.style.display = "none";
            error.textContent = "";
          }
        });
      }

      slotsContainer.appendChild(pill);
    });
  }

  // Kiểm tra và lưu lịch hẹn
  function handleSubmit(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    let isValid = true;

    const petCards = petContainer
      ? petContainer.querySelectorAll(".pet-item-card")
      : [];

    const detailsToSave = [];

    petCards.forEach((card) => {
      const select = card.querySelector(".pet-select");
      const checkedServices = card.querySelectorAll(
        ".service-checkbox:checked"
      );

      if (
        typeof Validation !== "undefined" &&
        select
      ) {
        Validation.clearError(select);
      }

      if (!select || !select.value) {
        if (
          typeof Validation !== "undefined" &&
          select
        ) {
          Validation.showError(select, "Vui lòng chọn thú cưng");
        }

        isValid = false;
        return;
      }

      if (checkedServices.length === 0) {
        const serviceError = card.querySelector(".service-error");

        if (serviceError) {
          serviceError.textContent =
            "Vui lòng chọn ít nhất một dịch vụ cho thú cưng này.";

          serviceError.style.display = "block";
        }

        isValid = false;
        return;
      }

      const serviceError = card.querySelector(".service-error");

      if (serviceError) {
        serviceError.textContent = "";
        serviceError.style.display = "none";
      }

      checkedServices.forEach((checkbox) => {
        detailsToSave.push({
          ma_thu_cung: select.value,
          ma_dich_vu: checkbox.value,
          don_gia: Number(checkbox.dataset.price) || 0
        });
      });
    });

    // Phải có ít nhất một nhóm thú cưng
    if (petCards.length === 0) {
      isValid = false;

      if (
        typeof Common !== "undefined" &&
        typeof Common.showToast === "function"
      ) {
        Common.showToast(
          "Vui lòng thêm ít nhất một thú cưng!",
          "error"
        );
      }
    }

    // Kiểm tra ngày hẹn
    if (dateInput) {
      if (typeof Validation !== "undefined") {
        Validation.clearError(dateInput);
      }

      if (!dateInput.value) {
        if (typeof Validation !== "undefined") {
          Validation.showError(dateInput, "Vui lòng chọn ngày");
        }

        isValid = false;
      }
    }

    // Kiểm tra khung giờ
    const slotValue = selectedSlotInput
      ? selectedSlotInput.value
      : "";

    if (!slotValue) {
      const slotError = document.getElementById("slot-error-message");

      if (slotError) {
        slotError.textContent = "Vui lòng chọn giờ";
        slotError.style.display = "block";
      }

      isValid = false;
    }

    if (!isValid) {
      if (
        typeof Common !== "undefined" &&
        typeof Common.showToast === "function"
      ) {
        Common.showToast(
          "Vui lòng hoàn thiện các trường thông tin còn thiếu!",
          "error"
        );
      }

      return false;
    }

    const DK = getDK();

    if (typeof Storage === "undefined" || !Storage.addItem) {
      if (
        typeof Common !== "undefined" &&
        typeof Common.showToast === "function"
      ) {
        Common.showToast(
          "Không thể lưu lịch hẹn. Vui lòng tải lại trang!",
          "error"
        );
      }

      return false;
    }

    const newAppointmentId = Storage.generateId
      ? Storage.generateId("LH", DK.APPOINTMENTS, "ma_lich_hen")
      : `LH${String(Date.now()).slice(-6)}`;

    const totalMoney = detailsToSave.reduce(
      (sum, item) => sum + item.don_gia,
      0
    );

    const userId = currentUser
      ? currentUser.ma_nguoi_dung || currentUser.ma_khach_hang
      : null;

    if (!userId) {
      if (
        typeof Common !== "undefined" &&
        typeof Common.showToast === "function"
      ) {
        Common.showToast(
          "Không xác định được tài khoản đang đăng nhập!",
          "error"
        );
      }

      return false;
    }

    const noteValue = noteInput
      ? noteInput.value.trim()
      : "";

    const statusValue =
      typeof TRANG_THAI_LICH_HEN !== "undefined"
        ? TRANG_THAI_LICH_HEN.CHO_XAC_NHAN
        : (
            typeof CONSTANTS !== "undefined" &&
            CONSTANTS.TRANG_THAI_LICH_HEN
              ? CONSTANTS.TRANG_THAI_LICH_HEN.CHO_XAC_NHAN
              : "cho_xac_nhan"
          );

    const appointment = {
      ma_lich_hen: newAppointmentId,
      ma_nguoi_dung: userId,
      ngay_hen: dateInput ? dateInput.value : "",
      gio_hen: slotValue,
      tong_tien: totalMoney,
      ghi_chu: noteValue || null,
      trang_thai: statusValue,
      thoi_gian_tao: new Date().toISOString()
    };

    // Lưu lịch hẹn
    Storage.addItem(DK.APPOINTMENTS, appointment);

    // Lưu chi tiết từng dịch vụ
    detailsToSave.forEach((detail) => {
      const newDetailId = Storage.generateId
        ? Storage.generateId("CT", DK.APPOINTMENT_DETAILS, "ma_chi_tiet")
        : `CT${String(Date.now()).slice(-6)}`;

      const detailRecord = {
        ma_chi_tiet: newDetailId,
        ma_lich_hen: newAppointmentId,
        ma_thu_cung: detail.ma_thu_cung,
        ma_dich_vu: detail.ma_dich_vu,
        don_gia: detail.don_gia
      };

      Storage.addItem(DK.APPOINTMENT_DETAILS, detailRecord);
    });

    if (
      typeof Common !== "undefined" &&
      typeof Common.showToast === "function"
    ) {
      Common.showToast(
        "Đặt lịch chăm sóc thành công!",
        "success"
      );
    }

    return true;
  }

  // Khởi tạo trang
  function init() {
    queryElements();

    if (!petContainer) return;

    loadDataSync();

    if (!petContainer.querySelector(".pet-item-card")) {
      createPetRow();
    }

    if (btnAddPet) {
      btnAddPet.onclick = function () {
        createPetRow();
      };
    }

    if (dateInput) {
      dateInput.onchange = function () {
        recalculate();
      };
    }

    if (bookingForm) {
      bookingForm.onsubmit = handleSubmit;
    }

    updatePetSelectOptions();
    recalculate();
  }

  // Tránh khởi tạo lặp lại
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  global.BookingModule = {
    init,
    createPetRow,
    recalculate,
    handleSubmit
  };

})(typeof window !== "undefined" ? window : this);
