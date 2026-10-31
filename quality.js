// Resolution label + quality menu in the jwplayer control bar on streamhls (037-hdd) and
// 24playerhd (24-hdc). MAIN world: the quality API lives on the page's jwplayer object.
// The menu offers only what the source has (getQualityLevels); a movie with one level gets just
// the label. The label is the real decoded height of the video, not the level's name.
(() => {
  let btn = null;
  let menu = null;
  let bound = false;
  // A switch only shows once the video already buffered at the old quality has played out (a minute
  // or two), and until then getCurrentQuality() still reports the old level. So remember the choice.
  let chosen = null;

  const player = () => {
    const p = typeof window.jwplayer === "function" ? window.jwplayer() : null;
    return p && typeof p.getQualityLevels === "function" ? p : null;
  };
  const levels = () => player()?.getQualityLevels() || [];
  const isAuto = (l) => /auto/i.test(l?.label || "");

  function closeMenu() {
    menu?.remove();
    menu = null;
  }

  function refresh() {
    if (!btn) return;
    const list = levels();
    const cur = list[chosen ?? player()?.getCurrentQuality()];
    const h = document.querySelector("video")?.videoHeight;
    const text = h ? h + "p" : isAuto(cur) ? "" : cur?.label || "";
    const pending = chosen !== null && cur?.height && h && h !== cur.height;
    if (chosen !== null && !pending && h) chosen = null; // the switch has landed (or was to Auto)
    btn.textContent = pending ? text + " → " + cur.height + "p" : isAuto(cur) ? (text ? "Auto · " + text : "Auto") : text || "–";
    const choices = list.length > 1;
    btn.style.cursor = choices ? "pointer" : "default";
    btn.title = pending ? "จะเปลี่ยนเมื่อวิดีโอที่โหลดไว้ล่วงหน้าเล่นหมด" : choices ? "เลือกความละเอียด" : "ความละเอียดของวิดีโอ (เรื่องนี้มีแบบเดียว)";
  }

  function openMenu() {
    const p = player();
    const list = levels();
    if (!p || list.length < 2) return;
    // Inside the player, not <body>: jwplayer's own fullscreen shows only its container.
    const box = btn.closest(".jwplayer") || document.body;
    const b = btn.getBoundingClientRect();
    const r = box.getBoundingClientRect();
    menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    menu.style.cssText = "position:absolute;z-index:2147483000;display:flex;flex-direction:column;min-width:96px;padding:4px;" +
      "background:rgba(20,20,20,.95);border:1px solid #444;border-radius:6px;" +
      `right:${Math.max(4, r.right - b.right)}px;bottom:${r.bottom - b.top + 6}px`;
    const current = chosen ?? p.getCurrentQuality();
    list.forEach((l, i) => {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.textContent = (i === current ? "✓ " : "") + (l.label || (l.height ? l.height + "p" : "ระดับ " + i));
      item.style.cssText = "font:600 13px/1 system-ui,sans-serif;text-align:left;padding:8px 10px;border:0;border-radius:4px;" +
        "cursor:pointer;color:#fff;background:" + (i === current ? "#2e7d32" : "transparent");
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        chosen = i;
        p.setCurrentQuality(i);
        closeMenu();
        refresh();
      });
      menu.append(item);
    });
    menu.addEventListener("click", (e) => e.stopPropagation());
    box.append(menu);
    menu.querySelector("button").focus();
  }

  function add() {
    const bar = document.querySelector(".jw-controlbar .jw-button-container");
    if (!bar || !player() || bar.querySelector(".t037-quality")) return;
    btn = document.createElement("div");
    btn.className = "jw-icon jw-icon-inline jw-button-color jw-reset t037-quality";
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", "ความละเอียดของวิดีโอ");
    btn.tabIndex = 0;
    btn.style.cssText = "font:700 13px/1 system-ui,sans-serif;width:auto;padding:0 8px;white-space:nowrap";
    const toggle = (e) => {
      e.stopPropagation(); // the bar would otherwise toggle play/pause
      e.preventDefault();
      if (menu) closeMenu();
      else openMenu();
    };
    btn.addEventListener("click", toggle);
    btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") toggle(e); });
    const anchor = bar.querySelector(".jw-icon-settings") || bar.querySelector(".jw-icon-fullscreen");
    anchor ? anchor.before(btn) : bar.append(btn);
    refresh();
    if (!bound) {
      bound = true;
      for (const ev of ["levels", "levelsChanged", "visualQuality", "firstFrame"]) player().on(ev, refresh);
      document.addEventListener("resize", refresh, true); // <video> resize doesn't bubble
      document.addEventListener("click", closeMenu);
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    }
  }

  // jwplayer builds the bar after load, and may rebuild it
  new MutationObserver(add).observe(document.documentElement, { childList: true, subtree: true });
  add();
})();
