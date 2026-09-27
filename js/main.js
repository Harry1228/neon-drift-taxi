// MAIN GAME LOOP WITH ROTARY STEERING WHEEL & SETTINGS CONTROLLER
class GameApp {
  constructor() {
    this.container = document.getElementById("canvas-container");

    this.timerVal = document.getElementById("timer-val");
    this.fareVal = document.getElementById("fare-val");
    this.totalVal = document.getElementById("total-val");
    this.gearD = document.getElementById("gear-d");
    this.gearR = document.getElementById("gear-r");
    this.guideArrow = document.getElementById("guide-arrow");
    this.stuntBanner = document.getElementById("stunt-banner");

    this.timeLeft = 60.0;
    this.wallet = 0;
    this.currentFare = 0;
    this.hasPassenger = false;
    this.stuntCooldown = 0;

    // Keys & continuous steering ratio (-1.0 to 1.0)
    this.keys = { left: false, right: false, gas: false, brake: false, nitro: false, steerRatio: 0 };

    // Steering Wheel State
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x78c9ff, 0xffe5b4, 0.8);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
    sun.position.set(200, 320, 180);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const d = 260;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    this.city = new CityBuilder(this.scene);
    this.taxi = new VehicleController(this.scene);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initAudio() {
    this.audioCtx = null;
    const startAudio = () => {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    };
    window.addEventListener("click", startAudio, { once: true });
    window.addEventListener("touchstart", startAudio, { once: true });
    window.addEventListener("keydown", startAudio, { once: true });
  }

