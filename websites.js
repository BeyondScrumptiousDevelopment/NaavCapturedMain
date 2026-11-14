/* naavcaptured.com/websites — enquiry form.
   Sends to Formspree with fetch so the visitor stays on the site, then goes to /websites/thanks.
   Set the Formspree endpoint in the form's action attribute in websites/index.html. */
(function () {
  'use strict';

  var form = document.getElementById('enquiryForm');
  if (!form) return;
  var errorBox = document.getElementById('formError');
  var button = document.getElementById('submitBtn');
  var urlField = document.getElementById('urlField');
  var FALLBACK = 'something went wrong sending your enquiry. please try again in a minute, or message us on instagram @naavcaptured.';

  // Show "current website link" only for people who have a site.
  form.querySelectorAll('input[name="current_site"]').forEach(function (r) {
    r.addEventListener('change', function () {
      urlField.hidden = !(form.current_site.value || '').startsWith('yes');
    });
  });

  // "neither" can't be ticked together with the other extras.
  var extras = form.querySelectorAll('input[name="extras"]');
  extras.forEach(function (box) {
    box.addEventListener('change', function () {
      if (!box.checked) return;
      extras.forEach(function (other) {
        if (other !== box && (box.hasAttribute('data-none') || other.hasAttribute('data-none'))) other.checked = false;
      });
    });
  });

  function showError(msg, focusEl) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    if (focusEl) focusEl.focus(); else errorBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // Plain-words validation, in form order, so the first problem is the one named.
  function validate() {
    form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); });
    var checks = [
      ['f-name', 'please add your name.'],
      ['f-business', 'please add your business name.'],
      ['f-email', 'please add your email so we can reply.'],
      ['f-what', 'please tell us what your business does.'],
      ['current_site', 'please say whether you have a website now.'],
      ['package', 'please pick a package, or "not sure yet".'],
      ['f-when', 'please say when you would like it live.']
    ];
    for (var i = 0; i < checks.length; i++) {
      var id = checks[i][0];
      var el = document.getElementById(id);
      if (el) {
        if (!el.value.trim()) { el.setAttribute('aria-invalid', 'true'); return [checks[i][1], el]; }
        if (el.type === 'email' && !el.checkValidity()) { el.setAttribute('aria-invalid', 'true'); return ['that email address doesn\'t look right. please check it.', el]; }
      } else if (!form[id].value) {
        var first = form.querySelector('input[name="' + id + '"]');
        first.closest('fieldset').setAttribute('aria-invalid', 'true');
        return [checks[i][1], first];
      }
    }
    var url = document.getElementById('f-url');
    if (!urlField.hidden && url.value && !url.checkValidity()) {
      url.setAttribute('aria-invalid', 'true');
      return ['the website link should start with https://', url];
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
    var picked = data.getAll('extras');
    data.delete('extras');
    data.append('extras', picked.length ? picked.join(', ') : 'not answered');
    if (urlField.hidden) data.delete('current_site_link');

    button.disabled = true;
    button.querySelector('span').textContent = 'sending...';

    fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.ok) { window.location.href = 'thanks'; return; }
        return r.json().catch(function () { return {}; }).then(function (body) {
          var msg = body && body.errors && body.errors.length
            ? body.errors.map(function (x) { return x.message; }).join(' ').toLowerCase()
            : FALLBACK;
          throw new Error(msg);
        });
      })
      .catch(function (err) {
        showError(err && err.message && err.message !== 'Failed to fetch' ? err.message : FALLBACK);
        button.disabled = false;
        button.querySelector('span').textContent = 'send enquiry';
      });
  });
})();
