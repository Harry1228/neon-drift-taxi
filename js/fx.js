// 3D PARTICLE EFFECTS ENGINE (TIRE SMOKE & SPARKS)
class FXManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    
    // Smoke Material
    this.smokeGeo = new THREE.PlaneGeometry(1.8, 1.8);
    this.smokeMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false 
    });

    // Spark Material
    this.sparkGeo = new THREE.PlaneGeometry(0.3, 0.3);
  }

  spawnSmoke(x, y, z) {
    // Randomize slight offset so smoke looks thick
    const ox = x + (Math.random() - 0.5);
    const oz = z + (Math.random() - 0.5);
    
    const p = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    p.position.set(ox, y, oz);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = Math.random() * Math.PI;
    
    this.scene.add(p);
    this.particles.push({ mesh: p, life: 1.0, type: 'smoke' });
  }

  spawnSparks(x, y, z) {
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ 
        color: Math.random() > 0.5 ? 0xffcc00 : 0xff3300, 
        transparent: true 
      });
      const p = new THREE.Mesh(this.sparkGeo, mat);
      p.position.set(x, y + Math.random(), z);
      
      this.scene.add(p);
      this.particles.push({ 
        mesh: p, life: 1.0, type: 'spark',
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.8
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.life -= 0.03; // Fade out speed

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        if (p.type === 'smoke') {
          // Smoke expands and fades
          p.mesh.scale.setScalar(1 + (1 - p.life) * 2.5);
          p.mesh.material.opacity = p.life * 0.5;
          p.mesh.position.y += 0.05; // Rises up
          p.mesh.rotation.z += 0.02;
        } else if (p.type === 'spark') {
          // Sparks fall with gravity
          p.mesh.position.x += p.vx;
          p.mesh.position.y += p.vy;
          p.mesh.position.z += p.vz;
          p.vy -= 0.05; // Gravity
          p.mesh.material.opacity = p.life;
        }
      }
    }
  }
}
