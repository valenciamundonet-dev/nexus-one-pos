/**
 * Nexus One POS — Diagnostics API v1.0
 * 
 * Endpoint unificado para diagnostico de perifericos.
 * Expone el estado del Circuit Breaker de cada periferico,
 * conexion al Print Agent y metricas del Performance Engine.
 */

import { NextResponse } from 'next/server';
import { peripheralIsolator } from '@/core/peripheral-isolator';

const AGENT_TIMEOUT = 5000;

const KNOWN_PERIPHERALS = [
  { name: 'escpos-printer', label: 'Impresora Termica', icon: 'receipt' },
  { name: 'barcode-scanner', label: 'Escaner de Codigo de Barras', icon: 'scan' },
  { name: 'backup-system', label: 'Sistema de Respaldo', icon: 'database' },
];

export async function GET() {
  try {
    const peripheralStatuses = KNOWN_PERIPHERALS.map(p => {
      const status = peripheralIsolator.getStatus(p.name);
      return {
        ...p,
        ...status,
        stateLabel:
          status.state === 'closed' ? 'Operativo' :
          status.state === 'open' ? 'Desconectado' :
          status.state === 'half-open' ? 'Recuperando...' :
          'Desconocido',
        stateColor:
          status.state === 'closed' ? 'green' :
          status.state === 'open' ? 'red' :
          status.state === 'half-open' ? 'yellow' :
          'gray',
      };
    });

    let printAgentStatus: { online: boolean; responseTimeMs?: number; error?: string; printers?: string[] } = {
      online: false,
    };

    try {
      const start = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT);
      const res = await fetch('http://localhost:9100/status', { signal: controller.signal });
      clearTimeout(timeout);
      const elapsed = performance.now() - start;
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = {}; }
      printAgentStatus = {
        online: true,
        responseTimeMs: Math.round(elapsed),
        printers: data.printers || [],
      };
    } catch (err: any) {
      printAgentStatus.error = err.name === 'AbortError'
        ? 'Timeout (5s)'
        : err.message || 'No disponible';
    }

    const totalQueued = peripheralStatuses.reduce((sum, p) => sum + p.queuePending, 0);
    const anyOpen = peripheralStatuses.some(p => p.state === 'open');

    return NextResponse.json({
      peripherals: peripheralStatuses,
      printAgent: printAgentStatus,
      summary: {
        totalPeripherals: KNOWN_PERIPHERALS.length,
        operational: peripheralStatuses.filter(p => p.state === 'closed').length,
        failed: peripheralStatuses.filter(p => p.state === 'open').length,
        recovering: peripheralStatuses.filter(p => p.state === 'half-open').length,
        queuedOperations: totalQueued,
        hasAlerts: anyOpen || totalQueued > 0,
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno de diagnostico: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'reset-peripheral') {
      const name = body.peripheral;
      if (!name || !KNOWN_PERIPHERALS.find(p => p.name === name)) {
        return NextResponse.json({ error: 'Periferico no valido' }, { status: 400 });
      }
      peripheralIsolator.register({
        name,
        maxRetries: name === 'escpos-printer' ? 2 : name === 'barcode-scanner' ? 3 : 1,
        timeoutMs: name === 'escpos-printer' ? 5000 : name === 'barcode-scanner' ? 2000 : 30000,
        resetTimeMs: name === 'escpos-printer' ? 30000 : name === 'barcode-scanner' ? 10000 : 60000,
        halfOpenMaxAttempts: 1,
      });
      const status = peripheralIsolator.getStatus(name);
      return NextResponse.json({
        success: true,
        message: `Periferico "${name}" reiniciado`,
        state: status.state,
      });
    }

    if (action === 'test-print-agent') {
      try {
        const start = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT);
        const res = await fetch('http://localhost:9100/printers', { signal: controller.signal });
        clearTimeout(timeout);
        const elapsed = performance.now() - start;
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = {}; }
        return NextResponse.json({
          success: true,
          responseTimeMs: Math.round(elapsed),
          printers: data.printers || data || [],
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.name === 'AbortError' ? 'Timeout (5s)' : err.message,
        });
      }
    }

    return NextResponse.json({ error: 'Accion no reconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
