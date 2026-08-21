/* =============================================================================
 * rigid.js: torque-free rigid body / der kräftefreie Kreisel (VF.Rigid)
 * -----------------------------------------------------------------------------
 * Euler's equations in the body frame with principal moments I = (I₁,I₂,I₃):
 *      I ω̇ = (Iω) × ω        (torque-free)
 * integrated by RK4; the orientation R (body→space) follows via the exact
 * Rodrigues rotation about the midpoint ω, so R stays in SO(3).
 *
 * Invariants: kinetic energy 2T = ω·Iω and the angular momentum L = R·(Iω),
 * which is CONSTANT IN SPACE: its drift measures the integrator's honesty.
 * Stability (tennis-racket theorem): rotation about the axes with the largest
 * and smallest moment is stable, about the middle axis unstable: the
 * Dzhanibekov flip.  A box with these moments has half-sides
 * s_i = √(3(I_j + I_k − I_i)/2)  (m = 1), which the UI draws.
 * Pure math, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function deriv(I, w) {
    /* ω̇ = I⁻¹ ((Iω) × ω) */
    var L = [I[0] * w[0], I[1] * w[1], I[2] * w[2]];
    return [
      (L[1] * w[2] - L[2] * w[1]) / I[0],
      (L[2] * w[0] - L[0] * w[2]) / I[1],
      (L[0] * w[1] - L[1] * w[0]) / I[2]
    ];
  }

  /* one step: RK4 for ω, exact rotation for R (about the RK4-midpoint ω in body
     frame, mapped to space: R ← R·exp([ω]× dt)) */
  function step(I, w, R, dt) {
    var k1 = deriv(I, w);
    var w2 = [w[0] + dt / 2 * k1[0], w[1] + dt / 2 * k1[1], w[2] + dt / 2 * k1[2]];
    var k2 = deriv(I, w2);
    var w3 = [w[0] + dt / 2 * k2[0], w[1] + dt / 2 * k2[1], w[2] + dt / 2 * k2[2]];
    var k3 = deriv(I, w3);
    var w4 = [w[0] + dt * k3[0], w[1] + dt * k3[1], w[2] + dt * k3[2]];
    var k4 = deriv(I, w4);
    var wn = [
      w[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      w[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      w[2] + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
    ];
    var wm = [(w[0] + wn[0]) / 2, (w[1] + wn[1]) / 2, (w[2] + wn[2]) / 2];
    var Rn = VF.Bodies.mat3mul(R, VF.Bodies.rodrigues(wm, dt));
    return { w: wn, R: Rn };
  }

  function energy2T(I, w) { return I[0] * w[0] * w[0] + I[1] * w[1] * w[1] + I[2] * w[2] * w[2]; }
  function Lbody(I, w) { return [I[0] * w[0], I[1] * w[1], I[2] * w[2]]; }
  function Lspace(I, w, R) {
    var L = Lbody(I, w);
    return [
      R[0][0] * L[0] + R[0][1] * L[1] + R[0][2] * L[2],
      R[1][0] * L[0] + R[1][1] * L[1] + R[1][2] * L[2],
      R[2][0] * L[0] + R[2][1] * L[1] + R[2][2] * L[2]
    ];
  }
  /* box half-sides from the principal moments (m = 1): I_i = (s_j² + s_k²)/3 */
  function boxSides(I) {
    function s(a, b, c) { return Math.sqrt(Math.max(0.01, 3 * (b + c - a) / 2)); }
    return [s(I[0], I[1], I[2]), s(I[1], I[2], I[0]), s(I[2], I[0], I[1])];
  }

  VF.Rigid = { deriv: deriv, step: step, energy2T: energy2T, Lbody: Lbody, Lspace: Lspace, boxSides: boxSides };

})(window.VF = window.VF || {});
