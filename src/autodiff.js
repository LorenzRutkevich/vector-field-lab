/* =============================================================================
 * autodiff.js: exact derivatives via univariate Taylor-mode AD
 * -----------------------------------------------------------------------------
 * A "jet" is a truncated power series [c0, c1, ..., c_{N-1}] representing the
 * Taylor coefficients of g(s) = f(point + s·dir) about s = 0. Propagating jets
 * through the expression tree yields exact derivatives to any order.
 *
 * From this one primitive we derive everything:
 *   - gradient  : first jet coeff along each axis direction e_i
 *   - Hessian   : second jet coeffs along e_i and e_i+e_j  (mixed-partial trick)
 *   - 1-D Taylor: jet along the single variable = f^(k)(a)/k!
 *   - n-D Taylor value at a target X: jet along dir = X − P, summed at s = 1
 *
 * Finite-difference fallbacks (gradientFD / hessianFD) cover expressions that
 * use non-smooth functions the jet arithmetic doesn't support.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var NAMES = ['x', 'y', 'z', 't'];

  /* ---- jet arithmetic (arrays of length N) -------------------------------- */
  function C(v, N) { var a = new Array(N); a[0] = v; for (var i = 1; i < N; i++) a[i] = 0; return a; }
  function negJ(a) { var N = a.length, r = new Array(N); for (var i = 0; i < N; i++) r[i] = -a[i]; return r; }
  function addJ(a, b) { var N = a.length, r = new Array(N); for (var i = 0; i < N; i++) r[i] = a[i] + b[i]; return r; }
  function subJ(a, b) { var N = a.length, r = new Array(N); for (var i = 0; i < N; i++) r[i] = a[i] - b[i]; return r; }
  function scaleJ(a, c) { var N = a.length, r = new Array(N); for (var i = 0; i < N; i++) r[i] = a[i] * c; return r; }
  function mulJ(a, b) {
    var N = a.length, r = new Array(N);
    for (var k = 0; k < N; k++) { var s = 0; for (var j = 0; j <= k; j++) s += a[j] * b[k - j]; r[k] = s; }
    return r;
  }
  function divJ(a, b) {
    var N = a.length, r = new Array(N), b0 = b[0];
    r[0] = a[0] / b0;
    for (var k = 1; k < N; k++) { var s = a[k]; for (var j = 1; j <= k; j++) s -= b[j] * r[k - j]; r[k] = s / b0; }
    return r;
  }
  function expJ(u) {
    var N = u.length, w = new Array(N); w[0] = Math.exp(u[0]);
    for (var k = 1; k < N; k++) { var s = 0; for (var j = 1; j <= k; j++) s += j * u[j] * w[k - j]; w[k] = s / k; }
    return w;
  }
  function logJ(u) {
    var N = u.length, u0 = u[0], w = new Array(N); w[0] = Math.log(u0);
    for (var k = 1; k < N; k++) { var s = k * u[k]; for (var j = 1; j < k; j++) s -= (k - j) * u[j] * w[k - j]; w[k] = s / (k * u0); }
    return w;
  }
  function sincosJ(u) {
    var N = u.length, s = new Array(N), c = new Array(N); s[0] = Math.sin(u[0]); c[0] = Math.cos(u[0]);
    for (var k = 1; k < N; k++) { var ss = 0, cc = 0; for (var j = 1; j <= k; j++) { ss += j * u[j] * c[k - j]; cc += j * u[j] * s[k - j]; } s[k] = ss / k; c[k] = -cc / k; }
    return [s, c];
  }
  function sinhcoshJ(u) {
    var N = u.length, sh = new Array(N), ch = new Array(N); sh[0] = Math.sinh(u[0]); ch[0] = Math.cosh(u[0]);
    for (var k = 1; k < N; k++) { var ss = 0, cc = 0; for (var j = 1; j <= k; j++) { ss += j * u[j] * ch[k - j]; cc += j * u[j] * sh[k - j]; } sh[k] = ss / k; ch[k] = cc / k; }
    return [sh, ch];
  }
  function derivJ(u) { var N = u.length, d = new Array(N); for (var i = 0; i < N - 1; i++) d[i] = (i + 1) * u[i + 1]; d[N - 1] = 0; return d; }
  /* integrate h where h' = R·u' and h(0)=h0  (for atan/asin/acos …) */
  function fromDeriv(u, R, h0) {
    var N = u.length, q = mulJ(R, derivJ(u)), w = new Array(N); w[0] = h0;
    for (var k = 1; k < N; k++) w[k] = q[k - 1] / k;
    return w;
  }
  function powJ(u, p, N) {
    var pconst = true; for (var i = 1; i < N; i++) if (p[i] !== 0) { pconst = false; break; }
    if (pconst) {
      var pc = p[0];
      if (Math.abs(pc - Math.round(pc)) < 1e-12 && pc >= 0 && pc <= 64) {
        var m = Math.round(pc), r = C(1, N); for (var q = 0; q < m; q++) r = mulJ(r, u); return r;
      }
      if (Math.abs(pc - Math.round(pc)) < 1e-12 && pc < 0 && pc >= -64) {
        var m2 = -Math.round(pc), r2 = C(1, N); for (var q2 = 0; q2 < m2; q2++) r2 = mulJ(r2, u); return divJ(C(1, N), r2);
      }
      return expJ(scaleJ(logJ(u), pc));            /* fractional exponent (needs u0>0) */
    }
    return expJ(mulJ(p, logJ(u)));                 /* variable exponent */
  }

  function callJ(name, args, N) {
    switch (name) {
      case 'sin': return sincosJ(args[0])[0];
      case 'cos': return sincosJ(args[0])[1];
      case 'tan': { var sc = sincosJ(args[0]); return divJ(sc[0], sc[1]); }
      case 'exp': return expJ(args[0]);
      case 'ln': case 'log': return logJ(args[0]);
      case 'log10': return scaleJ(logJ(args[0]), 1 / Math.LN10);
      case 'log2': return scaleJ(logJ(args[0]), 1 / Math.LN2);
      case 'sqrt': return powJ(args[0], C(0.5, N), N);
      case 'cbrt': return powJ(args[0], C(1 / 3, N), N);
      case 'sinh': return sinhcoshJ(args[0])[0];
      case 'cosh': return sinhcoshJ(args[0])[1];
      case 'tanh': { var sc2 = sinhcoshJ(args[0]); return divJ(sc2[0], sc2[1]); }
      case 'pow': return powJ(args[0], args[1], N);
      case 'gauss': return expJ(negJ(mulJ(args[0], args[0])));
      case 'and': return C((args[0][0] !== 0 && args[1][0] !== 0) ? 1 : 0, N);
      case 'or': return C((args[0][0] !== 0 || args[1][0] !== 0) ? 1 : 0, N);
      case 'not': return C(args[0][0] === 0 ? 1 : 0, N);
      case 'abs': {
        /* |u| = ±u by the sign at the point: exact except exactly at 0 */
        var au = args[0];
        if (au[0] > 0) return au;
        if (au[0] < 0) return negJ(au);
        throw { message: "'abs' is not differentiable at 0" };
      }
      case 'min': case 'max': {
        /* the extreme argument wins locally: exact except at a tie */
        var best = 0, tie = false, mi;
        for (mi = 1; mi < args.length; mi++) {
          var dd = args[mi][0] - args[best][0];
          if (name === 'max' ? dd > 0 : dd < 0) { best = mi; tie = false; }
          else if (dd === 0) tie = true;
        }
        if (tie) throw { message: "'" + name + "' is not differentiable at a tie" };
        return args[best];
      }
      case 'atan': { var u = args[0]; return fromDeriv(u, divJ(C(1, N), addJ(C(1, N), mulJ(u, u))), Math.atan(u[0])); }
      case 'asin': { var a = args[0]; return fromDeriv(a, divJ(C(1, N), powJ(subJ(C(1, N), mulJ(a, a)), C(0.5, N), N)), Math.asin(a[0])); }
      case 'acos': { var b = args[0]; return fromDeriv(b, negJ(divJ(C(1, N), powJ(subJ(C(1, N), mulJ(b, b)), C(0.5, N), N))), Math.acos(b[0])); }
      default: throw { message: "derivatives not available for '" + name + "': use elementary functions" };
    }
  }

  function jetEval(node, env, N) {
    switch (node.k) {
      case 'num': return C(node.v, N);
      case 'var': { var j = env[node.name]; if (!j) throw { message: "variable '" + node.name + "' unavailable" }; return j; }
      case 'neg': return negJ(jetEval(node.a, env, N));
      case 'bin': {
        var a = jetEval(node.a, env, N), b = jetEval(node.b, env, N);
        if (node.op === '+') return addJ(a, b);
        if (node.op === '-') return subJ(a, b);
        if (node.op === '*') return mulJ(a, b);
        if (node.op === '/') return divJ(a, b);
        throw { message: "'%' is not differentiable" };
      }
      case 'pow': return powJ(jetEval(node.a, env, N), jetEval(node.b, env, N), N);
      case 'cmp': {
        /* piecewise-constant: value from the comparison, derivatives 0 (correct a.e.) */
        var ca = jetEval(node.a, env, N)[0], cb = jetEval(node.b, env, N)[0], res;
        switch (node.op) {
          case '<': res = ca < cb; break; case '<=': res = ca <= cb; break;
          case '>': res = ca > cb; break; case '>=': res = ca >= cb; break;
          case '==': res = ca === cb; break; default: res = ca !== cb;
        }
        return C(res ? 1 : 0, N);
      }
      case 'call': {
        if (node.name === 'if' || node.name === 'cases') {
          /* piecewise: differentiate only the live branch (exact wherever the
             active condition doesn't switch, i.e. almost everywhere) */
          var na = node.args, last = na.length - 1;
          for (var pi = 0; pi + 1 < last; pi += 2) {
            if (jetEval(na[pi], env, N)[0] !== 0) return jetEval(na[pi + 1], env, N);
          }
          return jetEval(na[last], env, N);
        }
        var jargs = []; for (var i = 0; i < node.args.length; i++) jargs.push(jetEval(node.args[i], env, N));
        return callJ(node.name, jargs, N);
      }
    }
    throw { message: 'bad AST node' };
  }

  /* jet of g(s) = f(point + s·dir), coefficients [g0..g_{N-1}] */
  function jetOfFn(ast, point, dir, N) {
    var env = {};
    for (var i = 0; i < 4; i++) {
      var nm = NAMES[i], j = new Array(N);
      j[0] = point[nm] || 0; for (var q = 1; q < N; q++) j[q] = 0;
      if (N >= 2) j[1] = dir[nm] || 0;
      env[nm] = j;
    }
    return jetEval(ast, env, N);
  }

  function unit(name) { var d = { x: 0, y: 0, z: 0, t: 0 }; d[name] = 1; return d; }

  /* ---- exact derivatives -------------------------------------------------- */
  function gradientAD(ast, point, vars) {
    var g = [];
    for (var i = 0; i < vars.length; i++) g.push(jetOfFn(ast, point, unit(vars[i]), 2)[1]);
    return g;
  }
  function D2(ast, point, dir) { return jetOfFn(ast, point, dir, 3)[2]; }
  function hessianAD(ast, point, vars) {
    var n = vars.length, H = [], i, j;
    var d2 = [];
    for (i = 0; i < n; i++) d2.push(D2(ast, point, unit(vars[i])));
    for (i = 0; i < n; i++) { H.push([]); for (j = 0; j < n; j++) H[i].push(0); }
    for (i = 0; i < n; i++) H[i][i] = 2 * d2[i];
    for (i = 0; i < n; i++)
      for (j = i + 1; j < n; j++) {
        var dij = { x: 0, y: 0, z: 0, t: 0 }; dij[vars[i]] += 1; dij[vars[j]] += 1;
        var hij = D2(ast, point, dij) - d2[i] - d2[j];
        H[i][j] = hij; H[j][i] = hij;
      }
    return H;
  }
  function taylorCoeffs1D(ast, point, varName, degree) {
    return jetOfFn(ast, point, unit(varName), degree + 1);   /* [f, f', f''/2!, …] */
  }
  /* Jacobian of a vector map F = (F₁,…,F_m): row i = ∇F_i, so J_ij = ∂F_i/∂x_j */
  function jacobianAD(asts, point, vars) {
    var J = [];
    for (var i = 0; i < asts.length; i++) J.push(gradientAD(asts[i], point, vars));
    return J;
  }
  function jacobianFD(fns, point, vars, h) {
    var J = [];
    for (var i = 0; i < fns.length; i++) J.push(gradientFD(fns[i], point, vars, h));
    return J;
  }
  /* value of the degree-n multivariate Taylor polynomial at target */
  function taylorValueAt(ast, expPoint, target, degree) {
    var dir = { x: (target.x || 0) - (expPoint.x || 0), y: (target.y || 0) - (expPoint.y || 0), z: (target.z || 0) - (expPoint.z || 0), t: 0 };
    var jet = jetOfFn(ast, expPoint, dir, degree + 1);
    var s = 0; for (var k = 0; k <= degree; k++) s += jet[k];   /* evaluate at s = 1 */
    return s;
  }

  /* ---- finite-difference fallbacks --------------------------------------- */
  function ev(fn, P, dx, dy, dz) { return fn((P.x || 0) + dx, (P.y || 0) + dy, (P.z || 0) + dz, P.t || 0); }
  function pert(nm, h) { return { x: nm === 'x' ? h : 0, y: nm === 'y' ? h : 0, z: nm === 'z' ? h : 0 }; }
  function gradientFD(fn, P, vars, h) {
    h = h || 1e-4; var g = [];
    for (var i = 0; i < vars.length; i++) {
      var d = pert(vars[i], h);
      g.push((ev(fn, P, d.x, d.y, d.z) - ev(fn, P, -d.x, -d.y, -d.z)) / (2 * h));
    }
    return g;
  }
  function hessianFD(fn, P, vars, h) {
    h = h || 1e-3; var n = vars.length, H = [], f0 = ev(fn, P, 0, 0, 0), i, j;
    for (i = 0; i < n; i++) { H.push([]); for (j = 0; j < n; j++) H[i].push(0); }
    for (i = 0; i < n; i++) {
      var di = pert(vars[i], h);
      H[i][i] = (ev(fn, P, di.x, di.y, di.z) - 2 * f0 + ev(fn, P, -di.x, -di.y, -di.z)) / (h * h);
    }
    for (i = 0; i < n; i++)
      for (j = i + 1; j < n; j++) {
        var a = pert(vars[i], h), b = pert(vars[j], h);
        var hij = (ev(fn, P, a.x + b.x, a.y + b.y, a.z + b.z) - ev(fn, P, a.x - b.x, a.y - b.y, a.z - b.z)
          - ev(fn, P, -a.x + b.x, -a.y + b.y, -a.z + b.z) + ev(fn, P, -a.x - b.x, -a.y - b.y, -a.z - b.z)) / (4 * h * h);
        H[i][j] = hij; H[j][i] = hij;
      }
    return H;
  }

  VF.Autodiff = {
    gradientAD: gradientAD, hessianAD: hessianAD, jacobianAD: jacobianAD, jacobianFD: jacobianFD,
    taylorCoeffs1D: taylorCoeffs1D, taylorValueAt: taylorValueAt,
    gradientFD: gradientFD, hessianFD: hessianFD, jetOfFn: jetOfFn
  };

})(window.VF = window.VF || {});
