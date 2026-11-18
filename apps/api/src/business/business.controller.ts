import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BusinessService } from './business.service';

@ApiTags('Business')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // Listings
  @Get('listings/my')
  @ApiOperation({ summary: 'Get current user business listings' })
  async getMyListings(@Request() req: any) {
    return this.businessService.getMyListings(req.user.userId);
  }

  @Get('listings/user/:userId')
  @ApiOperation({ summary: 'Get listings of a specific business user' })
  async getListingsByUserId(@Param('userId') userId: string) {
    return this.businessService.getListingsByUserId(userId);
  }

  @Post('listings')
  @ApiOperation({ summary: 'Create a new business listing' })
  async createListing(@Request() req: any, @Body() body: any) {
    return this.businessService.createListing(req.user.userId, body);
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Update a business listing' })
  async updateListing(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.businessService.updateListing(req.user.userId, id, body);
  }

  @Delete('listings/:id')
  @ApiOperation({ summary: 'Delete a business listing' })
  async deleteListing(@Request() req: any, @Param('id') id: string) {
    return this.businessService.deleteListing(req.user.userId, id);
  }

  // Payment Requests
  @Get('payments/my')
  @ApiOperation({ summary: 'Get all payment requests for current user' })
  async getMyPayments(@Request() req: any) {
    return this.businessService.getMyPayments(req.user.userId);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Create a payment request' })
  async createPayment(@Request() req: any, @Body() body: any) {
    return this.businessService.createPaymentRequest(req.user.userId, body);
  }

  @Patch('payments/:id/pay')
  @ApiOperation({ summary: 'Mark a payment as paid' })
  async markPaymentPaid(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.businessService.markPaymentPaid(req.user.userId, id, body);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  async getPaymentById(@Param('id') id: string) {
    return this.businessService.getPaymentById(id);
  }

  // Appointments
  @Get('appointments/my')
  @ApiOperation({ summary: 'Get appointments for current user' })
  async getMyAppointments(@Request() req: any) {
    return this.businessService.getMyAppointments(req.user.userId);
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Schedule a new appointment' })
  async createAppointment(@Request() req: any, @Body() body: any) {
    return this.businessService.createAppointment(req.user.userId, body);
  }

  @Patch('appointments/:id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  async updateAppointmentStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  ) {
    return this.businessService.updateAppointmentStatus(req.user.userId, id, status);
  }
}
