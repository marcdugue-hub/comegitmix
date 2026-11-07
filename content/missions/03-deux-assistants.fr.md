---
title: Deux assistants, un seul projet
duration: 12
repos: [local]
unlocks: [worktree-add, worktree-list]
---

> duo: Mercredi. Un second assistant arrive pour vérifier les chiffres du rapport Pivert. Deux IA dans le même dossier, c'est comme deux personnes sur le même clavier. Donnons à chacune son bureau et sa voie.

## Setup
```git-setup
@files plan.md intro.md resume.md chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@work intro.md
git commit -m "intro"
```

## Steps

### 1. Un bureau pour l'assistant « résumé »
command: git worktree add ../rapport-ia-resume -b ia/resume
hint: git worktree add, puis le chemin du nouveau dossier, puis -b et le nom de la branche.
Un worktree est un dossier de plus, relié au même dépôt (le .git, la mémoire du projet). L'IA y travaille sur sa propre branche, sans toucher à votre dossier.
after: Un nouveau dossier rapport-ia-resume est apparu, relié à la voie orange. Il n'y a toujours qu'un seul .git.
note: Un bureau = un vrai dossier sur votre ordinateur

### 2. Un bureau pour l'assistant « chiffres »
command: git worktree add ../rapport-ia-chiffres -b ia/chiffres
Même chose pour l'assistant « chiffres », celui qui recompte tout deux fois : un autre dossier, une autre branche, le même dépôt.
after: Trois dossiers, trois voies, un seul .git. Le bureau s'agrandit, la mémoire reste commune.

### 3. Les laisser travailler en parallèle
command: (bouton « Faire travailler l'IA » sur les deux bureaux)
check:
- commits ia/resume since main = 1
- commits ia/chiffres since main = 1
Chaque assistant travaille dans son dossier. Personne n'écrase personne, personne ne se dispute la souris.
after: Chaque voie a avancé de son côté. Votre dossier n'a pas bougé.

### 4. Relire le travail du premier assistant
command: git diff main ia/resume
opens: diff
diff-mode: branches
Avant de garder quoi que ce soit, on compare la voie de l'assistant « résumé » avec main.
after: Vous voyez les lignes changées par l'assistant « résumé ». Le tri, ce sera demain.

### 5. Voir où l'on en est
command: git worktree list
Cette commande liste chaque dossier et la branche qu'il a ouverte : le plan de table de l'équipe.
after: Trois dossiers, chacun sur sa branche. Tout le monde est à sa place.

## End
summary: Trois bureaux, une seule histoire. Chaque assistant avance sur sa voie sans gêner les autres, ni vous.
takeaway: Un worktree n'est pas une copie du dépôt : c'est un dossier de plus, relié au même .git.
next: mission 04-relire-avant-d-accepter
