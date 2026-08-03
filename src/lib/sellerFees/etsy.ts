export type EtsyRegion = "US" | "UK" | "EU";

export const ETSY_PROCESSING_RATES: Record<EtsyRegion, { percent: number; flat: number; symbol: string }> = {
  US: { percent: 0.03, flat: 0.25, symbol: "$" },
  UK: { percent: 0.04, flat: 0.2, symbol: "£" },
  EU: { percent: 0.04, flat: 0.3, symbol: "€" },
};

export const ETSY_TRANSACTION_FEE_RATE = 0.065;
export const ETSY_LISTING_FEE = 0.2;
export const ETSY_OFFSITE_ADS_RATE_STANDARD = 0.15;
export const ETSY_OFFSITE_ADS_RATE_HIGH_VOLUME = 0.12;

export interface EtsyInput {
  itemPrice: number;
  shipping: number;
  quantity: number;
  costOfGoods: number;
  region: EtsyRegion;
  etsyAdsSpend: number;
  offsiteAdsFee: boolean;
  highVolumeSeller: boolean;
}

export interface EtsyResult {
  grossSale: number;
  listingFee: number;
  transactionFee: number;
  processingFee: number;
  offsiteAdsFee: number;
  etsyAdsSpend: number;
  totalFees: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
}

export function calculateEtsyFees(input: EtsyInput): EtsyResult {
  const grossSale = input.itemPrice * input.quantity + input.shipping;
  const rates = ETSY_PROCESSING_RATES[input.region];

  const listingFee = ETSY_LISTING_FEE * input.quantity;
  const transactionFee = grossSale * ETSY_TRANSACTION_FEE_RATE;
  const processingFee = grossSale * rates.percent + rates.flat;
  const offsiteRate = input.highVolumeSeller ? ETSY_OFFSITE_ADS_RATE_HIGH_VOLUME : ETSY_OFFSITE_ADS_RATE_STANDARD;
  const offsiteAdsFee = input.offsiteAdsFee ? grossSale * offsiteRate : 0;

  const totalFees = listingFee + transactionFee + processingFee + offsiteAdsFee + input.etsyAdsSpend;
  const totalCost = totalFees + input.costOfGoods * input.quantity;
  const netProfit = grossSale - totalCost;
  const marginPercent = grossSale > 0 ? (netProfit / grossSale) * 100 : 0;

  return {
    grossSale,
    listingFee,
    transactionFee,
    processingFee,
    offsiteAdsFee,
    etsyAdsSpend: input.etsyAdsSpend,
    totalFees,
    totalCost,
    netProfit,
    marginPercent,
  };
}
