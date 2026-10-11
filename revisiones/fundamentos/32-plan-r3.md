# Plan ronda 3 (Fundamentos). Evidencia: 21-junior-r3, 22-pedagogo-r3, 23-editor-r3, 24-experto-r3.

A. DATOS (experto, sin decisión): aplicar todo lo de 24-experto-r3 (falso plan:31-32; imprecisos; J-1…J-8; huecos con fuente). Regla usuario: lo que solo confirma la ejecución se escribe "con aviso" (observado; la doc no lo detalla) o sin el dato.

B. PREDICCIONES QUE SE REGALAN
- plan:33 fuera del esencial (vive en "Qué pasaría si"); 4.º punto opcional "una partición = una task en cada stage".
- stages: predicción + Sim 1 (:78-146) delante de "Idea mental" (:49) y "Cómo funciona" (:59). La cocina explica lo observado.
- joins esencial :19-21: regla general "Spark no copia el lado que conserva todas sus filas"; quitar enumeración LEFT/RIGHT/FULL.
- plan P2 comentario b (editor 4 / pedagogo B): "Suponías que todo stage que lee un shuffle tiene shuffle.partitions tasks. Falla porque ese número es para los shuffles de joins y agregaciones por clave. df.count() no tiene clave: junta sus conteos parciales en una sola task." (fuente: sql-performance-tuning "…for joins or aggregations").
- DAG bhj (plan-ejecucion.js): pregunta "¿cuántos stages ves en la DAG?" a) 1 (solo cuentas Exchange de shuffle) b) 2 CORRECTA c) 3 (todo join reparte). Regla plan:35-37 con frase del experto. plan:391-392 "pero el lado que se copia se lee en su propio stage".

C. UNA DUEÑA POR IDEA (el resto enlaza)
- count() y partial_count: dueña plan#explain (viñeta "Dos HashAggregate" + df.count() sin clave con aviso + enlace a aqe#una-accion-dos-jobs). Quitar advertencias en arquitectura :107-109, js:19, js:132; plan :163-164, js:66 → "(ver Plan de ejecución · Leer el plan)". shuffle:309-312 ya enlaza ahí.
- show(): solo arquitectura.js:21; html :164-167 solo pregunta; js:105 "(1, ilustrativo)"; plan-ejecucion.js:69 "1 es ilustrativo (ver Arquitectura)".
- skipped: dueña plan:451-460 (Databricks: caché/checkpoint como ejemplos + observación: con AQE la acción se parte en jobs y el stage ya calculado sale skipped en el segundo, enlace aqe#una-accion-dos-jobs, "la doc no lo detalla"). shuffle:209-215 deja la frase de la guía de RDD + enlace a plan. checkpoint: definir en una línea o quitar.
- Valores por defecto/auto: dueña plan#particiones; stages:362-381 → una frase + enlaces.
- Más workers/driver: arquitectura quitar :23-24 y primera frase de :293.
- Photon naranja: dueña joins#photon; plan paso 2 enlaza. Añadir query profile morado/gris.
- Logs del driver: dueña spark-ui#logs; arquitectura :231-248 en dos viñetas sin logs; joins:185-188 una línea con enlace.

D. PARTICIONES: stages kicker :339 "Reglas prácticas"; etiqueta "(guía de optimización de 2023; no es documentación oficial)" en stages:17, :357-361 y Fuentes; quitar 2–3× de stages (vive en remedios); remedios:72 orden: auto → si fijas, datos ÷ 128 MB a múltiplo de cores → si no sabes el tamaño, 2–3× cores. shuffle opción b y app.js:303: "más riesgo de spill (depende de la memoria por task, ver Memoria y OOM)", veredicto "RIESGO DE SPILL". Esencial shuffle :23-24 → plan#particiones.

E. UNIDADES (decisión): MiB/GiB como el Spark UI.

F. TÉRMINOS: glosario DAG, estadísticas, deserializada/deserializar; "el DAG" siempre; slot fuera (stages:39); locality fuera (stages:66-69); plan paso 2 partido en dos (narrow / Exchange + espera); shuffle:192 "sin Photon" + frase del experto + enlace joins#photon; explain "codegen" fuera.

G. REPASO (decisión): página propia repaso-fundamentos.

H. PUENTE A TU JOB: plan:45-47 promesa → "a la celda"; Dónde mirar de plan: «No sabes qué celda lanzó un job → Spark Jobs bajo la celda» + "Associated SQL Query"; cómo encontrar el job/stage lento (ordenar por duración, citas jobs-timeline y long-spark-stage). En repaso: ejercicio "De Fundamentos a tu job" con recreación SPL.UI.frame('Stages').

I. ARQUITECTURA (decisión de números): animación de la 2.ª tanda en dos subpasos (4 cores se liberan, las pendientes van ahí, los otros 8 se apagan escalonados); texto :76-79 fusionado (editor 5.1).

J. JOINS: partir "Cómo decide Spark" en #como-decide (antes de ejecutar) + #en-runtime (AQE y Photon, #photon dentro); range joins a un párrafo; :197 particiones vacías; :406 -1 con porqué; casos con id propio (app.js) y enlaces a casos.html#join-explota, #broadcast-2g, #broadcast-off; unidades.

K. SIMULADORES (bajos): Sim 2 valor inicial 100 tasks; pie DAG sin "puntos que puedes ignorar"; Sim 3 caption driver (J-8); simuladores DAG de plan y Sim 3: "motor de Spark, sin Photon".
