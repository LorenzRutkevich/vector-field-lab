/* =============================================================================
 * fourier.js: Fourier series & transform (VF.Fourier)
 * -----------------------------------------------------------------------------
 * Series on [−L, L] (period 2L):
 *     f(x) ≈ a₀/2 + Σ aₙ cos(nπx/L) + bₙ sin(nπx/L)
 *     aₙ = (1/L)∫ f cos(nπx/L) dx ,   bₙ = (1/L)∫ f sin(nπx/L) dx
 * Coefficients come from numerical integration; partial sums show convergence and
 * the Gibbs overshoot at jumps.  A direct transform F(k)=∫ f e^{−ikx} dx gives the
 * spectrum and the Δx·Δk trade-off of a wave packet.  Pure math, ES5/JScript-safe.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* trapezoidal integral of samples arr[0..Ni] with spacing dx */
  function trapz(arr, Ni, dx) { var s = 0.5 * (arr[0] + arr[Ni]), k; for (k = 1; k < Ni; k++) s += arr[k]; return s * dx; }

  function series(fn, L, Nmax, res) {
    var Ni = 2000, dx = (2 * L) / Ni, i, n;
    var xi = new Array(Ni + 1), fi = new Array(Ni + 1), tmp = new Array(Ni + 1);
    for (i = 0; i <= Ni; i++) { xi[i] = -L + i * dx; fi[i] = fn(xi[i]); }
    var a = new Array(Nmax + 1), b = new Array(Nmax + 1);
    for (i = 0; i <= Ni; i++) tmp[i] = fi[i];
    a[0] = trapz(tmp, Ni, dx) / L; b[0] = 0;
    for (n = 1; n <= Nmax; n++) {
      var w = n * Math.PI / L;
      for (i = 0; i <= Ni; i++) tmp[i] = fi[i] * Math.cos(w * xi[i]); a[n] = trapz(tmp, Ni, dx) / L;
      for (i = 0; i <= Ni; i++) tmp[i] = fi[i] * Math.sin(w * xi[i]); b[n] = trapz(tmp, Ni, dx) / L;
    }
    var Nx = res || 600, xs = new Array(Nx), fs = new Array(Nx);
    for (i = 0; i < Nx; i++) { xs[i] = -L + 2 * L * i / (Nx - 1); fs[i] = fn(xs[i]); }
    return { L: L, Nmax: Nmax, a: a, b: b, x: xs, f: fs };
  }

  function partial(ser, M) {
    var Nx = ser.x.length, out = new Array(Nx), L = ser.L, i, n;
    for (i = 0; i < Nx; i++) {
      var s = ser.a[0] / 2, x = ser.x[i];
      for (n = 1; n <= M; n++) { var w = n * Math.PI / L; s += ser.a[n] * Math.cos(w * x) + ser.b[n] * Math.sin(w * x); }
      out[i] = s;
    }
    return out;
  }

  function harmonic(ser, n) {
    var Nx = ser.x.length, out = new Array(Nx), L = ser.L, w = n * Math.PI / L, i;
    for (i = 0; i < Nx; i++) { var x = ser.x[i]; out[i] = (n === 0) ? ser.a[0] / 2 : ser.a[n] * Math.cos(w * x) + ser.b[n] * Math.sin(w * x); }
    return out;
  }

  function amplitude(ser, n) { return n === 0 ? Math.abs(ser.a[0] / 2) : Math.sqrt(ser.a[n] * ser.a[n] + ser.b[n] * ser.b[n]); }

  /* Parseval energy check:  (1/2L)∫f² dx  vs  (a₀/2)² + ½Σ(aₙ²+bₙ²) */
  function parseval(ser) {
    var e = ser.a[0] / 2 * (ser.a[0] / 2), n;
    for (n = 1; n <= ser.Nmax; n++) e += 0.5 * (ser.a[n] * ser.a[n] + ser.b[n] * ser.b[n]);
    return e;
  }

  /* Fourier transform magnitude  F(k) = ∫ f(x) e^{−ikx} dx  sampled on [−kmax,kmax] */
  function transform(fn, xmin, xmax, kmax, Nk) {
    var Ni = 1400, dx = (xmax - xmin) / Ni, xi = new Array(Ni + 1), fi = new Array(Ni + 1), i, j;
    for (i = 0; i <= Ni; i++) { xi[i] = xmin + i * dx; fi[i] = fn(xi[i]); }
    var k = new Array(Nk), re = new Array(Nk), im = new Array(Nk), mag = new Array(Nk), mmax = 0;
    for (j = 0; j < Nk; j++) {
      var kk = -kmax + 2 * kmax * j / (Nk - 1), sr = 0, si = 0;
      for (i = 0; i <= Ni; i++) { var wgt = (i === 0 || i === Ni) ? 0.5 : 1; sr += wgt * fi[i] * Math.cos(kk * xi[i]); si -= wgt * fi[i] * Math.sin(kk * xi[i]); }
      sr *= dx; si *= dx; k[j] = kk; re[j] = sr; im[j] = si; mag[j] = Math.sqrt(sr * sr + si * si); if (mag[j] > mmax) mmax = mag[j];
    }
    return { k: k, re: re, im: im, mag: mag, max: mmax };
  }

  VF.Fourier = { series: series, partial: partial, harmonic: harmonic, amplitude: amplitude, parseval: parseval, transform: transform };

})(window.VF = window.VF || {});
