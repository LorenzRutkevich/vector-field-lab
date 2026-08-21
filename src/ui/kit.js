/* =============================================================================
 * ui/kit.js: shared DOM helpers, app state, and the lab registry
 *
 * Everything every lab needs, in one place. Lab modules alias these at load
 * time (var mk = K.mk, ...) so their bodies read exactly as they did when this
 * was one file.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* ---- tiny DOM helpers --------------------------------------------------- */
  function mk(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === 'class') e.className = props[k];
      else if (k === 'html') e.innerHTML = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k === 'style') e.setAttribute('style', props[k]);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
    if (kids) kids.forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function fmt(x) {
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    var a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e4)) return x.toExponential(2);
    return String(Math.round(x * 1000) / 1000);
  }
  /* translation shim: English source strings are the keys (see i18n.js). All
     control text is routed through T() here at the helper level, so the whole
     control surface of every lab translates from one dictionary. */
  function T(s) { return (window.VF && VF.I18n) ? VF.I18n.t(s) : s; }
  function sectionTitle(t) { return mk('div', { 'class': 'sec-title', text: T(t) }); }
  function field(labelText, control, hint) {
    var kids = [];
    if (labelText || hint) kids.push(mk('div', { 'class': 'ctl-label' }, [T(labelText || ''), hint ? mk('span', { 'class': 'hint', text: T(hint) }) : null]));
    kids.push(control);
    return mk('div', { 'class': 'ctl' }, kids);
  }
  /* evaluate a constant numeric expression ("pi/2", "2pi", "sqrt(2)", "-1.5") */
  function evalNum(str) {
    if (str == null || String(str).trim() === '') return NaN;
    try { var v = VF.Parser.compile(str).fn(0, 0, 0, 0); return isFinite(v) ? v : NaN; }
    catch (e) { return NaN; }
  }

  function sliderCtl(min, max, step, val, on) {
    /* editable value box: drag the slider OR type an exact value / expression (pi/2, …) */
    var out = mk('input', { type: 'text', 'class': 'sl-val', value: fmt(val), inputmode: 'decimal', spellcheck: 'false', title: 'type an exact value or expression (e.g. pi/2)' });
    var s = mk('input', { type: 'range', min: min, max: max, step: step, value: val, 'class': 'sl' });
    function clamp(v) {                              /* read live attributes: ranges can be re-bounded later (Domain ±R) */
      var lo = parseFloat(s.min), hi = parseFloat(s.max);
      if (isFinite(lo) && v < lo) v = lo;
      if (isFinite(hi) && v > hi) v = hi;
      return v;
    }
    s.addEventListener('input', function () { var v = parseFloat(s.value); out.value = fmt(v); on(v); });
    out.addEventListener('input', function () {
      var v = evalNum(out.value);
      if (isFinite(v)) { var c = clamp(v); s.value = c; on(c); }   /* typed value moves the thumb + fires the callback */
    });
    out.addEventListener('change', function () {                    /* on blur: normalise the text to the committed value */
      var v = evalNum(out.value);
      out.value = fmt(isFinite(v) ? clamp(v) : parseFloat(s.value));
    });
    out.addEventListener('keydown', function (e) { if (e.key === 'Enter') out.blur(); });
    return { node: mk('div', { 'class': 'slider' }, [s, out]), input: s, out: out };
  }

  /* ---- Domain-R registry: sliders bounded by ±R must follow when R changes -- */
  var rBoundSliders = [], domainSliders = [];
  function regR(sc) { rBoundSliders.push(sc); return sc; }
  function regDomain(sc) { domainSliders.push(sc); return sc; }
  function setDomainR(v) {
    state.R = v;
    viz.setDomain(v);
    for (var i = 0; i < rBoundSliders.length; i++) {
      var s = rBoundSliders[i];
      s.input.min = -v; s.input.max = v;
      var cv = parseFloat(s.input.value);
      if (cv < -v || cv > v) {                       /* re-clamp and push through the slider's own handler */
        s.input.value = cv < -v ? -v : v;
        s.input.dispatchEvent(new Event('input'));
      }
    }
    for (var j = 0; j < domainSliders.length; j++) { /* keep every tab's "Domain ±R" slider in sync */
      domainSliders[j].input.value = v;
      if (document.activeElement !== domainSliders[j].out) domainSliders[j].out.value = fmt(v);
    }
  }

  /* update an animated slider pair without clobbering a value box the user is editing */
  function animSync(rangeEl, boxEl, v) {
    rangeEl.value = v;
    if (document.activeElement !== boxEl) boxEl.value = fmt(v);
  }
  function select(options, val, on) {
    var s = mk('select', { 'class': 'sel' });
    options.forEach(function (o) {
      var v = typeof o === 'string' ? o : o.v, label = typeof o === 'string' ? o : o.label;
      var opt = mk('option', { value: v, text: T(label) });
      if (v === val) opt.selected = true;
      s.appendChild(opt);
    });
    s.addEventListener('change', function () { on(s.value); });
    return s;
  }
  function checkbox(labelText, val, on) {
    var c = mk('input', { type: 'checkbox' });
    c.checked = val;
    c.addEventListener('change', function () { on(c.checked); });
    return mk('label', { 'class': 'chk' }, [c, T(labelText)]);
  }
  function button(labelText, cls, on) { return mk('button', { 'class': 'btn ' + (cls || ''), onclick: on, text: T(labelText) }); }

  /* ---- module state ------------------------------------------------------- */
  /* viz + dom are handed over by core.js at init(); state/ctl/cur are stable
     references that every lab module aliases at load time. */
  var viz, dom = {}, ctl = {};
  var state = {
    mode: 'fields',
    fieldType: 'vector',
    vx: '-y', vy: 'x', vz: '0.4',
    sf: 'exp(-(x^2+y^2+z^2))',
    operation: 'none',
    pointValuesOn: true, px: 1, py: 1, pz: 0,
    R: 5, N: 7,
    t: 0, playing: false, tSpeed: 1.0, tMax: 4 * Math.PI,
    colormap: 'viridis',
    arrowScale: 1.0, normalize: false,
    vectorMode: 'volume', vecPlaneAxis: 'z', vecPlaneCoord: 0, vectorPlaneN: 26,
    scalarMode: 'volume', scalarN: 12, isoLevel: 0.5, sliceAxis: 'z', sliceCoord: 0,
    streamlines: false, streamSeed: 4,
    bodyMode: 'flow', bodyPlaying: false, bodySpeed: 1, bodySize: 0.5,
    bodyVolume: true, bodyDeform: false, bodyTrails: true, bodyMass: 1,
    designKind: 'conservative',
    wvEq: 'wave', wvU0: 'exp(-2*(x-3)^2)', wvV0: '0', wvL: 10, wvC: 1, wvD: 0.5, wvN: 40,
    wvT: 0, wvPlaying: false, wvSpeed: 1, wvGhost: true, wvSpectrum: true,
    mdN: 10, mdK: 1, mdM: 1, mdGl: 0, mdPattern: 'uniform', mdEnds: 'fixed',
    mdExcite: 'mode', mdModeN: 1, mdPluck: 5, mdT: 0, mdPlaying: false, mdSpeed: 1,
    mdView: 'chain', mdShape: true, mdSpectrum: true,
    scV: '1/r', scE: 0.5, scBmax: 4, scRays: 21, scView: 'beam', scPlaying: false, scSpeed: 1, scT: 0,
    scAnno: true, scAnnoB: 1.2,
    showHelpers: true,
    M: [1.2, 0.6, 0, 0, 0.9, 0, 0, 0, 1],
    matN: 5, matShowCube: true, matShowBasis: true, matShowEig: true, matShowField: false,
    flowOn: false, flowT: 0, flowMax: 3, flowSpeed: 0.6, flowPlaying: false,
    funcType: '1d', normKind: '2', normP: 3,
    tdOn: false, tdPlane: true, tdProbe: true, tdPhi: 0.79, ctOn: false,
    f1d: 'x^3 - 3*x', f2d: 'sin(x)*cos(y)', f3d: 'sin(x)+cos(y)+cos(z)',
    fa: 0.8, fb: 0.4, fc: 0, taylorDeg: 3, funcRes: 64,
    showFunc: true, showTaylor: true, showGradArrow: true, extras: [], extraColors: [],
    constraints: [],
    vecF1: 'x^2 - y^2', vecF2: '2*x*y', vecF3: 'z',
    fShowField: true, fShowJac: true,
    crx: 'cos(t)', cry: 'sin(t)', crz: '0', ct0: 0, ct1: 6.2832, ctval: 0, curvePlaying: false, curveSpeed: 1,
    fieldCurveOn: false,
    sax: 1, say: 1, saz: 1,
    points: [],
    manifoldKind: 'surface',
    msx: 'sin(u)*cos(v)', msy: 'sin(u)*sin(v)', msz: 'cos(u)',
    mu0: 0, mu1: 3.14159, mv0: 0, mv1: 6.28319, mpu: 1.2, mpv: 0.8, mSurfRes: 46,
    mShowSurf: true, mShowTangent: true, mShowNormal: true,
    mg: 'x^2 + y^2 + z^2', mLevel: 4, mLevelRes: 26, mgx: 2, mgy: 0, mgz: 0,
    mShowIso: true, mShowIsoNormals: false, mShowCritical: true, mShowLvlTangent: true, mShowLvlNormal: true,
    mcx: 'cos(t)', mcy: 'sin(t)', mcz: '0.22*t', mct0: 0, mct1: 12.566, mctval: 0, mCurveRes: 240, mCurvePlaying: false,
    mShowCurve: true, mShowFrame: true,
    minkBeta: 0.4, minkHalf: 6, minkSpeed: 1.0, minkPlaying: false, minkPhase: 0,
    minkShowPrimed: true, minkShowLight: true, minkShowCone: false, minkShowHyper: true, minkShowSimul: false, minkShowGrid: false,
    minkWorldlines: [{ beta: 0.6 }], minkEvents: [{ x: 2, ct: 1 }], minkPaths: [],
    qmV: '0.5*x^2', qmL: 8, qmN: 280, qmStates: 6, qmSquare: false, qmShowV: true,
    qmMode: 'states', qmX0: -3, qmSigma: 0.6, qmK0: 3, qmN1: 0, qmN2: 1, qmT: 0, qmPlaying: false, qmSpeed: 1,
    dynA: '-sin(x) - 0.2*v', dynXr: 6.3, dynVr: 3.2, dynT: 0, dynPlaying: false, dynSpeed: 1,
    dynShowField: true, dynShowTraj: false, dynShowEnergy: false, dynShowFixed: true, dynX0: 2.4, dynV0: 0.8,
    fourF: 'sign(x)', fourL: 3.14159265, fourN: 8, fourMode: 'series', fourShowHarm: false, fourTF: 'exp(-x^2/2)', fourPlaying: false, fourAnimN: 8,
    chList: [{ x: -1.5, y: 0, z: 0, q: 1 }, { x: 1.5, y: 0, z: 0, q: -1 }],
    chArrows: true, chLines: true, chEqui: true, chSurf: false, chSurfLvl: 0.4, chN: 7,
    chGauss: true, chGx: 0, chGy: 0, chGz: 0, chGaussR: 2.2,
    spTheta: 1.1, spPhi: 0.4, spBx: 0, spBy: 0, spBz: 2, spPlaying: false, spSpeed: 1, spTrail: true,
    atOrb: '2p_z', atView: 'iso', atIso: 0.25, atR: 12,   /* Atom has its own view radius: orbitals need a big box, other tabs don't */
    rgShape: 'thandle', rgParts: null, rgAxisMode: 'e2', rgAxX: 0, rgAxY: 1, rgAxZ: 0,
    rgOmega: 3, rgEps: 0.02, rgShowAxes: true,
    rgI1: 1, rgI2: 2, rgI3: 2.5, rgPlaying: false, rgSpeed: 1,
    rgTrail: true, rgShowL: true, rgShowW: true,
    rgAnchor: 'com', rgPivX: 0, rgPivY: 0, rgPivZ: 0, rgShowCom: true,
    kpK: 1, kpP: 2, kpR0: 2, kpV0: 0.52, kpView: 'orbit', kpPlaying: false, kpSpeed: 1,
    dpTh1: 2.1, dpTh2: 2.5, dpTwin: true, dpView: 'pend', dpPlaying: false, dpSpeed: 1,
    sqMode: 'seq', sqExpr: '1/n', sqLimit: '0', sqN: 60, sqEps: 0.1,
    sqFExpr: 'x^n', sqFLim: '0', sqFa: 0, sqFb: 1, sqFn: 5,
    cxPreset: 'z^2', cxView: 'color', cxCustom: false, cxU: 'x^2 - y^2', cxV: '2*x*y', cxGrid: 12, cxR: 2
  };
  var cur = { input: null, result: null, error: null, bodyF: null, M: null, func: null, fieldCurve: null, manifold: null, mink: null, qm: null, phase: null, fourier: null, waves: null, modes: null, scatter: null };

  /* ---- error / overlay helpers ------------------------------------------- */
  function setError(msg) {
    if (msg) { dom.err.textContent = '⚠ ' + msg; dom.err.classList.remove('hidden'); }
    else dom.err.classList.add('hidden');
  }
  function setFormula(html) { dom.formula.innerHTML = html; }
  function setStats(html) { dom.stats.innerHTML = html; }

  function updateColorbar(map, lo, hi, label, centerZero) {
    dom.colorbar.classList.remove('hidden');
    dom.cbGrad.style.background = VF.Colormaps.cssGradient(map);
    var a = centerZero ? Math.max(Math.abs(lo), Math.abs(hi)) : hi;
    dom.cbHi.textContent = fmt(centerZero ? a : hi);
    dom.cbMid.textContent = fmt(centerZero ? 0 : (lo + hi) / 2);
    dom.cbLo.textContent = fmt(centerZero ? -a : lo);
    dom.cbLabel.textContent = label || '';
  }
  function hideColorbar() { dom.colorbar.classList.add('hidden'); }

  /* ---- geometry helpers --------------------------------------------------- */
  function domain() { return { min: [-state.R, -state.R, -state.R], max: [state.R, state.R, state.R] }; }
  function spacingFor(n) { return (2 * state.R) / Math.max(1, n - 1); }

  /* ---- input marking + escaping ------------------------------------------ */
  function markInput(inputEl, ok) {
    if (ok) inputEl.classList.remove('bad'); else inputEl.classList.add('bad');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---- shared control factories ------------------------------------------ */
  /* An expression box with no explicit onEnter commits through the Fields
     pipeline; fields.js installs that fallback via onExprEnter(). (Kept exactly
     as it behaved when this was one file. Note that the Complex and Sequences
     boxes also rely on the default, so Enter there re-parses Fields too.) */
  var exprEnterFallback = null;
  function onExprEnter(fn) { exprEnterFallback = fn; }
  function exprInput(val, on, onEnter) {
    var inp = mk('input', { type: 'text', 'class': 'expr', value: val, spellcheck: 'false', autocomplete: 'off' });
    inp.addEventListener('input', function () { on(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { if (onEnter) onEnter(); else if (exprEnterFallback) exprEnterFallback(); }
    });
    return inp;
  }
  function numInput(val, on) {
    var inp = mk('input', { type: 'text', 'class': 'mcell', value: fmt(val), title: 'number or expression (e.g. 2pi)' });
    inp.addEventListener('input', function () {
      var v = evalNum(inp.value);
      inp.classList.toggle('bad', !isFinite(v) && inp.value.trim() !== '' && inp.value.trim() !== '-');
      if (isFinite(v)) on(v);
    });
    return inp;
  }

  /* ---- readout HTML helpers ----------------------------------------------- */
  function vrow(v) { var s = []; for (var i = 0; i < v.length; i++) s.push(fmt(v[i])); return '(' + s.join(',&nbsp; ') + ')'; }
  function jrow(v) { var s = []; for (var i = 0; i < v.length; i++) s.push(fmt(v[i])); return '[&nbsp; ' + s.join('&nbsp; ') + ' &nbsp;]'; }
  function matHtml(M) {
    var s = '<table class="mat-out">';
    for (var r = 0; r < M.length; r++) { s += '<tr>'; for (var c = 0; c < M[r].length; c++) s += '<td>' + fmt(M[r][c]) + '</td>'; s += '</tr>'; }
    return s + '</table>';
  }

  /* ---- shared helpers for the 2-D (flat) labs ----------------------------- */
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  var SUBS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  function subN(n) { var d = '' + n, o = '', i; for (i = 0; i < d.length; i++) o += SUBS[+d[i]]; return o; }
  /* compile a real expression (the parser itself aliases u → x-slot, v → y-slot) */
  function pcompile(expr) {
    var val = VF.Parser.validate(expr);
    if (!val.ok) return { ok: false, err: val.message };
    return { ok: true, fn: VF.Parser.compile(expr).fn };
  }
  /* push a value into a sliderCtl pair (used when presets change parameters) */
  function syncSlider(sc, v) { if (sc) { sc.input.value = v; sc.out.value = fmt(v); } }

  /* sample a colormap into a packed 0xRRGGBB int (Scatter rays, Charges curves) */
  function cmHex(cm, t) {
    var c = cm(t);
    return (Math.round(c.r * 255) << 16) | (Math.round(c.g * 255) << 8) | Math.round(c.b * 255);
  }

  /* a shared qualitative palette for indexed series (eigenstates, harmonics) */
  var SERIES_COLORS = [0x6ba6ff, 0x63e6a0, 0xffd166, 0xff5cc8, 0xb28dff, 0x4cc9f0, 0xffb454, 0xff8fab, 0x8be9fd, 0xa0e070];

  /* ---- lab registry -------------------------------------------------------
     Each lab module registers itself here at load time; core.js drives every
     lab through this one table instead of a 19-way if-chain. Registration
     order is script order in index.html, and it fixes panel-build order.

       key        state.mode value; also fixes dom.tab<Key> / dom.panel<Key>
       label      tab caption (translated)
       tab        false for the panel-only custom-points layer
       flat       true for 2-D labs (viz.enter2D, no colorbar, no 3-D points)
       panel()    build the side panel, return the element
       refresh()  re-sync the panel's inputs to state (language rebuild / init)
       enter()    called on switchMode once the view is cleared
       render()   re-render in place (Fields / Matrix / Functions only)
       frame()    per-animation-frame step; only the ACTIVE lab's is called
       togglePlay() Space bar
       viewR()    override the view radius (Atom)
       axisScale() [sx, sy, sz] override (Functions)
       resetView() override the R shortcut (Minkowski)
  --------------------------------------------------------------------------- */
  var labs = {}, labOrder = [];
  function lab(def) {
    labs[def.key] = def;
    labOrder.push(def.key);
    return def;
  }
  function eachLab(fn) { for (var i = 0; i < labOrder.length; i++) fn(labs[labOrder[i]], labOrder[i]); }

  /* re-render the active lab in place. Fields, Matrix and Functions define
     render(); every other lab re-renders through its own controls, so they
     fall back to the Functions pipeline exactly as the old refresh() did. */
  function refreshActive() {
    var L = labs[state.mode];
    if (L && L.render) L.render();
    else if (labs.functions && labs.functions.render) labs.functions.render();
  }

  /* labs capture viz/dom here because core.js only receives them at init() */
  var initHooks = [];
  function onInit(fn) { initHooks.push(fn); }
  function setRuntime(v, d) {
    viz = v; dom = d;
    for (var i = 0; i < initHooks.length; i++) initHooks[i](v, d);
  }

  /* the language switch rebuilds every panel, so the slider registries that
     track ±R-bounded controls must be emptied first */
  function resetSliderRegistries() { rBoundSliders.length = 0; domainSliders.length = 0; }

  VF.UIKit = {
    mk: mk, fmt: fmt, T: T, sectionTitle: sectionTitle, field: field, evalNum: evalNum,
    sliderCtl: sliderCtl, regR: regR, regDomain: regDomain, setDomainR: setDomainR,
    animSync: animSync, select: select, checkbox: checkbox, button: button,
    state: state, ctl: ctl, cur: cur,
    setError: setError, setFormula: setFormula, setStats: setStats,
    updateColorbar: updateColorbar, hideColorbar: hideColorbar,
    domain: domain, spacingFor: spacingFor, markInput: markInput, esc: esc,
    exprInput: exprInput, numInput: numInput, onExprEnter: onExprEnter, cmHex: cmHex,
    vrow: vrow, jrow: jrow, matHtml: matHtml,
    isLight: isLight, subN: subN, pcompile: pcompile, syncSlider: syncSlider,
    SERIES_COLORS: SERIES_COLORS,
    lab: lab, labs: labs, eachLab: eachLab, refreshActive: refreshActive,
    onInit: onInit, setRuntime: setRuntime, resetSliderRegistries: resetSliderRegistries
  };

})(window.VF = window.VF || {});
