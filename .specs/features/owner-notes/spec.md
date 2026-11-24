# Owner Notes Specification

**Approved**: 2026-11-24 - user: "Approve spec"

**Depends on**: `career-library`, `honest-assessment` (on `main`). Touches: `src/db/schema.ts` + one new migration (serialized on `main`, AD-003), `src/repositories/{resume,profile}.repository.ts`, `src/services/{resume,profile,public-chat,recruiter-chat}.service.ts`, `src/services/career/body.ts`, `src/admin/resumes/{routes.ts,view.tsx}`, `src/admin/profile/{routes.ts,view.tsx}`, `GLOSSARY.md`, their tests.

## Problem Statement

The Owner tracks applications outside the app: where a job ad was found, who the recruiter is, and loose notes on the position. A Tailored Resume holds the Job Description but nothing about the application around it. Separately, the Profile has no place for facts about the Candidate that are not Career Items (hobbies, preferences, anecdotes), so the chats and the tailor cannot use them. Nor does it have a place for what the Candidate is looking for next (roles, domains, ways of working), which the chats should be able to answer but which is not resume content.

## Goals

- [ ] Each Tailored Resume keeps a Job Link, a Recruiter Name and Notes that the Owner sets and edits, and that never leave the admin.
- [ ] The Profile keeps Additional Information that every LLM prompt built from the Profile receives, under the same PII rules as the summary.
- [ ] The Profile keeps Looking Forward Next that the public and recruiter chats receive, and that never reaches the tailor, print, download or a Resume Document.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Sending Job Link, Recruiter Name or Notes to an LLM, print view, markdown download, Recruiter Chat or any public route | User: "those fields wont be shared anywhere, they are for my own control" |
| Linking the resume's Recruiter Name to a Recruiter Chat's recruiter name | Separate data; a Recruiter Chat already has its own name field |
| Showing Job Link or Notes in the resumes list | User chose a Recruiter column only |
| Fetching or previewing the Job Link page | Stored and shown as a link only |
| Additional Information in print, download or a Resume Document | It is context for prompts, not resume content |
| Searching or filtering resumes by the new fields | Not requested |
| Looking Forward Next in the tailor prompt, print, download or a Resume Document | User: "available on chats only, not in printed version or resumes" |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| What "position" is | The Tailored Resume: it is the record that holds the Job Description and company | Only entity with a Job Description | y - User: "position is a tailored resume" |
| Which prompts get Additional Information | Public chat, recruiter chat and tailor | User: "All three (Recommended)" | y |
| Field name | "Additional information" (`additionalInformation`, `profile.additional_information`), not "Extra information" | User: "instead of extra information field name it as additional information" | y |
| Looking Forward Next: where it lives | A Profile text field labelled "Looking forward next" (`lookingForwardNext`, `profile.looking_forward_next text not null default ''`), on the "Career content" tab after Additional information | User: "add a new field called looking forward next"; it describes the Candidate, like Additional information | y - User: "profile"; position on Career content tab: "ok" |
| Looking Forward Next: which prompts | Public chat and recruiter chat only | User: "available on chats only, not in printed version or resumes" | y |
| Looking Forward Next in the chat body | Appended after the Additional information section as `## Looking forward next`, a blank line and the trimmed text; omitted when empty or when the Career Library is empty | Same shape as Additional information | y - User: "yes" (recruiter chat linked to a resume gets it too); empty-library rule: "agree" |
| Looking Forward Next: limits and PII | 5000 characters after trim; same PII and full-name rejection as Additional information | Reaches an LLM, so the core invariant applies | y - User: "ok" (lengths, PII) |
| Where the resume fields are set | Optional on the New resume form; editable in the resume editor, saved by the editor's Save without regenerating | User: "Create form + editor (Recommended)" | y |
| Job Link format | Empty, or an absolute `http://` / `https://` URL; shown as a link opening in a new tab with `rel="noopener noreferrer"` | User: "http(s) URL, clickable (Recommended)" | y |
| Resumes list | Adds a "Recruiter" column after "Company" | User: "Recruiter column (Recommended)" | y |
| Storage | `tailored_resumes.job_link`, `recruiter_name`, `notes` and `profile.additional_information`, `profile.looking_forward_next`, each `text not null default ''`; one migration | Same shape as `custom_instructions`; existing rows read as empty | n |
| Maximum lengths (after trim) | Job Link 2000, Recruiter Name 200, Notes 10000, Additional Information 5000 characters | Bounds storage and, for Additional Information, prompt tokens | y - User: "lenghts are ok" |
| Over-length or invalid value | 400 with the field's message; nothing of that request is saved | Same as other admin validation | n |
| Where Additional Information goes in the prompt | Appended to the Career Body as a final `## Additional information` section followed by the trimmed text; omitted when empty | Keeps "the Career Body is the only CV content sent to an LLM" true | n |
| Recruiter Chat linked to a Tailored Resume | Its body is the resume markdown plus the same `## Additional information` section | User wants it available to the recruiter prompt in every case | y - User: "yes" |
| Empty Career Library | Chats keep today's "Master CV is empty" body with no Additional Information; tailor keeps today's empty-library error | Additional Information alone is not career information | y - User: "agree.. if no carrer makes no chat :D" |
| PII in Additional Information | Profile save rejects it with 400 when it contains a Personal Info Field value or the full name, same messages as the summary; Generate's full-name check covers it | Core invariant: personal data never reaches an LLM | y - User: "ok" |
| PII in Recruiter Name and Notes | Not checked | They never reach an LLM or any shared surface | y - User: "ok" |
| Where Additional Information is edited | Profile → "Career content" tab, a long field labelled "Additional information" after Summary | Beside the other content the prompts read | y - User: "ok" |
| Glossary | Add **Job Link**, **Recruiter Name** (of a Tailored Resume), **Resume Notes**, **Additional Information**, **Looking Forward Next** | CLAUDE.md requires glossary terms | n |
| Production migration | Adding the columns in production needs the Owner's go-ahead at deploy | Blast radius rule | y - User: "I know" |

