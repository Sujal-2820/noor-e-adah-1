/**
 * Common strings translation helper
 * Provides translated versions of common UI strings
 */

import { useTranslation } from '../context/TranslationContext'
import { useTranslatedArray } from '../hooks/useTranslatedArray'

/**
 * Hook to get translated common strings
 */
export function useTranslatedCommonStrings() {
  const { isEnglish } = useTranslation()
  
  // Common strings that appear frequently
  const commonStrings = {
    // Cart
    'Your cart is empty': 'Your cart is empty',
    'Add some products to get started': 'Add some products to get started',
    'Shopping Cart': 'Shopping Cart',
    'item': 'item',
    'items': 'items',
    'Subtotal': 'Subtotal',
    'Delivery': 'Delivery',
    'Free': 'Free',
    'Total': 'Total',
    'Proceed to Checkout': 'Proceed to Checkout',
    'Variant': 'Variant',
    'properties': 'properties',
    'per unit': 'per unit',
    'Standard variant': 'Standard variant',
    'Variant Properties': 'Variant Properties',
    'No variant properties available': 'No variant properties available',
    
    // Orders
    'My Orders': 'My Orders',
    'All': 'All',
    'Awaiting': 'Awaiting',
    'Dispatched': 'Dispatched',
    'Delivered': 'Delivered',
    'In Cart': 'In Cart',
    'No orders found': 'No orders found',
    "You haven't placed any orders yet": "You haven't placed any orders yet",
    'Cart': 'Cart',
    'Order #': 'Order #',
    'Qty': 'Qty',
    'Payment Status': 'Payment Status',
    'Partial Paid': 'Partial Paid',
    'Pending': 'Pending',
    'Advance (30%)': 'Advance (30%)',
    'Remaining (70%)': 'Remaining (70%)',
    'Pay Remaining': 'Pay Remaining',
    'Processing...': 'Processing...',
    
    // Favourites
    'My Favourites': 'My Favourites',
    'item saved': 'item saved',
    'items saved': 'items saved',
    'Loading favourites...': 'Loading favourites...',
    'No favourites yet': 'No favourites yet',
    'Start adding products to your favourites by tapping the heart icon on any product': 'Start adding products to your favourites by tapping the heart icon on any product',
    
    // Home
    'Categories': 'Categories',
    'See all': 'See all',
    'Loading categories...': 'Loading categories...',
    'No categories available': 'No categories available',
    'Popular Products': 'Popular Products',
    'Best admins this week': 'Best admins this week',
    'View All': 'View All',
    'Loading products...': 'Loading products...',
    'No popular products available': 'No popular products available',
    'Featured Products': 'Featured Products',
    'From different categories': 'From different categories',
    'Special Offers': 'Special Offers',
    'Limited time deals': 'Limited time deals',
    'Fast Delivery': 'Fast Delivery',
    '3-4 Hours': '3-4 Hours',
    'Easy Payment': 'Easy Payment',
    '30% Advance': '30% Advance',
    'Quality Assured': 'Quality Assured',
    '100% Genuine': '100% Genuine',
    
    // Status descriptions
    'User is confirming stock and assigning a delivery partner.': 'User is confirming stock and assigning a delivery partner.',
    'Order handed over for delivery. Track updates in real time.': 'Order handed over for delivery. Track updates in real time.',
    'Order delivered. Complete remaining payment if pending.': 'Order delivered. Complete remaining payment if pending.',
  }
  
  const stringsArray = Object.values(commonStrings)
  const translatedArray = useTranslatedArray(stringsArray)
  
  // Create translated object
  const translated = {}
  let index = 0
  Object.keys(commonStrings).forEach((key) => {
    translated[key] = translatedArray[index++] || key
  })
  
  return translated
}






