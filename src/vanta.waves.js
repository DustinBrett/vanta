import VantaBase, { VANTA } from './_base.js'
import {rn,ri,sample} from './helpers.js'

let THREE = (typeof globalThis === 'object' && globalThis.THREE)

let hueHexMap = [];

const defaultOptions = {
  color: 0x005588,
  shininess: 30,
  waveHeight: 15,
  waveSpeed: 1,
  zoom: 1
}

class Waves extends VantaBase {
  static initClass() {
    this.prototype.ww = 100;
    this.prototype.hh = 80;
    this.prototype.waveNoise = 4; // Choppiness of water
  }
  constructor(userOptions) {
    THREE = userOptions.THREE || THREE
    super(userOptions)
  }

  getMaterial() {
    const options = {
      color: this.options.color,
      shininess: this.options.shininess,
      flatShading: true,
      side: THREE.DoubleSide,
      ...(this.options.material && this.options.material.options || {})
    };
    return new THREE.MeshPhongMaterial(options);
  }

  onInit() {
    let i, j;
    const CELLSIZE = 18;
    const material = this.getMaterial();
    const geometry = new THREE.BufferGeometry();

    // Add vertices
    this.gg = [];
    const points = [];
    for (i=0; i<=(this.options.ww || this.ww); i++){
      this.gg[i] = [];
      for (j=0; j<=(this.options.hh || this.hh); j++){
        const id = points.length;
        const newVertex = new THREE.Vector3(
          (i - ((this.options.ww || this.ww) * 0.5)) * CELLSIZE,
          rn(0, this.waveNoise) - 10,
          (((this.options.hh || this.hh) * 0.5) - j) * CELLSIZE
        );
        points.push(newVertex);
        this.gg[i][j] = id;
      }
    }
    geometry.setFromPoints(points);

    // Add faces
    // a b
    // c d <-- Looking from the bottom right point
    const indices = [];
    for (i=1; i<=(this.options.ww || this.ww); i++){
      for (j=1; j<=(this.options.hh || this.hh); j++){
        const d = this.gg[i][j]
        const b = this.gg[i][j-1]
        const c = this.gg[i-1][j]
        const a = this.gg[i-1][j-1]
        if (ri(0,1)) {
          indices.push(a, b, c, b, c, d)
        } else {
          indices.push(a, b, d, a, c, d)
        }
      }
    }
    geometry.setIndex(indices);

    this.plane = new THREE.Mesh(geometry, material);
    this.scene.add(this.plane);

    // LIGHTS
    const ambience = new THREE.AmbientLight( 0xffffff, 0.9 );
    this.scene.add(ambience);

    const pointLight = new THREE.PointLight( 0xffffff, 0.9 );
    pointLight.position.set(-100,250,-100);
    this.scene.add(pointLight);

    // CAMERA
    this.camera = new THREE.PerspectiveCamera(
      this.options.camera && this.options.camera.fov || 35,
      this.width / this.height,
      this.options.camera && this.options.camera.near || 50,
      this.options.camera && this.options.camera.far || 10000);

    const xOffset = -10;
    const zOffset = -10;
    this.cameraPosition = new THREE.Vector3( 250+xOffset, 200, 400+zOffset );
    this.cameraTarget = new THREE.Vector3( 150+xOffset, -30, 200+zOffset );
    this.camera.position.copy(this.cameraPosition);
    this.scene.add(this.camera);
  }

  // https://css-tricks.com/converting-color-spaces-in-javascript/#aa-hsl-to-hex
  HSLToHexNum(h,s,l) {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2,
        r = 0,
        g = 0, 
        b = 0; 

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h <= 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);

    if (r.length === 1)
      r = "0" + r;
    if (g.length === 1)
      g = "0" + g;
    if (b.length === 1)
      b = "0" + b;

    return Number("0x" + r + g + b);
  }

  onUpdate() {
    // Update options
    let diff;
    if (typeof this.options.hue !== "undefined") {
      if (this.options.hue >= 360) {
        this.countDown = true;
      } else if (this.options.hue <= 0) {
        this.countDown = false;
      }

      const updateColor = this.updateTick === this.options.colorCycleSpeed;

      this.updateTick = updateColor || typeof this.updateTick === "undefined" ? 0 : this.updateTick + 1;

      if (updateColor) {
        const hue = this.countDown ? --this.options.hue : ++this.options.hue;

        if (typeof hueHexMap[hue] === "undefined") {
          hueHexMap[hue] = this.HSLToHexNum(hue, this.options.saturation, this.options.lightness);
        }
  
        this.plane.material.color.set(hueHexMap[hue]);
      }
    }
    this.plane.material.shininess = this.options.shininess;
    this.camera.ox = this.cameraPosition.x / this.options.zoom;
    this.camera.oy = this.cameraPosition.y / this.options.zoom;
    this.camera.oz = this.cameraPosition.z / this.options.zoom;

    if (this.controls != null) {
      this.controls.update();
    }

    const c = this.camera;
    if (Math.abs(c.tx - c.position.x) > 0.01) {
      diff = c.tx - c.position.x;
      c.position.x += diff * 0.02;
    }
    if (Math.abs(c.ty - c.position.y) > 0.01) {
      diff = c.ty - c.position.y;
      c.position.y += diff * 0.02;
    }
    if (Math.abs(c.tz - c.position.z) > 0.01) {
      diff = c.tz - c.position.z;
      c.position.z += diff * 0.02;
    }

    c.lookAt( this.cameraTarget );

    // WAVES
    this.oy = this.oy || {};
    for (let i = 0; i < this.plane.geometry.attributes.position.array.length; i += 3) {
      if (!this.oy[i]) { // INIT
        this.oy[i] = this.plane.geometry.attributes.position.array[i + 1];
      } else {
        const vX = this.plane.geometry.attributes.position.array[i];
        const vZ = this.plane.geometry.attributes.position.array[i + 2];
        const s = this.options.waveSpeed;
        const crossChop = Math.sqrt(s) * Math.cos(-vX - (vZ*0.7));
        const delta = Math.sin((((s*this.t*0.02) - (s*vX*0.025)) + (s*vZ*0.015) + crossChop));
        const trochoidDelta = Math.pow(delta + 1, 2) / 4;

        this.plane.geometry.attributes.position.array[i + 1] = this.oy[i] + (trochoidDelta * this.options.waveHeight);
      }
    }

    this.plane.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.plane.geometry.computeVertexNormals();
    this.plane.geometry.attributes.position.needsUpdate = true;

    if (this.wireframe) {
      this.wireframe.geometry.fromGeometry(this.plane.geometry);
      this.wireframe.geometry.computeFaceNormals();
    }
  }

  onMouseMove(x,y) {
    const c = this.camera;
    if (!c.oy) {
      c.oy = c.position.y;
      c.ox = c.position.x;
      c.oz = c.position.z;
    }
    c.tx = c.ox + (((x-0.5) * 100) / this.options.zoom);
    c.ty = c.oy + (((y-0.5) * -100) / this.options.zoom);
    return c.tz = c.oz + (((x-0.5) * -50) / this.options.zoom);
  }
}

Waves.prototype.defaultOptions = defaultOptions
Waves.initClass()
export default VANTA.register('WAVES', Waves)