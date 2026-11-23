/* ==========================================================================
   Expertise 3D models — one small model per skill tile.
   A single shared WebGL renderer draws every model and copies the result
   into a 2D canvas inside its tile, so the page uses one WebGL context and
   the canvases fade, clip and scroll with the tiles like normal elements.

   fullstack → browser window + database      game    → game controller
   mobile    → smartphone with app grid       blender → mesh in edit mode
   code      → </> code brackets              git     → Git branch graph
   growth    → rising bar chart
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const GOLD = 0xe8c38a;

function materials() {
    return {
        silver: new THREE.MeshPhysicalMaterial({ color: 0xc8c9cc, metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.35, roughness: 0.45 }),
        darker: new THREE.MeshStandardMaterial({ color: 0x0e0f11, metalness: 0.2, roughness: 0.4 }),
        gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.28 }),
        glow: new THREE.MeshBasicMaterial({ color: GOLD, toneMapped: false }),
        grey: new THREE.MeshBasicMaterial({ color: 0x5c5b58, toneMapped: false }),
        clay: new THREE.MeshStandardMaterial({ color: 0x8d8e92, metalness: 0.15, roughness: 0.55, flatShading: true }),
    };
}

const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };

// a cylinder stretched between two points (for graph edges)
function beam(a, b, r, m) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 12), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return o;
}

/* ---------- Models ---------- */
const BUILD = {
    fullstack(M) {
        const g = new THREE.Group();
        // database: three stacked discs with glowing seams
        const db = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            db.add(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 48), M.silver, 0, i * 0.36, 0));
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.522, 0.012, 8, 64), M.glow);
            ring.rotation.x = Math.PI / 2; ring.position.y = i * 0.36 + 0.18;
            if (i < 2) db.add(ring);
        }
        db.position.set(0.5, -0.55, -0.35);
        g.add(db);
        // browser window in front
        const win = new THREE.Group();
        win.add(mesh(rbox(1.5, 1.0, 0.06, 0.05), M.dark));
        win.add(mesh(rbox(1.5, 0.16, 0.07, 0.03), M.silver, 0, 0.42, 0.005));
        [-0.62, -0.53, -0.44].forEach((x) => win.add(mesh(new THREE.CircleGeometry(0.03, 16), M.darker, x, 0.42, 0.045)));
        const lines = [[-0.25, 0.18, 0.8, M.glow], [-0.35, 0.04, 0.6, M.grey], [-0.15, -0.1, 1.0, M.grey], [-0.3, -0.24, 0.7, M.grey]];
        lines.forEach(([x, y, w, m]) => win.add(mesh(new THREE.PlaneGeometry(w, 0.05), m, x, y, 0.035)));
        win.position.set(-0.3, 0.25, 0.4);
        win.rotation.y = 0.25;
        g.add(win);
        return g;
    },

    game(M) {
        const g = new THREE.Group();
        g.add(mesh(rbox(1.7, 0.86, 0.42, 0.2), M.dark));
        [-1, 1].forEach((s) => {
            const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 8, 20), M.dark);
            grip.position.set(s * 0.68, -0.42, -0.02); grip.rotation.z = s * 0.45;
            g.add(grip);
        });
        // d-pad
        g.add(mesh(rbox(0.36, 0.11, 0.08, 0.02), M.silver, -0.5, 0.1, 0.22));
        g.add(mesh(rbox(0.11, 0.36, 0.08, 0.02), M.silver, -0.5, 0.1, 0.22));
        // face buttons
        [[0.5, 0.25, M.gold], [0.64, 0.1, M.silver], [0.36, 0.1, M.silver], [0.5, -0.05, M.silver]].forEach(([x, y, m]) => {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 24), m);
            b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.22);
            g.add(b);
        });
        // thumbsticks
        [-0.24, 0.24].forEach((x) => {
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 32), M.darker);
            base.rotation.x = Math.PI / 2; base.position.set(x, -0.2, 0.21);
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.1, 32), M.silver);
            cap.rotation.x = Math.PI / 2; cap.position.set(x, -0.2, 0.28);
            g.add(base, cap);
        });
        // centre light
        g.add(mesh(new THREE.CircleGeometry(0.035, 16), M.glow, 0, 0.27, 0.215));
        g.rotation.x = -0.15;
        return g;
    },

    mobile(M) {
        const g = new THREE.Group();
        g.add(mesh(rbox(0.96, 1.92, 0.1, 0.14), M.silver));
        // screen texture: status bar, app grid, dock
        const c = document.createElement('canvas');
        c.width = 256; c.height = 512;
        const x = c.getContext('2d');
        x.fillStyle = '#0e0f11'; x.fillRect(0, 0, 256, 512);
        x.fillStyle = '#9a988f'; x.fillRect(22, 22, 40, 8); x.fillRect(200, 22, 34, 8);
        const rr = (px, py, s, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(px, py, s, s, 12); x.fill(); };
        const tones = ['#3a3b3f', '#4a4b50', '#2e2f33', '#56575c'];
        for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) rr(22 + k * 56, 70 + r * 66, 44, (r === 1 && k === 2) ? '#e8c38a' : tones[(r + k) % 4]);
        x.fillStyle = '#1c1d20'; x.beginPath(); x.roundRect(14, 430, 228, 62, 22); x.fill();
        for (let k = 0; k < 4; k++) rr(26 + k * 56, 440, 42, k === 0 ? '#e8c38a' : '#46474c');
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        g.add(mesh(new THREE.PlaneGeometry(0.86, 1.8), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 0, 0.052));
        g.add(mesh(rbox(0.24, 0.06, 0.02, 0.01), M.darker, 0, 0.82, 0.056)); // notch
        g.rotation.z = -0.08;
        return g;
    },

    blender(M) {
        const g = new THREE.Group();
        const geo = new THREE.IcosahedronGeometry(0.95, 1);
        g.add(new THREE.Mesh(geo, M.clay));
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 }));
        edges.scale.setScalar(1.002);
        g.add(edges);
        // vertices, like edit mode
        const pos = geo.getAttribute('position');
        const seen = new Set(), pts = [];
        for (let i = 0; i < pos.count; i++) {
            const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(3)).join(',');
            if (!seen.has(k)) { seen.add(k); pts.push(pos.getX(i) * 1.01, pos.getY(i) * 1.01, pos.getZ(i) * 1.01); }
        }
        const pg = new THREE.BufferGeometry();
        pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf6e3c2, size: 0.07, sizeAttenuation: true })));
        return g;
    },

    code(M) {
        const g = new THREE.Group();
        const bar = (len) => rbox(len, 0.16, 0.18, 0.05);
        // "<"
        const lt = new THREE.Group();
        const a1 = mesh(bar(0.62), M.silver); a1.rotation.z = 0.62; a1.position.set(0, 0.17, 0);
        const a2 = mesh(bar(0.62), M.silver); a2.rotation.z = -0.62; a2.position.set(0, -0.17, 0);
        lt.add(a1, a2); lt.position.x = -0.78;
        // ">"
        const gt = lt.clone(); gt.rotation.y = Math.PI; gt.position.x = 0.78;
        // "/"
        const sl = mesh(bar(1.15), M.gold); sl.rotation.z = 1.18;
        g.add(lt, gt, sl);
        return g;
    },

    git(M) {
        const g = new THREE.Group();
        const P = (x, y) => new THREE.Vector3(x, y, 0);
        const main = [P(-0.35, -0.85), P(-0.35, -0.28), P(-0.35, 0.28), P(-0.35, 0.85)];
        const branch = [P(0.42, -0.1), P(0.42, 0.45)];
        const edge = new THREE.MeshStandardMaterial({ color: 0x6d6e72, metalness: 0.7, roughness: 0.35 });
        for (let i = 0; i < main.length - 1; i++) g.add(beam(main[i], main[i + 1], 0.045, edge));
        g.add(beam(main[1], branch[0], 0.045, edge), beam(branch[0], branch[1], 0.045, edge), beam(branch[1], main[3], 0.045, edge));
        main.forEach((p) => g.add(mesh(new THREE.SphereGeometry(0.15, 32, 16), M.silver, p.x, p.y, p.z)));
        branch.forEach((p) => g.add(mesh(new THREE.SphereGeometry(0.15, 32, 16), M.gold, p.x, p.y, p.z)));
        return g;
    },

    growth(M) {
        const g = new THREE.Group();
        g.add(mesh(rbox(1.7, 0.08, 0.7, 0.03), M.dark, 0, -0.62, 0));
        [0.35, 0.62, 0.9, 1.25].forEach((h, i) => {
            g.add(mesh(rbox(0.28, h, 0.3, 0.05), i === 3 ? M.gold : M.silver, -0.6 + i * 0.4, -0.58 + h / 2, 0));
        });
        // trend arrow
        const pts = [P2(-0.75, -0.05), P2(-0.25, 0.2), P2(0.15, 0.1), P2(0.65, 0.75)];
        for (let i = 0; i < pts.length - 1; i++) g.add(beam(pts[i], pts[i + 1], 0.025, M.glow));
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 16), M.glow);
        tip.position.copy(pts[3]);
        tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(pts[3], pts[2]).normalize());
        g.add(tip);
        return g;
        function P2(x, y) { return new THREE.Vector3(x, y, 0.32); }
    },
};

