/* =============================================================================
 * seqlab.js: sequences, series, function sequences (VF.Seq)
 * -----------------------------------------------------------------------------
 * The Analysis-1 core, made tangible:
 *   - sequence (aₙ): the ε–N game.  N(ε) = the first index from which the WHOLE
 *     tail stays inside (L−ε, L+ε), computed from the back, so a term that
 *     re-escapes later counts.
 *   - series (Σaₙ): partial sums sₙ.
 *   - function sequence fₙ(x) on [a,b]: pointwise limit f vs UNIFORM
 *     convergence: sup‖fₙ − f‖∞ measured on a grid; uniform ⟺ sup → 0.
 * Expressions use n (and x); the UI maps n to a parser variable.  Pure math.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* aₙ for n = 1..N via fn(n) */
  function values(fn, N) {
    var v = [], n;
    for (n = 1; n <= N; n++) v.push(fn(n));
    return v;
  }
  function partialSums(vals) {
    var s = [], acc = 0, i;
    for (i = 0; i < vals.length; i++) { acc += vals[i]; s.push(acc); }
    return s;
  }
  /* smallest N with |aₙ − L| < ε for ALL computed n ≥ N (scan from the back);
     null if even the last term escapes the band */
  function epsN(vals, L, eps) {
    var i, last = null;
    for (i = vals.length - 1; i >= 0; i--) {
      var d = Math.abs(vals[i] - L);
      if (!(d < eps)) return last;
      last = i + 1;
    }
    return last;
  }
  /* sup |fn(n, x) − flim(x)| on a grid over [a, b] */
  function supDist(fn, flim, n, a, b, grid) {
    grid = grid || 400;
    var sup = 0, i, at = a;
    for (i = 0; i <= grid; i++) {
      var x = a + (b - a) * i / grid;
      var d = Math.abs(fn(n, x) - flim(x));
      if (isFinite(d) && d > sup) { sup = d; at = x; }
    }
    return { sup: sup, at: at };
  }

  VF.Seq = { values: values, partialSums: partialSums, epsN: epsN, supDist: supDist };

})(window.VF = window.VF || {});
