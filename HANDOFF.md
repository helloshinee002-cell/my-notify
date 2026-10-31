# HANDOFF: my-notify ("Gojo Notify" MV3 extension)

Written 2026-10-24, at **v2.1.5**, for continuing in a cloud session. The local workstation
notes (`CLAUDE.md` in the parent folder) are **not** in this repo, so everything a new session
needs is here.

## The user and how to work with them
- Writes in **Thai**, so reply in Thai, plainly. They're not a developer: explain what changed,
  what was tested, and the exact steps they must do in Edge.
- Uses **Windows + Microsoft Edge** (desktop). The Android `.crx` is low priority.
- They test in their own Edge. A cloud session **can't load the extension**. Verify with
  `node`/`curl` against the live sites and APIs, then hand the user clear test steps.
- They often report "ไม่เจอ/ไม่ขึ้น" with a pair of links (gojo page + bilibili page). Reproduce
  with curl first, find the cause, then fix the matcher, and add the pair to `test.js`.

## What this repo is
One unpacked MV3 extension; **the repo root is the extension folder** (Edge "Load unpacked"
points at the clone). It does two jobs:
1. **Gojo Notify** for animegojos.com:
   - new-episode alerts for followed shows;
   - a "ตามวัน" weekday view;
   - MyAnimeList score badges;
   - a licensed-Bilibili link.
2. **Ad blocking**, formerly a separate "Disable Ads by Web" extension, merged in at v2.0:
   animegojo, fairyanime, hubserieshds, 037-hdd and 24-hdc, via `declarativeNetRequest` + per-site CSS/JS.

## Rules for every change
1. **Bump `version` in `manifest.json` and push to `main`** for any change to the extension itself
   (docs-only commits like this file skip the bump, so users get no empty update). Other PCs only see an update when
   GitHub's version is higher. Use dotted numbers, e.g. 2.1.6, compared numerically by `newer()`
   in `bg.js`. The next real change is **2.1.9**; 2.0.1, 2.1.1, 2.1.3 and 2.1.5 were update-flow
   tests that only changed the version.
2. Commit as the account's noreply address, never a personal email:
   `git config user.name helloshinee002-cell` and
   `git config user.email 280962314+helloshinee002-cell@users.noreply.github.com`.
   End commit messages with a `Co-Authored-By:` trailer.
3. **The repo is public, with no description, at the user's request.** Keep `README.md` to
   install/update steps only, and **don't describe what the extension does there**. Never commit
   `*.pem`, `*.crx`, `*.zip`, cookies or tokens (`.gitignore` covers the first three).
4. Content scripts for gojo must stay **one** manifest entry (`parse.js`, `follow.js`, `mal.js`,
   plus css). `parse.js` declares top-level `const`s, and a second entry injecting it throws.
5. DOM built from site/API data uses `textContent` only, never `innerHTML`.
6. Keep `updater/*.ps1` **ASCII-only**: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.

## How updates reach the user's PCs
- `bg.js` `checkUpdate()` reads this repo's `manifest.json` through the **GitHub contents API**.
  It runs at most daily, or right away on the popup's "เช็กตอนนี้". If GitHub is newer, the popup
  shows a green bar with "อัปเดตเลย" / "เปิดโฟลเดอร์".
- "อัปเดตเลย" uses native messaging. `updater/host.bat` → `host.ps1` runs `git pull --ff-only` in
  the folder, then `chrome.runtime.reload()`. Each PC runs `install-updater.bat` once (HKCU, no
  admin). `update.bat` is the manual fallback.
- **To test the flow:** push a version bump from a *separate* clone, so the user's working copy
  stays one version behind.

## Testing
- `node test.js <homepage.html> [tenrai.json] [bili.json]`. Fixtures aren't in the repo;
  regenerate them:
  ```
  curl -s -A "Mozilla/5.0" https://animegojos.com/ -o home.html
  curl -s "https://api.tenrai.org/v1/anime?limit=5&q=Swallowed%20Star" -o tenrai.json
  # bili.json = {"Frieren": items, "Black Clover": items, "Kusuriya no Hitorigoto": items}
  # items = .data.items from api.bilibili.tv/intl/gateway/web/v2/search_v2/anime?keyword=<q>&s_locale=th_TH&platform=web&pn=1&ps=5
  ```
- Native host: spawn `updater\host.bat` and write a 4-byte LE length + JSON `{"cmd":"update"}`.
  The reply has the same framing. Test a **real** pull (a clone one commit behind), not only
  "Already up to date".
