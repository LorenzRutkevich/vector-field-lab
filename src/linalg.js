/* =============================================================================
 * linalg.js: 3x3 real matrix toolkit
 * -----------------------------------------------------------------------------
 * Matrices are nested arrays M[row][col].  Provides the operations the Matrix
 * Lab needs: products, determinant, inverse, matrix exponential (scaling &
 * squaring), eigenvalues (real + complex via the characteristic cubic),
 * eigenvectors for real eigenvalues, and rotation builders (Rodrigues).
 * ========================================================================== */
(function (VF) {
  'use strict';

  function ident() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
  function clone(A) { return [[A[0][0], A[0][1], A[0][2]], [A[1][0], A[1][1], A[1][2]], [A[2][0], A[2][1], A[2][2]]]; }
  function fromFlat(a) { return [[a[0], a[1], a[2]], [a[3], a[4], a[5]], [a[6], a[7], a[8]]]; }
  function toFlat(A) { return [A[0][0], A[0][1], A[0][2], A[1][0], A[1][1], A[1][2], A[2][0], A[2][1], A[2][2]]; }

  function add(A, B) {
    var C = ident();
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][j] + B[i][j];
    return C;
  }
  function scale(A, s) {
    var C = ident();
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][j] * s;
    return C;
  }
  function mul(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 3; j++) {
        var s = 0;
        for (var k = 0; k < 3; k++) s += A[i][k] * B[k][j];
        C[i][j] = s;
      }
    return C;
  }
  function matVec(A, v) {
    return [
      A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
      A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
      A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]
    ];
  }
  function transpose(A) {
    return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]];
  }
  function trace(A) { return A[0][0] + A[1][1] + A[2][2]; }
  function det(A) {
    return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
         - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
         + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  }
  function inverse(A) {
    var d = det(A);
    if (Math.abs(d) < 1e-14) return null;
    var c = [
      [(A[1][1] * A[2][2] - A[1][2] * A[2][1]), -(A[0][1] * A[2][2] - A[0][2] * A[2][1]), (A[0][1] * A[1][2] - A[0][2] * A[1][1])],
      [-(A[1][0] * A[2][2] - A[1][2] * A[2][0]), (A[0][0] * A[2][2] - A[0][2] * A[2][0]), -(A[0][0] * A[1][2] - A[0][2] * A[1][0])],
      [(A[1][0] * A[2][1] - A[1][1] * A[2][0]), -(A[0][0] * A[2][1] - A[0][1] * A[2][0]), (A[0][0] * A[1][1] - A[0][1] * A[1][0])]
    ];
    return scale(c, 1 / d);
  }
  function infNorm(A) {
    var m = 0;
    for (var i = 0; i < 3; i++) {
      var s = Math.abs(A[i][0]) + Math.abs(A[i][1]) + Math.abs(A[i][2]);
      if (s > m) m = s;
    }
    return m;
  }
  function maxAbs(A) {
    var m = 0;
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var v = Math.abs(A[i][j]); if (v > m) m = v; }
    return m;
  }

  /* ---- Matrix exponential: scaling & squaring + Taylor -------------------- */
  function expm(A) {
    var nrm = infNorm(A);
    var s = nrm > 0 ? Math.max(0, Math.ceil(Math.log(nrm) / Math.LN2)) : 0;
    var As = scale(A, 1 / Math.pow(2, s));      /* ||As|| <= ~1 */
    var term = ident(), result = ident();
    for (var k = 1; k <= 20; k++) {
      term = scale(mul(term, As), 1 / k);        /* term = A^k / k! */
      result = add(result, term);
    }
    for (var i = 0; i < s; i++) result = mul(result, result);  /* square back */
    return result;
  }

  /* ---- vector helpers ----------------------------------------------------- */
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm3(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function normalize3(a) { var n = norm3(a); return n < 1e-30 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n]; }

  /* ---- Cubic solver: x^3 + b x^2 + c x + d = 0 (returns 3 {re,im}) -------- */
  function solveCubic(b, c, d) {
    var shift = -b / 3;
    var p = c - b * b / 3;
    var q = 2 * b * b * b / 27 - b * c / 3 + d;
    var eps = 1e-11;
    if (Math.abs(p) < eps && Math.abs(q) < eps) {
      return [{ re: shift, im: 0 }, { re: shift, im: 0 }, { re: shift, im: 0 }];
    }
    var disc = q * q / 4 + p * p * p / 27;
    if (disc > eps) {                              /* one real, two complex */
      var sq = Math.sqrt(disc);
      var u = Math.cbrt(-q / 2 + sq), v = Math.cbrt(-q / 2 - sq);
      var reC = shift - (u + v) / 2, imC = Math.sqrt(3) / 2 * (u - v);
      return [{ re: shift + u + v, im: 0 }, { re: reC, im: imC }, { re: reC, im: -imC }];
    } else if (disc < -eps) {                      /* three distinct real */
      var m = 2 * Math.sqrt(-p / 3);
      var arg = (3 * q) / (p * m);
      arg = arg < -1 ? -1 : (arg > 1 ? 1 : arg);
      var th = Math.acos(arg) / 3, out = [];
      for (var k = 0; k < 3; k++) out.push({ re: shift + m * Math.cos(th - 2 * Math.PI * k / 3), im: 0 });
      return out;
    } else {                                       /* repeated real root */
      var u2 = Math.cbrt(-q / 2);
      return [{ re: shift + 2 * u2, im: 0 }, { re: shift - u2, im: 0 }, { re: shift - u2, im: 0 }];
    }
  }

  /* eigenvector for a (real) eigenvalue: null space of (A - lam I) */
  function eigenvector(A, lam) {
    var N = [
      [A[0][0] - lam, A[0][1], A[0][2]],
      [A[1][0], A[1][1] - lam, A[1][2]],
      [A[2][0], A[2][1], A[2][2] - lam]
    ];
    var cands = [cross(N[0], N[1]), cross(N[1], N[2]), cross(N[2], N[0])];
    var best = null, bestN = 0;
    for (var i = 0; i < 3; i++) { var nn = norm3(cands[i]); if (nn > bestN) { bestN = nn; best = cands[i]; } }
    var sc = Math.max(1e-9, maxAbs(A));
    if (bestN < 1e-7 * sc) return null;            /* degenerate (>=2D eigenspace) */
    return normalize3(best);
  }

  /* full eigen-decomposition report */
  function eig(A) {
    var tr = trace(A);
    var m2 = (A[0][0] * A[1][1] - A[0][1] * A[1][0])
           + (A[0][0] * A[2][2] - A[0][2] * A[2][0])
           + (A[1][1] * A[2][2] - A[1][2] * A[2][1]);
    var dt = det(A);
    var vals = solveCubic(-tr, m2, -dt);
    var vecs = [];
    for (var i = 0; i < vals.length; i++) {
      vecs.push(Math.abs(vals[i].im) < 1e-8 ? eigenvector(A, vals[i].re) : null);
    }
    return { values: vals, vectors: vecs };
  }

  /* ---- Rotation builders -------------------------------------------------- */
  function skew(v) {
    return [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
  }
  function rotationAxisAngle(axis, angle) {
    var k = normalize3(axis);
    if (norm3(k) < 1e-20) return ident();
    var K = skew(k);
    var K2 = mul(K, K);
    return add(add(ident(), scale(K, Math.sin(angle))), scale(K2, 1 - Math.cos(angle)));
  }
  function isSymmetric(A, tol) {
    tol = tol || 1e-6;
    return Math.abs(A[0][1] - A[1][0]) < tol && Math.abs(A[0][2] - A[2][0]) < tol && Math.abs(A[1][2] - A[2][1]) < tol;
  }
  function isOrthogonal(A, tol) {
    tol = tol || 1e-5;
    var P = mul(transpose(A), A), I = ident();
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if (Math.abs(P[i][j] - I[i][j]) > tol) return false;
    return true;
  }
  function isRotation(A, tol) { return isOrthogonal(A, tol) && Math.abs(det(A) - 1) < (tol || 1e-4); }

  VF.LinAlg = {
    ident: ident, clone: clone, fromFlat: fromFlat, toFlat: toFlat,
    add: add, scale: scale, mul: mul, matVec: matVec, transpose: transpose,
    trace: trace, det: det, inverse: inverse, infNorm: infNorm, maxAbs: maxAbs,
    expm: expm, cross: cross, norm3: norm3, normalize3: normalize3,
    solveCubic: solveCubic, eig: eig, skew: skew,
    rotationAxisAngle: rotationAxisAngle,
    isSymmetric: isSymmetric, isOrthogonal: isOrthogonal, isRotation: isRotation
  };

})(window.VF = window.VF || {});
