---
title: Un dossier de plus pour l'IA
type: choice
timer: 60
repos: [local]
---

## Prompt
Donnez à un nouvel assistant son propre dossier et sa propre branche ia/sources, sans nouveau dépôt.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git worktree add ../rapport-ia-sources -b ia/sources
- [ ] git clone . ../rapport-ia-sources — clone copie tout le dépôt : deux .git.
- [ ] git branch ia/sources — une branche sans dossier.
- [ ] git switch -c ia/sources — votre propre dossier change de branche.

## Goal
Un nouveau dossier sur la branche ia/sources, même .git.

## Takeaway
worktree add = un dossier de plus, relié au même dépôt.
