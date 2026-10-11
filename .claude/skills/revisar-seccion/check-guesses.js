// Comprobación de predicciones, consola y ancho móvil en varias páginas.
// Pásalo a browser_run_code_unsafe de Playwright con el sitio servido en
// http://localhost:4011/spark-performance-lab/ (jekyll serve --port 4011 --detach).
// Edita SLUGS con las páginas de la sección.
async (page) => {
  const base = 'http://localhost:4011/spark-performance-lab/';
  const SLUGS = ['arquitectura', 'plan-ejecucion', 'stages', 'shuffle', 'joins', 'repaso-fundamentos'];
  const out = {};
  for (const slug of SLUGS) {
    const errs = [];
    const onMsg = m => { if (m.type() === 'error') errs.push(m.text()); };
    const onErr = e => errs.push('PAGEERR ' + e.message);
    page.on('console', onMsg); page.on('pageerror', onErr);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base + slug + '.html'); await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const res = { guesses: 0, ok: 0, answers: '', problems: [] };
      document.querySelectorAll('[data-guess]').forEach((g, i) => {
        res.guesses++; const ans = g.dataset.answer; res.answers += ans;
        const body = g.querySelector('.guess-body');
        const opts = [...g.querySelectorAll('.guess-opts [data-opt]')];
        const fbs = [...g.querySelectorAll('.guess-fb')];
        if (!body || !body.hidden) { res.problems.push(i + ': cuerpo visible al cargar'); return; }
        if (fbs.length !== opts.length) res.problems.push(i + ': comentarios ≠ opciones');
        const wrong = opts.find(o => o.dataset.opt !== ans);
        if (wrong) { wrong.click(); if (!wrong.classList.contains('no')) res.problems.push(i + ': incorrecta sin marcar'); }
        const right = opts.find(o => o.dataset.opt === ans);
        if (!right) { res.problems.push(i + ': data-answer sin opción'); return; }
        right.click(); if (!right.classList.contains('ok')) res.problems.push(i + ': correcta sin marcar');
        const vis = fbs.filter(f => !f.hidden);
        if (vis.length !== 1 || vis[0].dataset.for !== ans) res.problems.push(i + ': comentario visible equivocado');
        const more = g.querySelector('.guess-more');
        if (!more || more.hidden) res.problems.push(i + ': sin botón de explicación');
        else { more.click(); if (body.hidden) res.problems.push(i + ': la explicación no se abre'); else res.ok++; }
      });
      // simuladores con preguntas propias (p. ej. #dag-guess de plan-ejecucion) también cuentan
      res.sims = document.querySelectorAll('#dag-guess').length;
      return res;
    });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
    r.overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1
      ? [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id)
      : 0);
    r.errs = errs; out[slug] = r;
    page.off('console', onMsg); page.off('pageerror', onErr);
  }
  return JSON.stringify(out, null, 1);
}
