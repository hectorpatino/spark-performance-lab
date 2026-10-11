# Informe del ingeniero junior: sección Fundamentos

## Resumen (10 líneas)
1. Lo que más me sirvió fue el Repaso. Su ejercicio me enseña la ruta completa: stage lento → job → query → clave del `Exchange` → línea de código. El lunes puedo repetirla con mi job.
2. Antes del Repaso, cada página me deja algo que puedo usar: mirar el desplegable *Spark Jobs*, ordenar por *Duration*, comparar tasks con cores, mirar Max frente al percentil 75 y buscar el nodo de join en el *Final Plan*.
3. El hueco más grande es Photon. El manual describe Spark sin Photon (arquitectura.html:233). Mi job seguramente corre con Photon, y Joins (joins.html:235-262) solo me avisa de que "puedes no ver `SortMergeJoin`", sin decirme qué voy a ver.
4. Hay otro hueco que es el primer paso de mi caso: abrir el Spark UI de una ejecución programada que ya terminó. Solo lo encuentro al final del Repaso (repaso-fundamentos.html:633-634 y 793-794), y el enlace va a la sección siguiente.
5. "Job" significa dos cosas, y ninguna página lo separa: mi job de Lakeflow de 40 min y los "Job 0, Job 1…" del Spark UI. Arquitectura distingue scheduler de "programar un job" (286-292), pero no esto.
6. Las páginas cuentan cosas distintas sobre el número de particiones de shuffle por defecto. Hablan de 200, de `auto`, de "las que elija Databricks" y de DBR 19 (plan-ejecucion.html:308-320, shuffle.html:105-107, stages.html:348-350). No sé qué tiene mi cluster ni cómo pongo `auto`.
7. Marco como regaladas, total o parcialmente, 7 de 40 predicciones: 1 de plan-ejecucion, 4 del simulador de stages, 1 de stages y 1 de shuffle. Sobre todo las del simulador "Cuántos stages tiene cada query" en plan-ejecucion.html.
8. La misma regla (en un LEFT no se copia la izquierda) se pregunta 3 veces: joins P2, repaso R8 y repaso E5.
9. AQE se usa a fondo en Plan de ejecución, Joins y Repaso, pero su página está en "Diagnóstico y remedios", dos secciones después. El glosario me salva a medias.
10. Me quedo con un modelo mental útil. Lo que no sé hacer: arreglar el skew, poner `auto`, leer un plan con Photon y saber en qué compute corre mi job.

---

## Arquitectura de Spark (src/arquitectura.html)

**Utilidad: 4.** Ya sé descartar o confirmar que el tiempo se va en el driver: mirar *Spark Jobs* bajo la celda. Pero la mitad de la sección "En Databricks" (Photon, Spark Connect, compute estándar) no me ayuda con mi job.

**Qué me llevo**
- Mi notebook corre en el driver. Las transformaciones solo apuntan pasos en un plan. Cuando llega una acción (`count`, `write`, `collect`, `show`, `display`), el driver manda tasks a los executors, una por partición, una por core.
- Más workers solo ayudan con lo que corre en los executors. Si mucho resultado vuelve al driver (`collect`/`toPandas` grandes) o si es Python normal, el cluster da igual.
- `write` no devuelve filas al driver. `count` devuelve un número. `show` como mucho 20 filas. `display` hasta 10.000 filas o 2 MB.

**Qué haría el lunes con mi job**
- Abro la ejecución y miro bajo cada celda el desplegable *Spark Jobs*. Si una celda tarda y no tiene ningún job activo, el tiempo se va en Python en el driver (arquitectura.html:344-351).
- Busco `collect()`/`toPandas()` y bucles de Python sobre filas. Si los hay, agrego o filtro en Spark antes, o escribo a una tabla.

