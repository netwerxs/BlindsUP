# Payout Structure

Reference for the home game. The clock and the payout math live in `index.html`
(the **Payout** button on the right-hand column) — this file just records the
structure and the terms.

## Format: tournament, not a cash game

Fixed buy-in, equal starting stacks, blinds rise on the BlindsUP clock, play
down to one winner, prize pool split among the top 3. Tournament chips have no
cash value. The house's cut is a one-time **fee**, not a per-pot rake ("rake" is
a cash-game term).

## Terminology

| Term | Meaning |
|---|---|
| Buy-in | $20. Buys a 6,500-chip starting stack. |
| Starting stack | 6,500 chips. |
| Rebuy | A second $20 buy-in for another 6,500 chips, available **only after a player busts to zero** and **only during the rebuy period**. A player who still has chips cannot rebuy. |
| Rebuy period | Levels 1–5 (100/200 through 500/1000), plus the 1-minute break after level 5. |
| Rebuy cutoff | **When level 6 (600/1200) begins.** From that point on, no rebuys are sold. |
| Freezeout | Strictly, a tournament with no rebuys at all. Ours plays freezeout-style from **level 6 (600/1200)** onward: a bust is elimination. |
| Prize pool | Every buy-in + every rebuy, added together. |
| Fee (house cut) | 10% of the pool, before payouts. The Payout sheet labels this line **"House"** — same thing. Because each payout is rounded to the nearest $5, the effective cut lands a little **above or below** 10% (the sheet shows the exact figure, e.g. "10% + $4.00" or "10% − $3.00"). |
| Payout structure | The % split of the post-fee pool to the paid places. |
| ITM ("in the money") | The paid places — here, the top 3. |
| Bubble | 4th place: the last player out before the money. |

No add-on is offered. If one is ever added, it also counts toward the prize pool.

## Tables

| Game | Tables | Seating | Field |
|---|---|---|---|
| Standard | 2 | 9 + 9 | 18 |
| Larger | 3 | 9 + 8 + 8 | 25 |

## Payout

**Top 3 paid — 50% / 30% / 20% of the post-fee pool — every field size.**

The split does not change with the field. (3 paid is 16.7% of an 18-field, 12%
of a 25-field.)

### Final-3 deal presets

If the last three players make a deal, the Payout sheet's **Other Options**
button (next to the **Payout split** ratio) offers three alternatives to the
standard laddered 3-way:

| Preset | 1st | 2nd | 3rd | Notes |
|---|---|---|---|---|
| 3-way (default) | 50% | 30% | 20% | standard ladder |
| Even 3-way | 33% | 33% | 33% | all three chop equally (⅓ each) |
| 1st + 2nd | 40% | 40% | 20% | top two chop evenly, 3rd keeps 20% |
| 2nd + 3rd | 50% | 25% | 25% | 2nd & 3rd chop evenly, 1st keeps 50% |

Every preset still pays out the full post-fee pool, so the house stays at its
base 10% (give or take the nearest-$5 rounding).

## Doing the math

Use the **Payout** button in BlindsUP. It is a **physical cash-count** tool —
enter how many $100 / $50 / $20 / $10 / $5 bills are in the box, and it:

1. totals the cash,
2. takes 10% for the House (the fee),
3. splits the rest 50 / 30 / 20, each rounded to the **nearest $5** (ties up),
4. settles the rounding difference against the House line (which can therefore
   sit just above or below 10%),
5. shows each place's raw pre-round figure in small type, and
6. lists which bills to hand to 1st / 2nd / 3rd; the House keeps the rest.

Do not recompute the fee, rounding, or the split by hand — the sheet is the
source of truth.
