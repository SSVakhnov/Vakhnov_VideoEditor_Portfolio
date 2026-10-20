/* Portfolio interactions. Dependencies: Swiper, WOW and Typed.js. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const header = document.querySelector('#header-sticky');
  const menu = document.querySelector('#mobile-menu');
  const toggle = document.querySelector('.sidebar__toggle');
  const backTop = document.querySelector('#back-top');
  let typed;
  let slider;
  function closeMenu(restoreFocus = false) {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus) toggle.focus();
  }
  if (header && menu && toggle) {
    header.classList.add('navigation-ready');
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      const target = document.querySelector(link.hash || '#top');
      closeMenu();
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(header.classList.contains('menu-open')); });
    document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
    matchMedia('(min-width: 1200px)').addEventListener('change', () => closeMenu());
  }
  let scrollPending = false;
  function updateScroll() {
    header?.classList.toggle('sticky', scrollY > 80);
    backTop?.classList.toggle('show', scrollY > 600);
    scrollPending = false;
  }
  addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  updateScroll();
  backTop?.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: motion.matches ? 'instant' : 'smooth' });
    document.querySelector('.header-logo')?.focus({ preventScroll: true });
  });
  const sliderElement = document.querySelector('.testimonial-slider');
  if (sliderElement && window.Swiper) {
    slider = new Swiper(sliderElement, {
      spaceBetween: 30, speed: motion.matches ? 0 : 600, loop: true,
      effect: 'cards', cardsEffect: { perSlideOffset: 6, perSlideRotate: 1, slideShadows: false },
      grabCursor: true, autoplay: false,
      pagination: { el: '.dot', clickable: true },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: { enabled: true, paginationBulletMessage: 'Show review {{index}}' },
    });
  }
  const typedElement = document.querySelector('.type-text');
  function applyMotion() {
    typed?.destroy();
    typed = undefined;
    if (typedElement) {
      typedElement.innerHTML = '<span class="highlight">Video</span> Editor';
      typedElement.setAttribute('aria-label', 'Video editor, motion designer, AI video creator and sound designer');
      if (!motion.matches && window.Typed) {
        // Typed 2.0.12 reuses initial element content on every loop. Keep the
        // static fallback above, but clear it before creating the animation.
        typedElement.textContent = '';
        typed = new Typed(typedElement, {
          strings: ['<span class="highlight">Video</span> Editor', '<span class="highlight">Motion</span> Designer', '<span class="highlight">AI Video</span> Creator', '<span class="highlight">Sound</span> Designer'],
          typeSpeed: 65, backSpeed: 35, backDelay: 2400, loop: true, showCursor: false,
        });
      }
    }
    if (slider) slider.params.speed = motion.matches ? 0 : 600;
  }
  applyMotion();
  motion.addEventListener('change', applyMotion);
  if (!motion.matches && window.WOW) new WOW({ mobile: false }).init();
  // Keep final numbers in the HTML. Animate once when visible, without jQuery.
  if (!motion.matches && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        counterObserver.unobserve(entry.target);
        const element = entry.target;
        const finalText = element.textContent.trim();
        const target = Number(finalText);
        if (!Number.isFinite(target)) return;
        const decimals = (finalText.split('.')[1] || '').length;
        let started;
        function drawCounter(now) {
          started ??= now;
          const progress = Math.min(1, (now - started) / 1000);
          if (motion.matches || progress === 1) {
            element.textContent = finalText;
            return;
          }
          element.textContent = (target * (1 - Math.pow(1 - progress, 3))).toFixed(decimals);
          requestAnimationFrame(drawCounter);
        }
        requestAnimationFrame(drawCounter);
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.count').forEach(element => counterObserver.observe(element));
  }

  // oEmbed returns dimensions without accessing the cross-origin player DOM.
  // HTML width/height attributes reserve the right space even without a network.
  const videos = document.querySelectorAll('.project-grid iframe');
  function setVideoDimensions(iframe, width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const column = iframe.closest('.project-items')?.parentElement;
    if (!column) return;
    column.style.setProperty('--video-ratio', `${width} / ${height}`);
    column.style.setProperty('--video-aspect', String(width / height));
    iframe.width = String(width);
    iframe.height = String(height);
  }
  async function refreshVideoDimensions(iframe) {
    const url = new URL(iframe.src);
    if (url.origin !== 'https://player.vimeo.com') return;
    const match = url.pathname.match(/^\/video\/(\d+)$/);
    if (!match) return;
    const videoURL = new URL(`https://vimeo.com/${match[1]}`);
    // Retain an unlisted-video hash if a future embed needs one.
    if (url.searchParams.has('h')) videoURL.pathname += `/${url.searchParams.get('h')}`;
    const endpoint = new URL('https://vimeo.com/api/oembed.json');
    endpoint.searchParams.set('url', videoURL.href);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) return;
      const metadata = await response.json();
      setVideoDimensions(iframe, Number(metadata.width), Number(metadata.height));
    } catch {
      // Keep the verified dimensions in the HTML when Vimeo is unavailable.
    } finally { clearTimeout(timeout); }
  }
  videos.forEach(iframe => setVideoDimensions(iframe, Number(iframe.getAttribute('width')), Number(iframe.getAttribute('height'))));
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        videoObserver.unobserve(entry.target);
        refreshVideoDimensions(entry.target);
      });
    }, { rootMargin: '600px' });
    videos.forEach(iframe => videoObserver.observe(iframe));
  } else { videos.forEach(refreshVideoDimensions); }

  // Templates keep unopened categories free of player and oEmbed requests.
  // Keep mounted players on re-open, and pause them when their category closes.
  document.querySelectorAll('.work-category').forEach(category => {
    const panel = category.querySelector('.work-category-panel');
    const template = category.querySelector('.work-videos-template');
    if (!panel || !template) return;
    function syncCategory() {
      if (category.open && !panel.childElementCount) {
        panel.append(template.content.cloneNode(true));
        panel.querySelectorAll('iframe').forEach(iframe => {
          setVideoDimensions(iframe, Number(iframe.width), Number(iframe.height));
          refreshVideoDimensions(iframe);
        });
      }
      if (!category.open) {
        panel.querySelectorAll('iframe').forEach(iframe => {
          iframe.contentWindow?.postMessage({ method: 'pause' }, 'https://player.vimeo.com');
        });
      }
    }
    category.addEventListener('toggle', syncCategory);
    // Also supports a category deliberately given the open attribute in HTML.
    if (category.open) syncCategory();
  });

  const inner = document.querySelector('.cursor-inner');
  const outer = document.querySelector('.cursor-outer');
  let pointerFrame = 0;
  let x = 0;
  let y = 0;
  if (inner && outer) {
    document.addEventListener('pointermove', event => {
      if (!pointer.matches || motion.matches) return;
      x = event.clientX; y = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
        inner.style.transform = outer.style.transform = `translate(${x}px, ${y}px)`;
        inner.style.visibility = outer.style.visibility = 'visible';
        pointerFrame = 0;
      });
    }, { passive: true });
    document.addEventListener('pointerover', event => {
      const hover = Boolean(event.target.closest('a, button, summary'));
      inner.classList.toggle('cursor-hover', hover);
      outer.classList.toggle('cursor-hover', hover);
    });
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget || event.relatedTarget.tagName === 'IFRAME') inner.style.visibility = outer.style.visibility = 'hidden';
    });
  }
})();
