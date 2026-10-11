# Experto motor Spark r3 (resumen fiel; descargas en scratchpad/docs/*.txt)

## Dudas del junior
1. spark.conf.get con auto: SIN FUENTE. Corrección plan:323-329: "Para ver lo que está configurado, usa spark.conf.get(...) o SET …. La doc no dice qué devuelve cuando se usa auto-optimized shuffle. El número real de particiones de un shuffle lo ves en las tasks del stage que lo lee, en el Spark UI." Fuentes: spark/conf#configure-spark-properties-for-serverless-notebooks-and-jobs; release-notes/runtime/19#2026-09-21-features; aqe#enable-auto-optimized-shuffle ("Default value: 200"); optimizations/spark-ui-guide/long-spark-stage ("Determine the number of tasks by looking here") — todas con par Azure.
2. Skipped sin caché: a medias. debugging-spark-ui#job-details-page (caché/checkpoint son ejemplos) + guía RDD #performance-impact (archivos de shuffle conservados). Caso típico: AQE parte en varios jobs; decirlo como observación del Spark UI (no documentado).
3. Nodos de join con Photon: SIN FUENTE. Photon: naranja (Photon) / azul (Spark) en DAG; query profile morado (Photon) / gris. compute/photon#monitor-photon-usage.
4. Particiones vacías: aqe#why-didnt-aqe-broadcast-a-small-join-table: "the majority of the tasks can finish quickly with sort merge join or it can potentially be optimized with skew join handling. AQE avoids changing … if the percentage of non-empty partitions is lower than spark.sql.adaptive.nonEmptyPartitionRatioForBroadcastJoin." joins:197: "…ni si la mayoría de sus particiones llegan vacías: entonces casi todas las tasks del sort-merge acaban enseguida y AQE no lo considera rentable (el umbral es spark.sql.adaptive.nonEmptyPartitionRatioForBroadcastJoin)".
5. Límite hint BROADCAST: la doc no da límite ("broadcast regardless of autoBroadcastJoinThreshold", sql-ref-syntax-qry-select-hints). 1 GB/8 GB/descomprimido = guía 2023 (no oficial; dice "In Photon, we have the executor-side broadcast").
6. Shuffle con Photon: shuffle.html:186-192 añadir "Qué cambia en tu Spark UI con Photon: joins#photon" y "El reparto en stages y el reparto all-to-all no cambian; el formato de los archivos sí puede" (Catalyst planea; Photon soporta Hash Aggregate/Join/Shuffle; "redesigned columnar shuffle").

