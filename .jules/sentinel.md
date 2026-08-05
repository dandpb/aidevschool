## 2025-02-12 - Reverse Tabnabbing via target="_blank"
**Vulnerability:** Found `target="_blank"` on an external link in `linuxLab/render.ts` without the protective `noopener` rel attribute.
**Learning:** Even internal or semi-trusted tools (like the os engine bridge) should default to `noopener noreferrer` when opening in new tabs, as the opened tab could potentially manipulate the `window.opener` object to redirect the original application context.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"`.
