import axios from 'axios';
import { GoogleGenAI, Type, Schema } from '@google/genai';



export interface ExtractedTenderDetails {
  tenderValue: string | null;
  emd: string | null;
  applicationCost: string | null;
  aiSummary: string | null;
  tags: string[];
  rawText?: string | null;
}

export async function extractTenderDetailsFromPdf(pdfUrl: string): Promise<ExtractedTenderDetails | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[PDF Extractor] No GEMINI_API_KEY provided. Skipping extraction.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({});

    // 1. Download the PDF
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf"
      }
    });

    const buffer = Buffer.from(response.data);

    // 1.5 Extract Raw Text using pdf2json so we can attach it to the response
    let rawTextFromPdf: string | null = null;
    try {
      const PDFParser = require('pdf2json');
      rawTextFromPdf = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
        pdfParser.parseBuffer(buffer);
      });
    } catch (e: any) {
      console.warn(`[PDF Extractor] Warning: Could not extract raw text: ${e.message || e}`);
    }

    // Convert the entire PDF buffer to base64 for Gemini
    const pdfBase64 = buffer.toString('base64');

    // 3. Ask Gemini to extract structured data from the tiny sliced PDF
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        tenderValue: { type: Type.STRING, description: "Estimated Cost/Value", nullable: true },
        emd: { type: Type.STRING, description: "Earnest Money Deposit", nullable: true },
        applicationCost: { type: Type.STRING, description: "Cost of Tender Paper", nullable: true },
        aiSummary: { type: Type.STRING, description: "1-sentence summary", nullable: true },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of relevant industry tags/keywords (e.g. Software, Infrastructure, Solar, Civil, Electrical, etc.) extracted from the document." }
      }
    };

    const prompt = `
      You are an expert at extracting financial details and classifying Indian government tender notices.
      Please read the attached tender PDF document and find:
      1. Estimated Cost/Value of the tender
      2. EMD (Earnest Money Deposit)
      3. Cost of Tender Paper/Document Fee
      4. A brief 1-sentence summary of the work
      5. Extract a list of relevant industry tags/keywords (e.g. Software, Hardware, Civil, Solar, Electrical)
      
      Note: The document may be a scanned image. Please read the tables carefully.
    `;

    for (const modelName of ['gemini-3.1-flash-lite']) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: [
            prompt,
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1,
          }
        });

        const responseText = result.text; // FIXED: no parentheses
        if (responseText) {
          const parsed = JSON.parse(responseText) as ExtractedTenderDetails;
          parsed.rawText = rawTextFromPdf;
          return parsed;
        }
      } catch (aiError: any) {
        console.warn(`[PDF Extractor] ${modelName} failed (Status: ${aiError?.status || aiError?.message}).`);
        
        // If the error is NOT a rate limit or unavailability, don't try fallback models
        if (aiError?.status !== 429 && aiError?.status !== 503) {
          break;
        }
      }
    }

    console.warn(`[PDF Extractor] All AI models failed. Falling back to Regex...`);
    
    // REGEX FALLBACK MECHANISM
    try {
      const text = rawTextFromPdf;

      if (!text || text.trim().length === 0) {
        console.warn(`[PDF Extractor] Regex Fallback failed: PDF is a scanned image (no embedded text).`);
        return null;
      }

      const fallbackDetails: ExtractedTenderDetails = {
        tenderValue: null,
        emd: null,
        applicationCost: null,
        aiSummary: null,
        tags: [],
        rawText: text
      };

      const commonTags = ["Software", "Hardware", "Civil", "Electrical", "Solar", "Infrastructure", "Vehicle", "Security", "Medical"];
      for (const kw of commonTags) {
        if (upperText.includes(kw.toUpperCase())) {
          fallbackDetails.tags.push(kw);
        }
      }

      fallbackDetails.aiSummary = `[Auto-Fallback] Tender related to general sectors.`;

      const emdMatch = text.match(/(?:EMD|Earnest Money|Bid Security)[\s\S]{0,100}?(?:Rs\.?|₹|INR)[\s]*([\d,]+)/i);
      if (emdMatch) fallbackDetails.emd = `Rs. ${emdMatch[1]}`;

      const costMatch = text.match(/(?:Cost of Tender|Tender Fee|Paper Cost|Document Fee)[\s\S]{0,100}?(?:Rs\.?|₹|INR)[\s]*([\d,]+)/i);
      if (costMatch) fallbackDetails.applicationCost = `Rs. ${costMatch[1]}`;

      const valMatch = text.match(/(?:Estimated Cost|Tender Value|Amount)[\s\S]{0,100}?(?:Rs\.?|₹|INR)[\s]*([\d,]+(?:[\s]*(?:Lakhs?|Crores?))?)/i);
      if (valMatch) fallbackDetails.tenderValue = `Rs. ${valMatch[1]}`;

      console.log(`[PDF Extractor] Regex Fallback Successful!`);
      return fallbackDetails;
    } catch (regexError: any) {
      if (regexError?.code === 'ENOENT') {
        console.warn(`[PDF Extractor] Regex Fallback failed: Malformed PDF or HTML error page received from government server.`);
      } else {
        console.error(`[PDF Extractor] Regex Fallback also crashed:`, regexError.message || regexError);
      }
      return null;
    }

  } catch (error) {
    console.error(`[PDF Extractor] Error processing ${pdfUrl}:`, error);
    return null;
  }
}
