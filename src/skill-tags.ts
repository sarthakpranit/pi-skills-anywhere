/**
 * Claude Code-style skill invocation.
 *
 * - `/name args` — every skill is a command, listed in the "/" menu
 *   (registration at load; project skills gated on trust at invocation).
 * - `/` mid-sentence — a custom editor + autocomplete provider pop up the
 *   skill menu anywhere in the message; selecting inserts `/name`.
 * - bare `/name` tokens and `<skill name="x">` tags anywhere in a message
 *   expand into the skill's full instructions on send.
 *
 * The mid-sentence popup calls a private runtime method on Pi's editor
 * (`requestAutocomplete`): TypeScript-legal via any-cast, but a Pi upgrade
 * may rename it — symptom is a missing popup, everything else keeps working.
 */

import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

type Skill = {
  name: string;
  description: string;
  filePath: string;
  project: boolean;
};

// ---------- discovery ----------

function* skillFiles(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* skillFiles(path);
    else if (entry.isFile() && entry.name === "SKILL.md") yield path;
  }
}

function parseSkill(filePath: string, project: boolean): Skill | undefined {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1].trim();
  if (!name) return undefined;
  const description =
    frontmatter.match(/^description:\s*(.+)$/m)?.[1].trim() ?? "";
  return { name, description, filePath, project };
}

/** All discoverable skills, first-found wins on name collisions. */
function discoverSkills(cwd: string): Map<string, Skill> {
  const roots: [string, boolean][] = [
    [join(homedir(), ".pi", "agent", "skills"), false],
    [join(homedir(), ".agents", "skills"), false],
  ];
  let dir = cwd;
  let prev = "";
  while (dir !== prev) {
    prev = dir;
    roots.push(
      [join(dir, ".pi", "skills"), true],
      [join(dir, ".agents", "skills"), true],
    );
    if (existsSync(join(dir, ".git"))) break;
    dir = dirname(dir);
  }
  const byName = new Map<string, Skill>();
  for (const [root, project] of roots) {
    for (const file of skillFiles(root)) {
      const skill = parseSkill(file, project);
      if (skill && !byName.has(skill.name)) byName.set(skill.name, skill);
    }
  }
  return byName;
}

/** Name -> SKILL.md path from the session's available-skills catalog. */
function catalogFromPrompt(systemPrompt: string): Map<string, string> {
  const catalog = new Map<string, string>();
  const entry = /<skill>\s*<name>([^<]*)<\/name>[\s\S]*?<location>([^<]*)<\/location>\s*<\/skill>/g;
  const unescape = (v: string) =>
    v
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  for (const [, name, location] of systemPrompt.matchAll(entry))
    catalog.set(unescape(name), unescape(location));
  return catalog;
}

// ---------- expansion ----------

/** The block Pi's own /skill:name expansion produces. */
function skillBlock(name: string, filePath: string): string {
  const raw = readFileSync(filePath, "utf-8");
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  return `<skill name="${name}" location="${filePath}">\nReferences are relative to ${dirname(filePath)}.\n\n${body}\n</skill>`;
}

// ---------- patterns ----------

const FULL_TAG = /<skill\s+name=["']([^"']+)["'][^>]*>[\s\S]*?<\/skill>/g;
const SELF_TAG = /<skill\s+name=["']([^"']+)["'][^>]*\/>/g;
/** A `/name` token: line-start or whitespace before, no path continuation. */
const TOKEN = /(^|\s)\/([a-z0-9][a-z0-9-]*)(?![a-z0-9-])(?!\/)/g;
/** The same token, still being typed, anywhere in the current line. */
const TOKEN_IN_PROGRESS = /(?:^|\s)\/([A-Za-z0-9][A-Za-z0-9-]*)?$/;

// ---------- mid-sentence popup: editor + autocomplete ----------

