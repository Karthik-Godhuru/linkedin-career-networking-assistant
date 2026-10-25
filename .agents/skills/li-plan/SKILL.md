---
name: li-plan
description: >-
  Build the week on LinkedIn - what to post, when to post it, and who to engage
  with. Use when the user says "plan my week", "what should I post", "content
  calendar", "I have nothing to post about", or wants a posting schedule and an
  engagement list.
---

# li-plan

The control room. Everything else in this pack executes; this decides what
gets executed. Run it once a week, on the same day.

## Input

If `.agents/linkedin/voice.md` and `.agents/linkedin/log.md` exist, read them - the plan
should not repeat a theme from the last fortnight. If they do not exist, ask
for four things and write them down:

1. What target engineering role / internship the user is pursuing, and to whom.
2. The three or four core technical themes they want to be known for (e.g. Distributed Training, LLM Evaluation, Agentic Workflows, Python backend architecture).
3. What actually happened this week - a debugging win, a benchmark run, an open-source commit, a paper read, a concept understood. This is where authentic engineering posts come from.
4. Ten to twenty engineers, mentors, or companies worth being visible to.

## What to post

Four posts a week beats seven. Consistency is a floor, not a target, and the
fifth post of a week is almost always the weak one that drags the average.

Mix across the week, never two of the same type back to back:

| type | share | job |
| --- | --- | --- |
| **Proof** | 1 per week | something that was built or evaluated, with a concrete number |
| **Opinion** | 1 per week | an architectural position or technical stance |
| **Teach** | 1 per week | one actionable implementation pattern or snippet |
| **Story** | 1 per fortnight | a real debugging post-mortem or project milestone |
| **Offer / Collaboration** | 1 per fortnight | what you build and what roles/internships you seek |

For each slot give: the theme, the specific angle drawn from what actually
happened this week, and the hook formula. Not an abstract topic - a concrete angle.

## When to post

Post when the target tech audience is at a desk. For engineering audiences, Tuesday to Thursday, 7:30-9:30am local time, is the working default, with Monday afternoon and Friday morning as second tier.

The day and hour matter far less than whether the first line has high signal.

## Who to engage with

Build a list of 10, split three ways:

- **5 reach** - senior AI/ML engineers, staff researchers, or founders whose posts you can
  genuinely add technical insight to. Comment before they have 20 comments.
- **3 peers** - peers, alumni, fellow developers. This is the group that reciprocates and shares insights.
- **2 hiring managers / mentors** - leaders at target companies or labs. Comment on their technical posts for
  weeks before sending any DM, and never pitch in a comment.

20 minutes a day, before posting. Thoughtful comments on others' work build familiarity.

## Output

```
WEEK OF [CURRENT DATE]

MON  engage only  (20 min, list below)
TUE  8:15am  PROOF    - vLLM vs TGI benchmark on Llama 3
WED  engage only
THU  8:00am  OPINION  - Why naive RAG fails on tabular data
FRI  8:30am  TEACH    - Pydantic v2 validation tricks for agent tool calls
SAT  -
SUN  4:00pm  STORY    - The silent memory leak in our DataLoader

ENGAGE  (5 reach / 3 peers / 2 hiring managers)
  ...
```

Write the plan to `.agents/linkedin/plan.md` so the other skills can read it.
Nothing is scheduled or posted anywhere - this is a plan, and the user executes it manually.
