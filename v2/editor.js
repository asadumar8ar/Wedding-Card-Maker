/* =====================================================================
   EDITOR.JS  —  Nikah Card Maker (editor only)
   ---------------------------------------------------------------------
   Responsibilities:
     - Load / save editor data (localStorage key: "wcm_v2_data")
     - Fill the form from state, collect form into state
     - Live preview (iframe srcdoc = card.css + engine.js + data)
     - Photo compression (canvas, max 1200px, JPEG 0.8)
     - Music + background uploads with warnings
     - Download builder: fetch card.css + engine.js, build ONE
       self-contained HTML, show size, warn >12MB, trigger Blob download,
       save state, reload.
   Contains zero invitation logic (that lives in engine.js).
   ===================================================================== */

(function () {
  'use strict';

  /* Only run on the editor page */
  if (!document.getElementById('editorShell')) return;

  /* --------------------------------------------------------------
     CONSTANTS
     -------------------------------------------------------------- */
  var WCM_DATA_KEY = 'wcm_v2_data';
  window.WCM_DATA_KEY = WCM_DATA_KEY;

  var FONTS_LINK =
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
      'family=Noto+Nastaliq+Urdu:wght@400;500;600;700' +
      '&family=Aref+Ruqaa:wght@400;700' +
      '&family=Amiri:wght@400;700' +
      '&family=Cinzel+Decorative:wght@400;700' +
      '&family=Playfair+Display:wght@400;600;700' +
      '&family=Great+Vibes' +
      '&family=Poppins:wght@300;400;500;600' +
      '&display=swap">';

  var HEAVY_FILE_MB = 12;
  var BIG_UPLOAD_MB = 8;


  /* --------------------------------------------------------------
     SMALL HELPERS
     -------------------------------------------------------------- */
  var ESC_MAP = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  };
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  function pad2(n) {
    n = String(n);
    return n.length < 2 ? '0' + n : n;
  }

  function clone(o) {
    try { return JSON.parse(JSON.stringify(o)); }
    catch (e) { return o; }
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(ctx, args); }, ms);
    };
  }

  function futureDateTime(daysAhead) {
    var d = new Date();
    d.setDate(d.getDate() + (daysAhead || 60));
    d.setHours(19, 0, 0, 0);
    return d.getFullYear() + '-' +
           pad2(d.getMonth() + 1) + '-' +
           pad2(d.getDate()) + 'T' +
           pad2(d.getHours()) + ':' +
           pad2(d.getMinutes());
  }

  function byteLength(str) {
    try { return new Blob([str]).size; }
    catch (e) { return String(str).length; }
  }

  function deepMerge(defaults, overrides) {
    var out = clone(defaults);
    for (var k in overrides) {
      if (!Object.prototype.hasOwnProperty.call(overrides, k)) continue;
      var v = overrides[k];
      if (v && typeof v === 'object' && !Array.isArray(v) &&
          defaults[k] && typeof defaults[k] === 'object' &&
          !Array.isArray(defaults[k])) {
        out[k] = deepMerge(defaults[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.onerror = function () { reject(new Error('File read failed')); };
        reader.readAsDataURL(file);
      } catch (e) { reject(e); }
    });
  }

  function compressImage(file, maxWidth, quality) {
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('File read failed')); };
        reader.onload = function (ev) {
          var img = new Image();
          img.onerror = function () { reject(new Error('Image load failed')); };
          img.onload = function () {
            try {
              var ratio = Math.min(1, (maxWidth || 1200) / (img.width || 1));
              var w = Math.max(1, Math.round(img.width * ratio));
              var h = Math.max(1, Math.round(img.height * ratio));
              var canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality || 0.8));
            } catch (e) { reject(e); }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } catch (e) { reject(e); }
    });
  }


  /* --------------------------------------------------------------
     DEFAULT SAMPLE DATA
     -------------------------------------------------------------- */
  function getDefaultData() {
    return {
      brideName: 'Sara',
      groomName: 'Aamir',
      brideNameUrdu: 'سارہ',
      groomNameUrdu: 'عامر',
      brideFamily: 'D/o Mr. & Mrs. Imran Khan, Hyderabad',
      groomFamily: 'S/o Mr. & Mrs. Yusuf Siddiqui, Mumbai',
      weddingDateTime: futureDateTime(60),
      language: 'hinglish',
      showBismillah: true,
      bismillahText: 'بسم اللہ الرحمن الرحیم',
      blessingLine:
        'Allah ki rehmat se, hum aapko apni khushi mein shamil hone ki dawat dete hain.',
      message:
        'Assalamu Alaikum,\n\n' +
        'With the blessings of Allah and our elders, we joyfully invite you ' +
        'and your family to the Nikah of our beloved children. Your presence ' +
        'and duas will make our celebration truly complete.\n\n' +
        'Please join us for the Mehndi, Nikah and Walima — to share in our ' +
        'happiness and to pray for the couple\u2019s bright future together.\n\n' +
        'We eagerly await your presence at this blessed occasion. May Allah ' +
        'shower His barakah on all of us. Jazakallah khair.',
      messageUrdu:
        'السلام علیکم،\n\n' +
        'اللہ کے کرم اور بزرگوں کی دعاؤں سے ہم اپنی اولاد کی شادی کی خوشی میں ' +
        'آپ کو اور آپ کے اہلِ خانہ کو دعوت دیتے ہیں۔\n\n' +
        'آپ کی تشریف آوری اور دعائیں ہماری خوشی کو مکمل کریں گی۔ جزاک اللہ خیر۔',
      greetingTitle: 'Aapki dawat hai',
      greetingText: 'Assalamu Alaikum, hum aapko nikah ki dawat dete hain.',
      scratchLabel: 'Scratch karo ✨',
      hostLabel: {
        mode: 'family',
        text: 'With love from the Khan Family'
      },
      events: [
        {
          icon: '🌿', name: 'Mehndi',
          date: '', time: '4:00 PM',
          venue: "Bride's residence",
          note: 'Mehndi ke geet aur dhol'
        },
        {
          icon: '🌼', name: 'Ubtan / Haldi',
          date: '', time: '10:00 AM',
          venue: 'Family home',
          note: 'Rasm-e-ubtan'
        },
        {
          icon: '💍', name: 'Nikah',
          date: '', time: '7:00 PM',
          venue: 'Jama Masjid, Hyderabad',
          note: 'Nikah ki rasmein'
        },
        {
          icon: '💒', name: 'Walima',
          date: '', time: '8:00 PM',
          venue: 'Falaknuma Banquet Hall',
          note: 'Dawat-e-Walima'
        },
        {
          icon: '🥂', name: 'Rukhsati',
          date: '', time: '10:00 PM',
          venue: 'Same venue',
          note: 'Rukhsati ki dua'
        }
      ],
      venueName: 'Falaknuma Banquet Hall',
      venueAddress: '12, MG Road, Near Clock Tower, Hyderabad, Telangana 500001',
      mapsLink: 'https://maps.google.com/?q=Falaknuma+Banquet+Hall+Hyderabad',
      whatsappNumber: '+919876543210',
      email: '',
      photo: '',
      music: {
        type: 'none',
        src: '',
        alsoBackground: false
      },
      theme: 'emerald',
      background: {
        mode: 'pattern',
        src: '',
        overlay: 0.3,
        sceneOverrides: {
          s1: { mode: 'inherit', src: '' },
          s2: { mode: 'inherit', src: '' },
          s3: { mode: 'inherit', src: '' },
          s4: { mode: 'inherit', src: '' },
          s5: { mode: 'inherit', src: '' },
          s6: { mode: 'inherit', src: '' }
        }
      }
    };
  }


  /* --------------------------------------------------------------
     PERSISTENCE
     -------------------------------------------------------------- */
  function loadData() {
    try {
      var raw = localStorage.getItem(WCM_DATA_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return deepMerge(getDefaultData(), parsed);
    } catch (e) { return null; }
  }

  function saveData(d) {
    try {
      localStorage.setItem(WCM_DATA_KEY, JSON.stringify(d));
      return true;
    } catch (e) {
      return false;
    }
  }


  /* --------------------------------------------------------------
     STATE
     -------------------------------------------------------------- */
  var state = loadData() || getDefaultData();
  var cardCssText = '';
  var engineJsText = '';
  var assetsReady = false;


  /* --------------------------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------------------------- */
  var el = {
    shell: document.getElementById('editorShell'),
    editorPanel: document.getElementById('editorPanel'),
    previewPane: document.getElementById('previewPane'),
    previewFrame: document.getElementById('previewFrame'),
    tabEdit: document.getElementById('tabEdit'),
    tabPreview: document.getElementById('tabPreview'),
    toast: document.getElementById('toast'),

    btnReset: document.getElementById('btnReset'),
    btnReplay: document.getElementById('btnReplay'),
    btnDownload: document.getElementById('btnDownload'),
    btnDownloadBottom: document.getElementById('btnDownloadBottom'),
    fileSizeLabel: document.getElementById('fileSizeLabel'),

    inpLanguage: document.getElementById('inpLanguage'),
    inpShowBismillah: document.getElementById('inpShowBismillah'),
    inpBismillahText: document.getElementById('inpBismillahText'),
    inpBlessingLine: document.getElementById('inpBlessingLine'),
    inpScratchLabel: document.getElementById('inpScratchLabel'),
    inpGreetingTitle: document.getElementById('inpGreetingTitle'),
    inpGreetingText: document.getElementById('inpGreetingText'),
    inpMessage: document.getElementById('inpMessage'),
    inpMessageUrdu: document.getElementById('inpMessageUrdu'),

    inpBrideName: document.getElementById('inpBrideName'),
    inpGroomName: document.getElementById('inpGroomName'),
    inpBrideNameUrdu: document.getElementById('inpBrideNameUrdu'),
    inpGroomNameUrdu: document.getElementById('inpGroomNameUrdu'),
    inpBrideFamily: document.getElementById('inpBrideFamily'),
    inpGroomFamily: document.getElementById('inpGroomFamily'),

    inpWeddingDateTime: document.getElementById('inpWeddingDateTime'),
    inpVenueName: document.getElementById('inpVenueName'),
    inpVenueAddress: document.getElementById('inpVenueAddress'),
    inpMapsLink: document.getElementById('inpMapsLink'),

    inpHostMode: document.getElementById('inpHostMode'),
    inpHostText: document.getElementById('inpHostText'),

    inpWhatsapp: document.getElementById('inpWhatsapp'),
    inpEmail: document.getElementById('inpEmail'),

    eventsList: document.getElementById('eventsList'),
    btnAddEvent: document.getElementById('btnAddEvent'),

    inpPhoto: document.getElementById('inpPhoto'),
    photoPreview: document.getElementById('photoPreview'),
    btnClearPhoto: document.getElementById('btnClearPhoto'),

    inpMusicType: document.getElementById('inpMusicType'),
    inpMusicFile: document.getElementById('inpMusicFile'),
    inpMusicUrl: document.getElementById('inpMusicUrl'),
    inpMusicAlsoBg: document.getElementById('inpMusicAlsoBg'),
    btnClearMusic: document.getElementById('btnClearMusic'),
    musicStatus: document.getElementById('musicStatus'),
    musicFileRow: document.getElementById('musicFileRow'),
    musicUrlRow: document.getElementById('musicUrlRow'),

    inpBgMode: document.getElementById('inpBgMode'),
    inpBgOverlay: document.getElementById('inpBgOverlay'),
    btnRemoveBg: document.getElementById('btnRemoveBg'),
    btnResetOverrides: document.getElementById('btnResetOverrides'),
    inpBgSolidColor: document.getElementById('inpBgSolidColor'),
    inpBgImageFile: document.getElementById('inpBgImageFile'),
    inpBgImageUrl: document.getElementById('inpBgImageUrl'),
    inpBgVideoFile: document.getElementById('inpBgVideoFile'),
    inpBgVideoUrl: document.getElementById('inpBgVideoUrl'),
    bgSolidRow: document.getElementById('bgSolidRow'),
    bgImageRow: document.getElementById('bgImageRow'),
    bgVideoRow: document.getElementById('bgVideoRow'),
    sceneOverridesWrap: document.getElementById('sceneOverridesWrap'),

    themeRadios: document.querySelectorAll('input[name="theme"]')
  };


  /* --------------------------------------------------------------
     TOAST
     -------------------------------------------------------------- */
  var toastTimer = null;
  function showToast(msg, kind) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.className = 'toast is-visible' + (kind ? ' is-' + kind : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('is-visible');
    }, 3200);
  }


  /* --------------------------------------------------------------
     FETCH ASSETS  (card.css + engine.js)
     -------------------------------------------------------------- */
  function loadAssets() {
    return Promise.all([
      fetch('card.css', { cache: 'no-store' }),
      fetch('engine.js', { cache: 'no-store' })
    ]).then(function (res) {
      var cssRes = res[0], jsRes = res[1];
      if (!cssRes.ok) throw new Error('card.css load fail (' + cssRes.status + ')');
      if (!jsRes.ok) throw new Error('engine.js load fail (' + jsRes.status + ')');
      return Promise.all([cssRes.text(), jsRes.text()]);
    }).then(function (texts) {
      cardCssText = texts[0];
      engineJsText = texts[1];
      assetsReady = true;
    });
  }


  /* --------------------------------------------------------------
     FILL FORM FROM STATE
     -------------------------------------------------------------- */
  function fillForm() {
    function setVal(node, v) { if (node) node.value = (v == null ? '' : v); }
    function setCheck(node, v) { if (node) node.checked = !!v; }

    setVal(el.inpLanguage, state.language);
    setCheck(el.inpShowBismillah, state.showBismillah);
    setVal(el.inpBismillahText, state.bismillahText);
    setVal(el.inpBlessingLine, state.blessingLine);
    setVal(el.inpScratchLabel, state.scratchLabel);
    setVal(el.inpGreetingTitle, state.greetingTitle);
    setVal(el.inpGreetingText, state.greetingText);
    setVal(el.inpMessage, state.message);
    setVal(el.inpMessageUrdu, state.messageUrdu);

    setVal(el.inpBrideName, state.brideName);
    setVal(el.inpGroomName, state.groomName);
    setVal(el.inpBrideNameUrdu, state.brideNameUrdu);
    setVal(el.inpGroomNameUrdu, state.groomNameUrdu);
    setVal(el.inpBrideFamily, state.brideFamily);
    setVal(el.inpGroomFamily, state.groomFamily);

    setVal(el.inpWeddingDateTime, state.weddingDateTime);
    setVal(el.inpVenueName, state.venueName);
    setVal(el.inpVenueAddress, state.venueAddress);
    setVal(el.inpMapsLink, state.mapsLink);

    setVal(el.inpHostMode, (state.hostLabel && state.hostLabel.mode) || 'family');
    setVal(el.inpHostText, (state.hostLabel && state.hostLabel.text) || '');

    setVal(el.inpWhatsapp, state.whatsappNumber);
    setVal(el.inpEmail, state.email);

    setVal(el.inpMusicType, (state.music && state.music.type) || 'none');
    setCheck(el.inpMusicAlsoBg, state.music && state.music.alsoBackground);

    setVal(el.inpBgMode, (state.background && state.background.mode) || 'pattern');
    setVal(el.inpBgOverlay,
      (state.background && typeof state.background.overlay === 'number')
        ? state.background.overlay
        : 0.3);

    if (el.inpBgSolidColor) {
      var solidColor = (state.background && state.background.mode === 'solid' && state.background.src)
        ? state.background.src : '#0a2818';
      el.inpBgSolidColor.value = solidColor;
    }

    if (el.inpBgImageUrl) {
      el.inpBgImageUrl.value = (state.background && state.background.mode === 'image' &&
        state.background.src && !state.background.src.startsWith('data:'))
        ? state.background.src : '';
    }
    if (el.inpBgVideoUrl) {
      el.inpBgVideoUrl.value = (state.background && state.background.mode === 'video' &&
        state.background.src && !state.background.src.startsWith('data:'))
        ? state.background.src : '';
    }
    if (el.inpMusicUrl) {
      el.inpMusicUrl.value = (state.music && state.music.src &&
        (state.music.type === 'audio-url' || state.music.type === 'video-url'))
        ? state.music.src : '';
    }

    for (var i = 0; i < el.themeRadios.length; i++) {
      el.themeRadios[i].checked =
        el.themeRadios[i].value === (state.theme || 'emerald');
    }

    updatePhotoPreview();
    updateMusicStatus();
    updateMusicRows();
    updateBackgroundRows();
  }


  /* --------------------------------------------------------------
     COLLECT FORM INTO STATE  (usually via live handlers)
     -------------------------------------------------------------- */
  function collectForm() {
    function getVal(node) { return node ? node.value : ''; }
    function getCheck(node) { return node ? !!node.checked : false; }

    state.language = getVal(el.inpLanguage) || 'hinglish';
    state.showBismillah = getCheck(el.inpShowBismillah);
    state.bismillahText = getVal(el.inpBismillahText);
    state.blessingLine = getVal(el.inpBlessingLine);
    state.scratchLabel = getVal(el.inpScratchLabel);
    state.greetingTitle = getVal(el.inpGreetingTitle);
    state.greetingText = getVal(el.inpGreetingText);
    state.message = getVal(el.inpMessage);
    state.messageUrdu = getVal(el.inpMessageUrdu);

    state.brideName = getVal(el.inpBrideName);
    state.groomName = getVal(el.inpGroomName);
    state.brideNameUrdu = getVal(el.inpBrideNameUrdu);
    state.groomNameUrdu = getVal(el.inpGroomNameUrdu);
    state.brideFamily = getVal(el.inpBrideFamily);
    state.groomFamily = getVal(el.inpGroomFamily);

    state.weddingDateTime = getVal(el.inpWeddingDateTime);
    state.venueName = getVal(el.inpVenueName);
    state.venueAddress = getVal(el.inpVenueAddress);
    state.mapsLink = getVal(el.inpMapsLink);

    state.hostLabel = state.hostLabel || { mode: 'family', text: '' };
    state.hostLabel.mode = getVal(el.inpHostMode) || 'family';
    state.hostLabel.text = getVal(el.inpHostText);

    state.whatsappNumber = getVal(el.inpWhatsapp);
    state.email = getVal(el.inpEmail);

    state.music = state.music || { type: 'none', src: '', alsoBackground: false };
    state.music.type = getVal(el.inpMusicType) || 'none';
    state.music.alsoBackground = getCheck(el.inpMusicAlsoBg);

    state.background = state.background || {
      mode: 'pattern', src: '', overlay: 0.3, sceneOverrides: {}
    };
    state.background.mode = getVal(el.inpBgMode) || 'pattern';
    var ov = parseFloat(getVal(el.inpBgOverlay));
    state.background.overlay = isNaN(ov) ? 0.3 : ov;
  }


  /* --------------------------------------------------------------
     PHOTO PREVIEW / MUSIC STATUS
     -------------------------------------------------------------- */
  function updatePhotoPreview() {
    if (!el.photoPreview) return;
    if (state.photo) {
      el.photoPreview.innerHTML =
        '<img src="' + esc(state.photo) + '" alt="Couple photo">';
    } else {
      el.photoPreview.innerHTML =
        '<span class="photo-preview-empty">Koi photo nahi chuni</span>';
    }
  }

  function updateMusicStatus() {
    if (!el.musicStatus) return;
    var m = state.music;
    if (!m || m.type === 'none' || !m.src) {
      el.musicStatus.textContent = (m && m.type !== 'none')
        ? 'File / URL choose karo.'
        : 'Koi music nahi chuna.';
      return;
    }
    var sizeMB = (m.src.length * 0.75) / (1024 * 1024);
    if (m.src.indexOf('data:') === 0) {
      el.musicStatus.textContent =
        '✓ Embedded file (~' + sizeMB.toFixed(1) + ' MB)';
    } else {
      el.musicStatus.textContent = '✓ URL set';
    }
  }

  function updateMusicRows() {
    var t = (el.inpMusicType && el.inpMusicType.value) || 'none';
    var needsFile = (t === 'audio-file' || t === 'video-file');
    var needsUrl = (t === 'audio-url' || t === 'video-url');
    if (el.musicFileRow) el.musicFileRow.style.display = needsFile ? 'flex' : 'none';
    if (el.musicUrlRow) el.musicUrlRow.style.display = needsUrl ? 'flex' : 'none';
  }

  function updateBackgroundRows() {
    var mode = (el.inpBgMode && el.inpBgMode.value) || 'pattern';
    if (el.bgSolidRow) el.bgSolidRow.style.display = mode === 'solid' ? 'flex' : 'none';
    if (el.bgImageRow) el.bgImageRow.style.display = mode === 'image' ? 'block' : 'none';
    if (el.bgVideoRow) el.bgVideoRow.style.display = mode === 'video' ? 'block' : 'none';
  }


  /* --------------------------------------------------------------
     EVENTS LIST UI
     -------------------------------------------------------------- */
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
            'aria-label="Event icon" value="' + esc(ev.icon || '✦') + '">' +
          '<strong>Event ' + (i + 1) + '</strong>' +
          '<div class="event-item-actions">' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="up" ' +
              'title="Move up" ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="down" ' +
              'title="Move down" ' + (i === events.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="remove" ' +
              'title="Remove">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="event-item-grid">' +
          '<label class="field"><span class="field-label">Name</span>' +
            '<input class="field-input" data-key="name" type="text" value="' +
              esc(ev.name || '') + '"></label>' +
          '<label class="field"><span class="field-label">Date</span>' +
            '<input class="field-input" data-key="date" type="date" value="' +
              esc(ev.date || '') + '"></label>' +
          '<label class="field"><span class="field-label">Time</span>' +
            '<input class="field-input" data-key="time" type="text" placeholder="7:00 PM" value="' +
              esc(ev.time || '') + '"></label>' +
          '<label class="field"><span class="field-label">Venue</span>' +
            '<input class="field-input" data-key="venue" type="text" value="' +
              esc(ev.venue || '') + '"></label>' +
          '<label class="field span-2"><span class="field-label">Note</span>' +
            '<input class="field-input" data-key="note" type="text" value="' +
              esc(ev.note || '') + '"></label>' +
        '</div>';

      /* wire inputs */
      item.querySelectorAll('[data-key]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          ev[inp.getAttribute('data-key')] = inp.value;
          schedulePreview();
          scheduleFileSize();
        });
      });

      /* emoji */
      var emojiInput = item.querySelector('.event-item-emoji');
      if (emojiInput) {
        emojiInput.addEventListener('input', function () {
          ev.icon = emojiInput.value;
          schedulePreview();
          scheduleFileSize();
        });
      }

      /* actions */
      item.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var action = btn.getAttribute('data-action');
          if (action === 'remove') {
            state.events.splice(i, 1);
          } else if (action === 'up' && i > 0) {
            var tmp = state.events[i - 1];
            state.events[i - 1] = state.events[i];
            state.events[i] = tmp;
          } else if (action === 'down' && i < state.events.length - 1) {
            var tmp2 = state.events[i + 1];
            state.events[i + 1] = state.events[i];
            state.events[i] = tmp2;
          }
          renderEventsList();
          schedulePreview();
          scheduleFileSize();
        });
      });

      el.eventsList.appendChild(item);
    });
  }


  /* --------------------------------------------------------------
     SCENE OVERRIDES UI
     -------------------------------------------------------------- */
  function renderSceneOverrides() {
    if (!el.sceneOverridesWrap) return;
    if (!state.background.sceneOverrides) {
      state.background.sceneOverrides = {};
    }
    var ov = state.background.sceneOverrides;

    var html = '';
    for (var i = 1; i <= 6; i++) {
      var key = 's' + i;
      var cur = ov[key] || { mode: 'inherit', src: '' };
      html +=
        '<div class="scene-override-row" data-ov-id="' + key + '">' +
          '<span class="scene-override-tag">S' + i + '</span>' +
          '<select class="ov-mode">' +
            '<option value="inherit"' + (cur.mode === 'inherit' ? ' selected' : '') + '>Inherit</option>' +
            '<option value="pattern"' + (cur.mode === 'pattern' ? ' selected' : '') + '>Pattern</option>' +
            '<option value="solid"' + (cur.mode === 'solid' ? ' selected' : '') + '>Solid</option>' +
            '<option value="image"' + (cur.mode === 'image' ? ' selected' : '') + '>Image URL</option>' +
            '<option value="video"' + (cur.mode === 'video' ? ' selected' : '') + '>Video URL</option>' +
          '</select>' +
          '<div class="ov-src-row" style="display:' +
            (cur.mode === 'inherit' || cur.mode === 'pattern' ? 'none' : 'block') +
          ';">' +
            '<input class="ov-src" type="text" ' +
              'placeholder="' + (cur.mode === 'solid' ? 'Colour (#0a2818)' : 'URL') + '" ' +
              'value="' + esc(cur.src || '') + '">' +
          '</div>' +
        '</div>';
    }
    el.sceneOverridesWrap.innerHTML = html;

    el.sceneOverridesWrap.querySelectorAll('.scene-override-row').forEach(function (row) {
      var key = row.getAttribute('data-ov-id');
      var modeSelect = row.querySelector('.ov-mode');
      var srcRow = row.querySelector('.ov-src-row');
      var srcInput = row.querySelector('.ov-src');

      modeSelect.addEventListener('change', function () {
        var m = modeSelect.value;
        srcRow.style.display = (m === 'inherit' || m === 'pattern') ? 'none' : 'block';
        srcInput.placeholder = (m === 'solid') ? 'Colour (#0a2818)' : 'URL';
        if (!state.background.sceneOverrides[key]) {
          state.background.sceneOverrides[key] = { mode: 'inherit', src: '' };
        }
        state.background.sceneOverrides[key].mode = m;
        schedulePreview();
        scheduleFileSize();
      });

      srcInput.addEventListener('input', function () {
        if (!state.background.sceneOverrides[key]) {
          state.background.sceneOverrides[key] = { mode: 'inherit', src: '' };
        }
        state.background.sceneOverrides[key].src = srcInput.value;
        schedulePreview();
        scheduleFileSize();
      });
    });
  }


  /* --------------------------------------------------------------
     PREVIEW RENDERING
     -------------------------------------------------------------- */
  function sanitizeForInline(str, tag) {
    if (tag === 'style') return str.replace(/<\/style/gi, '<\\/style');
    return str.replace(/<\/script/gi, '<\\/script');
  }

  function buildPreviewHtml(skipScratch) {
    var jsonSafe = sanitizeForInline(JSON.stringify(state), 'script');
    var cssSafe = sanitizeForInline(cardCssText, 'style');
    var jsSafe = sanitizeForInline(engineJsText, 'script');

    var skipScript = skipScratch
      ? '<script>\n' +
          'setTimeout(function(){try{' +
            'var s=document.querySelector(".scratch-stage"); if(s) s.style.display="none";' +
            'var d=document.querySelector(".doors-stage"); if(d) d.classList.add("is-hidden");' +
            'var sc=document.querySelectorAll(".scene"); if(sc[0]) sc[0].classList.add("is-active");' +
            'var dt=document.querySelectorAll(".progress-dot"); if(dt[0]) dt[0].classList.add("is-active");' +
            'var pv=document.querySelector(".scene-prev"); if(pv) pv.disabled=true;' +
          '}catch(e){}}, 90);\n' +
        '<\/script>'
      : '';

    var overridesScript =
      '<script>\n' +
      '(function(){try{' +
        'var data=window.CARD_DATA;' +
        'if(!data||!data.background||!data.background.sceneOverrides) return;' +
        'var root=document.getElementById("card-root"); if(!root) return;' +
        'var scenes=root.querySelectorAll(".scene");' +
        'var keys=["s1","s2","s3","s4","s5","s6"];' +
        'scenes.forEach(function(el,i){' +
          'var key=keys[i]; if(!key) return;' +
          'var ov=data.background.sceneOverrides[key];' +
          'if(!ov||ov.mode==="inherit") return;' +
          'var bg=document.createElement("div");' +
          'bg.style.cssText="position:absolute;inset:0;z-index:-1;pointer-events:none;";' +
          'if(ov.mode==="solid"){bg.style.background=ov.src||"#0a2818";}' +
          'else if(ov.mode==="pattern"){bg.style.background="var(--bg)";}' +
          'else if(ov.mode==="image"&&ov.src){' +
            'bg.style.backgroundImage="url("+JSON.stringify(ov.src)+")";' +
            'bg.style.backgroundSize="cover";bg.style.backgroundPosition="center";}' +
          'else if(ov.mode==="video"&&ov.src){' +
            'var v=document.createElement("video");v.src=ov.src;' +
            'v.autoplay=true;v.muted=true;v.loop=true;v.playsInline=true;' +
            'v.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";' +
            'v.onerror=function(){v.remove();};bg.appendChild(v);}' +
          'el.insertBefore(bg, el.firstChild);' +
        '});' +
      '}catch(e){}})();\n' +
      '<\/script>';

    return '<!DOCTYPE html>\n<html lang="hi">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      FONTS_LINK + '\n' +
      '<style>\n' + cssSafe + '\n</style>\n' +
      '</head>\n<body>\n' +
      '<div id="card-root" class="card-root"></div>\n' +
      '<script>window.CARD_DATA = ' + jsonSafe + ';\n<\/script>\n' +
      '<script>\n' + jsSafe + '\n<\/script>\n' +
      '<script>\n' +
        '(function(){try{' +
          'window.renderCard(window.CARD_DATA, document.getElementById("card-root"));' +
        '}catch(e){console.error(e);}})();\n' +
      '<\/script>\n' +
      overridesScript + '\n' +
      skipScript + '\n' +
      '</body>\n</html>';
  }

  function renderPreview(skipScratch) {
    if (!el.previewFrame) return;
    if (!assetsReady) {
      el.previewFrame.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
        'html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;' +
        'background:#1f0d14;color:#f0dcae;font-family:system-ui,sans-serif;text-align:center;' +
        'padding:24px;box-sizing:border-box;line-height:1.6;}' +
        'h2{color:#d4af37;margin:0 0 12px;font-size:18px;}' +
        'p{margin:0;font-size:14px;opacity:.85;}' +
        '</style></head><body>' +
        '<div><h2>Preview load ho raha hai…</h2>' +
        '<p>card.css aur engine.js laaye ja rahe hain.</p></div>' +
        '</body></html>';
      return;
    }
    try {
      var html = buildPreviewHtml(skipScratch !== false);
      /* force reload even if same string */
      el.previewFrame.srcdoc = '';
      var target = el.previewFrame;
      setTimeout(function () { target.srcdoc = html; }, 0);
    } catch (e) {
      console.error('Preview render failed', e);
    }
  }

  function renderPreviewError(msg) {
    if (!el.previewFrame) return;
    el.previewFrame.srcdoc =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
      'html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;' +
      'background:#1f0d14;color:#f0dcae;font-family:system-ui,sans-serif;text-align:center;' +
      'padding:24px;box-sizing:border-box;line-height:1.6;}' +
      'h2{color:#ff9b9b;margin:0 0 12px;font-size:18px;}' +
      'p{margin:0;font-size:14px;opacity:.85;}' +
      '</style></head><body>' +
      '<div><h2>Preview load nahi hua</h2>' +
      '<p>' + esc(msg || 'card.css / engine.js fail huye.') + '</p>' +
      '<p style="margin-top:8px;">GitHub Pages / Vercel pe upload karke try karo. ' +
      'file:// se open karne pe fetch fail hota hai.</p></div>' +
      '</body></html>';
  }

  var schedulePreview = debounce(function () {
    renderPreview(true);
  }, 150);

  var renderPreviewReplay = function () {
    renderPreview(false);
  };


  /* --------------------------------------------------------------
     FILE SIZE  (debounced)
     -------------------------------------------------------------- */
  function estimateSizeBytes() {
    if (!assetsReady) return 0;
    try {
      var jsonBytes = byteLength(JSON.stringify(state));
      var cssBytes = byteLength(cardCssText);
      var jsBytes = byteLength(engineJsText);
      return 3500 + jsonBytes + cssBytes + jsBytes;
    } catch (e) { return 0; }
  }

  function updateFileSize() {
    if (!el.fileSizeLabel) return;
    if (!assetsReady) {
      el.fileSizeLabel.textContent = '…';
      return;
    }
    var bytes = estimateSizeBytes();
    var mb = bytes / (1024 * 1024);
    if (mb < 1) {
      el.fileSizeLabel.textContent = Math.max(1, Math.round(bytes / 1024)) + ' KB';
    } else {
      el.fileSizeLabel.textContent = mb.toFixed(2) + ' MB';
    }
    if (mb > HEAVY_FILE_MB) {
      el.fileSizeLabel.classList.add('is-heavy');
      el.fileSizeLabel.title =
        'File bhaari hai, WhatsApp pe nahi jayegi. Video/music ka link (URL) use karo.';
    } else {
      el.fileSizeLabel.classList.remove('is-heavy');
      el.fileSizeLabel.title = '';
    }
  }

  var scheduleFileSize = debounce(updateFileSize, 500);


  /* --------------------------------------------------------------
     LIVE INPUT HANDLERS
     -------------------------------------------------------------- */
  function onFieldLive(key, inputEl, isCheckbox) {
    if (!inputEl) return;
    var handler = function () {
      state[key] = isCheckbox ? inputEl.checked : inputEl.value;
      schedulePreview();
      scheduleFileSize();
    };
    inputEl.addEventListener('input', handler);
    if (isCheckbox) inputEl.addEventListener('change', handler);
  }

  function wireLiveInputs() {
    onFieldLive('language', el.inpLanguage);
    onFieldLive('showBismillah', el.inpShowBismillah, true);
    onFieldLive('bismillahText', el.inpBismillahText);
    onFieldLive('blessingLine', el.inpBlessingLine);
    onFieldLive('scratchLabel', el.inpScratchLabel);
    onFieldLive('greetingTitle', el.inpGreetingTitle);
    onFieldLive('greetingText', el.inpGreetingText);
    onFieldLive('message', el.inpMessage);
    onFieldLive('messageUrdu', el.inpMessageUrdu);

    onFieldLive('brideName', el.inpBrideName);
    onFieldLive('groomName', el.inpGroomName);
    onFieldLive('brideNameUrdu', el.inpBrideNameUrdu);
    onFieldLive('groomNameUrdu', el.inpGroomNameUrdu);
    onFieldLive('brideFamily', el.inpBrideFamily);
    onFieldLive('groomFamily', el.inpGroomFamily);

    onFieldLive('weddingDateTime', el.inpWeddingDateTime);
    onFieldLive('venueName', el.inpVenueName);
    onFieldLive('venueAddress', el.inpVenueAddress);
    onFieldLive('mapsLink', el.inpMapsLink);
    onFieldLive('whatsappNumber', el.inpWhatsapp);
    onFieldLive('email', el.inpEmail);

    if (el.inpHostMode) {
      el.inpHostMode.addEventListener('change', function () {
        state.hostLabel = state.hostLabel || { mode: 'family', text: '' };
        state.hostLabel.mode = el.inpHostMode.value;
        schedulePreview();
        scheduleFileSize();
      });
    }
    if (el.inpHostText) {
      el.inpHostText.addEventListener('input', function () {
        state.hostLabel = state.hostLabel || { mode: 'family', text: '' };
        state.hostLabel.text = el.inpHostText.value;
        schedulePreview();
        scheduleFileSize();
      });
    }

    /* Theme radios */
    for (var i = 0; i < el.themeRadios.length; i++) {
      (function (r) {
        r.addEventListener('change', function () {
          if (!r.checked) return;
          state.theme = r.value;
          schedulePreview();
          scheduleFileSize();
        });
      })(el.themeRadios[i]);
    }
  }


  /* --------------------------------------------------------------
     PHOTO / MUSIC / BACKGROUND HANDLERS
     -------------------------------------------------------------- */
  function wirePhoto() {
    if (el.inpPhoto) {
      el.inpPhoto.addEventListener('change', function () {
        var file = el.inpPhoto.files && el.inpPhoto.files[0];
        if (!file) return;
        compressImage(file, 1200, 0.8).then(function (dataUrl) {
          state.photo = dataUrl;
          updatePhotoPreview();
          schedulePreview();
          scheduleFileSize();
        }).catch(function (err) {
          showToast('Photo load fail: ' + (err && err.message || 'error'), 'error');
        });
      });
    }
    if (el.btnClearPhoto) {
      el.btnClearPhoto.addEventListener('click', function () {
        state.photo = '';
        if (el.inpPhoto) el.inpPhoto.value = '';
        updatePhotoPreview();
        schedulePreview();
        scheduleFileSize();
      });
    }
  }

  function wireMusic() {
    if (el.inpMusicType) {
      el.inpMusicType.addEventListener('change', function () {
        var t = el.inpMusicType.value;
        state.music = state.music || { type: 'none', src: '', alsoBackground: false };
        state.music.type = t;
        if (t === 'none') state.music.src = '';
        /* clear opposite field */
        if ((t === 'audio-file' || t === 'video-file') && el.inpMusicUrl) {
          el.inpMusicUrl.value = '';
        }
        if ((t === 'audio-url' || t === 'video-url') && el.inpMusicFile) {
          el.inpMusicFile.value = '';
          state.music.src = '';
        }
        updateMusicRows();
        updateMusicStatus();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.inpMusicFile) {
      el.inpMusicFile.addEventListener('change', function () {
        var file = el.inpMusicFile.files && el.inpMusicFile.files[0];
        if (!file) return;
        var sizeMB = file.size / (1024 * 1024);
        if (sizeMB > BIG_UPLOAD_MB) {
          showToast(
            'File ' + sizeMB.toFixed(1) + ' MB hai — 8 MB se chhoti rakho. ' +
            'Download bhaari ho sakta hai.',
            'error'
          );
        }
        readFileAsDataUrl(file).then(function (dataUrl) {
          state.music = state.music || { type: 'audio-file', src: '', alsoBackground: false };
          state.music.src = dataUrl;
          updateMusicStatus();
          schedulePreview();
          scheduleFileSize();
        }).catch(function (err) {
          showToast('File load fail: ' + (err && err.message || 'error'), 'error');
        });
      });
    }

    if (el.inpMusicUrl) {
      el.inpMusicUrl.addEventListener('input', function () {
        state.music = state.music || { type: 'audio-url', src: '', alsoBackground: false };
        state.music.src = el.inpMusicUrl.value;
        updateMusicStatus();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.inpMusicAlsoBg) {
      el.inpMusicAlsoBg.addEventListener('change', function () {
        state.music = state.music || { type: 'none', src: '', alsoBackground: false };
        state.music.alsoBackground = el.inpMusicAlsoBg.checked;
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.btnClearMusic) {
      el.btnClearMusic.addEventListener('click', function () {
        state.music = { type: 'none', src: '', alsoBackground: false };
        if (el.inpMusicFile) el.inpMusicFile.value = '';
        if (el.inpMusicUrl) el.inpMusicUrl.value = '';
        if (el.inpMusicType) el.inpMusicType.value = 'none';
        if (el.inpMusicAlsoBg) el.inpMusicAlsoBg.checked = false;
        updateMusicRows();
        updateMusicStatus();
        schedulePreview();
        scheduleFileSize();
      });
    }
  }

  function wireBackground() {
    if (el.inpBgMode) {
      el.inpBgMode.addEventListener('change', function () {
        var mode = el.inpBgMode.value;
        state.background = state.background || {
          mode: 'pattern', src: '', overlay: 0.3, sceneOverrides: {}
        };
        state.background.mode = mode;
        if (mode === 'pattern') {
          state.background.src = '';
        } else if (mode === 'solid') {
          state.background.src = el.inpBgSolidColor
            ? el.inpBgSolidColor.value
            : '#0a2818';
        }
        updateBackgroundRows();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.inpBgOverlay) {
      el.inpBgOverlay.addEventListener('input', function () {
        var v = parseFloat(el.inpBgOverlay.value);
        state.background = state.background || {
          mode: 'pattern', src: '', overlay: 0.3, sceneOverrides: {}
        };
        state.background.overlay = isNaN(v) ? 0.3 : v;
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.inpBgSolidColor) {
      el.inpBgSolidColor.addEventListener('input', function () {
        if (state.background && state.background.mode === 'solid') {
          state.background.src = el.inpBgSolidColor.value;
          schedulePreview();
          scheduleFileSize();
        }
      });
    }

    if (el.inpBgImageFile) {
      el.inpBgImageFile.addEventListener('change', function () {
        var file = el.inpBgImageFile.files && el.inpBgImageFile.files[0];
        if (!file) return;
        compressImage(file, 1200, 0.8).then(function (dataUrl) {
          state.background = state.background || {
            mode: 'image', src: '', overlay: 0.3, sceneOverrides: {}
          };
          state.background.mode = 'image';
          state.background.src = dataUrl;
          if (el.inpBgImageUrl) el.inpBgImageUrl.value = '';
          if (el.inpBgMode) el.inpBgMode.value = 'image';
          updateBackgroundRows();
          schedulePreview();
          scheduleFileSize();
        }).catch(function (err) {
          showToast('Image fail: ' + (err && err.message || 'error'), 'error');
        });
      });
    }

    if (el.inpBgImageUrl) {
      el.inpBgImageUrl.addEventListener('input', function () {
        state.background = state.background || {
          mode: 'image', src: '', overlay: 0.3, sceneOverrides: {}
        };
        state.background.mode = 'image';
        state.background.src = el.inpBgImageUrl.value;
        if (el.inpBgMode) el.inpBgMode.value = 'image';
        updateBackgroundRows();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.inpBgVideoFile) {
      el.inpBgVideoFile.addEventListener('change', function () {
        var file = el.inpBgVideoFile.files && el.inpBgVideoFile.files[0];
        if (!file) return;
        var sizeMB = file.size / (1024 * 1024);
        if (sizeMB > BIG_UPLOAD_MB) {
          showToast(
            'Video ' + sizeMB.toFixed(1) + ' MB hai. 8 MB se chhoti file ya URL use karo.',
            'error'
          );
          return;
        }
        readFileAsDataUrl(file).then(function (dataUrl) {
          state.background = state.background || {
            mode: 'video', src: '', overlay: 0.3, sceneOverrides: {}
          };
          state.background.mode = 'video';
          state.background.src = dataUrl;
          if (el.inpBgVideoUrl) el.inpBgVideoUrl.value = '';
          if (el.inpBgMode) el.inpBgMode.value = 'video';
          updateBackgroundRows();
          schedulePreview();
          scheduleFileSize();
        }).catch(function (err) {
          showToast('Video fail: ' + (err && err.message || 'error'), 'error');
        });
      });
    }

    if (el.inpBgVideoUrl) {
      el.inpBgVideoUrl.addEventListener('input', function () {
        state.background = state.background || {
          mode: 'video', src: '', overlay: 0.3, sceneOverrides: {}
        };
        state.background.mode = 'video';
        state.background.src = el.inpBgVideoUrl.value;
        if (el.inpBgMode) el.inpBgMode.value = 'video';
        updateBackgroundRows();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.btnRemoveBg) {
      el.btnRemoveBg.addEventListener('click', function () {
        state.background = state.background || {
          mode: 'solid', src: '#0a2818', overlay: 0.3, sceneOverrides: {}
        };
        state.background.mode = 'solid';
        state.background.src = '#0a2818';
        if (el.inpBgMode) el.inpBgMode.value = 'solid';
        if (el.inpBgSolidColor) el.inpBgSolidColor.value = '#0a2818';
        if (el.inpBgImageUrl) el.inpBgImageUrl.value = '';
        if (el.inpBgVideoUrl) el.inpBgVideoUrl.value = '';
        updateBackgroundRows();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.btnResetOverrides) {
      el.btnResetOverrides.addEventListener('click', function () {
        state.background.sceneOverrides = {
          s1: { mode: 'inherit', src: '' },
          s2: { mode: 'inherit', src: '' },
          s3: { mode: 'inherit', src: '' },
          s4: { mode: 'inherit', src: '' },
          s5: { mode: 'inherit', src: '' },
          s6: { mode: 'inherit', src: '' }
        };
        renderSceneOverrides();
        schedulePreview();
        scheduleFileSize();
      });
    }
  }


  /* --------------------------------------------------------------
     DOWNLOAD BUILDER
     -------------------------------------------------------------- */
  function buildDownloadHtml() {
    var jsonSafe = sanitizeForInline(JSON.stringify(state), 'script');
    var cssSafe = sanitizeForInline(cardCssText, 'style');
    var jsSafe = sanitizeForInline(engineJsText, 'script');

    var titleText =
      (state.brideName || 'Bride') + ' weds ' +
      (state.groomName || 'Groom') + ' — Invitation';

    var overridesScript =
      '<script>\n' +
      '(function(){try{' +
        'var data=window.CARD_DATA;' +
        'if(!data||!data.background||!data.background.sceneOverrides) return;' +
        'var root=document.getElementById("card-root"); if(!root) return;' +
        'var scenes=root.querySelectorAll(".scene");' +
        'var keys=["s1","s2","s3","s4","s5","s6"];' +
        'scenes.forEach(function(el,i){' +
          'var key=keys[i]; if(!key) return;' +
          'var ov=data.background.sceneOverrides[key];' +
          'if(!ov||ov.mode==="inherit") return;' +
          'var bg=document.createElement("div");' +
          'bg.style.cssText="position:absolute;inset:0;z-index:-1;pointer-events:none;";' +
          'if(ov.mode==="solid"){bg.style.background=ov.src||"#0a2818";}' +
          'else if(ov.mode==="pattern"){bg.style.background="var(--bg)";}' +
          'else if(ov.mode==="image"&&ov.src){' +
            'bg.style.backgroundImage="url("+JSON.stringify(ov.src)+")";' +
            'bg.style.backgroundSize="cover";bg.style.backgroundPosition="center";}' +
          'else if(ov.mode==="video"&&ov.src){' +
            'var v=document.createElement("video");v.src=ov.src;' +
            'v.autoplay=true;v.muted=true;v.loop=true;v.playsInline=true;' +
            'v.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";' +
            'v.onerror=function(){v.remove();};bg.appendChild(v);}' +
          'el.insertBefore(bg, el.firstChild);' +
        '});' +
      '}catch(e){}})();\n' +
      '<\/script>';

    return '<!DOCTYPE html>\n<html lang="hi">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<meta name="theme-color" content="#0a2818">\n' +
      '<title>' + esc(titleText) + '</title>\n' +
      FONTS_LINK + '\n' +
      '<style>\n' + cssSafe + '\n</style>\n' +
      '</head>\n<body>\n' +
      '<div id="card-root" class="card-root"></div>\n' +
      '<script>window.CARD_DATA = ' + jsonSafe + ';\n<\/script>\n' +
      '<script>\n' + jsSafe + '\n<\/script>\n' +
      '<script>\n' +
        '(function(){try{' +
          'window.renderCard(window.CARD_DATA, document.getElementById("card-root"));' +
        '}catch(e){console.error(e);}})();\n' +
      '<\/script>\n' +
      overridesScript + '\n' +
      '</body>\n</html>';
  }

  function downloadCard() {
    if (!assetsReady) {
      showToast('Assets loading… ek second ruko.', 'error');
      return;
    }
    try {
      collectForm();

      var html = buildDownloadHtml();
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var sizeMB = blob.size / (1024 * 1024);

      if (sizeMB > HEAVY_FILE_MB) {
        var proceed = window.confirm(
          'File bhaari hai (' + sizeMB.toFixed(1) + ' MB). ' +
          'WhatsApp pe nahi jayegi. Video/music ka link (URL) use karo. ' +
          'Phir bhi download karein?'
        );
        if (!proceed) return;
      }

      var bride = slugify(state.brideName) || 'bride';
      var groom = slugify(state.groomName) || 'groom';
      var fileName = bride + '-weds-' + groom + '-invitation.html';

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);

      showToast(
        'Card download ho gaya (' + (sizeMB < 1
          ? Math.round(blob.size / 1024) + ' KB'
          : sizeMB.toFixed(2) + ' MB') + '). Page reset ho raha hai…',
        'success'
      );

      try { saveData(state); } catch (e) {}

      setTimeout(function () { location.reload(); }, 800);
    } catch (err) {
      console.error(err);
      showToast('Download fail: ' + ((err && err.message) || 'error'), 'error');
    }
  }


  /* --------------------------------------------------------------
     TABS  (mobile)
     -------------------------------------------------------------- */
  function setTab(which) {
    if (which === 'edit') {
      document.body.classList.add('tab-edit');
      document.body.classList.remove('tab-preview');
      if (el.tabEdit) {
        el.tabEdit.classList.add('is-active');
        el.tabEdit.setAttribute('aria-pressed', 'true');
      }
      if (el.tabPreview) {
        el.tabPreview.classList.remove('is-active');
        el.tabPreview.setAttribute('aria-pressed', 'false');
      }
    } else {
      document.body.classList.add('tab-preview');
      document.body.classList.remove('tab-edit');
      if (el.tabPreview) {
        el.tabPreview.classList.add('is-active');
        el.tabPreview.setAttribute('aria-pressed', 'true');
      }
      if (el.tabEdit) {
        el.tabEdit.classList.remove('is-active');
        el.tabEdit.setAttribute('aria-pressed', 'false');
      }
      schedulePreview();
    }
  }


  /* --------------------------------------------------------------
     RESET
     -------------------------------------------------------------- */
  function resetToSample() {
    if (!window.confirm('Reset to sample data? Aapke sabhi badlav hat jayenge.')) return;
    state = getDefaultData();
    try { localStorage.removeItem(WCM_DATA_KEY); } catch (e) {}
    fillForm();
    renderEventsList();
    renderSceneOverrides();
    renderPreview(true);
    updateFileSize();
    showToast('Sample data load ho gaya.', 'success');
  }


  /* --------------------------------------------------------------
     WIRING
     -------------------------------------------------------------- */
  function wireButtons() {
    if (el.btnReset) el.btnReset.addEventListener('click', resetToSample);
    if (el.btnReplay) el.btnReplay.addEventListener('click', renderPreviewReplay);
    if (el.btnDownload) el.btnDownload.addEventListener('click', downloadCard);
    if (el.btnDownloadBottom) el.btnDownloadBottom.addEventListener('click', downloadCard);

    if (el.btnAddEvent) {
      el.btnAddEvent.addEventListener('click', function () {
        if (!Array.isArray(state.events)) state.events = [];
        state.events.push({
          icon: '✦',
          name: 'New Event',
          date: '',
          time: '',
          venue: '',
          note: ''
        });
        renderEventsList();
        schedulePreview();
        scheduleFileSize();
      });
    }

    if (el.tabEdit) el.tabEdit.addEventListener('click', function () { setTab('edit'); });
    if (el.tabPreview) el.tabPreview.addEventListener('click', function () { setTab('preview'); });
  }


  /* --------------------------------------------------------------
     INIT
     -------------------------------------------------------------- */
  function init() {
    /* Fill inputs from state first */
    fillForm();
    renderEventsList();
    renderSceneOverrides();
    updateMusicRows();
    updateBackgroundRows();
    updateFileSize();

    /* Wire everything */
    wireLiveInputs();
    wirePhoto();
    wireMusic();
    wireBackground();
    wireButtons();

    /* Show loading in preview */
    renderPreview(true);

    /* Fetch card.css + engine.js */
    loadAssets().then(function () {
      renderPreview(true);
      updateFileSize();
    }).catch(function (err) {
      console.error('Asset load fail', err);
      renderPreviewError(err && err.message);
      updateFileSize();
      showToast(
        'card.css / engine.js load nahi huye. Server pe upload karke try karo.',
        'error'
      );
    });

    /* Set initial tab */
    setTab('edit');
    if (window.innerWidth >= 980) {
      document.body.classList.remove('tab-edit');
      document.body.classList.remove('tab-preview');
    }
  }

  /* Kick off */
  init();
})();
