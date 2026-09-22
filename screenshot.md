# Screenshot Guidelines

## Specifications

- **Format:** PNG format, static (no animations).
- **Resolution & Size:** 144 dpi, 750–1000px wide, and a maximum file size of 250 KB.
- **Display:** Retina resolution support on macOS.
- **Naming:** Descriptive filenames.

## Style Guidelines

- **Theme:** Use the light theme.
- **Context:** Minimal context with reduced negative space.
- **Anonymity:** Replace user info and usernames with @octocat.
- **Cursor:** No mouse cursor shown unless specifically documenting cursor behavior.
- **Menus:** Use closed or open menus appropriately as needed.

## Highlighting

- Use the Snagit GitHub Docs theme.
- Apply a dark orange (#BC4C00) stroke.
- Use 4px corner rounding.

## Capture notes (BlindsUP-specific)

Capture at a realistic device viewport (e.g. 1600x900), then downscale to the 750-1000px spec width afterward — do not shrink the capture viewport itself (e.g. via a small CSS size plus a device-scale-factor multiplier) to hit the target resolution. This app's countdown/blind digits size off `vh`, and an unrealistically small viewport (smaller than any real device it targets) makes them overflow past where they're meant to fit — e.g. through the clock's felt notch in the top-right corner.
