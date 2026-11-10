# Files

## plan.md
```text
# Report plan — Maison Pivert

This plan sets out the parts of the report and who handles them.

| Part | Owner | Due |
|---|---|---|
| Introduction | You | Tuesday |
| Summary | AI assistant | Wednesday |
| Figures | AI assistant | Wednesday |
| Chapters | You | Thursday |
| Review | Stéphane | Friday |

Report delivery: Friday noon.
```
- This plan sets out the parts of the report, who writes them and by when.
- | Summary | AI assistant | Thursday |
- | Sources | AI assistant | Wednesday |
- Report delivery: Friday noon, after the figures are checked.
- | Figures | AI assistant | Tuesday |
- | Appendices | Stéphane | Thursday |
- This plan sets out the parts of the report; each owner updates their own row.
- | Review | Stéphane and you | Friday morning |
- Report delivery: Friday 5 p.m., as a PDF with the figures spreadsheet.
fallback: _Plan reviewed, version {n}._

## intro.md
```text
# Introduction

Maison Pivert has made wooden toys in the Jura since 1962.

This report reviews the year's sales and suggests ways forward for 2027.

It answers three questions:

- Where did sales grow?
- Which costs weigh most on the margin?
- What should change first?

| Channel | Share of sales | Trend |
|---|---|---|
| Shops | 48% | falling |
| Resellers | 33% | stable |
| Website | 19% | rising |
```
- Maison Pivert has made and sold wooden toys in the Jura since 1962.
- | Website | 19% | +38% over one year |
- This report reviews sales from January to August 2026 and suggests three ways forward for 2027.
- | Shops | 48% | −3 points over one year |
- It answers three simple questions:
- - Where did sales grow, and why?
- | Resellers | 33% | stable, two new resellers |
- - Which costs weigh most on the margin? Wood, above all.
- - What should change first, and with what budget?
fallback: _Introduction reviewed, version {n}._

## resume.md
```text
# Report summary

The report is long and covers many topics.

## Key points

- Sales are up 9% over eight months.
- The website is growing faster than the shops.
- The price of wood has risen by 12%.

| Indicator | 2025 | 2026 |
|---|---|---|
| Sales, January to August | €749k | €816k |
| Average margin | 31% | 29% |
```
- This report presents three key findings for the client.
- - Sales are up 9% over eight months, driven by the spring.
- | Website share | 15% | 19% |
- - The website is growing ten times faster than the shops.
- - The price of wood has risen by 12%, which costs two points of margin.
- | Online orders | 4,100 | 5,700 |
- This report presents three key findings and one recommendation for 2027.
- | Average shop basket | €38 | €41 |
- - Sales are up 9% from January to August, driven by the spring.
fallback: _Summary reviewed, version {n}._

## sources.md
```text
# Sources

All the data in the report comes from these documents.

| Source | Provided by | Date |
|---|---|---|
| 2026 accounting export | Maison Pivert | 3 September |
| Website sales | Maison Pivert | 5 September |
| Price of wood | Jura timber merchant | August |

To check before sending:

- the date of the accounting export;
- the exact title of the note on the price of wood.
```
- | 2026 accounting export | Maison Pivert | 2 October |
- All the figures in the report come from these documents.
- | Interviews in the shops | You | 14 October |
- To check before sending, with Stéphane:
- - the date of the accounting export (done: 2 October);
- | Online customer reviews | AI assistant | 20 October |
- - the exact title of the note on the price of wood (September note).
- | Price of wood | Jura timber merchant | September |
fallback: _Sources checked, version {n}._

## notes.md
```text
# Working notes

Loose notes, to tidy up before Friday.

- Ms Pivert prefers a short summary, one page at most.
- Ask Stéphane for the September figures.
- The AI assistant suggests one chart per sales channel.
- Check the spelling of the shop names.

| To do | Who | Status |
|---|---|---|
| Chart per channel | AI assistant | in progress |
| Review the introduction | You | to do |
```
- | Review the introduction | You | done |
- Loose notes, to tidy up before Friday's delivery.
- - Ms Pivert prefers a short summary: one page, no more.
- | Chart per channel | AI assistant | to review |
- - September figures received from Stéphane, to be added.
- | Update chiffres.csv | AI assistant | to do |
- - Chart per channel approved; the legend is missing.
- - Shop names checked on the Maison Pivert website.
- | Send the report | You | Friday |
fallback: _Note added, version {n}._

