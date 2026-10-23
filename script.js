const story = document.querySelector(".story");
const stage = document.querySelector(".story-stage");
const frames = [...document.querySelectorAll(".story-frame")];
const currentFrame = document.querySelector("[data-current-frame]");
const sceneName = document.querySelector("[data-scene-name]");
const progressBar = document.querySelector(".scene-progress span");
const particleCanvas = document.querySelector(".particle-field");
const particleContext = particleCanvas?.getContext("2d");
const scanCanvas = document.querySelector(".scan-cloud");
const scanContext = scanCanvas?.getContext("2d");
const sceneNames = [
  "ТЕХНИЧЕСКОЕ ОБСЛЕДОВАНИЕ СПУ",
  "ДИАГНОСТИКА / ИЗМЕРЕНИЯ",
  "ТЕХНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ / РЕШЕНИЯ",
  "РЕАЛЬНЫЕ ОБЪЕКТЫ / ПРОЕКТЫ",
  "ИНЖЕНЕРНАЯ ПРАКТИКА С 2000 ГОДА",
  "ОБСУДИТЬ ОБСЛЕДОВАНИЕ ОБЪЕКТА",
];
const motionGuideFrames = [
  { at: 0, x: 12, y: -38, z: -7, scale: 0.35, lift: 85, opacity: 0.04, cameraX: 0, cameraY: 0, cameraScale: 1.03, ring: 0, grid: 0 },
  { at: 0.08, x: 4, y: -5, z: -4, scale: 0.62, lift: 55, opacity: 0.62, cameraX: -12, cameraY: 4, cameraScale: 1.05, ring: 22, grid: -2 },
  { at: 0.16, x: -9, y: 32, z: 4, scale: 0.96, lift: 16, opacity: 0.9, cameraX: -36, cameraY: 12, cameraScale: 1.08, ring: 50, grid: 4 },
  { at: 0.24, x: 6, y: 84, z: 11, scale: 0.72, lift: -10, opacity: 0.92, cameraX: -60, cameraY: 20, cameraScale: 1.13, ring: 92, grid: 9 },
  { at: 0.32, x: 18, y: 146, z: 2, scale: 1.08, lift: 25, opacity: 0.86, cameraX: -25, cameraY: 35, cameraScale: 1.17, ring: 130, grid: 13 },
  { at: 0.4, x: -7, y: 205, z: -10, scale: 1.22, lift: -30, opacity: 0.92, cameraX: 18, cameraY: 10, cameraScale: 1.2, ring: 180, grid: 4 },
  { at: 0.48, x: -16, y: 264, z: -3, scale: 0.76, lift: -65, opacity: 0.88, cameraX: 36, cameraY: -8, cameraScale: 1.22, ring: 230, grid: -8 },
  { at: 0.56, x: 8, y: 327, z: 10, scale: 1.16, lift: -5, opacity: 0.92, cameraX: 22, cameraY: -18, cameraScale: 1.24, ring: 270, grid: -12 },
  { at: 0.64, x: 17, y: 390, z: 4, scale: 0.93, lift: 28, opacity: 0.86, cameraX: -18, cameraY: -12, cameraScale: 1.2, ring: 320, grid: -4 },
  { at: 0.72, x: -4, y: 448, z: -12, scale: 1.24, lift: -40, opacity: 0.9, cameraX: -48, cameraY: 6, cameraScale: 1.17, ring: 360, grid: 8 },
  { at: 0.8, x: -13, y: 503, z: -4, scale: 0.94, lift: 0, opacity: 0.8, cameraX: -20, cameraY: 22, cameraScale: 1.14, ring: 420, grid: 13 },
  { at: 0.9, x: 8, y: 560, z: 12, scale: 1.12, lift: 48, opacity: 0.62, cameraX: 20, cameraY: 10, cameraScale: 1.12, ring: 475, grid: 5 },
  { at: 1, x: 0, y: 615, z: 0, scale: 0.55, lift: 95, opacity: 0.04, cameraX: 0, cameraY: 0, cameraScale: 1.08, ring: 540, grid: 0 },
];
const motionFrames = Array.from({ length: 100 }, (_, index) => sampleMotionGuide(index / 99));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const particleColors = ["#8052ff", "#ffb829", "#15846e", "#b49aff", "#7d8dff"];
let framePending = false;
let previousIndex = -1;
let scrollProgress = 0;
let targetProgress = 0;
let lastMotionTime = 0;
let particleFrame = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let scanWidth = 0;
let scanHeight = 0;
let particles = [];
let scanPoints = [];
let pointerX = 0;
let pointerY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const progress = clamp01((value - edge0) / (edge1 - edge0));
  return progress * progress * (3 - 2 * progress);
}

