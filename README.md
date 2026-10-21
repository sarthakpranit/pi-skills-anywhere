# pi-skills-anywhere

Invoke [Pi](https://pi.dev) skills from anywhere in a prompt.

- **`/name args`** — every discovered skill is a command, listed in the `/`
  menu with its description.
- **`/` mid-sentence** — typing `/` anywhere in the composer pops up the
  skill menu; it filters as you type, and **Enter inserts the skill without
  submitting**, so you keep writing your sentence.
- **Bare `/name` tokens** — typed without the popup, they expand into the
  skill's full instructions on send.
- **`<skill name="x"/>` tags** — expand on send, like `/skill:name` without
  the start-of-message restriction.
- **Hidden skills** — `disable-model-invocation: true` skills resolve in
  every path.
- **Project skills** — discovered from `.pi/skills/` and `.agents/skills/`
  walking up to the repository root, and gated on project trust.

## Install

```bash
pi install npm:pi-skills-anywhere
```

Or try it once without installing:

```bash
pi -e git:github.com/sarthakpranit/pi-skills-anywhere
```

## Dedupe the menu (recommended)

Pi lists every skill as `/skill:name` by default (`enableSkillCommands`,
on out of the box). This package registers the same skills as `/name`, so
each skill appears twice in the start-of-message `/` menu. To keep one
clean set, set in `~/.pi/agent/settings.json`:

```json
{ "enableSkillCommands": false }
```

The extension reminds you at startup until you flip it. It never writes
your settings itself.

## Compatibility and known limits

- Requires Pi `1.3.x` (peer dependency `^1.3.0`).
- The mid-sentence popup reaches a private runtime method on Pi's editor.
  It is feature-detected and fails soft: on an incompatible Pi version the
  popup silently stops appearing while commands, tokens, and tags keep
  working.
- In `pi -p` (print mode), start-of-message `/name args` command dispatch
  hits a Pi lifecycle quirk in the extension runtime; interactive mode is
  unaffected.
- A file whose name exactly matches a skill name can be mis-selected from
  a path-completion popup in rare cases.
- Expansion replaces the skill tag or token with the full SKILL.md body;
  the model still chooses to follow it.

## Releases

Push a `v*` tag (`git tag v0.1.1 && git push origin v0.1.1`); CI
publishes to npm with provenance.

## Test

```bash
bun install && bun test
```

Covers command registration, mid-text token and tag expansion, URL/path
guards, passthrough, hidden-skill resolution, and command dispatch.

## License

MIT
