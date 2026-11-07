---
title: Two AI assistants
repos: [local]
---
Your folder and two AI assistant desks, each on its lane.

## Setup
```git-setup
@files plan.md intro.md resume.md chiffres.xlsx chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "plan"
git switch -c feature/intro
@work intro.md
git commit -m "intro"
git switch main
@author ai
git worktree add ../rapport-ia-resume -b ia/agent-1
@cd rapport-ia-resume
@work resume.md
git commit -m "summary v1"
@work resume.md
git add resume.md
@cd rapport-client
git worktree add ../rapport-ia-chiffres -b ia/agent-2
@cd rapport-ia-chiffres
@work chiffres.xlsx
git commit -m "figures"
@work chiffres.xlsx
@author human
@cd rapport-client
```
