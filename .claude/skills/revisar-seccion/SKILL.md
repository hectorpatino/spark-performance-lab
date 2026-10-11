---
name: revisar-seccion
description: Revisa una sección entera del manual (varias páginas de src/_data/pages.yml) con el flujo hub-spoke - ingeniero-junior lee a ciegas, pedagogo, editor-tecnico y el experto-* del tema revisan en paralelo, la sesión principal consolida un plan que aprueba el usuario y un redactor-manual por página lo aplica. Úsala cuando el usuario pida revisar, mejorar o iterar una sección completa (no una frase ni una página suelta). Incluye plantillas de encargo, el formato del plan, las comprobaciones y los criterios de parada.
---

# Revisar una sección (hub-spoke)

La sesión principal es el **hub**. Los agentes son los **spokes**. El hub no reparte trabajo a ciegas: lee cada informe, resuelve los conflictos entre spokes, pregunta al usuario lo que es suyo de decidir y edita él mismo los archivos compartidos.

## Cuándo usarla y cuándo no

- Úsala para una sección entera (por ejemplo, Fundamentos) o cuando el usuario pida "iterar hasta que el junior no tenga dudas".
- Para un retoque suelto (una frase, un párrafo, una página), usa el modo barato de `CLAUDE.md`: `ingeniero-junior` y el `experto-*` del tema revisan solo lo que cambió.
- Una ronda cuesta unos 7–10 agentes de 100–300k tokens cada uno. Díselo al usuario antes de la primera ronda.

## Archivos de trabajo

Todo lo intermedio va al scratchpad de la sesión, en `hub/`, numerado por ronda (ronda N → prefijo N0–N9):

| Archivo | Quién | Qué |
|---|---|---|
| `N1-junior.md` | hub | Informe del junior. El junior no escribe archivos: el hub lo guarda fiel, sin resumir lo que importa. |
| `N2-pedagogo.md`, `N3-editor.md`, `N4-experto.md` | hub | Informes de los spokes, con los textos y citas exactos que proponen. |
| `N5-plan.md` | hub | Plan consolidado, por bloques (A, B, C…). |
| `N6-reglas.md` | hub | Reglas comunes para los redactores de esa ronda. |

Guarda los informes en cuanto llegan: el contexto del hub se compacta, y si el texto no está en `hub/`, se pierde.

## Pasos de una ronda

1. **Junior a ciegas.** Lanza `ingeniero-junior` sobre todas las páginas de la sección, en el orden del menú. No le digas qué cambió. Plantilla: `plantillas.md`, "Junior".
2. **Spokes en paralelo.** Con el informe del junior como evidencia, lanza a la vez `pedagogo`, `editor-tecnico` y el `experto-*` del tema. Pásale al experto las dudas técnicas del junior para que las responda con fuente. Plantillas: `plantillas.md`.
3. **Consolidar.** Escribe `N5-plan.md`:
   - **A. Datos.** Lo que dice el experto manda en datos: falso, impreciso, sin fuente. Se aplica sin preguntar.
   - **Bloques siguientes.** Predicciones regaladas, una página dueña por idea, términos, enlaces, simuladores…
   - **Conflictos.** Antes de cerrar el plan, cruza las propuestas. Si un spoke propone poner una regla en "Lo esencial" o completar una tabla, comprueba qué predicción queda regalada y resuélvelo en el mismo bloque (skill `pedagogia`, "Lo esencial frente a las predicciones"). Si no, la ronda siguiente deshará el cambio.
   - **Decisiones del usuario.** Lo que cambia la estructura (página nueva, mover contenido a otra sección, cambiar los números de un simulador) o tiene coste visible va a `AskUserQuestion`, con la opción recomendada primero. Máximo 4 preguntas por ronda.
4. **Archivos compartidos (hub).** Antes de lanzar redactores, el hub edita `src/assets/app.js`, `src/assets/style.css`, `src/assets/glossary.json`, `src/_data/` y `CLAUDE.md`. Ningún redactor los toca: si dos los editaran en paralelo, se pisarían.
5. **Redactores en paralelo.** Escribe `N6-reglas.md` (plantilla: `plantillas.md`, "Reglas") y lanza un `redactor-manual` por página, cada uno limitado a sus archivos (`src/<slug>.html`, `src/assets/js/<slug>.js`, `src/assets/css/<slug>.css`). Si un cambio cruza páginas (mover un bloque de A a B), asígnalo a un solo redactor y nombra los dos archivos en su encargo.
6. **Mientras llegan los informes.** Atiende lo que pidan a los archivos compartidos. Si un redactor deja un enlace a un ancla que crea otro, comprueba al final que existe. Si un redactor aplica algo sin fuente, verifícalo con `verificador-fuentes` antes de darlo por bueno.
7. **Comprobar** (ver abajo) y volver al paso 1, a ciegas.

## Comprobaciones del hub tras cada ronda

1. `bundle exec jekyll build` sin errores, y `node --check` sobre cada JS tocado.
2. Anclas internas: `python3 .claude/skills/revisar-seccion/check-anchors.py _site`. Los ids que genera el JS en tiempo de ejecución (por ejemplo, las tarjetas de `casos.html`) salen como rotos: compruébalos en el navegador.
3. En el navegador (Playwright, salidas en `.playwright-mcp/`), con `jekyll serve --port 4011 --detach`:
   - cada `[data-guess]`: cuerpo oculto al cargar, un comentario por opción, la opción correcta se marca y "Ver la explicación completa" abre el cuerpo;
   - los simuladores que cambiaron recorren todos sus pasos;
   - 0 errores de consola y sin desbordamiento horizontal a 390 px.
   El script de referencia está en `check-guesses.js`.
4. Al terminar todas las rondas, para el servidor.

## Criterios de parada

Se comprueban en la ronda siguiente, a ciegas:
- el experto no encuentra nada falso;
- ninguna página contradice a otra ni a su simulador;
- el junior no marca ninguna predicción como regalada.

Cuando se cumplen los tres, para: lo que queda es pulido. Si una ronda solo deja hallazgos menores, haz como mucho una más. Díselo al usuario con el balance de la ronda: utilidad por página, predicciones acertadas, falladas y regaladas, y qué queda abierto.

## Lo que el hub no hace

- No da por buenos datos de memoria. Si un spoke o un redactor afirma algo sin cita, lo verifica `verificador-fuentes`.
- No ejecuta nada en Databricks salvo que el usuario lo pida. Si lo pide, pasa `--profile` y deja que el usuario elija el perfil.
- No hace commit salvo que el usuario lo pida.
- No le cuenta al junior qué cambió.
