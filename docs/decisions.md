# Decisions

## 2026-11-09
- **Cell model:** one headline per cell, nothing stored behind it. A new suggestion replaces the old text if accepted.
- **Storage:** the URL is the shareable source of truth; the browser also keeps a local copy so a lost link doesn't lose the grid.
- **Interview:** mock up both a scripted quick-fire style and a conversational style, then choose. The scripted one must work with no backend.
- **Seed data:** a fictional sample life is the default demo; the importer is tested against the real source sheet, which stays out of the repo.
- **Order of work:** mockups → onboarding question script → web app. Mobile only after that.
