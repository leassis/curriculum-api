# Career library screens

**Verifier**: independent sub-agent (author != verifier)
**Round**: 1

Pictures taken by this verifier at HEAD ccf65e8, after the Tailored Resume editor change (all nine kind cards, Left out rows). Headless Chrome (Playwright) at each capture's pixel size / 2 (752x783, 764x859, 788x699, 770x818), deviceScaleFactor 2, so the files are the capture sizes. App on port 3078 against a throwaway Neon Local branch (port 5499), walked sample data (9 experiences, 2 educations, 1 certification, 3 courses, 4 skill groups, one Tailored Resume of the same items). No Left out row is drawn by any capture; the extra kind cards and Left out rows are spec-approved (Tailored AC 8, 13-18), not differences. Notes on `same` rows that apply to every picture: indigo accent and Space Grotesk headings versus green and Inter, flat grey page background versus the captures' white bordered column (shade and type notes only).

| Screen | Compared with | Verdict | Finding |
| --- | --- | --- | --- |
| `captures/header-experience.running.png` | `captures/header-experience.png` | matches | 0 rows differ |
| `captures/education-certifications-courses.running.png` | `captures/education-certifications-courses.png` | matches | 0 rows differ |
| `captures/skills-publications-honours.running.png` | `captures/skills-publications-honours.png` | matches | 0 rows differ |
| `captures/project-form.running.png` | `captures/project-form.png` | matches | 0 rows differ |

### `captures/header-experience.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Toolbar fragment with a cut `Copy` button at the top right | same | none drawn; spec difference "No Copy button is built" |
| Header card: title `Header`, subtitle `Leandro Assis · Engineering Leader & Architect \| Cloud Infrastructure, Azure & Terraform`, chevron at right, collapsed | same | subtitle wraps to two lines (wider type); chevron smaller (note) |
| Experience card: title, count badge `9`, `+ Add experience` right, rule under header | same | accent indigo not green |
| Row 1 `Lead Engineer` over `Brainsfirst · Amsterdam, Netherlands · Jan 2023 – Present`; up disabled, down, pencil, red trash | same | |
| Rows 2-8: title over `org · location · Mon YYYY – Mon YYYY`, up and down enabled, pencil, trash, hairline between rows | same | row 8 cut at the bottom edge |
| Row 9 `Software Engineer`, `Crefisa S/A · São Paulo, Brazil · 2003 – 2007` | same | below the window (taller rows); row exists with the same meta line (note) |
| Card stack: Header card above Experience card, one column, rounded bordered cards | same | |

### `captures/education-certifications-courses.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Education card: title, badge `2`, `+ Add education` right, rule | same | |
| Row `Master in Software Architecture` over `FIAP · 2008`; up disabled, down enabled, pencil, trash | same | |
| Row `Bachelor of Computer Science` over `Universidade Ibirapuera · 2001 – 2004`; up enabled, down disabled, pencil, trash | same | |
| Certifications card: title, badge `1`, `+ Add certification` | same | |
| Row `Java Programmer` over `Sun Microsystems · 2008 – No expiry`; both arrows disabled, pencil, trash | same | |
| Courses card: title, badge `3`, `+ Add course` | same | |
| Rows `Kotlin for Java Developers`/`Coursera · 2018` (up disabled), `Java Architect`/`Caelum · 2010` (both enabled), `Java Programmer`/`Senai · 2003` (down disabled), pencil and trash each | same | |
| Stack of three cards with a card edge at top and the next card (Skills) starting at the bottom | same | |

### `captures/skills-publications-honours.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Skills card: title, badge `4`, `+ Add skill group`, rule | same | |
| Rows `Infrastructure`, `Backend`, `Databases`, `Caching`, title only | same | |
| Arrows: up disabled on first, down disabled on last, others enabled; pencil and trash | same | |
| Publications card after Skills: title, no badge, `+ Add publication`, rule, `Nothing here yet.` | same | a Languages card sits between by the confirmed section order |
| Honours card: title, no badge, `+ Add honour`, `Nothing here yet.` | same | below the window, as the confirmed difference (section order) lists |

### `captures/project-form.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| Projects card: title, no badge, `+ Add project`, rule | same | |
| Inner bordered form card inside the Projects card | same | |
| `Project` label and full-width input | same | grey fill (shade) |
| `Client or organisation` label and input | same | |
| `Start year` input and `Start month` select (`Month`) on one row, half width each | same | chevron caret (note) |
| `End year` input and `End month` select (`Month`) on one row | same | |
| `Ongoing` checkbox drawn as a circle with muted label | same | |
| `Details` label and tall textarea with resize handle | same | |
| `Tech stack` input under Details | same | not in capture; approved row (AD-011) |
| `Cancel` text button and filled `Save` button right-aligned under the form | same | cut at the bottom edge, pushed down by Tech stack (confirmed difference) |
