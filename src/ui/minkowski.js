/* =============================================================================
 * ui/minkowski.js: the Minkowski lab: 1+1 spacetime diagrams, boosts as
 * hyperbolic rotations, worldlines and events
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, evalNum = K.evalNum;
  var sliderCtl = K.sliderCtl, animSync = K.animSync, checkbox = K.checkbox, button = K.button, setFormula = K.setFormula, setStats = K.setStats;
  var lab = K.lab;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  MINKOWSKI (spacetime) pipeline                                           */
  /* ======================================================================== */
  var MINK_COLORS = [0x63e6a0, 0xffd166, 0x8be9fd, 0xffb454, 0xb28dff, 0xff6b6b];
  var MINK_EVENT_COLORS = [0xff5cc8, 0xffd166, 0x4cc9f0, 0x63e6a0, 0xb28dff, 0xff6b6b];
  var MINK_PHI_MAX = 1.8317;   /* rapidity at β = 0.95: the boost-animation amplitude */

  var MINK_PRESETS = [
    { name: 'Simultaneity', beta: 0.5, half: 6,
      show: { primed: true, light: true, cone: false, hyper: false, simul: true, grid: false },
      wl: [], ev: [{ x: -2.5, ct: 0, label: 'A' }, { x: 2.5, ct: 0, label: 'B' }], paths: [],
      desc: 'A and B happen at the same lab time (ct = 0) but NOT in the moving frame. Read their differing ct′. Simultaneity is relative.' },
    { name: 'Time dilation', beta: 0.6, half: 6,
      show: { primed: true, light: true, cone: false, hyper: true, simul: false, grid: false },
      wl: [{ beta: 0.6, label: 'clock' }], ev: [{ x: 0, ct: 1, label: '1' }], paths: [],
      desc: 'The moving clock runs slow: one tick of its proper time (where ct′ crosses the hyperbola (ct)²−x²=1) sits higher up the lab ct axis.' },
    { name: 'Length contraction', beta: 0.6, half: 6,
      show: { primed: true, light: true, cone: false, hyper: true, simul: true, grid: false },
      wl: [{ beta: 0, x0: -1.5, label: '' }, { beta: 0, x0: 1.5, label: 'rod' }], ev: [], paths: [],
      desc: 'A rod at rest in the lab (two vertical worldlines) is shorter in the moving frame. Compare its width along x with its width along x′ (a simultaneity line).' },
    { name: 'Light cone', beta: 0.4, half: 6,
      show: { primed: true, light: true, cone: true, hyper: false, simul: false, grid: false },
      wl: [{ beta: 0.4, label: '' }], ev: [{ x: 3, ct: 1, label: '?' }], paths: [],
      desc: 'Light (45°) is the same in every frame. Future/past (timelike) are reachable; the event at (3, 1) is spacelike: causally unreachable “elsewhere”.' },
    { name: 'Velocity addition', beta: 0.5, half: 6,
      show: { primed: true, light: true, cone: false, hyper: true, simul: false, grid: false },
      wl: [{ beta: 0.8, label: 'u = 0.8' }], ev: [], paths: [],
      desc: 'Boost β = 0.5, then a particle doing 0.5 in THAT frame moves at (0.5+0.5)/(1+0.25) = 0.8 in the lab: never past 1. Velocities don’t add; rapidities do.' },
    { name: 'Twin paradox', beta: 0.6, half: 11,
      show: { primed: false, light: true, cone: false, hyper: true, simul: false, grid: false },
      wl: [{ beta: 0, x0: 0, label: 'home' }], ev: [], paths: [{ pts: [[0, 0], [3, 5], [0, 10]], label: 'traveller' }],
      desc: 'The stay-at-home twin runs straight up the ct axis; the traveller’s bent worldline (turnaround at ct = 5) is LONGER on paper yet SHORTER in proper time: she comes back younger.' }
  ];

  function clampBeta(b) { return b < -0.98 ? -0.98 : (b > 0.98 ? 0.98 : b); }

  function renderMinkowskiView() {
    if (state.mode !== 'minkowski') return;
    var i, wls = [], pas = [];
    /* labels stay English in state (presets are the dictionary keys) and are
       translated only for display, so a language switch re-labels the diagram */
    for (i = 0; i < state.minkWorldlines.length; i++) {
      var w0 = state.minkWorldlines[i];
      w0.color = MINK_COLORS[i % MINK_COLORS.length];
      wls.push({ beta: w0.beta, x0: w0.x0, color: w0.color, label: w0.label ? T(w0.label) : w0.label });
    }
    for (i = 0; i < state.minkEvents.length; i++) state.minkEvents[i].color = MINK_EVENT_COLORS[i % MINK_EVENT_COLORS.length];
    for (i = 0; i < state.minkPaths.length; i++) {
      var p0 = state.minkPaths[i];
      pas.push({ pts: p0.pts, color: p0.color, label: p0.label ? T(p0.label) : p0.label });
    }
    var m = VF.Mink.buildModel({
      half: state.minkHalf, beta: clampBeta(state.minkBeta),
      showPrimed: state.minkShowPrimed, showLight: state.minkShowLight, showLightCone: state.minkShowCone,
      showHyper: state.minkShowHyper, showSimul: state.minkShowSimul, showGrid: state.minkShowGrid,
      worldlines: wls, events: state.minkEvents, paths: pas
    });
    cur.mink = m;
    viz.set2DRange(state.minkHalf);
    viz.renderMinkowski(m);
    setFormula('Minkowski diagram &nbsp;·&nbsp; β = <b>' + fmt(m.beta) + '</b> &nbsp; γ = <b>' + fmt(m.gamma) + '</b> &nbsp; φ = <b>' + fmt(m.phi) + '</b>');
    setStats('1+1 spacetime &nbsp;·&nbsp; ' + state.minkWorldlines.length + ' worldline(s) · ' + state.minkEvents.length + ' event(s)');
    minkReadout(m);
    renderMinkEventList();
  }

  function minkReadout(m) {
    if (!dom.minkReadout) return;
    var L = VF.Mink.boostMatrix(m.phi);
    var html = '<div class="ro-line"><span>β = v/c</span><b>' + fmt(m.beta) + '</b><span>γ</span><b>' + fmt(m.gamma) + '</b></div>';
    html += '<div class="ro-line"><span>rapidity φ</span><b>' + fmt(m.phi) + '</b><span>βγ = sinh φ</span><b>' + fmt(m.sinh) + '</b></div>';
    html += '<div class="ro-sub">Boost Λ = exp(φK) &nbsp; acting on (ct, x)ᵀ</div>' +
      '<table class="mat-out"><tr><td>' + fmt(L[0][0]) + '</td><td>' + fmt(L[0][1]) + '</td></tr>' +
      '<tr><td>' + fmt(L[1][0]) + '</td><td>' + fmt(L[1][1]) + '</td></tr></table>';
    html += '<div class="hint-good">A boost is a <b>hyperbolic rotation</b>: the same exp-of-a-generator as the Matrix lab’s R = exp(θK), but K is symmetric and cos/sin become cosh/sinh. It keeps <b>s² = (ct)² − x²</b> fixed (det Λ = 1). Rapidities <b>add</b>, so velocities compose through tanh.</div>';
    dom.minkReadout.innerHTML = html;
  }

  function toggleMinkPlay() {
    state.minkPlaying = !state.minkPlaying;
    ctl.minkPlay.textContent = state.minkPlaying ? T('❚❚ Pause boost') : T('▶ Animate boost');
    ctl.minkPlay.classList.toggle('active', state.minkPlaying);
  }
  function resetMinkView() {
    state.minkHalf = 6;
    if (ctl.minkRange) { ctl.minkRange.input.value = 6; ctl.minkRange.out.value = fmt(6); }
    renderMinkowskiView();
  }

  /* worldline & event editors (mirror the Custom-points UX) */
  function addMinkWorldline() {
    var b = evalNum(ctl.minkWlIn.value); if (!isFinite(b)) b = 0;
    b = b < -0.99 ? -0.99 : (b > 0.99 ? 0.99 : b);
    state.minkWorldlines.push({ beta: b });
    renderMinkowskiView(); renderMinkWlList();
  }
  function removeMinkWorldline(i) { state.minkWorldlines.splice(i, 1); renderMinkowskiView(); renderMinkWlList(); }
  function renderMinkWlList() {
    if (!ctl.minkWlList) return;
    ctl.minkWlList.innerHTML = '';
    for (var i = 0; i < state.minkWorldlines.length; i++) {
      (function (w, idx) {
        var color = MINK_COLORS[idx % MINK_COLORS.length];
        var sw = mk('span', { 'class': 'pt-swatch', style: 'background:#' + ('000000' + color.toString(16)).slice(-6) });
        var txt = 'β_p = ' + fmt(w.beta) + (w.x0 ? ',  x₀ = ' + fmt(w.x0) : '') + (w.label ? '  (' + w.label + ')' : '');
        var lbl = mk('span', { 'class': 'pt-coord', text: txt });
        var del = mk('button', { 'class': 'pt-del', title: 'delete', text: '×', onclick: function () { removeMinkWorldline(idx); } });
        ctl.minkWlList.appendChild(mk('div', { 'class': 'pt-row' }, [sw, lbl, del]));
      })(state.minkWorldlines[i], i);
    }
  }
  function addMinkEvent() {
    var x = evalNum(ctl.minkEvX.value), ct = evalNum(ctl.minkEvCt.value);
    state.minkEvents.push({ x: isFinite(x) ? x : 0, ct: isFinite(ct) ? ct : 0 });
    renderMinkowskiView();
  }
  function removeMinkEvent(i) { state.minkEvents.splice(i, 1); renderMinkowskiView(); }
  function renderMinkEventList() {
    if (!ctl.minkEvList) return;
    ctl.minkEvList.innerHTML = '';
    for (var i = 0; i < state.minkEvents.length; i++) {
      (function (e, idx) {
        var color = MINK_EVENT_COLORS[idx % MINK_EVENT_COLORS.length];
        var pr = VF.Mink.toPrimed(e.x, e.ct, clampBeta(state.minkBeta)), s2 = VF.Mink.interval(e.x, e.ct);
        var kind = s2 > 1e-9 ? 'timelike (s² > 0)' : (s2 < -1e-9 ? 'spacelike (s² < 0)' : 'lightlike (s² = 0)');
        var sw = mk('span', { 'class': 'pt-swatch', style: 'background:#' + ('000000' + color.toString(16)).slice(-6) });
        var lbl = mk('span', { 'class': 'pt-coord', title: kind + ',  s² = ' + fmt(s2),
          text: (e.label ? e.label + ':  ' : '') + '(' + fmt(e.x) + ', ' + fmt(e.ct) + ') → (' + fmt(pr.x) + ', ' + fmt(pr.ct) + ')' });
        var del = mk('button', { 'class': 'pt-del', title: 'delete', text: '×', onclick: function () { removeMinkEvent(idx); } });
        ctl.minkEvList.appendChild(mk('div', { 'class': 'pt-row' }, [sw, lbl, del]));
      })(state.minkEvents[i], i);
    }
  }
  function refreshMinkInputs() { renderMinkWlList(); renderMinkEventList(); }

  function syncMinkToggles() {
    var keys = ['minkShowPrimed', 'minkShowLight', 'minkShowCone', 'minkShowHyper', 'minkShowSimul', 'minkShowGrid'];
    for (var i = 0; i < keys.length; i++) { var el = ctl.minkChkInputs[keys[i]]; if (el) el.checked = state[keys[i]]; }
  }
  function applyMinkPreset(p) {
    state.minkBeta = p.beta;
    if (ctl.minkBetaSlider) { ctl.minkBetaSlider.value = p.beta; ctl.minkBetaVal.value = fmt(p.beta); }
    if (p.half) { state.minkHalf = p.half; if (ctl.minkRange) { ctl.minkRange.input.value = p.half; ctl.minkRange.out.value = fmt(p.half); } }
    var s = p.show || {};
    state.minkShowPrimed = !!s.primed; state.minkShowLight = s.light !== false; state.minkShowCone = !!s.cone;
    state.minkShowHyper = !!s.hyper; state.minkShowSimul = !!s.simul; state.minkShowGrid = !!s.grid;
    state.minkWorldlines = (p.wl || []).map(function (w) { return { beta: w.beta, x0: w.x0, label: w.label }; });
    state.minkEvents = (p.ev || []).map(function (e) { return { x: e.x, ct: e.ct, label: e.label }; });
    state.minkPaths = (p.paths || []).map(function (pa) { return { pts: pa.pts.map(function (q) { return q.slice(); }), label: pa.label, color: pa.color }; });
    if (ctl.minkPresetDesc) ctl.minkPresetDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    syncMinkToggles();
    renderMinkowskiView(); renderMinkWlList();
  }

  function buildMinkowskiPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('A Lorentz boost is a hyperbolic rotation: the pseudo-Euclidean sibling of the Matrix lab’s R = exp(θK). Time runs up (ct), space across (x), light at 45°. Drag the frame velocity β and watch the moving frame’s ct′, x′ axes scissor toward the light cone.') }));

    panel.appendChild(sectionTitle('Reference-frame velocity  β'));
    var bs = sliderCtl(-0.95, 0.95, 0.01, state.minkBeta, function (v) { state.minkBeta = v; renderMinkowskiView(); });
    ctl.minkBetaSlider = bs.input; ctl.minkBetaVal = bs.out;
    panel.appendChild(field('β = v/c', bs.node, '0 = lab frame'));
    ctl.minkPlay = button('▶ Animate boost', 'wide', function () { toggleMinkPlay(); });
    panel.appendChild(ctl.minkPlay);
    var msp = sliderCtl(0.2, 2.5, 0.1, state.minkSpeed, function (v) { state.minkSpeed = v; });
    panel.appendChild(field('animation speed', msp.node));

    panel.appendChild(sectionTitle('Show'));
    ctl.minkChkInputs = {};
    function minkChk(key, labelText) {
      var node = checkbox(labelText, state[key], function (v) { state[key] = v; renderMinkowskiView(); });
      ctl.minkChkInputs[key] = node.querySelector('input');
      return field('', node);
    }
    panel.appendChild(minkChk('minkShowPrimed', 'Moving-frame axes  ct′, x′'));
    panel.appendChild(minkChk('minkShowLight', 'Light cone (45° lines)'));
    panel.appendChild(minkChk('minkShowCone', 'Causal shading (future / past)'));
    panel.appendChild(minkChk('minkShowHyper', 'Calibration hyperbolae  s² = ±k²'));
    panel.appendChild(minkChk('minkShowSimul', 'Lines of simultaneity  ct′ = const'));
    panel.appendChild(minkChk('minkShowGrid', 'Lab coordinate grid'));

    panel.appendChild(sectionTitle('View'));
    ctl.minkRange = sliderCtl(3, 12, 1, state.minkHalf, function (v) { state.minkHalf = Math.round(v); renderMinkowskiView(); });
    panel.appendChild(field('Range (half-span)', ctl.minkRange.node));

    panel.appendChild(sectionTitle('Scenarios'));
    var pbox = mk('div', { 'class': 'presets' });
    MINK_PRESETS.forEach(function (p) { pbox.appendChild(button(p.name, 'preset', function () { applyMinkPreset(p); })); });
    panel.appendChild(pbox);
    ctl.minkPresetDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.minkPresetDesc);

    panel.appendChild(sectionTitle('Worldlines'));
    panel.appendChild(mk('div', { 'class': 'muted small', text: 'A constant-velocity particle through the origin. β_p = 0 is at rest (vertical); |β_p| → 1 approaches a light ray (45°).' }));
    ctl.minkWlIn = mk('input', { type: 'text', 'class': 'mcell', value: '0.5', title: 'particle velocity β_p', placeholder: 'β_p' });
    ctl.minkWlIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') addMinkWorldline(); });
    panel.appendChild(mk('div', { 'class': 'point-add' }, [ctl.minkWlIn, button('Add', 'point-add-btn', addMinkWorldline)]));
    ctl.minkWlList = mk('div', { 'class': 'points-list' });
    panel.appendChild(ctl.minkWlList);

    panel.appendChild(sectionTitle('Events'));
    panel.appendChild(mk('div', { 'class': 'muted small', text: 'A point (x, ct) in spacetime. Each row shows its moving-frame coordinates (x′, ct′) and the invariant interval s² (hover for the causal type).' }));
    ctl.minkEvX = mk('input', { type: 'text', 'class': 'mcell', value: '1', title: 'x: space', placeholder: 'x' });
    ctl.minkEvCt = mk('input', { type: 'text', 'class': 'mcell', value: '2', title: 'ct: time', placeholder: 'ct' });
    function evEnter(e) { if (e.key === 'Enter') addMinkEvent(); }
    ctl.minkEvX.addEventListener('keydown', evEnter); ctl.minkEvCt.addEventListener('keydown', evEnter);
    panel.appendChild(mk('div', { 'class': 'point-add' }, [ctl.minkEvX, ctl.minkEvCt, button('Add', 'point-add-btn', addMinkEvent)]));
    ctl.minkEvList = mk('div', { 'class': 'points-list' });
    panel.appendChild(ctl.minkEvList);

    panel.appendChild(sectionTitle('Readout'));
    ctl.minkReadout = mk('div', { 'class': 'readout' });
    dom.minkReadout = ctl.minkReadout;
    panel.appendChild(ctl.minkReadout);
    return panel;
  }


  K.lab({
    key: 'minkowski', label: 'Minkowski', flat: true, panel: buildMinkowskiPanel,
    refresh: refreshMinkInputs,
    enter: function () { viz._render2D = renderMinkowskiView; renderMinkowskiView(); },
    togglePlay: toggleMinkPlay,
    resetView: resetMinkView,
    frame: function () {
      if (!state.minkPlaying) return;
      /* oscillate the RAPIDITY (not β) so the motion eases naturally near the light cone */
      state.minkPhase += state.minkSpeed * 2 * Math.PI / 60 / 3.5;   /* ≈ 3.5 s per swing at speed 1 */
      var mb = VF.Mink.betaOf(MINK_PHI_MAX * Math.sin(state.minkPhase));
      state.minkBeta = mb;
      animSync(ctl.minkBetaSlider, ctl.minkBetaVal, mb);
      renderMinkowskiView();
    }
  });

})(window.VF = window.VF || {});
