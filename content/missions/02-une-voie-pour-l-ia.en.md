---
title: A lane for the AI
duration: 12
repos: [local]
unlocks: [branch, switch, diff]
---

> duo: You want an AI assistant to suggest a new version of the summary. If it writes straight on main, you lose the reference version. Let's give it its own lane.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@work intro.md
git commit -m "intro"
```

## Steps

### 1. Open a lane for the AI
command: git branch ia/resume
A branch is a parallel lane. It starts from the commit you are on.
after: A new lane ia/resume starts from the last commit. Your folder is still on main.

### 2. Move onto that lane
command: git switch ia/resume
accepts: git checkout ia/resume
Your folder now follows the AI's lane. Whatever you save will go on this lane.
after: HEAD moved to ia/resume. The thread from your folder now points to the new lane.

### 3. Let the AI work
command: (“Make the AI work” button)
check: commits ia/resume since main = 1
The AI changes the summary, then saves its work.
after: A dot marked AI appeared on ia/resume. main did not move.

### 4. See what the AI changed
command: git diff main ia/resume
opens: diff
diff-mode: branches
The diff compares two lanes: in red what was removed, in green what was added. Nothing is changed.
after: You see exactly which lines the AI rewrote.

### 5. Go back to the reference version
command: git switch main
The AI's work stays on its lane, ready to be reviewed or merged later.
after: Your folder is back on main: the summary is in its original version there.

## End
summary: The AI can suggest changes without breaking anything: its lane is separate from yours.
takeaway: One branch per topic or per assistant. diff to see before you accept.
next: mission 03-deux-assistants
