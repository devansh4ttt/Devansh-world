(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  $('#currentYear').textContent = new Date().getFullYear();

  /* ---------- Header: divider appears once the page scrolls ---------- */

  const header = $('.site-header');
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ---------- Mobile navigation ---------- */

  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');

  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  $$('a', navLinks).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => {
    if (!navLinks.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });

  /* ---------- Mark the nav link for the section in view ---------- */

  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('a[href^="#"]:not(.nav-cta)', navLinks).forEach(link => {
          if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $$('main section[id]').forEach(section => navObserver.observe(section));
  }

  /* ---------- Portrait: hide the frame if the file is missing ---------- */

  const portrait = $('.hero-portrait img');
  if (portrait) {
    const hidePortrait = () => { $('.hero-portrait').hidden = true; };
    portrait.addEventListener('error', hidePortrait);
    if (portrait.complete && portrait.naturalWidth === 0) hidePortrait();
  }

  /* ---------- Gallery ---------- */

  const gallery = $('#galleryTrack');
  const galleryHead = $('.gallery-head');
  const galleryFoot = $('.gallery-foot');
  const galleryStatus = $('#galleryStatus');
  const galleryProgress = $('#galleryProgress');
  const prevButton = $('#galleryPrev');
  const nextButton = $('#galleryNext');

  // Photos that loaded successfully. Optional photos only count once they are ready.
  const livePhotos = () => $$('.memory-card', gallery)
    .filter(card => !card.classList.contains('optional-photo') || card.classList.contains('is-ready'));

  function probe(card) {
    return new Promise(resolve => {
      const test = new Image();
      test.onload = () => resolve(true);
      test.onerror = () => resolve(false);
      test.src = $('.memory-image', card).dataset.photo;
    });
  }

  function updateGallery() {
    const count = livePhotos().length;
    galleryStatus.textContent = count === 1 ? '1 photograph' : `${count} photographs`;

    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    const scrollable = maxScroll > 4;
    galleryHead.classList.toggle('is-static', !scrollable);
    galleryFoot.classList.toggle('is-static', !scrollable);
    if (!scrollable) return;

    const visible = (gallery.clientWidth / gallery.scrollWidth) * 100;
    const offset = (gallery.scrollLeft / gallery.scrollWidth) * 100;
    galleryProgress.style.width = `${visible}%`;
    galleryProgress.style.left = `${offset}%`;
    prevButton.disabled = gallery.scrollLeft <= 4;
    nextButton.disabled = gallery.scrollLeft >= maxScroll - 4;
  }

  function scrollGallery(direction) {
    gallery.scrollBy({ left: direction * gallery.clientWidth * 0.8, behavior: scrollBehavior() });
  }
  prevButton.addEventListener('click', () => scrollGallery(-1));
  nextButton.addEventListener('click', () => scrollGallery(1));
  gallery.addEventListener('scroll', () => window.requestAnimationFrame(updateGallery), { passive: true });
  window.addEventListener('resize', updateGallery);

  Promise.all($$('.memory-card', gallery).map(async card => {
    if (await probe(card)) card.classList.add('is-ready');
    else card.remove();
  })).then(() => {
    if (!livePhotos().length) {
      // No photos at all: remove the section and every link to it.
      $('#memories').hidden = true;
      $$('a[href="#memories"]').forEach(link => { link.hidden = true; });
      return;
    }
    updateGallery();
  });

  /* ---------- Photo viewer ---------- */

  const dialog = $('#photoDialog');
  const viewerImage = $('#lightboxImage');
  const viewerCaption = $('#lightboxCaption');
  let photos = [];
  let current = 0;

  function showPhoto(index) {
    current = (index + photos.length) % photos.length;
    const card = photos[current];
    const img = $('img', card);
    viewerImage.src = $('.memory-image', card).dataset.photo;
    viewerImage.alt = img.alt;
    viewerCaption.textContent = `${$('strong', card).textContent}, ${current + 1} of ${photos.length}`;
  }

  function openViewer(card) {
    photos = livePhotos();
    dialog.classList.toggle('is-single', photos.length < 2);
    showPhoto(photos.indexOf(card));
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  gallery.addEventListener('click', event => {
    const button = event.target.closest('.memory-image');
    if (button) openViewer(button.closest('.memory-card'));
  });
  $('#lightboxClose').addEventListener('click', () => dialog.close());
  $('#lightboxPrev').addEventListener('click', () => showPhoto(current - 1));
  $('#lightboxNext').addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (photos.length < 2) return;
    if (event.key === 'ArrowLeft') showPhoto(current - 1);
    if (event.key === 'ArrowRight') showPhoto(current + 1);
  });

  let touchStartX = 0;
  dialog.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
  dialog.addEventListener('touchend', event => {
    if (photos.length < 2) return;
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 55) showPhoto(current + (delta < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- Copy email address ---------- */

  const EMAIL = 'devansh003@yahoo.com';
  const copyStatus = $('#copyStatus');
  let copyTimer;

  $('#copyEmail').addEventListener('click', async () => {
    window.clearTimeout(copyTimer);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(EMAIL);
      copyStatus.textContent = 'Email address copied.';
    } catch {
      copyStatus.textContent = 'Couldn’t copy automatically. Select the address above to copy it.';
    }
    copyTimer = window.setTimeout(() => { copyStatus.textContent = ''; }, 4000);
  });
})();
