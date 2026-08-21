/* =============================================================================
 * ui/spin.js: the Spin lab: a spin-½ on the Bloch sphere, exact Larmor
 * precession and projective measurement
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var checkbox = K.checkbox, button = K.button, setFormula = K.setFormula, setStats = K.setStats, hideColorbar = K.hideColorbar;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  SPIN: a spin-½ on the Bloch sphere                                      */
  /* ======================================================================== */
  function spinState() {
    if (!cur.spin) cur.spin = { r: VF.Spin.fromAngles(state.spTheta, state.spPhi), trail: [], last: null };
    return cur.spin;
  }
  function spinReset() { cur.spin = { r: VF.Spin.fromAngles(state.spTheta, state.spPhi), trail: [], last: null }; renderSpin(); }
  function renderSpin() {
    if (state.mode !== 'spin') return;
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix(); viz.clearPointMarker();
    hideColorbar();
    var sp = spinState(), om = [state.spBx, state.spBy, state.spBz];
    var omag = Math.sqrt(om[0] * om[0] + om[1] * om[1] + om[2] * om[2]);
    viz.renderBloch({ r: sp.r, omega: om, omegaMag: omag, trail: state.spTrail ? sp.trail : [] });
    setFormula('|ψ⟩ = cos(θ/2)|0⟩ + e<sup>iφ</sup> sin(θ/2)|1⟩ &nbsp;·&nbsp; H = ½ Ω·σ');
    setStats('ω<sub>L</sub> = |Ω| = ' + fmt(omag) + (omag > 1e-9 ? ' &nbsp;·&nbsp; T = 2π/ω = ' + fmt(2 * Math.PI / omag) : ''));
    spinReadout();
  }
  function spinReadout() {
    if (!dom.spReadout) return;
    var sp = spinState(), r = sp.r, am = VF.Spin.amplitudes(r), an = VF.Spin.angles(r);
    function cnum(re, im) { return fmt(re) + (im >= 0 ? ' + ' : ' − ') + fmt(Math.abs(im)) + 'i'; }
    var html = '<div class="ro-line"><span>θ</span><b>' + fmt(an.theta) + '</b><span>φ</span><b>' + fmt(an.phi) + '</b></div>';
    html += '<div class="ro-sub">' + T('amplitudes') + '</div><div class="ro-vec">α = ' + cnum(am.aRe, am.aIm) + '<br>β = ' + cnum(am.bRe, am.bIm) + '</div>';
    html += '<div class="ro-sub">⟨σ⟩ = r</div><div class="ro-vec">(' + fmt(r[0]) + ', ' + fmt(r[1]) + ', ' + fmt(r[2]) + ')</div>';
    var pz = VF.Spin.prob(r, [0, 0, 1]), px2 = VF.Spin.prob(r, [1, 0, 0]), py2 = VF.Spin.prob(r, [0, 1, 0]);
    html += '<div class="ro-sub">' + T('measurement probabilities') + '</div>';
    html += '<div class="ro-vec">P(σz = ±1) = ' + fmt(pz.up) + ' / ' + fmt(pz.dn) + '<br>P(σx = ±1) = ' + fmt(px2.up) + ' / ' + fmt(px2.dn) + '<br>P(σy = ±1) = ' + fmt(py2.up) + ' / ' + fmt(py2.dn) + '</div>';
    if (sp.last) html += '<div class="hint-good">' + T('measured') + ' σ' + sp.last.axis + ' → ' + (sp.last.outcome > 0 ? '+1' : '−1') + ' (P = ' + fmt(sp.last.p) + '): ' + T('the state collapsed onto the eigenstate and the phase memory is gone.') + '</div>';
    html += '<div class="muted small">' + T('The Bloch vector precesses about Ω at the Larmor frequency. Press ▶. A measurement is a jump, not a rotation: probabilities come from the projection (1 ± r·â)/2.') + '</div>';
    dom.spReadout.innerHTML = html;
  }
  function spinMeasure(axisName, axis) {
    var sp = spinState(), m = VF.Spin.measure(sp.r, axis, Math.random());
    sp.r = m.r; sp.trail = []; sp.last = { axis: axisName, outcome: m.outcome, p: m.p };
    renderSpin();
  }
  function toggleSpinPlay() { state.spPlaying = !state.spPlaying; ctl.spPlay.textContent = state.spPlaying ? T('❚❚ Pause') : T('▶ Precess'); ctl.spPlay.classList.toggle('active', state.spPlaying); }
  function buildSpinPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('A spin-½ (qubit) lives on the Bloch sphere: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩ with Bloch vector r = ⟨σ⟩. Under H = ½Ω·σ it precesses EXACTLY: ṙ = Ω × r (Larmor). Measuring collapses it onto ±â with P = (1 ± r·â)/2.') }));
    panel.appendChild(sectionTitle('State  |ψ⟩'));
    var ts = sliderCtl(0, 3.14159, 0.01, state.spTheta, function (v) { state.spTheta = v; spinReset(); });
    panel.appendChild(field('θ (polar)', ts.node, '0 = |0⟩, π = |1⟩'));
    var ps = sliderCtl(0, 6.28318, 0.01, state.spPhi, function (v) { state.spPhi = v; spinReset(); });
    panel.appendChild(field('φ (phase)', ps.node));
    panel.appendChild(sectionTitle('Field  Ω (precession axis)'));
    var bx = sliderCtl(-3, 3, 0.05, state.spBx, function (v) { state.spBx = v; renderSpin(); });
    var by = sliderCtl(-3, 3, 0.05, state.spBy, function (v) { state.spBy = v; renderSpin(); });
    var bz = sliderCtl(-3, 3, 0.05, state.spBz, function (v) { state.spBz = v; renderSpin(); });
    panel.appendChild(field('Ωx', bx.node)); panel.appendChild(field('Ωy', by.node)); panel.appendChild(field('Ωz', bz.node));
    ctl.spPlay = button('▶ Precess', 'wide', toggleSpinPlay);
    panel.appendChild(ctl.spPlay);
    var sp2 = sliderCtl(0.1, 4, 0.1, state.spSpeed, function (v) { state.spSpeed = v; });
    panel.appendChild(field('speed', sp2.node));
    panel.appendChild(field('', checkbox('Trail', state.spTrail, function (v) { state.spTrail = v; renderSpin(); })));
    panel.appendChild(sectionTitle('Measure'));
    panel.appendChild(field('', mk('div', { 'class': 'axis-row' }, [
      button('σx', '', function () { spinMeasure('x', [1, 0, 0]); }),
      button('σy', '', function () { spinMeasure('y', [0, 1, 0]); }),
      button('σz', '', function () { spinMeasure('z', [0, 0, 1]); })
    ]), 'projective measurement: random outcome'));
    panel.appendChild(sectionTitle('Readout'));
    ctl.spReadout = mk('div', { 'class': 'readout' });
    dom.spReadout = ctl.spReadout;
    panel.appendChild(ctl.spReadout);
    return panel;
  }


  K.lab({
    key: 'spin', label: 'Spin', panel: buildSpinPanel,
    enter: renderSpin,
    togglePlay: toggleSpinPlay,
    frame: function () {
      if (!(state.spPlaying && cur.spin)) return;
      var spq = cur.spin, omq = [state.spBx, state.spBy, state.spBz];
      spq.r = VF.Spin.precess(spq.r, omq, state.spSpeed * 0.03);
      spq.trail.push(spq.r.slice());
      if (spq.trail.length > 500) spq.trail.shift();
      renderSpin();
    }
  });

})(window.VF = window.VF || {});
