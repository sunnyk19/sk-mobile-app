import {
  Body, CanActivate, Controller, ExecutionContext, Get, Injectable, NotFoundException,
  Param, Patch, Post, Query, UnauthorizedException, UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import { Request } from "express";
import { Repository } from "typeorm";
import {
  Repair, RepairServiceEntity, RepairServiceMap, RepairStatusHistory, Technician, User,
} from "../database/entities";

const repairStatuses = ["Repair Booked", "Device Received", "Device Inspection", "Estimate Generated", "Customer Approval", "Repair In Progress", "Testing", "Ready for Pickup", "Delivered", "Cancelled"];

class CreateRepairDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Matches(/^\+?[0-9 ()-]{10,20}$/) phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsString() @Length(2, 80) brand!: string;
  @IsString() @Length(1, 120) model!: string;
  @IsOptional() @IsString() @Length(15, 17) imei?: string;
  @IsString() @Length(3, 1200) problem!: string;
  @IsString() @Length(2, 120) service!: string;
  @IsOptional() @IsBoolean() pickup?: boolean;
  @IsOptional() @IsBoolean() delivery?: boolean;
}

class UpdateRepairDto {
  @IsString() @IsIn(repairStatuses) status!: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
  @IsOptional() @IsString() diagnosis?: string;
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.ADMIN_API_KEY;
    const request = context.switchToHttp().getRequest<Request>();
    const supplied = request.headers["x-admin-key"];
    if (!expected || typeof supplied !== "string" || supplied !== expected) {
      throw new UnauthorizedException("Valid admin key required.");
    }
    return true;
  }
}

@Injectable()
export class RepairService {
  constructor(
    @InjectRepository(Repair) private readonly repairs: Repository<Repair>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RepairServiceEntity) private readonly services: Repository<RepairServiceEntity>,
    @InjectRepository(RepairServiceMap) private readonly serviceMap: Repository<RepairServiceMap>,
    @InjectRepository(RepairStatusHistory) private readonly history: Repository<RepairStatusHistory>,
    @InjectRepository(Technician) private readonly technicians: Repository<Technician>,
    @InjectRepository(User) private readonly staffUsers: Repository<User>,
  ) {}

  async create(input: CreateRepairDto) {
    const phone = input.phone.replace(/[ ()-]/g, "");
    let customer = await this.users.findOneBy({ phone });
    if (!customer) {
      customer = await this.users.save(this.users.create({
        name: input.name.trim(), phone, email: input.email?.trim().toLowerCase() || null,
        passwordHash: null, role: "CUSTOMER",
      }));
    }
    const service = await this.services.findOneBy({ name: input.service });
    const year = new Date().getFullYear();
    const count = await this.repairs.count();
    const repairCode = `REP-${year}-${String(count + 1).padStart(5, "0")}`;
    const repair = await this.repairs.save(this.repairs.create({
      repairCode, customerId: customer.id, technicianId: null, deviceBrand: input.brand,
      deviceModel: input.model, imei: input.imei || null, problemDescription: input.problem,
      diagnosis: null, estimatedAmount: null, finalAmount: null, status: "Repair Booked",
      customerApproval: "PENDING", pickupRequired: input.pickup ?? false,
      deliveryRequired: input.delivery ?? false, expectedCompletion: null, receivedAt: null, completedAt: null,
    }));
    if (service) await this.serviceMap.save(this.serviceMap.create({
      repairId: repair.id, serviceId: service.id, quantity: 1,
      price: service.estimatedPrice ?? "0.00",
    }));
    await this.history.save(this.history.create({ repairId: repair.id, status: repair.status, note: "Repair booking received.", changedBy: null }));
    return { repairId: repair.repairCode, status: repair.status };
  }

  async track(repairCode: string, phoneInput: string) {
    const repair = await this.repairs.findOneBy({ repairCode: repairCode.trim().toUpperCase() });
    if (!repair) throw new NotFoundException("Repair not found. Check the repair ID and mobile number.");
    const customer = repair.customerId ? await this.users.findOneBy({ id: repair.customerId }) : null;
    const phone = phoneInput.replace(/[ ()-]/g, "");
    if (!customer || customer.phone !== phone) throw new NotFoundException("Repair not found. Check the repair ID and mobile number.");
    const [maps, history] = await Promise.all([
      this.serviceMap.find({ where: { repairId: repair.id } }),
      this.history.find({ where: { repairId: repair.id }, order: { createdAt: "ASC" } }),
    ]);
    const service = maps.length ? await this.services.findOneBy({ id: maps[0].serviceId }) : null;
    const technician = repair.technicianId ? await this.technicians.findOneBy({ id: repair.technicianId }) : null;
    const technicianUser = technician ? await this.staffUsers.findOneBy({ id: technician.userId }) : null;
    return {
      repairId: repair.repairCode, status: repair.status, name: customer.name,
      brand: repair.deviceBrand, model: repair.deviceModel, problem: repair.problemDescription,
      service: service?.name ?? "Repair service", diagnosis: repair.diagnosis,
      estimatedCost: repair.estimatedAmount, finalCost: repair.finalAmount,
      technician: technicianUser?.name ?? null, expectedCompletion: repair.expectedCompletion,
      history: history.map((item) => ({ status: item.status, note: item.note, createdAt: item.createdAt })),
    };
  }

  async list() {
    const repairs = await this.repairs.find({ order: { createdAt: "DESC" } });
    return Promise.all(repairs.map(async (repair) => {
      const customer = repair.customerId ? await this.users.findOneBy({ id: repair.customerId }) : null;
      return { ...repair, customerName: customer?.name ?? "Guest", phone: customer?.phone ?? "" };
    }));
  }

  async update(repairCode: string, input: UpdateRepairDto) {
    const repair = await this.repairs.findOneBy({ repairCode });
    if (!repair) throw new NotFoundException("Repair not found.");
    repair.status = input.status;
    if (input.diagnosis !== undefined) repair.diagnosis = input.diagnosis;
    if (input.status === "Device Received" && !repair.receivedAt) repair.receivedAt = new Date();
    if (["Delivered", "Cancelled"].includes(input.status)) repair.completedAt = new Date();
    await this.repairs.save(repair);
    await this.history.save(this.history.create({ repairId: repair.id, status: input.status, note: input.note ?? null, changedBy: null }));
    return { repairId: repair.repairCode, status: repair.status };
  }
}

@Controller("repairs")
export class RepairsController {
  constructor(private readonly repairs: RepairService) {}
  @Post() create(@Body() input: CreateRepairDto) { return this.repairs.create(input); }
  @Get("track") track(@Query("repairId") repairId: string, @Query("phone") phone: string) { return this.repairs.track(repairId, phone); }
}

@Controller("admin/repairs")
@UseGuards(AdminKeyGuard)
export class AdminRepairsController {
  constructor(private readonly repairs: RepairService) {}
  @Get() list() { return this.repairs.list(); }
  @Patch(":repairCode") update(@Param("repairCode") repairCode: string, @Body() input: UpdateRepairDto) {
    return this.repairs.update(repairCode, input);
  }
}