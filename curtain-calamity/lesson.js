/* Curtain Calamity — plain JS, offline, no dependencies.
   One-step equation: x + 63 = 200 → x = 137 (with scripted replay variants). */

(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function ensure(cond, msg) { if (!cond) throw new Error('[lesson] ' + msg); }

  /* ---------- number variants (hand-checkable, friendly) ---------- */
  /* Each variant: { total, known, answer } with total = known + answer, answer>0. */
  var VARIANTS = [
    { total: 200, known: 63, answer: 137 },
    { total: 150, known: 90, answer: 60 },
    { total: 180, known: 45, answer: 135 },
    { total: 120, known: 41, answer: 79 }
  ];
  var variantIndex = 0;

  function currentVariant() { return VARIANTS[variantIndex % VARIANTS.length]; }

  /* ---------- app state ---------- */
  var state = {
    scene: 'title',
    calm: false,
    sound: false,
    attempts: 0,           // failed puzzle attempts this rod
    hintShown: 0,          // highest hint tier shown (1..4)
    solved: false,
    helped: false,         // any "show me" used
    pageSolved: false
  };
  // per-scene advancement (screens with tap-to-advance sub-steps)
  var sceneStep = {};      // { sceneId: stepNumber }
  var scenesList = ['scene-title', 'scene-room', 'scene-weight', 'scene-break', 'scene-clue', 'scene-rule', 'scene-puzzle', 'scene-payoff', 'scene-transfer', 'scene-end'];
  var sceneIndex = {}; scenesList.forEach(function (id, i) { sceneIndex[id] = i; });

  /* ---------- reducible-motion / calm ---------- */
  function prefersReduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  var reduced = prefersReduced();

  /* ---------- domain objects ---------- */
  function initVariant() {
    var v = currentVariant();
    $('.badge.known').textContent = v.known + ' cm';
    $('#eq-puzzle').innerHTML = 'x &nbsp;+&nbsp; ' + v.known + ' &nbsp;=&nbsp; ' + v.total;
    updateLive();
  }

  /* puzzle live readout: x + known = sum */
  function updateLive() {
    var v = currentVariant();
    var xv = parseInt($('#x-input').value, 10);
    if (isNaN(xv) || xv < 0) xv = 0;
    if (xv > 999) xv = 999;
    var sum = xv + v.known;
    var d = $('#live-total');
    var stateText = sum === v.total ? 'exact — hang it!' : (sum < v.total ? 'short of ' + v.total : 'too long (max ' + v.total + ')');
    d.textContent = 'So far: x + ' + v.known + ' = ' + sum + ' … ' + stateText;
  }

  /* number success is (answer) such that x + known = total */
  function isCorrect(v) { return parseInt($('#x-input').value, 10) === v.answer; }

  /* misconception-specific feedback */
  function feedbackFor(v, xv) {
    if (xv === v.known) return "That's the piece we already know. The missing one is the *other* piece. To get x alone, undo +" + v.known + ": do −" + v.known + " on both sides.";
    if (xv === v.total + v.known) return 'Adding gives x = ' + (v.total + v.known) + ', which can\u2019t fit in a ' + v.total + ' cm rod. x is a *piece* — it must be less than ' + v.total + '. Undo +' + v.known + ' with −' + v.known + ' on both sides.';
    if (xv > v.total) return 'x is a piece of the rod, so it must be less than the whole (' + v.total + ' cm). The two pieces together make ' + v.total + '. Undo +' + v.known + ' with −' + v.known + '.';
    return 'Not quite. The two pieces together make ' + v.total + ': x + ' + v.known + ' = ' + v.total + '. Try the Golden Rule below.';
  }

  /* escalating hints; tier 4 reveals the partial worked step (never the full free answer) */
  function showHint(tier) {
    var v = currentVariant();
    var zone = $('#hint-zone');
    var html = '';
    if (tier >= 1) html += '<div class="hint">H1 · The whole rod = piece 1 + piece 2. Which equation says that? x + ' + v.known + ' = ' + v.total + '.</div>';
    if (tier >= 2) html += '<div class="hint">H2 · We want x alone. Golden Rule: do the same to both sides. The opposite of +' + v.known + ' is −' + v.known + '.</div>';
    if (tier >= 3) html += '<div class="hint">H3 · x = ' + v.total + ' − ' + v.known + '. Now finish the arithmetic: what is ' + v.total + ' − ' + v.known + '?</div>';
    if (tier >= 4) {
      state.helped = true;
      html += '<div class="hint woo">H4 (helped) · x = ' + v.answer + '. Check it back: ' + v.answer + ' + ' + v.known + ' = ' + v.total + ' ✓</div>';
    }
    zone.innerHTML = html;
    state.hintShown = Math.max(state.hintShown, tier);
  }

  /* ---------- reference drawer (re-open example) ---------- */
  function showRef() {
    // Re-open a mini worked example inline. Kept short.
    var v = currentVariant();
    $('#ref-zone').innerHTML =
      '<div class="hint done">Example: if x + ' + v.known + ' = ' + v.total + ', subtract &ldquo;' + v.known + '&rdquo; from both sides: x = ' + v.total + ' − ' + v.known + ' = <b>' + v.answer + '</b>. Check: ' + v.answer + ' + ' + v.known + ' = ' + v.total + ' ✓ <button class="h-btn" id="btn-hider">hide</button></div>';
    var hb = $('#btn-hider');
    function hide() { $('#ref-zone').innerHTML = '<p><button id="ref-btn" type="button">Show the example again</button></p>'; bind('ref-btn', 'click', showRef); }
    if (hb) bind(hb, 'click', hide);
  }

  /* ---------- scene navigation ---------- */
  function goScene(id, opts) {
    opts = opts || {};
    if (!sceneIndex.hasOwnProperty(id)) return;
    // stop break loop if we're leaving the break scene
    if (state.scene === 'scene-break') stopBreakLoop();
    // hide all
    $$('.scene').forEach(function (s) { s.classList.add('hidden'); });
    var el = document.getElementById(id);
    ensure(el, 'scene element ' + id);
    el.classList.remove('hidden');
    state.scene = id;
    sceneStep[id] = (opts.step !== undefined) ? opts.step : sceneStep[id] || 0;
    updateProgress();
    if (opts.scroll && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'scene-break') startBreakLoop();
    enterScene(id);
  }

  function updateProgress() {
    var rings = $$('#progress .ring');
    var idx = sceneIndex[state.scene];
    rings.forEach(function (r, i) {
      r.className = 'ring' + (i < idx ? ' done' : (i === idx ? ' current' : ''));
    });
  }

  /* scene entry hooks */
  function enterScene(id) {
    if (id === 'scene-title') { $('#btn-start').focus(); }
    if (id === 'scene-break') { startBreak(); }
    if (id === 'scene-puzzle') { startPuzzleScene(); }
    if (id === 'scene-payoff') { launchConfetti(); }
  }

  function sceneTapAdvance() {
    // rooms / weight / clue have internal tap-advance steps; break is steered by breakPhase.
    if (state.scene === 'scene-room') {
      var s = sceneStep[state.scene] || 0;
      if (s === 0) {
        $('#room-line-2').classList.remove('hidden');
        sceneStep[state.scene] = 1;
        return;
      }
      goScene(scenesList[sceneIndex['scene-room'] + 1]);
    } else if (state.scene === 'scene-weight') {
      var s2 = sceneStep[state.scene] || 0;
      if (s2 === 0) {
        $('#weight-line-2').classList.remove('hidden');
        sceneStep[state.scene] = 1;
        return;
      }
      goScene(scenesList[sceneIndex['scene-weight'] + 1]);
    } else if (state.scene === 'scene-clue') {
      var s3 = sceneStep[state.scene] || 0;
      if (s3 === 0) {
        $('#clue-known').classList.remove('hidden');
        sceneStep[state.scene] = 1;
        return;
      }
      goScene(scenesList[sceneIndex['scene-clue'] + 1]);
    }
  }

  /* ---------- the 5-phase break ---------- */
  var phase = 0;           // 0 none, 1 crack, 2 widen, 3 sag, 4 snap, 5 settle
  var t = 0;               // phase elapsed ms
  var last = 0;

  function startBreak() {
    phase = 1; t = 0;
    $('#break-caption').textContent = '';
    $('#break-prompt').textContent = 'Tap to advance the snap ▸';
    // reset visuals
    var hl = $('#half-l'), hr = $('#half-r');
    hl.setAttribute('transform', ''); hr.setAttribute('transform', '');
    $('#crack-l').setAttribute('opacity', '0');
    $('#crack-r').setAttribute('opacity', '0');
    $('#amber').querySelector('circle').setAttribute('opacity', '0');
    $('#curtain-top').setAttribute('height', '26');
    $('#pieces-floor').setAttribute('opacity', '0');
    $('#curtain-fall').querySelector('path').setAttribute('opacity', '0');
    renderBreakPhase();
    if (reduced) {
      // reduced motion: complete all phases instantly, then proceed
      while (phase < 5) { phase++; renderBreakPhase(); }
      finishBreak();
    }
  }

  function advancePhase() {
    if (phase < 5) { phase++; t = 0; renderBreakPhase(); }
    else { finishBreak(); }
  }

  function finishBreak() {
    var next = document.getElementById('scene-break').getAttribute('data-next');
    goScene(next || 'scene-clue');
  }

  function renderBreakPhase() {
    var cap = $('#break-caption');
    var hl = $('#half-l'), hr = $('#half-r');
    var caption = '';
    switch (phase) {
      case 1: caption = 'Crack.'; hl.setAttribute('transform', ''); hr.setAttribute('transform', ''); break;
      case 2: caption = "Two pieces, soon."; hl.setAttribute('transform', ''); hr.setAttribute('transform', ''); break;
      case 3: caption = 'The rod bends.'; hl.setAttribute('transform', 'rotate(-4 56 42)'); hr.setAttribute('transform', 'rotate(4 244 42)'); break;
      case 4: caption = 'Snap!'; hl.setAttribute('transform', 'rotate(-38 56 42)'); hr.setAttribute('transform', 'rotate(38 244 42)'); $('#amber').querySelector('circle').setAttribute('opacity', '.8'); break;
      case 5: caption = 'Two pieces. Still ' + currentVariant().total + ' cm in total.'; break;
    }
    if (phase === 1) $('#crack-l').setAttribute('opacity', '1');
    if (phase >= 2) { $('#crack-l').setAttribute('opacity', '1'); $('#crack-r').setAttribute('opacity', '1'); }
    if (phase === 4) { $('#curtain-fall').querySelector('path').setAttribute('opacity', '1'); }
    if (phase === 5) { $('#pieces-floor').setAttribute('opacity', '1'); $('#amber').querySelector('circle').setAttribute('opacity', '0'); }
    cap.textContent = caption;
  }

  /* a gentle auto-progression rAF that can animate transient cues (drop in calm mode). */

  /* ---------- confetti ---------- */
  function launchConfetti() {
    if (reduced || state.calm) return;
    var box = $('#confetti');
    box.innerHTML = '';
    for (var i = 0; i < 18; i++) {
      var el = document.createElement('i');
      var x = Math.random() * 100;
      var dur = 1.2 + Math.random() * 1.2;
      var delay = Math.random() * 0.5;
      el.style.left = x + '%';
      el.style.animationDuration = dur + 's';
      el.style.animationDelay = delay + 's';
      el.style.background = ['#e8a33d', '#b84a35', '#6a8f4e', '#b07b3f'][i % 4];
      box.appendChild(el);
    }
    setTimeout(function () { box.innerHTML = ''; }, 3200);
  }

  /* ---------- break time-based animation loop (compositor-friendly) ---------- */
  /* We animate the crack widening over time within phase 2, and amber pulse during phase 4.
     Everything else is static transforms per phase. This keeps it slow + legible and cheap.
     The loop runs ONLY while the break scene is active (start/stop below).
  */
  var rafId = null;
  var loopRunning = false;

  function tick(now) {
    if (!loopRunning || state.scene !== 'scene-break' || reduced) return;
    var dt = now - (last || now); last = now; if (dt > 50) dt = 50;
    t += dt;
    if (phase === 2) {
      var w = 1 + 5 * Math.min(t / 1200, 1); // widen crack
      $('#crack-l').setAttribute('stroke-width', String(w));
      $('#crack-r').setAttribute('stroke-width', String(w));
    }
    if (phase === 4) {
      var pul = 0.5 + 0.5 * Math.sin(t / 2 / Math.PI);
      $('#amber').querySelector('circle').setAttribute('opacity', String(0.8 * pul));
    }
    rafId = requestAnimationFrame(tick);
  }

  function startBreakLoop() {
    if (reduced || loopRunning) return;
    loopRunning = true;
    last = 0;
    t = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stopBreakLoop() {
    loopRunning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* ---------- puzzle scene ---------- */
  function startPuzzleScene() {
    state.attempts = 0;
    state.hintShown = 0;
    state.helped = false;
    state.solved = false;
    $('#x-input').value = '';
    $('#hint-zone').innerHTML = '';
    $('#ref-zone').innerHTML = '<p><button id="ref-btn" type="button">Show the example again</button></p>';
    bind('ref-btn', 'click', showRef);
    initVariant();
    updateLive();
    $('#x-input').focus();
  }

  /* the answer-check */
  function checkAnswer() {
    if (state.solved) return;
    var v = currentVariant();
    if (isCorrect(v)) {
      state.solved = true;
      // visual success: mark rod repaired; reassembly completes in payoff
      $('#x-input').style.borderColor = 'var(--green)';
      $('#eq-puzzle').innerHTML = '<span style="color:var(--green)">x = ' + v.answer + '</span>';
      $('#live-total').textContent = v.answer + ' + ' + v.known + ' = ' + v.total + ' ✓ Perfect!';
      $('#hint-zone').innerHTML = '<div class="hint woo">That balances. Now the check ritual →</div>';
      setTimeout(function () {
        // mandatory substitution check
        requireCheck();
      }, 500);
    } else {
      state.attempts++;
      var xv = parseInt($('#x-input').value, 10);
      if (isNaN(xv)) { xv = 0; }
      // misconception feedback
      $('#hint-zone').innerHTML = '<div class="hint">' + feedbackFor(v, xv) + '</div>';
      var tier = Math.min(3, Math.floor((state.attempts) / 1));
      showHint(Math.max(tier, 1));
    }
  }

  /* mandatory substitution check: 137 + 63 = ___ (on-screen, mobile-friendly) */
  function requireCheck() {
    var v = currentVariant();
    var zone = $('#hint-zone');
    var rit = $('#check-ritual');
    if (!rit) return;
    zone.innerHTML = '';
    rit.classList.remove('hidden');
    var nums = $('#rit-nums');
    if (nums) nums.textContent = v.answer + ' + ' + v.known;
    var inp = $('#check-in');
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function enterRitualValue() {
    var v = currentVariant();
    var zone = $('#hint-zone');
    var inp = $('#check-in');
    var raw = inp ? inp.value : '';
    if (raw === '') {
      zone.innerHTML = '<div class="hint">Type the total and tap "Verified ✓".</div>';
      if (inp) inp.focus();
      return;
    }
    var val = parseInt(raw, 10);
    if (val === v.total) {
      zone.innerHTML = '<div class="hint woo">Check: ' + v.answer + ' + ' + v.known + ' = ' + v.total + ' ✓ The rod is repaired!</div>';
      state.pageSolved = true;
      var rit = $('#check-ritual'); if (rit) rit.classList.add('hidden');
      growRodReassembly();
      setTimeout(nextFromPayoffPrep, 900);
    } else {
      zone.innerHTML = '<div class="hint">' + v.answer + ' + ' + v.known + ' should equal ' + v.total + '. Add them again — then it counts as solved.</div>';
      if (inp) { inp.value = ''; inp.focus(); }
    }
  }

  // visual: reassemble rod into payoff svg
  function growRodReassembly() {
    // heavy visual handled in payoff; here we just prime the transition
    $('#badge-x').style.background = 'var(--green)';
  }

  function nextFromPayoffPrep() {
    goScene('scene-payoff');
  }

  /* transfer (exit ticket) */
  var TRANSFER = { known: 34, total: 90, answer: 56 };
  function checkTransfer() {
    var zone = $('#hint-transfer');
    var v = TRANSFER;
    var val = parseInt($('#tx-input').value, 10);
    if (val === v.answer) {
      zone.innerHTML = '<div class="hint woo">' + val + ' + ' + v.known + ' = ' + v.total + ' ✓ New job, same move!</div>';
      setTimeout(function(){ goScene('scene-end'); }, 900);
    } else {
      zone.innerHTML = '<div class="hint">Two shelves = top + bottom. x + ' + v.known + ' = ' + v.total + '. Undo +' + v.known + ' with −' + v.known + '.</div>';
    }
  }

  /* ---------- calm mode ---------- */
  function toggleCalm() {
    state.calm = !state.calm;
    document.body.classList.toggle('calm', state.calm);
    $('#calm').textContent = state.calm ? 'Calm: on' : 'Calm: off';
    localStorage.setItem('cc.calm', state.calm ? '1' : '0');
  }

  /* ---------- sound (optional; none needed) ---------- */
  function toggleSound() {
    state.sound = !state.sound;
    $('#sound').setAttribute('aria-pressed', String(state.sound));
    $('#sound').textContent = state.sound ? 'Sound: on' : 'Sound: off';
  }

  /* ---------- persistence ---------- */
  function loadPrefs() {
    try {
      var c = localStorage.getItem('cc.calm'); if (c === '1') { document.body.classList.add('calm'); state.calm = true; }
    } catch (e) { /* storage unavailable */ }
    $('#calm').textContent = state.calm ? 'Calm: on' : 'Calm: off';
  }

  /* ---------- tiny event binder ---------- */
  function bind(el, type, fn) {
    if (el && el.addEventListener) el.addEventListener(type, fn);
  }
  function bindAll(sel, type, fn) {
    $$(sel).forEach(function (el) { bind(el, type, fn); });
  }

  /* ---------- wiring ---------- */
  function wire() {
    bind($('#btn-start'), 'click', function () { goScene('scene-room'); });

    // tap-to-advance on rooms/weight/clue scenes (whole scene tap, but simple: use tap area)
    ['scene-room', 'scene-weight', 'scene-clue'].forEach(function (id) {
      var sc = document.getElementById(id);
      bind(sc, 'click', function (e) {
        if (e.target.closest('button')) return; // not now
        if (state.scene !== id) return;
        sceneTapAdvance();
      });
    });

    // scene-rule -> puzzle
    bind($('#scene-rule'), 'click', function (e) {
      if (e.target.closest('button')) return;
      var sw = $('#golden-panel'); /* subtle: rule intro advances to puzzle */
      goScene('scene-puzzle');
    });

    // scene-break: tap advances one phase
    bind($('#scene-break'), 'click', function (e) {
      if (e.target.closest('button')) return;
      if (state.scene !== 'scene-break') return;
      advancePhase();
    });
    bind($('#btn-replay'), 'click', function () { goScene('scene-break'); });

    // keypad
    bindAll('.key', 'click', function (ev) {
      var n = ev.currentTarget.getAttribute('data-n');
      var inp = $('#x-input');
      if (n === 'clear') { inp.value = ''; }
      else if (n === 'run') { checkAnswer(); return; }
      else {
        if (inp.value.length < 3) inp.value += n;
      }
      updateLive();
    });

    // hang it button
    bind($('#hang'), 'click', checkAnswer);

    // tape measure drag
    var tape = $('#tape'), thumb = $('#tape-thumb'), readout = $('#tape-readout');
    var dragging = false;
    function tapeValueFrom(clientX) {
      var r = tape.getBoundingClientRect();
      var x = clientX - r.left;
      var pct = Math.max(0, Math.min(1, x / r.width));
      return Math.round(pct * (currentVariant().total - 0)); // scales to total, but answer between 1..total
    }
    function setTape(clientX) {
      var v = currentVariant();
      var val = tapeValueFrom(clientX);
      // x is the mystery piece; constrain to sensible 0..total-ish
      val = Math.max(0, Math.min(val, v.total - 1));
      thumb.style.left = (val / v.total * 100) + '%';
      readout.textContent = val + ' cm';
      $('#x-input').value = String(val);
      updateLive();
    }
    tape.addEventListener('pointerdown', function (e) { dragging = true; tape.setPointerCapture(e.pointerId); setTape(e.clientX); });
    tape.addEventListener('pointermove', function (e) { if (!dragging) return; setTape(e.clientX); });
    ['pointerup','pointercancel'].forEach(function (ev) { tape.addEventListener(ev, function () { dragging = false; }); });
    tape.addEventListener('keydown', function (e) {
      var v = currentVariant();
      var cur = parseInt($('#x-input').value, 10) || 0;
      var step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowRight') $('#x-input').value = String(Math.min(cur + step, v.answer + 10));
      else if (e.key === 'ArrowLeft') $('#x-input').value = String(Math.max(0, cur - step));
      else return;
      e.preventDefault();
      thumb.style.left = (parseInt($('#x-input').value, 10) / v.total * 100) + '%';
      readout.textContent = $('#x-input').value + ' cm';
      updateLive();
    });
    // link numeric input to tape+readout
    bind($('#x-input'), 'input', updateLive);

    // calm / sound
    bind($('#calm'), 'click', toggleCalm);
    var calmHome = $('#btn-calm-home'); if (calmHome) bind(calmHome, 'click', toggleCalm);

    // check ritual (mandatory substitution)
    bind($('#check-go'), 'click', enterRitualValue);
    bind($('#check-in'), 'keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); enterRitualValue(); }
    });

    // transfer
    bind($('#tx-hang'), 'click', checkTransfer);
    bind($('#btn-end'), 'click', function(){ goScene('scene-end'); });

    // payoff buttons
    bind($('#btn-another'), 'click', function () {
      variantIndex++;
      goScene('scene-puzzle'); // new rod, replay the rule isn't needed; start puzzle direct
      // keep rule pinned
    });
    bind($('#btn-restart'), 'click', function () { variantIndex = 0; goScene('scene-title'); });
    bind($('#btn-transfer'), 'click', function () { goScene('scene-transfer'); });
  }

  /* ---------- boot ---------- */
  function init() {
    loadPrefs();
    wire();
    goScene('scene-title', { step: 0 });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose a tiny console hook for manual testing (optional)
  window.__lesson = {
    goScene: goScene, state: state, currentVariant: currentVariant,
    setVariant: function (i) { variantIndex = i % VARIANTS.length; },
    checks: { updateLive: updateLive, feedbackFor: feedbackFor }
  };
})();
