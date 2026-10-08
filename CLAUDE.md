# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Spanish-language study manual for diagnosing slow Databricks / Apache Spark jobs (stages, shuffle, joins, Spark UI, query profile, system tables, AQE, memory/OOM, liquid clustering, Delta maintenance, Azure). Static Jekyll site; all site sources live in `src/` (root `_config.yml` sets `source: src`). On push to `main`, `.github/workflows/pages.yml` builds it with the Gemfile and deploys to GitHub Pages (https://hectorpatino.github.io/spark-performance-lab/). Personal study material, not official docs; simulator numbers are illustrative. All content, UI strings, comments and commit messages are in Spanish.

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
