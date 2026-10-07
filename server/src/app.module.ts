import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseEntities } from "./database/entities";
import { AuthController, AuthService } from "./auth/auth";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { CatalogController, CatalogService } from "./catalog/catalog";
import { AdminKeyGuard, AdminRepairsController, RepairsController, RepairService } from "./repairs/repairs";
import { AdminOrdersController, OrdersController, OrderService } from "./orders/orders";
import { HealthController } from "./health";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      url: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      entities: databaseEntities,
      synchronize: false,
      retryAttempts: 5,
      retryDelay: 3000,
      extra: { connectionLimit: 5 },
    }),
    TypeOrmModule.forFeature(databaseEntities),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "local-development-secret-change-me",
      signOptions: { expiresIn: "12h" },
    }),
  ],
  controllers: [HealthController, AuthController, CatalogController, RepairsController, AdminRepairsController, OrdersController, AdminOrdersController],
  providers: [AuthService, CatalogService, RepairService, OrderService, AdminKeyGuard, JwtAuthGuard],
})
export class AppModule {}