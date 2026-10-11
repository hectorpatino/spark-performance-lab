## Informe del editor técnico, ronda 5: sección Fundamentos

No he editado nada. Lo que propongo se apoya en el informe del junior (`scratchpad/hub/61-junior-r5.md`), en la lectura completa de las seis páginas, en los simuladores (`app.js`, `plan-ejecucion.js`, `repaso-fundamentos.js`), en `glossary.json` y en `_data/pages.yml`. Los datos técnicos los comprobé contra la doc oficial: AQE, One Spark task, What is Photon?, Lakeflow Jobs (Databricks y su par de Azure en Learn) y Spark Tuning partitions.

**Convenciones mecánicas, sin fallos.** Todos los enlaces externos llevan `target="_blank" rel="noopener"`. Todas las citas de docs.databricks.com tienen su par `class="az"`. La guía de 2023 lleva la etiqueta una vez por página y una frase final en Fuentes (stages, shuffle, joins). La etiqueta de la guía de RDD está bien puesta (arquitectura, plan, shuffle, repaso).

**Lo que más pesa en esta ronda:** el número de predicciones en Plan de ejecución, las particiones por defecto y `auto`, Photon en Joins, y las ideas repetidas cuya página dueña está clara.

---

## Mapa

**arquitectura.html**
1. Qué problema resuelve · Dónde corre cada línea de tu notebook (33): `toPandas` frente a `write` en el mismo cluster.
2. Definiciones cortas · Quién hace qué (39): tabla con driver, SparkSession, scheduler, worker, executor y task.
3. Simulador · ¿Corre en el driver o en los executors? (62): números previos, P1 sobre `count()` y el simulador.
4. Cómo funciona por dentro · El recorrido de una acción (169): cinco pasos, más `display()`.
5. En Databricks · Cómo se traduce en tu compute (211): multinodo, single node, Photon, estado del driver, Spark Connect, compute estándar y serverless. Es la sección más pesada.
6. Con qué se confunde (281): worker frente a executor, scheduler frente a programar un job, cliente de Spark Connect.
7. Qué pasaría si (297): P2 sobre `toPandas` de 50 filas, `collect` grande y bucle de Python.
8. Dónde mirar · En tu job (335): *Spark Jobs* bajo la celda, OOM del driver y serverless.
9. Fuentes (364).

**plan-ejecucion.html**
1. Qué problema resuelve · Saber de dónde sale cada fila del Spark UI (40).
2. De lo grande a lo pequeño · Qué crea cada job, stage y task (46): tabla, notebook inicial, dos predicciones y el simulador de árbol.
3. Cómo funciona por dentro · De la acción a las tasks (227): narrow, `Exchange` y una task por partición.
4. Simulador · Cuántos stages tiene cada query (253): cinco preguntas dentro del simulador.
5. Concepto clave · De dónde sale cada partición (283): tabla, valor por defecto de las particiones de shuffle, cómo leer una conf, lectura, unidades, `repartition` y `coalesce`.
6. Cómo se usa · Leer el plan con explain() (386): plan de ejemplo, modos, `count()` en dos pasos y el ejemplo de Job 14/15.
7. Con qué se confunde (496): job frente a acción, partición de Spark frente a partición de tabla, transformación frente a acción, skipped.
8. Qué pasaría si (547): `count()` antes del write, `cache()` y filtros encadenados.
9. Dónde mirar · Del job lento a la celda que lo lanzó (575).
10. Fuentes (620).

**stages.html**
1. Qué problema resuelve · Entender por qué el cluster no va más rápido (33).
2. Definiciones cortas · Dónde corren las tasks (40): core y wave.
3. Simulador 1 · Cómo reparte el scheduler las tasks de un stage (56), con P1.
4. Idea mental · Una cocina… (127).
5. Cómo funciona por dentro · De las tasks a las waves (135).
6. Simulador 2 · Cuánto dura un stage según tasks y cores (150), con P2.
7. Simulador 3 · Varios stages en el tiempo (243).
8. Simulador 4 · ¿Vale la pena añadir workers? (284), con P3.
9. Reglas prácticas · Cuántas tasks pedir según los cores (343): `auto`, número a mano, 1 task y UDF.
10. Con qué se confunde (396).
11. Qué pasaría si (406).
12. Dónde mirar · Tasks, cores y waves de tu job en el Spark UI (415).
13. Fuentes (449).

