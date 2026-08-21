/* =============================================================================
 * controls.js: lightweight damped orbit camera (no external dependency)
 * -----------------------------------------------------------------------------
 *   left-drag            orbit
 *   right-drag / shift   pan
 *   wheel                zoom
 * ========================================================================== */
(function (VF) {
  'use strict';

  VF.OrbitControls = function (camera, dom) {
    var self = this;
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 0);
    this.radius = 15;
    this.minR = 1.5;
    this.maxR = 500;
    this.theta = Math.PI * 0.25;    /* azimuth in the x–y plane */
    this.phi = Math.PI * 0.36;      /* polar angle from +Z (z is up) */
    this.damping = 0.18;
    this.rotateSpeed = 0.005;
    this.zoomSpeed = 0.0015;

    var dTheta = this.theta, dPhi = this.phi, dRadius = this.radius;
    var dTarget = this.target.clone();
    var mode = null, lastX = 0, lastY = 0, activeId = null;

    function onDown(e) {
      if (dom.setPointerCapture) { try { dom.setPointerCapture(e.pointerId); } catch (err) {} }
      activeId = e.pointerId;
      lastX = e.clientX; lastY = e.clientY;
      var pan = (e.button === 2) || (e.button === 1) || (e.button === 0 && (e.shiftKey || e.ctrlKey || e.metaKey));
      mode = pan ? 'pan' : 'rotate';
      e.preventDefault();
    }
    function onMove(e) {
      if (!mode || e.pointerId !== activeId) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (mode === 'rotate') {
        dTheta -= dx * self.rotateSpeed;
        dPhi -= dy * self.rotateSpeed;
        var eps = 0.02;
        dPhi = Math.max(eps, Math.min(Math.PI - eps, dPhi));
      } else {
        var el = dom.clientHeight || 600;
        var scaleF = 2 * self.radius * Math.tan((camera.fov * 0.5) * Math.PI / 180) / el;
        var right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        var up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        dTarget.addScaledVector(right, -dx * scaleF);
        dTarget.addScaledVector(up, dy * scaleF);
      }
      e.preventDefault();
    }
    function onUp(e) { if (e.pointerId === activeId) { mode = null; activeId = null; } }
    function onWheel(e) {
      dRadius *= Math.exp(e.deltaY * self.zoomSpeed);
      dRadius = Math.max(self.minR, Math.min(self.maxR, dRadius));
      e.preventDefault();
    }

    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    this.update = function () {
      var d = self.damping;
      self.theta += (dTheta - self.theta) * d;
      self.phi += (dPhi - self.phi) * d;
      self.radius += (dRadius - self.radius) * d;
      self.target.lerp(dTarget, d);
      var sinP = Math.sin(self.phi), cosP = Math.cos(self.phi);
      camera.position.set(
        self.target.x + self.radius * sinP * Math.cos(self.theta),   /* x = r sinφ cosθ */
        self.target.y + self.radius * sinP * Math.sin(self.theta),   /* y = r sinφ sinθ */
        self.target.z + self.radius * cosP                           /* z = r cosφ  (z is up) */
      );
      camera.up.set(0, 0, 1);
      camera.lookAt(self.target);
    };

    this.setView = function (o) {
      if (o.theta != null) { self.theta = dTheta = o.theta; }
      if (o.phi != null) { self.phi = dPhi = o.phi; }
      if (o.radius != null) { self.radius = dRadius = o.radius; }
      if (o.target) { self.target.copy(o.target); dTarget.copy(o.target); }
    };
    this.reset = function () {
      self.setView({ theta: Math.PI * 0.25, phi: Math.PI * 0.36, radius: 16, target: new THREE.Vector3(0, 0, 0) });
    };
  };

})(window.VF = window.VF || {});
