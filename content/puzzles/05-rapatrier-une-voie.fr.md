---
title: Rapatrier une voie terminée
type: choice
timer: 60
repos: [local]
---

## Prompt
Vous avez relu le résumé de l'IA : c'est bon. Ramenez le travail de ia/resume dans main (vous êtes déjà sur main).

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
- [ ] git switch ia/resume — vous allez visiter la voie de l'IA, sans rien en rapporter.
- [ ] git rebase ia/resume — rebase déménage votre voie ailleurs ; ici on veut juste rapporter le résultat.
- [ ] git push ia/resume — push envoie en ligne, mais ne fusionne rien chez vous.

## Goal
main contient désormais le travail de ia/resume.

## Takeaway
merge rapporte une voie dans celle où vous vous trouvez.
