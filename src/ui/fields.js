/* =============================================================================
 * ui/fields.js: the Fields lab: parse -> sample -> render, the line
 * integral ∮F·dr, the field designer, and the test bodies dropped into the field
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, evalNum = K.evalNum;
  var sliderCtl = K.sliderCtl, regR = K.regR, regDomain = K.regDomain, setDomainR = K.setDomainR, animSync = K.animSync, select = K.select;
  var checkbox = K.checkbox, button = K.button, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats, updateColorbar = K.updateColorbar;
  var domain = K.domain, spacingFor = K.spacingFor, markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, vrow = K.vrow;
  var numInput = K.numInput, refreshActive = K.refreshActive, lab = K.lab;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  FIELDS pipeline                                                          */
  /* ======================================================================== */
  function requestParse() {
    if (parseTimer) clearTimeout(parseTimer);
    parseTimer = setTimeout(parseFields, 200);
  }

  function parseFields() {
    cur.error = null;
    var FM = VF.FieldMath, P = VF.Parser;
    try {
      if (state.fieldType === 'vector') {
        var vx = P.validate(state.vx), vy = P.validate(state.vy), vz = P.validate(state.vz);
        markInput(ctl.vx, vx.ok); markInput(ctl.vy, vy.ok); markInput(ctl.vz, vz.ok);
        if (!vx.ok) throw new Error('Fx: ' + vx.message);
        if (!vy.ok) throw new Error('Fy: ' + vy.message);
        if (!vz.ok) throw new Error('Fz: ' + vz.message);
        cur.input = FM.vectorField(P.compile(state.vx).fn, P.compile(state.vy).fn, P.compile(state.vz).fn, 'F');
      } else {
        var vf = P.validate(state.sf);
        markInput(ctl.sf, vf.ok);
        if (!vf.ok) throw new Error('f: ' + vf.message);
        cur.input = FM.scalarField(P.compile(state.sf).fn, 'f');
      }
      var res = FM.applyOperator(cur.input, state.operation);
      if (res.error) throw new Error(res.error);
      cur.result = res.field;
      /* the field the test bodies feel: F itself, or −∇f when f is scalar
         (flow reading: gradient descent; force reading: f as potential energy) */
      if (cur.input.kind === 'vector') cur.bodyF = cur.input.at;
      else (function () {
        var g = FM.grad(cur.input).at;
        cur.bodyF = function (x, y, z, t) { var v = g(x, y, z, t); return [-v[0], -v[1], -v[2]]; };
      })();
      setError(null);
    } catch (e) {
      cur.error = String(e && e.message || e);
      setError(cur.error);
      return;
    }
    sampleAndRender();
  }

  function buildSliceList(fieldObj, res) {
    var axis = state.sliceAxis, coord = state.sliceCoord;
    var i0, i1, fixed;
    if (axis === 'x') { i0 = 1; i1 = 2; fixed = 0; }
    else if (axis === 'y') { i0 = 0; i1 = 2; fixed = 1; }
    else { i0 = 0; i1 = 1; fixed = 2; }
    var lo = -state.R, hi = state.R, pos = [], val = [], mn = Infinity, mx = -Infinity;
    for (var b = 0; b < res; b++)
      for (var a = 0; a < res; a++) {
        var p = [0, 0, 0];
        p[fixed] = coord;
        p[i0] = lo + (hi - lo) * a / (res - 1);
        p[i1] = lo + (hi - lo) * b / (res - 1);
        var s = fieldObj.at(p[0], p[1], p[2], state.t);
        pos.push([p[0], p[1], p[2]]); val.push(s);
        if (isFinite(s)) { if (s < mn) mn = s; if (s > mx) mx = s; }
      }
    if (!isFinite(mn)) { mn = 0; mx = 1; }
    return { pos: pos, val: val, min: mn, max: mx };
  }

  function sampleAndRender() {
    if (state.mode !== 'fields' || !cur.result) return;
    var FM = VF.FieldMath, map = VF.Colormaps.get(state.colormap);
    var d = domain();
    viz.clearMatrix();

    if (cur.result.kind === 'vector') {
      viz.clearScalar();
      var samples, spacing;
      if (state.vectorMode === 'plane') {
        samples = FM.sampleVectorPlane(cur.result, state.vecPlaneAxis, state.vecPlaneCoord, d, state.vectorPlaneN, state.t);
        spacing = (2 * state.R) / Math.max(1, state.vectorPlaneN - 1);
      } else {
        samples = FM.sampleVector(cur.result, d, state.N, state.t);
        spacing = spacingFor(state.N);
      }
      viz.renderVectorField(samples, {
        map: map, min: samples.min, max: samples.max,
        normalize: state.normalize, scale: state.arrowScale, spacing: spacing
      });
      updateColorbar(state.colormap, samples.min, samples.max, '|' + cur.result.label + '|', false);
      setStats(T('vectors:') + ' ' + samples.count +
        (state.vectorMode === 'plane' ? ' &nbsp;(' + state.vecPlaneAxis + ' = ' + fmt(state.vecPlaneCoord) + ' plane)' : '') +
        ' &nbsp; |F| ∈ [' + fmt(samples.min) + ', ' + fmt(samples.max) + ']' +
        (usesTime() ? ' &nbsp; t = ' + fmt(state.t) : ''));
    } else {
      viz.clearVectorField();
      var list;
      if (state.scalarMode === 'slice') list = buildSliceList(cur.result, 40);
      else list = FM.sampleScalar(cur.result, d, state.scalarN, state.t);
      var lo = list.min, hi = list.max;
      var centerZero = (lo < 0 && hi > 0);
      var opts = { map: map, centerZero: centerZero, size: sizeForScalar() };
      if (state.scalarMode === 'iso') {
        var lev = lo + state.isoLevel * (hi - lo);
        var band = 0.04 * (hi - lo) + 1e-9;
        var f2 = { pos: [], val: [], min: lo, max: hi };
        for (var i = 0; i < list.val.length; i++) if (Math.abs(list.val[i] - lev) < band) { f2.pos.push(list.pos[i]); f2.val.push(list.val[i]); }
        list = f2;
        setStats('isosurface f = ' + fmt(lev) + ' &nbsp; (' + list.pos.length + ' pts)');
      } else {
        setStats(cur.result.label + ' ∈ [' + fmt(lo) + ', ' + fmt(hi) + '] &nbsp; ' + list.pos.length + ' pts' +
          (usesTime() ? ' &nbsp; t = ' + fmt(state.t) : ''));
      }
      viz.renderScalarPoints(list, opts);
      updateColorbar(state.colormap, lo, hi, cur.result.label, centerZero);
    }

    /* streamlines overlay traces the INPUT vector field */
    if (state.streamlines && cur.input.kind === 'vector') {
      var seeds = FM.seedLattice(d, state.streamSeed);
      var lines = FM.streamlines(cur.input, seeds, d, { t: state.t });
      var smax = 0;
      for (var li = 0; li < lines.length; li++) for (var si = 0; si < lines[li].speeds.length; si++) if (lines[li].speeds[si] > smax) smax = lines[li].speeds[si];
      viz.renderStreamlines(lines, { map: map, min: 0, max: smax || 1 });
    } else viz.clearStreamlines();

    var opLabel = state.operation === 'none' ? '' : ' &nbsp;→&nbsp; <b>' + cur.result.label + '</b>';
    var inLabel = state.fieldType === 'vector'
      ? 'F = (' + esc(state.vx) + ', ' + esc(state.vy) + ', ' + esc(state.vz) + ')'
      : 'f = ' + esc(state.sf);
    setFormula(inLabel + opLabel);
    refreshScalarOpts();
    fieldCurveUpdate();
    updatePointValues();
    bodiesReadout();
  }

  function usesTime() {
    if (state.fieldType === 'vector') return /(^|[^a-z])t([^a-z]|$)/.test(state.vx + ' ' + state.vy + ' ' + state.vz);
    return /(^|[^a-z])t([^a-z]|$)/.test(state.sf);
  }
  function sizeForScalar() {
    if (state.scalarMode === 'slice') return (2 * state.R) / 40 * 1.1;
    return spacingFor(state.scalarN) * 0.5;
  }

  var parseTimer = null;

  /* an expression box with no Enter handler of its own commits through here */
  K.onExprEnter(function () { if (parseTimer) clearTimeout(parseTimer); parseFields(); });

  /* ======================================================================== */
  /*  Test bodies dropped into the field (Fields tab)                          */
  /* ======================================================================== */
  var bodies = [], bodyCounter = 0, BODY_MAX = 16, TRAIL_CAP = 600;
  var BODY_FACES = [0xff6b6b, 0xffb454, 0x63e6a0, 0x2ec4b6, 0x4cc9f0, 0xb28dff];
  var BODY_ACCENTS = [0xffd166, 0x63e6a0, 0xff5cc8, 0x4cc9f0, 0xffb454, 0xb28dff, 0xff6b6b, 0x8be9fd];

  function dropBody() {
    if (!cur.bodyF) return;
    if (bodies.length >= BODY_MAX) removeBodyAt(0);
    var v0 = [0, 0, 0];
    if (state.bodyMode === 'force') {
      var c0 = evalNum(ctl.bodyVx.value), c1 = evalNum(ctl.bodyVy.value), c2 = evalNum(ctl.bodyVz.value);
      v0 = [isFinite(c0) ? c0 : 0, isFinite(c1) ? c1 : 0, isFinite(c2) ? c2 : 0];
    }
    var b = VF.Bodies.makeBody([state.px, state.py, state.pz], v0);
    b.accent = BODY_ACCENTS[bodyCounter++ % BODY_ACCENTS.length];
    b.mesh = viz.addBody(1, BODY_FACES);            /* unit cube; size lives in the matrix */
    b.trail = viz.addBodyTrail(b.accent, TRAIL_CAP);
    b.trailPts = [b.x.slice()];
    b.escaped = false;
    bodies.push(b);
    bodiesRedraw(); bodiesReadout();
  }
  function removeBodyAt(i) { viz.removeBody(bodies[i].mesh); viz.removeBody(bodies[i].trail); bodies.splice(i, 1); }
  function clearBodies() { while (bodies.length) removeBodyAt(bodies.length - 1); bodiesReadout(); }
  /* switching the reading of F: keep positions, restart the motion state */
  function bodiesResetDynamics() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.vel = [0, 0, 0]; b.R = VF.Bodies.ident3(); b.A = VF.Bodies.ident3(); b.s = 1;
      b.trailPts = [b.x.slice()]; b.escaped = false;
      viz.setBodyFaded(b.mesh, false);
    }
    bodiesRedraw(); bodiesReadout();
  }
  function refreshBodyOpts() {
    var flow = state.bodyMode === 'flow';
    if (ctl.bodyFlowBox) ctl.bodyFlowBox.style.display = flow ? '' : 'none';
    if (ctl.bodyForceBox) ctl.bodyForceBox.style.display = flow ? 'none' : '';
  }
  function bodyBasis(b) {
    var M = (state.bodyMode === 'flow' && state.bodyDeform) ? b.A : b.R;
    var sc = state.bodySize * ((state.bodyMode === 'flow' && !state.bodyDeform && state.bodyVolume) ? b.s : 1);
    var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) B[i][j] = M[i][j] * sc;
    return B;
  }
  function bodiesRedraw() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      viz.setBodyTransform(b.mesh, b.x, bodyBasis(b));
      b.trail.visible = state.bodyTrails;
      viz.updateBodyTrail(b.trail, b.trailPts);
    }
  }
  function toggleBodies() {
    state.bodyPlaying = !state.bodyPlaying;
    ctl.bodyPlay.textContent = state.bodyPlaying ? T('❚❚ Pause bodies') : T('▶ Release bodies');
    ctl.bodyPlay.classList.toggle('active', state.bodyPlaying);
  }
  /* advance every body by one display frame (2 RK4 substeps). When the field
     animation is running AND F depends on t, the bodies' clock is LOCKED to the
     field's clock: one shared time, like the phase-space lab. */
  function frameBodies() {
    if (state.mode !== 'fields' || !cur.bodyF || !bodies.length) return;
    var locked = state.playing && usesTime();
    var hb = (locked ? state.tSpeed : state.bodySpeed) / 120;
    var tb0 = locked ? state.t - 2 * hb : state.t;
    var escR = 3 * state.R;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.escaped) continue;
      for (var sb = 0; sb < 2; sb++) {
        if (state.bodyMode === 'force') VF.Bodies.stepForce(cur.bodyF, b, tb0 + sb * hb, hb, state.bodyMass);
        else VF.Bodies.stepFlow(cur.bodyF, b, tb0 + sb * hb, hb);
      }
      if (!isFinite(b.x[0] + b.x[1] + b.x[2]) ||
          Math.abs(b.x[0]) > escR || Math.abs(b.x[1]) > escR || Math.abs(b.x[2]) > escR) {
        b.escaped = true;
        if (!isFinite(b.x[0] + b.x[1] + b.x[2])) b.x = b.trailPts[b.trailPts.length - 1].slice();
        viz.setBodyFaded(b.mesh, true);
      } else {
        b.trailPts.push(b.x.slice());
        if (b.trailPts.length > TRAIL_CAP) b.trailPts.shift();
      }
    }
    bodiesRedraw(); bodiesReadout();
  }
  function vrow3(v) { return '(' + fmt(v[0]) + ', ' + fmt(v[1]) + ', ' + fmt(v[2]) + ')'; }
  function bodiesReadout() {
    if (!ctl.bodyReadout) return;
    if (!bodies.length) {
      ctl.bodyReadout.innerHTML = '<div class="muted small">' + T('Set the point P above and drop a body, then release it and watch it ride the field.') + '</div>';
      return;
    }
    var B = VF.Bodies, b = bodies[bodies.length - 1], t = state.t, i, nEsc = 0;
    for (i = 0; i < bodies.length; i++) if (bodies[i].escaped) nEsc++;
    var html = '<div class="ro-line"><span>' + T('bodies') + '</span><b>' + bodies.length + '</b>' +
      (nEsc ? '<span>' + T('escaped') + '</span><b>' + nEsc + '</b>' : '') + '</div>';
    html += '<div class="ro-sub">' + T('latest body') + '</div><div class="ro-vec">x = ' + vrow3(b.x) + '</div>';
    var scalarIn = cur.input && cur.input.kind === 'scalar';
    if (state.bodyMode === 'flow') {
      var v = cur.bodyF(b.x[0], b.x[1], b.x[2], t);
      var L = B.jacobian(cur.bodyF, b.x, t);
      var c = B.curlOf(L), w = [c[0] / 2, c[1] / 2, c[2] / 2];
      var wm = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]);
      html += '<div class="ro-vec">v = F(x) = ' + vrow3(v) + '</div>';
      html += '<div class="ro-sub">' + T('spin') + '&nbsp; ω = ½∇×F</div><div class="ro-vec">' + vrow3(w) + ' &nbsp; |ω| = ' + fmt(wm) + '</div>';
      html += '<div class="ro-sub">' + T('volume') + '</div><div class="ro-vec">∇·F = ' + fmt(B.divOf(L)) +
        ' &nbsp; V/V₀ = ' + fmt(state.bodyDeform ? B.mat3det(b.A) : b.s * b.s * b.s) + '</div>';
      if (scalarIn) html += '<div class="muted small">' + T('f is scalar → bodies follow the gradient flow ẋ = −∇f (steepest descent). Since ∇×∇f ≡ 0, they never spin.') + '</div>';
      else html += '<div class="muted small">' + T('ẋ = F(x): the body rides the flow; it spins with ω = ½∇×F and its volume grows at rate ∇·F (Cauchy–Stokes). Try “Irrotational vortex”: bodies orbit, yet never spin.') + '</div>';
    } else {
      var sp = Math.sqrt(b.vel[0] * b.vel[0] + b.vel[1] * b.vel[1] + b.vel[2] * b.vel[2]);
      var ke = 0.5 * state.bodyMass * sp * sp;
      html += '<div class="ro-vec">v = ' + vrow3(b.vel) + ' &nbsp; |v| = ' + fmt(sp) + '</div>';
      html += '<div class="ro-sub">' + T('energy') + '</div><div class="ro-vec">T = ½m|v|² = ' + fmt(ke);
      if (scalarIn) {
        var U = cur.input.at(b.x[0], b.x[1], b.x[2], t);
        html += ' &nbsp; U = f = ' + fmt(U) + ' &nbsp; <b>E = ' + fmt(ke + U) + '</b>';
      }
      html += '</div>';
      if (scalarIn) html += '<div class="muted small">' + T('f acts as a potential: F = −∇f, so m·ẍ = −∇f. The total energy E = ½m|v|² + f is conserved. Watch it stay constant.') + '</div>';
      else html += '<div class="muted small">' + T('m·ẍ = F(x): Newton. A point mass does <b>not</b> spin: for a force field, ∇×F measures non-conservativity (∮F·dr ≠ 0), not rotation. Switch the reading to “velocity field” to see spin.') + '</div>';
    }
    if (state.playing && usesTime()) html += '<div class="muted small">' + T('F depends on t and the field clock is running: the bodies’ clock is locked to it.') + '</div>';
    ctl.bodyReadout.innerHTML = html;
  }

  /* ======================================================================== */
  /*  Panel construction                                                       */
  /* ======================================================================== */
  function buildFieldsPanel() {
    var panel = mk('div', { 'class': 'panel-body' });

    /* field type */
    var typeSel = select([{ v: 'vector', label: 'Vector field  F(x,y,z)' }, { v: 'scalar', label: 'Scalar field  f(x,y,z)' }],
      state.fieldType, function (v) {
        state.fieldType = v;
        /* drop an operator that doesn't apply to the new field type */
        if (v === 'scalar' && (state.operation === 'divergence' || state.operation === 'curl' || state.operation === 'magnitude')) state.operation = 'none';
        if (v === 'vector' && state.operation === 'gradient') state.operation = 'none';
        if (ctl.opSel) ctl.opSel.value = state.operation;
        refreshFieldInputs(); parseFields();
      });
    panel.appendChild(field('Field type', typeSel));

    /* vector inputs */
    ctl.vx = exprInput(state.vx, function (v) { state.vx = v; requestParse(); });
    ctl.vy = exprInput(state.vy, function (v) { state.vy = v; requestParse(); });
    ctl.vz = exprInput(state.vz, function (v) { state.vz = v; requestParse(); });
    ctl.vectorBox = mk('div', {}, [
      field('Fx', ctl.vx), field('Fy', ctl.vy), field('Fz', ctl.vz)
    ]);
    ctl.sf = exprInput(state.sf, function (v) { state.sf = v; requestParse(); });
    ctl.scalarBox = mk('div', {}, [field('f(x,y,z,t)', ctl.sf)]);
    panel.appendChild(ctl.vectorBox);
    panel.appendChild(ctl.scalarBox);

    /* operator */
    ctl.opSel = select([
      { v: 'none', label: 'none: show the field' },
      { v: 'gradient', label: '∇f: gradient (scalar → vector)' },
      { v: 'divergence', label: '∇·F: divergence (vector → scalar)' },
      { v: 'curl', label: '∇×F: curl / rotation (vector → vector)' },
      { v: 'laplacian', label: '∇²: Laplacian' },
      { v: 'magnitude', label: '|F|: magnitude (vector → scalar)' }
    ], state.operation, function (v) { state.operation = v; parseFields(); });
    panel.appendChild(field('Operator', ctl.opSel, 'what to display'));

    /* presets */
    panel.appendChild(sectionTitle('Presets'));
    ctl.presetBox = mk('div', { 'class': 'presets' });
    panel.appendChild(ctl.presetBox);
    ctl.presetDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.presetDesc);
    refreshPresets();

    /* field designer: construct a field whose property holds as an identity */
    panel.appendChild(sectionTitle('Field designer'));
    ctl.designSel = mk('select', { 'class': 'sel' });
    ctl.designSel.addEventListener('change', function () { state.designKind = ctl.designSel.value; });
    panel.appendChild(field('Property', ctl.designSel, 'guaranteed by construction'));
    panel.appendChild(button('Generate a field', 'wide', generateDesign));
    ctl.designInfo = mk('div', { 'class': 'readout' });
    panel.appendChild(ctl.designInfo);

    /* values of the operators (∇·F, ∇×F, …) at a movable point P */
    panel.appendChild(sectionTitle('Values at a point'));
    panel.appendChild(field('', checkbox('Show ∇·F, ∇×F, … at a point P', state.pointValuesOn, function (v) { state.pointValuesOn = v; refreshPointValuesVis(); updatePointValues(); })));
    ctl.pointValuesBox = mk('div', {}, []);
    var pvx = regR(sliderCtl(-state.R, state.R, 0.05, state.px, function (v) { state.px = v; updatePointValues(); }));
    var pvy = regR(sliderCtl(-state.R, state.R, 0.05, state.py, function (v) { state.py = v; updatePointValues(); }));
    var pvz = regR(sliderCtl(-state.R, state.R, 0.05, state.pz, function (v) { state.pz = v; updatePointValues(); }));
    ctl.pvxNode = field('Px', pvx.node); ctl.pvyNode = field('Py', pvy.node); ctl.pvzNode = field('Pz', pvz.node);
    ctl.pointValuesBox.appendChild(ctl.pvxNode); ctl.pointValuesBox.appendChild(ctl.pvyNode); ctl.pointValuesBox.appendChild(ctl.pvzNode);
    ctl.pointValuesReadout = mk('div', { 'class': 'readout' });
    dom.pointValuesReadout = ctl.pointValuesReadout;
    ctl.pointValuesBox.appendChild(ctl.pointValuesReadout);
    panel.appendChild(ctl.pointValuesBox);

    /* drop test bodies into the field and watch them ride it */
    panel.appendChild(sectionTitle('Drop bodies into the field'));
    ctl.bodyModeSel = select([
      { v: 'flow', label: 'F = velocity field: fluid flow' },
      { v: 'force', label: 'F = force field: Newton m·ẍ = F' }
    ], state.bodyMode, function (v) { state.bodyMode = v; bodiesResetDynamics(); refreshBodyOpts(); });
    panel.appendChild(field('Reading of F', ctl.bodyModeSel, 'what the arrows mean physically'));
    panel.appendChild(field('', mk('div', { 'class': 'axis-row' }, [
      button('⬇ Drop at P', '', dropBody),
      button('Clear bodies', '', clearBodies)
    ]), 'a body drops exactly at the point P above'));
    ctl.bodyPlay = button('▶ Release bodies', 'wide', toggleBodies);
    panel.appendChild(ctl.bodyPlay);
    var bsp = sliderCtl(0.1, 3, 0.1, state.bodySpeed, function (v) { state.bodySpeed = v; });
    ctl.bodySpeedNode = field('speed', bsp.node);
    panel.appendChild(ctl.bodySpeedNode);
    var bsz = sliderCtl(0.15, 1.2, 0.05, state.bodySize, function (v) { state.bodySize = v; bodiesRedraw(); });
    panel.appendChild(field('body size', bsz.node));
    ctl.bodyFlowBox = mk('div', {}, [
      field('', checkbox('Grow / shrink with ∇·F (volume)', state.bodyVolume, function (v) { state.bodyVolume = v; bodiesRedraw(); })),
      field('', checkbox('Deform with ∇F (shear + stretch)', state.bodyDeform, function (v) { state.bodyDeform = v; bodiesRedraw(); }))
    ]);
    panel.appendChild(ctl.bodyFlowBox);
    ctl.bodyForceBox = mk('div', {}, []);
    var bms = sliderCtl(0.2, 5, 0.1, state.bodyMass, function (v) { state.bodyMass = v; bodiesReadout(); });
    ctl.bodyForceBox.appendChild(field('mass m', bms.node));
    ctl.bodyVx = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'v₀x' });
    ctl.bodyVy = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'v₀y' });
    ctl.bodyVz = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'v₀z' });
    ctl.bodyForceBox.appendChild(field('v₀ at drop', mk('div', { 'class': 'axis-row' }, [ctl.bodyVx, ctl.bodyVy, ctl.bodyVz]), 'initial velocity (try a tangential kick)'));
    panel.appendChild(ctl.bodyForceBox);
    panel.appendChild(field('', checkbox('Trails (pathlines)', state.bodyTrails, function (v) { state.bodyTrails = v; bodiesRedraw(); })));
    ctl.bodyReadout = mk('div', { 'class': 'readout' });
    panel.appendChild(ctl.bodyReadout);

    /* time */
    panel.appendChild(sectionTitle('Time  t'));
    ctl.play = button('▶ Play', 'wide', function () { togglePlay(); });
    var ts = sliderCtl(0, state.tMax, 0.01, state.t, function (v) { state.t = v; if (state.mode === 'fields') sampleAndRender(); });
    ctl.tSlider = ts.input; ctl.tVal = ts.out;
    panel.appendChild(field('t', ts.node));
    panel.appendChild(ctl.play);
    var tsp = sliderCtl(0.1, 4, 0.1, state.tSpeed, function (v) { state.tSpeed = v; });
    panel.appendChild(field('speed', tsp.node));

    /* display */
    panel.appendChild(sectionTitle('Display'));
    panel.appendChild(field('Colormap', select(VF.Colormaps.names, state.colormap, function (v) { state.colormap = v; refreshActive(); })));
    var rs = regDomain(sliderCtl(2, 10, 1, state.R, function (v) { setDomainR(v); refreshActive(); }));
    panel.appendChild(field('Domain ±R', rs.node));
    var as = sliderCtl(0.2, 3, 0.1, state.arrowScale, function (v) { state.arrowScale = v; if (state.mode === 'fields') sampleAndRender(); });
    ctl.arrowScaleNode = field('Arrow scale', as.node);
    panel.appendChild(ctl.arrowScaleNode);
    ctl.normNode = field('', checkbox('Normalize arrow lengths (color = magnitude)', state.normalize, function (v) { state.normalize = v; if (state.mode === 'fields') sampleAndRender(); }));
    panel.appendChild(ctl.normNode);

    /* vector-specific: layout (fill the volume, or a dense plane to reveal circles) */
    ctl.vectorOpts = mk('div', {}, []);
    ctl.vecModeSel = select([{ v: 'volume', label: 'volume (3D grid)' }, { v: 'plane', label: 'plane (dense 2D slice)' }],
      state.vectorMode, function (v) { state.vectorMode = v; refreshScalarOpts(); if (state.mode === 'fields') sampleAndRender(); });
    ctl.vectorOpts.appendChild(field('Arrow layout', ctl.vecModeSel, 'plane = clearest for circles'));
    var vn = sliderCtl(3, 24, 1, state.N, function (v) { state.N = Math.round(v); if (state.mode === 'fields') sampleAndRender(); });
    ctl.arrowGridNode = field('Arrow grid N', vn.node);
    ctl.vectorOpts.appendChild(ctl.arrowGridNode);
    ctl.vecPlaneAxisSel = select([{ v: 'x', label: 'x = const' }, { v: 'y', label: 'y = const' }, { v: 'z', label: 'z = const' }],
      state.vecPlaneAxis, function (v) { state.vecPlaneAxis = v; if (state.mode === 'fields') sampleAndRender(); });
    ctl.vecPlaneAxisNode = field('Plane', ctl.vecPlaneAxisSel);
    ctl.vectorOpts.appendChild(ctl.vecPlaneAxisNode);
    var vpc = regR(sliderCtl(-state.R, state.R, 0.1, state.vecPlaneCoord, function (v) { state.vecPlaneCoord = v; if (state.mode === 'fields') sampleAndRender(); }));
    ctl.vecPlaneCoordNode = field('Plane position', vpc.node);
    ctl.vectorOpts.appendChild(ctl.vecPlaneCoordNode);
    var vpn = sliderCtl(8, 44, 1, state.vectorPlaneN, function (v) { state.vectorPlaneN = Math.round(v); if (state.mode === 'fields') sampleAndRender(); });
    ctl.vecPlaneNNode = field('Plane density', vpn.node);
    ctl.vectorOpts.appendChild(ctl.vecPlaneNNode);
    panel.appendChild(ctl.vectorOpts);

    /* scalar-specific */
    ctl.scalarOpts = mk('div', {}, []);
    ctl.scalarModeSel = select([{ v: 'volume', label: 'volume points' }, { v: 'iso', label: 'isosurface shell' }, { v: 'slice', label: 'slice plane' }],
      state.scalarMode, function (v) { state.scalarMode = v; refreshScalarOpts(); if (state.mode === 'fields') sampleAndRender(); });
    ctl.scalarOpts.appendChild(field('Scalar view', ctl.scalarModeSel));
    var sn = sliderCtl(6, 22, 1, state.scalarN, function (v) { state.scalarN = Math.round(v); if (state.mode === 'fields') sampleAndRender(); });
    ctl.scalarNNode = field('Volume grid', sn.node);
    ctl.scalarOpts.appendChild(ctl.scalarNNode);
    var iso = sliderCtl(0, 1, 0.01, state.isoLevel, function (v) { state.isoLevel = v; if (state.mode === 'fields') sampleAndRender(); });
    ctl.isoNode = field('Iso level', iso.node);
    ctl.scalarOpts.appendChild(ctl.isoNode);
    ctl.sliceAxisSel = select([{ v: 'x', label: 'x = const' }, { v: 'y', label: 'y = const' }, { v: 'z', label: 'z = const' }],
      state.sliceAxis, function (v) { state.sliceAxis = v; if (state.mode === 'fields') sampleAndRender(); });
    ctl.sliceAxisNode = field('Slice plane', ctl.sliceAxisSel);
    ctl.scalarOpts.appendChild(ctl.sliceAxisNode);
    var sc = regR(sliderCtl(-state.R, state.R, 0.1, state.sliceCoord, function (v) { state.sliceCoord = v; if (state.mode === 'fields') sampleAndRender(); }));
    ctl.sliceCoordSlider = sc.input;
    ctl.sliceCoordNode = field('Slice position', sc.node);
    ctl.scalarOpts.appendChild(ctl.sliceCoordNode);
    panel.appendChild(ctl.scalarOpts);

    /* streamlines */
    panel.appendChild(sectionTitle('Overlays'));
    panel.appendChild(field('', checkbox('Streamlines of F (field lines)', state.streamlines, function (v) { state.streamlines = v; if (state.mode === 'fields') sampleAndRender(); })));
    var ss = sliderCtl(2, 7, 1, state.streamSeed, function (v) { state.streamSeed = Math.round(v); if (state.mode === 'fields') sampleAndRender(); });
    panel.appendChild(field('Streamline density', ss.node));
    panel.appendChild(field('', checkbox('Show axes / box / grid', state.showHelpers, function (v) { state.showHelpers = v; viz.setHelpersVisible(v); })));

    /* line integral ∮F·dr over a curve (vector fields only) */
    ctl.fieldCurveTitle = sectionTitle('Line integral  ∮ F·dr');
    panel.appendChild(ctl.fieldCurveTitle);
    ctl.fieldCurveChk = field('', checkbox('Integrate F over a curve', state.fieldCurveOn, function (v) { state.fieldCurveOn = v; refreshFieldCurveVis(); fieldCurveUpdate(); }));
    panel.appendChild(ctl.fieldCurveChk);
    ctl.fieldCurveBox = mk('div', {}, []);
    ctl.fcrx = exprInput(state.crx, function (v) { state.crx = v; requestFieldCurve(); }, fieldCurveImmediate);
    ctl.fcry = exprInput(state.cry, function (v) { state.cry = v; requestFieldCurve(); }, fieldCurveImmediate);
    ctl.fcrz = exprInput(state.crz, function (v) { state.crz = v; requestFieldCurve(); }, fieldCurveImmediate);
    ctl.fieldCurveBox.appendChild(field('x(t)', ctl.fcrx)); ctl.fieldCurveBox.appendChild(field('y(t)', ctl.fcry)); ctl.fieldCurveBox.appendChild(field('z(t)', ctl.fcrz));
    ctl.fcT0 = numInput(state.ct0, function (v) { state.ct0 = v; updateCurveRange(); requestFieldCurve(); });
    ctl.fcT1 = numInput(state.ct1, function (v) { state.ct1 = v; updateCurveRange(); requestFieldCurve(); });
    ctl.fieldCurveBox.appendChild(field('t from … to', mk('div', { 'class': 'axis-row' }, [ctl.fcT0, ctl.fcT1])));
    var cpb = mk('div', { 'class': 'presets' });
    FIELD_CURVE_PRESETS.forEach(function (p) { cpb.appendChild(button(p.name, 'preset', function () { applyCurvePreset(p); })); });
    ctl.fieldCurveBox.appendChild(cpb);
    ctl.fcPlay = button('▶ Play trace', 'wide', function () { toggleCurve(); });
    ctl.fieldCurveBox.appendChild(ctl.fcPlay);
    var tvs = sliderCtl(state.ct0, state.ct1, 0.01, state.ctval, function (v) { state.ctval = v; if (cur.fieldCurve) drawFieldCurve(); });
    ctl.fcTval = tvs.input; ctl.fcTvalVal = tvs.out;
    ctl.fieldCurveBox.appendChild(field('trace t', tvs.node));
    ctl.fieldCurveReadout = mk('div', { 'class': 'readout' });
    dom.fieldCurveReadout = ctl.fieldCurveReadout;
    ctl.fieldCurveBox.appendChild(ctl.fieldCurveReadout);
    panel.appendChild(ctl.fieldCurveBox);

    return panel;
  }

  function refreshFieldCurveVis() {
    var vec = state.fieldType === 'vector';
    ctl.fieldCurveTitle.style.display = vec ? '' : 'none';
    ctl.fieldCurveChk.style.display = vec ? '' : 'none';
    ctl.fieldCurveBox.style.display = (vec && state.fieldCurveOn) ? '' : 'none';
  }

  var fieldCurveTimer = null;
  function requestFieldCurve() { if (fieldCurveTimer) clearTimeout(fieldCurveTimer); fieldCurveTimer = setTimeout(fieldCurveUpdate, 220); }
  function fieldCurveImmediate() { if (fieldCurveTimer) clearTimeout(fieldCurveTimer); fieldCurveUpdate(); }
  function applyCurvePreset(p) {
    state.crx = p.r[0]; state.cry = p.r[1]; state.crz = p.r[2];
    ctl.fcrx.value = p.r[0]; ctl.fcry.value = p.r[1]; ctl.fcrz.value = p.r[2];
    if (p.t) { state.ct0 = p.t[0]; state.ct1 = p.t[1]; state.ctval = p.t[0]; ctl.fcT0.value = fmt(p.t[0]); ctl.fcT1.value = fmt(p.t[1]); updateCurveRange(); }
    fieldCurveUpdate();
  }
  function fieldCurveUpdate() {
    if (state.mode !== 'fields' || !state.fieldCurveOn || state.fieldType !== 'vector') { viz.clearFunc(); cur.fieldCurve = null; return; }
    computeFieldCurve();
    if (cur.fieldCurve) drawFieldCurve(); else viz.clearFunc();
  }
  function computeFieldCurve() {
    var P = VF.Parser, ex = [state.crx, state.cry, state.crz], ins = [ctl.fcrx, ctl.fcry, ctl.fcrz], ok = true;
    for (var i = 0; i < 3; i++) { var vv = P.validate(ex[i]); markInput(ins[i], vv.ok); if (!vv.ok) ok = false; }
    if (!ok || !cur.input || cur.input.kind !== 'vector') { cur.fieldCurve = null; return; }
    var rc = [P.compile(ex[0]), P.compile(ex[1]), P.compile(ex[2])], tt = state.t;
    var curveAt = function (t) { return [rc[0].fn(0, 0, 0, t), rc[1].fn(0, 0, 0, t), rc[2].fn(0, 0, 0, t)]; };
    var fieldAt = function (x, y, z) { return cur.input.at(x, y, z, tt); };
    var li = VF.FieldMath.lineIntegral(curveAt, fieldAt, state.ct0, state.ct1, 600);
    cur.fieldCurve = { curveAt: curveAt, rAsts: [rc[0].ast, rc[1].ast, rc[2].ast], li: li };
  }
  /* ṙ(t): exact by autodiff where the expression allows it, central difference
     otherwise. Drives the tangent arrow on the traced curve. */
  function curveVelocity(f, tv) {
    var AD = VF.Autodiff, Pt = { x: 0, y: 0, z: 0, t: tv };
    try { return [AD.taylorCoeffs1D(f.rAsts[0], Pt, 't', 1)[1], AD.taylorCoeffs1D(f.rAsts[1], Pt, 't', 1)[1], AD.taylorCoeffs1D(f.rAsts[2], Pt, 't', 1)[1]]; }
    catch (e) {
      var h = 1e-4, a = f.curveAt(tv + h), b = f.curveAt(tv - h);
      return [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h), (a[2] - b[2]) / (2 * h)];
    }
  }
  function updateCurveRange() {
    ctl.fcTval.min = state.ct0; ctl.fcTval.max = state.ct1;
    if (state.ctval < state.ct0 || state.ctval > state.ct1) { state.ctval = state.ct0; ctl.fcTval.value = state.ct0; ctl.fcTvalVal.value = fmt(state.ct0); }
  }
  function toggleCurve() {
    state.curvePlaying = !state.curvePlaying;
    ctl.fcPlay.textContent = state.curvePlaying ? T('❚❚ Pause') : T('▶ Play');
    ctl.fcPlay.classList.toggle('active', state.curvePlaying);
  }
  function drawFieldCurve() {
    var fc = cur.fieldCurve; if (!fc) { viz.clearFunc(); return; }
    var li = fc.li, R = state.R, cm = VF.Colormaps.get('coolwarm');
    var maxAbs = Math.max(Math.abs(li.min), Math.abs(li.max)) || 1, colors = [], i;
    for (i = 0; i < li.pts.length; i++) {
      var tt = 0.5 + 0.5 * (isFinite(li.integrand[i]) ? li.integrand[i] : 0) / maxAbs;
      tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
      var c = cm(tt); colors.push([c.r, c.g, c.b]);
    }
    var rp = fc.curveAt(state.ctval), vel = curveVelocity(fc, state.ctval);
    var vn = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]), velArrow = null;
    if (vn > 1e-9 && isFinite(vn)) { var L = R * 0.3; velArrow = { from: rp, to: [rp[0] + vel[0] / vn * L, rp[1] + vel[1] / vn * L, rp[2] + vel[2] / vn * L] }; }
    viz.renderFuncCurve({ pts: li.pts, colors: colors, marker: (isFinite(rp[0]) ? rp : null), velocity: velArrow }, {});
    fieldCurveReadout(fc);
  }
  function fieldCurveReadout(fc) {
    var li = fc.li, closed = li.endpointGap < 0.04 * (2 * state.R);
    /* conservative-looking: closed loop with ~0 circulation; either the field does no
       tangential work at all (unsigned ≈ 0), or positive/negative work cancels. */
    var conservative = closed && (li.unsigned < 1e-9 || Math.abs(li.value) < 0.02 * li.unsigned);
    var html = '<div class="ro-line"><span>∮ F·dr</span><b>' + fmt(li.value) + '</b><span>' + T('length') + '</span><b>' + fmt(li.arcLength) + '</b></div>';
    html += '<div class="ro-sub">' + (closed ? T('closed loop') : T('open path')) + ' &nbsp; t = ' + fmt(state.ctval) + '</div>';
    if (conservative) html += '<div class="hint-good">' + T('≈ 0 around a closed loop → the work is path-independent here, so F looks <b>conservative</b> (F = ∇φ for a potential φ).') + '</div>';
    else if (closed) html += '<div class="muted small">' + T('Nonzero circulation around a closed loop ⇒ F is <b>not</b> conservative here (it has curl, no single-valued potential).') + '</div>';
    else html += '<div class="muted small">' + T('Work of F from the start to the end of the path. Colour = F·T̂ (warm = with the field, blue = against).') + '</div>';
    dom.fieldCurveReadout.innerHTML = html;
  }

  function refreshFieldInputs() {
    var vec = state.fieldType === 'vector';
    ctl.vectorBox.style.display = vec ? '' : 'none';
    ctl.scalarBox.style.display = vec ? 'none' : '';
    refreshFieldCurveVis();
    refreshPointValuesVis();
    refreshPresets();
    refreshDesignOpts();
  }

  /* the designer follows the field type: vector recipes vs scalar recipes */
  function refreshDesignOpts() {
    if (!ctl.designSel) return;
    var vec = state.fieldType === 'vector', list = [], i;
    for (i = 0; i < VF.Design.LIST.length; i++) if (VF.Design.LIST[i].vector === vec) list.push(VF.Design.LIST[i]);
    ctl.designSel.innerHTML = '';
    var valid = false;
    for (i = 0; i < list.length; i++) {
      ctl.designSel.appendChild(mk('option', { value: list[i].kind, text: T(list[i].label) }));
      if (list[i].kind === state.designKind) valid = true;
    }
    if (!valid) state.designKind = list[0].kind;
    ctl.designSel.value = state.designKind;
  }
  function generateDesign() {
    var d = VF.Design.make(state.designKind, Math.random);
    if (d.vector) {
      state.vx = d.fx; state.vy = d.fy; state.vz = d.fz;
      ctl.vx.value = d.fx; ctl.vy.value = d.fy; ctl.vz.value = d.fz;
    } else {
      state.sf = d.f; ctl.sf.value = d.f;
    }
    ctl.designInfo.innerHTML =
      '<div class="ro-sub">' + T('construction') + '</div><div class="ro-vec">' + d.cons + '</div>' +
      '<div class="muted small">' + T(d.why) + '</div>' +
      '<div class="muted small">▸ <b>' + T('Try:') + '</b> ' + T(d.tryIt) + '</div>';
    parseFields();
  }

  function refreshPointValuesVis() { ctl.pointValuesBox.style.display = state.pointValuesOn ? '' : 'none'; }

  /* the actual computed values (∇·F, ∇×F, ∇²F, ∇f, …) at the point P, using the
     SAME finite-difference operators that produce the graph, so the numbers match. */
  function updatePointValues() {
    if (state.mode !== 'fields' || !state.pointValuesOn || !cur.input) { viz.clearPointMarker(); return; }
    var FM = VF.FieldMath, px = state.px, py = state.py, pz = state.pz, t = state.t;
    viz.setPointMarker([px, py, pz], 0xff5cc8, state.R * 0.03);
    function shown(op) { return state.operation === op ? ' <span class="shown">◀ in graph</span>' : ''; }
    var html = '<div class="ro-line"><span>P</span><b>(' + fmt(px) + ', ' + fmt(py) + ', ' + fmt(pz) + ')</b></div>';
    if (cur.input.kind === 'vector') {
      var F = cur.input.at(px, py, pz, t);
      var mag = Math.sqrt(F[0] * F[0] + F[1] * F[1] + F[2] * F[2]);
      var dv = FM.div(cur.input).at(px, py, pz, t);
      var cu = FM.curl(cur.input).at(px, py, pz, t);
      var lp = FM.laplacian(cur.input).at(px, py, pz, t);
      html += '<div class="ro-sub">F(P)' + shown('none') + '</div><div class="ro-vec">' + vrow(F) + ' &nbsp; |F| = ' + fmt(mag) + shown('magnitude') + '</div>';
      html += '<div class="ro-sub">∇·F&nbsp; divergence' + shown('divergence') + '</div><div class="ro-vec">' + fmt(dv) + '</div>';
      html += '<div class="ro-sub">∇×F&nbsp; curl (rotation)' + shown('curl') + '</div><div class="ro-vec">' + vrow(cu) + '</div>';
      html += '<div class="ro-sub">∇²F&nbsp; Laplacian' + shown('laplacian') + '</div><div class="ro-vec">' + vrow(lp) + '</div>';
    } else {
      var fv = cur.input.at(px, py, pz, t);
      var gr = FM.grad(cur.input).at(px, py, pz, t);
      var lp2 = FM.laplacian(cur.input).at(px, py, pz, t);
      html += '<div class="ro-line"><span>f(P)' + shown('none') + '</span><b>' + fmt(fv) + '</b></div>';
      html += '<div class="ro-sub">∇f&nbsp; gradient' + shown('gradient') + '</div><div class="ro-vec">' + vrow(gr) + '</div>';
      html += '<div class="ro-sub">∇²f&nbsp; Laplacian' + shown('laplacian') + '</div><div class="ro-vec">' + fmt(lp2) + '</div>';
    }
    dom.pointValuesReadout.innerHTML = html;
  }
  function refreshScalarOpts() {
    var scalarResult = cur.result && cur.result.kind === 'scalar';
    ctl.scalarOpts.style.display = scalarResult ? '' : 'none';
    ctl.scalarNNode.style.display = state.scalarMode === 'volume' || state.scalarMode === 'iso' ? '' : 'none';
    ctl.isoNode.style.display = state.scalarMode === 'iso' ? '' : 'none';
    ctl.sliceAxisNode.style.display = state.scalarMode === 'slice' ? '' : 'none';
    ctl.sliceCoordNode.style.display = state.scalarMode === 'slice' ? '' : 'none';
    var arrowRel = cur.result && cur.result.kind === 'vector';
    ctl.arrowScaleNode.style.display = arrowRel ? '' : 'none';
    ctl.normNode.style.display = arrowRel ? '' : 'none';
    ctl.vectorOpts.style.display = arrowRel ? '' : 'none';
    var plane = state.vectorMode === 'plane';
    ctl.arrowGridNode.style.display = arrowRel && !plane ? '' : 'none';
    ctl.vecPlaneAxisNode.style.display = arrowRel && plane ? '' : 'none';
    ctl.vecPlaneCoordNode.style.display = arrowRel && plane ? '' : 'none';
    ctl.vecPlaneNNode.style.display = arrowRel && plane ? '' : 'none';
  }
  function refreshPresets() {
    var list = state.fieldType === 'vector' ? VF.Presets.vector : VF.Presets.scalar;
    ctl.presetBox.innerHTML = '';
    list.forEach(function (p) {
      ctl.presetBox.appendChild(button(p.name, 'preset', function () { applyPreset(p); }));
    });
  }
  function applyPreset(p) {
    if (state.fieldType === 'vector') {
      state.vx = p.fx; state.vy = p.fy; state.vz = p.fz;
      ctl.vx.value = p.fx; ctl.vy.value = p.fy; ctl.vz.value = p.fz;
    } else {
      state.sf = p.f; ctl.sf.value = p.f;
    }
    ctl.presetDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    parseFields();
  }

  function togglePlay() {
    state.playing = !state.playing;
    ctl.play.textContent = state.playing ? T('❚❚ Pause') : T('▶ Play');
    ctl.play.classList.toggle('active', state.playing);
  }

  /* curve presets for the line integral ∮F·dr */
  var FIELD_CURVE_PRESETS = [
    { name: 'circle', r: ['cos(t)', 'sin(t)', '0'], t: [0, 6.2832] },
    { name: 'ellipse', r: ['2*cos(t)', 'sin(t)', '0'], t: [0, 6.2832] },
    { name: 'segment', r: ['t', 't', '0'], t: [-3, 3] },
    { name: 'helix', r: ['cos(t)', 'sin(t)', '0.25*t'], t: [0, 12.566] },
    { name: 'big loop', r: ['3*cos(t)', '3*sin(t)', '0'], t: [0, 6.2832] },
    { name: 'lissajous', r: ['2*sin(2*t)', '1.6*sin(3*t)', '0'], t: [0, 6.2832] }
  ];


  K.lab({
    key: 'fields', label: 'Fields', panel: buildFieldsPanel,
    refresh: function () { refreshFieldInputs(); refreshBodyOpts(); bodiesReadout(); },
    enter: parseFields,
    /* Fields is the tab index.html opens on, so it renders once without a switchMode */
    start: function () { parseFields(); refreshScalarOpts(); },
    render: sampleAndRender,
    togglePlay: togglePlay,
    frame: function () {
      if (state.playing) {
        state.t += state.tSpeed / 60;
        if (state.t > state.tMax) state.t -= state.tMax;
        animSync(ctl.tSlider, ctl.tVal, state.t);
        sampleAndRender();
      }
      if (state.bodyPlaying) frameBodies();
      if (state.fieldCurveOn && state.curvePlaying && cur.fieldCurve) {
        var span = state.ct1 - state.ct0;
        state.ctval += state.curveSpeed * span / 300;         /* ~5 s to traverse */
        if (state.ctval > state.ct1) state.ctval = state.ct0;
        animSync(ctl.fcTval, ctl.fcTvalVal, state.ctval);
        drawFieldCurve();
      }
    },
    /* test seam: advance the dropped bodies deterministically (E2E / screenshots) */
    stepBodies: frameBodies
  });

})(window.VF = window.VF || {});
