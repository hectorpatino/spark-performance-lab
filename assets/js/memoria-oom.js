/* Memoria y OOM: simulador de executor y panel del driver */
(function () {
  if (!window.SPL) return;
  const { el, UI } = window.SPL;
  const MB = 1024 * 1024;
  const fm = mib => UI.bytes(mib * MB);
  const chips = (id, cb) => {
    const g = document.getElementById(id); if (!g) return () => null;
    const btns = [...g.querySelectorAll('button[data-v]')];
    btns.forEach(b => b.addEventListener('click', () => { btns.forEach(x => x.setAttribute('aria-pressed', x === b)); cb(); }));
    return () => (btns.find(b => b.getAttribute('aria-pressed') === 'true') || btns[0]).dataset.v;
  };
  const box = (v, l, w) => `<div class="${w ? 'warn' : ''}"><b>${v}</b><span>${l}</span></div>`;

  /* ---------- 1. executor ---------- */
  if (document.getElementById('mx-sim')) { try {
    const $ = id => document.getElementById(id);
    const sHeap = $('mx-heap'), sCores = $('mx-cores'), sPart = $('mx-part'), sSkew = $('mx-skew'), sExp = $('mx-exp'), sCache = $('mx-cache'), cOn = $('mx-con');
    const RESERVED = 300, FRACTION = 0.6, SFRACTION = 0.5;
    let getOp;
    function draw() {
      const heap = +sHeap.value * 1024, N = +sCores.value, part = +sPart.value, skew = +sSkew.value, exp = +sExp.value;
      const cacheOn = cOn.checked, C = +sCache.value * 1024;
      $('mx-heap-o').textContent = sHeap.value + ' GiB';
      $('mx-cores-o').textContent = N;
      $('mx-part-o').textContent = fm(part);
      $('mx-skew-o').textContent = '×' + skew;
      $('mx-exp-o').textContent = '×' + exp;
      $('mx-cache-o').textContent = cacheOn ? fm(C) : 'sin caché';
      sCache.disabled = !cacheOn; sCache.parentElement.style.opacity = cacheOn ? '1' : '.45';

      const usable = Math.max(0, heap - RESERVED), M = FRACTION * usable, user = usable - M, R = SFRACTION * M;
      const stored = cacheOn ? Math.min(C, M) : 0, notCached = cacheOn ? Math.max(0, C - M) : 0;
      const pool = M - Math.min(stored, R);           // lo máximo que puede usar la ejecución tras desalojar caché
      const share = pool / N, minShare = pool / (2 * N);
      const needAvg = part * exp, needMax = part * exp * skew;
      const op = getOp();

      // ---- gráfico ----
      const svg = $('mx-chart'); svg.textContent = '';
      const X0 = 10, X1 = 350, Wd = X1 - X0, sx = v => X0 + v / heap * Wd;
      svg.appendChild(el('text', { x: X0, y: 12, class: 'sub' }, 'Heap del executor (' + fm(heap) + ')'));
      const segs = [[RESERVED, 'mx-res'], [user, 'p1'], [stored, 'p2'], [M - stored, 'mx-exe']];
      let acc = 0;
      segs.forEach(([v, cls]) => { if (v <= 0) return; svg.appendChild(el('rect', { x: sx(acc), y: 18, width: Math.max(0.5, sx(acc + v) - sx(acc)), height: 26, class: cls })); acc += v; });
      const mStart = RESERVED + user;
      const rx = sx(mStart + R);
      svg.appendChild(el('line', { x1: rx, x2: rx, y1: 14, y2: 48, class: 'ln thr' }));
      svg.appendChild(el('line', { x1: sx(mStart), x2: sx(mStart), y1: 48, y2: 54, class: 'ax' }));
      svg.appendChild(el('line', { x1: X1, x2: X1, y1: 48, y2: 54, class: 'ax' }));
      svg.appendChild(el('line', { x1: sx(mStart), x2: X1, y1: 54, y2: 54, class: 'ax' }));
      svg.appendChild(el('text', { x: (sx(mStart) + X1) / 2, y: 65, 'text-anchor': 'middle', class: 'tick' }, 'unificada M = ' + fm(M)));
      svg.appendChild(el('text', { x: sx(RESERVED) + 3, y: 35, class: 'lbl', style: 'fill:var(--bg)' }, sx(mStart) - sx(RESERVED) > 70 ? 'user ' + fm(user) : 'user'));
      svg.appendChild(el('text', { x: rx + 3, y: 12, class: 'lbl thr' }, 'R'));

      // barras por task
      const rows = [
        ['1/' + N + ' del pool', share, 'bar'],
        ['task media', needAvg, needAvg <= share ? 'mx-ok' : 'bar hot'],
        ['task grande', needMax, needMax <= share ? 'mx-ok' : 'bar hot']
      ];
      const vmax = Math.max(share, needMax) * 1.08;
      const L2 = 92, sx2 = v => L2 + v / vmax * (X1 - L2);
      svg.appendChild(el('text', { x: X0, y: 88, class: 'sub' }, 'Memoria de ejecución por task'));
      rows.forEach((r, i) => {
        const y = 96 + i * 34;
        svg.appendChild(el('text', { x: L2 - 6, y: y + 15, 'text-anchor': 'end', class: 'tick' }, r[0]));
        svg.appendChild(el('rect', { x: L2, y, width: Math.max(1, sx2(r[1]) - L2), height: 22, rx: 3, class: r[2] }));
        const tx = sx2(r[1]), inside = tx > X1 - 60;
        svg.appendChild(el('text', { x: inside ? tx - 4 : tx + 4, y: y + 15, 'text-anchor': inside ? 'end' : 'start', class: 'lbl', style: inside ? 'fill:var(--bg)' : 'fill:var(--ink)' }, fm(r[1])));
      });
      const shx = sx2(share);
      svg.appendChild(el('line', { x1: shx, x2: shx, y1: 92, y2: 200, class: 'ln fac' }));
      svg.appendChild(el('text', { x: Math.min(shx, X1 - 2), y: 210, 'text-anchor': shx > X1 - 60 ? 'end' : 'middle', class: 'lbl fac' }, 'límite por task'));

      // ---- contadores ----
      $('mx-stats').innerHTML = box(fm(M), 'unificada (M)') + box(fm(R), 'caché protegida (R)') + box(fm(pool), 'ejecución disponible') + box(fm(share), 'por task (máx. 1/N)', needMax > share);

      // ---- veredicto ----
      const out = [];
      if (needMax <= share) {
        out.push(`<div><span class="pill ok">cabe</span>La task más grande necesita ${fm(needMax)} y cada task puede usar hasta ${fm(share)}.</div>`);
      } else if (op === 'spill') {
        const ratio = needMax / share;
        out.push(`<div><span class="pill bad">spill</span>La task más grande necesita ${fm(needMax)}, ${ratio.toFixed(1)}× su parte. Escribe a disco unos ${fm(needMax - share)} y sigue: el stage termina, más lento.</div>`);
        if (needAvg > share) out.push(`<div><span class="pill bad">todas</span>Hasta la task media hace spill: faltan particiones. Sube <code>spark.sql.shuffle.partitions</code> (o <code>auto</code>) o baja <code>maxPartitionBytes</code>.</div>`);
        else out.push(`<div class="c">Solo la task con skew hace spill. Es el patrón de una task lenta en el stage; en un join, AQE puede partirla.</div>`);
        if (ratio > 10) out.push(`<div class="c">Con un spill tan grande también sube el GC Time y el riesgo de perder el executor. El simulador no lo modela.</div>`);
      } else {
        out.push(`<div><span class="pill bad">OOM probable</span>La tabla hash de la task más grande (${fm(needMax)}) no cabe en su parte (${fm(share)}) y no puede ir a disco. La task falla; tras varios intentos falla el stage.</div>`);
        out.push(`<div class="c">Arreglo según la doc de Spark: más paralelismo para que cada tabla hash sea más pequeña. En un join, deja que Spark use sort-merge (el default) en vez de forzar <code>SHUFFLE_HASH</code>.</div>`);
      }
      if (cacheOn && stored > R) {
        const demand = Math.min(needAvg * N, pool), free = M - stored;
        if (demand > free) out.push(`<div><span class="pill bad">caché</span>Las tasks necesitan más de los ${fm(Math.max(0, free))} libres: la ejecución desaloja hasta ${fm(Math.min(demand - free, stored - R))} de caché (nunca por debajo de R = ${fm(R)}).</div>`);
      }
      if (notCached > 0) out.push(`<div><span class="pill bad">caché</span>La caché pedida no cabe en M: ${fm(notCached)} se quedan fuera y se recalculan al leerlos.</div>`);
      if (exp > 1) out.push(`<div class="c">El explode multiplica por ${exp} las filas que la task tiene que manejar. Si la memoria no basta, más memoria solo lo retrasa: revisa si necesitas todas esas filas.</div>`);
      $('mx-verdict').innerHTML = out.join('');
    }
    getOp = chips('mx-op', draw);
    [sHeap, sCores, sPart, sSkew, sExp, sCache].forEach(x => x.addEventListener('input', draw));
    cOn.addEventListener('change', draw);
    draw();
  } catch (e) { console.error('memoria: executor', e); } }

  /* ---------- 2. driver ---------- */
  if (document.getElementById('dr-sim')) { try {
    const $ = id => document.getElementById(id);
    const sMem = $('dr-mem'), sRes = $('dr-res');
    let getAct, getMax;
    function draw() {
      const mem = +sMem.value * 1024, S = 10.24 * Math.pow(10, +sRes.value / 12.5);
      const act = getAct(), lim = +getMax() * 1024;
      const factor = act === 'pandas' ? 3 : 2, need = S * factor, busy = mem * 0.5, free = mem - busy;
      $('dr-mem-o').textContent = sMem.value + ' GiB';
      $('dr-res-o').textContent = fm(S);
      const svg = $('dr-chart'); svg.textContent = '';
      const X0 = 96, X1 = 350, vmax = Math.max(mem, busy + need, S, lim || 0) * 1.04, sx = v => X0 + v / vmax * (X1 - X0);
      // fila 1: driver
      svg.appendChild(el('text', { x: X0 - 6, y: 24, 'text-anchor': 'end', class: 'tick' }, 'driver'));
      svg.appendChild(el('rect', { x: X0, y: 10, width: sx(busy) - X0, height: 22, class: 'mx-res' }));
      svg.appendChild(el('rect', { x: sx(busy), y: 10, width: sx(mem) - sx(busy), height: 22, class: 'mx-free' }));
      if (!(lim && S > lim)) svg.appendChild(el('rect', { x: sx(busy), y: 15, width: Math.max(1, sx(busy + need) - sx(busy)), height: 12, rx: 2, class: need > free ? 'bar hot' : 'mx-ok' }));
      svg.appendChild(el('line', { x1: sx(mem), x2: sx(mem), y1: 6, y2: 36, class: 'ln med' }));
      svg.appendChild(el('text', { x: sx(mem) - 3, y: 46, 'text-anchor': 'end', class: 'lbl med' }, 'memoria del driver ' + fm(mem)));
      // fila 2: resultado serializado vs maxResultSize
      svg.appendChild(el('text', { x: X0 - 6, y: 72, 'text-anchor': 'end', class: 'tick' }, 'serializado'));
      svg.appendChild(el('rect', { x: X0, y: 58, width: Math.max(1, sx(S) - X0), height: 22, rx: 3, class: lim && S > lim ? 'bar hot' : 'bar' }));
      if (lim) {
        const lx = sx(lim);
        svg.appendChild(el('line', { x1: lx, x2: lx, y1: 52, y2: 86, class: 'ln thr' }));
        svg.appendChild(el('text', { x: lx + 3 > X1 - 70 ? lx - 3 : lx + 3, y: 94, 'text-anchor': lx + 3 > X1 - 70 ? 'end' : 'start', class: 'lbl thr' }, 'maxResultSize ' + fm(lim)));
      }
      const fn = act === 'pandas' ? 'toPandas()' : 'collect()';
      let v;
      if (lim && S > lim) v = `<div><span class="pill bad">job abortado</span>El resultado serializado (${fm(S)}) supera <code>spark.driver.maxResultSize</code> (${fm(lim)}). Spark aborta el job antes de llenar el driver: el límite hizo su trabajo.</div><div class="c">No lo arregles subiendo el límite. Escribe el resultado a una tabla, o filtra y agrega antes de <code>${fn}</code>.</div>`;
      else if (need > free) v = `<div><span class="pill bad">OOM probable</span>${fn} necesitaría unos ${fm(need)} en el driver y solo hay unos ${fm(free)} libres.${lim ? '' : ' Sin límite de <code>maxResultSize</code>, nada lo frena antes.'}</div><div class="c">Usa <code>.limit(n)</code>, escribe a una tabla o agrega antes. Un driver más grande es el último recurso.</div>`;
      else if (need > free * 0.6) v = `<div><span class="pill ok">cabe</span>Pero justo: ${fm(need)} de ${fm(free)} libres. Con otro notebook o stream en el mismo cluster, deja de caber.</div>`;
      else v = `<div><span class="pill ok">cabe</span>${fn} ocupa unos ${fm(need)} de los ${fm(free)} libres del driver.</div>`;
      $('dr-verdict').innerHTML = v;
    }
    getAct = chips('dr-act', draw); getMax = chips('dr-max', draw);
    [sMem, sRes].forEach(x => x.addEventListener('input', draw));
    draw();
  } catch (e) { console.error('memoria: driver', e); } }
})();
