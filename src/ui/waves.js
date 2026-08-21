/* =============================================================================
 * ui/waves.js: the Waves lab: 1-D PDE evolution by eigenfunction
 * expansion (wave, heat, free Schrödinger), exact in time
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var animSync = K.animSync, select = K.select, checkbox = K.checkbox, button = K.button, setError = K.setError, setFormula = K.setFormula;
  var setStats = K.setStats, markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, isLight = K.isLight, pcompile = K.pcompile;
  var syncSlider = K.syncSlider;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  WAVES: 1-D PDE evolution by eigenfunction expansion                     */
  /* ======================================================================== */
  var WV_PRESETS = [
    { name: 'pluck ▶', u0: 'min(x, 10-x)/3', v0: '0', L: 10, eq: 'wave', desc: 'A plucked string (triangle). Coefficients fall as 1/n²; the kink splits, travels, reflects at the walls and reassembles: d\'Alembert in action.' },
    { name: 'bump ▶', u0: 'exp(-2*(x-3)^2)', v0: '0', L: 10, eq: 'wave', desc: 'A Gaussian bump splits into two half-height waves running left and right: u = ½u₀(x−ct) + ½u₀(x+ct).' },
    { name: 'hammer ▶', u0: '0', v0: '4*exp(-8*(x-5)^2)', L: 10, eq: 'wave', desc: 'A struck string (piano hammer): zero displacement but an initial VELOCITY kick. The energy starts purely kinetic.' },
    { name: 'pure mode', u0: 'sin(3*pi*x/10)', v0: '0', L: 10, eq: 'wave', desc: 'A single eigenmode is a standing wave: the shape never changes, only its amplitude oscillates at ω₃; this is what "mode" means.' },
    { name: 'heat: bump ▶', u0: 'exp(-2*(x-3)^2)', L: 10, eq: 'heat', desc: 'Diffusion: mode n dies at the rate Dkₙ². High harmonics vanish first, so the profile smooths, spreads, then fades as slow n = 1.' },
    { name: 'heat: slab ▶', u0: '(2<x<5)', L: 10, eq: 'heat', desc: 'A hot slab. Sharp edges are made of high modes → they blur almost instantly; the n = 1 mode lingers longest. Watch the spectrum bars die top-down.' },
    { name: 'ψ: same bump ▶', u0: 'exp(-2*(x-3)^2)', L: 10, eq: 'schr', desc: 'The SAME bump under Schrödinger: no mode ever decays (|cₙ| constant); instead the phases rotate at Eₙ ∝ n², so the shape scrambles without losing norm.' }
  ];
  var wvTimer = null;
  function requestWaves() { if (wvTimer) clearTimeout(wvTimer); wvTimer = setTimeout(wavesCompute, 240); }
  function wavesCompute() {
    if (state.mode !== 'waves') return;
    var cu = pcompile(state.wvU0);
    markInput(ctl.wvU0, cu.ok);
    if (!cu.ok) { setError('u₀(x): ' + cu.err); return; }
    var L = state.wvL, N = Math.round(state.wvN), b = null;
    if (state.wvEq === 'wave') {
      var cv = pcompile(state.wvV0);
      markInput(ctl.wvV0, cv.ok);
      if (!cv.ok) { setError('v₀(x): ' + cv.err); return; }
      b = VF.Waves.project(function (x) { return cv.fn(x, 0, 0, 0); }, L, N);
    }
    setError(null);
    var a = VF.Waves.project(function (x) { return cu.fn(x, 0, 0, 0); }, L, N);
    /* vertical scale: sample the true evolution over half a fundamental period
       (covers the "hammer" case, where u ≡ 0 at t = 0 and grows) */
    var ym = 1e-9, amax = 1e-9, i, n, s;
    if (state.wvEq === 'wave') {
      var T1 = 2 * L / state.wvC;
      for (s = 0; s <= 4; s++) {
        var wv = VF.Waves.wave(a, b, state.wvC, L, s * T1 / 8, 160);
        for (i = 0; i < wv.u.length; i++) if (Math.abs(wv.u[i]) > ym) ym = Math.abs(wv.u[i]);
      }
      for (n = 0; n < N; n++) {
        var w1 = state.wvC * (n + 1) * Math.PI / L;
        var am = Math.sqrt(a[n] * a[n] + (b[n] / w1) * (b[n] / w1));
        if (am > amax) amax = am;
      }
    } else {
      var w0 = VF.Waves.heat(a, state.wvD, L, 0, 160);
      for (i = 0; i < w0.u.length; i++) if (Math.abs(w0.u[i]) > ym) ym = Math.abs(w0.u[i]);
      for (n = 0; n < N; n++) if (Math.abs(a[n]) > amax) amax = Math.abs(a[n]);
    }
    var g0 = state.wvEq === 'heat' ? VF.Waves.heat(a, state.wvD, L, 0, 320)
           : state.wvEq === 'schr' ? VF.Waves.schr(a, L, 0, 320)
           : VF.Waves.wave(a, b, state.wvC, L, 0, 320);
    var ghost = [];
    for (i = 0; i < g0.x.length; i++) ghost.push([g0.x[i], state.wvEq === 'schr' ? g0.dens[i] : g0.u[i]]);
    if (state.wvEq === 'schr') { ym = 1e-9; for (i = 0; i < g0.dens.length; i++) if (g0.dens[i] > ym) ym = g0.dens[i]; }
    cur.waves = { a: a, b: b, ghost: ghost, ym: ym * 1.15, amax: amax, E0: null };
    state.wvT = 0;
    renderWavesView();
  }
  function renderWavesView() {
    if (state.mode !== 'waves' || !cur.waves) return;
    var cw = cur.waves, L = state.wvL, t = state.wvT, i, n;
    var curves = [], stats, formula, amps;
    if (state.wvGhost) curves.push({ pts: cw.ghost, color: isLight() ? 0x9aa7bd : 0x59667f, op: 0.5 });
    if (state.wvEq === 'heat') {
      var rh = VF.Waves.heat(cw.a, state.wvD, L, t, 320);
      var hp = []; for (i = 0; i < rh.x.length; i++) hp.push([rh.x[i], rh.u[i]]);
      curves.push({ pts: hp, color: 0xffb454, op: 0.98 });
      amps = rh.amps;
      formula = T('Heat equation &nbsp; u_t = D·u_xx &nbsp;·&nbsp; mode n decays as e^(−Dkₙ²t)');
      stats = 't = ' + fmt(t) + ' · D = ' + fmt(state.wvD) + ' · u_max = ' + fmt(rh.umax);
    } else if (state.wvEq === 'schr') {
      var rs = VF.Waves.schr(cw.a, L, t, 320);
      var dp = [], rp = [];
      for (i = 0; i < rs.x.length; i++) { dp.push([rs.x[i], rs.dens[i]]); rp.push([rs.x[i], rs.re[i]]); }
      curves.push({ pts: rp, color: 0x6ba6ff, op: 0.75 });
      curves.push({ pts: dp, color: 0xff5cc8, op: 0.98 });
      amps = cw.a;
      formula = T('Free Schrödinger &nbsp; iψ_t = −½ψ_xx &nbsp;·&nbsp; cₙ(t) = aₙ e^(−iEₙt), Eₙ = kₙ²/2');
      stats = 't = ' + fmt(t) + ' · ∫|ψ|²dx = ' + fmt(rs.norm) + ' (' + T('conserved') + ') · ' + T('|ψ|² magenta, Re ψ blue');
    } else {
      var rw = VF.Waves.wave(cw.a, cw.b, state.wvC, L, t, 320);
      var wp = []; for (i = 0; i < rw.x.length; i++) wp.push([rw.x[i], rw.u[i]]);
      curves.push({ pts: wp, color: 0x4cc9f0, op: 0.98 });
      amps = rw.amps;
      if (cw.E0 == null) cw.E0 = rw.E;
      formula = T('Wave equation &nbsp; u_tt = c²·u_xx &nbsp;·&nbsp; aₙcos(ωₙt) + (bₙ/ωₙ)sin(ωₙt), ωₙ = cnπ/L');
      stats = 't = ' + fmt(t) + ' · c = ' + fmt(state.wvC) + ' · E = ' + fmt(rw.E) + ' (' + T('conserved') + ')';
    }
    var ym = Math.max(cw.ym, 1e-6);
    var yr = state.wvEq === 'heat' ? [Math.min(0, -0.15 * ym), ym] : [-ym, ym];
    viz.set2DRange(6.2);
    viz.render2D({ xr: [0, L], yr: yr, xlabel: 'x', ylabel: state.wvEq === 'schr' ? 'ψ' : 'u', curves: curves, hlines: [{ y: 0, op: 0.35 }] });
    setFormula(formula + ' &nbsp;·&nbsp; u₀ = <b>' + esc(state.wvU0) + '</b>');
    setStats(stats);
    if (dom.wvSpectrum) {
      if (state.wvSpectrum) {
        var html = '', K = Math.min(amps.length, 42);
        for (n = 0; n < K; n++) {
          var h = Math.max(1, Math.round(100 * Math.abs(amps[n]) / cw.amax));
          html += '<div class="spec-bar" title="n=' + (n + 1) + '" style="height:' + h + '%"></div>';
        }
        dom.wvSpectrum.innerHTML = html;
        dom.wvSpectrum.style.display = '';
      } else dom.wvSpectrum.style.display = 'none';
    }
    wavesReadout();
  }
  function wavesReadout() {
    if (!dom.wvReadout || !cur.waves) return;
    var a = cur.waves.a, L = state.wvL, html = '', n;
    html += '<div class="ro-sub">' + T('Mode coefficients aₙ = (2/L)∫u₀ sin(nπx/L)dx') + '</div><table class="eig">';
    for (n = 0; n < Math.min(5, a.length); n++) html += '<tr><td class="lam">a<sub>' + (n + 1) + '</sub></td><td class="vec">' + fmt(a[n]) + '</td></tr>';
    html += '</table>';
    if (state.wvEq === 'heat') {
      var k1 = Math.PI / L, kN = a.length * Math.PI / L;
      html += '<div class="hint-good">' + T('Mode n decays as e^(−Dkₙ²t): the lifetime of n = 1 is') + ' τ₁ = ' + fmt(1 / (state.wvD * k1 * k1)) +
        ', ' + T('but') + ' n = ' + a.length + ' ' + T('dies') + ' ' + Math.round((kN * kN) / (k1 * k1)) + T('× faster (τ ∝ 1/n²). High harmonics carry the sharp edges: <b>that is why diffusion smooths</b>.') + '</div>';
    } else if (state.wvEq === 'schr') {
      html += '<div class="hint-good">' + T('Same modes, different physics: nothing decays; every |cₙ| is constant and ∫|ψ|² = const. Only the <i>phases</i> rotate, at Eₙ ∝ n² (nonlinear in n → dispersion). In a box the phases all realign at the revival time T = 4L²/π ≈') + ' ' + fmt(4 * L * L / Math.PI) + ': ' + T('the packet reassembles!') + '</div>';
    } else {
      html += '<div class="muted small">' + T('Each mode is a standing wave sin(nπx/L) whose amplitude oscillates at ωₙ = cnπ/L: all frequencies are integer multiples of ω₁ (that is why a string plays a <i>note</i>). Compare: switch the equation to <b>heat</b> or <b>Schrödinger</b> with the same u₀.') + '</div>';
    }
    dom.wvReadout.innerHTML = html;
  }
  function buildWavesPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Separation of variables, live: the initial profile u₀(x) is projected ONCE onto the sine modes of [0, L] and every mode then evolves exactly: wave, heat, or free Schrödinger. Same modes, three different physics.') }));
    ctl.wvEqSel = select([
      { v: 'wave', label: 'wave  u_tt = c²·u_xx' },
      { v: 'heat', label: 'heat / diffusion  u_t = D·u_xx' },
      { v: 'schr', label: 'Schrödinger  iψ_t = −½·ψ_xx' }
    ], state.wvEq, function (v) { state.wvEq = v; refreshWavesInputs(); wavesCompute(); });
    panel.appendChild(field('Equation', ctl.wvEqSel));
    ctl.wvU0 = exprInput(state.wvU0, function (v) { state.wvU0 = v; requestWaves(); }, function () { if (wvTimer) clearTimeout(wvTimer); wavesCompute(); });
    panel.appendChild(field('u₀(x)  on [0, L]', ctl.wvU0));
    ctl.wvV0Box = mk('div', {}, []);
    ctl.wvV0 = exprInput(state.wvV0, function (v) { state.wvV0 = v; requestWaves(); }, function () { if (wvTimer) clearTimeout(wvTimer); wavesCompute(); });
    ctl.wvV0Box.appendChild(field('v₀(x)  initial velocity', ctl.wvV0));
    panel.appendChild(ctl.wvV0Box);
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    WV_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { applyWvPreset(p); })); });
    panel.appendChild(pb);
    ctl.wvDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.wvDesc);
    panel.appendChild(sectionTitle('Evolve'));
    ctl.wvPlay = button('▶ Evolve u(x,t)', 'wide', toggleWvPlay);
    panel.appendChild(ctl.wvPlay);
    var wts = sliderCtl(0, 60, 0.01, state.wvT, function (v) { state.wvT = v; renderWavesView(); });
    ctl.wvTSlider = wts.input; ctl.wvTVal = wts.out;
    panel.appendChild(field('t', wts.node));
    var wsp = sliderCtl(0.1, 4, 0.1, state.wvSpeed, function (v) { state.wvSpeed = v; });
    panel.appendChild(field('speed', wsp.node));
    panel.appendChild(sectionTitle('Parameters'));
    ctl.wvLS = sliderCtl(5, 20, 0.5, state.wvL, function (v) { state.wvL = v; requestWaves(); });
    panel.appendChild(field('Length L', ctl.wvLS.node, 'ends held at 0'));
    ctl.wvCBox = mk('div', {}, []);
    var wcs = sliderCtl(0.3, 3, 0.05, state.wvC, function (v) { state.wvC = v; wavesCompute(); });
    ctl.wvCBox.appendChild(field('wave speed c', wcs.node));
    panel.appendChild(ctl.wvCBox);
    ctl.wvDBox = mk('div', {}, []);
    var wds = sliderCtl(0.05, 2, 0.05, state.wvD, function (v) { state.wvD = v; wavesCompute(); });
    ctl.wvDBox.appendChild(field('diffusivity D', wds.node));
    panel.appendChild(ctl.wvDBox);
    var wns = sliderCtl(4, 80, 1, state.wvN, function (v) { state.wvN = Math.round(v); wavesCompute(); });
    panel.appendChild(field('Modes N', wns.node, 'how many sines represent u₀'));
    panel.appendChild(field('', checkbox('Ghost of u₀', state.wvGhost, function (v) { state.wvGhost = v; renderWavesView(); })));
    panel.appendChild(field('', checkbox('Mode spectrum |αₙ(t)|', state.wvSpectrum, function (v) { state.wvSpectrum = v; renderWavesView(); })));
    ctl.wvSpectrum = mk('div', { 'class': 'spectrum' });
    dom.wvSpectrum = ctl.wvSpectrum;
    panel.appendChild(ctl.wvSpectrum);
    ctl.wvReadout = mk('div', { 'class': 'readout' });
    dom.wvReadout = ctl.wvReadout;
    panel.appendChild(ctl.wvReadout);
    return panel;
  }
  function refreshWavesInputs() {
    ctl.wvV0Box.style.display = state.wvEq === 'wave' ? '' : 'none';
    ctl.wvCBox.style.display = state.wvEq === 'wave' ? '' : 'none';
    ctl.wvDBox.style.display = state.wvEq === 'heat' ? '' : 'none';
    if (ctl.wvEqSel) ctl.wvEqSel.value = state.wvEq;
  }
  function applyWvPreset(p) {
    state.wvU0 = p.u0; ctl.wvU0.value = p.u0;
    if (p.v0 != null) { state.wvV0 = p.v0; ctl.wvV0.value = p.v0; }
    state.wvL = p.L; syncSlider(ctl.wvLS, p.L);
    state.wvEq = p.eq; refreshWavesInputs();
    if (ctl.wvDesc) ctl.wvDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    wavesCompute();
  }
  function toggleWvPlay() { state.wvPlaying = !state.wvPlaying; ctl.wvPlay.textContent = state.wvPlaying ? T('❚❚ Pause') : T('▶ Evolve u(x,t)'); ctl.wvPlay.classList.toggle('active', state.wvPlaying); }


  K.lab({
    key: 'waves', label: 'Waves', flat: true, panel: buildWavesPanel,
    refresh: refreshWavesInputs,
    enter: function () { viz._render2D = renderWavesView; if (cur.waves) renderWavesView(); else wavesCompute(); },
    togglePlay: toggleWvPlay,
    frame: function () {
      if (!(state.wvPlaying && cur.waves)) return;
      /* heat lives on a slower clock (τₙ = 1/Dkₙ²); Schrödinger phases on n²/L² */
      state.wvT += state.wvSpeed * (state.wvEq === 'heat' ? 0.12 : state.wvEq === 'schr' ? 0.06 : 0.03);
      animSync(ctl.wvTSlider, ctl.wvTVal, state.wvT);
      renderWavesView();
    }
  });

})(window.VF = window.VF || {});
