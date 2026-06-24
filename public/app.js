const API = '';
let siteData = {};
let scrolled = false;
let observer;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => Number(value).toLocaleString('en-IN');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));
const lines = value => escapeHtml(value).replace(/&lt;br\s*\/?&gt;/gi, '<br>');

function setText(selector, value, root = document) {
  const el = $(selector, root);
  if (el) el.textContent = value ?? '';
}

function setHtml(selector, value, root = document) {
  const el = $(selector, root);
  if (el) el.innerHTML = lines(value ?? '');
}

function applyTheme(theme = {}) {
  const tokenMap = {
    bg: '--bg',
    bg2: '--bg2',
    card: '--card',
    card2: '--card2',
    cyan: '--cyan',
    cyanDim: '--cyan-dim',
    cyanGlow: '--cyan-glow',
    text: '--text',
    muted: '--muted',
    border: '--border',
    gold: '--gold'
  };
  Object.entries(tokenMap).forEach(([key, token]) => {
    if (theme[key]) document.documentElement.style.setProperty(token, theme[key]);
  });
}

function renderOptions(select, options, placeholder) {
  if (!select) return;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
    options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
}

function planOptions(placeholder, includeTags = true) {
  return `<option value="">${escapeHtml(placeholder)}</option>` + siteData.plans.map(plan => {
    const tag = includeTags && plan.popular ? ' (Most Popular)' : '';
    return `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)} - Rs ${money(plan.price)}${tag}</option>`;
  }).join('');
}

function renderSeo() {
  if (siteData.seo?.title) document.title = siteData.seo.title;
  const meta = $('meta[name="description"]');
  if (meta && siteData.seo?.description) meta.setAttribute('content', siteData.seo.description);
}

