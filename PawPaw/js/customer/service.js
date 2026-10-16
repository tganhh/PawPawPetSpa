/**
 * js/customer/service.js
 * Xử lý Danh sách dịch vụ, Bộ lọc, Chi tiết dịch vụ & Đánh giá khách hàng.
 */

let services = [];

function getServiceKeys() {
  return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : (typeof CONSTANTS !== "undefined" && CONSTANTS.DATA_KEYS ? CONSTANTS.DATA_KEYS : {
    SERVICES: "dich_vu",
    APPOINTMENTS: "lich_hen",
    APPOINTMENT_DETAILS: "chi_tiet_lich_hen",
    USERS: "nguoi_dung",
    REVIEWS: "danh_gia"
  });
}

function getServiceHienThi() {
  return (typeof HIEN_THI !== "undefined") ? HIEN_THI : (typeof CONSTANTS !== "undefined" && CONSTANTS.HIEN_THI ? CONSTANTS.HIEN_THI : {
    HIEN_THI: "hien_thi",
    AN: "an"
  });
}

/* =========================================================
   LOAD SERVICE DATA
   ========================================================= */
async function loadServices() {
  const DK = getServiceKeys();

  try {
    if (typeof Storage !== "undefined" && Storage.initData) {
      await Storage.initData();
      const stored = Storage.getData(DK.SERVICES);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        services = stored;
        initCurrentPage();
        return;
      }
    }
  } catch (e) {
    console.warn("Storage init warning:", e);
  }

  try {
    const response = await fetch("../../data/dich_vu.json");
    if (!response.ok) {
      throw new Error("Không thể tải dữ liệu dịch vụ.");
    }
    services = await response.json();
  } catch (error) {
    console.error("Lỗi tải dữ liệu dịch vụ:", error);
    if (typeof Storage !== "undefined") {
      services = Storage.getData(DK.SERVICES) || [];
    }
  }

  initCurrentPage();
}

function initCurrentPage() {
  if (document.getElementById("service-detail")) {
    initDetailPage();
  } else if (document.getElementById("filtered-service-list")) {
    initFilterPage();
  } else if (document.getElementById("service-list")) {
    initServicePage();
  }
}

/* =========================================================
   SERVICE LIST PAGE 
   ========================================================= */
function initServicePage() {
  const serviceList = document.getElementById("service-list");
  if (!serviceList) return;

  renderServices(services, serviceList);

  const searchInput = document.getElementById("service-search-input");
  const searchButton = document.getElementById("service-search-button");

  function doSearch() {
    if (!searchInput) return;
    const keyword = searchInput.value.trim().toLowerCase();
    const filteredServices = services.filter(function (service) {
      return (
        (service.ten_dich_vu && service.ten_dich_vu.toLowerCase().includes(keyword)) ||
        (service.nhom_dich_vu && service.nhom_dich_vu.toLowerCase().includes(keyword)) ||
        (service.mo_ta_chi_tiet && service.mo_ta_chi_tiet.toLowerCase().includes(keyword))
      );
    });
    renderServices(filteredServices, serviceList);
  }

  if (searchInput) searchInput.addEventListener("input", doSearch);
  if (searchButton) searchButton.addEventListener("click", doSearch);
}

/* =========================================================
   FILTER PAGE 
   ========================================================= */
