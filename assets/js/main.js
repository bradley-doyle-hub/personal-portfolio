// Lottie: pages with `lottie: true` in front matter load lottie-web.
// Mark up an animation with <div data-lottie="{{ '/assets/<slug>/anim.json' | relative_url }}"></div>.
window.addEventListener("load", function () {
  if (!window.lottie) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-lottie]").forEach(function (el) {
    window.lottie.loadAnimation({
      container: el,
      renderer: "svg",
      loop: el.dataset.lottieLoop !== "false",
      autoplay: !reduceMotion,
      path: el.dataset.lottie
    });
  });
});
