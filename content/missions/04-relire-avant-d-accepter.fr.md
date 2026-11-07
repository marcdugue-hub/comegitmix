---
title: Relire avant d'accepter
duration: 14
repos: [local]
unlocks: [log, merge, revert, restore, reset, blame]
---

> duo: L'assistant « résumé » a fini. Avant d'accepter son travail, on relit, on garde ce qui est bon, et on sait défaire ce qui ne l'est pas.

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
git diff seul montre vos modifications pas encore préparées. Regardez : notes.md n'y est pas.
after: Seul intro.md apparaît. Un fichier nouveau (U) n'est pas dans git diff tant qu'il n'est pas préparé.
note: U = Git ne le suit pas encore

### 2. Ce qui est préparé
command: git add intro.md notes.md
after: Les deux fichiers sont dans l'index : intro.md en M bleu, notes.md en A.

### 3. Vérifier ce qui partira dans le commit
command: git diff --staged
opens: diff
diff-mode: staged
--staged montre exactement ce qui est dans l'index, donc ce qui partira dans le prochain commit.
after: On retrouve intro.md et, cette fois, notes.md.

### 4. Enregistrer
command: git commit -m "Notes et intro"
accepts: git commit -m "*"
after: Un rond de plus sur main, l'index est vide.

### 5. Lire l'histoire de l'assistant
command: git log ia/resume
opens: log
Le log liste les commits d'une voie, du plus récent au plus ancien, avec leur auteur.
after: Deux commits marqués IA sur ia/resume.

### 6. Accepter le travail
command: git merge ia/resume
On rapatrie la voie de l'assistant dans main.
after: Les deux voies se rejoignent : main contient maintenant le travail de l'assistant.

### 7. Finalement, défaire une partie
command: git revert HEAD
revert ajoute un commit qui annule le précédent, sans réécrire l'histoire : idéal quand le travail est déjà partagé.
after: Un nouveau rond « annulation » est apparu. L'histoire garde la trace de tout.
note: reset recule, revert annule en avançant

## End
summary: Vous savez voir avant d'accepter, accepter, et défaire proprement.
takeaway: diff pour voir, merge pour accepter, revert pour défaire sans effacer.
next: mission 05-partager-avec-l-equipe
