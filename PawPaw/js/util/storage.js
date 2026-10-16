(function () {
  const ROOT = new URL("../../", document.currentScript.src).href;

  const JSON_SOURCES = {
    [DATA_KEYS.USERS]: `${ROOT}data/nguoi_dung.json`,
    [DATA_KEYS.SERVICES]: `${ROOT}data/dich_vu.json`,
    [DATA_KEYS.PETS]: `${ROOT}data/thu_cung.json`,
    [DATA_KEYS.APPOINTMENTS]: `${ROOT}data/lich_hen.json`,
    [DATA_KEYS.APPOINTMENT_DETAILS]: `${ROOT}data/chi_tiet_lich_hen.json`,
    [DATA_KEYS.REVIEWS]: `${ROOT}data/danh_gia.json`
  };

  function getData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  // HÀM MỚI: Dùng XMLHttpRequest theo đúng chuẩn Bài 10 (AJAX) thay cho hàm fetch
  function fetchJSON(filePath) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", filePath, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) { // 4: request finished and response is ready
          if (xhr.status === 200 || xhr.status === 0) { // 200: OK, 0: local file
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(err);
            }
          } else {
            reject("Lỗi khi tải dữ liệu từ file JSON: " + xhr.status);
          }
        }
      };
      xhr.send();
    });
  }

  // Nạp dữ liệu mẫu từ data/*.json vào localStorage.
  async function initData() {
    let storedVersion = null;
    try {
      storedVersion = localStorage.getItem(DATA_KEYS.DATA_VERSION);
    } catch (e) {}
    
    const forceReload = storedVersion !== DATA_VERSION;
    let allLoaded = true;

    for (const [key, filePath] of Object.entries(JSON_SOURCES)) {
      const existingData = getData(key);
      // Kiểm tra nếu trong Local Storage chưa có dữ liệu (lần đầu vào web) 
      // thì bắt buộc phải nạp từ file JSON vào trước.
      if (forceReload || !existingData || existingData.length === 0) {
        try {
          // Gọi hàm AJAX để lấy dữ liệu từ file
          const data = await fetchJSON(filePath);
          setData(key, data);
        } catch (e) {
          allLoaded = false;
          console.error(`Lỗi đọc file: ${filePath}`, e);
        }
      }
    }

    if (forceReload && allLoaded) {
      try {
        localStorage.setItem(DATA_KEYS.DATA_VERSION, DATA_VERSION);
      } catch (e) {}
    }
  }

  async function resetData() {
    Object.values(DATA_KEYS).forEach((k) => localStorage.removeItem(k));
    await initData();
  }

  function getCurrentUser() {
    const raw = getData(DATA_KEYS.CURRENT_USER);
    if (!raw) return null;

    if (typeof raw === "object") {
      return raw;
    }

    return getItemById(DATA_KEYS.USERS, "ma_nguoi_dung", raw);
  }

  function setCurrentUser(user) {
    if (!user) return;
    setData(DATA_KEYS.CURRENT_USER, user);
  }

  function clearCurrentUser() {
    localStorage.removeItem(DATA_KEYS.CURRENT_USER);
  }

  function generateId(prefix, key, idField, padLength = 3) {
    const list = getData(key) || [];
    let maxNum = 0;
    list.forEach((item) => {
      const currentId = String(item[idField] || "");
      if (currentId.startsWith(prefix)) {
        const numPart = parseInt(currentId.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(padLength, "0")}`;
  }

  function getItemById(key, idField, idValue) {
    const list = getData(key) || [];
    return list.find((item) => String(item[idField]) === String(idValue)) || null;
  }

  function addItem(key, newItem) {
    const list = getData(key) || [];
    list.push(newItem);
    setData(key, list);
    return newItem;
  }

  function updateItem(key, idField, updatedItem) {
    const list = getData(key) || [];
    const index = list.findIndex(
      (item) => String(item[idField]) === String(updatedItem[idField])
    );
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedItem };
      setData(key, list);
      return true;
    }
    return false;
  }

  function deleteItem(key, idField, idValue) {
    const list = getData(key) || [];
    const filteredList = list.filter((item) => String(item[idField]) !== String(idValue));
    if (filteredList.length !== list.length) {
      setData(key, filteredList);
      return true;
    }
    return false;
  }

  const Storage = {
    initData,
    resetData,
    getData,
    setData,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    generateId,
    getItemById,
    addItem,
    updateItem,
    deleteItem
  };

  if (typeof window !== "undefined") {
    window.Storage = Storage;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Storage;
  }
})();