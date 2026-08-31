import { NextResponse } from 'next/server';
import { getAppVersion } from '@/lib/app-version';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    version: getAppVersion(),
    name: 'Nexus One POS',
  });
}
