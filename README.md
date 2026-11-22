# Rayyan Ahmed — Portfolio

A static, no-build portfolio: plain HTML + CSS + ES modules. Open it through any static server.

## Run locally

```powershell
npx serve .
```

(Any static server works. Opening `index.html` straight from disk won't load the ES modules, because browsers block module imports over `file://`.)

## Structure

| File | What it does |
| --- | --- |
| `index.html` | All content: hero, about, skills, projects, game lab, experience, testimonials, contact, footer |
| `css/main.css` | Design system (tokens at the top), layout, responsive rules, reduced-motion rules |
| `js/app.js` | Preloader, Lenis smooth scroll, navigation, cursor, magnetic buttons, GSAP scroll animations, project gallery, testimonials, contact form, lazy-loading the 3D modules |
| `js/hero-scene.js` | Three.js hero: a procedural laptop whose lid opens, with a live-typing C# editor on its screen and objects orbiting it |
| `js/game-demo.js` | "Orb Runner", the playable Three.js demo in the Game Lab (character controller, physics, NPC drone AI, collectibles) |
| `images/work/` | Optimised project screenshots and the portrait |

Libraries are loaded from CDNs with pinned versions: Three.js 0.160.0 (jsDelivr), GSAP 3.12.5 + ScrollTrigger (cdnjs) and Lenis 1.1.13 (unpkg). If any of them fails to load, the site still works: content stays visible and the hero falls back to a CSS gradient.

The old template files (`css/styles.css`, `css/vendor.css`, `js/main.js`, `js/plugins.js`, `styles.html`, `images/portfolio/`) are kept for reference but are no longer loaded.

## Common edits

- **Add a project:** copy one `<li class="work-card">` block in `index.html`, then add a 16:10 screenshot to `images/work/`.
- **Add Unity builds, gameplay videos or Blender renders:** add entries to `GAME_SHOWCASE` at the top of `js/app.js`. The "Builds & renders" gallery shows up automatically once the list isn't empty.
- **Contact form delivery:** create a free form at [formspree.io](https://formspree.io) and paste its endpoint into `data-endpoint="…"` on the `<form>` in `index.html`. While `data-endpoint` is empty, the form validates the input and then opens the visitor's email app with the message already filled in, addressed to `devrayyan1@gmail.com`.
- **Social preview / SEO:** once the site is deployed, replace `https://yourdomain.com` in the `<head>` meta tags and the JSON-LD with your real portfolio domain.

## Performance and accessibility

- The WebGL scenes cap the device pixel ratio, use lighter settings on mobile and low-memory devices, pause when they're off-screen or the tab is hidden, and free their GPU resources on `pagehide`.
- The game module only loads when its section gets near the viewport.
- With `prefers-reduced-motion`, smooth scroll, the cursor effects, reveal animations and the marquee are all switched off, and the hero shows a single static 3D frame.
- Also included: a skip link, keyboard-focusable controls, visible focus styles, `aria-live` form feedback, and a mobile menu with Escape-to-close.
