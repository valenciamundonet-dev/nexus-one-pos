import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/accounts-payable - List accounts payable
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const overdue = searchParams.get('overdue') === 'true';
    const showPayments = searchParams.get('payments') === 'true';
    const payableId = searchParams.get('payableId');

    // Get payments for a specific payable
    if (showPayments && payableId) {
      const payments = await db.accountPayablePayment.findMany({
        where: { accountPayableId: payableId },
        orderBy: { date: 'desc' },
      });
      return NextResponse.json(payments);
    }

    // Single payable detail
    if (payableId) {
      const payable = await db.accountPayable.findUnique({
        where: { id: payableId },
        include: {
          supplier: { select: { id: true, name: true, rif: true, phone: true } },
          purchase: { select: { id: true, number: true, totalUsd: true } },
          payments: { orderBy: { date: 'desc' } },
        },
      });
      if (!payable) return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 });
      return NextResponse.json(payable);
    }

    const settings = await db.settings.findFirst();
    const bcvRate = settings?.bcvRate || 36.5;

    const whereClause: any = {};
    if (supplierId) whereClause.supplierId = supplierId;
    if (status) whereClause.status = status;
    if (overdue) {
      whereClause.status = { in: ['PENDIENTE', 'PARCIAL'] };
      whereClause.dueDate = { lt: new Date() };
    }

    const payables = await db.accountPayable.findMany({
      where: whereClause,
      include: {
        supplier: { select: { id: true, name: true, rif: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const totalBalanceUsd = payables.reduce((s, p) => s + (p.balance || 0), 0);
    const overdueCount = payables.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'PAGADA').length;

    return NextResponse.json({
      payables,
      totalBalanceUsd: Number(totalBalanceUsd.toFixed(2)),
      totalBalanceBs: Number((totalBalanceUsd * bcvRate).toFixed(2)),
      totalCount: payables.length,
      overdueCount,
    });
  } catch (error) {
    console.error('Error in accounts-payable:', error);
    return NextResponse.json({ error: 'Error al obtener cuentas por pagar' }, { status: 500 });
  }
}

// POST /api/accounts-payable - Create payable or register payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Register payment (abono)
    if (body.action === 'pay') {
      const amount = parseFloat(body.amount);
      if (!body.payableId || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Cuenta por pagar y monto valido son requeridos' }, { status: 400 });
      }

      const payment = await db.$transaction(async (tx) => {
        const payable = await tx.accountPayable.findUnique({ where: { id: body.payableId } });
        if (!payable) throw new Error('Cuenta por pagar no encontrada');
        if (payable.status === 'PAGADA') throw new Error('Esta cuenta ya esta pagada');

        const remaining = payable.balance - (payable.paidAmount || 0);
        const txAmount = Math.min(amount, remaining);
        const exchangeRate = parseFloat(body.exchangeRate) || 36.5;

        const newPayment = await tx.accountPayablePayment.create({
          data: {
            accountPayableId: body.payableId,
            amount: txAmount,
            exchangeRate,
            amountBs: Number((txAmount * exchangeRate).toFixed(2)),
            method: body.method || 'efectivo',
            reference: body.reference || '',
            notes: body.notes || '',
            createdBy: body.createdBy || '',
          },
        });

        const newPaid = Number(payable.paidAmount || 0) + txAmount;
        let newStatus = 'PARCIAL';
        if (newPaid >= payable.totalAmount - 0.01) newStatus = 'PAGADA';

        await tx.accountPayable.update({
          where: { id: body.payableId },
          data: { paidAmount: Number(newPaid.toFixed(2)), status: newStatus },
        });

        return newPayment;
      });

      return NextResponse.json(payment);
    }

    // Create new payable
    const totalAmount = parseFloat(body.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'Monto total es requerido' }, { status: 400 });
    }

    const payable = await db.accountPayable.create({
      data: {
        supplierId: body.supplierId || null,
        purchaseId: body.purchaseId || null,
        description: body.description || 'Cuenta por pagar',
        totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        status: 'PENDIENTE',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        paymentTerms: body.paymentTerms || '',
        notes: body.notes || '',
      },
    });

    return NextResponse.json(payable);
  } catch (error: any) {
    console.error('Error in accounts-payable POST:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar cuenta por pagar' }, { status: 500 });
  }
}
