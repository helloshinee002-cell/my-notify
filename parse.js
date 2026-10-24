// Parses the "อนิเมะอัปเดตล่าสุด" cards out of the animegojos.com homepage HTML.
// Regex, not DOMParser: this runs in the MV3 service worker, which has no DOM.
const BASE = "https://animegojos.com";

const unescapeHtml = (s) =>
  s.replace(/&(amp|quot|#0?39|lt|gt);/g, (m, e) => ({ amp: "&", quot: '"', "#039": "'", "#39": "'", lt: "<", gt: ">" })[e]);

// "1-95" -> 95, "4" -> 4, junk -> 0
const epNum = (ep) => Number((String(ep).match(/(\d+)\D*$/) || [])[1] || 0);

function parseCards(html, origin = BASE) {
  const start = html.indexOf("อนิเมะอัปเดตล่าสุด"); // skip the "ยอดนิยม" carousel above it
  if (start < 0) return [];
  const seen = new Set();
  const out = [];
  for (const chunk of html.slice(start).split('<article class="anime-card">').slice(1)) {
    const id = (chunk.match(/href="\/list\/(\d+)\//) || [])[1];
    const ep = (chunk.match(/class="ep-tag">EP ([^<]+)</) || [])[1];
    if (!id || !ep || seen.has(id)) continue;
    seen.add(id);
    const name = (chunk.match(/<h3>([^<]*)<\/h3>/) || [])[1] || "";
    const img = (chunk.match(/<img[^>]*src="([^"]+)"/) || [])[1] || "";
    const dub = /class="badge dub"/.test(chunk);
    out.push({
      id,
      title: unescapeHtml(name.trim()) + (dub ? " (พากย์ไทย)" : ""),
      ep: ep.trim(),
      img: img ? new URL(img, origin).href : "",
    });
  }
  return out;
}

const TH_MONTHS = ["ม.ค", "ก.พ", "มี.ค", "เม.ย", "พ.ค", "มิ.ย", "ก.ค", "ส.ค", "ก.ย", "ต.ค", "พ.ย", "ธ.ค"];

// Series page bar "กำลังฉาย · อัปเดต EP.95 · 21 ต.ค. · พากย์ไทย" -> "2026-10-21".
// The bar has no year, so take the latest such date that isn't in the future.
function parseUpdated(text, now = new Date()) {
  const m = String(text).match(new RegExp(`(\\d{1,2})\\s*(${TH_MONTHS.join("|").replace(/\./g, "\\.")})\\.`));
  if (!m) return null;
  const mon = TH_MONTHS.indexOf(m[2]);
  let d = new Date(now.getFullYear(), mon, +m[1]);
  if (d - now > 864e5) d = new Date(now.getFullYear() - 1, mon, +m[1]);
  return `${d.getFullYear()}-${String(mon + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// most common weekday (0 = Sunday) among the recorded update dates, -1 if none
function weekdayOf(dates = []) {
  const n = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dates) n[new Date(d + "T12:00").getDay()]++;
  const best = Math.max(...n);
  return best ? n.indexOf(best) : -1;
}

// ---- MyAnimeList score (via api.tenrai.org, the keyless Jikan replacement) ----

// "Swallowed Star มหาศึกล้างพิภพ (พากย์ไทย)" -> "Swallowed Star"; Thai-only -> ""
function malQuery(text) {
  const q = String(text).replace(/\([^)]*\)/g, " ").split(/[฀-๿]/)[0].replace(/[\s:–-]+$/, "").trim();
  return /[a-z]/i.test(q) ? q : "";
}

const tokens = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);

// First search result where >= 70% of the query's words appear in one of its titles, else null.
// Guards against showing some unrelated show's score when MAL doesn't have the title.
function pickMal(query, results = []) {
  const q = tokens(query);
  if (!q.length) return null;
  for (const r of results) {
    const names = [r.title, r.title_english, ...(r.titles || []).map((t) => t.title)].filter(Boolean);
    if (names.some((n) => { const t = new Set(tokens(n)); return q.filter((w) => t.has(w)).length / q.length >= 0.7; })) {
      return { malId: r.mal_id, score: r.score ?? null };
    }
  }
  return null;
}

// ---- Bilibili.tv licensed (OGV) seasons ----
// Two searches (bg.js): the phone app's (English titles, finds app-only shows like Helck) and the
// website's (Thai titles, "คำอธิษฐานในวันที่จากลา FRIEREN"). Both are fussy ("Frieren" hits,
// "Sousou no Frieren" doesn't), so try a few terms.

const SEASON_TAIL = /\s*(\d+(st|nd|rd|th)\s+season|season\s*\d+|part\s*\d+|s\d+|ii|iii|iv|[ⅡⅢⅣ])\s*$/i;
const ROMAN = { ii: 2, iii: 3, iv: 4, "Ⅱ": 2, "Ⅲ": 3, "Ⅳ": 4 };
const seasonOf = (t) => {
  const s = String(t).replace(/\((thai dub|thai ver\.?|พากย์ไทย)\)/gi, "").trim();
  const m = s.match(/(\d+)(?:st|nd|rd|th)\s+season|season\s*(\d+)|ภาค(?:ที่)?\s*(\d+)|ซีซั่น\s*(\d+)|part\s*(\d+)/i);
  if (m) return Number(m.slice(1).find(Boolean));
  const latin = malQuery(s) || s; // gojo: "Link Click II ข้ามเวลา…": the numeral ends the English part
  const r = latin.match(/\s(ii|iii|iv|[ⅡⅢⅣ])$/i) || latin.match(/\s([2-9])$/); // "… II", "LINK CLICK Ⅱ", "LINK CLICK 3"
  return r ? ROMAN[r[1].toLowerCase()] || ROMAN[r[1]] || Number(r[1]) : 1;
};
const isDub = (t) => /พากย์ไทย|thai dub|thai ver/i.test(t);
// season words dropped: gojo says "ภาค2" where bilibili says "ซีซั่น 2"; seasonOf() handles seasons
const thaiPart = (t) => (String(t).replace(/\([^)]*\)/g, " ").match(/[฀-๿][฀-๿\s\d]*/) || [""])[0]
  .replace(/(ภาค(?:ที่)?|ซีซั่น)\s*\d+/g, "").trim();
const compact = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, "").replace(/[\s\p{P}]+/gu, "");

// search terms, most specific first: full Latin name, without the season, its longest word,
// its first two words, then the Thai name
function biliQueries(name) {
  const latin = malQuery(name), base = latin.replace(SEASON_TAIL, "").trim();
  const words = base.split(/\s+/).filter(Boolean);
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), "");
  return [...new Set([latin, base, longest.length >= 5 ? longest : "", words.slice(0, 2).join(" "), thaiPart(name)])]
    .filter((q) => q.length >= 3);
}

// letter-pair (bigram) similarity 0..1: tolerates a typo ("อาไร" vs "อะไร") but not a different
// show that merely starts the same ("เกิดใหม่เป็นก็อบลิน…" vs "เกิดใหม่เป็นอัศวิน…" ≈ 0.3)
function dice(a, b) {
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const p = s.slice(i, i + 2); m.set(p, (m.get(p) || 0) + 1); } return m; };
  const A = pairs(a), B = pairs(b);
  let both = 0;
  for (const [p, n] of A) both += Math.min(n, B.get(p) || 0);
  return (2 * both) / (a.length - 1 + b.length - 1);
}

// Accept an item only if it really is this show: >= 70% of the Latin name's words (season
// dropped) in its title, or the Thai names contain each other or are >= 80% alike (gojo's Thai
// names have typos). A short search term only widens recall; it never loosens this check. Among
// accepted items prefer the same season, then dub.
function pickBili(name, items) {
  if (!items?.length) return null;
  const base = tokens(malQuery(name).replace(SEASON_TAIL, ""));
  const thai = compact(thaiPart(name));
  const ok = items.filter((it) => {
    const t = new Set(tokens(it.title));
    if (base.length && base.filter((w) => t.has(w)).length / base.length >= 0.7) return true;
    if (thai.length < 4) return false;
    const c = compact(it.title);
    return c.includes(thai) || thai.includes(c) || dice(thai, compact(thaiPart(it.title))) >= 0.8;
  });
  if (!ok.length) return null;
  const want = seasonOf(name), dub = isDub(name);
  const rank = (it) => (seasonOf(it.title) === want ? 2 : 0) + (isDub(it.title) === dub ? 1 : 0);
  const best = ok.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  // every word of the full English name in the title ("TOUGEN ANKI: Nikko Kegon Falls Arc") is the
  // same season even when gojo numbers it ("ซีซั่น 2") and bilibili doesn't
  const full = tokens(malQuery(name)), bt = new Set(tokens(best.title));
  const exact = full.length > 1 && full.every((w) => bt.has(w));
  return { seasonId: String(best.season_id), title: best.title, sameSeason: exact || seasonOf(best.title) === want };
}

if (typeof module !== "undefined") module.exports = { parseCards, epNum, parseUpdated, weekdayOf, malQuery, pickMal, biliQueries, pickBili, BASE };
