/* =============================================================================
 * design.js: deterministic field designer (VF.Design)
 * -----------------------------------------------------------------------------
 * Generates random fields whose advertised property holds EXACTLY: not by
 * checking, but by construction from a potential, so the property is a
 * mathematical identity:
 *
 *   conservative   F = ∇φ            because  ∇×(∇φ)   ≡ 0
 *   solenoidal     F = ∇×A           because  ∇·(∇×A)  ≡ 0
 *   Laplace field  F = ∇φ, ∇²φ = 0   →  curl-free AND divergence-free
 *   uniform source F = (s/3)·r + ∇φₕ →  ∇·F = s,  ∇×F ≡ 0
 *   uniform vort.  F = ½Ω×r + ∇φₕ    →  ∇×F = Ω,  ∇·F ≡ 0
 *   confined eddy  F = (∂ψ/∂y, −∂ψ/∂x, 0)  →  div-free, localized by ψ
 *
 * plus scalar recipes (harmonic ∇²f = 0, Laplacian eigenfunction ∇²f = −k²f,
 * localized bump).  Every recipe returns the generated expressions AND the
 * potential + a why-it-works explanation: the construction is the lesson.
 * All derivatives below are hand-derived and unit-tested numerically.
 * The rng is injected (UI passes Math.random; tests pass a seeded LCG).
 * ========================================================================== */
