# Premium Talent Search: UX Upgrade Spec

## 1. The "Premium" Upgrade
The initial spec for the Talent Search feature was functional; this upgrade elevates it to a premium, studio-grade experience. The interface must feel like a high-end digital talent agency, not a stock photo library.

### Key Visual and Functional Enhancements

1. **Flagship Star Labels & Premium Badges**
   - Every actor card in the grid view now features a subtle, elegant badge indicating their tier: `Standard`, `Premium`, or `Flagship Star`.
   - Flagship Stars (e.g., Julian Vance, Elena Rostova) have larger, visually distinct cards that occasionally play a 2-second micro-expression video loop on hover, rather than a static image.
   - A "Seen in The Veil" watermark appears on the cards of actors who starred in the launch series, immediately communicating their premium status.

2. **Chemistry Pair Suggestions**
   - When a user views an actor's profile, a new "Chemistry Matches" section appears below their media gallery.
   - This section displays 2-3 other actors from the roster who have been pre-tested and tuned to look exceptional alongside the selected actor.
   - Example: Viewing Julian Vance's profile shows Sofia Reyes with the tag "Adversarial Romance" and Kenji Sato with the tag "Intellectual Rivalry."
   - A "Cast Both" button allows the user to add the pair directly to their project.

3. **"Best Match for This Role" Scoring UI**
   - When a user uses the natural language Role Intent Search (e.g., "A charismatic villain who hides a vulnerable side"), the results are not just a flat grid.
   - The UI returns a ranked list with a "Match Score" (e.g., 98% Match).
   - Below the score, the UI highlights exactly *why* the actor matched, pulling directly from their Actor Bible tags (e.g., `Matches: Charismatic Rogue`, `Matches: Hidden Vulnerability`, `Matches: Crime Thriller`).

4. **Stronger Actor Profile Design**
   - The profile page is redesigned to resemble a high-end editorial spread.
   - The Hero Portrait takes up the entire left half of the screen.
   - The right side features the Quick Stats, the Bio, and the Media Gallery.
   - The Media Gallery now defaults to playing short, silent video clips (Screen Tests) rather than static images, immediately demonstrating the actor's realism and mobility.

5. **Better Cast-in-Project Flow Visibility**
   - The "Cast" button is now the most prominent call-to-action on the page.
   - When clicked, a sleek modal appears asking: "Which role will [Actor Name] play in [Project Name]?"
   - Once assigned, a persistent "Cast Roster" sidebar appears on the right side of the main project workspace, showing the selected actors' faces at all times. This constantly reinforces the value of the feature.

6. **Leasing/Licensing Tier Visibility**
   - The monetization tier is communicated clearly but elegantly.
   - If a user lacks the subscription tier for a Premium actor, the "Cast" button changes to a gold "Unlock Actor" button.
   - Clicking it opens a modal that explains the value of the Premium tier (higher fidelity, more accents, exclusive looks) and offers a one-click upgrade or a one-time credit purchase.

7. **Stronger "Cast a Virelle Star" Branding**
   - The entire feature is wrapped in the "Virelle Signature Cast" branding.
   - The landing page features a rotating banner of the Flagship Stars.
   - The language used throughout the UI is professional and aspirational: "Cast," "Roster," "Audition," "Chemistry," rather than "Select," "Library," "Preview," "Match."