**shuffle.html**
1. Qué problema resuelve · Las filas de una clave están desperdigadas (39), más la definición.
2. Cuándo hay shuffle y cuándo no (51).
3. Idea mental · Una oficina de correos (82).
4. Simulador · Un shuffle paso a paso (89): tabla M/R, P1 y simulador.
5. Cómo funciona por dentro · Qué escribe el lado map y qué lee el lado reduce (182), con la nota de Photon.
6. Simulador · Cuánto ahorra la agregación parcial (217), con P2 y P3.
7. Dónde verlo · Qué métricas del Spark UI miden el shuffle (327).
8. Con qué se confunde (392).
9. Qué pasaría si (410).
10. Dónde mirar · En tu job (418).
11. Fuentes (434).

**joins.html**
1. Qué problema resuelve · Las filas con la misma clave tienen que encontrarse (47).
2. Definición corta · Cinco estrategias físicas (56).
3. Idea mental · Cruzar una lista corta con un archivo enorme (96).
4. Cómo funciona por dentro · Cómo decide Spark antes de ejecutar (109): tabla de lados, dos cajas "Verifícalo", pasos y hints.
5. En runtime · Qué cambian AQE y Photon al ejecutar (213), con la caja de Photon.
6. Simulador · Qué estrategia sale según tamaños, tipo de join y hints (264), con P1 y P2.
7. Cómo se usa · Hints, umbrales y cómo comprobarlo (431).
8. Cuando el join multiplica filas · Exploding joins (501), con P3.
9. Joins sin igualdad · Los joins por rango… (573).
10. Cuándo usar cada una (588).
11. Con qué se confunde (620).
12. Qué pasaría si (643).
13. Dónde mirar (663).
14. Fuentes (694).

**repaso-fundamentos.html**
1. Repaso · 1 · Predecir qué acelera un job… (32): R1 a R4.
2. Repaso · 2 · Interpretar un stage lento, un shuffle y un join (230): R5 a R8.
3. Ejercicio · 1 · Encontrar el stage que domina (427): E1.
4. Ejercicio · 2 · Del stage lento a la línea de código (508): pasos 1 a 4 y E2.
5. Ejercicio · 3 · Por qué tarda el stage y qué join salió (636): E3, E4, E5 y la nota de *optimized writes*.
6. Para tu job · Dónde ves en el Spark UI cada idea (791).
7. Fuentes (833).

---

## Hallazgos (de más a menos importante)

### 1. ALTO · Plan de ejecución tiene 7 preguntas, y 4 se contestan con texto anterior
- **Dónde:**
  - src/plan-ejecucion.html:102-170: dos `data-guess`.
  - src/plan-ejecucion.html:253-279 y src/assets/js/plan-ejecucion.js:266-285: cinco preguntas en `#dag-guess`.
  - src/plan-ejecucion.html:88-89.
- **Qué pasa:**
  - CLAUDE.md permite como mucho 3 por página. El simulador "Cuántos stages" no usa `data-guess`, así que `check-guesses.js` no lo cuenta, pero el lector ve siete.
  - *narrow* se contesta con el bloque esencial (23-25, "varias seguidas van en el mismo stage") y con el `ttl` "80 particiones".
  - *agg* se contesta con 88-89 y con la explicación de la P1 (136-137).
  - *smj* se contesta con esa misma explicación (136-137).
  - *aggsort* se contesta con el esencial (26, `orderBy` entre las wide).
  - Además, dos opciones correctas llevan la explicación dentro, cosa que la skill `pedagogia` no permite. Una es *agg* c, "200 tasks, las de `shuffle.partitions`". La otra es *aggsort* a, "3: el `orderBy` añade otro shuffle, por rangos".
  - La P2 ("de 4 a 50") también queda regalada en parte. 88-89 dice que el control fija "las tasks del stage que viene después de un shuffle por clave (`groupBy`, `join`, `orderBy`)", y `count` no está en la lista.
