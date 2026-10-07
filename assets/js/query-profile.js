/* Query profile: recreación interactiva + quiz "elige el diagnóstico". Números ilustrativos. */
(function(){
  const sim=document.getElementById('qp-sim');
  const quiz=document.getElementById('qz-list');
  if(!sim && !quiz) return;
  const SPL=window.SPL||{};
  const NS='http://www.w3.org/2000/svg';
  const el=SPL.el||((tag,attrs,txt)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;});
  const GiB=1024**3, MiB=1024**2, KiB=1024;

  /* ---------- formatos ---------- */
  const fBytes=b=>{if(!b)return '0 B';const u=['B','KiB','MiB','GiB','TiB'];let i=0;while(b>=1024&&i<u.length-1){b/=1024;i++;}return (i&&b<100?b.toFixed(1):Math.round(b))+' '+u[i];};
  const fRowsC=n=>n>=1e9?(n/1e9).toFixed(1).replace(/\.0$/,'')+'B':n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'K':String(Math.round(n));
  const fRows=n=>Math.round(n).toLocaleString('en-US');
  const fT=s=>s>=3600?(s/3600).toFixed(1)+' h':s>=120?(s/60).toFixed(1)+' min':s>=1?(s<10?s.toFixed(1):Math.round(s))+' s':Math.round(s*1000)+' ms';
  const pct=(a,b)=>b?Math.round(100*a/b):0;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ---------- catálogo de insights (texto parafraseado de la doc) ---------- */
  const INS={
    COVERAGE_FILTER_KEYS_CLUSTERING:{cat:'Query optimization',d:'La tabla está clusterizada por claves que el filtro del scan no usa.',r:'Añade filtros sobre las claves de clustering para leer menos bytes.'},
    EXPLODING_JOIN:{cat:'Query optimization',d:'El join produce muchas más filas de las que lee.',r:'Decide qué subconjunto necesitas y ajusta la condición del join o reduce las filas de entrada de ambos lados.'},
    DATA_SPILL:{cat:'Compute and resource',d:'Hubo spill a disco porque los datos no cabían en memoria.',r:'Sube el tamaño del warehouse para tener más memoria. Reduce filas, columnas o el tamaño de columnas grandes (strings, arrays, maps, structs).'},
    COVERAGE_PHOTON:{cat:'Query optimization',d:'Photon no puede acelerar esta operación y la query usa el motor estándar.',r:'Revisa las limitaciones de Photon y ajusta la query a un camino soportado.'}
  };

  /* ---------- las cuatro queries ---------- */
  const Q={
    scan:{
      compute:'Serverless', id:'01f0a7c2-3d4e-1b9a-9c1e-7f2a5b80d4e1',
      sql:`SELECT cliente_id, SUM(monto) AS total
FROM ventas                       -- CLUSTER BY (fecha_venta)
WHERE cliente_id = 48213
GROUP BY cliente_id`,
      wc:[0.4,1.6,92.0], agg:11520, photon:100,
      io:{rr:6.2e9, br:501*GiB, fr:4010, fp:86, rp:1, sp:0, sh:18*KiB},
      ins:['COVERAGE_FILTER_KEYS_CLUSTERING'],
      nodes:[
        {id:'s',n:'Scan ventas',ph:1,c:'C',r:0,t:9900,m:1.9*GiB,rw:6.2e9,x:['Files read: 4,010','Files pruned: 86 (2%)','Size of files read: 501 GiB','Clustering keys: fecha_venta']},
        {id:'f',n:'Filter',ph:1,c:'C',r:1,t:1040,m:64*MiB,rw:1240,in:['s'],x:['Condición: cliente_id = 48213','Rows in: 6,200,000,000']},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:2,t:350,m:210*MiB,rw:128,in:['f']},
        {id:'x',n:'Shuffle',ph:1,c:'C',r:3,t:115,m:96*MiB,rw:128,in:['a1'],x:['Data written: 18 KiB']},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:4,t:60,m:12*MiB,rw:1,in:['x']},
        {id:'r',n:'Result',ph:1,c:'C',r:5,t:55,m:1*MiB,rw:1,in:['a2']}
      ],
      hot:'s', lookMetric:'rows',
      look:'El Scan se lleva el 86% del tiempo de tareas. Lee 4,010 de los 4,096 archivos de la tabla y solo descarta el 2%. Después, el Filter deja 1,240 filas de 6,200 millones. Leíste casi toda la tabla para quedarte con una fracción mínima.',
      fix:[
        'La tabla está clusterizada por <code>fecha_venta</code> y el filtro usa <code>cliente_id</code>. Añade <code>cliente_id</code> a las claves (<code>ALTER TABLE ventas CLUSTER BY (fecha_venta, cliente_id)</code>) y reclusteriza con <code>OPTIMIZE ventas FULL</code>, o deja que Databricks elija con <code>CLUSTER BY AUTO</code>. Ver <a href="liquid-clustering.html">Liquid clustering</a>.',
        'Si el caso de uso admite un rango de fechas, añádelo al <code>WHERE</code>. Es lo que pide el insight <code>COVERAGE_FILTER_KEYS_CLUSTERING</code>.',
        'Más cómputo no ayuda mucho: leería los mismos 501 GiB con más cores.'
      ]
    },
    join:{
      compute:'SQL warehouse', id:'01f0a7c9-88b1-1c42-a3f0-2b6e91d0c7a4',
      sql:`SELECT e.estado, COUNT(*) AS n
FROM pedidos p
JOIN eventos_envio e
  ON p.cliente_id = e.cliente_id   -- debía ser pedido_id
WHERE p.fecha = '2026-09-30'
GROUP BY e.estado`,
      wc:[0.3,0.9,212.0], agg:21960, photon:100,
      io:{rr:20.4e6, br:1.6*GiB, fr:212, fp:3140, rp:6, sp:0, sh:0.9*GiB},
      ins:['EXPLODING_JOIN'],
      nodes:[
        {id:'sp',n:'Scan pedidos',ph:1,c:'L',r:0,t:220,m:0.3*GiB,rw:2.4e6,x:['Files read: 12','Files pruned: 3,140 (99.6%)']},
        {id:'se',n:'Scan eventos_envio',ph:1,c:'R',r:0,t:880,m:0.6*GiB,rw:18e6,x:['Files read: 200','Files pruned: 0']},
        {id:'xl',n:'Shuffle',ph:1,c:'L',r:1,t:330,m:0.4*GiB,rw:2.4e6,in:['sp'],x:['Partitioning: hash(cliente_id)']},
        {id:'xr',n:'Shuffle',ph:1,c:'R',r:1,t:1210,m:0.9*GiB,rw:18e6,in:['se'],x:['Partitioning: hash(cliente_id)']},
        {id:'j',n:'Shuffled Hash Join',ph:1,c:'C',r:2,t:12700,m:9.4*GiB,rw:3.1e9,in:['xl','xr'],x:['Join type: Inner','Condición: p.cliente_id = e.cliente_id','Rows in: 2,400,000 + 18,000,000','Rows out ≈ 150 × rows in']},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:3,t:6400,m:1.1*GiB,rw:3200,in:['j'],x:['Rows in: 3,100,000,000']},
        {id:'x',n:'Shuffle',ph:1,c:'C',r:4,t:90,m:64*MiB,rw:3200,in:['a1']},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:5,t:70,m:8*MiB,rw:6,in:['x']},
        {id:'r',n:'Result',ph:1,c:'C',r:6,t:60,m:1*MiB,rw:6,in:['a2']}
      ],
      hot:'j', lookMetric:'rows',
      look:'El Shuffled Hash Join recibe 20.4 millones de filas y entrega 3,100 millones. Ese join y el agregado que procesa su salida suman el 87% del tiempo de tareas. El pruning va bien (3,140 archivos descartados en pedidos), así que el problema está en el join.',
      fix:[
        'La condición une por <code>cliente_id</code>, que se repite muchas veces en las dos tablas. La clave correcta es <code>pedido_id</code>. Corrige la condición, o deduplica un lado antes del join si de verdad unes por cliente. Ver <a href="joins.html">Joins</a>.',
        'Es lo que describe el insight <code>EXPLODING_JOIN</code>: revisa qué subconjunto necesitas y ajusta la condición o reduce las filas de entrada.',
        'Un warehouse más grande solo fabrica las 3,100 millones de filas más rápido.'
      ]
    },
    spill:{
      compute:'SQL warehouse', id:'01f0a7d3-5f20-17e8-b6c1-9d34e0a2f81b',
      sql:`SELECT cliente_id,
       COUNT(DISTINCT sesion_id)          AS sesiones,
       collect_list(extrae_dominio(url))  AS dominios  -- extrae_dominio: UDF de Python
FROM clics                                         -- CLUSTER BY (fecha)
WHERE fecha >= '2026-09-01'
GROUP BY cliente_id`,
      wc:[0.4,1.1,486.0], agg:53280, photon:91,
      io:{rr:4.8e9, br:610*GiB, fr:1450, fp:4350, rp:41e6, sp:212*GiB, sh:384*GiB},
      ins:['DATA_SPILL','COVERAGE_PHOTON'],
      nodes:[
        {id:'s',n:'Scan clics',ph:1,c:'C',r:0,t:5300,m:2.2*GiB,rw:4.8e9,x:['Files read: 1,450','Files pruned: 4,350 (75%)']},
        {id:'u',n:'Python UDF',ph:0,c:'C',r:1,t:4200,m:1.4*GiB,rw:4.8e9,in:['s'],x:['Función: extrae_dominio','Motor: estándar (Photon no soporta UDF)']},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:2,t:3700,m:6.0*GiB,rw:4.5e9,in:['u'],x:['Rows in: 4,800,000,000','Casi no reduce filas']},
        {id:'x',n:'Shuffle',ph:1,c:'C',r:3,t:13400,m:3.1*GiB,rw:4.5e9,in:['a1'],x:['Data written: 384 GiB','Partitioning: hash(cliente_id)']},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:4,t:26300,m:31.5*GiB,rw:41e6,in:['x'],x:['Spill to disk: 212 GiB']},
        {id:'r',n:'Result',ph:1,c:'C',r:5,t:380,m:0.2*GiB,rw:41e6,in:['a2']}
      ],
      hot:'a2', lookMetric:'mem',
      look:'El Hash Aggregate final se lleva el 49% del tiempo, llega a 31.5 GiB de memoria y escribe 212 GiB de spill a disco. Justo antes, el Shuffle mueve 384 GiB y suma otro 25%. El agregado parcial casi no reduce filas (de 4,800 a 4,500 millones), así que casi todo viaja por la red. El nodo gris es la UDF de Python, que corre fuera de Photon.',
      fix:[
        '<code>collect_list</code> guarda todas las filas de cada cliente: el agregado parcial no puede reducir y el final tiene que juntar listas enormes. Si no necesitas la lista completa, quítala o cámbiala por algo que sí se agregue, como <code>COUNT(DISTINCT ...)</code>. El insight <code>DATA_SPILL</code> recomienda reducir filas, columnas o el tamaño de columnas grandes. Ver <a href="remedios.html">Remedios</a> y <a href="shuffle.html">Shuffle</a>.',
        'En un SQL warehouse, la otra recomendación de <code>DATA_SPILL</code> es subir el tamaño para tener más memoria.',
        'Si el spill se concentra en pocas claves, es skew. Busca el insight <code>DATA_SKEW</code> antes de tocar particiones (<a href="aqe.html">AQE</a>).',
        'La UDF de Python corre fuera de Photon, que no soporta UDF. Si puedes expresarla con funciones nativas de SQL (por ejemplo <code>parse_url</code>), Photon tiene la opción de ejecutarla. Es lo que señala <code>COVERAGE_PHOTON</code>.'
      ]
    },
    ok:{
      compute:'Serverless', id:'01f0a7e1-0c7d-1a55-8e42-c1f7b39a6d02',
      sql:`SELECT c.segmento, SUM(v.monto) AS total
FROM ventas v                       -- CLUSTER BY (fecha_venta)
JOIN clientes c ON v.cliente_id = c.cliente_id
WHERE v.fecha_venta BETWEEN '2026-09-01' AND '2026-09-07'
GROUP BY c.segmento`,
      wc:[0.2,0.5,3.6], agg:96, photon:100,
      io:{rr:41.1e6, br:1.2*GiB, fr:96, fp:4000, rp:5, sp:0, sh:2*MiB},
      ins:[],
      nodes:[
        {id:'sv',n:'Scan ventas',ph:1,c:'L',r:0,t:46,m:0.5*GiB,rw:41e6,x:['Files read: 96','Files pruned: 4,000 (98%)']},
        {id:'sc',n:'Scan clientes',ph:1,c:'R',r:0,t:4,m:40*MiB,rw:120000,x:['Files read: 2']},
        {id:'bx',n:'Broadcast Exchange',ph:1,c:'R',r:1,t:3,m:24*MiB,rw:120000,in:['sc'],x:['Data size: 6 MiB']},
        {id:'j',n:'Broadcast Hash Join',ph:1,c:'C',r:2,t:24,m:64*MiB,rw:41e6,in:['sv','bx'],x:['Join type: Inner','Build side: clientes (broadcast)']},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:3,t:14,m:32*MiB,rw:640,in:['j']},
        {id:'x',n:'Shuffle',ph:1,c:'C',r:4,t:2,m:8*MiB,rw:640,in:['a1']},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:5,t:2,m:2*MiB,rw:5,in:['x']},
        {id:'r',n:'Result',ph:1,c:'C',r:6,t:1,m:1*MiB,rw:5,in:['a2']}
      ],
      hot:null, lookMetric:'time',
      look:'El operador más caro es el Scan de ventas, con el 48% del tiempo, y eso es normal. Lee 96 archivos y descarta 4,000 (98%) gracias al filtro por <code>fecha_venta</code>. La tabla pequeña viaja por broadcast, así que el único Shuffle mueve 640 filas. Las filas bajan en cada paso y no hay spill.',
      fix:[
        'Nada urgente. Guarda este perfil como referencia de una query sana: Scan arriba en Top operators con pruning alto, join por broadcast con la tabla pequeña, sin spill y con filas que bajan en cada paso.'
      ]
    }
  };

  /* ---------- grafo ---------- */
  const COLX={L:88,R:272,C:180}, NW=164, NH=40, RH=56, TOP=10;
  const heat=v=>{ // 0..1 → color claro a naranja
    const s=[[0,[245,247,249]],[0.5,[251,211,184]],[1,[232,105,63]]];
    let a=s[0],b=s[2]; if(v<=0.5){a=s[0];b=s[1];v=v/0.5;}else{a=s[1];b=s[2];v=(v-0.5)/0.5;}
    const c=a[1].map((x,i)=>Math.round(x+(b[1][i]-x)*v)); return `rgb(${c.join(',')})`;};
  function metricInfo(nodes,metric){
    const tot=nodes.reduce((s,n)=>s+n.t,0);
    if(metric==='time'){const mx=Math.max(...nodes.map(n=>n.t));return n=>({h:n.t/mx,share:n.t/tot,txt:fT(n.t)+' · '+Math.round(100*n.t/tot)+'%'});}
    if(metric==='mem'){const mx=Math.max(...nodes.map(n=>n.m));return n=>({h:n.m/mx,share:n.m/mx,txt:fBytes(n.m)});}
    const mx=Math.log10(Math.max(...nodes.map(n=>n.rw))+1);
    return n=>{const h=Math.log10(n.rw+1)/mx;return {h,share:h,txt:fRowsC(n.rw)+' rows'};};
  }
  function drawDag(svg,nodes,metric,sel,hot,interactive){
    svg.textContent='';
    const rows=Math.max(...nodes.map(n=>n.r))+1, H=TOP+rows*RH-6;
    svg.setAttribute('viewBox',`0 0 360 ${H}`);
    const pos={}; nodes.forEach(n=>{pos[n.id]={x:COLX[n.c]-NW/2,y:TOP+n.r*RH};});
    const gE=el('g',{class:'qp-edges'}); svg.appendChild(gE);
    nodes.forEach(n=>(n.in||[]).forEach(p=>{const a=pos[p],b=pos[n.id];
      const x1=a.x+NW/2,y1=a.y+NH,x2=b.x+NW/2,y2=b.y,my=(y2-y1)/2;
      gE.appendChild(el('path',{d:`M${x1} ${y1} C${x1} ${y1+my} ${x2} ${y2-my} ${x2} ${y2-3}`}));
      gE.appendChild(el('path',{class:'qp-ah',d:`M${x2-3.5} ${y2-6} L${x2} ${y2-1} L${x2+3.5} ${y2-6}`}));}));
    const f=metricInfo(nodes,metric);
    nodes.forEach(n=>{const p=pos[n.id], v=f(n);
      const g=el('g',{class:'qp-node'+(n.id===sel?' sel':'')+(n.id===hot?' hot':''),'data-id':n.id,transform:`translate(${p.x},${p.y})`});
      if(interactive){g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',`${n.n}: ${v.txt}${n.ph?'':' (no Photon)'}`);}
      if(n.id===hot) g.appendChild(el('rect',{class:'qp-hotring',x:-4,y:-4,width:NW+8,height:NH+8,rx:7}));
      g.appendChild(el('rect',{class:'qp-nbox',x:0,y:0,width:NW,height:NH,rx:4,style:`fill:${heat(v.h)}`}));
      g.appendChild(el('rect',{x:0,y:0,width:5,height:NH,rx:2,class:n.ph?'qp-ph':'qp-noph'}));
      g.appendChild(el('text',{x:11,y:15,class:'qp-nl'},n.n.length>27?n.n.slice(0,26)+'…':n.n));
      g.appendChild(el('text',{x:11,y:29,class:'qp-nv'},v.txt));
      g.appendChild(el('rect',{x:11,y:NH-6,width:Math.max(1.5,(NW-20)*v.share),height:2.5,rx:1,class:'qp-nbar'}));
      const t=el('title',{},`${n.n} · ${n.ph?'Photon':'motor estándar'} · ${v.txt}`); g.appendChild(t);
      svg.appendChild(g);});
  }

  /* ---------- simulador principal ---------- */
  if(sim){ try{
    const st={q:'scan',metric:'time',tab:'details',sel:'s'};
    const frame=document.getElementById('qp-frame');
    const METRICS=[['time','Time spent'],['mem','Memory peak'],['rows','Rows']];
    const TABS=[['details','Details'],['top','Top operators'],['text','Query text'],['ins','Performance insights']];
    const funnel='<svg class="qp-fun" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 2h10L7.2 6.6V10L4.8 11V6.6z"/></svg>';
    function skeleton(){
      const q=Q[st.q], wall=q.wc.reduce((a,b)=>a+b,0);
      frame.innerHTML=`<div class="qp-frame">
        <div class="qp-top"><span class="qp-crumb">Query History ›</span><b>Query profile</b><span class="qp-status">Finished</span><span class="qp-meta">${q.compute} · ${fT(wall)}</span></div>
        <div class="qp-body">
          <div class="qp-side">
            <div class="qp-tabs" role="tablist" aria-label="Paneles del perfil">${TABS.map(([k,l])=>`<button type="button" role="tab" data-tab="${k}">${l}${k==='ins'&&q.ins.length?` <span class="qp-cnt">${q.ins.length}</span>`:''}</button>`).join('')}</div>
            <div class="qp-pane" id="qp-pane" role="tabpanel"></div>
          </div>
          <div class="qp-main">
            <div class="qp-seg" role="group" aria-label="Métrica del grafo">${METRICS.map(([k,l])=>`<button type="button" data-metric="${k}">${l}</button>`).join('')}</div>
            <svg class="qp-dag" id="qp-dag" role="img" aria-label="Grafo de operadores"></svg>
            <p class="qp-gnote" id="qp-gnote"></p>
            <div class="qp-op" id="qp-op"></div>
          </div>
        </div></div>
        <p class="ui-cap">Recreación ilustrativa con números inventados. Morado: operador Photon. Gris: motor estándar. El color de fondo y la barra de cada nodo siguen la métrica elegida. Haz clic en un nodo para ver sus métricas.</p>`;
    }
    function pane(){
      const q=Q[st.q], wall=q.wc.reduce((a,b)=>a+b,0), P=document.getElementById('qp-pane');
      frame.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===st.tab;b.setAttribute('aria-selected',on);b.classList.toggle('on',on);});
      if(st.tab==='details'){
        const io=q.io, tf=io.fr+io.fp, wcl=[['Scheduling','#8AA4BF'],['Optimizing query & pruning files','#C9A227'],['Executing','#2F7FC1']];
        const par=q.agg/q.wc[2];
        P.innerHTML=`
          <div class="qp-sec"><div class="qp-h">Query wall-clock duration</div><div class="qp-big">${fT(wall)}</div>
            <div class="qp-wc" aria-hidden="true">${q.wc.map((v,i)=>`<span style="width:${Math.max(1.2,100*v/wall)}%;background:${wcl[i][1]}"></span>`).join('')}</div>
            <ul class="qp-wcl">${q.wc.map((v,i)=>`<li><i style="background:${wcl[i][1]}"></i>${wcl[i][0]}<b>${fT(v)}</b></li>`).join('')}</ul></div>
          <div class="qp-sec"><div class="qp-h">Aggregated task time</div><div class="qp-big">${fT(q.agg)}</div>
            <div class="qp-sub">≈ ${par>=10?Math.round(par):par.toFixed(1)} × el tiempo de ejecución${par>=10?': mucho trabajo en paralelo':''}</div></div>
          <div class="qp-sec"><div class="qp-h">Photon</div><div class="qp-sub"><b>${q.photon}%</b> del task time en Photon</div></div>
          <div class="qp-sec"><div class="qp-h">IO</div>
            <dl class="qp-kv">
              <dt>Rows read</dt><dd>${fRows(io.rr)}</dd>
              <dt>Bytes read</dt><dd>${fBytes(io.br)}</dd>
              <dt>Files read</dt><dd>${fRows(io.fr)}</dd>
              <dt>Files pruned</dt><dd class="${pct(io.fp,tf)<20?'qp-bad':''}">${fRows(io.fp)} ${funnel}${pct(io.fp,tf)}%</dd>
              <dt>Rows produced</dt><dd>${fRows(io.rp)}</dd>
              <dt>Spill to disk</dt><dd class="${io.sp?'qp-bad':''}">${fBytes(io.sp)}</dd>
              <dt>Shuffle (bytes)</dt><dd class="${io.sh>50*GiB?'qp-bad':''}">${fBytes(io.sh)}</dd>
            </dl></div>
          <div class="qp-sec"><div class="qp-h">Performance insights</div>${q.ins.length?`<div class="qp-ichips">${q.ins.map(k=>`<button type="button" class="qp-ichip" data-tab="ins">${k}</button>`).join('')}</div>`:'<div class="qp-sub">Sin insights que pidan acción.</div>'}</div>
          <button type="button" class="qp-lnk" data-tab="top">See longest operators for this query</button>`;
      } else if(st.tab==='top'){
        const tot=q.nodes.reduce((s,n)=>s+n.t,0), top=[...q.nodes].sort((a,b)=>b.t-a.t).slice(0,5);
        P.innerHTML=`<div class="qp-h">Top operators · por Time spent</div><ol class="qp-top5">${top.map(n=>`<li><button type="button" data-node="${n.id}" class="${n.id===st.sel?'on':''}"><span class="qp-tn"><i class="${n.ph?'qp-ph':'qp-noph'}"></i>${esc(n.n)}</span><span class="qp-tv">${fT(n.t)} · ${Math.round(100*n.t/tot)}%</span><span class="qp-tb"><span style="width:${100*n.t/top[0].t}%"></span></span></button></li>`).join('')}</ol>`;
      } else if(st.tab==='text'){
        P.innerHTML=`<div class="qp-h">Query text</div><pre class="qp-sql"><code>${esc(q.sql)}</code></pre>`;
      } else {
        P.innerHTML=`<div class="qp-h">Performance insights</div>`+(q.ins.length?q.ins.map(k=>`<div class="qp-ins"><div class="qp-ik">${k}</div><div class="qp-ic">${INS[k].cat}</div><p>${INS[k].d}</p><p><b>Recommendation:</b> ${INS[k].r}</p></div>`).join(''):'<p class="qp-sub">Esta ejecución no tiene insights. En otras queries podrías ver aquí optimizaciones ya aplicadas con la etiqueta Accelerated, que no piden acción.</p>')+`<p class="qp-sub">Descripciones parafraseadas de la doc de Query performance insights.</p>`;
      }
    }
    function graph(){
      const q=Q[st.q];
      frame.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.metric===st.metric));
      drawDag(document.getElementById('qp-dag'),q.nodes,st.metric,st.sel,q.hot,true);
      document.getElementById('qp-gnote').textContent=st.metric==='rows'?'Rows: filas de salida de cada operador, color en escala logarítmica.':st.metric==='mem'?'Memory peak: memoria máxima que usó cada operador.':'Time spent: tiempo de tareas de cada operador y su parte del total.';
      const n=q.nodes.find(x=>x.id===st.sel)||q.nodes[0], tot=q.nodes.reduce((s,x)=>s+x.t,0);
      document.getElementById('qp-op').innerHTML=`<div class="qp-oph"><b>${esc(n.n)}</b><span class="qp-badge ${n.ph?'ph':'noph'}">${n.ph?'Photon':'No Photon'}</span></div>
        <dl class="qp-kv"><dt>Time spent</dt><dd>${fT(n.t)} (${Math.round(100*n.t/tot)}%)</dd><dt>Memory peak</dt><dd>${fBytes(n.m)}</dd><dt>Rows</dt><dd>${fRows(n.rw)}</dd>${(n.x||[]).map(s=>{const i=s.indexOf(': ');return i>0?`<dt>${esc(s.slice(0,i))}</dt><dd>${esc(s.slice(i+2))}</dd>`:`<dt></dt><dd>${esc(s)}</dd>`;}).join('')}</dl>`;
      if(st.tab==='top') frame.querySelectorAll('.qp-top5 [data-node]').forEach(b=>b.classList.toggle('on',b.dataset.node===st.sel));
    }
    function verdict(){
      const q=Q[st.q];
      document.getElementById('qp-look').innerHTML=`<span class="pill ${q.hot?'bad':'ok'}">Dónde mirar</span>${q.look}${q.hot?` <button type="button" class="qp-show" id="qp-show">Muéstramelo en el grafo</button>`:''}`;
      document.getElementById('qp-verdict').innerHTML=`<div><b>¿Qué arreglas?</b></div><ul class="qp-fix">${q.fix.map(f=>`<li>${f}</li>`).join('')}</ul>`;
    }
    function all(){skeleton();pane();graph();verdict();}
    function selectNode(id,focus){st.sel=id;graph();if(focus){const g=frame.querySelector(`.qp-node[data-id="${id}"]`);if(g)g.focus();}}
    document.getElementById('qp-chips').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;
      document.querySelectorAll('#qp-chips [data-q]').forEach(x=>x.setAttribute('aria-pressed',x===b));
      st.q=b.dataset.q; st.sel=Q[st.q].hot||Q[st.q].nodes[0].id; st.tab='details'; st.metric='time'; all();});
    frame.addEventListener('click',e=>{
      const t=e.target.closest('[data-tab]'); if(t){st.tab=t.dataset.tab;pane();return;}
      const m=e.target.closest('[data-metric]'); if(m){st.metric=m.dataset.metric;graph();return;}
      const nd=e.target.closest('[data-node]'); if(nd){selectNode(nd.dataset.node);return;}
      const g=e.target.closest('.qp-node'); if(g){selectNode(g.dataset.id);}
    });
    frame.addEventListener('keydown',e=>{const g=e.target.closest&&e.target.closest('.qp-node');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectNode(g.dataset.id,true);}});
    sim.addEventListener('click',e=>{if(e.target.id!=='qp-show')return;const q=Q[st.q];st.metric=q.lookMetric;st.sel=q.hot;graph();
      const d=document.getElementById('qp-dag');if(d&&d.scrollIntoView)d.scrollIntoView({behavior:'smooth',block:'center'});});
    all();
  }catch(err){console.error('query-profile simulador',err);} }

  /* ---------- quiz ---------- */
  if(quiz){ try{
    const L=(href,txt)=>`<a href="${href}">${txt}</a>`;
    const QZ=[
      {t:'Un conteo que tarda más de un minuto',
       ctx:'<code>SELECT count(*) FROM eventos WHERE usuario_id = \'u-77\'</code>. La tabla está clusterizada por <code>fecha</code>. Wall-clock 71 s, sin spill, shuffle de 4 KiB.',
       nodes:[
        {id:'s',n:'Scan eventos',ph:1,c:'C',r:0,t:4300,m:1.6*GiB,rw:2.9e9,x:'Files read 1,980 · pruned 20 (1%)'},
        {id:'f',n:'Filter',ph:1,c:'C',r:1,t:640,m:48*MiB,rw:312,in:['s'],x:'usuario_id = \'u-77\''},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:2,t:210,m:16*MiB,rw:64,in:['f'],x:''},
        {id:'x',n:'Shuffle',ph:1,c:'C',r:3,t:105,m:8*MiB,rw:64,in:['a1'],x:'4 KiB'},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:4,t:50,m:1*MiB,rw:1,in:['x'],x:''}],
       hot:'s',
       o:[['El Scan lee casi toda la tabla porque el filtro no usa las claves de clustering.','Correcto. 1,980 archivos leídos de 2,000 y 2,900 millones de filas para quedarse con 312.'],
          ['El join explota.','No hay ningún join en el grafo, y las filas bajan en cada paso.'],
          ['Falta memoria: hay spill en el agregado.','Spill 0 y el agregado usa 16 MiB.'],
          ['Hay demasiado shuffle: sube <code>spark.sql.shuffle.partitions</code>.','El Shuffle mueve 64 filas y es el 2% del tiempo.']],
       c:0,
       ex:'<p>El Scan es el 81% del tiempo y descarta solo el 1% de los archivos. El Filter reduce 2,900 millones de filas a 312. El data skipping no sirvió porque los archivos están organizados por <code>fecha</code> y el filtro va por <code>usuario_id</code>. Arreglo: añadir <code>usuario_id</code> a las claves de clustering y ejecutar <code>OPTIMIZE ... FULL</code>, o usar <code>CLUSTER BY AUTO</code>. El insight que encaja es <code>COVERAGE_FILTER_KEYS_CLUSTERING</code>.</p>',
       rep:L('liquid-clustering.html','Liquid clustering')},
      {t:'Un join con una tabla de comercios',
       ctx:'<code>transacciones</code> (1,900 millones de filas tras el filtro) se une con <code>comercios</code> (85,000 filas, 45 MiB). Pruning 91%, sin spill.',
       nodes:[
        {id:'st',n:'Scan transacciones',ph:1,c:'L',r:0,t:2900,m:1.2*GiB,rw:1.9e9,x:'pruned 91%'},
        {id:'sc',n:'Scan comercios',ph:1,c:'R',r:0,t:70,m:60*MiB,rw:85000,x:''},
        {id:'xl',n:'Shuffle',ph:1,c:'L',r:1,t:11200,m:3.4*GiB,rw:1.9e9,in:['st'],x:'410 GiB'},
        {id:'xr',n:'Shuffle',ph:1,c:'R',r:1,t:110,m:90*MiB,rw:85000,in:['sc'],x:'45 MiB'},
        {id:'j',n:'Shuffled Hash Join',ph:1,c:'C',r:2,t:18800,m:14*GiB,rw:1.9e9,in:['xl','xr'],x:'Inner'},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:3,t:2200,m:0.9*GiB,rw:9000,in:['j'],x:''},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:4,t:600,m:20*MiB,rw:300,in:['a1'],x:''}],
       hot:'xl',
       o:[['Data skipping malo en <code>transacciones</code>.','El pruning es del 91% y el Scan es solo el 8% del tiempo.'],
          ['El join explota.','Salen 1,900 millones de filas, las mismas que entran por el lado grande. No multiplica.'],
          ['El tipo de join es ineficiente: se hace shuffle de 410 GiB para unir con una tabla de 45 MiB. Conviene broadcast del lado pequeño.','Correcto. El Shuffle grande y el join suman el 84% del tiempo.'],
          ['Hay spill: sube el tamaño del warehouse.','No hay spill.']],
       c:2,
       ex:'<p>Los dos lados pasan por un Shuffle antes del join, y el izquierdo mueve 410 GiB. Con un broadcast, la tabla de 45 MiB se copia a cada executor y el lado grande no se mueve. AQE no lo cambió solo porque 45 MiB supera el umbral de broadcast en tiempo de ejecución (30 MB por defecto), y además AQE solo cambia después de haber hecho el shuffle. El hint <code>SELECT /*+ BROADCAST(c) */ ...</code> evita el shuffle desde el inicio e ignora el umbral, así que úsalo solo con tablas que caben de sobra en memoria.</p>',
       rep:L('joins.html','Joins')+' · '+L('aqe.html','AQE')},
      {t:'Agrupar clics por sesión',
       ctx:'<code>SELECT sesion_id, collect_list(struct(ts, url, payload)) FROM clics_raw GROUP BY sesion_id</code>. Sin <code>WHERE</code>. Wall-clock 482 s, de los que 480 s son ejecución. Files pruned 0%.',
       nodes:[
        {id:'s',n:'Scan clics_raw',ph:1,c:'C',r:0,t:3900,m:2.0*GiB,rw:3.1e9,x:'pruned 0%'},
        {id:'a1',n:'Hash Aggregate (partial)',ph:1,c:'C',r:1,t:2200,m:5.2*GiB,rw:3.0e9,in:['s'],x:''},
        {id:'x',n:'Shuffle',ph:1,c:'C',r:2,t:14800,m:3.0*GiB,rw:3.0e9,in:['a1'],x:'290 GiB'},
        {id:'a2',n:'Hash Aggregate',ph:1,c:'C',r:3,t:21300,m:28*GiB,rw:2.2e8,in:['x'],x:'Spill 160 GiB'},
        {id:'r',n:'Result',ph:1,c:'C',r:4,t:1300,m:0.4*GiB,rw:2.2e8,in:['a2'],x:''}],
       hot:'a2',
       o:[['Data skipping malo: el Scan descarta el 0% de los archivos.','La query no tiene filtro: no hay nada que descartar. El Scan es el 9% del tiempo.'],
          ['Shuffle grande y spill en el agregado final. Reduce lo que viaja (por ejemplo, quita <code>payload</code>) o sube el tamaño del warehouse.','Correcto. Shuffle y agregado final suman el 83% del tiempo, con 28 GiB de pico y 160 GiB de spill.'],
          ['El join explota.','No hay join.'],
          ['La query pasó el tiempo en cola en el warehouse.','Casi todo el wall-clock es ejecución, y el tiempo está en operadores concretos.']],
       c:1,
       ex:'<p><code>collect_list</code> no reduce filas en el agregado parcial (3,100 a 3,000 millones), así que casi todo cruza el Shuffle: 290 GiB. El agregado final arma listas grandes por sesión, sube a 28 GiB y escribe 160 GiB de spill. El insight <code>DATA_SPILL</code> propone dos caminos: más memoria (warehouse más grande) o menos datos (menos filas, menos columnas o columnas grandes más pequeñas). Aquí <code>payload</code> es la candidata obvia. Si el spill se concentrara en pocas sesiones, sería skew.</p>',
       rep:L('remedios.html','Remedios')+' · '+L('shuffle.html','Shuffle')}
    ];
    const ans={};
    const score=()=>{const n=Object.keys(ans).length,ok=Object.values(ans).filter(Boolean).length;
      const s=document.getElementById('qz-score'); if(s) s.innerHTML=`<span class="pill ${ok===n?'ok':'bad'}">${ok} / ${n}</span>aciertos de ${n} respondidas · ${QZ.length-n} pendientes`;};
    quiz.innerHTML=QZ.map((k,i)=>{const tot=k.nodes.reduce((s,n)=>s+n.t,0);
      return `<article class="case" id="qz-${i}">
        <div class="cn">Perfil ${i+1} de ${QZ.length}</div>
        <h4>${k.t}</h4>
        <p>${k.ctx}</p>
        <div class="qp-frame qp-mini"><div class="qp-top"><b>Query profile</b><span class="qp-meta">Time spent · recreación ilustrativa</span></div>
          <div class="qp-mbody"><svg class="qp-dag" id="qz-dag-${i}" role="img" aria-label="Grafo de operadores del perfil ${i+1}"></svg>
          <div class="qp-mtbl"><table class="ui-tbl"><thead><tr><th>Operator</th><th>Time spent</th><th>Rows</th><th>Memory peak</th><th>Otros</th></tr></thead><tbody>
          ${k.nodes.map(n=>`<tr><td><i class="qp-dot ${n.ph?'qp-ph':'qp-noph'}"></i>${esc(n.n)}</td><td>${Math.round(100*n.t/tot)}%</td><td>${fRows(n.rw)}</td><td>${fBytes(n.m)}</td><td>${esc(n.x||'')}</td></tr>`).join('')}
          </tbody></table></div></div></div>
        <p class="q">¿Cuál es el cuello de botella?</p>
        <div class="opts">${k.o.map((o,j)=>`<button type="button" data-qz="${i}" data-opt="${j}"><b>${'ABCD'[j]}</b><span>${o[0]}</span></button>`).join('')}</div>
        <div class="expl" hidden></div>
      </article>`;}).join('');
    QZ.forEach((k,i)=>drawDag(document.getElementById('qz-dag-'+i),k.nodes,'time',null,null,false));
    quiz.addEventListener('click',e=>{
      const b=e.target.closest('button[data-qz]'); if(!b) return;
      const i=+b.dataset.qz, j=+b.dataset.opt, k=QZ[i]; if(i in ans) return;
      ans[i]=(j===k.c);
      const card=document.getElementById('qz-'+i);
      card.querySelectorAll('button[data-qz]').forEach(x=>{const jj=+x.dataset.opt;x.disabled=true;
        x.classList.add(jj===k.c?'right':(jj===j?'wrong':'dim'));
        const w=document.createElement('span');w.className='why';w.innerHTML=k.o[jj][1];x.appendChild(w);});
      drawDag(document.getElementById('qz-dag-'+i),k.nodes,'time',null,k.hot,false);
      const ex=card.querySelector('.expl'); ex.hidden=false;
      ex.innerHTML=`<p><span class="pill ${ans[i]?'ok':'bad'}">${ans[i]?'Bien':'No'}</span>${ans[i]?'Elegiste la correcta.':'La correcta es la '+'ABCD'[k.c]+'.'} El nodo marcado en el grafo es dónde mirar.</p>${k.ex}<p class="tag">Repaso: ${k.rep}</p>`;
      score();
    });
    score();
  }catch(err){console.error('query-profile quiz',err);} }
})();
