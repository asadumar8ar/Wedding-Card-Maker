/* =====================================================================
   SCRIPT.JS  —  Shaadi Card Maker
   ---------------------------------------------------------------------
   Two parts:
     1. CARD ENGINE  (between /*ENGINE_START* / and /*ENGINE_END* /)
        → this exact block is extracted and inlined into the downloaded file
     2. EDITOR CODE  (everything AFTER the END marker)
        → stays on the website only
   ===================================================================== */


/*ENGINE_START*/
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     STRINGS  (UI labels, translated by language select)
     --------------------------------------------------------------- */
  var STR = {
    hinglish: {
      tapToOpen: 'Tap to open',
      weds: 'weds',
      days: 'Din',
      hours: 'Ghante',
      minutes: 'Minute',
      seconds: 'Second',
      countdownTitle: 'Shubh Ghadi',
      countdownDone: 'Aaj ka din hai!',
      countdownPast: 'Dhanyavaad',
      eventsTitle: 'Shaadi ke rang',
      messageTitle: 'Nimantran',
      venueTitle: 'Aapka swagat hai',
      openInMaps: 'Open in Maps',
      rsvpWhatsapp: 'RSVP on WhatsApp',
      withLove: 'With love',
      rsvpMessage:
        'Namaste! Main aapke shaadi ke invitation ke liye RSVP karna chahta/chahti hoon.'
    },
    hindi: {
      tapToOpen: 'Kholne ke liye tap karein',
      weds: 'ka vivah',
      days: 'दिन',
      hours: 'घंटे',
      minutes: 'मिनट',
      seconds: 'सेकंड',
      countdownTitle: 'शुभ घड़ी',
      countdownDone: 'आज का दिन है!',
      countdownPast: 'धन्यवाद',
      eventsTitle: 'शादी के रंग',
      messageTitle: 'निमंत्रण',
      venueTitle: 'आपका स्वागत है',
      openInMaps: 'नक्शे में खोलें',
      rsvpWhatsapp: 'व्हाट्सएप पर RSVP',
      withLove: 'सप्रेम',
      rsvpMessage:
        'नमस्ते! मैं आपके विवाह के निमंत्रण के लिए RSVP करना चाहता/चाहती हूँ।'
    },
    english: {
      tapToOpen: 'Tap to open',
      weds: 'weds',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      countdownTitle: 'The Auspicious Hour',
      countdownDone: 'The day is here!',
      countdownPast: 'Thank you',
      eventsTitle: 'Wedding Celebrations',
      messageTitle: 'Invitation',
      venueTitle: 'You are invited',
      openInMaps: 'Open in Maps',
      rsvpWhatsapp: 'RSVP on WhatsApp',
      withLove: 'With love',
      rsvpMessage:
        'Hello! I would like to RSVP for your wedding invitation.'
    }
  };


  /* ---------------------------------------------------------------
     HELPERS
     --------------------------------------------------------------- */
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initial(name) {
    var t = String(name == null ? '' : name).trim();
    return t ? t.charAt(0).toUpperCase() : '·';
  }

  function pad2(n) {
    return String(n).length === 1 ? '0' + n : String(n);
  }

  function parseDate(dateStr, timeStr) {
    if (!dateStr) return null;
    var p = String(dateStr).split('-');
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10) - 1;
    var d = parseInt(p[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    var hh = 0, mm = 0;
    if (timeStr) {
      var tp = String(timeStr).split(':');
      if (tp.length >= 2) {
        hh = parseInt(tp[0], 10) || 0;
        mm = parseInt(tp[1], 10) || 0;
      }
    }
    var dt = new Date(y, m, d, hh, mm, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatEventDate(s) {
    if (!s) return '';
    var p = String(s).split('-');
    if (p.length !== 3) return s;
    var months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = parseInt(p[2], 10);
    var m = parseInt(p[1], 10) - 1;
    if (isNaN(d) || m < 0 || m > 11) return s;
    return pad2(d) + ' ' + months[m] + ' ' + p[0];
  }

  function waLink(phone, msg) {
    if (!phone) return '';
    var digits = String(phone).replace(/\D/g, '');
    if (!digits) return '';
    return 'https://wa.me/' + digits +
           '?text=' + encodeURIComponent(msg || '');
  }

  function letterSpans(text) {
    var str = String(text == null ? '' : text);
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === ' ') {
        out += '<span style="--i:' + i + '">&nbsp;</span>';
      } else {
        out += '<span style="--i:' + i + '">' + esc(ch) + '</span>';
      }
    }
    return '<span class="letters">' + out + '</span>';
  }

  function lotusSvg() {
    return '' +
      '<svg class="blessing-symbol" viewBox="0 0 120 120" ' +
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="cardBlessGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#f3e0a1"/>' +
            '<stop offset="50%" stop-color="#d4af37"/>' +
            '<stop offset="100%" stop-color="#8f6f1d"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<g fill="none" stroke="url(#cardBlessGrad)" stroke-width="1.5" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="60" cy="60" r="52" opacity="0.45"/>' +
          '<circle cx="60" cy="60" r="46" opacity="0.25"/>' +
          '<path d="M60,22 C52,42 52,56 60,68 C68,56 68,42 60,22 Z"/>' +
          '<path d="M60,68 C48,64 38,54 33,40 C47,46 56,56 60,68 Z"/>' +
          '<path d="M60,68 C72,64 82,54 87,40 C73,46 64,56 60,68 Z"/>' +
          '<path d="M33,40 C24,50 19,64 27,78 C36,70 36,55 33,40 Z"/>' +
          '<path d="M87,40 C96,50 101,64 93,78 C84,70 84,55 87,40 Z"/>' +
          '<path d="M27,78 Q60,98 93,78"/>' +
          '<path d="M32,86 Q60,104 88,86"/>' +
          '<circle cx="60" cy="60" r="2.5" fill="url(#cardBlessGrad)" ' +
            'stroke="none"/>' +
        '</g>' +
      '</svg>';
  }


  /* ---------------------------------------------------------------
     SCENE BUILDERS
     --------------------------------------------------------------- */
  function sceneBlessing(data, S) {
    var kicker = data.blessing || '';
    var headline = data.headline || 'Shubh Vivah';
    return '' +
      '<section class="scene scene-blessing" data-cut="fade">' +
        '<div class="anim" style="--anim-delay: 100;">' +
          lotusSvg() +
        '</div>' +
        (kicker
          ? '<p class="blessing-text anim" style="--anim-delay: 300;">' +
              esc(kicker) + '</p>'
          : '') +
        '<h1 class="shubh-title gold-shimmer anim" ' +
          'style="--anim-delay: 500;">' + esc(headline) + '</h1>' +
        '<span class="gold-line"></span>' +
      '</section>';
  }

  function sceneNames(data, S) {
    var bride = data.brideName || 'Bride';
    var groom = data.groomName || 'Groom';
    var visual = data.photoDataUrl
      ? '<img src="' + esc(data.photoDataUrl) + '" alt="' +
          esc(bride + ' and ' + groom) + '">'
      : '<div class="couple-monogram">' +
          esc(initial(bride)) +
          '<span class="amp">&amp;</span>' +
          esc(initial(groom)) +
        '</div>';
    return '' +
      '<section class="scene scene-names" data-cut="wipe">' +
        '<div class="couple-visual anim" style="--anim-delay: 200;">' +
          visual +
        '</div>' +
        '<div class="names-wrap">' +
          '<h2 class="name-line gold-text">' + letterSpans(bride) + '</h2>' +
          '<div class="weds-word anim" style="--anim-delay: 1200;">' +
            esc(S.weds) + '</div>' +
          '<h2 class="name-line gold-text">' + letterSpans(groom) + '</h2>' +
        '</div>' +
        (data.brideFamily
          ? '<p class="parents-line anim" style="--anim-delay: 1600;">' +
              esc(data.brideFamily) + '</p>'
          : '') +
        (data.groomFamily
          ? '<p class="parents-line anim" style="--anim-delay: 1750;">' +
              esc(data.groomFamily) + '</p>'
          : '') +
      '</section>';
  }

  function sceneMessage(data, S) {
    var raw = String(data.message || '').split(/\n\s*\n/);
    var paras = [];
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i].trim();
      if (p) {
        paras.push('<p>' + esc(p).replace(/\n/g, '<br>') + '</p>');
      }
    }
    return '' +
      '<section class="scene scene-message" data-cut="zoom">' +
        '<p class="scene-kicker anim" style="--anim-delay: 100;">' +
          esc(S.messageTitle) + '</p>' +
        '<span class="gold-line"></span>' +
        '<div class="message-body anim" style="--anim-delay: 400;">' +
          paras.join('') +
        '</div>' +
      '</section>';
  }

  function sceneEvents(data, S) {
    var events = data.events || [];
    var cards = '';
    for (var i = 0; i < events.length; i++) {
      var ev = events[i] || {};
      var metaParts = [];
      if (ev.date) metaParts.push(formatEventDate(ev.date));
      if (ev.time) metaParts.push(ev.time);
      if (ev.venue) metaParts.push(ev.venue);
      var meta = metaParts.join(' • ');
      cards +=
        '<div class="event-card anim" style="--anim-delay:' +
          (300 + i * 120) + ';">' +
          '<div class="event-icon">' + esc(ev.emoji || '✨') + '</div>' +
          '<div>' +
            '<h3 class="event-name">' + esc(ev.name || 'Event') + '</h3>' +
            (meta ? '<p class="event-meta">' + esc(meta) + '</p>' : '') +
            (ev.note ? '<p class="event-note">' + esc(ev.note) + '</p>' : '') +
          '</div>' +
        '</div>';
    }
    return '' +
      '<section class="scene scene-events" data-cut="curtain">' +
        '<p class="scene-kicker anim" style="--anim-delay: 100;">' +
          esc(S.eventsTitle) + '</p>' +
        '<span class="gold-line"></span>' +
        '<div class="events-wrap">' + cards + '</div>' +
      '</section>';
  }

  function sceneCountdown(data, S) {
    return '' +
      '<section class="scene scene-countdown" data-cut="fade">' +
        '<p class="scene-kicker anim" style="--anim-delay: 100;">' +
          esc(S.countdownTitle) + '</p>' +
        '<span class="gold-line"></span>' +
        '<div class="countdown-grid" data-countdown>' +
          '<div class="countdown-cell">' +
            '<span class="countdown-num" data-cd-d>00</span>' +
            '<span class="countdown-label">' + esc(S.days) + '</span>' +
          '</div>' +
          '<div class="countdown-cell">' +
            '<span class="countdown-num" data-cd-h>00</span>' +
            '<span class="countdown-label">' + esc(S.hours) + '</span>' +
          '</div>' +
          '<div class="countdown-cell">' +
            '<span class="countdown-num" data-cd-m>00</span>' +
            '<span class="countdown-label">' + esc(S.minutes) + '</span>' +
          '</div>' +
          '<div class="countdown-cell">' +
            '<span class="countdown-num" data-cd-s>00</span>' +
            '<span class="countdown-label">' + esc(S.seconds) + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="countdown-done" style="display:none;"></p>' +
      '</section>';
  }

  function sceneClosing(data, S) {
    var wa = waLink(data.whatsapp, S.rsvpMessage);
    var maps = data.mapsLink || '';
    return '' +
      '<section class="scene scene-closing" data-cut="wipe">' +
        '<p class="scene-kicker anim" style="--anim-delay: 100;">' +
          esc(S.venueTitle) + '</p>' +
        '<span class="gold-line"></span>' +
        '<div class="venue-block anim" style="--anim-delay: 300;">' +
          (data.venueName
            ? '<h2 class="venue-name">' + esc(data.venueName) + '</h2>'
            : '') +
          (data.venueAddress
            ? '<p class="venue-address">' + esc(data.venueAddress) + '</p>'
            : '') +
        '</div>' +
        '<div class="cta-row anim" style="--anim-delay: 500;">' +
          (maps
            ? '<a class="card-btn card-btn-outline" href="' + esc(maps) +
              '" target="_blank" rel="noopener">📍 ' +
              esc(S.openInMaps) + '</a>'
            : '') +
          (wa
            ? '<a class="card-btn card-btn-gold" href="' + esc(wa) +
              '" target="_blank" rel="noopener">💬 ' +
              esc(S.rsvpWhatsapp) + '</a>'
            : '') +
        '</div>' +
        '<p class="closing-blessing anim" style="--anim-delay: 700;">' +
          esc(data.blessing || '') +
        '</p>' +
        '<p class="with-love anim" style="--anim-delay: 900;">' +
          esc(S.withLove) +
        '</p>' +
      '</section>';
  }


  /* ---------------------------------------------------------------
     PARTICLES  (petals + sparkles on canvas)
     --------------------------------------------------------------- */
  function initParticles(canvas) {
    if (!canvas) return { stop: function () {} };
    var reduce = false;
    try {
      reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (reduce) return { stop: function () {} };

    var ctx = canvas.getContext('2d');
    if (!ctx) return { stop: function () {} };

    var w = 0, h = 0, dpr = 1;
    var particles = [];
    var running = true;
    var rafId = null;
    var isMobile = window.innerWidth < 640;
    var COUNT = isMobile ? 16 : 32;

    var colors = ['#e8b4a0', '#d4af37', '#f3e0a1', '#c94f68', '#f7dccd'];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || canvas.width;
      h = canvas.clientHeight || canvas.height;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle(seeded) {
      return {
        x: Math.random() * w,
        y: seeded ? Math.random() * h : -10 - Math.random() * 40,
        size: 2 + Math.random() * 4.5,
        speedY: 0.25 + Math.random() * 0.65,
        speedX: -0.35 + Math.random() * 0.7,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: -0.03 + Math.random() * 0.06,
        color: colors[(Math.random() * colors.length) | 0],
        type: Math.random() < 0.6 ? 'petal' : 'sparkle',
        opacity: 0.35 + Math.random() * 0.55,
        twinkle: Math.random() * Math.PI * 2
      };
    }

    function seed() {
      particles.length = 0;
      for (var i = 0; i < COUNT; i++) particles.push(makeParticle(true));
    }

    function step() {
      if (!running) return;
      rafId = requestAnimationFrame(step);
      if (document.hidden) return;

      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.rot += p.rotSpeed;
        p.twinkle += 0.06;

        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        var alpha = p.opacity;
        if (p.type === 'sparkle') {
          alpha *= 0.45 + Math.sin(p.twinkle) * 0.45 + 0.1;
          if (alpha < 0) alpha = 0;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.type === 'petal') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function onResize() { resize(); seed(); }

    resize();
    seed();
    step();
    window.addEventListener('resize', onResize);

    return {
      stop: function () {
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        window.removeEventListener('resize', onResize);
      }
    };
  }


  /* ---------------------------------------------------------------
     MUSIC
     --------------------------------------------------------------- */
  function initMusic(root, data, disabled) {
    var noop = {
      play: function () {},
      pause: function () {},
      toggle: function () {}
    };
    if (disabled) return noop;

    var src = data.musicDataUrl || data.musicUrl || '';
    if (!src) return noop;

    var audio = null;
    try {
      audio = new Audio();
      audio.src = src;
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0.5;
    } catch (e) {
      return noop;
    }

    var btn = root.querySelector('.music-btn');
    var playing = false;

    function paintBtn() {
      if (!btn) return;
      btn.innerHTML = playing ? '🔊' : '🔇';
      btn.setAttribute(
        'aria-label',
        playing ? 'Mute music' : 'Play music'
      );
    }

    function play() {
      if (!audio) return;
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          playing = true;
          paintBtn();
        }).catch(function () {
          playing = false;
          paintBtn();
        });
      } else {
        playing = true;
        paintBtn();
      }
    }
    function pause() {
      if (!audio) return;
      try { audio.pause(); } catch (e) {}
      playing = false;
      paintBtn();
    }
    function toggle() {
      if (playing) pause(); else play();
    }

    if (btn) btn.addEventListener('click', toggle);
    paintBtn();

    return {
      play: play,
      pause: pause,
      toggle: toggle,
      destroy: function () {
        if (audio) {
          try { audio.pause(); } catch (e) {}
          audio = null;
        }
      }
    };
  }


  /* ---------------------------------------------------------------
     ENVELOPE
     --------------------------------------------------------------- */
  function initEnvelope(root, data, callbacks) {
    callbacks = callbacks || {};
    var stage = root.querySelector('.envelope-stage');
    if (!stage) {
      if (callbacks.onReveal) callbacks.onReveal();
      return;
    }
    var envelope = stage.querySelector('.envelope');
    var hint = stage.querySelector('.envelope-hint');
    var opened = false;

    function open() {
      if (opened) return;
      opened = true;

      if (callbacks.onFirstTap) {
        try { callbacks.onFirstTap(); } catch (e) {}
      }

      envelope.classList.add('is-opening');
      if (hint) hint.style.display = 'none';

      // Envelope flap + slide animation ~1.1s; give it room, then fade
      setTimeout(function () {
        stage.classList.add('is-leaving');
        setTimeout(function () {
          if (callbacks.onReveal) {
            try { callbacks.onReveal(); } catch (e) {}
          }
        }, 700);
        setTimeout(function () {
          stage.classList.add('is-hidden');
        }, 1700);
      }, 1500);
    }

    stage.addEventListener('click', open);
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        open();
      }
    });
    stage.setAttribute('tabindex', '0');
    stage.setAttribute('role', 'button');
    stage.setAttribute('aria-label', 'Open invitation');
  }


  /* ---------------------------------------------------------------
     SCENES NAVIGATION
     --------------------------------------------------------------- */
  function initScenes(root, data) {
    var scenesEl = root.querySelector('.scenes');
    if (!scenesEl) return { show: function () {} };
    var sceneEls = Array.prototype.slice.call(
      scenesEl.querySelectorAll('.scene')
    );
    var dots = Array.prototype.slice.call(
      root.querySelectorAll('.progress-dot')
    );
    var prevBtn = root.querySelector('.scene-prev');
    var nextBtn = root.querySelector('.scene-next');
    var total = sceneEls.length;
    var current = -1;

    function show(idx) {
      if (total === 0) return;
      if (idx < 0) idx = 0;
      if (idx > total - 1) idx = total - 1;
      if (idx === current) return;

      for (var i = 0; i < total; i++) {
        sceneEls[i].classList.toggle('is-active', i === idx);
      }
      for (var j = 0; j < dots.length; j++) {
        dots[j].classList.toggle('is-active', j === idx);
      }
      current = idx;
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === total - 1;
    }

    function next() { show(current + 1); }
    function prev() { show(current - 1); }

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    for (var k = 0; k < dots.length; k++) {
      (function (i) {
        dots[i].addEventListener('click', function () { show(i); });
      })(k);
    }

    // Keyboard
    function onKey(e) {
      if (!root.isConnected) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        next();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        prev();
      }
    }
    document.addEventListener('keydown', onKey);

    // Wheel (throttled)
    var wheelLock = false;
    scenesEl.addEventListener('wheel', function (e) {
      if (wheelLock) return;
      if (Math.abs(e.deltaY) < 18) return;
      wheelLock = true;
      setTimeout(function () { wheelLock = false; }, 750);
      if (e.deltaY > 0) next(); else prev();
    }, { passive: true });

    // Swipe (horizontal)
    var touchStart = null;
    scenesEl.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    }, { passive: true });

    scenesEl.addEventListener('touchend', function (e) {
      if (!touchStart) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - touchStart.x;
      var dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) next(); else prev();
    }, { passive: true });

    return {
      show: show,
      next: next,
      prev: prev,
      destroy: function () {
        document.removeEventListener('keydown', onKey);
      }
    };
  }


  /* ---------------------------------------------------------------
     COUNTDOWN
     --------------------------------------------------------------- */
  function initCountdown(root, data) {
    var wrap = root.querySelector('[data-countdown]');
    if (!wrap) return function () {};
    var target = parseDate(data.weddingDate, data.weddingTime);
    if (!target) return function () {};

    var S = STR[data.language] || STR.hinglish;
    var dEl = wrap.querySelector('[data-cd-d]');
    var hEl = wrap.querySelector('[data-cd-h]');
    var mEl = wrap.querySelector('[data-cd-m]');
    var sEl = wrap.querySelector('[data-cd-s]');
    var doneEl = wrap.parentNode
      ? wrap.parentNode.querySelector('.countdown-done')
      : null;

    var timer = null;

    function tick() {
      if (!wrap.isConnected) {
        if (timer) { clearInterval(timer); timer = null; }
        return;
      }
      var diff = target.getTime() - Date.now();
      if (diff <= 0) {
        wrap.style.display = 'none';
        if (doneEl) {
          doneEl.style.display = 'block';
          doneEl.textContent =
            target.getTime() < Date.now() - 86400000
              ? S.countdownPast
              : S.countdownDone;
        }
        if (timer) { clearInterval(timer); timer = null; }
        return;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      if (dEl) dEl.textContent = pad2(d);
      if (hEl) hEl.textContent = pad2(h);
      if (mEl) mEl.textContent = pad2(m);
      if (sEl) sEl.textContent = pad2(s);
    }

    tick();
    timer = setInterval(tick, 1000);

    return function () {
      if (timer) { clearInterval(timer); timer = null; }
    };
  }


  /* ---------------------------------------------------------------
     TILT  (subtle 3D on event cards, mouse only)
     --------------------------------------------------------------- */
  function initTilt(root) {
    var reduce = false;
    try {
      reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (reduce) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    var cards = root.querySelectorAll('.event-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            'perspective(700px) rotateY(' + (x * 8).toFixed(2) + 'deg) ' +
            'rotateX(' + (-y * 8).toFixed(2) + 'deg)';
        });
        card.addEventListener('mouseleave', function () {
          card.style.transform = '';
        });
      })(cards[i]);
    }
  }


  /* ---------------------------------------------------------------
     MAIN RENDER
     --------------------------------------------------------------- */
  function render(root, data, options) {
    if (!root) return;
    options = options || {};
    data = data || {};

    // cleanup previous render
    if (typeof root.__cardCleanup === 'function') {
      try { root.__cardCleanup(); } catch (e) {}
      root.__cardCleanup = null;
    }

    var S = STR[data.language] || STR.hinglish;

    root.setAttribute('data-theme', data.theme || 'royal');

    // Build inner HTML ------------------------------------------------
    var html = '';

    // optional background videos
    var videos = data.videos || [];
    for (var vi = 0; vi < videos.length; vi++) {
      var v = videos[vi];
      if (v && typeof v === 'string' && v.trim()) {
        html +=
          '<video class="bg-video" src="' + esc(v) + '" ' +
            'autoplay muted loop playsinline></video>';
      }
    }

    // particle canvas
    html += '<canvas class="petals-canvas" aria-hidden="true"></canvas>';

    // envelope stage
    var brideInitial = esc(initial(data.brideName));
    var groomInitial = esc(initial(data.groomName));
    html +=
      '<div class="envelope-stage" role="button" tabindex="0" ' +
        'aria-label="Open invitation">' +
        '<div class="envelope">' +
          '<div class="envelope-body"></div>' +
          '<div class="envelope-flap"></div>' +
          '<div class="envelope-seal">' +
            brideInitial + '&amp;' + groomInitial +
          '</div>' +
          '<div class="envelope-card">' +
            esc(data.headline || 'Shubh Vivah') +
          '</div>' +
        '</div>' +
        '<div class="envelope-hint">' + esc(S.tapToOpen) + '</div>' +
      '</div>';

    // scenes
    html +=
      '<div class="scenes">' +
        sceneBlessing(data, S) +
        sceneNames(data, S) +
        sceneMessage(data, S) +
        sceneEvents(data, S) +
        sceneCountdown(data, S) +
        sceneClosing(data, S) +
      '</div>';

    // music toggle button
    var hasMusic = !!(data.musicDataUrl || data.musicUrl);
    if (hasMusic) {
      html +=
        '<button class="music-btn" type="button" ' +
          'aria-label="Toggle music">🔇</button>';
    }

    // progress dots
    html += '<div class="progress-dots" role="tablist" aria-label="Scenes">';
    for (var di = 0; di < 6; di++) {
      html +=
        '<button class="progress-dot" type="button" data-scene="' + di +
        '" aria-label="Scene ' + (di + 1) + '"></button>';
    }
    html += '</div>';

    // nav arrows
    html +=
      '<div class="scene-nav">' +
        '<button class="scene-prev" type="button" ' +
          'aria-label="Previous scene">‹</button>' +
        '<button class="scene-next" type="button" ' +
          'aria-label="Next scene">›</button>' +
      '</div>';

    // decorative frame
    html += '<div class="ornament-frame"></div>';

    root.innerHTML = html;

    // Hook up subsystems ---------------------------------------------
    // video error fallback
    var vEls = root.querySelectorAll('.bg-video');
    for (var ve = 0; ve < vEls.length; ve++) {
      (function (el) {
        el.addEventListener('error', function () {
          el.style.display = 'none';
        });
      })(vEls[ve]);
    }

    var canvas = root.querySelector('.petals-canvas');
    var particles = initParticles(canvas);

    var music = initMusic(root, data, !!options.skipMusic);

    initTilt(root);

    var cdCleanup = initCountdown(root, data);

    var nav = initScenes(root, data);

    // Envelope / scene activation
    if (options.skipEnvelope) {
      var stage = root.querySelector('.envelope-stage');
      if (stage) stage.style.display = 'none';
      // small delay so first paint lands first
      setTimeout(function () {
        if (root.isConnected) nav.show(0);
      }, 40);
    } else {
      initEnvelope(root, data, {
        onFirstTap: function () { music.play(); },
        onReveal: function () { nav.show(0); }
      });
    }

    // Store cleanup for the next render
    root.__cardCleanup = function () {
      if (particles) particles.stop();
      if (cdCleanup) cdCleanup();
      if (music && music.destroy) music.destroy();
      if (nav && nav.destroy) nav.destroy();
    };
  }


  // expose
  window.CardEngine = {
    render: render,
    esc: esc
  };
})();
/*ENGINE_END*/


