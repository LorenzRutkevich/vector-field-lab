/* =============================================================================
 * ui/scatter.js: the Scatter lab: Streuung & Wirkungsquerschnitt, the exact
 * deflection integral, RK4 beam trajectories and dσ/dΩ
 * ========================================================================== */
(function (VF) {
  'use strict';

  var K = VF.UIKit;
  var state = K.state, ctl = K.ctl, cur = K.cur;
  var mk = K.mk, fmt = K.fmt, T = K.T, sectionTitle = K.sectionTitle, field = K.field, sliderCtl = K.sliderCtl;
  var select = K.select, checkbox = K.checkbox, button = K.button, setError = K.setError, setFormula = K.setFormula, setStats = K.setStats;
  var markInput = K.markInput, esc = K.esc, exprInput = K.exprInput, isLight = K.isLight, pcompile = K.pcompile, syncSlider = K.syncSlider;
  var cmHex = K.cmHex;
  var viz, dom;
  K.onInit(function (v, d) { viz = v; dom = d; });

  /* ======================================================================== */
  /*  SCATTER: Streuung & Wirkungsquerschnitt                                 */
  /* ======================================================================== */
  var SC_PRESETS = [
    { name: 'Rutherford ▶', V: '1/r', E: 0.5, bmax: 4, analytic: 'rutherford', k: 1, desc: 'Repulsive Coulomb: Θ = 2·atan(k/2Eb), dσ/dΩ = (k/4E)²/sin⁴(θ/2), the 1911 experiment that revealed the nucleus. Head-on rays bound its size: r₀ = k/E.' },
    { name: 'attractive −1/r ▶', V: '-1/r', E: 0.5, bmax: 4, desc: 'Same magnitude, opposite sign: rays bend TOWARD the centre and Θ(b) flips sign, yet dσ/dΩ comes out identical. Rutherford scattering cannot tell + from −.' },
    { name: 'hard sphere', V: '50*(r<1)', E: 0.5, bmax: 1.6, analytic: 'hard', R: 1, desc: 'A wall of height 50 ≫ E is an impenetrable sphere: θ = π − 2·asin(b/R), and dσ/dΩ = R²/4. ISOTROPIC. Total σ = πR², exactly the geometric shadow.' },
    { name: 'Yukawa ▶', V: '2*exp(-r)/r', E: 0.5, bmax: 5, desc: 'Screened Coulomb (a model of the nuclear force): Rutherford-like up close, but the exponential kills the long-range tail; large-b rays pass almost straight.' },
    { name: 'Lennard-Jones ▶', V: '4*(1/r^12 - 1/r^6)', E: 0.4, bmax: 3, desc: 'Attractive outside, hard core inside. Θ(b) develops a MINIMUM → a spike in dσ/dΩ at that angle: rainbow scattering, the same mathematics as the optical rainbow.' },
    { name: 'soft blob', V: '2*exp(-r^2)', E: 0.5, bmax: 3, desc: 'A smooth finite-range bump: only small-b rays deflect, there is a maximum scattering angle, and (unlike Coulomb) the total cross-section is finite.' }
  ];
  var scTimer = null;
  function requestScatter() { if (scTimer) clearTimeout(scTimer); scTimer = setTimeout(scCompute, 300); }
  function scCompute() {
    if (state.mode !== 'scatter') return;
    var c = pcompile(state.scV);
    markInput(ctl.scV, c.ok);
    if (!c.ok) { setError('V(r): ' + c.err); return; }
    var Vfn = function (r) { return c.fn(r, 0, 0, 0); };
    var E = state.scE, bmax = state.scBmax;
    var probe = VF.Scatter.deflection(Vfn, E, bmax / 2);
    if (probe.noBeam) { setError('V(r) must fall to 0 at large r: a scattering beam needs free particles far away.'); return; }
    setError(null);
    var R0 = Math.max(14, 2.2 * bmax), nR = Math.round(state.scRays), rays = [], i;
    for (i = 0; i < nR; i++) {
      var b = -bmax + 2 * bmax * i / (nR - 1);
      var tr = VF.Scatter.trajectory(Vfn, E, b, { R0: R0 });
      tr.b = b; tr._ti = 0;
      rays.push(tr);
    }
    var Tmax = 0;
    for (i = 0; i < rays.length; i++) if (rays[i].T > Tmax) Tmax = rays[i].T;
    var tb = VF.Scatter.thetaOfB(Vfn, E, bmax, 130);
    cur.scatter = {
      Vfn: Vfn, rays: rays, Tmax: Tmax, tb: tb,
      cross: VF.Scatter.crossSection(tb),
      r0: VF.Scatter.headOn(Vfn, E)
    };
    if (ctl.scAnnoBS) {                                /* keep the annotated-b slider inside the beam */
      ctl.scAnnoBS.input.max = bmax;
      if (state.scAnnoB > bmax) { state.scAnnoB = bmax; syncSlider(ctl.scAnnoBS, bmax); }
    }
    scAnnoCompute();
    state.scT = 0;
    renderScatterView();
  }
  /* the annotated ray (Stoßparameter b, Streuwinkel θ, r_min): computed on its
     own so dragging its slider does not re-run the whole beam */
  function scAnnoCompute() {
    if (!cur.scatter) return;
    if (!state.scAnno) { cur.scatter.anno = null; return; }
    var Vfn = cur.scatter.Vfn, b = state.scAnnoB, R0 = Math.max(14, 2.2 * state.scBmax);
    var dbV = 0.05 * state.scBmax;                   /* visible beam-tube half-width b ± db */
    cur.scatter.anno = {
      b: b, dbV: dbV,
      tr: VF.Scatter.trajectory(Vfn, state.scE, b, { R0: R0 }),
      trLo: VF.Scatter.trajectory(Vfn, state.scE, Math.max(0.02, b - dbV), { R0: R0 }),
      trHi: VF.Scatter.trajectory(Vfn, state.scE, b + dbV, { R0: R0 }),
      defl: VF.Scatter.deflection(Vfn, state.scE, b),
      sig: VF.Scatter.dSigma(Vfn, state.scE, b)      /* per-ray Wirkungsquerschnitt */
    };
  }
  function renderScatterView() {
    if (state.mode !== 'scatter' || !cur.scatter) return;
    var sc = cur.scatter, i, j;
    viz.set2DRange(6.2);
    if (state.scView === 'theta') {
      var pts = [], lo = 0, hi = 0;
      for (i = 0; i < sc.tb.bs.length; i++) {
        var tv = sc.tb.th[i];
        pts.push([sc.tb.bs[i], tv]);
        if (isFinite(tv)) { if (tv < lo) lo = tv; if (tv > hi) hi = tv; }
      }
      if (lo < -2 * Math.PI) lo = -2 * Math.PI;
      hi = Math.max(hi, Math.PI * 1.02);
      var thMk = [];
      if (state.scAnno && sc.anno && !sc.anno.defl.capture && isFinite(sc.anno.defl.theta))
        thMk.push({ x: sc.anno.b, y: sc.anno.defl.theta, color: 0xffd166, r: 0.015, label: 'b = ' + fmt(sc.anno.b) });
      viz.render2D({
        xr: [0, state.scBmax], yr: [lo - 0.2, hi + 0.2], xlabel: 'b', ylabel: 'Θ',
        curves: [{ pts: pts, color: 0x4cc9f0, op: 0.95 }],
        markers: thMk,
        hlines: [{ y: 0, op: 0.35 }, { y: Math.PI, color: 0xff5cc8, op: 0.5, label: T('θ = π (backscatter)') }]
      });
      setFormula(T('Deflection function') + ' &nbsp; Θ(b) = π − 2∫ b·du/√(1 − b²u² − V/E) &nbsp;·&nbsp; V(r) = <b>' + esc(state.scV) + '</b>');
      setStats('E = ' + fmt(state.scE) + (sc.tb.captured ? ' · ' + sc.tb.captured + ' ' + T('grid rays captured') : '') + ' · ' + T('gaps = capture / orbiting'));
    } else if (state.scView === 'sigma') {
      var mk3 = [], lo2 = Infinity, hi2 = -Infinity;
      for (i = 0; i < sc.cross.theta.length; i++) {
        var lg = Math.log(sc.cross.ds[i]) / Math.LN10;
        if (!isFinite(lg)) continue;
        if (lg < -3) lg = -3; if (lg > 4) lg = 4;
        mk3.push({ x: sc.cross.theta[i], y: lg, color: 0xffd166, r: 0.008 });
        if (lg < lo2) lo2 = lg; if (lg > hi2) hi2 = lg;
      }
      if (!isFinite(lo2)) { lo2 = -1; hi2 = 1; }
      var curves3 = [], hl3 = [];
      var pr = ctl.scPreset;                                  /* active preset meta (if any) */
      if (pr && pr.analytic === 'rutherford') {
        var apts = [], k = pr.k, E4 = 4 * state.scE;
        for (i = 0; i <= 160; i++) {
          var th = 0.12 + (Math.PI - 0.12) * i / 160;
          var v4 = Math.log((k / E4) * (k / E4) / Math.pow(Math.sin(th / 2), 4)) / Math.LN10;
          apts.push([th, v4 < -3 || v4 > 4 ? NaN : v4]);
          if (isFinite(v4) && v4 > -3 && v4 < 4) { if (v4 < lo2) lo2 = v4; if (v4 > hi2) hi2 = v4; }
        }
        curves3.push({ pts: apts, color: 0x63e6a0, op: 0.8 });
      }
      if (pr && pr.analytic === 'hard') hl3.push({ y: Math.log(pr.R * pr.R / 4) / Math.LN10, color: 0x63e6a0, op: 0.8, label: T('R²/4 (isotropic)') });
      /* the annotated ray's own Wirkungsquerschnitt, from the exact integral */
      if (state.scAnno && sc.anno && sc.anno.sig && sc.anno.sig.ok) {
        var lgA = Math.log(sc.anno.sig.ds) / Math.LN10;
        if (lgA > -3 && lgA < 4) {
          mk3.push({ x: sc.anno.sig.theta, y: lgA, color: 0x4cc9f0, r: 0.016, label: T('ray b = ') + fmt(sc.anno.b) });
          if (lgA < lo2) lo2 = lgA; if (lgA > hi2) hi2 = lgA;
        }
      }
      viz.render2D({
        xr: [0, Math.PI * 1.03], yr: [lo2 - 0.4, hi2 + 0.4], xlabel: 'θ', ylabel: 'log₁₀ dσ/dΩ',
        curves: curves3, markers: mk3, hlines: hl3
      });
      setFormula(T('Differential cross-section') + ' &nbsp; dσ/dΩ = (b/sin θ)·|db/dθ| &nbsp;·&nbsp; V(r) = <b>' + esc(state.scV) + '</b>' + (pr && pr.analytic ? ' &nbsp;·&nbsp; <span style="color:#63e6a0">' + T('green = analytic') + '</span>' : ''));
      setStats('E = ' + fmt(state.scE) + ' · ' + T('dots: computed from Θ(b) · spikes = rainbow angles (dθ/db = 0)'));
    } else {
      var Rv = Math.max(6, 1.35 * state.scBmax), curves2 = [], markers2 = [], cm = VF.Colormaps.get('plasma');
      for (i = 0; i < sc.rays.length; i++) {
        var ray = sc.rays[i], rp = [];
        for (j = 0; j < ray.pts.length; j++) {
          var p = ray.pts[j];
          rp.push((Math.abs(p[0]) <= Rv && Math.abs(p[1]) <= Rv) ? p : [NaN, NaN]);
        }
        curves2.push({ pts: rp, color: cmHex(cm, 0.15 + 0.75 * Math.abs(ray.b) / state.scBmax), op: 0.85 });
      }
      /* the "wall": circle where V(r) = E (head-on forbidden region) */
      if (sc.r0 > 0.03 && isFinite(sc.r0)) {
        var cp = [];
        for (i = 0; i <= 64; i++) cp.push([sc.r0 * Math.cos(i / 64 * 2 * Math.PI), sc.r0 * Math.sin(i / 64 * 2 * Math.PI)]);
        curves2.push({ pts: cp, color: isLight() ? 0x9aa7bd : 0x59667f, op: 0.6 });
      }
      markers2.push({ x: 0, y: 0, color: 0xff5cc8, r: 0.014 });
      /* annotated ray: Stoßparameter b, Streuwinkel θ, closest approach r_min */
      if (state.scAnno && sc.anno && sc.anno.tr.pts.length > 2) {
        var an = sc.anno, hiCol = isLight() ? 0x1b2330 : 0xffffff;
        var ap = [];
        for (j = 0; j < an.tr.pts.length; j++) {
          var q2 = an.tr.pts[j];
          ap.push((Math.abs(q2[0]) <= Rv && Math.abs(q2[1]) <= Rv) ? q2 : [NaN, NaN]);
        }
        curves2.push({ pts: ap, color: hiCol, op: 1 });
        /* undeflected continuation (dashed feel via low opacity) */
        curves2.push({ pts: [[-Rv, an.b], [Rv, an.b]], color: hiCol, op: 0.22 });
        /* the beam TUBE b ± db, what the cross-section actually measures:
           the annulus 2πb·db of beam area spreading into the ring 2π·sinθ·dθ */
        var tubeEnds = [];
        if (an.trLo && an.trHi) {
          var tubes = [an.trLo, an.trHi], ti2;
          for (ti2 = 0; ti2 < 2; ti2++) {
            var tp2 = [], tub = tubes[ti2];
            for (j = 0; j < tub.pts.length; j++) {
              var q3 = tub.pts[j];
              tp2.push((Math.abs(q3[0]) <= Rv && Math.abs(q3[1]) <= Rv) ? q3 : [NaN, NaN]);
            }
            curves2.push({ pts: tp2, color: 0x4cc9f0, op: 0.4 });
            if (!tub.captured) tubeEnds.push(Math.atan2(tub.pts[tub.pts.length - 1][1], tub.pts[tub.pts.length - 1][0]));
          }
        }
        /* b bracket near the left edge: beam axis → incoming asymptote, plus the db tube width */
        var xb = -0.8 * Rv, tick = 0.025 * Rv;
        curves2.push({ pts: [[xb, 0], [xb, an.b]], color: 0x4cc9f0, op: 0.95 });
        curves2.push({ pts: [[xb - tick, 0], [xb + tick, 0]], color: 0x4cc9f0, op: 0.95 });
        curves2.push({ pts: [[xb - tick, an.b], [xb + tick, an.b]], color: 0x4cc9f0, op: 0.95 });
        markers2.push({ x: xb, y: an.b / 2, color: 0x4cc9f0, r: 0.004, label: 'b = ' + fmt(an.b) });
        var xdb = -0.9 * Rv;
        curves2.push({ pts: [[xdb, an.b - an.dbV], [xdb, an.b + an.dbV]], color: 0x4cc9f0, op: 0.55 });
        curves2.push({ pts: [[xdb - tick * 0.7, an.b - an.dbV], [xdb + tick * 0.7, an.b - an.dbV]], color: 0x4cc9f0, op: 0.55 });
        curves2.push({ pts: [[xdb - tick * 0.7, an.b + an.dbV], [xdb + tick * 0.7, an.b + an.dbV]], color: 0x4cc9f0, op: 0.55 });
        markers2.push({ x: xdb, y: an.b + an.dbV, color: 0x4cc9f0, r: 0.003, label: 'db' });
        /* the dθ wedge those tube rays open into (arc spanning the two outgoing rays) */
        if (tubeEnds.length === 2 && !an.tr.captured && Math.abs(tubeEnds[1] - tubeEnds[0]) > 0.005) {
          var raW = 0.62 * Rv, aw = [], naw = 20;
          for (j = 0; j <= naw; j++) {
            var aaw = tubeEnds[0] + (tubeEnds[1] - tubeEnds[0]) * j / naw;
            aw.push([raW * Math.cos(aaw), raW * Math.sin(aaw)]);
          }
          curves2.push({ pts: aw, color: 0x4cc9f0, op: 0.75 });
          var amid = (tubeEnds[0] + tubeEnds[1]) / 2;
          markers2.push({ x: 1.1 * raW * Math.cos(amid), y: 1.1 * raW * Math.sin(amid), color: 0x4cc9f0, r: 0.003, label: 'dθ' });
        }
        /* r_min: origin → closest-approach point of the trajectory */
        var rmI = 0, rmV = Infinity;
        for (j = 0; j < an.tr.pts.length; j++) {
          var rr = an.tr.pts[j][0] * an.tr.pts[j][0] + an.tr.pts[j][1] * an.tr.pts[j][1];
          if (rr < rmV) { rmV = rr; rmI = j; }
        }
        var Pm = an.tr.pts[rmI];
        curves2.push({ pts: [[0, 0], Pm], color: 0x63e6a0, op: 0.95 });
        markers2.push({ x: Pm[0], y: Pm[1], color: 0x63e6a0, r: 0.011, label: 'r_min = ' + fmt(an.defl.capture ? Math.sqrt(rmV) : an.defl.rmin) });
        /* θ arc where the outgoing asymptote crosses the undeflected line */
        if (!an.tr.captured) {
          var Pe = an.tr.pts[an.tr.pts.length - 1], vx2 = an.tr.vEnd[0], vy2 = an.tr.vEnd[1];
          var thS = an.tr.theta;                      /* signed outgoing angle vs +x */
          if (Math.abs(vy2) > 1e-6 && Math.abs(thS) > 0.03) {
            var tISect = (an.b - Pe[1]) / vy2;
            var xs = Pe[0] + tISect * vx2, ys = an.b;
            if (Math.abs(xs) < 0.72 * Rv) {
              var ra = 0.16 * Rv, arc = [], na = 26;
              for (j = 0; j <= na; j++) {
                var aa = thS * j / na;
                arc.push([xs + ra * Math.cos(aa), ys + ra * Math.sin(aa)]);
              }
              curves2.push({ pts: arc, color: 0xffd166, op: 0.95 });
              curves2.push({ pts: [[xs, ys], [xs + 1.55 * ra, ys]], color: 0xffd166, op: 0.4 });
              curves2.push({ pts: [[xs, ys], [xs + 1.55 * ra * Math.cos(thS), ys + 1.55 * ra * Math.sin(thS)]], color: 0xffd166, op: 0.4 });
              markers2.push({ x: xs + 1.3 * ra * Math.cos(thS / 2), y: ys + 1.3 * ra * Math.sin(thS / 2), color: 0xffd166, r: 0.004, label: 'θ = ' + fmt(VF.Scatter.fold(an.defl.theta) * 180 / Math.PI) + '°' });
            }
          }
        }
      }
      if (state.scPlaying) {
        var tt2 = state.scT % (sc.Tmax * 1.12);
        for (i = 0; i < sc.rays.length; i++) {
          var ry = sc.rays[i];
          if (tt2 < (ry._tlast || 0)) ry._ti = 0;             /* clock wrapped */
          ry._tlast = tt2;
          while (ry._ti < ry.ts.length - 1 && ry.ts[ry._ti + 1] < tt2) ry._ti++;
          if (tt2 <= ry.T) {
            var pp = ry.pts[ry._ti];
            if (Math.abs(pp[0]) <= Rv && Math.abs(pp[1]) <= Rv)
              markers2.push({ x: pp[0], y: pp[1], color: 0xffd166, r: 0.012 });
          }
        }
      }
      viz.render2D({ xr: [-Rv, Rv], yr: [-Rv, Rv], xlabel: 'x', ylabel: 'y', curves: curves2, markers: markers2 });
      setFormula(T('Scattering beam') + ' &nbsp; E = ½v∞², ' + T('impact parameter') + ' b &nbsp;·&nbsp; V(r) = <b>' + esc(state.scV) + '</b>');
      setStats('E = ' + fmt(state.scE) + ' · ' + T('rays') + ' b ∈ [−' + fmt(state.scBmax) + ', ' + fmt(state.scBmax) + ']' + (state.scPlaying ? ' · t = ' + fmt(state.scT) : '') + ' · ' + T('grey circle: V(r) = E'));
    }
    scReadout();
  }
  function scReadout() {
    if (!dom.scReadout || !cur.scatter) return;
    var sc = cur.scatter, html = '', ncap = 0, i;
    for (i = 0; i < sc.rays.length; i++) if (sc.rays[i].captured) ncap++;
    html += '<div class="ro-line"><span>' + T('head-on closest approach r₀') + '</span><b>' + (sc.r0 === 0 ? T('0 (reaches the centre)') : (isFinite(sc.r0) ? fmt(sc.r0) : 'n/a')) + '</b></div>';
    if (state.scAnno && sc.anno) {
      var anR = sc.anno;
      html += '<div class="ro-sub">' + T('annotated ray') + '</div><div class="ro-vec">' + T('impact parameter') + ' b = ' + fmt(anR.b) +
        (anR.tr.captured ? ' &nbsp;·&nbsp; <b>' + T('captured') + '</b> ' + T('(spirals in)')
          : ' &nbsp;·&nbsp; ' + T('scattering angle') + ' θ = ' + fmt(VF.Scatter.fold(anR.defl.theta) * 180 / Math.PI) + '° (Θ = ' + fmt(anR.defl.theta) + ' rad)' +
            ' &nbsp;·&nbsp; r_min = ' + fmt(anR.defl.rmin)) + '</div>';
      if (anR.sig && anR.sig.ok) {
        var pr2 = ctl.scPreset, cmp = '';
        if (pr2 && pr2.analytic === 'rutherford') {
          var dsA = Math.pow(pr2.k / (4 * state.scE), 2) / Math.pow(Math.sin(anR.sig.theta / 2), 4);
          cmp = ' &nbsp;·&nbsp; ' + T('analytic') + ' (k/4E)²/sin⁴(θ/2) = ' + fmt(dsA);
        } else if (pr2 && pr2.analytic === 'hard') cmp = ' &nbsp;·&nbsp; ' + T('analytic') + ' R²/4 = ' + fmt(pr2.R * pr2.R / 4);
        html += '<div class="ro-vec">' + T('cross-section') + '&nbsp; dσ/dΩ = (b/sin θ)·|db/dθ| = <b>' + fmt(anR.sig.ds) + '</b>' + cmp + '</div>';
        html += '<div class="muted small">' + T('The blue tube b ± db in the beam view carries the beam-annulus area 2πb·db into the solid-angle ring 2π·sinθ·dθ: their ratio IS dσ/dΩ. Where the tube barely spreads (|dθ/db| small), the cross-section is large.') + '</div>';
      } else if (!anR.tr.captured) {
        html += '<div class="muted small">' + T('dσ/dΩ undefined here (dθ/db ≈ 0: a rainbow extremum, or θ ≈ 0/π, or a neighbouring ray is captured).') + '</div>';
      }
    }
    html += '<div class="muted small">' + T('dσ/dΩ = (b/sin θ)·|db/dθ| is the <b>Jacobian of the map b → θ</b>: it counts how much beam area (2πb·db) lands in each solid angle (2π sinθ·dθ). No single trajectory carries a cross-section: only the family does.') + '</div>';
    if (ncap) html += '<div class="ro-sub">' + ncap + ' ' + T('beam ray(s) captured: they spiral into the centre') + '</div>';
    var pr = ctl.scPreset;
    if (pr && pr.analytic === 'rutherford') {
      html += '<div class="hint-good">' + T('1/r has infinite range: EVERY b deflects a little, so the classical total cross-section diverges; only dσ/dΩ is measurable. Rutherford fitted 1/sin⁴(θ/2) and used head-on rays to bound the nucleus: r₀ = k/E =') + ' ' + fmt(pr.k / state.scE) + '. ' + T('Raise E and watch r₀ shrink.') + '</div>';
    } else if (pr && pr.analytic === 'hard') {
      html += '<div class="hint-good">' + T('Isotropic dσ/dΩ = R²/4, so σ = ∫(R²/4)dΩ = πR²: the geometric shadow of the sphere. This is the ONLY case where the classical cross-section is just "the area you see".') + '</div>';
    } else {
      html += '<div class="muted small">' + T('Read the views together: the <b>beam</b> shows trajectories, <b>Θ(b)</b> is the deflection function they trace out, and <b>dσ/dΩ</b> is its Jacobian. A flat spot in Θ(b) (dθ/db = 0) → a rainbow spike in the cross-section.') + '</div>';
    }
    dom.scReadout.innerHTML = html;
  }
  function buildScatterPanel() {
    var panel = mk('div', { 'class': 'panel-body' });
    panel.appendChild(mk('div', { 'class': 'note', text: T('Scattering & cross-section (Streuung & Wirkungsquerschnitt): a parallel beam with impact parameter b hits a central potential V(r). The deflection function Θ(b) is computed from the exact classical scattering integral; its Jacobian gives the differential cross-section dσ/dΩ.') }));
    ctl.scV = exprInput(state.scV, function (v) { state.scV = v; ctl.scPreset = null; requestScatter(); }, function () { if (scTimer) clearTimeout(scTimer); scCompute(); });
    panel.appendChild(field('V(r)', ctl.scV, 'must → 0 as r → ∞'));
    panel.appendChild(sectionTitle('Presets'));
    var pb = mk('div', { 'class': 'presets' });
    SC_PRESETS.forEach(function (p) { pb.appendChild(button(p.name, 'preset', function () { applyScPreset(p); })); });
    panel.appendChild(pb);
    ctl.scDesc = mk('div', { 'class': 'preset-desc' });
    panel.appendChild(ctl.scDesc);
    panel.appendChild(sectionTitle('Beam'));
    ctl.scES = sliderCtl(0.1, 5, 0.05, state.scE, function (v) { state.scE = v; requestScatter(); });
    panel.appendChild(field('Energy E = ½v∞²', ctl.scES.node));
    ctl.scBmaxS = sliderCtl(0.5, 8, 0.1, state.scBmax, function (v) { state.scBmax = v; requestScatter(); });
    panel.appendChild(field('max impact parameter', ctl.scBmaxS.node));
    var rs2 = sliderCtl(7, 41, 2, state.scRays, function (v) { state.scRays = Math.round(v); requestScatter(); });
    panel.appendChild(field('beam rays', rs2.node));
    panel.appendChild(sectionTitle('View'));
    ctl.scViewSel = select([
      { v: 'beam', label: 'beam: trajectories' },
      { v: 'theta', label: 'deflection function Θ(b)' },
      { v: 'sigma', label: 'cross-section dσ/dΩ' }
    ], state.scView, function (v) { state.scView = v; refreshScAnnoVis(); renderScatterView(); });
    panel.appendChild(field('Show', ctl.scViewSel));
    ctl.scAnnoBox = mk('div', {}, []);
    ctl.scAnnoBox.appendChild(field('', checkbox('Annotate a ray: impact parameter b, scattering angle θ, r_min', state.scAnno,
      function (v) { state.scAnno = v; scAnnoCompute(); renderScatterView(); })));
    ctl.scAnnoBS = sliderCtl(0.05, state.scBmax, 0.05, state.scAnnoB,
      function (v) { state.scAnnoB = v; scAnnoCompute(); renderScatterView(); });
    ctl.scAnnoBNode = field('annotated b', ctl.scAnnoBS.node, 'slide the ray through the beam');
    ctl.scAnnoBox.appendChild(ctl.scAnnoBNode);
    panel.appendChild(ctl.scAnnoBox);
    ctl.scPlay = button('▶ Fire the beam', 'wide', toggleScPlay);
    panel.appendChild(ctl.scPlay);
    var ssp = sliderCtl(0.1, 4, 0.1, state.scSpeed, function (v) { state.scSpeed = v; });
    panel.appendChild(field('speed', ssp.node));
    ctl.scReadout = mk('div', { 'class': 'readout' });
    dom.scReadout = ctl.scReadout;
    panel.appendChild(ctl.scReadout);
    return panel;
  }
  function refreshScAnnoVis() {           /* annotation follows the ray through every view */
    if (ctl.scAnnoBNode) ctl.scAnnoBNode.style.display = state.scAnno ? '' : 'none';
  }
  function applyScPreset(p) {
    state.scV = p.V; ctl.scV.value = p.V;
    state.scE = p.E; syncSlider(ctl.scES, p.E);
    state.scBmax = p.bmax; syncSlider(ctl.scBmaxS, p.bmax);
    ctl.scPreset = p;
    if (ctl.scDesc) ctl.scDesc.innerHTML = '<b>' + T(p.name) + '</b>: ' + T(p.desc);
    scCompute();
  }
  function toggleScPlay() { state.scPlaying = !state.scPlaying; ctl.scPlay.textContent = state.scPlaying ? T('❚❚ Pause') : T('▶ Fire the beam'); ctl.scPlay.classList.toggle('active', state.scPlaying); if (!state.scPlaying) renderScatterView(); }


  K.lab({
    key: 'scatter', label: 'Scatter', flat: true, panel: buildScatterPanel,
    refresh: refreshScAnnoVis,
    enter: function () { viz._render2D = renderScatterView; if (cur.scatter) renderScatterView(); else scCompute(); },
    togglePlay: toggleScPlay,
    frame: function () {
      if (!(state.scPlaying && cur.scatter && state.scView === 'beam')) return;
      state.scT += state.scSpeed * 0.08;
      renderScatterView();
    }
  });

})(window.VF = window.VF || {});
