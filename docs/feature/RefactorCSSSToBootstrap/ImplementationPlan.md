# CSS to Bootstrap 5 Refactoring Implementation Plan

## Overview

This plan outlines the steps to refactor the custom CSS files (`options.css`, `content_style.css`, `popup.css`) to utilize the Bootstrap 5 framework, based on the analysis in `CSS_Bootstrap_Analysis.md`.

## Phase 1: Refactor `options.css`

### Step 1.1: Prepare `options.html`

1.  **Verify Bootstrap CSS Link**
    *   Action: Open `html/options.html`. Confirm that `assets/css/bootstrap.min.css` is correctly linked in the `<head>`.
    *   Verification: Load `options.html` in the browser. Inspect the network tab or element styles to confirm Bootstrap styles are being applied.

2.  **Apply Body Padding**
    *   Action: In `html/options.html`, add the `p-3` class to the `<body>` tag or a primary wrapper `<div>` directly inside the body.
    *   Verification: Reload `options.html`. Inspect the body/wrapper element to confirm padding is applied. Check visually for appropriate spacing around the content.

### Step 1.2: Refactor Container Element

1.  **Replace Custom Container**
    *   Action: Locate the main content container `<div>` in `html/options.html`. Replace its existing custom class (if any) with `container` and add the `mt-3` class.
    *   Verification: Reload `options.html`. Inspect the container element. Verify it has Bootstrap's container styles (responsive max-width) and top margin. Check visual centering and width.

2.  **(Optional) Apply Custom Max-Width**
    *   Action: If the specific `max-width: 600px` is strictly required and Bootstrap's default `.container` width is not suitable, create a minimal CSS rule like `.options-container { max-width: 600px !important; }` (either in a `<style>` tag in `options.html` or a new small CSS file) and apply the `options-container` class instead of or in addition to `container`.
    *   Verification: Reload `options.html`. Inspect the container element and verify its `max-width` is exactly 600px.

### Step 1.3: Refactor Status Message (`#statusMessage`)

1.  **Replace Status Classes with Alerts**
    *   Action: In `html/options.html`, locate the element with `id="statusMessage"`. Remove any existing `success` or `error` classes.
    *   Verification: Check the HTML structure to confirm old classes are removed.

2.  **Apply Alert Base Classes**
    *   Action: Add the Bootstrap classes `alert mt-3 fw-bold` to the `#statusMessage` element.
    *   Verification: Reload `options.html` (ensure the message is visible for testing). Inspect the element to confirm base alert styles, margin, and font weight.

3.  **Update JavaScript for Dynamic Alerts**
    *   Action: Open `js/options.js`. Locate the code that adds/removes the `success` and `error` classes to `#statusMessage`. Modify this logic to add/remove `alert-success` or `alert-danger` instead.
    *   Verification: Perform actions in the options page that trigger success and error messages. Verify the correct Bootstrap alert styles (`alert-success` green or `alert-danger` red) appear dynamically.

### Step 1.4: Cleanup and Final Verification

1.  **Remove Old CSS Link**
    *   Action: In `html/options.html`, remove the `<link>` tag referencing `css/options.css`.
    *   Verification: Reload `options.html`. Verify all styling is now handled by Bootstrap or the minimal custom CSS (if any). Check for style regressions.

2.  **(Optional) Add Remaining Custom CSS**
    *   Action: If the `min-width: 400px` for `body` or the custom `max-width` for the container were deemed necessary in Step 1.2.2, ensure those minimal rules are present (e.g., in a `<style>` tag or a separate small CSS file linked in `options.html`).
    *   Verification: Inspect the relevant elements (`body`, container) to confirm these specific custom styles are applied.

3.  **Test Options Page Functionality**
    *   Action: Thoroughly test all features of the options page (saving API keys, etc.).
    *   Verification: Confirm all functionality works as expected and the UI appears correctly styled using Bootstrap.

4.  **Delete `options.css` File**
    *   Action: Delete the file `css/options.css` from the project.
    *   Verification: Confirm the file is removed from the `css` directory.

## Phase 2: Refactor `content_style.css`

### Step 2.1: Prepare Environment

1.  **Confirm Bootstrap Availability**
    *   Action: Review how CSS is applied by the content script (`content_script.js`). Ensure that Bootstrap styles will be available in the context where elements styled by `content_style.css` are created (e.g., ensure Bootstrap CSS is injected alongside custom styles or is already present on the target page if applicable).
    *   Verification: Manually inspect a LinkedIn page where the extension is active. Use browser dev tools to check if Bootstrap classes applied to extension elements (in later steps) actually receive Bootstrap styles.

