/* Estrategias de join: selector de estrategia y exploding join */
(function () {
  if (!window.SPL) return;
  const { el, UI } = window.SPL;
  const MB = 1024 * 1024;
  const fmt = b => UI.bytes(b);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const rec = n => n >= 1e15 ? (n / Math.pow(10, Math.floor(Math.log10(n)))).toFixed(1) + ' × 10' + String(Math.floor(Math.log10(n))).split('').map(d => SUP[+d]).join('') : n >= 1e12 ? (n / 1e12).toFixed(1) + ' billones' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' mil M' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' M' : n >= 1e3 ? (n / 1e3).toFixed(0) + ' k' : Math.round(n) + '';
  const chips = (id, cb) => {
    const g = document.getElementById(id); if (!g) return () => null;
    const btns = [...g.querySelectorAll('button[data-v]')];
    btns.forEach(b => b.addEventListener('click', () => { btns.forEach(x => x.setAttribute('aria-pressed', x === b)); cb(); }));
    return () => (btns.find(b => b.getAttribute('aria-pressed') === 'true') || btns[0]).dataset.v;
  };

  /* ---------- 1. selector de estrategia ---------- */
  if (document.getElementById('js-sim')) { try {
    const STATIC_T = 10 * MB, AQE_T = 30 * MB, EXEC = 4, ROWB = 100;
    const sL = document.getElementById('js-l'), sR = document.getElementById('js-r'), sReal = document.getElementById('js-real');
    const aqeBox = document.getElementById('js-aqe');
    const size = v => MB * Math.pow(10, v / 10);
    const NAME = { L: 'ventas', R: 'clientes' };
    const NODE = { BHJ: 'BroadcastHashJoin', SHJ: 'ShuffledHashJoin', SMJ: 'SortMergeJoin', BNLJ: 'BroadcastNestedLoopJoin', CART: 'CartesianProduct' };
    let getJT, getEq, getHint, getSide;

    // reglas de lado build (código de Spark, joins.scala)
    const canBL = jt => jt === 'INNER' || jt === 'RIGHT';
    const canBR = jt => jt === 'INNER' || jt === 'LEFT';

    function plan(L, R, jt, equi, hint, side, thr) {
      const warn = [];
      const smaller = L <= R ? 'L' : 'R';
      function noHint() {
        if (equi) {
          const bl = canBL(jt) && L <= thr, br = canBR(jt) && R <= thr;
          if (bl && br) return { s: 'BHJ', build: smaller };
          if (bl) return { s: 'BHJ', build: 'L' };
          if (br) return { s: 'BHJ', build: 'R' };
          return { s: 'SMJ', build: null };
        }
        const desired = (jt === 'INNER' || jt === 'FULL') ? smaller : (canBL(jt) ? 'L' : 'R');
        const bl = L <= thr, br = R <= thr;
        if (bl && br) return { s: 'BNLJ', build: desired };
        if (bl) return { s: 'BNLJ', build: 'L' };
        if (br) return { s: 'BNLJ', build: 'R' };
        if (jt === 'INNER') return { s: 'CART', build: null };
        return { s: 'BNLJ', build: desired, forced: true };
      }
      if (hint === 'none') return Object.assign(noHint(), { warn });
      if (!equi) {
        if (hint === 'BROADCAST') return { s: 'BNLJ', build: side, warn, hinted: true };
        warn.push(`<code>${hint}</code> necesita una condición de igualdad. Spark ignora el hint (aviso en el log del driver).`);
        return Object.assign(noHint(), { warn });
      }
      if (hint === 'BROADCAST') {
        if ((side === 'L' && canBL(jt)) || (side === 'R' && canBR(jt))) return { s: 'BHJ', build: side, warn, hinted: true };
        warn.push(`Un ${jt === 'FULL' ? 'FULL OUTER JOIN no permite broadcast de ningún lado' : jt + ' JOIN no permite broadcast del lado ' + (side === 'L' ? 'izquierdo' : 'derecho')}. Spark ignora el hint y sigue sin él.`);
        return Object.assign(noHint(), { warn });
      }
      if (hint === 'MERGE') return { s: 'SMJ', build: null, warn, hinted: true };
      if (hint === 'SHUFFLE_HASH') return { s: 'SHJ', build: side, warn, hinted: true };
      return Object.assign(noHint(), { warn });
    }

    function sqlText(jt, equi, hint, side) {
      const h = hint === 'none' ? '' : `/*+ ${hint}(${side === 'L' ? 'v' : 'c'}) */ `;
      const j = { INNER: 'JOIN', LEFT: 'LEFT JOIN', RIGHT: 'RIGHT JOIN', FULL: 'FULL OUTER JOIN' }[jt];
      const on = equi ? 'v.cliente_id = c.cliente_id' : 'v.fecha BETWEEN c.alta AND c.baja';
      return `SELECT ${h}v.*, c.segmento\nFROM ventas v\n${j} clientes c\n  ON ${on};`;
    }

    function draw() {
      const L = size(+sL.value), R = size(+sR.value), real = +sReal.value / 100;
      const rL = L * real, rR = R * real;
      const jt = getJT(), equi = getEq() === 'eq', hint = getHint(), side = getSide(), aqe = aqeBox.checked;
      document.getElementById('js-l-o').textContent = fmt(L);
      document.getElementById('js-r-o').textContent = fmt(R);
      document.getElementById('js-real-o').textContent = Math.round(real * 100) + '% · ' + fmt(rL) + ' / ' + fmt(rR);
      document.getElementById('js-side').style.opacity = (hint === 'BROADCAST' || hint === 'SHUFFLE_HASH') ? '1' : '.45';
      document.getElementById('js-sql').textContent = sqlText(jt, equi, hint, side);

      const st = plan(L, R, jt, equi, hint, side, STATIC_T);
      // AQE: solo SortMergeJoin → BroadcastHashJoin, con tamaños reales; respeta MERGE
      let fin = st, converted = false;
      if (aqe && equi && st.s === 'SMJ' && hint !== 'MERGE') {
        const rt = plan(rL, rR, jt, equi, 'none', side, AQE_T);
        if (rt.s === 'BHJ') { fin = rt; converted = true; }
      }

      // bytes que se mueven (con tamaños reales)
      let shuffle = 0, bcast = 0, driver = 0, comps = 0;
      const bsz = b => b === 'L' ? rL : rR;
      if (st.s === 'SMJ' || st.s === 'SHJ') shuffle = rL + rR;
      if (fin.s === 'BHJ' || fin.s === 'BNLJ') { bcast = bsz(fin.build) * EXEC; driver = bsz(fin.build); }
      if (fin.s === 'BNLJ' || fin.s === 'CART') comps = (rL / ROWB) * (rR / ROWB);

      drawDiagram({ st, fin, converted, rL, rR });

      const box = (v, l, w) => `<div class="${w ? 'warn' : ''}"><b>${v}</b><span>${l}</span></div>`;
      document.getElementById('js-stats').innerHTML =
        box(shuffle ? fmt(shuffle) : '0', 'shuffle escrito', shuffle > 50 * 1024 * MB) +
        box(bcast ? fmt(bcast) : '0', `broadcast (× ${EXEC} executors)`, bcast > 4 * 1024 * MB) +
        box(driver ? fmt(driver) : '0', 'pasa por el driver', driver > 1024 * MB) +
        box(comps ? rec(comps) : '—', 'comparaciones fila a fila', comps > 1e12);

      const nm = s => `<code>${NODE[s.s]}</code>${s.build ? ' (build: ' + NAME[s.build] + ')' : ''}`;
      const lines = [];
      let why;
      if (st.hinted) why = 'lo pide el hint.';
      else if (st.s === 'BHJ') why = `${NAME[st.build]} estima ${fmt(st.build === 'L' ? L : R)}, por debajo de 10 MB.`;
      else if (st.s === 'SMJ') why = (jt === 'FULL' ? 'un FULL OUTER JOIN no admite broadcast.' : 'ningún lado que se pueda copiar cabe en 10 MB.');
      else if (st.s === 'CART') why = 'no hay igualdad y ningún lado cabe en 10 MB.';
      else if (st.forced) why = 'no hay igualdad ni lado pequeño: Spark copia igual un lado grande.';
      else why = 'no hay igualdad y un lado cabe en 10 MB.';
      lines.push(`<div><span class="pill ${st.s === 'BHJ' ? 'ok' : (st.s === 'SMJ' || st.s === 'SHJ') ? 'ok' : 'bad'}">plan</span>Estático: ${nm(st)}, porque ${why}</div>`);
      if (converted) lines.push(`<div><span class="pill ok">AQE</span>En runtime ${NAME[fin.build]} llega con ${fmt(bsz(fin.build))} ≤ 30 MB: pasa a ${nm(fin)}. Los dos shuffles ya se escribieron; AQE se ahorra el sort y lee el lado grande en local.</div>`);
      else if (aqe && equi && st.s === 'SMJ') {
        const reason = hint === 'MERGE' ? 'AQE respeta el hint MERGE.' : jt === 'FULL' ? 'FULL OUTER no admite broadcast.' : `el lado que se podría copiar llega con más de 30 MB (${fmt(jt === 'LEFT' ? rR : jt === 'RIGHT' ? rL : Math.min(rL, rR))}).`;
        lines.push(`<div><span class="pill bad">AQE</span>No cambia nada: ${reason}</div>`);
      } else if (!aqe && st.s === 'SMJ' && equi) lines.push(`<div><span class="pill bad">AQE</span>Desactivado: el sort-merge join se ejecuta completo.</div>`);
      else if (aqe && !equi) lines.push(`<div class="c">AQE no cambia joins sin igualdad: la conversión documentada es sort-merge → broadcast hash.</div>`);
      st.warn.forEach(w => lines.push(`<div><span class="pill bad">hint</span>${w}</div>`));
      if (fin.s === 'BHJ' && bsz(fin.build) > 1024 * MB) lines.push(`<div><span class="pill bad">memoria</span>Copiar ${fmt(bsz(fin.build))} a cada executor (y recogerlo en el driver) es arriesgado. Revisa <a href="memoria-oom.html">Memoria y OOM</a>.</div>`);
      if (comps > 1e10) lines.push(`<div><span class="pill bad">coste</span>${rec(comps)} comparaciones. Si la condición es un rango, mira la range join optimization más abajo.</div>`);
      document.getElementById('js-verdict').innerHTML = lines.join('');

      document.getElementById('js-ui').innerHTML = planUI(st, fin, converted, rL, rR, jt);
    }

    // ---- diagrama de movimiento de datos ----
    function drawDiagram({ st, fin, converted, rL, rR }) {
      const svg = document.getElementById('js-chart'); svg.textContent = '';
      const W = 360, tY = 10, tH = 40, eY = 176, eH = 44;
      const tbl = { L: { x: 6, w: 168 }, R: { x: 186, w: 168 } };
      const ex = [0, 1, 2, 3].map(i => ({ x: 8 + i * 87, w: 80 }));
      const drv = { x: 140, y: 92, w: 80, h: 26 };
      const cx = b => b.x + b.w / 2;
      const sw = b => Math.max(1, Math.min(4.5, 0.6 + Math.log10(b / MB + 1) * 0.9));
      const flows = el('g', {}), boxes = el('g', {});
      svg.appendChild(flows); svg.appendChild(boxes);
      const path = (x1, y1, x2, y2, cls, w, dim) => {
        const my = (y1 + y2) / 2;
        flows.appendChild(el('path', { d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, class: 'jf ' + cls + (dim ? ' dim' : ''), 'stroke-width': w }));
      };
      const mode = { L: 'local', R: 'local' };
      const isShuf = st.s === 'SMJ' || st.s === 'SHJ';
      if (isShuf) { mode.L = 'shuffle'; mode.R = 'shuffle'; }
      if (fin.s === 'BHJ' || fin.s === 'BNLJ') mode[fin.build] = converted ? 'shuffle+bc' : 'bc';
      if (fin.s === 'CART') { mode.L = 'cart'; mode.R = 'cart'; }
      const sizes = { L: rL, R: rR };
      let usesDriver = false;
      ['L', 'R'].forEach(k => {
        const t = tbl[k], m = mode[k], b = sizes[k];
        const y0 = tY + tH, pts = [0, 1, 2, 3].map(i => t.x + 14 + i * (t.w - 28) / 3);
        const off = k === 'L' ? -9 : 9;
        if (m === 'shuffle' || m === 'shuffle+bc' || m === 'cart') {
          pts.forEach(px => ex.forEach(e => path(px, y0, cx(e) + off, eY, 'hot', Math.max(0.8, sw(b) * 0.45), converted)));
        }
        if (m === 'bc' || m === 'shuffle+bc') {
          usesDriver = true;
          path(cx(t), y0, cx(drv) + off, drv.y, 'cool', sw(b));
          ex.forEach(e => path(cx(drv) + off, drv.y + drv.h, cx(e) + off, eY, 'cool', sw(b)));
        }
        if (m === 'local') {
          pts.forEach((px, i) => path(px, y0, cx(ex[i]) + off, eY, 'loc', 1.2));
        }
      });
      // cajas de tablas
      ['L', 'R'].forEach(k => {
        const t = tbl[k], m = mode[k];
        boxes.appendChild(el('rect', { x: t.x, y: tY, width: t.w, height: tH, rx: 6, class: 'box' }));
        boxes.appendChild(el('text', { x: t.x + 8, y: tY + 16, class: 'boxlbl' }, (k === 'L' ? 'ventas' : 'clientes') + ' · ' + fmt(sizes[k])));
        let lab = { shuffle: 'shuffle', 'shuffle+bc': 'shuffle, luego broadcast', bc: 'broadcast × 4', local: 'no se mueve', cart: 'se replica por partición' }[m];
        if (converted && m === 'shuffle') lab = 'shuffle, lectura local';
        boxes.appendChild(el('text', { x: t.x + 8, y: tY + 31, class: 'sub' }, lab));
      });
      if (usesDriver) {
        boxes.appendChild(el('rect', { x: drv.x, y: drv.y, width: drv.w, height: drv.h, rx: 5, class: 'box' }));
        boxes.appendChild(el('text', { x: cx(drv), y: drv.y + 16, 'text-anchor': 'middle', class: 'boxlbl' }, 'driver'));
      }
      ex.forEach((e, i) => {
        boxes.appendChild(el('rect', { x: e.x, y: eY, width: e.w, height: eH, rx: 5, class: 'box' }));
        boxes.appendChild(el('text', { x: e.x + 7, y: eY + 15, class: 'boxlbl' }, 'executor ' + (i + 1)));
        const n = NODE[fin.s].replace('BroadcastNestedLoopJoin', 'BNLJoin').replace('BroadcastHashJoin', 'BHJoin').replace('SortMergeJoin', 'SMJoin').replace('ShuffledHashJoin', 'SHJoin').replace('CartesianProduct', 'Cartesian');
        boxes.appendChild(el('text', { x: e.x + 7, y: eY + 31, class: 'sub' }, n));
      });
      if (converted) boxes.appendChild(el('text', { x: W / 2, y: 233, 'text-anchor': 'middle', class: 'sub' }, 'naranja tenue: shuffle ya escrito antes del cambio de AQE'));
    }

    // ---- recreación del plan en el Spark UI ----
    function planUI(st, fin, converted, rL, rR, jt) {
      const jtTxt = { INNER: 'Inner', LEFT: 'LeftOuter', RIGHT: 'RightOuter', FULL: 'FullOuter' }[jt];
      const scan = (t, b) => `<div class="sq-n"><b>Scan ${t}</b><div>number of output rows: ${UI.rec(b / ROWB)}</div></div>`;
      const exch = b => `<div class="sq-n ex"><b>Exchange</b><div>shuffle bytes written total: ${fmt(b)}</div></div>`;
      const sort = () => `<div class="sq-n"><b>Sort</b></div>`;
      const bex = b => `<div class="sq-n ex"><b>BroadcastExchange</b><div>data size: ${fmt(b)}</div><div>time to collect: ${UI.dur(Math.max(0.2, b / (200 * MB)))}</div></div>`;
      const aqr = () => `<div class="sq-n ex"><b>AQEShuffleRead</b><div>local</div></div>`;
      const col = (k) => {
        const b = k === 'L' ? rL : rR, t = k === 'L' ? 'ventas' : 'clientes';
        let parts = [scan(t, b)];
        if (fin.s === 'BHJ' || fin.s === 'BNLJ') {
          if (converted) parts.push(exch(b), aqr());
          if (fin.build === k) parts.push(bex(b));
        } else if (fin.s === 'SMJ') parts.push(exch(b), sort());
        else if (fin.s === 'SHJ') parts.push(exch(b));
        return `<div class="sq jn-col">${parts.join('')}</div>`;
      };
      const bs = fin.build ? (fin.build === 'L' ? 'BuildLeft' : 'BuildRight') : '';
      const joinNode = `<div class="sq-n jn-node"><b>${NODE[fin.s]}</b><div>${jtTxt}${bs ? ', ' + bs : ''}</div><div>number of output rows: …</div>${fin.s === 'SHJ' ? `<div>data size of build side: ${fmt(fin.build === 'L' ? rL : rR)}</div>` : ''}</div>`;
      const tree = s => {
        const b = s.build === 'L' ? 'BuildLeft' : 'BuildRight';
        if (s.s === 'BHJ') return `BroadcastHashJoin [cliente_id], [cliente_id], ${jtTxt}, ${b}`;
        if (s.s === 'SMJ') return `SortMergeJoin [cliente_id], [cliente_id], ${jtTxt}`;
        if (s.s === 'SHJ') return `ShuffledHashJoin [cliente_id], [cliente_id], ${jtTxt}, ${b}`;
        if (s.s === 'BNLJ') return `BroadcastNestedLoopJoin ${b}, ${jtTxt}, (fecha BETWEEN alta AND baja)`;
        return `CartesianProduct (fecha BETWEEN alta AND baja)`;
      };
      const txt = `AdaptiveSparkPlan isFinalPlan=true\n+- == Final Plan ==\n   ${tree(fin)}${converted ? '\n   :- AQEShuffleRead local\n   :  +- ShuffleQueryStage 0\n   +- BroadcastQueryStage 2\n      +- BroadcastExchange\n         +- AQEShuffleRead local\n            +- ShuffleQueryStage 1' : ''}\n+- == Initial Plan ==\n   ${tree(st)}`;
      return UI.frame('SQL / DataFrame', `<h5>Details for Query 3</h5><div class="jn-dag"><div class="jn-cols">${col('L')}${col('R')}</div><div class="jn-join">${joinNode}</div></div><div class="ui-link">Details</div><pre><code>${txt}</code></pre>`,
        'Recreación ilustrativa del DAG y del plan físico. Si el nodo del <i>Final Plan</i> es distinto del <i>Initial Plan</i>, AQE cambió la estrategia. El nombre del lector local (<code>AQEShuffleRead</code>, antes <code>CustomShuffleReader</code>) y el texto exacto varían con la versión.');
    }

    getJT = chips('js-jt', draw); getEq = chips('js-eq', draw); getHint = chips('js-hint', draw); getSide = chips('js-side', draw);
    [sL, sR, sReal].forEach(x => x.addEventListener('input', draw));
    aqeBox.addEventListener('change', draw);
    draw();
  } catch (e) { console.error('joins: selector', e); } }

  /* ---------- 2. exploding join ---------- */
  if (document.getElementById('ex-sim')) { try {
    const sk = document.getElementById('ex-k'), sdl = document.getElementById('ex-dl'), sdr = document.getElementById('ex-dr');
    const RB = 120, WARN = 10;
    const lg = v => Math.round(Math.pow(10, v / 10));
    function draw() {
      const K = lg(+sk.value), dL = lg(+sdl.value), dR = lg(+sdr.value);
      document.getElementById('ex-k-o').textContent = rec(K);
      document.getElementById('ex-dl-o').textContent = dL;
      document.getElementById('ex-dr-o').textContent = dR;
      const inL = K * dL, inR = K * dR, out = K * dL * dR, ratio = out / (inL + inR);
      const svg = document.getElementById('ex-chart'); svg.textContent = '';
      const rows = [['Entrada izq', inL, 'bar'], ['Entrada der', inR, 'bar'], ['Salida del join', out, ratio >= WARN ? 'bar hot' : 'bar']];
      const L = 92, Rr = 352, lo = 3, hi = 14;
      const xs = v => L + (Math.log10(Math.max(v, 1)) - lo) / (hi - lo) * (Rr - L);
      for (let p = lo; p <= hi; p += 2) {
        const x = xs(Math.pow(10, p));
        svg.appendChild(el('line', { x1: x, x2: x, y1: 8, y2: 122, class: 'ax', opacity: .5 }));
        svg.appendChild(el('text', { x, y: 136, 'text-anchor': 'middle', class: 'tick' }, '1e' + p));
      }
      rows.forEach((r, i) => {
        const y = 14 + i * 36;
        svg.appendChild(el('text', { x: L - 6, y: y + 15, 'text-anchor': 'end', class: 'tick' }, r[0]));
        svg.appendChild(el('rect', { x: L, y, width: Math.max(2, xs(r[1]) - L), height: 22, rx: 3, class: r[2] }));
        const tx = xs(r[1]) + 4, inside = tx > Rr - 70;
        svg.appendChild(el('text', { x: inside ? xs(r[1]) - 4 : tx, y: y + 15, 'text-anchor': inside ? 'end' : 'start', class: 'lbl', style: inside ? 'fill:var(--bg)' : 'fill:var(--ink)' }, rec(r[1]) + ' filas'));
      });
      svg.appendChild(el('text', { x: Rr, y: 148, 'text-anchor': 'end', class: 'sub' }, 'escala logarítmica'));
      const shuf = (inL + inR) * RB, outB = out * 2 * RB;
      const box = (v, l, w) => `<div class="${w ? 'warn' : ''}"><b>${v}</b><span>${l}</span></div>`;
      document.getElementById('ex-stats').innerHTML = box(rec(inL + inR), 'filas que entran') + box(rec(out), 'filas que salen', ratio >= WARN) + box(ratio >= 10 ? Math.round(ratio) + '×' : ratio.toFixed(1) + '×', 'salida / entrada', ratio >= WARN) + box(fmt(outB), 'salida (240 B/fila)', outB > 1024 ** 4);
      document.getElementById('ex-verdict').innerHTML = (ratio >= WARN
        ? `<div><span class="pill bad">explota</span>Cada clave produce ${dL} × ${dR} = ${rec(dL * dR)} filas. El shuffle de entrada es de ${fmt(shuf)}, pero lo que viene después tiene que procesar ${fmt(outB)}. Revisa la condición: ¿falta una columna de la clave, como la vigencia o la fecha?</div>`
        : dL > 1 && dR > 1
          ? `<div><span class="pill bad">muchos a muchos</span>La salida es ${ratio.toFixed(1)}× la entrada. Todavía no es una explosión, pero hay duplicados en los dos lados: confirma que es lo que quieres.</div>`
          : `<div><span class="pill ok">normal</span>Un lado tiene una fila por clave: la salida no supera la entrada del lado con duplicados. Shuffle de entrada: ${fmt(shuf)}.</div>`)
        + `<div class="c">Un broadcast no cambia las filas de salida: solo evita el shuffle de entrada.</div>`;
      const ins = ratio >= WARN ? `<div class="jn-ins"><b>EXPLODING_JOIN</b><span>The join produces significantly more rows than it reads.</span></div>` : '';
      document.getElementById('ex-ui').innerHTML = UI.frame('SQL / DataFrame',
        `<h5>Details for Query 7</h5><div class="jn-dag"><div class="jn-cols"><div class="sq jn-col"><div class="sq-n ex"><b>Exchange</b><div>shuffle records written: ${UI.rec(inL)}</div></div><div class="sq-n"><b>Sort</b></div></div><div class="sq jn-col"><div class="sq-n ex"><b>Exchange</b><div>shuffle records written: ${UI.rec(inR)}</div></div><div class="sq-n"><b>Sort</b></div></div></div><div class="jn-join"><div class="sq-n jn-node"><b>SortMergeJoin</b><div>Inner</div><div class="${ratio >= WARN ? 'jn-hl' : ''}">number of output rows: ${UI.rec(out)}</div></div></div></div>` + ins,
        'Recreación ilustrativa. En el Spark UI la señal es <code>number of output rows</code> del join mucho mayor que los records de entrada. En el query profile, cambia la métrica del DAG a Rows; el insight <code>EXPLODING_JOIN</code> sale en Performance insights.');
    }
    [sk, sdl, sdr].forEach(x => x.addEventListener('input', draw));
    draw();
  } catch (e) { console.error('joins: exploding', e); } }
})();
