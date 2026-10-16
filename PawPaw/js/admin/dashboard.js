(function (global) {
  "use strict";

  const STATUS = {
    SAP_DIEN_RA: "sap_dien_ra",
    DANG_DIEN_RA: "dang_dien_ra",
    DA_HOAN_THANH: "da_hoan_thanh",
    DA_HUY: "da_huy"
  };

  // Màu dùng chung cho biểu đồ (đồng bộ với badge trạng thái & theme PawPaw)
  const COLORS = {
    done: "#5bbf8a",
    upcoming: "#f5b94a",
    cancelled: "#ef7b7b",
    primary: "#6982D5",
    primarySoft: "rgba(105, 130, 213, 0.18)",
    pastel: "#99B4DA",
    text: "#806E83",
    grid: "rgba(128, 110, 131, 0.14)"
  };

  const MONTHS_TO_SHOW = 6;
  const TOP_SERVICES = 5;

  // ---------- Helpers ----------
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
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
    if (lower === "dang_dien_ra") {
      return STATUS.DANG_DIEN_RA;
    }
    if (lower === "hoan_thanh" || lower === "da_hoan_thanh") {
      return STATUS.DA_HOAN_THANH;
    }
    if (lower === "da_huy") {
      return STATUS.DA_HUY;
    }
    return st;
  }

  function getStatusLabel(status) {
    switch (normalizeStatus(status)) {
      case STATUS.SAP_DIEN_RA:
        return "Sắp diễn ra";
      case STATUS.DANG_DIEN_RA:
        return "Đang diễn ra";
      case STATUS.DA_HOAN_THANH:
        return "Đã hoàn thành";
      case STATUS.DA_HUY:
        return "Đã huỷ";
      default:
        return status;
    }
  }

  // Vai trò lưu trong dữ liệu là "khách hàng" (có dấu) — xem VAI_TRO trong constants.js.
  // Chấp nhận thêm vài biến thể cũ để không bị lệch dữ liệu.
  function isCustomer(user) {
    const role = String(user.vai_tro || "").toLowerCase();
    return (
      !role ||
      role === String(VAI_TRO.KHACH_HANG).toLowerCase() ||
      role === "khach_hang" ||
      role === "khach hang"
    );
  }

  function monthKey(dateStr) {
    return String(dateStr || "").slice(0, 7); // "YYYY-MM"
  }

  // 6 tháng gần nhất tính tới tháng của lịch hẹn muộn nhất: ["2026-05", ..., "2026-10"]
  function getMonthRange(appointments) {
    const keys = appointments.map((a) => monthKey(a.ngay_hen)).filter((k) => /^\d{4}-\d{2}$/.test(k));
    if (keys.length === 0) return [];

    const last = keys.reduce((max, k) => (k > max ? k : max));
    let year = Number(last.slice(0, 4));
    let month = Number(last.slice(5, 7));

    const result = [];
    for (let i = 0; i < MONTHS_TO_SHOW; i++) {
      result.unshift(`${year}-${String(month).padStart(2, "0")}`);
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
    return result;
  }

  function monthLabel(key) {
    return `${key.slice(5, 7)}/${key.slice(0, 4)}`; // "05/2026"
  }

  // ---------- Dashboard ----------
  async function initDashboard() {
    if (typeof Storage === "undefined") return;

    // Đảm bảo dữ liệu mẫu đã nạp (và đúng phiên bản) trước khi đọc
    await Storage.initData();

    const appointments = Storage.getData(DATA_KEYS.APPOINTMENTS) || [];
    const users = Storage.getData(DATA_KEYS.USERS) || [];
    const details = Storage.getData(DATA_KEYS.APPOINTMENT_DETAILS) || [];
    const pets = Storage.getData(DATA_KEYS.PETS) || [];
    const services = Storage.getData(DATA_KEYS.SERVICES) || [];
    const reviews = Storage.getData(DATA_KEYS.REVIEWS) || [];

    const userMap = new Map(users.map((u) => [String(u.ma_nguoi_dung), u]));
    const petMap = new Map(pets.map((p) => [String(p.ma_thu_cung), p]));
    const serviceMap = new Map(services.map((s) => [String(s.ma_dich_vu), s]));

    renderKpis({ appointments, users, pets, reviews });
    renderCharts({ appointments, details, serviceMap });
    renderRecentBookings({ appointments, details, userMap, petMap, serviceMap });
  }

  // ----- 5 thẻ KPI -----
  function renderKpis({ appointments, users, pets, reviews }) {
    const totalCustomers = users.filter(isCustomer).length;
    const totalPets = pets.length;

    const pendingBookings = appointments.filter((a) => {
      const st = normalizeStatus(a.trang_thai);
      return st === STATUS.SAP_DIEN_RA || st === STATUS.DANG_DIEN_RA;
    }).length;

    const totalRevenue = appointments
      .filter((a) => normalizeStatus(a.trang_thai) === STATUS.DA_HOAN_THANH)
      .reduce((sum, a) => sum + (Number(a.tong_tien) || 0), 0);

    let avgRating = "0.0";
    if (reviews.length > 0) {
      const sumRating = reviews.reduce((sum, r) => sum + (Number(r.so_sao) || 0), 0);
      avgRating = (sumRating / reviews.length).toFixed(1);
    }

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText("kpi-total-customers", totalCustomers);
    setText("kpi-total-pets", totalPets);
    setText("kpi-pending-bookings", pendingBookings);
    setText("kpi-total-revenue", formatMoney(totalRevenue));
    setText("kpi-avg-rating", `${avgRating} / 5 ⭐`);
  }

  // ----- 4 biểu đồ -----
  function renderCharts({ appointments, details, serviceMap }) {
    if (typeof Chart === "undefined") {
      document.querySelectorAll(".chart-box").forEach((box) => {
        box.innerHTML = `<div class="chart-empty">Không tải được thư viện biểu đồ (js/lib/chart.umd.js).</div>`;
      });
      return;
    }

    Chart.defaults.font.family = "'Nunito', sans-serif";
    Chart.defaults.font.weight = 600;
    Chart.defaults.color = COLORS.text;

    const months = getMonthRange(appointments);
    const labels = months.map(monthLabel);

    // Gom số liệu theo tháng
    const perMonth = {};
    months.forEach((m) => {
      perMonth[m] = { done: 0, upcoming: 0, cancelled: 0, revenue: 0 };
    });

    appointments.forEach((a) => {
      const bucket = perMonth[monthKey(a.ngay_hen)];
      if (!bucket) return;

      const st = normalizeStatus(a.trang_thai);
      if (st === STATUS.DA_HOAN_THANH) {
        bucket.done += 1;
        bucket.revenue += Number(a.tong_tien) || 0;
      } else if (st === STATUS.DA_HUY) {
        bucket.cancelled += 1;
      } else {
        bucket.upcoming += 1;
      }
    });

    drawBookingsByMonth(labels, months.map((m) => perMonth[m]));
    drawRevenueByMonth(labels, months.map((m) => perMonth[m].revenue));
    drawStatusShare(months.map((m) => perMonth[m]));
    drawTopServices(appointments, details, serviceMap);
  }

  // Vẽ tổng số lịch phía trên mỗi cột ở biểu đồ cột chồng
  const stackTotalPlugin = {
    id: "stackTotals",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const datasets = chart.data.datasets;
      const count = chart.data.labels.length;

      ctx.save();
      ctx.font = "800 12px 'Nunito', sans-serif";
      ctx.fillStyle = "#2f3640";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      for (let i = 0; i < count; i++) {
        let total = 0;
        let top = Infinity;
        let x = null;

        datasets.forEach((ds, di) => {
          const value = Number(ds.data[i]) || 0;
          total += value;
          const bar = chart.getDatasetMeta(di).data[i];
          if (value > 0 && bar) {
            top = Math.min(top, bar.y);
            x = bar.x;
          }
        });

        if (x !== null && Number.isFinite(top)) {
          ctx.fillText(String(total), x, top - 4);
        }
      }
      ctx.restore();
    }
  };

  function drawBookingsByMonth(labels, rows) {
    const canvas = document.getElementById("chart-bookings-month");
    if (!canvas) return;

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Hoàn thành", data: rows.map((r) => r.done), backgroundColor: COLORS.done, borderRadius: 4 },
          { label: "Sắp diễn ra", data: rows.map((r) => r.upcoming), backgroundColor: COLORS.upcoming, borderRadius: 4 },
          { label: "Đã huỷ", data: rows.map((r) => r.cancelled), backgroundColor: COLORS.cancelled, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 18 } },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, grid: { color: COLORS.grid }, ticks: { precision: 0 } }
        },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
          tooltip: {
            callbacks: {
              footer(items) {
                const total = items.reduce((s, it) => s + it.parsed.y, 0);
                return `Tổng: ${total} lịch`;
              }
            }
          }
        }
      },
      plugins: [stackTotalPlugin]
    });
  }

  function drawRevenueByMonth(labels, revenues) {
    const canvas = document.getElementById("chart-revenue-month");
    if (!canvas) return;

    new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Doanh thu",
            data: revenues,
            borderColor: COLORS.primary,
            backgroundColor: COLORS.primarySoft,
            pointBackgroundColor: COLORS.primary,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: COLORS.grid },
            ticks: {
              callback: (v) => `${(v / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${formatMoney(ctx.parsed.y)}` } }
        }
      }
    });
  }

  function drawStatusShare(rows) {
    const canvas = document.getElementById("chart-status-share");
    if (!canvas) return;

    const sum = (key) => rows.reduce((s, r) => s + r[key], 0);
    const values = [sum("done"), sum("upcoming"), sum("cancelled")];
    const names = ["Hoàn thành", "Sắp diễn ra", "Đã huỷ"];
    const total = values.reduce((a, b) => a + b, 0);

    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: names.map((n, i) => `${n} (${values[i]})`),
        datasets: [
          {
            data: values,
            backgroundColor: [COLORS.done, COLORS.upcoming, COLORS.cancelled],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0";
                return ` ${names[ctx.dataIndex]}: ${ctx.parsed} lịch (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function drawTopServices(appointments, details, serviceMap) {
    const canvas = document.getElementById("chart-top-services");
    if (!canvas) return;

    // Chỉ tính các lịch không bị huỷ
    const activeIds = new Set(
      appointments
        .filter((a) => normalizeStatus(a.trang_thai) !== STATUS.DA_HUY)
        .map((a) => String(a.ma_lich_hen))
    );

    const counter = new Map();
    details.forEach((d) => {
      if (!activeIds.has(String(d.ma_lich_hen))) return;
      const id = String(d.ma_dich_vu);
      counter.set(id, (counter.get(id) || 0) + 1);
    });

    const top = [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_SERVICES)
      .map(([id, count]) => ({
        name: (serviceMap.get(id) || {}).ten_dich_vu || id,
        count
      }));

    const shorten = (s) => (s.length > 24 ? `${s.slice(0, 23)}…` : s);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels: top.map((t) => shorten(t.name)),
        datasets: [
          {
            label: "Lượt đặt",
            data: top.map((t) => t.count),
            backgroundColor: [COLORS.primary, "#7C93DA", "#8EA5DE", COLORS.pastel, "#B0C6E4"],
            borderRadius: 6,
            barThickness: 22
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => top[items[0].dataIndex].name,
              label: (ctx) => ` ${ctx.parsed.x} lượt đặt`
            }
          }
        }
      }
    });
  }

  // ----- Bảng lịch hẹn gần đây -----
  function renderRecentBookings({ appointments, details, userMap, petMap, serviceMap }) {
    const detailsByAppointment = new Map();
    details.forEach((d) => {
      const key = String(d.ma_lich_hen);
      if (!detailsByAppointment.has(key)) detailsByAppointment.set(key, []);
      detailsByAppointment.get(key).push(d);
    });

    const fullBookings = appointments.map((apt) => {
      const user = userMap.get(String(apt.ma_nguoi_dung)) || { ho_ten: "Khách lẻ", so_dien_thoai: "---" };
      const aptDetails = (detailsByAppointment.get(String(apt.ma_lich_hen)) || []).map((d) => {
        const pet = petMap.get(String(d.ma_thu_cung)) || { ten_thu_cung: "Bé cưng" };
        const srv = serviceMap.get(String(d.ma_dich_vu)) || { ten_dich_vu: "Dịch vụ" };
        return { ...d, ten_thu_cung: pet.ten_thu_cung, ten_dich_vu: srv.ten_dich_vu };
      });
      return { ...apt, user, details: aptDetails };
    });

    // Mới đặt nhất lên đầu, lấy 6 đơn
    fullBookings.sort(
      (a, b) => new Date(b.thoi_gian_tao || b.ngay_hen) - new Date(a.thoi_gian_tao || a.ngay_hen)
    );

    renderRecentTable(fullBookings.slice(0, 6));
  }

  function renderRecentTable(data) {
    const tbody = document.getElementById("dashboard-booking-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 25px; color: var(--purple-gray);">Chưa có dữ liệu lịch hẹn nào.</td></tr>`;
      return;
    }

    data.forEach((b) => {
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
      `;

      tbody.appendChild(tr);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }
})(typeof window !== "undefined" ? window : this);
