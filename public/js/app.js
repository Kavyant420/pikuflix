/**
 * PikuFlix — application bootstrap.
 *
 * Responsibilities:
 *   - apply the GPU/3D preference
 *   - restore the auth session and wire the auth UI
 *   - render the home hero + content rows from the TMDB proxy
 *   - handle page routing (hash-based), search, My List and lazy images
 *   - start the ad-blocker awareness flow and the AI widget
 *
 * The catalog layer degrades gracefully: if the server has no TMDB key
 * configured it shows curated demo placeholders instead of erroring.
 */
import { CONFIG } from './config.js';
import { api } from './api.js';
import { apply3DPreference } from './gpu.js';
import {
  $,
  $$,
  el,
  toast,
  debounce,
  initModalDismiss,
  escapeHtml,
} from './ui.js';
import { initAuth, initAuthUI, getUser } from './auth.js';
import { initAdBlockerAwareness, promptAdNoticeOnFirstLogin } from './adblock.js';
import { initAiWidget } from './ai-widget.js';

/* ----------------------------- Demo fallback ------------------------------ */
// Used only when TMDB is not configured, so the UI is never empty.
const DEMO_ITEMS = [
  { title: 'Neon Horizon', year: '2024', rating: 8.4, genre: 'Sci-Fi' },
  { title: 'The Silent Tide', year: '2023', rating: 7.9, genre: 'Drama' },
  { title: 'Midnight Circuit', year: '2025', rating: 8.1, genre: 'Thriller' },
  { title: 'Echoes of Tomorrow', year: '2022', rating: 7.6, genre: 'Adventure' },
  { title: 'Crimson Skyline', year: '2024', rating: 8.7, genre: 'Action' },
  { title: 'Paper Lanterns', year: '2021', rating: 8.0, genre: 'Romance' },
];

/* ------------------------------- My List ---------------------------------- */
const myList = {
  all() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKeys.myList)) || [];
    } catch {
      return [];
    }
  },
  has(id) {
    return this.all().some((i) => i.id === id);
  },
  toggle(item) {
    const list = this.all();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list.splice(idx, 1);
    else
      list.push({
        id: item.id,
        title: item.title || item.name,
        poster_url: item.poster_url,
        media_type: item.media_type,
        vote_average: item.vote_average,
      });
    localStorage.setItem(CONFIG.storageKeys.myList, JSON.stringify(list));
    return idx < 0; // true if added
  },
};

/* ------------------------------- Rendering -------------------------------- */
function posterFor(item) {
  return (
    item.poster_url ||
    item.backdrop_url ||
    // Deterministic gradient placeholder when no image exists.
    null
  );
}

