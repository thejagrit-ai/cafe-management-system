import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { config } from '../config';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcrypt.rounds);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// The suffix is 8 hex chars of CSPRNG output rather than 4 decimal digits:
// orderNumber is UNIQUE, and a 10,000-value space collides roughly half the
// time by ~118 orders in a single day.
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

export function calculateTotal(subtotal: number, tax: number, discount: number, deliveryFee: number): number {
  return Math.round((subtotal + tax - discount + deliveryFee) * 100) / 100;
}
