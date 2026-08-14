## 2025-08-13 - Fix XSS Vulnerability in dojoToday
**Vulnerability:** The dojoToday engine interpolates unescaped dynamic string values (from the TodaySnapshot read model) into its innerHTML assignments within src/main.ts, making it vulnerable to XSS.
**Learning:** In the dojoToday engine, vanilla JavaScript template strings are assigned directly to innerHTML. All untrusted dynamic fields (e.g., user-provided strings or external state from the today snapshot) must be explicitly sanitized using a local escapeHtml utility before interpolation to prevent XSS vulnerabilities.
**Prevention:** Always use escapeHtml for dynamic strings when constructing HTML using vanilla JavaScript template literals.
