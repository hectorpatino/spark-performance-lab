# Pedagogía · Fundamentos, ronda 5

Lo he aplicado a arquitectura, plan-ejecucion, stages, shuffle, joins y repaso-fundamentos, con sus simuladores y el glosario. Uso el informe del junior como evidencia, pero dos de sus pruebas no se sostienen:

- **Los tooltips del glosario no regalan nada.** site.js:110 solo los pone en `.doc > p`, `.doc > ul > li`, `.doc > ol > li` y `.doc > .def`. No salen en `.essentials`, en `.guess` ni en botones. El junior leyó `glossary.json` directamente, y el lector real no ve esa definición antes de las preguntas de stages (P1) ni de shuffle (P3).
- **Shuffle P3 sí está regalada en parte, pero por otra causa:** el párrafo de shuffle.html:207-209.

## Modelo mental objetivo
1. Tu notebook corre en el driver. Solo una acción pone a trabajar a los executors, y lo que vuelve al driver no se acelera con más workers.
2. Cada acción ejecuta su plan desde la lectura. Cada `Exchange` de shuffle corta un stage, y el stage siguiente espera a que el anterior acabe.
3. Un stage tiene una task por partición. Las particiones salen de la lectura, del shuffle (`spark.sql.shuffle.partitions`; con `auto`, las elige Databricks) o de tu código.
4. Un stage dura aproximadamente waves × duración de una task, y su task más lenta marca el final. Más cores solo ayudan si quitan una wave entera, y nunca acortan una task lenta.
5. Un join copia el lado que su tipo deja copiar, si cabe en el umbral (10 MiB estimado al planear, 30 MiB reales con AQE). Si no, los dos lados pagan shuffle.
6. Puente que falta: con Photon cambian los operadores que ves en el plan. Qué partes del modelo siguen igual está sin fuente (hallazgo 2).

## Mapa de conceptos (solo las relaciones rotas o ausentes)
- `auto` → activa → auto-optimized shuffle (**no aparece**). plan-ejecucion.html:313-321 nombra los dos como si fueran cosas distintas. La doc de AQE dice: "Setting the value `auto` enables auto-optimized shuffle" (docs.databricks.com/aws/en/optimizations/aqe · par Azure: learn.microsoft.com/azure/databricks/optimizations/aqe, que dice lo mismo).
- Job de Lakeflow → contiene tareas → cada tarea lanza jobs de Spark (**no en Fundamentos**; solo en spark-ui.html:99-108).
- Tamaño de una tabla pequeña → número de tasks de lectura (**relación falsa**: plan-ejecucion.html:353-356 da a entender "tantas como cores").
- Photon → cambia los nombres de los operadores y el join pasa a hash join (**parcial**: está enterrado en arquitectura.html:226-241 y joins.html:235-262).
- Abrir el Spark UI de una ejecución que ya terminó → primer paso con un job real (**solo al final del Repaso**, 633 y 793).
- `BroadcastExchange` → no corta el stage del lado grande (sí aparece, pero el título del paso, plan-ejecucion.html:238, dice "Cada `Exchange` abre un stage").

## Errores de concepto previsibles
- **"Una tabla pequeña se lee en tantas tasks como cores"** — modelo roto que crea la propia página (plan-ejecucion.html:31-33 y 353-356). El Repaso lo contradice sin explicarlo (repaso-fundamentos.js:27: 8 MiB en 2 tasks). Hallazgo 3.
- **"En un join nunca se copia la izquierda"** — es la generalización probable tras tres preguntas sobre el `LEFT`. Ninguna página la rompe: no hay un solo caso `INNER` con la tabla pequeña a la izquierda. Hallazgo 4.
- **"Con Photon nada de esto me sirve"** — creencia de fondo. La causa es "Este manual describe el motor de Spark sin Photon" (arquitectura.html:233), sin decir qué se mantiene. Hallazgo 2.
- **"Mi job de Lakeflow es un job del Spark UI"** — modelo roto. Fundamentos no lo rompe, y además usa "tu job" en los dos sentidos: arquitectura.html:335, el aviso "¿Ya tienes un job lento?" de cada página y el título del Repaso. Hallazgo 5.
- **"Las waves son tandas con barrera"** — modelo roto. arquitectura.js:134 lo rompe bien. stages P1 no lo distingue: con duraciones variables, quien cree en la barrera también contesta "unos pocos". Hallazgo 7.
- **"El ID del job es el del stage"** — modelo roto creado por los números del Repaso (Stage 8 y Job 8, repaso-fundamentos.html:526). Hallazgo 8.
- **"Un orden global necesita juntarlo todo en una task"** — modelo roto que ninguna pregunta pone a prueba. Lo uso en la pregunta nueva de aggsort.
- **"`auto` y auto-optimized shuffle son dos cosas, y no sé cómo poner `auto`"** — dato que falta. Hallazgo 6.

