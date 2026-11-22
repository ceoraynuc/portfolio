/* ==========================================================================
   Hero laptop — the only 3D element on the page.
   A procedurally modelled aluminium laptop: the lid opens on load and the
   display shows a live-typing C# file. Subtle pointer parallax, drag to
   rotate, neutral studio lighting and a soft contact shadow.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- Screen content ---------- */
const CODE = [
    [['k', 'using '], ['t', 'UnityEngine'], ['p', ';']],
    [],
    [['k', 'public class '], ['t', 'Rayyan'], ['p', ' : '], ['t', 'MonoBehaviour']],
    [['p', '{']],
    [['p', '    '], ['k', 'string'], ['p', '[] crafts = {']],
    [['p', '        '], ['s', '"Full-Stack Web"'], ['p', ', '], ['s', '"Unity Games"'], ['p', ',']],
    [['p', '        '], ['s', '"Mobile Apps"']],
    [['p', '    };']],
    [],
    [['p', '    '], ['k', 'void '], ['f', 'Start'], ['p', '()']],
    [['p', '    {']],
    [['p', '        '], ['f', 'Build'], ['p', '(Web.Laravel, Web.NextJs);']],
    [['p', '        '], ['f', 'Ship'], ['p', '(Game.Unity, Platform.Android);']],
    [['p', '    }']],
    [['p', '}']],
];
// Neutral, warm syntax palette that matches the site
const COLORS = { k: '#eabe7c', t: '#f2f0eb', p: '#a9a7a2', s: '#d9c7a6', f: '#ffffff', c: '#6d6b67' };

function makeScreen() {
    const W = 1280, H = 800;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const total = CODE.reduce((n, line) => n + line.reduce((m, [, s]) => m + s.length, 0) + 1, 0);
    const LH = 38, TOP = 118, LEFT = 92;
    let last = '';

    function draw(typed, cursorOn) {
        ctx.fillStyle = '#121314'; ctx.fillRect(0, 0, W, H);
        // title bar
        ctx.fillStyle = '#1a1b1d'; ctx.fillRect(0, 0, W, 56);
        ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30 + i * 24, 28, 7, 0, Math.PI * 2); ctx.fill(); });
        ctx.font = '500 20px "Public Sans", system-ui, sans-serif';
        ctx.fillStyle = '#141516'; ctx.fillRect(120, 10, 170, 46);
        ctx.fillStyle = '#f2f0eb'; ctx.fillText('Rayyan.cs', 146, 40);
        ctx.fillStyle = '#6d6b67'; ctx.fillText('page.tsx', 320, 40); ctx.fillText('routes.php', 440, 40);
        // gutter
        ctx.fillStyle = '#0f1011'; ctx.fillRect(0, 56, 64, H - 92);

        ctx.font = '400 26px ui-monospace, "SFMono-Regular", Consolas, monospace';
        let budget = Math.floor(typed), y = TOP, cx = LEFT, cy = TOP;
        for (let li = 0; li < CODE.length; li++) {
            ctx.fillStyle = '#3f3e3b';
            ctx.fillText(String(li + 1).padStart(2, ' '), 14, y);
            let x = LEFT;
            for (const [kind, str] of CODE[li]) {
                if (budget <= 0) break;
                const part = str.slice(0, budget);
                budget -= part.length;
                ctx.fillStyle = COLORS[kind];
                ctx.fillText(part, x, y);
                x += ctx.measureText(part).width;
            }
            cx = x; cy = y;
            if (budget <= 0) break;
            budget -= 1;
            y += LH;
            if (budget <= 0) { cx = LEFT; cy = y; break; }
        }
        if (cursorOn) { ctx.fillStyle = '#eabe7c'; ctx.fillRect(cx + 2, cy - 24, 3, 30); }
        // status bar
        ctx.fillStyle = '#1a1b1d'; ctx.fillRect(0, H - 36, W, 36);
        ctx.fillStyle = '#807e79'; ctx.font = '500 17px "Public Sans", system-ui, sans-serif';
        ctx.fillText('main   ·   C#   ·   Unity 6', 20, H - 12);
        ctx.fillText('Ln ' + Math.min(CODE.length, ((cy - TOP) / LH | 0) + 1) + '   UTF-8', W - 170, H - 12);
        tex.needsUpdate = true;
    }

    let typed = 0, hold = 0, blink = 0;
    return {
        tex,
        update(dt, animate) {
            if (!animate) { if (last !== 'static') { draw(total, false); last = 'static'; } return; }
            blink += dt;
            if (typed < total) typed = Math.min(total, typed + dt * 30);
            else if ((hold += dt) > 6) { typed = 0; hold = 0; }
            const on = (blink * 1.6 | 0) % 2 === 0;
            const key = (typed | 0) + ':' + on;
            if (key !== last) { last = key; draw(typed, on); }
        },
        redraw() { last = ''; },
    };
}

function shadowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.55)');
    r.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}

