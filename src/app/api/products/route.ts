import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';


export async function GET() {
  const products = await prisma.product.findMany({ orderBy: [{ name: 'asc' }] });
  return NextResponse.json(products);
}

function createSku(name: string) {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalid.' }, { status: 400 });
    }

    const {
      name,
      sku,
      purchasePrice,
      sellingPrice,
      stockQty,
      isConsumable,
    } = body as {
      name?: string;
      sku?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      stockQty?: number;
      isConsumable?: boolean;
    };

    if (!name || typeof purchasePrice !== 'number' || typeof sellingPrice !== 'number' || typeof stockQty !== 'number') {
      return NextResponse.json({ error: 'name, purchasePrice, sellingPrice and stockQty are required.' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: typeof sku === 'string' && sku.trim() ? sku.trim() : createSku(name),
        purchasePrice,
        sellingPrice,
        stockQty,
        isConsumable: Boolean(isConsumable),
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product.' }, { status: 500 });
  }
}