function initFilterPage() {
  const groupSelect = document.getElementById("filter-group");
  const weightSelect = document.getElementById("filter-weight");
  const priceSelect = document.getElementById("filter-price");
  const durationSelect = document.getElementById("filter-duration");
  const searchInput = document.getElementById("filter-search-input");
  const applyButton = document.getElementById("apply-filter");
  const resetButton = document.getElementById("reset-filter");
  const serviceList = document.getElementById("filtered-service-list");
  const emptyMessage = document.getElementById("filtered-service-empty");

  if (!groupSelect || !applyButton || !serviceList) return;

  const groups = [...new Set(services.map(s => s.nhom_dich_vu).filter(Boolean))];
  groups.forEach(function (group) {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    groupSelect.appendChild(option);
  });

  serviceList.innerHTML = "";
  serviceList.style.display = "none";
  if (emptyMessage) emptyMessage.style.display = "none";

  applyButton.addEventListener("click", function () {
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedGroup = groupSelect.value;
    const selectedWeight = weightSelect ? weightSelect.value : "";
    const selectedPrice = priceSelect ? priceSelect.value : "";
    const selectedDuration = durationSelect ? durationSelect.value : "";

    const filteredServices = services.filter(function (service) {
      const matchKeyword = !keyword || (service.ten_dich_vu && service.ten_dich_vu.toLowerCase().includes(keyword));
      const matchGroup = !selectedGroup || service.nhom_dich_vu === selectedGroup;
      const matchWeight = !selectedWeight || checkWeight(service, selectedWeight);
      const matchPrice = !selectedPrice || checkPrice(service, selectedPrice);
      const matchDuration = !selectedDuration || checkDuration(service, selectedDuration);

      return matchKeyword && matchGroup && matchWeight && matchPrice && matchDuration;
    });

    serviceList.innerHTML = "";

    if (filteredServices.length === 0) {
      serviceList.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "block";
      return;
    }

    filteredServices.forEach(function (service) {
      const card = createServiceCard(service);
      serviceList.appendChild(card);
    });

    serviceList.style.display = "grid";
    if (emptyMessage) emptyMessage.style.display = "none";
  });

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      groupSelect.value = "";
      if (weightSelect) weightSelect.value = "";
      if (priceSelect) priceSelect.value = "";
      if (durationSelect) durationSelect.value = "";

      serviceList.innerHTML = "";
      serviceList.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "none";
    });
  }
}

function checkWeight(service, weightType) {
  const prices = [
    Number(service.gia_duoi_5kg),
    Number(service.gia_5_15kg),
    Number(service.gia_tren_15kg)
  ];
  switch (weightType) {
    case "under-5": return prices[0] > 0;
    case "5-15": return prices[1] > 0;
    case "over-15": return prices[2] > 0;
    default: return true;
  }
}

function checkPrice(service, priceType) {
  const prices = [
    Number(service.gia_duoi_5kg),
    Number(service.gia_5_15kg),
    Number(service.gia_tren_15kg)
  ].filter(p => p > 0);

  if (prices.length === 0) return false;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  switch (priceType) {
    case "under-100": return minPrice < 100000;
    case "100-200": return maxPrice >= 100000 && minPrice <= 200000;
    case "200-500": return maxPrice > 200000 && minPrice <= 500000;
    case "over-500": return maxPrice > 500000;
    default: return true;
  }
}

function checkDuration(service, durationType) {
  const duration = parseDuration(service.thoi_gian_du_kien);
  switch (durationType) {
    case "under-30": return duration < 30;
    case "30-60": return duration >= 30 && duration <= 60;
    case "60-120": return duration > 60 && duration <= 120;
    case "over-120": return duration > 120;
    default: return true;
  }
}

