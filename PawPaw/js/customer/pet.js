(function () {
  "use strict";

  // =========================================================
  // FIELD THEO ERD / thu_cung.json
  // =========================================================
  const F = {
    id: "ma_thu_cung",
    owner: "ma_nguoi_dung",
    name: "ten_thu_cung",
    type: "loai",
    breed: "giong",
    gender: "gioi_tinh",
    birthYear: "nam_sinh",
    weight: "can_nang",
    color: "mau_long",
    photo: "anh_thu_cung",
    note: "ghi_chu"
  };

  const KEY = DATA_KEYS.PETS;
  const ID_PREFIX = "TC";
  const MODAL_ID = "pet-modal";
  const MAX_PET_AGE = 30;

  const TYPE_LABEL = {
    [LOAI_THU_CUNG.MEO]: "Mèo",
    [LOAI_THU_CUNG.CHO]: "Chó"
  };

  const TYPE_ICON = {
    [LOAI_THU_CUNG.MEO]: "🐱",
    [LOAI_THU_CUNG.CHO]: "🐶"
  };

  const GENDER_LABEL = {
    [GIOI_TINH.CAI]: "Cái",
    [GIOI_TINH.DUC]: "Đực"
  };

  let user = null;
  let editingId = null;

  // =========================================================
  // TIỆN ÍCH
  // =========================================================

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function allPets() {
    return Storage.getData(KEY) || [];
  }

  // Chỉ lấy thú cưng của user đang đăng nhập
  function myPets() {
    return allPets().filter(function (p) {
      return String(p[F.owner]) === String(user.ma_nguoi_dung);
    });
  }

  // Lấy pet theo id, đồng thời kiểm tra quyền sở hữu
  function myPetById(id) {
    return myPets().find(function (p) {
      return String(p[F.id]) === String(id);
    }) || null;
  }

  // Chỉ chấp nhận URL http/https
  function safeUrl(url) {
    const text = url == null ? "" : String(url).trim();
    return /^https?:\/\/\S+$/i.test(text) ? text : "";
  }

  // Ảnh Unsplash gốc rất nặng → thêm tham số thu nhỏ
  function thumbUrl(url) {
    if (url.indexOf("images.unsplash.com") !== -1 && url.indexOf("?") === -1) {
      return url + "?w=600&q=70&auto=format&fit=crop";
    }
    return url;
  }

  function ageText(year) {
    const y = Number(year);
    if (!Number.isInteger(y) || y <= 0) return "";

    const diff = new Date().getFullYear() - y;
    return diff <= 0 ? "dưới 1 tuổi" : "khoảng " + diff + " tuổi";
  }

  function parseWeight(value) {
    return Number(String(value).replace(",", "."));
  }

  // Pet có đang nằm trong lịch hẹn chờ xác nhận / đã xác nhận không
  // (chi_tiet_lich_hen.ma_thu_cung → ma_lich_hen → lich_hen.trang_thai)
  function isPetInActiveBooking(petId) {
    const details = Storage.getData(DATA_KEYS.APPOINTMENT_DETAILS) || [];
    const appointments = Storage.getData(DATA_KEYS.APPOINTMENTS) || [];
    const active = [TRANG_THAI_LICH_HEN.CHO_XAC_NHAN, TRANG_THAI_LICH_HEN.DA_XAC_NHAN];

    return details.some(function (d) {
      if (String(d.ma_thu_cung) !== String(petId)) return false;

      const appt = appointments.find(function (a) {
        return String(a.ma_lich_hen) === String(d.ma_lich_hen);
      });

      return appt && active.indexOf(appt.trang_thai) !== -1;
    });
  }

  function photoHtml(p, large) {
    const type = Number(p[F.type]);
    const url = safeUrl(p[F.photo]);

    return `
      <div class="pet-card-photo${large ? " is-large" : ""}">
        <span>${TYPE_ICON[type] || "🐾"}</span>
        ${url
          ? `<img src="${escapeHtml(thumbUrl(url))}" alt="${escapeHtml(p[F.name])}"
                  loading="lazy" onerror="this.style.display='none'">`
          : ""}
      </div>
    `;
  }

  // =========================================================
  // VALIDATE
  // =========================================================

  function validateName(value) {
    const required = Validation.validateRequired(value, "Tên thú cưng");
    if (required) return required;

    const name = value.trim();
    if (name.length > 50) return "Tên thú cưng không quá 50 ký tự";

    const duplicated = myPets().some(function (p) {
      return String(p[F.id]) !== String(editingId || "") &&
        String(p[F.name]).trim().toLowerCase() === name.toLowerCase();
    });

    return duplicated ? "Bạn đã có thú cưng trùng tên này" : "";
  }

  function validateBirthYear(value) {
    if (!String(value).trim()) return "";

    const year = Number(value);
    const now = new Date().getFullYear();

    if (!Number.isInteger(year)) return "Năm sinh phải là số nguyên";
    if (year > now) return "Năm sinh không được ở tương lai";
    if (year < now - MAX_PET_AGE) return "Năm sinh không hợp lệ (tối đa " + MAX_PET_AGE + " năm trước)";

    return "";
  }

  function validateWeight(value) {
    const required = Validation.validateRequired(value, "Cân nặng");
    if (required) return required;

    const weight = parseWeight(value);
    if (!Number.isFinite(weight) || weight <= 0) return "Cân nặng phải lớn hơn 0";
    if (weight > 100) return "Cân nặng không hợp lệ (tối đa 100 kg)";

    return "";
  }

  function validatePhoto(value) {
    const url = String(value).trim();
    if (!url) return "";

    return safeUrl(url) ? "" : "Link ảnh phải bắt đầu bằng http:// hoặc https://";
  }

  // Trả về object dữ liệu nếu hợp lệ, null nếu có lỗi
  function readAndValidateForm() {
    const el = {
      name: $("pet-ten"),
      type: $("pet-loai"),
      gender: $("pet-gioi-tinh"),
      breed: $("pet-giong"),
      color: $("pet-mau-long"),
      birthYear: $("pet-nam-sinh"),
      weight: $("pet-can-nang"),
      photo: $("pet-anh"),
      note: $("pet-ghi-chu")
    };

    const results = [
      Validation.validateField(el.name, validateName),
      Validation.validateField(el.type, function (v) {
        return Validation.validateRequired(v, "Loại thú cưng");
      }),
      Validation.validateField(el.gender, function (v) {
        return Validation.validateRequired(v, "Giới tính");
      }),
      Validation.validateField(el.birthYear, validateBirthYear),
      Validation.validateField(el.weight, validateWeight),
      Validation.validateField(el.photo, validatePhoto)
    ];

    if (results.indexOf(false) !== -1) return null;

    return {
      [F.name]: el.name.value.trim(),
      [F.type]: Number(el.type.value),
      [F.breed]: el.breed.value.trim(),
      [F.gender]: Number(el.gender.value),
      [F.birthYear]: el.birthYear.value.trim() ? Number(el.birthYear.value) : null,
      [F.weight]: parseWeight(el.weight.value),
      [F.color]: el.color.value.trim(),
      [F.photo]: el.photo.value.trim() || null,
      [F.note]: el.note.value.trim()
    };
  }

  // =========================================================
  // RENDER DANH SÁCH
  // =========================================================

  function cardHtml(p) {
    const id = p[F.id];
    const type = Number(p[F.type]);
    const gender = Number(p[F.gender]);
    const age = ageText(p[F.birthYear]);

    return `
      <article class="pet-card">
        ${photoHtml(p, false)}
        <div>
          <h3 class="pet-card-name">${escapeHtml(p[F.name])}</h3>
          <p class="pet-card-meta">
            ${TYPE_LABEL[type] || "Khác"} · ${GENDER_LABEL[gender] || "Chưa rõ"}
            ${p[F.breed] ? " · " + escapeHtml(p[F.breed]) : ""}
          </p>
          <p class="pet-card-meta">
            ${escapeHtml(p[F.weight])} kg${age ? " · " + escapeHtml(age) : ""}
            ${p[F.color] ? " · Lông " + escapeHtml(String(p[F.color]).toLowerCase()) : ""}
          </p>
        </div>
        <div class="pet-card-actions">
          <a class="btn btn-secondary btn-sm"
             href="pet-detail.html?id=${encodeURIComponent(id)}">Chi tiết</a>
          <button type="button" class="btn btn-primary btn-sm"
                  data-action="edit" data-id="${escapeHtml(id)}">Sửa</button>
          <button type="button" class="btn btn-danger btn-sm"
                  data-action="delete" data-id="${escapeHtml(id)}">Xóa</button>
        </div>
      </article>
    `;
  }

  function renderList() {
    const box = $("pet-list");
    const pets = myPets();

    $("pet-count").textContent = pets.length;

    if (pets.length === 0) {
      box.innerHTML = `
        <div class="empty-state">
          <p>Bạn chưa có thú cưng nào.</p>
          <button type="button" class="btn btn-primary" data-action="add">
            Thêm thú cưng đầu tiên
          </button>
        </div>
      `;
      return;
    }

    box.innerHTML = pets.map(cardHtml).join("");
  }

  // =========================================================
  // MODAL THÊM / SỬA
  // =========================================================

  function resetForm() {
    const form = $("pet-form");
    form.reset();
    $("pet-id").value = "";

    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      Validation.clearError(input);
    });
  }

  function openAddModal() {
    editingId = null;
    resetForm();

    $("pet-modal-title").textContent = "Thêm thú cưng";

    Common.openModal(MODAL_ID);
    $("pet-ten").focus();
  }

  function openEditModal(id) {
    const pet = myPetById(id);

    if (!pet) {
      Common.showToast("Không tìm thấy thú cưng.", "error");
      return;
    }

    editingId = String(id);
    resetForm();

    $("pet-modal-title").textContent = "Sửa thông tin thú cưng";
    $("pet-id").value = pet[F.id];
    $("pet-ten").value = pet[F.name] || "";
    $("pet-loai").value = pet[F.type] != null ? String(pet[F.type]) : "";
    $("pet-gioi-tinh").value = pet[F.gender] != null ? String(pet[F.gender]) : "";
    $("pet-giong").value = pet[F.breed] || "";
    $("pet-mau-long").value = pet[F.color] || "";
    $("pet-nam-sinh").value = pet[F.birthYear] != null ? pet[F.birthYear] : "";
    $("pet-can-nang").value = pet[F.weight] != null ? pet[F.weight] : "";
    $("pet-anh").value = pet[F.photo] || "";
    $("pet-ghi-chu").value = pet[F.note] || "";

    Common.openModal(MODAL_ID);
    $("pet-ten").focus();
  }

  function closePetModal() {
    Common.closeModal(MODAL_ID);
    editingId = null;

    // Xóa ?edit= khỏi URL để reload không mở lại modal
    if (Common.getQueryParam("edit")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const data = readAndValidateForm();
    if (!data) return;

    if (editingId) {
      // Sửa: kiểm tra lại quyền sở hữu
      if (!myPetById(editingId)) {
        Common.showToast("Không tìm thấy thú cưng.", "error");
        return;
      }

      const updated = Object.assign({}, data, { [F.id]: editingId });
      Storage.updateItem(KEY, F.id, updated);
      Common.showToast("Cập nhật thú cưng thành công.");
    } else {
      // Thêm mới
      const newPet = Object.assign({
        [F.id]: Storage.generateId(ID_PREFIX, KEY, F.id),
        [F.owner]: user.ma_nguoi_dung
      }, data);

      Storage.addItem(KEY, newPet);
      Common.showToast("Thêm thú cưng thành công.");
    }

    closePetModal();
    renderList();
  }

  // =========================================================
  // XÓA
  // =========================================================

  // Trả về true nếu đã xóa
  function deletePet(id) {
    const pet = myPetById(id);

    if (!pet) {
      Common.showToast("Không tìm thấy thú cưng.", "error");
      return false;
    }

    if (isPetInActiveBooking(id)) {
      Common.showToast("Thú cưng đang có lịch hẹn chưa hoàn tất, không thể xóa.", "error", 4000);
      return false;
    }

    if (!window.confirm('Bạn có chắc muốn xóa "' + pet[F.name] + '"?')) {
      return false;
    }

    Storage.deleteItem(KEY, F.id, id);
    Common.showToast("Đã xóa thú cưng.");
    return true;
  }

  // =========================================================
  // TRANG DANH SÁCH (pet.html)
  // =========================================================

  function initList() {
    renderList();

    $("btn-add-pet").addEventListener("click", openAddModal);
    $("btn-close-modal").addEventListener("click", closePetModal);
    $("btn-cancel-modal").addEventListener("click", closePetModal);
    $("pet-form").addEventListener("submit", handleSubmit);

    // Nhập lại thì xóa lỗi của ô đó
    $("pet-form").addEventListener("input", function (event) {
      Validation.clearError(event.target);
    });
    $("pet-form").addEventListener("change", function (event) {
      Validation.clearError(event.target);
    });

    // Bấm nền tối để đóng modal
    $(MODAL_ID).addEventListener("click", function (event) {
      if (event.target === $(MODAL_ID)) closePetModal();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closePetModal();
    });

    // Nút trên card (event delegation)
    $("pet-list").addEventListener("click", function (event) {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "add") openAddModal();
      if (action === "edit") openEditModal(id);
      if (action === "delete" && deletePet(id)) renderList();
    });

    // pet.html?edit=TC001 → mở sẵn modal sửa (nút Sửa ở trang chi tiết)
    const editId = Common.getQueryParam("edit");
    if (editId) openEditModal(editId);
  }

  // =========================================================
  // TRANG CHI TIẾT (pet-detail.html?id=...)
  // =========================================================

  function initDetail() {
    const box = $("pet-detail");
    const id = Common.getQueryParam("id");
    const pet = id ? myPetById(id) : null;

    if (!pet) {
      box.innerHTML = `
        <div class="empty-state">
          <p>Không tìm thấy thú cưng này.</p>
          <a class="btn btn-primary" href="pet.html">Quay lại danh sách</a>
        </div>
      `;
      return;
    }

    const type = Number(pet[F.type]);
    const gender = Number(pet[F.gender]);
    const age = ageText(pet[F.birthYear]);

    document.title = "PawPaw - " + pet[F.name];

    box.innerHTML = `
      <div class="detail-card">
        ${photoHtml(pet, true)}
        <h1 class="page-title">${escapeHtml(pet[F.name])}</h1>

        <div class="detail-list">
          <div><span>Mã thú cưng</span><span>${escapeHtml(pet[F.id])}</span></div>
          <div><span>Loại</span><span>${TYPE_LABEL[type] || "Khác"}</span></div>
          <div><span>Giới tính</span><span>${GENDER_LABEL[gender] || "Chưa rõ"}</span></div>
          <div><span>Giống</span><span>${escapeHtml(pet[F.breed]) || "—"}</span></div>
          <div><span>Màu lông</span><span>${escapeHtml(pet[F.color]) || "—"}</span></div>
          <div>
            <span>Năm sinh</span>
            <span>${pet[F.birthYear] ? escapeHtml(pet[F.birthYear]) : "—"}${age ? " (" + escapeHtml(age) + ")" : ""}</span>
          </div>
          <div><span>Cân nặng</span><span>${escapeHtml(pet[F.weight])} kg</span></div>
          <div><span>Ghi chú</span><span>${escapeHtml(pet[F.note]) || "—"}</span></div>
        </div>

        <div class="pet-card-actions">
          <a class="btn btn-secondary" href="pet.html">← Quay lại</a>
          <button type="button" class="btn btn-primary" id="btn-edit-pet">Sửa</button>
          <button type="button" class="btn btn-danger" id="btn-delete-pet">Xóa</button>
        </div>
      </div>
    `;

    $("btn-edit-pet").addEventListener("click", function () {
      window.location.href = "pet.html?edit=" + encodeURIComponent(id);
    });

    $("btn-delete-pet").addEventListener("click", function () {
      if (deletePet(id)) {
        setTimeout(function () {
          window.location.href = "pet.html";
        }, 700);
      }
    });
  }

  // =========================================================
  // KHỞI CHẠY
  // =========================================================

  async function init() {
    await Storage.initData();

    user = Storage.getCurrentUser();

    // auth-guard.js đã redirect; đây chỉ là lớp bảo vệ thứ hai
    if (!user || user.vai_tro !== VAI_TRO.KHACH_HANG) return;

    if ($("pet-list")) {
      initList();
    } else if ($("pet-detail")) {
      initDetail();
    }
  }

  init();
})();