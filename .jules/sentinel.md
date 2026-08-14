## 2026-08-02 - Reverse Tabnabbing in OS Launch Link
**Vulnerability:** Found a target="_blank" link missing rel="noopener noreferrer" in the Linux Lab render.
**Learning:** Opening a new tab without noopener allows the new tab to access the window.opener object, presenting a reverse tabnabbing risk.
**Prevention:** Always pair target="_blank" with rel="noopener noreferrer" for external links.
