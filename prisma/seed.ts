import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const owner = await prisma.user.upsert({
    where: { email: "dueno@canchacentral.demo" },
    update: {},
    create: { email: "dueno@canchacentral.demo", name: "Martín Dueño", passwordHash },
  });

  const complex = await prisma.complex.upsert({
    where: { slug: "cancha-central" },
    update: {},
    create: {
      name: "Cancha Central",
      slug: "cancha-central",
      plan: "FREE",
      memberships: { create: { userId: owner.id, role: "OWNER" } },
    },
  });

  const padel = await prisma.sport.create({
    data: { complexId: complex.id, name: "Pádel", defaultSlotMinutes: 90, allowsTournaments: true },
  });
  const futbol = await prisma.sport.create({
    data: { complexId: complex.id, name: "Fútbol 5", defaultSlotMinutes: 60, allowsTournaments: true },
  });

  const courts = await Promise.all([
    prisma.court.create({ data: { complexId: complex.id, sportId: padel.id, name: "Cancha 1" } }),
    prisma.court.create({ data: { complexId: complex.id, sportId: padel.id, name: "Cancha 2" } }),
    prisma.court.create({ data: { complexId: complex.id, sportId: futbol.id, name: "Cancha 3" } }),
  ]);

  const customer = await prisma.customer.create({
    data: { complexId: complex.id, name: "Familia Gómez", phone: "+54 9 11 5555-0000" },
  });

  const today = new Date();
  today.setHours(18, 0, 0, 0);
  await prisma.booking.create({
    data: {
      complexId: complex.id,
      courtId: courts[0].id,
      customerId: customer.id,
      startTime: today,
      endTime: new Date(today.getTime() + 90 * 60000),
      status: "CONFIRMED",
      totalPrice: 12000,
    },
  });


  const tournament = await prisma.tournament.create({
    data: {
      complexId: complex.id,
      sportId: padel.id,
      name: "Copa Apertura",
      format: "SINGLE_ELIM",
      status: "REGISTRATION_OPEN",
      publicSlug: "copa-apertura-demo",
    },
  });
  await prisma.tournamentTeam.createMany({
    data: [
      { tournamentId: tournament.id, name: "Silva/Paz", players: ["Silva", "Paz"], seed: 1 },
      { tournamentId: tournament.id, name: "Ruiz/Tello", players: ["Ruiz", "Tello"], seed: 2 },
      { tournamentId: tournament.id, name: "Díaz/Cruz", players: ["Díaz", "Cruz"], seed: 3 },
      { tournamentId: tournament.id, name: "Vega/Sosa", players: ["Vega", "Sosa"], seed: 4 },
    ],
  });

  console.log("Seed listo:", complex.slug);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
