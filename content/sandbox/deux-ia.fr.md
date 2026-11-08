---
title: Deux assistants IA
repos: [local]
---
Votre dossier et deux assistants IA, chacun à son bureau et sur sa voie : l'un rédige le résumé, l'autre jongle avec les chiffres. Ils travaillent en même temps et ne se marchent pas dessus, c'est le but.

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
git worktree add ../rpt-ia-resume -b ia/agent-1
@cd rpt-ia-resume
@work resume.md
git commit -m "résumé v1"
@work resume.md
git add resume.md
@cd rpt-client
git worktree add ../rpt-ia-stats -b ia/agent-2
@cd rpt-ia-stats
@work chiffres.xlsx
git commit -m "chiffres"
@work chiffres.xlsx
@author human
@cd rpt-client
```
