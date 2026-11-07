/* naavcaptured.com v1
   1. Intro: types "naav" then "captured.", shows EST 2025. by ~2s, holds, then the lockup
      shrinks into the header wordmark and the links fade in. Or plays the exported video if
      the intro element has data-video (see README).
   2. Links, tagline and recent work are read from links.json. */
(function () {
  'use strict';

  var root = document.documentElement;
  var HOLD_UNTIL = 4200;          // ms from start until the lockup moves into the header
  var LAND_MS = 850;              // duration of the move into the header

  /* ---------------- links.json ---------------- */

  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isWeb(href) { return /^https?:/i.test(href); }

  function pill(item, i, primary) {
    var a = el('a', {
      class: 'pill reveal' + (primary ? ' pill-primary' : ''),
      href: item.href,
      style: '--i:' + i,
      target: isWeb(item.href) ? '_blank' : null,
      rel: isWeb(item.href) ? 'noopener' : null
    }, '<span>' + esc(item.label) + '</span>' + ARROW);
    return a;
  }

  function tile(item) {
    var li = el('li', { class: 'tile' });
    var a = el('a', { href: item.href || 'https://www.instagram.com/naavcaptured/', target: '_blank', rel: 'noopener', 'aria-label': item.caption || 'Recent work on Instagram' });
    if (item.image) {
      a.appendChild(el('img', { src: item.image, alt: item.caption || '', loading: 'lazy', decoding: 'async', width: 400, height: 500 }));
    } else {
      a.appendChild(el('span', { class: 'card', 'aria-hidden': 'true' },
        '<span>' + esc(item.caption || '') + '</span><span class="mini"><i>naav</i>captured.</span>'));
    }
    if (item.tag) a.appendChild(el('span', { class: 'tag', 'aria-hidden': 'true' }, esc(item.tag)));
    li.appendChild(a);
    return li;
  }

  function render(data) {
    if (data.tagline) document.getElementById('tagline').textContent = data.tagline;
    if (data.location) document.getElementById('where').textContent = data.location;

    var nav = document.getElementById('links');
    nav.textContent = '';
    var i = 3;
    if (data.primary && data.primary.href) nav.appendChild(pill(data.primary, i++, true));
    (data.links || []).forEach(function (l) {
      if (l.show === false || !l.href) return;
      nav.appendChild(pill(l, i++, false));
    });

    var tiles = document.getElementById('tiles');
    tiles.textContent = '';
    (data.recentWork || []).slice(0, 6).forEach(function (w) { tiles.appendChild(tile(w)); });
    if (!tiles.children.length) tiles.closest('.work').hidden = true;

    if (data.email) {
      var m = document.getElementById('mail');
      m.textContent = data.email;
      m.hidden = false;
    }
  }

  fetch('links.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () { /* keep the Instagram fallback already in the page */ });

  /* ---------------- intro ---------------- */

  if (!root.classList.contains('intro')) return;

  var stage = document.getElementById('intro');
  var lockup = document.getElementById('introLockup');
  var mark = document.getElementById('introMark');
  var est = document.getElementById('introEst');
  var skip = document.getElementById('skip');
  var brand = document.querySelector('#brand .wm');
  var timers = [];
  var done = false;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function rememberSeen() { try { sessionStorage.setItem('nc-intro-seen', '1'); } catch (e) {} }

  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);

  // Split the two halves into letters that are laid out but invisible, so the word never shifts while typing.
  var chars = [];
  Array.prototype.forEach.call(mark.querySelectorAll('[data-type]'), function (part) {
    part.getAttribute('data-type').split('').forEach(function (c) {
      var s = el('span', { class: 'ch' });
      s.textContent = c;
      part.appendChild(s);
      chars.push({ node: s, serif: part.classList.contains('naav') });
    });
  });

  function showAll() {
    chars.forEach(function (c) { c.node.classList.add('on'); });
    est.classList.add('on');
  }

  function finish() {
    root.classList.add('landed');
    stage.remove();
    document.body.style.overflow = '';
  }

  function land() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    rememberSeen();
    showAll();
    skip.classList.remove('on');

    var from = mark.getBoundingClientRect();
    var to = brand.getBoundingClientRect();
    if (!from.width || !to.width || !mark.animate) {
      root.classList.add('revealed');
      return finish();
    }
    var s = to.width / from.width;
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);

    stage.classList.add('clear');
    est.classList.remove('on');
    var anim = mark.animate(
      [{ transform: 'none' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }],
      { duration: LAND_MS, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }
    );
    later(function () { root.classList.add('revealed'); }, LAND_MS * 0.55);
    anim.onfinish = finish;
  }

  function playTyped() {
    var t = 250;
    chars.forEach(function (c, idx) {
      var prev = chars[idx - 1];
      if (prev && prev.serif && !c.serif) t += 140;     // a breath between naav and captured.
      t += c.serif ? 115 : 72;
      later(function () { c.node.classList.add('on'); }, t);
    });
    later(function () { est.classList.add('on'); }, t + 300);
    later(land, HOLD_UNTIL);
  }

  function playVideo(base) {
    lockup.hidden = true;
    var portrait = window.innerHeight >= window.innerWidth;
    var name = base + (portrait ? '-portrait' : '-landscape');
    var v = el('video', { muted: '', playsinline: '', autoplay: '', preload: 'auto', poster: base + '-poster.jpg' });
    v.muted = true;
    v.appendChild(el('source', { src: name + '.webm', type: 'video/webm' }));
    v.appendChild(el('source', { src: name + '.mp4', type: 'video/mp4' }));
    stage.insertBefore(v, skip);

    var fallback = function () { if (done) return; v.remove(); lockup.hidden = false; landHandler = land; playTyped(); };
    v.lastElementChild.addEventListener('error', fallback);
    v.addEventListener('ended', landVideo);
    var p = v.play();
    if (p && p.catch) p.catch(fallback);
    later(landVideo, 8000); // safety net if 'ended' never fires

    function landVideo() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      rememberSeen();
      skip.classList.remove('on');
      root.classList.add('revealed');
      root.classList.add('landed');
      var to = brand.getBoundingClientRect();
      var dy = to.top + to.height / 2 - window.innerHeight / 2;
      var anim = v.animate
        ? v.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(' + dy + 'px) scale(.35)' }],
            { duration: LAND_MS, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' })
        : null;
      if (anim) anim.onfinish = finish; else finish();
    }
    landHandler = landVideo;
  }

  var landHandler = land;
  skip.addEventListener('click', function () { landHandler(); });
  later(function () { skip.classList.add('on'); skip.tabIndex = 0; }, 1200);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') landHandler(); });

  var video = stage.getAttribute('data-video');
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (video) playVideo(video); else playTyped();
  }
  fontsReady.then(start);
  setTimeout(start, 900); // don't wait forever on slow font loads
})();
