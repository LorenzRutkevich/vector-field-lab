/* =============================================================================
 * waves.js: 1-D PDE evolution by eigenfunction expansion (VF.Waves)
 * -----------------------------------------------------------------------------
 * Separation of variables on [0, L] with Dirichlet ends (u(0)=u(L)=0):
 * the sine modes χₙ(x) = sin(nπx/L) diagonalize ∂²/∂x² with kₙ = nπ/L, so
 * projecting the initial condition once,
 *
 *     aₙ = (2/L) ∫₀ᴸ u₀(x) sin(nπx/L) dx ,
 *
 * gives EXACT time evolution, no time stepping, no numerical dispersion:
 *
 *   wave  u_tt = c²u_xx :  αₙ(t) = aₙ cos(ωₙt) + (bₙ/ωₙ) sin(ωₙt),  ωₙ = c·kₙ
 *   heat  u_t  = D u_xx :  αₙ(t) = aₙ e^{−D kₙ² t}
 *   Schrödinger (free, ℏ=m=1)  iψ_t = −½ψ_xx :  cₙ(t) = aₙ e^{−iEₙt}, Eₙ = kₙ²/2
 *
 * The same u₀ can be fed to all three; the comparison IS the lesson:
 * waves oscillate (each mode keeps |αₙ|), heat kills mode n at rate Dkₙ²
 * (high n first: that is why diffusion smooths), Schrödinger keeps |cₙ|
 * but scrambles phases (dispersion without loss).
 * Pure math, no DOM/three.js: unit-testable.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* aₙ = (2/L)∫₀ᴸ fn(x) sin(nπx/L) dx by trapezoid, n = 1..N (index n-1) */
  function project(fn, L, N) {
    var Ni = 1600, dx = L / Ni, a = new Array(N), n, i;
    for (n = 1; n <= N; n++) {
      var k = n * Math.PI / L, s = 0;
      for (i = 0; i <= Ni; i++) {
        var x = i * dx, v = fn(x) * Math.sin(k * x);
        s += (i === 0 || i === Ni) ? v / 2 : v;
      }
      a[n - 1] = 2 / L * s * dx;
    }
    return a;
  }

  function grid(L, res) {
    var x = new Array(res + 1), i;
    for (i = 0; i <= res; i++) x[i] = L * i / res;
    return x;
  }

  /* wave equation: current profile + per-mode amplitude/velocity + energy.
     E = ∫ ½u_t² + ½c²u_x² dx = (L/4) Σ (α̇ₙ² + ωₙ²αₙ²), conserved. */
  function wave(a, b, c, L, t, res) {
    var N = a.length, x = grid(L, res), u = new Array(x.length);
    var amps = new Array(N), vels = new Array(N), E = 0, n, i;
    for (n = 0; n < N; n++) {
      var w = c * (n + 1) * Math.PI / L, bn = b ? b[n] : 0;
      amps[n] = a[n] * Math.cos(w * t) + (w > 0 ? bn / w * Math.sin(w * t) : bn * t);
      vels[n] = -a[n] * w * Math.sin(w * t) + bn * Math.cos(w * t);
      E += L / 4 * (vels[n] * vels[n] + w * w * amps[n] * amps[n]);
    }
    for (i = 0; i < x.length; i++) {
      var s = 0;
      for (n = 0; n < N; n++) s += amps[n] * Math.sin((n + 1) * Math.PI * x[i] / L);
      u[i] = s;
    }
    return { x: x, u: u, amps: amps, E: E };
  }

  /* heat equation: every mode decays as e^{−Dkₙ²t}, high n dies first */
  function heat(a, D, L, t, res) {
    var N = a.length, x = grid(L, res), u = new Array(x.length);
    var amps = new Array(N), n, i, umax = 0;
    for (n = 0; n < N; n++) {
      var k = (n + 1) * Math.PI / L;
      amps[n] = a[n] * Math.exp(-D * k * k * t);
    }
    for (i = 0; i < x.length; i++) {
      var s = 0;
      for (n = 0; n < N; n++) s += amps[n] * Math.sin((n + 1) * Math.PI * x[i] / L);
      u[i] = s;
      if (Math.abs(s) > umax) umax = Math.abs(s);
    }
    return { x: x, u: u, amps: amps, umax: umax };
  }

  /* free Schrödinger in the box: phases e^{−iEₙt}, |cₙ| constant, shape not.
     norm ∫|ψ|²dx = (L/2)Σ aₙ² is conserved exactly. */
  function schr(a, L, t, res) {
    var N = a.length, x = grid(L, res);
    var re = new Array(x.length), im = new Array(x.length), dens = new Array(x.length);
    var cr = new Array(N), ci = new Array(N), norm = 0, n, i;
    for (n = 0; n < N; n++) {
      var k = (n + 1) * Math.PI / L, E = k * k / 2;
      cr[n] = a[n] * Math.cos(E * t); ci[n] = -a[n] * Math.sin(E * t);
      norm += L / 2 * a[n] * a[n];
    }
    for (i = 0; i < x.length; i++) {
      var sr = 0, si = 0;
      for (n = 0; n < N; n++) {
        var s = Math.sin((n + 1) * Math.PI * x[i] / L);
        sr += cr[n] * s; si += ci[n] * s;
      }
      re[i] = sr; im[i] = si; dens[i] = sr * sr + si * si;
    }
    return { x: x, re: re, im: im, dens: dens, norm: norm };
  }

  VF.Waves = { project: project, wave: wave, heat: heat, schr: schr };

})(window.VF = window.VF || {});
