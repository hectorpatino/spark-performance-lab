-- Databricks notebook source
-- MAGIC %md
-- MAGIC # System tables: rendimiento y coste
-- MAGIC
-- MAGIC Notebook del sitio **Spark Performance Lab**. Ocho consultas para vigilar rendimiento y coste con las system tables de Unity Catalog.
-- MAGIC Los nombres de tablas y columnas están verificados en la documentación de Azure Databricks (octubre de 2026):
-- MAGIC - Query history: https://learn.microsoft.com/azure/databricks/admin/system-tables/query-history
-- MAGIC - Monitorizar queries de un SQL warehouse: https://learn.microsoft.com/azure/databricks/compute/sql-warehouse/monitor/queries
-- MAGIC - Jobs (`system.lakeflow`): https://learn.microsoft.com/azure/databricks/admin/system-tables/jobs
-- MAGIC - Billing: https://learn.microsoft.com/azure/databricks/admin/system-tables/billing
-- MAGIC - Compute: https://learn.microsoft.com/azure/databricks/admin/system-tables/compute
-- MAGIC
-- MAGIC ## Antes de ejecutar
-- MAGIC - **Acceso.** Por defecto solo pueden leer las system tables quienes son a la vez account admin **y** metastore admin. Los demás necesitan `USE CATALOG` en `system`, y `USE SCHEMA` y `SELECT` en cada schema (por ejemplo `system.query`, `system.lakeflow`, `system.billing`, `system.compute`). Pídeselo a tu admin. Doc: https://learn.microsoft.com/azure/databricks/admin/system-tables/
-- MAGIC - **Habilitación.** Las system tables se habilitan a nivel de cuenta (Enable system tables en la doc anterior). Si un schema no aparece, puede que no esté habilitado en tu cuenta.
-- MAGIC - **Free Edition.** La página de limitaciones de Free Edition no dice nada de las system tables (https://learn.microsoft.com/azure/databricks/getting-started/free-edition-limitations). **Verifica** en tu workspace si puedes leer `system.query.history` y `system.lakeflow.*`. Free Edition no tiene compute clásico, así que las consultas sobre `system.compute.clusters` (la 8) saldrán vacías.
-- MAGIC - **No es tiempo real.** Los datos se actualizan a lo largo del día. Query history y jobs suelen tardar hasta una hora; billing puede tardar más (la doc de billing habla de unas 12 horas).
-- MAGIC - **Texto de las queries.** `statement_text` devuelve `<REDACTED>` salvo que seas account admin o miembro del grupo `databricks_pii_access`.
-- MAGIC - **Filtra siempre por fecha.** Las consultas poco selectivas pueden fallar con `System Table query returned too much data`.
-- MAGIC
-- MAGIC ## Tres reglas que evitan resultados falsos
-- MAGIC 1. **Estados de resultado de jobs:** `SUCCEEDED`, `FAILED`, `SKIPPED`, `CANCELLED`, `TIMED_OUT`, `ERROR`, `BLOCKED`. No existe `SUCCESS` en `result_state` (ese valor es de `termination_code`). Query history y pipelines escriben `CANCELED` con una sola L.
-- MAGIC 2. **Runs largos se trocean.** En `job_run_timeline` cada fila cubre como máximo una hora y `result_state` solo viene en la fila final del run. Un run reparado (repair) tiene varias filas con `result_state`, una por intento. Para contar runs, filtra `result_state IS NOT NULL` y cuenta `COUNT(DISTINCT run_id)`, o quédate con la última fila de cada run (`period_end_time` más reciente). La doc usa `COUNT(*) - 1` sobre esas filas para contar reintentos (ejemplo "retried job runs" en https://learn.microsoft.com/azure/databricks/admin/system-tables/jobs).
-- MAGIC 3. **Tablas SCD2** (`jobs`, `job_tasks`, `pipelines`, `clusters`): primero quédate con la fila de `change_time` más reciente por entidad y **después** filtra `delete_time IS NULL`.

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 1. Las queries más lentas de los SQL warehouses, con su desglose
-- MAGIC `system.query.history` cubre SQL warehouses, notebooks y jobs serverless y pipelines de Lakeflow. **No** cubre compute clásico (all-purpose o jobs clusters).
-- MAGIC - `total_duration_ms`: tiempo total (sin contar la descarga del resultado).
-- MAGIC - `waiting_at_capacity_duration_ms`: tiempo en cola porque el warehouse estaba lleno.
-- MAGIC - `compilation_duration_ms` y `execution_duration_ms`: compilar y ejecutar.
-- MAGIC
-- MAGIC Para un warehouse concreto, cambia la condición por `compute.warehouse_id = '<id>'`.

-- COMMAND ----------

SELECT statement_id,
       executed_by,
       compute.warehouse_id,
       statement_type,
       execution_status,
       total_duration_ms,
       waiting_at_capacity_duration_ms,
       compilation_duration_ms,
       execution_duration_ms,
       read_rows,
       produced_rows,
       start_time,
       statement_text
FROM system.query.history
WHERE compute.warehouse_id IS NOT NULL
  AND start_time >= current_timestamp() - INTERVAL 1 DAY
ORDER BY total_duration_ms DESC
LIMIT 50;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 2. Queries que hacen spill a disco
-- MAGIC `spilled_local_bytes > 0` significa que la query no cupo en memoria. La recomendación de la doc para un warehouse es subir el **tamaño** (más memoria por query), o leer menos filas y columnas.
-- MAGIC Subir el número máximo de clusters no ayuda al spill: eso es para la cola (consulta 4).
-- MAGIC Doc de los insights: https://learn.microsoft.com/azure/databricks/sql/user/queries/performance-insights

-- COMMAND ----------

SELECT statement_id,
       executed_by,
       compute.warehouse_id,
       query_source.dashboard_id,
       spilled_local_bytes / (1024 * 1024) AS spilled_mb,
       read_bytes / (1024 * 1024)          AS read_mb,
       total_duration_ms,
       start_time,
       statement_text
FROM system.query.history
WHERE start_time >= current_timestamp() - INTERVAL 7 DAYS
  AND spilled_local_bytes > 0
ORDER BY spilled_local_bytes DESC
LIMIT 50;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 3. Data skipping: qué fracción de archivos se descartó
-- MAGIC `pruned_files` son los archivos que el scan descartó sin leer y `read_files` los que leyó. Si una query con un filtro muy selectivo descarta casi nada, la organización de los archivos no ayuda a ese filtro (revisa liquid clustering).
-- MAGIC La doc define el total de archivos de las tablas escaneadas como `read_files + pruned_files`; el porcentaje es cálculo nuestro sobre esas columnas.

-- COMMAND ----------

SELECT statement_id,
       executed_by,
       read_files,
       pruned_files,
       ROUND(100.0 * pruned_files / NULLIF(read_files + pruned_files, 0), 1) AS pct_archivos_descartados,
       read_rows,
       produced_rows,
       total_duration_ms,
       statement_text
FROM system.query.history
WHERE start_time >= current_timestamp() - INTERVAL 7 DAYS
  AND statement_type = 'SELECT'
  AND read_files > 1000
ORDER BY pct_archivos_descartados ASC, read_files DESC
LIMIT 50;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 4. Queries que esperaron en cola
-- MAGIC `waiting_at_capacity_duration_ms > 0` indica que el warehouse estaba al máximo de clusters. La recomendación de la doc es subir el número **máximo de clusters** del warehouse.

-- COMMAND ----------

SELECT compute.warehouse_id,
       date_trunc('HOUR', start_time)          AS hora,
       COUNT(*)                                AS queries_en_cola,
       ROUND(AVG(waiting_at_capacity_duration_ms) / 1000, 1) AS espera_media_s,
       ROUND(MAX(waiting_at_capacity_duration_ms) / 1000, 1) AS espera_max_s
FROM system.query.history
WHERE start_time >= current_timestamp() - INTERVAL 7 DAYS
  AND waiting_at_capacity_duration_ms > 0
GROUP BY ALL
ORDER BY queries_en_cola DESC
LIMIT 50;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 5. Tasa de éxito por job (últimos 30 días)
-- MAGIC Usa `SUCCEEDED` (no `SUCCESS`) y cuenta solo las filas con `result_state IS NOT NULL`.
-- MAGIC Un run reparado tiene una de esas filas por intento, así que el CTE `runs` se queda con la última por run (estado final) y se cuenta con `COUNT(DISTINCT run_id)`.
-- MAGIC Para el nombre del job, une con la fila más reciente de `system.lakeflow.jobs` (patrón SCD2).

-- COMMAND ----------

WITH latest_jobs AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, job_id ORDER BY change_time DESC) AS rn
  FROM system.lakeflow.jobs
  QUALIFY rn = 1
),
runs AS (
  SELECT workspace_id, job_id, run_id, result_state
  FROM system.lakeflow.job_run_timeline
  WHERE period_start_time >= current_date() - INTERVAL 30 DAYS
    AND result_state IS NOT NULL
  -- estado final de cada run: la fila con result_state más reciente (los repairs añaden filas)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY workspace_id, job_id, run_id ORDER BY period_end_time DESC) = 1
)
SELECT r.workspace_id,
       r.job_id,
       j.name,
       COUNT(DISTINCT r.run_id)                                    AS runs,
       SUM(CASE WHEN r.result_state = 'SUCCEEDED' THEN 1 ELSE 0 END) AS ok,
       SUM(CASE WHEN r.result_state IN ('FAILED', 'ERROR', 'TIMED_OUT') THEN 1 ELSE 0 END) AS fallidos,
       ROUND(100.0 * SUM(CASE WHEN r.result_state = 'SUCCEEDED' THEN 1 ELSE 0 END) / COUNT(DISTINCT r.run_id), 1) AS pct_exito