## Simulador
- **"Cuántos stages tiene cada query" (plan-ejecucion.html:253-279, plan-ejecucion.js:265-286, app.js:330-402).**
  - *POE.* Tres de las cinco preguntas se contestan con texto ya leído (narrow, agg, smj), y aggsort con la lista del esencial.
  - *Regla de máximo 3.* La página tiene 7 predicciones. `#dag-guess` no lleva `data-guess`, así que se salta la regla y también check-guesses.js:18.
  - Propuesta en el hallazgo 1: ejemplos resueltos con huecos (*faded examples*, que Wilson recomienda para novatos en el capítulo de carga cognitiva).
- **Árbol del notebook.** Pre-entrenamiento correcto, pero la descripción del control (plan-ejecucion.html:88-89) dice qué stages cambia `shuffle.partitions`, que es justo lo que pregunta P2.
- **Simulador de arquitectura.** Buena segmentación (‹ pausa ›). Coherencia: el punto de arquitectura.html:80-82 (varios jobs por acción) habla de algo que el simulador no muestra; sobra.
- **Repaso.** La recreación del Spark UI es buena. Contigüidad: las preguntas E1-E5 van justo debajo de cada recreación.
- **Números.**
  - arquitectura (14 tasks frente a 12 cores) y stages P2 (4 tasks en 4 cores) coinciden a propósito: la coincidencia es la lección. Correcto.
  - Repaso: Stage 8 = Job 8 coincide sin querer. Además, 8 MiB → 2 tasks contradice la regla de plan-ejecucion.html:353-356.
  - Plan de ejecución: 80 tasks salen de 10 GiB ÷ 128 MiB y 40 de 5 GiB ÷ 128 MiB. Bien, y lo dice el título.

## Preguntas propuestas

**1. plan-ejecucion · aggsort (sustituye a la actual; respuesta c).** "`groupBy` + `orderBy` y `write`. Sin contar lo que pueda unir AQE, ¿cuántas tasks tiene el stage que ordena, y cómo queda ordenada la tabla entera?"
- a) 1 task: un orden global necesita juntar las filas en una task. — Error: creer que ordenar todo exige un único sitio. Spark reparte por rangos de `count` y los rangos ya van en orden.
- b) 200 tasks ordenan su parte y el driver junta los trozos al final. — Error: creer que el driver remata. El `write` lo hacen las tasks.
- c) 200 tasks: cada una ordena un rango de `count`, y los rangos ya van en orden. — Correcta.
- d) 80 tasks, las mismas que leyeron `ventas`. — Error: creer que las tasks de lectura siguen después del shuffle.

**2. repaso R8 (sustituye a la actual; mismos números, `INNER` en vez de `LEFT`; respuesta b).** "`ventas_hoy INNER JOIN clientes` por `cliente_id`. Estimado: 5 MiB `ventas_hoy` (izquierda) y 2 GiB `clientes`. Sin hints, AQE activado, sin Photon. ¿Qué join sale en el plan inicial y cuál en el final?"
- a) `SortMergeJoin` en los dos: la izquierda de un join no se copia. — Error: llevar la regla del `LEFT` a cualquier join. En un `INNER` ningún lado conserva todas sus filas.
- b) `BroadcastHashJoin` de `ventas_hoy` desde el plan inicial. — Correcta: 5 MiB cabe en el umbral estático de 10 MiB.
- c) `SortMergeJoin` en el inicial; AQE lo cambia a broadcast de `ventas_hoy`. — Error: creer que el broadcast solo llega en runtime.
- d) `BroadcastHashJoin` de `clientes`: se copia el lado derecho. — Error: creer que se copia siempre la derecha. Además, 2 GiB no cabe en ningún umbral.

