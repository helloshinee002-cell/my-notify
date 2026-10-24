// MyAnimeList score badge on every gojo cover (bottom-left of .card-thumb) and next to the
// series title. Lookups go through bg.js (rate limit + cache). Click a badge to open the MAL page.
(() => {
  const done = new WeakSet(); // per element: the same show can appear in two carousels

  function badge(c) {
    const b = document.createElement("span");
    b.className = "mal-score " + (c.score >= 8 ? "hi" : c.score >= 7 ? "mid" : "lo");
    b.textContent = "★ " + c.score.toFixed(2);
    b.title = "คะแนน MyAnimeList (กดเพื่อเปิดหน้า MAL)";
    b.setAttribute("role", "link");
    b.tabIndex = 0;
    const open = (e) => {
      e.preventDefault(); // the badge sits inside the card's own link
      e.stopPropagation();
      window.open("https://myanimelist.net/anime/" + c.malId, "_blank", "noopener");
    };
    b.addEventListener("click", open);
    b.addEventListener("keydown", (e) => { if (e.key === "Enter") open(e); });
    return b;
  }

  async function show(id, q, place) {
    if (!q || done.has(place)) return;
    done.add(place);
    let c;
    try {
      c = await chrome.runtime.sendMessage({ mal: { id, q } });
    } catch {
      // the extension was reloaded/updated under an open tab: this old copy can't reach it any more
      if (!chrome.runtime?.id) observer.disconnect();
      return;
    }
    if (c && c.malId && typeof c.score === "number") place.append(badge(c));
  }

  function scan() {
    for (const a of document.querySelectorAll("article.anime-card a[href^='/list/']")) {
      const id = (a.getAttribute("href").match(/^\/list\/(\d+)\//) || [])[1];
      const thumb = a.querySelector(".card-thumb");
      if (id && thumb) show(id, malQuery(a.querySelector("h3")?.textContent || ""), thumb);
    }
    const page = (location.pathname.match(/^\/list\/(\d+)\//) || [])[1];
    const h1 = document.querySelector("h1.page-title");
    if (page && h1) {
      let slot = document.querySelector(".mal-slot");
      if (!slot) {
        slot = document.createElement("span");
        slot.className = "mal-slot";
        (document.querySelector(".gojo-follow") || h1).after(slot);
      }
      show(page, malQuery(document.querySelector(".crumb .cur")?.textContent || h1.textContent), slot);
      if (!document.querySelector(".bili-slot")) {
        const name = (document.querySelector(".crumb .cur")?.textContent || h1.textContent).trim()
          + (/\(พากย์ไทย\)/.test(h1.textContent) ? " (พากย์ไทย)" : "");
        const bili = document.createElement("span");
        bili.className = "bili-slot";
        slot.after(bili);
        showBili(page, name, bili);
      }
    }
  }

  // Licensed season on bilibili.tv: a link, or "ไม่พบใน Bilibili" linking to bilibili's own search
  // (its search is fussy, so "not found" means not found by name, not proof it isn't there)
  async function showBili(id, name, place) {
    let c;
    try {
      c = await chrome.runtime.sendMessage({ bili: { id, name } });
    } catch {
      return; // extension reloaded under this tab
    }
    if (!c) return; // lookup failed (network): show nothing rather than a wrong "not found"
    const a = document.createElement("a");
    a.target = "_blank";
    a.rel = "noopener";
    if (c.seasonId) {
      a.className = "bili-link";
      a.href = "https://www.bilibili.tv/th/play/" + encodeURIComponent(c.seasonId);
      a.textContent = "▶ ดูลิขสิทธิ์ที่ Bilibili" + (c.sameSeason === false ? " (ภาคอื่น)" : ""); // e.g. only season 1 is licensed
      a.title = c.title;
    } else {
      a.className = "bili-link none";
      a.href = "https://www.bilibili.tv/th/search-result?q=" + encodeURIComponent(c.q || name);
      a.textContent = "ไม่พบใน Bilibili";
      a.title = "ค้นหาชื่อนี้ไม่เจอในหมวดอนิเมะของ Bilibili (กดเพื่อค้นเอง)";
    }
    place.append(a);
  }

  const observer = new MutationObserver(scan);
  scan();
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