function renderNav() {
  const logo = $('.nav-logo');
  if (logo) logo.innerHTML = `${escapeHtml(siteData.brand.name)} <span>${escapeHtml(siteData.brand.suffix)}</span>`;
  const links = $('.nav-links');
  if (links) {
    links.innerHTML = siteData.nav.links.map(link =>
      `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
    ).join('');
  }
  setText('.nav-cta', siteData.nav.cta);
}

function renderHero() {
  setText('.hero-badge', siteData.hero.badge);
  const title = $('h1');
  if (title) {
    title.innerHTML = siteData.hero.title.map((part, index) => {
      const text = escapeHtml(part);
      return index === siteData.hero.accentTitleIndex ? `<span class="accent">${text}</span>` : text;
    }).join('<br>');
  }
  setText('.hero-sub', siteData.hero.subtitle);
  setText('.hero-ctas .btn-primary', siteData.hero.primaryCta);
  setText('.hero-ctas .btn-secondary', siteData.hero.secondaryCta);

  const stats = $('.hero-stats');
  if (stats) {
    stats.innerHTML = siteData.hero.stats.map(stat => `
      <div>
        <div class="stat-num">${escapeHtml(stat.number)}</div>
        <div class="stat-label">${escapeHtml(stat.label)}</div>
      </div>
    `).join('');
  }

  const rating = siteData.hero.rating;
  setText('.stars', '*'.repeat(rating.stars));
  setText('.rating-num', rating.score);
  setText('.rating-count', rating.count);

  const ticker = $('#ticker');
  if (ticker) {
    ticker.innerHTML = [...siteData.hero.ticker, ...siteData.hero.ticker].map((item, index) =>
      `<div class="ticker-item${index % 3 === 0 ? ' highlight' : ''}">${escapeHtml(item)}</div>`
    ).join('');
  }

  const amenities = $('#amenities');
  if (amenities) {
    amenities.innerHTML = siteData.hero.amenities.map(item =>
      `<div class="amenity-tag">${escapeHtml(item)}</div>`
    ).join('');
  }

  const bar = $('#tickerBar');
  if (bar) {
    bar.innerHTML = [...siteData.tickerBar, ...siteData.tickerBar].map(item =>
      `<span>${escapeHtml(item)} <span class="ticker-dot">*</span> </span>`
    ).join('');
  }
}

function renderSectionHeaders() {
  setText('#services .section-eye', siteData.sections.services.eyebrow);
  setHtml('#services .section-title', siteData.sections.services.title);
  setText('#services .section-sub', siteData.sections.services.subtitle);

  setText('#why .section-eye', siteData.sections.why.eyebrow);
  setHtml('#why .section-title', siteData.sections.why.title);
  setText('#why .section-sub', siteData.sections.why.subtitle);

  setText('#plans .section-eye', siteData.sections.plans.eyebrow);
  setHtml('#plans .section-title', siteData.sections.plans.title);
  setText('#plans .section-sub', siteData.sections.plans.subtitle);

  setText('#reviews .section-eye', siteData.sections.reviews.eyebrow);
  setHtml('#reviews .section-title', siteData.sections.reviews.title);
  setText('#reviews .section-sub', siteData.sections.reviews.subtitle);
  const reviewsLink = $('#reviews a');
  if (reviewsLink) {
    reviewsLink.href = siteData.sections.reviews.allReviewsUrl;
    reviewsLink.textContent = siteData.sections.reviews.allReviewsText;
  }

  setText('#contact .section-eye', siteData.sections.contact.eyebrow);
  setHtml('#contact .section-title', siteData.sections.contact.title);
  setText('#contact .section-sub', siteData.sections.contact.subtitle);
}

function renderServices() {
  const grid = $('#servicesGrid');
  if (!grid) return;
  grid.innerHTML = siteData.services.map(service => `
    <div class="service-card">
      <span class="service-icon">${escapeHtml(service.icon)}</span>
      <div class="service-name">${escapeHtml(service.name)}</div>
      <div class="service-desc">${escapeHtml(service.desc)}</div>
    </div>
  `).join('');
}

function renderWhy() {
  const visual = $('.why-visual');
  if (visual) {
    visual.innerHTML = siteData.sections.why.stats.map(stat => `
      <div class="why-num-card">
        <div class="why-big">${escapeHtml(stat.number)}</div>
        <div class="why-small">${escapeHtml(stat.label)}</div>
      </div>
    `).join('');
  }

  const list = $('.why-list');
  if (list) {
    list.innerHTML = siteData.sections.why.items.map((item, index) => `
      <li class="why-item fade-up ${index ? `stagger-${index}` : ''}">
        <div class="why-icon">${escapeHtml(item.icon)}</div>
        <div>
          <div class="why-text-head">${escapeHtml(item.title)}</div>
          <div class="why-text-sub">${escapeHtml(item.text)}</div>
        </div>
      </li>
    `).join('');
  }
}

function renderPlans() {
  const grid = $('#plansGrid');
  if (!grid) return;
  grid.innerHTML = siteData.plans.map(plan => `
    <div class="plan-card ${plan.popular ? 'popular' : ''}">
      ${plan.popular ? `<div class="popular-badge">${escapeHtml(plan.badge || 'POPULAR')}</div>` : ''}
      <div class="plan-name">${escapeHtml(plan.name)}</div>
      ${plan.originalPrice ? `<div class="plan-old">Rs ${money(plan.originalPrice)}</div>` : ''}
      <div class="plan-price-row">
        <span class="plan-currency">Rs</span>
        <span class="plan-price">${money(plan.price)}</span>
      </div>
      <div class="plan-duration">${escapeHtml(plan.duration)}</div>
      <ul class="plan-features">${plan.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
      <button class="${plan.popular ? 'plan-btn plan-btn-filled' : 'plan-btn plan-btn-outline'}" onclick="openModalWithPlan('${escapeHtml(plan.id)}')">
        ${escapeHtml(plan.buttonText || 'CHOOSE PLAN')}
      </button>
    </div>
  `).join('');
}

function renderReviews() {
  const grid = $('#reviewsGrid');
  if (!grid) return;
  grid.innerHTML = siteData.reviews.map(review => `
    <div class="review-card">
      <div class="review-stars">${'*'.repeat(review.rating)}</div>
      <div class="review-text">"${escapeHtml(review.text)}"</div>
      <div class="review-author">
        <div class="review-avatar">${escapeHtml(review.name.charAt(0))}</div>
        <div>
          <div class="review-name">${escapeHtml(review.name)}</div>
          <div class="review-time">${escapeHtml(review.time)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTrialForm() {
  const trial = siteData.forms.trial;
  setHtml('.trial-big-text', trial.visualText);
  setText('.trial-big-num', trial.badgeNumber);
  setText('.trial-big-label', trial.badgeLabel);
  setText('#trial .form-title', trial.title);
  setText('#trial .form-sub', trial.subtitle);
  setText('#trialSubmit', trial.submitText);
  setText('#trial .form-notice', trial.notice);

  const form = $('#trialForm');
  if (!form) return;
  const fields = trial.fields;
  const groups = $$('.form-group', form);
  groups[0].querySelector('label').textContent = fields.nameLabel;
  groups[0].querySelector('input').placeholder = fields.namePlaceholder;
  groups[1].querySelector('label').textContent = fields.phoneLabel;
  groups[1].querySelector('input').placeholder = fields.phonePlaceholder;
  groups[2].querySelector('label').textContent = fields.emailLabel;
  groups[2].querySelector('input').placeholder = fields.emailPlaceholder;
  groups[3].querySelector('label').textContent = fields.planLabel;
  groups[3].querySelector('select').innerHTML = planOptions(fields.planPlaceholder);
  groups[4].querySelector('label').textContent = fields.goalLabel;
  renderOptions(groups[4].querySelector('select'), trial.goals, fields.goalPlaceholder);
}

function renderContact() {
  const info = $('.contact-info');
  if (info) {
    info.innerHTML = siteData.contact.items.map(item => `
      <div class="contact-item">
        <div class="contact-icon">${escapeHtml(item.icon)}</div>
        <div>
          <div class="contact-label">${escapeHtml(item.label)}</div>
          <div class="contact-value">${item.href
            ? `<a href="${escapeHtml(item.href)}" target="${item.href.startsWith('http') ? '_blank' : '_self'}">${escapeHtml(item.text)}</a>`
            : lines(item.html || item.text)}
          </div>
        </div>
      </div>
    `).join('');
  }

  const hours = $('.hours-grid');
  if (hours) {
    hours.innerHTML = `
      <div class="hours-title">${escapeHtml(siteData.contact.hoursTitle)}</div>
      ${siteData.contact.hours.map(row => `
        <div class="hours-row">
          <span class="hours-day">${escapeHtml(row.day)}</span>
          <span class="hours-time">${escapeHtml(row.time)} ${row.status ? `<span class="open-now">* ${escapeHtml(row.status)}</span>` : ''}</span>
        </div>
      `).join('')}
    `;
  }

  const contactForm = siteData.forms.contact;
  const form = $('#contactForm');
  if (form) {
    const groups = $$('.form-group', form);
    groups[0].querySelector('label').textContent = contactForm.nameLabel;
    groups[0].querySelector('input').placeholder = contactForm.namePlaceholder;
    groups[1].querySelector('label').textContent = contactForm.phoneLabel;
    groups[1].querySelector('input').placeholder = contactForm.phonePlaceholder;
    groups[2].querySelector('label').textContent = contactForm.subjectLabel;
    groups[2].querySelector('input').placeholder = contactForm.subjectPlaceholder;
    groups[3].querySelector('label').textContent = contactForm.messageLabel;
    groups[3].querySelector('textarea').placeholder = contactForm.messagePlaceholder;
    setText('#contactSubmit', contactForm.submitText);
  }

  const iframe = $('.map-wrapper iframe');
  if (iframe) iframe.src = siteData.contact.mapEmbedUrl;
  const actionLinks = $$('#contact .map-wrapper + div a');
  if (actionLinks[0]) {
    actionLinks[0].href = siteData.contact.directionsUrl;
    actionLinks[0].textContent = siteData.contact.directionsText;
  }
  if (actionLinks[1]) {
    actionLinks[1].href = siteData.contact.phoneHref;
    actionLinks[1].textContent = siteData.contact.callText;
  }
}

function renderFooter() {
  const logo = $('.footer-logo');
  if (logo) logo.innerHTML = `${escapeHtml(siteData.brand.name)} <span>${escapeHtml(siteData.brand.suffix)}</span>`;
  setText('.footer-tagline', siteData.footer.tagline);

  const social = $('.social-links');
  if (social) {
    social.innerHTML = siteData.footer.socialLinks.map(link =>
      `<a class="social-link" href="${escapeHtml(link.href)}" target="${link.href.startsWith('http') ? '_blank' : '_self'}" title="${escapeHtml(link.label)}">${escapeHtml(link.text)}</a>`
    ).join('');
  }

  const columns = $$('.footer-grid > div').slice(1);
  siteData.footer.columns.forEach((column, index) => {
    const node = columns[index];
    if (!node) return;
    node.innerHTML = `
      <div class="footer-col-title">${escapeHtml(column.title)}</div>
      <ul class="footer-links">
        ${column.links.map(link => `<li>${link.href
          ? `<a href="${escapeHtml(link.href)}" target="${link.href.startsWith('http') ? '_blank' : '_self'}">${lines(link.label)}</a>`
          : `<span style="color:var(--muted); font-size:0.85rem">${lines(link.label)}</span>`}
        </li>`).join('')}
      </ul>
    `;
  });

  const bottom = $$('.footer-bottom > div');
  if (bottom[0]) bottom[0].textContent = siteData.footer.bottomLeft;
  if (bottom[1]) bottom[1].textContent = siteData.footer.bottomRight;
}

function renderModalAndSticky() {
  const modal = siteData.forms.modal;
  setText('.modal-close', modal.closeLabel);
  const modalTitle = $('.modal .modal-close + div');
  if (modalTitle) modalTitle.textContent = modal.title;
  const modalSub = modalTitle?.nextElementSibling;
  if (modalSub) modalSub.textContent = modal.subtitle;

  const form = $('#modalForm');
  if (form) {
    const groups = $$('.form-group', form);
    groups[0].querySelector('label').textContent = modal.nameLabel;
    groups[0].querySelector('input').placeholder = siteData.forms.trial.fields.namePlaceholder;
    groups[1].querySelector('label').textContent = modal.phoneLabel;
    groups[1].querySelector('input').placeholder = siteData.forms.trial.fields.phonePlaceholder;
    groups[2].querySelector('label').textContent = modal.planLabel;
    groups[2].querySelector('select').innerHTML = planOptions(modal.planPlaceholder, false);
    setText('#modalSubmit', modal.submitText);
  }

  const stickyLeft = $('.sticky-left');
  if (stickyLeft) stickyLeft.innerHTML = `${escapeHtml(siteData.stickyCta.text)} <span>${escapeHtml(siteData.stickyCta.highlight)}</span>`;
  const stickyCall = $('.sticky-right a');
  if (stickyCall) {
    stickyCall.href = siteData.contact.phoneHref;
    stickyCall.textContent = siteData.stickyCta.callText;
  }
  setText('.sticky-right button', siteData.stickyCta.buttonText);
}

function bindAnimations() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  $$('.fade-up').forEach(el => observer.observe(el));
}

function renderSite() {
  applyTheme(siteData.theme);
  renderSeo();
  renderNav();
  renderHero();
  renderSectionHeaders();
  renderServices();
  renderWhy();
  renderPlans();
  renderReviews();
  renderTrialForm();
  renderContact();
  renderFooter();
  renderModalAndSticky();
  bindAnimations();
}

async function loadSiteData() {
  const response = await fetch('data.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load data.json');
  siteData = await response.json();
  renderSite();
}

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openModalWithPlan(planId) {
  openModal();
  const sel = document.querySelector('#modalForm select[name="planId"]');
  if (sel) sel.value = planId;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

async function submitLead(formEl, btnEl, msgEl) {
  const originalText = btnEl.textContent;
  const data = Object.fromEntries(new FormData(formEl));
  btnEl.disabled = true;
  btnEl.textContent = siteData.messages?.sending || 'Sending...';
  msgEl.style.display = 'none';
  try {
    const r = await fetch(API + '/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const d = await r.json();
    msgEl.textContent = d.message;
    msgEl.className = 'form-msg ' + (d.success ? 'success' : 'error');
    msgEl.style.display = 'block';
    if (d.success) {
      formEl.reset();
      btnEl.textContent = siteData.messages?.requestSent || 'REQUEST SENT!';
    } else {
      btnEl.disabled = false;
      btnEl.textContent = siteData.messages?.tryAgain || originalText;
    }
  } catch(e) {
    msgEl.textContent = siteData.messages?.leadNetworkError || 'Network error. Please call us.';
    msgEl.className = 'form-msg error';
    msgEl.style.display = 'block';
    btnEl.disabled = false;
    btnEl.textContent = siteData.messages?.retry || originalText;
  }
}

function submitTrial(e) {
  e.preventDefault();
  submitLead(e.target, document.getElementById('trialSubmit'), document.getElementById('trialMsg'));
}

function submitModal(e) {
  e.preventDefault();
  submitLead(e.target, document.getElementById('modalSubmit'), document.getElementById('modalMsg'));
}

async function submitContact(e) {
  e.preventDefault();
  const formEl = e.target;
  const btnEl = document.getElementById('contactSubmit');
  const msgEl = document.getElementById('contactMsg');
  const originalText = btnEl.textContent;
  const data = Object.fromEntries(new FormData(formEl));
  btnEl.disabled = true;
  btnEl.textContent = siteData.messages?.sending || 'Sending...';
  msgEl.style.display = 'none';
  try {
    const r = await fetch(API + '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const d = await r.json();
    msgEl.textContent = d.message;
    msgEl.className = 'form-msg ' + (d.success ? 'success' : 'error');
    msgEl.style.display = 'block';
    if (d.success) {
      formEl.reset();
      btnEl.textContent = siteData.messages?.messageSent || 'MESSAGE SENT!';
    } else {
      btnEl.disabled = false;
      btnEl.textContent = siteData.messages?.retry || originalText;
    }
  } catch(e) {
    msgEl.textContent = siteData.messages?.contactNetworkError || 'Network error. Please call us.';
    msgEl.className = 'form-msg error';
    msgEl.style.display = 'block';
    btnEl.disabled = false;
    btnEl.textContent = siteData.messages?.retry || originalText;
  }
}

window.addEventListener('scroll', () => {
  const st = document.getElementById('stickyCta');
  if (window.scrollY > 600 && !scrolled) {
    st.classList.add('visible');
    scrolled = true;
  } else if (window.scrollY < 300 && scrolled) {
    st.classList.remove('visible');
    scrolled = false;
  }
});

window.openModal = openModal;
window.openModalWithPlan = openModalWithPlan;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;
window.submitTrial = submitTrial;
window.submitModal = submitModal;
window.submitContact = submitContact;

loadSiteData().catch(error => {
  console.error('Site data load failed', error);
});
