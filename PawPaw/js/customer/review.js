/**
 * js/customer/review.js
 * Modal đánh giá dịch vụ cho lịch hẹn đã hoàn thành.
 * - Mỗi lịch hẹn chỉ được đánh giá 1 lần, không cho sửa.
 * - Bắt buộc chọn số sao (1-5) và nhập nội dung phản hồi.
 * - Lưu vào DATA_KEYS.REVIEWS theo cấu trúc danh_gia.json.
 */

(function (global) {
  "use strict";

  var STAR_LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];

  var modalId = "review-modal";
  var currentAppointmentId = null;
  var currentRating = 0;
  var onSavedCallback = null;
  var bound = false;

  var form, starsBox, contentInput, infoBox, starError, contentError, btnCancel;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Giờ địa phương dạng "YYYY-MM-DDTHH:mm:ss" (khớp định dạng trong danh_gia.json)
  function nowLocalIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function getAllReviews() {
    return (typeof Storage !== "undefined" && Storage.getData(DATA_KEYS.REVIEWS)) || [];
  }

  function getReviewByAppointment(maLichHen) {
    return getAllReviews().find(function (r) {
      return String(r.ma_lich_hen) === String(maLichHen);
    }) || null;
  }

  function showToast(msg, type) {
    if (typeof Common !== "undefined" && Common.showToast) Common.showToast(msg, type);
  }

  function queryElements() {
    form = document.getElementById("review-form");
    starsBox = document.getElementById("review-stars");
    contentInput = document.getElementById("review-content");
    infoBox = document.getElementById("review-appointment-info");
    starError = document.getElementById("review-star-error");
    contentError = document.getElementById("review-content-error");
    btnCancel = document.getElementById("btn-cancel-review");
  }

  function renderStars() {
    if (!starsBox) return;
    starsBox.innerHTML = "";
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star-btn";
      btn.dataset.value = i;
      btn.textContent = "★";
      btn.setAttribute("aria-label", i + " sao");
      btn.title = i + " sao - " + STAR_LABELS[i];
      starsBox.appendChild(btn);
    }
  }

  function paintStars() {
    if (!starsBox) return;
    starsBox.querySelectorAll(".star-btn").forEach(function (btn) {
      btn.classList.toggle("on", Number(btn.dataset.value) <= currentRating);
    });
  }

  function resetForm() {
    currentRating = 0;
    if (contentInput) contentInput.value = "";
    if (starError) starError.textContent = "";
    if (contentError) contentError.textContent = "";
    paintStars();
  }

  function bindEvents() {
    if (bound) return;
    bound = true;

    if (starsBox) {
      starsBox.addEventListener("click", function (e) {
        var btn = e.target.closest(".star-btn");
        if (!btn) return;
        currentRating = Number(btn.dataset.value);
        if (starError) starError.textContent = "";
        paintStars();
      });
    }

    if (form) form.addEventListener("submit", handleSubmit);
    if (btnCancel) btnCancel.addEventListener("click", close);
  }

  function init() {
    queryElements();
    renderStars();
    bindEvents();
  }

  /**
   * Mở modal đánh giá cho một lịch hẹn.
   * @param {string} maLichHen
   * @param {Function} [onSaved] - gọi sau khi lưu thành công (để trang danh sách render lại)
   */
  function open(maLichHen, onSaved) {
    if (!form) init();

    if (getReviewByAppointment(maLichHen)) {
      showToast("Lịch hẹn này đã được đánh giá.", "error");
      return false;
    }

    currentAppointmentId = maLichHen;
    onSavedCallback = typeof onSaved === "function" ? onSaved : null;
    resetForm();

    if (infoBox) infoBox.textContent = "Lịch hẹn: " + maLichHen;

    if (typeof Common !== "undefined" && Common.openModal) {
      Common.openModal(modalId);
    }
    return true;
  }

  function close() {
    if (typeof Common !== "undefined" && Common.closeModal) {
      Common.closeModal(modalId);
    }
    currentAppointmentId = null;
  }

  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentAppointmentId) return false;

    var content = contentInput ? contentInput.value.trim() : "";
    var valid = true;

    if (starError) starError.textContent = "";
    if (contentError) contentError.textContent = "";

    if (currentRating < 1 || currentRating > 5) {
      if (starError) starError.textContent = "Vui lòng chọn số sao (1 - 5).";
      valid = false;
    }
    if (!content) {
      if (contentError) contentError.textContent = "Vui lòng nhập nội dung phản hồi.";
      valid = false;
    }
    if (!valid) return false;

    // Chặn đánh giá trùng (phòng trường hợp mở 2 tab)
    if (getReviewByAppointment(currentAppointmentId)) {
      showToast("Lịch hẹn này đã được đánh giá.", "error");
      close();
      if (onSavedCallback) onSavedCallback();
      return false;
    }

    var review = {
      ma_danh_gia: Storage.generateId("DG", DATA_KEYS.REVIEWS, "ma_danh_gia"),
      ma_lich_hen: currentAppointmentId,
      so_sao: currentRating,
      trang_thai_hien_thi: (typeof HIEN_THI !== "undefined") ? HIEN_THI.HIEN_THI : "hien_thi",
      thoi_gian_danh_gia: nowLocalIso(),
      noi_dung_danh_gia: content
    };

    Storage.addItem(DATA_KEYS.REVIEWS, review);
    showToast("Cảm ơn bạn đã đánh giá dịch vụ!", "success");

    var cb = onSavedCallback;
    close();
    if (cb) cb(review);
    return true;
  }

  global.ReviewModule = {
    init: init,
    open: open,
    close: close,
    getReviewByAppointment: getReviewByAppointment
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