function buildCard(item) {
  const title = item.title || item.name || 'Untitled';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
  const poster = posterFor(item);

  const card = el('article', {
    class: 'card',
    tabindex: '0',
    role: 'button',
    'aria-label': `${title}${year ? ', ' + year : ''}`,
  });

  const img = el('img', {
    class: 'card__poster skeleton',
    alt: '',
    loading: 'lazy',
    decoding: 'async',
  });
  if (poster) {
    img.dataset.src = poster;
    img.addEventListener('load', () => {
      img.classList.add('is-loaded');
      img.classList.remove('skeleton');
    });
    img.addEventListener('error', () => {
      img.classList.remove('skeleton');
      img.classList.add('is-loaded');
    });
  } else {
    img.removeAttribute('src');
    img.classList.remove('skeleton');
    img.classList.add('is-loaded');
    img.style.background =
      'linear-gradient(135deg,#232634,#0f1016)';
  }

  const body = el('div', { class: 'card__body' }, [
    el('h3', { class: 'card__title', text: title }),
    el('div', { class: 'card__meta' }, [
      el('span', { text: year || '—' }),
      el('span', { class: 'card__rating', text: `★ ${rating}` }),
    ]),
  ]);

  const overlay = el('div', { class: 'card__overlay' }, [
    el('div', { class: 'card__actions' }, [
      el('button', {
        class: 'btn btn--light btn--sm',
        html: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play',
        onclick: (e) => {
          e.stopPropagation();
          openDetails(item);
        },
      }),
      el('button', {
        class: 'btn btn--ghost btn--sm',
        'aria-label': myList.has(item.id) ? 'Remove from My List' : 'Add to My List',
        html: `<svg viewBox="0 0 24 24"><path d="${
          myList.has(item.id)
            ? 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'
            : 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'
        }"/></svg>`,
        onclick: (e) => {
          e.stopPropagation();
          const added = myList.toggle(item);
          toast(added ? 'Added to My List' : 'Removed from My List', 'success');
          renderMyList();
          e.currentTarget.innerHTML = `<svg viewBox="0 0 24 24"><path d="${
            added
              ? 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'
              : 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'
          }"/></svg>`;
        },
      }),
    ]),
  ]);

  card.append(img, body, overlay);
  card.addEventListener('click', () => openDetails(item));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetails(item);
    }
  });

  // Subtle pointer-driven tilt (only meaningful when 3D is enabled).
  card.addEventListener('pointermove', (e) => {
    if (document.documentElement.classList.contains('no-3d')) return;
    const r = card.getBoundingClientRect();
    const tilt = ((e.clientX - r.left) / r.width - 0.5) * 12; // -6..6deg
    card.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`);
  });
  card.addEventListener('pointerleave', () =>
    card.style.setProperty('--tilt', '0deg')
  );

  return card;
}

function renderRow(track, items) {
  track.innerHTML = '';
  if (!items.length) {
    track.appendChild(
      el('p', { class: 'text-muted', text: 'Nothing here yet.' })
    );
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach((item) => frag.appendChild(buildCard(item)));
  track.appendChild(frag);
}

function renderSkeletons(track, count = 6) {
  track.innerHTML = '';
  for (let i = 0; i < count; i++) {
    track.appendChild(
      el('div', { class: 'card' }, [
        el('div', { class: 'card__poster skeleton' }),
        el('div', { class: 'card__body' }, [
          el('div', { class: 'skeleton', style: 'height:12px;border-radius:4px' }),
          el('div', {
            class: 'skeleton',
            style: 'height:10px;width:60%;margin-top:6px;border-radius:4px',
          }),
        ]),
      ])
    );
  }
}

/* -------------------------------- Hero ------------------------------------ */
async function renderHero() {
  const hero = $('#hero');
  if (!hero) return;
  try {
    const data = await api.tmdb('/trending/all/week');
    const pick = (data.results || []).find(
      (r) => r.backdrop_url && r.overview
    );
    if (!pick) return;
    const title = pick.title || pick.name;
    $('#heroTitle').textContent = title;
    $('#heroYear').textContent = (pick.release_date || pick.first_air_date || '').slice(0, 4);
    $('#heroRating').textContent = pick.vote_average
      ? `★ ${pick.vote_average.toFixed(1)}`
      : 'NR';
    $('#heroType').textContent = pick.media_type === 'tv' ? 'Series' : 'Film';
    $('#heroDesc').textContent = pick.overview;
    $('#heroBg').style.backgroundImage = `url(${pick.backdrop_url})`;
    $('#heroPlay').onclick = () => openDetails(pick);
    $('#heroInfo').onclick = () => openDetails(pick);
  } catch {
    /* keep the static hero copy */
  }
}

/* ------------------------------ Details modal ----------------------------- */
/**
 * Phase 1 shows a lightweight details modal with metadata. The streaming player
 * (cinesrc.st embed) is wired in Phase 2 — see openDetails() TODO.
 */
async function openDetails(item) {
  const modal = $('#detailModal');
  if (!modal) return;
  const title = item.title || item.name || 'Untitled';
  $('#detailTitle').textContent = title;
  $('#detailOverview').textContent =
    item.overview || 'No description available yet.';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  $('#detailMeta').textContent = [
    year,
    item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : null,
    item.media_type === 'tv' ? 'Series' : item.media_type === 'movie' ? 'Film' : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const poster = $('#detailPoster');
  const url = item.backdrop_url || item.poster_url;
  if (url) {
    poster.style.backgroundImage = `url(${url})`;
    poster.classList.remove('hidden');
  } else {
    poster.classList.add('hidden');
  }

  const playBtn = $('#detailPlay');
  playBtn.onclick = () => {
    // TODO (Phase 2): embed the cinesrc.st player here, e.g.
    //   player.src = `${CINESRC_BASE_URL}/embed/${type}/${item.id}`
    toast('Streaming player arrives in Phase 2.', 'info');
  };

  const addBtn = $('#detailAdd');
  addBtn.textContent = myList.has(item.id) ? '✓ In My List' : '+ My List';
  addBtn.onclick = () => {
    const added = myList.toggle(item);
    addBtn.textContent = added ? '✓ In My List' : '+ My List';
    renderMyList();
    toast(added ? 'Added to My List' : 'Removed from My List', 'success');
  };

  const { openModal } = await import('./ui.js');
  openModal('detailModal');
}

/* ------------------------------- My List ---------------------------------- */
function renderMyList() {
  const track = $('#myListTrack');
  if (!track) return;
  const list = myList.all();
  if (!list.length) {
    track.innerHTML =
      '<p class="text-muted" style="padding:0 var(--gutter)">Your list is empty. Add titles with the + button.</p>';
    return;
  }
  renderRow(track, list);
}

/* ------------------------------- Routing ---------------------------------- */
function showPage(name) {
  $$('.page').forEach((p) =>
    p.classList.toggle('is-active', p.id === `page-${name}`)
  );
  $$('[data-nav]').forEach((a) =>
    a.setAttribute('aria-current', a.dataset.nav === name ? 'page' : 'false')
  );
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------------------- Search ---------------------------------- */
async function runSearch(query) {
  const track = $('#searchResults');
  if (!track) return;
  if (!query || query.trim().length < 2) {
    track.innerHTML =
      '<p class="text-muted" style="padding:0 var(--gutter)">Type at least 2 characters to search.</p>';
    return;
  }
  renderSkeletons(track, 8);
  try {
    const data = await api.tmdb('/search/multi', {
      query: query.trim(),
      include_adult: 'false',
    });
    const results = (data.results || []).filter(
      (r) => r.media_type !== 'person' && (r.poster_path || r.backdrop_path)
    );
    renderRow(track, results);
  } catch (err) {
    track.innerHTML = `<p class="text-muted" style="padding:0 var(--gutter)">${escapeHtml(
      err.message
    )}</p>`;
  }
}

/* ------------------------------ Home rows --------------------------------- */
async function renderHomeRows() {
  for (const row of CONFIG.homeRows) {
    const track = $(`#row-${row.id}`);
    if (!track) continue;
    renderSkeletons(track);
    try {
      const data = await api.tmdb(row.endpoint);
      const items = (data.results || []).filter(
        (r) => r.media_type !== 'person'
      );
      if (items.length) renderRow(track, items);
      else throw new Error('empty');
    } catch {
      // Graceful fallback so the layout still looks complete.
      renderRow(
        track,
        DEMO_ITEMS.map((d, i) => ({
          id: `demo-${row.id}-${i}`,
          title: d.title,
          release_date: d.year,
          vote_average: d.rating,
          media_type: 'movie',
          overview: `${d.genre} · A PikuFlix demo title shown until the catalog is configured.`,
        }))
      );
    }
  }
}

