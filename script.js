const menuButton = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".nav");

menuButton?.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  siteNav?.classList.toggle("is-open", !expanded);
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  });
});

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const projectTrack = document.querySelector(".project-track");
document.querySelectorAll(".carousel-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!projectTrack) return;
    const card = projectTrack.querySelector(".project-card");
    const gap = Number.parseFloat(getComputedStyle(projectTrack).columnGap) || 0;
    const distance = (card?.getBoundingClientRect().width || projectTrack.clientWidth * 0.84) + gap;
    projectTrack.scrollBy({
      left: button.dataset.direction === "next" ? distance : -distance,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  });
});

const heroScene = document.querySelector(".hero-art");
const scrollModel = document.querySelector(".scroll-model");
const projectScenes = document.querySelectorAll(".project-image");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollFramePending = false;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function updateScrollDepth() {
  scrollFramePending = false;
  if (reduceMotion.matches) return;

  if (heroScene) {
    const heroHeight = heroScene.closest(".hero")?.offsetHeight || window.innerHeight;
    heroScene.style.setProperty("--hero-progress", clamp01(window.scrollY / (heroHeight * 0.9)).toFixed(3));
  }

  if (scrollModel) {
    const rect = scrollModel.getBoundingClientRect();
    const progress = clamp01((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
    scrollModel.style.setProperty("--model-progress", progress.toFixed(3));
  }

  projectScenes.forEach((scene) => {
    const rect = scene.getBoundingClientRect();
    const progress = clamp01((window.innerHeight * 0.9 - rect.top) / (window.innerHeight * 0.85));
    scene.style.setProperty("--card-progress", progress.toFixed(3));
  });
}

function requestScrollDepthUpdate() {
  if (scrollFramePending) return;
  scrollFramePending = true;
  window.requestAnimationFrame(updateScrollDepth);
}

window.addEventListener("scroll", requestScrollDepthUpdate, { passive: true });
window.addEventListener("resize", requestScrollDepthUpdate);
reduceMotion.addEventListener?.("change", requestScrollDepthUpdate);
updateScrollDepth();
