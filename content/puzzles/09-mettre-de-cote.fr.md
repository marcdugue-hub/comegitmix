---
title: Mettre ses modifications de côté
type: choice
timer: 60
repos: [local]
---

## Prompt
Un collègue vous demande de regarder une autre branche, tout de suite. Votre intro.md est à moitié écrit. Mettez-le de côté sans l'enregistrer, le temps de revenir.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
```

## Choices
- [x] git stash
- [ ] git commit -am "wip" — vous enregistrez un travail pas prêt, et il restera dans l'histoire.
- [ ] git restore intro.md — vos modifications partent à la corbeille.
- [ ] git add intro.md — l'index prépare la prochaine photo ; ce n'est pas une cachette.

## Goal
Dossier propre, une entrée dans le stash (le tiroir).

## Takeaway
stash range le travail en cours dans un tiroir ; stash pop le ressort.
