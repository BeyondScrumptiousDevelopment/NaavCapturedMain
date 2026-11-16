/* naavcaptured.com — studio pages (home, /websites).
   1. Forms marked data-formspree: plain-words validation, sent to Formspree with fetch,
      then the visitor goes to the page in data-thanks.
      - required inputs, and fieldsets of choices, carry their message in data-msg
      - [data-show-when="name=prefix"] shows a field only when that answer starts with prefix
      - a checkbox with data-none can't be ticked with others in its group
   2. #feed: latest Instagram posts from /api/instagram.
   3. Links with data-service pre-tick that service in the contact form. */
(function () {
  'use strict';

  var FALLBACK = 'something went wrong sending your enquiry. please try again in a minute, or message us on instagram @naavcaptured.';

  function isHidden(el) { return !!el.closest('[hidden]'); }

  function setupForm(form) {
    var errorBox = form.querySelector('.form-error');
    var button = form.querySelector('[type="submit"]');
    var label = button.querySelector('span');
    var idleText = label.textContent;

    // Conditional fields.
    form.querySelectorAll('[data-show-when]').forEach(function (el) {
      var parts = el.getAttribute('data-show-when').split('=');
      var name = parts[0], prefix = parts[1];
      var update = function () {
        var checked = form.querySelector('input[name="' + name + '"]:checked');
        el.hidden = !(checked && checked.value.indexOf(prefix) === 0);
      };
      form.querySelectorAll('input[name="' + name + '"]').forEach(function (r) { r.addEventListener('change', update); });
      update();
    });

    // "none of these" checkboxes.
    form.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
      box.addEventListener('change', function () {
        if (!box.checked) return;
        form.querySelectorAll('input[type="checkbox"][name="' + box.name + '"]').forEach(function (other) {
          if (other !== box && (box.hasAttribute('data-none') || other.hasAttribute('data-none'))) other.checked = false;
        });
      });
    });

    function showError(msg, focusEl) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      if (focusEl) focusEl.focus(); else errorBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function validate() {
      form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); });
      var items = form.querySelectorAll('[data-msg], input[type="email"], input[type="url"]');
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        if (isHidden(el)) continue;
        if (el.tagName === 'FIELDSET') {
          if (!el.querySelector('input:checked')) {
            el.setAttribute('aria-invalid', 'true');
            return [el.getAttribute('data-msg'), el.querySelector('input')];
          }
          continue;
        }
        if (el.hasAttribute('data-msg') && !el.value.trim()) {
          el.setAttribute('aria-invalid', 'true');
          return [el.getAttribute('data-msg'), el];
        }
        if (el.value.trim() && !el.checkValidity()) {
          el.setAttribute('aria-invalid', 'true');
          return [el.type === 'email' ? 'that email address doesn\'t look right. please check it.'
                                      : 'the website link should start with https://', el];
        }
      }
      return null;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.hidden = true;
      var problem = validate();
      if (problem) return showError(problem[0], problem[1]);
      if (/FORM_ID$/.test(form.action)) return showError(FALLBACK); // not connected to Formspree yet

      var data = new FormData(form);
      // Leave out answers to questions that were hidden.
      form.querySelectorAll('[hidden] [name]').forEach(function (n) { data.delete(n.name); });
      // Send each group of checkboxes as one readable line.
      var groups = {};
      form.querySelectorAll('input[type="checkbox"]').forEach(function (b) { groups[b.name] = true; });
      Object.keys(groups).forEach(function (name) {
        var picked = data.getAll(name);
        data.delete(name);
        data.append(name, picked.length ? picked.join(', ') : 'not answered');
      });

      button.disabled = true;
      label.textContent = 'sending...';
      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (r.ok) { window.location.href = form.getAttribute('data-thanks') || '/thanks'; return; }
          return r.json().catch(function () { return {}; }).then(function (body) {
            throw new Error(body && body.errors && body.errors.length
              ? body.errors.map(function (x) { return x.message; }).join(' ').toLowerCase()
              : FALLBACK);
          });
        })
        .catch(function (err) {
          showError(err && err.message && err.message !== 'Failed to fetch' ? err.message : FALLBACK);
          button.disabled = false;
          label.textContent = idleText;
        });
    });
  }

  document.querySelectorAll('form[data-formspree]').forEach(setupForm);

  // Pre-tick a service when a service card's link is used.
  document.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('#contactForm input[name="services"][value="' + a.getAttribute('data-service') + '"]');
      if (box && !box.checked) { box.checked = true; box.dispatchEvent(new Event('change')); }
    });
  });

  // Instagram feed.
  var feed = document.getElementById('feed');
  if (feed) {
    fetch('/api/instagram')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var posts = (d && d.posts) || [];
        if (!posts.length) throw new Error(d && d.error || 'empty');
        feed.textContent = '';
        feed.removeAttribute('aria-busy');
        posts.slice(0, 6).forEach(function (p) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = p.href; a.target = '_blank'; a.rel = 'noopener';
          a.setAttribute('aria-label', p.caption || 'Post on Instagram');
          var img = document.createElement('img');
          img.src = p.image; img.alt = p.caption || 'Post on Instagram';
          img.loading = 'lazy'; img.decoding = 'async'; img.width = 400; img.height = 500;
          img.referrerPolicy = 'no-referrer';
          img.addEventListener('error', function () { li.remove(); });
          a.appendChild(img);
          if (p.type === 'VIDEO') {
            var tag = document.createElement('span');
            tag.className = 'tag'; tag.textContent = 'REEL'; tag.setAttribute('aria-hidden', 'true');
            a.appendChild(tag);
          }
          li.appendChild(a);
          feed.appendChild(li);
        });
      })
      .catch(function () {
        // No feed: show the social post we have, and point to Instagram.
        feed.removeAttribute('aria-busy');
        feed.innerHTML = '<li><a href="https://www.instagram.com/naavcaptured/" target="_blank" rel="noopener">'
          + '<img src="/assets/social/capturing-in-progress.jpg" alt="capturing in progress. A naavcaptured post on Instagram" width="400" height="500"></a></li>';
      });
  }
})();
