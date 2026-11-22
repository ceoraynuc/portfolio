/* ==========================================================================
   Orb Runner — a small playable Three.js demo.
   Fixed-timestep simulation (frame-rate independent), camera-relative
   character controller with acceleration, jump buffering and coyote time,
   gravity, circle/box collisions, a steering-behaviour NPC drone,
   collectibles, 3 lives, pause, restart, win and game-over states.
   ========================================================================== */
import * as THREE from 'three';

const ISLAND_R = 8.6;
const PLAYER_R = 0.38;
const STEP = 1 / 60;
const LIVES = 3;
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

function gridTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
    }
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
    r.addColorStop(0, 'rgba(0,0,0,0.5)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

export function initGame({ root, lite }) {
    const canvas = root.querySelector('.arena__canvas');
    const ui = {
        score: root.querySelector('.arena__score'),
        total: root.querySelector('.arena__total'),
        time: root.querySelector('.arena__time'),
        lives: root.querySelector('.arena__lives'),
        title: root.querySelector('.arena__title'),
        msg: root.querySelector('.arena__msg'),
        start: root.querySelector('.arena__start'),
        startLabel: root.querySelector('.arena__start span'),
        jump: root.querySelector('.arena__jump'),
    };

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
    } catch (e) {
        return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const disposables = [];
    const T = (o) => { disposables.push(o); return o; };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0e0f);
    scene.fog = new THREE.Fog(0x0d0e0f, 20, 40);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 10, 14);

    scene.add(new THREE.HemisphereLight(0xf4efe6, 0x16171a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.8);
    sun.position.set(6, 12, 5);
    scene.add(sun);

    /* ---------- Level ---------- */
    const top = new THREE.Mesh(T(new THREE.CircleGeometry(ISLAND_R + 0.4, 64)), T(new THREE.MeshStandardMaterial({ map: T(gridTexture()), roughness: 0.9 })));
    top.rotation.x = -Math.PI / 2;
    scene.add(top);
    const cliff = new THREE.Mesh(T(new THREE.CylinderGeometry(ISLAND_R + 0.4, 5, 3.2, 32, 1, true)), T(new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 1 })));
    cliff.position.y = -1.6;
    scene.add(cliff);
    const edge = new THREE.Mesh(T(new THREE.TorusGeometry(ISLAND_R + 0.4, 0.025, 6, 128)), T(new THREE.MeshBasicMaterial({ color: 0xeabe7c, transparent: true, opacity: 0.45 })));
    edge.rotation.x = Math.PI / 2; edge.position.y = 0.01;
    scene.add(edge);

    // raised platform (jump target)
    const PLAT = { x: -3.6, z: -2.4, hw: 1.4, hd: 1.4, h: 0.9 };
    const plat = new THREE.Mesh(T(new THREE.BoxGeometry(PLAT.hw * 2, PLAT.h, PLAT.hd * 2)), T(new THREE.MeshStandardMaterial({ color: 0x2b2c2f, roughness: 0.8 })));
    plat.position.set(PLAT.x, PLAT.h / 2, PLAT.z);
    scene.add(plat);

    // obstacles with circle colliders: stone pillars and rocks
    const colliders = [];
    const stone = T(new THREE.MeshStandardMaterial({ color: 0x4a4b4f, roughness: 0.85, flatShading: true }));
    const pillarG = T(new THREE.CylinderGeometry(0.5, 0.58, 1.8, 6));
    const rockG = T(new THREE.DodecahedronGeometry(0.6, 0));
    [[3.8, -3.2], [5.6, 1.6], [-5.8, 2.6], [1.2, 5.4], [-1.6, -6.2], [6.2, -5.0]].forEach(([x, z]) => {
        const m = new THREE.Mesh(pillarG, stone); m.position.set(x, 0.9, z); m.rotation.y = x;
        scene.add(m); colliders.push({ x, z, r: 0.56 });
    });
    [[-2.4, 3.6, 0.9], [2.6, 1.4, 0.7], [-6.4, -2.0, 0.8], [4.0, 5.0, 0.6]].forEach(([x, z, s]) => {
        const m = new THREE.Mesh(rockG, stone); m.position.set(x, 0.3 * s, z); m.scale.set(s, s * 0.8, s); m.rotation.set(x, z, 0);
        scene.add(m); colliders.push({ x, z, r: 0.55 * s });
    });

    const blobMat = T(new THREE.MeshBasicMaterial({ map: T(blobTexture()), transparent: true, depthWrite: false }));
    const blobGeo = T(new THREE.PlaneGeometry(1, 1));
    const blob = (size) => { const m = new THREE.Mesh(blobGeo, blobMat); m.rotation.x = -Math.PI / 2; m.scale.setScalar(size); scene.add(m); return m; };

    /* ---------- Player ---------- */
    const player = new THREE.Group();
    const avatar = new THREE.Group();
    const body = new THREE.Mesh(T(new THREE.CapsuleGeometry(PLAYER_R, 0.5, 6, 16)), T(new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.4 })));
    body.position.y = PLAYER_R + 0.25;
    const visor = new THREE.Mesh(T(new THREE.BoxGeometry(0.44, 0.14, 0.1)), T(new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.2, metalness: 0.4 })));
    visor.position.set(0, PLAYER_R + 0.5, PLAYER_R - 0.02);
    const pack = new THREE.Mesh(T(new THREE.BoxGeometry(0.38, 0.4, 0.16)), T(new THREE.MeshStandardMaterial({ color: 0xeabe7c, roughness: 0.5, metalness: 0.3 })));
    pack.position.set(0, PLAYER_R + 0.28, -PLAYER_R);
    avatar.add(body, visor, pack);
    player.add(avatar);
    scene.add(player);
    const playerBlob = blob(1.1);

    /* ---------- Drone ---------- */
    const drone = new THREE.Group();
    drone.add(new THREE.Mesh(T(new THREE.IcosahedronGeometry(0.34, 1)), T(new THREE.MeshStandardMaterial({ color: 0x232427, metalness: 0.7, roughness: 0.3, flatShading: true }))));
    const eye = new THREE.Mesh(T(new THREE.SphereGeometry(0.11, 16, 12)), T(new THREE.MeshBasicMaterial({ color: 0xe0574a })));
    eye.position.z = 0.28;
    drone.add(eye);
    scene.add(drone);
    const droneBlob = blob(0.9);

    /* ---------- Orbs ---------- */
    const ORB_SPOTS = [[0, -4.2, 0], [4.6, -1.2, 0], [-4.4, 4.6, 0], [3.2, 3.4, 0], [-6.6, 0.4, 0], [6.8, 3.8, 0], [-0.2, 7.0, 0], [PLAT.x, PLAT.z, PLAT.h]];
    const orbGeo = T(new THREE.OctahedronGeometry(0.26, 0));
    const orbMat = T(new THREE.MeshStandardMaterial({ color: 0xeabe7c, emissive: 0xb88a45, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.25 }));
    const orbs = ORB_SPOTS.map(([x, z, h]) => {
        const m = new THREE.Mesh(orbGeo, orbMat);
        m.position.set(x, h + 0.75, z);
        scene.add(m);
        return { m, base: h + 0.75, taken: false, pop: 0 };
    });
    ui.total.textContent = String(orbs.length);

    /* ---------- State ---------- */
    const S = {
        mode: 'idle', // idle | playing | paused | won | lost
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        grounded: true, coyote: 0, jumpBuf: 0, squash: 0, face: Math.PI,
        drone: new THREE.Vector3(), dvel: new THREE.Vector3(), wander: 0,
        score: 0, time: 0, lives: LIVES, grace: 0, invuln: 0, shake: 0,
    };
    const keys = new Set();
    const pointer = { down: false, has: false, target: new THREE.Vector3() };

    function reset() {
        S.pos.set(0, 0, 2); S.vel.set(0, 0, 0); S.grounded = true; S.face = Math.PI;
        S.drone.set(0, 1.3, -6); S.dvel.set(0, 0, 0);
        S.score = 0; S.time = 0; S.lives = LIVES; S.grace = 2; S.invuln = 0;
        orbs.forEach((o) => { o.taken = false; o.pop = 0; o.m.visible = true; o.m.scale.setScalar(1); });
        hud();
    }
    function hud() {
        ui.score.textContent = String(S.score);
        ui.time.textContent = S.time.toFixed(1) + 's';
        if (ui.lives) ui.lives.textContent = String(S.lives);
    }

    function groundHeight(x, z, y) {
        if (Math.abs(x - PLAT.x) < PLAT.hw && Math.abs(z - PLAT.z) < PLAT.hd && y >= PLAT.h - 0.15) return PLAT.h;
        if (Math.hypot(x, z) < ISLAND_R) return 0;
        return -Infinity;
    }
    const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), steer = new THREE.Vector3(), wanderV = new THREE.Vector3();
    function input() {
        dir.set(0, 0, 0);
        if (keys.has('KeyW') || keys.has('ArrowUp')) dir.z -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) dir.z += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) dir.x -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) dir.x += 1;
        if (pointer.down && pointer.has) {
            const dx = pointer.target.x - S.pos.x, dz = pointer.target.z - S.pos.z, d = Math.hypot(dx, dz);
            if (d > 0.35) { dir.x += dx / d; dir.z += dz / d; }
        }
        if (dir.lengthSq() > 1) dir.normalize();
    }

    function loseLife(reason) {
        S.lives--;
        S.shake = 0.35;
        hud();
        if (S.lives <= 0) { end('lost', reason); return; }
        S.pos.set(0, 3, 2); S.vel.set(0, 0, 0); S.invuln = 1.6;
        S.drone.set(0, 1.3, -6); S.dvel.set(0, 0, 0); S.grace = 1.2;
        toast(reason === 'fell' ? 'You fell — ' + S.lives + ' lives left' : 'Caught — ' + S.lives + ' lives left');
    }

    function step(dt) {
        S.time += dt;
        if (S.grace > 0) S.grace -= dt;
        if (S.invuln > 0) S.invuln -= dt;

        // movement
        input();
        const ACCEL = S.grounded ? 40 : 18, MAX = 6.2, FRICTION = S.grounded ? 11 : 1.5;
        S.vel.x += dir.x * ACCEL * dt;
        S.vel.z += dir.z * ACCEL * dt;
        if (dir.lengthSq() < 0.01) { const k = Math.max(0, 1 - FRICTION * dt); S.vel.x *= k; S.vel.z *= k; }
        const hs = Math.hypot(S.vel.x, S.vel.z);
        if (hs > MAX) { S.vel.x *= MAX / hs; S.vel.z *= MAX / hs; }

        // jump: buffered input + coyote time
        if (S.jumpBuf > 0) S.jumpBuf -= dt;
        S.coyote = S.grounded ? 0.12 : S.coyote - dt;
        if (S.jumpBuf > 0 && S.coyote > 0) { S.vel.y = 7.4; S.grounded = false; S.coyote = 0; S.jumpBuf = 0; S.squash = -0.3; }
        S.vel.y -= 21 * dt;

        // horizontal move + collisions
        S.pos.x += S.vel.x * dt;
        S.pos.z += S.vel.z * dt;
        for (const c of colliders) {
            const dx = S.pos.x - c.x, dz = S.pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + PLAYER_R;
            if (d < min && d > 1e-4 && S.pos.y < 1.8) {
                const nx = dx / d, nz = dz / d;
                S.pos.x = c.x + nx * min; S.pos.z = c.z + nz * min;
                const vn = S.vel.x * nx + S.vel.z * nz;
                if (vn < 0) { S.vel.x -= nx * vn; S.vel.z -= nz * vn; }
            }
        }
        if (S.pos.y < PLAT.h - 0.15) {
            const ox = PLAT.hw + PLAYER_R - Math.abs(S.pos.x - PLAT.x);
            const oz = PLAT.hd + PLAYER_R - Math.abs(S.pos.z - PLAT.z);
            if (ox > 0 && oz > 0) {
                if (ox < oz) { S.pos.x += Math.sign(S.pos.x - PLAT.x || 1) * ox; S.vel.x = 0; }
                else { S.pos.z += Math.sign(S.pos.z - PLAT.z || 1) * oz; S.vel.z = 0; }
            }
        }

        // vertical + landing
        S.pos.y += S.vel.y * dt;
        const gh = groundHeight(S.pos.x, S.pos.z, S.pos.y);
        if (S.pos.y <= gh && S.vel.y <= 0) {
            if (!S.grounded && S.vel.y < -6) S.squash = 0.25;
            S.pos.y = gh; S.vel.y = 0; S.grounded = true;
        } else if (S.pos.y > gh + 0.001) {
            S.grounded = false;
        }
        if (S.pos.y < -8) { loseLife('fell'); return; }

        // facing + squash/stretch
        if (hs > 0.4) {
            let d = Math.atan2(S.vel.x, S.vel.z) - S.face; d = Math.atan2(Math.sin(d), Math.cos(d));
            S.face += d * Math.min(1, dt * 12);
        }
        S.squash += (0 - S.squash) * Math.min(1, dt * 10);

        // drone AI: wander, then seek with arrival once it notices the player
        tmp.set(S.pos.x - S.drone.x, 0, S.pos.z - S.drone.z);
        const dist = tmp.length();
        const MAXD = 2.8 + S.score * 0.3;
        if (S.grace <= 0 && dist < 11) {
            tmp.normalize().multiplyScalar(dist < 1.5 ? MAXD * (dist / 1.5) + 1 : MAXD);
            steer.set(tmp.x - S.dvel.x, 0, tmp.z - S.dvel.z).clampLength(0, 14 * dt);
        } else {
            S.wander += (Math.random() - 0.5) * 2.5 * dt;
            wanderV.set(Math.sin(S.wander), 0, Math.cos(S.wander)).multiplyScalar(1.6);
            const out = Math.max(0, Math.hypot(S.drone.x, S.drone.z) - 5) * 0.4;
            steer.set(wanderV.x - S.drone.x * out - S.dvel.x, 0, wanderV.z - S.drone.z * out - S.dvel.z).clampLength(0, 4 * dt);
        }
        S.dvel.add(steer).clampLength(0, MAXD);
        S.drone.x += S.dvel.x * dt; S.drone.z += S.dvel.z * dt;
        const dr = Math.hypot(S.drone.x, S.drone.z), lim = ISLAND_R - 0.5;
        if (dr > lim) { S.drone.x *= lim / dr; S.drone.z *= lim / dr; }

        if (S.grace <= 0 && S.invuln <= 0 && dist < 0.75 && Math.abs(S.pos.y + 0.6 - 1.3) < 1.0) { loseLife('caught'); return; }

        // collectibles
        for (const o of orbs) {
            if (o.taken) continue;
            const dx = o.m.position.x - S.pos.x, dz = o.m.position.z - S.pos.z, dy = o.base - (S.pos.y + 0.6);
            if (dx * dx + dz * dz + dy * dy < 0.75) {
                o.taken = true; o.pop = 0.001; S.score++;
                if (S.score === orbs.length) { hud(); end('won'); return; }
            }
        }
    }

    function visuals(dt, t) {
        orbs.forEach((o, i) => {
            if (o.pop > 0) {
                o.pop += dt * 4;
                o.m.scale.setScalar(Math.max(0.001, (1 + o.pop) * (1 - o.pop)));
                if (o.pop >= 1) { o.m.visible = false; o.pop = 0; }
            }
            o.m.rotation.y = t * 1.6 + i;
            o.m.position.y = o.base + Math.sin(t * 2.2 + i) * 0.1;
        });
        drone.position.set(S.drone.x, 1.3 + Math.sin(t * 3) * 0.1, S.drone.z);
        if (S.dvel.lengthSq() > 0.01) drone.rotation.y = Math.atan2(S.dvel.x, S.dvel.z);

        player.position.copy(S.pos);
        player.rotation.y = S.face;
        const air = S.grounded ? 0 : Math.min(0.12, Math.abs(S.vel.y) * 0.02);
        avatar.scale.set(1 + S.squash * 0.5 - air * 0.5, 1 - S.squash + air, 1 + S.squash * 0.5 - air * 0.5);
        avatar.visible = !(S.invuln > 0 && Math.floor(t * 12) % 2 === 0);

        const gh = groundHeight(S.pos.x, S.pos.z, S.pos.y + 0.01);
        playerBlob.visible = Number.isFinite(gh);
        if (playerBlob.visible) {
            playerBlob.position.set(S.pos.x, gh + 0.01, S.pos.z);
            playerBlob.scale.setScalar(1.1 / (1 + Math.max(0, S.pos.y - gh) * 0.25));
        }
        droneBlob.position.set(S.drone.x, 0.012, S.drone.z);
    }

    /* ---------- Camera ---------- */
    let narrow = false;
    function updateCamera(dt, t) {
        if (S.mode === 'idle') {
            const a = t * 0.1;
            camera.position.set(Math.sin(a) * 15, 10, Math.cos(a) * 15);
            camera.lookAt(0, 0, 0);
            return;
        }
        const oy = narrow ? 12 : 9, oz = narrow ? 10 : 10;
        const k = Math.min(1, dt * 5);
        camera.position.x += (S.pos.x * 0.8 - camera.position.x) * k;
        camera.position.y += (oy + Math.max(0, S.pos.y) * 0.4 - camera.position.y) * k;
        camera.position.z += (S.pos.z * 0.8 + oz - camera.position.z) * k;
        if (S.shake > 0) {
            S.shake -= dt;
            camera.position.x += (Math.random() - 0.5) * S.shake * 0.5;
            camera.position.y += (Math.random() - 0.5) * S.shake * 0.5;
        }
        camera.lookAt(S.pos.x * 0.8, Math.max(0, S.pos.y) * 0.5, S.pos.z * 0.8);
    }

    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        narrow = w / h < 1.1;
        camera.fov = narrow ? 60 : 45;
        camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    /* ---------- Loop (fixed timestep) ---------- */
    let raf = 0, running = false, last = 0, acc = 0, t = 0;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const elapsed = Math.min(0.25, (now - (last || now)) / 1000);
        last = now;
        t += elapsed;
        if (S.mode === 'playing') {
            acc += elapsed;
            while (acc >= STEP && S.mode === 'playing') { step(STEP); acc -= STEP; }
            hud();
        } else {
            acc = 0;
            if (S.mode === 'idle') { S.wander += elapsed * 0.6; S.drone.set(Math.sin(S.wander) * 4, 1.3, Math.cos(S.wander * 0.8) * 4); S.dvel.set(Math.cos(S.wander), 0, -Math.sin(S.wander * 0.8)); }
        }
        visuals(elapsed, t);
        updateCamera(elapsed, t);
        renderer.render(scene, camera);
    }
    function run() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function halt() { running = false; cancelAnimationFrame(raf); }

    /* ---------- Flow ---------- */
    let toastEl = null, toastTimer = 0;
    function toast(text) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'arena__toast';
            toastEl.setAttribute('aria-live', 'polite');
            toastEl.style.cssText = 'position:absolute;left:50%;top:22px;transform:translateX(-50%);z-index:2;padding:6px 14px;border-radius:999px;background:rgba(13,14,15,.8);font-size:13px;color:#f2f0eb;pointer-events:none;white-space:nowrap;transition:opacity .3s';
            root.appendChild(toastEl);
        }
        toastEl.textContent = text; toastEl.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, 1800);
    }

    function play() {
        if (S.mode !== 'paused') reset();
        S.mode = 'playing';
        keys.clear();
        root.classList.add('is-playing');
        canvas.focus({ preventScroll: true });
        toast(S.time > 0 ? 'Resumed' : 'Go! Collect the orbs');
        run();
    }
    function pause() {
        if (S.mode !== 'playing') return;
        S.mode = 'paused';
        keys.clear(); pointer.down = false;
        root.classList.remove('is-playing');
        ui.title.textContent = 'Paused';
        ui.msg.textContent = `${S.score}/${orbs.length} orbs · ${S.lives} lives · ${S.time.toFixed(1)}s`;
        ui.startLabel.textContent = 'Resume';
    }
    function restart() { S.mode = 'idle'; play(); }
    function end(result, reason) {
        S.mode = result;
        keys.clear(); pointer.down = false;
        root.classList.remove('is-playing');
        if (result === 'won') {
            ui.title.textContent = 'You win!';
            ui.msg.textContent = `All ${orbs.length} orbs in ${S.time.toFixed(1)}s with ${S.lives} ${S.lives === 1 ? 'life' : 'lives'} left.`;
        } else {
            ui.title.textContent = 'Game over';
            ui.msg.textContent = `${reason === 'fell' ? 'You fell off the island' : 'The drone caught you'} with ${S.score}/${orbs.length} orbs collected.`;
        }
        ui.startLabel.textContent = 'Play again';
        ui.start.focus({ preventScroll: true });
    }

    /* ---------- Input ---------- */
    function inView() { const r = root.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }
    const onKeyDown = (e) => {
        if (e.code === 'KeyR' && S.mode !== 'idle' && inView() && !(e.target instanceof Element && e.target.closest('input, textarea, select'))) { e.preventDefault(); restart(); return; }
        if (S.mode !== 'playing') return;
        if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pause(); return; }
        if (GAME_KEYS.has(e.code)) {
            e.preventDefault();
            if (e.code === 'Space') { if (!e.repeat) S.jumpBuf = 0.15; } else keys.add(e.code);
        }
    };
    const onKeyUp = (e) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => keys.clear());

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function aim(e) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        pointer.has = !!ray.ray.intersectPlane(plane, pointer.target);
    }
    canvas.addEventListener('pointerdown', (e) => {
        if (S.mode !== 'playing') return;
        pointer.down = true; aim(e);
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', (e) => { if (pointer.down) aim(e); });
    const release = () => { pointer.down = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    if (ui.jump) ui.jump.addEventListener('pointerdown', (e) => { e.preventDefault(); if (S.mode === 'playing') S.jumpBuf = 0.15; });

    ui.start.addEventListener('click', () => (S.mode === 'won' || S.mode === 'lost' ? restart() : play()));

    const io = new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !document.hidden) run();
        else { pause(); halt(); }
    }, { threshold: 0.1 });
    io.observe(root);
    const onVis = () => { if (document.hidden) { pause(); halt(); } };
    document.addEventListener('visibilitychange', onVis);

    reset();
    S.mode = 'idle';

    // Small hook used for automated testing of the game logic
    root.__orbRunner = { state: S, orbs, play, pause, restart };

    function destroy() {
        halt(); io.disconnect(); ro.disconnect();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('visibilitychange', onVis);
        disposables.forEach((d) => d && d.dispose && d.dispose());
        renderer.dispose();
    }
    window.addEventListener('pagehide', destroy, { once: true });
    return { play, destroy };
}
