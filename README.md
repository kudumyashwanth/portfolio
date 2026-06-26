# Kudum Yashwanth — Portfolio

An Active-Theory-style, single-page interactive portfolio.
Theme: **Tokyo Night · "Living Silicon Die"** — a GPU particle fabric (Three.js +
custom GLSL shaders) that ripples like data flowing across a chip and reacts to the cursor.

## Stack
- **Three.js** + **postprocessing UnrealBloom** — the WebGL silicon-fabric hero with
  click-ripples, depth-dust parallax, and accent colors that shift per section/project
- **Lenis** — smooth inertia scroll
- **GSAP + ScrollTrigger** — synced to Lenis
- Vanilla JS for the preloader, custom cursor + canvas trail, scroll reveals, counters,
  magnetic buttons, scroll-progress rail, live IST clock

## Signature features
- **Cinematic intro** — the fabric flies in / reveals, synced to the preloader finish
- **Scene morphing** — the WebGL densifies, tilts, and fades out scene-to-scene as you scroll
- **Orbitable 3D chip** (`#chip`, `js/chip3d.js`) — a real-time Three.js die package you can
  drag to spin; the 4×4 systolic array pulses in sequence. Lazy-loaded on scroll, 2nd WebGL ctx
- **Synthesized sound design** (`js/legendary.js`) — ambient drone + UI ticks + section whooshes
  + boot chord, all generated with the Web Audio API (no audio files). Mute toggle, off by default
- **Text decode/scramble** — mono labels resolve from random characters on reveal
- **Scroll-velocity skew + chromatic aberration** — the page skews and big type RGB-splits with motion
- **Per-letter hero animation** — name splits into characters that stagger in & react to hover
- **Interactive Aurora v1 floorplan** (`#anatomy`) — hover the SVG die to read each block
- **Sign-off metric bars** — animated WNS / LVS / DRC / open-source-flow stats
- **Case-study modals** — click any project for a full write-up + a procedurally generated,
  per-project "die-shot" SVG (see `dieShot()` in `js/extra.js`)
- **Color identity per project** — the whole UI + WebGL retint as you move through the work
- **Readability scrim** — a gradient veil keeps text crisp over the glowing fabric
- **HUD interface layer** (`js/hud.js`) — corner frame brackets + a live readout (FPS, scroll %,
  cursor coords, render backend)
- **Keyboard navigation** — press `1`–`6` to jump sections, `g`/`G` for top/bottom
- **Secret OVERCLOCK mode** — enter the Konami code (`↑↑↓↓←→←→ b a`) for a hot-amber turbo theme
- **Click spark bursts** + **project-thumbnail 3D tilt** — micro-delight everywhere
- **Download résumé** button in the contact section (`assets/Kudum_Yashwanth_Resume.pdf`)
- **Custom scrollbar** styling to match the theme

- **Intro ENTER gate** — after the preloader, choose "enter with sound" or "enter silently";
  ENTER reveals the site, triggers the fabric fly-in, and (optionally) starts audio
- **Project filter** — `all / silicon / ai·ml / embedded` chips collapse non-matching projects
- **Richer 3D chip** — gold bond wires (die→package), a glow platform, and SMD passives

## Keyboard shortcuts
`1`–`6` jump to sections · `g` top · `G` contact · Konami code → overclock
- Fonts: Space Grotesk + JetBrains Mono (Google Fonts)

All libraries load from CDN, so the page needs an internet connection to render the
WebGL/animations. If any CDN fails it degrades gracefully (gradient fallback, native scroll).

## Run locally
```bash
cd ~/portfolio
python3 -m http.server 8765
# open http://localhost:8765
```
(Must be served over http:// — opening index.html as a file:// won't load ES modules.)

## Deploy (free options)
**GitHub Pages**
```bash
cd ~/portfolio
git init && git add . && git commit -m "portfolio"
gh repo create yashwanth-portfolio --public --source=. --push
# then enable Pages in repo Settings → Pages → branch: main /(root)
```
**Vercel / Netlify** — drag the `portfolio` folder into their dashboard, or `vercel` / `netlify deploy` from this directory. It's a static site, no build step.

## Edit your content
- All copy + projects live in `index.html`.
- Colors / type / spacing in `css/main.css` (`:root` at the top).
- The shader (look & motion of the fabric) in `js/webgl.js`.
- Interactions (preloader text, reveal timing, cursor) in `js/main.js`.

## TODO for you
- The **LinkedIn** link in the contact + nav is a placeholder (`https://www.linkedin.com/`).
  Replace with your real profile URL in `index.html`.
- Optional: add an OG/preview image (`assets/og.png`, ~1200×630) and point the
  `og:image` meta tag at it for nice link unfurls.