- Rate limits: Tenrai 4 req/s / 120 per min (the code spaces requests 520 ms apart); bilibili
  1 req/s (self-imposed); GitHub API 60 req/h unauthenticated.

## Open ideas (not started; the user hasn't chosen)
- A one-time Windows notification when a new version is found (only the popup bar exists now).
- A per-title manual fix for wrong MAL or Bilibili matches.
- Some shows are still "ไม่พบใน Bilibili". When the user sends a pair of links, fix the matcher.

## Things on the user's PC that are NOT in this repo
`bilibili-dark/` and `ytdlp-server/` are in the **private repo `B-Y-Utility`** (with its own
`HANDOFF.md`), together with the workstation `CLAUDE.md`/`AGENTS.md`. The `.pem` signing keys in
`mobile/` exist only on the user's PC (git-ignored).

---

# Reference: detailed notes (copied from the workstation CLAUDE.md, 2026-10-24)

Paths like `gojo-notify/…` below mean this repo's root. Mentions of the
`git-push-github` skill and `gh` path quirks are about the user's Windows workstation.

## Ad blocking — now part of `gojo-notify/` (was `disable-ads-by-web/`)

**2026-10-24: `disable-ads-by-web/` was merged into `gojo-notify/`** (v2.0), and the old folder
was deleted. Every file below (`rules.json`, `hide.css`, `fairyanime*`, `abysscdn.css`,
`hubseries.css`, `nanoplayer-noads.js`, `037hdd.css`, `player-bar.js`, `theater.css`, `streamhls-*`, `24hdc.css`, `24playerhd.css`) now lives in `gojo-notify/`.
The DNR rules and content-script entries are unchanged. The only difference is that `hide.css`
joined gojo's single content-script entry (`parse.js` must load once per page). It's still a
per-site ad/tracker blocker: `declarativeNetRequest` + per-site CSS, with JS only where noted.
Covers `animegojoo.com`, `fairyanime.net`, `hubserieshds.com`, `037-hdd.com` and `24-hdc.com`. After
editing, **reload** the Gojo Notify card.

**Rule: every new site to de-ad goes INTO `gojo-notify/` — never a new folder.**
Per site: add host to `host_permissions`, rules in its own id block (gojo 1–99,
fairyanime 101–199, next site 201–299, …) each scoped with `initiatorDomains`,
a `<site>.css` + its own `content_scripts` entry, add the site to `description`,
bump `version`.

### Android (`mobile/`)

Chrome for Android has no extensions, and Kiwi has been dead since early 2025. The phone
target is **Edge Canary**: Settings → About → tap the build 5× → Developer options →
"Extension install by crx". **Quetta** is a maybe (`quetta://extensions`, if it has Load
unpacked). `mobile/README-android.md` is the user guide, in Thai.

- `mobile/` lives **inside this repo** (since 2026-10-24); `pack.ps1`, `README-android.md` are committed,
  the `.crx`/`.zip` outputs are git-ignored. **The `.pem` keys live in `keys/` next to the extension folder
  (`Modify Windows/keys/`), never inside it**: Edge scans an unpacked extension and warns "This extension
  includes the key file …" if a `.pem` is in the folder (the user hit this on 2026-10-25 after `mobile/` moved in).
- **The phone build is ad-blocking only** (the user only uses that on the phone). `mobile\pack.ps1`
  (default) stages just the ad files and writes a **manifest derived from the real one**: name "Disable
  Ads by Web", same `version`, `permissions: [declarativeNetRequest]`, the ad hosts only (drops
  tenrai/bilibili/biliintl/github), no background/action/popup, and the gojo content-script entry
  reduced to `css: [hide.css]`. It signs with `disable-ads-by-web.pem`, which pins the old phone
  install's ID `njpebncddjkamhjkghfjjigofnkocedh`, so it installs as an update. `-Full` packs the
  whole extension as `gojo-notify.crx` (key `gojo-notify.pem`). **Keep both .pem files, never ship
  them**; lose one and the next pack gets a new ID. Both use `msedge --pack-extension` with a
  scratch `--user-data-dir`.
- PS 5.1 `Start-Process` doesn't quote array args, and the paths contain a space, so
  pack.ps1 quotes them by hand.

### animegojoo.com → animegojos.com (ids 1–99, `hide.css`)

