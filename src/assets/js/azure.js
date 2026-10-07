/* Azure Databricks: recomendador de tipo de VM con citas a la doc oficial.
   Cada frase lleva su fuente; las deducciones van marcadas. */
(function () {
  'use strict';
  if (!document.getElementById('az-out')) return;
  try {
    const L = 'https://learn.microsoft.com/azure/';
    const C = {
      cost: ['Cost optimization best practices', L + 'databricks/lakehouse-architecture/cost-optimization/best-practices'],
      bp: ['Classic compute best practices', L + 'databricks/compute/cluster-config-best-practices'],
      cfg: ['Compute configuration reference', L + 'databricks/compute/configure'],
      conf: ['Spark configuration', L + 'databricks/spark/conf'],
      waf: ['Well-Architected: Azure Databricks', L + 'well-architected/service-guides/azure-databricks'],
      efam: ['Familia E (Azure)', L + 'virtual-machines/sizes/memory-optimized/e-family'],
      ffam: ['Familia F (Azure)', L + 'virtual-machines/sizes/compute-optimized/f-family'],
      lfam: ['Familia L (Azure)', L + 'virtual-machines/sizes/storage-optimized/l-family'],
      opt: ['Optimize data file layout', L + 'databricks/tables/operations/optimize'],
      vac: ['Vacuum', L + 'databricks/tables/operations/vacuum'],
      po: ['Predictive optimization', L + 'databricks/optimizations/predictive-optimization'],
      cache: ['Disk cache', L + 'databricks/optimizations/disk-cache'],
      photon: ['Photon', L + 'databricks/compute/photon'],
      sdp: ['Lakeflow pipelines autoscaling', L + 'databricks/ldp/auto-scaling'],
      ssp: ['Structured Streaming en producción', L + 'databricks/structured-streaming/production'],
      spotvm: ['Azure Spot VMs · Eviction policy', L + 'virtual-machines/spot-vms#eviction-policy']
    };
    const cite = (...ks) => ks.map(k => `<a class="az-cite" href="${C[k][1]}" target="_blank" rel="noopener">${C[k][0]}</a>`).join(' ');
    const INF = '<span class="az-inf">deducción</span>';
    const li = (txt, cites, inf) => `<li>${txt} ${inf ? INF : ''}${cites ? cite(...cites) : ''}</li>`;

    const W = {
      spill: {
        fam: 'Memory optimized', series: 'Serie E (por ejemplo Edsv5). La guía Well-Architected también nombra la serie M.',
        why: [
          li('La regla de Databricks: memory optimized para cargas con shuffle pesado y spill.', ['cost']),
          li('Para ETL complejo con joins y uniones: menos workers y más grandes. Si ves mucho spill u OOM, sube la memoria de las instancias.', ['bp']),
          li('Series E: alta proporción de memoria por core, pensadas para procesar mucho dato en memoria.', ['efam', 'waf']),
          li('Antes de pagar más memoria, descarta skew en el Spark UI: si una sola task acumula el spill, la VM no lo arregla.', null, true)
        ],
        auto: [li('El autoscaling local storage agrega managed disks hasta 5 TB por VM si el spill llena el disco. Evita el fallo por disco lleno, no la lentitud.', ['cfg'])],
        more: [li('Photon ayuda sobre todo en joins, agregaciones y scans grandes, y reemplaza sort-merge joins por hash joins.', ['photon'])]
      },
      stream: {
        fam: 'Compute optimized', series: 'Serie F (por ejemplo Fadsv7).',
        why: [
          li('La regla de Databricks: compute optimized para Structured Streaming.', ['cost']),
          li('Familia F: alta proporción de CPU por memoria.', ['ffam']),
          li('Corre el stream como Lakeflow Job en job compute, nunca en all-purpose.', ['ssp'])
        ],
        auto: [
          li('La página de producción de Structured Streaming dice que no actives autoscaling en el compute de jobs de streaming: el autoscaling clásico tiene limitaciones para reducir el cluster. Para escalar, la doc recomienda Lakeflow Spark Declarative Pipelines con enhanced autoscaling.', ['ssp', 'sdp']),
          li('Ojo: la guía de costos sugiere para streaming 4 a 8 workers <i>con</i> autoscaling. Las dos páginas no coinciden; la de producción es la específica de streaming.', ['cost'])
        ],
        more: [
          li('Photon solo cubre streaming stateless; las consultas con estado corren en el motor de Spark.', ['photon']),
          li('Si el negocio acepta datos cada pocas horas, la doc recomienda <code>Trigger.AvailableNow</code> en vez de un cluster encendido 24/7.', ['cost'])
        ]
      },
      maint: {
        fam: 'Compute optimized, con SSD', series: 'Serie F con disco local (por ejemplo Fadsv7, que según Azure trae disco local).',
        why: [
          li('La regla de Databricks: compute optimized para jobs de mantenimiento como OPTIMIZE y VACUUM.', ['cost']),
          li('OPTIMIZE gasta CPU codificando y decodificando Parquet. La doc recomienda compute optimized y añade que se beneficia de SSD conectados.', ['opt']),
          li('Que Fadsv7 sea la mejor elección por traer disco local se deduce de juntar las dos páginas; ninguna lo dice así.', ['ffam'], true)
        ],
        auto: [li('Para VACUUM: autoscaling de 1 a 4 workers de 8 cores y un driver de 8 a 32 cores. El borrado corre solo en el driver; si hay OOM, agranda el driver.', ['vac'])],
        more: [li('En tablas managed de Unity Catalog, predictive optimization corre OPTIMIZE, VACUUM y ANALYZE en serverless. Puede que no necesites este cluster.', ['po'])]
      },
      adhoc: {
        fam: 'Storage optimized', series: 'Serie L (Lsv3, Lasv3) con NVMe local.',
        why: [
          li('La regla de Databricks: storage optimized para cargas que se benefician de caché, como análisis ad-hoc e interactivo.', ['cost']),
          li('Para análisis: un single node con una VM grande suele ser lo mejor para un analista solo; storage optimized con disk cache, porque se relee el mismo dato.', ['bp']),
          li('Disk cache: elige un worker con volúmenes SSD; viene activado y usa como mucho la mitad del SSD local.', ['cache']),
          li('Serie L: NVMe local de alto throughput. Que sea la opción ideal para disk cache es una deducción.', ['lfam'], true)
        ],
        auto: [li('Activa auto termination y, si la carga del analista varía, autoscaling.', ['bp'])],
        more: [li('Si todo es SQL interactivo, la doc considera el SQL warehouse el motor más eficiente en costo.', ['cost'])]
      },
      ml: {
        fam: 'Memory optimized o storage optimized', series: 'Serie E o serie L. GPU solo con librerías aceleradas por GPU.',
        why: [
          li('La página de costos dice memory optimized para ML.', ['cost']),
          li('La de buenas prácticas de compute dice, para entrenar modelos, storage optimized con disk cache o instancias con disco local, por las lecturas repetidas. Las dos son oficiales: elige según si tu cuello es memoria o relectura.', ['bp']),
          li('GPU solo si usas librerías aceleradas por GPU; si no, pagas más sin ganar nada.', ['cost'])
        ],
        auto: [li('Para experimentar: política Personal Compute y single node con una VM grande. Pocos nodos reducen el costo del shuffle.', ['bp'])],
        more: [li('Activa auto termination y usa pools para limitar los tipos de instancia aprobados.', ['bp'])]
      }
    };

    let w = 'spill', sla = 'strict', bud = 'normal';
    function spot() {
      if (sla === 'strict') {
        return {
          avail: 'ON_DEMAND_AZURE', first: null,
          items: [
            li('SLA estricto: todo on-demand. La doc recomienda spot solo para cargas que pueden tardar más si Azure desaloja workers.', ['cost', 'bp']),
            bud === 'tight' ? li('Para ahorrar sin spot: corre los jobs en job compute (bastante más barato que all-purpose), con auto termination y pools (sin DBU por instancias ociosas, aunque Azure cobra la VM).', ['cost']) : ''
          ]
        };
      }
      return {
        avail: 'SPOT_WITH_FALLBACK_AZURE', first: 1,
        items: [
          li('Workers spot. El driver siempre es on-demand: la primera instancia nunca es spot.', ['cfg', 'cost']),
          li('Si Azure desaloja workers, Databricks busca spot nuevas y, si no hay, pone on-demand. Las spot que fallan al arrancar no se reemplazan solas.', ['cfg']),
          bud === 'tight' ? li('Con presupuesto ajustado, <code>spot_bid_max_price = -1</code> evita desalojos por precio: pagas el precio spot del momento, como mucho el de una VM estándar. Súmale job compute y auto termination.', ['spotvm', 'cost']) : li('Con presupuesto normal, spot sigue siendo ahorro con poco riesgo para un SLA flexible.', ['bp'])
        ]
      };
    }
    function draw() {
      const r = W[w], s = spot();
      const json = `"azure_attributes": {\n${s.first ? `  "first_on_demand": ${s.first},\n` : ''}  "availability": "${s.avail}"${s.first && bud === 'tight' ? ',\n  "spot_bid_max_price": -1' : ''}\n}`;
      const autoCommon = [
        w === 'stream' ? '' : li('En plan Premium tienes optimized autoscaling: sube de mínimo a máximo en 2 pasos como mucho y baja mirando el estado del shuffle.', ['cfg']),
        li('No actives <code>spark.dynamicAllocation.enabled</code>: no está soportado y choca con el autoscaling de Databricks.', ['conf', 'cfg']),
        sla === 'strict' ? li('Con SLA estricto, los pools reducen el tiempo de arranque y de escalado.', ['cost']) : ''
      ];
      document.getElementById('az-out').innerHTML =
        `<div class="az-card az-main"><p class="az-h">Familia recomendada</p><p class="az-fam">${r.fam}</p><p class="az-ser">${r.series}</p><ul>${r.why.join('')}</ul></div>` +
        `<div class="az-card"><p class="az-h">Spot u on-demand</p><ul>${s.items.join('')}</ul><pre><code>${json}</code></pre></div>` +
        `<div class="az-card"><p class="az-h">Autoscaling y discos</p><ul>${r.auto.join('')}${autoCommon.join('')}</ul></div>` +
        `<div class="az-card"><p class="az-h">Además</p><ul>${r.more.join('')}${li('Para la mayoría de cargas nuevas, la doc recomienda serverless: no eliges VM.', ['bp'])}</ul></div>`;
    }
    function group(id, attr, set) {
      const g = document.getElementById(id);
      g.querySelectorAll('[' + attr + ']').forEach(b => b.addEventListener('click', () => {
        g.querySelectorAll('[' + attr + ']').forEach(x => x.setAttribute('aria-pressed', x === b));
        set(b.getAttribute(attr)); draw();
      }));
    }
    group('az-w', 'data-az-w', v => { w = v; });
    group('az-sla', 'data-az-sla', v => { sla = v; });
    group('az-bud', 'data-az-bud', v => { bud = v; });
    draw();
  } catch (e) { console.error('azure: recomendador', e); }
})();
