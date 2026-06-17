import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const tenantId = process.env.AZURE_TENANT_ID || "a42b1dbd-88b6-455b-86ad-e0d29d89288f";

async function getGraphToken() {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId!);
  params.append("client_secret", clientSecret!);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Microsoft Graph");
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET() {
  try {
    const recipients = await (prisma as any).emailRecipient.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: recipients });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });

    if (!clientId || !clientSecret) {
      return NextResponse.json({ success: false, error: "Microsoft Graph credentials are not configured" }, { status: 500 });
    }

    const token = await getGraphToken();

    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/users/${email}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!graphRes.ok) {
      return NextResponse.json({ success: false, error: "User not found in Microsoft Directory" }, { status: 404 });
    }

    const userData = await graphRes.json();
    const name = userData.displayName || email.split('@')[0];

    const newRecipient = await (prisma as any).emailRecipient.create({
      data: {
        email: email.toLowerCase(),
        name: name
      }
    });

    return NextResponse.json({ success: true, data: newRecipient });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "This email is already in the recipient list." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to add recipient" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    await (prisma as any).emailRecipient.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