**Dónde me perdí**
- src/arquitectura.html:226-241: el bloque de Photon ("vectorizado", "lotes de columnas", "C++", `runtime_engine`, "DAG de la pestaña SQL / DataFrame", "operadores en naranja") es muy denso. La frase que más me importa, "Este manual describe el motor de Spark sin Photon" (233), queda enterrada. Para mí es un aviso de primer nivel: casi todo lo que viene después puede no verse igual en mi job.
- src/arquitectura.html:244-265: Spark Connect, "planes sin analizar", compute estándar, "modo de acceso". No veo qué tiene que ver con un job lento. Me distrae.
- src/arquitectura.html:80-82: "una acción puede verse como varios jobs" aparece antes de saber qué es un job. Me deja una duda que no se resuelve hasta plan-ejecucion.html:459-516.
- src/arquitectura.html:286-292, "Scheduler de Spark vs programar un job": está bien, pero la confusión que tengo yo es otra. Mi "job" de Lakeflow, ¿es un job del Spark UI? No lo dice ninguna página de la sección.
- src/arquitectura.html:180, "uno más por cada shuffle": shuffle se usa antes de explicarse. El tooltip del glosario lo cubre.

**Mis predicciones**
- `df.count()`: ¿qué viaja? Dudé entre a y b, y elegí b porque el bloque esencial habla de "lo que vuelve al driver". Era b: acerté, sin pista regalada.
- `groupBy().count().toPandas()` de 50 filas sobre 1 TB: dije c. Era c: acerté aplicando el "Si solo recuerdas una cosa" (28-30). El primer párrafo (34-35) me había sembrado la trampa "toPandas = malo", y la pregunta la desarma bien.

**Qué me falta**
- ¿Cómo sé si mi job corre en serverless, en job compute o en un cluster clásico, y si tiene Photon? Para un job, el glosario (glossary.json:141, "Activo por defecto en el compute clásico") y arquitectura.html:229-231 ("Si creas el compute con la Clusters API o la Jobs API, tienes que activarlo tú") me dejan con la duda.
- En la ejecución de un job programado, ¿también veo el desplegable *Spark Jobs* bajo cada celda?

---

## Plan de ejecución (src/plan-ejecucion.html)

**Utilidad: 4.** Sé qué mirar: jobs por duración, luego stages por duración, *Associated SQL Query*, contar `Exchange`. Y sé una cosa que cambiar: quitar `count()` de "control" antes de un `write`. Las partes de AQE y de los valores por defecto según la versión de DBR me dejan inseguro.

**Qué me llevo**
- Un DataFrame es un plan, no datos. Cada acción lo vuelve a ejecutar desde la lectura, salvo con `cache()` en compute clásico.
- Cada shuffle es un `Exchange` en el plan físico y abre un stage nuevo. Stages = `Exchange` de shuffle + 1, y uno más si hay broadcast.
- Las tasks de un stage salen de sus particiones. En la lectura, trozos de hasta 128 MB. Después de un shuffle por clave, `spark.sql.shuffle.partitions`. Después de un shuffle sin clave (`count()`), 1.
- `coalesce(1)` mete todo el stage en una task. `repartition(1)` solo el último.

**Qué haría el lunes con mi job**
- En el Spark UI, pestaña Jobs, ordeno por duración. En el job más largo bajo a la lista de stages y la ordeno por duración. Con *Associated SQL Query* llego a la query y cuento los `Exchange`.
- Busco en el código acciones extra (`count()`, `show()`, `display()`) antes del `write` y las quito.
- Si un stage de 1 task tarda, busco `coalesce(1)`, `repartition(1)`, ventanas sin `PARTITION BY` o archivos que no se pueden partir (605-614).

