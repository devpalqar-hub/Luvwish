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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) { }

  @Post('login')
  @ApiOperation({ summary: 'Login with email/password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'User logged in successfully' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register customer account' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: 'Customer registered successfully' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registeruser(registerDto);
  }

  //need to make it only accessbile by admin
  @Post('register-admin')
  @ApiOperation({ summary: 'Register admin account' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: 'Admin registered successfully' })
  async registerAdmin(@Body() registerDto: RegisterDto) {
    return this.authService.registeradmin(registerDto);
  }

  @Post('otp/generate')
  @ApiOperation({ summary: 'Generate legacy OTP' })
  @ApiBody({ type: EmailDto })
  @ApiOkResponse({ description: 'OTP generated successfully' })
  async generateOtp(@Body() emailDto: EmailDto) {
    return this.authService.generateOtp(emailDto.email);
  }

  @Post('otp/verify-legacy')
  @ApiOperation({ summary: 'Verify legacy OTP' })
  @ApiBody({ type: OtpVerifyDto })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  async verifyOtp(@Body() otpVerifyDto: OtpVerifyDto) {
    return this.authService.validateOtp(otpVerifyDto.email, otpVerifyDto.otp);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin profile' })
  @ApiOkResponse({ description: 'Admin profile returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer profile' })
  @ApiOkResponse({ description: 'Customer profile returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async getCustomerProfile(@Request() req) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.authService.getCustomerProfile(userId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create customer profile' })
  @ApiBody({ type: UpdateCustomerProfileDto })
  @ApiOkResponse({ description: 'Customer profile created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async createProfile(
    @Request() req,
    @Body() data: UpdateCustomerProfileDto,
  ) {
    const userId = req.user.id;
    return this.userService.createCustomerProfile(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  @ApiBody({ type: UpdateCustomerProfileDto })
  @ApiOkResponse({ description: 'Customer profile updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async updateProfile(
    @Request() req,
    @Body() data: UpdateCustomerProfileDto,
  ) {
    const userId = req.user.id;
    return this.userService.updateCustomerProfile(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for logged-in user' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.id;
    return this.authService.changePassword(userId, dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Password reset request accepted' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP/token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 🔹 Register customer with OTP
  @Post('register-with-otp')
  @ApiOperation({ summary: 'Register with OTP flow' })
  @ApiBody({ type: RegisterWithOtpDto })
  @ApiOkResponse({ description: 'Registration OTP sent/validated successfully' })
  async registerWithOtp(@Body() dto: RegisterWithOtpDto) {
    return this.authService.registerWithOtp(dto);
  }

  // 🔹 Verify registration OTP
  @Post('verify-registration-otp')
  @ApiOperation({ summary: 'Verify registration OTP' })
  @ApiBody({ type: VerifyRegistrationOtpDto })
  @ApiOkResponse({ description: 'Registration OTP verified successfully' })
  async verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  // 🔹 Login with OTP (send OTP to email)
  @Post('login-with-otp')
  @ApiOperation({ summary: 'Start login with OTP' })
  @ApiBody({ type: LoginWithOtpDto })
  @ApiOkResponse({ description: 'Login OTP sent successfully' })
  async loginWithOtp(@Body() dto: LoginWithOtpDto) {
    return this.authService.loginWithOtp(dto);
  }

  // 🔹 Verify login OTP
  @Post('verify-login-otp')
  @ApiOperation({ summary: 'Verify login OTP' })
  @ApiBody({ type: VerifyLoginOtpDto })
  @ApiOkResponse({ description: 'Login OTP verified successfully' })
  async verifyLoginOtp(@Body() dto: VerifyLoginOtpDto) {
    return this.authService.verifyLoginOtp(dto);
  }

  // 🔹 NEW OTP FLOW - Send OTP to email (for both login and registration)
  @Post('otp/send')
  @ApiOperation({ summary: 'Send OTP for login/registration' })
  @ApiBody({ type: SendOtpDto })
  @ApiOkResponse({ description: 'OTP sent successfully' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // 🔹 NEW OTP FLOW - Verify OTP and check if user is new or existing
  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP and identify user state' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  async verifyOtpNew(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // 🔹 NEW OTP FLOW - Complete registration for new users
  @UseGuards(JwtAuthGuard)
  @Post('otp/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete registration after OTP verification' })
  @ApiBody({ type: CompleteRegistrationDto })
  @ApiOkResponse({ description: 'Registration completed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async completeRegistration(@Request() req, @Body() dto: CompleteRegistrationDto) {
    const userId = req.user.id || req.user.sub;
    return this.authService.completeRegistration(userId, dto);
  }
}