function sampleMotionGuide(progress) {
  let nextIndex = motionGuideFrames.findIndex((frame) => frame.at >= progress);
  if (nextIndex < 1) nextIndex = 1;
  if (nextIndex < 0) nextIndex = motionGuideFrames.length - 1;

  const start = motionGuideFrames[nextIndex - 1];
  const end = motionGuideFrames[nextIndex];
  const previous = motionGuideFrames[Math.max(0, nextIndex - 2)];
  const following = motionGuideFrames[Math.min(motionGuideFrames.length - 1, nextIndex + 1)];
  const t = clamp01((progress - start.at) / (end.at - start.at));
  const t2 = t * t;
  const t3 = t2 * t;
  const sampled = { at: progress };

  Object.keys(start).forEach((key) => {
    if (key === "at") return;
    sampled[key] = 0.5 * (
      2 * start[key]
      + (-previous[key] + end[key]) * t
      + (2 * previous[key] - 5 * start[key] + 4 * end[key] - following[key]) * t2
      + (-previous[key] + 3 * start[key] - 3 * end[key] + following[key]) * t3
    );
  });
  return sampled;
}

function applyMotionFrame(progress) {
  if (!stage) return;
  let nextIndex = motionFrames.findIndex((frame) => frame.at >= progress);
  if (nextIndex < 1) nextIndex = 1;
  if (nextIndex < 0) nextIndex = motionFrames.length - 1;

  const start = motionFrames[nextIndex - 1];
  const end = motionFrames[nextIndex];
  const localProgress = clamp01((progress - start.at) / (end.at - start.at));
  const blend = (key) => start[key] + (end[key] - start[key]) * localProgress;

  stage.style.setProperty("--model-rotate-x", `${blend("x").toFixed(2)}deg`);
  stage.style.setProperty("--model-rotate-y", `${blend("y").toFixed(2)}deg`);
  stage.style.setProperty("--model-rotate-z", `${blend("z").toFixed(2)}deg`);
  stage.style.setProperty("--model-scale", Math.min(1.12, Math.max(0.35, blend("scale"))).toFixed(3));
  stage.style.setProperty("--model-lift", `${blend("lift").toFixed(2)}px`);
  const storyPosition = progress * frames.length;
  const scanFocus = smoothstep(1.08, 1.3, storyPosition) * (1 - smoothstep(1.72, 1.94, storyPosition));
  stage.style.setProperty("--scan-focus", scanFocus.toFixed(3));
  stage.style.setProperty("--model-opacity", (clamp01(blend("opacity")) * (1 - scanFocus)).toFixed(3));
  stage.style.setProperty("--camera-x", `${blend("cameraX").toFixed(2)}px`);
  stage.style.setProperty("--camera-y", `${blend("cameraY").toFixed(2)}px`);
  stage.style.setProperty("--camera-scale", blend("cameraScale").toFixed(3));
  stage.style.setProperty("--ring-rotation", `${blend("ring").toFixed(2)}deg`);
  stage.style.setProperty("--grid-rotation", `${blend("grid").toFixed(2)}deg`);
}

