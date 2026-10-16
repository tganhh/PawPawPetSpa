(function (global) {
    "use strict";

    let services = [];
    let filteredServices = [];

    function getDK() { return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : { SERVICES: "dich_vu" }; }
    function esc(val) { return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
    function money(val) { const n = Number(val); return (!n || n <= 0) ? "-" : n.toLocaleString("vi-VN") + " đ"; }
    function toast(msg, type) { if (typeof Common !== "undefined" && Common.showToast) Common.showToast(msg, type); else alert(msg); }

    async function init() {
        if (typeof Storage !== "undefined" && Storage.initData) await Storage.initData();
        const DK = getDK();
        services = (typeof Storage !== "undefined") ? (Storage.getData(DK.SERVICES) || []) : [];
        filteredServices = [...services];
        initFilters();
        renderTable();
        bindEvents();
    }

    function initFilters() {
        const groupFilter = document.getElementById("service-group-filter");
        if (!groupFilter) return;
        const groups = [...new Set(services.map(s => s.nhom_dich_vu).filter(Boolean))];
        groups.forEach(group => {
            const opt = document.createElement("option"); opt.value = group; opt.textContent = group;
            groupFilter.appendChild(opt);
        });
    }

    function renderTable() {
        const tbody = document.getElementById("service-table-body");
        const countEl = document.getElementById("service-count");
        if (!tbody) return;
        if (countEl) countEl.textContent = filteredServices.length;

        if (filteredServices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="review-empty">Không tìm thấy dịch vụ nào phù hợp.</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredServices.map(svc => {
            const imgHtml = svc.anh_dich_vu 
                ? `<img src="${esc(svc.anh_dich_vu)}" alt="IMG" class="admin-service-img">`
                : `<div class="admin-service-img">No IMG</div>`;

            return `
                <tr>
                    <td>${imgHtml}</td>
                    <td class="col-code">${esc(svc.ma_dich_vu)}</td>
                    <td style="font-weight: 800;">${esc(svc.ten_dich_vu)}</td>
                    <td style="color: var(--purple-gray); font-weight: 700;">${esc(svc.nhom_dich_vu)}</td>
                    <td>${money(svc.gia_duoi_5kg)}</td>
                    <td>${money(svc.gia_5_15kg)}</td>
                    <td>${money(svc.gia_tren_15kg)}</td>
                    <td style="color: var(--purple-gray);">${esc(svc.thoi_gian_du_kien) || "-"}</td>
                    <td>
                        <div class="review-actions">
                            <a href="service-update.html?id=${esc(svc.ma_dich_vu)}" class="btn btn-sm btn-primary">Sửa</a>
                            <button type="button" class="btn btn-sm btn-danger btn-delete" data-id="${esc(svc.ma_dich_vu)}">Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function bindEvents() {
        const searchInput = document.getElementById("service-search");
        const groupFilter = document.getElementById("service-group-filter");
        const tbody = document.getElementById("service-table-body");

        function applyFilters() {
            const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
            const group = groupFilter ? groupFilter.value : "";
            filteredServices = services.filter(s => {
                const matchKey = !keyword || ((s.ten_dich_vu || "").toLowerCase().includes(keyword) || (s.ma_dich_vu || "").toLowerCase().includes(keyword));
                const matchGroup = !group || s.nhom_dich_vu === group;
                return matchKey && matchGroup;
            });
            renderTable();
        }

        if (searchInput) searchInput.addEventListener("input", applyFilters);
        if (groupFilter) groupFilter.addEventListener("change", applyFilters);

        if (tbody) {
            tbody.addEventListener("click", function(e) {
                if (e.target.classList.contains("btn-delete")) deleteService(e.target.getAttribute("data-id"));
            });
        }
    }

    function deleteService(id) {
        if (!confirm(`Bạn có chắc chắn muốn xóa dịch vụ [${id}] không?`)) return;
        const index = services.findIndex(s => s.ma_dich_vu === id);
        if (index !== -1) {
            services.splice(index, 1);
            Storage.saveData(getDK().SERVICES, services);
            document.getElementById("service-search")?.dispatchEvent(new Event("input"));
            toast(`Đã xóa dịch vụ ${id} thành công!`, "success");
        } else {
            toast("Không tìm thấy dịch vụ để xóa.", "error");
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();

})(typeof window !== "undefined" ? window : this);