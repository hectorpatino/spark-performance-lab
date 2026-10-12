# Informe de ingeniero-junior sobre Fundamentos (5 páginas)

Utilidad: arquitectura 4 · plan-ejecucion 4 · stages 4 · shuffle 4 · joins 5. Predicciones: 23, 18 aciertos, 5 fallos (show() lee 1 partición; join sort-merge = 3 stages; broadcast en job aparte (a medias); M1 escribe 1 archivo con bloques; exploding 10×10 = 5×). En los cinco la explicación le sacó del error. Varios aciertos no fueron suyos: la respuesta estaba escrita justo antes (arquitectura.html:87-88 antes de la predicción de count(); título del Simulador 1 de stages:74-75; plan-ejecucion.html:58 y :111-114 antes de sus dos predicciones).

## Dónde se perdió

### arquitectura
- :24-25 "Solo admite APIs de Spark Connect, no la API de RDD": RDD sin explicar ni en glosario (también :266, shuffle:68-72, joins:507-509).
- :52-54 Spark master = "el proceso del driver que coordina a los executors" ≈ la frase del driver (:45); :277-278 dice que son distintos. No entiende qué hace.
- :87-88 "la task que suma los conteos espera a las 16": da la respuesta antes de la primera predicción.
- :89-94 viñeta de AQE con cuatro ideas (jobs por acción, AQE, tasks tras shuffle, tipo de join): pronto para la primera página.
- :110-111 "Un shuffle pequeño lleva los 16 conteos": shuffle antes de su página (glosario lo cubre).
- :259 "Serverless y compute estándar usan Spark Connect": ¿estándar = clásico (:248)? ¿tiene Spark UI?
- :236-238 display() explicado pero no dice cuántas particiones lee ni cuántos jobs lanza; ¿es una acción?
- Falta: cómo saber en qué compute corre su job y si tiene Spark UI.
- Buscó fuera: standard = modo de acceso del compute clásico (compute/standard-limitations: "RDD APIs are not supported").

### plan-ejecucion
- :14-59 "Lo esencial en 1 minuto" tiene 7 viñetas; :33 "plan físico" se define en :51-52; :37-41 partial_sum y Exchange antes de saber leer un plan (:353).
- :51-52 "linaje" y "Catalyst" nombrados, no explicados ni en glosario.
- :283-300 y :306-318: la celda del shuffle mezcla 200, auto, DBR 18, DBR 19, serverless y AQE; el párrafo de auto repite casi lo mismo.
- :317-318 reglas "múltiplo de cores" y "128–200 MB" que aún no ha visto.
- :319-328 minPartitionNum y default.parallelism: le sobra.
- :435-438 skipped enlaza a shuffle#archivos-intermedios, que no menciona "skipped".
- app.js:335-341 DAG join broadcast usa `clientes_vip`, tabla no presentada (el título solo dice ventas y clientes).
- Numeración: árbol Job 0 / Stage 0; DAG y Simulador 3 de stages Job 1 / Stage 1.
- Predicción fallida DAG join sort-merge (dijo 2 stages): la idea "un Exchange en cada lado" está en :382, después del simulador.
- Falta: cómo consultar el valor de shuffle.partitions de su compute (spark.conf.get); si display() es acción.

### stages
- :15 ⌈tasks ÷ cores⌉ sin decir "redondear hacia arriba" (solo en el tooltip).
- :74-75 título del Simulador 1 da la respuesta a la predicción de debajo.
- :256-258 "Con join broadcast… el grande no espera ningún shuffle" vs el veredicto del simulador (app.js:932 deps:[1]: "Stage 2 empieza… justo cuando termina el Stage 1"). ¿Espera o no? Además ahí ambos stages en "Details for Job 1"; en plan-ejecucion el broadcast era "Job aparte".
- app.js:965 "scheduler por defecto (FIFO)": FIFO sin explicar.
- :361-363 "compara sus tasks con los cores totales": no dice dónde ve los cores totales ni las tasks de un stage (buscó: Spark Web UI, pestaña Executors muestra cores).
- Glosario Event Timeline: "7 fases" sin explicar.

