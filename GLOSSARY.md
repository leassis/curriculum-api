# Curriculum API

An open-source backend that lets one person (the Owner) publish an AI chat about their career, give recruiters private chat links, and produce tailored resumes, without ever sending their personal data to an LLM.

## People

**Owner**:
The single person whose career the deployment describes and who signs in to the admin.
_Avoid_: User, admin user, candidate (in code)

**Candidate**:
How every LLM prompt refers to the Owner; the model never learns the Owner's name.
_Avoid_: Using the Owner's name in prompts

**Visitor**:
An anonymous person using the Public Chat.
_Avoid_: User, guest

**Recruiter**:
A third party the Owner gives a Recruiter Chat to. Their name and company are shown in the UI and never sent to an LLM.
_Avoid_: Client, hiring manager

## CV

**Career Body**:
The markdown rendered from the Career Library (or from a Resume Document): headline, summary and the items. The only CV content ever sent to an LLM.
_Avoid_: CV text, resume content

**Career Library**:
The Owner's canonical set of Career Items, one per Owner, edited as cards on the Profile page. The Career Body is rendered from it. Replaces the markdown Master CV, which no longer exists.
_Avoid_: Master CV, base CV, main resume

**Career Item**:
One entry of the Career Library (a job, a degree, a skill group…) with an Item kind, title, dates and body. Fields a kind does not use stay empty.
_Avoid_: Entry, record, section

**Item kind**:
The type of a Career Item: experience, project, education, certification, course, skill group, language, publication or honour. It decides which fields the item has and the card it appears under.
_Avoid_: Type, category

**Tech stack**:
The list of technologies of an experience or project item, kept as a code-owned fact the tailor model cannot change. Stored in the item's skills list.
_Avoid_: Skills (for experience and projects), keywords

**Personal Header**:
The ordered set of Personal Info Fields shown above a Career Body when printed. Never sent to an LLM.
_Avoid_: Contact block, PII section

**Personal Info Field**:
One labelled personal value (email, phone, city, link…) of the Owner, stored encrypted, with a Visibility.
_Avoid_: Contact, PII entry

**Visibility**:
Which surfaces may show a Personal Info Field: `public` (everywhere), `recruiter` (Recruiter Chat and print), `print` (print only).
_Avoid_: Privacy level, scope

**Profile**:
The Owner's display name, headline, summary and the three system prompts. The Career Library is stored beside it.
_Avoid_: Account, settings

**Tailored Resume**:
The Career Library tailored by the model for one Job Description, stored as a Resume Document and editable by the Owner as cards.
_Avoid_: Custom CV, variant

**Resume Document**:
The JSON form of a Tailored Resume: a headline, a summary and ordered Career Items, each remembering the library item it came from. The model rewrites item bodies only; titles, organisations, dates and Tech stack stay as in the library. Rendered to markdown to become a Career Body for print, download and Recruiter Chats.
_Avoid_: Resume JSON, structured content, resume markdown

**Left out**:
The Career Items of one kind that no item of a Tailored Resume points at through its source id. Shown as a collapsed "Left out (N)" row on that kind's card, where "Add back" copies one to the end of the card; hidden when none.
_Avoid_: Hidden items, removed items, excluded

**Assessment**:
What one generation of a Tailored Resume tells the Owner about itself: a Fit Score with its rationale, the Missing Skills, and the Omissions. Stored with the resume, replaced by the next generation, unchanged by edits. Shown in the editor as the panels "Why this score", "Missing skills" and "What was left out".
_Avoid_: Analysis, review, report

**Fit Score**:
The whole number from 0 to 100 that rates how well the original Career Library fits a Job Description, not the rewritten resume. Its band label (Strong, Moderate, Partial or Weak match) comes from one code-owned rubric shared by the prompt and the editor.
_Avoid_: Match percentage, rating, grade

**Missing Skill**:
A requirement of the Job Description that the Career Library does not show. The model lists them and code drops any that equals a skill of a Career Item, ignoring case.
_Avoid_: Gap (in code), weakness, keyword

**Omission**:
One thing the resume does not carry, with a reason: a cut the model reported, an item code restored because its kind is always kept, or a role shortened to one bullet because it ended more than 15 years ago. Distinct from Left out, which lists whole library items missing from the resume.
_Avoid_: Cut, removal, deletion

**Custom Instructions**:
Owner-written steering text of one Tailored Resume, sent to the tailor model; never a source of facts.
_Avoid_: Prompt, custom prompt

**Job Description**:
Text pasted by the Owner describing a role; input to tailoring and optional context of a Recruiter Chat.
_Avoid_: JD (in UI), vacancy

**Job Link**:
The http(s) address of the job ad behind one Tailored Resume, set by the Owner for their own tracking. Shown only in the admin; never sent to an LLM, printed, downloaded or given to a Recruiter Chat.
_Avoid_: Job URL, posting link, source

**Recruiter Name** (of a Tailored Resume):
The name of the person handling the position of one Tailored Resume, kept for the Owner's own tracking and shown in the resumes list. Not the Recruiter Chat's recruiter name, and never linked to it; never sent to an LLM, printed or downloaded.
_Avoid_: Contact, hiring manager, recruiter (alone, when the Recruiter Chat's could be meant)

**Resume Notes**:
The Owner's free notes on the position of one Tailored Resume. Shown only in the admin editor; never sent to an LLM, printed, downloaded or given to a Recruiter Chat.
_Avoid_: Comments, remarks, Custom Instructions

**Additional Information**:
Facts about the Candidate that are not Career Items (hobbies, preferences, anecdotes), kept on the Profile. Appended as an "Additional information" section to the Career Body sent to the public chat, Recruiter Chats and the tailor when the Career Library has items; rejected at save when it holds a Personal Info Field value or the full name. Never printed, downloaded or stored in a Resume Document.
_Avoid_: Extra information, bio, about me

**Looking Forward Next**:
What the Candidate is looking for next (roles, domains, ways of working), kept on the Profile. Appended as a "Looking forward next" section to the Career Body of the public chat and Recruiter Chats only, after Additional Information; never sent to the tailor, printed, downloaded or stored in a Resume Document. Same PII rules as Additional Information.
_Avoid_: Career goals, next steps, objective

**Print View**:
The server-rendered A4 page that joins a Personal Header with a Career Body for "Save as PDF".
_Avoid_: PDF export

## Chats

**Public Chat**:
The chat any Visitor can use after passing the captcha, limited per IP per day.
_Avoid_: Open chat, anonymous chat

**Recruiter Chat**:
A private chat bound to one Recruiter, reached through its Recruiter Link, with a question quota and an optional expiry.
_Avoid_: Private link, invite

**Recruiter Link**:
The URL `/r/<token>` that opens one Recruiter Chat.
_Avoid_: Invite link, share link

**Question**:
One Visitor or Recruiter message that is answered by the model and counts against a quota.
_Avoid_: Message (when quota is meant), prompt

**Revoked**:
State of a Recruiter Chat the Owner switched off; its next Question is refused.
_Avoid_: Disabled, deleted

## Safety

**PII Guard**:
The check that refuses to store or send a Career Body containing a Personal Info Field value, and redacts such values from Visitor and Recruiter messages.
_Avoid_: Filter, sanitizer

**Settings Override**:
A model ID or limit stored in the database that wins over the deployment configuration without a redeploy.
_Avoid_: Config (for DB values), env
