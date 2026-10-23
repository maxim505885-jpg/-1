const story = document.querySelector(".story");
const stage = document.querySelector(".story-stage");
const frames = [...document.querySelectorAll(".story-frame")];
const currentFrame = document.querySelector("[data-current-frame]");
const sceneName = document.querySelector("[data-scene-name]");
const progressBar = document.querySelector(".scene-progress span");
const sceneNames = [
  "АРКТИЧЕСКАЯ СЦЕНА / СПУ",
  "ИССЛЕДОВАНИЕ / 3D",
  "ЭКСПЕРТИЗА / РАСЧЁТ",
  "ИЗБРАННЫЕ ОБЪЕКТЫ",
  "ОПЫТ / С 2000 ГОДА",
  "СЛЕДУЮЩИЙ ШАГ",
];
let framePending = false;
let previousIndex = -1;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function updateStory() {
  framePending = false;
  if (!story || !stage || frames.length === 0) return;

  const storyTop = story.getBoundingClientRect().top + window.scrollY;
  const travel = Math.max(story.offsetHeight - window.innerHeight, 1);
  const progress = clamp01((window.scrollY - storyTop) / travel);
  const index = Math.min(frames.length - 1, Math.floor(progress * frames.length));

  stage.style.setProperty("--scroll-progress", progress.toFixed(3));
  if (progressBar) progressBar.style.width = `${(progress * 100).toFixed(1)}%`;
  if (index !== previousIndex) {
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.classList.toggle("is-active", active);
      frame.inert = !active;
      frame.setAttribute("aria-hidden", String(!active));
    });
    if (currentFrame) currentFrame.textContent = String(index).padStart(2, "0");
    if (sceneName) sceneName.textContent = sceneNames[index] || "СПУ / ИНЖЕНЕРНОЕ БЮРО";
    previousIndex = index;
  }
}

function requestStoryUpdate() {
  if (framePending) return;
  framePending = true;
  window.requestAnimationFrame(updateStory);
}

window.addEventListener("scroll", requestStoryUpdate, { passive: true });
window.addEventListener("resize", requestStoryUpdate);
updateStory();
