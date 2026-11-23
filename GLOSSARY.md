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

**Custom Instructions**:
Owner-written steering text of one Tailored Resume, sent to the tailor model; never a source of facts.
_Avoid_: Prompt, custom prompt

**Job Description**:
Text pasted by the Owner describing a role; input to tailoring and optional context of a Recruiter Chat.
_Avoid_: JD (in UI), vacancy

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
