# EXPLAIN de orderBy en un SQL warehouse (2026-10-11)

Ejecutado por el hub con el perfil `dev` que eligió el usuario, solo para esta sesión. Warehouse serverless X-Small (Photon). Solo `EXPLAIN` sobre `range()`: no se leyó ni escribió ninguna tabla. Es una observación, no una fuente oficial.

## Qué muestra

- `ORDER BY` global sin `LIMIT` produce `PhotonShuffleExchangeSink rangepartitioning(<clave>, 32)` y después `PhotonSort` en cada partición. Con `groupBy` delante hay dos shuffles: `hashpartitioning(k, 32)` y luego `rangepartitioning(count, 32)`.
- Los dos shuffles usan el mismo número de particiones (32). En el warehouse no se puede leer `spark.sql.shuffle.partitions` (`CONFIG_NOT_AVAILABLE`), así que no se puede atar el 32 a esa conf.
- El plan no muestra el muestreo para calcular los rangos.
- Nombres de operadores de Photon que aparecen: `PhotonResultStage`, `PhotonColumnarToRow`, `PhotonSort`, `PhotonShuffleExchangeSource`, `PhotonShuffleMapStage`, `PhotonShuffleExchangeSink`, `PhotonGroupingAgg`, `PhotonProject`, `PhotonRange`. Al final, una sección `== Photon Explanation ==` ("The query is fully supported by Photon.").

## Sin verificar

- El plan sin Photon (cluster clásico) y que ahí salgan 200 particiones: no se probó.
- Que el número de particiones por rangos sea siempre el del shuffle del `groupBy`.

## Salida

```
== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=false
+- == Initial Plan ==
   PhotonResultStage
   +- PhotonColumnarToRow
      +- PhotonSort [count#14278L ASC NULLS FIRST]
         +- PhotonShuffleExchangeSource false
            +- PhotonShuffleMapStage ENSURE_REQUIREMENTS, [id=#7482]
               +- PhotonShuffleExchangeSink rangepartitioning(count#14278L ASC NULLS FIRST, 32)
                  +- PhotonGroupingAgg(keys=[k#14277L], functions=[finalmerge_count(merge count#14288L) AS count(1)#14286L])
                     +- PhotonShuffleExchangeSource false
                        +- PhotonShuffleMapStage ENSURE_REQUIREMENTS, [id=#7476]
                           +- PhotonShuffleExchangeSink hashpartitioning(k#14277L, 32)
                              +- PhotonGroupingAgg(keys=[k#14277L], functions=[partial_count(1) AS count#14288L])
                                 +- PhotonProject [(id#14285L % 1000) AS k#14277L]
                                    +- PhotonRange Range (0, 10000000, step=1, splits=8)


== Photon Explanation ==
The query is fully supported by Photon.
```

```
== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=false
+- == Initial Plan ==
   PhotonResultStage
   +- PhotonColumnarToRow
      +- PhotonSort [id#14303L DESC NULLS LAST]
         +- PhotonShuffleExchangeSource false
            +- PhotonShuffleMapStage ENSURE_REQUIREMENTS, [id=#7551]
               +- PhotonShuffleExchangeSink rangepartitioning(id#14303L DESC NULLS LAST, 32)
                  +- PhotonRange Range (0, 10000000, step=1, splits=8)


== Photon Explanation ==
The query is fully supported by Photon.
```

