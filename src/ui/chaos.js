/* =============================================================================
 * ui/chaos.js: the Chaos lab: the double pendulum, twin trajectories
 * diverging exponentially, and the Poincaré section
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, checkbox = K.checkbox, button = K.button, setFormula = K.setFormula, setStats = K.setStats, lab = K.lab;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  CHAOS: the double pendulum                                              */
  /* ======================================================================== */
  var DP_PARAMS = { m1: 1, m2: 1, l1: 1, l2: 1, g: 1 };
  function chaosInit() {
    var s = [state.dpTh1, 0, state.dpTh2, 0];
    cur.dpend = { s: s, s2: [s[0] + 1e-3, 0, s[2], 0], trail: [], poinc: [], t: 0, E0: VF.Dpend.energy(DP_PARAMS, s), prev1: s[0] };
    renderChaos();
  }
  function renderChaos() {
    if (state.mode !== 'chaos') return;
    viz.set2DRange(6.2);
    var dp = cur.dpend;
    if (!dp) { chaosInit(); return; }
    if (state.dpView === 'pend') {
      var t1 = VF.Dpend.tips(DP_PARAMS, dp.s), Rv = (DP_PARAMS.l1 + DP_PARAMS.l2) * 1.18;
      var curves = [], markers = [];
      if (dp.trail.length > 1) curves.push({ pts: dp.trail, color: 0xffd166, op: 0.55 });
      if (state.dpTwin) {
        var t2 = VF.Dpend.tips(DP_PARAMS, dp.s2);
        curves.push({ pts: [[0, 0], [t2.x1, t2.y1], [t2.x2, t2.y2]], color: 0xff5cc8, op: 0.8 });
        markers.push({ x: t2.x2, y: t2.y2, color: 0xff5cc8, r: 0.018 });
      }
      curves.push({ pts: [[0, 0], [t1.x1, t1.y1], [t1.x2, t1.y2]], color: 0x4cc9f0, op: 1 });
      markers.push({ x: t1.x1, y: t1.y1, color: 0x4cc9f0, r: 0.016 });
      markers.push({ x: t1.x2, y: t1.y2, color: 0x4cc9f0, r: 0.02 });
      viz.render2D({ xr: [-Rv, Rv], yr: [-Rv, Rv], xlabel: 'x', ylabel: 'y', curves: curves, markers: markers });
    } else {
      viz.render2D({
        xr: [-Math.PI, Math.PI], yr: [-4, 4], xlabel: 'θ₂', ylabel: 'ω₂',
        dots: [{ pts: dp.poinc, color: 0xffd166, size: 3 }]
      });
    }
    setFormula(T('double pendulum') + ' &nbsp;·&nbsp; m = l = g = 1');
    var E = VF.Dpend.energy(DP_PARAMS, dp.s);
    setStats('E = ' + fmt(E) + ' (' + T('drift') + ' ' + fmt(E - dp.E0) + ') · t = ' + fmt(dp.t) +
      (state.dpView === 'poinc' ? ' · ' + dp.poinc.length + ' ' + T('section points') : ''));
    chaosReadout();
  }
  function chaosReadout() {
    if (!dom.dpReadout || !cur.dpend) return;
    var dp = cur.dpend, html = '';
    if (state.dpTwin) {
      var d = VF.Dpend.dist(dp.s, dp.s2);
      html += '<div class="ro-line"><span>' + T('twin separation') + '</span><b>' + fmt(d) + '</b><span>log₁₀</span><b>' + fmt(Math.log(Math.max(d, 1e-12)) / Math.LN10) + '</b></div>';
      html += '<div class="muted small">' + T('The magenta twin starts 0.001 rad away. In the chaotic regime the separation grows EXPONENTIALLY (positive Lyapunov exponent) until it saturates: deterministic, yet unpredictable.') + '</div>';
    }
    html += '<div class="muted small">' + T('Poincaré section: every time pendulum 1 swings through the bottom upward, plot (θ₂, ω₂). Regular motion → closed curves; chaos → a dust that fills area. Energy stays conserved either way.') + '</div>';
    html += '<div class="muted small">' + T('Small angles ⇒ two normal modes with ω² = (2 ∓ √2)·g/l: exactly the Modes lab. Chaos needs the full nonlinearity.') + '</div>';
    dom.dpReadout.innerHTML = html;
  }
  function toggleChaosPlay() { state.dpPlaying = !state.dpPlaying; ctl.dpPlay.textContent = state.dpPlaying ? T('❚❚ Pause') : T('▶ Swing'); ctl.dpPlay.classList.toggle('active', state.dpPlaying); }
  function buildChaosPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('The double pendulum: two rods, four-dimensional phase space, and the simplest mechanical system with real chaos. Watch twin trajectories diverge and the Poincaré section dissolve from closed curves into dust.') }));
    panel.appendChild(sectionTitle('Initial angles'));
    ctl.dpT1S = sliderCtl(-3.14, 3.14, 0.01, state.dpTh1, function (v) { state.dpTh1 = v; chaosInit(); });
    panel.appendChild(field('θ₁(0)', ctl.dpT1S.node));
    ctl.dpT2S = sliderCtl(-3.14, 3.14, 0.01, state.dpTh2, function (v) { state.dpTh2 = v; chaosInit(); });
    panel.appendChild(field('θ₂(0)', ctl.dpT2S.node));
    panel.appendChild(field('', checkbox('Twin trajectory (Δθ₁ = 0.001)', state.dpTwin, function (v) { state.dpTwin = v; renderChaos(); })));
    ctl.dpPlay = button('▶ Swing', 'wide', toggleChaosPlay);
    panel.appendChild(ctl.dpPlay);
    var sp5 = sliderCtl(0.1, 4, 0.1, state.dpSpeed, function (v) { state.dpSpeed = v; });
    panel.appendChild(field('speed', sp5.node));
    panel.appendChild(button('Reset', 'wide', chaosInit));
    ctl.dpViewSel = select([{ v: 'pend', label: 'pendulum' }, { v: 'poinc', label: 'Poincaré section' }],
      state.dpView, function (v) { state.dpView = v; renderChaos(); });
    panel.appendChild(field('View', ctl.dpViewSel));
    panel.appendChild(sectionTitle('Readout'));
    ctl.dpReadout = mk('div', { 'class': 'readout' });
    dom.dpReadout = ctl.dpReadout;
    panel.appendChild(ctl.dpReadout);
    return panel;
  }


  K.lab({
    key: 'chaos', label: 'Chaos', flat: true, panel: buildChaosPanel,
    enter: function () { viz._render2D = renderChaos; if (cur.dpend) renderChaos(); else chaosInit(); },
    togglePlay: toggleChaosPlay,
    frame: function () {
      if (!(state.dpPlaying && cur.dpend)) return;
      var dpq = cur.dpend, cq;
      function wrapA(x) { return Math.atan2(Math.sin(x), Math.cos(x)); }
      for (cq = 0; cq < 6; cq++) {
        var pw = wrapA(dpq.s[0]);
        dpq.s = VF.Dpend.step(DP_PARAMS, dpq.s, state.dpSpeed * 0.004);
        dpq.s2 = VF.Dpend.step(DP_PARAMS, dpq.s2, state.dpSpeed * 0.004);
        dpq.t += state.dpSpeed * 0.004;
        var nw = wrapA(dpq.s[0]);
        if (pw < 0 && nw >= 0 && dpq.s[1] > 0 && dpq.poinc.length < 4000)
          dpq.poinc.push([wrapA(dpq.s[2]), dpq.s[3]]);
      }
      var tp5 = VF.Dpend.tips(DP_PARAMS, dpq.s);
      dpq.trail.push([tp5.x2, tp5.y2]);
      if (dpq.trail.length > 700) dpq.trail.shift();
      renderChaos();
    }
  });

})(window.VF = window.VF || {});
