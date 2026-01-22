import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWhatsAppSettingsDto, UpdateWhatsAppSettingsDto } from './dto/whatsapp-settings.dto';
import {
  WhatsAppTextMessage,
  WhatsAppImageMessage,
  WhatsAppInteractiveMessage,
} from './interfaces/whatsapp-message.interface';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0';

  constructor(public readonly prisma: PrismaService) {}

  // ==================== SETTINGS MANAGEMENT ====================

  async createSettings(dto: CreateWhatsAppSettingsDto) {
    const existing = await this.prisma.whatsAppSettings.findFirst({
      where: { isActive: true },
    });

    if (existing) {
      // Deactivate existing settings
      await this.prisma.whatsAppSettings.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }

    return this.prisma.whatsAppSettings.create({
      data: {
        ...dto,
        isActive: true,
      },
    });
  }

  async updateSettings(id: string, dto: UpdateWhatsAppSettingsDto) {
    const settings = await this.prisma.whatsAppSettings.findUnique({
      where: { id },
    });

    if (!settings) {
      throw new NotFoundException('WhatsApp settings not found');
    }

    return this.prisma.whatsAppSettings.update({
      where: { id },
      data: dto,
    });
  }

  async getActiveSettings() {
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { isActive: true },
      orderBy: { lastUpdatedAt: 'desc' },
    });

    if (!settings) {
      throw new NotFoundException('No active WhatsApp settings found');
    }

    return settings;
  }

  async getAllSettings() {
    return this.prisma.whatsAppSettings.findMany({
      orderBy: { lastUpdatedAt: 'desc' },
    });
  }

  async deleteSettings(id: string) {
    return this.prisma.whatsAppSettings.delete({
      where: { id },
    });
  }

  // ==================== SESSION MANAGEMENT ====================

  async getOrCreateSession(phoneNumber: string) {
    let session = await this.prisma.whatsAppSession.findUnique({
      where: { phoneNumber },
      include: { customerProfile: true },
    });

    if (!session) {
      session = await this.prisma.whatsAppSession.create({
        data: {
          phoneNumber,
          state: 'IDLE',
          contextData: {},
        },
        include: { customerProfile: true },
      });
    } else {
      // Update last message time
      session = await this.prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { lastMessageAt: new Date() },
        include: { customerProfile: true },
      });
    }

    return session;
  }

  async updateSessionState(sessionId: string, state: any, contextData?: any) {
    return this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        state,
        contextData: contextData || {},
        lastMessageAt: new Date(),
      },
    });
  }

  async linkSessionToCustomer(sessionId: string, customerProfileId: string) {
    return this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { customerProfileId },
    });
  }

  async getSessionById(sessionId: string) {
    return this.prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
      include: { customerProfile: true },
    });
  }

  // ==================== MESSAGE LOGGING ====================

  async logMessage(
    sessionId: string,
    messageId: string,
    direction: 'INBOUND' | 'OUTBOUND',
    content: string,
    messageType: string = 'text',
    metadata?: any,
  ) {
    try {
      return await this.prisma.whatsAppMessage.create({
        data: {
          sessionId,
          messageId,
          direction,
          content,
          messageType,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log message: ${error.message}`);
      // Don't throw - logging shouldn't break the flow
    }
  }

  // ==================== MESSAGE SENDING ====================

  async sendTextMessage(to: string, text: string): Promise<any> {
    const settings = await this.getActiveSettings();

    const message: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    return this.sendMessage(message, settings);
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<any> {
    const settings = await this.getActiveSettings();

    const message: WhatsAppImageMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    };

    return this.sendMessage(message, settings);
  }

  async sendInteractiveMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string,
  ): Promise<any> {
    const settings = await this.getActiveSettings();

    if (buttons.length > 3) {
      throw new BadRequestException('WhatsApp allows maximum 3 buttons');
    }

    const message: WhatsAppInteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20), // WhatsApp limit
            },
          })),
        },
      },
    };

    if (header) {
      message.interactive.header = {
        type: 'text',
        text: header,
      };
    }

    if (footer) {
      message.interactive.footer = { text: footer };
    }

    return this.sendMessage(message, settings);
  }

  async sendListMessage(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    header?: string,
    footer?: string,
  ): Promise<any> {
    const settings = await this.getActiveSettings();

    const message: WhatsAppInteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonText,
          sections: sections.map((section) => ({
            title: section.title,
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title.substring(0, 24), // WhatsApp limit
              description: row.description?.substring(0, 72), // WhatsApp limit
            })),
          })),
        },
      },
    };

    if (header) {
      message.interactive.header = {
        type: 'text',
        text: header,
      };
    }

    if (footer) {
      message.interactive.footer = { text: footer };
    }

    return this.sendMessage(message, settings);
  }

  private async sendMessage(message: any, settings: any): Promise<any> {
    try {
      const url = `${this.WHATSAPP_API_URL}/${settings.phoneNumberId}/messages`;

      const response = await axios.post(url, message, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Message sent successfully to ${message.to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      throw new BadRequestException('Failed to send WhatsApp message');
    }
  }

  // ==================== WEBHOOK VERIFICATION ====================

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    const settings = await this.getActiveSettings();

    if (mode === 'subscribe' && token === settings.webhookToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.warn('Webhook verification failed');
    return null;
  }
}
