/**
 * ═══════════════════════════════════════════════════════════════
 * BAN52 Events — Portfolio JavaScript
 * Handles: Navigation, Portfolio Loading & Filtering,
 *          Modal System, Contact Form, Scroll Animations
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════════════════════
   1. NAVIGATION
═══════════════════════════════════════════════════════════════ */
(function initNavigation() {
  const nav      = $('#nav');
  const toggle   = $('#navToggle');
  const navLinks = $('#navLinks');
  const links    = $$('.nav__link', navLinks);

  // Scrolled class
  const onScroll = () => nav.classList.toggle('nav--scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile toggle
  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Active link on scroll
  const sections = $$('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    links.forEach(link => {
      link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${current}`);
    });
  }, { passive: true });
})();


/* ═══════════════════════════════════════════════════════════════
   2. PORTFOLIO: FETCH, RENDER, FILTER
═══════════════════════════════════════════════════════════════ */
(function initPortfolio() {
  const grid      = $('#portfolioGrid');
  const filterBar = $('#portfolioFilters');
  const errorEl   = $('#portfolioError');
  let allProjects = [];

  /* ── Fetch ── */
  async function loadProjects() {
    try {
      const res  = await fetch('projects.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allProjects = data.projects;
      renderProjects(allProjects);
    } catch (err) {
      console.error('Portfolio load error:', err);
      grid.innerHTML = '';
      errorEl.removeAttribute('hidden');
    }
  }

  /* ── Build card ── */
  function buildCard(project) {
    const card = document.createElement('article');
    card.className = 'project-card reveal';
    if (project.featured) card.classList.add('project-card--featured');

    const mediaHTML = project.image
      ? `<img class="project-card__image" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy" />`
      : `<div class="project-card__placeholder" role="img" aria-label="${escapeHtml(project.title)}">${project.emoji || '★'}</div>`;

    card.innerHTML = `
      ${mediaHTML}
      <div class="project-card__overlay"></div>
      <div class="project-card__info">
        <p class="project-card__category">${escapeHtml(project.category)} · ${escapeHtml(project.year)}</p>
        <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        <p class="project-card__desc">${escapeHtml(project.description.substring(0, 110))}…</p>
        <span class="project-card__cta">View Details →</span>
      </div>
    `;

    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', () => openModal(project));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(project); }
    });

    return card;
  }

  /* ── Render ── */
  function renderProjects(projects) {
    grid.innerHTML = '';
    errorEl.setAttribute('hidden', '');

    if (projects.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--c-muted);">
          <p style="font-size:2rem;margin-bottom:1rem;">★</p>
          <p>No events in this category yet — check back soon!</p>
        </div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    projects.forEach((p, i) => {
      const card = buildCard(p);
      card.style.transitionDelay = `${(i % 6) * 0.07}s`;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    requestAnimationFrame(observeRevealElements);
  }

  /* ── Filter ── */
  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    $$('.filter-btn', filterBar).forEach(b => {
      b.classList.remove('filter-btn--active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('filter-btn--active');
    btn.setAttribute('aria-selected', 'true');

    const filter = btn.dataset.filter;
    const filtered = filter === 'all' ? allProjects : allProjects.filter(p => p.category === filter);
    renderProjects(filtered);
  });

  loadProjects();
})();


/* ═══════════════════════════════════════════════════════════════
   3. MODAL
═══════════════════════════════════════════════════════════════ */
(function initModal() {
  const modal      = $('#projectModal');
  const backdrop   = $('#modalBackdrop');
  const closeBtn   = $('#modalClose');
  const modalImg   = $('#modalImage');
  const modalImgWrap = $('#modalImageWrap');
  const modalCat   = $('#modalCategory');
  const modalTitle = $('#modalTitle');
  const modalDesc  = $('#modalDescription');
  const modalMeta  = $('#modalMeta');
  const modalCTA   = $('#modalCTA');
  let lastFocused  = null;

  window.openModal = function(project) {
    lastFocused = document.activeElement;
    modalCat.textContent   = `${project.category} · ${project.year}`;
    modalTitle.textContent = project.title;
    modalDesc.textContent  = project.description;

    // Reset image wrap
    modalImgWrap.style.background = '';

    if (project.image) {
      modalImg.src = project.image;
      modalImg.alt = project.title;
      modalImg.style.display = 'block';
      // Ensure category badge is present
      if (!$('#modalCategory', modalImgWrap)) modalImgWrap.appendChild(modalCat);
    } else {
      modalImg.style.display = 'none';
      modalImgWrap.style.background = 'linear-gradient(135deg, #1a0505, #0a0a0a)';
      // Show emoji as placeholder
      let emojiEl = $('#modalEmoji');
      if (!emojiEl) {
        emojiEl = document.createElement('div');
        emojiEl.id = 'modalEmoji';
        emojiEl.style.cssText = 'font-size:5rem;';
        modalImgWrap.appendChild(emojiEl);
      }
      emojiEl.textContent = project.emoji || '★';
      emojiEl.style.display = 'block';
    }

    modalMeta.innerHTML = (project.tags || [])
      .map(tag => `<span class="modal__tag">${escapeHtml(tag)}</span>`)
      .join('');

    modalCTA.href = '#contact';
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeBtn.focus());
  };

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  backdrop.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  modalCTA.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });
})();


