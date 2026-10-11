# Plantillas de encargo

Sustituye `{…}`. `{HUB}` es la ruta absoluta de `revisiones/<sección>/` en el repo.

## Junior

```
Lee la sección {SECCIÓN} del manual en el orden del menú (src/_data/pages.yml): {src/a.html, src/b.html, …}. Los textos de los simuladores están en src/assets/app.js y src/assets/js/<slug>.js, y el glosario de tooltips en src/assets/glossary.json.

Léelas como el lector real: sabes SQL, Spark y Databricks básicos, y quieres entender por qué tu job es lento. Antes de abrir cada predicción ("Predice:" con opciones), contéstala tú y anota tu respuesta. Después mira el comentario de tu opción y la explicación (.guess-fb y .guess-body), y cuenta si acertaste, si te sacó del error y si fue regalada (la respuesta ya estaba escrita antes).

Céntrate en la enseñanza:
- dónde te perdiste (archivo:línea);
- términos usados antes de explicarse;
- qué se repite de más y qué página debería ser la dueña;
- enlaces que faltan, o que mandan fuera antes de tiempo;
- contradicciones entre páginas o con un simulador;
- el modelo mental con el que acabas, con [NO SEGURO] donde lo tengas;
- qué no sabrías hacer con tu job después de leer la sección.

Primero solo el sitio; después, si te queda una duda, puedes buscar en internet y contarlo aparte. Devuelve el informe completo en tu respuesta final, con un resumen de 10 líneas al principio.
```

## Pedagogo

```
Revisa cómo enseña la sección {SECCIÓN}: {páginas}, en el orden del menú. Simuladores en src/assets/app.js y src/assets/js/<slug>.js; glosario en src/assets/glossary.json. El componente de predicción ([data-guess]) muestra solo el comentario de la opción elegida y, aparte, un botón que abre la explicación.

Evidencia del lector real: {HUB}/{N1}-junior.md. Úsala, pero haz tu propio análisis.

Aplica la skill pedagogia: modelo mental objetivo y dónde se rompe; errores de concepto, incluidos números de ejemplo y veredictos de simulador que enseñan reglas falsas; predicciones (¿obligan a pensar? ¿el comentario diagnostica el error real?); Mayer en los simuladores; carga (qué sobra y adónde moverlo); repaso y transferencia; brecha entre terminar la sección y diagnosticar un job real.

Prioriza (alto, medio o bajo) con archivo:línea y el cambio concreto. No edites. Devuelve el informe completo en tu respuesta final.
```

## Editor técnico

```
Revisa como editor técnico la sección {SECCIÓN}: {páginas}, en el orden del menú. Simuladores en src/assets/app.js y src/assets/js/<slug>.js; glosario en src/assets/glossary.json. Sigue CLAUDE.md.

Evidencia del lector real: {HUB}/{N1}-junior.md.

Foco: enseñanza y no repetir. Qué idea se repite y cuál es su página dueña; enlaces que faltan o que mandan fuera antes de tiempo; términos antes de definirse; contradicciones entre páginas o con un simulador (incluidas unidades); estructura (peso, viñetas con varias ideas, títulos, orden); convenciones (par Azure, target/rel, etiqueta de la guía de RDD y de la guía de 2023, Fuentes completas).

Prioriza (alto, medio o bajo) con archivo:línea y el cambio concreto. No edites. Devuelve el informe completo en tu respuesta final.
```

## Experto

```
Verifica contra la documentación oficial la sección {SECCIÓN}: {páginas}, sus simuladores (src/assets/app.js y src/assets/js/<slug>.js) y las entradas de src/assets/glossary.json que usan. Aplica la skill fuentes-oficiales: Databricks con su par de Azure, Apache Spark y PySpark; la guía de RDD solo con su etiqueta.

Contexto del lector: {HUB}/{N1}-junior.md. Responde con fuente a estas dudas: {lista de dudas técnicas y contradicciones del junior}.

Para cada afirmación incorrecta, imprecisa o sin fuente: archivo:línea, veredicto, cita exacta con URL y corrección en español. Lo que no tenga fuente, márcalo para reescribirlo sin el dato. No ejecutes nada en Databricks. No edites. Devuelve el informe completo en tu respuesta final, ordenado por gravedad.
```

## Reglas (archivo `N6-reglas.md` para los redactores)

```
# Reglas comunes, ronda {N}

Plan aprobado: {HUB}/{N5}-plan.md (aplica TODO lo de tu página). Textos y citas exactos: {HUB}/{N4}-experto.md (manda en datos; úsalo tal cual), {N3}-editor.md, {N2}-pedagogo.md; lector: {N1}-junior.md.
Decisiones del usuario: {lista}.

## Ya hecho por el hub (no lo toques)
- {cambios en app.js, style.css, glossary.json, _data, CLAUDE.md, con las anclas nuevas que otras páginas deben crear o enlazar}
- No toques app.js, style.css, glossary.json, _layouts, _data, CLAUDE.md ni páginas ajenas salvo las que nombre tu encargo. No ejecutes jekyll build/serve (hay otros redactores en paralelo). Si necesitas algo compartido, dilo en el informe.

## Predicciones
Marcado: <div class="guess q" data-guess data-answer="x"> con .guess-cover (pregunta + .guess-opts con <button data-opt>), un .guess-fb[data-for] por opción y .guess-body. Criterio: skill pedagogia, "Lo esencial frente a las predicciones". Revisa cada predicción de tu página al terminar.

## Anclas que no se pueden cambiar
{ids de simuladores y anclas enlazadas desde otras páginas}

## Informe final (breve)
Cambios por bloque (archivo:línea), qué NO aplicaste y por qué, datos nuevos con URL, cambios necesarios en archivos compartidos.
```

## Redactor (encargo por página)

```
Ronda {N} de {SECCIÓN}. Lee primero {HUB}/{N6}-reglas.md y {HUB}/{N5}-plan.md.

Edita SOLO {archivos}. {Si cruza páginas: qué bloque de qué archivo y dónde va.}

Qué hacer en tu página: {bloques del plan que le tocan, con archivo:línea y el texto exacto cuando lo haya}.

Al terminar: node --check y un parser HTML; comprueba que ninguna predicción se responde antes de su pregunta; informe según las reglas.
```