## rapport.md
```text
# Report — Maison Pivert

2026 sales review and ways forward for 2027.

Prepared by you with the help of AI assistants, reviewed by Stéphane.

## Contents

- Introduction
- Summary
- Key figures
- Chapter 1: sales channels
- Chapter 2: costs and margin

| Version | Date | Status |
|---|---|---|
| v1 | Monday | draft |
```
- Review of sales from January to August 2026 and three ways forward for 2027.
- | v2 | Wednesday | under review |
- Prepared by you with the help of two AI assistants, reviewed by Stéphane.
- - Introduction (one page)
- | v3 | Thursday | reviewed by Stéphane |
- - Summary for Ms Pivert
- - Key figures and charts
- | v4 | Friday | sent to the client |
- - Chapter 1: shops, resellers and website
fallback: _Report updated, version {n}._

## chiffres.md
```text
# Key figures 2026

Monthly sales and costs of Maison Pivert, in thousands of euros (€k).

| Month | Sales | Costs | Margin |
|---|---|---|---|
| January | 92 | 64 | 30% |
| February | 85 | 60 | 29% |
| March | 101 | 70 | 31% |
| April | 110 | 77 | 30% |
| May | 118 | 84 | 29% |
| June | 124 | 89 | 28% |
| July | 97 | 70 | 28% |
| August | 89 | 65 | 27% |

Source: Maison Pivert accounts, export of 3 September.

The margin drops in summer, when wood costs more.
```
- | June | 126 | 89 | 29% |
- Monthly sales and costs of Maison Pivert, in thousands of euros (€k), excluding tax.
- | September | 104 | 74 | 29% |
- | February | 85 | 61 | 28% |
- Source: Maison Pivert accounts, export of 2 October, checked by the AI assistant.
- | October | 112 | 80 | 29% |
- The margin drops in summer: the price of wood rose by 12% in June.
- | May | 118 | 83 | 30% |
- | November | 131 | 95 | 27% |
fallback: _Figures checked, version {n}._

## chiffres.csv
```text
Month,Sales,Costs,Margin
January,92,64,30%
February,85,60,29%
March,101,70,31%
April,110,77,30%
May,118,84,29%
June,124,89,28%
July,97,70,28%
August,89,65,27%
```
- June,126,89,29%
- September,104,74,29%
- February,85,61,28%
- October,112,80,29%
- November,131,95,27%
- May,118,83,30%
- December,158,112,29%
- August,91,65,29%
- March,101,71,30%
fallback: Revision {n},,,

## chapitres/ch1.md
```text
# Chapter 1 — Sales channels

Maison Pivert sells through three channels: its shops, resellers and its website.

The shops are still the first channel, but their share is shrinking.

The website grows mostly in spring.

| Channel | 2025 sales | 2026 sales | Change |
|---|---|---|---|
| Shops | €382k | €392k | +3% |
| Resellers | €255k | €269k | +5% |
| Website | €112k | €155k | +38% |
```
- Maison Pivert sells through three channels: its four shops, about thirty resellers and its website.
- | Total | €749k | €816k | +9% |
- The shops are still the first channel (48% of sales), but their share is down three points.
- | Shops | €382k | €392k | +2.6% |
- The website grows mostly in May and June, thanks to the sales season.
- | Resellers | €255k | €269k | +5.5% |
- | Website | €112k | €155k | +38.4% |
- Maison Pivert sells through three channels, tracked every month in chiffres.csv.
fallback: _Chapter 1 reviewed, version {n}._

## chapitres/ch2.md
```text
# Chapter 2 — Costs and margin

The average margin goes from 31% to 29% between 2025 and 2026.

The rise in the price of wood explains most of this drop.

| Item | Share of costs | Change |
|---|---|---|
| Wood | 38% | +12% |
| Salaries | 41% | +3% |
| Transport | 12% | +6% |
| Packaging | 9% | +2% |

## Ways forward

- Buy wood in bulk, once a year.
- Group deliveries to resellers.
```
- The average margin goes from 31% to 29% from January to August.
- | Wood | 39% | +12% |
- The rise in the price of wood explains two thirds of this drop.
- | Transport | 12% | +8% |
- - Buy wood in bulk, once a year, from two merchants.
- | Salaries | 40% | +3% |
- - Group deliveries to resellers: one round a week.
- The average margin goes from 31% to 29%, about €16k less over eight months.
- | Packaging | 9% | +1% |
fallback: _Chapter 2 reviewed, version {n}._

