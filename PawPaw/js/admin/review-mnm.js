/**
 * js/admin/review-mnm.js
 * Trang admin: xem, lọc, sắp xếp và ẩn/hiện đánh giá của khách hàng.
 * - Ẩn đánh giá: đổi trang_thai_hien_thi = HIEN_THI.AN (khách không thấy, admin vẫn thấy).
 * - Hiện lại: đổi trang_thai_hien_thi = HIEN_THI.HIEN_THI.
 * - Khách hàng chỉ thấy đánh giá có trang_thai_hien_thi === "hien_thi" (lọc ở phía trang khách).
 */

(function () {
  "use strict";

  var STAR_LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];

  var currentDetailId = null;
  var el = {};

  /* ---------- Tiện ích ---------- */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message, type) {
    if (typeof Common !== "undefined" && typeof Common.showToast === "function") {
      Common.showToast(message, type);
    }
  }

  // "2026-09-14T17:05:00" -> "14/09/2026 17:05"
  function formatDateTime(iso) {
    if (!iso) return "";
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ":" + m[5] : String(iso);
  }

  function renderStars(count) {
    var n = Number(count) || 0;
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += i <= n ? "★" : '<span class="off">★</span>';
    }
    return '<span class="stars-text" title="' + n + ' sao">' + html + "</span>";
  }

  /* ---------- Dữ liệu ---------- */

  function getList(key) {
    return Storage.getData(key) || [];
  }

  // Gắn thêm tên khách hàng và tên dịch vụ cho mỗi đánh giá
  function buildRows() {
    var reviews = getList(DATA_KEYS.REVIEWS);
    var appointments = getList(DATA_KEYS.APPOINTMENTS);
    var users = getList(DATA_KEYS.USERS);
    var details = getList(DATA_KEYS.APPOINTMENT_DETAILS);
    var services = getList(DATA_KEYS.SERVICES);

    return reviews.map(function (review) {
      var appt = appointments.find(function (a) {
        return String(a.ma_lich_hen) === String(review.ma_lich_hen);
      }) || null;

      var user = appt
        ? users.find(function (u) { return String(u.ma_nguoi_dung) === String(appt.ma_nguoi_dung); })
        : null;

      var serviceNames = [];
      details.forEach(function (d) {
        if (String(d.ma_lich_hen) !== String(review.ma_lich_hen)) return;
        var sv = services.find(function (s) { return String(s.ma_dich_vu) === String(d.ma_dich_vu); });
        var name = sv ? sv.ten_dich_vu : d.ma_dich_vu;
        if (serviceNames.indexOf(name) === -1) serviceNames.push(name);
      });

      return {
        review: review,
        customerName: user ? user.ho_ten : "(Không rõ)",
        customerCode: user ? user.ma_nguoi_dung : "",
        serviceText: serviceNames.length ? serviceNames.join(", ") : "(Không rõ)",
        appointment: appt
      };
    });
  }

  function getFilteredRows() {
    var star = el.filterStar.value;
    var visibility = el.filterVisibility.value;
    var sort = el.sortTime.value;

    var rows = buildRows().filter(function (row) {
      var r = row.review;
      if (star !== "all" && Number(r.so_sao) !== Number(star)) return false;
      if (visibility !== "all" && r.trang_thai_hien_thi !== visibility) return false;
      return true;
    });

    rows.sort(function (a, b) {
      var ta = String(a.review.thoi_gian_danh_gia || "");
      var tb = String(b.review.thoi_gian_danh_gia || "");
      // Chuỗi ISO cùng định dạng nên so sánh chuỗi là đúng thứ tự thời gian
      return sort === "oldest" ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });

    return rows;
  }

  /* ---------- Hiển thị bảng ---------- */

  function render() {
    var rows = getFilteredRows();
    var total = getList(DATA_KEYS.REVIEWS).length;

    el.resultCount.innerHTML =
      "Hiển thị <strong>" + rows.length + "</strong> / " + total + " đánh giá";

    if (!rows.length) {
      el.tableBody.innerHTML =
        '<tr><td colspan="8" class="review-empty">Không có đánh giá nào phù hợp với bộ lọc.</td></tr>';
      return;
    }

    el.tableBody.innerHTML = rows.map(function (row) {
      var r = row.review;
      var isHidden = r.trang_thai_hien_thi === HIEN_THI.AN;
      var id = escapeHtml(r.ma_danh_gia);

      return (
        '<tr class="' + (isHidden ? "is-hidden-row" : "") + '">' +
          '<td class="col-code">' + id + "</td>" +
          "<td>" + escapeHtml(row.customerName) +
            (row.customerCode ? '<br><small style="color:var(--purple-gray)">' + escapeHtml(row.customerCode) + "</small>" : "") +
          "</td>" +
          "<td>" + escapeHtml(row.serviceText) + "</td>" +
          "<td>" + renderStars(r.so_sao) + "</td>" +
          '<td class="col-content"><div class="review-content-short">' + escapeHtml(r.noi_dung_danh_gia) + "</div></td>" +
          '<td class="col-time">' + escapeHtml(formatDateTime(r.thoi_gian_danh_gia)) + "</td>" +
          "<td>" + visibilityBadge(isHidden) + "</td>" +
          '<td><div class="review-actions">' +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="detail" data-id="' + id + '">Chi tiết</button>' +
            toggleButton(isHidden, id) +
          "</div></td>" +
        "</tr>"
      );
    }).join("");
  }

  function visibilityBadge(isHidden) {
    return isHidden
      ? '<span class="visibility-badge visibility-an">Đã ẩn</span>'
      : '<span class="visibility-badge visibility-hien_thi">Đang hiện</span>';
  }

  function toggleButton(isHidden, id) {
    return isHidden
      ? '<button type="button" class="btn btn-success btn-sm" data-action="toggle" data-id="' + id + '">Hiện</button>'
      : '<button type="button" class="btn btn-danger btn-sm" data-action="toggle" data-id="' + id + '">Ẩn</button>';
  }

  /* ---------- Ẩn / hiện ---------- */

  function toggleVisibility(maDanhGia) {
    var review = Storage.getItemById(DATA_KEYS.REVIEWS, "ma_danh_gia", maDanhGia);
    if (!review) {
      showToast("Không tìm thấy đánh giá.", "error");
      return false;
    }

    var willHide = review.trang_thai_hien_thi !== HIEN_THI.AN;
    var ok = Storage.updateItem(DATA_KEYS.REVIEWS, "ma_danh_gia", {
      ma_danh_gia: maDanhGia,
      trang_thai_hien_thi: willHide ? HIEN_THI.AN : HIEN_THI.HIEN_THI
    });

    if (!ok) {
      showToast("Cập nhật thất bại, vui lòng thử lại.", "error");
      return false;
    }

    showToast(
      willHide
        ? "Đã ẩn đánh giá " + maDanhGia + ". Khách hàng sẽ không còn thấy."
        : "Đã hiện lại đánh giá " + maDanhGia + ".",
      "success"
    );
    render();
    return true;
  }

  /* ---------- Modal chi tiết ---------- */

  function openDetail(maDanhGia) {
    var row = buildRows().find(function (x) {
      return String(x.review.ma_danh_gia) === String(maDanhGia);
    });
    if (!row) return;

    var r = row.review;
    var appt = row.appointment;
    currentDetailId = r.ma_danh_gia;

    el.detailBody.innerHTML =
      detailRow("Mã đánh giá", escapeHtml(r.ma_danh_gia)) +
      detailRow("Khách hàng", escapeHtml(row.customerName) + (row.customerCode ? " (" + escapeHtml(row.customerCode) + ")" : "")) +
      detailRow("Mã lịch hẹn", escapeHtml(r.ma_lich_hen)) +
      detailRow("Ngày hẹn", appt ? escapeHtml(appt.ngay_hen + " " + String(appt.gio_hen || "").slice(0, 5)) : "(Không rõ)") +
      detailRow("Dịch vụ", escapeHtml(row.serviceText)) +
      detailRow("Số sao", renderStars(r.so_sao) + " " + escapeHtml(STAR_LABELS[Number(r.so_sao)] || "")) +
      detailRow("Thời gian đánh giá", escapeHtml(formatDateTime(r.thoi_gian_danh_gia))) +
      detailRow("Hiển thị", visibilityBadge(r.trang_thai_hien_thi === HIEN_THI.AN)) +
      '<div class="review-detail-content">' + escapeHtml(r.noi_dung_danh_gia) + "</div>";

    syncDetailToggleButton(r.trang_thai_hien_thi === HIEN_THI.AN);
    el.detailModal.hidden = false;
    el.detailModal.style.display = "flex";
  }

  function detailRow(label, valueHtml) {
    return '<div class="review-detail-row"><span class="label">' + label +
      '</span><span class="value">' + valueHtml + "</span></div>";
  }

  function syncDetailToggleButton(isHidden) {
    el.detailToggle.textContent = isHidden ? "Hiện đánh giá" : "Ẩn đánh giá";
    el.detailToggle.className = "btn " + (isHidden ? "btn-success" : "btn-danger");
  }

  function closeDetail() {
    el.detailModal.hidden = true;
    el.detailModal.style.display = "none";
    currentDetailId = null;
  }

  /* ---------- Sự kiện ---------- */

  function resetFilters() {
    el.filterStar.value = "all";
    el.filterVisibility.value = "all";
    el.sortTime.value = "newest";
    render();
  }

  function bindEvents() {
    el.filterStar.addEventListener("change", render);
    el.filterVisibility.addEventListener("change", render);
    el.sortTime.addEventListener("change", render);
    el.btnReset.addEventListener("click", resetFilters);

    el.tableBody.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn) return;
      var id = btn.dataset.id;
      if (btn.dataset.action === "detail") openDetail(id);
      if (btn.dataset.action === "toggle") toggleVisibility(id);
    });

    el.btnDetailClose.addEventListener("click", closeDetail);

    el.btnDetailToggle = el.detailToggle;
    el.detailToggle.addEventListener("click", function () {
      if (!currentDetailId) return;
      var id = currentDetailId;
      if (toggleVisibility(id)) openDetail(id); // làm mới nội dung modal
    });

    // Bấm ra ngoài hộp hoặc nhấn Esc để đóng
    el.detailModal.addEventListener("click", function (e) {
      if (e.target === el.detailModal) closeDetail();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && currentDetailId) closeDetail();
    });
  }

  function queryElements() {
    el.filterStar = document.getElementById("filter-star");
    el.filterVisibility = document.getElementById("filter-visibility");
    el.sortTime = document.getElementById("sort-time");
    el.btnReset = document.getElementById("btn-reset-filter");
    el.resultCount = document.getElementById("result-count");
    el.tableBody = document.getElementById("review-table-body");
    el.detailModal = document.getElementById("review-detail-modal");
    el.detailBody = document.getElementById("review-detail-body");
    el.detailToggle = document.getElementById("btn-detail-toggle");
    el.btnDetailClose = document.getElementById("btn-detail-close");
  }

  async function init() {
    // Chỉ quản lý (admin) được vào trang này
    if (typeof AuthGuard !== "undefined" && !AuthGuard.requireLogin(VAI_TRO.QUAN_LY)) return;

    queryElements();
    bindEvents();

    // Nạp dữ liệu từ JSON vào LocalStorage nếu chưa có
    await Storage.initData();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