### shuffle
- :12-13 y :47-48 "serializa"/"serialización" sin explicar.
- :26-27 spill antes de explicarse (:181-183; glosario cubre).
- :68-72 RDD otra vez.
- :184-186 #archivos-intermedios no dice "por eso ves stages skipped".
- :212-214 "en el lab el max sufría menos": lab es página 13.
- :238-239 "regla práctica de Remedios 128–200 MB": página posterior.
- :294 "Input" usado antes de definirse (:355-356).
- :279 "1 executor y después 8: ¿qué viaja por red?": el simulador supone 1/E local (app.js:270) y no se explica.
- Falta: dónde ver partial_sum en el plan real (el simulador solo dice HashAggregate; no enlaza plan-ejecucion#explain).

### joins
- :48-51 "examen Data Engineer Professional": no sabía que era para un examen; no le sirve para su job.
- :65-67 "lado build" usado antes de definirse (:101).
- :74-76 CartesianProduct "No (solo INNER / CROSS)": dos ideas en una celda.
- :114 LEFT SEMI/ANTI en la tabla, definidos en :120.
- :127-130 por qué no se puede copiar la izquierda de un LEFT: falta el porqué.
- :147-149 "estadísticas": qué son y cómo ver si están viejas; el enlace va a la página 15.
- :185-189 Photon "sustituye el sort-merge… en serverless es normal no ver SortMergeJoin": ¿y en clásico (Photon por defecto)? ¿qué nombre tiene el nodo? Toda la sección enseñó a buscar SortMergeJoin.
- :246-247 "1.0 MiB" vs MB en el resto.
- :318-319 "log del driver": dónde está.
- :336-337 SET autoBroadcastJoinThreshold = -1: ¿por qué querría hacerlo?
- :544-674 autoevaluación de toda la sección dentro de joins, entre Qué pasaría si y Dónde mirar: esconde el Dónde mirar de joins detrás de 5 preguntas que no son de joins.
- Buscó fuera: Photon "Photon operators appear in orange in the query DAG visualization" (compute/photon) — la página debería decirlo; "For classic all-purpose compute, jobs compute, and classic Lakeflow pipelines, Databricks enables Photon by default" — no encontró la condición "si creas el compute desde la UI" de joins:185-186 (que lo mire verificador). Nombres de nodo Photon: solo fuente comunitaria.

## Repeticiones (dueña según el junior)
- toPandas/collect "más workers no ayudan": arquitectura :22-23, 27-29, 143-161, 292-295, 313-315 (5 veces en una página: sobra); joins autoevaluación (repaso, bien) — arquitectura.
- Una task por partición: muchas veces, ayudó — plan-ejecucion#particiones.
- Narrow/wide/Exchange: plan :27-34, 259-266, 373-375 (tres veces sobra un poco); shuffle :177-180 repaso útil.
- El stage siguiente espera: ayudó — stages (Sim 3).
- Wave no es barrera: arquitectura :82-86 prematuro, le quitó la sorpresa del Sim 1 — stages.
- Agregación parcial: arquitectura.js:19, plan :35-41 (antes de saber leer un plan), plan-ejecucion.js:54, shuffle :188-221 (la buena) — shuffle.
- count() vs groupBy().count(): arquitectura :110-113; plan :42-50, 111-114, 162-166, 389-391 (4 veces en plan: sobra) — plan.
- Una acción = varios jobs: arquitectura :89-94, 225-226; plan :22-23, 84-86, 212-216, 413-422, 458-459; glosario job y acción. ~9 veces y nunca lo ve en un simulador — plan#varios-jobs + aqe.
- shuffle.partitions 200/auto/DBR 18/DBR 19: plan :215-216, 283-300, 306-318, 375-379; plan-ejecucion.js:170; stages :17-20, 226-228, 327-332; shuffle :22-24, 102-104, 344-346. "Me confundió más cada vez" — plan#particiones (default) y remedios#auto (cómo elegir).
- Serverless sin Spark UI → query profile: varias, útil como recordatorio corto.
- BroadcastExchange no corta stage: ayudó — joins.
- coalesce/repartition: bien (shuffle enlaza).
- Skew: repaso aceptable.
- Nota "¿Ya tienes un job lento?": arquitectura :31-33 y :320-322 (dos veces); la de arriba le empujó a saltarse Fundamentos ("no fui porque la ruta usa stages, shuffle y skew"). Una vez al final de cada página.

## Enlaces que faltan
shuffle:184-186 (#archivos-intermedios) "por eso ves stages skipped"; shuffle:177-180 Exchange → plan#explain; simulador de agregación parcial (app.js:300) → plan#explain (partial_count); stages:256-258 join broadcast → joins#como-decide; stages:361-363 → pestaña Executors; plan#particiones: cómo consultar el valor (spark.conf.get); joins:185-189 cómo saber si usa Photon (operadores en naranja en la DAG); joins:318-319 log del driver; arquitectura:259 "compute estándar".
Enlaces que mandan fuera antes de tiempo: arquitectura:31-33 (nota de arriba); shuffle:212-214 (lab); plan:317-318 y shuffle:238-239 (Remedios); joins:147-149, 484, 535 (mantenimiento-delta).

## Orden
- arquitectura usa shuffle y "2 stages" (:110-113), partición (:78), AQE (:89-94).
- plan-ejecucion usa agregación parcial/partial_sum (:35-41), archivos de shuffle y skipped (:137-140, :435-438), SortMergeJoin/BroadcastExchange (:380-383 y DAG), reglas de múltiplo y MB (:317-318), AQE (:413-422).
- Sin explicar en ninguna de las 5 ni en glosario: RDD, serialización, Catalyst (solo nombrado), linaje (una frase), Spark master, compute estándar, FIFO, MiB, estadísticas.
- Orden del menú: correcto; plan-ejecucion es la más pesada (la leyó dos veces); no debería adelantar agregación parcial, archivos de shuffle ni reglas de particiones.

## Modelo mental (dudas marcadas)
1-2. Transformaciones anotan plan; acción toma el linaje, Catalyst optimiza, plan físico visible con explain(). [NO SEGURO: si display() cuenta igual]
3. Stages en cada Exchange de shuffle; broadcast no corta. [NO SEGURO: broadcast en job aparte o mismo; plan-ejecucion y stages lo muestran distinto]
4. Una task por partición; 128 MB al leer; shuffle.partitions (200 o auto según compute).
5. Core libre toma la siguiente; waves × duración; la task más lenta marca el final.
6. Shuffle: un archivo por map task partido por destino; reduce lee su trozo de todos; N+1 espera a N.
7. AQE tras cada shuffle ve tamaños reales; une particiones o pasa a broadcast; por eso varios jobs. [NO SEGURO: cuándo salen varios jobs y cuándo uno]
8. Resultado al driver o al almacenamiento.

## Hueco
Después de la sección no sabe encontrar en el Spark UI cuál de los stages es el lento: todo manda a spark-ui#ruta-diagnostico (página siguiente).
