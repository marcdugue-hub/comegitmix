---
title: Conflict ready to resolve
repos: [local]
---
You and the AI rewrote the same line of plan.md, each on your own, without telling the other. Result: two delivery dates. You are on main, just before bringing in the AI's lane: type git merge ia/resume to watch Git hesitate, then choose which version to keep.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "shorter summary"
@work plan.md
git commit -m "delivery moved to April"
@author human
git switch main
@work plan.md
git commit -m "delivery confirmed for March"
```

```conflict plan.md
<<< main
Report delivery: end of March.
=== ia/resume
Report delivery: mid-April, after the figures are checked.
>>>
```
