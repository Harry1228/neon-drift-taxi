// 3D CITY BUILDER & COLLIDERS
class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Solid 3D building collision boxes
    this.sidewalkSpots = [];
    this.buildWorld();
  }

  buildWorld() {
    // 1. Asphalt Road Ground
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x22252c,
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. City Grid Layout: 4x4 Blocks
    const blockSize = 140;
    const roadWidth = 60;
    const cellSize = blockSize + roadWidth;
    const halfGrid = 2;

    for (let x = -halfGrid; x < halfGrid; x++) {
      for (let z = -halfGrid; z < halfGrid; z++) {
        const cx = x * cellSize + cellSize / 2;
        const cz = z * cellSize + cellSize / 2;
        this.buildBlock(cx, cz, blockSize);
      }
    }
  }

  buildBlock(cx, cz, size) {
    // Sidewalk Slab with Curb
    const sidewalkH = 0.8;
    const sidewalkGeo = new THREE.BoxGeometry(size, sidewalkH, size);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd8d3c5, roughness: 0.9 });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(cx, sidewalkH / 2, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Save corner footpath spots for passenger spawns
    const offset = size / 2 - 8;
    this.sidewalkSpots.push(
      new THREE.Vector3(cx - offset, sidewalkH, cz - offset),
      new THREE.Vector3(cx + offset, sidewalkH, cz - offset),
      new THREE.Vector3(cx - offset, sidewalkH, cz + offset),
      new THREE.Vector3(cx + offset, sidewalkH, cz + offset)
    );

    // 3D Buildings
    const bSize = size - 26; // Recessed inside sidewalk
    const bHeight = 40 + Math.random() * 80; // Varied skyscraper heights
    const colors = [0xb22222, 0x1e3a8a, 0x334155, 0x475569, 0xc2410c, 0x0f766e];
    const bColor = colors[Math.floor(Math.random() * colors.length)];

    const bGeo = new THREE.BoxGeometry(bSize, bHeight, bSize);
    const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.5, metalness: 0.2 });
    const building = new THREE.Mesh(bGeo, bMat);
    building.position.set(cx, bHeight / 2 + sidewalkH, cz);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    // Rooftop Helipad or AC Chiller
    if (Math.random() > 0.5) {
      const padGeo = new THREE.CylinderGeometry(14, 14, 1, 16);
      const padMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(cx, bHeight + sidewalkH + 0.5, cz);
      this.scene.add(pad);
    }

    // Register Solid Collision Box (Car cannot drive into buildings!)
    this.colliders.push({
      minX: cx - bSize / 2,
      maxX: cx + bSize / 2,
      minZ: cz - bSize / 2,
      maxZ: cz + bSize / 2
    });
  }

  getRandomSidewalkSpot() {
    const spot = this.sidewalkSpots[Math.floor(Math.random() * this.sidewalkSpots.length)];
    return spot.clone();
  }
}
