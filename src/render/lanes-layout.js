// Lane layout: a pure function from an engine state to positions (docs/DESIGN.md §5).
// No DOM, no language. Coordinates are in the scene frame (1012 x 796, zone ② y 192-484).
//
// computeLayout(state, opts) -> {
//   step, spacing, r, laneWidth, folded,               // horizontal step, vertical spacing, commit radius, hidden old commits
//   lanes: [{ key, name, kind, colorIdx, color, commits, fork, empty, y, x1, tipX, xEnd, path, desks, head, dashed, ghost, mr }],
//   commits: { id: { id, x, y, r, lane, tip, ai, ghost, online, msg, msgKey, msgParams, msgMax } },
//   edges: [{ kind: 'merge' | 'pending', from, to, color, path, dashed, ghost }],
//   chips: [{ kind, label, branch, x, y, colorIdx, color, head, dashed, ghost, commit, w }],
//   tiles: [{ desk, x, w, cx, ghost }], wires: [{ desk, color, colorIdx, points, path, elbow, ghost }],
//   order: [lane keys bottom -> top], crossings
// }
// Lane kinds: branch (local), remote (origin/x without local branch, dashed), online (MR branch not fetched,
// dashed and faded), anon (commits whose branch was deleted), detached (desk on a commit no lane holds),
// ghost (goal / preview overlay, dashed sky).

export const G = Object.freeze({
  laneX0: 200, // left end of the lanes (after the label column)
  firstCommitX: 225,
  laneXMax: 990,
  sceneRight: 1004, // chips never go past this x
  chipRoom: 140, // room kept on the right for the last chips
  yBottom: 426, // main
  yTop: 270,
  yTopTight: 258,
  maxSpacing: 72,
  minStep: 36,
  maxStep: 50,
  curveMax: 90,
  chipGap: 22, // distance between the tip centre and its chip
  tileY: 606,
  tileH: 184,
  turnY: 568, // horizontal run of elbow wires, between zone ③ and the tiles
  margin: 8,
});

/** Lane colours: index 0 = main (charcoal), then the cycle orange, sky, dark sage, sage. */
export const LANE_COLORS = ['var(--voie-main)', 'var(--voie-1)', 'var(--voie-2)', 'var(--voie-3)', 'var(--voie-4)'];
export const GHOST_COLOR = 'var(--ciel)';

const range = (n) => Array.from({ length: n }, (_, i) => i);

/** Tile slots in zone ④: 3 per row from x 200 (250 wide), or 4 narrower tiles from x 20. */
export function tileSlots(n) {
  if (n <= 3) return range(n).map((i) => ({ x: 200 + i * 270, w: 250, cx: 325 + i * 270 }));
  return range(n).map((i) => ({ x: 20 + i * 246, w: 236, cx: 20 + i * 246 + 118 }));
}

/** Estimated chip width (DM Mono 13px), used to keep wires and forks clear of chips. */
export function chipWidth(label, head = false) {
  return Math.round(20 + String(label).length * 7.8 + (head ? 44 : 0));
}

/** Number part of an id ("c12" -> 12, "g:c3" -> 3); used for deterministic ordering. */
function idNum(id) {
  const m = /(\d+)$/.exec(String(id));
  return m ? Number(m[1]) : 0;
}
const byId = (a, b) => idNum(a) - idNum(b) || (a < b ? -1 : a > b ? 1 : 0);