FROM runs r
LEFT JOIN latest_jobs j USING (workspace_id, job_id)
GROUP BY ALL
HAVING COUNT(DISTINCT r.run_id) >= 5
ORDER BY pct_exito ASC;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 6. Jobs que no se han ejecutado en 30 días (consulta de la doc)
-- MAGIC Ejemplo del patrón SCD2 bien hecho: primero la fila más reciente por job, después `delete_time IS NULL`. Si filtras `delete_time` en la misma lectura, obtienes el último estado de jobs ya borrados.

-- COMMAND ----------

WITH latest_jobs AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, job_id ORDER BY change_time DESC) AS rn
  FROM system.lakeflow.jobs
  QUALIFY rn = 1
),
latest_not_deleted_jobs AS (
  SELECT workspace_id, job_id, name, change_time, tags
  FROM latest_jobs
  WHERE delete_time IS NULL
),
last_seen_job_timestamp AS (
  SELECT workspace_id, job_id, MAX(period_start_time) AS last_executed_at
  FROM system.lakeflow.job_run_timeline
  WHERE run_type = 'JOB_RUN'
  GROUP BY ALL
)
SELECT t1.workspace_id,
       t1.job_id,
       t1.name,
       t1.change_time AS last_modified_at,
       t2.last_executed_at,
       t1.tags
