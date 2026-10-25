---
name: li-comment
description: >-
  Write comments on other people's LinkedIn posts that read as a person with an
  opinion, not a bot. Use when the user pastes a post and wants a comment, says
  "comment on this", "engage with this", "what do I say here", or wants a batch
  of comments for their engagement round.
---

# li-comment

Commenting is the highest-leverage thing on LinkedIn and the easiest to do
badly. A comment on a technical post with 400 reactions gets seen by more people than
most of your own posts. A generic one gets seen by nobody and costs you
credibility with the author.

## Input

The user pastes the post text (and the author's name and role if they have
it). If they paste a screenshot, read it. If they give you a URL you cannot
open, ask them to paste the text - do not guess what the post said, and do not
use browser automation to scrape the feed.

## The nine comment types

Pick by what the post actually is. Never default to type 1.

| # | type | when | shape |
| --- | --- | --- | --- |
| 1 | **Add a datum** | post makes an engineering claim you can support with a benchmark or metric | "We observed the same thing: vLLM cut p99 latency by 35%..." |
| 2 | **Add the missing case** | post is right but incomplete | "This holds until {edge condition}. Then..." |
| 3 | **Respectful disagree** | you genuinely think the technical approach is wrong | name the agreement first, then the fork |
| 4 | **Extend one line** | one sentence in the post is the good one | quote it, then build on it |
| 5 | **Ask the real question** | post skipped the hard architecture part | one question, specific, no "curious to hear" |
| 6 | **The receipt** | you have built/run the thing they described | what happened, in two sentences |
| 7 | **The correction** | there is an architectural/factual error | be right, be brief, be kind, be sure |
| 8 | **The reframe** | the post has the right facts and the wrong frame | "Another way to read this in production:" |
| 9 | **The one-liner** | the post needs nothing, you want presence | under 12 words, must be insightful or true |

## Rules

- **2 to 4 sentences.** Longer reads as a hijack. Shorter reads as filler.
- **Never open with "Great post"**, "Love this", "So true", "Couldn't agree
  more", "This resonates", or the author's first name followed by an
  exclamation mark. All six are invisible.
- **No emoji openers.** No 🔥 or 👏 as a first character.
- **Never restate the post.**
- **One idea.** A comment with two points reads as an unsolicited blog post.
- **Say the specific thing.** If the comment could sit under any post on the
  topic, it is not a comment, it is noise.
- **Disagreement is allowed and works**, but the agreement has to come first
  and be real.

## Output

Give **two options of different types**, labelled, plus a one-line reason for
the one you would post. Run both through `li-human` first.

## Batch mode

If the user wants an engagement round, ask for the 5-10 posts as pasted text
in one message, return one comment each in a single block, and keep a running
note of who they have already commented on this week in
`.agents/linkedin/log.md`. Commenting on the same three people every day is
visible and looks forced.

## Never

Do not auto-post. Do not use a browser tool to publish comments on the user's
behalf. Automated posting and scraping both violate LinkedIn's User Agreement
and put the account at risk. This skill writes the comment. The user posts it.