function updateStory() {
  framePending = false;
  if (!story || !stage || frames.length === 0) return;

  const storyTop = story.getBoundingClientRect().top + window.scrollY;
  const travel = Math.max(story.offsetHeight - window.innerHeight, 1);
  targetProgress = clamp01((window.scrollY - storyTop) / travel);
  if (prefersReducedMotion.matches) scrollProgress = targetProgress;
  renderStoryProgress();
  if (prefersReducedMotion.matches) {
    drawParticles(0);
    drawScanCloud(0);
  }
}

function renderStoryProgress() {
  if (!stage || frames.length === 0) return;
  const index = Math.min(frames.length - 1, Math.floor(scrollProgress * frames.length));
  stage.style.setProperty("--scroll-progress", scrollProgress.toFixed(3));
  applyMotionFrame(scrollProgress);
  if (progressBar) progressBar.style.setProperty("--progress", scrollProgress.toFixed(4));

  const chapterPosition = scrollProgress * frames.length;
  frames.forEach((frame, frameIndex) => {
    const local = chapterPosition - frameIndex;
    const fadeIn = frameIndex === 0 ? 1 : smoothstep(0, 0.06, local);
    const fadeOut = frameIndex === frames.length - 1 ? 1 : 1 - smoothstep(0.94, 1, local);
    const opacity = fadeIn * fadeOut;
    frame.style.opacity = opacity.toFixed(3);
    frame.style.transform = prefersReducedMotion.matches
      ? "none"
      : `translate3d(0, ${(1 - opacity) * 12}px, 0) scale(${(0.99 + opacity * 0.01).toFixed(4)})`;
    const isVisible = opacity > 0.005;
    if (frame.classList.contains("is-visible") !== isVisible) frame.classList.toggle("is-visible", isVisible);
  });

  if (index !== previousIndex) {
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.classList.toggle("is-active", active);
      frame.inert = !active;
      frame.setAttribute("aria-hidden", String(!active));
      frame.style.setProperty("--frame-index-opacity", active ? "1" : "0");
    });
    if (currentFrame) currentFrame.textContent = String(index + 1).padStart(2, "0");
    if (sceneName) sceneName.textContent = sceneNames[index] || "СПУ / ИНЖЕНЕРНОЕ БЮРО";
    previousIndex = index;
  }
}

function requestStoryUpdate() {
  if (framePending) return;
  framePending = true;
  window.requestAnimationFrame(updateStory);
}

function createParticles() {
  if (!particleCanvas || !particleContext) return;
  const bounds = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = bounds.width;
  canvasHeight = bounds.height;
  particleCanvas.width = Math.round(canvasWidth * ratio);
  particleCanvas.height = Math.round(canvasHeight * ratio);
  particleContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  let seed = 1247;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const compact = bounds.width < 760;
  const count = compact ? 320 : 820;
  particles = Array.from({ length: count }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const side = Math.cos(angle);
    const lift = Math.sin(angle);
    const silhouette = 0.94 - Math.abs(lift) * 0.08 - Math.pow(Math.abs(side), 5) * 0.06;
    const split = 0.82 + 0.18 * Math.min(1, Math.abs(side) * 5);
    return {
      x: side * radius * silhouette,
      y: lift * radius * 0.82 * split,
      size: 1.45 + random() * (compact ? 1.8 : 2.3),
      phase: random() * Math.PI * 2,
      speed: 0.45 + random() * 1.3,
      color: particleColors[Math.floor(random() * particleColors.length)],
      alpha: 0.32 + random() * 0.62,
      triangle: index % 5 !== 0,
      orbit: (random() - 0.5) * 0.09,
    };
  });
  resizeScanCanvas();
}

