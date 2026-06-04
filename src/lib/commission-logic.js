/**
 * Commission Calculation Logic
 * 
 * ADDON Model: 
 * - Commission is added on top of the subtotal.
 * - Customer pays: Subtotal + Commission + Delivery Fee
 * - Vendor receives: Subtotal
 * 
 * DEDUCTED Model:
 * - Commission is deducted from the subtotal.
 * - Customer pays: Subtotal + Delivery Fee
 * - Vendor receives: Subtotal - Commission
 */

export function calculateOrderFinancials(subtotal, deliveryFee, commissionRate, commissionModel) {
  const s = parseFloat(subtotal) || 0;
  const df = parseFloat(deliveryFee) || 0;
  const rate = (parseFloat(commissionRate) || 0) / 100;

  const commissionAmount = s * rate;

  let addonCharges = 0;
  let customerTotal = s + df;
  let vendorPayout = s;

  if (commissionModel === 'ADD_ON') {
    addonCharges = commissionAmount;
    customerTotal = s + commissionAmount + df;
    vendorPayout = s;
  } else {
    // DEDUCTED Model
    addonCharges = 0;
    customerTotal = s + df;
    vendorPayout = s - commissionAmount;
  }

  return {
    subtotal: s,
    deliveryFee: df,
    commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    addonCharges: parseFloat(addonCharges.toFixed(2)),
    customerTotal: parseFloat(customerTotal.toFixed(2)),
    vendorPayout: parseFloat(vendorPayout.toFixed(2)),
    commissionRate: commissionRate,
    commissionModel: commissionModel
  };
}
