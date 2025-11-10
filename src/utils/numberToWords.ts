const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function convert_tens(num: number): string {
  if (num < 10) return ones[num];
  if (num >= 10 && num < 20) return teens[num - 10];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  if (num > 100) return String(num); // Only handle up to 100 for marks
  if (num === 100) return 'ONE HUNDRED';
  return convert_tens(num);
}