# Spark Performance Lab

Manual de estudio para diagnosticar jobs lentos en Databricks y Apache Spark: jobs, stages y waves, shuffle, skew, spill, AQE, salting y liquid clustering. Cada página tiene simuladores interactivos y cita la documentación oficial en la que se basa.

Sitio: https://hectorpatino.github.io/spark-performance-lab/

Es material de estudio personal. No es documentación oficial ni está afiliado a Databricks. Los números de los simuladores son ilustrativos.

## Estructura

Sitio Jekyll que GitHub Pages compila solo al hacer push a `main`.

```
_config.yml          título, baseurl
_data/pages.yml      orden del menú y de anterior/siguiente
_layouts/default.html
_includes/           nav.html, pager.html, footer.html
assets/style.css     estilos compartidos (tema claro y oscuro)
assets/app.js        simuladores; cada uno se activa si su elemento existe en la página
*.html               una página por tema, con front matter
```

## Añadir una página

1. Crea `joins.html` con este front matter y el contenido debajo:

   ```
   ---
   layout: default
   slug: joins
   title: "Estrategias de join"
   description: "Broadcast, sort-merge y shuffle hash."
   ---
   ```

2. Añádela en `_data/pages.yml`, en la posición que quieras dentro del menú.

## Ver en local

```bash
bundle install
bundle exec jekyll serve
# http://localhost:4000/spark-performance-lab/
```
