# Changelog

## 0.1.0

Initial release.

- `/name` commands for every discovered skill, listed in the `/` menu with
  descriptions.
- Mid-sentence `/` popup with live filtering; Enter inserts the skill
  without submitting.
- Bare `/name` tokens and `<skill name="x">` tags expand into the skill's
  full instructions on send, anywhere in the message.
- Hidden (`disable-model-invocation: true`) skills resolve in every path.
- Project skills gated on trust; startup hint when Pi's `/skill:*` listing
  would duplicate the menu.
- Fails soft on incompatible Pi versions: the popup is feature-detected,
  commands and expansion keep working.
