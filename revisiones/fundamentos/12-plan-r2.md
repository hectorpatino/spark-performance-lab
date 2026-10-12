# Plan ronda 2 — Fundamentos (junior r2 → pedagogo + editor + experto-motor-spark)

Evidencia: hub/11-junior-r2.md. Citas del experto: scratchpad/motor/*.txt y scratchpad/dl3/*.

## A. Componente "Predice y comprueba" (hub: app.js + style.css; redactores: marcado)
Problema: las opciones no se pulsan, el botón destapa a la vez comprobación y explicación, y 8 respuestas seguidas son la b.
Nuevo patrón (inspirado en el de casos, app.js:~890-899):
```html
<div class="guess q" data-guess data-answer="c">
  <div class="guess-cover">
    <p><b>Predice:</b> …</p>
    <div class="guess-opts" role="group" aria-label="Opciones">
      <button type="button" data-opt="a">a) …</button> …
    </div>
  </div>
  <div class="guess-fb" data-for="a" hidden><p><b>a) No.</b> Suponías {modelo}; falla porque {causa}.</p></div>
  … (una por opción; la correcta: «<b>c) Sí.</b> …»)
  <div class="guess-body" inert hidden>
    <p><b>Compruébalo:</b> …</p>
    <p>{explicación completa}</p>
  </div>
</div>
```
JS: al pulsar una opción se marca (correcta/incorrecta), se muestra SOLO su feedback y el botón "Ver explicación completa", que destapa guess-body. Se puede cambiar de opción. Repartir la letra correcta (no todas b).
Distractores con modelo real: arquitectura "6 drivers" → «Va el doble de rápido y deja de fallar»; joins exploding → «10 filas por clave a cada lado: ¿cuántas salen por clave?» a) 10 (lookup) b) 20 (suma) c) 100 (producto); DAG de plan-ejecucion con opciones por query (p. ej. smj: a) 2 stages "el join es un shuffle" b) 3 c) 1 "el join no mueve datos").

## B. Respuestas escritas antes de predecir (redactores)
- arquitectura.html:82-88: quitar "Cada core toma la siguiente… sin trabajo" y "En count(), la task que suma… espera a las 16". Queda: «Como hay más tasks que cores, 4 esperan su turno (cómo se reparten: stages.html#waves)» y «Lo que sí espera es el stage siguiente: no empieza hasta que el anterior termina todas sus tasks».
- arquitectura: reducir a 1 predicción antes del simulador (count); show() y toPandas pasan a "Después, explora" (sin respuesta) o se reescriben (ver F).
- stages.html:74-75 título → «Simulador 1 · Cómo reparte el scheduler las tasks de un stage».
- stages.html:51-58 analogía "turnos" → «cada cocinero coge el siguiente plato de la pila en cuanto acaba el suyo; contar turnos (20 ÷ 8 → 3) solo sirve para estimar cuánto tardará la cocina».
- plan-ejecucion.html:111-114: dejar «**shuffle.partitions:** las tasks del stage que viene después de un shuffle por clave (`groupBy`, `join`, `orderBy`)» y quitar el resto. plan:42-50 (viñeta de los dos count en Lo esencial): quitar. plan:58: o se quita de Lo esencial o la predicción 1 pide aplicarlo a un caso nuevo (p. ej. «El Job 1 lee `ventas` y además hace join con `clientes`: ¿cuántos stages leen una tabla?»).

## C. Datos (experto-motor-spark; textos listos en su informe, resumidos)
Impreciso → corregir:
1. joins:19-21 "Nunca se hace broadcast del lado que conserva": «En un join con igualdad, Spark no copia el lado que conserva todas sus filas: el izquierdo de un LEFT, el derecho de un RIGHT, ninguno en un FULL. Los joins sin igualdad son otra historia (ver Cómo decide Spark).»
2. Broadcast (stages:256-258; app.js:341; Sim 3 y DAG): «Con join broadcast no hay shuffle, pero sí una espera: cada task de `ventas` necesita la copia entera de la tabla pequeña, así que el stage que lee `ventas` y hace el join arranca cuando el broadcast está listo. Spark limita esa espera con `spark.sql.broadcastTimeout` (300 s por defecto).» Fuente Spark tuning #optimizing-the-join-strategy (sin par Databricks). app.js:341 quitar "normalmente lo verás como un job aparte": «Si el broadcast sale como un job aparte o dentro del mismo job no lo dice la doc. Para encontrarlo, abre la query en la pestaña SQL / DataFrame: su página lista todos los jobs y stages de esa query.» DAG y Sim 3 deben contar los jobs igual (hub). `clientes_vip` → presentar en los títulos o cambiar a `clientes`.
3. app.js:965 FIFO → «Los Stages 1 y 2 no dependen entre sí: el Stage 2 arranca en cuanto quedan cores libres, sin esperar a que el 1 termine.» (quitar FIFO).
4. plan:58, :133-134, plan-ejecucion.js:171 "Sin cache() recalcula desde la lectura" → «Sin `cache()`, cada acción vuelve a ejecutar su plan desde la lectura. Solo se salta los stages cuyo shuffle ya está escrito, que el Spark UI muestra como *skipped*.»
5. plan:446-448 cache(): añadir «(En compute clásico. En serverless, `df.cache()` y `df.persist()` no están soportados y lanzan una excepción.)» Fuente compute/serverless/limitations + Azure.
6. arquitectura:52-54 y :276-278 Spark master/cluster manager: QUITAR la fila y la viñeta (editor + pedagogo; no se usan en otro sitio).
7. arquitectura:230-231 "executors viven mientras vive la aplicación" → «Cada aplicación tiene sus propios executors. En Databricks, si el compute tiene autoscaling, los workers y sus executors se añaden y se retiran según la carga.» Fuente compute/configure#autoscaling + Azure.
8. arquitectura:223-224, :20-21 "hasta la acción no se lanza ningún job" → añadir «La excepción es leer CSV o JSON con inferencia de esquema: Spark recorre los datos una vez para deducir el esquema.» Fuentes PySpark DataFrameReader.csv y one-spark-task + Azure.
9. arquitectura:259-263 compute estándar → «**Serverless siempre usa Spark Connect, y el compute estándar a veces.** *Compute estándar* es un compute clásico con modo de acceso *Standard*, que varios usuarios comparten con los datos aislados entre ellos; es el modo que Databricks elige por defecto desde Databricks Runtime 14.3. En él usan Spark Connect los notebooks de Python desde DBR 14.3 y los de Scala desde 13.3. Sigue teniendo Spark UI, pero los logs del driver solo los ven los admins.» Fuentes connect-vs-classic, compute/configure#access-modes, compute/clusters-manage (Spark UI), debugging-spark-ui (logs), cada una con par Azure.
10. plan:382-383 y shuffle:58 "SortMergeJoin → Exchange en cada lado" → «normalmente hay un `Exchange` en cada lado. Si un lado no lo tiene, sus datos ya llegaban repartidos por la clave: compruébalo en el plan.»
11. joins:154-156 → «**Si no, `SortMergeJoin` en el plan de Spark.** … En Databricks, Photon (activo por defecto) cambia el sort-merge por hash joins propios al ejecutar.»
12. joins:185-189 Photon (texto completo en el informe del experto): activo siempre en serverless y SQL warehouses; por defecto en clásico (con Clusters/Jobs API hay que activarlo, `runtime_engine = PHOTON`); el plan lo hace Catalyst; Photon "replaces sort-merge joins with high-performance hash joins", así que también en clásico puedes no ver SortMergeJoin; para saber qué corrió en Photon: en la DAG de la pestaña SQL / DataFrame sus operadores salen en naranja y los de Spark en azul; en el query profile, Execution Details da el % de tiempo en Photon; insight COVERAGE_PHOTON; la doc no lista los nombres de los nodos de join de Photon. NO decir que umbral y AQE siguen aplicando; joins:501-503 → «Photon no cambia quién planea la query».
13. joins:176-180 AQE runtime → con condiciones: «Cuando terminan los shuffles de los dos lados, Databricks conoce el tamaño real de cada uno. Si el lado que el tipo de join permite copiar queda por debajo de `spark.databricks.adaptive.autoBroadcastJoinThreshold` (30 MB por defecto), AQE puede cambiar el SortMergeJoin por un BroadcastHashJoin. No lo hace si un hint pide otra estrategia ni si ese lado tiene demasiadas particiones vacías. Además, AQE solo actúa en queries que no son streaming.»
14. shuffle:17-18 y :177-180 → «…Ahí AQE conoce los tamaños reales y puede re-planificar lo que falta, en queries que no son streaming. No siempre cambia el plan.»
15. joins:517-518 skew → «AQE puede partirla en joins con shuffle (sort-merge o shuffle hash) si supera 5 veces la mediana y 256 MB, y solo en el lado que el tipo de join permite.» (enlace aqe#skew si existe; si no, aqe.html).
16. plan:320-326 minPartitionNum → simplificar (editor/pedagogo) a una frase: «Al leer, Spark junta archivos pequeños, parte los grandes e intenta tener al menos tantas particiones como cores de los executors (o 2, si hay menos); en single node, los cores de la máquina. Por eso la misma tabla puede dar otro número de tasks en otro compute.» Confs en Fuentes (incluida leafNodeDefaultParallelism).
17. Default shuffle.partitions (UNA sola vez, plan#particiones): «200 en Apache Spark y según la doc de AQE de Databricks. Desde Databricks Runtime 19, si no fijas un número, se usa auto-optimized shuffle; en serverless el valor por defecto es `auto`. Para ver el tuyo: `spark.conf.get("spark.sql.shuffle.partitions")` o `SET spark.sql.shuffle.partitions;`.» (fuentes spark/conf#get y sql-ref-syntax-aux-conf-mgmt-set con Azure). El párrafo `auto` y la regla de elección → remedios#auto (enlace). Quitar repeticiones: plan:214-216 (nota del árbol, deja solo enlace), plan:306-318, plan:375-379 (deja "Ese 200 es spark.sql.shuffle.partitions (ver #particiones)"), plan-ejecucion.js:170 (una frase + enlace), stages:17-20 (deja la regla del múltiplo con enlace a #cuantas-tasks), stages:226-228 («los mismos números que en el simulador de Plan de ejecución»), shuffle:22-24 (una línea con enlace), shuffle:344-346.
18. plan:262 y :449-450 WholeStageCodegen → añadir «(sin Photon). Con Photon, esos operadores los ejecuta Photon y en la DAG del Spark UI salen en naranja.»
19. shuffle:128-130/:168-172 un archivo por map task → añadir «Así lo describe la doc de Spark. Photon usa su propio shuffle columnar, y la doc no detalla cómo son sus archivos.»
20. joins:318-319 log del driver → «Spark ignora el hint, deja un warning (`HintErrorLogger`) en el log del driver y sigue con su elección. El log está en la pestaña *Driver logs* del compute; en compute con modo de acceso Standard solo lo ven los admins del workspace. Lo que sí puede ver cualquiera es el plan final.» Fuentes sql-ref-syntax-qry-select-hints y compute/troubleshooting/debugging-spark-ui#driver-logs con Azure.
21. stages:67-68 → añadir «(Spark puede esperar hasta 3 s, `spark.locality.wait`, a que quede libre un core cerca de los datos de esa task)».
22. plan-ejecucion.js:62 orderBy+show → «`orderBy` seguido de `show()` no necesita ordenar toda la tabla: Spark se queda con las primeras filas de cada partición y las junta (operador `TakeOrderedAndProject`). Puede haber un shuffle pequeño, pero no un orden global.»
23. plan-ejecucion.js:63 muestreo → «Por el `orderBy`, Spark reparte por rangos, y para decidir los rangos toma una muestra de los datos (la doc lo explica en `repartitionByRange`). En el Spark UI ese muestreo puede verse como un job corto; la doc no lo dice.»
24. Glosario (hub): Exchange, shuffle hash join, AQE (textos del experto); job/acción "suele" → "puede"; añadir RDD («API original y de bajo nivel de Spark, anterior a DataFrame; serverless y el compute estándar no la admiten»), serialización, Catalyst, FIFO no (se quita); Event Timeline sin "7 fases"; linaje → usar "plan" en las páginas (no hay definición oficial).
25. joins:16-17 → «10 MB en Apache Spark (Databricks no documenta otro valor)».

Sin fuente → reescribir:
- show(): «`show()` muestra 20 filas por defecto. Como solo necesita unas pocas, Spark no suele leer toda la tabla; cuántas particiones lee no lo documentan ni Spark ni Databricks (en el Spark UI lo ves en las tasks de su stage).» Quitar "pide 21" y "lee primero una partición". Simulador show: "1 stage · 1 task (ilustrativo)". La predicción de show se quita o pasa a exploración.
- display(): «`display(df)` también es una acción, igual que `show()`» (fuente pyspark/#data-processing + Azure) + lo de 10.000 filas / 2 MB.
- Varios jobs (plan#varios-jobs): «AQE solo reparte una query si no es streaming y tiene al menos un `Exchange` o una subquery; una query sin shuffle (filter + select + write) no la toca. Con shuffles, AQE la ejecuta por *query stages*, y el Spark UI puede mostrar varios jobs para la misma query. Cuántos no lo dice la doc: no cuentes jobs; abre la query en la pestaña SQL / DataFrame y cuenta sus stages que no estén *skipped*.» Quitar arquitectura:89-94 entero (una frase con enlace) y "no añade trabajo".
- skipped: mantener + cita guía de RDD con etiqueta; añadir en shuffle#archivos-intermedios «Por eso, en el Spark UI, un stage cuyo shuffle ya está escrito sale como *skipped*.»
- "El stage siguiente espera a todas": citar guía de RDD (all-to-all) con etiqueta.
- count() → 1 task / Exchange SinglePartition: sin fuente literal; dejar como observable ("lo verás en el Spark UI") o verificar ejecutando (decisión del usuario).
- "128 MB ya comprimidos" → «Los 128 MB cuentan bytes de archivo. En memoria, esas mismas filas suelen ocupar más (ver Memoria y OOM).»
- shuffle:185-186 "un fallo en un stage posterior…" → quitar.
- shuffle:307-308 "Spill (memory) siempre mayor" → «Suele ser mayor que el de disco, porque en disco los datos van serializados; no es un error.»

## D. Deduplicación y estructura (editor + pedagogo)
- arquitectura: quitar nota de arriba (:31-33); quitar :292-295 (repite predicción 3; su frase útil pasa a Dónde mirar); quitar spot (:257-258); viñeta AQE (:89-94) → una frase con enlace; Lo esencial :24-25 sin RDD («manda el plan a un servidor remoto (Spark Connect)»).
- plan-ejecucion: Lo esencial a 4 viñetas (lazy/acción→job; narrow/wide y Exchange; una task por partición; sin cache se recalcula el plan); :35-41 y :42-50 fuera; :51-55 (linaje/Catalyst) a la tabla, fila Plan lógico; nota :11-13 debajo de essentials o quitarla; subir "Cómo funciona por dentro · De la acción a las tasks" (:254-271) delante del DAG; un solo enlace pyspark/#data-processing con su az en :17-26.
- stages: "Dónde verlo · Las waves en el Spark UI" (:335-338) se fusiona en Dónde mirar; Dónde mirar: dónde ver tasks (lista de stages, "Determine the number of tasks by looking here" — long-spark-stage + Azure) y cores (pestaña Executors, "Each row shows resource usage (memory, disk, cores)" — Spark web UI); app.js:987 "La UI no muestra cores" → «En esta vista no hay cores; están en la pestaña Executors».
- shuffle: título del sim #agregacion-parcial → «Simulador · Cuánto ahorra la agregación parcial»; definir serialización en línea (:46-48: «serializa (convierte las filas en bytes para escribirlas o enviarlas)»); Input en la fila :293-295; quitar "en el lab" (:212-214) → «Por eso una ventana (`Window`) mueve mucho más que un `max`…» (verificar con experto si se mantiene "ventana sin agregación parcial"; si no, quitar ventana); :237-239 atribuir 128–200 MB a la guía de optimización de Databricks con enlace a remedios#auto; :177-180 una frase con enlace a plan#explain; pie del sim: «supone que cada executor tiene la misma parte» (hub, app.js:270); fuentes faltantes (PySpark coalesce, notebook-export-import).
- joins: quitar párrafo del examen (:48-51); h3 nuevo antes del simulador js-* «Simulador · Qué estrategia sale según tamaños, tipo de join y hints»; build/stream y SEMI/ANTI definidos antes de usarse; :74-76 dos ideas en una celda; :127-130 añadir el porqué de no copiar la izquierda de un LEFT (si hay fuente; si no, dejar); :336-337 motivo del -1 (si hay fuente); MiB: nota en el pie del simulador «Los tamaños salen en MiB, como en el Spark UI (1 MiB ≈ 1,05 MB)»; Fuentes completas y con el mismo formato que las demás (comas y punto final); alinear anclas Databricks/Azure de AQE FAQ y spark/conf.
- Autoevaluación: sale de joins.

## E. Hub (archivos compartidos)
- Componente guess nuevo (A).
- app.js: broadcast (C2), FIFO (C3), "tarea"→"task" (:293), pie sw-* con enlace a plan#explain y supuesto 1/E, numeración Job/Stage desde 0 en DAG y Sim 3 (colores `(id-1)%4` → `id%4`), "La UI no muestra cores", MAPEX/REDEX a 2 executors (pedagogo 3.E) y 80 map tasks en el sim de agregación parcial (pedagogo: 200 map = 200 particiones sugiere reduce = map).
- glossary.json (C24).
- spark-ui.html:255 id="logs".
- _data/pages.yml + página nueva repaso-fundamentos.html (si se aprueba).

## F. Creencia "más workers nunca ayudan" (pedagogo 3.F)
- Contracaso en stages o repaso: «Stage de 48 tasks de 10 s en 4 workers × 8 cores (32 cores). Pasas a 6 workers (48). ¿Cuánto tarda?» a) 20 s, igual (workers nunca ayudan) b) 13 s (proporcional) c) 10 s (correcta: de 2 waves a 1).
- arquitectura, en lugar de :292-295: «`df.groupBy('pais').count().toPandas()` sobre 1 TB con 50 filas de resultado: ¿ayudan más workers?» Sí: el trabajo pesado corre en los executors y al driver solo llegan 50 filas.

## G. Repaso de la sección
Página nueva `repaso-fundamentos.html` al final de Fundamentos (pages.yml), con el componente nuevo y preguntas de TRANSFERENCIA (no copias de las predicciones): contracaso de 48 tasks; «¿cuántos bloques lee cada reduce task con 100 map tasks?»; broadcast + groupBy con 80/200; toPandas tras agregar; etc. (pedagogo 6). Dónde mirar de joins vuelve a ser lo último antes de Fuentes.

## H. Pendiente / fuera de alcance
- Puente Fundamentos → Spark UI (query smj en Jobs → Stages → Executors): dueño spark-ui; requiere experto-observabilidad. No en esta ronda.
- Mover #particiones a stages: no (se simplifica en su sitio).
- Fuera de mi tema del experto: observabilidad (query.history, HISTORY_BASED_JOIN_STRATEGY, Event Timeline, recreación DAG), delta (write 1 stage·16 tasks con optimized writes; estadísticas), plataforma (spot on-demand, examen).
