/* =============================================================================
 * ui/quantum.js: the Quantum lab: the 1-D Schrödinger equation
 * −½ψ'' + Vψ = Eψ, its eigenstates and wave-packet evolution
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, checkbox = K.checkbox, button = K.button, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats;
  var markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, numInput = K.numInput, isLight = K.isLight, subN = K.subN;
  var pcompile = K.pcompile, syncSlider = K.syncSlider, SERIES_COLORS = K.SERIES_COLORS;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  QUANTUM: 1-D Schrödinger  −½ψ'' + Vψ = Eψ                               */
  /* ======================================================================== */
  var QM_PRESETS = [
    { name: 'harmonic', V: '0.5*x^2', L: 8, mode: 'states', desc: 'Harmonic oscillator ½x². Equally-spaced levels Eₙ = n + ½ (ℏ=m=1).' },
    { name: 'infinite well', V: '0', L: 5, mode: 'states', desc: 'Particle in a box (hard walls at ±L). Eₙ ∝ n²; ψₙ are sine standing waves.' },
    { name: 'finite well', V: '-6*(|x|<2)', L: 8, mode: 'states', desc: 'Finite square well, depth 6, width 4. Only a few bound states; ψ leaks past the walls.' },
    { name: 'double well', V: '0.14*(x^2-5)^2', L: 8, mode: 'states', desc: 'Two wells split by a barrier. Low levels come in near-degenerate tunnelling pairs (symmetric/antisymmetric).' },
    { name: 'Morse', V: '6*(1-exp(-0.7*(x+1)))^2 - 6', L: 9, mode: 'states', desc: 'Morse potential (a real diatomic bond): levels get closer together toward dissociation.' },
    { name: 'V = 2|x|', V: '2*|x|', L: 8, mode: 'states', desc: 'Linear "quantum bouncer" well: anharmonic, unequal spacing.' },
    { name: 'tunnelling ▶', V: '3*(|x|<0.4)', L: 12, mode: 'packet', pk: { x0: -5, sigma: 1.5, k0: 2 }, desc: 'A barrier of height 3 but packet energy ⟨E⟩ ≈ 2.1; classically it must bounce, yet part of |ψ|² appears beyond the barrier: tunnelling.' },
    { name: 'free packet ▶', V: '0', L: 14, mode: 'packet', pk: { x0: -8, sigma: 1, k0: 3 }, desc: 'A free Gaussian packet moves at the group velocity k₀ and spreads as it travels: dispersion of a matter wave.' },
    { name: 'beats ψ₀+ψ₁ ▶', V: '0.5*x^2', L: 8, mode: 'super', desc: 'An equal superposition of two eigenstates is NOT stationary: |ψ|² sloshes at the beat frequency ω = E₁ − E₀.' }
  ];
  var qmTimer = null;
  function requestQMSolve() { if (qmTimer) clearTimeout(qmTimer); qmTimer = setTimeout(qmSolve, 260); }
  function qmSolve() {
    if (state.mode !== 'quantum') return;
    var c = pcompile(state.qmV);
    markInput(ctl.qmV, c.ok);
    if (!c.ok) { setError('V(x): ' + c.err); return; }
    setError(null);
    var Vfn = function (x) { return c.fn(x, 0, 0, 0); };
    var L = state.qmL, N = Math.round(state.qmN);
    var sol = VF.QM.solve(Vfn, -L, L, N);
    cur.qm = { sol: sol, Vfn: Vfn, packet: null };
    if (state.qmMode !== 'states') qmBuildPacket();
    renderQuantumView();
  }
  function qmBuildPacket() {
    if (!cur.qm || !cur.qm.sol) return;
    cur.qm.packet = state.qmMode === 'super'
      ? VF.QM.superpose(cur.qm.sol, [Math.round(state.qmN1), Math.round(state.qmN2)])
      : VF.QM.packet(cur.qm.sol, state.qmX0, state.qmSigma, state.qmK0);
    state.qmT = 0;
  }
  function qmRepacket() { qmBuildPacket(); renderQuantumView(); }

  function renderQuantumView() {
    if (state.mode !== 'quantum' || !cur.qm || !cur.qm.sol) return;
    var sol = cur.qm.sol, Vfn = cur.qm.Vfn, L = state.qmL, i, n;
    var NV = 420, minV = Infinity, maxV = -Infinity, Vraw = [];
    for (i = 0; i < NV; i++) { var x = -L + 2 * L * i / (NV - 1), vv = Vfn(x); Vraw.push([x, vv]); if (isFinite(vv)) { if (vv < minV) minV = vv; if (vv > maxV) maxV = vv; } }
    if (!isFinite(minV)) { minV = 0; maxV = 1; }
    var Vcol = isLight() ? 0x334155 : 0xe2e8f2;
    var curves = [], hlines = [], markers = [];

    if (state.qmMode === 'states') {
      var k = Math.min(state.qmStates, sol.N), E0 = sol.E[0], Ek = sol.E[k - 1];
      var spacing = k > 1 ? (Ek - E0) / (k - 1) : Math.max(1, Ek - E0); if (!(spacing > 0)) spacing = 1;
      var ymax = Ek + 1.4 * spacing, ymin = Math.min(minV, E0) - 0.5 * spacing;
      var amp = 0.42 * spacing, Vcap = ymax + spacing;
      var Vpts = []; for (i = 0; i < NV; i++) Vpts.push([Vraw[i][0], Math.min(Vraw[i][1], Vcap)]);
      curves.push({ pts: Vpts, color: Vcol, op: 0.95 });
      for (n = 0; n < k; n++) {
        var psi = sol.psi[n], mx = 0; for (i = 0; i < sol.N; i++) if (Math.abs(psi[i]) > mx) mx = Math.abs(psi[i]); if (mx < 1e-12) mx = 1;
        var col = SERIES_COLORS[n % SERIES_COLORS.length], pts = [];
        for (i = 0; i < sol.N; i++) { var val = state.qmSquare ? sol.E[n] + amp * 1.7 * (psi[i] * psi[i]) / (mx * mx) : sol.E[n] + amp * psi[i] / mx; pts.push([sol.x[i], val]); }
        hlines.push({ y: sol.E[n], color: col, op: 0.32, label: 'E' + subN(n), labelX: -L + (n % 2 ? 0.10 : 0.02) * 2 * L });
        curves.push({ pts: pts, color: col, op: 0.98 });
      }
      viz.set2DRange(6.2); viz.render2D({ xr: [-L, L], yr: [ymin, ymax], xlabel: 'x', ylabel: 'E', curves: curves, hlines: hlines });
      setFormula('Schrödinger &nbsp; −½ψ″ + V ψ = E ψ &nbsp;·&nbsp; V(x) = <b>' + esc(state.qmV) + '</b>');
      setStats((state.qmSquare ? '|ψ|²' : 'ψ') + ' of the lowest ' + k + ' states · E₀ = ' + fmt(E0) + ' · ΔE ≈ ' + fmt(spacing));
    } else {
      if (!cur.qm.packet) qmBuildPacket();
      var pk = cur.qm.packet, ev = VF.QM.evolve(sol, pk, state.qmT), Eexp = 0;
      for (n = 0; n < sol.N; n++) Eexp += (pk.cRe[n] * pk.cRe[n] + pk.cIm[n] * pk.cIm[n]) * sol.E[n];
      var Vc2 = Math.min(maxV, Eexp + 4 * Math.max(1, Eexp - minV));
      var e2min = minV - 0.15 * Math.max(1, Eexp - minV), e2max = Math.max(Vc2, Eexp) + 1.0 * Math.max(1, Eexp - minV);
      var Vpts2 = []; for (i = 0; i < NV; i++) Vpts2.push([Vraw[i][0], Math.min(Vraw[i][1], e2max + Math.max(1, Eexp - minV))]);
      curves.push({ pts: Vpts2, color: Vcol, op: 0.95 });
      var dmax = 0; for (i = 0; i < sol.N; i++) if (ev.dens[i] > dmax) dmax = ev.dens[i]; if (dmax < 1e-12) dmax = 1;
      var pamp = 0.7 * (e2max - Eexp), dp = [];
      for (i = 0; i < sol.N; i++) dp.push([sol.x[i], Eexp + pamp * ev.dens[i] / dmax]);
      hlines.push({ y: Eexp, color: isLight() ? 0x9aa7bd : 0x8b96ab, op: 0.6, label: '⟨E⟩' });
      curves.push({ pts: dp, color: 0xff5cc8, op: 0.98 });
      markers.push({ x: ev.xmean, y: Eexp, color: 0xffd166, r: 0.018 });
      /* classical turning points V(x) = ⟨E⟩: where a classical particle would reverse */
      var tps = VF.QM.turningPoints(Vfn, Eexp, -L, L);
      for (i = 0; i < tps.length && i < 8; i++) markers.push({ x: tps[i], y: Eexp, color: isLight() ? 0x9aa7bd : 0x8b96ab, r: 0.011 });
      viz.set2DRange(6.2); viz.render2D({ xr: [-L, L], yr: [e2min, e2max], xlabel: 'x', ylabel: 'E', curves: curves, hlines: hlines, markers: markers });
      setFormula((state.qmMode === 'super'
        ? 'Superposition &nbsp; ψ = (ψ' + subN(Math.round(state.qmN1)) + ' + ψ' + subN(Math.round(state.qmN2)) + ')/√2'
        : 'Wave packet &nbsp; ψ(x,t) = Σ cₙ ψₙ e^(−iEₙt)') + ' &nbsp;·&nbsp; V(x) = <b>' + esc(state.qmV) + '</b>');
      setStats('|ψ(x,t)|² · t = ' + fmt(state.qmT) + ' · ⟨E⟩ = ' + fmt(Eexp) + ' · ⟨x⟩ = ' + fmt(ev.xmean) + ' · ‖ψ‖ = ' + fmt(ev.norm));
      cur.qm.lastEexp = Eexp;
    }
    qmReadout();
  }
  function qmReadout() {
    if (!dom.qmReadout || !cur.qm || !cur.qm.sol) return;
    var sol = cur.qm.sol, k = Math.min(state.qmStates, sol.N), n, html = '';
    html += '<div class="ro-sub">' + T('Energy levels (ℏ = m = 1)') + '</div><table class="eig">';
    for (n = 0; n < k; n++) html += '<tr><td class="lam">E<sub>' + n + '</sub></td><td class="vec">' + fmt(sol.E[n]) + ' &nbsp;·&nbsp; ' + VF.QM.nodes(sol.psi[n]) + ' ' + T(VF.QM.nodes(sol.psi[n]) === 1 ? 'node' : 'nodes') + '</td></tr>';
    html += '</table>';
    if (state.qmMode === 'super') {
      var n1 = Math.max(0, Math.min(sol.N - 1, Math.round(state.qmN1)));
      var n2 = Math.max(0, Math.min(sol.N - 1, Math.round(state.qmN2)));
      var dE = Math.abs(sol.E[n2] - sol.E[n1]);
      html += '<div class="hint-good">ψ' + subN(n1) + '+ψ' + subN(n2) + ' ' + T('is not stationary: their relative phase turns at') + ' ω = |E' + subN(n2) + '−E' + subN(n1) + '| = ' + fmt(dE) + ', ' + T('so |ψ|² sloshes with the beat period') + ' <b>T = 2π/ΔE ≈ ' + (dE > 1e-12 ? fmt(2 * Math.PI / dE) : '∞') + '</b>. ' + T('A single eigenstate would sit still: quantum motion comes from energy <i>differences</i>.') + '</div>';
    } else if (state.qmMode === 'packet' && cur.qm.lastEexp != null) {
      html += '<div class="hint-good">' + T('The packet is a superposition of these eigenstates; each phase rotates at its own rate e^(−iEₙt), so |ψ|² moves. Small grey dots mark the <b>classical turning points</b> V = ⟨E⟩ =') + ' ' + fmt(cur.qm.lastEexp) + ': ' + T('density beyond a barrier top has <b>tunnelled</b>.') + '</div>';
    } else {
      html += '<div class="muted small">' + T('ψ is stacked on its energy level Eₙ (drag <b>States</b> to show more). Nodes increase with n: the quantum analogue of higher harmonics. Toggle |ψ|² to read the probability density.') + '</div>';
    }
    dom.qmReadout.innerHTML = html;
  }
  function buildQuantumPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('The 1-D time-independent Schrödinger equation −½ψ″ + V(x)ψ = Eψ (ℏ = m = 1), solved by diagonalising the finite-difference Hamiltonian. Type any potential V(x); read off the energy levels Eₙ and wavefunctions ψₙ, or launch a wave packet to see tunnelling and spreading.') }));
    panel.appendChild(sectionTitle('Potential  V(x)'));
    ctl.qmV = exprInput(state.qmV, function (v) { state.qmV = v; requestQMSolve(); }, function () { if (qmTimer) clearTimeout(qmTimer); qmSolve(); });
    panel.appendChild(field('V(x)', ctl.qmV));
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    QM_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { applyQMPreset(p); })); });
    panel.appendChild(pb);
    ctl.qmDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.qmDesc);

    panel.appendChild(sectionTitle('View'));
    ctl.qmModeSel = select([
      { v: 'states', label: 'Eigenstates  ψₙ, Eₙ' },
      { v: 'packet', label: 'Wave packet  ψ(x,t)' },
      { v: 'super', label: 'Superposition: beats' }
    ], state.qmMode, function (v) { state.qmMode = v; refreshQMInputs(); if (v !== 'states') qmBuildPacket(); renderQuantumView(); });
    panel.appendChild(field('Show', ctl.qmModeSel));

    ctl.qmStatesBox = mk('div', {}, []);
    var ks = sliderCtl(1, 12, 1, state.qmStates, function (v) { state.qmStates = Math.round(v); renderQuantumView(); });
    ctl.qmStatesBox.appendChild(field('States shown', ks.node));
    ctl.qmStatesBox.appendChild(field('', checkbox('Plot |ψ|² (probability density)', state.qmSquare, function (v) { state.qmSquare = v; renderQuantumView(); })));
    panel.appendChild(ctl.qmStatesBox);

    ctl.qmEvolveBox = mk('div', {}, []);
    ctl.qmPlay = button('▶ Evolve ψ(x,t)', 'wide', function () { toggleQMPlay(); });
    ctl.qmEvolveBox.appendChild(ctl.qmPlay);
    var qsp = sliderCtl(0.1, 3, 0.1, state.qmSpeed, function (v) { state.qmSpeed = v; });
    ctl.qmEvolveBox.appendChild(field('speed', qsp.node));
    panel.appendChild(ctl.qmEvolveBox);

    ctl.qmPacketBox = mk('div', {}, []);
    ctl.qmX0S = sliderCtl(-10, 10, 0.1, state.qmX0, function (v) { state.qmX0 = v; qmRepacket(); });
    ctl.qmPacketBox.appendChild(field('start x₀', ctl.qmX0S.node));
    ctl.qmSigmaS = sliderCtl(0.2, 2.5, 0.05, state.qmSigma, function (v) { state.qmSigma = v; qmRepacket(); });
    ctl.qmPacketBox.appendChild(field('width σ', ctl.qmSigmaS.node));
    ctl.qmK0S = sliderCtl(-8, 8, 0.1, state.qmK0, function (v) { state.qmK0 = v; qmRepacket(); });
    ctl.qmPacketBox.appendChild(field('momentum k₀', ctl.qmK0S.node, 'kinetic E ≈ k₀²/2'));
    panel.appendChild(ctl.qmPacketBox);

    ctl.qmSuperBox = mk('div', {}, []);
    ctl.qmN1I = numInput(state.qmN1, function (v) { state.qmN1 = Math.max(0, Math.round(v)); qmRepacket(); });
    ctl.qmN2I = numInput(state.qmN2, function (v) { state.qmN2 = Math.max(0, Math.round(v)); qmRepacket(); });
    ctl.qmSuperBox.appendChild(field('states  n₁, n₂', mk('div', { 'class': 'axis-row' }, [ctl.qmN1I, ctl.qmN2I]), 'equal mix'));
    panel.appendChild(ctl.qmSuperBox);

    panel.appendChild(sectionTitle('Domain'));
    ctl.qmLS = sliderCtl(3, 16, 0.5, state.qmL, function (v) { state.qmL = v; requestQMSolve(); });
    panel.appendChild(field('Box half-width L', ctl.qmLS.node, 'walls at ±L'));
    var ns = sliderCtl(120, 400, 20, state.qmN, function (v) { state.qmN = Math.round(v); requestQMSolve(); });
    panel.appendChild(field('Grid points N', ns.node, 'accuracy'));

    panel.appendChild(sectionTitle('Levels'));
    ctl.qmReadout = mk('div', { 'class': 'readout' });
    dom.qmReadout = ctl.qmReadout;
    panel.appendChild(ctl.qmReadout);
    return panel;
  }
  function refreshQMInputs() {
    ctl.qmStatesBox.style.display = state.qmMode === 'states' ? '' : 'none';
    ctl.qmEvolveBox.style.display = state.qmMode !== 'states' ? '' : 'none';
    ctl.qmPacketBox.style.display = state.qmMode === 'packet' ? '' : 'none';
    ctl.qmSuperBox.style.display = state.qmMode === 'super' ? '' : 'none';
    if (ctl.qmModeSel) ctl.qmModeSel.value = state.qmMode;
  }
  function applyQMPreset(p) {
    state.qmV = p.V; ctl.qmV.value = p.V;
    state.qmL = p.L; syncSlider(ctl.qmLS, p.L);
    if (p.pk) {                                    /* preset carries tuned packet parameters */
      state.qmX0 = p.pk.x0; syncSlider(ctl.qmX0S, p.pk.x0);
      state.qmSigma = p.pk.sigma; syncSlider(ctl.qmSigmaS, p.pk.sigma);
      state.qmK0 = p.pk.k0; syncSlider(ctl.qmK0S, p.pk.k0);
    }
    state.qmMode = p.mode; refreshQMInputs();
    if (ctl.qmDesc) ctl.qmDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    qmSolve();
  }
  function toggleQMPlay() { state.qmPlaying = !state.qmPlaying; ctl.qmPlay.textContent = state.qmPlaying ? T('❚❚ Pause') : T('▶ Evolve ψ(x,t)'); ctl.qmPlay.classList.toggle('active', state.qmPlaying); }


  K.lab({
    key: 'quantum', label: 'Quantum', flat: true, panel: buildQuantumPanel,
    refresh: refreshQMInputs,
    enter: function () { viz._render2D = renderQuantumView; qmSolve(); },
    togglePlay: function () { if (state.qmMode !== 'states') toggleQMPlay(); },
    frame: function () {
      if (!(state.qmPlaying && state.qmMode !== 'states')) return;
      state.qmT += state.qmSpeed * 0.04;
      renderQuantumView();
    }
  });

})(window.VF = window.VF || {});
