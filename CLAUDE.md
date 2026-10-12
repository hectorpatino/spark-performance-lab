# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Spanish-language study manual for diagnosing slow Databricks / Apache Spark jobs (stages, shuffle, joins, Spark UI, query profile, system tables, AQE, memory/OOM, liquid clustering, Delta maintenance, Azure). Static Jekyll site; all site sources live in `src/` (root `_config.yml` sets `source: src`). On push to `main`, `.github/workflows/pages.yml` builds it with the Gemfile and deploys to GitHub Pages (https://hectorpatino.github.io/spark-performance-lab/). Personal study material, not official docs; simulator numbers are illustrative. All content, UI strings, comments and commit messages are in Spanish.

## Technical debt

`revisiones/deuda-tecnica.md` lists what is pending and why. At the start of every session, read it and remind the user of each open item in one line, before anything else. When an item is resolved, remove it from the file in the same commit as the fix.

## Commands

```bash
bundle install
bundle exec jekyll serve      # http://localhost:4000/spark-performance-lab/  (note the baseurl)
bundle exec jekyll build      # output in _site/ (build artifact, not committed)
```

No test suite or linter. Besides the Pages deploy, the only CI is `.github/workflows/check-links.yml`: lychee checks external links in `src/*.html` on push and weekly; 403/429 are accepted, 404s fail the run.

## Architecture

- **Paths**: everything below is relative to `src/` except `_config.yml`, `Gemfile` and `.github/`.
- **Pages**: one `src/<slug>.html` per topic with front matter `layout: default`, `slug`, `title`, `description`, optional `extra_css` / `extra_js` arrays. `slug` drives nav highlighting, `body[data-slug]` and the search index; it must match the filename.
- **Menu order**: `_data/pages.yml` (slug, section, title, summary) defines sidebar grouping (`_includes/nav.html`) and prev/next (`_includes/pager.html`). A new page must be added there or it won't appear in the nav.
- **Renamed/moved pages** become redirect stubs with `layout: null` and a meta refresh (see `skew-hints.html` → `aqe.html#skew-hints`) so old links keep working.
- **JS load order** (in `_layouts/default.html`): `assets/app.js` → each page's `extra_js` → `assets/site.js`.
  - `app.js` holds the shared simulators and Spark UI recreation helpers and exposes `window.SPL = {el, q, niceMax, tickMax, UI, viewToggle}`. `SPL.UI` renders fake Spark UI frames (`frame`, `summary`, `bytes`, `dur`, …).
  - `assets/js/<slug>.js` page scripts are IIFEs that bail if `window.SPL` is missing, and each simulator is wrapped in `if (document.getElementById('<id>')) { try { ... } }` so a script only activates on pages containing its DOM. Follow this pattern; page-specific CSS goes in `assets/css/<slug>.css`.
  - `site.js` handles mobile menu, the "En esta página" TOC (built from `.doc > h3`, needs ≥3), search dialog (fetches `search.json`), theme toggle, glossary tooltips (`assets/glossary.json`, entries `{t: [terms], d: definition}`), copy buttons and read-progress. localStorage keys: `spl-theme`, `spl-read`; always access via try/catch.
- **Search index**: `search.json` is a Liquid template iterating `site.pages` with a `slug` (excluding index). No manual maintenance needed.
- **Last verified date**: `_config.yml` default `verified` is shown in the footer as "Revisado contra la documentación oficial el …". Update it when content is re-checked against docs.
- **Notebooks**: `notebooks/*.py` / `*.sql` are Databricks source-format notebooks (`# Databricks notebook source`, `# COMMAND ----------`, `# MAGIC %md`) linked for download from lab/shuffle/joins/liquid-clustering/system-tables pages. They target Free Edition / serverless, where only a few Spark confs are settable and there is no Spark UI.

## Content conventions

