(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // Nav: Ottawa clock, and the wordmark tucks away once you scroll.
  var clock = document.querySelector("[data-clock]");
  var zone = document.querySelector("[data-clock-zone]");
  function tick() {
    var now = new Date();
    clock.textContent = now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Toronto" });
    var tz = now.toLocaleTimeString("en-US", { timeZone: "America/Toronto", timeZoneName: "short" }).split(" ").pop();
    if (zone && /^E[SD]T$/.test(tz)) zone.textContent = tz.toLowerCase();
  }
  if (clock) { tick(); setInterval(tick, 30000); }

  var nav = document.querySelector("[data-nav]");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-compact", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Work sections: grid / index toggle. The choice carries across pages.
  document.querySelectorAll("[data-work]").forEach(function (section) {
    var buttons = section.querySelectorAll("[data-view-btn]");
    var panels = section.querySelectorAll("[data-view-panel]");
    function show(view) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.viewBtn === view)); });
      panels.forEach(function (p) { p.hidden = p.dataset.viewPanel !== view; });
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.viewBtn); store("bd-work-view", b.dataset.viewBtn); });
    });
    var saved = store("bd-work-view");
    show(saved === "index" ? "index" : "grid");
  });

  // Archive: discipline filter and the offset grid.
  var archive = document.querySelector("[data-archive]");
  if (archive) {
    var chips = archive.querySelectorAll("[data-filter]");
    var cards = archive.querySelectorAll(".archive-grid .card");
    var rows = archive.querySelectorAll(".work-index .row");

    // Offset grid on 24 columns. Rows run small, large, small, then two halves.
    // SMALL is the width of the narrow cards in columns (7 of 24 is 29%). Raise it
    // for bigger narrow cards. The large card takes what's left (24 - 2 * SMALL).
    // The last card stretches to close its row.
    var SMALL = 7;
    function layout() {
      var shown = Array.prototype.filter.call(cards, function (c) { return !c.hidden; });
      var pattern = [SMALL, 24 - 2 * SMALL, SMALL, 12, 12];
      var last = shown.length - 1;
      shown.forEach(function (card, i) {
        var span = pattern[i % 5];
        if (i === last && (i % 5 === 0 || i % 5 === 3)) span = 24;
        else if (i === last && i % 5 === 1) span = 24 - SMALL;
        card.style.setProperty("--span", span);
        card.style.setProperty("--span-narrow", i === last && i % 2 === 0 ? 2 : 1);
      });
    }

    function applyFilter(tag) {
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.filter === tag)); });
      [cards, rows].forEach(function (list) {
        list.forEach(function (el) {
          var tags = (el.dataset.tags || "").split("|");
          el.hidden = tag !== "all" && tags.indexOf(tag) === -1;
        });
      });
      layout();
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () { applyFilter(c.dataset.filter); });
    });
    layout();
  }

  // Hero reel: scrubber and timecode follow the background loop.
  var video = document.querySelector("[data-hero-video]");
  if (video) {
    var bar = document.querySelector("[data-hero-progress]");
    var tc = document.querySelector("[data-hero-timecode]");
    var fmt = function (s) {
      s = Math.floor(s || 0);
      return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    };
    video.addEventListener("timeupdate", function () {
      if (!video.duration) return;
      if (bar) bar.style.width = (video.currentTime / video.duration) * 100 + "%";
      if (tc) tc.textContent = fmt(video.currentTime) + " / " + fmt(video.duration);
    });
    if (reduceMotion) video.pause();
  }

  // Hero reel from YouTube/Vimeo: muted background loop. Skipped for reduced
  // motion. The fade-in waits a beat so the player's title card never shows.
  document.querySelectorAll("[data-bg-video]").forEach(function (bg) {
    if (reduceMotion) return;
    bg.addEventListener("load", function () {
      setTimeout(function () { bg.classList.add("is-ready"); }, 1800);
    });
    bg.src = bg.dataset.src;
  });

  // Project hero: click swaps the muted preview for the full player with sound.
  document.querySelectorAll("[data-player]").forEach(function (player) {
    var play = player.querySelector("[data-player-play]");
    var full = player.querySelector(".player__full iframe");
    var bgFrame = player.querySelector("[data-bg-video]");
    if (!play || !full) return;
    play.addEventListener("click", function () {
      var src = full.dataset.src;
      full.src = src + (src.indexOf("?") > -1 ? "&" : "?") + "autoplay=1";
      player.classList.add("is-playing");
      full.focus();
      if (bgFrame) setTimeout(function () { bgFrame.remove(); }, 600);
    });
  });

  // Full reel dialog: loads and autoplays on open, unloads on close so playback stops.
  var dialog = document.querySelector("[data-reel-dialog]");
  var opener = document.querySelector("[data-reel-open]");
  if (dialog && opener && dialog.showModal) {
    var frame = dialog.querySelector("iframe");
    opener.addEventListener("click", function () {
      if (frame) frame.src = frame.dataset.src + (frame.dataset.src.indexOf("?") > -1 ? "&" : "?") + "autoplay=1";
      dialog.showModal();
    });
    dialog.querySelector("[data-reel-close]").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () { if (frame) frame.removeAttribute("src"); });
  }

  // YouTube answers a missing max-res still with a 120px grey placeholder (a 404 or a 200,
  // depending on the video), so check the width, not just the error event. Step down
  // maxres, then 640px, then 480px until a real still loads.
  var YT_STILLS = ["maxresdefault", "sddefault", "hqdefault"];
  document.querySelectorAll("img[data-yt-still]").forEach(function (img) {
    function stepDown() {
      var m = img.src.match(/\/(maxresdefault|sddefault|hqdefault)\.jpg/);
      var i = m ? YT_STILLS.indexOf(m[1]) : -1;
      if (i < 0 || i === YT_STILLS.length - 1) { img.removeAttribute("data-yt-still"); return; }
      img.src = img.src.replace(m[1], YT_STILLS[i + 1]);
    }
    function check() {
      if (!img.naturalWidth || img.naturalWidth < 400) stepDown();
    }
    img.addEventListener("load", check);
    img.addEventListener("error", stepDown);
    if (img.complete) check();
  });

  // Project loops: play only while on screen. Reduced motion shows the poster.
  var loops = document.querySelectorAll("[data-loop]");
  if (loops.length) {
    if (reduceMotion) {
      loops.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { var p = e.target.play(); if (p && p.catch) p.catch(function () {}); }
          else e.target.pause();
        });
      }, { threshold: 0.25 });
      loops.forEach(function (v) { io.observe(v); });
    }
  }

  // Lottie: pages with `lottie: true` in front matter load lottie-web.
  // Mark up an animation with <div data-lottie="{{ '/assets/<slug>/anim.json' | relative_url }}"></div>.
  window.addEventListener("load", function () {
    if (!window.lottie) return;
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
})();
