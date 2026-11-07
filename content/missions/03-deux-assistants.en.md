---
title: Two assistants, one project
duration: 12
repos: [local]
unlocks: [worktree-add, worktree-list]
---

> duo: Your two AI assistants want to work at the same time: one writes the summary, the other checks the figures. In the same folder, they would overwrite each other. Let's give each one a desk and a lane.

## Setup
```git-setup
@files plan.md intro.md resume.md chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "outline"
@work intro.md
git commit -m "intro"
```

## Steps

### 1. A desk for the “summary” assistant
command: git worktree add ../rapport-ia-resume -b ia/resume
hint: git worktree add, then the path of the new folder, then -b and the branch name.
A worktree is one more folder linked to the same repository. The AI works there on its own branch, without touching your folder.
after: A new folder rapport-ia-resume appeared, linked to the orange lane. There is still only one .git.
note: One desk = one real folder on your computer

### 2. A desk for the “figures” assistant
command: git worktree add ../rapport-ia-chiffres -b ia/chiffres
Same idea for the second assistant: another folder, another branch, the same repository.
after: Three folders, three lanes, one single .git.

### 3. Let them work in parallel
command: (“Make the AI work” button on both desks)
check:
- commits ia/resume since main = 1
- commits ia/chiffres since main = 1
Each assistant works in its own folder. Nobody overwrites anybody.
after: Each lane moved forward on its own. Your folder did not move.

### 4. Review the first assistant's work
command: git diff main ia/resume
opens: diff
diff-mode: branches
Compare the assistant's lane with main before deciding what to keep.
after: You can see the lines changed by the “summary” assistant.

### 5. See where things stand
command: git worktree list
This command lists each folder and the branch it has open.
after: Three folders, each on its own branch.

## End
summary: Three folders, one history. Each moves forward on its own lane without getting in the others' way.
takeaway: A worktree is not a copy of the repository: it is one more folder linked to the same .git.
next: mission 04-relire-avant-d-accepter