function resizeScanCanvas() {
  if (!scanCanvas || !scanContext) return;
  const bounds = scanCanvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  scanWidth = bounds.width;
  scanHeight = bounds.height;
  scanCanvas.width = Math.round(scanWidth * ratio);
  scanCanvas.height = Math.round(scanHeight * ratio);
  scanContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createScanPoints() {
  let seed = 8431;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const points = [];
  const add = (x, y, z, surface = 0) => points.push({
    x: x + (random() - 0.5) * 0.012,
    y: y + (random() - 0.5) * 0.012,
    z: z + (random() - 0.5) * 0.012,
    surface,
    size: 0.55 + random() * 0.85,
    phase: random() * Math.PI * 2,
  });

  for (let x = -1; x <= 1.001; x += 0.045) {
    for (let y = 0.05; y <= 1.001; y += 0.045) {
      const windowBand = y > 0.3 && y < 0.72;
      const windowZone = Math.abs(x) < 0.76 && Math.floor((x + 0.76) / 0.2) % 3 !== 2;
      if (!(windowBand && windowZone)) add(x, y, 0.68, 0);
      add(x, y, -0.68, 1);
    }
  }

  for (let z = -0.68; z <= 0.681; z += 0.045) {
    for (let y = 0.05; y <= 1.001; y += 0.045) {
      add(-1, y, z, 1);
      add(1, y, z, 1);
    }
    for (let x = -1; x <= 1.001; x += 0.045) {
      add(x, 0.04, z, 2);
      const roof = 1.04 + (1 - Math.abs(x)) * 0.28;
      add(x, roof, z, 2);
    }
  }

  for (let beam = -0.85; beam <= 0.851; beam += 0.28) {
    for (let y = 0.08; y <= 1.2; y += 0.035) {
      add(beam, y, 0.694, 2);
      add(beam, y, -0.694, 2);
    }
  }
  scanPoints = points;
}

function drawScanCloud(time) {
  if (!scanContext || !scanWidth || !scanHeight) return;
  const context = scanContext;
  const storyPosition = scrollProgress * frames.length;
  const focus = smoothstep(1.04, 1.25, storyPosition) * (1 - smoothstep(1.75, 1.96, storyPosition));
  context.clearRect(0, 0, scanWidth, scanHeight);
  if (focus <= 0.002 || scanPoints.length === 0) return;

  const centerX = scanWidth * 0.52;
  const centerY = scanHeight * 0.54;
  const scale = Math.min(scanWidth * 0.38, scanHeight * 0.39);
  const yaw = 0.28 + Math.sin(time * 0.0002) * 0.11 + (storyPosition - 1.5) * 0.23;
  const pitch = -0.16;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const scanLine = (time * 0.00022) % 1;

  context.globalAlpha = focus * 0.32;
  context.strokeStyle = "rgba(189,218,229,.55)";
  context.lineWidth = 0.7;
  context.beginPath();
  context.ellipse(centerX, centerY + scale * 0.24, scale * 1.05, scale * 0.24, -0.12, 0, Math.PI * 2);
  context.stroke();

  scanPoints.forEach((point) => {
    const rotatedX = point.x * cosYaw + point.z * sinYaw;
    const rotatedZ = -point.x * sinYaw + point.z * cosYaw;
    const rotatedY = point.y * cosPitch - rotatedZ * sinPitch;
    const depth = point.y * sinPitch + rotatedZ * cosPitch;
    const perspective = 1 / (1.65 + depth * 0.22);
    const x = centerX + rotatedX * scale * perspective;
    const y = centerY - (rotatedY - 0.56) * scale * perspective;
    const scanDistance = Math.abs((point.y / 1.4) - scanLine);
    const scanPulse = scanDistance < 0.035 ? (1 - scanDistance / 0.035) : 0;
    const shimmer = 0.68 + Math.sin(time * 0.001 + point.phase) * 0.12;
    const alpha = focus * (shimmer + scanPulse * 0.28);
    const color = point.surface === 2 ? "249,187,79" : point.surface === 1 ? "152,145,255" : "158,222,222";
    context.globalAlpha = alpha;
    context.fillStyle = `rgb(${color})`;
    context.beginPath();
    context.arc(x, y, point.size * (1 + scanPulse * 0.7), 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawParticles(time) {
  if (!particleContext || !canvasWidth || !canvasHeight) return;
  const context = particleContext;
  const compact = canvasWidth < 760;
  const centerX = canvasWidth * (compact ? 0.66 : 0.66) + pointerX * 0.7;
  const centerY = canvasHeight * (compact ? 0.49 : 0.47) + pointerY * 0.55;
  const cloudWidth = canvasWidth * (compact ? 0.52 : 0.34);
  const cloudHeight = canvasHeight * (compact ? 0.35 : 0.39);
  const reveal = clamp01((scrollProgress - 0.02) * 1.6 + 0.58);

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  particles.forEach((particle, index) => {
    const drift = Math.sin(time * 0.00035 * particle.speed + particle.phase) * (compact ? 2.5 : 4.5);
    const turn = scrollProgress * 0.14 + particle.orbit;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const sourceX = particle.x * cloudWidth;
    const sourceY = particle.y * cloudHeight;
    const x = centerX + sourceX * cos - sourceY * sin;
    const y = centerY + sourceX * sin + sourceY * cos + drift;
    const twinkle = 0.55 + Math.sin(time * 0.0012 * particle.speed + particle.phase) * 0.25;
    const opacity = particle.alpha * twinkle * reveal;
    const size = particle.size * (1 + scrollProgress * 0.22);

    context.globalAlpha = opacity;
    context.strokeStyle = particle.color;
    context.fillStyle = particle.color;
    context.lineWidth = 0.7;
    if (particle.triangle) {
      const rotation = particle.phase + time * 0.00012 * particle.speed + scrollProgress * 0.25;
      context.beginPath();
      for (let point = 0; point < 3; point += 1) {
        const angle = rotation + point * (Math.PI * 2 / 3);
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.stroke();
    } else {
      context.beginPath();
      context.arc(x, y, size * 0.42, 0, Math.PI * 2);
      context.fill();
    }
    if (index % 17 === 0) {
      context.globalAlpha = opacity * 0.35;
      context.beginPath();
      context.arc(x, y, size * 3.2, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.globalAlpha = 1;
}

function animateParticles(time) {
  particleFrame = 0;
  const delta = lastMotionTime ? Math.min(time - lastMotionTime, 64) : 16;
  lastMotionTime = time;
  if (Math.abs(targetProgress - scrollProgress) > 0.0002) {
    const follow = 1 - Math.exp(-delta / 185);
    scrollProgress += (targetProgress - scrollProgress) * follow;
    if (Math.abs(targetProgress - scrollProgress) < 0.0002) scrollProgress = targetProgress;
    renderStoryProgress();
  }
  pointerX += (pointerTargetX - pointerX) * 0.075;
  pointerY += (pointerTargetY - pointerY) * 0.075;
  stage?.style.setProperty("--pointer-x", `${pointerX.toFixed(2)}px`);
  stage?.style.setProperty("--pointer-y", `${pointerY.toFixed(2)}px`);
  stage?.style.setProperty("--pointer-tilt-x", `${(pointerX * -0.12).toFixed(2)}deg`);
  stage?.style.setProperty("--pointer-tilt-y", `${(pointerY * 0.12).toFixed(2)}deg`);
  drawParticles(time);
  drawScanCloud(time);
  if (!prefersReducedMotion.matches && !document.hidden) {
    particleFrame = window.requestAnimationFrame(animateParticles);
  }
}

function syncAmbientMotion() {
  document.documentElement.classList.toggle("motion-paused", document.hidden);
  if (prefersReducedMotion.matches || document.hidden) {
    if (particleFrame) window.cancelAnimationFrame(particleFrame);
    particleFrame = 0;
    if (prefersReducedMotion.matches) {
      renderStoryProgress();
      drawParticles(0);
      drawScanCloud(0);
    }
    return;
  }
  if (!particleFrame) particleFrame = window.requestAnimationFrame(animateParticles);
}

const depthSections = [...document.querySelectorAll(".content-section, .contact-strip")];
const depthItems = [...document.querySelectorAll(
  ".service-card, .project-card, .about-quote, .about-numbers, .about-badges a, .known-object-tags span, .contact-details > a",
)];
let depthFramePending = false;

function updateDepthScene() {
  depthFramePending = false;
  const viewportHeight = window.innerHeight || 1;
  const compact = window.innerWidth < 760;
  depthSections.forEach((section) => {
    const bounds = section.getBoundingClientRect();
    const progress = clamp01((viewportHeight - bounds.top) / (viewportHeight + bounds.height));
    const drift = (progress - 0.5) * (compact ? -100 : -158);
    const tilt = (0.5 - progress) * (compact ? 5.2 : 7.4);
    section.style.setProperty("--section-scroll", progress.toFixed(3));
    section.style.setProperty("--section-drift", `${drift.toFixed(1)}px`);
    section.style.setProperty("--section-drift-x", `${(drift * -1).toFixed(1)}px`);
    section.style.setProperty("--section-drift-y", `${(drift * 0.8).toFixed(1)}px`);
    section.style.setProperty("--section-drift-reverse", `${(drift * -1).toFixed(1)}px`);
    section.style.setProperty("--section-tilt", `${tilt.toFixed(2)}deg`);
    section.style.setProperty("--section-tilt-inverse", `${(-tilt).toFixed(2)}deg`);
    section.style.setProperty("--section-tilt-double", `${(tilt * 2).toFixed(2)}deg`);
    section.style.setProperty("--content-drift", `${((progress - 0.5) * (compact ? -64 : -112)).toFixed(1)}px`);
    section.style.setProperty("--content-tilt", `${(tilt * 0.34).toFixed(2)}deg`);
  });

  depthItems.forEach((item) => {
    const bounds = item.getBoundingClientRect();
    const offset = clamp01((bounds.top + bounds.height / 2) / viewportHeight);
    const parallax = (offset - 0.5) * (compact ? -16 : -30);
    item.style.setProperty("--item-drift", `${parallax.toFixed(1)}px`);
    if (item.classList.contains("project-card")) {
      item.style.setProperty("--image-drift", `${(parallax * 1.35).toFixed(1)}px`);
    }
  });
}

function requestDepthUpdate() {
  if (depthFramePending) return;
  depthFramePending = true;
  window.requestAnimationFrame(updateDepthScene);
}

function setupDepthExperience() {
  if (prefersReducedMotion.matches) return;
  document.documentElement.classList.add("has-depth-motion");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("is-depth-visible", entry.isIntersecting));
  }, { threshold: 0.08, rootMargin: "0px 0px -7% 0px" });

  depthItems.forEach((item, index) => {
    item.classList.add("depth-card");
    item.style.setProperty("--depth-order", String(index % 8));
    item.style.setProperty("--depth-delay", `${(index % 8) * 32}ms`);
    observer.observe(item);
    if (!hasFinePointer.matches) return;
    item.addEventListener("pointermove", (event) => {
      const bounds = item.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      item.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
      item.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
    });
    item.addEventListener("pointerleave", () => {
      item.style.setProperty("--tilt-x", "0deg");
      item.style.setProperty("--tilt-y", "0deg");
    });
  });

  window.addEventListener("scroll", requestDepthUpdate, { passive: true });
  window.addEventListener("resize", requestDepthUpdate);
  requestDepthUpdate();
}

window.addEventListener("scroll", requestStoryUpdate, { passive: true });
window.addEventListener("resize", () => {
  requestStoryUpdate();
  createParticles();
});

if (hasFinePointer.matches && !prefersReducedMotion.matches) {
  stage?.addEventListener("pointermove", (event) => {
    const bounds = stage.getBoundingClientRect();
    pointerTargetX = (event.clientX / bounds.width - 0.5) * 22;
    pointerTargetY = (event.clientY / bounds.height - 0.5) * 16;
  });
  stage?.addEventListener("pointerleave", () => {
    pointerTargetX = 0;
    pointerTargetY = 0;
  });
}

prefersReducedMotion.addEventListener?.("change", syncAmbientMotion);
document.addEventListener("visibilitychange", syncAmbientMotion);

updateStory();
createParticles();
createScanPoints();
if (!prefersReducedMotion.matches) {
  syncAmbientMotion();
} else {
  drawParticles(0);
  drawScanCloud(0);
}
setupDepthExperience();
