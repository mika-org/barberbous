import { PrismaClient, CapsterStatus } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export async function runSeed() {
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "BARBERBOUS",
      address: "Jl. Turangga No. 12, Bandung",
      phone: "081234567890",
      printerName: "Epson TM-T82",
      printerConnection: "Bluetooth · Printer utama",
      printerConnected: true,
      paperSize: "80 mm",
      autoPrintReceipt: true,
      receiptFooter: "Terima kasih, sampai jumpa!",
      taxEnabled: false,
      taxRate: 10,
      serviceFeeEnabled: false,
      serviceFeeAmount: 0,
      priceIncludesTax: false,
      tunaiEnabled: true,
      qrisEnabled: true,
      debitEnabled: true,
      qrisMerchantName: "Barberbous, Service",
      qrisNmid: "ID1026609626373",
      qrisImageUrl: "/images/qris.jpeg",
    },
  });

  const packagesData = [
    {
      name: "Basic",
      description: "Haircut, Hair tonic, Styling",
      price: 30000,
      badgeColor: "#EDE0CE",
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Regular",
      description: "Haircut, Hair wash, Hair tonic, Styling",
      price: 35000,
      badgeColor: "#EDE0CE",
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Premium",
      description: "Haircut, Hair wash, Hot tonic, Styling",
      price: 40000,
      badgeColor: "#EDE0CE",
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const pkg of packagesData) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: {},
      create: pkg,
    });
  }

  const drinksData = [
    // Minuman (14 item)
    { name: "Kopi ABC", category: "Minuman", price: 5000, stock: 50, minStock: 10, badgeColor: "#EDE0CE", isActive: true, sortOrder: 1 },
    { name: "Kopi Capuccino", category: "Minuman", price: 5000, stock: 50, minStock: 10, badgeColor: "#EDE0CE", isActive: true, sortOrder: 2 },
    { name: "Kopi GoodDay", category: "Minuman", price: 5000, stock: 50, minStock: 10, badgeColor: "#EDE0CE", isActive: true, sortOrder: 3 },
    { name: "Espresso", category: "Minuman", price: 15000, stock: 50, minStock: 10, badgeColor: "#E6D5B8", isActive: true, sortOrder: 4 },
    { name: "Capuccino", category: "Minuman", price: 25000, stock: 50, minStock: 10, badgeColor: "#E6D5B8", isActive: true, sortOrder: 5 },
    { name: "Latte", category: "Minuman", price: 25000, stock: 50, minStock: 10, badgeColor: "#E6D5B8", isActive: true, sortOrder: 6 },
    { name: "V60", category: "Minuman", price: 20000, stock: 50, minStock: 10, badgeColor: "#E6D5B8", isActive: true, sortOrder: 7 },
    { name: "Kopi Golda", category: "Minuman", price: 5000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 8 },
    { name: "Teh Kotak", category: "Minuman", price: 5000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 9 },
    { name: "Fruty", category: "Minuman", price: 6000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 10 },
    { name: "Teh Pucuk", category: "Minuman", price: 5000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 11 },
    { name: "Milku", category: "Minuman", price: 5000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 12 },
    { name: "Pocari Sweet", category: "Minuman", price: 8000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 13 },
    { name: "Nipis Madu", category: "Minuman", price: 6000, stock: 30, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 14 },
    // Makanan (4 item)
    { name: "Mie Goreng", category: "Makanan", price: 10000, stock: 40, minStock: 8, badgeColor: "#F5E6CC", isActive: true, sortOrder: 15 },
    { name: "Mie Goreng + Telur", category: "Makanan", price: 15000, stock: 40, minStock: 8, badgeColor: "#F5E6CC", isActive: true, sortOrder: 16 },
    { name: "Mie Rebus", category: "Makanan", price: 10000, stock: 40, minStock: 8, badgeColor: "#F5E6CC", isActive: true, sortOrder: 17 },
    { name: "Mie Rebus + Telur", category: "Makanan", price: 15000, stock: 40, minStock: 8, badgeColor: "#F5E6CC", isActive: true, sortOrder: 18 },
  ];

  for (const drink of drinksData) {
    await prisma.drink.upsert({
      where: { name: drink.name },
      update: {},
      create: drink,
    });
  }

  const capstersData = [
    {
      code: "CPS-01",
      name: "Agus",
      phone: "0812-0000-1101",
      photoUrl: "/images/capster-agus.jpg",
      bgColor: "#C4B5E3",
      status: CapsterStatus.TERSEDIA,
      rating: 4.9,
      commissionPct: 40,
      joinedLabel: "Jan 2026",
      isActive: true,
      sortOrder: 1,
    },
    {
      code: "CPS-02",
      name: "Adi",
      phone: "0813-0000-1102",
      photoUrl: "/images/capster-adi.jpg",
      bgColor: "#E59A1A",
      status: CapsterStatus.TERSEDIA,
      rating: 4.8,
      commissionPct: 40,
      joinedLabel: "Jan 2026",
      isActive: true,
      sortOrder: 2,
    },
    {
      code: "CPS-03",
      name: "Reky",
      phone: "0857-0000-1103",
      photoUrl: "/images/capster-reky.jpg",
      bgColor: "#EE3E7D",
      status: CapsterStatus.TERSEDIA,
      rating: 4.9,
      commissionPct: 40,
      joinedLabel: "Feb 2026",
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const cap of capstersData) {
    await prisma.capster.upsert({
      where: { name: cap.name },
      update: {},
      create: cap,
    });
  }

  await prisma.staffUser.upsert({
    where: { username: "rehan" },
    update: {},
    create: {
      name: "Rehan",
      username: "rehan",
      passwordHash: hashPassword("kasir123"),
      email: "rehan@barberbous.id",
      role: "Kasir",
      isActive: true,
    },
  });

  await prisma.staffUser.upsert({
    where: { username: "aditia" },
    update: {},
    create: {
      name: "Aditia",
      username: "aditia",
      passwordHash: hashPassword("admin123"),
      email: "aditia@barberbous.id",
      role: "Owner",
      isActive: true,
    },
  });
}

runSeed()
  .then(async () => {
    console.log("Master seed completed (clean state, zero dummy transactions)");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
