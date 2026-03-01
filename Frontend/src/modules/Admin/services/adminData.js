export const dashboardSummary = {
  headline: [
    {
      id: 'users',
      title: 'Total Users',
      value: '52,480',
      subtitle: '+1,920 this month',
      trend: { direction: 'up', value: '3.8%', message: 'increase compared to last 30 days' },
    },
    {
      id: 'users',
      title: 'Verified Users',
      value: '324',
      subtitle: '18 pending approvals',
      trend: { direction: 'up', value: '6 new', message: 'new users approved' },
    },
    {
      id: 'orders',
      title: 'Orders (User + User)',
      value: '3,140',
      subtitle: '78 issues waiting for review',
      trend: { direction: 'down', value: '1.2%', message: 'compared to last week' },
    },
    {
      id: 'revenue',
      title: 'Gross Revenue',
      value: '₹8.4 Cr',
      subtitle: 'Profit margin 21%',
      trend: { direction: 'up', value: '₹1.2 Cr', message: 'received this week' },
    },
  ],
  payables: {
    advance: '₹2.6 Cr',
    pending: '₹1.9 Cr',
    outstanding: '₹42.7 L',
  },
}

export const productInventory = [
  {
    id: 'NPK-24',
    name: 'NPK 24:24:0 Fertilizer',
    stock: '8,450 kg',
    userPrice: '₹1,050',
    userPrice: '₹1,420',
    expiry: 'Aug 2026',
    visibility: 'Active',
    region: 'West',
  },
  {
    id: 'MICRO-12',
    name: 'Micro Nutrient Mix',
    stock: '2,900 kg',
    userPrice: '₹720',
    userPrice: '₹990',
    expiry: 'Jan 2025',
    visibility: 'Warning',
    region: 'North',
  },
  {
    id: 'UREA-B',
    name: 'Stabilized Urea Blend',
    stock: '12,300 kg',
    userPrice: '₹640',
    userPrice: '₹930',
    expiry: 'Dec 2026',
    visibility: 'Active',
    region: 'South',
  },
]

export const users = [
  {
    id: 'VND-204',
    name: 'GreenGrow Supplies',
    region: 'Kolhapur Central',
    creditLimit: '₹35 L',
    repayment: '21 days',
    penalty: '1.5%',
    status: 'On Track',
    dues: '₹8.4 L',
    coverageRadius: 20,
    serviceArea: 'Kolhapur city + 20km belt',
    location: { lat: 16.705, lng: 74.2433 },
    email: 'contact@greengrow.com',
    phone: '+91 98765 55001',
  },
  {
    id: 'VND-131',
    name: 'HarvestLink Pvt Ltd',
    region: 'Kolhapur East',
    creditLimit: '₹60 L',
    repayment: '28 days',
    penalty: '2.0%',
    status: 'Review',
    dues: '₹19.6 L',
    coverageRadius: 20,
    serviceArea: 'Ichalkaranji corridor',
    location: { lat: 16.7165, lng: 74.2591 },
    email: 'ops@harvestlink.in',
    phone: '+91 98765 55002',
    statusReason: 'Awaiting compliance review',
  },
  {
    id: 'VND-412',
    name: 'GrowSure Traders',
    region: 'Pune Rural',
    creditLimit: '₹25 L',
    repayment: '18 days',
    penalty: '1.0%',
    status: 'Pending',
    dues: '₹6.2 L',
    coverageRadius: 20,
    serviceArea: 'Pune west clusters',
    location: { lat: 18.5204, lng: 73.8567 },
    email: 'support@growsure.co',
    phone: '+91 98765 55003',
    applicationDate: '2024-12-18',
    documents: [{ name: 'GST Certificate' }, { name: 'Warehouse Lease' }],
    businessDetails: 'Existing distributor with cold-storage facility.',
  },
]

export const admins = [
  {
    id: 'SLR-883',
    name: 'Priya Nair',
    cashback: '2.5%',
    commission: '5%',
    target: '₹32 L',
    achieved: 68,
    referrals: 212,
    sales: '₹21.6 L',
    status: 'On Track',
  },
  {
    id: 'SLR-552',
    name: 'Sahil Mehta',
    cashback: '1.8%',
    commission: '4%',
    target: '₹28 L',
    achieved: 54,
    referrals: 148,
    sales: '₹15.2 L',
    status: 'Needs Attention',
  },
]

export const users = [
  {
    id: 'USR-6621',
    name: 'Anand Kumar',
    region: 'Surat',
    adminId: 'SLR-883',
    orders: 12,
    payments: 'On Time',
    supportTickets: 0,
    status: 'Active',
  },
  {
    id: 'USR-9842',
    name: 'Mita Shah',
    region: 'Ahmedabad',
    adminId: 'SLR-552',
    orders: 5,
    payments: 'Delayed',
    supportTickets: 2,
    status: 'Review',
  },
]

export const orders = [
  {
    id: 'ORD-78234',
    type: 'User',
    user: 'HarvestLink Pvt Ltd',
    region: 'Maharashtra',
    value: '₹58.4 L',
    advance: 'Paid',
    pending: '₹40.8 L',
    status: 'Processing',
  },
  {
    id: 'ORD-78289',
    type: 'User',
    user: 'GreenGrow Supplies',
    region: 'Gujarat',
    value: '₹1.8 L',
    advance: 'Pending',
    pending: '₹1.26 L',
    status: 'Awaiting Dispatch',
  },
]

export const finance = {
  creditPolicies: [
    { id: 'advance', label: 'Advance %', value: '30%', meta: 'Default advance for all users' },
    { id: 'user-min', label: 'Minimum User Order', value: '₹2,000', meta: 'Effective since Apr 2024' },
    { id: 'user-min', label: 'Minimum User Purchase', value: '₹50,000', meta: 'Applies to all user types' },
  ],
  outstandingCredits: [
    { label: 'Total Outstanding', progress: 72, tone: 'warning', meta: '₹1.92 Cr in recovery process' },
    { label: 'Current Cycle Recovery', progress: 54, tone: 'success', meta: '₹82 L collected this week' },
    { label: 'Delayed Accounts', progress: 28, meta: '14 users flagged for follow-up' },
  ],
}

export const analyticsSummary = {
  period: 'Last 30 days',
  highlights: [
    { label: 'Total Orders', value: '3,140', change: '+12%' },
    { label: 'Total Revenue', value: '₹8.4 Cr', change: '+9.6%' },
    { label: 'Top Region', value: 'Gujarat', change: '₹2.1 Cr' },
    { label: 'Top User', value: 'HarvestLink Pvt Ltd', change: '₹1.4 Cr' },
  ],
  timeline: [
    {
      id: 'event-1',
      title: 'User payment review completed',
      timestamp: 'Today, 09:30',
      description: '14 users moved back to On Track status after payment verification.',
      status: 'completed',
    },
    {
      id: 'event-2',
      title: 'Monthly admin rankings published',
      timestamp: 'Yesterday, 18:05',
      description: 'Rankings shared with rewards for top performers.',
      status: 'completed',
    },
    {
      id: 'event-3',
      title: 'Delivery delay alert',
      timestamp: 'Yesterday, 11:40',
      description: 'Western region facing 18h delay due to local strikes. Backup plan activated.',
      status: 'pending',
    },
  ],
}

