import redis from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const type = await redis.type('campanhas');
    console.log(type)
    const value = await redis.json.get('campanhas');

    return NextResponse.json({ message: value });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro no Redis' }, { status: 500 });
  }
}