# Databricks notebook source
# MAGIC %md
# MAGIC # Shuffle y joins: experimentos pequeños
# MAGIC
# MAGIC Notebook del sitio **Spark Performance Lab**. Pensado para **serverless** (Free Edition incluida):
# MAGIC - Solo DataFrame API y SQL. Nada de RDD API ni `sparkContext`.
# MAGIC - Solo se toca `spark.sql.shuffle.partitions`, una de las seis propiedades de Spark que admite serverless (https://learn.microsoft.com/azure/databricks/spark/conf).
# MAGIC - En serverless no hay Spark UI. Para ver lo que pasó de verdad, bajo cada celda pulsa **See performance**, elige la instrucción y luego **See query profile** (https://learn.microsoft.com/azure/databricks/compute/serverless/notebooks#view-query-insights).
# MAGIC
# MAGIC **Qué vas a ver**
# MAGIC 1. Dónde aparece el shuffle (`Exchange`) en un plan.
# MAGIC 2. Por qué un `groupBy` con agregación parcial mueve muchas menos filas que una ventana.
# MAGIC 3. Broadcast join frente a sort merge join, forzados con hints.
# MAGIC 4. Qué muestra `explain()` con AQE y dónde ver el plan final.
# MAGIC
# MAGIC Los tiempos dependen del compute; los números que cite el sitio son ilustrativos.

# COMMAND ----------

# MAGIC %md
# MAGIC ## 0. Datos
# MAGIC - `hechos`: 20 M filas con una clave `k` de 1.000 valores (sin skew).
# MAGIC - `dim`: 1.000 filas, una por clave. Es la típica dimensión pequeña.

# COMMAND ----------

import time
from pyspark.sql import functions as F
from pyspark.sql.window import Window

hechos = (spark.range(20_000_000)
    .withColumn("k", (F.col("id") % 1000).cast("int"))
    .withColumn("monto", F.round(F.rand(seed=7) * 100, 2)))

dim = (spark.range(1000)
    .withColumnRenamed("id", "k")
    .withColumn("k", F.col("k").cast("int"))
    .withColumn("categoria", F.concat(F.lit("cat_"), (F.col("k") % 10).cast("string"))))

hechos.createOrReplaceTempView("hechos")
dim.createOrReplaceTempView("dim")

def medir(etiqueta, df, col):
    """Ejecuta una acción pequeña sobre df y devuelve los segundos que tardó.
    Usa la columna `col` a propósito: si la acción no la necesitara, el optimizador
    podría quitar del plan el cálculo que queremos medir (por ejemplo, la ventana)."""
    t0 = time.time()
    df.agg(F.max(col).alias("m")).collect()
    s = time.time() - t0
    print(f"{etiqueta}: {s:.1f} s")
    return s

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Encontrar el shuffle en el plan
# MAGIC `explain(mode="formatted")` imprime el plan físico. El shuffle aparece como un nodo **Exchange** (por ejemplo `Exchange hashpartitioning(k, ...)`).
# MAGIC En serverless el plan suele usar operadores de Photon, cuyo nombre lleva el prefijo `Photon`. **Verifica** los nombres exactos en tu salida: pueden variar según la versión.

# COMMAND ----------

por_clave = hechos.groupBy("k").agg(F.sum("monto").alias("total"))
por_clave.explain(mode="formatted")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Agregación parcial frente a ventana
# MAGIC En el plan anterior hay **dos** agregaciones alrededor del Exchange: una parcial antes (dentro de cada partición) y una final después.
# MAGIC Antes del shuffle, cada partición ya resumió sus filas a como mucho 1.000 (una por clave). Por la red viajan pocas filas.
# MAGIC
# MAGIC Una ventana con `partitionBy("k")` no puede resumir antes: necesita **todas** las filas de cada clave juntas. Por la red viajan las 20 M.
# MAGIC
# MAGIC Ejecuta las dos celdas y compara en el query profile las filas que entran al shuffle (métrica *Rows* del DAG).

# COMMAND ----------

medir("groupBy + sum (con parcial)", por_clave, "total")

# COMMAND ----------

w = Window.partitionBy("k")
con_ventana = hechos.withColumn("total_k", F.sum("monto").over(w))
con_ventana.explain(mode="formatted")
medir("ventana sum over (sin parcial)", con_ventana, "total_k")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Broadcast join frente a sort merge join
# MAGIC Con un lado pequeño, el optimizador suele elegir broadcast por su cuenta. Para comparar, forzamos cada estrategia con un **hint**:
# MAGIC - `broadcast(dim)` o `dim.hint("broadcast")`: se copia `dim` entera a cada executor. `hechos` no se mueve.
# MAGIC - `dim.hint("merge")`: sort merge join. Los dos lados se reparten por `k` (dos Exchange) y se ordenan.
# MAGIC
# MAGIC El hint `BROADCAST` se aplica sin importar `autoBroadcastJoinThreshold`, y si hay hints distintos en los dos lados gana `BROADCAST` sobre `MERGE` (https://learn.microsoft.com/azure/databricks/sql/language-manual/sql-ref-syntax-qry-select-hints). En serverless no puedes cambiar `spark.sql.autoBroadcastJoinThreshold`, así que los hints son tu herramienta.

