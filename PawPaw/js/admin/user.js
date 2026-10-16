
(function () {
    // =====================================================
    // 1. LẤY CÁC PHẦN TỬ HTML
    // =====================================================

    const searchForm = document.getElementById("customer-search-form");
    const searchInput = document.getElementById("customer-search");
    const resetButton = document.getElementById("customer-reset-button");

    const customerList = document.getElementById("customer-list");
    const totalCustomers = document.getElementById("total-customers");
    const resultCount = document.getElementById("customer-result-count");
    const emptyMessage = document.getElementById("customer-empty");

    let users = [];
    let pets = [];


    // =====================================================
    // 2. CHUẨN HÓA CHỮ ĐỂ TÌM KIẾM VÀ KIỂM TRA VAI TRÒ
    // =====================================================

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .trim();
    }

    function getUserRole(user) {
        return normalizeText(user.vai_tro);
    }

    function isManager(user) {
        const role = getUserRole(user);

        const managerRole = VAI_TRO && VAI_TRO.QUAN_LY
            ? normalizeText(VAI_TRO.QUAN_LY)
            : "quan ly";

        return role === managerRole || role === "admin";
    }

    function isCustomer(user) {
        const role = getUserRole(user);

        const customerRole = VAI_TRO && VAI_TRO.KHACH_HANG
            ? normalizeText(VAI_TRO.KHACH_HANG)
            : "khach hang";

        return role === customerRole;
    }

    function getRoleLabel(user) {
        if (isManager(user)) {
            return "Quản lý";
        }

        if (isCustomer(user)) {
            return "Khách hàng";
        }

        return user.vai_tro || "Chưa xác định";
    }


    // =====================================================
    // 3. ĐỌC DỮ LIỆU
    // =====================================================

    function loadUsers() {
        const data = Storage.getData(DATA_KEYS.USERS) || [];

        // Chỉ hiển thị tài khoản khách hàng và quản lý
        users = data.filter(function (user) {
            return isCustomer(user) || isManager(user);
        });
    }

    function loadPets() {
        pets = Storage.getData(DATA_KEYS.PETS) || [];
    }

    function getCustomerPets(customerId) {
        return pets.filter(function (pet) {
            return String(pet.ma_nguoi_dung) === String(customerId);
        });
    }


    // =====================================================
    // 4. TẠO DÒNG THÔNG TIN
    // =====================================================

    function createInfoLine(label, value) {
        const line = document.createElement("p");
        const labelElement = document.createElement("strong");

        labelElement.textContent = label + ": ";
        line.appendChild(labelElement);

        line.appendChild(
            document.createTextNode(
                value !== undefined && value !== null && value !== ""
                    ? String(value)
                    : "Chưa cập nhật"
            )
        );

        return line;
    }


    // =====================================================
    // 5. TẠO ẢNH ĐẠI DIỆN
    // =====================================================

    function createAvatar(user) {
        const avatar = document.createElement("div");
        avatar.className = "admin-user-avatar";

        const initials = document.createElement("span");

        initials.textContent = String(user.ho_ten || "ND")
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map(function (word) {
                return word.charAt(0);
            })
            .join("")
            .toUpperCase();

        if (user.anh_dai_dien) {
            const image = document.createElement("img");

            image.src = user.anh_dai_dien;
            image.alt = "Ảnh đại diện " + (user.ho_ten || "người dùng");

            image.addEventListener("error", function () {
                avatar.replaceChildren(initials);
            });

            avatar.appendChild(image);
        } else {
            avatar.appendChild(initials);
        }

        return avatar;
    }


    // =====================================================
    // 6. DANH SÁCH THÚ CƯNG
    // Chỉ hiển thị đối với tài khoản khách hàng
    // =====================================================

    function createPetSection(user) {
        const section = document.createElement("div");
        section.className = "admin-user-pets";

        const title = document.createElement("strong");
        title.textContent = "Thú cưng: ";
        section.appendChild(title);

        const customerPets = getCustomerPets(user.ma_nguoi_dung);

        if (customerPets.length === 0) {
            const noPet = document.createElement("span");
            noPet.textContent = "Chưa có thú cưng";
            section.appendChild(noPet);

            return section;
        }

        const petList = document.createElement("div");
        petList.className = "admin-user-pet-list";

        customerPets.forEach(function (pet) {
            const petLink = document.createElement("a");

            petLink.className = "admin-user-pet-link";
            petLink.href =
                "pet-mnm.html?id=" +
                encodeURIComponent(pet.ma_thu_cung);

            petLink.textContent =
                pet.ten_thu_cung || pet.ma_thu_cung;

            petLink.title =
                "Chỉnh sửa thông tin " +
                (pet.ten_thu_cung || "thú cưng");

            petList.appendChild(petLink);
        });

        section.appendChild(petList);

        return section;
    }


    // =====================================================
    // 7. TẠO CARD NGƯỜI DÙNG
    // =====================================================

    function createUserCard(user) {
        const card = document.createElement("article");
        card.className = "admin-user-card";

        const userId = String(user.ma_nguoi_dung || "");

        card.appendChild(createAvatar(user));

        const info = document.createElement("div");
        info.className = "admin-user-info";

        info.appendChild(
            createInfoLine("Mã người dùng", user.ma_nguoi_dung)
        );

        info.appendChild(
            createInfoLine("Họ và tên", user.ho_ten)
        );

        info.appendChild(
            createInfoLine("Email", user.email)
        );

        info.appendChild(
            createInfoLine("Số điện thoại", user.so_dien_thoai)
        );

        info.appendChild(
            createInfoLine("Vai trò", getRoleLabel(user))
        );

        // Không hiển thị mật khẩu thật
        info.appendChild(
            createInfoLine("Mật khẩu", "••••••••")
        );

        const bottom = document.createElement("div");
        bottom.className = "admin-user-card-bottom";

        const address = createInfoLine("Địa chỉ", user.dia_chi);
        address.className = "admin-user-address";

        bottom.appendChild(address);

        // Nút xóa tài khoản
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";

        // Giữ class cũ để tận dụng CSS hiện tại
        deleteButton.className =
            "admin-user-lock-button admin-user-delete-button";

        deleteButton.dataset.userId = userId;
        deleteButton.textContent = "Xóa";

        bottom.appendChild(deleteButton);
        info.appendChild(bottom);

        // Chỉ hiển thị thú cưng của khách hàng
        if (isCustomer(user)) {
            info.appendChild(createPetSection(user));
        }

        card.appendChild(info);

        return card;
    }


    // =====================================================
    // 8. HIỂN THỊ DANH SÁCH
    // =====================================================

    function renderUsers(userItems) {
        customerList.replaceChildren();

        if (userItems.length === 0) {
            emptyMessage.textContent = searchInput.value.trim()
                ? "Không tìm thấy người dùng phù hợp."
                : "Chưa có người dùng nào.";

            emptyMessage.style.display = "block";

            resultCount.textContent =
                "Hiển thị 0 / " + users.length + " người dùng.";

            return;
        }

        emptyMessage.style.display = "none";

        const fragment = document.createDocumentFragment();

        userItems.forEach(function (user) {
            fragment.appendChild(createUserCard(user));
        });

        customerList.appendChild(fragment);

        resultCount.textContent =
            "Hiển thị " + userItems.length +
            " / " + users.length + " người dùng.";
    }


    // =====================================================
    // 9. TÌM KIẾM NGƯỜI DÙNG
    // =====================================================

    function searchUsers() {
        const keyword = normalizeText(searchInput.value);

        const filteredUsers = users.filter(function (user) {
            const searchableValues = [
                user.ma_nguoi_dung,
                user.ho_ten,
                user.email,
                user.so_dien_thoai
            ];

            return searchableValues.some(function (value) {
                return normalizeText(value).includes(keyword);
            });
        });

        renderUsers(filteredUsers);
    }


    // =====================================================
    // 10. ĐẶT LẠI TÌM KIẾM
    // =====================================================

    function resetSearch() {
        searchInput.value = "";
        renderUsers(users);
    }


    // =====================================================
    // 11. KIỂM TRA TÀI KHOẢN ĐANG ĐĂNG NHẬP
    // =====================================================

    function getCurrentUserId() {
        const storedValue = localStorage.getItem(DATA_KEYS.CURRENT_USER);

        if (!storedValue) {
            return "";
        }

        // Storage.setCurrentUser() hiện lưu mã người dùng
        // dưới dạng chuỗi. Hỗ trợ thêm trường hợp dữ liệu
        // cũ lưu mã dưới dạng JSON.
        try {
            const parsedValue = JSON.parse(storedValue);

            if (typeof parsedValue === "string") {
                return parsedValue;
            }

            if (parsedValue && parsedValue.ma_nguoi_dung) {
                return String(parsedValue.ma_nguoi_dung);
            }
        } catch (error) {
            // Giá trị không phải JSON: dùng trực tiếp
        }

        return storedValue;
    }


    // =====================================================
    // 12. XÓA TÀI KHOẢN VÀ DỮ LIỆU LIÊN QUAN
    // =====================================================

    function deleteUser(userId) {
        const targetId = String(userId);

        const targetUser = users.find(function (user) {
            return String(user.ma_nguoi_dung) === targetId;
        });

        if (!targetUser) {
            alert("Không tìm thấy tài khoản cần xóa.");
            return;
        }

        // Không cho xóa tài khoản đang đăng nhập
        if (targetId === getCurrentUserId()) {
            alert("Bạn không thể xóa tài khoản đang đăng nhập.");
            return;
        }

        const allUsers = Storage.getData(DATA_KEYS.USERS) || [];

        // Không cho xóa quản lý cuối cùng
        if (isManager(targetUser)) {
            const managerCount = allUsers.filter(isManager).length;

            if (managerCount <= 1) {
                alert(
                    "Không thể xóa tài khoản quản lý cuối cùng."
                );
                return;
            }
        }

        const confirmed = confirm(
            "Bạn có chắc chắn muốn xóa tài khoản \"" +
            (targetUser.ho_ten || targetId) +
            "\"?\n\n" +
            "Thông tin tài khoản và dữ liệu liên quan trong " +
            "LocalStorage sẽ bị xóa. Thao tác này không thể hoàn tác."
        );

        if (!confirmed) {
            return;
        }

        try {
            // Đọc dữ liệu hiện tại trước khi cập nhật
            const allPets = Storage.getData(DATA_KEYS.PETS) || [];
            const allAppointments =
                Storage.getData(DATA_KEYS.APPOINTMENTS) || [];
            const allDetails =
                Storage.getData(DATA_KEYS.APPOINTMENT_DETAILS) || [];
            const allReviews =
                Storage.getData(DATA_KEYS.REVIEWS) || [];

            // Tìm thú cưng thuộc tài khoản
            const userPets = allPets.filter(function (pet) {
                return String(pet.ma_nguoi_dung) === targetId;
            });

            const petIds = new Set(
                userPets.map(function (pet) {
                    return String(pet.ma_thu_cung);
                })
            );

            // Tìm lịch hẹn thuộc tài khoản hoặc thú cưng của tài khoản
            const userAppointments = allAppointments.filter(function (item) {
                return (
                    String(item.ma_nguoi_dung) === targetId ||
                    petIds.has(String(item.ma_thu_cung))
                );
            });

            const appointmentIds = new Set(
                userAppointments.map(function (item) {
                    return String(item.ma_lich_hen);
                })
            );

            // Loại bỏ chi tiết lịch hẹn liên quan
            const remainingDetails = allDetails.filter(function (item) {
                return (
                    !appointmentIds.has(String(item.ma_lich_hen)) &&
                    !petIds.has(String(item.ma_thu_cung))
                );
            });

            // Loại bỏ đánh giá thuộc tài khoản
            const remainingReviews = allReviews.filter(function (item) {
                return String(item.ma_nguoi_dung) !== targetId;
            });

            // Tạo các danh sách sau khi xóa
            const remainingUsers = allUsers.filter(function (user) {
                return String(user.ma_nguoi_dung) !== targetId;
            });

            const remainingPets = allPets.filter(function (pet) {
                return String(pet.ma_nguoi_dung) !== targetId;
            });

            const remainingAppointments =
                allAppointments.filter(function (item) {
                    return (
                        String(item.ma_nguoi_dung) !== targetId &&
                        !petIds.has(String(item.ma_thu_cung))
                    );
                });

            // Ghi lại LocalStorage
            Storage.setData(DATA_KEYS.USERS, remainingUsers);
            Storage.setData(DATA_KEYS.PETS, remainingPets);
            Storage.setData(
                DATA_KEYS.APPOINTMENTS,
                remainingAppointments
            );
            Storage.setData(
                DATA_KEYS.APPOINTMENT_DETAILS,
                remainingDetails
            );
            Storage.setData(DATA_KEYS.REVIEWS, remainingReviews);

            // Nếu dữ liệu ghi thành công, tải lại danh sách
            loadUsers();
            loadPets();

            totalCustomers.textContent = users.length;

            searchUsers();

            alert("Đã xóa tài khoản khỏi dữ liệu LocalStorage.");

        } catch (error) {
            console.error("Lỗi khi xóa tài khoản:", error);

            alert(
                "Không thể xóa tài khoản hoàn toàn. " +
                "Vui lòng kiểm tra Console và dữ liệu LocalStorage."
            );
        }
    }


    // =====================================================
    // 13. KHỞI TẠO TRANG
    // =====================================================

    async function init() {
        try {
            await Storage.initData();

            loadUsers();
            loadPets();

            totalCustomers.textContent = users.length;

            renderUsers(users);

            // Tìm kiếm bằng Enter hoặc nút kính lúp
            searchForm.addEventListener("submit", function (event) {
                event.preventDefault();
                searchUsers();
            });

            // Đặt lại từ khóa tìm kiếm
            resetButton.addEventListener("click", function () {
                resetSearch();
            });

            // Bắt sự kiện xóa tài khoản
            customerList.addEventListener("click", function (event) {
                const button = event.target.closest(
                    ".admin-user-delete-button"
                );

                if (!button) {
                    return;
                }

                deleteUser(button.dataset.userId);
            });

        } catch (error) {
            console.error("Lỗi tải danh sách người dùng:", error);

            customerList.replaceChildren();

            emptyMessage.textContent =
                "Không thể tải dữ liệu. Vui lòng kiểm tra Console.";

            emptyMessage.style.display = "block";
            totalCustomers.textContent = "—";

            resultCount.textContent =
                "Không thể tải danh sách người dùng.";
        }
    }

    init();
})();
