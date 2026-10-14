🎨 Palette: Improve accessibility of interactive UI buttons with emoji indicators in dojoToday

💡 What: Wrapped decorative symbols (▶, ▽, ⚙️) in interactive buttons with `<span aria-hidden="true">` and applied explicit `aria-label` to the buttons. Replaced `.textContent` with `.innerHTML` for dynamically updated buttons to preserve semantic markup.

🎯 Why: Relying on emojis/symbols for interactive state indicators causes highly repetitive and noisy announcements for screen reader users, while overriding text dynamically with `.textContent` breaks previous semantic wrappers.

📸 Before/After: None (structural/HTML change only)

♿ Accessibility: Greatly improves screen reader experience by silencing decorative symbols and providing precise text descriptions for the inline play and config buttons in `dojoToday`.

Provenance: agent=palette task=GH-681 run=116086103317 session=3537722330382649921
