/* =============================================================================
 * continuity.js: numerical continuity classification (VF.Continuity)
 * -----------------------------------------------------------------------------
 * Classifies f on the plotted domain D = [−R,R]ⁿ (∩ constraints):
 *
 *      Lipschitz  ⊂  uniformly continuous  ⊂  continuous
 *
 * The certificates are numerical but honest about what they measure:
 *   - candidate discontinuities (large neighbour differences) are refined by
 *     bisection: a gap that survives 40 halvings is a JUMP; values that grow
 *     beyond every bound mark a POLE (f stays continuous on its domain there)
 *   - undefined points / domain edges are approached geometrically: divergent
 *     values → blow-up (1/x, ln x), non-vanishing oscillation → essential
 *     (sin(1/x)), vanishing oscillation → removable (sin(x)/x)
 *   - the Lipschitz bound sup‖∇f‖ is maximised on a grid, then the argmax is
 *     zoomed ×4 per level: a stabilising max is the constant L (mean value
 *     theorem); a max that keeps growing kills every candidate L (√|x| kink)
 *
 * On a compact domain continuity ⇒ uniform continuity (Heine–Cantor); the
 * classic x²-on-ℝ failure is reported as an OUTLOOK: the slope still grows
 * at 2R, so beyond the box no single δ(ε) could survive.
 * Pure math, ES5/JScript-safe, no DOM.
 * ========================================================================== */
