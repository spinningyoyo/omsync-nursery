# Vendored files

Pinned copies served with the studio. To upgrade, download the new file, replace it, and update
this table, including the checksum.

| File | Name | Version | Source | License | sha256 |
|---|---|---|---|---|---|
| `lit-all.min.js` | Lit (all-in-one ES module: LitElement, html, css and the directives) | 3.2.1 | https://cdn.jsdelivr.net/gh/lit/dist@3.2.1/all/lit-all.min.js | BSD-3-Clause, Copyright 2019 Google LLC | `f92bc47241abc95bfbd6f6687beed90751d4d6cb4adb60ae58094e7b32e7fa72` |
| `../ui/lucide.js` | Lucide icons (generated: each icon's SVG body from the package's `icons/*.svg`) | lucide-static 0.469.0 | https://unpkg.com/lucide-static@0.469.0/icons/ | ISC, Copyright Lucide Contributors 2022 (portions Cole Bemis 2013-2022, Feather, MIT) | n/a (generated) |

To add a Lucide icon, fetch `https://unpkg.com/lucide-static@0.469.0/icons/<name>.svg` and add its
SVG body to `ui/lucide.js` under its name.
