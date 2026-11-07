---
title: Rapatrier une voie terminée
type: choice
timer: 60
repos: [local]
---

## Prompt
Le travail de ia/resume est validé. Intégrez-le dans main (vous êtes sur main).

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "résumé"
@author human
git switch main
```

## Choices
- [x] git merge ia/resume
- [ ] git switch ia/resume — vous changez de voie, sans rien intégrer.
- [ ] git rebase ia/resume — rebase déplace votre voie, ce n'est pas l'usage ici.
- [ ] git push ia/resume — push envoie en ligne.

## Goal
main contient le travail de ia/resume.

## Takeaway
merge rapatrie une voie dans celle où vous êtes.
