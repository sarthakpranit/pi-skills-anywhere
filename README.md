# pi-skills-anywhere

![demo](demo/pi-skills-anywhere.gif)

Invoke [Pi](https://pi.dev) skills from anywhere in a prompt, including
several in the same message.

Pi can force a skill with `/skill:name`, but only at the very start of a
message. This package drops that restriction:

- Every discovered skill becomes a `/name` command in the `/` menu, with
  its description.
- Typing `/` anywhere in the composer opens the skill menu. It filters as
  you type, and Enter inserts the skill without submitting, so you keep
  writing your sentence.
- Bare `/name` tokens and `<skill name="x"/>` tags also work anywhere in a
  message and expand to the skill's full instructions on send.
- Skills hidden with `disable-model-invocation: true` resolve everywhere.
- Project skills (`.pi/skills/`, `.agents/skills/`) are found up the tree
  to the repository root, gated on project trust.

## Install

```bash
pi install npm:pi-skills-anywhere
```

To try it once without installing:

```bash
pi -e npm:pi-skills-anywhere
```

## Dedupe the menu (recommended)

Pi lists every skill as `/skill:name` by default. This package registers
the same skills as `/name`, so each one shows up twice in the `/` menu.
To keep a single set, put this in `~/.pi/agent/settings.json`:

```json
{ "enableSkillCommands": false }
```

The extension nudges you at startup until you flip it. It never writes
your settings.

## Compatibility and known limits

- Requires Pi 1.3.x (peer dependency `^1.3.0`).
- The mid-sentence popup calls a private runtime method on Pi's editor.
  It's feature-detected and fails soft: on an incompatible Pi version the
  popup just stops appearing, while commands, tokens, and tags keep
  working.
- In `pi -p` (print mode), start-of-message `/name args` dispatch hits a
  Pi lifecycle quirk. Interactive mode is unaffected.
- A file whose name exactly matches a skill name can be mis-selected from
  a path-completion popup in rare cases.
- Expansion swaps the token or tag for the full SKILL.md body; the model
  still chooses to follow it.

## Releases

Push a `v*` tag; CI publishes to npm with provenance.

## Test

```bash
bun install && bun test
```

The suite runs offline against fixture skills: command registration,
mid-text token and tag expansion, URL and path guards, and dispatch.

## License

MIT
