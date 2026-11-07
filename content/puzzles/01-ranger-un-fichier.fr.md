---
title: Ranger un fichier dans la photo
type: choice
timer: 60
repos: [local]
---

## Prompt
Deux fichiers ont bougé, mais seul intro.md est présentable. Faites partir intro.md seul dans le prochain commit ; plan.md est encore en brouillon.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
```

## Choices
- [x] git add intro.md
- [ ] git add . — le point veut dire « tout » : plan.md, brouillon compris, partirait aussi.
- [ ] git commit -am "intro" — -a embarque aussi plan.md, prêt ou pas.
- [ ] git restore intro.md — restore jette vos modifications : intro.md redevient comme avant, et votre travail s'évapore.

## Goal
intro.md préparé, plan.md toujours en M (modifié, mais pas dans la photo).

## Takeaway
add compose la photo fichier par fichier : seul ce qui est préparé y entre.
