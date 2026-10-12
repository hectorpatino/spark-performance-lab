/* Plan de ejecución: del notebook al árbol Application › Jobs › Stages › Tasks */
(function () {
  if (!window.SPL || !document.getElementById('tr-svg')) return;
  const { el } = window.SPL;
  try {
  const B_FILES = 2, MAX_LINES = 12, MAX_JOBS = 5;
  const DEFAULT = ['filter', 'withColumn', 'count', 'groupBy', 'write'];
  // k: n = narrow, w = wide (shuffle), a = acción
  const OPS = {
    filter:  { k: 'n', code: 'df = df.filter("monto > 100")' },
    select:  { k: 'n', code: 'df = df.select("cliente_id", "monto")' },
    withColumn: { k: 'n', code: 'df = df.withColumn("monto_iva", F.col("monto") * 1.19)' },
    groupBy: { k: 'w', code: 'df = df.groupBy("cliente_id").agg(F.sum("monto").alias("monto"))' },
    join:    { k: 'w', code: 'df = df.join(clientes, "cliente_id")' },
    orderBy: { k: 'w', code: 'df = df.orderBy("monto")' },
    count:   { k: 'a', code: 'df.count()' },
    show:    { k: 'a', code: 'df.show()' },
    collect: { k: 'a', code: 'filas = df.collect()' },
    write:   { k: 'a', code: 'df.write.saveAsTable("salida")' }
  };
  const HEAD = ['from pyspark.sql import functions as F', 'df = spark.read.table("ventas")', 'clientes = spark.read.table("clientes")'];
  const fI = document.getElementById('tr-f'), pI = document.getElementById('tr-p');
  const svg = document.getElementById('tr-svg'), codeEl = document.getElementById('tr-code'), info = document.getElementById('tr-info');
  const playBtn = document.getElementById('tr-play');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let steps = DEFAULT.slice(), app = null, sel = null, nodes = null, timers = [];

  /* ---------- modelo: cada acción crea un job; cada Exchange corta un stage ---------- */
  function build() {
    const files = +fI.value, sp = +pI.value;
    document.getElementById('tr-f-o').textContent = files;
    document.getElementById('tr-p-o').textContent = sp;
    let sid = 0, ntasks = 0;
    const jobs = [];
    steps.forEach((s, i) => {
      if (OPS[s].k !== 'a') return;
      const lin = [];
      steps.slice(0, i).forEach((x, j) => { if (OPS[x].k !== 'a') lin.push({ op: x, line: j }); });
      const stages = [], notes = [];
      // cada paso del stage es la línea de código que lo origina (c) y una nota (d);
      // sin c es trabajo previo de una línea que aparece en el stage siguiente
      const op = (c, d) => ({ c, d });
      const SP = 'una por partición del shuffle (<code>spark.sql.shuffle.partitions</code> = ' + sp + ')';
      // los padres se crean antes que el hijo: así numera Spark los stages
      const open = (ops, tasks, parents, why) => ({ id: sid++, ops, tasks, parents, why, sh: null });
      let cur = open([op('spark.read.table("ventas")')], files, [], `una por partición de lectura de ventas (${files})`);
      // el stage termina escribiendo un shuffle; el siguiente lo lee
      const cut = (sh, next) => { cur.sh = sh; stages.push(cur); cur = next(cur.id); };
      let topk = false;
      lin.forEach((x, n) => {
        const last = n === lin.length - 1;
        // narrow: se queda en el stage actual, con su código sin el "df = df."
        if (OPS[x.op].k === 'n') cur.ops.push(op(OPS[x.op].code.replace(/^df = df\./, '')));
        else if (x.op === 'groupBy') { cur.ops.push(op(null, 'suma parcial por cliente_id en cada partición')); cut('por cliente_id', p => open([op('groupBy("cliente_id")', 'junta las sumas parciales')], sp, [p], SP)); }
        else if (x.op === 'join') {
          cur.sh = 'por cliente_id'; stages.push(cur);
          const a = cur.id, b = open([op('spark.read.table("clientes")')], B_FILES, [], `una por partición de lectura de clientes (${B_FILES})`);
          b.sh = 'por cliente_id'; stages.push(b);
          cur = open([op('join(clientes, "cliente_id")')], sp, [a, b.id], SP);
        }
        else if (x.op === 'orderBy') {
          if (last && s === 'show') { topk = true; cur.ops.push(op('orderBy("monto")', 'las primeras filas de cada partición')); notes.push('<code>orderBy</code> seguido de <code>show()</code> no necesita ordenar toda la tabla: Spark se queda con las primeras filas de cada partición y las junta (operador <code>TakeOrderedAndProject</code>). Puede haber un shuffle pequeño, pero no un orden global.'); }
          else { cut('por rangos de monto', p => open([op('orderBy("monto")', 'ordena cada rango')], sp, [p], SP)); notes.push('Por el <code>orderBy</code>, Spark reparte por rangos, y para decidir los rangos toma una muestra de los datos (la doc lo explica en <code>repartitionByRange</code>). En el Spark UI ese muestreo puede verse como un job corto; la doc no lo dice.'); }
        }
      });
      if (s === 'count') { cur.ops.push(op(null, 'conteo parcial de cada partición')); cut('de los conteos parciales', p => open([op('count()', 'suma los conteos parciales')], 1, [p], '<code>count()</code> no reparte por ninguna clave: este stage suma los conteos parciales con 1 task (ver <a href="#explain">Leer el plan</a>)')); }
      else if (s === 'write') cur.ops.push(op('write.saveAsTable("salida")'));
      else if (s === 'collect') { cur.ops.push(op('collect()', 'manda las filas al driver')); notes.push('<code>collect()</code> trae todas las filas al driver. Con datos grandes, ahí empieza un OOM del driver.'); }
      else if (s === 'show') { cur.ops.push(op('show()', '20 filas por defecto')); if (!topk) { cur.tasks = 1; cur.why = '1 es ilustrativo (ver <a href="arquitectura.html">Arquitectura</a>)'; } }
      stages.push(cur);
      stages.forEach(st => { ntasks += st.tasks; });
      // nivel = cuándo puede correr el stage dentro del job (los que no dependen entre sí, a la vez)
      const lvl = {}; stages.forEach(st => { lvl[st.id] = st.parents.length ? Math.max(...st.parents.map(p => lvl[p])) + 1 : 0; st.lvl = lvl[st.id]; });
      jobs.push({ id: jobs.length, line: i, action: s, lin, stages, notes });
    });
    app = { jobs, files, sp, tasks: ntasks, stages: sid, lazy: steps.filter(s => OPS[s].k !== 'a').length };
    if (!sel || (sel.t === 'job' && !jobs[sel.id]) || (sel.t === 'stage' && sel.id >= sid)) sel = jobs.length ? { t: 'job', id: jobs.length - 1 } : null;
  }

  // el stage como cadena de código: texto plano para el tooltip, HTML para el panel
  const stageText = st => st.ops.map(o => o.c ? o.c + (o.d ? ` (${o.d})` : '') : o.d).join(' › ') + (st.sh ? ` › shuffle ${st.sh}` : '');
  const stageHtml = st => st.ops.map(o => o.c ? `<code>${esc(o.c)}</code>${o.d ? ` (${o.d})` : ''}` : o.d).join(' › ') + (st.sh ? ` › shuffle ${st.sh}` : '');
  const jobOfStage = id => app.jobs.find(j => j.stages.some(s => s.id === id));

  /* ---------- árbol en SVG ---------- */
  function node(cls, x, y, w, h, lines, title) {
    const g = el('g', { class: 'tr-node ' + cls });
    if (title) g.appendChild(el('title', {}, title));
    g.appendChild(el('rect', { x, y, width: w, height: h, rx: 4 }));
    const n = lines.length;
    lines.forEach((ln, i) => g.appendChild(el('text', { x: x + w / 2, y: y + h / 2 + (i - (n - 1) / 2) * 9.5 + 3, 'text-anchor': 'middle', class: ln[1] }, ln[0])));
    return g;
  }
  const edge = (x1, y1, x2, y2) => el('path', { class: 'tr-edge', d: `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}` });
  function clickable(g, fn, label) {
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', label);
    g.addEventListener('click', fn);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }

  function drawTree() {
    svg.textContent = '';
    nodes = { job: {}, stage: {}, tasks: {} };
    const { jobs } = app, RH = 28, TOP = 8;
    const rows = Math.max(app.stages, 3), H = TOP * 2 + rows * RH;
    svg.setAttribute('viewBox', `0 0 360 ${H}`);
    if (!jobs.length) {
      svg.appendChild(el('text', { x: 180, y: H / 2, 'text-anchor': 'middle', class: 'tick' }, 'Sin acciones: nada se ejecuta todavía'));
    }
    const appY = H / 2;
    const gEdges = el('g'), gNodes = el('g');
    svg.appendChild(gEdges); svg.appendChild(gNodes);
    gNodes.appendChild(node('tr-app', 2, appY - 20, 56, 40, [['Spark', 't2'], ['Application', 't2'], ['1 driver', 's']], 'Una aplicación: el driver y sus executors'));
    let r = 0;
    jobs.forEach(j => {
      const ys = j.stages.map((_, k) => TOP + (r + k) * RH + RH / 2);
      const jy = (ys[0] + ys[ys.length - 1]) / 2;
      gEdges.appendChild(edge(58, appY, 72, jy));
      const gj = node('tr-job', 72, jy - 11, 98, 22, [[`Job ${j.id} · ${j.action}()`, 't'], [`plan lógico ${j.id}`, 'pl']], `Job ${j.id}: lo lanza ${OPS[j.action].code}`);
      clickable(gj, () => select({ t: 'job', id: j.id }), `Job ${j.id}`);
      gNodes.appendChild(gj); nodes.job[j.id] = gj;
      j.stages.forEach((st, k) => {
        const y = ys[k];
        gEdges.appendChild(edge(170, jy, 184, y));
        const gs = node('tr-stage', 184, y - 11, 74, 22, [[`Stage ${st.id}`, 't'], [`${st.tasks} task${st.tasks === 1 ? '' : 's'}`, 's']], `Stage ${st.id}: ${stageText(st)}`);
        clickable(gs, () => select({ t: 'stage', id: st.id }), `Stage ${st.id}`);
        gNodes.appendChild(gs); nodes.stage[st.id] = gs;
        const shown = st.tasks <= 5 ? st.tasks : 4, gt = el('g', { class: 'tr-tasks' });
        gEdges.appendChild(el('line', { class: 'tr-edge', x1: 258, y1: y, x2: 270, y2: y }));
        for (let t = 0; t < shown; t++) {
          const g = node('tr-task', 270 + t * 15.5, y - 7, 13, 14, [[t, 'tt']], `Task ${t} de ${st.tasks} del Stage ${st.id}`);
          gt.appendChild(g);
        }
        if (st.tasks > shown) gt.appendChild(el('text', { x: 270 + shown * 15.5 + 1, y: y + 3, class: 's' }, '+' + (st.tasks - shown)));
        gNodes.appendChild(gt); nodes.tasks[st.id] = gt;
      });
      r += j.stages.length;
    });
  }

  /* ---------- código del notebook ---------- */
  function drawCode() {
    const job = sel && (sel.t === 'job' ? app.jobs[sel.id] : jobOfStage(sel.id));
    const on = new Set(job ? [job.line, ...job.lin.map(x => x.line)] : []);
    const usesB = job && job.lin.some(x => x.op === 'join');
    const lastAction = steps.reduce((a, s, i) => OPS[s].k === 'a' ? i : a, -1);
    let html = HEAD.map((l, i) => `<span class="ln${job && (i === 1 || (i === 2 && usesB)) ? ' on' : (job && i ? ' off' : '')}">${esc(l)}</span>`).join('');
    steps.forEach((s, i) => {
      const op = OPS[s], j = op.k === 'a' ? app.jobs.find(x => x.line === i) : null;
      const cls = ['ln', op.k === 'a' ? 'act' : '', job ? (on.has(i) ? 'on' : 'off') : ''].join(' ');
      const cm = j ? `   <span class="c"># acción → Job ${j.id}</span>` : (i > lastAction ? '   <span class="c"># lazy: aún no corre</span>' : '');
      html += `<span class="${cls}"${j ? ` data-job="${j.id}"` : ''}>${esc(op.code)}${cm}</span>`;
    });
    codeEl.innerHTML = html;
    codeEl.querySelectorAll('[data-job]').forEach(s => s.addEventListener('click', () => select({ t: 'job', id: +s.dataset.job })));
  }

  /* ---------- panel de explicación ---------- */
  function drawInfo() {
    document.getElementById('tr-stats').innerHTML =
      `<div><b>${app.jobs.length}</b><span>jobs (acciones)</span></div><div><b>${app.stages}</b><span>stages</span></div><div><b>${app.tasks}</b><span>tasks</span></div><div><b>${app.lazy}</b><span>transformaciones (lazy)</span></div>`;
    if (!sel) { info.innerHTML = 'Hay transformaciones, pero ninguna acción. Spark solo ha anotado el plan: <b>no ha lanzado ningún job</b>. Añade <code>count()</code>, <code>show()</code>, <code>collect()</code> o <code>write</code>.'; return; }
    if (sel.t === 'job') {
      const j = app.jobs[sel.id], ex = j.stages.length - 1;
      let h = `<p><b>Job ${j.id}</b> lo lanza <code>${esc(OPS[j.action].code)}</code>. Su <b>plan lógico</b> sale de las líneas resaltadas del notebook, desde la lectura de ventas hasta la acción. Catalyst lo optimiza, elige un plan físico y el scheduler lo corta en <b>${j.stages.length} stage${j.stages.length > 1 ? 's' : ''}</b>${ex ? `, uno más por cada shuffle (${ex})` : ' porque no hay ningún shuffle'}.</p>`;
      const tot = j.stages.reduce((a, s) => a + s.tasks, 0);
      h += j.stages.length > 1
        ? `<p><b>${tot} tasks</b>, que se suman stage por stage:</p><ul>${j.stages.map(st => `<li><b>${st.tasks}</b> del Stage ${st.id}: ${st.why}</li>`).join('')}</ul>`
        : `<p><b>${tot} task${tot > 1 ? 's' : ''}</b>: ${j.stages[0].why}.</p>`;
      if (j.stages.some(st => st.tasks === app.sp && /shuffle\.partitions/.test(st.why))) h += `<p><code>spark.sql.shuffle.partitions</code> decide en cuántas particiones reparte un shuffle, y cada una es una task del stage que lo lee. Aquí lo eliges tú; el de tu compute está en <a href="#particiones">De dónde sale cada partición</a>.</p>`;
      if (j.id > 0) h += `<p>Igual que el Job 0, empieza leyendo ventas desde cero: un DataFrame es un plan, no datos, así que cada acción vuelve a ejecutar su plan desde la lectura (para guardar un resultado entre acciones, ver <a href="#cache"><code>cache()</code></a>). Si Spark no necesita volver a calcular algún stage, el Spark UI lo muestra como <i>skipped</i> (ver <a href="#skipped">Skipped stages</a>).</p>`;
      j.notes.forEach(n => { h += `<p>${n}</p>`; });
      info.innerHTML = h;
    } else {
      const j = jobOfStage(sel.id), st = j.stages.find(s => s.id === sel.id);
      const part = st.ops.some(o => !o.c), child = j.stages.find(x => x.parents.includes(st.id));
      info.innerHTML = `<p><b>Stage ${st.id}</b> (Job ${j.id}) ejecuta: ${stageHtml(st)}.</p>
        <p><b>${st.tasks} task${st.tasks > 1 ? 's' : ''}</b>: ${st.why}. Las tasks las fija el número de particiones. Los cores deciden cuántas corren a la vez.</p>
        <p>${st.parents.length ? `No empieza hasta que ${st.parents.length > 1 ? 'terminan los Stages ' + st.parents.join(' y ') : 'termina el Stage ' + st.parents[0]}, porque lee su shuffle.` : 'Lee directo de la tabla, así que puede empezar en cuanto arranca el job.'}${st.sh ? ' Termina escribiendo un shuffle: ahí se corta el stage.' : ''}${part && child ? ` El cálculo parcial lo termina el Stage ${child.id} con <code>${esc(child.ops[0].c)}</code>.` : ''}</p>`;
    }
  }

  function paintSel() {
    const job = sel && (sel.t === 'job' ? app.jobs[sel.id] : jobOfStage(sel.id));
    app.jobs.forEach(j => {
      const mine = job && j.id === job.id;
      nodes.job[j.id].classList.toggle('dim', !!job && !mine);
      nodes.job[j.id].classList.toggle('sel', !!sel && sel.t === 'job' && sel.id === j.id);
      j.stages.forEach(s => {
        const off = !!job && (!mine || (sel.t === 'stage' && sel.id !== s.id));
        nodes.stage[s.id].classList.toggle('dim', off);
        nodes.stage[s.id].classList.toggle('sel', !!sel && sel.t === 'stage' && sel.id === s.id);
        nodes.tasks[s.id].classList.toggle('dim', off);
      });
    });
  }

  function select(s) { stop(); sel = s; drawCode(); drawInfo(); paintSel(); }

  /* ---------- reproducir: un job tras otro, cada nivel de stages a la vez ---------- */
  function stop() {
    timers.forEach(clearTimeout); timers = [];
    playBtn.setAttribute('aria-pressed', 'false'); playBtn.textContent = 'Ejecutar el notebook';
    svg.classList.remove('playing');
    svg.querySelectorAll('.run,.done').forEach(n => n.classList.remove('run', 'done'));
  }
  function play() {
    if (playBtn.getAttribute('aria-pressed') === 'true') { stop(); return; }
    stop(); sel = null; drawCode(); paintSel();
    playBtn.setAttribute('aria-pressed', 'true'); playBtn.textContent = 'Detener';
    svg.classList.add('playing');
    const STEP = matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 750;
    let t = 0;
    const at = (fn) => { timers.push(setTimeout(fn, t)); };
    app.jobs.forEach(j => {
      at(() => { nodes.job[j.id].classList.add('run'); info.innerHTML = `<p><b>Job ${j.id}</b> arranca: el driver llegó a <code>${esc(OPS[j.action].code)}</code>.</p>`; });
      const maxL = Math.max(...j.stages.map(s => s.lvl));
      for (let L = 0; L <= maxL; L++) {
        const lv = j.stages.filter(s => s.lvl === L);
        at(() => {
          lv.forEach(s => { nodes.stage[s.id].classList.add('run'); nodes.tasks[s.id].classList.add('run'); });
          info.innerHTML = `<p><b>Job ${j.id}</b> · corriendo ${lv.map(s => `Stage ${s.id} (${s.tasks} task${s.tasks > 1 ? 's' : ''})`).join(' y ')}${lv.length > 1 ? ' a la vez, porque no dependen entre sí' : ''}.</p>`;
        });
        t += STEP;
        at(() => lv.forEach(s => { ['stage', 'tasks'].forEach(k => { nodes[k][s.id].classList.remove('run'); nodes[k][s.id].classList.add('done'); }); }));
      }
      at(() => { nodes.job[j.id].classList.remove('run'); nodes.job[j.id].classList.add('done'); });
      t += STEP / 2;
    });
    at(() => {
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.textContent = 'Ejecutar otra vez';
      info.innerHTML = `<p><b>Notebook terminado.</b> ${app.jobs.length} job${app.jobs.length > 1 ? 's' : ''}, uno tras otro, porque cada celda espera a que su acción termine. Dentro de un job, los stages que no dependen entre sí pueden correr a la vez. Toca un job o un stage para ver su detalle.</p>`;
    });
  }

  /* ---------- controles ---------- */
  function refresh() { stop(); build(); drawTree(); drawCode(); drawInfo(); paintSel(); syncButtons(); }
  function syncButtons() {
    const nJobs = app.jobs.length, full = steps.length >= MAX_LINES;
    document.querySelectorAll('#tr-add button[data-op], #tr-act button[data-op]').forEach(b => { b.disabled = full || (OPS[b.dataset.op].k === 'a' && nJobs >= MAX_JOBS); });
    document.getElementById('tr-undo').disabled = !steps.length;
  }
  document.querySelectorAll('#tr-add button[data-op], #tr-act button[data-op]').forEach(b => b.addEventListener('click', () => {
    steps.push(b.dataset.op); sel = null; refresh();
  }));
  document.getElementById('tr-undo').addEventListener('click', () => { steps.pop(); sel = null; refresh(); });
  document.getElementById('tr-reset').addEventListener('click', () => { steps = DEFAULT.slice(); sel = null; refresh(); });
  playBtn.addEventListener('click', play);
  [fI, pI].forEach(x => x.addEventListener('input', refresh));
  refresh();
  } catch (e) { console.error('Simulador del árbol de ejecución', e); }
})();


