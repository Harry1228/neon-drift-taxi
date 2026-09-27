// 3D VEHICLES & ARCADE PHYSICS
class VehicleController {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    this.position = new THREE.Vector3(0, 0.4, 80);
    this.speed = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.gravity = 0.042;
    this.angle = 0;
    this.steerAngle = 0;
    this.isNitro = false;
    this.airTime = 0;
    this.wheels = [];
    this.frontWheels = [];

    // Default to Taxi
    this.changeVehicle('taxi');
    this.scene.add(this.mesh);
  }

  changeVehicle(type) {
    // Clear old mesh
    while(this.mesh.children.length > 0){ 
      this.mesh.remove(this.mesh.children[0]); 
    }
    this.wheels = [];
    this.frontWheels = [];
    this.type = type;

    if (type === 'taxi') {
      this.baseMaxSpeed = 2.5; this.accel = 0.05; this.turnSpeed = 0.045; this.radius = 3.4;
      this.buildTaxi();
    } else if (type === 'bus') {
      this.baseMaxSpeed = 1.9; this.accel = 0.025; this.turnSpeed = 0.028; this.radius = 5.5;
      this.buildBus();
    } else if (type === 'truck') {
      this.baseMaxSpeed = 2.1; this.accel = 0.035; this.turnSpeed = 0.032; this.radius = 5.0;
      this.buildTruck();
    }
    this.maxSpeed = this.baseMaxSpeed;
  }

  buildTaxi() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 6.8), mat);
    body.position.y = 0.85;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2.2), mat);
    hood.position.set(0, 1.3, 1.8);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.15), new THREE.MeshStandardMaterial({color: 0xcaebf2, opacity:0.6, transparent:true}));
    cab.position.set(0, 1.8, 0.7); cab.rotation.x = -0.3;
    this.mesh.add(body, hood, cab);
    this.addWheels([ {x:-1.9, y:0.75, z:2.1, f:true}, {x:1.9, y:0.75, z:2.1, f:true}, {x:-1.9, y:0.75, z:-2.1, f:false}, {x:1.9, y:0.75, z:-2.1, f:false} ]);
  }

  buildBus() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 13), mat);
    body.position.y = 1.6;
    const windows = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.8, 12), new THREE.MeshStandardMaterial({color: 0x111111}));
    windows.position.y = 2.0;
    this.mesh.add(body, windows);
    this.addWheels([ {x:-2.2, y:0.75, z:4.5, f:true}, {x:2.2, y:0.75, z:4.5, f:true}, {x:-2.2, y:0.75, z:-4.5, f:false}, {x:2.2, y:0.75, z:-4.5, f:false} ]);
  }

  buildTruck() {
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xffb703 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.8, 3.5), cabMat);
    cab.position.set(0, 1.9, 3.5);
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0xd90429 });
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.2, 8.5), trailerMat);
    trailer.position.set(0, 2.1, -2.5);
    
    // Smokestacks
    const pipeMat = new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.8});
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), pipeMat); p1.position.set(-2, 3, 1.5);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), pipeMat); p2.position.set(2, 3, 1.5);

    this.mesh.add(cab, trailer, p1, p2);
    this.addWheels([ {x:-2.1, y:0.75, z:4.5, f:true}, {x:2.1, y:0.75, z:4.5, f:true}, {x:-2.1, y:0.75, z:-4.0, f:false}, {x:2.1, y:0.75, z:-4.0, f:false} ]);
  }

  addWheels(spots) {
    const tMat = new THREE.MeshStandardMaterial({ color: 0x181818 });
    spots.forEach(s => {
      const hub = new THREE.Group(); hub.position.set(s.x, s.y, s.z);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 12), tMat);
      w.rotation.z = Math.PI / 2;
      hub.add(w); this.mesh.add(hub);
      this.wheels.push(w); if(s.f) this.frontWheels.push(hub);
    });
  }

  update(keys, colliders, ramps, fx) {
    if (keys.nitro) {
      this.maxSpeed = this.baseMaxSpeed * 1.55;
      this.speed = Math.min(this.speed + this.accel * 1.8, this.maxSpeed);
      this.isNitro = true;
    } else {
      this.maxSpeed = this.baseMaxSpeed;
      this.isNitro = false;
    }

    let steerInput = (keys.steerRatio !== 0) ? -keys.steerRatio : (keys.left ? 1.0 : (keys.right ? -1.0 : 0));
    
    if (Math.abs(this.speed) > 0.08) {
      const dir = this.speed >= 0 ? 1 : -1;
      this.angle += this.turnSpeed * steerInput * dir;

      // DRIFT DETECTOR: High speed + sharp turn = Tire Smoke!
      if (Math.abs(this.speed) > this.baseMaxSpeed * 0.7 && Math.abs(steerInput) > 0.6 && this.isGrounded) {
        fx.spawnSmoke(this.position.x, 0.5, this.position.z);
      }
    }

    const targetSteer = steerInput * 0.42;
    this.steerAngle += (targetSteer - this.steerAngle) * 0.22;
    this.frontWheels.forEach(w => w.rotation.y = this.steerAngle);

    if (keys.gas) this.speed = Math.min(this.speed + this.accel, this.maxSpeed);
    else if (keys.brake) this.speed = Math.max(this.speed - this.accel * 1.4, -this.maxSpeed * 0.45);
    else this.speed *= this.friction;

    this.position.x += Math.sin(this.angle) * this.speed;
    this.position.z += Math.cos(this.angle) * this.speed;

    for (let r of ramps) {
      if (Math.hypot(this.position.x - r.x, this.position.z - r.z) < r.radius && this.isGrounded && this.speed > 0.8) {
        this.velocityY = r.boostVelY * (this.speed / this.baseMaxSpeed);
        this.speed += r.boostSpeed;
        this.isGrounded = false;
      }
    }

    if (!this.isGrounded || this.position.y > 0.4) {
      this.position.y += this.velocityY;
      this.velocityY -= this.gravity;
      this.airTime += 1 / 60;
      this.mesh.rotation.x = Math.max(-0.35, Math.min(0.2, -this.velocityY * 0.25));
      if (this.position.y <= 0.4) {
        this.position.y = 0.4; this.velocityY = 0; this.isGrounded = true; this.mesh.rotation.x = 0;
      }
    } else { this.airTime = 0; }

    for (let c of colliders) {
      const closestX = Math.max(c.minX, Math.min(this.position.x, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(this.position.z, c.maxZ));
      const dx = this.position.x - closestX;
      const dz = this.position.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < this.radius * this.radius) {
        let dist = Math.sqrt(distSq); if (dist === 0) dist = 1;
        const overlap = this.radius - dist;
        this.position.x += (dx / dist) * overlap;
        this.position.z += (dz / dist) * overlap;
        this.speed = -this.speed * 0.35;
        
        // Spawn Sparks on collision!
        if(Math.abs(this.speed) > 0.5) fx.spawnSparks(closestX, 1.0, closestZ);
      }
    }

    this.wheels.forEach(w => w.rotation.x += this.speed * 0.55);
    this.mesh.rotation.z = -this.steerAngle * (this.speed / this.maxSpeed) * 0.25;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.angle;
  }
}
