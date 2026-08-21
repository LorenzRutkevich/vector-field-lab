/* =============================================================================
 * tests.js: in-app self tests
 * -----------------------------------------------------------------------------
 * Runs on load and reports a pass/fail badge. These guard the math so a
 * regression is visible immediately instead of producing a silently-wrong plot.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function runTests() {
    var results = [], P = VF.Parser, L = VF.LinAlg, F = VF.FieldMath, C = VF.Colormaps;

    function ok(name, cond) { results.push({ name: name, pass: !!cond }); }
    function approx(a, b, tol) { return Math.abs(a - b) <= (tol || 1e-6); }
    function ev(expr, x, y, z, t) { return P.compile(expr).fn(x, y, z, t); }

    /* --- parser --- */
    ok('parser: 2+3*4', approx(ev('2+3*4', 0, 0, 0, 0), 14));
    ok('parser: x^2', approx(ev('x^2', 3, 0, 0, 0), 9));
    ok('parser: -2^2 = -4', approx(ev('-2^2', 0, 0, 0, 0), -4));
    ok('parser: 2^-2 = 0.25', approx(ev('2^-2', 0, 0, 0, 0), 0.25));
    ok('parser: 2^3^2 = 512 (right assoc)', approx(ev('2^3^2', 0, 0, 0, 0), 512));
    ok('parser: implicit 2x', approx(ev('2x', 4, 0, 0, 0), 8));
    ok('parser: implicit 3sin(0)', approx(ev('3sin(0)', 0, 0, 0, 0), 0));
    ok('parser: (x+1)(x-1)', approx(ev('(x+1)(x-1)', 3, 0, 0, 0), 8));
    ok('parser: sin(pi/2)', approx(ev('sin(pi/2)', 0, 0, 0, 0), 1));
    ok('parser: pseudo r at (3,4,0)', approx(ev('r', 3, 4, 0, 0), 5));
    ok('parser: rho at (3,4,5)', approx(ev('rho', 3, 4, 5, 0), 5));
    ok('parser: hypot(3,4)', approx(ev('hypot(3,4)', 0, 0, 0, 0), 5));
    ok('parser: atan2(1,1)=pi/4', approx(ev('atan2(1,1)', 0, 0, 0, 0), Math.PI / 4));
    ok('parser: clamp(5,0,3)=3', approx(ev('clamp(5,0,3)', 0, 0, 0, 0), 3));
    ok('parser: rejects unknown id', !P.validate('foo + x').ok);
    ok('parser: rejects bad arity', !P.validate('sin(1,2)').ok);
    ok('parser: rejects unbalanced', !P.validate('sin(x').ok);
    ok('parser: |x|-|y| (abs)', approx(ev('|x|-|y|', 3, -4, 0, 0), -1));
    ok('parser: |x-y| (abs)', approx(ev('|x-y|', 1, 5, 0, 0), 4));
    ok('parser: 2*|x|', approx(ev('2*|x|', -3, 0, 0, 0), 6));
    ok('parser: sqrt(|x|)', approx(ev('sqrt(|x|)', -9, 0, 0, 0), 3));
    ok('parser: rejects unclosed |', !P.validate('|x - y').ok);
    ok('parser: xyz = x*y*z', approx(ev('xyz', 2, 3, 4, 0), 24));
    ok('parser: xy = x*y', approx(ev('xy', 2, 3, 0, 0), 6));
    ok('parser: xy+z stops at +', approx(ev('xy+z', 2, 3, 4, 0), 10));
    ok('parser: xy^2 = x·y² (exponent binds to last letter)', approx(ev('xy^2', 2, 3, 0, 0), 18));
    ok('parser: xy² superscript same binding', approx(ev('xy²', 2, 3, 0, 0), 18));
    ok('parser: (xy)^2 with parens = 36', approx(ev('(xy)^2', 2, 3, 0, 0), 36));
    ok('parser: xyz^2 = x·y·z²', approx(ev('xyz^2', 2, 3, 4, 0), 96));
    ok('parser: xy^2^2 right assoc on the letter', approx(ev('xy^2^2', 2, 3, 0, 0), 2 * 81));
    ok('parser: exp(xyz)', approx(ev('exp(xyz)', 0.5, 1, 2, 0), Math.exp(1)));
    ok('parser: pi not split', approx(ev('pi', 0, 0, 0, 0), Math.PI));

    /* --- comparisons (return 1/0) --- */
    ok('cmp: x<1 true→1', approx(ev('x<1', 0, 0, 0, 0), 1) && approx(ev('x<1', 2, 0, 0, 0), 0));
    ok('cmp: x<=1 at boundary→1', approx(ev('x<=1', 1, 0, 0, 0), 1) && approx(ev('x<1', 1, 0, 0, 0), 0));
    ok('cmp: x>0 / x>=0', approx(ev('x>0', 1, 0, 0, 0), 1) && approx(ev('x>0', 0, 0, 0, 0), 0) && approx(ev('x>=0', 0, 0, 0, 0), 1));
    ok('cmp: 2==2 / 2!=3', approx(ev('2==2', 0, 0, 0, 0), 1) && approx(ev('2!=3', 0, 0, 0, 0), 1) && approx(ev('2==3', 0, 0, 0, 0), 0));
    ok('cmp: precedence x+1 < 2y', approx(ev('x+1 < 2y', 0, 1, 0, 0), 1) && approx(ev('x+1 < 2y', 3, 1, 0, 0), 0));
    ok('cmp: chained 0<x<2', approx(ev('0<x<2', 1, 0, 0, 0), 1) && approx(ev('0<x<2', 3, 0, 0, 0), 0) && approx(ev('0<x<2', -1, 0, 0, 0), 0));
    ok('cmp: chained 1<r2<4 (annulus)', approx(ev('1 < x^2+y^2 < 4', 1.5, 0, 0, 0), 1) && approx(ev('1 < x^2+y^2 < 4', 0.5, 0, 0, 0), 0));
    ok('cmp: mask x*(x>0) = relu', approx(ev('x*(x>0)', 3, 0, 0, 0), 3) && approx(ev('x*(x>0)', -3, 0, 0, 0), 0));
    ok('cmp: and/or/not', approx(ev('and(x>0, y>0)', 1, 1, 0, 0), 1) && approx(ev('and(x>0, y>0)', 1, -1, 0, 0), 0) && approx(ev('or(x>0,y>0)', -1, 1, 0, 0), 1) && approx(ev('not(x>0)', -1, 0, 0, 0), 1));
    ok('cmp: rejects lone =', !P.validate('x = 1').ok);

    /* --- norms & piecewise --- */
    ok('norm: ||x,y|| Euclidean = 5', approx(ev('||x,y||', 3, 4, 0, 0), 5));
    ok('norm: ||x,y,z|| = 7', approx(ev('||x,y,z||', 2, 3, 6, 0), 7));
    ok('norm: single ||x|| = |x|', approx(ev('||x||', -5, 0, 0, 0), 5));
    ok('norm: nested ||x, ||y,z||||', approx(ev('||x, ||y,z||||', 3, 0, 4, 0), 5));
    P.setNorm('1');
    ok('norm: setNorm 1 → taxicab', approx(ev('||x,y||', 3, -4, 0, 0), 7));
    P.setNorm('inf');
    ok('norm: setNorm inf → maximum', approx(ev('||x,y||', 3, -4, 0, 0), 4));
    P.setNorm('p', 3);
    ok('norm: setNorm p=3 → (|x|³+|y|³)^⅓', approx(ev('||x,y||', 3, 4, 0, 0), Math.pow(91, 1 / 3)));
    P.setNorm('2');
    ok('norm: named forms are fixed', approx(ev('norm(x,y)', 3, 4, 0, 0), 5) && approx(ev('norm1(x,y)', 3, -4, 0, 0), 7)
      && approx(ev('norminf(x,y)', 3, -4, 0, 0), 4) && approx(ev('normp(3,x,y)', 3, 4, 0, 0), Math.pow(91, 1 / 3)));
    ok('norm: rejects unclosed ||', !P.validate('||x, y').ok);
    ok('piecewise: if is lazy at the origin (no NaN)', approx(ev('if(||x,y|| != 0, x*y/||x,y||, 0)', 0, 0, 0, 0), 0));
    ok('piecewise: if value away from 0', approx(ev('if(||x,y|| != 0, x*y/||x,y||, 0)', 3, 4, 0, 0), 2.4));
    ok('piecewise: cases = sign(x)', approx(ev('cases(x<0, -1, x==0, 0, 1)', -2, 0, 0, 0), -1)
      && approx(ev('cases(x<0, -1, x==0, 0, 1)', 0, 0, 0, 0), 0) && approx(ev('cases(x<0, -1, x==0, 0, 1)', 2, 0, 0, 0), 1));
    ok('piecewise: cases rejects even arity', !P.validate('cases(x>0, 1)').ok);

    /* --- colormaps --- */
    var vir0 = C.get('viridis')(0), vir1 = C.get('viridis')(1);
    ok('colormap: viridis(0) dark purple', vir0.r < 0.4 && vir0.b > 0.25);
    ok('colormap: viridis(1) yellow', vir1.r > 0.8 && vir1.g > 0.8 && vir1.b < 0.3);
    ok('colormap: coolwarm(0.5) near white', approx(C.get('coolwarm')(0.5).r, 0.95, 0.05));

    /* --- linalg --- */
    ok('linalg: det(I)=1', approx(L.det(L.ident()), 1));
    var D = [[2, 0, 0], [0, -1, 0], [0, 0, 0.5]];
    var eD = L.expm(D);
    ok('linalg: expm(diag) diagonal', approx(eD[0][0], Math.exp(2)) && approx(eD[1][1], Math.exp(-1)) && approx(eD[2][2], Math.exp(0.5)));
    ok('linalg: expm(0)=I', approx(L.expm([[0, 0, 0], [0, 0, 0], [0, 0, 0]])[0][0], 1));
    var Kz = [[0, -1, 0], [1, 0, 0], [0, 0, 0]], th = 0.7;
    var eK = L.expm(L.scale(Kz, th)), Rz = L.rotationAxisAngle([0, 0, 1], th);
    var rotMatch = true;
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if (!approx(eK[i][j], Rz[i][j], 1e-5)) rotMatch = false;
    ok('linalg: exp(θKz) = Rz(θ)', rotMatch);
    ok('linalg: Rz is a rotation', L.isRotation(Rz));
    var eg = L.eig(D).values.map(function (v) { return v.re; }).sort(function (a, b) { return a - b; });
    ok('linalg: eig(diag) = {-1,0.5,2}', approx(eg[0], -1) && approx(eg[1], 0.5) && approx(eg[2], 2));
    var eig3 = L.eig([[0, -1, 0], [1, 0, 0], [0, 0, 2]]);
    var hasComplex = eig3.values.some(function (v) { return Math.abs(v.im) > 0.5; });
    ok('linalg: complex eigenvalues detected', hasComplex);
    var Ainv = L.inverse([[2, 1, 0], [1, 2, 0], [0, 0, 3]]);
    var AinvA = L.mul(Ainv, [[2, 1, 0], [1, 2, 0], [0, 0, 3]]);
    ok('linalg: A⁻¹A = I', approx(AinvA[0][0], 1) && approx(AinvA[0][1], 0) && approx(AinvA[1][1], 1) && approx(AinvA[2][2], 1));
    ok('linalg: singular matrix has no inverse', L.inverse([[1, 2, 3], [2, 4, 6], [0, 0, 1]]) === null);

    /* --- field operators --- */
    var radial = F.vectorField(function (x) { return x; }, function (x, y) { return y; }, function (x, y, z) { return z; }, 'r');
    ok('field: div(radial) = 3', approx(F.div(radial).at(1, 2, 3, 0), 3, 1e-3));
    ok('field: curl(radial) = 0', approx(L.norm3(F.curl(radial).at(1, 2, 3, 0)), 0, 1e-3));
    var rot = F.vectorField(function (x, y) { return -y; }, function (x) { return x; }, function () { return 0; }, 'rot');
    var cu = F.curl(rot).at(0.4, -0.2, 1, 0);
    ok('field: curl(-y,x,0) = (0,0,2)', approx(cu[0], 0, 1e-3) && approx(cu[1], 0, 1e-3) && approx(cu[2], 2, 1e-3));
    var quad = F.scalarField(P.compile('x^2+y^2+z^2').fn, 'q');
    var gr = F.grad(quad).at(1, 2, 3, 0);
    ok('field: grad(x²+y²+z²) = (2,4,6)', approx(gr[0], 2, 1e-3) && approx(gr[1], 4, 1e-3) && approx(gr[2], 6, 1e-3));
    ok('field: laplacian(x²+y²+z²) = 6', approx(F.laplacian(quad).at(1, 1, 1, 0), 6, 1e-2));
    var sinx = F.scalarField(P.compile('sin(x)').fn, 's');
    ok('field: laplacian(sin x) = -sin x', approx(F.laplacian(sinx).at(0.6, 0, 0, 0), -Math.sin(0.6), 1e-3));
    var circle = function (u) { return [Math.cos(u), Math.sin(u), 0]; };
    var li = F.lineIntegral(circle, function (x, y) { return [-y, x, 0]; }, 0, 2 * Math.PI, 600);
    ok('line integral: ∮(-y,x)·dr = 2π', approx(li.value, 2 * Math.PI, 1e-2));
    ok('line integral: arc length of circle = 2π', approx(li.arcLength, 2 * Math.PI, 1e-2));
    var li2 = F.lineIntegral(function (u) { return [u, u, 0]; }, function (x, y) { return [2 * x, 2 * y, 0]; }, 0, 1, 400);
    ok('line integral: conservative ∇(x²+y²) = 2', approx(li2.value, 2, 1e-3));

    /* --- manifolds --- */
    var Mf = VF.Manifolds, ca = function (e) { return P.parseAST(e).ast; }, cf = function (e) { return P.compile(e).fn; };
    var sph = Mf.surfaceLocal([ca('sin(u)*cos(v)'), ca('sin(u)*sin(v)'), ca('cos(u)')],
      [cf('sin(u)*cos(v)'), cf('sin(u)*sin(v)'), cf('cos(u)')], Math.PI / 2, 0);
    ok('manifold: unit sphere Gaussian K = 1', approx(sph.K, 1, 1e-2));
    ok('manifold: unit sphere |mean H| = 1', approx(Math.abs(sph.H), 1, 1e-2));
    ok('manifold: unit sphere principal |k1| = 1', approx(Math.abs(sph.k1), 1, 1e-2));
    var hel = Mf.curveFrame([ca('cos(t)'), ca('sin(t)'), ca('0.5*t')], [cf('cos(t)'), cf('sin(t)'), cf('0.5*t')], 0);
    ok('manifold: helix curvature κ = 0.8', approx(hel.kappa, 0.8, 1e-3));
    ok('manifold: helix torsion τ = 0.4', approx(hel.tau, 0.4, 1e-3));
    var plane = Mf.surfaceGrid([cf('u'), cf('v'), cf('0')], 0, 1, 0, 1, 20);
    ok('manifold: flat plane χ = 0 (Gauss–Bonnet)', approx(plane.chi, 0, 1e-6));
    var mt = Mf.marchingTets(cf('x^2+y^2+z^2'), 1, { min: [-1.5, -1.5, -1.5], max: [1.5, 1.5, 1.5] }, 18);
    var onSphere = mt.pos.length > 200;
    for (var mi = 0; mi < mt.pos.length; mi++) { var pv = mt.pos[mi], rr = pv[0] * pv[0] + pv[1] * pv[1] + pv[2] * pv[2]; if (Math.abs(rr - 1) > 0.06) onSphere = false; }
    ok('manifold: isosurface x²+y²+z²=1 vertices on unit sphere', onSphere);
    var sn1 = Mf.snapToLevel(cf('x^2+y^2+z^2'), 4, [3, 0, 0]);
    ok('manifold: snap (3,0,0) → (2,0,0) on sphere g = 4', sn1.ok && !sn1.singular && approx(sn1.p[0], 2, 1e-4) && approx(sn1.p[1], 0, 1e-6) && approx(sn1.p[2], 0, 1e-6));
    var sn2 = Mf.snapToLevel(cf('x^2+y^2+z^2'), 4, [0.5, 0, 0]);
    ok('manifold: snap works from inside the sphere too', sn2.ok && approx(sn2.p[0], 2, 1e-4));
    var sn3 = Mf.snapToLevel(cf('x^2/4+y^2+z^2'), 1, [3, 1, 1]);
    ok('manifold: snap lands on ellipsoid, unit normal', sn3.ok && approx(sn3.gval, 1, 1e-4) && approx(sn3.n[0] * sn3.n[0] + sn3.n[1] * sn3.n[1] + sn3.n[2] * sn3.n[2], 1, 1e-6));
    var sn4 = Mf.snapToLevel(cf('x^2+y^2+z^2'), 0, [1, 0, 0]);
    ok('manifold: snap flags singular footpoint (∇g = 0, cone tip case)', sn4.singular);
    var sn5 = Mf.snapToLevel(cf('x^2+y^2+z^2'), -1, [1, 0, 0]);
    ok('manifold: snap reports failure when g = c is empty', !sn5.ok);
    var lc = Mf.levelCurves2D(function (x, y) { return x * x + y * y; }, 4, -3, 3, -3, 3, 60);
    var lcOK = lc.length === 1 && lc[0].closed === true, arc2 = 0, pp2 = null, lci;
    if (lcOK) for (lci = 0; lci < lc[0].pts.length; lci++) {
      var pv2 = lc[0].pts[lci];
      if (Math.abs(Math.sqrt(pv2[0] * pv2[0] + pv2[1] * pv2[1]) - 2) > 0.01) lcOK = false;
      if (pp2) arc2 += Math.sqrt((pv2[0] - pp2[0]) * (pv2[0] - pp2[0]) + (pv2[1] - pp2[1]) * (pv2[1] - pp2[1]));
      pp2 = pv2;
    }
    ok('manifold: level circle g = 4 is one closed chain on r = 2, length ≈ 4π', lcOK && approx(arc2, 4 * Math.PI, 0.05));
    var lcO = Mf.levelCurves2D(function (x, y) { return y - x; }, 0.05, -3, 3, -3, 3, 40);
    ok('manifold: open level line is a single open chain', lcO.length === 1 && !lcO[0].closed);
    var lcP = Mf.levelCurvesPred(function (x, y) { return x * x + y * y < 4; }, -3, 3, -3, 3, 48);
    var lpOK = lcP.length === 1 && lcP[0].closed === true, lpi;
    if (lpOK) for (lpi = 0; lpi < lcP[0].pts.length; lpi++) {
      var pq = lcP[0].pts[lpi];
      if (Math.abs(Math.sqrt(pq[0] * pq[0] + pq[1] * pq[1]) - 2) > 0.005) lpOK = false;
    }
    ok('manifold: predicate boundary (bisected) sits on r = 2', lpOK);
    /* constraint parsing: relations classify into mask + boundary parts */
    var pcE = P.parseConstraint('x^2 + y^2 = 4');
    ok('parser: constraint "g = c" is an equality with boundary g − c', pcE.ok && pcE.kind === 'eq' && pcE.fn === null &&
      pcE.boundaries.length === 1 && approx(pcE.boundaries[0].fn(2, 0, 0, 0), 0) && approx(pcE.boundaries[0].fn(3, 0, 0, 0), 5));
    var pcI = P.parseConstraint('x^2 + y^2 <= 4');
    ok('parser: constraint "g <= c" masks the region and keeps the boundary', pcI.ok && pcI.kind === 'ineq' &&
      pcI.fn(1, 1, 0, 0) === 1 && pcI.fn(3, 0, 0, 0) === 0 && pcI.boundaries.length === 1 && approx(pcI.boundaries[0].fn(0, 2, 0, 0), 0));
    var pcC = P.parseConstraint('2 < x^2 + y^2 < 9');
    ok('parser: chained constraint has two boundaries', pcC.ok && pcC.kind === 'ineq' && pcC.boundaries.length === 2 &&
      pcC.fn(2, 0, 0, 0) === 1 && pcC.fn(0.5, 0, 0, 0) === 0 && pcC.fn(3.1, 0, 0, 0) === 0);
    var pcG = P.parseConstraint('and(x > 0, y > 0)');
    ok('parser: boolean-combo constraint is generic (mask only)', pcG.ok && pcG.kind === 'ineq' && pcG.generic === true &&
      pcG.boundaries.length === 0 && pcG.fn(1, 1, 0, 0) === 1 && pcG.fn(-1, 1, 0, 0) === 0);
    var lag = Mf.lagrangeCandidates(lc,
      function (x, y) { return x * x - y * y; },
      function (x, y) { return [2 * x, -2 * y]; },
      function (x, y) { return [2 * x, 2 * y]; });
    var lagOK = lag.length === 4, nmax = 0, nmin = 0;
    for (lci = 0; lci < lag.length; lci++) {
      var cd2 = lag[lci];
      if (cd2.kind === 'max') { nmax++; if (!approx(Math.abs(cd2.x), 2, 0.05) || !approx(cd2.y, 0, 0.05) || !approx(cd2.f, 4, 0.05) || !approx(cd2.lam, 1, 0.05)) lagOK = false; }
      else if (cd2.kind === 'min') { nmin++; if (!approx(cd2.x, 0, 0.05) || !approx(Math.abs(cd2.y), 2, 0.05) || !approx(cd2.f, -4, 0.05) || !approx(cd2.lam, -1, 0.05)) lagOK = false; }
      else lagOK = false;
    }
    ok('manifold: Lagrange x²−y² on circle → ±(2,0) max λ=1, (0,±2) min λ=−1', lagOK && nmax === 2 && nmin === 2);
    var msh3 = Mf.marchingTets(function (x, y, z) { return x * x + y * y + z * z - 9; }, 0, { min: [-5, -5, -5], max: [5, 5, 5] }, 30);
    var l3 = Mf.lagrangeCandidates3D(msh3,
      function (x, y, z) { return 2 * x - y - 2 * z; },
      function (x, y, z) { return x * x + y * y + z * z - 9; },
      function () { return [2, -1, -2]; },
      function (x, y, z) { return [2 * x, 2 * y, 2 * z]; },
      function () { return [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; },
      function () { return [[2, 0, 0], [0, 2, 0], [0, 0, 2]]; }, 5);
    var lmx = null, lmn = null, l3i;
    for (l3i = 0; l3i < l3.cands.length; l3i++) { if (l3.cands[l3i].kind === 'max') lmx = l3.cands[l3i]; if (l3.cands[l3i].kind === 'min') lmn = l3.cands[l3i]; }
    ok('manifold: 3-D Lagrange 2x−y−2z on sphere r=3 → max f=9 @ (2,−1,−2) λ=½, min f=−9 λ=−½',
      l3.cands.length === 2 && !l3.degenerate && lmx !== null && lmn !== null &&
      approx(lmx.f, 9, 1e-5) && approx(lmx.x, 2, 1e-4) && approx(lmx.y, -1, 1e-4) && approx(lmx.z, -2, 1e-4) && approx(lmx.lam, 0.5, 1e-5) &&
      approx(lmn.f, -9, 1e-5) && approx(lmn.lam, -0.5, 1e-5));
    var l3d = Mf.lagrangeCandidates3D(msh3,
      function (x, y, z) { return x * x + y * y + z * z; },
      function (x, y, z) { return x * x + y * y + z * z - 9; },
      function (x, y, z) { return [2 * x, 2 * y, 2 * z]; },
      function (x, y, z) { return [2 * x, 2 * y, 2 * z]; },
      function () { return [[2, 0, 0], [0, 2, 0], [0, 0, 2]]; },
      function () { return [[2, 0, 0], [0, 2, 0], [0, 0, 2]]; }, 5);
    ok('manifold: 3-D Lagrange degenerate, f constant on the surface', l3d.degenerate === true && l3d.cands.length === 0);

    /* --- automatic differentiation --- */
    var AD = VF.Autodiff;
    function ast(e) { return P.parseAST(e).ast; }
    function pt(x, y, z) { return { x: x || 0, y: y || 0, z: z || 0, t: 0 }; }
    var tc = AD.taylorCoeffs1D(ast('exp(x)'), pt(0), 'x', 5);
    ok('AD: taylor exp @0 = 1,1,½,⅙…', approx(tc[0], 1) && approx(tc[1], 1) && approx(tc[2], 0.5) && approx(tc[3], 1 / 6) && approx(tc[4], 1 / 24));
    var ts = AD.taylorCoeffs1D(ast('sin(x)'), pt(0), 'x', 5);
    ok('AD: taylor sin @0 = 0,1,0,−⅙,0', approx(ts[0], 0) && approx(ts[1], 1) && approx(ts[2], 0) && approx(ts[3], -1 / 6) && approx(ts[5], 1 / 120));
    var tg = AD.taylorCoeffs1D(ast('1/(1-x)'), pt(0), 'x', 4);
    ok('AD: taylor 1/(1−x) @0 = 1,1,1,1', approx(tg[0], 1) && approx(tg[1], 1) && approx(tg[2], 1) && approx(tg[3], 1) && approx(tg[4], 1));
    var gA = AD.gradientAD(ast('x^2+y^2'), pt(1, 2), ['x', 'y']);
    ok('AD: grad(x²+y²)@(1,2) = (2,4)', approx(gA[0], 2) && approx(gA[1], 4));
    var gS = AD.gradientAD(ast('sin(x)*y'), pt(0, 3), ['x', 'y']);
    ok('AD: grad(sin(x)y)@(0,3) = (3,0)', approx(gS[0], 3) && approx(gS[1], 0));
    var hxy = AD.hessianAD(ast('x*y'), pt(1, 1), ['x', 'y']);
    ok('AD: hessian(xy) = [[0,1],[1,0]]', approx(hxy[0][0], 0) && approx(hxy[0][1], 1) && approx(hxy[1][0], 1) && approx(hxy[1][1], 0));
    var hq = AD.hessianAD(ast('x^2+2*y^2'), pt(1, 1), ['x', 'y']);
    ok('AD: hessian(x²+2y²) = [[2,0],[0,4]]', approx(hq[0][0], 2) && approx(hq[0][1], 0) && approx(hq[1][1], 4));
    var h3 = AD.hessianAD(ast('x^3'), pt(2), ['x']);
    ok('AD: hessian(x³)@2 = 12', approx(h3[0][0], 12));
    var tv = AD.taylorValueAt(ast('exp(x)'), pt(0), pt(1), 4);
    ok('AD: taylor₄ exp @0 eval x=1 ≈ 2.7083', approx(tv, 1 + 1 + 0.5 + 1 / 6 + 1 / 24, 1e-9));
    var Jm = AD.jacobianAD([ast('x^2'), ast('x*y'), ast('z')], pt(2, 3, 1), ['x', 'y', 'z']);
    ok('AD: Jacobian(x²,xy,z) rows', approx(Jm[0][0], 4) && approx(Jm[0][1], 0) && approx(Jm[1][0], 3) && approx(Jm[1][1], 2) && approx(Jm[2][2], 1));
    ok('AD: Jacobian det = 8, trace = 7 (=div)', approx(L.det(Jm), 8) && approx(L.trace(Jm), 7));
    var gFD = AD.gradientFD(P.compile('x^2+y^2').fn, pt(1, 2), ['x', 'y']);
    ok('AD: gradientFD matches', approx(gFD[0], 2, 1e-3) && approx(gFD[1], 4, 1e-3));
    /* comparisons are piecewise-constant: masked field keeps the smooth gradient inside, 0 outside */
    var gIn = AD.gradientAD(ast('(x<1)*x^2'), pt(0.5), ['x']);
    ok('AD: grad (x<1)·x² inside = 2x', approx(gIn[0], 1));
    var gOut = AD.gradientAD(ast('(x<1)*x^2'), pt(2), ['x']);
    ok('AD: grad (x<1)·x² outside = 0', approx(gOut[0], 0));
    /* norms & piecewise: exact derivatives wherever they exist */
    var gN = AD.gradientAD(ast('||x,y||'), pt(3, 4), ['x', 'y']);
    ok('AD: ∇‖(x,y)‖@(3,4) = (0.6, 0.8)', approx(gN[0], 0.6) && approx(gN[1], 0.8));
    var pw = ast('if(||x,y|| != 0, x*y/||x,y||, 0)');
    var gP0 = AD.gradientAD(pw, pt(0, 0), ['x', 'y']);
    ok('AD: xy/‖·‖ partials at 0 exist = (0,0)', approx(gP0[0], 0) && approx(gP0[1], 0));
    var gP = AD.gradientAD(pw, pt(3, 4), ['x', 'y']);
    ok('AD: ∇(xy/r) = (y³, x³)/r³ away from 0', approx(gP[0], 64 / 125) && approx(gP[1], 27 / 125));
    var gAbs = AD.gradientAD(ast('|x|+|y|'), pt(2, -3), ['x', 'y']);
    ok('AD: ∇(|x|+|y|)@(2,−3) = (1,−1)', approx(gAbs[0], 1) && approx(gAbs[1], -1));
    var gInf = AD.gradientAD(ast('norminf(x,y)'), pt(3, -4), ['x', 'y']);
    ok('AD: ∇max-norm picks the active component', approx(gInf[0], 0) && approx(gInf[1], -1));

    /* --- total derivative (DiffCheck) --- */
    var DC = VF.DiffCheck;
    function fn1(e) { return P.compile(e).fn; }
    function wrap1(f) { return function (x, y, z, t) { return [f(x, y, z, t)]; }; }
    var fq = fn1('x^2+y^2');
    ok('DC: D_v(x²+y²) = ∇f·v', approx(DC.dirDeriv(fq, pt(1, 2), [0.6, 0.8], ['x', 'y']), 4.4, 1e-3));
    var fab = fn1('|x|');
    ok('DC: one-sided D of |x| at 0 is +1 both ways', approx(DC.dirDeriv(fab, pt(0), [1], ['x']), 1, 1e-3) && approx(DC.dirDeriv(fab, pt(0), [-1], ['x']), 1, 1e-3));
    var fpw = fn1('if(||x,y|| != 0, x*y/||x,y||, 0)');
    ok('DC: Gateaux D_v of xy/‖·‖ at 0 = cosφ·sinφ', approx(DC.dirDeriv(fpw, pt(0, 0), [Math.SQRT1_2, Math.SQRT1_2], ['x', 'y']), 0.5, 1e-3));
    var rSmooth = DC.remainderTest(wrap1(fq), pt(1, 2), [[2, 4]], ['x', 'y']);
    ok('DC: x²+y² totally differentiable', rSmooth.differentiable === true && rSmooth.rows[2].ratio < 1e-3);
    var rPw = DC.remainderTest(wrap1(fpw), pt(0, 0), [[0, 0]], ['x', 'y']);
    ok('DC: xy/‖·‖ NOT totally diff. at 0, ratio ½', rPw.differentiable === false && approx(rPw.rows[2].ratio, 0.5, 0.02));
    var rAbs = DC.remainderTest(wrap1(fab), pt(0), [[0]], ['x']);
    ok('DC: |x| not differentiable at 0, ratio 1', rAbs.differentiable === false && approx(rAbs.rows[2].ratio, 1, 1e-3));
    ok('DC: |x| differentiable at 1', DC.remainderTest(wrap1(fab), pt(1), [[1]], ['x']).differentiable === true);
    var rLin = DC.remainderTest(wrap1(fn1('2x+3y')), pt(0.4, -0.7), [[2, 3]], ['x', 'y']);
    ok('DC: linear function has zero remainder', rLin.differentiable === true && rLin.rows[2].ratio < 1e-9);
    var rR3 = DC.remainderTest(wrap1(fn1('r')), pt(0, 0, 0), [[0, 0, 0]], ['x', 'y', 'z']);
    ok('DC: ‖x‖ in ℝ³ not diff. at 0, ratio 1', rR3.differentiable === false && approx(rR3.rows[2].ratio, 1, 1e-3));
    var Fv = F.vectorField(fn1('x^2-y^2'), fn1('2*x*y'), fn1('z'), 'F');
    var rVec = DC.remainderTest(Fv.at, pt(1, 1, 0), [[2, -2, 0], [2, 2, 0], [0, 0, 1]], ['x', 'y', 'z']);
    ok('DC: vector map z²-style F totally differentiable', rVec.differentiable === true);

    /* --- continuity classification (Lipschitz ⊂ uniform ⊂ continuous) --- */
    var Ct = VF.Continuity;
    function ct1(fnc, gm, reg) { return Ct.analyze(fnc, gm, { vars: ['x'], R: 5, t: 0, region: reg || null }); }
    var rSin = ct1(function (x) { return Math.sin(x); }, function (Pt2) { return Math.abs(Math.cos(Pt2.x)); });
    ok('Ct: sin, Lipschitz with L ≈ 1', rSin.continuous && rSin.uniform && rSin.lipschitz && approx(rSin.L, 1, 0.02));
    var rSq = ct1(function (x) { return x * x; }, function (Pt2) { return Math.abs(2 * Pt2.x); });
    ok('Ct: x², Lipschitz on the box (L ≈ 2R), slope grows beyond it', rSq.lipschitz && approx(rSq.L, 10, 0.05) && rSq.growth && rSq.growth.growing === true);
    var rRt = ct1(function (x) { return Math.sqrt(Math.abs(x)); }, function (Pt2) { var av = Math.abs(Pt2.x); return av > 0 ? 0.5 / Math.sqrt(av) : Infinity; });
    ok('Ct: √|x|, uniformly continuous (Heine–Cantor) but NOT Lipschitz', rRt.continuous === true && rRt.uniform === true && rRt.lipschitz === false);
    var rSt = ct1(function (x) { return x > 0 ? 1 : 0; }, function () { return 0; });
    ok('Ct: step, not continuous, jump ≈ 1 at 0', rSt.continuous === false && rSt.jump && approx(rSt.jump.size, 1, 0.05) && Math.abs(rSt.jump.at[0]) < 0.05);
    var fInv = function (x) { return 1 / x; }, gInv = function (Pt2) { return 1 / (Pt2.x * Pt2.x); };
    var rInv = ct1(fInv, gInv);
    ok('Ct: 1/x, continuous on its domain but NOT uniformly continuous', rInv.continuous === true && rInv.uniform === false && rInv.lipschitz === false);
    var rInvR = ct1(fInv, gInv, function (x) { return x >= 1 ? 1 : 0; });
    ok('Ct: 1/x restricted to [1, R], Lipschitz with L ≈ 1', rInvR.lipschitz === true && approx(rInvR.L, 1, 0.05));
    var rCone = Ct.analyze(function (x, y) { return Math.sqrt(x * x + y * y); }, function () { return 1; }, { vars: ['x', 'y'], R: 5, t: 0, region: null });
    ok('Ct: cone ‖(x,y)‖, Lipschitz with L = 1 in 2-D', rCone.lipschitz === true && approx(rCone.L, 1, 1e-9));

    /* --- Minkowski / Lorentz boosts (hyperbolic rotations) --- */
    var Mk = VF.Mink;
    ok('mink: γ(0.6) = 1.25', approx(Mk.gamma(0.6), 1.25));
    ok('mink: β↔φ round trip', approx(Mk.betaOf(Mk.rapidity(0.8)), 0.8) && approx(Mk.rapidity(0), 0));
    var mev = Mk.toPrimed(2, 3, 0.5);
    ok('mink: interval s² invariant under boost', approx(Mk.interval(2, 3), Mk.interval(mev.x, mev.ct), 1e-9));
    var mback = Mk.toUnprimed(mev.x, mev.ct, 0.5);
    ok('mink: boost then inverse = identity', approx(mback.x, 2, 1e-9) && approx(mback.ct, 3, 1e-9));
    var mph = Mk.toPrimed(1, 1, 0.7);
    ok('mink: light stays at 45° (x′ = ct′)', approx(mph.x, mph.ct, 1e-9));
    ok('mink: velocity addition 0.5 ⊕ 0.5 = 0.8', approx(Mk.addVelocity(0.5, 0.5), 0.8));
    ok('mink: rapidities add (β via tanh)', approx(Mk.betaOf(Mk.rapidity(0.5) + Mk.rapidity(0.5)), 0.8, 1e-9));
    var mphi = Mk.rapidity(0.6), Lam = Mk.boostMatrix(mphi);
    ok('mink: det Λ = 1', approx(Lam[0][0] * Lam[1][1] - Lam[0][1] * Lam[1][0], 1, 1e-9));
    /* Λ = exp(φK), K = [[0,−1],[−1,0]]: the boost IS a matrix exponential, like the Matrix lab */
    var meK = L.expm([[0, -mphi, 0], [-mphi, 0, 0], [0, 0, 0]]);
    ok('mink: Λ = exp(φK) (matches linalg expm)',
      approx(meK[0][0], Lam[0][0], 1e-5) && approx(meK[0][1], Lam[0][1], 1e-5) && approx(meK[1][0], Lam[1][0], 1e-5) && approx(meK[1][1], Lam[1][1], 1e-5));
    var mm = Mk.buildModel({ half: 6, beta: 0.5, showPrimed: true, showHyper: true, showLight: true, worldlines: [{ beta: 0.6 }], events: [{ x: 2, ct: 1 }] });
    ok('mink: buildModel emits axes / primed / hyperbolae / worldline',
      !!mm.lab.ct && !!(mm.primed && mm.primed.ct) && mm.hyper.length > 0 && mm.worldlines.length === 1);

    /* --- Quantum: 1-D Schrödinger eigensolver --- */
    var Q = VF.QM;
    var sho = Q.solve(function (x) { return 0.5 * x * x; }, -8, 8, 300);
    ok('QM: harmonic E₀ ≈ 0.5', approx(sho.E[0], 0.5, 0.02));
    ok('QM: harmonic E₁ ≈ 1.5', approx(sho.E[1], 1.5, 0.02));
    ok('QM: harmonic E₂ ≈ 2.5', approx(sho.E[2], 2.5, 0.03));
    ok('QM: equal spacing ΔE ≈ 1', approx(sho.E[2] - sho.E[1], 1, 0.02));
    ok('QM: node count grows with n', Q.nodes(sho.psi[0]) === 0 && Q.nodes(sho.psi[1]) === 1 && Q.nodes(sho.psi[2]) === 2);
    var well = Q.solve(function () { return 0; }, -5, 5, 300);
    ok('QM: infinite well E₁ ≈ π²/200', approx(well.E[0], Math.PI * Math.PI / 200, 4e-3));
    ok('QM: infinite well E₂/E₁ ≈ 4', approx(well.E[1] / well.E[0], 4, 0.12));
    var pkt = Q.packet(sho, -2, 0.7, 2), ev0 = Q.evolve(sho, pkt, 0);
    ok('QM: wave packet is normalised ‖ψ‖=1', approx(ev0.norm, 1, 1e-2));
    /* two-state beat: ⟨x⟩(t) = x₀₁·cos(ΔE·t) flips sign after half a beat period */
    var sup = Q.superpose(sho, [0, 1]), evA = Q.evolve(sho, sup, 0), evB = Q.evolve(sho, sup, Math.PI / (sho.E[1] - sho.E[0]));
    ok('QM: beat ⟨x⟩ flips sign at half period', evA.xmean > 0.3 && approx(evB.xmean, -evA.xmean, 0.02));
    var tp = Q.turningPoints(function (x) { return 0.5 * x * x; }, 2, -8, 8);
    ok('QM: turning points of ½x² at E=2 are ±2', tp.length === 2 && approx(tp[0], -2, 1e-2) && approx(tp[1], 2, 1e-2));

    /* --- Dynamics: RK4 + phase-plane analysis --- */
    var Dn = VF.Dyn;
    var trS = Dn.trajectory(function (x) { return -x; }, 1, 0, 0.01, 300, 0), lp = trS[trS.length - 1];
    ok('Dyn: RK4 conserves SHO energy', approx(0.5 * lp[1] * lp[1] + 0.5 * lp[0] * lp[0], 0.5, 1e-4));
    ok('Dyn: fixed-point classification', Dn.classify(-1, 0) === 'center' && Dn.classify(1, 0) === 'saddle' && Dn.classify(-1, -0.5) === 'stable spiral');
    var fps = Dn.fixedPoints(function (x) { return -Math.sin(x); }, -4, 4, 0), hasC = false, hasS = false, fi;
    for (fi = 0; fi < fps.length; fi++) { if (Math.abs(fps[fi].x) < 0.1 && fps[fi].type === 'center') hasC = true; if (Math.abs(Math.abs(fps[fi].x) - Math.PI) < 0.1 && fps[fi].type === 'saddle') hasS = true; }
    ok('Dyn: pendulum centre @0, saddles @±π', hasC && hasS && fps.length >= 3);

    /* --- Fourier: series coefficients + Parseval --- */
    var Fo = VF.Fourier;
    var sq = Fo.series(function (x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); }, Math.PI, 40, 80);
    ok('Fourier: square b₁ = 4/π', approx(sq.b[1], 4 / Math.PI, 2e-2));
    ok('Fourier: square is odd (aₙ ≈ 0, b₂ ≈ 0)', Math.abs(sq.a[1]) < 1e-2 && Math.abs(sq.a[2]) < 1e-2 && Math.abs(sq.b[2]) < 1e-2);
    ok('Fourier: square Parseval ≈ 1', approx(Fo.parseval(sq), 1, 0.03));
    var tri = Fo.series(function (x) { return Math.abs(x); }, Math.PI, 20, 80);
    ok('Fourier: triangle is even (bₙ ≈ 0)', Math.abs(tri.b[1]) < 1e-2 && Math.abs(tri.b[3]) < 1e-2);
    ok('Fourier: partial sum matches grid', Fo.partial(sq, 15).length === sq.x.length);

    /* --- Bodies: advection, rigid spin ½∇×F, deformation gradient, Newton --- */
    var Bd = VF.Bodies, si;
    var Lj = Bd.jacobian(function (x, y, z, t) { return [-y, x, z]; }, [0.7, -0.4, 1.1], 0);
    var cj = Bd.curlOf(Lj);
    ok('Bodies: ∇F gives curl (0,0,2) and div 1', approx(cj[0], 0, 1e-6) && approx(cj[1], 0, 1e-6) && approx(cj[2], 2, 1e-6) && approx(Bd.divOf(Lj), 1, 1e-6));
    /* rigid-rotation flow F=(−y,x,0): ω=(0,0,1), after t=π the body has orbited AND spun by π */
    var rot = function (x, y, z, t) { return [-y, x, 0]; };
    var bb = Bd.makeBody([2, 0, 0]), nst = 300, hh = Math.PI / nst;
    for (si = 0; si < nst; si++) Bd.stepFlow(rot, bb, si * hh, hh);
    ok('Bodies: rigid rotation advects (2,0,0) → (−2,0,0)', approx(bb.x[0], -2, 1e-4) && approx(bb.x[1], 0, 1e-4));
    ok('Bodies: rigid rotation spins R by π about z', approx(bb.R[0][0], -1, 1e-6) && approx(bb.R[1][1], -1, 1e-6) && approx(bb.R[2][2], 1, 1e-9));
    ok('Bodies: rotation preserves volume (det A = 1)', approx(Bd.mat3det(bb.A), 1, 1e-6));
    /* simple shear F=(y,0,0): A = I + tL exactly (L²=0), det A = 1, probe spins at ω = −½ */
    var bs = Bd.makeBody([0, 1, 0]);
    for (si = 0; si < 200; si++) Bd.stepFlow(function (x, y, z, t) { return [y, 0, 0]; }, bs, si * 0.01, 0.01);
    ok('Bodies: shear A₀₁ = t, det A = 1', approx(bs.A[0][1], 2, 1e-6) && approx(Bd.mat3det(bs.A), 1, 1e-6));
    ok('Bodies: shear probe rotates by −t/2', approx(bs.R[0][0], Math.cos(1), 1e-4) && approx(bs.R[0][1], Math.sin(1), 1e-4) && approx(bs.R[1][0], -Math.sin(1), 1e-4));
    /* source F=(x,y,z): volume det A = e^{3t}, isotropic proxy s = e^t */
    var bo = Bd.makeBody([1, 0, 0]);
    for (si = 0; si < 100; si++) Bd.stepFlow(function (x, y, z, t) { return [x, y, z]; }, bo, si * 0.01, 0.01);
    ok('Bodies: source det A = e³ᵗ and s = eᵗ', approx(Bd.mat3det(bo.A), Math.exp(3), 1e-4) && approx(bo.s, Math.E, 1e-6));
    /* force reading, SHO F=−x with m=1: x(π) = −x₀ and E = ½v²+½x² is conserved */
    var bf = Bd.makeBody([1.5, 0, 0]), hf = Math.PI / 400;
    for (si = 0; si < 400; si++) Bd.stepForce(function (x, y, z, t) { return [-x, -y, -z]; }, bf, si * hf, hf, 1);
    var Ef = 0.5 * (bf.vel[0] * bf.vel[0] + bf.vel[1] * bf.vel[1]) + 0.5 * (bf.x[0] * bf.x[0] + bf.x[1] * bf.x[1]);
    ok('Bodies: Newton SHO x(π) = −x₀, E conserved', approx(bf.x[0], -1.5, 1e-5) && approx(Ef, 0.5 * 1.5 * 1.5, 1e-6));

    /* --- Field designer: every advertised property must hold numerically --- */
    var Dg = VF.Design, Pp = VF.Parser, FMd = VF.FieldMath;
    function lcg(seed) { var s2 = seed >>> 0; return function () { s2 = (s2 * 1664525 + 1013904223) >>> 0; return s2 / 4294967296; }; }
    function dvf(d) { return FMd.vectorField(Pp.compile(d.fx).fn, Pp.compile(d.fy).fn, Pp.compile(d.fz).fn); }
    function dsf(d) { return FMd.scalarField(Pp.compile(d.f).fn); }
    var DP = [[0.7, -0.3, 0.4], [1.3, 0.8, -0.6], [-0.9, 1.1, 0.5]];
    function maxDiv(vf, target) {
      var m = 0, i;
      for (i = 0; i < DP.length; i++) m = Math.max(m, Math.abs(FMd.div(vf).at(DP[i][0], DP[i][1], DP[i][2], 0) - (target || 0)));
      return m;
    }
    function maxCurl(vf, target) {
      var m = 0, i, k, tg = target || [0, 0, 0];
      for (i = 0; i < DP.length; i++) {
        var c = FMd.curl(vf).at(DP[i][0], DP[i][1], DP[i][2], 0);
        for (k = 0; k < 3; k++) m = Math.max(m, Math.abs(c[k] - tg[k]));
      }
      return m;
    }
    var dOK = { cons: true, sol: true, lap: true, src: true, vor: true, edd: true, har: true, eig: true, bmp: true }, ds;
    for (ds = 1; ds <= 3; ds++) {
      var d1 = Dg.make('conservative', lcg(ds));
      if (maxCurl(dvf(d1)) > 1e-3) dOK.cons = false;
      var d2 = Dg.make('solenoidal', lcg(ds + 10));
      if (maxDiv(dvf(d2)) > 1e-3) dOK.sol = false;
      var d3 = Dg.make('laplace', lcg(ds + 20)), v3 = dvf(d3);
      if (maxCurl(v3) > 1e-3 || maxDiv(v3) > 1e-3) dOK.lap = false;
      var d4 = Dg.make('source', lcg(ds + 30)), v4 = dvf(d4);
      if (maxDiv(v4, d4.s) > 1e-3 || maxCurl(v4) > 1e-3) dOK.src = false;
      var d5 = Dg.make('vorticity', lcg(ds + 40)), v5 = dvf(d5);
      if (maxCurl(v5, d5.omega) > 1e-3 || maxDiv(v5) > 1e-3) dOK.vor = false;
      var d6 = Dg.make('eddy', lcg(ds + 50));
      if (maxDiv(dvf(d6)) > 1e-3 || d6.fz !== '0') dOK.edd = false;
      var d7 = Dg.make('harmonic', lcg(ds + 60)), s7 = dsf(d7), pi7;
      for (pi7 = 0; pi7 < DP.length; pi7++) if (Math.abs(FMd.laplacian(s7).at(DP[pi7][0], DP[pi7][1], DP[pi7][2], 0)) > 2e-3) dOK.har = false;
      var d8 = Dg.make('eigen', lcg(ds + 70)), s8 = dsf(d8), pi8;
      for (pi8 = 0; pi8 < DP.length; pi8++) {
        var fv8 = s8.at(DP[pi8][0], DP[pi8][1], DP[pi8][2], 0);
        if (Math.abs(FMd.laplacian(s8).at(DP[pi8][0], DP[pi8][1], DP[pi8][2], 0) + d8.k2 * fv8) > 2e-3) dOK.eig = false;
      }
      var d9 = Dg.make('bump', lcg(ds + 80)), s9 = dsf(d9);
      if (!isFinite(s9.at(0.5, -0.5, 0.5, 0)) || Math.abs(s9.at(9, 9, 9, 0)) > 1e-4) dOK.bmp = false;
    }
    ok('Design: conservative has ∇×F ≡ 0', dOK.cons);
    ok('Design: solenoidal has ∇·F ≡ 0', dOK.sol);
    ok('Design: Laplace field has both ≡ 0', dOK.lap);
    ok('Design: uniform source has ∇·F = s, ∇×F = 0', dOK.src);
    ok('Design: uniform vorticity has ∇×F = Ω, ∇·F = 0', dOK.vor);
    ok('Design: eddy is div-free and planar', dOK.edd);
    ok('Design: harmonic f has ∇²f ≡ 0', dOK.har);
    ok('Design: eigenfunction has ∇²f = −k²f', dOK.eig);
    ok('Design: bump is finite and localized', dOK.bmp);

    /* --- Waves: eigenfunction expansion is exact ------------------------- */
    var Wv = VF.Waves, Lw = 10, wi;
    var aw = Wv.project(function (x) { return Math.sin(Math.PI * x / Lw) + 0.5 * Math.sin(3 * Math.PI * x / Lw); }, Lw, 12);
    ok('Waves: projection recovers exact coefficients', approx(aw[0], 1, 1e-6) && approx(aw[2], 0.5, 1e-6) && Math.abs(aw[1]) < 1e-9 && Math.abs(aw[5]) < 1e-9);
    var w1 = Math.PI / Lw, tW = 4.7, xI = 33;                         /* x = 3.3 on a res-100 grid */
    var rW = Wv.wave(aw, [0,0,0,0,0,0,0,0,0,0,0,0], 1, Lw, tW, 100);
    var uEx = Math.cos(w1 * tW) * Math.sin(Math.PI * 3.3 / Lw) + 0.5 * Math.cos(3 * w1 * tW) * Math.sin(3 * Math.PI * 3.3 / Lw);
    ok('Waves: wave equation evolves modes exactly', approx(rW.u[xI], uEx, 1e-9));
    var bh = Wv.project(function (x) { return 3 * Math.sin(2 * Math.PI * x / Lw); }, Lw, 12);
    var zz = []; for (wi = 0; wi < 12; wi++) zz.push(0);
    var rH2 = Wv.wave(zz, bh, 1, Lw, 2.2, 100);
    var w2 = 2 * Math.PI / Lw;
    ok('Waves: velocity IC (hammer) gives (b/ω)sin(ωt)', approx(rH2.u[xI], 3 / w2 * Math.sin(w2 * 2.2) * Math.sin(2 * Math.PI * 3.3 / Lw), 1e-9));
    var aG = Wv.project(function (x) { return Math.exp(-2 * (x - 3) * (x - 3)); }, Lw, 40);
    var e0 = Wv.wave(aG, null, 1, Lw, 0, 60).E, e1 = Wv.wave(aG, null, 1, Lw, 7.31, 60).E;
    ok('Waves: wave energy is conserved', approx(e1, e0, 1e-9 * Math.max(1, e0)));
    var hA = Wv.heat(aw, 0.5, Lw, 3, 100);
    ok('Waves: heat mode decays as e^(−Dk²t)', approx(hA.amps[0], Math.exp(-0.5 * w1 * w1 * 3), 1e-12) && approx(hA.amps[2], 0.5 * Math.exp(-0.5 * 9 * w1 * w1 * 3), 1e-12));
    var sc0 = Wv.schr(aG, Lw, 0, 400), sc5 = Wv.schr(aG, Lw, 5, 400), nInt = 0;
    for (wi = 0; wi < sc5.dens.length; wi++) nInt += (wi === 0 || wi === sc5.dens.length - 1 ? 0.5 : 1) * sc5.dens[wi] * (Lw / 400);
    ok('Waves: Schrödinger norm conserved (∫|ψ|² = const)', approx(sc5.norm, sc0.norm, 1e-12) && approx(nInt, sc5.norm, 2e-3));

    /* --- Modes: kleine Schwingungen (K − ω²M)φ = 0 ------------------------ */
    var Md = VF.Modes, mj;
    var pend = Md.solveChain([1, 1], [0, 0.5, 0], 1);                 /* two coupled pendula */
    ok('Modes: two pendula ω = [1, √2]', approx(pend.omega[0], 1, 1e-9) && approx(pend.omega[1], Math.sqrt(2), 1e-9));
    var uch = Md.solveChain([1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1], 0), uOK = true;
    for (mj = 0; mj < 5; mj++) if (!approx(uch.omega[mj], 2 * Math.sin((mj + 1) * Math.PI / 12), 1e-9)) uOK = false;
    ok('Modes: uniform chain ωₙ = 2sin(nπ/(2N+2))', uOK);
    var ff = Md.solveChain([1, 1, 1, 1], [0, 1, 1, 1, 0], 0);
    ok('Modes: free-free zero mode (ω₁ = 0, φ₁ const)', ff.omega[0] < 1e-6 && approx(ff.phi[0][0], ff.phi[0][3], 1e-8) && approx(Math.abs(ff.phi[0][0]), 0.5, 1e-8));
    var dia = Md.solveChain([1, 3, 1, 3, 1, 3], [1, 1, 1, 1, 1, 1, 1], 0), orthOK = true;
    for (mj = 0; mj < 6; mj++) for (var mk3 = 0; mk3 < 6; mk3++) {
      var dot = 0;
      for (var mi3 = 0; mi3 < 6; mi3++) dot += dia.m[mi3] * dia.phi[mj][mi3] * dia.phi[mk3][mi3];
      if (!approx(dot, mj === mk3 ? 1 : 0, 1e-9)) orthOK = false;
    }
    ok('Modes: eigenmodes are M-orthonormal (φᵀMφ = I)', orthOK);
    var ch6 = Md.solveChain([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1], 0);
    var cf6 = Md.coeffs(ch6, [1, 0, 0, 0, 0, 0], null), ev6 = Md.evolve(ch6, cf6, 2.37);
    ok('Modes: modal energy = direct ½vᵀMv + ½uᵀKu', approx(ev6.E, Md.energyDirect([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1], 0, ev6.u, ev6.v), 1e-9));
    var cfP = Md.coeffs(pend, [1, 0], null);
    var tBeat = Math.PI / (pend.omega[1] - pend.omega[0]);
    var evB = Md.evolve(pend, cfP, tBeat);
    ok('Modes: beats, plucked pendulum is at rest after T/2', Math.abs(evB.u[0]) < 1e-9 && Math.abs(Math.abs(evB.u[1]) - Math.abs(Math.cos(pend.omega[0] * tBeat))) < 1e-9);
    /* the dispersion overlay drawn by the Modes lab: ω(q)² = g/ℓ + 4(k/m)sin²(q/2)
       with q = jπ/(N+1) for fixed walls and q = jπ/N (from j = 0) for free ends:
       the pendulum term gaps the branch, and the boundary condition sets the q's */
    function dispOK(mArr, springs, gl, k, m, free) {
      var s = Md.solveChain(mArr, springs, gl), N = mArr.length, jj;
      for (jj = 0; jj < N; jj++) {
        var q = free ? jj * Math.PI / N : (jj + 1) * Math.PI / (N + 1), sq = Math.sin(q / 2);
        if (!approx(s.omega[jj], Math.sqrt(gl + 4 * (k / m) * sq * sq), 1e-9)) return false;
      }
      return true;
    }
    ok('Modes: dispersion ω(q) with g/ℓ, fixed walls, q = nπ/(N+1)',
      dispOK([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1], 0.8, 1, 1, false));
    ok('Modes: dispersion ω(q), free ends start at q = 0 (the zero mode)',
      dispOK([2, 2, 2, 2, 2], [0, 1.5, 1.5, 1.5, 1.5, 0], 0.3, 1.5, 2, true));

    /* --- Scatter: deflection integral & cross-section vs closed forms ------ */
    var Sc = VF.Scatter, Ee = 0.5;
    var Vcoul = function (r) { return 1 / r; };                       /* Rutherford k = 1 */
    var ruthOK = true, sb;
    var rbs = [0.3, 1, 2.5];
    for (sb = 0; sb < rbs.length; sb++) {
      var dR = Sc.deflection(Vcoul, Ee, rbs[sb]);
      if (!approx(dR.theta, 2 * Math.atan(1 / (2 * Ee * rbs[sb])), 2e-3)) ruthOK = false;
    }
    ok('Scatter: Rutherford Θ(b) = 2·atan(k/2Eb)', ruthOK);
    var Vhs = function (r) { return r < 1 ? 50 : 0; };                /* hard sphere R = 1 */
    var dH1 = Sc.deflection(Vhs, Ee, 0.5), dH2 = Sc.deflection(Vhs, Ee, 0.9);
    ok('Scatter: hard sphere θ = π − 2·asin(b/R)', approx(dH1.theta, Math.PI - 2 * Math.asin(0.5), 3e-3) && approx(dH2.theta, Math.PI - 2 * Math.asin(0.9), 3e-3));
    var dAtt = Sc.deflection(function (r) { return -1 / r; }, Ee, 1);
    ok('Scatter: attractive −1/r flips the sign of Θ', approx(dAtt.theta, -Math.PI / 2, 2e-3));
    var trj = Sc.trajectory(Vcoul, Ee, 1, { R0: 120 });
    var vE = trj.vEnd, pE = trj.pts[trj.pts.length - 1];
    var Etrj = 0.5 * (vE[0] * vE[0] + vE[1] * vE[1]) + Vcoul(Math.sqrt(pE[0] * pE[0] + pE[1] * pE[1]));
    /* the launch point sits at finite r, so the conserved energy is ½v∞² + V(r_start) */
    var Estart = Ee + Vcoul(Math.sqrt(120 * 120 + 1));
    ok('Scatter: RK4 trajectory agrees with the integral', approx(trj.theta, Math.PI / 2, 0.035) && !trj.captured);
    ok('Scatter: trajectory conserves energy', approx(Etrj, Estart, 1e-6));
    var tbR = Sc.thetaOfB(Vcoul, Ee, 4, 130), csR = Sc.crossSection(tbR), bestD = Infinity, dsAt = 0, thAt = 0, ci;
    for (ci = 0; ci < csR.theta.length; ci++) if (Math.abs(csR.theta[ci] - Math.PI / 2) < bestD) { bestD = Math.abs(csR.theta[ci] - Math.PI / 2); dsAt = csR.ds[ci]; thAt = csR.theta[ci]; }
    var dsAnalytic = 0.25 / Math.pow(Math.sin(thAt / 2), 4);          /* (k/4E)²/sin⁴(θ/2) at the SAME θ */
    ok('Scatter: Rutherford dσ/dΩ = (k/4E)²/sin⁴(θ/2)', approx(dsAt, dsAnalytic, 0.01 * dsAnalytic));
    var tbH = Sc.thetaOfB(Vhs, Ee, 0.98, 130), csH = Sc.crossSection(tbH), hOK = true, nH = 0;
    for (ci = 0; ci < csH.theta.length; ci++) if (csH.theta[ci] > 0.6 && csH.theta[ci] < 2.6) { nH++; if (!approx(csH.ds[ci], 0.25, 0.02)) hOK = false; }
    ok('Scatter: hard sphere is isotropic, dσ/dΩ = R²/4', hOK && nH > 20);
    ok('Scatter: fold maps Θ to a detector angle', approx(Sc.fold(-Math.PI / 2), Math.PI / 2, 1e-12) && approx(Sc.fold(2 * Math.PI + 0.3), 0.3, 1e-12) && approx(Sc.fold(-3 * Math.PI + 0.1), Math.PI - 0.1, 1e-12));
    /* per-ray dσ/dΩ from the local derivative of the exact integral */
    var sg = Sc.dSigma(Vcoul, Ee, 1.2);
    var thA = 2 * Math.atan(1 / (2 * Ee * 1.2));
    var dsA2 = Math.pow(1 / (4 * Ee), 2) / Math.pow(Math.sin(thA / 2), 4);
    ok('Scatter: per-ray dσ/dΩ matches Rutherford analytic', sg.ok && approx(sg.theta, thA, 1e-4) && approx(sg.ds, dsA2, 1e-3 * dsA2));
    var sgH = Sc.dSigma(Vhs, Ee, 0.5);
    ok('Scatter: per-ray dσ/dΩ for the hard sphere is R²/4', sgH.ok && approx(sgH.ds, 0.25, 1e-3));

    /* --- Charges: superposition + Gauss's law ----------------------------- */
    var Ch = VF.Charges, dip = [{ x: -1.5, y: 0, z: 0, q: 1 }, { x: 1.5, y: 0, z: 0, q: -1 }];
    var Edip = Ch.Efield(dip)(0, 0, 0);
    ok('Charges: dipole field at the centre = 2q/d² x̂', approx(Edip[0], 2 / 2.25, 1e-9) && approx(Edip[1], 0) && approx(Edip[2], 0));
    ok('Charges: dipole potential at the centre = 0', approx(Ch.potential(dip)(0, 0, 0), 0, 1e-12));
    var mono = [{ x: 0, y: 0, z: 0, q: 2 }];
    ok('Charges: Gauss, flux of q=2 sphere = 8π', approx(Ch.fluxSphere(mono, 0, 0, 0, 1), 8 * Math.PI, 0.02 * 8 * Math.PI));
    ok('Charges: Gauss, empty sphere has ≈ 0 flux', Math.abs(Ch.fluxSphere(mono, 3, 0, 0, 1)) < 0.05 && Ch.enclosed(mono, 3, 0, 0, 1) === 0);

    /* --- Spin: exact Larmor precession + measurement ----------------------- */
    var Sp = VF.Spin, rSp = Sp.precess([1, 0, 0], [0, 0, 2], Math.PI / 4);
    ok('Spin: quarter-turn about z sends x̂ → ŷ (|r| = 1)', approx(rSp[0], 0, 1e-9) && approx(rSp[1], 1, 1e-9) && approx(rSp[2], 0, 1e-9));
    var mSp = Sp.measure([0, 0, 1], [0, 0, 1], 0.3);
    ok('Spin: measuring σz on |0⟩ gives +1 with certainty', mSp.outcome === 1 && approx(mSp.p, 1) && Sp.prob([0, 0, 1], [1, 0, 0]).up === 0.5);

    /* --- Atom: normalised, orthogonal, right nodes ------------------------- */
    function radInt(f1, f2) {
      var s = 0, dr = 0.01, r2;
      for (r2 = dr / 2; r2 < 80; r2 += dr) s += f1(r2) * f2(r2) * r2 * r2 * dr;
      return s;
    }
    var R10 = VF.Atom.radial(1, 0), R20 = VF.Atom.radial(2, 0), R21 = VF.Atom.radial(2, 1), R32 = VF.Atom.radial(3, 2);
    var R30 = VF.Atom.radial(3, 0), R31 = VF.Atom.radial(3, 1);
    ok('Atom: ∫R²r²dr = 1 for 1s, 2p, 3d', approx(radInt(R10, R10), 1, 1e-3) && approx(radInt(R21, R21), 1, 1e-3) && approx(radInt(R32, R32), 1, 1e-3));
    ok('Atom: ∫R²r²dr = 1 for 3s, 3p, and 2p ⊥ 3p', approx(radInt(R30, R30), 1, 1e-3) && approx(radInt(R31, R31), 1, 1e-3) && Math.abs(radInt(R21, R31)) < 1e-4);
    ok('Atom: 1s ⊥ 2s (radial orthogonality)', Math.abs(radInt(R10, R20)) < 1e-6);
    var psi2pz = VF.Atom.psi(VF.Atom.find('2p_z'));
    ok('Atom: 2p_z lobes ± with the z = 0 nodal plane', psi2pz(0, 0, 1) > 0 && psi2pz(0, 0, -1) < 0 && approx(psi2pz(1, 0, 0), 0, 1e-12));

    /* --- Rigid: conserved invariants + symmetric-top precession ------------ */
    var Rg = VF.Rigid, Ird = [1, 2, 4], wrd = [0.02, 3, 0.02], Rrd = VF.Bodies.ident3(), rgi;
    var E2T0 = Rg.energy2T(Ird, wrd), Lsp0 = Rg.Lspace(Ird, wrd, Rrd);
    for (rgi = 0; rgi < 4000; rgi++) { var strg = Rg.step(Ird, wrd, Rrd, 0.005); wrd = strg.w; Rrd = strg.R; }
    var Lsp1 = Rg.Lspace(Ird, wrd, Rrd);
    var Ldrift = Math.sqrt((Lsp1[0] - Lsp0[0]) * (Lsp1[0] - Lsp0[0]) + (Lsp1[1] - Lsp0[1]) * (Lsp1[1] - Lsp0[1]) + (Lsp1[2] - Lsp0[2]) * (Lsp1[2] - Lsp0[2]));
    ok('Rigid: Dzhanibekov run conserves 2T and L (space)', approx(Rg.energy2T(Ird, wrd), E2T0, 1e-6 * E2T0) && Ldrift < 5e-3 * Math.sqrt(Lsp0[0] * Lsp0[0] + Lsp0[1] * Lsp0[1] + Lsp0[2] * Lsp0[2]));
    var Isy = [1, 1, 3], wsy = [1, 0, 2], Rsy = VF.Bodies.ident3(), nst2 = 400;
    for (rgi = 0; rgi < nst2; rgi++) { var sts = Rg.step(Isy, wsy, Rsy, Math.PI / 8 / nst2); wsy = sts.w; Rsy = sts.R; }
    ok('Rigid: symmetric top, body ω precesses at Ω = (I₃/I₁−1)ω₃', approx(wsy[0], 0, 1e-4) && approx(wsy[1], 1, 1e-4) && approx(wsy[2], 2, 1e-9));

    /* --- RigidShapes: inertia tensors, principal axes, the classics -------- */
    var RS = VF.RigidShapes;
    /* Jacobi eigensolver on a known conjugated diagonal: S = R D Rᵀ */
    var Rj = VF.Bodies.rodrigues([0.3, 0.5, 0.2], 1), Dj = [1, 2, 3], Sj = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], ji, jj, jk;
    for (ji = 0; ji < 3; ji++) for (jj = 0; jj < 3; jj++) for (jk = 0; jk < 3; jk++) Sj[ji][jj] += Rj[ji][jk] * Dj[jk] * Rj[jj][jk];
    var ej = RS.eigSym3(Sj), eigOK = approx(ej.vals[0], 1, 1e-9) && approx(ej.vals[1], 2, 1e-9) && approx(ej.vals[2], 3, 1e-9);
    for (jk = 0; jk < 3; jk++) {                     /* S q_k = λ_k q_k, columns orthonormal, det +1 */
      var qv = [ej.Q[0][jk], ej.Q[1][jk], ej.Q[2][jk]];
      for (ji = 0; ji < 3; ji++) {
        var sv = Sj[ji][0] * qv[0] + Sj[ji][1] * qv[1] + Sj[ji][2] * qv[2];
        if (!approx(sv, ej.vals[jk] * qv[ji], 1e-8)) eigOK = false;
      }
    }
    ok('RigidShapes: Jacobi recovers eigenvalues & eigenvectors of R·diag·Rᵀ', eigOK && approx(RS.det3(ej.Q), 1, 1e-9));
    /* single centred box = the analytic formulas, exactly */
    var cbx = RS.compound([{ type: 'box', m: 1, dims: [2.4, 1.6, 1.0], pos: [0, 0, 0] }]);
    ok('RigidShapes: box inertia matches m(b²+c²)/12 …', approx(cbx.I[0], (1.6 * 1.6 + 1) / 12, 1e-12) && approx(cbx.I[1], (2.4 * 2.4 + 1) / 12, 1e-12) && approx(cbx.I[2], (2.4 * 2.4 + 1.6 * 1.6) / 12, 1e-12));
    /* translating a single body must not change its principal moments (COM + Steiner cancel) */
    var cbx2 = RS.compound([{ type: 'box', m: 1, dims: [2.4, 1.6, 1.0], pos: [0.7, -0.4, 1.1] }]);
    ok('RigidShapes: principal moments are translation-invariant', approx(cbx2.I[0], cbx.I[0], 1e-12) && approx(cbx2.I[2], cbx.I[2], 1e-12));
    /* dumbbell: two spheres at ±d, parallel-axis theorem exactly */
    var cdb = RS.compound([{ type: 'sphere', m: 1, dims: [0.5], pos: [-1.2, 0, 0] }, { type: 'sphere', m: 1, dims: [0.5], pos: [1.2, 0, 0] }]);
    ok('RigidShapes: dumbbell, I∥ = 2·(2mr²/5), I⊥ adds 2md²', approx(cdb.I[0], 0.2, 1e-12) && approx(cdb.I[1], 0.2 + 2 * 1.44, 1e-12) && approx(cdb.I[2], 0.2 + 2 * 1.44, 1e-12));
    /* torus formula against a brute-force volume integral */
    var tR = 1.2, tr = 0.3, tn = 0, tIz = 0, tIx = 0, tx, ty, tz, tg = 46;
    for (ji = 0; ji < tg; ji++) for (jj = 0; jj < tg; jj++) for (jk = 0; jk < 14; jk++) {
      tx = -1.55 + 3.1 * (ji + 0.5) / tg; ty = -1.55 + 3.1 * (jj + 0.5) / tg; tz = -0.32 + 0.64 * (jk + 0.5) / 14;
      var trad = Math.sqrt(tx * tx + ty * ty) - tR;
      if (trad * trad + tz * tz <= tr * tr) { tn++; tIz += tx * tx + ty * ty; tIx += ty * ty + tz * tz; }
    }
    ok('RigidShapes: torus I∥ = m(R²+¾r²) checks against the volume integral',
      approx(tIz / tn, tR * tR + 0.75 * tr * tr, 0.02 * (tR * tR)) && approx(tIx / tn, 0.5 * tR * tR + 0.625 * tr * tr, 0.02 * (tR * tR)));
    /* the classics: T-handle flips about its STEM (y), racket about the in-plane ⊥ axis (x) */
    var cth = RS.compound(RS.find('thandle').parts), q2 = [cth.Q[0][1], cth.Q[1][1], cth.Q[2][1]];
    ok('RigidShapes: T-handle, the stem axis (y) is the unstable middle one', Math.abs(q2[1]) > 0.99 && cth.I[0] < cth.I[1] && cth.I[1] < cth.I[2]);
    var crk = RS.compound(RS.find('racket').parts), q2r = [crk.Q[0][1], crk.Q[1][1], crk.Q[2][1]];
    ok('RigidShapes: racket, middle axis in-plane ⊥ handle; I₃ ≈ I₁+I₂ (near-planar)',
      Math.abs(q2r[0]) > 0.99 && approx(crk.I[2], crk.I[0] + crk.I[1], 0.04 * crk.I[2]));
    /* full pipeline: dynamics in the principal frame with R(0) = Q conserves E and L */
    var wth = [0.06, 3, 0.06], Rth = [cth.Q[0].slice(), cth.Q[1].slice(), cth.Q[2].slice()];
    var Eth0 = Rg.energy2T(cth.I, wth), Lth0 = Rg.Lspace(cth.I, wth, Rth);
    for (rgi = 0; rgi < 3000; rgi++) { var stt = Rg.step(cth.I, wth, Rth, 0.004); wth = stt.w; Rth = stt.R; }
    var Lth1 = Rg.Lspace(cth.I, wth, Rth), Lthm = Math.sqrt(Lth0[0] * Lth0[0] + Lth0[1] * Lth0[1] + Lth0[2] * Lth0[2]);
    var LthD = Math.sqrt((Lth1[0] - Lth0[0]) * (Lth1[0] - Lth0[0]) + (Lth1[1] - Lth0[1]) * (Lth1[1] - Lth0[1]) + (Lth1[2] - Lth0[2]) * (Lth1[2] - Lth0[2]));
    ok('RigidShapes: T-handle tumble in the principal frame conserves 2T and L', approx(Rg.energy2T(cth.I, wth), Eth0, 1e-5 * Eth0) && LthD < 5e-3 * Lthm);
    /* --- placement: rotation about a point other than the COM (Steiner) ---- */
    /* compoundAbout(parts, COM) must reproduce compound() exactly */
    var cRefC = RS.compoundAbout(RS.find('thandle').parts, cth.com);
    ok('RigidShapes: compoundAbout about the COM reproduces compound()',
      approx(cRefC.I[0], cth.I[0], 1e-12) && approx(cRefC.I[1], cth.I[1], 1e-12) && approx(cRefC.I[2], cth.I[2], 1e-12));
    /* a rod of length L pivoted at its END: I⊥ = mL²/3 (mL²/12 + m(L/2)²) */
    var rodP = [{ type: 'cylinder', axis: 'y', m: 1, dims: [1e-3, 3], pos: [0, 1.5, 0] }];
    var cRod = RS.compoundAbout(rodP, [0, 0, 0]);
    ok('RigidShapes: rod pivoted at its end, I⊥ = mL²/3', approx(cRod.I[2], 9 / 3, 1e-6) && approx(cRod.I[1], 9 / 3, 1e-6) && cRod.I[0] < 1e-5);
    /* a ring pinned on its rim: about the pin, I_x = I⊥, I_y = I⊥+MR², I_z = I∥+MR² */
    var ringR = 1.4, ringr = 0.16;
    var cPin = RS.compoundAbout([{ type: 'ring', axis: 'z', m: 1, dims: [ringR, ringr], pos: [0, 0, 0] }], [ringR, 0, 0]);
    var perp = 0.5 * ringR * ringR + 0.625 * ringr * ringr, para = ringR * ringR + 0.75 * ringr * ringr;
    ok('RigidShapes: ring pinned on its rim, Steiner adds MR² to two axes',
      approx(cPin.I[0], perp, 1e-12) && approx(cPin.I[1], perp + ringR * ringR, 1e-12) && approx(cPin.I[2], para + ringR * ringR, 1e-12));
    /* the shifted tensor is still a physical one: I_i + I_j ≥ I_k about ANY point */
    ok('RigidShapes: pivoted moments still satisfy the triangle inequality',
      cPin.I[0] + cPin.I[1] >= cPin.I[2] - 1e-12 && cRod.I[0] + cRod.I[1] >= cRod.I[2] - 1e-12);
    /* pivoted dynamics: with no gravity the pivot force acts AT the pivot, so
       L about it is conserved; the very same Euler integration must hold up */
    var wPv = [0.05, 0.05, 2.5], Rpv = [cPin.Q[0].slice(), cPin.Q[1].slice(), cPin.Q[2].slice()];
    var Epv0 = Rg.energy2T(cPin.I, wPv), Lpv0 = Rg.Lspace(cPin.I, wPv, Rpv);
    for (rgi = 0; rgi < 2000; rgi++) { var stp = Rg.step(cPin.I, wPv, Rpv, 0.004); wPv = stp.w; Rpv = stp.R; }
    var Lpv1 = Rg.Lspace(cPin.I, wPv, Rpv);
    var Lpvm = Math.sqrt(Lpv0[0] * Lpv0[0] + Lpv0[1] * Lpv0[1] + Lpv0[2] * Lpv0[2]);
    var LpvD = Math.sqrt((Lpv1[0] - Lpv0[0]) * (Lpv1[0] - Lpv0[0]) + (Lpv1[1] - Lpv0[1]) * (Lpv1[1] - Lpv0[1]) + (Lpv1[2] - Lpv0[2]) * (Lpv1[2] - Lpv0[2]));
    ok('RigidShapes: pinned ring conserves 2T and L about the pivot', approx(Rg.energy2T(cPin.I, wPv), Epv0, 1e-5 * Epv0) && LpvD < 5e-3 * Lpvm);
    /* Steiner shift is exactly the difference of the two tensors */
    var cFree = RS.compound([{ type: 'ring', axis: 'z', m: 1, dims: [ringR, ringr], pos: [0, 0, 0] }]);
    var shifted = RS.steiner(cFree.tensor, cFree.M, [-ringR, 0, 0]), shOK = true;
    for (ji = 0; ji < 3; ji++) for (jj = 0; jj < 3; jj++) if (!approx(shifted[ji][jj], cPin.tensor[ji][jj], 1e-12)) shOK = false;
    ok('RigidShapes: steiner() = I_com + M(|d|²·1 − d dᵀ) matches the assembled pivot tensor', shOK);

    /* --- Kepler: circle, invariants, LRL, precession ----------------------- */
    var Kp = VF.Kepler, sk = { x: 2, y: 0, vx: 0, vy: Math.sqrt(0.5) }, kpi;
    for (kpi = 0; kpi < 2000; kpi++) sk = Kp.step(1, 2, sk, 0.005);
    ok('Kepler: circular orbit stays circular', approx(Math.sqrt(sk.x * sk.x + sk.y * sk.y), 2, 1e-4));
    var se = { x: 2, y: 0, vx: 0, vy: 0.5 }, inv0 = Kp.invariants(1, 2, se);
    for (kpi = 0; kpi < 2000; kpi++) se = Kp.step(1, 2, se, 0.005);
    var inv1 = Kp.invariants(1, 2, se);
    ok('Kepler: E, L, LRL all conserved for p = 2', approx(inv1.E, inv0.E, 1e-8) && approx(inv1.L, inv0.L, 1e-10) &&
      approx(inv1.Ax, inv0.Ax, 1e-5) && approx(inv1.Ay, inv0.Ay, 1e-5));
    ok('Kepler: a = −k/2E and T = 2π√(a³/k)', approx(inv0.a, -1 / (2 * inv0.E), 1e-12) && approx(inv0.T, 2 * Math.PI * Math.sqrt(Math.pow(inv0.a, 3)), 1e-9));
    var sp6 = { x: 2, y: 0, vx: 0, vy: 0.5 }, A0p = Math.atan2(Kp.invariants(1, 2.3, sp6).Ay, Kp.invariants(1, 2.3, sp6).Ax);
    for (kpi = 0; kpi < 3000; kpi++) sp6 = Kp.step(1, 2.3, sp6, 0.005);
    var A1p = Math.atan2(Kp.invariants(1, 2.3, sp6).Ay, Kp.invariants(1, 2.3, sp6).Ax);
    ok('Kepler: p ≠ 2 → the perihelion precesses (LRL rotates)', Math.abs(A1p - A0p) > 0.02);

    /* --- Double pendulum: energy + small-angle normal mode ----------------- */
    var Dp = VF.Dpend, PP = { m1: 1, m2: 1, l1: 1, l2: 1, g: 1 };
    var sd = [2.1, 0, 2.5, 0], E0d = Dp.energy(PP, sd), dpi;
    for (dpi = 0; dpi < 5000; dpi++) sd = Dp.step(PP, sd, 0.004);
    ok('Dpend: chaotic run conserves energy', approx(Dp.energy(PP, sd), E0d, 1e-5 * (1 + Math.abs(E0d))));
    var sm = [0.01, 0, 0.01 * Math.SQRT2, 0], tPrev = null, per = null, tSim = 0, sPrev = sm[0];
    for (dpi = 0; dpi < 12000 && per == null; dpi++) {
      sm = Dp.step(PP, sm, 0.002); tSim += 0.002;
      if (sPrev < 0 && sm[0] >= 0 && sm[1] > 0) { if (tPrev == null) tPrev = tSim; else per = tSim - tPrev; }
      sPrev = sm[0];
    }
    ok('Dpend: in-phase small-angle mode has ω² = (2−√2)g/l', per != null && approx(per, 2 * Math.PI / Math.sqrt(2 - Math.SQRT2), 0.01 * 8.2));

    /* --- Sequences: ε–N, series, sup ---------------------------------------- */
    var Sq = VF.Seq, vseq = Sq.values(function (n2) { return 1 / n2; }, 500);
    ok('Seq: N(ε = 0.1) for 1/n is exactly 11', Sq.epsN(vseq, 0, 0.1) === 11);
    var geo = Sq.partialSums(Sq.values(function (n2) { return Math.pow(0.5, n2); }, 30));
    ok('Seq: Σ(1/2)ⁿ partial sums → 1', approx(geo[29], 1, 1e-8));
    var supx = Sq.supDist(function (n2, x2) { return Math.pow(x2, n2); }, function () { return 0; }, 40, 0, 1);
    ok('Seq: sup|xⁿ − 0| on [0,1] stays 1, pointwise, not uniform', approx(supx.sup, 1, 1e-9));

    /* --- Complex: arithmetic + Cauchy–Riemann ------------------------------- */
    var Cx = VF.Cplx, zsq = Cx.mul(Cx.C(1, 1), Cx.C(1, 1));
    ok('Cplx: (1+i)² = 2i', approx(zsq.re, 0, 1e-12) && approx(zsq.im, 2, 1e-12));
    var jk = Cx.add(Cx.C(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)), Cx.div(Cx.C(1, 0), Cx.C(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3))));
    ok('Cplx: Joukowski maps the unit circle to [−2, 2]', approx(jk.re, 1, 1e-9) && approx(jk.im, 0, 1e-9));
    var crH = Cx.crCheck(function (x2, y2) { return x2 * x2 - y2 * y2; }, function (x2, y2) { return 2 * x2 * y2; }, 0.7, 0.4);
    var crA = Cx.crCheck(function (x2, y2) { return x2; }, function (x2, y2) { return -y2; }, 0.7, 0.4);
    ok('Cplx: CR holds for z², fails for the conjugate map', crH.conformal === true && crA.conformal === false);

    var passed = 0;
    for (var r = 0; r < results.length; r++) if (results[r].pass) passed++;
    return { passed: passed, total: results.length, results: results };
  }

  VF.runTests = runTests;

})(window.VF = window.VF || {});
