(function () {
    // =====================================================
    // 1. LẤY CÁC PHẦN TỬ HTML
    // =====================================================

    const pageTitle = document.getElementById("pet-page-title");
    const form = document.getElementById("pet-form");
    const photoPreview = document.getElementById("pet-photo-preview");

    const fields = {
        id: document.getElementById("pet-id"),
        owner: document.getElementById("pet-owner"),
        name: document.getElementById("pet-name"),
        breed: document.getElementById("pet-breed"),
        type: document.getElementById("pet-type"),
        gender: document.getElementById("pet-gender"),
        year: document.getElementById("pet-year"),
        weight: document.getElementById("pet-weight"),
        color: document.getElementById("pet-color"),
        photo: document.getElementById("pet-photo"),
        note: document.getElementById("pet-note")
    };

    const USER_LIST_URL = "user.html";

    let currentPet = null;


    // =====================================================
    // 2. ẢNH THÚ CƯNG (có emoji dự phòng khi không có ảnh / ảnh lỗi)
    // =====================================================

    function getTypeEmoji(type) {
        return Number(type) === LOAI_THU_CUNG.MEO ? "🐱" : "🐶";
    }

    function renderPhoto() {
        photoPreview.replaceChildren();
        photoPreview.textContent = getTypeEmoji(fields.type.value);

        const url = fields.photo.value.trim();

        if (!url) return;

        const image = document.createElement("img");

        image.src = url;
        image.alt = "Ảnh thú cưng";

        image.addEventListener("error", function () {
            image.remove();
        });

        photoPreview.appendChild(image);
    }


    // =====================================================
    // 3. ĐỔ DỮ LIỆU THÚ CƯNG VÀO FORM
    // =====================================================

    function fillForm(pet, owner) {
        fields.id.value = pet.ma_thu_cung;

        fields.owner.value = owner
            ? (owner.ho_ten || "") + " (" + owner.ma_nguoi_dung + ")"
            : pet.ma_nguoi_dung;

        fields.name.value = pet.ten_thu_cung || "";
        fields.breed.value = pet.giong || "";
        fields.type.value = String(pet.loai);
        fields.gender.value = String(pet.gioi_tinh);
        fields.year.value = pet.nam_sinh ?? "";
        fields.weight.value = pet.can_nang ?? "";
        fields.color.value = pet.mau_long || "";
        fields.photo.value = pet.anh_thu_cung || "";
        fields.note.value = pet.ghi_chu || "";

        pageTitle.textContent = "Chỉnh sửa thú cưng: " + (pet.ten_thu_cung || pet.ma_thu_cung);

        renderPhoto();
    }


    // =====================================================
    // 4. KIỂM TRA DỮ LIỆU
    // =====================================================

    function validateYear(value) {
        const required = validateRequired(value, "Năm sinh");
        if (required) return required;

        const year = Number(value);
        const currentYear = new Date().getFullYear();

        if (!Number.isInteger(year) || year < 1990 || year > currentYear) {
            return "Năm sinh phải từ 1990 đến " + currentYear;
        }

        return "";
    }

    function validateWeight(value) {
        const required = validateRequired(value, "Cân nặng");
        if (required) return required;

        const weight = Number(value);

        if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
            return "Cân nặng phải lớn hơn 0 và không quá 100 kg";
        }

        return "";
    }

    // Ảnh không bắt buộc, nhưng nếu nhập thì phải là http(s)
    function validatePhotoUrl(value) {
        const url = String(value || "").trim();

        if (!url) return "";

        try {
            const parsed = new URL(url);

            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                return "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://";
            }
        } catch (error) {
            return "Đường dẫn ảnh không hợp lệ";
        }

        return "";
    }

    function validateForm() {
        const results = [
            validateField(fields.name, function (v) {
                return validateRequired(v, "Tên thú cưng");
            }),
            validateField(fields.breed, function (v) {
                return validateRequired(v, "Giống");
            }),
            validateField(fields.year, validateYear),
            validateField(fields.weight, validateWeight),
            validateField(fields.photo, validatePhotoUrl)
        ];

        return results.every(Boolean);
    }


    // =====================================================
    // 5. LƯU THAY ĐỔI
    // =====================================================

    function savePet(event) {
        event.preventDefault();

        if (!currentPet) return;

        if (!validateForm()) {
            showToast("Vui lòng kiểm tra lại thông tin", "error");
            return;
        }

        const photoUrl = fields.photo.value.trim();

        const updatedPet = {
            ma_thu_cung: currentPet.ma_thu_cung,
            ten_thu_cung: fields.name.value.trim(),
            giong: fields.breed.value.trim(),
            loai: Number(fields.type.value),
            gioi_tinh: Number(fields.gender.value),
            nam_sinh: Number(fields.year.value),
            can_nang: Number(fields.weight.value),
            mau_long: fields.color.value.trim(),
            anh_thu_cung: photoUrl ? photoUrl : null,
            ghi_chu: fields.note.value.trim()
        };

        const saved = Storage.updateItem(DATA_KEYS.PETS, "ma_thu_cung", updatedPet);

        if (!saved) {
            showToast("Không thể lưu thay đổi", "error");
            return;
        }

        showToast("Đã cập nhật thông tin thú cưng");

        // Chờ một chút để người dùng thấy thông báo rồi quay về danh sách khách hàng
        setTimeout(function () {
            window.location.href = USER_LIST_URL;
        }, 800);
    }


    // =====================================================
    // 6. SỰ KIỆN
    // =====================================================

    function bindEvents() {
        form.addEventListener("submit", savePet);

        // Xem trước ảnh khi đổi URL hoặc đổi loài
        fields.photo.addEventListener("input", renderPhoto);
        fields.type.addEventListener("change", renderPhoto);

        // Xóa lỗi khi người dùng bắt đầu sửa lại
        ["name", "breed", "year", "weight", "photo"].forEach(function (key) {
            fields[key].addEventListener("input", function () {
                clearError(fields[key]);
            });
        });
    }


    // =====================================================
    // 7. KHỞI TẠO TRANG
    // =====================================================

    async function init() {
        try {
            await Storage.initData();

            const petId = getQueryParam("id");

            currentPet = petId
                ? Storage.getItemById(DATA_KEYS.PETS, "ma_thu_cung", petId)
                : null;

            // Trang chỉ mở từ user.html; thiếu hoặc sai mã thú cưng thì quay về
            if (!currentPet) {
                window.location.replace(USER_LIST_URL);
                return;
            }

            const owner = Storage.getItemById(
                DATA_KEYS.USERS,
                "ma_nguoi_dung",
                currentPet.ma_nguoi_dung
            );

            fillForm(currentPet, owner);
            bindEvents();

        } catch (error) {
            console.error("Lỗi tải thông tin thú cưng:", error);
            showToast("Không thể tải dữ liệu. Vui lòng kiểm tra Console.", "error");
        }
    }

    init();
})();