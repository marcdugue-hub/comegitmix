---
title: Une voie pour l'IA
duration: 12
repos: [local]
unlocks: [branch, switch, diff]
---

> duo: Mardi. Vous demandez à l'assistant IA « résumé » une version plus courte du résumé. Il est plein d'enthousiasme, parfois trop : s'il écrit directement sur main, votre version de référence y passe. Donnons-lui sa propre voie.

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
Une branche est une voie parallèle à main, la voie de la version de référence. Elle part du commit où vous êtes.
after: La voie ia/resume est née, au niveau du dernier commit. Votre dossier, lui, est toujours sur main.

### 2. Se placer sur cette voie
command: git switch ia/resume
accepts: git checkout ia/resume
Votre dossier suit maintenant la voie de l'IA : ce qui sera enregistré ira sur cette voie, pas sur main.
after: HEAD, le repère « vous êtes ici », est passé sur ia/resume. Le fil de votre dossier pointe vers la nouvelle voie.

### 3. Laisser l'IA travailler
command: (bouton « Faire travailler l'IA »)
check: commits ia/resume since main = 1
L'IA réécrit le résumé puis enregistre son travail. Vous, vous pouvez finir votre café.
after: Un rond marqué IA est apparu sur ia/resume. main n'a pas bougé d'un millimètre.

### 4. Voir ce que l'IA a changé
command: git diff main ia/resume
opens: diff
diff-mode: branches
Le diff compare deux voies ligne à ligne : signe − pour ce qui a été retiré, signe + pour ce qui a été ajouté. On regarde, on ne touche à rien.
after: Vous voyez exactement les lignes réécrites par l'IA. Plus court, oui. Mieux ? C'est vous qui jugez.

### 5. Revenir sur la version de référence
command: git switch main
Le travail de l'IA reste sur sa voie, bien au chaud, prêt à être relu ou fusionné plus tard.
after: Votre dossier est revenu sur main : le résumé y est dans sa version d'origine. Les deux versions existent, sans se marcher dessus.

## End
summary: L'IA peut proposer tout ce qu'elle veut : sa voie est séparée de la vôtre, et c'est vous qui décidez.
takeaway: Une branche par sujet ou par assistant. diff pour voir avant d'accepter.
next: mission 03-deux-assistants