### Step 2.2: Refactor `.engageiq-btn`

1.  **Locate Button Creation/Selection Code**
    *   Action: Search within `js/content_script.js` (and potentially its modules like `js/ui/button-injector.js`) for code that creates buttons or selects elements and applies the `engageiq-btn` class.
    *   Verification: Identify all instances where `engageiq-btn` is used.

2.  **Replace with Bootstrap Button Class**
    *   Action: Modify the identified JavaScript code. Replace `element.classList.add('engageiq-btn')` with `element.classList.add('btn')`. If a specific color is intended (e.g., primary action), also add the appropriate Bootstrap variant like `btn-primary`.
    *   Verification: Load the extension on a LinkedIn page where these buttons appear. Inspect the button elements. Confirm they now have the `btn` (and optionally `btn-primary`, etc.) class instead of `engageiq-btn` and render with Bootstrap's default button style.

### Step 2.3: Refactor `.engageiq-btn-icon`

1.  **Locate Icon Button Code**
    *   Action: Search within the relevant JavaScript files (e.g., `button-injector.js`) for code applying the `engageiq-btn-icon` class.
    *   Verification: Identify all instances where `engageiq-btn-icon` is used.

2.  **Replace with Bootstrap Utility Classes**
    *   Action: Modify the JavaScript. Replace `element.classList.add('engageiq-btn-icon')` with multiple `add` calls or a single `add` with multiple arguments: `element.classList.add('btn', 'rounded-circle', 'p-1', 'mx-1', 'd-inline-flex', 'align-items-center', 'justify-content-center')`.
    *   Verification: Load the extension on LinkedIn. Inspect the icon buttons. Confirm they have the new set of Bootstrap classes.

3.  **Apply `.img-fluid` to Icons**
    *   Action: In the JavaScript code that creates the `<img>` tag inside these icon buttons, add the class `img-fluid` to the image element.
    *   Verification: Inspect the `<img>` element within the icon buttons. Confirm it has the `img-fluid` class and scales correctly.

4.  **(Optional) Add Custom CSS for Icon Buttons**
    *   Action: If the exact 36x36px size, specific hover background (`rgba(0,0,0,0.08)`), or transform effects are required, add these specific rules back into `content_style.css` (or a new minimal CSS file), targeting the elements perhaps via a more specific selector or a new dedicated class added alongside the Bootstrap ones.
    *   Verification: Inspect the icon buttons. Verify the custom size/hover/active effects are applied correctly if they were retained.

5.  **Verify Icon Button Functionality**
    *   Action: Click and interact with the icon buttons on a LinkedIn page.
    *   Verification: Confirm the buttons are visually correct and trigger the expected actions.

### Step 2.4: Refactor `#engageiq-popup-iframe`

1.  **Locate Iframe Creation/Styling Code**
    *   Action: Search within the relevant JavaScript files (e.g., `iframe-manager.js`) for code that creates the iframe element and applies styles or the `engageiq-popup-iframe` ID/class.
    *   Verification: Identify the code responsible for the iframe's creation and initial styling.

2.  **Apply Bootstrap Utility Classes**
    *   Action: Modify the JavaScript code to add the following classes to the iframe element: `position-fixed`, `border-0`, `bg-white`, `shadow-lg`, `overflow-hidden`, `d-none`.
    *   Verification: Load the extension on LinkedIn and trigger the popup iframe. Inspect the iframe element. Confirm it has these Bootstrap classes applied.

3.  **Retain Necessary Custom CSS**
    *   Action: Ensure the CSS rules for `top`, `right`, `width`, `height`, `z-index` (if needed beyond Bootstrap defaults), specific `border-radius` (if 10px is required), specific `box-shadow` (if `.shadow-lg` is not suitable), and the `fadeInScale` animation are still present in `content_style.css` (or moved to a new file) and target the iframe (e.g., via its ID `#engageiq-popup-iframe`).
    *   Verification: Inspect the iframe using dev tools. Verify the custom positioning, dimensions, border-radius, shadow, and animation are correctly applied.

4.  **Verify Iframe Appearance and Behavior**
    *   Action: Trigger the popup iframe on a LinkedIn page.
    *   Verification: Confirm the iframe appears in the correct location, has the right size and appearance (shadow, border, background), and animates correctly when appearing.

