# Plan ronda 4 (Fundamentos). Evidencia: 41-junior-r4, 42-pedagogo-r4, 43-editor-r4, 44-experto-r4.

A. DATOS (sin decisión): todo lo de 44-experto-r4 (alta, media, baja). Shuffle Write vs Input → comparar filas (texto del experto, gana sobre el del editor). "1 task" → "stage largo con 1 task". Stage 4 del repaso explicado (texto experto, sin minPartitionNum). broadcastTimeout dueña joins (con alcance). Cero workers. "la más común" → "por ejemplo". Ancla tuning #automatically-broadcasting-joins.

B. REGLA DE STAGES (sin fuente que la unifique): plan "una cosa" :35-39 → "cuenta los Exchange de shuffle y súmale uno. Un broadcast join suma además el stage que lee la tabla copiada (puede salir en otro job)". Pregunta bhj → "¿cuántos stages ejecuta la query, sumando sus jobs?" (2). Recreaciones del DAG y Sim 3 de stages: el stage del broadcast etiquetado "puede salir en otro job" (hub en app.js). Repaso 4 sin "Sin contar…" y con stages de la query. plan:459 "no deduzcas los stages de una acción contando jobs; para encontrar lo lento, sí ordena los jobs por duración".

C. VARIOS JOBS (editor 2): arquitectura :79-83 una frase + enlace. plan li#varios-jobs reescrito (texto del editor). Ejemplo Job 14/15 de aqe.html:141-170 se MUEVE a plan (tras #varios-jobs o en #explain); aqe#una-accion-dos-jobs queda con 2 líneas + enlace de vuelta (conservar el id). Plan sin enlaces a aqe#una-accion-dos-jobs.

D. PHOTON (decisión Q3): li#photon en arquitectura "En Databricks" (texto del editor 3); plan:234, app.js:387, shuffle:187-195 → arquitectura#photon; joins#photon arranca con enlace a arquitectura y se queda con lo de joins; glosario Photon.

E. JOINS: esencial :14-15 (texto experto broadcast), :20 regla general con ejemplo de lado preservado ("en ventas LEFT JOIN clientes, toda venta sale aunque no tenga cliente, así que ventas no se puede copiar"), sin enumerar los tipos. Tabla :114-127 + fila RIGHT OUTER (Sí | No | Cualquier lado; regla del código, ya bajo "Verifícalo"); borrar el espejo de :350-353. P2 cambia a un caso que la tabla no regala: tabla pequeña a la izquierda en un LEFT (p. ej. clientes_vip LEFT JOIN ventas → no se copia la pequeña; correcta SMJ). hint definido + glosario hint. SEMI/ANTI nota bajo la tabla. maxShuffledHash… a la caja Verifícalo; HISTORY_BASED solo en Dónde mirar; nonEmptyPartitionRatio sin nombre de config en el cuerpo. "Sin Photon pasa por el driver" en tabla y Qué pasaría si; resto enlaza. Hint en serverless: "la doc de serverless no prohíbe los hints".

F. SHUFFLE: :26-27 una idea; Summary Metrics definida en #metricas con su ubicación ("Scroll down to the Summary Metrics"); "explosión de filas" definida/enlazada a joins#ex-sim; :100-102 map tasks (experto); write sin spill (experto); predicción 10 particiones: opciones de igual longitud, sin "Siempre".

G. PLAN: borrar nota :41-43; notebook inicial en <pre> antes de predicciones; cache() sin usarlo en comentarios ("un DataFrame es un plan, no datos") + id="cache" en Qué pasaría si + glosario cache (no en serverless); tabla particiones partida (shuffle por clave → shuffle.partitions; sin clave → 1); 128 MB = máximo, cores = mínimo sugerido; nota de unidades (128 MB = 128 MiB) en #particiones; GiB/MiB en plan:254-255 y app.js:325; enlaces externos fuera del comentario de P2; :79 nodos con enlace a #explain.

H. STAGES: :24, :376 (experto); 0,5 s no regala → pregunta del pedagogo (4, 5 u 8 tasks con 4 cores, 512 s; 5 más lenta) o mover el dato; Sim 4 sin "(48 cores)" y pregunta del pedagogo (solo 6 workers acorta); :281-284 broadcastTimeout media frase + enlace a joins; esencial "auto (Databricks elige el número)"; cocina recortada.

I. ARQUITECTURA: :215-218 cero workers; :221 sin "core lógico"; :107-110 count sin "shuffle" ("una task final suma los 14 conteos", enlace plan#explain); esencial :25 consecuencia (sin Spark UI en serverless); Spark Connect/compute estándar (decisión Q3).

J. REPASO (decisión Q1).

K. SPARK UI DE UNA EJECUCIÓN TERMINADA (decisión Q2).

L. ETIQUETA GUÍA 2023 (decisión Q4): una vez por página (primera mención) + Fuentes; simuladores "guía de 2023".

M. GLOSARIO (hub): broadcast, AQE, job, Photon, hint (nuevo), cache (nuevo), Event Timeline sin "fases".
