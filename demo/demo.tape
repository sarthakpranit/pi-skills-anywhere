# Regenerate with demo/record.sh. Fixture skills only (PI_SKILLS_ANYWHERE_ROOTS),
# scratch project, real pi + model.

Output demo/pi-skills-anywhere.gif

Set FontFamily "FiraCode Nerd Font Mono"
Set FontSize 14
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

# The story: invoke a skill from mid-sentence.
Type 'hey, can you '
Type '/'
Sleep 800ms
Type 'r'
Sleep 600ms
Down
Sleep 400ms
Enter
Sleep 500ms
Type ' parser.py briefly'
Enter
Sleep 12s
