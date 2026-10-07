(function(){
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,attrs,txt)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;};
  const q=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);const i=(s.length-1)*p;const lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo);};
  const fmtT=s=>s>=60?Math.floor(s/60)+' min '+String(Math.round(s%60)).padStart(2,'0')+' s':s.toFixed(1)+' s';
  function tickMax(v){for(const c of [1,2,4,5,8,10,15,20,25,50,100]){if(4*c>=v)return 4*c;}return niceMax(v);}

  /* ---------- recreaciones del Spark UI: helpers ---------- */
  const UI={
    bytes(b){const u=['B','KiB','MiB','GiB','TiB'];let i=0;while(b>=1024&&i<u.length-1){b/=1024;i++;}return (i?b.toFixed(1):Math.round(b))+' '+u[i];},
    dur(s){return s<1?Math.round(s*1000)+' ms':s<60?s.toFixed(1)+' s':(s/60).toFixed(1)+' min';},
    rec(n){return Math.round(n).toLocaleString('en-US');},
    clock(s){const t=36000+Math.floor(s);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),x=t%60;return [h,m,x].map(v=>String(v).padStart(2,'0')).join(':');},
    frame(tab,body,cap){const tabs=['Jobs','Stages','Storage','Environment','Executors','SQL / DataFrame'];
      return `<div class="ui-frame"><div class="ui-top"><b>Spark UI</b>${tabs.map(t=>`<span class="${t===tab?'on':''}">${t}</span>`).join('')}</div><div class="ui-body">${body}</div></div><p class="ui-cap">${cap||'Recreación ilustrativa de la pantalla real, con los datos del simulador.'}</p>`;},
    quant(arr){return [0,.25,.5,.75,1].map(p=>q(arr,p));},
    summary(n,rows){
      return `<h6>Summary Metrics for ${n} Completed Tasks</h6><table class="ui-tbl"><thead><tr><th>Metric</th><th>Min</th><th>25th percentile</th><th>Median</th><th>75th percentile</th><th>Max</th></tr></thead><tbody>`+
        rows.map(r=>{const [nm,arr,f,hl,arr2,f2]=r; const v=UI.quant(arr), v2=arr2?UI.quant(arr2):null;
          return `<tr><td>${nm}</td>${v.map((x,i)=>`<td class="${hl&&i===4&&v[4]>1.5*v[3]?'hl':''}">${f(x)}${v2?' / '+f2(v2[i]):''}</td>`).join('')}</tr>`;}).join('')+`</tbody></table>`;},
    PH:[['Scheduler Delay','#80B1D3'],['Task Deserialization Time','#FB8072'],['Shuffle Read Time','#FDB462'],['Executor Computing Time','#B3DE69'],['Shuffle Write Time','#FFED6F'],['Result Serialization Time','#BC80BD'],['Getting Result Time','#8DD3C7']],
    legend(items){return `<div class="ui-legend">${items.map(([n,c,b])=>`<span style="--c:${c};--b:${b||c}">${n}</span>`).join('')}</div>`;},
    axis(svg,L,R,y0,y1,xmax,xs){for(let i=0;i<=4;i++){const v=xmax*i/4,x=xs(v);svg.appendChild(el('line',{x1:x,x2:x,y1:y0,y2:y1,style:'stroke:#E5E5E5;stroke-width:1'}));svg.appendChild(el('text',{x,y:y1+12,'text-anchor':i===4?'end':'middle',style:'fill:#666;font-size:9.5px'},UI.clock(v)));}}
  };
  function viewToggle(groupId,onChange){const g=document.getElementById(groupId); if(!g) return; g.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{g.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x===b)); onChange(b.dataset.view);}));}
  window.SPL={el,q,niceMax:(v)=>niceMax(v),tickMax:(v)=>tickMax(v),UI,viewToggle};
  function niceMax(v){const p=Math.pow(10,Math.floor(Math.log10(v)));for(const m of [1,2,2.5,5,10]){if(m*p>=v)return m*p;}return 10*p;}
  function axes(svg,W,H,L,B,T,max,fmt){
    for(let i=0;i<=4;i++){const v=max*i/4;const y=H-B-(H-B-T)*i/4;
      svg.appendChild(el('line',{x1:L,x2:W-4,y1:y,y2:y,class:'ax',opacity:i?0.5:1}));
      svg.appendChild(el('text',{x:L-4,y:y+3,'text-anchor':'end',class:'tick'},fmt(v)));}
  }


  /* ---------- 1. simulador Spark UI ---------- */
  if (document.getElementById('s1-hot')) { try {
  const s1=document.getElementById('s1-hot');
  function draw1(){
    const h=+s1.value/100; document.getElementById('s1-hot-o').textContent=s1.value+'%';
    const N=16,TOTAL=16,MEM=3,HOT=5;
    const tasks=[...Array(N)].map((_,i)=>{
      const rows=(1-h)*TOTAL/N+(i===HOT?h*TOTAL:0);
      const over=Math.max(0,rows-MEM);
      return {rows,comp:rows*2,extra:over*3,spill:over*1.2};
    });
    const dur=tasks.map(t=>t.comp+t.extra);
    const svg=document.getElementById('s1-chart'); svg.textContent='';
    const W=360,H=190,L=44,B=22,T=8; const max=niceMax(Math.max(...dur,4));
    axes(svg,W,H,L,B,T,max,v=>v>=60?Math.round(v/60)+'m':Math.round(v)+'s');
    const bw=(W-L-8)/N;
    tasks.forEach((t,i)=>{
      const x=L+i*bw+2, sc=(H-B-T)/max;
      const hc=t.comp*sc, he=t.extra*sc;
      svg.appendChild(el('rect',{x,y:H-B-hc,width:bw-4,height:Math.max(hc,0.5),class:'bar'+(i===HOT&&h>0?' hot':'')}));
      if(he>0) svg.appendChild(el('rect',{x,y:H-B-hc-he,width:bw-4,height:he,class:'bar spill'}));
      if(i%3===0||i===N-1) svg.appendChild(el('text',{x:x+(bw-4)/2,y:H-8,'text-anchor':'middle',class:'tick'},i+1));
    });
    const st={min:Math.min(...dur),p25:q(dur,.25),med:q(dur,.5),p75:q(dur,.75),max:Math.max(...dur)};
    const rows=tasks.map(t=>t.rows), spills=tasks.map(t=>t.spill);
    const RB=60, bytes=tasks.map(t=>t.rows*1e6*RB), recs=tasks.map(t=>t.rows*1e6), gc=tasks.map(t=>t.comp*0.02+t.extra*0.15);
    const sDisk=tasks.map(t=>t.spill*0.5*1024**3), sMem=sDisk.map(b=>b*3.2), anySpill=sDisk.some(b=>b>0);
    const sum=a=>a.reduce((x,y)=>x+y,0);
    const rows1=[['Duration',dur,UI.dur,true],['GC Time',gc,UI.dur],['Shuffle Read Size / Records',bytes,UI.bytes,false,recs,UI.rec]];
    if(anySpill){rows1.push(['Spill (memory)',sMem,UI.bytes],['Spill (disk)',sDisk,UI.bytes]);}
    const order=tasks.map((t,i)=>i).sort((a,b)=>dur[b]-dur[a]).slice(0,5);
    const host=i=>'10.139.64.'+(11+i%4);
    const tbl=`<h6>Tasks (${N})</h6><table class="ui-tbl"><thead><tr><th>Index</th><th>Task ID</th><th>Attempt</th><th>Status</th><th>Executor ID</th><th>Host</th><th>Duration ▾</th><th>GC Time</th><th>Shuffle Read Size / Records</th><th>Spill (Memory)</th><th>Spill (Disk)</th></tr></thead><tbody>`+
      order.map(i=>`<tr><td>${i}</td><td>${812+i}</td><td>0</td><td>SUCCESS</td><td>${i%4}</td><td>${host(i)}</td><td class="${i===HOT&&h>0&&dur[i]>1.5*q(dur,.75)?'hl':''}">${UI.dur(dur[i])}</td><td>${UI.dur(gc[i])}</td><td>${UI.bytes(bytes[i])} / ${UI.rec(recs[i])}</td><td>${UI.bytes(sMem[i])}</td><td>${UI.bytes(sDisk[i])}</td></tr>`).join('')+
      `<tr><td colspan="11" style="color:#777">… ${N-5} tasks más (ordenado por Duration, de mayor a menor)</td></tr></tbody></table>`;
    document.getElementById('s1-ui').innerHTML=UI.frame('Stages',
      `<h5>Details for Stage 7 (Attempt 0)</h5><ul class="ui-kv"><li><b>Total Time Across All Tasks:</b> ${UI.dur(sum(dur))}</li><li><b>Shuffle Read Size / Records:</b> ${UI.bytes(sum(bytes))} / ${UI.rec(sum(recs))}</li>${anySpill?`<li><b>Spill (Memory):</b> ${UI.bytes(sum(sMem))}</li><li><b>Spill (Disk):</b> ${UI.bytes(sum(sDisk))}</li>`:''}<li><b>Associated Job Ids:</b> 4</li></ul>
       <div class="ui-link">DAG Visualization</div><div class="ui-link">Show Additional Metrics</div><div class="ui-link">Event Timeline</div>`+UI.summary(N,rows1)+tbl,
      'Recreación de la página del stage. Las filas Spill solo aparecen cuando el stage tiene spill, como en la UI real. En la tabla Tasks, ordenar por Duration lleva directo a la task caliente.');
    const totalSpill=spills.reduce((a,b)=>a+b,0), ratio=st.max/st.p75;
    const totalRows=TOTAL;
    document.getElementById('s1-verdict').innerHTML=
      `<div>${totalSpill>0?'<span class="pill bad">SPILL</span>'+totalSpill.toFixed(1)+' GB a disco, solo en la task '+(HOT+1)+'.':'<span class="pill ok">SIN SPILL</span>Todas las tasks caben en memoria.'}</div>
       <div>${ratio>=1.5?'<span class="pill bad">SKEW</span>':'<span class="pill ok">SIN SKEW</span>'}Max / p75 = <b>${ratio.toFixed(1)}×</b> (la guía avisa a partir de 1.5×).</div>
       <div class="c">Stage total ≈ ${fmtT(st.max)}. Si las ${totalRows} M filas se repartieran parejo, serían ≈ ${fmtT(totalRows/16*2)}.</div>`;
  }
  s1.addEventListener('input',draw1); draw1();

  } catch (e) { console.error('1. simulador Spark UI', e); } }

  /* ---------- 2. AQE detección ---------- */
  if (document.getElementById('s2-hot')) { try {
  const base=[42,55,48,61,52,45,58,50,47,63,53];
  const s2h=document.getElementById('s2-hot'),s2f=document.getElementById('s2-fac'),s2t=document.getElementById('s2-thr');
  function draw2(){
    const hot=+s2h.value,fac=+s2f.value,thr=+s2t.value;
    document.getElementById('s2-hot-o').textContent=hot+' MB';
    document.getElementById('s2-fac-o').textContent=fac;
    document.getElementById('s2-thr-o').textContent=thr+' MB';
    const parts=[...base,hot]; const med=q(parts,.5); const facLine=fac*med;
    const c1=hot>facLine,c2=hot>thr,skew=c1&&c2;
    const svg=document.getElementById('s2-chart'); svg.textContent='';
    const W=360,H=200,L=44,B=22,T=8; const max=niceMax(Math.max(hot,facLine,thr)*1.05);
    axes(svg,W,H,L,B,T,max,v=>Math.round(v)+'');
    const sc=(H-B-T)/max,bw=(W-L-8)/parts.length;
    parts.forEach((v,i)=>{const x=L+i*bw+2;const hh=v*sc;
      svg.appendChild(el('rect',{x,y:H-B-hh,width:bw-4,height:hh,class:'bar'+(i===parts.length-1?' hot':'')}));
      svg.appendChild(el('text',{x:x+(bw-4)/2,y:H-8,'text-anchor':'middle',class:'tick'},i+1));});
    if(skew){ // dibuja cortes de las tasks resultantes
      const target=Math.max(64,base.reduce((a,b)=>a+b,0)/base.length); const n=Math.ceil(hot/target);
      const x=L+(parts.length-1)*bw+2;
      for(let k=1;k<n&&k<40;k++){const y=H-B-hot*sc*k/n;svg.appendChild(el('line',{x1:x,x2:x+bw-4,y1:y,y2:y,style:'stroke:var(--surface);stroke-width:1.5'}));}
    }
    const line=(v,cls,txt)=>{const y=H-B-v*sc;svg.appendChild(el('line',{x1:L,x2:W-4,y1:y,y2:y,class:'ln '+cls}));svg.appendChild(el('text',{x:L+4,y:y-3,class:'lbl '+cls},txt));};
    line(med,'med','mediana '+Math.round(med));
    line(facLine,'fac',fac+'× mediana '+Math.round(facLine));
    line(thr,'thr','umbral '+thr);
    const target=Math.max(64,base.reduce((a,b)=>a+b,0)/base.length);
    document.getElementById('s2-verdict').innerHTML=
      `<div>${c1?'<span class="pill ok">✓</span>':'<span class="pill bad">✗</span>'}${hot} MB &gt; ${fac} × ${Math.round(med)} MB = ${Math.round(facLine)} MB</div>
       <div>${c2?'<span class="pill ok">✓</span>':'<span class="pill bad">✗</span>'}${hot} MB &gt; umbral ${thr} MB</div>
       <div><b>${skew?'AQE la parte en ≈ '+Math.ceil(hot/target)+' tasks (estimación).':'AQE no la marca como skewed: no cumple las dos condiciones.'}</b></div>`;
    const rd=skew?'AQEShuffleRead skewed':'AQEShuffleRead coalesced';
    document.getElementById('s2-ui').innerHTML=UI.frame('SQL / DataFrame',`<h5>Details for Query 12</h5><div class="ui-link">Details</div><pre><code>== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=true
+- == Final Plan ==
   SortMergeJoin [cliente_id], [cliente_id], Inner${skew?', <b style="color:#C9302C">isSkew=true</b>':''}
   :- Sort [cliente_id ASC NULLS FIRST]
   :  +- ${rd}
   :     +- ShuffleQueryStage 0
   :        +- Exchange hashpartitioning(cliente_id, 200)
   +- Sort [cliente_id ASC NULLS FIRST]
      +- ${rd}
         +- ShuffleQueryStage 1
            +- Exchange hashpartitioning(cliente_id, 200)</code></pre>`,
      'Recreación del plan final. La doc de Databricks dice que el skew manejado se ve como <code>SortMergeJoin</code> con <code>isSkew</code> en true; el nombre del nodo de lectura (<code>AQEShuffleRead</code>, antes <code>CustomShuffleReader</code>) y el texto exacto varían según la versión.');
  }
  [s2h,s2f,s2t].forEach(x=>x.addEventListener('input',draw2)); draw2();

  } catch (e) { console.error('2. AQE detección', e); } }

  /* ---------- 4a. calculadora ---------- */
  if (document.getElementById('c-gb')) { try {
  const cgb=document.getElementById('c-gb'),cco=document.getElementById('c-cores'),cmb=document.getElementById('c-mb');
  function calc(){
    const gb=+cgb.value,co=Math.max(1,Math.round(+cco.value)),mb=+cmb.value;
    if(!(gb>0&&mb>0)){document.getElementById('c-out').innerHTML='<div>Introduce valores mayores que cero.</div>';return;}
    const raw=Math.ceil(gb*1024/mb), rounded=Math.ceil(raw/co)*co, per=gb*1024/rounded, waves=rounded/co;
    document.getElementById('c-out').innerHTML=
      `<div>${gb} GB ÷ ${mb} MB = <b>${raw.toLocaleString('es')}</b> particiones</div>
       <div>Redondeado al múltiplo de ${co} cores: <b><code>spark.sql.shuffle.partitions = ${rounded}</code></b></div>
       <div class="c">≈ ${per.toFixed(0)} MB por task · ${waves} waves de ${co} tasks · sin ajuste, la regla de respaldo es 2–3× los cores (${2*co}–${3*co})</div>`;
  }
  [cgb,cco,cmb].forEach(x=>x.addEventListener('input',calc)); calc();

  } catch (e) { console.error('4a. calculadora', e); } }

  /* ---------- 4b. salting ---------- */
  if (document.getElementById('s4-n')) { try {
  const s4=document.getElementById('s4-n');
  function draw4(){
    const n=+s4.value; document.getElementById('s4-n-o').textContent=n;
    const T=8,HOTROWS=12,NORM=0.5,HOT=2;
    const hotPer=Array(T).fill(0);
    for(let s=0;s<n;s++) hotPer[(HOT+s)%T]+=HOTROWS/n;
    const svg=document.getElementById('s4-chart'); svg.textContent='';
    const W=360,H=190,L=44,B=22,Tp=8; const max=niceMax(NORM+HOTROWS);
    axes(svg,W,H,L,B,Tp,max,v=>v+'M');
    const sc=(H-B-Tp)/max,bw=(W-L-8)/T;
    for(let i=0;i<T;i++){const x=L+i*bw+4;
      const hn=NORM*sc, hh=hotPer[i]*sc;
      svg.appendChild(el('rect',{x,y:H-B-hn,width:bw-8,height:hn,class:'bar'}));
      if(hh>0) svg.appendChild(el('rect',{x,y:H-B-hn-hh,width:bw-8,height:hh,class:'bar hot'}));
      svg.appendChild(el('text',{x:x+(bw-8)/2,y:H-8,'text-anchor':'middle',class:'tick'},'t'+(i+1)));}
    const mx=Math.max(...hotPer.map(v=>v+NORM));
    document.getElementById('s4-verdict').innerHTML=
      `<div>Task más cargada: <b>${mx.toFixed(1)} M filas</b> (sin salting: ${(HOTROWS+NORM).toFixed(1)} M)</div>
       <div class="c">Lado pequeño del join replicado ×${n}: 100 k → ${(100*n).toLocaleString('es')} k filas</div>`;
  }
  s4.addEventListener('input',draw4); draw4();

  } catch (e) { console.error('4b. salting', e); } }

  /* ---------- 0a. shuffle paso a paso ---------- */
  if (document.getElementById('sh-chart')) { try {
  const MAPS=[[0,2,1,0,3,2,0,1],[1,1,3,0,2,2,3,1],[2,0,0,3,1,2,3,3]];
  const MAPEX=[1,2,3], REDEX=[1,2,3,1];
  let step=1, sel=-1;
  const SH_TXT={
    1:'<b>Datos leídos.</b> Cada map task tiene filas de todas las claves, en el orden en que llegaron del archivo. El color indica a qué partición destino irá cada fila (hash de la clave módulo 4). Todavía no se ha movido nada.',
    2:'<b>Shuffle write.</b> Cada map task ordena sus filas por partición destino y escribe <b>un archivo</b> en el disco local de su executor, dividido en un bloque por partición. Esto se mide como <i>Shuffle Write</i> en el stage que termina aquí.',
    3:'<b>Shuffle read.</b> Cada reduce task recoge su bloque de <b>todos</b> los archivos. Línea continua: el archivo está en su mismo executor (lectura local). Discontinua: viaja por red (lectura remota). Toca R1…R4 para ver una sola.',
    4:'<b>Resultado.</b> Cada reduce task tiene ya todas las filas de sus claves y puede agregar, unir u ordenar. Fíjate en que aquí las 4 reciben 6 filas: no hay skew. Si una clave pesara mucho, una caja se llenaría y las demás no.'
  };
  function drawSh(){
    const svg=document.getElementById('sh-chart'); svg.textContent='';
    const sq=13, gap=4;
    // map boxes
    MAPS.forEach((rows,m)=>{
      const x=6,y=14+m*96,w=104,h=80;
      svg.appendChild(el('rect',{x,y,width:w,height:h,rx:5,class:'box'}));
      svg.appendChild(el('text',{x:x+7,y:y+14,class:'boxlbl'},'M'+(m+1)));
      svg.appendChild(el('text',{x:x+w-7,y:y+14,'text-anchor':'end',class:'sub'},'executor '+MAPEX[m]));
      const order=step>=2?[...rows].sort((a,b)=>a-b):rows;
      order.forEach((p,i)=>{const cx=x+10+(i%4)*(sq+gap), cy=y+26+Math.floor(i/4)*(sq+gap);
        svg.appendChild(el('rect',{x:cx,y:cy,width:sq,height:sq,rx:2,class:'p'+p,opacity:step===4?0.25:1}));});
      if(step>=2){
        // archivo de shuffle con bloques
        const fx=128,fw=34; let fy=y+4; const unit=72/8;
        svg.appendChild(el('text',{x:fx+fw/2,y:y-2,'text-anchor':'middle',class:'sub'},'archivo'));
        for(let p=0;p<4;p++){const n=rows.filter(v=>v===p).length;const hh=n*unit;
          if(n){svg.appendChild(el('rect',{x:fx,y:fy,width:fw,height:hh-1.5,class:'p'+p,opacity:(sel===-1||sel===p)?1:0.25}));
            if(n>=2) svg.appendChild(el('text',{x:fx+fw/2,y:fy+hh/2+3,'text-anchor':'middle',class:'sub',style:'fill:var(--surface)'},n));}
          // flows
          if(step>=3&&n){
            const ry=14+p*72+28, remote=MAPEX[m]!==REDEX[p];
            const x1=fx+fw, y1=fy+hh/2, x2=250;
            svg.appendChild(el('path',{d:`M${x1},${y1} C${x1+40},${y1} ${x2-40},${ry} ${x2},${ry}`,class:'flow s'+p+(remote?' remote':'')+((sel!==-1&&sel!==p)?' dim':'')}));
          }
          fy+=hh;}
      }
    });
    // reduce boxes
    if(step>=3){
      for(let p=0;p<4;p++){
        const x=250,y=14+p*72,w=104,h=56, on=(sel===-1||sel===p);
        svg.appendChild(el('rect',{x,y,width:w,height:h,rx:5,class:'box',opacity:on?1:0.35}));
        svg.appendChild(el('text',{x:x+7,y:y+14,class:'boxlbl',opacity:on?1:0.4},'R'+(p+1)));
        svg.appendChild(el('text',{x:x+w-7,y:y+14,'text-anchor':'end',class:'sub'},'executor '+REDEX[p]));
        const tot=MAPS.reduce((a,r)=>a+r.filter(v=>v===p).length,0);
        if(step===4){for(let i=0;i<tot;i++){svg.appendChild(el('rect',{x:x+8+i*15,y:y+26,width:11,height:11,rx:2,class:'p'+p}));}}
        else svg.appendChild(el('text',{x:x+7,y:y+38,class:'sub'},'lee '+tot+' filas'));
      }
    }
    // info
    let info=SH_TXT[step];
    if(step>=3){
      const ps=sel===-1?[0,1,2,3]:[sel]; let loc=0,rem=0;
      ps.forEach(p=>MAPS.forEach((r,m)=>{const n=r.filter(v=>v===p).length;if(MAPEX[m]===REDEX[p])loc+=n;else rem+=n;}));
      info+=`<div style="margin-top:.4rem">${sel===-1?'Todas las reduce tasks':'R'+(sel+1)}: <span class="pill ok">local ${loc}</span><span class="pill bad">remoto ${rem}</span> filas · ${ps.length*3} bloques leídos</div>`;
    } else if(step===2){
      info+=`<div style="margin-top:.4rem">Bloques escritos: 3 map tasks × 4 particiones = <b>12</b>. Las 24 filas se escriben una vez.</div>`;
    }
    document.getElementById('sh-info').innerHTML=info;
  }
  document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{
    step=+b.dataset.step; document.querySelectorAll('[data-step]').forEach(x=>x.setAttribute('aria-pressed',x===b));
    document.getElementById('sh-sel').hidden=step<2; drawSh();}));
  document.querySelectorAll('[data-sel]').forEach(b=>b.addEventListener('click',()=>{
    sel=+b.dataset.sel; document.querySelectorAll('[data-sel]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawSh();}));
  document.getElementById('sh-sel').hidden=true;
  drawSh();

  } catch (e) { console.error('0a. shuffle paso a paso', e); } }

  /* ---------- 0b. write vs read ---------- */
  if (document.getElementById('sw-partial')) { try {
  const swP=document.getElementById('sw-partial'),swM=document.getElementById('sw-m'),swK=document.getElementById('sw-k'),swR=document.getElementById('sw-r'),swE=document.getElementById('sw-e');
  const fmtB=b=>b>=1e12?(b/1e12).toFixed(1)+' TB':b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(0)+' KB':Math.round(b)+' B';
  const fmtN=n=>n>=1e9?(n/1e9).toFixed(1)+' mil M':n>=1e6?(n/1e6).toFixed(1)+' M':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+' k':Math.round(n)+'';
  function drawSw(){
    const M=+swM.value, K=Math.round(Math.pow(10,+swK.value)), R=+swR.value, E=+swE.value, partial=swP.checked;
    const ROWS=1e6, RB=40;
    document.getElementById('sw-m-o').textContent=M;
    document.getElementById('sw-k-o').textContent=fmtN(K);
    document.getElementById('sw-r-o').textContent=R;
    document.getElementById('sw-e-o').textContent=E;
    const totalRows=M*ROWS;
    const recW=partial?M*Math.min(ROWS,K):totalRows;
    const bytes=recW*RB, full=totalRows*RB;
    const loc=bytes/E, rem=bytes-loc;
    const filled=Math.min(R,K), perTask=bytes/filled, empty=R-filled;
    const blocks=M*Math.min(R,K);
    const svg=document.getElementById('sw-chart'); svg.textContent='';
    const L=92,W=352,maxW=W-L; const sc=maxW/full;
    const row=(y,label,sublabel)=>{svg.appendChild(el('text',{x:0,y:y+12,class:'boxlbl'},label));svg.appendChild(el('text',{x:0,y:y+24,class:'sub'},sublabel));svg.appendChild(el('rect',{x:L,y,width:maxW,height:22,rx:3,class:'bg-bar'}));};
    row(10,'Write','stage N');
    svg.appendChild(el('rect',{x:L,y:10,width:Math.max(bytes*sc,1.5),height:22,rx:3,class:'p0'}));
    row(52,'Read','stage N+1');
    svg.appendChild(el('rect',{x:L,y:52,width:Math.max(loc*sc,loc>0?1.5:0),height:22,class:'loc'}));
    svg.appendChild(el('rect',{x:L+loc*sc,y:52,width:Math.max(rem*sc,rem>0?1.5:0),height:22,class:'rem'}));
    svg.appendChild(el('text',{x:W,y:92,'text-anchor':'end',class:'sub'},'escala: lo que se movería sin agregación parcial ('+fmtB(full)+')'));
    document.getElementById('sw-table').innerHTML=`<tbody>
      <tr><td>Filas de entrada</td><td class="num">${fmtN(totalRows)}</td></tr>
      <tr><td>Shuffle write records</td><td class="num">${fmtN(recW)}</td></tr>
      <tr><td>Shuffle write size = read size</td><td class="num">${fmtB(bytes)}</td></tr>
      <tr><td>Read local / remoto</td><td class="num">${fmtB(loc)} / ${fmtB(rem)}</td></tr>
      <tr><td>Reduce tasks con datos</td><td class="num">${filled.toLocaleString('es')} de ${R.toLocaleString('es')}</td></tr>
      <tr><td>Read por reduce task (promedio)</td><td class="num">${fmtB(perTask)}</td></tr>
      <tr><td>Bloques con datos (map × reduce)</td><td class="num">${fmtN(blocks)}</td></tr></tbody>`;
    const v=[];
    v.push(partial?`<div><span class="pill ok">PARCIAL</span>Cada map task envía como mucho una fila por clave: ${fmtN(Math.min(ROWS,K))} de 1 M. El shuffle es ${(full/bytes).toFixed(full/bytes<10?1:0)}× más pequeño que sin agregación parcial.</div>`
                   :`<div><span class="pill bad">SIN PARCIAL</span>Las ${fmtN(totalRows)} filas viajan tal cual. Es lo que pasa con una ventana o un join.</div>`);
    if(perTask>200e6) v.push(`<div><span class="pill bad">SPILL PROBABLE</span>Cada reduce task lee ~${fmtB(perTask)}, por encima de los 128–200 MB por tarea de la guía. Sube las particiones o usa <code>auto</code>.</div>`);
    if(empty>0) v.push(`<div><span class="pill bad">VACÍAS</span>${empty.toLocaleString('es')} reduce tasks no reciben nada (hay menos claves que particiones). AQE las une tras el shuffle.</div>`);
    if(E===1) v.push(`<div><span class="pill ok">LOCAL</span>Con un solo executor no hay lectura remota.</div>`);
    document.getElementById('sw-verdict').innerHTML=v.join('');
    const per=bytes/M, outK=Math.min(K,totalRows);
    const mm=x=>`${UI.bytes(x)} (${UI.bytes(per*0.92)}, ${UI.bytes(per)}, ${UI.bytes(per*1.08)})`;
    document.getElementById('sw-ui').innerHTML=UI.frame('SQL / DataFrame',`<h5>Details for Query 3</h5><div class="sq">
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (1)</div><div class="sq-n"><b>Scan parquet ventas</b><div>number of output rows: ${UI.rec(totalRows)}</div></div>${partial?`<div class="sq-n"><b>HashAggregate</b><div>number of output rows: ${UI.rec(recW)}</div><div>spill size total (min, med, max): 0.0 B (0.0 B, 0.0 B, 0.0 B)</div></div>`:''}</div>
      <div class="sq-n ex"><b>Exchange</b><div>shuffle records written: ${UI.rec(recW)}</div><div>shuffle bytes written total (min, med, max): ${mm(bytes)}</div><div>local bytes read total: ${UI.bytes(loc)}</div><div>remote bytes read total: ${UI.bytes(rem)}</div></div>
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (2)</div><div class="sq-n"><b>HashAggregate</b><div>number of output rows: ${UI.rec(outK)}</div></div></div></div>`,
      'Recreación del plan en la pestaña SQL / DataFrame. Compara <i>number of output rows</i> del primer HashAggregate con el del Scan: así se comprueba la agregación parcial en la UI real.'+(partial?'':' Sin agregación parcial, el Exchange recibe todas las filas del Scan.'));
  }
  [swP,swM,swK,swR,swE].forEach(x=>x.addEventListener('input',drawSw)); swP.addEventListener('change',drawSw); drawSw();

  } catch (e) { console.error('0b. write vs read', e); } }

  /* ---------- 0a-1. del código a los stages ---------- */
  if (document.getElementById('dag-out')) { try {
  const Q={
    narrow:{code:`(spark.read.table("A")
   .filter("pais = 'CO'")
   .select("id", "monto")
   .write.saveAsTable("A_co"))`,
      jobs:[{label:'Job 1 · la acción write',stages:[{n:'Stage 1',ops:['Scan A','Filter','Project','Write'],tasks:'80 tasks (una por archivo de ~128 MB)'}]}],
      info:'<b>Un solo stage.</b> Filter y select son transformaciones narrow: cada task trabaja con su partición sin necesitar filas de otras. No hay Exchange, así que no hay frontera de stage. 80 tasks con 32 cores son 3 waves (32 + 32 + 16).'},
    agg:{code:`(spark.read.table("A")
   .groupBy("cliente_id").count()
   .write.saveAsTable("conteo"))`,
      jobs:[{label:'Job 1 · la acción write',stages:[
        {n:'Stage 1',ops:['Scan A','HashAggregate (parcial)','Exchange · write'],tasks:'80 tasks · map'},
        {sep:'shuffle'},
        {n:'Stage 2',ops:['Exchange · read','HashAggregate (final)','Write'],tasks:'200 tasks · reduce (o menos con AQE)'}]}],
      info:'<b>Dos stages.</b> El groupBy necesita juntar las filas de cada cliente, y eso obliga a un shuffle. El Stage 1 agrega lo que puede dentro de cada partición y escribe el shuffle. El Stage 2 no empieza hasta que terminan las 80 tasks del Stage 1.'},
    smj:{code:`A = spark.read.table("A")
B = spark.read.table("B")
A.join(B, "cliente_id").write.saveAsTable("AB")`,
      jobs:[{label:'Job 1 · la acción write',stages:[
        {n:'Stage 1',ops:['Scan A','Exchange · write'],tasks:'80 tasks'},
        {n:'Stage 2',ops:['Scan B','Exchange · write'],tasks:'40 tasks'},
        {sep:'shuffle ×2'},
        {n:'Stage 3',ops:['Exchange · read (A y B)','Sort','SortMergeJoin','Write'],tasks:'200 tasks'}]}],
      info:'<b>Tres stages.</b> Los dos lados del join se reparten por <code>cliente_id</code>, cada uno en su propio stage. Los Stages 1 y 2 son independientes y pueden correr a la vez. El Stage 3 espera a los dos.'},
    bhj:{code:`from pyspark.sql.functions import broadcast
A.join(broadcast(B_peq), "cliente_id") \\
 .write.saveAsTable("AB")`,
      jobs:[
        {label:'Job aparte · construir el broadcast',stages:[{n:'Stage 1',ops:['Scan B_peq','BroadcastExchange'],tasks:'pocas tasks → se junta y se copia a cada executor'}]},
        {label:'Job principal · la acción write',stages:[{n:'Stage 2',ops:['Scan A','BroadcastHashJoin','Write'],tasks:'80 tasks · A no se mueve'}]}],
      info:'<b>La tabla grande no hace shuffle.</b> La pequeña se recoge y se copia entera a cada executor (normalmente lo verás como un job aparte en el Spark UI). Luego cada task de A hace el join con su copia local. Por eso el broadcast es la forma más barata de evitar un shuffle.'},
    aggsort:{code:`(spark.read.table("A")
   .groupBy("cliente_id").count()
   .orderBy("count", ascending=False)
   .write.saveAsTable("ranking"))`,
      jobs:[{label:'Job(s) · la acción write',stages:[
        {n:'Stage 1',ops:['Scan A','HashAggregate (parcial)','Exchange · hash'],tasks:'80 tasks'},
        {sep:'shuffle'},
        {n:'Stage 2',ops:['HashAggregate (final)','Exchange · range'],tasks:'200 tasks'},
        {sep:'shuffle'},
        {n:'Stage 3',ops:['Sort','Write'],tasks:'200 tasks'}]}],
      info:'<b>Tres stages, dos shuffles.</b> El groupBy reparte por hash de la clave. El orderBy global vuelve a repartir, esta vez por <b>rangos</b> de <code>count</code>, para que cada task ordene su tramo. Cada Exchange añade una frontera de stage.'}
  };
  function scopes(ops,cg){
    const out=[]; let buf=[];
    const flush=()=>{ if(buf.length){ out.push({l:'WholeStageCodegen ('+(++cg.n)+')',s:buf.join(', ')}); buf=[]; } };
    ops.forEach(o=>{
      if(/^Exchange/.test(o)){flush(); out.push({l:'Exchange'});}
      else if(/^Scan/.test(o)){flush(); out.push({l:'Scan parquet '+o.replace(/^Scan\s*/,'')});}
      else if(/^BroadcastExchange/.test(o)){flush(); out.push({l:'BroadcastExchange'});}
      else if(/^Write/.test(o)){flush(); out.push({l:'WriteFiles'});}
      else buf.push(o.replace(/ \(.*\)$/,''));
    }); flush(); return out;
  }
  function drawDag(k){
    const q=Q[k]; document.getElementById('dag-code').textContent=q.code;
    const cg={n:0}; let body='';
    q.jobs.forEach((j,ji)=>{
      body+=`<div class="dv-job">${j.label}</div>`;
      j.stages.forEach(st=>{
        if(st.sep){ body+=`<div class="dv-edge" aria-hidden="true">→</div>`; return; }
        body+=`<div class="dv-stage"><div class="lbl">${st.n}<small>${st.tasks.split(' ')[0]} tasks</small></div>${scopes(st.ops,cg).map(x=>`<div class="dv-scope">${x.l}${x.s?`<small>${x.s}</small>`:''}<span class="dot"></span></div>`).join('')}</div>`;
      });
    });
    const out=document.getElementById('dag-out'); out.classList.remove('dag');
    out.innerHTML=UI.frame('Jobs',`<h5>Details for Job 3</h5><div class="ui-link">DAG Visualization</div><div class="dv">${body}</div>`,
      'Recreación de la DAG Visualization: cada caja rosada es un stage, cada caja azul un bloque de operaciones (dentro de WholeStageCodegen van fusionadas) y cada punto un RDD. En la UI real los stages saltados salen en gris.');
    document.getElementById('dag-info').innerHTML=q.info;
  }
  document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-q]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawDag(b.dataset.q);}));
  drawDag('narrow');

  } catch (e) { console.error('0a-1. del código a los stages', e); } }

  /* ---------- 0a-2. waves ---------- */
  if (document.getElementById('wv-n')) { try {
  const wvN=document.getElementById('wv-n'), wvC=document.getElementById('wv-c');
  let wvSkew='none', wvView='concept';
  const WORK=512, OVH=0.5, WCLS=['p0','p3','p1','p2'];
  const stageTime=(n,c)=>Math.ceil(n/c)*(WORK/n+OVH);
  function simulate(n,c,skew){
    const t=WORK/n+OVH; const free=Array(c).fill(0); const out=[];
    const slow=skew==='first'?0:skew==='last'?n-1:-1;
    for(let i=0;i<n;i++){
      let core=0; for(let j=1;j<c;j++) if(free[j]<free[core]-1e-9) core=j;
      const d=i===slow?t*4:t; const s=free[core]; free[core]=s+d;
      out.push({i,core,s,d,wave:Math.floor(i/c),slow:i===slow});
    }
    return {tasks:out,end:Math.max(...free),t};
  }
  function drawWv(){
    const n=+wvN.value,c=+wvC.value;
    document.getElementById('wv-n-o').textContent=n; document.getElementById('wv-c-o').textContent=c;
    const sim=simulate(n,c,wvSkew);
    const svg=document.getElementById('wv-gantt'); svg.textContent='';
    const L=40,R=356,T=6,B=24,H=190; const ph=H-T-B, rh=ph/c;
    const xmax=niceMax(sim.end);
    const xs=v=>L+(R-L)*v/xmax;
    for(let i=0;i<=4;i++){const v=xmax*i/4,x=xs(v);
      svg.appendChild(el('line',{x1:x,x2:x,y1:T,y2:H-B,class:'ax',opacity:i?0.4:1}));
      svg.appendChild(el('text',{x,y:H-B+12,'text-anchor':'middle',class:'tick'},Math.round(v)+'s'));}
    svg.appendChild(el('text',{x:2,y:T+8,class:'tick'},'core'));
    [0,c-1].forEach(r=>svg.appendChild(el('text',{x:L-4,y:T+r*rh+rh/2+3,'text-anchor':'end',class:'tick'},r+1)));
    sim.tasks.forEach(k=>{
      const x=xs(k.s),w=Math.max(xs(k.s+k.d)-x-0.6,0.6);
      svg.appendChild(el('rect',{x,y:T+k.core*rh+Math.min(0.6,rh*0.12),width:w,height:Math.max(rh-Math.min(1.2,rh*0.24),0.8),
        class:k.slow?'bar hot':WCLS[Math.min(k.wave,3)]}));
    });
    // end line
    const xe=xs(sim.end); svg.appendChild(el('line',{x1:xe,x2:xe,y1:T,y2:H-B,class:'ln thr'}));
    svg.appendChild(el('text',{x:xe>R-60?xe-3:xe+3,y:H-4,'text-anchor':xe>R-60?'end':'start',class:'lbl thr'},'fin '+sim.end.toFixed(1)+'s'));
    const waves=Math.ceil(n/c), last=n-(waves-1)*c;
    const busy=sim.tasks.reduce((a,k)=>a+k.d,0), util=busy/(c*sim.end);
    const ideal=WORK/c;
    document.getElementById('wv-table').innerHTML=`<tbody>
      <tr><td>Waves = ⌈${n} ÷ ${c}⌉</td><td class="num">${waves}</td></tr>
      <tr><td>Tasks en la última wave</td><td class="num">${last} de ${c}</td></tr>
      <tr><td>Duración de cada task</td><td class="num">${sim.t.toFixed(1)} s</td></tr>
      <tr><td>Duración del stage</td><td class="num">${sim.end.toFixed(1)} s</td></tr>
      <tr><td>Ideal (trabajo ÷ cores, sin arranque)</td><td class="num">${ideal.toFixed(1)} s</td></tr>
      <tr><td>Uso de los cores</td><td class="num">${Math.round(util*100)}%</td></tr></tbody>`;
    const v=[];
    if(n===1) v.push('<div><span class="pill bad">1 TASK</span>Un solo core trabaja. La doc de Databricks lo marca como señal de problema.</div>');
    else if(n<c) v.push(`<div><span class="pill bad">CORES OCIOSOS</span>Solo ${n} de ${c} cores trabajan durante todo el stage. Añadir workers no ayuda; más tasks, sí (<code>repartition()</code> o más particiones).</div>`);
    if(n>=c&&n%c===0&&wvSkew==='none') v.push(`<div><span class="pill ok">MÚLTIPLO</span>${n} es múltiplo de ${c}: todas las waves van llenas.</div>`);
    if(n>c&&last/c<=0.5) v.push(`<div><span class="pill bad">ÚLTIMA WAVE CASI VACÍA</span>En la wave ${waves} solo trabajan ${last} cores y ${c-last} esperan.</div>`);
    if(OVH/sim.t>0.25) v.push(`<div><span class="pill bad">TASKS DIMINUTAS</span>El arranque fijo es el ${Math.round(OVH/sim.t*100)}% de cada task.</div>`);
    if(wvSkew!=='none') v.push(`<div><span class="pill bad">TASK LENTA</span>${wvSkew==='last'?'Llega al final: todo el stage espera por ella.':'Empieza pronto: el resto se reparte en los otros cores y parte del retraso se esconde.'}</div>`);
    document.getElementById('wv-verdict').innerHTML=v.join('');
    if(wvView==='ui') drawWvUI(sim,n,c);
    // sawtooth
    const s2=document.getElementById('wv-saw'); s2.textContent='';
    const SL=40,SR=356,ST=8,SB=22,SH=170;
    const ymax=niceMax(Math.min(stageTime(1,c),ideal*4));
    const sx=x=>SL+(SR-SL)*(x-1)/255, sy=y=>SH-SB-(SH-SB-ST)*Math.min(y,ymax)/ymax;
    for(let i=0;i<=4;i++){const yv=ymax*i/4,y=sy(yv);
      s2.appendChild(el('line',{x1:SL,x2:SR,y1:y,y2:y,class:'ax',opacity:i?0.4:1}));
      s2.appendChild(el('text',{x:SL-4,y:y+3,'text-anchor':'end',class:'tick'},Math.round(yv)+'s'));}
    [1,64,128,192,256].forEach(x=>s2.appendChild(el('text',{x:sx(x),y:SH-6,'text-anchor':'middle',class:'tick'},x)));
    let d=''; for(let x=1;x<=256;x++){d+=(x===1?'M':'L')+sx(x).toFixed(1)+','+sy(stageTime(x,c)).toFixed(1);}
    s2.appendChild(el('path',{d,style:'fill:none;stroke:var(--cool);stroke-width:1.5'}));
    const iy=sy(ideal); s2.appendChild(el('line',{x1:SL,x2:SR,y1:iy,y2:iy,class:'ln med'}));
    s2.appendChild(el('text',{x:SR,y:iy-3,'text-anchor':'end',class:'lbl med'},'ideal '+ideal.toFixed(0)+'s'));
    s2.appendChild(el('circle',{cx:sx(n),cy:sy(stageTime(n,c)),r:4,style:'fill:var(--hot);stroke:var(--surface);stroke-width:1.5'}));
    s2.appendChild(el('text',{x:SR,y:ST+8,'text-anchor':'end',class:'tick'},'tasks →'));
  }
  function drawWvUI(sim,n,c){
    const E=Math.max(1,c/4), LH=c>16?9:13, L=92, R=512, T=8, H=T+c*LH+22, xmax=tickMax(sim.end*1.01), xs=v=>L+(R-L)*v/xmax;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox',`0 0 520 ${H}`); svg.style.minWidth='520px';
    UI.axis(svg,L,R,T,H-22,xmax,xs);
    for(let e=0;e<E;e++){ const y=T+e*4*LH;
      svg.appendChild(el('rect',{x:0,y,width:R,height:4*LH,style:`fill:${e%2?'#FAFAFA':'#FFFFFF'}`}));
      svg.appendChild(el('line',{x1:0,x2:R,y1:y,y2:y,style:'stroke:#DDD'}));
      svg.appendChild(el('text',{x:4,y:y+2*LH+3,style:'fill:#333;font-size:9.5px'},`${e} / 10.139.64.${11+e}`)); }
    UI.axis(svg,L,R,T,H-22,xmax,xs);
    sim.tasks.forEach(k=>{
      const work=Math.max(k.d-0.6,0.05), ph=[0.15,0.2,work*0.12,work*0.78,work*0.10,0.05,0.10];
      let x=xs(k.s); const y=T+k.core*LH+1, hgt=LH-2;
      ph.forEach((d,i)=>{ const w=(xs(k.s+k.d)-xs(k.s))*d/ph.reduce((a,b)=>a+b,0); svg.appendChild(el('rect',{x,y,width:Math.max(w,0.3),height:hgt,style:`fill:${UI.PH[i][1]}`})); x+=w; });
      if(k.slow) svg.appendChild(el('rect',{x:xs(k.s),y,width:xs(k.s+k.d)-xs(k.s),height:hgt,style:'fill:none;stroke:#C9302C;stroke-width:1'}));
    });
    const box=document.getElementById('wv-ui'); box.innerHTML=UI.frame('Stages',`<h5>Details for Stage 5 (Attempt 0)</h5><div class="ui-link">Event Timeline</div><div style="font-size:12px;margin:.2rem 0">☐ Enable zooming &nbsp;&nbsp; Tasks: ${n}. 1 Pages.</div>${UI.legend(UI.PH.map(p=>[p[0],p[1]]))}<div id="wv-ui-svg"></div>`,
      'Recreación del Event Timeline del stage: una fila por task agrupada por executor (aquí 4 cores por executor) y cada barra partida en las 7 fases que muestra la UI. Si las tasks son diminutas, la barra deja de ser verde: el tiempo se va en fases que no son cómputo.');
    box.querySelector('#wv-ui-svg').appendChild(svg);
  }
  viewToggle('wv-view',v=>{ wvView=v; document.getElementById('wv-concept').hidden=(v==='ui'); document.getElementById('wv-ui').hidden=(v!=='ui'); drawWv(); });
  [wvN,wvC].forEach(x=>x.addEventListener('input',drawWv));
  document.querySelectorAll('[data-skew]').forEach(b=>b.addEventListener('click',()=>{
    wvSkew=b.dataset.skew; document.querySelectorAll('[data-skew]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawWv();}));
  drawWv();

  } catch (e) { console.error('0a-2. waves', e); } }

  /* ---------- 6a. data skipping ---------- */
  if (document.getElementById('lc-chart')) { try {
  let lcLay='ingest', lcQ='cli';
  const QCLI=4217, QDAY=12, F0=1, F1=31, C0=1, C1=10001;
  const jit=i=>((Math.sin(i*12.9898)*43758.5453)%1+1)%1;
  function layout(k){
    const f=[];
    for(let i=0;i<16;i++){
      if(k==='rand') f.push({x0:F0+jit(i)*1.5,x1:F1-jit(i+40)*1.5,y0:C0+jit(i+80)*500,y1:C1-jit(i+120)*500});
      if(k==='ingest'){const w=(F1-F0)/16; f.push({x0:F0+i*w,x1:F0+(i+1)*w,y0:C0+jit(i)*300,y1:C1-jit(i+9)*300});}
      if(k==='c1'){const h=(C1-C0)/16; f.push({x0:F0,x1:F1,y0:C0+i*h,y1:C0+(i+1)*h});}
      if(k==='c2'){const w=(F1-F0)/4,h=(C1-C0)/4,a=i%4,b=Math.floor(i/4); f.push({x0:F0+a*w,x1:F0+(a+1)*w,y0:C0+b*h,y1:C0+(b+1)*h});}
    }
    return f;
  }
  function drawLc(){
    const files=layout(lcLay), svg=document.getElementById('lc-chart'); svg.textContent='';
    const L=48,R=352,T=8,B=30,H=230;
    const sx=v=>L+(R-L)*(v-F0)/(F1-F0), sy=v=>H-B-(H-B-T)*(v-C0)/(C1-C0);
    [0,2500,5000,7500,10000].forEach(v=>{const y=sy(Math.max(v,C0));svg.appendChild(el('line',{x1:L,x2:R,y1:y,y2:y,class:'ax',opacity:v?0.35:1}));svg.appendChild(el('text',{x:L-4,y:y+3,'text-anchor':'end',class:'tick'},v.toLocaleString('es')));});
    [1,8,15,22,29].forEach(d=>{const x=sx(d+0.5);svg.appendChild(el('text',{x,y:H-B+12,'text-anchor':'middle',class:'tick'},'día '+d));});
    svg.appendChild(el('text',{x:R,y:H-3,'text-anchor':'end',class:'tick'},'fecha →'));
    svg.appendChild(el('text',{x:4,y:T+8,class:'tick'},'cliente_id'));
    const hitC=f=>f.y0<=QCLI&&f.y1>QCLI, hitF=f=>f.x0<QDAY+1&&f.x1>QDAY;
    const hit=f=>lcQ==='cli'?hitC(f):lcQ==='fec'?hitF(f):(hitC(f)&&hitF(f));
    let n=0;
    files.forEach(f=>{const h=hit(f); if(h)n++;
      svg.appendChild(el('rect',{x:sx(f.x0)+1,y:sy(f.y1)+1,width:Math.max(sx(f.x1)-sx(f.x0)-2,1),height:Math.max(sy(f.y0)-sy(f.y1)-2,1),rx:2,
        style:h?'fill:color-mix(in srgb,var(--hot) 28%,transparent);stroke:var(--hot);stroke-width:1.2':'fill:color-mix(in srgb,var(--cool) 14%,transparent);stroke:color-mix(in srgb,var(--cool) 55%,transparent);stroke-width:.8'}));});
    if(lcQ!=='fec'){const y=sy(QCLI);svg.appendChild(el('line',{x1:L,x2:R,y1:y,y2:y,style:'stroke:var(--ink);stroke-width:1.6'}));svg.appendChild(el('text',{x:R-2,y:y-4,'text-anchor':'end',class:'lbl',style:'fill:var(--ink)'},'cliente_id = 4217'));}
    if(lcQ!=='cli'){const x0=sx(QDAY),x1=sx(QDAY+1);svg.appendChild(el('rect',{x:x0,y:T,width:x1-x0,height:H-B-T,style:'fill:color-mix(in srgb,var(--ink) 18%,transparent)'}));svg.appendChild(el('text',{x:x1+3,y:T+10,class:'lbl',style:'fill:var(--ink)'},'fecha = 12'));}
    const notes={rand:'Cada archivo tiene filas de casi todos los clientes y días, así que sus rangos lo cubren todo. Pasa con tablas muy modificadas por MERGE o cargadas sin orden.',
      ingest:'Los datos llegan día a día, así que cada archivo cubre pocos días pero todos los clientes. Sin hacer nada, ya hay un orden natural por fecha.',
      c1:'OPTIMIZE agrupó las filas por cliente_id: cada archivo cubre un tramo de clientes y todas las fechas.',
      c2:'Con dos claves, cada archivo cubre un bloque de clientes y de fechas. Ningún filtro queda perfecto, pero los dos saltan la mayoría.'};
    document.getElementById('lc-verdict').innerHTML=`<div><span class="pill ${n<=4?'ok':'bad'}">${n} / 16</span>archivos leídos · <b>${Math.round(n/16*100)}%</b> de la tabla · ${16-n} saltados por estadísticas mín/máx</div><div class="c">${notes[lcLay]}</div>`;
    const TOT=20e6, scanRows=TOT*n/16, outRows=lcQ==='cli'?TOT/10000:lcQ==='fec'?TOT/30:TOT/300000;
    document.getElementById('lc-ui').innerHTML=UI.frame('SQL / DataFrame',`<h5>Details for Query 8</h5><div class="sq">
      <div class="sq-cl"><div class="lbl">WholeStageCodegen (1)</div>
        <div class="sq-n"><b>Scan parquet ventas_lc</b><div>number of files read: ${n}</div><div>number of files pruned: ${16-n}</div><div>size of files read: ${UI.bytes(n*256*1024**2)}</div><div>number of output rows: ${UI.rec(scanRows)}</div></div>
        <div class="sq-n"><b>Filter</b><div>number of output rows: ${UI.rec(outRows)}</div></div></div></div>`,
      'Recreación del nodo de scan. Fíjate en que el Filter devuelve las mismas filas siempre: lo que cambia con el clustering es cuánto lee el Scan. Los nombres exactos de las métricas de archivos pueden variar según el runtime; compruébalos en tu workspace.');
  }
  document.querySelectorAll('[data-lay]').forEach(b=>b.addEventListener('click',()=>{lcLay=b.dataset.lay;document.querySelectorAll('[data-lay]').forEach(x=>x.setAttribute('aria-pressed',x===b));drawLc();}));
  document.querySelectorAll('[data-lq]').forEach(b=>b.addEventListener('click',()=>{lcQ=b.dataset.lq;document.querySelectorAll('[data-lq]').forEach(x=>x.setAttribute('aria-pressed',x===b));drawLc();}));
  drawLc();

  } catch (e) { console.error('6a. data skipping', e); } }

  /* ---------- 6b. ciclo de vida ---------- */
  if (document.getElementById('lc-files')) { try {
  const KEYS={A:{cls:'p0',name:'cliente_id'},B:{cls:'p1',name:'region'}};
  let lcFiles, lcKey;
  const lcInit=()=>{lcFiles=Array.from({length:6},()=>({k:'A'}));lcKey='A';};
  function drawFiles(changed,msg){
    const box=document.getElementById('lc-files'); box.textContent='';
    lcFiles.forEach((f,i)=>{const d=document.createElement('div');
      d.style.cssText=`width:2rem;height:2rem;border-radius:4px;display:grid;place-items:center;font:600 .7rem var(--f-mono);color:${f.k?'var(--surface)':'var(--muted)'};background:${f.k?'var(--'+KEYS[f.k].cls+')':'var(--line)'};outline:${changed&&changed.has(i)?'2px solid var(--hot)':'none'};outline-offset:1px`;
      d.textContent=f.k||'·'; d.title=f.k?'clusterizado por '+KEYS[f.k].name:'sin clusterizar'; box.appendChild(d);});
    const pend=lcFiles.filter(f=>!f.k).length, old=lcFiles.filter(f=>f.k&&f.k!==lcKey).length;
    document.getElementById('lc-log').innerHTML=`${msg}<div style="margin-top:.4rem"><span class="pill ok">claves: ${KEYS[lcKey].name}</span><span class="pill ${pend?'bad':'ok'}">${pend} sin clusterizar</span>${old?`<span class="pill bad">${old} con la clave vieja</span>`:''}</div>`;
  }
  const OPS={
    insert(){const s=new Set();for(let j=0;j<3;j++){s.add(lcFiles.length);lcFiles.push({k:null});}
      return [s,'<b>INSERT.</b> Llegan 3 archivos nuevos. Si la escritura fuera grande (más del umbral de clustering on write) ya llegarían clusterizados; aquí son pequeños y quedan sin clusterizar.'];},
    opt(){const s=new Set();lcFiles.forEach((f,i)=>{if(!f.k){f.k=lcKey;s.add(i);}});
      return [s,s.size?`<b>OPTIMIZE.</b> Reescribe solo los ${s.size} archivos sin clusterizar, con las claves actuales. Los demás no se tocan: es incremental.`:'<b>OPTIMIZE.</b> No hay datos sin clusterizar, así que no reescribe nada. Los archivos con la clave vieja tampoco se tocan.'];},
    alter(){lcKey=lcKey==='A'?'B':'A';
      return [new Set(),`<b>ALTER TABLE … CLUSTER BY (${KEYS[lcKey].name}).</b> Cambia las claves y no reescribe ningún archivo. Lo que llegue después y los próximos OPTIMIZE usarán la clave nueva.`];},
    full(){const s=new Set();lcFiles.forEach((f,i)=>{if(f.k!==lcKey){f.k=lcKey;s.add(i);}});
      return [s,s.size?`<b>OPTIMIZE FULL.</b> Reclusteriza todo lo que no está al día: ${s.size} archivos reescritos.`:'<b>OPTIMIZE FULL.</b> Todo ya estaba clusterizado con las claves actuales.'];},
    reset(){lcInit();return [new Set(),'Tabla con 6 archivos, todos clusterizados por cliente_id.'];}
  };
  document.querySelectorAll('[data-op]').forEach(b=>b.addEventListener('click',()=>{const [s,m]=OPS[b.dataset.op]();drawFiles(s,m);}));
  lcInit(); drawFiles(new Set(),'Tabla con 6 archivos, todos clusterizados por cliente_id. Pulsa las operaciones en orden.');

  } catch (e) { console.error('6b. ciclo de vida', e); } }

  /* ---------- 6c. particionar ---------- */
  if (document.getElementById('pt-gb')) { try {
  let ptCol='fecha'; const ptGb=document.getElementById('pt-gb');
  const PAIS=[0.7,0.1,0.06,0.04,0.03,0.025,0.02,0.015,0.005,0.005];
  const fmtGB=g=>g>=1000?(g/1000).toFixed(1)+' TB':g>=1?g.toFixed(g<10?1:0)+' GB':(g*1000).toFixed(g*1000<10?1:0)+' MB';
  function drawPt(){
    const T=Math.pow(10,+ptGb.value); document.getElementById('pt-gb-o').textContent=fmtGB(T);
    let sizes, N;
    if(ptCol==='fecha'){N=365;sizes=Array(40).fill(T/365);}
    else if(ptCol==='pais'){N=10;sizes=PAIS.map(w=>T*w);}
    else {N=100000;sizes=Array(40).fill(T/100000);}
    const svg=document.getElementById('pt-chart'); svg.textContent='';
    const L=46,R=354,Tp=8,B=20,H=150;
    const lo=-3,hi=4; const sy=g=>H-B-(H-B-Tp)*(Math.log10(Math.max(g,1e-3))-lo)/(hi-lo);
    [[-3,'1 MB'],[-2,'10 MB'],[-1,'100 MB'],[0,'1 GB'],[1,'10 GB'],[2,'100 GB'],[3,'1 TB'],[4,'10 TB']].forEach(([e,t])=>{const y=sy(Math.pow(10,e));svg.appendChild(el('line',{x1:L,x2:R,y1:y,y2:y,class:'ax',opacity:e===lo?1:0.3}));svg.appendChild(el('text',{x:L-4,y:y+3,'text-anchor':'end',class:'tick'},t));});
    const bw=(R-L)/sizes.length;
    sizes.forEach((g,i)=>{const y=sy(g);svg.appendChild(el('rect',{x:L+i*bw+1,y,width:Math.max(bw-2,1),height:H-B-y,class:'bar'+(g<1?' hot':'')}));});
    const y1=sy(1);svg.appendChild(el('line',{x1:L,x2:R,y1:y1,y2:y1,class:'ln thr'}));
    svg.appendChild(el('text',{x:R,y:H-6,'text-anchor':'end',class:'tick'},N>sizes.length?`primeras ${sizes.length} de ${N.toLocaleString('es')} particiones`:`${N} particiones`));
    const small=ptCol==='pais'?sizes.filter(g=>g<1).length:(T/N<1?N:0);
    const v=[];
    if(T<1000) v.push(`<div><span class="pill bad">&lt; 1 TB</span>La doc dice no particionar tablas de menos de 1 TB.</div>`);
    else if(T<=100000) v.push(`<div><span class="pill bad">1–100 TB</span>La doc recomienda liquid clustering en vez de particiones.</div>`);
    if(small) v.push(`<div><span class="pill bad">PEQUEÑAS</span>${small.toLocaleString('es')} de ${N.toLocaleString('es')} particiones tienen menos de 1 GB${ptCol==='cli'?` (unos ${fmtGB(T/N)} cada una): miles de directorios con archivos diminutos`:''}.</div>`);
    else v.push(`<div><span class="pill ok">≥ 1 GB</span>Todas las particiones superan el mínimo de 1 GB.</div>`);
    if(ptCol==='pais') v.push(`<div><span class="pill bad">SKEW</span>Una partición tiene el 70% de la tabla (${fmtGB(sizes[0])}) y las demás muy poco. Es el caso "tables with heavy data skew" para el que la doc recomienda liquid clustering.</div>`);
    v.push(`<div class="c">Con <code>CLUSTER BY (${ptCol==='cli'?'cliente_id':ptCol})</code> no hay un directorio por valor: los archivos agrupan rangos de valores, así que ni la cardinalidad ni el skew crean particiones diminutas o gigantes.</div>`);
    document.getElementById('pt-verdict').innerHTML=v.join('');
  }
  ptGb.addEventListener('input',drawPt);
  document.querySelectorAll('[data-pc]').forEach(b=>b.addEventListener('click',()=>{ptCol=b.dataset.pc;document.querySelectorAll('[data-pc]').forEach(x=>x.setAttribute('aria-pressed',x===b));drawPt();}));
  drawPt();

  } catch (e) { console.error('6c. particionar', e); } }

  /* ---------- 7. casos ---------- */
  if (document.getElementById('cs-list')) { try {
  const SM=(rows)=>`<div class="tblwrap"><table><thead><tr><th>Summary Metrics</th><th class="num">Min</th><th class="num">25th</th><th class="num">Median</th><th class="num">75th</th><th class="num">Max</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td>${r.slice(1).map(c=>`<td class="num">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const TB=(head,rows)=>`<div class="tblwrap"><table><thead><tr>${head.map((h,i)=>`<th${i?' class="num"':''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i?' class="num"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const KV=(rows)=>`<div class="tblwrap"><table><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('')}</tbody></table></div>`;
  const A=(href,txt)=>{const m=href.match(/^https:\/\/docs\.databricks\.com\/aws\/en\/(.*)$/);const az=m?' <a class="az" href="https://learn.microsoft.com/azure/databricks/'+m[1].replace(/^delta\/(clustering|data-skipping)/,'tables/$1')+'" target="_blank" rel="noopener">Azure</a>':'';return `<a href="${href}" target="_blank" rel="noopener">${txt}</a>`+az;};
  const AZ=(path,txt)=>`<a href="https://learn.microsoft.com/azure/databricks/${path}" target="_blank" rel="noopener">${txt}</a> <span class="c">(doc de Azure Databricks)</span>`;
  const D_AQE='https://docs.databricks.com/aws/en/optimizations/aqe', D_SKEW='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/long-spark-stage-page',
        D_LONG='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/long-spark-stage', D_LOWIO='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/slow-spark-stage-low-io',
        D_IO='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/long-spark-stage-io', D_GUIDE='https://www.databricks.com/discover/pages/optimize-data-workloads-guide',
        D_PART='https://docs.databricks.com/aws/en/tables/partitions', D_LC='https://docs.databricks.com/aws/en/tables/clustering', D_SCONF='https://docs.databricks.com/aws/en/spark/conf',
        D_DS='https://docs.databricks.com/aws/en/tables/data-skipping', D_QP='https://docs.databricks.com/aws/en/sql/user/queries/query-profile',
        D_QH='https://docs.databricks.com/aws/en/admin/system-tables/query-history', D_PI='https://docs.databricks.com/aws/en/sql/user/queries/performance-insights',
        D_STC='https://docs.databricks.com/aws/en/admin/system-tables/compute', D_PANDAS='https://docs.databricks.com/aws/en/pandas/pyspark-pandas-conversion',
        D_HINTS='https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-qry-select-hints', D_PO='https://docs.databricks.com/aws/en/optimizations/predictive-optimization',
        D_CONV='https://docs.databricks.com/aws/en/tables/convert-to-managed', D_POST='https://docs.databricks.com/aws/en/admin/system-tables/predictive-optimization',
        S_CONF='https://spark.apache.org/docs/latest/configuration.html', S_TUNE='https://spark.apache.org/docs/latest/sql-performance-tuning.html';
  const SECS={1:'Sección 1 · Desarrollo',3:'Sección 3 · Transformación',5:'Sección 5 · Monitoring',6:'Sección 6 · Cost &amp; Performance',9:'Sección 9 · Debugging',10:'Sección 10 · Data Modeling'};
  const CASES=[
    {id:'left-join-skew',sec:3,t:'Un LEFT JOIN que no termina',
     ctx:'Un job nocturno que tardaba 6 minutos ahora tarda más de 20. Nadie cambió el código. AQE está activado (el default).',
     ev:`<pre><code>SELECT c.*, v.monto
FROM dim_clientes c
LEFT JOIN ventas v ON c.cliente_id = v.cliente_id</code></pre>${SM([['Duration','4 s','15 s','18 s','22 s','14 min'],['Shuffle Read','20 MB','52 MB','60 MB','66 MB','9.1 GB']])}<p>En el plan: <code>SortMergeJoin LeftOuter</code>, sin <code>isSkew</code>. Un <code>groupBy(cliente_id).count()</code> sobre ventas muestra que <code>'GENERICO'</code> tiene el 40% de las filas.</p>`,
     q:'¿Qué haces?',
     o:[['Reescribir como <code>ventas v RIGHT JOIN dim_clientes c</code>, para que AQE pueda partir ventas.','En un RIGHT OUTER, AQE solo parte el lado derecho, que ahora es dim_clientes. El lado que conserva todas sus filas sigue siendo dim_clientes; cambiar la sintaxis no cambia la restricción.'],
        ['Subir <code>spark.sql.shuffle.partitions</code> a 2000.','La clave GENERICO sigue cayendo entera en una sola partición, tengas 200 o 2000.'],
        ['Tratar <code>GENERICO</code> aparte: un join broadcast para esa clave, el LEFT JOIN normal para el resto, y unir los dos resultados.','Correcto. Quitas la clave caliente del shuffle y el resto queda repartido.'],
        ['Bajar <code>skewedPartitionThresholdInBytes</code> a 64 MB para que AQE la detecte.','La partición ya tiene 9.1 GB y supera cualquier umbral. AQE no la parte por el tipo de join, no por el tamaño.']],
     c:2,
     ex:`<p>En un <code>LEFT OUTER JOIN</code>, AQE solo puede partir el skew del <b>lado izquierdo</b>. Aquí el skew está en ventas, que es el derecho, así que AQE no hace nada aunque la partición sea enorme.</p>
<pre><code><span class="c"># La clave caliente: INNER JOIN (GENERICO sí tiene ventas) con broadcast de su única fila de dim.
# En un LEFT JOIN no se puede hacer broadcast del lado izquierdo; en un INNER, sí.</span>
hot  = ventas.filter("cliente_id = 'GENERICO'") \\
             .join(F.broadcast(dim.filter("cliente_id = 'GENERICO'")), "cliente_id")
rest = dim.filter("cliente_id != 'GENERICO'") \\
          .join(ventas.filter("cliente_id != 'GENERICO'"), "cliente_id", "left")
res  = hot.unionByName(rest)</code></pre>
<p>Antes de eso, pregunta si <code>GENERICO</code> debería unirse siquiera. Si es un valor de relleno, como un <code>NULL</code>, filtrarlo es el primer remedio. Un aviso que es razonamiento mío, no de la doc: el salting clásico replica el lado pequeño N veces, y aquí ese lado es el que conserva sus filas. En un LEFT JOIN eso produce filas con <code>NULL</code> duplicadas para los clientes sin ventas.</p>`,
     src:A(D_AQE,'AQE · Why didn\'t AQE detect my data skew?'),tab:['aqe','joins']},

    {id:'spill-todas',sec:6,t:'Spill en todas las tasks',
     ctx:'Una agregación grande sobre un cluster clásico de 32 cores. Hay spill a disco y alguien propone hacer salting.',
     ev:`<p>Stage de la agregación: 200 tasks · Shuffle Read total 310 GB.</p>${SM([['Duration','1.9 min','2.1 min','2.2 min','2.3 min','2.6 min'],['Shuffle Read','1.4 GB','1.5 GB','1.5 GB','1.6 GB','1.7 GB'],['Spill (disk)','1.9 GB','2.0 GB','2.1 GB','2.2 GB','2.4 GB']])}`,
     q:'¿Cuál es la causa y qué haces?',
     o:[['Skew: aplicar salting a la clave del groupBy.','Max / p75 = 2.6 / 2.3 ≈ 1.13, por debajo del 1.5 de la guía. No hay skew: todas las tasks sufren por igual.'],
        ['Particiones demasiado grandes para todas: <code>spark.sql.shuffle.partitions = auto</code>, o unas 2500 (310 GB ÷ 128 MB).','Correcto.'],
        ['Subir la memoria del driver.','El spill ocurre en las tasks, que corren en los executors. El driver no procesa esas filas.'],
        ['Activar el skew join de AQE.','Ya está activado por defecto, y además no hay join ni skew.']],
     c:1,
     ex:`<p>El spill aparece en <b>todas</b> las tasks y la distribución es plana. Esa es la firma de particiones demasiado grandes, no de skew. Cada task lee ~1.5 GB, muy por encima de los 128–200 MB por task que sugiere la guía (regla práctica que no encontré en docs.databricks.com). Databricks recomienda <code>spark.sql.shuffle.partitions=auto</code> para shuffle alto. En manual, 310 GB ÷ 128 MB ≈ 2480; redondeado a múltiplo de 32 cores, 2496.</p>`,
     src:`${A(D_SKEW,'Skew and spill')} · ${A(D_IO,'Spark stage high I/O')}`,tab:['remedios','spark-ui']},

    {id:'una-task',sec:3,t:'Un stage con una sola task',
     ctx:'Un cálculo de saldo acumulado tarda 47 minutos. En la vista de cluster, un core trabaja y los otros 63 están ociosos.',
     ev:`<pre><code>w = Window.orderBy("fecha")
df.withColumn("saldo", F.sum("monto").over(w))</code></pre><p>Stage del cálculo: <b>Tasks: 1</b> · Shuffle Read 38 GB · Spill (disk) 60 GB.</p>`,
     q:'¿Qué está pasando?',
     o:[['Skew en la columna fecha: aplicar salting.','No hay ninguna clave por la que repartir. No es que una clave pese mucho; es que todo va a una partición.'],
        ['La ventana no tiene <code>partitionBy</code>: Spark lleva todas las filas a una sola partición para ordenarlas.','Correcto.'],
        ['<code>spark.sql.shuffle.partitions</code> está demasiado bajo.','Da igual el valor: una ventana sin partitionBy siempre termina en una partición.'],
        ['Faltan workers.','Ya hay 63 cores sin hacer nada. Más cores no cambian nada.']],
     c:1,
     ex:`<p>La guía de Databricks dice que un stage con una sola task puede ser señal de problema. Una ventana con <code>orderBy</code> y sin <code>partitionBy</code> es un caso típico: Spark necesita todas las filas en orden global, así que las manda a una única partición (Spark lo avisa en el log del driver con "No Partition Defined for Window operation"; esto es comportamiento de Apache Spark, no lo encontré en docs.databricks.com).</p>
<p>Arreglos: si el negocio lo permite, particiona por una clave (<code>Window.partitionBy("cuenta_id").orderBy("fecha")</code>). Si de verdad necesitas un acumulado global, agrega primero por día (pocas filas) y calcula el acumulado sobre esa tabla pequeña.</p>`,
     src:A(D_LONG,'Look at longest stage'),tab:'stages'},

    {id:'join-explota',sec:3,t:'Un join que multiplica filas',
     ctx:'Un join entre ventas y promociones termina con spill en todos los stages siguientes y una tabla de salida 40 veces más grande de lo esperado.',
     ev:`<p>Pestaña SQL / DataFrame, nodo <code>SortMergeJoin</code>:</p><div class="tblwrap"><table><tbody><tr><td>Entrada ventas</td><td class="num">120 M filas</td></tr><tr><td>Entrada promociones</td><td class="num">2 M filas</td></tr><tr><td>rows output</td><td class="num">4.800 M filas</td></tr></tbody></table></div><pre><code>ventas.join(promociones, "producto_id")</code></pre>`,
     q:'¿Cuál es la causa raíz y la primera acción?',
     o:[['Skew: dejar que AQE lo parta.','Partir el skew no reduce las filas de salida. El problema es cuántas filas produce el join, no cómo se reparten.'],
        ['Hacer broadcast de promociones.','Ahorra el shuffle de ventas, pero el join sigue produciendo 4.800 M filas.'],
        ['Cada producto tiene muchas promociones, así que cada venta se multiplica. Revisar la clave del join (añadir la vigencia de la promoción) o deduplicar.','Correcto.'],
        ['Subir <code>shuffle.partitions</code> y listo.','La guía lo sugiere para mitigar el spill de una explosión por join, pero la salida sigue siendo 40× más grande. Si la clave está mal, además el resultado es incorrecto.']],
     c:2,
     ex:`<p>Pocas filas entran a un nodo y muchas más salen: la doc de Databricks lo llama <i>exploding join</i>. Se ve en <i>rows output</i> del nodo de join. 4.800 M ÷ 120 M = 40 promociones por venta de media: una relación muchos a muchos que casi nunca es lo que se quería.</p>
<pre><code>ventas.join(promociones,
    (ventas.producto_id == promociones.producto_id) &
    ventas.fecha.between(promociones.inicio, promociones.fin))</code></pre>`,
     src:`${A(D_LOWIO,'Slow stage with low I/O · exploding joins')}`,tab:['joins','stages']},

    {id:'small-files',sec:10,t:'Miles de tasks de dos segundos',
     ctx:'Leer la tabla <code>eventos</code> (150 GB) es lento aunque casi no hay shuffle. La tabla se creó con <code>PARTITIONED BY (fecha, tienda_id)</code>.',
     ev:`<p>Nodo de scan: <b>number of files read 48.000</b> · tamaño total 150 GB (≈ 3 MB por archivo). El stage tiene miles de tasks que duran ~2 s cada una.</p>`,
     q:'¿Cuál es el mejor arreglo?',
     o:[['Subir <code>spark.sql.shuffle.partitions</code>.','El problema está en el scan, antes de cualquier shuffle.'],
        ['Subir <code>spark.sql.files.maxPartitionBytes</code> para meter más archivos en cada task.','Reduce el número de tasks, pero hay que seguir abriendo 48.000 archivos pequeños. Alivia el síntoma, no la causa.'],
        ['Quitar el particionado por <code>tienda_id</code>, pasar a liquid clustering y compactar con <code>OPTIMIZE</code>.','Correcto.'],
        ['Activar Photon.','Puede acelerar el scan, pero el número de archivos sigue siendo el problema.']],
     c:2,
     ex:`<p>Según la doc, si el scan lee decenas de miles de archivos hay un problema de small files: los archivos no deberían bajar de 8 MB, y la causa más común es particionar por demasiadas columnas o por una de alta cardinalidad. Aquí se juntan las dos cosas, en una tabla de 150 GB que según la doc ni siquiera debería particionarse (menos de 1 TB).</p>
<pre><code>ALTER TABLE eventos REPLACE PARTITIONED BY WITH CLUSTER BY (fecha, tienda_id);  <span class="c">-- DBR 18.1+</span>
OPTIMIZE eventos;   <span class="c">-- o predictive optimization si es managed de UC</span></code></pre>`,
     src:`${A(D_LOWIO,'Slow stage with low I/O · small files')} · ${A(D_PART,'When to partition')} · ${A(D_LC,'Liquid clustering')}`,tab:['lc','mantenimiento-delta']},

    {id:'broadcast-2g',sec:9,t:'El driver se cae en un broadcast',
     ctx:'Para evitar shuffles, alguien puso <code>spark.sql.autoBroadcastJoinThreshold = 2g</code> en un cluster clásico. Desde entonces el job falla con <code>OutOfMemoryError</code> en el driver durante un <code>BroadcastExchange</code>.',
     ev:`<p>La tabla que se hace broadcast, <code>clientes</code>, ocupa 700 MB en disco (Parquet) y comprime muy bien.</p>`,
     q:'Si 700 MB es menos que 2 GB, ¿por qué falla?',
     o:[['Lo que cuenta es el tamaño en memoria, que puede ser varias veces el de disco, y el broadcast pasa por el driver. Bajar el umbral (o -1) y hacer broadcast explícito solo de tablas pequeñas de verdad.','Correcto.'],
        ['AQE convirtió el join en broadcast por error.','El umbral estático de 2 GB ya permitía el broadcast desde el plan inicial; AQE no es la causa.'],
        ['Faltan executors para recibir la tabla.','El fallo es en el driver, que recoge y reparte la tabla.'],
        ['Hay pocas shuffle partitions.','Un broadcast join no hace shuffle de esa tabla.']],
     c:0,
     ex:`<p>La guía de optimización (2023) da tres reglas que siguen siendo útiles: nunca hacer broadcast de más de 1 GB, porque el broadcast pasa por el driver y puede causar OOM o pausas largas de GC; el tamaño en disco no es el de memoria, porque Parquet comprimido puede crecer mucho al descomprimir; y Spark tiene un límite duro de 8 GB para un broadcast. Con Photon, según la misma guía, el broadcast se hace en los executors.</p>`,
     src:`${A(D_GUIDE,'Guía de optimización · Broadcast hash join')} (eBook de 2023; ${A(D_AQE,'umbral de AQE: 30 MB')})`,tab:['memoria-oom','joins']},

    {id:'aqe-no-ve',sec:6,t:'AQE no ve un skew evidente',
     ctx:'Un INNER JOIN en compute clásico. En el Spark UI se ve skew claramente, pero el plan dice <code>isSkew=false</code>.',
     ev:`${SM([['Duration','8 s','25 s','30 s','35 s','3.5 min'],['Shuffle Read','18 MB','26 MB','30 MB','34 MB','220 MB']])}`,
     q:'¿Por qué AQE no actuó?',
     o:[['AQE está desactivado por defecto.','Está activado por defecto.'],
        ['Los INNER JOIN no se optimizan por skew.','INNER se optimiza en los dos lados.'],
        ['220 MB supera 5× la mediana, pero no llega a 256 MB, y AQE exige las dos condiciones. En compute clásico se puede bajar <code>skewedPartitionThresholdInBytes</code>.','Correcto.'],
        ['El skew join solo funciona con broadcast.','Al revés: un broadcast join nunca se optimiza por skew.']],
     c:2,
     ex:`<p>Condiciones de AQE: tamaño &gt; <code>skewedPartitionFactor</code> (5) × mediana, <b>y</b> tamaño &gt; <code>skewedPartitionThresholdInBytes</code> (256 MB). 220 MB &gt; 150 MB cumple la primera, pero falla la segunda. En serverless no podrías cambiar ese umbral: solo se pueden fijar seis propiedades de Spark, y esta no está entre ellas.</p>`,
     src:`${A(D_AQE,'AQE · skew join')} · ${A(D_SCONF,'Spark properties en serverless')}`,tab:'aqe'},

    {id:'segunda-wave',sec:6,t:'Una segunda wave casi vacía',
     ctx:'16 workers × 8 cores = 128 cores. <code>shuffle.partitions = 130</code>. Las tasks duran todas unos 40 s, sin skew ni spill. El stage tarda 81 s, y el jefe propone añadir workers.',
     ev:`<p>Event Timeline del stage: una primera wave de 128 tasks y una segunda de solo 2.</p>`,
     q:'¿Cuál es el arreglo más barato?',
     o:[['Añadir 4 workers (160 cores) para que todo quepa en una wave.','Funciona, pero pagas un 25% más de cómputo para ganar lo mismo que con un cambio de config.'],
        ['Poner <code>shuffle.partitions = 128</code>: una sola wave con tasks apenas más grandes.','Correcto.'],
        ['Hacer salting.','No hay skew.'],
        ['Bajar a 64 particiones para que sobren cores.','Con 64 tasks la mitad de los cores queda ociosa y cada task dura el doble: el stage sigue en ~80 s.']],
     c:1,
     ex:`<p>130 tasks ÷ 128 cores = 2 waves, y la segunda tiene 2 tasks y 126 cores esperando. Con 128 particiones, cada task procesa un ~1.6% más de datos (≈ 41 s) y el stage baja a ~41 s sin coste extra. La guía recomienda que las shuffle partitions sean múltiplo de los cores totales.</p>`,
     src:A(D_GUIDE,'Guía de optimización · Cluster usage'),tab:'stages'},

    {id:'streaming-particiones',sec:1,t:'El cambio de particiones que no se aplica',
     ctx:'Una agregación con estado en Structured Streaming va lenta. Cambias <code>spark.sql.shuffle.partitions</code> de 200 a 800 y reinicias el stream con el mismo checkpoint.',
     ev:`<p>En cada micro-batch, el stage con estado sigue teniendo <b>200 tasks</b>.</p>`,
     q:'¿Por qué?',
     o:[['AQE unió las 800 particiones en 200.','AQE solo se aplica a queries que no son streaming.'],
        ['En streaming, ese valor queda fijado en el checkpoint y no se puede cambiar entre reinicios con el mismo checkpoint.','Correcto.'],
        ['El cluster tiene 200 cores.','El número de cores no cambia el número de tasks.'],
        ['Hace falta <code>trigger(availableNow=True)</code>.','El trigger decide cuándo se procesa, no cuántas particiones de shuffle hay.']],
     c:1,
     ex:`<p>La doc de AQE dice dos cosas aquí. Primero, AQE solo se aplica a queries que no son streaming. Segundo, en Structured Streaming <code>spark.sql.shuffle.partitions</code> no se puede cambiar entre reinicios desde el mismo checkpoint, porque el estado está repartido en esas 200 particiones. Para cambiarlo hace falta un checkpoint nuevo, lo que implica reconstruir el estado (esto último es razonamiento mío).</p>`,
     src:A(D_AQE,'AQE · Enable auto-optimized shuffle'),tab:'aqe'},

    {id:'skipping-malo',sec:6,t:'Un filtro selectivo que lee toda la tabla',
     ctx:'Un panel consulta la tabla <code>ventas</code> (managed de Unity Catalog, 800 GB, sin particiones ni clustering) filtrando por un cliente. Devuelve una fila y tarda 3 minutos en un SQL warehouse. La tabla se carga cada noche con un <code>INSERT</code> de las ventas del día.',
     ev:`<pre><code>SELECT sum(monto) FROM ventas WHERE cliente_id = 4217</code></pre><p>Fila de <code>system.query.history</code> para esa ejecución, y detalle de la tabla:</p>${KV([['read_files','6.380'],['pruned_files','20'],['read_rows','4.100 M'],['produced_rows','1'],['total_duration_ms','182.000'],['DESCRIBE DETAIL · clusteringColumns','[ ]'],['DESCRIBE DETAIL · partitionColumns','[ ]']])}<p>En el resumen de la query, el icono de filtro del scan indica que casi no se podó nada.</p>`,
     q:'¿Qué haces?',
     o:[['Subir el SQL warehouse a un tamaño mayor.','Más cómputo lee los mismos 6.380 archivos más deprisa, pero los sigue leyendo todos. Pagas más sin tocar la causa.'],
        ['Clusterizar por la columna del filtro: <code>ALTER TABLE ventas CLUSTER BY (cliente_id)</code> y luego <code>OPTIMIZE ventas FULL</code>, o <code>CLUSTER BY AUTO</code> con predictive optimization.','Correcto. Agrupar las filas por cliente estrecha el rango mín/máx de cada archivo, y el filtro puede descartar casi todos.'],
        ['Particionar la tabla por <code>cliente_id</code>.','Con 100.000 clientes saldrían particiones de unos 8 MB. La doc pide no particionar tablas de menos de 1 TB y que cada partición tenga al menos 1 GB.'],
        ['Ejecutar <code>ANALYZE TABLE ventas COMPUTE STATISTICS</code>.','Esas estadísticas sirven al optimizador para elegir el plan. El data skipping usa el mín/máx por archivo que Delta ya guarda al escribir, y aquí ese rango cubre casi todos los clientes en cada archivo.']],
     c:1,
     ex:`<p>Delta guarda, por cada archivo, el mínimo y el máximo de las columnas con estadísticas (por defecto, las primeras 32). Al consultar, descarta los archivos cuyo rango no puede contener el valor. Como los datos llegan por día, cada archivo tiene clientes de todo el rango y casi ninguno se puede descartar: 20 de 6.400 archivos, un 0,3%. El total de archivos es <code>read_files + pruned_files</code>, como define la doc de query history. Es el caso de <i>bad data skipping</i> que pide la sección 6 del examen.</p>
<pre><code>ALTER TABLE ventas CLUSTER BY (cliente_id);
OPTIMIZE ventas FULL;          <span class="c">-- reclusteriza también lo existente (16.4 LTS+ según la página de clustering; la referencia SQL de OPTIMIZE dice 16.0)</span>
<span class="c">-- Alternativa en managed de UC con predictive optimization:</span>
ALTER TABLE ventas CLUSTER BY AUTO;</code></pre>
<p>Después, repite la query y compara <code>pruned_files</code> y <code>read_files</code> en <code>system.query.history</code>. Sin <code>FULL</code>, el <code>ALTER</code> solo cambia la clave para los datos que vengan. Los números del caso son ilustrativos.</p>`,
     src:`${A(D_DS,'Data skipping')} · ${A(D_LC,'Liquid clustering')} · ${A(D_QH,'Query history · scan metrics')} · ${A(D_PART,'When to partition')}`,tab:['query-profile','lc']},

    {id:'dashboard-spill',sec:5,t:'Un dashboard que cada mes va más lento',
     ctx:'Una query de un dashboard corre en un SQL warehouse serverless de tamaño Small. En agosto tardaba unos 20 s; ahora tarda más de 90 s. La tabla de origen crece cada día. Tienes acceso a <code>system.query.history</code>.',
     ev:`<pre><code>SELECT date_trunc('WEEK', start_time)              AS semana,
       COUNT(*)                                     AS ejecuciones,
       percentile(total_duration_ms, 0.5) / 1000    AS p50_s,
       avg(spilled_local_bytes) / 1e9               AS spill_gb,
       avg(read_bytes) / 1e9                        AS leido_gb,
       avg(waiting_at_capacity_duration_ms) / 1000  AS cola_s,
       avg(compilation_duration_ms) / 1000          AS compilacion_s
FROM system.query.history
WHERE query_source.dashboard_id = '&lt;id del dashboard&gt;'
  AND start_time &gt;= current_date() - INTERVAL 70 DAYS
GROUP BY ALL ORDER BY semana</code></pre>${TB(['semana','ejecuciones','p50_s','spill_gb','leido_gb','cola_s','compilacion_s'],[['2026-08-03','140','21','0','38','0,2','0,8'],['2026-08-31','152','34','6,5','52','0,1','0,8'],['2026-09-28','149','96','41','71','0,3','0,9']])}`,
     q:'¿Qué columna explica el problema y qué haces?',
     o:[['<code>waiting_at_capacity_duration_ms</code>: subir el número máximo de clusters del warehouse.','La espera en cola sigue en décimas de segundo. Más clusters dan más concurrencia, pero cada query sigue con la misma memoria.'],
        ['<code>spilled_local_bytes</code> crece con <code>read_bytes</code>: la query ya no cabe en memoria. Subir el tamaño del warehouse (Small a Medium) y leer menos filas o columnas.','Correcto. Es la recomendación del insight <code>DATA_SPILL</code>.'],
        ['<code>compilation_duration_ms</code>: recoger estadísticas con <code>ANALYZE</code>.','La compilación está estable en menos de un segundo. El tiempo extra se va en la ejecución.'],
        ['Mirar la memoria del warehouse en <code>system.compute.node_timeline</code>.','Las tablas de <code>system.compute</code> de clusters y nodos solo tienen compute all-purpose y jobs. No incluyen SQL warehouses ni serverless.']],
     c:1,
     ex:`<p>Los datos leídos casi se duplican y el spill pasa de 0 a 41 GB por ejecución. Cuando una query hace spill, los datos que no caben en memoria se escriben a disco y se vuelven a leer. Para el insight <code>DATA_SPILL</code>, la doc recomienda subir el tamaño del warehouse para tener más memoria, o reducir filas, columnas y columnas grandes (strings, arrays, maps, structs). Para <code>EXCESSIVE_QUEUE_TIME</code> recomienda otra cosa: subir el máximo de clusters. Leer la columna correcta evita pagar por la palanca equivocada.</p>
<p>Antes de subir el tamaño, mira si el dashboard filtra por fecha y si lee columnas que no usa. A veces un filtro sobre la clave de clustering arregla las dos cosas. <code>system.query.history</code> cubre SQL warehouses, notebooks y jobs serverless y pipelines de Lakeflow; por defecto solo la leen los admins. Los números del caso son ilustrativos.</p>`,
     src:`${A(D_QH,'Query history system table')} · ${A(D_PI,'Query performance insights')} · ${A(D_STC,'Compute system tables · limitations')}`,tab:['system-tables','query-profile']},

    {id:'spot-evict',sec:9,t:'Un job que se alarga cuando Azure reclama VMs',
     ctx:'Un job nocturno corre en job compute clásico de Azure con la casilla <b>Spot instances</b> marcada: 1 driver y 10 workers. Suele tardar 25 minutos. Anoche tardó 70 y terminó con <code>SUCCEEDED</code>.',
     ev:`<p>Recreación ilustrativa de lo que ves:</p>${KV([['Executors · executors perdidos durante el run','4'],['Event log del compute','nodos perdidos y nodos nuevos añadidos'],['Stages · stage 14','(retry 1)'],['Failure reason del primer intento','FetchFailedException'],['Stages que se recalcularon','9 y 11 (los que escribieron ese shuffle)']])}`,
     q:'¿Qué explica el retraso y qué cambias?',
     o:[['El driver era spot, Azure lo desalojó y el job tuvo que reiniciar.','Con la casilla Spot instances, la primera instancia, el driver, siempre es on-demand. Y el run terminó bien.'],
        ['Al perder workers se perdieron sus archivos de shuffle. El stage que los leía falló con FetchFailed y Spark recalculó lo perdido. Para este job, workers on-demand si el horario importa, o activar decommissioning si prefieres seguir con spot.','Correcto.'],
        ['Subir los reintentos del job a 3.','El job no falló. Los reintentos del job no evitan el recálculo dentro del run; solo relanzan la tarea si falla.'],
        ['Desactivar AQE para que no replanifique tras perder executors.','AQE no tiene nada que ver. El tiempo extra viene de recalcular el shuffle perdido.']],
     c:1,
     ex:`<p>Según la doc de Azure Databricks, con Spot instances el driver es siempre on-demand y los demás nodos son spot. Si Azure desaloja un worker, Azure Databricks intenta conseguir otra VM spot y, si no puede, la reemplaza por una on-demand. El compute sigue vivo, pero lo que había en los discos de esas VMs se pierde. La doc lista las consecuencias: fallos de shuffle fetch, pérdida de datos de shuffle y de RDD, y fallos de jobs. Que Spark reintente el stage y recalcule las tasks cuyo shuffle se perdió es comportamiento de Apache Spark; no encontré esa descripción en docs.databricks.com.</p>
<p>Opciones según lo que pese más:</p>
<ul><li><b>Horario estricto:</b> workers on-demand para este job. Por API, <code>azure_attributes.first_on_demand</code> fija cuántos nodos, empezando por el driver, van on-demand.</li>
<li><b>Coste:</b> seguir con spot y activar decommissioning. Usa el aviso previo al desalojo (normalmente de 30 s a 2 min según el proveedor; en Azure, hasta 30 s) para migrar shuffle a executors sanos. Es best effort, y con él los fallos de tasks por desalojo no cuentan como intentos fallidos.</li>
<li><b>Desalojos frecuentes:</b> la guía sugiere cambiar a tipos de instancia con menor tasa de desalojo en Azure, o dejar de usar spot.</li></ul>
<pre><code><span class="c"># Spark config del compute (Advanced options → Spark)</span>
spark.decommission.enabled true
spark.storage.decommission.enabled true
spark.storage.decommission.shuffleBlocks.enabled true
<span class="c"># Environment variables</span>
SPARK_WORKER_OPTS="-Dspark.decommission.enabled=true"</code></pre>
<p>Los números del caso son ilustrativos.</p>`,
     src:`${AZ('compute/configure#spot-instances','Compute configuration · Spot instances')} · ${AZ('compute/clusters-manage#decommission-spot-instances','Decommission spot instances')} · ${AZ('optimizations/spark-ui-guide/losing-spot-instances','Losing spot instances')} · ${AZ('admin/clusters/policy-definition#supported-attributes','azure_attributes.first_on_demand')} · <a href="https://learn.microsoft.com/azure/virtual-machines/spot-vms#eviction-policy" target="_blank" rel="noopener">Azure Spot VMs · Eviction policy</a>`,tab:['azure','spark-ui']},

    {id:'driver-topandas',sec:9,t:'El driver muere al pasar a pandas',
     ctx:'En un cluster clásico, un notebook trae un año de eventos a pandas para hacer un resumen. El resultado tiene unos 180 M filas.',
     ev:`<pre><code>pdf = spark.table("eventos").filter("fecha &gt;= '2026-01-01'").toPandas()
resumen = pdf.groupby(["pais", "canal"])["monto"].sum()</code></pre><p>Primer error: <code>Total size of serialized results of 412 tasks (4.0 GiB) is bigger than spark.driver.maxResultSize (4.0 GiB)</code>. Alguien sube <code>spark.driver.maxResultSize</code> a <code>32g</code> y ahora el driver se queda sin memoria y se reinicia.</p>`,
     q:'¿Cuál es el arreglo?',
     o:[['Subir <code>spark.driver.maxResultSize</code> todavía más, a 64g.','El límite existe para proteger al driver. La doc de Spark avisa que un límite alto puede causar out of memory en el driver, que es justo lo que pasó.'],
        ['Añadir workers al cluster.','Todo el resultado termina en el driver. Más workers no le dan memoria.'],
        ['Hacer la agregación en Spark y traer a pandas solo el resultado pequeño. Si necesitas el detalle fuera de Spark, escríbelo a una tabla en lugar de traerlo al driver.','Correcto.'],
        ['Activar Arrow con <code>spark.sql.execution.arrow.pyspark.enabled</code>.','Arrow acelera la conversión, pero la doc dice que, incluso con Arrow, <code>toPandas()</code> lleva todas las filas al driver.']],
     c:2,
     ex:`<p><code>collect()</code> y <code>toPandas()</code> cargan el resultado entero en la memoria del driver, y la doc pide usarlos solo con resultados pequeños. <code>spark.driver.maxResultSize</code> limita el tamaño serializado de lo que una acción trae al driver. El valor por defecto de Apache Spark es 1g; el de tu compute puede ser otro, míralo en la pestaña Environment del Spark UI.</p>
<pre><code>resumen = (spark.table("eventos")
    .filter("fecha &gt;= '2026-01-01'")
    .groupBy("pais", "canal")
    .agg(F.sum("monto").alias("monto")))
pdf = resumen.toPandas()      <span class="c"># unos cientos de filas, no 180 M</span>

<span class="c"># Si otro sistema necesita el detalle, que lo lea de una tabla</span>
(spark.table("eventos").filter("fecha &gt;= '2026-01-01'")
    .write.mode("overwrite").saveAsTable("analitica.eventos_2026"))</code></pre>
<p>Si de verdad necesitas traer mucho al driver, la doc de configuración de compute permite elegir un driver más grande. Es el último recurso. En serverless, <code>spark.driver.maxResultSize</code> no está entre las seis propiedades que se pueden cambiar. Los números del caso son ilustrativos.</p>`,
     src:`${A(D_PANDAS,'Convert between PySpark and pandas')} · ${A('https://docs.databricks.com/aws/en/compute/configure','Compute configuration · Driver type')} · <a href="${S_CONF}" target="_blank" rel="noopener">Spark configuration · spark.driver.maxResultSize</a>`,tab:'memoria-oom'},

    {id:'broadcast-off',sec:6,t:'Sin broadcast, una dimensión pequeña mueve 400 GB',
     ctx:'Después del incidente del broadcast de 2 GB (caso 6), el equipo puso <code>spark.sql.autoBroadcastJoinThreshold = -1</code> en todo el cluster clásico. Un join entre <code>ventas</code> (600 GB) y <code>dim_tienda</code> pasó de 6 a 31 minutos.',
     ev:`<p>Pestaña SQL / DataFrame (recreación ilustrativa):</p>${KV([['Nodo de join','SortMergeJoin Inner (tienda_id)'],['Exchange del lado ventas · shuffle write','410 GiB'],['Exchange del lado dim_tienda · shuffle write','120 MiB'],['Tamaño estimado de dim_tienda en el plan','120 MiB'],['Environment · spark.sql.autoBroadcastJoinThreshold','-1']])}`,
     q:'¿Cuál es el arreglo correcto?',
     o:[['Volver a poner el umbral en 2g.','Vuelves al riesgo de OOM en el driver para todos los joins del cluster, que fue lo que motivó el cambio.'],
        ['Hint de broadcast solo en este join, <code>broadcast(dim_tienda)</code>, y quitar el -1 global.','Correcto. El hint se aplica aunque el umbral no lo permita, y solo afecta a la tabla que sabes que es pequeña.'],
        ['Esperar a que AQE lo convierta en broadcast en runtime.','El umbral de AQE para cambiar a broadcast en runtime es 30 MB, y dim_tienda ocupa 120 MB. Además, según la doc, AQE puede no cambiar a broadcast hasta después de hacer el shuffle de los dos lados.'],
        ['Subir <code>spark.sql.shuffle.partitions</code> a 2000.','Reparte los 410 GiB en más tasks, pero los 410 GiB siguen viajando por la red.']],
     c:1,
     ex:`<p>Con <code>-1</code>, Spark desactiva el broadcast automático. El optimizador ya no puede elegir broadcast hash join y cae en sort merge join: los dos lados se reparten por <code>tienda_id</code>, y eso obliga a mover los 600 GB de ventas para unirlos con una tabla de 120 MB. Con broadcast, ventas no se mueve.</p>
<p>La doc de hints de Databricks dice que el lado con hint <code>BROADCAST</code> se hace broadcast sin importar <code>autoBroadcastJoinThreshold</code>. La FAQ de AQE recomienda seguir usando el hint aunque AQE esté activado, porque un broadcast planificado desde el inicio evita el shuffle.</p>
<pre><code>from pyspark.sql import functions as F
res = ventas.join(F.broadcast(dim_tienda), "tienda_id")

<span class="c">-- En SQL</span>
SELECT /*+ BROADCAST(t) */ v.*, t.region
FROM ventas v JOIN dim_tienda t ON v.tienda_id = t.tienda_id</code></pre>
<p>Para el umbral global, quita el <code>-1</code> y vuelve a un valor moderado, para que las dimensiones de pocos MB vuelvan a hacer broadcast solas. Esa elección del valor es criterio mío; la doc no da una cifra para tu caso. Los números del caso son ilustrativos.</p>`,
     src:`${A(D_HINTS,'Join hints')} · ${A(D_AQE,'AQE · broadcast FAQ')} · <a href="${S_TUNE}" target="_blank" rel="noopener">Spark SQL performance tuning · autoBroadcastJoinThreshold</a>`,tab:['joins','aqe']},

    {id:'po-external',sec:6,t:'Predictive optimization ignora una tabla',
     ctx:'Predictive optimization está activado en el catálogo <code>prod</code>. Las tablas del schema <code>prod.bronze</code> se compactan solas, salvo <code>clicks</code>, que acumula archivos pequeños desde hace meses.',
     ev:`${KV([['DESCRIBE TABLE EXTENDED · Type','EXTERNAL'],['DESCRIBE TABLE EXTENDED · Location','abfss://bronze@stlake.dfs.core.windows.net/clicks'],['DESCRIBE DETAIL · numFiles','182.000'],['DESCRIBE DETAIL · sizeInBytes','240 GB (≈ 1,3 MB por archivo)']])}<pre><code>SELECT table_name, operation_type, COUNT(*) AS ops
FROM system.storage.predictive_optimization_operations_history
WHERE schema_name = 'bronze' AND start_time &gt;= current_date() - INTERVAL 30 DAYS
GROUP BY ALL</code></pre><p>Salen filas de <code>COMPACTION</code> y <code>VACUUM</code> para otras tablas. Ninguna para <code>clicks</code>.</p>`,
     q:'¿Por qué y qué haces?',
     o:[['Predictive optimization tarda en evaluar tablas nuevas; hay que esperar unos días.','La tabla lleva meses así y sus vecinas sí se optimizan. Esperar no cambia nada.'],
        ['Activarlo a nivel de tabla con <code>ALTER TABLE prod.bronze.clicks ENABLE PREDICTIVE OPTIMIZATION</code>.','La doc lista las tablas external entre las que predictive optimization no procesa. El nivel en que lo actives no cambia eso.'],
        ['Predictive optimization solo corre en tablas managed de Unity Catalog. Convertirla con <code>ALTER TABLE ... SET MANAGED</code>, o, si tiene que seguir external, programar tú <code>OPTIMIZE</code> y <code>VACUUM</code>.','Correcto.'],
        ['Hacer <code>OPTIMIZE ... ZORDER BY</code> una vez para que predictive optimization la tome después.','Predictive optimization no ejecuta ZORDER e ignora los archivos ordenados con Z-order. Y la tabla sigue siendo external.']],
     c:2,
     ex:`<p>Predictive optimization ejecuta <code>OPTIMIZE</code>, <code>VACUUM</code> y <code>ANALYZE</code> solo en tablas managed de Unity Catalog. En sus limitaciones, la doc dice que no corre en tablas external ni en tablas recibidas por Delta Sharing (OpenSharing). Por eso <code>clicks</code> no aparece en el system table de operaciones.</p>
<pre><code>ALTER TABLE prod.bronze.clicks SET MANAGED;      <span class="c">-- DBR 17.3 LTS+ o serverless; tienes que ser owner</span>
DESCRIBE EXTENDED prod.bronze.clicks;            <span class="c">-- Type debe decir MANAGED</span></code></pre>
<p>Según la doc de conversión, tras <code>SET MANAGED</code> predictive optimization se activa solo, salvo que lo hubieras apagado a mano. Antes de convertir, cancela los jobs de <code>OPTIMIZE</code> que tocan la tabla y comprueba que los lectores y escritores usan DBR 15.4 LTS o superior, y que los clientes externos pueden leer tablas managed. Los datos de la ubicación external se conservan 14 días por si necesitas volver con <code>UNSET MANAGED</code>. El insight <code>MANUAL_DATA_LAYOUT</code> del query profile recomienda esta misma conversión. Los números del caso son ilustrativos.</p>`,
     src:`${A(D_PO,'Predictive optimization · limitations')} · ${A(D_CONV,'Convert to managed tables')} · ${A(D_POST,'Predictive optimization system table')}`,tab:'mantenimiento-delta'}
  ];
  const TABNAME={aqe:['aqe.html','AQE'],remedios:['remedios.html','Remedios'],stages:['stages.html','Tasks, cores y waves'],lc:['liquid-clustering.html','Liquid clustering'],
    'query-profile':['query-profile.html','Query profile'],'system-tables':['system-tables.html','System tables'],'spark-ui':['spark-ui.html','Spark UI'],joins:['joins.html','Joins'],
    'memoria-oom':['memoria-oom.html','Memoria y OOM'],'mantenimiento-delta':['mantenimiento-delta.html','Mantenimiento Delta'],azure:['azure.html','Azure']};
  const repaso=t=>[].concat(t).filter(x=>TABNAME[x]).map(x=>`<a href="${TABNAME[x][0]}">${TABNAME[x][1]}</a>`).join(', ');
  const KEY='spl-casos-respuestas-v1', FKEY='spl-casos-filtro';
  const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
  let saved={};
  try{const v=JSON.parse(store.get(KEY)||'{}'); if(v&&typeof v==='object') saved=v;}catch(e){saved={};}
  const csAns={};
  const list=document.getElementById('cs-list'), scoreEl=document.getElementById('cs-score');
  function csScore(){const n=Object.keys(csAns).length,ok=Object.values(csAns).filter(Boolean).length;
    if(scoreEl) scoreEl.innerHTML=`<span class="pill ${ok===n?'ok':'bad'}">${ok} / ${n}</span>aciertos de ${n} respondidos · ${CASES.length-n} pendientes`;}
  function render(){
    list.innerHTML=CASES.map((k,i)=>`
    <article class="case" id="cs-${i}" data-sec="${k.sec}">
      <div class="cn">Caso ${i+1} de ${CASES.length}<span class="cs-sec">${SECS[k.sec]}</span></div>
      <h4>${k.t}</h4>
      <p>${k.ctx}</p>
      <div class="ev">${k.ev}</div>
      <p class="q">${k.q}</p>
      <div class="opts">${k.o.map((o,j)=>`<button type="button" data-case="${i}" data-opt="${j}"><b>${'ABCD'[j]}</b><span>${o[0]}</span></button>`).join('')}</div>
      <div class="expl" hidden></div>
    </article>`).join('');
  }
  function answer(i,j){
    const k=CASES[i]; if(!k||i in csAns||!(j>=0&&j<k.o.length)) return;
    csAns[i]=(j===k.c);
    const card=document.getElementById('cs-'+i);
    card.querySelectorAll('button[data-case]').forEach(x=>{const jj=+x.dataset.opt; x.disabled=true;
      x.classList.add(jj===k.c?'right':(jj===j?'wrong':'dim'));
      const w=document.createElement('span'); w.className='why'; w.innerHTML=k.o[jj][1]; x.appendChild(w);});
    const ex=card.querySelector('.expl'); ex.hidden=false;
    ex.innerHTML=`<p><span class="pill ${csAns[i]?'ok':'bad'}">${csAns[i]?'BIEN':'NO'}</span>${csAns[i]?'Elegiste la correcta.':'La correcta es la '+'ABCD'[k.c]+'.'}</p>${k.ex}<p class="tag">Fuente: ${k.src} · Repaso: ${repaso(k.tab)}</p>`;
  }
  function restore(){CASES.forEach((k,i)=>{if(Object.prototype.hasOwnProperty.call(saved,k.id)) answer(i,+saved[k.id]);}); csScore();}
  list.addEventListener('click',e=>{
    const b=e.target.closest('button[data-case]'); if(!b) return;
    const i=+b.dataset.case, j=+b.dataset.opt;
    if(i in csAns) return;
    answer(i,j); saved[CASES[i].id]=j; store.set(KEY,JSON.stringify(saved)); csScore();
  });
  /* filtro por sección */
  const fil=document.getElementById('cs-filter');
  let cur=store.get(FKEY)||'all';
  const secs=[...new Set(CASES.map(k=>k.sec))].sort((a,b)=>a-b);
  if(cur!=='all'&&!secs.includes(+cur)) cur='all';
  function applyFilter(){
    list.querySelectorAll('.case').forEach(c=>{c.hidden=!(cur==='all'||c.dataset.sec===String(cur));});
    if(fil) fil.querySelectorAll('button[data-sec]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sec===String(cur))));
  }
  if(fil){
    fil.innerHTML=`<span class="lab">Sección del examen:</span><button type="button" data-sec="all" aria-pressed="false">Todos (${CASES.length})</button>`+
      secs.map(s=>`<button type="button" data-sec="${s}" aria-pressed="false">${SECS[s]} (${CASES.filter(k=>k.sec===s).length})</button>`).join('');
    fil.addEventListener('click',e=>{const b=e.target.closest('button[data-sec]'); if(!b) return; cur=b.dataset.sec; store.set(FKEY,cur); applyFilter();});
  }
  const rs=document.getElementById('cs-reset');
  if(rs) rs.addEventListener('click',()=>{saved={}; store.del(KEY); Object.keys(csAns).forEach(k=>delete csAns[k]); render(); applyFilter(); csScore();});
  render(); restore(); applyFilter();
  } catch (e) { console.error('7. casos', e); } }

  /* ---------- 0a-3. línea de tiempo del job ---------- */
  if (document.getElementById('jt-chart')) { try {
  const JOBS={
    narrow:[{id:1,n:80,d:4,deps:[]}],
    agg:[{id:1,n:80,d:4,deps:[]},{id:2,n:200,d:1.5,deps:[1]}],
    smj:[{id:1,n:80,d:4,deps:[]},{id:2,n:40,d:4,deps:[]},{id:3,n:200,d:2,deps:[1,2]}],
    bhj:[{id:1,n:8,d:2,deps:[],note:'broadcast'},{id:2,n:80,d:4.5,deps:[1]}],
    aggsort:[{id:1,n:80,d:4,deps:[]},{id:2,n:200,d:1.5,deps:[1]},{id:3,n:200,d:1.2,deps:[2]}]
  };
  let jtKey='narrow', jtView='concept'; const jtC=document.getElementById('jt-c');
  function simJob(stages,C){
    const st=stages.map(s=>Object.assign({},s,{left:s.n,ready:!s.deps.length,start:null,end:null}));
    const queue=[]; st.forEach(s=>{if(s.ready) for(let i=0;i<s.n;i++) queue.push(s);});
    const busy=Array(C).fill(false), tasks=[]; let running=[], t=0, guard=0;
    while((queue.length||running.length)&&guard++<100000){
      for(let c=0;c<C&&queue.length;c++){ if(!busy[c]){const s=queue.shift(); busy[c]=true; if(s.start===null)s.start=t; const k={c,s:t,e:t+s.d,st:s}; running.push(k); tasks.push(k);} }
      if(!running.length) break;
      t=Math.min(...running.map(k=>k.e));
      const fin=running.filter(k=>k.e<=t+1e-9); running=running.filter(k=>k.e>t+1e-9);
      fin.forEach(k=>{busy[k.c]=false; k.st.left--; if(k.st.left===0) k.st.end=t;});
      st.forEach(s=>{ if(!s.ready && s.deps.every(id=>st.find(x=>x.id===id).end!==null)){ s.ready=true; for(let i=0;i<s.n;i++) queue.push(s);} });
    }
    return {st,tasks,end:t};
  }
  function drawJt(){
    const C=+jtC.value; document.getElementById('jt-c-o').textContent=C;
    const r=simJob(JOBS[jtKey],C), svg=document.getElementById('jt-chart'); svg.textContent='';
    const L=36,R=354,T=16,B=22,H=190, rh=(H-T-B)/C, xmax=tickMax(r.end*1.02), xs=v=>L+(R-L)*v/xmax;
    for(let i=0;i<=4;i++){const v=xmax*i/4,x=xs(v); svg.appendChild(el('line',{x1:x,x2:x,y1:T,y2:H-B,class:'ax',opacity:i?0.35:1})); svg.appendChild(el('text',{x,y:H-B+12,'text-anchor':'middle',class:'tick'},Math.round(v)+'s'));}
    svg.appendChild(el('text',{x:L-4,y:T+6,'text-anchor':'end',class:'tick'},'1'));
    svg.appendChild(el('text',{x:L-4,y:H-B-1,'text-anchor':'end',class:'tick'},C));
    const cls=['p0','p3','p1','p2'];
    r.tasks.forEach(k=>{const x=xs(k.s),w=Math.max(xs(k.e)-x-0.5,0.5); svg.appendChild(el('rect',{x,y:T+k.c*rh+Math.min(.4,rh*.15),width:w,height:Math.max(rh-Math.min(.8,rh*.3),.6),class:cls[(k.st.id-1)%4]}));});
    r.st.forEach(s=>{ if(s.start>0){const x=xs(s.start); svg.appendChild(el('line',{x1:x,x2:x,y1:T-4,y2:H-B,class:'ln thr'})); svg.appendChild(el('text',{x:x+2,y:T-6,class:'lbl thr'},'Stage '+s.id));} });
    document.getElementById('jt-legend').innerHTML=r.st.map(s=>`<span style="--sw:var(--${cls[(s.id-1)%4]})">Stage ${s.id} · ${s.n} tasks${s.note?' (broadcast)':''}</span>`).join('');
    const v=[`<div><b>Duración total ≈ ${r.end.toFixed(1)} s</b> con ${C} cores.</div>`];
    r.st.forEach(s=>{
      if(s.deps.length){ v.push(`<div>Stage ${s.id} empieza en ${s.start.toFixed(1)} s, justo cuando ${s.deps.length>1?'terminan los Stages '+s.deps.join(' y '):'termina el Stage '+s.deps[0]}: necesita su ${s.deps.length>1?'salida':'salida'} completa.</div>`); }
    });
    const par=r.st.filter(s=>!s.deps.length); if(par.length>1) v.push(`<div>Los Stages ${par.map(s=>s.id).join(' y ')} no dependen entre sí: el Stage ${par[1].id} arranca en cuanto quedan cores libres (en ${par[1].start.toFixed(1)} s), sin esperar a que el ${par[0].id} termine. Con el scheduler por defecto (FIFO), las tasks se lanzan en el orden en que quedaron listas.</div>`);
    document.getElementById('jt-verdict').innerHTML=v.join('');
    if(jtView==='ui') drawJtUI(r,C);
  }
  function drawJtUI(r,C){
    const E=C/8, L=70, R=512, xmax=tickMax(r.end*1.04), xs=v=>L+(R-L)*v/xmax;
    const rows=[]; const st=r.st.map(s=>{let row=0; while(rows[row]!==undefined && rows[row]>s.start-1e-9) row++; rows[row]=s.end; return Object.assign({row},s);});
    const nRows=Math.max(1,rows.length), exH=46, stH=8+nRows*24, H=exH+stH+26;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox',`0 0 520 ${H}`); svg.style.minWidth='520px';
    svg.appendChild(el('rect',{x:0,y:0,width:R,height:exH,style:'fill:#FAFAFA'}));
    svg.appendChild(el('line',{x1:0,x2:R,y1:exH,y2:exH,style:'stroke:#DDD'}));
    svg.appendChild(el('text',{x:4,y:16,style:'fill:#333;font-size:10px;font-weight:600'},'Executors'));
    svg.appendChild(el('text',{x:4,y:exH+18,style:'fill:#333;font-size:10px;font-weight:600'},'Stages'));
    UI.axis(svg,L,R,0,H-26,xmax,xs);
    const evs=['Executor driver added'].concat([...Array(Math.min(E,2)).keys()].map(i=>`Executor ${i} added`)).concat(E>2?[`… ${E-2} más`]:[]);
    evs.forEach((t,i)=>{ const x=xs(0)+4+i*108, y=6+(i%2)*16; svg.appendChild(el('rect',{x,y,width:104,height:14,rx:2,style:'fill:#A0DFFF;stroke:#3EC0FF'})); svg.appendChild(el('text',{x:x+4,y:y+10,style:'fill:#222;font-size:9px'},t)); svg.appendChild(el('line',{x1:x+2,x2:x+2,y1:y+14,y2:exH-2,style:'stroke:#3EC0FF'})); });
    st.forEach(s=>{ const x=xs(s.start), w=Math.max(xs(s.end)-x,3), y=exH+8+s.row*24;
      svg.appendChild(el('rect',{x,y,width:w,height:18,rx:4,style:'fill:#A0DFFF;stroke:#3EC0FF'}));
      const lbl=`Stage ${s.id}: ${s.n} tasks${s.note?' (broadcast)':''}`; const inside=w>lbl.length*5.2+8;
      svg.appendChild(el('text',{x:inside?x+5:x+w+4,y:y+12.5,style:'fill:#222;font-size:9.5px'},lbl)); });
    const box=document.getElementById('jt-ui');
    box.innerHTML=UI.frame('Jobs',`<h5>Details for Job 3</h5><div class="ui-link">Event Timeline</div><div style="font-size:12px;margin:.2rem 0">☐ Enable zooming</div>${UI.legend([['Executor added','#A0DFFF','#3EC0FF'],['Executor removed','#FFA1B0','#FF4D6D'],['Stage completed','#A0DFFF','#3EC0FF'],['Stage failed','#FFA1B0','#FF4D6D'],['Stage active','#A2FCC0','#36F572']])}<div id="jt-ui-svg"></div>`,
      'Recreación del Event Timeline de la página del job: un carril con los executors añadidos o retirados y otro con una barra por stage, de su inicio a su fin. La UI no muestra cores; para ver tasks hay que entrar en el stage.');
    box.querySelector('#jt-ui-svg').appendChild(svg);
  }
  viewToggle('jt-view',v=>{ jtView=v; document.getElementById('jt-concept').hidden=(v==='ui'); document.getElementById('jt-ui').hidden=(v!=='ui'); drawJt(); });
  jtC.addEventListener('input',drawJt);
  document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{jtKey=b.dataset.q; drawJt();}));
  drawJt();
  } catch (e) { console.error('0a-3. línea de tiempo del job', e); } }

  /* ---------- 0a-4. scheduler en vivo ---------- */
  if (document.getElementById('sc-chart')) { try {
  const scN=document.getElementById('sc-n'), scC=document.getElementById('sc-c'), scV=document.getElementById('sc-var'), scT=document.getElementById('sc-t'), scPlay=document.getElementById('sc-play');
  const BASE=4; let sim=null, t=0, playing=false, speed=1, last=0;
  const rnd=i=>((Math.sin((i+1)*78.233)*43758.5453)%1+1)%1;
  function build(){
    const n=+scN.value, c=+scC.value, vary=scV.checked;
    document.getElementById('sc-n-o').textContent=n; document.getElementById('sc-c-o').textContent=c;
    const free=Array(c).fill(0), tasks=[];
    for(let i=0;i<n;i++){
      let core=0; for(let j=1;j<c;j++) if(free[j]<free[core]-1e-9) core=j;
      const d=vary?BASE*(0.5+1.5*rnd(i)):BASE; const s=free[core]; free[core]=s+d;
      tasks.push({i,core,s,e:s+d});
    }
    sim={n,c,tasks,end:Math.max(...free),free};
  }
  const fmt=s=>s.toFixed(1)+' s';
  function draw(){
    if(!sim) return;
    const {n,c,tasks,end}=sim, svg=document.getElementById('sc-chart'); svg.textContent='';
    const L=34,R=354,T=6,B=22,H=200, rh=(H-T-B)/c, xmax=tickMax(end*1.01), xs=v=>L+(R-L)*v/xmax;
    for(let i=0;i<=4;i++){const v=xmax*i/4,x=xs(v); svg.appendChild(el('line',{x1:x,x2:x,y1:T,y2:H-B,class:'ax',opacity:i?0.3:1})); svg.appendChild(el('text',{x,y:H-B+12,'text-anchor':'middle',class:'tick'},Math.round(v)+'s'));}
    svg.appendChild(el('text',{x:L-4,y:T+6,'text-anchor':'end',class:'tick'},'1'));
    svg.appendChild(el('text',{x:L-4,y:H-B-1,'text-anchor':'end',class:'tick'},c));
    const pad=Math.min(.6,rh*.15), hh=Math.max(rh-2*pad,.8);
    // ocioso: tras su última task y hasta t (si la cola está vacía)
    const lastEnd=Array(c).fill(0); tasks.forEach(k=>{if(k.e>lastEnd[k.core]) lastEnd[k.core]=k.e;});
    for(let r=0;r<c;r++){ if(t>lastEnd[r]){ svg.appendChild(el('rect',{x:xs(lastEnd[r]),y:T+r*rh+pad,width:Math.max(xs(Math.min(t,end))-xs(lastEnd[r]),0),height:hh,style:'fill:color-mix(in srgb,var(--muted) 30%,transparent)'})); } }
    let pend=0,run=0,done=0;
    tasks.forEach(k=>{
      if(k.s>t+1e-9){pend++;return;}
      const fin=k.e<=t+1e-9; if(fin)done++; else run++;
      const x=xs(k.s), w=Math.max(xs(Math.min(k.e,t))-x-0.6,0.4);
      svg.appendChild(el('rect',{x,y:T+k.core*rh+pad,width:w,height:hh,rx:Math.min(1.5,hh/3),class:fin?'bar':'bar hot'}));
      if(!fin){ svg.appendChild(el('rect',{x:x+w,y:T+k.core*rh+pad,width:Math.max(xs(k.e)-xs(t)-0.6,0),height:hh,style:'fill:none;stroke:var(--hot);stroke-width:.6;stroke-dasharray:2 1.5;opacity:.7'})); }
    });
    const xc=xs(Math.min(t,end)); svg.appendChild(el('line',{x1:xc,x2:xc,y1:T,y2:H-B,style:'stroke:var(--ink);stroke-width:1.2'}));
    const idle=c-run;
    document.getElementById('sc-stats').innerHTML=
      `<div><b>${pend}</b><span>en cola</span></div><div><b>${run}</b><span>corriendo</span></div><div><b>${done}</b><span>terminadas</span></div><div class="${pend===0&&run>0&&idle>0?'warn':''}"><b>${t>=end?0:idle}</b><span>cores sin trabajo</span></div>`;
    document.getElementById('sc-t-o').textContent=fmt(Math.min(t,end))+' de '+fmt(end);
    scT.value=Math.round(Math.min(t/end,1)*1000);
    const busy=tasks.reduce((a,k)=>a+(k.e-k.s),0), util=busy/(c*end);
    let msg;
    if(t<=1e-9) msg=`Las primeras ${Math.min(n,c)} tasks arrancan a la vez, una por core.${n>c?` Las otras ${n-c} esperan en la cola.`:` Sobran ${c-n} cores: nunca tendrán trabajo.`}`;
    else if(t>=end-1e-9) msg=`<b>Stage terminado en ${fmt(end)}.</b> Los cores estuvieron ocupados el ${Math.round(util*100)}% del tiempo. ${util<0.9?'El resto se perdió esperando a las últimas tasks.':'Casi no hubo tiempo perdido.'}`;
    else if(pend>0) msg=`Cada vez que un core termina, toma la siguiente task de la cola. Quedan ${pend} por empezar.`;
    else msg=`La cola está vacía: ${idle} cores ya no tienen nada que hacer mientras terminan las últimas ${run} tasks.`;
    document.getElementById('sc-info').innerHTML=msg;
  }
  function setPlaying(p){ playing=p; scPlay.setAttribute('aria-pressed',p); scPlay.textContent=p?'Pausar':(t>=sim.end?'Repetir':'Reproducir'); if(p){last=performance.now(); requestAnimationFrame(tick);} }
  function tick(now){
    if(!playing) return;
    const dt=(now-last)/1000; last=now;
    t=Math.min(t+dt*speed*sim.end/9, sim.end); draw();
    if(t>=sim.end){ setPlaying(false); return; }
    requestAnimationFrame(tick);
  }
  scPlay.addEventListener('click',()=>{ if(!playing && t>=sim.end) t=0; setPlaying(!playing); draw(); });
  document.getElementById('sc-reset').addEventListener('click',()=>{ t=0; setPlaying(false); draw(); });
  document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{ speed=+b.dataset.speed; document.querySelectorAll('[data-speed]').forEach(x=>x.setAttribute('aria-pressed',x===b)); }));
  scT.addEventListener('input',()=>{ setPlaying(false); t=sim.end*(+scT.value)/1000; draw(); });
  [scN,scC].forEach(x=>x.addEventListener('input',()=>{ build(); t=Math.min(t,sim.end); setPlaying(false); draw(); }));
  scV.addEventListener('change',()=>{ build(); t=0; setPlaying(false); draw(); });
  build(); draw();
  } catch (e) { console.error('0a-4. scheduler en vivo', e); } }

  /* ---------- 0a-5. workers: tiempo y coste ---------- */
  if (document.getElementById('wk-time')) { try {
  const wkN=document.getElementById('wk-n'), wkW=document.getElementById('wk-w');
  const CPW=8, TD=10, WMAX=40, L=44, R=352, T=10, B=24, H=140;
  const waves=(n,w)=>Math.ceil(n/(CPW*w)), time=(n,w)=>waves(n,w)*TD, cost=(n,w)=>w*time(n,w)/60;
  const xs=w=>L+(R-L)*(w-1)/(WMAX-1);
  function chart(svg,fn,unit,n,w){
    svg.textContent='';
    const vals=[]; for(let i=1;i<=WMAX;i++) vals.push(fn(n,i));
    const ymax=niceMax(Math.max(...vals)*1.05), ys=v=>H-B-(H-B-T)*v/ymax;
    for(let i=0;i<=4;i++){const v=ymax*i/4,y=ys(v); svg.appendChild(el('line',{x1:L,x2:R,y1:y,y2:y,class:'ax',opacity:i?0.3:1})); svg.appendChild(el('text',{x:L-4,y:y+3,'text-anchor':'end',class:'tick'},(v%1?v.toFixed(1):Math.round(v))+unit));}
    [1,10,20,30,40].forEach(i=>svg.appendChild(el('text',{x:xs(i),y:H-B+12,'text-anchor':'middle',class:'tick'},i)));
    svg.appendChild(el('text',{x:R,y:H-3,'text-anchor':'end',class:'tick'},'workers →'));
    let d=''; vals.forEach((v,i)=>{const x=xs(i+1),y=ys(v); d+=(i?`H${x.toFixed(1)}V${y.toFixed(1)}`:`M${x.toFixed(1)},${y.toFixed(1)}`);});
    svg.appendChild(el('path',{d,style:'fill:none;stroke:var(--cool);stroke-width:1.6'}));
    vals.forEach((v,i)=>{ const ww=i+1, full=(n%(CPW*ww)===0)||n/(CPW*ww)>=1&&(n/(waves(n,ww)*CPW*ww))>=0.97; if(full) svg.appendChild(el('circle',{cx:xs(ww),cy:ys(v),r:2.2,style:'fill:var(--ok)'})); });
    const xw=xs(w); svg.appendChild(el('line',{x1:xw,x2:xw,y1:T,y2:H-B,style:'stroke:var(--hot);stroke-width:1;stroke-dasharray:3 2'}));
    svg.appendChild(el('circle',{cx:xw,cy:ys(fn(n,w)),r:4,style:'fill:var(--hot);stroke:var(--surface);stroke-width:1.5'}));
    svg.appendChild(el('text',{x:Math.min(Math.max(xw,L+30),R-30),y:T+8,'text-anchor':'middle',class:'lbl',style:'fill:var(--ink)'},(fn(n,w)%1?fn(n,w).toFixed(1):fn(n,w))+unit));
  }
  function drawWk(){
    const n=+wkN.value, w=+wkW.value;
    document.getElementById('wk-n-o').textContent=n; document.getElementById('wk-w-o').textContent=w+' · '+w*CPW+' cores';
    chart(document.getElementById('wk-time'),time,' s',n,w);
    chart(document.getElementById('wk-cost'),cost,'',n,w);
    const wv=waves(n,w), util=n/(wv*CPW*w), minW=Math.ceil(n/CPW);
    let nextW=null; for(let i=w+1;i<=WMAX;i++){ if(time(n,i)<time(n,w)){nextW=i;break;} }
    let cheapest=w; for(let i=1;i<=WMAX;i++){ if(time(n,i)===time(n,w) && i<cheapest) cheapest=i; }
    const v=[`<div><b>${w} workers</b> → ${wv} wave${wv>1?'s':''} · ${time(n,w)} s · coste ${cost(n,w).toFixed(1)} · cores ocupados el ${Math.round(util*100)}% del tiempo</div>`];
    if(cheapest<w) v.push(`<div><span class="pill bad">PAGAS DE MÁS</span>Con ${cheapest} workers tardarías lo mismo (${time(n,w)} s) y costaría un ${Math.round((1-cheapest/w)*100)}% menos.</div>`);
    if(nextW) v.push(`<div>Para bajar de ${time(n,w)} s tendrías que pasar a <b>${nextW} workers</b>: ${time(n,nextW)} s, con un coste ${cost(n,nextW)>cost(n,w)?'un '+Math.round((cost(n,nextW)/cost(n,w)-1)*100)+'% mayor':'igual o menor'}.</div>`);
    else if(w>=minW) v.push(`<div><span class="pill ok">1 WAVE</span>Ya cabe todo en una wave. A partir de ${minW} workers, añadir más no acelera nada.</div>`);
    if(w>minW) v.push(`<div><span class="pill bad">CORES SOBRANTES</span>${w*CPW-n} cores no tienen ninguna task.</div>`);
    document.getElementById('wk-verdict').innerHTML=v.join('');
  }
  function pick(e){ const svg=e.currentTarget, rect=svg.getBoundingClientRect(); const x=(e.clientX-rect.left)/rect.width*360; const w=Math.max(1,Math.min(WMAX,Math.round(1+(x-L)/(R-L)*(WMAX-1)))); if(+wkW.value!==w){wkW.value=w; drawWk();} }
  ['wk-time','wk-cost'].forEach(id=>{ const s=document.getElementById(id); s.addEventListener('pointermove',pick); s.addEventListener('pointerdown',pick); });
  [wkN,wkW].forEach(x=>x.addEventListener('input',drawWk));
  drawWk();
  } catch (e) { console.error('0a-5. workers', e); } }
})();