/* ═══════════════════════════════════════════════════════════════
   4. CONTACT FORM
═══════════════════════════════════════════════════════════════ */
(function initContactForm() {
  const form      = $('#contactForm');
  const submitBtn = $('#formSubmit');
  const note      = $('#formNote');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const name  = form.name.value.trim();
    const phone = form.phone.value.trim();

    if (!name || !phone) {
      showNote('Please enter your name and phone number.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn__text').textContent = 'Sending…';

    await new Promise(r => setTimeout(r, 1200)); // Replace with real fetch()

    form.reset();
    showNote('Thank you! We\'ll contact you within 24 hours. ★ — BAN52 Events', 'success');
    submitBtn.querySelector('.btn__text').textContent = 'Send Booking Request';
    submitBtn.disabled = false;
  });

  function showNote(msg, type) {
    note.textContent = msg;
    note.className = `form-note form-note--${type}`;
    note.removeAttribute('hidden');
    note.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => note.setAttribute('hidden', ''), 7000);
  }
})();


/* ═══════════════════════════════════════════════════════════════
   5. SCROLL-REVEAL
═══════════════════════════════════════════════════════════════ */
function observeRevealElements() {
  const elements = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  // Add reveal classes to static elements
  $$('.service-card').forEach((c, i) => c.classList.add('reveal', `reveal--delay-${(i % 4) + 1}`));
  $$('.about__pillar').forEach((c, i) => c.classList.add('reveal', `reveal--delay-${i + 1}`));
  $$('.testimonial-card').forEach((c, i) => c.classList.add('reveal', `reveal--delay-${i + 1}`));
  observeRevealElements();
});


/* ═══════════════════════════════════════════════════════════════
   6. FOOTER YEAR
═══════════════════════════════════════════════════════════════ */
(function() {
  const el = $('#year');
  if (el) el.textContent = new Date().getFullYear();
})();


/* ═══════════════════════════════════════════════════════════════
   7. SECURITY: HTML ESCAPING
═══════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
}


/* ═══════════════════════════════════════════════════════════════
   8. SMOOTH SCROLL FALLBACK
═══════════════════════════════════════════════════════════════ */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


/* ═══════════════════════════════════════════════════════════════
   9. SUBTLE CURSOR GLOW (desktop only)
═══════════════════════════════════════════════════════════════ */
(function() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const glow = document.createElement('div');
  glow.style.cssText = `
    position:fixed;top:0;left:0;width:260px;height:260px;
    border-radius:50%;pointer-events:none;z-index:9999;
    background:radial-gradient(circle,rgba(139,26,26,0.07) 0%,transparent 70%);
    transform:translate(-50%,-50%);will-change:transform;
  `;
  document.body.appendChild(glow);

  let mx = 0, my = 0, gx = 0, gy = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function animate() {
    gx += (mx - gx) * 0.08;
    gy += (my - gy) * 0.08;
    glow.style.transform = `translate(${gx - 130}px, ${gy - 130}px)`;
    requestAnimationFrame(animate);
  })();
})();