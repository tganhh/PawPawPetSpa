/**
 * js/util/booking-rules.js
 * Business Logic Module: Quản lý tính giá, kiểm tra khung giờ và điều kiện đặt lịch
 * Tuân thủ ERD, hằng số (constants.js), đặc tả Mục 3 (Giá theo cân nặng & loài) và quy tắc B1 (Slot & Huỷ lịch).
 */

(function (global) {
  'use strict';

  // Lấy CONSTANTS an toàn từ window (trình duyệt) hoặc require (Node.js test)
  var CONSTANTS = (typeof window !== 'undefined' && window.CONSTANTS)
    ? window.CONSTANTS
    : (typeof global !== 'undefined' && global.CONSTANTS ? global.CONSTANTS : null);

  if (!CONSTANTS && typeof require !== 'undefined') {
    try {
      CONSTANTS = require('./constants.js');
    } catch (e) {
      CONSTANTS = null;
    }
  }

  // Khung giờ mặc định từ constants.js
  const DEFAULT_KHUNG_GIO = (CONSTANTS && CONSTANTS.KHUNG_GIO) || [
    "08:30:00", "09:00:00", "09:30:00", "10:00:00", "10:30:00",
    "11:00:00", "13:30:00", "14:00:00", "15:00:00", "15:30:00", "16:00:00"
  ];

  const STATUS_DA_HUY = (CONSTANTS && CONSTANTS.TRANG_THAI_LICH_HEN && CONSTANTS.TRANG_THAI_LICH_HEN.DA_HUY) || "da_huy";

  /**
   * Chuẩn hóa chuỗi thời gian về dạng chuẩn "HH:mm:ss"
   * @param {string} timeStr - "09:00" hoặc "09:00:00"
   * @returns {string} "09:00:00"
   */
  function normalizeTime(timeStr) {
    if (!timeStr) return '';
    const parts = String(timeStr).trim().split(':');
    if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    return timeStr;
  }

  /**
   * 1 & 2. Nghiệp vụ A1 + Mục 3 Đặc tả:
   * Tính giá dịch vụ dựa trên Cân nặng & Loài (Chó/Mèo).
   * Không tự động tính phụ phí đối với giống, tình trạng lông hay kiểu cắt.
   * 
   * Quy tắc mốc cân nặng theo Mục 3:
   * - Dưới 5kg: (< 5kg)
   * - Từ 5-15kg: (>= 5kg và <= 15kg)
   * - Trên 15kg: (> 15kg)
   * 
   * @param {Object} service - Bản ghi bảng dich_vu (chứa gia_duoi_5kg, gia_5_15kg, gia_tren_15kg)
   * @param {number|Object} petOrWeight - Cân nặng (kg) hoặc object thu_cung (chứa can_nang, loai)
   * @returns {number} Đơn giá áp dụng (VND)
   */
  function calculateServicePrice(service, petOrWeight) {
    if (!service) return 0;

    let weight = 0;
    let petType = null;

    if (typeof petOrWeight === 'object' && petOrWeight !== null) {
      weight = Number(petOrWeight.can_nang) || 0;
      petType = petOrWeight.loai;
    } else {
      weight = Number(petOrWeight) || 0;
    }

    // Nếu dịch vụ có thuộc tính chỉ định loài (1: Mèo, 2: Chó)
    if (service.loai_ap_dung && petType && service.loai_ap_dung !== petType) {
      return 0;
    }

    // Xác định mức giá theo chuẩn Mục 3
    if (weight < 5) {
      return Number(service.gia_duoi_5kg) || 0;
    } else if (weight <= 15) {
      return Number(service.gia_5_15kg) || 0;
    } else {
      return Number(service.gia_tren_15kg) || 0;
    }
  }

  /**
   * 3. Nghiệp vụ A1: Tính tổng tiền lịch hẹn = tổng đơn giá các chi tiết
   * Khớp cấu trúc quan hệ 1-N giữa lich_hen và chi_tiet_lich_hen.
   * 
   * @param {Array<Object>} items - Danh sách chi tiết hoặc dịch vụ:
   *   - Nếu phần tử đã có trường `don_gia`: tính sum(don_gia)
   *   - Nếu phần tử là dịch vụ: tính qua calculateServicePrice(service, petOrWeight)
   * @param {number|Object} [petOrWeight] - Cân nặng hoặc thú cưng
   * @returns {number} Tổng tiền (VND)
   */
  function calculateTotalPrice(items, petOrWeight) {
    if (!Array.isArray(items) || items.length === 0) return 0;

    return items.reduce((total, item) => {
      if (!item) return total;
      if (typeof item.don_gia !== 'undefined') {
        return total + (Number(item.don_gia) || 0);
      }
      return total + calculateServicePrice(item, petOrWeight);
    }, 0);
  }

  /**
   * Kiểm tra ngày và giờ có nằm trong quá khứ so với thời điểm hiện tại hay không.
   * 
   * @param {string} dateStr - YYYY-MM-DD
   * @param {string} [timeStr] - HH:mm hoặc HH:mm:ss
   * @param {Date} [nowInstance] - Mock date dùng cho Unit Test
   * @returns {boolean} true nếu từ hiện tại đến tương lai, false nếu ở quá khứ
   */
  function isNotPastDateTime(dateStr, timeStr, nowInstance) {
    if (!dateStr) return false;
    const now = nowInstance instanceof Date ? nowInstance : new Date();

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return false;

    if (timeStr) {
      const formattedTime = normalizeTime(timeStr);
      const [h, m, s] = formattedTime.split(':').map(Number);
      const targetDateTime = new Date(dateStr);
      targetDateTime.setHours(h || 0, m || 0, s || 0, 0);
      return targetDateTime >= now;
    }

    // Nếu chỉ có ngày: cuối ngày phải lớn hơn hoặc bằng thời điểm hiện tại
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay >= now;
  }

  /**
   * 4 & 5. Nghiệp vụ B1: Kiểm tra một khung giờ có còn trống chỗ hay không
   * - Tìm tất cả các lịch hẹn cùng ngày (ngay_hen) và cùng giờ (gio_hen).
   * - Bỏ qua các lịch hẹn có trạng thái là "da_huy".
   * - Mặc định mỗi khung giờ nhận 1 lịch hẹn (maxCapacity = 1).
   * 
   * @param {string} dateStr - Ngày cần kiểm tra (YYYY-MM-DD)
   * @param {string} timeStr - Giờ cần kiểm tra (HH:mm hoặc HH:mm:ss)
   * @param {Array<Object>} existingAppointments - Danh sách lịch hẹn đã có (mảng lich_hen)
   * @param {number} [maxCapacity=1] - Số lượng lịch hẹn tối đa được phục vụ cùng 1 slot
   * @returns {boolean} true nếu còn trống, false nếu đã kín lịch
   */
  function isTimeSlotAvailable(dateStr, timeStr, existingAppointments, maxCapacity = 1) {
    if (!dateStr || !timeStr) return false;
    if (!Array.isArray(existingAppointments) || existingAppointments.length === 0) return true;

    const checkTime = normalizeTime(timeStr);

    // Lọc các cuộc hẹn bị trùng lịch và chưa bị hủy
    const activeConflicts = existingAppointments.filter((apt) => {
      if (!apt) return false;
      const aptDate = apt.ngay_hen;
      const aptTime = normalizeTime(apt.gio_hen);
      const isCancelled = (apt.trang_thai === STATUS_DA_HUY);

      return (aptDate === dateStr) && (aptTime === checkTime) && !isCancelled;
    });

    return activeConflicts.length < maxCapacity;
  }

  /**
   * Nghiệp vụ B1: Lấy danh sách tất cả các khung giờ còn trống trong ngày
   * - Lọc từ danh sách KHUNG_GIO chuẩn.
   * - Loại bỏ các khung giờ trong quá khứ nếu là ngày hiện tại.
   * - Loại bỏ khung giờ đã kín chỗ (không tính da_huy).
   * 
   * @param {string} dateStr - Ngày kiểm tra (YYYY-MM-DD)
   * @param {Array<Object>} existingAppointments - Danh sách lịch hẹn (lich_hen)
   * @param {Array<string>} [allSlots] - Mảng khung giờ áp dụng (mặc định lấy DEFAULT_KHUNG_GIO)
   * @param {Date} [nowInstance] - Mock date
   * @returns {Array<string>} Mảng các khung giờ còn đặt được
   */
  function getAvailableTimeSlots(dateStr, existingAppointments, allSlots = DEFAULT_KHUNG_GIO, nowInstance) {
    if (!dateStr) return [];

    return allSlots.filter((slot) => {
      // 1. Không nằm trong quá khứ
      const isNotPast = isNotPastDateTime(dateStr, slot, nowInstance);
      if (!isNotPast) return false;

      // 2. Slot còn chỗ trống
      return isTimeSlotAvailable(dateStr, slot, existingAppointments);
    });
  }

  /**
   * 6. Nghiệp vụ BPMN 3.4.2 & Mục 4/Mục 5: Kiểm tra điều kiện hợp lệ khi bấm Xác nhận đặt lịch
   * 
   * @param {Object} bookingInput 
   *   - ma_thu_cung / pet: thú cưng được chọn
   *   - services / danh_sach_dich_vu: mảng các dịch vụ
   *   - ngay_hen: ngày thực hiện (YYYY-MM-DD)
   *   - gio_hen: khung giờ thực hiện
   * @param {Array<Object>} existingAppointments - Danh sách lịch hẹn hiện có
   * @param {Date} [nowInstance] - Mock date
   * @returns {{ isValid: boolean, message: string }}
   */
  function validateBooking(bookingInput, existingAppointments, nowInstance) {
    if (!bookingInput) {
      return { isValid: false, message: 'Dữ liệu đặt lịch không được để trống.' };
    }

    const { ma_thu_cung, pet, services, danh_sach_dich_vu, ngay_hen, gio_hen } = bookingInput;

    if (!ma_thu_cung && !pet) {
      return { isValid: false, message: 'Vui lòng chọn thú cưng thực hiện dịch vụ.' };
    }

    const selectedServices = services || danh_sach_dich_vu;
    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      return { isValid: false, message: 'Vui lòng chọn ít nhất một dịch vụ chăm sóc.' };
    }

    if (!ngay_hen || !gio_hen) {
      return { isValid: false, message: 'Vui lòng chọn ngày và khung giờ hẹn.' };
    }

    // Không được chọn ngày/giờ đã qua
    if (!isNotPastDateTime(ngay_hen, gio_hen, nowInstance)) {
      return { isValid: false, message: 'Không thể đặt lịch vào ngày hoặc khung giờ đã trôi qua.' };
    }

    // Khung giờ phải còn trống
    if (!isTimeSlotAvailable(ngay_hen, gio_hen, existingAppointments)) {
      return { isValid: false, message: 'Khung giờ này đã có người đặt trước. Vui lòng chọn khung giờ khác.' };
    }

    return { isValid: true, message: 'Thông tin đặt lịch hợp lệ.' };
  }

  /**
   * Nghiệp vụ Mục 5: Điều kiện hủy và thay đổi lịch
   * Quy định: Chỉ được hủy hoặc đổi lịch khi thời gian còn lại đến ca hẹn > 24 giờ.
   * 
   * @param {Object|string} appointmentOrDate - Bản ghi lịch hẹn (hoặc chuỗi YYYY-MM-DD)
   * @param {string} [timeStr] - Giờ hẹn (nếu tham số đầu là chuỗi ngày)
   * @param {Date} [nowInstance] - Mock date
   * @returns {{ canCancel: boolean, message: string }}
   */
  function canCancelOrChangeBooking(appointmentOrDate, timeStr, nowInstance) {
    let dateVal = '';
    let timeVal = '';

    if (typeof appointmentOrDate === 'object' && appointmentOrDate !== null) {
      dateVal = appointmentOrDate.ngay_hen;
      timeVal = appointmentOrDate.gio_hen;
    } else {
      dateVal = appointmentOrDate;
      timeVal = timeStr;
    }

    if (!dateVal || !timeVal) {
      return { canCancel: false, message: 'Thông tin lịch hẹn không hợp lệ.' };
    }

    const formattedTime = normalizeTime(timeVal);
    const [h, m, s] = formattedTime.split(':').map(Number);
    const appointmentDateTime = new Date(dateVal);
    appointmentDateTime.setHours(h || 0, m || 0, s || 0, 0);

    const now = nowInstance instanceof Date ? nowInstance : new Date();
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Điều kiện Mục 5: Còn trên 24 giờ
    if (diffHours > 24) {
      return { canCancel: true, message: 'Có thể hủy hoặc đổi lịch.' };
    } else if (diffHours <= 0) {
      return { canCancel: false, message: 'Lịch hẹn này đã diễn ra hoặc đang diễn ra.' };
    } else {
      return { canCancel: false, message: 'Chỉ được hủy hoặc thay đổi lịch khi còn trên 24 giờ tới ca hẹn.' };
    }
  }

  const BookingRules = {
    // 4 hàm nghiệp vụ theo yêu cầu
    calculateServicePrice,
    isTimeSlotAvailable,
    validateBooking,
    getAvailableTimeSlots,

    // Các hàm bổ trợ theo đặc tả hệ thống
    calculateTotalPrice,
    canCancelOrChangeBooking,
    isNotPastDateTime,
    normalizeTime,

    // Aliases tiếng Việt
    tinhGia: calculateServicePrice,
    tinhTongTien: calculateTotalPrice,
    kiemTraGioTrong: isTimeSlotAvailable,
    layGioTrong: getAvailableTimeSlots
  };

  // Đăng ký toàn cục an toàn
  if (typeof window !== 'undefined') {
    window.BookingRules = BookingRules;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookingRules;
  }
})(typeof window !== 'undefined' ? window : this);