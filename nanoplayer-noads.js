// nanoplayer.zip/video/playerads1.php (hubserieshds.com's player) calls
// goplayer({ playlist, options: { ads: [5 gambling pre-roll videos] } }).
// go-player.js installs it with a plain `window.goplayer = function…`, so this
// setter catches it and hands back a wrapper that empties `ads`. With no ads its
// initAd() emits "ended" right away and the episode starts.
// Runs in the page's MAIN world at document_start, before go-player.js loads.
let real;
Object.defineProperty(window, "goplayer", {
  configurable: true,
  set(fn) { real = fn; },
  get() {
    return real && function (cfg) {
      if (cfg && cfg.options) cfg.options.ads = [];
      return real.call(this, cfg);
    };
  },
});
