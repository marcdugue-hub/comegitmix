---
title: Une première photo
duration: 10
repos: [local]
unlocks: [status, add, commit]
---

> duo: Lundi, 9 h. Le rapport pour le client Maison Pivert est à rendre vendredi, et des assistants IA vont vous aider. Avant de leur confier quoi que ce soit, apprenez à garder une trace de votre travail : un commit, c'est une photo du projet à un instant donné.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "Dossier créé"
@work intro.md
```

## Steps

### 1. Voir ce qui a changé
command: git status
Git compare votre dossier à la dernière photo et vous dit ce qui a bougé. Un collègue très attentif, qui ne juge jamais.
after: intro.md porte un M (modifié) : vous l'avez retouché depuis la dernière photo. Le café de 9 h a été productif.

### 2. Travailler sur un autre fichier
command: (cliquez plan.md dans votre dossier)
check: file rapport-client/plan.md M
Cliquer un fichier, c'est dire « j'ai travaillé dessus ». Cette fois, c'est le plan.
after: Deux fichiers modifiés, et aucune photo prise pour l'instant.

### 3. Choisir ce qui entre dans la photo
command: git add intro.md
L'index, c'est la table où l'on pose ce qui entrera dans la prochaine photo. Le plan n'est pas prêt ? Il reste hors du cadre.
after: intro.md est passé dans l'index (lettre bleue). plan.md reste en M : il ne sera pas sur la photo.
note: L'index = ce qui partira dans la photo

### 4. Prendre la photo
command: git commit -m "Introduction réécrite"
accepts: git commit -m "*"
Le commit enregistre une photo de tout ce qui est dans l'index, avec un message. « Introduction réécrite » vous aidera plus, dans six mois, que « modifs ».
after: Un nouveau rond est apparu sur la voie main : c'est votre photo. intro.md est redevenu propre ; plan.md attend toujours en M.

## End
summary: Première photo du dossier Pivert, et c'est vous qui avez choisi ce qui était dans le cadre.
takeaway: status pour voir, add pour choisir, commit pour enregistrer.
next: mission 02-une-voie-pour-l-ia
