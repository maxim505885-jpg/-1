const story = document.querySelector(".film-story");
const stage = document.querySelector(".film-stage");
const frames = [...document.querySelectorAll("[data-film-frame]")];
const canvas = document.querySelector(".structure-cloud");
const context = canvas?.getContext("2d", { alpha: true });
const progress = document.querySelector(".film-progress span");
const currentLabel = document.querySelector("[data-film-current]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)");

let targetProgress = 0;
let filmProgress = 0;
let previousTime = 0;
let rafId = 0;
let storyVisible = true;
let pointerX = 0;
let pointerY = 0;
let targetPointerX = 0;
let targetPointerY = 0;
let width = 0;
let height = 0;
let pixels = 1;
let cloudPoints = [];
let randomSeed = 73519;

const tasks = {
  rebuild: {
    kicker: "ПЕРЕД РЕКОНСТРУКЦИЕЙ",
    title: "Сначала — понять фактическое состояние.",
    copy: "Обследование помогает сопоставить реальное состояние конструкций с планами реконструкции и определить, какие решения нужны дальше.",
    services: ["Техническое обследование", "Расчёт конструкций", "Проектирование усиления"],
    subject: "Обследование перед реконструкцией",
  },
  defect: {
    kicker: "ТРЕЩИНЫ · ДЕФОРМАЦИИ · ПРОТЕЧКИ",
    title: "Установить причину, а не гадать по фотографии.",
    copy: "Инженеры фиксируют дефекты, проверяют конструкции и готовят выводы о текущем состоянии и дальнейших действиях.",
    services: ["Инструментальный контроль", "Поверочные расчёты", "Мониторинг"],
    subject: "Дефекты или деформации объекта",
  },
  industrial: {
    kicker: "ПРОМЫШЛЕННЫЙ ОБЪЕКТ",
    title: "Проверить здания, сооружения и оборудование.",
    copy: "СПУ проводит экспертизу промышленной безопасности зданий и технических устройств, а также обследования производственных конструкций.",
    services: ["ЭПБ зданий и сооружений", "ЭПБ технических устройств", "Испытания и контроль"],
    subject: "Экспертиза промышленной безопасности",
  },
  scan: {
    kicker: "ОБМЕРЫ · 3D-МОДЕЛЬ · ФАКТИЧЕСКАЯ ГЕОМЕТРИЯ",
    title: "Получить точную цифровую основу объекта.",
    copy: "Лазерное сканирование и обмерные работы помогают зафиксировать геометрию здания для обследования, проектирования или реконструкции.",
    services: ["Лазерное 3D-сканирование", "3D-модель", "Ортофотоплан"],
    subject: "3D-сканирование и обмеры объекта",
  },
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(start, end, value) {
  const amount = clamp((value - start) / (end - start));
  return amount * amount * (3 - 2 * amount);
}

function random() {
  randomSeed = (randomSeed * 16807) % 2147483647;
  return (randomSeed - 1) / 2147483646;
}

function createCloudPoints() {
  const points = [];
  const add = (x, y, z, color = 0) => points.push({
    x: x + (random() - 0.5) * 0.018,
    y: y + (random() - 0.5) * 0.018,
    z: z + (random() - 0.5) * 0.018,
    color,
    size: 0.65 + random() * 1.35,
    phase: random() * Math.PI * 2,
  });

  // Point-cloud surfaces and a simple frame grid represent an illustrative scan.
  const compact = window.innerWidth < 760;
  const step = compact ? 0.12 : 0.085;
  for (let x = -1; x <= 1.001; x += step) {
    for (let y = 0.05; y <= 1.501; y += step) {
      for (let z = -0.58; z <= 0.581; z += 0.29) add(x, y, z, Math.abs(x) < 0.08 ? 1 : 0);
    }
  }
  for (let z = -0.58; z <= 0.581; z += step) {
    for (let y = 0.05; y <= 1.501; y += step) {
      for (let x = -1; x <= 1.001; x += 0.4) add(x, y, z, 0);
    }
  }
  for (let floor = 0.05; floor <= 1.501; floor += 0.36) {
    for (let x = -1; x <= 1.001; x += step) {
      for (let z = -0.58; z <= 0.581; z += step) {
        add(x, floor, z, Math.abs(x) < 0.05 || Math.abs(z) < 0.05 ? 1 : 0);
      }
    }
  }
  // A small highlighted cluster reads as a measured point or area of attention.
  for (let index = 0; index < 95; index += 1) {
    add(.55 + (random() - .5) * .22, .86 + (random() - .5) * .25, .6 + (random() - .5) * .08, 2);
  }
  cloudPoints = points;
}

function resizeCanvas() {
  if (!canvas || !context) return;
  const box = canvas.getBoundingClientRect();
  width = box.width;
  height = box.height;
  pixels = Math.min(window.devicePixelRatio || 1, 1.65);
  canvas.width = Math.round(width * pixels);
  canvas.height = Math.round(height * pixels);
  context.setTransform(pixels, 0, 0, pixels, 0, 0);
  createCloudPoints();
  requestFrame();
}

function projectPoint(point, angle, pitch, scale, time, scanY) {
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const rotatedX = point.x * cosAngle - point.z * sinAngle;
  const rotatedZ = point.x * sinAngle + point.z * cosAngle;
  const rotatedY = point.y * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
  const depth = point.y * Math.sin(pitch) + rotatedZ * Math.cos(pitch);
  const perspective = 1 / (1.9 + depth * 0.25);
  const x = width * .58 + rotatedX * scale * perspective;
  const y = height * .54 - (rotatedY - .78) * scale * perspective;
  const scanPulse = Math.max(0, 1 - Math.abs(point.y - scanY) / .08);
  const shimmer = .76 + Math.sin(time * .0013 + point.phase) * .12;
  return { x, y, z: depth, alpha: shimmer + scanPulse * .42, scanPulse };
}

function drawStructure(time) {
  if (!context || !width || !height || !cloudPoints.length) return;
  context.clearRect(0, 0, width, height);
  const mobile = width < 760;
  const scale = Math.min(width * (mobile ? .73 : .72), height * .82);
  const angle = .58 + (filmProgress - .26) * 2.25 + Math.sin(time * .0002) * .045;
  const pitch = -.12 + Math.sin(filmProgress * Math.PI) * .09;
  const scanY = ((filmProgress * 2.7 + time * .00009) % 1) * 1.5;
  const scanFocus = smoothstep(.17, .225, filmProgress) * (1 - smoothstep(.305, .365, filmProgress));
  const heroFocus = 1 - smoothstep(.12, .24, filmProgress);
  const finalFocus = smoothstep(.75, .9, filmProgress);
  const visiblePoints = mobile ? 480 : 940;

  const floors = [.05, .41, .77, 1.13, 1.49];
  const xs = [-1, -.5, 0, .5, 1];
  const zs = [-.58, 0, .58];
  const edges = [];
  floors.forEach((y) => {
    for (let xi = 0; xi < xs.length - 1; xi += 1) {
      zs.forEach((z) => edges.push([[xs[xi], y, z], [xs[xi + 1], y, z]]));
    }
    for (let zi = 0; zi < zs.length - 1; zi += 1) {
      xs.forEach((x) => edges.push([[x, y, zs[zi]], [x, y, zs[zi + 1]]]));
    }
  });
  xs.forEach((x) => zs.forEach((z) => {
    edges.push([[x, floors[0], z], [x, floors[floors.length - 1], z]]);
  }));

  const lineOpacity = .22 + scanFocus * .54 + heroFocus * .08;
  context.lineWidth = 1;
  context.strokeStyle = `rgba(177,226,207,${lineOpacity})`;
  edges.forEach(([start, end]) => {
    const a = projectPoint({ x: start[0], y: start[1], z: start[2], phase: 0 }, angle, pitch, scale, time, scanY);
    const b = projectPoint({ x: end[0], y: end[1], z: end[2], phase: 0 }, angle, pitch, scale, time, scanY);
    context.globalAlpha = .22 + Math.max(0, 1 - Math.abs(a.z + b.z) * .35) * .48;
    context.beginPath();context.moveTo(a.x, a.y);context.lineTo(b.x, b.y);context.stroke();
  });

  const stride = Math.max(1, Math.floor(cloudPoints.length / visiblePoints));
  cloudPoints.forEach((point, index) => {
    if (index % stride !== 0) return;
    const projected = projectPoint(point, angle, pitch, scale, time, scanY);
    const color = point.color === 2 ? "255,110,66" : point.color === 1 ? "255,209,142" : "177,226,207";
    context.globalAlpha = (point.color === 2 ? .56 + finalFocus * .3 : .56 + scanFocus * .34 + heroFocus * .18) * projected.alpha;
    context.fillStyle = `rgb(${color})`;
    context.beginPath();context.arc(projected.x, projected.y, point.size * (1 + projected.scanPulse * .7), 0, Math.PI * 2);context.fill();
  });

  const sweep = height * (.27 + scanY / 1.5 * .45);
  context.globalAlpha = scanFocus * .6;
  context.strokeStyle = "rgba(255,110,66,.85)";
  context.lineWidth = 1;
  context.beginPath();context.moveTo(width * .2, sweep);context.lineTo(width * .92, sweep - 34);context.stroke();
  context.globalAlpha = 1;
}

function updateTarget() {
  if (!story || !stage) return;
  const top = story.getBoundingClientRect().top + window.scrollY;
  const distance = Math.max(story.offsetHeight - window.innerHeight, 1);
  targetProgress = clamp((window.scrollY - top) / distance);
  requestFrame();
}

function renderStory() {
  if (!frames.length) return;
  stage?.style.setProperty("--film-progress", filmProgress.toFixed(4));
  stage?.style.setProperty("--film-scale", (1.06 + filmProgress * .11).toFixed(4));
  stage?.style.setProperty("--film-x", `${(pointerX * .7).toFixed(1)}px`);
  stage?.style.setProperty("--film-y", `${(pointerY * .55).toFixed(1)}px`);
  const scanActive = smoothstep(.16,.23,filmProgress) * (1 - smoothstep(.3,.37,filmProgress));
  stage?.classList.toggle("scan-active", scanActive > .015);
  if (progress) progress.style.width = `${filmProgress * 100}%`;

  const position = filmProgress * frames.length;
  let activeIndex = 0;
  let maxOpacity = -1;
  frames.forEach((frame, index) => {
    const local = position - index;
    const fadeIn = index === 0 ? 1 : smoothstep(-.095, .095, local);
    const fadeOut = index === frames.length - 1 ? 1 : 1 - smoothstep(.905, 1.095, local);
    const opacity = fadeIn * fadeOut;
    frame.style.opacity = opacity.toFixed(3);
    frame.style.transform = reducedMotion.matches ? "none" : `translate3d(0,${((1-opacity)*25).toFixed(1)}px,0) scale(${(.987+opacity*.013).toFixed(4)})`;
    if (opacity > maxOpacity) { maxOpacity = opacity; activeIndex = index; }
  });
  frames.forEach((frame, index) => {
    const active = index === activeIndex;
    frame.classList.toggle("is-active", active);
    frame.inert = !active;
    frame.setAttribute("aria-hidden", String(!active));
  });
  if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, "0");
}