**Open questions:** none - the `n` rows are defaults for the user to confirm with the spec.

---

## User Stories

### P1: Track a position on its Tailored Resume ⭐ MVP

**User Story**: As the Owner, I want to record where I found a job, who the recruiter is and my notes on each Tailored Resume, so that I can follow my applications in one place.

**Why P1**: The main request.

**Acceptance Criteria**:

1. WHEN `GET /admin/resumes` is requested THEN the "New resume" form SHALL contain optional inputs labelled "Job link" (`jobLink`), "Recruiter name" (`recruiterName`) and a textarea "Notes" (`notes`).  <!-- OWN-01 -->
2. WHEN `POST /admin/resumes` receives `jobLink`, `recruiterName` and `notes` THEN the app SHALL store their trimmed values on the new resume, `''` for each one absent.  <!-- OWN-02 -->
3. WHEN `GET /admin/resumes/:id` is requested THEN the editor SHALL show the three fields with their stored values in the resume form.  <!-- OWN-03 -->
4. WHEN `PUT /admin/resumes/:id` receives `jobLink`, `recruiterName` and `notes` THEN the app SHALL store their trimmed values and SHALL leave `structured`, `model` and the Assessment unchanged.  <!-- OWN-04 -->
5. WHEN `PUT /admin/resumes/:id` omits any of the three fields THEN the app SHALL keep that field's stored value.  <!-- OWN-05 -->
6. WHERE a resume has a non-empty Job Link the editor SHALL show it as an `<a>` with that `href`, `target="_blank"` and `rel="noopener noreferrer"`.  <!-- OWN-06 -->
7. WHEN `GET /admin/resumes` is requested THEN the list SHALL show a "Recruiter" column after "Company" holding each resume's Recruiter Name, empty when none.  <!-- OWN-07 -->
8. IF `jobLink` is non-empty and is not an absolute URL with scheme `http` or `https` THEN the app SHALL answer 400 with "Job link must start with http:// or https://" and SHALL store nothing from that request.  <!-- OWN-08 -->
9. IF after trim `jobLink` exceeds 2000, `recruiterName` 200 or `notes` 10000 characters THEN the app SHALL answer 400 with "<Label> is limited to <N> characters" and SHALL store nothing from that request.  <!-- OWN-09 -->
10. The app SHALL never put a resume's Job Link, Recruiter Name or Notes into an LLM request, the print view, the markdown download, a Recruiter Chat body or any `/api` response.  <!-- OWN-10 -->

