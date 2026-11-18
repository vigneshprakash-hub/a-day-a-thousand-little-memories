/* ============================================================
   CONFIG — automated schedule for Nov 23, 2026
   ============================================================ */
window.STORY_CONFIG = {
  // Schedule specifically for Nov 23, 2026
  TARGET_YEAR: 2026,
  TARGET_MONTH: 10,   // November (0-indexed)
  TARGET_DAY: 23,

  // true  → times are India Standard Time (UTC+5:30) for every visitor
  //         (matches the "· IST" labels on the dashboard)
  // false → times use each visitor's own device timezone
  USE_IST: true,

  chapterSchedule: [
    { id: 'chapter-1',  hour: 2,  minute: 30 },
    { id: 'chapter-2',  hour: 5,  minute: 0  },
    { id: 'chapter-3',  hour: 7,  minute: 30 },
    { id: 'chapter-4',  hour: 9,  minute: 0  },
    { id: 'chapter-5',  hour: 11, minute: 30 },
    { id: 'chapter-6',  hour: 14, minute: 0  },
    { id: 'chapter-7',  hour: 16, minute: 0  },
    { id: 'chapter-8',  hour: 18, minute: 30 },
    { id: 'chapter-9',  hour: 20, minute: 30 },
    { id: 'chapter-10', hour: 21, minute: 0  }
  ],

  // ---- AUDIO (all files live in assets/audio/) ----
  audioBase: "assets/audio/",

  // Curtain music: starts when "Ready!" is pressed, stops when the curtain is fully open
  curtainAudio: "assets/audio/audio05.mp3",
  // Curtain music is tap-to-play: a "Tap anywhere for music" prompt shows, the first tap starts it.

  // Chapter music: starts automatically when the chapter opens (chapter 5 has none)
  chapterAudio: {
    1: "audio01.mp3",
    2: "audio03.mp3",
    3: "audio02.mp3",
    4: "audio03.mp3",
    6: "audio02.mp3",
    7: "audio04.mp3",
    8: "audio04.mp3",
    9: "audio02.mp3",
    10: "audio02.mp3"   // continues from Chapter 9
  },

  // ---- "Special One" (navbar button + video pop-up) ----
  // Put video1.mp4 ... video5.mp4 in assets/video/ (video1.jpg ... are optional posters).
  // The 🎁 Special One button only appears when ALL of the files below exist.
  // Fewer files than `count`  → the button and the pop-up stay hidden.
  surprise: {
    dir: "assets/video/",
    prefix: "video",     // video1.mp4, video2.mp4, ...
    ext: ".mp4",
    posterExt: ".jpg",   // optional poster image per video (video1.jpg, ...)
    count: 5             // how many videos are required before it is shown
  },

  // For YOUR testing only: open  index.html?preview=<key>  to open the curtain
  // and unlock everything in that tab. Change or clear before sharing.
  previewKey: "pri-preview-2311"
};
