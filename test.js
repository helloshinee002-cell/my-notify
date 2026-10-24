// node test.js <saved homepage.html> [saved tenrai "Swallowed Star" search .json] [saved bilibili {query: items} .json]
// Checks parseCards on a real homepage, then runs bg.js check() with a stubbed chrome/fetch.
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const { parseCards, epNum, parseUpdated, weekdayOf, malQuery, pickMal } = require("./parse.js");

assert.strictEqual(malQuery("Swallowed Star มหาศึกล้างพิภพ"), "Swallowed Star");
assert.strictEqual(malQuery("I'm Dating a Dark Summoner (Uncensored) หวานใจของผม"), "I'm Dating a Dark Summoner");
assert.strictEqual(malQuery("Cyberpunk: Edgerunners 2 อาชญากรแดนเถื่อน"), "Cyberpunk: Edgerunners 2");
assert.strictEqual(malQuery("ดาบพิฆาตอสูร"), "");
if (process.argv[3]) {
  const res = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).data;
  assert.strictEqual(pickMal("Swallowed Star", res).malId, 44218);
  assert.strictEqual(pickMal("Black Clover", res), null, "unrelated title gets no score");
}
assert.strictEqual(pickMal("Black Clover 2nd Season", [{ mal_id: 1, title: "Black Clover", score: 8 }]), null, "season 1 is not season 2");

// bilibili: optional 3rd arg = saved {query: items} from search_v2/anime ("Frieren", "Black Clover")
const { biliQueries, pickBili } = require("./parse.js");
assert.deepStrictEqual(biliQueries("Black Clover 2nd Season แบล็คโคลเวอร์ ซีซั่น2"), ["Black Clover 2nd Season", "Black Clover", "Clover", "แบล็คโคลเวอร์"]);
assert.deepStrictEqual(biliQueries("ดาบพิฆาตอสูร"), ["ดาบพิฆาตอสูร"]);
assert.strictEqual(pickBili("x", null), null);
// phone-app search titles (English, "Ⅱ"/"3"/"(Thai Dub)") — real items from app.biliintl.com search/type
const LC = [{ season_id: "1006275", title: "LINK CLICK" }, { season_id: "2084676", title: "LINK CLICK Ⅱ" },
  { season_id: "2410703", title: "LINK CLICK 3" }, { season_id: "1046793", title: "LINK CLICK (Thai Dub)" }];
assert.strictEqual(pickBili("Link Click Season 3 ข้ามเวลาพิชิตภารกิจ ภาค 3", LC).seasonId, "2410703");
assert.strictEqual(pickBili("Link Click II ข้ามเวลาพิชิตภารกิจ", LC).seasonId, "2084676");
assert.strictEqual(pickBili("Link Click ข้ามเวลาพิชิตภารกิจ (พากย์ไทย)", LC).seasonId, "1046793");
assert.strictEqual(pickBili("Tougen Anki: Nikko Kegon Falls Arc สงครามเลือดอสูร ซีซั่น 2", [{ season_id: "2141466", title: "TOUGEN ANKI" }, { season_id: "2431878", title: "TOUGEN ANKI: Nikko Kegon Falls Arc" }]).sameSeason, true, "arc named exactly = same season");
assert.strictEqual(pickBili("Tensei Goblin dakedo Shitsumon Aru? เกิดใหม่เป็นก็อบลินแล้วไง มีคำถามอาไรไหม?", [{ season_id: "36332", title: "GOBLIN SLAYER" }, { season_id: "2433441", title: "เกิดใหม่เป็นก็อบลินแล้วไง มีคำถามอะไรไหม?" }]).seasonId, "2433441", "Thai typo on gojo (อาไร)");
assert.strictEqual(pickBili("The Exiled Heavy Knight Knows How to Game the System เกิดใหม่เป็นอัศวินเกราะหนัก", [{ season_id: "x", title: "เกิดใหม่เป็นก็อบลินแล้วไง มีคำถามอะไรไหม?" }]), null, "same Thai prefix, other show");
assert.strictEqual(pickBili("Helck ยอดผู้กล้าเฮลค์", [{ season_id: "2083919", title: "Helck" }]).seasonId, "2083919");
assert.strictEqual(pickBili("The Ramparts of Ice ปราการน้ำแข็ง", [{ season_id: "1", title: "The Ice Guy and His Cool Female Colleague" }]), null);
if (process.argv[4]) {
  const B = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
  const id = (name, q) => pickBili(name, B[q])?.seasonId ?? null;
  assert.strictEqual(id("Sousou no Frieren คำอธิษฐานในวันที่จากลา", "Frieren"), "2090295");
  assert.strictEqual(id("Sousou no Frieren คำอธิษฐานในวันที่จากลา (พากย์ไทย)", "Frieren"), "2093311", "dub");
  assert.strictEqual(id("Sousou no Frieren 2nd Season คำอธิษฐานในวันที่จากลา ภาค2", "Frieren"), "2287773", "season 2");
  assert.strictEqual(id("Black Clover 2nd Season แบล็คโคลเวอร์", "Black Clover"), "2432940");
  assert.strictEqual(id("Black Lagoon แบล็คลากูน", "Black Clover"), null, "lookalike rejected");
  assert.strictEqual(pickBili("Black Clover 3rd Season", B["Black Clover"]).sameSeason, false, "no 3rd season: flagged as another season");
}
const html = fs.readFileSync(process.argv[2], "utf8");

