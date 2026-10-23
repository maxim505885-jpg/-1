const story = document.querySelector(".story");
const stage = document.querySelector(".story-stage");
const frames = [...document.querySelectorAll(".story-frame")];
const currentFrame = document.querySelector("[data-current-frame]");
const sceneName = document.querySelector("[data-scene-name]");
const progressBar = document.querySelector(".scene-progress span");
const particleCanvas = document.querySelector(".particle-field");
const particleContext = particleCanvas?.getContext("2d");
const sceneNames = [
  "АРКТИЧЕСКАЯ СЦЕНА / СПУ",
  "ИССЛЕДОВАНИЕ / 3D",
  "ЭКСПЕРТИЗА / РАСЧЁТ",
  "ИЗБРАННЫЕ ОБЪЕКТЫ",
  "ОПЫТ / С 2000 ГОДА",
  "СЛЕДУЮЩИЙ ШАГ",
];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const particleColors = ["#8052ff", "#ffb829", "#15846e", "#b49aff", "#7d8dff"];
let framePending = false;
let previousIndex = -1;
let scrollProgress = 0;
let particleFrame = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let particles = [];
let pointerX = 0;
let pointerY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function updateStory() {
  framePending = false;
  if (!story || !stage || frames.length === 0) return;

  const storyTop = story.getBoundingClientRect().top + window.scrollY;
  const travel = Math.max(story.offsetHeight - window.innerHeight, 1);
  scrollProgress = clamp01((window.scrollY - storyTop) / travel);
  const index = Math.min(frames.length - 1, Math.floor(scrollProgress * frames.length));

  stage.style.setProperty("--scroll-progress", scrollProgress.toFixed(3));
  if (progressBar) progressBar.style.width = `${(scrollProgress * 100).toFixed(1)}%`;
  if (index !== previousIndex) {
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.classList.toggle("is-active", active);
      frame.inert = !active;
      frame.setAttribute("aria-hidden", String(!active));
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
  pointerX += (pointerTargetX - pointerX) * 0.075;
  pointerY += (pointerTargetY - pointerY) * 0.075;
  stage?.style.setProperty("--pointer-x", `${pointerX.toFixed(2)}px`);
  stage?.style.setProperty("--pointer-y", `${pointerY.toFixed(2)}px`);
  stage?.style.setProperty("--pointer-tilt-x", `${(pointerX * -0.12).toFixed(2)}deg`);
  stage?.style.setProperty("--pointer-tilt-y", `${(pointerY * 0.12).toFixed(2)}deg`);
  drawParticles(time);
  if (!prefersReducedMotion.matches) {
    window.requestAnimationFrame(animateParticles);
  }
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

prefersReducedMotion.addEventListener?.("change", () => {
  if (!prefersReducedMotion.matches && !particleFrame) {
    particleFrame = window.requestAnimationFrame(animateParticles);
  }
});

updateStory();
createParticles();
if (!prefersReducedMotion.matches) {
  particleFrame = window.requestAnimationFrame(animateParticles);
} else {
  drawParticles(0);
}
