import { delay, uuid } from '@/lib/id';

/**
 * MOCK payment gateway. No money moves. Every call succeeds and returns a DEMO reference.
 * A real integration (Razorpay / Cashfree) must create orders and verify signatures on a
 * server — the client only opens the provider checkout with a server-issued order id.
 */
export interface PaymentProvider {
  name: string;
  isMock: boolean;
  authorize(amount: number): Promise<{ reference: string }>;
  capture(amount: number): Promise<{ reference: string }>;
  refund(amount: number): Promise<{ reference: string }>;
  void(reference: string): Promise<void>;
}

const ref = (prefix: string) => `DEMO-${prefix}-${uuid().slice(0, 8).toUpperCase()}`;

export const mockPaymentService: PaymentProvider = {
  name: 'mock',
  isMock: true,
  async authorize() {
    await delay(600);
    return { reference: ref('AUTH') };
  },
  async capture() {
    await delay(600);
    return { reference: ref('PAY') };
  },
  async refund() {
    await delay(400);
    return { reference: ref('RFND') };
  },
  async void() {
    await delay(200);
  },
};
