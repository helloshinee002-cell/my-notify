// Two buttons under the player on 037-hdd and 24-hdc:
//   โรงหนัง (T)  theater mode: the player grows to ~95% of the window, page dimmed, not fullscreen.
//   เต็มจอ (F)   real fullscreen of the whole player frame, requested from the top page.
// The second exists because 037-hdd's own jwplayer fullscreen button is broken: jwplayer
// flags itself fullscreen (jw-flag-fullscreen) but the browser never goes fullscreen.
// Requesting it on the outer iframe from here doesn't depend on any of the nested frames.
// Keys work while focus is on this page; Esc leaves theater mode.
(() => {
  const ON = "t037-theater";
  // 037-hdd: newer posts give the player id="player"; older ones (e.g. 2021) only have the ticket URL.
  // 24-hdc: the server buttons replace the iframe inside #ajax-player by AJAX.
  const PLAYER = "iframe#player, iframe[src*=\"streamhls_ticket\"], #ajax-player iframe";
  let active = null; // the iframe in theater mode
  let activeBar = null;

  function setTheater(frame, bar) {
    if (active) active.classList.remove("t037-active");
    if (activeBar) activeBar.classList.remove("t037-on");
    document.querySelectorAll(".t037-lift").forEach((e) => e.classList.remove("t037-lift"));
    active = frame;
    activeBar = frame ? bar : null;
    document.documentElement.classList.toggle(ON, !!frame);
    if (!frame) return;
    frame.classList.add("t037-active");
    if (bar) bar.classList.add("t037-on");
    // An ancestor that makes a stacking context (#wrap has z-index:5) caps how high the
    // fixed player can paint; lift every such ancestor while theater mode is on.
    for (let e = frame.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if ((cs.zIndex !== "auto" && cs.position !== "static") || cs.transform !== "none" || cs.filter !== "none") {
        e.classList.add("t037-lift");
      }
    }
  }

  // The bar hangs off something that survives a server switch, so the iframe is looked up at
  // click time. It goes after #halim-player-wrapper, not inside: that box has a fixed height, so
  // a bar inside overflows under the language/part selects below it.
  const anchorOf = (frame) => frame.closest("#halim-player-wrapper") || frame;
  const frameOf = (anchor) => (anchor.tagName === "IFRAME" ? anchor : anchor.querySelector("iframe"));
  const fullscreen = (frame) => { setTheater(null); frame.requestFullscreen().catch(() => {}); };

  function addBar(frame) {
    const anchor = anchorOf(frame);
    if (anchor.dataset.t037) return;
    anchor.dataset.t037 = "1";
    const bar = document.createElement("div");
    bar.className = "t037-bar";
    const mk = (label, title, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = title;
      b.addEventListener("click", () => { const f = frameOf(anchor); if (f) fn(f); });
      bar.append(b);
    };
    mk("โรงหนัง (T)", "ขยายตัวเล่นเกือบเต็มหน้าจอ", (f) => setTheater(active === f ? null : f, bar));
    mk("เต็มจอ (F)", "เต็มจอ", fullscreen);
    anchor.after(bar);
    anchor.t037Bar = bar;
  }

  const scan = () => {
    if (active && !active.isConnected) setTheater(null); // the server buttons replaced the iframe
    document.querySelectorAll(PLAYER).forEach(addBar);
  };
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });

  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
    const first = document.querySelector(PLAYER);
    if (e.key === "Escape" && active) setTheater(null);
    else if ((e.key === "t" || e.key === "T") && first) setTheater(active ? null : first, anchorOf(first).t037Bar);
    else if ((e.key === "f" || e.key === "F") && first) fullscreen(first);
  });
})();
