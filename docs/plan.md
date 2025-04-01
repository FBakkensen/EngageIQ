# Detailed Implementation Plan: EngageIQ Chrome Extension (MVP)

**Document Version:** 1.0
**Date:** 2025-03-31
**Status:** Ready for MVP Implementation

---

## Phase 0: Project Setup & Configuration

*   **Goal:** Establish the basic project structure, manifest file, necessary assets/libraries, and code quality tooling (Linter/Formatter).
*   **Prerequisites:** PRD Draft 7, Technical Design Draft 3, EngageIQ Logo Asset(s), Node.js and npm installed.

*   **Step 0.1: Create Project Directory Structure**
    *   [x] **Sub-step 0.1.1:** Create the main project folder (e.g., `engageiq-extension`).
        *   *Verification:* Folder exists.
    *   [x] **Sub-step 0.1.2:** Inside the main folder, create standard sub-folders: `icons`, `html`, `js`, `css`, `assets`.
        *   *Verification:* Sub-folders exist.

*   **Step 0.2: Prepare Extension Icons**
    *   [x] **Sub-step 0.2.1:** Obtain EngageIQ logo in required sizes (16x16, 48x48, 128x128 pixels).
        *   *Verification:* Logo files (PNG) are available.
    *   [x] **Sub-step 0.2.2:** Place icon files into the `icons` directory (`icon16.png`, `icon48.png`, `icon128.png`).
        *   *Verification:* `icons` directory contains the files.

*   **Step 0.3: Create Initial Manifest File (`manifest.json`)**
    *   [x] **Sub-step 0.3.1:** Create `manifest.json` in the project root.
        *   *Verification:* File exists.
    *   [x] **Sub-step 0.3.2:** Populate basic fields: `manifest_version` (3), `name` ("EngageIQ"), `version` ("0.1.0"), `description`.
        *   *Verification:* File contains fields with correct values.
    *   [x] **Sub-step 0.3.3:** Add `icons` declaration pointing to files in `icons/`.
        *   *Verification:* `icons` block exists with correct paths.
    *   [x] **Sub-step 0.3.4:** Add initial `permissions`: `["storage", "scripting"]`. (Updated based on Phase 2 needs).
        *   *Verification:* `permissions` array includes "storage" and "scripting".
    *   [x] **Sub-step 0.3.5:** Add `host_permissions`: `["*://*.linkedin.com/*", "https://generativelanguage.googleapis.com/*"]`. (Added API host).
        *   *Verification:* `host_permissions` array includes LinkedIn and Google API patterns.
    *   [x] **Sub-step 0.3.6:** Add placeholder declarations for `content_scripts`, `background`, `options_page`, `web_accessible_resources`, pointing to planned file locations.
        *   *Verification:* Placeholder declarations exist with plausible paths.

*   **Step 0.4: Integrate Bootstrap 5**
    *   [x] **Sub-step 0.4.1:** Download Bootstrap 5 CSS (`bootstrap.min.css`) and JS (`bootstrap.bundle.min.js`).
        *   *Verification:* Files downloaded.
    *   [x] **Sub-step 0.4.2:** Place Bootstrap files into the `assets` directory.
        *   *Verification:* Files are in the `assets` folder.
    *   [x] **Sub-step 0.4.3:** Ensure paths in `web_accessible_resources` (manifest) correctly point to these files.
        *   *Verification:* Manifest paths match file locations in `assets/`. Update manifest if needed.

*   **Step 0.5: Initialize npm and Install Linters/Formatters**
    *   [x] **Sub-step 0.5.1:** Open a terminal/command prompt in the project root directory (`engageiq-extension`).
    *   [x] **Sub-step 0.5.2:** Run `npm init -y` to create a `package.json` file.
        *   *Verification:* `package.json` file exists in the project root.
    *   [x] **Sub-step 0.5.3:** Run `npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-chrome-extension`.
        *   *Verification:* `node_modules` directory and `package-lock.json` file are created. `package.json` lists these packages under `devDependencies`.

*   **Step 0.6: Configure ESLint**
    *   [x] **Sub-step 0.6.1:** Create an ESLint configuration file named `.eslintrc.json` in the project root.
        *   *Verification:* `.eslintrc.json` file exists.
    *   [x] **Sub-step 0.6.2:** Populate `.eslintrc.json` with a basic configuration (including `env.webextensions`, extends `eslint:recommended`, `plugin:chrome-extension/recommended`, `prettier`).
        *   *Verification:* Open `.eslintrc.json` and verify it contains valid JSON configuration similar to the example in planning docs.
    *   [x] **Sub-step 0.6.3:** Create an `.eslintignore` file in the project root.
        *   *Verification:* `.eslintignore` file exists.
    *   [x] **Sub-step 0.6.4:** Add patterns to ignore to `.eslintignore` (e.g., `node_modules/`, `assets/bootstrap.*.js`).
        *   *Verification:* Open `.eslintignore` and verify it contains patterns for files/folders to exclude from linting.

*   **Step 0.7: Configure Prettier**
    *   [x] **Sub-step 0.7.1:** Create a Prettier configuration file named `.prettierrc.json` in the project root.
        *   *Verification:* `.prettierrc.json` file exists.
    *   [x] **Sub-step 0.7.2:** Populate `.prettierrc.json` with desired formatting rules.
        *   *Verification:* Open `.prettierrc.json` and verify it contains valid JSON configuration with formatting options.
    *   [x] **Sub-step 0.7.3:** Create a `.prettierignore` file in the project root.
        *   *Verification:* `.prettierignore` file exists.
    *   [x] **Sub-step 0.7.4:** Add patterns to ignore to `.prettierignore` (e.g., `node_modules/`, `package*.json`, `manifest.json`, specific assets).
        *   *Verification:* Open `.prettierignore` and verify it contains patterns for files/folders to exclude from formatting.

