import { requireUserId } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

function fallback(m: string) {
  const lo = m.toLowerCase();
  if (/rent|landlord|apartment|lease/.test(lo)) return { optionA: "Housing / rent", optionB: "Other essential" };
  if (/grocery|whole foods|trader|safeway|kroger|aldi/.test(lo)) return { optionA: "Groceries", optionB: "Dining" };
  if (/uber|lyft|gas|shell|chevron|parking/.test(lo)) return { optionA: "Transport", optionB: "Discretionary" };
  if (/netflix|spotify|hulu|disney|apple/.test(lo)) return { optionA: "Subscriptions", optionB: "Entertainment" };
  return { optionA: "Essential", optionB: "Discretionary" };
}

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { merchantName } = await req.json();
  const name = String(merchantName || "").slice(0, 200);
  if (!name) return NextResponse.json({ error: "merchantName required" }, { status: 400 });

  // Privacy: only merchant name is sent to external AI — no amounts, no dates
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: 'Reply JSON only: {"optionA":"string","optionB":"string"} — two short spending categories for a bank transaction. No amounts.' },
            { role: "user", content: `Merchant: ${name}` },
          ],
          temperature: 0.3,
          max_tokens: 60,
        }),
      });
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.optionA && parsed.optionB) return NextResponse.json(parsed);
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json(fallback(name));
}
