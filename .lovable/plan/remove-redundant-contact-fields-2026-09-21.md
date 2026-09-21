# Remove redundant contact fields

## Changes

- Remove the recipient selector from the encryption view.
- Remove the sender selector from the decryption view.
- Use the contact selected from the contact list for both operations.
- Keep the selected contact visible in the conversation header.
- Preserve the existing encryption, decryption, key delivery, reminders, and archive behavior.

## Technical details

The selected contact ID already flows into both message panels. The panels will use that ID directly instead of copying it into separate local state and rendering dropdown fields.
