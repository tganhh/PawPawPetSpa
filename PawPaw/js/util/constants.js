const VAI_TRO = Object.freeze({
  KHACH_HANG: "khách hàng",
  QUAN_LY: "quản lý" 
});

const LOAI_THU_CUNG = Object.freeze({
  MEO: 1, 
  CHO: 2 
});

const GIOI_TINH = Object.freeze({
  CAI: 1,
  DUC: 2 
});

const TRANG_THAI_LICH_HEN = Object.freeze({
  CHO_XAC_NHAN: "cho_xac_nhan",
  DA_XAC_NHAN: "da_xac_nhan",
  HOAN_THANH: "hoan_thanh",
  DA_HUY: "da_huy"
});

const HIEN_THI = Object.freeze({
  HIEN_THI: "hien_thi",
  AN: "an"
});

const KHUNG_GIO = Object.freeze([
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
]);

const DATA_KEYS = Object.freeze({
  USERS: "petcare_users",
  PETS: "petcare_pets",
  SERVICES: "petcare_services",
  APPOINTMENTS: "petcare_appointments",
  APPOINTMENT_DETAILS: "petcare_appointment_details",
  REVIEWS: "petcare_reviews",
  CURRENT_USER: "petcare_current_user",
  DATA_VERSION: "petcare_data_version"
});

// Phiên bản bộ dữ liệu mẫu (data/*.json).
// MỖI LẦN sửa/đổi file .json, hãy tăng giá trị này để trình duyệt tự nạp lại dữ liệu mới
// (nếu không, localStorage vẫn giữ dữ liệu cũ và giao diện sẽ không thay đổi).
const DATA_VERSION = "2026.10.15-mock-6thang";

const CONSTANTS = Object.freeze({
  VAI_TRO,
  LOAI_THU_CUNG,
  GIOI_TINH,
  TRANG_THAI_LICH_HEN,
  HIEN_THI,
  KHUNG_GIO,
  DATA_KEYS,
  DATA_VERSION
});

if (typeof window !== "undefined") {
  window.CONSTANTS = CONSTANTS;
  window.VAI_TRO = VAI_TRO;
  window.LOAI_THU_CUNG = LOAI_THU_CUNG;
  window.GIOI_TINH = GIOI_TINH;
  window.TRANG_THAI_LICH_HEN = TRANG_THAI_LICH_HEN;
  window.HIEN_THI = HIEN_THI;
  window.KHUNG_GIO = KHUNG_GIO;
  window.DATA_KEYS = DATA_KEYS;
  window.DATA_VERSION = DATA_VERSION;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONSTANTS;
}