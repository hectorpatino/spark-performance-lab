### Veredictos

**P1. Nombres de operador/nodo de join y shuffle con Photon en la pestaña SQL / DataFrame**
- Veredicto: sin fuente.
- Qué dice la doc: ninguna página oficial da los nombres de los nodos. Leí la página de Photon, query-profile, performance-insights y el Spark UI guide, y no aparecen `PhotonBroadcastHashJoin` ni `PhotonShuffleExchangeSink`. Esos nombres solo salen de un hilo de la comunidad y de una presentación de Databricks sobre Photon (slideshare). Ninguno de los dos es doc oficial; no los pongas en el manual.
- Lo que la doc sí dice, con cita:
  - "Replaces sort-merge joins with high-performance hash joins and uses a redesigned columnar shuffle to increase throughput for large-scale joins." (sección "Optimized joins and shuffles")
  - Lista de operadores soportados: "Hash Aggregate/Join/Shuffle" y "Spatial Join (broadcast and shuffled variants …)".
  - URL: https://docs.databricks.com/aws/en/compute/photon · par Azure: https://learn.microsoft.com/azure/databricks/compute/photon (mismo texto).
- ¿Naranja? Sí, pero solo en compute clásico. Cita (sección "Monitor Photon usage"): "Spark UI (classic all-purpose and jobs compute): In the SQL/DataFrame tab of the Spark UI, Photon operators appear in orange in the query DAG visualization. Standard Spark operators appear in blue. This helps you identify which parts of your query benefit from Photon and which fall back to the Spark runtime."
  - URL: https://docs.databricks.com/aws/en/compute/photon#monitor-photon-usage · par Azure: https://learn.microsoft.com/azure/databricks/compute/photon#monitor-photon-usage (idéntico).
