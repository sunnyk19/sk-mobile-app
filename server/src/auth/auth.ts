import { Body, ConflictException, Controller, Injectable, Post, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { IsEmail, IsString, Length, Matches, MinLength } from "class-validator";
import { compare, hash } from "bcryptjs";
import { Repository } from "typeorm";
import { User } from "../database/entities";

class RegisterDto {
  @IsString() @Length(2, 120) name!: string;
  @IsEmail() email!: string;
  @IsString() @Matches(/^\+?[0-9 ()-]{10,20}$/) phone!: string;
  @IsString() @MinLength(8) password!: string;
}

class LoginDto {
  @IsString() identifier!: string;
  @IsString() password!: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const phone = input.phone.replace(/[ ()-]/g, "");
    const exists = await this.users.findOne({ where: [{ email: input.email.toLowerCase() }, { phone }] });
    if (exists) throw new ConflictException("An account already uses that email or phone number.");
    const user = await this.users.save(this.users.create({
      name: input.name.trim(), email: input.email.toLowerCase(), phone,
      passwordHash: await hash(input.password, 12), role: "CUSTOMER",
    }));
    return this.session(user);
  }

  async login(input: LoginDto) {
    const identifier = input.identifier.trim().toLowerCase();
    const user = await this.users.createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("LOWER(user.email) = :identifier OR user.phone = :phone", {
        identifier, phone: input.identifier.replace(/[ ()-]/g, ""),
      })
      .andWhere("user.isActive = :active", { active: true })
      .getOne();
    if (!user?.passwordHash || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Email/phone or password is incorrect.");
    }
    return this.session(user);
  }

  private session(user: User) {
    const payload = { sub: user.id, name: user.name, role: user.role };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("register") register(@Body() input: RegisterDto) { return this.auth.register(input); }
  @Post("login") login(@Body() input: LoginDto) { return this.auth.login(input); }
}