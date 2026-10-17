# PRD — Smart School Canteen (portfolio demo)

**Author:** Jason Geng  
**Status:** v3 prototype  
**Type:** interactive product prototype with simulated data

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

**Student at the counter (v2)**
- C1 Put the tray down; the camera recognizes every dish, portion and nutrition in under 5 seconds
- C2 Pay with face, student card, or a parent-approved QR code; no cash, no cashier
- C3 Items the parent has blocked (desserts, sugary drinks) are flagged before payment and never charged
- C4 Spending above the parent's daily limit is declined at the counter
- C5 Anything containing the child's allergens is stopped before payment, regardless of other rules; items the model can't match to the dish library are flagged for a staff check

**Counter quality (v3)**
- Q1 Items recognized under 80% confidence are highlighted for the cashier
- Q2 The cashier can swap a dish, remove an item or add a missed one; each fix is saved for retraining
- Q3 Recognition accuracy (right first time, wrong dish, missed) and most-confused pairs are computed from fixes

**Face pay and consent (v3)**
- B1 Face pay is opt-in only, by a parent or guardian, per child, after a plain-language notice
- B2 Withdrawal is one tap and deletes the face template within 24 hours
- B3 The student card always works; parent QR works when online
- B4 Consent changes are logged; the district sees enrollment and withdrawals by school; schools can choose not to enable face pay

**Offline service (v3)**
- X1 The checkout keeps selling when the network drops, against balances cached at the start of service
- X2 Offline limits cap the risk: $8 a sale, $15 a student; parent QR and photo recognition pause
- X3 On reconnect, sales settle once, in order; shortfalls are covered by auto top-up or recorded as owed and the parent is told
- X4 The app installs and opens with no network

**Roles (v3)**
- A1 District food-safety officer → school principal → canteen departments (checkout, kitchen, finance) → parent → student
- A2 Each level grants only roles below its own, inside its scope; only the school registers a parent; parents manage their own children
- A3 Pages and actions follow permissions (a cashier sees checkout only; a cook sees the kitchen; the district can’t take payments)

**Parent, money and rules (v2)**
- P6 Top up the wallet from a bank account or debit card
- P7 Set a daily counter limit, block desserts or sugary drinks, turn on auto top-up
- P8 Get a notification after each lunch with the dishes, calories and amount charged
- P9 See a week of recognized lunches with plain-language insights (missed vegetables, treats, protein)

## 5. AI & algorithm features

| Feature | Decision it changes | Method in demo | Honest label |
|---|---|---|---|
| **Demand forecast** | How many meals to cook tomorrow | Weighted day-of-week average + recent trend + event adjustments (exam day, field trip, weather), with a prediction interval from historical error | Real algorithm on simulated history |
| **Menu planner** | Next week's menu | Constrained optimization: pick dishes to hit calorie/protein/vegetable targets, respect allergens and variety rules, stay under cost cap (greedy + local search) | Real algorithm on a fictional dish library |
| **Kitchen-camera alerts** | Which kitchen to inspect today | Simulated detection events, ranked by a risk score (severity × repeat offences × time since last inspection) | Detection simulated; risk ranking real |
| **Tray recognition** | What the student actually took, and what it costs | Demo: on-device detector over sample trays. Real mode: a vision model (Claude) returns dishes, portions, nutrition and bounding boxes as JSON; results are matched to the canteen's dish library for price and allergens, and unmatched items are labeled as model estimates | Sample trays simulated; photo mode real |
| **Rule enforcement** | Whether an item can be bought | Allergies first, then parent rules (blocked categories, daily limit), applied to recognized items before payment | Real logic, unit-tested |
| **Recognition accuracy** | Whether the recognizer is good enough, and what to retrain | Measured from cashier corrections; low-confidence flagging at 80% | Real code, simulated history |
| **Offline settlement** | Whether a lunch sold offline gets paid | Ordered, idempotent settlement with auto top-up or owed balance | Real code |
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
- Face recognition of minors is regulated (BIPA in Illinois, and similar laws in Texas and Washington; COPPA under 13): written parental consent, retention limits and a non-biometric alternative are required, and some districts will opt out entirely.
- Offline sales are credit risk: limits per sale and per student, and an owed-balance process with the parent.
- Camera AI raises privacy concerns for kitchen staff — alerts show events, never faces; footage retention policy needed.
