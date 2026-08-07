## 2025-02-12 - Prevent XSS in dojoToday read model views
**Vulnerability:** XSS vulnerability in engines/dojoToday where untrusted external data (titles, project names, game paths) from the learning state snapshot was interpolated directly into `innerHTML` without sanitization.
**Learning:** Even read-only dashboards consuming "trusted" internal state or local files can be vectors for XSS if that state is influenced by external inputs (like lesson metadata or commit names).
**Prevention:** Always explicitly sanitize any dynamic strings interpolated into `innerHTML` using a utility like `escapeHtml`, even in internal tools or dashboards.
