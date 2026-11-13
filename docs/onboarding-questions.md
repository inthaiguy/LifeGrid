# Onboarding and setup questions

The setup path is a fixed script. Every question exists because its answer produces
rows, colours or cells. Nothing here needs a backend or a connected data source.

Rules for the whole flow:

- Answers are short: a date, a place, or one to three words.
- "Skip" and "not sure" are always available. A rough answer ("summer 1998") is accepted and placed in the middle month of the range.
- The grid is visible while answering, so each answer visibly fills something.
- Anything the script writes on its own (as opposed to words the user typed) is marked as a **placeholder**: shown lighter, and counted as filled only once the user confirms or replaces it.

Each question below lists what it writes. `[YEAR]`, `[PLACE]` and similar are filled from earlier answers.

---

## Stage 1 — Frame (2 questions)

| # | Question | Writes |
|---|---|---|
| 1.1 | When were you born? | One row per year from birth to now; the age column; greys out months before birth and after today. |
| 1.2 | Where were you born? | Birth-month cell: "Born [PLACE]". First home location. |

## Stage 2 — Homes (1 question, repeated)

| # | Question | Writes |
|---|---|---|
| 2.1 | You started in [PLACE]. When did you first move away, and to where? | Ends the current home span, starts the next. Cell in the move month: "Move to [PLACE]". |
| 2.2 | And after [PLACE]? *(repeats until "I still live there")* | Same. |
| 2.3 | Any stretch of a month or more living somewhere else — study abroad, a posting, a long stay with family? | A short home span inside a longer one. |

Result: every cell has a colour. This is the backbone for all later questions.

## Stage 3 — School (4–6 questions)

| # | Question | Writes |
|---|---|---|
| 3.1 | What month did your school year start, and when did it end? | Sets which month carries the school cells. |
| 3.2 | What year did you start first grade (or equivalent)? | Placeholder per year: "1st grade", "2nd grade" … in the start month, through the end of secondary school. |
| 3.3 | Did you skip, repeat, or change schools? Which years? | Corrects the run; "New school" cells. |
| 3.4 | When did you finish secondary school? | "Graduation" cell. |
| 3.5 | Any college, university, trade school or military service? Start and end? | "Start [SCHOOL]" cell, placeholder per year ("Uni yr 2"), "Graduation" cell. |
| 3.6 | Any other course or qualification that took a month or more? | Start cell. |

## Stage 4 — Work (1 question, repeated)

| # | Question | Writes |
|---|---|---|
| 4.1 | What was your first paid job, and when did you start? | "Start [JOB]" cell. |
| 4.2 | Next job, and when? *(repeats)* | "Start [JOB]" cell per job. |
| 4.3 | Any gaps — laid off, sabbatical, parental leave, between things? | Start cell for the gap. |

## Stage 5 — People and animals (6–8 questions)

| # | Question | Writes |
|---|---|---|
| 5.1 | Siblings: names and birth month/year of any younger than you. | "[NAME] born" cells. |
| 5.2 | Children: names and birth dates. | "[NAME] born" cells; adds each birthday as an anchor date. |
| 5.3 | Partners: when did you meet, and (if relevant) marry or part? | "Met [NAME]", "Wedding", etc. Adds anniversary as an anchor date. |
| 5.4 | Weddings you were in or travelled for — whose, and roughly when? | One cell each. |
| 5.5 | People close to you who died — who and when? *(clearly optional)* | One cell each. |
| 5.6 | Pets: name, when they arrived. | "Got [PET]" cells. |
| 5.7 | Who were your closest friends in each place you lived? | Writes no cells. Stored as memory cues for gap questions. |

## Stage 6 — Things you own and firsts (5 questions)

| # | Question | Writes |
|---|---|---|
| 6.1 | When did you learn to drive / get your first car? | One cell each. |
| 6.2 | Homes bought or built, and when? | One cell each. |
| 6.3 | Purchases you still remember making — bike, instrument, computer, boat? | One cell each. |
| 6.4 | First flight? First time abroad? | One cell each. |
| 6.5 | Injuries, surgeries or hospital stays? *(optional)* | One cell each. |

## Stage 7 — Annual traditions and anchor dates

This stage fills the most cells per question, because one answer is asked again for every year.

