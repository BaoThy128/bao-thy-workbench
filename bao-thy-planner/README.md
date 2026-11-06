# Bảo Thy — Personal Day Planner

A responsive English-language planner with a warm editorial look and a garden-inspired paper planner illustration.

## Files

- `index.html` — introduction page.
- `workbench.html` — Today, Tasks, Goals, Daily Check-in, and Notes.
- `style.css` — responsive layout, colors, paper surfaces, and illustration styling.
- `app.js` — planner interactions and browser-local storage.
- `.nojekyll` — tells GitHub Pages to publish files as-is.

## Use the planner

1. Open `index.html` in a browser.
2. Choose **Step into your day** to open the planner dashboard.
3. Add, complete, or remove tasks in **Tasks**.
4. Add a goal and break it into small steps in **Goals**. Check off steps to update progress.
5. Choose a feeling and save a short note in **Daily Check-in**.
6. Create notes in **Notes**; edits are saved automatically in this browser.

The dashboard stores data in `localStorage` for the current browser profile. Clearing that browser storage removes the planner data. It does not synchronize data across devices.

## Current scope

This is a static front-end website. It does not connect to AI, push notifications, or a remote account or sync service.

