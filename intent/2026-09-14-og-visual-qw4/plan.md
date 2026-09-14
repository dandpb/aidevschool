# Plan — `2026-09-14-og-visual-qw4` (static-only: 2 assets + 2 index.html)

Owner: Content Designer (AID-1858, QW4). Base: `main@00789fe`.

1. Conceitos (Content Designer): 3 artes 1200×630 sobre a identidade vigente do
   `engines/literacyDojo/DESIGN.md`; auto-seleção com critério registrado na AID-1858.
2. Assets:
   - `engines/literacyDojo/public/og.png` (1200×630, 61KB) — conceito selecionado.
   - `engines/codexdojo-os-prototype/public/og.jpg` (1200×630, 58KB) — wallpaper
     existente em cover-crop + JPEG q82 (substitui o uso direto do PNG de 1,87MB).
3. Meta tags:
   - literacyDojo: `og:image` → URL absoluta `/og.png` + `og:image:width/height/alt`;
     `twitter:card` `summary` → `summary_large_image`.
   - codexdojo-os: `og:image` → URL absoluta `/og.jpg` + `og:image:width/height/alt`
     (`twitter:card` já é `summary_large_image`).
4. Verificação local: dimensões 1200×630 conferidas; pesos conferidos (<300KB);
   audit de layout (sem overflow/clip/glyph faltando) executado; HTML servido local
   conferido com `grep` nas tags.
5. Merge via R1 (2 reviews + QA countersign, merger FPE). Evidência de serving live
   (curl nas URLs públicas) só após QW0 (redeploy) — registrado na AID-1858.