**Dónde me perdí**
- src/plan-ejecucion.html:308-326: "200 en Apache Spark, y también según la doc de AQE… Desde Databricks Runtime 19, si no fijas un número, se usa auto-optimized shuffle… En serverless, el valor por defecto es `auto`". No sé qué versión de DBR tiene mi compute ni cómo mirarlo. Tampoco dice claramente que `auto` y auto-optimized shuffle son lo mismo. Y en 338-339 añade que la doc no dice qué devuelve `spark.conf.get` en ese caso.
- src/plan-ejecucion.html:353-356: "Spark hace trozos de menos de 128 MB para acercarse a ese mínimo [los cores]". Con eso esperaba que una tabla de 8 MiB en 32 cores diera unas 32 tasks. En el Repaso da 2 (repaso-fundamentos.js:27). Ver "Contradicciones".
- src/plan-ejecucion.html:357-361: la nota de MB y MiB es correcta, pero aquí me sobra. Y Joins la repite (joins.html:162-165).
- src/plan-ejecucion.html:459-494 y 498-516, "Job vs acción" y los "query stages" de AQE: tres párrafos largos sobre algo que la propia página dice que la doc no detalla, y con AQE sin explicar todavía (su página va dos secciones después). Me quedo con "no cuentes jobs, abre la query", pero me costó.
- src/plan-ejecucion.html:238, "Cada `Exchange` abre un stage": luego 423-426 dice que `BroadcastExchange` no corta el stage del lado grande. El glosario sí distingue los dos casos (glossary.json:84), pero el título del paso 3 no.

**Mis predicciones**
- Job 1 con join: ¿cuántos stages leen una tabla? Dije b (creía que `ventas` ya estaba leída por el `count()`). Era a: fallé, y el comentario de b ("un DataFrame es un plan, no datos") me sacó del error. Muy buena pregunta.
- Subir shuffle.partitions de 4 a 50: dije c. Era c: acerté. **Regalada en parte**: plan-ejecucion.html:88-89 ya dice que ese control fija "las tasks del stage que viene después de un shuffle por clave (`groupBy`, `join`, `orderBy`)", y `count` no está en la lista. Además arquitectura.js:19 ya me había dicho que el `count()` acaba en "una task final".
- Simulador "Cuántos stages tiene cada query" (plan-ejecucion.js:266-285):
  - *narrow*: dije a. Acerté. **Regalada**: el bloque esencial (plan-ejecucion.html:23-25, "varias seguidas van en el mismo stage") y el título del simulador (256, "80 particiones").
  - *agg*: dije c. Acerté. **Regalada**: plan-ejecucion.html:88-89 y la explicación de la predicción anterior (165).
  - *smj*: dije b. Acerté. **Regalada**: la explicación de la primera predicción (136-137: "`clientes`… se lee en su propio stage y se reparte… con un shuffle, igual que `ventas`").
  - *bhj*: dije a (sin shuffle, todo junto). Era b: fallé, y el comentario me sacó del error. Lo que lo explica (395-396 y 423-426) viene después, así que bien.
  - *aggsort*: dije a. Acerté. **Regalada en parte**: el bloque esencial (26) pone `orderBy` entre las wide.
  - En total la página tiene 7 preguntas, y 4 de ellas (tres del simulador y una suelta) se contestan con texto que ya había leído.

**Qué me falta**
- ¿Cómo veo qué versión de DBR tiene mi compute y, por tanto, si mis shuffles usan 200 o `auto`?
- Con AQE, ¿un stage pertenece a un job o puede salir en dos (el "skipped" del Job 15)? [NO SEGURO]

---

## Tasks, cores y waves (src/stages.html)

**Utilidad: 4.** Sé qué mirar: tasks del stage frente a cores (pestaña Executors) y el *Event Timeline*. Sé que no debo pedir más workers sin hacer la cuenta. Pero no sé cómo poner `auto`, ni qué valor tiene mi cluster.

**Qué me llevo**
- waves = ⌈tasks ÷ cores⌉. Con tasks parecidas, el stage dura más o menos waves × duración de una task. Una task de más que los cores casi duplica el tiempo.
- Las waves no son tandas fijas: cada core coge otra task en cuanto acaba la suya. Al final quedan cores parados.
- Más workers solo ayudan si quitan una wave entera y si hay al menos tantas tasks como cores. Una task lenta (skew) no se acelera con más cores.

**Qué haría el lunes con mi job**
- En la lista de stages miro *Tasks* del stage lento. En *Executors* sumo los cores de los executors, sin contar el driver. Si tasks < cores en un stage largo, faltan particiones. Si hay una task mucho más larga que el resto, sospecho skew.
- Antes de pedir más workers, calculo las waves antes y después.