- `rules.json` — blocks first-party ad iframes (`animegojoo.com/bframe.php`,
  `/e404.html`) and third-party trackers (`dtscout`, `dtscdn`, `mrktmtrcs`,
  `crwdcntrl`/Lotame, `histats`, GTM, CF insights). Every rule is scoped with
  `initiatorDomains: ["animegojoo.com"]` so it won't touch other sites sharing
  the same CDNs.
- `hide.css` — collapses leftover empty ad boxes (`#bt-ads` is `position:fixed
  z-index:1001` and covers the viewport bottom if left visible).
- 2026-10 update: gambling banner rows (`.bframe-row` > `.bannerrow`) now sit above
  and below the player. Rule 10 blocks their first-party images `/banner/*` (covers
  are in `/img/`), and `hide.css` collapses `.bframe-row` and `.bannerrow`.
  `#pop-scroll` is the popular-anime carousel, **not** an ad.
- The player moved to `anccplayer.cyou/source/playeradsg.php`. It's the same
  `goplayer({options:{ads}})` as hubserieshds (`ads` was empty when checked), so
  `nanoplayer-noads.js` also matches `https://anccplayer.cyou/source/*`. Episode URLs
  now come from `/pv/<b>/<v>/` → `{"u": "<player url>"}`.

- **2026-10-07: the site moved domains.** `animegojoo.com` now 301s to `animegojos.com`,
  with the same pages. Every gojo rule lists **both** domains in `initiatorDomains`.
  First-party paths use `urlFilter: "/bframe.php"` / `"/banner/"` plus
  `requestDomains: [both]` instead of a host-anchored `||animegojoo.com/…`. Both are
  also in `host_permissions` and the `hide.css` matches. **If ads "come back" again,
  check for another domain hop first:** `curl -sI https://animegojos.com/` shows a 301,
  and the page's links point at the new host. Then add the new domain in those same 4
  places.

**Gotcha:** `hide.css` must NOT hide `#refresh` — despite the name it's the
video player iframe, not an ad. Hiding it blanks the player.

### fairyanime.net (ids 101–199, `fairyanime.css`)

- rule 101 redirects the player iframe `streaming.tonytonychopper.com/playback/f/<id>/`
  → `/playback/v/<id>/`. `f` is a wrapper that plays 2 gambling pre-roll videos and
  a click-hijack overlay before loading `v`; `v` is the clean player. This skips the
  pre-roll entirely instead of blocking the ad mp4s (blocking them can trip jwplayer's
  `setupError` → iframe `src="null"` → black screen).
- Other rules block banner images (`banner.tonytonychopper.com`, `cdend.com`), the
  `#kosana` banner script (`streaming.tonytonychopper.com/ads/`), the popunder loaders
  (`premiumvertising.com`, `d2j042cj1421wi.cloudfront.net`), GTM and `whos.amung.us`.
- `fairyanime.css` collapses the floating/catfish/kosana boxes.
- **Dark mode:** the site has its own (`dark-mode.css`, light unless `body.light-mode`)
  but defaults to light. `fairyanime-dark.js` (document_start) sets localStorage
  `site-theme=dark` only when empty, so the site's 🌙/☀️ button still wins.
  `fairyanime-dark.css` darkens the bits it missed (pager, active tab, breadcrumb,
  `.badge-light`), scoped to `body:not(.light-mode)`.
- Some episodes nest deeper: `playback/v` → `anime.tonytonychopper.net/v2` →
  `player.marimo.me/demo/` → `abysscdn.com` (the real video). Two more ad layers:
  - **marimo** runs an obfuscated inline pop-under loader that rotates domains. Rule 109
    sets `Content-Security-Policy: script-src 'self'` on that frame, so inline scripts
    can't run (its own inline `web_uri` only feeds `contents()`, which that page never
    calls). Rule 110 also blocks the 4 hosts the loader tried, as a fallback.
  - **abysscdn** has a transparent `#overlay` click-catcher: each click opens an ad tab,
    and if pop-ups fail it shows "AdBlock detected" instead of the video. `abysscdn.css`
    (content script, `all_frames`) hides `#overlay`, so clicks reach jwplayer and that
    code never runs. Don't block its pop-up domain instead: tabs still open, empty.

**Gotcha:** the player and an ad script share the host `streaming.tonytonychopper.com`.
Block by path (`/ads/`), never the whole host, or the video dies.

### hubserieshds.com (ids 201–299, `hubseries.css`, `nanoplayer-noads.js`)

Same platform as animegojoo: `/bframe.php` ad frames, `#bt-ads`/`#bt-ads-mini` fixed
boxes, and **`#refresh` is the player iframe (never hide it)**.