### Step 2.5: Cleanup and Final Verification

1.  **Remove Redundant CSS Rules**
    *   Action: Open `css/content_style.css`. Remove the CSS rules for `.engageiq-btn` and any other styles that are now fully handled by Bootstrap utilities applied in previous steps.
    *   Verification: Review the remaining rules in `content_style.css`. Ensure only necessary custom styles (e.g., iframe positioning/animation, icon button specifics) remain.

2.  **Test Content Script Styling**
    *   Action: Test the extension extensively on various LinkedIn pages (feed, profile, etc.).
    *   Verification: Ensure all buttons and the iframe appear and behave correctly. Check for any visual regressions or missing styles.

3.  **Consider File Deletion/Reduction**
    *   Action: If *all* rules from `content_style.css` were replaced or moved, delete the file and remove any code that injects/links it. If minimal rules remain, keep the file but ensure it's significantly smaller.
    *   Verification: Confirm the file status (deleted or reduced) and verify the extension still works correctly.

## Phase 3: Refactor `popup.css`

### Step 3.1: Prepare `popup.html`

1.  **Verify Bootstrap CSS Link**
    *   Action: Open `html/popup.html`. Confirm that `assets/css/bootstrap.min.css` is correctly linked in the `<head>`.
    *   Verification: Open the popup (e.g., by clicking the extension icon). Inspect elements to confirm Bootstrap styles are applied.

2.  **Apply Base Body Styles**
    *   Action: In `html/popup.html`, add the `bg-light` class to the `<body>` tag.
    *   Verification: Inspect the popup's body element. Confirm the light background color.

### Step 3.2: Refactor Main Container

1.  **Replace Custom Container Styles**
    *   Action: Locate the main content container `<div>` inside the popup body. Replace its existing classes/styles with Bootstrap classes like `container-fluid bg-white rounded-3 shadow-sm px-3 py-2` (adjust rounding, shadow, padding based on the analysis).
    *   Verification: Inspect the container in the popup. Verify the background, rounding, shadow, and padding match the applied Bootstrap classes.

### Step 3.3: Refactor Typography and General Elements

1.  **Apply Utility Classes**
    *   Action: Go through `html/popup.html` and elements styled by `popup.css` (e.g., `h5`, `#loadingState`, `#errorState`, `.suggestion-content`, `.model-indicator`). Apply Bootstrap utility classes (`.fw-*`, `.text-*`, `.fs-*`/`.small`, `.p-*`, `.m-*`, `.text-break`, `.text-end`, `.border-top`, etc.) where custom styles were previously used.
    *   Verification: Inspect each element type in the popup. Verify that Bootstrap utilities are applying the intended styles (font weight, color, spacing, etc.).

2.  **Add Custom CSS for Deviations**
    *   Action: For styles where Bootstrap utilities don't provide an exact match (e.g., specific font sizes like `0.85rem`, font weight `500`, specific colors like `#0a66c2`, `white-space: pre-wrap`), add minimal custom CSS rules. Place these in a `<style>` block in `popup.html` or preferably in a new, small CSS file (e.g., `css/popup_overrides.css`) linked in `popup.html`.
    *   Verification: Inspect the specific elements requiring custom styles. Verify the custom rules are applied correctly.

### Step 3.4: Refactor Accordion

1.  **Update HTML to Bootstrap Structure**
    *   Action: Modify the HTML in `popup.html` for the suggestions/accordion section to match the standard Bootstrap 5 Accordion component structure (using `.accordion`, `.accordion-item`, `.accordion-header`, `.accordion-button`, `.accordion-collapse`, `.accordion-body`).
    *   Verification: Inspect the accordion elements in the popup. Confirm the HTML structure matches Bootstrap's documentation.

2.  **Remove Custom Accordion CSS**
    *   Action: Delete the corresponding accordion rules from `css/popup.css`.
    *   Verification: The accordion should now render using Bootstrap's default accordion styles.

3.  **(Optional) Apply Custom Accordion Overrides**
    *   Action: If the specific visual appearance from the original `popup.css` (e.g., background colors, padding, border-radius, focus styles) is required, add custom CSS overrides targeting the Bootstrap accordion classes (`.accordion-button`, `.accordion-body`, etc.) in the `<style>` block or override file.
    *   Verification: Inspect the accordion. Verify the custom overrides are applied correctly if they were added.

