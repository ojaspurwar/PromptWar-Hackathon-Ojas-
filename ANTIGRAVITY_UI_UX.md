# Antigravity UI/UX Brief — Retro-Futuristic Inbox Sprint

## Goal

Turn Inbox Sprint into a retro-futuristic arcade terminal: 80s/90s arcade energy with modern web clarity. The core task remains real inbox cleanup: every game action must still correspond to the user's confirmed email action. Make the player feel like they are entering a fast round, making satisfying moves, building momentum, and winning when the inbox is clear.

## Start Here

1. Read `ANTIGRAVITY.md` and this brief before changing files.
2. Inspect the current app in `public/index.html`, `public/styles.css`, and `public/app.js`.
3. Preserve working behavior: sample mode, triage, action confirmation, keep/archive/trash, undo, keyboard shortcuts, and Gmail safeguards.
4. Work in the existing visual system and project structure. Do not deploy; Google Cloud is a later target.

## Visual Direction

- Use a near-black `#000000` base with a subtle grid or chessboard texture at very low opacity. Add whitespace and visual breathing room so the screen stays calm and legible.
- Use dark translucent surfaces around `rgba(20, 20, 30, 0.9)`, optional restrained blur, and crisp 1px white/gray borders. Cards use compact 4px corners; hover can brighten the border and add a cyan glow.
- Use white `#ffffff` for primary text and muted gray-blue `#8899aa` for descriptions and metadata. Electric cyan `#00d2ff` or `#00ffff` is the primary accent; neon green `#00ff88` means success, amber `#ffd700` means warning, and `#ff4757` means danger.
- Use a pixel/block face such as Press Start 2P or VT323 for display headings and arcade labels. Use a readable monospace such as Space Mono, Fira Code, or Courier New for body copy and controls. Keep long email subjects, snippets, summaries, and dialogs easy to read; use pixel font sparingly for short display text.
- Keep typography hierarchy clear: large round title, compact all-caps HUD labels, readable 14–16px body text, and smaller but still legible metadata.
- The app is an inbox-cleanup game, not a gaming marketplace. Do not add wallet, crypto, earnings, shopping, or unrelated game-store UI. Reinterpret the reference as actual product features: sprint HUD, inbox cards, AI copilot, score/accuracy, daily streak, recent actions, and accessible account/settings controls.
- Keep the inbox recognizable and uncluttered. Put the arcade character in the frame, progress, selected state, and feedback rather than sacrificing message readability.

## Layout and Components

- Keep the existing sidebar navigation and dashboard layout, restyling them as a compact game terminal. The app's top bar, left navigation, inbox playfield, and game HUD should feel like one coherent system.
- Use CSS Grid and Flexbox with consistent 8px spacing increments and responsive gutters. On wide screens, keep inbox and HUD side by side; stack cleanly on smaller screens.
- Give the active sprint a clear HUD: timer, progress, current score, accuracy/combo, and round status. Emphasize the primary Start/Play action with cyan outline and hover fill; do not add the unrelated “JOIN NEXT DROP” copy.
- Make inbox cards feel like selectable targets, with a bright active border, clear priority badges, and direct Keep/Archive/Trash controls. Keep confirmation and undo affordances visible and obvious.
- Add skeleton/loading states and a clear AI analysis state if the current loading experience needs improvement. Use toast feedback for success and errors.
- Give buttons a pressed scale near 0.95, cards a hover lift near 4px, and toggles or dialogs smooth state changes. Provide a mobile menu/drawer only if the current responsive navigation needs it; preserve core navigation access.

## Motion and Interaction

Use Anime.js for the main motion language. The app currently attempts to load Anime.js 4.1.3 from `https://esm.sh/animejs@4.1.3`; preserve a graceful fallback if the CDN is unavailable. Check browser console and Content Security Policy if it fails to load. Favor GPU-friendly opacity and transform motion; do not animate layout dimensions continuously.

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
- Maintain at least 4.5:1 text contrast, visible keyboard focus, labeled controls, and touch targets around 44×44px where practical.
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

- The round reads as a retro arcade game immediately, before the player clicks Start.
- The countdown, active selection, action feedback, progress, urgency, and completion all feel connected and responsive.
- The email task remains clear, safe, and usable throughout the motion.
- Layout remains usable on narrow screens and with reduced motion enabled.
- Anime.js loads when network access permits, and fallback behavior works when it does not.
- Antigravity reports files changed, checks performed, browser availability, and any issues still open.

## Status

**Code review pass complete; visual review pending.**
- The current pass added the retro arcade palette/layout in `public/arcade.css` and loads it after the base stylesheet.
- Fixed the Anime.js entrance tween to specify actual opacity/position/scale properties; native Web Animations remains the fallback.
- Animation errors are caught separately so a confirmed server action cannot be reported as failed because a tween errored.
- Added a bottom navigation on phone/small tablet widths and raised toasts above it.
- JavaScript syntax checks passed, all 17 automated tests passed, and the running server returned `/`, `/arcade.css`, and `/app.js` successfully with the Anime.js CDN in CSP.
- Port diagnostic noted: Steam CEF remote debugging claims `127.0.0.1:8080`. Server detected shadow and is serving on `http://127.0.0.2:8080` (and `http://localhost:8080` when Steam is closed).
- Computer-use reports no available browser surfaces in this session, so desktop/mobile appearance, animation smoothness, and reduced-motion behavior have not been visually inspected.

**Antigravity next:** Re-read this brief and `ANTIGRAVITY.md` every 30 seconds while active. Open `http://127.0.0.2:8080` (or `http://localhost:8080` if Steam is closed) at desktop and 375px width; inspect countdown, card entrance/selection, confirmed action, undo, timer urgency, completion, and reduced-motion mode. Check the console for Anime.js/CSP errors, fix any issues, and report actual results. Do not mark visual review complete unless the app is opened in a browser.
