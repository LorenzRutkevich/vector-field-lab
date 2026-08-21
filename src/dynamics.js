/* =============================================================================
 * dynamics.js: classical mechanics in the phase plane (VF.Dyn)
 * -----------------------------------------------------------------------------
 * A 1-degree-of-freedom system  ẍ = a(x, ẋ, t)  is a flow on the phase plane
 * (x, v):   ẋ = v,   v̇ = a(x, v, t).  This module integrates that flow (RK4),
 * samples its direction field, finds and classifies fixed points from the
 * Jacobian, and (for a conservative force a = a(x) = −U'(x)) draws exact energy
 * contours  ½v² + U(x) = E  (the true trajectories, cleaner than integrated ones).
 * Pure math, ES5/JScript-safe.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* one RK4 step of  ẋ=v, v̇=a(x,v,t) */
  function rk4(acc, x, v, t, h) {
    var k1x = v, k1v = acc(x, v, t);
    var k2x = v + 0.5 * h * k1v, k2v = acc(x + 0.5 * h * k1x, v + 0.5 * h * k1v, t + 0.5 * h);
    var k3x = v + 0.5 * h * k2v, k3v = acc(x + 0.5 * h * k2x, v + 0.5 * h * k2v, t + 0.5 * h);
    var k4x = v + h * k3v, k4v = acc(x + h * k3x, v + h * k3v, t + h);
    return [x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x), v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)];
  }

  /* integrate a trajectory; returns [[x,v], …] (stops if it blows up) */
  function trajectory(acc, x0, v0, h, steps, t0) {
    var pts = [[x0, v0]], x = x0, v = v0, t = t0 || 0, i;
    for (i = 0; i < steps; i++) {
      var s = rk4(acc, x, v, t, h); x = s[0]; v = s[1]; t += h;
      if (!isFinite(x) || !isFinite(v) || Math.abs(x) > 1e5 || Math.abs(v) > 1e5) break;
      pts.push([x, v]);
    }
    return pts;
  }

  /* phase-space direction field (dx/dt, dv/dt) on an nx×nv grid */
  function field(acc, xmin, xmax, vmin, vmax, nx, nv, t) {
    var pos = [], vec = [], mag = [], mn = Infinity, mx = -Infinity, i, j;
    for (j = 0; j < nv; j++) for (i = 0; i < nx; i++) {
      var x = xmin + (xmax - xmin) * i / (nx - 1), v = vmin + (vmax - vmin) * j / (nv - 1);
      var dv = acc(x, v, t), m = Math.sqrt(v * v + dv * dv);
      pos.push([x, v]); vec.push([v, dv]); mag.push(m);
      if (m < mn) mn = m; if (m > mx) mx = m;
    }
    return { pos: pos, vec: vec, mag: mag, min: mn, max: mx };
  }

  /* conservative energy contours: U(x) = −∫a(x,0)dx, then ½v²+U = E → v = ±√(2(E−U)) */
  function energyCurves(acc, xmin, xmax, Elevels, res) {
    var Nx = res || 500, dx = (xmax - xmin) / (Nx - 1), x = new Array(Nx), U = new Array(Nx), i, e;
    x[0] = xmin; U[0] = 0;
    for (i = 1; i < Nx; i++) { x[i] = xmin + i * dx; U[i] = U[i - 1] - 0.5 * (acc(x[i], 0, 0) + acc(x[i - 1], 0, 0)) * dx; }
    var curves = [];
    for (e = 0; e < Elevels.length; e++) {
      var E = Elevels[e], up = [], dn = [];
      for (i = 0; i < Nx; i++) {
        var arg = 2 * (E - U[i]);
        if (arg >= 0) { var vv = Math.sqrt(arg); up.push([x[i], vv]); dn.push([x[i], -vv]); }
        else { up.push([NaN, NaN]); dn.push([NaN, NaN]); }
      }
      curves.push(up); curves.push(dn);
    }
    return { curves: curves, x: x, U: U };
  }

  function classify(ax, av) {                     /* Jacobian [[0,1],[ax,av]] */
    var tr = av, det = -ax, disc = tr * tr - 4 * det;
    if (det < 0) return 'saddle';
    if (Math.abs(tr) < 1e-5) return 'center';
    if (disc < 0) return tr < 0 ? 'stable spiral' : 'unstable spiral';
    return tr < 0 ? 'stable node' : 'unstable node';
  }

  /* fixed points: a(x,0,t)=0 (with v=0), classified from the local Jacobian */
  function fixedPoints(acc, xmin, xmax, t) {
    var Ns = 800, dx = (xmax - xmin) / Ns, prev = acc(xmin, 0, t), fps = [], i, k;
    for (i = 1; i <= Ns; i++) {
      var x = xmin + i * dx, cur = acc(x, 0, t);
      if (prev === 0 || (prev < 0) !== (cur < 0)) {
        var a = x - dx, b = x, fa = prev;
        for (k = 0; k < 50; k++) { var mid = 0.5 * (a + b), fm = acc(mid, 0, t); if ((fa < 0) !== (fm < 0)) b = mid; else { a = mid; fa = fm; } }
        var xf = 0.5 * (a + b), h = 1e-4;
        var axx = (acc(xf + h, 0, t) - acc(xf - h, 0, t)) / (2 * h);
        var avv = (acc(xf, h, t) - acc(xf, -h, t)) / (2 * h);
        fps.push({ x: xf, type: classify(axx, avv) });
      }
      prev = cur;
    }
    return fps;
  }

  VF.Dyn = { rk4: rk4, trajectory: trajectory, field: field, energyCurves: energyCurves, fixedPoints: fixedPoints, classify: classify };

})(window.VF = window.VF || {});
