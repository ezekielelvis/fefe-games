// Ananse Hop — endless runner on a plain canvas. No assets, no dependencies,
// so the downloaded bundle plays fully offline.
(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var $ = function (id) { return document.getElementById(id); };

  var W = 0, H = 0, DPR = 1, GROUND = 0, SCALE = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    SCALE = Math.max(0.7, Math.min(1.4, Math.min(W, H) / 420));
    GROUND = Math.round(H * 0.78);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- state ----------------------------------------------------------------
  var GRAVITY = 2600, JUMP = 900, START_SPEED = 330, MAX_SPEED = 900;
  var state = "menu"; // menu | play | over
  var player, obstacles, coins, particles, speed, distance, bonus, spawnIn, coinIn, t;
  var hills = [];
  for (var i = 0; i < 6; i++) hills.push({ x: i * 260, h: 60 + Math.random() * 90 });

  function reset() {
    player = { x: 0, y: 0, vy: 0, jumps: 0, r: 18 };
    obstacles = []; coins = []; particles = [];
    speed = START_SPEED; distance = 0; bonus = 0; spawnIn = 1.2; coinIn = 0.8; t = 0;
  }
  reset();

  function score() { return Math.floor(distance / 10) + bonus; }

  // ---- audio (tiny WebAudio blips, created on first input) ------------------
  var audio = null;
  function blip(freq, dur, type) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + dur);
    } catch (e) {}
  }

  // ---- input -----------------------------------------------------------------
  function jump() {
    if (state !== "play") return;
    if (player.jumps < 2) {
      player.vy = -JUMP * (player.jumps ? 0.85 : 1) * Math.sqrt(SCALE);
      player.jumps++;
      blip(player.jumps === 1 ? 520 : 700, 0.08);
      burst(px(), player.y, "#f2b134", 6);
    }
  }
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (state === "play") jump();
      else if (state === "menu") start();
    }
  });
  canvas.addEventListener("pointerdown", function (e) { e.preventDefault(); jump(); });
  $("play").addEventListener("click", start);
  $("again").addEventListener("click", start);

  // ---- flow ------------------------------------------------------------------
  var bestEl = $("best"), scoreEl = $("score");
  bestEl.textContent = Fefe.localBest();
  $("who").textContent = Fefe.isSignedIn()
    ? "Signed in — your best score goes on the Fefe leaderboard."
    : "Playing as a guest. Sign in to Fefe to save your scores.";

  function start() {
    reset();
    state = "play";
    $("start").classList.add("hidden");
    $("over").classList.add("hidden");
  }

  function gameOver() {
    state = "over";
    blip(140, 0.35, "sawtooth");
    burst(px(), player.y, "#ff5a5f", 22);
    var s = score();
    $("final").textContent = s;
    $("status").textContent = "Saving…";
    $("entries").innerHTML = '<li class="muted">Loading…</li>';
    $("mine").textContent = "";
    setTimeout(function () { $("over").classList.remove("hidden"); }, 450);

    Fefe.finishRun(s, { distance: Math.floor(distance), coins: bonus / 25 }).then(function (r) {
      bestEl.textContent = r.best;
      var msg = {
        saved: "New best! Saved to the leaderboard.",
        kept: "Your best score on the leaderboard still stands.",
        guest: "Sign in to Fefe to put your score on the leaderboard.",
        offline: "Offline — your best is saved on this device.",
        error: "Couldn't reach the leaderboard. Your best is saved on this device.",
      }[r.status];
      $("status").textContent = msg;
      renderBoard(r);
    });
  }

  function renderBoard(r) {
    var list = $("entries");
    if (!r.entries || !r.entries.length) {
      var msg = !r.board ? "Leaderboard unavailable offline" : r.entries ? "No scores yet — be the first!" : "Couldn't load the leaderboard";
      list.innerHTML = '<li class="muted">' + msg + "</li>";
    } else {
      var me = Fefe.playerId();
      list.innerHTML = r.entries.map(function (e) {
        return '<li class="' + (e.player_id === me ? "me" : "") + '"><span class="rk">' + e.rank +
          '</span><span class="nm">' + esc(e.username || "Player") + '</span><span class="sc">' +
          Math.round(e.score) + "</span></li>";
      }).join("");
    }
    $("mine").textContent = r.me ? "You're #" + r.me.rank + " with " + Math.round(r.me.score) : "";
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- world -----------------------------------------------------------------
  function px() { return Math.max(70, W * 0.18); }

  function spawnObstacle() {
    var kind = Math.random();
    var s = SCALE;
    if (kind < 0.55) obstacles.push({ x: W + 40, w: 26 * s, h: (34 + Math.random() * 30) * s, type: "pot" });
    else if (kind < 0.85) obstacles.push({ x: W + 40, w: 54 * s, h: 26 * s, type: "log" });
    else obstacles.push({ x: W + 40, w: 30 * s, h: 30 * s, type: "bird", fly: GROUND - (90 + Math.random() * 50) * s });
    var gap = Math.max(0.55, 1.35 - (speed - START_SPEED) / 900);
    spawnIn = gap + Math.random() * 0.7;
  }

  function spawnCoin() {
    coins.push({ x: W + 30, y: GROUND - (60 + Math.random() * 120) * SCALE, r: 9 * SCALE, a: 0 });
    coinIn = 1 + Math.random() * 1.6;
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 300, life: 0.6, color: color });
    }
  }

  function update(dt) {
    t += dt;
    for (var p = particles.length - 1; p >= 0; p--) {
      var q = particles[p];
      q.life -= dt; q.vy += GRAVITY * 0.5 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.life <= 0) particles.splice(p, 1);
    }
    if (state !== "play") return;

    speed = Math.min(MAX_SPEED, speed + 9 * dt);
    distance += speed * dt;
    scoreEl.textContent = score();

    // player physics (y is the bottom of the body)
    var r = player.r * SCALE;
    if (!player.y) player.y = GROUND;
    player.vy += GRAVITY * SCALE * dt;
    player.y += player.vy * dt;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.jumps = 0; }

    spawnIn -= dt; if (spawnIn <= 0) spawnObstacle();
    coinIn -= dt; if (coinIn <= 0) spawnCoin();

    var x = px();
    var body = { x: x - r * 0.8, y: player.y - r * 1.7, w: r * 1.6, h: r * 1.6 };
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= speed * dt;
      if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
      var top = o.type === "bird" ? o.fly + Math.sin(t * 6) * 6 : GROUND - o.h;
      var box = { x: o.x + 3, y: top + 3, w: o.w - 6, h: (o.type === "bird" ? o.h : o.h) - 6 };
      if (hit(body, box)) return gameOver();
    }
    for (var c = coins.length - 1; c >= 0; c--) {
      var k = coins[c];
      k.x -= speed * dt; k.a += dt * 5;
      if (k.x < -20) { coins.splice(c, 1); continue; }
      var dx = k.x - x, dy = k.y - (player.y - r);
      if (dx * dx + dy * dy < (k.r + r) * (k.r + r)) {
        coins.splice(c, 1); bonus += 25; blip(980, 0.07, "triangle"); burst(k.x, k.y, "#ffd86b", 8);
      }
    }
  }

  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---- drawing ---------------------------------------------------------------
  function draw() {
    // sky
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1650"); g.addColorStop(0.6, "#7b2f63"); g.addColorStop(1, "#e1793a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // sun
    ctx.fillStyle = "rgba(255, 210, 120, .85)";
    ctx.beginPath(); ctx.arc(W * 0.78, GROUND - H * 0.32, Math.min(W, H) * 0.09, 0, Math.PI * 2); ctx.fill();

    // parallax hills
    var off = (distance * 0.2) % 260;
    ctx.fillStyle = "#4a1f4f";
    for (var i = 0; i < hills.length; i++) {
      var hx = i * 260 - off;
      ctx.beginPath(); ctx.ellipse(hx + 130, GROUND, 170, hills[i].h * SCALE, 0, Math.PI, 0); ctx.fill();
    }

    // ground with kente-style stripes
    ctx.fillStyle = "#3b1d16"; ctx.fillRect(0, GROUND, W, H - GROUND);
    var stripe = ["#f2b134", "#2e8b57", "#c0392b", "#111"];
    var so = distance % 48;
    for (var s = -1; s < W / 48 + 1; s++) {
      ctx.fillStyle = stripe[(s + Math.floor(distance / 48)) & 3];
      ctx.fillRect(s * 48 - so + 48, GROUND, 48, 8 * SCALE);
    }

    // coins (cowrie-gold)
    for (var c = 0; c < coins.length; c++) {
      var k = coins[c];
      ctx.save(); ctx.translate(k.x, k.y); ctx.scale(Math.abs(Math.cos(k.a)) * 0.6 + 0.4, 1);
      ctx.fillStyle = "#ffd86b"; ctx.beginPath(); ctx.arc(0, 0, k.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#b8862b"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }

    // obstacles
    for (var o = 0; o < obstacles.length; o++) drawObstacle(obstacles[o]);

    // player — Ananse the spider
    if (state !== "over" || particles.length) drawAnanse(px(), player.y || GROUND, player.r * SCALE);

    // particles
    for (var p = 0; p < particles.length; p++) {
      var q = particles[p];
      ctx.globalAlpha = Math.max(0, q.life / 0.6);
      ctx.fillStyle = q.color; ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawObstacle(o) {
    if (o.type === "pot") {
      var top = GROUND - o.h;
      ctx.fillStyle = "#a0522d";
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.25, top);
      ctx.lineTo(o.x + o.w * 0.75, top);
      ctx.quadraticCurveTo(o.x + o.w * 1.15, top + o.h * 0.55, o.x + o.w * 0.8, GROUND);
      ctx.lineTo(o.x + o.w * 0.2, GROUND);
      ctx.quadraticCurveTo(o.x - o.w * 0.15, top + o.h * 0.55, o.x + o.w * 0.25, top);
      ctx.fill();
      ctx.fillStyle = "#f2b134"; ctx.fillRect(o.x + o.w * 0.1, top + o.h * 0.45, o.w * 0.8, 3);
    } else if (o.type === "log") {
      ctx.fillStyle = "#6b3e1f"; roundRect(o.x, GROUND - o.h, o.w, o.h, 8); ctx.fill();
      ctx.fillStyle = "#8a5a33"; ctx.beginPath(); ctx.ellipse(o.x + o.w - 6, GROUND - o.h / 2, 6, o.h / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      var y = o.fly + Math.sin(t * 6) * 6;
      var flap = Math.sin(t * 18) * 8;
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, y + o.h / 2, o.w / 2, o.h / 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(o.x + 6, y + o.h / 2); ctx.lineTo(o.x + o.w / 2, y + o.h / 2 - 10 - flap); ctx.lineTo(o.x + o.w - 6, y + o.h / 2); ctx.fill();
      ctx.fillStyle = "#f2b134"; ctx.beginPath(); ctx.moveTo(o.x, y + o.h / 2); ctx.lineTo(o.x - 8, y + o.h / 2 + 3); ctx.lineTo(o.x, y + o.h / 2 + 6); ctx.fill();
    }
  }

  function drawAnanse(x, y, r) {
    var cy = y - r;
    var run = state === "play" && player.y >= GROUND ? Math.sin(t * 22) : 0.4;
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (var side = -1; side <= 1; side += 2) {
      for (var l = 0; l < 4; l++) {
        var ang = (l - 1.5) * 0.45, sw = (l % 2 ? run : -run) * 0.25;
        ctx.beginPath();
        ctx.moveTo(x + side * r * 0.5, cy + ang * r * 0.6);
        ctx.quadraticCurveTo(x + side * r * 1.4, cy - r * 0.6 + ang * r, x + side * r * (1.6 + sw), y + 1 - (l < 2 ? 0 : 2));
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    // kente band on the back
    ctx.fillStyle = "#f2b134"; ctx.fillRect(x - r * 0.8, cy - r * 0.25, r * 1.6, r * 0.22);
    ctx.fillStyle = "#2e8b57"; ctx.fillRect(x - r * 0.8, cy, r * 1.6, r * 0.15);
    // eyes
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + r * 0.35, cy - r * 0.45, r * 0.22, 0, Math.PI * 2); ctx.arc(x + r * 0.75, cy - r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x + r * 0.42, cy - r * 0.45, r * 0.1, 0, Math.PI * 2); ctx.arc(x + r * 0.8, cy - r * 0.35, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // pot of wisdom
    ctx.fillStyle = "#a0522d"; ctx.beginPath(); ctx.arc(x - r * 0.3, cy - r * 1.05, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2b134"; ctx.fillRect(x - r * 0.55, cy - r * 1.48, r * 0.5, r * 0.14);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---- loop ------------------------------------------------------------------
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === "menu") distance += 120 * dt; // idle scroll behind the menu
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
