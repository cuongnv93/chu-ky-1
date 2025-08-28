const storage = firebase.storage();
const db = firebase.firestore();

function generateId() {
  return "id-" + crypto.randomUUID();
}

const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lastTime = 0;
let lastLineWidth = 2;

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mousemove", draw);

canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchend", stopDrawing);
canvas.addEventListener("touchmove", draw);

function startDrawing(event) {
  event.preventDefault();
  const { x, y } = getPosition(event);

  isDrawing = true;
  lastX = x;
  lastY = y;
  lastTime = Date.now();
}

function stopDrawing() {
  isDrawing = false;
  ctx.beginPath();
}

function draw(event) {
  event.preventDefault();
  if (!isDrawing) return;

  const { x, y } = getPosition(event);
  const currentTime = Date.now();
  const timeDiff = currentTime - lastTime;
  lastTime = currentTime;

  const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
  const speed = distance / (timeDiff || 1);

  let lineWidth = Math.max(1, Math.min(6, 10 - speed * 0.2));
  lineWidth = lastLineWidth * 0.7 + lineWidth * 0.3;
  lastLineWidth = lineWidth;

  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = colorSignature;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  lastX = x;
  lastY = y;
}

function getPosition(event) {
  let posX, posY;
  if (event.touches) {
    posX = event.touches[0].clientX - canvas.getBoundingClientRect().left;
    posY = event.touches[0].clientY - canvas.getBoundingClientRect().top;
  } else {
    posX = event.offsetX;
    posY = event.offsetY;
  }
  return { x: posX, y: posY };
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const signatureImage = document.getElementById("signatureImage");
  if (signatureImage) signatureImage.remove();
}

let hasPreviewed = false;

