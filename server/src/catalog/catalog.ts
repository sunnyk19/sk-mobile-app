import { Controller, Get, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category, Offer, Product, Review, User } from "../database/entities";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async listProducts() {
    const [products, categories] = await Promise.all([
      this.products.find({ where: { isActive: true }, order: { id: "ASC" } }),
      this.categories.find({ where: { isActive: true } }),
    ]);
    const names = new Map(categories.map((category) => [category.id, category.name]));
    return products.map((product) => ({ ...product, category: names.get(product.categoryId ?? -1) ?? "Accessories" }));
  }

  listCategories() {
    return this.categories.find({ where: { isActive: true }, order: { name: "ASC" } });
  }

  async listOffers() {
    const now = new Date();
    return this.offers.find({ where: { isActive: true }, order: { startDate: "ASC" } }).then((offers) =>
      offers.filter((offer) => offer.startDate <= now && offer.endDate >= now),
    );
  }

  async listApprovedReviews() {
    const reviews = await this.reviews.find({ where: { isApproved: true }, order: { createdAt: "DESC" }, take: 6 });
    return Promise.all(reviews.map(async (review) => {
      const customer = await this.users.findOneBy({ id: review.customerId });
      return { rating: review.rating, comment: review.comment, createdAt: review.createdAt, customerName: customer?.name ?? "Customer" };
    }));
  }
}

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("products") products() { return this.catalog.listProducts(); }
  @Get("categories") categories() { return this.catalog.listCategories(); }
  @Get("offers") offers() { return this.catalog.listOffers(); }
  @Get("reviews") reviews() { return this.catalog.listApprovedReviews(); }
}