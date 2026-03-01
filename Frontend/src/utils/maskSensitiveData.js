/**
 * Utility functions to mask sensitive data for privacy
 * 
 * Admin should see masked bank account details for security
 */

/**
 * Mask bank account number - show only last 4 digits
 * @param {string} accountNumber - Full account number
 * @returns {string} Masked account number (e.g., "XXXX XXXX 1234")
 */
export function maskAccountNumber(accountNumber) {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return 'N/A'
  }

  const cleaned = accountNumber.replace(/\s/g, '') // Remove spaces
  if (cleaned.length < 4) {
    return 'XXXX'
  }

  // Show last 4 digits, mask the rest
  const last4 = cleaned.slice(-4)
  const masked = 'X'.repeat(Math.max(0, cleaned.length - 4))
  
  // Format with spaces for readability (every 4 digits)
  const formatted = masked.replace(/(.{4})/g, '$1 ').trim()
  return formatted ? `${formatted} ${last4}` : last4
}

/**
 * Mask IFSC code - show only first 2 and last 2 characters
 * @param {string} ifscCode - Full IFSC code
 * @returns {string} Masked IFSC (e.g., "AX**XXXX")
 */
export function maskIFSC(ifscCode) {
  if (!ifscCode || typeof ifscCode !== 'string') {
    return 'N/A'
  }

  const cleaned = ifscCode.toUpperCase().trim()
  if (cleaned.length < 4) {
    return 'XXXX'
  }

  // Show first 2 and last 2 characters
  const first2 = cleaned.slice(0, 2)
  const last2 = cleaned.slice(-2)
  const middle = 'X'.repeat(Math.max(0, cleaned.length - 4))
  
  return `${first2}${middle}${last2}`
}

/**
 * Get masked bank account details object
 * @param {Object} bankDetails - Full bank account details
 * @returns {Object} Masked bank account details
 */
export function getMaskedBankDetails(bankDetails) {
  if (!bankDetails) {
    return null
  }

  return {
    ...bankDetails,
    accountNumber: maskAccountNumber(bankDetails.accountNumber),
    ifscCode: maskIFSC(bankDetails.ifscCode),
    // Keep other fields as-is (accountHolderName, bankName, branchName are not sensitive)
  }
}

