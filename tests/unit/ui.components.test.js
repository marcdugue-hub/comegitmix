// Pure parts of the UI components (no DOM): history, completion, option filtering, placement, rebase plan.
import test from "node:test";
import assert from "node:assert/strict";
import { createHistory, completeWith, cleanSuggestions, MAX_SUGGESTIONS } from "../../src/ui/terminal.js";
import { filterOptions } from "../../src/ui/pickers.js";
import { computePosition, moveIndex, toastTimeout } from "../../src/ui/popovers.js";
import { initialRows, moveRow, setAction, validateRows, buildPlan, resultingCount } from "../../src/ui/rebase-editor.js";
import { apply } from "../../src/engine/apply.js";
import { runSetup } from "../../src/engine/setup.js";

test("history: previous / next and the draft", () => {
  const h = createHistory();
  h.push("git status");
  h.push("git add a");
  h.push("git add a"); // consecutive duplicate ignored
  h.push("   ");
  assert.deepEqual(h.items(), ["git status", "git add a"]);
  assert.equal(h.prev("git co"), "git add a");
  assert.equal(h.prev(""), "git status");
  assert.equal(h.prev(""), "git status"); // stays on the oldest
  assert.equal(h.next(""), "git add a");
  assert.equal(h.next(""), "git co"); // back to the draft
  assert.equal(h.next("x"), "x");
});

test("history: empty and limit", () => {
  const h = createHistory(2);
  assert.equal(h.prev("abc"), "abc");
  h.push("a");
  h.push("b");
  h.push("c");
  assert.deepEqual(h.items(), ["b", "c"]);
});

test("completion and suggestion cleaning", () => {
  assert.equal(completeWith("git sta", ["git status", "git stash"]), "git status");
  assert.equal(completeWith("zzz", []), "zzz");
  const many = Array.from({ length: 20 }, (_, i) => `c${i}`);
  assert.equal(cleanSuggestions([...many, "c1", "", 3]).length, MAX_SUGGESTIONS);
  assert.deepEqual(cleanSuggestions(["a", "a", " ", "b"]), ["a", "b"]);
  assert.deepEqual(cleanSuggestions(null), []);
});

test("option filtering ignores case and accents, matches label, hint and value", () => {
  const options = [
    { value: "ia/résumé", label: "ia/résumé", hint: "2 commits" },
    { value: "main", label: "main" },
    { value: "plan.md", label: "plan.md", hint: "modifié" },
  ];
  assert.equal(filterOptions(options, "").length, 3);
  assert.deepEqual(filterOptions(options, "RESUME").map((o) => o.value), ["ia/résumé"]);
  assert.deepEqual(filterOptions(options, "modifie").map((o) => o.value), ["plan.md"]);
  assert.deepEqual(filterOptions(options, "ia commits").map((o) => o.value), ["ia/résumé"]);
  assert.deepEqual(filterOptions(options, "zzz"), []);
});

test("moveIndex wraps and handles Home/End", () => {
  assert.equal(moveIndex(-1, 3, "ArrowDown"), 0);
  assert.equal(moveIndex(2, 3, "ArrowDown"), 0);
  assert.equal(moveIndex(0, 3, "ArrowUp"), 2);
  assert.equal(moveIndex(1, 3, "Home"), 0);
  assert.equal(moveIndex(1, 3, "End"), 2);
  assert.equal(moveIndex(1, 3, "x"), 1);
  assert.equal(moveIndex(0, 0, "ArrowDown"), -1);
});

test("computePosition: below, flipped above, clamped", () => {
  const vp = { width: 1000, height: 800 };
  const size = { width: 200, height: 100 };
  const below = computePosition({ left: 100, top: 100, right: 150, bottom: 120 }, size, vp);
  assert.equal(below.placement, "below");
  assert.equal(below.top, 126);
  const above = computePosition({ left: 100, top: 700, right: 150, bottom: 720 }, size, vp);
  assert.equal(above.placement, "above");
  assert.equal(above.top, 700 - 6 - 100);
  const clamped = computePosition({ left: 950, top: 100, right: 990, bottom: 120 }, size, vp);
  assert.equal(clamped.left, 1000 - 200 - 8);
  assert.ok(toastTimeout("error") > toastTimeout("info"));
});

