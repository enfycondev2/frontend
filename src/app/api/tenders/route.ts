import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DISTRICTS } from "@/lib/scraper/districts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const district = searchParams.get("district");
    const search = searchParams.get("search");
    const active = searchParams.get("active");
    const priority = searchParams.get("priority");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const date = searchParams.get("date");
    const excludeToday = searchParams.get("excludeToday");
    const bookmarked = searchParams.get("bookmarked");
    const applied = searchParams.get("applied");
    const dateRange = searchParams.get("dateRange");
    const includeStats = searchParams.get("includeStats");

    const keywords = await prisma.priorityKeyword.findMany();
    const keywordList = keywords.map(k => k.word);

    const where: any = {};
    const AND: any[] = [];

    if (bookmarked === "true") {
      where.isBookmarked = true;
    }

    if (applied === "true") {
      where.isApplied = true;
    }

    if (district) {
      where.district = district;
    }

    if (priority === 'HIGH') {
      const keywordConditions = keywordList.length > 0 ? [
        { tags: { hasSome: keywordList } },
        ...keywordList.map(kw => ({ title: { contains: kw, mode: 'insensitive' as const } })),
        ...keywordList.map(kw => ({ aiSummary: { contains: kw, mode: 'insensitive' as const } }))
      ] : [];

      // If no keywords exist, this will effectively return nothing for HIGH priority
      if (keywordConditions.length > 0) {
        AND.push({
          OR: keywordConditions
        });
      } else {
        // Force an empty result if there are no priority keywords
        AND.push({ id: "NONE" });
      }
    }

    if (dateRange === "this_week") {
      // Calculate start of Monday and end of Sunday for the current week
      const now = new Date();
      const day = now.getDay() || 7; // Convert 0 (Sunday) to 7
      
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0);
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - day), 23, 59, 59, 999);
      
      where.startDate = {
        gte: startOfWeek,
        lte: endOfWeek
      };
    } else if (date) {
      // Split the string and parse exactly in local time to avoid UTC-midnight shift issues
      const [year, month, day] = date.split('-').map(Number);
      
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      where.startDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    } else if (excludeToday === "true") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      where.NOT = {
        startDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      };
    }

    if (search) {
      AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (active === "true") {
      const now = new Date();
      AND.push({
        OR: [
          { endDate: { gte: now } },
          { endDate: null }
        ]
      });
    } else if (active === "false") {
      const now = new Date();
      where.endDate = { lt: now };
    } else if (active === "expiring") {
      const now = new Date();
      const in7Days = new Date();
      in7Days.setDate(now.getDate() + 7);
      where.endDate = {
        gte: now,
        lte: in7Days
      };
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    const skip = (page - 1) * pageSize;

    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    // Always fetch data and total for pagination
    const tendersPromise = prisma.tender.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { startDate: 'desc' },
        { createdAt: 'desc' }
      ],
      omit: {
        description: true // Remove raw text to make response faster
      }
    });
    
    const totalPromise = prisma.tender.count({ where });
    const pendingQueuePromise = prisma.tender.count({ where: { aiProcessed: false } });

    let activeTendersCount = 0;
    let expiringTendersCount = 0;
    let districtGroups: any[] = [];
    let highPriorityCount = 0;

    const globalForStats = global as unknown as { 
      statsCache: Map<string, { data: any, timestamp: number }>;
    };
    if (!globalForStats.statsCache) {
      globalForStats.statsCache = new Map();
    }

    // Only run heavy stats queries when explicitly requested
    if (includeStats === "true") {
      const nowTime = Date.now();
      const cacheKey = JSON.stringify({ where, keywords: keywordList });
      const cached = globalForStats.statsCache.get(cacheKey);
      
      // Use cache if available and less than 5 minutes old
      if (cached && nowTime - cached.timestamp < 5 * 60 * 1000) {
        activeTendersCount = cached.data.active;
        expiringTendersCount = cached.data.expiring;
        districtGroups = cached.data.districts;
        highPriorityCount = cached.data.highPriority;
      } else {
        const keywordConditions = keywordList.length > 0 ? [
          { tags: { hasSome: keywordList } },
          ...keywordList.map(kw => ({ title: { contains: kw, mode: 'insensitive' as const } })),
          ...keywordList.map(kw => ({ aiSummary: { contains: kw, mode: 'insensitive' as const } }))
        ] : [];

        const statsResults = await Promise.all([
          prisma.tender.count({
            where: {
              ...where,
              OR: [
                { endDate: { gte: now } },
                { endDate: null }
              ]
            }
          }),
          prisma.tender.count({
            where: {
              ...where,
              endDate: {
                gte: now,
                lte: in7Days
              }
            }
          }),
          prisma.tender.groupBy({
            by: ['district'],
            _count: {
              _all: true
            },
            where
          }),
          prisma.tender.count({
            where: {
              ...where,
              AND: [
                ...(where.AND || []),
                ...(keywordConditions.length > 0 ? [{ OR: keywordConditions }] : [{ id: "NONE" }])
              ]
            }
          })
        ]);
        
        activeTendersCount = statsResults[0];
        expiringTendersCount = statsResults[1];
        
        const dbDistricts = statsResults[2];
        districtGroups = DISTRICTS.map(d => {
          const found = dbDistricts.find(db => db.district.toLowerCase() === d.toLowerCase());
          return { district: d, _count: { _all: found ? found._count._all : 0 } };
        });
        
        highPriorityCount = priority === 'HIGH' ? await totalPromise : statsResults[3];

        // Save to cache
        globalForStats.statsCache.set(cacheKey, {
          data: {
            active: activeTendersCount,
            expiring: expiringTendersCount,
            districts: districtGroups,
            highPriority: highPriorityCount
          },
          timestamp: nowTime
        });
      }
    }

    const [tenders, total, pendingQueue] = await Promise.all([
      tendersPromise,
      totalPromise,
      pendingQueuePromise
    ]);

    // Add the dynamic isHighPriority flag
    const tendersWithPriority = tenders.map(t => {
      const hasHighPriorityTag = t.tags && t.tags.some((tag: string) => 
        keywordList.some(kw => tag.toLowerCase().includes(kw.toLowerCase()))
      );
      
      const titleMatch = keywordList.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase()));
      const summaryMatch = keywordList.some(kw => t.aiSummary?.toLowerCase().includes(kw.toLowerCase()));

      return {
        ...t,
        isHighPriority: hasHighPriorityTag || titleMatch || summaryMatch
      };
    });

    return NextResponse.json({
      success: true,
      data: tendersWithPriority,
      meta: {
        total,
        active: activeTendersCount,
        expiring: expiringTendersCount,
        highPriority: highPriorityCount,
        districts: districtGroups.length,
        districtsData: districtGroups,
        pendingQueue,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("[GET /api/tenders] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
