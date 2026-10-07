/* Mantenimiento de Delta: simulador de la vida de una tabla y comparación managed vs external.
   Los tamaños son ilustrativos; las reglas siguen la doc (retención de VACUUM, objetivo de 256 MB,
   REORG PURGE solo sobre archivos con deletion vectors). */
(function () {
  'use strict';

  /* ---------- 1. vida de una tabla ---------- */
  if (document.getElementById('md-sim')) { try {
    const TARGET = 256;              // MB: objetivo autotuned para tablas < 2,56 TB
    const SMALL = 0.75 * TARGET;     // regla ilustrativa: candidatos a compactar
    const FRAC = 0.05;               // 5 % de filas por UPDATE/DELETE
    const $ = id => document.getElementById(id);
    const fmt = mb => mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : Math.round(mb) + ' MB';
    let S;

    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

    function init() {
      S = { day: 0, files: [], versions: [], nextId: 1, rewritten: 0, dv: $('md-dv').checked,
            ret: S ? S.ret : 7, fresh: new Set(), gone: new Set(), r: rng(42) };
      for (let i = 0; i < 4; i++) addFile(240);
      commit('CREATE TABLE AS SELECT');
      S.fresh = new Set();
    }
    const active = () => S.files.filter(f => f.removedDay === null);
    const unref = () => S.files.filter(f => f.removedDay !== null && !f.goneFlag);
    function addFile(mb) { const f = { id: S.nextId++, mb, dv: 0, removedDay: null, goneFlag: false }; S.files.push(f); S.fresh.add(f.id); return f; }
    function removeFile(f) { f.removedDay = S.day; }
    function commit(op) { S.versions.push({ v: S.versions.length, day: S.day, op, ids: active().map(f => f.id) }); }
    function verStatus(ver) {
      if (ver.v === S.versions.length - 1) return 'cur';
      if (S.day - ver.day >= S.ret) {
        const missing = ver.ids.some(id => { const f = S.files.find(x => x.id === id); return !f || f.goneFlag; });
        return missing ? 'gone' : 'exp';
      }
      return 'ok';
    }
    function pick(k) {
      const pool = active().slice(), out = [];
      while (out.length < k && pool.length) {
        const tot = pool.reduce((a, f) => a + f.mb, 0); let x = S.r() * tot, i = 0;
        while (i < pool.length - 1 && x > pool[i].mb) { x -= pool[i].mb; i++; }
        out.push(pool.splice(i, 1)[0]);
      }
      return out;
    }
    const sql = s => `<code>${s}</code>`;

    const OPS = {
      insert() {
        const n = 3; let tot = 0;
        for (let i = 0; i < n; i++) { const mb = Math.round(6 + S.r() * 18); tot += mb; addFile(mb); }
        commit('INSERT');
        return `${sql('INSERT INTO ventas SELECT …')} agrega ${n} archivos pequeños (${fmt(tot)} en total). Nada se reescribe. Cada carga pequeña suma archivos que una query tendrá que abrir.`;
      },
      del() { return modify('DELETE'); },
      upd() { return modify('UPDATE'); },
      optimize() {
        const cand = active().filter(f => f.mb < SMALL);
        const bigDv = active().filter(f => f.mb >= SMALL && f.dv > 0);
        if (cand.length < 2 && !cand.some(f => f.dv > 0)) {
          return `${sql('OPTIMIZE ventas')} no encuentra archivos que compactar: no crea versión nueva. El bin-packing es idempotente.` +
            (bigDv.length ? ` Ojo: ${bigDv.length} archivo(s) grande(s) siguen con deletion vectors; la compactación no los toca.` : '');
        }
        const sizes = cand.map(f => f.mb * (1 - f.dv)).sort((a, b) => b - a);
        const bins = [];
        sizes.forEach(s => { const j = bins.findIndex(x => x + s <= TARGET); if (j >= 0) bins[j] += s; else bins.push(s); });
        const dvApplied = cand.filter(f => f.dv > 0).length;
        cand.forEach(removeFile);
        let out = 0; bins.forEach(b => { addFile(Math.max(1, Math.round(b))); out += b; });
        S.rewritten += out;
        commit('OPTIMIZE');
        return `${sql('OPTIMIZE ventas')} junta ${cand.length} archivos pequeños en ${bins.length} (reescribe ${fmt(out)}). ` +
          (dvApplied ? `De paso aplica los DV de ${dvApplied} de ellos. ` : '') +
          (bigDv.length ? `<b>${bigDv.length} archivo(s) grande(s) con DV no eran candidatos</b>: sus filas marcadas siguen ahí. Para eso existe REORG … APPLY (PURGE). ` : '') +
          `Los archivos viejos quedan sin referencia, pero siguen en el storage para el time travel.`;
      },
      reorg() {
        const t = active().filter(f => f.dv > 0);
        if (!t.length) return `${sql('REORG TABLE ventas APPLY (PURGE)')} no encuentra soft-deletes: no reescribe nada (es idempotente).`;
        let out = 0;
        t.forEach(f => { removeFile(f); const mb = Math.max(1, Math.round(f.mb * (1 - f.dv))); addFile(mb); out += mb; });
        S.rewritten += out;
        commit('REORG');
        return `${sql('REORG TABLE ventas APPLY (PURGE)')} reescribe solo los ${t.length} archivo(s) con deletion vectors (${fmt(out)}). Las filas borradas salen de los archivos actuales, pero siguen en los viejos hasta que VACUUM los borre pasada la retención.`;
      },
      vacuum() {
        S.gone = new Set();
        const old = unref();
        const elig = old.filter(f => S.day - f.removedDay >= S.ret);
        const wait = old.filter(f => S.day - f.removedDay < S.ret);
        let freed = 0; elig.forEach(f => { f.goneFlag = true; S.gone.add(f.id); freed += f.mb; });
        let msg = `${sql('VACUUM ventas')} `;
        if (elig.length) msg += `borra ${elig.length} archivo(s) sin referencia con ${S.ret} días o más (${fmt(freed)} liberados). Las versiones que los usaban ya no admiten time travel. `;
        else msg += 'no borra nada. ';
        if (wait.length) { const left = Math.min(...wait.map(f => S.ret - (S.day - f.removedDay))); msg += `${wait.length} archivo(s) sin referencia siguen protegidos por la retención de ${S.ret} días; el primero se podrá borrar en ${left} día(s).`; }
        else if (!elig.length) msg += 'No hay archivos sin referencia.';
        return msg + ' VACUUM deja su auditoría en el log (DESCRIBE HISTORY).';
      },
      day(n) {
        S.day += n;
        const ready = unref().filter(f => S.day - f.removedDay >= S.ret).length;
        return `Pasan ${n} día(s): ahora es el día ${S.day}. ` + (ready ? `${ready} archivo(s) sin referencia ya superan la retención: el próximo VACUUM los borra.` : 'Ningún archivo sin referencia supera aún la retención.');
      }
    };

    function modify(kind) {
      const t = pick(2);
      if (S.dv) {
        let newMb = 0;
        t.forEach(f => { f.dv = Math.min(0.6, f.dv + FRAC); newMb += f.mb * FRAC; });
        let extra = '';
        if (kind === 'UPDATE') { const mb = Math.max(1, Math.round(newMb)); addFile(mb); S.rewritten += mb; extra = ` Las filas con los valores nuevos van a un archivo adicional de ${fmt(mb)}.`; }
        commit(kind);
        return `${sql(kind === 'DELETE' ? 'DELETE FROM ventas WHERE …' : 'UPDATE ventas SET … WHERE …')} con deletion vectors: marca el ${Math.round(FRAC * 100)} % de las filas en ${t.length} archivos sin reescribirlos.${extra} Las lecturas aplican las marcas al vuelo.`;
      }
      let out = 0;
      t.forEach(f => { removeFile(f); const mb = Math.max(1, Math.round(f.mb * (1 - f.dv) * (kind === 'DELETE' ? 1 - FRAC : 1))); addFile(mb); out += mb; });
      S.rewritten += out;
      commit(kind);
      return `${sql(kind === 'DELETE' ? 'DELETE FROM ventas WHERE …' : 'UPDATE ventas SET … WHERE …')} sin deletion vectors: para cambiar el ${Math.round(FRAC * 100)} % de las filas reescribe ${t.length} archivos completos (${fmt(out)}). Los originales quedan sin referencia.`;
    }

    function render(msg) {
      const act = active(), old = unref();
      const avg = act.length ? act.reduce((a, f) => a + f.mb, 0) / act.length : 0;
      const stor = S.files.filter(f => !f.goneFlag).reduce((a, f) => a + f.mb, 0);
      const st = S.versions.map(verStatus);
      const tt = st.filter(s => s === 'ok' || s === 'cur').length;
      const dvN = act.filter(f => f.dv > 0).length;
      $('md-stats').innerHTML = [
        [act.length, 'archivos activos', act.length > 14],
        [fmt(avg), 'tamaño medio', avg < 64],
        [dvN, 'archivos con DV', false],
        [fmt(S.rewritten), 'MB reescritos (acum.)', S.rewritten > 1500],
        [act.length + old.length, 'archivos en el storage', old.length > act.length],
        [fmt(stor), 'storage total', false],
        [tt + ' / ' + S.versions.length, 'versiones con time travel', false],
        ['día ' + S.day, 'retención ' + S.ret + ' días', false]
      ].map(([b, s, w]) => `<div class="${w ? 'warn' : ''}"><b>${b}</b><span>${s}</span></div>`).join('');

      const tile = (f, kind) => {
        const h = Math.round(16 + Math.min(f.mb, TARGET) / TARGET * 44);
        let lab = Math.round(f.mb) + '', cls = 'md-f ' + kind, tip;
        if (kind === 'act') tip = `${Math.round(f.mb)} MB` + (f.dv ? ` · ${Math.round(f.dv * 100)} % de filas marcadas por DV` : '');
        if (kind === 'old') { const left = S.ret - (S.day - f.removedDay); lab = left > 0 ? left + ' d' : 'listo'; tip = left > 0 ? `${Math.round(f.mb)} MB · VACUUM podrá borrarlo en ${left} día(s)` : `${Math.round(f.mb)} MB · el próximo VACUUM lo borra`; }
        if (kind === 'gone') { lab = '×'; tip = 'borrado por VACUUM'; }
        if (S.fresh.has(f.id) && kind === 'act') cls += ' new';
        return `<div class="${cls}" style="height:${h}px" title="${tip}">${f.dv && kind === 'act' ? `<i style="height:${Math.round(f.dv * 100)}%"></i>` : ''}<span>${lab}</span></div>`;
      };
      const gone = S.files.filter(f => S.gone.has(f.id));
      $('md-files').innerHTML =
        `<div class="md-grp"><p>Referenciados por la versión actual (v${S.versions.length - 1})</p><div class="md-row">${act.map(f => tile(f, 'act')).join('')}</div></div>` +
        `<div class="md-grp"><p>Sin referencia: solo sirven al time travel${old.length ? ' · la etiqueta dice en cuántos días VACUUM podrá borrarlos' : ''}</p><div class="md-row">${old.length || gone.length ? old.map(f => tile(f, 'old')).join('') + gone.map(f => tile(f, 'gone')).join('') : '<span class="md-empty">ninguno</span>'}</div></div>`;

      const LBL = { cur: 'actual', ok: 'time travel', exp: 'fuera de retención', gone: 'archivos borrados' };
      const vs = S.versions.slice(-12);
      $('md-vers').innerHTML = `<p>Versiones (DESCRIBE HISTORY)${S.versions.length > 12 ? ' · últimas 12' : ''}</p><div class="md-row">` +
        vs.map(v => `<span class="md-v ${verStatus(v)}" title="${LBL[verStatus(v)]}"><b>v${v.v}</b> día ${v.day} · ${v.op}<em>${LBL[verStatus(v)]}</em></span>`).join('') + '</div>';
      $('md-log').innerHTML = msg;
    }

    function run(op) {
      S.fresh = new Set(); S.gone = new Set();
      S.files = S.files.filter(f => !f.goneFlag);
      let msg;
      switch (op) {
        case 'insert': msg = OPS.insert(); break;
        case 'update': msg = OPS.upd(); break;
        case 'delete': msg = OPS.del(); break;
        case 'optimize': msg = OPS.optimize(); break;
        case 'reorg': msg = OPS.reorg(); break;
        case 'vacuum': msg = OPS.vacuum(); break;
        case 'day1': msg = OPS.day(1); break;
        case 'day7': msg = OPS.day(7); break;
        default: init(); msg = 'Tabla reiniciada: 4 archivos de 240 MB creados con un CTAS en el día 0.';
      }
      render(msg);
    }

    document.querySelectorAll('[data-md-op]').forEach(b => b.addEventListener('click', () => run(b.dataset.mdOp)));
    $('md-dv').addEventListener('change', e => {
      S.fresh = new Set(); S.gone = new Set(); S.files = S.files.filter(f => !f.goneFlag);
      S.dv = e.target.checked; commit('SET TBLPROPERTIES');
      render(`${sql(`ALTER TABLE ventas SET TBLPROPERTIES ('delta.enableDeletionVectors' = ${S.dv})`)}. ` +
        (S.dv ? 'Los próximos UPDATE y DELETE marcarán filas en vez de reescribir archivos.' : 'Los próximos UPDATE y DELETE reescriben archivos completos. Las marcas que ya existen no desaparecen: se aplican cuando el archivo se reescriba.'));
    });
    document.querySelectorAll('[data-md-ret]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-md-ret]').forEach(x => x.setAttribute('aria-pressed', x === b));
      S.fresh = new Set(); S.gone = new Set(); S.files = S.files.filter(f => !f.goneFlag);
      S.ret = +b.dataset.mdRet; commit('SET TBLPROPERTIES');
      render(`${sql(`ALTER TABLE ventas SET TBLPROPERTIES ('delta.deletedFileRetentionDuration' = '${S.ret} days')`)}. ` +
        (S.ret > 7 ? 'Más días de time travel, a cambio de más archivos viejos en el storage. Para que el historial también llegue, logRetentionDuration debe ser igual o mayor (30 días por defecto).' : 'La retención por defecto: 7 días.'));
    }));
    S = null; init();
    render('Tabla con 4 archivos de 240 MB creada con un CTAS en el día 0. Pulsa una operación.');
  } catch (e) { console.error('mantenimiento-delta: simulador', e); } }

  /* ---------- 2. managed vs external ---------- */
  if (document.getElementById('md-mx-list')) { try {
    const T = [
      ['Compactar archivos pequeños (OPTIMIZE)',
        ['auto', 'Predictive optimization detecta cuándo vale la pena y lo corre en serverless.'],
        ['manual', 'Programa un job de OPTIMIZE; la doc sugiere empezar con uno diario. Auto compaction ayuda, pero en tablas de más de 1 TB no lo reemplaza.']],
      ['Clustering incremental de liquid clustering',
        ['auto', 'El OPTIMIZE de predictive optimization clusteriza lo nuevo. Con CLUSTER BY AUTO también elige y cambia las claves.'],
        ['manual', 'OPTIMIZE programado, cada 1 o 2 horas en tablas con muchas escrituras. CLUSTER BY AUTO no está disponible.']],
      ['Borrar archivos sin referencia (VACUUM)',
        ['auto', 'Predictive optimization corre VACUUM con deletedFileRetentionDuration, y nunca con menos de 7 días.'],
        ['manual', 'Programa VACUUM. Sin él, el storage crece con cada UPDATE, DELETE y OPTIMIZE.']],
      ['Estadísticas (ANALYZE y data skipping)',
        ['auto', 'Corre ANALYZE y elige las columnas de skipping según tus filtros, sin el límite de 32 columnas.'],
        ['manual', 'Estadísticas en las primeras 32 columnas. Ajusta delta.dataSkippingStatsColumns y corre ANALYZE tú.']],
      ['Tamaño de archivo',
        ['auto', 'Databricks lo ajusta solo. Si fijas delta.targetFileSize, solo lo respeta OPTIMIZE.'],
        ['mix', 'Hay autotuning según el tamaño de la tabla, pero tú decides auto compaction, optimized writes y delta.targetFileSize.']],
      ['Auto compaction',
        ['auto', 'Auto compaction en background, sin necesidad de predictive optimization. Solo quita las configuraciones legacy.'],
        ['manual', "Actívala con la propiedad delta.autoOptimize.autoCompact = 'auto' o con la conf de sesión."]],
      ['Archivos de datos tras DROP TABLE',
        ['auto', 'Se borran al terminar el periodo de recuperación (7 días por defecto). Mientras tanto puedes usar UNDROP TABLE.'],
        ['manual', 'Unity Catalog borra solo la metadata. Los archivos quedan en el storage hasta que los borres.']],
      ['Aplicar soft-deletes (REORG … APPLY (PURGE))',
        ['unk', 'La página de predictive optimization no lo lista. Su system table tiene una operación PURGE, documentada junto a auto time-to-live. Trátalo como manual hasta verificarlo.'],
        ['manual', 'Manual: REORG TABLE … APPLY (PURGE) y, pasada la retención, VACUUM.']]
    ];
    const PILL = { auto: '<span class="pill ok">automático</span>', manual: '<span class="pill bad">manual</span>', mix: '<span class="pill warn">mixto</span>', unk: '<span class="pill warn">sin confirmar</span>' };
    function draw(kind) {
      const i = kind === 'managed' ? 1 : 2;
      const auto = T.filter(r => r[i][0] === 'auto').length;
      document.getElementById('md-mx-sum').innerHTML = kind === 'managed'
        ? `<div><span class="pill ok">${auto} de ${T.length}</span>tareas corren solas con predictive optimization activo. Se paga como serverless jobs.</div>`
        : `<div><span class="pill bad">${auto} de ${T.length}</span>tareas automáticas. El resto son jobs que tú programas, vigilas y pagas en tu compute.</div>`;
      document.getElementById('md-mx-list').innerHTML = T.map(r => `<div class="md-task"><div class="md-task-h">${PILL[r[i][0]]}<b>${r[0]}</b></div><p>${r[i][1]}</p></div>`).join('');
    }
    const g = document.getElementById('md-mx');
    g.querySelectorAll('[data-md-mx]').forEach(b => b.addEventListener('click', () => {
      g.querySelectorAll('[data-md-mx]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(b.dataset.mdMx);
    }));
    draw('managed');
  } catch (e) { console.error('mantenimiento-delta: managed vs external', e); } }
})();
