(function () {
  /* Menú lateral en pantallas pequeñas */
  var btn = document.querySelector('.menu-btn');
  var side = document.getElementById('sidebar');
  if (btn && side) {
    var setOpen = function (open) {
      side.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Cerrar' : 'Menú';
    };
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!side.classList.contains('open')); });
    document.addEventListener('click', function (e) {
      if (side.classList.contains('open') && !side.contains(e.target) && e.target !== btn) setOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  /* Índice "En esta página" a partir de los h3 */
  var toc = document.querySelector('.onpage');
  var heads = Array.prototype.slice.call(document.querySelectorAll('.doc > h3'));
  if (!toc || heads.length < 3) return;
  var slugify = function (s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  };
  var used = {};
  var items = heads.map(function (h) {
    var clone = h.cloneNode(true);
    var k = clone.querySelector('.k'); if (k) k.remove();
    var text = clone.textContent.trim();
    var id = h.id || slugify(text) || 'seccion';
    while (used[id]) id += '-2';
    used[id] = true; h.id = id;
    return '<li><a href="#' + id + '">' + text.replace(/</g, '&lt;') + '</a></li>';
  });
  toc.innerHTML = '<p>En esta página</p><ul>' + items.join('') + '</ul>';
  toc.hidden = false;

  var links = toc.querySelectorAll('a');
  if ('IntersectionObserver' in window) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      for (var i = 0; i < heads.length; i++) { if (visible[heads[i].id]) { current = heads[i].id; break; } }
      if (!current) return;
      links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + current); });
    }, { rootMargin: '-10% 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }
})();

