import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
  role?: string;
}

class EventHub {
  private clients: Map<string, Client> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Send keep-alive ping every 25 seconds
    this.pingInterval = setInterval(() => {
      this.broadcast('PING', { time: Date.now() });
    }, 25000);
  }

  public addClient(id: string, res: Response, role?: string): void {
    this.clients.set(id, { id, res, role });

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  public removeClient(id: string): void {
    this.clients.delete(id);
  }

  public emit(eventType: string, data: any, targetRole?: string | string[]): void {
    const payload = JSON.stringify({ type: eventType, data, timestamp: Date.now() });
    const message = `event: ${eventType}\ndata: ${payload}\n\n`;

    this.clients.forEach((client) => {
      const matches = !targetRole ||
        (Array.isArray(targetRole) ? targetRole.includes(client.role || '') : client.role === targetRole) ||
        client.role === 'ADMIN';

      if (matches) {
        try {
          client.res.write(message);
        } catch {
          this.clients.delete(client.id);
        }
      }
    });
  }

  public broadcast(eventType: string, data: any, targetRole?: string | string[]): void {
    this.emit(eventType, data, targetRole);
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export const eventHub = new EventHub();
