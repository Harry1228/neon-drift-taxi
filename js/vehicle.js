// 3D CRAZY TAXI CONTROLLER & ARCADE PHYSICS
class VehicleController {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    // Physics
    this.position = new THREE.Vector3(0, 0.4, 60);
    this.speed = 0;
    this.angle = 0;
    this.steerAngle = 0;

    this.maxSpeed = 2.4;
    this.accel = 0.045;
    this.friction = 0.955;
    this.turnSpeed = 0.038;
    this.radius = 3.2;

    this.wheels = [];
    this.frontWheels = [];

    this.buildTaxiMesh();
    this.scene.add(this.mesh);
  }

  buildTaxiMesh() {
    // 1. Yellow Car Chassis
    const bodyGeo = new THREE.BoxGeometry(3.4, 1.4, 6.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Cabin / Glass Windshield
    const cabGeo = new THREE.BoxGeometry(2.8, 1.1, 3.2);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1, metalness: 0.8 });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 2.1, -0.2);
    cab.castShadow = true;
    this.mesh.add(cab);

    // 3. Glowing White TAXI Roof Sign
    const signGeo = new THREE.BoxGeometry(1.4, 0.5, 0.6);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe600, emissiveIntensity: 0.6 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.8, -0.2);
    this.mesh.add(sign);

    // 4. Rotating 3D Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.55, 14);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const wheelPositions = [
      { x: -1.75, y: 0.7, z: 2.0, front: true },
      { x: 1.75, y: 0.7, z: 2.0, front: true },
      { x: -1.75, y: 0.7, z: -2.0, front: false },
      { x: 1.75, y: 0.7, z: -2.0, front: false }
    ];

    wheelPositions.forEach((pos) => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(pos.x, pos.y, pos.z);

      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wheelHub.add(wheel);

      this.mesh.add(wheelHub);
      this.wheels.push(wheel);
      if (pos.front) this.frontWheels.push(wheelHub);
    });
  }

  update(keys, colliders) {
    // Steering
    if (Math.abs(this.speed) > 0.08) {
      const dir = this.speed >= 0 ? 1 : -1;
      if (keys.left) this.angle += this.turnSpeed * dir;
      if (keys.right) this.angle -= this.turnSpeed * dir;
    }

    // Front Wheel Turn Angle
    const targetSteer = keys.left ? 0.38 : (keys.right ? -0.38 : 0);
    this.steerAngle += (targetSteer - this.steerAngle) * 0.2;
    this.frontWheels.forEach(w => w.rotation.y = this.steerAngle);

    // Throttle & Brake
    if (keys.gas) {
      this.speed = Math.min(this.speed + this.accel, this.maxSpeed);
    } else if (keys.brake) {
      this.speed = Math.max(this.speed - this.accel * 1.3, -this.maxSpeed * 0.45);
    } else {
      this.speed *= this.friction;
    }

    // Motion Vector
    this.position.x += Math.sin(this.angle) * this.speed;
    this.position.z += Math.cos(this.angle) * this.speed;

    // Solid Building Collisions
    this.resolveCollisions(colliders);

    // Rotate Wheels with road movement
    this.wheels.forEach(w => w.rotation.x += this.speed * 0.5);

    // Body Tilt during sharp turns
    this.mesh.rotation.z = -this.steerAngle * (this.speed / this.maxSpeed) * 0.25;

    // Sync 3D Mesh
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
        if (dist === 0) { dist = 1; }
        const overlap = this.radius - dist;
        this.position.x += (dx / dist) * overlap;
        this.position.z += (dz / dist) * overlap;

        // Rebound Bounce
        this.speed = -this.speed * 0.35;
      }
    }
  }
}