class SkillMenuEditor extends CustomEditor {
  handleInput(data: string): void {
    // Before the built-in handling: Enter in a mid-text "/" menu must insert
    // the skill, not insert-and-submit (pi assumes start-of-line commands).
    try {
      const self = this as any;
      if (
        data === "\r" &&
        self.autocompleteState &&
        self.autocompleteList &&
        typeof self.autocompleteList.getSelectedItem === "function" &&
        typeof self.autocompleteProvider?.applyCompletion === "function"
      ) {
        const { lines = [], cursorLine = 0, cursorCol = 0 } = self.state ?? {};
        const before = (lines[cursorLine] ?? "").slice(0, cursorCol);
        const prefix = self.autocompletePrefix ?? "";
        const token = before.match(TOKEN_IN_PROGRESS);
        const head = token
          ? before.slice(0, before.length - token[0].length).trim()
          : "";
        if (head && prefix.startsWith("/")) {
          const selected = self.autocompleteList.getSelectedItem();
          if (selected) {
            self.pushUndoSnapshot?.();
            const result = self.autocompleteProvider.applyCompletion(
              lines,
              cursorLine,
              cursorCol,
              selected,
              prefix,
            );
            self.state.lines = result.lines;
            self.state.cursorLine = result.cursorLine;
            self.setCursorCol(result.cursorCol);
            self.cancelAutocomplete?.();
            self.onChange?.(self.getText());
            self.tui?.requestRender?.();
            return; // swallow Enter: no mid-sentence submit
          }
        }
      }
    } catch {
      // Fall through to default Enter handling.
    }
    super.handleInput(data);
    try {
      const self = this as any;
      if (typeof self.requestAutocomplete !== "function") return;
      const { lines = [], cursorLine = 0, cursorCol = 0 } = self.state ?? {};
      const before = (lines[cursorLine] ?? "").slice(0, cursorCol);
      const token = before.match(TOKEN_IN_PROGRESS);
      const head = token
        ? before.slice(0, before.length - token[0].length).trim()
        : "";
      if (token && head) {
        // Only refresh on input that changes the token (single printable
        // char, backspace). Every refresh snaps the selection back to the
        // best match, so navigation keys must not refresh.
        if (data.length === 1 && data !== "\r" && data !== "\x1b") {
          self.requestAutocomplete({ force: false, explicitTab: false });
        }
        return;
      }
      // A mid-text skill menu whose token went away (space, dot, slash):
      // close it instead of leaving a stale popup.
      if (
        self.autocompleteState &&
        (self.autocompletePrefix ?? "").startsWith("/")
      ) {
        const messageBefore = lines.slice(0, cursorLine).some((l: string) => l.trim());
        if (messageBefore || before.trim()) self.cancelAutocomplete?.();
      }
    } catch {
      // Pi upgrade renamed internals: popup stops, nothing else breaks.
    }
  }
}

function makeProvider(current: any, skills: Map<string, Skill>): any {
  return {
    triggerCharacters: current.triggerCharacters,
    async getSuggestions(
      lines: string[],
      cursorLine: number,
      cursorCol: number,
      options: any,
    ) {
      // Mid-text "/token": skills win over the built-in path completion,
      // which otherwise claims any trailing "/" as a file path.
      const before = (lines[cursorLine] ?? "").slice(0, cursorCol);
      const token = before.match(TOKEN_IN_PROGRESS);
      const head = token
        ? before.slice(0, before.length - token[0].length).trim()
        : "";
      if (token && head) {
        const partial = (token[1] ?? "").toLowerCase();
        const items = [...skills.values()]
          .filter((s) => s.name.startsWith(partial))
          .map((s) => ({
            value: s.name,
            label: s.name,
            description: s.description || undefined,
          }))
          .slice(0, 20);
        if (items.length) return { items, prefix: "/" + partial };
        // No skill matches: fall through for path completion.
      }
      return current.getSuggestions(lines, cursorLine, cursorCol, options);
    },
    applyCompletion(
      lines: string[],
      cursorLine: number,
      cursorCol: number,
      item: any,
      prefix: string,
    ) {
      const line = lines[cursorLine] ?? "";
      const before = line.slice(0, cursorCol);
      const token = before.match(TOKEN_IN_PROGRESS);
      const head = token ? before.slice(0, before.length - token[0].length).trim() : "";
      if (head && typeof item.value === "string" && skills.has(item.value)) {
        const start = cursorCol - prefix.length;
        const newLines = [...lines];
        newLines[cursorLine] =
          line.slice(0, start) + "/" + item.value + " " + line.slice(cursorCol);
        return { lines: newLines, cursorLine, cursorCol: start + item.value.length + 2 };
      }
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },
  };
}