**3. stages P1 (sustituye a la actual; respuesta c).** "40 tasks en 16 cores, cada una tarda entre 2 y 8 s. ¿Cuándo empieza la task 17?"
- a) Cuando terminan las 16 primeras: la segunda wave arranca junta. — Error: modelo de barrera.
- b) Cuando termina la task 1: cada core tiene sus tasks asignadas desde el principio. — Error: reparto fijo de antemano.
- c) Cuando termina la primera de las 16, sea cual sea. — Correcta.

Compruébalo: con «Duraciones variables», arrastra «Tiempo» hasta que «en cola» baje de 24 a 23 y mira cuántas tasks han terminado. En la explicación, conserva lo de "cores parados al final" y la nota sobre esperas cortas por localidad que ya usa E3 (repaso-fundamentos.html:657-659).

**4. Opcional, en el Repaso, solo si se aplica el hallazgo 5.** "Tu job de Lakeflow corre un notebook durante 40 min. En el Spark UI de su compute ves Job 0 … Job 57. ¿Qué es cada Job N?"
- a) Una ejecución programada del job. — Error: confunde la ejecución (*run*) con un job de Spark.
- b) Una tarea del job de Lakeflow. — Error: confunde la tarea con un job de Spark.
- c) Lo que lanzó una acción del notebook (a veces, un tramo de ella). — Correcta.
- d) Un stage del notebook. — Error: confunde job con stage.

## Hallazgos

### 1. Alto · Plan de ejecución tiene 7 predicciones, y 4 se contestan con texto anterior
- **Dónde:** plan-ejecucion.html:140-170 (P2), 253-279 y plan-ejecucion.js:265-286 (simulador), 88-89 (control), 136-137 (explicación de P1, que regala smj), 23-26 (esencial), 238 (título del paso).
- **Qué se lleva el lector:** contar stages como un ejercicio de recordar listas. Solo bhj le rompió un modelo, y fue la única que falló.
- **Propuesta (simulador):** dejar 3 predicciones: P1, bhj y la aggsort nueva (pregunta 1).
  - narrow, agg y smj pasan a **ejemplos resueltos**: el resultado se ve sin tapar, con una línea "Qué mirar".
    - narrow: "no hay ningún `Exchange`: un stage de 80 tasks".
    - agg: "el stage que lee el shuffle tiene 200 tasks, no 80".
    - smj: "dos stages que leen tablas y uno que lee los dos shuffles".
  - El orden de los chips ya sirve para retirar la ayuda poco a poco (*fading*): tres ejemplos resueltos y luego dos preguntas.
  - En plan-ejecucion.js, una entrada de `Q` sin `ans` muestra `.guess-body` directamente.
  - Poner `data-guess` (o un contador equivalente) en `#dag-guess` para que la regla de 3 lo cuente.
- **Propuesta (texto):**
  - P2 deja de ser predicción y pasa a la lista "Para seguir explorando" (219-225): "Sube shuffle.partitions de 4 a 50. ¿Qué stages cambian?" Duplica lo que enseña el ejemplo resuelto de agg.
  - La línea 88-89 queda neutral: "**shuffle.partitions:** el valor de `spark.sql.shuffle.partitions`".
  - El título de la línea 238 pasa a "Cada `Exchange` de shuffle abre un stage". Si no, contradice 423-426, que es lo que bhj pone a prueba.
- **Fuente:** que un `orderBy` global reparte por rangos en `shuffle.partitions` particiones ya lo afirma la página (app.js:369-372). Que lo confirme `experto-motor-spark`: hoy solo se cita `repartitionByRange`.