**Dónde me perdí**
- src/stages.html:17-22: el bloque esencial me dice "prueba primero `auto`" antes de la página de Shuffle, sin decir qué es ni cómo se pone (¿`spark.conf.set(...)`?). Lo manda a Remedios, que está en otra sección.
- src/stages.html:47-50: que la guía de 2023 lo llame *iterations* es un detalle que no necesito.
- src/stages.html:348-350: repite lo de `auto`, "valor por defecto en serverless y desde DBR 19", ya explicado en plan-ejecucion.html:308-320.
- src/stages.html:26-27, 374-383 y 442-443: "un stage largo con una sola task" sale tres veces en la misma página, y otra en plan-ejecucion.html:605-614.

**Mis predicciones**
- 40 tasks, 16 cores, duraciones de 2 a 8 s: dije b. Acerté. **Regalada en parte** por el tooltip de "waves" en stages.html:15 (glossary.json:34: "No es una barrera: cada core toma la siguiente task en cuanto acaba la suya") y por el simulador de arquitectura (arquitectura.js:134, "sin esperar a los otros").
- 4 cores, 512 s, 4/5/8 tasks: dije b. Acerté aplicando la fórmula del bloque esencial. No regalada. Me gustó.
- 48 tasks, 5 o 6 workers: dije b. Acerté con la misma fórmula. No regalada, aunque practica casi lo mismo que la anterior.

**Qué me falta**
- La línea exacta para poner `auto` o un número, y cómo leer el valor efectivo en mi cluster.

---

## Shuffle (src/shuffle.html)

**Utilidad: 4.** Sé qué métricas mirar: Shuffle Write frente a Input en filas, Max frente al percentil 75 y Spill (disk) > 0. Y entiendo por qué. Qué cambiar lo manda a Remedios y Diagnóstico.

**Qué me llevo**
- Cada map task escribe un archivo en el disco local de su executor, con un bloque por partición destino. Cada reduce task lee su bloque de todos esos archivos: en local si el archivo está en su executor, por red si no.
- La agregación parcial manda como mucho una fila por clave y por map task. En un join no la hay.
- Pocas particiones significa que cada reduce task recibe más datos y hay más riesgo de spill. El spill no tumba el job: lo hace lento.
- Si Shuffle Write Records es mayor que las filas que entran, algo multiplica filas: un join o un `explode()`.

**Qué haría el lunes con mi job**
- En el stage lento comparo *Shuffle Write Records* con *Input Records*. En *Summary Metrics* comparo Max con el percentil 75 en Shuffle Read y Duration, y miro si hay Spill (disk).
- Si todas las tasks hacen spill, subo las particiones o pongo `auto`. Si solo una, es skew y voy a Diagnóstico.

**Dónde me perdí**
- src/shuffle.html:105-107: "o las que elija Databricks si no fijas un número". Aquí suena a que siempre es así, pero Plan de ejecución dice que solo desde DBR 19 (plan-ejecucion.html:314).
- src/shuffle.html:380-390: lo de serverless (`system.query.history`, solo admins) me sirve poco si no sé en qué compute estoy.
- La página está clara. Es la que mejor se entiende de la sección.

**Mis predicciones**
- Bloques que lee R2: dije c. Acerté aplicando el bloque esencial (14-16) y la analogía de correos (85-87). No regalada.
- Agregación parcial con 80 map tasks y 1.000 claves: dudé con b. Elegí a por "el conteo de sus propias filas" (219-221). Acerté. No regalada, aplicación directa.
- 10 particiones sin agregación parcial: dije b. Acerté. **Regalada en parte**: shuffle.html:207-209 ("Si no caben, Spark las vuelca a disco (spill)") y el tooltip de OOM (glossary.json:190, "A diferencia del spill, la task falla") descartan la c.

**Qué me falta**
- Con Photon, ¿las métricas del shuffle se llaman igual en el Spark UI?

---

## Estrategias de join (src/joins.html)

**Utilidad: 3.** Entiendo bien la regla (umbral de 10 MB, AQE con 30 MB, el lado que se puede copiar). Pero mi job probablemente usa Photon, y la página me avisa de que entonces puedo no ver `SortMergeJoin`, sin decirme qué veré. Así no sé reconocerlo en mi plan.

