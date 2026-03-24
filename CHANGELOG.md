# Changelog

## 0.6.0-alpha

### Fixed
- Slack ID copy watchdog: poll clipboard every 500ms instead of single read attempt
- Assign-roles now waits for Save button click before opening pipeline tab

### Changed
- Clear clipboard before opening Slack for clean watchdog baseline

## 0.5.0-alpha

### Fixed
- Create User button not being clicked (broadened selector to match button text)
- Flow stopping after Slack ID copy (now switches back to pipeline tab, fills Slack ID, re-copies full name, auto-builds)

### Changed
- Background.js now tracks pipeline tab ID and re-injects content-jenkins.js after Slack ID is found
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
- New step 7: Slack message sending (previously manual)
- Stable extension ID via manifest key (no more duplicates on reload)
- Custom extension icon

### Changed
- Increased all Slack interaction timeouts to 1000ms for reliability
- Slack tab stays open after copying member ID (reused for sending message)
- Yopass now triggers Slack message send instead of resolving Jira directly
- Flow is now 8 steps instead of 7
- Popup uses HTML entities for special characters (fixes encoding issues)
- Jira content script restricted to *.atlassian.net (was matching all URLs)
- Jira content script injected on demand via chrome.scripting.executeScript

### Fixed
- UTF-8 charset declaration in popup (fixes garbled emoji/arrows)
- Handle tickets already in "In Progress" state without hanging
- Close status dropdown if "Start progress" option not found
- Detect page navigation after assign-roles save to proceed to next step
- "Could not establish connection" error on Jira pages

## 0.1.1-alpha

### Fixed
- Detect navigation after assign-roles save to auto-proceed to pipeline step

## 0.1.0-alpha

### Added
- Initial release
- 7-step automated onboarding flow across Jira, Jenkins, Slack, and Yopass
- Chrome extension with popup UI showing current step and user details
- Content scripts for each platform
- Background service worker for cross-tab state management
- Persistent state via chrome.storage
