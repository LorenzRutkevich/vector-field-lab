/* =============================================================================
 * ui/seq.js: the Sequences lab: the ε–N game, series as partial sums, and
 * pointwise vs uniform convergence through the ε-tube
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, evalNum = K.evalNum;
  var sliderCtl = K.sliderCtl, select = K.select, button = K.button, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats;
  var markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, numInput = K.numInput, isLight = K.isLight;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  SEQUENCES: the ε-N game, series, uniform convergence                    */
  /* ======================================================================== */
  var SQ_PRESETS = {
    seq: [
      { name: '1/n', e: '1/n', L: '0' }, { name: '(1+1/n)^n → e', e: '(1+1/n)^n', L: 'e' },
      { name: 'sin(n)/n', e: 'sin(n)/n', L: '0' }, { name: 'n^(1/n)', e: 'n^(1/n)', L: '1' },
      { name: '(−1)^n (divergent)', e: '(-1)^n', L: '0' }
    ],
    ser: [
      { name: 'Σ 1/n² → π²/6', e: '1/n^2', L: 'pi^2/6' }, { name: 'Σ (−1)^(n+1)/n → ln 2', e: '(-1)^(n+1)/n', L: '0.6931' },
      { name: 'Σ 1/2^n → 1', e: '1/2^n', L: '1' }, { name: 'Σ 1/n (harmonic, divergent)', e: '1/n', L: '0' }
    ],
    fseq: [
      { name: 'x^n on [0,1]: not uniform', f: 'x^n', lim: '0', a: 0, b: 1 },
      { name: 'sin(nx)/n: uniform', f: 'sin(n*x)/n', lim: '0', a: 0, b: 6.28 },
      { name: 'x/n: uniform', f: 'x/n', lim: '0', a: 0, b: 5 },
      { name: 'n·x·e^(−n·x²): not uniform', f: 'n*x*exp(-n*x^2)', lim: '0', a: 0, b: 2 }
    ]
  };
  function sqCompile(src, twoVar) {
    var t = String(src).replace(/\bn\b/g, twoVar ? 'y' : 'x');
    var v = VF.Parser.validate(t);
    if (!v.ok) return null;
    return VF.Parser.compile(t).fn;
  }
  function renderSeq() {
    if (state.mode !== 'seq') return;
    viz.set2DRange(6.2);
    setError(null);
    var i;
    if (state.sqMode === 'fseq') {
      var fn = sqCompile(state.sqFExpr, true), fl = sqCompile(state.sqFLim, false);
      if (ctl.sqFIn) markInput(ctl.sqFIn, !!fn);
      if (ctl.sqFLimIn) markInput(ctl.sqFLimIn, !!fl);
      if (!fn || !fl) { setError('fₙ: ' + T('invalid expression')); return; }
      var f2 = function (n, x) { return fn(x, n, 0, 0); }, fL = function (x) { return fl(x, 0, 0, 0); };
      var a = state.sqFa, b = state.sqFb, n = Math.round(state.sqFn), NX = 240;
      var cf = [], cl = [], cu = [], cd = [], lo = Infinity, hi = -Infinity;
      for (i = 0; i <= NX; i++) {
        var x = a + (b - a) * i / NX, vf2 = f2(n, x), vl = fL(x);
        cf.push([x, vf2]); cl.push([x, vl]); cu.push([x, vl + state.sqEps]); cd.push([x, vl - state.sqEps]);
        if (isFinite(vf2)) { if (vf2 < lo) lo = vf2; if (vf2 > hi) hi = vf2; }
        if (isFinite(vl)) { if (vl < lo) lo = vl; if (vl > hi) hi = vl; }
      }
      var pad = 0.2 * (hi - lo || 1) + state.sqEps;
      viz.render2D({
        xr: [a, b], yr: [lo - pad, hi + pad], xlabel: 'x', ylabel: 'f',
        curves: [
          { pts: cu, color: isLight() ? 0x9aa7bd : 0x59667f, op: 0.6 }, { pts: cd, color: isLight() ? 0x9aa7bd : 0x59667f, op: 0.6 },
          { pts: cl, color: isLight() ? 0x334155 : 0xdfe5f0, op: 0.85 }, { pts: cf, color: 0x4cc9f0, op: 1 }
        ]
      });
      var sup = VF.Seq.supDist(f2, fL, n, a, b);
      setFormula('f<sub>n</sub>(x) = ' + esc(state.sqFExpr) + ' &nbsp;·&nbsp; n = ' + n);
      setStats('sup |fₙ − f| = ' + fmt(sup.sup) + ' @ x = ' + fmt(sup.at) + ' · ε = ' + fmt(state.sqEps));
      seqReadoutF(f2, fL, n, a, b, sup);
    } else {
      var an = sqCompile(state.sqExpr, false);
      if (ctl.sqIn) markInput(ctl.sqIn, !!an);
      if (!an) { setError('aₙ: ' + T('invalid expression')); return; }
      var HOR = 500, raw = VF.Seq.values(function (nn) { return an(nn, 0, 0, 0); }, HOR);
      var vals = state.sqMode === 'ser' ? VF.Seq.partialSums(raw) : raw;
      var L = evalNum(state.sqLimit), N = Math.round(state.sqN), dots = [], lo2 = Infinity, hi2 = -Infinity;
      for (i = 0; i < N && i < vals.length; i++) {
        if (!isFinite(vals[i])) continue;
        dots.push([i + 1, vals[i]]);
        if (vals[i] < lo2) lo2 = vals[i]; if (vals[i] > hi2) hi2 = vals[i];
      }
      if (!isFinite(lo2)) { lo2 = -1; hi2 = 1; }
      if (isFinite(L)) { lo2 = Math.min(lo2, L - 2 * state.sqEps); hi2 = Math.max(hi2, L + 2 * state.sqEps); }
      var pad2 = 0.15 * (hi2 - lo2 || 1);
      var Ne = isFinite(L) ? VF.Seq.epsN(vals, L, state.sqEps) : null;
      var model = {
        xr: [0, N + 1], yr: [lo2 - pad2, hi2 + pad2], xlabel: 'n', ylabel: state.sqMode === 'ser' ? 'sₙ' : 'aₙ',
        dots: [{ pts: dots, color: 0x4cc9f0, size: 4 }],
        hlines: isFinite(L) ? [
          { y: L, color: 0xffd166, op: 0.85, label: 'L' },
          { y: L + state.sqEps, color: 0xffd166, op: 0.35, label: 'L+ε' },
          { y: L - state.sqEps, color: 0xffd166, op: 0.35, label: 'L−ε' }
        ] : [],
        curves: []
      };
      if (Ne != null && Ne <= N) model.curves.push({ pts: [[Ne, lo2 - pad2], [Ne, hi2 + pad2]], color: 0x63e6a0, op: 0.6 });
      viz.render2D(model);
      setFormula((state.sqMode === 'ser' ? 'sₙ = Σ aₖ, &nbsp; aₙ = ' : 'aₙ = ') + esc(state.sqExpr));
      setStats((state.sqMode === 'ser' ? 's' : 'a') + '_' + N + ' = ' + fmt(vals[N - 1]) +
        (Ne != null ? ' · N(ε) = ' + Ne : '') + ' · ε = ' + fmt(state.sqEps));
      seqReadoutA(vals, L, Ne);
    }
  }
  function seqReadoutA(vals, L, Ne) {
    if (!dom.sqReadout) return;
    var html = '';
    if (isFinite(L)) {
      if (Ne != null) {
        html += '<div class="ro-line"><span>N(ε)</span><b>' + Ne + '</b></div>';
        html += '<div class="hint-good">' + T('The ε–N game, won: from N(ε) on, EVERY term stays inside (L−ε, L+ε). Convergence means: for every ε someone hands you, you can answer with such an N.') + '</div>';
      } else {
        html += '<div class="hint-bad">' + T('Within the computed horizon the tail keeps escaping the ε-band: no convergence to this L (shrink ε only if you can still answer with an N!).') + '</div>';
      }
    } else html += '<div class="muted small">' + T('Enter a limit L to play the ε–N game.') + '</div>';
    html += '<div class="muted small">' + T('Series are sequences of partial sums: same game, played on sₙ. The harmonic series creeps beyond every bound: divergence can be slow.') + '</div>';
    dom.sqReadout.innerHTML = html;
  }
  function seqReadoutF(f2, fL, n, a, b, sup) {
    if (!dom.sqReadout) return;
    var sup2 = VF.Seq.supDist(f2, fL, 2 * n, a, b);
    var html = '<div class="ro-line"><span>sup |fₙ − f|</span><b>' + fmt(sup.sup) + '</b><span>@ x</span><b>' + fmt(sup.at) + '</b></div>';
    html += '<div class="ro-line"><span>sup ' + T('at') + ' 2n</span><b>' + fmt(sup2.sup) + '</b></div>';
    if (sup.sup < state.sqEps)
      html += '<div class="hint-good">' + T('The WHOLE graph of fₙ lies inside the ε-tube around f. That is uniform convergence: one n works for every x at once.') + '</div>';
    else if (sup2.sup < sup.sup * 0.8)
      html += '<div class="muted small">' + T('sup‖fₙ − f‖ is still shrinking. Raise n and the graph will enter the tube (uniform convergence).') + '</div>';
    else
      html += '<div class="hint-bad">' + T('sup‖fₙ − f‖ does NOT shrink: fₙ → f pointwise, but a bump always escapes the tube, the classic x^n picture. Pointwise ≠ uniform.') + '</div>';
    html += '<div class="muted small">' + T('Uniform convergence is what lets you swap limits with integrals and continuity; pointwise alone does not.') + '</div>';
    dom.sqReadout.innerHTML = html;
  }
  function buildSeqPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Analysis 1, made visible: sequences and the ε–N game, series as partial sums, and function sequences with the ε-tube that separates pointwise from UNIFORM convergence. Write formulas with n (and x for fₙ).') }));
    ctl.sqModeSel = select([
      { v: 'seq', label: 'sequence  aₙ' }, { v: 'ser', label: 'series  Σ aₙ' }, { v: 'fseq', label: 'function sequence  fₙ(x)' }
    ], state.sqMode, function (v) { state.sqMode = v; refreshSeqInputs(); renderSeq(); });
    panel.appendChild(field('Mode', ctl.sqModeSel));
    ctl.sqBoxA = mk('div', {}, []);
    ctl.sqIn = exprInput(state.sqExpr, function (v) { state.sqExpr = v; renderSeq(); });
    ctl.sqBoxA.appendChild(field('aₙ', ctl.sqIn, 'use n'));
    ctl.sqLimIn = exprInput(state.sqLimit, function (v) { state.sqLimit = v; renderSeq(); });
    ctl.sqBoxA.appendChild(field('limit L', ctl.sqLimIn));
    var nsl = sliderCtl(10, 200, 1, state.sqN, function (v) { state.sqN = Math.round(v); renderSeq(); });
    ctl.sqBoxA.appendChild(field('terms shown N', nsl.node));
    panel.appendChild(ctl.sqBoxA);
    ctl.sqBoxF = mk('div', {}, []);
    ctl.sqFIn = exprInput(state.sqFExpr, function (v) { state.sqFExpr = v; renderSeq(); });
    ctl.sqBoxF.appendChild(field('fₙ(x)', ctl.sqFIn, 'use n and x'));
    ctl.sqFLimIn = exprInput(state.sqFLim, function (v) { state.sqFLim = v; renderSeq(); });
    ctl.sqBoxF.appendChild(field('limit f(x)', ctl.sqFLimIn));
    ctl.sqFaI = numInput(state.sqFa, function (v) { state.sqFa = v; renderSeq(); });
    ctl.sqFbI = numInput(state.sqFb, function (v) { state.sqFb = v; renderSeq(); });
    ctl.sqBoxF.appendChild(field('interval [a, b]', mk('div', { 'class': 'axis-row' }, [ctl.sqFaI, ctl.sqFbI])));
    var nfs = sliderCtl(1, 80, 1, state.sqFn, function (v) { state.sqFn = Math.round(v); renderSeq(); });
    ctl.sqBoxF.appendChild(field('n', nfs.node));
    panel.appendChild(ctl.sqBoxF);
    var eps = sliderCtl(0.01, 1, 0.01, state.sqEps, function (v) { state.sqEps = v; renderSeq(); });
    panel.appendChild(field('ε', eps.node));
    panel.appendChild(sectionTitle('Presets'));
    ctl.sqPresetBox = mk('div', { 'class': 'presets' });
    panel.appendChild(ctl.sqPresetBox);
    panel.appendChild(sectionTitle('Readout'));
    ctl.sqReadout = mk('div', { 'class': 'readout' });
    dom.sqReadout = ctl.sqReadout;
    panel.appendChild(ctl.sqReadout);
    return panel;
  }
  function refreshSeqInputs() {
    var fs = state.sqMode === 'fseq';
    ctl.sqBoxA.style.display = fs ? 'none' : '';
    ctl.sqBoxF.style.display = fs ? '' : 'none';
    var list = SQ_PRESETS[state.sqMode] || [];
    ctl.sqPresetBox.innerHTML = '';
    list.forEach(function (p) {
      ctl.sqPresetBox.appendChild(button(p.name, 'preset', function () {
        if (state.sqMode === 'fseq') {
          state.sqFExpr = p.f; ctl.sqFIn.value = p.f;
          state.sqFLim = p.lim; ctl.sqFLimIn.value = p.lim;
          state.sqFa = p.a; ctl.sqFaI.value = fmt(p.a);
          state.sqFb = p.b; ctl.sqFbI.value = fmt(p.b);
        } else {
          state.sqExpr = p.e; ctl.sqIn.value = p.e;
          state.sqLimit = p.L; ctl.sqLimIn.value = p.L;
        }
        renderSeq();
      }));
    });
  }


  K.lab({
    key: 'seq', label: 'Sequences', flat: true, panel: buildSeqPanel,
    refresh: refreshSeqInputs,
    enter: function () { viz._render2D = renderSeq; renderSeq(); }
  });

})(window.VF = window.VF || {});
