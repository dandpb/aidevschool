## 2024-07-12 - Type-Confusion XSS Vulnerability
**Vulnerability:** Untrusted string payload in numerical fields passed to HTML unescaped
**Learning:** Due to type confusion, conceptually numerical fields (e.g. lengths and integers) from untrusted data can harbor XSS string payloads which cause issues when directly rendered or when `toFixed()` is called on them. They were bypassing `escapeHtml` filtering.
**Prevention:** Always validate and/or coerce dynamically populated numerical fields to number or escape them with `escapeHtml` to prevent XSS payloads and ensure safe rendering in string-template applications.