*   **Step 0.8: Add Scripts to `package.json`**
    *   [x] **Sub-step 0.8.1:** Open `package.json`.
    *   [x] **Sub-step 0.8.2:** Add `lint` and `format` scripts to the `"scripts"` section.
        *   *Verification:* Open `package.json`; the `scripts` object contains `lint` and `format` commands.
    *   [x] **Sub-step 0.8.3:** Run `npm run lint` in the terminal.
        *   *Verification:* ESLint runs without crashing. Correct any configuration errors.
    *   [x] **Sub-step 0.8.4:** Run `npm run format` in the terminal.
        *   *Verification:* Prettier runs without crashing.

*   **Step 0.9: Load Extension in Chrome for Verification**
    *   [x] **Sub-step 0.9.1:** Go to `chrome://extensions`.
    *   [x] **Sub-step 0.9.2:** Ensure "Developer mode" is enabled.
    *   [x] **Sub-step 0.9.3:** Use "Load unpacked" and select the project root directory.
        *   *Verification:* The EngageIQ extension loads without errors shown on its card in `chrome://extensions`. Name, version, icon are correct. Check "Errors" button.

---

## Phase 1: Settings (Options) Page Implementation

*   **Goal:** Create the HTML, CSS, and JavaScript for the extension's options page (F7) to allow users to input and save their Gemini API key.
*   **Prerequisites:** Phase 0 completed, Bootstrap 5 integrated, `options_page` declared in `manifest.json`.

*   **Step 1.1: Create Options Page HTML (`html/options.html`)**
    *   [x] **Sub-step 1.1.1:** Create the file `options.html` inside the `html` directory.
        *   *Verification:* `html/options.html` file exists.
    *   [x] **Sub-step 1.1.2:** Add basic HTML structure (DOCTYPE, html, head, body).
        *   *Verification:* File contains valid basic HTML boilerplate.
    *   [x] **Sub-step 1.1.3:** Add title "EngageIQ Settings" in `<head>`.
        *   *Verification:* `<title>` exists.
    *   [x] **Sub-step 1.1.4:** Link to Bootstrap CSS (`../assets/bootstrap.min.css`) and custom CSS (`../css/options.css`) in `<head>`. Create empty `css/options.css`.
        *   *Verification:* `<link>` tags exist with correct paths. `css/options.css` exists.
    *   [x] **Sub-step 1.1.5:** Add Bootstrap container and `<h1>EngageIQ Settings</h1>` in `<body>`.
        *   *Verification:* Body contains container and heading.
    *   [x] **Sub-step 1.1.6:** Add a form group (label "Gemini API Key", `<input type="password" id="apiKey">`).
        *   *Verification:* Form group renders. Input has `id="apiKey"`.
    *   [x] **Sub-step 1.1.7:** Add a save button (`<button type="submit" id="saveButton">Save Key</button>`) inside a `<form id="settingsForm">`.
        *   *Verification:* Button with `id="saveButton"` is visible. Form exists.
    *   [x] **Sub-step 1.1.8:** Add a status message element (`<div id="statusMessage"></div>`).
        *   *Verification:* Status message div exists.
    *   [x] **Sub-step 1.1.9:** Link to options JavaScript (`<script src="../js/options.js"></script>`) at the end of `<body>`.
        *   *Verification:* Script tag exists with correct path.

*   **Step 1.2: Create Options Page JavaScript (`js/options.js`)**
    *   [x] **Sub-step 1.2.1:** Create the file `js/options.js`.
        *   *Verification:* `js/options.js` file exists.
    *   [x] **Sub-step 1.2.2:** Add `DOMContentLoaded` event listener structure.
        *   *Verification:* Code structure includes `document.addEventListener('DOMContentLoaded', function() { ... });`.
    *   [x] **Sub-step 1.2.3:** Get DOM references (`#apiKey`, `#saveButton`, `#statusMessage`, `#settingsForm`).
        *   *Verification:* Variables correctly reference DOM elements.
    *   [x] **Sub-step 1.2.4:** Add `submit` event listener to the form.
        *   *Verification:* Event listener is attached.
    *   [x] **Sub-step 1.2.5:** Call `event.preventDefault()` inside the listener.
        *   *Verification:* Default form submission is prevented.
    *   [x] **Sub-step 1.2.6:** Get value from `#apiKey`. Validate if not empty (allow saving empty string to clear key).
        *   *Verification:* Key value retrieved. Logic exists.
    *   [x] **Sub-step 1.2.7:** If value is present or empty (user wants to save/clear), call `chrome.storage.sync.set({ apiKey: '...' }, callback)`.
        *   *Verification:* `chrome.storage.sync.set` is called correctly.
    *   [x] **Sub-step 1.2.8:** Implement the `set` callback: display success message in `#statusMessage`, clear after delay using `setTimeout`, handle `chrome.runtime.lastError`.
        *   *Verification:* Success message appears/disappears. Error handling code exists.
    *   [x] **Sub-step 1.2.9:** (Covered by 1.2.6/1.2.8 - logic handles empty/non-empty save).
    *   [x] **Sub-step 1.2.10:** Implement "Load Key": Inside `DOMContentLoaded`, call `chrome.storage.sync.get(['apiKey'], callback)`.
        *   *Verification:* `chrome.storage.sync.get` is called correctly.
    *   [x] **Sub-step 1.2.11:** Implement the `get` callback: check `result.apiKey`, if present set `#apiKey.value`. Handle `chrome.runtime.lastError`.
        *   *Verification:* Saved key populates input field on page load.

*   **Step 1.3: Style Options Page (`css/options.css`)**
    *   [x] **Sub-step 1.3.1:** Open `css/options.css`.
    *   [x] **Sub-step 1.3.2:** Add basic styling (e.g., `body { min-width: 400px; }`, `.container { max-width: 600px; }`). Add styles for `.success` and `.error` classes for status messages.
        *   *Verification:* Options page looks reasonably styled. Success/error messages can be styled differently (apply classes in `options.js`).