- Alcance: clásico all-purpose y jobs compute. Serverless no tiene Spark UI.
- Texto propuesto (arquitectura#photon, dueña): "Con Photon, Databricks dice que reemplaza los sort-merge joins por hash joins de alto rendimiento y usa un shuffle columnar rediseñado. En el Spark UI de compute clásico (pestaña SQL / DataFrame), los operadores de Photon salen en naranja y los de Spark en azul. La doc no lista cómo se llaman esos nodos en el plan: **Verifícalo** abriendo tu plan."
- Para joins.html:252: la frase "La doc no lista los nombres de los nodos de join de Photon" es correcta. Mejor ponerla una sola vez, en arquitectura#photon, y que joins#photon enlace allí.
- Nota para arquitectura.html:232-234: que en Photon haya "operadores de Photon en lugar de algunos de Spark" está implícito en la doc (Photon operators vs. Standard Spark operators), pero la doc no dice que el nombre cambie.

**P2. Summary Metrics del stage con Photon (Shuffle Read/Write, Spill)**
- Veredicto: sin fuente.
- La página de Photon no menciona Summary Metrics, ni stages, ni tasks. La página del Spark UI guide no distingue Photon. No hay doc que diga que se llaman igual ni que difieren.
- Texto propuesto: no afirmes que "se llaman igual". Si hace falta, di: "La doc de Photon no describe las Summary Metrics de un stage. Compruébalo en un stage de tu job."
- Tampoco está respaldado shuffle.html:196 ("el reparto en stages y el reparto all-to-all no cambian"). La página de Photon no habla de stages. Cámbialo por lo que la doc sí dice: "usa un shuffle columnar rediseñado".
- Lo único comprobable sería ejecutar una query con Photon en compute clásico. No lo hice (instrucción: no ejecutar nada en Databricks).

**P3. Desplegable "Spark Jobs" bajo cada celda en la salida de un notebook de job programado ya terminado**
- Veredicto: sin fuente para el caso de una ejecución terminada.
- Lo que la doc sí dice se refiere a notebooks interactivos. Cita: "If you're not sure if your code is running Spark, try running it interactively in a notebook. If the code is using Spark, you will see Spark jobs under the cell" y "You can also expand the Spark Jobs drop-down under the cell to see if the jobs are actively executing."
  - URL: https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/spark-job-gaps#execution-of-non-spark-code · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/spark-ui-guide/spark-job-gaps#execution-of-non-spark-code.
- La doc de Monitor Lakeflow Jobs describe el export de resultados: "For notebook job runs, you can export a rendered notebook…" y "Exporting a run to HTML captures the notebook source and cell outputs as a static file". No dice qué contiene la salida (si trae el desplegable) ni si los jobs siguen listados una vez terminada la ejecución.
  - URL: https://docs.databricks.com/aws/en/jobs/monitor · par Azure: https://learn.microsoft.com/azure/databricks/jobs/monitor.
- Consecuencia para el manual: arquitectura.html:344-351, plan-ejecucion.html:593 y repaso-fundamentos.html:626 usan el desplegable correctamente como técnica interactiva. En el paso 4 del Repaso ("En un notebook largo, el desplegable Spark Jobs bajo cada celda…") el lector viene de una ejecución terminada, y ahí la doc no lo respalda.
- Texto propuesto (una sola vez, en la página dueña de la técnica, arquitectura): "El desplegable *Spark Jobs* aparece al ejecutar la celda de forma interactiva. La doc no dice si la salida de una ejecución de job ya terminada lo conserva. **Verifícalo** en tu workspace; si no está, usa la pestaña Jobs del Spark UI y compara las horas de cada job con las de las celdas." (La segunda parte es sugerencia de método, no cita; el redactor decide si la deja.)

**P4. Ruta para abrir el Spark UI de una ejecución de job terminada, frente a spark-ui.html#ejecucion-terminada (líneas 95-135)**
- Veredicto: correcto en cada tramo y bien marcado con "Verifícalo". Hay dos matices.
- Tramo 1 y 2. Citas: "In your Databricks workspace's sidebar, click Jobs & Pipelines… Click your job's Name link. The Runs tab appears…" y "To view details for a job run, click the link for the run in the Start time column in the runs list view."
  - URL: https://docs.databricks.com/aws/en/jobs/monitor · par Azure: https://learn.microsoft.com/azure/databricks/jobs/monitor (mismo texto).
- Tramo 3. Cita: "Click a task node in the graph to view task run details, including: … The cluster that ran the task and links to its query history and logs."
- Tramo 4. Cita: "You can view detailed information about Spark jobs by selecting the Spark UI tab on the compute details page." y "If you restart a terminated compute, the Spark UI displays information for the restarted compute, not the historical information for the terminated compute."
  - URL: https://docs.databricks.com/aws/en/compute/clusters-manage#view-compute-information-in-the-spark-ui · par Azure: https://learn.microsoft.com/azure/databricks/compute/clusters-manage#view-compute-information-in-the-spark-ui.
- Las dos páginas no se enlazan entre sí. El manual lo reconoce en su nota "Verifícalo" (spark-ui.html:~124).
- Matiz 1: la doc de jobs/monitor no menciona un enlace al Spark UI en el panel de la tarea (el panel lista "links to its query history and logs"). Un resultado de búsqueda sobre una versión antigua de Azure ("monitor-job-runs") sugería "the Spark UI for the task". La versión actual de ambas páginas no lo dice; no uses esa frase.
- Matiz 2: la doc no dice si el Spark UI sigue disponible para el job compute efímero una vez terminado. La página de clusters-manage solo habla de compute terminado y reiniciado. El manual cubre esto con la advertencia "mira el Spark UI antes de volver a arrancar", que respalda esa cita. Para job compute efímero queda sin fuente. Si el redactor añade una frase al respecto, que sea un "Verifícalo".
- Alcance: solo compute clásico. En serverless no hay Spark UI. La alternativa está en la misma página de Monitor Lakeflow Jobs: "For serverless jobs, queries and query profiles are integrated into the timeline view… click a statement to navigate to the corresponding query profile." El manual ya lo tiene (query-profile).
- Propuesta del junior (hallazgo 4): mover o duplicar la ruta al inicio de Fundamentos. Eso es decisión de estructura; la ruta ya es correcta. Basta con que arquitectura enlace a spark-ui.html#ejecucion-terminada desde donde habla de "tu job". Mejor aún, que esa sección arranque con una línea que separe "job de Lakeflow" de "job de Spark" (ya lo hace en spark-ui.html:98-106).

**P5. joins.html:243-248, "Execution Details" y `COVERAGE_PHOTON`; página dueña**
- `COVERAGE_PHOTON`: correcto.
  - Cita: "COVERAGE_PHOTON … Photon can't accelerate this operation, so the query uses the standard runtime engine. Recommendation: Review Photon limitations and adjust the query to use a supported execution path."
  - URL: https://docs.databricks.com/aws/en/sql/user/queries/performance-insights · par Azure: https://learn.microsoft.com/azure/databricks/sql/user/queries/performance-insights.
  - La página de query profile dice que los insights aparecen en el panel de detalles: "The query details panel shows a summary of the most impactful insights, ranked by their projected effect on total task duration". En el sentido de "insight del query profile" es correcto.
- "Execution Details": impreciso. Es el nombre que usa la doc de Photon, no el de la doc de query profile.
  - Cita Photon: "Query profile (SQL warehouses and serverless compute): The Execution Details view shows the percentage of task time spent in Photon. The query plan distinguishes Photon operators (purple) from standard operators (grey)."
  - URL: https://docs.databricks.com/aws/en/compute/photon#monitor-photon-usage · par Azure: https://learn.microsoft.com/azure/databricks/compute/photon#monitor-photon-usage (idéntico).
  - La página de query profile (https://docs.databricks.com/aws/en/sql/user/queries/query-profile · par Azure https://learn.microsoft.com/azure/databricks/sql/user/queries/query-profile) no contiene "Execution Details". Sus pestañas son **Details**, **Top operators** y **Query text**; el panel **Details** "shows query summary metrics". No encontré qué muestra cada vista ni dónde está el porcentaje de Photon.
  - Corrección propuesta para joins.html: no llamar "vista Execution Details" a algo que el lector no verá con ese nombre. Texto: "En el query profile, la doc de Photon dice que la vista *Execution Details* muestra el porcentaje del tiempo de las tasks que corrió en Photon. En la doc del query profile ese nombre no aparece (sus pestañas son Details, Top operators y Query text): **Verifícalo** en tu perfil." Y mover esto a query-profile.html (ver dueña).
- Colores morado/gris: cita exacta de la doc de Photon (ver arriba), "(purple) … (grey)". El manual la cita correctamente. La paleta es de SQL warehouse/serverless. La naranja/azul es del Spark UI clásico.
- Página dueña: query-profile.html. Ya tiene la viñeta "Colores de Photon" (query-profile.html:124-127) y el aviso de joins con Photon (:190). Nombres de operadores, colores y `COVERAGE_PHOTON` de query-profile viven allí. joins.html debería dejar una sola frase y enlazar a query-profile.html. Los colores del Spark UI clásico viven en arquitectura#photon (dueña de Photon). `COVERAGE_PHOTON` no aparece en query-profile.html según mi búsqueda de "COVERAGE_PHOTON": hoy solo está en joins.html; hay que moverlo, no duplicarlo.

### Huecos
- Nombre de los nodos de Photon en el plan, de join y de shuffle: la doc no los da. Se decide si el manual los nombra (con fuente no oficial y etiquetados) o solo dice lo que la doc dice. Mi recomendación es lo segundo. — https://docs.databricks.com/aws/en/compute/photon
- Qué muestran las vistas del query profile con Photon y dónde se ve el porcentaje del tiempo en Photon: ni la doc de query-profile ni la de Photon lo detallan por pantalla. — https://docs.databricks.com/aws/en/sql/user/queries/query-profile
- Que los Summary Metrics del stage se llamen igual con Photon: sin doc. El lector que usa Photon queda sin garantía; lo honesto es decirlo.
- Spark UI de un job compute efímero ya terminado: la doc de clusters-manage solo cubre compute reiniciado. Es un hueco que el manual marca con "Verifícalo".
- Salida del notebook de una ejecución terminada: hueco (P3).

### Fuera de mi tema
- shuffle.html:196 "el reparto en stages y el reparto all-to-all no cambian" — sin respaldo en la página de Photon; la verificación del claim de motor es de experto-motor-spark / experto-plataforma.
- arquitectura.html:226-231 (`runtime_engine`, "Photon está activo en casi todo compute") — experto-plataforma.
- spark-ui.html:99-108 vocabulario "job" de Lakeflow frente a job de Spark: es tema de pedagogía/redacción (hallazgo 5 del pedagogo), no de fuente.

### Correctos (lista corta)
- `COVERAGE_PHOTON` como nombre de insight y su significado.
- Colores de Photon: naranja/azul en el Spark UI clásico; morado/gris en el query profile de warehouses y serverless.
- Photon "replaces sort-merge joins with high-performance hash joins" (joins.html:238-239).
- "Spark Jobs" bajo la celda como técnica interactiva (spark-job-gaps).
- Cada tramo de la ruta spark-ui.html#ejecucion-terminada contra las páginas de Monitor Lakeflow Jobs y Manage compute.
- La nota de que el Spark UI de un compute reiniciado no muestra la historia del anterior.

Archivos: /Users/hrpr/Documents/rote/spark-performance-lab/src/joins.html, spark-ui.html, arquitectura.html, shuffle.html, query-profile.html. Copias de las páginas de doc que usé: /private/tmp/claude-501/-Users-hrpr-Documents-rote-spark-performance-lab/ee8aede2-f819-40e8-a5f4-7dd5c6d4f2b0/scratchpad/o5/