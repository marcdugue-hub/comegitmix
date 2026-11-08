---
title: Proposer le travail de l'IA
type: typed
repos: [local, origin]
---

## Prompt
L'assistant « résumé » a fini son travail sur la voie ia/resume, et votre dossier est ouvert dessus. Stéphane veut relire avant que quoi que ce soit n'entre dans main. Proposez ce travail en ligne avec une demande de fusion (MR), en une seule commande glab : la voie n'est pas encore en ligne.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@remote origin
@author ai
git switch -c ia/resume
@work resume.md
git commit -am "résumé en dix lignes"
@author human
```

## Solution
solution: glab mr create --fill
check:
- mr 1 open

## Goal
Une demande de fusion ouverte sur origin : ia/resume demande à rejoindre main.

## Takeaway
Une MR, c'est « relisez avant d'intégrer ». glab mr create --fill envoie la voie en ligne si besoin et reprend le message du dernier commit comme titre ; sans --fill, il faut d'abord un git push.
