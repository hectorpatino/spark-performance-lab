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