# COMMAND ----------

j_broadcast = hechos.join(F.broadcast(dim), "k")
j_broadcast.explain(mode="formatted")   # busca BroadcastHashJoin y BroadcastExchange

# COMMAND ----------

j_merge = hechos.join(dim.hint("merge"), "k")
j_merge.explain(mode="formatted")       # busca SortMergeJoin con un Exchange en cada lado

# COMMAND ----------

medir("broadcast hash join", j_broadcast, "categoria")
medir("sort merge join", j_merge, "categoria")

# COMMAND ----------

# MAGIC %md
# MAGIC ### Lo mismo en SQL
# MAGIC Los hints van en un comentario justo después de `SELECT`.

# COMMAND ----------

spark.sql("""
  SELECT /*+ BROADCAST(d) */ d.categoria, sum(h.monto) AS total
  FROM hechos h JOIN dim d ON h.k = d.k
  GROUP BY d.categoria
""").explain(mode="formatted")

# COMMAND ----------

spark.sql("""
  SELECT /*+ MERGE(d) */ d.categoria, sum(h.monto) AS total
  FROM hechos h JOIN dim d ON h.k = d.k
  GROUP BY d.categoria
""").explain(mode="formatted")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. AQE: plan inicial y plan final
# MAGIC AQE está activo por defecto y en serverless no se puede configurar (sus propiedades no están en la lista de las seis que admite serverless: https://learn.microsoft.com/azure/databricks/spark/conf). Los planes con AQE tienen un nodo raíz `AdaptiveSparkPlan`.
# MAGIC
# MAGIC `explain()` **no ejecuta** la query, así que muestra el plan inicial (`isFinalPlan=false`). La doc lo dice para `SQL EXPLAIN`: el plan actual es siempre igual al inicial y no refleja lo que AQE acabará ejecutando (https://learn.microsoft.com/azure/databricks/optimizations/aqe#query-plans).
# MAGIC
# MAGIC Para ver qué cambió AQE, ejecuta la query y abre el **query profile**. Ahí ves, por ejemplo, el número real de particiones tras el shuffle (AQE junta particiones pequeñas) o si un sort merge join se convirtió en broadcast en runtime (umbral de AQE: 30 MB, `spark.databricks.adaptive.autoBroadcastJoinThreshold`).
# MAGIC
# MAGIC **Verifica** en tu workspace qué imprime `explain()` sobre un DataFrame ya ejecutado. Con Spark Connect (serverless) cada `explain()` vuelve a planificar en el servidor; no lo encontré documentado.

# COMMAND ----------

agg_sql = spark.sql("""
  SELECT d.categoria, sum(h.monto) AS total
  FROM hechos h JOIN dim d ON h.k = d.k
  GROUP BY d.categoria
""")
agg_sql.explain()      # AdaptiveSparkPlan isFinalPlan=false
agg_sql.collect()      # ahora sí se ejecuta: abre See performance → See query profile

# COMMAND ----------

# MAGIC %md
# MAGIC ### Particiones de shuffle: 200 frente a auto
# MAGIC `spark.sql.shuffle.partitions` sí se puede cambiar en serverless. Con `auto`, Databricks elige el número según el plan y el tamaño de entrada (auto-optimized shuffle).
# MAGIC Ejecuta las dos celdas y compara en el query profile cuántas tasks o particiones tiene la lectura del shuffle.

# COMMAND ----------

spark.conf.set("spark.sql.shuffle.partitions", "200")
medir("groupBy con 200 particiones", hechos.groupBy("k").agg(F.sum("monto").alias("total")), "total")

# COMMAND ----------

spark.conf.set("spark.sql.shuffle.partitions", "auto")
medir("groupBy con auto", hechos.groupBy("k").agg(F.sum("monto").alias("total")), "total")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Qué deberías sacar
# MAGIC - Cada `Exchange` es un shuffle: filas que se escriben, viajan por la red y se leen.
# MAGIC - Una agregación combinable (sum, count, max) resume antes del shuffle; una ventana no.
# MAGIC - Con una dimensión pequeña, el broadcast evita mover la tabla grande. El hint `BROADCAST` se aplica sin importar el umbral, pero se ignora si el tipo de join no admite hacer broadcast de ese lado (por ejemplo, el lado izquierdo de un `LEFT JOIN`).
# MAGIC - `explain()` enseña el plan inicial; el plan final de AQE se ve en el query profile después de ejecutar.
# MAGIC
# MAGIC Fuentes: https://learn.microsoft.com/azure/databricks/optimizations/aqe · https://learn.microsoft.com/azure/databricks/sql/language-manual/sql-ref-syntax-qry-select-hints · https://learn.microsoft.com/azure/databricks/sql/user/queries/query-profile
