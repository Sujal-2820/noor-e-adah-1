export const userSnapshot = {
  welcome: {
    name: 'Fatima Noor',
    region: 'Lucknow, Uttar Pradesh',
    coverageKm: 100,
  },
  highlights: [
    { id: 'orders', label: 'Orders Today', value: 12, trend: '+3 vs yesterday' },
    { id: 'inventory', label: 'Urgent Stock', value: 4, trend: 'Items to restock' },
    { id: 'credit', label: 'Credit Balance', value: '₹12.4L', trend: 'Due in 8 days' },
  ],
  inventory: [
    {
      id: 'inv-1',
      name: 'Silk Banarasi Saree',
      stock: '120 units',
      purchase: '₹4,050',
      selling: '₹6,380',
      status: 'Healthy',
    },
    {
      id: 'inv-2',
      name: 'Designer Bridal Lehenga',
      stock: '45 units',
      purchase: '₹15,640',
      selling: '₹22,910',
      status: 'Low',
    },
    {
      id: 'inv-3',
      name: 'Handcrafted Accessories',
      stock: '210 units',
      purchase: '₹720',
      selling: '₹1,980',
      status: 'Critical',
    },
  ],
  orders: [
    {
      id: 'ord-1',
      customer: 'Anjali Sharma',
      value: '₹48,600',
      status: 'Dispatched',
      payment: 'Advance received',
      next: 'Deliver before 24h SLA',
      statusUpdatedAt: '2024-12-18T09:15:00Z',
    },
    {
      id: 'ord-2',
      customer: 'Zoya Khan',
      value: '₹32,400',
      status: 'Awaiting',
      payment: 'Advance pending',
      next: 'Confirm availability',
      statusUpdatedAt: '2024-12-18T07:45:00Z',
    },
  ],
  credit: {
    limit: '₹35L',
    used: '₹22.6L',
    remaining: '₹12.4L',
    penalty: 'No penalty',
    due: '08 Dec 2025',
  },
  reports: [
    { label: 'Orders this week', value: '84', meta: '+12% growth' },
    { label: 'Earnings this month', value: '₹18.6L', meta: 'Processing ₹4.2L' },
    { label: 'Purchases', value: '₹9.4L', meta: 'Across 3 requests' },
    { label: 'Customer satisfaction', value: '4.7/5', meta: 'Based on 156 reviews' },
  ],
}

