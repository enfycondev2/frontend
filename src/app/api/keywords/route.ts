import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const keywords = await prisma.priorityKeyword.findMany({
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ success: true, data: keywords });
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch keywords" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { word } = body;

    if (!word || typeof word !== "string") {
      return NextResponse.json({ success: false, error: "Valid word is required" }, { status: 400 });
    }

    const keyword = await prisma.priorityKeyword.create({
      data: { word: word.trim() }
    });

    return NextResponse.json({ success: true, data: keyword });
  } catch (error: any) {
    console.error("Error creating keyword:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "Keyword already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to create keyword" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Keyword ID is required" }, { status: 400 });
    }

    await prisma.priorityKeyword.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting keyword:", error);
    return NextResponse.json({ success: false, error: "Failed to delete keyword" }, { status: 500 });
  }
}