### 2. Alto · Photon: el lector no puede llevar el modelo a su job
- **Dónde:** arquitectura.html:226-241 (el aviso está en la frase 233, dentro de una viñeta), joins.html:235-262, shuffle.html:189-197.
- **Qué se lleva el lector:** "todo lo que viene después puede no verse igual en mi job" (junior, línea 31). Es una creencia que anula la transferencia.
- **Propuesta:**
  1. Una viñeta en el esencial de arquitectura: "Este manual describe Spark sin Photon, el motor que Databricks activa por defecto en casi todo compute. Con Photon cambian los operadores del plan; qué ves en su lugar: [ancla]".
  2. En arquitectura#photon (dueña), una tabla corta "Qué cambia en lo que ves" con lo que la doc sí dice:
     - "In the SQL/DataFrame tab of the Spark UI, Photon operators appear in orange".
     - "Replaces sort-merge joins with high-performance hash joins".
     - "uses a redesigned columnar shuffle".
     - Entre los operadores que soporta: "Hash Aggregate/Join/Shuffle", "Sort".

     Así joins#photon puede decir qué buscar: un join hash de Photon, en naranja. Hoy solo dice "puedes no ver `SortMergeJoin`".
  3. Quitar la repetición de "no cambia quién planea" en joins.html:236-239. Mover Execution Details y `COVERAGE_PHOTON` (joins.html:243-248) a query-profile.html.
- **Fuente:** docs.databricks.com/aws/en/compute/photon (citas de arriba) · par Azure: learn.microsoft.com/azure/databricks/compute/photon.
- **Sin fuente, para `experto-plataforma` y `experto-observabilidad`:**
  - Que "el reparto en stages y el reparto all-to-all no cambian" (shuffle.html:196). La página de Photon no habla de jobs ni de stages.
  - Qué nombres tienen los nodos de Photon en la pestaña SQL.
  - Si *Summary Metrics* se llaman igual.
  - Lo más fuerte sería ejecutar una query con Photon en compute clásico, con el perfil que elija el usuario, y recrear su plan.

  Hasta tenerlo, no subas al esencial "el modelo sirve igual".

### 3. Alto · La regla de la tabla pequeña es falsa y el Repaso la contradice
- **Dónde:** plan-ejecucion.html:31-33 y 353-356; repaso-fundamentos.js:27.
- **Qué se lleva el lector:** "8 MiB con 32 cores da unas 32 tasks". Luego ve 2 y concluye que el sitio se contradice.
- **Propuesta:**
  - Quitar del esencial "También pueden influir [los cores] en cuántas particiones salen al leer": es un detalle, no un principio.
  - Reescribir 353-356: "Con una tabla pequeña puede haber más particiones de las que da dividir entre 128 MB, pero la doc no da la fórmula. No lo calcules: míralo en las tasks del stage".
  - Que `experto-motor-spark` compruebe por qué 8 MiB dan 2 tasks. Lo único que dice la doc de `spark.sql.files.openCostInBytes` (4 MB) es "used when putting multiple files into a partition". No da ningún algoritmo.
- **Fuente:** spark.apache.org/docs/latest/sql-performance-tuning.html. Verificado: la página no da fórmula para el tamaño de los trozos ni para el número de particiones.

### 4. Alto · La regla del LEFT se pregunta 3 veces y deja sin probar la generalización falsa
- **Dónde:** joins.html:311-356 (P2), repaso-fundamentos.html:381-425 (R8) y 728-778 (E5).
- **Qué se lleva el lector:** reconoce el patrón (izquierda pequeña en un `LEFT` → sort-merge) más que el principio. R8 tiene la misma estructura que joins P2 con otros nombres.
- **Propuesta:**
  - Mantener joins P2, donde se aprende combinando dos reglas, y E5, donde se transfiere dentro de un diagnóstico.
  - Cambiar R8 por la versión `INNER` (pregunta 2): con los mismos números, solo cambia el tipo de join. Si el lector generalizó, R8 lo delata.
  - En joins.html:21-25, el esencial puede quedarse. P2 sigue sin regalarse porque exige además ver que el lado copiable no cabe.

