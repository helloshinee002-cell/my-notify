// "★ ติดตาม" button next to the series title on /list/<id>/.
// Following stores the episode shown right now, so only episodes after it trigger an alert.
(async () => {
  const id = (location.pathname.match(/^\/list\/(\d+)\//) || [])[1];
  const h1 = document.querySelector("h1.page-title");
  if (!id || !h1) return;
  const name = (document.querySelector(".crumb .cur") || h1).textContent.trim();
  const dub = /\(พากย์ไทย\)/.test(h1.textContent) ? " (พากย์ไทย)" : "";
  const ep = (h1.textContent.match(/ตอนที่\s*([\d\s-]+)/) || [])[1]?.replace(/\s/g, "") || "0";
  const img = document.querySelector('meta[property="og:image"]')?.content || "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "gojo-follow";
  const paint = (on) => {
    btn.textContent = on ? "✓ ติดตามแล้ว" : "★ ติดตาม";
    btn.classList.toggle("on", on);
    btn.title = on ? "กดเพื่อเลิกติดตาม" : "แจ้งเตือนเมื่อมีตอนใหม่";
  };
  let { follows = {} } = await chrome.storage.local.get("follows");
  paint(!!follows[id]);
  btn.addEventListener("click", async () => {
    try {
      ({ follows = {} } = await chrome.storage.local.get("follows"));
      if (follows[id]) delete follows[id];
      else {
        const d = parseUpdated(document.querySelector(".wbar-status")?.textContent || "");
        follows[id] = { title: name + dub, img, lastEp: ep, origin: location.origin, dates: d ? [d] : [] };
      }
      await chrome.storage.local.set({ follows });
      paint(!!follows[id]);
    } catch (e) {
      // the extension was reloaded/updated under an open tab: this old copy can't reach storage any more
      if (chrome.runtime?.id) throw e;
      btn.textContent = "รีเฟรชหน้า";
      btn.title = "ส่วนขยายเพิ่งอัปเดต รีเฟรชหน้านี้ก่อน";
    }
  });
  h1.after(btn);
})();
