## 2024-07-25 - Prevent Reverse Tabnabbing
**Vulnerability:** Found `target="_blank"` without the `noopener` attribute in anchor tags within `engines/codexDojo/src/linuxLab/render.ts`.
**Learning:** While modern browsers often imply `noopener` with `noreferrer`, explicitly specifying `rel="noopener noreferrer"` guarantees protection across all browsers and is recognized by security linters to prevent `window.opener` abuse (reverse tabnabbing).
**Prevention:** Always verify `target="_blank"` anchor links explicitly include `rel="noopener noreferrer"`.