**Independent Test**: Create a resume with the three fields, edit them in the editor, see the Recruiter column; generate, print and chat and find none of the three values in the recorded LLM input or the printed/downloaded output.

---

### P1: Additional Information on the Profile ⭐ MVP

**User Story**: As the Owner, I want to write extra facts about myself on my Profile, so that the chats and the tailor can use them.

**Why P1**: The second half of the request.

**Acceptance Criteria**:

11. WHEN `GET /admin/profile?tab=career` is requested THEN the form SHALL contain a textarea labelled "Additional information" named `additionalInformation` holding the stored value.  <!-- OWN-11 -->
12. WHEN `POST /admin/profile` with `tab=career` receives `additionalInformation` THEN the app SHALL store its trimmed value.  <!-- OWN-12 -->
13. WHEN `POST /admin/profile` with `tab=ai` is received THEN the app SHALL keep the stored Additional Information.  <!-- OWN-13 -->
14. IF `additionalInformation` contains a Personal Info Field value THEN the app SHALL answer 400 with "Your <label> is in the body — keep contact data in Personal info" and SHALL not save the profile.  <!-- OWN-14 -->
15. IF `additionalInformation` contains the profile's full name (case-insensitive) THEN the app SHALL answer 400 with "Your full name is in the additional information — the Candidate is never named in prompts" and SHALL not save the profile.  <!-- OWN-15 -->
16. IF after trim `additionalInformation` exceeds 5000 characters THEN the app SHALL answer 400 with "Additional information is limited to 5000 characters" and SHALL not save the profile.  <!-- OWN-16 -->
17. WHERE Additional Information is non-empty and the Career Library has items, the public chat request body SHALL end with `## Additional information`, a blank line and the trimmed Additional Information.  <!-- OWN-17 -->
18. WHERE Additional Information is non-empty and the Career Library has items, the recruiter chat request body SHALL end with the same section, both for a chat with no linked resume and for one linked to a Tailored Resume.  <!-- OWN-18 -->
19. WHERE Additional Information is non-empty and the Career Library has items, the tailor request body SHALL end with the same section.  <!-- OWN-19 -->
20. WHILE Additional Information is empty the public, recruiter and tailor request bodies SHALL equal today's bodies (no section).  <!-- OWN-20 -->
21. IF Additional Information contains the profile's full name when Generate runs THEN the app SHALL refuse with today's full-name error and SHALL not call the LLM.  <!-- OWN-21 -->
22. The app SHALL never put Additional Information into the print view, the markdown download or a stored Resume Document.  <!-- OWN-22 -->

**Independent Test**: Save Additional Information on the Profile, ask the public chat, a recruiter chat and Generate, and find the section at the end of each recorded body; save one containing an email from Personal Info and get 400.

---

### P1: Looking Forward Next on the Profile ⭐ MVP

**User Story**: As the Owner, I want to write what I am looking for next on my Profile, so that visitors and recruiters can ask the chats about it without it appearing on any resume.

**Why P1**: Requested with this feature.

**Acceptance Criteria**:

23. WHEN `GET /admin/profile?tab=career` is requested THEN the form SHALL contain a textarea labelled "Looking forward next" named `lookingForwardNext` holding the stored value.  <!-- OWN-23 -->
24. WHEN `POST /admin/profile` with `tab=career` receives `lookingForwardNext` THEN the app SHALL store its trimmed value.  <!-- OWN-24 -->
25. WHEN `POST /admin/profile` with `tab=ai` is received THEN the app SHALL keep the stored Looking Forward Next.  <!-- OWN-25 -->
26. IF `lookingForwardNext` contains a Personal Info Field value or the profile's full name (case-insensitive), or exceeds 5000 characters after trim, THEN the app SHALL answer 400 with the message of OWN-14, "Your full name is in looking forward next — the Candidate is never named in prompts" or "Looking forward next is limited to 5000 characters" respectively, and SHALL not save the profile.  <!-- OWN-26 -->
27. WHERE Looking Forward Next is non-empty and the Career Library has items, the public chat request body SHALL end with `## Looking forward next`, a blank line and the trimmed text, after any Additional information section.  <!-- OWN-27 -->
28. WHERE Looking Forward Next is non-empty and the Career Library has items, the recruiter chat request body SHALL end with the same section, both for a chat with no linked resume and for one linked to a Tailored Resume.  <!-- OWN-28 -->
29. The app SHALL never put Looking Forward Next into the tailor request, the print view, the markdown download or a stored Resume Document.  <!-- OWN-29 -->
30. WHILE Looking Forward Next is empty the public and recruiter chat bodies SHALL have no `## Looking forward next` section.  <!-- OWN-30 -->

