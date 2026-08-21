/* =============================================================================
 * colormaps.js: perceptual color maps for scalar/magnitude encoding
 * -----------------------------------------------------------------------------
 * Each map exposes get(name) -> function(t in [0,1]) -> {r,g,b} in [0,1].
 * LUTs are stored as [r,g,b] in 0..255 and interpolated linearly.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var LUT = {
    viridis: [
      [68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142], [33, 144, 141],
      [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]
    ],
    inferno: [
      [0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85],
      [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164]
    ],
    turbo: [
      [48, 18, 59], [65, 69, 171], [57, 118, 246], [32, 166, 215], [24, 205, 153],
      [86, 228, 95], [166, 238, 53], [223, 220, 49], [250, 175, 54], [240, 108, 34], [122, 4, 3]
    ],
    magma: [
      [0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122],
      [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]
    ],
    plasma: [
      [13, 8, 135], [84, 2, 163], [139, 10, 165], [185, 50, 137], [219, 92, 104],
      [244, 136, 73], [254, 188, 43], [240, 249, 33]
    ]
  };

  function lerp(a, b, f) { return a + (b - a) * f; }

  function sampleLUT(stops, t) {
    if (!(t > 0)) { var s0 = stops[0]; return { r: s0[0] / 255, g: s0[1] / 255, b: s0[2] / 255 }; }   /* !(t>0) also catches NaN */
    if (t >= 1) { var s1 = stops[stops.length - 1]; return { r: s1[0] / 255, g: s1[1] / 255, b: s1[2] / 255 }; }
    var x = t * (stops.length - 1);
    var i = Math.floor(x), f = x - i;
    var a = stops[i], b = stops[i + 1];
    return { r: lerp(a[0], b[0], f) / 255, g: lerp(a[1], b[1], f) / 255, b: lerp(a[2], b[2], f) / 255 };
  }

  /* diverging blue-white-red (good for signed fields: div, laplacian) */
  function coolwarm(t) {
    t = (t > 0) ? (t < 1 ? t : 1) : 0;                /* (t>0)?… : 0  also maps NaN → 0 */
    var lo = [59, 76, 192], mid = [242, 242, 242], hi = [180, 4, 38], a, b, f;
    if (t < 0.5) { a = lo; b = mid; f = t / 0.5; } else { a = mid; b = hi; f = (t - 0.5) / 0.5; }
    return { r: lerp(a[0], b[0], f) / 255, g: lerp(a[1], b[1], f) / 255, b: lerp(a[2], b[2], f) / 255 };
  }

  function grayscale(t) { t = (t > 0) ? (t < 1 ? t : 1) : 0; return { r: t, g: t, b: t }; }   /* (t>0)?… : 0  also maps NaN → 0 */

  var MAPS = {
    viridis: function (t) { return sampleLUT(LUT.viridis, t); },
    inferno: function (t) { return sampleLUT(LUT.inferno, t); },
    turbo: function (t) { return sampleLUT(LUT.turbo, t); },
    magma: function (t) { return sampleLUT(LUT.magma, t); },
    plasma: function (t) { return sampleLUT(LUT.plasma, t); },
    coolwarm: coolwarm,
    grayscale: grayscale
  };

  var NAMES = ['viridis', 'turbo', 'inferno', 'magma', 'plasma', 'coolwarm', 'grayscale'];

  function get(name) { return MAPS[name] || MAPS.viridis; }

  /* CSS gradient string for the colorbar UI */
  function cssGradient(name, n) {
    n = n || 20;
    var f = get(name), parts = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1), c = f(t);
      parts.push('rgb(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ') ' +
        Math.round(t * 100) + '%');
    }
    return 'linear-gradient(to top, ' + parts.join(',') + ')';
  }

  VF.Colormaps = { get: get, names: NAMES, cssGradient: cssGradient };

})(window.VF = window.VF || {});
