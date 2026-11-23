/* ==========================================================================
   Rayyan Ahmed — Portfolio app
   Preloader, smooth scroll, navigation, cursor, reveals, project gallery,
   testimonials, contact form, and lazy-loaded WebGL scenes.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Game & Blender media. Add your own Unity builds, gameplay videos and
   Blender renders here — the "Builds & renders" gallery appears automatically.
   Example:
   { type: 'image', src: 'images/game/my-level.jpg', title: 'Forest level', text: 'Unity 3D · URP' },
   { type: 'video', src: 'images/game/gameplay.mp4', poster: 'images/game/poster.jpg', title: 'Gameplay', text: 'Character controller' },
   -------------------------------------------------------------------------- */
const GAME_SHOWCASE = [];

const html = document.documentElement;
html.classList.remove('no-js');

// Always build the page from the top: restoring an old scroll position mid-load
// makes ScrollTrigger measure the pinned project gallery in the wrong place.
const initialHash = location.hash;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isNarrow = () => window.innerWidth < 860;
const lite = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /Mobi|Android/i.test(navigator.userAgent);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const hasGSAP = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const animate = !prefersReduced && hasGSAP();
if (animate) {
    html.classList.add('anim');
    gsap.registerPlugin(ScrollTrigger);
    // ScrollTrigger manages scroll restoration itself: keep it manual so a reload starts at the top
    ScrollTrigger.clearScrollMemory('manual');
}

function webglAvailable() {
    try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
}
const WEBGL = webglAvailable();
if (!WEBGL) html.classList.add('no-webgl');

/* ---------------- Smooth scroll (Lenis) ---------------- */
let lenis = null;
if (!prefersReduced && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (animate) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    } else {
        const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
    }
}
function scrollToTarget(target) {
    const el = typeof target === 'string' ? (target === '#top' || target === '#home' ? document.body : $(target)) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el === document.body ? 0 : el, { offset: 0, duration: 1.4 });
    else (el === document.body ? window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }) : el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' }));
}

/* ---------------- Anchor links ---------------- */
document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2 && id !== '#') return;
    if (id === '#') return;
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(id);
    if (id !== '#top' && id !== '#home') history.replaceState(null, '', id);
    else history.replaceState(null, '', location.pathname);
    // move focus for keyboard / screen reader users
    if (target !== document.body) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    }
});

/* ---------------- Mobile menu ---------------- */
const toggle = $('.menu-toggle');
const menu = $('#mobile-menu');
function openMenu() {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.menu-toggle__label').textContent = 'Close';
    lenis && lenis.stop();
    document.body.style.overflow = 'hidden';
    $('a', menu).focus();
}
function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.menu-toggle__label').textContent = 'Menu';
    lenis && lenis.start();
    document.body.style.overflow = '';
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 400);
}
toggle && toggle.addEventListener('click', () => (toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
window.addEventListener('resize', () => { if (window.innerWidth > 1100) closeMenu(); });

/* ---------------- Header behaviour + active section ---------------- */
const header = $('.site-header');
let lastY = window.scrollY;
function onScrollHeader() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = toggle.getAttribute('aria-expanded') === 'true';
    header.classList.toggle('is-hidden', !menuOpen && y > lastY && y > window.innerHeight * 0.8);
    lastY = y;
}
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

const navLinks = $$('.nav__link');
const mobileLinks = $$('.mobile-menu__list a');
const indicator = $('.nav__indicator');
function moveIndicator(link) {
    if (!link || !indicator || !link.offsetParent) return;
    const navRect = link.closest('.nav').getBoundingClientRect();
    const r = link.getBoundingClientRect();
    indicator.style.width = r.width + 'px';
    indicator.style.transform = `translateX(${r.left - navRect.left}px)`;
    indicator.classList.add('is-ready');
}
function setActive(id) {
    navLinks.forEach((l) => {
        const on = l.getAttribute('href') === '#' + id;
        l.classList.toggle('is-active', on);
        if (on) { l.setAttribute('aria-current', 'true'); moveIndicator(l); } else l.removeAttribute('aria-current');
    });
    mobileLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + id));
}
const sections = $$('.section-target');
const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => spy.observe(s));
window.addEventListener('resize', () => moveIndicator($('.nav__link.is-active')));
document.fonts && document.fonts.ready.then(() => moveIndicator($('.nav__link.is-active')));

/* ---------------- Marquee duplicate for seamless loop ---------------- */
const mq = $('.marquee__track');
if (mq) mq.innerHTML += mq.innerHTML;

