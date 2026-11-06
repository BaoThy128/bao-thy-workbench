# Bảo Thy Content Organizer

A light-pink, English-language website prototype for organizing text and media notes.

## Project files

- `index.html` — page content and sections.
- `styles.css` — responsive layout and visual design.
- `app.js` — local prompt generation, sample input, demo, and copy actions.

## Run it

1. Extract `bao-thy-project.zip` if you are using the ZIP.
2. Open the `bao-thy-project` folder.
3. Open `index.html` in Edge, Chrome, or another browser.
4. Select **Get started** to reach the prompt form, or **View the sample workflow** to see the demo.
5. Enter a topic, audience, source, and content. Select **Generate instructions**, then **Copy instructions**.

No package installation or web server is required for this prototype.

## Suggested project phases

1. **Confirm scope:** decide which sources to support and which output formats are needed.
2. **Finish the interface:** review English copy, mobile layout, and accessibility.
3. **Connect processing:** add a secured backend for source access and transcription; keep API keys on the backend.
4. **Generate summaries:** send content and requirements to a model; retain source references and timestamps when available.
5. **Test:** check inaccessible links, missing content, large files, permissions, and citation accuracy.
6. **Deploy:** choose hosting, set privacy controls, and require review of generated drafts.

## Current limitations

This is a frontend prototype. The form creates a prompt in the browser; the demo uses fictional data. The site does not upload files, process media, call an API, or connect to Hermes Agent.

