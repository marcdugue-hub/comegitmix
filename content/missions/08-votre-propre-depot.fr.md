---
title: Votre propre dépôt
duration: 12
repos: [local]
folder: atelier-ia
unlocks: [init, gh-repo-create, remote-add]
---

> duo: Le rapport Pivert est parti. Lundi, vous préparez un atelier IA pour vos collègues : un dossier sur votre disque, avec un programme, une liste d'inscrits et un README. Ce dossier n'a jamais vu Git. On en fait un dépôt, puis on le met sur GitHub pour que Stéphane puisse le suivre.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
```

## Part A — Du dossier au dépôt
> duo: Pour l'instant, atelier-ia est un dossier comme les autres. Voyons ce que Git en pense.

### 1. Demander à Git
command: git status
check: error not-a-repo
On pose la question habituelle : qu'est-ce qui a changé ? Sauf que Git n'a jamais été invité dans ce dossier.
after: Git refuse : pas de dossier .git ici, donc pas de dépôt. Vos fichiers existent bel et bien, mais Git n'a rien à comparer.
note: Pas de .git = pas de Git
hint: Lisez la réponse : Git ne trouve pas de dépôt.

### 2. Créer le dépôt
command: git init
git init crée un dossier caché, .git, dans votre dossier. C'est le carnet où Git rangera toutes les photos. Vos fichiers ne bougent pas.
after: La carte « Dépôt local · .git » apparaît en haut. Vos trois fichiers portent un U : ils sont là, mais Git ne les suit pas encore. La voie main attend son premier commit.
note: .git = la mémoire du projet
hint: Deux mots : git et un verbe anglais qui veut dire « démarrer ».

### 3. Tout poser dans l'index
command: git add .
accepts: git add -A ; git add README.md programme.md inscrits.csv ; git add README.md inscrits.csv programme.md
Pour la toute première photo, on veut tout le dossier. Le point veut dire « ici, tout ».
after: Les trois fichiers passent en A (ajoutés) : ils entreront dans la première photo.
hint: git add suivi d'un point.

### 4. La première photo
command: git commit -m "Premier commit"
accepts: git commit -m "*"
Le premier commit est une photo comme les autres, sauf qu'il n'a pas de parent : c'est le point de départ de l'histoire.
after: Un premier rond sur la voie main. Le dossier est désormais un dépôt Git, avec une histoire d'un commit.

### Part end
summary: atelier-ia est devenu un dépôt : un .git, une voie main et une première photo. Tout reste sur votre disque, personne d'autre ne le voit encore.

## Part B — Le mettre sur GitHub
> duo: Stéphane veut suivre l'atelier. Il faut une copie en ligne : un dépôt sur GitHub, relié au vôtre.

### Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
git add .
git commit -m "Premier commit"
```

### 1. Créer le dépôt vide sur GitHub
command: gh repo create atelier-ia --public
accepts: gh repo create atelier-ia --private ; gh repo create atelier-ia
Sur le site GitHub, ce serait le bouton « New repository ». En ligne de commande, l'outil gh de GitHub fait la même chose. --public : tout le monde peut le lire ; --private : seulement les personnes invitées.
after: La carte origin apparaît : le dépôt existe sur GitHub, mais il est vide et votre dépôt local ne le connaît pas encore.
hint: gh repo create, le nom du dossier, puis --public.

### 2. Relier les deux dépôts
command: git remote add origin https://github.com/demo/atelier-ia.git
accepts: git remote add origin *
git remote add donne un petit nom à une adresse en ligne. Par convention, la copie principale s'appelle origin. Rien n'est envoyé : on note juste l'adresse.
after: Votre dépôt connaît maintenant origin. La carte dit « relié, mais encore vide ».
note: origin = un petit nom pour une adresse
hint: git remote add, puis origin, puis l'adresse du dépôt.

### 3. Envoyer la première photo
command: git push -u origin main
accepts: git push --set-upstream origin main
check: main = origin/main
push envoie vos commits sur origin. -u retient le lien entre votre main et celle de GitHub : la prochaine fois, un simple git push suffira.
after: origin/main apparaît à côté de main : le projet est en ligne. Stéphane peut l'ouvrir sur GitHub, et le README s'affiche sur la page du projet.

### Part end
summary: Le dépôt est sur GitHub et relié au vôtre. Désormais : add, commit, push.

## End
summary: Un dossier ordinaire est devenu un dépôt Git, puis un projet partagé sur GitHub. C'est exactement ce que fait une équipe au premier jour d'un projet.
takeaway: git init crée le dépôt, add et commit prennent la première photo, gh repo create crée la copie en ligne, git remote add la relie, git push -u l'envoie.
next: puzzle 16-pas-encore-un-depot
