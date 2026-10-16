/**
 * js/util/pagination.js
 * Tiện ích phân trang dùng chung (hiện dùng ở Quản trị lịch hẹn, có thể tái sử dụng cho trang khác).
 *
 * Cách dùng:
 *   const page = Pagination.paginate(list, currentPage, 20);   // -> { items, page, totalPages, total, from, to }
 *   Pagination.render(containerEl, page, (newPage) => { ... }, "lịch hẹn");
 */
(function (global) {
  "use strict";

  /**
   * Cắt mảng theo trang. Tự chặn page nằm trong [1, totalPages].
   */
  function paginate(list, page, pageSize) {
    const size = Math.max(1, Number(pageSize) || 20);
    const total = Array.isArray(list) ? list.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (current - 1) * size;
    const items = total ? list.slice(start, start + size) : [];

    return {
      items,
      page: current,
      pageSize: size,
      total,
      totalPages,
      from: total ? start + 1 : 0,
      to: total ? start + items.length : 0
    };
  }

  /**
   * Danh sách số trang hiển thị, có dấu "…" khi quá nhiều trang.
   * Ví dụ: [1, "…", 4, 5, 6, "…", 40]
   */
  function getPageList(current, totalPages) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(totalPages - 1, current + 1);

    if (left > 2) pages.push("…");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);

    return pages;
  }

  /**
   * Vẽ thanh phân trang vào container.
   * @param {HTMLElement} container
   * @param {Object} state - kết quả của paginate()
   * @param {Function} onChange - gọi với số trang mới khi người dùng bấm
   * @param {string} [unitLabel] - nhãn đơn vị, ví dụ "lịch hẹn"
   */
  function render(container, state, onChange, unitLabel) {
    if (!container) return;

    const unit = unitLabel || "kết quả";

    if (state.total === 0) {
      container.innerHTML = "";
      return;
    }

    const info = `Hiển thị <strong>${state.from}–${state.to}</strong> trong <strong>${state.total}</strong> ${unit}`;

    // Chỉ 1 trang thì chỉ hiện dòng thông tin
    if (state.totalPages <= 1) {
      container.innerHTML = `<div class="pagination-info">${info}</div>`;
      return;
    }

    const btn = (label, page, opts = {}) => {
      const cls = ["page-btn"];
      if (opts.active) cls.push("active");
      const disabled = opts.disabled ? " disabled" : "";
      const aria = opts.aria ? ` aria-label="${opts.aria}"` : "";
      const cur = opts.active ? ' aria-current="page"' : "";
      return `<button type="button" class="${cls.join(" ")}" data-page="${page}"${disabled}${aria}${cur}>${label}</button>`;
    };

    const numbers = getPageList(state.page, state.totalPages)
      .map((p) => (p === "…" ? `<span class="page-ellipsis">…</span>` : btn(p, p, { active: p === state.page })))
      .join("");

    container.innerHTML = `
      <div class="pagination-info">${info}</div>
      <nav class="pagination" aria-label="Phân trang">
        ${btn("«", 1, { disabled: state.page === 1, aria: "Trang đầu" })}
        ${btn("‹", state.page - 1, { disabled: state.page === 1, aria: "Trang trước" })}
        ${numbers}
        ${btn("›", state.page + 1, { disabled: state.page === state.totalPages, aria: "Trang sau" })}
        ${btn("»", state.totalPages, { disabled: state.page === state.totalPages, aria: "Trang cuối" })}
      </nav>
    `;

    container.querySelectorAll("button[data-page]").forEach((el) => {
      el.addEventListener("click", () => {
        const target = Number(el.dataset.page);
        if (!el.disabled && target !== state.page && typeof onChange === "function") {
          onChange(target);
        }
      });
    });
  }

  const Pagination = { paginate, getPageList, render };

  if (typeof window !== "undefined") {
    window.Pagination = Pagination;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Pagination;
  }
})(typeof window !== "undefined" ? window : this);
