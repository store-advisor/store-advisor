# Open TODOs

Things that are not decided or not owned yet. These are not sprint tickets, they are gaps that
will hurt us if nobody picks them up. Each needs an owner.

## Urgent (has an external deadline or blocks the demo)

- [ ] **Book the supervisor.** People from our year are already reserving. This is the only
      item with a real external deadline. Preferences: Dr Gihad, Dr Hind Shaaban, Dr Amira
      El Aff. **Owner: Faraj.**
- [ ] **Who writes the thesis / report?** Grad projects are graded on the document too, not
      just the code. Nobody owns this. It needs an owner from week one, documenting as we go,
      not a scramble at the end. **Owner: ?**
- [ ] **Firebase Cloud Messaging setup.** The demo opens with a phone buzz. FCM is not set up
      and it is on the critical path. **Owner: Osama.**

## Important (needed before we go past the MVP)

- [ ] **LLM provider and budget.** Confirm Claude via the Anthropic SDK. What does one finding
      cost to explain? Who pays? DataJar sponsors tools, so ask them. **Owner: Khaled.**
- [ ] **Secrets management.** API keys do not go in the repo. GitHub Secrets for CI, something
      for local dev (a `.env` that is gitignored). **Owner: Faraj.**
- [ ] **Environments.** Do we have a staging deploy on Cloud Run, or only local plus the demo
      machine? **Owner: Faraj.**
- [ ] **Branch protection.** Blocked on GitHub free tier for private repos. Options: DataJar
      sponsors GitHub Team, apply for the Student Pack, or make the repo public. Until then,
      PRs are a convention, not enforced. **Owner: Faraj.**

## Before demo day

- [ ] **LLM eval set.** A handful of hand-written findings with expected explanations, so we
      can tell when a prompt change makes the LLM worse. **Owner: Khaled.**
- [ ] **Demo day plan.** Who presents, on what machine, and what happens if the wifi dies.
      Record a backup video. **Owner: Faraj + Ahmed Osama.**

## How to use this file

When you take one of these, put your name on it and move it into a Jira ticket. This file is
the parking lot, Jira is the work. Nothing here should sit unowned for more than a sprint.
