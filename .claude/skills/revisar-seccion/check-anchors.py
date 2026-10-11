"""Comprueba los enlaces internos del sitio construido.

Uso: python3 .claude/skills/revisar-seccion/check-anchors.py _site

Busca en cada página .html enlaces a otra página o a un #ancla, y en los JS de
assets/ los href con ancla, y lista los que no tienen destino. Los ids que el
JS genera al cargar (p. ej. las tarjetas de casos.html) salen como rotos:
compruébalos en el navegador.
"""
import glob
import os
import re
import sys

site = sys.argv[1] if len(sys.argv) > 1 else "_site"
os.chdir(site)

ids = {}
for f in glob.glob("*.html"):
    ids[f] = set(re.findall(r'\bid="([^"]+)"', open(f, encoding="utf-8").read()))

bad = []
for f in glob.glob("*.html"):
    s = open(f, encoding="utf-8").read()
    for m in re.finditer(r'href="([^"#:]*\.html)?#([^"]+)"', s):
        page = os.path.basename(m.group(1) or f)
        if page not in ids:
            bad.append((f, page, "(no existe la página)"))
        elif m.group(2) not in ids[page]:
            bad.append((f, page, "#" + m.group(2)))
    for m in re.finditer(r'href="([a-z0-9-]+\.html)"', s):
        if m.group(1) not in ids:
            bad.append((f, m.group(1), "(no existe la página)"))

js = "".join(open(p, encoding="utf-8").read() for p in glob.glob("assets/*.js") + glob.glob("assets/js/*.js"))
for m in re.finditer(r'href=\\?"([a-z0-9-]+\.html)#([^"\\]+)\\?"', js):
    if m.group(1) not in ids or m.group(2) not in ids[m.group(1)]:
        bad.append(("js", m.group(1), "#" + m.group(2)))

for b in bad:
    print(*b)
print(f"{len(bad)} enlaces internos sin destino")
sys.exit(1 if bad else 0)
