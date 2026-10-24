// 037-hdd.com's player (playlist.streamhls1688.com/embed/…) asks
// GET /api/player/<id>/session and gets ad_gate.ads = [4 gambling mp4s] before the movie.
// adgate-player.js skips straight to completeGate() when ads is empty, so empty it here.
// gate_token is left alone: POST /playback needs it.
// The server still holds playback ~12 s after the session (425 AD_GATE_NOT_READY) and the
// player retries by itself, so the wait stays; only the ads go.
// Runs in the page's MAIN world at document_start, before adgate-player.js.
(() => {
  const realFetch = window.fetch;
  const isSession = (u) => /\/api\/player\/[^/]+\/session(\?|$)/.test(u);
  window.fetch = async function (input, init) {
    const res = await realFetch.apply(this, arguments);
    const url = typeof input === "string" ? input : (input && (input.url || input.href)) || "";
    if (!isSession(url)) return res;
    let j;
    try { j = await res.clone().json(); } catch { return res; }
    const g = j && j.ad_gate;
    if (!g) return res;
    g.ads = [];
    g.min_gate_seconds = 0;
    if (g.popup) g.popup.enabled = false;
    return new Response(JSON.stringify(j), { status: res.status, statusText: res.statusText, headers: res.headers });
  };
})();
