// MAIN GAME LOOP, 3D SCENE & RETRO AUDIO
class GameApp {
  constructor() {
    this.container = document.getElementById("canvas-container");

    // HUD Elements
    this.timerVal = document.getElementById("timer-val");
    this.fareVal = document.getElementById("fare-val");
    this.totalVal = document.getElementById("total-val");
    this.gearD = document.getElementById("gear-d");
    this.gearR = document.getElementById("gear-r");
    this.guideArrow = document.getElementById("guide-arrow");

    // Game Economy
    this.timeLeft = 50.0;
    this.wallet = 0;
    this.currentFare = 0;
    this.hasPassenger = false;

    // Inputs
    this.keys = { left: false, right: false, gas: false, brake: false };

    this.initAudio();
    this.initThree();
    this.setupInputs();
    this.spawnEntities();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Scene with Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1e29);
    this.scene.fog = new THREE.FogExp2(0x1a1e29, 0.007);

    // 2. Camera (Third-Person Chase)
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 3. Renderer with Soft Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting: Sunset Warm Sunlight + Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
    sun.position.set(120, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    this.scene.add(sun);

    // 5. City and Vehicle
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
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
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
      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    });
  }

  spawnEntities() {
    // 3D Passenger Group
    this.passengerGroup = new THREE.Group();
    
    // Glowing Beacon Ring
    const beaconGeo = new THREE.RingGeometry(3.5, 4.2, 32);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.rotation.x = -Math.PI / 2;
    this.beaconMesh.position.y = 0.05;
    this.passengerGroup.add(this.beaconMesh);

    // 3D Passenger Body
    const pGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x0066cc });
    const pBody = new THREE.Mesh(pGeo, pMat);
    pBody.position.y = 1.1;
    this.passengerGroup.add(pBody);

    // Spinning 3D Dollar Coin
    const coinGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.25, 16);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    this.coinMesh = new THREE.Mesh(coinGeo, coinMat);
    this.coinMesh.position.y = 3.6;
    this.coinMesh.rotation.x = Math.PI / 2;
    this.passengerGroup.add(this.coinMesh);

    this.scene.add(this.passengerGroup);

    // Destination Dropoff Beacon
    const dropGeo = new THREE.CylinderGeometry(5.0, 5.0, 0.3, 32);
    const dropMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.45 });
    this.dropMesh = new THREE.Mesh(dropGeo, dropMat);
    this.dropMesh.visible = false;
    this.scene.add(this.dropMesh);

    this.repositionPassenger();
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

  setupInputs() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "a" || e.key === "ArrowLeft") this.keys.left = true;
      if (e.key === "d" || e.key === "ArrowRight") this.keys.right = true;
      if (e.key === "w" || e.key === "ArrowUp") this.keys.gas = true;
      if (e.key === "s" || e.key === "ArrowDown") this.keys.brake = true;
      if (e.key === " " || e.key.toLowerCase() === "h") this.playHorn();
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "a" || e.key === "ArrowLeft") this.keys.left = false;
      if (e.key === "d" || e.key === "ArrowRight") this.keys.right = false;
      if (e.key === "w" || e.key === "ArrowUp") this.keys.gas = false;
      if (e.key === "s" || e.key === "ArrowDown") this.keys.brake = false;
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
    document.getElementById("btn-horn").addEventListener("touchstart", (e) => {
      e.preventDefault(); this.playHorn();
    });
  }

  animate() {
    // 1. Timer
    if (this.timeLeft > 0) {
      this.timeLeft -= 1 / 60;
      const sec = Math.floor(this.timeLeft);
      const ms = Math.floor((this.timeLeft % 1) * 100);
      this.timerVal.innerText = `${sec.toString().padStart(2, "0")}'${ms.toString().padStart(2, "0")}`;
    }

    // 2. Taxi Physics & Movement
    this.taxi.update(this.keys, this.city.colliders);

    // Gear Indicator
    if (this.taxi.speed < -0.05) {
      this.gearD.className = ""; this.gearR.className = "gear-active";
    } else {
      this.gearD.className = "gear-active"; this.gearR.className = "";
    }

    // 3. Smooth Third-Person Chase Camera
    const camOffset = new THREE.Vector3(
      -Math.sin(this.taxi.angle) * 18,
      9.5,
      -Math.cos(this.taxi.angle) * 18
    );
    const targetCamPos = this.taxi.position.clone().add(camOffset);
    this.camera.position.lerp(targetCamPos, 0.12);

    const lookTarget = this.taxi.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    this.camera.lookAt(lookTarget);

    // 4. Passenger Pickup / Dropoff Logic
    const isStopped = Math.abs(this.taxi.speed) < 0.15;
    this.coinMesh.rotation.y += 0.05;

    if (!this.hasPassenger && this.passengerGroup.visible) {
      const dist = this.taxi.position.distanceTo(this.passengerPos);
      if (dist < 6.5 && isStopped) {
        this.hasPassenger = true;
        this.passengerGroup.visible = false;
        this.repositionDropoff();
        this.timeLeft += 20.0;
        this.currentFare = 75.00;
        this.fareVal.innerText = "$" + this.currentFare.toFixed(2).padStart(6, "0");
        this.playChime(500, 800);
      }
    }

    if (this.hasPassenger && this.dropMesh.visible) {
      const dist = this.taxi.position.distanceTo(this.dropPos);
      if (dist < 6.8 && isStopped) {
        this.hasPassenger = false;
        this.dropMesh.visible = false;
        this.wallet += this.currentFare;
        this.totalVal.innerText = "$" + this.wallet.toFixed(2).padStart(6, "0");
        this.fareVal.innerText = "$000.00";
        this.playChime(650, 1100);

        setTimeout(() => this.repositionPassenger(), 1400);
      }
    }

    // 5. Compass Arrow Angle pointing to destination
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

window.onload = () => new GameApp();
