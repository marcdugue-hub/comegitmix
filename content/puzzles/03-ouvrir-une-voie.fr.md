---
title: Ouvrir une voie et s'y placer
type: choice
timer: 60
repos: [local]
---

## Prompt
Créez la branche ia/plan et placez votre dossier dessus, en une seule commande.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git switch -c ia/plan
- [ ] git branch ia/plan — crée la voie mais votre dossier reste sur main.
- [ ] git switch ia/plan — la branche n'existe pas encore.
- [ ] git worktree add ia/plan — il manque le chemin du dossier.

## Goal
Votre dossier est sur la nouvelle voie ia/plan.

## Takeaway
switch -c crée la branche et s'y place.
