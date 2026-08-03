export interface UpworkInput {
  contractEarnings: number;
  feeRatePercent: number;
  withdrawalFee: number;
}

export interface UpworkResult {
  serviceFee: number;
  netBeforeWithdrawal: number;
  netEarnings: number;
}

export function calculateUpworkEarnings(input: UpworkInput): UpworkResult {
  const serviceFee = input.contractEarnings * (input.feeRatePercent / 100);
  const netBeforeWithdrawal = input.contractEarnings - serviceFee;
  const netEarnings = netBeforeWithdrawal - input.withdrawalFee;

  return { serviceFee, netBeforeWithdrawal, netEarnings };
}