  playChime(f1, f2) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.setValueAtTime(f1, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, this.audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.3);
  }

  playHorn() {
    if (!this.audioCtx) return;
    [380, 480].forEach(freq => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.14, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    });
  }

  // --- ROTARY STEERING WHEEL LOGIC ---
  setupSteeringWheel() {
    const el = this.wheelWrapper;

    const handleWheelTouch = (touch) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = touch.clientX - cx;
      const dy = touch.clientY - cy;

      // Angle from vertical (0 is straight up)
      let rad = Math.atan2(dx, -dy);
      const maxRad = Math.PI * 0.72; // ~130 degrees max turn

      rad = Math.max(-maxRad, Math.min(maxRad, rad));
      this.wheelAngle = rad;
      this.keys.steerRatio = rad / maxRad; // -1.0 (full left) to +1.0 (full right)
      this.wheelElem.style.transform = `rotate(${rad * (180 / Math.PI)}deg)`;
    };

    el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.wheelTouchId === null) {
        const touch = e.changedTouches[0];
        this.wheelTouchId = touch.identifier;
        handleWheelTouch(touch);
      }
    }, { passive: false });

    el.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.wheelTouchId) {
          handleWheelTouch(touch);
          break;
        }
      }
    }, { passive: false });

    const releaseWheel = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.wheelTouchId) {
          this.wheelTouchId = null;
          break;
        }
      }
    };
    el.addEventListener("touchend", releaseWheel);
    el.addEventListener("touchcancel", releaseWheel);
  }

  applyControlMode(mode) {
    this.controlMode = mode;
    localStorage.setItem("taxi_control_mode", mode);

    document.getElementById("opt-buttons").classList.toggle("active", mode === "buttons");
    document.getElementById("opt-wheel").classList.toggle("active", mode === "wheel");

    if (mode === "wheel") {
      this.btnArrows.style.display = "none";
      this.wheelWrapper.style.display = "block";
    } else {
      this.btnArrows.style.display = "flex";
      this.wheelWrapper.style.display = "none";
      this.keys.steerRatio = 0;
    }
  }

  setupInputs() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "a" || e.key === "ArrowLeft") this.keys.left = true;
      if (e.key === "d" || e.key === "ArrowRight") this.keys.right = true;
      if (e.key === "w" || e.key === "ArrowUp") this.keys.gas = true;
      if (e.key === "s" || e.key === "ArrowDown") this.keys.brake = true;
      if (e.key === "Shift" || e.key.toLowerCase() === "n") this.keys.nitro = true;
      if (e.key === " " || e.key.toLowerCase() === "h") this.playHorn();
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "a" || e.key === "ArrowLeft") this.keys.left = false;
      if (e.key === "d" || e.key === "ArrowRight") this.keys.right = false;
      if (e.key === "w" || e.key === "ArrowUp") this.keys.gas = false;
      if (e.key === "s" || e.key === "ArrowDown") this.keys.brake = false;
      if (e.key === "Shift" || e.key.toLowerCase() === "n") this.keys.nitro = false;
    });

    const bind = (id, action) => {
      const el = document.getElementById(id);
      el.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys[action] = true; });
      el.addEventListener("touchend", (e) => { e.preventDefault(); this.keys[action] = false; });
    };
    bind("btn-left", "left");
    bind("btn-right", "right");
    bind("btn-gas", "gas");
    bind("btn-brake", "brake");
    bind("btn-nitro", "nitro");
    document.getElementById("btn-horn").addEventListener("touchstart", (e) => {
      e.preventDefault(); this.playHorn();
    });
  }

  spawnEntities() {
    this.passengerGroup = new THREE.Group();

    const beaconGeo = new THREE.RingGeometry(3.6, 4.4, 32);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.rotation.x = -Math.PI / 2;
    this.beaconMesh.position.y = 0.08;
    this.passengerGroup.add(this.beaconMesh);

    const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x0077ff }));
    pBody.position.y = 1.1;
    this.passengerGroup.add(pBody);

    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffd1a4 }));
    pHead.position.y = 2.4;
    this.passengerGroup.add(pHead);

    const coinGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.25, 18);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
    this.coinMesh = new THREE.Mesh(coinGeo, coinMat);
    this.coinMesh.position.y = 4.0;
    this.coinMesh.rotation.x = Math.PI / 2;
    this.passengerGroup.add(this.coinMesh);

    this.scene.add(this.passengerGroup);

    const dropGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.3, 32);
    const dropMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5 });
    this.dropMesh = new THREE.Mesh(dropGeo, dropMat);
    this.dropMesh.visible = false;
    this.scene.add(this.dropMesh);

    this.repositionPassenger();
  }

  spawnTraffic() {
    this.trafficCars = [];
    const colors = [0xffffff, 0x111111, 0x0066cc, 0xcc0000, 0x228b22, 0x9932cc];

    for (let i = 0; i < 8; i++) {
      const carGroup = new THREE.Group();
      const bodyColor = colors[i % colors.length];

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.2, 6.2),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3 })
      );
      body.position.y = 0.9;
      body.castShadow = true;
      carGroup.add(body);

      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.9, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 })
      );
      cab.position.set(0, 1.8, -0.2);
      carGroup.add(cab);

      const isVertical = i % 2 === 0;
      const x = isVertical ? (i - 4) * 205 + 102 : (Math.random() - 0.5) * 600;
      const z = isVertical ? (Math.random() - 0.5) * 600 : (i - 4) * 205 + 102;
      carGroup.position.set(x, 0.4, z);

      this.scene.add(carGroup);
      this.trafficCars.push({
        mesh: carGroup,
        isVertical: isVertical,
        speed: 0.6 + Math.random() * 0.4,
        dir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  showStunt(text, bonus) {
    if (this.stuntCooldown > 0) return;
    this.stuntBanner.innerText = `${text} +$${bonus}`;
    this.stuntBanner.classList.add("show");
    this.wallet += bonus;
    this.totalVal.innerText = "$" + this.wallet.toFixed(2).padStart(6, "0");
    this.playChime(600, 950);
    this.stuntCooldown = 60;

    setTimeout(() => {
      this.stuntBanner.classList.remove("show");
    }, 1200);
  }

  repositionPassenger() {
    const spot = this.city.getRandomSidewalkSpot();
    this.passengerPos = spot;
    this.passengerGroup.position.copy(spot);
    this.passengerGroup.visible = true;
  }

  repositionDropoff() {
    const spot = this.city.getRandomSidewalkSpot();
    this.dropPos = spot;
    this.dropMesh.position.copy(spot);
    this.dropMesh.position.y = 0.2;
    this.dropMesh.visible = true;
  }

  animate() {
    if (this.timeLeft > 0) {
      this.timeLeft -= 1 / 60;
      const sec = Math.floor(this.timeLeft);
      const ms = Math.floor((this.timeLeft % 1) * 100);
      this.timerVal.innerText = `${sec.toString().padStart(2, "0")}'${ms.toString().padStart(2, "0")}`;
    }

    if (this.stuntCooldown > 0) this.stuntCooldown--;

    // Wheel Spring-Back when finger is lifted
    if (this.controlMode === "wheel" && this.wheelTouchId === null && Math.abs(this.wheelAngle) > 0.001) {
      this.wheelAngle *= 0.82; // Smooth auto-center spring
      this.keys.steerRatio = this.wheelAngle / (Math.PI * 0.72);
      this.wheelElem.style.transform = `rotate(${this.wheelAngle * (180 / Math.PI)}deg)`;
    }

    // 1. Taxi Physics
    this.taxi.update(this.keys, this.city.colliders, this.city.ramps);

    // Stunt Jump Trigger
    if (this.taxi.airTime > 0.55 && this.taxi.isGrounded) {
      this.showStunt("CRAZY JUMP!", 35);
      this.taxi.airTime = 0;
    }

    // 2. Traffic Simulation
    for (let t of this.trafficCars) {
      if (t.isVertical) {
        t.mesh.position.z += t.speed * t.dir;
        t.mesh.rotation.y = t.dir === 1 ? 0 : Math.PI;
        if (t.mesh.position.z > 600) t.mesh.position.z = -600;
        if (t.mesh.position.z < -600) t.mesh.position.z = 600;
      } else {
        t.mesh.position.x += t.speed * t.dir;
        t.mesh.rotation.y = t.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        if (t.mesh.position.x > 600) t.mesh.position.x = -600;
        if (t.mesh.position.x < -600) t.mesh.position.x = 600;
      }

      const dist = this.taxi.position.distanceTo(t.mesh.position);
      if (dist < 4.2) {
        this.taxi.speed = -this.taxi.speed * 0.4;
        this.showStunt("CRASH! -$10", -10);
      } else if (dist < 7.2 && this.taxi.speed > 1.8) {
        this.showStunt("NEAR MISS!", 20);
      }
    }

    // Gear Indicator
    if (this.taxi.speed < -0.05) {
      this.gearD.className = ""; this.gearR.className = "gear-active";
    } else {
      this.gearD.className = "gear-active"; this.gearR.className = "";
    }

    // Dynamic Camera (Nitro FOV)
    const targetFOV = this.taxi.isNitro ? 66 : 56;
    this.camera.fov += (targetFOV - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();

    const speedRatio = Math.abs(this.taxi.speed) / this.taxi.maxSpeed;
    const camDist = 17 + speedRatio * 3.5;
    const camHeight = 8.5 + speedRatio * 1.5;

    const camOffset = new THREE.Vector3(
      -Math.sin(this.taxi.angle) * camDist,
      camHeight,
      -Math.cos(this.taxi.angle) * camDist
    );
    const targetCamPos = this.taxi.position.clone().add(camOffset);
    this.camera.position.lerp(targetCamPos, 0.12);

    const lookTarget = this.taxi.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    this.camera.lookAt(lookTarget);

    // Passenger Pickup / Dropoff
    const isStopped = Math.abs(this.taxi.speed) < 0.15;
    this.coinMesh.rotation.y += 0.05;

    if (!this.hasPassenger && this.passengerGroup.visible) {
      const dist = this.taxi.position.distanceTo(this.passengerPos);
      if (dist < 6.8 && isStopped) {
        this.hasPassenger = true;
        this.passengerGroup.visible = false;
        this.repositionDropoff();
        this.timeLeft += 25.0;
        this.currentFare = 90.00;
        this.fareVal.innerText = "$" + this.currentFare.toFixed(2).padStart(6, "0");
        this.playChime(520, 840);
      }
    }

    if (this.hasPassenger && this.dropMesh.visible) {
      const dist = this.taxi.position.distanceTo(this.dropPos);
      if (dist < 7.2 && isStopped) {
        this.hasPassenger = false;
        this.dropMesh.visible = false;
        this.wallet += this.currentFare;
        this.totalVal.innerText = "$" + this.wallet.toFixed(2).padStart(6, "0");
        this.fareVal.innerText = "$000.00";
        this.playChime(660, 1150);

        setTimeout(() => this.repositionPassenger(), 1400);
      }
    }

    // Compass Arrow
    const targetPos = this.hasPassenger ? this.dropPos : this.passengerPos;
    if (targetPos) {
      const dx = targetPos.x - this.taxi.position.x;
      const dz = targetPos.z - this.taxi.position.z;
      const targetAngle = Math.atan2(dx, dz);
      const diff = targetAngle - this.taxi.angle;
      this.guideArrow.style.transform = `rotate(${diff}rad)`;
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}

// Global UI helper functions
let gameApp = null;
window.onload = () => { gameApp = new GameApp(); };

function openSettings() {
  document.getElementById("settings-modal").style.display = "flex";
}
function closeSettings() {
  document.getElementById("settings-modal").style.display = "none";
}
function setControlMode(mode) {
  if (gameApp) gameApp.applyControlMode(mode);
}
