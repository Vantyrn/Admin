import { mockDriver } from './mock-driver';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

class PaymentService {
  constructor() {
    this.driver = mockDriver; // Default to mock for now
  }

  async createTransaction({ orderId, amount, gateway = 'MOCK' }) {
    try {
      const response = await this.driver.initiatePayment({ orderId, amount });
      
      if (response.success) {
        await prisma.payment_transactions.create({
          data: {
            order_id: orderId,
            gateway: gateway,
            txn_id: response.transactionId,
            status: 'INITIATED',
            amount: amount,
            webhook_payload: response
          }
        });
      }
      
      return response;
    } catch (error) {
      logger.error('Failed to create transaction', error, { orderId });
      throw error;
    }
  }

  async handleCapture(txnId) {
    try {
      const response = await this.driver.capturePayment(txnId);
      
      if (response.success) {
        await prisma.payment_transactions.updateMany({
          where: { txn_id: txnId },
          data: { status: 'SUCCESS' }
        });
        
        // Find order linked to this transaction
        const txn = await prisma.payment_transactions.findFirst({
          where: { txn_id: txnId }
        });
        
        if (txn) {
          await prisma.orders.update({
            where: { id: txn.order_id },
            data: { status: 'payment_successful' }
          });
        }
      }
      
      return response;
    } catch (error) {
      logger.error('Failed to capture payment', error, { txnId });
      throw error;
    }
  }

  async handleRefund(orderId, amount, adminId) {
    try {
      const txn = await prisma.payment_transactions.findFirst({
        where: { order_id: orderId, status: 'SUCCESS' }
      });

      if (!txn) throw new Error('Original successful transaction not found');

      const response = await this.driver.refundPayment(txn.txn_id, amount);

      if (response.success) {
        await prisma.$transaction([
          prisma.refund.create({
            data: {
              orderId,
              adminUserId: adminId,
              amount,
              paymentGatewayRef: response.refundId,
              status: 'success',
              completedAt: new Date()
            }
          }),
          prisma.orders.update({
            where: { id: orderId },
            data: { status: 'refunded' }
          })
        ]);
      }

      return response;
    } catch (error) {
      logger.error('Failed to process refund', error, { orderId });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