### 5. Medio · "Job" significa dos cosas, y el primer paso con un job real llega tarde
- **Dónde:** arquitectura.html:286-292 y 335; plan-ejecucion.html:496-516 y 575-604; el aviso "¿Ya tienes un job lento?" en las 5 páginas (p. ej. plan-ejecucion.html:616-618); glossary.json:17-21.
- **Qué se lleva el lector:** su job de Lakeflow de 40 min es "un job" del Spark UI. Y no sabe abrir el Spark UI de una ejecución que ya terminó.
- **Propuesta:**
  1. En "Con qué se confunde" de plan-ejecucion (dueña de "job"), una entrada **Job de Lakeflow vs job de Spark** de dos frases: "Un job de Lakeflow tiene tareas; el notebook de una tarea lanza muchos jobs de Spark, uno o más por acción". La explicación completa ya está en spark-ui.html#ejecucion-terminada (99-108).
  2. Primera viñeta de "Dónde mirar" en plan-ejecucion (577): "Tu job programado ya terminó → abre el Spark UI de esa ejecución (spark-ui.html#ejecucion-terminada)".
  3. El aviso de cada página pasa a decir: "¿Ya tienes un job lento? Abre el Spark UI de su ejecución y sigue la ruta de diagnóstico", con un enlace a cada sección. Es un fragmento compartido: lo edita la sesión principal.
  4. Glosario `job`: añadir "No confundir con un job de Lakeflow Jobs, que puede lanzar cientos de jobs de Spark".
- **Para `experto-observabilidad`:** si en la salida de un notebook de una ejecución programada también aparece el desplegable *Spark Jobs* bajo cada celda (pregunta del junior, línea 43).

### 6. Medio · AQE y `auto` se usan a fondo antes de su página
- **Dónde:** plan-ejecucion.html:16, 214, 432-435, 459-494, 498-516 y 540-542 (siete menciones de "una acción puede ser varios jobs"); arquitectura.html:80-82 y 178-179; stages.html:17-22 y 348-350; shuffle.html:105-107; plan-ejecucion.html:308-326.
- **Qué se lleva el lector:** "me costó" (junior). Lo que le queda, "no cuentes jobs, abre la query", es útil, pero tres párrafos de mecanismo no documentado lo tapan.
- **Propuesta (AQE).** Dejarlo en Fundamentos solo como efecto observable, con una definición de una línea en su primera aparición, plan-ejecucion.html:214: "AQE: re-planea la query al terminar cada shuffle, con los tamaños reales".
  - En plan-ejecucion, quedarse con el bloque `#count-dos-jobs` (461-467) y una frase: "el Spark UI puede partir la acción en varios jobs y mostrar como *skipped* lo ya corrido; cuenta stages en la query".
  - Mover a aqe.html la cita de los *query stages*, la nota "la doc no lo detalla" y el truco de desactivar AQE (468-494).
  - Fundir 498-516 con ese bloque.
  - Quitar la advertencia del esencial (16) y de arquitectura.html:80-82.
- **Propuesta (`auto`).** plan-ejecucion#particiones es la dueña.
  - Añadir: "`auto` activa *auto-optimized shuffle*". Cita: "Setting the value `auto` enables auto-optimized shuffle" (aqe · par Azure verificado).
  - Mover aquí la línea `spark.conf.set("spark.sql.shuffle.partitions", "auto")`, que hoy solo está en remedios.html:60. Remedios se queda con cuándo usarlo.
  - Quitar la viñeta de `auto` del esencial de stages (17-22): es un remedio, no un principio.
  - stages.html:348-350 y shuffle.html:105-107 pasan a ser un enlace a la dueña. El "o las que elija Databricks si no fijas un número" de shuffle omite la condición de DBR 19.
- **Query profile.** Fuera de la indicación "en serverless, usa el query profile", sacarlo de Fundamentos (ver hallazgo 2).

### 7. Medio · stages: P1 no distingue el modelo de barrera y las 3 respuestas son la b
- **Dónde:** stages.html:60-90, 155-181 y 288-315.
- **Qué se lleva el lector:** en P1, la opción a diagnostica "las tasks acaban juntas", no "hay barrera". Además, las tres respuestas correctas son la opción del medio, menos extrema, y eso premia la heurística de elegir la intermedia.
- **Propuesta:**
  - Sustituir P1 por la pregunta 3 (respuesta c).
  - Mantener P2 en b, porque las opciones son números y van en orden.
  - Reordenar P3: a) "Solo pasar a 6 workers lo acorta" (correcta), b) "Cualquiera de los dos", c) "Ninguno".

  Las respuestas quedan c, b, a.
