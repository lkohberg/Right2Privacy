# Use the phone layout on tablets

## Changes

- Keep the floating three-tab bottom navigation visible through tablet widths.
- Keep desktop navigation hidden until the large-screen layout begins.
- Use the phone-style contact list and tap-through message screen on tablets.
- Keep notifications and sign out inside Settings on phones and tablets.
- Preserve the current desktop layout on large screens.

## Technical details

Move responsive transitions from the small breakpoint to the large breakpoint across the authenticated shell, contact workspace, and mobile-only Settings actions.
