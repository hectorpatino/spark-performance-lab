### Veredictos

URLs consultadas el 2026-10-11. "What is Photon?" dice "Last updated on 2026-09-11" en Azure y "Sep 11, 2026" en Databricks. Los dos textos coinciden.

**P1. Photon en job compute: UI frente a API**

- Afirmación (glossary.json:141): "Activo por defecto en el compute clásico y siempre en serverless; Catalyst sigue planeando la query."
  Veredicto: impreciso.
  - El "por defecto en el compute clásico" es correcto para la UI. Con la API es falso: ahí no es por defecto.
  - "Siempre en serverless" es un absoluto que la doc no dice así. La doc dice "enabled on".
  Cita: "Photon is enabled on serverless compute, SQL warehouses, and serverless Lakeflow pipelines. For classic all-purpose compute, jobs compute, and classic Lakeflow pipelines, Databricks enables Photon by default. Turn it on or off with the Use Photon Acceleration checkbox under Performance when creating or editing compute. [...] If you create these resources using the Clusters API or Jobs API, you must explicitly enable Photon by setting runtime_engine to PHOTON. If you use the Pipelines API, set photon to true." (sección "Photon enablement")
  — https://docs.databricks.com/aws/en/compute/photon · Azure: https://learn.microsoft.com/azure/databricks/compute/photon
  Alcance: classic all-purpose, jobs compute, classic pipelines.

- Respuesta a la pregunta, por vía de creación.
  - **UI de Jobs.** Sí, Photon va activo por defecto. Cita (Configure compute for jobs): "You configure compute for classic jobs using the same UI and settings available for all-purpose compute." Por tanto vale el casillero *Use Photon Acceleration*.
    — https://docs.databricks.com/aws/en/jobs/use-compute · Azure: https://learn.microsoft.com/azure/databricks/jobs/use-compute
  - **Compute configuration reference.** Cita: "Photon is enabled by default on compute running Databricks Runtime 9.1 LTS and above."
    — https://docs.databricks.com/aws/en/compute/configure#use-photon-acceleration · Azure: https://learn.microsoft.com/azure/databricks/compute/configure#use-photon-acceleration
  - **Jobs API, Clusters API y bundles.** No es por defecto: hay que fijar `runtime_engine: PHOTON` en el `new_cluster`. La doc de la API lo confirma: "If left unspecified, the runtime engine defaults to standard unless the spark_version contains -photon-, in which case Photon will be used." Valores: `NULL`, `STANDARD`, `PHOTON`.
    — https://docs.databricks.com/api/workspace/clusters/get
  - **Bundles.** La doc que leí no habla de bundles. Un bundle define el job con el mismo esquema de la Jobs API, así que aplica lo de la API. Esa deducción no está citada.

- Afirmación (arquitectura.html:226-241): "Photon está activo en casi todo compute de Databricks [...] y por defecto en el compute clásico. Si creas el compute con la Clusters API o la Jobs API, tienes que activarlo tú (`runtime_engine` = `PHOTON`)."
  Veredicto: correcto, pero ambiguo para el lector.
  - El contenido coincide con la doc. Pero "por defecto en el compute clásico" seguido de "con la API tienes que activarlo" suena a contradicción.
  - Falta decir qué vía de creación manda. El junior ya lo señaló (61-junior-r5.md, líneas 42 y 220).
  - "casi todo" es un encabezado sin fuente literal.
  - "Este manual describe el motor de Spark sin Photon" no es afirmación técnica de doc. Es decisión editorial.

- Afirmación (glossary.json:336, SQL warehouse): "Usa Photon siempre."
  Veredicto: correcto.
  Cita: "Photon is the default engine for all SQL warehouses". La doc dice "default engine", no "siempre". Suaviza el absoluto si el redactor quiere ser fiel.

- Texto propuesto para el glosario (entrada Photon):
  "Motor de ejecución vectorizado de Databricks, compatible con las APIs de Spark. Está activo en serverless y en los SQL warehouses. En el compute clásico (all-purpose y job compute) viene activo por defecto si lo creas desde la UI; si lo creas con la Clusters API o la Jobs API (también con bundles), tienes que fijar `runtime_engine: PHOTON`. Catalyst sigue planeando la query; Photon cambia quién la ejecuta."

- Texto propuesto para arquitectura.html (frases de enablement, que sustituyen a "por defecto en el compute clásico..."):
  "Photon está activo en serverless y en los SQL warehouses. En el compute clásico (all-purpose y job compute) lo activa Databricks por defecto si creas el compute desde la UI (casilla *Use Photon Acceleration*, en *Performance*). Si defines el compute con la Clusters API o la Jobs API, tienes que activarlo tú con `runtime_engine = PHOTON`."

