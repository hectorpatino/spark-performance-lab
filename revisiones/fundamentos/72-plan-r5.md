# Plan ronda 5, Fundamentos

Informes: 61-junior-r5, 62-pedagogo-r5, 63-editor-r5, 64-experto-r5 (motor Spark), 65-observabilidad-r5, 66-plataforma-r5. En datos mandan 64, 65 y 66; úsalos tal cual (citas y URLs con par Azure).
Las decisiones marcadas [D1]…[D6] las fija el usuario; ver 73-reglas-r5.md.

## Hub (archivos compartidos; lo hace la sesión principal)
- glossary.json
  - Photon: texto de 66 P1 ("Motor de ejecución vectorizado… Activo en serverless y en los SQL warehouses. En el compute clásico (all-purpose y job compute), por defecto si lo creas desde la UI; con la Clusters API o la Jobs API (también bundles) hay que fijar `runtime_engine: PHOTON`. Catalyst sigue planeando la query; Photon la ejecuta.") Sin "siempre".
  - SQL warehouse: "Usa Photon siempre" → "Photon es su motor por defecto".
  - AQE: "Actúa en queries que no son streaming" → "Actúa en queries batch con al menos un exchange o una subquery" (64 §1).
  - job: añadir "No confundir con un job de Lakeflow Jobs: cada ejecución corre tu código, y cada acción lanza uno o más jobs de Spark." Quitar "(es lo que se observa; la doc no lo detalla)".
- app.js:314 (veredicto VACÍAS): "por defecto, salvo en streaming" → "por defecto en queries batch".
- _data/pages.yml:22 (joins): "Broadcast (hash y nested loop), sort-merge, shuffle hash y producto cartesiano: …" (cinco). Mismo texto en el description de joins.html:5 (lo hace el redactor de joins).
- aqe.html:99 (fuera de Fundamentos, dueña de AQE): añadir una vez "Desde DBR 18.0 también actúa, activado por defecto, en queries de streaming sin estado" con la cita de 64 §1 (stateless-streaming + Azure). Recibe además el bloque de query stages que sale de plan (ver plan-ejecucion).
- query-profile.html (dueña): recibe `COVERAGE_PHOTON` (cita de 65 P5) y la nota de "Execution Details" (nombre solo de la doc de Photon; en query profile las pestañas son Details, Top operators y Query text).
- check-guesses.js: contar también `#dag-guess` como predicción.

## arquitectura.html (dueña de Photon y del desplegable Spark Jobs)
1. Esencial: nueva viñeta "Este manual describe Spark sin Photon, el motor que Databricks activa en casi todo compute. Con Photon cambian los operadores del plan; qué ves: [#photon]". Quitar arquitectura.html:80-82 (varios jobs por acción).
2. li#photon: reescribir enablement con el texto de 66 P1 (UI vs Clusters/Jobs API, casilla *Use Photon Acceleration*). Añadir tabla corta "Qué cambia en lo que ves" SOLO con lo documentado (65 P1, 66 P4):
   - Joins: "Replaces sort-merge joins with high-performance hash joins".
   - Shuffle: "uses a redesigned columnar shuffle".
   - Spark UI (clásico): operadores de Photon en naranja, los de Spark en azul.
   - Query profile (warehouses y serverless): Photon en morado, estándar en gris.
   - Nombres de los nodos: la doc no los da (frase única en todo el manual; joins enlaza aquí).
   - Summary Metrics con Photon: la doc no las describe; compruébalo en tu stage.
   Y "Cómo saber si tu ejecución usó Photon": texto de 66 P2 (tarea en Runs → cluster; JSON del compute → `runtime_engine`; naranja en el Spark UI; serverless → query profile). Marcar lo no documentado (JSON de un job cluster ya terminado) con "Verifícalo".
