import { randomBytes } from 'crypto';

export function generateOrderNumber(prefix = 'ORD'): string {
  // Current timestamp in YYYYMMDDHHMMSS format
  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  // Random 4-character string (hex)
  const randomStr = randomBytes(2).toString('hex').toUpperCase();

  // Final order number
  return `${prefix}-${timestamp}-${randomStr}`;
}

export function generateSKU(
  productName: string,
  variationName: string,
): string {
  // Create product code from first 3 letters of product name
  const productCode = productName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  // Create variation code from first 3 letters of variation name
  const variationCode = variationName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  // Generate timestamp (YYMMDD format)
  const now = new Date();
  const timestamp =
    String(now.getFullYear()).substring(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  // Random 4-character string (hex)
  const randomStr = randomBytes(2).toString('hex').toUpperCase();

  // Final SKU format: PROD-VAR-YYMMDD-XXXX
  return `${productCode}-${variationCode}-${timestamp}-${randomStr}`;
}


/**
 * Builds a human-readable sentence describing a lead status transition.
 *
 * Example:
 *  buildLeadStatusChangeMessage(LeadStatus.NEW, LeadStatus.CONTACTED)
 *  → "The lead status changed from New to Contacted"
 */
export function buildLeadStatusChangeMessage<T extends string>(
  fromStatus: T | null | undefined,
  toStatus: T,
): string {
  // ✅ Lead creation case
  if (!fromStatus) {
    return 'Lead has been created';
  }

  // No status change
  if (fromStatus === toStatus) {
    return `The lead status remains ${formatEnumValue(fromStatus)}`;
  }

  // Status changed
  return `The lead status changed from ${formatEnumValue(
    fromStatus,
  )} to ${formatEnumValue(toStatus)}`;
}

/**
 * Converts ENUM_LIKE_VALUE → "Enum Like Value"
 */
function formatEnumValue(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}