**P2. Ver, en una ejecución terminada, el compute y si usó Photon**

- Dónde ver el compute de una ejecución de job.
  Veredicto: parcialmente documentado. La doc no da una receta que diga "así sabes si fue serverless, job compute o all-purpose".
  Cita (View job run details, graph view): "Click a task node in the graph to view task run details, including: [...] The cluster that ran the task and links to its query history and logs." Para serverless: "For serverless jobs, queries and query profiles are integrated into the timeline view." Las ejecuciones se conservan "for up to 60 days".
  — https://docs.databricks.com/aws/en/jobs/monitor · Azure: https://learn.microsoft.com/azure/databricks/jobs/monitor
  Alcance: un job multitarea puede mezclar compute por tarea. La doc dice: "You define compute resources for each task" (https://docs.databricks.com/aws/en/jobs/use-compute). Hay que mirar el compute por tarea, no por job.
  Inferencia mía, sin cita: si la tarea muestra un cluster, es clásico; si no, es serverless. La doc solo da la pista de que el timeline serverless integra query profiles.

- Configuración del compute clásico, incluida la ficha "Photon".
  Cita (Compute configuration reference): "When you view an existing compute, go to the Configuration tab, click JSON in the top right of the tab, copy the JSON [...] JSON view is read-only."
  — https://docs.databricks.com/aws/en/compute/clusters-manage · Azure: https://learn.microsoft.com/azure/databricks/compute/clusters-manage
  Para saber si hay Photon, ahí se mira `runtime_engine` (`PHOTON` o `STANDARD`). El campo está definido en la Clusters API: "Determines the cluster's runtime engine, either standard or Photon."
  Aviso: esa doc habla de ver un compute existente. Un job cluster termina al acabar la ejecución. La doc que leí no dice si su JSON sigue visible desde la ejecución. Ese punto queda sin fuente.

- Ver si una query corrió en Photon (ya está en el manual, correcto).
  Cita: "Spark UI (classic all-purpose and jobs compute): In the SQL/DataFrame tab of the Spark UI, Photon operators appear in orange in the query DAG visualization. Standard Spark operators appear in blue." Y: "Query profile (SQL warehouses and serverless compute): The Execution Details view shows the percentage of task time spent in Photon. The query plan distinguishes Photon operators (purple) from standard operators (grey)."
  — https://docs.databricks.com/aws/en/compute/photon#monitor-photon-usage · Azure: https://learn.microsoft.com/azure/databricks/compute/photon
  Es el mismo contenido que el manual usa en arquitectura.html:226-241. Falta añadir que los operadores estándar salen en azul (Spark UI), o en gris (query profile).

- "El nombre del DBR con photon".
  Veredicto: impreciso, no lo uses como pista.
  - El sufijo `-photon-` en `spark_version` es el formato antiguo. La API dice: "This field is not compatible with legacy spark_version values that contain -photon-. Remove -photon- from the spark_version and set runtime_engine to PHOTON."
  - La nota de DBR 14.0 dice: "Enable Photon by setting `runtime_engine = PHOTON`".
  - Hoy el campo fiable es `runtime_engine`, no el nombre del DBR.
  — https://docs.databricks.com/api/workspace/clusters/get · Azure: https://learn.microsoft.com/azure/databricks/release-notes/runtime/14.0
  Para jobs no existe, que yo haya visto, una columna de Photon en las system tables. `system.compute.clusters` tiene `dbr_version`. No encontré `runtime_engine` allí. Es un hueco, no una afirmación.

- Texto propuesto (arquitectura#photon o Repaso):
  "Para saber en qué compute corrió una ejecución terminada: abre la ejecución en *Runs*, haz clic en la tarea y mira el cluster que la ejecutó (cada tarea puede tener un compute distinto). Para saber si usó Photon, abre la configuración del compute clásico y mira `runtime_engine` en el JSON (`PHOTON` o `STANDARD`); en el Spark UI, los operadores de Photon salen en naranja. En serverless, usa el query profile (*Execution Details*)."

**P3. "El reparto en stages y el reparto all-to-all no cambian" (shuffle.html:189-197)**

- Afirmación: "El reparto en stages y el reparto all-to-all no cambian; el formato de los archivos sí puede."
  Veredicto: sin fuente.
  - La página de Photon no menciona stages, jobs ni el reparto all-to-all. Lo único que dice sobre el shuffle es "Replaces sort-merge joins with high-performance hash joins and uses a redesigned columnar shuffle to increase throughput for large-scale joins." Y en la lista de operadores: "Hash Aggregate/Join/Shuffle".
  - La frase "el formato de los archivos sí puede" tampoco tiene fuente. El propio manual admite que la doc no detalla cómo son esos archivos.
  - Además hay una contradicción con "sort-merge → hash join": si Photon cambia el algoritmo del join, el plan de stages puede diferir en lo que ves (los nodos). La doc tampoco dice que no cambie.
  Cita: la de arriba. https://docs.databricks.com/aws/en/compute/photon · Azure: https://learn.microsoft.com/azure/databricks/compute/photon
  Corrección propuesta: quitar el dato y dejar solo lo documentado. Texto:
  "**Con Photon.** Esta página y sus simuladores describen el shuffle de Spark sin Photon. Photon es el motor de ejecución de Databricks (qué es y si tu compute lo usa: Arquitectura). Según su documentación, Photon usa un shuffle columnar rediseñado para aumentar el rendimiento en joins grandes (What is Photon?). La doc no detalla cómo se parten en stages esas queries ni cómo son los archivos de shuffle de Photon, así que no asumas que son iguales a los de aquí."
  Si quieres un estado verificado de verdad (stages con Photon), habría que ejecutar una query en compute con Photon y mirar el Spark UI. Eso requiere que el usuario elija el perfil; yo no ejecuté nada.

**P4. Cita de "What is Photon?" sobre joins y shuffle, y URL vigente**

- URL vigente: https://docs.databricks.com/aws/en/compute/photon . Par Azure: https://learn.microsoft.com/azure/databricks/compute/photon .
  - /runtime/photon sigue vivo en los dos sitios, pero redirige a /compute/photon (comprobado con curl: la URL final es /compute/photon). Los enlaces del manual en /compute/photon son correctos.
  - llms.txt de Databricks aún lista la forma corta https://docs.databricks.com/compute/photon.
- Citas literales (sección "How Photon works" y siguientes):
  - "Optimized joins and shuffles: Replaces sort-merge joins with high-performance hash joins and uses a redesigned columnar shuffle to increase throughput for large-scale joins."
  - "For supported operations, Photon replaces the JVM-based Spark SQL execution engine with a native C++ runtime. The Apache Spark query optimizer (Catalyst) still plans your query, but Photon takes over at the execution layer, processing data in columnar batches rather than row by row. When Photon encounters an unsupported operation during query execution, it transparently falls back to the Spark runtime for the remainder of that operation."
  - Operadores: "Scan (Parquet, Delta, CSV, JSON), Filter, Project; Hash Aggregate/Join/Shuffle; Nested-Loop Join; Null-Aware Anti Join; Spatial Join (broadcast and shuffled variants [...]); Union, Expand, ScalarSubquery; Delta/Parquet Write Sink; Sort, TopK, Limit; Window Function."
  - Límites que importan al lector: "Photon doesn't support UDFs (User Defined Functions), RDD APIs, or Dataset APIs." En la versión que descargué, la sección "Limitations" venía en la página. No copié el resto de su lista literal; confírmala antes de citarla.
  - "Queries that normally complete in under two seconds don't see meaningful improvement because execution time is dominated by planning and scheduling overhead".
- Veredicto sobre joins.html:168-171 y 235-262 ("cambia el sort-merge por hash joins propios al ejecutar"): correcto con respecto a la cita. La doc dice "Replaces sort-merge joins with [...] hash joins", sin matizar cuándo. Que "no lista los nombres de los nodos de join de Photon" también es cierto: no están en la página.
  El manual puede ser más claro con el lector si dice qué verá: operadores de Photon en naranja en el Spark UI (pestaña *SQL/DataFrame*), y el nombre exacto del nodo no está documentado.
- Hueco para el junior (61-junior-r5, "¿Qué nombre tiene un join de Photon...?"): sin fuente. No inventes nombres.

**P5. Ver la versión de DBR del compute**

- Afirmación (plan-ejecucion.html:314): "Desde Databricks Runtime 19, si no fijas un número, se usa auto-optimized shuffle."
  Veredicto: correcto, con matiz de nombre.
  Cita (notas de DBR 19): "Auto-optimized shuffle v2 enabled by default: Auto-optimized shuffle v2 is now used when you do not set a fixed number of shuffle partitions. Workloads that explicitly set a fixed shuffle partition count are unchanged."
  — https://docs.databricks.com/aws/en/release-notes/runtime/19 · Azure: https://learn.microsoft.com/azure/databricks/release-notes/runtime/19
  La doc dice "v2". El manual dice "auto-optimized shuffle". Si se cita la nota de DBR 19, conviene decir "v2".
  Cita (AQE): "`spark.sql.shuffle.partitions` [...] Setting the value `auto` enables auto-optimized shuffle, which automatically determines this number based on the query plan and the query input data size. [...] Default value: 200".
  — https://docs.databricks.com/aws/en/optimizations/aqe#enable-auto-optimized-shuffle · Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe#enable-auto-optimized-shuffle
  Aviso: la página de AQE sigue diciendo "Default value: 200", y la de DBR 19 dice que sin fijar número se usa auto. La doc es inconsistente entre sí; el manual ya lo trata bien al citar las dos.
  El cambio no aplica a serverless, donde el manual ya dice que `auto` es el default.
- Cómo ver la versión (lo que la doc respalda):
  - Compute clásico: pestaña *Configuration* del compute (UI), con el *Databricks Runtime Version* elegido al crear el compute. Cita: la sección "Compute configuration reference" lista la versión como opción de configuración (https://docs.databricks.com/aws/en/compute/configure).
  - En JSON: campo `spark_version` (Clusters API).
  - En system tables: `system.compute.clusters.dbr_version`, definida como "The Databricks Runtime of the cluster." con ejemplo `14.x-snapshot-scala2.12`.
    — https://docs.databricks.com/aws/en/admin/system-tables/compute · Azure: https://learn.microsoft.com/azure/databricks/admin/system-tables/compute
  - Para unir un job con su compute: `system.lakeflow.job_task_run_timeline.compute_ids`: "The compute_ids array contains IDs of job clusters, interactive clusters, and SQL warehouses used by the job task".
    — https://learn.microsoft.com/azure/databricks/admin/system-tables/jobs
  - Sin fuente: ver la versión dentro del notebook (`spark.version`). `spark.version` da la de Spark, no la de DBR. No lo escribí como dato.
  - Serverless: no hay DBR que elegir. Usa "versión de entorno" (serverless environment version). Es otro tema; lo trata `experto-plataforma`/serverless.
- Texto propuesto:
  "Para saber si aplica 'desde DBR 19': en el compute clásico, mira *Databricks Runtime Version* en la pestaña *Configuration* del compute, o `spark_version` en su JSON. Si el job es una ejecución terminada, cruza `compute_ids` de `system.lakeflow.job_task_run_timeline` con `system.compute.clusters.dbr_version`. Si en tu código fijas `spark.sql.shuffle.partitions` a un número, el cambio no te afecta."

### Huecos
- Cómo distinguir serverless de job compute en una ejecución terminada — la doc no lo dice con una frase; el lector lo necesita como primer paso — https://docs.databricks.com/aws/en/jobs/monitor
- Si el JSON/`runtime_engine` de un job cluster ya terminado sigue visible desde la ejecución — sin fuente; el lector lo necesita para "¿corrió con Photon?" — https://docs.databricks.com/aws/en/compute/clusters-manage
- Nombres de los nodos de join de Photon en el plan — sin fuente — https://docs.databricks.com/aws/en/compute/photon
- Si el desplegable *Spark Jobs* de las celdas aparece en una ejecución programada de notebook — sin fuente que lo diga; derivar a `experto-observabilidad` — https://docs.databricks.com/aws/en/jobs/monitor

### Fuera de mi tema
- src/plan-ejecucion.html:308-320 (200 por defecto, `auto`, DBR 19) y shuffle.html:105-107 ("las que elija Databricks si no fijas un número", sin la condición de versión) — experto-motor-spark (las cifras de shuffle partitions); yo solo verifiqué la nota de DBR 19 y la cita de AQE.
- Spark UI de una ejecución terminada y métricas del shuffle con Photon — experto-observabilidad.

### Correctos (lista corta)
- Photon activo en serverless y SQL warehouses.
- Casilla *Use Photon Acceleration* y `runtime_engine = PHOTON` con la Clusters API y la Jobs API.
- Photon: Catalyst sigue planeando; Photon ejecuta (cita literal de "How Photon works").
- Operadores de Photon en naranja en el Spark UI y morados en el query profile (el manual usa "naranja" y "morado"; la doc dice orange/blue en Spark UI y purple/grey en query profile).
- Photon reemplaza sort-merge por hash join y usa shuffle columnar.
- URL /compute/photon vigente.
- DBR 19: auto-optimized shuffle v2 si no fijas un número.