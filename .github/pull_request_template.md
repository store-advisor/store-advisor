## What this changes

<!-- One or two sentences. What does this do that main does not? -->

## Why

<!-- Link the Jira ticket. If there is no ticket, there is no work — see HANDBOOK.md section 8. -->

Ticket: SCRUM-

## How it was verified

<!-- Not "tests pass". What did you actually see work, and how would a reviewer
     reproduce it? A reviewer must be able to see it work — that is the
     definition of done. -->

## Definition of done (HANDBOOK.md section 8)

- [ ] CI is green
- [ ] Every acceptance criterion in the ticket is true
- [ ] Someone other than me has seen it work
- [ ] Any decision made along the way is written down, with the reason

## Interface rules (ROLES.md)

Tick only if this PR touches connectors or checks:

- [ ] A new data source is a new connector, not a change to the check engine
- [ ] A new check is a new module, not a change to the engine core

If either rule forced a change to shared code, say so here — that means the
interface is wrong and we should fix it now rather than work around it.