**Qué me llevo**
- Antes de ejecutar, Spark hace broadcast si el lado que el tipo de join deja copiar cabe en 10 MiB según las estadísticas. Si no, sort-merge.
- Con AQE, después de los shuffles, si ese lado mide de verdad menos de 30 MiB, pasa a broadcast. Los shuffles ya se pagaron, pero se ahorra el sort.
- En un `LEFT JOIN` no se copia la izquierda, aunque sea diminuta. El hint `BROADCAST` sobre ella se ignora.
- Si el join multiplica filas, cambiar la estrategia no arregla nada: hay que arreglar la condición.

**Qué haría el lunes con mi job**
- En la pestaña SQL / DataFrame miro el nodo de join del *Final Plan* y lo comparo con el *Initial Plan*. Miro *number of output rows* frente a las filas de entrada.
- Si una tabla pequeña no sale en broadcast, compruebo el tipo de join y las estadísticas (`ANALYZE TABLE`). Si el tipo de join lo permite, pruebo `broadcast()`.

**Dónde me perdí**
- src/joins.html:141-157 y 177-192, cajas "Verifícalo": `JoinSelection` en `SparkStrategies.scala`, `SHUFFLE_REPLICATE_NL`, `maxShuffledHashJoinLocalMapThreshold`. Esto es código de Spark y me pierde por completo.
- src/joins.html:168-171 y 235-262: "Photon… cambia el sort-merge por hash joins propios al ejecutar" y "La doc no lista los nombres de los nodos de join de Photon". Entonces, ¿qué busco en el plan de mi job? Esta caja también repite "no cambia quién planea, sino quién ejecuta", ya dicho en arquitectura.html:231-233.
- src/joins.html:243-248: "Execution Details" y `COVERAGE_PHOTON` del query profile salen antes de que la sección explique el query profile.
- src/joins.html:26-30: "la doc de serverless no prohíbe los hints". La doble negación no me deja claro si en serverless funcionan o no.
- src/joins.html:17-20 y 214-233: todo "en runtime" depende de AQE, cuya página va dos secciones después.
- src/joins.html:676-685: `HISTORY_BASED_JOIN_STRATEGY` llega como concepto nuevo al final.
- src/joins.html:56, "Cinco estrategias": el resumen del menú (src/_data/pages.yml:22) nombra cuatro. Es menor.

**Mis predicciones**
- `ventas LEFT JOIN clientes` con 50 MiB estimados y 20 MiB reales: dije b. Acerté. No es regalada del todo, pero la regla está casi literal en joins.html:214-219 ("Si el lado que el tipo de join permite copiar queda por debajo de… 30 MB, AQE puede cambiar el `SortMergeJoin` por un `BroadcastHashJoin`").
- `clientes_vip LEFT JOIN ventas`: dije d. Acerté aplicando la regla del bloque esencial (21-23). No regalada.
- 10 × 10 filas por clave: dije c. Acerté por lo que sé de SQL.

**Qué me falta**
- ¿Qué nombre tiene un join de Photon en el plan, y cómo distingo en él broadcast de shuffle?

---

## Repaso de Fundamentos (src/repaso-fundamentos.html)

**Utilidad: 4.** Es la página que más me sirvió. El ejercicio me da la ruta exacta para ir del stage lento a la línea. Lo que no me da es cómo arreglar el skew (lo manda a Remedios) ni cómo hacer esto con Photon o con un job ya terminado.

**Qué me llevo**
- Primero ordeno por *Duration*. No vale "el que más datos lee" ni "el que más tasks tiene".
- Para ir del stage a la línea: *Associated Job Ids* → *Associated SQL Query* → bloque del DAG con el stage ID o el codegen id → clave del `Exchange` que entra → el join o `groupBy` que usa esa clave.
- Luego comparo tasks con cores, Max con el percentil 75, si el spill está solo en una task y qué join salió en el plan final.

**Qué haría el lunes con mi job**
- Exactamente el ejercicio: pestaña Stages, ordeno por Duration, abro el stage, miro *Summary Metrics*, sigo hasta la query y leo la clave del `Exchange` en *Details*.

