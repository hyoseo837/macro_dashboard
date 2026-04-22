export const formatPrice = (value: number, currency: string) => {
  let decimals: number;
  if (value < 1) {
    decimals = 4;
  } else if (value < 100) {
    decimals = 2;
  } else if (currency === 'KRW') {
    decimals = 0;
  } else {
    decimals = 2;
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number) => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value);
  return `${formatted}%`;
};