const cards = parseCards(html);
assert.ok(cards.length >= 30, "expected the ~60 latest cards, got " + cards.length);
assert.ok(cards.every((c) => /^\d+$/.test(c.id) && c.ep && c.img.startsWith("https://")));
assert.strictEqual(new Set(cards.map((c) => c.id)).size, cards.length, "ids are unique");
assert.ok(cards.some((c) => c.title.endsWith("(พากย์ไทย)")), "dub cards are labelled");
const now = new Date(2026, 9, 21, 20);
assert.strictEqual(parseUpdated("กำลังฉาย · อัปเดต EP.95 · 21 ต.ค. · พากย์ไทย", now), "2026-10-21");
assert.strictEqual(parseUpdated("อัปเดต EP.3 · 28 ธ.ค.", now), "2025-12-28"); // no year: last past one
assert.strictEqual(parseUpdated("ไม่มีวันที่", now), null);
assert.strictEqual(weekdayOf(["2026-10-21", "2026-10-14", "2026-10-13"]), 3); // 2 Wednesdays win
assert.strictEqual(weekdayOf([]), -1);
assert.strictEqual(epNum("1-95"), 95); assert.strictEqual(epNum("4"), 4); assert.strictEqual(epNum("x"), 0);

// bump the first card's episode by one and follow it plus the second (unchanged) one
const [a, b] = cards;
const bumped = html.replace(`EP ${a.ep}<`, `EP ${a.ep.replace(/\d+$/, (n) => +n + 1)}<`);
let store = { follows: { [a.id]: { title: a.title, lastEp: a.ep }, [b.id]: { title: b.title, lastEp: b.ep } } };
const notes = [];
const chrome = {
  storage: { local: { get: async () => JSON.parse(JSON.stringify(store)), set: async (o) => { Object.assign(store, o); } } },
  notifications: { create: async (id, o) => { notes.push({ id, ...o }); }, onClicked: { addListener() {} }, clear() {} },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
  alarms: { create() {}, onAlarm: { addListener() {} } },
  runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener() {} } },
  tabs: { create() {} },
};
let seriesPage = '<div class="wbar-status">กำลังฉาย · อัปเดต EP.96 · 21 ต.ค. · พากย์ไทย</div>';
let onSeries = () => {}, seriesFetches = 0; // hook: runs while check() awaits a series page
const ctx = { chrome, URL, console, fetch: async (u) => {
  const series = /\/list\//.test(u);
  if (series) { seriesFetches++; onSeries(); }
  return { ok: true, url: "https://animegojos.com/", text: async () => series ? seriesPage : bumped };
} };
ctx.importScripts = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, f), "utf8"), ctx);
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "bg.js"), "utf8"), ctx);

(async () => {
  await vm.runInContext("check()", ctx);
  assert.strictEqual(notes.length, 1, "one alert, for the bumped followed show only");
  assert.strictEqual(notes[0].id, "gojo:" + a.id);
  assert.strictEqual(epNum(store.follows[a.id].lastEp), epNum(a.ep) + 1);
  assert.strictEqual(JSON.stringify(store.unseen), JSON.stringify([a.id])); // vm realm: compare as JSON
  // both follows got a date: the bumped one (new EP) and the other (had none yet, backfilled)
  assert.ok(store.follows[a.id].dates.length === 1 && store.follows[b.id].dates.length === 1, "dates recorded");
  await vm.runInContext("check()", ctx); // same page again: nothing new
  assert.strictEqual(notes.length, 1, "no repeat alert");

  // a follow/unfollow made while check() awaits a series page survives check()'s write
  const [, , c, d] = cards;
  store.follows[c.id] = { title: c.title, lastEp: c.ep }; // no dates yet: check() fetches its page
  onSeries = () => { delete store.follows[b.id]; store.follows[d.id] = { title: d.title, lastEp: d.ep, dates: ["2026-10-01"] }; };
  await vm.runInContext("check()", ctx);
  onSeries = () => {};
  assert.ok(!store.follows[b.id], "unfollow made during check() stays unfollowed");
  assert.ok(store.follows[d.id], "follow made during check() is kept");
  assert.strictEqual(store.follows[c.id].dates.length, 1, "check()'s own date is still merged in");

  // a series page with no parseable date is retried once a day, not every check
  seriesPage = "<div>no status bar</div>";
  store.follows[c.id] = { title: c.title, lastEp: c.ep };
  seriesFetches = 0;
  await vm.runInContext("check()", ctx);
  await vm.runInContext("check()", ctx);
  assert.strictEqual(seriesFetches, 1, "dateless page fetched once, then skipped");
  store.follows[c.id].datesTriedAt -= 864e5 + 1; // a day later
  await vm.runInContext("check()", ctx);
  assert.strictEqual(seriesFetches, 2, "retried after a day");
  console.log(`ok: ${cards.length} cards; alert "${notes[0].title}" ${notes[0].message}; no repeat`);
})().catch((e) => { console.error(e); process.exit(1); });
