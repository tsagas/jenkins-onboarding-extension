# Jenkins Onboarding Extension

A Chrome extension that automates the Jenkins user onboarding process across Jira, Jenkins, Slack, and Yopass.

## What it does

Turns a multi-step manual onboarding process into a guided, automated flow:

1. **Jira** → Extracts user name from ticket, marks it as In Progress
2. **Jenkins** → Creates user account (username, email, password)
3. **Jenkins** → Assigns Developer role
4. **Jenkins** - **Company specific** → Opens and fills the alert targets pipeline form
5. **Slack** - **Company specific** → Searches for the user, copies their Member ID back to the pipeline form
6. **Yopass** → Creates an encrypted secret with credentials and creates a ready-to-send Slack message
7. **Slack** → Sends the message with instructions to the user
8. **Jira** → Resolves the ticket and adds a completion comment

## Installation

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the cloned folder
5. Go to the extension's **Details** → **Extension options** and configure your URLs

## Configuration

After installation, open the extension options and fill in:

| Field | Example |
|-------|---------|
| Jenkins Domain | `jenkins.example.com` |
| Yopass Domain | `yopass.example.com` |
| Slack Base URL | `https://app.slack.com` |
| Email Domain | `example.com` |

## Usage

1. Open the Jira ticket for the new user
2. Click the extension icon → **Start Onboarding**
3. Follow the prompts — each step auto-fills forms and opens the next page when ready

The extension popup shows the current step and user details throughout the process. Use **Continue** to resume a stuck flow, or **Reset** to start over.

## Permissions

- **activeTab / scripting** — interact with page content
- **storage** — persist onboarding state and configuration across tabs
- **tabs** — open and switch between tabs
- **clipboardRead / clipboardWrite** — read/write clipboard for Slack Member ID and message generation

## How it works

The extension uses a background service worker to maintain state across all tabs. Content scripts on each site listen for state changes and perform the appropriate actions. Communication between tabs happens via `chrome.runtime.sendMessage`, eliminating the cross-origin limitations of bookmarklets.