function previewSignature(sizePercent) {
  hasPreviewed = true;
  const dataURL = canvas.toDataURL("image/png");
  const container = document.getElementById("previewContainer");
  let signatureImage = document.getElementById("signatureImage");

  if (!signatureImage) {
    signatureImage = document.createElement("img");
    signatureImage.id = "signatureImage";
    signatureImage.style.border = "2px solid red";
    signatureImage.style.width = sizePercent + "%";
    signatureImage.style.height = "auto";
    signatureImage.style.position = "absolute";
    signatureImage.style.left = "10%";
    signatureImage.style.top = "10%";
    signatureImage.style.cursor = "move";
    container.appendChild(signatureImage);
  }

  signatureImage.src = dataURL;

  setTimeout(() => {
    signatureImage.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);

  // Hiển thị message "Kéo thả để thay đổi vị trí"
  let dragMessage = document.getElementById("dragMessage");
  if (!dragMessage) {
    dragMessage = document.createElement("div");
    dragMessage.id = "dragMessage";
    dragMessage.textContent = "Kéo thả để thay đổi vị trí";
    dragMessage.style.position = "absolute";
    dragMessage.style.background = "rgba(0, 0, 0, 0.7)";
    dragMessage.style.color = "white";
    dragMessage.style.padding = "5px 10px";
    dragMessage.style.borderRadius = "5px";
    dragMessage.style.top = `calc(${parseInt(
      signatureImage.style.top
    )}% - 30px)`;
    dragMessage.style.left = signatureImage.style.left;
    dragMessage.style.zIndex = "1000";
    dragMessage.style.fontSize = "14px";
    container.appendChild(dragMessage);

    setTimeout(() => dragMessage?.remove(), 5000);
  }

  // Drag & Drop
  function startDrag(e) {
    e.preventDefault();
    const isTouch = e.type.includes("touch");
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;

    const containerRect = container.getBoundingClientRect();
    const imageRect = signatureImage.getBoundingClientRect();
    const offsetX = startX - imageRect.left;
    const offsetY = startY - imageRect.top;

    function moveAt(clientX, clientY) {
      let newX = clientX - offsetX - containerRect.left;
      let newY = clientY - offsetY - containerRect.top;

      newX = Math.max(0, Math.min(newX, containerRect.width - imageRect.width));
      newY = Math.max(
        0,
        Math.min(newY, containerRect.height - imageRect.height)
      );

      const percentX = (newX / containerRect.width) * 100;
      const percentY = (newY / containerRect.height) * 100;

      signatureImage.style.left = percentX + "%";
      signatureImage.style.top = percentY + "%";

      if (dragMessage) {
        dragMessage.remove();
        dragMessage = null;
      }
    }

    function onMove(ev) {
      const clientX = isTouch ? ev.touches[0].clientX : ev.clientX;
      const clientY = isTouch ? ev.touches[0].clientY : ev.clientY;
      moveAt(clientX, clientY);
    }

    function stopDrag() {
      document.removeEventListener(isTouch ? "touchmove" : "mousemove", onMove);
      document.removeEventListener(isTouch ? "touchend" : "mouseup", stopDrag);
    }

    document.addEventListener(isTouch ? "touchmove" : "mousemove", onMove);
    document.addEventListener(isTouch ? "touchend" : "mouseup", stopDrag);
  }

  signatureImage.onmousedown = startDrag;
  signatureImage.ontouchstart = startDrag;
  signatureImage.ondragstart = () => false;
}

function saveSignature(userId, userCard, scale) {
  const confirmSave = confirm("Bạn có chắc chắn muốn ký và lưu không?");
  if (!confirmSave) return;

  const isEmpty = !ctx
    .getImageData(0, 0, canvas.width, canvas.height)
    .data.some((v) => v !== 0);
  if (isEmpty) {
    alert("Vui lòng ký trước khi lưu!");
    return;
  }

  if (!hasPreviewed) {
    alert('Nhấn vào nút "Xem Thử" để xem trước chữ ký trước khi lưu!');
    return;
  } else {
    hasPreviewed = false;
  }

  const signatureImage = document.getElementById("signatureImage");
  const container = document.getElementById("previewContainer");
  let posX = 0,
    posY = 0;

  if (signatureImage && container) {
    const containerRect = container.getBoundingClientRect();
    const imageRect = signatureImage.getBoundingClientRect();
    posX = ((imageRect.left - containerRect.left) / containerRect.width) * 100;
    posY = ((imageRect.top - containerRect.top) / containerRect.height) * 100;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width * scale;
  exportCanvas.height = canvas.height * scale;

  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

  const signatureData = exportCanvas.toDataURL("image/png");

  fetch(libraryURL + "save_signature.php", {
    method: "POST",
    body: JSON.stringify({
      signature: signatureData,
      idUser: userId,
      userCard: userCard,
      x: posX,
      y: posY,
    }),
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        localStorage.setItem("scrollToPreviewContainer", "#previewContainer");
        alert("Chữ ký đã được lưu!");

        setTimeout(() => {
          loadSignatures(defaultIdUser, defaultUserTag, sizeSignature2);
          const scrollTarget = localStorage.getItem("scrollToPreviewContainer");
          document
            .querySelector(scrollTarget)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
          clearCanvas();
        }, 500);
      } else {
        alert("Lỗi khi lưu: " + result.error);
      }
    })
    .catch((err) => console.error("Lỗi:", err));
}

// async function saveSignature(userCard, scale) {
//   const confirmSave = confirm("Bạn có chắc chắn muốn ký và lưu không?");
//   if (!confirmSave) return;

//   const isEmpty = !ctx
//     .getImageData(0, 0, canvas.width, canvas.height)
//     .data.some((v) => v !== 0);
//   if (isEmpty) {
//     alert("Vui lòng ký trước khi lưu!");
//     return;
//   }

//   if (!hasPreviewed) {
//     alert('Nhấn vào nút "Xem Thử" trước khi lưu!');
//     return;
//   } else {
//     hasPreviewed = false;
//   }

//   const signatureImage = document.getElementById("signatureImage");
//   const container = document.getElementById("previewContainer");
//   let posX = 0,
//     posY = 0;

//   if (signatureImage && container) {
//     const containerRect = container.getBoundingClientRect();
//     const imageRect = signatureImage.getBoundingClientRect();
//     posX = ((imageRect.left - containerRect.left) / containerRect.width) * 100;
//     posY = ((imageRect.top - containerRect.top) / containerRect.height) * 100;
//   }

//   // Tạo canvas xuất chữ ký
//   const exportCanvas = document.createElement("canvas");
//   exportCanvas.width = canvas.width * scale;
//   exportCanvas.height = canvas.height * scale;

//   const exportCtx = exportCanvas.getContext("2d");
//   exportCtx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

//   const signatureDataUrl = exportCanvas.toDataURL("image/png");

//   console.log(22222, signatureDataUrl);

//   try {
//     // 🔥 Upload ảnh vào Firebase Storage
//     const userId = generateId();
//     // Sử dụng ref từ Firebase Storage (modular SDK)
//     const fileRef = storage.ref(`signatures/${userCard}/${userId}.png`);
//     console.log(22222, fileRef);

//     await fileRef.putString(signatureDataUrl, "data_url");
//     console.log(333333, downloadURL);
//     const downloadURL = await fileRef.getDownloadURL();
//     console.log(333333, downloadURL);
//     // 🔥 Lưu metadata vào Firestore
//     await db.collection("signatures").doc(userId).set({
//       idUser: userId,
//       userCard: userCard,
//       x: posX,
//       y: posY,
//       imageUrl: downloadURL,
//       createdAt: new Date().toISOString(),
//     });

//     alert("✅ Chữ ký đã được lưu vào Firebase!");
//     clearCanvas();
//   } catch (err) {
//     console.error("Lỗi khi lưu Firebase:", err);
//     alert("❌ Lỗi khi lưu Firebase: " + err.message);
//   }
// }
