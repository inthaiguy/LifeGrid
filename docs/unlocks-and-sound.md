# Unlocking views, and sound

## Views unlock as the grid fills in

The grid is always available. The other views unlock at a percentage of months filled in (confirmed entries
only, the same percentage shown at the top of the menu). Each view is a file in `src/views/`, and its
name and `at` threshold are in that file's `view` description; views are listed in order of `at`. Adding a view
is adding a file (see `docs/making-a-view.md`).

| View | Unlocks at |
|---|---|
| Grid | always |
| Horizontal timeline | 5% |
| Timeline with significant events | 10% |
| Vertical timeline | 20% |
| Tree view | 35% |
| Voyager view | 50% |

- The view button in the header cycles through unlocked views only, and is disabled until the first unlock.
- **Menu → Views** lists every view (locked ones show their percentage), lets you jump to an unlocked one, and
  says which view unlocks next and how far away it is.
- Crossing a threshold while editing plays a chime and shows a short notice. Opening an existing grid does not.
- A grid opened from a share link shows every view. The unlocks are a reward for the owner, not a limit on viewers.
- If cells are deleted and the percentage drops below the current view's threshold, the app falls back to the grid.

## Sound

Every sound is synthesised in the browser (`src/sound.ts`), so there are no audio files. Dialogue plays a
bubbly, pitched bleep per letter (not a typewriter), the card pops in, whooshes as it flies, and lands with a click,
thump, spring and sparkle. Browsers only allow audio after a tap or key press, so the welcome flow starts with a
"Tap to start" screen. Sound can be turned off there ("Play without sound") or any time under
**Menu → Appearance → Sounds**; the choice is saved on the device (`life-grid-sound`).
