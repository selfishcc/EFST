/* ============================================================
   EVERFLOW SANCTUARY — main.js
   Handles: Google Sheets fetch · Event rendering · Tabs
            Modal · Counters · Scroll Reveal · Nav · Mobile menu
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   CONFIGURATION
   ─────────────────────────────────────────────────────────────
   To connect your Google Sheet:
   1. Open your Google Sheet
   2. Click File → Share → Publish to web
   3. Choose "Entire Document" and "Comma-separated values (.csv)"
   4. Click "Publish" and copy the URL
   5. Paste it below as SHEET_URL
   ───────────────────────────────────────────────────────────── */
const CONFIG = {
  // Replace this URL with your published Google Sheet CSV URL
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1K0tUV8Wjracy-dXP4CjS4ldLWSyKDnM-IV1OIBszPQ4/gviz/tq?tqx=out:csv',

  // Impact stats — update these to match your real numbers
  // (or add a second sheet tab and fetch these too)
  STATS: {
    volunteers: 5,
    lbs: 20,
    events: 3,
    partners: 2
  }
};

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA  (used when SHEET_URL is empty or fetch fails)
   Replace with your real Google Sheet data.
   ───────────────────────────────────────────────────────────── */
const SAMPLE_EVENTS = [
  {
    id: 'evt-001',
    title: 'Point Pinole Shoreline Cleanup',
    status: 'past',
    date: '2025-05-09',
    time_start: '11:00 AM',
    time_end: '1:00 PM',
    location: 'Point Pinole Regional Shoreline, Richmond, CA',
    short_description: 'A community hike along the shoreline followed by a beach cleanup and a closing group meditation overlooking the Bay.',
    full_description: 'We kicked off the morning with a guided walk along Point Pinole\'s beautiful shoreline trail, picking up trash as we went. Volunteers fanned out across the beach and marshland edges, collecting bags of debris before gathering at the water\'s edge for a short group breathing session.',
    what_to_bring: '',
    rsvp_link: '',
    tags: 'Community,Cleanup,Hike,Free',
    volunteers: '30',
    lbs_collected: '180',
    partner_names: 'East Bay Regional Parks,Accenture Family Network',
    photo_1: '',
    photo_2: ''
  },
  {
    id: 'evt-002',
    title: 'Coyote Hills Trail Cleanup & Yoga',
    status: 'past',
    date: '2025-07-19',
    time_start: '9:00 AM',
    time_end: '12:00 PM',
    location: 'Coyote Hills Regional Park, Fremont, CA',
    short_description: 'Hiked the marsh loop trail, removed invasive plants from restoration zones, and ended with a restorative yoga flow at the overlook.',
    full_description: 'Volunteers hiked the outer marsh loop at Coyote Hills, clearing invasive ice plant and other non-native species from the sensitive restoration corridors. The hike ended at a scenic hilltop overlook where our certified instructor led a 30-minute restorative yoga session with views of the South Bay.',
    what_to_bring: '',
    rsvp_link: '',
    tags: 'Community,Invasive Plant,Hike,Yoga,Free',
    volunteers: '22',
    lbs_collected: '95',
    partner_names: 'East Bay Regional Parks',
    photo_1: '',
    photo_2: ''
  },
  {
    id: 'evt-003',
    title: 'Alameda Creek Invasive Plant Removal',
    status: 'past',
    date: '2025-09-06',
    time_start: '8:30 AM',
    time_end: '11:30 AM',
    location: 'Alameda Creek Trail, Union City, CA',
    short_description: 'Targeted removal of invasive Arundo donax along the creek corridor, followed by a creekside mindfulness walk and sitting meditation.',
    full_description: 'In partnership with local restoration groups, our volunteers spent the morning removing giant reed (Arundo donax) from a sensitive stretch of Alameda Creek. This invasive plant crowds out native willows and threatens wildlife habitat. We finished the morning with a quiet walk along the restored section and a guided sitting meditation in the shade of native oaks.',
    what_to_bring: '',
    rsvp_link: '',
    tags: 'Community,Invasive Plant,Meditation,Free',
    volunteers: '18',
    lbs_collected: '220',
    partner_names: '',
    photo_1: '',
    photo_2: ''
  }
];

/* ─────────────────────────────────────────────────────────────
   CSV PARSER — handles quoted fields with commas inside
   ───────────────────────────────────────────────────────────── */
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseCSVRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]));
  });
}

/* ─────────────────────────────────────────────────────────────
   FETCH EVENTS
   ───────────────────────────────────────────────────────────── */
