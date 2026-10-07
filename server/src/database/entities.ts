import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 120 }) name!: string;
  @Column({ type: "varchar", length: 190, nullable: true, unique: true }) email!: string | null;
  @Column({ length: 20, unique: true }) phone!: string;
  @Column({ name: "password_hash", type: "varchar", length: 255, nullable: true, select: false }) passwordHash!: string | null;
  @Column({ type: "enum", enum: ["CUSTOMER", "ADMIN", "TECHNICIAN"], default: "CUSTOMER" }) role!: string;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamp" }) updatedAt!: Date;
}

@Entity("addresses")
export class Address {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "user_id" }) userId!: number;
  @Column({ name: "address_line1", length: 255 }) addressLine1!: string;
  @Column({ name: "address_line2", type: "varchar", length: 255, nullable: true }) addressLine2!: string | null;
  @Column({ length: 100 }) city!: string;
  @Column({ length: 100 }) state!: string;
  @Column({ length: 12 }) pincode!: string;
  @Column({ name: "address_type", length: 30, default: "HOME" }) addressType!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 100, unique: true }) name!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "category_id", type: "int", nullable: true }) categoryId!: number | null;
  @Column({ length: 160 }) name!: string;
  @Column({ type: "varchar", length: 100, nullable: true }) brand!: string | null;
  @Column({ length: 80, unique: true }) sku!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "decimal", precision: 10, scale: 2 }) price!: string;
  @Column({ type: "decimal", precision: 10, scale: 2 }) mrp!: string;
  @Column({ name: "stock_quantity", default: 0 }) stockQuantity!: number;
  @Column({ name: "warranty_days", default: 0 }) warrantyDays!: number;
  @Column({ name: "image_url", type: "varchar", length: 500, nullable: true }) imageUrl!: string | null;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamp" }) updatedAt!: Date;
}

@Entity("repair_services")
export class RepairServiceEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 120 }) name!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ name: "estimated_price", type: "decimal", precision: 10, scale: 2, nullable: true }) estimatedPrice!: string | null;
  @Column({ name: "estimated_time_hours", type: "smallint", nullable: true }) estimatedTimeHours!: number | null;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("technicians")
export class Technician {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "user_id", unique: true }) userId!: number;
  @Column({ type: "varchar", length: 160, nullable: true }) specialty!: string | null;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("repairs")
export class Repair {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "repair_code", length: 24, unique: true }) repairCode!: string;
  @Column({ name: "customer_id", type: "int", nullable: true }) customerId!: number | null;
  @Column({ name: "technician_id", type: "int", nullable: true }) technicianId!: number | null;
  @Column({ name: "device_brand", length: 80 }) deviceBrand!: string;
  @Column({ name: "device_model", length: 120 }) deviceModel!: string;
  @Column({ type: "varchar", length: 20, nullable: true }) imei!: string | null;
  @Column({ name: "problem_description", type: "text" }) problemDescription!: string;
  @Column({ type: "text", nullable: true }) diagnosis!: string | null;
  @Column({ name: "estimated_amount", type: "decimal", precision: 10, scale: 2, nullable: true }) estimatedAmount!: string | null;
  @Column({ name: "final_amount", type: "decimal", precision: 10, scale: 2, nullable: true }) finalAmount!: string | null;
  @Column({ type: "enum", enum: ["Repair Booked", "Device Received", "Device Inspection", "Estimate Generated", "Customer Approval", "Repair In Progress", "Testing", "Ready for Pickup", "Delivered", "Cancelled"], default: "Repair Booked" }) status!: string;
  @Column({ name: "customer_approval", type: "enum", enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" }) customerApproval!: string;
  @Column({ name: "pickup_required", default: false }) pickupRequired!: boolean;
  @Column({ name: "delivery_required", default: false }) deliveryRequired!: boolean;
  @Column({ name: "expected_completion", type: "datetime", nullable: true }) expectedCompletion!: Date | null;
  @Column({ name: "received_at", type: "datetime", nullable: true }) receivedAt!: Date | null;
  @Column({ name: "completed_at", type: "datetime", nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamp" }) updatedAt!: Date;
}

@Entity("repair_status_history")
export class RepairStatusHistory {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "repair_id" }) repairId!: number;
  @Column({ length: 40 }) status!: string;
  @Column({ type: "text", nullable: true }) note!: string | null;
  @Column({ name: "changed_by", type: "int", nullable: true }) changedBy!: number | null;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("repair_services_map")
export class RepairServiceMap {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "repair_id" }) repairId!: number;
  @Column({ name: "service_id" }) serviceId!: number;
  @Column({ default: 1 }) quantity!: number;
  @Column({ type: "decimal", precision: 10, scale: 2 }) price!: string;
}

