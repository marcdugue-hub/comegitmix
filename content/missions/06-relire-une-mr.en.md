---
title: Review an MR
duration: 12
repos: [local, origin]
unlocks: [stash, worktree-remove, mr-approve, mr-merge]
mode: stepper
---

## Setup
```git-setup
@files plan.md intro.md resume.md chapitres/ch1.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg graphiques/couts.svg
git commit -m "sales chart"
git commit -m "cost chart"
@work chapitres/ch1.md
git commit -m "chapter 1 updated"
@author human
git switch main
@work intro.md
git commit -m "intro"
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Add the charts" comments=2
@work plan.md intro.md
```

## Part A — On a branch
> duo: Friday morning. The “charts” assistant opened MR !42 on its branch ia/graphiques: a merge request, which says “review my work, then bring it into main”. You are halfway through touching up the outline and the intro. Let’s first review it the classic way: by switching branches.

### 1. Look at your work in progress
command: git status
Before switching branches, check what is in progress.
after: Two modified files (M): your work is not saved yet.

### 2. Put your work away
command: git stash
check: stash rapport-client = 1
The stash is a drawer: you put your work in progress in it so you can switch branches without carrying it along or losing it.
after: Your M files are gone from the folder: they are in the drawer (the stash), in zone ③.
note: Your work is hidden, not lost.

### 3. Fetch the MR’s branch
command: git fetch origin
check: remote ia/graphiques fetched
Download what is online, without touching your folder.
after: The MR’s lane now exists on your side, as origin/ia/graphiques.

### 4. Open the MR’s branch
command: git switch ia/graphiques
check: desk rapport-client on ia/graphiques
Your folder takes the content of the MR’s branch.
after: Your folder changed content: the graphiques/ folder appeared. The thread now runs to the blue lane.
note: Same folder, different content: you are no longer on main.

### 5. Review with diff
command: git diff main...ia/graphiques
opens: diff
diff-mode: branches
Compare the MR’s branch with main. The three dots mean: only what the MR brings.
after: Two added files (A) and one modified (M). The diff screen lets you read them line by line.

### 6. Approve the MR
web: approve MR !42
check: mr 42 approved
Review done, and not a single 3D pie chart in sight: give your approval online.
after: The MR is approved. It can be merged into main.

### 7. Go back and bring your work out
command: git switch main && git stash pop
check:
- desk rapport-client on main
- stash rapport-client = 0
Back to main, then take your work out of the drawer.
after: You are back on main and your two M files are back. Without stash pop, they would still be asleep in the drawer.

### Part end
summary: It works, but your desk was disturbed during the whole review, and you had to remember stash pop.

## Part B — In a worktree
> duo: Same MR, another method: we open a second folder just for the review. Keep an eye on your desk the whole time: if all goes well, nothing happens to it.

### 1. Fetch the MR’s branch
command: git fetch origin
check: remote ia/graphiques fetched
Download what is online, without touching your folder.
after: The MR’s lane exists on your side, as origin/ia/graphiques. Your M files did not move.

### 2. Open a review desk
command: git worktree add ../revue-mr-42 ia/graphiques
check:
- desk revue-mr-42 on ia/graphiques
- work-intact rapport-client
A second folder, open on the MR’s branch. No drawer needed: your desk stays exactly as it is.
after: A new folder revue-mr-42 appeared, linked to the blue lane. Your desk is untouched, at 60%: you now work in the review.
note: Your desk did not move: your M files are still there.

### 3. Review with diff
command: git diff main...ia/graphiques
opens: diff
diff-mode: branches
In the review folder, compare the MR’s branch with main: only what the MR brings.
after: Two added files (A) and one modified (M). The diff screen lets you read them line by line.

### 4. Approve, then merge
web: approve MR !42 ; merge MR !42
check: mr 42 merged
Give your approval, then merge the MR into main, online.
after: The MR is merged on origin: origin/main moved forward. Your local main has not moved yet.
note: Merged online: you will need to fetch it.

### 5. Remove the review desk
command: git worktree remove ../revue-mr-42
check: desk revue-mr-42 removed
The review folder has done its job: remove it. No boxes to pack.
after: The review folder is gone. The ia/graphiques branch still exists in the .git.

### 6. Update main
command: git pull
check:
- main = origin/main
- work-intact rapport-client
In your desk, bring in the merge made online.
after: main moved up to the merge, and your two M files are still there: your work was never disturbed.

### Part end
summary: Your work never moved. The review folder takes one command to create and is thrown away afterwards.

## End
summary: You can review an MR in two ways. The charts are in main, and your intro didn’t lose a single comma. Compare both methods on the next screen.
takeaway: With work in progress, review in a worktree: your desk stays put.
next: compare 06b-deux-facons
