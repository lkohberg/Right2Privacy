# Unified Chat and Legacy Notifications

## Goal

Revamp notifications so incoming Chat messages and Legacy encrypted keys are clearly distinguished, counted correctly, and always open the correct contact in the correct mode.

## What will change

- Combine Chat unread messages, Legacy waiting keys, and friend requests into one shared activity feed.
- Show a polished top notification for each new item with the sender, its type (**Chat** or **Legacy**), and the correct action:
  - Chat opens that contact’s conversation.
  - Legacy switches to Legacy mode, opens that contact, and selects Decrypt.
  - Friend requests open the Friends page.
- Keep browser notifications aligned with the same wording and destination.
- Update navigation and contact badges from the shared activity feed so counts refresh immediately after reading, decrypting, clearing, or accepting a request.
- Distinguish Chat and Legacy waiting items in the contact list instead of describing both as an “encrypted key.”
- Keep Legacy’s **Clear** action limited to reminder badges; it will not delete the encrypted key.
- Mark Chat messages read only when their conversation is actually opened, then refresh all badges.
- Add the new notification wording in all 24 supported languages.

## Technical details

- Extend the authenticated activity query to return typed Chat and Legacy items with sender handles.
- Refactor the activity provider into the single polling source for alerts and counts, while preserving browser-alert preferences.
- Pass an activity refresh callback into the Chat conversation so read state updates the navigation and contact list without delay.
- Remove the separate Chat unread-count polling path to avoid mismatched totals and duplicate requests.
- Preserve existing encryption, ciphertext storage, key delivery, and Legacy decryption behavior.

## Validation

- Verify new Chat and Legacy arrivals produce different, correctly labeled notifications.
- Verify each notification opens the correct contact and mode.
- Verify contact and navigation badges clear after Chat reading, Legacy decryption, or Legacy reminder clearing.
- Verify friend-request notifications open Friends.
- Check desktop and phone layouts, browser alerts, all translation keys, and error-free runtime behavior.
