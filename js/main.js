/* ═══════════════════════════════════════════════════════════════════
   HOUSE OF PRESS — shared behaviour
   One script for every page. Each block checks that its section is
   actually on the page before it does anything.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var PAGE = body.dataset.page || 'home';

  /* If the animation libraries did not arrive, leave the page as plain
     paper-and-ink HTML rather than hiding everything behind dead tweens. */
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    body.classList.remove('is-loading');
    var dead = document.getElementById('loader');
    if (dead) dead.style.display = 'none';
    ['topbar', 'rail'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.opacity = 1;
    });
    return;
  }

  root.classList.add('js');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ─────────────────────────── smooth scroll ─────────────────────── */
  var lenis = null;
  if (!REDUCED && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;   // smooth scroll owns the scroll position; expose it so
                            // anything else that needs to move the page can ask nicely
  }

  /* in-page anchors still glide */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = $(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ══════════════════════ PAGE-TO-PAGE CURTAIN ═════════════════════ */
  var curtain = $('#pagefade');

  function isInternalPage(a) {
    if (a.target === '_blank' || a.hasAttribute('download')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|https?:)/i.test(href)) {
      return a.hostname === window.location.hostname && /\.html?$/i.test(a.pathname);
    }
    return /\.html?$/i.test(href.split(/[?#]/)[0]);
  }

  if (curtain && !REDUCED) {
    $$('a[href]').forEach(function (a) {
      if (!isInternalPage(a)) return;
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        var url = a.href;
        gsap.to(curtain, {
          opacity: 1, duration: .34, ease: 'power2.in',
          onStart: function () { curtain.style.pointerEvents = 'auto'; },
          onComplete: function () { window.location.href = url; }
        });
      });
    });
    // coming back through history must not land behind a raised curtain
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { gsap.set(curtain, { opacity: 0 }); curtain.style.pointerEvents = 'none'; }
    });
  }

  /* ═══════════════════════════ LOADER ══════════════════════════════ */
  /* Full stamping sequence the first time someone arrives; a brief
     paper lift on every page after that, so it never becomes a toll. */
  var loader = $('#loader');
  var seen = false;
  try { seen = sessionStorage.getItem('hop-seen') === '1'; } catch (err) { seen = false; }
  var FULL = !!loader && PAGE === 'home' && !seen && !REDUCED;

  if (loader) {
    try { sessionStorage.setItem('hop-seen', '1'); } catch (err) { /* private mode */ }
  }

  function openSite() {
    body.classList.remove('is-loading');
    if (loader) loader.style.display = 'none';
    gsap.set('#topbar', { opacity: 1 });
    gsap.set('#rail',   { opacity: 1 });
    ScrollTrigger.refresh();
  }

  if (!loader) {
    body.classList.remove('is-loading');
    gsap.set('#topbar', { opacity: 1 });
    gsap.set('#rail',   { opacity: 1 });
  } else {
    runLoader();
  }

  function runLoader() {
    var loaderRule  = $('#loaderRule');
    var loaderPct   = $('#loaderPct');
    var loaderLabel = $('#loaderLabel');
    var meter       = $('.loader__meter');
    var wingTop     = $('.loader__wing--top');
    var wingBot     = $('.loader__wing--bot');
    var word        = $('.loader__word');

    var LABELS = [
      [0,  'Setting the forme'],
      [30, 'Mixing the ink'],
      [58, 'Making ready'],
      [84, 'Pulling a proof'],
      [99, 'Ready']
    ];

    var shown = 0;
    var startedAt = performance.now();
    var MIN_MS = REDUCED ? 200 : (FULL ? 2200 : 620);
    var MAX_MS = 9000;              // never hold the door shut longer than this
    var finished = false;
    var pageLoaded = false;

    window.addEventListener('load', function () { pageLoaded = true; });

    /* Polled rather than event-driven: an <img> that finished before this
       script ran would never fire 'load', and the meter would stall. */
    var imgs = $$('img');
    var total = imgs.length || 1;
    function measure() {
      if (pageLoaded) return 100;
      var n = 0;
      for (var i = 0; i < imgs.length; i++) if (imgs[i].complete) n++;
      return Math.round((n / total) * 100);
    }

    /* intro */
    if (REDUCED) {
      gsap.set([wingTop, wingBot, word], { opacity: 1 });
    } else if (FULL) {
      gsap.timeline()
        .fromTo(wingTop, { y: -110, opacity: 0 }, { y: 0, opacity: 1, duration: .95, ease: 'power3.out' }, 0)
        .fromTo(wingBot, { y:  110, opacity: 0 }, { y: 0, opacity: 1, duration: .95, ease: 'power3.out' }, 0)
        // the platen closes …
        .to(wingTop, { y:  13, duration: .34, ease: 'power2.in' }, .8)
        .to(wingBot, { y: -13, duration: .34, ease: 'power2.in' }, .8)
        // … and the type bites the paper
        .fromTo(word,
          { opacity: 0, scale: 1.16, filter: 'blur(7px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .5, ease: 'power4.out' }, 1.1)
        .to([wingTop, wingBot], { y: 0, duration: .75, ease: 'elastic.out(1,.55)' }, 1.16);
    } else {
      // returning visitor: the mark is simply already on the sheet
      gsap.fromTo([wingTop, word, wingBot],
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: .4, stagger: .05, ease: 'power2.out' });
    }

    var lastFrame = performance.now();

    function paint(now) {
      now = now || performance.now();
      var dt = Math.min(0.12, (now - lastFrame) / 1000);
      lastFrame = now;

      var age = now - startedAt;
      var target = age >= MAX_MS ? 100 : measure();

      // never stall: creep forward with time, but never overtake the truth by much
      var elapsed = age / MIN_MS;
      var floor = Math.min(96, elapsed * 96);
      var goal = Math.max(Math.min(target, 100), Math.min(floor, target + 18));
      shown += (goal - shown) * (1 - Math.exp(-6 * dt));   // frame-rate independent

      var v = Math.min(100, Math.round(shown));
      if (loaderPct) loaderPct.textContent = v;
      if (loaderRule) loaderRule.style.width = v + '%';

      if (loaderLabel) {
        for (var i = LABELS.length - 1; i >= 0; i--) {
          if (v >= LABELS[i][0]) {
            if (loaderLabel.textContent !== LABELS[i][1]) loaderLabel.textContent = LABELS[i][1];
            break;
          }
        }
      }

      if (target >= 100 && age >= MIN_MS && v >= 99 && !finished) {
        finished = true;
        closeLoader();
        return;
      }
      requestAnimationFrame(paint);
    }

    function closeLoader() {
      gsap.timeline({ onComplete: openSite })
        .to(meter, { opacity: 0, duration: .3, ease: 'power1.out' }, 0)
        .to(loader, {
          yPercent: -102,
          duration: REDUCED ? .01 : (FULL ? 1.15 : .8),
          ease: 'power3.inOut'
        }, .22)
        .to('#topbar', { opacity: 1, duration: .7, ease: 'power2.out' }, FULL ? .9 : .5)
        .to('#rail',   { opacity: 1, duration: .7, ease: 'power2.out' }, FULL ? 1.0 : .58);
    }

    requestAnimationFrame(paint);
  }

  /* ═════════════════════════ HOME · HERO ═══════════════════════════ */
  var heroMedia = $('#heroMedia');
  var heroImg   = $('#heroImg');

  if (heroMedia && heroImg) {
    var heroCue = $('#heroCue');

    /* Where the broadside sits inside the workshop artwork,
       as a fraction of the image. Measured off the source file. */
    var POSTER = { x: 0.3516, y: 0.2164, w: 0.2841, h: 0.4926 };

    var heroZoom = function () {
      var W = heroMedia.clientWidth || window.innerWidth;
      var H = heroMedia.clientHeight || window.innerHeight;
      var iw = heroImg.naturalWidth  || 2560;
      var ih = heroImg.naturalHeight || 1975;

      var cover = Math.max(W / iw, H / ih);
      var dispW = iw * cover, dispH = ih * cover;

      var pw  = dispW * POSTER.w;
      var ph  = dispH * POSTER.h;
      var pcx = dispW * (POSTER.x + POSTER.w / 2);
      var pcy = dispH * (POSTER.y + POSTER.h / 2);

      // frame the broadside so it stands tall but still fits the screen —
      // on a phone the height alone would push it past both edges
      var s = Math.min((H * 0.94) / ph, (W * 0.90) / pw);
      s = Math.max(1.02, Math.min(s, 4));

      return { s: s, x: s * (dispW / 2 - pcx), y: s * (dispH / 2 - pcy) };
    };

    var mask = { r: 150 };
    var paintMask = function () {
      heroMedia.style.clipPath = 'circle(' + mask.r + '% at 50% 50%)';
    };

    /* the chrome inverts while it sits over the artwork */
    body.classList.add('over-media');
    var setOverMedia = function (on) { body.classList.toggle('over-media', on); };

    gsap.timeline({
      scrollTrigger: {
        trigger: '#home', start: 'top top', end: 'bottom bottom',
        scrub: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { setOverMedia(self.progress < 0.74); },
        onLeave: function () { setOverMedia(false); },
        onLeaveBack: function () { setOverMedia(true); }
      }
    })
      .fromTo(heroImg,
        { scale: function () { return heroZoom().s; },
          x:     function () { return heroZoom().x; },
          y:     function () { return heroZoom().y; } },
        { scale: 1, x: 0, y: 0, duration: 60, ease: 'none' }, 0)

      .to(heroCue, { opacity: 0, duration: 10, ease: 'power1.out' }, 2)

      /* the scene closes into a circle and lifts away, handing the page
         back to bare paper for the work that follows */
      .to(mask,      { r: 0,          duration: 32, ease: 'power2.inOut', onUpdate: paintMask }, 64)
      .to(heroImg,   { scale: .88,    duration: 32, ease: 'power2.inOut' }, 64)
      .to(heroMedia, { yPercent: -7,  duration: 32, ease: 'power2.inOut' }, 64);
  }

  /* ═════════ HOME · THE WORK — drawn in ink, then painted ══════════ */
  var mm = gsap.matchMedia();

  if ($('#process')) {
    mm.add('(min-width: 821px)', function () {
      var steps = $$('#process .step');
      if (!steps.length) return;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#process', start: 'top top', end: 'bottom bottom',
          scrub: 1, invalidateOnRefresh: true
        }
      });

      var SPAN = 100 / steps.length;

      steps.forEach(function (st, i) {
        var art    = $('.step__art', st);
        var line   = $('.step__line', st);
        var paint  = $('.step__paint', st);
        var plaque = $('.plaque', st);
        var at     = i * SPAN;
        var last   = i === steps.length - 1;

        /* the drawing arrives under a soft-edged wipe, as if the nib
           were travelling down the sheet */
        var wipe = { v: i === 0 ? 34 : -18 };
        function stroke() {
          var g = 'linear-gradient(to bottom, #000 0%, #000 ' + wipe.v +
                  '%, rgba(0,0,0,0) ' + (wipe.v + 16) + '%)';
          line.style.webkitMaskImage = g;
          line.style.maskImage = g;
        }
        stroke();

        // step one is already part-drawn as its section scrolls into the pin
        gsap.set(line,   { opacity: i === 0 ? 1 : 0 });
        gsap.set(paint,  { opacity: 0 });
        gsap.set(plaque, { opacity: 0, y: 26 });

        tl.fromTo(art, { scale: 1.035, y: 14 },
                       { scale: 1, y: 0, duration: 26, ease: 'none' }, at);

        if (i !== 0) tl.to(line, { opacity: 1, duration: 2, ease: 'none' }, at);
        tl.to(wipe, { v: 116, duration: 14, ease: 'power1.inOut', onUpdate: stroke }, at);

        // and then the colour is laid over it
        tl.to(paint,  { opacity: 1, duration: 11, ease: 'power2.out' }, at + 11);
        tl.to(line,   { opacity: 0, duration: 9,  ease: 'power2.out' }, at + 14);
        tl.to(plaque, { opacity: 1, y: 0, duration: 10, ease: 'power2.out' }, at + 15);

        if (!last) {
          var out = (i + 1) * SPAN - 5;
          tl.to(paint,  { opacity: 0, duration: 5, ease: 'power2.in' }, out);
          tl.to(art,    { y: -34,     duration: 5, ease: 'power2.in' }, out);
          tl.to(plaque, { opacity: 0, y: -22, duration: 5, ease: 'power2.in' }, out);
        }
      });

      var ticks = $$('.step__tick');
      var st = ScrollTrigger.create({
        trigger: '#process', start: 'top top', end: 'bottom bottom',
        onUpdate: function (self) {
          var i = Math.max(0, Math.min(steps.length - 1,
                  Math.floor(self.progress * steps.length * 1.001)));
          ticks.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
        }
      });

      return function () {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill(); st.kill();
        $$('#process .step__line').forEach(function (l) {
          l.style.webkitMaskImage = ''; l.style.maskImage = '';
        });
      };
    });

    /* Phones get the same idea without the pin. Each step plays once as it
       comes into view: the drawing strokes on, the colour is laid over it.
       Scrubbing a pinned scene through a thumb drag is miserable; a short
       timeline that fires on entry is not. */
    mm.add('(max-width: 820px)', function () {
      var steps = $$('#process .step');
      if (!steps.length) return;
      var made = [];

      steps.forEach(function (st) {
        var line   = $('.step__line', st);
        var paint  = $('.step__paint', st);
        var plaque = $('.plaque', st);
        if (!line || !paint) return;

        var wipe = { v: -16 };
        function stroke() {
          var g = 'linear-gradient(to bottom, #000 0%, #000 ' + wipe.v +
                  '%, rgba(0,0,0,0) ' + (wipe.v + 18) + '%)';
          line.style.webkitMaskImage = g;
          line.style.maskImage = g;
        }
        stroke();

        // the stylesheet hides the drawing by default, so a phone with no JS
        // still gets the finished painting rather than a blank frame
        gsap.set(line,   { display: 'block', opacity: 1 });
        gsap.set(paint,  { opacity: 0 });
        gsap.set(plaque, { opacity: 0, y: 18 });

        var tl = gsap.timeline({
          scrollTrigger: { trigger: st, start: 'top 72%', once: true }
        });
        tl.to(wipe,   { v: 116, duration: 1.05, ease: 'power1.inOut', onUpdate: stroke }, 0)
          .to(paint,  { opacity: 1, duration: .8,  ease: 'power2.out' }, .72)
          .to(line,   { opacity: 0, duration: .55, ease: 'power2.out' }, .95)
          .to(plaque, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' }, 1.1);

        made.push(tl);
      });

      return function () {
        made.forEach(function (tl) {
          if (tl.scrollTrigger) tl.scrollTrigger.kill();
          tl.kill();
        });
        $$('#process .step__line').forEach(function (l) {
          l.style.webkitMaskImage = ''; l.style.maskImage = '';
          l.style.display = ''; l.style.opacity = '';
        });
        gsap.set('#process .step__paint, #process .plaque', { clearProps: 'all' });
      };
    });
  }

  /* ══════════ HOME · the two-panel split, gently parallaxed ════════ */
  /* The reference runs video in each half. There is no footage here, so the
     images drift inside their panels instead — enough that the split reads
     as alive rather than as two flat crops. */
  if ($('.split') && !REDUCED) {
    $$('.split__media').forEach(function (m, i) {
      gsap.fromTo(m,
        { yPercent: -5 },
        {
          yPercent: 5, ease: 'none',
          scrollTrigger: {
            trigger: '.split', start: 'top bottom', end: 'bottom top',
            scrub: 0.6, invalidateOnRefresh: true
          }
        });
    });
  }

  /* ═══════════ PORTFOLIO · the work, drifting past ═════════════════ */
  /* Runs at every width — the drift is the page. A phone gets a compressed
     version of the same field (see --ts / --ws in the stylesheet), not a
     static grid. */
  if ($('#field')) {
    /* Built once, mounted per breakpoint. The only difference is the scrub:
       a phone scrolls on native momentum, and a long catch-up makes the tiles
       feel detached from the thumb, so mobile gets a much shorter one. */
    function buildField(scrub) {
      var tiles = $$('#field .ftile').filter(function (t) {
        return getComputedStyle(t).display !== 'none';
      });
      if (!tiles.length) return;

      /* Every tile travels the same scroll distance, but multiplied by its own
         --sp, so they slide past one another instead of moving as one sheet.
         Function-based so a resize re-measures rather than drifting out. */
      var travel = function () {
        var sec = $('#field');
        return sec.offsetHeight - window.innerHeight;
      };

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#field', start: 'top top', end: 'bottom bottom',
          scrub: scrub, invalidateOnRefresh: true
        }
      });

      tiles.forEach(function (el) {
        var sp = parseFloat(getComputedStyle(el).getPropertyValue('--sp')) || 1;
        tl.fromTo(el,
          { y: 0 },
          { y: function () { return -travel() * sp; }, duration: 100, ease: 'none' }, 0);
      });

      return function () {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        gsap.set(tiles, { clearProps: 'transform' });
      };
    }

    mm.add('(min-width: 821px)', function () { return buildField(1.1); });
    mm.add('(max-width: 820px)', function () { return buildField(0.4); });
  }

  /* ════════════════ HISTORY · ANNOTATED PRESS PLATE ════════════════ */
  if ($('#diagram')) {
    mm.add('(min-width: 821px)', function () {
      var dImg  = $('#diagramImg');
      var lines = $$('.dline');
      var tags  = $$('.tag');
      if (!dImg) return;

      /* The viewBox is stretched and the stroke is non-scaling, so the dash
         pattern is measured in screen pixels, not user units — getTotalLength()
         would give a dash a fraction of the drawn line and leave it ticked. */
      function sizeLines() {
        lines.forEach(function (ln) {
          var r = ln.getBoundingClientRect();
          var L = Math.round(Math.sqrt(r.width * r.width + r.height * r.height));
          if (!L || !isFinite(L)) L = 120;
          ln.dataset.len = L;
          gsap.set(ln, { strokeDasharray: L });
        });
      }
      sizeLines();
      ScrollTrigger.addEventListener('refresh', sizeLines);

      var ins = tags.map(function (t) {
        var el = $('.tag__in', t);
        gsap.set(el, { opacity: 0, x: t.classList.contains('tag--l') ? 18 : -18 });
        return el;
      });

      /* The press comes down onto the page from the top: nothing is struck to
         begin with, the sheet fills from its top edge downwards, and the plate
         settles the last few pixels as it lands. */
      var reveal = { v: 100 };
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#diagram', start: 'top top', end: 'bottom bottom',
          scrub: 1, invalidateOnRefresh: true
        }
      });

      tl.fromTo('.diagram__cap', { opacity: 0, y: 16 },
                                 { opacity: 1, y: 0, duration: 14, ease: 'power2.out' }, 4)
        .to(reveal, {
          v: 0, duration: 28, ease: 'power1.inOut',
          onUpdate: function () { dImg.style.clipPath = 'inset(0% 0% ' + reveal.v + '% 0%)'; }
        }, 0)
        .fromTo(dImg, { y: -26 }, { y: 0, duration: 30, ease: 'power2.out' }, 0)
        .fromTo(lines,
          { strokeDashoffset: function (i, el) { return +el.dataset.len || 120; } },
          { strokeDashoffset: 0, duration: 11, stagger: 4.5, ease: 'power2.out' }, 32)
        .to(ins,   { opacity: 1, x: 0,    duration: 10, stagger: 4.5, ease: 'power2.out' }, 36);

      dImg.style.clipPath = 'inset(0% 0% 100% 0%)';

      return function () {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        ScrollTrigger.removeEventListener('refresh', sizeLines);
        dImg.style.clipPath = '';
        gsap.set(ins, { clearProps: 'all' });
        gsap.set(lines, { clearProps: 'all' });
      };
    });

    /* On a phone the callouts have no margin to live in, so the stylesheet
       drops them — but the press should still be struck onto the page rather
       than just sitting there. Same top-down reveal, played once on entry. */
    mm.add('(max-width: 820px)', function () {
      var dImg = $('#diagramImg');
      var cap  = $('.diagram__cap');
      if (!dImg) return;

      var reveal = { v: 100 };
      function paint() { dImg.style.clipPath = 'inset(0% 0% ' + reveal.v + '% 0%)'; }
      paint();
      gsap.set(cap, { opacity: 0, y: 12 });

      var tl = gsap.timeline({
        scrollTrigger: { trigger: '#diagram', start: 'top 68%', once: true }
      });
      tl.to(reveal, { v: 0, duration: 1.3, ease: 'power1.inOut', onUpdate: paint }, 0)
        .fromTo(dImg, { y: -18 }, { y: 0, duration: 1.4, ease: 'power2.out' }, 0)
        .to(cap, { opacity: 1, y: 0, duration: .6, ease: 'power2.out' }, .9);

      return function () {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        dImg.style.clipPath = '';
        gsap.set([dImg, cap], { clearProps: 'all' });
      };
    });
  }

  /* ═══════════════════════ REVEAL ON SCROLL ════════════════════════ */
  if (REDUCED) {
    gsap.set('.reveal', { opacity: 1, y: 0 });
  } else if ($('.reveal')) {
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0, duration: 1.05,
          stagger: 0.09, ease: 'power3.out', overwrite: true
        });
      }
    });

    /* Safety net: a jump straight down the page (deep link, End key, a fast
       flick) can skip past a batch's start. Anything already at or above the
       fold gets shown outright rather than staying invisible. */
    var catchUp = function () {
      var line = window.innerHeight * 0.88;
      var stragglers = $$('.reveal').filter(function (el) {
        return gsap.getProperty(el, 'opacity') < 1 &&
               el.getBoundingClientRect().top < line;
      });
      if (stragglers.length) {
        gsap.to(stragglers, { opacity: 1, y: 0, duration: .6, ease: 'power2.out', overwrite: true });
      }
    };
    ScrollTrigger.addEventListener('refresh', catchUp);
    var settle;
    window.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(catchUp, 220);
    }, { passive: true });
  }

  /* ══════════════════════════ RAIL STATE ═══════════════════════════ */
  $$('.rail__list a').forEach(function (a) {
    a.classList.toggle('is-on', a.dataset.rail === PAGE);
  });

  /* ═══════════════════════════ CONTACT ═════════════════════════════ */
  /* ▸ Studio address — change this one line (and the two links in the
       contact panel of contact.html) when the real inbox is decided. */
  var STUDIO_EMAIL = 'hello@houseofpress.in';

  var form = $('#contactForm');
  var note = $('#formNote');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // note: form.name is the form's own name attribute, not the field —
      // the fields have to be read off the elements collection.
      var f = form.elements;
      var name  = f.namedItem('name').value.trim();
      var email = f.namedItem('email').value.trim();

      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = 'A name and a working email, please — then we can begin.';
        return;
      }

      var mail = 'Name: ' + name +
                 '\nEmail: ' + email +
                 '\nNeeds: ' + f.namedItem('need').value.trim() +
                 '\n\n' + f.namedItem('message').value.trim();

      // No form backend yet — hand the enquiry to the visitor's mail client.
      window.location.href = 'mailto:' + STUDIO_EMAIL +
        '?subject=' + encodeURIComponent('Letterpress enquiry — ' + name) +
        '&body=' + encodeURIComponent(mail);
      note.textContent = 'Opening your mail app — send it and we will write back.';
    });
  }

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ═════════════════════════ HOUSEKEEPING ══════════════════════════ */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { ScrollTrigger.refresh(); }, 180);
  });

})();
