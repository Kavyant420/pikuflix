# PikuFlix 🎬

A professional, Netflix-style movie & TV streaming web application. PikuFlix pairs a
cinematic dark UI with a **TMDB-powered catalog**, a **cinesrc.st streaming player**,
**JWT authentication**, **client-side ad-blocker awareness**, and a **floating AI
assistant** powered by [Pollinations](https://text.pollinations.ai).

> **Phase 1 (this PR):** project structure, authentication, and the base UI layout.
> The catalog rows, detail page, and streaming player are wired next — see the
> [Roadmap](#roadmap).

---

## ✨ Features

### Implemented in Phase 1
- **JWT authentication** — signup, login, logout, session restore (`/api/auth/*`).
  Passwords hashed with bcrypt (12 rounds); sessions delivered as **httpOnly cookies**.
- **Secure API proxy** — the TMDB key lives **only on the server** and is never
  exposed to the browser. The proxy validates every requested path against an
  allow-list so it can't be abused as an open proxy.
- **AI assistant ("Piku")** — a floating chat widget backed by a server-side proxy
  to `text.pollinations.ai`.
- **Ad-blocker awareness** — client-side detection (no server-side ad injection) that
  recommends uBlock Origin / AdGuard DNS when no blocker is present. Shown once on
  first login and dismissible.
- **Cinematic dark UI** — mobile-first, fully responsive, custom design tokens,
  Netflix-inspired layout with a hero, content rows, and a bottom mobile nav.
- **GPU-aware 3D animations** — subtle 3D card tilt, hero entrance and a 3D spinner
  that automatically **disable on mobile, low-power devices, machines without a GPU,
  or when the user prefers reduced motion**.
- **Accessibility** — WCAG 2.1 AA-minded: skip link, focus-visible styles, ARIA
  roles/labels, keyboard-operable cards, `prefers-reduced-motion` support.
- **Security hardening** — Helmet CSP, rate limiting (global + strict on auth),
  input validation, atomic user-store writes, and no secrets in the client bundle.

### Coming next
- TMDB-driven detail page + **cinesrc.st** embed player (with trailer support).
- Per-user **My List** and watch history (persisted server-side).
- Pagination / infinite scroll and richer search.

---

## 🧱 Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Front-end  | Vanilla **HTML5 + CSS3 + ES modules** (no build step)         |
| Back-end   | **Node.js + Express**                                          |
| Auth       | **JWT** (`jsonwebtoken`) + **bcryptjs**, httpOnly cookies     |
| Catalog    | **TMDB API** (proxied server-side)                            |
| Player     | **cinesrc.st** embed (Phase 2)                                |
| AI         | **Pollinations** (`text.pollinations.ai`) via a server proxy  |
| Security   | Helmet (CSP), CORS, express-rate-limit                        |

---

## 📁 Project structure

```
pikuflix/
├── .env.example              # Documented environment variables (copy to .env)
├── package.json
├── README.md
├── server/                   # Express backend
│   ├── index.js              # Entry point (HTTP listener)
│   ├── app.js                # App factory: security, routes, static, fallbacks
│   ├── config.js             # Centralised, validated env config
│   ├── middleware/
│   │   ├── auth.js           # JWT extraction + requireAuth / optionalAuth
│   │   ├── errorHandler.js   # HttpError + 404 + central error handler
│   │   └── rateLimit.js      # Global + auth rate limiters
│   ├── routes/
│   │   ├── auth.routes.js    # signup / login / logout / me / prefs
│   │   ├── tmdb.routes.js    # Allow-listed TMDB proxy
│   │   └── ai.routes.js      # Pollinations chat proxy
│   ├── services/
│   │   ├── userStore.js      # Swappable persistence (JSON file → DB later)
│   │   └── tmdbService.js    # TMDB fetch + cache + image URLs
│   └── utils/
│       ├── jwt.js            # Sign/verify + cookie options
│       └── validate.js       # Input validation helpers
├── public/                   # Static front-end (served by Express)
│   ├── index.html            # Main app shell
│   ├── login.html            # Standalone auth page
│   ├── assets/logo.svg
│   ├── css/
│   │   ├── tokens.css        # Design tokens (colour, type, motion, --depth)
│   │   ├── base.css          # Reset, typography, a11y primitives
│   │   ├── layout.css        # Header, nav, hero, rows, footer, pages
│   │   ├── components.css    # Buttons, cards, forms, modal, toasts, AI widget
│   │   └── animations.css    # GPU-gated 3D animations
│   └── js/
│       ├── config.js         # Public client config (no secrets)
│       ├── api.js            # fetch wrapper for /api/*
│       ├── gpu.js            # GPU/3D capability detection
│       ├── ui.js             # Toasts, modals, DOM helpers
│       ├── auth.js           # Session state + auth UI
│       ├── adblock.js        # Ad-blocker detection + recommendation banner
│       ├── ai-widget.js      # Floating AI assistant
│       └── app.js            # Bootstrap, routing, catalog rendering
└── legacy/                   # Original static site (kept for reference)
```

---

## 🚀 Getting started

### 1. Prerequisites
- **Node.js 18+** (tested on 22)
- A free **TMDB API key** — https://www.themoviedb.org/settings/api

### 2. Install
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Then edit `.env`:

```dotenv
PORT=3000
NODE_ENV=development

# Generate a strong secret:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d

# Your TMDB key — used ONLY on the server, never sent to the browser.
TMDB_API_KEY=your_tmdb_api_key

POLLINATIONS_BASE_URL=https://text.pollinations.ai
CINESRC_BASE_URL=https://cinesrc.st
ALLOWED_ORIGINS=http://localhost:3000
```

> **No key is ever hardcoded.** If `TMDB_API_KEY` is missing the app still runs and
> shows curated **demo** placeholders instead of erroring.

### 4. Run
```bash
npm start        # production
npm run dev      # auto-reload on change (node --watch)
```
Open **http://localhost:3000**.

---

## 🔌 API reference

| Method | Endpoint              | Auth | Description                          |
| ------ | --------------------- | ---- | ------------------------------------ |
| GET    | `/api/health`         | –    | Health + whether TMDB is configured  |
| POST   | `/api/auth/signup`    | –    | Create account, start session        |
| POST   | `/api/auth/login`     | –    | Verify credentials, start session    |
| POST   | `/api/auth/logout`    | –    | Clear session cookie                 |
| GET    | `/api/auth/me`        | ✅   | Current user                         |
| PATCH  | `/api/auth/prefs`     | ✅   | Update UI preferences                |
| GET    | `/api/tmdb/*`         | –    | Allow-listed TMDB proxy              |
| POST   | `/api/ai/chat`        | –    | AI assistant (`{ message, history }`) |

**Auth example**
```bash
# Sign up
curl -c cookies.txt -X POST http://localhost:3000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","username":"cinephile","password":"supersecret123"}'

# Current user (uses the httpOnly cookie)
curl -b cookies.txt http://localhost:3000/api/auth/me
```

**AI example**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Recommend a cozy sci-fi movie"}'
```

---

## 🔐 Security notes

- The TMDB key is **server-only**. The browser talks to `/api/tmdb/*`, never to TMDB.
- JWTs are stored in **httpOnly, SameSite=Lax** cookies (Secure in production).
- **Helmet CSP** restricts scripts, frames and connections to known-good origins.
  `frame-src` already allows `cinesrc.st` and YouTube for the Phase 2 player.
- **Rate limiting**: 120 req/min globally, 20 attempts / 15 min on auth routes.
- The user store writes **atomically** (temp file + rename) to avoid corruption.

> **Production checklist:** set a strong `JWT_SECRET`, run behind HTTPS, replace the
> JSON user store with a real database, and consider removing `'unsafe-inline'` from
> the CSP `script-src` once no inline scripts remain.

---

## ♿ Accessibility

- Skip-to-content link and visible `:focus-visible` outlines.
- Semantic landmarks (`header`, `nav`, `main`, `footer`) and ARIA roles/labels.
- Keyboard-operable movie cards (Enter/Space) and focus-trapped modals.
- Full `prefers-reduced-motion` support; 3D effects degrade to flat transitions.

---

## 🗺 Roadmap

**Phase 2 — Catalog & player**
- [ ] TMDB detail page (cast, genres, similar titles, trailers)
- [ ] **cinesrc.st** embed player with graceful fallbacks
- [ ] Per-user My List & watch history (server-persisted)
- [ ] Pagination / infinite scroll

**Phase 3 — Polish & deploy**
- [ ] Full WCAG 2.1 AA audit
- [ ] Performance pass (caching, service worker, image optimisation)
- [ ] CI + deployment (Render / Fly / Vercel)

---

## 📜 License

MIT. Movie metadata and imagery courtesy of **TMDB**. This product uses the TMDB API
but is not endorsed or certified by TMDB.
