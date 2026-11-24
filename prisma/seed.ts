import { PrismaClient, OrderType, PaymentMethod, TransactionStatus, BookingStatus, DiscountType } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export async function runSeed() {
  const existingSetting = await prisma.storeSetting.findUnique({
    where: { id: "default" },
  });

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
      qrisMerchantName: "BARBERBOUS BANDUNG",
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

  const pkgMap: Record<string, { id: string; name: string; description: string; price: number }> = {};
  for (const pkg of packagesData) {
    const saved = await prisma.package.upsert({
      where: { name: pkg.name },
      update: {},
      create: pkg,
    });
    pkgMap[saved.name] = saved;
  }

  const capstersData = [
    {
      name: "Agus",
      photoUrl: "/images/capster-agus.jpg",
      bgColor: "#C4B5E3",
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Adi",
      photoUrl: "/images/capster-adi.jpg",
      bgColor: "#E59A1A",
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Reky",
      photoUrl: "/images/capster-reky.jpg",
      bgColor: "#EE3E7D",
      isActive: true,
      sortOrder: 3,
    },
  ];

  const capMap: Record<string, { id: string; name: string }> = {};
  for (const cap of capstersData) {
    const saved = await prisma.capster.upsert({
      where: { name: cap.name },
      update: {},
      create: cap,
    });
    capMap[saved.name] = saved;
  }

  const vouchers = [
    { code: "MEMBER10", label: "Diskon member 10%", discountType: DiscountType.PERCENT, discountValue: 10 },
    { code: "BARBER15", label: "Promo Barbershop 15%", discountType: DiscountType.PERCENT, discountValue: 15 },
    { code: "HEMAT5K", label: "Potongan Rp5.000", discountType: DiscountType.NOMINAL, discountValue: 5000 },
    { code: "VIP20", label: "Diskon VIP 20%", discountType: DiscountType.PERCENT, discountValue: 20 },
  ];

  for (const v of vouchers) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {},
      create: v,
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

  if (existingSetting) {
    // Already seeded once; avoid duplicating bookings/transactions
    return;
  }

  const bookingCount = await prisma.booking.count();
  if (bookingCount === 0) {
    await prisma.booking.createMany({
      data: [
        {
          customerName: "Rizky Pratama",
          customerPhone: "081298765432",
          isMember: true,
          scheduledTime: "10:00",
          status: BookingStatus.HADIR,
          packageId: pkgMap.Regular.id,
          capsterId: capMap.Agus.id,
        },
        {
          customerName: "Fajar Nugraha",
          customerPhone: "081355667788",
          isMember: false,
          scheduledTime: "10:30",
          status: BookingStatus.MENUNGGU,
          packageId: pkgMap.Basic.id,
          capsterId: capMap.Agus.id,
        },
        {
          customerName: "Dimas Saputra",
          customerPhone: "085244332211",
          isMember: false,
          scheduledTime: "11:00",
          status: BookingStatus.MENUNGGU,
          packageId: pkgMap.Premium.id,
          capsterId: capMap.Reky.id,
        },
        {
          customerName: "Bagas Wiratama",
          customerPhone: "087811223344",
          isMember: false,
          scheduledTime: "11:30",
          status: BookingStatus.MENUNGGU,
          packageId: pkgMap.Basic.id,
          capsterId: capMap.Adi.id,
        },
      ],
    });
  }

  const txCount = await prisma.transaction.count();
  if (txCount === 0) {
    const now = new Date();
    const todayAt = (hour: number, minute: number) => {
      const d = new Date(now);
      d.setHours(hour, minute, 0, 0);
      return d;
    };
    const daysAgoAt = (days: number, hour: number, minute: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    const seedRows: Array<{
      orderNumber: number;
      hour: number;
      minute: number;
      daysAgo?: number;
      pkg: "Basic" | "Regular" | "Premium";
      cap: "Agus" | "Adi" | "Reky";
      orderType: OrderType;
      method: PaymentMethod;
      status: TransactionStatus;
      isMember?: boolean;
      discountAmount?: number;
      discountValue?: number;
      customerName?: string;
      cashReceived?: number;
    }> = [
      { orderNumber: 42, hour: 9, minute: 58, pkg: "Regular", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, isMember: true, discountAmount: 3000, discountValue: 10, cashReceived: 50000 },
      { orderNumber: 41, hour: 9, minute: 41, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 40, hour: 9, minute: 27, pkg: "Regular", cap: "Adi", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 39, hour: 9, minute: 12, pkg: "Basic", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 38, hour: 8, minute: 55, pkg: "Basic", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.REFUND, customerName: "Hendra Kusuma" },
      { orderNumber: 37, hour: 8, minute: 40, pkg: "Premium", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 36, hour: 8, minute: 31, pkg: "Basic", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 35, hour: 8, minute: 19, pkg: "Premium", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Bima Sakti" },
      { orderNumber: 34, hour: 8, minute: 5, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 33, hour: 7, minute: 58, pkg: "Regular", cap: "Reky", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, customerName: "Kevin Pratama", cashReceived: 50000 },
      // Extra today transactions across afternoon hours for rich Hourly chart & reports
      { orderNumber: 32, hour: 10, minute: 15, pkg: "Regular", cap: "Agus", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Rama Wijaya" },
      { orderNumber: 31, hour: 11, minute: 10, pkg: "Premium", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 30, hour: 12, minute: 20, pkg: "Basic", cap: "Adi", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 29, hour: 13, minute: 5, pkg: "Premium", cap: "Agus", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Deni Setiawan" },
      { orderNumber: 28, hour: 13, minute: 35, pkg: "Regular", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 27, hour: 13, minute: 50, pkg: "Basic", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Gilang Ramadhan" },
      { orderNumber: 26, hour: 14, minute: 15, pkg: "Regular", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 40000 },
      { orderNumber: 25, hour: 15, minute: 25, pkg: "Basic", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 24, hour: 16, minute: 10, pkg: "Premium", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 23, hour: 17, minute: 5, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      // Yesterday & recent days for comparison & 7-day / 30-day reports
      { orderNumber: 22, daysAgo: 1, hour: 13, minute: 15, pkg: "Regular", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 21, daysAgo: 1, hour: 15, minute: 40, pkg: "Basic", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Yoga Permana" },
      { orderNumber: 20, daysAgo: 2, hour: 11, minute: 20, pkg: "Premium", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 19, daysAgo: 4, hour: 14, minute: 10, pkg: "Basic", cap: "Agus", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 30000 },
      { orderNumber: 18, daysAgo: 10, hour: 16, minute: 30, pkg: "Regular", cap: "Adi", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
    ];

    for (const row of seedRows) {
      const p = pkgMap[row.pkg];
      const c = capMap[row.cap];
      const discountAmount = row.discountAmount ?? 0;
      const total = p.price - discountAmount;
      const createdAt = row.daysAgo
        ? daysAgoAt(row.daysAgo, row.hour, row.minute)
        : todayAt(row.hour, row.minute);

      await prisma.transaction.create({
        data: {
          orderNumber: row.orderNumber,
          orderCode: `#${String(row.orderNumber).padStart(4, "0")}`,
          orderType: row.orderType,
          customerName: row.customerName ?? "Umum",
          isMember: row.isMember ?? false,
          packageId: p.id,
          packageName: p.name,
          packageDescription: p.description,
          capsterId: c.id,
          capsterName: c.name,
          subtotal: p.price,
          discountType: discountAmount > 0 ? DiscountType.PERCENT : null,
          discountValue: row.discountValue ?? 0,
          discountAmount,
          discountLabel: discountAmount > 0 ? "Diskon member (10%)" : null,
          total,
          paymentMethod: row.method,
          cashReceived: row.method === PaymentMethod.TUNAI ? (row.cashReceived ?? total) : null,
          changeAmount:
            row.method === PaymentMethod.TUNAI ? Math.max(0, (row.cashReceived ?? total) - total) : null,
          status: row.status,
          cashierName: "Rehan",
          createdAt,
        },
      });
    }
  }
}

runSeed()
  .then(async () => {
    console.log("Seed completed successfully");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
