/* ==========================================================================
   Hero 3D scene — a floating developer workstation.
   A procedurally built laptop whose lid opens on load, with a live-typing
   C# editor on its screen, orbited by objects for web, games and 3D.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const CODE = [
    [['k', 'using '], ['t', 'UnityEngine'], ['p', ';']],
    [],
    [['k', 'public class '], ['t', 'Rayyan'], ['p', ' : '], ['t', 'MonoBehaviour']],
    [['p', '{']],
    [['p', '    '], ['k', 'public string'], ['p', '[] crafts = {']],
    [['p', '        '], ['s', '"Full-Stack Web"'], ['p', ', '], ['s', '"Unity Games"'], ['p', ',']],
    [['p', '        '], ['s', '"Blender 3D"']],
    [['p', '    };']],
    [],
    [['p', '    '], ['k', 'void '], ['f', 'Start'], ['p', '()']],
    [['p', '    {']],
    [['p', '        '], ['f', 'Build'], ['p', '(Web.Laravel, Web.React, Web.NextJs);']],
    [['p', '        '], ['f', 'Forge'], ['p', '(World.Unity, Art.Blender);']],
    [['p', '    }']],
    [],
    [['p', '    '], ['c', '// ideas in, worlds out']],
    [['p', '    '], ['k', 'void '], ['f', 'Update'], ['p', '() => '], ['f', 'Ship'], ['p', '(ideas, quality: '], ['n', '11'], ['p', ');']],
    [['p', '}']],
];
const COLORS = { k: '#c39bff', t: '#7fd6ff', p: '#d9d6cf', s: '#f0c486', f: '#7ef0c4', c: '#6b6a78', n: '#ff9b7a' };

function makeScreen() {
    const W = 1024, H = 640;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const total = CODE.reduce((n, line) => n + line.reduce((m, [, s]) => m + s.length, 0) + 1, 0);
    let typed = 0, hold = 0, blink = 0, last = -1;

    function draw(cursorOn) {
        // window chrome
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#101018'); g.addColorStop(1, '#0a0a10');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#16161f'; ctx.fillRect(0, 0, W, 44);
        ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(26 + i * 22, 22, 7, 0, Math.PI * 2); ctx.fill(); });
        ctx.font = '500 17px "Geist Mono", ui-monospace, monospace';
        ctx.fillStyle = '#1f1f2b'; ctx.fillRect(110, 8, 150, 36);
        ctx.fillStyle = '#e8c38a'; ctx.fillText('Rayyan.cs', 132, 32);
        ctx.fillStyle = '#6b6a78'; ctx.fillText('app.tsx', 290, 32); ctx.fillText('scene.blend', 390, 32);
        // gutter
        ctx.fillStyle = '#0d0d14'; ctx.fillRect(0, 44, 58, H - 44);

        ctx.font = '400 21px "Geist Mono", ui-monospace, monospace';
        let budget = Math.floor(typed), y = 84, cx = 74, cy = 84;
        for (let li = 0; li < CODE.length; li++) {
            ctx.fillStyle = '#3c3c4a';
            ctx.fillText(String(li + 1).padStart(2, ' '), 14, y);
            let x = 74;
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
            budget -= 1; // newline
            y += 30;
            if (budget <= 0) { cx = 74; cy = y; break; }
        }
        if (cursorOn) { ctx.fillStyle = '#e8c38a'; ctx.fillRect(cx + 2, cy - 19, 11, 24); }
        // status bar
        ctx.fillStyle = '#e8c38a'; ctx.fillRect(0, H - 28, W, 28);
        ctx.fillStyle = '#1a1408'; ctx.font = '500 15px "Geist Mono", ui-monospace, monospace';
        ctx.fillText('● main   C#   Unity 6   UTF-8', 16, H - 9);
        ctx.fillText('Ln ' + Math.min(CODE.length, ((cy - 84) / 30 | 0) + 1) + '  ·  ready to ship', W - 280, H - 9);
        tex.needsUpdate = true;
    }

    function update(dt, animate) {
        if (!animate) { if (last !== -2) { typed = total; draw(false); last = -2; } return; }
        blink += dt;
        if (typed < total) {
            typed = Math.min(total, typed + dt * 34);
        } else {
            hold += dt;
            if (hold > 5) { typed = 0; hold = 0; }
        }
        const key = (typed | 0) * 2 + ((blink * 2 | 0) % 2);
        if (key !== last) { last = key; draw((blink * 2 | 0) % 2 === 0); }
    }
    draw(false);
    return { tex, update };
}

function radialTexture(inner, outer) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export function initHero({ canvas, section, reducedMotion, lite, onReady }) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        return null;
    }
    const DPR_CAP = lite ? 1.25 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.2, 11);

    // Lights
    const key = new THREE.DirectionalLight(0xffe2b8, 2.2); key.position.set(4, 6, 5); scene.add(key);
    const rim = new THREE.PointLight(0x8e96ff, 40, 20, 2); rim.position.set(-4, 2, -3); scene.add(rim);
    const fill = new THREE.PointLight(0x6ff0c6, 12, 14, 2); fill.position.set(3, -2, 3); scene.add(fill);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const disposables = [envTex];
    const track = (o) => { disposables.push(o); return o; };

    // ---------- Laptop ----------
    const rig = new THREE.Group();      // scroll/mouse transforms
    const laptop = new THREE.Group();   // floating bob
    rig.add(laptop); scene.add(rig);

    const alu = track(new THREE.MeshStandardMaterial({ color: 0x2b2c33, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 }));
    const dark = track(new THREE.MeshStandardMaterial({ color: 0x0b0b0f, metalness: 0.3, roughness: 0.5 }));

    const base = new THREE.Mesh(track(new RoundedBoxGeometry(3.4, 0.12, 2.3, 4, 0.05)), alu);
    laptop.add(base);

    // keys (instanced)
    const keyGeo = track(new RoundedBoxGeometry(0.19, 0.03, 0.17, 2, 0.02));
    const keyMat = track(new THREE.MeshStandardMaterial({ color: 0x141419, metalness: 0.2, roughness: 0.55 }));
    const cols = 13, rows = 5;
    const keys = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        m.makeTranslation(-1.38 + c * 0.23, 0.07, -0.92 + r * 0.22);
        keys.setMatrixAt(i++, m);
    }
    laptop.add(keys);
    const pad = new THREE.Mesh(track(new RoundedBoxGeometry(1.1, 0.01, 0.62, 2, 0.005)), track(new THREE.MeshStandardMaterial({ color: 0x34353d, metalness: 0.7, roughness: 0.25 })));
    pad.position.set(0, 0.062, 0.7);
    laptop.add(pad);

    // glowing edge strip
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(3.0, 0.012, 0.012)), track(new THREE.MeshBasicMaterial({ color: 0xe8c38a })));
    strip.position.set(0, -0.02, 1.152);
    laptop.add(strip);

    // lid with hinge at back edge
    // The lid is modelled upright; rotation.x = +PI/2 folds it flat over the keyboard (closed).
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.11, -1.13);
    laptop.add(hinge);
    const lid = new THREE.Mesh(track(new RoundedBoxGeometry(3.4, 2.2, 0.08, 4, 0.04)), alu);
    lid.position.set(0, 1.1, 0);
    hinge.add(lid);
    const bezel = new THREE.Mesh(track(new THREE.PlaneGeometry(3.28, 2.08)), dark);
    bezel.position.set(0, 1.1, 0.041);
    hinge.add(bezel);
    const screen = makeScreen();
    disposables.push(screen.tex);
    const display = new THREE.Mesh(track(new THREE.PlaneGeometry(3.1, 1.94)), track(new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false })));
    display.position.set(0, 1.1, 0.043);
    hinge.add(display);
    // screen light spill
    const spill = new THREE.PointLight(0xe8c38a, 3, 4, 2);
    spill.position.set(0, 1.1, 0.8);
    hinge.add(spill);

    const LID_OPEN = -0.32, LID_CLOSED = Math.PI / 2 - 0.02;
    hinge.rotation.x = reducedMotion ? LID_OPEN : LID_CLOSED;

    // ---------- Orbiting objects ----------
    const orbiters = new THREE.Group();
    rig.add(orbiters);

    const d20 = new THREE.Mesh(
        track(new THREE.IcosahedronGeometry(0.55, 0)),
        track(new THREE.MeshPhysicalMaterial({ color: 0xe8c38a, metalness: 0.9, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, flatShading: true }))
    );
    d20.position.set(2.0, 1.55, 0.9);
    orbiters.add(d20);

    const knot = new THREE.Mesh(
        track(new THREE.TorusKnotGeometry(0.36, 0.12, lite ? 90 : 160, 18)),
        track(new THREE.MeshPhysicalMaterial({ color: 0xbfc3ff, metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6 }))
    );
    knot.position.set(-0.5, 2.25, -2.0);
    orbiters.add(knot);

    const cubeGeo = track(new THREE.BoxGeometry(0.7, 0.7, 0.7));
    const wire = new THREE.LineSegments(track(new THREE.EdgesGeometry(cubeGeo)), track(new THREE.LineBasicMaterial({ color: 0x6ff0c6, transparent: true, opacity: 0.9 })));
    const cubeInner = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.34, 0.34)), track(new THREE.MeshStandardMaterial({ color: 0x6ff0c6, emissive: 0x2a8f72, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.2 })));
    const cube = new THREE.Group(); cube.add(wire); cube.add(cubeInner);
    cube.position.set(2.1, -0.95, 1.1);
    orbiters.add(cube);

    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.42, 0.035, 16, 80)), track(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15 })));
    ring.position.set(-2.0, 0.35, -1.0);
    orbiters.add(ring);

    const floaters = [
        { o: d20, speed: 0.9, amp: 0.18, phase: 0, rot: [0.4, 0.6] },
        { o: knot, speed: 0.7, amp: 0.22, phase: 1.3, rot: [0.3, 0.5] },
        { o: cube, speed: 1.1, amp: 0.15, phase: 2.1, rot: [0.5, 0.8] },
        { o: ring, speed: 0.8, amp: 0.2, phase: 3.2, rot: [0.9, 0.3] },
    ];
    floaters.forEach((f) => { f.y = f.o.position.y; f.o.scale.setScalar(reducedMotion ? 1 : 0.001); });

    // ---------- Ground glow + contact shadow ----------
    const glow = new THREE.Mesh(
        track(new THREE.PlaneGeometry(9, 9)),
        track(new THREE.MeshBasicMaterial({ map: track(radialTexture('rgba(232,195,138,0.38)', 'rgba(232,195,138,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    );
    glow.rotation.x = -Math.PI / 2; glow.position.y = -1.25;
    rig.add(glow);
    const shadow = new THREE.Mesh(
        track(new THREE.PlaneGeometry(4.6, 3.4)),
        track(new THREE.MeshBasicMaterial({ map: track(radialTexture('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)')), transparent: true, depthWrite: false }))
    );
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.2;
    rig.add(shadow);

    // ---------- Particles ----------
    const COUNT = lite ? 260 : 650;
    const pos = new Float32Array(COUNT * 3);
    for (let p = 0; p < COUNT; p++) {
        const r = 4 + Math.random() * 9, a = Math.random() * Math.PI * 2;
        pos[p * 3] = Math.cos(a) * r;
        pos[p * 3 + 1] = (Math.random() - 0.4) * 9;
        pos[p * 3 + 2] = Math.sin(a) * r - 3;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dots = new THREE.Points(pGeo, track(new THREE.PointsMaterial({
        size: 0.035, color: 0xf3e6cf, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    })));
    scene.add(dots);

    // ---------- Layout ----------
    const layout = { x: 2.2, y: -0.15, s: 1, look: 0, lookY: 0.3 };
    function resize() {
        const w = section.clientWidth, h = section.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const narrow = w < 860;
        camera.fov = narrow ? 42 : 32;
        camera.updateProjectionMatrix();
        if (narrow) {
            // place the workstation in the top stage area (~22% from the top of a tall hero)
            const visH = Math.tan(THREE.MathUtils.degToRad(21)) * 11;      // half visible height at origin
            const topFrac = Math.min(0.32, (window.innerHeight * 0.3) / h); // where its centre should sit
            layout.x = 0.3; layout.look = 0.4;
            layout.y = layout.look + (1 - 2 * topFrac) * visH - 0.4;
            layout.s = Math.min(1, w / 520) * 0.78;
            layout.lookY = 0.4;
        }
        else { layout.x = Math.min(2.7, 1.5 + (w / h - 1) * 1.1); layout.y = -0.2; layout.s = w < 1200 ? 0.8 : 0.9; layout.look = 0; layout.lookY = layout.y * 0.6 + 0.4; }
    }
    resize();

    // ---------- Input ----------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    let scrollP = 0;
    const onScroll = () => {
        const h = section.offsetHeight || window.innerHeight;
        scrollP = Math.min(1, Math.max(0, window.scrollY / h));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    // ---------- Intro animation (time based) ----------
    let intro = reducedMotion ? 1 : 0;
    let introStarted = reducedMotion;
    let introAt = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // ---------- Loop ----------
    let running = false, visible = true, raf = 0;
    const clock = new THREE.Clock();
    let elapsed = 0;

    function frame() {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        if (introStarted && intro < 1) {
            introAt ||= performance.now();
            intro = Math.min(1, (performance.now() - introAt) / 2600);
        }

        // pointer smoothing
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;

        // intro: rise + lid open
        const rise = ease(Math.min(1, intro / 0.55));
        const lidT = easeInOut(Math.min(1, Math.max(0, (intro - 0.25) / 0.6)));
        hinge.rotation.x = THREE.MathUtils.lerp(LID_CLOSED, LID_OPEN, lidT);
        const orbT = ease(Math.min(1, Math.max(0, (intro - 0.45) / 0.55)));
        floaters.forEach((f, k) => f.o.scale.setScalar(Math.max(0.001, ease(Math.min(1, Math.max(0, orbT * 1.3 - k * 0.08))))));

        // rig transforms: layout + pointer + scroll
        const sp = scrollP;
        rig.position.x = layout.x + pointer.x * 0.15 - sp * (layout.x * 0.6);
        rig.position.y = layout.y - 1.6 * (1 - rise) + sp * 1.6;
        rig.position.z = -sp * 2.5;
        rig.scale.setScalar(layout.s * (1 - sp * 0.15));
        rig.rotation.y = -0.55 + pointer.x * 0.32 + sp * 1.1 + (1 - rise) * 0.6;
        rig.rotation.x = 0.2 + pointer.y * 0.12 + sp * 0.25;

        laptop.position.y = Math.sin(elapsed * 0.9) * 0.08;
        laptop.rotation.z = Math.sin(elapsed * 0.6) * 0.015;

        floaters.forEach((f) => {
            f.o.position.y = f.y + Math.sin(elapsed * f.speed + f.phase) * f.amp;
            f.o.rotation.x += dt * f.rot[0];
            f.o.rotation.y += dt * f.rot[1];
        });
        orbiters.rotation.y = Math.sin(elapsed * 0.15) * 0.25;
        dots.rotation.y = elapsed * 0.02 + pointer.x * 0.05;

        camera.position.x = pointer.x * 0.35;
        camera.position.y = 1.2 - pointer.y * 0.25;
        camera.lookAt(layout.look, layout.lookY, 0);

        screen.update(dt, true);
        renderer.render(scene, camera);
    }

    function start() {
        if (running || reducedMotion) return;
        running = true; clock.getDelta(); frame();
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function renderStatic() {
        screen.update(0, false);
        floaters.forEach((f) => f.o.scale.setScalar(1));
        rig.position.set(layout.x, layout.y, 0);
        rig.scale.setScalar(layout.s);
        rig.rotation.set(0.2, -0.55, 0);
        camera.lookAt(layout.look, layout.lookY, 0);
        renderer.render(scene, camera);
    }

    const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !document.hidden) start(); else stop();
    }, { threshold: 0 });
    io.observe(section);
    const onVis = () => { if (document.hidden) stop(); else if (visible) start(); };
    document.addEventListener('visibilitychange', onVis);

    if (reducedMotion) {
        renderStatic();
        ro.disconnect();
        const ro2 = new ResizeObserver(() => { resize(); renderStatic(); });
        ro2.observe(section);
    } else {
        start();
        // safety: never leave the laptop closed if the page intro signal is missed
        setTimeout(() => { introStarted = true; }, 4500);
    }
    onReady && onReady();

    function destroy() {
        stop();
        io.disconnect(); ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('visibilitychange', onVis);
        disposables.forEach((d) => d && d.dispose && d.dispose());
        keys.dispose();
        renderer.dispose();
    }
    window.addEventListener('pagehide', destroy, { once: true });

    return {
        playIntro() { introStarted = true; },
        get progress() { return intro; },
        destroy,
    };
}