function animate(time) {
  rafId = 0;
  const delta = previousTime ? Math.min(time - previousTime, 64) : 16;
  previousTime = time;
  const progressFollow = reducedMotion.matches ? 1 : 1 - Math.exp(-delta / 330);
  const pointerFollow = 1 - Math.exp(-delta / 210);
  filmProgress += (targetProgress - filmProgress) * progressFollow;
  pointerX += (targetPointerX - pointerX) * pointerFollow;
  pointerY += (targetPointerY - pointerY) * pointerFollow;
  if (Math.abs(targetProgress - filmProgress) < .0002) filmProgress = targetProgress;
  if (Math.abs(targetPointerX - pointerX) < .01) pointerX = targetPointerX;
  if (Math.abs(targetPointerY - pointerY) < .01) pointerY = targetPointerY;

  renderStory();
  drawStructure(reducedMotion.matches ? 0 : time);
  const stillMoving = Math.abs(targetProgress - filmProgress) > .0002
    || Math.abs(targetPointerX - pointerX) > .01
    || Math.abs(targetPointerY - pointerY) > .01;
  if (!document.hidden && (storyVisible || stillMoving)) requestFrame();
}

function requestFrame() {
  if (!rafId && !document.hidden) rafId = window.requestAnimationFrame(animate);
}

