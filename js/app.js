/* ============================================================
   A Day, A Thousand Little Memories — schedule + page logic
   updateStoryState() drives the curtain and every chapter,
   on load and then continuously.
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.STORY_CONFIG;
  var chapterSchedule = CFG.chapterSchedule;
  var TOTAL = chapterSchedule.length;
  var IST_OFFSET_MIN = 330;

  /* ---------- time helpers ---------- */
  // Timestamp (ms) of hour:minute on the target day
  function targetTime(hour, minute) {
    if (CFG.USE_IST) {
      return Date.UTC(CFG.TARGET_YEAR, CFG.TARGET_MONTH, CFG.TARGET_DAY, hour, minute) - IST_OFFSET_MIN * 60000;
    }
    return new Date(CFG.TARGET_YEAR, CFG.TARGET_MONTH, CFG.TARGET_DAY, hour, minute).getTime();
  }
  function unlockTimestamp(i) { var c = chapterSchedule[i]; return targetTime(c.hour, c.minute); }
  function curtainTimestamp() { return targetTime(0, 0); }   // opens: 12:00 AM on the target date
  function closingTimestamp() { return targetTime(23, 59); } // closes: 11:59 PM on the target date

  var PREVIEW = false;
  try {
    var q = new URLSearchParams(location.search).get("preview");
    if (CFG.previewKey && q === CFG.previewKey) {
      sessionStorage.setItem("story-preview", "1");
      localStorage.removeItem("story-curtain-opened");
    }
    if (q === "off") sessionStorage.removeItem("story-preview");
    PREVIEW = sessionStorage.getItem("story-preview") === "1";
  } catch (e) {}

  function isUnlocked(i) { return PREVIEW || Date.now() >= unlockTimestamp(i); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function label12(i) {
    var c = chapterSchedule[i], h = c.hour, ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return pad(h) + ":" + pad(c.minute) + " " + ap + (CFG.USE_IST ? " · IST" : "");
  }
  function countdown(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return (d ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
  }
  function chapterUrl(n) { return "chapter-" + pad(n) + ".html"; }

  window.Story = { isUnlocked: isUnlocked, label12: label12, countdown: countdown,
                   unlockTimestamp: unlockTimestamp, chapterUrl: chapterUrl };

  /* ---------- page hooks (filled in by initDashboard / initChapter) ---------- */
  var pageRefresh = function () {};

  /* ============================================================
     CORE: runs on load, then continuously
     ============================================================ */
  function updateStoryState() {
    var now = Date.now();

    // 1. Curtain: closed until 12:00 AM on the target date, then "Ready!" is enabled;
    //    the visitor opens it. After 11:59 PM it closes again.
    updateCurtain(now);

    // 2. Chapters: each #chapter-N unhides strictly at its scheduled time
    chapterSchedule.forEach(function (chapter, i) {
      var el = document.getElementById(chapter.id);
      if (!el) return;
      el.style.display = isUnlocked(i) ? "block" : "none";
    });

    // 3. Page-specific UI (dashboard cards, next-chapter button)
    pageRefresh();
  }

  /* ============================================================
     STARRY MIDNIGHT SPLIT CURTAIN
     ============================================================ */
  var OPENED_KEY = "story-curtain-opened";
  var curtainEl = null, readyBtn = null, curtainAudio = null, curtainState = "closed"; // closed | opening | open

  function curtainActive(now) { return PREVIEW || (now >= curtainTimestamp() && now < closingTimestamp()); }

  function initCurtain() {
    curtainEl = document.getElementById("curtain");
    if (!curtainEl) return;
    readyBtn = document.getElementById("ready-btn");
    curtainAudio = document.getElementById("curtain-audio");
    if (curtainAudio && CFG.curtainAudio) {
      curtainAudio.src = CFG.curtainAudio; curtainAudio.preload = "auto";
      curtainAudio.setAttribute("playsinline", "");
      curtainAudio.addEventListener("error", function () { if (window.console) console.warn("Curtain music could not be loaded:", CFG.curtainAudio); });
      curtainAudio.load();   // buffer now so it starts instantly when "Ready!" is tapped
    }

    var stored = false;
    try { stored = localStorage.getItem(OPENED_KEY) === "1"; } catch (e) {}
    if (stored && curtainActive(Date.now())) {          // already opened earlier: stay open, no replay
      curtainEl.classList.add("instant", "open", "gone");
      curtainState = "open";
      setTimeout(function () { curtainEl.classList.remove("instant"); }, 60);
    } else {
      document.body.classList.add("curtain-closed");    // remains closed initially
    }
    if (readyBtn) readyBtn.addEventListener("click", startOpening);

    // Curtain music: tap anywhere to start; loops until the curtain has fully opened
    if (curtainState === "closed" && !(!PREVIEW && Date.now() >= closingTimestamp())) startCurtainMusic();
  }

  var cmGestureEvents = ["touchend", "pointerup", "click", "keydown"], cmArmed = false, cmHint = null, cmWasPlaying = false, cmDone = false;
  function cmOnGesture() { curtainTryPlay(); }
  function curtainTryPlay() {
    if (!curtainAudio || cmDone) return;
    var p; try { p = curtainAudio.play(); } catch (e) { return; }
    if (p && p.catch) p.catch(function (err) { if (err && err.name === "NotAllowedError") cmArm(); });
  }
  function cmArm() {                                     // tap-to-play: first tap anywhere starts the music
    if (cmArmed || cmDone) return;
    cmArmed = true;
    cmHint = document.createElement("div");
    cmHint.className = "curtain-hint"; cmHint.textContent = "♫  Tap anywhere for music";
    curtainEl.appendChild(cmHint);
    cmGestureEvents.forEach(function (ev) { document.addEventListener(ev, cmOnGesture, true); });
  }
  function cmDisarm() {
    cmArmed = false;
    if (cmHint) { cmHint.remove(); cmHint = null; }
    cmGestureEvents.forEach(function (ev) { document.removeEventListener(ev, cmOnGesture, true); });
  }
  function startCurtainMusic() {
    if (!curtainAudio) return;
    curtainAudio.loop = true;                            // keeps going however long the visitor waits
    curtainAudio.volume = 0.85;
    curtainAudio.addEventListener("play", cmDisarm);
    document.addEventListener("visibilitychange", function () {   // phones pause audio in the background
      if (cmDone) return;
      if (document.hidden) { cmWasPlaying = !curtainAudio.paused; if (cmWasPlaying) curtainAudio.pause(); }
      else if (cmWasPlaying) { cmWasPlaying = false; curtainTryPlay(); }
    });
    cmArm();                                             // no autoplay: show the prompt, first tap anywhere starts the music
  }
  function stopCurtainMusic() {                          // completely stopped once the curtain has opened
    cmDone = true; cmDisarm();
    if (curtainAudio) { curtainAudio.pause(); curtainAudio.currentTime = 0; }
  }

  function startOpening() {
    if (curtainState !== "closed" || !curtainActive(Date.now())) return;
    curtainState = "opening";
    readyBtn.disabled = true;
    curtainEl.classList.add("opening");                 // text fades away

    // Pressing Ready! counts as a tap: start the music if it isn't already playing
    curtainTryPlay();

    var finished = false;
    function finish() {                                  // curtain fully parted → stop music immediately
      if (finished) return; finished = true;
      stopCurtainMusic();
      curtainEl.classList.add("gone");
      curtainState = "open";
      document.body.classList.remove("curtain-closed");
      try { localStorage.setItem(OPENED_KEY, "1"); } catch (e) {}
    }
    var left = curtainEl.querySelector(".curtain-panel.left");
    left.addEventListener("transitionend", function h(e) {
      if (e.propertyName === "transform") { left.removeEventListener("transitionend", h); finish(); }
    });
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(finish, reduced ? 300 : 6600);            // safety net (animation = 0.6s delay + 5s)

    void curtainEl.offsetWidth;
    curtainEl.classList.add("open");                     // panels slide left / right, hearts halves with them
  }

  function updateCurtain(now) {
    if (!curtainEl || curtainState === "opening") return;
    var active = curtainActive(now);
    var ended = !PREVIEW && now >= closingTimestamp();

    if (!active && curtainState === "open") {            // day is over → close the curtain again
      curtainEl.classList.remove("gone", "open", "opening");
      curtainState = "closed";
      document.body.classList.add("curtain-closed");
    }
    if (curtainState !== "closed") return;

    var msg = document.getElementById("curtain-msg"), tm = document.getElementById("curtain-timer");
    if (active) {
      if (msg) msg.textContent = "Your story is ready for you.";
      if (tm) tm.textContent = "";
      if (readyBtn) { readyBtn.hidden = false; readyBtn.disabled = false; }
    } else if (ended) {
      if (msg) msg.textContent = "The curtain has closed for this day.";
      if (tm) tm.textContent = "";
      if (readyBtn) readyBtn.hidden = true;
    } else {
      if (msg) msg.textContent = "Waiting for the right moment...";
      if (tm) tm.textContent = "Opens in " + countdown(curtainTimestamp() - now);
      if (readyBtn) { readyBtn.hidden = false; readyBtn.disabled = true; }
    }
  }

  /* ---------- boot ---------- */
  var chapter = parseInt(document.body.getAttribute("data-chapter") || "0", 10);

  function boot() {
    if (chapter && !isUnlocked(chapter - 1)) {           // locked chapter opened directly
      location.replace("index.html?locked=" + chapter);
      return;
    }
    document.documentElement.classList.remove("gate");
    if (chapter) initChapter(chapter); else { initCurtain(); initDashboard(); }
    updateStoryState();
    setInterval(updateStoryState, 1000);                 // continuous (1s keeps countdowns live)
  }
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function initDashboard() {
    var cards = [].slice.call(document.querySelectorAll(".chap-card"));
    var nextBox = document.getElementById("next-up");
    var progress = document.getElementById("progress-fill");
    var progressTxt = document.getElementById("progress-text");
    var toast = document.getElementById("toast");

    function showToast(msg) {
      toast.textContent = msg; toast.classList.add("show");
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 3600);
    }
    var lockedParam = parseInt(new URLSearchParams(location.search).get("locked") || "0", 10);
    if (lockedParam && toast) showToast("Chapter " + pad(lockedParam) + " opens at " + label12(lockedParam - 1) + " ✨");
    if (PREVIEW && nextBox) nextBox.setAttribute("data-preview", "Preview mode — all chapters unlocked");

    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        var i = parseInt(card.getAttribute("data-index"), 10);
        if (!isUnlocked(i)) {
          e.preventDefault();
          showToast("Not yet 🤍  Opens at " + label12(i) + " — in " + countdown(unlockTimestamp(i) - Date.now()));
          card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
        }
      });
    });

    pageRefresh = function () {
      var openCount = 0, firstLocked = -1;
      cards.forEach(function (card) {
        var i = parseInt(card.getAttribute("data-index"), 10);
        var open = isUnlocked(i), was = card.classList.contains("open");
        var badge = card.querySelector(".badge"), cd = card.querySelector(".cd");
        card.classList.toggle("open", open);
        card.classList.toggle("locked", !open);
        card.setAttribute("aria-disabled", open ? "false" : "true");
        badge.textContent = open ? "OPEN" : "LOCKED";
        if (open) {
          openCount++;
          card.setAttribute("href", chapterUrl(i + 1));
          cd.textContent = label12(i);
          if (!was && card.getAttribute("data-seen")) card.classList.add("just-opened");
        } else {
          card.removeAttribute("href");
          if (firstLocked < 0) firstLocked = i;
          var left = unlockTimestamp(i) - Date.now();
          cd.textContent = (i === firstLocked && left < 86400000 * 2) ? label12(i) + "  ·  in " + countdown(left) : label12(i);
        }
        card.setAttribute("data-seen", "1");
      });
      if (progress) progress.style.width = (openCount / TOTAL * 100) + "%";
      if (progressTxt) progressTxt.textContent = openCount + " of " + TOTAL + " chapters open";
      if (nextBox) {
        nextBox.textContent = openCount === TOTAL
          ? "Every chapter is open now. Take your time 🤍"
          : "Next chapter in " + countdown(unlockTimestamp(firstLocked) - Date.now());
      }
    };
  }

  /* ============================================================
     CHAPTER MUSIC (mobile-safe autoplay)
     - tries to play as soon as the chapter opens
     - if the browser blocks it (iOS Safari / Android Chrome need a tap),
       shows a hint and starts on the first tap anywhere
     - remembers "music off" and the playback position between chapters
     - a missing/unplayable file just hides the music button
     ============================================================ */
  function initChapterAudio(n) {
    var file = CFG.chapterAudio && CFG.chapterAudio[n];
    if (!file) return null;
    var src = (CFG.audioBase || "assets/audio/") + file;
    var OFF_KEY = "story-music-off", POS_KEY = "story-music-pos";

    var audio = document.createElement("audio");
    audio.id = "bgm"; audio.loop = true; audio.preload = "auto"; audio.volume = 0.6;
    audio.setAttribute("playsinline", ""); audio.setAttribute("webkit-playsinline", "");
    audio.src = src;
    document.body.appendChild(audio);

    var btn = document.createElement("button");
    btn.id = "music-btn"; btn.type = "button";
    btn.setAttribute("aria-label", "Play or pause music"); btn.setAttribute("aria-pressed", "false");
    document.body.appendChild(btn);

    var hint = null, armed = false, failed = false, resumeAfter = false, wasPlayingHidden = false;
    var userOff = false;
    try { userOff = sessionStorage.getItem(OFF_KEY) === "1"; } catch (e) {}

    // continue where the same track left off in the previous chapter
    try {
      var saved = JSON.parse(sessionStorage.getItem(POS_KEY) || "null");
      if (saved && saved.src === src && saved.t > 0) {
        audio.addEventListener("loadedmetadata", function seek() {
          audio.removeEventListener("loadedmetadata", seek);
          try { if (!audio.duration || saved.t < audio.duration) audio.currentTime = saved.t; } catch (e) {}
        });
      }
    } catch (e) {}
    function savePos() { try { sessionStorage.setItem(POS_KEY, JSON.stringify({ src: src, t: audio.currentTime || 0 })); } catch (e) {} }

    function showHint() {
      if (hint) return;
      hint = document.createElement("div");
      hint.id = "music-hint"; hint.textContent = "♫  Tap anywhere to start the music";
      document.body.appendChild(hint);
    }
    function hideHint() { if (hint) { hint.remove(); hint = null; } }

    var gestureEvents = ["touchend", "pointerup", "click", "keydown"];
    function onGesture(e) {
      if (e.target && e.target.closest && e.target.closest("#music-btn")) return; // the button has its own handler
      tryPlay();
    }
    function armGesture() {
      if (armed || userOff || failed) return;
      armed = true; showHint();
      gestureEvents.forEach(function (ev) { document.addEventListener(ev, onGesture, true); });
    }
    function disarm() {
      armed = false; hideHint();
      gestureEvents.forEach(function (ev) { document.removeEventListener(ev, onGesture, true); });
    }
    function tryPlay() {
      if (failed || userOff) return;
      var p;
      try { p = audio.play(); } catch (e) { return; }
      if (p && p.catch) p.catch(function (err) {
        if (err && err.name === "NotAllowedError") armGesture();   // autoplay blocked → wait for a tap
      });
    }

    audio.addEventListener("play", function () { btn.classList.add("playing"); btn.setAttribute("aria-pressed", "true"); disarm(); });
    audio.addEventListener("pause", function () { btn.classList.remove("playing"); btn.setAttribute("aria-pressed", "false"); });
    audio.addEventListener("canplay", function () { if (audio.paused) tryPlay(); }, { once: true });
    audio.addEventListener("error", function () {                  // file missing or unsupported
      failed = true; disarm(); btn.remove();
      if (window.console) console.warn("Music file could not be loaded:", src);
    });

    btn.addEventListener("click", function () {
      if (audio.paused) {
        userOff = false; try { sessionStorage.setItem(OFF_KEY, "0"); } catch (e) {}
        var p = audio.play(); if (p && p.catch) p.catch(function () {});
      } else {
        userOff = true; try { sessionStorage.setItem(OFF_KEY, "1"); } catch (e) {}
        audio.pause();
      }
    });

    // phones pause audio in the background; pick up again when the tab returns
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { savePos(); wasPlayingHidden = !audio.paused; if (wasPlayingHidden) audio.pause(); }
      else if (wasPlayingHidden) { wasPlayingHidden = false; tryPlay(); }
    });
    window.addEventListener("pagehide", savePos);
    window.addEventListener("pageshow", function (e) { if (e.persisted) tryPlay(); }); // back/forward cache

    audio.load();
    tryPlay();

    return {
      suspend: function () { resumeAfter = !audio.paused; if (resumeAfter) audio.pause(); },   // while a video plays
      resume: function () { if (resumeAfter) { resumeAfter = false; tryPlay(); } }
    };
  }

  /* ============================================================
     CHAPTER PAGES
     ============================================================ */
  function initChapter(n) {
    var items = [].slice.call(document.querySelectorAll(".reveal"));
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      items.forEach(function (el) { io.observe(el); });
    } else { items.forEach(function (el) { el.classList.add("in"); }); }

    var bar = document.getElementById("read-bar");
    function onScroll() {
      var h = document.documentElement;
      if (bar) bar.style.width = Math.min(100, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + "%";
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    var nextBtn = document.getElementById("next-btn");
    if (nextBtn && n < TOTAL) {
      var lab = nextBtn.querySelector(".lab"), base = nextBtn.getAttribute("data-label");
      pageRefresh = function () {
        if (isUnlocked(n)) {
          nextBtn.setAttribute("href", chapterUrl(n + 1)); nextBtn.classList.remove("is-locked"); lab.textContent = base;
        } else {
          nextBtn.removeAttribute("href"); nextBtn.classList.add("is-locked");
          lab.textContent = "Chapter " + pad(n + 1) + " opens at " + label12(n) + " · in " + countdown(unlockTimestamp(n) - Date.now());
        }
      };
    }

    var bgm = initChapterAudio(n);

    var modal = document.getElementById("vmodal");
    if (modal) {
      var vid = modal.querySelector("video"), cap = modal.querySelector(".vcap");
      var openV = function (src, poster, text) {
        if (bgm) bgm.suspend();
        vid.src = src; vid.poster = poster || ""; cap.textContent = text || "";
        modal.classList.add("show"); document.body.classList.add("noscroll"); vid.play().catch(function () {});
      };
      var closeV = function () {
        vid.pause(); vid.removeAttribute("src"); vid.load();
        modal.classList.remove("show"); document.body.classList.remove("noscroll");
        if (bgm) bgm.resume();
      };
      [].forEach.call(document.querySelectorAll("[data-video]"), function (el) {
        el.addEventListener("click", function () { openV(el.getAttribute("data-video"), el.getAttribute("data-poster"), el.getAttribute("data-caption")); });
      });
      modal.addEventListener("click", function (e) { if (e.target === modal || e.target.classList.contains("vclose")) closeV(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeV(); });
    }

    [].forEach.call(document.querySelectorAll(".heart-burst"), function (el) {
      el.addEventListener("click", function (e) {
        for (var k = 0; k < 6; k++) {
          var h = document.createElement("span");
          h.className = "fly-heart"; h.textContent = ["🤍", "💌", "✨", "🫶"][k % 4];
          h.style.left = (e.clientX + (Math.random() * 60 - 30)) + "px"; h.style.top = e.clientY + "px";
          h.style.animationDelay = (k * 70) + "ms";
          document.body.appendChild(h);
          setTimeout((function (x) { return function () { x.remove(); }; })(h), 1800);
        }
      });
    });
  }
})();
