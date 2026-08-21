/* =============================================================================
 * ui/modes.js: the Modes lab: coupled oscillators / kleine Schwingungen,
 * (K − ω²M)φ = 0 and the chain dispersion relation
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, checkbox = K.checkbox, button = K.button, setFormula = K.setFormula, setStats = K.setStats, numInput = K.numInput;
  var isLight = K.isLight, subN = K.subN, syncSlider = K.syncSlider, lab = K.lab;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  MODES: coupled oscillators / kleine Schwingungen                        */
  /* ======================================================================== */
  var MD_PRESETS = [
    { name: 'two pendula: beats ▶', n: 2, pattern: 'uniform', ends: 'free', k: 0.3, m: 1, gl: 1, excite: 'pluck', pluck: 1, desc: 'Two pendula, weakly coupled. Displace ONE: that is (φ₁+φ₂)/√2, and since ω₁ ≠ ω₂ the energy sloshes back and forth, beats with period 2π/Δω.' },
    { name: 'uniform chain', n: 10, pattern: 'uniform', ends: 'fixed', k: 1, m: 1, gl: 0, excite: 'mode', modeN: 1, desc: 'N equal masses. The mode shapes are sampled sine waves and ωₙ = 2√(k/m)·sin(nπ/(2N+2)). Check them against the dispersion view.' },
    { name: 'pluck the middle ▶', n: 14, pattern: 'uniform', ends: 'fixed', k: 1, m: 1, gl: 0, excite: 'pluck', pluck: 7, desc: 'A single displaced mass is a superposition of ALL modes (see the spectrum). The bump radiates away: a wave packet of lattice waves.' },
    { name: 'diatomic chain', n: 12, pattern: 'alternating', ends: 'fixed', k: 1, m: 1, gl: 0, excite: 'mode', modeN: 12, desc: 'Alternating masses m, 3m split the spectrum into an acoustic and an optical branch with a BAND GAP between them: the crystal-lattice origin of phonon bands.' },
    { name: 'heavy impurity', n: 11, pattern: 'impurity', ends: 'fixed', k: 1, m: 1, gl: 0, excite: 'pluck', pluck: 6, desc: 'One mass is 5× heavier. Pluck it: the defect moves sluggishly and reshapes the local modes; defects change the spectrum.' },
    { name: 'free ends: zero mode', n: 6, pattern: 'uniform', ends: 'free', k: 1, m: 1, gl: 0, excite: 'mode', modeN: 1, desc: 'No walls → translation costs no energy: ω₁ = 0, φ₁ = constant. Exciting it just displaces the whole chain, forever. Symmetry ⇒ zero mode.' }
  ];
  function mdArrays() {
    var n = Math.round(state.mdN), m = [], springs = [], i;
    for (i = 0; i < n; i++) {
      var mi = state.mdM;
      if (state.mdPattern === 'alternating' && i % 2 === 1) mi = 3 * state.mdM;
      if (state.mdPattern === 'impurity' && i === Math.floor(n / 2)) mi = 5 * state.mdM;
      m.push(mi);
    }
    for (i = 0; i <= n; i++) springs.push(state.mdK);
    if (state.mdEnds === 'free') { springs[0] = 0; springs[n] = 0; }
    return { m: m, springs: springs };
  }
  function mdSolve() {
    if (state.mode !== 'modes') return;
    var arr = mdArrays();
    cur.modes = { sol: VF.Modes.solveChain(arr.m, arr.springs, state.mdGl), arr: arr, cf: null, u0: null };
    if (ctl.mdModeS) { ctl.mdModeS.input.max = arr.m.length; }
    mdExcite();
  }
  function mdExcite() {
    if (!cur.modes) return;
    var sol = cur.modes.sol, n = sol.n, u0 = [], i;
    if (state.mdExcite === 'mode') {
      var k = Math.max(1, Math.min(n, Math.round(state.mdModeN))) - 1, mx = 1e-12;
      for (i = 0; i < n; i++) if (Math.abs(sol.phi[k][i]) > mx) mx = Math.abs(sol.phi[k][i]);
      for (i = 0; i < n; i++) u0.push(0.8 * sol.phi[k][i] / mx);
    } else {
      var pi2 = Math.max(1, Math.min(n, Math.round(state.mdPluck))) - 1;
      for (i = 0; i < n; i++) u0.push(i === pi2 ? 1 : 0);
    }
    cur.modes.u0 = u0;
    cur.modes.cf = VF.Modes.coeffs(sol, u0, null);
    state.mdT = 0;
    renderModesView();
  }
  function renderModesView() {
    if (state.mode !== 'modes' || !cur.modes) return;
    var md = cur.modes, sol = md.sol, n = sol.n, i, j;
    viz.set2DRange(6.2);
    if (state.mdView === 'disp') {
      /* dispersion relation: ωⱼ against its wavenumber qⱼ.  Fixed walls quantize
         q = jπ/(N+1), j = 1…N; free ends give the Neumann set q = jπ/N, j = 0…N−1
         (j = 0 is the zero mode, free translation), so the mapping must follow
         the boundary condition or the dots leave the analytic curve. */
      var markers = [], curves = [], hlines = [], wmax = sol.omega[n - 1] || 1;
      var freeEnds = state.mdEnds === 'free';
      for (j = 0; j < n; j++)
        markers.push({ x: freeEnds ? j * Math.PI / n : (j + 1) * Math.PI / (n + 1), y: sol.omega[j], color: 0xffd166, r: 0.016 });
      if (state.mdPattern === 'uniform') {
        /* ω(q)² = g/ℓ + 4(k/m)·sin²(q/2): the pendulum term is an on-site
           restoring force, so it lifts the whole branch (a gapped dispersion) */
        var apts = [], w2 = 4 * state.mdK / state.mdM;
        for (i = 0; i <= 120; i++) { var q = Math.PI * i / 120, sq = Math.sin(q / 2); apts.push([q, Math.sqrt(state.mdGl + w2 * sq * sq)]); }
        curves.push({ pts: apts, color: 0x4cc9f0, op: 0.85 });
        wmax = Math.max(wmax, Math.sqrt(state.mdGl + w2));
      }
      if (state.mdPattern === 'alternating') {
        var glT = state.mdGl > 1e-12 ? 'g/ℓ + ' : '';
        var eAc = Math.sqrt(state.mdGl + 2 * state.mdK / (3 * state.mdM)), eOp = Math.sqrt(state.mdGl + 2 * state.mdK / state.mdM);
        hlines.push({ y: eAc, color: 0x63e6a0, op: 0.7, label: T('acoustic top') + ' √(' + glT + '2k/M)' });
        hlines.push({ y: eOp, color: 0xff5cc8, op: 0.7, label: T('optical bottom') + ' √(' + glT + '2k/m)', labelX: Math.PI * 0.45 });
        wmax = Math.max(wmax, Math.sqrt(state.mdGl + 2 * state.mdK * (1 / state.mdM + 1 / (3 * state.mdM))));
      }
      viz.render2D({ xr: [0, Math.PI * 1.04], yr: [0, wmax * 1.15], xlabel: 'q·a', ylabel: 'ω', curves: curves, markers: markers, hlines: hlines });
      setFormula(T('Dispersion relation') + ' &nbsp; ω(q): ' + T('one dot per normal mode'));
      setStats(n + ' ' + T('modes') + ' · ω ∈ [' + fmt(sol.omega[0]) + ', ' + fmt(sol.omega[n - 1]) + ']' + (state.mdPattern === 'alternating' ? ' · ' + T('note the band gap') : ''));
    } else {
      var ev = VF.Modes.evolve(sol, md.cf, state.mdT);
      var ym = 1e-9;
      for (i = 0; i < n; i++) if (Math.abs(md.u0[i]) > ym) ym = Math.abs(md.u0[i]);
      ym *= 1.45;
      var pts = [], curves2 = [], markers2 = [];
      if (state.mdEnds === 'fixed') pts.push([0, 0]);
      for (i = 0; i < n; i++) pts.push([i + 1, ev.u[i]]);
      if (state.mdEnds === 'fixed') pts.push([n + 1, 0]);
      if (state.mdShape && state.mdExcite === 'mode') {
        var gp = [], gm = [];
        if (state.mdEnds === 'fixed') { gp.push([0, 0]); gm.push([0, 0]); }
        for (i = 0; i < n; i++) { gp.push([i + 1, md.u0[i]]); gm.push([i + 1, -md.u0[i]]); }
        if (state.mdEnds === 'fixed') { gp.push([n + 1, 0]); gm.push([n + 1, 0]); }
        curves2.push({ pts: gp, color: isLight() ? 0x9aa7bd : 0x59667f, op: 0.4 });
        curves2.push({ pts: gm, color: isLight() ? 0x9aa7bd : 0x59667f, op: 0.4 });
      }
      curves2.push({ pts: pts, color: 0x4cc9f0, op: 0.95 });
      for (i = 0; i < n; i++) {
        var hv = md.arr.m[i] / state.mdM;
        markers2.push({ x: i + 1, y: ev.u[i], color: hv > 2.5 ? 0xff5cc8 : 0xffd166, r: 0.018 * Math.pow(hv, 1 / 3) });
      }
      viz.render2D({ xr: [0, n + 1], yr: [-ym, ym], xlabel: T('mass #'), ylabel: 'u', curves: curves2, markers: markers2, hlines: [{ y: 0, op: 0.35 }] });
      setFormula(T('Small oscillations') + ' &nbsp; M·ü = −K·u &nbsp;·&nbsp; (K − ω²M)·φ = 0');
      setStats('t = ' + fmt(state.mdT) + ' · N = ' + n + ' · E = ' + fmt(ev.E) + ' (' + T('conserved') + ')');
    }
    mdSpectrumDraw();
    mdReadout();
  }
  function mdReadout() {
    if (!dom.mdReadout || !cur.modes) return;
    var sol = cur.modes.sol, cf = cur.modes.cf, arr = cur.modes.arr, n = sol.n, html = '', i, j;
    html += '<div class="muted small">' + T('Ansatz u = φ·e^(iωt) turns M·ü = −K·u into the generalized eigenvalue problem <b>(K − ω²M)φ = 0</b>, symmetrised as K̃ = M^(−1/2)·K·M^(−1/2) and diagonalised (same QL solver as the Schrödinger lab). Modes are M-orthonormal: φₘᵀMφₙ = δₘₙ.') + '</div>';
    html += '<div class="ro-sub">' + T('Eigenfrequencies') + '</div><table class="eig">';
    for (j = 0; j < Math.min(n, 8); j++)
      html += '<tr><td class="lam">ω<sub>' + (j + 1) + '</sub></td><td class="vec">' + fmt(sol.omega[j]) + (sol.omega[j] < 1e-6 ? ' &nbsp;·&nbsp; <b>' + T('zero mode') + '</b> ' + T('(free translation)') : '') + ' &nbsp;·&nbsp; |c| = ' + fmt(Math.abs(cf.c[j])) + '</td></tr>';
    if (n > 8) html += '<tr><td class="lam">…</td><td class="vec">' + (n - 8) + ' ' + T('more') + '</td></tr>';
    html += '</table>';
    if (n <= 6) {
      var mrow = [], krows = [];
      for (i = 0; i < n; i++) mrow.push(fmt(arr.m[i]));
      for (i = 0; i < n; i++) {
        var row = [];
        for (j = 0; j < n; j++) {
          var kij = 0;
          if (i === j) kij = arr.springs[i] + arr.springs[i + 1] + arr.m[i] * state.mdGl;
          else if (Math.abs(i - j) === 1) kij = -arr.springs[Math.max(i, j)];
          row.push(fmt(kij));
        }
        krows.push(row.join(', '));
      }
      html += '<div class="ro-sub">' + T('Mass matrix') + '</div><div class="ro-vec">M = diag(' + mrow.join(', ') + ')</div>';
      html += '<div class="ro-sub">' + T('Stiffness matrix') + '</div>';
      for (i = 0; i < n; i++) html += '<div class="ro-vec">' + (i === 0 ? 'K = [' : '&nbsp;&nbsp;&nbsp;&nbsp;[') + krows[i] + ']</div>';
    }
    /* beats hint: exactly two modes carry the energy */
    var big = [], mx = 1e-12;
    for (j = 0; j < n; j++) if (Math.abs(cf.c[j]) > mx) mx = Math.abs(cf.c[j]);
    for (j = 0; j < n; j++) if (Math.abs(cf.c[j]) > 0.35 * mx) big.push(j);
    if (big.length === 2) {
      var dw = Math.abs(sol.omega[big[1]] - sol.omega[big[0]]);
      html += '<div class="hint-good">' + T('Two modes share the energy') + ' (ω' + subN(big[0] + 1) + ', ω' + subN(big[1] + 1) + ') → ' + T('the motion <b>beats</b>: energy migrates back and forth with period') + ' 2π/Δω ≈ ' + (dw > 1e-12 ? fmt(2 * Math.PI / dw) : '∞') + '.</div>';
    }
    dom.mdReadout.innerHTML = html;
  }
  function buildModesPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Small oscillations (kleine Schwingungen): N masses and springs, written as M·ü = −K·u. The normal modes are the eigenvectors of (K − ω²M)φ = 0: each one oscillates at a single frequency, and every motion is a superposition of them.') }));
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    MD_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { applyMdPreset(p); })); });
    panel.appendChild(pb);
    ctl.mdDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.mdDesc);
    panel.appendChild(sectionTitle('Chain'));
    ctl.mdNS = sliderCtl(2, 24, 1, state.mdN, function (v) { state.mdN = Math.round(v); mdSolve(); });
    panel.appendChild(field('Masses N', ctl.mdNS.node));
    ctl.mdPatternSel = select([
      { v: 'uniform', label: 'equal masses' },
      { v: 'alternating', label: 'diatomic  m, 3m alternating' },
      { v: 'impurity', label: 'impurity  (centre mass 5×)' }
    ], state.mdPattern, function (v) { state.mdPattern = v; mdSolve(); });
    panel.appendChild(field('Mass pattern', ctl.mdPatternSel));
    ctl.mdEndsSel = select([
      { v: 'fixed', label: 'fixed walls' },
      { v: 'free', label: 'free ends' }
    ], state.mdEnds, function (v) { state.mdEnds = v; mdSolve(); });
    panel.appendChild(field('Boundary', ctl.mdEndsSel, 'free ends → ω₁ = 0 zero mode'));
    ctl.mdKS = sliderCtl(0.1, 3, 0.05, state.mdK, function (v) { state.mdK = v; mdSolve(); });
    panel.appendChild(field('spring k', ctl.mdKS.node));
    ctl.mdMS = sliderCtl(0.2, 3, 0.05, state.mdM, function (v) { state.mdM = v; mdSolve(); });
    panel.appendChild(field('mass m', ctl.mdMS.node));
    ctl.mdGlS = sliderCtl(0, 2, 0.05, state.mdGl, function (v) { state.mdGl = v; mdSolve(); });
    panel.appendChild(field('pendulum g/ℓ', ctl.mdGlS.node, 'adds m(g/ℓ)·u restoring: coupled pendula'));
    panel.appendChild(sectionTitle('Excite'));
    ctl.mdModeS = sliderCtl(1, state.mdN, 1, state.mdModeN, function (v) { state.mdModeN = Math.round(v); if (state.mdExcite === 'mode') mdExcite(); });
    panel.appendChild(field('mode n', ctl.mdModeS.node));
    panel.appendChild(field('', mk('div', { 'class': 'axis-row' }, [
      button('Excite mode n', '', function () { state.mdExcite = 'mode'; mdExcite(); }),
      button('Pluck mass #', '', function () { state.mdExcite = 'pluck'; mdExcite(); })
    ])));
    ctl.mdPluckI = numInput(state.mdPluck, function (v) { state.mdPluck = Math.round(v); if (state.mdExcite === 'pluck') mdExcite(); });
    panel.appendChild(field('mass # to pluck', ctl.mdPluckI));
    panel.appendChild(sectionTitle('Animate'));
    ctl.mdPlay = button('▶ Play', 'wide', toggleMdPlay);
    panel.appendChild(ctl.mdPlay);
    var msp = sliderCtl(0.1, 4, 0.1, state.mdSpeed, function (v) { state.mdSpeed = v; });
    panel.appendChild(field('speed', msp.node));
    ctl.mdViewSel = select([
      { v: 'chain', label: 'chain  u(t)' },
      { v: 'disp', label: 'dispersion  ω(q)' }
    ], state.mdView, function (v) { state.mdView = v; renderModesView(); });
    panel.appendChild(field('View', ctl.mdViewSel));
    panel.appendChild(field('', checkbox('Mode-shape envelope', state.mdShape, function (v) { state.mdShape = v; renderModesView(); })));
    panel.appendChild(field('', checkbox('Participation |cₙ|', state.mdSpectrum, function (v) { state.mdSpectrum = v; mdSpectrumDraw(); })));
    ctl.mdSpectrum = mk('div', { 'class': 'spectrum' });
    dom.mdSpectrum = ctl.mdSpectrum;
    panel.appendChild(ctl.mdSpectrum);
    ctl.mdReadout = mk('div', { 'class': 'readout' });
    dom.mdReadout = ctl.mdReadout;
    panel.appendChild(ctl.mdReadout);
    return panel;
  }
  function mdSpectrumDraw() {
    if (!dom.mdSpectrum) return;
    if (!state.mdSpectrum || !cur.modes) { dom.mdSpectrum.style.display = 'none'; return; }
    dom.mdSpectrum.style.display = '';
    var cf = cur.modes.cf, n = cf.c.length, mx = 1e-12, html = '', j;
    for (j = 0; j < n; j++) if (Math.abs(cf.c[j]) > mx) mx = Math.abs(cf.c[j]);
    for (j = 0; j < n; j++) html += '<div class="spec-bar" title="mode ' + (j + 1) + '" style="height:' + Math.max(1, Math.round(100 * Math.abs(cf.c[j]) / mx)) + '%"></div>';
    dom.mdSpectrum.innerHTML = html;
  }
  function applyMdPreset(p) {
    state.mdN = p.n; syncSlider(ctl.mdNS, p.n);
    state.mdPattern = p.pattern; ctl.mdPatternSel.value = p.pattern;
    state.mdEnds = p.ends; ctl.mdEndsSel.value = p.ends;
    state.mdK = p.k; syncSlider(ctl.mdKS, p.k);
    state.mdM = p.m; syncSlider(ctl.mdMS, p.m);
    state.mdGl = p.gl; syncSlider(ctl.mdGlS, p.gl);
    state.mdExcite = p.excite;
    if (p.modeN != null) { state.mdModeN = p.modeN; syncSlider(ctl.mdModeS, p.modeN); }
    if (p.pluck != null) { state.mdPluck = p.pluck; ctl.mdPluckI.value = p.pluck; }
    if (ctl.mdDesc) ctl.mdDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    mdSolve();
  }
  function toggleMdPlay() { state.mdPlaying = !state.mdPlaying; ctl.mdPlay.textContent = state.mdPlaying ? T('❚❚ Pause') : T('▶ Play'); ctl.mdPlay.classList.toggle('active', state.mdPlaying); }


  K.lab({
    key: 'modes', label: 'Modes', flat: true, panel: buildModesPanel,
    enter: function () { viz._render2D = renderModesView; if (cur.modes) renderModesView(); else mdSolve(); },
    togglePlay: toggleMdPlay,
    frame: function () {
      if (!(state.mdPlaying && cur.modes)) return;
      state.mdT += state.mdSpeed * 0.035;
      renderModesView();
    }
  });

})(window.VF = window.VF || {});
