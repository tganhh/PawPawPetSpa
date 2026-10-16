(function () {
  // Format tiền Việt Nam
  function formatCurrency(amount) {
    // null, undefined, chuỗi rỗng hoặc giá trị không hợp lệ
    // đều trả về mặc định "0 ₫"
    if (amount === null || amount === undefined || amount === "") {
      return "0 ₫";
    }

    const value = Number(amount);

    if (!Number.isFinite(value)) {
      return "0 ₫";
    }

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }).format(value);
  }

  // Format ngày từ YYYY-MM-DD thành DD/MM/YYYY
  function formatDate(dateValue) {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Lấy một query parameter từ URL
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // Lấy toàn bộ query parameters
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};

    for (const [key, value] of params.entries()) {
      result[key] = value;
    }

    return result;
  }

  // Mở modal theo id
  function openModal(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) {
      return false;
    }

    modal.classList.add("active");
    modal.removeAttribute("hidden");
    modal.style.display = "flex";

    return true;
  }

  // Đóng modal theo id
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) {
      return false;
    }

    modal.classList.remove("active");
    modal.setAttribute("hidden", "");
    modal.style.display = "none";

    return true;
  }

  // Hiển thị toast
  function showToast(message, type = "success", duration = 3000) {
    let toast = document.getElementById("pawpaw-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pawpaw-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = "block";

    clearTimeout(toast._timeout);

    toast._timeout = setTimeout(() => {
      toast.style.display = "none";
    }, duration);

    return toast;
  }

  const Common = Object.freeze({
    formatCurrency,
    formatDate,
    getQueryParam,
    getQueryParams,
    openModal,
    closeModal,
    showToast
  });

  window.Common = Common;

  window.formatCurrency = formatCurrency;
  window.formatDate = formatDate;
  window.getQueryParam = getQueryParam;
  window.getQueryParams = getQueryParams;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.showToast = showToast;
})();