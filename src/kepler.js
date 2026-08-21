/* =============================================================================
 * kepler.js: central-force orbits (VF.Kepler)
 * -----------------------------------------------------------------------------
 * A unit mass in the plane under F = −k r̂ / r^p (p = 2 is gravity/Coulomb).
 * RK4 on (x, y, vx, vy).  Conserved: E = ½v² + V(r) with V = −k/((p−1) r^{p−1}),
 * L = x v_y − y v_x, and (ONLY for p = 2) the Laplace–Runge–Lenz vector
 *      A = v × L − k r̂ ,
 * which pins the ellipse's orientation: e = |A|/k, a = −k/(2E), T = 2π√(a³/k).
 * For p ≠ 2 the LRL vector drifts and the perihelion PRECESSES (Bertrand's
 * theorem: only p = 2 and the harmonic force close all bound orbits).
 * Kepler's 2nd law is dA/dt = L/2 for ANY central force.  Pure math, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function accel(k, p, x, y) {
    var r = Math.sqrt(x * x + y * y);
    if (r < 1e-9) return [0, 0];
    var f = -k / Math.pow(r, p + 1);   /* −k/r^p in the r̂ direction */
    return [f * x, f * y];
  }
  function step(k, p, s, dt) {
    var a1 = accel(k, p, s.x, s.y);
    var x2 = s.x + dt / 2 * s.vx, y2 = s.y + dt / 2 * s.vy, vx2 = s.vx + dt / 2 * a1[0], vy2 = s.vy + dt / 2 * a1[1];
    var a2 = accel(k, p, x2, y2);
    var x3 = s.x + dt / 2 * vx2, y3 = s.y + dt / 2 * vy2, vx3 = s.vx + dt / 2 * a2[0], vy3 = s.vy + dt / 2 * a2[1];
    var a3 = accel(k, p, x3, y3);
    var x4 = s.x + dt * vx3, y4 = s.y + dt * vy3, vx4 = s.vx + dt * a3[0], vy4 = s.vy + dt * a3[1];
    var a4 = accel(k, p, x4, y4);
    return {
      x: s.x + dt / 6 * (s.vx + 2 * vx2 + 2 * vx3 + vx4),
      y: s.y + dt / 6 * (s.vy + 2 * vy2 + 2 * vy3 + vy4),
      vx: s.vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]),
      vy: s.vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1])
    };
  }
  function V(k, p, r) { return p === 1 ? k * Math.log(r) : -k / ((p - 1) * Math.pow(r, p - 1)); }
  function invariants(k, p, s) {
    var r = Math.sqrt(s.x * s.x + s.y * s.y);
    var E = 0.5 * (s.vx * s.vx + s.vy * s.vy) + V(k, p, r);
    var L = s.x * s.vy - s.y * s.vx;
    /* LRL (meaningful for p = 2): A = v × L − k r̂ with L = L ẑ */
    var Ax = s.vy * L - k * s.x / r, Ay = -s.vx * L - k * s.y / r;
    var out = { E: E, L: L, r: r, Ax: Ax, Ay: Ay, Amag: Math.sqrt(Ax * Ax + Ay * Ay) };
    if (p === 2 && E < 0) {
      out.a = -k / (2 * E);
      out.e = out.Amag / k;
      out.T = 2 * Math.PI * Math.sqrt(out.a * out.a * out.a / k);
    } else if (p === 2) out.e = out.Amag / k;   /* ≥ 1: parabola/hyperbola */
    return out;
  }
  function veff(k, p, L, r) { return L * L / (2 * r * r) + V(k, p, r); }

  VF.Kepler = { accel: accel, step: step, V: V, invariants: invariants, veff: veff };

})(window.VF = window.VF || {});
