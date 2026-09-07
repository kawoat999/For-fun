/**
 * Utility functions for currency and date formatting
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(amount) ? 0 : amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Convert numeric Baht amount to Thai Text representation (e.g. 1520.50 -> หนึ่งพันห้าร้อยยี่สิบบาทห้าสิบสตางค์)
 */
export function bahtText(inputNumber: number): string {
  if (isNaN(inputNumber) || inputNumber === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = inputNumber < 0;
  const num = Math.abs(Math.round(inputNumber * 100) / 100);

  const numText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const posText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  function convertGroup(digits: string): string {
    let result = '';
    const len = digits.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(digits[i], 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1) {
          result += 'เอ็ด';
        } else {
          result += numText[digit] + posText[pos];
        }
      }
    }
    return result;
  }

  function convertInteger(str: string): string {
    let result = '';
    let remaining = str;

    while (remaining.length > 6) {
      const chunk = remaining.slice(-6);
      remaining = remaining.slice(0, -6);
      result = convertGroup(chunk) + 'ล้าน' + result;
    }
    if (remaining.length > 0) {
      result = convertGroup(remaining) + result;
    }
    return result;
  }

  let bahtStr = convertInteger(integerPart);
  let satangStr = '';

  const satangVal = parseInt(decimalPart, 10);
  if (satangVal > 0) {
    satangStr = convertGroup(decimalPart) + 'สตางค์';
  } else {
    satangStr = 'ถ้วน';
  }

  const finalBaht = bahtStr ? `${bahtStr}บาท` : '';
  const prefix = isNegative ? 'ลบ' : '';

  return `${prefix}${finalBaht}${satangStr}`;
}
