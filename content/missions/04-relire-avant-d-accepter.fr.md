---
title: Relire avant d'accepter
duration: 14
repos: [local]
unlocks: [log, merge, revert, restore, reset, blame]
---

> duo: Jeudi. L'assistant « résumé » a rendu sa copie, en deux versions. Avant d'accepter, on relit, on garde ce qui est bon, et on apprend à défaire ce qui ne l'est pas. Mais d'abord, vos propres notes.

## Setup
```git-setup
@files plan.md intro.md resume.md sources.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "résumé v1"
@work resume.md sources.md
git commit -m "résumé v2"
@author human
git switch main
@work intro.md
@new notes.md
```

## Steps

### 1. Ce que vous avez modifié
command: git diff
opens: diff
diff-mode: work
git diff seul montre vos modifications pas encore préparées, c'est-à-dire pas encore dans l'index. Regardez bien : notes.md n'y est pas.
after: Seul intro.md apparaît. notes.md est nouveau (U) : Git ne le suit pas encore, donc git diff ne le montre pas tant qu'il n'est pas préparé.
note: U = Git ne le suit pas encore

### 2. Ce qui est préparé
command: git add intro.md notes.md
On pose les deux fichiers dans l'index, le petit nouveau compris.
after: Les deux fichiers sont dans l'index : intro.md en M bleu, notes.md en A (ajouté).

### 3. Vérifier ce qui partira dans le commit
command: git diff --staged
opens: diff
diff-mode: staged
--staged montre exactement ce qui est dans l'index, donc ce qui partira dans le prochain commit. C'est le « relire avant d'envoyer » de Git.
after: On retrouve intro.md et, cette fois, notes.md.

### 4. Enregistrer
command: git commit -m "Notes et intro"
accepts: git commit -m "*"
Vos notes sont prêtes : on prend la photo.
after: Un rond de plus sur main, et l'index est vide, prêt pour la suite.

### 5. Lire l'histoire de l'assistant
command: git log ia/resume
opens: log
Le log liste les commits d'une voie, du plus récent au plus ancien, avec leur auteur : le carnet de bord de l'assistant.
after: Deux commits marqués IA sur ia/resume : une v1, puis une v2. Il a eu des remords.

### 6. Accepter le travail
command: git merge ia/resume
Le résumé vous convient : on rapatrie la voie de l'assistant dans main. C'est la fusion (merge).
after: Les deux voies se rejoignent : main contient maintenant le travail de l'assistant.

### 7. Finalement, défaire une partie
command: git revert HEAD
Appel de Mme Pivert : elle préférait l'ancien résumé. revert ajoute un commit qui annule le précédent, sans réécrire l'histoire : idéal quand le travail est déjà partagé.
after: Un nouveau rond « annulation » est apparu. L'histoire garde la trace de tout, même des changements d'avis.
note: reset recule, revert annule en avançant

## End
summary: Vous savez regarder avant d'accepter, accepter, et défaire proprement. Les clients ont le droit de changer d'avis, et vous avez de quoi suivre.
takeaway: diff pour voir, merge pour accepter, revert pour défaire sans effacer.
next: mission 05-partager-avec-l-equipe
