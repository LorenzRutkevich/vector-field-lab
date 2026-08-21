/* =============================================================================
 * ui/cplx.js: the Complex lab: domain colouring, the grid image of f, and
 * a numeric Cauchy–Riemann check
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, checkbox = K.checkbox, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats, domain = K.domain;
  var markInput = K.markInput, esc = K.esc, exprInput = K.exprInput;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  COMPLEX: domain colouring & conformal maps                              */
  /* ======================================================================== */
  var cxCache = { key: null, canvas: null };
  function cplxFn() {
    if (!state.cxCustom) return VF.Cplx.preset(state.cxPreset).f;
    var uv = VF.Parser.validate(state.cxU), vv = VF.Parser.validate(state.cxV);
    if (ctl.cxUIn) markInput(ctl.cxUIn, uv.ok);
    if (ctl.cxVIn) markInput(ctl.cxVIn, vv.ok);
    if (!uv.ok || !vv.ok) return null;
    var uf = VF.Parser.compile(state.cxU).fn, vf = VF.Parser.compile(state.cxV).fn;
    return function (z) { return { re: uf(z.re, z.im, 0, 0), im: vf(z.re, z.im, 0, 0) }; };
  }
  function renderCplx() {
    if (state.mode !== 'cplx') return;
    viz.set2DRange(6.2);
    setError(null);
    var f = cplxFn();
    if (!f) { setError('u, v: ' + T('invalid expression')); return; }
    var S = state.cxR, i, j;
    if (state.cxView === 'color') {
      var key = (state.cxCustom ? 'c|' + state.cxU + '|' + state.cxV : 'p|' + state.cxPreset) + '|' + S;
      if (cxCache.key !== key) {
        var W = 300, cv = document.createElement('canvas');
        cv.width = W; cv.height = W;
        var cx2 = cv.getContext('2d'), img = cx2.createImageData(W, W);
        VF.Cplx.paint(f, -S, S, -S, S, W, W, img.data);
        cx2.putImageData(img, 0, 0);
        cxCache = { key: key, canvas: cv };
      }
      viz.render2D({
        xr: [-S, S], yr: [-S, S], xlabel: 'Re z', ylabel: 'Im z',
        image: { canvas: cxCache.canvas, x0: -S, x1: S, y0: -S, y1: S }
      });
      setStats(T('hue = arg f · dark = zeros · bright = poles · bands double |f|'));
    } else {
      var lines = VF.Cplx.gridImage(f, -S, S, -S, S, state.cxGrid, 160);
      var mags = [], li2, pk2;
      for (li2 = 0; li2 < lines.length; li2++) for (pk2 = 0; pk2 < lines[li2].pts.length; pk2 += 6) {
        var pq2 = lines[li2].pts[pk2];
        if (isFinite(pq2[0]) && isFinite(pq2[1])) mags.push(Math.max(Math.abs(pq2[0]), Math.abs(pq2[1])));
      }
      mags.sort(function (a, b) { return a - b; });
      var W2 = Math.max(1e-6, (mags[Math.floor(mags.length * 0.92)] || 1) * 1.15);
      var curves = [];
      for (li2 = 0; li2 < lines.length; li2++) {
        var pts2 = [], src2 = lines[li2].pts;
        for (pk2 = 0; pk2 < src2.length; pk2++) {
          var q4 = src2[pk2];
          pts2.push((isFinite(q4[0]) && isFinite(q4[1]) && Math.abs(q4[0]) <= W2 && Math.abs(q4[1]) <= W2) ? q4 : [NaN, NaN]);
        }
        curves.push({ pts: pts2, color: lines[li2].kind === 'v' ? 0xffb454 : 0x4cc9f0, op: 0.85 });
      }
      viz.render2D({ xr: [-W2, W2], yr: [-W2, W2], xlabel: 'Re w', ylabel: 'Im w', curves: curves });
      setStats(T('the image of the input grid under w = f(z), orthogonal wherever f is conformal'));
    }
    setFormula('w = f(z) = ' + (state.cxCustom ? 'u + iv, u = ' + esc(state.cxU) + ', v = ' + esc(state.cxV) : esc(state.cxPreset)));
    cplxReadout(f);
  }
  function cplxReadout(f) {
    if (!dom.cxReadout) return;
    var u = function (x, y) { return f({ re: x, im: y }).re; }, v = function (x, y) { return f({ re: x, im: y }).im; };
    /* CR at a few generic points → conformal verdict */
    var pts = [[0.71, 0.43], [-0.55, 0.82], [1.13, -0.37]], okc = 0, tested = 0, cr = null, i;
    for (i = 0; i < pts.length; i++) {
      var c = VF.Cplx.crCheck(u, v, pts[i][0], pts[i][1]);
      if (!isFinite(c.ux + c.uy + c.vx + c.vy)) continue;
      tested++; cr = c;
      if (c.conformal) okc++;
    }
    var w0 = f({ re: 0.71, im: 0.43 });
    var html = '<div class="ro-line"><span>f(0.71 + 0.43i)</span><b>' + fmt(w0.re) + (w0.im >= 0 ? ' + ' : ' − ') + fmt(Math.abs(w0.im)) + 'i</b></div>';
    if (cr) {
      html += '<div class="ro-sub">' + T('Cauchy–Riemann at a sample point') + '</div>';
      html += '<div class="ro-vec">uₓ − v_y = ' + fmt(cr.cr1) + ' &nbsp;·&nbsp; u_y + vₓ = ' + fmt(cr.cr2) + ' &nbsp;·&nbsp; det J = ' + fmt(cr.detJ) + '</div>';
      if (tested && okc === tested)
        html += '<div class="hint-good">' + T('Cauchy–Riemann holds; f is holomorphic here: the Jacobian is a rotation·scaling (det J = |f′|²), so angles are preserved. That is why the image grid stays orthogonal.') + '</div>';
      else
        html += '<div class="hint-bad">' + T('Cauchy–Riemann fails; this map is ℝ² → ℝ² but not holomorphic: angles get distorted, the image grid loses its right angles.') + '</div>';
    }
    html += '<div class="muted small">' + T('Domain colouring: every zero is a dark point where all hues meet once per order; poles are bright. Try 1/z (pole), z²−1 (two zeros), z+1/z (the Joukowski map).') + '</div>';
    dom.cxReadout.innerHTML = html;
  }
  function buildCplxPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Complex functions seen whole: DOMAIN COLOURING paints each z with the hue of arg f(z) (zeros dark, poles bright), and the GRID IMAGE shows conformality: a holomorphic map bends the grid but keeps every angle right.') }));
    panel.appendChild(sectionTitle('Function'));
    var copts = [];
    for (var i = 0; i < VF.Cplx.PRESETS.length; i++) copts.push({ v: VF.Cplx.PRESETS[i].key, label: 'f(z) = ' + VF.Cplx.PRESETS[i].key });
    ctl.cxSel = select(copts, state.cxPreset, function (v) { state.cxPreset = v; state.cxCustom = false; if (ctl.cxCustomChk) ctl.cxCustomChk.checked = false; refreshCplxInputs(); renderCplx(); });
    panel.appendChild(field('f(z)', ctl.cxSel));
    var cchk = checkbox('custom map  u(x,y), v(x,y)', state.cxCustom, function (v) { state.cxCustom = v; refreshCplxInputs(); renderCplx(); });
    ctl.cxCustomChk = cchk.querySelector('input');
    panel.appendChild(field('', cchk));
    ctl.cxUVBox = mk('div', {}, []);
    ctl.cxUIn = exprInput(state.cxU, function (v) { state.cxU = v; renderCplx(); });
    ctl.cxUVBox.appendChild(field('u = Re f', ctl.cxUIn));
    ctl.cxVIn = exprInput(state.cxV, function (v) { state.cxV = v; renderCplx(); });
    ctl.cxUVBox.appendChild(field('v = Im f', ctl.cxVIn));
    panel.appendChild(ctl.cxUVBox);
    ctl.cxViewSel = select([{ v: 'color', label: 'domain colouring (input plane)' }, { v: 'grid', label: 'grid image (output plane)' }],
      state.cxView, function (v) { state.cxView = v; renderCplx(); });
    panel.appendChild(field('View', ctl.cxViewSel));
    var gs = sliderCtl(4, 24, 1, state.cxGrid, function (v) { state.cxGrid = Math.round(v); if (state.cxView === 'grid') renderCplx(); });
    panel.appendChild(field('grid lines', gs.node));
    var srs = sliderCtl(0.5, 5, 0.1, state.cxR, function (v) { state.cxR = v; renderCplx(); });
    panel.appendChild(field('input square ±', srs.node));
    panel.appendChild(sectionTitle('Readout'));
    ctl.cxReadout = mk('div', { 'class': 'readout' });
    dom.cxReadout = ctl.cxReadout;
    panel.appendChild(ctl.cxReadout);
    return panel;
  }
  function refreshCplxInputs() {
    if (ctl.cxUVBox) ctl.cxUVBox.style.display = state.cxCustom ? '' : 'none';
  }


  K.lab({
    key: 'cplx', label: 'Complex', flat: true, panel: buildCplxPanel,
    refresh: refreshCplxInputs,
    enter: function () { viz._render2D = renderCplx; renderCplx(); }
  });

})(window.VF = window.VF || {});
