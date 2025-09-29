import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { Roles } from '@prisma/client';
import { error } from 'console';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private emailService: MailerService
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) return null;
    if (!user.password) {
      throw new UnauthorizedException('Invalid login method');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user);
  }

  async registeruser(registerDto: RegisterDto) {
    const { email } = registerDto;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
    const user = await this.usersService.createCustomer({ ...registerDto });
    if (registerDto.password) {
      return this.generateToken(user);
    } else {
      return await this.generateOtp(email);
    }
  }

  async registeradmin(registerDto: RegisterDto) {
    const { email } = registerDto;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
    const user = await this.usersService.createAdmin({ ...registerDto });
    if (registerDto.password) {
      return this.generateToken(user);
    } else {
      return await this.generateOtp(email);
    }
  }

  async generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async generateOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'Not a registered user' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    await this.prisma.userOtp.upsert({
      where: { userId: user.id },
      update: { otp, expiresAt: expiry },
      create: {
        userId: user.id,
        otp,
        expiresAt: expiry,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      return {
        message: 'OTP generated (development mode)',
        otp,
      };
    }

    return { message: 'OTP sent to your email' };
  }

  async validateOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const userOtp = await this.prisma.userOtp.findUnique({
      where: { userId: user.id },
    });
    if (!userOtp || userOtp.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    if (new Date() > userOtp.expiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }
    // Clear OTP after validation
    await this.prisma.userOtp.delete({ where: { userId: user.id } });
    return this.generateToken(user);
  }

  async getAdminProfile(id: string, role: string) {
    if (role !== Roles.ADMIN) {
      throw new ForbiddenException('Profile cannot be accessed');
    }
    return this.usersService.AdminProfile(id);
  }

  async getCustomerProfile(id: string, role: string) {

    return this.usersService.CutomerProfile(id);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { oldPassword, newPassword, confirmPassword } = dto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Old password is incorrect');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    return { message: 'Password changed successfully' };
  }


  // 1. Send OTP
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        resetOtp: otp,
        resetOtpExpiresAt: expiresAt,
      },
    });
    await this.emailService.sendMail({
      from: `"MyApp" <${process.env.EMAIL_USER}>`,
      to: dto.email,
      subject: 'Password Reset OTP',
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    });
    return { message: 'OTP sent to email' };
  }

  // 2. Reset Password
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
      throw new BadRequestException('Invalid request');
    }

    if (user.resetOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.resetOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpiresAt: null,
      },
    });

    return { message: 'Password reset successful' };
  }
}
