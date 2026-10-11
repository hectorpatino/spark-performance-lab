/* Arquitectura: qué parte del compute trabaja con cada línea del notebook */
(function () {
  if (!document.getElementById('ar-q')) return;
  try {
  const WORKERS = 3, CORES = 4;
  // parts: piezas del driver que trabajan; exec: si trabajan los executors;
  // mem: cuánto llena la memoria del driver (0-100) y su nivel;
  // tasks: cuántas tasks reparte el scheduler (una por partición; ventas se lee en 14, a propósito
  // distinto de los 12 cores y de los 4 cores por worker); st: stages y tasks que muestran las cifras; ret: qué vuelve y adónde
  // (uno = un valor, pocas = unas filas, todas = todas las filas, store = al almacenamiento)
  const L = {
    py: { code: 'total = 2 + 2\nprint(total)', parts: ['py'], exec: false, st: '0 · no hay job', back: '—', mem: 2, lvl: 'ok',
      info: '<b>Solo el driver.</b> Es Python sin Spark: el nodo driver interpreta cada comando del notebook, y este no lanza ningún job. Los workers no se enteran.' },
    read: { code: 'df = spark.read.table("ventas")', parts: ['plan'], exec: false, st: '0 · no hay job', back: '—', mem: 2, lvl: 'ok',
      info: '<b>El driver anota el plan.</b> Leer una tabla devuelve un DataFrame sin leer los datos. Los executors siguen sin trabajo hasta que llegue una acción.' },
    filter: { code: 'df = df.filter("monto > 100")', parts: ['plan'], exec: false, st: '0 · no hay job', back: '—', mem: 2, lvl: 'ok',
      info: '<b>Tampoco corre nada.</b> <code>filter</code> es una transformación: el driver añade un paso al plan. Puedes encadenar muchas y los executors no hacen nada hasta la acción.' },
    count: { code: 'df.count()', parts: ['plan', 'sched'], exec: true, st: '14 tasks + suma final', back: '1 número', mem: 3, lvl: 'ok', tasks: 14, ret: 'uno',
      info: '<b>Ahora trabajan los executors.</b> <code>count()</code> es una acción. El driver optimiza el plan y el scheduler lo divide en stages y tasks. Cada task corre en un core de un executor: lee su partición, filtra y cuenta sus filas. Las filas no salen de su executor: solo viajan los conteos parciales. Después, una task final suma los 14 conteos (ver <a href="plan-ejecucion.html#explain">lo que se ve en el Spark UI</a>). Al driver vuelve un número.' },
    show: { code: 'df.show()', parts: ['plan', 'sched'], exec: true, st: '1 stage · 1 task (ilustrativo)', back: 'Hasta 20 filas', mem: 4, lvl: 'ok', tasks: 1, ret: 'pocas',
      info: '<b>Resultado pequeño.</b> <code>show()</code> muestra 20 filas por defecto. Cuántas particiones lee para conseguirlas no lo documentan ni Spark ni Databricks: aquí es 1 task, como ejemplo. En el Spark UI lo ves en las tasks de su stage. Al driver vuelven como mucho esas 20 filas.' },
    write: { code: 'df.write.saveAsTable("salida")', parts: ['plan', 'sched'], exec: true, st: '1 stage · 14 tasks', back: 'Ninguna fila', mem: 3, lvl: 'ok', tasks: 14, ret: 'store',
      info: '<b>Las filas se quedan en los executors.</b> Cada task escribe sus archivos en el almacenamiento. Al driver no vuelve ninguna fila.' },
    collect: { code: 'filas = df.collect()', parts: ['plan', 'sched'], exec: true, st: '1 stage · 14 tasks', back: 'Todas las filas', mem: 96, lvl: 'bad', tasks: 14, ret: 'todas',
      info: '<b>Todo el resultado viaja al driver.</b> Los executors calculan en paralelo, pero todas las filas acaban en la memoria de una sola máquina. La doc de PySpark avisa que solo se use si el resultado es pequeño. Con datos grandes, aquí empieza un OOM del driver. Más workers no ayudan cuando el límite es el driver.' },
    pandas: { code: 'pdf = df.toPandas()\npdf.groupby("cliente_id").sum()', parts: ['plan', 'sched', 'py'], exec: true, st: '1 stage · 14 tasks', back: 'Todas las filas', mem: 96, lvl: 'bad', tasks: 14, ret: 'todas',
      info: '<b>Igual que <code>collect()</code>, y después solo el driver.</b> <code>toPandas()</code> trae todas las filas a la memoria del driver. La segunda línea es pandas, o sea Python normal: corre en el driver, sin executors.' }
  };

  const box = document.getElementById('ar-workers');
  box.innerHTML = Array.from({ length: WORKERS }, (_, w) =>
    `<div class="ar-node ar-exec"><h4>Worker ${w + 1} <span>1 executor · ${CORES} cores</span></h4><div class="ar-cores">${'<i></i>'.repeat(CORES)}</div></div>`).join('');

  const map = document.querySelector('.ar-map');
  const drv = document.getElementById('ar-driver');
  const store = document.getElementById('ar-store');
  const phase = document.getElementById('ar-phase');
  const cores = [...box.querySelectorAll('.ar-cores i')];
  // Orden en que se ocupan los cores: uno por worker cada vez. Es ilustrativo; la doc no dice
  // a qué executor va cada task
  const order = cores.map((_, i) => cores[(i % WORKERS) * CORES + Math.floor(i / WORKERS)]);
  const part = p => drv.querySelector(`[data-p="${p}"]`);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // SLOW alarga todos los tiempos; LOOP_PAUSE es la espera antes de repetir la acción
  const SLOW = 1.6, LOOP_PAUSE = 2500;
  const replay = document.getElementById('ar-replay');
  // done: el paso actual terminó (Reanudar sigue en el siguiente, no lo repite)
  let run = 0, cur = 'py', paused = false, visible = true, done = false;

  // Centro de un elemento en coordenadas de .ar-map (sirve igual en columnas y apilado)
  function center(el) {
    const m = map.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left - m.left + r.width / 2, r.top - m.top + r.height / 2];
  }
  // Un punto que viaja de un elemento a otro; resuelve al llegar (o al cancelarse)
  function fly(from, to, cls, delay) {
    if (reduce) return Promise.resolve();
    const d = document.createElement('span');
    d.className = 'ar-dot ' + cls;
    map.appendChild(d);
    const [x0, y0] = center(from), [x1, y1] = center(to);
    const a = d.animate([
      { transform: `translate(${x0}px,${y0}px)`, opacity: 0 },
      { opacity: 1, offset: .15 },
      { transform: `translate(${x1}px,${y1}px)`, opacity: 1 }
    ], { duration: 650 * SLOW, delay: (delay || 0) * SLOW, easing: 'ease-in-out', fill: 'backwards' });
    return a.finished.then(() => d.remove(), () => d.remove());
  }
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms * SLOW));
  function stopDots() {
    map.querySelectorAll('.ar-dot').forEach(d => d.getAnimations().forEach(a => a.cancel()));
  }
  function setParts(ps) {
    drv.querySelectorAll('[data-p]').forEach(li => li.classList.toggle('on', ps.includes(li.dataset.p)));
  }
  // Enciende los cores de la lista (o los n primeros del orden de reparto) y apaga el resto
  function setCores(n) {
    const on = Array.isArray(n) ? n : order.slice(0, n);
    cores.forEach(c => c.classList.toggle('run', on.includes(c)));
    box.querySelectorAll('.ar-exec').forEach(w => {
      const busy = !!w.querySelector('.ar-cores i.run');
      w.classList.toggle('on', busy); w.classList.toggle('idle', !busy);
    });
  }

  const mem = document.getElementById('ar-mem');
  const down = document.getElementById('ar-down'), up = document.getElementById('ar-up');
  const prev = document.getElementById('ar-prev'), next = document.getElementById('ar-next');
  const plural = n => `${n} task${n > 1 ? 's' : ''}`;
  let steps = [], step = 0;

  // Pasos de una acción. Cada paso tiene: text (lo que se ve abajo), set (estado al empezar),
  // anim (puntos que viajan) y after (estado al terminar). Para saltar a un paso se aplican
  // set y after de los anteriores sin animar.
  function buildSteps(k) {
    const l = L[k], n = cores.length;
    // Primera tanda: una task por core libre. Si sobran tasks, esperan y las toman los primeros
    // cores que terminan (aquí, los primeros del orden de reparto: con 2, uno en cada worker)
    const first = order.slice(0, Math.min(l.tasks, n)), rest = Math.max(0, l.tasks - n);
    const second = order.slice(0, rest), used = first.concat(second);
    // Los cores que siguen con su task cuando llegan las pendientes. Terminan escalonados, en un
    // orden mezclado para que no parezca que acaban por worker: se recorren a saltos de `hop`,
    // primo con su número y que no sea múltiplo de los workers
    const others = first.filter(c => !second.includes(c));
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const hop = [7, 5, 1].find(h => h === 1 || (gcd(h, others.length) === 1 && h % WORKERS));
    const offOrder = others.map((c, i) => others[(i * hop) % others.length]);
    const one = l.tasks === 1, tasksEl = document.getElementById('ar-tasks');
    const label = w => '· ' + plural(l.tasks) + (w ? ` (${w} en espera)` : '');
    const s = [
      { text: 'El driver optimiza el plan', set: () => setParts(['plan']) },
      { text: l.ret === 'uno'
          ? `El scheduler divide la acción en stages. El primero tiene ${plural(l.tasks)}, una por partición de ventas`
          : one ? 'El scheduler reparte las tasks de show() (1, ilustrativo)' : `El scheduler reparte ${plural(l.tasks)}, una por partición de ventas`,
        set: () => { setParts(['plan', 'sched']); tasksEl.textContent = label(0); } },
      { text: rest
          ? `${first.length} tasks van a los ${n} cores, una por core. Las otras ${rest} esperan a que se libere un core`
          : `${one ? 'La task va' : 'Cada task va'} a un core libre: ${plural(l.tasks)} en ${n} cores. ${n - l.tasks} cores se quedan sin trabajo`,
        set: () => { down.classList.add('on'); tasksEl.textContent = label(rest); },
        anim: () => Promise.all(first.map((c, i) => fly(part('sched'), c, 'task', i * 70))),
        after: () => setCores(first.length) },
      { text: (one ? 'La task lee su partición' : rest ? `Cada una de las ${first.length} tasks lee su partición` : 'Cada task lee su partición') + ' del almacenamiento, sin pasar por el driver' +
          (l.ret === 'uno' ? ', y cuenta sus filas. Las filas no salen de su executor' : ''),
        set: () => store.classList.add('on'),
        anim: () => Promise.all(first.map((c, i) => fly(store, c, 'data', i * 50))).then(() => wait(500)) }
    ];
    // Segunda tanda en dos pasos: (a) terminan tantas tasks como esperan y sus cores se apagan;
    // (b) las pendientes van a esos cores mientras los demás siguen y se apagan escalonados.
    // No hay barrera: las pendientes no esperan a que acabe la primera tanda entera
    if (rest) s.push(
      { text: `Terminan ${plural(rest)}: esos cores quedan libres. Los otros ${others.length} siguen trabajando`,
        anim: live => wait(500).then(() => { if (live()) setCores(others); return wait(1100); }),
        after: () => setCores(others) },
      { text: `Las ${rest} tasks que esperaban van a esos cores, sin esperar a los otros ${others.length}. Esos terminan cada uno a su ritmo. El reparto es de ejemplo`,
        anim: live => Promise.all(second.map((c, i) => fly(part('sched'), c, 'task', i * 70)))
          .then(() => { if (!live()) return; tasksEl.textContent = label(0); return Promise.all(second.map((c, i) => fly(store, c, 'data', i * 50))); })
          .then(async () => {
            if (!live()) return;
            setCores(first);
            const on = first.slice();
            for (const c of offOrder) {
              await wait(260);
              if (!live()) return;
              on.splice(on.indexOf(c), 1);
              setCores(on);
            }
            return wait(900);
          }),
        after: () => { setCores(second); tasksEl.textContent = label(0); } });
    const end = () => { mem.style.width = l.mem + '%'; mem.className = l.lvl; setCores(0); store.classList.toggle('on', l.ret === 'store'); };
    if (l.ret === 'store') {
      s.push({ text: 'Cada task escribe sus archivos en el almacenamiento. Al driver no vuelve ninguna fila',
        anim: () => Promise.all(used.map((c, i) => fly(c, store, 'data', i * 50))), after: end });
    } else if (l.ret === 'uno') {
      // count(): cada task cuenta su partición; solo los conteos viajan, a una task final
      const last = order[0];
      s.push(
        { text: `Terminan las ${l.tasks} tasks del primer stage. Lo habitual es un segundo stage que lleva los ${l.tasks} conteos (no las filas) a una sola task`,
          set: () => { setCores(0); tasksEl.textContent = '· 1 task (segundo stage)'; },
          anim: () => Promise.all([fly(part('sched'), last, 'task', 0),
            ...used.map((c, i) => fly(c, last, 'res', 200 + i * 60))]),
          after: () => setCores(1) },
        { text: 'Esa task suma los conteos y al driver vuelve un número', set: () => up.classList.add('on'),
          anim: () => fly(last, drv.querySelector('.ar-mem'), 'res', 0), after: end });
    } else {
      const dots = l.ret === 'pocas' ? [used[0], used[0], used[0]] : used.flatMap(c => [c, c, c]);
      s.push({ text: l.ret === 'todas' ? 'Todas las filas viajan al driver' : 'Al driver vuelven como mucho 20 filas',
        set: () => {
          up.classList.add('on');
          if (l.ret === 'todas') { mem.className = 'bad'; mem.style.transitionDuration = reduce ? '' : 2 * SLOW + 's'; mem.style.width = l.mem + '%'; }
        },
        anim: () => Promise.all(dots.map((c, i) => fly(c, drv.querySelector('.ar-mem'), l.ret === 'todas' ? 'res bad' : 'res', i * 40))),
        after: () => { mem.style.transitionDuration = ''; end(); } });
    }
    // pandas: después del toPandas(), el groupby es Python en el driver
    if (k === 'pandas') s.push({ text: 'El groupby de pandas corre solo en el driver', set: () => setParts(['py']) });
    return s;
  }

  // Cifras y explicación de una línea. En las acciones salen al llegar al último paso, junto a lo
  // que se acaba de ver; una vez a la vista se quedan mientras no cambies de línea
  const stats = document.getElementById('ar-stats'), info = document.getElementById('ar-info');
  let shown = null;
  function showResult(k) {
    const l = L[k];
    if (shown === k) return;
    shown = k;
    stats.innerHTML =
      `<div><b>${l.st}</b><span>stages · tasks</span></div><div><b>${l.exec ? 'Sí' : 'No'}</b><span>trabajan los executors</span></div><div><b>${l.back}</b><span>vuelve al driver</span></div>`;
    info.innerHTML = `<p>${l.info}</p>`;
  }

  // Estado inicial de una línea: código, compute en reposo y, si no hay acción, cifras y explicación
  function reset(k) {
    const l = L[k];
    stopDots();
    document.getElementById('ar-code').textContent = l.code;
    if (!l.exec) showResult(k);
    else if (shown !== k) {
      stats.innerHTML = '';
      info.innerHTML = '<p>Sigue los pasos: al terminar aparecen aquí las cifras y la explicación.</p>';
    }
    drv.classList.add('on');
    up.textContent = l.exec ? l.back.toLowerCase() : 'resultado';
    up.classList.toggle('bad', l.lvl === 'bad');
    [down, up, store].forEach(e => e.classList.remove('on'));
    store.querySelector('span').textContent = 'fuera del compute · ' + (k === 'write' ? 'lee ventas, escribe salida' : 'tabla ventas');
    document.getElementById('ar-tasks').textContent = '';
    setCores(0);
    mem.style.transitionDuration = '';
    if (l.exec) { mem.style.width = '2%'; mem.className = 'ok'; }
    else { setParts(l.parts); mem.style.width = l.mem + '%'; mem.className = l.lvl; }
  }

  function setPaused(p) {
    paused = p;
    replay.setAttribute('aria-pressed', p);
    replay.textContent = p ? 'Reanudar' : 'Pausar';
  }

  // Muestra la acción k desde el paso `from`. Con auto, sigue hasta el final y vuelve a empezar;
  // sin auto, anima solo ese paso y se queda ahí
  async function play(k, from, auto) {
    const id = ++run, live = () => id === run, l = L[k];
    if (k !== cur || !steps.length) steps = l.exec ? buildSteps(k) : [];
    cur = k;
    reset(k);
    document.getElementById('ar-ctl').hidden = !l.exec || reduce;
    if (!l.exec) {
      phase.textContent = k === 'py' ? 'El driver corre el Python. No hay job.' : 'El driver añade un paso al plan. No hay job.';
      return;
    }
    steps.slice(0, from).forEach(st => { st.set && st.set(); st.after && st.after(); });
    for (let i = from; i < steps.length; i++) {
      const st = steps[i];
      step = i; done = false;
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
      phase.textContent = `${i + 1}/${steps.length} · ${st.text}`;
      st.set && st.set();
      await (st.anim ? st.anim(live) : wait(700));
      if (!live()) return;
      st.after && st.after();
      done = true;
      if (i === steps.length - 1) showResult(k);
      if (!auto) return;
    }
    // Se repite sola mientras no esté en pausa; fuera de pantalla espera sin animar
    if (reduce) return;
    await wait(LOOP_PAUSE / SLOW);
    while (live() && !visible) await wait(500);
    if (live() && !paused) play(k, 0, true);
  }

  const q = document.getElementById('ar-q');
  q.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => {
    q.querySelectorAll('[data-l]').forEach(x => x.setAttribute('aria-pressed', x === b));
    steps = [];
    // Predicción: una acción se queda en el paso 1, en pausa, hasta que pulses Reanudar o ›.
    // Con movimiento reducido no hay controles: se muestra entera
    const k = b.dataset.l;
    if (L[k].exec && !reduce) { setPaused(true); play(k, 0, false); }
    else play(k, 0, !paused);
  }));
  replay.addEventListener('click', () => {
    setPaused(!paused);
    if (paused) { run++; stopDots(); }
    else play(cur, done && step < steps.length - 1 ? step + 1 : step, true);
  });
  prev.addEventListener('click', () => { setPaused(true); play(cur, Math.max(0, step - 1), false); });
  next.addEventListener('click', () => { setPaused(true); play(cur, Math.min(steps.length - 1, step + 1), false); });
  if ('IntersectionObserver' in window)
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(map);
  play('py', 0, true);
  } catch (e) { console.error('Simulador de arquitectura', e); }
})();
