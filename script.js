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
