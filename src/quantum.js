/* =============================================================================
 * quantum.js: 1-D quantum mechanics: the time-independent Schrödinger equation
 * -----------------------------------------------------------------------------
 * Units ℏ = m = 1.  On a grid the equation  −½ ψ''(x) + V(x) ψ(x) = E ψ(x)
 * becomes a symmetric tridiagonal eigenproblem H ψ = E ψ with
 *     H_ii   =  1/dx² + V(x_i)          (from −½·(−2)/dx²)
 *     H_i,i±1 = −1/(2 dx²)              (from −½·(1)/dx²)
 * and hard walls ψ = 0 just beyond the box ends (Dirichlet).  We diagonalise it
 * with the QL-with-implicit-shifts algorithm (EISPACK/Numerical-Recipes imtql2),
 * giving every eigen-energy E_n and eigenfunction ψ_n.  A Gaussian wave packet is
 * then expanded in that basis so its time evolution ψ(x,t)=Σ cₙ ψₙ e^{−iEₙt} is
 * exact (within the basis) and cheap per frame: that is what shows tunnelling,
 * spreading and superposition "beats".  Pure math, ES5/JScript-safe.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function pythag(a, b) {                     /* sqrt(a²+b²) without overflow */
    var aa = Math.abs(a), ab = Math.abs(b), r;
    if (aa > ab) { r = ab / aa; return aa * Math.sqrt(1 + r * r); }
    if (ab === 0) return 0;
    r = aa / ab; return ab * Math.sqrt(1 + r * r);
  }
  function sgn(a, b) { return b >= 0 ? Math.abs(a) : -Math.abs(a); }

  /* Eigenvalues + eigenvectors of a symmetric tridiagonal matrix.
     d[0..n-1] diagonal (→ eigenvalues, in place); e[1..n-1] subdiagonal (e[0] free);
     z = identity in, eigenvectors in its COLUMNS out. */
  function tqli(d, e, n, z) {
    var m, l, iter, i, k, s, r, p, g, f, dd, c, b;
    for (i = 1; i < n; i++) e[i - 1] = e[i];
    e[n - 1] = 0;
    for (l = 0; l < n; l++) {
      iter = 0;
      do {
        for (m = l; m < n - 1; m++) {
          dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
          if (Math.abs(e[m]) + dd === dd) break;   /* e[m] negligible → split here */
        }
        if (m !== l) {
          if (iter++ === 60) break;                /* give up (should not happen) */
          g = (d[l + 1] - d[l]) / (2 * e[l]);
          r = pythag(g, 1);
          g = d[m] - d[l] + e[l] / (g + sgn(r, g));
          s = c = 1; p = 0;
          for (i = m - 1; i >= l; i--) {
            f = s * e[i]; b = c * e[i];
            e[i + 1] = (r = pythag(f, g));
            if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
            s = f / r; c = g / r;
            g = d[i + 1] - p;
            r = (d[i] - g) * s + 2 * c * b;
            d[i + 1] = g + (p = s * r);
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

  /* Solve −½ψ'' + Vψ = Eψ on [xmin,xmax] with N interior points (hard walls). */
  function solve(Vfn, xmin, xmax, N) {
    var dx = (xmax - xmin) / (N - 1), inv = 1 / (dx * dx), i, j;
    var x = new Array(N), d = new Array(N), e = new Array(N);
    for (i = 0; i < N; i++) {
      x[i] = xmin + i * dx;
      d[i] = inv + Vfn(x[i]);
      e[i] = -0.5 * inv;
    }
    e[0] = 0;
    var z = new Array(N);
    for (i = 0; i < N; i++) { z[i] = new Array(N); for (j = 0; j < N; j++) z[i][j] = (i === j) ? 1 : 0; }
    tqli(d, e, N, z);
    var idx = new Array(N);
    for (i = 0; i < N; i++) idx[i] = i;
    idx.sort(function (p, q) { return d[p] - d[q]; });
    var E = new Array(N), psi = new Array(N);
    for (j = 0; j < N; j++) {
      var col = idx[j], v = new Array(N), s2 = 0, mx = 0, mi = 0;
      for (i = 0; i < N; i++) { v[i] = z[i][col]; s2 += v[i] * v[i]; }
      var nrm = Math.sqrt(s2 * dx) || 1;
      for (i = 0; i < N; i++) { v[i] /= nrm; if (Math.abs(v[i]) > mx) { mx = Math.abs(v[i]); mi = i; } }
      if (v[mi] < 0) for (i = 0; i < N; i++) v[i] = -v[i];   /* sign: main lobe positive */
      E[j] = d[col]; psi[j] = v;
    }
    return { x: x, dx: dx, N: N, E: E, psi: psi, xmin: xmin, xmax: xmax };
  }

  function nodes(psi) { var c = 0, i; for (i = 1; i < psi.length; i++) if (psi[i] * psi[i - 1] < 0) c++; return c; }

  /* classically allowed region turning points for energy E: where V(x) = E */
  function turningPoints(Vfn, E, xmin, xmax) {
    var Ns = 400, dx = (xmax - xmin) / Ns, prev = Vfn(xmin) - E, out = [], i;
    for (i = 1; i <= Ns; i++) { var x = xmin + i * dx, cur = Vfn(x) - E; if ((prev < 0) !== (cur < 0)) out.push(x - dx * cur / (cur - prev)); prev = cur; }
    return out;
  }

  /* Gaussian wave packet  ψ0 ∝ exp(−(x−x0)²/(4σ²)) e^{i k0 x}, expanded in eigenbasis. */
  function packet(sol, x0, sigma, k0) {
    var N = sol.N, x = sol.x, dx = sol.dx, i, n;
    var re = new Array(N), im = new Array(N), s2 = 0;
    for (i = 0; i < N; i++) {
      var gg = Math.exp(-(x[i] - x0) * (x[i] - x0) / (4 * sigma * sigma));
      re[i] = gg * Math.cos(k0 * x[i]); im[i] = gg * Math.sin(k0 * x[i]);
      s2 += re[i] * re[i] + im[i] * im[i];
    }
    var nrm = Math.sqrt(s2 * dx) || 1;
    for (i = 0; i < N; i++) { re[i] /= nrm; im[i] /= nrm; }
    var cRe = new Array(N), cIm = new Array(N);
    for (n = 0; n < N; n++) {
      var ar = 0, ai = 0, p = sol.psi[n];
      for (i = 0; i < N; i++) { ar += p[i] * re[i]; ai += p[i] * im[i]; }
      cRe[n] = ar * dx; cIm[n] = ai * dx;
    }
    return { cRe: cRe, cIm: cIm, x0: x0, sigma: sigma, k0: k0 };
  }

  /* superposition of chosen eigenstates with equal weight (for "beats") */
  function superpose(sol, indices) {
    var N = sol.N, cRe = new Array(N), cIm = new Array(N), i, w = 1 / Math.sqrt(indices.length || 1);
    for (i = 0; i < N; i++) { cRe[i] = 0; cIm[i] = 0; }
    for (i = 0; i < indices.length; i++) if (indices[i] < N) cRe[indices[i]] = w;
    return { cRe: cRe, cIm: cIm, x0: 0, sigma: 0, k0: 0 };
  }

  /* ψ(x,t) = Σ cₙ ψₙ e^{−iEₙt};  e^{−iEt} = cos(Et) − i sin(Et). */
  function evolve(sol, pk, t) {
    var N = sol.N, re = new Array(N), im = new Array(N), dens = new Array(N), i, n;
    for (i = 0; i < N; i++) { re[i] = 0; im[i] = 0; }
    for (n = 0; n < N; n++) {
      var wr = pk.cRe[n], wi = pk.cIm[n];
      if (wr * wr + wi * wi < 1e-24) continue;
      var ct = Math.cos(sol.E[n] * t), st = Math.sin(sol.E[n] * t);
      var ur = wr * ct + wi * st;         /* Re(c e^{−iEt}) */
      var ui = wi * ct - wr * st;         /* Im(c e^{−iEt}) */
      var p = sol.psi[n];
      for (i = 0; i < N; i++) { re[i] += p[i] * ur; im[i] += p[i] * ui; }
    }
    var xm = 0, nn = 0;
    for (i = 0; i < N; i++) { dens[i] = re[i] * re[i] + im[i] * im[i]; xm += sol.x[i] * dens[i]; nn += dens[i]; }
    return { re: re, im: im, dens: dens, xmean: xm * sol.dx, norm: nn * sol.dx };
  }

  VF.QM = { solve: solve, nodes: nodes, turningPoints: turningPoints, packet: packet, superpose: superpose, evolve: evolve };

})(window.VF = window.VF || {});