/* ---------------------- Dedicated page rows ------------------------------- */
// The Movies / TV / New pages reuse the same card renderer with their own
// endpoints. Kept separate from the home rows so each page can paginate later.
async function renderPageRows() {
  const pages = [
    { track: '#row-movies-page', endpoint: '/movie/popular' },
    { track: '#row-tv-page', endpoint: '/tv/popular' },
    { track: '#row-new-page', endpoint: '/trending/all/day' },
  ];
  for (const { track, endpoint } of pages) {
    const trackEl = $(track);
    if (!trackEl) continue;
    renderSkeletons(trackEl);
    try {
      const data = await api.tmdb(endpoint);
      const items = (data.results || []).filter((r) => r.media_type !== 'person');
      if (items.length) renderRow(trackEl, items);
      else throw new Error('empty');
    } catch {
      renderRow(
        trackEl,
        DEMO_ITEMS.map((d, i) => ({
          id: `demo-${track}-${i}`,
          title: d.title,
          release_date: d.year,
          vote_average: d.rating,
          media_type: 'movie',
          overview: `${d.genre} · A PikuFlix demo title shown until the catalog is configured.`,
        }))
      );
    }
  }
}

/* --------------------------- Lazy image observer -------------------------- */
function initLazyImages() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        io.unobserve(img);
      }
    },
    { rootMargin: '200px' }
  );
  // Observe current and future images.
  const observeAll = () => $$('img[data-src]').forEach((img) => io.observe(img));
  observeAll();
  new MutationObserver(observeAll).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* -------------------------------- Header ---------------------------------- */
function initHeader() {
  const header = $('#header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* -------------------------------- Boot ------------------------------------ */
async function boot() {
  apply3DPreference();
  initModalDismiss();
  initHeader();
  initLazyImages();

  // Auth first so the ad-blocker flow can read the user's preference.
  await initAuth();
  initAuthUI();

  // Routing: hash + nav clicks.
  $$('[data-nav]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(a.dataset.nav);
    })
  );
  const initial = (location.hash || '#home').slice(1);
  showPage(initial);

  // Search.
  const searchInput = $('#searchInput');
  searchInput?.addEventListener(
    'input',
    debounce((e) => runSearch(e.target.value), 350)
  );
  $('#headerSearch')?.addEventListener('click', () => {
    showPage('search');
    setTimeout(() => searchInput?.focus(), 150);
  });

  // Footer year (kept out of inline scripts for CSP compliance).
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Content.
  renderMyList();
  renderHero();
  renderHomeRows();
  renderPageRows();

  // AI widget + ad-blocker awareness.
  initAiWidget();
  initAdBlockerAwareness();

  // First-ever signup -> prompt the ad-blocker recommendation immediately.
  let hadUser = Boolean(getUser());
  window.addEventListener('pikuflix:auth', (e) => {
    const now = Boolean(e.detail.user);
    if (now && !hadUser) promptAdNoticeOnFirstLogin();
    hadUser = now;
  });

  // Health check (non-blocking) — surfaces a helpful toast if TMDB is missing.
  api
    .health()
    .then((h) => {
      if (!h.tmdbConfigured) {
        toast('Demo mode: set TMDB_API_KEY to load the real catalog.', 'info', 6000);
      }
    })
    .catch(() => {});
}

document.addEventListener('DOMContentLoaded', boot);

// Expose a tiny API for debugging in the console.
window.PikuFlix = { showPage, openDetails, myList };
