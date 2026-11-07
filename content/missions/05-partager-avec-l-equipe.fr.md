---
title: Partager avec l'équipe
duration: 12
repos: [local, origin, upstream]
unlocks: [fork, fetch, pull, push]
---

> duo: Jusqu'ici tout restait sur votre ordinateur. Pour travailler avec l'équipe, il faut un dépôt en ligne : le projet d'origine, votre copie (le fork), et votre dépôt local.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@remote upstream
```

## Steps

### 1. Faire sa copie en ligne
command: fork
Un fork est votre propre copie en ligne du projet d'origine. Vous pouvez y pousser sans rien casser chez les autres.
after: La carte origin s'est activée : c'est votre fork.

### 2. Envoyer votre travail
before: @travail intro.md
command: git commit -am "Intro"
after: Un nouveau commit local, pas encore en ligne : la pastille origin/main est en retard.

### 3. Pousser
command: git push
Le push envoie vos commits locaux vers origin.
after: origin/main a rejoint main. La flèche push s'est animée.

### 4. Un collègue a poussé
before:
- @colleague main "Correction des chiffres"
- @work resume.md
- git commit -m "Résumé"
command: git push
check: error push-rejected
Vous essayez de pousser un nouveau commit… refusé : la version en ligne a avancé.
after: Git refuse : vous devez d'abord récupérer le travail du collègue.

### 5. Récupérer sans fusionner
command: git fetch
fetch télécharge ce qui est en ligne sans toucher à votre dossier.
after: La pastille origin/main a avancé ; votre main n'a pas bougé.

### 6. Récupérer et intégrer
command: git pull
pull = fetch + fusion.
after: main contient le travail du collègue. Vous pouvez de nouveau pousser.

## End
summary: Local, origin, upstream : trois dépôts, et des commandes pour les synchroniser.
takeaway: push envoie, fetch regarde, pull récupère et intègre.
next: mission 06-relire-une-mr
