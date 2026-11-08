---
title: Le tiroir, aller et retour
type: typed
repos: [local]
---

## Prompt
Vous aviez rangé votre intro.md dans le tiroir pour aller jeter un œil à ia/resume, à la demande de Stéphane. Le coup d'œil est fait, vous êtes revenu sur main. Ressortez votre travail du tiroir.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
git branch ia/resume
@work intro.md
git stash
git switch ia/resume
git switch main
```

## Solution
solution: git stash pop
check:
- desk rpt-client on main
- file rpt-client/intro.md M
- stash rpt-client = 0

## Goal
Votre intro.md est de nouveau modifié (M) et le tiroir est vide.

## Takeaway
stash range, stash pop ressort : on peut visiter une autre branche sans perdre ni enregistrer un travail à moitié fini.