*   **Step 1.4: Verify Options Page Functionality**
    *   [x] **Sub-step 1.4.1:** Reload extension in `chrome://extensions`.
    *   [x] **Sub-step 1.4.2:** Open the extension's Options page.
        *   *Verification:* Page opens successfully.
    *   [x] **Sub-step 1.4.3:** Verify initial state (empty field or previously saved key).
    *   [x] **Sub-step 1.4.4:** Enter test key, click Save.
        *   *Verification:* Success message appears. Key persists in field.
    *   [x] **Sub-step 1.4.5:** Close options tab.
    *   [x] **Sub-step 1.4.6:** Re-open options page.
        *   *Verification:* Saved key is populated.
    *   [x] **Sub-step 1.4.7:** Clear input field, click Save.
        *   *Verification:* Success message appears (as saving empty is allowed).
    *   [x] **Sub-step 1.4.8:** Re-open options page.
        *   *Verification:* Field is empty.

---

## Phase 2: Basic Content Script Setup & Button Injection

*   **Goal:** Inject the content script into LinkedIn pages, detect comment input fields, and dynamically add the EngageIQ icon button next to them (F1).
*   **Prerequisites:** Phase 0 completed, EngageIQ icon available.

*   **Step 2.1: Finalize Manifest Declarations for Content Script**
    *   [x] **Sub-step 2.1.1:** Open `manifest.json`.
    *   [x] **Sub-step 2.1.2:** Confirm `permissions`: `["storage", "scripting"]`.
        *   *Verification:* Permissions array is correct.
    *   [x] **Sub-step 2.1.3:** Confirm `host_permissions`: `["*://*.linkedin.com/*", ... ]`.
        *   *Verification:* Includes LinkedIn pattern.
    *   [x] **Sub-step 2.1.4:** Finalize `content_scripts` declaration for `js/content_script.js` and `css/content_style.css`. Create empty `css/content_style.css` if missing.
        *   *Verification:* `content_scripts` declaration is correct. `css/content_style.css` exists.

*   **Step 2.2: Implement Basic Content Script (`js/content_script.js`)**
    *   [x] **Sub-step 2.2.1:** Create/Open `js/content_script.js`.
    *   [x] **Sub-step 2.2.2:** Add a simple `console.log("EngageIQ Content Script Loaded");`.
        *   *Verification:* Log message appears in main page console on LinkedIn.

*   **Step 2.3: Implement Comment Field Detection Logic**
    *   [x] **Sub-step 2.3.1:** Define initial target CSS selectors for comment box containers/inputs (e.g., `.feed-shared-update-v2 .comments-comment-box__form`, `div[aria-label="Write a comment"]`). **Document these WILL need iteration.**
        *   *Verification:* Initial selectors documented in code comments.
    *   [x] **Sub-step 2.3.2:** Implement `findCommentBoxes()` using `document.querySelectorAll()`.
        *   *Verification:* Calling function in console returns expected elements.
    *   [x] **Sub-step 2.3.3:** Set up a `MutationObserver` watching `document.body` (subtree, childList) to call `processCommentBoxes()` on changes.
        *   *Verification:* Observer callback triggers logs/function calls on LinkedIn page interaction.
    *   [x] **Sub-step 2.3.4:** Create `processCommentBoxes()` that calls `findCommentBoxes()` and iterates results.
        *   *Verification:* Function exists.

*   **Step 2.4: Implement Button Injection Logic**
    *   [x] **Sub-step 2.4.1:** Inside loop in `processCommentBoxes()`, check if button already injected using a marker (e.g., `data-engageiq-button-injected="true"`).
        *   *Verification:* Check logic exists.
    *   [x] **Sub-step 2.4.2:** If not injected, create button element (`document.createElement('button')`).
        *   *Verification:* Button creation code exists.
    *   [x] **Sub-step 2.4.3:** Style button as icon button: Set `type="button"`, basic CSS (no border/bg), add `<img>` inside with `src = chrome.runtime.getURL("icons/icon16.png")`, set img size.
        *   *Verification:* Button contains `<img>` with correct icon URL. Basic styling applied.
    *   [x] **Sub-step 2.4.4:** Add `title` attribute to button for tooltip ("Generate Comments with EngageIQ").
        *   *Verification:* `button.title` is set.
    *   [x] **Sub-step 2.4.5:** Determine insertion point and append button to DOM relative to comment box.
        *   *Verification:* Button insertion code exists.
    *   [x] **Sub-step 2.4.6:** Mark comment box element as processed (e.g., set `data-engageiq-button-injected="true"`).
        *   *Verification:* Marker is applied after injection.
    *   [x] **Sub-step 2.4.7:** Call `processCommentBoxes()` once initially after script loads.
        *   *Verification:* Initial call exists.

*   **Step 2.5: Initial Verification on LinkedIn Page**
    *   [x] **Sub-step 2.5.1:** Reload extension. Check for errors.
    *   [x] **Sub-step 2.5.2:** Go to LinkedIn feed/post page.
    *   [x] **Sub-step 2.5.3:** Check console for "Loaded" message and observer messages. Check for script errors.
    *   [ ] **Sub-step 2.5.4:** Locate comment input fields.
        *   *Verification:* EngageIQ icon button appears nearby.
    *   [x] **Sub-step 2.5.5:** Hover over the icon button.
        *   *Verification:* Tooltip appears.
    *   [x] **Sub-step 2.5.6:** Scroll down feed to load more posts.
        *   *Verification:* Button appears on new posts, no duplicates on old ones.
    *   [x] **Sub-step 2.5.7:** Navigate to a single post page.
        *   *Verification:* Button appears (if selectors match).
    *   [x] **Sub-step 2.5.8:** Inspect the DOM.
        *   *Verification:* Injected button HTML is correct. Marker attribute is present on processed comment boxes.

---

## Phase 3: Basic Popup (Iframe) Framework

*   **Goal:** Create the basic HTML/CSS/JS files for the popup iframe. Implement Content Script logic to create, style, and show/hide this iframe when the EngageIQ icon button is clicked.
*   **Prerequisites:** Phase 2 completed, `web_accessible_resources` declared.

