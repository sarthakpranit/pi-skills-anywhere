# pi-skills-anywhere

Pi package that turns every discovered skill into a `/name` command, adds a
mid-sentence `/` popup, and expands `/name` tokens and `<skill>` tags in
place. One extension, `src/skill-tags.ts`. README.md holds the feature
contract and known limits — read it before changing behavior.

## The seam

`SkillMenuEditor` and the autocomplete provider reach **private** editor
internals from pi-tui (`requestAutocomplete`, `autocompleteState`,
`autocompleteList`): every call goes through `as any`, is feature-detected,
and sits in try/catch. The failure mode on a Pi upgrade is a missing popup,
never a crash — keep it that way. Wrapping a new editor internal the same
way is the prerequisite for using it.

## Repo facts

- No build step: Pi loads `src/skill-tags.ts` through jiti; try the local
  package with `pi -e .`.
- `bun install` fetches the host peer into `node_modules/` so type-checking
  and the tests can resolve it; CI does the same.
- The mid-sentence popup has no automated coverage — verify it by hand in
  an interactive session (`pi -e .`, type `/` mid-message) before shipping
  changes that touch `SkillMenuEditor`.
