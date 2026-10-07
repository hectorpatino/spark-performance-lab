# Spark Performance Lab

Manual de estudio para diagnosticar jobs lentos en Databricks y Apache Spark, en compute clásico y en serverless: stages y waves, shuffle, joins, Spark UI, query profile, system tables, skew, spill, AQE, memoria y OOM, liquid clustering, mantenimiento de Delta y Azure Databricks. Cada página tiene simuladores interactivos, recreaciones de las pantallas reales y cita la documentación oficial (docs.databricks.com y su equivalente en learn.microsoft.com/azure/databricks).

Sitio: https://hectorpatino.github.io/spark-performance-lab/

Es material de estudio personal. No es documentación oficial ni está afiliado a Databricks. Los números de los simuladores son ilustrativos.

## Estructura

Sitio Jekyll. Al hacer push a `main`, el workflow `pages.yml` lo compila y lo publica en GitHub Pages. Todo el contenido vive en `src/`.

```
_config.yml              título, baseurl y source: src
Gemfile                  github-pages (mismas versiones que GitHub Pages)
.github/workflows/       pages.yml (compila y publica), check-links.yml (enlaces externos, lychee)
src/
  _data/pages.yml        orden del menú y de anterior/siguiente
  _layouts/default.html
  _includes/             nav.html, pager.html, footer.html
  assets/style.css       estilos compartidos (tema claro y oscuro)
  assets/app.js          simuladores base y recreaciones del Spark UI (expone window.SPL)
  assets/js/, css/       JS y CSS propios de cada página (front matter extra_js / extra_css)
  assets/site.js         menú, índice por página, buscador, tema, glosario, copiar, progreso
  assets/glossary.json   términos con definición al pasar el cursor
  search.json            índice del buscador generado por Jekyll
  notebooks/             notebooks en formato source de Databricks para importar
  *.html                 una página por tema, con front matter
```

## Añadir una página

1. Crea `src/joins.html` con este front matter y el contenido debajo:

   ```
   ---
   layout: default
   slug: joins
   title: "Estrategias de join"
   description: "Broadcast, sort-merge y shuffle hash."
   ---
   ```

2. Añádela en `src/_data/pages.yml`, en la posición que quieras dentro del menú.

## Ver en local

```bash
bundle install
bundle exec jekyll serve
# http://localhost:4000/spark-performance-lab/
```
