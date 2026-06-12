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

    const where: any = {};

    if (district) {
      where.district = district;
    }

    if (priority) {
      where.priority = priority;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
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

    const [tenders, total, activeTendersCount, expiringTendersCount, districtGroups, pendingQueue] = await Promise.all([
      prisma.tender.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { startDate: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.tender.count({ where }),
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
      }),
      prisma.tender.count({
        where: { aiProcessed: false }
      })
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
