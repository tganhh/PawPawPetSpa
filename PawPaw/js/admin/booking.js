(function (global) {
  "use strict";

  const PAGE_SIZE = 20; // mỗi trang tối đa 20 dòng

  const STATUS = {
    SAP_DIEN_RA: "sap_dien_ra",
    DANG_DIEN_RA: "dang_dien_ra",
    DA_HOAN_THANH: "da_hoan_thanh",
    DA_HUY: "da_huy"
  };

  let bookings = [];   // toàn bộ lịch hẹn đã ghép dữ liệu
  let filtered = [];   // kết quả sau khi lọc
  let currentPage = 1;

  const tbody = document.getElementById("booking-tbody");
  const paginationEl = document.getElementById("booking-pagination");
  const keywordInput = document.getElementById("filter-keyword");
  const statusSelect = document.getElementById("filter-status");
  const dateFromInput = document.getElementById("filter-date-from");
  const dateToInput = document.getElementById("filter-date-to");
  const dateChips = document.querySelectorAll(".btn-chip");
  const btnReset = document.getElementById("btn-reset");

  const modal = document.getElementById("modal-detail");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const modalContent = document.getElementById("modal-detail-content");

  // ---------- Lấy Key an toàn ----------
  function getDK() {
    return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : 
           (typeof CONSTANTS !== "undefined" && CONSTANTS.DATA_KEYS ? CONSTANTS.DATA_KEYS : {
               APPOINTMENTS: "lich_hen",
               APPOINTMENT_DETAILS: "chi_tiet_lich_hen",
               USERS: "nguoi_dung",
               PETS: "thu_cung",
               SERVICES: "dich_vu"
           });
  }

  // ---------- Helpers ----------
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function toSearchText(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatMoney(value) {
    return (typeof Common !== "undefined" && Common.formatCurrency)
      ? Common.formatCurrency(value)
      : `${Number(value || 0).toLocaleString()} ₫`;
  }

  function normalizeStatus(st) {
    if (!st) return STATUS.SAP_DIEN_RA;
    const lower = String(st).toLowerCase();
    if (lower === "cho_xac_nhan" || lower === "da_xac_nhan" || lower === "sap_dien_ra") {
      return STATUS.SAP_DIEN_RA;
    }
    if (lower === "dang_dien_ra") return STATUS.DANG_DIEN_RA;
    if (lower === "hoan_thanh" || lower === "da_hoan_thanh") return STATUS.DA_HOAN_THANH;
    if (lower === "da_huy") return STATUS.DA_HUY;
    return st;
  }

  function getStatusLabel(status) {
    switch (normalizeStatus(status)) {
      case STATUS.SAP_DIEN_RA: return "Sắp diễn ra";
      case STATUS.DANG_DIEN_RA: return "Đang diễn ra";
      case STATUS.DA_HOAN_THANH: return "Đã hoàn thành";
      case STATUS.DA_HUY: return "Đã huỷ";
      default: return status;
    }
  }

  // ---------- Nạp & ghép dữ liệu ----------
  function loadAndJoinData() {
    if (typeof Storage === "undefined") return;

    const DK = getDK();
    const appointments = Storage.getData(DK.APPOINTMENTS) || [];
    const users = Storage.getData(DK.USERS) || [];
    const details = Storage.getData(DK.APPOINTMENT_DETAILS) || [];
    const pets = Storage.getData(DK.PETS) || [];
    const services = Storage.getData(DK.SERVICES) || [];

    const userMap = new Map(users.map((u) => [String(u.ma_nguoi_dung), u]));
    const petMap = new Map(pets.map((p) => [String(p.ma_thu_cung), p]));
    const serviceMap = new Map(services.map((s) => [String(s.ma_dich_vu), s]));

    const detailsByAppointment = new Map();
    details.forEach((d) => {
      const key = String(d.ma_lich_hen);
      if (!detailsByAppointment.has(key)) detailsByAppointment.set(key, []);
      detailsByAppointment.get(key).push(d);
    });

    bookings = appointments.map((apt) => {
      const user = userMap.get(String(apt.ma_nguoi_dung)) || { ho_ten: "Khách lẻ", so_dien_thoai: "---" };

      const aptDetails = (detailsByAppointment.get(String(apt.ma_lich_hen)) || []).map((d) => {
        const pet = petMap.get(String(d.ma_thu_cung)) || { ten_thu_cung: "Bé cưng" };
        const srv = serviceMap.get(String(d.ma_dich_vu)) || { ten_dich_vu: "Dịch vụ" };
        return { ...d, ten_thu_cung: pet.ten_thu_cung, ten_dich_vu: srv.ten_dich_vu };
      });

      return {
        ...apt,
        trang_thai: normalizeStatus(apt.trang_thai),
        user,
        details: aptDetails,
        _search: toSearchText([apt.ma_lich_hen, user.ho_ten, user.so_dien_thoai].join(" "))
      };
    });

    bookings.sort((a, b) => new Date(b.thoi_gian_tao || b.ngay_hen) - new Date(a.thoi_gian_tao || a.ngay_hen));
  }

  function renderStatusActions(item) {
    return `<button type="button" class="btn-table btn-detail" onclick="AdminBooking.showDetail('${escapeHtml(item.ma_lich_hen)}')">Xem</button>`;
  }

  // ---------- Render bảng + phân trang ----------
  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    const state = Pagination.paginate(filtered, currentPage, PAGE_SIZE);
    currentPage = state.page; 

    if (state.total === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 25px; color: var(--purple-gray);">Không có dữ liệu phù hợp.</td></tr>`;
      Pagination.render(paginationEl, state, goToPage, "lịch hẹn");
      return;
    }

    state.items.forEach((b) => {
      const tr = document.createElement("tr");
      const itemsStr = b.details.length > 0
        ? b.details.map((d) => `<b>${escapeHtml(d.ten_thu_cung)}</b>: ${escapeHtml(d.ten_dich_vu)}`).join("<br>")
        : "---";
      const st = normalizeStatus(b.trang_thai);

      tr.innerHTML = `
        <td><strong style="color: var(--blue-dark);">${escapeHtml(b.ma_lich_hen)}</strong></td>
        <td><div style="font-weight: 800;">${escapeHtml(b.user.ho_ten)}</div></td>
        <td>${escapeHtml(b.user.so_dien_thoai)}</td>
        <td>
          <div style="font-weight: 800; color: var(--blue-dark);">${b.gio_hen ? b.gio_hen.slice(0, 5) : "--:--"}</div>
          <div style="font-size: 12px; color: var(--purple-gray);">${escapeHtml(b.ngay_hen)}</div>
        </td>
        <td>${itemsStr}</td>
        <td><strong style="color: var(--blue-dark);">${formatMoney(b.tong_tien)}</strong></td>
        <td class="col-center"><span class="badge badge-${st}">${getStatusLabel(st)}</span></td>
        <td style="text-align: right; white-space: nowrap;">${renderStatusActions(b)}</td>
      `;
      tbody.appendChild(tr);
    });

    Pagination.render(paginationEl, state, goToPage, "lịch hẹn");
  }

  function goToPage(page) {
    currentPage = page;
    renderTable();
    const wrap = tbody ? tbody.closest(".admin-panel") : null;
    if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Lọc ----------
  function filterData(resetPage = true) {
    const kw = toSearchText((keywordInput?.value || "").trim());
    const st = statusSelect?.value || "";
    const from = dateFromInput?.value || "";
    const to = dateToInput?.value || "";

    filtered = bookings.filter((item) => {
      const matchKw = !kw || item._search.includes(kw);
      const matchSt = !st || normalizeStatus(item.trang_thai) === st;
      const itemDate = item.ngay_hen || "";
      const matchFrom = !from || itemDate >= from;
      const matchTo = !to || itemDate <= to;
      return matchKw && matchSt && matchFrom && matchTo;
    });

    if (resetPage) currentPage = 1;
    renderTable();
  }

  function formatDateInput(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function applyDateRange(rangeType) {
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (rangeType === "today") {
      fromDate = today; toDate = today;
    } else if (rangeType === "7days") {
      fromDate.setDate(today.getDate() - 7); toDate = today;
    } else if (rangeType === "30days") {
      fromDate.setDate(today.getDate() - 30); toDate = today;
    } else if (rangeType === "this_month") {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    if (dateFromInput) dateFromInput.value = formatDateInput(fromDate);
    if (dateToInput) dateToInput.value = formatDateInput(toDate);
    filterData();
  }

  // ---------- Modal chi tiết & Thay đổi trạng thái ----------
  function showDetail(id) {
    const item = bookings.find((b) => b.ma_lich_hen === id);
    if (!item || !modal || !modalContent) return;

    const st = normalizeStatus(item.trang_thai);

    const statusEditor = `
      <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
        <select id="modal-status-select" style="padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--blue-light); font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text-main); outline: none;">
          <option value="${STATUS.SAP_DIEN_RA}" ${st === STATUS.SAP_DIEN_RA ? 'selected' : ''}>Sắp diễn ra</option>
          <option value="${STATUS.DANG_DIEN_RA}" ${st === STATUS.DANG_DIEN_RA ? 'selected' : ''}>Đang diễn ra</option>
          <option value="${STATUS.DA_HOAN_THANH}" ${st === STATUS.DA_HOAN_THANH ? 'selected' : ''}>Đã hoàn thành</option>
          <option value="${STATUS.DA_HUY}" ${st === STATUS.DA_HUY ? 'selected' : ''}>Đã huỷ</option>
        </select>
        <button type="button" class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="AdminBooking.updateStatus('${escapeHtml(item.ma_lich_hen)}')">Lưu</button>
      </div>
    `;

    const rows = item.details.map((d) => `
      <tr>
        <td><strong>${escapeHtml(d.ten_thu_cung)}</strong></td>
        <td>${escapeHtml(d.ten_dich_vu)}</td>
        <td style="text-align: right; font-weight: 800; color: var(--blue-dark);">${formatMoney(d.don_gia)}</td>
      </tr>
    `).join("");

    const createdAt = item.thoi_gian_tao ? new Date(item.thoi_gian_tao).toLocaleString("vi-VN") : "---";

    modalContent.innerHTML = `
      <div class="detail-summary-grid">
        <div><strong>Mã LH:</strong> <span style="color: var(--blue-dark); font-weight: 900;">${escapeHtml(item.ma_lich_hen)}</span></div>
        <div>
            <strong>Trạng thái:</strong> 
            ${statusEditor}
        </div>
        <div><strong>Khách hàng:</strong> ${escapeHtml(item.user.ho_ten)}</div>
        <div><strong>Số điện thoại:</strong> ${escapeHtml(item.user.so_dien_thoai)}</div>
        <div><strong>Thời gian:</strong> <span style="color: var(--blue-dark); font-weight: 800;">${item.gio_hen ? item.gio_hen.slice(0, 5) : "--:--"}</span> | ${escapeHtml(item.ngay_hen)}</div>
        <div><strong>Ngày đặt:</strong> ${escapeHtml(createdAt)}</div>
      </div>
      <div style="margin-bottom: 15px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--purple-gray);">Ghi chú khách hàng:</div>
        <div style="background: #fafbfc; border: 1px solid var(--blue-light); padding: 10px 14px; border-radius: 8px; margin-top: 4px; font-size: 14px;">${escapeHtml(item.ghi_chu || "Không có ghi chú")}</div>
      </div>
      <div>
        <div style="font-size: 13px; font-weight: 800; color: var(--purple-gray); margin-bottom: 6px;">Danh sách dịch vụ:</div>
        <table class="table-items-detail">
          <thead>
            <tr>
              <th style="text-align: left;">Thú cưng</th>
              <th style="text-align: left;">Dịch vụ</th>
              <th style="text-align: right;">Đơn giá</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="3" style="text-align: center; color: var(--purple-gray);">Không có dữ liệu</td></tr>`}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right; font-weight: 800;">Tổng tiền</td>
              <td style="text-align: right; font-weight: 900; color: var(--blue-dark);">${formatMoney(item.tong_tien)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    modal.style.display = "flex";
  }

  function updateStatus(id) {
    const select = document.getElementById("modal-status-select");
    if (!select) return;

    const newStatus = select.value;
    const DK = getDK();
    const appointments = Storage.getData(DK.APPOINTMENTS) || [];
    const idx = appointments.findIndex((a) => String(a.ma_lich_hen) === String(id));

    if (idx === -1) {
      if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Không tìm thấy lịch hẹn!", "error");
      else alert("Không tìm thấy lịch hẹn!");
      return;
    }

    // Cập nhật trạng thái mới
    appointments[idx].trang_thai = newStatus;

    // LƯU AN TOÀN bằng phương thức updateItem (tránh lỗi ngầm không tồn tại hàm)
    if (typeof Storage.updateItem === "function") {
        Storage.updateItem(DK.APPOINTMENTS, "ma_lich_hen", appointments[idx]);
    } else {
        // Fallback tự lưu đè LocalStorage
        localStorage.setItem(DK.APPOINTMENTS, JSON.stringify(appointments));
    }

    // Thông báo
    if (typeof Common !== "undefined" && Common.showToast) {
      Common.showToast("Lưu trạng thái thành công!", "success");
    } else {
      alert("Lưu trạng thái thành công!");
    }

    // Load lại bảng, giữ nguyên modal
    loadAndJoinData();
    filterData(false);
  }

  function closeModal() {
    if (modal) modal.style.display = "none";
  }

  function setupEvents() {
    keywordInput?.addEventListener("input", () => filterData());
    statusSelect?.addEventListener("change", () => filterData());

    dateFromInput?.addEventListener("change", () => { dateChips.forEach((c) => c.classList.remove("active")); filterData(); });
    dateToInput?.addEventListener("change", () => { dateChips.forEach((c) => c.classList.remove("active")); filterData(); });

    dateChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        dateChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        applyDateRange(chip.dataset.range);
      });
    });

    btnReset?.addEventListener("click", () => {
      if (keywordInput) keywordInput.value = "";
      if (statusSelect) statusSelect.value = "";
      if (dateFromInput) dateFromInput.value = "";
      if (dateToInput) dateToInput.value = "";
      dateChips.forEach((c) => c.classList.remove("active"));
      filterData();
    });

    btnCloseModal?.addEventListener("click", closeModal);
    window.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  async function init() {
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 25px; color: var(--purple-gray);">Đang tải dữ liệu...</td></tr>`;
    if (typeof Storage !== "undefined" && Storage.initData) await Storage.initData();

    loadAndJoinData();
    filterData();
    setupEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Export để gọi được từ inline onclick
  global.AdminBooking = {
    showDetail,
    updateStatus, 
    refresh: () => {
      loadAndJoinData();
      filterData(false);
    }
  };
})(typeof window !== "undefined" ? window : this);