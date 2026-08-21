/* =============================================================================
 * spin.js: a spin-½ on the Bloch sphere (VF.Spin)
 * -----------------------------------------------------------------------------
 * State |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩  ↔  Bloch vector
 *      r = (sin θ cos φ, sin θ sin φ, cos θ) = (⟨σx⟩, ⟨σy⟩, ⟨σz⟩).
 *
 * Under H = ½ Ω·σ (ħ = 1) the Heisenberg equations give the EXACT precession
 *      dr/dt = Ω × r    (Larmor),
 * which we integrate exactly with the Rodrigues rotation about Ω: the Bloch
 * vector never leaves the sphere, no drift.  Measurement of σ_a collapses the
 * state onto ±â with probability (1 ± r·â)/2.  Pure math, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function fromAngles(theta, phi) {
    return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
  }
  function angles(r) {
    var n = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2]) || 1;
    return { theta: Math.acos(Math.max(-1, Math.min(1, r[2] / n))), phi: Math.atan2(r[1], r[0]) };
  }
  /* amplitudes α = cos(θ/2), β = e^{iφ} sin(θ/2) */
  function amplitudes(r) {
    var a = angles(r), c = Math.cos(a.theta / 2), s = Math.sin(a.theta / 2);
    return { aRe: c, aIm: 0, bRe: s * Math.cos(a.phi), bIm: s * Math.sin(a.phi) };
  }
  /* exact precession r ← Rot(Ω, |Ω| dt) r  (reuses the Rodrigues matrix) */
  function precess(r, omega, dt) {
    var Rm = VF.Bodies.rodrigues(omega, dt);
    return [
      Rm[0][0] * r[0] + Rm[0][1] * r[1] + Rm[0][2] * r[2],
      Rm[1][0] * r[0] + Rm[1][1] * r[1] + Rm[1][2] * r[2],
      Rm[2][0] * r[0] + Rm[2][1] * r[1] + Rm[2][2] * r[2]
    ];
  }
  /* probabilities for measuring σ along the unit axis a: P(±) = (1 ± r·a)/2 */
  function prob(r, a) {
    var d = r[0] * a[0] + r[1] * a[1] + r[2] * a[2];
    return { up: (1 + d) / 2, dn: (1 - d) / 2 };
  }
  /* projective measurement along axis a with random draw u ∈ [0,1) */
  function measure(r, a, u) {
    var p = prob(r, a);
    return u < p.up ? { r: [a[0], a[1], a[2]], outcome: 1, p: p.up } : { r: [-a[0], -a[1], -a[2]], outcome: -1, p: p.dn };
  }

  VF.Spin = { fromAngles: fromAngles, angles: angles, amplitudes: amplitudes, precess: precess, prob: prob, measure: measure };

})(window.VF = window.VF || {});