| # | Question | Writes |
|---|---|---|
| 7.1 | Is there something you did every year at about the same time — a holiday gathering, festival, family trip, camp, conference, religious observance? What and which month? | Creates a tradition with a month and a year range. |
| 7.2 | Which years did [TRADITION] run from and to? | Placeholder "[TRADITION]" in that month for each year. |
| 7.3 | Did [TRADITION] change location year to year? If so, where was it in [YEAR]? *(quick-fire list, one line per year, skip freely)* | Replaces placeholder with "[TRADITION] [PLACE]". |
| 7.4 | Which holidays does your family make a point of gathering for? | One tradition per holiday. |
| 7.5 | Where were you for your birthday in [YEAR]? *(quick-fire, most recent year first, stop after three skips in a row)* | Birth-month cell for that year. |
| 7.6 | Same for [ANNIVERSARY] and each child's birthday. | One cell per year answered. |

## Stage 8 — Trips (3 questions)

| # | Question | Writes |
|---|---|---|
| 8.1 | List the countries (or states) you've been to. | Writes no cells yet; builds a checklist. |
| 8.2 | For each: roughly when was your first visit? | "[PLACE] trip" cell. |
| 8.3 | Any place you went back to more than twice? Which years? | One cell per visit. |

## Stage 9 — Era sweep (2 questions per home)

Asked once for each home span from Stage 2.

| # | Question | Writes |
|---|---|---|
| 9.1 | When you lived in [PLACE] ([YEARS]), what did summers usually involve? Winters? | Placeholder in empty summer/winter cells of that span. |
| 9.2 | What's the first thing that comes to mind from your time in [PLACE]? When was it? | One cell. |

## Stage 10 — Shared events (quick-fire)

A short list of widely remembered events inside the user's lifetime and region, each with a known month.

| # | Question | Writes |
|---|---|---|
| 10.1 | Where were you when [EVENT] happened? *(8–10 events, chosen by birth year and home locations)* | One cell each, in the user's words. |
| 10.2 | Any storm, blackout, flood, fire or big local news you lived through? When? | One cell each. |

---

## What setup produces

- A full frame: every row, age and colour (Stages 1–2).
- Confirmed cells from life events (Stages 3–6, 8, 10).
- Placeholder cells from school years, traditions and era sweeps (Stages 3, 7, 9).
- A set of memory cues that write nothing but drive the gap questions: friends per era, countries visited, jobs, pets.

Rough expectation for a 45-year-old: 60–90 questions answered, 150–250 cells touched out of about 540, with a third to a half of those being placeholders.

## After setup — gap questions

Once the script ends, the remaining empty cells are worked one at a time. Each prompt is built from whatever is known about that month. Templates, strongest first:

| Known about the cell | Prompt |
|---|---|
| Anchor date falls in it | "Where were you for [NAME]'s birthday in [YEAR]?" |
| A move happened within two months | "You'd just arrived in [PLACE]. What do you remember about the first few weeks?" |
| A job or school started or ended nearby | "You'd just started at [JOB]. What was going on outside work that [SEASON]?" |
| A filled cell next door | "[MONTH] [YEAR] was '[NEIGHBOUR]'. What came right after?" |
| A shared event in that month | "[EVENT] was in the news. Where were you living, and what were you up to?" |
| Same month filled in adjacent years | "In [MONTH] of [YEAR-1] you had '[TEXT]'. Was [YEAR] the same?" |
| Only age and home | "You were [AGE], living in [PLACE], in [GRADE/JOB]. Who were you spending time with — [FRIENDS]?" |
| Nothing | "Anything at all from [SEASON] [YEAR]? A trip, a visitor, a purchase, weather?" |

A cell can be closed with "nothing I remember" so it stops being asked.

## Conversational variant (to mock up alongside)

The same stages, but one open question per stage and the answer is parsed into cells:

> **Q:** Walk me through where you've lived, in order, with rough years.
> **A:** Born in Madison, moved to Portland when I was nine, Boulder for college in 2002, then Seattle…
> **→** Five home spans and four "Move to" cells, shown for confirmation.

This fills faster but needs a model to parse answers, so it requires a backend.

## Testing this against a real sheet

Run the script by hand against a sheet that was built over years, and score each real filled cell:

- **Reached** — a setup question would have produced it.
- **Reachable by gap question** — a template above would plausibly have prompted it.
- **Missed** — nothing in the flow leads there.

The missed list is the input for the next revision of this script.

## Age limits

Questions that don't make sense for a young person are left out, using their age today in whole years
(`src/script.ts`, `KIND_AGE` and each item's `age`):

| Question | Asked from age |
|---|---|
| First paid job | 14 |
| Other courses or qualifications | 15 |
| Driver's license | 15 |
| First car | 16 |
| Children, partners, finishing secondary school | 16 |
| College, university | 17 |
| Work gaps, homes bought | 18 |
| People close to you who died | 10 |

A topic the person picks from the menu ignores these limits, so a twelve-year-old with a paper round
can still add it. Everything else is asked at any age.
