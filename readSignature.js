// Lấy tham số từ URL
const urlParams = new URLSearchParams(window.location.search);

// Kiểm tra xem có quyền xóa không (dựa vào key trong URL)
const canDelete = urlParams.get("key") === managerSignatureKey;

let selectedSignature = null;

/**
 * Hàm load chữ ký từ server
 * @param {string} userId - ID người dùng
 * @param {string} userCard - Thông tin thẻ người dùng
 * @param {number} sizePercent - Kích thước chữ ký (%)
 */
function loadSignatures(userId, userCard, sizePercent) {
  fetch(
    libraryURL +
      "get_signatures.php?idUser=" +
      encodeURIComponent(userId) +
      "&userCard=" +
      encodeURIComponent(userCard)
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        console.error("Lỗi từ PHP:", data.error);
        return;
      }

      const container = document.getElementById("previewContainer");
      container.innerHTML = "";

      data.forEach((signature) => {
        const img = document.createElement("img");
        img.src = libraryURL + signature.image_path;
        img.alt = "Chữ ký của " + signature.user_card;
        img.dataset.id = signature.id;
        img.classList.add("signature-img");
        img.style.width = sizePercent + "%";
        img.style.position = "absolute";
        img.style.top = signature.pos_y + "%";
        img.style.left = signature.pos_x + "%";
        img.setAttribute("draggable", "false");

        if (canDelete) {
          img.addEventListener("click", () => selectSignature(img));
        } else {
          img.style.cursor = "default";
        }

        container.appendChild(img);
      });
    })
    .catch((err) => console.error("Lỗi khi tải chữ ký:", err));
}

/**
 * Chọn chữ ký
 */
function selectSignature(img) {
  if (!canDelete) {
    alert("Bạn không có quyền xóa chữ ký.");
    return;
  }

  // Bỏ chọn chữ ký trước đó
  if (selectedSignature) {
    selectedSignature.classList.remove("selected");
  }

  if (selectedSignature === img) {
    selectedSignature = null;
    document.getElementById("deleteDialog").style.display = "none";
  } else {
    img.classList.add("selected");
    selectedSignature = img;
    document.getElementById("deleteDialog").style.display = "block";
  }
}

// Nút xác nhận xóa chữ ký
document.getElementById("confirmDelete").addEventListener("click", () => {
  if (!selectedSignature || !canDelete) {
    alert("Không có chữ ký nào được chọn hoặc bạn không có quyền xóa.");
    return;
  }

  const signatureId = selectedSignature.dataset.id;
  if (!signatureId) {
    alert("Lỗi: Không lấy được ID chữ ký!");
    return;
  }

  fetch(libraryURL + "delete_signature.php", {
    method: "POST",
    body: JSON.stringify({ id: signatureId }),
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Chữ ký đã được xóa!");
        selectedSignature.remove();
        selectedSignature = null;
        document.getElementById("deleteDialog").style.display = "none";
      } else {
        alert("Lỗi khi xóa: " + data.error);
      }
    })
    .catch((err) => console.error("Lỗi khi xóa chữ ký:", err));
});

// Nút hủy xóa chữ ký
document.getElementById("cancelDelete").addEventListener("click", () => {
  document.getElementById("deleteDialog").style.display = "none";
  if (selectedSignature) {
    selectedSignature.classList.remove("selected");
    selectedSignature = null;
  }
});
