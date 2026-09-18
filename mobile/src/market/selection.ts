/**
 * Selected market (symbol) + active chain for the mobile trading app.
 * Shared mutable module — not React state (survives tab remount).
 */
export type SelectedMarket = {
  symbol: string;
  pair: string;
  label: string;
  market?: string | null;
  roundId?: string | null;
  chain: string;
  chainId: number;
};

let selected: SelectedMarket = {
  symbol: "BTC",
  pair: "BTC-USD",
  label: "BTC / USD",
  chain: "monad",
  chainId: 10143,
};

export function getSelectedMarket() {
  return selected;
}

export function setSelectedMarket(next: Partial<SelectedMarket>) {
  selected = { ...selected, ...next };
  return selected;
}
