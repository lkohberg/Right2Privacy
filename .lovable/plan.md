# Modern mobile messages flow

## What will change

- Restyle the phone bottom navigation as a floating iOS inspired tab bar with clearer active states, compact labels, notification badges, and safe spacing above the home indicator.
- Make Messages open as a full mobile contact list instead of showing the encryption form immediately.
- Show each friend as a familiar conversation row with avatar initials, full handle, waiting message status, count, and a chevron.
- Tapping a friend opens a focused message screen with a back button, contact identity, encrypt and decrypt controls, and the existing secure message tools.
- Keep the current two column friend and message workspace on larger screens.

## Interaction details

- On phones, the back button returns to the contact list without leaving Messages.
- A waiting encrypted key opens that contact directly in decrypt mode.
- Empty, loading, notification, and no friend states remain available.
- Existing encryption, decryption, key delivery, reminders, and archive behavior will not change.

## Technical details

- Use responsive React state inside the Messages page for list and contact views.
- Reuse the existing friends and activity data; no database changes are needed.
- Use existing semantic colors and button components, with mobile only layout classes.
- Verify the contact list, contact detail, back navigation, bottom bar, and desktop layout in the live preview.
