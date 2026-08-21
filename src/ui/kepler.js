/* =============================================================================
 * ui/kepler.js: the Kepler lab: central-force orbits F = −k r̂/rᵖ, the
 * Laplace–Runge–Lenz vector and perihelion precession
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, button = K.button, setFormula = K.setFormula, setStats = K.setStats, syncSlider = K.syncSlider;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  KEPLER: central-force orbits                                            */
  /* ======================================================================== */
  var KP_PRESETS = [
    { name: 'circular', p: 2, r0: 2, vf: 1.0 },
    { name: 'ellipse', p: 2, r0: 2, vf: 0.74 },
    { name: 'near-parabolic', p: 2, r0: 2, vf: 1.38 },
    { name: 'hyperbolic flyby', p: 2, r0: 2, vf: 1.7 },
    { name: 'precessing (p = 2.3) ▶', p: 2.3, r0: 2, vf: 0.8 }
  ];
  function keplerInit() {
    cur.kepler = { s: { x: state.kpR0, y: 0, vx: 0, vy: state.kpV0 }, trail: [[state.kpR0, 0]], t: 0, maxR: state.kpR0, A0: null };
    var inv = VF.Kepler.invariants(state.kpK, state.kpP, cur.kepler.s);
    cur.kepler.A0 = Math.atan2(inv.Ay, inv.Ax);
    renderKepler();
  }
  function renderKepler() {
    if (state.mode !== 'kepler') return;
    viz.set2DRange(6.2);
    var kp = cur.kepler;
    if (!kp) { keplerInit(); return; }
    var inv = VF.Kepler.invariants(state.kpK, state.kpP, kp.s);
    if (state.kpView === 'orbit') {
      var Rv = Math.max(3, kp.maxR * 1.25), curves = [], markers = [], arrows = [];
      curves.push({ pts: kp.trail, color: 0x4cc9f0, op: 0.9 });
      markers.push({ x: 0, y: 0, color: 0xffd166, r: 0.03 });
      markers.push({ x: kp.s.x, y: kp.s.y, color: 0x4cc9f0, r: 0.02 });
      var vsc = Rv * 0.16 / (Math.sqrt(kp.s.vx * kp.s.vx + kp.s.vy * kp.s.vy) || 1);
      arrows.push({ x0: kp.s.x, y0: kp.s.y, x1: kp.s.x + kp.s.vx * vsc, y1: kp.s.y + kp.s.vy * vsc, color: 0x63e6a0, op: 0.95 });
      if (state.kpP === 2 && inv.Amag > 1e-9)
        arrows.push({ x0: 0, y0: 0, x1: inv.Ax / state.kpK * Rv * 0.45, y1: inv.Ay / state.kpK * Rv * 0.45, color: 0xff5cc8, op: 0.9 });
      viz.render2D({ xr: [-Rv, Rv], yr: [-Rv, Rv], xlabel: 'x', ylabel: 'y', curves: curves, markers: markers, arrows: arrows });
    } else {
      var rmax = Math.max(6, kp.maxR * 1.6), NV = 240, vp = [], i, vmin = Infinity, vmax = -Infinity;
      for (i = 1; i <= NV; i++) {
        var rr = rmax * i / NV, vv = VF.Kepler.veff(state.kpK, state.kpP, inv.L, rr);
        vp.push([rr, vv]);
        if (rr > 0.2 && isFinite(vv)) { if (vv < vmin) vmin = vv; if (vv > vmax) vmax = vv; }
      }
      var lo = Math.min(vmin, inv.E) - 0.1, hi = Math.max(0.2, inv.E + 0.3, vmax * 0.3);
      viz.render2D({
        xr: [0, rmax], yr: [lo, hi], xlabel: 'r', ylabel: 'V_eff',
        curves: [{ pts: vp, color: 0x4cc9f0, op: 0.95 }],
        hlines: [{ y: inv.E, color: 0xffd166, op: 0.8, label: 'E' }],
        markers: [{ x: inv.r, y: VF.Kepler.veff(state.kpK, state.kpP, inv.L, inv.r), color: 0xff5cc8, r: 0.018 }]
      });
    }
    setFormula('F = −k r̂ / r<sup>' + fmt(state.kpP) + '</sup> &nbsp;·&nbsp; V_eff = L²/2r² + V(r)');
    setStats('E = ' + fmt(inv.E) + ' · L = ' + fmt(inv.L) +
      (inv.a ? ' · a = ' + fmt(inv.a) + ' · e = ' + fmt(inv.e) + ' · T = ' + fmt(inv.T) : (inv.e != null ? ' · e = ' + fmt(inv.e) : '')) +
      ' · t = ' + fmt(kp.t));
    keplerReadout(inv);
  }
  function keplerReadout(inv) {
    if (!dom.kpReadout || !cur.kepler) return;
    var kp = cur.kepler, html = '';
    html += '<div class="ro-line"><span>E</span><b>' + fmt(inv.E) + '</b><span>L</span><b>' + fmt(inv.L) + '</b></div>';
    if (state.kpP === 2) {
      html += '<div class="ro-sub">' + T('Laplace–Runge–Lenz vector (magenta, points to the perihelion)') + '</div>';
      html += '<div class="ro-vec">A = (' + fmt(inv.Ax) + ', ' + fmt(inv.Ay) + ') &nbsp;·&nbsp; e = |A|/k = ' + fmt(inv.Amag / state.kpK) + '</div>';
      if (inv.a) html += '<div class="hint-good">' + T('Kepler’s laws: 1) an ellipse with the force centre in one focus (e = ') + fmt(inv.e) + T('); 2) dA/dt = L/2 = ') + fmt(inv.L / 2) + T(', constant, equal areas in equal times; 3) T² = 4π²a³/k, here T = ') + fmt(inv.T) + '.</div>';
      else html += '<div class="muted small">' + T('E ≥ 0: an unbound orbit (parabola / hyperbola), the flyby of a comet.') + '</div>';
    } else {
      var Anow = Math.atan2(inv.Ay, inv.Ax), dphi = Anow - kp.A0;
      html += '<div class="hint-bad">' + T('p ≠ 2: the LRL vector is NOT conserved; the perihelion precesses (rosette orbit). Only 1/r² and the harmonic force close every bound orbit (Bertrand’s theorem).') + '</div>';
      html += '<div class="ro-line"><span>' + T('perihelion advance') + '</span><b>' + fmt(dphi) + ' rad</b></div>';
    }
    html += '<div class="muted small">' + T('Kepler’s 2nd law holds for EVERY central force (it is conservation of L); the 1st and 3rd are special to 1/r². Switch to the V_eff view to read the turning points where E = V_eff.') + '</div>';
    dom.kpReadout.innerHTML = html;
  }
  function toggleKeplerPlay() { state.kpPlaying = !state.kpPlaying; ctl.kpPlay.textContent = state.kpPlaying ? T('❚❚ Pause') : T('▶ Orbit'); ctl.kpPlay.classList.toggle('active', state.kpPlaying); }
  function buildKeplerPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('A planet (m = 1) under the central force F = −k r̂/r^p. For p = 2 the orbit is a closed conic and the Laplace–Runge–Lenz vector freezes the perihelion; nudge p away from 2 and the ellipse starts to precess. Bertrand’s theorem, live.') }));
    panel.appendChild(sectionTitle('Force & start'));
    ctl.kpKS = sliderCtl(0.3, 3, 0.05, state.kpK, function (v) { state.kpK = v; keplerInit(); });
    panel.appendChild(field('strength k', ctl.kpKS.node));
    ctl.kpPS = sliderCtl(1.5, 3, 0.05, state.kpP, function (v) { state.kpP = v; keplerInit(); });
    panel.appendChild(field('exponent p', ctl.kpPS.node, 'p = 2: gravity'));
    ctl.kpR0S = sliderCtl(0.5, 5, 0.05, state.kpR0, function (v) { state.kpR0 = v; keplerInit(); });
    panel.appendChild(field('start radius r₀', ctl.kpR0S.node));
    ctl.kpV0S = sliderCtl(0.05, 2.5, 0.01, state.kpV0, function (v) { state.kpV0 = v; keplerInit(); });
    panel.appendChild(field('start speed v₀ (tangential)', ctl.kpV0S.node));
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    KP_PRESETS.forEach(function (p) {
      pb.appendChild(button(p.name, 'preset', function () {
        state.kpP = p.p; state.kpR0 = p.r0;
        state.kpV0 = p.vf * Math.sqrt(state.kpK / p.r0);
        syncSlider(ctl.kpPS, p.p); syncSlider(ctl.kpR0S, p.r0); syncSlider(ctl.kpV0S, state.kpV0);
        keplerInit();
      }));
    });
    panel.appendChild(pb);
    ctl.kpPlay = button('▶ Orbit', 'wide', toggleKeplerPlay);
    panel.appendChild(ctl.kpPlay);
    var sp4 = sliderCtl(0.1, 4, 0.1, state.kpSpeed, function (v) { state.kpSpeed = v; });
    panel.appendChild(field('speed', sp4.node));
    ctl.kpViewSel = select([{ v: 'orbit', label: 'orbit (x, y)' }, { v: 'veff', label: 'effective potential V_eff(r)' }],
      state.kpView, function (v) { state.kpView = v; renderKepler(); });
    panel.appendChild(field('View', ctl.kpViewSel));
    panel.appendChild(sectionTitle('Readout'));
    ctl.kpReadout = mk('div', { 'class': 'readout' });
    dom.kpReadout = ctl.kpReadout;
    panel.appendChild(ctl.kpReadout);
    return panel;
  }


  K.lab({
    key: 'kepler', label: 'Kepler', flat: true, panel: buildKeplerPanel,
    enter: function () { viz._render2D = renderKepler; if (cur.kepler) renderKepler(); else keplerInit(); },
    togglePlay: toggleKeplerPlay,
    frame: function () {
      if (!(state.kpPlaying && cur.kepler)) return;
      var kpq = cur.kepler, kq;
      for (kq = 0; kq < 4; kq++) {
        var rr5 = Math.sqrt(kpq.s.x * kpq.s.x + kpq.s.y * kpq.s.y);
        var dt5 = state.kpSpeed * 0.006 * Math.max(0.15, Math.min(1, rr5));
        kpq.s = VF.Kepler.step(state.kpK, state.kpP, kpq.s, dt5);
        kpq.t += dt5;
      }
      kpq.trail.push([kpq.s.x, kpq.s.y]);
      if (kpq.trail.length > 2600) kpq.trail.shift();
      var rn5 = Math.sqrt(kpq.s.x * kpq.s.x + kpq.s.y * kpq.s.y);
      if (rn5 > kpq.maxR) kpq.maxR = rn5;
      if (rn5 > 60) state.kpPlaying = false;          /* escaped far beyond view */
      renderKepler();
    }
  });

})(window.VF = window.VF || {});
