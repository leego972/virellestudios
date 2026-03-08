# Mobile Safari MediaPlayer Issues

## Problem 1: Thumbnail/play button hidden on mobile
- Line 854: `<div className="relative h-16 w-24 shrink-0 hidden sm:block">` — the entire thumbnail+play button container is `hidden sm:block`, so on mobile the thumbnail and play button are completely invisible
- Users on mobile can't see or tap the play button at all

## Problem 2: Play overlay uses hover-only opacity
- Line 793: `className="absolute inset-0 mb-1.5 flex items-center justify-center bg-black/40 rounded opacity-0 hover:opacity-100 transition-opacity"` — timeline play button is opacity-0 and only shows on hover (no hover on touch)
- Line 866: `className="absolute inset-0 flex items-center justify-center bg-black/40 rounded sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"` — scene list play button is sm:opacity-0 sm:group-hover:opacity-100, so on mobile it's visible but on tablet+ it's hover-only

## Problem 3: MediaPlayer autoplay + muted
- Line 470-471: `autoPlay muted` — starts muted which is correct for autoplay policy, but the auto-unmute at line 133-138 may not work on iOS Safari
- iOS Safari requires user gesture to unmute

## Problem 4: MediaPlayer z-index
- Line 352: `className="fixed inset-0 z-50"` — z-50 should be fine but need to check if any parent has overflow:hidden or transform that creates a new stacking context

## Problem 5: Controls touch targets too small
- Many buttons are h-8 w-8 which is 32px — Apple recommends 44px minimum touch targets

## Problem 6: Volume slider hidden on mobile
- Line 682: `className="hidden sm:block w-0 overflow-hidden group-hover/vol:w-20"` — volume slider completely hidden on mobile

## Fixes needed:
1. Show thumbnail + play button on mobile in scene list
2. Make play overlay always visible on touch devices (not hover-dependent)
3. Fix autoplay/unmute for iOS Safari
4. Increase touch targets to 44px minimum on mobile
5. Add mobile-specific volume controls or remove volume button on mobile (iOS controls volume via hardware)
6. Add a dedicated mobile play button in the scene card for mobile users
