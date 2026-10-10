---
name: fuentes-oficiales
description: Reglas para verificar una afirmación técnica del manual contra la documentación oficial (Databricks con su par de Azure, Apache Spark, PySpark) y entregar el veredicto con la cita exacta. Úsala cuando haya que comprobar un default, un umbral, un límite de serverless o cualquier comportamiento de Spark o Databricks antes de escribirlo o darlo por bueno.
---

# Fuentes oficiales

Ningún dato técnico entra al manual de memoria. Cada afirmación lleva una URL oficial y la frase de esa página que la respalda.

## Dónde buscar, en este orden

1. **Databricks**: carga la skill `databricks-docs` y usa el índice `https://docs.databricks.com/llms.txt` para encontrar la página. Lee la página concreta, no el resumen del índice.
2. **Par de Azure**: toda página de docs.databricks.com tiene su equivalente en `learn.microsoft.com/azure/databricks/...`. Búscalo con `microsoft_docs_search` y léelo con `microsoft_docs_fetch`. Si la herramienta falla (ya ha fallado con error de schema), usa WebFetch o `curl` sobre la URL de Learn. Comprueba que el par existe y dice lo mismo; si difiere, repórtalo.
3. **Apache Spark**: `spark.apache.org/docs/latest/` (SQL guide, tuning, configuration, web UI, job scheduling, cluster overview).
4. **PySpark**: `spark.apache.org/docs/latest/api/python/` para la firma y las notas de cada método.

Si WebFetch trunca una página larga, descárgala con `curl -sL` y quita el HTML con un script en el directorio temporal del job; lee la sección que necesitas.

## Reglas

- **DataFrame y SQL, no RDD.** No cites la guía de RDD ni la API de RDD, salvo que el comportamiento sea de Spark Core y lo usen los DataFrames (mecánica del shuffle, una task por partición) y ninguna página de DataFrame, SQL o Databricks lo documente. En ese caso dilo junto al enlace: "(guía de RDD; el mecanismo es el mismo para DataFrames)".
- **Cita literal.** Copia la frase exacta en inglés. Si solo puedes parafrasear, no está verificado.
- **Alcance.** Anota a qué aplica: versión de Databricks Runtime, compute clásico, serverless, SQL warehouse, Free Edition. Un default de Spark open source puede no ser el default en Databricks; busca la página de Databricks antes de darlo por bueno.
- **Absolutos.** "Siempre", "nunca" o "por defecto" necesitan una fuente que lo diga así. Si la doc da excepciones (AQE, broadcast, serverless), nómbralas.
- **Sin fuente.** Si no encuentras la página, el veredicto es "sin fuente". No lo rellenes con lo que sabes.
- **Ejecutar para comprobar.** Si algo solo se puede ver ejecutando (cuántos stages salen, qué muestra `explain()`), puedes usar la skill `databricks-execution-compute`, pero solo con el perfil de `.databrickscfg` que el usuario elija. Nunca elijas un perfil tú.

## Veredicto por afirmación

```
- Afirmación: "<texto del manual>" (src/<slug>.html:<línea>)
  Veredicto: correcto | impreciso | falso | sin fuente
  Cita: "<frase exacta>" — <URL Databricks> · par Azure: <URL Learn>
  Alcance: <DBR / tipo de compute, si importa>
  Corrección: <texto propuesto en español, solo si no es "correcto">
```
