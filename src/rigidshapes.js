/* =============================================================================
 * rigidshapes.js: real rigid bodies built from primitives (VF.RigidShapes)
 * -----------------------------------------------------------------------------
 * A body is a list of axis-aligned primitives {type, m, dims, pos, axis}:
 *   box        dims [a,b,c]  (full side lengths)     I = m(b²+c²)/12 …
 *   sphere     dims [r]      (solid)                 I = 2mr²/5
 *   ellipsoid  dims [a,b,c]  (semi-axes, solid)      I = m(b²+c²)/5 …
 *   cylinder   dims [r,L]    (solid, axis x|y|z)     I∥ = mr²/2, I⊥ = m(3r²+L²)/12
 *   ring       dims [R,r]    (torus,  axis x|y|z)    I∥ = m(R²+¾r²), I⊥ = m(R²/2+⅝r²)
 *
 * compound(parts) finds the centre of mass, assembles the full inertia TENSOR
 * about it (parallel-axis theorem; each primitive's own products of inertia
 * vanish by symmetry in its aligned frame):
 *      I_total = Σ [ I_prim + m(|d|²·1 − d dᵀ) ],   d = pos − COM,
 * then diagonalises it with a cyclic Jacobi eigensolver:
 *      Qᵀ I Q = diag(I₁ ≤ I₂ ≤ I₃),   Q orthogonal, det Q = +1.
 * The columns of Q are the principal axes in the built (part) frame. Euler's
 * equations then run in the principal frame with the diagonal moments.
 * compoundAbout(parts, P) does the same about ANY point P (Steiner shift), for
 * a body turning about a fixed pivot rather than freely about its COM.
 * Pure math, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* diagonal inertia of one axis-aligned primitive about its own COM */
  function primDiag(p) {
    var m = p.m, d = p.dims, par, per, ax, out;
    if (p.type === 'box') return [m * (d[1] * d[1] + d[2] * d[2]) / 12, m * (d[0] * d[0] + d[2] * d[2]) / 12, m * (d[0] * d[0] + d[1] * d[1]) / 12];
    if (p.type === 'sphere') { par = 0.4 * m * d[0] * d[0]; return [par, par, par]; }
    if (p.type === 'ellipsoid') return [m * (d[1] * d[1] + d[2] * d[2]) / 5, m * (d[0] * d[0] + d[2] * d[2]) / 5, m * (d[0] * d[0] + d[1] * d[1]) / 5];
    if (p.type === 'cylinder') { par = m * d[0] * d[0] / 2; per = m * (3 * d[0] * d[0] + d[1] * d[1]) / 12; }
    else if (p.type === 'ring') { par = m * (d[0] * d[0] + 0.75 * d[1] * d[1]); per = m * (0.5 * d[0] * d[0] + 0.625 * d[1] * d[1]); }
    else return [m, m, m];
    ax = p.axis === 'x' ? 0 : (p.axis === 'z' ? 2 : 1);
    out = [per, per, per]; out[ax] = par;
    return out;
  }

  function det3(A) {
    return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
         - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
         + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  }

  /* cyclic Jacobi for a symmetric 3×3: returns eigenvalues ascending and the
     matrix Q whose COLUMNS are the matching eigenvectors, right-handed. */
  function eigSym3(S) {
    var a = [[S[0][0], S[0][1], S[0][2]], [S[1][0], S[1][1], S[1][2]], [S[2][0], S[2][1], S[2][2]]];
    var V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], sweep, p, q, k;
    for (sweep = 0; sweep < 50; sweep++) {
      var off = a[0][1] * a[0][1] + a[0][2] * a[0][2] + a[1][2] * a[1][2];
      if (off < 1e-26) break;
      for (p = 0; p < 2; p++) for (q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-30) continue;
        var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        var c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (k = 0; k < 3; k++) { var akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (k = 0; k < 3; k++) { var apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (k = 0; k < 3; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    /* sort ascending, reorder the columns of V accordingly */
    var ord = [0, 1, 2].sort(function (i, j) { return a[i][i] - a[j][j]; });
    var vals = [a[ord[0]][ord[0]], a[ord[1]][ord[1]], a[ord[2]][ord[2]]];
    var Q = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (k = 0; k < 3; k++) { Q[0][k] = V[0][ord[k]]; Q[1][k] = V[1][ord[k]]; Q[2][k] = V[2][ord[k]]; }
    if (det3(Q) < 0) { Q[0][2] = -Q[0][2]; Q[1][2] = -Q[1][2]; Q[2][2] = -Q[2][2]; }
    return { vals: vals, Q: Q };
  }

  /* assemble a compound body: total mass, COM, inertia tensor about the COM,
     principal moments I₁ ≤ I₂ ≤ I₃ and principal axes Q (columns, built frame) */
  function compound(parts) {
    var M = 0, cx = 0, cy = 0, cz = 0, i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (!(p.m > 0)) continue;
      M += p.m; cx += p.m * p.pos[0]; cy += p.m * p.pos[1]; cz += p.m * p.pos[2];
    }
    if (!(M > 0)) return null;
    var com = [cx / M, cy / M, cz / M];
    var I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (!(p.m > 0)) continue;
      var dg = primDiag(p);
      var dx = p.pos[0] - com[0], dy = p.pos[1] - com[1], dz = p.pos[2] - com[2];
      I[0][0] += dg[0] + p.m * (dy * dy + dz * dz);
      I[1][1] += dg[1] + p.m * (dx * dx + dz * dz);
      I[2][2] += dg[2] + p.m * (dx * dx + dy * dy);
      I[0][1] -= p.m * dx * dy;
      I[0][2] -= p.m * dx * dz;
      I[1][2] -= p.m * dy * dz;
    }
    I[1][0] = I[0][1]; I[2][0] = I[0][2]; I[2][1] = I[1][2];
    var e = eigSym3(I);
    return { M: M, com: com, tensor: I, I: e.vals, Q: e.Q };
  }

  /* Steiner (parallel-axis) shift of a COM inertia tensor to any reference
     point P:   I_P = I_com + M(|d|²·1 − d dᵀ),   d = com − P.
     This is the tensor that governs rotation about a FIXED PIVOT at P: the only
     external force then acts AT P, so it exerts no torque about P and the
     angular momentum L_P = I_P ω is conserved. Euler's equations hold
     unchanged, just with I_P instead of I_com. */
  function steiner(Ic, M, d) {
    var d2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], i, j;
    var out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (i = 0; i < 3; i++) for (j = 0; j < 3; j++)
      out[i][j] = Ic[i][j] + M * ((i === j ? d2 : 0) - d[i] * d[j]);
    return out;
  }

  /* compound() taken about an arbitrary reference point ref (built frame)
     instead of the COM.  ref = null (or the COM itself) reproduces compound()
     exactly.  The returned I/Q diagonalise the tensor ABOUT ref, so Euler's
     equations integrated with them describe rotation about that point;
     .com is still reported, because the COM is what orbits when ref ≠ com. */
  function compoundAbout(parts, ref) {
    var c = compound(parts);
    if (!c) return null;
    c.ref = c.com.slice(); c.d = [0, 0, 0];
    if (!ref) return c;
    var d = [c.com[0] - ref[0], c.com[1] - ref[1], c.com[2] - ref[2]];
    if (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] < 1e-18) return c;
    var I = steiner(c.tensor, c.M, d), e = eigSym3(I);
    return { M: c.M, com: c.com, ref: [ref[0], ref[1], ref[2]], d: d, tensor: I, I: e.vals, Q: e.Q };
  }

  /* visual bounding radius about the rotation centre: scales the axis lines */
  function extent(parts, ref) {
    var r = 0.6, i, p, own;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var d = Math.sqrt(
        (p.pos[0] - ref[0]) * (p.pos[0] - ref[0]) +
        (p.pos[1] - ref[1]) * (p.pos[1] - ref[1]) +
        (p.pos[2] - ref[2]) * (p.pos[2] - ref[2]));
      if (p.type === 'box') own = 0.5 * Math.sqrt(p.dims[0] * p.dims[0] + p.dims[1] * p.dims[1] + p.dims[2] * p.dims[2]);
      else if (p.type === 'sphere') own = p.dims[0];
      else if (p.type === 'ellipsoid') own = Math.max(p.dims[0], p.dims[1], p.dims[2]);
      else if (p.type === 'cylinder') own = Math.sqrt(p.dims[0] * p.dims[0] + 0.25 * p.dims[1] * p.dims[1]);
      else own = p.dims[0] + p.dims[1];
      if (d + own > r) r = d + own;
    }
    return r;
  }

  /* the classics, dimensions chosen so the famous (in)stabilities appear:
     T-handle: the stem (y) is the MIDDLE axis (the ISS wing-nut flip);
     racket: the in-plane axis ⊥ handle (x) is the middle one (racket theorem). */
  var SHAPES = [
    { key: 'thandle', name: 'T-handle (Dzhanibekov)', parts: [
      { type: 'cylinder', axis: 'x', m: 1, dims: [0.35, 3.2], pos: [0, 1.0, 0] },
      { type: 'cylinder', axis: 'y', m: 0.5, dims: [0.35, 1.8], pos: [0, -0.25, 0] }] },
    { key: 'racket', name: 'tennis racket', parts: [
      { type: 'ring', axis: 'z', m: 0.5, dims: [1.05, 0.12], pos: [0, 1.5, 0] },
      { type: 'cylinder', axis: 'y', m: 0.5, dims: [0.12, 2.2], pos: [0, -0.65, 0] }] },
    { key: 'dumbbell', name: 'dumbbell', parts: [
      { type: 'sphere', m: 1, dims: [0.55], pos: [-1.4, 0, 0] },
      { type: 'sphere', m: 1, dims: [0.55], pos: [1.4, 0, 0] },
      { type: 'cylinder', axis: 'x', m: 0.25, dims: [0.14, 2.2], pos: [0, 0, 0] }] },
    { key: 'box', name: 'box', parts: [
      { type: 'box', m: 1, dims: [2.4, 1.6, 1.0], pos: [0, 0, 0] }] },
    { key: 'plate', name: 'thin plate', parts: [
      { type: 'box', m: 1, dims: [2.6, 1.8, 0.12], pos: [0, 0, 0] }] },
    { key: 'rod', name: 'rod', parts: [
      { type: 'cylinder', axis: 'y', m: 1, dims: [0.18, 3.4], pos: [0, 0, 0] }] },
    { key: 'ring', name: 'ring', parts: [
      { type: 'ring', axis: 'z', m: 1, dims: [1.4, 0.16], pos: [0, 0, 0] }] },
    { key: 'ellipsoid', name: 'ellipsoid', parts: [
      { type: 'ellipsoid', m: 1, dims: [1.6, 1.1, 0.7], pos: [0, 0, 0] }] }
  ];
  function find(key) {
    for (var i = 0; i < SHAPES.length; i++) if (SHAPES[i].key === key) return SHAPES[i];
    return SHAPES[0];
  }

  VF.RigidShapes = { primDiag: primDiag, eigSym3: eigSym3, det3: det3, compound: compound,
    steiner: steiner, compoundAbout: compoundAbout, extent: extent, SHAPES: SHAPES, find: find };

})(window.VF = window.VF || {});
