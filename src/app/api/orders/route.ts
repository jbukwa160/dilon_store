import { after, NextResponse, type NextRequest } from "next/server";
import {
  buildOrder, deliveryIssues, isOwnMessage, mailOrder, OrderError, orderLocale, orderMessages, orderSchema, recordOrder, saveOrder,
  tooManyAttempts, tooManyOrders,
} from "@/lib/orders";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: orderMessages("bg").invalid }, { status: 400 });
  }
  const locale = orderLocale(body);
  const m = orderMessages(locale);
  if (tooManyAttempts(ip)) return NextResponse.json({ error: m.busy }, { status: 429 });

  const parsed = orderSchema(locale).safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = typeof body === "object" && body ? deliveryIssues(body as Record<string, unknown>, locale) : {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      // zod's own default messages are English and technical; replace them with a plain "fill in this field".
      fields[key] ??= isOwnMessage(issue.message, locale) ? issue.message : m.required;
    }
    // A filled honeypot means a bot: answer like a success so it does not retry, but save nothing.
    if (fields.website) return NextResponse.json({ number: "KD-000000-0000", total: 0 });
    return NextResponse.json({ error: m.check, fields }, { status: 422 });
  }

  if (tooManyOrders(ip)) return NextResponse.json({ error: m.busy }, { status: 429 });

  try {
    const order = buildOrder(parsed.data, locale);
    await saveOrder(order);
    recordOrder(ip);
    after(() => mailOrder(order));
    return NextResponse.json({
      number: order.number,
      total: order.total,
      subtotal: order.subtotal,
      shipping: order.shipping,
      email: order.customer.email,
      delivery: order.delivery.label,
      emailSent: Boolean(process.env.SMTP_HOST),
    });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message, fields: err.fields }, { status: 409 });
    console.error("[orders] could not save order", err);
    return NextResponse.json({ error: m.failed }, { status: 500 });
  }
}
