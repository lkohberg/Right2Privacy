# Mobile app navigation

## What will change

- Keep the Right2Privacy brand in a compact mobile top bar.
- Move Messages, Friends, Settings, notifications, and sign out into a fixed bottom navigation on phones.
- Show active states and notification counts directly on the bottom navigation icons.
- Add safe bottom spacing so page content never sits behind the navigation.
- Leave the existing desktop header navigation unchanged.

## Technical details

- Update the authenticated shared layout only.
- Use a mobile grid for the bottom navigation and retain the current desktop header at the `sm` breakpoint.
- Respect mobile safe areas and keep labels short, readable, and translated.
- Verify the signed-in Messages and Friends views at phone and desktop sizes.
