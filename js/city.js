// EXPANSIVE 3-DISTRICT CITY MAP WITH STUNT RAMPS & BEACH
class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.sidewalkSpots = [];
    this.ramps = []; // 3D Jump Ramps for air physics
    this.trafficWaypoints = [];
    this.buildWorld();
  }

  buildWorld() {
    // 1. Massive World Base (2400 x 2400)
    const groundGeo = new THREE.PlaneGeometry(2400, 2400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x272b34, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Sunny Beach & Animated Ocean (East side: X > 550)
    this.buildBeachAndOcean();

    // 3. City Blocks Grid (6x6 Mega Layout)
    const blockSize = 140;
    const roadWidth = 65;
    const cellSize = blockSize + roadWidth; // 205
    const halfGrid = 3;

    for (let x = -halfGrid; x < halfGrid; x++) {
      for (let z = -halfGrid; z < halfGrid; z++) {
        // Leave the eastern edge for the beach promenade
        if (x === halfGrid - 1) continue;

        const cx = x * cellSize + cellSize / 2;
        const cz = z * cellSize + cellSize / 2;
        this.buildBlock(cx, cz, blockSize, x, z);
      }
    }

    // 4. Stunt Jump Ramps
    this.addStuntRamp(-100, 5, 102, 0);     // Downtown Jump
    this.addStuntRamp(105, 5, -100, Math.PI / 2); // Central Avenue Jump
    this.addStuntRamp(-305, 5, -100, 0);   // West Expressway Jump
    this.addStuntRamp(310, 5, 102, -Math.PI / 2); // Beach Approach Jump

    // 5. Road Markings & Traffic Lanes
    this.buildRoadsAndAvenues(cellSize, halfGrid);
  }

  buildBeachAndOcean() {
    // Golden Sand Shoreline
    const sandGeo = new THREE.PlaneGeometry(300, 2400);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf4d06f, roughness: 0.95 });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(520, 0.1, 0);
    sand.receiveShadow = true;
    this.scene.add(sand);

    // Blue Coastal Ocean
    const oceanGeo = new THREE.PlaneGeometry(1200, 2400);
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.15, metalness: 0.35 });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(1270, 0.05, 0);
    this.scene.add(this.oceanMesh);

    // Ocean Collision Barrier
    this.colliders.push({ minX: 680, maxX: 2000, minZ: -1200, maxZ: 1200 });

    // Beach Umbrellas
    for (let bz = -600; bz <= 600; bz += 120) {
      this.addUmbrella(480 + (Math.random() - 0.5) * 40, bz);
    }
  }

  addUmbrella(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.2, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    pole.position.y = 3.5;
    group.add(pole);

    const top = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 2, 8),
      new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xff0055 : 0x00d2ff, roughness: 0.6 })
    );
    top.position.y = 7;
    group.add(top);
    this.scene.add(group);
  }

  buildBlock(cx, cz, size, gx, gz) {
    // Sidewalk Slab
    const sidewalkH = 0.9;
    const sidewalkGeo = new THREE.BoxGeometry(size, sidewalkH, size);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xdfd9cd, roughness: 0.9 });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(cx, sidewalkH / 2, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Terracotta Curb Edge
    const curbGeo = new THREE.BoxGeometry(size + 1.2, 0.4, size + 1.2);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xc46951, roughness: 0.85 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(cx, 0.2, cz);
    this.scene.add(curb);

    const offset = size / 2 - 9;
    this.sidewalkSpots.push(
      new THREE.Vector3(cx - offset, sidewalkH, cz - offset),
      new THREE.Vector3(cx + offset, sidewalkH, cz - offset),
      new THREE.Vector3(cx - offset, sidewalkH, cz + offset),
      new THREE.Vector3(cx + offset, sidewalkH, cz + offset)
    );

    // Palm trees
    this.addPalmTree(cx - offset + 6, cz - offset + 6);
    this.addPalmTree(cx + offset - 6, cz + offset - 6);

    // Distinct District Architecture
    const bSize = size - 30;

    // A. Central Park (at gx=0, gz=0)
    if (gx === 0 && gz === 0) {
      const grass = new THREE.Mesh(new THREE.BoxGeometry(bSize, 0.5, bSize), new THREE.MeshStandardMaterial({ color: 0x4f772d }));
      grass.position.set(cx, sidewalkH + 0.25, cz);
      this.scene.add(grass);

      // Central Fountain Pond
      const pond = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 0.6, 20), new THREE.MeshStandardMaterial({ color: 0x00b4d8 }));
      pond.position.set(cx, sidewalkH + 0.35, cz);
      this.scene.add(pond);

      // Extra trees
      this.addPalmTree(cx - 25, cz - 25);
      this.addPalmTree(cx + 25, cz - 25);
      this.addPalmTree(cx - 25, cz + 25);
      this.addPalmTree(cx + 25, cz + 25);
      return; // No solid building here!
    }

    // B. Skyscraper Buildings
    const bHeight = 45 + Math.random() * 95;
    const colors = [0xc83a3a, 0x1d3557, 0x2b2d42, 0x8a4b38, 0x3d5a80, 0xd4a373, 0x1b4332];
    const bColor = colors[Math.floor(Math.random() * colors.length)];

    const bGeo = new THREE.BoxGeometry(bSize, bHeight, bSize);
    const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.5, metalness: 0.2 });
    const building = new THREE.Mesh(bGeo, bMat);
    building.position.set(cx, bHeight / 2 + sidewalkH, cz);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    this.addWindows(cx, cz, bSize, bHeight, sidewalkH);

    // Rooftop Antenna / Helipad
    if (Math.random() > 0.5) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.8, 18), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
      pad.position.set(cx, bHeight + sidewalkH + 0.4, cz);
      this.scene.add(pad);
    }

    this.colliders.push({
      minX: cx - bSize / 2, maxX: cx + bSize / 2,
      minZ: cz - bSize / 2, maxZ: cz + bSize / 2
    });
  }

  addStuntRamp(x, y, z, rotationY) {
    const rampGroup = new THREE.Group();
    rampGroup.position.set(x, y, z);
    rampGroup.rotation.y = rotationY;

    // Wedge Shape
    const rampGeo = new THREE.BoxGeometry(16, 5.5, 24);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.35, metalness: 0.2 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.rotation.x = -0.24; // Incline angle
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    rampGroup.add(ramp);

    // Hazard Stripes
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    stripe.rotation.x = -Math.PI / 2 - 0.24;
    stripe.position.set(0, 1.2, 0);
    rampGroup.add(stripe);

    this.scene.add(rampGroup);

    this.ramps.push({
      x, z, radius: 14,
      rotationY, boostVelY: 1.15, boostSpeed: 0.75
    });
  }

  addWindows(cx, cz, w, h, baseH) {
    const winMat = new THREE.MeshBasicMaterial({ color: 0xdaf0ff });
    const floors = Math.floor(h / 14);
    for (let f = 1; f < floors; f++) {
      const y = baseH + f * 14;
      for (let x = -w / 2 + 14; x <= w / 2 - 14; x += 18) {
        const winF = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), winMat);
        winF.position.set(cx + x, y, cz + w / 2 + 0.1);
        this.scene.add(winF);

        const winB = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), winMat);
        winB.position.set(cx + x, y, cz - w / 2 - 0.1);
        winB.rotation.y = Math.PI;
        this.scene.add(winB);
      }
    }
  }

  addPalmTree(x, z) {
    const palm = new THREE.Group();
    palm.position.set(x, 0.9, z);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x7a5033, roughness: 0.9 })
    );
    trunk.position.y = 7;
    trunk.castShadow = true;
    palm.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 4), frondMat);
      frond.position.set(0, 14, 0);
      frond.rotation.y = (i * Math.PI) / 3;
      frond.rotation.z = Math.PI / 3;
      frond.castShadow = true;
      palm.add(frond);
    }
    this.scene.add(palm);
  }

  buildRoadsAndAvenues(cellSize, halfGrid) {
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const span = 1800;

    for (let i = -halfGrid; i <= halfGrid; i++) {
      const coord = i * cellSize;

      const lineH = new THREE.Mesh(new THREE.PlaneGeometry(span, 0.7), yellowMat);
      lineH.rotation.x = -Math.PI / 2;
      lineH.position.set(0, 0.06, coord);
      this.scene.add(lineH);

      const lineV = new THREE.Mesh(new THREE.PlaneGeometry(0.7, span), yellowMat);
      lineV.rotation.x = -Math.PI / 2;
      lineV.position.set(coord, 0.06, 0);
      this.scene.add(lineV);
    }
  }

  getRandomSidewalkSpot() {
    return this.sidewalkSpots[Math.floor(Math.random() * this.sidewalkSpots.length)].clone();
  }
}
