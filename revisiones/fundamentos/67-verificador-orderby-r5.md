Informe de verificación: orderBy/ORDER BY global por rangos (predicción `aggsort`)

**Resumen.** Solo dos partes de la afirmación tienen fuente: que ORDER BY da un orden total y que AQE une particiones después de un shuffle. Ninguna página oficial (Spark SQL, PySpark, API de Scala, Databricks o Azure) dice que `orderBy`/`ORDER BY` use un shuffle, que reparta por rangos, cuántas particiones crea o que tome una muestra. La partición por rangos, el muestreo y el número de particiones (`spark.sql.shuffle.partitions`) están documentados solo para `repartitionByRange`. Tampoco encontré un ejemplo oficial de `explain()` con `Exchange rangepartitioning`. El único ejemplo de `EXPLAIN` con rangos está en la página de hints (`REPARTITION_BY_RANGE`), y ahí el optimizador elimina el nodo de rangos. Ninguna parte es falsa, pero el mecanismo en el que se apoya la respuesta c no tiene fuente.

No ejecuté nada. No edité nada.

## Veredictos ("impreciso" y "sin fuente" primero)

- Afirmación: "Por el orderBy, Spark reparte por rangos, y para decidir los rangos toma una muestra de los datos (la doc lo explica en repartitionByRange)" (src/assets/js/plan-ejecucion.js:63)
  Veredicto: impreciso
  Cita: "Due to performance reasons this method uses sampling to estimate the ranges. Hence, the output may not be consistent, since sampling can return different values. The sample size can be controlled by the config spark.sql.execution.rangeExchange.sampleSizePerPartition." — https://docs.databricks.com/aws/en/pyspark/reference/classes/dataframe/repartitionByRange · par Azure: https://learn.microsoft.com/azure/databricks/pyspark/reference/classes/dataframe/repartitionbyrange (el texto es idéntico; también en https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartitionByRange.html)
  Alcance: "this method" se refiere a `repartitionByRange`. La doc no explica el muestreo de `orderBy`, así que el paréntesis atribuye a la doc algo que no dice. `spark.sql.execution.rangeExchange.sampleSizePerPartition` no aparece en https://spark.apache.org/docs/latest/configuration.html. Solo se menciona en esa nota, así que no hay default que citar.
  Corrección: "Por el `orderBy`, Spark reparte por rangos (en el plan: `Exchange rangepartitioning`). La doc no describe cómo lo hace `orderBy`; para `repartitionByRange` dice que los rangos se estiman con una muestra. En el Spark UI ese muestreo puede verse como un job corto; la doc no lo dice."

- Afirmación: "vuelve a repartir las filas por rangos de la clave de orden (range partitioning)" (respuesta c y comentario de la opción a en src/assets/js/plan-ejecucion.js:270-280; src/assets/app.js:372 y la etiqueta `Exchange · range`; también src/shuffle.html:63 "orderBy global: Sí (por rangos)" y src/shuffle.html:21)
  Veredicto: sin fuente
  Cita: no hay frase oficial que una `orderBy`/`ORDER BY` con un shuffle ni con partición por rangos. Lo más cercano:
  - Databricks SORT BY: "This is different than the ORDER BY clause which guarantees a fully ordered output regardless of how Spark splits the data." — https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-qry-select-sortby · par Azure: https://learn.microsoft.com/azure/databricks/sql/language-manual/sql-ref-syntax-qry-select-sortby (texto idéntico). Dice que el orden no depende de cómo estén repartidos los datos, pero no dice cómo lo consigue.
  - PySpark `orderBy`/`sort`: solo "Returns a new DataFrame sorted by the specified column(s)." — https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.orderBy.html. La API de Scala solo añade "This is an alias of the sort function." — https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/Dataset.html
  - `OrderedRDDFunctions.sortByKey` dice "Sort the RDD by key, so that each partition contains a sorted range of the elements". Es API de RDD, y ninguna doc oficial dice que `orderBy` de DataFrame use ese mecanismo, así que añadir "(guía de RDD; el mecanismo es el mismo)" sería otra afirmación sin fuente. No recomiendo citarla.
  Alcance: general.
  Corrección: mantener la idea, pero presentarla como lo que se ve en el plan y no como algo documentado. Por ejemplo: "En `explain()` el `orderBy` global aparece como `Exchange rangepartitioning(...)`: un shuffle que reparte por rangos de la clave. La doc de ORDER BY solo garantiza el orden total; no describe el mecanismo." La nota "la doc no lo detalla" debe ir una sola vez, en la página dueña (shuffle.html o plan-ejecucion.html). Antes de publicar la salida de `explain()` hay que comprobarla ejecutando (ver abajo).

