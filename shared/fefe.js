// fefe.js: helper for games running on Fefe. No dependencies.
// Based on the helper in the Fefe developer docs (Runtime & player identity),
// plus a local best-score cache so offline/guest play still keeps a record.
var Fefe = (function () {
  // Written by the bundle script into fefe-config.js:
  //   window.FEFE_CONFIG = { gameId: 42, apiUrl: "https://…/fefe/api" }
  // gameId is the fallback for offline copies opened from disk, where Fefe
  // injects only FEFE_AUTH_TOKEN.
  var CONFIG = window.FEFE_CONFIG || {};
  var MY_GAME_ID = CONFIG.gameId || 0;

  // Hosted games are served from <api>/html5/games/<id>/play, so the API root
  // is everything before "/html5/". Downloaded copies and externally hosted
  // copies use the configured public URL.
  var href = location.href;
  var cut = href.indexOf("/html5/");
  var API = cut >= 0 ? href.slice(0, cut) : CONFIG.apiUrl || "http://localhost/fefe/api";

  function gameId() { return window.FEFE_GAME_ID || window.GAME_ID || MY_GAME_ID; }
  function token() { return window.FEFE_AUTH_TOKEN || null; }

  // The player's Fefe account ID: the "sub" claim of their token.
  function playerId() {
    var t = token();
    if (!t) return null;
    try {
      var b64 = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(b64)).sub || null;
    } catch (e) { return null; }
  }

  function call(method, path, body) {
    var headers = { "Content-Type": "application/json" };
    if (token()) headers.Authorization = "Bearer " + token();
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    return fetch(API + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && (data.message || data.error)) || "HTTP " + res.status);
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function board() { return "/games/" + gameId() + "/leaderboards"; }

  var bestKey = "fefe-best-" + (CONFIG.slug || gameId());
  function localBest() {
    try { return Number(localStorage.getItem(bestKey)) || 0; } catch (e) { return 0; }
  }
  function saveLocalBest(score) {
    try { if (score > localBest()) localStorage.setItem(bestKey, String(score)); } catch (e) {}
  }

  var api = {
    apiRoot: function () { return API; },
    gameId: gameId,
    isSignedIn: function () { return !!token(); },
    playerId: playerId,
    localBest: localBest,

    // ID of the game's first leaderboard (the auto-created "Global"), or null.
    defaultLeaderboard: function () {
      if (!gameId()) return Promise.resolve(null);
      return call("GET", board() + "/status").then(function (r) {
        return (r && r.data && r.data.default_leaderboard_id) || null;
      });
    },

    // { name, total_players, entries: [{ rank, player_id, username, score }] }
    top: function (leaderboardId, limit) {
      return call("GET", board() + "/" + leaderboardId + "?limit=" + (limit || 10));
    },

    // The signed-in player's entry, or null if they have no score yet (404).
    // Any other failure rejects, so callers can tell "no score" from "unknown".
    myRank: function (leaderboardId) {
      var me = playerId();
      if (!me) return Promise.resolve(null);
      return call("GET", board() + "/" + leaderboardId + "/players/" + encodeURIComponent(me) + "/rank")
        .catch(function (e) { if (e && e.status === 404) return null; throw e; });
    },

    // Posts a score for the signed-in player. Guests: resolves null, no request.
    submit: function (leaderboardId, score, metadata) {
      if (!token()) return Promise.resolve(null);
      return call("POST", board() + "/" + leaderboardId + "/scores", { score: score, metadata: metadata });
    },

    // End-of-run flow from the docs: leaderboards keep the LAST score per
    // player, so only send improvements. Never throws — a failed request must
    // not break the game. Resolves:
    //   { status: "guest" | "offline" | "kept" | "saved" | "error",
    //     board, entries (null if unavailable), me, best }
    finishRun: function (score, metadata) {
      var prevBest = localBest();
      saveLocalBest(score);
      // Scores must be non-zero, so a zero run is just "kept".
      var out = { status: score ? "error" : "kept", board: null, entries: null, me: null, best: localBest() };
      return api.defaultLeaderboard().then(function (id) {
        if (!id) { out.status = "offline"; return out; }
        out.board = id;
        var post = Promise.resolve();
        if (!token()) out.status = "guest";
        else if (score) {
          post = api.myRank(id).then(
            function (mine) { return mine ? mine.score : 0; },
            // Stored score unknown: only post if this run beats this device's
            // best, so a flaky lookup can't overwrite a better score with a worse one.
            function () { return prevBest; }
          ).then(function (stored) {
            if (stored >= score) { out.status = "kept"; return; }
            return api.submit(id, score, metadata).then(function () { out.status = "saved"; });
          });
        }
        return post
          .catch(function (e) { out.status = e && e.status === 401 ? "guest" : "error"; })
          .then(function () {
            // Read independently: a slow standings call mustn't hide a saved score.
            return Promise.all([
              api.top(id, 10).catch(function () { return null; }),
              api.myRank(id).catch(function () { return null; }),
            ]);
          })
          .then(function (r) {
            // null = standings couldn't be loaded (not the same as an empty board).
            out.entries = r[0] ? r[0].entries || [] : null;
            out.me = r[1];
            return out;
          });
      }).catch(function () {
        if (out.status === "error" && !out.board) out.status = "offline";
        return out;
      });
    },
  };
  return api;
})();
