# ECE Type Review

A keyboard-first study platform for Electronics Engineering and other course material.

## Two bank types

### TypeLearning
Term/definition banks used with:
- Typing mode
- Recall mode
- Strict or Learning-Friendly matching

Legacy JSON banks with no `type` field still import as TypeLearning.

### Multiple Choice
Question banks with:
- 2–6 choices per question
- optional explanations
- shuffled choices by default
- number-key answering (`1`–`6`)
- MCQ-specific score/accuracy/response-time results

## Persistent coverage

The old session-only repeat policy has been replaced by persistent bank coverage.

- An entry becomes encountered as soon as it is shown.
- Aborting or closing a session does not make it unseen again.
- New sessions draw only unseen entries.
- If fewer unseen entries remain than the requested session length, the session uses the remaining entries and stops at 100%.
- Reset Coverage makes every entry eligible again without deleting lifetime correct/incorrect/reveal statistics.
- Guests store progress locally.
- Signed-in users sync progress for community/cloud banks through Supabase.

## Community banks

Public banks show:
- TypeLearning or Multiple Choice badge
- subject
- entry count
- uploader username
- description

Search supports bank names, subjects, uploaders, TypeLearning content, MCQ questions, choices, and explanations. Results can be filtered by bank type.

## Deployment

This repository is a static GitHub Pages application. No build command is required.

Important deployment files:

```text
index.html
app.js
cloud.js
supabase-config.js
BANK_GENERATOR_PROMPT.txt
SETUP.md
supabase/
  schema.sql
```

See `SETUP.md` before deploying this version because the Supabase schema must be migrated once.
