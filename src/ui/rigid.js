/* =============================================================================
 * ui/rigid.js: the Rigid body lab: the inertia tensor from primitives,
 * principal axes, torque-free Euler equations and the Dzhanibekov flip
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, checkbox = K.checkbox, button = K.button, setFormula = K.setFormula, setStats = K.setStats, hideColorbar = K.hideColorbar;
  var numInput = K.numInput;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  RIGID: the torque-free spinning top (Euler equations)                   */
  /* ------------------------------------------------------------------------ */
  /*  The body is built from primitives (VF.RigidShapes); its inertia tensor   */
  /*  is diagonalised, Euler's equations run in the PRINCIPAL frame (I diag,   */
  /*  ω in principal coords) and the drawn orientation is R·Qᵀ, so at t = 0    */
  /*  the body appears exactly as built (R starts at Q, not at 1).             */
  /* ======================================================================== */
  function m3T(A) { return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]]; }
  function m3v(A, v) {
    return [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
            A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
            A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
  }
  function qcol(Q, i) { return [Q[0][i], Q[1][i], Q[2][i]]; }
  function copyParts(ps) { return JSON.parse(JSON.stringify(ps)); }
  function rigidParts() {
    if (!state.rgParts) state.rgParts = copyParts(VF.RigidShapes.find(state.rgShape).parts);
    return state.rgParts;
  }
  function rigidInit() {
    var RS = VF.RigidShapes, comp, drawParts, anchor = state.rgAnchor;
    if (state.rgShape === 'moments') {
      /* abstract mode: the sliders ARE the principal moments; body = the box
         with exactly these moments (full sides 2s, m = 1), Q = identity */
      var I = [state.rgI1, state.rgI2, state.rgI3], s = VF.Rigid.boxSides(I);
      comp = { M: 1, com: [0, 0, 0], ref: [0, 0, 0], I: I.slice(), Q: VF.Bodies.ident3() };
      drawParts = [{ type: 'box', m: 1, dims: [2 * s[0], 2 * s[1], 2 * s[2]], pos: [0, 0, 0] }];
      anchor = 'com';
    } else {
      drawParts = rigidParts();
      /* the rotation centre: the COM for a free body, or a pivot you place;
         about a fixed pivot the tensor is Steiner-shifted and Euler's equations
         hold unchanged (the pivot force has no torque about the pivot). */
      comp = RS.compoundAbout(drawParts, anchor === 'pivot' ? [state.rgPivX, state.rgPivY, state.rgPivZ] : null);
      if (!comp) {
        cur.rigid = null;
        viz.rigidCompound([], [0, 0, 0], {});
        viz.clearFunc();
        if (dom.rgReadout) dom.rgReadout.innerHTML = '<div class="muted small">' + T('no parts with mass: add one below.') + '</div>';
        return;
      }
    }
    /* initial spin: chosen axis (built frame) × Ω, converted to the principal
       frame ω_P = Qᵀ ω_B; principal picks get a small ε seed on the others */
    var Om = state.rgOmega, wP, axB;
    if (state.rgAxisMode === 'custom') {
      var n = [state.rgAxX, state.rgAxY, state.rgAxZ];
      var nm = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
      if (nm < 1e-9) { n = [1, 0, 0]; nm = 1; }
      axB = [n[0] / nm, n[1] / nm, n[2] / nm];
      wP = m3v(m3T(comp.Q), [axB[0] * Om, axB[1] * Om, axB[2] * Om]);
    } else {
      var idx = state.rgAxisMode === 'e1' ? 0 : (state.rgAxisMode === 'e3' ? 2 : 1);
      var e = Om * state.rgEps;
      wP = [e, e, e]; wP[idx] = Om;
      axB = qcol(comp.Q, idx);
    }
    var R0 = [comp.Q[0].slice(), comp.Q[1].slice(), comp.Q[2].slice()];
    /* where the rotation centre sits in space:
         'com': the COM is pinned to the origin (the textbook picture);
         'free': the built coordinates are kept, so the COM lands where your
                   part positions put it and the axes need not cross the body
                   (a free body's COM stays put: no force, no acceleration);
         'pivot': the pivot is held fixed at its built location.            */
    var ref = comp.ref || comp.com, org = anchor === 'com' ? [0, 0, 0] : ref.slice();
    var lever = [comp.com[0] - ref[0], comp.com[1] - ref[1], comp.com[2] - ref[2]];
    var offCom = Math.abs(lever[0]) + Math.abs(lever[1]) + Math.abs(lever[2]) > 1e-9;
    cur.rigid = {
      I: comp.I, Q: comp.Q, M: comp.M, com: comp.com, ref: ref, org: org, anchor: anchor, lever: lever,
      w: wP.slice(), R: R0,
      trail: [], E0: VF.Rigid.energy2T(comp.I, wP), L0: VF.Rigid.Lspace(comp.I, wP, R0), t: 0
    };
    var aL = Math.min(state.R * 0.96, VF.RigidShapes.extent(drawParts, ref) * 1.18);
    viz.rigidCompound(drawParts, ref, {
      Q: comp.Q, axisLen: aL, spinAxis: axB, spinLen: aL * 1.22, showAxes: state.rgShowAxes,
      comMark: (state.rgShowCom && offCom) ? lever : null, pivotMark: anchor === 'pivot',
      markR: Math.max(0.06, Math.min(0.16, aL * 0.045))
    });
    renderRigid();
  }
  function renderRigid() {
    if (state.mode !== 'rigid') return;
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix(); viz.clearPointMarker();
    hideColorbar();
    var rg = cur.rigid;
    if (!rg) { rigidInit(); return; }
    viz.rigidTransform(VF.Bodies.mat3mul(rg.R, m3T(rg.Q)), rg.org);   /* built→space = R·Qᵀ, about rg.org */
    viz.clearFunc();
    var R = state.R, o = rg.org;
    var L = VF.Rigid.Lspace(rg.I, rg.w, rg.R), Lm = Math.sqrt(L[0] * L[0] + L[1] * L[1] + L[2] * L[2]) || 1;
    var ws = [
      rg.R[0][0] * rg.w[0] + rg.R[0][1] * rg.w[1] + rg.R[0][2] * rg.w[2],
      rg.R[1][0] * rg.w[0] + rg.R[1][1] * rg.w[1] + rg.R[1][2] * rg.w[2],
      rg.R[2][0] * rg.w[0] + rg.R[2][1] * rg.w[1] + rg.R[2][2] * rg.w[2]
    ];
    var wm = Math.sqrt(ws[0] * ws[0] + ws[1] * ws[1] + ws[2] * ws[2]) || 1;
    /* L and ω are anchored at the rotation centre: that is the point they are
       taken about (the COM for a free body, the pivot when the body is pinned) */
    if (state.rgShowL) VF.vizHelpers.addArrowTo(viz.groupFunc, o, [o[0] + L[0] / Lm * R * 0.8, o[1] + L[1] / Lm * R * 0.8, o[2] + L[2] / Lm * R * 0.8], 0x63e6a0, { headLen: R * 0.06 });
    if (state.rgShowW) VF.vizHelpers.addArrowTo(viz.groupFunc, o, [o[0] + ws[0] / wm * R * 0.58, o[1] + ws[1] / wm * R * 0.58, o[2] + ws[2] / wm * R * 0.58], 0xffd166, { headLen: R * 0.055 });
    if (state.rgTrail && rg.trail.length > 1) viz.renderFunctionCurve({ main: rg.trail }, { color: 0xff5cc8 });
    setFormula('I ω̇ = (Iω) × ω &nbsp;·&nbsp; I = diag(' + fmt(rg.I[0]) + ', ' + fmt(rg.I[1]) + ', ' + fmt(rg.I[2]) + ') &nbsp;·&nbsp; L = ' + T('const (space)'));
    var E = VF.Rigid.energy2T(rg.I, rg.w);
    setStats('2T = ' + fmt(E) + ' &nbsp;·&nbsp; |L| = ' + fmt(Lm) + ' &nbsp;·&nbsp; t = ' + fmt(rg.t));
    rigidReadout();
  }
  function rigidReadout() {
    if (!dom.rgReadout || !cur.rigid) return;
    var rg = cur.rigid, E = VF.Rigid.energy2T(rg.I, rg.w), L = VF.Rigid.Lspace(rg.I, rg.w, rg.R);
    var Lm = Math.sqrt(L[0] * L[0] + L[1] * L[1] + L[2] * L[2]);
    var L0m = Math.sqrt(rg.L0[0] * rg.L0[0] + rg.L0[1] * rg.L0[1] + rg.L0[2] * rg.L0[2]) || 1;
    var drift = Math.sqrt((L[0] - rg.L0[0]) * (L[0] - rg.L0[0]) + (L[1] - rg.L0[1]) * (L[1] - rg.L0[1]) + (L[2] - rg.L0[2]) * (L[2] - rg.L0[2])) / L0m;
    var html = '<div class="ro-line"><span>' + T(rg.anchor === 'pivot' ? 'principal moments (about P)' : 'principal moments') + '</span><b>' + fmt(rg.I[0]) + ' ≤ ' + fmt(rg.I[1]) + ' ≤ ' + fmt(rg.I[2]) + '</b><span>M</span><b>' + fmt(rg.M) + '</b></div>';
    html += '<div class="ro-line"><span>2T = ω·Iω</span><b>' + fmt(E) + '</b><span>' + T('drift') + '</span><b>' + fmt((E - rg.E0) / (rg.E0 || 1)) + '</b></div>';
    html += '<div class="ro-line"><span>|L|</span><b>' + fmt(Lm) + '</b><span>' + T('L drift (space)') + '</span><b>' + fmt(drift) + '</b></div>';
    html += '<div class="ro-vec">ω (' + T('principal frame') + ') = (' + fmt(rg.w[0]) + ', ' + fmt(rg.w[1]) + ', ' + fmt(rg.w[2]) + ')</div>';
    /* which principal axis dominates ω, and is it stable? (tennis-racket theorem) */
    var aw = [Math.abs(rg.w[0]), Math.abs(rg.w[1]), Math.abs(rg.w[2])], kx = aw[0] > aw[1] ? (aw[0] > aw[2] ? 0 : 2) : (aw[1] > aw[2] ? 1 : 2);
    var Ik = rg.I[kx], Io = [rg.I[(kx + 1) % 3], rg.I[(kx + 2) % 3]];
    var stable = (Ik - Io[0]) * (Ik - Io[1]) > 0;
    html += stable
      ? '<div class="hint-good">' + T('Rotation near a stable axis (largest or smallest moment): the wobble stays bounded.') + '</div>'
      : '<div class="hint-bad">' + T('Rotation near the MIDDLE axis, unstable (tennis-racket theorem): watch the Dzhanibekov flips. Energy and L are still conserved; only the orientation tumbles.') + '</div>';
    if (state.rgShape === 'moments' && (rg.I[0] + rg.I[1] < rg.I[2] || rg.I[1] + rg.I[2] < rg.I[0] || rg.I[2] + rg.I[0] < rg.I[1]))
      html += '<div class="muted small">' + T('Note: every real body satisfies I_k ≤ I_i + I_j (a flat plate saturates it); these moments are unphysical, so the drawn box is only indicative. The Euler dynamics still applies.') + '</div>';
    /* where the body is and what it turns about: the placement block */
    var lev = rg.lever || [0, 0, 0];
    var levM = Math.sqrt(lev[0] * lev[0] + lev[1] * lev[1] + lev[2] * lev[2]);
    if (state.rgShape !== 'moments') {
      html += '<div class="ro-vec">' + T('centre of mass') + ' = (' + fmt(rg.com[0]) + ', ' + fmt(rg.com[1]) + ', ' + fmt(rg.com[2]) + ')'
        + ' &nbsp;·&nbsp; ' + T('turns about') + ' (' + fmt(rg.ref[0]) + ', ' + fmt(rg.ref[1]) + ', ' + fmt(rg.ref[2]) + ')</div>';
      if (rg.anchor === 'pivot')
        html += '<div class="muted small">' + T('Pinned at the red dot: the holding force acts AT P, so it has no torque about P and L_P is still conserved; Euler’s equations hold with the Steiner-shifted tensor I_P = I_com + M(|d|²·1 − d dᵀ).') + ' |d| = ' + fmt(levM) + '. '
          + T('The white dot is the centre of mass. Watch it orbit the pivot.') + '</div>';
      else if (rg.anchor === 'free')
        html += '<div class="muted small">' + T('Built coordinates kept: the body sits where you placed its parts and turns about its own centre of mass (white dot), which stays put: a free body feels no force. The principal moments do not depend on where you put it.') + '</div>';
      else if (Math.abs(rg.com[0]) + Math.abs(rg.com[1]) + Math.abs(rg.com[2]) > 1e-9)
        html += '<div class="muted small">' + T('drawn about the centre of mass') + ': ' + T('to keep your part positions instead, switch the rotation centre above.') + '</div>';
    }
    html += '<div class="muted small">' + T('Principal axes: e₁ cyan (smallest I), e₂ orange (middle), e₃ violet (largest), the eigenvectors of the inertia tensor of YOUR body. Dashed gold: the body-fixed spin axis you chose. Watch it separate from the solid gold ω arrow as instability develops.') + '</div>';
    html += '<div class="muted small">' + T('Green = L, fixed in space (torque-free). Yellow = ω, which wanders: the magenta trail of its tip is the wobble.') + '</div>';
    dom.rgReadout.innerHTML = html;
  }
  function toggleRigidPlay() { state.rgPlaying = !state.rgPlaying; ctl.rgPlay.textContent = state.rgPlaying ? T('❚❚ Pause') : T('▶ Spin'); ctl.rgPlay.classList.toggle('active', state.rgPlaying); }
  var RG_TYPE_DIMS = { box: [1.6, 1.0, 0.6], sphere: [0.5], ellipsoid: [1.2, 0.8, 0.5], cylinder: [0.3, 2.0], ring: [1.0, 0.15] };
  var RG_DIM_HINT = { box: 'a·b·c', sphere: 'r', ellipsoid: 'a·b·c', cylinder: 'r·L', ring: 'R·r' };
  /* an edit to the part list turns the shape select into "custom parts" */
  function rigidEdited() {
    if (state.rgShape !== 'custom' && state.rgShape !== 'moments') {
      state.rgShape = 'custom';
      if (ctl.rgShapeSel) ctl.rgShapeSel.value = 'custom';
    }
    rigidInit();
  }
  function renderRigidParts() {
    var box = ctl.rgPartsBox;
    if (!box) return;
    box.innerHTML = '';
    var parts = rigidParts();
    parts.forEach(function (p, idx) {
      var row = mk('div', { 'class': 'part-row' });
      var line1 = mk('div', { 'class': 'prow' });
      line1.appendChild(select([
        { v: 'box', label: 'box' }, { v: 'sphere', label: 'sphere' }, { v: 'ellipsoid', label: 'ellipsoid' },
        { v: 'cylinder', label: 'cylinder' }, { v: 'ring', label: 'ring (torus)' }
      ], p.type, function (v) {
        p.type = v; p.dims = RG_TYPE_DIMS[v].slice();
        if ((v === 'cylinder' || v === 'ring') && !p.axis) p.axis = 'y';
        renderRigidParts(); rigidEdited();
      }));
      if (p.type === 'cylinder' || p.type === 'ring')
        line1.appendChild(select([{ v: 'x', label: 'axis x' }, { v: 'y', label: 'axis y' }, { v: 'z', label: 'axis z' }],
          p.axis || 'y', function (v) { p.axis = v; rigidEdited(); }));
      var mIn = numInput(p.m, function (v) { if (v > 0) { p.m = v; rigidEdited(); } });
      mIn.title = T('mass');
      line1.appendChild(mk('span', { 'class': 'mini muted', text: 'm' }));
      line1.appendChild(mIn);
      line1.appendChild(button('×', 'preset', function () { parts.splice(idx, 1); renderRigidParts(); rigidEdited(); }));
      row.appendChild(line1);
      var line2 = mk('div', { 'class': 'prow' });
      line2.appendChild(mk('span', { 'class': 'mini muted', text: RG_DIM_HINT[p.type] || '' }));
      p.dims.forEach(function (dv, di) {
        line2.appendChild(numInput(dv, function (v) { if (v > 0.01) { p.dims[di] = v; rigidEdited(); } }));
      });
      row.appendChild(line2);
      var line3 = mk('div', { 'class': 'prow' });
      line3.appendChild(mk('span', { 'class': 'mini muted', text: T('at') }));
      p.pos.forEach(function (pv, pi) {
        line3.appendChild(numInput(pv, function (v) { p.pos[pi] = v; rigidEdited(); }));
      });
      row.appendChild(line3);
      box.appendChild(row);
    });
  }
  function rigidVisibility() {
    if (ctl.rgPartsWrap) ctl.rgPartsWrap.style.display = state.rgShape === 'moments' ? 'none' : '';
    if (ctl.rgMomentsWrap) ctl.rgMomentsWrap.style.display = state.rgShape === 'moments' ? '' : 'none';
    if (ctl.rgAnchorWrap) ctl.rgAnchorWrap.style.display = state.rgShape === 'moments' ? 'none' : '';
    if (ctl.rgPivRow) ctl.rgPivRow.style.display = state.rgAnchor === 'pivot' ? '' : 'none';
    if (ctl.rgAxRow) ctl.rgAxRow.style.display = state.rgAxisMode === 'custom' ? '' : 'none';
    if (ctl.rgEpsField) ctl.rgEpsField.style.display = state.rgAxisMode === 'custom' ? 'none' : '';
  }
  function rigidDemo(shapeKey, axisMode, anchor, piv) {
    state.rgShape = shapeKey;
    state.rgParts = copyParts(VF.RigidShapes.find(shapeKey).parts);
    state.rgAxisMode = axisMode;
    state.rgAnchor = anchor || 'com';
    if (piv) { state.rgPivX = piv[0]; state.rgPivY = piv[1]; state.rgPivZ = piv[2]; }
    if (ctl.rgShapeSel) ctl.rgShapeSel.value = shapeKey;
    if (ctl.rgAxisSel) ctl.rgAxisSel.value = axisMode;
    if (ctl.rgAnchorSel) ctl.rgAnchorSel.value = state.rgAnchor;
    if (ctl.rgPivXi) { ctl.rgPivXi.value = fmt(state.rgPivX); ctl.rgPivYi.value = fmt(state.rgPivY); ctl.rgPivZi.value = fmt(state.rgPivZ); }
    rigidVisibility(); renderRigidParts(); rigidInit();
    if (!state.rgPlaying) toggleRigidPlay();
  }
  function buildRigidPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Build a rigid body from parts. The app assembles its inertia tensor (parallel-axis theorem), diagonalises it (the principal axes) and integrates Euler’s equations Iω̇ = (Iω)×ω in the principal frame. L stays constant in space; spinning near the MIDDLE principal axis is unstable (Dzhanibekov).') }));
    panel.appendChild(sectionTitle('Body'));
    var shapeOpts = [];
    VF.RigidShapes.SHAPES.forEach(function (s) { shapeOpts.push({ v: s.key, label: s.name }); });
    shapeOpts.push({ v: 'custom', label: 'custom parts…' });
    shapeOpts.push({ v: 'moments', label: 'set moments directly' });
    ctl.rgShapeSel = select(shapeOpts, state.rgShape, function (v) {
      state.rgShape = v;
      if (v !== 'custom' && v !== 'moments') state.rgParts = copyParts(VF.RigidShapes.find(v).parts);
      rigidVisibility(); renderRigidParts(); rigidInit();
    });
    panel.appendChild(field('Shape', ctl.rgShapeSel));
    ctl.rgPartsWrap = mk('div', {});
    ctl.rgPartsBox = mk('div', { 'class': 'parts-list' });
    ctl.rgPartsWrap.appendChild(ctl.rgPartsBox);
    ctl.rgPartsWrap.appendChild(button('+ add part', 'wide', function () {
      rigidParts().push({ type: 'box', m: 1, dims: RG_TYPE_DIMS.box.slice(), pos: [0, 0, 0] });
      renderRigidParts(); rigidEdited();
    }));
    panel.appendChild(ctl.rgPartsWrap);
    ctl.rgMomentsWrap = mk('div', {});
    ctl.rgI1S = sliderCtl(0.2, 5, 0.1, state.rgI1, function (v) { state.rgI1 = v; rigidInit(); });
    ctl.rgI2S = sliderCtl(0.2, 5, 0.1, state.rgI2, function (v) { state.rgI2 = v; rigidInit(); });
    ctl.rgI3S = sliderCtl(0.2, 5, 0.1, state.rgI3, function (v) { state.rgI3 = v; rigidInit(); });
    ctl.rgMomentsWrap.appendChild(field('I₁', ctl.rgI1S.node));
    ctl.rgMomentsWrap.appendChild(field('I₂', ctl.rgI2S.node));
    ctl.rgMomentsWrap.appendChild(field('I₃', ctl.rgI3S.node));
    panel.appendChild(ctl.rgMomentsWrap);
    /* --- where the body turns: about its own COM, or about a pivot you set --- */
    ctl.rgAnchorWrap = mk('div', {});
    ctl.rgAnchorSel = select([
      { v: 'com', label: 'free: COM at the origin' },
      { v: 'free', label: 'free: keep the built position' },
      { v: 'pivot', label: 'pinned at a pivot point…' }
    ], state.rgAnchor, function (v) { state.rgAnchor = v; rigidVisibility(); rigidInit(); });
    ctl.rgAnchorWrap.appendChild(field('Rotation centre', ctl.rgAnchorSel,
      'a free body turns about its COM; a pinned one about the pivot (I is Steiner-shifted there)'));
    ctl.rgPivXi = numInput(state.rgPivX, function (v) { state.rgPivX = v; rigidInit(); });
    ctl.rgPivYi = numInput(state.rgPivY, function (v) { state.rgPivY = v; rigidInit(); });
    ctl.rgPivZi = numInput(state.rgPivZ, function (v) { state.rgPivZ = v; rigidInit(); });
    ctl.rgPivRow = field('pivot P (built frame)', mk('div', { 'class': 'axis-row' }, [ctl.rgPivXi, ctl.rgPivYi, ctl.rgPivZi]),
      'the body is held at this point: put it off the COM and the COM orbits it');
    ctl.rgAnchorWrap.appendChild(ctl.rgPivRow);
    ctl.rgAnchorWrap.appendChild(field('', checkbox('mark the centre of mass', state.rgShowCom, function (v) { state.rgShowCom = v; rigidInit(); })));
    panel.appendChild(ctl.rgAnchorWrap);
    panel.appendChild(field('', checkbox('principal axes (e₁ cyan · e₂ orange · e₃ violet)', state.rgShowAxes, function (v) { state.rgShowAxes = v; rigidInit(); })));
    panel.appendChild(sectionTitle('Spin axis'));
    ctl.rgAxisSel = select([
      { v: 'e1', label: 'e₁: smallest I (stable)' },
      { v: 'e2', label: 'e₂: middle axis (unstable ▶)' },
      { v: 'e3', label: 'e₃: largest I (stable)' },
      { v: 'custom', label: 'custom axis…' }
    ], state.rgAxisMode, function (v) { state.rgAxisMode = v; rigidVisibility(); rigidInit(); });
    panel.appendChild(field('axis', ctl.rgAxisSel));
    ctl.rgAxX = numInput(state.rgAxX, function (v) { state.rgAxX = v; rigidInit(); });
    ctl.rgAxY = numInput(state.rgAxY, function (v) { state.rgAxY = v; rigidInit(); });
    ctl.rgAxZ = numInput(state.rgAxZ, function (v) { state.rgAxZ = v; rigidInit(); });
    ctl.rgAxRow = field('n (body frame)', mk('div', { 'class': 'axis-row' }, [ctl.rgAxX, ctl.rgAxY, ctl.rgAxZ]), 'direction: normalised automatically');
    panel.appendChild(ctl.rgAxRow);
    var om = sliderCtl(0.4, 6, 0.1, state.rgOmega, function (v) { state.rgOmega = v; rigidInit(); });
    panel.appendChild(field('Ω (spin rate)', om.node));
    var ep = sliderCtl(0, 0.1, 0.005, state.rgEps, function (v) { state.rgEps = v; rigidInit(); });
    ctl.rgEpsField = field('perturbation ε', ep.node, 'tiny off-axis seed: reveals (in)stability');
    panel.appendChild(ctl.rgEpsField);
    var pb = mk('div', { 'class': 'presets' });
    pb.appendChild(button('Dzhanibekov ▶', 'preset', function () { rigidDemo('thandle', 'e2'); }));
    pb.appendChild(button('racket flip ▶', 'preset', function () { rigidDemo('racket', 'e2'); }));
    /* a ring nailed to a point on its rim: the COM then circles the pivot */
    pb.appendChild(button('ring on a pin ▶', 'preset', function () { rigidDemo('ring', 'e3', 'pivot', [1.4, 0, 0]); }));
    panel.appendChild(pb);
    ctl.rgPlay = button('▶ Spin', 'wide', toggleRigidPlay);
    panel.appendChild(ctl.rgPlay);
    var sp3 = sliderCtl(0.1, 4, 0.1, state.rgSpeed, function (v) { state.rgSpeed = v; });
    panel.appendChild(field('speed', sp3.node));
    panel.appendChild(button('Reset', 'wide', rigidInit));
    panel.appendChild(sectionTitle('Show'));
    panel.appendChild(field('', checkbox('Angular momentum L (space-fixed)', state.rgShowL, function (v) { state.rgShowL = v; renderRigid(); })));
    panel.appendChild(field('', checkbox('Angular velocity ω', state.rgShowW, function (v) { state.rgShowW = v; renderRigid(); })));
    panel.appendChild(field('', checkbox('Trail of ω (the wobble)', state.rgTrail, function (v) { state.rgTrail = v; renderRigid(); })));
    panel.appendChild(sectionTitle('Readout'));
    ctl.rgReadout = mk('div', { 'class': 'readout' });
    dom.rgReadout = ctl.rgReadout;
    panel.appendChild(ctl.rgReadout);
    renderRigidParts();
    rigidVisibility();
    return panel;
  }


  K.lab({
    key: 'rigid', label: 'Rigid body', panel: buildRigidPanel,
    enter: function () { if (cur.rigid) renderRigid(); else rigidInit(); },
    togglePlay: toggleRigidPlay,
    frame: function () {
      if (!(state.rgPlaying && cur.rigid)) return;
      var rgq = cur.rigid, rq;
      for (rq = 0; rq < 4; rq++) {
        var st5 = VF.Rigid.step(rgq.I, rgq.w, rgq.R, state.rgSpeed * 0.004);
        rgq.w = st5.w; rgq.R = st5.R; rgq.t += state.rgSpeed * 0.004;
      }
      var wsp = [
        rgq.R[0][0] * rgq.w[0] + rgq.R[0][1] * rgq.w[1] + rgq.R[0][2] * rgq.w[2],
        rgq.R[1][0] * rgq.w[0] + rgq.R[1][1] * rgq.w[1] + rgq.R[1][2] * rgq.w[2],
        rgq.R[2][0] * rgq.w[0] + rgq.R[2][1] * rgq.w[1] + rgq.R[2][2] * rgq.w[2]
      ];
      var wmm = Math.sqrt(wsp[0] * wsp[0] + wsp[1] * wsp[1] + wsp[2] * wsp[2]) || 1, Rr = state.R * 0.58;
      var og = rgq.org || [0, 0, 0];      /* the ω arrow starts at the rotation centre, so does its trail */
      rgq.trail.push([og[0] + wsp[0] / wmm * Rr, og[1] + wsp[1] / wmm * Rr, og[2] + wsp[2] / wmm * Rr]);
      if (rgq.trail.length > 900) rgq.trail.shift();
      renderRigid();
    }
  });

})(window.VF = window.VF || {});
