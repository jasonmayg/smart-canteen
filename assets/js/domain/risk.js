// Inspection risk ranking and supply-chain credit sizing. Simple, transparent rules.

export const riskOf = a => a.sev * (1 + .5 * a.rep) * (1 + a.days / 30);

export function creditLimit({ students, price, days, deposit }) {
  const monthly = students * .85 * price * days; const byContract = monthly * 1.5 * .8, byDeposit = deposit * 5;
  return { monthly, byContract, byDeposit, limit: Math.max(0, Math.min(byContract, byDeposit)) };
}

