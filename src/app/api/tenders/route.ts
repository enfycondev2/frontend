import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DISTRICTS } from '@/lib/scraper/districts';
import { unstable_cache } from 'next/cache';

const getCachedTenders = unstable_cache(
  async (params: any) => {
    const { district, search, active, priority, page, pageSize, date, excludeToday, bookmarked, applied, dateRange, includeStats, tenderType } = params;

    const keywords = await prisma.priorityKeyword.findMany();
    const keywordList = keywords.map((k: any) => k.word);

    const isState = tenderType === 'state';

    const fetchFromTable = async (isStateModel: boolean, isMixed: boolean) => {
      const delegate = isStateModel ? prisma.stateTender : prisma.tender;
      const districtField = isStateModel ? 'organisation' : 'district';

      const where: any = {};
      const AND: any[] = [];

      if (bookmarked === 'true') where.isBookmarked = true;
      if (applied === 'true') where.isApplied = true;
      if (district) where[districtField] = district;

      if (priority === 'HIGH') {
        const keywordConditions = keywordList.length > 0 ? [
          { tags: { hasSome: keywordList } },
          ...keywordList.map((kw: string) => ({ title: { contains: kw, mode: 'insensitive' as const } })),
          ...keywordList.map((kw: string) => ({ aiSummary: { contains: kw, mode: 'insensitive' as const } }))
        ] : [];
        if (keywordConditions.length > 0) AND.push({ OR: keywordConditions });
        else AND.push({ id: 'NONE' });
      }

      if (dateRange === 'this_week') {
        const now = new Date();
        const day = now.getDay() || 7;
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0);
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - day), 23, 59, 59, 999);
        where.startDate = { gte: startOfWeek, lte: endOfWeek };
      } else if (date) {
        const [year, month, d] = date.split('-').map(Number);
        const startOfDay = new Date(year, month - 1, d, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, d, 23, 59, 59, 999);
        where.startDate = { gte: startOfDay, lte: endOfDay };
      } else if (excludeToday === 'true') {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        where.NOT = { startDate: { gte: startOfDay, lte: endOfDay } };
      }

      if (search) {
        AND.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }

      if (active === 'true') {
        const now = new Date();
        AND.push({ OR: [{ endDate: { gte: now } }, { endDate: null }] });
      } else if (active === 'false') {
        const now = new Date();
        where.endDate = { lt: now };
      } else if (active === 'expiring') {
        const now = new Date();
        const in7Days = new Date(); in7Days.setDate(now.getDate() + 7);
        where.endDate = { gte: now, lte: in7Days };
      }

      if (AND.length > 0) where.AND = AND;

      const skip = isMixed ? 0 : (page - 1) * pageSize;
      const take = isMixed ? 500 : pageSize;

      const now = new Date();
      const in7Days = new Date(); in7Days.setDate(now.getDate() + 7);

      const [tenders, total, pendingQueue] = await Promise.all([
        (delegate as any).findMany({
          where,
          skip,
          take,
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }]
        }),
        (delegate as any).count({ where }),
        (delegate as any).count({ where: { aiProcessed: false } })
      ]);

      let activeCount = 0, expiringCount = 0, distGroups: any[] = [], highPriorityCount = 0;

      if (includeStats === 'true' && !isMixed) {
        const statsResults = await Promise.all([
          (delegate as any).count({ where: { ...where, OR: [{ endDate: { gte: now } }, { endDate: null }] } }),
          (delegate as any).count({ where: { ...where, endDate: { gte: now, lte: in7Days } } }),
          (delegate as any).groupBy({ by: [districtField], _count: { _all: true }, where })
        ]);
        activeCount = statsResults[0];
        expiringCount = statsResults[1];
        
        const dbDistricts = statsResults[2];
        if (isStateModel) {
          distGroups = dbDistricts.map((db: any) => ({ district: db.organisation, _count: { _all: db._count._all } }))
            .sort((a: any, b: any) => b._count._all - a._count._all);
        } else {
          distGroups = DISTRICTS.map(d => {
            const found = dbDistricts.find((db: any) => db.district.toLowerCase() === d.toLowerCase());
            return { district: d, _count: { _all: found ? found._count._all : 0 } };
          });
        }
        highPriorityCount = 0;
      }

      const formattedTenders = tenders.map((t: any) => {
        const hasHighPriorityTag = t.tags && t.tags.some((tag: string) => keywordList.some((kw: string) => tag.toLowerCase().includes(kw.toLowerCase())));
        const titleMatch = keywordList.some((kw: string) => t.title?.toLowerCase().includes(kw.toLowerCase()));
        const summaryMatch = keywordList.some((kw: string) => t.aiSummary?.toLowerCase().includes(kw.toLowerCase()));
        return { ...t, isHighPriority: hasHighPriorityTag || titleMatch || summaryMatch, district: isStateModel ? t.organisation : t.district };
      });

      return { tenders: formattedTenders, total, pendingQueue, activeCount, expiringCount, distGroups, highPriorityCount };
    };

    if (tenderType === 'state' || tenderType === 'district') {
      const res = await fetchFromTable(tenderType === 'state', false);
      return {
        success: true,
        data: res.tenders,
        meta: {
          total: res.total,
          active: res.activeCount,
          expiring: res.expiringCount,
          highPriority: res.highPriorityCount,
          districts: res.distGroups.length,
          districtsData: res.distGroups,
          pendingQueue: res.pendingQueue,
          page,
          pageSize,
          totalPages: Math.ceil(res.total / pageSize)
        }
      };
    } else {
      const [distRes, stateRes] = await Promise.all([
        fetchFromTable(false, true),
        fetchFromTable(true, true)
      ]);

      const allTenders = [...distRes.tenders, ...stateRes.tenders].sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });

      const total = distRes.total + stateRes.total;
      const paginatedTenders = allTenders.slice((page - 1) * pageSize, page * pageSize);

      return {
        success: true,
        data: paginatedTenders,
        meta: {
          total,
          pendingQueue: distRes.pendingQueue + stateRes.pendingQueue,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    }
  },
  ['tenders-cache-v1'],
  { revalidate: 30, tags: ['tenders'] }
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Add bypass flag checking here
    const forceRefresh = searchParams.get('_t');

    const paramsObj = {
      district: searchParams.get('district'),
      search: searchParams.get('search'),
      active: searchParams.get('active'),
      priority: searchParams.get('priority'),
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      date: searchParams.get('date'),
      excludeToday: searchParams.get('excludeToday'),
      bookmarked: searchParams.get('bookmarked'),
      applied: searchParams.get('applied'),
      dateRange: searchParams.get('dateRange'),
      includeStats: searchParams.get('includeStats'),
      tenderType: searchParams.get('tenderType')
    };

    // Note: Next.js unstable_cache keys are built from stringified arguments automatically.
    // If a cache bypass is needed from frontend mutations, we pass `_t` to force cache miss via dynamic URL
    // since we use a dynamic route here, caching works via Next.js Data Cache.
    
    const payload = await getCachedTenders(paramsObj);
    return NextResponse.json(payload);

  } catch (error: any) {
    console.error('[GET /api/tenders] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error?.message || String(error),
      stack: error?.stack 
    }, { status: 500 });
  }
}
