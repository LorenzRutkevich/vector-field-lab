/* =============================================================================
 * manifolds.js: differential geometry of submanifolds of ℝ³
 * -----------------------------------------------------------------------------
 *  - curve (1-manifold)   r(t): Frenet frame T,N,B, curvature κ, torsion τ
 *  - surface (2-manifold) φ(u,v): fundamental forms, Gaussian K, mean H,
 *                         principal curvatures, area, Gauss–Bonnet (χ)
 *  - level set (2-manifold) g(x,y,z)=c: marching-tetrahedra isosurface,
 *                         ∇g normal field, critical points, nearest-point
 *                         projection (Newton) for tangent planes T_Q M = ker dg
 *  - level curve (1-manifold in ℝ²) g(x,y)=c: marching squares + Lagrange
 *                         candidates ∇f = λ∇g (Extrema unter Nebenbedingungen)
 *  - Lagrange candidates on {g=0} surfaces in ℝ³ (Newton on ∇f = λ∇g, g = 0)
 * Exact derivatives come from the autodiff engine (finite-diff fallback).
 * ========================================================================== */
(function (VF) {
  'use strict';

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function norm(a) { return Math.sqrt(dot(a, a)); }
  function normalize(a) { var n = norm(a); return n < 1e-30 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n]; }

  /* ---- Curve (1-manifold): Frenet–Serret frame --------------------------- */
  function curveFrame(asts, fns, tv) {
    var AD = VF.Autodiff, rp, rpp, rppp, adOK = true;
    var r = [fns[0](0, 0, 0, tv), fns[1](0, 0, 0, tv), fns[2](0, 0, 0, tv)];
    try {
      var c0 = AD.taylorCoeffs1D(asts[0], { x: 0, y: 0, z: 0, t: tv }, 't', 3);
      var c1 = AD.taylorCoeffs1D(asts[1], { x: 0, y: 0, z: 0, t: tv }, 't', 3);
      var c2 = AD.taylorCoeffs1D(asts[2], { x: 0, y: 0, z: 0, t: tv }, 't', 3);
      rp = [c0[1], c1[1], c2[1]];
      rpp = [2 * c0[2], 2 * c1[2], 2 * c2[2]];
      rppp = [6 * c0[3], 6 * c1[3], 6 * c2[3]];
    } catch (e) {
      adOK = false;
      var h = 1e-3;
      function ra(t) { return [fns[0](0, 0, 0, t), fns[1](0, 0, 0, t), fns[2](0, 0, 0, t)]; }
      var p1 = ra(tv + h), m1 = ra(tv - h), p2 = ra(tv + 2 * h), m2 = ra(tv - 2 * h);
      rp = scale(sub(p1, m1), 1 / (2 * h));
      rpp = scale(add(sub(p1, scale(r, 2)), m1), 1 / (h * h));
      rppp = scale(sub(sub(p2, scale(p1, 2)), sub(m2, scale(m1, 2))), 1 / (2 * h * h * h));
    }
    var speed = norm(rp), rxp = cross(rp, rpp), rxpMag = norm(rxp);
    var kappa = speed > 1e-12 ? rxpMag / (speed * speed * speed) : 0;
    var d = dot(rxp, rxp);
    var tau = d > 1e-18 ? dot(rxp, rppp) / d : 0;
    var T = normalize(rp), B = normalize(rxp), N = cross(B, T);
    return { r: r, rp: rp, rpp: rpp, speed: speed, kappa: kappa, tau: tau, T: T, N: N, B: B, adOK: adOK };
  }

  /* ---- Surface (2-manifold): local geometry at (u,v) --------------------- */
  function surfaceLocal(asts, fns, uu, vv) {
    var AD = VF.Autodiff, P = { x: uu, y: vv, z: 0, t: 0 }, adOK = true, g = [], hh = [], i;
    var phi = [fns[0](uu, vv, 0, 0), fns[1](uu, vv, 0, 0), fns[2](uu, vv, 0, 0)];
    try {
      for (i = 0; i < 3; i++) { g.push(AD.gradientAD(asts[i], P, ['x', 'y'])); hh.push(AD.hessianAD(asts[i], P, ['x', 'y'])); }
    } catch (e) {
      adOK = false; g = []; hh = [];
      for (i = 0; i < 3; i++) { g.push(AD.gradientFD(fns[i], P, ['x', 'y'])); hh.push(AD.hessianFD(fns[i], P, ['x', 'y'])); }
    }
    var pu = [g[0][0], g[1][0], g[2][0]], pv = [g[0][1], g[1][1], g[2][1]];
    var puu = [hh[0][0][0], hh[1][0][0], hh[2][0][0]];
    var puv = [hh[0][0][1], hh[1][0][1], hh[2][0][1]];
    var pvv = [hh[0][1][1], hh[1][1][1], hh[2][1][1]];
    var n = normalize(cross(pu, pv));
    var E = dot(pu, pu), F = dot(pu, pv), G = dot(pv, pv);
    var L = dot(puu, n), M = dot(puv, n), N = dot(pvv, n), det = E * G - F * F;
    var K = det > 1e-18 ? (L * N - M * M) / det : 0;
    var H = det > 1e-18 ? (E * N - 2 * F * M + G * L) / (2 * det) : 0;
    var disc = H * H - K; if (disc < 0) disc = 0; disc = Math.sqrt(disc);
    return {
      phi: phi, pu: pu, pv: pv, n: n, E: E, F: F, G: G, L: L, M: M, N: N,
      K: K, H: H, k1: H + disc, k2: H - disc, dA: Math.sqrt(det > 0 ? det : 0), adOK: adOK
    };
  }

  /* ---- Surface grid: vertices + per-vertex Gaussian curvature + Gauss–Bonnet */
  function surfaceGrid(fns, u0, u1, v0, v1, res) {
    var du = (u1 - u0) / (res - 1), dv = (v1 - v0) / (res - 1), S = [], i, j;
    for (i = 0; i < res; i++) for (j = 0; j < res; j++) {
      var uu = u0 + i * du, vv = v0 + j * dv;
      S.push([fns[0](uu, vv, 0, 0), fns[1](uu, vv, 0, 0), fns[2](uu, vv, 0, 0)]);
    }
    function at(a, b) { return S[a * res + b]; }
    var K = new Array(res * res), kmin = Infinity, kmax = -Infinity, area = 0, totalK = 0;
    for (i = 1; i < res - 1; i++) for (j = 1; j < res - 1; j++) {
      var pu = scale(sub(at(i + 1, j), at(i - 1, j)), 1 / (2 * du));
      var pv = scale(sub(at(i, j + 1), at(i, j - 1)), 1 / (2 * dv));
      var puu = scale(add(sub(at(i + 1, j), scale(at(i, j), 2)), at(i - 1, j)), 1 / (du * du));
      var pvv = scale(add(sub(at(i, j + 1), scale(at(i, j), 2)), at(i, j - 1)), 1 / (dv * dv));
      var puv = scale(sub(sub(at(i + 1, j + 1), at(i + 1, j - 1)), sub(at(i - 1, j + 1), at(i - 1, j - 1))), 1 / (4 * du * dv));
      var n = normalize(cross(pu, pv));
      var E = dot(pu, pu), F = dot(pu, pv), G = dot(pv, pv), det = E * G - F * F;
      var L = dot(puu, n), M = dot(puv, n), N = dot(pvv, n);
      var k = det > 1e-18 ? (L * N - M * M) / det : 0, dA = Math.sqrt(det > 0 ? det : 0) * du * dv;
      K[i * res + j] = k;
      if (isFinite(k)) { if (k < kmin) kmin = k; if (k > kmax) kmax = k; }
      if (isFinite(dA)) { area += dA; if (isFinite(k)) totalK += k * dA; }
    }
    /* fill boundary curvature from nearest interior so colours don't break */
    for (i = 0; i < res; i++) for (j = 0; j < res; j++) {
      if (i === 0 || i === res - 1 || j === 0 || j === res - 1) {
        var ci = i < 1 ? 1 : (i > res - 2 ? res - 2 : i), cj = j < 1 ? 1 : (j > res - 2 ? res - 2 : j);
        K[i * res + j] = K[ci * res + cj];
      }
    }
    if (!isFinite(kmin)) { kmin = -1; kmax = 1; }
    var pos = []; for (i = 0; i < res * res; i++) pos.push(S[i]);
    return { pos: pos, K: K, kmin: kmin, kmax: kmax, area: area, totalK: totalK, chi: totalK / (2 * Math.PI), res: res };
  }

  /* ---- Level set g=c: marching tetrahedra -------------------------------- */
  var CUBE = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  var TETS = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];

  function marchOneTet(p, g, iso, out) {
    var ins = [], outs = [], i;
    for (i = 0; i < 4; i++) { if (!isFinite(g[i])) return; (g[i] < iso ? ins : outs).push(i); }
    if (ins.length === 0 || ins.length === 4) return;
    function pt(a, b) {
      var d = g[b] - g[a], t = Math.abs(d) < 1e-30 ? 0.5 : (iso - g[a]) / d;
      if (t < 0) t = 0; if (t > 1) t = 1;
      return [p[a][0] + t * (p[b][0] - p[a][0]), p[a][1] + t * (p[b][1] - p[a][1]), p[a][2] + t * (p[b][2] - p[a][2])];
    }
    if (ins.length === 1 || outs.length === 1) {
      var apex = ins.length === 1 ? ins[0] : outs[0], oth = ins.length === 1 ? outs : ins;
      out.push(pt(apex, oth[0]), pt(apex, oth[1]), pt(apex, oth[2]));
    } else {
      var A = pt(ins[0], outs[0]), B = pt(ins[0], outs[1]), C = pt(ins[1], outs[1]), D = pt(ins[1], outs[0]);
      out.push(A, B, C, A, C, D);
    }
  }

  function gradAt(gFn, x, y, z, h) {
    h = h || 1e-4;
    return [(gFn(x + h, y, z, 0) - gFn(x - h, y, z, 0)) / (2 * h),
    (gFn(x, y + h, z, 0) - gFn(x, y - h, z, 0)) / (2 * h),
    (gFn(x, y, z + h, 0) - gFn(x, y, z - h, 0)) / (2 * h)];
  }

  function marchingTets(gFn, iso, dom, res) {
    var pos = [], NG = res + 1, i, j, k, c, tI;
    var x0 = dom.min[0], y0 = dom.min[1], z0 = dom.min[2];
    var dx = (dom.max[0] - x0) / res, dy = (dom.max[1] - y0) / res, dz = (dom.max[2] - z0) / res;
    var gg = new Array(NG * NG * NG);
    for (i = 0; i < NG; i++) for (j = 0; j < NG; j++) for (k = 0; k < NG; k++)
      gg[(i * NG + j) * NG + k] = gFn(x0 + i * dx, y0 + j * dy, z0 + k * dz, 0);
    var corner = new Array(8), val = new Array(8);
    for (i = 0; i < res; i++) for (j = 0; j < res; j++) for (k = 0; k < res; k++) {
      for (c = 0; c < 8; c++) {
        var o = CUBE[c], gi = i + o[0], gj = j + o[1], gk = k + o[2];
        corner[c] = [x0 + gi * dx, y0 + gj * dy, z0 + gk * dz];
        val[c] = gg[(gi * NG + gj) * NG + gk];
      }
      for (tI = 0; tI < 6; tI++) {
        var T = TETS[tI];
        marchOneTet([corner[T[0]], corner[T[1]], corner[T[2]], corner[T[3]]], [val[T[0]], val[T[1]], val[T[2]], val[T[3]]], iso, pos);
      }
    }
    var nor = [];
    for (var vi = 0; vi < pos.length; vi++) { var p = pos[vi]; nor.push(normalize(gradAt(gFn, p[0], p[1], p[2]))); }
    return { pos: pos, nor: nor };
  }

  /* nearest-point projection onto the level set g = c: damped Newton steps
     along ∇g,  p ← p − (g(p)−c)·∇g/|∇g|²  (each step lands on the tangent
     plane's side of the surface; steps are length-clamped so oscillatory g
     like the gyroid cannot fling the iterate away). */
  function snapToLevel(gFn, c, p0, maxStep) {
    maxStep = maxStep || 1.5;
    var p = [p0[0], p0[1], p0[2]], i, gv, gr, g2;
    for (i = 0; i < 40; i++) {
      gv = gFn(p[0], p[1], p[2], 0);
      if (!isFinite(gv)) break;
      var d = gv - c;
      if (Math.abs(d) < 1e-14 * (1 + Math.abs(c))) break;
      gr = gradAt(gFn, p[0], p[1], p[2]);
      g2 = dot(gr, gr);
      if (!isFinite(g2) || g2 < 1e-16) break;
      var step = scale(gr, -d / g2), sl = norm(step);
      if (sl > maxStep) step = scale(step, maxStep / sl);
      p = add(p, step);
    }
    gv = gFn(p[0], p[1], p[2], 0);
    gr = gradAt(gFn, p[0], p[1], p[2]);
    var gn = norm(gr);
    return {
      p: p, gval: gv, grad: gr, gnorm: gn,
      n: gn > 1e-30 ? scale(gr, 1 / gn) : [0, 0, 0],
      ok: isFinite(gv) && Math.abs(gv - c) < 1e-5 * (1 + Math.abs(c)),
      /* at a degenerate footpoint d ~ |∇g|², so the gradient plateaus near
         √(d-tolerance); 1e-5 sits safely above that while any honest regular
         value in this app has |∇g| of order 1 */
      singular: gn < 1e-5
    };
  }

  /* critical points of g (where ∇g ≈ 0, where a level set can fail to be a manifold) */
  function criticalPoints(gFn, dom, res, tol) {
    res = res || 15;
    var dx = (dom.max[0] - dom.min[0]) / (res - 1), dy = (dom.max[1] - dom.min[1]) / (res - 1), dz = (dom.max[2] - dom.min[2]) / (res - 1);
    var mag = [], pts = [], i, j, k, maxm = 0;
    for (i = 0; i < res; i++) for (j = 0; j < res; j++) for (k = 0; k < res; k++) {
      var p = [dom.min[0] + i * dx, dom.min[1] + j * dy, dom.min[2] + k * dz];
      var m = norm(gradAt(gFn, p[0], p[1], p[2], Math.max(dx, dy, dz) * 0.25));
      mag.push(m); pts.push(p); if (isFinite(m) && m > maxm) maxm = m;
    }
    var thr = tol != null ? tol : 0.04 * maxm + 1e-9, out = [];
    function at(a, b, c) { return mag[(a * res + b) * res + c]; }
    for (i = 1; i < res - 1 && out.length < 16; i++) for (j = 1; j < res - 1; j++) for (k = 1; k < res - 1; k++) {
      var idx = (i * res + j) * res + k, m2 = mag[idx];
      if (!(m2 < thr)) continue;
      if (m2 <= at(i - 1, j, k) && m2 <= at(i + 1, j, k) && m2 <= at(i, j - 1, k) && m2 <= at(i, j + 1, k) && m2 <= at(i, j, k - 1) && m2 <= at(i, j, k + 1))
        out.push(pts[idx]);
    }
    return out;
  }

  /* ---- Level curves in the plane: marching squares --------------------------
     Chains of the curve g(x,y) = c on [x0,x1]×[y0,y1] (res×res cells), with
     linear interpolation on cell edges so shared edges share the exact vertex.
     Returns [{pts: [[x,y],…], closed}].  Used by the Functions lab to draw a
     constraint (Nebenbedingung) g = c on a surface z = f(x,y). */
  function levelCurves2D(g, c, x0, x1, y0, y1, res, refine) {
    var NG = res + 1, S = new Array(NG * NG), i, j;
    var dx = (x1 - x0) / res, dy = (y1 - y0) / res;
    for (j = 0; j < NG; j++) for (i = 0; i < NG; i++) {
      var v = g(x0 + i * dx, y0 + j * dy) - c;
      if (v === 0) v = 1e-12 * (1 + Math.abs(c));    /* nudge exact hits off the level */
      S[j * NG + i] = v;
    }
    var pts = {}, adj = {};
    function P(key, xa, ya, sa, xb, yb, sb) {
      if (!pts[key]) {
        if (refine) pts[key] = refine(xa, ya, sa, xb, yb, sb);
        else { var t = sa / (sa - sb); pts[key] = [xa + t * (xb - xa), ya + t * (yb - ya)]; }
        adj[key] = [];
      }
      return key;
    }
    function link(k1, k2) { adj[k1].push(k2); adj[k2].push(k1); }
    for (j = 0; j < res; j++) for (i = 0; i < res; i++) {
      var sa = S[j * NG + i], sb = S[j * NG + i + 1], sc = S[(j + 1) * NG + i + 1], sd = S[(j + 1) * NG + i];
      if (!isFinite(sa + sb + sc + sd)) continue;
      var xa = x0 + i * dx, xb = xa + dx, ya = y0 + j * dy, yb = ya + dy, e = [];
      if ((sa < 0) !== (sb < 0)) e.push(P('h' + i + '_' + j, xa, ya, sa, xb, ya, sb));             /* bottom */
      if ((sb < 0) !== (sc < 0)) e.push(P('v' + (i + 1) + '_' + j, xb, ya, sb, xb, yb, sc));       /* right */
      if ((sd < 0) !== (sc < 0)) e.push(P('h' + i + '_' + (j + 1), xa, yb, sd, xb, yb, sc));       /* top */
      if ((sa < 0) !== (sd < 0)) e.push(P('v' + i + '_' + j, xa, ya, sa, xa, yb, sd));             /* left */
      if (e.length === 2) link(e[0], e[1]);
      else if (e.length === 4) {                     /* ambiguous saddle cell: centre sign decides */
        /* centre sides with a → a's region spans the diagonal, the curve wraps
           corners b and d: (bottom,right) + (top,left); otherwise the other pair */
        if (((sa + sb + sc + sd) < 0) === (sa < 0)) { link(e[0], e[1]); link(e[2], e[3]); }
        else { link(e[0], e[3]); link(e[1], e[2]); }
      }
    }
    var chains = [], used = {}, k;
    function walk(start) {
      var chain = [pts[start]], cur = start, prev = null;
      used[start] = 1;
      for (;;) {
        var nb = adj[cur], nxt = null, q;
        for (q = 0; q < nb.length; q++) if (nb[q] !== prev && !used[nb[q]]) { nxt = nb[q]; break; }
        if (nxt == null) {
          var loop = false;
          for (q = 0; q < nb.length; q++) if (nb[q] === start && chain.length > 2) loop = true;
          if (loop) chain.push(pts[start]);
          return { pts: chain, closed: loop };
        }
        used[nxt] = 1; chain.push(pts[nxt]); prev = cur; cur = nxt;
      }
    }
    for (k in pts) if (!used[k] && adj[k].length === 1) chains.push(walk(k));   /* open curves first */
    for (k in pts) if (!used[k]) chains.push(walk(k));                          /* remaining loops */
    return chains;
  }

  /* boundary of an arbitrary region predicate (boolean combos like and/or):
     marching squares on the ±1 indicator, edge crossings refined by bisection */
  function levelCurvesPred(pred, x0, x1, y0, y1, res) {
    function refine(xa, ya, sa, xb, yb, sb) {
      var ax = xa, ay = ya, bx = xb, by = yb, ina = sa < 0, k;
      for (k = 0; k < 12; k++) {
        var mx = (ax + bx) / 2, my = (ay + by) / 2;
        if (!!pred(mx, my) === ina) { ax = mx; ay = my; } else { bx = mx; by = my; }
      }
      return [(ax + bx) / 2, (ay + by) / 2];
    }
    return levelCurves2D(function (x, y) { return pred(x, y) ? -1 : 1; }, 0, x0, x1, y0, y1, res, refine);
  }

  /* ---- Lagrange candidates on a constraint curve ----------------------------
     Where ∇f ∥ ∇g on g = c, i.e. the 2-D cross product h = f_x·g_y − f_y·g_x
     changes sign along the traced chains: exactly the ∇f = λ∇g points.  fval,
     gradF, gradG are callbacks (x,y) → value / [∂x, ∂y].  Each candidate gets
     f, λ = ∇f·∇g/|∇g|², and a max/min tag from its neighbours on the curve. */
  function lagrangeCandidates(chains, fval, gradF, gradG) {
    var out = [], ci, i;
    for (ci = 0; ci < chains.length; ci++) {
      var ch = chains[ci].pts;
      if (ch.length < 2) continue;
      var H = [];
      for (i = 0; i < ch.length; i++) {
        var gf = gradF(ch[i][0], ch[i][1]), gg = gradG(ch[i][0], ch[i][1]);
        var hv = gf[0] * gg[1] - gf[1] * gg[0];
        H.push(hv === 0 ? 1e-30 : hv);               /* exact zeros: keep a sign */
      }
      for (i = 0; i + 1 < ch.length; i++) {
        var h0 = H[i], h1 = H[i + 1];
        if (!isFinite(h0) || !isFinite(h1) || (h0 < 0) === (h1 < 0)) continue;
        var t = h0 / (h0 - h1);
        var x = ch[i][0] + t * (ch[i + 1][0] - ch[i][0]), y = ch[i][1] + t * (ch[i + 1][1] - ch[i][1]);
        var gf2 = gradF(x, y), gg2 = gradG(x, y), g2 = gg2[0] * gg2[0] + gg2[1] * gg2[1];
        var lam = g2 > 1e-18 ? (gf2[0] * gg2[0] + gf2[1] * gg2[1]) / g2 : NaN;
        var fc = fval(x, y), fa = fval(ch[i][0], ch[i][1]), fb = fval(ch[i + 1][0], ch[i + 1][1]);
        var kind = (fc >= fa && fc >= fb) ? 'max' : ((fc <= fa && fc <= fb) ? 'min' : '');
        out.push({ x: x, y: y, f: fc, lam: lam, kind: kind });
      }
    }
    var ded = [], di, dj;
    for (di = 0; di < out.length; di++) {            /* drop near-coincident duplicates */
      var keep = true;
      for (dj = 0; dj < ded.length; dj++) {
        var ddx = out[di].x - ded[dj].x, ddy = out[di].y - ded[dj].y;
        if (ddx * ddx + ddy * ddy < 1e-6) { keep = false; break; }
      }
      if (keep) ded.push(out[di]);
    }
    return ded;
  }

  /* small dense linear solve (Gauss with partial pivoting) for the 4×4 Newton system */
  function solveLin(A, b) {
    var n = b.length, M = [], i, j, k;
    for (i = 0; i < n; i++) M.push(A[i].concat([b[i]]));
    for (i = 0; i < n; i++) {
      var piv = i;
      for (j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[piv][i])) piv = j;
      if (!(Math.abs(M[piv][i]) > 1e-14)) return null;
      var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
      for (j = i + 1; j < n; j++) {
        var f = M[j][i] / M[i][i];
        for (k = i; k <= n; k++) M[j][k] -= f * M[i][k];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = M[i][n];
      for (k = i + 1; k < n; k++) s -= M[i][k] * x[k];
      x[i] = s / M[i][i];
    }
    return x;
  }

  /* ---- Lagrange candidates on a constraint SURFACE {g = 0} in ℝ³ ------------
     Critical points of f restricted to the 2-manifold {g = 0}: Newton on the
     full system  ∇f − λ∇g = 0,  g = 0  in (p, λ), seeded at marching-tets
     vertices where the TANGENTIAL part of ∇f is smallest.  Each candidate is
     classified by sampling a ring on the surface around it (snapToLevel).
     If ∇f ∥ ∇g on (almost) the whole mesh, f is constant along the surface:
     every point is critical, and that is reported as `degenerate`. */
  function lagrangeCandidates3D(mesh, fval, gval, gradF, gradG, hessF, hessG, R) {
    var pos = mesh.pos, np = pos.length, i;
    if (!np) return { cands: [], degenerate: false };
    var step = Math.max(1, Math.floor(np / 900)), seeds = [], tiny = 0, tested = 0;
    for (i = 0; i < np; i += step) {
      var p = pos[i], gf = gradF(p[0], p[1], p[2]), gg = gradG(p[0], p[1], p[2]);
      var g2 = dot(gg, gg);
      if (!(g2 > 1e-18) || !isFinite(gf[0] + gf[1] + gf[2])) continue;
      var pr = dot(gf, gg) / g2;
      var T = [gf[0] - pr * gg[0], gf[1] - pr * gg[1], gf[2] - pr * gg[2]];
      var d = norm(T) / (norm(gf) + 1e-30);
      if (!isFinite(d)) continue;
      tested++;
      if (d < 0.02) tiny++;
      seeds.push({ p: p, d: d });
    }
    if (tested >= 8 && tiny > 0.4 * tested) return { cands: [], degenerate: true };
    seeds.sort(function (a, b) { return a.d - b.d; });
    var picked = [], si, sj;
    for (si = 0; si < seeds.length && picked.length < 16; si++) {
      if (seeds[si].d > 0.5) break;
      var okp = true;
      for (sj = 0; sj < picked.length; sj++) {
        var dd = sub(seeds[si].p, picked[sj]);
        if (dot(dd, dd) < R * R * 0.015) { okp = false; break; }
      }
      if (okp) picked.push(seeds[si].p);
    }
    var out = [];
    for (si = 0; si < picked.length; si++) {
      var x = picked[si].slice(), gg0 = gradG(x[0], x[1], x[2]), gf0 = gradF(x[0], x[1], x[2]);
      var lam = dot(gf0, gg0) / Math.max(dot(gg0, gg0), 1e-30), it, okc = false;
      for (it = 0; it < 30; it++) {
        var gfx = gradF(x[0], x[1], x[2]), ggx = gradG(x[0], x[1], x[2]), gv = gval(x[0], x[1], x[2]);
        var Fv = [gfx[0] - lam * ggx[0], gfx[1] - lam * ggx[1], gfx[2] - lam * ggx[2], gv];
        if (Math.sqrt(Fv[0] * Fv[0] + Fv[1] * Fv[1] + Fv[2] * Fv[2]) < 1e-7 * (1 + norm(gfx)) && Math.abs(gv) < 1e-7 * (1 + R)) { okc = true; break; }
        var Hf = hessF(x[0], x[1], x[2]), Hg = hessG(x[0], x[1], x[2]);
        var A = [
          [Hf[0][0] - lam * Hg[0][0], Hf[0][1] - lam * Hg[0][1], Hf[0][2] - lam * Hg[0][2], -ggx[0]],
          [Hf[1][0] - lam * Hg[1][0], Hf[1][1] - lam * Hg[1][1], Hf[1][2] - lam * Hg[1][2], -ggx[1]],
          [Hf[2][0] - lam * Hg[2][0], Hf[2][1] - lam * Hg[2][1], Hf[2][2] - lam * Hg[2][2], -ggx[2]],
          [ggx[0], ggx[1], ggx[2], 0]
        ];
        var dx = solveLin(A, [-Fv[0], -Fv[1], -Fv[2], -Fv[3]]);
        if (!dx) break;
        var sl = Math.sqrt(dx[0] * dx[0] + dx[1] * dx[1] + dx[2] * dx[2]), sc = sl > 0.25 * R ? 0.25 * R / sl : 1;
        x[0] += sc * dx[0]; x[1] += sc * dx[1]; x[2] += sc * dx[2]; lam += sc * dx[3];
        if (!isFinite(x[0] + x[1] + x[2] + lam)) break;
      }
      if (!okc) continue;
      if (Math.abs(x[0]) > R * 1.02 || Math.abs(x[1]) > R * 1.02 || Math.abs(x[2]) > R * 1.02) continue;
      var dup = false, oi;
      for (oi = 0; oi < out.length; oi++) {
        var d2 = (x[0] - out[oi].x) * (x[0] - out[oi].x) + (x[1] - out[oi].y) * (x[1] - out[oi].y) + (x[2] - out[oi].z) * (x[2] - out[oi].z);
        if (d2 < R * R * 4e-4) { dup = true; break; }
      }
      if (dup) continue;
      /* classify against a ring on the surface around the candidate */
      var nh = normalize(gradG(x[0], x[1], x[2]));
      var t1 = normalize(cross(nh, Math.abs(nh[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), t2 = cross(nh, t1);
      var eps = 0.03 * R, fc = fval(x[0], x[1], x[2]), rHi = -Infinity, rLo = Infinity, nOk = 0, th;
      for (th = 0; th < 12; th++) {
        var an = th * Math.PI / 6, cs = Math.cos(an), sn = Math.sin(an);
        var q0 = [x[0] + eps * (t1[0] * cs + t2[0] * sn), x[1] + eps * (t1[1] * cs + t2[1] * sn), x[2] + eps * (t1[2] * cs + t2[2] * sn)];
        var sp = snapToLevel(gval, 0, q0, eps);
        if (!sp.ok) continue;
        var fq = fval(sp.p[0], sp.p[1], sp.p[2]);
        if (!isFinite(fq)) continue;
        nOk++;
        if (fq > rHi) rHi = fq; if (fq < rLo) rLo = fq;
      }
      var kind = '';
      if (nOk >= 8 && isFinite(fc)) { if (fc >= rHi) kind = 'max'; else if (fc <= rLo) kind = 'min'; }
      out.push({ x: x[0], y: x[1], z: x[2], f: fc, lam: lam, kind: kind });
    }
    return { cands: out, degenerate: false };
  }

  VF.Manifolds = {
    curveFrame: curveFrame, surfaceLocal: surfaceLocal, surfaceGrid: surfaceGrid,
    marchingTets: marchingTets, criticalPoints: criticalPoints, gradAt: gradAt,
    snapToLevel: snapToLevel, levelCurves2D: levelCurves2D, levelCurvesPred: levelCurvesPred,
    lagrangeCandidates: lagrangeCandidates, lagrangeCandidates3D: lagrangeCandidates3D
  };

})(window.VF = window.VF || {});
