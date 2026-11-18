import { customerRepository } from '../repositories/customerRepository';
import { shipmentRepository } from '../repositories/shipmentRepository';

const ORDER = ['Pending', 'InTransit', 'OutForDelivery', 'Delivered', 'Cancelled'] as const;

export const dashboardService = {
  async stats() {
    const [totalCustomers, totalShipments, dist] = await Promise.all([
      customerRepository.count(),
      shipmentRepository.count(),
      shipmentRepository.statusDistribution(),
    ]);
    const map = new Map(dist.map((d) => [d.status, d.count]));
    return { totalCustomers, totalShipments, statusDistribution: ORDER.map((status) => ({ status, count: map.get(status) ?? 0 })) };
  },
};
