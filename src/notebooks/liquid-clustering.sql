-- Databricks notebook source
-- MAGIC %md
-- MAGIC # Liquid clustering: ordenar los archivos para leer menos
-- MAGIC
-- MAGIC Notebook del sitio **Spark Performance Lab** (página *Liquid clustering*). Funciona en **Databricks Free Edition** (serverless o SQL warehouse).
-- MAGIC
-- MAGIC **Antes de empezar.** Todas las celdas usan `workspace.default`, el catálogo y schema por defecto de Free Edition. Si tu workspace usa otros, cambia `workspace.default` en todas las celdas (buscar y reemplazar).
-- MAGIC
-- MAGIC **Qué vas a hacer**
-- MAGIC 1. Crear una tabla de 20 M filas con `CLUSTER BY (cliente_id)`.
-- MAGIC 2. Compactar y clusterizar con `OPTIMIZE` y mirar el detalle de la tabla.
-- MAGIC 3. Lanzar un filtro por la clave y revisar en el query profile cuántos datos se descartan.
-- MAGIC 4. Cambiar las claves con `ALTER TABLE ... CLUSTER BY` y reclusterizar todo con `OPTIMIZE ... FULL`.
-- MAGIC 5. Pasar a `CLUSTER BY AUTO`.
-- MAGIC
-- MAGIC Fuentes: https://learn.microsoft.com/azure/databricks/tables/clustering · https://learn.microsoft.com/azure/databricks/tables/data-skipping

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 1. Crear la tabla con liquid clustering
-- MAGIC `CLUSTER BY (cliente_id)` define la clave de clustering. Los datos se generan con `range()`: ~10.000 clientes y 30 días.

-- COMMAND ----------

-- Cambia workspace.default por tu catálogo y schema si es distinto
CREATE OR REPLACE TABLE workspace.default.ventas_lc
CLUSTER BY (cliente_id) AS
SELECT id,
       CAST(rand() * 10000 AS INT)                          AS cliente_id,
       date_add('2026-01-01', CAST(rand() * 30 AS INT))     AS fecha,
       round(rand() * 100, 2)                               AS monto
FROM range(20000000);

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 2. OPTIMIZE y detalle de la tabla
-- MAGIC El clustering es incremental: `OPTIMIZE` reescribe solo lo que lo necesita.
-- MAGIC En `DESCRIBE DETAIL` mira `clusteringColumns` y `numFiles`.

-- COMMAND ----------

OPTIMIZE workspace.default.ventas_lc;

-- COMMAND ----------

DESCRIBE DETAIL workspace.default.ventas_lc;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 3. Un filtro por la clave
-- MAGIC Ejecuta la consulta y abre **See performance → See query profile**. En el resumen de la query, los iconos de filtro junto a algunas métricas indican el porcentaje de datos podados en el scan (https://learn.microsoft.com/azure/databricks/sql/user/queries/query-profile).
-- MAGIC
-- MAGIC **Verifica** el nombre exacto de las métricas de archivos leídos y descartados en tu workspace; no lo confirmé en la doc.

-- COMMAND ----------

SELECT sum(monto) FROM workspace.default.ventas_lc WHERE cliente_id = 4217;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 4. Cambiar las claves
-- MAGIC `ALTER TABLE ... CLUSTER BY` no reescribe nada todavía: solo cambia la clave para lo que venga.
-- MAGIC `OPTIMIZE ... FULL` (16.4 LTS o superior según la página de clustering, https://learn.microsoft.com/azure/databricks/tables/clustering#force-reclustering ; la referencia SQL de `OPTIMIZE` dice 16.0; y serverless) reclusteriza todos los datos existentes con las claves nuevas.

-- COMMAND ----------

ALTER TABLE workspace.default.ventas_lc CLUSTER BY (cliente_id, fecha);

-- COMMAND ----------

OPTIMIZE workspace.default.ventas_lc FULL;

-- COMMAND ----------

-- Repite el filtro y compara el query profile con el del paso 3
SELECT sum(monto) FROM workspace.default.ventas_lc WHERE cliente_id = 4217;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 5. Dejar que Databricks elija las claves
-- MAGIC `CLUSTER BY AUTO` funciona solo en tablas managed de Unity Catalog y necesita predictive optimization activado.
-- MAGIC Analiza el historial de queries de la tabla y cambia las claves si cambian los filtros.

-- COMMAND ----------

ALTER TABLE workspace.default.ventas_lc CLUSTER BY AUTO;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Limpieza (opcional)

-- COMMAND ----------

-- DROP TABLE workspace.default.ventas_lc;
