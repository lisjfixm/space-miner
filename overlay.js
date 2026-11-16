/*
 * Space Miner C - optional overlay: touch-friendly helpers + minimal autopilot.
 *
 * This file sits outside the Defold bundle. It only:
 *  - forwards synthetic keyboard events to the existing engine input handlers,
 *  - exposes a manual toggle for a rule-based vision autopilot (experimental).
 *
 * The compiled game state cannot be read from outside; the autopilot sees the
 * WebGL frame through readPixels and steers toward the nearest detected target.
 * It is a heuristic prototype, not a trained AI.
 */
(function () {
  "use strict";

  // ---- Tunable detection thresholds (adjust after real-machine sampling) ----
  var CFG = {
    sampleStep: 4,          // pixel stride when scanning the frame
    yellow: { r: 200, g: 170, b: 110 }, // miner / coin bright yellow (excludes rocket orange)
    hudTop: 0.18,           // exclude top HUD strip
    hudRight: 0.22,         // exclude right HUD strip
    deadZone: 12,           // px dead zone around the target
    minCluster: 6,          // min sampled pixels to count as a cluster
    cell: 16                // clustering grid cell size in px
  };

  var KEYS = {
    left:  { key: "a", code: "KeyA", keyCode: 65 },
    right: { key: "d", code: "KeyD", keyCode: 68 },
    up:    { key: "w", code: "KeyW", keyCode: 87 },
    down:  { key: "s", code: "KeyS", keyCode: 83 }
  };

  var canvas = null;
  var gl = null;
  var held = {};
  var enabled = false;
  var rafId = 0;
  var btn = null;
  var statusEl = null;

  function canvasEl() {
    if (!canvas) canvas = document.getElementById("canvas");
    return canvas;
  }

  function makeKeyEvent(type, k) {
    var e = new KeyboardEvent(type, { key: k.key, code: k.code, bubbles: true, cancelable: true });
    Object.defineProperty(e, "keyCode", { value: k.keyCode });
    Object.defineProperty(e, "which", { value: k.keyCode });
    return e;
  }

  function press(action) {
    if (held[action]) return;
    var k = KEYS[action];
    if (!k) return;
    var c = canvasEl();
    if (c) c.dispatchEvent(makeKeyEvent("keydown", k));
    held[action] = true;
  }

  function release(action) {
    if (!held[action]) return;
    var k = KEYS[action];
    var c = canvasEl();
    if (c && k) c.dispatchEvent(makeKeyEvent("keyup", k));
    held[action] = false;
  }

  function releaseAll() {
    Object.keys(held).forEach(release);
  }

  function getGL() {
    if (gl) return gl;
    var c = canvasEl();
    if (!c) return null;
    gl = c.getContext("webgl2") || c.getContext("webgl");
    return gl;
  }

  // ---- Vision: cluster yellow pixels, miner = largest, target = nearest other ----
  function scanTargets() {
    var c = canvasEl();
    var g = getGL();
    if (!c || !g) return null;

    var w = c.width, h = c.height;
    var buf = new Uint8Array(w * h * 4);
    g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, buf);

    var step = CFG.sampleStep;
    var y0 = Math.floor(h * CFG.hudTop);
    var xr = Math.floor(w * (1 - CFG.hudRight));
    var grid = {};

    for (var y = y0; y < h; y += step) {
      for (var x = 0; x < xr; x += step) {
        var i = (y * w + x) * 4;
        var r = buf[i], gg = buf[i + 1], b = buf[i + 2];
        if (r >= CFG.yellow.r && gg >= CFG.yellow.g && b <= CFG.yellow.b) {
          var cx = Math.floor(x / CFG.cell), cy = Math.floor(y / CFG.cell);
          var id = cx + ":" + cy;
          if (!grid[id]) grid[id] = { x: 0, y: 0, n: 0 };
          var cl = grid[id];
          cl.x += x; cl.y += y; cl.n += 1;
        }
      }
    }

    var clusters = [];
    Object.keys(grid).forEach(function (id) {
      var cl = grid[id];
      if (cl.n >= CFG.minCluster) {
        clusters.push({ x: cl.x / cl.n, y: cl.y / cl.n, n: cl.n });
      }
    });
    if (!clusters.length) return null;

    clusters.sort(function (a, b) { return b.n - a.n; });
    var miner = clusters[0];
    var target = null, best = Infinity;
    for (var t = 1; t < clusters.length; t += 1) {
      var dx = clusters[t].x - miner.x, dy = clusters[t].y - miner.y;
      var d = dx * dx + dy * dy;
      if (d < best) { best = d; target = clusters[t]; }
    }
    return { miner: miner, target: target, count: clusters.length };
  }

  function steer(state) {
    release("left"); release("right"); release("up"); release("down");
    if (!state || !state.target) return;
    var dx = state.target.x - state.miner.x;
    var dy = state.target.y - state.miner.y;
    if (dx > CFG.deadZone) press("right");
    else if (dx < -CFG.deadZone) press("left");
    if (dy > CFG.deadZone) press("down");
    else if (dy < -CFG.deadZone) press("up");
  }

  function setStatus(state) {
    if (!statusEl) return;
    if (!state) { statusEl.textContent = "scanning"; return; }
    if (!state.target) { statusEl.textContent = "target: none"; return; }
    statusEl.textContent = "target " + Math.round(state.target.x) + "," + Math.round(state.target.y);
  }

  function loop() {
    if (!enabled) return;
    try {
      var state = scanTargets();
      steer(state);
      setStatus(state);
    } catch (e) {
      if (statusEl) statusEl.textContent = "bot error: " + e.message;
    }
    rafId = requestAnimationFrame(loop);
  }

  function buildUI() {
    var style = document.createElement("style");
    style.textContent =
      "#sm-bot-toggle{position:fixed;top:10px;left:10px;z-index:9999;" +
      "font-family:sans-serif;font-size:13px;color:#fafcff;background:rgba(30,34,38,.75);" +
      "border:1px solid #394046;border-radius:6px;padding:8px 12px;cursor:pointer;}" +
      "#sm-bot-status{position:fixed;top:44px;left:10px;z-index:9999;font-family:sans-serif;" +
      "font-size:11px;color:#c8d0d6;background:rgba(30,34,38,.6);border-radius:4px;padding:4px 8px;}";
    document.head.appendChild(style);

    btn = document.createElement("button");
    btn.id = "sm-bot-toggle";
    btn.textContent = "Auto: Off";
    btn.addEventListener("click", function () {
      enabled = !enabled;
      if (enabled) {
        btn.textContent = "Auto: On";
        rafId = requestAnimationFrame(loop);
      } else {
        btn.textContent = "Auto: Off";
        releaseAll();
        cancelAnimationFrame(rafId);
        if (statusEl) statusEl.textContent = "";
      }
    });
    document.body.appendChild(btn);

    statusEl = document.createElement("div");
    statusEl.id = "sm-bot-status";
    document.body.appendChild(statusEl);
  }

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", buildUI);
    } else {
      buildUI();
    }
  }

  init();
})();
