/* =============================================================================
 * ui/charges.js: the Charges lab: electrostatics of point charges, with
 * Gauss's law checked live against a movable sphere
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, evalNum = K.evalNum;
  var sliderCtl = K.sliderCtl, regR = K.regR, regDomain = K.regDomain, setDomainR = K.setDomainR, checkbox = K.checkbox, button = K.button;
  var setError = K.setError, setFormula = K.setFormula, setStats = K.setStats, updateColorbar = K.updateColorbar, hideColorbar = K.hideColorbar, domain = K.domain;
  var spacingFor = K.spacingFor, cmHex = K.cmHex;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  CHARGES: electrostatics of point charges (Gauss's law live)             */
  /* ======================================================================== */
  var CH_PRESETS = [
    { name: 'single charge', ch: [{ x: 0, y: 0, z: 0, q: 1 }] },
    { name: 'dipole', ch: [{ x: -1.5, y: 0, z: 0, q: 1 }, { x: 1.5, y: 0, z: 0, q: -1 }] },
    { name: 'two equal charges', ch: [{ x: -1.5, y: 0, z: 0, q: 1 }, { x: 1.5, y: 0, z: 0, q: 1 }] },
    { name: 'quadrupole', ch: [{ x: -1.5, y: -1.5, z: 0, q: 1 }, { x: 1.5, y: -1.5, z: 0, q: -1 }, { x: 1.5, y: 1.5, z: 0, q: 1 }, { x: -1.5, y: 1.5, z: 0, q: -1 }] },
    { name: 'row of 5 (plate)', ch: [{ x: -3, y: 0, z: 0, q: 1 }, { x: -1.5, y: 0, z: 0, q: 1 }, { x: 0, y: 0, z: 0, q: 1 }, { x: 1.5, y: 0, z: 0, q: 1 }, { x: 3, y: 0, z: 0, q: 1 }] }
  ];
  function chCap() {                                   /* colour cap: |E| explodes at the charges */
    var E = VF.Charges.Efield(state.chList), R = state.R, mags = [], i, j, k;
    for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) for (k = -2; k <= 2; k++) {
      var v = E(i * R / 2.2, j * R / 2.2, k * R / 2.2);
      var m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (isFinite(m)) mags.push(m);
    }
    mags.sort(function (a, b) { return a - b; });
    return (mags[Math.floor(mags.length * 0.92)] || 1) * 1.5;
  }
  function renderCharges() {
    if (state.mode !== 'charges') return;
    var CH = VF.Charges, ch = state.chList, R = state.R, map = VF.Colormaps.get(state.colormap), i;
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix(); viz.clearFunc(); viz.clearPointMarker();
    setError(null);
    if (!ch.length) {
      hideColorbar(); setFormula('E = Σ qᵢ (r−rᵢ)/|r−rᵢ|³'); setStats(T('no charges: add one in the panel'));
      if (state.chGauss) viz.addTranslucentSphere([state.chGx, state.chGy, state.chGz], state.chGaussR, 0x63e6a0);
      chReadout(); return;
    }
    var E = CH.Efield(ch), phi = CH.potential(ch);
    var Ef = { kind: 'vector', label: 'E', at: function (x, y, z, t) { return E(x, y, z); } };
    var cap = chCap();
    if (state.chSurf) {                                /* equipotential surface φ = const */
      var qmax = 0;
      for (i = 0; i < ch.length; i++) qmax = Math.max(qmax, Math.abs(ch[i].q));
      var lvl = state.chSurfLvl * qmax;
      var mesh = VF.Manifolds.marchingTets(function (x, y, z) { return phi(x, y, z); }, lvl, domain(), 34);
      viz.renderImplicitSurface(mesh, { showSurface: true, color: lvl >= 0 ? 0xff6b6b : 0x4cc9f0 });
    }
    if (state.chArrows) {
      var samples = VF.FieldMath.sampleVector(Ef, domain(), state.chN, 0), capped = [];
      for (i = 0; i < samples.mag.length; i++) capped.push(Math.min(samples.mag[i], cap));
      viz.renderVectorField({ pos: samples.pos, vec: samples.vec, mag: capped, min: 0, max: cap, count: samples.count },
        { map: map, min: 0, max: cap, normalize: true, scale: 1, spacing: spacingFor(state.chN) });
      updateColorbar(state.colormap, 0, cap, '|E|', false);
    } else hideColorbar();
    if (state.chLines) {
      var lines = VF.FieldMath.streamlines(Ef, CH.lineSeeds(ch, 14, 0.28), domain(), { maxSteps: 380 });
      viz.renderStreamlines(lines, { map: map, min: 0, max: cap });
    }
    if (state.chEqui) {                                /* equipotential curves in z = 0 */
      var vals = [], gv, gi, gj, NGr = 41;
      for (gj = 0; gj < NGr; gj++) for (gi = 0; gi < NGr; gi++) {
        gv = phi(-R + 2 * R * gi / (NGr - 1), -R + 2 * R * gj / (NGr - 1), 0);
        if (isFinite(gv)) vals.push(gv);
      }
      vals.sort(function (a, b) { return a - b; });
      var scaleP = Math.max(Math.abs(vals[Math.floor(vals.length * 0.06)] || 1), Math.abs(vals[Math.floor(vals.length * 0.94)] || 1)) || 1;
      var pcts = [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92], done = [];
      for (i = 0; i < pcts.length; i++) {
        var lv = vals[Math.floor(vals.length * pcts[i])], skip = false, dj;
        for (dj = 0; dj < done.length; dj++) if (Math.abs(lv - done[dj]) < 1e-3 * scaleP) skip = true;
        if (skip || !isFinite(lv)) continue;
        done.push(lv);
        var chains = VF.Manifolds.levelCurves2D(function (x, y) { return phi(x, y, 0); }, lv, -R, R, -R, R, 72);
        var tcol = 0.5 + 0.5 * Math.max(-1, Math.min(1, lv / scaleP));
        for (dj = 0; dj < chains.length; dj++) {
          var cp = chains[dj].pts, p3 = [];
          for (var pk = 0; pk < cp.length; pk++) p3.push([cp[pk][0], cp[pk][1], 0]);
          viz.renderFunctionCurve({ main: p3 }, { color: cmHex(VF.Colormaps.get('coolwarm'), tcol) });
        }
      }
    }
    for (i = 0; i < ch.length; i++)
      viz.renderFunctionCurve({ main: [], marker: [ch[i].x, ch[i].y, ch[i].z] }, { markerColor: ch[i].q >= 0 ? 0xff6b6b : 0x4cc9f0 });
    if (state.chGauss) viz.addTranslucentSphere([state.chGx, state.chGy, state.chGz], state.chGaussR, 0x63e6a0);
    var Q = 0;
    for (i = 0; i < ch.length; i++) Q += ch[i].q;
    setFormula('E = Σ qᵢ (r−rᵢ)/|r−rᵢ|³ &nbsp;·&nbsp; φ = Σ qᵢ/|r−rᵢ| &nbsp; (k = 1)');
    setStats(ch.length + ' ' + T('charge(s)') + ' &nbsp;·&nbsp; Q = ' + fmt(Q));
    chReadout();
  }
  /* moving the Gauss sphere must not re-trace field lines: redraw only sphere + readout */
  function chGaussMoved() {
    if (state.mode !== 'charges') return;
    viz.clearPointMarker();
    if (state.chGauss) viz.addTranslucentSphere([state.chGx, state.chGy, state.chGz], state.chGaussR, 0x63e6a0);
    chReadout();
  }
  function chReadout() {
    if (!dom.chReadout) return;
    var CH = VF.Charges, html = '';
    if (state.chGauss && state.chList.length) {
      var flux = CH.fluxSphere(state.chList, state.chGx, state.chGy, state.chGz, state.chGaussR);
      var qenc = CH.enclosed(state.chList, state.chGx, state.chGy, state.chGz, state.chGaussR);
      var expect = 4 * Math.PI * qenc;
      html += '<div class="ro-sub">' + T('Gauss sphere (green)') + '</div>';
      html += '<div class="ro-line"><span>∮ E·dA</span><b>' + fmt(flux) + '</b><span>4π·Q<sub>enc</sub></span><b>' + fmt(expect) + '</b></div>';
      html += '<div class="ro-line"><span>Q<sub>enc</sub></span><b>' + fmt(qenc) + '</b></div>';
      var near = false, i;
      for (i = 0; i < state.chList.length; i++) {
        var c = state.chList[i], dd = Math.sqrt((c.x - state.chGx) * (c.x - state.chGx) + (c.y - state.chGy) * (c.y - state.chGy) + (c.z - state.chGz) * (c.z - state.chGz));
        if (Math.abs(dd - state.chGaussR) < 0.25) near = true;
      }
      if (near) html += '<div class="muted small">' + T('a charge sits almost ON the sphere: the numerical flux loses accuracy there.') + '</div>';
      else if (Math.abs(flux - expect) < 0.03 * (1 + Math.abs(expect)))
        html += '<div class="hint-good">' + T('Gauss’s law, verified numerically: the flux counts exactly the enclosed charge; charges outside contribute zero net flux, wherever they sit.') + '</div>';
      html += '<div class="muted small">' + T('Move and resize the sphere: the flux jumps only when a charge crosses the surface.') + '</div>';
    }
    html += '<div class="muted small">' + T('Field lines start on positive (red) and end on negative (blue) charges; equipotential curves (z = 0 plane) cross them at right angles: E = −∇φ.') + '</div>';
    dom.chReadout.innerHTML = html;
  }
  function buildChargesPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Point charges with k = 1: E = Σ qᵢ r̂ᵢ/rᵢ², φ = Σ qᵢ/rᵢ, so Gauss’s law reads ∮E·dA = 4π·Q_enc. Place charges, watch field lines and equipotentials, and verify Gauss’s law with the movable sphere.') }));
    panel.appendChild(sectionTitle('Charges'));
    ctl.chX = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'x', placeholder: 'x' });
    ctl.chY = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'y', placeholder: 'y' });
    ctl.chZ = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'z', placeholder: 'z' });
    ctl.chQ = mk('input', { type: 'text', 'class': 'mcell', value: '1', title: 'q', placeholder: 'q' });
    panel.appendChild(mk('div', { 'class': 'point-add' }, [ctl.chX, ctl.chY, ctl.chZ, ctl.chQ, button('Add', 'point-add-btn', addCharge)]));
    ctl.chListBox = mk('div', { 'class': 'points-list' });
    panel.appendChild(ctl.chListBox);
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    CH_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { state.chList = p.ch.map(function (c) { return { x: c.x, y: c.y, z: c.z, q: c.q }; }); renderChargeList(); renderCharges(); })); });
    panel.appendChild(pb);
    panel.appendChild(sectionTitle('Show'));
    panel.appendChild(field('', checkbox('Field arrows E', state.chArrows, function (v) { state.chArrows = v; renderCharges(); })));
    panel.appendChild(field('', checkbox('Field lines', state.chLines, function (v) { state.chLines = v; renderCharges(); })));
    panel.appendChild(field('', checkbox('Equipotential curves (z = 0)', state.chEqui, function (v) { state.chEqui = v; renderCharges(); })));
    panel.appendChild(field('', checkbox('Equipotential surface φ = const', state.chSurf, function (v) { state.chSurf = v; renderCharges(); })));
    var lvs = sliderCtl(-2, 2, 0.05, state.chSurfLvl, function (v) { state.chSurfLvl = v; if (state.chSurf) renderCharges(); });
    panel.appendChild(field('surface level (·q_max)', lvs.node));
    var ns = sliderCtl(4, 12, 1, state.chN, function (v) { state.chN = Math.round(v); renderCharges(); });
    panel.appendChild(field('Arrow grid N', ns.node));
    panel.appendChild(sectionTitle('Gauss sphere'));
    panel.appendChild(field('', checkbox('Show the sphere & its flux', state.chGauss, function (v) { state.chGauss = v; chGaussMoved(); })));
    var gx = regR(sliderCtl(-state.R, state.R, 0.05, state.chGx, function (v) { state.chGx = v; chGaussMoved(); }));
    var gy = regR(sliderCtl(-state.R, state.R, 0.05, state.chGy, function (v) { state.chGy = v; chGaussMoved(); }));
    var gz = regR(sliderCtl(-state.R, state.R, 0.05, state.chGz, function (v) { state.chGz = v; chGaussMoved(); }));
    panel.appendChild(field('centre x', gx.node)); panel.appendChild(field('centre y', gy.node)); panel.appendChild(field('centre z', gz.node));
    var gr = sliderCtl(0.4, 6, 0.05, state.chGaussR, function (v) { state.chGaussR = v; chGaussMoved(); });
    panel.appendChild(field('radius', gr.node));
    panel.appendChild(sectionTitle('Display'));
    var rs = regDomain(sliderCtl(2, 10, 1, state.R, function (v) { setDomainR(v); renderCharges(); }));
    panel.appendChild(field('Domain ±R', rs.node));
    panel.appendChild(sectionTitle('Readout'));
    ctl.chReadout = mk('div', { 'class': 'readout' });
    dom.chReadout = ctl.chReadout;
    panel.appendChild(ctl.chReadout);
    return panel;
  }
  function addCharge() {
    var x = evalNum(ctl.chX.value), y = evalNum(ctl.chY.value), z = evalNum(ctl.chZ.value), q = evalNum(ctl.chQ.value);
    state.chList.push({ x: isFinite(x) ? x : 0, y: isFinite(y) ? y : 0, z: isFinite(z) ? z : 0, q: isFinite(q) ? q : 1 });
    renderChargeList(); renderCharges();
  }
  function renderChargeList() {
    if (!ctl.chListBox) return;
    ctl.chListBox.innerHTML = '';
    for (var i = 0; i < state.chList.length; i++) {
      (function (c, idx) {
        var sw = mk('span', { 'class': 'pt-swatch', style: 'background:#' + (c.q >= 0 ? 'ff6b6b' : '4cc9f0') });
        var lbl = mk('span', { 'class': 'pt-coord', text: 'q = ' + fmt(c.q) + '  @ (' + fmt(c.x) + ', ' + fmt(c.y) + ', ' + fmt(c.z) + ')' });
        var del = mk('button', { 'class': 'pt-del', title: 'remove', text: '×', onclick: function () { state.chList.splice(idx, 1); renderChargeList(); renderCharges(); } });
        ctl.chListBox.appendChild(mk('div', { 'class': 'pt-row' }, [sw, lbl, del]));
      })(state.chList[i], i);
    }
  }


  K.lab({
    key: 'charges', label: 'Charges', panel: buildChargesPanel,
    refresh: renderChargeList,
    enter: renderCharges
  });

})(window.VF = window.VF || {});
