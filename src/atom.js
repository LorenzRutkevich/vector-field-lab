/* =============================================================================
 * atom.js: hydrogen orbitals (VF.Atom)
 * -----------------------------------------------------------------------------
 * Atomic units a₀ = 1, energies in Hartree: Eₙ = −1/(2n²).  Real orbitals
 * ψ_nl(r,Ω) = R_nl(r)·Y(Ω) with the standard normalised radial functions
 * (n ≤ 3) and REAL spherical harmonics: the chemist's p_x, d_xy … lobes.
 * Normalisation: ∫ R² r² dr = 1 and ∫ Y² dΩ = 1, so ∫|ψ|² d³r = 1.
 * Node counts: n − l − 1 radial, l angular.  ⟨r⟩ = (3n² − l(l+1))/2.
 * Pure math, no DOM: the volume/isosurface rendering lives in the UI.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var S3 = Math.sqrt(3), PI4 = 4 * Math.PI;

  var RAD = {
    '10': function (r) { return 2 * Math.exp(-r); },
    '20': function (r) { return (1 / (2 * Math.sqrt(2))) * (2 - r) * Math.exp(-r / 2); },
    '21': function (r) { return (1 / (2 * Math.sqrt(6))) * r * Math.exp(-r / 2); },
    '30': function (r) { return (2 / (81 * Math.sqrt(3))) * (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3); },
    '31': function (r) { return (4 / (81 * Math.sqrt(6))) * r * (6 - r) * Math.exp(-r / 3); },
    '32': function (r) { return (4 / (81 * Math.sqrt(30))) * r * r * Math.exp(-r / 3); }
  };

  /* real angular parts (unit vector components u = r̂), each with ∫Y²dΩ = 1 */
  var ANG = {
    's':      function (u) { return 1 / Math.sqrt(PI4); },
    'pz':     function (u) { return Math.sqrt(3 / PI4) * u[2]; },
    'px':     function (u) { return Math.sqrt(3 / PI4) * u[0]; },
    'py':     function (u) { return Math.sqrt(3 / PI4) * u[1]; },
    'dz2':    function (u) { return 0.25 * Math.sqrt(5 / Math.PI) * (3 * u[2] * u[2] - 1); },
    'dxz':    function (u) { return 0.5 * Math.sqrt(15 / Math.PI) * u[0] * u[2]; },
    'dyz':    function (u) { return 0.5 * Math.sqrt(15 / Math.PI) * u[1] * u[2]; },
    'dxy':    function (u) { return 0.5 * Math.sqrt(15 / Math.PI) * u[0] * u[1]; },
    'dx2y2':  function (u) { return 0.25 * Math.sqrt(15 / Math.PI) * (u[0] * u[0] - u[1] * u[1]); }
  };

  /* the orbital catalogue: name → n, l, angular key, suggested view radius */
  var ORBITALS = [
    { key: '1s',      n: 1, l: 0, ang: 's',     R: 5 },
    { key: '2s',      n: 2, l: 0, ang: 's',     R: 12 },
    { key: '2p_z',    n: 2, l: 1, ang: 'pz',    R: 12 },
    { key: '2p_x',    n: 2, l: 1, ang: 'px',    R: 12 },
    { key: '3s',      n: 3, l: 0, ang: 's',     R: 22 },
    { key: '3p_z',    n: 3, l: 1, ang: 'pz',    R: 22 },
    { key: '3d_z²',   n: 3, l: 2, ang: 'dz2',   R: 22 },
    { key: '3d_xz',   n: 3, l: 2, ang: 'dxz',   R: 22 },
    { key: '3d_xy',   n: 3, l: 2, ang: 'dxy',   R: 22 },
    { key: '3d_x²−y²', n: 3, l: 2, ang: 'dx2y2', R: 22 }
  ];

  function radial(n, l) { return RAD['' + n + l]; }

  /* ψ(x, y, z) for an orbital descriptor {n, l, ang} */
  function psi(orb) {
    var Rf = radial(orb.n, orb.l), Yf = ANG[orb.ang], l = orb.l;
    return function (x, y, z) {
      var r = Math.sqrt(x * x + y * y + z * z);
      if (r < 1e-12) return l === 0 ? Rf(0) * Yf([0, 0, 1]) : 0;
      return Rf(r) * Yf([x / r, y / r, z / r]);
    };
  }

  function energy(n) { return -1 / (2 * n * n); }
  function meanR(n, l) { return (3 * n * n - l * (l + 1)) / 2; }
  function find(key) {
    for (var i = 0; i < ORBITALS.length; i++) if (ORBITALS[i].key === key) return ORBITALS[i];
    return ORBITALS[0];
  }

  VF.Atom = { ORBITALS: ORBITALS, radial: radial, angular: ANG, psi: psi, energy: energy, meanR: meanR, find: find };

})(window.VF = window.VF || {});
