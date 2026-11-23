# Career library screens

**Verifier**: independent sub-agent (author != verifier)
**Round**: 2

Pictures taken by this verifier: app on port 3077 (3001 was occupied) against a fresh Neon Local branch with the walked sample data, browser window set to each capture's pixel size / 2 (764x859, 788x699, 770x818, 752x783). The browser pane returns 800 px wide screenshots (not 2x); no resizing was applied. Notes on `same` rows that apply to every picture: indigo accent and Space Grotesk headings versus green and Inter, flat page background versus the captures' white bordered column (existing admin shell). Not in the Differences table, so notes only (shade and type).

| Screen | Compared with | Verdict | Finding |
| --- | --- | --- | --- |
| `captures/education-certifications-courses.running.png` | `captures/education-certifications-courses.png` | matches | 0 rows differ |
| `captures/skills-publications-honours.running.png` | `captures/skills-publications-honours.png` | matches | 0 rows differ (round 2) |
| `captures/project-form.running.png` | `captures/project-form.png` | matches | 0 rows differ (round 2) |
| `captures/header-experience.running.png` | `captures/header-experience.png` | matches | 0 rows differ (round 2) |

### `captures/education-certifications-courses.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Education card: title, count badge `2`, `+ Add education` right, rule under header | same | accent indigo not green |
| Row `Master in Software Architecture` over `FIAP · 2008`; up disabled, down enabled, pencil, red trash | same | |
| Row `Bachelor of Computer Science` over `Universidade Ibirapuera · 2001 – 2004`; up enabled, down disabled, pencil, trash | same | |
| Certifications card: title, badge `1`, `+ Add certification` | same | |
| Row `Java Programmer` over `Sun Microsystems · 2008 – No expiry`; both arrows disabled, pencil, trash | same | |
| Courses card: title, badge `3`, `+ Add course` | same | |
| Rows `Kotlin for Java Developers` / `Coursera · 2018` (up disabled), `Java Architect` / `Caelum · 2010` (both enabled), `Java Programmer` / `Senai · 2003` (down disabled), each with pencil and trash | same | |
| Stack of three cards, one per kind, with a card edge at top and next card starting at bottom | same | |

### `captures/skills-publications-honours.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Skills card: title, badge `4`, `+ Add skill group`, rule | same | |
| Rows `Infrastructure`, `Backend`, `Databases`, `Caching`, title only, no meta line | same | |
| Arrows: up disabled on Infrastructure, down disabled on Caching, others enabled; pencil and red trash on each | same | |
| Publications card directly after Skills: title, no badge, `+ Add publication`, rule, `Nothing here yet.` | same | a Languages card (`Nothing here yet.`, `+ Add language`) sits between Skills and Publications by the confirmed section order (Assumptions, Section order, y); Publications is cut off at the bottom edge |
| Honours card: title, no badge, `+ Add honour`, rule, `Nothing here yet.` | same | round 2: below the window, as the confirmed difference (section order) lists |

### `captures/project-form.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Projects card: title, no badge, `+ Add project`, rule | same | |
| Inner bordered form card inside the Projects card | same | |
| `Project` label and full-width input | same | input filled grey, capture white (shade) |
| `Client or organisation` label and input | same | |
| `Start year` input and `Start month` select (placeholder `Month`) on one row, half width each | same | select caret is a chevron, capture a solid triangle (note) |
| `End year` input and `End month` select (placeholder `Month`) on one row | same | |
| `Ongoing` checkbox drawn as a circle, grey label | same | round 2: round box with muted label |
| `Details` label and tall textarea with resize handle | same | |
| `Tech stack` input under Details | same | not in capture; approved row (AD-011) |
| `Cancel` text button and green filled `Save` button, right-aligned under the form | same | round 2: below the window (buttons start at y~817), as the confirmed difference (Tech stack) lists |

### `captures/header-experience.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Toolbar fragment with a `Copy` button cut at the top right edge | same | round 2: no Copy button, as the confirmed difference (toolbar) lists |
| Header card: title `Header`, subtitle `Leandro Assis · Engineering Leader & Architect \| Cloud Infrastructure, Azure & Terraform`, chevron down at right, collapsed | same | subtitle wraps to two lines (Space Grotesk/wider type; text is the same) (note) |
| Experience card: title, badge `9`, `+ Add experience`, rule | same | |
| Row `Lead Engineer` over `Brainsfirst · Amsterdam, Netherlands · Jan 2023 – Present`; up disabled, down, pencil, trash | same | |
| Rows 2-8 with `org · location · Mon YYYY – Mon YYYY`, all arrows enabled, pencil, trash | same | rows are taller, so 6 rows fit instead of 8 (spacing note) |
| Row 9 `Software Engineer`, `Crefisa S/A · São Paulo, Brazil · 2003 – 2007` cut at the bottom edge | same | below the window (row height), the row exists with the same meta line |
