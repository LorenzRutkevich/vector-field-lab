/* =============================================================================
 * cplx.js: complex maps & conformality (VF.Cplx)
 * -----------------------------------------------------------------------------
 * f : ℂ → ℂ (equivalently a map ℝ² → ℝ²), viewed two classic ways:
 *   - DOMAIN COLOURING: each input z is painted with hue = arg f(z) and
 *     brightness bands at |f| = 2^k: zeros are dark points where all hues
 *     meet, poles bright ones, and the hue winds (degree = number of zeros).
 *   - GRID IMAGE: the input grid mapped through f.  A holomorphic f preserves
 *     ANGLES (conformal): the image grid stays orthogonal wherever f′ ≠ 0.
 * Conformality ⟺ the Cauchy–Riemann equations uₓ = v_y, u_y = −vₓ ⟺ the
 * Jacobian is a rotation·scaling: the bridge to the total derivative.
 * Pure math (complex arithmetic + pixel/grid generators), no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function C(re, im) { return { re: re, im: im }; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function csub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cdiv(a, b) {
    var d = b.re * b.re + b.im * b.im;
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  }
  function cexp(a) { var e = Math.exp(a.re); return C(e * Math.cos(a.im), e * Math.sin(a.im)); }
  function clog(a) { return C(0.5 * Math.log(a.re * a.re + a.im * a.im), Math.atan2(a.im, a.re)); }
  function csin(a) { var eb = Math.exp(a.im), ch = (eb + 1 / eb) / 2, sh = (eb - 1 / eb) / 2; return C(Math.sin(a.re) * ch, Math.cos(a.re) * sh); }  /* exp-based cosh/sinh: no ES6 Math.cosh/sinh dependency (matches minkowski.js) */
  function csqrt(a) {
    var m = Math.sqrt(Math.sqrt(a.re * a.re + a.im * a.im)), t = 0.5 * Math.atan2(a.im, a.re);
    return C(m * Math.cos(t), m * Math.sin(t));
  }

  var ONE = C(1, 0);
  var PRESETS = [
    { key: 'z^2',      f: function (z) { return cmul(z, z); } },
    { key: 'z^3',      f: function (z) { return cmul(cmul(z, z), z); } },
    { key: 'z^2 - 1',  f: function (z) { return csub(cmul(z, z), ONE); } },
    { key: '1/z',      f: function (z) { return cdiv(ONE, z); } },
    { key: 'e^z',      f: cexp },
    { key: 'log z',    f: clog },
    { key: 'sin z',    f: csin },
    { key: '√z',       f: csqrt },
    { key: '(z-1)/(z+1)', f: function (z) { return cdiv(csub(z, ONE), cadd(z, ONE)); } },
    { key: 'z + 1/z',  f: function (z) { return cadd(z, cdiv(ONE, z)); } }
  ];
  function preset(key) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].key === key) return PRESETS[i];
    return PRESETS[0];
  }

  function hsl2rgb(h, s, l) {
    h = ((h % 1) + 1) % 1;
    function f(nn) {
      var k = (nn + h * 12) % 12, a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }
    return [f(0), f(8), f(4)];
  }

  /* pixel colour for w = f(z): hue = arg w, brightness bands at |w| = 2^k,
     darkened toward zeros and lifted toward poles */
  function colourOf(w) {
    if (!isFinite(w.re) || !isFinite(w.im)) return [0.5, 0.5, 0.5];
    var m = Math.sqrt(w.re * w.re + w.im * w.im);
    if (m < 1e-300) return [0, 0, 0];
    var hue = Math.atan2(w.im, w.re) / (2 * Math.PI);
    var lg = Math.log(m) / Math.LN2;
    var band = lg - Math.floor(lg);                          /* |w| contour bands */
    var l = 0.32 + 0.5 * (1 - 1 / (1 + m * m * 0.25));       /* dark at zeros, bright at poles */
    l += 0.10 * (band - 0.5);
    if (l < 0.04) l = 0.04; if (l > 0.96) l = 0.96;
    return hsl2rgb(hue, 0.9, l);
  }

  /* fill an RGBA buffer (W×H) with the domain colouring of f over the box */
  function paint(f, x0, x1, y0, y1, W, H, data) {
    var ix, iy, p = 0;
    for (iy = 0; iy < H; iy++) {
      var y = y1 - (y1 - y0) * (iy + 0.5) / H;               /* image rows top→bottom */
      for (ix = 0; ix < W; ix++) {
        var x = x0 + (x1 - x0) * (ix + 0.5) / W;
        var rgb = colourOf(f(C(x, y)));
        data[p] = Math.round(rgb[0] * 255); data[p + 1] = Math.round(rgb[1] * 255);
        data[p + 2] = Math.round(rgb[2] * 255); data[p + 3] = 255;
        p += 4;
      }
    }
  }

  /* the image of the coordinate grid under f: nl lines each way, ns samples */
  function gridImage(f, x0, x1, y0, y1, nl, ns) {
    var lines = [], i, j;
    for (i = 0; i <= nl; i++) {
      var xv = x0 + (x1 - x0) * i / nl, ph = [], pv = [];
      var yv = y0 + (y1 - y0) * i / nl;
      for (j = 0; j <= ns; j++) {
        var tv = j / ns;
        var w1 = f(C(xv, y0 + (y1 - y0) * tv));              /* vertical line x = xv */
        var w2 = f(C(x0 + (x1 - x0) * tv, yv));              /* horizontal line y = yv */
        pv.push(isFinite(w1.re) && isFinite(w1.im) ? [w1.re, w1.im] : [NaN, NaN]);
        ph.push(isFinite(w2.re) && isFinite(w2.im) ? [w2.re, w2.im] : [NaN, NaN]);
      }
      lines.push({ pts: pv, kind: 'v' });
      lines.push({ pts: ph, kind: 'h' });
    }
    return lines;
  }

  /* numeric Cauchy–Riemann check of (u, v) at a point: conformal ⟺ both ≈ 0 */
  function crCheck(u, v, x, y, h) {
    h = h || 1e-5;
    var ux = (u(x + h, y) - u(x - h, y)) / (2 * h), uy = (u(x, y + h) - u(x, y - h)) / (2 * h);
    var vx = (v(x + h, y) - v(x - h, y)) / (2 * h), vy = (v(x, y + h) - v(x, y - h)) / (2 * h);
    var scale = Math.abs(ux) + Math.abs(uy) + Math.abs(vx) + Math.abs(vy) + 1e-12;
    return {
      ux: ux, uy: uy, vx: vx, vy: vy,
      cr1: ux - vy, cr2: uy + vx,
      conformal: Math.abs(ux - vy) < 1e-3 * scale && Math.abs(uy + vx) < 1e-3 * scale,
      detJ: ux * vy - uy * vx
    };
  }

  VF.Cplx = {
    C: C, add: cadd, sub: csub, mul: cmul, div: cdiv, exp: cexp, log: clog, sin: csin, sqrt: csqrt,
    PRESETS: PRESETS, preset: preset, colourOf: colourOf, paint: paint, gridImage: gridImage, crCheck: crCheck
  };

})(window.VF = window.VF || {});
