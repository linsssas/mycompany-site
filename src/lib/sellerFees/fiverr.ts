export const FIVERR_SELLER_FEE_RATE = 0.2;
export const FIVERR_BUYER_SERVICE_FEE_RATE = 0.055;

export const FIVERR_WITHDRAWAL_METHODS = [
  { key: "paypal", label: "PayPal", flatFee: 1 },
  { key: "bank", label: "Direct bank / Payoneer transfer", flatFee: 3 },
  { key: "fivererCard", label: "Fiverr Revenue Card", flatFee: 0 },
] as const;

export type FiverrWithdrawalMethod = (typeof FIVERR_WITHDRAWAL_METHODS)[number]["key"];

export interface FiverrInput {
  gigPrice: number;
  extras: number;
  tip: number;
  withdrawalMethod: FiverrWithdrawalMethod;
}

export interface FiverrResult {
  orderTotal: number;
  sellerFee: number;
  buyerServiceFee: number;
  buyerPaid: number;
  withdrawalFee: number;
  netEarnings: number;
}

export function calculateFiverrEarnings(input: FiverrInput): FiverrResult {
  const orderTotal = input.gigPrice + input.extras + input.tip;
  const sellerFee = orderTotal * FIVERR_SELLER_FEE_RATE;
  const buyerServiceFee = orderTotal * FIVERR_BUYER_SERVICE_FEE_RATE;
  const buyerPaid = orderTotal + buyerServiceFee;
  const withdrawalFee =
    FIVERR_WITHDRAWAL_METHODS.find((m) => m.key === input.withdrawalMethod)?.flatFee ?? 0;
  const netEarnings = orderTotal - sellerFee - withdrawalFee;

  return { orderTotal, sellerFee, buyerServiceFee, buyerPaid, withdrawalFee, netEarnings };
}
