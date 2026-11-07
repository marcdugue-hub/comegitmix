---
title: Une histoire lisible
duration: 14
repos: [local, origin]
unlocks: [rebase, squash, cherry-pick]
---

> duo: L'assistant a laissé une histoire brouillonne : des « wip », une branche partie d'une vieille version, une correction utile perdue ailleurs. Rangeons tout ça avant de partager.

## Setup
```git-setup
@files plan.md intro.md resume.md chiffres.md
git commit -m "init"
@author ai
git switch -c ia/chiffres
@work chiffres.md
git commit -m "wip"
@work chiffres.md
git commit -m "wip"
@work chiffres.md
git commit -m "wip"
git switch main
git switch -c ia/essai
@work resume.md
git commit -m "faute corrigée dans le résumé"
@work intro.md
git commit -m "essai abandonné"
@author human
git switch main
@work plan.md
git commit -m "plan revu"
@remote origin
git switch ia/chiffres
```

## Steps

### 1. Regrouper les « wip »
command: git rebase -i HEAD~3
check: commits ia/chiffres since main = 1
Le rebase interactif liste les 3 derniers commits : gardez le premier (pick) et fondez les deux autres dedans (squash).
after: Trois ronds se sont fondus en un seul. Même contenu, histoire plus lisible.
note: Même travail, moins de bruit

### 2. Repartir de la dernière version de main
command: git rebase main
La voie de l'assistant partait d'une vieille version. Le rebase la fait repartir du dernier commit de main.
after: La voie ia/chiffres part maintenant du bout de main : plus de retard.

### 3. Récupérer un seul commit utile
before: @cd rapport-client
command: git switch main
after: Vous êtes sur main.

### 4. Prendre la correction, pas l'essai
command: git cherry-pick ia/essai~1
accepts: git cherry-pick *
cherry-pick copie un seul commit d'une autre voie sur la vôtre.
after: La correction du résumé est copiée sur main. L'essai abandonné reste sur sa voie.

### 5. Mettre de côté un travail en cours
before: @travail intro.md
command: git stash
after: intro.md est rangé dans le stash : votre dossier est propre.

### 6. Ranger un bureau fini
before:
- git worktree add ../rapport-ia-essai ia/essai
command: git worktree remove ../rapport-ia-essai
Le bureau de l'essai ne sert plus : on supprime le dossier. La branche, elle, reste dans le .git.
after: La tuile a disparu, la voie ia/essai est toujours là.

## End
summary: Une histoire courte et claire est plus facile à relire, pour vous comme pour l'équipe.
takeaway: squash regroupe, rebase fait repartir, cherry-pick copie un seul commit. Ne réécrivez pas une histoire déjà partagée.
next: sandbox deux-ia
