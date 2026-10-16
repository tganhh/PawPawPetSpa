/**
 * js/customer/my-booking.js
 * Đã fix đồng bộ class badge và tự động chuyển đổi trạng thái cũ
 */

(function (global) {
  "use strict";

  function getST() {
    return {
      SAP_DIEN_RA: "sap_dien_ra",
      DANG_DIEN_RA: "dang_dien_ra",
      DA_HOAN_THANH: "da_hoan_thanh",
      DA_HUY: "da_huy"
    };
  }

  function getDK() {
    return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : {
      APPOINTMENTS: "lich_hen",
      APPOINTMENT_DETAILS: "chi_tiet_lich_hen",
      REVIEWS: "danh_gia",
      PETS: "thu_cung",
      SERVICES: "dich_vu"
    };
  }

  var currentUser = null;
  var listEl = null;
  var filterEl = null;
  var countEl = null;

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function money(n) {
    return (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(n) : (n + " ₫");
  }

  function fmtDate(d) {
    return (typeof Common !== "undefined" && Common.formatDate) ? Common.formatDate(d) : d;
  }

  function fmtTime(t) {
    return t ? String(t).slice(0, 5) : "";
  }

  function stars(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function toast(msg, type) {
    if (typeof Common !== "undefined" && Common.showToast) Common.showToast(msg, type);
    else alert(msg);
  }

  function getList(key) {
    return (typeof Storage !== "undefined" && Storage.getData(key)) || [];
  }

  // Tự động map trạng thái cũ sang trạng thái mới chuẩn
  function normalizeStatus(st) {
    if (!st) return getST().SAP_DIEN_RA;
    const lower = String(st).toLowerCase();
    if (lower === "cho_xac_nhan" || lower === "da_xac_nhan" || lower === "sap_dien_ra") return getST().SAP_DIEN_RA;
    if (lower === "dang_dien_ra") return getST().DANG_DIEN_RA;
    if (lower === "hoan_thanh" || lower === "da_hoan_thanh") return getST().DA_HOAN_THANH;
    if (lower === "da_huy") return getST().DA_HUY;
    return st;
  }

  function getStatusLabel(status) {
    var ST = getST();
    switch (normalizeStatus(status)) {
      case ST.SAP_DIEN_RA: return "Sắp diễn ra";
      case ST.DANG_DIEN_RA: return "Đang diễn ra";
      case ST.DA_HOAN_THANH: return "Đã hoàn thành";
      case ST.DA_HUY: return "Đã huỷ";
      default: return status;
    }
  }

  function getMyAppointments() {
    if (!currentUser) return [];
    var uid = currentUser.ma_nguoi_dung || currentUser.ma_khach_hang || currentUser.id;
    if (!uid) return [];

    var DK = getDK();
    var all = getList(DK.APPOINTMENTS);
    var mine = all.filter(function (a) {
      return String(a.ma_nguoi_dung) === String(uid);
    });

    mine.sort(function (a, b) {
      var ka = (a.ngay_hen || "") + "T" + (a.gio_hen || "");
      var kb = (b.ngay_hen || "") + "T" + (b.gio_hen || "");
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
    return mine;
  }

  function getAppointmentById(id) {
    var DK = getDK();
    return getList(DK.APPOINTMENTS).find(function (a) {
      return String(a.ma_lich_hen) === String(id);
    }) || null;
  }

  function getReview(maLichHen) {
    if (typeof ReviewModule !== "undefined" && ReviewModule.getReviewByAppointment) {
      return ReviewModule.getReviewByAppointment(maLichHen);
    }
    var DK = getDK();
    return getList(DK.REVIEWS).find(function (r) {
      return String(r.ma_lich_hen) === String(maLichHen);
    }) || null;
  }

  function checkCancel(appt) {
    if (typeof BookingRules !== "undefined" && BookingRules.canCancelOrChangeBooking) {
      var res = BookingRules.canCancelOrChangeBooking(appt);
      if (typeof res === "boolean") return { canCancel: res, message: "" };
      return res || { canCancel: false, message: "" };
    }
    return { canCancel: true, message: "" };
  }

  function buildActions(appt) {
    var ST = getST();
    var html = '<button type="button" class="btn btn-secondary btn-sm" data-action="detail" data-id="' + esc(appt.ma_lich_hen) + '">Xem chi tiết</button> ';
    var status = normalizeStatus(appt.trang_thai);

    if (status === ST.SAP_DIEN_RA) {
      var rule = checkCancel(appt);
      if (rule.canCancel) {
        html += '<button type="button" class="btn btn-danger btn-sm" data-action="cancel" data-id="' + esc(appt.ma_lich_hen) + '">Hủy lịch</button>';
      } else {
        html += '<button type="button" class="btn btn-danger btn-sm" disabled>Hủy lịch</button>' +
          '<span class="mybk-action-note" style="display:block; margin-top:4px;">Dưới 24h vui lòng liên hệ hotline để hỗ trợ</span>';
      }
    } else if (status === ST.DA_HOAN_THANH) {
      var review = getReview(appt.ma_lich_hen);
      if (review) {
        html += '<span class="mybk-reviewed-tag">Đã đánh giá <span class="stars-text">' + stars(review.so_sao) + '</span></span>';
      } else {
        html += '<button type="button" class="btn btn-primary btn-sm" data-action="review" data-id="' + esc(appt.ma_lich_hen) + '">Đánh giá dịch vụ</button>';
      }
    }

    return html;
  }

  function buildCard(appt) {
    var DK = getDK();
    var st = normalizeStatus(appt.trang_thai);
    var label = getStatusLabel(st);
    
    var details = getList(DK.APPOINTMENT_DETAILS).filter(function (d) {
      return String(d.ma_lich_hen) === String(appt.ma_lich_hen);
    });
    var petCount = {};
    details.forEach(function (d) { petCount[d.ma_thu_cung] = true; });

    // Dùng class "badge badge-xxx" thay cho "status-badge status-xxx"
    return '' +
      '<div class="mybk-item">' +
        '<div class="mybk-item-top">' +
          '<div>' +
            '<div class="mybk-code">Mã: <strong>' + esc(appt.ma_lich_hen) + '</strong></div>' +
            '<div class="mybk-datetime">' + esc(fmtDate(appt.ngay_hen)) + ' - ' + esc(fmtTime(appt.gio_hen)) + '</div>' +
          '</div>' +
          '<span class="badge badge-' + esc(st) + '">' + esc(label) + '</span>' +
        '</div>' +
        '<div class="mybk-body">' +
          '<div><span class="mybk-label">Số thú cưng: </span>' + Object.keys(petCount).length + '</div>' +
          '<div><span class="mybk-label">Số dịch vụ: </span>' + details.length + '</div>' +
          '<div><span class="mybk-label">Tổng tiền: </span><span class="mybk-total">' + esc(money(appt.tong_tien)) + '</span></div>' +
        '</div>' +
        '<div class="mybk-actions">' + buildActions(appt) + '</div>' +
      '</div>';
  }

  function render() {
    if (!listEl) return;
    if (!currentUser) {
      listEl.innerHTML = '<div class="empty-state">Vui lòng đăng nhập để xem danh sách lịch đã đặt.</div>';
      if (countEl) countEl.textContent = "";
      return;
    }

    var all = getMyAppointments();
    var filter = filterEl ? filterEl.value : "all";
    var shown = filter === "all" ? all : all.filter(function (a) { 
        return normalizeStatus(a.trang_thai) === filter; 
    });

    if (countEl) countEl.textContent = "Hiển thị " + shown.length + " / " + all.length + " lịch hẹn";

    if (shown.length === 0) {
      listEl.innerHTML = '<div class="empty-state">' + (all.length === 0 ? "Bạn chưa có lịch hẹn nào." : "Không có lịch hẹn nào ở trạng thái này.") + '</div>';
      return;
    }
    listEl.innerHTML = shown.map(buildCard).join("");
  }

  function showDetail(id) {
    var appt = getAppointmentById(id);
    var body = document.getElementById("detail-body");
    var modalEl = document.getElementById("detail-modal");
    if (!appt || !body) return;

    var ST = getST();
    var DK = getDK();
    var details = getList(DK.APPOINTMENT_DETAILS).filter(function (d) {
      return String(d.ma_lich_hen) === String(appt.ma_lich_hen);
    });
    var pets = getList(DK.PETS);
    var services = getList(DK.SERVICES);
    var st = normalizeStatus(appt.trang_thai);

    var groups = {};
    var order = [];
    details.forEach(function (d) {
      if (!groups[d.ma_thu_cung]) {
        groups[d.ma_thu_cung] = [];
        order.push(d.ma_thu_cung);
      }
      groups[d.ma_thu_cung].push(d);
    });

    var petsHtml = order.map(function (petId) {
      var pet = pets.find(function (p) { return String(p.ma_thu_cung) === String(petId); });
      var petName = pet ? pet.ten_thu_cung : petId;
      var rows = groups[petId].map(function (d) {
        var srv = services.find(function (s) { return String(s.ma_dich_vu) === String(d.ma_dich_vu); });
        return '<div class="mybk-detail-row"><span>' + esc(srv ? srv.ten_dich_vu : d.ma_dich_vu) + '</span><span>' + esc(money(d.don_gia)) + '</span></div>';
      }).join("");
      return '<div class="mybk-detail-pet"><div class="mybk-detail-pet-name"> Bé: <strong>' + esc(petName) + '</strong></div>' + rows + '</div>';
    }).join("");

    if (!petsHtml) petsHtml = '<div class="helper-text mybk-detail-empty-text">Không tìm thấy chi tiết dịch vụ của lịch hẹn này.</div>';

    var review = (st === ST.DA_HOAN_THANH) ? getReview(appt.ma_lich_hen) : null;
    var reviewHtml = review
      ? '<div class="mybk-detail-pet"><div class="mybk-detail-pet-name">Đánh giá của bạn: <span class="stars-text">' + esc(stars(review.so_sao)) + '</span></div><div class="mybk-detail-review-content" style="margin-top:4px;">' + esc(review.noi_dung_danh_gia) + '</div></div>'
      : "";

    body.innerHTML = '' +
      '<div class="mybk-detail-row"><span class="mybk-label">Mã lịch hẹn</span><span>' + esc(appt.ma_lich_hen) + '</span></div>' +
      '<div class="mybk-detail-row"><span class="mybk-label">Trạng thái</span><span class="badge badge-' + esc(st) + '">' + esc(getStatusLabel(st)) + '</span></div>' +
      '<div class="mybk-detail-row"><span class="mybk-label">Ngày hẹn</span><span>' + esc(fmtDate(appt.ngay_hen)) + '</span></div>' +
      '<div class="mybk-detail-row"><span class="mybk-label">Giờ hẹn</span><span>' + esc(fmtTime(appt.gio_hen)) + '</span></div>' +
      '<div class="mybk-detail-row"><span class="mybk-label">Ghi chú</span><span>' + esc(appt.ghi_chu || "Không có") + '</span></div>' +
      petsHtml +
      '<div class="mybk-detail-row mybk-detail-total"><span>Tổng tiền</span><span>' + esc(money(appt.tong_tien)) + '</span></div>' + reviewHtml;

    if (modalEl) modalEl.removeAttribute("hidden");
    if (typeof Common !== "undefined" && Common.openModal) Common.openModal("detail-modal");
  }

  function cancelBooking(id) {
    var appt = getAppointmentById(id);
    if (!appt) return;

    var ST = getST();
    var DK = getDK();

    if (normalizeStatus(appt.trang_thai) !== ST.SAP_DIEN_RA) {
      toast("Lịch hẹn ở trạng thái này không thể hủy.", "error");
      render();
      return;
    }

    var rule = checkCancel(appt);
    if (!rule.canCancel) {
      toast("Dưới 24h vui lòng liên hệ hotline để hỗ trợ.", "error");
      render();
      return;
    }

    if (!global.confirm("Bạn chắc chắn muốn hủy lịch " + appt.ma_lich_hen + "?")) return;

    var updatedAppt = Object.assign({}, appt, { trang_thai: ST.DA_HUY });
    
    if (typeof Storage.updateItem === "function") {
        Storage.updateItem(DK.APPOINTMENTS, "ma_lich_hen", updatedAppt);
    } else {
        var appts = getList(DK.APPOINTMENTS);
        var idx = appts.findIndex(a => a.ma_lich_hen === updatedAppt.ma_lich_hen);
        if (idx !== -1) {
            appts[idx] = updatedAppt;
            Storage.saveData(DK.APPOINTMENTS, appts);
        }
    }

    toast("Đã hủy lịch thành công.", "success");
    render();
  }

  function openReview(id) {
    var ST = getST();
    var appt = getAppointmentById(id);
    if (!appt || normalizeStatus(appt.trang_thai) !== ST.DA_HOAN_THANH) {
      toast("Chỉ lịch đã hoàn thành mới được đánh giá.", "error");
      return;
    }
    if (typeof ReviewModule === "undefined") {
      toast("Chưa nạp được module đánh giá.", "error");
      return;
    }
    ReviewModule.open(appt.ma_lich_hen, render);
  }

  function onListClick(e) {
    var btn = e.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    var id = btn.dataset.id;
    var action = btn.dataset.action;

    if (action === "detail") showDetail(id);
    else if (action === "cancel") cancelBooking(id);
    else if (action === "review") openReview(id);
  }

  async function init() {
    listEl = document.getElementById("booking-list");
    filterEl = document.getElementById("filter-status");
    countEl = document.getElementById("result-count");

    var role = (typeof VAI_TRO !== "undefined" && VAI_TRO.KHACH_HANG) ? VAI_TRO.KHACH_HANG : "khach_hang";
    currentUser = (typeof AuthGuard !== "undefined" && AuthGuard.requireLogin) ? AuthGuard.requireLogin(role) : (typeof Storage !== "undefined" ? Storage.getCurrentUser() : null);

    try { if (typeof Storage !== "undefined" && Storage.initData) await Storage.initData(); } catch (e) {}

    if (listEl) listEl.addEventListener("click", onListClick);
    if (filterEl) filterEl.addEventListener("change", render);

    var btnClose = document.getElementById("btn-close-detail");
    if (btnClose) {
      btnClose.addEventListener("click", function () {
        var modalEl = document.getElementById("detail-modal");
        if (modalEl) modalEl.setAttribute("hidden", "hidden");
        if (typeof Common !== "undefined" && Common.closeModal) Common.closeModal("detail-modal");
      });
    }
    render();
  }

  global.MyBookingModule = { init: init, render: render };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : this);