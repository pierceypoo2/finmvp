import { requireUserId } from "@/lib/getUser";
import { getPlaidClient } from "@/lib/plaid";
import { rateLimit } from "@/lib/rateLimit";
import { CountryCode, Products } from "plaid";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`link_token:${userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const purpose = req.nextUrl.searchParams.get("purpose");
  if (purpose !== "credit" && purpose !== "bank" && purpose !== "loan") {
    return NextResponse.json({ error: "purpose must be credit, bank, or loan" }, { status: 400 });
  }

  try {
    const plaid = getPlaidClient();
    const base = {
      client_name: "Transparency Audit",
      language: "en" as const,
      country_codes: [CountryCode.Us],
      user: { client_user_id: userId },
    };

    let products: Products[];
    if (purpose === "credit") {
      products = [Products.Transactions, Products.Liabilities];
    } else if (purpose === "loan") {
      products = [Products.Liabilities, Products.Transactions];
    } else {
      products = [Products.Transactions];
    }

    const params = { ...base, products };

    const { data } = await plaid.linkTokenCreate(params);
    return NextResponse.json({ link_token: data.link_token });
  } catch (e) {
    console.error("linkTokenCreate error:", e);
    return NextResponse.json({ error: "link_token_failed" }, { status: 500 });
  }
}
