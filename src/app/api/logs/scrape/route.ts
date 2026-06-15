import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [logs, total] = await Promise.all([
      prisma.scrapeLog.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scrapeLog.count()
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[GET /api/logs/scrape] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