// ---------- extension ----------

export default function (pi: any) {
  const skills = discoverSkills(process.cwd());

  // `/name args` commands for every skill (start-of-message + menu listing).
  for (const skill of skills.values()) {
    try {
      pi.registerCommand(skill.name, {
        description: skill.description || `Invoke the ${skill.name} skill`,
        handler: async (args: string, ctx: any) => {
          if (skill.project && !ctx.isProjectTrusted()) {
            ctx.ui.notify(
              `"${skill.name}" is a project skill; trust this project first.`,
              "error",
            );
            return;
          }
          const block = skillBlock(skill.name, skill.filePath);
          const text = args?.trim() ? `${block}\n\n${args}` : block;
          // Defer: prompt() is still unwinding while this handler runs.
          setTimeout(() => {
            try {
              void pi.sendUserMessage(text, {
                deliverAs: "followUp",
                expandPromptTemplates: false,
              });
            } catch {
              // Session replaced or shut down between dispatch and send.
            }
          }, 0);
        },
      });
    } catch {
      // Collides with a built-in or extension command: skip.
    }
  }

  // Mid-sentence "/" popup: editor + autocomplete provider.
  pi.on("session_start", (event: any, ctx: any) => {
    if (event.reason !== "startup" && event.reason !== "reload") return;
    try {
      // One-time hint: Pi's built-in /skill:* listing doubles the menu.
      if (ctx.hasUI && pi.getSettings?.()?.enableSkillCommands !== false) {
        ctx.ui.notify(
          "pi-skills-anywhere: skills are also listed as /skill:*. Set \"enableSkillCommands\": false in ~/.pi/agent/settings.json to dedupe the menu.",
          "info",
        );
      }
      const ui = ctx.ui as any;
      if (ctx.hasUI && !ui.__skillProviderStacked) {
        ui.__skillProviderStacked = true;
        ctx.ui.addAutocompleteProvider((current: any) => makeProvider(current, skills));
      }
      if (ctx.mode === "tui") ctx.ui.setEditorComponent((tui: any, theme: any, keybindings: any) => new SkillMenuEditor(tui, theme, keybindings));
    } catch {
      // Non-interactive or headless: no popup, commands still work.
    }
  });

  // Expansion on send: bare /name tokens, then <skill> tags.
  pi.on("input", (event: any, ctx: any) => {
    const text: string = event.text ?? "";
    if (!text.includes("<skill") && !text.includes("/")) return;

    const catalog = catalogFromPrompt(ctx.getSystemPrompt());
    const resolve = (name: string): Skill | undefined => {
      const own = skills.get(name);
      if (own && !(own.project && !ctx.isProjectTrusted())) return own;
      const filePath = catalog.get(name);
      return filePath ? { name, description: "", filePath, project: false } : undefined;
    };

    const expand = (name: string): string | undefined => {
      const skill = resolve(name);
      try {
        return skill ? skillBlock(skill.name, skill.filePath) : undefined;
      } catch {
        return undefined;
      }
    };

    let out = text.replace(TOKEN, (whole, lead: string, name: string) => {
      const block = expand(name);
      return block ? lead + block : whole;
    });
    out = out
      .replace(FULL_TAG, (whole, name) => expand(name) ?? whole)
      .replace(SELF_TAG, (whole, name) => expand(name) ?? whole);
    if (out === text) return;
    return { action: "transform", text: out };
  });
}
