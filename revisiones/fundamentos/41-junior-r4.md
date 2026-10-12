# Ingeniero-junior r4 (resumen fiel)

Utilidad: arquitectura 4 · plan 4 · stages 4 · shuffle 3 · joins 4 · repaso 4. Predicciones 31: 25 aciertos, 6 fallos (en los 6 el comentario le sacó del error).
Fallos: arq P2 toPandas 50 filas (dijo a; buena trampa); plan P1 (dijo b; comentario usa cache() :114/:117 antes de explicarse :508); plan P2 (dijo b por arquitectura "count lee shuffle"; le sacó "por clave"); DAG bhj (dijo 1; duda "puede salir en otro job"); stages Sim1 (dijo a 8; comentario muy bueno); joins P2 RIGHT (dijo b; tabla :114-127 sin fila RIGHT, espejo solo en respuesta :350-353); repaso 6 (dijo b por shuffle.html:394; contradicción).
Aciertos regalados o fáciles: stages 64/256 (:155-156 arranque 0,5 s casi da respuesta); stages 48 tasks (esencial :22); shuffle 10 particiones (opción b trae su explicación, c dice "Siempre"); repaso E2 (E1 :451 dice "celda 4"); E3 (comentario E1 dice Stage 4 dura 1 s).

## Dónde se perdió
arquitectura: :25 y :225-254 Spark Connect/compute estándar/modo Auto = "otra página dentro"; :80-83 AQE por tramos + muestreo orderBy antes de saber shuffle; :220 "core lógico" sin definir; Photon no se menciona (es su motor).
plan: :41-43 nota "me costó varios días" no aporta; :79 HashAggregate y SortMergeJoin en tabla antes de explicarse; :101-104 pregunta nombra filter/withColumn del notebook que solo está en el simulador de debajo; :114, :117-118 cache() antes de :508 (no en glosario); :233-235 Photon de pasada; :303-321, :333-334 auto/DBR19/spark.conf.get: hay que leer dos veces; :342-347 "al menos tantas particiones como cores" vs 128 MB [NO SEGURO cuál gana]; :421-426 manda a aqe#una-accion-dos-jobs (6 páginas más adelante); :447-463 "Job vs acción" demasiadas ideas; :459 "no cuentes jobs, abre SQL/DataFrame" vs :525-532 "ordena jobs por duración": ¿qué primero?; :476-492 skipped largo.
stages: :17-21 múltiplo y auto en esencial antes de explicar auto (:349); :153-157 arranque 0,5 s da respuesta; :245-251 Sim 3 asume join broadcast (página 5).
shuffle: :14 map/reduce task en esencial (glosario ok); :27 "mucho write con spill 0 es sano" antes de saber métricas; :327 "Summary Metrics" sin decir dónde (lo entendió en repaso :581-583); :332-334 y :394-395 regla Write≫Input → falta agregación parcial compara bytes (contradice repaso); :334 "explosión de filas" sin definir.
joins: :14 "Broadcast copia el lado pequeño" prepara el error; :20 "lado que conserva todas sus filas" opaco en esencial; :23, :192 "hint" sin definir ni glosario; :105-111 SEMI/ANTI de golpe; :114-127 falta fila RIGHT; :159-164, :183-190, :218-222 confs e insights avanzados (maxShuffledHashJoinLocalMapThreshold, nonEmptyPartitionRatio, HISTORY_BASED) le sacan del hilo; :234-264 caja Photon clave pero escondida en página 5; :455-457 "mira el plan después de ejecutar" sin clic exacto (query → Details → Final Plan) [NO SEGURO]; :589, :646 predictive optimization, managed UC.
repaso: :106-107 "Suponías que Spark guarda solo lo que ya calculó" ambiguo; :440-442, :451 E1 dice "celda 4" antes de E2; :457, :549, :557-558 (js:21) Stage 4 con 1 task sin explicar (AQE unió 200 particiones de 210 KiB) — contradice pregunta 3 (200) y "1 task = señal de problema" (stages:24, :376, plan:555); :522-540 tres pistas stage→celda sueltas, no encadenadas ("Associated Job Ids = 4 → busca Job 4 en Spark Jobs de cada celda"); :581-583 Summary Metrics por fin explicado.

