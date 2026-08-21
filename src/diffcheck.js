/* =============================================================================
 * diffcheck.js: total differentiability, numerically honest
 * -----------------------------------------------------------------------------
 * f (or a vector map F) is TOTALLY differentiable at P iff the remainder of the
 * best linear candidate L(h) = f(P) + Df(P)·h vanishes faster than |h|:
 *
 *      max over directions v of  |f(P + h·v) − f(P) − h·Df(P)·v| / h  →  0.
 *
 * remainderTest() measures exactly that ratio on shrinking h over a fan of unit
 * directions.  The verdict compares decay, not absolute size, so it is scale
 * invariant: smooth functions decay ∝ h, a genuine kink stagnates.  This is the
 * machinery behind the classic Analysis-2 counterexample xy/‖(x,y)‖: partial
 * derivatives exist at 0 yet the ratio sticks at ½ (worst direction 45°).
 *
 * dirDeriv() is the ONE-SIDED (Gateaux) directional derivative
 *      D_v f = lim_{h→0⁺} (f(P + h·v) − f(P)) / h
 * via a 2nd-order one-sided stencil, one-sided on purpose: at a kink the two
 * sides disagree and a central difference would silently average them away.
 * Total differentiability requires D_v f = ∇f·v for every v; comparing the two
 * is the "direction probe" in the Functions lab.
 *
 * Pure math, ES5/JScript-safe, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var AX = ['x', 'y', 'z'];

  /* unit directions sampling the sphere S^{n-1} (deterministic) */
  function directions(n) {
    var d = [], i;
    if (n === 1) { d.push([1], [-1]); return d; }
    if (n === 2) {
      for (i = 0; i < 24; i++) { var a = Math.PI * 2 * i / 24; d.push([Math.cos(a), Math.sin(a)]); }
      return d;
    }
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      if (x === 0 && y === 0 && z === 0) continue;
      var L = Math.sqrt(x * x + y * y + z * z);
      d.push([x / L, y / L, z / L]);
    }
    return d;                                       /* 26 lattice directions */
  }

  /* P + s·v with v aligned to the vars list; untouched coords keep P's value */
  function shift(P, vars, v, s) {
    var Q = { x: P.x || 0, y: P.y || 0, z: P.z || 0, t: P.t || 0 };
    for (var j = 0; j < vars.length; j++) Q[vars[j]] += s * v[j];
    return Q;
  }

  /* one-sided (Gateaux) directional derivative of a scalar fn along unit v */
  function dirDeriv(fn, P, v, vars) {
    var h = 1e-5;
    var Q1 = shift(P, vars, v, h), Q2 = shift(P, vars, v, 2 * h);
    var f0 = fn(P.x || 0, P.y || 0, P.z || 0, P.t || 0);
    var f1 = fn(Q1.x, Q1.y, Q1.z, Q1.t);
    var f2 = fn(Q2.x, Q2.y, Q2.z, Q2.t);
    return (-3 * f0 + 4 * f1 - f2) / (2 * h);       /* O(h²) one-sided stencil */
  }

  /* Remainder test.  F(x,y,z,t) returns an ARRAY of m components (wrap a scalar
     as function(...){return [f(...)];}); J is the m×n candidate derivative
     (rows = gradients w.r.t. vars).  Returns { rows: [{h, ratio, dir}, …],
     differentiable: true|false|null, worst: dir-at-smallest-h }. */
  function remainderTest(F, P, J, vars) {
    var n = vars.length, m = J.length, dirs = directions(n), hs = [1e-2, 1e-3, 1e-4];
    var F0 = F(P.x || 0, P.y || 0, P.z || 0, P.t || 0);
    var rows = [], hi, di, i, j;
    for (hi = 0; hi < hs.length; hi++) {
      var h = hs[hi], maxR = 0, wd = null, any = false;
      for (di = 0; di < dirs.length; di++) {
        var v = dirs[di], Q = shift(P, vars, v, h), Fh = F(Q.x, Q.y, Q.z, Q.t);
        var s2 = 0, bad = false;
        for (i = 0; i < m; i++) {
          var lin = 0;
          for (j = 0; j < n; j++) lin += J[i][j] * v[j];
          var d = Fh[i] - F0[i] - h * lin;
          if (!isFinite(d)) { bad = true; break; }
          s2 += d * d;
        }
        if (bad) continue;
        any = true;
        var ratio = Math.sqrt(s2) / h;
        if (ratio > maxR) { maxR = ratio; wd = v; }
      }
      rows.push({ h: h, ratio: any ? maxR : NaN, dir: wd });
    }
    var r1 = rows[0].ratio, r3 = rows[2].ratio, verdict;
    if (!isFinite(r1) || !isFinite(r3)) verdict = null;
    else if (r3 < 1e-9) verdict = true;             /* linear (remainder ≡ 0) */
    else verdict = r3 <= 0.2 * r1;                  /* decays ∝ h vs stagnates */
    return { rows: rows, differentiable: verdict, worst: rows[2].dir };
  }

  VF.DiffCheck = { directions: directions, dirDeriv: dirDeriv, remainderTest: remainderTest };

})(window.VF = window.VF || {});