export function initHero({ canvas, container, reducedMotion, lite, onReady }) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const disposables = [];
    const T = (o) => { disposables.push(o); return o; };

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
    scene.environment = env;
    disposables.push(env);
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Studio lighting: warm key, cool-neutral fill, soft white rim
    const key = new THREE.DirectionalLight(0xfff3e2, 1.6); key.position.set(3, 5, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe9eef5, 0.5); fill.position.set(-4, 2, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(-2, 3, -5); scene.add(rim);

    /* ---------- Materials ---------- */
    const aluminium = T(new THREE.MeshPhysicalMaterial({ color: 0xbfc0c2, metalness: 1, roughness: 0.34, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 1.1 }));
    const aluminiumDark = T(new THREE.MeshStandardMaterial({ color: 0x8e8f92, metalness: 1, roughness: 0.42 }));
    const keyMat = T(new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.1, roughness: 0.6 }));
    const well = T(new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.6, roughness: 0.5 }));
    const padMat = T(new THREE.MeshPhysicalMaterial({ color: 0xb3b4b7, metalness: 0.9, roughness: 0.22, clearcoat: 0.6 }));
    const bezelMat = T(new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.2, roughness: 0.35 }));
    const hingeMat = T(new THREE.MeshStandardMaterial({ color: 0x2c2d30, metalness: 0.8, roughness: 0.4 }));

    /* ---------- Model (units ~ dm; 3.1 wide) ---------- */
    const W = 3.1, D = 2.15, BASE_H = 0.075, LID_T = 0.045, LID_H = 2.02;
    const laptop = new THREE.Group();
    const rig = new THREE.Group();
    rig.add(laptop);
    scene.add(rig);

    // base
    const base = new THREE.Mesh(T(new RoundedBoxGeometry(W, BASE_H, D, 6, 0.035)), aluminium);
    base.position.y = BASE_H / 2;
    laptop.add(base);

    // keyboard well (slightly recessed darker plate)
    const wellMesh = new THREE.Mesh(T(new RoundedBoxGeometry(W * 0.87, 0.004, 1.06, 2, 0.002)), well);
    wellMesh.position.set(0, BASE_H + 0.001, -0.29);
    laptop.add(wellMesh);

    // keys: function row, 4 letter rows, bottom row with space bar
    const keyGeo = T(new RoundedBoxGeometry(1, 1, 1, 2, 0.08));
    const layout = [];
    const kw = 0.168, gap = 0.024, rowZ0 = -0.78;
    const rows = [
        { n: 14, h: 0.09 },
        { n: 14, h: 0.155 }, { n: 14, h: 0.155 }, { n: 13, h: 0.155, wide: [12, 1.6] }, { n: 12, h: 0.155, wide: [0, 1.45, 11, 1.95] },
    ];
    let z = rowZ0;
    const rowW = W * 0.84;
    rows.forEach((row) => {
        const widths = new Array(row.n).fill(1);
        if (row.wide) for (let i = 0; i < row.wide.length; i += 2) widths[row.wide[i]] = row.wide[i + 1];
        const unit = (rowW - gap * (row.n - 1)) / widths.reduce((a, b) => a + b, 0);
        let x = -rowW / 2;
        widths.forEach((w) => { layout.push({ x: x + (unit * w) / 2, z: z + row.h / 2, w: unit * w, d: row.h }); x += unit * w + gap; });
        z += row.h + gap;
    });
    // bottom row: modifiers + space bar
    {
        const h = 0.155, widths = [1, 1, 1, 1.25, 5.2, 1.25, 1, 1, 1];
        const unit = (rowW - gap * (widths.length - 1)) / widths.reduce((a, b) => a + b, 0);
        let x = -rowW / 2;
        widths.forEach((w) => { layout.push({ x: x + (unit * w) / 2, z: z + h / 2, w: unit * w, d: h }); x += unit * w + gap; });
    }
    const keys = new THREE.InstancedMesh(keyGeo, keyMat, layout.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    layout.forEach((k, i) => {
        p.set(k.x, BASE_H + 0.012, k.z); s.set(k.w, 0.018, k.d);
        keys.setMatrixAt(i, m4.compose(p, q, s));
    });
    laptop.add(keys);

    // trackpad
    const pad = new THREE.Mesh(T(new RoundedBoxGeometry(1.18, 0.004, 0.72, 3, 0.002)), padMat);
    pad.position.set(0, BASE_H + 0.001, 0.62);
    laptop.add(pad);

    // front lip notch
    const notch = new THREE.Mesh(T(new THREE.BoxGeometry(0.5, 0.02, 0.02)), aluminiumDark);
    notch.position.set(0, BASE_H - 0.01, D / 2 + 0.002);
    laptop.add(notch);

    // hinge barrel
    const hinge = new THREE.Mesh(T(new THREE.CylinderGeometry(0.04, 0.04, W * 0.8, 24)), hingeMat);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, BASE_H + 0.012, -D / 2 + 0.03);
    laptop.add(hinge);

    // lid (modelled upright; pivot at hinge)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, BASE_H + 0.032, -D / 2 + 0.03);
    laptop.add(lidPivot);
    const lid = new THREE.Mesh(T(new RoundedBoxGeometry(W, LID_H, LID_T, 6, 0.03)), aluminium);
    lid.position.set(0, LID_H / 2, -LID_T / 2);
    lidPivot.add(lid);
    const bezel = new THREE.Mesh(T(new RoundedBoxGeometry(W - 0.05, LID_H - 0.05, 0.004, 4, 0.002)), bezelMat);
    bezel.position.set(0, LID_H / 2, 0.003);
    lidPivot.add(bezel);
    const screen = makeScreen();
    disposables.push(screen.tex);
    const dispW = W - 0.2, dispH = dispW * (800 / 1280);
    const display = new THREE.Mesh(T(new THREE.PlaneGeometry(dispW, dispH)), T(new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false })));
    display.position.set(0, LID_H / 2 + 0.02, 0.0065);
    lidPivot.add(display);
    // glass: very faint reflective layer over the display
    const glass = new THREE.Mesh(T(new THREE.PlaneGeometry(W - 0.06, LID_H - 0.06)), T(new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.12, envMapIntensity: 1.4 })));
    glass.position.set(0, LID_H / 2, 0.0075);
    lidPivot.add(glass);
    // camera dot
    const cam = new THREE.Mesh(T(new THREE.CircleGeometry(0.012, 16)), T(new THREE.MeshBasicMaterial({ color: 0x1d2228 })));
    cam.position.set(0, LID_H - 0.045, 0.0068);
    lidPivot.add(cam);

    // soft contact shadow
    const shadow = new THREE.Mesh(T(new THREE.PlaneGeometry(W * 1.6, D * 1.6)), T(new THREE.MeshBasicMaterial({ map: T(shadowTexture()), transparent: true, depthWrite: false })));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.002;
    laptop.add(shadow);

    // centre the model around the origin
    laptop.position.set(0, -0.75, 0.15);

    const LID_OPEN = -0.3;                 // slight lean back
    const LID_CLOSED = Math.PI / 2 - 0.012; // lying on the keyboard
    lidPivot.rotation.x = reducedMotion ? LID_OPEN : LID_CLOSED;

    /* ---------- Framing ---------- */
    const RADIUS = 1.85; // framing radius around the open laptop
    function resize() {
        const w = container.clientWidth, h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const dist = RADIUS / Math.sin(Math.min(vFov, hFov) / 2);
        camera.position.set(0, dist * 0.32, dist * 0.95);
        camera.lookAt(0, 0.05, 0);
        camera.updateProjectionMatrix();
        if (reducedMotion) render();
    }

    /* ---------- Interaction ---------- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const drag = { active: false, startX: 0, startRot: 0, rot: 0, target: 0 };
    const onMove = (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
        if (drag.active) drag.target = drag.startRot + (e.clientX - drag.startX) * 0.008;
    };
    const onDown = (e) => {
        if (e.pointerType === 'touch') return; // keep vertical page scroll on phones
        drag.active = true; drag.startX = e.clientX; drag.startRot = drag.target;
        canvas.setPointerCapture(e.pointerId);
    };
    const onUp = () => { drag.active = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    let scrollP = 0;
    const onScroll = () => { scrollP = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight || 1))); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Loop ---------- */
    let introAt = 0, introStarted = reducedMotion, raf = 0, running = false, lastT = 0;
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function render() { renderer.render(scene, camera); }

    function frame(now) {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - (lastT || now)) / 1000);
        lastT = now;

        // lid opens over 1.8s (wall-clock, so slow devices still finish)
        if (introStarted) {
            introAt ||= now;
            const t = Math.min(1, (now - introAt) / 1800);
            lidPivot.rotation.x = THREE.MathUtils.lerp(LID_CLOSED, LID_OPEN, easeInOut(t));
        }

        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
        if (!drag.active) drag.target *= 0.96;             // ease back to the resting angle
        drag.rot += (drag.target - drag.rot) * 0.12;

        rig.rotation.y = -0.42 + pointer.x * 0.18 + drag.rot + scrollP * 0.35;
        rig.rotation.x = pointer.y * 0.05;
        rig.position.y = Math.sin(now * 0.0008) * 0.03;

        screen.update(dt, true);
        render();
    }
    function start() { if (running || reducedMotion) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !document.hidden) start(); else stop(); });
    io.observe(container);
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVis);

    if (reducedMotion) {
        rig.rotation.set(0, -0.42, 0);
        screen.update(0, false);
        render();
    } else {
        start();
    }
    // fonts used on the screen may arrive after the first draw
    document.fonts && document.fonts.ready.then(() => { screen.redraw(); if (reducedMotion) { screen.update(0, false); render(); } });

    onReady && onReady();

    function destroy() {
        stop(); ro.disconnect(); io.disconnect();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('visibilitychange', onVis);
        disposables.forEach((d) => d && d.dispose && d.dispose());
        keys.dispose();
        renderer.dispose();
    }
    window.addEventListener('pagehide', destroy, { once: true });

    return { playIntro() { introStarted = true; }, destroy };
}