**Dónde me perdí**
- src/repaso-fundamentos.html:526-527: "Pulsas el 8 de Associated Job Ids… Job 8". Que el stage y el job tengan el mismo número me hizo pensar que el ID del job es el del stage. Sería mejor usar otro número.
- src/repaso-fundamentos.html:671-674 (explicación de E3): `minPartitionSize` de 1 MB es un detalle de AQE que no está en Fundamentos.
- src/repaso-fundamentos.html:769-776 (explicación de E5): "en un LEFT OUTER, AQE solo parte el skew del lado izquierdo" es nuevo. Su sitio es la página de AQE.
- src/repaso-fundamentos.html:780-789: *optimized writes* y "tablas particionadas de Unity Catalog" llegan como concepto nuevo al final.
- src/repaso-fundamentos.html:825-828: `CustomShuffleReader` y `AQEShuffleRead` también son nuevos.
- repaso-fundamentos.js:27, Stage 6: `productos` de 8 MiB se lee en 2 tasks. Con plan-ejecucion.html:353-356 esperaba unas 32 (ver "Contradicciones").

**Mis predicciones** (acerté las 13; ninguna regalada dentro de la página, pero sí repetidas)
- R1 (bucle de Python): dije b. Acerté; ya estaba en arquitectura.html:330-332.
- R2 (`count()` antes del `write`): dije c. Acerté; ya estaba en plan-ejecucion.html:549-559 y en su primera predicción.
- R3 (join + `groupBy`, 4 stages 120/24/64/64): dije a. Acerté.
- R4 (broadcast + `groupBy`): dije d. Acerté gracias al fallo que tuve en *bhj* de Plan de ejecución.
- R5 (100 archivos): dije b. Acerté.
- R6 (300 M escritas frente a 100 M de entrada): dije d. Acerté; es casi literal de shuffle.html:347-355. Normal en un repaso.
- R7 (ventana con skew): dije c. Acerté por joins.html:634-636 (AQE solo parte el skew en joins con shuffle).
- R8 (`ventas_hoy LEFT JOIN clientes`): dije a. Acerté. **Repetida**: es la misma regla que joins P2.
- E1: dije c. Acerté ordenando la tabla.
- E2: dije b. Acerté siguiendo el método de 571-579.
- E3: me tentó c (la wave a medias del Stage 4), pero la lista dice que dura 18 s. Dije d. Acerté.
- E4: dije a. Acerté (Max de 9,4 min frente a 28 s en el percentil 75).
- E5: dije c. Acerté. **Repetida por tercera vez**: la misma regla del LEFT.

