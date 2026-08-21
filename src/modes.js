/* =============================================================================
 * modes.js: coupled oscillators / kleine Schwingungen (VF.Modes)
 * -----------------------------------------------------------------------------
 * A chain of n masses m[i] with springs s[j] (j = 0..n: s[0] = left wall,
 * s[j] couples mass j−1 to mass j, s[n] = right wall; a wall spring of 0
 * means a free end) and an optional pendulum restoring term (g/ℓ per mass).
 * Small oscillations in matrix form:
 *
 *     M ü = −K u ,      M = diag(m i),
 *     K[i][i] = s[i] + s[i+1] + m[i]·(g/ℓ),   K[i][i±1] = −s coupling
 *
 * The ansatz u = φ e^{iωt} gives the GENERALIZED eigenvalue problem
 *     (K − ω² M) φ = 0 .
 * With diagonal M substitute z = M^{1/2}φ:   K̃ z = ω² z  with the symmetric
 *     K̃ = M^{−1/2} K M^{−1/2}   (still tridiagonal),
 * solved by the same QL eigensolver as the Schrödinger Hamiltonian (VF.QM.tqli
 * is private, so the routine is duplicated here in its 0-indexed EISPACK form).
 * The modes φₙ = M^{−1/2} zₙ are M-orthonormal: φₘᵀ M φₙ = δₘₙ, so initial
 * conditions project as cₙ = φₙᵀ M u(0), dₙ = φₙᵀ M u̇(0) and the motion is
 *
 *     u(t) = Σₙ φₙ [ cₙ cos(ωₙt) + (dₙ/ωₙ) sin(ωₙt) ]        (exact)
 *
 * (a zero mode ω = 0, free-free translation, evolves as cₙ + dₙ·t).
 * Energy E = ½u̇ᵀMu̇ + ½uᵀKu = ½Σₙ(dₙ² + ωₙ²cₙ²) is conserved exactly.
 * Pure math, no DOM/three.js: unit-testable.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function pythag(a, b) {
    var aa = Math.abs(a), ab = Math.abs(b), r;
    if (aa > ab) { r = ab / aa; return aa * Math.sqrt(1 + r * r); }
    if (ab === 0) return 0;
    r = aa / ab; return ab * Math.sqrt(1 + r * r);
  }
  function sgn(a, b) { return b >= 0 ? Math.abs(a) : -Math.abs(a); }

  /* QL with implicit shifts on a symmetric tridiagonal (EISPACK imtql2, 0-indexed):
     d = diagonal (→ eigenvalues), e[i] couples i−1↔i (e[0] unused), z → eigenvectors */
  function tqli(d, e, n, z) {
    var m, l, iter, i, k, s, r, p, g, f, dd, c, b;
    for (i = 1; i < n; i++) e[i - 1] = e[i];
    e[n - 1] = 0;
    for (l = 0; l < n; l++) {
      iter = 0;
      do {
        for (m = l; m < n - 1; m++) {
          dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
          if (Math.abs(e[m]) <= 1e-14 * dd) break;
        }
        if (m !== l) {
          if (iter++ === 60) break;
          g = (d[l + 1] - d[l]) / (2 * e[l]);
          r = pythag(g, 1);
          g = d[m] - d[l] + e[l] / (g + sgn(r, g));
          s = c = 1; p = 0;
          for (i = m - 1; i >= l; i--) {
            f = s * e[i]; b = c * e[i];
            r = pythag(f, g);
            e[i + 1] = r;
            if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
            s = f / r; c = g / r;
            g = d[i + 1] - p;
            r = (d[i] - g) * s + 2 * c * b;
            p = s * r;
            d[i + 1] = g + p;
            g = c * r - b;
            for (k = 0; k < n; k++) {
              f = z[k][i + 1];
              z[k][i + 1] = s * z[k][i] + c * f;
              z[k][i] = c * z[k][i] - s * f;
            }
          }
          if (r === 0 && i >= l) continue;
          d[l] -= p; e[l] = g; e[m] = 0;
        }
      } while (m !== l);
    }
  }

  /* solve (K − ω²M)φ = 0 for the chain; returns M-orthonormal modes, ω ascending */
  function solveChain(m, springs, gl) {
    var n = m.length, i, j;
    gl = gl || 0;
    var d = new Array(n), e = new Array(n);
    for (i = 0; i < n; i++) {
      d[i] = (springs[i] + springs[i + 1] + m[i] * gl) / m[i];             /* K̃ᵢᵢ */
      e[i] = i > 0 ? -springs[i] / Math.sqrt(m[i - 1] * m[i]) : 0;         /* K̃ᵢ₋₁,ᵢ */
    }
    var z = new Array(n);
    for (i = 0; i < n; i++) { z[i] = new Array(n); for (j = 0; j < n; j++) z[i][j] = i === j ? 1 : 0; }
    tqli(d, e, n, z);
    var idx = new Array(n);
    for (i = 0; i < n; i++) idx[i] = i;
    idx.sort(function (p, q) { return d[p] - d[q]; });
    var omega = new Array(n), phi = new Array(n);
    for (j = 0; j < n; j++) {
      var col = idx[j], v = new Array(n), mi = 0, mx = 0;
      for (i = 0; i < n; i++) {
        v[i] = z[i][col] / Math.sqrt(m[i]);                                /* φ = M^{−1/2} z */
        if (Math.abs(v[i]) > mx) { mx = Math.abs(v[i]); mi = i; }
      }
      if (v[mi] < 0) for (i = 0; i < n; i++) v[i] = -v[i];
      omega[j] = Math.sqrt(Math.max(0, d[col]));                           /* ω² may be −1e−16 */
      phi[j] = v;
    }
    return { n: n, m: m, springs: springs, gl: gl, omega: omega, phi: phi };
  }

  /* modal coefficients of an initial condition: cₙ = φₙᵀM u0, dₙ = φₙᵀM v0 */
  function coeffs(sol, u0, v0) {
    var n = sol.n, c = new Array(n), dcf = new Array(n), k, i;
    for (k = 0; k < n; k++) {
      var sc = 0, sd = 0, p = sol.phi[k];
      for (i = 0; i < n; i++) { sc += sol.m[i] * p[i] * u0[i]; sd += sol.m[i] * p[i] * (v0 ? v0[i] : 0); }
      c[k] = sc; dcf[k] = sd;
    }
    return { c: c, d: dcf };
  }

  /* exact evolution + conserved energy ½Σ(dₙ² + ωₙ²cₙ²) */
  function evolve(sol, cf, t) {
    var n = sol.n, u = new Array(n), v = new Array(n), E = 0, k, i;
    for (i = 0; i < n; i++) { u[i] = 0; v[i] = 0; }
    for (k = 0; k < n; k++) {
      var w = sol.omega[k], c = cf.c[k], dk = cf.d[k], A, Av;
      if (w > 1e-9) { A = c * Math.cos(w * t) + dk / w * Math.sin(w * t); Av = -c * w * Math.sin(w * t) + dk * Math.cos(w * t); }
      else { A = c + dk * t; Av = dk; }                                    /* zero mode drifts */
      E += 0.5 * (dk * dk + w * w * c * c);
      for (i = 0; i < n; i++) { u[i] += sol.phi[k][i] * A; v[i] += sol.phi[k][i] * Av; }
    }
    return { u: u, v: v, E: E };
  }

  /* direct energy from a configuration: used to cross-check the modal form */
  function energyDirect(m, springs, gl, u, v) {
    var n = m.length, E = 0, i;
    for (i = 0; i < n; i++) E += 0.5 * m[i] * v[i] * v[i] + 0.5 * m[i] * (gl || 0) * u[i] * u[i];
    for (i = 0; i <= n; i++) {
      var uL = i > 0 ? u[i - 1] : 0, uR = i < n ? u[i] : 0;                /* walls at rest */
      E += 0.5 * springs[i] * (uR - uL) * (uR - uL);
    }
    return E;
  }

  VF.Modes = { solveChain: solveChain, coeffs: coeffs, evolve: evolve, energyDirect: energyDirect };

})(window.VF = window.VF || {});