/* ---------------- Split headings into words ---------------- */
$$('[data-split]').forEach((el) => {
    const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
            if (child.nodeType === 3) {
                const parts = child.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                parts.forEach((p) => {
                    if (!p) return;
                    if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
                    const w = document.createElement('span'); w.className = 'word';
                    const inner = document.createElement('span'); inner.textContent = p;
                    w.appendChild(inner); frag.appendChild(w);
                });
                child.replaceWith(frag);
            } else if (child.nodeType === 1 && !child.classList.contains('word')) {
                walk(child);
            }
        });
    };
    walk(el);
});

/* ---------------- Custom cursor ---------------- */
if (finePointer && !prefersReduced) {
    html.classList.add('has-cursor');
    const cursor = $('.cursor');
    const ring = $('.cursor__ring');
    const dot = $('.cursor__dot');
    const label = $('.cursor__label');
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', (e) => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate(${mx}px, ${my}px)`;
        cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    (function loop() {
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        ring.style.transform = `translate(${rx}px, ${ry}px)`;
        requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', (e) => {
        const lab = e.target.closest('[data-cursor]');
        const hov = e.target.closest('a, button, [data-spotlight], input, textarea, select, .voices__track');
        cursor.classList.toggle('is-label', !!lab);
        label.textContent = lab ? lab.dataset.cursor : '';
        cursor.classList.toggle('is-hover', !lab && !!hov);
        cursor.classList.toggle('is-hidden', !!e.target.closest('.arena__canvas'));
    });
}

/* ---------------- Magnetic buttons ---------------- */
if (finePointer && !prefersReduced) {
    $$('[data-magnetic]').forEach((el) => {
        const strength = 0.32;
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) * strength;
            const y = (e.clientY - r.top - r.height / 2) * strength;
            el.style.transform = `translate(${x}px, ${y}px)`;
        });
        el.addEventListener('pointerleave', () => {
            el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
            el.style.transform = '';
            setTimeout(() => (el.style.transition = ''), 600);
        });
    });
}

/* ---------------- Spotlight tiles ---------------- */
$$('[data-spotlight]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
});

/* ---------------- Tilt ---------------- */
if (finePointer && !prefersReduced) {
    $$('[data-tilt]').forEach((wrap) => {
        const target = wrap.querySelector('.browser') || wrap;
        wrap.addEventListener('pointermove', (e) => {
            const r = wrap.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            target.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${y * -8}deg) translateZ(0)`;
        });
        wrap.addEventListener('pointerleave', () => { target.style.transform = ''; });
    });
}

/* ---------------- Testimonials ---------------- */
(function voices() {
    const track = $('.voices__track');
    if (!track) return;
    const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 14 : 400);
    $('.voices__prev').addEventListener('click', () => track.scrollBy({ left: -step() }));
    $('.voices__next').addEventListener('click', () => {
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        if (atEnd) track.scrollTo({ left: 0 }); else track.scrollBy({ left: step() });
    });
    track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step() }); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step() }); }
    });
})();

/* ---------------- Game media showcase (data driven) ---------------- */
(function showcase() {
    const wrap = $('.showcase');
    if (!wrap || !GAME_SHOWCASE.length) return;
    const grid = $('.showcase__grid', wrap);
    GAME_SHOWCASE.forEach((item) => {
        const li = document.createElement('li');
        const fig = document.createElement('figure');
        fig.className = 'showcase__item';
        let media;
        if (item.type === 'video') {
            media = document.createElement('video');
            Object.assign(media, { src: item.src, poster: item.poster || '', muted: true, loop: true, playsInline: true, controls: true, preload: 'none' });
        } else {
            media = document.createElement('img');
            Object.assign(media, { src: item.src, alt: item.title || '', loading: 'lazy', decoding: 'async' });
        }
        const cap = document.createElement('figcaption');
        const strong = document.createElement('strong');
        strong.textContent = item.title || '';
        cap.append(strong, document.createTextNode(item.text || ''));
        fig.append(media, cap); li.append(fig); grid.append(li);
    });
    wrap.hidden = false;
})();

/* ---------------- Contact form ---------------- */
(function contactForm() {
    const form = $('.form');
    if (!form) return;
    const status = $('.form__status', form);
    const btnText = $('.form__btn-text', form);
    const rules = {
        name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
        email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
        message: (v) => (v.trim().length >= 10 ? '' : 'A few more words, please (10+ characters).'),
    };
    function check(field) {
        const fn = rules[field.name];
        if (!fn) return true;
        const msg = fn(field.value);
        const wrap = field.closest('.field');
        const err = $('.field__error', wrap);
        wrap.classList.toggle('is-invalid', !!msg);
        err.textContent = msg;
        field.setAttribute('aria-invalid', msg ? 'true' : 'false');
        field.setAttribute('aria-describedby', err.id);
        return !msg;
    }
    Object.keys(rules).forEach((n) => {
        const f = form.elements[n];
        f.addEventListener('blur', () => f.value && check(f));
        f.addEventListener('input', () => f.closest('.field').classList.contains('is-invalid') && check(f));
    });

    form.addEventListener('reset', () => {
        $$('.field', form).forEach((w) => w.classList.remove('is-invalid'));
        $$('.field__error', form).forEach((e) => (e.textContent = ''));
        $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
        status.textContent = ''; status.className = 'form__status';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.className = 'form__status';
        const fields = Object.keys(rules).map((n) => form.elements[n]);
        const ok = fields.map(check).every(Boolean);
        if (!ok) {
            status.textContent = 'Please fix the highlighted fields.';
            status.classList.add('is-error');
            fields.find((f) => f.getAttribute('aria-invalid') === 'true').focus();
            return;
        }
        if (form.elements._gotcha.value) return; // bot

        const data = {
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            topic: form.elements.topic.value,
            message: form.elements.message.value.trim(),
        };
        const endpoint = form.dataset.endpoint;

        if (endpoint) {
            form.classList.add('is-sending');
            btnText.textContent = 'Sending…';
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error('Request failed');
                form.reset();
                status.textContent = 'Thanks! Your message is on its way — I\'ll get back to you soon.';
                status.classList.add('is-success');
            } catch (err) {
                status.textContent = 'Something went wrong sending your message. You can email me directly at devrayyan1@gmail.com.';
                status.classList.add('is-error');
            } finally {
                form.classList.remove('is-sending');
                btnText.textContent = 'Say Hello.';
            }
            return;
        }

        // No endpoint configured: open the visitor's email app with a pre-filled message.
        const to = form.dataset.mailto;
        const subject = encodeURIComponent(`${data.topic} — from ${data.name}`);
        const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`);
        window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        status.textContent = 'Your email app should open with the message ready to send. If nothing happens, email devrayyan1@gmail.com.';
        status.classList.add('is-success');
    });
})();

