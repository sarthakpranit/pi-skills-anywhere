import ext from "../src/skill-tags.ts";
let registerCommand: any, on: any, pi: any;
pi = {
  registerCommand: (name: string, opts: any) => { registered.push({ name, opts }); },
  on: (ev: string, fn: any) => { handlers[ev] = fn; },
  sendUserMessage: async (text: string, opts: any) => { sent.push({ text, opts }); },
};
const registered: any[] = [], handlers: any = {}, sent: any[] = [];
ext(pi);
console.log("commands:", registered.length, "sample:", registered.map(r => r.name).filter(n => n.includes("grill")).join(", "));

// input handler: mid-sentence bare token
const input = handlers["input"];
const ctx = {
  getSystemPrompt: () => "<available_skills></available_skills>",
  cwd: "/tmp",
  isProjectTrusted: () => false,
};
const run = (t: string) => input({ type: "input", text: t, source: "interactive" }, ctx);
let r = run("please /caveman say hi");
console.log("token:", r?.action === "transform" && r.text.includes('name="caveman"') && r.text.startsWith("please") ? "PASS" : "FAIL");
r = run("use the /grill-me skill on this decision");
console.log("hidden token:", r?.text?.includes("Call the Skill") ? "PASS" : "FAIL");
r = run("check https://x.com/grill-me and /etc/hosts");
console.log("guards:", r === undefined || (!r.text.includes('name=') && r.text.includes("/etc/hosts")) ? "PASS" : "FAIL");
r = run("plain text with no triggers");
console.log("passthrough:", r === undefined ? "PASS" : "FAIL");
r = run("mid sentence <skill name=\"caveman\"/> please");
console.log("tag:", r?.text?.includes('name="caveman"') ? "PASS" : "FAIL");
r = run("/grilling stress-test my plan");
console.log("start-token:", r?.text?.includes('name="grilling"') ? "PASS" : "FAIL"); // real start goes via command dispatch

// command handler: /grill-me args
const cmd = registered.find(x => x.name === "grill-me");
await cmd.opts.handler("about my design", { isProjectTrusted: () => false, ui: { notify: () => {} } });
await new Promise(r => setTimeout(r, 20));
console.log("command:", sent.length === 1 && sent[0].text.includes("Call the Skill") && sent[0].text.includes("about my design") && sent[0].opts.expandPromptTemplates === false ? "PASS" : "FAIL");
