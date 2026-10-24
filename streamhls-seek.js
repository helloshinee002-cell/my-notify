// "-5" / "+5" buttons in the streamhls jwplayer control bar (after its "Rewind 10 Seconds"),
// so they also show in fullscreen and theater mode. They seek the <video> directly (hls.js
// plays through it), which needs no access to the page's jwplayer object.
(() => {
  const seek = (d) => {
    const v = document.querySelector("video");
    if (v) v.currentTime = Math.max(0, v.currentTime + d);
  };
  const btn = (label, aria, d) => {
    const b = document.createElement("div");
    b.className = "jw-icon jw-icon-inline jw-button-color jw-reset t037-seek";
    b.setAttribute("role", "button");
    b.setAttribute("aria-label", aria);
    b.tabIndex = 0;
    b.textContent = label;
    b.style.cssText = "font:700 14px/1 system-ui,sans-serif;width:auto;padding:0 6px";
    const go = (e) => { e.stopPropagation(); e.preventDefault(); seek(d); };
    b.addEventListener("click", go);
    b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });
    return b;
  };
  const add = () => {
    const bar = document.querySelector(".jw-controlbar .jw-button-container");
    if (!bar || bar.querySelector(".t037-seek")) return;
    const after = bar.querySelector(".jw-icon-rewind") || bar.querySelector(".jw-icon-playback");
    const pair = [btn("-5", "ย้อน 5 วินาที", -5), btn("+5", "ข้าม 5 วินาที", 5)];
    after ? after.after(...pair) : bar.prepend(...pair);
  };
  // jwplayer builds the bar after load, and may rebuild it
  new MutationObserver(add).observe(document.documentElement, { childList: true, subtree: true });
})();
