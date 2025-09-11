Njuka Card Game Roadmap
🎯 Phase 1: MVP Launch (0–2 sprints)

Goal: Get a functional, polished, and accessible MVP live with minimal friction.

🔹 Accessibility Foundation

Add ARIA labels to cards, buttons, and game states.

Ensure WCAG color contrast compliance.

Announce turn/win/game state updates to screen readers.

🔹 Mobile UX Polish

Add haptic feedback (navigator.vibrate) on card play/discard.

Display gesture hints/tutorial for first-time users.

Adjust 4-player layouts to prevent cramped UIs.

Handle safe areas (notches, rounded corners).

🔹 Performance Quick Wins

Switch card assets to WebP/AVIF with lazy loading.

Optimize polling intervals with exponential backoff until WebSockets are ready.

✅ Deliverable:
A playable, accessible card game MVP that:

Runs smoothly on mobile

Has basic inclusivity built-in

Feels polished and responsive
