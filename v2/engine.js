/* =====================================================================
   ENGINE.JS  —  Nikah Card Maker (viewer / downloaded card)
   ---------------------------------------------------------------------
   Exposes: window.renderCard(data, rootElement)
   Contains ZERO editor code.
   Gets inlined into the downloaded HTML file.
   ===================================================================== */

/*ENGINE_START*/
(function () {
  'use strict';

  /* ============================================================
     1. HELPERS
     ============================================================ */
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  function pad2(n) {
    n = String(n);
    return n.length < 2 ? '0' + n : n;
  }

  function initial(name) {
    var s = String(name || '').trim();
    return s ? s.charAt(0).toUpperCase() : '·';
  }

  function parseDateTime(str) {
    if (!str) return null;
    var d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function formatDate(str) {
    var d = parseDateTime(str);
    if (!d) return String(str || '');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return pad2(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function letterSpans(text) {
    var s = String(text == null ? '' : text);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === ' ') out += '<span style="--i:' + i + '">&nbsp;</span>';
      else out += '<span style="--i:' + i + '">' + esc(ch) + '</span>';
    }
    return '<span class="letters">' + out + '</span>';
  }

  function waLink(phone, msg) {
    if (!phone) return '';
    var digits = String(phone).replace(/\D/g, '');
    if (!digits) return '';
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg || '');
  }

  function mailtoLink(email, subject, body) {
    if (!email) return '';
    return 'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject || '') +
      '&body=' + encodeURIComponent(body || '');
  }

  function getGuestName() {
    try {
      if (!window.location || !window.location.search) return '';
      var params = new URLSearchParams(window.location.search);
      var to = params.get('to');
      if (!to) return '';
      return String(to).slice(0, 60).trim();
    } catch (e) { return ''; }
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* ============================================================
     2. STRINGS (by language)
     ============================================================ */
  var STR = {
    hinglish: {
      scratch: 'Scratch karo ✨',
      scratchUrdu: 'یہاں کھرچیں',
      assalam: 'Assalamu Alaikum',
      hint: 'Aapko dawat hai',
      enter: 'Dawat qubool karein – Enter',
      enterUrdu: 'داخل ہوں',
      skip: 'Skip scratch',
      weds: 'weds',
      days: 'Din', hours: 'Ghante', minutes: 'Minute', seconds: 'Second',
      countdownTitle: 'Shubh Ghadi',
      countdownDone: 'Aaj ka din hai! 🌙',
      countdownPast: 'Shukriya',
      venueTitle: 'Aapka swagat hai',
      openMaps: 'Open in Maps',
      nameLbl: 'Aapka naam *',
      relLbl: 'Rishta',
      attendLbl: 'Aayenge?',
      guestsLbl: 'Kitne log',
      msgLbl: 'Message',
      sendWA: 'Greeting bhejein',
      sendEmail: 'Email se bhejein',
      thankYou: 'Shukriya! Aapka greeting pahunch gaya.',
      relOpts: ['Family','Friend','Colleague','Neighbour','Other'],
      attendOpts: ['Haan, zaroor','Shayad','Nahi aa paunga'],
      chips: ['Mubarak ho!', 'Baarak Allahu lakuma', 'Dher saari duaen', 'Khush raho aabaad raho'],
      errName: 'Apna naam likhiye.',
      errNoContact: 'Sender ne koi contact nahi diya.',
      withLove: 'With love'
    },
    english: {
      scratch: 'Scratch me ✨',
      scratchUrdu: 'یہاں کھرچیں',
      assalam: 'Assalamu Alaikum',
      hint: 'You are invited',
      enter: 'Accept invitation – Enter',
      enterUrdu: 'داخل ہوں',
      skip: 'Skip scratch',
      weds: 'weds',
      days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds',
      countdownTitle: 'The Auspicious Hour',
      countdownDone: 'The day is here! 🌙',
      countdownPast: 'Thank you',
      venueTitle: 'You are invited',
      openMaps: 'Open in Maps',
      nameLbl: 'Your name *',
      relLbl: 'Relation',
      attendLbl: 'Will you attend?',
      guestsLbl: 'Number of guests',
      msgLbl: 'Message',
      sendWA: 'Send greeting',
      sendEmail: 'Send by email',
      thankYou: 'Thank you! Your greeting is on its way.',
      relOpts: ['Family','Friend','Colleague','Neighbour','Other'],
      attendOpts: ['Yes, I will attend','Maybe','No, cannot attend'],
      chips: ['Mubarak ho!', 'Baarak Allahu lakuma', 'Many duas', 'Live happily ever after'],
      errName: 'Please enter your name.',
      errNoContact: 'No contact set by the host.',
      withLove: 'With love'
    },
    urdu: {
      scratch: 'یہاں کھرچیں ✨',
      scratchUrdu: 'یہاں کھرچیں',
      assalam: 'السلام علیکم',
      hint: 'آپ کو دعوت ہے',
      enter: 'دعوت قبول کریں – داخل',
      enterUrdu: 'داخل ہوں',
      skip: 'اسکرچ چھوڑیں',
      weds: 'کی شادی',
      days: 'دن', hours: 'گھنٹے', minutes: 'منٹ', seconds: 'سیکنڈ',
      countdownTitle: 'شبِ وصال',
      countdownDone: 'آج کا دن ہے! 🌙',
      countdownPast: 'شکریہ',
      venueTitle: 'آپ کا استقبال ہے',
      openMaps: 'نقشے میں کھولیں',
      nameLbl: 'آپ کا نام *',
      relLbl: 'رشتہ',
      attendLbl: 'کیا آئیں گے؟',
      guestsLbl: 'کتنے لوگ',
      msgLbl: 'پیغام',
      sendWA: 'دعا بھیجیں',
      sendEmail: 'ای میل سے بھیجیں',
      thankYou: 'شکریہ! آپ کی دعا پہنچ گئی۔',
      relOpts: ['خاندان','دوست','ساتھی','پڑوسی','دوسرے'],
      attendOpts: ['جی ہاں، ضرور','شاید','نہیں آ سکوں گا'],
      chips: ['مبارک ہو!', 'بارک اللہ لکما', 'ڈھیر ساری دعائیں', 'خوش رہو آباد رہو'],
      errName: 'اپنا نام لکھیں۔',
      errNoContact: 'میزبان نے کوئی رابطہ نہیں دیا۔',
      withLove: 'محبت کے ساتھ'
    },
    mixed: {}
  };
  STR.mixed = STR.hinglish;

  function t(data) {
    var lang = (data && data.language) || 'hinglish';
    return STR[lang] || STR.hinglish;
  }

  /* ============================================================
     3. SVG SNIPPETS
     ============================================================ */
  function crescentStarSvg(cls) {
    return '' +
      '<svg class="' + esc(cls || 'blessing-svg') + '" viewBox="0 0 120 120" ' +
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="wcmCSG" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#f3e0a1"/>' +
            '<stop offset="50%" stop-color="#d4af37"/>' +
            '<stop offset="100%" stop-color="#8f6f1d"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<g fill="none" stroke="url(#wcmCSG)" stroke-width="1.6" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="60" cy="60" r="52" opacity="0.4"/>' +
          '<path d="M78 42 A 26 26 0 1 0 78 78 A 30 30 0 1 1 78 42 Z" ' +
            'fill="url(#wcmCSG)" stroke="none"/>' +
          '<path d="M92 52 L94.5 60 L102 62 L95 66 L93 74 L89 67 L81 65 L87.5 59 Z" ' +
            'fill="url(#wcmCSG)" stroke="none"/>' +
          '<circle cx="46" cy="88" r="1.6" fill="url(#wcmCSG)" stroke="none"/>' +
          '<circle cx="30" cy="72" r="1.2" fill="url(#wcmCSG)" stroke="none"/>' +
          '<circle cx="38" cy="48" r="1" fill="url(#wcmCSG)" stroke="none"/>' +
          '<circle cx="88" cy="92" r="1.2" fill="url(#wcmCSG)" stroke="none"/>' +
        '</g>' +
      '</svg>';
  }

  /* ============================================================
     4. PARTICLES  (falling petals + sparkles)
     ============================================================ */
  function initParticles(canvas) {
    if (!canvas) return { stop: function () {} };
    if (prefersReducedMotion()) return { stop: function () {} };

    var ctx = canvas.getContext('2d');
    if (!ctx) return { stop: function () {} };

    var w = 0, h = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var running = true;
    var rafId = null;
    var particles = [];
    var isMobile = window.innerWidth < 640;
    var COUNT = isMobile ? 14 : 28;
    var colors = ['#e8b4a0', '#f3e0a1', '#d4af37', '#c94f68', '#f7dccd', '#e6d5b8'];

    function resize() {
      w = canvas.clientWidth || canvas.width || 1;
      h = canvas.clientHeight || canvas.height || 1;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeP(seeded) {
      return {
        x: Math.random() * w,
        y: seeded ? Math.random() * h : -20 - Math.random() * 40,
        size: 2 + Math.random() * 4,
        vy: 0.3 + Math.random() * 0.7,
        vx: -0.4 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        vrot: -0.03 + Math.random() * 0.06,
        color: colors[(Math.random() * colors.length) | 0],
        type: Math.random() < 0.65 ? 'petal' : 'sparkle',
        alpha: 0.4 + Math.random() * 0.5,
        twinkle: Math.random() * Math.PI * 2
      };
    }

    function seed() {
      particles.length = 0;
      for (var i = 0; i < COUNT; i++) particles.push(makeP(true));
    }

    function step() {
      if (!running) return;
      rafId = requestAnimationFrame(step);
      if (document.hidden) return;

      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.twinkle += 0.05;
        if (p.y > h + 30) { p.y = -30; p.x = Math.random() * w; }
        if (p.x < -40) p.x = w + 40;
        if (p.x > w + 40) p.x = -40;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        var a = p.alpha;
        if (p.type === 'sparkle') {
          a *= 0.4 + Math.sin(p.twinkle) * 0.5 + 0.1;
          if (a < 0) a = 0;
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.type === 'petal') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
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

  /* ============================================================
     5. SCRATCH CARD
     ============================================================ */
  function initScratch(root, data, options) {
    options = options || {};
    var stage = root.querySelector('.scratch-stage');
    if (!stage) {
      if (options.onReveal) options.onReveal();
      return { destroy: function () {}, reveal: function () {} };
    }

    var canvas = stage.querySelector('.scratch-canvas');
    var pointer = stage.querySelector('.scratch-pointer');
    var foil = stage.querySelector('.scratch-foil');
    var hint = stage.querySelector('.scratch-hint');
    var skipBtn = stage.querySelector('.skip-scratch');
    var enterBtn = stage.querySelector('.enter-btn');

    if (!canvas) {
      if (options.onReveal) options.onReveal();
      return { destroy: function () {}, reveal: function () {} };
    }

    var ctx = canvas.getContext('2d');
    var pctx = pointer ? pointer.getContext('2d') : null;
    if (!ctx) {
      if (options.onReveal) options.onReveal();
      return { destroy: function () {}, reveal: function () {} };
    }

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var drawing = false;
    var lastPt = null;
    var revealed = false;
    var measureTimer = null;
    var skipTimer = null;
    var sparkles = [];
    var sparkleRaf = null;

    function resize() {
      w = canvas.clientWidth || canvas.width || 1;
      h = canvas.clientHeight || canvas.height || 1;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (pointer && pctx) {
        pointer.width = Math.max(1, pointer.clientWidth);
        pointer.height = Math.max(1, pointer.clientHeight);
      }
      paintFoil();
    }

    function paintFoil() {
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#f3e0a1');
      g.addColorStop(0.4, '#d4af37');
      g.addColorStop(0.75, '#b8891f');
      g.addColorStop(1, '#8f6f1d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (var i = 0; i < 700; i++) {
        var nx = Math.random() * w;
        var ny = Math.random() * h;
        var r = Math.random() * 1.3;
        ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.18).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (var j = 0; j < 40; j++) {
        var sx = Math.random() * w;
        var sy = Math.random() * h;
        var ss = 3 + Math.random() * 5;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.25).toFixed(3) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx - ss, sy);
        ctx.lineTo(sx + ss, sy);
        ctx.moveTo(sx, sy - ss);
        ctx.lineTo(sx, sy + ss);
        ctx.stroke();
      }
    }

    function getXY(e) {
      var r = canvas.getBoundingClientRect();
      var cx = 0, cy = 0;
      if (e.touches && e.touches[0]) {
        cx = e.touches[0].clientX; cy = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches[0]) {
        cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY;
      } else {
        cx = e.clientX; cy = e.clientY;
      }
      return { x: cx - r.left, y: cy - r.top };
    }

    function scratchAt(x, y) {
      var radius = 22;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (lastPt) {
        var dx = x - lastPt.x;
        var dy = y - lastPt.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var steps = Math.min(Math.ceil(dist / 6), 12);
        for (var s = 1; s <= steps; s++) {
          var tt = s / steps;
          var px = lastPt.x + dx * tt;
          var py = lastPt.y + dy * tt;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      lastPt = { x: x, y: y };
      addSparkle(x, y);

      if (hint && !hint.classList.contains('is-hidden')) {
        hint.classList.add('is-hidden');
      }
    }

    function addSparkle(x, y) {
      for (var i = 0; i < 2; i++) {
        sparkles.push({
          x: x, y: y,
          vx: -1 + Math.random() * 2,
          vy: -2 - Math.random() * 2,
          life: 1,
          size: 1 + Math.random() * 2.5,
          color: Math.random() < 0.5 ? '#fff4cf' : '#d4af37'
        });
      }
      if (!sparkleRaf) sparkleRaf = requestAnimationFrame(drawSparkles);
    }

    function drawSparkles() {
      if (!pctx) { sparkleRaf = null; return; }
      var pw = pointer.width, ph = pointer.height;
      pctx.clearRect(0, 0, pw, ph);
      for (var i = sparkles.length - 1; i >= 0; i--) {
        var s = sparkles[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.03;
        if (s.life <= 0) { sparkles.splice(i, 1); continue; }
        pctx.globalAlpha = s.life;
        pctx.fillStyle = s.color;
        pctx.beginPath();
        pctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        pctx.fill();
      }
      pctx.globalAlpha = 1;
      if (sparkles.length > 0) sparkleRaf = requestAnimationFrame(drawSparkles);
      else sparkleRaf = null;
    }

    function onDown(e) {
      if (revealed) return;
      drawing = true;
      lastPt = null;
      if (foil) foil.style.opacity = '0.25';
      var pt = getXY(e);
      scratchAt(pt.x, pt.y);
      if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (!drawing || revealed) return;
      var pt = getXY(e);
      scratchAt(pt.x, pt.y);
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      drawing = false;
      lastPt = null;
    }

    if (window.PointerEvent) {
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('pointerleave', onUp);
    } else {
      canvas.addEventListener('mousedown', onDown);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseup', onUp);
      canvas.addEventListener('mouseleave', onUp);
      canvas.addEventListener('touchstart', onDown, { passive: false });
      canvas.addEventListener('touchmove', onMove, { passive: false });
      canvas.addEventListener('touchend', onUp);
      canvas.addEventListener('touchcancel', onUp);
    }

    function measurePercent() {
      if (revealed) return;
      try {
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        var total = 0, cleared = 0;
        var step = 40;
        for (var y = 0; y < canvas.height; y += step) {
          for (var x = 0; x < canvas.width; x += step) {
            var idx = (y * canvas.width + x) * 4 + 3;
            total++;
            if (img[idx] < 40) cleared++;
          }
        }
        var pct = total ? (cleared / total) : 0;
        if (pct >= 0.5) triggerReveal();
      } catch (err) { /* tainted canvas — ignore */ }
    }

    function triggerReveal() {
      if (revealed) return;
      revealed = true;
      if (measureTimer) { clearInterval(measureTimer); measureTimer = null; }
      if (skipTimer) { clearTimeout(skipTimer); skipTimer = null; }
      if (hint) hint.classList.add('is-hidden');
      if (skipBtn) skipBtn.classList.remove('is-visible');
      if (foil) foil.classList.add('is-fading');
      if (enterBtn) enterBtn.classList.add('is-visible');
    }

    measureTimer = setInterval(measurePercent, 150);

    skipTimer = setTimeout(function () {
      if (revealed) return;
      if (skipBtn) {
        skipBtn.classList.add('is-visible');
        skipBtn.addEventListener('click', function () { triggerReveal(); });
      }
    }, 8000);

    if (enterBtn) {
      enterBtn.addEventListener('click', function () {
        if (!revealed) return;
        if (options.onFirstTap) {
          try { options.onFirstTap(); } catch (e) {}
        }
        stage.classList.add('is-leaving');
        setTimeout(function () {
          if (options.onReveal) {
            try { options.onReveal(); } catch (e) {}
          }
        }, 800);
        setTimeout(function () { stage.classList.add('is-hidden'); }, 1600);
      });
    }

    resize();
    window.addEventListener('resize', resize);

    return {
      reveal: triggerReveal,
      destroy: function () {
        if (measureTimer) clearInterval(measureTimer);
        if (skipTimer) clearTimeout(skipTimer);
        if (sparkleRaf) cancelAnimationFrame(sparkleRaf);
        window.removeEventListener('resize', resize);
      }
    };
  }

  /* ============================================================
     6. MUSIC  (audio file/url, or video's sound)
     ============================================================ */
  function initMusic(root, data) {
    var music = data && data.music;
    var noop = {
      play: function () {}, pause: function () {}, toggle: function () {},
      destroy: function () {}, hasMusic: false
    };
    if (!music || music.type === 'none' || !music.src) return noop;

    var media = null;
    var hiddenVideo = null;
    var playing = false;
    var btn = root.querySelector('.music-btn');

    try {
      if (music.type === 'video-file' || music.type === 'video-url') {
        hiddenVideo = document.createElement('video');
        hiddenVideo.src = music.src;
        hiddenVideo.loop = true;
        hiddenVideo.playsInline = true;
        hiddenVideo.muted = false;
        hiddenVideo.preload = 'auto';
        hiddenVideo.style.position = 'absolute';
        hiddenVideo.style.width = '1px';
        hiddenVideo.style.height = '1px';
        hiddenVideo.style.opacity = '0';
        hiddenVideo.style.pointerEvents = 'none';
        hiddenVideo.setAttribute('aria-hidden', 'true');
        root.appendChild(hiddenVideo);
        media = hiddenVideo;
      } else {
        var a = new Audio();
        a.src = music.src;
        a.loop = true;
        a.preload = 'auto';
        a.volume = 0.55;
        media = a;
      }
    } catch (e) { return noop; }

    function paint() {
      if (!btn) return;
      btn.innerHTML = playing ? '🔊' : '🔇';
      btn.setAttribute('aria-label', playing ? 'Mute music' : 'Play music');
    }

    function play() {
      if (!media) return;
      try {
        var p = media.play();
        if (p && typeof p.then === 'function') {
          p.then(function () { playing = true; paint(); })
           .catch(function () { playing = false; paint(); });
        } else {
          playing = true; paint();
        }
      } catch (e) { playing = false; paint(); }
    }

    function pause() {
      if (!media) return;
      try { media.pause(); } catch (e) {}
      playing = false; paint();
    }

    function toggle() { if (playing) pause(); else play(); }

    if (btn) btn.addEventListener('click', toggle);
    paint();

    return {
      play: play,
      pause: pause,
      toggle: toggle,
      hasMusic: true,
      destroy: function () {
        if (media) { try { media.pause(); } catch (e) {} }
        if (hiddenVideo && hiddenVideo.parentNode) {
          hiddenVideo.parentNode.removeChild(hiddenVideo);
        }
      }
    };
  }

  /* ============================================================
     7. DOORS TRANSITION
     ============================================================ */
  function initDoors(root, onStart, onDone) {
    var stage = root.querySelector('.doors-stage');
    if (!stage) {
      if (onStart) onStart();
      if (onDone) onDone();
      return { open: function () {}, destroy: function () {} };
    }
    var opened = false;
    return {
      open: function () {
        if (opened) return;
        opened = true;
        stage.classList.remove('is-hidden');
        if (onStart) { try { onStart(); } catch (e) {} }
        // fade in doors + start open (is-open triggers everything in CSS)
        stage.classList.add('is-open');
        setTimeout(function () {
          if (onDone) { try { onDone(); } catch (e) {} }
        }, 1800);
        setTimeout(function () {
          stage.classList.add('is-hidden');
        }, 2800);
      },
      destroy: function () {}
    };
  }

  /* ============================================================
     8. SCENE BUILDERS
     ============================================================ */
  function buildScenes(data, S) {
    return '' +
      '<div class="scenes">' +
        buildS1(data, S) +
        buildS2(data, S) +
        buildS3(data, S) +
        buildS4(data, S) +
        buildS5(data, S) +
        buildS6(data, S) +
      '</div>';
  }

  function buildS1(data, S) {
    var bismillah = data.showBismillah
      ? (data.bismillahText || 'بسم اللہ الرحمن الرحیم')
      : '';
    return '' +
      '<section class="scene scene-blessing" data-cut="mehrab">' +
        '<div class="scene-inner">' +
          '<div class="anim" style="--d:100;">' + crescentStarSvg('blessing-svg') + '</div>' +
          (bismillah
            ? '<div class="bismillah urdu-heading anim" style="--d:300;">' + esc(bismillah) + '</div>'
            : '') +
          (data.blessingLine
            ? '<span class="gold-line"></span>' +
              '<p class="blessing-line anim" style="--d:700;">' + esc(data.blessingLine) + '</p>'
            : '') +
        '</div>' +
      '</section>';
  }

  function buildS2(data, S) {
    var brideUrdu = data.brideNameUrdu || '';
    var groomUrdu = data.groomNameUrdu || '';
    var brideLatin = data.brideName || '';
    var groomLatin = data.groomName || '';
    var photo = data.photo
      ? '<img class="couple-photo" alt="' + esc(brideLatin + ' and ' + groomLatin) + '" src="' + esc(data.photo) + '">'
      : '<div class="couple-monogram">' +
          esc(initial(brideLatin)) +
          '<span class="amp">&amp;</span>' +
          esc(initial(groomLatin)) +
        '</div>';
    return '' +
      '<section class="scene scene-names" data-cut="jali">' +
        '<div class="scene-inner">' +
          '<div class="couple-visual anim" style="--d:200;">' +
            '<div class="couple-frame">' + photo + '</div>' +
          '</div>' +
          '<div class="names-wrap">' +
            '<span class="role-badge">Dulhan</span>' +
            (brideUrdu
              ? '<h2 class="name-urdu anim" style="--d:400;">' + esc(brideUrdu) + '</h2>'
              : '') +
            (brideLatin
              ? '<p class="name-latin">' + letterSpans(brideLatin) + '</p>'
              : '') +
            '<div class="weds-word anim" style="--d:1000;">' + esc(S.weds) + '</div>' +
            '<span class="role-badge">Dulha</span>' +
            (groomUrdu
              ? '<h2 class="name-urdu anim" style="--d:1200;">' + esc(groomUrdu) + '</h2>'
              : '') +
            (groomLatin
              ? '<p class="name-latin">' + letterSpans(groomLatin) + '</p>'
              : '') +
          '</div>' +
          (data.brideFamily
            ? '<p class="parents-line anim" style="--d:1400;">' + esc(data.brideFamily) + '</p>'
            : '') +
          (data.groomFamily
            ? '<p class="parents-line anim" style="--d:1500;">' + esc(data.groomFamily) + '</p>'
            : '') +
        '</div>' +
      '</section>';
  }

  function buildS3(data, S) {
    var msg = String(data.message || '');
    var paras = msg.split(/\n\s*\n/).filter(function (p) { return p.trim(); });
    var msgHtml = paras.map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
    var msgUrdu = data.messageUrdu
      ? '<div class="message-body-urdu urdu">' + esc(data.messageUrdu).replace(/\n/g, '<br>') + '</div>'
      : '';
    return '' +
      '<section class="scene scene-message" data-cut="parda">' +
        '<div class="scene-inner">' +
          '<p class="scene-kicker anim" style="--d:100;">Invitation</p>' +
          '<span class="gold-line"></span>' +
          '<div class="message-body anim" style="--d:400;">' + msgHtml + '</div>' +
          msgUrdu +
          '<div class="dua-line anim" style="--d:1000;">Jazakallah khair</div>' +
        '</div>' +
      '</section>';
  }

  function buildS4(data, S) {
    var events = Array.isArray(data.events) ? data.events : [];
    var cards = events.map(function (ev, i) {
      var meta = [];
      if (ev.date) meta.push(formatDate(ev.date));
      if (ev.time) meta.push(ev.time);
      if (ev.venue) meta.push(ev.venue);
      return '' +
        '<div class="event-card anim" style="--d:' + (300 + i * 120) + ';">' +
          '<div class="event-icon">' + esc(ev.icon || '✦') + '</div>' +
          '<div>' +
            '<h3 class="event-name">' + esc(ev.name || 'Event') + '</h3>' +
            (meta.length ? '<p class="event-meta">' + esc(meta.join(' • ')) + '</p>' : '') +
            (ev.note ? '<p class="event-note">' + esc(ev.note) + '</p>' : '') +
          '</div>' +
        '</div>';
    }).join('');
    return '' +
      '<section class="scene scene-events" data-cut="ink">' +
        '<div class="scene-inner">' +
          '<p class="scene-kicker anim" style="--d:100;">Celebrations</p>' +
          '<span class="gold-line"></span>' +
          '<div class="events-wrap">' + cards + '</div>' +
        '</div>' +
      '</section>';
  }

  function buildS5(data, S) {
    return '' +
      '<section class="scene scene-countdown" data-cut="iris">' +
        '<div class="scene-inner">' +
          '<p class="scene-kicker anim" style="--d:100;">' + esc(S.countdownTitle) + '</p>' +
          '<span class="gold-line"></span>' +
          '<div class="countdown-grid" data-countdown>' +
            '<div class="countdown-cell"><span class="countdown-num" data-cd="d">00</span><span class="countdown-label">' + esc(S.days) + '</span></div>' +
            '<div class="countdown-cell"><span class="countdown-num" data-cd="h">00</span><span class="countdown-label">' + esc(S.hours) + '</span></div>' +
            '<div class="countdown-cell"><span class="countdown-num" data-cd="m">00</span><span class="countdown-label">' + esc(S.minutes) + '</span></div>' +
            '<div class="countdown-cell"><span class="countdown-num" data-cd="s">00</span><span class="countdown-label">' + esc(S.seconds) + '</span></div>' +
          '</div>' +
          '<p class="countdown-done" style="display:none;"></p>' +
        '</div>' +
      '</section>';
  }

  function buildS6(data, S) {
    var hasContact = !!(data.whatsappNumber || data.email);
    var relOpts = S.relOpts.map(function (o) {
      return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
    }).join('');
    var attendOpts = S.attendOpts.map(function (o) {
      return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
    }).join('');
    var chips = S.chips.map(function (c) {
      return '<button type="button" class="cf-chip" data-chip="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    return '' +
      '<section class="scene scene-closing" data-cut="lantern">' +
        '<div class="scene-inner">' +
          '<p class="scene-kicker anim" style="--d:100;">' + esc(S.venueTitle) + '</p>' +
          '<span class="gold-line"></span>' +
          '<div class="venue-block anim" style="--d:300;">' +
            (data.venueName ? '<h2 class="venue-name">' + esc(data.venueName) + '</h2>' : '') +
            (data.venueAddress ? '<p class="venue-address">' + esc(data.venueAddress) + '</p>' : '') +
          '</div>' +
          (data.mapsLink
            ? '<div class="cta-row anim" style="--d:500;">' +
                '<a class="card-btn card-btn-outline" href="' + esc(data.mapsLink) + '" target="_blank" rel="noopener">📍 ' + esc(S.openMaps) + '</a>' +
              '</div>'
            : '') +
          '<form class="greeting-form anim" style="--d:700;" novalidate>' +
            '<label>' + esc(S.nameLbl) +
              '<input type="text" class="cf-name" required maxlength="60" autocomplete="name">' +
            '</label>' +
            '<label>' + esc(S.relLbl) +
              '<select class="cf-relation">' + relOpts + '</select>' +
            '</label>' +
            '<label>' + esc(S.attendLbl) +
              '<select class="cf-attend">' + attendOpts + '</select>' +
            '</label>' +
            '<label>' + esc(S.guestsLbl) +
              '<input type="number" class="cf-guests" min="1" max="20" value="1">' +
            '</label>' +
            '<div class="cf-chips">' + chips + '</div>' +
            '<label>' + esc(S.msgLbl) +
              '<textarea class="cf-message" rows="3" maxlength="500"></textarea>' +
            '</label>' +
            '<div class="cf-actions">' +
              (data.whatsappNumber ? '<button type="button" class="cf-send-wa">💬 ' + esc(S.sendWA) + '</button>' : '') +
              (data.email ? '<button type="button" class="cf-send-email">✉ ' + esc(S.sendEmail) + '</button>' : '') +
            '</div>' +
            (!hasContact ? '<p style="font-size:12px;color:#ff9b9b;text-align:center;margin:4px 0 0;">' + esc(S.errNoContact) + '</p>' : '') +
            '<div class="cf-status" role="status" aria-live="polite"></div>' +
          '</form>' +
          '<p class="closing-blessing anim" style="--d:1000;">Jazakallah khair</p>' +
          '<p class="with-love anim" style="--d:1100;">' + esc(S.withLove) + '</p>' +
        '</div>' +
      '</section>';
  }

  /* ============================================================
     9. SCENES NAVIGATION
     ============================================================ */
  function initScenesNav(root) {
    var scenesEl = root.querySelector('.scenes');
    if (!scenesEl) return { show: function () {}, destroy: function () {} };
    var scenes = Array.prototype.slice.call(scenesEl.querySelectorAll('.scene'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('.progress-dot'));
    var prevBtn = root.querySelector('.scene-prev');
    var nextBtn = root.querySelector('.scene-next');
    var current = -1;
    var total = scenes.length;

    function show(idx, evt) {
      if (total === 0) return;
      if (idx < 0) idx = 0;
      if (idx > total - 1) idx = total - 1;
      if (idx === current) return;

      if (evt && scenes[idx]) {
        try {
          var r = scenesEl.getBoundingClientRect();
          var cx = (typeof evt.clientX === 'number') ? evt.clientX : (r.left + r.width / 2);
          var cy = (typeof evt.clientY === 'number') ? evt.clientY : (r.top + r.height / 2);
          var xPct = ((cx - r.left) / Math.max(1, r.width)) * 100;
          var yPct = ((cy - r.top) / Math.max(1, r.height)) * 100;
          scenes[idx].style.setProperty('--ink-x', xPct.toFixed(1) + '%');
          scenes[idx].style.setProperty('--ink-y', yPct.toFixed(1) + '%');
        } catch (e) {}
      }

      for (var i = 0; i < total; i++) {
        scenes[i].classList.toggle('is-active', i === idx);
      }
      for (var j = 0; j < dots.length; j++) {
        dots[j].classList.toggle('is-active', j === idx);
      }
      current = idx;
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === total - 1;
    }

    function next(e) { show(current + 1, e); }
    function prev(e) { show(current - 1, e); }

    if (prevBtn) prevBtn.addEventListener('click', function (e) { prev(e); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { next(e); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function (e) { show(i, e); });
    });

    function onKey(e) {
      if (!root.isConnected) return;
      var ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { prev(); }
    }
    document.addEventListener('keydown', onKey);

    var wheelLock = false;
    scenesEl.addEventListener('wheel', function (e) {
      if (wheelLock) return;
      if (Math.abs(e.deltaY) < 18) return;
      wheelLock = true;
      setTimeout(function () { wheelLock = false; }, 800);
      if (e.deltaY > 0) next(); else prev();
    }, { passive: true });

    var touchStart = null;
    scenesEl.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });
    scenesEl.addEventListener('touchend', function (e) {
      if (!touchStart) return;
      var tt = e.changedTouches[0];
      var dx = tt.clientX - touchStart.x;
      var dy = tt.clientY - touchStart.y;
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

  /* ============================================================
     10. COUNTDOWN
     ============================================================ */
  function initCountdown(root, data) {
    var wrap = root.querySelector('[data-countdown]');
    if (!wrap) return function () {};
    var target = parseDateTime(data.weddingDateTime);
    if (!target) return function () {};
    var S = t(data);
    var cells = {
      d: wrap.querySelector('[data-cd="d"]'),
      h: wrap.querySelector('[data-cd="h"]'),
      m: wrap.querySelector('[data-cd="m"]'),
      s: wrap.querySelector('[data-cd="s"]')
    };
    var doneEl = wrap.parentNode ? wrap.parentNode.querySelector('.countdown-done') : null;
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
          doneEl.textContent = (Date.now() - target.getTime() > 86400000)
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
      if (cells.d) cells.d.textContent = pad2(d);
      if (cells.h) cells.h.textContent = pad2(h);
      if (cells.m) cells.m.textContent = pad2(m);
      if (cells.s) cells.s.textContent = pad2(s);
    }

    tick();
    timer = setInterval(tick, 1000);
    return function () { if (timer) { clearInterval(timer); timer = null; } };
  }

  /* ============================================================
     11. GREETING FORM
     ============================================================ */
  function initGreetingForm(root, data) {
    var form = root.querySelector('.greeting-form');
    if (!form) return;
    var S = t(data);
    var nameEl = form.querySelector('.cf-name');
    var relEl = form.querySelector('.cf-relation');
    var attendEl = form.querySelector('.cf-attend');
    var guestsEl = form.querySelector('.cf-guests');
    var msgEl = form.querySelector('.cf-message');
    var statusEl = form.querySelector('.cf-status');
    var waBtn = form.querySelector('.cf-send-wa');
    var emailBtn = form.querySelector('.cf-send-email');

    form.querySelectorAll('.cf-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var txt = chip.getAttribute('data-chip') || '';
        if (msgEl) {
          msgEl.value = msgEl.value ? (msgEl.value + ' ' + txt) : txt;
          msgEl.focus();
        }
      });
    });

    function setStatus(msg, kind) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'cf-status';
      if (kind) statusEl.classList.add('is-' + kind);
    }

    function validate() {
      if (!nameEl || !nameEl.value.trim()) {
        setStatus(S.errName, 'error');
        if (nameEl) nameEl.focus();
        return false;
      }
      return true;
    }

    function composeMessage() {
      var attend = attendEl ? attendEl.value : '';
      var guests = guestsEl ? (parseInt(guestsEl.value, 10) || 1) : 1;
      var rel = relEl ? relEl.value : '';
      var msg = msgEl ? msgEl.value.trim() : '';
      var lines = [
        'Assalamu Alaikum,',
        '',
        'Name: ' + (nameEl ? nameEl.value.trim() : '')
      ];
      if (rel) lines.push('Relation: ' + rel);
      if (attend) lines.push('Attendance: ' + attend);
      lines.push('Guests: ' + guests);
      if (msg) {
        lines.push('');
        lines.push('Greeting: ' + msg);
      }
      lines.push('');
      lines.push('— Sent from your invitation card');
      return lines.join('\n');
    }

    if (waBtn) {
      waBtn.addEventListener('click', function () {
        if (!validate()) return;
        var link = waLink(data.whatsappNumber, composeMessage());
        if (!link) { setStatus(S.errNoContact, 'error'); return; }
        try { window.open(link, '_blank', 'noopener'); } catch (e) {}
        setStatus(S.thankYou, 'success');
      });
    }

    if (emailBtn) {
      emailBtn.addEventListener('click', function () {
        if (!validate()) return;
        var link = mailtoLink(data.email, 'Wedding Greeting', composeMessage());
        if (!link) { setStatus(S.errNoContact, 'error'); return; }
        try { window.location.href = link; } catch (e) {}
        setStatus(S.thankYou, 'success');
      });
    }
  }

  /* ============================================================
     12. TILT  (subtle 3D on event cards)
     ============================================================ */
  function initTilt(root) {
    if (prefersReducedMotion()) return;
    try {
      if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
    } catch (e) {}
    var cards = root.querySelectorAll('.event-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(700px) rotateY(' +
            (x * 8).toFixed(2) + 'deg) rotateX(' +
            (-y * 8).toFixed(2) + 'deg)';
        });
        card.addEventListener('mouseleave', function () {
          card.style.transform = '';
        });
      })(cards[i]);
    }
  }

  /* ============================================================
     13. PARALLAX  (subtle, mouse-only)
     ============================================================ */
  function initParallax(root) {
    if (prefersReducedMotion()) return { destroy: function () {} };
    var scenesEl = root.querySelector('.scenes');
    if (!scenesEl) return { destroy: function () {} };
    var rafId = null;
    var tx = 0, ty = 0;

    function apply() {
      rafId = null;
      var inner = scenesEl.querySelector('.scene.is-active .scene-inner');
      if (inner) {
        inner.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)';
      }
    }
    function onMove(e) {
      var r = root.getBoundingClientRect();
      tx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 8;
      ty = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 8;
      if (!rafId) rafId = requestAnimationFrame(apply);
    }
    root.addEventListener('mousemove', onMove);
    return {
      destroy: function () {
        root.removeEventListener('mousemove', onMove);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    };
  }

  /* ============================================================
     14. BACKGROUND LAYER
     ============================================================ */
  function buildBackground(data) {
    var bg = data.background || { mode: 'pattern' };
    var overlay = (typeof bg.overlay === 'number') ? bg.overlay : 0.3;
    var html = '<div class="bg-layer">';

    if (bg.mode === 'solid') {
      html += '<div class="bg-solid" style="background:' + esc(bg.src || '#0a2818') + ';"></div>';
    } else if (bg.mode === 'image' && bg.src) {
      html += '<div class="bg-pattern"></div>';
      html += '<div class="bg-image" style="background-image:url(\'' + esc(bg.src).replace(/'/g, '%27') + '\');"></div>';
    } else if (bg.mode === 'video' && bg.src) {
      html += '<div class="bg-pattern"></div>';
      html += '<video class="bg-video" src="' + esc(bg.src) + '" autoplay muted loop playsinline></video>';
    } else {
      html += '<div class="bg-pattern"></div>';
    }

    html += '<div class="bg-overlay" style="opacity:' + overlay + ';"></div>';
    html += '</div>';
    return html;
  }

  /* ============================================================
     15. HOST BADGE
     ============================================================ */
  function buildHostBadge(data) {
    var h = data.hostLabel || { mode: 'family', text: '' };
    if (!h || h.mode === 'hidden' || !h.text) return '';
    return '<div class="host-badge">' + esc(h.text) + '</div>';
  }

  /* ============================================================
     16. MAIN RENDER
     ============================================================ */
  function renderCard(data, root) {
    if (!root) return;
    data = data || {};

    if (typeof root.__wcmCleanup === 'function') {
      try { root.__wcmCleanup(); } catch (e) {}
      root.__wcmCleanup = null;
    }
    root.innerHTML = '';

    var S = t(data);
    var theme = (data.theme || 'emerald').replace(/[^a-z]/g, '');
    root.className = 'card-root card-theme-' + theme;

    var guest = getGuestName();
    var assalam = guest ? (S.assalam + ', ' + guest) : S.assalam;

    var html = '';
    html += buildBackground(data);
    html += '<canvas class="petals-canvas" aria-hidden="true"></canvas>';
    html += buildHostBadge(data);

    /* ---- Scratch stage ---- */
    html +=
      '<div class="scratch-stage">' +
        '<div class="scratch-card">' +
          '<div class="mehrab-border"></div>' +
          '<span class="ornament ornament-tl"></span>' +
          '<span class="ornament ornament-tr"></span>' +
          '<span class="ornament ornament-bl"></span>' +
          '<span class="ornament ornament-br"></span>' +
          '<div class="reveal-content">' +
            '<p class="reveal-assalam">' + esc(assalam) + '</p>' +
            (data.greetingTitle
              ? '<p class="reveal-greeting-title">' + esc(data.greetingTitle) + '</p>'
              : '') +
            (data.greetingText
              ? '<p class="reveal-greeting-text">' + esc(data.greetingText) + '</p>'
              : '') +
            '<div class="reveal-monogram">' +
              esc(initial(data.brideName)) +
              '<span style="font-size:.5em;color:var(--gold);margin:0 6px;">&amp;</span>' +
              esc(initial(data.groomName)) +
            '</div>' +
            '<p class="reveal-hint">' + esc(S.hint) + '</p>' +
          '</div>' +
          '<canvas class="scratch-canvas"></canvas>' +
          '<canvas class="scratch-pointer" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;"></canvas>' +
          '<div class="scratch-foil"></div>' +
          '<div class="scratch-hint">' +
            '<p class="scratch-hint-main">' + esc(data.scratchLabel || S.scratch) + '</p>' +
            '<p class="scratch-hint-urdu">' + esc(S.scratchUrdu) + '</p>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="skip-scratch">' + esc(S.skip) + '</button>' +
        '<button type="button" class="enter-btn">' +
          esc(S.enter) +
          '<span class="enter-btn-urdu">' + esc(S.enterUrdu) + '</span>' +
        '</button>' +
      '</div>';

    /* ---- Doors stage ---- */
    html +=
      '<div class="doors-stage is-hidden">' +
        '<div class="door-glow"></div>' +
        '<div class="door door-left"><div class="door-jali"></div></div>' +
        '<div class="door door-right"><div class="door-jali"></div></div>' +
        '<div class="door-ray"></div>' +
      '</div>';

    /* ---- Scenes ---- */
    html += buildScenes(data, S);

    /* ---- Music button ---- */
    var hasMusic = !!(data.music && data.music.type !== 'none' && data.music.src);
    if (hasMusic) {
      html += '<button type="button" class="music-btn" aria-label="Toggle music">🔇</button>';
    }

    /* ---- Progress dots ---- */
    html += '<div class="progress-dots" role="tablist" aria-label="Scenes">';
    for (var di = 0; di < 6; di++) {
      html += '<button type="button" class="progress-dot" data-scene="' + di +
        '" aria-label="Scene ' + (di + 1) + '"></button>';
    }
    html += '</div>';

    /* ---- Nav arrows ---- */
    html +=
      '<div class="scene-nav">' +
        '<button type="button" class="scene-prev" aria-label="Previous scene">‹</button>' +
        '<button type="button" class="scene-next" aria-label="Next scene">›</button>' +
      '</div>';

    root.innerHTML = html;

    /* =========================================================
       INIT SUBSYSTEMS
       ========================================================= */
    var particles = initParticles(root.querySelector('.petals-canvas'));
    var music = initMusic(root, data);
    initTilt(root);
    var parallax = initParallax(root);
    var cdCleanup = initCountdown(root, data);
    var nav = initScenesNav(root);
    initGreetingForm(root, data);

    /* Background video error -> fallback to pattern */
    var bgVideo = root.querySelector('.bg-video');
    if (bgVideo) {
      bgVideo.addEventListener('error', function () {
        bgVideo.style.display = 'none';
        var layer = root.querySelector('.bg-layer');
        if (layer && !layer.querySelector('.bg-pattern')) {
          var pattern = document.createElement('div');
          pattern.className = 'bg-pattern';
          layer.insertBefore(pattern, layer.firstChild);
        }
      });
    }

    /* Scratch -> doors -> scene 1 */
    var scratch = initScratch(root, data, {
      onFirstTap: function () {
        music.play();
      },
      onReveal: function () {
        var doors = initDoors(
          root,
          function () { nav.show(0); },   /* onStart: activate scene 1 behind doors */
          function () {}                   /* onDone  */
        );
        doors.open();
      }
    });

    /* Store cleanup for next render */
    root.__wcmCleanup = function () {
      try { particles.stop(); } catch (e) {}
      try { music.destroy(); } catch (e) {}
      try { cdCleanup(); } catch (e) {}
      try { nav.destroy(); } catch (e) {}
      try { parallax.destroy(); } catch (e) {}
      try { scratch.destroy(); } catch (e) {}
    };
  }

  /* ============================================================
     EXPOSE
     ============================================================ */
  window.renderCard = renderCard;
})();
/*ENGINE_END*/