*   **Step 3.1: Create Popup HTML Structure (`html/popup.html`)**
    *   [x] **Sub-step 3.1.1:** Create/Open `html/popup.html`.
    *   [x] **Sub-step 3.1.2:** Add basic HTML structure.
        *   *Verification:* Valid HTML boilerplate.
    *   [x] **Sub-step 3.1.3:** Link to Bootstrap CSS (`../assets/bootstrap.min.css`) and custom CSS (`../css/popup.css`) in `<head>`. Create empty `css/popup.css`.
        *   *Verification:* `<link>` tags exist. `css/popup.css` exists.
    *   [x] **Sub-step 3.1.4:** Add basic body structure (`container-fluid`), placeholder title, divs for loading (`#loadingState`), error (`#errorState`), and content (`#suggestionAccordionPlaceholder`, initially visible with placeholder text). Include Bootstrap JS and `popup.js` script tags.
        *   *Verification:* `popup.html` has structure, placeholders, includes JS.
    *   [x] **Sub-step 3.1.5:** Ensure `js/popup.js` exists (can be empty).
        *   *Verification:* `js/popup.js` exists.

*   **Step 3.2: Create Basic Popup CSS (`css/popup.css`)**
    *   [x] **Sub-step 3.2.1:** Create/Open `css/popup.css`.
    *   [x] **Sub-step 3.2.2:** Add minimal styling for iframe content (e.g., reset body margin, base font size).
        *   *Verification:* `popup.css` exists. `popup.html` renders basic content.

*   **Step 3.3: Create Basic Popup JavaScript (`js/popup.js`)**
    *   [ ] **Sub-step 3.3.1:** Create/Open `js/popup.js`.
    *   [ ] **Sub-step 3.3.2:** Add `console.log("EngageIQ Popup Script Loaded");`.
        *   *Verification:* Log appears in iframe's console.
    *   [ ] **Sub-step 3.3.3:** Add `window.addEventListener('message', ...)` structure with origin check placeholder and basic logging of received data.
        *   *Verification:* Listener structure exists. Logs appear in iframe console when messages are received later.

*   **Step 3.4: Style the Iframe Container (`css/content_style.css`)**
    *   [x] **Sub-step 3.4.1:** Create/Open `css/content_style.css`.
    *   [x] **Sub-step 3.4.2:** Define CSS rules for `#engageiq-popup-iframe` (position: fixed, top, right, width, height, z-index, border, shadow, background-color, `display: none`).
        *   *Verification:* `content_style.css` contains rules for iframe container. Ensure linked in manifest.

*   **Step 3.5: Update Content Script (`js/content_script.js`) to Manage Iframe**
    *   [ ] **Sub-step 3.5.1:** Define variable `engageIQIframe = null;`.
    *   [ ] **Sub-step 3.5.2:** Create function `getOrCreateIframe()`: Checks existence, creates `<iframe>`, sets `id="engageiq-popup-iframe"`, sets `src = chrome.runtime.getURL("html/popup.html")`, appends to `document.body`, stores reference. Returns element.
        *   *Verification:* Function creates/returns iframe, prevents duplicates.
    *   [ ] **Sub-step 3.5.3:** Add click listener `handleEngageIQButtonClick` to the injected buttons (in Phase 2 loop).
        *   *Verification:* `button.addEventListener('click', ...)` is added.
    *   [ ] **Sub-step 3.5.4:** Create function `handleEngageIQButtonClick(event)`.
        *   *Verification:* Function exists.
    *   [ ] **Sub-step 3.5.5:** Inside handler: Call `getOrCreateIframe()`. Toggle iframe `display` style between `block` and `none`. Log showing/hiding action.
        *   *Verification:* Handler calls creator function, toggles `display` style.

*   **Step 3.6: Verify Basic Iframe Display Toggle**
    *   [ ] **Sub-step 3.6.1:** Reload extension. Check errors.
    *   [ ] **Sub-step 3.6.2:** Go to LinkedIn. Verify buttons appear.
    *   [ ] **Sub-step 3.6.3:** Click an EngageIQ icon button.
        *   *Verification:* Iframe appears, styled correctly, shows placeholder content. Console logs confirm showing. Iframe console logs confirm script loaded.
    *   [ ] **Sub-step 3.6.4:** Click same button again.
        *   *Verification:* Iframe disappears. Console logs confirm hiding.
    *   [ ] **Sub-step 3.6.5:** Show iframe. Click a *different* icon button.
        *   *Verification:* The same single iframe instance remains visible/toggles.

---

## Phase 4: Communication Flow & Initial Data Display (Dummy Data)

*   **Goal:** Implement message passing (Content -> Background -> Content -> Iframe) using dummy data.
*   **Prerequisites:** Phases 0-3 completed.

*   **Step 4.1: Update Content Script (`js/content_script.js`) for Outgoing Communication**
    *   [ ] **Sub-step 4.1.1:** Modify `handleEngageIQButtonClick` function.
    *   [ ] **Sub-step 4.1.2:** When showing iframe: Add dummy `postContent` extraction log. Send `SHOW_LOADING` message to iframe via `postMessage` (with origin target). Send `GENERATE_COMMENTS` message to background via `chrome.runtime.sendMessage` (with dummy content). Implement callback for `sendMessage` to handle response and relay `SHOW_SUGGESTIONS` or `SHOW_ERROR` to iframe via `postMessage`. Handle `chrome.runtime.lastError`.
        *   *Verification:* Code exists for dummy extraction, `postMessage` to iframe, `sendMessage` to background, and callback handling response/errors.

*   **Step 4.2: Implement Basic Background Script Logic (`js/background.js`)**
    *   [ ] **Sub-step 4.2.1:** Create/Open `js/background.js`.
    *   [ ] **Sub-step 4.2.2:** Add `chrome.runtime.onMessage` listener structure. Handle `GENERATE_COMMENTS` type. `return true` for async response. Log script loaded message.
        *   *Verification:* Listener structure exists. Log appears in SW console.
    *   [ ] **Sub-step 4.2.3:** Inside `GENERATE_COMMENTS` handler: Use `chrome.storage.sync.get` to retrieve API key. If key missing, `sendResponse` with `GENERATION_ERROR`. If key exists, log key presence (NOT value), create dummy suggestions object, `sendResponse` with `GENERATION_SUCCESS` and dummy payload.
        *   *Verification:* Logic retrieves key, handles missing key error, creates dummy data, sends success/error response correctly.

