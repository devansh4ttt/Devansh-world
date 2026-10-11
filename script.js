(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const body = document.body;

  // Current year
  $('#currentYear').textContent = new Date().getFullYear();

  // Typewriter effect. The reduced-motion toggle stops repeated typing.
  const typedWord = $('#typedWord');
  const words = ['technology', 'Python', 'creative ideas', 'problem-solving', 'learning by doing'];
  let wordIndex = 0;
  let charIndex = words[0].length;
  let deleting = true;
  let typingTimer;
  const reduceMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  function typeNext() {
    if (body.classList.contains('reduce-motion') || reduceMotionPreference.matches) {
      typedWord.textContent = 'technology';
      return;
    }
    const word = words[wordIndex];
    charIndex += deleting ? -1 : 1;
    typedWord.textContent = word.slice(0, Math.max(0, charIndex));
    let delay = deleting ? 36 : 70;
    if (!deleting && charIndex >= word.length) { deleting = true; delay = 1450; }
    else if (deleting && charIndex <= 0) { deleting = false; wordIndex = (wordIndex + 1) % words.length; delay = 260; }
    typingTimer = window.setTimeout(typeNext, delay);
  }
  if (!reduceMotionPreference.matches) typingTimer = window.setTimeout(typeNext, 1100);

  // Scroll reveal, with a safe fallback for older browsers.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotionPreference.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
  } else revealItems.forEach(item => item.classList.add('visible'));

  // Mobile navigation.
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');
  function closeMenu() {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }
  menuToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  $$('.nav-links a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (!navLinks.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  // Scroll progress and back-to-top button are updated together.
  const progress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  let scrollQueued = false;
  function updateScrollUI() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const pct = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    backToTop.classList.toggle('visible', window.scrollY > 650);
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { window.requestAnimationFrame(updateScrollUI); scrollQueued = true; }
  }, { passive: true });
  updateScrollUI();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: body.classList.contains('reduce-motion') ? 'auto' : 'smooth' }));

  // Highlight nav link while its section is in view.
  if ('IntersectionObserver' in window) {
    const sections = $$('main section[id]');
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.nav-links a[href^="#"]').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-32% 0px -58% 0px' });
    sections.forEach(section => navObserver.observe(section));
  }

  // Gallery image status: the six additional photos live beside index.html.
  const gallery = $('#galleryTrack');
  const galleryCards = $$('.memory-card', gallery);
  const galleryStatus = $('#galleryStatus');
  const galleryProgress = $('#galleryProgress');
  const availablePhotos = [];
  galleryCards.forEach((card, index) => {
    const img = $('img', card);
    const button = $('.memory-image', card);
    const src = button.dataset.photo;
    img.addEventListener('load', () => {
      card.classList.remove('is-missing');
      if (!availablePhotos.includes(src)) availablePhotos.push(src);
      updateGalleryStatus();
    });
    img.addEventListener('error', () => {
      if (index > 1) card.classList.add('is-missing');
      updateGalleryStatus();
    });
    // Cached images may have completed before listeners were attached.
    if (img.complete && img.naturalWidth > 0) {
      if (!availablePhotos.includes(src)) availablePhotos.push(src);
    }
    button.addEventListener('click', () => {
      if (card.classList.contains('is-missing') || !img.naturalWidth) return;
      openLightbox(index);
    });
  });

  function updateGalleryStatus() {
    const found = galleryCards.filter(card => {
      const img = $('img', card);
      return img.complete && img.naturalWidth > 0;
    }).length;
    const missing = Math.max(0, galleryCards.length - found);
    galleryStatus.textContent = missing
      ? `${found} photos available · ${missing} files still to add beside index.html`
      : `${found} photos ready · swipe or use arrows to explore`;
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    const pct = maxScroll > 0 ? Math.max(18, (gallery.scrollLeft / maxScroll) * 100) : 100;
    galleryProgress.style.width = `${Math.min(100, pct)}%`;
  }
  function scrollGallery(direction) {
    const firstCard = galleryCards[0];
    const gap = parseFloat(getComputedStyle(gallery).columnGap || '16');
    const amount = firstCard.getBoundingClientRect().width + gap;
    gallery.scrollBy({ left: direction * amount * 2, behavior: body.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
  }
  $('#galleryPrev').addEventListener('click', () => scrollGallery(-1));
  $('#galleryNext').addEventListener('click', () => scrollGallery(1));
  gallery.addEventListener('scroll', () => window.requestAnimationFrame(updateGalleryStatus), { passive: true });
  window.addEventListener('resize', updateGalleryStatus);
  updateGalleryStatus();

  // Accessible image lightbox with previous/next and keyboard controls.
  const dialog = $('#photoDialog');
  const lightboxImage = $('#lightboxImage');
  const lightboxCaption = $('#lightboxCaption');
  let activePhotoIndex = 0;
  const validIndexes = () => galleryCards.map((card, index) => ({ card, index }))
    .filter(({ card }) => { const img = $('img', card); return img.complete && img.naturalWidth > 0; })
    .map(item => item.index);
  function openLightbox(index) {
    activePhotoIndex = index;
    renderLightbox();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function renderLightbox() {
    const valid = validIndexes();
    if (!valid.length) return;
    if (!valid.includes(activePhotoIndex)) activePhotoIndex = valid[0];
    const card = galleryCards[activePhotoIndex];
    const img = $('img', card);
    lightboxImage.src = img.currentSrc || img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = `${$('strong', card).textContent} · ${img.alt}`;
  }
  function changeLightbox(step) {
    const valid = validIndexes();
    if (!valid.length) return;
    let pos = valid.indexOf(activePhotoIndex);
    pos = (pos + step + valid.length) % valid.length;
    activePhotoIndex = valid[pos];
    renderLightbox();
  }
  $('#lightboxClose').addEventListener('click', () => dialog.close());
  $('#lightboxPrev').addEventListener('click', () => changeLightbox(-1));
  $('#lightboxNext').addEventListener('click', () => changeLightbox(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowLeft') changeLightbox(-1);
    if (event.key === 'ArrowRight') changeLightbox(1);
  });
  let touchStartX = 0;
  dialog.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
  dialog.addEventListener('touchend', event => {
    const deltaX = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(deltaX) > 55) changeLightbox(deltaX < 0 ? 1 : -1);
  }, { passive: true });

  // Copy contact address where supported; fallback is the mail app.
  $('#copyEmail').addEventListener('click', async () => {
    const status = $('#copyStatus');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('devansh003@yahoo.com');
      status.textContent = 'Email copied to clipboard.';
    } catch {
      status.textContent = 'Email: devansh003@yahoo.com';
      window.location.href = 'mailto:devansh003@yahoo.com';
    }
  });

  // Accessible motion toggle.
  $('#motionToggle').addEventListener('click', event => {
    const enabled = body.classList.toggle('reduce-motion');
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = enabled ? 'Motion reduced' : 'Reduce motion';
    if (enabled) {
      window.clearTimeout(typingTimer);
      typedWord.textContent = 'technology';
    } else typeNext();
  });
})();
