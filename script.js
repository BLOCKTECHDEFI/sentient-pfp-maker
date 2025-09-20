// Sentient Profile Maker - JS logic (final, no body watermark, pink ring, logo.jpg only)
const el = (id) => document.getElementById(id);

const state = {
  img: null,
  logoImg: null,
  defaultLogo: null,
  canvasSize: 1024,
  renderScheduled: false,
};

// Always load logo.jpg
async function loadDefaultLogo() {
  return await loadImage("logo.jpg");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = await loadImage(e.target.result);
        resolve(img);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function scheduleRender() {
  if (state.renderScheduled) return;
  state.renderScheduled = true;
  requestAnimationFrame(() => {
    render();
    state.renderScheduled = false;
  });
}

function setLoading(v) {
  const elLoading = el("loading");
  if (!elLoading) return;
  elLoading.classList.toggle("hidden", !v);
}

async function render() {
  const c = el("previewCanvas");
  const ctx = c.getContext("2d");
  const size = state.canvasSize;
  if (c.width !== size || c.height !== size) {
    c.width = c.height = size;
  }

  // clear
  ctx.clearRect(0, 0, size, size);

  // Background
  const transparentBg = el("transparentBg").checked;
  if (!transparentBg) {
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, "rgba(255,250,245,0.9)");
    bgGrad.addColorStop(1, "rgba(255,255,255,0.96)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);
  }

  // nothing else to draw until img is present
  if (!state.img) {
    const r = size * 0.35;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.fillStyle = "rgba(255,93,158,0.15)"; // light pink fallback
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const img = state.img;
  const logo = state.logoImg || state.defaultLogo;

  const ringCount = +el("logoCount").value;
  const logoScale = +el("logoScale").value / 100;
  const ringOffset = +el("ringOffset").value;
  const alignTangent = el("alignTangent").checked;

  const borderThickness = +el("borderThickness").value;
  const shadowStrength = +el("shadowStrength").value;

  const cx = size / 2,
    cy = size / 2;
  const baseR = size * 0.37;
  const ringR = baseR + Math.max(0, borderThickness);

  // Outer shadow
  if (shadowStrength > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = shadowStrength * 2;
    ctx.shadowOffsetY = shadowStrength * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fill();
    ctx.restore();
  }

  // Solid pink border ring
  if (borderThickness > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.arc(0, 0, baseR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "#FD6A8E"; // light pink color from logo
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.restore();
  }

  // Clip circle & draw image
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.clip();
  const imgRatio = img.width / img.height;
  const box = baseR * 2;
  let dw = box,
    dh = box;
  if (imgRatio > 1) {
    dh = box;
    dw = dh * imgRatio;
  } else {
    dw = box;
    dh = dw / imgRatio;
  }
  const dx = cx - dw / 2;
  const dy = cy - dh / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // Logo ring (ONLY logos here)
  if (logo) {
    const logoBase = baseR * logoScale;
    const rr = baseR + ringOffset;
    for (let i = 0; i < ringCount; i++) {
      const t = (i / ringCount) * Math.PI * 2;
      const x = cx + rr * Math.cos(t);
      const y = cy + rr * Math.sin(t);

      ctx.save();
      ctx.translate(x, y);
      let rot = 0;
      if (alignTangent) {
        rot = t + Math.PI / 2;
      }
      ctx.rotate(rot);
      ctx.drawImage(logo, -logoBase / 2, -logoBase / 2, logoBase, logoBase);
      ctx.restore();
    }
  }
}

function updateReadouts() {
  el("logoCountVal").textContent = el("logoCount").value;
  el("logoScaleVal").textContent = el("logoScale").value + "%";
  el("ringOffsetVal").textContent = el("ringOffset").value + "px";
  el("borderThicknessVal").textContent = el("borderThickness").value + "px";
  el("shadowStrengthVal").textContent = el("shadowStrength").value;
  el("canvasSizeVal").textContent = el("canvasSize").value + "px";
}

async function init() {
  setLoading(true);
  state.defaultLogo = await loadDefaultLogo();
  state.logoImg = state.defaultLogo;
  setLoading(false);
  render();
}

function hookControls() {
  el("pfpInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      state.img = await fileToImage(f);
      scheduleRender();
      enableDownload(true);
    } catch (err) {
      alert("Could not load image.");
    } finally {
      setLoading(false);
    }
  });

  el("useCustomLogo").addEventListener("change", (e) => {
    el("logoInput").disabled = !e.target.checked;
    if (!e.target.checked) {
      state.logoImg = state.defaultLogo;
      scheduleRender();
    }
  });

  el("logoInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      state.logoImg = await fileToImage(f);
      scheduleRender();
    } catch (err) {
      alert("Could not load logo.");
    } finally {
      setLoading(false);
    }
  });

  const rangeIds = [
    "logoCount",
    "logoScale",
    "ringOffset",
    "borderThickness",
    "shadowStrength",
    "canvasSize",
  ];
  rangeIds.forEach((id) => {
    el(id).addEventListener("input", () => {
      updateReadouts();
      if (id === "canvasSize") {
        state.canvasSize = +el("canvasSize").value;
      }
      scheduleRender();
    });
  });

  ["alignTangent", "transparentBg"].forEach((id) => {
    el(id).addEventListener("change", () => scheduleRender());
  });

  el("resetBtn").addEventListener("click", () => {
    // updated defaults
    el("logoCount").value = 36;
    el("logoScale").value = 16;
    el("ringOffset").value = 10;
    el("borderThickness").value = 18;
    el("shadowStrength").value = 14;
    el("canvasSize").value = 1024;
    state.canvasSize = 1024;
    el("alignTangent").checked = true;
    el("transparentBg").checked = false;
    el("useCustomLogo").checked = false;
    el("logoInput").disabled = true;
    state.logoImg = state.defaultLogo;
    updateReadouts();
    scheduleRender();
  });

  const doDownload = () => {
    const c = el("previewCanvas");
    render();
    setTimeout(() => {
      const link = document.createElement("a");
      link.download = "sentient-pfp.png";
      link.href = c.toDataURL("image/png");
      link.click();
    }, 60);
  };

  // Top download (header)
  const topBtn = el("downloadBtnTop");
  topBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (topBtn.getAttribute("aria-disabled") === "true") return;
    doDownload();
  });

  // Bottom download
  el("downloadBtnBottom").addEventListener("click", doDownload);

  updateReadouts();
}

function enableDownload(enable) {
  const btn = el("downloadBtnTop");
  if (!btn) return;
  btn.classList.toggle("disabled", !enable);
  btn.setAttribute("aria-disabled", (!enable).toString());
}

window.addEventListener("DOMContentLoaded", async () => {
  await init();
  hookControls();
});