**Qué me falta**
- Qué hago con la clave caliente (Remedios).
- Cómo abro este Spark UI para una ejecución programada que ya terminó (enlace a spark-ui.html#ejecucion-terminada).

---

## Contradicciones (entre páginas o con un simulador)
1. **Particiones de shuffle por defecto.** plan-ejecucion.html:308-320 dice 200, y desde DBR 19 auto-optimized shuffle si no fijas un número. shuffle.html:105-107 dice "o las que elija Databricks si no fijas un número", sin la condición de la versión. stages.html:348-350 coincide con Plan de ejecución.
2. **Photon por defecto.** El glosario (src/assets/glossary.json:141) dice "Activo por defecto en el compute clásico". arquitectura.html:229-231 añade que con la Clusters API o la Jobs API hay que activarlo a mano, y para mi job eso importa.
3. **Tabla pequeña.** plan-ejecucion.html:353-356 ("trozos de menos de 128 MB para acercarse a ese mínimo [cores]") frente al Stage 6 del Repaso (src/assets/js/repaso-fundamentos.js:27: 8 MiB en 2 tasks con 32 cores). Con solo lo que dice el sitio, no cuadra (ver "Lo que busqué fuera").
4. **"Cada `Exchange` abre un stage"** (plan-ejecucion.html:238) frente a "`BroadcastExchange`… no corta el stage del lado grande" (423-426).
5. **Número de estrategias.** joins.html:56 dice "Cinco estrategias" y src/_data/pages.yml:22 nombra cuatro.

## Qué se repite de más y quién debería ser el dueño
- **MB frente a MiB**: plan-ejecucion.html:357-361 y joins.html:162-165. Dueño: Plan de ejecución; Joins debería enlazar.
- **`auto` y particiones por defecto**: plan-ejecucion.html:308-346 (dueño), stages.html:17-22 y 348-357, shuffle.html:105-107.
- **Stage largo de 1 task**: stages.html:26-27, 374-383 y 442-443, más plan-ejecucion.html:605-614. Que haya un solo dueño (Plan de ejecución ya tiene la lista de causas).
- **Photon "no cambia quién planea"**: arquitectura.html:231-233 (dueño) y joins.html:236-239.
- **Regla del LEFT**: joins.html:21-23 y 136-140, más tres predicciones (joins P2, repaso R8 y E5). Dejaría una sola en el Repaso.

## Enlaces que faltan o que mandan fuera antes de tiempo
- Falta, temprano (Arquitectura o Plan de ejecución, "Dónde mirar"): cómo abrir el Spark UI de una ejecución de job ya terminada.
- Falta: la distinción entre job de Lakeflow y job de Spark.
- Falta: la línea de código para poner `auto`. Stages y Shuffle me mandan a Remedios, que está en otra sección.
- Antes de tiempo: AQE (plan-ejecucion.html:459-516, joins.html:213-233), el query profile (joins.html:243-248 y 487-489) y `ANALYZE TABLE`/predictive optimization (joins.html:599-600 y 651-655). Todos se usan antes de su página.
- Fuera, y demasiado hondo para mí: el código fuente de Spark en las cajas "Verifícalo" de Joins.

## Mi modelo mental al terminar
- Mi notebook corre en el driver. Las transformaciones arman un plan. Cada acción ejecuta todo su plan desde la lectura. En el Spark UI una acción puede salir como varios jobs por culpa de AQE [NO SEGURO: cómo encaja un stage "skipped" que aparece en dos jobs].
- El plan físico se corta en stages en cada `Exchange` de shuffle. El broadcast añade un stage para leer la tabla pequeña, sin shuffle del lado grande.
- Stage = una task por partición. Las particiones salen de la lectura (≤128 MB), de un shuffle (`shuffle.partitions`, o `auto` [NO SEGURO: cuál usa mi cluster]) o de `repartition`/`coalesce`.
- Duración de un stage ≈ waves × duración de una task. Más cores solo ayudan si quitan una wave. El skew es una task larga que nada de eso arregla.
- Shuffle = map tasks que escriben a disco local + reduce tasks que leen de todas. Mucho por task significa spill.
- Join = broadcast si el lado que se puede copiar cabe (10 MiB estimado o 30 MiB real con AQE). Si no, sort-merge [NO SEGURO: qué veré con Photon].
- [NO SEGURO] si mi job de 40 min está en serverless (sin Spark UI) o en un cluster clásico.

## Qué no sabría hacer con mi job después de la sección
- Abrir el Spark UI de la ejecución programada que ya terminó.
- Saber si mi job usa Photon y leer su plan de join.
- Poner `shuffle.partitions = auto` o saber qué valor usa ahora.
- Arreglar un skew (solo sé detectarlo).
- Diagnosticar si estoy en serverless (me mandan al query profile, que no he leído).

---

## Lo que busqué fuera
- **Cómo poner `auto` y si es lo mismo que auto-optimized shuffle.** La doc de AQE dice "Setting the value auto enables auto-optimized shuffle… Default value: 200" y "Databricks recommends you set spark.sql.shuffle.partitions=auto" ([Databricks · AQE](https://docs.databricks.com/aws/en/optimizations/aqe)). Las notas de DBR 19 dicen "Auto-optimized shuffle v2 is now used when you do not set a fixed number of shuffle partitions" ([DBR 19](https://docs.databricks.com/aws/en/release-notes/runtime/19)). No contradice a plan-ejecucion.html, pero el sitio debería decir en una frase que `auto` activa auto-optimized shuffle y dar la línea para ponerlo. shuffle.html:105-107 debería llevar la condición de DBR 19.
- **Spark UI de una ejecución terminada.** La API de Jobs dice "The Spark UI continues to be available after the run has completed" ([Get a single job run](https://docs.databricks.com/api/azure/workspace/jobs/getrun)). La pestaña *Spark UI* del compute está en [Debugging with the Spark UI](https://docs.databricks.com/aws/en/compute/troubleshooting/debugging-spark-ui). En el sitio está en spark-ui.html, pero creo que Fundamentos debería enlazarlo antes.
- **Nombres de los joins de Photon.** Solo encontré fuentes no oficiales: un hilo de la comunidad de Databricks menciona operadores como `PhotonBroadcastHashJoin` ([community.databricks.com](https://community.databricks.com/t5/data-engineering/how-to-know-which-join-type-was-used-broadcast-shuffle-hash-or/m-p/139680)). La doc oficial ([What is Photon?](https://docs.databricks.com/aws/en/compute/photon)) no da nombres, así que coincide con joins.html:252. Que el buscador devolviera "What is Photon?" también en /aws/en/runtime/photon puede indicar que la URL se movió; que lo mire `verificador-fuentes`.
- **Por qué 8 MiB dan 2 tasks.** La guía de Spark define `spark.sql.files.openCostInBytes` (4 MB): "The estimated cost to open a file… used when putting multiple files into a partition" ([Spark · Performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)). No da el algoritmo, pero ese suelo de 4 MB explicaría el Stage 6 del Repaso. plan-ejecucion.html:353-356 no lo menciona, y por eso me pareció una contradicción. Que lo verifique `verificador-fuentes`.
- **Azure, stage con shuffle alto**: [learn.microsoft.com · Spark stage high I/O](https://learn.microsoft.com/en-us/azure/databricks/optimizations/spark-ui-guide/long-spark-stage-io) (lo usé para confirmar la recomendación de `auto`).

---

## Recorrido
- **Orden en que las leería**: el del menú está bien (Arquitectura → Plan → Stages → Shuffle → Joins → Repaso). Si tuviera prisa con mi job, leería las secciones "Dónde mirar" de Arquitectura y Plan de ejecución e iría directo al Ejercicio del Repaso.
- **La que más me sirvió**: el Repaso, por el ejercicio stage → job → query → `Exchange` → línea. Para entender, Shuffle es la más clara.
- **Lo que una página usa y solo explica otra posterior** (según src/_data/pages.yml):
  - AQE (aqe.html, "Diagnóstico y remedios") se usa a fondo en plan-ejecucion.html:459-516, joins.html:213-233 y repaso E3/E5.
  - El query profile (query-profile.html, "Dónde mirar") se usa en arquitectura.html:235-236 y 272-273 y en joins.html:243-248 y 487-489.
  - Abrir el Spark UI de una ejecución terminada (spark-ui.html, "Dónde mirar") se usa en repaso-fundamentos.html:633-634 y 793-794.
  - Remedios (`auto`, qué hacer con el skew) se usa en stages.html:17-22 y 370 y en shuffle.html:425.
  - Mantenimiento de Delta (`ANALYZE TABLE`) se usa en joins.html:599-600 y 651-655.
  - Diagnóstico (Max frente al percentil 75) se usa en stages.html y shuffle.html.

Archivos leídos: /Users/hrpr/Documents/rote/spark-performance-lab/src/arquitectura.html, /Users/hrpr/Documents/rote/spark-performance-lab/src/plan-ejecucion.html, /Users/hrpr/Documents/rote/spark-performance-lab/src/stages.html, /Users/hrpr/Documents/rote/spark-performance-lab/src/shuffle.html, /Users/hrpr/Documents/rote/spark-performance-lab/src/joins.html, /Users/hrpr/Documents/rote/spark-performance-lab/src/repaso-fundamentos.html, /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/glossary.json, /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/app.js, /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/arquitectura.js, /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/plan-ejecucion.js, /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/joins.js, /Users/hrpr/Documents/rote/spark-performance-lab/src/assets/js/repaso-fundamentos.js, /Users/hrpr/Documents/rote/spark-performance-lab/src/_data/pages.yml.