@Entity("offers")
export class Offer {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 160 }) name!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ name: "discount_type", type: "enum", enum: ["PERCENT", "FIXED"] }) discountType!: string;
  @Column({ name: "discount_value", type: "decimal", precision: 10, scale: 2 }) discountValue!: string;
  @Column({ name: "start_date", type: "datetime" }) startDate!: Date;
  @Column({ name: "end_date", type: "datetime" }) endDate!: Date;
  @Column({ name: "minimum_order_amount", type: "decimal", precision: 10, scale: 2, default: 0 }) minimumOrderAmount!: string;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "offer_id" }) offerId!: number;
  @Column({ length: 50, unique: true }) code!: string;
  @Column({ name: "usage_limit", type: "int", nullable: true }) usageLimit!: number | null;
  @Column({ name: "used_count", default: 0 }) usedCount!: number;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "order_number", length: 24, unique: true }) orderNumber!: string;
  @Column({ name: "customer_id", type: "int", nullable: true }) customerId!: number | null;
  @Column({ name: "address_id", type: "int", nullable: true }) addressId!: number | null;
  @Column({ name: "customer_name", length: 120 }) customerName!: string;
  @Column({ name: "customer_phone", length: 20 }) customerPhone!: string;
  @Column({ name: "shipping_address", type: "text" }) shippingAddress!: string;
  @Column({ type: "decimal", precision: 10, scale: 2 }) subtotal!: string;
  @Column({ name: "discount_amount", type: "decimal", precision: 10, scale: 2, default: 0 }) discountAmount!: string;
  @Column({ name: "delivery_charge", type: "decimal", precision: 10, scale: 2, default: 0 }) deliveryCharge!: string;
  @Column({ name: "total_amount", type: "decimal", precision: 10, scale: 2 }) totalAmount!: string;
  @Column({ type: "enum", enum: ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"], default: "Pending" }) status!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamp" }) updatedAt!: Date;
}

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "order_id" }) orderId!: number;
  @Column({ name: "product_id", type: "int", nullable: true }) productId!: number | null;
  @Column({ length: 160 }) product_name!: string;
  @Column() quantity!: number;
  @Column({ name: "unit_price", type: "decimal", precision: 10, scale: 2 }) unitPrice!: string;
  @Column({ name: "total_price", type: "decimal", precision: 10, scale: 2 }) totalPrice!: string;
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "order_id", type: "int", nullable: true }) orderId!: number | null;
  @Column({ name: "repair_id", type: "int", nullable: true }) repairId!: number | null;
  @Column({ name: "payment_reference", type: "varchar", length: 120, nullable: true }) paymentReference!: string | null;
  @Column({ type: "decimal", precision: 10, scale: 2 }) amount!: string;
  @Column({ type: "enum", enum: ["CASH", "UPI", "CARD", "NET_BANKING", "ONLINE"], default: "CASH" }) method!: string;
  @Column({ type: "enum", enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" }) status!: string;
  @Column({ name: "paid_at", type: "datetime", nullable: true }) paidAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("reviews")
export class Review {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "customer_id" }) customerId!: number;
  @Column({ name: "product_id", type: "int", nullable: true }) productId!: number | null;
  @Column({ name: "repair_id", type: "int", nullable: true }) repairId!: number | null;
  @Column({ type: "tinyint" }) rating!: number;
  @Column({ type: "text", nullable: true }) comment!: string | null;
  @Column({ name: "is_approved", default: false }) isApproved!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: "user_id" }) userId!: number;
  @Column({ length: 160 }) title!: string;
  @Column({ type: "text" }) message!: string;
  @Column({ type: "enum", enum: ["WEBSITE", "EMAIL", "SMS", "WHATSAPP"], default: "WEBSITE" }) type!: string;
  @Column({ name: "is_read", default: false }) isRead!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamp" }) createdAt!: Date;
}

export const databaseEntities = [
  User, Address, Category, Product, RepairServiceEntity, Technician, Repair,
  RepairStatusHistory, RepairServiceMap, Offer, Coupon, Order, OrderItem,
  Payment, Review, Notification,
];