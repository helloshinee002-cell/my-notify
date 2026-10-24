// Two buttons under each 037-hdd player (iframe#player):
//   โรงหนัง (T)  theater mode: the player grows to ~95% of the window, page dimmed, not fullscreen.
//   เต็มจอ (F)   real fullscreen of the whole player frame, requested from the top page.
// The second exists because the site's own jwplayer fullscreen button is broken: jwplayer
// flags itself fullscreen (jw-flag-fullscreen) but the browser never goes fullscreen.
// Requesting it on the outer iframe from here doesn't depend on any of the nested frames.
// Keys work while focus is on this page; Esc leaves theater mode.
(() => {
  const ON = "t037-theater";
  // newer posts give the player id="player"; older ones (e.g. 2021) have no id, only the ticket URL
  const PLAYER = "iframe#player, iframe[src*=\"streamhls_ticket\"]";
  let active = null; // the iframe in theater mode

  function setTheater(frame) {
    if (active) active.classList.remove("t037-active");
    document.querySelectorAll(".t037-lift").forEach((e) => e.classList.remove("t037-lift"));
    active = frame;
    document.documentElement.classList.toggle(ON, !!frame);
    if (!frame) return;
    frame.classList.add("t037-active");
    // An ancestor that makes a stacking context (#wrap has z-index:5) caps how high the
    // fixed player can paint; lift every such ancestor while theater mode is on.
    for (let e = frame.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if ((cs.zIndex !== "auto" && cs.position !== "static") || cs.transform !== "none" || cs.filter !== "none") {
        e.classList.add("t037-lift");
      }
    }
  }

  function addBar(frame) {
    if (frame.dataset.t037) return;
    frame.dataset.t037 = "1";
    const bar = document.createElement("div");
    bar.className = "t037-bar";
    const mk = (label, title, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = title;
      b.addEventListener("click", fn);
      bar.append(b);
      return b;
    };
    mk("โรงหนัง (T)", "ขยายตัวเล่นเกือบเต็มหน้าจอ", () => setTheater(active === frame ? null : frame));
    mk("เต็มจอ (F)", "เต็มจอ", () => { setTheater(null); frame.requestFullscreen().catch(() => {}); });
    frame.after(bar);
  }

  const scan = () => document.querySelectorAll(PLAYER).forEach(addBar);
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });

  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
    const first = document.querySelector(PLAYER);
    if (e.key === "Escape" && active) setTheater(null);
    else if ((e.key === "t" || e.key === "T") && first) setTheater(active ? null : first);
    else if ((e.key === "f" || e.key === "F") && first) { setTheater(null); first.requestFullscreen().catch(() => {}); }
  });
})();
