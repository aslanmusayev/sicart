export function azn(amount: number): string {
  return `₼${amount.toFixed(2)}`;
}

/** For speech: 5.3 -> "5 manat 30", 0.9 -> "90 qepik". */
export function spokenAzn(amount: number): string {
  const cents = Math.round(amount * 100);
  const manat = Math.floor(cents / 100);
  const qepik = cents % 100;
  if (!manat) return `${qepik} qepik`;
  return qepik ? `${manat} manat ${qepik}` : `${manat} manat`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
