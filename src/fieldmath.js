/* =============================================================================
 * fieldmath.js: field abstraction, vector-calculus operators, sampling
 * -----------------------------------------------------------------------------
 * A "field" is { kind:'scalar'|'vector', label:string, at:(x,y,z,t)-> number | [u,v,w] }.
 * Differential operators (grad, div, curl, laplacian) are computed by central
 * finite differences, so they work for ANY user expression without symbolic
 * differentiation. Also provides grid sampling and RK4 streamline tracing.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var H = 1e-3;          /* finite-difference step (domain is ~[-6,6]) */

  function scalarField(fn, label) {
    return { kind: 'scalar', label: label || 'f', at: fn };
  }
  function vectorField(fx, fy, fz, label) {
    return {
      kind: 'vector', label: label || 'F',
      at: function (x, y, z, t) { return [fx(x, y, z, t), fy(x, y, z, t), fz(x, y, z, t)]; }
    };
  }
  function matrixField(A, label) {
    var M = VF.LinAlg;
    return {
      kind: 'vector', label: label || 'A·x',
      at: function (x, y, z) { return M.matVec(A, [x, y, z]); }
    };
  }

  /* ---- Differential operators (numerical) --------------------------------- */
  function grad(sf, h) {
    h = h || H; var f = sf.at;
    return scalarToVec('∇' + sf.label, function (x, y, z, t) {
      return [
        (f(x + h, y, z, t) - f(x - h, y, z, t)) / (2 * h),
        (f(x, y + h, z, t) - f(x, y - h, z, t)) / (2 * h),
        (f(x, y, z + h, t) - f(x, y, z - h, t)) / (2 * h)
      ];
    });
  }
  function div(vf, h) {
    h = h || H; var g = vf.at;
    return scalarField(function (x, y, z, t) {
      var dU = (g(x + h, y, z, t)[0] - g(x - h, y, z, t)[0]) / (2 * h);
      var dV = (g(x, y + h, z, t)[1] - g(x, y - h, z, t)[1]) / (2 * h);
      var dW = (g(x, y, z + h, t)[2] - g(x, y, z - h, t)[2]) / (2 * h);
      return dU + dV + dW;
    }, '∇·' + vf.label);
  }
  function curl(vf, h) {
    h = h || H; var g = vf.at;
    return scalarToVec('∇×' + vf.label, function (x, y, z, t) {
      var gyp = g(x, y + h, z, t), gym = g(x, y - h, z, t);
      var gzp = g(x, y, z + h, t), gzm = g(x, y, z - h, t);
      var gxp = g(x + h, y, z, t), gxm = g(x - h, y, z, t);
      return [
        (gyp[2] - gym[2]) / (2 * h) - (gzp[1] - gzm[1]) / (2 * h),
        (gzp[0] - gzm[0]) / (2 * h) - (gxp[2] - gxm[2]) / (2 * h),
        (gxp[1] - gxm[1]) / (2 * h) - (gyp[0] - gym[0]) / (2 * h)
      ];
    });
  }
  function laplacianScalar(sf, h) {
    h = h || H; var h2 = h * h, f = sf.at;
    return scalarField(function (x, y, z, t) {
      var c = 2 * f(x, y, z, t);
      return (f(x + h, y, z, t) - c + f(x - h, y, z, t)) / h2
           + (f(x, y + h, z, t) - c + f(x, y - h, z, t)) / h2
           + (f(x, y, z + h, t) - c + f(x, y, z - h, t)) / h2;
    }, '∇²' + sf.label);
  }
  function laplacianVector(vf, h) {
    h = h || H; var h2 = h * h, g = vf.at;
    return scalarToVec('∇²' + vf.label, function (x, y, z, t) {
      var c = g(x, y, z, t);
      var xp = g(x + h, y, z, t), xm = g(x - h, y, z, t);
      var yp = g(x, y + h, z, t), ym = g(x, y - h, z, t);
      var zp = g(x, y, z + h, t), zm = g(x, y, z - h, t);
      var out = [0, 0, 0];
      for (var i = 0; i < 3; i++)
        out[i] = (xp[i] - 2 * c[i] + xm[i]) / h2 + (yp[i] - 2 * c[i] + ym[i]) / h2 + (zp[i] - 2 * c[i] + zm[i]) / h2;
      return out;
    });
  }
  function laplacian(field, h) { return field.kind === 'scalar' ? laplacianScalar(field, h) : laplacianVector(field, h); }
  function magnitude(vf) {
    return scalarField(function (x, y, z, t) {
      var v = vf.at(x, y, z, t); return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    }, '|' + vf.label + '|');
  }
  function scalarToVec(label, at) { return { kind: 'vector', label: label, at: at }; }

  /* apply an operator by name; returns { field, error } */
  function applyOperator(field, op) {
    try {
      switch (op) {
        case 'none': return { field: field };
        case 'gradient':
          if (field.kind !== 'scalar') return { error: 'Gradient needs a scalar field f.' };
          return { field: grad(field) };
        case 'divergence':
          if (field.kind !== 'vector') return { error: 'Divergence needs a vector field F.' };
          return { field: div(field) };
        case 'curl':
          if (field.kind !== 'vector') return { error: 'Curl needs a vector field F.' };
          return { field: curl(field) };
        case 'laplacian': return { field: laplacian(field) };
        case 'magnitude':
          if (field.kind !== 'vector') return { error: 'Magnitude needs a vector field F.' };
          return { field: magnitude(field) };
        default: return { field: field };
      }
    } catch (e) { return { error: String(e && e.message || e) }; }
  }

  /* ---- Grid sampling ------------------------------------------------------ */
  function axisValues(min, max, n) {
    var out = [];
    if (n <= 1) { out.push((min + max) / 2); return out; }
    for (var i = 0; i < n; i++) out.push(min + (max - min) * i / (n - 1));
    return out;
  }
  function finite3(v) { return isFinite(v[0]) && isFinite(v[1]) && isFinite(v[2]); }

  function sampleVector(field, dom, n, t) {
    var xs = axisValues(dom.min[0], dom.max[0], n);
    var ys = axisValues(dom.min[1], dom.max[1], n);
    var zs = axisValues(dom.min[2], dom.max[2], n);
    var pos = [], vec = [], mag = [], lo = Infinity, hi = -Infinity;
    for (var i = 0; i < xs.length; i++)
      for (var j = 0; j < ys.length; j++)
        for (var k = 0; k < zs.length; k++) {
          var v = field.at(xs[i], ys[j], zs[k], t);
          if (!v || !finite3(v)) continue;
          var m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
          if (!isFinite(m)) continue;
          pos.push([xs[i], ys[j], zs[k]]); vec.push(v); mag.push(m);
          if (m < lo) lo = m; if (m > hi) hi = m;
        }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    return { pos: pos, vec: vec, mag: mag, min: lo, max: hi, count: pos.length };
  }

  function sampleScalar(field, dom, n, t) {
    var xs = axisValues(dom.min[0], dom.max[0], n);
    var ys = axisValues(dom.min[1], dom.max[1], n);
    var zs = axisValues(dom.min[2], dom.max[2], n);
    var pos = [], val = [], lo = Infinity, hi = -Infinity;
    for (var i = 0; i < xs.length; i++)
      for (var j = 0; j < ys.length; j++)
        for (var k = 0; k < zs.length; k++) {
          var s = field.at(xs[i], ys[j], zs[k], t);
          if (!isFinite(s)) continue;
          pos.push([xs[i], ys[j], zs[k]]); val.push(s);
          if (s < lo) lo = s; if (s > hi) hi = s;
        }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    return { pos: pos, val: val, min: lo, max: hi, count: pos.length };
  }

  /* sample a vector field on a single plane (dense 2D grid of arrows): the
     clearest way to reveal circular / geometric structure without depth clutter */
  function sampleVectorPlane(field, axis, coord, dom, res, t) {
    var i0, i1, fixed;
    if (axis === 'x') { i0 = 1; i1 = 2; fixed = 0; }
    else if (axis === 'y') { i0 = 0; i1 = 2; fixed = 1; }
    else { i0 = 0; i1 = 1; fixed = 2; }
    var a0 = axisValues(dom.min[i0], dom.max[i0], res);
    var a1 = axisValues(dom.min[i1], dom.max[i1], res);
    var pos = [], vec = [], mag = [], lo = Infinity, hi = -Infinity;
    for (var b = 0; b < res; b++)
      for (var a = 0; a < res; a++) {
        var p = [0, 0, 0];
        p[fixed] = coord; p[i0] = a0[a]; p[i1] = a1[b];
        var v = field.at(p[0], p[1], p[2], t);
        if (!v || !finite3(v)) continue;
        var m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        if (!isFinite(m)) continue;
        pos.push([p[0], p[1], p[2]]); vec.push(v); mag.push(m);
        if (m < lo) lo = m; if (m > hi) hi = m;
      }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    return { pos: pos, vec: vec, mag: mag, min: lo, max: hi, count: pos.length };
  }

  /* ---- Streamlines (RK4 on the normalized field = geometric field lines) --- */
  function rk4dir(g, p, ds, t) {
    function dir(q) {
      var v = g(q[0], q[1], q[2], t);
      var m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (!(m > 1e-9) || !isFinite(m)) return null;
      return [v[0] / m, v[1] / m, v[2] / m];
    }
    var k1 = dir(p); if (!k1) return null;
    var k2 = dir([p[0] + 0.5 * ds * k1[0], p[1] + 0.5 * ds * k1[1], p[2] + 0.5 * ds * k1[2]]); if (!k2) return null;
    var k3 = dir([p[0] + 0.5 * ds * k2[0], p[1] + 0.5 * ds * k2[1], p[2] + 0.5 * ds * k2[2]]); if (!k3) return null;
    var k4 = dir([p[0] + ds * k3[0], p[1] + ds * k3[1], p[2] + ds * k3[2]]); if (!k4) return null;
    return [
      p[0] + ds / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      p[1] + ds / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      p[2] + ds / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
    ];
  }

  function inDomain(p, dom, pad) {
    pad = pad || 0;
    return p[0] >= dom.min[0] - pad && p[0] <= dom.max[0] + pad &&
           p[1] >= dom.min[1] - pad && p[1] <= dom.max[1] + pad &&
           p[2] >= dom.min[2] - pad && p[2] <= dom.max[2] + pad;
  }

  function traceLine(vf, seed, dom, ds, maxSteps, t) {
    var g = vf.at;
    var fwd = [seed.slice()], bwd = [];
    var p = seed.slice(), s;
    for (s = 0; s < maxSteps; s++) {
      var q = rk4dir(g, p, ds, t);
      if (!q || !inDomain(q, dom, ds)) break;
      fwd.push(q); p = q;
    }
    p = seed.slice();
    for (s = 0; s < maxSteps; s++) {
      var q2 = rk4dir(g, p, -ds, t);
      if (!q2 || !inDomain(q2, dom, ds)) break;
      bwd.push(q2); p = q2;
    }
    bwd.reverse();
    var pts = bwd.concat(fwd);
    var speeds = [];
    for (var i = 0; i < pts.length; i++) {
      var v = g(pts[i][0], pts[i][1], pts[i][2], t);
      speeds.push(Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
    }
    return { pts: pts, speeds: speeds };
  }

  function streamlines(vf, seeds, dom, opts) {
    opts = opts || {};
    var span = Math.max(dom.max[0] - dom.min[0], dom.max[1] - dom.min[1], dom.max[2] - dom.min[2]);
    var ds = opts.ds || span / 80;
    var maxSteps = opts.maxSteps || 260;
    var t = opts.t || 0;
    var lines = [];
    for (var i = 0; i < seeds.length; i++) {
      var line = traceLine(vf, seeds[i], dom, ds, maxSteps, t);
      if (line.pts.length > 2) lines.push(line);
    }
    return lines;
  }

  /* seed points: a jittered lattice inside the domain */
  function seedLattice(dom, n) {
    var xs = axisValues(dom.min[0] * 0.85, dom.max[0] * 0.85, n);
    var ys = axisValues(dom.min[1] * 0.85, dom.max[1] * 0.85, n);
    var zs = axisValues(dom.min[2] * 0.85, dom.max[2] * 0.85, n);
    var seeds = [];
    for (var i = 0; i < xs.length; i++)
      for (var j = 0; j < ys.length; j++)
        for (var k = 0; k < zs.length; k++) seeds.push([xs[i], ys[j], zs[k]]);
    return seeds;
  }

  /* ---- Line integral  ∮_C F·dr  (work) + arc length ----------------------- */
  /* curveAt(t) -> [x,y,z];  fieldAt(x,y,z) -> [u,v,w]. Trapezoid rule. */
  function lineIntegral(curveAt, fieldAt, t0, t1, N) {
    N = N || 500;
    var pts = [], integrand = [], hd = Math.max(1e-7, (t1 - t0) * 1e-4), dt = (t1 - t0) / N;
    var work = 0, arc = 0, unsigned = 0, lo = Infinity, hi = -Infinity, prevDot = 0, prevSpeed = 0;
    for (var i = 0; i <= N; i++) {
      var t = t0 + dt * i;
      var r = curveAt(t), rp1 = curveAt(t + hd), rm1 = curveAt(t - hd);
      var rp = [(rp1[0] - rm1[0]) / (2 * hd), (rp1[1] - rm1[1]) / (2 * hd), (rp1[2] - rm1[2]) / (2 * hd)];
      var F = fieldAt(r[0], r[1], r[2]);
      var dot = F[0] * rp[0] + F[1] * rp[1] + F[2] * rp[2];
      var speed = Math.sqrt(rp[0] * rp[0] + rp[1] * rp[1] + rp[2] * rp[2]);
      pts.push(r); integrand.push(dot);
      if (isFinite(dot)) { if (dot < lo) lo = dot; if (dot > hi) hi = dot; }
      if (i > 0) {
        if (isFinite(dot) && isFinite(prevDot)) { work += 0.5 * (dot + prevDot) * dt; unsigned += 0.5 * (Math.abs(dot) + Math.abs(prevDot)) * dt; }
        if (isFinite(speed) && isFinite(prevSpeed)) arc += 0.5 * (speed + prevSpeed) * dt;
      }
      prevDot = dot; prevSpeed = speed;
    }
    if (!isFinite(lo)) { lo = -1; hi = 1; }
    var r0 = curveAt(t0), r1 = curveAt(t1);
    var gap = Math.sqrt((r1[0] - r0[0]) * (r1[0] - r0[0]) + (r1[1] - r0[1]) * (r1[1] - r0[1]) + (r1[2] - r0[2]) * (r1[2] - r0[2]));
    return { value: work, arcLength: arc, unsigned: unsigned, pts: pts, integrand: integrand, min: lo, max: hi, endpointGap: gap };
  }

  VF.FieldMath = {
    scalarField: scalarField, vectorField: vectorField, matrixField: matrixField,
    grad: grad, div: div, curl: curl, laplacian: laplacian, magnitude: magnitude,
    applyOperator: applyOperator,
    sampleVector: sampleVector, sampleScalar: sampleScalar, sampleVectorPlane: sampleVectorPlane,
    streamlines: streamlines, seedLattice: seedLattice,
    lineIntegral: lineIntegral
  };

})(window.VF = window.VF || {});
