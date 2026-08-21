/* =============================================================================
 * ui/phase.js: the Phase lab: 1-DOF dynamics ẋ = v, v̇ = a(x, v, t),
 * direction field, energy contours and fixed-point classification
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var checkbox = K.checkbox, button = K.button, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats, markInput = K.markInput;
  var esc = K.esc, exprInput = K.exprInput, isLight = K.isLight, pcompile = K.pcompile, syncSlider = K.syncSlider;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  PHASE SPACE: 1-DOF dynamics  ẋ = v,  v̇ = a(x, v, t)                     */
  /* ======================================================================== */
  function fpColor(type) { return type === 'saddle' ? 0xff6b6b : type === 'center' ? 0x63e6a0 : type.indexOf('stable') === 0 ? 0x6ba6ff : 0xffb454; }
  var PHASE_PRESETS = [
    { name: 'harmonic', a: '-x', xr: 4, vr: 4, energy: true, x0: 3, v0: 0, desc: 'Simple oscillator ẍ = −x. Closed ellipses around a centre: energy is conserved.' },
    { name: 'pendulum', a: '-sin(x)', xr: 9.4, vr: 3.2, energy: true, x0: 0, v0: 2.4, desc: 'ẍ = −sin x. Centres (swinging) inside the separatrix; above it the pendulum goes over the top (rotation). Saddles at (±π, 0).' },
    { name: 'damped pendulum', a: '-sin(x) - 0.3*v', xr: 9.4, vr: 3.2, energy: false, x0: 0, v0: 3, desc: 'Add friction −0.3v: the centres become stable spirals; every orbit winds down to rest.' },
    { name: 'driven pendulum', a: '-sin(x) - 0.2*v + 1.2*cos(0.7*t)', xr: 9.4, vr: 3.6, energy: false, x0: 0, v0: 0, desc: 'Damped + periodic forcing. Press ▶: the field breathes with t and the motion can become chaotic.' },
    { name: 'double well', a: 'x - x^3', xr: 2.6, vr: 2.2, energy: true, x0: 0, v0: 0.3, desc: 'ẍ = x − x³ (Duffing). Two centres at x = ±1 and a saddle at 0: the figure-eight separatrix.' },
    { name: 'van der Pol', a: '2*(1 - x^2)*v - x', xr: 4, vr: 5, energy: false, x0: 0.1, v0: 0, desc: 'A self-sustaining oscillator: every trajectory spirals onto one limit cycle.' },
    { name: 'anharmonic', a: '-x^3', xr: 3, vr: 3.5, energy: true, x0: 2, v0: 0, desc: 'Purely quartic well ẍ = −x³: nonlinear, amplitude-dependent period.' },
    { name: 'damped SHO', a: '-x - 0.35*v', xr: 4, vr: 4, energy: false, x0: 3.5, v0: 0, desc: 'ẍ = −x − 0.35 v: a stable spiral (under-damped decay to the origin).' }
  ];
  function phaseCompile() {
    var c = pcompile(state.dynA);
    markInput(ctl.dynA, c.ok);
    if (!c.ok) { setError('a(x,v): ' + c.err); cur.phase = null; return false; }
    setError(null);
    cur.phase = { ok: true, acc: function (x, v, t) { return c.fn(x, v, 0, t); } };
    phaseResetLive();
    return true;
  }
  /* the animated particle is integrated LIVE with RK4: the true time evolution,
     which matters for driven (time-dependent) systems where any precomputed
     frozen-t curve would be wrong */
  function phaseResetLive() {
    if (cur.phase) cur.phase.live = { x: state.dynX0, v: state.dynV0, tau: state.dynT, trail: [[state.dynX0, state.dynV0]] };
  }
  /* NaN-gap points outside the plot box so lines don't overdraw the margins */
  function clipPhase(pts, Xr, Vr) {
    var out = [], i;
    for (i = 0; i < pts.length; i++) { var p = pts[i]; out.push((p && Math.abs(p[0]) <= Xr * 1.001 && Math.abs(p[1]) <= Vr * 1.001) ? p : [NaN, NaN]); }
    return out;
  }
  function phaseParse() { if (state.mode !== 'phase') return; if (phaseCompile()) renderPhaseView(); }
  var phaseTimer = null;
  function requestPhase() { if (phaseTimer) clearTimeout(phaseTimer); phaseTimer = setTimeout(phaseParse, 240); }

  function renderPhaseView() {
    if (state.mode !== 'phase' || !cur.phase || !cur.phase.ok) return;
    var acc = cur.phase.acc, Xr = state.dynXr, Vr = state.dynVr, t = state.dynT, i;
    var curves = [], arrows = [], markers = [], hlines = [];
    var faintArrow = isLight() ? 0xa9b4c8 : 0x3a4661;
    if (state.dynShowField) {
      var nx = 15, nv = 11, fld = VF.Dyn.field(acc, -Xr, Xr, -Vr, Vr, nx, nv, t);
      var alen = Math.min(2 * Xr / nx, 2 * Vr / nv) * 0.5;
      for (i = 0; i < fld.pos.length; i++) { var po = fld.pos[i], ve = fld.vec[i], m = fld.mag[i] || 1e-9; arrows.push({ x0: po[0], y0: po[1], x1: po[0] + ve[0] / m * alen, y1: po[1] + ve[1] / m * alen, color: faintArrow, op: 0.75 }); }
    }
    if (state.dynShowEnergy) {
      var ec0 = VF.Dyn.energyCurves(acc, -Xr, Xr, []), Um = Infinity, UM = -Infinity;
      for (i = 0; i < ec0.U.length; i++) { if (ec0.U[i] < Um) Um = ec0.U[i]; if (ec0.U[i] > UM) UM = ec0.U[i]; }
      var Etop = Um + 0.5 * Vr * Vr * 1.05, lv = [], ne = 9;
      for (i = 1; i <= ne; i++) lv.push(Um + (Etop - Um) * i / (ne + 1));
      lv.push(UM + 1e-3);   /* a contour near the separatrix */
      var ec = VF.Dyn.energyCurves(acc, -Xr, Xr, lv);
      for (i = 0; i < ec.curves.length; i++) curves.push({ pts: clipPhase(ec.curves[i], Xr, Vr), color: isLight() ? 0xc0846f : 0x8a6f5b, op: 0.55 });
    }
    if (state.dynShowTraj) {
      var seeds = [], gx = 5, gv = 3, a2, b2;
      for (b2 = 0; b2 < gv; b2++) for (a2 = 0; a2 < gx; a2++) seeds.push([-Xr * 0.8 + 1.6 * Xr * a2 / (gx - 1), -Vr * 0.7 + 1.4 * Vr * b2 / (gv - 1)]);
      for (i = 0; i < seeds.length; i++) { var tf = VF.Dyn.trajectory(acc, seeds[i][0], seeds[i][1], 0.02, 700, t), tb = VF.Dyn.trajectory(acc, seeds[i][0], seeds[i][1], -0.02, 700, t); curves.push({ pts: clipPhase(tb.reverse().concat(tf), Xr, Vr), color: isLight() ? 0xb9c2d4 : 0x40506e, op: 0.5 }); }
    }
    /* orbit through the IC: exact for autonomous systems; for a driven system the
       frozen-t curve would be misleading, so there the live trail tells the story */
    var driven = /\bt\b/.test(state.dynA);
    if (!driven) {
      var trajF = VF.Dyn.trajectory(acc, state.dynX0, state.dynV0, 0.02, 1600, t);
      var trajB = VF.Dyn.trajectory(acc, state.dynX0, state.dynV0, -0.02, 1600, t);
      curves.push({ pts: clipPhase(trajB.reverse().concat(trajF), Xr, Vr), color: 0x4cc9f0, op: 0.95 });
    }
    markers.push({ x: state.dynX0, y: state.dynV0, color: 0xffe066, r: 0.02 });
    var live = cur.phase.live;
    if (live && live.trail.length > 1) curves.push({ pts: clipPhase(live.trail, Xr, Vr), color: 0xff5cc8, op: 0.95 });
    if (live && state.dynPlaying) markers.push({ x: live.x, y: live.v, color: 0xff5cc8, r: 0.022 });
    var fps = [];
    if (state.dynShowFixed) { fps = VF.Dyn.fixedPoints(acc, -Xr, Xr, t); for (i = 0; i < fps.length; i++) markers.push({ x: fps[i].x, y: 0, color: fpColor(fps[i].type), r: 0.024 }); }
    viz.set2DRange(6.2);
    viz.render2D({ xr: [-Xr, Xr], yr: [-Vr, Vr], xlabel: 'x', ylabel: 'v', curves: curves, arrows: arrows, markers: markers, hlines: hlines });
    setFormula('Phase space &nbsp; ẋ = v, &nbsp; v̇ = <b>' + esc(state.dynA) + '</b>');
    setStats('(x, v) plane · ' + fps.length + ' fixed point(s)' + (driven ? ' · t = ' + fmt(t) + ' (driven)' : ''));
    phaseReadout(fps);
  }
  function phaseReadout(fps) {
    if (!dom.phaseReadout) return;
    var html = '<div class="ro-sub">' + T('Fixed points  (v̇ = 0, v = 0)') + '</div>';
    if (!fps.length) html += '<div class="muted small">' + T('none in view') + '</div>';
    else { html += '<table class="eig">'; for (var i = 0; i < fps.length; i++) html += '<tr><td class="lam">x = ' + fmt(fps[i].x) + '</td><td class="vec"><span style="color:#' + ('000000' + fpColor(fps[i].type).toString(16)).slice(-6) + '">' + T(fps[i].type) + '</span></td></tr>'; html += '</table>'; }
    html += '<div class="muted small">' + T('Arrows show the flow (ẋ, v̇). <b>Centres</b> (green) are ringed by closed orbits; <b>saddles</b> (red) send the separatrix; <b>spirals/nodes</b> (blue = stable, orange = unstable) wind in or out. Set the yellow start point and press ▶: the magenta trail is the particle integrated live (RK4), so it is the true evolution even when the system is driven.') + '</div>';
    dom.phaseReadout.innerHTML = html;
  }
  function buildPhasePanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('A 1-degree-of-freedom system is a flow on the phase plane (x, v): ẋ = v, v̇ = a(x, v, t). Type the acceleration a using x, the velocity v and time t. Trajectories, fixed points and (for a conservative force) energy contours are drawn live.') }));
    panel.appendChild(sectionTitle('Acceleration  a(x, v, t)'));
    ctl.dynA = exprInput(state.dynA, function (v) { state.dynA = v; requestPhase(); }, function () { if (phaseTimer) clearTimeout(phaseTimer); phaseParse(); });
    panel.appendChild(field('v̇ = a', ctl.dynA, 'use x, v, t'));
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    PHASE_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { applyPhasePreset(p); })); });
    panel.appendChild(pb);
    ctl.dynDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.dynDesc);

    panel.appendChild(sectionTitle('Initial condition'));
    ctl.dynPlay = button('▶ Launch trajectory', 'wide', function () { togglePhasePlay(); });
    panel.appendChild(ctl.dynPlay);
    ctl.dynX0S = sliderCtl(-10, 10, 0.05, state.dynX0, function (v) { state.dynX0 = v; phaseResetLive(); renderPhaseView(); });
    panel.appendChild(field('x₀', ctl.dynX0S.node));
    ctl.dynV0S = sliderCtl(-8, 8, 0.05, state.dynV0, function (v) { state.dynV0 = v; phaseResetLive(); renderPhaseView(); });
    panel.appendChild(field('v₀', ctl.dynV0S.node));
    var dsp = sliderCtl(0.2, 3, 0.1, state.dynSpeed, function (v) { state.dynSpeed = v; });
    panel.appendChild(field('speed', dsp.node));

    panel.appendChild(sectionTitle('Show'));
    ctl.dynChkInputs = {};
    function dchk(key, lbl) { var node = checkbox(lbl, state[key], function (v) { state[key] = v; renderPhaseView(); }); ctl.dynChkInputs[key] = node.querySelector('input'); return field('', node); }
    panel.appendChild(dchk('dynShowField', 'Direction field (arrows)'));
    panel.appendChild(dchk('dynShowEnergy', 'Energy contours (conservative)'));
    panel.appendChild(dchk('dynShowTraj', 'Sample trajectories'));
    panel.appendChild(dchk('dynShowFixed', 'Fixed points'));

    panel.appendChild(sectionTitle('Range'));
    ctl.dynXrS = sliderCtl(1, 12, 0.1, state.dynXr, function (v) { state.dynXr = v; renderPhaseView(); });
    panel.appendChild(field('x range ±', ctl.dynXrS.node));
    ctl.dynVrS = sliderCtl(1, 10, 0.1, state.dynVr, function (v) { state.dynVr = v; renderPhaseView(); });
    panel.appendChild(field('v range ±', ctl.dynVrS.node));

    panel.appendChild(sectionTitle('Analysis'));
    ctl.phaseReadout = mk('div', { 'class': 'readout' });
    dom.phaseReadout = ctl.phaseReadout;
    panel.appendChild(ctl.phaseReadout);
    return panel;
  }
  function applyPhasePreset(p) {
    state.dynA = p.a; ctl.dynA.value = p.a;
    state.dynXr = p.xr; syncSlider(ctl.dynXrS, p.xr);
    state.dynVr = p.vr; syncSlider(ctl.dynVrS, p.vr);
    state.dynShowEnergy = !!p.energy;
    state.dynX0 = p.x0; syncSlider(ctl.dynX0S, p.x0);
    state.dynV0 = p.v0; syncSlider(ctl.dynV0S, p.v0);
    state.dynT = 0;
    if (ctl.dynChkInputs.dynShowEnergy) ctl.dynChkInputs.dynShowEnergy.checked = state.dynShowEnergy;
    if (ctl.dynDesc) ctl.dynDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    phaseParse();
  }
  function togglePhasePlay() {
    state.dynPlaying = !state.dynPlaying;
    if (state.dynPlaying) phaseResetLive();
    ctl.dynPlay.textContent = state.dynPlaying ? T('❚❚ Pause') : T('▶ Launch trajectory');
    ctl.dynPlay.classList.toggle('active', state.dynPlaying);
    renderPhaseView();
  }


  K.lab({
    key: 'phase', label: 'Phase', flat: true, panel: buildPhasePanel,
    enter: function () { viz._render2D = renderPhaseView; phaseParse(); },
    togglePlay: togglePhasePlay,
    frame: function () {
      if (!(state.dynPlaying && cur.phase && cur.phase.ok && cur.phase.live)) return;
      /* advance the real particle: 2 RK4 substeps per frame → 1 time-unit/s at speed 1 */
      var lv = cur.phase.live, hph = state.dynSpeed / 120;
      for (var ph = 0; ph < 2; ph++) { var sph = VF.Dyn.rk4(cur.phase.acc, lv.x, lv.v, lv.tau, hph); lv.x = sph[0]; lv.v = sph[1]; lv.tau += hph; }
      if (!isFinite(lv.x) || !isFinite(lv.v) || Math.abs(lv.x) > 1e4 || Math.abs(lv.v) > 1e4) phaseResetLive();
      else { lv.trail.push([lv.x, lv.v]); if (lv.trail.length > 1500) lv.trail.shift(); }
      state.dynT = lv.tau;                       /* the field's clock = the particle's clock */
      renderPhaseView();
    }
  });

})(window.VF = window.VF || {});
