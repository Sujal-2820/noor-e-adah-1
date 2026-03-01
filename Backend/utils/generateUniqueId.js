/**
 * Generate Unique ID Utility
 * 
 * Generates simple, guessable unique IDs for non-technical users
 * Format: PREFIX-XXX (e.g., USR-101, USR-102)
 */

/**
 * Generate next unique ID for a model
 * @param {Object} Model - Mongoose model
 * @param {string} prefix - ID prefix (e.g., 'USR', 'VND', 'PRD')
 * @param {string} idField - Field name for the ID (e.g., 'userId', 'UserId')
 * @param {number} startNumber - Starting number (default: 101)
 * @returns {Promise<string>} Generated unique ID
 */
async function generateUniqueId(Model, prefix, idField, startNumber = 101) {
  try {
    // Find the last document with this prefix
    const lastDoc = await Model.findOne({ [idField]: new RegExp(`^${prefix}-`) })
      .sort({ [idField]: -1 })
      .select(idField)
      .lean();

    let nextNumber = startNumber;

    if (lastDoc && lastDoc[idField]) {
      // Extract number from ID (e.g., 'USR-101' -> 101)
      const match = lastDoc[idField].match(/\d+$/);
      if (match) {
        const lastNum = parseInt(match[0]);
        if (lastDoc[idField].startsWith(`${prefix}-`)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    // Generate ID
    const generatedId = `${prefix}-${nextNumber}`;

    // Check if ID already exists (safety check)
    const existing = await Model.findOne({ [idField]: generatedId });
    if (existing) {
      // Find next available number
      let found = false;
      let attempt = nextNumber + 1;
      while (!found && attempt < 100000) {
        const testId = `${prefix}-${attempt}`;
        const exists = await Model.findOne({ [idField]: testId });
        if (!exists) {
          nextNumber = attempt;
          found = true;
        } else {
          attempt++;
        }
      }
    }

    return `${prefix}-${nextNumber}`;
  } catch (error) {
    console.error(`Error generating unique ID for ${prefix}:`, error);
    // Fallback: use timestamp-based ID
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }
}

module.exports = {
  generateUniqueId,
};









