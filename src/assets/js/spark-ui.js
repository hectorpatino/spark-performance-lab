/* Página "Leer el Spark UI": Spark UI navegable.
   Una aplicación inventada (datos ilustrativos) con un stage con skew + spill y un executor perdido.
   Reutiliza window.SPL.UI (frame, summary, legend, bytes, rec, clock, PH). */
(function(){
  const root=document.getElementById('sui-app');
  if(!root||!window.SPL||!window.SPL.UI) return;
  try {
  const UI=window.SPL.UI, NS='http://www.w3.org/2000/svg';
  const rnd=(i,s)=>{const x=Math.sin((i+1)*12.9898+s*78.233)*43758.5453;return x-Math.floor(x);};
  const MiB=1024**2, GiB=1024**3;
  const by=UI.bytes, rec=UI.rec, sum=a=>a.reduce((x,y)=>x+y,0);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  /* duraciones como en las páginas de jobs/stages (UIUtils.formatDuration) */
  const sdur=s=>{ if(s<0.1) return Math.round(s*1000)+' ms'; if(s<1) return s.toFixed(1)+' s'; if(s<60) return Math.round(s)+' s'; const m=s/60; if(m<10) return m.toFixed(1)+' min'; if(m<60) return Math.round(m)+' min'; return (m/60).toFixed(1)+' h'; };
  /* duraciones como en las métricas SQL (Utils.msDurationToString) */
  const msd=s=>s<1?Math.round(s*1000)+' ms':s<60?s.toFixed(1)+' s':s<3600?(s/60).toFixed(1)+' m':(s/3600).toFixed(1)+' h';
  const when=t=>'2026/10/07 '+UI.clock(t);
  const sr=(b,r)=>`${by(b)} / ${rec(r)}`;
  const DESC='saveAsTable at NativeMethodAccessorImpl.java:0', DESC0='count at NativeMethodAccessorImpl.java:0';

  /* ---------- cluster: 4 workers spot de 8 cores, driver on-demand, sin autoscaling ---------- */
  const LOST=62, ADD4=150;
  const EX={driver:{id:'driver',host:'10.139.64.10',port:'40817',cores:0,add:0},
    0:{id:'0',host:'10.139.64.11',port:'36725',cores:8,add:0},
    1:{id:'1',host:'10.139.64.12',port:'44617',cores:8,add:0},
    2:{id:'2',host:'10.139.64.13',port:'39561',cores:8,add:0},
    3:{id:'3',host:'10.139.64.14',port:'42203',cores:8,add:0,rm:LOST},
    4:{id:'4',host:'10.139.64.15',port:'37419',cores:8,add:ADD4}};
  const EXORDER=['driver','0','1','2','3','4'];

  /* Planificador sencillo: cada task va al primer core libre de un executor vivo.
     Si el executor muere mientras la task corre, esa task falla (ExecutorLostFailure) y se reintenta.
     En stages map, las tasks que ya habían terminado en el executor perdido se vuelven a lanzar (Resubmitted). */
  function schedule(lists,t0,ids,isMap){
    const slots=[]; ids.forEach(id=>{const e=EX[id]; for(let c=0;c<e.cores;c++) slots.push({e,c,free:Math.max(t0,e.add)});});
    const queue=[]; lists.forEach(L=>L.forEach(k=>queue.push(Object.assign({att:0,ready:t0},k))));
    const out=[]; let resubDone=false;
    const pick=k=>{let best=null,bs=Infinity; for(const s of slots){const st=Math.max(s.free,k.ready); if(s.e.rm!=null&&st>=s.e.rm) continue; if(st<bs-1e-9){bs=st;best=s;}} return [best,bs];};
    while(queue.length){
      const k=queue.shift(); const [best,bs]=pick(k);
      if(isMap&&!resubDone&&bs>=LOST){
        resubDone=true; queue.unshift(k);
        out.filter(o=>o.ok&&EX[o.ex].rm!=null&&o.e<=LOST).reverse().forEach(o=>{o.resub=true; queue.unshift(Object.assign({},o,{att:o.att+1,ready:LOST,resub:false,ok:undefined}));});
        continue;
      }
      const en=bs+k.d, e=best.e;
      if(e.rm!=null&&en>e.rm){ out.push(Object.assign({},k,{ex:e.id,core:best.c,s:bs,e:e.rm,ok:false})); best.free=e.rm; queue.unshift(Object.assign({},k,{att:k.att+1,ready:e.rm})); }
      else { out.push(Object.assign({},k,{ex:e.id,core:best.c,s:bs,e:en,ok:true})); best.free=en; }
    }
    return out;
  }
  const Z={gc:0,inB:0,inR:0,outB:0,outR:0,srB:0,srR:0,swB:0,swR:0,swT:0,spM:0,spD:0,fetch:0,remote:0,peak:0,sched:0.008,deser:0.02,rser:0.001,getr:0};
  const mk=(n,seed,f)=>[...Array(n)].map((_,i)=>Object.assign({},Z,f(i,rnd(i,seed),rnd(i,seed+3))));

  /* ---------- tasks de cada stage ---------- */
  const HOT=13, HOTR=128e6, NORMR=(320e6-HOTR)/199;
  const T0=mk(24,1,(i,a)=>({st:0,i,d:1.6+0.8*a,inB:1.2*MiB*(0.9+0.2*a),inR:175000,swB:59,swR:1,gc:0.02}));
  const T1=mk(1,2,()=>({st:1,i:0,d:0.32,srB:1416,srR:24}));
  const T2=mk(24,5,(i,a,b)=>({st:2,i,d:6.5+2*a,inB:47*MiB*(0.95+0.1*b),inR:175000*(0.95+0.1*b),swB:30*MiB*(0.95+0.1*a),swR:175000,swT:0.15+0.1*b,gc:0.1+0.1*a,peak:16*MiB}));
  const T3=mk(160,9,(i,a,b)=>({st:3,i,d:10.5+3*a,inB:128*MiB*(0.97+0.06*b),inR:2e6*(0.97+0.06*b),swB:90.9*MiB*(0.93+0.14*a),swR:2e6,swT:0.3+0.3*b,gc:0.3+0.3*a,peak:64*MiB}));
  const T4=mk(200,4,(i,a,b)=>{
    if(i===HOT) return {st:4,i,d:564,gc:96,srB:5.7*GiB+12*1024,srR:HOTR+1,outB:3.5*GiB,outR:HOTR+1,spM:18.6*GiB,spD:5.9*GiB,fetch:14,remote:4.3*GiB,peak:2.4*GiB,sched:0.012,deser:0.03};
    const f=0.7+0.6*a; return {st:4,i,d:7+8*f+2*b,gc:(7+8*f)*0.04,srB:43.7*MiB*f+3.6*MiB,srR:NORMR*f+21000,outB:28*MiB*f,outR:NORMR*f+21000,fetch:0.2+0.4*b,remote:(43.7*MiB*f+3.6*MiB)*0.75,peak:48*MiB*f,sched:0.004+0.02*a,deser:0.01+0.02*b};
  });
  const A0=schedule([T0],8,['0','1','2','3']); const e0=Math.max(...A0.map(k=>k.e));
  const A1=schedule([T1],e0+0.05,['0','1','2','3']); const e1=Math.max(...A1.map(k=>k.e));
  const A23=schedule([T2,T3],31,['0','1','2','3'],true);
  const A2=A23.filter(k=>k.st===2), A3=A23.filter(k=>k.st===3);
  const e23=Math.max(...A23.map(k=>k.e));
  const A4=schedule([T4],e23+0.8,['0','1','2','4']);
  let tid=0; [A0,A1,A23,A4].forEach(A=>A.slice().sort((x,y)=>x.s-y.s||x.st-y.st||x.i-y.i).forEach(k=>{k.tid=tid++;}));

  const span=A=>[Math.min(...A.map(k=>k.s)),Math.max(...A.map(k=>k.e))];
  const STAGES={};
  [[0,0,DESC0,A0,24],[1,0,DESC0,A1,1],[2,1,DESC,A2,24],[3,2,DESC,A3,160],[4,3,DESC,A4,200]].forEach(([id,job,desc,A,n])=>{
    const [s,e]=span(A); const ok=A.filter(k=>k.ok);
    const failed=A.filter(k=>!k.ok).length+A.filter(k=>k.resub).length;
    STAGES[id]={id,job,desc,n,tasks:A,ok,failed,s,e,d:e-s,
      inB:sum(ok.map(k=>k.inB)),inR:sum(ok.map(k=>k.inR)),outB:sum(ok.map(k=>k.outB)),outR:sum(ok.map(k=>k.outR)),
      srB:sum(ok.map(k=>k.srB)),srR:sum(ok.map(k=>k.srR)),swB:sum(ok.map(k=>k.swB)),swR:sum(ok.map(k=>k.swR)),
      spM:sum(ok.map(k=>k.spM)),spD:sum(ok.map(k=>k.spD)),time:sum(A.map(k=>k.e-k.s))};
  });
  const S4=STAGES[4], hotTask=A4.find(k=>k.i===HOT&&k.ok);
  const JOBS={
    0:{id:0,desc:DESC0,s:8,e:e1+0.05,stages:[0,1],skipped:[],sql:0},
    1:{id:1,desc:DESC,s:31,e:STAGES[2].e+0.05,stages:[2],skipped:[],sql:1},
    2:{id:2,desc:DESC,s:31,e:STAGES[3].e+0.05,stages:[3],skipped:[],sql:1},
    3:{id:3,desc:DESC,s:S4.s-0.3,e:S4.e+0.2,stages:[4],skipped:[2,3],sql:1}};
  Object.values(JOBS).forEach(j=>{j.d=j.e-j.s; j.n=sum(j.stages.map(s=>STAGES[s].n)); j.failed=sum(j.stages.map(s=>STAGES[s].failed));});
  const APP_END=JOBS[3].e+6;
  const QUERIES={0:{id:0,desc:DESC0,s:7.6,e:JOBS[0].e+0.1,jobs:[0]},1:{id:1,desc:DESC,s:30.2,e:JOBS[3].e+0.4,jobs:[1,2,3]}};

  /* ---------- pistas ---------- */
  const CLUES=[
    ['c1','Abriste el Event Timeline de la aplicación'],
    ['c2','Entraste al job más largo'],
    ['c3','Abriste el stage más largo'],
    ['c4','Comparaste Max contra el percentil 75'],
    ['c5','Viste el spill del stage'],
    ['c6','Encontraste el executor perdido'],
    ['c7','Viste el join en el plan SQL']];
  const got=new Set();
  const clueList=document.getElementById('sui-clues'), countEl=document.getElementById('sui-count');
  function drawClues(flash){
    if(clueList) clueList.innerHTML=CLUES.map(([id,t])=>`<li class="${got.has(id)?'done':''}${flash===id?' flash':''}">${t}</li>`).join('');
    if(countEl) countEl.textContent=`Pistas: ${got.size} de ${CLUES.length}`;
  }
  function tick(id){ if(!id||got.has(id)) return; got.add(id); drawClues(id); }

  /* ---------- notas de las evidencias (clic en celdas subrayadas) ---------- */
  const NOTES={
    tlexec:{clue:'c6',h:'Executor 3 removed',b:`A las ${UI.clock(LOST)}, en mitad del Job 2, el executor 3 desaparece. La guía de Databricks da tres causas comunes para un executor retirado: autoscaling (esperado, no es un error), pérdida de instancias spot y executors sin memoria. Este cluster no tiene autoscaling y sus workers son spot. Para confirmarlo, mira el <b>Event log</b> del compute, no el Spark UI. A las ${UI.clock(ADD4)} entra el executor 4 de reemplazo.`},
    maxp75:{clue:'c4',h:'Max frente al percentil 75',b:`En Duration, el p75 es ${sdur(UI.quant(S4.ok.map(k=>k.d))[3])} y el Max es ${sdur(UI.quant(S4.ok.map(k=>k.d))[4])}: ${(UI.quant(S4.ok.map(k=>k.d))[4]/UI.quant(S4.ok.map(k=>k.d))[3]).toFixed(0)} veces más. La guía dice que si Max supera al p75 en más de un 50%, puede haber skew. Mira también <i>Shuffle Read Size / Records</i>: el Max lee ${by(hotTask.srB)} y la mediana unos ${by(UI.quant(S4.ok.map(k=>k.srB))[2])}. Una sola partición recibe casi la mitad de los datos.`},
    spill:{clue:'c5',h:'Spill',b:`El stage hizo spill: ${by(S4.spM)} en memoria y ${by(S4.spD)} en disco. Las filas Spill solo aparecen cuando hay spill. Fíjate en las Summary Metrics: el spill es 0 en el p75 y todo está en el Max. El spill viene de una sola task, la del skew. Subir <code>spark.sql.shuffle.partitions</code> no lo arregla, porque la clave caliente sigue cayendo en una partición.`},
    hottask:{clue:null,h:`Task ${hotTask.tid} (índice ${HOT})`,b:`La task más larga: ${sdur(hotTask.d)} en el executor ${hotTask.ex}, con ${sr(hotTask.srB,hotTask.srR)} de shuffle read. Las demás leen unos ${by(UI.quant(S4.ok.map(k=>k.srB))[2])}. Es la partición de <code>cliente_id = 0</code>, el cliente genérico de las ventas sin cliente identificado.`},
    hotbar:{clue:null,h:'La barra larga del timeline',b:`Una task ocupa casi todo el eje: el resto del stage terminó en ~${Math.round(Math.max(...S4.ok.filter(k=>k.i!==HOT).map(k=>k.e))-S4.s)} s y los demás cores esperan. Es la cola larga del skew. La barra es casi toda verde (Executor Computing Time): no es espera de red, es trabajo de verdad sobre demasiadas filas, con spill.`},
    exec3:{clue:'c6',h:'Executor 3: Dead',b:`El executor 3 aparece como <b>Dead</b>, con ${STAGES[3].failed} tasks fallidas. Unas murieron con él mientras corrían (ExecutorLostFailure) y otras ya habían terminado, pero su salida de shuffle vivía en ese nodo, así que se volvieron a lanzar (Resubmitted). Con <i>Show Additional Metrics</i> puedes ver la columna <i>Exec Loss Reason</i>. El mensaje suele ser genérico; la causa real (aquí, una VM spot reclamada por Azure) está en el Event log del compute.`},
    exec1:{clue:null,h:'Executor 1: mucho Task Time',b:`El executor 1 acumula más Task Time que los otros porque ejecutó la task caliente. La celda sale en rojo porque el GC supera el 10% del Task Time (así lo explica el tooltip de la UI). No es un executor defectuoso: es el que tuvo la mala suerte de recibir la partición grande.`},
    lostErr:{clue:'c6',h:'ExecutorLostFailure',b:`<code>ExecutorLostFailure (executor 3 exited unrelated to the running tasks)</code>: la task no falló por su código, murió con su executor. Spark la reintenta en otro executor (Attempt 1). Si el executor muere por memoria, el texto suele decir <i>caused by one of the running tasks</i>. El <i>Reason</i> de este ejemplo es el mensaje genérico que cita la guía de Databricks; no basta para saber la causa.`},
    failed:{clue:null,h:'Tasks fallidas',b:`El job terminó bien, pero con tasks fallidas. Spark reintenta tasks (por defecto hasta 4 intentos por task) y el job solo falla si se agotan. Entra al job y al stage para ver el motivo en la columna Errors, o ve a la pestaña Executors.`},
    skipped:{clue:null,h:'Stages saltados',b:`Los stages 2 y 3 salen como <i>skipped</i> en el Job 3: su shuffle ya lo habían escrito los Jobs 1 y 2 y se reutiliza. Con AQE, Spark lanza cada stage map como un job aparte y luego el stage final. No es un error.`},
    smj:{clue:'c7',h:'SortMergeJoin (LeftOuter)',b:`El join es <code>clientes LEFT OUTER JOIN ventas</code>. La tabla con la clave caliente, ventas, es el lado derecho. AQE puede partir una partición sesgada del lado izquierdo de un LEFT OUTER, pero no del derecho (ver <a href="aqe.html">AQE</a>), así que aquí no actúa. Arreglos posibles: filtrar o tratar aparte <code>cliente_id = 0</code>, invertir el join si la lógica lo permite, o hacer salting (ver <a href="remedios.html">Remedios</a>).`},
    sortspill:{clue:'c7',h:'Sort: spill size',b:`El <i>spill size</i> del Sort del lado de ventas es casi todo de una task: el máximo apunta a <code>(stage 4.0: task ${hotTask.tid})</code>, la misma task que viste en la página del stage. Así conectas el plan SQL con el stage. Ojo: los tiempos del DAG SQL son acumulados (suma de todas las tasks), no tiempo de reloj.`},
    env:{clue:null,h:'Environment',b:`Aquí ves la configuración efectiva de la aplicación. Sirve para comprobar, por ejemplo, si <code>spark.sql.shuffle.partitions</code> o los ajustes de AQE son los que crees. No muestra el problema por sí sola.`},
    storage:{clue:null,h:'Storage',b:`Solo lista lo que está en caché (persist/cache) y ya se materializó. Esta aplicación no cachea nada, así que no aporta pistas.`}
  };
  const noteEl=document.getElementById('sui-note');
  function showNote(key){ const n=NOTES[key]; if(!n||!noteEl) return; noteEl.innerHTML=`<b>${n.h}</b><p>${n.b}</p>`; tick(n.clue);
    const r=noteEl.getBoundingClientRect(); if(r.top>window.innerHeight-60) noteEl.scrollIntoView({block:'nearest'}); }
  const ev=(key,html)=>`<span class="ev" data-note="${key}" tabindex="0" role="button">${html}</span>`;

  /* ---------- estado de navegación ---------- */
  let cur={tab:'Jobs'}; const hist=[];
  const ui={jobsTL:false,jobTL:{},dag:{},stTL:{},addl:{},tsort:{},stSort:'id',jobSort:'id',execAddl:false};
  const backBtn=document.getElementById('sui-back'), whereEl=document.getElementById('sui-where');

  const a=(nav,txt)=>`<button type="button" class="ui-a" data-nav="${nav}">${txt}</button>`;
  const lk=(key,txt,open)=>`<button type="button" class="ui-link" data-tog="${key}" aria-expanded="${open?'true':'false'}">${txt}</button>`;
  const th=(key,col,txt,curSort)=>`<th><button type="button" class="sui-th" data-sort="${key}:${col}">${txt}${curSort===col?' ▾':''}</button></th>`;
  const prog=(okN,total,failed,extra)=>`<span class="sui-prog"><span style="width:${Math.min(100,okN/total*100)}%"></span><em>${okN}/${total}${failed?` (${failed} failed)`:''}${extra||''}</em></span>`;

  /* ---------- SVG: líneas de tiempo ---------- */
  function svgEl(tag,attrs,txt){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;}
  const niceSpan=v=>{for(const c of [1,2,5,10,15,20,30,45,60,90,120,150,180,210,240,300,360,450,600,900]){if(4*c>=v) return 4*c;} return 4*Math.ceil(v/4/300)*300;};
  function axis(svg,L,R,y0,y1,from,xmax,xs){
    for(let i=0;i<=4;i++){const v=xmax*i/4,x=xs(from+v); svg.appendChild(svgEl('line',{x1:x,x2:x,y1:y0,y2:y1,style:'stroke:#E5E5E5;stroke-width:1'}));
      svg.appendChild(svgEl('text',{x,y:y1+12,'text-anchor':i===4?'end':i===0?'start':'middle',style:'fill:#666;font-size:9.5px'},UI.clock(from+v)));}
  }
  /* carril Executors + carril de barras (jobs o stages) */
  function timeline(bars,from,to,laneName){
    from=Math.floor(from/10)*10; const W=520,L=78,R=512, xmax=niceSpan((to-from)*1.02), xs=v=>L+(R-L)*(v-from)/xmax;
    const evs=[];
    EXORDER.forEach(id=>{const e=EX[id]; if(e.add>=from-0.01&&e.add<=to) evs.push({t:e.add,txt:`Executor ${id} added`,rm:false}); if(e.rm!=null&&e.rm>=from&&e.rm<=to) evs.push({t:e.rm,txt:`Executor ${id} removed`,rm:true});});
    const BW=100, rowsE=[]; evs.sort((x,y)=>x.t-y.t).forEach(v=>{const x=xs(v.t); let r=0; while(rowsE[r]!=null&&rowsE[r]>x-3) r++; rowsE[r]=x+BW; v.row=r; v.x=x;});
    const exH=Math.max(1,rowsE.length)*16+12;
    const rowsB=[]; bars.forEach(b=>{let r=0; while(rowsB[r]!=null&&rowsB[r]>b.t0-0.01) r++; rowsB[r]=b.t1; b.row=r;});
    bars.forEach(b=>{const nx=bars.filter(o=>o.row===b.row&&o.t0>b.t0).map(o=>xs(o.t0)); b.room=(nx.length?Math.min(...nx):R)-xs(b.t1)-6;});
    const H=exH+8+Math.max(1,rowsB.length)*24+22;
    const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,class:'sui-svg',role:'img','aria-label':'Event Timeline: executors y '+laneName.toLowerCase()});
    svg.appendChild(svgEl('rect',{x:0,y:0,width:R,height:exH,style:'fill:#FAFAFA'}));
    svg.appendChild(svgEl('line',{x1:0,x2:R,y1:exH,y2:exH,style:'stroke:#DDD'}));
    axis(svg,L,R,0,H-22,from,xmax,xs);
    svg.appendChild(svgEl('text',{x:4,y:14,style:'fill:#333;font-size:10px;font-weight:600'},'Executors'));
    svg.appendChild(svgEl('text',{x:4,y:exH+18,style:'fill:#333;font-size:10px;font-weight:600'},laneName));
    evs.forEach(v=>{
      const y=4+v.row*16, g=svgEl('g',v.rm?{'data-note':'tlexec',tabindex:'0',role:'button','aria-label':v.txt}:{});
      g.appendChild(svgEl('line',{x1:v.x,x2:v.x,y1:y+13,y2:exH,style:`stroke:${v.rm?'#FF4D6D':'#3EC0FF'}`}));
      g.appendChild(svgEl('rect',{x:v.x,y,width:BW-4,height:13,rx:2,style:v.rm?'fill:#FFA1B0;stroke:#FF4D6D':'fill:#A0DFFF;stroke:#3EC0FF'}));
      g.appendChild(svgEl('text',{x:v.x+4,y:y+9.5,style:'fill:#222;font-size:8.6px'},v.txt));
      svg.appendChild(g);
    });
    bars.forEach(b=>{
      const x=xs(b.t0), w=Math.max(xs(b.t1)-x,3), y=exH+8+b.row*24;
      const g=svgEl('g',b.nav?{'data-nav':b.nav,tabindex:'0',role:'button','aria-label':b.label}:{});
      g.appendChild(svgEl('rect',{x,y,width:w,height:18,rx:4,style:'fill:#A0DFFF;stroke:#3EC0FF'}));
      g.appendChild(svgEl('title',{},b.label));
      const lw=b.label.length*4.9, inside=w>lw+8;
      if(inside||b.room>lw) g.appendChild(svgEl('text',{x:inside?x+5:x+w+4,y:y+12.5,style:'fill:#222;font-size:9px'},b.label));
      svg.appendChild(g);
    });
    return svg;
  }
  /* timeline de tasks del stage: una fila por core, agrupadas por executor, barras en 7 fases */
  function taskTimeline(st){
    const exs=[...new Set(st.tasks.map(k=>k.ex))].sort((x,y)=>+x-+y);
    const LH=st.n>100?6:8, L=100,R=512, rows=exs.length*8, T=6, H=T+rows*LH+24;
    const from=Math.floor(st.s/5)*5, xmax=niceSpan((st.e-from)*1.02), xs=v=>L+(R-L)*(v-from)/xmax;
    const svg=svgEl('svg',{viewBox:`0 0 520 ${H}`,class:'sui-svg',role:'img','aria-label':'Event Timeline del stage: tasks por executor'});
    exs.forEach((id,gi)=>{const y=T+gi*8*LH; svg.appendChild(svgEl('rect',{x:0,y,width:R,height:8*LH,style:`fill:${gi%2?'#FAFAFA':'#FFFFFF'}`}));
      svg.appendChild(svgEl('line',{x1:0,x2:R,y1:y,y2:y,style:'stroke:#DDD'}));
      svg.appendChild(svgEl('text',{x:4,y:y+4*LH+3,style:'fill:#333;font-size:9px'},`${id} / ${EX[id].host}`));});
    axis(svg,L,R,T,H-24,from,xmax,xs);
    st.tasks.forEach(k=>{
      const gi=exs.indexOf(k.ex), y=T+(gi*8+k.core)*LH+0.6, hh=LH-1.2, w=xs(k.e)-xs(k.s);
      const d=k.e-k.s, fixed=k.sched+k.deser+k.fetch+k.swT+k.rser+k.getr, comp=Math.max(d-fixed,d*0.05);
      const ph=[k.sched,k.deser,k.fetch,comp,k.swT,k.rser,k.getr], tot=sum(ph);
      const isHot=st.id===4&&k.i===HOT&&k.ok;
      const g=svgEl('g',isHot?{'data-note':'hotbar',tabindex:'0',role:'button','aria-label':'Task más larga'}:{});
      let x=xs(k.s); ph.forEach((p,i)=>{const pw=w*p/tot; if(pw>0.05) g.appendChild(svgEl('rect',{x,y,width:Math.max(pw,0.3),height:hh,style:`fill:${UI.PH[i][1]}`})); x+=pw;});
      if(!k.ok) g.appendChild(svgEl('rect',{x:xs(k.s),y,width:Math.max(w,0.6),height:hh,style:'fill:none;stroke:#FF4D6D;stroke-width:1'}));
      if(isHot) g.appendChild(svgEl('rect',{x:xs(k.s),y:y-0.6,width:w,height:hh+1.2,style:'fill:none;stroke:#C9302C;stroke-width:1'}));
      svg.appendChild(g);
    });
    return svg;
  }

  /* ---------- tablas de stages ---------- */
  function stageRows(ids,skipped){
    let list=ids.map(id=>STAGES[id]);
    if(ui.stSort==='dur') list=list.slice().sort((x,y)=>y.d-x.d); else list=list.slice().sort((x,y)=>y.id-x.id);
    const head=`<table class="ui-tbl"><thead><tr>${th('st','id','Stage Id',ui.stSort)}<th>Description</th><th>Submitted</th>${th('st','dur','Duration',ui.stSort)}<th>Tasks: Succeeded/Total</th><th>Input</th><th>Output</th><th>Shuffle Read</th><th>Shuffle Write</th></tr></thead><tbody>`;
    return head+list.map(s=>skipped
      ?`<tr class="sk"><td>${s.id}</td><td>${s.desc}</td><td>Unknown</td><td>Unknown</td><td>${prog(0,s.n,0)}</td><td></td><td></td><td></td><td></td></tr>`
      :`<tr><td>${s.id}</td><td>${a('stage:'+s.id,s.desc)}</td><td>${when(s.s)}</td><td>${sdur(s.d)}</td><td>${prog(s.n,s.n,s.failed)}</td><td>${s.inB?by(s.inB):''}</td><td>${s.outB?by(s.outB):''}</td><td>${s.srB?by(s.srB):''}</td><td>${s.swB?by(s.swB):''}</td></tr>`).join('')+'</tbody></table>';
  }

  /* ---------- páginas ---------- */
  function pageJobs(){
    const list=Object.values(JOBS).slice().sort(ui.jobSort==='dur'?(x,y)=>y.d-x.d:(x,y)=>y.id-x.id);
    let h=`<h5 tabindex="-1">Spark Jobs</h5><ul class="ui-kv"><li><b>Total Uptime:</b> ${sdur(APP_END)}</li><li><b>Scheduling Mode:</b> FIFO</li><li><b>Completed Jobs:</b> ${list.length}</li></ul>`;
    h+=lk('jobsTL','Event Timeline',ui.jobsTL);
    if(ui.jobsTL) h+=UI.legend([['Executor added','#A0DFFF','#3EC0FF'],['Executor removed','#FFA1B0','#FF4D6D'],['Job succeeded','#A0DFFF','#3EC0FF'],['Job failed','#FFA1B0','#FF4D6D'],['Job running','#A2FCC0','#36F572']])+'<div class="sui-svgwrap" data-svg="jobs"></div>';
    h+=`<h6>Completed Jobs (${list.length})</h6><table class="ui-tbl"><thead><tr>${th('job','id','Job Id',ui.jobSort)}<th>Description</th><th>Submitted</th>${th('job','dur','Duration',ui.jobSort)}<th>Stages: Succeeded/Total</th><th>Tasks (for all stages): Succeeded/Total</th></tr></thead><tbody>`+
      list.map(j=>`<tr><td>${j.id}</td><td>${a('job:'+j.id,j.desc)}</td><td>${when(j.s)}</td><td>${sdur(j.d)}</td><td>${j.stages.length}/${j.stages.length}${j.skipped.length?` (${j.skipped.length} skipped)`:''}</td><td>${j.failed?ev('failed',prog(j.n,j.n,j.failed)):prog(j.n,j.n,0)}</td></tr>`).join('')+'</tbody></table>';
    return h;
  }
  function pageJob(id){
    const j=JOBS[id]; let h=`<h5 tabindex="-1">Details for Job ${id}</h5><ul class="ui-kv"><li><b>Status:</b> SUCCEEDED</li><li><b>Submitted:</b> ${when(j.s)}</li><li><b>Duration:</b> ${sdur(j.d)}</li><li><b>Associated SQL Query:</b> ${a('query:'+j.sql,j.sql)}</li><li><b>Completed Stages:</b> ${j.stages.length}</li>${j.skipped.length?`<li><b>Skipped Stages:</b> ${j.skipped.length}</li>`:''}</ul>`;
    h+=lk('jobTL:'+id,'Event Timeline',ui.jobTL[id]);
    if(ui.jobTL[id]) h+=UI.legend([['Executor added','#A0DFFF','#3EC0FF'],['Executor removed','#FFA1B0','#FF4D6D'],['Stage completed','#A0DFFF','#3EC0FF'],['Stage failed','#FFA1B0','#FF4D6D'],['Stage active','#A2FCC0','#36F572']])+`<div class="sui-svgwrap" data-svg="job:${id}"></div>`;
    h+=lk('dag:'+id,'DAG Visualization',ui.dag[id]);
    if(ui.dag[id]) h+=dag(j);
    h+=`<h6>Completed Stages (${j.stages.length})</h6>`+stageRows(j.stages,false);
    if(j.skipped.length) h+=`<h6>${ev('skipped','Skipped Stages ('+j.skipped.length+')')}</h6>`+stageRows(j.skipped,true);
    return h;
  }
  function dag(j){
    const SC={0:['Scan parquet main.comercial.clientes','WholeStageCodegen (1)','Exchange'],1:['Exchange','WholeStageCodegen (2)'],
      2:['Scan parquet main.comercial.clientes','WholeStageCodegen (1)','Exchange'],3:['Scan parquet main.comercial.ventas','WholeStageCodegen (2)','Exchange'],
      4:['Exchange','Exchange','WholeStageCodegen (3)','WholeStageCodegen (4)','WholeStageCodegen (5)','WriteFiles']};
    const box=(id,sk)=>`<div class="dv-stage${sk?' sk':''}"><div class="lbl">Stage ${id}${sk?' (skipped)':''}</div>${SC[id].map(x=>`<div class="dv-scope">${x}<span class="dot"></span></div>`).join('')}</div>`;
    const parts=j.skipped.map(id=>box(id,true)).concat(j.stages.map(id=>box(id,false)));
    return `<div class="dv">${parts.join('<div class="dv-edge" aria-hidden="true">→</div>')}</div>`;
  }
  function pageStages(){
    const ids=Object.keys(STAGES).map(Number);
    return `<h5 tabindex="-1">Stages for All Jobs</h5><ul class="ui-kv"><li><b>Completed Stages:</b> ${ids.length}</li><li><b>Skipped Stages:</b> 2</li></ul><h6>Completed Stages (${ids.length})</h6>`+stageRows(ids,false)+`<h6>${ev('skipped','Skipped Stages (2)')}</h6>`+stageRows([3,2],true);
  }
  function pageStage(id){
    const st=STAGES[id], ok=st.ok, has=k=>ok.some(t=>t[k]>0);
    let h=`<h5 tabindex="-1">Details for Stage ${id} (Attempt 0)</h5><ul class="ui-kv"><li><b>Resource Profile Id:</b> 0</li><li><b>Total Time Across All Tasks:</b> ${sdur(st.time)}</li>`;
    if(st.inB) h+=`<li><b>Input Size / Records:</b> ${sr(st.inB,st.inR)}</li>`;
    if(st.outB) h+=`<li><b>Output Size / Records:</b> ${sr(st.outB,st.outR)}</li>`;
    if(st.srB) h+=`<li><b>Shuffle Read Size / Records:</b> ${sr(st.srB,st.srR)}</li>`;
    if(st.swB) h+=`<li><b>Shuffle Write Size / Records:</b> ${sr(st.swB,st.swR)}</li>`;
    if(st.spM) h+=`<li><b>Spill (Memory):</b> ${ev('spill',by(st.spM))}</li><li><b>Spill (Disk):</b> ${ev('spill',by(st.spD))}</li>`;
    h+=`<li><b>Associated Job Ids:</b> ${a('job:'+st.job,st.job)}</li></ul>`;
    h+=lk('stTL:'+id,'Event Timeline',ui.stTL[id]);
    if(ui.stTL[id]) h+=UI.legend(UI.PH.map(p=>[p[0],p[1]]))+`<div class="sui-svgwrap" data-svg="stage:${id}"></div>`;
    h+=lk('addl:'+id,'Show Additional Metrics',ui.addl[id]);
    const rows=[['Duration',ok.map(k=>k.e-k.s),sdur,true],['GC Time',ok.map(k=>k.gc),sdur]];
    if(has('inB')) rows.push(['Input Size / Records',ok.map(k=>k.inB),by,false,ok.map(k=>k.inR),rec]);
    if(has('outB')) rows.push(['Output Size / Records',ok.map(k=>k.outB),by,false,ok.map(k=>k.outR),rec]);
    if(has('srB')) rows.push(['Shuffle Read Size / Records',ok.map(k=>k.srB),by,false,ok.map(k=>k.srR),rec]);
    if(has('swB')) rows.push(['Shuffle Write Size / Records',ok.map(k=>k.swB),by,false,ok.map(k=>k.swR),rec]);
    if(st.spM) rows.push(['Spill (memory)',ok.map(k=>k.spM),by],['Spill (disk)',ok.map(k=>k.spD),by]);
    if(ui.addl[id]){
      rows.push(['Scheduler Delay',ok.map(k=>k.sched),sdur],['Task Deserialization Time',ok.map(k=>k.deser),sdur]);
      if(has('srB')) rows.push(['Shuffle Read Fetch Wait Time',ok.map(k=>k.fetch),sdur],['Shuffle Remote Reads',ok.map(k=>k.remote),by]);
      rows.push(['Result Serialization Time',ok.map(k=>k.rser),sdur],['Getting Result Time',ok.map(k=>k.getr),sdur],['Peak Execution Memory',ok.map(k=>k.peak),by]);
      if(has('swB')) rows.push(['Shuffle Write Time',ok.map(k=>k.swT),sdur]);
    }
    h+=`<div data-sum="${id}">`+UI.summary(ok.length,rows)+'</div>';
    /* agregado por executor */
    const exs=[...new Set(st.tasks.map(k=>k.ex))].sort((x,y)=>+x-+y);
    const cols=[]; if(st.inB) cols.push(['Input Size / Records','inB','inR']); if(st.outB) cols.push(['Output Size / Records','outB','outR']); if(st.srB) cols.push(['Shuffle Read Size / Records','srB','srR']); if(st.swB) cols.push(['Shuffle Write Size / Records','swB','swR']);
    h+=`<h6>Aggregated Metrics by Executor</h6><table class="ui-tbl"><thead><tr><th>Executor ID</th><th>Logs</th><th>Address</th><th>Task Time</th><th>Total Tasks</th><th>Failed Tasks</th><th>Killed Tasks</th><th>Succeeded Tasks</th><th>Excluded</th>${cols.map(c=>`<th>${c[0]}</th>`).join('')}${st.spM?'<th>Spill (Memory)</th><th>Spill (Disk)</th>':''}</tr></thead><tbody>`+
      exs.map(x=>{const A=st.tasks.filter(k=>k.ex===x), O=A.filter(k=>k.ok); const f=A.filter(k=>!k.ok).length+A.filter(k=>k.resub).length; const E=EX[x];
        return `<tr><td>${x}</td><td><span class="ui-fake">stdout</span> <span class="ui-fake">stderr</span></td><td>${E.host}:${E.port}</td><td>${sdur(sum(A.map(k=>k.e-k.s)))}</td><td>${A.length}</td><td>${f&&x==='3'?ev('exec3',f):f}</td><td>0</td><td>${O.length}</td><td>false</td>${cols.map(c=>`<td>${sr(sum(O.map(k=>k[c[1]])),sum(O.map(k=>k[c[2]])))}</td>`).join('')}${st.spM?`<td>${by(sum(O.map(k=>k.spM)))}</td><td>${by(sum(O.map(k=>k.spD)))}</td>`:''}</tr>`;}).join('')+'</tbody></table>';
    /* tabla de tasks */
    const srt=ui.tsort[id]||'idx'; let T=st.tasks.slice();
    T.sort(srt==='dur'?(x,y)=>(y.e-y.s)-(x.e-x.s):(x,y)=>x.i-y.i||x.att-y.att);
    const shown=T.slice(0,10), io=cols.map(c=>c[0]);
    const errTxt=k=>!k.ok?ev('lostErr',`ExecutorLostFailure (executor ${k.ex} exited unrelated to the running tasks) Reason: Remote RPC client disassociated. Likely due to containers exceeding thresholds, or network issues. Check driver logs for WARN messages.`):'';
    h+=`<h6>Tasks (${st.tasks.length})</h6><table class="ui-tbl"><thead><tr>${th('t'+id,'idx','Index',srt)}<th>Task ID</th><th>Attempt</th><th>Status</th><th>Executor ID</th><th>Host</th><th>Logs</th><th>Launch Time</th>${th('t'+id,'dur','Duration',srt)}<th>GC Time</th>${io.map(c=>`<th>${c}</th>`).join('')}${st.spM?'<th>Spill (Memory)</th><th>Spill (Disk)</th>':''}<th>Errors</th></tr></thead><tbody>`+
      shown.map(k=>{const hot=id===4&&k.i===HOT&&k.ok, d=k.e-k.s;
        return `<tr><td>${k.i}</td><td>${k.tid}</td><td>${k.att}</td><td>${k.ok?'SUCCESS':'FAILED'}</td><td>${k.ex}</td><td>${EX[k.ex].host}</td><td><span class="ui-fake">stdout</span> <span class="ui-fake">stderr</span></td><td>${when(k.s)}</td><td class="${hot?'hl':''}">${hot?ev('hottask',sdur(d)):sdur(d)}</td><td>${k.ok?sdur(k.gc):''}</td>${cols.map(c=>`<td>${k.ok?sr(k[c[1]],k[c[2]]):''}</td>`).join('')}${st.spM?`<td>${hot?ev('spill',by(k.spM)):by(k.spM)}</td><td>${hot?ev('spill',by(k.spD)):by(k.spD)}</td>`:''}<td class="err">${errTxt(k)}</td></tr>`;}).join('')+
      `</tbody></table><p class="ui-small">Showing 1 to ${shown.length} of ${st.tasks.length} entries${srt==='idx'?' · ordenado por Index. Haz clic en Duration para ordenar de mayor a menor':' · ordenado por Duration, de mayor a menor'}.</p>`;
    return h;
  }
  function execAgg(id){
    const A=[...A0,...A1,...A23,...A4].filter(k=>k.ex===id), O=A.filter(k=>k.ok);
    return {total:A.length,failed:A.filter(k=>!k.ok).length+A.filter(k=>k.resub).length,ok:O.length,time:sum(A.map(k=>k.e-k.s)),gc:sum(O.map(k=>k.gc)),inB:sum(O.map(k=>k.inB)),srB:sum(O.map(k=>k.srB)),swB:sum(O.map(k=>k.swB)),peak:Math.max(0,...O.map(k=>k.peak))};
  }
  function pageExecutors(){
    const R=EXORDER.map(id=>Object.assign({id,dead:EX[id].rm!=null},execAgg(id)));
    const tot=rs=>({n:rs.length,cores:sum(rs.map(r=>EX[r.id].cores)),failed:sum(rs.map(r=>r.failed)),ok:sum(rs.map(r=>r.ok)),total:sum(rs.map(r=>r.total)),time:sum(rs.map(r=>r.time)),gc:sum(rs.map(r=>r.gc)),inB:sum(rs.map(r=>r.inB)),srB:sum(rs.map(r=>r.srB)),swB:sum(rs.map(r=>r.swB))});
    const act=tot(R.filter(r=>!r.dead)), dead=tot(R.filter(r=>r.dead)), all=tot(R);
    const srow=(lab,t)=>`<tr><td>${lab}</td><td>0</td><td>0.0 B / ${(t.n*13.9).toFixed(1)} GiB</td><td>0.0 B</td><td>${t.cores}</td><td>0</td><td>${t.failed}</td><td>${t.ok}</td><td>${t.total}</td><td>${sdur(t.time)} (${sdur(t.gc)})</td><td>${by(t.inB)}</td><td>${by(t.srB)}</td><td>${by(t.swB)}</td><td>0</td></tr>`;
    let h=`<h5 tabindex="-1">Executors</h5><h6>Summary</h6><table class="ui-tbl"><thead><tr><th></th><th>RDD Blocks</th><th>Storage Memory</th><th>Disk Used</th><th>Cores</th><th>Active Tasks</th><th>Failed Tasks</th><th>Complete Tasks</th><th>Total Tasks</th><th>Task Time (GC Time)</th><th>Input</th><th>Shuffle Read</th><th>Shuffle Write</th><th>Excluded</th></tr></thead><tbody>${srow(`Active(${act.n})`,act)}${srow(`Dead(${dead.n})`,dead)}${srow(`Total(${all.n})`,all)}</tbody></table>`;
    h+=lk('execAddl','Show Additional Metrics',ui.execAddl);
    h+=`<h6>Executors</h6><table class="ui-tbl"><thead><tr><th>Executor ID</th><th>Address</th><th>Status</th><th>RDD Blocks</th><th>Storage Memory</th><th>Disk Used</th><th>Cores</th>${ui.execAddl?'<th>Peak Execution Memory OnHeap / OffHeap</th>':''}<th>Active Tasks</th><th>Failed Tasks</th><th>Complete Tasks</th><th>Total Tasks</th><th>Task Time (GC Time)</th><th>Input</th><th>Shuffle Read</th><th>Shuffle Write</th><th>Logs</th><th>Thread Dump</th>${ui.execAddl?'<th>Exec Loss Reason</th>':''}</tr></thead><tbody>`+
      R.map(r=>{const E=EX[r.id], gcHot=r.time>0&&r.gc>0.1*r.time; const tt=`${sdur(r.time)} (${sdur(r.gc)})`;
        return `<tr><td>${r.id}</td><td>${E.host}:${E.port}</td><td>${r.dead?ev('exec3','Dead'):'Active'}</td><td>0</td><td>0.0 B / ${r.id==='driver'?'7.6':'13.9'} GiB</td><td>0.0 B</td><td>${E.cores}</td>${ui.execAddl?`<td>${by(r.peak)} / 0.0 B</td>`:''}<td>0</td><td>${r.dead?ev('exec3',r.failed):r.failed}</td><td>${r.ok}</td><td>${r.total}</td><td class="${gcHot?'gcred':''}">${r.id==='1'?ev('exec1',tt):tt}</td><td>${by(r.inB)}</td><td>${by(r.srB)}</td><td>${by(r.swB)}</td><td><span class="ui-fake">stdout</span> <span class="ui-fake">stderr</span></td><td>${r.dead?'':'<span class="ui-fake">Thread Dump</span>'}</td>${ui.execAddl?`<td class="err">${r.dead?ev('exec3','Remote RPC client disassociated. Likely due to containers exceeding thresholds, or network issues. Check driver logs for WARN messages.'):''}</td>`:''}</tr>`;}).join('')+'</tbody></table>';
    return h;
  }
  function pageSQL(){
    const L=Object.values(QUERIES).sort((x,y)=>y.id-x.id);
    return `<h5 tabindex="-1">SQL / DataFrame</h5><h6>Completed Queries: ${L.length}</h6><table class="ui-tbl"><thead><tr><th>ID</th><th>Description</th><th>Submitted</th><th>Duration</th><th>Job IDs</th></tr></thead><tbody>`+
      L.map(x=>`<tr><td>${x.id}</td><td>${a('query:'+x.id,x.desc)}</td><td>${when(x.s)}</td><td>${sdur(x.e-x.s)}</td><td>${x.jobs.map(j=>a('job:'+j,'['+j+']')).join(' ')}</td></tr>`).join('')+'</tbody></table>';
  }
  /* métrica SQL: "name total (min, med, max (stageId: taskId))" */
  const byq=b=>b===0?'0.0 B':by(b);
  function mm(name,arr,f,stage,tidMax){const s=arr.slice().sort((x,y)=>x-y); return `<div>${name} total (min, med, max (stageId: taskId))<br>${f(sum(s))} (${f(s[0])}, ${f(s[Math.floor(s.length/2)])}, ${f(s[s.length-1])} (stage ${stage}.0: task ${tidMax}))</div>`;}
  function pageQuery(id){
    const Q=QUERIES[id];
    let h=`<h5 tabindex="-1">Details for Query ${id}</h5><ul class="ui-kv"><li><b>Submitted Time:</b> ${when(Q.s)}</li><li><b>Duration:</b> ${sdur(Q.e-Q.s)}</li><li><b>Succeeded Jobs:</b> ${Q.jobs.map(j=>a('job:'+j,j)).join(' ')}</li></ul>`;
    if(id===0){
      const s0=STAGES[0];
      return h+`<div class="sq"><div class="sq-n"><b>Scan parquet main.comercial.clientes</b><div>number of output rows: ${rec(s0.inR)}</div></div><div class="sq-cl"><div class="lbl">WholeStageCodegen (1)</div><div class="sq-n"><b>HashAggregate</b><div>number of output rows: 24</div></div></div><div class="sq-n ex"><b>Exchange</b><div>shuffle records written: 24</div></div><div class="sq-cl"><div class="lbl">WholeStageCodegen (2)</div><div class="sq-n"><b>HashAggregate</b><div>number of output rows: 1</div></div></div></div>`;
    }
    const s2=STAGES[2], s3=STAGES[3], O4=S4.ok;
    const tMax=(A,k)=>A.reduce((m,t)=>t[k]>m[k]?t:m,A[0]).tid;
    const sortV=O4.map(k=>k.i===HOT?(k.d*0.55):(k.e-k.s)*0.25), peakV=O4.map(k=>k.peak), spillV=O4.map(k=>k.spM);
    const sortC=O4.map(k=>(k.e-k.s)*0.02);
    const smjRows=sum(O4.map(k=>k.outR));
    h+=`<div class="sui-plan"><div class="sui-br">
      <div class="sq-n"><b>Scan parquet main.comercial.clientes</b><div>number of files read: 24</div><div>size of files read: ${by(s2.inB)}</div><div>number of output rows: ${rec(s2.inR)}</div></div>
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (1)</div><div class="sq-n"><b>ColumnarToRow</b></div><div class="sq-n"><b>Project</b></div></div>
      <div class="sq-n ex"><b>Exchange</b><div>shuffle records written: ${rec(s2.swR)}</div>${mm('shuffle bytes written',s2.ok.map(k=>k.swB),by,2,tMax(s2.ok,'swB'))}</div>
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (3)</div><div class="sq-n"><b>Sort</b>${mm('sort time',sortC,msd,4,tMax(O4,'d'))}<div>spill size: 0.0 B</div></div></div>
      <div class="sui-fill"></div>
    </div><div class="sui-br">
      <div class="sq-n"><b>Scan parquet main.comercial.ventas</b><div>number of files read: 160</div><div>size of files read: ${by(s3.inB)}</div><div>number of output rows: ${rec(sum(s3.tasks.filter(k=>k.ok&&!k.resub).map(k=>k.inR)))}</div></div>
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (2)</div><div class="sq-n"><b>ColumnarToRow</b></div><div class="sq-n"><b>Project</b></div></div>
      <div class="sq-n ex"><b>Exchange</b><div>shuffle records written: ${rec(320e6)}</div>${mm('shuffle bytes written',s3.ok.filter(k=>!k.resub).map(k=>k.swB),by,3,tMax(s3.ok,'swB'))}</div>
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (4)</div><div class="sq-n"><b>Sort</b>${mm('sort time',sortV,msd,4,hotTask.tid)}${mm('peak memory',peakV,by,4,hotTask.tid)}<span class="ev" data-note="sortspill" tabindex="0" role="button">${mm('spill size',spillV,byq,4,hotTask.tid)}</span></div></div>
      <div class="sui-fill"></div>
    </div></div>
    <div class="sui-merge" aria-hidden="true"></div>
    <div class="sq"><div class="sq-cl"><div class="lbl">WholeStageCodegen (5)</div><div class="sq-n ev" data-note="smj" tabindex="0" role="button"><b>SortMergeJoin</b><div>LeftOuter · cliente_id</div><div>number of output rows: ${rec(smjRows)}</div></div><div class="sq-n"><b>Project</b></div></div>
      <div class="sq-n"><b>WriteFiles</b><div>number of written files: 200</div><div>written output: ${by(S4.outB)}</div></div></div>`;
    h+=`<div class="ui-link" style="margin-top:.6rem">Details</div><pre>== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=true
+- SortMergeJoin [cliente_id], [cliente_id], LeftOuter
   :- Sort [cliente_id ASC NULLS FIRST]
   :  +- Exchange hashpartitioning(cliente_id, 200)
   :     +- Scan parquet main.comercial.clientes
   +- Sort [cliente_id ASC NULLS FIRST]
      +- Exchange hashpartitioning(cliente_id, 200)
         +- Scan parquet main.comercial.ventas</pre>`;
    return h;
  }
  function pageStorage(){
    return `<h5 tabindex="-1">Storage</h5><h6>RDDs</h6><table class="ui-tbl"><thead><tr><th>ID</th><th>RDD Name</th><th>Storage Level</th><th>Cached Partitions</th><th>Fraction Cached</th><th>Size in Memory</th><th>Size on Disk</th></tr></thead><tbody><tr><td colspan="7" class="ui-empty">${ev('storage','(vacía: esta aplicación no cachea nada)')}</td></tr></tbody></table>`;
  }
  function pageEnv(){
    const P=[['spark.app.name','Databricks Shell'],['spark.sql.adaptive.enabled','true'],['spark.sql.adaptive.skewJoin.enabled','true'],['spark.sql.shuffle.partitions','200']];
    return `<h5 tabindex="-1">Environment</h5><h6>Runtime Information</h6><table class="ui-tbl"><tbody><tr><td>Java Version</td><td>17</td></tr><tr><td>Scala Version</td><td>2.13</td></tr></tbody></table><h6>${ev('env','Spark Properties')}</h6><table class="ui-tbl"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>${P.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td></tr>`).join('')}</tbody></table><p class="ui-small">También: Resource Profiles, Hadoop Properties, System Properties, Metrics Properties, Classpath Entries.</p>`;
  }

  const CAP={
    Jobs:'Recreación ilustrativa de la pestaña Jobs. Abre el Event Timeline y ordena por Duration. Los datos son inventados.',
    Stages:'Recreación ilustrativa de la pestaña Stages. Las celdas subrayadas se pueden inspeccionar.',
    Storage:'Recreación ilustrativa de la pestaña Storage.',
    Environment:'Recreación ilustrativa de la pestaña Environment (solo algunas propiedades).',
    Executors:'Recreación ilustrativa de la pestaña Executors, al estilo de Apache Spark 3.5. Las celdas subrayadas se pueden inspeccionar.',
    'SQL / DataFrame':'Recreación ilustrativa de la pestaña SQL / DataFrame. Los nombres de los nodos raíz de una escritura Delta pueden variar en Databricks.'};

  function where(){
    if(cur.view==='job') return `Jobs › Job ${cur.id}`;
    if(cur.view==='stage') return `${cur.tab} › Stage ${cur.id}`;
    if(cur.view==='query') return `SQL / DataFrame › Query ${cur.id}`;
    return cur.tab;
  }
  function render(focus){
    let body;
    if(cur.view==='job') body=pageJob(cur.id);
    else if(cur.view==='stage') body=pageStage(cur.id);
    else if(cur.view==='query') body=pageQuery(cur.id);
    else body={Jobs:pageJobs,Stages:pageStages,Storage:pageStorage,Environment:pageEnv,Executors:pageExecutors,'SQL / DataFrame':pageSQL}[cur.tab]();
    root.innerHTML=UI.frame(cur.tab,body,CAP[cur.tab]);
    root.querySelectorAll('.ui-top span').forEach(sp=>{
      const b=document.createElement('button'); b.type='button'; b.className='ui-tab'+(sp.classList.contains('on')?' on':''); b.textContent=sp.textContent; b.dataset.nav='tab:'+sp.textContent;
      if(sp.classList.contains('on')) b.setAttribute('aria-current','page'); sp.replaceWith(b);});
    root.querySelectorAll('[data-svg]').forEach(w=>{
      const k=w.dataset.svg;
      if(k==='jobs') w.appendChild(timeline(Object.values(JOBS).map(j=>({t0:j.s,t1:j.e,label:`${j.desc.split(' at ')[0]} (Job ${j.id})`,nav:'job:'+j.id})),0,APP_END,'Jobs'));
      else if(k.startsWith('job:')){const j=JOBS[+k.slice(4)]; w.appendChild(timeline(j.stages.map(s=>({t0:STAGES[s].s,t1:STAGES[s].e,label:`Stage ${s}: ${STAGES[s].n} tasks`,nav:'stage:'+s})),j.s-1,j.e+1,'Stages'));}
      else if(k.startsWith('stage:')) w.appendChild(taskTimeline(STAGES[+k.slice(6)]));
    });
    const sumBox=root.querySelector('[data-sum="4"]');
    if(sumBox){ sumBox.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.children, n=c[0].textContent;
      if(n==='Duration'){[4,5].forEach(i=>{c[i].innerHTML=ev('maxp75',c[i].innerHTML);});}
      if(n==='Spill (memory)'||n==='Spill (disk)') c[5].innerHTML=ev('spill',c[5].innerHTML);
      if(n==='Shuffle Read Size / Records') c[5].innerHTML=ev('maxp75',c[5].innerHTML); }); }
    if(backBtn) backBtn.disabled=!hist.length;
    if(whereEl) whereEl.textContent=where();
    if(focus){const h5=root.querySelector('h5'); if(h5) h5.focus({preventScroll:true}); const top=root.getBoundingClientRect().top; if(top<0) root.scrollIntoView({block:'start'});}
  }
  function go(nav){
    const [k,v]=nav.split(/:(.+)/);
    hist.push(cur);
    if(k==='tab') cur={tab:v};
    else if(k==='job') cur={tab:'Jobs',view:'job',id:+v};
    else if(k==='stage') cur={tab:'Stages',view:'stage',id:+v};
    else if(k==='query') cur={tab:'SQL / DataFrame',view:'query',id:+v};
    if(cur.view==='job'&&cur.id===3) tick('c2');
    if(cur.view==='stage'&&cur.id===4) tick('c3');
    render(true);
  }
  function toggle(key){
    const [k,v]=key.split(':');
    if(v==null) ui[k]=!ui[k]; else ui[k][v]=!ui[k][v];
    if(k==='jobsTL'&&ui.jobsTL) tick('c1');
    render(false);
  }
  root.addEventListener('click',e=>{
    const t=e.target.closest('[data-nav],[data-tog],[data-sort],[data-note]'); if(!t||!root.contains(t)) return;
    if(t.dataset.nav){go(t.dataset.nav);return;}
    if(t.dataset.tog){toggle(t.dataset.tog);return;}
    if(t.dataset.sort){const [k,col]=t.dataset.sort.split(':');
      if(k==='st') ui.stSort=col; else if(k==='job') ui.jobSort=col; else ui.tsort[k.slice(1)]=col; render(false); return;}
    if(t.dataset.note){showNote(t.dataset.note); t.classList&&t.classList.add('seen');}
  });
  root.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ') return;
    const t=e.target; if(t.matches&&t.matches('[data-note][tabindex],g[data-nav]')){e.preventDefault(); t.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  });
  if(backBtn) backBtn.addEventListener('click',()=>{ if(!hist.length) return; cur=hist.pop(); render(true); });
  const reset=document.getElementById('sui-reset');
  if(reset) reset.addEventListener('click',()=>{ got.clear(); hist.length=0; cur={tab:'Jobs'}; Object.assign(ui,{jobsTL:false,jobTL:{},dag:{},stTL:{},addl:{},tsort:{},stSort:'id',jobSort:'id',execAddl:false}); if(noteEl) noteEl.innerHTML=noteEl.dataset.empty||''; drawClues(); render(false); });
  if(noteEl) noteEl.dataset.empty=noteEl.innerHTML;

  /* ---------- pregunta final ---------- */
  const OPTS=[
    {t:'Al cluster le faltan workers: todas las tasks del Stage 4 van lentas. Hay que pasar de 4 a 8 workers.',ok:false,
     why:`Las Summary Metrics dicen lo contrario: del mínimo al p75 las tasks duran entre ${sdur(UI.quant(S4.ok.map(k=>k.d))[0])} y ${sdur(UI.quant(S4.ok.map(k=>k.d))[3])}. Solo una task es lenta, y más workers no la parten.`},
    {t:'Skew en cliente_id: una task del Stage 4 recibe casi la mitad del shuffle, hace spill y dura más de 9 minutos. AQE no la parte porque ventas es el lado derecho de un LEFT OUTER JOIN. Aparte, se perdió un worker spot en el Job 2 y hubo que repetir tasks.',ok:true,
     why:'Es lo que muestran juntas las pistas: Max mucho mayor que el p75, spill concentrado en esa task, la misma task señalada en el Sort del plan SQL y un executor Dead con tasks fallidas.'},
    {t:'El driver se quedó sin memoria (OutOfMemoryError) y por eso se perdió el executor 3.',ok:false,
     why:'El driver sigue vivo toda la aplicación: no hay reinicio ni jobs fallidos. Lo que muere es un executor, y en este cluster de workers spot la causa se confirma en el Event log del compute.'},
    {t:'Hay un problema de archivos pequeños al leer ventas.',ok:false,
     why:'El scan de ventas lee 160 archivos de unos 128 MB, y el Stage 3 es corto y parejo. La guía habla de archivos pequeños cuando se leen decenas de miles de archivos, de menos de 8 MB.'}];
  const optsEl=document.getElementById('sui-opts'), explEl=document.getElementById('sui-expl');
  if(optsEl){
    optsEl.innerHTML=OPTS.map((o,i)=>`<button type="button" data-o="${i}"><b>${'ABCD'[i]}</b><span>${o.t}</span></button>`).join('');
    optsEl.addEventListener('click',e=>{
      const b=e.target.closest('button[data-o]'); if(!b||b.disabled) return; const o=OPTS[+b.dataset.o];
      b.classList.add(o.ok?'right':'wrong'); if(!b.querySelector('.why')) b.insertAdjacentHTML('beforeend',`<span class="why">${o.why}</span>`);
      if(o.ok){ optsEl.querySelectorAll('button').forEach(x=>{x.disabled=true; if(x!==b&&!x.classList.contains('wrong')) x.classList.add('dim');});
        if(explEl){explEl.hidden=false;}
      }
    });
  }

  drawClues(); render(false);
  } catch(err){ console.error('spark-ui: Spark UI navegable', err); }
})();
