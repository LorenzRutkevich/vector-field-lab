/* =============================================================================
 * ui/fourier.js: the Fourier lab: series (convergence & Gibbs) and the
 * transform (Δx·Δk)
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var animSync = K.animSync, select = K.select, checkbox = K.checkbox, button = K.button, setError = K.setError, setFormula = K.setFormula;
  var setStats = K.setStats, markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, isLight = K.isLight, pcompile = K.pcompile;
  var syncSlider = K.syncSlider, SERIES_COLORS = K.SERIES_COLORS;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  FOURIER: series (convergence & Gibbs) and transform (Δx·Δk)             */
  /* ======================================================================== */
  var FOUR_PRESETS = [
    { name: 'square', f: 'sign(x)', L: 3.14159265, mode: 'series', desc: 'Odd square wave. Only odd sine terms bₙ = 4/(nπ); the partial sums overshoot the jump by ~9 %: the Gibbs phenomenon (drag N).' },
    { name: 'sawtooth', f: 'x', L: 3.14159265, mode: 'series', desc: 'f(x) = x on (−π, π). bₙ = 2(−1)^{n+1}/n; slow 1/n decay and a jump at ±π.' },
    { name: 'triangle', f: '|x|', L: 3.14159265, mode: 'series', desc: 'Continuous triangle wave. Coefficients fall off like 1/n²: fast, smooth convergence (no Gibbs).' },
    { name: 'rectified', f: '|sin(x)|', L: 3.14159265, mode: 'series', desc: '|sin x| (a rectified sine). Even function → cosine series only.' },
    { name: 'pulse', f: '(|x|<1)', L: 3.14159265, mode: 'series', desc: 'A narrow pulse: many harmonics are needed, and its spectrum is broad, the series version of Δx·Δk.' },
    { name: 'gauss packet ▶', f: 'exp(-x^2/2)', L: 8, mode: 'transform', desc: 'A Gaussian transforms to a Gaussian. Narrow it in x and its transform widens in k: Δx·Δk is bounded below.' },
    { name: 'wide gauss ▶', f: 'exp(-x^2/8)', L: 8, mode: 'transform', desc: 'A wider Gaussian → a narrower spectrum. Compare Δx·Δk with the narrow one.' },
    { name: 'box → sinc ▶', f: '(|x|<1)', L: 8, mode: 'transform', desc: 'A box in x transforms to a sinc in k (sin k / k): the diffraction pattern of a single slit.' }
  ];
  var fourTimer = null;
  function requestFourier() { if (fourTimer) clearTimeout(fourTimer); fourTimer = setTimeout(fourierCompute, 240); }
  function fourierCompute() {
    if (state.mode !== 'fourier') return;
    var c = pcompile(state.fourF);
    markInput(ctl.fourF, c.ok);
    if (!c.ok) { setError('f(x): ' + c.err); return; }
    setError(null);
    var fn = function (x) { return c.fn(x, 0, 0, 0); };
    cur.fourier = { fn: fn, ser: VF.Fourier.series(fn, state.fourL, 40, 600) };
    renderFourierView();
  }
  function renderFourierView() {
    if (state.mode !== 'fourier' || !cur.fourier) return;
    var fn = cur.fourier.fn, i;
    if (state.fourMode === 'series') {
      var ser = cur.fourier.ser, L = state.fourL, N = state.fourPlaying ? Math.round(state.fourAnimN) : state.fourN;
      var sp = VF.Fourier.partial(ser, N), fc = [], sc = [], lo = Infinity, hi = -Infinity;
      for (i = 0; i < ser.x.length; i++) { fc.push([ser.x[i], ser.f[i]]); sc.push([ser.x[i], sp[i]]); var a = ser.f[i], b = sp[i]; if (isFinite(a)) { if (a < lo) lo = a; if (a > hi) hi = a; } if (isFinite(b)) { if (b < lo) lo = b; if (b > hi) hi = b; } }
      if (!isFinite(lo)) { lo = -1; hi = 1; }
      var pad = 0.15 * (hi - lo || 1), curves = [{ pts: fc, color: isLight() ? 0x9aa7bd : 0x6b7690, op: 0.9 }];
      if (state.fourShowHarm) for (var h = 1; h <= Math.min(N, 8); h++) { var hp = VF.Fourier.harmonic(ser, h), hc = []; for (i = 0; i < ser.x.length; i++) hc.push([ser.x[i], hp[i]]); curves.push({ pts: hc, color: SERIES_COLORS[h % SERIES_COLORS.length], op: 0.4 }); }
      curves.push({ pts: sc, color: 0x4cc9f0, op: 1 });
      viz.set2DRange(6.2); viz.render2D({ xr: [-L, L], yr: [lo - pad, hi + pad], xlabel: 'x', ylabel: 'f', curves: curves });
      setFormula('Fourier series &nbsp; S_N(x), N = <b>' + N + '</b> &nbsp;·&nbsp; f(x) = <b>' + esc(state.fourF) + '</b>');
      setStats('period 2L = ' + fmt(2 * L) + ' · ' + N + ' terms · a₀/2 = ' + fmt(ser.a[0] / 2));
      buildSpectrum(ser, N);
      fourReadout(ser, N);
    } else {
      var tf = VF.Fourier.transform(fn, -state.fourL, state.fourL, 12, 420), fk = [], hi2 = tf.max || 1;
      for (i = 0; i < tf.k.length; i++) fk.push([tf.k[i], tf.mag[i]]);
      viz.set2DRange(6.2); viz.render2D({ xr: [-12, 12], yr: [-0.06 * hi2, 1.12 * hi2], xlabel: 'k', ylabel: '|F(k)|', curves: [{ pts: fk, color: 0x4cc9f0, op: 1 }] });
      /* widths from the normalised |f|² and |F|² */
      var dx = uncertaintyX(fn, -state.fourL, state.fourL), dk = uncertaintyK(tf);
      /* spectrum tail: max |F| over the outer 10 % on each side (robust for the
         oscillating sinc, a single endpoint can sit near a zero) */
      var edge = 0;
      if (tf.max > 0) {
        var tailN = Math.max(1, Math.floor(tf.mag.length * 0.1));
        for (var ei = 0; ei < tailN; ei++) { var em = Math.max(tf.mag[ei], tf.mag[tf.mag.length - 1 - ei]); if (em > edge) edge = em; }
        edge /= tf.max;
      }
      setFormula('Fourier transform &nbsp; F(k) = ∫ f e^(−ikx) dx &nbsp;·&nbsp; f(x) = <b>' + esc(state.fourF) + '</b>');
      setStats('Δx ≈ ' + fmt(dx) + ' · Δk ≈ ' + fmt(dk) + ' · Δx·Δk ≈ ' + fmt(dx * dk));
      if (dom.fourSpectrum) dom.fourSpectrum.innerHTML = '';
      fourReadoutT(dx, dk, edge);
    }
  }
  function uncertaintyX(fn, xmin, xmax) {
    var N = 800, dx = (xmax - xmin) / N, s0 = 0, s1 = 0, s2 = 0, i;
    for (i = 0; i <= N; i++) { var x = xmin + i * dx, p = fn(x); p = p * p; s0 += p; s1 += x * p; s2 += x * x * p; }
    var mean = s1 / s0, varr = s2 / s0 - mean * mean; return Math.sqrt(Math.max(0, varr));
  }
  function uncertaintyK(tf) {
    var s0 = 0, s1 = 0, s2 = 0, i;
    for (i = 0; i < tf.k.length; i++) { var p = tf.mag[i] * tf.mag[i]; s0 += p; s1 += tf.k[i] * p; s2 += tf.k[i] * tf.k[i] * p; }
    var mean = s1 / s0, varr = s2 / s0 - mean * mean; return Math.sqrt(Math.max(0, varr));
  }
  function buildSpectrum(ser, N) {
    if (!dom.fourSpectrum) return;
    var maxAmp = 0, n, K = Math.min(N, 20);
    for (n = 1; n <= K; n++) { var A = VF.Fourier.amplitude(ser, n); if (A > maxAmp) maxAmp = A; }
    if (maxAmp < 1e-12) maxAmp = 1;
    var html = '';
    for (n = 1; n <= K; n++) { var h = Math.max(1, Math.round(100 * VF.Fourier.amplitude(ser, n) / maxAmp)); html += '<div class="spec-bar" title="n=' + n + '" style="height:' + h + '%"></div>'; }
    dom.fourSpectrum.innerHTML = html;
  }
  function fourReadout(ser, N) {
    if (!dom.fourReadout) return;
    var html = '<div class="ro-line"><span>terms N</span><b>' + N + '</b><span>a₀/2</span><b>' + fmt(ser.a[0] / 2) + '</b></div>';
    html += '<div class="ro-sub">First coefficients</div><table class="eig">';
    for (var n = 1; n <= Math.min(N, 5); n++) html += '<tr><td class="lam">n = ' + n + '</td><td class="vec">aₙ = ' + fmt(ser.a[n]) + ', &nbsp; bₙ = ' + fmt(ser.b[n]) + '</td></tr>';
    html += '</table>';
    html += '<div class="muted small">S_N = a₀/2 + Σ aₙcos(nπx/L) + bₙsin(nπx/L). The bar chart is the amplitude spectrum √(aₙ²+bₙ²). Near a jump the overshoot never dies: Gibbs.</div>';
    dom.fourReadout.innerHTML = html;
  }
  function fourReadoutT(dx, dk, edge) {
    if (!dom.fourReadout) return;
    var html = '<div class="ro-line"><span>Δx</span><b>' + fmt(dx) + '</b><span>Δk</span><b>' + fmt(dk) + '</b></div>' +
      '<div class="hint-good">Δx·Δk ≈ <b>' + fmt(dx * dk) + '</b>. A signal cannot be sharp in both x and k at once. Narrow it here and it must spread there. For a Gaussian the product is minimal (½), which is the seed of the Heisenberg uncertainty relation Δx·Δp ≥ ℏ/2.</div>';
    if (edge > 0.05) html += '<div class="muted small">The spectrum has not decayed by k = ±12: sharp edges put power into arbitrarily high k, so the true Δk (and with it Δx·Δk) is <b>unbounded</b>; the number above is limited by the plot window.</div>';
    dom.fourReadout.innerHTML = html;
  }
  function buildFourierPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Any periodic f is a sum of sines and cosines. Watch the partial sum S_N converge to f, the overshoot (Gibbs) at jumps, and the amplitude spectrum. Switch to the transform to see a wave packet and the Δx·Δk trade-off.') }));
    panel.appendChild(sectionTitle('Function  f(x)'));
    ctl.fourF = exprInput(state.fourF, function (v) { state.fourF = v; requestFourier(); }, function () { if (fourTimer) clearTimeout(fourTimer); fourierCompute(); });
    panel.appendChild(field('f(x)', ctl.fourF));
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    FOUR_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { applyFourPreset(p); })); });
    panel.appendChild(pb);
    ctl.fourDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.fourDesc);

    panel.appendChild(sectionTitle('Mode'));
    ctl.fourModeSel = select([{ v: 'series', label: 'Series  S_N(x)' }, { v: 'transform', label: 'Transform  |F(k)|' }], state.fourMode, function (v) { state.fourMode = v; refreshFourInputs(); fourierCompute(); });
    panel.appendChild(field('', ctl.fourModeSel));

    ctl.fourSeriesBox = mk('div', {}, []);
    ctl.fourPlay = button('▶ Animate convergence', 'wide', function () { toggleFourPlay(); });
    ctl.fourSeriesBox.appendChild(ctl.fourPlay);
    var ns = sliderCtl(1, 40, 1, state.fourN, function (v) { state.fourN = Math.round(v); if (!state.fourPlaying) renderFourierView(); });
    ctl.fourNSlider = ns.input; ctl.fourNVal = ns.out;
    ctl.fourSeriesBox.appendChild(field('terms N', ns.node));
    ctl.fourSeriesBox.appendChild(field('', checkbox('Show individual harmonics', state.fourShowHarm, function (v) { state.fourShowHarm = v; renderFourierView(); })));
    ctl.fourSeriesBox.appendChild(sectionTitle('Spectrum  √(aₙ²+bₙ²)'));
    ctl.fourSpectrum = mk('div', { 'class': 'spectrum' });
    dom.fourSpectrum = ctl.fourSpectrum;
    ctl.fourSeriesBox.appendChild(ctl.fourSpectrum);
    panel.appendChild(ctl.fourSeriesBox);

    panel.appendChild(sectionTitle('Domain'));
    ctl.fourLS = sliderCtl(1, 10, 0.1, state.fourL, function (v) { state.fourL = v; requestFourier(); });
    ctl.fourLNode = field('half-period L', ctl.fourLS.node);
    panel.appendChild(ctl.fourLNode);

    panel.appendChild(sectionTitle('Readout'));
    ctl.fourReadout = mk('div', { 'class': 'readout' });
    dom.fourReadout = ctl.fourReadout;
    panel.appendChild(ctl.fourReadout);
    return panel;
  }
  function refreshFourInputs() {
    ctl.fourSeriesBox.style.display = state.fourMode === 'series' ? '' : 'none';
    ctl.fourLNode.querySelector('.ctl-label') && (ctl.fourLNode.querySelector('.ctl-label').firstChild.textContent = T(state.fourMode === 'series' ? 'half-period L' : 'window ±L'));
    if (ctl.fourModeSel) ctl.fourModeSel.value = state.fourMode;
  }
  function applyFourPreset(p) {
    state.fourF = p.f; ctl.fourF.value = p.f;
    state.fourL = p.L; syncSlider(ctl.fourLS, p.L);
    state.fourMode = p.mode; refreshFourInputs();
    if (ctl.fourDesc) ctl.fourDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    fourierCompute();
  }
  function toggleFourPlay() { state.fourPlaying = !state.fourPlaying; if (state.fourPlaying) state.fourAnimN = 1; ctl.fourPlay.textContent = state.fourPlaying ? T('❚❚ Pause') : T('▶ Animate convergence'); ctl.fourPlay.classList.toggle('active', state.fourPlaying); }


  K.lab({
    key: 'fourier', label: 'Fourier', flat: true, panel: buildFourierPanel,
    refresh: refreshFourInputs,
    enter: function () { viz._render2D = renderFourierView; fourierCompute(); },
    togglePlay: function () { if (state.fourMode === 'series') toggleFourPlay(); },
    frame: function () {
      if (!(state.fourPlaying && state.fourMode === 'series')) return;
      state.fourAnimN += 0.14;
      if (state.fourAnimN > 40) state.fourAnimN = 1;
      animSync(ctl.fourNSlider, ctl.fourNVal, Math.round(state.fourAnimN));
      renderFourierView();
    }
  });

})(window.VF = window.VF || {});
