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
The markdown part of a CV with summary, experience, skills and education. The only CV content ever sent to an LLM.
_Avoid_: CV text, resume content

**Master CV**:
The Owner's canonical Career Body, kept on the Profile.
_Avoid_: Base CV, main resume

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
The Owner's display name, headline, Master CV and the three system prompts.
_Avoid_: Account, settings

**Tailored Resume**:
A Career Body rewritten by the tailor model for one Job Description, editable by the Owner.
_Avoid_: Custom CV, variant

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