/* ---------- tema, buscador, copiar, glosario y progreso ---------- */
(function () {
  var base = document.body.getAttribute('data-base') || '/';
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Tema: automático → claro → oscuro */
  var themeBtn = document.querySelector('.theme-btn');
  var THEMES = ['auto', 'light', 'dark'], NAMES = { auto: 'automático', light: 'claro', dark: 'oscuro' };
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) themeBtn.textContent = 'Tema: ' + NAMES[t];
  }
  var cur = store.get('spl-theme') || 'auto'; if (THEMES.indexOf(cur) < 0) cur = 'auto';
  applyTheme(cur);
  if (themeBtn) themeBtn.addEventListener('click', function () {
    cur = THEMES[(THEMES.indexOf(cur) + 1) % 3]; store.set('spl-theme', cur); applyTheme(cur);
  });

  /* Copiar en bloques de código */
  document.querySelectorAll('.doc pre').forEach(function (pre) {
    if (pre.closest('.ui-frame') || pre.id) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'copy-btn'; b.textContent = 'Copiar';
    b.addEventListener('click', function () {
      var txt = pre.innerText.replace(/\nCopiar$/, '');
      var done = function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () { b.textContent = 'Selecciona y copia'; });
    });
    pre.classList.add('has-copy'); pre.appendChild(b);
  });

  /* Progreso de lectura */
  var slug = document.body.getAttribute('data-slug');
  var read = []; try { read = JSON.parse(store.get('spl-read') || '[]'); } catch (e) {}
  function paintRead() {
    document.querySelectorAll('.sidenav li a').forEach(function (a) {
      var s = (a.getAttribute('href') || '').split('/').pop().replace('.html', '');
      a.classList.toggle('read', read.indexOf(s) >= 0);
    });
    var total = document.querySelectorAll('.sidenav li a').length, note = document.querySelector('.progress-note');
    if (note) { note.hidden = read.length === 0; note.textContent = 'Has marcado ' + read.length + ' de ' + total + ' páginas como leídas.'; }
    var rb = document.querySelector('.read-btn');
    if (rb) { var on = read.indexOf(slug) >= 0; rb.setAttribute('aria-pressed', on); rb.textContent = on ? 'Leída ✓' : 'Marcar como leída'; }
  }
  var rb = document.querySelector('.read-btn');
  if (rb) rb.addEventListener('click', function () {
    var i = read.indexOf(slug); if (i >= 0) read.splice(i, 1); else read.push(slug);
    store.set('spl-read', JSON.stringify(read)); paintRead();
  });
  paintRead();

  /* Glosario: definición al pasar el cursor, en la primera aparición de cada término */
  fetch(base + 'assets/glossary.json').then(function (r) { return r.json(); }).then(function (gl) {
    var scope = document.querySelectorAll('.doc > p:not(.src):not(.lede), .doc > ul > li, .doc > ol > li, .doc > .def');
    var done = {};
    gl.forEach(function (g) {
      var key = g.t[0];
      var re = new RegExp('(^|[^\\wáéíóúñ])(' + g.t.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')(?![\\wáéíóúñ])', 'i');
      for (var i = 0; i < scope.length && !done[key]; i++) {
        var walker = document.createTreeWalker(scope[i], NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) { return n.parentElement.closest('a,code,pre,.term,h1,h2,h3,button,.ui-frame') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
        });
        var n;
        while ((n = walker.nextNode())) {
          var m = n.nodeValue.match(re);
          if (!m) continue;
          var start = m.index + m[1].length, word = m[2];
          var after = n.splitText(start); after.splitText(word.length);
          var span = document.createElement('span'); span.className = 'term'; span.tabIndex = 0;
          span.setAttribute('data-def', g.d); span.setAttribute('aria-label', word + ': ' + g.d); span.textContent = word;
          after.parentNode.replaceChild(span, after);
          done[key] = true; break;
        }
      }
    });
  }).catch(function () {});

  /* Buscador */
  var dlg = document.querySelector('.search-dlg'), qi = document.getElementById('search-q'), res = document.getElementById('search-res');
  var idx = null;
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function openSearch() {
    if (!dlg) return; dlg.hidden = false; qi.value = ''; res.innerHTML = '<li class="hint">Escribe al menos dos letras.</li>'; setTimeout(function () { qi.focus(); }, 30);
    if (!idx) fetch(base + 'search.json').then(function (r) { return r.json(); }).then(function (d) { idx = d.map(function (p) { p.nt = norm(p.t); p.nc = norm(p.c); p.nd = norm(p.d); return p; }); run(); }).catch(function () { res.innerHTML = '<li class="hint">No se pudo cargar el índice de búsqueda.</li>'; });
  }
  function closeSearch() { if (dlg) dlg.hidden = true; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    var q = norm(qi.value.trim()); if (!idx) return;
    if (q.length < 2) { res.innerHTML = '<li class="hint">Escribe al menos dos letras.</li>'; return; }
    var terms = q.split(/\s+/).filter(Boolean);
    var hits = idx.map(function (p) {
      var score = 0, first = -1;
      terms.forEach(function (t) {
        if (p.nt.indexOf(t) >= 0) score += 10;
        if (p.nd.indexOf(t) >= 0) score += 4;
        var k = p.nc.indexOf(t), c = 0;
        while (k >= 0 && c < 20) { if (first < 0) first = k; c++; k = p.nc.indexOf(t, k + t.length); }
        score += c;
      });
      return { p: p, s: score, f: first };
    }).filter(function (h) { return h.s > 0 && terms.every(function (t) { return h.p.nt.indexOf(t) >= 0 || h.p.nc.indexOf(t) >= 0; }); })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
    if (!hits.length) { res.innerHTML = '<li class="hint">Sin resultados. Prueba con otra palabra, por ejemplo "spill" o "shuffle".</li>'; return; }
    res.innerHTML = hits.map(function (h) {
      var c = h.p.c, a = Math.max(0, h.f - 60), snip = (a > 0 ? '…' : '') + c.slice(a, a + 170) + '…';
      var out = esc(snip);
      terms.forEach(function (t) { if (t.length > 1) out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
      return '<li><a href="' + h.p.u + '"><b>' + esc(h.p.t) + '</b><span>' + out + '</span></a></li>';
    }).join('');
  }
  document.querySelectorAll('.search-open').forEach(function (b) { b.addEventListener('click', openSearch); });
  if (dlg) {
    dlg.querySelector('.search-close').addEventListener('click', closeSearch);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSearch(); });
    qi.addEventListener('input', run);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });
})();
