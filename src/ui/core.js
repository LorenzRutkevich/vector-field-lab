/* =============================================================================
 * ui/core.js: orchestration: tab switching, the animation frame, the language
 * rebuild, and the public VF.UI surface.
 * -----------------------------------------------------------------------------
 * Every lab registers itself with VF.UIKit.lab() as its script loads; this file
 * drives them all through that one table. What used to be five parallel 19-way
 * if-chains (switchMode / frame / buildAllPanels / refreshAllInputs / the Space
 * key) is now five loops over the registry, so adding a lab means adding a
 * file, and nothing in here changes.
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, labs = K.labs;
  var T = K.T, setError = K.setError, hideColorbar = K.hideColorbar;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  var HUD_3D = 'drag&nbsp;·&nbsp;orbit&nbsp;&nbsp;|&nbsp;&nbsp;right-drag&nbsp;·&nbsp;pan&nbsp;&nbsp;|&nbsp;&nbsp;wheel&nbsp;·&nbsp;zoom';
  var HUD_MINK = 'drag&nbsp;β&nbsp;·&nbsp;boost&nbsp;&nbsp;|&nbsp;&nbsp;Space&nbsp;·&nbsp;animate&nbsp;&nbsp;|&nbsp;&nbsp;flat 1+1 spacetime';
  var HUD_FLAT = 'flat 2-D view&nbsp;&nbsp;|&nbsp;&nbsp;Space&nbsp;·&nbsp;play/animate';

  /* a lab's key fixes its DOM ids: 'kepler' -> dom.tabKepler / dom.panelKepler */
  function cap(key) { return key.charAt(0).toUpperCase() + key.slice(1); }
  function tabEl(key) { return dom['tab' + cap(key)]; }
  function panelEl(key) { return dom['panel' + cap(key)]; }

  /* ---- mode switching ----------------------------------------------------- */
  function switchMode(m) {
    state.mode = m;
    K.eachLab(function (L, key) {
      if (L.tab === false) return;
      var tb = tabEl(key); if (tb) tb.classList.toggle('active', m === key);
      var pn = panelEl(key); if (pn) pn.style.display = m === key ? '' : 'none';
    });
    var L = labs[m] || {};
    var flat = !!L.flat;
    if (dom.panelPoints) dom.panelPoints.style.display = flat ? 'none' : '';   /* 3-D annotations don't apply to the flat labs */
    viz.clearVectorField(); viz.clearScalar(); viz.clearStreamlines(); viz.clearMatrix(); viz.clearFunc(); viz.clearPointMarker();
    setError(null);                                 /* a stale error from another tab must not linger */
    var wantR = L.viewR ? L.viewR() : state.R;      /* Atom keeps its own (much larger) view radius */
    if (viz.R !== wantR) viz.setDomain(wantR);
    viz.setBodiesVisible(m === 'fields');           /* bodies persist, but belong to the Fields tab */
    viz.setRigidVisible(m === 'rigid');
    /* per-axis scale is a Functions-tab feature; keep other tabs at 1:1:1 */
    var as = L.axisScale ? L.axisScale() : [1, 1, 1];
    viz.setAxisScale(as[0], as[1], as[2]);
    if (flat) viz.enter2D(); else viz.exit2D();
    if (flat) hideColorbar();
    if (dom.hudHint) dom.hudHint.innerHTML = T(m === 'minkowski' ? HUD_MINK : (flat ? HUD_FLAT : HUD_3D));
    if (L.enter) L.enter();
  }

  /* ---- the animation frame ------------------------------------------------
     Only the active lab steps: every lab's frame() used to sit behind an
     `if (state.mode === '<its own key>')` guard, so dispatching on the mode is
     the same work with none of the dead comparisons. */
  function frame() {
    var L = labs[state.mode];
    if (L && L.frame) L.frame();
  }

  /* ---- panel build / refresh ---------------------------------------------- */
  /* build (or rebuild) every side panel: reused by init and the language switch */
  function buildAllPanels() {
    K.eachLab(function (L, key) {
      var host = panelEl(key);
      if (host && L.panel) host.appendChild(L.panel());
    });
  }
  function refreshAllInputs() {
    K.eachLab(function (L) { if (L.refresh) L.refresh(); });
  }

  /* localise the parts NOT rebuilt on a language switch: tab labels, top-bar
     buttons, and the help manual (swapped wholesale). */
  var helpEN = null;
  function applyStaticI18n() {
    K.eachLab(function (L, key) {
      if (L.tab === false || !L.label) return;
      var tb = tabEl(key);
      if (tb) tb.textContent = T(L.label);
    });
    function byId(id) { return document.getElementById(id); }
    var gm = byId('grp-math'); if (gm) gm.textContent = T('Math');
    var gp = byId('grp-phys'); if (gp) gp.textContent = T('Physics');
    var s = byId('btn-save'); if (s) { s.textContent = T('⤓ Save'); s.title = T('save this view as a PNG image'); }
    var rv = byId('btn-reset'); if (rv) { rv.textContent = T('Reset view'); rv.title = T('reset camera (R)'); }
    var hp = byId('btn-help'); if (hp) hp.textContent = T('Help');
    var th = byId('btn-theme'); if (th) th.title = T('toggle light / dark');
    var db = byId('diag-badge'); if (db) db.title = T('self-tests');
    var lb = byId('btn-lang'); if (lb) lb.textContent = (VF.I18n.getLang() === 'de') ? 'English' : 'Deutsch';
    if (dom.hudHint) dom.hudHint.innerHTML = T(HUD_3D);      /* initial mode is a 3-D tab; switchMode overrides on change */
    var hbody = byId('help-body');
    if (hbody && VF.I18n) hbody.innerHTML = (VF.I18n.getLang() === 'de') ? VF.I18n.helpDE() : (helpEN || hbody.innerHTML);
  }
  /* empty every panel, rebuild it in the new language, and re-render the active tab */
  function rebuildPanels() {
    K.resetSliderRegistries();
    K.eachLab(function (L, key) { var h = panelEl(key); if (h) h.innerHTML = ''; });
    buildAllPanels();
    refreshAllInputs();
    switchMode(state.mode);
  }
  function setLanguage(l) {
    VF.I18n.setLang(l);
    applyStaticI18n();
    rebuildPanels();
  }

  /* ---- init --------------------------------------------------------------- */
  function init(vizInstance, domRefs) {
    K.setRuntime(vizInstance, domRefs);   /* hands viz + dom to every lab module */

    buildAllPanels();

    K.eachLab(function (L, key) {
      if (L.tab === false) return;
      var tb = tabEl(key);
      if (tb) tb.addEventListener('click', function () { switchMode(key); });
    });

    refreshAllInputs();
    viz.onFrame(frame);

    /* keyboard shortcuts */
    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.key === ' ') {
        e.preventDefault();
        var L = labs[state.mode];
        if (L && L.togglePlay) L.togglePlay();
      }
      if (e.key === 'r' || e.key === 'R') resetView();
    });

    /* cache the English help (from index.html) before any swap, then localise chrome */
    var hb = document.getElementById('help-body');
    helpEN = hb ? hb.innerHTML : '';
    applyStaticI18n();

    /* first render: index.html opens on the Fields tab already marked active,
       so the initial lab starts in place rather than through switchMode */
    var first = labs[state.mode];
    if (first && first.start) first.start();
  }

  function resetView() {
    var L = labs[state.mode];
    if (L && L.resetView) L.resetView();
    else viz.controls.reset();
  }
  /* every flat lab picks its colours from the theme at render time, so the
     active one must re-render on a theme switch (not just Minkowski) */
  function setTheme(mode) { viz.setTheme(mode); switchMode(state.mode); }  /* re-dispatch: some labs (Bloch wires, 2-D canvases) bake theme colours into geometry */

  VF.UI = {
    init: init, setTheme: setTheme, resetView: resetView, setLanguage: setLanguage, _state: state,
    /* test seam: advance the dropped bodies deterministically (E2E / screenshots) */
    _stepBodies: function (n) {
      var F = labs.fields;
      for (var i = 0; i < (n || 1); i++) F.stepBodies();
    }
  };

})(window.VF = window.VF || {});