## Falso
- plan:31-32 "Los cores no cambian cuántas tasks hay, solo cuántas corren a la vez" (absoluto; minPartitionNum/defaultParallelism y AQE coalesce minPartitionNum "2x no. of cluster cores", aqe#dynamically-coalesce-partitions). → "En cada stage, Spark lanza una task por partición. Los cores deciden cuántas corren a la vez; también pueden influir en cuántas particiones salen al leer (ver De dónde sale cada partición)."

## Impreciso
- plan:323-329 spark.conf.get (arriba).
- plan:35-37 regla "+1" → "…súmale uno. Si hay un BroadcastExchange, la lectura de la tabla pequeña va en un stage aparte." (AQE: "at the end of a shuffle and broadcast exchange (referred to as a query stage in AQE)").
- app.js:304 VACÍAS "AQE las une" → "Con AQE activo (por defecto, salvo en streaming), AQE puede unirlas tras el shuffle."
- glosario AQE → "…Activado por defecto. Actúa en queries que no son streaming y tienen al menos un exchange (shuffle o broadcast) o una subquery. No siempre cambia el plan." (aqe#application)
- joins:132-134 cita fuera de contexto → "La doc lo dice para el caso en que los dos lados llevan hint: Spark elige el lado 'based on the join type and the sizes of the relations', y una estrategia 'might not support all join types'."
- stages:17-18, :339, :357-361 guía 2023 sin etiqueta.
- plan:490-492 "count()" en lista de 1 task → "…busca un coalesce(1) o repartition(1), una ventana sin PARTITION BY, una UDF cara o un archivo que no se puede partir." (one-spark-task)
- joins:155-157 shuffle hash "o cuando AQE lo decide" → "Shuffle hash queda para cuando lo pides con un hint. En Apache Spark, AQE también puede elegirlo si subes spark.sql.adaptive.maxShuffledHashJoinLocalMapThreshold (0 por defecto)." (sql-performance-tuning#converting-sort-merge-join-to-shuffled-hash-join)
- arquitectura:20-22, :176-180 "La excepción es…" → "Hay excepciones; la más común es leer CSV o JSON infiriendo el esquema…" (parallelPartitionDiscovery.threshold).
- plan:62-64, arquitectura:80-81, glosario job/acción: varios jobs no solo AQE → "Una acción puede verse como varios jobs: AQE ejecuta la query por tramos, y un broadcast o el muestreo de un orderBy pueden lanzar jobs propios. La doc no lo detalla; la pestaña SQL / DataFrame lista los jobs de cada query." (web-ui SQL tab "the jobs and stages associated with it")
- glosario WholeStageCodegen → "Con Photon, los operadores que Photon soporta los ejecuta Photon; el resto sigue en Spark."
- joins:148-163 añadir "En Databricks, además, el historial de queries parecidas puede llevar a un broadcast (insight HISTORY_BASED_JOIN_STRATEGY)." (performance-insights)
- shuffle:326-327 cita no literal → "La doc las llama 'Shuffle spill (memory)' y 'Shuffle spill (disk)'…"
- arquitectura:229-230 → "…puede fallar en la acción, o al pedir el esquema (df.columns), y no al definir la transformación." (connect-vs-classic)
- plan:356-357 coalesce(1) → "…hace que el cálculo de su stage (todo lo que hay desde el último shuffle) corra en una sola task."
- shuffle:337-340 skew Max vs p75 → "Max frente al percentil 75 por task. La guía de Databricks lo aplica a la duración; un Max de lectura muy por encima suele acompañarlo." (long-spark-stage-page#skew)

## Sin fuente
- J-1 joins:554-556 → "Una tabla grande con otra que cabe con holgura en la memoria de cada executor → hint BROADCAST sobre la pequeña, si el tipo de join lo permite. Comprueba el tamaño real en data size del BroadcastExchange." (web-ui#sql-metrics)
- J-2 joins:589-592, :607-609 → etiqueta guía 2023; :608 "sin Photon, pasan por el driver".
- J-3 joins:63-64, joins.js:94, :123 → etiqueta guía.
- J-4 reglas del código de Spark (joins:79, :154, :160-163, :598-600, joins.js:113) → quitar o agrupar bajo aviso :165-169.
- J-5 shuffle:182-183, app.js:199 "módulo" → "Spark calcula con un hash de la clave a qué partición destino va".
- J-6 joins.js:52 "(aviso en el log del driver)" → quitar paréntesis.
- J-7 plan:367 "no lanza ningún job" → citar aqe#sql-explain "As SQL EXPLAIN does not execute the query".
- J-8 app.js:990 caption: "el driver aparece como un executor más, pero no corre tasks (salvo en single node)" (web-ui#executors-tab "including the driver").

## Huecos con fuente
- Query profile: Photon morado / estándar gris (compute/photon#monitor-photon-usage).
- Qué job/stage se lleva el tiempo: "Sort the jobs by duration and click on the link in the description for the longest job" (spark-ui-guide/jobs-timeline); "Scroll to the bottom of the job's page to the list of stages and order them by duration" (spark-ui-guide/long-spark-stage).
- Volver a la celda: "If the code is using Spark, you will see Spark jobs under the cell" (spark-ui-guide/spark-job-gaps#execution-of-non-spark-code); "Associated SQL Query: Link to the SQL tab for this job" y "cross-reference stage execution details to the relevant query in the SQL Tab" (web-ui).
- DAG: web-ui#jobs-detail "Visual representation of the directed acyclic graph of this job where vertices represent the RDDs or DataFrames and the edges represent an operation to be applied"; query-profile "the directed acyclic graph (DAG) of the query".
- count() antes de write: pyspark/#data-processing "In production data pipelines, writing data is typically the only action that should be present. All other actions interrupt query optimization and can lead to bottlenecks."
