---
title: A lane for the AI
duration: 12
repos: [local]
unlocks: [branch, switch, diff]
---

> duo: Tuesday. You ask the “summary” AI assistant for a shorter version of the summary. It is full of enthusiasm, sometimes a little too much: if it writes straight on main, your reference version is gone. Let's give it its own lane.

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
A branch is a lane running alongside main, the lane of the reference version. It starts from the commit you are on.
after: The ia/resume lane is born, level with the last commit. Your folder is still on main.

### 2. Move onto that lane
command: git switch ia/resume
accepts: git checkout ia/resume
Your folder now follows the AI's lane: whatever you save will go on this lane, not on main.
after: HEAD, the “you are here” marker, moved to ia/resume. The thread from your folder now points to the new lane.

### 3. Let the AI work
command: (“Make the AI work” button)
check: commits ia/resume since main = 1
The AI rewrites the summary, then saves its work. You can finish your coffee.
after: A dot marked AI appeared on ia/resume. main did not move an inch.

### 4. See what the AI changed
command: git diff main ia/resume
opens: diff
diff-mode: branches
The diff compares two lanes line by line: a − sign for what was removed, a + sign for what was added. You look, you touch nothing.
after: You see exactly which lines the AI rewrote. Shorter, yes. Better? That's your call.

### 5. Go back to the reference version
command: git switch main
The AI's work stays safe on its lane, ready to be reviewed or merged later.
after: Your folder is back on main: the summary is in its original version there. Both versions exist without stepping on each other.

## End
summary: The AI can suggest whatever it likes: its lane is separate from yours, and you have the final say.
takeaway: One branch per topic or per assistant. diff to see before you accept.
next: mission 03-deux-assistants
