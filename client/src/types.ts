export type Product = {
  id: number;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  price: string | number;
  mrp: string | number;
  stockQuantity: number;
  warrantyDays: number;
  imageUrl: string | null;
};

export type CartItem = { id: number; quantity: number };

export type RepairStatus =
  | "Repair Booked"
  | "Device Received"
  | "Device Inspection"
  | "Estimate Generated"
  | "Customer Approval"
  | "Repair In Progress"
  | "Testing"
  | "Ready for Pickup"
  | "Delivered"
  | "Cancelled";

export type RepairTrack = {
  repairId: string;
  status: RepairStatus;
  name: string;
  brand: string;
  model: string;
  problem: string;
  service: string;
  diagnosis: string | null;
  estimatedCost: string | null;
  finalCost: string | null;
  technician: string | null;
  expectedCompletion: string | null;
  history: Array<{ status: string; note: string | null; createdAt: string }>;
};

export type RepairAdmin = {
  id: number;
  repairCode: string;
  customerName: string;
  phone: string;
  deviceBrand: string;
  deviceModel: string;
  status: RepairStatus;
  problemDescription: string;
};

export type OrderAdmin = {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: string;
  status: string;
};