/* ---------- Shared renderer ---------- */
export function initExpertiseModels({ canvases, reducedMotion }) {
    let gl;
    try {
        gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    } catch (e) {
        return null;
    }
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(gl), 0.03).texture;
    pmrem.dispose();
    const M = materials();

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const slots = [];
    let maxW = 1, maxH = 1;

    canvases.forEach((canvas, idx) => {
        const kind = canvas.dataset.model;
        if (!BUILD[kind]) return;
        const scene = new THREE.Scene();
        scene.environment = env;
        const key = new THREE.DirectionalLight(0xfff3e2, 1.5); key.position.set(3, 4, 5);
        const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(-3, 2, -4);
        scene.add(key, rim);

        // normalise every model to the same visual size
        const model = BUILD[kind](M);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const pivot = new THREE.Group();
        model.position.sub(centre);
        pivot.add(model);
        pivot.scale.setScalar(1.9 / Math.max(size.x, size.y, size.z));
        scene.add(pivot);

        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
        camera.position.set(0, 0.35, 5.2);
        camera.lookAt(0, 0, 0);

        const tile = canvas.closest('.tile');
        const slot = { canvas, ctx: canvas.getContext('2d'), scene, camera, pivot, tile, visible: false, w: 0, h: 0, hover: 0, hoverT: 0, px: 0, py: 0, phase: idx * 1.3, drawn: false };
        if (tile) {
            tile.addEventListener('pointerenter', () => { slot.hoverT = 1; });
            tile.addEventListener('pointerleave', () => { slot.hoverT = 0; slot.px = 0; slot.py = 0; });
            tile.addEventListener('pointermove', (e) => {
                const r = tile.getBoundingClientRect();
                slot.px = ((e.clientX - r.left) / r.width) * 2 - 1;
                slot.py = ((e.clientY - r.top) / r.height) * 2 - 1;
            });
        }
        slots.push(slot);
    });

    function measure() {
        maxW = 1; maxH = 1;
        slots.forEach((s) => {
            const w = Math.max(1, Math.round(s.canvas.clientWidth * DPR));
            const h = Math.max(1, Math.round(s.canvas.clientHeight * DPR));
            if (s.canvas.width !== w || s.canvas.height !== h) { s.canvas.width = w; s.canvas.height = h; s.drawn = false; }
            s.w = w; s.h = h;
            s.camera.aspect = w / h; s.camera.updateProjectionMatrix();
            maxW = Math.max(maxW, w); maxH = Math.max(maxH, h);
        });
        gl.setPixelRatio(1);
        gl.setSize(maxW, maxH, false);
    }

    function draw(s) {
        gl.setViewport(0, 0, s.w, s.h);
        gl.setScissor(0, 0, s.w, s.h);
        gl.setScissorTest(true);
        gl.clear();
        gl.render(s.scene, s.camera);
        s.ctx.clearRect(0, 0, s.w, s.h);
        // WebGL's origin is bottom-left: the rendered area is the bottom-left corner of the buffer
        s.ctx.drawImage(gl.domElement, 0, maxH - s.h, s.w, s.h, 0, 0, s.w, s.h);
        s.drawn = true;
    }

    let raf = 0, running = false, last = 0, t = 0;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now; t += dt;
        let any = false;
        for (const s of slots) {
            if (!s.visible) continue;
            any = true;
            s.hover += (s.hoverT - s.hover) * Math.min(1, dt * 6);
            const swing = Math.sin(t * 0.6 + s.phase) * 0.45;
            s.pivot.rotation.y += ((swing + s.px * 0.5 * s.hover) - s.pivot.rotation.y) * Math.min(1, dt * 4);
            s.pivot.rotation.x += ((s.py * 0.25 * s.hover) - s.pivot.rotation.x) * Math.min(1, dt * 4);
            s.pivot.position.y = Math.sin(t * 1.1 + s.phase) * 0.06 + s.hover * 0.06;
            draw(s);
        }
        if (!any) stop();
    }
    function start() { if (running || reducedMotion) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            const s = slots.find((x) => x.canvas === en.target);
            if (!s) return;
            s.visible = en.isIntersecting;
            if (s.visible && reducedMotion && !s.drawn) { s.pivot.rotation.y = -0.35; draw(s); }
        });
        if (slots.some((s) => s.visible) && !document.hidden) start();
    }, { rootMargin: '100px 0px' });
    slots.forEach((s) => io.observe(s.canvas));

    const ro = new ResizeObserver(() => {
        measure();
        if (reducedMotion) slots.forEach((s) => { if (s.visible) draw(s); });
    });
    slots.forEach((s) => ro.observe(s.canvas));
    measure();

    const onVis = () => { if (document.hidden) stop(); else if (slots.some((s) => s.visible)) start(); };
    document.addEventListener('visibilitychange', onVis);

    window.addEventListener('pagehide', () => {
        stop(); io.disconnect(); ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        slots.forEach((s) => s.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); }));
        Object.values(M).forEach((m) => m.dispose());
        env.dispose();
        gl.dispose();
    }, { once: true });

    return { count: slots.length };
}
