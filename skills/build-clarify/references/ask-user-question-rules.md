# AskUserQuestion Rules (Distilled from Spec §8 + GSD)

build-clarify is the only pipeline skill that interacts with the captain. These rules are
non-negotiable -- violating them produces confused sessions, batched questions, or dead-end
forms. Follow every rule for every AskUserQuestion call.

## Core Rules

1. **2-4 options per question.** The Claude Code harness auto-adds an "Other" freeform option.
   Never hand-write a 5th option. If you have more, split into two questions.

2. **Concrete options only.** Options must name specific approaches, files, patterns, or
   values. Forbidden: generic categories like "Technical", "Business", "Other approach",
   "Something else".

3. **Include a recommendation when evidence supports it.** If build-explore's Option
   Comparison table marked one option as `✅ Recommended`, prefix that option's label with
   `(recommended)`. Do NOT fabricate recommendations when the table has none.

4. **One question per message.** Never batch multiple AskUserQuestion calls in a single
   response. The captain must answer sequentially. Tools like TaskList can be parallel --
   AskUserQuestion cannot.

5. **Freeform fallback on "Other".** When the captain selects "Other", switch to a plain
   text prompt for the follow-up ("What's your approach?"). Do NOT present another
   AskUserQuestion for the same topic -- the captain already indicated none of the canned
   options fit.

6. **Empty response handling.** If the harness returns an empty response, retry ONCE with
   the same parameters. If still empty, fall back to a plain text numbered list:

       "I need input on {topic}. Options:
        1. {option-1}
        2. {option-2}
        Type 1 or 2, or describe another approach."

7. **Header ≤12 chars.** The `header` field is a short category label, not the question.
   Examples: "Layout", "Sync", "Storage", "Schema". If your header is longer than 12 chars,
   shorten it -- the question field carries the detail.

## Format Template

```
AskUserQuestion({
  header: "{≤12 char label}",
  question: "{full question with Q-n or O-n prefix if applicable}",
  options: [
    {
      label: "{concrete option name}",
      description: "{1-2 sentence trade-off explanation}"
    },
    {
      label: "(recommended) {concrete option name}",
      description: "{why explore recommended this -- cite evidence if available}"
    },
    // 2-4 options total
  ]
})
```

## When NOT to Use AskUserQuestion

Use plain text prompts instead for:

- **Assumption batch confirmation** (Step 2) -- captain needs to correct freeform, not pick
  from options. AskUserQuestion forces a choice; plain text allows "A-1 correct, A-2 is
  wrong because X, A-3 correct".
- **Open-ended questions with no suitable options** (Step 4 fallback) -- if Track C question
  has no clear 2-4 options, ask plain text: "Q-2: {question}. Type your answer or say
  'skip' to defer."
- **Canonical reference prompts** -- when you ask "Which ADR should I read?", let the
  captain type a path freely.
