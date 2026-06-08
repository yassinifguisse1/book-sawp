export interface DeliveryPartnerProvider {
  createShipment(input: {
    orderPublicId: string;
    country: string;
    city: string;
  }): Promise<{ trackingCode: string; trackingUrl?: string }>;
}
