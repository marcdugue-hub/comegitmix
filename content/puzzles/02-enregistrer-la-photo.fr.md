---
title: Enregistrer la photo
type: choice
timer: 60
repos: [local]
---

## Prompt
intro.md est prêt et posé sur le comptoir (préparé). Il ne reste qu'à déclencher la photo : enregistrez-le.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
git add intro.md
```

## Choices
- [x] git commit -m "Intro"
- [ ] git add intro.md — il est déjà préparé ; le re-préparer ne change rien.
- [ ] git push — push envoie en ligne des commits existants. Ici il n'y en a pas de nouveau à envoyer.
- [ ] git stash — stash range dans un tiroir : rien n'entre dans l'histoire.

## Goal
Un commit de plus sur main : la photo est prise.

## Takeaway
commit prend la photo de ce qui est préparé, pas un fichier de plus.
