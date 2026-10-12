# Deuda técnica

Lo que queda pendiente y por qué. Claude lo recuerda al empezar cada sesión (ver CLAUDE.md). Cuando algo se resuelve, se borra de aquí y el commit que lo arregla lo dice.

## 1. `orderBy` por rangos: decidir cómo contarlo

Abierto el 2026-10-11. Espera decisión del usuario.

- **Dónde:** pregunta aggsort y nota del simulador del árbol en `src/assets/js/plan-ejecucion.js` (líneas 63 y 270–280), `src/assets/app.js:372`, `src/shuffle.html` (líneas 21 y 63).
- **Problema:** «el `orderBy` reparte por rangos en `shuffle.partitions` particiones y cada task ordena su rango» no tiene fuente oficial (`fundamentos/67-verificador-orderby-r5.md`). La doc solo garantiza el orden total de `ORDER BY`; los rangos y el muestreo están documentados solo para `repartitionByRange`.
- **Lo que ya se vio:** un `EXPLAIN` en un SQL warehouse con Photon muestra `rangepartitioning(<clave>, 32)` y luego un sort por partición (`fundamentos/81-explain-orderby-dev.md`). No se ve el muestreo, y el 32 no se puede atar a `spark.sql.shuffle.partitions`.
- **Falta decidir:**
  - si el manual acepta datos observados en un plan, marcados como observación y no como doc;
  - si se comprueba el plan sin Photon en un cluster clásico existente de `dev` (arrancarlo cuesta dinero);
  - qué hacer con la frase del muestreo en `plan-ejecucion.js:63`, que la doc no respalda para `orderBy`.
- **Relacionado:** el simulador del árbol puede regalar la respuesta de aggsort si el lector añade un `orderBy` antes de llegar a la pregunta.

## 2. Ronda 6 de Fundamentos

Sin lanzar. Propuesta: revisar solo lo que cambió, sin preguntas ni secciones nuevas, y que sea la última; lo que quede pasa a esta lista.

## 3. Rama sin mezclar a `main`

`arquitectura-paralelismo-y-agentes` está subida a `origin` desde el 2026-10-11, pero no tiene PR a `main` (`git log main..HEAD` dice cuántos commits van). El sitio publicado no cambia hasta mezclarla.

## 4. Huecos de la doc marcados en el sitio

Marcados con «Verifícalo»; no corren prisa.

- Nombres de nodos de Photon. El `EXPLAIN` de `fundamentos/81-explain-orderby-dev.md` muestra algunos (`PhotonSort`, `PhotonShuffleExchangeSink`, `PhotonGroupingAgg`…), pero es una observación, no doc. Depende de la decisión del punto 1.
- Summary Metrics del Spark UI con Photon.
- Si la salida de una ejecución terminada conserva el desplegable Spark Jobs.
- Si el JSON de un job cluster terminado sigue visible.
