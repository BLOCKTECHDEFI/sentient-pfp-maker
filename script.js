// Sentient Profile Maker - JS logic
const el = (id) => document.getElementById(id);

const state = {
  img: null, // user image
  logoImg: null, // current logo image (default or custom)
  defaultLogo: null, // default fallback logo
  canvasSize: 1024,
  renderScheduled: false,
};

// Load default logo (inline SVG to Image)
async function loadDefaultLogo() {
  const res = await fetch("logo.svg");
  const svgText = await res.text();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  return await loadImage(url);
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
  document.getElementById("loading").classList.toggle("hidden", !v);
}

async function render() {
  const c = el("previewCanvas");
  const ctx = c.getContext("2d");
  const size = state.canvasSize;
  if (c.width !== size) {
    c.width = c.height = size;
  }

  // clear
  ctx.clearRect(0, 0, size, size);

  // Background
  const transparentBg = el("transparentBg").checked;
  if (!transparentBg) {
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, "rgba(255,255,255,0.08)");
    bgGrad.addColorStop(1, "rgba(255,255,255,0.00)");
    ctx.fillStyle = "#0b0b0c";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);
  }

  // nothing else to draw until img is present
  if (!state.img) {
    const r = size * 0.35;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,0.08)");
    grad.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = grad;
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

  const addWatermark = el("addWatermark").checked;
  const watermarkScale = +el("watermarkScale").value / 100;
  const watermarkY = +el("watermarkY").value;

  const cx = size / 2,
    cy = size / 2;
  const baseR = size * 0.37;
  const ringR = baseR + Math.max(0, borderThickness);

  // Outer shadow
  if (shadowStrength > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = shadowStrength * 2.2;
    ctx.shadowOffsetY = shadowStrength * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.restore();
  }

  // Gradient border ring
  if (borderThickness > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.arc(0, 0, baseR, 0, Math.PI * 2, true);
    ctx.closePath();
    const ringGrad = ctx.createConicGradient(Math.PI * 0.6, 0, 0);
    ringGrad.addColorStop(0, "rgba(255,255,255,0.9)");
    ringGrad.addColorStop(0.25, "rgba(255,255,255,0.3)");
    ringGrad.addColorStop(0.5, "rgba(255,255,255,0.8)");
    ringGrad.addColorStop(0.75, "rgba(255,255,255,0.25)");
    ringGrad.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.fillStyle = ringGrad;
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

  // Logo ring
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

  // Main watermark
  if (addWatermark && logo) {
    const wmSize = baseR * watermarkScale;
    const wmX = cx - wmSize / 2;
    const wmY =
      cy + baseR - wmSize - Math.max(8, borderThickness * 0.4) + watermarkY;
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.drawImage(logo, wmX, wmY, wmSize, wmSize);
    ctx.restore();
  }
}

function updateReadouts() {
  el("logoCountVal").textContent = el("logoCount").value;
  el("logoScaleVal").textContent = el("logoScale").value + "%";
  el("ringOffsetVal").textContent = el("ringOffset").value + "px";
  el("borderThicknessVal").textContent = el("borderThickness").value + "px";
  el("shadowStrengthVal").textContent = el("shadowStrength").value;
  el("watermarkScaleVal").textContent = el("watermarkScale").value + "%";
  el("watermarkYVal").textContent = el("watermarkY").value + "px";
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
    "watermarkScale",
    "watermarkY",
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

  ["alignTangent", "addWatermark", "transparentBg"].forEach((id) => {
    el(id).addEventListener("change", () => scheduleRender());
  });

  el("resetBtn").addEventListener("click", () => {
    // updated defaults
    el("logoCount").value = 36;
    el("logoScale").value = 16;
    el("ringOffset").value = 10;
    el("borderThickness").value = 18;
    el("shadowStrength").value = 14;
    el("watermarkScale").value = 18;
    el("watermarkY").value = 10;
    el("canvasSize").value = 1024;
    state.canvasSize = 1024;
    el("alignTangent").checked = true;
    el("addWatermark").checked = true;
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
    const link = document.createElement("a");
    link.download = "sentient-pfp.png";
    link.href = c.toDataURL("image/png");
    link.click();
  };
  el("downloadBtn").addEventListener("click", (e) => {
    e.preventDefault();
    if (!el("downloadBtn").classList.contains("disabled")) doDownload();
  });
  el("downloadBtnBottom").addEventListener("click", doDownload);

  updateReadouts();
}

function enableDownload(enable) {
  const btn = el("downloadBtn");
  btn.classList.toggle("disabled", !enable);
  btn.setAttribute("aria-disabled", (!enable).toString());
}

window.addEventListener("DOMContentLoaded", async () => {
  await init();
  hookControls();
});
