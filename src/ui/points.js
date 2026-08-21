/* =============================================================================
 * ui/points.js: custom points: a global 3-D annotation layer that persists
 * across every tab
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, evalNum = K.evalNum, button = K.button;
  var lab = K.lab;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ---- Custom points (global annotation layer) --------------------------- */
  var POINT_COLORS = [0xffd166, 0x63e6a0, 0xff5cc8, 0x4cc9f0, 0xffb454, 0xb28dff, 0xff6b6b, 0x8be9fd];

  function buildPointsPanel() {
    var wrap = mk('div', { 'class': 'panel-body points-panel' });
    wrap.appendChild(sectionTitle('Custom points'));
    wrap.appendChild(mk('div', { 'class': 'muted small', text: T('Mark locations in the view. They stay in place across every tab.') }));
    ctl.pxIn = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'x' });
    ctl.pyIn = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'y' });
    ctl.pzIn = mk('input', { type: 'text', 'class': 'mcell', value: '0', title: 'z' });
    function onEnter(e) { if (e.key === 'Enter') addCustomPoint(); }
    ctl.pxIn.addEventListener('keydown', onEnter); ctl.pyIn.addEventListener('keydown', onEnter); ctl.pzIn.addEventListener('keydown', onEnter);
    wrap.appendChild(mk('div', { 'class': 'point-add' }, [ctl.pxIn, ctl.pyIn, ctl.pzIn, button('Add', 'point-add-btn', addCustomPoint)]));
    ctl.pointsList = mk('div', { 'class': 'points-list' });
    wrap.appendChild(ctl.pointsList);
    ctl.pointsClear = button('Clear all points', 'wide', clearCustomPoints);
    wrap.appendChild(ctl.pointsClear);
    renderPointsList();
    return wrap;
  }
  function defPointHex(i) { return '#' + ('000000' + POINT_COLORS[i % POINT_COLORS.length].toString(16)).slice(-6); }
  function pointColorNum(p, i) {
    return (p.hex && /^#[0-9a-fA-F]{6}$/.test(p.hex)) ? parseInt(p.hex.slice(1), 16) : POINT_COLORS[i % POINT_COLORS.length];
  }
  function addCustomPoint() {
    /* evalNum, not parseFloat: every other number box accepts pi, 2pi, sqrt(2) … */
    var x = evalNum(ctl.pxIn.value), y = evalNum(ctl.pyIn.value), z = evalNum(ctl.pzIn.value);
    state.points.push({ x: isFinite(x) ? x : 0, y: isFinite(y) ? y : 0, z: isFinite(z) ? z : 0, hex: defPointHex(state.points.length) });
    syncPoints();
  }
  function removeCustomPoint(i) { state.points.splice(i, 1); syncPoints(); }
  function clearCustomPoints() { state.points = []; syncPoints(); }
  function syncPoints() {
    for (var i = 0; i < state.points.length; i++) {
      var p = state.points[i];
      if (!p.hex) p.hex = defPointHex(i);           /* the colour travels with the point */
      p.color = pointColorNum(p, i);
    }
    viz.setCustomPoints(state.points);
    renderPointsList();
  }
  function renderPointsList() {
    ctl.pointsList.innerHTML = '';
    ctl.pointsClear.style.display = state.points.length ? '' : 'none';
    for (var i = 0; i < state.points.length; i++) {
      (function (p, idx) {
        var sw = mk('input', { type: 'color', 'class': 'extra-color', value: p.hex, title: T('marker colour') });
        /* live update without rebuilding the list: a rebuild would destroy the
           native colour picker mid-interaction */
        sw.addEventListener('input', function () { p.hex = sw.value; p.color = pointColorNum(p, idx); viz.setCustomPoints(state.points); });
        var lbl = mk('span', { 'class': 'pt-coord', text: (idx + 1) + ':  (' + fmt(p.x) + ', ' + fmt(p.y) + ', ' + fmt(p.z) + ')' });
        var del = mk('button', { 'class': 'pt-del', title: 'remove', text: '×', onclick: function () { removeCustomPoint(idx); } });
        ctl.pointsList.appendChild(mk('div', { 'class': 'pt-row' }, [sw, lbl, del]));
      })(state.points[i], i);
    }
  }


  /* not a tab: the points panel sits below whichever lab panel is showing */
  K.lab({ key: 'points', tab: false, panel: buildPointsPanel });

})(window.VF = window.VF || {});
