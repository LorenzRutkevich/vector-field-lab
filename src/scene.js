/* =============================================================================
 * scene.js: Three.js rendering engine (VF.Viz)
 * -----------------------------------------------------------------------------
 * A thin, reusable renderer. It knows nothing about parsing or calculus; it is
 * handed already-sampled data and draws it fast:
 *   - vector fields  -> LineSegments (shafts) + InstancedMesh (cone heads)
 *   - scalar fields  -> colored Points (volume / iso-shell / dense slice)
 *   - streamlines    -> vertex-colored Lines
 *   - matrices       -> deformed cube, basis & eigenvector arrows, exp(tA) flow
 * ========================================================================== */
(function (VF) {
  'use strict';

  var YUP = new THREE.Vector3(0, 1, 0);

  var THEMES = {
    dark:  { bg: 0x0b0e14, box: 0x33405a, grid1: 0x2a3550, grid2: 0x1b2436 },
    light: { bg: 0xeef1f6, box: 0xa9b4c8, grid1: 0xc4cddc, grid2: 0xd8dfe9 }
  };

  function clearGroup(g) {
    for (var i = g.children.length - 1; i >= 0; i--) {
      var c = g.children[i];
      if (c.children && c.children.length) clearGroup(c); /* nested decorations (e.g. the box's edge lines) */
      /* InstancedMesh keeps its instance buffers outside the geometry; without
         this the arrow-head buffers leak on every re-render (t-animation!) */
      if (c.isInstancedMesh && c.dispose) c.dispose();
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        /* text sprites and image meshes own their canvas texture; free it
           (Points share this.disc, which must stay alive).
           NB: on a multi-material Array, .map is Array.prototype.map. Check first! */
        if (Array.isArray(c.material)) c.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
        else {
          if ((c.isSprite || c.isMesh) && c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      }
      g.remove(c);
    }
  }

  function makeDisc() {
    var s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,1)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); ctx.fill();
    var tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
  }

  function makeTextSprite(text, hex) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#' + ('000000' + hex.toString(16)).slice(-6);
    ctx.font = 'bold 44px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 34);
    var tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(0.8, 0.8, 0.8);
    return sp;
  }

  /* ---- Constructor -------------------------------------------------------- */
  function Viz(canvas) {
    var self = this;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e14);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 4000);
    this.controls = new VF.OrbitControls(this.camera, canvas);
    this.controls.setView({ radius: 16 });

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    var dir = new THREE.DirectionalLight(0xffffff, 0.55); dir.position.set(8, 6, 14); this.scene.add(dir);
    var dir2 = new THREE.DirectionalLight(0x8899ff, 0.25); dir2.position.set(-8, -6, -4); this.scene.add(dir2);

    this.groupHelpers = new THREE.Group();
    this.groupArrows = new THREE.Group();
    this.groupScalar = new THREE.Group();
    this.groupStreams = new THREE.Group();
    this.groupMatrix = new THREE.Group();
    this.groupFlow = new THREE.Group();
    this.groupFunc = new THREE.Group();
    this.groupMarker = new THREE.Group();   /* the "values at point P" marker */
    this.groupPoints = new THREE.Group();   /* user's custom annotation points (persist across tabs) */
    this.groupBodies = new THREE.Group();   /* test bodies dropped into the field (Fields tab) */
    this.groupRigid = new THREE.Group();    /* the spinning-top body (Rigid tab) */
    this.groupRigid.visible = false;
    this.groupRoot = new THREE.Group();   /* holds all content; per-axis scaling applies here */
    this.groupRoot.add(this.groupHelpers, this.groupArrows, this.groupScalar,
      this.groupStreams, this.groupMatrix, this.groupFlow, this.groupFunc, this.groupMarker, this.groupPoints, this.groupBodies, this.groupRigid);
    this.scene.add(this.groupRoot);

    /* Shared 2-D orthographic mode for the flat labs (Minkowski, Quantum, Phase
       space, Fourier): a head-on, undistorted view driven by an explicit data box.
       group2D lives outside groupRoot so it is unaffected by per-axis scaling and
       toggles independently. Only one 2-D lab is shown at a time. */
    this.orthoCamera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 1000);
    this.orthoCamera.position.set(0, 0, 100);
    this.orthoCamera.up.set(0, 1, 0);
    this.orthoCamera.lookAt(0, 0, 0);
    this.is2D = false;
    this.half2D = 6;                               /* symmetric range (Minkowski) */
    this.box2D = { l: -8, r: 8, b: -6, t: 6 };     /* explicit view box (all 2-D labs) */
    this._render2D = null;                          /* ui sets this to re-render the active lab on resize */
    this.group2D = new THREE.Group();
    this.group2D.visible = false;
    this.scene.add(this.group2D);

    this.disc = makeDisc();
    this.R = 5;
    this.domain = { min: [-5, -5, -5], max: [5, 5, 5] };
    this._frameCbs = [];
    this.theme = 'dark';
    this._helperColors = THEMES.dark;

    this.setDomain(5);

    function animate() {
      self._raf = requestAnimationFrame(animate);
      if (!self.is2D) self.controls.update();       /* 2-D view is fixed head-on: no orbit */
      for (var i = 0; i < self._frameCbs.length; i++) self._frameCbs[i]();
      self.renderer.render(self.scene, self.is2D ? self.orthoCamera : self.camera);
    }
    this.resize();
    animate();
    window.addEventListener('resize', function () { self.resize(); });
  }

  Viz.prototype.onFrame = function (cb) { this._frameCbs.push(cb); };

  Viz.prototype.resize = function () {
    var w = this.canvas.clientWidth || this.canvas.parentNode.clientWidth || 800;
    var h = this.canvas.clientHeight || this.canvas.parentNode.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this._applyOrtho2D();
    if (this.is2D && this._render2D) this._render2D();   /* re-fit the active 2-D lab */
  };

  Viz.prototype._applyOrtho2D = function () {
    var oc = this.orthoCamera, b = this.box2D;
    oc.left = b.l; oc.right = b.r; oc.top = b.t; oc.bottom = b.b;
    oc.updateProjectionMatrix();
  };
  /* explicit data box: used by Quantum / Phase / Fourier (units differ per axis) */
  Viz.prototype.set2DBox = function (l, r, b, t) { this.box2D = { l: l, r: r, b: b, t: t }; this._applyOrtho2D(); };
  /* symmetric, equal-scale box (Minkowski): ±H vertical, aspect-widened horizontally,
     so a 45° light line really looks 45° and the hyperbola calibration is undistorted */
  Viz.prototype.set2DRange = function (H) {
    this.half2D = H;
    var w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600, a = w / Math.max(1, h);
    if (a >= 1) this.set2DBox(-H * a, H * a, -H, H); else this.set2DBox(-H, H, -H / a, H / a);
  };
  Viz.prototype.enter2D = function () { this.is2D = true; this.groupRoot.visible = false; this.group2D.visible = true; this._applyOrtho2D(); };
  Viz.prototype.exit2D = function () { this.is2D = false; this.groupRoot.visible = true; this.group2D.visible = false; this._render2D = null; clearGroup(this.group2D); };

  /* ---- Domain helpers (axes / box / floor grid) --------------------------- */
  Viz.prototype.setDomain = function (R) {
    this.R = R;
    this.domain = { min: [-R, -R, -R], max: [R, R, R] };
    var g = this.groupHelpers;
    clearGroup(g);

    var axisData = [
      { to: [R, 0, 0], hex: 0xff6b6b, label: 'x' },
      { to: [0, R, 0], hex: 0x63e6a0, label: 'y' },
      { to: [0, 0, R], hex: 0x6ba6ff, label: 'z' }
    ];
    for (var i = 0; i < 3; i++) {
      var a = axisData[i];
      var neg = [-a.to[0], -a.to[1], -a.to[2]];
      var lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
        [neg[0], neg[1], neg[2], a.to[0], a.to[1], a.to[2]]), 3));
      g.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: a.hex, transparent: true, opacity: 0.55 })));
      addArrowTo(g, [0, 0, 0], a.to, a.hex, { headLen: R * 0.06, opacity: 0.95 });
      var sp = makeTextSprite(a.label, a.hex);
      sp.position.set(a.to[0] * 1.08, a.to[1] * 1.08, a.to[2] * 1.08);
      g.add(sp);
    }

    var tc = this._helperColors;
    addCubeEdges(g, R, null, tc.box, 0.5);              /* domain box */

    var grid = new THREE.GridHelper(2 * R, 12, tc.grid1, tc.grid2);
    grid.rotation.x = Math.PI / 2;   /* lay the floor grid in the x–y plane */
    grid.position.z = -R;            /* floor at z = -R (z is up) */
    if (grid.material) { grid.material.transparent = true; grid.material.opacity = 0.55; }
    g.add(grid);

    if (this.controls) this.controls.maxR = R * 40;
  };

  Viz.prototype.setHelpersVisible = function (v) { this.groupHelpers.visible = v; };

  Viz.prototype.setTheme = function (mode) {
    this.theme = mode;
    this._helperColors = THEMES[mode] || THEMES.dark;
    this.scene.background = new THREE.Color(this._helperColors.bg);
    this.setDomain(this.R);     /* rebuild helpers in theme colors */
  };

  Viz.prototype.setAxisScale = function (sx, sy, sz) { this.groupRoot.scale.set(sx, sy, sz); };

  Viz.prototype.setPointMarker = function (pos, hex, r) {
    clearGroup(this.groupMarker);
    if (pos) addMarker(this.groupMarker, pos, hex == null ? 0xff5cc8 : hex, r || this.R * 0.03);
  };
  Viz.prototype.clearPointMarker = function () { clearGroup(this.groupMarker); };

  /* high-resolution PNG snapshot of the current view (render-then-read; restores size) */
  Viz.prototype.captureImage = function () {
    var w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600, oldPR = this.renderer.getPixelRatio();
    var scale = Math.max(oldPR, 2200 / Math.max(w, h)); if (scale > 4) scale = 4;
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, this.is2D ? this.orthoCamera : this.camera);
    var url = this.canvas.toDataURL('image/png');
    this.renderer.setPixelRatio(oldPR);
    this.resize();
    return url;
  };

  /* user's custom annotation points: colored spheres + small index labels */
  Viz.prototype.setCustomPoints = function (pts) {
    clearGroup(this.groupPoints);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], hex = p.color == null ? 0xffd166 : p.color;
      addMarker(this.groupPoints, [p.x, p.y, p.z], hex, this.R * 0.035);
      var sp = makeTextSprite(String(i + 1), hex);
      sp.scale.set(0.55, 0.55, 0.55);
      sp.position.set(p.x + this.R * 0.05, p.y + this.R * 0.05, p.z + this.R * 0.05);
      this.groupPoints.add(sp);
    }
  };

  /* ---- Test bodies (Fields tab): dropped objects that ride the field ----- */
  /* a die-like cube: six distinctly coloured faces make rotation and shear
     visible; matrix is set directly (matrixAutoUpdate=false) so ui.js can
     apply position + orientation R (or the full deformation gradient A). */
  Viz.prototype.addBody = function (size, faceHexes) {
    var mats = [];
    for (var i = 0; i < 6; i++) mats.push(new THREE.MeshLambertMaterial({ color: faceHexes[i % faceHexes.length] }));
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0x10141f, transparent: true, opacity: 0.5 })));
    mesh.matrixAutoUpdate = false;
    this.groupBodies.add(mesh);
    return mesh;
  };
  /* place the body: world matrix = translation(x) · B, B a 3×3 basis (rows) */
  Viz.prototype.setBodyTransform = function (mesh, x, B) {
    mesh.matrix.set(
      B[0][0], B[0][1], B[0][2], x[0],
      B[1][0], B[1][1], B[1][2], x[1],
      B[2][0], B[2][1], B[2][2], x[2],
      0, 0, 0, 1);
    mesh.matrixWorldNeedsUpdate = true;
  };
  Viz.prototype.setBodyFaded = function (mesh, faded) {
    for (var i = 0; i < mesh.material.length; i++) {
      mesh.material[i].transparent = faded;
      mesh.material[i].opacity = faded ? 0.3 : 1;
    }
  };
  /* trail (pathline): preallocated line, grown via setDrawRange */
  Viz.prototype.addBodyTrail = function (hex, cap) {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
    geo.setDrawRange(0, 0);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.7 }));
    line.frustumCulled = false;                    /* bounds change every frame */
    this.groupBodies.add(line);
    return line;
  };
  Viz.prototype.updateBodyTrail = function (line, pts) {
    var a = line.geometry.attributes.position.array;
    var n = Math.min(pts.length, Math.floor(a.length / 3));
    for (var i = 0; i < n; i++) { a[3 * i] = pts[i][0]; a[3 * i + 1] = pts[i][1]; a[3 * i + 2] = pts[i][2]; }
    line.geometry.setDrawRange(0, n);
    line.geometry.attributes.position.needsUpdate = true;
  };
  Viz.prototype.removeBody = function (obj) {      /* dispose incl. edge-line child */
    for (var i = obj.children.length - 1; i >= 0; i--) {
      var c = obj.children[i];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      obj.remove(c);
    }
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
      else obj.material.dispose();
    }
    this.groupBodies.remove(obj);
  };
  Viz.prototype.clearBodies = function () {
    for (var i = this.groupBodies.children.length - 1; i >= 0; i--) this.removeBody(this.groupBodies.children[i]);
  };
  Viz.prototype.setBodiesVisible = function (v) { this.groupBodies.visible = v; };

  /* ---- the spinning top (Rigid tab): a die-faced box with per-axis sizes --- */
  /* build a compound rigid body from axis-aligned primitives, drawn about the
     ROTATION CENTRE ref (each part at pos − ref): that is the COM for a free
     body, or the pivot when the body is pinned.  opts: { Q (principal axes,
     columns, built frame), axisLen, spinAxis (unit vector, built frame) +
     spinLen, showAxes, partColors, comMark (COM relative to ref, drawn as a
     body-fixed dot with an arm), pivotMark (mark ref itself), markR }.
     The group's matrix is set per frame via rigidTransform. */
  Viz.prototype.rigidCompound = function (parts, ref, opts) {
    clearGroup(this.groupRigid);
    opts = opts || {};
    var group = new THREE.Group(), i, p;
    var cols = opts.partColors || [0x8fa3c8, 0xc8a37f, 0x8fc8a8, 0xc88fa3, 0x9a8fc8, 0xc8bf8f];
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var geo, mesh;
      var mat = new THREE.MeshLambertMaterial({ color: cols[i % cols.length] });
      if (p.type === 'box') geo = new THREE.BoxGeometry(p.dims[0], p.dims[1], p.dims[2]);
      else if (p.type === 'sphere') geo = new THREE.SphereGeometry(p.dims[0], 24, 16);
      else if (p.type === 'ellipsoid') geo = new THREE.SphereGeometry(1, 24, 16);
      else if (p.type === 'cylinder') geo = new THREE.CylinderGeometry(p.dims[0], p.dims[0], p.dims[1], 24);
      else geo = new THREE.TorusGeometry(p.dims[0], p.dims[1], 12, 36);
      mesh = new THREE.Mesh(geo, mat);
      if (p.type === 'ellipsoid') mesh.scale.set(p.dims[0], p.dims[1], p.dims[2]);
      if (p.type === 'cylinder') {                     /* THREE cylinder axis = y */
        if (p.axis === 'x') mesh.rotation.z = Math.PI / 2;
        else if (p.axis === 'z') mesh.rotation.x = Math.PI / 2;
      }
      if (p.type === 'ring') {                         /* THREE torus axis = z */
        if (p.axis === 'x') mesh.rotation.y = Math.PI / 2;
        else if (p.axis === 'y') mesh.rotation.x = Math.PI / 2;
      }
      mesh.position.set(p.pos[0] - ref[0], p.pos[1] - ref[1], p.pos[2] - ref[2]);
      if (p.type === 'box') mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x10141f, transparent: true, opacity: 0.5 })));
      group.add(mesh);
    }
    /* principal axes e₁/e₂/e₃ (columns of Q) as body-fixed lines through COM */
    var AXCOL = [0x4cc9f0, 0xff8c42, 0xa78bfa], L = opts.axisLen || 2;
    if (opts.showAxes && opts.Q) {
      for (i = 0; i < 3; i++) {
        var d = [opts.Q[0][i], opts.Q[1][i], opts.Q[2][i]];
        var lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
          [-L * d[0], -L * d[1], -L * d[2], L * d[0], L * d[1], L * d[2]]), 3));
        group.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: AXCOL[i] })));
      }
    }
    /* the chosen spin axis, body-fixed, dashed gold: starts aligned with the
       (solid gold) ω arrow and separates from it as instability develops */
    if (opts.spinAxis) {
      var sL = opts.spinLen || L * 1.25, sa = opts.spinAxis;
      var sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
        [-sL * sa[0], -sL * sa[1], -sL * sa[2], sL * sa[0], sL * sa[1], sL * sa[2]]), 3));
      var sline = new THREE.Line(sg, new THREE.LineDashedMaterial({ color: 0xffd166, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9 }));
      sline.computeLineDistances();
      group.add(sline);
    }
    /* the centre of mass, body-fixed, so when the body turns about a pivot it
       is seen to orbit; the thin arm is the lever d = com − ref */
    var mR = opts.markR || 0.09;
    if (opts.comMark) {
      var cm = opts.comMark;
      var cmesh = new THREE.Mesh(new THREE.SphereGeometry(mR, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xf2f5ff }));
      cmesh.position.set(cm[0], cm[1], cm[2]);
      group.add(cmesh);
      var ag = new THREE.BufferGeometry();
      ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, cm[0], cm[1], cm[2]]), 3));
      group.add(new THREE.Line(ag, new THREE.LineBasicMaterial({ color: 0xf2f5ff, transparent: true, opacity: 0.55 })));
    }
    /* the pivot: sits at the group origin, hence fixed in space */
    if (opts.pivotMark) group.add(new THREE.Mesh(new THREE.SphereGeometry(mR * 0.85, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff5a5a })));
    group.matrixAutoUpdate = false;
    this.groupRigid.add(group);
    this._rigidMesh = group;
    return group;
  };
  /* B = built→space rotation, x = where the rotation centre sits in space */
  Viz.prototype.rigidTransform = function (B, x) { if (this._rigidMesh) this.setBodyTransform(this._rigidMesh, x || [0, 0, 0], B); };
  Viz.prototype.setRigidVisible = function (v) { this.groupRigid.visible = v; };

  /* translucent sphere (the Gauss surface in the Charges tab), additive */
  /* lives in the marker group so it can be moved cheaply, without rebuilding the field scene */
  Viz.prototype.addTranslucentSphere = function (center, R, hex, opacity) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20),
      new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity: opacity == null ? 0.16 : opacity, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(center[0], center[1], center[2]);
    this.groupMarker.add(m);
  };

  /* ---- Bloch sphere (Spin tab): wire sphere + state / axis / trail --------- */
  Viz.prototype.renderBloch = function (m) {
    clearGroup(this.groupFunc);
    var g = this.groupFunc, R = this.R * 0.62, i, k;
    var light = this.theme === 'light';
    var wire = light ? 0xa9b4c8 : 0x3a4661, txt = light ? 0x1b2330 : 0xdfe5f0;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24),
      new THREE.MeshLambertMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.07, depthWrite: false })));
    function circle(axis, rad, z0, hex, op) {
      var pts = [];
      for (k = 0; k <= 72; k++) {
        var a = 2 * Math.PI * k / 72, c = rad * Math.cos(a), s = rad * Math.sin(a);
        if (axis === 'z') pts.push([c, s, z0]);
        else if (axis === 'x') pts.push([z0, c, s]);
        else pts.push([c, z0, s]);
      }
      addPolyline(g, pts, hex, op);
    }
    circle('z', R, 0, wire, 0.8);                              /* equator */
    circle('x', R, 0, wire, 0.5); circle('y', R, 0, wire, 0.5);
    for (i = 1; i <= 2; i++) {                                 /* parallels */
      var zz = R * i / 3, rr = Math.sqrt(R * R - zz * zz);
      circle('z', rr, zz, wire, 0.3); circle('z', rr, -zz, wire, 0.3);
    }
    addPolyline(g, [[0, 0, -R * 1.15], [0, 0, R * 1.15]], wire, 0.6);
    var s0 = makeTextSprite('|0⟩', txt); s0.position.set(0, 0, R * 1.28); g.add(s0);
    var s1 = makeTextSprite('|1⟩', txt); s1.position.set(0, 0, -R * 1.28); g.add(s1);
    if (m.omega && m.omegaMag > 1e-9) {                        /* precession axis Ω */
      var o = m.omega, on = m.omegaMag;
      addArrowTo(g, [-o[0] / on * R * 1.1, -o[1] / on * R * 1.1, -o[2] / on * R * 1.1],
        [o[0] / on * R * 1.1, o[1] / on * R * 1.1, o[2] / on * R * 1.1], 0x4cc9f0, { headLen: R * 0.09, opacity: 0.85 });
    }
    if (m.trail && m.trail.length > 1) {
      var tp = [];
      for (i = 0; i < m.trail.length; i++) tp.push([m.trail[i][0] * R, m.trail[i][1] * R, m.trail[i][2] * R]);
      addPolyline(g, tp, 0xff5cc8, 0.9);
    }
    addArrowTo(g, [0, 0, 0], [m.r[0] * R, m.r[1] * R, m.r[2] * R], 0xffd166, { headLen: R * 0.1 });
    addMarker(g, [m.r[0] * R, m.r[1] * R, m.r[2] * R], 0xffd166, R * 0.045);
  };

  /* ---- Vector field (batched arrows) ------------------------------------- */
  Viz.prototype.renderVectorField = function (samples, opts) {
    clearGroup(this.groupArrows);
    buildArrows(this.groupArrows, samples, opts);
  };
  Viz.prototype.clearVectorField = function () { clearGroup(this.groupArrows); };

  /* ---- Scalar field (points) --------------------------------------------- */
  Viz.prototype.renderScalarPoints = function (list, opts) {
    clearGroup(this.groupScalar);
    opts = opts || {};
    var n = list.pos.length; if (!n) return;
    var map = opts.map, size = opts.size || 0.25, centerZero = opts.centerZero;
    var min = list.min, max = list.max;
    var maxAbs = Math.max(Math.abs(min), Math.abs(max)) || 1;
    var span = (max > min) ? (max - min) : 1;
    var hideBelow = opts.hideBelow || 0;
    var color = new THREE.Color(), pos = [], col = [];
    for (var i = 0; i < n; i++) {
      var val = list.val[i];
      if (!isFinite(val)) continue;
      if (hideBelow > 0 && Math.abs(val) < hideBelow) continue;
      var tt = centerZero ? (0.5 + 0.5 * val / maxAbs) : (val - min) / span;
      tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
      var c = map(tt); color.setRGB(c.r, c.g, c.b);
      var p = list.pos[i];
      pos.push(p[0], p[1], p[2]); col.push(color.r, color.g, color.b);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    var mat = new THREE.PointsMaterial({
      size: size, sizeAttenuation: true, vertexColors: true,
      map: this.disc, transparent: true, alphaTest: 0.5, depthWrite: true
    });
    this.groupScalar.add(new THREE.Points(geo, mat));
  };
  Viz.prototype.clearScalar = function () { clearGroup(this.groupScalar); };

  /* ---- Streamlines -------------------------------------------------------- */
  Viz.prototype.renderStreamlines = function (lines, opts) {
    clearGroup(this.groupStreams);
    opts = opts || {};
    var map = opts.map, min = opts.min, max = opts.max;
    var span = (max > min) ? (max - min) : 1;
    var color = new THREE.Color();
    for (var l = 0; l < lines.length; l++) {
      var pts = lines[l].pts, sp = lines[l].speeds, m = pts.length;
      if (m < 2) continue;
      var P = new Float32Array(3 * m), C = new Float32Array(3 * m);
      for (var i = 0; i < m; i++) {
        P[3 * i] = pts[i][0]; P[3 * i + 1] = pts[i][1]; P[3 * i + 2] = pts[i][2];
        var tt = (sp[i] - min) / span; tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
        var c = map(tt); color.setRGB(c.r, c.g, c.b);
        C[3 * i] = color.r; C[3 * i + 1] = color.g; C[3 * i + 2] = color.b;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
      this.groupStreams.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
    }
  };
  Viz.prototype.clearStreamlines = function () { clearGroup(this.groupStreams); };

  /* ---- Matrix visualization ---------------------------------------------- */
  Viz.prototype.renderMatrix = function (A, opts) {
    clearGroup(this.groupMatrix);
    opts = opts || {};
    var g = this.groupMatrix;
    var La = VF.LinAlg;
    var s = opts.cubeSize || Math.max(1.2, this.R * 0.5);

    if (opts.showCube) {
      addCubeEdges(g, s, null, 0x3a4661, 0.4);          /* original cube (faint) */
      addCubeEdges(g, s, A, 0xffb454, 0.95);            /* transformed cube */
    }
    if (opts.showBasis) {
      var cols = [0xff6b6b, 0x63e6a0, 0x6ba6ff];
      for (var j = 0; j < 3; j++) {
        var e = [0, 0, 0]; e[j] = s;
        addArrowTo(g, [0, 0, 0], e, cols[j], { headLen: s * 0.12, opacity: 0.35 });   /* e_j */
        var Ae = La.matVec(A, e);
        addArrowTo(g, [0, 0, 0], Ae, cols[j], { headLen: s * 0.14, opacity: 1.0 });   /* A·e_j (= column j) */
      }
    }
    if (opts.showEig) {
      var e2 = La.eig(A);
      for (var k = 0; k < e2.values.length; k++) {
        var v = e2.vectors[k];
        if (!v) continue;
        var lam = e2.values[k].re;
        var hex = lam >= 0 ? 0xffd166 : 0x4cc9f0;
        var L = s * 1.15;
        addArrowTo(g, [0, 0, 0], [v[0] * L, v[1] * L, v[2] * L], hex, { headLen: s * 0.13 });
        addArrowTo(g, [0, 0, 0], [-v[0] * L, -v[1] * L, -v[2] * L], hex, { headLen: s * 0.13, opacity: 0.5 });
      }
    }
    if (opts.showField && opts.fieldSamples) {
      buildArrows(g, opts.fieldSamples, opts.fieldOpts);
    }
  };

  /* animated one-parameter flow  x(tt) = exp(tt·A)·x0 */
  Viz.prototype.renderMatrixFlow = function (A, tt, opts) {
    clearGroup(this.groupFlow);
    opts = opts || {};
    var La = VF.LinAlg;
    var seeds = opts.seeds || defaultSeeds(Math.max(1.2, this.R * 0.45));
    var steps = opts.steps || 26;
    var map = opts.map || VF.Colormaps.get('turbo');
    if (tt <= 1e-4) tt = 1e-4;
    var ds = tt / steps;
    var E = La.expm(La.scale(A, ds));
    var Ms = [La.ident()];
    for (var s = 1; s <= steps; s++) Ms.push(La.mul(Ms[s - 1], E));   /* Ms[k] = exp(k·ds·A) */

    var color = new THREE.Color();
    var curP = [], curC = [];
    for (var q = 0; q < seeds.length; q++) {
      var seed = seeds[q];
      var P = new Float32Array(3 * (steps + 1)), C = new Float32Array(3 * (steps + 1));
      for (var kk = 0; kk <= steps; kk++) {
        var pt = La.matVec(Ms[kk], seed);
        P[3 * kk] = pt[0]; P[3 * kk + 1] = pt[1]; P[3 * kk + 2] = pt[2];
        var c = map(kk / steps); color.setRGB(c.r, c.g, c.b);
        C[3 * kk] = color.r; C[3 * kk + 1] = color.g; C[3 * kk + 2] = color.b;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
      this.groupFlow.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })));
      var last = La.matVec(Ms[steps], seed);
      curP.push(last[0], last[1], last[2]); curC.push(1, 1, 1);
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(curP), 3));
    pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(curC), 3));
    this.groupFlow.add(new THREE.Points(pg, new THREE.PointsMaterial({
      size: this.R * 0.06, sizeAttenuation: true, vertexColors: true, map: this.disc,
      transparent: true, alphaTest: 0.4, depthWrite: true
    })));
  };
  Viz.prototype.clearMatrix = function () { clearGroup(this.groupMatrix); clearGroup(this.groupFlow); };
  Viz.prototype.clearFlow = function () { clearGroup(this.groupFlow); };

  /* ---- Function graphs (Functions tab) ----------------------------------- */
  Viz.prototype.clearFunc = function () { clearGroup(this.groupFunc); };

  /* 1-D curve  y = f(x): points are pre-scaled [x, 0, value]. Additive (caller clears once). */
  Viz.prototype.renderFunctionCurve = function (c, opts) {
    opts = opts || {};
    var g = this.groupFunc;
    if (c.main && c.main.length) addPolyline(g, c.main, opts.color || 0x6ba6ff, 1.0);
    if (c.taylor) addPolyline(g, c.taylor, opts.taylorColor || 0xffb454, 0.95);
    if (c.marker) addMarker(g, c.marker, opts.markerColor || 0xffffff, this.R * 0.03);
  };

  /* 2-D surface  z = f(x,y). Additive. opts.solidColor → semi-transparent solid (extra functions).
     s.skipCells (per-cell flags) + s.soup (clipped boundary triangles) give smooth region edges. */
  Viz.prototype.renderFunctionSurface = function (s, opts) {
    opts = opts || {};
    var g = this.groupFunc, map = opts.map || VF.Colormaps.get('viridis');
    if (opts.solidColor != null) addSurfaceMesh(g, s.pos, null, s.res, null, 0, 0, true, opts.solidColor, s.skipCells);
    else addSurfaceMesh(g, s.pos, s.val, s.res, map, s.min, s.max, false, 0, s.skipCells);
    if (s.soup && s.soup.pos.length)
      addTriSoup(g, s.soup.pos, s.soup.val, map, s.min, s.max, opts.solidColor != null, opts.solidColor || 0);
    if (s.taylorPos) addSurfaceMesh(g, s.taylorPos, null, s.res, null, 0, 0, true, opts.taylorColor || 0xffb454, s.skipCells);
    if (s.taylorSoup && s.taylorSoup.pos.length)
      addTriSoup(g, s.taylorSoup.pos, s.taylorSoup.val, null, 0, 0, true, opts.taylorColor || 0xffb454);
    if (s.marker) addMarker(g, s.marker, opts.markerColor || 0xffffff, this.R * 0.03);
    if (s.grad) addArrowTo(g, s.grad.from, s.grad.to, opts.gradColor || 0xff5cc8, { headLen: this.R * 0.05 });
  };

  /* vector function F: field arrows + the Jacobian's local action (deformed cube) at P */
  Viz.prototype.renderFuncVector = function (v, opts) {
    clearGroup(this.groupFunc);
    opts = opts || {};
    var g = this.groupFunc;
    if (v.samples) buildArrows(g, v.samples, v.fieldOpts || {});
    if (v.jac && v.point) {
      var s = v.cubeSize || Math.max(0.8, this.R * 0.28);
      addCubeEdgesAt(g, s, null, v.point, 0x3a4661, 0.4);     /* reference cube at P */
      addCubeEdgesAt(g, s, v.jac, v.point, 0xffb454, 0.95);   /* J·(cube): local linear image */
    }
    if (v.point) addMarker(g, v.point, opts.markerColor || 0xffffff, this.R * 0.028);
  };

  /* parametric curve r(t), colored by tangential work F·T; moving point + velocity arrow */
  Viz.prototype.renderFuncCurve = function (c, opts) {
    clearGroup(this.groupFunc);
    opts = opts || {};
    var g = this.groupFunc;
    if (c.fieldSamples) buildArrows(g, c.fieldSamples, c.fieldOpts || {});
    if (c.pts && c.pts.length > 1) {
      if (c.colors) addColoredPath(g, c.pts, c.colors);
      else addPolyline(g, c.pts, opts.color || 0x6ba6ff, 1);
    }
    if (c.marker) addMarker(g, c.marker, opts.markerColor || 0xffe066, this.R * 0.035);
    if (c.velocity) addArrowTo(g, c.velocity.from, c.velocity.to, opts.velColor || 0x4cc9f0, { headLen: this.R * 0.05 });
  };

  /* ---- Manifolds ---------------------------------------------------------- */
  /* parametric surface: curvature-coloured mesh + tangent plane + normal */
  Viz.prototype.renderManifoldSurface = function (s, opts) {
    clearGroup(this.groupFunc);
    opts = opts || {};
    var g = this.groupFunc, R = this.R;
    if (opts.showSurface !== false) addSurfaceMesh(g, s.pos, s.K, s.res, opts.map || VF.Colormaps.get('coolwarm'), opts.cmin, opts.cmax, false, 0);
    var loc = s.local;
    if (loc && loc.phi) {
      if (opts.showTangent) addTangentPlane(g, loc.phi, loc.n, R * 0.7, opts.tangentColor || 0xffb454);
      if (opts.showNormal) addArrowTo(g, loc.phi, [loc.phi[0] + loc.n[0] * R * 0.5, loc.phi[1] + loc.n[1] * R * 0.5, loc.phi[2] + loc.n[2] * R * 0.5], 0x4cc9f0, { headLen: R * 0.06 });
      addMarker(g, loc.phi, 0xffe066, R * 0.03);
    }
  };

  /* implicit surface (marching-tetrahedra soup) + ∇g normals + critical points */
  Viz.prototype.renderImplicitSurface = function (m, opts) {
    clearGroup(this.groupFunc);
    opts = opts || {};
    var g = this.groupFunc, R = this.R, pos = m.pos, nor = m.nor, n = pos.length, i;
    if (n >= 3 && opts.showSurface !== false) {
      var P = new Float32Array(n * 3), N = new Float32Array(n * 3);
      for (i = 0; i < n; i++) { P[3 * i] = pos[i][0]; P[3 * i + 1] = pos[i][1]; P[3 * i + 2] = pos[i][2]; N[3 * i] = nor[i][0]; N[3 * i + 1] = nor[i][1]; N[3 * i + 2] = nor[i][2]; }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: opts.color || 0x5b8cff, side: THREE.DoubleSide })));
    }
    if (opts.showNormals) {
      var step = Math.max(3, Math.floor(n / 240)) * 3;   /* sparse: one per ~80 triangles */
      for (i = 0; i < n; i += step) addArrowTo(g, pos[i], [pos[i][0] + nor[i][0] * R * 0.16, pos[i][1] + nor[i][1] * R * 0.16, pos[i][2] + nor[i][2] * R * 0.16], 0x4cc9f0, { headLen: R * 0.03, opacity: 0.9 });
    }
    if (opts.critical) for (i = 0; i < opts.critical.length; i++) addMarker(g, opts.critical[i], 0xff5cc8, R * 0.045);
    /* tangent plane at the footpoint Q on g = c (T_Q M = ker dg = ∇g⊥) */
    var tp = opts.tangent;
    if (tp && tp.p) {
      if (opts.showTangent) addTangentPlane(g, tp.p, tp.n, R * 0.7, 0xffb454);
      if (opts.showNormal) addArrowTo(g, tp.p, [tp.p[0] + tp.n[0] * R * 0.5, tp.p[1] + tp.n[1] * R * 0.5, tp.p[2] + tp.n[2] * R * 0.5], 0x4cc9f0, { headLen: R * 0.06 });
      addMarker(g, tp.p, 0x63e6a0, R * 0.032);
    }
  };

  /* constraint surface {g = c} in the 3-D functions view: marching-tets soup
     with ∇g normals, coloured by the values of f (volume colormap & range) */
  Viz.prototype.renderConstraintSurface = function (m, opts) {
    opts = opts || {};                                 /* additive by design (drawn in a loop), no clearGroup here */
    var g = this.groupFunc, pos = m.pos, nor = m.nor, val = m.val, n = pos.length;
    if (n < 3) return;
    var map = opts.map || VF.Colormaps.get('viridis'), span = (m.max > m.min) ? (m.max - m.min) : 1, color = new THREE.Color();
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      P[3 * i] = pos[i][0]; P[3 * i + 1] = pos[i][1]; P[3 * i + 2] = pos[i][2];
      N[3 * i] = nor[i][0]; N[3 * i + 1] = nor[i][1]; N[3 * i + 2] = nor[i][2];
      var tt = (val[i] - m.min) / span; tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
      var c = map(tt); color.setRGB(c.r, c.g, c.b);
      C[3 * i] = color.r; C[3 * i + 1] = color.g; C[3 * i + 2] = color.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  };

  /* curve + Frenet frame T (red), N (green), B (blue) */
  Viz.prototype.renderManifoldCurve = function (c, opts) {
    clearGroup(this.groupFunc);
    opts = opts || {};
    var g = this.groupFunc, R = this.R, s = R * 0.35;
    if (c.pts && c.pts.length > 1) addPolyline(g, c.pts, opts.color || 0x9aa7bd, 1);
    var fr = c.frame;
    if (fr && fr.p) {
      addArrowTo(g, fr.p, [fr.p[0] + fr.T[0] * s, fr.p[1] + fr.T[1] * s, fr.p[2] + fr.T[2] * s], 0xff6b6b, { headLen: R * 0.05 });
      addArrowTo(g, fr.p, [fr.p[0] + fr.N[0] * s, fr.p[1] + fr.N[1] * s, fr.p[2] + fr.N[2] * s], 0x63e6a0, { headLen: R * 0.05 });
      addArrowTo(g, fr.p, [fr.p[0] + fr.B[0] * s, fr.p[1] + fr.B[1] * s, fr.p[2] + fr.B[2] * s], 0x6ba6ff, { headLen: R * 0.05 });
      addMarker(g, fr.p, 0xffe066, R * 0.03);
    }
  };
  /* ---- Minkowski (spacetime) diagram: flat 2-D, drawn in the z = 0 plane ---
     Input is a plain geometry model from VF.Mink.buildModel (arrays of [x, ct]).
     x → world-x (horizontal), ct → world-y (vertical). Layered in z to avoid
     coplanar z-fighting; brighter/semantic layers sit on top. */
  Viz.prototype.renderMinkowski = function (m) {
    var g = this.group2D, H = this.half2D, self = this;
    clearGroup(g);
    var lightTheme = this.theme === 'light';
    var C = lightTheme
      ? { axis: 0x334155, grid: 0xdbe1ea, hyper: 0x9aa7bd, simul: 0xb98fd6, tick: 0x64748b, text: 0x1b2330 }
      : { axis: 0xc3ccdd, grid: 0x1e2740, hyper: 0x59667f, simul: 0x8f74b3, tick: 0x8b96ab, text: 0xdfe5f0 };
    var LIGHT = 0xf5a524, PRIMED = 0x4cc9f0, CONE_F = 0x4cc9f0, CONE_P = 0xff6b6b;
    var Z = { cone: -0.03, grid: -0.02, hyper: -0.012, simul: -0.009, axis: 0, light: 0.006, primed: 0.010, world: 0.016, path: 0.018, event: 0.024 };
    var lblScale = H * 0.09, tickLen = H * 0.022, headLen = H * 0.05;

    function seg(s, hex, op, z) { if (s) addPolyline(g, [[s[0][0], s[0][1], z], [s[1][0], s[1][1], z]], hex, op == null ? 1 : op); }
    function poly(pts, hex, op, z) { var a = []; for (var i = 0; i < pts.length; i++) a.push([pts[i][0], pts[i][1], z]); addPolyline(g, a, hex, op == null ? 1 : op); }
    function endAlong(s, dir) { return (s[0][0] * dir[0] + s[0][1] * dir[1]) >= (s[1][0] * dir[0] + s[1][1] * dir[1]) ? s[0] : s[1]; }
    function axisArrow(s, dir, hex) {                         /* full line + a head at the +end */
      if (!s) return;
      seg(s, hex, 1, Z.axis);
      var e = endAlong(s, dir), L = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]) || 1;
      addArrowTo(g, [e[0] - dir[0] / L * headLen, e[1] - dir[1] / L * headLen, Z.axis], [e[0], e[1], Z.axis], hex, { headLen: headLen });
    }
    function label(text, at, hex, dx, dy) { var sp = label2D(text, hex, lblScale); sp.position.set(at[0] + (dx || 0), at[1] + (dy || 0), 0.03); g.add(sp); }

    /* causal shading (behind everything) */
    if (m.cone) { addFilledTri(g, m.cone.future, CONE_F, lightTheme ? 0.09 : 0.11, Z.cone); addFilledTri(g, m.cone.past, CONE_P, lightTheme ? 0.08 : 0.10, Z.cone); }

    var i;
    for (i = 0; i < m.grid.length; i++) seg(m.grid[i], C.grid, 1, Z.grid);
    for (i = 0; i < m.hyper.length; i++) poly(m.hyper[i], C.hyper, 0.8, Z.hyper);
    for (i = 0; i < m.simul.length; i++) seg(m.simul[i], C.simul, 0.7, Z.simul);

    /* lab axes + integer ticks */
    axisArrow(m.lab.x, [1, 0], C.axis);
    axisArrow(m.lab.ct, [0, 1], C.axis);
    for (i = 0; i < m.lab.ticks.length; i++) {
      var tk = m.lab.ticks[i];
      if (tk.x === 0) addPolyline(g, [[-tickLen, tk.ct, Z.axis], [tickLen, tk.ct, Z.axis]], C.tick, 0.9);
      else addPolyline(g, [[tk.x, -tickLen, Z.axis], [tk.x, tickLen, Z.axis]], C.tick, 0.9);
    }
    label('x', endAlong(m.lab.x, [1, 0]), C.text, -H * 0.04, -H * 0.05);
    label('ct', endAlong(m.lab.ct, [0, 1]), C.text, H * 0.06, -H * 0.02);

    /* light lines (invariant 45°) */
    for (i = 0; i < m.light.length; i++) seg(m.light[i], LIGHT, 0.95, Z.light);

    /* primed (moving-frame) axes + unit ticks + labels */
    if (m.primed) {
      var dct = [m.sinh, m.gamma], dx = [m.gamma, m.sinh];   /* ct′ ∝ (sinhφ,coshφ)=(sinh,γ); x′ ∝ (coshφ,sinhφ)=(γ,sinh) */
      axisArrow(m.primed.ct, dct, PRIMED);
      axisArrow(m.primed.x, dx, PRIMED);
      for (i = 0; i < m.primedTicks.length; i++) { var p = m.primedTicks[i].p; addMarker(g, [p[0], p[1], Z.primed], PRIMED, H * 0.012); }
      label("ct'", endAlong(m.primed.ct, dct), PRIMED, H * 0.05, -H * 0.02);
      label("x'", endAlong(m.primed.x, dx), PRIMED, -H * 0.02, -H * 0.05);
    }

    /* worldlines */
    for (i = 0; i < m.worldlines.length; i++) {
      var w = m.worldlines[i], hex = w.color == null ? 0x63e6a0 : w.color;
      seg(w.seg, hex, 0.97, Z.world);
      if (w.label) { var we = endAlong(w.seg, w.dir); label(w.label, we, hex, H * 0.03, -H * 0.03); }
    }

    /* piecewise paths (e.g. the twin's route) */
    for (i = 0; i < m.paths.length; i++) {
      var pa = m.paths[i], phex = pa.color == null ? 0xffd166 : pa.color;
      poly(pa.pts, phex, 0.97, Z.path);
      for (var j = 0; j < pa.pts.length; j++) addMarker(g, [pa.pts[j][0], pa.pts[j][1], Z.path], phex, H * 0.014);
      if (pa.label && pa.pts.length) label(pa.label, pa.pts[Math.floor(pa.pts.length / 2)], phex, H * 0.04, 0);
    }

    /* events */
    for (i = 0; i < m.events.length; i++) {
      var e = m.events[i], ehex = e.color == null ? 0xff5cc8 : e.color;
      addMarker(g, [e.x, e.ct, Z.event], ehex, H * 0.02);
      if (e.label) label(e.label, [e.x, e.ct], ehex, H * 0.045, H * 0.04);
    }
  };

  /* filled triangle (light-cone shading) */
  function addFilledTri(group, tri, hex, op, z) {
    var P = new Float32Array([tri[0][0], tri[0][1], z, tri[1][0], tri[1][1], z, tri[2][0], tri[2][1], z]);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setIndex([0, 1, 2]);
    group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })));
  }

  /* a crisp text sprite sized to its content (wider than makeTextSprite's 1–2 chars) */
  function label2D(text, hex, worldScale) {
    var c = document.createElement('canvas'), ctx = c.getContext('2d'), font = 'bold 40px system-ui, Arial, sans-serif';
    ctx.font = font;
    var w = Math.ceil(ctx.measureText(text).width) + 16, hpx = 52;
    c.width = w; c.height = hpx;
    ctx = c.getContext('2d');
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + ('000000' + hex.toString(16)).slice(-6);
    ctx.fillText(text, w / 2, hpx / 2 + 1);
    var tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    var s = worldScale || 0.5;
    sp.scale.set(s * (w / hpx), s, 1);
    return sp;
  }

  /* ---- generic 2-D plotter (Quantum / Phase space / Fourier) ---------------
     Takes a model in DATA coordinates and maps it into the equal-scale square
     world (so text stays crisp). One renderer, three labs. Model fields:
       xr,yr        [min,max] data ranges                     (required)
       xlabel,ylabel                                           axis names
       curves  [{pts:[[x,y]…], color, op}]                     polylines (break on NaN)
       arrows  [{x0,y0,x1,y1,color,op}]                        direction-field arrows
       hlines  [{y,color,op,x0,x1,label,labelX}]               horizontal reference lines
       markers [{x,y,color,r,label}]                           dots (+ optional labels)
     Colours default to the theme. */
  Viz.prototype.render2D = function (model) {
    var g = this.group2D;
    clearGroup(g);
    var light = this.theme === 'light';
    var C = light
      ? { axis: 0x334155, grid: 0xdbe1ea, tick: 0x64748b, text: 0x1b2330, faint: 0x9aa7bd }
      : { axis: 0xc3ccdd, grid: 0x1e2740, tick: 0x8b96ab, text: 0xdfe5f0, faint: 0x59667f };
    var bx = this.box2D.r, by = this.box2D.t;                 /* world half-extents (square scale) */
    var Xl = -bx * 0.80, Xr = bx * 0.95, Yb = -by * 0.80, Yt = by * 0.86;   /* drawing rect (margins) */
    var xr = model.xr, yr = model.yr;
    var xmin = xr[0], xmax = xr[1], ymin = yr[0], ymax = yr[1];
    var sx = (Xr - Xl) / ((xmax - xmin) || 1), sy = (Yt - Yb) / ((ymax - ymin) || 1);
    function X(x) { return Xl + (x - xmin) * sx; }
    function Y(y) { return Yb + (y - ymin) * sy; }
    function MP(p) { return [X(p[0]), Y(p[1])]; }
    var lbl = by * 0.052, Zc = { grid: -0.02, axis: 0, curve: 0.01, over: 0.02 };

    /* raster layer (domain colouring): a canvas texture stretched over its data box */
    if (model.image) {
      var imt = new THREE.CanvasTexture(model.image.canvas);
      imt.needsUpdate = true;
      var iw = (model.image.x1 - model.image.x0) * sx, ih = (model.image.y1 - model.image.y0) * sy;
      var imesh = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshBasicMaterial({ map: imt }));
      imesh.position.set((X(model.image.x0) + X(model.image.x1)) / 2, (Y(model.image.y0) + Y(model.image.y1)) / 2, -0.05);
      g.add(imesh);
    }
    /* dot clouds (Poincaré sections): one Points object per set, cheap at 1000s */
    if (model.dots) for (i = 0; i < model.dots.length; i++) {
      var dset = model.dots[i], dpts = dset.pts, DP = new Float32Array(dpts.length * 3), dq;
      for (dq = 0; dq < dpts.length; dq++) { DP[3 * dq] = X(dpts[dq][0]); DP[3 * dq + 1] = Y(dpts[dq][1]); DP[3 * dq + 2] = Zc.curve; }
      var dgeo = new THREE.BufferGeometry();
      dgeo.setAttribute('position', new THREE.BufferAttribute(DP, 3));
      g.add(new THREE.Points(dgeo, new THREE.PointsMaterial({
        color: dset.color == null ? 0xffd166 : dset.color, size: dset.size || 3.5, sizeAttenuation: false,
        map: this.disc, transparent: true, alphaTest: 0.4, depthWrite: false
      })));
    }

    function poly(pts, hex, op, z) {
      var a = [], i;
      for (i = 0; i < pts.length; i++) { var p = pts[i]; a.push((p && isFinite(p[0]) && isFinite(p[1])) ? [X(p[0]), Y(p[1]), z] : [NaN, NaN, NaN]); }
      addPolyline(g, a, hex, op == null ? 1 : op);
    }
    function seg(x0, y0, x1, y1, hex, op, z) { addPolyline(g, [[X(x0), Y(y0), z], [X(x1), Y(y1), z]], hex, op == null ? 1 : op); }
    function lab(text, wx, wy, hex, sc) { var sp = label2D(text, hex, sc || lbl); sp.position.set(wx, wy, Zc.over); g.add(sp); }

    /* axes: place at data 0 if visible, else at the drawing border */
    var i;
    var yAxisX = (xmin < 0 && xmax > 0) ? 0 : xmin;
    var xAxisY = (ymin < 0 && ymax > 0) ? 0 : ymin;
    var xticks = ticksIn(xmin, xmax, 8), yticks = ticksIn(ymin, ymax, 7);
    for (i = 0; i < xticks.length; i++) { var xt = xticks[i]; addPolyline(g, [[X(xt), Yb - by * 0.012, Zc.axis], [X(xt), Yb + by * 0.012, Zc.axis]], C.tick, 0.9); if (Math.abs(xt) > 1e-9) lab(fmtNum(xt), X(xt), Yb - by * 0.06, C.tick, lbl * 0.82); }
    for (i = 0; i < yticks.length; i++) { var yt = yticks[i]; addPolyline(g, [[Xl - bx * 0.012, Y(yt), Zc.axis], [Xl + bx * 0.012, Y(yt), Zc.axis]], C.tick, 0.9); lab(fmtNum(yt), Xl - bx * 0.09, Y(yt), C.tick, lbl * 0.82); }
    seg(xmin, xAxisY, xmax, xAxisY, C.axis, 1, Zc.axis);        /* x-axis */
    addPolyline(g, [[X(yAxisX), Yb, Zc.axis], [X(yAxisX), Yt, Zc.axis]], C.axis, 1);   /* y-axis */
    if (model.xlabel) lab(model.xlabel, Xr + bx * 0.02, Yb - by * 0.02, C.text, lbl * 1.05);
    if (model.ylabel) lab(model.ylabel, X(yAxisX) + bx * 0.03, Yt + by * 0.05, C.text, lbl * 1.05);

    /* horizontal reference lines (energy levels, ⟨E⟩ …); labelX staggers labels
       so near-degenerate levels (double-well doublets) stay readable */
    if (model.hlines) for (i = 0; i < model.hlines.length; i++) { var hl = model.hlines[i]; seg(hl.x0 == null ? xmin : hl.x0, hl.y, hl.x1 == null ? xmax : hl.x1, hl.y, hl.color == null ? C.faint : hl.color, hl.op == null ? 0.7 : hl.op, Zc.grid); if (hl.label != null) lab(hl.label, hl.labelX != null ? X(hl.labelX) : Xl + bx * 0.02, Y(hl.y) + by * 0.03, hl.color == null ? C.faint : hl.color, lbl * 0.85); }

    /* direction-field arrows (phase space): short segment + small head */
    if (model.arrows) for (i = 0; i < model.arrows.length; i++) {
      var ar = model.arrows[i], p0 = MP([ar.x0, ar.y0]), p1 = MP([ar.x1, ar.y1]);
      var hl = Math.min(bx, by) * 0.018;
      addArrowTo(g, [p0[0], p0[1], Zc.grid], [p1[0], p1[1], Zc.grid], ar.color == null ? C.faint : ar.color, { headLen: hl, opacity: ar.op == null ? 0.7 : ar.op });
    }

    /* curves */
    if (model.curves) for (i = 0; i < model.curves.length; i++) { var cv = model.curves[i]; if (cv.pts && cv.pts.length) poly(cv.pts, cv.color == null ? C.axis : cv.color, cv.op, Zc.curve); }

    /* markers (with optional labels) */
    if (model.markers) for (i = 0; i < model.markers.length; i++) { var mk2 = model.markers[i]; addMarker(g, [X(mk2.x), Y(mk2.y), Zc.over], mk2.color == null ? 0xff5cc8 : mk2.color, (mk2.r == null ? 0.02 : mk2.r) * by); if (mk2.label) lab(mk2.label, X(mk2.x) + bx * 0.03, Y(mk2.y) + by * 0.04, mk2.color == null ? C.text : mk2.color, lbl * 0.9); }
  };

  function niceStep(range, target) {
    var raw = range / (target || 8), mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }
  function ticksIn(min, max, target) {
    var s = niceStep(max - min, target), t0 = Math.ceil(min / s - 1e-9) * s, out = [], v;
    for (v = t0; v <= max + 1e-9 && out.length < 40; v += s) out.push(Math.abs(v) < 1e-9 * (Math.abs(max) + 1) ? 0 : v);
    return out;
  }
  function fmtNum(v) {
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e4 || a < 1e-3) return v.toExponential(0);
    var r = Math.round(v * 100) / 100;
    return '' + r;
  }

  function addTangentPlane(group, center, normal, s, hex) {
    var nn = new THREE.Vector3(normal[0], normal[1], normal[2]);
    if (nn.lengthSq() < 1e-12) return;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(s, s),
      new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn.normalize());
    m.position.set(center[0], center[1], center[2]);
    group.add(m);
  }

  /* ---- function-graph drawing helpers ------------------------------------ */
  function addCubeEdgesAt(group, half, A, origin, hex, opacity) {
    var corners = [];
    for (var b = 0; b < 8; b++) {
      var p = [(b & 1 ? 1 : -1) * half, (b & 2 ? 1 : -1) * half, (b & 4 ? 1 : -1) * half];
      if (A) p = VF.LinAlg.matVec(A, p);
      corners.push([p[0] + origin[0], p[1] + origin[1], p[2] + origin[2]]);
    }
    var verts = [];
    for (var i = 0; i < 8; i++)
      for (var bit = 0; bit < 3; bit++) {
        var j = i ^ (1 << bit);
        if (i < j) verts.push(corners[i][0], corners[i][1], corners[i][2], corners[j][0], corners[j][1], corners[j][2]);
      }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: opacity })));
  }

  function addColoredPath(group, pts, colors) {
    var m = pts.length, P = new Float32Array(3 * m), C = new Float32Array(3 * m);
    for (var i = 0; i < m; i++) {
      P[3 * i] = pts[i][0]; P[3 * i + 1] = pts[i][1]; P[3 * i + 2] = pts[i][2];
      C[3 * i] = colors[i][0]; C[3 * i + 1] = colors[i][1]; C[3 * i + 2] = colors[i][2];
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true })));
  }

  /* ---- more function-graph drawing helpers ------------------------------- */
  function addPolyline(group, pts, hex, opacity) {
    var seg = [], color = new THREE.Color(hex);
    function flush() {
      if (seg.length < 2) { seg = []; return; }
      var P = new Float32Array(seg.length * 3);
      for (var i = 0; i < seg.length; i++) { P[3 * i] = seg[i][0]; P[3 * i + 1] = seg[i][1]; P[3 * i + 2] = seg[i][2]; }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color, transparent: opacity < 1, opacity: opacity })));
      seg = [];
    }
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) seg.push(p); else flush();
    }
    flush();
  }

  function addMarker(group, pos, hex, r) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: hex }));
    m.position.set(pos[0], pos[1], pos[2]);
    group.add(m);
  }

  function addSurfaceMesh(group, pos, val, res, map, vmin, vmax, solid, hex, skip) {
    var n = pos.length, P = new Float32Array(n * 3), valid = new Array(n);
    var col = solid ? null : new Float32Array(n * 3), color = new THREE.Color();
    var span = (vmax > vmin) ? (vmax - vmin) : 1;
    for (var i = 0; i < n; i++) {
      var p = pos[i], ok = p && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2]);
      valid[i] = ok;
      P[3 * i] = ok ? p[0] : 0; P[3 * i + 1] = ok ? p[1] : 0; P[3 * i + 2] = ok ? p[2] : 0;
      if (col) {
        var tt = ok ? (val[i] - vmin) / span : 0; tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
        var c = map(tt); color.setRGB(c.r, c.g, c.b);
        col[3 * i] = color.r; col[3 * i + 1] = color.g; col[3 * i + 2] = color.b;
      }
    }
    var idx = [];
    for (var b = 0; b < res - 1; b++)
      for (var a = 0; a < res - 1; a++) {
        if (skip && skip[b * (res - 1) + a]) continue;   /* cell owned by the clipped soup */
        var i00 = b * res + a, i01 = b * res + a + 1, i10 = (b + 1) * res + a, i11 = (b + 1) * res + a + 1;
        if (valid[i00] && valid[i01] && valid[i11]) idx.push(i00, i01, i11);
        if (valid[i00] && valid[i11] && valid[i10]) idx.push(i00, i11, i10);
      }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    var mat = solid
      ? new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(geo, mat));
  }

  /* non-indexed triangle soup for region-clipped boundary cells; matches the
     grid mesh's colouring (vertex colormap or the extras' solid material) */
  function addTriSoup(group, pos, val, map, vmin, vmax, solid, hex) {
    var n = pos.length; if (!n) return;
    var P = new Float32Array(n * 3), col = solid ? null : new Float32Array(n * 3), color = new THREE.Color();
    var span = (vmax > vmin) ? (vmax - vmin) : 1;
    for (var i = 0; i < n; i++) {
      P[3 * i] = pos[i][0]; P[3 * i + 1] = pos[i][1]; P[3 * i + 2] = pos[i][2];
      if (col) {
        var tt = (val[i] - vmin) / span; tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
        var c = map(tt); color.setRGB(c.r, c.g, c.b);
        col[3 * i] = color.r; col[3 * i + 1] = color.g; col[3 * i + 2] = color.b;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    var mat = solid
      ? new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(geo, mat));
  }

  /* ---- shared drawing helpers -------------------------------------------- */
  function buildArrows(group, samples, opts) {
    opts = opts || {};
    var n = samples.count || samples.pos.length;
    if (!n) return;
    var map = opts.map || VF.Colormaps.get('viridis');
    var min = opts.min, max = opts.max;
    if (min == null) min = samples.min; if (max == null) max = samples.max;
    var span = (max > min) ? (max - min) : 1;
    var spacing = opts.spacing || 1;
    var userScale = opts.scale == null ? 1 : opts.scale;
    var normalize = !!opts.normalize;
    var baseLen = spacing * 0.9 * userScale;
    var minLen = spacing * 0.06, maxLen = spacing * 1.7;

    var shaftPos = new Float32Array(6 * n), shaftCol = new Float32Array(6 * n);
    var coneGeo = new THREE.ConeGeometry(1, 1, 10);
    var cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshLambertMaterial({}), n);
    cones.frustumCulled = false;

    var dir = new THREE.Vector3(), quat = new THREE.Quaternion(), m4 = new THREE.Matrix4();
    var scl = new THREE.Vector3(), posv = new THREE.Vector3(), col = new THREE.Color();
    var count = 0;
    for (var i = 0; i < n; i++) {
      var p = samples.pos[i], v = samples.vec[i], mag = samples.mag[i];
      if (!(mag > 1e-12) || !isFinite(mag)) continue;
      dir.set(v[0] / mag, v[1] / mag, v[2] / mag);
      var len = normalize ? baseLen * 0.62 : baseLen * (mag / (max || 1));
      if (len < minLen) len = minLen; if (len > maxLen) len = maxLen;
      var tx = p[0] + dir.x * len, ty = p[1] + dir.y * len, tz = p[2] + dir.z * len;
      var tt = (mag - min) / span; tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
      var c = map(tt); col.setRGB(c.r, c.g, c.b);
      var o = 6 * count;
      shaftPos[o] = p[0]; shaftPos[o + 1] = p[1]; shaftPos[o + 2] = p[2];
      shaftPos[o + 3] = tx; shaftPos[o + 4] = ty; shaftPos[o + 5] = tz;
      shaftCol[o] = col.r; shaftCol[o + 1] = col.g; shaftCol[o + 2] = col.b;
      shaftCol[o + 3] = col.r; shaftCol[o + 4] = col.g; shaftCol[o + 5] = col.b;
      var headLen = len * 0.32;
      var hlMin = spacing * 0.05, hlMax = spacing * 0.42;
      if (headLen < hlMin) headLen = hlMin; if (headLen > hlMax) headLen = hlMax;
      quat.setFromUnitVectors(YUP, dir);
      posv.set(tx - dir.x * headLen * 0.5, ty - dir.y * headLen * 0.5, tz - dir.z * headLen * 0.5);
      scl.set(headLen * 0.42, headLen, headLen * 0.42);
      m4.compose(posv, quat, scl);
      cones.setMatrixAt(count, m4);
      cones.setColorAt(count, col);
      count++;
    }
    var sp = count === n ? shaftPos : shaftPos.subarray(0, 6 * count);
    var sc = count === n ? shaftCol : shaftCol.subarray(0, 6 * count);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    var lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
    lines.frustumCulled = false;
    group.add(lines);
    cones.count = count;
    cones.instanceMatrix.needsUpdate = true;
    if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
    group.add(cones);
  }

  function addArrowTo(group, from, to, hex, opts) {
    opts = opts || {};
    var dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-9) return;
    var dir = new THREE.Vector3(dx / len, dy / len, dz / len);
    var color = new THREE.Color(hex);
    var opacity = opts.opacity == null ? 1 : opts.opacity;
    var transp = opacity < 1;
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
      [from[0], from[1], from[2], to[0], to[1], to[2]]), 3));
    group.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: color, transparent: transp, opacity: opacity })));
    var headLen = opts.headLen || Math.min(len * 0.22, 0.6);
    var headRad = opts.headRad || headLen * 0.46;
    var cone = new THREE.Mesh(new THREE.ConeGeometry(headRad, headLen, 12),
      new THREE.MeshLambertMaterial({ color: color, transparent: transp, opacity: opacity }));
    cone.quaternion.setFromUnitVectors(YUP, dir);
    cone.position.set(to[0] - dir.x * headLen * 0.5, to[1] - dir.y * headLen * 0.5, to[2] - dir.z * headLen * 0.5);
    group.add(cone);
  }

  function addCubeEdges(group, half, A, hex, opacity) {
    var corners = [];
    for (var b = 0; b < 8; b++) {
      var p = [(b & 1 ? 1 : -1) * half, (b & 2 ? 1 : -1) * half, (b & 4 ? 1 : -1) * half];
      if (A) p = VF.LinAlg.matVec(A, p);
      corners.push(p);
    }
    var verts = [];
    for (var i = 0; i < 8; i++) {
      for (var bit = 0; bit < 3; bit++) {
        var j = i ^ (1 << bit);
        if (i < j) {
          verts.push(corners[i][0], corners[i][1], corners[i][2], corners[j][0], corners[j][1], corners[j][2]);
        }
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: opacity })));
  }

  function defaultSeeds(s) {
    var seeds = [], vals = [-s, 0, s];
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 3; j++)
        for (var k = 0; k < 3; k++) {
          if (i === 1 && j === 1 && k === 1) continue;   /* skip the origin (fixed point) */
          seeds.push([vals[i], vals[j], vals[k]]);
        }
    return seeds;
  }

  VF.Viz = Viz;
  VF.vizHelpers = { addArrowTo: addArrowTo };

})(window.VF = window.VF || {});
