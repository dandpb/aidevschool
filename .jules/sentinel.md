
## 2026-08-01 - Unescaped Numeric Fields XSS
**Vulnerability:** XSS via conceptually numeric fields (like `aidi.current`) because they weren't escaped before interpolation.
**Learning:** The assumption that numeric fields will always contain numbers from untrusted external data sources is a dangerous assumption leading to XSS if those fields are manipulated to contain string payloads.
**Prevention:** Always escape all external dynamic data, even numeric fields. Use type-safe rendering patterns like `typeof value === 'number' ? value.toFixed(2) : escapeHtml(value)` to prevent crashes when testing payloads.