const commits = [
  { id: "c1", message: "wip 1", author: "ai" },
  { id: "c2", message: "wip 2", author: "ai" },
  { id: "c3", message: "wip 3", author: "human" },
];

test("rebase rows: move, set action, validate", () => {
  let rows = initialRows(commits);
  assert.deepEqual(rows.map((r) => r.action), ["pick", "pick", "pick"]);
  assert.equal(moveRow(rows, 0, -1), rows);
  rows = moveRow(rows, 0, 1);
  assert.deepEqual(rows.map((r) => r.id), ["c2", "c1", "c3"]);
  assert.equal(setAction(rows, 0, "bogus"), rows);
  assert.equal(validateRows(rows).ok, true);
  assert.equal(validateRows(setAction(rows, 0, "squash")).key, "rebase.errorSquashFirst");
  // a dropped first row does not make the next squash valid
  const dropFirst = setAction(setAction(rows, 0, "drop"), 1, "squash");
  assert.equal(validateRows(dropFirst).key, "rebase.errorSquashFirst");
  let all = rows;
  for (let i = 0; i < 3; i++) all = setAction(all, i, "drop");
  assert.equal(validateRows(all).key, "rebase.errorAllDropped");
  const empty = setAction(rows.map((r, i) => (i === 0 ? { ...r, msg: "  " } : r)), 0, "reword");
  assert.equal(validateRows(empty).key, "rebase.errorEmptyMessage");
});

test("rebase plan has the engine shape and the engine accepts it", () => {
  let rows = initialRows(commits);
  rows = setAction(rows, 1, "squash");
  rows = setAction(rows, 2, "reword");
  rows = rows.map((r) => (r.id === "c3" ? { ...r, msg: " final text " } : r));
  assert.equal(resultingCount(rows), 2);
  const plan = buildPlan(rows);
  assert.deepEqual(plan, [{ id: "c1", action: "pick" }, { id: "c2", action: "squash" }, { id: "c3", action: "reword", msg: "final text" }]);

  const s = runSetup(`@files plan.md
git commit -m "init"
@work plan.md
git commit -m "a"
@work plan.md
git commit -m "b"
@work plan.md
git commit -m "c"`).state;
  const chain = Object.values(s.commits).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const ids = chain.slice(-3).map((c) => c.id);
  const enginePlan = buildPlan(setAction(setAction(initialRows(ids.map((id) => ({ id, message: id, author: "human" }))), 1, "squash"), 2, "drop"));
  const res = apply(s, { name: "rebase", args: ["HEAD~3"], options: { i: true, plan: enginePlan } });
  assert.equal(res.error, null, JSON.stringify(res.error));
});

test("home: comparison screens are not counted as missions", async () => {
  const { realMissionNumbers } = await import("../../src/ui/home.js");
  const ids = ["01-a", "06-b", "06b-compare", "07-c"];
  const r = realMissionNumbers(ids, (id) => id === "06b-compare");
  assert.equal(r.total, 3);
  assert.deepEqual(r.numbers, { "01-a": 1, "06-b": 2, "07-c": 3 });
});

test("scene tools: More details lines keep their scene mapping as escaped JSON", async () => {
  const { detailsItemsHtml, detailLines } = await import("../../src/ui/scene-tools.js");
  const html = detailsItemsHtml([{ text: "a <b>", hl: { files: [{ desk: "w1", path: "x\"y" }] } }, { text: "plain" }]);
  assert.match(html, /<li class="mono is-mapped" data-hl="\{&quot;files&quot;/);
  assert.match(html, /a &lt;b&gt;/);
  assert.match(html, /<li class="mono">plain<\/li>/);
  assert.deepEqual(detailLines(null), []);
  assert.deepEqual(detailLines({ output: null }), []);
});
