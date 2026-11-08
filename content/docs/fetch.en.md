---
title: git fetch
summary: See what changed online, without touching anything on your side.
syntax: git fetch [<remote>]
see: [pull, push, remote]
---

## What it does

While you work, Stéphane and his AIs send their work online. Your computer knows nothing about it until you ask. `git fetch` gets the news: it **downloads** the commits (the "snapshots" of the project) and updates what your repository knows about the online version.

It is a command for the careful and curious: it **changes neither your lanes nor your files**. You look first, you decide afterwards.

## In the game

In **The lanes**, dashed labels `origin/main`, `origin/ia/resume`… settle on the downloaded commits. They show where the online version stands. Your own lanes and your folder do not move an inch.

With no name, fetch asks `origin`. With `--all`, it asks every known online repository (origin and upstream).

## Example

- `git fetch`: anything new on origin?
- `git fetch upstream`: and on the original project?
- `git merge origin/main`: you decide to bring the online version into your lane.

## Watch out

A lane the AI only sent online (for a merge request, say) does not exist on your computer: you need a `git fetch` to see it and open its diff. And if fetch found nothing, it simply means nothing changed online.