## Contradicciones
1. shuffle:332-334, :394-395 "Shuffle Write ≫ Input → falta agregación parcial o join multiplica" vs repaso:287-289, :301-304 (marca "falta agregación parcial" incorrecta; comparar filas, no bytes). En bytes ambas pueden ser ciertas (Parquet comprimido). Verificar.
2. plan:459 "no cuentes jobs" vs :525 "ordena jobs por duración".
3. broadcastTimeout 300 s en app.js:351 y stages:281-284, no en joins.
4. "1 task = señal de problema" vs Stage 4 del repaso normal sin explicar.

## Repeticiones (dueña)
- varios jobs: arquitectura :79-83, :180-181; plan :16-17, :65-66, :212-216, :447-463; glosario; simulador árbol → plan#varios-jobs.
- count() 1 task: arquitectura y plan → plan#explain.
- lazy/acción: arquitectura y plan → plan.
- serverless sin Spark UI: arquitectura :252-254, :332-334; stages:414; shuffle:359; joins:476 → arquitectura#serverless, media línea en las demás.
- Photon: plan:233, pie DAG, shuffle:187-195, joins:234-264, repaso ×3 → debería ser ARQUITECTURA (afecta a todo el plan), detalle en joins.
- "guía de optimización de 2023; no es documentación oficial" >10 veces: ruido.
- nota final "¿Ya tienes un job lento?" ×5: ok pero se repite.
- LEFT no copia izquierda ×4 en joins.

## Enlaces
Fuera antes de tiempo: plan:424, :490 → aqe#una-accion-dos-jobs; plan:234 → joins#photon; plan:294, :341 → aqe, remedios#auto; shuffle:341, :381, :397 → diagnostico#summary-metrics sin explicar Summary Metrics; joins:449-451, :533, :623 → casos ×4; plan:152-157 enlaces a doc de Spark dentro del comentario de predicción.
Faltan: shuffle:327 Summary Metrics → dónde se explica; repaso Stage 4 → aqe#otras-funciones; plan:114 cache() → "Qué pasaría si" (:508, sin id); joins sin broadcastTimeout; arquitectura sin Photon; ninguna enlaza cómo abrir el Spark UI de una ejecución de job programado.

## Orden
Menú razonable, repaso al final bien. plan-ejecucion usa shuffle/joins antes (DAG smj/bhj, BroadcastExchange, SortMergeJoin, Photon); stages Sim 3 usa joins. Se aguanta con glosario. Una línea de Photon en arquitectura ("tu cluster probablemente usa Photon; aquí verás los nombres sin Photon").

## Hueco
1. Abrir el Spark UI de una ejecución terminada de un job programado.
2. Ir del stage lento a la línea de código con varios joins/groupBy: leer la clave del Exchange (hashpartitioning(cliente_id, …)); el DAG SQL muestra el stage ID en los nodos ("this block took 2.1 minutes and even provides the stage ID", slow-spark-stage-low-io). El ejercicio va de código a stages, al revés.
3. Si usa Photon y qué nombres de nodo verá.
4. Qué shuffle.partitions usa de verdad.
5. Dónde está Summary Metrics.
6. Si empezar por Jobs o por SQL/DataFrame.

## Lo que buscó fuera
- jobs/monitor: abrir ejecución desde Start time; detalles de task "The cluster that ran the task and links to its query history and logs"; no menciona Spark UI. clusters-manage: "If you restart a terminated compute, the Spark UI displays information for the restarted compute … not the historical information". No verificado cómo abrir Spark UI de ejecución terminada.
- AQE: "Dynamically coalesces partitions … after shuffle exchange" explica Stage 4.
- slow-spark-stage-low-io: "To open the SQL DAG, scroll up to the top of the job's page and click on Associated SQL Query"; nodo "provides the stage ID".
- long-spark-stage-io no compara write con input: regla de shuffle parece razonamiento del sitio.
- AQE FAQ: skew solo en joins con shuffle (coincide con repaso 7).
