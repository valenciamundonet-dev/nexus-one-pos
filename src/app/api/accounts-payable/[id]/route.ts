import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET — Get single payable with payments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payable = await db.payableAccount.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, rif: true, phone: true, email: true } },
        payments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!payable) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(payable);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cuenta por pagar' }, { status: 500 });
  }
}

// DELETE — Delete a payable
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.payableAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    if (existing.status === 'parcial') {
      return NextResponse.json({ error: 'No se puede eliminar una cuenta con pagos parciales' }, { status: 400 });
    }

    await db.payableAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar cuenta por pagar: ' + (error.message || '') }, { status: 500 });
  }
}
