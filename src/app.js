/* =============================================================================
 * app.js: bootstrap. Build the renderer, run self-tests, wire the UI
 * ========================================================================== */
(function () {
  'use strict';

  function showFatal(msg) {
    var e = document.getElementById('ov-error');
    if (e) { e.textContent = '⚠ ' + msg; e.classList.remove('hidden'); }
  }

  function download(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  function txt(id) { var e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }

  /* save the current 3-D view as a captioned PNG (3D image + expression + stats + watermark) */
  function saveImage(viz) {
    var url = viz.captureImage();
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    var bg = light ? '#eef1f6' : '#0b0e14', fg = light ? '#1b2330' : '#e2e8f2', sub = light ? '#5f6b82' : '#8b96ab';
    var caption = txt('ov-formula'), subcap = txt('ov-stats');
    var img = new Image();
    img.onload = function () {
      try {
        var W = img.width, pad = Math.round(W * 0.02), capH = Math.round(W * (caption ? 0.075 : 0.03));
        var c = document.createElement('canvas'); c.width = W; c.height = img.height + capH;
        var g = c.getContext('2d');
        g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0);
        g.textBaseline = 'middle';
        if (caption) {
          g.fillStyle = fg; g.font = '600 ' + Math.round(W * 0.021) + 'px system-ui, Arial, sans-serif';
          g.fillText(caption, pad, img.height + capH * 0.36);
          if (subcap) { g.fillStyle = sub; g.font = Math.round(W * 0.015) + 'px system-ui, Arial, sans-serif'; g.fillText(subcap, pad, img.height + capH * 0.70); }
        }
        g.fillStyle = sub; g.font = Math.round(W * 0.014) + 'px system-ui, Arial, sans-serif'; g.textAlign = 'right';
        g.fillText('∇ Vector Field Lab', c.width - pad, img.height + capH * 0.5);
        download(c.toDataURL('image/png'), 'vector-field-lab.png');
      } catch (e) { download(url, 'vector-field-lab.png'); }
    };
    img.onerror = function () { download(url, 'vector-field-lab.png'); };
    img.src = url;
  }
  window.addEventListener('error', function (ev) {
    showFatal((ev.message || 'Script error') + ' in ' + ((ev.filename || '').split('/').pop()) + ':' + ev.lineno);
  });

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var VF = window.VF;
    if (!window.THREE) { showFatal('Three.js failed to load (vendor/three.min.js).'); return; }
    if (!VF || !VF.Viz) { showFatal('Application scripts failed to load.'); return; }

    /* self tests -> badge (run first, independent of WebGL) */
    try {
      var res = VF.runTests();
      var badge = document.getElementById('diag-badge');
      var allPass = res.passed === res.total;
      badge.textContent = (allPass ? '✓ ' : '✕ ') + res.passed + '/' + res.total;
      badge.className = 'diag ' + (allPass ? 'ok' : 'fail');
      var fails = res.results.filter(function (r) { return !r.pass; });
      badge.title = allPass ? 'all self-tests passed' : ('failing:\n' + fails.map(function (r) { return '• ' + r.name; }).join('\n'));
      if (!allPass) console.warn('Self-test failures:', fails);
    } catch (te) { console.error('Self-tests crashed', te); }

    try {
      var canvas = document.getElementById('gl');
      var viz = new VF.Viz(canvas);
      VF._viz = viz;   /* expose for console/debugging */

      var dom = {
        panelFields: document.getElementById('panel-fields'),
        panelMatrix: document.getElementById('panel-matrix'),
        panelFunctions: document.getElementById('panel-functions'),
        panelManifolds: document.getElementById('panel-manifolds'),
        panelMinkowski: document.getElementById('panel-minkowski'),
        panelQuantum: document.getElementById('panel-quantum'),
        panelPhase: document.getElementById('panel-phase'),
        panelFourier: document.getElementById('panel-fourier'),
        panelWaves: document.getElementById('panel-waves'),
        panelModes: document.getElementById('panel-modes'),
        panelScatter: document.getElementById('panel-scatter'),
        panelCharges: document.getElementById('panel-charges'),
        panelSpin: document.getElementById('panel-spin'),
        panelAtom: document.getElementById('panel-atom'),
        panelRigid: document.getElementById('panel-rigid'),
        panelKepler: document.getElementById('panel-kepler'),
        panelChaos: document.getElementById('panel-chaos'),
        panelSeq: document.getElementById('panel-seq'),
        panelCplx: document.getElementById('panel-cplx'),
        panelPoints: document.getElementById('panel-points'),
        tabFields: document.getElementById('tab-fields'),
        tabMatrix: document.getElementById('tab-matrix'),
        tabFunctions: document.getElementById('tab-functions'),
        tabManifolds: document.getElementById('tab-manifolds'),
        tabMinkowski: document.getElementById('tab-minkowski'),
        tabQuantum: document.getElementById('tab-quantum'),
        tabPhase: document.getElementById('tab-phase'),
        tabFourier: document.getElementById('tab-fourier'),
        tabWaves: document.getElementById('tab-waves'),
        tabModes: document.getElementById('tab-modes'),
        tabScatter: document.getElementById('tab-scatter'),
        tabCharges: document.getElementById('tab-charges'),
        tabSpin: document.getElementById('tab-spin'),
        tabAtom: document.getElementById('tab-atom'),
        tabRigid: document.getElementById('tab-rigid'),
        tabKepler: document.getElementById('tab-kepler'),
        tabChaos: document.getElementById('tab-chaos'),
        tabSeq: document.getElementById('tab-seq'),
        tabCplx: document.getElementById('tab-cplx'),
        hudHint: document.getElementById('hud-hint'),
        err: document.getElementById('ov-error'),
        formula: document.getElementById('ov-formula'),
        stats: document.getElementById('ov-stats'),
        colorbar: document.getElementById('colorbar'),
        cbGrad: document.getElementById('cb-grad'),
        cbHi: document.getElementById('cb-hi'),
        cbMid: document.getElementById('cb-mid'),
        cbLo: document.getElementById('cb-lo'),
        cbLabel: document.getElementById('cb-label')
      };

      /* language: restore saved choice BEFORE building panels so they build translated */
      var savedLang = 'en';
      try { savedLang = localStorage.getItem('vf-lang') || 'en'; } catch (e) {}
      if (VF.I18n) VF.I18n.setLang(savedLang);

      VF.UI.init(viz, dom);

      var langBtn = document.getElementById('btn-lang');
      if (langBtn) langBtn.addEventListener('click', function () {
        VF.UI.setLanguage(VF.I18n.getLang() === 'de' ? 'en' : 'de');
      });

      /* theme toggle (persisted) */
      var themeBtn = document.getElementById('btn-theme');
      function applyTheme(mode) {
        document.documentElement.setAttribute('data-theme', mode);
        VF.UI.setTheme(mode);
        themeBtn.textContent = mode === 'light' ? '☾' : '☀';
        try { localStorage.setItem('vf-theme', mode); } catch (e) {}
      }
      var saved = 'dark';
      try { saved = localStorage.getItem('vf-theme') || 'dark'; } catch (e) {}
      applyTheme(saved);
      themeBtn.addEventListener('click', function () {
        applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
      });

      document.getElementById('btn-reset').addEventListener('click', function () {
        if (VF.UI && VF.UI.resetView) VF.UI.resetView(); else viz.controls.reset();
      });
      document.getElementById('btn-save').addEventListener('click', function () { saveImage(viz); });
      var help = document.getElementById('help');
      document.getElementById('btn-help').addEventListener('click', function () { help.classList.remove('hidden'); });
      document.getElementById('btn-close-help').addEventListener('click', function () { help.classList.add('hidden'); });
      help.addEventListener('click', function (e) { if (e.target === help) help.classList.add('hidden'); });
    } catch (e) {
      showFatal(String(e && e.stack || e));
      console.error(e);
    }
  });
})();