- Rules 201–204 block `/bframe.php`, the first-party banner images `/banner/*`
  (covers live in `/img/`, untouched), histats and GTM. `hubseries.css` collapses
  `#banner`, `.bannerrow`, `.bframe`, `#bt-ads*`.
- **Pre-roll:** episodes load `nanoplayer.zip/video/playerads1.php`, which calls
  `goplayer({…, options:{ads:[5 gambling mp4s]}})`. There's no ad-free variant
  (`player.php` is empty). `nanoplayer-noads.js` (MAIN world, document_start,
  all_frames) traps the `window.goplayer = …` assignment and empties `options.ads`.
  With no ads, go-player's `initAd()` emits `ended` and the episode starts.
- The episode table is obfuscated (char codes − 5, then eval); decode it statically
  to find the player URL.
- **The site has a DevTools detector**: with DevTools open it swaps the player for
  `nanoplayer.zip/video/e404.html`. Test without DevTools.
- `nanoplayer.zip` shows a Cloudflare bot check to automated browsers, so the
  player can only be tested in the user's own Edge.

### 037-hdd.com (ids 301–399, `037hdd.css`, `theater.css`, `streamhls-noads.js`, `streamhls.css`)

Mapped by two read-only swarm workers, 2026-10-17.

- **Page ads, all one mechanism:** inline jQuery `$('#ads-…').load('/ads/<name>.php')`
  fills empty placeholder divs. Rule 301 blocks `||www.037-hdd.com/ads/` (xhr), which kills
  every banner, the `#banner-left` side skyscrapers and the `#ads_fox_bottom` footer.
  `037hdd.css` collapses the `#ads-*` placeholders. **Hide by id only:** the fragments reuse
  `.filmborder`/`.filmcontent`/`.sidebar-right`/`.code-block`, and so does real content
  (title, poster grid, "เรื่องล่าสุด"). Rules 302/303 block `image.cdend.com` and GTM/GA.
- **Player chain:** post page → `/?streamhls_ticket=…` (302, IP/UA-bound token) →
  `playlist.streamhls1688.com/legacy/leo/embed/<id>` → **ad-gate** `/embed/di<hex>`
  (`adgate-player.js`) → `/player/source/v1.<token>` (jwplayer + HLS). The backup source
  is `playhydrax.com` (the abyss.to player, so `abysscdn.css` also matches it).
- **Pre-roll:** `GET /api/player/<id>/session` returns `ad_gate.ads` (4 gambling mp4s on
  `googles.video`) and `min_gate_seconds: 12`. `streamhls-noads.js` (MAIN world,
  document_start, all_frames) wraps `fetch` and rewrites only that response: `ads=[]`,
  `min_gate_seconds=0`, `popup.enabled=false`. It keeps `gate_token`, since `/playback`
  needs it. The player then calls `completeGate()` straight away.
  **The server still enforces ~12 s:** `/playback` answers `425 AD_GATE_NOT_READY`
  until 12 s after the session, and the player retries by itself. That wait can't be
  removed. Rule 304 (`googles.video`) is a fallback.
- **Ad-tech sync (rule 306, 2026-10-31):** the player loads `cd.connatix.com/identity.js` and `cds.connatix.com/p/…/cnx_usync.js`,
  then `capi.connatix.com/core/sync` fires cookie-sync requests to 30+ ad companies (Criteo, PubMatic, Rubicon, adnxs, …) and leaves
  IDs in localStorage (`id5id*`, `cnx_*`). jwplayer has `advertising: false`, so playback shouldn't need it. Rule 306 blocks
  `connatix.com` at the source, so no per-company list is needed. **Not testable outside the user's Edge** (the test browser can't load
  DNR, and the scripts load too early to simulate). If 037 ever stops playing, remove rule 306 first. The player also loads p2p-media-loader;
  its script is obfuscated, so whether P2P is active there is unconfirmed.
- **Never block:**
  - `/?streamhls_ticket`
  - streamhls `/embed`, `/api/player/*`, `/player/source`, `/sources`, `/static/js`
  - `content.jwplatform.com`, `cdn.jsdelivr.net`, `hls.steamhls*.com`
  - **`*-ad-site-sign-sg.tiktokcdn.com`: that's the real video**, despite "ad-site" in the name