- **Propuesta (la concreta `pedagogo`):**
  - En el simulador, *narrow*, *agg* y *smj* pasan a ser de observar, sin pregunta: solo el botón "Ver el resultado en el Spark UI". Queda una sola pregunta, *bhj*: es la única que el junior falló y la única que nada anterior responde. Con ella la página tiene 3 predicciones.
  - Si `pedagogo` prefiere conservar *aggsort*, reescribir sus opciones sin la explicación dentro (por ejemplo "a) 3 stages", "b) 2 stages", "c) 2 stages y el orden lo hace el driver") y quitar una de las dos `data-guess`.
  - Cambiar 88-89 por "**shuffle.partitions:** en cuántas particiones reparte un shuffle; cuáles lo usan, en <a href="#particiones">De dónde sale cada partición</a>". Así la P2 vuelve a preguntar si el `count()` también lo usa. El comentario de la opción b ya explica el error.
- **Comprobación de predicciones:** el cambio solo quita pistas. *bhj* sigue sin respuesta previa: 394-396 y 423-426, que la explican, van después.

### 2. ALTO · Particiones de shuffle por defecto y `auto`: una contradicción, tres copias y falta una frase en la página dueña
- **Dónde:**
  - src/shuffle.html:104-108: "o las que elija Databricks si no fijas un número".
  - src/stages.html:17-22 (esencial, "prueba primero `auto`") y 348-350 ("valor por defecto en serverless y desde DBR 19").
  - src/plan-ejecucion.html:308-346 (dueña).
- **Qué pasa:**
  - Shuffle omite la condición de DBR 19 y parece que siempre es así.
  - Stages repite el valor por defecto que ya da Plan.
  - El esencial de Stages recomienda un remedio (`auto`) que no explica y manda a otra sección.
  - Ninguna página dice que `auto` y *auto-optimized shuffle* son lo mismo.
- **Propuesta:**
  - **plan-ejecucion.html:313-315** (dueña): tras "se usa *auto-optimized shuffle*", añadir: "Es lo mismo que fijar el valor `auto`: <q>Setting the value auto enables auto-optimized shuffle</q> (doc de AQE, mismo enlace)." Dejar la línea de código en remedios.html#auto, que ya la tiene en la línea 60 y ya enlaza aquí.
  - **shuffle.html:104-108:** "Una por partición del shuffle (<code>spark.sql.shuffle.partitions</code>; cuántas salen por defecto y qué hace <code>auto</code>: <a href="plan-ejecucion.html#particiones">Plan de ejecución</a>). AQE puede unirlas después (…)".
  - **stages.html:17-22:** "Si fijas a mano las particiones del shuffle, usa un múltiplo de los cores totales (guía…, eBook…). Antes, prueba a dejar que Databricks elija: <a href="#cuantas-tasks">Cuántas tasks pedir</a>."
  - **stages.html:348-350:** "<b>Empieza por <code>auto</code>.</b> Con <code>auto</code>, Databricks elige el número (qué valor tiene tu compute por defecto: <a href="plan-ejecucion.html#particiones">…</a>). La guía del Spark UI lo recomienda…".
- **Fuente:** "Setting the value auto enables auto-optimized shuffle, which automatically determines this number based on the query plan and the query input data size… Default value: 200". Está en https://docs.databricks.com/aws/en/optimizations/aqe#enable-auto-optimized-shuffle y su par https://learn.microsoft.com/azure/databricks/optimizations/aqe#enable-auto-optimized-shuffle.
- **Comprobación de predicciones:** el esencial de Stages conserva "múltiplo de los cores" tal como está. No añado "llena la última wave", que regalaría la P2 de Stages (4, 5 u 8 tasks).
- **Abierto:** el junior pregunta cómo ver la versión de DBR de su compute. Si se añade, que `experto-plataforma` dé la fuente.