/* =====================================================================
   EDITOR CODE  (not included in the downloaded file)
   ===================================================================== */
(function () {
  'use strict';

  // Only run on the editor page (safety net)
  if (!document.getElementById('editorShell')) return;
  if (!window.CardEngine) return;

  var CardEngine = window.CardEngine;
  var esc = CardEngine.esc;


  /* ---------------- utilities ---------------- */
  function pad2(n) { return String(n).length === 1 ? '0' + n : String(n); }

  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (e) { return obj; }
  }

  function slugify(s) {
    var v = String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return v || 'card';
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        fn.apply(ctx, args);
      }, ms);
    };
  }

  function getDefaultDate() {
    var d = new Date();
    d.setDate(d.getDate() + 60);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' +
           pad2(d.getDate());
  }

  // compress photo through canvas
  function compressImage(file, maxWidth, quality) {
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onerror = function () {
          reject(new Error('File read failed'));
        };
        reader.onload = function (ev) {
          var img = new Image();
          img.onerror = function () { reject(new Error('Image load failed')); };
          img.onload = function () {
            try {
              var ratio = Math.min(1, maxWidth / img.width);
              var w = Math.max(1, Math.round(img.width * ratio));
              var h = Math.max(1, Math.round(img.height * ratio));
              var canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) { reject(e); }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } catch (e) { reject(e); }
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onerror = function () {
          reject(new Error('File read failed'));
        };
        reader.onload = function (ev) {
          resolve(ev.target.result);
        };
        reader.readAsDataURL(file);
      } catch (e) { reject(e); }
    });
  }


  /* ---------------- default data ---------------- */
  var DEFAULT_DATA = {
    language: 'hinglish',
    blessing: '|| Shree Ganeshay Namah ||',
    headline: 'Shubh Vivah',
    brideName: 'Ananya',
    groomName: 'Aarav',
    brideFamily:
      'D/o Shri Ram Prasad Sharma & Smt. Sunita Sharma, Jaipur',
    groomFamily:
      'S/o Shri Mohan Lal Verma & Smt. Kavita Verma, Delhi',
    weddingDate: getDefaultDate(),
    weddingTime: '19:00',
    message:
      'With the blessings of our elders, we joyfully invite you to ' +
      'celebrate the union of two hearts.\n\n' +
      'Your presence and blessings will make our celebration complete. ' +
      'Come share in our laughter, our joy, and the beginning of a ' +
      'beautiful journey together.\n\n' +
      'We eagerly await you and your family at this auspicious occasion.',
    events: [
      { name: 'Haldi', date: '', time: '10:00 AM',
        venue: 'At our residence',
        note: 'Dhol, haldi aur masti', emoji: '🌼' },
      { name: 'Mehndi', date: '', time: '4:00 PM',
        venue: 'Sharma Niwas',
        note: 'Mehndi ke geet aur bahut saara pyaar', emoji: '🌿' },
      { name: 'Sangeet', date: '', time: '7:00 PM',
        venue: 'Shree Ram Vatika',
        note: 'Dance, music aur full on family masti', emoji: '🎶' },
      { name: 'Baraat & Pheras', date: '', time: '8:00 PM',
        venue: 'Shree Ram Vatika',
        note: 'Shaadi ke saat pheras', emoji: '🐎' },
      { name: 'Reception', date: '', time: '8:30 PM',
        venue: 'Shree Ram Vatika',
        note: 'Dinner aur celebration', emoji: '🥂' }
    ],
    venueName: 'Shree Ram Vatika, Banquet Hall',
    venueAddress: '12, MG Road, Near Clock Tower, Jaipur, Rajasthan 302001',
    mapsLink: 'https://maps.google.com/?q=MG+Road+Jaipur',
    whatsapp: '+919876543210',
    photoDataUrl: '',
    musicDataUrl: '',
    musicUrl: '',
    theme: 'royal',
    videos: ['', '', '']
  };


  /* ---------------- state storage ---------------- */
  var STORAGE_KEY = 'shaadiCardEditorState_v1';

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      // merge over defaults so missing keys still work
      var merged = clone(DEFAULT_DATA);
      for (var k in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) {
          merged[k] = parsed[k];
        }
      }
      if (!Array.isArray(merged.events)) merged.events = clone(DEFAULT_DATA.events);
      if (!Array.isArray(merged.videos)) merged.videos = ['', '', ''];
      return merged;
    } catch (e) { return null; }
  }

  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      // likely quota exceeded
      return false;
    }
  }


  /* ---------------- state ---------------- */
  var state = loadState() || clone(DEFAULT_DATA);


  /* ---------------- element references ---------------- */
  var el = {
    language: document.getElementById('inpLanguage'),
    blessing: document.getElementById('inpBlessing'),
    headline: document.getElementById('inpHeadline'),
    brideName: document.getElementById('inpBrideName'),
    groomName: document.getElementById('inpGroomName'),
    brideFamily: document.getElementById('inpBrideFamily'),
    groomFamily: document.getElementById('inpGroomFamily'),
    weddingDate: document.getElementById('inpWeddingDate'),
    weddingTime: document.getElementById('inpWeddingTime'),
    venueName: document.getElementById('inpVenueName'),
    venueAddress: document.getElementById('inpVenueAddress'),
    mapsLink: document.getElementById('inpMapsLink'),
    whatsapp: document.getElementById('inpWhatsapp'),
    message: document.getElementById('inpMessage'),
    musicUrl: document.getElementById('inpMusicUrl'),
    video1: document.getElementById('inpVideo1'),
    video2: document.getElementById('inpVideo2'),
    video3: document.getElementById('inpVideo3'),
    photoInput: document.getElementById('inpPhoto'),
    musicInput: document.getElementById('inpMusicFile'),
    photoPreview: document.getElementById('photoPreview'),
    musicStatus: document.getElementById('musicStatus'),
    eventsList: document.getElementById('eventsList'),
    btnAddEvent: document.getElementById('btnAddEvent'),
    btnReset: document.getElementById('btnReset'),
    btnDownload: document.getElementById('btnDownload'),
    btnDownloadBottom: document.getElementById('btnDownloadBottom'),
    btnReplay: document.getElementById('btnReplay'),
    btnClearPhoto: document.getElementById('btnClearPhoto'),
    btnClearMusic: document.getElementById('btnClearMusic'),
    tabEdit: document.getElementById('tabEdit'),
    tabPreview: document.getElementById('tabPreview'),
    cardRoot: document.getElementById('cardRoot'),
    themeRadios: document.querySelectorAll('input[name="theme"]'),
    toast: document.getElementById('toast')
  };


  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('is-visible');
    }, 2800);
  }


  /* ---------------- collect / fill form ---------------- */
  function collectForm() {
    state.language = el.language ? el.language.value : 'hinglish';
    state.blessing = el.blessing ? el.blessing.value : '';
    state.headline = el.headline ? el.headline.value : '';
    state.brideName = el.brideName ? el.brideName.value : '';
    state.groomName = el.groomName ? el.groomName.value : '';
    state.brideFamily = el.brideFamily ? el.brideFamily.value : '';
    state.groomFamily = el.groomFamily ? el.groomFamily.value : '';
    state.weddingDate = el.weddingDate ? el.weddingDate.value : '';
    state.weddingTime = el.weddingTime ? el.weddingTime.value : '';
    state.venueName = el.venueName ? el.venueName.value : '';
    state.venueAddress = el.venueAddress ? el.venueAddress.value : '';
    state.mapsLink = el.mapsLink ? el.mapsLink.value : '';
    state.whatsapp = el.whatsapp ? el.whatsapp.value : '';
    state.message = el.message ? el.message.value : '';
    state.musicUrl = el.musicUrl ? el.musicUrl.value : '';
    state.videos = [
      el.video1 ? el.video1.value : '',
      el.video2 ? el.video2.value : '',
      el.video3 ? el.video3.value : ''
    ];
    // theme
    for (var i = 0; i < el.themeRadios.length; i++) {
      if (el.themeRadios[i].checked) {
        state.theme = el.themeRadios[i].value;
        break;
      }
    }
  }

  function fillForm() {
    if (el.language) el.language.value = state.language || 'hinglish';
    if (el.blessing) el.blessing.value = state.blessing || '';
    if (el.headline) el.headline.value = state.headline || '';
    if (el.brideName) el.brideName.value = state.brideName || '';
    if (el.groomName) el.groomName.value = state.groomName || '';
    if (el.brideFamily) el.brideFamily.value = state.brideFamily || '';
    if (el.groomFamily) el.groomFamily.value = state.groomFamily || '';
    if (el.weddingDate) el.weddingDate.value = state.weddingDate || '';
    if (el.weddingTime) el.weddingTime.value = state.weddingTime || '';
    if (el.venueName) el.venueName.value = state.venueName || '';
    if (el.venueAddress) el.venueAddress.value = state.venueAddress || '';
    if (el.mapsLink) el.mapsLink.value = state.mapsLink || '';
    if (el.whatsapp) el.whatsapp.value = state.whatsapp || '';
    if (el.message) el.message.value = state.message || '';
    if (el.musicUrl) el.musicUrl.value = state.musicUrl || '';
    if (el.video1) el.video1.value = (state.videos && state.videos[0]) || '';
    if (el.video2) el.video2.value = (state.videos && state.videos[1]) || '';
    if (el.video3) el.video3.value = (state.videos && state.videos[2]) || '';

    for (var i = 0; i < el.themeRadios.length; i++) {
      el.themeRadios[i].checked =
        el.themeRadios[i].value === (state.theme || 'royal');
    }

    // photo preview
    if (el.photoPreview) {
      if (state.photoDataUrl) {
        el.photoPreview.innerHTML =
          '<img src="' + esc(state.photoDataUrl) + '" alt="Couple photo">';
      } else {
        el.photoPreview.innerHTML =
          '<span class="photo-preview-empty">Koi photo nahi chuni</span>';
      }
    }

    // music status
    if (el.musicStatus) {
      if (state.musicDataUrl) {
        el.musicStatus.textContent = 'Music file loaded (embedded).';
      } else if (state.musicUrl) {
        el.musicStatus.textContent = 'Music URL set.';
      } else {
        el.musicStatus.textContent = 'Koi music nahi chuna.';
      }
    }

    renderEventsList();
  }


  /* ---------------- events list UI ---------------- */
  function renderEventsList() {
    if (!el.eventsList) return;
    el.eventsList.innerHTML = '';
    var events = Array.isArray(state.events) ? state.events : [];

    events.forEach(function (ev, i) {
      var item = document.createElement('div');
      item.className = 'event-item';

      item.innerHTML =
        '<div class="event-item-head">' +
          '<input class="event-item-emoji" type="text" maxlength="4" ' +
            'aria-label="Event icon" value="' + esc(ev.emoji || '✨') + '">' +
          '<strong style="font-size:13px;color:#4a2c07;">Event ' +
            (i + 1) + '</strong>' +
          '<div class="event-item-actions">' +
            '<button type="button" class="btn btn-ghost btn-small" ' +
              'data-action="up" title="Move up" ' +
              (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn btn-ghost btn-small" ' +
              'data-action="down" title="Move down" ' +
              (i === events.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button type="button" class="btn btn-ghost btn-small" ' +
              'data-action="remove" title="Remove">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="event-item-grid">' +
          '<label class="field"><span class="field-label">Name</span>' +
            '<input class="field-input" data-key="name" type="text" ' +
              'value="' + esc(ev.name || '') + '"></label>' +
          '<label class="field"><span class="field-label">Date</span>' +
            '<input class="field-input" data-key="date" type="date" ' +
              'value="' + esc(ev.date || '') + '"></label>' +
          '<label class="field"><span class="field-label">Time</span>' +
            '<input class="field-input" data-key="time" type="text" ' +
              'placeholder="7:00 PM" value="' +
              esc(ev.time || '') + '"></label>' +
          '<label class="field"><span class="field-label">Venue</span>' +
            '<input class="field-input" data-key="venue" type="text" ' +
              'value="' + esc(ev.venue || '') + '"></label>' +
          '<label class="field span-2"><span class="field-label">Note</span>' +
            '<input class="field-input" data-key="note" type="text" ' +
              'value="' + esc(ev.note || '') + '"></label>' +
        '</div>';

      // text inputs
      var inputs = item.querySelectorAll('[data-key]');
      for (var k = 0; k < inputs.length; k++) {
        (function (inp) {
          inp.addEventListener('input', function () {
            ev[inp.getAttribute('data-key')] = inp.value;
            schedulePreview();
          });
        })(inputs[k]);
      }

      // emoji
      var emojiInput = item.querySelector('.event-item-emoji');
      if (emojiInput) {
        emojiInput.addEventListener('input', function () {
          ev.emoji = emojiInput.value;
          schedulePreview();
        });
      }

      // action buttons
      var acts = item.querySelectorAll('[data-action]');
      for (var a = 0; a < acts.length; a++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var action = btn.getAttribute('data-action');
            if (action === 'remove') {
              state.events.splice(i, 1);
              renderEventsList();
              schedulePreview();
            } else if (action === 'up' && i > 0) {
              var tmp = state.events[i - 1];
              state.events[i - 1] = state.events[i];
              state.events[i] = tmp;
              renderEventsList();
              schedulePreview();
            } else if (action === 'down' &&
                       i < state.events.length - 1) {
              var tmp2 = state.events[i + 1];
              state.events[i + 1] = state.events[i];
              state.events[i] = tmp2;
              renderEventsList();
              schedulePreview();
            }
          });
        })(acts[a]);
      }

      el.eventsList.appendChild(item);
    });
  }


  /* ---------------- preview rendering ---------------- */
  function renderPreview() {
    if (!el.cardRoot) return;
    collectForm();
    CardEngine.render(el.cardRoot, clone(state), {
      skipEnvelope: true,
      skipMusic: true
    });
  }
  var schedulePreview = debounce(renderPreview, 150);

  function renderPreviewWithEnvelope() {
    if (!el.cardRoot) return;
    collectForm();
    CardEngine.render(el.cardRoot, clone(state), {
      skipEnvelope: false,
      skipMusic: false
    });
  }


  /* ---------------- photo / music uploads ---------------- */
  if (el.photoInput) {
    el.photoInput.addEventListener('change', function () {
      var file = el.photoInput.files && el.photoInput.files[0];
      if (!file) return;
      compressImage(file, 900, 0.8).then(function (dataUrl) {
        state.photoDataUrl = dataUrl;
        if (el.photoPreview) {
          el.photoPreview.innerHTML =
            '<img src="' + esc(dataUrl) + '" alt="Couple photo">';
        }
        schedulePreview();
      }).catch(function (err) {
        showToast('Photo load nahi ho payi: ' + (err && err.message || 'error'));
      });
    });
  }

  if (el.btnClearPhoto) {
    el.btnClearPhoto.addEventListener('click', function () {
      state.photoDataUrl = '';
      if (el.photoInput) el.photoInput.value = '';
      if (el.photoPreview) {
        el.photoPreview.innerHTML =
          '<span class="photo-preview-empty">Koi photo nahi chuni</span>';
      }
      schedulePreview();
    });
  }

  if (el.musicInput) {
    el.musicInput.addEventListener('change', function () {
      var file = el.musicInput.files && el.musicInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('Music file 5MB se badi hai — chhoti file try karo.');
        return;
      }
      readFileAsDataUrl(file).then(function (dataUrl) {
        state.musicDataUrl = dataUrl;
        state.musicUrl = '';
        if (el.musicUrl) el.musicUrl.value = '';
        if (el.musicStatus) {
          el.musicStatus.textContent =
            'Music file loaded: ' + file.name;
        }
        schedulePreview();
      }).catch(function (err) {
        showToast('Music load nahi hua: ' + (err && err.message || 'error'));
      });
    });
  }

  if (el.btnClearMusic) {
    el.btnClearMusic.addEventListener('click', function () {
      state.musicDataUrl = '';
      state.musicUrl = '';
      if (el.musicInput) el.musicInput.value = '';
      if (el.musicUrl) el.musicUrl.value = '';
      if (el.musicStatus) {
        el.musicStatus.textContent = 'Koi music nahi chuna.';
      }
      schedulePreview();
    });
  }


  /* ---------------- generic form inputs ---------------- */
  var liveFields = [
    el.language, el.blessing, el.headline,
    el.brideName, el.groomName, el.brideFamily, el.groomFamily,
    el.weddingDate, el.weddingTime,
    el.venueName, el.venueAddress, el.mapsLink, el.whatsapp,
    el.message, el.musicUrl,
    el.video1, el.video2, el.video3
  ];
  liveFields.forEach(function (inp) {
    if (!inp) return;
    inp.addEventListener('input', schedulePreview);
    inp.addEventListener('change', schedulePreview);
  });

  // theme radio
  for (var ri = 0; ri < el.themeRadios.length; ri++) {
    el.themeRadios[ri].addEventListener('change', schedulePreview);
  }


  /* ---------------- buttons ---------------- */
  if (el.btnAddEvent) {
    el.btnAddEvent.addEventListener('click', function () {
      state.events.push({
        name: 'New Event',
        date: '',
        time: '',
        venue: '',
        note: '',
        emoji: '✨'
      });
      renderEventsList();
      schedulePreview();
    });
  }

  if (el.btnReplay) {
    el.btnReplay.addEventListener('click', function () {
      renderPreviewWithEnvelope();
    });
  }

  if (el.btnReset) {
    el.btnReset.addEventListener('click', function () {
      if (!window.confirm(
        'Reset to sample data? Aapke sabhi badlav hat jayenge.'
      )) return;
      state = clone(DEFAULT_DATA);
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      fillForm();
      renderPreview();
    });
  }


  /* ---------------- mobile tabs ---------------- */
  document.body.classList.add('tab-edit');

  function setTab(which) {
    if (which === 'edit') {
      document.body.classList.add('tab-edit');
      document.body.classList.remove('tab-preview');
      if (el.tabEdit) el.tabEdit.classList.add('is-active');
      if (el.tabPreview) el.tabPreview.classList.remove('is-active');
    } else {
      document.body.classList.add('tab-preview');
      document.body.classList.remove('tab-edit');
      if (el.tabPreview) el.tabPreview.classList.add('is-active');
      if (el.tabEdit) el.tabEdit.classList.remove('is-active');
      // refresh preview when switching to it, so newest data is shown
      renderPreview();
    }
  }

  if (el.tabEdit) {
    el.tabEdit.addEventListener('click', function () { setTab('edit'); });
  }
  if (el.tabPreview) {
    el.tabPreview.addEventListener('click', function () { setTab('preview'); });
  }


  /* ---------------- download builder ---------------- */
  async function downloadCard() {
    try {
      collectForm();

      // 1. fetch CSS + JS
      var cssRes = await fetch('style.css', { cache: 'no-store' });
      if (!cssRes.ok) throw new Error('style.css load nahi hui');
      var cssText = await cssRes.text();

      var jsRes = await fetch('script.js', { cache: 'no-store' });
      if (!jsRes.ok) throw new Error('script.js load nahi hui');
      var jsText = await jsRes.text();

      // 2. extract engine block
      var startMark = '/*ENGINE_START*/';
      var endMark = '/*ENGINE_END*/';
      var sIdx = jsText.indexOf(startMark);
      var eIdx = jsText.indexOf(endMark);
      if (sIdx < 0 || eIdx < 0 || eIdx <= sIdx) {
        throw new Error('Engine markers nahi mile');
      }
      var engineText = jsText.slice(sIdx + startMark.length, eIdx).trim();
      // prevent </script> inside engine from closing our tag
      engineText = engineText.replace(/<\/script/gi, '<\\/script');

      // 3. data JSON (also protect </script>)
      var dataJson = JSON.stringify(state)
        .replace(/<\/script/gi, '<\\/script');

      // 4. filename
      var fileName =
        slugify(state.brideName) + '-weds-' +
        slugify(state.groomName) + '-invitation.html';

      // 5. build HTML
      var titleText =
        (state.brideName || 'Bride') + ' weds ' +
        (state.groomName || 'Groom') + ' — Invitation';

      var fontsHref =
        'https://fonts.googleapis.com/css2?' +
        'family=Cinzel+Decorative:wght@400;700;900' +
        '&family=Great+Vibes' +
        '&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400' +
        '&family=Poppins:wght@300;400;500;600' +
        '&family=Tiro+Devanagari+Hindi:ital@0;1' +
        '&display=swap';

      var html =
        '<!DOCTYPE html>\n' +
        '<html lang="hi">\n' +
        '<head>\n' +
        '<meta charset="UTF-8">\n' +
        '<meta name="viewport" content="width=device-width, ' +
          'initial-scale=1.0, viewport-fit=cover">\n' +
        '<meta name="theme-color" content="#2b0b12">\n' +
        '<title>' + esc(titleText) + '</title>\n' +
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        '<link href="' + fontsHref + '" rel="stylesheet">\n' +
        '<style>\n' + cssText + '\n</style>\n' +
        '</head>\n' +
        '<body class="viewer-mode">\n' +
        '<div id="cardRoot" class="card-root"></div>\n' +
        '<script>window.CARD_DATA = ' + dataJson + ';<\/script>\n' +
        '<script>\n' + engineText + '\n<\/script>\n' +
        '<script>\n' +
          '(function(){' +
            'if(window.CardEngine&&window.CARD_DATA){' +
              'window.CardEngine.render(' +
                'document.getElementById("cardRoot"),' +
                'window.CARD_DATA,' +
                '{skipEnvelope:false,skipMusic:false}' +
              ');' +
            '}' +
          '})();\n' +
        '<\/script>\n' +
        '</body>\n' +
        '</html>';

      // 6. trigger download
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);

      // 7. save editor state + reload (fresh state for next card)
      var ok = saveState(state);
      showToast(
        ok
          ? 'Card download ho gaya! Page reset ho raha hai...'
          : 'Card download ho gaya! (Warning: state save nahi hua)'
      );

      setTimeout(function () {
        location.reload();
      }, 800);
    } catch (err) {
      console.error(err);
      showToast(
        'Download fail: ' + ((err && err.message) || 'unknown error')
      );
    }
  }

  if (el.btnDownload) {
    el.btnDownload.addEventListener('click', downloadCard);
  }
  if (el.btnDownloadBottom) {
    el.btnDownloadBottom.addEventListener('click', downloadCard);
  }


  /* ---------------- boot ---------------- */
  fillForm();
  renderPreview();
})();
