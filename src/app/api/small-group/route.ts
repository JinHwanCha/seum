import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSmallGroupData } from '@/lib/small-group-data';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  const data = await getSmallGroupData(session, weekStart);
  return NextResponse.json(data);
}
