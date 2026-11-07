---
title: Une voie pour l'IA
duration: 12
repos: [local]
unlocks: [branch, switch, diff]
---

> duo: Vous voulez qu'un assistant IA propose une nouvelle version du résumé. S'il écrit directement sur main, vous perdez la version de référence. Donnons-lui sa propre voie.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@work intro.md
git commit -m "intro"
```

## Steps

### 1. Ouvrir une voie pour l'IA
command: git branch ia/resume
Une branche est une voie parallèle. Elle part du commit où vous êtes.
after: Une nouvelle voie ia/resume part du dernier commit. Votre dossier, lui, est toujours sur main.

### 2. Se placer sur cette voie
command: git switch ia/resume
accepts: git checkout ia/resume
Votre dossier suit maintenant la voie de l'IA. Ce qui sera enregistré ira sur cette voie.
after: HEAD est passé sur ia/resume. Le fil de votre dossier pointe vers la nouvelle voie.

### 3. Laisser l'IA travailler
command: (bouton « Faire travailler l'IA »)
check: commits ia/resume since main = 1
L'IA modifie le résumé puis enregistre son travail.
after: Un rond marqué IA est apparu sur ia/resume. main n'a pas bougé.

### 4. Voir ce que l'IA a changé
command: git diff main ia/resume
opens: diff
diff-mode: branches
Le diff compare deux voies : en rouge ce qui a été retiré, en vert ce qui a été ajouté. Rien n'est modifié.
after: Vous voyez exactement les lignes réécrites par l'IA.

### 5. Revenir sur la version de référence
command: git switch main
Le travail de l'IA reste sur sa voie, prêt à être relu ou fusionné plus tard.
after: Votre dossier est revenu sur main : le résumé y est dans sa version d'origine.

## End
summary: L'IA peut proposer sans rien casser : sa voie est séparée de la vôtre.
takeaway: Une branche par sujet ou par assistant. diff pour voir avant d'accepter.
next: mission 03-deux-assistants
