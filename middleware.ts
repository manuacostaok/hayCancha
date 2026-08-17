import { NextRequest, NextResponse } from "next/server";

/**
 * Resuelve el tenant (Complex) a partir del subdominio:
 *   canchacentral.canchas.app  -> x-complex-slug: canchacentral
 * o de un dominio propio (plan PRO), buscado por customDomain.
 *
 * MODO DEV: en localhost no hay subdominios reales, así que resuelve
 * siempre contra el complejo de la seed (`cancha-central`) para que
 * `npm run dev` + `npm run db:seed` ya te deje entrar directo a /calendar
 * sin tocar nada más. Podés override con ?complex=otro-slug en la URL.
 */
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "canchas.app";
const DEV_DEFAULT_SLUG = "cancha-central";
const PUBLIC_HOSTS = new Set([ROOT_DOMAIN, `www.${ROOT_DOMAIN}`]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const requestHeaders = new Headers(req.headers);

  if (isLocalhost) {
    const override = req.nextUrl.searchParams.get("complex");
    requestHeaders.set("x-complex-slug", override ?? DEV_DEFAULT_SLUG);
  } else if (!PUBLIC_HOSTS.has(host)) {
    const slug = host.endsWith(`.${ROOT_DOMAIN}`) ? host.replace(`.${ROOT_DOMAIN}`, "") : host;
    requestHeaders.set("x-complex-slug", slug);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
