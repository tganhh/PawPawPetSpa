
/**
 * js/component/chatbot.js
 * Chatbot PawPaw - Gemini API + truy vấn dữ liệu dịch vụ JSON
 */

(function () {
    "use strict";

    // Tránh tạo chatbot nhiều lần
    if (document.getElementById("pawpawChatBox")) return;

    // =====================================================
    // 1. TẢI CSS
    // =====================================================

    const scriptElement = document.currentScript;
    const scriptUrl = scriptElement
        ? scriptElement.src
        : new URL("js/component/chatbot.js", document.baseURI).href;

    const cssUrl = new URL("../../css/chatbot.css", scriptUrl).href;

    if (!document.getElementById("pawpaw-chatbot-css")) {
        const link = document.createElement("link");
        link.id = "pawpaw-chatbot-css";
        link.rel = "stylesheet";
        link.href = cssUrl;
        document.head.appendChild(link);
    }

    // =====================================================
    // 2. ĐỌC FILE DỊCH VỤ
    // =====================================================

    const serviceJsonUrl = new URL("../../data/dich_vu.json", scriptUrl).href;

    let cachedServices = null;

    // Hỗ trợ cả trường hợp JSON là mảng hoặc object chứa mảng
    function normalizeServices(data) {
        if (Array.isArray(data)) return data;

        if (data && Array.isArray(data.dich_vu)) {
            return data.dich_vu;
        }

        if (data && Array.isArray(data.services)) {
            return data.services;
        }

        return [];
    }

    // Ưu tiên đọc dữ liệu mới nhất từ LocalStorage nếu có.
    // Nếu không có thì đọc file data/dich_vu.json.
    async function loadServices(forceReload = false) {
        if (cachedServices && !forceReload) {
            return cachedServices;
        }

        // Các key dự phòng thường dùng trong project PawPaw.
        // Nếu project dùng key khác, xem DATA_KEYS.SERVICES
        // trong file storage.js để bổ sung vào danh sách.
        const possibleKeys = [
            "petcare_dich_vu",
            "dich_vu",
            "services"
        ];

        for (const key of possibleKeys) {
            try {
                const storedData = localStorage.getItem(key);

                if (storedData) {
                    const services = normalizeServices(
                        JSON.parse(storedData)
                    );

                    if (services.length > 0) {
                        cachedServices = services;
                        return cachedServices;
                    }
                }
            } catch (error) {
                console.warn("Không đọc được LocalStorage:", key, error);
            }
        }

        // Nếu LocalStorage không có dữ liệu, đọc file JSON
        try {
            const response = await fetch(serviceJsonUrl, {
                cache: forceReload ? "no-store" : "default"
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const services = normalizeServices(data);

            if (services.length === 0) {
                throw new Error("File JSON không chứa danh sách dịch vụ hợp lệ.");
            }

            cachedServices = services;
            return cachedServices;

        } catch (error) {
            console.error("Không thể tải dữ liệu dịch vụ:", error);
            return [];
        }
    }

    // =====================================================
    // 3. TÌM KIẾM DỊCH VỤ
    // =====================================================

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .trim();
    }

    function getServiceName(service) {
        return service.ten_dich_vu
            || service.ten_dv
            || service.name
            || "";
    }

    function getServiceDescription(service) {
        return service.mo_ta
            || service.mo_ta_dich_vu
            || service.description
            || "";
    }

    function formatPrice(value) {
        if (value === null || value === undefined || value === "") {
            return "Chưa có thông tin";
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return String(value);
        }

        return number.toLocaleString("vi-VN") + " VNĐ";
    }

    function formatServiceForAI(service) {
        return {
            ma_dich_vu: service.ma_dich_vu ?? "",
            ten_dich_vu: getServiceName(service),
            mo_ta: getServiceDescription(service),
            gia_duoi_5kg: formatPrice(service.gia_duoi_5kg),
            gia_5_15kg: formatPrice(service.gia_5_15kg),
            gia_tren_15kg: formatPrice(service.gia_tren_15kg),
            thoi_gian_du_kien:
                service.thoi_gian_du_kien != null
                    ? `${service.thoi_gian_du_kien} phút`
                    : "Chưa có thông tin"
        };
    }

    // Loại bỏ các từ phổ biến để ưu tiên từ khóa quan trọng
    function getSearchTerms(text) {
        const stopWords = new Set([
            "cho", "toi", "minh", "ban", "cua", "la", "co",
            "bao", "nhieu", "nao", "gi", "giup", "voi",
            "khong", "khong", "khong", "mot", "cac",
            "duoc", "the", "nay", "kia", "va", "hay",
            "gia", "dich", "vu", "pawpaw", "be", "thu",
            "cung", "hoi", "ve", "xin", "chao"
        ]);

        return normalizeText(text)
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .split(/\s+/)
            .filter(word => word.length > 1 && !stopWords.has(word));
    }

    async function searchServices(question) {
        const services = await loadServices();

        if (services.length === 0) {
            return {
                available: false,
                services: []
            };
        }

        const query = normalizeText(question);
        const terms = getSearchTerms(question);

        // Phím 1 yêu cầu xem toàn bộ bảng giá
        if (question.trim() === "1") {
            return {
                available: true,
                services: services
            };
        }

        // Nếu câu hỏi có nhắc đến dịch vụ, giá hoặc bảng giá,
        // trả về các bản ghi phù hợp.
        const priceIntent = [
            "gia", "bang gia", "bao nhieu", "chi phi",
            "phi", "dich vu", "spa", "tam", "cat tia",
            "cat long", "cham soc", "thoi gian"
        ].some(keyword => query.includes(normalizeText(keyword)));

        if (!priceIntent) {
            return {
                available: true,
                services: []
            };
        }

        const scored = services.map(service => {
            const searchableText = normalizeText([
                getServiceName(service),
                getServiceDescription(service),
                service.ma_dich_vu,
                service.nhom_dich_vu,
                service.loai_dich_vu
            ].join(" "));

            let score = 0;

            for (const term of terms) {
                if (searchableText.includes(term)) {
                    score += 1;
                }
            }

            return { service, score };
        });

        const matched = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.service);

        // Nếu không khớp từ khóa, không tự chọn bừa một dịch vụ.
        return {
            available: true,
            services: matched
        };
    }

    // =====================================================
    // 4. TẠO GIAO DIỆN CHATBOT
    // =====================================================

    const welcomeHTML = `
        Dạ PawPaw xin chào sen ạ! 🐾
        <br><br>
        Bạn có thể nhập số hoặc bấm chọn:
        <br><br>
        <b>1.</b> Bảng giá và dịch vụ Spa / Cắt tỉa
        <br>
        <b>2.</b> Đặt lịch hẹn dịch vụ
        <br>
        <b>3.</b> Giờ mở cửa và địa chỉ
        <br>
        <b>4.</b> Tư vấn chăm sóc thú cưng cùng AI

        <div class="pawpaw-quick-tags">
            <button type="button" class="pawpaw-tag-btn" data-choice="1">
                Phím 1: Bảng giá
            </button>
            <button type="button" class="pawpaw-tag-btn" data-choice="2">
                Phím 2: Đặt lịch
            </button>
            <button type="button" class="pawpaw-tag-btn" data-choice="3">
                Phím 3: Giờ & Địa chỉ
            </button>
            <button type="button" class="pawpaw-tag-btn" data-choice="4">
                Phím 4: Tư vấn AI
            </button>
        </div>
    `;

    const container = document.createElement("div");

    container.innerHTML = `
        <button
            type="button"
            class="pawpaw-chat-btn"
            id="pawpawChatBtn"
            title="Chat với PawPaw"
            aria-label="Mở chatbot PawPaw"
        >🐾</button>

        <section
            class="pawpaw-chat-box"
            id="pawpawChatBox"
            aria-label="Trợ lý AI PawPaw"
        >
            <div class="pawpaw-chat-header">
                <span>🐾 Trợ lý AI PawPaw</span>
                <button
                    type="button"
                    id="pawpawCloseChat"
                    aria-label="Đóng chatbot"
                >&times;</button>
            </div>

            <div
                class="pawpaw-chat-messages"
                id="pawpawChatMessages"
                aria-live="polite"
            >
                <div class="pawpaw-msg pawpaw-msg-bot">
                    ${welcomeHTML}
                </div>
            </div>

            <form class="pawpaw-chat-input-bar" id="pawpawChatForm">
                <input
                    type="text"
                    id="pawpawChatInput"
                    placeholder="Nhập câu hỏi hoặc số 1, 2, 3, 4..."
                    autocomplete="off"
                    required
                >
                <button type="submit">Gửi</button>
            </form>
        </section>
    `;

    document.body.appendChild(container);

    const chatBtn = document.getElementById("pawpawChatBtn");
    const chatBox = document.getElementById("pawpawChatBox");
    const closeBtn = document.getElementById("pawpawCloseChat");
    const chatForm = document.getElementById("pawpawChatForm");
    const chatInput = document.getElementById("pawpawChatInput");
    const msgContainer = document.getElementById("pawpawChatMessages");
    const sendBtn = chatForm.querySelector("button[type='submit']");

    let isSending = false;

    // =====================================================
    // 5. MỞ / ĐÓNG CHATBOT
    // =====================================================

    function openChatbot() {
        chatBox.style.display = "flex";
        chatInput.focus();
    }

    function closeChatbot() {
        chatBox.style.display = "none";
    }

    chatBtn.addEventListener("click", () => {
        if (chatBox.style.display === "flex") {
            closeChatbot();
        } else {
            openChatbot();
        }
    });

    closeBtn.addEventListener("click", closeChatbot);

    // =====================================================
    // 6. HIỂN THỊ TIN NHẮN
    // =====================================================

    function appendMessage(sender, content, isHTML = false) {
        const message = document.createElement("div");
        message.className = `pawpaw-msg pawpaw-msg-${sender}`;

        if (isHTML) {
            message.innerHTML = content;
        } else {
            message.textContent = content;
        }

        msgContainer.appendChild(message);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        return message;
    }

    // Escape nội dung AI trước khi hiển thị dưới dạng HTML.
    function escapeHTML(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatBotMessage(text) {
        return escapeHTML(text)
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
            .replace(/\*(.*?)\*/g, "<i>$1</i>")
            .replace(/(?:^|\n)\s*[-•]\s+/g, "<br>• ")
            .replace(/\n/g, "<br>");
    }

    // =====================================================
    // 7. ĐƯỜNG DẪN ĐẶT LỊCH
    // =====================================================

    function getBookingUrl() {
        const path = window.location.pathname;

        if (path.includes("/pages/customer/")) {
            return "booking.html";
        }

        if (path.includes("/pages/admin/")) {
            return "../customer/booking.html";
        }

        return "pages/customer/booking.html";
    }

    // =====================================================
    // 8. MENU TRẢ LỜI CÓ SẴN
    // =====================================================

    function getQuickLocalReply(text) {
        const value = text.trim();

        if (value === "2") {
            return `
                Dạ bạn có thể chuyển sang trang
                <b>Đặt lịch</b> để chọn dịch vụ cho bé nhé!
                <br>
                <a href="${getBookingUrl()}" class="pawpaw-link-btn">
                    👉 Đi đến trang Đặt lịch
                </a>
            `;
        }

        if (value === "3") {
            return `
                🐾 <b>Thông tin PawPaw PetCare:</b>
                <br>
                • <b>Địa chỉ:</b> 123 Đường PetCare, Phường Bến Nghé,
                Quận 1, TP. HCM
                <br>
                • <b>Giờ hoạt động:</b> 08:30 - 17:30 hằng ngày
                <br>
                • <b>Hotline:</b> 1900 6868 - 0909 123 456
            `;
        }

        if (value === "4") {
            return `
                🐾 <b>PawPaw sẵn sàng tư vấn!</b>
                <br>
                Bạn hãy nhập câu hỏi về chăm sóc, dinh dưỡng,
                tắm hoặc thói quen của bé nhé!
            `;
        }

        return null;
    }

    // =====================================================
    // 9. GỌI GEMINI KÈM DỮ LIỆU DỊCH VỤ
    // =====================================================

    async function callGemini(userText) {
        const localReply = getQuickLocalReply(userText);

        if (localReply) {
            return {
                html: localReply,
                isHTML: true
            };
        }

        if (
            typeof AI_CONFIG === "undefined" ||
            !AI_CONFIG.API_KEY ||
            AI_CONFIG.API_KEY.includes("THAY_THE")
        ) {
            return {
                text: "Chatbot chưa được cấu hình API Key trong js/config.js."
            };
        }

        // Truy vấn dịch vụ từ JSON / LocalStorage
        const result = await searchServices(userText);

        const isServiceQuestion =
            userText.trim() === "1" ||
            /dịch vụ|giá|bảng giá|bao nhiêu|chi phí|spa|tắm|cắt tỉa|cắt lông|thời gian/i
                .test(userText);

        if (!result.available && isServiceQuestion) {
            return {
                text:
                    "PawPaw hiện chưa đọc được dữ liệu dịch vụ. " +
                    "Bạn vui lòng thử lại sau nhé."
            };
        }

        if (
            result.available &&
            isServiceQuestion &&
            userText.trim() !== "1" &&
            result.services.length === 0
        ) {
            return {
                text:
                    "PawPaw chưa tìm thấy dịch vụ phù hợp trong danh sách hiện có. " +
                    "Bạn thử nhập tên dịch vụ cụ thể nhé!"
            };
        }

        const serviceContext = result.services.length > 0
            ? JSON.stringify(
                result.services.map(formatServiceForAI),
                null,
                2
            )
            : "Không có dữ liệu dịch vụ liên quan được truy xuất.";

        const systemPrompt = `
${AI_CONFIG.SYSTEM_PROMPT || "Bạn là trợ lý tư vấn của PawPaw PetCare."}

QUY TẮC TRẢ LỜI:
- Trả lời bằng tiếng Việt, thân thiện và dễ hiểu.
- Dữ liệu dịch vụ bên dưới được truy xuất từ website PawPaw.
- Khi trả lời về tên dịch vụ, giá và thời gian, ưu tiên dữ liệu được cung cấp.
- Không tự bịa giá, tên dịch vụ hoặc thời gian.
- Nếu một mức giá ghi "Chưa có thông tin", hãy nói rõ chưa có dữ liệu.
- Giá phụ thuộc cân nặng phải được giải thích đúng theo từng mức cân nặng.
- Nếu dữ liệu truy xuất không có dịch vụ phù hợp, không được khẳng định dịch vụ đó có tồn tại.
- Chỉ sử dụng dữ liệu dịch vụ trong phần ngữ cảnh làm căn cứ cho thông tin cụ thể về dịch vụ.

DỮ LIỆU DỊCH VỤ ĐƯỢC TRUY XUẤT:
${serviceContext}
`;

        const model = AI_CONFIG.MODEL || "gemini-2.5-flash";
        const baseUrl =
            AI_CONFIG.API_URL ||
            "https://generativelanguage.googleapis.com/v1beta/models";

        const endpoint =
            `${baseUrl}/${model}:generateContent` +
            `?key=${encodeURIComponent(AI_CONFIG.API_KEY)}`;

        let promptQuery = userText;

        if (userText.trim() === "1") {
            promptQuery =
                "Hãy liệt kê bảng giá các dịch vụ PawPaw trong dữ liệu được cung cấp. " +
                "Trình bày tên dịch vụ, giá theo cân nặng và thời gian dự kiến. " +
                "Không tự thêm giá không có trong dữ liệu.";
        }

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: [{
                        role: "user",
                        parts: [{ text: promptQuery }]
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Gemini API error:", data);

                return {
                    text: `Chatbot gặp lỗi API (${response.status}). Bạn thử lại sau nhé!`
                };
            }

            const reply = data.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .filter(Boolean)
                .join("\n");

            if (!reply) {
                return {
                    text: "PawPaw chưa tạo được câu trả lời. Bạn thử lại nhé!"
                };
            }

            // Trả lời kèm link đặt lịch nếu khách hỏi về việc đặt lịch
            const lowerText = normalizeText(userText);

            const formatted = formatBotMessage(reply);

            if (
                lowerText.includes("dat lich") ||
                lowerText.includes("book") ||
                lowerText.includes("hen")
            ) {
                return {
                    html: formatted +
                        `<br><a href="${getBookingUrl()}" class="pawpaw-link-btn">` +
                        "👉 Đi đến trang Đặt lịch</a>",
                    isHTML: true
                };
            }

            return {
                html: formatted,
                isHTML: true
            };

        } catch (error) {
            console.error("Lỗi gọi Gemini:", error);

            return {
                text:
                    "PawPaw chưa kết nối được với AI. " +
                    "Bạn kiểm tra kết nối mạng rồi thử lại nhé!"
            };
        }
    }

    // =====================================================
    // 10. GỬI TIN NHẮN
    // =====================================================

    async function handleUserSendMessage(text) {
        const userText = text.trim();

        if (!userText || isSending) return;

        isSending = true;

        appendMessage("user", userText);

        const loadingMessage = appendMessage(
            "bot",
            "PawPaw đang tìm câu trả lời cho sen..."
        );

        chatInput.disabled = true;
        sendBtn.disabled = true;

        try {
            const result = await callGemini(userText);

            if (result.isHTML) {
                loadingMessage.innerHTML = result.html;
            } else {
                loadingMessage.textContent = result.text;
            }

        } catch (error) {
            console.error(error);

            loadingMessage.textContent =
                "PawPaw gặp sự cố. Bạn thử gửi lại nhé!";

        } finally {
            isSending = false;
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    }

    // =====================================================
    // 11. NÚT CHỌN NHANH
    // =====================================================

    msgContainer.addEventListener("click", function (event) {
        const button = event.target.closest(".pawpaw-tag-btn");

        if (!button) return;

        const choice = button.getAttribute("data-choice");

        if (choice) {
            handleUserSendMessage(choice);
        }
    });

    // =====================================================
    // 12. FORM GỬI TIN NHẮN
    // =====================================================

    chatForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const text = chatInput.value.trim();

        if (!text || isSending) return;

        chatInput.value = "";
        handleUserSendMessage(text);
    });

})();
