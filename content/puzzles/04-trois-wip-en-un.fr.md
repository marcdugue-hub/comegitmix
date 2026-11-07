---
title: Trois « wip » en un
type: choice
timer: 60
repos: [local]
---

## Prompt
L'IA a laissé trois commits « wip ». Fusionnez-les en un seul avant de partager.

## Setup
```git-setup
@files rapport.md
git commit -m "Premier jet"
@author ai
git switch -c ia/chiffres
@work rapport.md
git commit -m "wip"
@work rapport.md
git commit -m "wip"
@work rapport.md
git commit -m "wip"
```

## Choices
- [x] git rebase -i HEAD~3
- [ ] git reset --hard HEAD~3 — reset --hard efface le travail au lieu de le regrouper.
- [ ] git revert HEAD~3 — revert ajoute un commit d'annulation, il ne regroupe rien.
- [ ] git merge main — merge intègre une autre voie, il ne nettoie pas celle-ci.

## Goal
Un seul commit propre sur la voie ia/chiffres.

## Takeaway
rebase -i permet de regrouper (squash) plusieurs commits en un avant de partager.