async function fetchEvents() {
  if (!CONFIG.SHEET_URL) return SAMPLE_EVENTS;
  try {
    const res = await fetch(CONFIG.SHEET_URL);
    if (!res.ok) throw new Error('Sheet fetch failed');
    const text = await res.text();
    const rows = parseCSV(text);
    return rows.length ? rows : SAMPLE_EVENTS;
  } catch (err) {
    console.warn('[Everflow] Could not load sheet, using sample data.', err);
    return SAMPLE_EVENTS;
  }
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function parseTags(tagStr) {
  if (!tagStr) return [];
  return tagStr.split(',').map(t => t.trim()).filter(Boolean);
}

function tagSlug(tag) {
  return tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function renderTags(tags) {
  return tags.map(t =>
    `<span class="event-tag event-tag--${tagSlug(t)}">${t}</span>`
  ).join('');
}

function iconSVG(name) {
  const icons = {
    date: `<svg class="event-card__meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    time: `<svg class="event-card__meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    location: `<svg class="event-card__meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
  };
  return icons[name] || '';
}

/* ─────────────────────────────────────────────────────────────
   RENDER EVENT CARD
   ───────────────────────────────────────────────────────────── */
function renderEventCard(evt) {
  const tags = parseTags(evt.tags);
  const date = formatDate(evt.date);
  const isPast = evt.status === 'past';

  return `
    <article class="event-card" data-event-id="${evt.id}" aria-label="${evt.title}">
      <div class="event-card__top">
        <div class="event-card__tags">${renderTags(tags)}</div>
        <h3 class="event-card__title">${evt.title}</h3>
        <div class="event-card__meta">
          <div class="event-card__date">
            ${iconSVG('date')} ${date}
          </div>
          ${evt.time_start ? `<div class="event-card__time">${iconSVG('time')} ${evt.time_start}${evt.time_end ? ' – ' + evt.time_end : ''}</div>` : ''}
          ${evt.location ? `<div class="event-card__location">${iconSVG('location')} ${evt.location}</div>` : ''}
        </div>
      </div>
      <p class="event-card__desc">${evt.short_description}</p>
      <div class="event-card__footer">
        <button
          class="btn btn--outline event-card__btn"
          data-event-id="${evt.id}"
          aria-label="Learn more about ${evt.title}"
        >${isPast ? 'View Recap' : 'Learn More'}</button>
      </div>
    </article>
  `;
}

/* ─────────────────────────────────────────────────────────────
   RENDER MODAL CONTENT
   ───────────────────────────────────────────────────────────── */
function renderModalContent(evt) {
  const tags = parseTags(evt.tags);
  const date = formatDate(evt.date);
  const isPast = evt.status === 'past';
  const bring = evt.what_to_bring ? evt.what_to_bring.split(',').map(s => s.trim()).filter(Boolean) : [];
  const partners = evt.partner_names ? evt.partner_names.split(',').map(s => s.trim()).filter(Boolean) : [];
  const hasPhoto1 = evt.photo_1 && evt.photo_1.startsWith('http');
  const hasPhoto2 = evt.photo_2 && evt.photo_2.startsWith('http');
  const hasPhotos = hasPhoto1 || hasPhoto2;

  let html = `
    <div class="modal-status-badge modal-status-badge--${isPast ? 'past' : 'upcoming'}">
      ${isPast ? 'Past Event' : 'Upcoming Event'}
    </div>
    <h2 class="modal-title">${evt.title}</h2>
    <div class="modal-tags">${renderTags(tags)}</div>
    <div class="modal-meta">
      <div class="modal-meta-row">
        <span class="modal-meta-icon">${iconSVG('date')}</span>
        <strong>${date}</strong>
      </div>
      ${evt.time_start ? `
      <div class="modal-meta-row">
        <span class="modal-meta-icon">${iconSVG('time')}</span>
        ${evt.time_start}${evt.time_end ? ' – ' + evt.time_end : ''}
      </div>` : ''}
      ${evt.location ? `
      <div class="modal-meta-row">
        <span class="modal-meta-icon">${iconSVG('location')}</span>
        ${evt.location}
      </div>` : ''}
    </div>
  `;

  if (evt.full_description || evt.short_description) {
    html += `
      <p class="modal-section-title">About This Event</p>
      <p class="modal-desc">${evt.full_description || evt.short_description}</p>
    `;
  }

  if (!isPast && bring.length) {
    html += `
      <p class="modal-section-title">What to Bring</p>
      <ul class="modal-bring-list">
        ${bring.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
  }

  if (isPast && (evt.volunteers || evt.lbs_collected)) {
    html += `<p class="modal-section-title">What We Accomplished</p>`;
    html += `<div class="modal-impact">`;
    if (evt.volunteers) html += `<div class="modal-impact-stat"><strong>${evt.volunteers}</strong><span>Volunteers</span></div>`;
    if (evt.lbs_collected) html += `<div class="modal-impact-stat"><strong>${evt.lbs_collected} lbs</strong><span>Trash Removed</span></div>`;
    html += `</div>`;
  }

  if (isPast && partners.length) {
    html += `
      <p class="modal-section-title">Partners</p>
      <p class="modal-partners">${partners.join(' · ')}</p>
    `;
  }

  if (isPast && hasPhotos) {
    html += `<p class="modal-section-title">Photos</p><div class="modal-photos">`;
    if (hasPhoto1) html += `<img class="modal-photo" src="${evt.photo_1}" alt="Event photo 1" loading="lazy" />`;
    if (hasPhoto2) html += `<img class="modal-photo" src="${evt.photo_2}" alt="Event photo 2" loading="lazy" />`;
    html += `</div>`;
  }

  if (!isPast && evt.rsvp_link) {
    html += `<a href="${evt.rsvp_link}" target="_blank" rel="noopener noreferrer" class="btn btn--accent modal-cta">Register on Luma →</a>`;
  } else if (!isPast) {
    html += `<a href="mailto:everflow.sanctuary@gmail.com?subject=Event%20Inquiry%3A%20${encodeURIComponent(evt.title)}" class="btn btn--accent modal-cta">Contact Us to Register</a>`;
  }

  return html;
}

/* ─────────────────────────────────────────────────────────────
   MODAL — open / close
   ───────────────────────────────────────────────────────────── */
const modal = document.getElementById('event-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
let allEvents = [];
let lastFocused = null;

function openModal(eventId) {
  const evt = allEvents.find(e => e.id === eventId);
  if (!evt) return;
  lastFocused = document.activeElement;
  modalContent.innerHTML = renderModalContent(evt);
  modal.showModal();
  modal.scrollTop = 0;
  modalClose.focus();
}

function closeModal() {
  modal.close();
  if (lastFocused) lastFocused.focus();
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
modal.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ─────────────────────────────────────────────────────────────
   TABS — Upcoming / Past
   ───────────────────────────────────────────────────────────── */
function initTabs() {
  const tabs = document.querySelectorAll('.events__tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('events__tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('events__tab--active');
      tab.setAttribute('aria-selected', 'true');

      document.querySelectorAll('.events__panel').forEach(p => p.classList.add('events__panel--hidden'));
      const target = tab.dataset.tab === 'upcoming' ? 'panel-upcoming' : 'panel-past';
      document.getElementById(target).classList.remove('events__panel--hidden');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   RENDER ALL EVENTS
   ───────────────────────────────────────────────────────────── */
function renderEvents(events) {
  const upcomingGrid = document.getElementById('grid-upcoming');
  const pastGrid = document.getElementById('grid-past');

  const upcoming = events.filter(e => e.status === 'upcoming');
  const past = events.filter(e => e.status === 'past')
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

  if (upcoming.length === 0) {
    upcomingGrid.innerHTML = `
      <div class="events__empty">
        <p>No upcoming events scheduled right now.<br>
        <a href="mailto:everflow.sanctuary@gmail.com">Contact us</a> or follow
        <a href="https://www.instagram.com/everflow.sanctuary/" target="_blank" rel="noopener">@everflow.sanctuary</a>
        to be the first to know!</p>
      </div>`;
  } else {
    upcomingGrid.innerHTML = upcoming.map(renderEventCard).join('');
  }

  if (past.length === 0) {
    pastGrid.innerHTML = `<div class="events__empty"><p>No past events to show yet.</p></div>`;
  } else {
    pastGrid.innerHTML = past.map(renderEventCard).join('');
  }

  // Attach click handlers to all "Learn More" / "View Recap" buttons
  document.querySelectorAll('[data-event-id]').forEach(el => {
    if (el.tagName === 'BUTTON') {
      el.addEventListener('click', () => openModal(el.dataset.eventId));
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   IMPACT COUNTERS — animate on scroll
   ───────────────────────────────────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initCounters() {
  // Set configured stats into DOM
  const statMap = {
    '[data-target="50"]': CONFIG.STATS.volunteers,
    '[data-target="400"]': CONFIG.STATS.lbs,
    '[data-target="3"]': CONFIG.STATS.events,
    '[data-target="2"]': CONFIG.STATS.partners,
  };
  document.querySelectorAll('.impact__number').forEach((el, i) => {
    const vals = Object.values(CONFIG.STATS);
    el.dataset.target = vals[i] ?? el.dataset.target;
  });

  const counterObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.impact__number').forEach(el => counterObserver.observe(el));
}

/* ─────────────────────────────────────────────────────────────
   SCROLL REVEAL
   ───────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

/* ─────────────────────────────────────────────────────────────
   NAV — scroll behavior + active links
   ───────────────────────────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  // Scroll shadow
  const scrollObs = new IntersectionObserver(
    ([entry]) => nav.classList.toggle('scrolled', !entry.isIntersecting),
    { rootMargin: '-80px 0px 0px 0px' }
  );
  const hero = document.getElementById('hero');
  if (hero) scrollObs.observe(hero);

  // Mobile hamburger
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', isOpen);
    mobileMenu.setAttribute('aria-hidden', !isOpen);
  });

  // Close mobile menu when a link is clicked
  mobileMenu.querySelectorAll('.nav__mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   SMOOTH SCROLL — for nav links on mobile
   ───────────────────────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = document.getElementById('nav')?.offsetHeight || 70;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initSmoothScroll();
  initTabs();
  initCounters();
  initScrollReveal();

  // Load events
  allEvents = await fetchEvents();
  renderEvents(allEvents);

  // Reveal newly rendered event cards
  document.querySelectorAll('.event-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.08}s`;
  });
});
