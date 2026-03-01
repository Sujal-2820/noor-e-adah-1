import { useState, useCallback } from 'react'

// Button intent types based on requirements
export const BUTTON_INTENT = {
  UPDATION: 'updation',
  INFORMATION_DISPLAY: 'information_display',
  VIEW_ONLY: 'view_only',
  FILE_UPLOAD: 'file_upload',
  INSTANT_ACTION: 'instant_action',
}

// Button configuration mapping
export const BUTTON_CONFIGS = {
  // Overview section
  'check-credit': {
    intent: BUTTON_INTENT.INFORMATION_DISPLAY,
    title: 'Credit Details',
    data: {
      type: 'credit_info',
    },
  },
  'update-mrp': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Update MRP',
    data: {
      type: 'pricing',
      fields: [
        { name: 'currentMRP', label: 'Current MRP', value: '', type: 'text', placeholder: 'Enter current MRP' },
        { name: 'newMRP', label: 'New MRP', value: '', type: 'number', placeholder: 'Enter new MRP' },
        { name: 'effectiveDate', label: 'Effective Date', value: new Date().toISOString().split('T')[0], type: 'date' },
      ],
    },
  },
  'confirm-delivery-slot': {
    intent: BUTTON_INTENT.INSTANT_ACTION,
    title: 'Confirm Delivery Slot',
    data: {
      type: 'confirmation',
      message: 'Do you want to confirm this delivery slot?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    },
  },
  'update-inventory-batch': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Update Inventory Batch',
    data: {
      type: 'inventory',
      fields: [
        { name: 'sku', label: 'SKU Code', value: '', type: 'text' },
        { name: 'quantity', label: 'Quantity', value: '', type: 'number' },
        { name: 'batchNumber', label: 'Batch Number', value: '', type: 'text' },
        { name: 'expiryDate', label: 'Expiry Date', value: '', type: 'date' },
      ],
    },
  },
  'raise-credit-order': {
    intent: BUTTON_INTENT.INSTANT_ACTION,
    title: 'Raise Credit Order',
    data: {
      type: 'confirmation',
      message: 'Place a credit purchase request to admin for approval?',
      confirmLabel: 'Raise Request',
      cancelLabel: 'Cancel',
    },
  },
  'view-payouts': {
    intent: BUTTON_INTENT.INFORMATION_DISPLAY,
    title: 'Wallet Payouts',
    data: {
      type: 'payouts',
    },
  },

  // Inventory section
  'add-sku': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Add New SKU',
    data: {
      type: 'sku',
      fields: [
        { name: 'name', label: 'Product Name', value: '', type: 'text' },
        { name: 'category', label: 'Category', value: '', type: 'text' },
        { name: 'purchasePrice', label: 'Purchase Price', value: '', type: 'number' },
        { name: 'sellingPrice', label: 'Selling Price', value: '', type: 'number' },
        { name: 'initialStock', label: 'Initial Stock', value: '', type: 'number' },
      ],
    },
  },
  'reorder': {
    intent: BUTTON_INTENT.INFORMATION_DISPLAY,
    title: 'Reorder Details',
    data: {
      type: 'reorder',
    },
  },
  'supplier-list': {
    intent: BUTTON_INTENT.VIEW_ONLY,
    title: 'Supplier List',
    data: {
      type: 'suppliers',
    },
  },
  'stock-report': {
    intent: BUTTON_INTENT.INFORMATION_DISPLAY,
    title: 'Stock Report',
    data: {
      type: 'stock_report',
    },
  },
  'raise-request': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Raise Restock Request',
    data: {
      type: 'admin_request',
      fields: [
        { name: 'subject', label: 'Subject', value: 'Credit Requisition for Restocking', type: 'text', required: true },
        { name: 'description', label: 'Description', value: '', type: 'textarea', required: true },
        { name: 'priority', label: 'Priority', value: 'normal', type: 'select', required: true, options: ['low', 'normal', 'high', 'urgent'] },
        { name: 'items', label: 'Items Required', value: '', type: 'textarea', required: true },
        { name: 'attachment', label: 'Attachment', value: '', type: 'file' },
      ],
    },
  },
  'ping-admin': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Send Notification to Admin',
    data: {
      type: 'admin_request',
      fields: [
        { name: 'subject', label: 'Subject', value: 'NPK 24:24:0 Availability Query', type: 'text', required: true },
        { name: 'message', label: 'Message', value: 'Confirm NPK 24:24:0 availability with admin hub.', type: 'textarea', required: true },
        { name: 'priority', label: 'Priority', value: 'normal', type: 'select', required: true, options: ['low', 'normal', 'high', 'urgent'] },
      ],
    },
  },
  'upload-docs': {
    intent: BUTTON_INTENT.FILE_UPLOAD,
    title: 'Upload Documents',
    data: {
      type: 'quality_certificates',
      accept: '.pdf,.jpg,.jpeg,.png',
      maxSize: 5 * 1024 * 1024, // 5MB
    },
  },
  'update-stock': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Update Stock',
    data: {
      type: 'stock_update',
      fields: [
        { name: 'currentStock', label: 'Current Stock', value: '', type: 'number' },
        { name: 'newStock', label: 'New Stock Level', value: '', type: 'number' },
        { name: 'reason', label: 'Reason for Update', value: '', type: 'textarea' },
      ],
    },
  },

  // Orders section
  'view-sla-policy': {
    intent: BUTTON_INTENT.VIEW_ONLY,
    title: 'SLA Policy',
    data: {
      type: 'sla_policy',
    },
  },
  'order-available': {
    intent: BUTTON_INTENT.INSTANT_ACTION,
    title: 'Confirm Availability',
    data: {
      type: 'confirmation',
      message: 'Mark this order as available?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    },
  },
  'order-not-available': {
    intent: BUTTON_INTENT.INSTANT_ACTION,
    title: 'Mark Unavailable',
    data: {
      type: 'confirmation',
      message: 'Mark this order as not available?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    },
  },
  'order-partial-accept': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Accept Order Partially',
    data: {
      type: 'partial_order',
      fields: [
        {
          name: 'orderItems',
          label: 'Select Items to Accept/Reject',
          value: [],
          type: 'item_selection',
          required: true,
        },
        {
          name: 'notes',
          label: 'Notes (optional)',
          value: '',
          type: 'textarea',
        },
      ],
    },
  },
  'escalate-to-admin': {
    intent: BUTTON_INTENT.INSTANT_ACTION,
    title: 'Escalate to Admin',
    data: {
      type: 'escalation',
    },
  },
  'confirm-acceptance': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Confirm Order Acceptance',
    data: {
      type: 'confirmation',
      fields: [
        {
          name: 'notes',
          label: 'Notes (optional)',
          value: '',
          type: 'textarea',
        },
      ],
    },
  },
  'cancel-acceptance': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Cancel Order Acceptance',
    data: {
      type: 'cancellation',
      fields: [
        {
          name: 'reason',
          label: 'Reason for Cancellation',
          value: '',
          type: 'textarea',
          required: true,
        },
      ],
    },
  },
  'update-order-status': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Update Order Status',
    data: {
      type: 'order_status',
      fields: [
        {
          name: 'status',
          label: 'Select Status',
          value: 'accepted',
          type: 'select',
          required: true,
          options: [
            { value: 'accepted', label: 'Accepted' },
            { value: 'dispatched', label: 'Dispatched' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'fully_paid', label: 'Paid In Full' },
          ],
        },
        {
          name: 'notes',
          label: 'Notes (optional)',
          value: '',
          type: 'textarea',
        },
      ],
    },
  },

  // Credit section
  'view-details': {
    intent: BUTTON_INTENT.INFORMATION_DISPLAY,
    title: 'Credit Details',
    data: {
      type: 'credit_details',
    },
  },
  'place-credit-purchase': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Place Credit Purchase Request',
    data: {
      type: 'credit_purchase',
      fields: [
        { name: 'amount', label: 'Purchase Amount', value: '', type: 'number', required: true, min: 50000 },
        { name: 'items', label: 'Items Description', value: '', type: 'textarea' },
        { name: 'urgency', label: 'Urgency Level', value: 'normal', type: 'select', options: ['normal', 'high', 'urgent'] },
      ],
    },
  },
  'repay-credit': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Repay Credit',
    data: {
      type: 'credit_repayment',
      fields: [
        { name: 'amount', label: 'Repayment Amount', value: '', type: 'number', required: true, min: 1, placeholder: 'Enter amount to repay' },
      ],
    },
  },
  'request-withdrawal': {
    intent: BUTTON_INTENT.UPDATION,
    title: 'Request Withdrawal',
    data: {
      type: 'withdrawal_request',
      fields: [
        { name: 'amount', label: 'Withdrawal Amount', value: '', type: 'number', required: true, min: 1000, placeholder: 'Enter amount (min ₹1,000)' },
        { name: 'bankAccountId', label: 'Bank Account', value: '', type: 'select', required: true, placeholder: 'Select bank account' },
      ],
    },
  },

  // Profile/Settings
  'profile-settings': {
    intent: BUTTON_INTENT.VIEW_ONLY,
    title: 'Profile & Settings',
    data: {
      type: 'profile',
    },
  },
}