## README.md
```text
# AI workshop — getting started with an assistant

This folder holds everything you need to run a half-day workshop on AI assistants, for colleagues who are not developers.

## Contents

- programme.md: the workshop agenda, hour by hour.
- inscrits.csv: the list of participants, to open in a spreadsheet.
- README.md: this file, which GitHub shows on the project page.

| Need | File |
|---|---|
| Prepare the room | programme.md |
| Take attendance | inscrits.csv |

A question? Write to the workshop organiser.
```
- This folder holds everything you need to run a half-day AI workshop, for colleagues who are not developers.
- - programme.md: the workshop agenda, with times and facilitators.
- | Send the invitations | inscrits.csv |
- - inscrits.csv: the list of participants; it opens in any spreadsheet.
- - README.md: this file; GitHub shows it first on the project page.
- | Print the agenda | programme.md |
- A question or an idea? Leave a message on the project's GitHub page.
- | Take attendance | inscrits.csv, Present column |
- This folder gathers the agenda and the list of participants for the AI workshop on Thursday 26 November.
fallback: _README updated, version {n}._

## programme.md
```text
# AI workshop agenda

Thursday 26 November, Jura room, from 9 a.m. to 12:30 p.m.

| Time | Session | Facilitator |
|---|---|---|
| 9:00 | Welcome and coffee | You |
| 9:15 | What an AI assistant can do, and what it cannot | You |
| 10:00 | Hands-on: writing a good request | Stéphane |
| 10:45 | Break | — |
| 11:00 | Demo: two assistants on the same project | You |
| 12:00 | Questions and wrap-up | Stéphane |

Plan one computer for every two people.
```
- | 10:00 | Hands-on: writing a good request, with examples | Stéphane |
- Thursday 26 November, Jura room, from 9 a.m. to 12:30 p.m. Coffee provided.
- | 12:30 | End of the workshop | — |
- Plan one computer for every two people and the guest Wi-Fi code.
- | 9:15 | What an AI assistant can do, and its limits | You |
- | 11:00 | Demo: two assistants, one project, no conflict | You and Stéphane |
- Thursday 26 November, Jura room, from 9 a.m. to 12:30 p.m. Twelve seats.
- | 12:00 | Questions, wrap-up and participant feedback | Stéphane |
- Plan one computer for every two people; the materials will be on GitHub.
fallback: _Agenda adjusted, version {n}._

## inscrits.csv
```text
Name,Department,Session,Present
Camille R.,Accounting,26 November,to confirm
Hugo M.,Sales,26 November,to confirm
Léa B.,Human resources,26 November,to confirm
Karim D.,Logistics,26 November,to confirm
Sophie L.,Marketing,3 December,to confirm
Julien T.,Sales,3 December,to confirm
Inès G.,Management,3 December,to confirm
Thomas P.,Purchasing,26 November,to confirm
```
- Camille R.,Accounting,26 November,yes
- Margot F.,Legal,3 December,to confirm
- Hugo M.,Sales,3 December,to confirm
- Léa B.,Human resources,26 November,yes
- Karim D.,Logistics,26 November,no
- Antoine V.,Quality,26 November,yes
- Thomas P.,Purchasing,26 November,yes
- Sophie L.,Marketing,26 November,yes
- Élise N.,Communication,3 December,to confirm
fallback: Registration {n},,,

## *.md
```text
# {name}

New document, to be completed.

| Point | Detail |
|---|---|
| Purpose | to be specified |
| Owner | to be decided |

- First idea to develop.
- Questions to ask Stéphane.
```
- Working document, first version.
- | Purpose | describe the need in two sentences |
- - First idea, developed in three points.
- | Owner | You |
- | Due | Friday |
- - Questions sent to Stéphane, answer expected Thursday.
- | Status | draft |
- Working document, reviewed once and completed.
fallback: _Update, version {n}._

## *.csv
```text
Item,Value
Title,{name}
Author,You
Status,draft
Version,1
```
- Status,in progress
- Version,2
- Reviewed by,Stéphane
- Source,spreadsheet export
- Status,to review
- Version,3
- Comment,figures checked
- Status,approved
fallback: Addition {n},

## *.txt
```text
Quick notes: {name}

To sort before Friday.

- an idea to explore
- a question to ask Stéphane
- a link to keep
```
- Quick notes, read through once.
- To sort before Friday, with the AI assistant.
- - an idea to explore: one chart per channel
- - a question for Stéphane: the delivery date
- - a link to keep: the figures table
- Quick notes, sorted.
- To sort: nothing left, everything is tidy.
- - an idea kept: one chart per channel
fallback: Note added, version {n}.
