---
title: Partager avec l'équipe
duration: 12
repos: [local, origin, upstream]
unlocks: [fork, fetch, pull, push]
---

> duo: Jeudi après-midi. Stéphane, votre collègue, doit relire le rapport. Jusqu'ici tout restait sur votre ordinateur : il faut passer en ligne. Trois dépôts entrent en scène : le projet d'origine (upstream), votre copie en ligne (le fork, appelé origin) et votre dépôt local.

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
after: La carte origin s'est allumée : c'est votre fork, votre copie en ligne.

### 2. Enregistrer votre travail
before: @work intro.md
command: git commit -am "Intro"
Vous avez retouché l'intro. -am enregistre d'un coup tous les fichiers déjà suivis qui ont été modifiés.
after: Un nouveau commit chez vous, pas encore en ligne : la pastille origin/main, ce que vous savez de la version en ligne, est en retard.

### 3. Pousser
command: git push
Le push envoie vos commits locaux vers origin, votre copie en ligne.
after: origin/main a rejoint main. Stéphane peut maintenant lire votre intro.

### 4. Stéphane a poussé avant vous
before:
- @colleague main "Correction des chiffres"
- @work resume.md
- git commit -m "Résumé"
command: git push
check: error push-rejected
Pendant ce temps, Stéphane a poussé une correction des chiffres. Vous essayez de pousser votre résumé… refusé : la version en ligne a avancé sans vous.
after: Git refuse d'écraser le travail de Stéphane. Il faut d'abord le récupérer.

### 5. Récupérer sans fusionner
command: git fetch
fetch télécharge ce qui est en ligne sans toucher à votre dossier. On regarde le colis avant de l'ouvrir.
after: La pastille origin/main a avancé ; votre main n'a pas bougé.

### 6. Récupérer et intégrer
command: git pull
pull = fetch + fusion : on télécharge, puis on intègre dans votre main.
after: main contient la correction de Stéphane. Vous pouvez de nouveau pousser.

## End
summary: Local, origin, upstream : trois dépôts, et des commandes pour les garder d'accord. Stéphane et vous ne vous marchez plus sur les pieds.
takeaway: push envoie, fetch regarde, pull récupère et intègre.
next: mission 06-relire-une-mr