### 3. ALTO · Photon en Joins: repite Arquitectura, adelanta el query profile y no dice qué verá el lector; el glosario contradice a Arquitectura
- **Dónde:**
  - src/joins.html:168-171, 235-262 y 616-617: "no cambia quién planea…" y "replaces sort-merge…" salen tres veces en la misma página. La idea general es de arquitectura.html:231-233.
  - src/joins.html:243-248: *Execution Details*, morado/gris y `COVERAGE_PHOTON`. Su página dueña es query-profile.html:124-127, de otra sección.
  - src/assets/glossary.json:141: "Activo por defecto en el compute clásico y siempre en serverless".
  - src/arquitectura.html:226-241: la frase clave, "Este manual describe el motor de Spark sin Photon", está enterrada a mitad de un párrafo de 7 frases.
- **Propuesta:**
  - **joins.html:235-262** se reduce a: "<b>Con Photon.</b> Qué es Photon, si tu compute lo usa y cómo ver qué operadores corrieron en él: <a href="arquitectura.html#photon">Arquitectura · Photon</a>. En los joins, la doc dice que Photon <q>replaces sort-merge joins with high-performance hash joins</q>. Por eso, donde esta página predice <code>SortMergeJoin</code>, tu plan puede mostrar otro nodo de join, y la doc no da sus nombres. Qué lado se puede copiar y si cabe en el umbral se sigue decidiendo al planear (What is Photon? + Azure)."
    - Se quita la lista de query profile. Queda en query-profile.html, que es su dueña.
    - La última frase es una consecuencia de "Catalyst still plans your query". **Que lo verifique `experto-motor-spark`**: el junior pide "qué veré" y la doc no lo documenta.
  - **joins.html:168-171:** "…<code>SortMergeJoin</code> en el plan de Spark. Con Photon puede salir otro nodo (ver <a href="#photon">Con Photon</a>)."
  - **joins.html:616-617:** quitar "Photon no cambia quién planea la query…" y dejar "(ver <a href="#photon">Con Photon</a>)".
  - **arquitectura.html:226:** abrir el `li` con la frase en negrita "<b>Photon ejecuta casi todo en Databricks, y este manual describe Spark sin Photon.</b>" y borrarla de 233.
  - **glossary.json:141:** "Motor de ejecución vectorizado de Databricks, compatible con las APIs de Spark. Activo en serverless y en los SQL warehouses; en el compute clásico, por defecto si lo creas desde la UI (con la Clusters API o la Jobs API hay que activarlo). Catalyst sigue planeando la query."
- **Fuente:** https://docs.databricks.com/aws/en/compute/photon y su par https://learn.microsoft.com/azure/databricks/compute/photon. Las frases que lo respaldan:
  - "Photon is enabled on serverless compute, SQL warehouses, and serverless Lakeflow pipelines."
  - "If you create these resources using the Clusters API or Jobs API, you must explicitly enable Photon by setting runtime_engine to PHOTON."
  - "The Apache Spark query optimizer (Catalyst) still plans your query, but Photon takes over at the execution layer."
- **Comprobación de predicciones:** P1 y P2 de Joins dan el caso sin Photon (266). El nuevo texto no dice qué lado se copia ni en qué caso, así que no regala ninguna. Revisor del tema: `experto-plataforma` (Photon).

### 4. MEDIO · Joins: las cajas "Verifícalo" con código fuente de Spark y una salvedad repetida tres veces
- **Dónde:**
  - src/joins.html:141-157 y 177-192: `JoinSelection`, `SparkStrategies.scala`, `SHUFFLE_REPLICATE_NL`, `maxShuffledHashJoinLocalMapThreshold` y `preferSortMergeJoin` "de pasada".
  - "Databricks no documenta otro valor" sale en 17-18, 187-188 y 445-446.
  - "La doc de serverless no prohíbe los hints" sale en 29-30 y 491-493.
