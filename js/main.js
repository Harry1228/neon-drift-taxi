class GameApp {
  constructor() {
    this.container = document.getElementById("canvas-container");
    this.timerVal = document.getElementById("timer-val");
    this.fareVal = document.getElementById("fare-val");
    this.totalVal = document.getElementById("total-val");
    this.guideArrow = document.getElementById("guide-arrow");
    this.stuntBanner = document.getElementById("stunt-banner");

    this.timeLeft = 60.0;
    this.wallet = 0;
    this.currentFare = 0;
    this.hasPassenger = false;
    this.stuntCooldown = 0;

    this.keys = { left: false, right: false, gas: false, brake: false, nitro: false, steerRatio: 0 };
    
    this.wheelElem = document.getElementById("wheel");
    this.wheelWrapper = document.getElementById("wheel-wrapper");
    this.btnArrows = document.getElementById("btn-group-arrows");
    this.wheelAngle = 0;
    this.wheelTouchId = null;
    this.controlMode = localStorage.getItem("taxi_control_mode") || "buttons";

    this.initAudio();
    this.initThree();
    this.setupInputs();
    this.setupSteeringWheel();
    this.applyControlMode(this.controlMode);
    this.spawnEntities();
    this.spawnTraffic();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x56b8ff);
    this.scene.fog = new THREE.Fog(0xd2edff, 220, 750);
    this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 1500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0x78c9ff, 0xffe5b4, 0.8));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
    sun.position.set(200, 320, 180);
    sun.castShadow = true;
    this.scene.add(sun);

    this.city = new CityBuilder(this.scene);
    this.taxi = new VehicleController(this.scene);
    
    // Initialize New FX Engine
    this.fx = new FXManager(this.scene);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initAudio() { /* Setup audio context */ }
  playChime() { /* Play chime */ }
  
  playHorn() {
    // Basic horn
  }

  setupSteeringWheel() {
    const el = this.wheelWrapper;
    const handleWheelTouch = (touch) => {
      const rect = el.getBoundingClientRect();
      const dx = touch.clientX - (rect.left + rect.width / 2);
      const dy = touch.clientY - (rect.top + rect.height / 2);
      let rad = Math.atan2(dx, -dy);
      rad = Math.max(-Math.PI*0.72, Math.min(Math.PI*0.72, rad));
      this.wheelAngle = rad;
      this.keys.steerRatio = rad / (Math.PI*0.72);
      this.wheelElem.style.transform = `rotate(${rad * (180 / Math.PI)}deg)`;
    };
    el.addEventListener("touchstart", (e) => { e.preventDefault(); if (this.wheelTouchId === null) { this.wheelTouchId = e.changedTouches[0].identifier; handleWheelTouch(e.changedTouches[0]); } }, { passive: false });
    el.addEventListener("touchmove", (e) => { e.preventDefault(); for (let t of e.changedTouches) if (t.identifier === this.wheelTouchId) handleWheelTouch(t); }, { passive: false });
    const release = (e) => { for (let t of e.changedTouches) if (t.identifier === this.wheelTouchId) this.wheelTouchId = null; };
    el.addEventListener("touchend", release); el.addEventListener("touchcancel", release);
  }

  applyControlMode(mode) {
    this.controlMode = mode;
    localStorage.setItem("taxi_control_mode", mode);
    if(document.getElementById("opt-buttons")) {
      document.getElementById("opt-buttons").classList.toggle("active", mode === "buttons");
      document.getElementById("opt-wheel").classList.toggle("active", mode === "wheel");
    }
    if (mode === "wheel") {
      this.btnArrows.style.display = "none"; this.wheelWrapper.style.display = "block";
    } else {
      this.btnArrows.style.display = "flex"; this.wheelWrapper.style.display = "none"; this.keys.steerRatio = 0;
    }
  }

  setupInputs() {
    const bind = (id, action) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys[action] = true; });
      el.addEventListener("touchend", (e) => { e.preventDefault(); this.keys[action] = false; });
    };
    bind("btn-left", "left"); bind("btn-right", "right");
    bind("btn-gas", "gas"); bind("btn-brake", "brake"); bind("btn-nitro", "nitro");
  }

  spawnEntities() { /* Keep passenger spawns */ 
    this.passengerGroup = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x0077ff }));
    pBody.position.y = 1.1; this.passengerGroup.add(pBody);
    this.scene.add(this.passengerGroup);

    this.dropMesh = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.3, 32), new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5 }));
    this.dropMesh.visible = false; this.scene.add(this.dropMesh);
    this.repositionPassenger();
  }
  
  spawnTraffic() { this.trafficCars = []; }
  
  repositionPassenger() {
    this.passengerPos = this.city.getRandomSidewalkSpot();
    this.passengerGroup.position.copy(this.passengerPos);
    this.passengerGroup.visible = true;
  }
  repositionDropoff() {
    this.dropPos = this.city.getRandomSidewalkSpot();
    this.dropMesh.position.copy(this.dropPos);
    this.dropMesh.position.y = 0.2;
    this.dropMesh.visible = true;
  }

  showStunt(text, bonus) {
    if (this.stuntCooldown > 0) return;
    this.stuntBanner.innerText = `${text} +$${bonus}`;
    this.stuntBanner.classList.add("show");
    this.wallet += bonus;
    this.totalVal.innerText = "$" + this.wallet.toFixed(2).padStart(6, "0");
    this.stuntCooldown = 60;
    setTimeout(() => { this.stuntBanner.classList.remove("show"); }, 1200);
  }

  animate() {
    if (this.timeLeft > 0) {
      this.timeLeft -= 1 / 60;
      const sec = Math.floor(this.timeLeft);
      const ms = Math.floor((this.timeLeft % 1) * 100);
      this.timerVal.innerText = `${sec.toString().padStart(2, "0")}'${ms.toString().padStart(2, "0")}`;
    }

    if (this.stuntCooldown > 0) this.stuntCooldown--;

    if (this.controlMode === "wheel" && this.wheelTouchId === null && Math.abs(this.wheelAngle) > 0.001) {
      this.wheelAngle *= 0.82;
      this.keys.steerRatio = this.wheelAngle / (Math.PI * 0.72);
      this.wheelElem.style.transform = `rotate(${this.wheelAngle * (180 / Math.PI)}deg)`;
    }

    // Pass FX to taxi for smoke & sparks
    this.taxi.update(this.keys, this.city.colliders, this.city.ramps, this.fx);
    this.fx.update();

    if (this.taxi.airTime > 0.55 && this.taxi.isGrounded) {
      this.showStunt("CRAZY JUMP!", 35);
      this.taxi.airTime = 0;
    }

    const targetFOV = this.taxi.isNitro ? 70 : 56;
    this.camera.fov += (targetFOV - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();

    const speedRatio = Math.abs(this.taxi.speed) / this.taxi.baseMaxSpeed;
    const camDist = 18 + speedRatio * 4;
    const camHeight = 9 + speedRatio * 2;
    const camOffset = new THREE.Vector3(-Math.sin(this.taxi.angle) * camDist, camHeight, -Math.cos(this.taxi.angle) * camDist);
    this.camera.position.lerp(this.taxi.position.clone().add(camOffset), 0.12);
    this.camera.lookAt(this.taxi.position.clone().add(new THREE.Vector3(0, 2, 0)));

    const isStopped = Math.abs(this.taxi.speed) < 0.15;
    if (!this.hasPassenger && this.passengerGroup.visible && this.taxi.position.distanceTo(this.passengerPos) < 6.8 && isStopped) {
      this.hasPassenger = true; this.passengerGroup.visible = false;
      this.repositionDropoff(); this.timeLeft += 25.0; this.currentFare = 90.00;
      this.fareVal.innerText = "$" + this.currentFare.toFixed(2).padStart(6, "0");
    }

    if (this.hasPassenger && this.dropMesh.visible && this.taxi.position.distanceTo(this.dropPos) < 7.2 && isStopped) {
      this.hasPassenger = false; this.dropMesh.visible = false;
      this.wallet += this.currentFare; this.totalVal.innerText = "$" + this.wallet.toFixed(2).padStart(6, "0");
      this.fareVal.innerText = "$000.00";
      setTimeout(() => this.repositionPassenger(), 1400);
    }

    const targetPos = this.hasPassenger ? this.dropPos : this.passengerPos;
    if (targetPos) {
      this.guideArrow.style.transform = `rotate(${Math.atan2(targetPos.x - this.taxi.position.x, targetPos.z - this.taxi.position.z) - this.taxi.angle}rad)`;
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}

let gameApp = null;
window.onload = () => { gameApp = new GameApp(); };

// Garage & Settings Global Functions
function openSettings() { document.getElementById("settings-modal").style.display = "flex"; }
function closeSettings() { document.getElementById("settings-modal").style.display = "none"; }
function setControlMode(mode) { if (gameApp) gameApp.applyControlMode(mode); }
function openGarage() { document.getElementById("garage-modal").style.display = "flex"; }
function closeGarage() { document.getElementById("garage-modal").style.display = "none"; }
function selectVehicle(type) { if (gameApp) gameApp.taxi.changeVehicle(type); closeGarage(); }