- Each topic page opens with an `h2` and a `<div class="essentials">` block ("Lo esencial en 1 minuto" + "Si solo recuerdas una cosa"), and ends with `<h3><span class="k">De dónde sale</span>Fuentes</h3>` followed by a `<p class="src">` listing the official sources.
- Every docs.databricks.com citation is paired with its learn.microsoft.com/azure/databricks equivalent as `<a class="az" ...>Azure</a>`. External links use `target="_blank" rel="noopener"`.
- Section headings use `<h3><span class="k">kicker</span>Title</h3>` (on ≥1280px the kicker moves to the left "lesson rail"; a heading that is only a kicker gets `class="solo"`); definitions use `<p class="def">`; simulators sit in `<div class="console">`.
- Claims must come from the cited official documentation; recheck facts (defaults, thresholds, serverless limits) against the docs rather than from memory.
- The manual teaches the DataFrame / SQL API. Don't cite the RDD programming guide or RDD API docs, unless the behavior is Spark Core functionality that DataFrames run on (shuffle mechanics, the scheduler running one task per partition) and no DataFrame, SQL or Databricks page documents it. Then say so next to the link, e.g. "(guía de RDD; el mecanismo es el mismo para DataFrames)". Code examples use DataFrame or SQL, never the RDD API or `sparkContext`.
- The 2023 Databricks optimization guide (www.databricks.com/discover/pages/optimize-data-workloads-guide) is an eBook, not official documentation. Label it once per page, at its first mention in the body ("guía de optimización de Databricks de 2023 (un eBook, no documentación oficial)"); later mentions and simulator verdicts just say "guía de 2023". In Fuentes, list it once in a closing sentence outside the official sources.
- Each idea has one owner page; other pages link to it instead of repeating it. Caveats such as "la doc no lo detalla" (behavior observed in the Spark UI but not documented) appear once, on the owner page.
- Predictions (`<div class="guess q" data-guess data-answer="x">`, at most 3 per page; the repaso page is the exception): "Lo esencial" states principles without numbers or cases, and the predictions ask the reader to apply them to new numbers or cases. Nothing before a question (essentials, tables, titles, intros) may give its answer. Options have similar length and no absolutes. Each option's comment names the real mistake behind it, with no external links. Full criteria: the `pedagogia` skill, "Lo esencial frente a las predicciones".

## Agents

Subagents live in `.claude/agents/` and the manual's skills in `.claude/skills/`: `fuentes-oficiales` (shared verification rules), `technical-writer`, `pedagogia` and `revisar-seccion`. Each skill is the only full source of its criteria; agents and this file only point to it.

- `experto-motor-spark`, `experto-diagnostico`, `experto-observabilidad`, `experto-delta`, `experto-plataforma`: topic specialists. They check claims against official docs and propose content with sources. They are read-only.
- `redactor-manual`: writes and edits pages, following the conventions above and the `technical-writer` criteria.
- `verificador-fuentes`: applies the `fuentes-oficiales` skill to any single claim, on any topic. It is read-only.
- `editor-tecnico`: runs the `technical-writer` review and does not edit.
- `pedagogo`: applies the `pedagogia` skill (Wilson's *Teaching Tech Together*, Mayer's multimedia principles, predict-observe-explain). It designs how a page or simulator teaches: the target mental model, likely misconceptions, misleading example numbers, and questions. It is read-only.
- `ingeniero-junior`: reads pages as the target reader (basic SQL, Spark and Databricks) and reports whether each page is useful. It reads only the site first; doubts the site leaves open are findings, and only then may it search the web, reporting what it found separately.

Usual flow for new content:
1. A specialist gathers the facts.
2. `pedagogo` sets the target mental model, the likely misconceptions and the simulator's steps and numbers.
3. `redactor-manual` writes the page.
4. `ingeniero-junior` and `editor-tecnico` review it in parallel. If the junior's report shows a misconception, `pedagogo` diagnoses it.
5. The user approves the changes.
6. `redactor-manual` applies them.

Reviewing a whole section: the `revisar-seccion` skill (hub-spoke). `ingeniero-junior` reads blind; `pedagogo`, `editor-tecnico` and the topic `experto-*` review in parallel; the main session consolidates a plan the user approves, edits the shared files itself, and runs one `redactor-manual` per page. It stops when the expert finds nothing false, no page contradicts another, and the junior marks no prediction as given away.

Small edits (a fix, a paragraph, one page): `ingeniero-junior` and the topic `experto-*` review only what changed. Call `pedagogo` or `editor-tecnico` only if the junior gets lost or a prediction or a repetition is involved.
