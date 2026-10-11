# Informe de ingeniero-junior sobre Fundamentos (5 páginas), ronda 3

Utilidad: arquitectura 4 · plan-ejecucion 4 · stages 5 · shuffle 4 · joins 5. Predicciones: 23, 23 aciertos, 0 fallos. Pero 5 aciertos no fueron míos: plan P1 ("Sin cache(), cada acción vuelve a ejecutar su plan desde la lectura" está en el esencial :33, antes de la pregunta :99-110); stages Sim 1 (la "Idea mental" :55-57 "cada cocinero coge el siguiente plato" y el paso :66 dan la respuesta; sin ellos habría dicho a) 8); joins P2 RIGHT (la regla está en el esencial :19-21; justo, pero no exige pensar); joins Repaso 1 y 3 (misma pregunta que arquitectura:273 y stages:287).
En plan P2 dudé entre b y c: arquitectura me había dicho que count() lleva un shuffle, y shuffle.partitions rige "después de un shuffle". Elegí c por "por clave" (:91). El comentario de b (:148-155) "Confundías df.count() con groupBy().count()" no era mi error; la frase final ("no tiene clave por la que repartir") sí me aclaró.
Detalle: arquitectura count() b ✓, toPandas c ✓; plan P1 a ✓ (regalada), P2 c ✓ (con duda); DAG narrow a, agg c, smj b (el comentario c de P1 ya me había enseñado "cada tabla en su stage"), bhj c, aggsort a ✓; stages Sim1 b (regalada), Sim2 a (:149-151 da el arranque de 0,5 s, necesario), Sim4 c ✓; shuffle R2 c, parcial a, 10 part. b ✓; joins LEFT/AQE b, RIGHT a, 10×10 c ✓; Repaso 1 c (repetida), 2 d, 3 a (repetida), 4 b, 5 c.

## Dónde me perdí

### arquitectura (4)
- :76-79 "Como hay más tasks que cores, 4 esperan su turno" + "Lo que sí espera es el stage siguiente": ese "sí" contrasta con algo que ya no está y da a entender que las tasks no esperan. Se contradice con la viñeta anterior.
- :105-109, arquitectura.js:19 y paso (js:132): tres veces "lo habitual es un shuffle pequeño… la doc no lo detalla, compruébalo en el Spark UI". Con una basta.
- :165-167, js:21 y js:105: tres veces "cuántas particiones lee show() no lo documentan".
- :231-248 viñeta "compute estándar" con cinco ideas (modo de acceso, Auto y DBR 14.3, versiones Python/Scala con Spark Connect, Spark UI, logs que no coinciden). Pesa mucho.
- Arreglado desde r2: respuesta antes de predicción, AQE en primera página, display(), compute estándar definido.

### plan-ejecucion (4)
- :33 da la respuesta de la predicción :99-110.
- :148-155 comentario de b atribuye una confusión distinta; el error que se induce viene de arquitectura (count = shuffle).
- :228-245 paso 2 mete narrow, WholeStageCodegen, Photon en naranja en "la DAG", wide, espera del stage siguiente y guía de RDD. "DAG" no se define ni en glosario (también app.js:387, shuffle:210, joins:220).
- :323-329 "usa spark.conf.get": con DBR 19 y auto, ¿qué devuelve? No se dice.
- :376-382 plan de ejemplo con dos HashAggregate y partial_count; viñetas :384-400 no explican por qué dos ni enlazan a shuffle#agregacion-parcial.
- :451-460 skipped con caché/checkpoint y enlace a shuffle#archivos-intermedios, que dice casi lo mismo (shuffle:205-215). Sin caché no sé por qué vería skipped [NO SEGURO]. "checkpoint" (:116, :458) sin explicar.
- :45-47 promete "ir de la fila lenta del Spark UI a la línea del notebook"; :485-487 no responde a qué línea. El desplegable "Spark Jobs" bajo la celda (arquitectura:311-312) no se enlaza.
- Arreglado: esencial 4 viñetas, Catalyst y plan físico, clientes_vip, default y spark.conf.get.

### stages (5)
- :17-18 y :357-361 "múltiplo de los cores" y "2–3× los cores (guía)"; shuffle:276-278 "128–200 MB por task". Tres reglas sin orden. Aquí la guía no lleva el aviso "no es documentación oficial" que sí lleva shuffle:276-277 y app.js:303.
- :39 "slot" no vuelve a salir.
- :66-69 spark.locality.wait y "core cerca de los datos": ¿cerca si la tabla está en la nube? Sobra en Fundamentos.
- :55-57 la "Idea mental" da la respuesta de la predicción :83-84.
- :362-381 repite plan:304-322 (auto, serverless, DBR 19) con tres enlaces. Bastaría "ver plan#particiones".
- app.js:990 vista "Como en Spark UI" del Sim 3: "Executor driver added" descoloca (el driver no corre tasks); :418-419 lo explica a medias.
- Arreglado: ⌈⌉, título Sim 1, broadcast coherente, FIFO, pestaña Executors.

### shuffle (4)
- :23-24 y :276-278 mandan a Remedios (página 11).
- :186-192 Photon con shuffle propio: mi compute clásico tiene Photon por defecto, ¿vale el simulador? [NO SEGURO]. Falta enlace a joins#photon.
- :205-215 skipped: ver plan.
- :309-312 enlaza a plan#explain para ver partial_count; allí no se explica: vuelta sin salida.
- :346 "deserializada": el tooltip no salta con esa forma.
- Arreglado: Input, 75th percentile, skipped mencionado, reparto parejo, sin Lab.

