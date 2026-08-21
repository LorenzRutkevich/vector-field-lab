/* =============================================================================
 * emcharges.js: electrostatics of point charges (VF.Charges)
 * -----------------------------------------------------------------------------
 * Gaussian-style units with k = 1:  E = Σ qᵢ (r−rᵢ)/|r−rᵢ|³,  φ = Σ qᵢ/|r−rᵢ|,
 * so Gauss's law reads  ∮ E·dA = 4π·Q_enclosed.
 *
 * Provides the fields as plain functions (the Fields-tab machinery draws them),
 * a numerically honest flux quadrature over a sphere (lat–long grid with
 * area weights) to VERIFY Gauss's law against the enclosed charge, and helpers
 * for seeding field lines at the charges.  Pure math, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var EPS = 1e-9;

  function Efield(charges) {
    return function (x, y, z) {
      var ex = 0, ey = 0, ez = 0, i;
      for (i = 0; i < charges.length; i++) {
        var c = charges[i], dx = x - c.x, dy = y - c.y, dz = z - c.z;
        var r2 = dx * dx + dy * dy + dz * dz;
        if (r2 < EPS) return [NaN, NaN, NaN];
        var f = c.q / (r2 * Math.sqrt(r2));
        ex += f * dx; ey += f * dy; ez += f * dz;
      }
      return [ex, ey, ez];
    };
  }

  function potential(charges) {
    return function (x, y, z) {
      var p = 0, i;
      for (i = 0; i < charges.length; i++) {
        var c = charges[i], dx = x - c.x, dy = y - c.y, dz = z - c.z;
        var r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (r < EPS) return NaN;
        p += c.q / r;
      }
      return p;
    };
  }

  /* flux ∮ E·dA over the sphere |r − c| = R (lat–long quadrature; nt×np) */
  function fluxSphere(charges, cx, cy, cz, R, nt, np) {
    nt = nt || 24; np = np || 48;
    var E = Efield(charges), flux = 0, it, ip;
    for (it = 0; it < nt; it++) {
      var th = Math.PI * (it + 0.5) / nt, st = Math.sin(th), ct = Math.cos(th);
      var dA = R * R * st * (Math.PI / nt) * (2 * Math.PI / np);
      for (ip = 0; ip < np; ip++) {
        var ph = 2 * Math.PI * (ip + 0.5) / np;
        var nx = st * Math.cos(ph), ny = st * Math.sin(ph), nz = ct;
        var Ev = E(cx + R * nx, cy + R * ny, cz + R * nz);
        if (!isFinite(Ev[0])) continue;
        flux += (Ev[0] * nx + Ev[1] * ny + Ev[2] * nz) * dA;
      }
    }
    return flux;
  }

  function enclosed(charges, cx, cy, cz, R) {
    var q = 0, i;
    for (i = 0; i < charges.length; i++) {
      var c = charges[i], dx = c.x - cx, dy = c.y - cy, dz = c.z - cz;
      if (dx * dx + dy * dy + dz * dz < R * R) q += c.q;
    }
    return q;
  }

  /* Fibonacci-sphere seed points at radius rad around every charge
     (field lines START on positive and END on negative charges) */
  function lineSeeds(charges, perCharge, rad) {
    var seeds = [], i, k, ga = Math.PI * (3 - Math.sqrt(5));
    for (i = 0; i < charges.length; i++) {
      var c = charges[i];
      for (k = 0; k < perCharge; k++) {
        var zz = 1 - 2 * (k + 0.5) / perCharge, rr = Math.sqrt(Math.max(0, 1 - zz * zz)), an = ga * k;
        seeds.push([c.x + rad * rr * Math.cos(an), c.y + rad * rr * Math.sin(an), c.z + rad * zz]);
      }
    }
    return seeds;
  }

  VF.Charges = { Efield: Efield, potential: potential, fluxSphere: fluxSphere, enclosed: enclosed, lineSeeds: lineSeeds };

})(window.VF = window.VF || {});