*   **Step 4.3: Enhance Popup Script (`js/popup.js`) to Display Data**
    *   [ ] **Sub-step 4.3.1:** Open `js/popup.js`.
    *   [ ] **Sub-step 4.3.2:** Get DOM references to `#loadingState`, `#errorState`, `#suggestionAccordionPlaceholder`.
        *   *Verification:* Variables reference elements.
    *   [ ] **Sub-step 4.3.3:** Enhance `message` listener: Add `switch` statement for `type`. Handle `SHOW_LOADING` (show loading, hide others), `SHOW_ERROR` (show error div with payload message, hide others), `SHOW_SUGGESTIONS` (hide loading/error, display stringified `payload.suggestions` in content placeholder).
        *   *Verification:* Listener manages visibility of states. `SHOW_ERROR` displays message. `SHOW_SUGGESTIONS` displays stringified dummy data.

*   **Step 4.4: Verify End-to-End Communication Flow**
    *   [ ] **Sub-step 4.4.1:** Ensure NO API key saved.
    *   [ ] **Sub-step 4.4.2:** Reload extension.
    *   [ ] **Sub-step 4.4.3:** Go to LinkedIn, click button.
        *   *Verification:* Popup shows loading, then "API Key not set" error.
    *   [ ] **Sub-step 4.4.4:** Save API key via Options page.
    *   [ ] **Sub-step 4.4.5:** Go back to LinkedIn (refresh if needed), click button.
        *   *Verification:* Popup shows loading, then `pre`-formatted JSON of dummy suggestions.
    *   [ ] **Sub-step 4.4.6:** Close and reopen popup.
        *   *Verification:* Flow repeats correctly.

---

## Phase 5: Gemini API Integration & Real Data Flow

*   **Goal:** Modify Background SW to call Gemini API, handle responses/errors, send real data back.
*   **Prerequisites:** Phase 4 completed, valid Gemini API key available.

*   **Step 5.1: Define API Constants and Schemas**
    *   [ ] **Sub-step 5.1.1:** In `background.js`, define constants for Gemini API endpoint URL (e.g., `v1beta/models/gemini-pro:generateContent`) and model name. **Verify endpoint supports JSON mode.**
        *   *Verification:* Constants exist.
    *   [ ] **Sub-step 5.1.2:** Define `GENERATION_SCHEMA` constant object (matching PRD O5 structure).
        *   *Verification:* Schema constant exists and matches PRD.

*   **Step 5.2: Construct the Gemini API Request**
    *   [ ] **Sub-step 5.2.1:** Modify `GENERATE_COMMENTS` handler in `background.js` (after getting key).
    *   [ ] **Sub-step 5.2.2:** Create prompt string including instructions (6 reaction types, match language, medium length, professional tone) and the real `message.payload.postContent`.
        *   *Verification:* Prompt construction exists, uses real content, includes instructions.
    *   [ ] **Sub-step 5.2.3:** Create `requestBody` object for `fetch`. Include `contents` (with prompt), `tool_config` (mode ANY/FUNCTION, allowed function name), and `tools` (function declaration with name, description, parameters: `GENERATION_SCHEMA`). **Ensure structure matches Gemini API requirements for JSON mode.**
        *   *Verification:* `requestBody` created correctly for JSON output using schema.

*   **Step 5.3: Execute the API Call using `fetch`**
    *   [ ] **Sub-step 5.3.1:** Replace dummy data generation with `fetch` call.
    *   [ ] **Sub-step 5.3.2:** Use correct `API_URL` (check key in URL vs header), `POST` method, `Content-Type: application/json` header, `x-goog-api-key` header (preferred), stringified `requestBody`.
        *   *Verification:* `fetch` call structure is correct.

*   **Step 5.4: Handle `fetch` Response and Errors**
    *   [ ] **Sub-step 5.4.1:** Implement `.then(response => ...)` block.
    *   [ ] **Sub-step 5.4.2:** Check `response.ok`. If not OK, handle status codes (400, 401/403, 429, 5xx) sending specific `GENERATION_ERROR` messages via `sendResponse`. Log details.
        *   *Verification:* `response.ok` check exists. Specific errors handled via `sendResponse`.
    *   [ ] **Sub-step 5.4.3:** Implement `.catch(error => ...)` block. Log network error, send `GENERATION_ERROR` (Network) via `sendResponse`.
        *   *Verification:* `.catch` block exists and sends network error message.

*   **Step 5.5: Parse Successful Gemini Response**
    *   [ ] **Sub-step 5.5.1:** Implement `.then(data => ...)` block after `response.json()`.
    *   [ ] **Sub-step 5.5.2:** Navigate response structure (`data.candidates[0].content.parts[0].functionCall.args`). **Verify path.**
    *   [ ] **Sub-step 5.5.3:** Check `candidate.finishReason` (handle SAFETY etc. blocks by sending `GENERATION_ERROR`). Check `promptFeedback`. Extract `functionCall.args`. Assume it's an object (or parse if string - **test this**). Validate structure (`.comments` object exists). If valid, `sendResponse` with `GENERATION_SUCCESS` containing `args.comments`. Handle extraction/validation errors by sending `GENERATION_ERROR`.
        *   *Verification:* Code navigates response, checks finish reason, extracts/validates args, sends success (`args.comments`) or specific errors via `sendResponse`.

*   **Step 5.6: Verify End-to-End Flow with Real API**
    *   [ ] **Sub-step 5.6.1:** Ensure VALID API key saved.
    *   [ ] **Sub-step 5.6.2:** Reload extension.
    *   [ ] **Sub-step 5.6.3:** Go to LinkedIn, click button.
        *   *Verification:* Popup shows loading, then `pre`-formatted JSON of *actual* Gemini suggestions based on (dummy) post content. Check consoles for success logs.
    *   [ ] **Sub-step 5.6.4:** Test error handling (invalid key, network disconnect, rate limit, content policy if possible).
        *   *Verification:* Popup displays the specific error messages defined in 5.4/5.5.

---

## Phase 6: Displaying Suggestions in Popup UI