- **Player buttons** (`player-bar.js` + `theater.css`, on the post page): "โรงหนัง (T)" and "เต็มจอ (F)" under each player iframe. Matched by `iframe#player, iframe[src*="streamhls_ticket"]`: older posts (e.g. 2021 Godzilla) have no `id`.
  - **The site's jwplayer fullscreen is broken.** jwplayer sets `jw-flag-fullscreen` / `getFullscreen()=true`, but no frame ever gets a `fullscreenElement`, even though every iframe has `allow="fullscreen"` and no header restricts it. So "เต็มจอ" calls `requestFullscreen()` on the outer iframe from the top page, which doesn't depend on the nested frames.
  - **Theater** pins the iframe `position:fixed` and centered, at `min(95vw, 95vh·16/9)`. The backdrop is a `box-shadow: 0 0 0 100vmax` on the iframe itself.
  - `#wrap {z-index:5}` makes a stacking context that traps the fixed player under the page. While theater is on, the script adds `.t037-lift` (`z-index:auto`) to every stacking ancestor. Esc, T or the button toggles it off.
  - The in-app test browser can't do real fullscreen at all (`requestFullscreen()` never settles), so the F button can only be checked in the user's Edge.
- **-5 / +5 buttons** (`streamhls-seek.js`, isolated world, all_frames on streamhls) sit in the jwplayer control bar after "Rewind 10 Seconds", so they work in fullscreen too. They set `video.currentTime` directly (hls.js plays through the `<video>`), with no need for the page's `jwplayer` object. A MutationObserver re-adds them if jwplayer rebuilds the bar.
- **Resolution label + quality menu** (`quality.js`, v2.1.8; MAIN world, all_frames, on streamhls and 24playerhd, because the API is on the page's
  `jwplayer`). A control-bar button shows the real decoded height (`video.videoHeight`), e.g. "1080p" or "Auto · 1080p", and opens a menu of
  `getQualityLevels()` → `setCurrentQuality(i)`. **It can only offer what the source has**: sampled 24-hdc movie = Auto/360p/1080p (no 720p), sampled
  037 movie = 720p only, so there it's just a label. The menu is appended inside `.jwplayer`, not `<body>`, so it survives jwplayer's own fullscreen.
  - **Gotcha:** a switch only shows after the already-buffered video plays out (about 2 minutes seen on 24-hdc), and `getCurrentQuality()` keeps reporting the old
    level until then. So the script remembers `chosen` and shows "1080p → 360p" until `videoHeight` matches. Seeking past the buffer lands it at once.
  - In tests, target `.jwplayer > [role=menu]`: jwplayer has its own hidden `[role=menu]` lists.
- `streamhls1688` has a number in its name, so expect a domain hop. Read the base64
  `target=` on the post page's `iframe#player` to find the new host.

### 24-hdc.com (ids 401–499, `24hdc.css`, `24playerhd.css`, `player-bar.js`, `theater.css`)

Added 2026-10-31 (v2.1.6), same treatment as 037-hdd. The site's own banner says it hopped from 24-hda.com,
so **expect another domain hop**: add the new host to `host_permissions`, the `matches` and the rules'
`initiatorDomains`/`requestDomains`.

- **Page ads, all one kind:** first-party gambling GIFs at `/wp-content/uploads/…/*.gif`, each inside
  `<a href="/link_to.php?url=…">`. Every `.gif` on the page is an ad (0 outside link_to links), so rule 401
  blocks them by path. Rule 402 blocks GTM, GA and CF insights. `24hdc.css` collapses `aside.ad`, `.adt`,
  `.adrg`, `.adhl`, `.adl`, `.adb` and `a[href*="link_to.php"]`.
- **Never hide or block:**
  - `.adlf` / `section.adlf`: holds the **real category menu**;
  - `.adcen`: also wraps real layout (its `.adb` child is what gets hidden);
  - `#yout`: the sticky trailer player;
  - `api.24-hdc.com/get.php`: **the player loader**.
- **Player:** WordPress halim theme. `#halim-player-wrapper` > `#ajax-player` > `iframe.embed-responsive-item` (no `id`).
  The three server buttons swap the iframe by AJAX: "เก่า" = `main.24playerhd.com/index_th.php`,
  "ใหม่"/"สำรอง" = `new_player.php?id=…&b=…`.
- **Pre-roll overlay:** `#ad-overlay` in the player frame. Its ✕ opens `ads.php` in a new tab and waits 3 s; if the popup
  was blocked it sets `window.isPois = true`, and `player.on("time")` then stops the movie at 300 s. The flag is set
  **only inside the ✕ handler**, so `24playerhd.css` hiding the box (never pressing ✕) avoids it. Tested: plays,
  `isPois` stays undefined, and the resume prompt takes its normal branch because it checks computed display.