FROM latest_not_deleted_jobs t1
LEFT JOIN last_seen_job_timestamp t2 USING (workspace_id, job_id)
WHERE t2.last_executed_at <= current_date() - INTERVAL 30 DAYS
   OR t2.last_executed_at IS NULL
ORDER BY last_executed_at ASC;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 7. Coste por run de job, a precio de lista (consulta de la doc)
-- MAGIC Une `system.billing.usage` con `system.billing.list_prices` usando el precio vigente en el momento del uso (no solo el precio actual).
-- MAGIC `usage_metadata.job_id` solo se rellena para jobs en job compute o serverless; los jobs en compute all-purpose no se pueden atribuir con exactitud.
-- MAGIC El resultado es coste a precio de lista en USD, no tu factura con descuentos.
-- MAGIC Es la query literal de la doc: une por `usage_start_time` y usa `pricing.default`. La página del sitio usa una variante (de *Monitor costs using system tables*) que une por `usage_end_time` y usa `pricing.effective_list.default`, el precio de lista efectivo que resuelve promociones. Las dos son válidas; los totales pueden diferir un poco.

-- COMMAND ----------

WITH jobs_usage AS (
  SELECT *,
         usage_metadata.job_id,
         usage_metadata.job_run_id AS run_id,
         identity_metadata.run_as  AS run_as
  FROM system.billing.usage
  WHERE billing_origin_product = 'JOBS'
    AND usage_date >= current_date() - INTERVAL 30 DAYS
),
jobs_usage_with_usd AS (
  SELECT jobs_usage.*,
         usage_quantity * pricing.default AS usage_usd
  FROM jobs_usage
  LEFT JOIN system.billing.list_prices pricing
    ON  jobs_usage.sku_name = pricing.sku_name
    AND pricing.price_start_time <= jobs_usage.usage_start_time
    AND (pricing.price_end_time >= jobs_usage.usage_start_time OR pricing.price_end_time IS NULL)
    AND pricing.currency_code = 'USD'
),
jobs_usage_aggregated AS (
  SELECT workspace_id, job_id, run_id,
         FIRST(run_as, TRUE)  AS run_as,
         sku_name,
         SUM(usage_usd)       AS usage_usd,
         SUM(usage_quantity)  AS usage_quantity
  FROM jobs_usage_with_usd
  GROUP BY ALL
)
SELECT t1.*,
       MIN(period_start_time)     AS run_start_time,
       MAX(period_end_time)       AS run_end_time,
       FIRST(result_state, TRUE)  AS result_state
