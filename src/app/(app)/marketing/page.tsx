import { TopBar } from "@/components/layout/TopBar";
import { CouponsManager } from "@/components/marketing/CouponsManager";
import { getCoupons } from "@/server/actions/coupons";

export default async function MarketingPage() {
  const coupons = await getCoupons();
  return (
    <>
      <TopBar title="Marketing" />
      <div className="px-4 py-4 sm:px-8">
        <CouponsManager initialCoupons={coupons as any} />
      </div>
    </>
  );
}