(function (VF) {
  'use strict';

  var COEFS = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function pickN(rng, arr, n) {                    /* n distinct entries */
    var idx = [], out = [], i;
    for (i = 0; i < arr.length; i++) idx.push(i);
    for (i = 0; i < n && idx.length; i++) out.push(arr[idx.splice(Math.floor(rng() * idx.length) % idx.length, 1)[0]]);
    return out;
  }

  /* c·expr as a readable string; parenthesize when expr is a sum or signed */
  function cstr(c, expr) {
    if (expr === '0' || c === 0) return '0';
    var needPar = expr.charAt(0) === '-' || /[+\-]/.test(expr.slice(1));
    var e = needPar ? '(' + expr + ')' : expr;
    if (c === 1) return e;
    if (c === -1) return '-' + e;
    return String(c) + '*' + e;
  }
  /* join terms into "a + b - c", skipping zeros */
  function sum(terms) {
    var out = '';
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (t === '0' || t === '') continue;
      if (!out) out = t;
      else if (t.charAt(0) === '-') out += ' - ' + t.slice(1);
      else out += ' + ' + t;
    }
    return out || '0';
  }
  /* linear combination of potential entries: scalar label + 3 field components */
  function combine(rng, basis, n, potKey) {
    var picked = pickN(rng, basis, n), i, k;
    var cs = [];
    for (i = 0; i < picked.length; i++) cs.push(pick(rng, COEFS));
    var pot, F = [];
    if (typeof picked[0][potKey] === 'string') {           /* scalar potential φ/ψ */
      var pterms = [];
      for (i = 0; i < picked.length; i++) pterms.push(cstr(cs[i], picked[i][potKey]));
      pot = sum(pterms);
    } else {                                                /* vector potential A */
      pot = [];
      for (k = 0; k < 3; k++) {
        var aterms = [];
        for (i = 0; i < picked.length; i++) aterms.push(cstr(cs[i], picked[i][potKey][k]));
        pot.push(sum(aterms));
      }
    }
    for (k = 0; k < 3; k++) {
      var fterms = [];
      for (i = 0; i < picked.length; i++) fterms.push(cstr(cs[i], picked[i].F[k]));
      F.push(sum(fterms));
    }
    return { pot: pot, F: F };
  }

  /* ---- potential bases (φ or A with hand-derived fields) ------------------- */
  /* harmonic potentials: ∇²φ = 0, so ∇φ is curl-free AND divergence-free */
  var HARM = [
    { p: 'x*y',          F: ['y', 'x', '0'] },
    { p: 'y*z',          F: ['0', 'z', 'y'] },
    { p: 'x*z',          F: ['z', '0', 'x'] },
    { p: 'x^2-y^2',      F: ['2*x', '-2*y', '0'] },
    { p: 'y^2-z^2',      F: ['0', '2*y', '-2*z'] },
    { p: 'x*y*z',        F: ['y*z', 'x*z', 'x*y'] },
    { p: 'x^3-3*x*y^2',  F: ['3*x^2-3*y^2', '-6*x*y', '0'] }
  ];
  /* general (not necessarily harmonic) potentials for plain conservative fields */
  var GRAD = HARM.concat([
    { p: 'x^2+y^2+z^2',  F: ['2*x', '2*y', '2*z'] },
    { p: 'sin(x)*cos(y)', F: ['cos(x)*cos(y)', '-sin(x)*sin(y)', '0'] },
    { p: 'cos(2*z)',     F: ['0', '0', '-2*sin(2*z)'] },
    { p: 'exp(-r2/4)',   F: ['-0.5*x*exp(-r2/4)', '-0.5*y*exp(-r2/4)', '-0.5*z*exp(-r2/4)'] }
  ]);
  /* vector potentials A with F = ∇×A hand-derived */
  var CURL = [
    { A: ['0', '0', 'sin(x)*sin(y)'],           F: ['sin(x)*cos(y)', '-cos(x)*sin(y)', '0'] },
    { A: ['0', '0', 'exp(-(x^2+y^2)/2)'],       F: ['-y*exp(-(x^2+y^2)/2)', 'x*exp(-(x^2+y^2)/2)', '0'] },
    { A: ['sin(y)*sin(z)', '0', '0'],           F: ['0', 'sin(y)*cos(z)', '-cos(y)*sin(z)'] },
    { A: ['0', 'cos(x)*z', '0'],                F: ['-cos(x)', '0', '-sin(x)*z'] },
    { A: ['0', '0', '-(x^2+y^2)/2'],            F: ['-y', 'x', '0'] },
    { A: ['sin(z)', 'sin(x)', 'sin(y)'],        F: ['cos(y)', 'cos(z)', 'cos(x)'] }
  ];

  function addTerms(F, extra) {                  /* componentwise "F + extra" */
    var out = [];
    for (var k = 0; k < 3; k++) out.push(sum([F[k], extra[k]]));
    return out;
  }

  /* ---- recipes -------------------------------------------------------------- */
  var RECIPES = {

    conservative: function (rng) {
      var c = combine(rng, GRAD, 2, 'p');
      return {
        vector: true, fx: c.F[0], fy: c.F[1], fz: c.F[2],
        cons: 'F = ∇φ, &nbsp; φ = ' + c.pot,
        why: 'Because <b>∇×(∇φ) ≡ 0</b> is an identity, this field is conservative <i>by construction</i>: the property cannot fail.',
        tryIt: 'Operator → ∇×F is zero everywhere; a closed loop in the line-integral tool reports ∮F·dr ≈ 0; the work between two points is φ(end) − φ(start).'
      };
    },

    solenoidal: function (rng) {
      var c = combine(rng, CURL, 2, 'A');
      return {
        vector: true, fx: c.F[0], fy: c.F[1], fz: c.F[2],
        cons: 'F = ∇×A, &nbsp; A = (' + c.pot[0] + ', &nbsp;' + c.pot[1] + ', &nbsp;' + c.pot[2] + ')',
        why: 'Because <b>∇·(∇×A) ≡ 0</b> is an identity, this field is exactly incompressible, like a magnetic field, which always has a vector potential.',
        tryIt: 'Operator → ∇·F is zero everywhere; drop a body (flow reading): it tumbles and stretches, but V/V₀ stays exactly 1.'
      };
    },

    laplace: function (rng) {
      var c = combine(rng, HARM, 2, 'p');
      return {
        vector: true, fx: c.F[0], fy: c.F[1], fz: c.F[2],
        cons: 'F = ∇φ with harmonic φ = ' + c.pot + ' &nbsp;(∇²φ = 0)',
        why: 'A harmonic potential gives <b>both</b> identities at once: ∇×F ≡ 0 (gradient) and ∇·F = ∇²φ ≡ 0 (harmonic). This is the field of electrostatics or gravity in empty space.',
        tryIt: 'Check ∇·F and ∇×F at any point P: both vanish. Dropped bodies keep their volume and never spin.'
      };
    },

    source: function (rng) {
      var m = pick(rng, [-2, -1, 1, 2]), s = 3 * m;
      var F = [cstr(m, 'x'), cstr(m, 'y'), cstr(m, 'z')];
      var h = null;
      if (rng() < 0.5) { h = combine(rng, HARM, 1, 'p'); F = addTerms(F, h.F); }
      return {
        vector: true, fx: F[0], fy: F[1], fz: F[2], s: s,
        cons: 'F = (s/3)·(x, y, z)' + (h ? ' + ∇(' + h.pot + ')' : '') + ', &nbsp; s = ' + s,
        why: 'The radial part carries all the divergence: <b>∇·F = ' + s + '</b> at every point, while ∇×F ≡ 0' + (h ? ' (the harmonic addition changes neither)' : '') + '. A uniform source density.',
        tryIt: 'Drop a body: its volume grows as V/V₀ = e^{' + s + 't}' + (s < 0 ? ' (it shrivels)' : ' (it inflates)') + ', at the same rate everywhere.'
      };
    },

    vorticity: function (rng) {
      var axis = Math.floor(rng() * 3) % 3, w = pick(rng, [-2, -1, 1, 2]), hw = w / 2;
      var F, O = [0, 0, 0];
      O[axis] = w;
      if (axis === 0) F = ['0', cstr(-hw, 'z'), cstr(hw, 'y')];
      else if (axis === 1) F = [cstr(hw, 'z'), '0', cstr(-hw, 'x')];
      else F = [cstr(-hw, 'y'), cstr(hw, 'x'), '0'];
      var h = null;
      if (rng() < 0.5) { h = combine(rng, HARM, 1, 'p'); F = addTerms(F, h.F); }
      var Os = '(' + O[0] + ', ' + O[1] + ', ' + O[2] + ')';
      return {
        vector: true, fx: F[0], fy: F[1], fz: F[2], omega: O,
        cons: 'F = ½·Ω×r' + (h ? ' + ∇(' + h.pot + ')' : '') + ', &nbsp; Ω = ' + Os,
        why: 'The rotation part carries all the curl: <b>∇×F = Ω = ' + Os + '</b> at every point, and ∇·F ≡ 0' + (h ? ' (a gradient of a harmonic φ adds neither curl nor divergence)' : '') + '.',
        tryIt: 'Drop bodies at different places: every one spins with ω = ½∇×F = Ω/2, the same rate everywhere, the signature of uniform vorticity.'
      };
    },

    eddy: function (rng) {
      var c = pick(rng, [-2, -1, 1, 2]), w = pick(rng, [2, 4]);
      var g = 'exp(-(x^2+y^2)/' + w + ')';
      var psi = cstr(c, g);
      return {
        vector: true, fx: cstr(-2 * c / w, 'y*' + g), fy: cstr(2 * c / w, 'x*' + g), fz: '0', psi: psi,
        cons: 'F = (∂ψ/∂y, −∂ψ/∂x, 0), &nbsp; stream function ψ = ' + psi,
        why: 'Every stream-function field is exactly divergence-free (∂x∂y ψ − ∂y∂x ψ ≡ 0), and the Gaussian confines it: a localized eddy. Field lines are the <b>level curves of ψ</b>: closed loops.',
        tryIt: 'Turn on streamlines; drop one body inside the eddy and one far outside (it barely moves). V/V₀ stays exactly 1.'
      };
    },

    harmonic: function (rng) {
      var c = combine(rng, HARM, 2, 'p');
      return {
        vector: false, f: c.pot,
        cons: 'f solves the Laplace equation: ∇²f = 0',
        why: 'Built as a combination of harmonic basis functions (x·y, x²−y², x³−3xy², …): the Laplace equation is linear, so any combination stays harmonic.',
        tryIt: 'Operator → ∇² shows zero everywhere; Operator → ∇f turns it into a Laplace vector field (curl- and divergence-free at once).'
      };
    },

    eigen: function (rng) {
      var a = pick(rng, [1, 2]), b = pick(rng, [1, 2]), use3 = rng() < 0.5, cc = pick(rng, [1, 2]);
      function sfn(n, v) { return n === 1 ? 'sin(' + v + ')' : 'sin(' + n + '*' + v + ')'; }
      var f = sfn(a, 'x') + '*' + sfn(b, 'y') + (use3 ? '*' + sfn(cc, 'z') : '');
      var k2 = a * a + b * b + (use3 ? cc * cc : 0);
      return {
        vector: false, f: f, k2: k2,
        cons: 'f is an eigenfunction of the Laplacian: ∇²f = −k²·f, &nbsp; k² = ' + k2,
        why: 'Each sine factor contributes −n² under ∂²: differentiating twice reproduces the SAME function, scaled by −k². These are the standing waves / particle-in-a-box modes.',
        tryIt: 'Operator → ∇²: the identical shape, flipped in sign and scaled by k² = ' + k2 + ' (compare the colorbar ranges).'
      };
    },

    bump: function (rng) {
      var h = pick(rng, [-2, -1, 1, 2]), w = pick(rng, [2, 4]);
      function ctr(v) {
        var a = Math.round(rng() * 4 - 2);
        return a === 0 ? v + '^2' : '(' + v + (a > 0 ? '-' + a : '+' + (-a)) + ')^2';
      }
      var f = cstr(h, 'exp(-(' + ctr('x') + '+' + ctr('y') + '+' + ctr('z') + ')/' + w + ')');
      return {
        vector: false, f: f, h: h,
        cons: 'a localized Gaussian ' + (h > 0 ? 'peak' : 'well') + ' of height ' + h,
        why: 'The exponential of a negative quadratic decays in every direction: the standard model of a localized ' + (h > 0 ? 'bump' : 'potential well') + '.',
        tryIt: 'Operator → ∇f: arrows point ' + (h > 0 ? 'toward the peak' : 'away from the well') + '. Or drop a body in the FORCE reading: f acts as potential energy (F = −∇f), and E = ½m|v|² + f stays constant.'
      };
    }
  };

  var LIST = [
    { kind: 'conservative', vector: true,  label: 'Conservative: F = ∇φ' },
    { kind: 'solenoidal',   vector: true,  label: 'Incompressible: F = ∇×A' },
    { kind: 'laplace',      vector: true,  label: 'Laplace field: φ harmonic' },
    { kind: 'source',       vector: true,  label: 'Uniform source: ∇·F = s' },
    { kind: 'vorticity',    vector: true,  label: 'Uniform vorticity: ∇×F = Ω' },
    { kind: 'eddy',         vector: true,  label: 'Confined eddy: stream ψ' },
    { kind: 'harmonic',     vector: false, label: 'Harmonic: ∇²f = 0' },
    { kind: 'eigen',        vector: false, label: 'Eigenfunction: ∇²f = −k²f' },
    { kind: 'bump',         vector: false, label: 'Localized bump / well' }
  ];

  function make(kind, rng) {
    var d = RECIPES[kind](rng || Math.random);
    d.kind = kind;
    return d;
  }

  VF.Design = { make: make, LIST: LIST };

})(window.VF = window.VF || {});
