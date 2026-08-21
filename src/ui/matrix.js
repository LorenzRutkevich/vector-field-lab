/* =============================================================================
 * ui/matrix.js: the Matrix lab: A as a linear map, eigen-decomposition,
 * and the one-parameter flow exp(tA)
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, evalNum = K.evalNum;
  var sliderCtl = K.sliderCtl, animSync = K.animSync, checkbox = K.checkbox, button = K.button, setFormula = K.setFormula, setStats = K.setStats;
  var hideColorbar = K.hideColorbar, domain = K.domain, spacingFor = K.spacingFor, esc = K.esc, matHtml = K.matHtml;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  MATRIX pipeline                                                          */
  /* ======================================================================== */
  function rank3(A) {
    var m = [A[0].slice(), A[1].slice(), A[2].slice()], rank = 0, r = 0;
    for (var c = 0; c < 3 && r < 3; c++) {
      var piv = r, best = Math.abs(m[r][c]);
      for (var i = r + 1; i < 3; i++) if (Math.abs(m[i][c]) > best) { best = Math.abs(m[i][c]); piv = i; }
      if (best < 1e-9) continue;
      var tmp = m[r]; m[r] = m[piv]; m[piv] = tmp;
      for (var i2 = 0; i2 < 3; i2++) if (i2 !== r) {
        var f = m[i2][c] / m[r][c];
        for (var j = 0; j < 3; j++) m[i2][j] -= f * m[r][j];
      }
      r++; rank++;
    }
    return rank;
  }

  function parseMatrix() {
    var L = VF.LinAlg;
    cur.M = L.fromFlat(state.M);
    renderMatrixAll();
    updateMatrixReadout();
  }

  function renderMatrixAll() {
    if (state.mode !== 'matrix' || !cur.M) return;
    hideColorbar();
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines();
    var opts = {
      showCube: state.matShowCube, showBasis: state.matShowBasis, showEig: state.matShowEig,
      showField: state.matShowField, cubeSize: Math.max(1.2, state.R * 0.5)
    };
    if (state.matShowField) {
      var d = domain();
      var vf = VF.FieldMath.matrixField(cur.M, 'A·x');
      var samples = VF.FieldMath.sampleVector(vf, d, state.matN, 0);
      opts.fieldSamples = samples;
      opts.fieldOpts = { map: VF.Colormaps.get(state.colormap), min: samples.min, max: samples.max, scale: state.arrowScale, spacing: spacingFor(state.matN) };
    }
    viz.renderMatrix(cur.M, opts);
    if (state.flowOn) viz.renderMatrixFlow(cur.M, state.flowT, { map: VF.Colormaps.get('turbo') });
    else viz.clearFlow();
    setFormula('A · x &nbsp; (linear vector field) &nbsp;·&nbsp; columns of A = images of x̂, ŷ, ẑ');
    setStats('');
  }

  function updateMatrixReadout() {
    var L = VF.LinAlg, A = cur.M;
    var det = L.det(A), tr = L.trace(A), rk = rank3(A);
    var eig = L.eig(A), E = L.expm(A);
    var flags = [];
    if (L.isSymmetric(A)) flags.push('symmetric');
    if (L.isRotation(A)) flags.push('rotation');
    else if (L.isOrthogonal(A)) flags.push('orthogonal');
    if (Math.abs(det) < 1e-9) flags.push('singular');

    var eigRows = '';
    for (var i = 0; i < eig.values.length; i++) {
      var v = eig.values[i];
      var lam = Math.abs(v.im) < 1e-8 ? fmt(v.re)
        : fmt(v.re) + (v.im >= 0 ? ' + ' : ' − ') + fmt(Math.abs(v.im)) + 'i';
      var vec = eig.vectors[i];
      var vs = vec ? '(' + fmt(vec[0]) + ', ' + fmt(vec[1]) + ', ' + fmt(vec[2]) + ')' : '<span class="muted">complex / degenerate</span>';
      eigRows += '<tr><td class="lam">λ = ' + lam + '</td><td class="vec">' + vs + '</td></tr>';
    }
    function matHtml(M) {
      var s = '<table class="mat-out">';
      for (var r = 0; r < 3; r++) { s += '<tr>'; for (var c = 0; c < 3; c++) s += '<td>' + fmt(M[r][c]) + '</td>'; s += '</tr>'; }
      return s + '</table>';
    }
    var inv = L.inverse(A);
    dom.readout.innerHTML =
      '<div class="ro-line"><span>det</span><b>' + fmt(det) + '</b>' +
      '<span>trace</span><b>' + fmt(tr) + '</b>' +
      '<span>rank</span><b>' + rk + '</b></div>' +
      (flags.length ? '<div class="flags">' + flags.map(function (f) { return '<span class="flag">' + f + '</span>'; }).join('') + '</div>' : '') +
      '<div class="ro-sub">Eigenvalues &amp; eigenvectors</div>' +
      '<table class="eig">' + eigRows + '</table>' +
      '<div class="ro-sub">Inverse&nbsp; A⁻¹</div>' +
      (inv ? matHtml(inv) : '<div class="muted small">singular (det = 0): the map collapses volume, so no inverse exists.</div>') +
      '<div class="ro-sub">Matrix exponential&nbsp; exp(A)</div>' + matHtml(E);
  }

  function setMatrixCells(flat) {
    state.M = flat.slice();
    for (var i = 0; i < 9; i++) ctl.mcells[i].value = fmt(flat[i]);
    parseMatrix();
  }

  function buildMatrixPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('A matrix A defines a linear vector field F(x) = A·x. Its columns are the images of the basis vectors; its exp(tA) generates the flow.') }));

    panel.appendChild(sectionTitle('Matrix  A  (3×3)'));
    ctl.mcells = [];
    var grid = mk('div', { 'class': 'mat-grid' });
    for (var i = 0; i < 9; i++) {
      var inp = mk('input', { type: 'text', 'class': 'mcell', value: fmt(state.M[i]), title: 'number or expression (e.g. pi/4, 1/2, sqrt(2))' });
      (function (idx, el2) {
        el2.addEventListener('input', function () {
          var v = evalNum(el2.value);
          state.M[idx] = isFinite(v) ? v : 0;
          el2.classList.toggle('bad', !isFinite(v) && el2.value.trim() !== '' && el2.value.trim() !== '-');
          parseMatrix();
        });
      })(i, inp);
      ctl.mcells.push(inp);
      grid.appendChild(inp);
    }
    panel.appendChild(grid);

    panel.appendChild(sectionTitle('Presets'));
    var pbox = mk('div', { 'class': 'presets' });
    VF.Presets.matrix.forEach(function (p) {
      pbox.appendChild(button(p.name, 'preset', function () { setMatrixCells(p.m); ctl.matDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc); }));
    });
    panel.appendChild(pbox);
    ctl.matDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.matDesc);

    /* rotation builder */
    panel.appendChild(sectionTitle('Build a rotation  R = exp(θ K)'));
    var ax = mk('input', { type: 'text', 'class': 'mcell', value: '0' });
    var ay = mk('input', { type: 'text', 'class': 'mcell', value: '0' });
    var az = mk('input', { type: 'text', 'class': 'mcell', value: '1' });
    var angWrap = sliderCtl(-180, 180, 1, 45, function () {});
    panel.appendChild(field('Axis (x, y, z)', mk('div', { 'class': 'axis-row' }, [ax, ay, az])));
    panel.appendChild(field('Angle θ (deg)', angWrap.node));
    panel.appendChild(button('Apply rotation', 'wide', function () {
      var axis = [evalNum(ax.value) || 0, evalNum(ay.value) || 0, evalNum(az.value) || 0];
      var ang = parseFloat(angWrap.input.value) * Math.PI / 180;
      setMatrixCells(VF.LinAlg.toFlat(VF.LinAlg.rotationAxisAngle(axis, ang)));
      ctl.matDesc.innerHTML = T('Rotation by') + ' ' + angWrap.input.value + '° ' + T('about axis') + ' (' + esc(ax.value) + ', ' + esc(ay.value) + ', ' + esc(az.value) + ').';
    }));

    panel.appendChild(sectionTitle('Show'));
    panel.appendChild(field('', checkbox('Transformed unit cube', state.matShowCube, function (v) { state.matShowCube = v; renderMatrixAll(); })));
    panel.appendChild(field('', checkbox('Basis vectors → columns of A', state.matShowBasis, function (v) { state.matShowBasis = v; renderMatrixAll(); })));
    panel.appendChild(field('', checkbox('Eigenvectors', state.matShowEig, function (v) { state.matShowEig = v; renderMatrixAll(); })));
    panel.appendChild(field('', checkbox('Vector field  A·x', state.matShowField, function (v) { state.matShowField = v; renderMatrixAll(); })));

    panel.appendChild(sectionTitle('Flow  exp(tA)·x'));
    panel.appendChild(field('', checkbox('Animate the one-parameter flow', state.flowOn, function (v) { state.flowOn = v; renderMatrixAll(); })));
    ctl.flowPlay = button('▶ Play flow', 'wide', function () { toggleFlow(); });
    panel.appendChild(ctl.flowPlay);
    var ft = sliderCtl(0, state.flowMax, 0.01, state.flowT, function (v) { state.flowT = v; if (state.flowOn) viz.renderMatrixFlow(cur.M, v, { map: VF.Colormaps.get('turbo') }); });
    ctl.flowSlider = ft.input; ctl.flowVal = ft.out;
    panel.appendChild(field('t', ft.node));
    var fsp = sliderCtl(0.1, 2, 0.1, state.flowSpeed, function (v) { state.flowSpeed = v; });
    panel.appendChild(field('flow speed', fsp.node));

    panel.appendChild(sectionTitle('Readout'));
    ctl.readout = mk('div', { 'class': 'readout' });
    dom.readout = ctl.readout;
    panel.appendChild(ctl.readout);

    return panel;
  }

  function toggleFlow() {
    state.flowPlaying = !state.flowPlaying;
    if (state.flowPlaying) state.flowOn = true;
    ctl.flowPlay.textContent = state.flowPlaying ? T('❚❚ Pause flow') : T('▶ Play flow');
    ctl.flowPlay.classList.toggle('active', state.flowPlaying);
    renderMatrixAll();
  }


  K.lab({
    key: 'matrix', label: 'Matrix', panel: buildMatrixPanel,
    enter: function () { hideColorbar(); parseMatrix(); },
    render: renderMatrixAll,
    togglePlay: toggleFlow,
    frame: function () {
      if (!state.flowPlaying) return;
      state.flowT += state.flowSpeed / 60;
      if (state.flowT > state.flowMax) state.flowT = 0;
      animSync(ctl.flowSlider, ctl.flowVal, state.flowT);
      viz.renderMatrixFlow(cur.M, state.flowT, { map: VF.Colormaps.get('turbo') });
    }
  });

})(window.VF = window.VF || {});
