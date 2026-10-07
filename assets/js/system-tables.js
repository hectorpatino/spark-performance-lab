/* Monitoreo con system tables
   1) Explorador: recreación del SQL editor con resultados y visualización ilustrativos.
   2) Simulador de alerta: umbral, horario y modo de notificación sobre 30 días de valores inventados. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, txt) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function nice4(v) { if (v <= 0) return 4; var st = v / 4, p = Math.pow(10, Math.floor(Math.log10(st))), m = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]; for (var i = 0; i < m.length; i++) { if (m[i] * p >= st) return m[i] * p * 4; } return 40 * p; }
  function fmtTick(v) { return v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : (Math.round(v * 10) / 10).toString(); }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function day(i, base) { var d = new Date(Date.UTC(2026, 8, base || 7) + i * 864e5); return d; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function lab(d) { return d.getUTCDate() + ' ' + MES[d.getUTCMonth()]; }

  /* ---------- resaltado SQL mínimo ---------- */
  var KW = 'SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|INNER|FULL|OUTER|GROUP|BY|ORDER|HAVING|LIMIT|WITH|QUALIFY|OVER|PARTITION|DESC|ASC|INTERVAL|DAY|DAYS|CASE|WHEN|THEN|ELSE|END|DISTINCT|USING|ALL|CAST|LONG|EXISTS|TRUE|FALSE';
  var RE = new RegExp('(--[^\\n]*)|(\'[^\']*\'|"[^"]*")|\\b(' + KW + ')\\b|\\b(\\d+(?:\\.\\d+)?)\\b', 'gi');
  function hl(sql) {
    var out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(sql))) {
      out += esc(sql.slice(last, m.index));
      var cls = m[1] ? 'cm' : m[2] ? 'str' : m[3] ? 'kw' : 'num';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = RE.lastIndex;
    }
    return out + esc(sql.slice(last));
  }

  /* ---------- 1. explorador ---------- */
  var exp = document.getElementById('st-exp');
  if (exp) { try {
    var R = rng(20261007);
    var jit = function (v, f) { return v * (1 + (R() * 2 - 1) * f); };
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    var r1 = function (v) { return Math.round(v * 10) / 10; };
    var WS = '7340912288165540';

    // coste diario por producto (14 días hasta el 6 oct)
    var cdRows = [], cdSeries = { JOBS: [], SQL: [], ALL_PURPOSE: [] }, cdX = [];
    for (var i = 0; i < 14; i++) {
      var d = day(i, 23), dow = d.getUTCDay(), we = (dow === 0 || dow === 6);
      var last = (i === 13) ? 0.55 : 1;
      var v = {
        JOBS: r2(jit(we ? 540 : 640, 0.08) * last),
        SQL: r2(jit(we ? 120 : 390, 0.12) * last),
        ALL_PURPOSE: r2(((i === 10 || i === 11) ? jit(600, 0.04) : jit(we ? 40 : 150, 0.15)) * last)
      };
      cdX.push(lab(d));
      Object.keys(v).sort(function (a, b) { return v[b] - v[a]; }).forEach(function (p) { cdRows.push([iso(d), p, v[p]]); });
      Object.keys(cdSeries).forEach(function (p) { cdSeries[p].push(v[p]); });
    }
    // cola del warehouse (14 días)
    var qcRows = [], qcX = [], qcMed = [], qcP95 = [];
    for (i = 0; i < 14; i++) {
      d = day(i, 23); dow = d.getUTCDay();
      var mon = dow === 1, wk = (dow === 0 || dow === 6);
      var n = Math.round(jit(wk ? 900 : 4200, 0.1) * (mon ? 1.5 : 1));
      var med = r1(mon ? jit(6.5, 0.15) : jit(wk ? 0.1 : 0.9, 0.3));
      var p95 = r1(mon ? jit(41, 0.12) : jit(wk ? 0.4 : 4.5, 0.3));
      qcRows.push([iso(d), n, med, p95, r1(jit(wk ? 3.1 : 1.2, 0.3)), r1(mon ? jit(68, 0.1) : jit(24, 0.15))]);
      qcX.push(lab(d)); qcMed.push(med); qcP95.push(p95);
    }
    // runs por estado (14 días)
    var rfRows = [], rfX = [], rfS = { FAILED: [], TIMED_OUT: [], CANCELLED: [] };
    var spikes = { 4: [5, 1, 0], 5: [3, 0, 1], 11: [1, 3, 0] };
    for (i = 0; i < 14; i++) {
      d = day(i, 23);
      var sp = spikes[i] || [R() < 0.5 ? 1 : 0, 0, R() < 0.25 ? 1 : 0];
      var ok = Math.round(jit(46, 0.06));
      rfRows.push([WS, iso(d), 'SUCCEEDED', ok]);
      if (sp[0]) rfRows.push([WS, iso(d), 'FAILED', sp[0]]);
      if (sp[1]) rfRows.push([WS, iso(d), 'TIMED_OUT', sp[1]]);
      if (sp[2]) rfRows.push([WS, iso(d), 'CANCELLED', sp[2]]);
      rfX.push(lab(d)); rfS.FAILED.push(sp[0]); rfS.TIMED_OUT.push(sp[1]); rfS.CANCELLED.push(sp[2]);
    }

    var Q = {
      'q-coste-job': {
        tab: 'coste_por_job_30d', t: '4.1 s',
        cols: [['workspace_id', 's'], ['job_id', 's'], ['job_name', 's'], ['dbus', 'n'], ['usd_lista', 'n']],
        rows: [
          [WS, '418820133097', 'ingesta_ventas_horaria', 9820.5, 2946.15],
          [WS, '902117455310', 'merge_clientes_silver', 6410.2, 2243.57],
          [WS, '233409871162', 'backfill_inventario', 3995.0, 1198.50],
          [WS, '771203348820', 'gold_kpis_diarios', 2150.7, 752.75],
          [WS, '560098127734', 'optimize_manual_tablas', 1480.3, 444.09],
          [WS, '118734520091', 'features_ml_semanal', 960.1, 336.04],
          [WS, '664410298813', 'export_reportes', 410.8, 123.24],
          [WS, '305567120984', 'dq_checks', 120.4, 42.14]
        ],
        chart: { type: 'hbar', x: 'job_name', y: ['usd_lista'], title: 'Bar · usd_lista por job_name' },
        read: '<div><span class="pill bad">Concentración</span>Los dos primeros jobs suman el 64 % del gasto a precio de lista. Ahí está el ahorro.</div><div><span class="pill ok">Pista</span><b>optimize_manual_tablas</b> sobra si esas tablas son managed de Unity Catalog con predictive optimization activado.</div><div class="c">Precio de lista, no tu factura. Los jobs en clusters all-purpose no salen aquí.</div>'
      },
      'q-coste-dia': {
        tab: 'coste_diario_producto', t: '6.7 s',
        cols: [['usage_date', 'd'], ['billing_origin_product', 's'], ['usd_lista', 'n']],
        rows: cdRows,
        chart: { type: 'line', xs: cdX, series: cdSeries, title: 'Line · usd_lista por usage_date, agrupado por billing_origin_product' },
        read: '<div><span class="pill bad">Pico</span>ALL_PURPOSE salta de unos 40 USD a unos 600 USD el 3 y el 4 de octubre, un fin de semana. Patrón típico de un cluster interactivo encendido sin uso.</div><div><span class="pill ok">Siguiente paso</span>Busca en <code>system.compute.clusters</code> (última fila) los clusters con <code>cluster_source</code> UI o API y su <code>auto_termination_minutes</code>.</div><div class="c">El 6 de octubre se ve bajo en todo: faltan registros, llegan hasta 12 h después.</div>'
      },
      'q-spill': {
        tab: 'queries_con_spill_7d', t: '2.3 s',
        cols: [['statement_id', 's'], ['executed_by', 's'], ['warehouse_id', 's'], ['spill_gb', 'n'], ['read_gb', 'n'], ['duracion_s', 'n'], ['start_time', 'd'], ['statement_text', 't']],
        rows: [
          ['01f0a3c2-77e1-1b6d-9c41-5e0d2f8a1b3c', 'ana@empresa.com', 'ec58ee3772e8d305', 48.20, 212.4, 1384.2, '2026-10-05 08:14:22', 'SELECT c.region, p.categoria, sum(v.monto) FROM ventas v JOIN clientes c ON ...'],
          ['01f0a1b9-0c3e-1f7a-8d22-9a7b6c5d4e3f', 'svc-bi@empresa.com', 'ec58ee3772e8d305', 31.70, 96.0, 802.6, '2026-10-02 07:02:10', 'WITH base AS (SELECT * FROM pedidos WHERE ...) SELECT ... ROW_NUMBER() OVER ...'],
          ['01f09fd4-5a6b-1c2d-b3e4-f5a6b7c8d9e0', 'luis@empresa.com', 'ec58ee3772e8d305', 12.40, 58.3, 310.9, '2026-10-01 15:40:51', 'SELECT DISTINCT cliente_id, producto_id FROM eventos_web ...'],
          ['01f09e11-2b3c-1d4e-a5f6-a7b8c9d0e1f2', 'svc-bi@empresa.com', '9a1f0e3c55b2d671', 6.10, 41.7, 122.4, '2026-09-30 06:30:03', 'SELECT * FROM gold.kpis k JOIN dim_fecha f ON ...'],
          ['01f09c7a-9d8e-1f0a-b1c2-d3e4f5a6b7c8', 'ana@empresa.com', 'ec58ee3772e8d305', 2.30, 18.2, 64.0, '2026-09-29 11:12:45', 'SELECT region, percentile(monto, 0.5) FROM ventas GROUP BY region'],
          ['01f09b02-4e5f-1a6b-c7d8-e9f0a1b2c3d4', 'marta@empresa.com', '9a1f0e3c55b2d671', 0.80, 9.6, 21.3, '2026-09-29 09:01:17', 'SELECT ... ORDER BY fecha_evento LIMIT 100000']
        ],
        chart: { type: 'hbar', x: 'statement_id', y: ['spill_gb'], short: true, hot: function (r) { return r[3] > 10; }, title: 'Bar · spill_gb por statement_id' },
        read: '<div><span class="pill bad">Spill</span>Tres queries pasan de 10 GB a disco, dos de ellas en el mismo warehouse.</div><div><span class="pill ok">Siguiente paso</span>Para un warehouse la doc propone subir el tamaño o optimizar la query. Copia el <code>statement_id</code>, búscalo en Query History y abre el query profile.</div>'
      },
      'q-poda': {
        tab: 'poda_de_archivos_7d', t: '2.9 s',
        cols: [['statement_id', 's'], ['executed_by', 's'], ['read_files', 'n'], ['pruned_files', 'n'], ['pct_podado', 'n'], ['leidos_gb', 'n'], ['duracion_s', 'n'], ['statement_text', 't']],
        rows: [
          ['01f0a2e8-1a2b-1c3d-8e4f-5a6b7c8d9e0f', 'svc-bi@empresa.com', 4812, 0, 0.0, 612.3, 402.7, 'SELECT ... FROM eventos WHERE cliente_id = 4217'],
          ['01f0a0c4-3c4d-1e5f-9a6b-7c8d9e0f1a2b', 'ana@empresa.com', 3990, 85, 2.1, 498.0, 355.1, 'SELECT ... FROM ventas WHERE producto_id IN (...)'],
          ['01f09f77-5e6f-1a7b-8c9d-0e1f2a3b4c5d', 'luis@empresa.com', 2210, 126, 5.4, 280.9, 190.4, 'SELECT ... FROM pedidos WHERE upper(pais) = \'CO\''],
          ['01f09e3a-7a8b-1c9d-0e1f-2a3b4c5d6e7f', 'svc-bi@empresa.com', 1340, 822, 38.0, 170.2, 61.8, 'SELECT ... FROM ventas WHERE fecha >= date_sub(current_date(), 90)'],
          ['01f09d15-9c0d-1e1f-2a3b-4c5d6e7f8a9b', 'marta@empresa.com', 410, 1028, 71.5, 52.4, 14.2, 'SELECT ... FROM ventas WHERE fecha = current_date() - 1'],
          ['01f09c90-1e2f-1a3b-4c5d-6e7f8a9b0c1d', 'ana@empresa.com', 61, 1850, 96.8, 11.7, 3.9, 'SELECT ... FROM eventos WHERE fecha = \'2026-10-01\' AND cliente_id = 88']
        ],
        chart: { type: 'hbar', x: 'statement_id', y: ['pct_podado'], short: true, max: 100, hot: function (r) { return r[4] < 10; }, title: 'Bar · pct_podado por statement_id' },
        read: '<div><span class="pill bad">Sin poda</span>Las tres primeras leen cientos de GB y descartan menos del 10 % de los archivos. El filtro por <code>cliente_id</code> o <code>producto_id</code> no coincide con el layout de la tabla.</div><div><span class="pill ok">Siguiente paso</span>Si esas columnas son filtros frecuentes, son candidatas a clustering keys. Ojo con <code>upper(pais)</code>: una función sobre la columna puede impedir el data skipping.</div>'
      },
      'q-cola': {
        tab: 'cola_warehouse_30d', t: '3.4 s',
        cols: [['dia', 'd'], ['queries', 'n'], ['cola_media_s', 'n'], ['cola_p95_s', 'n'], ['arranque_medio_s', 'n'], ['duracion_p95_s', 'n']],
        rows: qcRows,
        chart: { type: 'line', xs: qcX, series: { cola_media_s: qcMed, cola_p95_s: qcP95 }, title: 'Line · cola_media_s y cola_p95_s por dia' },
        read: '<div><span class="pill bad">Cola los lunes</span>La p95 de cola salta a unos 40 s cada lunes, con 50 % más queries. El resto de días es casi cero.</div><div><span class="pill ok">Siguiente paso</span>Es falta de capacidad en el pico: la doc recomienda subir max clusters del warehouse, no su tamaño.</div><div class="c">La duración p95 también sube el lunes, pero en buena parte por la espera.</div>'
      },
      'q-nodos': {
        tab: 'uso_nodos_7d', t: '5.2 s',
        cols: [['cluster_id', 's'], ['cluster_name', 's'], ['cluster_source', 's'], ['worker_node_type', 's'], ['driver', 's'], ['nodos', 'n'], ['cpu_media_pct', 'n'], ['mem_max_pct', 'n'], ['swap_max_pct', 'n'], ['io_wait_media_pct', 'n']],
        rows: [
          ['0912-081530-a1b2c3d4', 'job-merge-clientes', 'JOB', 'Standard_E8ds_v5', 'false', 8, 71.4, 97.8, 1.35, 2.1],
          ['0301-110022-k9l8m7n6', 'interactivo-equipo-bi', 'UI', 'Standard_D16s_v3', 'true', 1, 12.0, 93.1, 0.00, 0.4],
          ['0301-110022-k9l8m7n6', 'interactivo-equipo-bi', 'UI', 'Standard_D16s_v3', 'false', 6, 5.8, 31.2, 0.00, 0.3],
          ['0715-140905-p4q5r6s7', 'interactivo-ds', 'UI', 'Standard_D8s_v3', 'false', 4, 11.3, 38.5, 0.00, 0.6]
        ],
        chart: { type: 'hgroup', x: 'cluster_name', label: function (r) { return r[1] + (r[4] === 'true' ? ' (driver)' : ''); }, y: ['cpu_media_pct', 'mem_max_pct'], max: 100, title: 'Bar · cpu_media_pct y mem_max_pct por cluster' },
        read: '<div><span class="pill bad">Memoria</span><b>job-merge-clientes</b> llega al 98 % de memoria con swap en los workers: riesgo de spill u OOM. Más memoria por nodo o menos datos por task.</div><div><span class="pill bad">Ociosos</span><b>interactivo-equipo-bi</b> tiene 6 workers al 6 % de CPU, pero el driver llega al 93 % de memoria: probablemente <code>collect()</code> o resultados grandes al driver.</div><div class="c">Umbrales de la query (20 % y 90 %) elegidos por nosotros, no por la doc.</div>'
      },
      'q-fallos': {
        tab: 'runs_por_estado_30d', t: '1.9 s',
        cols: [['workspace_id', 's'], ['dia', 'd'], ['result_state', 's'], ['runs', 'n']],
        rows: rfRows,
        chart: { type: 'stack', xs: rfX, series: rfS, title: 'Bar (stacked) · runs no exitosas por dia y result_state' },
        read: '<div><span class="pill bad">Dos episodios</span>El 27 y 28 de septiembre fallan 6 y 4 runs; el 4 de octubre aparecen 3 <code>TIMED_OUT</code>.</div><div><span class="pill ok">Siguiente paso</span>Repite la query agrupando por <code>job_id</code> y <code>termination_code</code> esos días. Un pico de <code>TIMED_OUT</code> suele venir de datos que crecen o de espera por recursos.</div><div class="c">SUCCEEDED se omite de la gráfica para que se vean los fallos.</div>'
      },
      'q-tasks': {
        tab: 'tasks_lentas_job', t: '1.6 s',
        cols: [['task_key', 's'], ['ejecuciones', 'n'], ['media_min', 'n'], ['p95_min', 'n'], ['max_min', 'n']],
        rows: [
          ['merge_silver', 30, 18.4, 31.9, 44.0],
          ['calcular_kpis', 30, 6.2, 7.5, 9.1],
          ['optimize', 30, 4.0, 4.4, 5.0],
          ['leer_bronze', 30, 3.1, 4.0, 5.2],
          ['publicar', 30, 0.8, 1.0, 1.3]
        ],
        chart: { type: 'hgroup', x: 'task_key', y: ['media_min', 'p95_min'], title: 'Bar · media_min y p95_min por task_key' },
        read: '<div><span class="pill bad">Irregular</span><b>merge_silver</b> tiene una p95 de 32 min con media de 18: algunos días tarda casi el doble.</div><div><span class="pill ok">Siguiente paso</span>Abre esas runs en la vista de matriz del job y revisa el stage más largo en el Spark UI (o el query profile si es serverless). Busca skew o spill.</div>'
      },
      'q-po': {
        tab: 'predictive_optimization_30d', t: '2.2 s',
        cols: [['catalog_name', 's'], ['schema_name', 's'], ['table_name', 's'], ['operation_type', 's'], ['operaciones', 'n'], ['dbus_estimados', 'n']],
        rows: [
          ['prod', 'silver', 'eventos_web', 'CLUSTERING', 212, 148.30],
          ['prod', 'silver', 'eventos_web', 'COMPACTION', 96, 61.45],
          ['prod', 'gold', 'ventas_diarias', 'COMPACTION', 30, 12.10],
          ['prod', 'silver', 'eventos_web', 'VACUUM', 30, 8.75],
          ['prod', 'gold', 'ventas_diarias', 'ANALYZE', 30, 3.20],
          ['prod', 'bronze', 'pedidos_raw', 'VACUUM', 30, 2.95]
        ],
        chart: { type: 'hbar', x: 'table_name', label: function (r) { return r[2] + ' · ' + r[3]; }, y: ['dbus_estimados'], title: 'Bar · dbus_estimados por tabla y operación' },
        read: '<div><span class="pill bad">Una tabla</span><b>eventos_web</b> concentra casi todo, sobre todo en <code>CLUSTERING</code>: recibe escrituras pequeñas y frecuentes.</div><div><span class="pill ok">Contexto</span>Son DBUs estimados del SKU de serverless jobs; en <code>system.billing.usage</code> se ven con <code>billing_origin_product = \'PREDICTIVE_OPTIMIZATION\'</code>.</div>'
      }
    };

    var PAL = ['#2272B4', '#E8833A', '#7B61C9', '#3BA272'], HOT = '#D9480F';
    var shortId = function (s) { return s.length > 20 ? s.slice(0, 4) + '…' + s.slice(-4) : s; };

    var INTS = /^(read_files|pruned_files|nodos|queries|runs|ejecuciones|operaciones)$/;
    function fmtN(name, v) { return INTS.test(name) ? String(v) : v.toFixed(/usd|_gb$|dbus_est/.test(name) ? 2 : 1); }
    function grid(q) {
      var max = 12, rows = q.rows.slice(0, max);
      var ic = { s: 'ABC', t: 'ABC', n: '1.2', d: 'DATE' };
      var h = '<div class="st-gw"><table class="st-grid"><thead><tr><th class="rn"></th>' +
        q.cols.map(function (c) { return '<th><i>' + ic[c[1]] + '</i>' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (r, i) {
        var hot = q.chart.hot && q.chart.hot(r);
        h += '<tr><td class="rn">' + (i + 1) + '</td>' + r.map(function (v, j) {
          var t = q.cols[j][1], cls = t === 'n' ? 'n' : t === 't' ? 't' : '';
          if (hot && q.cols[j][0] === q.chart.y[0]) cls += ' hl';
          var txt = t === 'n' && typeof v === 'number' ? fmtN(q.cols[j][0], v) : v;
          return '<td class="' + cls + '"' + (t === 't' ? ' title="' + esc(v) + '"' : '') + '>' + esc(txt) + '</td>';
        }).join('') + '</tr>';
      });
      if (q.rows.length > max) h += '<tr><td class="rn"></td><td class="more" colspan="' + q.cols.length + '">… ' + (q.rows.length - max) + ' filas más</td></tr>';
      return h + '</tbody></table></div>';
    }

    function legend(names) { return '<div class="st-leg">' + names.map(function (n, i) { return '<span style="--c:' + PAL[i] + '">' + esc(n) + '</span>'; }).join('') + '</div>'; }

    function chart(q, host) {
      var c = q.chart, svg, i, j;
      var W = Math.round(Math.min(640, Math.max(300, host.getBoundingClientRect().width - 26)));
      var narrow = W < 460;
      var yi = c.y ? c.y.map(function (n) { return q.cols.map(function (x) { return x[0]; }).indexOf(n); }) : [];
      var xi = c.x ? q.cols.map(function (x) { return x[0]; }).indexOf(c.x) : -1;
      if (c.type === 'hbar' || c.type === 'hgroup') {
        var rows = q.rows, ns = c.y.length, bh = ns > 1 ? 9 : 14, gap = ns > 1 ? 8 : 7, rowH = bh * ns + gap;
        var L = narrow ? 112 : 150, T = 6, B = 20, H = T + B + rows.length * rowH;
        svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': c.title });
        var mx = c.max || nice4(Math.max.apply(null, rows.map(function (r) { return Math.max.apply(null, yi.map(function (k) { return r[k]; })); })) * 1.08);
        var xs = function (v) { return L + (W - L - 30) * v / mx; };
        for (i = 0; i <= 4; i++) { var gx = xs(mx * i / 4); svg.appendChild(sv('line', { x1: gx, x2: gx, y1: T, y2: H - B, 'class': i ? 'g' : 'a' })); svg.appendChild(sv('text', { x: gx, y: H - 6, 'text-anchor': 'middle' }, fmtTick(mx * i / 4))); }
        rows.forEach(function (r, ri) {
          var y0 = T + ri * rowH + gap / 2;
          var name = c.label ? c.label(r) : (c.short ? shortId(r[xi]) : r[xi]);
          var lim = narrow ? 17 : 24; if (name.length > lim) name = name.slice(0, lim - 1) + '…';
          svg.appendChild(sv('text', { x: L - 6, y: y0 + rowH / 2 - gap / 2 + 3, 'text-anchor': 'end' }, name));
          yi.forEach(function (k, si) {
            var v = r[k], hot = c.hot && c.hot(r);
            svg.appendChild(sv('rect', { x: L, y: y0 + si * bh, width: Math.max(1, xs(v) - L), height: bh - 1.5, rx: 1.5, fill: hot ? HOT : PAL[si] }));
            svg.appendChild(sv('text', { x: xs(v) + 4, y: y0 + si * bh + bh / 2 + 2.5, 'class': 'val' }, String(v)));
          });
        });
        host.innerHTML = '<h6>' + esc(c.title) + '</h6>' + (ns > 1 ? legend(c.y) : '');
        host.appendChild(svg);
        return;
      }
      // series en el tiempo
      var names = Object.keys(c.series), X = c.xs, n = X.length;
      var L2 = 40, R2 = 10, T2 = 8, B2 = 22, H2 = 210;
      svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H2, role: 'img', 'aria-label': c.title });
      var tot = X.map(function (_, k) { return names.reduce(function (a, nm) { return a + c.series[nm][k]; }, 0); });
      var ymax = nice4((c.type === 'stack' ? Math.max.apply(null, tot) : Math.max.apply(null, names.map(function (nm) { return Math.max.apply(null, c.series[nm]); }))) * 1.08);
      var ys = function (v) { return H2 - B2 - (H2 - B2 - T2) * v / ymax; };
      var step = (W - L2 - R2) / n;
      var xc = function (k) { return L2 + step * (k + 0.5); };
      for (i = 0; i <= 4; i++) { var gy = ys(ymax * i / 4); svg.appendChild(sv('line', { x1: L2, x2: W - R2, y1: gy, y2: gy, 'class': i ? 'g' : 'a' })); svg.appendChild(sv('text', { x: L2 - 5, y: gy + 3, 'text-anchor': 'end' }, fmtTick(ymax * i / 4))); }
      for (j = 0; j < n; j += (narrow ? 3 : 2)) svg.appendChild(sv('text', { x: xc(j), y: H2 - 6, 'text-anchor': 'middle' }, X[j]));
      if (c.type === 'stack') {
        for (j = 0; j < n; j++) {
          var acc = 0;
          names.forEach(function (nm, si) {
            var v = c.series[nm][j]; if (!v) return;
            svg.appendChild(sv('rect', { x: xc(j) - step * 0.32, y: ys(acc + v), width: step * 0.64, height: ys(acc) - ys(acc + v), fill: ['#E03131', '#E8833A', '#9AA3AE'][si] }));
            acc += v;
          });
        }
        host.innerHTML = '<h6>' + esc(c.title) + '</h6><div class="st-leg">' + names.map(function (nm, si) { return '<span style="--c:' + ['#E03131', '#E8833A', '#9AA3AE'][si] + '">' + nm + '</span>'; }).join('') + '</div>';
      } else {
        names.forEach(function (nm, si) {
          var d = c.series[nm].map(function (v, k) { return (k ? 'L' : 'M') + xc(k).toFixed(1) + ' ' + ys(v).toFixed(1); }).join(' ');
          svg.appendChild(sv('path', { d: d, fill: 'none', stroke: PAL[si], 'stroke-width': 2, 'stroke-linejoin': 'round' }));
          c.series[nm].forEach(function (v, k) { svg.appendChild(sv('circle', { cx: xc(k), cy: ys(v), r: 2.4, fill: PAL[si] })); });
        });
        host.innerHTML = '<h6>' + esc(c.title) + '</h6>' + legend(names);
      }
      host.appendChild(svg);
    }

    var ui = document.getElementById('st-ui'), rd = document.getElementById('st-read');
    function show(id) {
      var q = Q[id]; if (!q) return;
      var src = document.querySelector('#' + id + ' pre code');
      var sql = src ? src.textContent.trim() : '';
      ui.innerHTML = '<div class="ui-frame st-frame"><div class="st-top"><span class="st-tab">' + esc(q.tab) + '</span><span class="st-wh">Serverless warehouse · Small</span><span class="st-run">Run (1000)</span></div>' +
        '<div class="st-code">' + hl(sql) + '</div>' +
        '<div class="st-rtabs"><span class="on">Results</span><span>Visualization</span></div>' +
        grid(q) +
        '<div class="st-foot"><span>' + q.rows.length + ' rows</span><span>' + q.t + '</span><span>Datos ilustrativos</span></div>' +
        '<div class="st-viz" id="st-viz"></div></div>' +
        '<p class="ui-cap">Recreación ilustrativa del SQL editor: la query es la de la sección siguiente (<a href="#' + id + '">ir a copiarla</a>); el resultado y la gráfica son inventados.</p>';
      chart(q, document.getElementById('st-viz'));
      rd.innerHTML = q.read;
    }
    var g = document.getElementById('st-qs');
    g.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        g.querySelectorAll('[data-q]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        show(b.dataset.q);
      });
    });
    show('q-coste-job');
  } catch (e) { console.error('system-tables: explorador', e); } }

  /* ---------- 2. simulador de alerta ---------- */
  var al = document.getElementById('st-al');
  if (al) { try {
    var R2 = rng(4217);
    function series(fn) { var a = []; for (var i = 0; i < 30; i++) a.push(fn(i, day(i).getUTCDay())); return a; }
    var M = {
      spill: {
        name: 'spill_diario', col: 'spill_gb', unit: 'GB', min: 0, max: 120, step: 1, def: 50, dec: 1,
        vals: series(function (i) { var s = { 4: 72, 5: 58, 18: 95, 24: 61 }; return s[i] != null ? s[i] : Math.round((8 + R2() * 18) * 10) / 10; }),
        sql: "SELECT ROUND(SUM(spilled_local_bytes) / POW(1024, 3), 1) AS spill_gb\nFROM system.query.history\nWHERE start_time >= date_sub(current_date(), 1)\n  AND start_time <  current_date()"
      },
      cost: {
        name: 'coste_diario', col: 'usd_lista', unit: 'USD', min: 0, max: 2000, step: 10, def: 1000, dec: 0,
        vals: series(function (i, dw) { var s = { 26: 1520, 27: 1640, 12: 1080 }; return s[i] != null ? s[i] : Math.round((dw === 0 || dw === 6 ? 430 : 700) * (0.9 + R2() * 0.2)); }),
        sql: "SELECT ROUND(SUM(u.usage_quantity * p.pricing.effective_list.default), 2) AS usd_lista\nFROM system.billing.usage u\nJOIN system.billing.list_prices p\n  ON  p.sku_name = u.sku_name\n  AND u.usage_end_time >= p.price_start_time\n  AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)\n  AND p.currency_code = 'USD'\nWHERE u.usage_date = date_sub(current_date(), 1)"
      },
      fail: {
        name: 'runs_fallidas', col: 'runs_fallidas', unit: 'runs', min: 0, max: 10, step: 1, def: 2, dec: 0,
        vals: series(function (i) { var s = { 8: 4, 9: 3, 20: 6, 27: 3 }; return s[i] != null ? s[i] : (R2() < 0.35 ? 1 : 0); }),
        sql: "SELECT COUNT(DISTINCT run_id) AS runs_fallidas\nFROM system.lakeflow.job_run_timeline\nWHERE result_state IN ('FAILED', 'TIMED_OUT', 'ERROR')\n  AND to_date(period_end_time) = date_sub(current_date(), 1)"
      },
      dq: {
        name: 'nulos_cliente_id', col: 'nulos', unit: 'filas', min: 0, max: 5000, step: 10, def: 100, dec: 0,
        vals: series(function (i) { var s = { 15: 3800, 16: 420, 26: 150 }; return s[i] != null ? s[i] : Math.round(R2() * 30); }),
        sql: "-- Calidad de datos sobre una tabla tuya (cambia el nombre)\nSELECT COUNT(*) AS nulos\nFROM main.ventas.pedidos\nWHERE fecha_pedido = date_sub(current_date(), 1)\n  AND cliente_id IS NULL"
      }
    };
    var F = {
      h: { cron: '0 0 * * * ?', txt: 'cada hora', per: 24 },
      d: { cron: '0 0 7 * * ?', txt: 'cada día a las 07:00', per: 1 },
      w: { cron: '0 0 7 ? * MON', txt: 'cada lunes a las 07:00', per: 1 }
    };
    var st = { m: 'spill', f: 'd', n: 'once', ok: false, thr: M.spill.def };
    var thr = document.getElementById('al-thr'), thrO = document.getElementById('al-thr-o');

    function setMetric(k) {
      st.m = k; var m = M[k];
      thr.min = m.min; thr.max = m.max; thr.step = m.step; thr.value = m.def; st.thr = m.def;
    }
    function fmt(v, m) { return (m.dec ? v.toFixed(m.dec) : String(Math.round(v))) + ' ' + m.unit; }

    function draw() {
      var m = M[st.m], f = F[st.f], t = +thr.value; st.thr = t;
      thrO.textContent = '> ' + fmt(t, m);
      // evaluación
      var prev = 'OK', evals = 0, notes = [], okNotes = [], above = 0, missed = 0, caught = 0, totalN = 0;
      m.vals.forEach(function (v, i) {
        var evaluated = st.f !== 'w' || i % 7 === 0;
        var hot = v > t; if (hot) above++;
        var nN = 0, nOk = 0;
        if (evaluated) {
          for (var e = 0; e < f.per; e++) {
            evals++;
            var s = hot ? 'TRIGGERED' : 'OK';
            if (s === 'TRIGGERED' && (prev !== 'TRIGGERED' || st.n === 'rep')) nN++;
            if (s === 'OK' && prev === 'TRIGGERED' && st.ok) nOk++;
            prev = s;
          }
          if (hot) caught++;
        } else if (hot) missed++;
        notes.push(nN); okNotes.push(nOk); totalN += nN + nOk;
      });
      // condición tipo editor de alertas
      document.getElementById('al-cond').innerHTML =
        '<div class="al-cond"><span class="lab">Condition</span><span class="al-sel dd">First value</span><span class="al-sel dd">' + m.col + '</span><span class="al-sel dd">&gt;</span><span class="al-sel dd">Static value</span><span class="al-sel">' + (m.dec ? t.toFixed(m.dec) : t) + '</span></div>' +
        '<div class="al-meta">Schedule: ' + f.txt + ' · Quartz cron <code>' + f.cron + '</code> · zona <code>America/Bogota</code> · notificación ' + (st.n === 'once' ? 'al cambiar a TRIGGERED' : 'en cada evaluación TRIGGERED') + (st.ok ? ' y al volver a OK' : '') + '</div>' +
        '<div class="al-h">Query de la alerta</div><div class="al-code">' + esc(m.sql) + '</div>';
      // gráfica
      var svg = document.getElementById('al-chart'); svg.textContent = '';
      var W = 360, H = 196, L = 40, B = 20, T = 28, n = m.vals.length;
      var mx = nice4(Math.max(Math.max.apply(null, m.vals), t) * 1.08);
      var ys = function (v) { return H - B - (H - B - T) * v / mx; };
      var bw = (W - L - 6) / n;
      for (var i = 0; i <= 4; i++) { var y = ys(mx * i / 4); svg.appendChild(sv('line', { x1: L, x2: W - 4, y1: y, y2: y, 'class': 'ax', opacity: i ? 0.5 : 1 })); svg.appendChild(sv('text', { x: L - 4, y: y + 3, 'text-anchor': 'end', 'class': 'tick' }, fmtTick(mx * i / 4))); }
      m.vals.forEach(function (v, k) {
        var evaluated = st.f !== 'w' || k % 7 === 0, x = L + k * bw + 1;
        var cls = !evaluated ? 'dim' : (v > t ? 'bar hot' : 'bar');
        var h = Math.max(0.8, ys(0) - ys(v));
        svg.appendChild(sv('rect', { x: x, y: ys(0) - h, width: bw - 2, height: h, 'class': cls }));
        if (notes[k]) {
          svg.appendChild(sv('circle', { cx: x + (bw - 2) / 2, cy: 6, r: 3, 'class': 'ntf' }));
          if (notes[k] > 1) svg.appendChild(sv('text', { x: x + (bw - 2) / 2, y: (k % 2) ? 25 : 17, 'text-anchor': 'middle', 'class': 'ntxt' }, String(notes[k])));
        }
        if (okNotes[k]) svg.appendChild(sv('circle', { cx: x + (bw - 2) / 2, cy: 6, r: 2.6, 'class': 'ntf-ok' }));
        if (k % 7 === 0) svg.appendChild(sv('text', { x: x + (bw - 2) / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'tick' }, lab(day(k))));
      });
      var yt = ys(t);
      svg.appendChild(sv('line', { x1: L, x2: W - 4, y1: yt, y2: yt, 'class': 'ln thr' }));
      // contadores
      var s = document.getElementById('al-stats');
      s.innerHTML = '<div class="' + (above ? 'warn' : '') + '"><b>' + above + '</b><span>días sobre el umbral</span></div>' +
        '<div class="' + (missed ? 'warn' : '') + '"><b>' + missed + '</b><span>días sin detectar</span></div>' +
        '<div><b>' + evals + '</b><span>evaluaciones en 30 días</span></div>' +
        '<div class="' + (totalN > 10 ? 'warn' : '') + '"><b>' + totalN + '</b><span>notificaciones</span></div>';
      // veredicto
      var v = [];
      if (missed) v.push('<div><span class="pill bad">Huecos</span>' + missed + ' de ' + above + ' días malos caen en días sin evaluación. Una alerta semanal sobre el valor de ayer solo mira un día de cada siete.</div>');
      else if (above) v.push('<div><span class="pill ok">Cobertura</span>Se evalúan todos los días con problema (' + caught + ').</div>');
      else v.push('<div><span class="pill ok">Silencio</span>Ningún día supera el umbral: la alerta nunca pasa a TRIGGERED.</div>');
      if (st.f === 'h' && st.n === 'rep' && above) v.push('<div><span class="pill bad">Ruido</span>Cada día malo genera 24 mensajes, porque el valor de ayer no cambia en todo el día.</div>');
      if (st.f === 'h') v.push('<div class="c">' + evals + ' ejecuciones de la query al mes en el warehouse. Para un valor diario basta una evaluación al día.</div>');
      if (st.m === 'cost' && st.f !== 'h') v.push('<div><span class="pill bad">Latencia</span><code>system.billing.usage</code> tarda hasta 12 h. A las 07:00 el día de ayer puede estar incompleto: evalúa anteayer o programa la alerta más tarde.</div>');
      if (st.m === 'dq') v.push('<div class="c">Esta es la forma de usar SQL alerts para calidad de datos: una query que cuenta filas que violan una regla.</div>');
      document.getElementById('al-verdict').innerHTML = v.join('');
      // bundle
      var thrv = m.dec ? t.toFixed(m.dec) : String(t);
      document.getElementById('al-yaml').innerHTML = '<div class="al-h">Lo mismo en un bundle (recurso alert)</div><div class="al-code">' + esc(
        'resources:\n  alerts:\n    ' + m.name + ':\n      display_name: "' + m.name + ' > ' + thrv + '"\n      warehouse_id: <warehouse-id>\n      query_text: |\n' +
        m.sql.split('\n').map(function (l) { return '        ' + l; }).join('\n') +
        '\n      evaluation:\n        source:\n          name: ' + m.col + '\n        comparison_operator: GREATER_THAN\n        threshold:\n          value:\n            double_value: ' + thrv +
        '\n        notification:\n          notify_on_ok: ' + st.ok + '\n          retrigger_seconds: ' + (st.n === 'once' ? 0 : 1) +
        '\n          subscriptions:\n            - user_email: equipo-datos@empresa.com\n      schedule:\n        quartz_cron_schedule: "' + f.cron + '"\n        timezone_id: America/Bogota') + '</div>';
    }

    function chips(id, key, cb) {
      var g = document.getElementById(id);
      g.querySelectorAll('[data-' + key + ']').forEach(function (b) {
        b.addEventListener('click', function () {
          g.querySelectorAll('[data-' + key + ']').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
          cb(b.dataset[key]); draw();
        });
      });
    }
    chips('al-m', 'm', setMetric);
    chips('al-f', 'f', function (v) { st.f = v; });
    chips('al-n', 'n', function (v) { st.n = v; });
    document.getElementById('al-ok').addEventListener('change', function (e) { st.ok = e.target.checked; draw(); });
    thr.addEventListener('input', draw);
    setMetric('spill'); draw();
  } catch (e) { console.error('system-tables: simulador de alerta', e); } }
})();
