---
title: Une histoire lisible
duration: 14
repos: [local, origin]
unlocks: [rebase, squash, cherry-pick, mr-create]
---

> duo: Vendredi, 15 h. Avant d'envoyer le rapport à Maison Pivert, un peu de rangement. L'assistant « chiffres » a laissé trois commits « wip » (pour work in progress, travail en cours), sa voie part d'une vieille version, et une correction utile traîne sur une branche d'essai.

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
after: Trois ronds se sont fondus en un seul. Même contenu, et une histoire qui se lit enfin.
note: Même travail, moins de bruit

### 2. Repartir de la dernière version de main
command: git rebase main
La voie de l'assistant partait d'une vieille version de main. Le rebase la fait repartir du dernier commit de main, comme si elle venait de commencer.
after: La voie ia/chiffres part maintenant du bout de main : plus de retard.

### 3. Proposer le travail à la relecture
command: glab mr create --fill -t "Chiffres vérifiés"
check: mr 1 open
La voie est propre : proposez-la à Stéphane avec une demande de fusion (MR). glab est l'outil de GitLab en ligne de commande ; --fill envoie la voie en ligne, -t donne le titre.
after: La MR !1 est ouverte sur origin : ia/chiffres demande à rejoindre main. Stéphane peut relire une histoire courte et claire.
note: Une MR, c'est « relisez avant d'intégrer ».

### 4. Récupérer un seul commit utile
before: @cd rpt-client
command: git switch main
La correction de faute est sur la voie ia/essai. Pour la copier sur main, on se place d'abord sur main.
after: Vous êtes sur main, prêt pour la cueillette.

### 5. Prendre la correction, pas l'essai
command: git cherry-pick ia/essai~1
accepts: git cherry-pick *
cherry-pick, « cueillir la cerise » : on copie un seul commit d'une autre voie sur la vôtre, et on laisse le reste sur l'arbre.
after: La correction du résumé est copiée sur main. L'essai abandonné reste sur sa voie, où il ne gêne personne.

### 6. Mettre de côté un travail en cours
before: @work intro.md
command: git stash
Vous retouchez encore l'intro, mais elle n'est pas prête pour l'envoi : on la range dans le tiroir.
after: intro.md est rangé dans le stash : votre dossier est propre.

### 7. Ranger un bureau fini
before:
- git worktree add ../rpt-ia-essai ia/essai
command: git worktree remove ../rpt-ia-essai
Le bureau de l'essai ne sert plus : on supprime le dossier. La branche, elle, reste dans le .git.
after: La tuile a disparu, la voie ia/essai est toujours là, au cas où quelqu'un la regretterait.

## End
summary: Une histoire courte et claire est plus facile à relire, pour vous, pour Stéphane et pour Maison Pivert. Le rapport peut partir, bon week-end.
takeaway: squash regroupe, rebase fait repartir, cherry-pick copie un seul commit. Ne réécrivez pas une histoire déjà partagée.
next: mission 08-votre-propre-depot
