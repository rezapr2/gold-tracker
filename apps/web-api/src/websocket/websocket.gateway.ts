import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

// Restrict socket origins to the configured frontend (plus local dev) rather
// than the insecure '*' + credentials combination.
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = 0;

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.debug(`Client connected: ${client.id} (total: ${this.connectedClients})`);
    client.emit('connected', { message: 'Connected to Gold Tracker' });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.debug(`Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }

  emitPriceUpdate(price: any) {
    this.server.emit('price:update', price);
  }

  emitAlert(data: { price: number; changePercent: number }) {
    this.server.emit('price:alert', data);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }
}
