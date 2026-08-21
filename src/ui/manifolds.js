/* =============================================================================
 * ui/manifolds.js: the Manifolds lab: parametric surfaces, level sets and
 * curves, with fundamental forms, curvature and the Frenet frame
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var regR = K.regR, regDomain = K.regDomain, setDomainR = K.setDomainR, animSync = K.animSync, select = K.select, checkbox = K.checkbox;
  var button = K.button, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats, updateColorbar = K.updateColorbar, hideColorbar = K.hideColorbar;
  var domain = K.domain, markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, vrow = K.vrow, numInput = K.numInput;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  MANIFOLDS pipeline                                                       */
  /* ======================================================================== */
  var MANIFOLD_PRESETS = {
    surface: [
      { name: 'sphere', s: ['sin(u)*cos(v)', 'sin(u)*sin(v)', 'cos(u)'], u: [0, 3.14159], v: [0, 6.28319] },
      { name: 'torus', s: ['(2+cos(u))*cos(v)', '(2+cos(u))*sin(v)', 'sin(u)'], u: [0, 6.28319], v: [0, 6.28319] },
      { name: 'saddle', s: ['u', 'v', 'u^2 - v^2'], u: [-1.6, 1.6], v: [-1.6, 1.6] },
      { name: 'monkey saddle', s: ['u', 'v', 'u^3 - 3*u*v^2'], u: [-1.3, 1.3], v: [-1.3, 1.3] },
      { name: 'helicoid', s: ['u*cos(v)', 'u*sin(v)', '0.5*v'], u: [-2, 2], v: [0, 6.28319] },
      { name: 'catenoid', s: ['cosh(u)*cos(v)', 'cosh(u)*sin(v)', 'u'], u: [-1.3, 1.3], v: [0, 6.28319] },
      { name: 'Möbius band', s: ['(2+u*cos(v/2))*cos(v)', '(2+u*cos(v/2))*sin(v)', 'u*sin(v/2)'], u: [-0.6, 0.6], v: [0, 6.28319] }
    ],
    levelset: [
      { name: 'sphere', g: 'x^2 + y^2 + z^2', c: 4 },
      { name: 'ellipsoid', g: 'x^2/4 + y^2 + z^2/2', c: 1 },
      { name: 'torus', g: '(sqrt(x^2+y^2) - 2.5)^2 + z^2', c: 1 },
      { name: 'two-sheet hyperboloid', g: 'z^2 - x^2 - y^2', c: 1 },
      { name: 'cone (singular!)', g: 'x^2 + y^2 - z^2', c: 0 },
      { name: 'gyroid', g: 'sin(x)*cos(y)+sin(y)*cos(z)+sin(z)*cos(x)', c: 0 }
    ],
    curve: [
      { name: 'helix', r: ['cos(t)', 'sin(t)', '0.22*t'], t: [0, 12.566] },
      { name: 'circle', r: ['2*cos(t)', '2*sin(t)', '0'], t: [0, 6.28319] },
      { name: 'trefoil knot', r: ['sin(t)+2*sin(2*t)', 'cos(t)-2*cos(2*t)', '-sin(3*t)'], t: [0, 6.28319] },
      { name: 'ellipse', r: ['3*cos(t)', 'sin(t)', '0'], t: [0, 6.28319] },
      { name: 'twisted cubic', r: ['t', 't^2', '0.6*t^3'], t: [-1.5, 1.5] }
    ]
  };
  var manifoldTimer = null;
  function requestManifoldParse() { if (manifoldTimer) clearTimeout(manifoldTimer); manifoldTimer = setTimeout(parseManifold, 220); }
  function manifoldImmediate() { if (manifoldTimer) clearTimeout(manifoldTimer); parseManifold(); }
  function mexpr(get, set) { return exprInput(get(), function (v) { set(v); requestManifoldParse(); }, manifoldImmediate); }
  function v3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

  function parseManifold() {
    if (state.mode !== 'manifolds') return;
    if (state.manifoldKind === 'surface') parseMSurface();
    else if (state.manifoldKind === 'levelset') parseMLevel();
    else parseMCurve();
  }

  function parseMSurface() {
    var P = VF.Parser, ex = [state.msx, state.msy, state.msz], ins = [ctl.msx, ctl.msy, ctl.msz], nm = ['X', 'Y', 'Z'];
    for (var i = 0; i < 3; i++) { var v = P.validate(ex[i]); markInput(ins[i], v.ok); if (!v.ok) { setError(nm[i] + '(u,v): ' + v.message); return; } }
    setError(null);
    var c = [P.compile(ex[0]), P.compile(ex[1]), P.compile(ex[2])];
    var fns = [c[0].fn, c[1].fn, c[2].fn], asts = [c[0].ast, c[1].ast, c[2].ast];
    var grid = VF.Manifolds.surfaceGrid(fns, state.mu0, state.mu1, state.mv0, state.mv1, state.mSurfRes);
    var local = VF.Manifolds.surfaceLocal(asts, fns, state.mpu, state.mpv);
    cur.manifold = { kind: 'surface', fns: fns, asts: asts, grid: grid, local: local };
    renderManifold(); updateManifoldReadout();
  }
  function updateMSurfacePoint() {
    var mf = cur.manifold; if (!mf || mf.kind !== 'surface') return;
    mf.local = VF.Manifolds.surfaceLocal(mf.asts, mf.fns, state.mpu, state.mpv);
    renderManifold(); updateManifoldReadout();
  }
  function parseMLevel() {
    var P = VF.Parser, v = P.validate(state.mg);
    markInput(ctl.mg, v.ok);
    if (!v.ok) { setError('g: ' + v.message); return; }
    setError(null);
    var fn = P.compile(state.mg).fn, dom = domain();
    var mesh = VF.Manifolds.marchingTets(fn, state.mLevel, dom, state.mLevelRes);
    var crit = VF.Manifolds.criticalPoints(fn, dom, 15);
    cur.manifold = { kind: 'levelset', fn: fn, mesh: mesh, crit: crit };
    renderManifold(); updateManifoldReadout();
  }
  /* footpoint of P on g = c: where the tangent plane lives (memo per P, c) */
  function mLevelSnap(mf) {
    var key = state.mgx + '|' + state.mgy + '|' + state.mgz + '|' + state.mLevel;
    if (!mf.snap || mf.snapKey !== key) {
      mf.snap = VF.Manifolds.snapToLevel(mf.fn, state.mLevel, [state.mgx, state.mgy, state.mgz], state.R * 0.3);
      mf.snapKey = key;
    }
    return mf.snap;
  }
  function mLevelPointMoved() {
    if (state.mShowLvlTangent || state.mShowLvlNormal) renderManifold();
    else viz.setPointMarker([state.mgx, state.mgy, state.mgz], 0xffe066, state.R * 0.03);
    updateManifoldReadout();
  }
  function parseMCurve() {
    var P = VF.Parser, ex = [state.mcx, state.mcy, state.mcz], ins = [ctl.mcx, ctl.mcy, ctl.mcz], nm = ['x', 'y', 'z'];
    for (var i = 0; i < 3; i++) { var v = P.validate(ex[i]); markInput(ins[i], v.ok); if (!v.ok) { setError(nm[i] + '(t): ' + v.message); return; } }
    setError(null);
    var c = [P.compile(ex[0]), P.compile(ex[1]), P.compile(ex[2])];
    var fns = [c[0].fn, c[1].fn, c[2].fn], asts = [c[0].ast, c[1].ast, c[2].ast];
    var N = state.mCurveRes, pts = [];
    for (var j = 0; j < N; j++) { var t = state.mct0 + (state.mct1 - state.mct0) * j / (N - 1); pts.push([fns[0](0, 0, 0, t), fns[1](0, 0, 0, t), fns[2](0, 0, 0, t)]); }
    cur.manifold = { kind: 'curve', fns: fns, asts: asts, pts: pts };
    renderManifold(); updateManifoldReadout();
  }

  function renderManifold() {
    if (state.mode !== 'manifolds' || !cur.manifold) return;
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix(); viz.clearPointMarker();
    var mf = cur.manifold;
    if (mf.kind === 'surface') {
      var g = mf.grid, A = Math.max(Math.abs(g.kmin), Math.abs(g.kmax)) || 1;
      viz.renderManifoldSurface({ pos: g.pos, K: g.K, res: g.res, local: mf.local },
        { showSurface: state.mShowSurf, showTangent: state.mShowTangent, showNormal: state.mShowNormal, cmin: -A, cmax: A, map: VF.Colormaps.get('coolwarm') });
      updateColorbar('coolwarm', -A, A, 'Gaussian K', true);
      setFormula('φ(u,v) = (' + esc(state.msx) + ', ' + esc(state.msy) + ', ' + esc(state.msz) + ')');
      setStats('parametric surface · area ≈ ' + fmt(g.area) + ' · χ ≈ ' + fmt(Math.round(g.chi * 10) / 10));
    } else if (mf.kind === 'levelset') {
      hideColorbar();
      var snap = (state.mShowLvlTangent || state.mShowLvlNormal) ? mLevelSnap(mf) : null;
      viz.renderImplicitSurface(mf.mesh, {
        showSurface: state.mShowIso, showNormals: state.mShowIsoNormals, critical: state.mShowCritical ? mf.crit : null,
        tangent: snap && snap.ok && !snap.singular ? { p: snap.p, n: snap.n } : null,
        showTangent: state.mShowLvlTangent, showNormal: state.mShowLvlNormal
      });
      viz.setPointMarker([state.mgx, state.mgy, state.mgz], 0xffe066, state.R * 0.03);
      setFormula('g(x,y,z) = ' + esc(state.mg) + ' &nbsp;=&nbsp; ' + fmt(state.mLevel));
      setStats('level set · ' + Math.round(mf.mesh.pos.length / 3) + ' triangles · ' + mf.crit.length + ' critical point(s)');
    } else {
      hideColorbar();
      var fr = VF.Manifolds.curveFrame(mf.asts, mf.fns, state.mctval);
      mf.frame = fr;
      viz.renderManifoldCurve({ pts: state.mShowCurve ? mf.pts : [], frame: state.mShowFrame ? { p: fr.r, T: fr.T, N: fr.N, B: fr.B } : null });
      setFormula('r(t) = (' + esc(state.mcx) + ', ' + esc(state.mcy) + ', ' + esc(state.mcz) + ')');
      setStats('curve (1-manifold) · t = ' + fmt(state.mctval) + ' · κ = ' + fmt(fr.kappa) + ' · τ = ' + fmt(fr.tau));
    }
  }

  function updateManifoldReadout() {
    var mf = cur.manifold; if (!mf) return;
    if (mf.kind === 'surface') mSurfaceReadout(mf);
    else if (mf.kind === 'levelset') mLevelReadout(mf);
    else mCurveReadout(mf);
  }
  function mSurfaceReadout(mf) {
    var l = mf.local, g = mf.grid;
    var cls = l.K > 1e-3 ? 'elliptic (K > 0, bowl-like)' : (l.K < -1e-3 ? 'hyperbolic (K < 0, saddle-like)' : (Math.abs(l.k1) + Math.abs(l.k2) > 1e-2 ? 'parabolic (K = 0, one curvature)' : 'planar'));
    var html = '<div class="ro-line"><span>φ(u,v)</span><b>' + vrow(l.phi) + '</b></div>';
    html += '<div class="ro-sub">Tangent vectors φ_u, φ_v ' + (l.adOK ? '' : '(finite-diff)') + '</div><div class="ro-vec">' + vrow(l.pu) + '<br>' + vrow(l.pv) + '</div>';
    html += '<div class="ro-sub">Unit normal n</div><div class="ro-vec">' + vrow(l.n) + '</div>';
    html += '<div class="ro-sub">First fundamental form &nbsp;E, F, G</div><div class="ro-vec">' + fmt(l.E) + ',&nbsp; ' + fmt(l.F) + ',&nbsp; ' + fmt(l.G) + '</div>';
    html += '<div class="ro-sub">Second fundamental form &nbsp;L, M, N</div><div class="ro-vec">' + fmt(l.L) + ',&nbsp; ' + fmt(l.M) + ',&nbsp; ' + fmt(l.N) + '</div>';
    html += '<div class="ro-line"><span>Gaussian K</span><b>' + fmt(l.K) + '</b><span>mean H</span><b>' + fmt(l.H) + '</b></div>';
    html += '<div class="ro-line"><span>principal κ₁, κ₂</span><b>' + fmt(l.k1) + ',&nbsp; ' + fmt(l.k2) + '</b></div>';
    html += '<div class="hint-good">Point is <b>' + cls + '</b>.</div>';
    html += '<div class="ro-sub">Global: Gauss–Bonnet</div>';
    html += '<div class="ro-line"><span>area</span><b>' + fmt(g.area) + '</b><span>∮K dA</span><b>' + fmt(g.totalK) + '</b></div>';
    html += '<div class="ro-line"><span>Euler χ = ∮K dA / 2π</span><b>' + fmt(g.chi) + '</b></div>';
    html += '<div class="muted small">χ is meaningful only for a <i>closed</i> surface fully covered by (u,v): sphere → 2, torus → 0.</div>';
    dom.manifoldReadout.innerHTML = html;
  }
  function mLevelReadout(mf) {
    var Mm = VF.Manifolds, gx = state.mgx, gy = state.mgy, gz = state.mgz;
    var gval = mf.fn(gx, gy, gz, 0), grad = Mm.gradAt(mf.fn, gx, gy, gz);
    var gn = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1] + grad[2] * grad[2]);
    var n = gn > 1e-9 ? [grad[0] / gn, grad[1] / gn, grad[2] / gn] : [0, 0, 0];
    var onSurf = Math.abs(gval - state.mLevel) < 0.06 * (2 * state.R);
    var critAtLevel = false;
    for (var i = 0; i < mf.crit.length; i++) { var cp = mf.crit[i]; if (Math.abs(mf.fn(cp[0], cp[1], cp[2], 0) - state.mLevel) < 0.15) critAtLevel = true; }
    var html = '<div class="ro-line"><span>level c</span><b>' + fmt(state.mLevel) + '</b></div>';
    html += '<div class="ro-sub">At P = (' + fmt(gx) + ', ' + fmt(gy) + ', ' + fmt(gz) + ')</div>';
    html += '<div class="ro-line"><span>g(P)</span><b>' + fmt(gval) + '</b>' + (onSurf ? '<span class="shown">on the surface</span>' : '') + '</div>';
    html += '<div class="ro-sub">∇g(P) &nbsp; |∇g| = ' + fmt(gn) + '</div><div class="ro-vec">' + vrow(grad) + '</div>';
    html += '<div class="ro-sub">unit normal ∇g / |∇g|</div><div class="ro-vec">' + vrow(n) + '</div>';
    /* tangent plane at the footpoint Q = P projected onto the level set */
    var snap = mLevelSnap(mf);
    if (snap.ok && !snap.singular) {
      html += '<div class="ro-sub">' + T('footpoint Q: P projected onto g = c (Newton along ∇g)') + '</div><div class="ro-vec">Q = ' + vrow(snap.p) + '</div>';
      var tterms = [], TVARS = ['x', 'y', 'z'];
      for (var ti = 0; ti < 3; ti++) tterms.push(fmt(snap.grad[ti]) + '·(' + TVARS[ti] + ' − ' + fmt(snap.p[ti]) + ')');
      html += '<div class="ro-sub">' + T('tangent plane at Q') + ' &nbsp; ∇g(Q)·(x − Q) = 0</div>';
      html += '<div class="ro-vec">' + tterms.join(' + ') + ' = 0</div>';
      html += '<div class="muted small">' + T('T_Q M = ker dg(Q): the tangent plane consists of exactly the directions v with ∇g(Q)·v = 0; the total derivative dg sends them to 0, so first-order motion along them stays on the level set.') + '</div>';
    } else if (snap.singular) {
      html += '<div class="hint-bad">' + T('∇g ≈ 0 at the footpoint, a singular point: the level set has no well-defined tangent plane there (regular value theorem fails).') + '</div>';
    } else {
      html += '<div class="muted small">' + T('No footpoint on g = c found near P. Move P closer to the surface.') + '</div>';
    }
    html += '<div class="ro-line"><span>critical points of g</span><b>' + mf.crit.length + '</b></div>';
    if (!critAtLevel) html += '<div class="hint-good"><b>c = ' + fmt(state.mLevel) + '</b> looks like a <b>regular value</b> (∇g ≠ 0 on g = c) → the level set is a smooth 2-submanifold. <i>(Regular value theorem.)</i></div>';
    else html += '<div class="muted small"><b>Critical value:</b> ∇g = 0 somewhere on g = c, so the level set can be <b>singular</b> (e.g. the cone tip), not a smooth manifold there.</div>';
    dom.manifoldReadout.innerHTML = html;
  }
  function mCurveReadout(mf) {
    var fr = mf.frame || VF.Manifolds.curveFrame(mf.asts, mf.fns, state.mctval);
    var Nq = 400, arc = 0, prev = null, i;
    for (i = 0; i <= Nq; i++) {
      var t = state.mct0 + (state.mct1 - state.mct0) * i / Nq, p = [mf.fns[0](0, 0, 0, t), mf.fns[1](0, 0, 0, t), mf.fns[2](0, 0, 0, t)];
      if (prev) { var d = v3(p, prev); arc += Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]); }
      prev = p;
    }
    var html = '<div class="ro-line"><span>arc length</span><b>' + fmt(arc) + '</b></div>';
    html += '<div class="ro-sub">At t = ' + fmt(state.mctval) + '</div><div class="ro-vec">r = ' + vrow(fr.r) + '</div>';
    html += '<div class="ro-sub">velocity r′ (tangent) &nbsp; speed = ' + fmt(fr.speed) + '</div><div class="ro-vec">' + vrow(fr.rp) + '</div>';
    html += '<div class="ro-line"><span>curvature κ</span><b>' + fmt(fr.kappa) + '</b><span>torsion τ</span><b>' + fmt(fr.tau) + '</b></div>';
    html += '<div class="ro-sub">Frenet frame</div><div class="ro-vec">T = ' + vrow(fr.T) + '<br>N = ' + vrow(fr.N) + '<br>B = ' + vrow(fr.B) + '</div>';
    html += '<div class="muted small">T tangent (red), N normal (green), B binormal (blue). κ bends the curve; τ twists it out of the osculating plane.</div>';
    dom.manifoldReadout.innerHTML = html;
  }

  function buildManifoldsPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Submanifolds of ℝ³ and their geometry: parametric surfaces (curvature & fundamental forms), level sets g = c (isosurface + regular-value theorem), and curves (Frenet frame, curvature, torsion).') }));

    ctl.mKindSel = select([
      { v: 'surface', label: 'Parametric surface  φ(u,v)' }, { v: 'levelset', label: 'Level set  g(x,y,z) = c' }, { v: 'curve', label: 'Curve  r(t)' }
    ], state.manifoldKind, function (v) { state.manifoldKind = v; refreshManifoldInputs(); parseManifold(); });
    panel.appendChild(field('Kind', ctl.mKindSel));

    /* surface */
    ctl.mSurfGroup = mk('div', {}, []);
    ctl.msx = mexpr(function () { return state.msx; }, function (v) { state.msx = v; });
    ctl.msy = mexpr(function () { return state.msy; }, function (v) { state.msy = v; });
    ctl.msz = mexpr(function () { return state.msz; }, function (v) { state.msz = v; });
    ctl.mSurfGroup.appendChild(field('X(u,v)', ctl.msx)); ctl.mSurfGroup.appendChild(field('Y(u,v)', ctl.msy)); ctl.mSurfGroup.appendChild(field('Z(u,v)', ctl.msz));
    ctl.mu0i = numInput(state.mu0, function (v) { state.mu0 = v; requestManifoldParse(); });
    ctl.mu1i = numInput(state.mu1, function (v) { state.mu1 = v; requestManifoldParse(); });
    ctl.mSurfGroup.appendChild(field('u from … to', mk('div', { 'class': 'axis-row' }, [ctl.mu0i, ctl.mu1i])));
    ctl.mv0i = numInput(state.mv0, function (v) { state.mv0 = v; requestManifoldParse(); });
    ctl.mv1i = numInput(state.mv1, function (v) { state.mv1 = v; requestManifoldParse(); });
    ctl.mSurfGroup.appendChild(field('v from … to', mk('div', { 'class': 'axis-row' }, [ctl.mv0i, ctl.mv1i])));
    var spu = sliderCtl(-6.3, 6.3, 0.02, state.mpu, function (v) { state.mpu = v; updateMSurfacePoint(); });
    var spv = sliderCtl(-6.3, 6.3, 0.02, state.mpv, function (v) { state.mpv = v; updateMSurfacePoint(); });
    ctl.mSurfGroup.appendChild(field('point u', spu.node)); ctl.mSurfGroup.appendChild(field('point v', spv.node));
    var srs = sliderCtl(16, 80, 2, state.mSurfRes, function (v) { state.mSurfRes = Math.round(v); parseMSurface(); });
    ctl.mSurfGroup.appendChild(field('Resolution', srs.node));
    ctl.mSurfGroup.appendChild(field('', checkbox('Surface (coloured by Gaussian K)', state.mShowSurf, function (v) { state.mShowSurf = v; renderManifold(); })));
    ctl.mSurfGroup.appendChild(field('', checkbox('Tangent plane at point', state.mShowTangent, function (v) { state.mShowTangent = v; renderManifold(); })));
    ctl.mSurfGroup.appendChild(field('', checkbox('Normal vector', state.mShowNormal, function (v) { state.mShowNormal = v; renderManifold(); })));
    panel.appendChild(ctl.mSurfGroup);

    /* level set */
    ctl.mLevelGroup = mk('div', {}, []);
    ctl.mg = mexpr(function () { return state.mg; }, function (v) { state.mg = v; });
    ctl.mLevelGroup.appendChild(field('g(x,y,z)', ctl.mg));
    var lvl = sliderCtl(-8, 28, 0.05, state.mLevel, function (v) { state.mLevel = v; parseMLevel(); });
    ctl.mLevelSlider = lvl.input; ctl.mLevelVal = lvl.out;
    ctl.mLevelGroup.appendChild(field('level c', lvl.node));
    var lrs = sliderCtl(12, 44, 2, state.mLevelRes, function (v) { state.mLevelRes = Math.round(v); parseMLevel(); });
    ctl.mLevelGroup.appendChild(field('Resolution', lrs.node));
    ctl.mLevelGroup.appendChild(sectionTitle('Point for readout'));
    var lpx = regR(sliderCtl(-state.R, state.R, 0.05, state.mgx, function (v) { state.mgx = v; mLevelPointMoved(); }));
    var lpy = regR(sliderCtl(-state.R, state.R, 0.05, state.mgy, function (v) { state.mgy = v; mLevelPointMoved(); }));
    var lpz = regR(sliderCtl(-state.R, state.R, 0.05, state.mgz, function (v) { state.mgz = v; mLevelPointMoved(); }));
    ctl.mLevelGroup.appendChild(field('Px', lpx.node)); ctl.mLevelGroup.appendChild(field('Py', lpy.node)); ctl.mLevelGroup.appendChild(field('Pz', lpz.node));
    ctl.mLevelGroup.appendChild(field('', checkbox('Isosurface', state.mShowIso, function (v) { state.mShowIso = v; renderManifold(); })));
    ctl.mLevelGroup.appendChild(field('', checkbox('∇g normal field', state.mShowIsoNormals, function (v) { state.mShowIsoNormals = v; renderManifold(); })));
    ctl.mLevelGroup.appendChild(field('', checkbox('Critical points (∇g = 0)', state.mShowCritical, function (v) { state.mShowCritical = v; renderManifold(); })));
    ctl.mLevelGroup.appendChild(field('', checkbox('Tangent plane at Q (P projected onto g = c)', state.mShowLvlTangent, function (v) { state.mShowLvlTangent = v; renderManifold(); updateManifoldReadout(); })));
    ctl.mLevelGroup.appendChild(field('', checkbox('Normal vector ∇g at Q', state.mShowLvlNormal, function (v) { state.mShowLvlNormal = v; renderManifold(); })));
    panel.appendChild(ctl.mLevelGroup);

    /* curve */
    ctl.mCurveGroup = mk('div', {}, []);
    ctl.mcx = mexpr(function () { return state.mcx; }, function (v) { state.mcx = v; });
    ctl.mcy = mexpr(function () { return state.mcy; }, function (v) { state.mcy = v; });
    ctl.mcz = mexpr(function () { return state.mcz; }, function (v) { state.mcz = v; });
    ctl.mCurveGroup.appendChild(field('x(t)', ctl.mcx)); ctl.mCurveGroup.appendChild(field('y(t)', ctl.mcy)); ctl.mCurveGroup.appendChild(field('z(t)', ctl.mcz));
    ctl.mct0i = numInput(state.mct0, function (v) { state.mct0 = v; updateMCurveRange(); requestManifoldParse(); });
    ctl.mct1i = numInput(state.mct1, function (v) { state.mct1 = v; updateMCurveRange(); requestManifoldParse(); });
    ctl.mCurveGroup.appendChild(field('t from … to', mk('div', { 'class': 'axis-row' }, [ctl.mct0i, ctl.mct1i])));
    ctl.mCurvePlay = button('▶ Play', 'wide', function () { toggleMCurve(); });
    ctl.mCurveGroup.appendChild(ctl.mCurvePlay);
    var mtv = sliderCtl(state.mct0, state.mct1, 0.01, state.mctval, function (v) { state.mctval = v; renderManifold(); updateManifoldReadout(); });
    ctl.mctvalSlider = mtv.input; ctl.mctvalVal = mtv.out;
    ctl.mCurveGroup.appendChild(field('point t', mtv.node));
    ctl.mCurveGroup.appendChild(field('', checkbox('Curve', state.mShowCurve, function (v) { state.mShowCurve = v; renderManifold(); })));
    ctl.mCurveGroup.appendChild(field('', checkbox('Frenet frame (T, N, B)', state.mShowFrame, function (v) { state.mShowFrame = v; renderManifold(); })));
    panel.appendChild(ctl.mCurveGroup);

    panel.appendChild(sectionTitle('Presets'));
    ctl.mPresetBox = mk('div', { 'class': 'presets' });
    panel.appendChild(ctl.mPresetBox);

    panel.appendChild(sectionTitle('Display'));
    var mfr = regDomain(sliderCtl(2, 10, 1, state.R, function (v) { setDomainR(v); parseManifold(); }));
    panel.appendChild(field('Domain ±R', mfr.node));

    panel.appendChild(sectionTitle('Values'));
    ctl.manifoldReadout = mk('div', { 'class': 'readout' });
    dom.manifoldReadout = ctl.manifoldReadout;
    panel.appendChild(ctl.manifoldReadout);
    return panel;
  }

  function updateMCurveRange() {
    ctl.mctvalSlider.min = state.mct0; ctl.mctvalSlider.max = state.mct1;
    if (state.mctval < state.mct0 || state.mctval > state.mct1) { state.mctval = state.mct0; ctl.mctvalSlider.value = state.mct0; ctl.mctvalVal.value = fmt(state.mct0); }
  }
  function toggleMCurve() {
    state.mCurvePlaying = !state.mCurvePlaying;
    ctl.mCurvePlay.textContent = state.mCurvePlaying ? T('❚❚ Pause') : T('▶ Play');
    ctl.mCurvePlay.classList.toggle('active', state.mCurvePlaying);
  }
  function refreshManifoldInputs() {
    var k = state.manifoldKind;
    ctl.mSurfGroup.style.display = k === 'surface' ? '' : 'none';
    ctl.mLevelGroup.style.display = k === 'levelset' ? '' : 'none';
    ctl.mCurveGroup.style.display = k === 'curve' ? '' : 'none';
    ctl.msx.value = state.msx; ctl.msy.value = state.msy; ctl.msz.value = state.msz;
    ctl.mg.value = state.mg;
    ctl.mcx.value = state.mcx; ctl.mcy.value = state.mcy; ctl.mcz.value = state.mcz;
    refreshManifoldPresets();
  }
  function refreshManifoldPresets() {
    var list = MANIFOLD_PRESETS[state.manifoldKind] || [];
    ctl.mPresetBox.innerHTML = '';
    list.forEach(function (p) { ctl.mPresetBox.appendChild(button(p.name, 'preset', function () { applyManifoldPreset(p); })); });
  }
  function applyManifoldPreset(p) {
    var k = state.manifoldKind;
    if (k === 'surface') {
      state.msx = p.s[0]; state.msy = p.s[1]; state.msz = p.s[2];
      ctl.msx.value = p.s[0]; ctl.msy.value = p.s[1]; ctl.msz.value = p.s[2];
      if (p.u) { state.mu0 = p.u[0]; state.mu1 = p.u[1]; ctl.mu0i.value = fmt(p.u[0]); ctl.mu1i.value = fmt(p.u[1]); }
      if (p.v) { state.mv0 = p.v[0]; state.mv1 = p.v[1]; ctl.mv0i.value = fmt(p.v[0]); ctl.mv1i.value = fmt(p.v[1]); }
    } else if (k === 'levelset') {
      state.mg = p.g; state.mLevel = p.c; ctl.mg.value = p.g; ctl.mLevelSlider.value = p.c; ctl.mLevelVal.value = fmt(p.c);
    } else {
      state.mcx = p.r[0]; state.mcy = p.r[1]; state.mcz = p.r[2];
      ctl.mcx.value = p.r[0]; ctl.mcy.value = p.r[1]; ctl.mcz.value = p.r[2];
      if (p.t) { state.mct0 = p.t[0]; state.mct1 = p.t[1]; state.mctval = p.t[0]; ctl.mct0i.value = fmt(p.t[0]); ctl.mct1i.value = fmt(p.t[1]); updateMCurveRange(); }
    }
    parseManifold();
  }


  K.lab({
    key: 'manifolds', label: 'Manifolds', panel: buildManifoldsPanel,
    refresh: refreshManifoldInputs,
    enter: parseManifold,
    togglePlay: function () { if (state.manifoldKind === 'curve') toggleMCurve(); },
    frame: function () {
      if (!(state.manifoldKind === 'curve' && state.mCurvePlaying && cur.manifold && cur.manifold.kind === 'curve')) return;
      var msp = state.mct1 - state.mct0;
      state.mctval += msp / 360;
      if (state.mctval > state.mct1) state.mctval = state.mct0;
      animSync(ctl.mctvalSlider, ctl.mctvalVal, state.mctval);
      renderManifold(); updateManifoldReadout();
    }
  });

})(window.VF = window.VF || {});
