"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";

export async function getCoupons() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

const CouponSchema = z.object({
  code: z.string().min(3).transform((s) => s.toUpperCase()),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().positive(),
});

export async function createCoupon(input: z.infer<typeof CouponSchema>) {
  const complex = await requireComplex();
  if (!hasFeature(complex.plan, "coupons")) throw new Error("Los cupones son una función del plan Pro.");
  const data = CouponSchema.parse(input);
  const db = tenantPrisma(complex.id);

  const existing = await db.coupon.findFirst({ where: { code: data.code } });
  if (existing) throw new Error("Ya existe un cupón con ese código.");

  await db.coupon.create({ data });
  revalidatePath("/marketing");
}

export async function toggleCoupon(couponId: string, isActive: boolean) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  await db.coupon.updateMany({ where: { id: couponId }, data: { isActive } });
  revalidatePath("/marketing");
}

/** Devuelve el precio con el descuento ya aplicado, o el original si el cupón no es válido. */
export async function validateCoupon(code: string, originalPrice: number) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const coupon = await db.coupon.findFirst({ where: { code: code.toUpperCase(), isActive: true } });

  if (!coupon) return { valid: false, finalPrice: originalPrice, discount: 0 };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, finalPrice: originalPrice, discount: 0 };

  const discount = coupon.discountType === "PERCENT" ? originalPrice * (coupon.discountValue / 100) : coupon.discountValue;
  const finalPrice = Math.max(0, originalPrice - discount);
  return { valid: true, finalPrice, discount, couponId: coupon.id };
}
