import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/whatsapp',
})
export class WhatsAppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsAppGateway.name);
  private activeSessions = new Map<string, string>(); // socketId -> phoneNumber

  constructor(private readonly whatsappService: WhatsAppService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.activeSessions.delete(client.id);
  }

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { phoneNumber: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { phoneNumber } = data;
    this.activeSessions.set(client.id, phoneNumber);
    this.logger.log(`Registered client ${client.id} for phone ${phoneNumber}`);

    // Get session info
    const session = await this.whatsappService.getOrCreateSession(phoneNumber);

    client.emit('registered', {
      success: true,
      sessionId: session.id,
      phoneNumber,
    });

    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { phoneNumber: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.whatsappService.sendTextMessage(data.phoneNumber, data.message);

      client.emit('messageSent', {
        success: true,
        messageId: result.messages?.[0]?.id,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', {
        success: false,
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // Broadcast incoming message to connected clients
  async broadcastIncomingMessage(phoneNumber: string, message: string) {
    this.server.emit('incomingMessage', {
      phoneNumber,
      message,
      timestamp: new Date(),
    });
  }

  // Broadcast session state change
  async broadcastSessionStateChange(phoneNumber: string, state: string, contextData: any) {
    this.server.emit('sessionStateChange', {
      phoneNumber,
      state,
      contextData,
      timestamp: new Date(),
    });
  }

  // Broadcast order created
  async broadcastOrderCreated(phoneNumber: string, orderNumber: string, totalAmount: number) {
    this.server.emit('orderCreated', {
      phoneNumber,
      orderNumber,
      totalAmount,
      timestamp: new Date(),
    });
  }

  // Get active sessions count
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  // Get all active phone numbers
  getActivePhoneNumbers(): string[] {
    return Array.from(new Set(this.activeSessions.values()));
  }
}
