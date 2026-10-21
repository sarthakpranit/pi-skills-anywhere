// Hermetic suite: fixture skills via PI_SKILLS_ANYWHERE_ROOTS, no real
// user/project skill directories. Run with `bun test/run.ts` after
// `bun install`.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "psa-skills-"));
for (const [name, extra] of [
  ["alpha", ""],
  ["hideme", "disable-model-invocation: true"],
  ["beta", ""],
] as const) {
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} skill for tests.\n${extra}\n---\n\nYou are the ${name} skill. Reply in ${name} mode.\n`,
  );
}
process.env.PI_SKILLS_ANYWHERE_ROOTS = root;

const registered: { name: string; opts: any }[] = [];
const handlers: Record<string, any> = {};
const sent: any[] = [];
const pi: any = {
  registerCommand: (name: string, opts: any) => registered.push({ name, opts }),
  on: (ev: string, fn: any) => (handlers[ev] = fn),
  sendUserMessage: async (text: string, opts: any) => sent.push({ text, opts }),
};
const mod = await import("../src/skill-tags.ts");
mod.default(pi);

const input = handlers["input"];
const ctx = {
  getSystemPrompt: () => "<available_skills></available_skills>",
  cwd: "/tmp",
  isProjectTrusted: () => false,
};
const run = (t: string) => input({ type: "input", text: t, source: "interactive" }, ctx);
const block = (name: string) =>
  run(`hey /${name} please`)?.text?.includes(`name="${name}"`);

let failures = 0;
const check = (label: string, ok: boolean) => {
  console.log(`${label}: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) failures++;
};

check("commands registered", registered.length === 3 && registered.every((r) => r.opts.description));
check("mid-text token expansion", block("alpha") === true);
check("hidden skill expansion", block("hideme") === true);
check("tag expansion", run(`see <skill name="alpha"></skill> now`)?.text?.includes('name="alpha"') === true);
check(
  "guards: urls and paths untouched",
  run("check https://x.com/alpha and /alpha/file") === undefined,
);
check("passthrough untouched", run("plain text no slash") === undefined);

const alpha = registered.find((r) => r.name === "alpha");
await alpha.opts.handler("say hi", { isProjectTrusted: () => false, ui: { notify: () => {} } });
await new Promise((r) => setTimeout(r, 20));
check(
  "command dispatch sends block + args",
  sent.length === 1 &&
    sent[0].text.includes('name="alpha"') &&
    sent[0].text.includes("say hi") &&
    sent[0].opts.expandPromptTemplates === false,
);

if (failures) {
  console.error(`${failures} failing`);
  process.exit(1);
}