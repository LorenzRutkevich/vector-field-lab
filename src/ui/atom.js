/* =============================================================================
 * ui/atom.js: the Atom lab: the real hydrogen orbitals (n ≤ 3, a₀ = 1)
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, setFormula = K.setFormula, setStats = K.setStats, updateColorbar = K.updateColorbar, esc = K.esc, labs = K.labs;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  ATOM: hydrogen orbitals                                                 */
  /* ======================================================================== */
  function renderAtom() {
    if (state.mode !== 'atom') return;
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix(); viz.clearFunc(); viz.clearPointMarker();
    var orb = VF.Atom.find(state.atOrb), psi = VF.Atom.psi(orb), R = state.atR, map = VF.Colormaps.get(state.colormap);
    var adom = { min: [-R, -R, -R], max: [R, R, R] };
    var p2 = function (x, y, z) { var v = psi(x, y, z); return v * v; };
    var mx = 0, i, j, k, NGa = 21;
    for (i = 0; i < NGa; i++) for (j = 0; j < NGa; j++) for (k = 0; k < NGa; k++) {
      var vv = p2(-R + 2 * R * i / (NGa - 1), -R + 2 * R * j / (NGa - 1), -R + 2 * R * k / (NGa - 1));
      if (vv > mx) mx = vv;
    }
    if (state.atView === 'points') {
      var sfield = VF.FieldMath.scalarField(function (x, y, z, t) { return p2(x, y, z); }, '|ψ|²');
      var list = VF.FieldMath.sampleScalar(sfield, adom, 18, 0);
      viz.renderScalarPoints(list, { map: map, size: (2 * R / 17) * 0.5, hideBelow: mx * 0.015 });
      updateColorbar(state.colormap, 0, list.max, '|ψ|²', false);
    } else {
      var mesh = VF.Manifolds.marchingTets(function (x, y, z) { return p2(x, y, z); }, state.atIso * state.atIso * mx, adom, 40);
      var sgn = [];
      for (i = 0; i < mesh.pos.length; i++) sgn.push(psi(mesh.pos[i][0], mesh.pos[i][1], mesh.pos[i][2]) >= 0 ? 1 : -1);
      viz.renderConstraintSurface({ pos: mesh.pos, nor: mesh.nor, val: sgn, min: -1, max: 1 }, { map: VF.Colormaps.get('coolwarm') });
      updateColorbar('coolwarm', -1, 1, 'sign ψ', true);
    }
    setFormula('ψ<sub>' + esc(orb.key) + '</sub> &nbsp;·&nbsp; E<sub>n</sub> = −1/(2n²) = ' + fmt(VF.Atom.energy(orb.n)) + ' Ha');
    setStats('n = ' + orb.n + ', l = ' + orb.l + ' &nbsp;·&nbsp; ⟨r⟩ = ' + fmt(VF.Atom.meanR(orb.n, orb.l)) + ' a₀' +
      ' &nbsp;·&nbsp; ' + (orb.n - orb.l - 1) + ' + ' + orb.l + ' ' + T('nodes (radial + angular)'));
    atomReadout(orb);
  }
  function atomReadout(orb) {
    if (!dom.atReadout) return;
    var html = '<div class="ro-line"><span>E<sub>' + orb.n + '</sub></span><b>' + fmt(VF.Atom.energy(orb.n)) + ' Ha</b>' +
      '<span>⟨r⟩</span><b>' + fmt(VF.Atom.meanR(orb.n, orb.l)) + ' a₀</b></div>';
    html += '<div class="ro-line"><span>' + T('radial nodes') + '</span><b>' + (orb.n - orb.l - 1) + '</b><span>' + T('angular nodes') + '</span><b>' + orb.l + '</b></div>';
    html += '<div class="muted small">' + T('Real orbitals (the chemist’s lobes): red / blue is the SIGN of ψ, the phase pattern that decides bonding. The energy depends only on n (hydrogen degeneracy); the shape carries l and m. Atomic units: lengths in a₀, energies in Hartree.') + '</div>';
    html += '<div class="muted small">' + T('Isosurface view: a surface of constant |ψ|² (drag the level). Cloud view: |ψ|² sampled as points, the probability density itself.') + '</div>';
    dom.atReadout.innerHTML = html;
  }
  function buildAtomPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('The hydrogen eigenstates ψ_nlm: the exact solutions of −½∇²ψ − ψ/r = Eψ. Pick an orbital and see its probability cloud or its |ψ|² isosurface with the sign of ψ coloured (red +, blue −).') }));
    panel.appendChild(sectionTitle('Orbital'));
    var opts = [];
    for (var i = 0; i < VF.Atom.ORBITALS.length; i++) opts.push({ v: VF.Atom.ORBITALS[i].key, label: VF.Atom.ORBITALS[i].key });
    ctl.atSel = select(opts, state.atOrb, function (v) {
      state.atOrb = v;
      state.atR = VF.Atom.find(v).R;                 /* each orbital brings its natural view radius */
      if (ctl.atRS) { ctl.atRS.input.value = state.atR; ctl.atRS.out.value = fmt(state.atR); }
      viz.setDomain(state.atR);
      renderAtom();
    });
    panel.appendChild(field('ψ_nlm', ctl.atSel));
    ctl.atViewSel = select([{ v: 'iso', label: 'isosurface (sign-coloured)' }, { v: 'points', label: 'probability cloud |ψ|²' }],
      state.atView, function (v) { state.atView = v; renderAtom(); });
    panel.appendChild(field('View', ctl.atViewSel));
    var is2 = sliderCtl(0.05, 0.8, 0.01, state.atIso, function (v) { state.atIso = v; if (state.atView === 'iso') renderAtom(); });
    panel.appendChild(field('iso level', is2.node, 'fraction of max |ψ|'));
    panel.appendChild(sectionTitle('Display'));
    ctl.atRS = sliderCtl(2, 30, 1, state.atR, function (v) { state.atR = v; viz.setDomain(v); renderAtom(); });
    panel.appendChild(field('Domain ±R (a₀)', ctl.atRS.node));
    panel.appendChild(sectionTitle('Readout'));
    ctl.atReadout = mk('div', { 'class': 'readout' });
    dom.atReadout = ctl.atReadout;
    panel.appendChild(ctl.atReadout);
    return panel;
  }


  K.lab({
    key: 'atom', label: 'Atom', panel: buildAtomPanel,
    enter: renderAtom,
    /* the orbitals need a much larger view radius than the other 3-D labs */
    viewR: function () { return state.atR; }
  });

})(window.VF = window.VF || {});
