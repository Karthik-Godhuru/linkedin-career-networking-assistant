---
name: li-reply
description: >-
  Handle the replies under the user's own LinkedIn posts - draft answers to
  every comment, sorted by which ones are worth answering. Use when the user
  pastes the comments on their post, says "reply to these", "handle my
  comments", "someone said X on my post", or is dealing with a critic or a
  lead in the comments.
---

# li-reply

The reply thread under your own technical post is where reach and peer trust are decided. Every
reply is a second engagement event on the post, and the first hour of replies
does most of the work. But the value is not equal across comments, so this
skill sorts before it writes.

## Input

The user pastes the comments, ideally with names and roles. Screenshots are
fine. Do not scrape the thread with a browser tool.

## Triage first

Sort every comment into one of five buckets and say the count out loud:

| bucket | what it is | what it gets |
| --- | --- | --- |
| **LEAD** | someone describing an engineering problem or role | a real technical answer + a soft open door |
| **SUBSTANCE** | adds benchmarks, disagrees, extends architecture | the longest reply on the thread |
| **PEER** | an engineer or researcher worth being seen next to | a reply that gives them insight |
| **SUPPORT** | "great post", 👏, a quick tag | a like, and a 3-8 word reply at most |
| **NOISE** | pitch, spam, bad faith | nothing, or one line and out |

Then write in that order, and stop writing when the value stops.

## How to reply

- **Answer the actual question.** If someone asks how the architecture scales, tell them how, in the
  reply. Do not gatekeep it behind a DM.
- **Use their name once**, at the start, and never with an exclamation mark.
- **Match their length.** A two-line comment does not get a six-line reply.
- **To a technical critic:** concede the valid part first, in their terms, then hold the
  line on the engineering trade-off you chose. Never delete, never get defensive, never reply
  twice on the same thread.
- **To a lead / recruiter:** answer fully in public. The open door is one sentence at the
  end, and it is an offer to collaborate or share code.
- **To an unsolicited pitch in your comments:** ignore it. Replying gives it reach.

## Output

One block, grouped by bucket, each reply copy-ready and already humanized via `li-human`.
Then the gate: **nothing is posted until the user says yes.** The user pastes the
replies manually.