(function (VF) {
  'use strict';

  function median(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    return s[s.length >> 1];
  }

  /* analyze(fn, gradMag, opts)
     fn(x,y,z,t) → value;  gradMag({x,y,z,t}) → ‖∇f‖;
     opts = { vars: ['x'(,'y'(,'z'))], R, t, region: fn|null } */
  function analyze(fn, gradMag, opts) {
    var vars = opts.vars, n = vars.length, R = opts.R, t = opts.t || 0, region = opts.region || null;
    var per = n === 1 ? 601 : (n === 2 ? 61 : 17);
    var spacing = 2 * R / (per - 1), axes = [], i;
    for (i = 0; i < per; i++) axes.push(-R + 2 * R * i / (per - 1));

    function P3(c) { var P = { x: 0, y: 0, z: 0, t: t }; for (var q = 0; q < n; q++) P[vars[q]] = c[q]; return P; }
    function F(c) { var P = P3(c); return fn(P.x, P.y, P.z, t); }
    function G(c) { var g = gradMag(P3(c)); return isFinite(g) ? g : 1e300; }
    function inReg(c) { if (!region) return true; var P = P3(c); return region(P.x, P.y, P.z, t) !== 0; }

    /* ---- grid pass: values, status, slope maximum ------------------------- */
    var D0 = per, D1 = n > 1 ? per : 1, D2 = n > 2 ? per : 1;
    var vals = new Array(D0 * D1 * D2), stat = new Array(D0 * D1 * D2);   /* 0 out, 1 hole, 2 defined */
    var maxG = 0, argG = null, fmin = Infinity, fmax = -Infinity, absV = [], defined = 0, holes = 0;
    var i2, j2, k2;
    function coord(a, b, c) { return [axes[a], n > 1 ? axes[b] : 0, n > 2 ? axes[c] : 0].slice(0, n); }
    for (k2 = 0; k2 < D2; k2++) for (j2 = 0; j2 < D1; j2++) for (i2 = 0; i2 < D0; i2++) {
      var idx = (k2 * D1 + j2) * D0 + i2, c = coord(i2, j2, k2);
      if (!inReg(c)) { stat[idx] = 0; continue; }
      var v = F(c);
      if (!isFinite(v)) { stat[idx] = 1; holes++; continue; }
      stat[idx] = 2; vals[idx] = v; defined++;
      if (v < fmin) fmin = v; if (v > fmax) fmax = v;
      absV.push(Math.abs(v));
      var g = G(c);
      if (g > maxG) { maxG = g; argG = c; }
    }
    if (defined < 8) return { inconclusive: true, defined: defined };
    var medAbs = median(absV), range = Math.max(fmax - fmin, 1e-30);

    /* ---- refine a suspicious segment: jump, pole, or just steep ----------- */
    function probeSegment(cA, cB, fA, fB) {
      function at(s) { var c = [], q; for (q = 0; q < n; q++) c.push(cA[q] + s * (cB[q] - cA[q])); return F(c); }
      var a = 0, b = 1, fa = fA, fb = fB, scale0 = Math.abs(fB - fA);
      var bigV = 1e6 * (1 + Math.abs(fA) + Math.abs(fB)), q2;
      for (q2 = 0; q2 < 40; q2++) {
        var m = (a + b) / 2, fm = at(m);
        if (!isFinite(fm) || Math.abs(fm) > bigV) return { kind: 'pole', s: m };
        if (Math.abs(fm - fa) >= Math.abs(fb - fm)) { b = m; fb = fm; } else { a = m; fa = fm; }
      }
      if (Math.abs(fa) > 1e3 * (1 + Math.abs(fA) + Math.abs(fB)) || Math.abs(fb) > 1e3 * (1 + Math.abs(fA) + Math.abs(fB)))
        return { kind: 'pole', s: (a + b) / 2 };
      var osc = Math.abs(fb - fa);
      if (osc > 0.5 * scale0) return { kind: 'jump', s: (a + b) / 2, size: osc };
      return { kind: 'smooth' };
    }
    function segPoint(cA, cB, s) { var c = [], q; for (q = 0; q < n; q++) c.push(cA[q] + s * (cB[q] - cA[q])); return c; }

    /* ---- approach a domain edge (hole / region border): classify it -------- */
    function probeEdge(cIn, cOut) {
      /* largest s∈[0,1] along cIn→cOut that is still defined & in-region */
      var lo = 0, hi = 1, q;
      for (q = 0; q < 30; q++) {
        var m = (lo + hi) / 2, cm = segPoint(cIn, cOut, m);
        if (inReg(cm) && isFinite(F(cm))) lo = m; else hi = m;
      }
      var vsq = [], dstep = lo;
      for (q = 1; q <= 6; q++) {
        var sq = lo - dstep * Math.pow(4, -q) - 1e-12;
        if (sq <= 0) break;
        var vq = F(segPoint(cIn, cOut, sq));
        if (isFinite(vq)) vsq.push(vq);
      }
      if (vsq.length < 3) return { kind: 'tame' };
      var oscs = [], mono = true;
      for (q = 1; q < vsq.length; q++) {
        oscs.push(Math.abs(vsq[q] - vsq[q - 1]));
        if (Math.abs(vsq[q]) <= Math.abs(vsq[q - 1])) mono = false;
      }
      var oFirst = oscs[0], oLast = oscs[oscs.length - 1];
      if (oLast < 0.15 * oFirst || oLast < 1e-9 * (1 + medAbs)) return { kind: 'tame' };
      if (mono) return { kind: 'blowup', at: segPoint(cIn, cOut, hi), v: vsq[vsq.length - 1] };
      return { kind: 'osc', at: segPoint(cIn, cOut, hi), amp: oLast };
    }

    /* ---- neighbour scan: jump/pole candidates + domain edges --------------- */
    var cands = [], edges = [], allD = [], AXD = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], ax, ci;
    for (ax = 0; ax < n; ax++) {
      for (k2 = 0; k2 < D2; k2++) for (j2 = 0; j2 < D1; j2++) for (i2 = 0; i2 < D0; i2++) {
        var iB = i2 + AXD[ax][0], jB = j2 + AXD[ax][1], kB = k2 + AXD[ax][2];
        if (iB >= D0 || jB >= D1 || kB >= D2) continue;
        var idA = (k2 * D1 + j2) * D0 + i2, idB = (kB * D1 + jB) * D0 + iB;
        if (stat[idA] === 2 && stat[idB] === 2) {
          var d = Math.abs(vals[idB] - vals[idA]);
          if (!isFinite(d)) continue;
          allD.push(d);          /* median over ALL pairs: zeros included, else a lone jump IS the median */
          if (d > 0) cands.push({ d: d, a: coord(i2, j2, k2), b: coord(iB, jB, kB), fa: vals[idA], fb: vals[idB] });
        } else if ((stat[idA] === 2) !== (stat[idB] === 2)) {
          if (edges.length < 40) edges.push(stat[idA] === 2
            ? { cin: coord(i2, j2, k2), cout: coord(iB, jB, kB) }
            : { cin: coord(iB, jB, kB), cout: coord(i2, j2, k2) });
        }
      }
    }
    var thr = Math.max(8 * median(allD), 0.04 * range);
    cands.sort(function (p, q) { return q.d - p.d; });
    var jump = null, pole = null;
    for (ci = 0; ci < cands.length && ci < 6 && !jump; ci++) {
      if (cands[ci].d <= thr) break;
      var pr = probeSegment(cands[ci].a, cands[ci].b, cands[ci].fa, cands[ci].fb);
      if (pr.kind === 'jump') jump = { at: segPoint(cands[ci].a, cands[ci].b, pr.s), size: pr.size };
      else if (pr.kind === 'pole' && !pole) pole = { at: segPoint(cands[ci].a, cands[ci].b, pr.s) };
    }
    var blow = null, oscE = null, removable = false, ei;
    for (ei = 0; ei < edges.length && ei < 6 && !blow && !oscE; ei++) {
      var pe = probeEdge(edges[ei].cin, edges[ei].cout);
      if (pe.kind === 'blowup') blow = { at: pe.at, v: pe.v };
      else if (pe.kind === 'osc') oscE = { at: pe.at, amp: pe.amp };
      else removable = removable || holes > 0;
    }

    /* ---- Lipschitz: zoom the slope maximum -------------------------------- */
    var L = null, slopeUnb = null;
    if (argG) {
      var w = spacing, cur = argG.slice(), g0 = Math.max(maxG, 1e-30), gPrev = g0, gLast = g0, lastRatio = 1, lv, m2 = n === 1 ? 4 : (n === 2 ? 2 : 1);
      for (lv = 0; lv < 5; lv++) {
        var best = gLast, bestC = cur, o0, o1v, o2;
        for (o2 = -m2; o2 <= m2; o2++) for (o1v = -m2; o1v <= m2; o1v++) for (o0 = -m2; o0 <= m2; o0++) {
          if (n < 3 && o2 !== 0) continue;
          if (n < 2 && o1v !== 0) continue;
          var cc = [cur[0] + o0 * w / m2], q3;
          if (n > 1) cc.push(cur[1] + o1v * w / m2);
          if (n > 2) cc.push(cur[2] + o2 * w / m2);
          var okc = true;
          for (q3 = 0; q3 < n; q3++) if (cc[q3] < -R || cc[q3] > R) okc = false;
          if (!okc || !inReg(cc) || !isFinite(F(cc))) continue;
          var gg = G(cc);
          if (gg > best) { best = gg; bestC = cc; }
        }
        gPrev = gLast; gLast = best; cur = bestC; w /= 4;
        lastRatio = gLast / Math.max(gPrev, 1e-30);
      }
      /* unbounded if the max keeps growing at the last level, has exploded in
         total (a near-singular sample can plateau after one giant early jump:
         floating-point crumbs land at 1e−17, not exactly on the singularity),
         or is astronomically large outright */
      if ((gLast > 4 * g0 && lastRatio > 1.15) || gLast > 100 * g0 || gLast > 1e9) slopeUnb = { v: gLast >= 1e300 ? Infinity : gLast, d: w * 4, at: cur };
      else L = gLast;
      if (L != null) argG = cur;
    }

    /* ---- outlook beyond the box (no constraints only) ---------------------- */
    var growth = null;
    if (!region && n <= 2 && !jump && !pole) {
      var perF = n === 1 ? 161 : 33, farMax = 0, fi, fj;
      for (fj = 0; fj < (n > 1 ? perF : 1); fj++) for (fi = 0; fi < perF; fi++) {
        var cf = [-2 * R + 4 * R * fi / (perF - 1)];
        if (n > 1) cf.push(-2 * R + 4 * R * fj / (perF - 1));
        if (!isFinite(F(cf))) continue;
        var gf = G(cf);
        if (gf < 1e290 && gf > farMax) farMax = gf;
      }
      growth = { far: farMax, growing: L != null && farMax > 1.8 * Math.max(L, 1e-30) };
    }

    var continuous = !jump;
    var uniform = continuous && !pole && !blow && !oscE;
    var lipschitz = uniform && slopeUnb == null && L != null;
    return {
      continuous: continuous, uniform: uniform, lipschitz: lipschitz,
      L: lipschitz ? L : null, Lat: argG, slopeUnb: slopeUnb,
      jump: jump, pole: pole, blow: blow, oscE: oscE,
      holes: holes, removable: removable && uniform, growth: growth, n: n
    };
  }

  VF.Continuity = { analyze: analyze };

})(window.VF = window.VF || {});