export function useButtonAction() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [currentAction, setCurrentAction] = useState(null)

  const openPanel = useCallback((buttonId, additionalData = {}) => {
    const config = BUTTON_CONFIGS[buttonId]
    if (!config) {
      console.warn(`No configuration found for button: ${buttonId}`)
      return
    }

    // If additional data contains fields to pre-fill (like currentStock), update the fields
    const updatedData = { ...config.data, ...additionalData }
    if (config.intent === 'updation' && config.data.fields) {
      updatedData.fields = config.data.fields.map((field) => {
        // Pre-fill fields based on additional data keys
        if (additionalData[field.name] !== undefined) {
          return { ...field, value: additionalData[field.name] }
        }
        // For bankAccountId, set default value if provided
        if (field.name === 'bankAccountId' && additionalData.bankAccountId) {
          return { ...field, value: additionalData.bankAccountId }
        }
        // Map common field names
        if (field.name === 'currentStock' && additionalData.currentStock !== undefined) {
          return { ...field, value: additionalData.currentStock }
        }
        if (field.name === 'sku' && additionalData.itemId !== undefined) {
          return { ...field, value: additionalData.itemId }
        }
        // For status field, map normalized status to valid options
        if (field.name === 'status' && additionalData.status !== undefined) {
          const currentStatus = additionalData.status
          // Map to valid status values
          let mappedStatus = currentStatus
          if (currentStatus === 'pending' || currentStatus === 'awaiting') mappedStatus = 'accepted'
          else if (currentStatus === 'processing') mappedStatus = 'accepted'
          else if (currentStatus === 'ready_for_delivery' || currentStatus === 'out_for_delivery') mappedStatus = 'dispatched'
          // Only set if it's a valid option
          const validOptions = field.options?.map(opt => typeof opt === 'object' ? opt.value : opt) || []
          if (validOptions.includes(mappedStatus)) {
            return { ...field, value: mappedStatus }
          }
        }
        return field
      })
    }

    setCurrentAction({
      ...config,
      buttonId,
      data: {
        ...updatedData,
        ...additionalData,
      },
    })
    setIsMounted(true)
    requestAnimationFrame(() => setIsOpen(true))
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => {
      setIsMounted(false)
      setCurrentAction(null)
    }, 260)
  }, [])

  const handleAction = useCallback(
    (callback) => {
      return () => {
        callback?.()
        closePanel()
      }
    },
    [closePanel],
  )

  return {
    isOpen,
    isMounted,
    currentAction,
    openPanel,
    closePanel,
    handleAction,
  }
}

