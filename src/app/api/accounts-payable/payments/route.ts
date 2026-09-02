import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST — Record a payment against a payable
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payableId, amountUsd, exchangeRate, method = 'transferencia', reference = '', notes = '', createdBy = '' } = body;

    if (!payableId) {
      return NextResponse.json({ error: 'El ID de la cuenta es requerido' }, { status: 400 });
    }

    const amountUsdNum = parseFloat(amountUsd) || 0;
    if (amountUsdNum <= 0) {
      return NextResponse.json({ error: 'El monto USD debe ser mayor a 0' }, { status: 400 });
    }

    // Validate reference for certain methods
    if (['transferencia', 'pago-movil', 'zelle'].includes(method) && !reference.trim()) {
      return NextResponse.json({ error: 'Debe ingresar el numero de referencia' }, { status: 400 });
    }

    const payable = await db.payableAccount.findUnique({ where: { id: payableId } });
    if (!payable) {
      return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 });
    }

    if (payable.status === 'pagada') {
      return NextResponse.json({ error: 'Esta cuenta ya esta pagada' }, { status: 400 });
    }

    let rate = parseFloat(exchangeRate) || payable.exchangeRate || 0;
    if (rate <= 0) {
      const settings = await db.settings.findFirst();
      rate = settings?.bcvRate || 36.5;
    }

    const amountBs = Math.round(amountUsdNum * rate * 100) / 100;

    // Check if payment exceeds remaining
    if (amountUsdNum > payable.remainingUsd + 0.01) {
      return NextResponse.json({
        error: `El monto excede el saldo pendiente ($${payable.remainingUsd.toFixed(2)})`,
      }, { status: 400 });
    }

    // Create payment and update payable in a transaction
    const updated = await db.$transaction(async (tx) => {
      // Create payment
      await tx.payablePayment.create({
        data: {
          payableId,
          amountUsd: amountUsdNum,
          amountBs,
          exchangeRate: rate,
          method,
          reference: reference.trim(),
          notes: notes || '',
          createdBy: createdBy || '',
        },
      });

      // Calculate new totals
      let newPaidUsd = Math.round((payable.paidUsd + amountUsdNum) * 100) / 100;
      let newPaidBs = Math.round((payable.paidBs + amountBs) * 100) / 100;
      let newRemainingUsd = Math.round((payable.totalUsd - newPaidUsd) * 100) / 100;
      let newRemainingBs = Math.round((payable.totalBs - newPaidBs) * 100) / 100;

      // Avoid negative remainders due to rounding
      if (newRemainingUsd < 0) newRemainingUsd = 0;
      if (newRemainingBs < 0) newRemainingBs = 0;

      // Determine new status
      let newStatus = payable.status;
      if (newRemainingUsd <= 0.01) {
        newStatus = 'pagada';
        newPaidUsd = payable.totalUsd;
        newPaidBs = payable.totalBs;
        newRemainingUsd = 0;
        newRemainingBs = 0;
      } else if (newPaidUsd > 0) {
        newStatus = 'parcial';
      }

      // Update payable
      return tx.payableAccount.update({
        where: { id: payableId },
        data: {
          paidUsd: newPaidUsd,
          paidBs: newPaidBs,
          remainingUsd: newRemainingUsd,
          remainingBs: newRemainingBs,
          status: newStatus,
        },
        include: {
          supplier: { select: { id: true, name: true, rif: true } },
          _count: { select: { payments: true } },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al registrar pago: ' + (error.message || '') }, { status: 500 });
  }
}