*   **Goal:** Update Popup Iframe to render suggestions into Bootstrap Accordion.
*   **Prerequisites:** Phase 5 completed. Bootstrap JS/CSS loaded in iframe.

*   **Step 6.1: Update Popup HTML (`html/popup.html`) with Accordion Structure**
    *   [ ] **Sub-step 6.1.1:** Open `html/popup.html`.
    *   [ ] **Sub-step 6.1.2:** Replace `#suggestionAccordionPlaceholder` with `<div class="accordion" id="suggestionsAccordion"></div>`.
    *   [ ] **Sub-step 6.1.3:** Keep `#loadingState` and `#errorState` separate.
        *   *Verification:* `popup.html` contains the accordion container div. Placeholder removed. Loading/error divs remain.

*   **Step 6.2: Update Popup JavaScript (`js/popup.js`) - Message Handling**
    *   [ ] **Sub-step 6.2.1:** Open `js/popup.js`.
    *   [ ] **Sub-step 6.2.2:** Locate `SHOW_SUGGESTIONS` case in message listener.
    *   [ ] **Sub-step 6.2.3:** Modify case: Get reference to `#suggestionsAccordion`. Call `displaySuggestions(payload.suggestions)`. Ensure accordion container visible, loading/error hidden.
        *   *Verification:* Case calls `displaySuggestions`, manages UI states.
    *   [ ] **Sub-step 6.2.4:** Modify `SHOW_LOADING` / `SHOW_ERROR` cases to also hide `#suggestionsAccordion`.
        *   *Verification:* Loading/error states hide accordion.

*   **Step 6.3: Implement Suggestion Rendering Function (`js/popup.js`)**
    *   [ ] **Sub-step 6.3.1:** Create function `displaySuggestions(suggestions)`.
        *   *Verification:* Function exists.
    *   [ ] **Sub-step 6.3.2:** Get reference to `#suggestionsAccordion`.
    *   [ ] **Sub-step 6.3.3:** Clear previous content (`accordionContainer.innerHTML = '';`).
        *   *Verification:* Container is cleared on re-render.
    *   [ ] **Sub-step 6.3.4:** Define reaction type order (e.g., `['insightful', 'like', ...]`).
    *   [ ] **Sub-step 6.3.5:** Iterate through ordered reaction types: generate unique IDs, create HTML string/DOM elements for accordion item (`.accordion-item`, `.accordion-header`, `.accordion-button`, `.accordion-collapse`, `.accordion-body`). Inside body: add paragraph for text (`id="suggestion-text-${reactionType}"`), add buttons ('-', '+', 'Accept') with classes/data attributes (`data-reaction="..."`). Append item to container.
        *   *Verification:* Function generates and appends correct Bootstrap accordion structure for each suggestion, including text and buttons with identifiers.

*   **Step 6.4: Add Basic Event Listeners for Buttons (`js/popup.js`)**
    *   [ ] **Sub-step 6.4.1:** Implement `addAccordionButtonListeners()` function using event delegation on `#suggestionsAccordion`. Call this after populating accordion.
    *   [ ] **Sub-step 6.4.2:** Inside listener: Identify clicked button (`.shorter-btn`, `.longer-btn`, `.accept-btn`) and `data-reaction`. Get current text content for relevant suggestion. Log button type and reaction. Send appropriate `postMessage` (`REQUEST_SHORTER`, `REQUEST_LONGER`, `ACCEPT_SUGGESTION`) to parent (Content Script) with necessary payload (reactionType, currentText / textToAccept). Use `"*"` origin target initially or refine.
        *   *Verification:* Listener identifies buttons/reactions, logs clicks, sends correct `postMessage` to parent with payload.

*   **Step 6.5: Verify UI Rendering and Basic Button Interaction**
    *   [ ] **Sub-step 6.5.1:** Ensure valid API key saved. Reload extension.
    *   [ ] **Sub-step 6.5.2:** Go to LinkedIn, click button.
        *   *Verification:* Popup shows loading, then Bootstrap Accordion with 6 items (reaction types). Suggestion text from API is displayed inside each (collapsed).
    *   [ ] **Sub-step 6.5.3:** Click accordion headers.
        *   *Verification:* Items expand/collapse smoothly, showing text and buttons.
    *   [ ] **Sub-step 6.5.4:** Click '-', '+', 'Accept' buttons.
        *   *Verification:* Iframe console logs button type/reaction. Main page console shows message received from iframe (`REQUEST_*`, `ACCEPT_*`). Popup closes on 'Accept'.

---

## Phase 7: Implementing Length Adjustment Functionality

*   **Goal:** Enable '+' and '-' buttons to trigger Gemini regeneration and update UI.
*   **Prerequisites:** Phase 6 completed. Buttons send messages.

*   **Step 7.1: Update Background Script (`js/background.js`) to Handle Regeneration Requests**
    *   [ ] **Sub-step 7.1.1:** Add `REGENERATE_LONGER`, `REGENERATE_SHORTER` cases to `onMessage` listener. Call `handleRegenerationRequest`, `return true`.
        *   *Verification:* Listener handles new types.
    *   [ ] **Sub-step 7.1.2:** Create `handleRegenerationRequest(requestType, payload, sendResponse)`.
        *   *Verification:* Function exists.
    *   [ ] **Sub-step 7.1.3:** Inside handler: Retrieve API key (`chrome.storage.sync.get`), handle missing key error (`sendResponse` error).
        *   *Verification:* Key retrieval/error handling exists.
    *   [ ] **Sub-step 7.1.4:** Define `REGENERATION_SCHEMA` constant (single `regeneratedComment` string property).
        *   *Verification:* Schema constant exists.
    *   [ ] **Sub-step 7.1.5:** Construct regeneration prompt based on `requestType` ('longer'/'shorter'), `payload` (reactionType, currentText), instructing Gemini on task/constraints (maintain language/tone, adjust length, use JSON schema).
        *   *Verification:* Regeneration prompt construction is correct.
    *   [ ] **Sub-step 7.1.6:** Create `requestBody` for regeneration using new prompt and `REGENERATION_SCHEMA` (with appropriate tool/function name).
        *   *Verification:* `requestBody` for regeneration API call is correct.
    *   [ ] **Sub-step 7.1.7:** Perform `fetch` call to Gemini API using regeneration request body.
        *   *Verification:* `fetch` call exists.
    *   [ ] **Sub-step 7.1.8:** Handle `fetch` response/errors: check `response.ok`, handle status codes (4xx, 5xx), handle network error (`catch`). Send `REGENERATION_ERROR` via `sendResponse` (include `reactionType` in payload).
        *   *Verification:* Error handling for regeneration fetch exists, includes `reactionType`.
    *   [ ] **Sub-step 7.1.9:** Parse successful response: Navigate JSON, check `finishReason`, extract `functionCall.args.regeneratedComment`. Handle parsing/structure errors by sending `REGENERATION_ERROR`. If success, `sendResponse` with `REGENERATION_SUCCESS` (payload includes `newText`, `reactionType`).
        *   *Verification:* Success handler extracts `regeneratedComment`, sends success response. Error handling exists.

