importScripts("parse.js");

const ICON = "icon.png";
const get = (k) => chrome.storage.local.get(k);

async function check() {
  const res = await fetch(BASE + "/", { credentials: "omit" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const origin = new URL(res.url).origin; // follows a domain hop (301) if the site moves again
  const cards = parseCards(await res.text(), origin);
  const { follows = {} } = await get("follows");
  const fresh = new Set(), changed = new Set();
  for (const c of cards) {
    const f = follows[c.id];
    if (!f || epNum(c.ep) <= epNum(f.lastEp)) continue;
    Object.assign(f, { lastEp: c.ep, img: c.img || f.img, origin });
    fresh.add(c.id);
    changed.add(c.id);
    notify(c);
  }
  // Release-day history for the "ตารางวัน" tab: the series page shows the latest update date.
  // Fetched only for a new episode, or for a follow with no date yet (e.g. followed from the popup).
  // A page with no parseable date is retried once a day, not every 30 min.
  for (const [id, f] of Object.entries(follows)) {
    if (!fresh.has(id) && (f.dates?.length || Date.now() - (f.datesTriedAt || 0) < 864e5)) continue;
    const d = await updatedDate(origin, id).catch(() => null);
    addDate(f, d || (fresh.has(id) ? new Date().toLocaleDateString("sv-SE") : null)); // sv-SE = YYYY-MM-DD
    f.datesTriedAt = Date.now();
    changed.add(id);
  }
  // The fetches above take a while: merge only our fields into a fresh read, so a follow or
  // unfollow made meanwhile in the page or popup isn't overwritten.
  const now = await get(["follows", "unseen"]);
  const live = now.follows || {}, unseen = now.unseen || [];
  for (const id of changed) {
    if (!live[id]) continue; // unfollowed meanwhile
    const { lastEp, img, origin: o, dates, datesTriedAt } = follows[id];
    Object.assign(live[id], { lastEp, img, origin: o, dates, datesTriedAt });
    if (fresh.has(id) && !unseen.includes(id)) unseen.push(id);
  }
  await chrome.storage.local.set({ follows: live, unseen, latest: cards, checkedAt: Date.now(), origin });
  badge(unseen.length);
  backfillBili(live).catch(() => {}); // not awaited: "เช็กตอนนี้" shouldn't wait on bilibili
  return cards.length;
}

async function updatedDate(origin, id) {
  const r = await fetch(`${origin}/list/${id}/`, { credentials: "omit" });
  if (!r.ok) return null;
  return parseUpdated((await r.text()).match(/class="wbar-status">([^<]*)/)?.[1] || "");
}

// keep the last 8 distinct update dates
const addDate = (f, d) => { if (d && !(f.dates ||= []).includes(d)) f.dates = [...f.dates, d].slice(-8); };

function notify(c) {
  const opts = (iconUrl) => ({ type: "basic", iconUrl, title: c.title, message: "ตอนใหม่มาแล้ว: EP " + c.ep, priority: 2 });
  // the cover is a remote .webp; fall back to our own icon if it can't be used
  chrome.notifications.create("gojo:" + c.id, opts(c.img || ICON)).catch(() =>
    chrome.notifications.create("gojo:" + c.id, opts(ICON)));
}

const badge = (n) => {
  chrome.action.setBadgeText({ text: n ? String(n) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#e53935" });
};

chrome.notifications.onClicked.addListener(async (nid) => {
  const id = nid.replace("gojo:", "");
  const { origin = BASE, unseen = [] } = await get(["origin", "unseen"]);
  chrome.tabs.create({ url: `${origin}/list/${id}/` });
  chrome.notifications.clear(nid);
  const rest = unseen.filter((x) => x !== id);
  await chrome.storage.local.set({ unseen: rest });
  badge(rest.length);
});

// MAL score lookups. One key per show ("mal:<id>") so parallel lookups can't overwrite each other.
// Tenrai allows 4 req/s and 120/min per IP: requests start at most every 520 ms (~115/min).
// no score yet (not on MAL, or a brand-new show MAL hasn't scored) is retried after 2 days
const MAL_TTL = { hit: 7 * 864e5, miss: 2 * 864e5 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let malSlot = Promise.resolve();
const malPending = new Map();

async function tenrai(q, retry = true) {
  const slot = malSlot.then(() => sleep(520));
  malSlot = slot;
  await slot;
  const r = await fetch("https://api.tenrai.org/v1/anime?limit=5&q=" + encodeURIComponent(q), { credentials: "omit" });
  if (r.status === 429 && retry) {
    await sleep(1000 * (Number(r.headers.get("Retry-After")) || 5));
    return tenrai(q, false);
  }
  if (!r.ok) throw new Error("tenrai HTTP " + r.status);
  return (await r.json()).data || [];
}

function malLookup(id, q) {
  if (malPending.has(id)) return malPending.get(id);
  const p = (async () => {
    const key = "mal:" + id;
    const c = (await get(key))[key];
    if (c && Date.now() - c.at < (c.score != null ? MAL_TTL.hit : MAL_TTL.miss)) return c;
    if (!q) return null;
    const hit = pickMal(q, await tenrai(q)); // a network error throws: nothing cached, retried next visit
    const entry = { ...(hit || { malId: null, score: null }), at: Date.now() };
    await chrome.storage.local.set({ [key]: entry });
    return entry;
  })().catch(() => null).finally(() => malPending.delete(id));
  malPending.set(id, p);
  return p;
}

// Bilibili.tv licensed-season lookups, cached as "bili:<id>". bilibili publishes no rate limit,
// so be polite: one search per second. Licences change, so re-check found seasons after 3 days
// and "not found" after 1 day.
const BILI_TTL = { hit: 3 * 864e5, miss: 864e5 };
let biliSlot = Promise.resolve();
const biliPending = new Map();

// app = the phone app's search: finds app-only licensed shows the website hides (e.g. Helck),
// titles in English. web = the website's: Thai titles, finds a few the app misses.
const BILI_SEARCH = {
  app: (q) => "https://app.biliintl.com/intl/gateway/v2/app/search/type?s_locale=th_TH&platform=android&mobi_app=bstar_a&type=7&pn=1&ps=10&keyword=" + encodeURIComponent(q),
  web: (q) => "https://api.bilibili.tv/intl/gateway/web/v2/search_v2/anime?s_locale=th_TH&platform=web&pn=1&ps=10&keyword=" + encodeURIComponent(q),
};

async function biliSearch(q, src) {
  const slot = biliSlot.then(() => sleep(1000));
  biliSlot = slot;
  await slot;
  const r = await fetch(BILI_SEARCH[src](q), { credentials: "omit" });
  const j = r.ok ? await r.json() : null;
  if (!j || j.code !== 0) throw new Error(`bilibili ${src} search failed: ` + (j ? j.code : r.status));
  // app items: {param: season id, title: "<em class=keyword>Helck</em>"}
  return (j.data?.items || []).map((i) => src === "app" ? { season_id: i.param, title: i.title.replace(/<[^>]+>/g, "") } : i);
}

function biliLookup(id, name) {
  if (biliPending.has(id)) return biliPending.get(id);
  const p = (async () => {
    const key = "bili:" + id;
    const c = (await get(key))[key];
    // v3 = app + web search with typo-tolerant Thai match (v1.6); redo older entries
    if (c?.v === 3 && Date.now() - c.at < (c.seasonId ? BILI_TTL.hit : BILI_TTL.miss)) return c;
    const qs = biliQueries(name);
    let hit = null;
    search: for (const src of ["app", "web"]) // errors throw: nothing cached
      for (const q of qs) if ((hit = pickBili(name, await biliSearch(q, src)))) break search;
    const entry = { ...(hit || { seasonId: null }), q: qs[0] || "", at: Date.now(), v: 3 };
    await chrome.storage.local.set({ [key]: entry });
    return entry;
  })().catch(() => null).finally(() => biliPending.delete(id));
  biliPending.set(id, p);
  return p;
}

// follows added from the popup never visit the series page, so look them up here
async function backfillBili(follows) {
  const all = await get(null);
  for (const [id, f] of Object.entries(follows)) if (all["bili:" + id]?.v !== 3) await biliLookup(id, f.title);
}

// New version on GitHub? Checked at most once a day from the 30-min alarm. The repo is public,
// so the raw manifest needs no token. Updating itself is update.bat (git pull) + reload.
// The contents API, not raw.githubusercontent.com: the raw CDN caches 5 min and ignores ?query
// busting, so a check right after a push saw the old version. API: max-age 60, 60 req/h per IP.
const REPO_MANIFEST = "https://api.github.com/repos/helloshinee002-cell/my-notify/contents/manifest.json?ref=main";
// "1.10" > "1.9": compare numerically, part by part
const newer = (a, b) => {
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

async function checkUpdate(force = false) {
  const { updateCheckedAt = 0 } = await get("updateCheckedAt");
  if (!force && Date.now() - updateCheckedAt < 864e5) return;
  const r = await fetch(REPO_MANIFEST, { credentials: "omit", cache: "no-store", headers: { Accept: "application/vnd.github.raw+json" } });
  if (!r.ok) return;
  const latest = (await r.json()).version;
  const mine = chrome.runtime.getManifest().version;
  await chrome.storage.local.set({ updateCheckedAt: Date.now(), update: newer(latest, mine) ? { version: latest } : null });
}

const schedule =() => chrome.alarms.create("check", { periodInMinutes: 30, delayInMinutes: 0.1 });
chrome.runtime.onInstalled.addListener(() => {
  schedule();
  // fires on every reload too: after update.bat + reload, drop the stale "new version" bar
  chrome.storage.local.set({ update: null, updateCheckedAt: 0 });
});
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== "check") return;
  check().catch(console.warn);
  checkUpdate().catch(() => {}); // offline / GitHub down: try again next alarm
});

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.mal) malLookup(msg.mal.id, msg.mal.q).then(reply);
  if (msg?.bili) biliLookup(msg.bili.id, msg.bili.name).then(reply);
  // the popup's "เช็กตอนนี้": new episodes and, ignoring the once-a-day limit, a new version
  if (msg === "check") Promise.all([check(), checkUpdate(true).catch(() => {})])
    .then(([n]) => reply({ ok: true, n }), (e) => reply({ ok: false, err: String(e) }));
  if (msg === "seen") chrome.storage.local.set({ unseen: [] }).then(() => { badge(0); reply({ ok: true }); });
  return true;
});
