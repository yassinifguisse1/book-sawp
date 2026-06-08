export interface PlatformBillingProvider {
  createCheckout(input: {
    accountPublicId: string;
    productKey: string;
    returnUrl: string;
  }): Promise<{ checkoutUrl: string }>;
}
