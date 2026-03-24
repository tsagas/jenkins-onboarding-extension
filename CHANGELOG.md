# Changelog

## 0.2.0-alpha

### Added
- Auto-submit user creation form (no manual click needed)
- Auto-run alert targets pipeline after Slack ID is filled
- Auto-send credentials message to user via Slack DM
- Tab tracking — all opened tabs are closed automatically after completion
- New step 7: Slack message sending (previously manual)

### Changed
- Increased all Slack interaction timeouts to 1000ms for reliability
- Slack tab stays open after copying member ID (reused for sending message)
- Yopass now triggers Slack message send instead of resolving Jira directly
- Flow is now 8 steps instead of 7
- Popup uses HTML entities for special characters (fixes encoding issues)

### Fixed
- UTF-8 charset declaration in popup (fixes garbled emoji/arrows)
- Handle tickets already in "In Progress" state without hanging
- Close status dropdown if "Start progress" option not found
- Detect page navigation after assign-roles save to proceed to next step

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
