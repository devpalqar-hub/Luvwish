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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) { }

  @Post('login')
  @ApiOperation({
    summary: 'User login with credentials',
    description: 'Authenticate user with email and password. Returns JWT token for authenticated requests.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: 'uuid',
          email: 'user@example.com',
          role: 'CUSTOMER',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid email or password' })
  @ApiConflictResponse({ description: 'User account is disabled' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register new customer account',
    description: 'Create a new customer account with email and password. Email must be unique.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    schema: {
      example: {
        id: 'uuid',
        email: 'newuser@example.com',
        role: 'CUSTOMER',
        createdAt: '2026-02-16T10:30:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid email format or password too weak' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registeruser(registerDto);
  }

  @Post('register-admin')
  @ApiOperation({
    summary: 'Register new admin account',
    description: 'Create a new admin account. Admin registration typically requires authorization.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Admin registration successful',
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async registerAdmin(@Body() registerDto: RegisterDto) {
    return this.authService.registeradmin(registerDto);
  }

  @Post('otp/generate')
  @ApiOperation({
    summary: 'Generate OTP for email verification (Legacy)',
    description: 'Send one-time password to user email for verification. Legacy endpoint.',
  })
  @ApiBody({ type: EmailDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid email address' })
  async generateOtp(@Body() emailDto: EmailDto) {
    return this.authService.generateOtp(emailDto.email);
  }

  @Post('otp/verify-legacy')
  @ApiOperation({
    summary: 'Verify OTP code (Legacy)',
    description: 'Verify one-time password sent to email. Legacy endpoint.',
  })
  @ApiBody({ type: OtpVerifyDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() otpVerifyDto: OtpVerifyDto) {
    return this.authService.validateOtp(otpVerifyDto.email, otpVerifyDto.otp);
  }

  @Get('profile')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get admin profile',
    description: 'Retrieve authenticated admin user profile information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Only admins can access this' })
  async getAdminProfile(@Request() req) {
    const userId = req.user.id;
    const role = req.user.role;
    console.log(role);
    return this.authService.getAdminProfile(userId, role);
  }

  @Get('customer/profile')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({
    summary: 'Get customer profile',
    description: 'Retrieve authenticated customer profile with contact and address information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer profile retrieved',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getCustomerProfile(@Request() req) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.authService.getCustomerProfile(userId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create customer profile',
    description: 'Create complete customer profile with address and contact information.',
  })
  @ApiBody({ type: UpdateCustomerProfileDto })
  @ApiResponse({
    status: 201,
    description: 'Customer profile created',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createProfile(
    @Request() req,
    @Body() data: UpdateCustomerProfileDto,
  ) {
    const userId = req.user.id;
    return this.userService.createCustomerProfile(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update customer profile',
    description: 'Update customer profile information, address, and contact details.',
  })
  @ApiBody({ type: UpdateCustomerProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Customer profile updated',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid profile data' })
  async updateProfile(
    @Request() req,
    @Body() data: UpdateCustomerProfileDto,
  ) {
    const userId = req.user.id;
    return this.userService.updateCustomerProfile(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change user password',
    description: 'Update password for authenticated user. Requires current password verification.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Current password is incorrect' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.id;
    return this.authService.changePassword(userId, dto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email. User must verify their email to proceed with reset.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent',
  })
  @ApiBadRequestResponse({ description: 'User email not found' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Complete password reset using the token sent via email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('register-with-otp')
  @ApiOperation({
    summary: 'Initiate registration with OTP',
    description: 'Start user registration process. Sends OTP code to provided email.',
  })
  @ApiBody({ type: RegisterWithOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Registration initiated, OTP sent to email',
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  async registerWithOtp(@Body() dto: RegisterWithOtpDto) {
    return this.authService.registerWithOtp(dto);
  }

  @Post('verify-registration-otp')
  @ApiOperation({
    summary: 'Verify OTP during registration',
    description: 'Verify the OTP code sent to email during registration process.',
  })
  @ApiBody({ type: VerifyRegistrationOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified, registration completed',
    schema: {
      example: {
        accessToken: 'token...',
        user: { id: 'uuid', email: 'user@example.com' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired OTP' })
  async verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  @Post('login-with-otp')
  @ApiOperation({
    summary: 'Request login OTP',
    description: 'Send one-time password to registered email for OTP-based login.',
  })
  @ApiBody({ type: LoginWithOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent to email',
  })
  @ApiBadRequestResponse({ description: 'User email not found' })
  async loginWithOtp(@Body() dto: LoginWithOtpDto) {
    return this.authService.loginWithOtp(dto);
  }

  @Post('verify-login-otp')
  @ApiOperation({
    summary: 'Verify OTP login',
    description: 'Verify OTP code to complete OTP-based login.',
  })
  @ApiBody({ type: VerifyLoginOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'token...',
        user: { id: 'uuid', email: 'user@example.com' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired OTP' })
  async verifyLoginOtp(@Body() dto: VerifyLoginOtpDto) {
    return this.authService.verifyLoginOtp(dto);
  }

  @Post('otp/send')
  @ApiOperation({
    summary: 'Send OTP (New Flow)',
    description: 'Send OTP code for both login and registration. New unified OTP flow.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent to email',
    schema: {
      example: {
        message: 'OTP sent to email',
        userExists: true,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid email address' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @ApiOperation({
    summary: 'Verify OTP and Check User Status',
    description: 'Verify OTP code. Returns temp token for new users to complete registration or access token for existing users.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified',
    schema: {
      example: {
        accessToken: 'token...',
        tempToken: 'temp...',
        isNewUser: true,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired OTP' })
  async verifyOtpNew(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/complete')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Complete Registration (New User)',
    description: 'Complete registration for new user after OTP verification. Requires temp token from OTP verification.',
  })
  @ApiBody({ type: CompleteRegistrationDto })
  @ApiResponse({
    status: 201,
    description: 'Registration completed',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid or incomplete registration data' })
  async completeRegistration(@Request() req, @Body() dto: CompleteRegistrationDto) {
    const userId = req.user.id || req.user.sub;
    return this.authService.completeRegistration(userId, dto);
  }
}
