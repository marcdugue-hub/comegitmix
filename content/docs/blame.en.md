---
title: git blame
summary: Find out who wrote each line of a file, and in which commit.
syntax: git blame <file>
see: [log, show, diff]
---

## What it does

The name sounds harsh, but the intent is kind: `git blame` shows a file **line by line**, and next to each line, the commit that wrote it and its author.

It is useful before changing a passage you do not understand: who wrote it, and why? When an AI drafted part of the document, blame tells you exactly **which** part.

## In the game

The terminal shows each line of the file, preceded by the commit it comes from and the label **AI** or **Human**. The explanation does the count: how many lines come from the AI out of the total. Nothing moves in the scene: blame looks, it changes nothing.

## Example

- `git blame report.md`: who wrote what in the report?
- `git show c7`: open the commit behind a line that puzzles you.
- `git log`: place that commit in the story of the lane.

## Watch out

Blame reads the version **from the last commit**, not the one in your folder: your changes in progress do not show up. The file must also have been committed already, otherwise Git does not know it. Finally, blame gives the author of a line, not the culprit of a problem: it is often a team effort.
