# Databricks notebook source
# MAGIC %md
# MAGIC # Lab: provocar skew y verlo
# MAGIC
# MAGIC Notebook del sitio **Spark Performance Lab** (página *Lab*). Pensado para **Databricks Free Edition** o cualquier compute serverless.
# MAGIC
# MAGIC **Qué vas a hacer**
# MAGIC 1. Crear 20 M filas donde el 80% tiene `product_id = 100` (skew deliberado).
# MAGIC 2. Detectar la clave caliente contando filas.
# MAGIC 3. Ver un caso lento: una ventana sobre la clave caliente.
# MAGIC 4. Compararlo con una agregación combinable (agregación parcial).
# MAGIC 5. Aplicar salting en dos fases.
# MAGIC 6. Comprobar que cambiar `spark.sql.shuffle.partitions` no arregla el skew.
# MAGIC
# MAGIC **Base.** La idea de datos viene del notebook oficial *AQE Demo* (https://docs.databricks.com/aws/en/notebooks/source/aqe-demo.html), donde el item 100 está en el 80% de las ventas. No pude leer ese notebook celda por celda, así que esto es una adaptación.
# MAGIC
# MAGIC **Serverless.** En serverless solo se pueden cambiar seis propiedades de Spark: `spark.sql.shuffle.partitions`, `spark.sql.files.maxPartitionBytes`, `spark.sql.ansi.enabled`, `spark.sql.session.timeZone`, `spark.sql.legacy.timeParserPolicy` y `spark.databricks.execution.timeout` (https://learn.microsoft.com/azure/databricks/spark/conf). Por eso no apagamos AQE: buscamos un caso donde AQE no te salva y lo arreglamos a mano.
# MAGIC
# MAGIC **Cómo ver el perfil.** Bajo cada celda pulsa **See performance**, elige la instrucción y luego **See query profile** (https://learn.microsoft.com/azure/databricks/compute/serverless/notebooks#view-query-insights). En serverless no hay Spark UI.
# MAGIC
# MAGIC Los tiempos que veas dependen del tamaño del compute; los números del sitio son ilustrativos.

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Crear datos con skew deliberado
# MAGIC 20 M filas. Con probabilidad 0,8 el producto es el 100; el resto se reparte entre ~100.000 productos.
# MAGIC Las semillas fijas (`seed`) hacen que el resultado sea reproducible.

# COMMAND ----------

from pyspark.sql import functions as F
from pyspark.sql.window import Window

sales = (spark.range(20_000_000)
  .withColumn("product_id",
      F.when(F.rand(seed=1) < 0.8, F.lit(100))
       .otherwise((F.rand(seed=2) * 100_000).cast("int")))
  .withColumn("amount", F.round(F.rand(seed=3) * 100, 2)))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Detectar el skew sin UI
# MAGIC El método más simple: contar filas por la clave del join o de la agregación.
# MAGIC Esperado: `product_id = 100` con ~16 M filas; el resto con ~40 cada uno.

# COMMAND ----------

(sales.groupBy("product_id").count()
      .orderBy(F.desc("count"))
      .show(5))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Caso lento: ventana sobre la clave caliente
# MAGIC Un acumulado por producto obliga a ordenar juntas todas las filas de cada producto.
# MAGIC Las ~16 M filas del producto 100 van a una sola task, y AQE no parte ventanas (su manejo de skew es solo para joins de shuffle).
# MAGIC
# MAGIC Después de ejecutar, abre **See performance → See query profile**. Busca el operador de ventana o de sort y compara el tiempo de la task más lenta con el resto.

# COMMAND ----------

w = Window.partitionBy("product_id").orderBy("amount")
running = sales.withColumn("acumulado", F.sum("amount").over(w))
running.agg(F.max("acumulado")).collect()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Contraste: una agregación combinable no sufre igual
# MAGIC `max` se calcula primero dentro de cada partición y luego se combina (agregación parcial).
# MAGIC Antes del shuffle, la clave caliente ya quedó reducida a una fila por partición.
# MAGIC
# MAGIC Compara el tiempo con el paso 3. Si tu cálculo admite reescribirse como agregación combinable, hazlo. Un acumulado no lo admite; para eso existen el salting o rediseñar el cálculo.

# COMMAND ----------

top_agg = sales.groupBy("product_id").agg(F.max("amount").alias("max_amount"))
# La acción usa la columna agregada: con un count() el optimizador podría quitar el max() del plan.
top_agg.agg(F.max("max_amount")).collect()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Salting en dos fases
# MAGIC Se aplica a `max` solo para ver la mecánica:
# MAGIC - Fase 1: agrupa por `(product_id, salt)`. La clave caliente se reparte en `N` grupos.
# MAGIC - Fase 2: agrupa por `product_id` y combina los `N` resultados parciales.
# MAGIC
# MAGIC El detalle está en la página *Remedios* del sitio.

# COMMAND ----------

N = 16
salted = sales.withColumn("salt", (F.rand(seed=4) * N).cast("int"))
fase1 = salted.groupBy("product_id", "salt").agg(F.max("amount").alias("m"))
fase2 = fase1.groupBy("product_id").agg(F.max("m").alias("max_amount"))
fase2.agg(F.max("max_amount")).collect()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Opcional: jugar con particiones
# MAGIC Esta propiedad sí se puede cambiar en serverless. Repite el paso 3 con `200` y con `auto`, y confirma que **no** arregla el skew: la clave caliente sigue entera en una partición.

# COMMAND ----------

spark.conf.set("spark.sql.shuffle.partitions", "200")
running.agg(F.max("acumulado")).collect()

# COMMAND ----------

spark.conf.set("spark.sql.shuffle.partitions", "auto")
running.agg(F.max("acumulado")).collect()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Qué deberías sacar del lab
# MAGIC - La clave caliente decide el tiempo del stage.
# MAGIC - AQE solo parte el skew en joins de shuffle (sort merge y shuffle hash).
# MAGIC - Para ventanas o agregaciones sin parcial, la solución es cambiar el algoritmo o hacer salting.
# MAGIC
# MAGIC Fuente de las reglas de AQE: https://learn.microsoft.com/azure/databricks/optimizations/aqe