/* ---------------- Footer year ---------------- */
const yearEl = $('.footer__year');
if (yearEl) yearEl.textContent = String(Math.max(2026, new Date().getFullYear()));

/* ---------------- Scroll animations ---------------- */
function setupScrollAnimations() {
    if (!animate) return;

    // word reveals
    $$('[data-split]').forEach((el) => {
        gsap.to($$('.word > span', el), {
            yPercent: 0, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045,
            scrollTrigger: { trigger: el, start: 'top 85%' },
        });
    });
    // set split start state via GSAP for consistent transforms
    gsap.set('[data-split] .word > span', { yPercent: 105 });

    // generic reveals in batches
    gsap.set('[data-reveal]', { y: 40, opacity: 0 });
    ScrollTrigger.batch('[data-reveal]', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    });

    // counters
    $$('[data-count]').forEach((el) => {
        const end = parseInt(el.dataset.count, 10);
        const start = end > 1000 ? end - 12 : 0;
        const obj = { v: start };
        el.textContent = String(start);
        gsap.to(obj, {
            v: end, duration: 1.8, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%' },
            onUpdate: () => (el.textContent = String(Math.round(obj.v))),
        });
    });

    // timeline progress lines
    $$('.timeline').forEach((tl) => {
        const bar = document.createElement('span');
        bar.className = 'timeline__progress';
        tl.prepend(bar);
        gsap.to(bar, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } });
    });

    // portrait parallax
    const pimg = $('.portrait img');
    if (pimg) gsap.fromTo(pimg, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.portrait', start: 'top bottom', end: 'bottom top', scrub: true } });

    // hero content drifts away on scroll
    gsap.to('.hero__content', { yPercent: -18, opacity: 0.0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // big footer word
    gsap.from('.footer__big', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Horizontal project gallery (desktop)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
        const work = $('.work');
        const track = $('.work__track');
        work.classList.add('is-pinned');
        track.scrollLeft = 0;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tween = gsap.to(track, {
            x: () => -distance(), ease: 'none',
            scrollTrigger: {
                trigger: work, start: 'center center', end: () => '+=' + distance(),
                pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
            },
        });
        // subtle card parallax inside the moving track
        $$('.work-card__media img').forEach((img) => {
            gsap.fromTo(img, { xPercent: -4 }, {
                xPercent: 4, ease: 'none',
                scrollTrigger: { trigger: img.closest('.work-card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
            });
        });
        return () => { work.classList.remove('is-pinned'); gsap.set(track, { clearProps: 'transform' }); };
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    if (document.fonts) document.fonts.ready.then(refresh);
}

/* ---------------- WebGL: hero ---------------- */
let hero = null;
async function setupHero() {
    if (!WEBGL) return;
    try {
        const mod = await import('./hero-scene.js');
        hero = mod.initHero({
            canvas: $('.hero__canvas'),
            container: $('.hero__stage'),
            reducedMotion: prefersReduced,
            lite,
            onReady: () => html.classList.add('webgl-ready'),
        });
        // If the preloader already finished (slow network), start the intro now.
        if (!hero) html.classList.add('no-webgl');
        if (hero && html.classList.contains('is-loaded')) hero.playIntro();
    } catch (err) {
        console.warn('Hero 3D scene unavailable, using fallback.', err);
    }
}

/* ---------------- WebGL: game demo (lazy) ---------------- */
function setupGame() {
    const arena = $('.arena');
    if (!arena) return;
    if (!WEBGL) {
        arena.classList.add('no-webgl');
        $('.arena__msg', arena).textContent = 'This interactive demo needs WebGL, which isn\'t available in your browser.';
        return;
    }
    const btn = $('.arena__start', arena);
    let loading = null;
    const load = () => (loading ||= import('./game-demo.js').then((m) => m.initGame({ root: arena, lite })).catch((err) => {
        console.warn('Game demo failed to load', err);
        $('.arena__msg', arena).textContent = 'The demo could not load. Please refresh to try again.';
    }));
    // Load shortly before it scrolls into view
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '600px 0px' });
    io.observe(arena);
    // If user clicks before it loaded, start once ready
    btn.addEventListener('click', async function first() {
        btn.removeEventListener('click', first);
        const game = await load();
        if (game && !arena.classList.contains('is-playing')) btn.click();
    });
}

/* ---------------- WebGL: expertise models (lazy) ---------------- */
function setupExpertiseModels() {
    const canvases = $$('.tile__model');
    if (!canvases.length || !WEBGL) return;
    const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        import('./expertise-models.js')
            .then((m) => { if (!m.initExpertiseModels({ canvases, reducedMotion: prefersReduced })) html.classList.add('no-webgl'); })
            .catch((err) => { console.warn('Expertise models unavailable', err); canvases.forEach((c) => (c.style.display = 'none')); });
    }, { rootMargin: '600px 0px' });
    io.observe($('.bento'));
}

/* ---------------- Preloader + intro ---------------- */
function intro() {
    const pre = $('.preloader');
    const bar = $('.preloader__bar span');
    const count = $('.preloader__count');
    const done = () => {
        html.classList.add('is-loaded');
        hero && hero.playIntro();
        // re-measure now that fonts, images and the intro are settled, then honour #section links
        if (window.ScrollTrigger) ScrollTrigger.refresh();
        if (initialHash && initialHash.length > 1 && document.querySelector(initialHash)) setTimeout(() => scrollToTarget(initialHash), 150);
    };

    if (!animate) {
        pre && pre.remove();
        done();
        return;
    }

    const state = { p: 0 };
    let ready = false;
    const pageReady = new Promise((res) => {
        if (document.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true });
        setTimeout(res, 3500); // never block longer than this
    });

    const tl = gsap.timeline();
    tl.to(state, {
        p: 90, duration: 1.1, ease: 'power2.out',
        onUpdate: () => { bar.style.transform = `scaleX(${state.p / 100})`; count.textContent = Math.round(state.p); },
    });
    pageReady.then(() => {
        ready = true;
        gsap.timeline()
            .to(state, { p: 100, duration: 0.4, ease: 'power2.inOut', delay: tl.isActive() ? tl.duration() - tl.time() : 0, onUpdate: () => { bar.style.transform = `scaleX(${state.p / 100})`; count.textContent = Math.round(state.p); } })
            .to(pre, { yPercent: -100, duration: 1.0, ease: 'expo.inOut', onStart: done }, '+=0.1')
            .set(pre, { display: 'none' })
            .to('.hero [data-hero-line]', { y: 0, yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1 }, '-=0.55')
            .to('.hero [data-hero-in]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, '-=1.1')
            .fromTo('.site-header', { yPercent: -100 }, { yPercent: 0, duration: 1, ease: 'expo.out', clearProps: 'transform' }, '-=1.1');
    });
    gsap.set('.hero [data-hero-line]', { yPercent: 110 });
}

/* ---------------- Boot ---------------- */
setupScrollAnimations();
// Wait for the 3D hero (max 2.5s) so the reveal and the laptop intro play together.
Promise.race([setupHero(), new Promise((r) => setTimeout(r, 2500))]).finally(intro);
setupGame();
setupExpertiseModels();