/* Cuántos stages tiene cada query: el lector elige una opción, ve solo el comentario de esa
   opción y después destapa el Spark UI (mismo estilo que .guess.q, pero con una pregunta por query) */
(function () {
  const box = document.getElementById('dag-guess');
  if (!box) return;
  try {
    const lab = document.getElementById('dag-lab'), ask = document.getElementById('dag-ask'), optsEl = document.getElementById('dag-opts');
    const fb = document.getElementById('dag-fb'), more = document.getElementById('dag-show');
    const body = box.querySelector('.guess-body');
    // por query: las tres primeras son ejemplos resueltos (sin `ans`: muestran el resultado y `look`);
    // bhj y aggsort son preguntas con la letra correcta y [letra, opción, comentario]; cada error es un modelo roto
    const Q = {
      narrow: { q: '<code>filter</code> + <code>select</code> y <code>write</code> sobre <code>ventas</code>.', look: 'No hay ningún <code>Exchange</code>: un stage de 80 tasks.' },
      agg: { q: '<code>groupBy("cliente_id").count()</code> y <code>write</code> sobre <code>ventas</code>.', look: 'El stage que lee el shuffle tiene 200 tasks, no 80.' },
      smj: { q: 'Join sort-merge de <code>ventas</code> y <code>clientes</code>, y <code>write</code>.', look: 'Dos stages que leen tablas y uno que lee los dos shuffles.' },
      bhj: { q: 'Join broadcast con <code>clientes_vip</code> (una tabla pequeña) y <code>write</code>: ¿cuántos stages ejecuta la query, sumando sus jobs?', ans: 'b', o: [
        ['a', '1 stage: sin shuffle, todo va junto.', 'Suponías que sin <code>Exchange</code> de shuffle todo cabe en un stage; falla porque <code>clientes_vip</code> también hay que leerla. Se lee en su propio stage, que termina en el <code>BroadcastExchange</code>. Ese stage cuenta aunque salga en otro job.'],
        ['b', '2 stages: uno por cada tabla.', 'Un stage lee <code>clientes_vip</code> y la copia entera a cada executor (<code>BroadcastExchange</code>). Otro lee <code>ventas</code> y hace el join con su copia, sin shuffle. El de <code>ventas</code> espera a que la copia esté lista. El stage del broadcast puede salir en otro job: por eso la pregunta suma los jobs de la query.'],
        ['c', '3 stages, como en el sort-merge.', 'Suponías que todo join reparte las dos tablas por la clave; falla porque con broadcast <code>ventas</code> no se mueve. No hay <code>Exchange</code> de shuffle ni un stage aparte para el join: cada task de <code>ventas</code> hace el join con su copia de <code>clientes_vip</code>.']] },
      aggsort: { q: '<code>groupBy</code> + <code>orderBy</code> y <code>write</code>. Sin contar lo que pueda unir AQE, ¿cuántas tasks tiene el stage que ordena, y cómo queda ordenada la tabla entera?', ans: 'c', o: [
        ['a', '1 task: un orden global necesita juntar todas las filas en ella.', 'Suponías que ordenar todo exige un único sitio; falla porque Spark reparte las filas por rangos de <code>count</code> con otro shuffle, y cada task ordena su rango. Los rangos ya van en orden entre sí.'],
        ['b', '200 tasks ordenan su parte y el driver junta los trozos al final.', 'Suponías que el driver remata el orden; falla porque el <code>write</code> lo hacen las tasks en los executors. No hace falta un paso final en el driver.'],
        ['c', '200 tasks: cada una ordena un rango de <code>count</code>, y los rangos van en orden.', 'El <code>orderBy</code> global vuelve a repartir las filas, esta vez por rangos de <code>count</code>, en <code>shuffle.partitions</code> particiones (200 aquí). Cada task ordena su rango, y como los rangos van en orden, la tabla queda ordenada entera.'],
        ['d', '80 tasks, las mismas que leyeron <code>ventas</code>.', 'Suponías que las tasks de lectura siguen después del shuffle; falla porque tras el <code>groupBy</code> y el <code>orderBy</code> cada stage lee un shuffle, y tiene una task por partición de ese shuffle.']] }
    };
    function load(k) {
      const q = Q[k]; if (!q) return;
      const solved = !q.ans;
      lab.textContent = solved ? 'Ejemplo resuelto:' : 'Predice:';
      ask.innerHTML = q.q;
      optsEl.textContent = '';
      optsEl.hidden = solved;
      more.hidden = true;
      // mismo aspecto que .guess.q de app.js: el comentario vuelve a su sitio y el raíl a neutro
      optsEl.after(fb); box.classList.remove('answered', 'is-ok', 'is-no');
      if (solved) {
        // sin pregunta: el resultado se ve directamente, con una línea sobre qué mirar
        fb.innerHTML = `<p><b>Qué mirar:</b> ${q.look}</p>`; fb.hidden = false;
        body.hidden = false; body.inert = false;
        return;
      }
      fb.hidden = true; fb.innerHTML = '';
      body.hidden = true; body.inert = true;
      const btns = q.o.map(([l, txt, why]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.opt = l; b.setAttribute('aria-pressed', 'false');
        b.innerHTML = `<span class="guess-key" aria-hidden="true">${l}</span><span>${txt}</span>`;
        b.setAttribute('aria-label', `${l}) ${b.textContent.slice(1).trim()}`);
        b.addEventListener('click', () => {
          btns.forEach(x => { const me = x === b; x.setAttribute('aria-pressed', me); x.classList.toggle('ok', me && l === q.ans); x.classList.toggle('no', me && l !== q.ans); });
          fb.innerHTML = `<p><b>${l === q.ans ? 'Sí' : 'No'}.</b> ${why}</p>`; fb.hidden = false; b.after(fb);
          box.classList.add('answered'); box.classList.toggle('is-ok', l === q.ans); box.classList.toggle('is-no', l !== q.ans);
          if (body.hidden) more.hidden = false;
        });
        optsEl.appendChild(b); return b;
      });
    }
    more.addEventListener('click', () => { body.hidden = false; body.inert = false; more.hidden = true; });
    box.addEventListener('keydown', e => { if (e.altKey || e.ctrlKey || e.metaKey || !e.target.closest('#dag-opts')) return;
      const b = optsEl.querySelector(`[data-opt="${e.key.toLowerCase()}"]`); if (b) { e.preventDefault(); b.focus(); b.click(); } });
    // cada query nueva vuelve a taparse, para pensarla antes de verla
    document.querySelectorAll('#dag-q [data-q]').forEach(b => b.addEventListener('click', () => load(b.dataset.q)));
    const on = document.querySelector('#dag-q [aria-pressed="true"]');
    load(on ? on.dataset.q : 'narrow');
  } catch (e) { console.error('Predicción del simulador de stages', e); }
})();