- **Buttons:** `player-bar.js` (was `037hdd-player.js`, now serves both sites) and `theater.css` (split out of `037hdd.css`).
  The bar goes after `#halim-player-wrapper`, **not inside**: that box has a fixed height, so a bar inside overflows under
  the language/part selects. The iframe is looked up at click time because the server buttons replace it, and theater mode
  turns itself off if its iframe disappears. -5/+5 is `streamhls-seek.js` on `main.24playerhd.com` (all_frames).
- **P2P (rule 403, built but OFF by the user's decision, 2026-10-31):** the player runs p2p-media-loader with `consumeOnly: false`
  and `cachedSegmentsCount: 300` (50 on mobile), so it **uploads video to other viewers** and exposes the IP to them. Trackers:
  `wss://t1–t4.24playerhd.com`. The block lives in its own ruleset `rules-24hdc-p2p.json`, listed in the manifest with
  `"enabled": false`. **To turn it on: set `enabled: true` and bump the version.** Simulated with the tracker WebSocket failing
  (`wss://t3…`): the movie keeps playing, segments come over HTTP from `www.work26092026.online`.
- **Not tested:** `new_player.php` answers "Error 32177" / shows black outside the user's browser, and it gates on how it's
  loaded. Don't try to get past that check (spoofed headers were refused by the harness). The user checks it in Edge.
  Same host, so the same CSS and seek script apply if it has the same markup.

## `gojo-notify/` — "Gojo Notify" (MV3 v2.1.8)

Also holds the ad blocker (see "Ad blocking" above). Repo, update flow: the GitHub bullet below.

Alerts when an anime the user **follows** on animegojos.com gets a new episode. It's a separate
extension, since it isn't an ad blocker.

- `bg.js` (service worker) runs on `chrome.alarms` **every 30 min**. It fetches the homepage
  (server-rendered, no Cloudflare check, no RSS) and parses the "อนิเมะอัปเดตล่าสุด" cards with
  `parse.js` `parseCards()`, which uses **regex**, because a service worker has no DOMParser.
  Parsing starts at that heading, skipping the "ยอดนิยม" carousel above it, whose `EP 4` tags
  use a different format.
- The key is the `/list/<id>/` number. Dub and sub versions of a show have different ids.
- Episodes are compared with `epNum()`, the last number of `EP 1-95` → 95. A followed show
  alerts when that number goes up (`chrome.notifications`, with the cover as icon and our own
  `icon.png` as fallback). Clicking the alert opens the series page. The badge shows the unseen
  count, and opening the popup clears it.
- **Following stores the current EP as `lastEp`**, so a new follow never alerts for an old
  episode. You follow with "★ ติดตาม" by the `h1.page-title` (`follow.js`) or with ★ in the
  popup's "อัปเดตล่าสุด" tab.
- Storage is `chrome.storage.local`: `follows {id:{title,img,lastEp,origin}}`, `unseen`, `latest`,
  `checkedAt` and `origin`. `origin` comes from `response.url`, so after a domain 301 the links
  still point at the live host. **If the site moves again**, add the new host to
  `host_permissions`, the `matches` list, and `BASE` in `parse.js`.
- The popup DOM uses `textContent` only.
- **Writes to `follows` re-read it first.** `check()` awaits series-page fetches, so before writing it re-reads `follows` and merges only its own fields (`lastEp`, `img`, `origin`, `dates`, `datesTriedAt`) into the fresh copy, skipping ids unfollowed meanwhile. The popup ★ and `follow.js` also read `follows` at click time. If the extension was reloaded under an open tab, `follow.js` shows "รีเฟรชหน้า" on the button instead of throwing.
- **"ตามวัน" tab** groups follows by usual release weekday, starting today. The site has no schedule: the series page bar `.wbar-status` ("กำลังฉาย · อัปเดต EP.95 · 21 ต.ค. · …") only gives the **latest** update date, with no year. `parseUpdated()` turns it into `YYYY-MM-DD` (the latest such date not in the future), and `f.dates` keeps the last 8 distinct ones. `weekdayOf()` picks the most common weekday. Dates are recorded when you follow (`follow.js` reads the bar; `parse.js` loads first as a content script), and by `check()` for a new EP, or for a follow with no date yet (followed from the popup). It fetches only those series pages, never all of them. A page with no parseable `.wbar-status` sets `f.datesTriedAt`, and is retried once a day instead of every 30 min. A show with no date sits under "ยังไม่รู้วัน".
- **MyAnimeList score badges** (`mal.js` + `mal.css`): a "★ 8.07" badge sits bottom-left on every `.card-thumb` (the only corner free of the site's NEW/EP/badge labels) and next to the follow button on `/list/<id>/`. Clicking it opens the MAL page so the match can be checked. The popup shows the cached score after the EP.
  - Source: **`api.tenrai.org/v1/anime?q=`**. It's keyless and replaces Jikan (Jikan shut down 2026-10-01; MAL official needs a Client ID). Limit 4 req/s and 120/min per IP, so `bg.js` `tenrai()` spaces requests 520 ms apart through one promise chain (400 ms would be 150/min, over the 120/min cap), and on 429 waits for `Retry-After` and retries once.
  - `malQuery()` takes the card `<h3>` text before the first Thai character, minus `(…)`. Thai-only titles are skipped.
  - **`pickMal()` match check:** it takes the first result where ≥70% of the query words appear in one of its titles (`title`/`title_english`/`titles[]`). Otherwise there's no badge, rather than a wrong one. On 2026-10-24, 65 of 68 homepage titles matched. JoJo Steel Ball Run is correctly rejected, because the search only returns other JoJo parts.
  - Cache: one storage key per show, `mal:<gojoId>`, so parallel writes can't clobber each other. Scored entries are kept 7 days. No match, or no score yet (a brand-new show), is kept 2 days, then retried. Network errors aren't cached.
  - All content scripts are **one** manifest entry (`parse.js`, `follow.js`, `mal.js` on every gojo page). Two entries would inject `parse.js` twice on `/list/`, and its top-level `const`s would throw.
  - Tenrai is unofficial too. If it dies, switch `tenrai()` to MAL official v2 with an `X-MAL-CLIENT-ID` (free at myanimelist.net/apiconfig).
- **Bilibili licensed link** (v1.4). This appears on the series page only, in a `.bili-slot` after the MAL badge (`mal.js` `showBili()`), and in the popup's ติดตาม/ตามวัน rows. It isn't on covers, by the user's choice.
  - Sources, tried in this order:
    1. **The phone app's search**, `app.biliintl.com/intl/gateway/v2/app/search/type?type=7&platform=android&mobi_app=bstar_a&s_locale=th_TH&keyword=`. Items are `{param: season_id, title: "<em class=keyword>…</em>"}`, with **English** titles. It is the **only** one that finds app-only licensed shows the website search hides. Helck (2083919) was the user's report on 2026-10-24: its page plays on web, but the web search returns nothing. Its titles mark seasons as "(Season 2)", "Ⅱ" or "LINK CLICK 3" and dubs as "(Thai Dub)"/"(Thai ver.)". `seasonOf`/`isDub` handle those.
    2. **The website's search**, `api.bilibili.tv/intl/gateway/web/v2/search_v2/anime?keyword=&s_locale=th_TH&platform=web`, as fallback. It has Thai titles and finds a few the app misses (e.g. Otome Kaijuu Carameliser).
  - The cache entry carries a version (`v: 3` since v1.6). Bump it whenever matching improves, so cached "not found" entries are redone. It needs no login. Results are licensed OGV seasons only (`season_id`, Thai `title`), or `items: null`. The link is `https://www.bilibili.tv/th/play/<season_id>`.
  - **The search is fussy.** "Frieren" finds it, but "Sousou no Frieren", "The Apothecary Diaries" and partial Thai names find nothing. So `biliQueries()` tries, in order: the full Latin name; without the season suffix; its longest word (≥5 chars); its first two words; and the Thai name with ภาค/ซีซั่น N stripped. It stops at the first accepted hit.
  - **`pickBili()` match check:** ≥70% of the season-less Latin words must appear in the bilibili title, **or** the Thai names (compacted) must contain each other, **or be ≥80% alike by letter-pair (bigram Dice) similarity**. gojo's Thai names have typos: list/3153 says "มีคำถามอาไรไหม" where bilibili 2433441 says "อะไร". Its romaji "Tensei Goblin dakedo Shitsumon Aru?" shares only "goblin" with the English "I'm a Reincarnated Goblin, Any Questions?". Isekai titles sharing a prefix ("เกิดใหม่เป็น…") score about 0.3, so they stay rejected. A short search word only widens recall and never loosens this check. Among accepted items it prefers the same season (`seasonOf`: ซีซั่น/ภาคที่/Season/2nd Season), then the same dub flag. `sameSeason: false` shows "(ภาคอื่น)", e.g. Slime 4th season when bilibili only has season 1.
  - "ไม่พบใน Bilibili" means **not found by search**, not proven absent, so it links to bilibili's search page. A live run on 2026-10-24 found 12 of 25 homepage titles. Spot-checked misses (Elusive Samurai, Ramparts of Ice, Renegade Immortal) were genuinely absent.
  - `bg.js` `biliSearch()` uses its own queue at **1 req/s** (bilibili publishes no limit). Cache is `bili:<id>`: 3 days when found, 1 day when not (licences change). Errors aren't cached, and the page shows nothing rather than a false "ไม่พบ". `check()` runs `backfillBili()` without waiting on it, for follows with no cache (followed from the popup).
- **GitHub: public repo `helloshinee002-cell/my-notify`**, and the `gojo-notify/` folder **is** the
  repo root (`git init` there; "Load unpacked" points at the clone).
  - The user wants it non-descriptive: **no repo description**, and a README with install/update
    steps only.
  - Commits use the account's noreply email (`280962314+helloshinee002-cell@users.noreply.github.com`),
    never the gmail. Push with the `git-push-github` skill (unset `GITHUB_TOKEN`; `gh` isn't on
    PATH).
  - `.gitignore` excludes `*.pem`, `*.crx`, `*.zip` and `_metadata/`. **Never commit a `.pem`.**
  - **Updating other PCs:** `bg.js` `checkUpdate()` (at most daily, from the 30-min alarm) reads
    the manifest through the **GitHub contents API** (`api.github.com/repos/…/my-notify/contents/manifest.json?ref=main`,
    `Accept: application/vnd.github.raw+json`, max-age 60, 60 req/h per IP). Not raw.githubusercontent.com: its CDN caches
    5 min and **ignores `?t=` busting**, so a check right after a push saw the old version (seen 2026-10-24). The popup's
    "เช็กตอนนี้" sends `check`, which also runs `checkUpdate(true)` and skips the daily limit. Then it does a numeric dotted compare
    (`newer()`). If GitHub is ahead, the popup shows a "มีเวอร์ชันใหม่" bar. The bar has **"อัปเดตเลย"** and
    **"เปิดโฟลเดอร์"** buttons (v2.1). They use **native messaging**: `chrome.runtime.sendNativeMessage("com.mynotify.updater", {cmd})`
    → `updater/host.bat` → `updater/host.ps1`. `update` runs `git -C <ext folder> pull --ff-only`, then
    `chrome.runtime.reload()`; `open` launches Explorer. The wire format is a 4-byte LE length + UTF-8 JSON;
    the .ps1 files are ASCII-only (PS 5.1). The host is registered once per PC by `install-updater.bat`
    → `updater/install.ps1`: an HKCU key (no admin) pointing at a git-ignored `updater/com.mynotify.updater.json`.
    Its `allowed_origins` holds the ID **computed from the folder path**, the way Edge derives an
    unpacked extension ID: SHA-256 of the path as UTF-16LE with the drive letter upper-cased, first 16 bytes,
    hex 0-f → a-p. Checked against Edge's Secure Preferences: `naijddebhciookkclggckhojdoippmia`. Moving
    the folder changes the ID, so re-run the installer. If the host is missing, the popup says to run
    `install-updater.bat`. `update.bat` (`git pull --ff-only` + open `edge://extensions`) is the manual
    fallback. `onInstalled`, which fires on every reload, clears the bar.
    Host protocol test: `scratchpad host-test.js` spawns `host.bat` with a framed message.
    **Gotcha (fixed in 2.1.2):** run git through `cmd /c "git … 2>&1"`, not `& git … 2>&1`. PS 5.1 turns git's
    normal stderr line ("From https://…") into an error record, which with `ErrorActionPreference=Stop`
    reported "ไม่สำเร็จ" after a pull that had actually succeeded. Test a real pull (a clone one commit
    behind), not only "Already up to date", which writes nothing to stderr.
  - **Bump `version` and push for every change**, or other PCs never see it.
- Test: `node gojo-notify/test.js <saved homepage.html>` runs the parser and then `check()` with a
  stubbed `chrome`. It asserts exactly one alert for a bumped followed show, and none on a repeat; that a follow/unfollow made during `check()` survives its write; and that a dateless series page is fetched once a day, not every check.
