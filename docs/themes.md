# Themes

Look and feel is data, not code. A theme is one JSON file in `themes/`; the app finds every file there
automatically and lists it under **Menu → Appearance**. To make your own, copy `themes/sage.json`, change the
id and values, and reload. No code changes are needed.

The choice is stored on the device (`localStorage`, key `life-grid-theme`). It is not part of a share link or an
export: links and exports carry data (`docs/data-format.md`), so whoever opens a link sees it in their own theme.

## File format (`life-grid-theme/1`)

```json
{
  "schema": "life-grid-theme/1",
  "id": "sage",
  "name": "Sage",
  "description": "Shown as a tooltip.",
  "fonts": "https://fonts.googleapis.com/css2?family=Nunito+Sans&display=swap",
  "vars":  { },
  "light": { "--bg": "#fdfaf6" },
  "dark":  { },
  "ramp": ["#f0cfc4", "#e3b3a6", "#c9a79b"]
}
```

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | Must be `life-grid-theme/1`. Files with another value are ignored. |
| `id` | yes | Lowercase letters, digits and dashes. Unique. `default` is the built-in look. |
| `name` | yes | Label in the switcher. |
| `fonts` | no | `https://` URL of a stylesheet that defines the fonts used below. Loaded only while the theme is selected. |
| `vars` | no | CSS variables applied in every appearance. |
| `light`, `dark` | no | CSS variables for light and dark. With `light` but no `dark`, the theme stays light even on a dark device. With neither, the built-in colours follow the device. |
| `ramp` | no | Two or more `#rrggbb` colours spread evenly from birth to old age. They colour the age column and each home in the order lived in. Omit for the built-in seasonal ramp. |

Variable names must look like `--name`; values cannot contain `;`, braces, `<`, `>` or `\`. Anything else is dropped.

## Variables

| Variable | Used for |
|---|---|
| `--bg`, `--surface`, `--head` | Page, panels and sheets, sticky header strips. |
| `--ink`, `--dim`, `--line` | Text, secondary text, borders. |
| `--accent`, `--accent-ink` | Primary buttons, highlights, and the text on them. |
| `--font-body`, `--font-display` | Font stacks for everything and for headings. |
| `--display-weight`, `--display-scale` | Heading weight, and a size multiplier (serif faces often need about 1.3). |
| `--r-cell`, `--r-ctl`, `--r-card` | Corner radius of grid cells, buttons and inputs, sheets. |

Text on a coloured cell is chosen automatically for contrast. The theme's own text and accent pairs are not checked,
so test `--accent-ink` on `--accent` and `--accent` on `--bg` yourself (aim for 4.5:1 or better).

## Privacy note

A theme with `fonts` makes the browser contact that host when the theme is selected. The bundled themes use Google
Fonts. For no third-party requests, leave `fonts` out and use a system font stack, or point it at a stylesheet you host.
