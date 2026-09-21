# Refine message reminders

## Changes
- Keep each contact’s pending-message badge visible after the temporary alert is dismissed; only successful decryption clears the pending message.
- Remove the in-page reminder panel that appears while viewing other contacts, so alerts never intrude into the wrong conversation.
- Restyle incoming alerts as compact notification cards with sender identity, message icon, clearer hierarchy, and a direct Decrypt action.
- Preserve browser notifications, direct navigation to the correct contact, and existing encryption behavior.

## Technical details
- Return all pending keys for contact counts while exposing only undismissed keys for pop-up reminders.
- Use the all-pending collection for navigation badges and contact badges.
- Keep the notification display deduplicated and dismissible without changing pending-message state.
- Verify type safety and the Contacts screen behavior.
