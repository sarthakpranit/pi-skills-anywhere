# Regenerate with demo/record.sh. Fixture skills only (PI_SKILLS_ANYWHERE_ROOTS),
# scratch project, real pi + model. One prompt invokes three skills together.

Output demo/pi-skills-anywhere.gif

Set FontFamily "FiraCode Nerd Font Mono"
Set FontSize 17
Set Width 1240
Set Height 880
Set Padding 12
Set Framerate 15
Set TypingSpeed 25ms
Set Theme "Catppuccin Mocha"

Hide
Type 'export PI_SKILLS_ANYWHERE_ROOTS="$(pwd)/demo/skills"' Enter
Type 'cd "$(pwd)/demo/project" && clear' Enter
Show
Type 'pi --no-session' Enter
Sleep 4s

# One prompt, three skills invoked together. The prefix is typed letter by
# letter so the menu visibly re-filters on every keystroke — motion instead
# of a frozen dwell.
Type 'hey, can you '
Type '/'
Sleep 1.2s
Type 'r'
Sleep 500ms
Type 'e'
Sleep 500ms
Type 'v'
Sleep 800ms
Enter
Type ' parser.py, then '
Type '/'
Sleep 1.2s
Type 'r'
Sleep 500ms
Type 'e'
Sleep 500ms
Type 'f'
Sleep 800ms
Down@150ms
Sleep 500ms
Enter
Type ' it, and reply '
Type '/'
Sleep 1.2s
Type 'p'
Sleep 500ms
Type 'i'
Sleep 500ms
Type 'r'
Sleep 800ms
Enter
Sleep 600ms
Enter
Sleep 12s
