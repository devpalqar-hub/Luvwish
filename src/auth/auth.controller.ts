// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Request,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { EmailDto } from './dto/email.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateCustomerProfileDto } from 'src/users/dto/update-customer-profile.dto';
import { UsersService } from 'src/users/users.service';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterWithOtpDto } from './dto/register-with-otp.dto';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import { LoginWithOtpDto } from './dto/login-with-otp.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) { }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registeruser(registerDto);
  }

  //need to make it only accessbile by admin
  @Post('register-admin')
  async registerAdmin(@Body() registerDto: RegisterDto) {
    return this.authService.registeradmin(registerDto);
  }

  @Post('otp/generate')
  async generateOtp(@Body() emailDto: EmailDto) {
    return this.authService.generateOtp(emailDto.email);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() otpVerifyDto: OtpVerifyDto) {
    return this.authService.validateOtp(otpVerifyDto.email, otpVerifyDto.otp);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminProfile(@Request() req) {
    const userId = req.user.id;
    const role = req.user.role;
    console.log(role);
    return this.authService.getAdminProfile(userId, role);
  }

  // 🔹 Customer profile
  @Get('customer/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  async getCustomerProfile(@Request() req) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.authService.getCustomerProfile(userId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async createProfile(
    @Request() req,
    @Body() data: UpdateCustomerProfileDto,
  ) {
    const userId = req.user.id;
    return this.userService.createCustomerProfile(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() data: UpdateCustomerProfileDto,
  ) {
    const userId = req.user.id;
    return this.userService.updateCustomerProfile(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.id;
    return this.authService.changePassword(userId, dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 🔹 Register customer with OTP
  @Post('register-with-otp')
  async registerWithOtp(@Body() dto: RegisterWithOtpDto) {
    return this.authService.registerWithOtp(dto);
  }

  // 🔹 Verify registration OTP
  @Post('verify-registration-otp')
  async verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  // 🔹 Login with OTP (send OTP to email)
  @Post('login-with-otp')
  async loginWithOtp(@Body() dto: LoginWithOtpDto) {
    return this.authService.loginWithOtp(dto);
  }

  // 🔹 Verify login OTP
  @Post('verify-login-otp')
  async verifyLoginOtp(@Body() dto: VerifyLoginOtpDto) {
    return this.authService.verifyLoginOtp(dto);
  }

  // 🔹 NEW OTP FLOW - Send OTP to email (for both login and registration)
  @Post('otp/send')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // 🔹 NEW OTP FLOW - Verify OTP and check if user is new or existing
  @Post('otp/verify')
  async verifyOtpNew(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // 🔹 NEW OTP FLOW - Complete registration for new users
  @UseGuards(JwtAuthGuard)
  @Post('otp/complete')
  async completeRegistration(@Request() req, @Body() dto: CompleteRegistrationDto) {
    const userId = req.user.id || req.user.sub;
    return this.authService.completeRegistration(userId, dto);
  }
}
