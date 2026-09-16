/**
 * Generate a unique reference number
 */
export const generateReferenceNumber = (prefix = '') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
};

/**
 * Format currency (Indian Rupees)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '-';

  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  }
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  return d.toLocaleDateString();
};

/**
 * Format month for billing (e.g., "August 2026")
 */
export const formatMonth = (monthString) => {
  if (!monthString) return '-';

  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Parse month string to Date object (first day of month)
 */
export const parseMonth = (monthString) => {
  if (!monthString) return null;

  const [year, month] = monthString.split('-');
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
};

/**
 * Get current month string (YYYY-MM)
 */
export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Calculate electricity consumption
 */
export const calculateElectricity = (previousReading, currentReading, ratePerUnit) => {
  const consumedUnits = currentReading - previousReading;
  const energyAmount = consumedUnits * ratePerUnit;

  return {
    consumedUnits,
    energyAmount,
  };
};

/**
 * Calculate rent status
 */
export const calculateRentStatus = (rentAmount, totalPaid) => {
  if (totalPaid >= rentAmount) {
    return 'PAID';
  }
  if (totalPaid > 0) {
    return 'PARTIAL';
  }
  return 'PENDING';
};

/**
 * Calculate outstanding amount
 */
export const calculateOutstanding = (rentAmount, totalPaid) => {
  return Math.max(0, rentAmount - totalPaid);
};

/**
 * Validate mobile number (Indian format)
 */
export const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
