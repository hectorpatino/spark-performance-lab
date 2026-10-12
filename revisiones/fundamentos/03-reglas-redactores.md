# Reglas comunes para los redactores (Fundamentos, aplicación del plan)

Plan completo: scratchpad/hub/02-plan.md (léelo entero; aplica SOLO lo de tu página). Evidencia del lector: scratchpad/hub/01-junior.md. Citas descargadas por el experto: scratchpad/motor/*.txt.

## Ya hecho por el hub (no lo repitas ni lo toques)
- Componente "Predice y comprueba": CSS en src/assets/style.css (.guess.q) y JS genérico en src/assets/app.js sobre [data-guess]. No toques esos archivos.
- Glosario (src/assets/glossary.json): ya tiene narrow, wide, query stage, UDF, map task, reduce task. No lo toques.
- Anclas ya creadas fuera de la sección: aqe.html#otras-funciones, remedios.html#auto (con la regla de 3 MB/s de "shuffle alto"), diagnostico.html#summary-metrics, spark-ui.html#ruta-diagnostico, mantenimiento-delta.html#estadisticas. aqe.html tabla de defaults ya actualizada.
- Simulador DAG de plan-ejecucion (app.js): textos corregidos (80 trozos de 128 MB, sin map/reduce, Job 1, sin RDD, enlaces a stages#varios-stages y joins#como-decide).
- La línea de tiempo (jt-*) se movió de plan-ejecucion.html a stages.html como "Simulador 3 · Varios stages en el tiempo: quién espera a quién" (id="varios-stages"); el de workers es ahora "Simulador 4". La errata "haz logrado" ya está corregida.
- No toques: src/assets/app.js, src/assets/style.css, src/assets/glossary.json, src/_layouts/, ni páginas que no sean las tuyas. Si necesitas un cambio ahí, dilo en tu informe final.
- No ejecutes `jekyll build` ni `serve` (hay otros redactores en paralelo); el hub compila y prueba.

## Anclas de la sección (las crea cada dueño; puedes enlazarlas aunque aún no existan)
arquitectura.html#quien-hace-que, #serverless · plan-ejecucion.html#particiones (existe), #narrow-wide, #repartition-coalesce, #varios-jobs · stages.html#waves, #cuantas-tasks, #varios-stages (existe) · shuffle.html#map-reduce, #archivos-intermedios, #agregacion-parcial, #metricas · joins.html#como-decide.

## Patrón "Predice y comprueba" (máximo 3 por página, ANTES del simulador o junto a su control)
```html
<div class="guess q is-hidden" data-guess>
  <div class="guess-cover">
    <p><b>Predice:</b> {pregunta con cifras concretas}</p>
    <ol class="guess-opts" type="a">
      <li>{opción}</li>
      ...
    </ol>
    <button type="button">Ya lo pensé: comprobar</button>
  </div>
  <div class="guess-body" inert>
    <p><b>Compruébalo:</b> {acción exacta en el simulador}.</p>
    <p><b>Respuesta: {letra}.</b> {por qué}. <b>Si elegiste {x}</b>, suponías {modelo}; falla porque {causa}.</p>
  </div>
</div>
```
- Cada opción incorrecta corresponde a un modelo roto concreto, y la respuesta lo nombra.
- Los "Prueba esto" que quedan dejan de dar la respuesta: pasan a preguntas de exploración ("¿Qué cambia si…?") o se convierten en predicciones. No pierdas información útil: lo que era respuesta va dentro de la guess-body.

## Cierre "Dónde mirar" (todas las páginas, justo antes de Fuentes)
```html
<h3><span class="k">Dónde mirar</span>En tu job</h3>
<ul>
  <li><b>{síntoma}</b> → {dónde mirarlo} (ver <a href="...">página</a>).</li>
  (2-3 viñetas)
</ul>
<p class="note">¿Ya tienes un job lento? Empieza por la <a href="spark-ui.html#ruta-diagnostico">ruta de diagnóstico del Spark UI</a> y sigue en <a href="diagnostico.html">Diagnóstico</a>.</p>
```
Usa solo datos que ya estén en el sitio o que verifiques con la skill fuentes-oficiales; si no hay fuente, quita la viñeta.

## Convenciones (CLAUDE.md)
Español. Cada cita de docs.databricks.com con su par `<a class="az">Azure</a>`. Enlaces externos con target="_blank" rel="noopener". Nuevas fuentes también en el `<p class="src">` de Fuentes. No cambies los IDs de los simuladores. Frases de una idea. Creencia de fondo: donde aparezca, nómbrala igual: "Más workers no ayudan cuando…".

## Informe final (breve)
Lista de cambios por bloque (archivo:línea aproximada), lo que NO aplicaste y por qué, y cambios que necesitarías en archivos compartidos.
