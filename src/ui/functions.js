/* =============================================================================
 * ui/functions.js: the Functions lab: f(x) / f(x,y) / f(x,y,z), Taylor
 * expansion, Jacobians, constrained extrema and the continuity classifier
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var regR = K.regR, regDomain = K.regDomain, setDomainR = K.setDomainR, select = K.select, checkbox = K.checkbox, button = K.button;
  var setError = K.setError, setFormula = K.setFormula, setStats = K.setStats, updateColorbar = K.updateColorbar, hideColorbar = K.hideColorbar, domain = K.domain;
  var spacingFor = K.spacingFor, markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, vrow = K.vrow, jrow = K.jrow;
  var matHtml = K.matHtml;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  FUNCTIONS pipeline                                                       */
  /* ======================================================================== */
  var FUNC_PRESETS = {
    '1d': [
      { name: 'cubic', f: 'x^3 - 3*x' }, { name: 'sine', f: 'sin(x)' }, { name: 'gaussian', f: 'exp(-x^2)' },
      { name: 'Runge', f: '1/(1+x^2)' }, { name: 'exp', f: 'exp(x)' }, { name: 'ln', f: 'ln(x)' },
      { name: 'damped wave', f: 'exp(-0.3*x)*sin(3*x)' },
      { name: 'step', f: '(x > 0)' }, { name: 'pulse', f: '(|x| < 1)' },
      { name: 'abs (piecewise)', f: '(x<0)*(-x) + (x>=0)*x' }, { name: 'staircase', f: 'floor(x)' },
      { name: 'piecewise (cases)', f: 'cases(x<0, sin(x), x<2, x^2, 4x-4)' },
      { name: '√|x| (kink)', f: 'sqrt(|x|)' }, { name: '1/x (pole)', f: '1/x' }
    ],
    '2d': [
      { name: 'saddle', f: 'x^2 - y^2' }, { name: 'ripple', f: 'sin(x)*cos(y)' }, { name: 'gaussian', f: 'exp(-(x^2+y^2))' },
      { name: 'paraboloid', f: 'x^2 + y^2' }, { name: 'monkey saddle', f: 'x^3 - 3*x*y^2' }, { name: 'sombrero', f: 'sin(rho)/rho' },
      { name: 'cone √(x²+y²)', f: 'sqrt(x^2+y^2)' }, { name: 'abs ridge |x|−|y|', f: '|x|-|y|' }, { name: 'tanh step', f: 'tanh(x)' },
      { name: 'disk mask', f: '(x^2+y^2 < 4)' }, { name: 'square mask', f: '(|x|<2)*(|y|<2)' }, { name: 'annulus', f: '(1 < x^2+y^2 < 4)' },
      { name: 'norm cone ‖(x,y)‖', f: '||x,y||' }, { name: 'xy/‖(x,y)‖ at 0', f: 'if(||x,y|| != 0, x*y/||x,y||, 0)' },
      { name: 'saddle + circle g = 4', f: 'x^2 - y^2', constraints: ['x^2 + y^2 = 4'] },
      { name: 'region 2 < x²+y² < 9', f: 'x^2 - y^2', constraints: ['2 < x^2 + y^2 < 9'] },
      { name: 'paraboloid on disk', f: 'x^2 + y^2 - x - y', constraints: ['x^2 + y^2 <= 4'] }
    ],
    '3d': [
      { name: 'sphere', f: 'x^2+y^2+z^2' }, { name: 'waves', f: 'sin(x)+cos(y)+cos(z)' },
      { name: 'gaussian', f: 'exp(-(x^2+y^2+z^2)/3)' }, { name: 'hyperboloid', f: 'x^2+y^2-z^2' },
      { name: 'exp(xyz)', f: 'exp(x*y*z*0.1)' }, { name: '|x|+|y|+|z|', f: '|x|+|y|+|z|' },
      { name: 'plane on sphere r = 3', f: '2x - y - 2z', constraints: ['x^2 + y^2 + z^2 = 9'] }
    ],
    'vec': [
      { name: 'rotation', F: ['-y', 'x', '0'] }, { name: 'source', F: ['x', 'y', 'z'] },
      { name: 'shear', F: ['y', '0', '0'] }, { name: 'z² map', F: ['x^2 - y^2', '2*x*y', 'z'] },
      { name: 'saddle', F: ['x', '-y', '0'] }, { name: 'swirl+sink', F: ['-y - 0.3*x', 'x - 0.3*y', '-0.3*z'] }
    ]
  };
  var funcParseTimer = null;
  function funcExpr() { return state.funcType === '1d' ? state.f1d : (state.funcType === '2d' ? state.f2d : state.f3d); }
  function setFuncExpr(v) { if (state.funcType === '1d') state.f1d = v; else if (state.funcType === '2d') state.f2d = v; else state.f3d = v; }
  function funcVars() { return state.funcType === '1d' ? ['x'] : (state.funcType === '2d' ? ['x', 'y'] : ['x', 'y', 'z']); }
  function funcPoint() { return { x: state.fa, y: state.fb, z: state.fc, t: state.t }; }
  /* points on one constraint row's boundary must satisfy every OTHER row's mask */
  function consOtherMask(rowsC, rowIdx, tc) {
    var fns = [], q;
    for (q = 0; q < rowsC.length; q++) if (rowsC[q].idx !== rowIdx && rowsC[q].mask) fns.push(rowsC[q].mask);
    if (!fns.length) return null;
    return function (x2, y2, z2) { for (var w = 0; w < fns.length; w++) if (fns[w](x2, y2, z2 || 0, tc) === 0) return false; return true; };
  }
  function requestFuncParse() { if (funcParseTimer) clearTimeout(funcParseTimer); funcParseTimer = setTimeout(parseFunc, 200); }
  function factorial(k) { var r = 1; for (var i = 2; i <= k; i++) r *= i; return r; }

  function parseFunc() {
    if (state.mode !== 'functions') return;
    if (state.funcType === 'vec') return parseVecFunc();
    parseScalarFunc();
  }

  function parseScalarFunc() {
    var P = VF.Parser, AD = VF.Autodiff, expr = funcExpr();
    var v = P.validate(expr);
    markInput(ctl.fInput, v.ok);
    if (!v.ok) { setError('f: ' + v.message); return; }
    setError(null);
    var comp = P.compile(expr), Pt = funcPoint(), vars = funcVars();
    var value = comp.fn(Pt.x, Pt.y, Pt.z, Pt.t);
    var adOK = true, grad, hess;
    try { grad = AD.gradientAD(comp.ast, Pt, vars); hess = AD.hessianAD(comp.ast, Pt, vars); }
    catch (e) { adOK = false; grad = AD.gradientFD(comp.fn, Pt, vars); hess = AD.hessianFD(comp.fn, Pt, vars); }
    /* extra functions to plot alongside (1-D curves & 2-D surfaces) */
    var extras = [];
    for (var ei = 0; ei < state.extras.length; ei++) {
      var ex = (state.extras[ei] || '').trim();
      if (ctl.extraInputs && ctl.extraInputs[ei]) markInput(ctl.extraInputs[ei], ex === '' || P.validate(ex).ok);
      if (ex !== '' && P.validate(ex).ok) extras.push({ fn: P.compile(ex).fn, color: extraColorNum(ei) });
    }
    /* constraints (Nebenbedingungen): each row is a relation; inequalities mask
       the region (ANDed), every row contributes boundary curves {g = 0} */
    var consRows = [], maskRows = [], shown = [], ci;
    for (ci = 0; ci < state.constraints.length; ci++) {
      var csrc = (state.constraints[ci] || '').trim();
      var pc = csrc === '' ? null : P.parseConstraint(csrc);
      if (ctl.consInputs && ctl.consInputs[ci]) markInput(ctl.consInputs[ci], csrc === '' || (pc && pc.ok));
      if (!pc || !pc.ok) continue;
      shown.push(csrc);
      var row = { idx: ci, kind: pc.kind, mask: pc.fn, boundaries: pc.boundaries, generic: pc.generic };
      consRows.push(row);
      if (row.mask) maskRows.push(row);
    }
    var regionFn = null;
    if (maskRows.length) regionFn = function (x, y, z, t) {
      for (var q = 0; q < maskRows.length; q++) if (maskRows[q].mask(x, y, z, t) === 0) return 0;
      return 1;
    };
    cur.func = {
      type: 'scalar', expr: expr, ast: comp.ast, fn: comp.fn, vars: vars, P: Pt, value: value,
      grad: grad, hess: hess, adOK: adOK, extras: extras,
      regionFn: regionFn, cons: consRows.length ? { rows: consRows, shown: shown } : null
    };
    renderFunc(); updateFuncReadout();
  }

  function parseVecFunc() {
    var P = VF.Parser, AD = VF.Autodiff, FM = VF.FieldMath;
    var ex = [state.vecF1, state.vecF2, state.vecF3], ins = [ctl.vf1, ctl.vf2, ctl.vf3];
    for (var i = 0; i < 3; i++) { var vv = P.validate(ex[i]); markInput(ins[i], vv.ok); if (!vv.ok) { setError('F' + (i + 1) + ': ' + vv.message); return; } }
    setError(null);
    var c = [P.compile(ex[0]), P.compile(ex[1]), P.compile(ex[2])];
    var fns = [c[0].fn, c[1].fn, c[2].fn], asts = [c[0].ast, c[1].ast, c[2].ast];
    var Pt = { x: state.fa, y: state.fb, z: state.fc, t: state.t }, vars = ['x', 'y', 'z'];
    var adOK = true, J;
    try { J = AD.jacobianAD(asts, Pt, vars); } catch (e) { adOK = false; J = AD.jacobianFD(fns, Pt, vars); }
    cur.func = {
      type: 'vec', vf: FM.vectorField(fns[0], fns[1], fns[2], 'F'), P: Pt, jac: J, adOK: adOK,
      Fval: [fns[0](Pt.x, Pt.y, Pt.z, Pt.t), fns[1](Pt.x, Pt.y, Pt.z, Pt.t), fns[2](Pt.x, Pt.y, Pt.z, Pt.t)]
    };
    renderFunc(); updateFuncReadout();
  }


  function robustRange(vals) {
    var v = vals.slice().sort(function (a, b) { return a - b; }), n = v.length;
    if (!n) return { lo: -1, hi: 1 };
    var lo = v[Math.floor(0.02 * (n - 1))], hi = v[Math.floor(0.98 * (n - 1))];
    if (!(hi > lo)) { lo = v[0]; hi = v[n - 1]; if (!(hi > lo)) hi = lo + 1; }
    return { lo: lo, hi: hi };
  }
  function clampH(z, R) { var m = R * 1.3; return z < -m ? -m : (z > m ? m : z); }
  function dummySurface(n) { var a = []; for (var i = 0; i < n * n; i++) a.push([NaN, NaN, NaN]); return a; }
  /* median of |Δ| between consecutive samples: used to spot discontinuities (jumps ≫ typical step) */
  function medStep(vals) {
    var d = [];
    for (var i = 1; i < vals.length; i++) if (isFinite(vals[i]) && isFinite(vals[i - 1])) d.push(Math.abs(vals[i] - vals[i - 1]));
    if (!d.length) return 0;
    d.sort(function (a, b) { return a - b; });
    return d[d.length >> 1];
  }

  function renderFunc() {
    if (state.mode !== 'functions' || !cur.func) return;
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix();
    if (state.funcType === 'vec') return renderVecFunc();
    renderScalarFunc();
  }

  function renderVecFunc() {
    var f = cur.func, R = state.R, map = VF.Colormaps.get(state.colormap), d = domain(), N = 6;
    var samples = null, fieldOpts = null;
    if (state.fShowField) {
      samples = VF.FieldMath.sampleVector(f.vf, d, N, state.t);
      fieldOpts = { map: map, min: samples.min, max: samples.max, scale: state.arrowScale, normalize: state.normalize, spacing: (2 * R) / (N - 1) };
      updateColorbar(state.colormap, samples.min, samples.max, '|F|', false);
    } else hideColorbar();
    viz.renderFuncVector({ samples: samples, fieldOpts: fieldOpts, jac: state.fShowJac ? f.jac : null, point: [state.fa, state.fb, state.fc], cubeSize: Math.max(0.8, R * 0.28) }, {});
    setStats('F(x,y,z) &nbsp; det J = ' + fmt(VF.LinAlg.det(f.jac)) + ' &nbsp; ∇·F = tr J = ' + fmt(VF.LinAlg.trace(f.jac)) + (f.adOK ? '' : ' &nbsp;(FD)'));
    setFormula('F = (' + esc(state.vecF1) + ', ' + esc(state.vecF2) + ', ' + esc(state.vecF3) + ')');
  }

  var FUNC_COLORS = [0xffb454, 0x63e6a0, 0xff5cc8, 0x4cc9f0, 0xffd166, 0xb28dff];
  /* ℝ³ constraint surfaces + Lagrange candidates are cached: they depend on
     f, the constraints and the domain, but not on the movable point P */
  var lag3Cache = { key: null };

  function renderScalarFunc() {
    var f = cur.func, AD = VF.Autodiff, map = VF.Colormaps.get(state.colormap), R = state.R, deg = state.taylorDeg, i;
    var extras = f.extras || [];
    viz.clearFunc();
    /* Wolfram-style RegionFunction: outside R ≠ 0 the value becomes NaN, and the
       NaN machinery (curve breaks, dropped triangles, robust range) hides it */
    function rmask(fn) {
      var reg = f.regionFn;
      if (!reg) return fn;
      return function (x, y, z, t) { return reg(x, y, z, t) !== 0 ? fn(x, y, z, t) : NaN; };
    }
    function inRegion(x, y) { return !f.regionFn || f.regionFn(x, y, 0, state.t) !== 0; }

    if (state.funcType === '1d') {
      hideColorbar();
      var res = state.funcRes, xs = [], series = [{ fn: rmask(f.fn), raw: f.fn, color: 0x6ba6ff, primary: true }], allVals = [], si;
      for (i = 0; i < res; i++) xs.push(-R + 2 * R * i / (res - 1));
      for (i = 0; i < extras.length; i++) series.push({ fn: rmask(extras[i].fn), raw: extras[i].fn, color: extras[i].color });
      /* per-sample region indicator + a bisector so segments end exactly on the boundary */
      var rin1 = null;
      if (f.regionFn) { rin1 = []; for (i = 0; i < res; i++) rin1.push(inRegion(xs[i], 0) ? 1 : 0); }
      function bisectX(xA, xB, inA) {
        var a2 = xA, b2 = xB, k2;
        for (k2 = 0; k2 < 20; k2++) {
          var m2 = (a2 + b2) / 2;
          if ((f.regionFn(m2, 0, 0, state.t) !== 0) === (inA === 1)) a2 = m2; else b2 = m2;
        }
        return (a2 + b2) / 2;
      }
      for (si = 0; si < series.length; si++) {
        series[si].vals = [];
        for (i = 0; i < res; i++) { var val = series[si].fn(xs[i], 0, 0, state.t); series[si].vals.push(val); if (isFinite(val)) allVals.push(val); }
      }
      var rr = robustRange(allVals), VS = R / Math.max(1e-3, Math.max(Math.abs(rr.lo), Math.abs(rr.hi)));
      var rangeSpan = Math.max(1e-9, rr.hi - rr.lo);
      for (si = 0; si < series.length; si++) {
        var s = series[si], main = [], tay = null, marker = null;
        var jumpThresh = Math.max(1e-9, 12 * medStep(s.vals));   /* break the line across discontinuities (step / indicator fns) */
        for (i = 0; i < res; i++) {
          if (rin1 && i > 0 && rin1[i] !== rin1[i - 1]) {        /* cap / start the segment exactly at the region edge */
            var xbnd = bisectX(xs[i - 1], xs[i], rin1[i - 1]), vb = s.raw(xbnd, 0, 0, state.t);
            if (isFinite(vb)) {
              if (!rin1[i]) main.push([xbnd, 0, clampH(vb * VS, R)]);
              else { main.push([NaN, NaN, NaN]); main.push([xbnd, 0, clampH(vb * VS, R)]); }
            }
          }
          if (!isFinite(s.vals[i])) { main.push([NaN, NaN, NaN]); continue; }
          if (i > 0 && isFinite(s.vals[i - 1])) {
            var dv = Math.abs(s.vals[i] - s.vals[i - 1]);
            if (dv > jumpThresh && dv > 0.2 * rangeSpan) main.push([NaN, NaN, NaN]);
          }
          main.push([xs[i], 0, clampH(s.vals[i] * VS, R)]);
        }
        if (s.primary) {
          if (state.showTaylor && f.adOK) { tay = []; for (i = 0; i < res; i++) { var tv = inRegion(xs[i], 0) ? AD.taylorValueAt(f.ast, f.P, { x: xs[i], y: 0, z: 0 }, deg) : NaN; tay.push(isFinite(tv) ? [xs[i], 0, clampH(tv * VS, R)] : [NaN, NaN, NaN]); } }
          marker = isFinite(f.value) ? [state.fa, 0, clampH(f.value * VS, R)] : null;
        }
        viz.renderFunctionCurve({ main: state.showFunc ? main : [], taylor: tay, marker: marker }, { color: s.color });
      }
      setStats('f(x) &nbsp; f(a) = ' + fmt(f.value) + (extras.length ? ' &nbsp;·&nbsp; ' + (extras.length + 1) + ' curves' : '') + (f.adOK ? '' : ' &nbsp;(FD)'));
    } else if (state.funcType === '2d') {
      var N = Math.min(state.funcRes, 90), gx = [], series2 = [{ fn: rmask(f.fn), raw: f.fn, color: null, primary: true }], allV = [], b, a, k;
      for (i = 0; i < N; i++) gx.push(-R + 2 * R * i / (N - 1));
      for (i = 0; i < extras.length; i++) series2.push({ fn: rmask(extras[i].fn), raw: extras[i].fn, color: extras[i].color });
      for (k = 0; k < series2.length; k++) { series2[k].vv = []; for (b = 0; b < N; b++) for (a = 0; a < N; a++) { var v2 = series2[k].fn(gx[a], gx[b], 0, state.t); series2[k].vv.push(v2); if (isFinite(v2)) allV.push(v2); } }
      var rr2 = robustRange(allV), VS2 = R / Math.max(1e-3, Math.max(Math.abs(rr2.lo), Math.abs(rr2.hi)));
      /* region clipping: mixed cells leave the grid mesh and are re-triangulated
         against the constraint boundary (edge crossings found by bisection),
         so the region edge is smooth instead of pixelated */
      var CN = N - 1, ins2 = null, skip2 = null, edgeCross = {};
      if (f.regionFn) {
        ins2 = new Array(N * N);
        for (b = 0; b < N; b++) for (a = 0; a < N; a++) ins2[b * N + a] = inRegion(gx[a], gx[b]) ? 1 : 0;
        skip2 = new Array(CN * CN);
        for (b = 0; b < CN; b++) for (a = 0; a < CN; a++) {
          var s4 = ins2[b * N + a] + ins2[b * N + a + 1] + ins2[(b + 1) * N + a] + ins2[(b + 1) * N + a + 1];
          skip2[b * CN + a] = (s4 > 0 && s4 < 4) ? 1 : 0;
        }
      }
      function crossPt(key, x1c, y1c, in1, x2c, y2c) {
        if (!edgeCross[key]) {
          var ax = x1c, ay = y1c, bx2 = x2c, by2 = y2c, kq;
          for (kq = 0; kq < 12; kq++) {
            var mx = (ax + bx2) / 2, my = (ay + by2) / 2;
            if ((f.regionFn(mx, my, 0, state.t) !== 0) === (in1 === 1)) { ax = mx; ay = my; } else { bx2 = mx; by2 = my; }
          }
          edgeCross[key] = [(ax + bx2) / 2, (ay + by2) / 2];
        }
        return edgeCross[key];
      }
      function buildSoup(rawFn, vvArr) {
        if (!ins2) return null;
        var pos3 = [], val3 = [], bq, aq, kq;
        function push3(px, py, pv) { pos3.push([px, py, clampH(pv * VS2, R)]); val3.push(pv); }
        for (bq = 0; bq < CN; bq++) for (aq = 0; aq < CN; aq++) {
          if (!skip2[bq * CN + aq]) continue;
          var cx = [gx[aq], gx[aq + 1], gx[aq + 1], gx[aq]], cy = [gx[bq], gx[bq], gx[bq + 1], gx[bq + 1]];
          var iv = [ins2[bq * N + aq], ins2[bq * N + aq + 1], ins2[(bq + 1) * N + aq + 1], ins2[(bq + 1) * N + aq]];
          var vc = [vvArr[bq * N + aq], vvArr[bq * N + aq + 1], vvArr[(bq + 1) * N + aq + 1], vvArr[(bq + 1) * N + aq]];
          var ek = ['h' + aq + '_' + bq, 'v' + (aq + 1) + '_' + bq, 'h' + aq + '_' + (bq + 1), 'v' + aq + '_' + bq];
          var diag = (iv[0] && iv[2] && !iv[1] && !iv[3]) || (iv[1] && iv[3] && !iv[0] && !iv[2]);
          if (diag && !inRegion((cx[0] + cx[1]) / 2, (cy[0] + cy[2]) / 2)) {
            for (kq = 0; kq < 4; kq++) {                      /* two separate corner triangles */
              if (!iv[kq]) continue;
              var kn = (kq + 1) % 4, kp = (kq + 3) % 4;
              var pA = crossPt(ek[kq], cx[kq], cy[kq], 1, cx[kn], cy[kn]);
              var pB = crossPt(ek[kp], cx[kq], cy[kq], 1, cx[kp], cy[kp]);
              var vA = rawFn(pA[0], pA[1], 0, state.t), vB = rawFn(pB[0], pB[1], 0, state.t);
              if (isFinite(vc[kq]) && isFinite(vA) && isFinite(vB)) { push3(cx[kq], cy[kq], vc[kq]); push3(pA[0], pA[1], vA); push3(pB[0], pB[1], vB); }
            }
            continue;
          }
          var poly = [], pval = [], bad = false;
          for (kq = 0; kq < 4; kq++) {
            var k2q = (kq + 1) % 4;
            if (iv[kq]) { poly.push([cx[kq], cy[kq]]); pval.push(vc[kq]); }
            if (iv[kq] !== iv[k2q]) {
              var cpq = crossPt(ek[kq], cx[iv[kq] ? kq : k2q], cy[iv[kq] ? kq : k2q], 1, cx[iv[kq] ? k2q : kq], cy[iv[kq] ? k2q : kq]);
              poly.push(cpq); pval.push(rawFn(cpq[0], cpq[1], 0, state.t));
            }
          }
          for (kq = 0; kq < pval.length; kq++) if (!isFinite(pval[kq])) bad = true;
          if (bad) continue;
          for (kq = 1; kq + 1 < poly.length; kq++) {          /* fan triangulation */
            push3(poly[0][0], poly[0][1], pval[0]);
            push3(poly[kq][0], poly[kq][1], pval[kq]);
            push3(poly[kq + 1][0], poly[kq + 1][1], pval[kq + 1]);
          }
        }
        return { pos: pos3, val: val3 };
      }
      for (k = 0; k < series2.length; k++) {
        var s2 = series2[k], pos = [];
        for (b = 0; b < N; b++) for (a = 0; a < N; a++) { var val2 = s2.vv[b * N + a]; pos.push(isFinite(val2) ? [gx[a], gx[b], clampH(val2 * VS2, R)] : [NaN, NaN, NaN]); }
        if (s2.primary) {
          var tpos = null, tvv = null, tSoup = null;
          if (state.showTaylor && f.adOK) {
            tpos = []; tvv = [];
            var tEval = function (x2, y2, z2, t2) { return AD.taylorValueAt(f.ast, f.P, { x: x2, y: y2, z: 0 }, deg); };
            for (b = 0; b < N; b++) for (a = 0; a < N; a++) { var tval = inRegion(gx[a], gx[b]) ? tEval(gx[a], gx[b]) : NaN; tvv.push(tval); tpos.push(isFinite(tval) ? [gx[a], gx[b], clampH(tval * VS2, R)] : [NaN, NaN, NaN]); }
            tSoup = buildSoup(tEval, tvv);           /* the Taylor sheet is clipped like the surface */
          }
          var mk2 = isFinite(f.value) ? [state.fa, state.fb, clampH(f.value * VS2, R)] : null, gA = null;
          if (state.showGradArrow && mk2) { var g0 = f.grad[0], g1 = f.grad[1], gn = Math.sqrt(g0 * g0 + g1 * g1); if (gn > 1e-9) { var L = R * 0.4; gA = { from: mk2, to: [state.fa + g0 / gn * L, state.fb + g1 / gn * L, mk2[2]] }; } }
          viz.renderFunctionSurface({ res: N, pos: state.showFunc ? pos : dummySurface(N), val: s2.vv, min: rr2.lo, max: rr2.hi, skipCells: skip2, soup: state.showFunc ? buildSoup(s2.raw, s2.vv) : null, taylorPos: tpos, taylorSoup: tSoup, marker: mk2, grad: gA }, { map: map });
        } else viz.renderFunctionSurface({ res: N, pos: pos, val: s2.vv, min: rr2.lo, max: rr2.hi, skipCells: skip2, soup: buildSoup(s2.raw, s2.vv) }, { solidColor: s2.color });
      }
      updateColorbar(state.colormap, rr2.lo, rr2.hi, 'f(x,y)', false);
      /* total derivative, made visible: the tangent plane IS the linear map
         df, and the probe compares the slice's true slope with df's prediction */
      var tdExt = R * 0.35, tdF0 = f.value, tdGx = f.grad[0], tdGy = f.grad[1];
      if (state.tdPlane && isFinite(tdF0) && isFinite(tdGx) && isFinite(tdGy)) {
        var pres = 8, ppos = [], pb, pa;
        for (pb = 0; pb < pres; pb++) for (pa = 0; pa < pres; pa++) {
          var plx = state.fa - tdExt + 2 * tdExt * pa / (pres - 1), ply = state.fb - tdExt + 2 * tdExt * pb / (pres - 1);
          var plz = tdF0 + tdGx * (plx - state.fa) + tdGy * (ply - state.fb);
          ppos.push([plx, ply, clampH(plz * VS2, R)]);
        }
        viz.renderFunctionSurface({ res: pres, pos: ppos }, { solidColor: 0x63e6a0 });
      }
      if (state.tdProbe) {
        var vc = Math.cos(state.tdPhi), vsn = Math.sin(state.tdPhi), MP = 60, slice = [], pi2;
        for (pi2 = 0; pi2 <= MP; pi2++) {
          var tt = -tdExt + 2 * tdExt * pi2 / MP;
          var sxx = state.fa + tt * vc, syy = state.fb + tt * vsn;
          var sv = f.fn(sxx, syy, 0, state.t);
          slice.push(isFinite(sv) ? [sxx, syy, clampH(sv * VS2, R)] : [NaN, NaN, NaN]);
        }
        viz.renderFunctionCurve({ main: slice }, { color: 0xb28dff });
        if (isFinite(tdF0)) {
          var Dv = VF.DiffCheck.dirDeriv(f.fn, f.P, [vc, vsn], ['x', 'y']);
          var linSlope = tdGx * vc + tdGy * vsn, tEnd = tdExt * 0.85;
          var base = [state.fa, state.fb, clampH(tdF0 * VS2, R)];
          /* one-sided on purpose: D_v f is a one-sided limit */
          if (isFinite(Dv)) viz.renderFunctionCurve({ main: [base, [state.fa + tEnd * vc, state.fb + tEnd * vsn, clampH((tdF0 + Dv * tEnd) * VS2, R)]] }, { color: 0xffd166 });
          if (isFinite(linSlope)) viz.renderFunctionCurve({ main: [base, [state.fa + tEnd * vc, state.fb + tEnd * vsn, clampH((tdF0 + linSlope * tEnd) * VS2, R)]] }, { color: 0x4cc9f0 });
        }
      }
      /* constraint boundaries lifted onto the surface + Lagrange candidates:
         where ∇f ∥ ∇g the level line of f is tangent to the constraint,
         exactly the ∇f = λ∇g points of Extrema unter Nebenbedingungen */
      f.lagResult = null;
      if (f.cons) {
        var tc = state.t, rowsC = f.cons.rows, allCands = [], totalChains = 0, nOpen = 0, li2, pj, bi;
        var fOf = function (x2, y2) { return f.fn(x2, y2, 0, tc); };
        function gradOf(astL, fnL) {
          return function (x2, y2) {
            var Pl = { x: x2, y: y2, z: 0, t: tc };
            try { return AD.gradientAD(astL, Pl, ['x', 'y']); }
            catch (e) { return AD.gradientFD(fnL, Pl, ['x', 'y']); }
          };
        }
        function drawChains(chains, om) {
          var dc, dp;
          for (dc = 0; dc < chains.length; dc++) {
            totalChains++;
            if (!chains[dc].closed) nOpen++;
            var cp2 = chains[dc].pts, cpts = [];
            for (dp = 0; dp < cp2.length; dp++) {
              var cz = (!om || om(cp2[dp][0], cp2[dp][1])) ? fOf(cp2[dp][0], cp2[dp][1]) : NaN;
              cpts.push(isFinite(cz) ? [cp2[dp][0], cp2[dp][1], clampH(cz * VS2, R)] : [NaN, NaN, NaN]);
            }
            viz.renderFunctionCurve({ main: cpts }, { color: 0xff6b6b });
          }
        }
        for (li2 = 0; li2 < rowsC.length; li2++) {
          var rowC = rowsC[li2], om = consOtherMask(rowsC, rowC.idx, tc);
          for (bi = 0; bi < rowC.boundaries.length; bi++) {
            var bd = rowC.boundaries[bi];
            var gW = (function (bfn) { return function (x2, y2) { return bfn(x2, y2, 0, tc); }; })(bd.fn);
            var chains = VF.Manifolds.levelCurves2D(gW, 0, -R, R, -R, R, 96);
            var cands = VF.Manifolds.lagrangeCandidates(chains, fOf, gradOf(f.ast, f.fn), gradOf(bd.ast, bd.fn));
            for (pj = 0; pj < cands.length; pj++) if (!om || om(cands[pj].x, cands[pj].y)) allCands.push(cands[pj]);
            drawChains(chains, om);
          }
          if (rowC.generic && rowC.mask) {           /* boolean combo: trace its own edge by bisection */
            var predW = (function (mfn) { return function (x2, y2) { return mfn(x2, y2, 0, tc) !== 0; }; })(rowC.mask);
            drawChains(VF.Manifolds.levelCurvesPred(predW, -R, R, -R, R, 96), om);
          }
        }
        /* dedupe candidates across boundaries (shared corners of the feasible set) */
        var ded2 = [];
        for (li2 = 0; li2 < allCands.length; li2++) {
          var keep2 = true;
          for (pj = 0; pj < ded2.length; pj++) {
            var ddx2 = allCands[li2].x - ded2[pj].x, ddy2 = allCands[li2].y - ded2[pj].y;
            if (ddx2 * ddx2 + ddy2 * ddy2 < 1e-6) { keep2 = false; break; }
          }
          if (keep2) ded2.push(allCands[li2]);
        }
        for (li2 = 0; li2 < ded2.length && li2 < 12; li2++) {
          var cd = ded2[li2];
          if (isFinite(cd.f)) viz.renderFunctionCurve({ main: [], marker: [cd.x, cd.y, clampH(cd.f * VS2, R)] }, { markerColor: 0xffe066 });
        }
        f.lagResult = { chains: totalChains, open: nOpen, cands: ded2 };
      }
      setStats('z = f(x,y) &nbsp; f(a,b) = ' + fmt(f.value) + (extras.length ? ' &nbsp;·&nbsp; ' + (extras.length + 1) + ' surfaces' : '') +
        (f.lagResult ? ' &nbsp;·&nbsp; Lagrange: ' + f.lagResult.cands.length : '') + (f.adOK ? '' : ' &nbsp;(FD)'));
    } else {
      var sfield = VF.FieldMath.scalarField(rmask(f.fn), 'f'), nn = Math.min(state.scalarN, 16);
      var list = VF.FieldMath.sampleScalar(sfield, domain(), nn, state.t);
      /* constraint surfaces {g = c} coloured by f + Lagrange candidates ∇f = λ∇g:
         the extrema of f restricted to the surface become visible as its
         hottest / coldest spots, with the candidates marked and listed */
      f.lagResult = null;
      if (f.cons) {
        var l3key = f.expr + '|' + state.constraints.join(';') + '|' + R + '|' + state.t + '|' + state.normKind + state.normP;
        if (lag3Cache.key !== l3key) {
          var tc3 = state.t, rows3 = f.cons.rows, surfs3 = [], cands3 = [], nSurf3 = 0, degen3 = false, r3, b3, vi3, w3;
          var fv3 = function (x2, y2, z2) { return f.fn(x2, y2, z2, tc3); };
          function grad3(astL, fnL) {
            return function (x2, y2, z2) {
              var Pl = { x: x2, y: y2, z: z2, t: tc3 };
              try { return AD.gradientAD(astL, Pl, ['x', 'y', 'z']); }
              catch (e) { return AD.gradientFD(fnL, Pl, ['x', 'y', 'z']); }
            };
          }
          function hess3(astL, fnL) {
            return function (x2, y2, z2) {
              var Pl = { x: x2, y: y2, z: z2, t: tc3 };
              try { return AD.hessianAD(astL, Pl, ['x', 'y', 'z']); }
              catch (e) { return AD.hessianFD(fnL, Pl, ['x', 'y', 'z']); }
            };
          }
          var gradF3 = grad3(f.ast, f.fn), hessF3 = hess3(f.ast, f.fn);
          for (r3 = 0; r3 < rows3.length; r3++) {
            var om3 = consOtherMask(rows3, rows3[r3].idx, tc3);
            for (b3 = 0; b3 < rows3[r3].boundaries.length; b3++) {
              var bd3 = rows3[r3].boundaries[b3];
              var gW3 = (function (bfn) { return function (x2, y2, z2) { return bfn(x2, y2, z2, tc3); }; })(bd3.fn);
              var mesh3 = VF.Manifolds.marchingTets(gW3, 0, domain(), 36);
              if (!mesh3.pos.length) continue;
              nSurf3++;
              var kp = [], kn = [], kv = [];
              for (vi3 = 0; vi3 + 2 < mesh3.pos.length; vi3 += 3) {
                var okT = true, vv3 = [];
                for (w3 = 0; w3 < 3; w3++) {
                  var pv3 = mesh3.pos[vi3 + w3];
                  if (om3 && !om3(pv3[0], pv3[1], pv3[2])) { okT = false; break; }
                  var fV3 = fv3(pv3[0], pv3[1], pv3[2]);
                  if (!isFinite(fV3)) { okT = false; break; }
                  vv3.push(fV3);
                }
                if (!okT) continue;
                for (w3 = 0; w3 < 3; w3++) { kp.push(mesh3.pos[vi3 + w3]); kn.push(mesh3.nor[vi3 + w3]); kv.push(vv3[w3]); }
              }
              if (kp.length) surfs3.push({ pos: kp, nor: kn, val: kv });
              var lr3 = VF.Manifolds.lagrangeCandidates3D(mesh3, fv3, gW3, gradF3, grad3(bd3.ast, bd3.fn), hessF3, hess3(bd3.ast, bd3.fn), R);
              if (lr3.degenerate) degen3 = true;
              for (vi3 = 0; vi3 < lr3.cands.length; vi3++) {
                var cd3 = lr3.cands[vi3];
                if (om3 && !om3(cd3.x, cd3.y, cd3.z)) continue;
                var gfc = gradF3(cd3.x, cd3.y, cd3.z), ggc = grad3(bd3.ast, bd3.fn)(cd3.x, cd3.y, cd3.z);
                var gfn3 = Math.sqrt(gfc[0] * gfc[0] + gfc[1] * gfc[1] + gfc[2] * gfc[2]) || 1;
                var ggn3 = Math.sqrt(ggc[0] * ggc[0] + ggc[1] * ggc[1] + ggc[2] * ggc[2]) || 1;
                cd3.nf = [gfc[0] / gfn3, gfc[1] / gfn3, gfc[2] / gfn3];
                cd3.ng = [ggc[0] / ggn3, ggc[1] / ggn3, ggc[2] / ggn3];
                cands3.push(cd3);
              }
            }
          }
          /* dedupe candidates shared between boundaries */
          var dd3 = [], ai3, aj3;
          for (ai3 = 0; ai3 < cands3.length; ai3++) {
            var dup3 = false;
            for (aj3 = 0; aj3 < dd3.length; aj3++) {
              var q1 = cands3[ai3].x - dd3[aj3].x, q2 = cands3[ai3].y - dd3[aj3].y, q3 = cands3[ai3].z - dd3[aj3].z;
              if (q1 * q1 + q2 * q2 + q3 * q3 < R * R * 4e-4) { dup3 = true; break; }
            }
            if (!dup3) dd3.push(cands3[ai3]);
          }
          /* the surface's own f-range: full colormap contrast on the surface */
          var sLo3 = Infinity, sHi3 = -Infinity, sv3;
          for (vi3 = 0; vi3 < surfs3.length; vi3++) for (w3 = 0; w3 < surfs3[vi3].val.length; w3++) {
            sv3 = surfs3[vi3].val[w3];
            if (sv3 < sLo3) sLo3 = sv3; if (sv3 > sHi3) sHi3 = sv3;
          }
          lag3Cache = { key: l3key, surfs: surfs3, cands: dd3, nSurf: nSurf3, degen: degen3, lo: sLo3, hi: sHi3 };
        }
        f.lagResult = { chains: lag3Cache.nSurf, open: 0, cands: lag3Cache.cands, degenerate: lag3Cache.degen, surf3d: true };
      }
      var hasSurf = f.lagResult && lag3Cache.surfs.length > 0;
      /* with a constraint surface the volume cloud becomes context: smaller dots */
      var cz = (list.min < 0 && list.max > 0);
      viz.renderScalarPoints(list, { map: map, centerZero: cz, size: spacingFor(nn) * (hasSurf ? 0.28 : 0.5) });
      if (hasSurf) updateColorbar(state.colormap, lag3Cache.lo, lag3Cache.hi, 'f | g = c', false);
      else updateColorbar(state.colormap, list.min, list.max, 'f(x,y,z)', cz);
      if (state.showGradArrow) {
        var h0 = f.grad[0], h1 = f.grad[1], h2 = f.grad[2], hn = Math.sqrt(h0 * h0 + h1 * h1 + h2 * h2);
        if (hn > 1e-9) { var L3 = R * 0.5; VF.vizHelpers.addArrowTo(viz.groupFunc, [state.fa, state.fb, state.fc], [state.fa + h0 / hn * L3, state.fb + h1 / hn * L3, state.fc + h2 / hn * L3], 0xff5cc8, { headLen: R * 0.05 }); }
      }
      if (hasSurf) {
        for (i = 0; i < lag3Cache.surfs.length; i++) {
          var sf3 = lag3Cache.surfs[i];
          viz.renderConstraintSurface({ pos: sf3.pos, nor: sf3.nor, val: sf3.val, min: lag3Cache.lo, max: lag3Cache.hi }, { map: map });
        }
        for (i = 0; i < lag3Cache.cands.length && i < 8; i++) {
          var cdd = lag3Cache.cands[i], cp3 = [cdd.x, cdd.y, cdd.z];
          viz.renderFunctionCurve({ main: [], marker: cp3 }, { markerColor: 0xffe066 });
          /* ∇g (cyan, longer) and ∇f (magenta, shorter): parallel ⟺ candidate */
          VF.vizHelpers.addArrowTo(viz.groupFunc, cp3, [cp3[0] + cdd.ng[0] * R * 0.36, cp3[1] + cdd.ng[1] * R * 0.36, cp3[2] + cdd.ng[2] * R * 0.36], 0x4cc9f0, { headLen: R * 0.045 });
          VF.vizHelpers.addArrowTo(viz.groupFunc, cp3, [cp3[0] + cdd.nf[0] * R * 0.24, cp3[1] + cdd.nf[1] * R * 0.24, cp3[2] + cdd.nf[2] * R * 0.24], 0xff5cc8, { headLen: R * 0.045 });
        }
      }
      setStats('f(x,y,z) volume &nbsp; f(P) = ' + fmt(f.value) +
        (f.lagResult ? ' &nbsp;·&nbsp; Lagrange: ' + f.lagResult.cands.length : '') + (f.adOK ? '' : ' &nbsp;(finite-diff derivs)'));
    }
    setFormula('f = ' + esc(funcExpr()) +
      (f.cons ? ' &nbsp;·&nbsp; {' + esc(f.cons.shown.join(';  ')) + '}' : ''));
  }

  function updateFuncReadout() {
    var f = cur.func; if (!f) return;
    if (f.type === 'vec') return vecReadout(f);
    var vars = f.vars, n = vars.length;
    var pt = '(' + fmt(state.fa) + (n >= 2 ? ', ' + fmt(state.fb) : '') + (n >= 3 ? ', ' + fmt(state.fc) : '') + ')';
    var html = '<div class="ro-line"><span>f' + pt + '</span><b>' + fmt(f.value) + '</b></div>';
    if (f.regionFn && f.regionFn(state.fa, state.fb, state.fc, state.t) === 0)
      html += '<div class="muted small">' + T('P violates the constraints: the graph is hidden there, but f and its derivatives are still defined.') + '</div>';
    html += '<div class="ro-sub">Gradient ∇f&nbsp; (' + (f.adOK ? 'exact' : 'finite-diff') + ')</div><div class="ro-vec">' + vrow(f.grad) + '</div>';
    html += '<div class="ro-sub">Jacobian J = ∇fᵀ&nbsp; (1×' + n + ')</div><div class="ro-vec">' + jrow(f.grad) + '</div>';
    html += '<div class="ro-sub">Hessian H&nbsp; (' + n + '×' + n + ')</div>' + matHtml(f.hess);
    html += '<div class="ro-sub">Taylor polynomial (degree ' + state.taylorDeg + ')</div>';
    if (!f.adOK) html += '<div class="muted small">Exact Taylor needs elementary functions; ∇f and H above use finite differences.</div>';
    else if (state.funcType === '1d') html += '<div class="taylor-poly">' + taylor1DHtml(f, state.taylorDeg) + '</div>';
    else html += '<div class="muted small">2nd-order form: f(P) + ∇f·Δ + ½·Δᵀ·H·Δ&nbsp; (∇f, H above). Surface drawn to degree ' + state.taylorDeg + '.</div>';
    html += tdReadoutHtml(f);
    if (f.cons && (state.funcType === '2d' || state.funcType === '3d')) html += lagReadoutHtml(f);
    if (state.ctOn) html += ctReadoutHtml(f);
    dom.funcReadout.innerHTML = html;
  }

  /* continuity classification (cached: the analysis only depends on f, the
     domain and the constraints, not on P) */
  var ctCache = { key: null, rep: null };
  function ctReadoutHtml(f) {
    var key = state.funcType + '|' + f.expr + '|' + state.R + '|' + state.t + '|' + state.normKind + state.normP + '|' + state.constraints.join(';');
    if (ctCache.key !== key) {
      var AD = VF.Autodiff, vars = f.vars;
      var gradMag = function (Pt) {
        var g = null, ok = true, q;
        try { g = AD.gradientAD(f.ast, Pt, vars); } catch (e) { g = null; }
        if (g) for (q = 0; q < g.length; q++) if (!isFinite(g[q])) g = null;
        if (!g) g = AD.gradientFD(f.fn, Pt, vars);
        var s = 0;
        for (q = 0; q < g.length; q++) s += g[q] * g[q];
        return Math.sqrt(s);
      };
      ctCache.key = key;
      ctCache.rep = VF.Continuity.analyze(f.fn, gradMag, { vars: vars, R: state.R, t: state.t, region: f.regionFn });
    }
    var rep = ctCache.rep, n = f.vars.length, i;
    var html = '<div class="ro-sub">' + T('Continuity on the plotted domain') + '</div>';
    if (rep.inconclusive) return html + '<div class="muted small">' + T('Not enough defined points in the domain to classify.') + '</div>';
    function ptStr(c) { var s = []; for (i = 0; i < c.length; i++) s.push(fmt(c[i])); return '(' + s.join(', ') + ')'; }
    var slopeSym = n > 1 ? '‖∇f‖' : '|f′|';
    /* verdict */
    if (rep.lipschitz) html += '<div class="hint-good">' + T('f is Lipschitz continuous on the plotted domain: the strongest of the three classes.') + '</div>';
    else if (rep.uniform) html += '<div class="hint-good">' + T('f is uniformly continuous on the plotted domain, but not Lipschitz.') + '</div>';
    else if (rep.continuous) html += '<div class="hint-bad">' + T('f is continuous at every point of its domain, but not uniformly continuous.') + '</div>';
    else html += '<div class="hint-bad">' + T('f is not continuous on the plotted domain.') + '</div>';
    function mark(okv) { return '<b style="color:var(--' + (okv ? 'good' : 'bad') + ')">' + (okv ? '✓' : '✗') + '</b>'; }
    /* continuous */
    html += '<div class="ro-line"><span>' + T('continuous') + '</span>' + mark(rep.continuous) + '</div>';
    if (!rep.continuous) html += '<div class="muted small">' + T('f jumps, the gap survives every refinement of the window:') + ' Δf ≈ ' + fmt(rep.jump.size) + ' @ ' + ptStr(rep.jump.at) + '</div>';
    else html += '<div class="muted small">' + T('no jump survives refinement: small input changes give small value changes at every point of the domain.') + (rep.holes ? ' ' + T('(f is undefined at some points; continuity holds on the defined part.)') : '') + '</div>';
    /* uniformly continuous */
    html += '<div class="ro-line"><span>' + T('uniformly continuous') + '</span>' + mark(rep.uniform) + '</div>';
    if (!rep.continuous) html += '<div class="muted small">' + T('fails automatically: uniform continuity implies continuity.') + '</div>';
    else if (rep.uniform) html += '<div class="muted small">' + T('the domain is bounded and f is continuous up to its boundary ⇒ uniformly continuous by Heine–Cantor: one δ(ε) works everywhere.') + (rep.removable ? ' ' + T('(the isolated undefined points are removable: f extends continuously across them.)') : '') + '</div>';
    else if (rep.pole || rep.blow) html += '<div class="muted small">' + T('the values blow up near the marked point, so for small ε no single δ works there:') + ' @ ' + ptStr((rep.pole || rep.blow).at) + '</div>';
    else if (rep.oscE) html += '<div class="muted small">' + T('f oscillates with non-vanishing amplitude at ever finer scales near') + ' ' + ptStr(rep.oscE.at) + ': ' + T('no single δ(ε) can work.') + '</div>';
    /* Lipschitz */
    html += '<div class="ro-line"><span>' + T('Lipschitz continuous') + '</span>' + mark(rep.lipschitz) + '</div>';
    if (rep.lipschitz) html += '<div class="muted small">' + T('the slope is bounded, mean value theorem: |f(x) − f(y)| ≤ L·|x − y| with') + ' L ≈ sup ' + slopeSym + ' ≈ ' + fmt(rep.L) + ' @ ' + ptStr(rep.Lat) + '</div>';
    else if (!rep.uniform) html += '<div class="muted small">' + T('fails automatically: Lipschitz implies uniform continuity.') + '</div>';
    else if (rep.slopeUnb) html += '<div class="muted small">' + T('no Lipschitz constant works: the slope grows beyond every bound near the marked point') + ' (' + slopeSym + ' ≈ ' + fmt(rep.slopeUnb.v) + ' @ ' + T('distance') + ' ' + fmt(rep.slopeUnb.d) + ', ' + ptStr(rep.slopeUnb.at) + ')</div>';
    /* outlook beyond the box */
    if (rep.growth && rep.growth.growing) html += '<div class="muted small">' + T('Outlook: beyond the plotted domain the slope keeps growing') + ' (' + slopeSym + ' ≈ ' + fmt(rep.growth.far) + ' @ 2R); ' + T('on all of ℝⁿ, f would be continuous but not uniformly continuous (the classic x² behaviour).') + '</div>';
    html += '<div class="muted small">' + T('The class depends on the domain. Shrink ±R or add constraints and it can change: 1/x is not uniformly continuous on (0, R], but Lipschitz on [1, R].') + '</div>';
    return html;
  }

  /* constrained-extrema block: the Lagrange candidates on the boundaries, with f and λ */
  function lagReadoutHtml(f) {
    var html = '<div class="ro-sub">' + T('Constrained extrema (Lagrange)') + '</div>';
    var lr = f.lagResult, is3 = lr && lr.surf3d;
    if (!lr || !lr.chains) return html + '<div class="muted small">' + T('The constraints have no boundary points inside the domain. Raise ±R.') + '</div>';
    var cds = lr.cands, i;
    function cpt(cd) { return '(' + fmt(cd.x) + ', ' + fmt(cd.y) + (cd.z != null ? ', ' + fmt(cd.z) : '') + ')'; }
    html += '<div class="muted small">' + T(is3
      ? 'Candidates solve ∇f = λ·∇g on the constraint surface: there the level set of f is tangent to {g = c}, so f has zero slope along the surface. At each candidate the arrows show ∇f (magenta) ∥ ∇g (cyan).'
      : 'Candidates solve ∇f = λ·∇g on the red curve: there the level line of f is tangent to the constraint, so f has zero slope along it.') + '</div>';
    if (lr.degenerate) html += '<div class="muted small">' + T('f is constant along the constraint surface: ∇f ∥ ∇g everywhere, so every point is a candidate.') + '</div>';
    else if (!cds.length) html += '<div class="muted small">' + T(is3
      ? 'No candidates found on the constraint surface (within the domain).'
      : 'No sign change of ∇f × ∇g found along the curve (within the domain).') + '</div>';
    else {
      var fmax = -Infinity, fmin = Infinity, imax = 0, imin = 0;
      for (i = 0; i < cds.length; i++) {
        if (cds[i].f > fmax) { fmax = cds[i].f; imax = i; }
        if (cds[i].f < fmin) { fmin = cds[i].f; imin = i; }
      }
      html += '<table class="eig">';
      for (i = 0; i < cds.length && i < 12; i++) {
        var cd = cds[i], tag = cd.kind === 'max' ? T('max along the constraint') : (cd.kind === 'min' ? T('min along the constraint') : '');
        html += '<tr><td class="lam">' + cpt(cd) + '</td><td class="vec">f = ' + fmt(cd.f) +
          ' &nbsp;·&nbsp; λ = ' + fmt(cd.lam) + (tag ? ' &nbsp;·&nbsp; ' + tag : '') + '</td></tr>';
      }
      if (cds.length > 12) html += '<tr><td class="lam">…</td><td class="vec">' + (cds.length - 12) + ' ' + T('more') + '</td></tr>';
      html += '</table>';
      html += '<div class="hint-good">' + T('Along the constraints:') + ' &nbsp;max f = ' + fmt(fmax) + ' @ ' + cpt(cds[imax]) +
        ' &nbsp;·&nbsp; min f = ' + fmt(fmin) + ' @ ' + cpt(cds[imin]) + '</div>';
    }
    if (lr.open) html += '<div class="muted small">' + T('The curve leaves the domain: endpoints at the domain edge are cut off, not candidates.') + '</div>';
    return html;
  }

  /* total-derivative block: df as a formula, the remainder analysis, the probe */
  function tdReadoutHtml(f) {
    var n = f.vars.length, i, html = '';
    var probeOn = state.tdProbe && state.funcType === '2d';
    if (!state.tdOn && !probeOn) return '';
    html += '<div class="ro-sub">' + T('Total derivative (totales Differential)') + '</div>';
    var DXS = ['dx', 'dy', 'dz'], terms = [];
    for (i = 0; i < n; i++) terms.push(fmt(f.grad[i]) + '·' + DXS[i]);
    html += '<div class="ro-vec">df = ' + terms.join(' + ') + '</div>';
    html += '<div class="muted small">' + T(n === 1
      ? 'The linear map h ↦ f′(a)·h: its graph is the tangent line (= Taylor degree 1).'
      : 'The linear map h ↦ ∇f·h: its graph is the tangent plane at P.') + '</div>';
    if (state.tdOn) {
      var rt = VF.DiffCheck.remainderTest(function (x, y, z, t) { return [f.fn(x, y, z, t)]; }, f.P, [f.grad], f.vars);
      html += remainderHtml(rt, false);
    }
    if (probeOn) {
      var vc = Math.cos(state.tdPhi), vs = Math.sin(state.tdPhi);
      var Dv = VF.DiffCheck.dirDeriv(f.fn, f.P, [vc, vs], ['x', 'y']);
      var lin = f.grad[0] * vc + f.grad[1] * vs;
      html += '<div class="ro-line"><span>v</span><b>(' + fmt(vc) + ', ' + fmt(vs) + ')</b></div>';
      html += '<div class="ro-line"><span>D_v f (' + T('one-sided') + ')</span><b>' + fmt(Dv) + '</b><span>∇f·v</span><b>' + fmt(lin) + '</b></div>';
      if (isFinite(Dv) && isFinite(lin)) {
        var mism = Math.abs(Dv - lin) > 1e-3 * (1 + Math.abs(Dv) + Math.abs(lin));
        html += mism
          ? '<div class="hint-bad">' + T('D_v f ≠ ∇f·v: the gradient does not predict this direction; f cannot be totally differentiable at P.') + '</div>'
          : '<div class="muted small">' + T('D_v f = ∇f·v here: in this direction the linear approximation is exact to first order.') + '</div>';
      }
    }
    return html;
  }

  function remainderHtml(rt, isVec) {
    var html = '<div class="ro-sub">' + T('remainder') + ' &nbsp; max<sub>v</sub> |' + (isVec ? 'F' : 'f') + '(P+hv) − ' + (isVec ? 'F' : 'f') + '(P) − h·' + (isVec ? 'J' : '∇f') + '·v| / h</div>';
    var cells = [];
    for (var i = 0; i < rt.rows.length; i++) cells.push('h=' + rt.rows[i].h + ' → <b>' + fmt(rt.rows[i].ratio) + '</b>');
    html += '<div class="ro-vec">' + cells.join(' &nbsp;·&nbsp; ') + '</div>';
    if (rt.differentiable === true)
      html += '<div class="hint-good">' + T(isVec
        ? 'The remainder vanishes: F is totally differentiable at P; its total derivative is the Jacobian J above.'
        : 'The remainder vanishes: f is totally differentiable at P; near P, f(P+h) ≈ f(P) + ∇f·h.') + '</div>';
    else if (rt.differentiable === false) {
      html += '<div class="hint-bad">' + T(isVec
        ? 'The remainder does NOT vanish: F is not totally differentiable at P.'
        : 'The remainder does NOT vanish: f is not totally differentiable at P; even where all partial derivatives exist, ∇f fails to approximate f to first order.') + '</div>';
      if (rt.worst) {
        var w = [], j;
        for (j = 0; j < rt.worst.length; j++) w.push(fmt(rt.worst[j]));
        html += '<div class="muted small">' + T('worst direction') + ' v ≈ (' + w.join(', ') + ')</div>';
      }
    } else html += '<div class="muted small">' + T('test inconclusive: f is undefined arbitrarily close to P.') + '</div>';
    return html;
  }

  function vecReadout(f) {
    var La = VF.LinAlg;
    var pt = '(' + fmt(state.fa) + ', ' + fmt(state.fb) + ', ' + fmt(state.fc) + ')';
    var curl = [f.jac[2][1] - f.jac[1][2], f.jac[0][2] - f.jac[2][0], f.jac[1][0] - f.jac[0][1]];
    var html = '<div class="ro-line"><span>F' + pt + '</span><b>' + vrow(f.Fval) + '</b></div>';
    html += '<div class="ro-sub">Jacobian J = ∂Fᵢ/∂xⱼ&nbsp; (3×3, ' + (f.adOK ? 'exact' : 'finite-diff') + ')</div>' + matHtml(f.jac);
    html += '<div class="ro-line" style="margin-top:8px"><span>det J</span><b>' + fmt(La.det(f.jac)) + '</b>' +
      '<span>tr J = ∇·F</span><b>' + fmt(La.trace(f.jac)) + '</b></div>';
    html += '<div class="ro-sub">∇×F (antisymmetric part of J)</div><div class="ro-vec">' + vrow(curl) + '</div>';
    html += '<div class="muted small">Here J is a genuine matrix: its trace is the divergence and its antisymmetric part is the curl. (For a scalar f, J is just ∇fᵀ.)</div>';
    if (state.tdOn) {
      html += '<div class="ro-sub">' + T('Total derivative (totales Differential)') + '</div>';
      html += '<div class="muted small">' + T('DF(P) = J: the Jacobian is the total derivative of a vector map, the linear map h ↦ J·h drawn as the deformed cube.') + '</div>';
      html += remainderHtml(VF.DiffCheck.remainderTest(f.vf.at, f.P, f.jac, ['x', 'y', 'z']), true);
    }
    dom.funcReadout.innerHTML = html;
  }

  function taylor1DHtml(f, deg) {
    var c = VF.Autodiff.taylorCoeffs1D(f.ast, f.P, 'x', deg), terms = [], k;
    for (k = 0; k <= deg; k++) {
      if (!isFinite(c[k]) || Math.abs(c[k]) < 1e-10) continue;
      var basis = k === 0 ? '' : (k === 1 ? '·(x−a)' : '·(x−a)<sup>' + k + '</sup>');
      terms.push('<span class="tk">' + fmt(c[k]) + basis + '</span>');
    }
    var poly = terms.length ? terms.join(' <span class="op">+</span> ') : '0';
    var deriv = [];
    for (k = 0; k <= Math.min(deg, 4); k++) deriv.push('f<sup>(' + k + ')</sup>(a) = ' + fmt(c[k] * factorial(k)));
    return 'T<sub>' + deg + '</sub>(x) = ' + poly +
      '<div class="muted small" style="margin-top:6px">a = ' + fmt(state.fa) + ' &nbsp;·&nbsp; ' + deriv.join(', &nbsp;') + '</div>';
  }

  function immediateFuncParse() { if (funcParseTimer) clearTimeout(funcParseTimer); parseFunc(); }

  function fexpr(get, set) { return exprInput(get(), function (v) { set(v); requestFuncParse(); }, immediateFuncParse); }

  function defExtraColor(i) { return '#' + ('000000' + FUNC_COLORS[i % FUNC_COLORS.length].toString(16)).slice(-6); }
  function extraColorNum(i) {
    var h = state.extraColors[i];
    return (h && /^#[0-9a-fA-F]{6}$/.test(h)) ? parseInt(h.slice(1), 16) : FUNC_COLORS[i % FUNC_COLORS.length];
  }
  function addExtra() {
    state.extraColors.push(defExtraColor(state.extras.length));
    state.extras.push(''); renderExtrasList();
  }
  function addConstraint() { state.constraints.push(''); renderConstraintList(); }
  function renderConstraintList() {
    ctl.consList.innerHTML = ''; ctl.consInputs = [];
    for (var i = 0; i < state.constraints.length; i++) {
      (function (idx) {
        var inp = exprInput(state.constraints[idx], function (v) { state.constraints[idx] = v; requestFuncParse(); }, immediateFuncParse);
        ctl.consInputs.push(inp);
        var del = mk('button', { 'class': 'pt-del', title: 'remove', text: '×', onclick: function () { state.constraints.splice(idx, 1); renderConstraintList(); parseFunc(); } });
        ctl.consList.appendChild(mk('div', { 'class': 'extra-row' }, [inp, del]));
      })(i);
    }
  }
  function renderExtrasList() {
    ctl.extrasList.innerHTML = ''; ctl.extraInputs = [];
    for (var i = 0; i < state.extras.length; i++) {
      (function (idx) {
        if (!state.extraColors[idx]) state.extraColors[idx] = defExtraColor(idx);
        var sw = mk('input', { type: 'color', 'class': 'extra-color', value: state.extraColors[idx], title: T('curve colour') });
        sw.addEventListener('input', function () { state.extraColors[idx] = sw.value; requestFuncParse(); });
        var inp = exprInput(state.extras[idx], function (v) { state.extras[idx] = v; requestFuncParse(); }, immediateFuncParse);
        ctl.extraInputs.push(inp);
        var del = mk('button', { 'class': 'pt-del', title: 'remove', text: '×', onclick: function () { state.extras.splice(idx, 1); state.extraColors.splice(idx, 1); renderExtrasList(); parseFunc(); } });
        ctl.extrasList.appendChild(mk('div', { 'class': 'extra-row' }, [sw, inp, del]));
      })(i);
    }
  }

  /* the norm behind ‖·‖ in expressions: parse-time choice, so changing it
     recompiles everything through the normal parse pipeline */
  function applyNorm() {
    VF.Parser.setNorm(state.normKind, state.normP);
    if (ctl.normPNode) ctl.normPNode.style.display = state.normKind === 'p' ? '' : 'none';
    parseFunc();
  }

  function buildFunctionsPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Scalar functions (Taylor, gradient, Hessian), vector maps (full Jacobian, div, curl) and parametric curves with line integrals ∮F·dr, all via exact automatic differentiation.') }));

    ctl.funcTypeSel = select([
      { v: '1d', label: 'f(x): curve' }, { v: '2d', label: 'f(x,y): surface' }, { v: '3d', label: 'f(x,y,z): volume' },
      { v: 'vec', label: 'F(x,y,z): vector field · Jacobian' }
    ], state.funcType, function (v) { state.funcType = v; refreshFuncInputs(); parseFunc(); });
    panel.appendChild(field('Type', ctl.funcTypeSel));

    ctl.scalarGroup = mk('div', {}, []);
    ctl.fInput = fexpr(funcExpr, setFuncExpr);
    ctl.scalarGroup.appendChild(field('f', ctl.fInput, 'primary: full analysis'));
    ctl.extrasList = mk('div', { 'class': 'extras-list' });
    ctl.scalarGroup.appendChild(ctl.extrasList);
    ctl.addExtraBtn = button('+ Add function', 'wide add-extra', addExtra);
    ctl.scalarGroup.appendChild(ctl.addExtraBtn);
    ctl.extrasHint = mk('div', { 'class': 'muted small', text: T('All plotted functions share one vertical scale (so their heights stay comparable): adding a function with much larger values compresses the others. Click a swatch to change a colour.') });
    ctl.scalarGroup.appendChild(ctl.extrasHint);
    panel.appendChild(ctl.scalarGroup);

    ctl.vecGroup = mk('div', {}, []);
    ctl.vf1 = fexpr(function () { return state.vecF1; }, function (v) { state.vecF1 = v; });
    ctl.vf2 = fexpr(function () { return state.vecF2; }, function (v) { state.vecF2 = v; });
    ctl.vf3 = fexpr(function () { return state.vecF3; }, function (v) { state.vecF3 = v; });
    ctl.vecGroup.appendChild(field('F₁', ctl.vf1)); ctl.vecGroup.appendChild(field('F₂', ctl.vf2)); ctl.vecGroup.appendChild(field('F₃', ctl.vf3));
    panel.appendChild(ctl.vecGroup);

    panel.appendChild(sectionTitle('Presets'));
    ctl.funcPresetBox = mk('div', { 'class': 'presets' });
    panel.appendChild(ctl.funcPresetBox);

    panel.appendChild(sectionTitle('Norm ‖·‖ and piecewise'));
    panel.appendChild(mk('div', { 'class': 'muted small', text: T('Write ||a, b, …|| in any expression: it uses the norm chosen here. Fixed variants: norm(…), norm1(…), norminf(…), normp(p, …). Piecewise definitions: if(cond, a, b) or cases(c₁, v₁, …, else); only the active branch is evaluated.') }));
    ctl.normSel = select([
      { v: '2', label: 'Euclidean √(Σxᵢ²): p = 2' },
      { v: '1', label: 'taxicab Σ|xᵢ|: p = 1' },
      { v: 'inf', label: 'maximum max|xᵢ|: p = ∞' },
      { v: 'p', label: 'p-norm (Σ|xᵢ|ᵖ)^(1/p)' }
    ], state.normKind, function (v) { state.normKind = v; applyNorm(); });
    panel.appendChild(field('‖·‖', ctl.normSel));
    panel.appendChild(mk('div', { 'class': 'muted small', text: T('try f = ||x,y|| and switch the norm: the level sets are the unit balls') }));
    var np = sliderCtl(1, 8, 0.5, state.normP, function (v) { state.normP = v; applyNorm(); });
    ctl.normPNode = field('p', np.node, 'p ≥ 1');
    ctl.normPNode.style.display = state.normKind === 'p' ? '' : 'none';
    panel.appendChild(ctl.normPNode);

    /* constraints (Nebenbedingungen): a list of relations, ANDed */
    ctl.consTitle = sectionTitle('Constraints (Nebenbedingungen)');
    panel.appendChild(ctl.consTitle);
    ctl.consNote = mk('div', { 'class': 'muted small', text: T('Each row is one constraint; several rows combine with AND. An inequality like x^2+y^2 <= 4 or 2 < x^2+y^2 < 9 clips the graph to the region where it holds; an equality like x^2+y^2 = 4 draws the constraint curve on the surface. Boundaries are drawn in red, the Lagrange candidates ∇f = λ·∇g in yellow.') });
    panel.appendChild(ctl.consNote);
    ctl.consList = mk('div', { 'class': 'extras-list cons-list' });
    panel.appendChild(ctl.consList);
    ctl.addConsBtn = button('+ Add constraint', 'wide add-extra', addConstraint);
    panel.appendChild(ctl.addConsBtn);

    ctl.pointGroup = mk('div', {}, []);
    ctl.pointTitle = sectionTitle('Expansion point');
    ctl.pointGroup.appendChild(ctl.pointTitle);
    var sa = regR(sliderCtl(-state.R, state.R, 0.05, state.fa, function (v) { state.fa = v; parseFunc(); }));
    ctl.faNode = field('a  (x₀)', sa.node); ctl.pointGroup.appendChild(ctl.faNode);
    var sb = regR(sliderCtl(-state.R, state.R, 0.05, state.fb, function (v) { state.fb = v; parseFunc(); }));
    ctl.fbNode = field('b  (y₀)', sb.node); ctl.pointGroup.appendChild(ctl.fbNode);
    var scc = regR(sliderCtl(-state.R, state.R, 0.05, state.fc, function (v) { state.fc = v; parseFunc(); }));
    ctl.fcNode = field('c  (z₀)', scc.node); ctl.pointGroup.appendChild(ctl.fcNode);
    panel.appendChild(ctl.pointGroup);

    ctl.taylorGroup = mk('div', {}, []);
    ctl.taylorGroup.appendChild(sectionTitle('Taylor'));
    var td = sliderCtl(0, 8, 1, state.taylorDeg, function (v) { state.taylorDeg = Math.round(v); parseFunc(); });
    ctl.taylorGroup.appendChild(field('Degree', td.node, '0–8'));
    panel.appendChild(ctl.taylorGroup);

    ctl.tdGroup = mk('div', {}, []);
    ctl.tdGroup.appendChild(sectionTitle('Total derivative  df'));
    ctl.tdGroup.appendChild(mk('div', { 'class': 'muted small', text: T('Totally differentiable at P means the remainder f(P+h) − f(P) − ∇f·h vanishes faster than |h|, in every direction at once. The analysis measures that remainder; the probe compares the directional derivative D_v f with the linear prediction ∇f·v.') }));
    ctl.tdChk = field('', checkbox('Analyse total differentiability at P', state.tdOn, function (v) { state.tdOn = v; updateFuncReadout(); }));
    ctl.tdGroup.appendChild(ctl.tdChk);
    ctl.tdPlaneChk = field('', checkbox('Show tangent plane at P', state.tdPlane, function (v) { state.tdPlane = v; renderFunc(); }));
    ctl.tdGroup.appendChild(ctl.tdPlaneChk);
    ctl.tdProbeChk = field('', checkbox('Show direction probe (slice along v)', state.tdProbe, function (v) { state.tdProbe = v; renderFunc(); updateFuncReadout(); }));
    ctl.tdGroup.appendChild(ctl.tdProbeChk);
    var tphi = sliderCtl(0, 6.28, 0.02, state.tdPhi, function (v) { state.tdPhi = v; renderFunc(); updateFuncReadout(); });
    ctl.tdPhiNode = field('direction φ', tphi.node, 'v = (cos φ, sin φ)');
    ctl.tdGroup.appendChild(ctl.tdPhiNode);
    panel.appendChild(ctl.tdGroup);

    /* continuity classification on the plotted domain */
    ctl.ctGroup = mk('div', {}, []);
    ctl.ctGroup.appendChild(sectionTitle('Continuity (Stetigkeit)'));
    ctl.ctGroup.appendChild(mk('div', { 'class': 'muted small', text: T('Classifies f on the plotted domain: Lipschitz ⊂ uniformly continuous ⊂ continuous. Jumps and poles are located by bisection; the Lipschitz bound sup ‖∇f‖ is checked by zooming in on the steepest point.') }));
    ctl.ctGroup.appendChild(field('', checkbox('Classify continuity on the plotted domain', state.ctOn, function (v) { state.ctOn = v; updateFuncReadout(); })));
    panel.appendChild(ctl.ctGroup);

    panel.appendChild(sectionTitle('Display'));
    panel.appendChild(field('Colormap', select(VF.Colormaps.names, state.colormap, function (v) { state.colormap = v; renderFunc(); })));
    var fr = regDomain(sliderCtl(2, 10, 1, state.R, function (v) { setDomainR(v); renderFunc(); }));
    panel.appendChild(field('Domain ±R', fr.node));
    var frs = sliderCtl(16, 120, 2, state.funcRes, function (v) { state.funcRes = Math.round(v); renderFunc(); updateFuncReadout(); });
    ctl.resNode = field('Resolution', frs.node); panel.appendChild(ctl.resNode);
    ctl.showFuncChk = field('', checkbox('Show function', state.showFunc, function (v) { state.showFunc = v; renderFunc(); })); panel.appendChild(ctl.showFuncChk);
    ctl.showTaylorChk = field('', checkbox('Show Taylor approximation', state.showTaylor, function (v) { state.showTaylor = v; renderFunc(); })); panel.appendChild(ctl.showTaylorChk);
    ctl.gradChk = field('', checkbox('Show gradient vector', state.showGradArrow, function (v) { state.showGradArrow = v; renderFunc(); })); panel.appendChild(ctl.gradChk);
    ctl.fFieldChk = field('', checkbox('Show field arrows', state.fShowField, function (v) { state.fShowField = v; renderFunc(); })); panel.appendChild(ctl.fFieldChk);
    ctl.fJacChk = field('', checkbox('Show Jacobian (local cube at P)', state.fShowJac, function (v) { state.fShowJac = v; renderFunc(); })); panel.appendChild(ctl.fJacChk);

    panel.appendChild(sectionTitle('Axis scale'));
    function axSlider(lbl, key) {
      var s = sliderCtl(0.2, 5, 0.1, state[key], function (v) { state[key] = v; viz.setAxisScale(state.sax, state.say, state.saz); });
      return field(lbl, s.node);
    }
    panel.appendChild(axSlider('scale x', 'sax'));
    panel.appendChild(axSlider('scale y', 'say'));
    panel.appendChild(axSlider('scale z', 'saz'));

    panel.appendChild(sectionTitle('Values'));
    ctl.funcReadout = mk('div', { 'class': 'readout' });
    dom.funcReadout = ctl.funcReadout;
    panel.appendChild(ctl.funcReadout);
    return panel;
  }


  function refreshFuncInputs() {
    var ty = state.funcType, scalar = (ty === '1d' || ty === '2d' || ty === '3d'), sn = scalar ? funcVars().length : 0;
    ctl.scalarGroup.style.display = scalar ? '' : 'none';
    ctl.vecGroup.style.display = ty === 'vec' ? '' : 'none';
    ctl.pointGroup.style.display = (scalar || ty === 'vec') ? '' : 'none';
    ctl.pointTitle.textContent = T(ty === 'vec' ? 'Evaluation point' : 'Expansion point');
    ctl.taylorGroup.style.display = scalar ? '' : 'none';
    ctl.tdPlaneChk.style.display = ty === '2d' ? '' : 'none';
    ctl.tdProbeChk.style.display = ty === '2d' ? '' : 'none';
    ctl.tdPhiNode.style.display = ty === '2d' ? '' : 'none';
    ctl.ctGroup.style.display = scalar ? '' : 'none';
    ctl.fbNode.style.display = (ty === 'vec' || (scalar && sn >= 2)) ? '' : 'none';
    ctl.fcNode.style.display = (ty === 'vec' || (scalar && sn >= 3)) ? '' : 'none';
    ctl.resNode.style.display = scalar ? '' : 'none';
    ctl.showFuncChk.style.display = scalar ? '' : 'none';
    ctl.showTaylorChk.style.display = scalar ? '' : 'none';
    ctl.gradChk.style.display = (scalar && sn >= 2) ? '' : 'none';
    ctl.fFieldChk.style.display = ty === 'vec' ? '' : 'none';
    ctl.fJacChk.style.display = ty === 'vec' ? '' : 'none';
    var multiOk = (ty === '1d' || ty === '2d');   /* extra functions only for curves & surfaces */
    ctl.extrasList.style.display = multiOk ? '' : 'none';
    ctl.addExtraBtn.style.display = multiOk ? '' : 'none';
    ctl.extrasHint.style.display = multiOk ? '' : 'none';
    ctl.consTitle.style.display = scalar ? '' : 'none';
    ctl.consNote.style.display = scalar ? '' : 'none';
    ctl.consList.style.display = scalar ? '' : 'none';
    ctl.addConsBtn.style.display = scalar ? '' : 'none';
    renderConstraintList();
    renderExtrasList();
    ctl.fInput.value = funcExpr();
    ctl.vf1.value = state.vecF1; ctl.vf2.value = state.vecF2; ctl.vf3.value = state.vecF3;
    refreshFuncPresets();
  }
  function refreshFuncPresets() {
    var list = FUNC_PRESETS[state.funcType] || [];
    ctl.funcPresetBox.innerHTML = '';
    list.forEach(function (p) { ctl.funcPresetBox.appendChild(button(p.name, 'preset', function () { applyFuncPreset(p); })); });
  }
  function applyFuncPreset(p) {
    if (state.funcType === 'vec') {
      state.vecF1 = p.F[0]; state.vecF2 = p.F[1]; state.vecF3 = p.F[2];
      ctl.vf1.value = p.F[0]; ctl.vf2.value = p.F[1]; ctl.vf3.value = p.F[2];
    } else { setFuncExpr(p.f); ctl.fInput.value = p.f; }
    state.constraints = (p.constraints || []).slice(); renderConstraintList();   /* reset even when the preset has none, so a prior preset's constraint doesn't linger */
    parseFunc();
  }


  K.lab({
    key: 'functions', label: 'Functions', panel: buildFunctionsPanel,
    refresh: refreshFuncInputs,
    enter: parseFunc,
    render: renderFunc,
    /* per-axis scale is a Functions-tab feature; every other tab stays 1:1:1 */
    axisScale: function () { return [state.sax, state.say, state.saz]; }
  });

})(window.VF = window.VF || {});
