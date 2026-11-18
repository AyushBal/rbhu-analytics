export type CustomerStatus = 'Active' | 'Inactive';
export type ShipmentStatus = 'Pending' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
export const SHIPMENT_STATUSES: ShipmentStatus[] = ['Pending', 'InTransit', 'OutForDelivery', 'Delivered', 'Cancelled'];

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  Pending: 'Pending', InTransit: 'In transit', OutForDelivery: 'Out for delivery', Delivered: 'Delivered', Cancelled: 'Cancelled',
};
export const NEXT_STATUSES: Record<ShipmentStatus, ShipmentStatus[]> = {
  Pending: ['InTransit', 'Cancelled'],
  InTransit: ['OutForDelivery', 'Delivered', 'Cancelled'],
  OutForDelivery: ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
};

export interface Customer { id: string; name: string; email: string; company: string; status: CustomerStatus; createdAt: string; updatedAt: string }
export interface Shipment {
  id: string; trackingNumber: string; customerId: string; origin: string; destination: string; status: ShipmentStatus;
  createdAt: string; updatedAt: string; customer: { id: string; name: string; company: string };
}
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface DashboardStats { totalCustomers: number; totalShipments: number; statusDistribution: { status: ShipmentStatus; count: number }[] }
export interface AuthUser { id: string; email: string; name: string; role: string }
export interface Announcement { id: string; title: string; body: string; author: string; publishedAt: string; pinned: boolean }
