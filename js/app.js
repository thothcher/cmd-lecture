/* ==========================================================================
   Terminal vs Desktop — presentation engine (vanilla JS, no dependencies)

   Navigation : click / tap (left edge goes back), arrow keys, Space,
                PageUp/PageDown, Home/End, swipe, the on-screen buttons,
                and the URL hash (#5 opens slide 5)
   Tools      : T theme · N speaker notes · O overview · F full screen · ? help
   Slides     : quizzes (A–D keys, R to reset), click-to-copy commands,
                chart / table toggle on the trends slide
   ========================================================================== */
(function () {
  'use strict';

  var CANVAS_W = 1920;
  var CANVAS_H = 1080;
  var THEME_KEY = 'tvd-theme';
  var IDLE_MS = 2800;

  var root = document.documentElement;
  var body = document.body;
  var stage = document.getElementById('stage');
  var deck = document.getElementById('deck');
  var slides = Array.prototype.slice.call(deck.children).filter(function (el) {
    return el.classList.contains('slide');
  });
  var total = slides.length;
  var current = -1;

  var ui = {
    progress: document.querySelector('.progress__bar'),
    counter: document.getElementById('counter'),
    prev: document.getElementById('btn-prev'),
    next: document.getElementById('btn-next'),
    theme: document.getElementById('btn-theme'),
    notes: document.getElementById('btn-notes'),
    notesClose: document.getElementById('btn-notes-close'),
    notesPanel: document.getElementById('notes-panel'),
    notesSlide: document.getElementById('notes-slide'),
    notesBody: document.getElementById('notes-body'),
    overviewBtn: document.getElementById('btn-overview'),
    overview: document.getElementById('overview'),
    overviewGrid: document.getElementById('overview-grid'),
    fullscreen: document.getElementById('btn-fullscreen'),
    helpBtn: document.getElementById('btn-help'),
    help: document.getElementById('help'),
    toast: document.getElementById('toast'),
    announcer: document.getElementById('announcer'),
    themeColor: document.querySelector('meta[name="theme-color"]')
  };

  /* ---------- Small helpers ---------- */

  var store = {
    get: function (key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
    }
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function titleOf(slide, i) {
    if (slide.dataset.title) return slide.dataset.title;
    var h = slide.querySelector('h1, h2');
    return h ? h.textContent.trim() : 'Slide ' + (i + 1);
  }

  var toastTimer = null;
  function toast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast.classList.remove('is-visible'); }, 1600);
  }

  /* ---------- Setup: footers and labels ---------- */

  slides.forEach(function (slide, i) {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (i + 1) + ' of ' + total + ': ' + titleOf(slide, i));

    if (slide.dataset.footer !== 'none') {
      var footer = document.createElement('div');
      footer.className = 'slide-footer';
      footer.setAttribute('aria-hidden', 'true');
      footer.innerHTML = '<span>terminal-vs-desktop</span><span>' + pad(i + 1) + ' / ' + pad(total) + '</span>';
      slide.appendChild(footer);
    }
  });

  /* ---------- Scale the 1920 x 1080 canvas to the viewport ---------- */

  function fit() {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    var scale = Math.min(w / CANVAS_W, h / CANVAS_H);
    root.style.setProperty('--scale', String(scale));
  }
  if (window.ResizeObserver) {
    new ResizeObserver(fit).observe(stage);
  } else {
    window.addEventListener('resize', fit);
    stage.addEventListener('transitionend', function (e) {
      if (e.target === stage) fit();
    });
  }

  /* ---------- Navigation ---------- */

  function go(n, opts) {
    opts = opts || {};
    n = Math.max(0, Math.min(total - 1, n));
    if (n === current) return;
    current = n;

    slides.forEach(function (slide, i) {
      var active = i === n;
      slide.classList.toggle('is-active', active);
      slide.classList.toggle('is-past', i < n);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) slide.removeAttribute('inert');
      else slide.setAttribute('inert', '');
    });

    ui.counter.textContent = (n + 1) + ' / ' + total;
    ui.progress.style.width = ((n + 1) / total * 100) + '%';
    ui.prev.disabled = n === 0;
    ui.next.disabled = n === total - 1;
    ui.announcer.textContent = 'Slide ' + (n + 1) + ' of ' + total + ': ' + titleOf(slides[n], n);
    renderNotes();

    if (!opts.fromHash) {
      var hash = '#' + (n + 1);
      if (window.location.hash !== hash) {
        try { window.history.replaceState(null, '', hash); } catch (e) { window.location.hash = hash; }
      }
    }
  }

  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  function slideFromHash() {
    var n = parseInt(String(window.location.hash).replace('#', ''), 10);
    return isNaN(n) ? 0 : n - 1;
  }

  window.addEventListener('hashchange', function () {
    go(slideFromHash(), { fromHash: true });
  });

  ui.prev.addEventListener('click', prev);
  ui.next.addEventListener('click', next);

  /* Click on the slide: advance, or go back when clicking the left edge.
     Clicks on anything interactive are left alone. */
  var lastSwipe = 0;
  stage.addEventListener('click', function (e) {
    if (Date.now() - lastSwipe < 500) return;
    if (anyOverlayOpen()) return;
    if (e.target.closest('button, a, input, select, textarea, label, [data-no-advance], [tabindex]')) return;
    var selection = window.getSelection ? String(window.getSelection()) : '';
    if (selection.length) return;
    var rect = stage.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.2) prev();
    else next();
  });

  /* Touch swipe */
  var touchX = null;
  var touchY = null;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchX = null; return; }
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    touchX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      lastSwipe = Date.now();
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  /* ---------- Theme ---------- */

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var other = theme === 'dark' ? 'light' : 'dark';
    ui.theme.setAttribute('aria-label', 'Switch to ' + other + ' theme');
    ui.theme.title = 'Switch to ' + other + ' theme (T)';
    if (ui.themeColor) ui.themeColor.setAttribute('content', theme === 'dark' ? '#0A1730' : '#F3F6FB');
  }

  function toggleTheme() {
    var theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    store.set(THEME_KEY, theme);
    toast(theme === 'dark' ? 'Dark theme' : 'Light theme');
  }

  ui.theme.addEventListener('click', toggleTheme);
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  /* Follow the system theme until the viewer picks one */
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onSystemChange = function (ev) {
      if (!store.get(THEME_KEY)) applyTheme(ev.matches ? 'light' : 'dark');
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  /* ---------- Speaker notes ---------- */

  function renderNotes() {
    if (current < 0) return;
    var slide = slides[current];
    var notes = slide.querySelector('.notes');
    ui.notesSlide.textContent = (current + 1) + '. ' + titleOf(slide, current);
    ui.notesBody.textContent = notes ? notes.textContent.trim() : 'No notes for this slide.';
  }

  function setNotes(open) {
    body.classList.toggle('notes-open', open);
    ui.notes.setAttribute('aria-pressed', String(open));
    ui.notesPanel.setAttribute('aria-hidden', String(!open));
    fit();
  }

  ui.notes.addEventListener('click', function () { setNotes(!body.classList.contains('notes-open')); });
  ui.notesClose.addEventListener('click', function () { setNotes(false); });

  /* ---------- Overlays: overview and help ---------- */

  var lastFocus = null;
  var overviewBuilt = false;

  function anyOverlayOpen() {
    return !ui.overview.hidden || !ui.help.hidden;
  }

  function openOverlay(el) {
    closeOverlays(true);
    lastFocus = document.activeElement;
    el.hidden = false;
    body.classList.remove('is-idle');
    var focusTarget = el.querySelector('[aria-current="true"]') || el.querySelector('[data-close]');
    if (focusTarget) focusTarget.focus();
  }

  function closeOverlays(silent) {
    var wasOpen = anyOverlayOpen();
    ui.overview.hidden = true;
    ui.help.hidden = true;
    if (wasOpen && !silent && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function buildOverview() {
    var frag = document.createDocumentFragment();
    slides.forEach(function (slide, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.dataset.index = String(i);

      var frame = document.createElement('span');
      frame.className = 'thumb__frame';
      var canvas = document.createElement('span');
      canvas.className = 'thumb__canvas';
      canvas.setAttribute('aria-hidden', 'true');

      var clone = slide.cloneNode(true);
      clone.setAttribute('inert', '');
      clone.removeAttribute('aria-label');
      clone.removeAttribute('role');
      clone.classList.add('is-active');
      clone.classList.remove('is-past');
      Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
      Array.prototype.forEach.call(clone.querySelectorAll('button, [tabindex]'), function (el) { el.setAttribute('tabindex', '-1'); });
      canvas.appendChild(clone);
      frame.appendChild(canvas);

      var label = document.createElement('span');
      label.className = 'thumb__label';
      label.innerHTML = '<b>' + pad(i + 1) + '</b>';
      label.appendChild(document.createTextNode(titleOf(slide, i)));

      btn.appendChild(frame);
      btn.appendChild(label);
      frag.appendChild(btn);
    });
    ui.overviewGrid.appendChild(frag);
    overviewBuilt = true;
  }

  function sizeThumbs() {
    var frames = ui.overviewGrid.querySelectorAll('.thumb__frame');
    Array.prototype.forEach.call(frames, function (frame) {
      var canvas = frame.firstChild;
      canvas.style.transform = 'scale(' + (frame.clientWidth / CANVAS_W) + ')';
    });
  }

  function openOverview() {
    if (!overviewBuilt) buildOverview();
    Array.prototype.forEach.call(ui.overviewGrid.children, function (btn, i) {
      btn.setAttribute('aria-current', i === current ? 'true' : 'false');
    });
    openOverlay(ui.overview);
    sizeThumbs();
  }

  ui.overviewGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('.thumb');
    if (!btn) return;
    closeOverlays(true);
    go(parseInt(btn.dataset.index, 10));
  });

  window.addEventListener('resize', function () {
    if (!ui.overview.hidden) sizeThumbs();
  });

  ui.overviewBtn.addEventListener('click', openOverview);
  ui.helpBtn.addEventListener('click', function () { openOverlay(ui.help); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
    btn.addEventListener('click', function () { closeOverlays(); });
  });
  [ui.overview, ui.help].forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target === el) closeOverlays();
    });
  });

  /* ---------- Full screen ---------- */

  var canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  if (!canFullscreen) ui.fullscreen.hidden = true;

  function toggleFullscreen() {
    if (!canFullscreen) return;
    var isFull = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFull) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = root.requestFullscreen || root.webkitRequestFullscreen;
      var result = req.call(root);
      if (result && result.catch) result.catch(function () { toast('Full screen is not available'); });
    }
  }

  function onFullscreenChange() {
    var isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
    ui.fullscreen.setAttribute('aria-pressed', String(isFull));
    fit();
  }

  ui.fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  /* ---------- Click to copy ---------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  deck.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy');
    if (!btn) return;
    var text = btn.dataset.copy || btn.textContent.trim();
    copyText(text).then(
      function () { toast('Copied: ' + text); },
      function () { toast('Copy failed: select the text instead'); }
    );
  });

  /* ---------- Quiz: multiple choice ---------- */

  var CHECK = '<svg class="icon" aria-hidden="true"><use href="#ic-check"/></svg>';
  var CROSS = '<svg class="icon" aria-hidden="true"><use href="#ic-x"/></svg>';

  function quizParts(quiz) {
    var slide = quiz.closest('.slide');
    return {
      options: Array.prototype.slice.call(quiz.querySelectorAll('.opt')),
      answer: slide.querySelector('.quiz-answer'),
      reveal: slide.querySelector('.quiz-reveal'),
      reset: slide.querySelector('.quiz-reset')
    };
  }

  function answerQuiz(quiz, chosenKey) {
    if (quiz.dataset.done === 'true') return;
    quiz.dataset.done = 'true';
    var correctKey = quiz.dataset.answer;
    var parts = quizParts(quiz);

    parts.options.forEach(function (opt) {
      var key = opt.dataset.opt;
      var verdict = opt.querySelector('.opt__verdict');
      opt.disabled = true;
      if (key === correctKey) {
        opt.classList.add('is-correct');
        verdict.innerHTML = CHECK + (chosenKey === correctKey ? 'Correct' : 'Answer');
      } else if (key === chosenKey) {
        opt.classList.add('is-wrong');
        verdict.innerHTML = CROSS + 'Not this one';
      } else {
        opt.classList.add('is-dim');
      }
    });

    parts.answer.hidden = false;
    parts.reveal.hidden = true;
    parts.reset.hidden = false;
    if (chosenKey) toast(chosenKey === correctKey ? 'Correct!' : 'Not quite: the answer is ' + correctKey);
  }

  function resetQuiz(quiz) {
    var parts = quizParts(quiz);
    quiz.dataset.done = 'false';
    parts.options.forEach(function (opt) {
      opt.disabled = false;
      opt.classList.remove('is-correct', 'is-wrong', 'is-dim');
      opt.querySelector('.opt__verdict').innerHTML = '';
    });
    parts.answer.hidden = true;
    parts.reveal.hidden = false;
    parts.reset.hidden = true;
  }

  deck.addEventListener('click', function (e) {
    var opt = e.target.closest('.opt');
    if (opt && !opt.disabled) {
      answerQuiz(opt.closest('.quiz'), opt.dataset.opt);
      return;
    }
    var reveal = e.target.closest('.quiz-reveal');
    if (reveal) {
      answerQuiz(reveal.closest('.slide').querySelector('.quiz'), null);
      return;
    }
    var reset = e.target.closest('.quiz-reset');
    if (reset) resetQuiz(reset.closest('.slide').querySelector('.quiz'));
  });

  /* ---------- Quiz: true or false ---------- */

  deck.addEventListener('click', function (e) {
    var btn = e.target.closest('.tf-btn');
    if (!btn || btn.disabled) return;
    var row = btn.closest('.tf-row');
    var correct = row.dataset.answer;
    var chosen = btn.dataset.val;
    Array.prototype.forEach.call(row.querySelectorAll('.tf-btn'), function (b) {
      b.disabled = true;
      if (b.dataset.val === correct) b.classList.add('is-correct');
      else if (b === btn) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    row.querySelector('.tf-explain').hidden = false;
    toast(chosen === correct ? 'Correct!' : 'Not quite');
  });

  function resetTrueFalse(slide) {
    Array.prototype.forEach.call(slide.querySelectorAll('.tf-row'), function (row) {
      Array.prototype.forEach.call(row.querySelectorAll('.tf-btn'), function (b) {
        b.disabled = false;
        b.classList.remove('is-correct', 'is-wrong', 'is-dim');
      });
      row.querySelector('.tf-explain').hidden = true;
    });
  }

  /* ---------- Trends chart: chart / table toggle ---------- */

  Array.prototype.forEach.call(document.querySelectorAll('.chart-toggle'), function (btn) {
    btn.addEventListener('click', function () {
      var figure = btn.closest('.chart');
      var showTable = btn.getAttribute('aria-pressed') !== 'true';
      figure.querySelector('.db').hidden = showTable;
      figure.querySelector('.db-table').hidden = !showTable;
      btn.setAttribute('aria-pressed', String(showTable));
      btn.textContent = showTable ? 'Chart' : 'Table';
    });
  });

  /* ---------- Keyboard ---------- */

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var target = e.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

    var key = e.key;

    if (key === 'Escape') {
      if (anyOverlayOpen()) { closeOverlays(); e.preventDefault(); return; }
      if (body.classList.contains('notes-open')) { setNotes(false); e.preventDefault(); }
      return;
    }

    if (anyOverlayOpen()) {
      if (key === '?' || key === 'o' || key === 'O') { closeOverlays(); e.preventDefault(); }
      return;
    }

    /* Let Space and Enter press a focused button instead of changing slides */
    var onButton = target && target.closest && target.closest('button, a');
    if (onButton && (key === ' ' || key === 'Enter')) return;

    var slide = slides[current];
    var quiz = slide.querySelector('.quiz');

    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        next(); e.preventDefault(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        prev(); e.preventDefault(); break;
      case 'Home':
        go(0); e.preventDefault(); break;
      case 'End':
        go(total - 1); e.preventDefault(); break;
      case 't': case 'T':
        toggleTheme(); break;
      case 'n': case 'N':
        setNotes(!body.classList.contains('notes-open')); break;
      case 'o': case 'O':
        openOverview(); break;
      case 'f': case 'F':
        toggleFullscreen(); break;
      case '?':
        openOverlay(ui.help); break;
      case 'r': case 'R':
        if (quiz) resetQuiz(quiz);
        if (slide.querySelector('.tf-row')) resetTrueFalse(slide);
        break;
      default:
        if (quiz && /^[a-dA-D]$/.test(key)) {
          answerQuiz(quiz, key.toUpperCase());
        }
    }
  });

  /* Keep keyboard focus inside an open overlay */
  document.addEventListener('focusin', function (e) {
    var open = !ui.overview.hidden ? ui.overview : (!ui.help.hidden ? ui.help : null);
    if (open && !open.contains(e.target)) {
      var first = open.querySelector('button');
      if (first) first.focus();
    }
  });

  /* ---------- Hide the controls while presenting ---------- */

  var idleTimer = null;
  function wake() {
    body.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      var focusInChrome = document.activeElement && document.activeElement.closest &&
        document.activeElement.closest('.toolbar, .navpill, .notes-panel');
      if (!anyOverlayOpen() && !focusInChrome) body.classList.add('is-idle');
    }, IDLE_MS);
  }
  /* Mouse movement and touch show the controls; key presses from a clicker do not */
  ['mousemove', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, wake, { passive: true });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') wake();
  });

  /* After a mouse click on a button, release focus so Space keeps advancing slides */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('button');
    if (btn && e.detail > 0 && document.activeElement === btn) btn.blur();
  });

  /* ---------- Start ---------- */

  fit();
  go(slideFromHash(), { fromHash: true });
  wake();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