function parseDuration(value) {
  if (typeof value === "number") return value;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/* =========================================================
   RENDER SERVICE LIST & CARDS
   ========================================================= */
function renderServices(serviceArray, container) {
  container.innerHTML = "";
  const emptyMessage = document.getElementById("service-empty");

  if (serviceArray.length === 0) {
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (emptyMessage) emptyMessage.style.display = "none";

  serviceArray.forEach(function (service) {
    const card = createServiceCard(service);
    container.appendChild(card);
  });
}

function getMinPriceText(service) {
  const prices = [
    Number(service.gia_duoi_5kg),
    Number(service.gia_5_15kg),
    Number(service.gia_tren_15kg)
  ].filter(p => p > 0);

  if (prices.length === 0) return "Liên hệ";
  const minP = Math.min(...prices);
  return (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(minP) : formatCurrency(minP);
}

function createServiceCard(service) {
  const card = document.createElement("div");
  card.className = "service-card";

  card.addEventListener("click", function () {
    window.location.href = `service-detail.html?id=${encodeURIComponent(service.ma_dich_vu)}`;
  });

  if (service.anh_dich_vu) {
    const image = document.createElement("img");
    image.className = "service-card-image";
    image.src = service.anh_dich_vu;
    image.alt = service.ten_dich_vu;
    card.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "service-card-placeholder";
    placeholder.textContent = "PawPaw";
    card.appendChild(placeholder);
  }

  const content = document.createElement("div");
  content.className = "service-card-content";

  if (service.nhom_dich_vu) {
    const group = document.createElement("span");
    group.className = "service-card-group";
    group.textContent = service.nhom_dich_vu;
    content.appendChild(group);
  }

  const title = document.createElement("h2");
  title.textContent = service.ten_dich_vu;
  content.appendChild(title);

  const priceFooter = document.createElement("div");
  priceFooter.className = "service-card-price-footer";

  const priceVal = document.createElement("span");
  priceVal.className = "service-card-price-value";
  priceVal.textContent = "Từ " + getMinPriceText(service);

  const btnDetail = document.createElement("span");
  btnDetail.className = "btn btn-sm btn-primary service-card-btn";
  btnDetail.textContent = "Chi tiết";

  priceFooter.appendChild(priceVal);
  priceFooter.appendChild(btnDetail);
  content.appendChild(priceFooter);

  card.appendChild(content);
  return card;
}

/* =========================================================
   SERVICE DETAIL 
   ========================================================= */
function initDetailPage() {
  const detailContainer = document.getElementById("service-detail");
  const emptyMessage = document.getElementById("service-detail-empty");

  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("id");

  const service = services.find(function (item) {
    return String(item.ma_dich_vu) === String(serviceId);
  });

  if (!service) {
    detailContainer.innerHTML = "";
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (emptyMessage) emptyMessage.style.display = "none";

  renderServiceDetail(service, detailContainer);
  loadServiceReviews(service.ma_dich_vu);
}

/* =========================================================
   SERVICE REVIEWS
   ========================================================= */
const REVIEW_STAR_LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];

async function loadServiceReviews(serviceId) {
  if (typeof Storage === "undefined") return;
  try {
    if (Storage.initData) await Storage.initData();
  } catch (e) {}
  renderServiceReviews(serviceId);
}

function escapeReviewHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatReviewTime(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : String(iso);
}

function reviewStarsHtml(count) {
  const n = Math.round(Number(count) || 0);
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= n ? "★" : '<span class="off">★</span>';
  }
  return `<span class="stars-text" title="${n} sao">${html}</span>`;
}

function getVisibleServiceReviews(serviceId) {
  const DK = getServiceKeys();
  const HT = getServiceHienThi();

  const details = Storage.getData(DK.APPOINTMENT_DETAILS) || [];
  const appointments = Storage.getData(DK.APPOINTMENTS) || [];
  const users = Storage.getData(DK.USERS) || [];
  const reviews = Storage.getData(DK.REVIEWS) || [];

  const appointmentIds = {};
  details.forEach(function (detail) {
    if (String(detail.ma_dich_vu) === String(serviceId)) {
      appointmentIds[String(detail.ma_lich_hen)] = true;
    }
  });

  return reviews
    .filter(function (review) {
      const isVisible = review.trang_thai_hien_thi === HT.HIEN_THI || review.trang_thai_hien_thi === "hien_thi" || !review.trang_thai_hien_thi;
      return appointmentIds[String(review.ma_lich_hen)] && isVisible;
    })
    .map(function (review) {
      const appointment = appointments.find(a => String(a.ma_lich_hen) === String(review.ma_lich_hen));
      const user = appointment ? users.find(u => String(u.ma_nguoi_dung) === String(appointment.ma_nguoi_dung)) : null;

      return {
        review: review,
        customerName: user ? (user.ho_ten || user.ten_nguoi_dung || "Khách hàng") : "Khách hàng"
      };
    })
    .sort(function (a, b) {
      return String(b.review.thoi_gian_danh_gia || "").localeCompare(String(a.review.thoi_gian_danh_gia || ""));
    });
}

function renderServiceReviews(serviceId) {
  const section = document.getElementById("service-review-section");
  const summary = document.getElementById("service-review-summary");
  const list = document.getElementById("service-review-list");

  if (!section || !summary || !list) return;

  const rows = getVisibleServiceReviews(serviceId);
  section.style.display = "";

  if (rows.length === 0) {
    summary.innerHTML = "";
    list.innerHTML = '<p class="service-review-empty">Dịch vụ này chưa có đánh giá nào.</p>';
    return;
  }

  const total = rows.reduce((sum, row) => sum + (Number(row.review.so_sao) || 0), 0);
  const average = total / rows.length;

  summary.innerHTML =
    `<span class="service-review-avg">${average.toFixed(1)}</span> ` +
    reviewStarsHtml(average) +
    ` <span class="service-review-count">(${rows.length} đánh giá)</span>`;

  list.innerHTML = rows.map(function (row) {
    const review = row.review;
    return (
      '<article class="service-review-item">' +
        '<div class="service-review-top">' +
          `<strong class="service-review-name">${escapeReviewHtml(row.customerName)}</strong>` +
          `<span class="service-review-time">${escapeReviewHtml(formatReviewTime(review.thoi_gian_danh_gia))}</span>` +
        '</div>' +
        `<div class="service-review-rating">${reviewStarsHtml(review.so_sao)} ` +
          `<span class="service-review-label">${escapeReviewHtml(REVIEW_STAR_LABELS[Number(review.so_sao)] || "")}</span></div>` +
        `<p class="service-review-content">${escapeReviewHtml(review.noi_dung_danh_gia)}</p>` +
      '</article>'
    );
  }).join("");
}

/* =========================================================
   RENDER DETAIL CARD
   ========================================================= */
function renderServiceDetail(service, container) {
  container.innerHTML = "";
  const card = document.createElement("div");
  card.className = "service-detail-card";

  const imageSection = document.createElement("div");
  imageSection.className = "service-detail-image";

  if (service.anh_dich_vu) {
    const image = document.createElement("img");
    image.src = service.anh_dich_vu;
    image.alt = service.ten_dich_vu;
    imageSection.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "service-detail-image-placeholder";
    placeholder.textContent = "PawPaw";
    imageSection.appendChild(placeholder);
  }

  const content = document.createElement("div");
  content.className = "service-detail-content";

  const group = document.createElement("div");
  group.className = "service-detail-group";
  group.textContent = service.nhom_dich_vu;

  const title = document.createElement("h1");
  title.textContent = service.ten_dich_vu;

  const description = document.createElement("p");
  description.className = "service-detail-description";
  description.textContent = service.mo_ta_chi_tiet;

  const info = document.createElement("div");
  info.className = "service-detail-info";

  const infoItem = document.createElement("div");
  infoItem.className = "service-detail-info-item";

  const infoLabel = document.createElement("strong");
  infoLabel.textContent = "Thời gian dự kiến: ";

  const infoValue = document.createElement("span");
  infoValue.textContent = service.thoi_gian_du_kien;

  infoItem.appendChild(infoLabel);
  infoItem.appendChild(infoValue);
  info.appendChild(infoItem);

  const priceSection = document.createElement("div");
  priceSection.className = "service-price-section";

  const priceTitle = document.createElement("h2");
  priceTitle.textContent = "Mức giá theo cân nặng";

  const priceList = document.createElement("div");
  priceList.className = "service-price-list";

  addPrice(priceList, "Dưới 5 kg", service.gia_duoi_5kg);
  addPrice(priceList, "5 - 15 kg", service.gia_5_15kg);
  addPrice(priceList, "Trên 15 kg", service.gia_tren_15kg);

  priceSection.appendChild(priceTitle);
  priceSection.appendChild(priceList);

  content.appendChild(group);
  content.appendChild(title);
  content.appendChild(description);
  content.appendChild(info);
  content.appendChild(priceSection);

  card.appendChild(imageSection);
  card.appendChild(content);

  container.appendChild(card);
}

function addPrice(container, label, price) {
  const item = document.createElement("div");
  item.className = "service-price-item";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const priceElement = document.createElement("span");
  priceElement.textContent = formatCurrency(price);

  item.appendChild(labelElement);
  item.appendChild(priceElement);

  container.appendChild(item);
}

function formatCurrency(value) {
  const number = Number(value);
  if (!number) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(number) + " đ";
}

document.addEventListener("DOMContentLoaded", function () {
  loadServices();
});