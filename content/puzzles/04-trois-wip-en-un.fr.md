---
title: Trois « wip » en un
type: choice
timer: 60
repos: [local]
---

## Prompt
L'IA a enregistré trois fois son travail, avec le titre « wip » (« travail en cours ») pour tout commentaire. Avant de montrer ça à l'équipe, fusionnez ces trois commits en un seul.

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
- [ ] git reset --hard HEAD~3 — reset --hard efface le travail au lieu de le regrouper. L'IA ne vous le pardonnerait pas.
- [ ] git revert HEAD~3 — revert ajoute un commit d'annulation : vous auriez quatre commits, pas un.
- [ ] git merge main — merge rapproche deux voies ; il ne range pas celle-ci.

## Goal
Un seul commit propre sur la voie ia/chiffres, au lieu de trois « wip ».

## Takeaway
rebase -i regroupe (squash) plusieurs commits en un seul : on range avant de partager.