- Afirmación: "en spark.sql.shuffle.partitions particiones (200 por defecto)" (en el `orderBy`; src/assets/js/plan-ejecucion.js, respuesta c, "200 aquí"; src/assets/app.js:368-370, "200 tasks (o menos con AQE)")
  Veredicto: sin fuente (para `orderBy`). El default de 200 es correcto, pero la doc lo aplica a joins y agregaciones, no a ordenaciones.
  Cita:
  - "The default number of partitions to use when shuffling data for joins or aggregations." (default 200) — https://spark.apache.org/docs/latest/configuration.html
  - Databricks: "The default number of partitions to use when shuffling data for joins or aggregations. Setting the value `auto` enables auto-optimized shuffle, … Default value: 200" — https://docs.databricks.com/aws/en/optimizations/aqe · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe (texto idéntico)
  - Lo único que conecta rangos con `shuffle.partitions` está en la API de Scala, y es para `repartitionByRange` sin número: "Returns a new Dataset partitioned by the given partitioning expressions, using spark.sql.shuffle.partitions as number of partitions. The resulting Dataset is range partitioned." — https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/Dataset.html. PySpark solo dice "If not specified, the default number of partitions is used."
  Alcance: el default de 200 vale para Spark y para Databricks. Si la conf está en `auto` (auto-optimized shuffle), el número inicial no es 200.
  Corrección: "con `spark.sql.shuffle.partitions` particiones (200 por defecto), como el shuffle de un `groupBy`. Lo ves en `explain()`; la doc de esa conf solo nombra joins y agregaciones."

- Afirmación: "cada task ordena su rango y los rangos ya van en orden, de modo que el resultado queda ordenado globalmente sin juntar todo en una task" (respuesta c y comentario de la opción a, src/assets/js/plan-ejecucion.js:270-280)
  Veredicto: sin fuente
  Cita: ninguna página DataFrame/SQL/Databricks describe el Sort por partición después de un reparto por rangos. Lo único relacionado es que `repartitionByRange` no ordena: "Note, the rows are not sorted in each partition of the resulting Dataset." — https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/Dataset.html. Eso cuadra con que haga falta un `Sort` aparte en cada partición, pero no lo documenta para `orderBy`.
  Alcance: general.
  Corrección: si se mantiene, ponerlo como lectura del plan ("en el plan, después del `Exchange rangepartitioning` hay un `Sort` en cada partición") y comprobarlo con `explain()`.

- Afirmación: "Para decidir los rangos Spark toma una muestra." (para `orderBy`)
  Veredicto: sin fuente para `orderBy`. Para `repartitionByRange` es correcto (cita arriba).
  Corrección: "Para `repartitionByRange` la doc dice que Spark estima los rangos con una muestra; para `orderBy` no lo dice."

- Afirmación: "(antes de que AQE las una)" / "200 tasks (o menos con AQE)"
  Veredicto: correcto (unir particiones después de un shuffle es genérico, no depende del tipo de Exchange)
  Cita: "Dynamically coalesces partitions (combine small partitions into reasonably sized partitions) after shuffle exchange." — https://docs.databricks.com/aws/en/optimizations/aqe · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe. En Spark: "This feature coalesces the post shuffle partitions based on the map output statistics when both spark.sql.adaptive.enabled and spark.sql.adaptive.coalescePartitions.enabled configurations are true." — https://spark.apache.org/docs/latest/sql-performance-tuning.html
  Alcance: requiere AQE activo (activo por defecto en Databricks).

- Afirmación: "el resultado queda ordenado globalmente" (orderBy/ORDER BY global)
  Veredicto: correcto
  Cita: "Unlike the SORT BY clause, this clause guarantees a total order in the output." — https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-qry-select-orderby · par Azure: https://learn.microsoft.com/azure/databricks/sql/language-manual/sql-ref-syntax-qry-select-orderby (texto idéntico; también en https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-orderby.html)
  Alcance: Databricks SQL y Databricks Runtime.