/** Strips a remote prefix so origin/x and x share their colour. */
function colorName(name) {
  return String(name).replace(/^(origin|upstream)\//, '');
}

/**
 * Assigns a colour index to every lane name. Stable: names already in `previous` keep their colour.
 * New names take the least used colour of the cycle (first in cycle order on ties).
 * @param {string[]} names in priority order (desks first)
 * @param {Object<string, number>} [previous]
 */
export function assignColors(names, previous = {}) {
  const out = {};
  const used = [0, 0, 0, 0];
  for (const n of names) {
    const c = colorName(n);
    if (c === 'main') out[c] = 0;
    else if (previous[c] >= 1 && previous[c] <= 4 && !(c in out)) {
      out[c] = previous[c];
      used[previous[c] - 1] += 1;
    }
  }
  for (const n of names) {
    const c = colorName(n);
    if (c in out) continue;
    let best = 0;
    for (let i = 1; i < 4; i++) if (used[i] < used[best]) best = i;
    out[c] = best + 1;
    used[best] += 1;
  }
  return out;
}

/** x of the fork / merge curve (cubic, horizontal tangents) at height y. */
export function curveXAt(x0, y0, x1, y1, y) {
  if (y1 === y0) return x0;
  const f = (y - y0) / (y1 - y0);
  if (f <= 0) return x0;
  if (f >= 1) return x1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const t = (lo + hi) / 2;
    if (3 * t * t - 2 * t * t * t < f) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return x0 + (x1 - x0) * (1.5 * t * (1 - t) + t * t * t);
}

/** SVG path of a fork / merge curve. */
export function curvePath(x0, y0, x1, y1) {
  const mx = (x0 + x1) / 2;
  return `M${r1(x0)} ${r1(y0)} C${r1(mx)} ${r1(y0)} ${r1(mx)} ${r1(y1)} ${r1(x1)} ${r1(y1)}`;
}

const r1 = (v) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------------------------
// Graph: visible commits (local, online-only MR commits, ghost commits) and refs in claim order.

function sameCommit(a, b) {
  return a && b && a.msg === b.msg && a.msgKey === b.msgKey && (a.parents || []).join() === (b.parents || []).join();
}

function buildGraph(state, ghost) {
  const commits = {};
  const local = state.commits || {};
  const visit = (map, id, flags) => {
    const stack = id ? [id] : [];
    while (stack.length) {
      const c = stack.pop();
      if (commits[c] || !map[c]) continue;
      commits[c] = { ...map[c], ...flags };
      for (const p of map[c].parents || []) stack.push(p);
    }
  };
  const refs = [];
  const branches = state.branches || {};
  const desks = state.worktrees || [];
  const mainName = branches.main ? 'main' : (desks.find((w) => w.main) || {}).branch || Object.keys(branches)[0] || 'main';

  // local branches: main first, then desk branches (tile order), then the others (creation order)
  const names = Object.keys(branches);
  const deskBranches = desks.map((w) => w.branch).filter((b) => b && branches[b]);
  const ordered = [mainName, ...names.filter((n) => n !== mainName)];
  for (const n of ordered) {
    if (branches[n]) refs.push({ key: `b:${n}`, name: n, kind: 'branch', tip: branches[n].tip || null });
    else if (n === mainName && !state.noGit && desks.some((w) => w.branch === n)) refs.push({ key: `b:${n}`, name: n, kind: 'branch', tip: null });
  }
  // unborn desk branches (no commit yet); before git init (state.noGit) there is no lane at all
  for (const w of desks) {
    if (state.noGit) break;
    if (w.branch && !branches[w.branch] && !refs.some((r) => r.name === w.branch)) refs.push({ key: `b:${w.branch}`, name: w.branch, kind: 'branch', tip: null });
  }
  for (const r of refs) visit(local, r.tip, {});
  for (const w of desks) {
    visit(local, w.head, {});
    if (w.op && w.op.theirs) visit(local, w.op.theirs, {});
  }
  // remote-tracking refs
  const remoteRefs = state.remoteRefs || {};
  for (const name of Object.keys(remoteRefs).sort()) {
    const tip = remoteRefs[name].tip;
    visit(local, tip, {});
    const short = name.replace(/^[^/]+\//, '');
    refs.push({ key: `r:${name}`, name, kind: branches[short] ? 'remote-chip' : 'remote', tip });
  }
  // MR branches known only online (not fetched yet)
  for (const rname of Object.keys(state.remotes || {}).sort()) {
    const remote = state.remotes[rname];
    for (const mr of remote.mrs || []) {
      if (mr.status === 'merged' || mr.status === 'closed') continue;
      const src = remote.branches && remote.branches[mr.source];
      if (!src || branches[mr.source] || remoteRefs[`${rname}/${mr.source}`]) continue;
      visit(remote.commits || {}, src.tip, { online: !local[src.tip] });
      // commits of the online branch that are not local
      for (const id of Object.keys(commits)) if (!local[id] && commits[id].online === undefined) commits[id].online = true;
      refs.push({ key: `o:${rname}/${mr.source}`, name: mr.source, kind: 'online', tip: src.tip, mr: mr.id, remote: rname });
    }
  }
  // ghost (goal or preview)
  const ghostDesks = [];
  if (ghost) {
    const map = {};
    const gc = ghost.commits || {};
    const rename = (id) => (id && gc[id] && !(local[id] && sameCommit(local[id], gc[id])) ? `g:${id}` : id);
    for (const [id, c] of Object.entries(gc)) {
      const nid = rename(id);
      if (nid !== id) map[nid] = { ...c, id: nid, parents: (c.parents || []).map(rename), ghost: true };
    }
    const gb = ghost.branches || {};
    for (const n of Object.keys(gb)) {
      const tip = rename(gb[n].tip);
      visit({ ...local, ...map }, tip, {});
      for (const id of Object.keys(commits)) if (map[id] && !commits[id].ghost) commits[id].ghost = true;
      const cur = branches[n];
      if (cur && cur.tip === tip) continue;
      refs.push({ key: `g:${n}`, name: n, kind: cur ? 'ghost-chip' : 'ghost', tip, ghost: true });
    }
    for (const w of ghost.worktrees || []) {
      if (!desks.some((d) => d.path === w.path)) ghostDesks.push({ ...w, head: rename(w.head), ghost: true });
    }
  }
  return { commits, refs, mainName, ghostDesks, deskBranches };
}

// ---------------------------------------------------------------------------------------------

function generations(commits) {
  const gen = {};
  const ids = Object.keys(commits).sort(byId);
  const calc = (id) => {
    if (gen[id] !== undefined) return gen[id];
    gen[id] = 0; // guards against malformed cycles
    let g = 0;
    for (const p of commits[id].parents || []) if (commits[p]) g = Math.max(g, calc(p) + 1);
    gen[id] = g;
    return g;
  };
  for (const id of ids) calc(id);
  return gen;
}

/** Lexicographic permutations of [0..n-1]. */
function* permutations(n) {
  const a = range(n);
  yield a.slice();
  while (true) {
    let i = n - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;
    if (i < 0) return;
    let j = n - 1;
    while (a[j] <= a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
    for (let l = i + 1, r = n - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
    yield a.slice();
  }
}

/**
 * Computes the layout.
 * @param {object} state engine state
 * @param {{ ghost?: object, colors?: Object<string,number>, orderHint?: string[] }} [opts]
 */
export function computeLayout(state, opts = {}) {
  const { ghost = null, colors: prevColors = {}, orderHint = null } = opts;
  const g = buildGraph(state, ghost);
  const { commits } = g;
  const desks = state.worktrees || [];
  const gen = generations(commits);
  const maxGen = Object.values(gen).reduce((m, v) => Math.max(m, v), -1);

  // horizontal scale and folding of the oldest generations
  const width = G.laneXMax - G.chipRoom - G.firstCommitX;
  const maxCols = Math.floor(width / G.minStep) + 1;
  const folded = Math.max(0, maxGen + 1 - maxCols);
  const visibleGens = maxGen + 1 - folded;
  const step = Math.max(G.minStep, Math.min(G.maxStep, visibleGens > 1 ? width / (visibleGens - 1) : G.maxStep));
  const hidden = (id) => gen[id] < folded;
  const foldedCount = Object.keys(commits).filter(hidden).length;

  // children (for the leaf test)
  const children = {};
  for (const c of Object.values(commits)) for (const p of c.parents || []) (children[p] = children[p] || []).push(c.id);

  // claim commits: each lane takes the first-parent chain of its tip until a claimed commit
  const owner = {};
  const lanes = [];
  const chipRefs = [];
  const claim = (ref) => {
    const chain = [];
    let c = ref.tip;
    while (c && commits[c] && !owner[c] && !hidden(c)) {
      chain.push(c);
      const ps = commits[c].parents || [];
      c = ps[0] || null;
    }
    const fork = c && commits[c] && !hidden(c) ? c : null;
    const lane = { ...ref, commits: chain.reverse(), fork, foldedStart: !!(c && commits[c] && hidden(c)) };
    lane.empty = lane.commits.length === 0;
    for (const id of lane.commits) owner[id] = lane.key;
    return lane;
  };
  for (const ref of g.refs) {
    if (ref.kind === 'remote-chip' || ref.kind === 'ghost-chip') {
      chipRefs.push(ref);
      continue;
    }
    if (ref.kind === 'remote' && ref.tip && owner[ref.tip]) {
      chipRefs.push(ref);
      continue;
    }
    if (ref.kind === 'online' && ref.tip && owner[ref.tip]) {
      chipRefs.push(ref);
      continue;
    }
    if (ref.tip && hidden(ref.tip)) continue;
    lanes.push(claim(ref));
  }
  // unclaimed commits (deleted merged branches, detached heads): anonymous lanes
  const rest = Object.keys(commits).filter((id) => !owner[id] && !hidden(id)).sort((a, b) => gen[b] - gen[a] || byId(b, a));
  let anon = 0;
  for (const id of rest) {
    if (owner[id]) continue;
    const isHead = desks.some((w) => w.head === id && !w.branch);
    anon += 1;
    lanes.push(claim({ key: `a:${anon}`, name: '', kind: isHead ? 'detached' : 'anon', tip: id, ghost: !!commits[id].ghost }));
  }

  // colours: desk branches first, then the others in lane order
  const colorNames = [g.mainName, ...g.deskBranches, ...lanes.map((l) => l.name).filter(Boolean)];
  const colors = assignColors(colorNames, prevColors);
  let anonColor = 0;
  for (const l of lanes) {
    if (l.ghost) {
      l.colorIdx = l.name ? colors[colorName(l.name)] : 2;
      l.color = GHOST_COLOR;
    } else if (l.name) {
      l.colorIdx = colors[colorName(l.name)];
      l.color = LANE_COLORS[l.colorIdx];
    } else {
      // anonymous lanes cycle backwards so they rarely share a colour with a named lane
      l.colorIdx = 4 - (anonColor++ % 4);
      l.color = LANE_COLORS[l.colorIdx];
    }
    l.dashed = l.kind === 'remote' || l.kind === 'online' || !!l.ghost;
    l.faded = l.kind === 'online';
  }
  const laneByKey = Object.fromEntries(lanes.map((l) => [l.key, l]));
  const laneOfBranch = (name) => lanes.find((l) => l.kind === 'branch' && l.name === name) || null;

  // x positions by generation
  const x = {};
  for (const id of Object.keys(commits)) if (!hidden(id)) x[id] = G.firstCommitX + (gen[id] - folded) * step;
  for (const l of lanes) {
    l.vx = l.empty ? (l.fork ? x[l.fork] + step : G.firstCommitX) : null;
  }

  // desks: tile slots and pins (the tip of a desk lane goes above the centre of its tile)
  const allDesks = [...desks.map((w) => ({ ...w, ghost: false })), ...g.ghostDesks];
  const slots = tileSlots(allDesks.length);
  // a goal desk may share its id with a real desk (ids are per state): key ghosts by path
  const tiles = allDesks.map((w, i) => ({ desk: w.ghost ? `ghost:${w.path}` : w.id, path: w.path, x: slots[i].x, w: slots[i].w, cx: slots[i].cx, ghost: !!w.ghost }));
  const deskLane = (w) => {
    if (w.branch) {
      const l = w.ghost
        ? lanes.find((k) => k.name === w.branch && (k.kind === 'ghost' || k.kind === 'branch'))
        : laneOfBranch(w.branch);
      if (l && (l.empty ? (l.fork === w.head || !w.head || l.tip === w.head) : l.commits[l.commits.length - 1] === w.head || w.op)) return l;
    }
    return null;
  };
  const isLeaf = (l) => l.commits.every((id) => (children[id] || []).every((c) => owner[c] === l.key));
  const pinned = new Set();
  allDesks.forEach((w, i) => {
    const l = deskLane(w);
    if (!l || pinned.has(l.key)) return;
    const pin = slots[i].cx;
    pinned.add(l.key);
    if (l.empty) {
      const xf = l.fork ? x[l.fork] : G.firstCommitX - step;
      if (pin >= xf + G.minStep * 0.75) l.vx = pin;
      return;
    }
    if (!isLeaf(l)) return;
    const n = l.commits.length;
    const xf = l.fork ? x[l.fork] : G.firstCommitX - step;
    if (pin < xf + n * G.minStep) return;
    l.commits.forEach((id, k) => {
      x[id] = xf + ((pin - xf) * (k + 1)) / n;
    });
  });

  // lane extents (x only; y comes with the order)
  // sibling lanes (same fork commit) share the shortest curve, so outer lanes are never less steep
  const firstX = (l) => (l.empty ? l.vx : x[l.commits[0]]);
  const siblingRun = {};
  for (const l of lanes) {
    if (!l.fork) continue;
    const run = Math.max(0, Math.min(firstX(l) - x[l.fork], G.curveMax));
    siblingRun[l.fork] = Math.min(siblingRun[l.fork] ?? Infinity, run);
  }
  for (const l of lanes) {
    l.tipX = l.empty ? l.vx : x[l.commits[l.commits.length - 1]];
    const xFirst = firstX(l);
    if (l.fork) {
      l.forkX = x[l.fork];
      l.curveEnd = l.forkX + Math.min(siblingRun[l.fork], Math.max(0, xFirst - l.forkX));
      l.x1 = l.curveEnd;
    } else {
      l.forkX = null;
      l.x1 = l.foldedStart || l.key === `b:${g.mainName}` ? G.laneX0 : xFirst - 25;
      l.curveEnd = l.x1;
    }
  }

  // chips: one per named lane at its tip, then the chip-only refs (remote-tracking, detached HEAD, goal)
  const heads = new Set(desks.filter((w) => w.branch).map((w) => w.branch));
  const chips = [];
  const tipChipEnd = {}; // commit id or lane key -> x where the next chip goes
  const chipLabel = (ref) => ref.name;
  for (const l of lanes) {
    if (!l.name && l.kind !== 'detached') continue;
    const label = l.kind === 'detached' ? 'HEAD' : chipLabel(l);
    const head = l.kind === 'branch' && heads.has(l.name);
    const w = l.kind === 'online' ? chipWidth(String(l.mr)) + 150 : chipWidth(label, head) + (l.ghost ? 140 : 0);
    chips.push({
      kind: l.kind === 'branch' ? 'branch' : l.kind, label, branch: l.name, lane: l.key, x: l.tipX + G.chipGap, w,
      colorIdx: l.colorIdx, color: l.color, head, dashed: l.dashed, ghost: !!l.ghost, mr: l.mr || null,
      commit: l.empty ? null : l.commits[l.commits.length - 1],
    });
    const chip = chips[chips.length - 1];
    if (chip.x + w > G.sceneRight) {
      // no room on the right: the chip sits above the tip
      chip.above = 1;
      chip.x = Math.min(l.tipX - w / 2, G.sceneRight - w);
      tipChipEnd[l.key] = l.tipX + 14;
    } else tipChipEnd[l.key] = l.tipX + G.chipGap + w + 6;
  }
  const atTip = (id) => lanes.find((l) => !l.empty && l.commits[l.commits.length - 1] === id) || null;
  const pendingAbove = {};
  const placeOnCommit = (id, chip) => {
    const l = atTip(id);
    if (l) {
      chip.x = tipChipEnd[l.key] || l.tipX + G.chipGap;
      chip.lane = l.key;
      tipChipEnd[l.key] = chip.x + chip.w + 6;
    } else {
      chip.lane = owner[id] || null;
      chip.above = (pendingAbove[id] = (pendingAbove[id] || 0) + 1);
      chip.x = x[id] - chip.w / 2;
    }
    chip.commit = id;
    chips.push(chip);
  };
  for (const ref of chipRefs) {
    if (!ref.tip || !commits[ref.tip] || hidden(ref.tip)) continue;
    const label = ref.name;
    placeOnCommit(ref.tip, {
      kind: ref.kind === 'ghost-chip' ? 'ghost' : ref.kind === 'online' ? 'online' : 'remote', label, branch: ref.name,
      w: chipWidth(label), colorIdx: ref.ghost ? 2 : (colors[colorName(ref.name)] ?? 0), color: ref.ghost ? GHOST_COLOR : LANE_COLORS[colors[colorName(ref.name)] ?? 0],
      head: false, dashed: true, ghost: !!ref.ghost, mr: ref.mr || null,
    });
  }
  for (const w of desks) {
    if (w.branch || !w.head || !commits[w.head] || hidden(w.head)) continue;
    const l = laneByKey[owner[w.head]];
    if (l && l.kind === 'detached') continue; // the detached lane already has its HEAD chip
    placeOnCommit(w.head, { kind: 'detached', label: 'HEAD', branch: null, w: chipWidth('HEAD'), colorIdx: 0, color: LANE_COLORS[0], head: true, dashed: false, ghost: false });
  }
  for (const l of lanes) l.xEnd = Math.max(l.tipX + 14, tipChipEnd[l.key] || 0);

  // vertical order: main at the bottom; the rest minimises crossings (brute force up to 7 lanes)
  const mainLane = laneByKey[`b:${g.mainName}`] || lanes[0] || null;
  const movable = lanes.filter((l) => l !== mainLane);
  const hintIdx = (l) => (orderHint ? orderHint.indexOf(l.key) : -1);
  const base = movable.slice().sort((a, b) => {
    const ha = hintIdx(a);
    const hb = hintIdx(b);
    if (ha >= 0 && hb >= 0) return ha - hb;
    return a.tipX - b.tipX || lanes.indexOf(a) - lanes.indexOf(b);
  });
  const n = lanes.length;
  const tight = n >= 6;
  const yTop = tight ? G.yTopTight : G.yTop;
  const spacing = n > 1 ? Math.min(G.maxSpacing, (G.yBottom - yTop) / (n - 1)) : G.maxSpacing;
  const r = spacing >= 40 ? 12 : spacing >= 30 ? 10 : 8;

  // vertical elements: forks, merges (between two lanes) and wires (down to the bottom)
  const verticals = [];
  for (const l of lanes) {
    if (l.fork && owner[l.fork]) verticals.push({ kind: 'fork', a: owner[l.fork], b: l.key, x0: l.forkX, x1: l.curveEnd, self: l.key, w: 4 });
  }
  const mergeEdges = [];
  for (const id of Object.keys(commits)) {
    if (hidden(id) || !owner[id]) continue;
    const ps = commits[id].parents || [];
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!commits[p] || hidden(p) || !owner[p] || owner[p] === owner[id]) continue;
      mergeEdges.push({ from: p, to: id });
      verticals.push({ kind: 'merge', a: owner[p], b: owner[id], x0: x[p], x1: x[id], w: 4 });
    }
  }
  const deskSource = [];
  allDesks.forEach((w, i) => {
    const l = deskLane(w);
    let src = null;
    if (l) src = { lane: l.key, x: l.tipX };
    else if (w.head && commits[w.head] && !hidden(w.head) && owner[w.head]) src = { lane: owner[w.head], x: x[w.head] };
    deskSource.push(src);
    if (src) verticals.push({ kind: 'wire', a: src.lane, x0: src.x, x1: src.x, w: 1, cx: slots[i].cx });
  });

  const cost = (yOf) => {
    let total = 0;
    for (const v of verticals) {
      const ya = yOf[v.a];
      if (v.kind === 'wire') {
        for (const l of lanes) {
          if (l.key === v.a || yOf[l.key] <= ya) continue;
          if (v.x0 >= l.x1 - G.margin && v.x0 <= l.xEnd + G.margin) total += v.w;
        }
        continue;
      }
      const yb = yOf[v.b];
      const lo = Math.min(ya, yb);
      const hi = Math.max(ya, yb);
      for (const l of lanes) {
        const yl = yOf[l.key];
        if (yl <= lo || yl >= hi) continue;
        const cx = v.kind === 'fork' ? curveXAt(v.x0, ya, v.x1, yb, yl) : curveXAt(v.x0, ya, v.x1, yb, yl);
        if (cx >= l.x1 - G.margin + 2 && cx <= l.xEnd + G.margin) total += v.w;
      }
    }
    return total;
  };
  const yFor = (order) => {
    const yOf = {};
    order.forEach((l, i) => {
      yOf[l.key] = G.yBottom - i * spacing;
    });
    return yOf;
  };
  let best = mainLane ? [mainLane, ...base] : base;
  let bestCost = cost(yFor(best));
  if (bestCost > 0 && base.length > 1) {
    if (base.length <= 7) {
      for (const p of permutations(base.length)) {
        const order = mainLane ? [mainLane, ...p.map((i) => base[i])] : p.map((i) => base[i]);
        const c = cost(yFor(order));
        if (c < bestCost) {
          best = order;
          bestCost = c;
          if (c === 0) break;
        }
      }
    } else {
      // local search by adjacent swaps (deterministic)
      let improved = true;
      while (improved) {
        improved = false;
        for (let i = mainLane ? 1 : 0; i < best.length - 1; i++) {
          const o = best.slice();
          [o[i], o[i + 1]] = [o[i + 1], o[i]];
          const c = cost(yFor(o));
          if (c < bestCost) {
            best = o;
            bestCost = c;
            improved = true;
          }
        }
      }
    }
  }
  const yOf = yFor(best);
  for (const l of lanes) l.y = yOf[l.key];

  // commits
  const outCommits = {};
  for (const l of lanes) {
    l.commits.forEach((id, k) => {
      const c = commits[id];
      const next = l.commits[k + 1];
      const gap = next ? x[next] - x[id] : step;
      const isTip = k === l.commits.length - 1;
      outCommits[id] = {
        id, x: x[id], y: l.y, r: isTip ? r + 2 : r, lane: l.key, tip: isTip, colorIdx: l.colorIdx, color: l.color,
        ai: c.author === 'ai', ghost: !!c.ghost || !!l.ghost, online: !!c.online, dashed: l.dashed,
        msg: c.msg || '', msgKey: c.msgKey || null, msgParams: c.msgParams || null,
        msgMax: isTip ? 120 : Math.max(62, Math.min(120, gap - 4)),
      };
    });
  }
  // lane paths
  for (const l of lanes) {
    const y = l.y;
    if (l.fork) {
      const yf = yOf[owner[l.fork]];
      l.path = `${curvePath(l.forkX, yf, l.curveEnd, y)} H${r1(Math.max(l.curveEnd, l.tipX))}`;
    } else {
      l.path = `M${r1(l.x1)} ${r1(y)} H${r1(Math.max(l.x1 + 1, l.tipX))}`;
    }
    l.desks = allDesks.filter((w) => deskLane(w) === l).map((w) => (w.ghost ? `ghost:${w.path}` : w.id));
    l.head = l.kind === 'branch' && heads.has(l.name);
  }
  // edges
  const edges = mergeEdges.map((e) => {
    const a = outCommits[e.from];
    const b = outCommits[e.to];
    const src = laneByKey[a.lane];
    return { kind: 'merge', from: e.from, to: e.to, color: src.color, colorIdx: src.colorIdx, dashed: src.dashed, ghost: !!(src.ghost || b.ghost), path: curvePath(a.x, a.y, b.x, b.y) };
  });
  for (const w of desks) {
    if (!w.op || !w.op.theirs || !outCommits[w.op.theirs] || !outCommits[w.head]) continue;
    const a = outCommits[w.op.theirs];
    const b = outCommits[w.head];
    if (a.lane === b.lane) continue;
    edges.push({ kind: 'pending', from: a.id, to: b.id, color: a.color, colorIdx: a.colorIdx, dashed: true, ghost: false, path: curvePath(a.x, a.y, b.x, b.y), desk: w.id });
  }
  // chips: final y
  for (const c of chips) {
    const l = laneByKey[c.lane];
    const y = l ? l.y : G.yBottom;
    c.y = c.above ? y - r - 6 - 15 - (c.above - 1) * 26 : y;
  }

  // wires: straight when possible, else an elbow through a free column then along the turn line
  const wires = [];
  let elbows = 0;
  allDesks.forEach((w, i) => {
    const src = deskSource[i];
    if (!src) return;
    const l = laneByKey[src.lane];
    const tile = tiles[i];
    const sx = src.x;
    const sy = l.y + (l.empty ? 6 : r + 2);
    const below = lanes.filter((k) => k.y > l.y && k !== l);
    const blocked = (px, lanesBelow) => lanesBelow.some((k) => px >= k.x1 - G.margin && px <= k.xEnd + G.margin);
    let points;
    let elbow = false;
    if (Math.abs(sx - tile.cx) < 2 && !blocked(sx, below)) {
      points = [[sx, sy], [sx, G.tileY]];
    } else {
      elbow = true;
      const ty = G.turnY + (elbows % 2 ? 4 : -2);
      elbows += 1;
      if (!blocked(sx, below)) {
        points = [[sx, sy], [sx, ty], [tile.cx, ty], [tile.cx, G.tileY]];
      } else {
        const next = below.reduce((m, k) => (k.y < m ? k.y : m), Infinity);
        const yMid = l.y + (next - l.y) / 2;
        const cands = [tile.cx, sx];
        for (const k of below) cands.push(k.xEnd + G.margin + 6, k.x1 - G.margin - 6);
        const free = cands
          .filter((px) => px >= G.laneX0 - 10 && px <= 1004 && !blocked(px, below))
          .sort((a, b) => Math.abs(a - sx) - Math.abs(b - sx) || a - b)[0];
        const fx = free ?? 1004;
        points = [[sx, sy], [sx, yMid], [fx, yMid], [fx, ty], [tile.cx, ty], [tile.cx, G.tileY]];
      }
      // drop zero-length segments
      points = points.filter((p, k) => k === 0 || p[0] !== points[k - 1][0] || p[1] !== points[k - 1][1]);
    }
    wires.push({
      desk: tile.desk, color: w.ghost ? GHOST_COLOR : l.color, colorIdx: l.colorIdx, points, elbow, ghost: !!w.ghost,
      path: points.map((p, k) => `${k ? 'L' : 'M'}${r1(p[0])} ${r1(p[1])}`).join(' '),
    });
  });

  // tiles carry the colour of their lane
  tiles.forEach((tile, i) => {
    const w = allDesks[i];
    const src = deskSource[i];
    const l = src ? laneByKey[src.lane] : w.branch ? laneOfBranch(w.branch) : null;
    tile.colorIdx = w.branch ? colors[colorName(w.branch)] ?? (l ? l.colorIdx : 0) : l ? l.colorIdx : 0;
    tile.color = w.ghost ? GHOST_COLOR : LANE_COLORS[tile.colorIdx];
    tile.branch = w.branch || null;
  });

  const layout = {
    step, spacing, r, laneWidth: spacing >= 40 ? 11 : 8, folded: foldedCount, tight,
    lanes, commits: outCommits, edges, chips, tiles, wires, colors,
    order: best.map((l) => l.key), mainLane: mainLane ? mainLane.key : null,
  };
  layout.crossings = countCrossings(layout);
  return layout;
}

/**
 * Counts crossings in a finished layout: fork / merge curves and vertical wire segments that pass
 * through the horizontal extent (line, commits and chips) of a lane they do not belong to.
 */
export function countCrossings(layout) {
  const { lanes, commits, edges, wires } = layout;
  const byKey = Object.fromEntries(lanes.map((l) => [l.key, l]));
  let n = 0;
  const hits = (px, l) => px >= l.x1 - G.margin + 2 && px <= l.xEnd + G.margin;
  const curve = (x0, y0, x1, y1, skip) => {
    for (const l of lanes) {
      if (skip.includes(l.key)) continue;
      if (l.y <= Math.min(y0, y1) || l.y >= Math.max(y0, y1)) continue;
      if (hits(curveXAt(x0, y0, x1, y1, l.y), l)) n += 1;
    }
  };
  for (const l of lanes) {
    if (!l.fork || !commits[l.fork]) continue;
    const f = commits[l.fork];
    curve(f.x, f.y, l.curveEnd, l.y, [l.key, f.lane]);
  }
  for (const e of edges) {
    if (e.kind !== 'merge') continue;
    const a = commits[e.from];
    const b = commits[e.to];
    curve(a.x, a.y, b.x, b.y, [a.lane, b.lane]);
  }
  for (const w of wires) {
    for (let k = 1; k < w.points.length; k++) {
      const [x0, y0] = w.points[k - 1];
      const [x1, y1] = w.points[k];
      if (x0 !== x1) continue;
      const lo = Math.min(y0, y1);
      const hi = Math.max(y0, y1);
      for (const l of lanes) {
        if (l.y <= lo || l.y >= hi) continue;
        if (byKey[l.key] && hits(x0, l)) n += 1;
      }
    }
  }
  return n;
}
