import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Req,
  Res,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppMessageHandler } from './whatsapp-message.handler';
import { CreateWhatsAppSettingsDto, UpdateWhatsAppSettingsDto } from './dto/whatsapp-settings.dto';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly messageHandler: WhatsAppMessageHandler,
  ) {}

  // ==================== SETTINGS ENDPOINTS ====================

  @Post('settings')
  async createSettings(@Body() dto: CreateWhatsAppSettingsDto) {
    return this.whatsappService.createSettings(dto);
  }

  @Get('settings')
  async getAllSettings() {
    return this.whatsappService.getAllSettings();
  }

  @Get('settings/active')
  async getActiveSettings() {
    return this.whatsappService.getActiveSettings();
  }

  @Put('settings/:id')
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateWhatsAppSettingsDto) {
    return this.whatsappService.updateSettings(id, dto);
  }

  @Delete('settings/:id')
  async deleteSettings(@Param('id') id: string) {
    return this.whatsappService.deleteSettings(id);
  }

  // ==================== WEBHOOK ENDPOINTS ====================

  @Get('webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: any,
  ) {
    this.logger.log(`Webhook verification request: mode=${mode}, token=${token}`);

    const result = await this.whatsappService.verifyWebhook(mode, token, challenge);

    if (result) {
      // Return challenge as plain text with 200 status
      return res.status(200).send(result);
    }

    // Return 403 Forbidden for invalid verification
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any, @Req() req: any) {
    try {
      this.logger.log('Received webhook:', JSON.stringify(body, null, 2));

      // WhatsApp sends webhook in this format
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;

              // Handle incoming messages
              if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                  await this.handleIncomingMessage(message);
                }
              }

              // Handle message statuses (delivered, read, etc.)
              if (value.statuses && value.statuses.length > 0) {
                this.logger.log('Message status update:', value.statuses);
              }
            }
          }
        }
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      return { status: 'error', message: error.message };
    }
  }

  private async handleIncomingMessage(message: any) {
    try {
      const phoneNumber = message.from;
      const messageId = message.id;
      const messageType = message.type;

      this.logger.log(`Processing message from ${phoneNumber}, type: ${messageType}`);

      if (messageType === 'text') {
        const text = message.text?.body || '';
        await this.messageHandler.handleIncomingMessage(phoneNumber, text, messageId);
      } else if (messageType === 'interactive') {
        // Handle button/list replies
        const interactiveType = message.interactive?.type;

        if (interactiveType === 'button_reply') {
          const buttonId = message.interactive.button_reply.id;
          await this.messageHandler.handleInteractiveMessage(phoneNumber, buttonId, messageId);
        } else if (interactiveType === 'list_reply') {
          const listItemId = message.interactive.list_reply.id;
          await this.messageHandler.handleInteractiveMessage(phoneNumber, listItemId, messageId);
        }
      } else if (messageType === 'button') {
        // Handle quick reply buttons
        const buttonPayload = message.button?.payload;
        if (buttonPayload) {
          await this.messageHandler.handleInteractiveMessage(phoneNumber, buttonPayload, messageId);
        }
      } else {
        this.logger.warn(`Unsupported message type: ${messageType}`);
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Sorry, I can only process text messages at the moment. Please type your message.',
        );
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
    }
  }

  // ==================== TESTING ENDPOINTS ====================

  @Post('send-test-message')
  async sendTestMessage(@Body() body: { phoneNumber: string; message: string }) {
    return this.whatsappService.sendTextMessage(body.phoneNumber, body.message);
  }

  @Post('send-test-button')
  async sendTestButton(
    @Body()
    body: {
      phoneNumber: string;
      message: string;
      buttons: Array<{ id: string; title: string }>;
    },
  ) {
    return this.whatsappService.sendInteractiveMessage(
      body.phoneNumber,
      body.message,
      body.buttons,
    );
  }

  @Post('send-test-list')
  async sendTestList(
    @Body()
    body: {
      phoneNumber: string;
      message: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    },
  ) {
    return this.whatsappService.sendListMessage(
      body.phoneNumber,
      body.message,
      body.buttonText,
      body.sections,
    );
  }

  // ==================== SESSION MANAGEMENT ====================

  @Get('sessions')
  async getAllSessions() {
    return this.whatsappService.prisma.whatsAppSession.findMany({
      include: {
        customerProfile: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
  }

  @Get('sessions/:phoneNumber')
  async getSessionByPhone(@Param('phoneNumber') phoneNumber: string) {
    return this.whatsappService.getOrCreateSession(phoneNumber);
  }

  @Get('sessions/:sessionId/messages')
  async getSessionMessages(@Param('sessionId') sessionId: string) {
    return this.whatsappService.prisma.whatsAppMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