function setupNeedSelector() {
  const buttons = [...document.querySelectorAll("[data-need]")];
  const panel = document.querySelector("#need-panel");
  if (!buttons.length || !panel) return;
  const kicker = panel.querySelector("[data-answer-kicker]");
  const title = panel.querySelector("[data-answer-title]");
  const copy = panel.querySelector("[data-answer-copy]");
  const services = panel.querySelector("[data-answer-services]");
  const cta = panel.querySelector("[data-answer-cta]");

  function choose(button) {
    const task = tasks[button.dataset.need];
    if (!task) return;
    buttons.forEach((item) => {
      const selected = item === button;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", button.id);
    panel.animate?.([{ opacity: .7, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" });
    kicker.textContent = task.kicker;
    title.textContent = task.title;
    copy.textContent = task.copy;
    services.replaceChildren(...task.services.map((service) => {
      const chip = document.createElement("span");chip.textContent = service;return chip;
    }));
    cta.href = `mailto:info@spu-pr.ru?subject=${encodeURIComponent(task.subject)}&body=${encodeURIComponent("Тип объекта:\nАдрес:\nЧто нужно проверить:\n")}`;
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => choose(button));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const direction = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1;
      const next = buttons[(index + direction + buttons.length) % buttons.length];
      next.focus();choose(next);
    });
  });
}

function setupReveals() {
  const elements = [...document.querySelectorAll(".section-intro,.section-heading,.needs-layout,.case-card,.service-list>a,.process-flow article,.deliverable,.about-layout>div,.contact-layout>div")];
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-shown"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-shown");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -35px 0px" });
  elements.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 65}ms`);
    observer.observe(element);
  });
}

if (pointerFine.matches && stage) {
  stage.addEventListener("pointermove", (event) => {
    const bounds = stage.getBoundingClientRect();
    targetPointerX = (event.clientX / bounds.width - .5) * 24;
    targetPointerY = (event.clientY / bounds.height - .5) * 18;
    requestFrame();
  });
  stage.addEventListener("pointerleave", () => { targetPointerX = 0;targetPointerY = 0;requestFrame(); });
}

if (story && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    storyVisible = entry.isIntersecting;
    if (storyVisible) requestFrame();
  }, { threshold: 0 });
  observer.observe(story);
}

window.addEventListener("scroll", updateTarget, { passive: true });
window.addEventListener("resize", () => { updateTarget();resizeCanvas(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (rafId) cancelAnimationFrame(rafId);rafId = 0;previousTime = 0; }
  else { updateTarget();requestFrame(); }
});
reducedMotion.addEventListener?.("change", () => { if (reducedMotion.matches) filmProgress = targetProgress;requestFrame(); });

setupNeedSelector();
setupReveals();
resizeCanvas();
updateTarget();
requestFrame();
