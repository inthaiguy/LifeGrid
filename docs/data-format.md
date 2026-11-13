# Life Grid data format

Life Grid keeps the whole grid in the URL, so a link is both the share mechanism and the backup.
This document defines that link format ("format 2") and the JSON export ("life-grid/1").

## 1. What is portable

Only what is needed to redraw the grid is stored. The interview itself (question queue, answer log,
conflicts, cues) is never stored in a link or export.

| Field | Meaning |
|---|---|
| `name` | Optional display name. |
| `birth` | Birth year, month (1–12), place, and the day of the month when known. The month anchors every other month; the day is kept for accuracy and does not change the grid. |
| `homes` | Main homes in order; each runs from its start month until the month before the next one. |
| `stays` | Temporary stays (`from`–`to`, inclusive) that override the home. |
| `cells` | One headline per month. A cell is either confirmed text or a placeholder written by the script (`p`). |
| `t` | Link only: indexes into the interview stages (`STAGES` in `src/script.ts`) that still have questions waiting. |

Months are `YYYY-MM`, a reduced-precision ISO 8601 date, in the app and in JSON. Links use offsets instead (below).

## 2. URL format

```
<origin><path>#s.<payload>     read-only shared view; nothing is saved on the viewer's device
<origin><path>#<payload>       editable; the app opens it as the user's own grid
```

`<payload>` is produced by:

1. Build the text body (section 3).
2. Encode it as UTF-8 and compress with raw DEFLATE (`CompressionStream('deflate-raw')`, no zlib header).
3. Base64url the bytes: standard Base64 with `+`→`-`, `/`→`_` and trailing `=` removed.

Decoding reverses the steps. A decoded body starting with `{` is a pre-format-2 link: plain JSON of
`{name, birth, homes, stays, cells, t}`, still accepted for reading. Writers must emit format 2.

## 3. Format 2 body

UTF-8 text, lines separated by `\n`, fields within a line separated by a tab. Tabs and newlines inside
user text are replaced with a single space before writing.

```
2                                  line 0: format version
<name>                             line 1: may be empty
<birthYear>\t<birthMonth>\t<place>\t<birthDay>\t<deathOffset>\t<deathDay>   line 2: birthDay is 1–31 or empty; deathOffset is the death month as months after the birth month (empty = living) and deathDay is 1–31 or empty; older links omit the last three
<t>                                line 3: comma-separated stage indexes, may be empty
<fromOffset>\t<place>              homes, one per line, in order
(blank line)                       ends homes
<fromOffset>\t<toOffset>\t<place>  stays, one per line
(blank line)                       ends stays
<cell for month 0>                 one line per month from the birth month
<cell for month 1>
...
```

- **Offset** `n` is the month count since the birth month: month 0 is the birth month, so
  `n = (year*12 + month-1) - (birthYear*12 + birthMonth-1)`. No dates are written; they are derived from the offset.
- **Cells** are in order, one line per month, from month 0 up to the last month that has a cell.
  An empty line means no cell. Months before the birth month cannot hold a cell and are dropped.
- A line starting with `?` is a **placeholder**; the text follows the `?`.
- Real text that itself begins with `?` or `\` is written with a leading `\`, which the reader removes.
- The body ends after the last line; a trailing run of empty lines may be omitted.

Why this shape: long runs of empty months compress to almost nothing under DEFLATE, and dropping dates
makes links about a third shorter than the JSON they replaced.

Reader rules: reject a body whose first line is not `2`, or whose birth year/month is invalid. Unknown
extra lines at the end are ignored. A link must never be trusted to contain markup: render all text as text.

## 4. JSON export (`life-grid/1`)

For people and other tools. Lossless for everything in section 1 except `t`, and readable without the app.

```json
{
  "schema": "life-grid/1",
  "exportedAt": "2026-11-12T09:30:00.000Z",
  "name": "Sam",
  "birth": { "month": "1984-03", "date": "1984-03-14", "place": "Leeds, England" },
  "death": { "month": "2051-06", "date": "2051-06-02" },
  "homes": [{ "from": "1984-03", "place": "Leeds, England" }],
  "stays": [{ "from": "1999-07", "to": "1999-08", "place": "Lyon, France" }],
  "cells": [
    { "month": "1990-09", "text": "Started school" },
    { "month": "1991-06", "text": "Moved house", "confirmed": false }
  ]
}
```

- `schema` names the format and its major version; readers should refuse an unknown major version.
- Dates are ISO 8601: `YYYY-MM` for months, a full UTC timestamp for `exportedAt`.
- `birth.date` (full ISO 8601 date) is present only when the day is known; it must fall in `birth.month`.
- `death` is optional and present only for someone who has died. `death.month` ends the life: the grid, the age column and the completeness count stop there, and cells after it are ignored. `death.date` works like `birth.date`. A sheet with no `death` is a living person and runs to the current month.
- `homes` and `stays` are ordered by `from`; `cells` are ordered by `month`. `name` is omitted when empty.
- A cell is confirmed unless `"confirmed": false`, which marks a placeholder suggested by the script
  (the CSV export shows these in parentheses).
- Interview state is never exported.

## 5. Versioning

- Links: the first line is the version. A new version gets a new number and the old reader keeps working.
- JSON: `schema` is `life-grid/<major>`. Adding optional fields keeps the major; changing meaning bumps it.

## 6. Importing

The importer accepts a `life-grid/1` JSON file (or pasted text starting with `{`) as well as a spreadsheet.
Import is additive: cells already confirmed in the grid are kept, a placeholder never replaces a placeholder,
and homes and stays are added only when no entry with the same start (and end) exists. Months before the birth
month or after the current month are skipped. Unknown schema versions are rejected.
