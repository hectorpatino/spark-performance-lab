/* Repaso de Fundamentos: recreaciones del Spark UI del ejercicio "De Fundamentos a tu job".
   Siguen la cadena del stage lento a la línea: lista de stages, página del Stage 20, página del
   Job 13 y DAG de la Query 2. El compute ya había corrido otras celdas, así que los stages
   empiezan en 12 y los jobs en 5. Los números son ilustrativos. */
(function () {
  if (!window.SPL) return;
  const { UI } = window.SPL;
  const KiB = 1024, MiB = 1024 * KiB, GiB = 1024 * MiB;
  // Duración con el formato del Spark UI: segundos enteros o minutos con un decimal
  const sdur = s => s < 60 ? Math.round(s) + ' s' : (s / 60).toFixed(1) + ' min';
  const prog = n => `<span class="rf-prog"><span style="width:100%"></span><em>${n}/${n}</em></span>`;
  // Texto que en la UI real es un enlace
  const link = t => `<span class="rf-a">${t}</span>`;
  const DESC = 'saveAsTable at NativeMethodAccessorImpl.java:0';

  /* ---------- lista de stages (pestaña Stages) ---------- */
  if (document.getElementById('rf-stages')) { try {
    const box = document.getElementById('rf-stages');
    // Celda 2: Stage 12 · celda 3: Stages 13-15 · celda 4: Stages 16-21 (el lector no lo sabe)
    // d: duración (s) · n: tasks · inB: Input · srB: Shuffle Read · swB: Shuffle Write
    const STAGES = [
      { id: 12, d: 138, n: 960, inB: 120 * GiB },
      { id: 13, d: 18, n: 48, inB: 6 * GiB, swB: 2.1 * GiB },
      { id: 14, d: 174, n: 960, inB: 120 * GiB, swB: 41.3 * GiB },
      { id: 15, d: 205, n: 200, srB: 43.4 * GiB },
      { id: 16, d: 18, n: 48, inB: 6 * GiB, swB: 2.1 * GiB },
      { id: 17, d: 174, n: 960, inB: 120 * GiB, swB: 41.3 * GiB },
      { id: 18, d: 1, n: 2, inB: 8 * MiB, swB: 6.2 * MiB },
      { id: 19, d: 190, n: 200, srB: 43.4 * GiB, swB: 43.1 * GiB },
      { id: 20, d: 576, n: 200, srB: 43.1 * GiB + 6.2 * MiB, swB: 210 * KiB },
      { id: 21, d: 1, n: 1, srB: 210 * KiB }
    ];
    let byDur = false;
    const cell = b => b ? UI.bytes(b) : '';
    const head = (key, label, on) =>
      `<th aria-sort="${on ? 'descending' : 'none'}"><button type="button" class="rf-sort" data-sort="${key}">${label}${on ? ' ▾' : ''}</button></th>`;
    function draw() {
      const rows = STAGES.slice().sort(byDur ? (a, b) => b.d - a.d : (a, b) => b.id - a.id);
      box.innerHTML = UI.frame('Stages',
        `<h5>Stages for All Jobs</h5><ul class="ui-kv"><li><b>Completed Stages:</b> ${STAGES.length}</li></ul>` +
        `<h6>Completed Stages (${STAGES.length})</h6><table class="ui-tbl"><thead><tr>` +
        head('id', 'Stage Id', !byDur) + '<th>Description</th>' + head('dur', 'Duration', byDur) +
        '<th>Tasks: Succeeded/Total</th><th>Input</th><th>Shuffle Read</th><th>Shuffle Write</th></tr></thead><tbody>' +
        rows.map(s => `<tr><td>${s.id}</td><td class="rf-desc">${DESC}</td><td>${sdur(s.d)}</td><td>${prog(s.n)}</td><td>${cell(s.inB)}</td><td>${cell(s.srB)}</td><td>${cell(s.swB)}</td></tr>`).join('') +
        '</tbody></table>',
        'Recreación ilustrativa de la pestaña Stages, con los stages de todas las celdas y solo las columnas que usa el ejercicio (la real trae también Submitted y Output). Pulsa Stage Id o Duration para ordenar. Los números son inventados.');
    }
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-sort]'); if (!b) return;
      byDur = b.dataset.sort === 'dur'; draw();
      const again = box.querySelector(`[data-sort="${b.dataset.sort}"]`); if (again) again.focus();
    });
    draw();
  } catch (e) { console.error('repaso: lista de stages', e); } }

  /* ---------- página del Stage 20 ---------- */
  if (document.getElementById('rf-stage')) { try {
    // Cuantiles ya calculados: Min, 25th percentile, Median, 75th percentile, Max
    const dur = [19, 24, 26, 28, 564];
    const srB = [150.2 * MiB, 168 * MiB, 175 * MiB, 183 * MiB, 9.1 * GiB];
    const srR = [14700000, 16500000, 17100000, 17900000, 913000000];
    const spM = [0, 0, 0, 0, 21.6 * GiB];
    const spD = [0, 0, 0, 0, 6.8 * GiB];
    // Sin resaltar el Max: la pregunta E4 pide encontrarlo
    const row = (name, vals) => `<tr><td>${name}</td>${vals.map(v => `<td>${v}</td>`).join('')}</tr>`;
    const body =
      `<h5>Details for Stage 20 (Attempt 0)</h5><ul class="ui-kv">` +
      `<li><b>Total Time Across All Tasks:</b> 1.6 h</li>` +
      `<li><b>Shuffle Read Size / Records:</b> ${UI.bytes(43.1 * GiB + 6.2 * MiB)} / ${UI.rec(4310000000)}</li>` +
      `<li><b>Spill (Memory):</b> ${UI.bytes(21.6 * GiB)}</li><li><b>Spill (Disk):</b> ${UI.bytes(6.8 * GiB)}</li>` +
      `<li><b>Associated Job Ids:</b> ${link('13')}</li></ul>` +
      `<div class="ui-link">DAG Visualization</div><div class="dv"><div class="dv-stage"><div class="lbl">Stage 20</div>` +
      `<div class="dv-scope">Exchange</div><div class="dv-scope">WholeStageCodegen (5)</div><div class="dv-scope">Exchange</div></div></div>` +
      `<div class="ui-link">Event Timeline</div>` +
      `<h6>Summary Metrics for 200 Completed Tasks</h6><table class="ui-tbl"><thead><tr><th>Metric</th><th>Min</th><th>25th percentile</th><th>Median</th><th>75th percentile</th><th>Max</th></tr></thead><tbody>` +
      row('Duration', dur.map(sdur)) +
      row('Shuffle Read Size / Records', srB.map((b, i) => UI.bytes(b) + ' / ' + UI.rec(srR[i]))) +
      row('Spill (memory)', spM.map(UI.bytes)) +
      row('Spill (disk)', spD.map(UI.bytes)) +
      '</tbody></table>';
    document.getElementById('rf-stage').innerHTML = UI.frame('Stages', body,
      'Recreación ilustrativa de la página del Stage 20. El DAG del stage está simplificado. Las filas de spill solo salen cuando el stage tiene spill. Los números son inventados.');
  } catch (e) { console.error('repaso: página del Stage 20', e); } }

  /* ---------- página del Job 13 ---------- */
  if (document.getElementById('rf-job')) { try {
    const body =
      `<h5>Details for Job 13</h5><ul class="ui-kv">` +
      `<li><b>Status:</b> SUCCEEDED</li>` +
      `<li><b>Associated SQL Query:</b> ${link('2')}</li>` +
      `<li><b>Completed Stages:</b> 1</li></ul>` +
      `<div class="ui-link">Event Timeline</div><div class="ui-link">DAG Visualization</div>` +
      `<h6>Completed Stages (1)</h6><table class="ui-tbl"><thead><tr><th>Stage Id</th><th>Description</th><th>Duration</th><th>Tasks: Succeeded/Total</th></tr></thead><tbody>` +
      `<tr><td>20</td><td class="rf-desc">${DESC}</td><td>${sdur(576)}</td><td>${prog(200)}</td></tr></tbody></table>`;
    document.getElementById('rf-job').innerHTML = UI.frame('Jobs', body,
      'Recreación ilustrativa de la página del Job 13, con solo lo que usa el ejercicio. Cómo reparte Spark los stages de una query entre jobs no lo detalla la doc: aquí el Job 13 ejecuta solo el Stage 20.');
  } catch (e) { console.error('repaso: página del Job 13', e); } }

  /* ---------- DAG de la Query 2 (pestaña SQL / DataFrame) ---------- */
  if (document.getElementById('rf-query')) { try {
    const scan = t => `<div class="sq-n"><b>Scan parquet ${t}</b></div>`;
    // La clave del Exchange sale en el detalle del nodo y en Details; aquí va a la vista
    const ex = k => `<div class="sq-n ex"><b>Exchange</b><div class="rf-key">hashpartitioning(${k}, 200)</div></div>`;
    const block = (cg, h, stage, nodes) =>
      `<div class="sq-cl"><div class="lbl">WholeStageCodegen (${cg})<br>duration: total ${h} · stage ${stage}</div>${nodes}</div>`;
    const node = (n, extra) => `<div class="sq-n"><b>${n}</b>${extra ? `<div>${extra}</div>` : ''}</div>`;
    const merge = '<div class="rf-merge" aria-hidden="true"></div>';
    const dag =
      `<div class="sq rf-dag">` +
        `<div class="rf-cols">` +
          `<div class="sq">${scan('productos')}${ex('producto_id')}</div>` +
          `<div class="sq">` +
            `<div class="rf-cols"><div class="sq">${scan('ventas')}${ex('cliente_id')}</div><div class="sq">${scan('clientes')}${ex('cliente_id')}</div></div>` +
            merge +
            block(4, '1.5 h', 19, node('SortMergeJoin')) +
            ex('producto_id') +
          `</div>` +
        `</div>` +
        merge +
        block(5, '1.6 h', 20, node('SortMergeJoin') + node('HashAggregate', 'parcial')) +
        ex('categoria, segmento') +
        node('AQEShuffleRead', 'coalesced') +
        block(6, '1 s', 21, node('HashAggregate', 'final')) +
        node('WriteFiles') +
      `</div>`;
    const body =
      `<h5>Details for Query 2</h5><ul class="ui-kv">` +
      `<li><b>Description:</b> ${DESC}</li>` +
      `<li><b>Duration:</b> 16 min</li>` +
      `<li><b>Succeeded Jobs:</b> ${[9, 10, 11, 12, 13, 14].map(link).join(' ')}</li></ul>` +
      dag + `<div class="ui-link">Details</div>`;
    document.getElementById('rf-query').innerHTML = UI.frame('SQL / DataFrame', body,
      'Recreación simplificada del DAG de la query: el real tiene más nodos (por ejemplo, un Sort antes de cada SortMergeJoin) y métricas en cada nodo. La clave de cada Exchange, que aquí ves en el nodo, en la UI real está en el detalle del nodo y en Details. El formato con que un bloque muestra su stage cambia según la versión.');
  } catch (e) { console.error('repaso: DAG de la query', e); } }
})();
