const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");
const strip = document.getElementById("strip");
const retakeBtn = document.getElementById("retakeBtn");
const countdown = document.getElementById("countdown");
const uploadInput = document.getElementById("uploadInput");
const saveBtn = document.getElementById("saveBtn");
const designSelect = document.getElementById("designSelect");

// Parse the localStorage value into a base-10 number. Fallback to 4 if not found.
let maxPhotos = parseInt(localStorage.getItem("photoCount"), 10) || 4;
let takenPhotos = 0;

// Track if a countdown sequence is already running anywhere
let isCapturing = false;

if (maxPhotos === 3) {
  strip.classList.add("three");
} else {
  strip.classList.add("four");
}

let streamStarted = false;

// START CAMERA
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });

    video.srcObject = stream;
    
    video.onloadedmetadata = () => {
      video.play();
      streamStarted = true;
    };

  } catch (error) {
    console.error("Camera error: ", error);
    alert("Please allow camera access in your browser settings.");
  }
}

// Initialize application
createSlots();
startCamera();

// CREATE SLOTS & ADD INDIVIDUAL CLICK LISTENERS FOR SINGLE RETAKES
function createSlots() {
  strip.innerHTML = "";
  for (let i = 0; i < maxPhotos; i++) {
    const slot = document.createElement("div");
    slot.classList.add("photo-slot");
    slot.dataset.index = i; // Save the position index on the slot
    
    // Smooth interaction styling hint
    slot.style.cursor = "pointer";
    slot.title = "Click this frame to retake this specific photo!";

    // Listen for single photo retake clicks
    slot.addEventListener("click", () => {
      // Don't interrupt if another countdown sequence is actively capturing
      if (isCapturing) return;

      // Only allow retaking if an image actually exists inside this slot
      if (slot.querySelector("img")) {
        retakeSinglePhoto(slot);
      }
    });

    strip.appendChild(slot);
  }
}

// SINGLE PHOTO RETAKE LOGIC
function retakeSinglePhoto(targetSlot) {
  if (!streamStarted) {
    alert("The camera is still loading. Please wait.");
    return;
  }

  isCapturing = true; // Lock down controls
  targetSlot.style.opacity = "0.5";

  let timeLeft = 3;
  countdown.innerText = timeLeft;

  const timer = setInterval(() => {
    timeLeft--;
    
    if (timeLeft > 0) {
      countdown.innerText = timeLeft;
    } else {
      clearInterval(timer);
      countdown.innerText = "";
      targetSlot.style.opacity = "1"; // Reset visibility

      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Mirror effect matching the main capture flow
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/png");
      
      // Wipe the old image inside this slot clean
      targetSlot.innerHTML = "";

      // Append the fresh replacement photo
      const newPhoto = document.createElement("img");
      newPhoto.src = imageData;
      targetSlot.appendChild(newPhoto);

      isCapturing = false; // Unlock controls when done!
    }
  }, 1000);
}

// UPLOAD IMAGE
uploadInput.addEventListener("change", () => {
  if (isCapturing) return;

  const file = uploadInput.files[0];
  if (!file) return;

  if (takenPhotos >= maxPhotos) {
    alert("Slots are full! Click Retake to start over or click a frame directly to replace it.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const photo = document.createElement("img");
    photo.src = e.target.result;

    const slots = document.querySelectorAll(".photo-slot");
    if (slots[takenPhotos]) {
      slots[takenPhotos].appendChild(photo);
      takenPhotos++;
    }
  };
  reader.readAsDataURL(file);
});

// TAKE PHOTO (GLOBAL SEQUENCE)
captureBtn.addEventListener("click", () => {
  if (!streamStarted) {
    alert("The camera is still loading or access was denied. Please check your browser permissions.");
    return;
  }

  if (takenPhotos >= maxPhotos) {
    alert("Slots are full! Click Retake to start over or click a frame directly to replace it.");
    return;
  }

  // If a sequence is already running, ignore additional inputs completely!
  if (isCapturing) return;
  
  isCapturing = true; 
  captureBtn.disabled = true; 
  captureBtn.style.opacity = "0.5";

  let timeLeft = 3;
  countdown.innerText = timeLeft;

  const timer = setInterval(() => {
    timeLeft--;
    
    if (timeLeft > 0) {
      countdown.innerText = timeLeft;
    } else {
      clearInterval(timer);
      countdown.innerText = "";

      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/png");
      const photo = document.createElement("img");
      photo.src = imageData;

      const slots = document.querySelectorAll(".photo-slot");
      if (slots[takenPhotos]) {
        slots[takenPhotos].appendChild(photo);
        takenPhotos++;
      }

      // Unlock everything so you can click again
      isCapturing = false; 
      captureBtn.disabled = false;
      captureBtn.style.opacity = "1";
    }
  }, 1000);
});

// RESET ALL PHOTOS
retakeBtn.addEventListener("click", () => {
  if (isCapturing) return; 
  takenPhotos = 0;
  createSlots();
});

// SAVE PHOTO STRIP WITH DYNAMIC CANVAS HEIGHT (SAME PHOTO SIZES!)
saveBtn.addEventListener("click", () => {
  if (isCapturing) return;

  const images = document.querySelectorAll(".photo-slot img");

  if (images.length === 0) {
    alert("Take some photos first before saving your strip!");
    return;
  }

  const isThreeRow = images.length === 3;

  // --- IDENTICAL PHOTO DIMENSIONS ---
  const canvasWidth = 460;
  const slotWidth = 400;
  const slotHeight = 250; // Every image frame matches perfectly
  const sidePadding = (canvasWidth - slotWidth) / 2;
  const verticalGap = 25; // Spacing layout uniformity
  const topMargin = 45;   // Frame top head space

  // Dynamic canvas heights dependent on slot length counts
  const canvasHeight = isThreeRow ? 890 : 1200

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = canvasWidth;
  finalCanvas.height = canvasHeight;
  const ctx = finalCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff"; 
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const artOverlay = new Image();
  const selectedDesign = designSelect ? designSelect.value : "classic";
  
  if (selectedDesign !== "classic") {
    artOverlay.src = selectedDesign;
  }

  const renderStripLayout = () => {
    let loadedCount = 0;

    images.forEach((imgElement, index) => {
      const photoImg = new Image();
      photoImg.src = imgElement.src;

      photoImg.onload = () => {
        // Shared universal math logic loop
        const yOffset = topMargin + (index * (slotHeight + verticalGap));

        ctx.drawImage(photoImg, sidePadding, yOffset, slotWidth, slotHeight);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 6;
        ctx.strokeRect(sidePadding, yOffset, slotWidth, slotHeight);

        loadedCount++;

        if (loadedCount === images.length) {
          if (selectedDesign !== "classic") {
            ctx.drawImage(artOverlay, 0, 0, canvasWidth, canvasHeight);
          }
          triggerDownload();
        }
      };
    });
  };

  const triggerDownload = () => {
    const stripImageURL = finalCanvas.toDataURL("image/png");

      // NEW: send to Flask server
  fetch("/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: stripImageURL })
  }).catch(err => console.warn("Upload failed:", err));

    const downloadLink = document.createElement("a");
    downloadLink.href = stripImageURL;
    downloadLink.download = `photobooth-strip-${Date.now()}.png`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (selectedDesign !== "classic") {
    artOverlay.onload = renderStripLayout;
    artOverlay.onerror = () => {
      console.warn(`Could not locate your image file named "${selectedDesign}"! Saving raw layout instead.`);
      renderStripLayout();
    };
  } else {
    renderStripLayout();
  }
});

