import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const where: any = {};

    if (bookmarked === "true") {
      where.isBookmarked = true;
    }

    if (applied === "true") {
      where.isApplied = true;
    }

    if (district) {
      where.district = district;
    }

    if (priority) {
      where.priority = priority;
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
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (active === "true") {
      const now = new Date();
      where.OR = [
        { endDate: { gte: now } },
        { endDate: null } // Assume null end date is still active unless known otherwise
      ];
    } else if (active === "false") {
      const now = new Date();
      where.endDate = { lt: now };
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

    // Only run heavy stats queries when explicitly requested
    if (includeStats === "true") {
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
          where
        })
      ]);
      activeTendersCount = statsResults[0];
      expiringTendersCount = statsResults[1];
      districtGroups = statsResults[2];
    }

    const [tenders, total, pendingQueue] = await Promise.all([
      tendersPromise,
      totalPromise,
      pendingQueuePromise
    ]);

    return NextResponse.json({
      data: tenders,
      meta: {
        total,
        active: activeTendersCount,
        expiring: expiringTendersCount,
        districts: districtGroups.length,
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
