import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  // Listings
  async getMyListings(userId: string) {
    return this.prisma.businessListing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getListingsByUserId(userId: string) {
    return this.prisma.businessListing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createListing(
    userId: string,
    data: {
      title: string;
      description: string;
      price: number;
      currency?: string;
      imageUrl?: string;
      category?: string;
      inStock?: boolean;
    },
  ) {
    return this.prisma.businessListing.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        price: Number(data.price),
        currency: data.currency || 'USD',
        imageUrl: data.imageUrl || null,
        category: data.category || null,
        inStock: data.inStock ?? true,
      },
    });
  }

  async updateListing(
    userId: string,
    id: string,
    data: Partial<{
      title: string;
      description: string;
      price: number;
      currency: string;
      imageUrl: string;
      category: string;
      inStock: boolean;
    }>,
  ) {
    const listing = await this.prisma.businessListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenException('You can only update your own listings');

    return this.prisma.businessListing.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? Number(data.price) : undefined,
      },
    });
  }

  async deleteListing(userId: string, id: string) {
    const listing = await this.prisma.businessListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenException('You can only delete your own listings');

    await this.prisma.businessListing.delete({ where: { id } });
    return { success: true };
  }

  // Payment Requests / Invoices
  async getMyPayments(userId: string) {
    return this.prisma.paymentRequest.findMany({
      where: {
        OR: [{ businessId: userId }, { customerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPaymentRequest(
    businessId: string,
    data: {
      customerId?: string;
      customerName?: string;
      chatId?: string;
      amount: number;
      currency?: string;
      description: string;
    },
  ) {
    return this.prisma.paymentRequest.create({
      data: {
        businessId,
        customerId: data.customerId || '',
        customerName: data.customerName || null,
        chatId: data.chatId || null,
        amount: Number(data.amount),
        currency: data.currency || 'USD',
        description: data.description,
        status: 'PENDING',
      },
    });
  }

  async markPaymentPaid(
    userId: string,
    id: string,
    data?: { paymentMethod?: string; receiptUrl?: string },
  ) {
    const payment = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment request not found');

    return this.prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: data?.paymentMethod || 'INSTANT_PAY',
        receiptUrl: data?.receiptUrl || null,
      },
    });
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment request not found');
    return payment;
  }

  // Appointments / Meetings
  async getMyAppointments(userId: string) {
    return this.prisma.appointment.findMany({
      where: {
        OR: [{ businessId: userId }, { clientId: userId }],
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async createAppointment(
    businessId: string,
    data: {
      clientId?: string;
      clientName?: string;
      title: string;
      scheduledAt: string | Date;
      durationMinutes?: number;
      notes?: string;
      meetingLink?: string;
    },
  ) {
    return this.prisma.appointment.create({
      data: {
        businessId,
        clientId: data.clientId || '',
        clientName: data.clientName || null,
        title: data.title,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : 30,
        status: 'PENDING',
        notes: data.notes || null,
        meetingLink: data.meetingLink || null,
      },
    });
  }

  async updateAppointmentStatus(
    userId: string,
    id: string,
    status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  ) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
  }
}