## Redacción mínima con fuente para la respuesta de la predicción

Lo que se puede citar es: orden total garantizado + AQE une particiones después de un shuffle + la partición por rangos, el muestreo y el número de particiones documentados para `repartitionByRange`. El paso "orderBy = Exchange rangepartitioning con shuffle.partitions particiones" no tiene fuente. Para la opción c propongo:

"ORDER BY garantiza un orden total del resultado. En el plan, el `orderBy` aparece como un `Exchange rangepartitioning` sobre `count` con `spark.sql.shuffle.partitions` particiones (200 aquí, antes de que AQE las una), seguido de un `Sort`: cada task ordena su rango, y como los rangos van en orden, la tabla queda ordenada entera. La doc de ORDER BY no describe este mecanismo. El reparto por rangos con muestreo está documentado para `repartitionByRange`."

Fuentes para la sección Fuentes: Databricks ORDER BY + Azure, Databricks SORT BY + Azure, PySpark `repartitionByRange` (ya citado en plan-ejecucion.html:660; se puede añadir el par Databricks/Azure de esa página), Databricks AQE + Azure.

Hay un problema pedagógico más allá de lo factual: la respuesta correcta (200 tasks) depende entera de un mecanismo sin fuente. O se comprueba ejecutando y la página lo presenta como algo que se ve en el plan, o la pregunta se replantea para no depender de él. Esa decisión le corresponde a `pedagogo`.

## Para cerrar el hueco: comprobar ejecutando

Hace falta que el usuario elija un perfil de `.databrickscfg` (skill `databricks-execution-compute`; yo no elijo perfil). Con `explain()` bastaría, y también funciona en serverless/Free Edition. Por ejemplo:

```python
from pyspark.sql import functions as F
(spark.range(1_000_000).groupBy((F.col("id") % 1000).alias("k")).count()
   .orderBy("count").explain())
```

Hay que mirar si aparece `Exchange rangepartitioning(count ... , N)` con N = `spark.conf.get("spark.sql.shuffle.partitions")`, y un `Sort` por encima. Esto es una hipótesis a comprobar, no una cita. En serverless, la conf puede no valer 200 si está en `auto`; antes hay que leer su valor con `spark.conf.get`.

## Experto que cubre el tema

`experto-motor-spark` (plan-ejecucion, shuffle, stages, aqe).

## Archivos relacionados
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/plan-ejecucion.js (líneas 63 y 270-280)
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/app.js (líneas 365-372)
- /Users/hrpr/Documents/rote/spark-performance-lab/src/shuffle.html (líneas 21 y 63: la misma afirmación, sin fuente)
- /Users/hrpr/Documents/rote/spark-performance-lab/src/plan-ejecucion.html (línea 660: Fuentes, cita `repartitionByRange`)

## Búsquedas web (las páginas de terceros no sirven como fuente)
- [waitingforcode: Range partitioning in Apache Spark SQL](https://www.waitingforcode.com/apache-spark-sql/range-partitioning-apache-spark-sql/read): blog de terceros que muestra `Exchange rangepartitioning` en un sort global. No es oficial.
- [Databricks Community: orderBy only orders within partition](https://community.databricks.com/t5/data-engineering/pyspark-dataframes-orderby-only-orders-within-partition-when/m-p/106015): foro. No es oficial.
- [Cloudera Community: sort vs orderBy](https://community.cloudera.com/t5/Support-Questions/Spark-DataFrame-difference-between-sort-and-orderBy/m-p/225891): foro. No es oficial.
- [api-docs.databricks.com RangePartitioner](https://api-docs.databricks.com/scala/spark/latest/org/apache/spark/RangePartitioner.html): API de RDD. No vincula `orderBy` de DataFrame.
- [OrderedRDDFunctions (Spark Javadoc)](https://spark.apache.org/docs/3.5.1/api/java/org/apache/spark/rdd/OrderedRDDFunctions.html): `sortByKey` en RDD.
- [docs.databricks.com repartitionByRange (GCP)](https://docs.databricks.com/gcp/en/pyspark/reference/classes/dataframe/repartitionByRange)
- [GraySort on Apache Spark by Databricks (2014)](https://sortbenchmark.org/ApacheSpark2014.pdf): artículo de benchmark. No es documentación.