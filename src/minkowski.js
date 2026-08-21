/* =============================================================================
 * minkowski.js: special-relativity kinematics for the Minkowski (spacetime) lab
 * -----------------------------------------------------------------------------
 * A Lorentz boost is a HYPERBOLIC ROTATION: the pseudo-Euclidean sibling of the
 * Matrix lab's rotation  R = exp(θ K).  Here the generator is symmetric, the
 * quadratic form preserved is  s² = (ct)² − x²  (not x² + y²), and cos/sin are
 * replaced by cosh/sinh.  Rapidity φ = artanh(β) plays the role of the angle and
 * *adds* under composition, which is exactly the relativistic velocity-addition
 * law in disguise.
 *
 * This module is pure math (no DOM, no Three.js): it exposes the kinematics and a
 * buildModel() that turns the current state into plain [x, ct] geometry for the
 * renderer to draw.  Kept ES5 / JScript-safe (hyperbolic fns via exp) so the
 * headless self-tests can exercise it.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* ---- hyperbolic helpers (exp-based → no dependency on Math.cosh/sinh) ---- */
  function cosh(x) { var e = Math.exp(x); return (e + 1 / e) / 2; }
  function sinh(x) { var e = Math.exp(x); return (e - 1 / e) / 2; }
  function tanh(x) { var e = Math.exp(2 * x); return (e - 1) / (e + 1); }
  function acosh(x) { return Math.log(x + Math.sqrt(x * x - 1)); }

  /* ---- kinematics --------------------------------------------------------- */
  function gamma(beta) { return 1 / Math.sqrt(1 - beta * beta); }
  function rapidity(beta) { return 0.5 * Math.log((1 + beta) / (1 - beta)); }   /* artanh(β) */
  function betaOf(phi) { return tanh(phi); }

  /* Lorentz boost of an event.  Frame S′ moves at velocity β (units of c) along
     +x relative to S.  (c = 1, so the time axis is ct.) */
  function toPrimed(x, ct, beta) {
    var g = gamma(beta);
    return { x: g * (x - beta * ct), ct: g * (ct - beta * x) };
  }
  function toUnprimed(xp, ctp, beta) {                     /* inverse boost (β → −β) */
    var g = gamma(beta);
    return { x: g * (xp + beta * ctp), ct: g * (ctp + beta * xp) };
  }
  function interval(x, ct) { return ct * ct - x * x; }     /* invariant s² = (ct)² − x² */
  function addVelocity(u, v) { return (u + v) / (1 + u * v); }   /* relativistic sum */

  /* Boost matrix acting on the column (ct, x):  Λ = exp(φK),  K = [[0,−1],[−1,0]].
     Λ = [[cosh φ, −sinh φ], [−sinh φ, cosh φ]],  det Λ = 1,  Λ preserves (ct)² − x². */
  function boostMatrix(phi) {
    var ch = cosh(phi), sh = sinh(phi);
    return [[ch, -sh], [-sh, ch]];
  }

  /* ---- geometry helpers (all in the (x, ct) plane) ------------------------ */
  /* Clip the infinite line  P + s·d  to the box [−H, H]².  Returns the two exit
     points [[x,ct],[x,ct]] or null if the line misses the box. */
  function clipLine(P, d, H) {
    var s0 = -Infinity, s1 = Infinity;
    for (var i = 0; i < 2; i++) {
      var p = P[i], v = d[i];
      if (Math.abs(v) < 1e-12) {
        if (p < -H || p > H) return null;                 /* parallel and outside the slab */
      } else {
        var ta = (-H - p) / v, tb = (H - p) / v;
        if (ta > tb) { var tmp = ta; ta = tb; tb = tmp; }
        if (ta > s0) s0 = ta;
        if (tb < s1) s1 = tb;
      }
    }
    if (s0 > s1) return null;
    return [[P[0] + s0 * d[0], P[1] + s0 * d[1]], [P[0] + s1 * d[0], P[1] + s1 * d[1]]];
  }

  /* Calibration hyperbola  (ct)² − x² = k²  (timelike, sign = ±1 for upper/lower)
     traced by rapidity ψ so it lands exactly on the box top/bottom. */
  function hyperTimelike(k, H, sign) {
    var M = acosh(Math.max(1, H / k)), pts = [], n = 56;
    for (var i = 0; i <= n; i++) { var psi = -M + 2 * M * i / n; pts.push([k * sinh(psi), sign * k * cosh(psi)]); }
    return pts;
  }
  /* Spacelike calibration  x² − (ct)² = k²  (sign = ±1 for right/left). */
  function hyperSpacelike(k, H, sign) {
    var M = acosh(Math.max(1, H / k)), pts = [], n = 56;
    for (var i = 0; i <= n; i++) { var psi = -M + 2 * M * i / n; pts.push([sign * k * cosh(psi), k * sinh(psi)]); }
    return pts;
  }

  /* ---- build the full diagram model from the current state ---------------- */
  function buildModel(params) {
    var H = params.half, b = Math.max(-0.98, Math.min(0.98, params.beta));
    var phi = rapidity(b), g = gamma(b), ch = cosh(phi), sh = sinh(phi);
    var floor = Math.max(1, Math.floor(H));
    var m = {
      half: H, beta: b, phi: phi, gamma: g, sinh: sh,
      lab: { ct: clipLine([0, 0], [0, 1], H), x: clipLine([0, 0], [1, 0], H), ticks: [] },
      light: [], hyper: [], simul: [], grid: [],
      primed: null, primedTicks: [], worldlines: [], events: [], paths: [], cone: null
    };

    /* integer scale ticks on the lab axes */
    for (var n = 1; n <= floor; n++) { m.lab.ticks.push({ x: 0, ct: n }, { x: 0, ct: -n }, { x: n, ct: 0 }, { x: -n, ct: 0 }); }

    /* light lines ct = ±x (the invariant 45° cone) */
    if (params.showLight !== false) { m.light.push(clipLine([0, 0], [1, 1], H), clipLine([0, 0], [1, -1], H)); }

    /* causal-region shading: future/past light cones are triangles in the box */
    if (params.showLightCone) { m.cone = { future: [[0, 0], [-H, H], [H, H]], past: [[0, 0], [-H, -H], [H, -H]] }; }

    /* calibration hyperbolae s² = ±k²  (keep k strictly inside the box so the
       outermost branch doesn't collapse to a point on the boundary) */
    if (params.showHyper) {
      var kmax = Math.min(6, Math.max(1, Math.floor(H - 0.001)));
      for (var k = 1; k <= kmax; k++) {
        m.hyper.push(hyperTimelike(k, H, 1), hyperTimelike(k, H, -1), hyperSpacelike(k, H, 1), hyperSpacelike(k, H, -1));
      }
    }

    /* primed (moving-frame) axes: ct′ ∝ (sinh φ, cosh φ), x′ ∝ (cosh φ, sinh φ) */
    if (params.showPrimed) {
      m.primed = { ct: clipLine([0, 0], [sh, ch], H), x: clipLine([0, 0], [ch, sh], H) };
      for (var u = 1; u <= floor; u++) {
        pushTick(m.primedTicks, [u * sh, u * ch], 'ct', H); pushTick(m.primedTicks, [-u * sh, -u * ch], 'ct', H);
        pushTick(m.primedTicks, [u * ch, u * sh], 'x', H); pushTick(m.primedTicks, [-u * ch, -u * sh], 'x', H);
      }
    }

    /* lines of simultaneity in S′ (ct′ = const): parallel to the x′ axis */
    if (params.showSimul && params.showPrimed) {
      for (var s = -floor; s <= floor; s++) {
        if (s === 0) continue;
        var seg = clipLine([s * sh, s * ch], [ch, sh], H);
        if (seg) m.simul.push(seg);
      }
    }

    /* faint lab coordinate grid */
    if (params.showGrid) {
      for (var gi = -floor; gi <= floor; gi++) {
        var v = clipLine([gi, 0], [0, 1], H), h = clipLine([0, gi], [1, 0], H);
        if (v) m.grid.push(v); if (h) m.grid.push(h);
      }
    }

    /* worldlines: constant-velocity particle through (x0, 0), direction (β_p, 1) */
    var wl = params.worldlines || [];
    for (var wi = 0; wi < wl.length; wi++) {
      var w = wl[wi], bp = Math.max(-0.995, Math.min(0.995, w.beta));
      var wseg = clipLine([w.x0 || 0, 0], [bp, 1], H);
      if (wseg) m.worldlines.push({ seg: wseg, color: w.color, label: w.label, beta: bp, dir: [bp, 1] });
    }

    /* piecewise worldlines / paths (e.g. the twin's bent route) */
    var pa = params.paths || [];
    for (var pi = 0; pi < pa.length; pi++) { m.paths.push({ pts: pa[pi].pts.slice(), color: pa[pi].color, label: pa[pi].label }); }

    /* events, with their coordinates in the moving frame and the invariant s² */
    var ev = params.events || [];
    for (var ei = 0; ei < ev.length; ei++) {
      var e = ev[ei], pr = toPrimed(e.x, e.ct, b);
      m.events.push({ x: e.x, ct: e.ct, color: e.color, label: e.label, xp: pr.x, ctp: pr.ct, s2: interval(e.x, e.ct) });
    }
    return m;
  }

  function pushTick(list, p, kind, H) { if (Math.abs(p[0]) <= H + 1e-9 && Math.abs(p[1]) <= H + 1e-9) list.push({ p: p, kind: kind }); }

  VF.Mink = {
    cosh: cosh, sinh: sinh, tanh: tanh,
    gamma: gamma, rapidity: rapidity, betaOf: betaOf,
    toPrimed: toPrimed, toUnprimed: toUnprimed, interval: interval, addVelocity: addVelocity,
    boostMatrix: boostMatrix, clipLine: clipLine, buildModel: buildModel
  };

})(window.VF = window.VF || {});
