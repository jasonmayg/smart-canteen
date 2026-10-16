# Architecture

A static web app with no build step, no framework and no backend. Product logic is kept apart from the UI so it can be read and tested on its own.

```
index.html             loads assets/app.css and assets/js/main.js (ES module)
assets/js/
  main.js              shell, sidebar, router
  state.js             versioned store in localStorage, change listeners, activity feed, seed data
  lib/
    format.js          money, numbers, escaping, seeded RNG (pure)
    ui.js              $, toast, modal, icons, ring chart (DOM)
  domain/              product logic: pure, DOM-free, unit-tested
    data.js            fictional dish library, schools, alerts, checklist
    menu.js            nutrition totals; week planner under cost cap + allergen exclusions
    forecast.js        next-day headcount with back-tested 80% range
    risk.js            inspection risk ranking; credit limit sizing
    nutrition.js       plain-language insights from a week of lunches
    rules.js           checkout rules: allergies, parent blocks, daily limit, balance
  services/vision.js   recognition: simulated detector for sample trays; live vision model for photos
  render/tray.js       procedural Canvas trays and dish thumbnails
  views/               one file per page (family, checkout, kitchen, district, finance, overview, settings)
tests/domain.test.mjs  node:test, run in CI on every push
```

## Rules the code follows

1. **Domain code never touches the DOM.** It runs in Node, which is how the tests run it.
2. **Checkout decisions are a pure function.** Recognition returns items, then `applyRules(items, controls, allergies)` marks each one blocked or allowed with a reason, and `decide()` returns totals plus `overLimit`, `short` and `canPay`. The view only renders that result.
3. **Allergies outrank everything.** They are checked before spending rules and can’t be overridden by them. Items the model couldn’t match to the dish library have unknown allergens and are flagged for a staff check.
4. **Model output is untrusted input.** Vision results are parsed from JSON, clamped, and matched to the dish library for price and allergens; unmatched items are labeled as model estimates.
5. **Every AI feature works without a key.** Sample trays use a simulated detector, so the whole flow can be tried offline.
