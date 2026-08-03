export const GUMROAD_DIRECT_FEE_RATE = 0.1;
export const GUMROAD_DIRECT_FLAT_FEE = 0.5;
export const GUMROAD_DISCOVER_FEE_RATE = 0.3;
export const CARD_PROCESSING_RATE = 0.029;
export const CARD_PROCESSING_FLAT_FEE = 0.3;

export interface GumroadInput {
  price: number;
  quantity: number;
  viaDiscover: boolean;
}

export interface GumroadResult {
  grossRevenue: number;
  gumroadFee: number;
  processingFee: number;
  totalFees: number;
  netPayout: number;
  netPerSale: number;
}

export function calculateGumroadPayout(input: GumroadInput): GumroadResult {
  const grossRevenue = input.price * input.quantity;
  const gumroadRate = input.viaDiscover ? GUMROAD_DISCOVER_FEE_RATE : GUMROAD_DIRECT_FEE_RATE;
  const gumroadFee =
    grossRevenue * gumroadRate + (input.viaDiscover ? 0 : GUMROAD_DIRECT_FLAT_FEE * input.quantity);
  const processingFee = grossRevenue * CARD_PROCESSING_RATE + CARD_PROCESSING_FLAT_FEE * input.quantity;
  const totalFees = gumroadFee + processingFee;
  const netPayout = grossRevenue - totalFees;
  const netPerSale = input.quantity > 0 ? netPayout / input.quantity : 0;

  return { grossRevenue, gumroadFee, processingFee, totalFees, netPayout, netPerSale };
}
