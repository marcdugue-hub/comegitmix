---
title: Two AI assistants
repos: [local]
---
Your folder and two AI assistants, each at its own desk and on its own lane: one writes the summary, the other juggles the figures. They work at the same time and do not step on each other's toes, which is the point.

## Setup
```git-setup
@files plan.md intro.md resume.md chiffres.csv chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "plan"
git switch -c feature/intro
@work intro.md
git commit -m "intro"
git switch main
@author ai
git worktree add ../rpt-ia-resume -b ia/agent-1
@cd rpt-ia-resume
@work resume.md
git commit -m "summary v1"
@work resume.md
git add resume.md
@cd rpt-client
git worktree add ../rpt-ia-stats -b ia/agent-2
@cd rpt-ia-stats
@work chiffres.csv
git commit -m "figures"
@work chiffres.csv
@author human
@cd rpt-client
```
