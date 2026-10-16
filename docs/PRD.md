# PRD — Smart School Canteen (portfolio demo)

**Author:** Jason Geng · **Status:** v1 demo · **Type:** interactive prototype with simulated data

> This demo re-creates, from scratch and with fictional data, the product thinking behind a school-catering platform I led. No code, data, designs or names from the original product are used.

---

## 1. Problem

School lunch involves five parties who don't share information:

| Party | Job to be done | Today's pain |
|---|---|---|
| **Parent** | "Make sure my kid eats well, and know where my money goes" | Pays a lump sum in cash or by bank transfer; can't see menus, nutrition or kitchen hygiene; refunds for sick days are manual |
| **Student** | "Get a good lunch fast" | Long queues, repetitive menus, lost meal cards |
| **Kitchen / caterer** | "Cook the right amount, safely, and stay solvent" | Headcount is a guess, so 10–20% of food is wasted; paper safety logs; suppliers want cash now but schools pay 45–60 days later |
| **School** | "Keep parents happy without teachers doing admin" | Teachers collect fees and field complaints |
| **Regulator (education bureau)** | "No food-safety incidents, no misused money" | Can't see inside hundreds of kitchens; audits are manual and after the fact |

**Core insight:** money, food and safety data are three views of the same flow. If the platform carries the money (fees → escrow → procurement → repayment), the food and safety data come with it.

## 2. Goals & non-goals

**Goals (demo)**
1. Show the end-to-end flow from one parent's pre-order to the kitchen's production plan to the regulator's dashboard.
2. Demonstrate three AI/algorithmic features that change a decision, not just display data.
3. Make the business model legible: escrow, traceable procurement, supply-chain finance.

**Non-goals:** real payments, real authentication, real computer vision, mobile-native app.

## 3. Personas & views

The demo has one role switcher with four views:

1. **Parent** — Lin, mother of a 4th-grader
2. **Kitchen** — operations manager of a caterer serving 3 schools
3. **Regulator** — food-safety officer at a district education bureau
4. **Finance** — caterer applying for working capital

## 4. User stories (MVP)

**Parent**
- P1 See next week's menu with calories, protein and allergens per dish
- P2 Pre-order meals for next week (choose standard / light / halal set per day) and see the total
- P3 Mark sick days and get an automatic refund back to the wallet
- P4 See the child's nutrition summary vs. age guidelines
- P5 See where the money is: wallet balance held in escrow vs. released to the kitchen

**Kitchen**
- K1 See tomorrow's confirmed orders by school and set type
- K2 Get an **AI demand forecast** for un-confirmed days with a confidence range, and a recommended production quantity
- K3 Turn orders into an **ingredient purchase list** (bill of materials × headcount)
- K4 Complete the daily food-safety checklist (morning health check, sample retention, disinfection, temperature)
- K5 Use the **AI menu planner** to generate a week of menus that meets nutrition targets under a cost-per-meal cap

**Regulator**
- R1 District dashboard: schools, meals served, safety-checklist completion, open alerts
- R2 **AI kitchen-camera alerts** (simulated events: missing hairnet, raw/cooked cross-contact, high fridge temperature) with severity and follow-up status
- R3 Escrow view: fees collected vs. released, by school
- R4 Procurement traceability: every purchase with supplier, batch certificate and bank-payment reference

**Finance**
- F1 Caterer enters a school contract; system sizes a credit limit
- F2 Simulate the repayment: each meal-fee settlement auto-splits a share to repay the loan; show days to full repayment

## 5. AI & algorithm features

| Feature | Decision it changes | Method in demo | Honest label |
|---|---|---|---|
| **Demand forecast** | How many meals to cook tomorrow | Weighted day-of-week average + recent trend + event adjustments (exam day, field trip, weather), with a prediction interval from historical error | Real algorithm on simulated history |
| **Menu planner** | Next week's menu | Constrained optimization: pick dishes to hit calorie/protein/vegetable targets, respect allergens and variety rules, stay under cost cap (greedy + local search) | Real algorithm on a fictional dish library |
| **Kitchen-camera alerts** | Which kitchen to inspect today | Simulated detection events, ranked by a risk score (severity × repeat offences × time since last inspection) | Detection simulated; risk ranking real |
| **Credit sizing** | How much working capital to extend | Contract value × months × advance rate, capped by deposit | Simple rule, shown transparently |

## 6. Success metrics (what I would measure in production)

| Area | Metric | Target |
|---|---|---|
| Adoption | % of parents pre-ordering weekly | > 70% within one term |
| Waste | Cooked minus served, % | from ~15% to < 5% |
| Forecast | Mean absolute % error of next-day headcount | < 5% |
| Safety | Daily checklist completion | > 98% |
| Alerts | Median time from alert to resolution | < 24h |
| Finance | Caterer days-to-cash after delivery | from 45–60 days to < 7 |
| Trust | Parent complaints per 1,000 meals | −50% |

## 7. Demo script (2 minutes)

1. **Parent:** open next week's menu → pre-order → mark Wednesday as sick → refund appears → wallet shows funds in escrow.
2. **Kitchen:** tomorrow's orders include Lin's child → forecast for Friday shows 412 ± 18 → "cook 420" → purchase list → run AI menu planner with a $3.20 cap.
3. **Regulator:** dashboard → open a high-risk camera alert → mark as inspected → escrow and procurement trail.
4. **Finance:** enter a contract → credit limit → repayment simulation.

## 8. Risks & open questions

- Parents' trust in escrow depends on a bank partner, not the app — UX must show the bank as custodian.
- Forecasts can be gamed if kitchens are measured on waste only — pair waste with "ran out" incidents.
- Camera AI raises privacy concerns for kitchen staff — alerts show events, never faces; footage retention policy needed.
