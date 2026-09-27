// 3D CONVERTIBLE TAXI WITH CONTINUOUS STEERING WHEEL SUPPORT
class VehicleController {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    // Position & Gravity Physics
    this.position = new THREE.Vector3(0, 0.4, 80);
    this.speed = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.gravity = 0.042;

    this.angle = 0;
    this.steerAngle = 0;

    this.baseMaxSpeed = 2.45;
    this.maxSpeed = 2.45;
    this.accel = 0.052;
    this.friction = 0.955;
    this.turnSpeed = 0.042;
    this.radius = 3.4;

    this.isNitro = false;
    this.airTime = 0;

    this.wheels = [];
    this.frontWheels = [];

    this.buildTaxiMesh();
    this.scene.add(this.mesh);
  }

  buildTaxiMesh() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.28, metalness: 0.35 });

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 6.8), bodyMat);
    lowerBody.position.y = 0.85;
    lowerBody.castShadow = true;
    this.mesh.add(lowerBody);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2.2), bodyMat);
    hood.position.set(0, 1.3, 1.8);
    hood.rotation.x = 0.08;
    this.mesh.add(hood);

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 1.8), bodyMat);
    trunk.position.set(0, 1.3, -2.0);
    this.mesh.add(trunk);

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.1 });
    const fgrill = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 0.4), chromeMat);
    fgrill.position.set(0, 0.7, 3.5);
    const rgrill = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 0.4), chromeMat);
    rgrill.position.set(0, 0.7, -3.5);
    this.mesh.add(fgrill, rgrill);

    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1.2, 1.2].forEach(hx => {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12), hlMat);
      hl.rotation.x = Math.PI / 2;
      hl.position.set(hx, 0.9, 3.65);
      this.mesh.add(hl);
    });

    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    [-1.2, 1.2].forEach(rx => {
      const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), tlMat);
      tl.rotation.x = Math.PI / 2;
      tl.position.set(rx, 0.9, -3.65);
      this.mesh.add(tl);
    });

    const seatMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.4 });
    const leftSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), seatMat);
    leftSeat.position.set(-0.75, 1.3, -0.4);
    const rightSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), seatMat);
    rightSeat.position.set(0.75, 1.3, -0.4);
    this.mesh.add(leftSeat, rightSeat);

    const driverGroup = new THREE.Group();
    driverGroup.position.set(-0.75, 1.8, -0.3);
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffd1a4 }));
    driverGroup.add(dHead);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x0066cc }));
    cap.position.y = 0.35;
    driverGroup.add(cap);
    this.mesh.add(driverGroup);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xcaebf2, transparent: true, opacity: 0.55 })
    );
    windshield.position.set(0, 1.85, 0.7);
    windshield.rotation.x = -0.32;
    this.mesh.add(windshield);

    const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe600, emissiveIntensity: 0.75 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.55), signMat);
    sign.position.set(0, 2.5, 0.3);
    this.mesh.add(sign);

    const tireGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.6, 16);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 0.9, roughness: 0.2 });

    const wheelSpots = [
      { x: -1.9, y: 0.75, z: 2.1, front: true },
      { x: 1.9, y: 0.75, z: 2.1, front: true },
      { x: -1.9, y: 0.75, z: -2.1, front: false },
      { x: 1.9, y: 0.75, z: -2.1, front: false }
    ];

    wheelSpots.forEach((spot) => {
      const hub = new THREE.Group();
      hub.position.set(spot.x, spot.y, spot.z);
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.62, 12), rimMat);
      wheel.add(rim);
      hub.add(wheel);
      this.mesh.add(hub);
      this.wheels.push(wheel);
      if (spot.front) this.frontWheels.push(hub);
    });
  }

  update(keys, colliders, ramps) {
    if (keys.nitro) {
      this.maxSpeed = this.baseMaxSpeed * 1.55;
      this.speed = Math.min(this.speed + this.accel * 1.8, this.maxSpeed);
      this.isNitro = true;
    } else {
      this.maxSpeed = this.baseMaxSpeed;
      this.isNitro = false;
    }

    // STEERING: Supports both Arrow Buttons and Analog Steering Wheel
    let steerInput = 0;
    if (keys.steerRatio !== 0) {
      // Continuous steering from Rotary Wheel (-1.0 to 1.0)
      steerInput = -keys.steerRatio;
    } else {
      // Standard Buttons
      if (keys.left) steerInput = 1.0;
      else if (keys.right) steerInput = -1.0;
    }

    if (Math.abs(this.speed) > 0.08) {
      const dir = this.speed >= 0 ? 1 : -1;
      this.angle += this.turnSpeed * steerInput * dir;
    }

    // Physical front wheel angle
    const targetSteer = steerInput * 0.42;
    this.steerAngle += (targetSteer - this.steerAngle) * 0.22;
    this.frontWheels.forEach(w => w.rotation.y = this.steerAngle);

    // Throttle / Brake
    if (keys.gas) {
      this.speed = Math.min(this.speed + this.accel, this.maxSpeed);
    } else if (keys.brake) {
      this.speed = Math.max(this.speed - this.accel * 1.4, -this.maxSpeed * 0.45);
    } else {
      this.speed *= this.friction;
    }

    this.position.x += Math.sin(this.angle) * this.speed;
    this.position.z += Math.cos(this.angle) * this.speed;

    // Ramp detection
    for (let r of ramps) {
      const dist = Math.hypot(this.position.x - r.x, this.position.z - r.z);
      if (dist < r.radius && this.isGrounded && this.speed > 0.8) {
        this.velocityY = r.boostVelY * (this.speed / this.baseMaxSpeed);
        this.speed += r.boostSpeed;
        this.isGrounded = false;
      }
    }

    // Vertical gravity
    if (!this.isGrounded || this.position.y > 0.4) {
      this.position.y += this.velocityY;
      this.velocityY -= this.gravity;
      this.airTime += 1 / 60;
      this.mesh.rotation.x = Math.max(-0.35, Math.min(0.2, -this.velocityY * 0.25));

      if (this.position.y <= 0.4) {
        this.position.y = 0.4;
        this.velocityY = 0;
        this.isGrounded = true;
        this.mesh.rotation.x = 0;
      }
    } else {
      this.airTime = 0;
    }

    this.resolveCollisions(colliders);

    this.wheels.forEach(w => w.rotation.x += this.speed * 0.55);
    this.mesh.rotation.z = -this.steerAngle * (this.speed / this.maxSpeed) * 0.25;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.angle;
  }

  resolveCollisions(colliders) {
    for (let c of colliders) {
      const closestX = Math.max(c.minX, Math.min(this.position.x, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(this.position.z, c.maxZ));

      const dx = this.position.x - closestX;
      const dz = this.position.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < this.radius * this.radius) {
        let dist = Math.sqrt(distSq);
        if (dist === 0) dist = 1;
        const overlap = this.radius - dist;
        this.position.x += (dx / dist) * overlap;
        this.position.z += (dz / dist) * overlap;
        this.speed = -this.speed * 0.35;
      }
    }
  }
}
