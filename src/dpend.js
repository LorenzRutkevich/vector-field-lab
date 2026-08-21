/* =============================================================================
 * dpend.js: the double pendulum, deterministic chaos (VF.Dpend)
 * -----------------------------------------------------------------------------
 * Two rods (m₁, m₂, l₁, l₂, gravity g), angles from the vertical.  Standard
 * equations of motion, RK4 on (θ₁, ω₁, θ₂, ω₂).  Energy
 *     T = ½m₁l₁²ω₁² + ½m₂(l₁²ω₁² + l₂²ω₂² + 2l₁l₂ω₁ω₂cos(θ₁−θ₂))
 *     V = −(m₁+m₂) g l₁ cos θ₁ − m₂ g l₂ cos θ₂
 * is conserved and audits the integrator.  For small angles (m₁=m₂, l₁=l₂)
 * the normal modes have ω² = (2 ± √2)·g/l: the bridge to the Modes lab.
 * Chaos shows as exponential divergence of twin trajectories and as the
 * dissolving structure of the Poincaré section (θ₁ = 0 upward crossings).
 * Pure math, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function deriv(P, s) {
    var m1 = P.m1, m2 = P.m2, l1 = P.l1, l2 = P.l2, g = P.g;
    var d = s[0] - s[2], sd = Math.sin(d), cd = Math.cos(d);
    var den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
    var a1 = (-g * (2 * m1 + m2) * Math.sin(s[0]) - m2 * g * Math.sin(s[0] - 2 * s[2])
      - 2 * sd * m2 * (s[3] * s[3] * l2 + s[1] * s[1] * l1 * cd)) / (l1 * den);
    var a2 = (2 * sd * (s[1] * s[1] * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(s[0])
      + s[3] * s[3] * l2 * m2 * cd)) / (l2 * den);
    return [s[1], a1, s[3], a2];
  }
  function step(P, s, dt) {
    function ax(a, h, k) { return [a[0] + h * k[0], a[1] + h * k[1], a[2] + h * k[2], a[3] + h * k[3]]; }
    var k1 = deriv(P, s), k2 = deriv(P, ax(s, dt / 2, k1)), k3 = deriv(P, ax(s, dt / 2, k2)), k4 = deriv(P, ax(s, dt, k3));
    return [
      s[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      s[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      s[2] + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      s[3] + dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])
    ];
  }
  function energy(P, s) {
    var m1 = P.m1, m2 = P.m2, l1 = P.l1, l2 = P.l2, g = P.g, cd = Math.cos(s[0] - s[2]);
    var T = 0.5 * m1 * l1 * l1 * s[1] * s[1]
      + 0.5 * m2 * (l1 * l1 * s[1] * s[1] + l2 * l2 * s[3] * s[3] + 2 * l1 * l2 * s[1] * s[3] * cd);
    var Vv = -(m1 + m2) * g * l1 * Math.cos(s[0]) - m2 * g * l2 * Math.cos(s[2]);
    return T + Vv;
  }
  function tips(P, s) {
    var x1 = P.l1 * Math.sin(s[0]), y1 = -P.l1 * Math.cos(s[0]);
    return { x1: x1, y1: y1, x2: x1 + P.l2 * Math.sin(s[2]), y2: y1 - P.l2 * Math.cos(s[2]) };
  }
  /* phase-space distance between twin states (angles wrapped) */
  function dist(a, b) {
    function wrap(x) { return Math.atan2(Math.sin(x), Math.cos(x)); }
    var d0 = wrap(a[0] - b[0]), d1 = a[1] - b[1], d2 = wrap(a[2] - b[2]), d3 = a[3] - b[3];
    return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3);
  }

  VF.Dpend = { deriv: deriv, step: step, energy: energy, tips: tips, dist: dist };

})(window.VF = window.VF || {});
