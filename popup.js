// DOM is built with textContent only: titles and image URLs come from the site.
const $ = (id) => document.getElementById(id);
let tab = "follow";
let unseen = [];
let store = {}; // whole storage, read once per render ("mal:<id>" scores, "bili:<id>" seasons)

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
}

function row({ id, title, ep, img }, origin, followed, follows) {
  const li = el("li", { className: unseen.includes(id) ? "new" : "" });
  if (img && /^https:\/\//.test(img)) li.append(el("img", { src: img, alt: "", loading: "lazy" }));
  const a = el("a", { href: `${origin}/list/${id}/`, target: "_blank", rel: "noopener" },
    el("b", { textContent: title }), el("span", { textContent: "EP " + ep + (store["mal:" + id]?.score ? " • MAL ★ " + store["mal:" + id].score.toFixed(2) : "") + (unseen.includes(id) ? " • ใหม่" : "") }));
  const btn = el("button", { type: "button" });
  const paint = () => {
    const on = !!follows[id];
    btn.textContent = followed ? "✕" : on ? "✓" : "★";
    btn.title = on ? "เลิกติดตาม" : "ติดตาม";
    btn.className = on && !followed ? "on" : "";
  };
  btn.addEventListener("click", async () => {
    follows = (await chrome.storage.local.get("follows")).follows || {}; // a check may have written since render
    if (follows[id]) delete follows[id];
    else follows[id] = { title, img, lastEp: ep, origin };
    await chrome.storage.local.set({ follows });
    followed ? render() : paint();
  });
  paint();
  li.append(a);
  const bili = followed && store["bili:" + id]; // cache only; filled by the series page or the next check
  if (bili) {
    li.append(bili.seasonId
      ? el("a", { className: "bili", href: "https://www.bilibili.tv/th/play/" + encodeURIComponent(bili.seasonId), target: "_blank", rel: "noopener", textContent: bili.sameSeason === false ? "▶ Bilibili (ภาคอื่น)" : "▶ Bilibili", title: bili.title || "" })
      : el("span", { className: "bili none", textContent: "ไม่พบใน Bilibili" }));
  }
  li.append(btn);
  return li;
}

async function render() {
  const { follows = {}, latest = [], origin = BASE, checkedAt } = await chrome.storage.local.get(["follows", "latest", "origin", "checkedAt"]);
  store = await chrome.storage.local.get(null);
  ({ unseen = [] } = store);
  $("t-follow").setAttribute("aria-pressed", tab === "follow");
  $("t-latest").setAttribute("aria-pressed", tab === "latest");
  $("t-days").setAttribute("aria-pressed", tab === "days");
  $("status").textContent = checkedAt ? "เช็กล่าสุด " + new Date(checkedAt).toLocaleString("th-TH") : "ยังไม่ได้เช็ก";
  // new version on GitHub (bg.js checkUpdate): update.bat pulls it, then reload the card
  const up = $("update");
  up.hidden = !store.update;
  if (store.update) up.replaceChildren("มีเวอร์ชันใหม่ v" + store.update.version + " — ดับเบิลคลิก update.bat แล้วกด reload การ์ดใน edge://extensions ",
    el("a", { href: "https://github.com/helloshinee002-cell/my-notify/commits/main", target: "_blank", rel: "noopener", textContent: "(ดูว่ามีอะไรใหม่)" }));
  const followed = Object.entries(follows).map(([id, f]) => ({ id, title: f.title, ep: f.lastEp, img: f.img, dates: f.dates }));
  const list = $("list");
  if (tab === "days") return renderDays(list, followed, origin, follows);
  const items = tab === "follow" ? followed.sort((x, y) => unseen.includes(y.id) - unseen.includes(x.id)) : latest;
  list.replaceChildren(...items.map((it) => row(it, origin, tab === "follow", follows)));
  if (!items.length) {
    list.append(el("li", { className: "empty", textContent: tab === "follow"
      ? "ยังไม่ได้ติดตามเรื่องไหน กด ★ ในแท็บ \"อัปเดตล่าสุด\" หรือปุ่ม \"★ ติดตาม\" ในหน้าเรื่องบนเว็บ"
      : "ยังไม่มีข้อมูล กด \"เช็กตอนนี้\"" }));
  }
}

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

// followed shows grouped by the weekday they usually update on, starting from today
function renderDays(list, followed, origin, follows) {
  const today = new Date().getDay();
  const groups = new Map([...Array(7)].map((_, i) => [(today + i) % 7, []]).concat([[-1, []]]));
  for (const it of followed) groups.get(weekdayOf(it.dates)).push(it);
  const out = [];
  for (const [day, items] of groups) {
    if (!items.length) continue;
    const label = day < 0 ? "ยังไม่รู้วัน (กด \"เช็กตอนนี้\")" : "วัน" + DAYS[day] + (day === today ? " (วันนี้)" : "");
    out.push(el("li", { className: "day" + (day === today ? " today" : ""), textContent: label }));
    out.push(...items.map((it) => row(it, origin, true, follows)));
  }
  list.replaceChildren(...out);
  if (!out.length) list.append(el("li", { className: "empty", textContent: "ยังไม่ได้ติดตามเรื่องไหน" }));
}

$("t-follow").addEventListener("click", () => { tab = "follow"; render(); });
$("t-days").addEventListener("click", () => { tab = "days"; render(); });
$("t-latest").addEventListener("click", () => { tab = "latest"; render(); });
$("refresh").addEventListener("click", async () => {
  $("status").textContent = "กำลังเช็ก…";
  const r = await chrome.runtime.sendMessage("check");
  if (!r.ok) { $("status").textContent = "เช็กไม่สำเร็จ: " + r.err; return; }
  render();
});

render().then(() => chrome.runtime.sendMessage("seen")); // opening the popup clears the badge
