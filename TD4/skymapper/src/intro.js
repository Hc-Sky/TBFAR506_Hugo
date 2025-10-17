const INTRO_HOLD_MS = 3600;
const INTRO_FADE_MS = 900;

export function playIntro() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) {
    return Promise.resolve();
  }
  overlay.hidden = false;
  overlay.classList.remove('is-hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
  });

  return new Promise((resolve) => {
    window.setTimeout(() => {
      overlay.classList.remove('is-visible');
      window.setTimeout(() => {
        overlay.classList.add('is-hidden');
        overlay.hidden = true;
        resolve();
      }, INTRO_FADE_MS);
    }, INTRO_HOLD_MS);
  });
}
