# ECE Type Review — Final Web Upgrade Setup

This build is designed for:

`https://github.com/jepiiii/jepiiii.github.io`

and deploys at:

`https://jepiiii.github.io/`

## IMPORTANT: existing installation upgrade

Your current Supabase project does **not** need to be deleted or recreated.

However, before using Multiple Choice or cloud-synced coverage, you must run the updated database migration once:

1. Open your existing Supabase project.
2. Open **SQL Editor**.
3. Open this repository file: `supabase/schema.sql`.
4. Copy the entire file into a new SQL query.
5. Click **Run**.

The script is migration-safe for the previous ECE Type Review schema. Existing profiles, accounts, public banks, and TypeLearning entries are kept. Existing cloud banks automatically become `typelearning` banks.

The migration adds:

- `bank_type` (`typelearning` or `multiple_choice`)
- MCQ question/choice/answer/explanation fields
- database validation for both bank types
- per-user bank progress
- Row Level Security for progress
- persistent coverage sync functions
- bank-type-aware community search

## Uploading this ZIP to GitHub

The ZIP is packaged with deployment files at its root. Copy/upload all files into the root of `jepiiii/jepiiii.github.io`.

You do **not** need to delete the old repository files first. The files with the same names should be replaced/overwritten, and these new files should be added:

```text
app.js
BANK_GENERATOR_PROMPT.txt
```

The updated files that replace old versions are:

```text
index.html
cloud.js
README.md
SETUP.md
supabase-config.js
supabase/schema.sql
```

If the GitHub web uploader refuses to overwrite same-name files, deleting the old app files first is safe because this ZIP contains their replacements. Do not delete the repository itself or your Supabase project.

## Supabase browser configuration

This package already contains the same public Supabase Project URL and publishable browser key currently used by your live repository.

`supabase-config.js` contains only browser-safe public configuration. Never place a `service_role`, `sb_secret_...`, database password, or other privileged credential in this repository.

If you rotate your Supabase publishable key later, update `supabase-config.js`.

## Authentication URL

In Supabase:

**Authentication → URL Configuration**

Use:

```text
Site URL: https://jepiiii.github.io/
```

Recommended redirect URL:

```text
https://jepiiii.github.io/**
```

## GitHub Pages

If Pages is already working, no change is needed.

Otherwise:

1. Repository **Settings**
2. **Pages**
3. Source: **Deploy from a branch**
4. Branch: `main`
5. Folder: `/ (root)`

## Verification checklist

After the new files deploy and the SQL migration has run, verify:

### TypeLearning
- Existing local TypeLearning banks still appear.
- Old JSON files without a `type` field still import.
- Typing and Recall work.
- Coverage increases as entries appear.
- Leaving a session does not restore encountered entries.
- Reset Coverage returns the bank to 0% without deleting history.

### Multiple Choice
- Switch the top mode to **multiple choice**.
- The included demo MCQ bank appears.
- Number keys `1`–`6` answer choices.
- Enter advances after feedback.
- Explanations display when enabled.
- MCQ results show score, accuracy, response time, elapsed time, and coverage gained.
- Bank Manager can create/edit MCQ questions with 2–6 choices.

### Community
- Search can filter All / TypeLearning / Multiple Choice.
- Cards display bank type and `uploaded by @username`.
- TypeLearning and MCQ banks can both be added locally.
- Publishing preserves the selected bank type.

### Accounts and progress
- Sign in.
- Add/use a community bank.
- Coverage is saved.
- Sign in on another browser/device and add the same community bank.
- Cloud coverage synchronizes for that bank.

## JSON formats

### TypeLearning

```json
{
  "name": "Feedback and Control Systems",
  "type": "typelearning",
  "entries": [
    {
      "term": "Transfer Function",
      "definition": "The ratio of the Laplace transform of the output to the Laplace transform of the input under zero initial conditions."
    }
  ]
}
```

The `type` field may be omitted for legacy TypeLearning banks.

### Multiple Choice

```json
{
  "name": "ECE Laws Practice",
  "type": "multiple_choice",
  "entries": [
    {
      "question": "Which law regulates the practice of Electronics Engineering in the Philippines?",
      "choices": ["RA 9292", "RA 7920", "RA 8495", "RA 544"],
      "correctIndex": 0,
      "explanation": "RA 9292 is the Electronics Engineering Law of 2004."
    }
  ]
}
```

`correctIndex` is zero-based. Choices may contain 2–6 items.
