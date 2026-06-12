import { NextRequest, NextResponse } from "next/server";
import { extractTenderDetailsFromPdf } from "@/lib/scraper/pdf-extractor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body || !body.pdfUrl) {
      return NextResponse.json({ success: false, error: "Missing pdfUrl in request body." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
      return NextResponse.json({ 
        success: false, 
        error: "GEMINI_API_KEY is missing or invalid in your .env file. Please add a valid key to test the AI extraction." 
      }, { status: 400 });
    }

    const { pdfUrl } = body;

    // Call the exact same extraction function the scraper uses
    const extractedData = await extractTenderDetailsFromPdf(pdfUrl);

    if (!extractedData) {
      return NextResponse.json({ 
        success: false, 
        error: "Failed to extract data. The PDF might be empty, unreadable, or not a valid tender document." 
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      extractedData
    });

  } catch (error) {
    console.error("[POST /api/test-pdf] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
