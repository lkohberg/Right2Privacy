# Message interface and notifications

## Goal
Make friends and incoming activity immediately visible without turning Right2Privacy into a conventional chat service. The ciphertext still travels through the user’s chosen messenger; Right2Privacy only indicates that an encrypted key is waiting.

## Interface changes
- Replace the compact message form with a responsive workspace: a visible friend list beside the encryption/decryption area on desktop and a compact horizontal friend picker on mobile.
- Show each friend by handle with a clear selected state and a pending-key badge when that friend has sent something.
- Let selecting a friend set the encryption recipient or decryption sender directly.
- Add notification badges to the Messages and Friends navigation items.
- Show incoming friend requests prominently with the requester’s full `@handle` and clear accept/decline actions.
- Add an in-app alert when a new encrypted key or friend request appears.

## Notification behavior
- Add an optional bell control for browser notifications; permission is requested only after the user chooses to enable them.
- Poll signed-in activity at a modest interval so new reminders appear without reloading.
- Phrase message alerts accurately, such as “Encrypted key from @alice is waiting,” because the actual ciphertext remains in the external messenger.
- A message reminder clears after successful decryption or manual dismissal. Dismissing the reminder does not delete the wrapped key, so the message can still be decrypted later.

## Data and security
- Add a recipient-controlled dismissal timestamp to pending key records.
- Grant only the minimum update permission needed and keep access restricted to the sender and recipient through existing row security.
- Add signed-in server functions to list notification summaries and dismiss a reminder.
- Keep plaintext, ciphertext, and raw encryption keys out of notification data.

## Translation and accessibility
- Add the new labels and alert text across all supported EU languages, with readable fallbacks.
- Include accessible labels, keyboard focus states, stable badge sizing, and reduced-motion-safe feedback.

## Verification
- Verify requester handles render for incoming friend requests.
- Verify message and friend-request badge counts update without reload.
- Verify browser notifications are opt-in and do not repeat for the same event.
- Verify dismissal preserves later decryption, while successful decryption clears the reminder.
- Check the workspace on desktop and mobile and confirm all content-page metadata remains complete.
