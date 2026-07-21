# UI Contrast, Avatar Ownership and Logout Validation

This validation branch runs the repository checks against the current `main` implementation.

Validated behavior:

- Dark dialogs and dropdown menus use readable cream text.
- Alert-dialog cancel buttons use visible light text on black surfaces.
- Gold and orange primary actions retain dark text.
- The automatic contrast guard corrects both light-on-light and dark-on-dark content.
- The Leego avatar is reserved for `leego972@gmail.com`.
- Other accounts receive a neutral initials avatar when no custom image exists.
- Non-Leego accounts do not see the Leego owner mark inside the account area.
- The sidebar contains a persistent, clearly labeled Log out button.
- Pressing the sidebar account avatar also opens the logout confirmation.