*   **Step 7.2: Update Content Script (`js/content_script.js`) to Handle Regeneration Response**
    *   [ ] **Sub-step 7.2.1:** Open `js/content_script.js`.
    *   [ ] **Sub-step 7.2.2:** (Refinement): Ensure iframe message listener (`window.addEventListener('message', ...)`) is robust.
    *   [ ] **Sub-step 7.2.3:** Inside iframe message listener: Handle `REQUEST_LONGER`/`REQUEST_SHORTER` messages. Relay message to background using `chrome.runtime.sendMessage`. Implement callback: handle `REGENERATION_SUCCESS` (send `UPDATE_SINGLE_SUGGESTION` to iframe), handle `REGENERATION_ERROR` (send `SHOW_ERROR` or similar to iframe). Handle `chrome.runtime.lastError`. Update `ACCEPT_SUGGESTION` handler to correctly hide iframe.
        *   *Verification:* Listener relays requests to background, handles callback, relays success/error back to iframe. Accept logic hides iframe.

*   **Step 7.3: Update Popup Script (`js/popup.js`) to Handle UI Updates**
    *   [ ] **Sub-step 7.3.1:** Open `js/popup.js`.
    *   [ ] **Sub-step 7.3.2:** Add case `UPDATE_SINGLE_SUGGESTION` to message listener `switch`.
    *   [ ] **Sub-step 7.3.3:** Inside case: Get `reactionType`, `newText` from payload. Find suggestion text element (`#suggestion-text-${reactionType}`). Update its `textContent` with `newText`. Log success/error.
        *   *Verification:* Listener handles update message, finds correct element, updates text content.

*   **Step 7.4: Verify End-to-End Length Adjustment**
    *   [ ] **Sub-step 7.4.1:** Ensure valid API key saved. Reload extension.
    *   [ ] **Sub-step 7.4.2:** Go to LinkedIn, generate suggestions.
    *   [ ] **Sub-step 7.4.3:** Expand an item.
    *   [ ] **Sub-step 7.4.4:** Click '+' button.
        *   *Verification:* Background logs show successful regeneration. Popup suggestion text updates to longer version.
    *   [ ] **Sub-step 7.4.5:** Click '-' button.
        *   *Verification:* Background logs show successful regeneration. Popup suggestion text updates to shorter version.
    *   [ ] **Sub-step 7.4.6:** Test error handling during regeneration (invalid key, network error).
        *   *Verification:* Popup shows relevant error message. Text does not change.

---

## Phase 8: Implementing Real Post Content Extraction (O3)

*   **Goal:** Replace dummy post content extraction with logic to find and extract actual post text from LinkedIn DOM. **(Iterative Task)**
*   **Prerequisites:** Phase 2 completed (button injection).

*   **Step 8.1: Analyze LinkedIn Post Structure (Investigation)**
    *   [ ] **Sub-step 8.1.1:** Manually inspect feed/single post HTML using dev tools.
    *   [ ] **Sub-step 8.1.2:** Identify common ancestor selector for a whole post (e.g., `.feed-shared-update-v2`).
        *   *Verification:* Reliable ancestor selector identified.
    *   [ ] **Sub-step 8.1.3:** Identify selector(s) for main post text content element(s) within ancestor (e.g., `.feed-shared-inline-show-more-text`, `.update-components-text`).
        *   *Verification:* Candidate text selectors identified.
    *   [ ] **Sub-step 8.1.4:** Consider "See more" handling strategy. **MVP Decision:** Grab visible text only.
        *   *Verification:* MVP strategy decided.

*   **Step 8.2: Implement Post Content Extraction Function (`js/content_script.js`)**
    *   [ ] **Sub-step 8.2.1:** Create function `extractPostContent(clickedButtonElement)`.
        *   *Verification:* Function exists.
    *   [ ] **Sub-step 8.2.2:** Inside function: Use `closest()` with ancestor selector (from 8.1.2) starting from `clickedButtonElement`. Handle not found error (return null).
        *   *Verification:* Ancestor finding logic exists with error handling.
    *   [ ] **Sub-step 8.2.3:** From ancestor: Use `querySelector()` with text content selector(s) (from 8.1.3). Handle not found error (return null).
        *   *Verification:* Text element finding logic exists with error handling.
    *   [ ] **Sub-step 8.2.4:** Extract text using `textContent`/`innerText`. Trim whitespace. Handle empty text case (return ""). Log raw extracted text for debugging. Return text/empty string/null.
        *   *Verification:* Text extraction logic exists, handles empty, logs, returns value.

*   **Step 8.3: Integrate Extraction into Button Click Handler (`js/content_script.js`)**
    *   [ ] **Sub-step 8.3.1:** Modify `handleEngageIQButtonClick(event)`.
    *   [ ] **Sub-step 8.3.2:** Replace dummy content line with call to `extractPostContent(event.target.closest('button'))`.
        *   *Verification:* Call replaces dummy assignment.
    *   [ ] **Sub-step 8.3.3:** Check if `postContent` is null or empty. If so, show error in popup (send `SHOW_ERROR` message) and `return` (do not call background script). If valid, proceed with `SHOW_LOADING` and `chrome.runtime.sendMessage` using the *real* `postContent`.
        *   *Verification:* Check exists. Error shown and background call skipped on failure. Real content sent on success.

