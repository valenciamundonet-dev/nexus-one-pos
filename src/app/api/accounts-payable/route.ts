import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET — List all payables with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'todos') {
      where.status = status;
    }

    if (supplierId) where.supplierId = supplierId;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999'),
      };
    } else if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { lte: new Date(endDate + 'T23:59:59.999') };
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { supplier: { name: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const payables = await db.payableAccount.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, rif: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(payables);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cuentas por pagar' }, { status: 500 });
  }
}

// POST — Create a new payable account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierId, purchaseId, description, totalUsd, exchangeRate, dueDate, notes } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 });
    }

    const totalUsdNum = parseFloat(totalUsd) || 0;
    if (totalUsdNum <= 0) {
      return NextResponse.json({ error: 'El total USD debe ser mayor a 0' }, { status: 400 });
    }

    // Get exchange rate from settings if not provided
    let rate = parseFloat(exchangeRate) || 0;
    if (rate <= 0) {
      const settings = await db.settings.findFirst();
      rate = settings?.bcvRate || 36.5;
    }

    const totalBs = Math.round(totalUsdNum * rate * 100) / 100;

    const payable = await db.payableAccount.create({
      data: {
        supplierId: supplierId || null,
        purchaseId: purchaseId || null,
        description: description.trim(),
        totalUsd: totalUsdNum,
        totalBs,
        paidUsd: 0,
        paidBs: 0,
        remainingUsd: totalUsdNum,
        remainingBs: totalBs,
        exchangeRate: rate,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'pendiente',
        notes: notes || '',
      },
      include: {
        supplier: { select: { id: true, name: true, rif: true } },
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(payable, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear cuenta por pagar: ' + (error.message || '') }, { status: 500 });
  }
}

// PATCH — Update a payable (mark as paid, change status, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, description, notes, dueDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const existing = await db.payableAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    const data: any = {};
    if (description !== undefined) data.description = description.trim();
    if (notes !== undefined) data.notes = notes;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    // If explicitly setting status
    if (status !== undefined) {
      data.status = status;
    }

    // If marking as pagada, ensure paid amounts equal total
    if (status === 'pagada') {
      data.paidUsd = existing.totalUsd;
      data.paidBs = existing.totalBs;
      data.remainingUsd = 0;
      data.remainingBs = 0;
    }

    const payable = await db.payableAccount.update({
      where: { id },
      data,
      include: {
        supplier: { select: { id: true, name: true, rif: true } },
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(payable);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar cuenta por pagar: ' + (error.message || '') }, { status: 500 });
  }
}