**Independent Test**: Save Looking Forward Next, ask the public chat and a recruiter chat and find the section at the end of each recorded body; Generate and print, and find it in neither the recorded tailor input nor the output.

---

## Edge Cases

- IF a field holds only whitespace THEN the app SHALL store `''` (covered by the trim in OWN-02, OWN-04, OWN-12).
- WHEN the Career Library is empty THEN chats and tailor SHALL behave as today, with no Additional information section (OWN-20 scope; assumption row "Empty Career Library").
- WHEN existing resumes and the existing profile are read after the migration THEN the five new fields SHALL read as `''`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| OWN-01 | P1: Track a position | Tasks | Pending |
| OWN-02 | P1: Track a position | Tasks | Pending |
| OWN-03 | P1: Track a position | Tasks | Pending |
| OWN-04 | P1: Track a position | Tasks | Pending |
| OWN-05 | P1: Track a position | Tasks | Pending |
| OWN-06 | P1: Track a position | Tasks | Pending |
| OWN-07 | P1: Track a position | Tasks | Pending |
| OWN-08 | P1: Track a position | Tasks | Pending |
| OWN-09 | P1: Track a position | Tasks | Pending |
| OWN-10 | P1: Track a position | Tasks | Pending |
| OWN-11 | P1: Additional Information | Tasks | Pending |
| OWN-12 | P1: Additional Information | Tasks | Pending |
| OWN-13 | P1: Additional Information | Tasks | Pending |
| OWN-14 | P1: Additional Information | Tasks | Pending |
| OWN-15 | P1: Additional Information | Tasks | Pending |
| OWN-16 | P1: Additional Information | Tasks | Pending |
| OWN-17 | P1: Additional Information | Tasks | Pending |
| OWN-18 | P1: Additional Information | Tasks | Pending |
| OWN-19 | P1: Additional Information | Tasks | Pending |
| OWN-20 | P1: Additional Information | Tasks | Pending |
| OWN-21 | P1: Additional Information | Tasks | Pending |
| OWN-22 | P1: Additional Information | Tasks | Pending |
| OWN-23 | P1: Looking Forward Next | Tasks | Pending |
| OWN-24 | P1: Looking Forward Next | Tasks | Pending |
| OWN-25 | P1: Looking Forward Next | Tasks | Pending |
| OWN-26 | P1: Looking Forward Next | Tasks | Pending |
| OWN-27 | P1: Looking Forward Next | Tasks | Pending |
| OWN-28 | P1: Looking Forward Next | Tasks | Pending |
| OWN-29 | P1: Looking Forward Next | Tasks | Pending |
| OWN-30 | P1: Looking Forward Next | Tasks | Pending |

**Coverage:** 30 total, 0 mapped to tasks, 30 unmapped until tasks.md.

---

## Sources

- User request (2026-11-24): job link, recruiter name, extra information on a position, "for my own control"; Profile extra information "available to the prompts".
- AskUserQuestion answers (2026-11-24): all three prompts; create form + editor; http(s) URL, clickable; Recruiter column.
- User follow-up (2026-11-24): rename to "additional information"; new "looking forward next" field, "available on chats only, not in printed version or resumes".
- `CLAUDE.md` core invariant and `GLOSSARY.md` (Career Body, Tailored Resume, Profile).

---

## Success Criteria

- [ ] The Owner records and edits link, recruiter and notes per resume without regenerating it.
- [ ] Zero occurrences of the three resume fields in any recorded LLM input, print or download in the test suite.
- [ ] Additional Information reaches all three prompts and is rejected when it carries personal data.
