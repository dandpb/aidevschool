## 2026-07-25 - Fix XSS in dojoToday HTML Rendering
**Vulnerability:** Untrusted dynamic fields from learner_state (via today snapshot) were directly interpolated into HTML strings and assigned to innerHTML without escaping.
**Learning:** In vanilla JS string template apps without a rendering library like React or Solid, every single dynamic value must be manually passed through an escape function to prevent XSS.
**Prevention:** Always use an escapeHtml function for any dynamic data interpolation before assigning to innerHTML.