FROM jobs_usage_aggregated t1
LEFT JOIN system.lakeflow.job_run_timeline t2 USING (workspace_id, job_id, run_id)
GROUP BY ALL
ORDER BY usage_usd DESC
LIMIT 100;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## 8. Jobs que corren en compute all-purpose (consulta de la doc)
-- MAGIC Un job en compute all-purpose suele costar más que en job compute y no se puede atribuir bien en billing.
-- MAGIC `system.compute.clusters` también es SCD2: se toma la fila más reciente por cluster. `cluster_source` `UI` o `API` identifica compute all-purpose.
-- MAGIC Esta tabla solo tiene compute clásico (all-purpose y jobs); no incluye serverless ni SQL warehouses. En Free Edition saldrá vacía.

-- COMMAND ----------

WITH clusters AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, cluster_id ORDER BY change_time DESC) AS rn
  FROM system.compute.clusters
  WHERE cluster_source = 'UI' OR cluster_source = 'API'
  QUALIFY rn = 1
),
job_tasks_exploded AS (
  SELECT workspace_id, job_id, EXPLODE(compute_ids) AS cluster_id
  FROM system.lakeflow.job_task_run_timeline
  WHERE period_start_time >= current_date() - INTERVAL 30 DAYS
  GROUP BY ALL
)
SELECT t1.*, t2.cluster_name, t2.owned_by, t2.dbr_version
FROM job_tasks_exploded t1
INNER JOIN clusters t2 USING (workspace_id, cluster_id)
LIMIT 50;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Siguiente paso
-- MAGIC - Para abrir el query profile de un `statement_id`: copia el id, ve a **Query History**, filtra por Statement ID y pulsa **See query profile** (https://learn.microsoft.com/azure/databricks/admin/system-tables/query-history).
-- MAGIC - Cualquiera de estas consultas puede alimentar una **SQL alert** (https://learn.microsoft.com/azure/databricks/sql/user/alerts/).
