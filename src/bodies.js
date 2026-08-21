/* =============================================================================
 * bodies.js: test bodies dropped into a vector field (VF.Bodies)
 * -----------------------------------------------------------------------------
 * Two physical readings of the same field F(x,y,z,t):
 *
 *  FLOW: F is a velocity field v(x).  A small body is advected, ẋ = v(x),
 *  and by the Cauchy–Stokes decomposition ∇v = D + W (symmetric strain rate D,
 *  antisymmetric spin W) a small RIGID probe rotates with the local angular
 *  velocity  ω = ½ ∇×v,  while a MATERIAL element carries the deformation
 *  gradient  Ȧ = (∇v)·A  (so shear and stretch accumulate in A) and its volume
 *  is det A, which obeys  d(det A)/dt = (∇·v)·det A.
 *
 *  FORCE: F is a force field.  A point mass obeys Newton,  m ẍ = F(x).
 *  Its orientation never changes: the curl of a force field measures
 *  non-conservativity (path-dependent work), not rotation of the body.
 *
 * Integration: RK4 for x (and v in force mode).  The orientation R is updated
 * with the exact rotation exp([ω]×h) (Rodrigues) using ω at the midpoint
 * stages, so R stays exactly orthogonal: no drift, no renormalisation.
 * A is integrated by RK4 with the velocity gradient evaluated at the RK4
 * stage positions.  Pure math, no DOM/three.js: unit-testable in tests.js.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var JH = 1e-3;   /* finite-difference step for the velocity gradient */

  /* L[i][j] = ∂F_i/∂x_j by central differences (same convention as fieldmath) */
  function jacobian(F, p, t, h) {
    h = h || JH;
    var L = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var j = 0; j < 3; j++) {
      var pp = p.slice(), pm = p.slice();
      pp[j] += h; pm[j] -= h;
      var Fp = F(pp[0], pp[1], pp[2], t), Fm = F(pm[0], pm[1], pm[2], t);
      for (var i = 0; i < 3; i++) L[i][j] = (Fp[i] - Fm[i]) / (2 * h);
    }
    return L;
  }
  function curlOf(L) { return [L[2][1] - L[1][2], L[0][2] - L[2][0], L[1][0] - L[0][1]]; }
  function divOf(L) { return L[0][0] + L[1][1] + L[2][2]; }

  /* ---- small 3×3 helpers --------------------------------------------------- */
  function ident3() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
  function mat3mul(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 3; j++)
        C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    return C;
  }
  function mat3det(A) {
    return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
         - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
         + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  }
  function mat3axpy(A, s, B) {          /* A + s·B, no aliasing worries */
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][j] + s * B[i][j];
    return C;
  }

  /* exp([w]× dt) via Rodrigues: the exact rotation by angle |w|·dt about ŵ */
  function rodrigues(w, dt) {
    var th = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]) * dt;
    if (!(th > 1e-14)) return ident3();
    var n = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]);
    var kx = w[0] / n, ky = w[1] / n, kz = w[2] / n;
    var c = Math.cos(th), s = Math.sin(th), o = 1 - c;
    return [
      [c + kx * kx * o,      kx * ky * o - kz * s,  kx * kz * o + ky * s],
      [ky * kx * o + kz * s, c + ky * ky * o,       ky * kz * o - kx * s],
      [kz * kx * o - ky * s, kz * ky * o + kx * s,  c + kz * kz * o]
    ];
  }

  /* a fresh body: position + identity orientation R, deformation gradient A,
     isotropic volume factor s, and (force mode) velocity */
  function makeBody(pos, vel) {
    return { x: pos.slice(), vel: (vel || [0, 0, 0]).slice(), R: ident3(), A: ident3(), s: 1 };
  }

  /* ---- one FLOW step:  ẋ = F,  R ← exp([ω]×h)R,  Ȧ = L·A,  ṡ = s·(∇·F)/3 --- */
  function stepFlow(F, b, t, h) {
    function f(p, tt) { return F(p[0], p[1], p[2], tt); }
    var x = b.x, i;
    var k1 = f(x, t);
    var x2 = [x[0] + h / 2 * k1[0], x[1] + h / 2 * k1[1], x[2] + h / 2 * k1[2]];
    var k2 = f(x2, t + h / 2);
    var x3 = [x[0] + h / 2 * k2[0], x[1] + h / 2 * k2[1], x[2] + h / 2 * k2[2]];
    var k3 = f(x3, t + h / 2);
    var x4 = [x[0] + h * k3[0], x[1] + h * k3[1], x[2] + h * k3[2]];
    var k4 = f(x4, t + h);
    var xn = [0, 0, 0];
    for (i = 0; i < 3; i++) xn[i] = x[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);

    /* velocity gradient at the four stage positions */
    var L1 = jacobian(F, x, t), L2 = jacobian(F, x2, t + h / 2),
        L3 = jacobian(F, x3, t + h / 2), L4 = jacobian(F, x4, t + h);
    var Lm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];                   /* midpoint gradient */
    for (i = 0; i < 3; i++) for (var j = 0; j < 3; j++) Lm[i][j] = 0.5 * (L2[i][j] + L3[i][j]);

    /* rigid orientation: exact rotation with the midpoint angular velocity */
    var cm = curlOf(Lm);
    var w = [cm[0] / 2, cm[1] / 2, cm[2] / 2];
    b.R = mat3mul(rodrigues(w, h), b.R);

    /* deformation gradient: RK4 on Ȧ = L(x(t))·A */
    var kA1 = mat3mul(L1, b.A);
    var kA2 = mat3mul(L2, mat3axpy(b.A, h / 2, kA1));
    var kA3 = mat3mul(L3, mat3axpy(b.A, h / 2, kA2));
    var kA4 = mat3mul(L4, mat3axpy(b.A, h, kA3));
    for (i = 0; i < 3; i++) for (var j2 = 0; j2 < 3; j2++)
      b.A[i][j2] += h / 6 * (kA1[i][j2] + 2 * kA2[i][j2] + 2 * kA3[i][j2] + kA4[i][j2]);

    /* isotropic volume proxy for the rigid view: ṡ/s = (∇·F)/3 */
    var dv = divOf(Lm);
    b.s *= Math.exp(dv * h / 3);
    b.x = xn;
    return { v: f(xn, t + h), w: w, div: dv, detA: mat3det(b.A) };
  }

  /* ---- one FORCE step:  ẋ = v,  v̇ = F(x)/m  (RK4 on the 6-dim state) ------ */
  function stepForce(F, b, t, h, m) {
    m = m || 1;
    function a(p, tt) {
      var Fv = F(p[0], p[1], p[2], tt);
      return [Fv[0] / m, Fv[1] / m, Fv[2] / m];
    }
    var x = b.x, v = b.vel, i;
    var a1 = a(x, t);
    var x2 = [x[0] + h / 2 * v[0], x[1] + h / 2 * v[1], x[2] + h / 2 * v[2]];
    var v2 = [v[0] + h / 2 * a1[0], v[1] + h / 2 * a1[1], v[2] + h / 2 * a1[2]];
    var a2 = a(x2, t + h / 2);
    var x3 = [x[0] + h / 2 * v2[0], x[1] + h / 2 * v2[1], x[2] + h / 2 * v2[2]];
    var v3 = [v[0] + h / 2 * a2[0], v[1] + h / 2 * a2[1], v[2] + h / 2 * a2[2]];
    var a3 = a(x3, t + h / 2);
    var x4 = [x[0] + h * v3[0], x[1] + h * v3[1], x[2] + h * v3[2]];
    var v4 = [v[0] + h * a3[0], v[1] + h * a3[1], v[2] + h * a3[2]];
    var a4 = a(x4, t + h);
    var xn = [0, 0, 0], vn = [0, 0, 0];
    for (i = 0; i < 3; i++) {
      xn[i] = x[i] + h / 6 * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i]);
      vn[i] = v[i] + h / 6 * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]);
    }
    b.x = xn; b.vel = vn;
    return { F: F(xn[0], xn[1], xn[2], t + h), v: vn, speed: Math.sqrt(vn[0] * vn[0] + vn[1] * vn[1] + vn[2] * vn[2]) };
  }

  VF.Bodies = {
    jacobian: jacobian, curlOf: curlOf, divOf: divOf,
    mat3mul: mat3mul, mat3det: mat3det, rodrigues: rodrigues, ident3: ident3,
    makeBody: makeBody, stepFlow: stepFlow, stepForce: stepForce
  };

})(window.VF = window.VF || {});