- **Qué pasa:**
  - Dos cajas de 7 líneas en mitad de la explicación mezclan citas oficiales con referencias al código. El junior "se pierde por completo".
  - `SHUFFLE_REPLICATE_NL` ni siquiera está en los botones del simulador.
  - La salvedad del umbral debería salir una vez, en su página dueña (#umbrales).
  - La doble negación sobre los hints en serverless no deja claro si funcionan, y además se repite.
- **Propuesta:**
  - Sustituir las dos cajas por un solo `<p class="c">` tras la lista de pasos (176): "La doc no publica esta tabla ni el orden de los pasos. Lo que sí dice: que una estrategia <q>might not support all join types</q> (Hints + Azure) y que <q>the left relation of a LEFT OUTER JOIN cannot be broadcast</q> (FAQ de AQE + Azure). El resto sale del código de Spark, y el simulador lo sigue. Compruébalo en tu plan con <code>explain()</code>."
  - Pasar a una frase final de Fuentes, fuera de las fuentes oficiales, lo que viene del código: "la tabla de lados, el orden de los pasos 2 y 3, que gane el lado más pequeño y el broadcast forzado sin igualdad salen del código de Spark (`JoinSelection`)."
  - Borrar las menciones a `SHUFFLE_REPLICATE_NL`, `maxShuffledHashJoinLocalMapThreshold` y `preferSortMergeJoin`.
  - Esencial 17-18: quitar "(Databricks no documenta otro valor)", que ya está en #umbrales.
  - Esencial 29-30: quitar la frase de serverless.
  - 491-492: "Los hints se escriben igual en serverless: la doc de serverless no los menciona entre sus limitaciones."
- **Nota:** CLAUDE.md exige doc oficial. Lo que viene del código se queda como salvedad declarada, una sola vez.
- **Comprobación de predicciones:** P2 (`clientes_vip LEFT JOIN ventas`) va después de la tabla de lados, que no cambia. No se añade nada nuevo antes de las preguntas.

### 5. MEDIO · Contradicciones pequeñas entre páginas, con un simulador y con las unidades
- **(a) Unidades.** La página dueña es plan-ejecucion.html:357-361.
  - joins.html:162-165 la repite casi palabra por palabra, y joins.html:411-413 la repite otra vez.
  - Propuesta: dar `id="unidades"` a la nota de Plan.
  - joins:162-165 queda en "El default de Spark es 10 MB (10 MiB; ver <a href="plan-ejecucion.html#unidades">unidades</a>). Si un lado cabe…".
  - joins:411-413 queda solo en "Los tamaños salen en MiB, como en el Spark UI."
  - shuffle.html:280-282: "Ese límite toma el extremo alto de los 128–200 MB por task…". El simulador usa 200 MiB y la guía habla de MB.
- **(b) Tabla pequeña.** plan-ejecucion.html:353-356 dice "Spark hace trozos de menos de 128 MB para acercarse a ese mínimo". Con eso el junior esperaba unas 32 tasks, pero repaso-fundamentos.js:27 lee 8 MiB en 2 tasks.
  - La doc no da el algoritmo y define `minPartitionNum` como "suggested (not guaranteed)".
  - Propuesta: "Con una tabla pequeña, Spark puede hacer trozos de menos de 128 MB para acercarse a ese mínimo, pero no lo garantiza: una tabla de pocos MB puede salir en muy pocas tasks."
  - El 2 del Repaso cuadra con `spark.sql.files.openCostInBytes` (4 MB), pero la doc no lo explica así. **Que lo verifique `experto-motor-spark`.**
- **(c)** plan-ejecucion.html:238, título del paso 3: "Cada <code>Exchange</code> abre un stage" choca con 423-426 (`BroadcastExchange` no corta). Propuesta: "Cada <code>Exchange</code> de shuffle abre un stage, y el siguiente espera." No regala *bhj*: su lección es el stage extra que lee la tabla copiada, y eso no se dice antes.
- **(d)** joins.html:56 dice "Cinco estrategias", y src/_data/pages.yml:22 y joins.html:5 nombran cuatro. Propuesta para los dos: "Broadcast, sort-merge, shuffle hash y joins sin igualdad (nested loop y producto cartesiano): …".
- **Fuente de (b):** "The suggested (not guaranteed) minimum number of split file partitions" y la definición de `openCostInBytes` en https://spark.apache.org/docs/latest/sql-performance-tuning.html#tuning-partitions. Las unidades: "1m or 1mb (mebibytes = 1024 kibibytes)" en https://spark.apache.org/docs/latest/configuration.html#spark-properties.

### 6. MEDIO · Ideas repetidas con dueño claro: stage largo de 1 task, query stages y detalles de AQE
- **Stage largo de 1 task.** La dueña es plan-ejecucion.html:605-614, que tiene la lista de causas.
  - Se repite en stages.html:26-27 (esencial: puede quedarse, es repetición deliberada), stages.html:374-383 (cita y "1 task de segundos es normal"), stages.html:442-443 y repaso:675-681 (la misma cita por tercera vez).
  - Propuesta: dar `id="una-task"` al `li` de Plan y mover allí, desde stages:380-383, "Un stage de 1 task que dura segundos es normal: el final de un `count()` o una agregación que AQE unió."
  - stages:374-383 queda en "**Un stage largo con una sola task** es el extremo: causas y cuándo es normal en <a href="plan-ejecucion.html#una-task">Plan de ejecución</a>."
  - Borrar stages:442-443.
  - Repaso:675-681 sin la cita: "…no es el stage largo de una task del que avisa la guía (ver <a href="plan-ejecucion.html#una-task">…</a>)".
  - Cita verificada: "If you see a long-running stage with just one task, that's likely a sign of a problem" (https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/one-spark-task y su par de Azure).
- **Query stages.** plan-ejecucion.html:468-475 ya explica que AQE re-optimiza al final de cada shuffle, y li#varios-jobs (498-516) lo vuelve a contar. Además repite la salvedad "la doc no dice cómo se reparten", que ya está en 490-494 (CLAUDE.md: la salvedad va una vez).
  - Propuesta para el `li`: "**Job vs acción.** Cada acción da una query, que ves en la pestaña SQL / DataFrame. En la pestaña Jobs puede salir como varios jobs: AQE la ejecuta por tramos (ejemplo en <a href="#count-dos-jobs">Leer el plan</a>), y un broadcast o el muestreo de un <code>orderBy</code> pueden lanzar jobs propios. Por eso no deduzcas los stages de una acción contando jobs: abre su query, que lista <q>the jobs and stages associated with it</q> (Web UI), y cuenta los que no estén <i>skipped</i>. Para encontrar lo lento, sí ordena los jobs por duración (<a href="#donde-mirar">Dónde mirar</a>)."
  - "AQE solo actúa si…" sale del `li`: ya lo tienen aqe.html y el glosario.
- **Detalles de AQE fuera de su página.** joins.html:634-636 (5 veces la mediana y 256 MB) repite aqe.html:15 y 71. Propuesta: "AQE puede partirla en joins con shuffle, con condiciones (ver <a href="aqe.html">AQE</a>)".

### 7. MEDIO · Repaso: la regla del LEFT se pregunta tres veces, las explicaciones adelantan AQE y Job 8 coincide con Stage 8
- **Dónde:**
  - repaso-fundamentos.html:381-425 (R8) es la misma estructura que joins P2 (311-356): tabla pequeña a la izquierda de un LEFT y la otra enorme.
  - E5 (728-778) vuelve a pedir la misma regla.
  - Las explicaciones de E3 (671-674, `minPartitionSize` de 1 MB) y E5 (769-776, "only skew on the left side") traen detalles de AQE cuya página dueña es aqe.html:92-120.
  - 526-538 y repaso-fundamentos.js:3, 70, 84-96: "Pulsas el 8… Job 8" con el Stage 8. El junior dedujo que el ID del job es el del stage, y no lo es.
- **Propuesta:**
  - E5 se queda: es la regla aplicada al leer un DAG real.
  - R8 pasa a otra idea de Joins que ninguna pregunta use todavía. Por ejemplo: "un join multiplica filas ×50; alguien pone `broadcast()`; ¿qué baja?", con la correcta "el shuffle de entrada del lado grande, no las filas de salida". **Lo diseña `pedagogo`.** Alternativa mínima: espejo con `RIGHT JOIN`, que pide aplicar el principio y no memorizar "LEFT → izquierda".
  - E3, 671-674: "El Stage 9 tiene 1 task porque AQE unió las 200 particiones pequeñas del shuffle del `groupBy`, que suman 210 KiB (cómo: <a href="aqe.html#otras-funciones">AQE</a>). Dura 1 s…".
  - E5, 769-776: "Esto también explica que AQE no partiera el skew de E4: en un `LEFT OUTER`, AQE no parte el lado derecho (tabla en <a href="aqe.html">AQE</a>). Qué hacer entonces: Remedios." Se quita la cita.
  - Cambiar el número del job a, por ejemplo, **Job 5** en repaso-fundamentos.html:526-527 y 538 y en repaso-fundamentos.js:3, 70, 84, 87, 95 y 96. Es coherente: la celda 4 empieza en el Stage 4 y AQE la parte en varios jobs.
  - Repaso enlaza dos veces a #ejecucion-terminada (633-634 y 792-794). Basta con 792-794.
- **Fuente:** "in a LEFT OUTER JOIN, only skew on the left side can be optimized" y "minPartitionSize… Default value: 1MB" (https://docs.databricks.com/aws/en/optimizations/aqe y su par de Azure). No hay dato nuevo, solo se mueve.
- **Comprobación de predicciones:** el nuevo R8 no puede responderse con R1-R7. Hay que vigilar que R6 (filas multiplicadas en el shuffle) no le dé la respuesta. Si se elige el caso del broadcast, que pregunte por el shuffle de entrada y no por las filas.

### 8. MEDIO · Términos y enlaces: "job" con dos sentidos, Spark UI de una ejecución terminada, AQE sin definir y ANALYZE TABLE
- **Job de Lakeflow frente a job de Spark.** Ninguna página los separa, y "task" también choca.
  - arquitectura.html:286-292 contesta una duda que el lector no tiene (scheduler frente a programar).
  - Propuesta para ese `li`: "<b>Job de Lakeflow vs job de Spark.</b> Un job de Lakeflow Jobs es lo que programas: <q>a job is used to schedule and orchestrate tasks</q> (Lakeflow Jobs + Azure). Sus tasks (un notebook, un pipeline…) no son tasks de Spark. Cada ejecución corre tu notebook, y cada acción del notebook lanza uno o más jobs de Spark, los Job 0, Job 1… del Spark UI. El trigger <i>Scheduled</i> lanza el job de Lakeflow a una hora fija; el scheduler de Spark reparte tasks dentro de la aplicación que ya corre."
  - En glossary.json (entrada "job", línea 18) añadir: "No confundir con un job de Lakeflow Jobs, cuya ejecución lanza muchos jobs de Spark." Quitar del glosario "(es lo que se observa; la doc no lo detalla)": la salvedad ya está en Plan.
  - Fuente: "In Databricks, a job is used to schedule and orchestrate tasks on Databricks in a workflow… Jobs consist of one or more tasks" (https://docs.databricks.com/aws/en/jobs y su par https://learn.microsoft.com/azure/databricks/jobs/, verificado). Para el job de Spark: "A parallel computation consisting of multiple tasks that gets spawned in response to a Spark action" (https://spark.apache.org/docs/latest/cluster-overview.html#glossary).
- **arquitectura.html:80-82.** "El simulador cuenta stages y tasks, no jobs…" adelanta "varios jobs" antes de que se sepa qué es un job. 178-179 ya enlaza a #varios-jobs. Propuesta: borrar esa viñeta.
- **Spark UI de una ejecución terminada.** Es el primer paso del junior y solo aparece en el Repaso.
  - Propuesta: ampliar la nota común "¿Ya tienes un job lento?", que es la misma en arquitectura:360-362, plan:616-618, stages:445-447, shuffle:430-432 y joins:690-692, con "Si es un job programado que ya terminó, antes <a href="spark-ui.html#ejecucion-terminada">abre el Spark UI de esa ejecución</a>."
  - Es un cambio de navegación en 5 sitios, no una idea repetida.
- **AQE sin definir en su primer uso.** Pasa en plan-ejecucion.html:214.
  - Propuesta: "Con AQE (adaptive query execution: Spark vuelve a optimizar la query mientras corre, con los tamaños reales de cada shuffle), que viene activo en Databricks, …". Joins ya lo define así en la línea 214.
  - Fuente: la misma doc de AQE ("the most up-to-date accurate statistics at the end of a shuffle and broadcast exchange").
- **ANALYZE TABLE.** joins.html:599-600 lo menciona sin enlace. Propuesta: el mismo enlace que en 654, a mantenimiento-delta.html#estadisticas.
- **Comprobación de predicciones:** ninguna de estas frases está antes de una pregunta que dependa de ellas. Los `data-guess` de Plan no preguntan por AQE, y Arquitectura no pregunta por jobs.

---

## Fuera del top 8 (bajo)

- **arquitectura.html:244-265.** Spark Connect y compute estándar distraen al lector de un job lento. Se decidió conservarlos en r4 (Q3). Como mucho, pasarlos al final de "En Databricks", detrás de serverless.
- **plan-ejecucion.html:720-721, Fuentes.** www.databricks.com/glossary/catalyst-optimizer es un glosario de marketing, no doc oficial, y no tiene par Azure. Sustituirlo por la frase de Catalyst de "What is Photon?" o etiquetarlo fuera de las fuentes oficiales.
- **Primera persona.** shuffle.html:413 ("razonamiento mío") y joins.html:617-618 ("es mía, no de la doc") cambian de voz. Mejor "razonamiento de este manual, no de la doc".
- **stages.html:46-50.** "Se llama *iterations* en la guía de 2023" sobra en la tabla de definiciones. Ya está en Fuentes (493-495).
- **Para `pedagogo`.** El tooltip de "waves" (glossary.json:34, "No es una barrera…") y shuffle.html:207-209 (el spill) acercan las respuestas de la P1 de Stages y la P3 de Shuffle. Son principios y la skill los permite, pero conviene que lo valore.

## Estructura propuesta

Ninguna página cambia sus `h3` ni su orden. Los cambios son dentro de cada sección, y en Plan de ejecución se reducen las preguntas del simulador "Cuántos stages". IDs nuevos que tendrá que crear `redactor-manual`:
- `plan-ejecucion.html#unidades`, en la nota de 357.
- `plan-ejecucion.html#una-task`, en el `li` de 605.

Ningún cambio toca IDs de simuladores (`dag-*`, `js-*`, `rf-*`, `sc-*`, `wv-*`, `jt-*`, `wk-*`, `sw-*`).

## Qué experto revisa qué
- `experto-motor-spark`: 5b (8 MiB en 2 tasks y si suavizar plan:353-356) y la frase final de la caja de Photon del hallazgo 3.
- `experto-plataforma`: la caja de Photon y el glosario (hallazgo 3), y cómo ver la versión de DBR si se añade (hallazgo 2).
- `pedagogo`: hallazgo 1 (qué pregunta queda en el simulador y cómo quedan las opciones) y hallazgo 7 (el nuevo R8).

## Archivos
Revisados:
- /Users/hrpr/Documents/rote/spark-performance-lab/src/arquitectura.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/plan-ejecucion.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/stages.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/shuffle.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/joins.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/repaso-fundamentos.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/plan-ejecucion.js
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/repaso-fundamentos.js
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/glossary.json
- /Users/hrpr/Documents/rote/spark-performance-lab/src/_data/pages.yml

Consultados como páginas dueñas:
- /Users/hrpr/Documents/rote/spark-performance-lab/src/aqe.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/remedios.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/query-profile.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/spark-ui.html