# Specification

- While an import or export is pending, suppress other backup actions, lesson/review launches and internal back navigation, including synchronous repeated events.
- Keep controls keyboard-focusable with aria-disabled and announce that restoration is in progress; restore actions on both success and failure without claiming the result of an uncertain failed write.
- Test delayed, repeated and failed operations. The change cannot prevent tab closure, refresh, another tab, or external host navigation.
- Operations started before backup, including lesson/review opening from the progress screen itself, are not coordinated by this screen guard. Multi-tab and external interruption remain outside scope.