3. Spark Jobs bajo la celda (337-339, 344-351): "al correr la celda de forma interactiva". Una vez: "La doc no dice si la salida de una ejecución de job terminada conserva el desplegable; si no está, usa la pestaña Jobs del Spark UI y compara horas" (65 P3).
4. "Con qué se confunde": el li "Scheduler de Spark vs programar un job" pasa a "Job de Lakeflow vs job de Spark" en 2-3 frases con las definiciones de 64 duda 4 (Lakeflow + Azure; Spark cluster-overview glossary) y "task de Lakeflow ≠ task de Spark". Es la dueña. [plan-ejecucion enlaza aquí]
5. Spark Connect y compute estándar (244-265): mover al final de "En Databricks" (detrás de serverless), sin cambiar contenido. [D6 si el usuario quiere sacarlo]
6. Nota "¿Ya tienes un job lento?": añadir "Si es un job programado que ya terminó, antes <a href="spark-ui.html#ejecucion-terminada">abre el Spark UI de esa ejecución</a>." (mismo texto en las 5 páginas).

## plan-ejecucion.html (dueña de particiones/auto, unidades, stage de 1 task, job vs acción)
1. Predicciones [D1]: quedan 3 = P1 (data-guess actual) + bhj + aggsort nueva. narrow, agg y smj pasan a ejemplos resueltos (resultado visible y línea "Qué mirar", textos de 62 §Simulador). P2 ("de 4 a 50") sale a "Para seguir explorando". aggsort nueva: pregunta 1 de 62 (respuesta c). Cambio en plan-ejecucion.js: entrada de Q sin `ans` muestra el resultado directo.
2. 88-89 (control del árbol): "**shuffle.partitions:** el valor de `spark.sql.shuffle.partitions`".
3. 238 título: "Cada `Exchange` de shuffle abre un stage, y el siguiente espera."
4. Esencial 31-33: quitar "También pueden influir [los cores] en cuántas particiones salen al leer".
5. #particiones (308-326): texto de 64 §3-4 (200 por defecto; serverless `auto`; DBR 19 desde la actualización del 21-sep-2026, al reiniciar, "auto-optimized shuffle v2"; la página de AQE aún dice 200). Añadir "`auto` activa *auto-optimized shuffle*" con cita. Añadir la línea `spark.conf.set("spark.sql.shuffle.partitions", "auto")` y `SET spark.sql.shuffle.partitions = auto;` (64 duda 1). Cómo ver la versión de DBR: texto de 66 P5 (pestaña Configuration / `spark_version`), sin system tables (sobra aquí).
6. 353-356 tabla pequeña: texto de 64 §11 ("puede hacer trozos de menos de 128 MB…, pero no hasta tener una task por core: también cuenta `openCostInBytes` (4 MB). La doc no da la fórmula; míralo en el stage"). 354 "en single node, los cores de la máquina" → quitar el inciso (64 §9).
7. Nota de unidades (357-361): darle `id="unidades"`.
8. li de stage largo de 1 task (605-614): `id="una-task"`; recibe de stages "Un stage de 1 task que dura segundos es normal: el final de un `count()` o una agregación que AQE unió".
9. AQE: definir en su primer uso (214) en una línea: "AQE (Spark vuelve a optimizar la query mientras corre, con los tamaños reales de cada shuffle; activo en Databricks)". Bloque 468-494 (cita de query stages, nota "la doc no lo detalla", truco de desactivar AQE) → a aqe.html (hub lo pega; el redactor de plan lo entrega en su informe con el texto exacto). li#varios-jobs (498-516) → texto de 63 §6. En la nota "la doc no lo detalla" que quede, añadir "ni el stage que lee la tabla copiada en un broadcast" (64 §7). Quitar "AQE solo actúa si…" del li.
10. "Con qué se confunde": entrada corta "Job de Lakeflow vs job de Spark" → enlace a arquitectura (dueña), 1 frase.
11. #donde-mirar (577): primera viñeta "Tu job programado ya terminó → abre el Spark UI de esa ejecución (spark-ui.html#ejecucion-terminada)". 593: desplegable "al correr la celda de forma interactiva" + enlace a arquitectura.
12. 537-540 `df.checkpoint()`: tampoco funciona en serverless (cita 64 Huecos, limitations#caching-limitations + Azure).
13. Fuentes 720-721: quitar el glosario de marketing de Catalyst o etiquetarlo fuera de las oficiales.
14. 502-503 AQE streaming → "queries batch" (64 §1).

## stages.html
1. Esencial 17-22: quitar la viñeta de `auto` (es remedio). Si queda algo, solo "múltiplo de los cores" (no añadir "llena la última wave").
2. P1 [D2]: sustituir por la pregunta 3 de 62 ("¿Cuándo empieza la task 17?", respuesta c) con su Compruébalo. P3: reordenar opciones (correcta en a). Respuestas c, b, a.
3. 142-144: añadir la espera por localidad (`spark.locality.wait`, 3 s) de 64 §13.
4. 348-350: "Empieza por `auto`… (qué valor tiene tu compute: plan-ejecucion.html#particiones)". Sin repetir defaults.
5. 374-383 → "Un stage largo con una sola task es el extremo: causas y cuándo es normal en plan-ejecucion.html#una-task". Borrar 442-443.
6. 46-50: quitar "*iterations* en la guía de 2023" (ya en Fuentes).

## shuffle.html
1. 105-107: texto de 64 §2 + enlace a plan-ejecucion.html#particiones.
2. 184-188: hash → "El plan lo muestra como `Exchange hashpartitioning(clave, n)`…" (64 §8), con etiqueta de la guía de RDD.
3. 189-197 Photon: texto de 66 P3 (sin "el reparto en stages no cambia"), enlace a arquitectura#photon.
4. 207-209 (memoria y spill): mover a la explicación de P3 (regala la opción c).
5. 17-19 y 205-206: AQE "queries batch" (64 §1).
6. 413 "razonamiento mío" → "razonamiento de este manual, no de la doc".
7. 280-282: unidad del límite del simulador (MiB) coherente con plan#unidades.

## joins.html
1. Esencial 17-18: quitar "(Databricks no documenta otro valor)". 29-30: texto positivo de 64 §6 (broadcast() y .hint() son APIs de Spark Connect).
2. Cajas "Verifícalo" 141-157 y 177-192 [D4]: un `<p class="c">` tras la lista de pasos (texto de 63 §4) + frase en Fuentes sobre lo que sale del código (`JoinSelection`). Borrar `SHUFFLE_REPLICATE_NL`, `maxShuffledHashJoinLocalMapThreshold`, `preferSortMergeJoin`.
3. 162-165 y 411-413 unidades → enlace a plan-ejecucion.html#unidades.
4. 168-171: "Con Photon puede salir otro nodo (ver #photon)".
5. #photon 235-262: reducir a un párrafo (63 §3) con enlace a arquitectura#photon; fuera la lista de query profile (va a query-profile.html) y la repetición "no cambia quién planea". 616-617: quitar la repetición.
6. 224 AQE streaming → batch.
7. 491-493 hints en serverless: texto de 64 §6.
8. 599-600 ANALYZE TABLE: enlazar a mantenimiento-delta.html#estadisticas.
9. 634-636 skew: "AQE puede partirla en joins con shuffle, con condiciones (ver AQE)".
10. 617-618 primera persona → "deducción de este manual, no de la doc".
11. 676-685 HISTORY_BASED_JOIN_STRATEGY: dejar una línea con enlace a query-profile.html.
12. description (línea 5): cinco estrategias, mismo texto que pages.yml.

## repaso-fundamentos.html / .js
1. R8 [D3]: versión INNER de 62 pregunta 2 (respuesta b).
2. Números Job/Stage [D5]: desplazar (stages 12-21, jobs 5-14, el stage lento 20 y su job 13; premisa "el compute ya había corrido otras celdas") en html y js; revisar toda referencia numérica cruzada.
3. E3 671-674 y E5 769-776: una línea + enlace a aqe.html (E5: ancla #why-didnt-aqe-detect-my-data-skew en el enlace a la doc).
4. 780-789 optimized writes: a diagnostico.html o fuera (no es Fundamentos). 825-828 `CustomShuffleReader`: "Nodo de lectura con *Coalesced*" + enlace.
5. Enlace a #ejecucion-terminada: solo 792-794 (quitar 633-634).
6. Paso 4 (625-627): desplegable Spark Jobs "en ejecución interactiva" + alternativa (pestaña Jobs y horas).
7. Stage 6 (433-435): "(su lectura sale en 2 tasks; cuántas salen de una tabla pequeña no lo fija la doc)".
8. Pregunta nueva opcional "¿Qué es cada Job N?" (62 pregunta 4) en el bloque 1 o 2.

## No se hace (sin fuente)
- Nombres de nodos de Photon, "las métricas se llaman igual con Photon", "el reparto en stages no cambia con Photon".
- Ejecutar en Databricks para verlo: solo si el usuario lo pide y elige perfil.