- **Shuffle P3 (shuffle.html:253-286).** El párrafo "Memoria y spill" (207-209) descarta la opción c ("OOM") antes de la pregunta. Moverlo a la explicación de P3, que ya enlaza a Memoria y OOM.

### 8. Bajo · Repaso: números que coinciden y datos nuevos en las explicaciones
- **Dónde:** repaso-fundamentos.html:526-540 y repaso-fundamentos.js:70, 87-93 y 129 (Stage 8 = Job 8); 671-674 (`minPartitionSize`); 769-776 (lado del skew en un `LEFT OUTER`); 780-789 (*optimized writes*); 825-828 (`CustomShuffleReader`).
- **Qué se lleva el lector:** "el ID del job es el del stage". Además, un repaso que trae conceptos nuevos deja de ser práctica de recuperación.
- **Propuesta:**
  - Desplazar los números con una premisa que además enseña algo cierto (los números suben mientras viva la aplicación, plan-ejecucion.html:52): "el compute ya había corrido otras celdas". Por ejemplo, stages 12-21 y jobs 5-14, de modo que el stage lento sea el 20 y su job el 13.
  - Plan B barato: una frase en el paso 2: "que coincidan es casualidad de este ejemplo".
  - Las explicaciones de E3 y E5 se quedan en una línea con enlace a aqe.html, que es la dueña de esos datos.
  - La nota de *optimized writes* pasa a diagnostico.html o a spark-ui.html.
  - La fila de `CustomShuffleReader` se queda en "Nodo de lectura con *Coalesced*" y enlace.

### Brecha entre terminar la sección y diagnosticar un job real
Ordenada por impacto:
1. Abrir el Spark UI de una ejecución terminada → hallazgo 5.
2. Saber si el job corre con Photon y en qué compute → hallazgo 2. `experto-plataforma` debe dar dónde se ve en la ejecución del job.
3. Leer un join de Photon → hallazgo 2.
4. Poner `auto` → hallazgo 6.

Arreglar el skew queda fuera de Fundamentos, y los enlaces a Remedios son lo correcto. Cuando el hallazgo 2 tenga fuente o una ejecución real, añade al Ejercicio una variante con Photon (o una pregunta E6): hoy el ejercicio supone "sin Photon" y el job del lector casi seguro lo usa.

### Otros cambios de carga, de prioridad baja
- **Spark Connect y compute estándar (arquitectura.html:244-265).** No sirven para diagnosticar. Mover a azure.html#modo-acceso y dejar una línea.
- **Cajas "Verifícalo" con `SparkStrategies.scala` (joins.html:141-157 y 177-192).** Meterlas en un `<details>`.
- **`HISTORY_BASED_JOIN_STRATEGY` (joins.html:676-685).** Mover a query-profile.html.
- **Nota de MB frente a MiB.** La dueña es plan-ejecucion; en joins.html:162-165, sustituirla por un enlace.

## Qué tiene que aportar cada experto
- **`experto-motor-spark`:** el número de particiones al leer una tabla pequeña (8 MiB → 2 tasks); una fuente para el reparto por rangos de `orderBy`.
- **`experto-plataforma`:** Photon en job compute y cómo ver en la ejecución si usó Photon y qué compute; fuente para "con Photon no cambian los stages".
- **`experto-observabilidad`:** nombres de los operadores de Photon en la pestaña SQL; si el desplegable *Spark Jobs* aparece en la ejecución de un job programado.

## Archivos
- /Users/hrpr/Documents/rote/spark-performance-lab/src/plan-ejecucion.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/plan-ejecucion.js
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/app.js (líneas 330-402)
- /Users/hrpr/Documents/rote/spark-performance-lab/src/arquitectura.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/stages.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/shuffle.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/joins.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/repaso-fundamentos.html
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/repaso-fundamentos.js
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/glossary.json
- /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/site.js (líneas 110-117, alcance de los tooltips)
- /Users/hrpr/Documents/rote/spark-performance-lab/.claude/skills/revisar-seccion/check-guesses.js (línea 18: solo cuenta `[data-guess]`)

No he editado nada. Espero la aprobación del usuario; los cambios los aplica `redactor-manual`.