*   **Step 8.4: Verify Real Content Extraction and Error Handling**
    *   [ ] **Sub-step 8.4.1:** Reload extension. Clear console.
    *   [ ] **Sub-step 8.4.2:** Test on various LinkedIn post types (text, image+text, video+text, share, "see more").
    *   [ ] **Sub-step 8.4.3:** For each type, click EngageIQ button.
        *   *Verification:* Check console logs for accurately extracted text. If success, popup generates suggestions based on *real* content. If failure (common initially), popup shows "Could not extract post content" error.
    *   [ ] **Sub-step 8.4.4:** **Iterate:** If extraction fails for common types, refine selectors/logic (Step 8.1/8.2), reload, re-verify. Repeat until reasonably robust for MVP target posts.

---

## Phase 9: Final Polish & Testing

*   **Goal:** Ensure stability, usability, code quality, and documentation for MVP release.
*   **Prerequisites:** Phases 0-8 completed.

*   **Step 9.1: Code Review and Cleanup**
    *   [ ] **Sub-step 9.1.1:** Review all JS files.
    *   [ ] **Sub-step 9.1.2:** Remove/comment out debug `console.log` statements.
        *   *Verification:* Codebase search shows only essential logs remain.
    *   [ ] **Sub-step 9.1.3:** Add comments explaining complex logic (DOM traversal, API calls, `postMessage`).
        *   *Verification:* Complex sections are commented.
    *   [ ] **Sub-step 9.1.4:** Run `npm run lint` and `npm run format`. Fix issues.
        *   *Verification:* Tools report no errors/changes.
    *   [ ] **Sub-step 9.1.5:** Ensure clear variable/function names. Refactor if needed.
        *   *Verification:* Code reviewed for readability.

*   **Step 9.2: UI Refinement**
    *   [ ] **Sub-step 9.2.1:** Refine iframe container CSS (`content_style.css`) for appearance (size, position, border, shadow, z-index).
        *   *Verification:* Iframe looks professional and well-positioned.
    *   [ ] **Sub-step 9.2.2:** Refine popup content CSS (`popup.css`) for padding, fonts, accordion, buttons. Test text wrapping.
        *   *Verification:* Popup content layout is clean, readable. Long text wraps.
    *   [ ] **Sub-step 9.2.3:** Check injected icon button appearance and tooltip.
        *   *Verification:* Icon button looks good, tooltip works.

*   **Step 9.3: Error Handling Refinement**
    *   [ ] **Sub-step 9.3.1:** Review all user-facing error messages (in popup).
    *   [ ] **Sub-step 9.3.2:** Ensure messages are user-friendly and actionable where possible.
        *   *Verification:* Error messages are clear.
    *   [ ] **Sub-step 9.3.3:** Verify loading indicators are hidden when errors occur.
        *   *Verification:* Test error scenarios; loading states are removed.

*   **Step 9.4: Basic Accessibility Checks**
    *   [ ] **Sub-step 9.4.1:** Verify icon button has `title` attribute.
    *   [ ] **Sub-step 9.4.2:** Check keyboard navigation (Tab) within popup iframe. Check focus outlines.
        *   *Verification:* Basic keyboard navigation works. Focus visible.
    *   [ ] **Sub-step 9.4.3:** Check for ARIA attributes in accordion (Bootstrap default).
        *   *Verification:* Inspect elements; ARIA attributes present.

*   **Step 9.5: Comprehensive End-to-End Testing**
    *   [ ] **Sub-step 9.5.1:** Test installation.
        *   *Verification:* Installs correctly.
    *   [ ] **Sub-step 9.5.2:** Test Options Page (save/load/clear key).
        *   *Verification:* Works as expected.
    *   [ ] **Sub-step 9.5.3:** Test Button Injection (Feed, Single Post, scroll, duplicates).
        *   *Verification:* Buttons appear correctly.
    *   [ ] **Sub-step 9.5.4:** Test Popup Display (show/hide).
        *   *Verification:* Toggles reliably.
    *   [ ] **Sub-step 9.5.5:** Test Suggestion Generation (Success) on various post types.
        *   *Verification:* Relevant suggestions generated based on extracted content.
    *   [ ] **Sub-step 9.5.6:** Test Accordion Interaction (expand/collapse).
        *   *Verification:* Works smoothly.
    *   [ ] **Sub-step 9.5.7:** Test Length Adjustment (+/- buttons).
        *   *Verification:* Text updates correctly.
    *   [ ] **Sub-step 9.5.8:** Test Accept Suggestion.
        *   *Verification:* Text inserted into comment field, popup closes.
    *   [ ] **Sub-step 9.5.9:** Test Error Handling Cases (No Key, Invalid Key, Network Error, Content Extraction Fails, Rate Limit, Content Policy).
        *   *Verification:* Correct error messages displayed in popup for each case.
    *   [ ] **Sub-step 9.5.10:** Test extension reload/re-enable.
        *   *Verification:* Functionality persists.

*   **Step 9.6: Prepare Basic Documentation (README)**
    *   [ ] **Sub-step 9.6.1:** Create `README.md` file.
        *   *Verification:* File exists.
    *   [ ] **Sub-step 9.6.2:** Add content: Name, Description, Features, Install Instructions, Usage, API Key Requirement (link), Privacy Note, Known Issues/Limitations.
        *   *Verification:* README contains required sections.

*   **Step 9.7: Final Asset and Manifest Check**
    *   [ ] **Sub-step 9.7.1:** Double-check icon paths/sizes in `manifest.json`.
    *   [ ] **Sub-step 9.7.2:** Confirm final `version` number (e.g., "1.0.0").
    *   [ ] **Sub-step 9.7.3:** Confirm `web_accessible_resources` lists all needed files.
    *   [ ] **Sub-step 9.7.4:** Confirm `permissions` and `host_permissions` are minimal required.
        *   *Verification:* `manifest.json` is reviewed and finalized.

---