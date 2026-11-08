---
title: Two assistants, one project
duration: 12
repos: [local]
unlocks: [worktree-add, worktree-list]
---

> duo: Wednesday. A second assistant joins to check the figures in the Pivert report. Two AIs in the same folder is like two people sharing one keyboard. Let's give each one a desk and a lane.

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
command: git worktree add ../rpt-ia-resume -b ia/resume
hint: git worktree add, then the path of the new folder, then -b and the branch name.
A worktree is one more folder linked to the same repository (the .git, the project's memory). The AI works there on its own branch, without touching your folder.
after: A new folder rpt-ia-resume appeared, linked to the orange lane. There is still only one .git.
note: One desk = one real folder on your computer

### 2. A desk for the “figures” assistant
command: git worktree add ../rpt-ia-stats -b ia/chiffres
Same idea for the “figures” assistant, the one that counts everything twice: another folder, another branch, the same repository.
after: Three folders, three lanes, one single .git. More desks, one shared memory.

### 3. Let them work in parallel
command: (“Make the AI work” button on both desks)
check:
- commits ia/resume since main = 1
- commits ia/chiffres since main = 1
Each assistant works in its own folder. Nobody overwrites anybody, nobody fights over the mouse.
after: Each lane moved forward on its own. Your folder did not move.

### 4. Review the first assistant's work
command: git diff main ia/resume
opens: diff
diff-mode: branches
Before keeping anything, compare the “summary” assistant's lane with main.
after: You can see the lines changed by the “summary” assistant. Sorting them out is tomorrow's job.

### 5. See where things stand
command: git worktree list
This command lists each folder and the branch it has open: the team's seating plan.
after: Three folders, each on its own branch. Everyone is in their seat.

## End
summary: Three desks, one history. Each assistant moves forward on its own lane without getting in the others' way, or yours.
takeaway: A worktree is not a copy of the repository: it is one more folder linked to the same .git.
next: mission 04-relire-avant-d-accepter
