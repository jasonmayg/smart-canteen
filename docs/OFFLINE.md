# Offline checkout

Four hundred students go through the line in 25 minutes. If the school’s internet drops, the line can’t stop, and no child should be sent away without lunch. The checkout is built to keep selling offline and to settle honestly afterwards.

## What happens offline

| | Offline behaviour |
|---|---|
| App | Opens with no network (service worker precaches the app shell) |
| Recognition | Sample trays use the on-device detector and keep working. Photo recognition uses a cloud model, so it waits |
| Payment | Student card: yes. Face: yes, on-device, only for students whose parent opted in. Parent QR: no, it needs the parent’s phone online |
| Balances | Checked against the balance each wallet had when service started (cached on the terminal) |
| Limits | $8 per sale and $15 per student until the connection is back, to cap the credit risk |
| Parent app | Shows lunches bought offline as pending until they settle |

## Settlement

When the terminal reconnects, queued sales are applied to the real wallets (`domain/pos.js`):

1. **In the order they happened**, so balances move the way they would have online.
2. **Once.** Each sale has an id; a sale already settled is skipped, so a flaky reconnect can resend safely.
3. **Shortfalls are handled, not hidden.** If the parent spent from the wallet meanwhile and it can’t cover a lunch, auto top-up covers it when it’s on; otherwise the amount is recorded as owed and the parent is told. The lunch itself is never reversed.
4. The terminal’s end-of-service report (count, total, by payment method) then matches the wallets.

## Try it

1. In **Canteen checkout**, click **Online** in the top bar (or switch off your network).
2. Scan *Mia, today* and pay with face; scan *Leo, today* and pay by card. Parent QR is disabled.
3. Click **Meanwhile, the wallet pays a $40 trip fee**.
4. Reconnect: two sales settle, and auto top-up covers the shortfall.

## In production

- The sale queue would live in IndexedDB on the terminal, with the balance cache signed and time-limited.
- Card readers keep a local allow-list of active card ids; face templates (opted-in students only) are stored encrypted on the terminal and deleted on withdrawal.
- Settlement runs server-side with the same `domain/pos.js` rules, so terminal and server agree.
