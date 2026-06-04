import crypto from 'crypto';

class MockDriver {
  constructor() {
    this.name = 'MOCK_GATEWAY';
  }

  async initiatePayment({ amount, currency = 'INR', orderId }) {
    // Simulate gateway response
    const txnId = `txn_${crypto.randomBytes(8).toString('hex')}`;
    return {
      success: true,
      transactionId: txnId,
      paymentUrl: `/api/payments/mock/pay?txnId=${txnId}&orderId=${orderId}&amount=${amount}`,
      gateway: this.name
    };
  }

  async capturePayment(txnId) {
    // Simulate successful capture
    return {
      success: true,
      status: 'CAPTURED',
      transactionId: txnId,
      capturedAt: new Date()
    };
  }

  async refundPayment(txnId, amount) {
    // Simulate successful refund
    return {
      success: true,
      refundId: `ref_${crypto.randomBytes(8).toString('hex')}`,
      status: 'REFUNDED',
      amount,
      refundedAt: new Date()
    };
  }

  async processPayout(vendorId, amount) {
    // Simulate vendor payout
    return {
      success: true,
      payoutId: `payout_${crypto.randomBytes(8).toString('hex')}`,
      status: 'PAID',
      amount,
      processedAt: new Date()
    };
  }
}

export const mockDriver = new MockDriver();
