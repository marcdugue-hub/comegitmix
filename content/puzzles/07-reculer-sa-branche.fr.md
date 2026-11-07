---
title: Reculer sa branche
type: choice
timer: 60
repos: [local]
---

## Prompt
Vos deux derniers commits locaux (jamais partagés) sont à refaire. Reculez la branche mais gardez les modifications dans vos fichiers.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "essai 1"
@work plan.md
git commit -m "essai 2"
```

## Choices
- [x] git reset HEAD~2
- [ ] git reset --hard HEAD~2 — --hard efface aussi les modifications.
- [ ] git revert HEAD~2 — revert ajoute un commit au lieu de reculer.
- [ ] git switch --detach HEAD~2 — vous détachez HEAD sans reculer la branche.

## Goal
main a reculé de deux commits ; plan.md est en M.

## Takeaway
reset recule la branche ; par défaut il garde vos fichiers.