### joins (5)
- :16-18 "con estadísticas" en el esencial; definido en :148-149; manda a mantenimiento-delta 4 veces (:148, :560, :612, :808).
- :197 "ni si ese lado tiene demasiadas particiones vacías": no dice por qué impide el broadcast.
- :245-247 la pregunta usa GiB/MiB; MiB se explica en :378-379, después.
- :406-407 SET autoBroadcastJoinThreshold = -1: ¿por qué apagarlo? El porqué está en casos broadcast-2g, no enlazado.
- :515-548 range joins (bins, percentiles): mucho para Fundamentos.
- :554-556 "pocos MB a unos cientos de MB → hint BROADCAST" vs :589-592 "700 MB en Parquet puede no caber": ¿dónde está mi límite?
- :639-641 "No repiten las predicciones de esas páginas" es falso: caso 1 (:644-646) = arquitectura:273-274; caso 3 (:718-720) = stages:287-288.
- :639-814 repaso de toda la sección dentro de joins; alarga la página más larga.
- :779-780 "490 GB" y "5 MB"; :806 "5.0 MiB"; P1 (:245) "490 GiB".
- Arreglado: examen, build/stream, SEMI/ANTI, LEFT, Photon, Driver logs, MiB.

## Repeticiones (dueña según el junior)
- "Más workers no ayudan con lo que vuelve al driver": arquitectura :23-24, :27-29, :293-298, :319-322, js:25; joins Repaso 1. Dueña: arquitectura.
- "count() añade su stage; la doc no lo detalla": arquitectura :107-109, js:19, js:132; plan :163-164, :402-404, js:66. ~6. Dueña: plan#explain (una vez).
- "Sin cache() cada acción relee": plan :33, :112-117, :126-128, :468-470, js:171. Dueña: plan ("Qué pasaría si"), no el esencial.
- "show() no documentado": arquitectura ×3 y plan js:69. Dueña: arquitectura (una vez).
- Default shuffle.partitions/auto/DBR 19/serverless: plan :304-322 (dueña), stages :362-381 (completo otra vez, sobra), shuffle :103-104 (breve, bien).
- Skipped: plan :436-438, :451-460, :488-489, js:171; shuffle :209-215. Dueña: plan#varios-jobs.
- Photon en naranja: plan :231-237 y joins :220. Dueña: joins#photon.
- Exchange = frontera de stage: repaso útil. broadcastTimeout 2 veces: bien. Una task por partición: ayuda. Nota final: bien.

## Enlaces
Faltan: plan :380 (partial_count) → shuffle#agregacion-parcial; plan :485-487 → arquitectura (desplegable "Spark Jobs"); stages :357-361 → remedios#auto (regla de MB); "DAG" (plan:232, shuffle:210, joins:220) → spark-ui o glosario; shuffle :186-192 → joins#photon; plan :231-237 → joins#photon; joins :406-407 (-1) → casos broadcast-2g o memoria-oom.
Mandan fuera antes de tiempo: shuffle :23-24, :276-278 (Remedios); plan :295, :398 (AQE), :335 (Remedios); stages :381, :389-391; joins mantenimiento-delta ×4 y casos.html (:486, :591).

## Orden
- Menú correcto; plan-ejecucion sigue siendo la más pesada, pero ya no la leí dos veces.
- plan-ejecucion usa antes de tiempo: partial_count (:380), SortMergeJoin/BroadcastHashJoin (:391-396 y DAG; glosario ayuda), Photon y WholeStageCodegen (:231-237), AQE (:295, :398, :427).
- Sin explicar en ninguna ni en glosario: DAG, checkpoint, slot, locality, "deserializada".
- El repaso debería ser bloque propio al final de la sección, sin copiar predicciones.

## Modelo mental (dudas marcadas)
1. Notebook en el driver; transformaciones anotan; acción (también display()) lanza job. [NO SEGURO: cuántos jobs por acción con AQE]
2. Catalyst: lógico → físico; explain() inicial, SQL/DataFrame final. Exchange de shuffle corta stage; BroadcastExchange no.
3. Tasks = particiones; lectura ~128 MB (y al menos tantas como cores); tras shuffle, shuffle.partitions: 200 clásico, auto en DBR 19 si no fijo, auto en serverless; AQE une; coalesce(1) colapsa. [NO SEGURO: qué devuelve spark.conf.get con auto]
4. Core libre toma la siguiente; waves para estimar, no barrera; la más lenta marca el final; más workers solo si quitan una wave.
5. Shuffle: archivo por map task con bloques; reduce lee su bloque de todos; N+1 espera a N; agregación parcial; spill ≠ OOM. [NO SEGURO: cuánto cambia con Photon]
6. Join: broadcast si el lado copiable < 10 MB estimado o 30 MB real con AQE; si no, SMJ con shuffle en cada lado; Photon cambia al ejecutar, naranja. [NO SEGURO: nombre de nodo con Photon]
7. Sin caché, cada acción relee; skipped = no hace falta recalcular. [NO SEGURO: por qué se saltan sin caché]
8. Resultado al driver o al almacenamiento.

## Hueco
Con mi job de 40 min no sabría: qué job/stage se lleva el tiempo (qué columna ordenar en Jobs o Stages); volver del stage a la línea del notebook (plan:45-47 lo promete); reconocer los nodos de mi plan con Photon. Todo manda a spark-ui#ruta-diagnostico.

## Lo que busqué fuera
- Photon por defecto en clásico y runtime_engine con API; operadores en naranja: coincide con joins:209-221.
- DAG: web-ui.html "visual representation of the directed acyclic graph (DAG) of this stage…". Definir en una línea o glosario.
- Por qué un stage sale skipped sin caché: no resuelto.
- Qué devuelve spark.conf.get con auto en DBR 19: las notas de DBR 19 no lo dicen. Que lo verifique verificador-fuentes.
