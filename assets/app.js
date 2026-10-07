(function(){
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,attrs,txt)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;};
  const q=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);const i=(s.length-1)*p;const lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo);};
  const fmtT=s=>s>=60?Math.floor(s/60)+' min '+String(Math.round(s%60)).padStart(2,'0')+' s':s.toFixed(1)+' s';
  function tickMax(v){for(const c of [1,2,4,5,8,10,15,20,25,50,100]){if(4*c>=v)return 4*c;}return niceMax(v);}
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
    const t1=document.getElementById('s1-table');
    const cells=(arr,f,isDur)=>{const o={min:Math.min(...arr),p25:q(arr,.25),med:q(arr,.5),p75:q(arr,.75),max:Math.max(...arr)};return ['min','p25','med','p75','max'].map(k=>`<td class="num${k==='max'&&isDur&&o.max>1.5*o.p75?' maxcell':''}">${f(o[k])}</td>`).join('');};
    t1.innerHTML=`<thead><tr><th>Métrica</th><th class="num">Min</th><th class="num">25th</th><th class="num">Median</th><th class="num">75th</th><th class="num">Max</th></tr></thead>
    <tbody><tr><td>Duration</td>${cells(dur,fmtT,true)}</tr>
    <tr><td>Shuffle read (M filas)</td>${cells(rows,v=>v.toFixed(1))}</tr>
    <tr><td>Spill (disk)</td>${cells(spills,v=>v>0?v.toFixed(1)+' GB':'0')}</tr></tbody>`;
    const totalSpill=spills.reduce((a,b)=>a+b,0), ratio=st.max/st.p75;
    const totalRows=TOTAL;
    document.getElementById('s1-verdict').innerHTML=
      `<div>${totalSpill>0?'<span class="pill bad">SPILL</span>'+totalSpill.toFixed(1)+' GB a disco, solo en la tarea '+(HOT+1)+'.':'<span class="pill ok">SIN SPILL</span>Todas las tareas caben en memoria.'}</div>
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
    if(skew){ // dibuja cortes de sub-tareas
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
       <div><b>${skew?'AQE la parte en ≈ '+Math.ceil(hot/target)+' sub-tareas (estimación).':'AQE no la marca como skewed: no cumple las dos condiciones.'}</b></div>`;
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
       <div class="c">≈ ${per.toFixed(0)} MB por tarea · ${waves} olas de ${co} tareas · sin ajuste, la regla de respaldo es 2–3× los cores (${2*co}–${3*co})</div>`;
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
      `<div>Tarea más cargada: <b>${mx.toFixed(1)} M filas</b> (sin salting: ${(HOTROWS+NORM).toFixed(1)} M)</div>
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
  function drawDag(k){
    const q=Q[k]; document.getElementById('dag-code').textContent=q.code;
    let h='';
    q.jobs.forEach(j=>{h+=`<div class="job">${j.label}</div>`;
      j.stages.forEach(s=>{
        if(s.sep){h+=`<div class="sep" aria-hidden="true">${s.sep}<br>→</div>`;return;}
        h+=`<div class="stg"><h4>${s.n}<span>${s.tasks.split(' ')[0]} tasks</span></h4>${s.ops.map(o=>`<div class="op${/Exchange · (write|read|hash|range)/.test(o)?' ex':''}${/Broadcast/.test(o)?' bc':''}">${o}</div>`).join('')}<div class="tk">${s.tasks}</div></div>`;});});
    document.getElementById('dag-out').innerHTML=h;
    document.getElementById('dag-info').innerHTML=q.info;
  }
  document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-q]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawDag(b.dataset.q);}));
  drawDag('narrow');

  } catch (e) { console.error('0a-1. del código a los stages', e); } }

  /* ---------- 0a-2. waves ---------- */
  if (document.getElementById('wv-n')) { try {
  const wvN=document.getElementById('wv-n'), wvC=document.getElementById('wv-c');
  let wvSkew='none';
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
  const A=(href,txt)=>`<a href="${href}" target="_blank" rel="noopener">${txt}</a>`;
  const D_AQE='https://docs.databricks.com/aws/en/optimizations/aqe', D_SKEW='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/long-spark-stage-page',
        D_LONG='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/long-spark-stage', D_LOWIO='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/slow-spark-stage-low-io',
        D_IO='https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/long-spark-stage-io', D_GUIDE='https://www.databricks.com/discover/pages/optimize-data-workloads-guide',
        D_PART='https://docs.databricks.com/aws/en/tables/partitions', D_LC='https://docs.databricks.com/aws/en/delta/clustering', D_SCONF='https://docs.databricks.com/aws/en/spark/conf';
  const CASES=[
    {t:'Un LEFT JOIN que no termina',
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
     src:A(D_AQE,'AQE · Why didn\'t AQE detect my data skew?'),tab:'aqe'},

    {t:'Spill en todas las tasks',
     ctx:'Una agregación grande sobre un cluster clásico de 32 cores. Hay spill a disco y alguien propone hacer salting.',
     ev:`<p>Stage de la agregación: 200 tasks · Shuffle Read total 310 GB.</p>${SM([['Duration','1.9 min','2.1 min','2.2 min','2.3 min','2.6 min'],['Shuffle Read','1.4 GB','1.5 GB','1.5 GB','1.6 GB','1.7 GB'],['Spill (disk)','1.9 GB','2.0 GB','2.1 GB','2.2 GB','2.4 GB']])}`,
     q:'¿Cuál es la causa y qué haces?',
     o:[['Skew: aplicar salting a la clave del groupBy.','Max / p75 = 2.6 / 2.3 ≈ 1.13, por debajo del 1.5 de la guía. No hay skew: todas las tasks sufren por igual.'],
        ['Particiones demasiado grandes para todas: <code>spark.sql.shuffle.partitions = auto</code>, o unas 2500 (310 GB ÷ 128 MB).','Correcto.'],
        ['Subir la memoria del driver.','El spill ocurre en las tasks, que corren en los executors. El driver no procesa esas filas.'],
        ['Activar el skew join de AQE.','Ya está activado por defecto, y además no hay join ni skew.']],
     c:1,
     ex:`<p>El spill aparece en <b>todas</b> las tasks y la distribución es plana. Esa es la firma de particiones demasiado grandes, no de skew. Cada task lee ~1.5 GB, muy por encima de los 128–200 MB por task que sugiere la guía (regla práctica que no encontré en docs.databricks.com). Databricks recomienda <code>spark.sql.shuffle.partitions=auto</code> para shuffle alto. En manual, 310 GB ÷ 128 MB ≈ 2480; redondeado a múltiplo de 32 cores, 2496.</p>`,
     src:`${A(D_SKEW,'Skew and spill')} · ${A(D_IO,'Spark stage high I/O')}`,tab:'remedios'},

    {t:'Un stage con una sola task',
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

    {t:'Un join que multiplica filas',
     ctx:'Un join entre ventas y promociones termina con spill en todos los stages siguientes y una tabla de salida 40 veces más grande de lo esperado.',
     ev:`<p>Pestaña SQL, nodo <code>SortMergeJoin</code>:</p><div class="tblwrap"><table><tbody><tr><td>Entrada ventas</td><td class="num">120 M filas</td></tr><tr><td>Entrada promociones</td><td class="num">2 M filas</td></tr><tr><td>rows output</td><td class="num">4.800 M filas</td></tr></tbody></table></div><pre><code>ventas.join(promociones, "producto_id")</code></pre>`,
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
     src:`${A(D_LOWIO,'Slow stage with low I/O · exploding joins')}`,tab:'stages'},

    {t:'Miles de tasks de dos segundos',
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
     src:`${A(D_LOWIO,'Slow stage with low I/O · small files')} · ${A(D_PART,'When to partition')} · ${A(D_LC,'Liquid clustering')}`,tab:'lc'},

    {t:'El driver se cae en un broadcast',
     ctx:'Para evitar shuffles, alguien puso <code>spark.sql.autoBroadcastJoinThreshold = 2g</code> en un cluster clásico. Desde entonces el job falla con <code>OutOfMemoryError</code> en el driver durante un <code>BroadcastExchange</code>.',
     ev:`<p>La tabla que se hace broadcast, <code>clientes</code>, ocupa 700 MB en disco (Parquet) y comprime muy bien.</p>`,
     q:'Si 700 MB es menos que 2 GB, ¿por qué falla?',
     o:[['Lo que cuenta es el tamaño en memoria, que puede ser varias veces el de disco, y el broadcast pasa por el driver. Bajar el umbral (o -1) y hacer broadcast explícito solo de tablas pequeñas de verdad.','Correcto.'],
        ['AQE convirtió el join en broadcast por error.','El umbral estático de 2 GB ya permitía el broadcast desde el plan inicial; AQE no es la causa.'],
        ['Faltan executors para recibir la tabla.','El fallo es en el driver, que recoge y reparte la tabla.'],
        ['Hay pocas shuffle partitions.','Un broadcast join no hace shuffle de esa tabla.']],
     c:0,
     ex:`<p>La guía de optimización (2023) da tres reglas que siguen siendo útiles: nunca hacer broadcast de más de 1 GB, porque el broadcast pasa por el driver y puede causar OOM o pausas largas de GC; el tamaño en disco no es el de memoria, porque Parquet comprimido puede crecer mucho al descomprimir; y Spark tiene un límite duro de 8 GB para un broadcast. Con Photon, según la misma guía, el broadcast se hace en los executors.</p>`,
     src:`${A(D_GUIDE,'Guía de optimización · Broadcast hash join')} (eBook de 2023; ${A(D_AQE,'umbral de AQE: 30 MB')})`,tab:'aqe'},

    {t:'AQE no ve un skew evidente',
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

    {t:'Una segunda wave casi vacía',
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

    {t:'El cambio de particiones que no se aplica',
     ctx:'Una agregación con estado en Structured Streaming va lenta. Cambias <code>spark.sql.shuffle.partitions</code> de 200 a 800 y reinicias el stream con el mismo checkpoint.',
     ev:`<p>En cada micro-batch, el stage con estado sigue teniendo <b>200 tasks</b>.</p>`,
     q:'¿Por qué?',
     o:[['AQE unió las 800 particiones en 200.','AQE solo se aplica a queries que no son streaming.'],
        ['En streaming, ese valor queda fijado en el checkpoint y no se puede cambiar entre reinicios con el mismo checkpoint.','Correcto.'],
        ['El cluster tiene 200 cores.','El número de cores no cambia el número de tasks.'],
        ['Hace falta <code>trigger(availableNow=True)</code>.','El trigger decide cuándo se procesa, no cuántas particiones de shuffle hay.']],
     c:1,
     ex:`<p>La doc de AQE dice dos cosas aquí. Primero, AQE solo se aplica a queries que no son streaming. Segundo, en Structured Streaming <code>spark.sql.shuffle.partitions</code> no se puede cambiar entre reinicios desde el mismo checkpoint, porque el estado está repartido en esas 200 particiones. Para cambiarlo hace falta un checkpoint nuevo, lo que implica reconstruir el estado (esto último es razonamiento mío).</p>`,
     src:A(D_AQE,'AQE · Enable auto-optimized shuffle'),tab:'aqe'}
  ];
  const csAns={};
  function csScore(){const n=Object.keys(csAns).length,ok=Object.values(csAns).filter(Boolean).length;
    document.getElementById('cs-score').innerHTML=`<span class="pill ${ok===n?'ok':'bad'}">${ok} / ${n}</span>aciertos de ${n} respondidos · ${CASES.length-n} pendientes`;}
  const TABNAME={aqe:'<a href="aqe.html">AQE</a>',remedios:'<a href="remedios.html">Remedios</a>',stages:'<a href="stages.html">Stages y waves</a>',lc:'<a href="liquid-clustering.html">Liquid clustering</a>'};
  document.getElementById('cs-list').innerHTML=CASES.map((k,i)=>`
    <article class="case" id="cs-${i}">
      <div class="cn">Caso ${i+1} de ${CASES.length}</div>
      <h4>${k.t}</h4>
      <p>${k.ctx}</p>
      <div class="ev">${k.ev}</div>
      <p class="q">${k.q}</p>
      <div class="opts">${k.o.map((o,j)=>`<button type="button" data-case="${i}" data-opt="${j}"><b>${'ABCD'[j]}</b><span>${o[0]}</span></button>`).join('')}</div>
      <div class="expl" hidden></div>
    </article>`).join('');
  document.getElementById('cs-list').addEventListener('click',e=>{
    const b=e.target.closest('button[data-case]'); if(!b) return;
    const i=+b.dataset.case, j=+b.dataset.opt, k=CASES[i];
    if(i in csAns) return;
    csAns[i]=(j===k.c);
    const card=document.getElementById('cs-'+i);
    card.querySelectorAll('button[data-case]').forEach(x=>{const jj=+x.dataset.opt; x.disabled=true;
      x.classList.add(jj===k.c?'right':(jj===j?'wrong':'dim'));
      const w=document.createElement('span'); w.className='why'; w.innerHTML=k.o[jj][1]; x.appendChild(w);});
    const ex=card.querySelector('.expl'); ex.hidden=false;
    ex.innerHTML=`<p><span class="pill ${csAns[i]?'ok':'bad'}">${csAns[i]?'BIEN':'NO'}</span>${csAns[i]?'Elegiste la correcta.':'La correcta es la '+'ABCD'[k.c]+'.'}</p>${k.ex}<p class="tag">Fuente: ${k.src} · Repaso: ${TABNAME[k.tab]}</p>`;
    csScore();
  });
  csScore();
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
  let jtKey='narrow'; const jtC=document.getElementById('jt-c');
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
  }
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
