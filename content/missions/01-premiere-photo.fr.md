---
title: Une première photo
duration: 10
repos: [local]
unlocks: [status, add, commit]
---

> duo: Avant de faire travailler une IA, il faut savoir garder une trace de son propre travail. Un commit, c'est une photo du projet à un instant donné.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "Dossier créé"
@work intro.md
```

## Steps

### 1. Voir ce qui a changé
command: git status
Git compare votre dossier à la dernière photo et vous dit ce qui a bougé.
after: intro.md porte un M : vous l'avez modifié depuis la dernière photo.

### 2. Travailler sur un autre fichier
command: (cliquez plan.md dans votre dossier)
check: file rapport-client/plan.md M
Cliquer un fichier, c'est dire « j'ai travaillé dessus ». Il passe en M.
after: Deux fichiers sont modifiés. Rien n'est encore enregistré.

### 3. Choisir ce qui entre dans la photo
command: git add intro.md
L'index, c'est la table où l'on pose ce qui entrera dans la prochaine photo. On choisit fichier par fichier.
after: intro.md est passé dans l'index (lettre bleue). plan.md reste en M : il ne fera pas partie de la photo.
note: L'index = ce qui partira dans la photo

### 4. Prendre la photo
command: git commit -m "Introduction réécrite"
accepts: git commit -m "*"
Le commit enregistre une photo de tout ce qui est dans l'index, avec un message.
after: Un nouveau rond est apparu sur la voie main. intro.md est redevenu propre ; plan.md est toujours en M.

## End
summary: Vous savez enregistrer votre travail par petites photos, en choisissant ce qui y entre.
takeaway: status pour voir, add pour choisir, commit pour enregistrer.
next: mission 02-une-voie-pour-l-ia
