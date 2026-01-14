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
import { RegisterWithOtpDto } from './dto/register-with-otp.dto';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import { LoginWithOtpDto } from './dto/login-with-otp.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';

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

  // 🔹 Helper method to send OTP email (with error handling)
  private async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      await this.emailService.sendMail({
        from: `"Luvwish" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Your OTP for Verification',
        text: `Your OTP is: ${otp}. It will expire in 15 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to Luvwish!</h2>
            <p>Your OTP for verification is:</p>
            <h1 style="color: #4CAF50; font-size: 32px;">${otp}</h1>
            <p>This OTP will expire in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      // Log error but don't crash the API
      console.error('Failed to send OTP email:', error.message);
    }
  }

  // 🔹 Register customer with OTP
  async registerWithOtp(dto: RegisterWithOtpDto) {
    const { email, name, phone } = dto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Use default OTP or generate random one
    const otp = '759409'; // Default OTP as requested
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    // Store registration data temporarily in a separate table or cache
    // For now, we'll create the user but mark as unverified
    const user = await this.prisma.user.create({
      data: {
        email,
        role: Roles.CUSTOMER,
        CustomerProfile: {
          create: {
            name,
            phone,
          },
        },
      },
      include: {
        CustomerProfile: true,
      },
    });

    // Create OTP record
    await this.prisma.userOtp.create({
      data: {
        userId: user.id,
        otp,
        expiresAt: expiry,
        used: false,
      },
    });

    // Send OTP email (won't crash if fails)
    await this.sendOtpEmail(email, otp);

    return {
      message: 'Registration initiated. Please verify OTP sent to your email.',
      email,
      // For development: return OTP
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    };
  }

  // 🔹 Verify registration OTP
  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto) {
    const { email, otp } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { CustomerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userOtp = await this.prisma.userOtp.findUnique({
      where: { userId: user.id },
    });

    if (!userOtp || userOtp.used) {
      throw new BadRequestException('Invalid or already used OTP');
    }

    if (userOtp.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > userOtp.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    // Mark OTP as used
    await this.prisma.userOtp.update({
      where: { userId: user.id },
      data: { used: true },
    });

    // Create cart and wishlist for the customer
    await this.prisma.cartItem.create({
      data: {
        customerProfileId: user.CustomerProfile.id,
      },
    });

    await this.prisma.wishlist.create({
      data: {
        customerProfileId: user.CustomerProfile.id,
      },
    });

    // Generate JWT token
    return this.generateToken(user);
  }

  // 🔹 Login with OTP (send OTP to email)
  async loginWithOtp(dto: LoginWithOtpDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    if (user.role !== Roles.CUSTOMER) {
      throw new ForbiddenException('OTP login is only available for customers');
    }

    // Use default OTP
    const otp = '759409';
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    // Create or update OTP
    await this.prisma.userOtp.upsert({
      where: { userId: user.id },
      update: {
        otp,
        expiresAt: expiry,
        used: false,
      },
      create: {
        userId: user.id,
        otp,
        expiresAt: expiry,
        used: false,
      },
    });

    // Send OTP email (won't crash if fails)
    await this.sendOtpEmail(email, otp);

    return {
      message: 'OTP sent to your email for login verification',
      email,
      // For development: return OTP
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    };
  }

  // 🔹 Verify login OTP
  async verifyLoginOtp(dto: VerifyLoginOtpDto) {
    const { email, otp } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { CustomerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userOtp = await this.prisma.userOtp.findUnique({
      where: { userId: user.id },
    });

    if (!userOtp || userOtp.used) {
      throw new BadRequestException('Invalid or already used OTP');
    }

    if (userOtp.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > userOtp.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    // Mark OTP as used
    await this.prisma.userOtp.update({
      where: { userId: user.id },
      data: { used: true },
    });

    // Generate JWT token
    return this.generateToken(user);
  }
}
