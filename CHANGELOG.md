# Changelog

## 0.7.3-alpha

### Fixed
- Slack Copy member ID: add mouseover/mouseenter/mousemove before click to simulate hover activation

## 0.7.2-alpha

### Attempted Fix
- Slack Copy member ID: target inner .c-menu_item__label div instead of parent button
- Fire both menuClick and simClick on the label as fallback

## 0.7.1-alpha

### Fixed
- Slack Copy member ID: use data-qa="menu_item_button" selector and mousedown/mouseup/click sequence (final fix)

## 0.7.0-alpha

### Attempted Fix
- Slack Copy member ID: tried plain .click() instead of simClick — still dismissed menu

### Changed
- Slack ID copy retry: re-opens More menu and retries every 3 seconds if clipboard empty
- Yopass Generate Secret: broadened button selector to match by text content
- Pipeline step 6: alert user to verify fields, only proceed to Yopass after Build is clicked

## 0.6.1-alpha

### Fixed
- Assign-roles Save redirect: detect /role-strategy/ landing page instead of click listener that died on navigation

## 0.6.0-alpha

### Attempted Fix
- Assign-roles: tried Save button click listener to trigger next step — failed because page navigation killed the script context

### Changed
- Slack ID copy: clipboard watchdog polls every 500ms instead of single read attempt
- Clear clipboard before opening Slack for clean watchdog baseline

## 0.5.0-alpha

### Fixed
- Create User button not being clicked (broadened selector to match button text)

### Attempted Fix
- Slack ID copy: polling loop from pipeline tab — failed because script context died when tab lost focus

### Changed
- Track pipeline tab ID, re-inject content script after Slack ID is found
- Split pipeline step into step 4 (fill + open Slack) and step 6 (fill Slack ID + build)

## 0.4.0-alpha

### Changed
- Centralized all environment URLs into a single CONFIG object in background.js
- Made manifest.json URL-agnostic with wildcard match patterns
- Content scripts now receive config via getState for dynamic URL references
- Relaxed timeouts across all content scripts for improved reliability
- Clipboard copy of full name in step 1 for form auto-fill

## 0.2.0-alpha

### Added
- Auto-submit user creation form (no manual click needed)
- Auto-run alert targets pipeline after Slack ID is filled
- Auto-send credentials message to user via Slack DM
- Tab tracking — all opened tabs are closed automatically after completion
- Stable extension ID via manifest key (no more duplicates on reload)
- Custom extension icon

### Changed
- Increased all Slack interaction timeouts to 1000ms for reliability
- Slack tab stays open after copying member ID (reused for sending message)
- Yopass now triggers Slack message send instead of resolving Jira directly
- Flow is now 8 steps instead of 7
- Popup uses HTML entities for special characters (fixes encoding issues)
- Jira content script injected on demand via chrome.scripting.executeScript

### Fixed
- UTF-8 charset declaration in popup (fixes garbled emoji/arrows)
- Handle tickets already in "In Progress" state without hanging
- Close status dropdown if "Start progress" option not found
- "Could not establish connection" error on Jira pages

## 0.1.1-alpha

### Attempted Fix
- Detect navigation after assign-roles save to auto-proceed — unreliable across page reloads

## 0.1.0-alpha

### Added
- Initial release
- 7-step automated onboarding flow across Jira, Jenkins, Slack, and Yopass
- Chrome extension with popup UI showing current step and user details
- Content scripts for each platform
- Background service worker for cross-tab state management
- Persistent state via chrome.storage
