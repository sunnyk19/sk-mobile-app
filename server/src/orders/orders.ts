import { Body, Controller, Get, Injectable, Post, Query, BadRequestException, NotFoundException, Param, Patch, UseGuards, Req } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsArray, IsEmail, IsIn, IsOptional, IsString, Length, Matches, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { DataSource, Repository } from "typeorm";
import { Coupon, Offer, Order, OrderItem, Product, User } from "../database/entities";
import { AdminKeyGuard } from "../repairs/repairs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Request } from "express";

const orderStatuses = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];

class OrderItemDto {
  @Type(() => Number) @Min(1) productId!: number;
  @Type(() => Number) @Min(1) quantity!: number;
}

class CreateOrderDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Matches(/^\+?[0-9 ()-]{10,20}$/) phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @Length(8, 1000) address!: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
}

class UpdateOrderDto {
  @IsString() @IsIn(orderStatuses) status!: string;
}

@Injectable()
export class OrderService {
  constructor(private readonly dataSource: DataSource) {}

  create(input: CreateOrderDto) {
    if (!input.items.length) throw new BadRequestException("Add at least one product to the order.");
    return this.dataSource.transaction(async (manager) => {
      const products = manager.getRepository(Product);
      const orders = manager.getRepository(Order);
      const userRepo = manager.getRepository(User);
      const subtotalParts: Array<{ product: Product; quantity: number; lineTotal: number }> = [];
      for (const item of input.items) {
        const product = await products.findOne({ where: { id: item.productId, isActive: true }, lock: { mode: "pessimistic_write" } });
        if (!product) throw new NotFoundException(`Product ${item.productId} is unavailable.`);
        if (product.stockQuantity < item.quantity) throw new BadRequestException(`${product.name} does not have enough stock.`);
        subtotalParts.push({ product, quantity: item.quantity, lineTotal: Number(product.price) * item.quantity });
      }
      const subtotal = subtotalParts.reduce((sum, item) => sum + item.lineTotal, 0);
      let discount = 0;
      const couponCode = input.couponCode?.trim().toUpperCase();
      if (couponCode) {
        const coupon = await manager.getRepository(Coupon).findOne({ where: { code: couponCode, isActive: true }, lock: { mode: "pessimistic_write" } });
        if (!coupon || (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)) {
          throw new BadRequestException("Coupon is invalid or has reached its usage limit.");
        }
        const offer = await manager.getRepository(Offer).findOneBy({ id: coupon.offerId, isActive: true });
        const now = new Date();
        if (!offer || offer.startDate > now || offer.endDate < now || subtotal < Number(offer.minimumOrderAmount)) {
          throw new BadRequestException("Coupon is not valid for this order.");
        }
        discount = offer.discountType === "PERCENT"
          ? Math.round(subtotal * Number(offer.discountValue) / 100)
          : Math.min(subtotal, Number(offer.discountValue));
        coupon.usedCount += 1;
        await manager.getRepository(Coupon).save(coupon);
      }
      const delivery = subtotal >= 999 ? 0 : 49;
      const phone = input.phone.replace(/[ ()-]/g, "");
      const customer = await userRepo.findOneBy({ phone });
      const orderCount = await orders.count();
      const order = await orders.save(orders.create({
        orderNumber: `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, "0")}`,
        customerId: customer?.id ?? null, addressId: null, customerName: input.name.trim(),
        customerPhone: phone, shippingAddress: input.address.trim(), subtotal: subtotal.toFixed(2),
        discountAmount: discount.toFixed(2), deliveryCharge: delivery.toFixed(2),
        totalAmount: (subtotal - discount + delivery).toFixed(2), status: "Pending",
      }));
      const itemRepo = manager.getRepository(OrderItem);
      for (const item of subtotalParts) {
        item.product.stockQuantity -= item.quantity;
        await products.save(item.product);
        await itemRepo.save(itemRepo.create({
          orderId: order.id, productId: item.product.id, product_name: item.product.name,
          quantity: item.quantity, unitPrice: item.product.price,
          totalPrice: item.lineTotal.toFixed(2),
        }));
      }
      return { orderId: order.orderNumber, status: order.status, subtotal, discount, delivery, total: Number(order.totalAmount) };
    });
  }

  async listForUser(userId: number) {
    const orders = await this.dataSource.getRepository(Order).find({ where: { customerId: userId }, order: { createdAt: "DESC" } });
    return Promise.all(orders.map(async (order) => ({
      ...order,
      items: await this.dataSource.getRepository(OrderItem).find({ where: { orderId: order.id } }),
    })));
  }

  async listAdmin() {
    const orders = await this.dataSource.getRepository(Order).find({ order: { createdAt: "DESC" } });
    return Promise.all(orders.map(async (order) => ({
      ...order,
      items: await this.dataSource.getRepository(OrderItem).find({ where: { orderId: order.id } }),
    })));
  }

  async updateAdmin(orderNumber: string, status: string) {
    const repository = this.dataSource.getRepository(Order);
    const order = await repository.findOneBy({ orderNumber });
    if (!order) throw new NotFoundException("Order not found.");
    order.status = status;
    await repository.save(order);
    return { orderNumber: order.orderNumber, status: order.status };
  }
}

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrderService) {}
  @Post() create(@Body() input: CreateOrderDto) { return this.orders.create(input); }
  @Get() @UseGuards(JwtAuthGuard) list(@Req() request: Request & { user: { sub: number } }) {
    return this.orders.listForUser(request.user.sub);
  }
}

@Controller("admin/orders")
@UseGuards(AdminKeyGuard)
export class AdminOrdersController {
  constructor(private readonly orders: OrderService) {}
  @Get() list() { return this.orders.listAdmin(); }
  @Patch(":orderNumber") update(@Param("orderNumber") orderNumber: string, @Body() input: UpdateOrderDto) {
    return this.orders.updateAdmin(orderNumber, input.status);
  }
}