/** Scroll to the guest booking form once React has mounted `#booking`. */
export function scrollToBookingForm() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

  const run = () => {
    const target = document.getElementById("booking");
    if (!target) {
      return false;
    }
    target.scrollIntoView({ behavior, block: "start" });
    return true;
  };

  if (run()) {
    return;
  }

  // Book now selects a room first; the form mounts on the next paint(s).
  let frames = 0;
  const tick = () => {
    if (run() || frames++ > 45) {
      return;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}
