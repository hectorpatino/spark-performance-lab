/* Arquitectura: qué parte del compute trabaja con cada línea del notebook */
(function () {
  if (!document.getElementById('ar-q')) return;
  try {
  const WORKERS = 3, CORES = 4;
  // parts: piezas del driver que trabajan; exec: si trabajan los executors;
  // mem: cuánto llena la memoria del driver (0-100) y su nivel
  const L = {
    py: { code: 'total = 2 + 2\nprint(total)', parts: ['py'], exec: false, jobs: '0', back: '—', mem: 2, lvl: 'ok',
      info: '<b>Solo el driver.</b> Es Python sin Spark: el nodo driver interpreta cada comando del notebook, y este no lanza ningún job. Los workers no se enteran.' },
    read: { code: 'df = spark.read.table("ventas")', parts: ['plan'], exec: false, jobs: '0', back: '—', mem: 2, lvl: 'ok',
      info: '<b>El driver anota el plan.</b> Leer una tabla devuelve un DataFrame sin leer los datos. Los executors siguen sin trabajo hasta que llegue una acción.' },
    filter: { code: 'df = df.filter("monto > 100")', parts: ['plan'], exec: false, jobs: '0', back: '—', mem: 2, lvl: 'ok',
      info: '<b>Tampoco corre nada.</b> <code>filter</code> es una transformación: el driver añade un paso al plan. Puedes encadenar muchas y los executors no hacen nada hasta la acción.' },
    count: { code: 'df.count()', parts: ['plan', 'sched'], exec: true, jobs: '1 o más', back: '1 número', mem: 3, lvl: 'ok',
      info: '<b>Ahora trabajan todos.</b> <code>count()</code> es una acción. El driver optimiza el plan y el scheduler lo divide en stages y tasks. Cada task corre en un core de un executor: lee su partición, filtra y cuenta. Al driver solo vuelve un número.' },
    show: { code: 'df.show()', parts: ['plan', 'sched'], exec: true, jobs: '1 o más', back: '20 filas', mem: 4, lvl: 'ok',
      info: '<b>Trabajo pequeño, resultado pequeño.</b> <code>show()</code> muestra 20 filas por defecto. Spark lee primero una partición y solo pide más si no le alcanzan. Al driver vuelven esas filas.' },
    write: { code: 'df.write.saveAsTable("salida")', parts: ['plan', 'sched'], exec: true, jobs: '1 o más', back: 'Ninguna fila', mem: 3, lvl: 'ok',
      info: '<b>Las filas se quedan en los executors.</b> Cada task escribe sus archivos en el almacenamiento. Al driver no vuelve ninguna fila.' },
    collect: { code: 'filas = df.collect()', parts: ['plan', 'sched'], exec: true, jobs: '1 o más', back: 'Todas las filas', mem: 96, lvl: 'bad',
      info: '<b>Todo el resultado viaja al driver.</b> Los executors calculan en paralelo, pero todas las filas acaban en la memoria de una sola máquina. La doc de PySpark avisa que solo se use si el resultado es pequeño. Con datos grandes, aquí empieza un OOM del driver. Más workers no ayudan: el límite es el driver.' },
    pandas: { code: 'pdf = df.toPandas()\npdf.groupby("cliente_id").sum()', parts: ['plan', 'sched', 'py'], exec: true, jobs: '1 o más', back: 'Todas las filas', mem: 96, lvl: 'bad',
      info: '<b>Igual que <code>collect()</code>, y después solo el driver.</b> <code>toPandas()</code> trae todas las filas a la memoria del driver. La segunda línea es pandas, o sea Python normal: corre en el driver, sin executors.' }
  };

  const box = document.getElementById('ar-workers');
  box.innerHTML = Array.from({ length: WORKERS }, (_, w) =>
    `<div class="ar-node ar-exec"><h4>Worker ${w + 1} <span>1 executor · ${CORES} cores</span></h4><div class="ar-cores">${'<i></i>'.repeat(CORES)}</div></div>`).join('');

  function draw(k) {
    const l = L[k];
    document.getElementById('ar-code').textContent = l.code;
    const drv = document.getElementById('ar-driver');
    drv.classList.add('on');
    drv.querySelectorAll('[data-p]').forEach(li => li.classList.toggle('on', l.parts.includes(li.dataset.p)));
    box.querySelectorAll('.ar-exec').forEach(n => { n.classList.toggle('on', l.exec); n.classList.toggle('idle', !l.exec); });
    document.getElementById('ar-down').classList.toggle('on', l.exec);
    const up = document.getElementById('ar-up');
    up.classList.toggle('on', l.exec); up.classList.toggle('bad', l.lvl === 'bad');
    up.textContent = (l.exec ? l.back.toLowerCase() : 'resultado');
    const mem = document.getElementById('ar-mem');
    mem.style.width = l.mem + '%'; mem.className = l.lvl;
    document.getElementById('ar-stats').innerHTML =
      `<div><b>${l.jobs}</b><span>jobs de Spark</span></div><div><b>${l.exec ? 'Sí' : 'No'}</b><span>trabajan los executors</span></div><div><b>${l.back}</b><span>vuelve al driver</span></div>`;
    document.getElementById('ar-info').innerHTML = `<p>${l.info}</p>`;
  }

  const q = document.getElementById('ar-q');
  q.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => {
    q.querySelectorAll('[data-l]').forEach(x => x.setAttribute('aria-pressed', x === b));
    draw(b.dataset.l);
  }));
  draw('py');
  } catch (e) { console.error('Simulador de arquitectura', e); }
})();
