/**
 * Helper functions to create documents with auto-generated unique IDs
 * This ensures all new documents get user-friendly IDs
 */

const { generateUniqueId } = require('./generateUniqueId');

const PaymentHistory = require('../models/PaymentHistory');
const ProductAssignment = require('../models/ProductAssignment');
const Notification = require('../models/Notification');
const UserEarning = require('../models/UserEarning');
const BankAccount = require('../models/BankAccount');
const Offer = require('../models/Offer');

/**
 * Create PaymentHistory with auto-generated ID
 */
async function createPaymentHistory(data) {
  const historyId = await generateUniqueId(PaymentHistory, 'PH', 'historyId', 101);
  return await PaymentHistory.create({
    historyId,
    ...data,
  });
}

/**
 * Create ProductAssignment with auto-generated ID
 */
async function createProductAssignment(data) {
  const assignmentId = await generateUniqueId(ProductAssignment, 'PAS', 'assignmentId', 101);
  return await ProductAssignment.create({
    assignmentId,
    ...data,
  });
}

/**
 * Create Notification with auto-generated ID
 */
async function createNotification(data) {
  const notificationId = await generateUniqueId(Notification, 'NOT', 'notificationId', 101);
  const notification = new Notification({
    notificationId,
    ...data,
  });
  await notification.save();
  return notification;
}

/**
 * Create UserEarning with auto-generated ID
 */
async function createUserEarning(data) {
  const earningId = await generateUniqueId(UserEarning, 'VNE', 'earningId', 101);
  const earning = new UserEarning({
    earningId,
    ...data,
  });
  await earning.save();
  return earning;
}

/**
 * Create BankAccount with auto-generated ID
 */
async function createBankAccount(data) {
  const bankAccountId = await generateUniqueId(BankAccount, 'BANK', 'bankAccountId', 101);
  return await BankAccount.create({
    bankAccountId,
    ...data,
  });
}

/**
 * Create Offer with auto-generated ID
 */
async function createOffer(data) {
  const offerId = await generateUniqueId(Offer, 'OFR', 'offerId', 101);
  const offer = new Offer({
    offerId,
    ...data,
  });
  await offer.save();
  return offer;
}

module.exports = {
  createPaymentHistory,
  createProductAssignment,
  createNotification,
  createUserEarning,
  createBankAccount,
  createOffer,
};
