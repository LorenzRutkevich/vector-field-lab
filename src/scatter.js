/* =============================================================================
 * scatter.js: classical scattering off a central potential (VF.Scatter)
 * -----------------------------------------------------------------------------
 * A beam of particles (m = 1, energy E = ½v∞², impact parameter b) hits a
 * central potential V(r).  Two independent computations:
 *
 * 1. The EXACT deflection function from the classical scattering integral
 *    (energy & angular-momentum conservation, u = 1/r):
 *
 *        Θ(b) = π − 2 ∫₀^{u_max} b du / √(g(u)),   g(u) = 1 − b²u² − V(1/u)/E,
 *
 *    where u_max is the first positive root of g (the turning point r_min).
 *    The integrand has a 1/√ singularity at u_max; the substitution
 *    u = u_max(1 − t²) removes it exactly, so a plain midpoint rule converges.
 *    No root up to r ≈ 0 means the particle falls into the centre (capture).
 *
 * 2. RK4 trajectories in the scattering plane, ẍ = −V'(r)·x̂, for the beam
 *    picture (with true timestamps: particles slow near the turning point).
 *    Their asymptotic deflection must agree with (1), and is unit-tested to.
 *
 * The differential cross-section follows from the Jacobian of b → θ:
 *
 *        dσ/dΩ = (b / sin θ) · |db/dθ|,      θ = folded |Θ| ∈ (0, π].
 *
 * Closed forms used as ground truth in tests:
 *   Rutherford  V = k/r:      Θ(b) = 2·atan(k/(2Eb)),  dσ/dΩ = (k/4E)²/sin⁴(θ/2)
 *   hard sphere V = ∞·(r<R):  θ(b) = π − 2·asin(b/R),  dσ/dΩ = R²/4
 * Pure math, no DOM/three.js.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* deflection by the scattering integral.  Vfn(r) -> V.  Returns
     { ok, capture, theta (signed total deflection Θ), rmin } */
  function deflection(Vfn, E, b) {
    function g(u) { return 1 - b * b * u * u - Vfn(1 / u) / E; }
    if (!(b > 0) || !(E > 0)) return { ok: false };
    if (g(1e-8) <= 0) return { ok: false, noBeam: true };      /* V(∞) ≥ E: no free beam */
    /* first positive root of g: linear scan + bisection */
    var U_CAP = 100, NS = 4000, du = U_CAP / NS, ua = 1e-8, ub = 0, i;
    var found = false;
    for (i = 1; i <= NS; i++) {
      var u = i * du;
      if (g(u) <= 0) { ub = u; found = true; break; }
      ua = u;
    }
    if (!found) return { ok: true, capture: true, theta: NaN, rmin: 0 };
    for (i = 0; i < 80; i++) {
      var um = (ua + ub) / 2;
      if (g(um) > 0) ua = um; else ub = um;
    }
    var umax = (ua + ub) / 2;
    /* φ∞ = ∫₀^{umax} b du/√g  with  u = umax(1 − t²)  (kills the √ singularity) */
    var N = 800, phi = 0;
    for (i = 0; i < N; i++) {
      var t = (i + 0.5) / N;
      var uu = umax * (1 - t * t);
      var gg = g(uu);
      if (gg < 1e-14) gg = 1e-14;
      phi += 2 * b * umax * t / Math.sqrt(gg);
    }
    phi /= N;
    return { ok: true, capture: false, theta: Math.PI - 2 * phi, rmin: 1 / umax };
  }

  /* fold a signed total deflection into a detector angle θ ∈ [0, π] */
  function fold(theta) {
    var t = Math.abs(theta) % (2 * Math.PI);
    return t > Math.PI ? 2 * Math.PI - t : t;
  }

  /* Θ(b) on a grid: the deflection function */
  function thetaOfB(Vfn, E, bmax, n) {
    n = n || 120;
    var bs = [], th = [], caps = 0, i;
    for (i = 1; i <= n; i++) {
      var b = bmax * i / n;
      var d = deflection(Vfn, E, b);
      if (!d.ok || d.capture) { caps += d.capture ? 1 : 0; bs.push(b); th.push(NaN); continue; }
      bs.push(b); th.push(d.theta);
    }
    return { bs: bs, th: th, captured: caps };
  }

  /* dσ/dΩ = (b/sinθ)|db/dθ| pointwise from the deflection grid (branches show
     up as separate curve pieces; a rainbow extremum → a genuine spike) */
  function crossSection(tb) {
    var bs = tb.bs, th = tb.th, n = bs.length, theta = [], ds = [], i;
    for (i = 1; i < n - 1; i++) {
      if (!isFinite(th[i - 1]) || !isFinite(th[i]) || !isFinite(th[i + 1])) continue;
      var dtdb = (fold(th[i + 1]) - fold(th[i - 1])) / (bs[i + 1] - bs[i - 1]);
      var t = fold(th[i]), s = Math.sin(t);
      if (Math.abs(dtdb) < 1e-12 || s < 1e-6) continue;
      theta.push(t);
      ds.push(bs[i] / (s * Math.abs(dtdb)));
    }
    return { theta: theta, ds: ds };
  }

  /* RK4 trajectory in the scattering plane; returns points + true timestamps */
  function trajectory(Vfn, E, b, opts) {
    opts = opts || {};
    var R0 = opts.R0 || 30, hb = opts.h || 0.05, maxSteps = opts.maxSteps || 8000;
    var vinf = Math.sqrt(2 * E), eps = 1e-4;
    function acc(x, y) {
      var r = Math.sqrt(x * x + y * y);
      if (r < 1e-6) return [0, 0];
      var Vp = (Vfn(r + eps) - Vfn(r - eps)) / (2 * eps);
      return [-Vp * x / r, -Vp * y / r];
    }
    var x = -R0, y = b, vx = vinf, vy = 0, t = 0;
    var pts = [[x, y]], ts = [0], captured = false, i;
    for (i = 0; i < maxSteps; i++) {
      var r = Math.sqrt(x * x + y * y);
      if (r < 0.02) { captured = true; break; }
      if (r > R0 * 1.02 && x * vx + y * vy > 0) break;
      var sp = Math.sqrt(vx * vx + vy * vy);
      var h = hb * Math.max(0.06, Math.min(1, r / 2)) / Math.max(1, sp);
      var a1 = acc(x, y);
      var x2 = x + h / 2 * vx, y2 = y + h / 2 * vy, vx2 = vx + h / 2 * a1[0], vy2 = vy + h / 2 * a1[1];
      var a2 = acc(x2, y2);
      var x3 = x + h / 2 * vx2, y3 = y + h / 2 * vy2, vx3 = vx + h / 2 * a2[0], vy3 = vy + h / 2 * a2[1];
      var a3 = acc(x3, y3);
      var x4 = x + h * vx3, y4 = y + h * vy3, vx4 = vx + h * a3[0], vy4 = vy + h * a3[1];
      var a4 = acc(x4, y4);
      x += h / 6 * (vx + 2 * vx2 + 2 * vx3 + vx4);
      y += h / 6 * (vy + 2 * vy2 + 2 * vy3 + vy4);
      vx += h / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
      vy += h / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
      t += h;
      pts.push([x, y]); ts.push(t);
    }
    return { pts: pts, ts: ts, T: t, captured: captured, theta: Math.atan2(vy, vx), vEnd: [vx, vy] };
  }

  /* dσ/dΩ for ONE impact parameter, from a local derivative of the exact
     deflection integral:  dσ/dΩ = (b/sinθ)·|db/dθ|.  This is the per-ray
     Wirkungsquerschnitt (independent of any plotting grid). */
  function dSigma(Vfn, E, b, db) {
    db = db || Math.max(1e-3, 0.002 * b);
    var d0 = deflection(Vfn, E, b), dp = deflection(Vfn, E, b + db), dm = deflection(Vfn, E, b - db);
    if (!d0.ok || d0.capture || !dp.ok || dp.capture || !dm.ok || dm.capture) return { ok: false };
    var dtdb = (fold(dp.theta) - fold(dm.theta)) / (2 * db);
    var th = fold(d0.theta), s = Math.sin(th);
    if (Math.abs(dtdb) < 1e-12 || s < 1e-9) return { ok: false, theta: th };
    return { ok: true, theta: th, Theta: d0.theta, rmin: d0.rmin, dtdb: dtdb, ds: b / (s * Math.abs(dtdb)) };
  }

  /* head-on closest approach r₀: V(r₀) = E (how Rutherford sized the nucleus).
     Returns 0 if the potential never rises to E on the way in. */
  function headOn(Vfn, E, R) {
    R = R || 50;
    if (Vfn(R) >= E) return NaN;
    var lo = 1e-4, hi = R, i;
    if (Vfn(lo) < E) return 0;
    for (i = 0; i < 80; i++) {
      var m = (lo + hi) / 2;
      if (Vfn(m) >= E) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }

  VF.Scatter = { deflection: deflection, fold: fold, thetaOfB: thetaOfB, crossSection: crossSection, dSigma: dSigma, trajectory: trajectory, headOn: headOn };

})(window.VF = window.VF || {});
