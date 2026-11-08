---
title: Relire une MR
duration: 12
repos: [local, origin]
unlocks: [stash, worktree-remove, mr-approve, mr-merge]
mode: stepper
---

## Setup
```git-setup
@files plan.md intro.md resume.md chapitres/ch1.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg graphiques/couts.svg
git commit -m "graphique ventes"
git commit -m "graphique coûts"
@work chapitres/ch1.md
git commit -m "chapitre 1 mis à jour"
@author human
git switch main
@work intro.md
git commit -m "intro"
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Ajout des graphiques" comments=2
@work plan.md intro.md
```

## Part A — Sur une branche
> duo: Vendredi matin. L'assistant « graphiques » a ouvert la MR !42 sur sa branche ia/graphiques : une demande de fusion, qui dit « relisez mon travail, puis intégrez-le à main ». Vous, vous êtes en pleine retouche du plan et de l'intro. Relisons d'abord de la façon classique : en changeant de branche.

### 1. Regarder son travail en cours
command: git status
Avant de changer de branche, on regarde ce qui est en cours.
after: Deux fichiers modifiés (M) : votre travail n’est pas encore enregistré.

### 2. Ranger son travail
command: git stash
check: stash rpt-client = 1
Le stash est un tiroir : on y range le travail en cours pour changer de branche sans l’emporter ni le perdre.
after: Vos M ont disparu du dossier : ils sont rangés dans le tiroir (le stash), en zone ③.
note: Votre travail est caché, pas perdu.

### 3. Récupérer la branche de la MR
command: git fetch origin
check: remote ia/graphiques fetched
On télécharge ce qui est en ligne, sans toucher à votre dossier.
after: La voie de la MR existe maintenant chez vous, sous le nom origin/ia/graphiques.

### 4. Ouvrir la branche de la MR
command: git switch ia/graphiques
check: desk rpt-client on ia/graphiques
Votre dossier prend le contenu de la branche de la MR.
after: Votre dossier a changé de contenu : le dossier graphiques/ est apparu. Le fil part maintenant vers la voie bleue.
note: Même dossier, autre contenu : vous n’êtes plus sur main.

### 5. Relire avec diff
command: git diff main...ia/graphiques
opens: diff
diff-mode: branches
On compare la branche de la MR avec main. Les trois points veulent dire : seulement ce que la MR apporte.
after: Deux fichiers ajoutés (A) et un modifié (M). L’écran de diff permet de les lire ligne à ligne.

### 6. Approuver la MR
web: approve MR !42
check: mr 42 approved
La relecture est faite, et pas un seul camembert en 3D : on donne son accord en ligne.
after: La MR est approuvée. Elle pourra être fusionnée dans main.

### 7. Revenir et ressortir son travail
command: git switch main && git stash pop
check:
- desk rpt-client on main
- stash rpt-client = 0
Retour sur main, puis on ressort le travail du tiroir.
after: Vous êtes revenu sur main et vos deux M sont de retour. Sans stash pop, ils dormiraient encore dans le tiroir.

### Part end
summary: Ça marche, mais votre bureau a été dérangé pendant toute la revue, et il fallait penser au stash pop.

## Part B — Dans un worktree
> duo: Même MR, autre méthode : on ouvre un deuxième dossier rien que pour la relecture. Gardez un œil sur votre bureau pendant toute la mission : normalement, il ne lui arrive rien.

### 1. Récupérer la branche de la MR
command: git fetch origin
check: remote ia/graphiques fetched
On télécharge ce qui est en ligne, sans toucher à votre dossier.
after: La voie de la MR existe chez vous, sous le nom origin/ia/graphiques. Vos M n’ont pas bougé.

### 2. Ouvrir un bureau de revue
command: git worktree add ../revue-mr-42 ia/graphiques
check:
- desk revue-mr-42 on ia/graphiques
- work-intact rpt-client
Un deuxième dossier, ouvert sur la branche de la MR. Pas besoin de tiroir : votre bureau reste tel quel.
after: Un nouveau dossier revue-mr-42 est apparu, relié à la voie bleue. Votre bureau est intact, à 60 % : vous travaillez maintenant dans la revue.
note: Votre bureau n’a pas bougé : vos M sont toujours là.

### 3. Relire avec diff
command: git diff main...ia/graphiques
opens: diff
diff-mode: branches
Dans le dossier de revue, on compare la branche de la MR avec main : seulement ce que la MR apporte.
after: Deux fichiers ajoutés (A) et un modifié (M). L’écran de diff permet de les lire ligne à ligne.

### 4. Approuver puis fusionner
web: approve MR !42 ; merge MR !42
check: mr 42 merged
On donne son accord, puis on fusionne la MR dans main, en ligne.
after: La MR est fusionnée sur origin : origin/main a avancé. Votre main local, lui, n’a pas encore bougé.
note: Fusionné en ligne : il faudra le récupérer.

### 5. Ranger le bureau de revue
command: git worktree remove ../revue-mr-42
check: desk revue-mr-42 removed
Le dossier de revue a fini son travail : on le supprime. Pas de cartons à faire.
after: Le dossier de revue a disparu. La branche ia/graphiques, elle, existe toujours dans le .git.

### 6. Mettre main à jour
command: git pull
check:
- main = origin/main
- work-intact rpt-client
Dans votre bureau, on récupère la fusion faite en ligne.
after: main a avancé jusqu’à la fusion, et vos deux M sont toujours là : votre travail n’a jamais été dérangé.

### Part end
summary: Votre travail n’a jamais bougé. Le dossier de revue se crée en une commande et se jette après usage.

## End
summary: Vous savez relire une MR de deux façons. Les graphiques sont dans main, et votre intro n’a pas perdu une virgule. Comparez les deux méthodes sur l'écran suivant.
takeaway: Avec du travail en cours, relisez dans un worktree : votre bureau ne bouge pas.
next: compare 06b-deux-facons
