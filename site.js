// Wspólny skrypt wszystkich stron (bez zależności).
// build.mjs wkleja go na koniec <body>; w podglądzie .dc.html wywołuje go Component.
(function () {
  // ---------- Kalendarz wydarzeń: dane z Sanity (panel: future-frisbee.sanity.studio) ----------
  // Daty liczone na napisach RRRR-MM-DD, bez stref czasowych.
  // api.sanity.io, nie apicdn: CDN Sanity potrafi przez kilka minut podawać stare dane.
  var SANITY = 'https://xdpvlpcu.api.sanity.io/v2026-01-01/data/query/production';
  var QUERY = '*[_type=="event" && (date >= $today || endDate >= $today)] | order(date asc)[0...20]' +
    '{_id,title,date,endDate,shortDescription,link,category}';
  var MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień',
    'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  var MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia',
    'września', 'października', 'listopada', 'grudnia'];
  var MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m0, d) { return y + '-' + pad(m0 + 1) + '-' + pad(d); }
  function parts(s) { return [+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)]; }
  function daysIn(y, m0) { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }
  function nextDay(s) {
    var p = parts(s), d = new Date(Date.UTC(p[0], p[1], p[2] + 1));
    return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  var ffCal = {
    // Dni miesiąca od poniedziałku; null = puste pole. Długość: wielokrotność 7.
    monthGrid: function (y, m0) {
      var lead = (new Date(Date.UTC(y, m0, 1)).getUTCDay() + 6) % 7, out = [], d, n = daysIn(y, m0);
      for (d = 0; d < lead; d++) out.push(null);
      for (d = 1; d <= n; d++) out.push(iso(y, m0, d));
      while (out.length % 7) out.push(null);
      return out;
    },
    // { 'RRRR-MM-DD': [wydarzenia] }, wielodniowe rozpisane na każdy dzień.
    eventsByDay: function (events) {
      var map = {};
      events.forEach(function (ev) {
        var day = ev.date, end = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
        for (var i = 0; day <= end && i < 62; i++, day = nextDay(day)) (map[day] = map[day] || []).push(ev);
      });
      return map;
    },
    addMonths: function (y, m0, n) {
      var t = y * 12 + m0 + n;
      return [Math.floor(t / 12), ((t % 12) + 12) % 12];
    },
    monthLabel: function (y, m0) { return MONTHS[m0] + ' ' + y; },
    dayLabel: function (s) { var p = parts(s); return p[2] + ' ' + MONTHS_GEN[p[1]] + ' ' + p[0]; },
    shortMonth: function (s) { return MONTHS_SHORT[parts(s)[1]]; },
    // Bezpieczny link: http(s)/mailto/tel, ścieżka na stronie albo sam adres (test.pl → https://test.pl).
    safeLink: function (u) {
      u = String(u || '').trim();
      if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
      if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null;
      if (/^(\/|#|\.\/)/.test(u) || /^[\w-]+\.html\b/i.test(u)) return u;
      if (/^[^\s\/?#]+\.[a-z]{2,}([\/?#]\S*)?$/i.test(u)) return 'https://' + u;
      return null;
    },
    url: function (today) {
      return SANITY + '?query=' + encodeURIComponent(QUERY) +
        '&' + encodeURIComponent('$today') + '=' + encodeURIComponent('"' + today + '"');
    }
  };
  window.ffCal = ffCal;

  var SIGNUP = 'oferta.html?temat=Warsztaty%2C%20seminarium%20lub%20pokaz#zapisy';
  var CATEGORIES = { warsztaty: 'Warsztaty', seminarium: 'Seminarium', pokaz: 'Pokaz', grupowe: 'Zajęcia grupowe', zawody: 'Zawody' };
  var WEEKDAYS = ['Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob', 'Nie'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function todayIso() { var d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); }
  function rangeLabel(ev) {
    if (!ev.endDate || ev.endDate <= ev.date) return ffCal.dayLabel(ev.date);
    var a = parts(ev.date), b = parts(ev.endDate);
    if (a[0] === b[0] && a[1] === b[1]) return a[2] + '–' + ffCal.dayLabel(ev.endDate);
    return ffCal.dayLabel(ev.date) + ' – ' + ffCal.dayLabel(ev.endDate);
  }
  // Opis jednego wydarzenia: data, tytuł, opis, link (własny albo „Zapisz się”).
  function eventBlock(ev, withDate) {
    var box = el('div', 'cal-ev');
    if (withDate) box.appendChild(el('p', 'cal-ev-date', rangeLabel(ev)));
    if (!withDate && CATEGORIES[ev.category]) box.appendChild(el('span', 'cal-tag', CATEGORIES[ev.category]));
    box.appendChild(el('h4', null, ev.title));
    if (ev.shortDescription) box.appendChild(el('p', null, ev.shortDescription));
    var href = ffCal.safeLink(ev.link), a = el('a', 'text-link', href ? 'Szczegóły' : 'Zapisz się');
    a.href = href || SIGNUP;
    if (href && /^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    box.appendChild(a);
    return box;
  }

  function renderCalendar(root) {
    if (root.getAttribute('data-cal-state')) return;
    if (!window.fetch) { root.setAttribute('data-cal-state', 'empty'); return; }
    root.setAttribute('data-cal-state', 'loading');
    var today = todayIso();
    fetch(ffCal.url(today), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var events = (data.result || []).filter(function (e) { return e && e.title && /^\d{4}-\d\d-\d\d$/.test(e.date); });
        if (!events.length) { root.setAttribute('data-cal-state', 'empty'); return; }
        root.appendChild(build(events, today));
        root.setAttribute('data-cal-state', 'ready');
      })
      .catch(function () { root.setAttribute('data-cal-state', 'empty'); });
  }

  function build(events, today) {
    var byDay = ffCal.eventsByDay(events);
    var first = parts(events[0].date < today ? today : events[0].date);
    var view = [first[0], first[1]];
    var app = el('div', 'cal-app'), cal = el('div', 'cal');
    var head = el('div', 'cal-head'), prev = el('button', 'cal-nav', '‹'), next = el('button', 'cal-nav', '›');
    var title = el('h3', 'cal-month'), week = el('div', 'cal-week'), grid = el('div', 'cal-grid');
    var pop = el('div', 'cal-pop'), legend = el('p', 'cal-legend'), openBtn = null, hideTimer = null;
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', 'Poprzedni miesiąc');
    next.setAttribute('aria-label', 'Następny miesiąc');
    title.setAttribute('aria-live', 'polite');
    pop.id = 'cal-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    WEEKDAYS.forEach(function (d) { week.appendChild(el('span', null, d)); });
    legend.appendChild(el('i'));
    legend.appendChild(document.createTextNode('Dzień z wydarzeniem - kliknij albo najedź, żeby zobaczyć szczegóły'));
    head.appendChild(prev); head.appendChild(title); head.appendChild(next);
    [head, week, grid, legend, pop].forEach(function (n) { cal.appendChild(n); });

    function close() {
      clearTimeout(hideTimer);
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      openBtn = null;
      pop.hidden = true;
    }
    function open(btn) {
      clearTimeout(hideTimer);
      if (openBtn === btn) return;
      close();
      openBtn = btn;
      btn.setAttribute('aria-expanded', 'true');
      pop.textContent = '';
      byDay[btn.getAttribute('data-day')].forEach(function (ev) { pop.appendChild(eventBlock(ev, true)); });
      pop.hidden = false;
      // Dymek nad dniem (albo pod, gdy brak miejsca), zawsze w obrębie kalendarza.
      var w = pop.offsetWidth, h = pop.offsetHeight, cw = cal.clientWidth;
      var left = btn.offsetLeft + btn.offsetWidth / 2 - w / 2; // offsetParent = .cal
      var top = btn.offsetTop - h - 8;
      if (top < 0) top = btn.offsetTop + btn.offsetHeight + 8;
      pop.style.left = Math.max(8, Math.min(left, cw - w - 8)) + 'px';
      pop.style.top = top + 'px';
    }
    function hideSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(close, 180); }

    function draw() {
      close();
      title.textContent = ffCal.monthLabel(view[0], view[1]);
      grid.textContent = '';
      ffCal.monthGrid(view[0], view[1]).forEach(function (day) {
        if (!day) { grid.appendChild(el('div', 'cal-pad')); return; }
        var evs = byDay[day], cell = el(evs ? 'button' : 'div', 'cal-day' + (day === today ? ' today' : ''));
        cell.appendChild(el('span', 'cal-num', String(parts(day)[2])));
        if (evs) {
          cell.type = 'button';
          cell.className += ' has-ev';
          cell.setAttribute('data-day', day);
          cell.setAttribute('aria-expanded', 'false');
          cell.setAttribute('aria-controls', 'cal-pop');
          cell.setAttribute('aria-label', ffCal.dayLabel(day) + ': ' + evs.map(function (e) { return e.title; }).join(', '));
          cell.appendChild(el('span', 'cal-title', evs[0].title));
          if (evs.length > 1) cell.appendChild(el('span', 'cal-more', '+' + (evs.length - 1)));
          cell.appendChild(el('span', 'cal-dot'));
        }
        grid.appendChild(cell);
      });
    }
    prev.addEventListener('click', function () { view = ffCal.addMonths(view[0], view[1], -1); draw(); });
    next.addEventListener('click', function () { view = ffCal.addMonths(view[0], view[1], 1); draw(); });

    // Mysz: najechanie otwiera. Dotyk/klik/klawiatura: przełącza.
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('button.cal-day');
      if (!btn) return;
      if (openBtn === btn && !btn._hovered) close(); else open(btn);
      btn._hovered = false;
    });
    grid.addEventListener('pointerover', function (e) {
      var btn = e.target.closest('button.cal-day');
      if (btn && e.pointerType === 'mouse') { if (openBtn !== btn) btn._hovered = true; open(btn); }
    });
    grid.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse' && openBtn) hideSoon(); });
    pop.addEventListener('pointerover', function () { clearTimeout(hideTimer); });
    pop.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse') hideSoon(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openBtn) { var b = openBtn; close(); b.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (openBtn && !pop.contains(e.target) && !e.target.closest('button.cal-day')) close();
    });

    // Lista 2 najbliższych wydarzeń
    var list = el('div', 'cal-list');
    list.appendChild(el('h3', null, 'Najbliższe wydarzenia'));
    events.slice(0, 2).forEach(function (ev) {
      var item = el('div', 'cal-item'), badge = el('div', 'cal-badge'), d = ev.date < today ? today : ev.date;
      badge.appendChild(el('b', null, String(parts(d)[2])));
      badge.appendChild(el('span', null, ffCal.shortMonth(d)));
      badge.setAttribute('aria-hidden', 'true');
      var body = eventBlock(ev, false);
      body.insertBefore(el('p', 'cal-ev-date', rangeLabel(ev)), body.querySelector('h4'));
      item.appendChild(badge);
      item.appendChild(body);
      list.appendChild(item);
    });

    draw();
    app.appendChild(cal);
    app.appendChild(list);
    return app;
  }

  function init() {
    if (window.__ffReady) return;
    var reveal = document.querySelectorAll('[data-reveal]');
    var forms = document.querySelectorAll('form[data-mail]');
    if (!reveal.length && !forms.length) return; // treść jeszcze się nie wyrenderowała
    window.__ffReady = true;
    document.documentElement.classList.add('js');

    // Pojawianie się elementów przy przewijaniu
    reveal.forEach(function (el) {
      var d = el.getAttribute('data-delay');
      if (d) el.style.transitionDelay = d + 'ms';
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          el.classList.add('in');
          io.unobserve(el);
          setTimeout(function () { el.style.transitionDelay = ''; }, 1400);
        });
      }, { threshold: 0.12 });
      reveal.forEach(function (el) { io.observe(el); });
    } else {
      reveal.forEach(function (el) { el.classList.add('in'); });
    }

    // Kalendarz wydarzeń (strona główna)
    document.querySelectorAll('[data-cal]').forEach(renderCalendar);

    // Wybór usługi w formularzu: przyciski z data-pick i adres ?temat=...
    function pick(value) {
      var sel = document.querySelector('form[data-mail] select[name="temat"]');
      if (sel && value) sel.value = value;
    }
    document.querySelectorAll('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () { pick(a.getAttribute('data-pick')); });
    });
    try { pick(new URLSearchParams(location.search).get('temat')); } catch (e) {}

    // Formularz → Formspree (wysyłka w tle; bez JS zwykły POST na adres z action)
    forms.forEach(function (form) {
      form.addEventListener('submit', function (ev) {
        if (!window.fetch || !window.FormData) return; // stara przeglądarka: zwykły POST
        ev.preventDefault();
        var f = form.elements;
        var val = function (n) { return f[n] ? String(f[n].value || '').trim() : ''; };
        var status = form.querySelector('.form-status');
        var btn = form.querySelector('button[type="submit"]');
        var say = function (t) { if (status) status.textContent = t; };
        form.removeAttribute('data-state');
        var data = new FormData(form);
        data.set('_subject', 'Zgłoszenie ze strony: ' + (val('temat') || 'Pytanie'));
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('kontakt'))) data.set('_replyto', val('kontakt'));
        if (btn) btn.disabled = true;
        say('Wysyłam…');
        return fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); })
          .then(function () {
            // Ekran podziękowania w tej samej ramce (bez skoku wysokości)
            form.reset();
            say('');
            form.style.minHeight = form.offsetHeight + 'px';
            form.setAttribute('data-state', 'sent');
            var done = form.querySelector('.form-done');
            if (done) { done.focus(); if (done.scrollIntoView) done.scrollIntoView({ block: 'nearest' }); }
          })
          .catch(function () {
            form.setAttribute('data-state', 'error');
            say('Nie udało się wysłać wiadomości. Zadzwoń: ' + form.getAttribute('data-phone') +
              ' albo napisz: ' + form.getAttribute('data-mail') + '.');
          })
          .then(function () { if (btn) btn.disabled = false; });
      });
      var again = form.querySelector('[data-form-again]');
      if (again) again.addEventListener('click', function () {
        form.removeAttribute('data-state');
        form.style.minHeight = '';
        var first = form.querySelector('.field select, .field input, .field textarea');
        if (first) first.focus();
      });
    });
  }
  window.ffInit = init;
  init();
})();
