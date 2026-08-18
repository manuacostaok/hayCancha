import { TopBar } from "@/components/layout/TopBar";
import { CustomersManager } from "@/components/customers/CustomersManager";
import { getCustomers } from "@/server/actions/bookings";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <>
      <TopBar title="Clientes" />
      <div className="px-4 py-4 sm:px-8">
        {customers.length === 0 ? (
          <p className="text-sm text-chalk-dim">Todavía no tenés clientes cargados — se crean solos apenas hacés la primera reserva.</p>
        ) : (
          <CustomersManager customers={customers as any} />
        )}
      </div>
    </>
  );
}
