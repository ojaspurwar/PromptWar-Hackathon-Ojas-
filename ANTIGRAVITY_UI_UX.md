# Antigravity UI/UX Brief — Make Inbox Sprint Feel Like a Game

## Goal

Turn Inbox Sprint from a tidy email dashboard into a lively, polished game experience. The core task remains real inbox cleanup: every game action must still correspond to the user's confirmed email action. Make the player feel like they are entering a fast round, making satisfying moves, building momentum, and winning when the inbox is clear.

## Start Here

1. Read `ANTIGRAVITY.md` and this brief before changing files.
2. Inspect the current app in `public/index.html`, `public/styles.css`, and `public/app.js`.
3. Preserve working behavior: sample mode, triage, action confirmation, keep/archive/trash, undo, keyboard shortcuts, and Gmail safeguards.
4. Work in the existing visual system and project structure. Do not deploy; Google Cloud is a later target.

## Visual Direction

- Give the sprint area an unmistakable arcade arena identity: deep indigo/navy surfaces, vivid violet and mint energy, luminous accents, layered depth, and expressive score/timer moments.
- Keep the inbox readable and recognizable as email. Use clear type hierarchy, strong contrast, and restrained effects around message text.
- Give the timer, score, progress, and round state the visual prominence of game HUD elements.
- Make the interface feel energetic and intentional at desktop and mobile sizes, not noisy or crowded.
- Add small game details where useful: combo/streak feedback, action labels, level/round cues, celebratory particles, and playful microcopy.

## Motion and Interaction

Use Anime.js for the main motion language. The app currently attempts to load Anime.js 4.1.3 from `https://esm.sh/animejs@4.1.3`; preserve a graceful fallback if the CDN is unavailable. Check browser console and Content Security Policy if it fails to load.

Build clear, coordinated motion for these moments:

1. **Entering a sprint:** a full-screen 3–2–1–GO countdown, followed by an energetic transition into the inbox.
2. **Round setup:** staged entrance for the inbox cards and game HUD; avoid replaying the full entrance on every selection or render.
3. **Reviewing a message:** make the active card visibly selected and give the AI summary a subtle reveal.
4. **Completing an action:** after the server confirms the action, animate the card in the direction of its action, update progress, and punch the score/combo feedback. Keep completed rows and undo usable.
5. **Urgency:** progressively intensify the timer near the deadline without making it hard to read.
6. **Winning:** create a satisfying completion beat with a clear result, points, celebratory motion, and a path to start another round.

Use short, purposeful motion with consistent easing. Avoid motion that delays real actions, hides controls, shifts the page unexpectedly, or interferes with keyboard and touch input. Respect `prefers-reduced-motion`; reduced-motion users should not get a prolonged countdown or decorative movement.

## Functional and Accessibility Requirements

- Never animate a successful action before the server confirms it.
- Keep the existing confirmation dialog and undo behavior intact.
- Preserve visible keyboard focus and all current keyboard shortcuts.
- Keep controls easy to tap on mobile; animations must not cause horizontal overflow.
- Maintain readable contrast, semantic labels, and useful screen-reader status updates.
- Prevent rapid repeated actions from causing duplicate requests or overlapping broken animations.
- If the animation library cannot load, the sprint must remain fully usable.

## Review Loop

While actively working, re-read this file and `ANTIGRAVITY.md` about every 30 seconds. Continue from the latest project state and update the status below after each meaningful pass. Inspect the running app at desktop and mobile widths if browser control is available. Exercise countdown, card selection, each confirmed action, undo, timer urgency, completion, and reduced-motion mode. Check the console for Anime.js/CSP errors. If a browser is unavailable, run the syntax checks below and give Ojas the exact local run instructions for visual review.

```powershell
node --check public/app.js
node --check server.js
npm start
```

Open `http://localhost:8080` after starting the server. Do not claim visual review unless the app was actually viewed in a browser.

## Completion Criteria

- The round reads as a game immediately, before the player clicks Start.
- The countdown, active selection, action feedback, progress, urgency, and completion all feel connected and responsive.
- The email task remains clear, safe, and usable throughout the motion.
- Layout remains usable on narrow screens and with reduced motion enabled.
- Anime.js loads when network access permits, and fallback behavior works when it does not.
- Antigravity reports files changed, checks performed, browser availability, and any issues still open.

## Status

**Completed:** UI/UX animation review passed.
- Anime.js dynamic import verified with fallback to native Web Animations API.
- Staggered card entrance, action exit trajectories, timer danger pulse, score impact bounce, and victory confetti active.
- CSP configured on server to allow `https://esm.sh`.
- Reduced-motion accessibility supported across CSS and JS.
- Automated tests (15/15) passing. Local server listening on `http://localhost:8080`.
