/* =============================================================================
 * presets.js: a curated, educational library of fields and matrices
 * ========================================================================== */
(function (VF) {
  'use strict';

  var vector = [
    { name: 'Uniform flow', fx: '1', fy: '0.3', fz: '0',
      desc: 'Constant field. ∇·F = 0 and ∇×F = 0 everywhere.' },
    { name: 'Radial source', fx: 'x', fy: 'y', fz: 'z',
      desc: 'Points outward from the origin. ∇·F = 3 (a source), ∇×F = 0.' },
    { name: 'Sink', fx: '-x', fy: '-y', fz: '-z',
      desc: 'Points inward. ∇·F = −3 (a sink), ∇×F = 0.' },
    { name: 'Rigid rotation (z)', fx: '-y', fy: 'x', fz: '0',
      desc: 'Solid-body rotation about the z-axis. ∇×F = (0,0,2), ∇·F = 0.' },
    { name: 'Simple shear', fx: 'y', fy: '0', fz: '0',
      desc: 'Shear flow. ∇·F = 0 but ∇×F = (0,0,−1): shear carries vorticity.' },
    { name: 'Saddle (2D)', fx: 'x', fy: '-y', fz: '0',
      desc: 'Hyperbolic stagnation point. ∇·F = 0, ∇×F = 0.' },
    { name: 'Irrotational vortex', fx: '-y/rho^2', fy: 'x/rho^2', fz: '0',
      desc: '1/ρ vortex. ∇×F = 0 away from the axis, yet it circulates: the classic “curl-free vortex”.' },
    { name: 'Coulomb / gravity', fx: 'x/r^3', fy: 'y/r^3', fz: 'z/r^3',
      desc: 'Inverse-square field. ∇·F = 0 away from the origin (the source sits at r = 0).' },
    { name: 'ABC Beltrami flow', fx: 'sin(z)+cos(y)', fy: 'sin(x)+cos(z)', fz: 'sin(y)+cos(x)',
      desc: 'Beltrami field: ∇×F = F. Divergence-free with chaotic streamlines. Turn on streamlines!' },
    { name: 'Conservative (gradient)', fx: '2x', fy: '2y', fz: '2z',
      desc: 'F = ∇(x²+y²+z²). Curl-free (conservative). Compare with “Radial source”.' },
    { name: 'Helical flow', fx: '-y', fy: 'x', fz: '0.6',
      desc: 'Rotation plus drift along z. ∇×F = (0,0,2), ∇·F = 0.' },
    { name: 'Confined rotation', fx: '-y*(rho < 2)', fy: 'x*(rho < 2)', fz: '0',
      desc: 'Rigid rotation masked to the disk ρ<2 by a comparison (1 inside, 0 outside): the field vanishes beyond radius 2.' },
    { name: 'Traveling wave (t)', fx: 'sin(x - t)', fy: '0', fz: '0',
      desc: 'Time-dependent. Press ▶ Play (or drag t) to watch it move.' }
  ];

  var scalar = [
    { name: 'Gaussian bump', f: 'exp(-(x^2+y^2+z^2))',
      desc: 'Localized peak. ∇f points toward the center; ∇²f reveals a positive core and negative shell.' },
    { name: 'Paraboloid', f: 'x^2+y^2+z^2',
      desc: 'Bowl potential. ∇f = (2x,2y,2z); ∇²f = 6 (constant).' },
    { name: 'Harmonic saddle', f: 'x^2 - y^2',
      desc: 'Harmonic in 2D: ∇²f = 0. A saddle surface.' },
    { name: 'Coulomb potential', f: '1/r',
      desc: '1/r potential. ∇²f = 0 away from the origin (Laplace’s equation); ∇f = −Coulomb field.' },
    { name: 'Plane wave', f: 'sin(x)',
      desc: 'Eigenfunction of the Laplacian: ∇²f = −f.' },
    { name: 'l=2 spherical harmonic', f: '(3*z^2 - r^2)',
      desc: 'Solid harmonic (∝ Y₂₀). Harmonic: ∇²f = 0.' },
    { name: 'Ripple', f: 'cos(3*r)*exp(-0.4*r)',
      desc: 'Damped radial ripple, nice for slice and iso views.' },
    { name: 'Product wave', f: 'sin(x)*cos(y)',
      desc: 'Separable wave. ∇²f = −2 f.' },
    { name: 'Dipole potential', f: 'z/r^3',
      desc: 'Potential of a point dipole. Harmonic away from the origin.' },
    { name: 'Ball indicator χ', f: '(x^2+y^2+z^2 < 4)',
      desc: 'Characteristic function of the ball r<2: 1 inside, 0 outside. A comparison used as a set. Try the isosurface / slice views.' },
    { name: 'Spherical shell', f: '(1 < x^2+y^2+z^2 < 4)',
      desc: 'Chained comparison 1 < r² < 4: the region between two spheres (1 in the shell, 0 elsewhere).' },
    { name: 'Standing wave (t)', f: 'sin(x)*cos(t)',
      desc: 'Time-dependent standing wave. Press ▶ Play.' }
  ];

  var c45 = 0.70710678, R60 = 0.5, R60s = 0.8660254;
  var matrix = [
    { name: 'Identity', m: [1, 0, 0, 0, 1, 0, 0, 0, 1], desc: 'Does nothing. Every vector is an eigenvector (λ = 1).' },
    { name: 'Non-uniform scale', m: [2, 0, 0, 0, 0.5, 0, 0, 0, 1], desc: 'Stretch x, squeeze y. det = 1 (volume preserved). Eigenvectors are the axes.' },
    { name: 'Rotation 45° (z)', m: [c45, -c45, 0, c45, c45, 0, 0, 0, 1], desc: 'Orthogonal, det = 1. Complex eigenvalues e^±iθ; real eigenvector is the z-axis.' },
    { name: 'Shear (x←y)', m: [1, 1, 0, 0, 1, 0, 0, 0, 1], desc: 'Shear. det = 1; λ = 1 three times, but the eigenspace is only the x–z plane (2-D): defective, so no basis of eigenvectors exists.' },
    { name: 'Reflection (z)', m: [1, 0, 0, 0, 1, 0, 0, 0, -1], desc: 'Mirror through the xy-plane. det = −1 (improper). Eigenvalues 1, 1, −1.' },
    { name: 'Projection → xy', m: [1, 0, 0, 0, 1, 0, 0, 0, 0], desc: 'Flattens onto the xy-plane. Rank 2, det = 0. Eigenvalues 1, 1, 0.' },
    { name: 'Rotation generator Kz', m: [0, -1, 0, 1, 0, 0, 0, 0, 0], desc: 'Skew-symmetric. exp(θ·Kz) is rotation by θ about z. Try the exp(tA) flow!' },
    { name: 'Symmetric', m: [2, 1, 0, 1, 2, 0, 0, 0, 3], desc: 'Symmetric ⇒ real eigenvalues and orthogonal eigenvectors.' },
    { name: 'Spiral (complex λ)', m: [0.15, -1, 0, 1, 0.15, 0, 0, 0, -0.35], desc: 'Complex eigenvalues ⇒ the exp(tA) flow spirals outward while decaying along z.' },
    { name: 'Defective (Jordan)', m: [2, 1, 0, 0, 2, 0, 0, 0, 3], desc: 'Repeated eigenvalue 2 with only one eigenvector: not diagonalizable.' },
    { name: 'Nilpotent', m: [0, 1, 0, 0, 0, 1, 0, 0, 0], desc: 'N³ = 0. exp(N) = I + N + N²/2 terminates exactly.' },
    { name: 'Rotation 60° about (1,1,1)', m: rotAxis([1, 1, 1], Math.PI / 3), desc: 'A general rotation. Its eigenvector (λ = 1) is the axis (1,1,1).' }
  ];

  function rotAxis(axis, ang) { return VF.LinAlg.toFlat(VF.LinAlg.rotationAxisAngle(axis, ang)); }

  VF.Presets = { vector: vector, scalar: scalar, matrix: matrix };

})(window.VF = window.VF || {});
