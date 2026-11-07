---
title: Un dossier de plus pour l'IA
type: choice
timer: 60
repos: [local]
---

## Prompt
Un nouvel assistant arrive, et il lui faut son propre bureau : un dossier à lui, sur sa branche ia/sources, sans copier tout le projet.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git worktree add ../rapport-ia-sources -b ia/sources
- [ ] git clone . ../rapport-ia-sources — clone photocopie tout le projet : deux .git, deux historiques qui divergeront.
- [ ] git branch ia/sources — une voie, mais pas de bureau pour y travailler.
- [ ] git switch -c ia/sources — c'est votre bureau qui déménage sur la nouvelle voie.

## Goal
Un nouveau dossier sur la branche ia/sources, avec le même .git.

## Takeaway
worktree add : un bureau de plus, relié au même projet.
