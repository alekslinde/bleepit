<!--
Thanks for the PR. See CONTRIBUTING.md for setup, scopes and what belongs here.
Delete any section that does not apply — an empty heading helps nobody.
-->

## What changed

<!-- The change itself, in a sentence or two. -->

## Why

<!--
The reasoning the diff cannot show: what was broken, what it cost, why this
approach over the alternative. Skip it only when the title already says it.
-->

## How this was verified

<!--
Be specific — "tests pass" and "I checked the built output behaves correctly"
are different claims, and the second one catches things the first misses.

- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] New tests cover the change, and fail without it
- [ ] Checked behavior beyond the unit tests (built output, demo site, bench)
-->

## Notes for the reviewer

<!--
Anything that would otherwise be found the hard way: a tradeoff you made and
its alternative, a limitation you chose to accept, something you are unsure
about. Naming the weak spot gets it reviewed instead of merged.
-->

---

- [ ] Added a changeset (`pnpm changeset`) — or this is internal only
- [ ] No new runtime dependency in `bleepit` (see CONTRIBUTING.md)