4.  **Verify Accordion Functionality**
    *   Action: Click to expand and collapse accordion items in the popup.
    *   Verification: Confirm the accordion functions correctly (expanding/collapsing) and is styled as expected (either Bootstrap default or with custom overrides).

### Step 3.5: Refactor Buttons

1.  **Apply Bootstrap Button Classes**
    *   Action: Locate the length adjustment buttons and the accept button in `html/popup.html`. Replace their custom classes/styles with appropriate Bootstrap classes: `.btn`, `.btn-sm`, `.btn-primary`, `.btn-outline-primary`, `.btn-light`, `.w-100`, `.mt-2`, `.rounded-1`, etc.
    *   Verification: Inspect the buttons in the popup. Confirm they have Bootstrap classes and render with Bootstrap styles.

2.  **Apply Layout Utilities to Button Group**
    *   Action: For the `.length-adjustment` container, apply Bootstrap flex/gap utilities: `.d-flex .justify-content-end .mt-2 .gap-2`.
    *   Verification: Inspect the layout of the length adjustment buttons. Confirm they use flexbox, are aligned to the end, and have the correct margin/gap.

3.  **(Optional) Add Custom Button CSS**
    *   Action: If specific non-standard styles (font sizes, colors, hover effects, transforms, focus styles) are required, add custom CSS overrides targeting these buttons in the `<style>` block or override file.
    *   Verification: Inspect the buttons. Verify custom styles are applied correctly if added.

4.  **Verify Button Functionality**
    *   Action: Click all buttons in the popup.
    *   Verification: Confirm buttons are styled correctly and trigger the expected actions.

### Step 3.6: Address Focus Styles

1.  **Remove Custom Focus Rules**
    *   Action: Delete the generic `:focus-visible` rules from `css/popup.css`.
    *   Verification: Custom focus rings should no longer appear.

2.  **Verify Bootstrap Focus Indicators**
    *   Action: Use keyboard navigation (Tab key) to focus on buttons, links, and accordion headers within the popup.
    *   Verification: Confirm that Bootstrap's default focus indicators (typically a blue box-shadow) appear clearly on focused elements.

3.  **(Optional) Re-apply Custom Focus CSS**
    *   Action: If Bootstrap's default focus styles are deemed insufficient or visually inconsistent with the design, re-add the custom `:focus-visible` rules (or modified versions) to the `<style>` block or override file.
    *   Verification: Use keyboard navigation again. Verify the custom focus indicators are applied correctly.

### Step 3.7: Cleanup and Final Verification

1.  **Remove Old CSS Link**
    *   Action: In `html/popup.html`, remove the `<link>` tag referencing `css/popup.css`.
    *   Verification: Reload the popup. Verify styling is handled by Bootstrap and the minimal override CSS (if any). Check for style regressions.

2.  **Consolidate Custom CSS**
    *   Action: Ensure any necessary custom CSS rules identified in previous steps are cleanly organized (either in a single `<style>` block in `popup.html` or in a dedicated override CSS file like `css/popup_overrides.css` linked after Bootstrap).
    *   Verification: Review the location and content of the remaining custom CSS.

3.  **Test Popup Thoroughly**
    *   Action: Test all states and interactions within the popup: loading, error display, suggestion generation, accordion usage, length adjustment, accepting suggestions.
    *   Verification: Confirm all UI elements are styled correctly according to Bootstrap conventions or intentional overrides, and all functionality works as expected.

4.  **Delete `popup.css` File**
    *   Action: Delete the file `css/popup.css` from the project.
    *   Verification: Confirm the file is removed from the `css` directory.

## Phase 4: Final Testing

### Step 4.1: Full Regression Test

1.  **Test All Extension Functionality**
    *   Action: Perform a complete walkthrough of the extension's features: install, open options page, save settings, navigate LinkedIn, trigger content script buttons, open popup, generate suggestions, use accordion, adjust length, accept suggestions.
    *   Verification: Ensure all features work correctly without JavaScript errors.

2.  **Visual Verification**
    *   Action: Visually inspect the options page, the buttons/iframe injected by the content script, and the popup UI.
    *   Verification: Confirm the UI elements are styled consistently using Bootstrap components and utilities, and match the intended design (allowing for minor Bootstrap-native differences unless overridden). Check for any obvious style breakages or regressions.

3.  **Cross-Browser Check (Optional)**
    *   Action: If possible, test the extension in different target browsers (e.g., Chrome, Edge, Firefox).
    *   Verification: Check for major visual inconsistencies or functional issues between browsers.
