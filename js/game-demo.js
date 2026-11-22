/* ==========================================================================
   "Orb Runner" — a tiny playable demo for the Game Lab section.
   Systems: camera-relative character controller (acceleration, friction,
   jump with coyote time, squash & stretch), gravity + fall/respawn,
   circle & box collisions, a steering-behaviour NPC drone (wander/seek/
   arrive), collectibles, HUD and win/lose states.
   ========================================================================== */
import * as THREE from 'three';

const ISLAND_R = 8.6;
const PLAYER_R = 0.38;

function gridTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#16262b'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(111,240,198,0.16)'; g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    g.strokeStyle = 'rgba(111,240,198,0.06)'; g.lineWidth = 1;
    for (let i = 32; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}
function blobTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

export function initGame({ root, lite }) {
    const canvas = root.querySelector('.arena__canvas');
    const ui = {
        score: root.querySelector('.arena__score'),
        total: root.querySelector('.arena__total'),
        time: root.querySelector('.arena__time'),
        title: root.querySelector('.arena__title'),
        msg: root.querySelector('.arena__msg'),
        startBtn: root.querySelector('.arena__start'),
        startLabel: root.querySelector('.arena__start span'),
    };

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
    } catch (e) {
        return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const disposables = [];
    const T = (o) => { disposables.push(o); return o; };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080b);
    scene.fog = new THREE.Fog(0x05080b, 18, 38);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 10, 12);

    scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0b1216, 1.1));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.0);
    sun.position.set(6, 12, 4);
    scene.add(sun);
    const glowLight = new THREE.PointLight(0x6ff0c6, 25, 16, 2);
    glowLight.position.set(0, 4, 0);
    scene.add(glowLight);

    // ---------- Level ----------
    const island = new THREE.Group();
    scene.add(island);
    const top = new THREE.Mesh(T(new THREE.CircleGeometry(ISLAND_R + 0.4, 48)), T(new THREE.MeshStandardMaterial({ map: T(gridTexture()), roughness: 0.85 })));
    top.rotation.x = -Math.PI / 2;
    island.add(top);
    const rock = new THREE.Mesh(
        T(new THREE.CylinderGeometry(ISLAND_R + 0.4, 4.5, 3.4, 14, 1)),
        T(new THREE.MeshStandardMaterial({ color: 0x10181c, roughness: 0.95, flatShading: true }))
    );
    rock.position.y = -1.72;
    island.add(rock);
    const rim = new THREE.Mesh(T(new THREE.TorusGeometry(ISLAND_R + 0.4, 0.04, 8, 96)), T(new THREE.MeshBasicMaterial({ color: 0x6ff0c6 })));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.02;
    island.add(rim);

    // Raised platform (jump target)
    const PLAT = { x: -3.6, z: -2.4, hw: 1.4, hd: 1.4, h: 0.9 };
    const plat = new THREE.Mesh(T(new THREE.BoxGeometry(PLAT.hw * 2, PLAT.h, PLAT.hd * 2)), T(new THREE.MeshStandardMaterial({ color: 0x24363c, roughness: 0.7 })));
    plat.position.set(PLAT.x, PLAT.h / 2, PLAT.z);
    island.add(plat);
    const platEdge = new THREE.LineSegments(T(new THREE.EdgesGeometry(plat.geometry)), T(new THREE.LineBasicMaterial({ color: 0x6ff0c6, transparent: true, opacity: 0.6 })));
    platEdge.position.copy(plat.position);
    island.add(platEdge);

    // Obstacles: low-poly trees & rocks with circle colliders
    const colliders = [];
    const leafMat = T(new THREE.MeshStandardMaterial({ color: 0x2f7a63, roughness: 0.8, flatShading: true }));
    const leafMat2 = T(new THREE.MeshStandardMaterial({ color: 0x3f9a7b, roughness: 0.8, flatShading: true }));
    const trunkMat = T(new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9, flatShading: true }));
    const rockMat = T(new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.9, flatShading: true }));
    const coneA = T(new THREE.ConeGeometry(0.8, 1.6, 6));
    const coneB = T(new THREE.ConeGeometry(0.6, 1.2, 6));
    const trunkG = T(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 6));
    const rockG = T(new THREE.DodecahedronGeometry(0.6, 0));
    [[3.8, -3.2, 1.1], [5.6, 1.6, 0.9], [-5.8, 2.6, 1.0], [1.2, 5.4, 1.15], [-1.6, -6.2, 0.95], [6.2, -5.0, 0.8]].forEach(([x, z, s]) => {
        const t = new THREE.Group();
        const trunk = new THREE.Mesh(trunkG, trunkMat); trunk.position.y = 0.35;
        const l1 = new THREE.Mesh(coneA, leafMat); l1.position.y = 1.3;
        const l2 = new THREE.Mesh(coneB, leafMat2); l2.position.y = 2.0;
        t.add(trunk, l1, l2); t.position.set(x, 0, z); t.scale.setScalar(s); t.rotation.y = x * 3;
        island.add(t);
        colliders.push({ x, z, r: 0.55 * s });
    });
    [[-2.4, 3.6, 0.9], [2.6, 1.4, 0.7], [-6.4, -2.0, 0.8], [4.0, 5.0, 0.6]].forEach(([x, z, s]) => {
        const r = new THREE.Mesh(rockG, rockMat); r.position.set(x, 0.3 * s, z); r.scale.set(s, s * 0.8, s); r.rotation.set(x, z, 0);
        island.add(r);
        colliders.push({ x, z, r: 0.55 * s });
    });

    const blobTex = T(blobTexture());
    const blobMat = T(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    const blobGeo = T(new THREE.PlaneGeometry(1, 1));
    function blob(size) {
        const m = new THREE.Mesh(blobGeo, blobMat);
        m.rotation.x = -Math.PI / 2; m.scale.setScalar(size);
        scene.add(m);
        return m;
    }

    // ---------- Player ----------
    const player = new THREE.Group();
    const bodyMat = T(new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.35, metalness: 0.1 }));
    const body = new THREE.Mesh(T(new THREE.CapsuleGeometry(PLAYER_R, 0.5, 6, 14)), bodyMat);
    body.position.y = PLAYER_R + 0.25;
    const visor = new THREE.Mesh(T(new THREE.BoxGeometry(0.46, 0.16, 0.12)), T(new THREE.MeshStandardMaterial({ color: 0x6ff0c6, emissive: 0x6ff0c6, emissiveIntensity: 1.4 })));
    visor.position.set(0, PLAYER_R + 0.5, PLAYER_R - 0.03);
    const pack = new THREE.Mesh(T(new THREE.BoxGeometry(0.4, 0.42, 0.18)), T(new THREE.MeshStandardMaterial({ color: 0xe8c38a, roughness: 0.4, metalness: 0.5 })));
    pack.position.set(0, PLAYER_R + 0.28, -PLAYER_R);
    const avatar = new THREE.Group();
    avatar.add(body, visor, pack);
    player.add(avatar);
    scene.add(player);
    const playerBlob = blob(1.1);

    // ---------- Drone NPC ----------
    const drone = new THREE.Group();
    const core = new THREE.Mesh(T(new THREE.IcosahedronGeometry(0.34, 1)), T(new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.8, roughness: 0.25, flatShading: true })));
    const eye = new THREE.Mesh(T(new THREE.SphereGeometry(0.12, 16, 12)), T(new THREE.MeshBasicMaterial({ color: 0xff5a6a })));
    eye.position.z = 0.28;
    const halo = new THREE.Mesh(T(new THREE.TorusGeometry(0.55, 0.03, 8, 40)), T(new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.8 })));
    halo.rotation.x = Math.PI / 2;
    drone.add(core, eye, halo);
    scene.add(drone);
    const droneLight = new THREE.PointLight(0xff5a6a, 6, 4, 2);
    drone.add(droneLight);
    const droneBlob = blob(0.9);

    // ---------- Orbs ----------
    const ORB_SPOTS = [[0, -4.2, 0], [4.6, -1.2, 0], [-4.4, 4.6, 0], [3.2, 3.4, 0], [-6.6, 0.4, 0], [6.8, 3.8, 0], [-0.2, 7.0, 0], [PLAT.x, PLAT.z, PLAT.h]];
    const orbGeo = T(new THREE.OctahedronGeometry(0.26, 0));
    const orbMat = T(new THREE.MeshStandardMaterial({ color: 0xe8c38a, emissive: 0xe8c38a, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.2 }));
    const orbs = ORB_SPOTS.map(([x, z, h]) => {
        const m = new THREE.Mesh(orbGeo, orbMat);
        m.position.set(x, h + 0.75, z);
        scene.add(m);
        return { m, base: h + 0.75, taken: false, pop: 0 };
    });
    ui.total.textContent = String(orbs.length);

    // ---------- State ----------
    const S = {
        mode: 'idle',            // idle | playing | paused | won | lost
        pos: new THREE.Vector3(0, 0, 2),
        vel: new THREE.Vector3(),
        grounded: true, coyote: 0, jumpBuf: 0, squash: 0, face: 0,
        drone: new THREE.Vector3(0, 1.3, -5), dvel: new THREE.Vector3(), wander: 0,
        score: 0, time: 0, grace: 0, shake: 0, invuln: 0, falls: 0,
    };
    const keys = new Set();
    const pointer = { down: false, target: new THREE.Vector3(), has: false, lastTap: 0 };

    function reset() {
        S.pos.set(0, 0, 2); S.vel.set(0, 0, 0); S.grounded = true;
        S.drone.set(0, 1.3, -6); S.dvel.set(0, 0, 0);
        S.score = 0; S.time = 0; S.grace = 1.8; S.invuln = 0; S.falls = 0;
        orbs.forEach((o) => { o.taken = false; o.pop = 0; o.m.visible = true; o.m.scale.setScalar(1); });
        updateHud();
    }
    function updateHud() {
        ui.score.textContent = String(S.score);
        ui.time.textContent = S.time.toFixed(1) + 's';
    }

    function groundHeight(x, z, y) {
        const onPlat = Math.abs(x - PLAT.x) < PLAT.hw && Math.abs(z - PLAT.z) < PLAT.hd;
        if (onPlat && y >= PLAT.h - 0.12) return PLAT.h;
        if (Math.hypot(x, z) < ISLAND_R) return 0;
        return -Infinity;
    }

    function inputDir(out) {
        out.set(0, 0, 0);
        if (keys.has('KeyW') || keys.has('ArrowUp')) out.z -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) out.z += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) out.x -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) out.x += 1;
        if (pointer.down && pointer.has) {
            const dx = pointer.target.x - S.pos.x, dz = pointer.target.z - S.pos.z;
            const d = Math.hypot(dx, dz);
            if (d > 0.35) { out.x += dx / d; out.z += dz / d; }
        }
        if (out.lengthSq() > 1) out.normalize();
        return out;
    }

    const tmp = new THREE.Vector3(), dir = new THREE.Vector3(), steer = new THREE.Vector3();

    function step(dt) {
        S.time += dt;
        if (S.grace > 0) S.grace -= dt;
        if (S.invuln > 0) S.invuln -= dt;

        // --- Character controller ---
        inputDir(dir);
        const ACCEL = S.grounded ? 38 : 16, MAX = 6.2, FRICTION = S.grounded ? 10 : 1.2;
        S.vel.x += dir.x * ACCEL * dt;
        S.vel.z += dir.z * ACCEL * dt;
        if (dir.lengthSq() < 0.01) {
            const k = Math.max(0, 1 - FRICTION * dt);
            S.vel.x *= k; S.vel.z *= k;
        }
        const hs = Math.hypot(S.vel.x, S.vel.z);
        if (hs > MAX) { S.vel.x *= MAX / hs; S.vel.z *= MAX / hs; }

        // jump (buffered + coyote time)
        if (S.jumpBuf > 0) S.jumpBuf -= dt;
        S.coyote = S.grounded ? 0.12 : S.coyote - dt;
        if (S.jumpBuf > 0 && S.coyote > 0) {
            S.vel.y = 7.4; S.grounded = false; S.coyote = 0; S.jumpBuf = 0; S.squash = -0.35;
        }
        S.vel.y -= 21 * dt;

        // integrate horizontal, resolve collisions
        S.pos.x += S.vel.x * dt;
        S.pos.z += S.vel.z * dt;
        for (const c of colliders) {
            const dx = S.pos.x - c.x, dz = S.pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + PLAYER_R;
            if (d < min && d > 1e-4 && S.pos.y < 1.6) {
                S.pos.x = c.x + (dx / d) * min; S.pos.z = c.z + (dz / d) * min;
                const vn = (S.vel.x * dx + S.vel.z * dz) / d;
                if (vn < 0) { S.vel.x -= (dx / d) * vn; S.vel.z -= (dz / d) * vn; }
            }
        }
        // platform side collision (only when below its top)
        if (S.pos.y < PLAT.h - 0.12) {
            const ox = PLAT.hw + PLAYER_R - Math.abs(S.pos.x - PLAT.x);
            const oz = PLAT.hd + PLAYER_R - Math.abs(S.pos.z - PLAT.z);
            if (ox > 0 && oz > 0) {
                if (ox < oz) { S.pos.x += Math.sign(S.pos.x - PLAT.x) * ox; S.vel.x = 0; }
                else { S.pos.z += Math.sign(S.pos.z - PLAT.z) * oz; S.vel.z = 0; }
            }
        }

        // vertical
        S.pos.y += S.vel.y * dt;
        const gh = groundHeight(S.pos.x, S.pos.z, S.pos.y);
        if (S.pos.y <= gh && S.vel.y <= 0) {
            if (!S.grounded && S.vel.y < -6) S.squash = 0.3;
            S.pos.y = gh; S.vel.y = 0; S.grounded = true;
        } else if (S.pos.y > gh + 0.001) {
            S.grounded = false;
        }
        // fell off the island -> respawn
        if (S.pos.y < -9) {
            S.falls++; S.shake = 0.4;
            S.pos.set(0, 4, 0); S.vel.set(0, 0, 0); S.invuln = 1.2;
            flash('Respawned — mind the edge!');
        }

        // facing + squash/stretch
        if (hs > 0.4) {
            const target = Math.atan2(S.vel.x, S.vel.z);
            let d = target - S.face; d = Math.atan2(Math.sin(d), Math.cos(d));
            S.face += d * Math.min(1, dt * 12);
        }
        S.squash += (0 - S.squash) * Math.min(1, dt * 10);
        const air = S.grounded ? 0 : Math.min(0.15, Math.abs(S.vel.y) * 0.02);
        avatar.scale.set(1 + S.squash * 0.5 - air * 0.5, 1 - S.squash + air, 1 + S.squash * 0.5 - air * 0.5);
        avatar.rotation.x = Math.min(0.25, hs * 0.035);

        // --- Drone AI: wander until it notices the player, then seek with arrival ---
        const toP = tmp.set(S.pos.x - S.drone.x, 0, S.pos.z - S.drone.z);
        const dist = toP.length();
        const MAXD = 2.9 + S.score * 0.32;
        if (S.grace <= 0 && dist < 11) {
            const desired = toP.normalize().multiplyScalar(dist < 1.5 ? MAXD * (dist / 1.5) + 1 : MAXD);
            steer.set(desired.x - S.dvel.x, 0, desired.z - S.dvel.z).clampLength(0, 7 * dt * 2);
        } else {
            S.wander += (Math.random() - 0.5) * 2.5 * dt;
            const w = new THREE.Vector3(Math.sin(S.wander), 0, Math.cos(S.wander)).multiplyScalar(1.6);
            const home = new THREE.Vector3(-S.drone.x, 0, -S.drone.z).multiplyScalar(Math.max(0, Math.hypot(S.drone.x, S.drone.z) - 5) * 0.4);
            steer.set(w.x + home.x - S.dvel.x, 0, w.z + home.z - S.dvel.z).clampLength(0, 4 * dt);
        }
        S.dvel.add(steer).clampLength(0, MAXD);
        // keep drone over the island
        S.drone.x += S.dvel.x * dt; S.drone.z += S.dvel.z * dt;
        const dr = Math.hypot(S.drone.x, S.drone.z);
        if (dr > ISLAND_R - 0.5) { S.drone.x *= (ISLAND_R - 0.5) / dr; S.drone.z *= (ISLAND_R - 0.5) / dr; }

        // caught?
        const dy = (S.pos.y + 0.6) - S.drone.y;
        if (S.mode === 'playing' && S.grace <= 0 && S.invuln <= 0 && dist < 0.75 && Math.abs(dy) < 1.0) {
            end('lost');
        }

        // --- Collectibles ---
        for (const o of orbs) {
            if (o.taken) continue;
            const ddx = o.m.position.x - S.pos.x, ddz = o.m.position.z - S.pos.z, ddy = o.m.position.y - (S.pos.y + 0.6);
            if (ddx * ddx + ddz * ddz + ddy * ddy < 0.72) {
                o.taken = true; o.pop = 0.001; S.score++; S.shake = 0.12;
                if (S.score === orbs.length) end('won');
            }
        }
        updateHud();
    }

    function animateWorld(dt, t) {
        // orbs
        orbs.forEach((o, i) => {
            if (o.pop > 0) {
                o.pop += dt * 4;
                o.m.scale.setScalar(Math.max(0.001, 1 + o.pop * 1.5) * Math.max(0, 1 - o.pop));
                if (o.pop >= 1) { o.m.visible = false; o.pop = 0; }
            }
            o.m.rotation.y = t * 1.6 + i;
            o.m.position.y = o.base + Math.sin(t * 2.2 + i) * 0.12;
        });
        // drone visuals
        drone.position.set(S.drone.x, 1.3 + Math.sin(t * 3) * 0.12, S.drone.z);
        if (S.dvel.lengthSq() > 0.01) drone.rotation.y = Math.atan2(S.dvel.x, S.dvel.z);
        halo.rotation.z = t * 2;
        const hunting = S.mode === 'playing' && S.grace <= 0;
        droneLight.intensity = hunting ? 6 + Math.sin(t * 10) * 2 : 3;

        // player visuals
        player.position.copy(S.pos);
        player.rotation.y = S.face;
        avatar.visible = !(S.invuln > 0 && Math.floor(t * 14) % 2 === 0);

        // blob shadows
        const gh = Math.max(0, groundHeight(S.pos.x, S.pos.z, S.pos.y + 0.01));
        playerBlob.visible = Number.isFinite(groundHeight(S.pos.x, S.pos.z, S.pos.y + 0.01));
        playerBlob.position.set(S.pos.x, gh + 0.01, S.pos.z);
        playerBlob.scale.setScalar(1.1 / (1 + Math.max(0, S.pos.y - gh) * 0.25));
        droneBlob.position.set(S.drone.x, 0.012, S.drone.z);
    }

    // ---------- Camera ----------
    const camTarget = new THREE.Vector3();
    let narrow = false;
    function updateCamera(dt, t) {
        if (S.mode === 'idle') {
            const a = t * 0.12;
            camera.position.set(Math.sin(a) * 15, 9.5, Math.cos(a) * 15);
            camera.lookAt(0, 0, 0);
            return;
        }
        const off = narrow ? tmp.set(0, 11, 11) : tmp.set(0, 8.5, 9.5);
        camTarget.set(S.pos.x * 0.85, 0, S.pos.z * 0.85 + off.z);
        camera.position.x += (camTarget.x - camera.position.x) * Math.min(1, dt * 4);
        camera.position.y += (off.y + Math.max(0, S.pos.y) * 0.4 - camera.position.y) * Math.min(1, dt * 4);
        camera.position.z += (camTarget.z - camera.position.z) * Math.min(1, dt * 4);
        if (S.shake > 0) {
            S.shake -= dt;
            camera.position.x += (Math.random() - 0.5) * S.shake * 0.6;
            camera.position.y += (Math.random() - 0.5) * S.shake * 0.6;
        }
        camera.lookAt(S.pos.x * 0.85, Math.max(0, S.pos.y) * 0.5, S.pos.z * 0.85);
    }

    // ---------- Resize ----------
    function resize() {
        const w = root.clientWidth, h = root.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        narrow = w < 700;
        camera.fov = narrow ? 58 : 45;
        camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    // ---------- Loop ----------
    const clock = new THREE.Clock();
    let raf = 0, running = false, t = 0;
    function frame() {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(clock.getDelta(), 0.04);
        t += dt;
        if (S.mode === 'playing') step(dt);
        else if (S.mode === 'idle') idleDrone(dt);
        animateWorld(dt, t);
        updateCamera(dt, t);
        renderer.render(scene, camera);
    }
    function idleDrone(dt) {
        S.wander += dt * 0.6;
        S.drone.set(Math.sin(S.wander) * 4, 1.3, Math.cos(S.wander * 0.8) * 4);
        S.dvel.set(Math.cos(S.wander) * 4, 0, -Math.sin(S.wander * 0.8) * 3.2);
    }
    function run() { if (running) return; running = true; clock.getDelta(); frame(); }
    function halt() { running = false; cancelAnimationFrame(raf); }

    // ---------- Flow ----------
    let flashTimer = 0;
    function flash(text) {
        const el = root.querySelector('.arena__toast') || (() => {
            const d = document.createElement('div');
            d.className = 'arena__toast';
            d.style.cssText = 'position:absolute;left:50%;top:22px;transform:translateX(-50%);z-index:3;padding:8px 14px;border-radius:999px;background:rgba(4,8,10,.7);border:1px solid rgba(111,240,198,.25);font:500 12px var(--font-mono);letter-spacing:.08em;color:#6ff0c6;pointer-events:none;transition:opacity .4s;white-space:nowrap';
            root.appendChild(d);
            return d;
        })();
        el.textContent = text; el.style.opacity = '1';
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
    }

    function play() {
        if (S.mode !== 'paused') reset();
        S.mode = 'playing';
        root.classList.add('is-playing');
        canvas.focus({ preventScroll: true });
        flash(S.time > 0 ? 'Resumed' : 'Go! Grab the orbs');
        run();
    }
    function pause() {
        if (S.mode !== 'playing') return;
        S.mode = 'paused';
        keys.clear(); pointer.down = false;
        root.classList.remove('is-playing');
        ui.title.textContent = 'Paused';
        ui.msg.textContent = `${S.score}/${orbs.length} orbs · ${S.time.toFixed(1)}s`;
        ui.startLabel.textContent = 'Resume';
    }
    function end(result) {
        S.mode = result;
        keys.clear(); pointer.down = false;
        root.classList.remove('is-playing');
        if (result === 'won') {
            ui.title.textContent = 'Level complete';
            ui.msg.textContent = `All ${orbs.length} orbs in ${S.time.toFixed(1)}s${S.falls ? ` · ${S.falls} fall${S.falls > 1 ? 's' : ''}` : ''}. Nicely played.`;
        } else {
            ui.title.textContent = 'Caught!';
            ui.msg.textContent = `The drone got you with ${S.score}/${orbs.length} orbs. It speeds up as you collect — keep moving.`;
        }
        ui.startLabel.textContent = 'Play again';
    }

    // ---------- Input ----------
    const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    const onKeyDown = (e) => {
        if (S.mode !== 'playing') return;
        if (e.code === 'Escape') { pause(); return; }
        if (GAME_KEYS.has(e.code)) {
            e.preventDefault();
            if (e.code === 'Space') { if (!e.repeat) S.jumpBuf = 0.15; }
            else keys.add(e.code);
        }
    };
    const onKeyUp = (e) => { keys.delete(e.code); };
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('blur', () => { keys.clear(); });

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function aim(e) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        pointer.has = !!ray.ray.intersectPlane(plane, pointer.target);
    }
    canvas.addEventListener('pointerdown', (e) => {
        if (S.mode !== 'playing') return;
        pointer.down = true; aim(e);
        canvas.setPointerCapture(e.pointerId);
        const now = performance.now();
        if (e.pointerType !== 'mouse' && now - pointer.lastTap < 300) S.jumpBuf = 0.15;
        if (e.pointerType === 'mouse' && e.button === 2) S.jumpBuf = 0.15;
        pointer.lastTap = now;
    });
    canvas.addEventListener('pointermove', (e) => { if (pointer.down) aim(e); });
    const release = () => { pointer.down = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('contextmenu', (e) => { if (S.mode === 'playing') e.preventDefault(); });

    ui.startBtn.addEventListener('click', play);

    // pause & stop rendering when off-screen
    const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !document.hidden) run();
        else { if (S.mode === 'playing') pause(); halt(); }
    }, { threshold: 0.05 });
    io.observe(root);
    const onVis = () => { if (document.hidden) { if (S.mode === 'playing') pause(); halt(); } };
    document.addEventListener('visibilitychange', onVis);

    reset();
    S.mode = 'idle';

    function destroy() {
        halt(); io.disconnect(); ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        disposables.forEach((d) => d && d.dispose && d.dispose());
        renderer.dispose();
    }
    window.addEventListener('pagehide', destroy, { once: true });
    return { destroy };
}
