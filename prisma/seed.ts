import {
  PrismaClient,
  OrderType,
  PaymentMethod,
  TransactionStatus,
  BookingStatus,
  DiscountType,
  CapsterStatus,
  ItemType,
} from "@prisma/client";
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
      debitEnabled: true,
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

  const drinksData = [
    { name: "Teh Pucuk", category: "Minuman kemasan", price: 5000, stock: 24, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 1 },
    { name: "Coca Cola", category: "Minuman kemasan", price: 5000, stock: 18, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 2 },
    { name: "Fanta", category: "Minuman kemasan", price: 5000, stock: 6, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 3 },
    { name: "Sprite", category: "Minuman kemasan", price: 5000, stock: 20, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 4 },
    { name: "Golda", category: "Minuman kemasan", price: 5000, stock: 0, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 5 },
    { name: "Ultra Milk", category: "Minuman kemasan", price: 5000, stock: 12, minStock: 6, badgeColor: "#EDE0CE", isActive: true, sortOrder: 6 },
  ];

  const drinkMap: Record<string, { id: string; name: string; price: number }> = {};
  for (const drink of drinksData) {
    const saved = await prisma.drink.upsert({
      where: { name: drink.name },
      update: {},
      create: drink,
    });
    drinkMap[saved.name] = saved;
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
      status: CapsterStatus.MELAYANI,
      rating: 4.8,
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
      joinedLabel: "Feb 2026",
      isActive: true,
      sortOrder: 3,
    },
  ];

  const capMap: Record<string, { id: string; name: string }> = {};
  for (const cap of capstersData) {
    const existingCap = await prisma.capster.findUnique({ where: { name: cap.name } });
    if (existingCap) {
      const needsMetadataBackfill = existingCap.phone === "0812-0000-0000";
      const saved = needsMetadataBackfill
        ? await prisma.capster.update({
            where: { id: existingCap.id },
            data: {
              code: cap.code,
              phone: cap.phone,
              status: cap.status,
              rating: cap.rating,
              joinedLabel: cap.joinedLabel,
            },
          })
        : existingCap;
      capMap[saved.name] = saved;
    } else {
      const saved = await prisma.capster.create({ data: cap });
      capMap[saved.name] = saved;
    }
  }

  const membersData = [
    { memberCode: "MBR-0012", name: "Rizky Pratama", phone: "0812-3456-7801", birthDate: "1997-04-12", notes: "Suka potongan fade tipis", points: 1240, visits: 18, favoritePackage: "Regular", favoriteCapster: "Adi", joinedAt: new Date("2026-08-12T09:00:00Z") },
    { memberCode: "MBR-0018", name: "Fajar Nugraha", phone: "0813-2290-4412", birthDate: "1995-07-22", notes: null, points: 980, visits: 14, favoritePackage: "Regular", favoriteCapster: "Agus", joinedAt: new Date("2026-09-03T09:00:00Z") },
    { memberCode: "MBR-0024", name: "Dimas Saputra", phone: "0857-1180-3321", birthDate: null, notes: "Pomade hold tinggi", points: 860, visits: 12, favoritePackage: "Premium", favoriteCapster: "Reky", joinedAt: new Date("2026-09-21T09:00:00Z") },
    { memberCode: "MBR-0031", name: "Bagas Wiratama", phone: "0821-7788-9034", birthDate: null, notes: null, points: 720, visits: 10, favoritePackage: "Basic", favoriteCapster: "Adi", joinedAt: new Date("2026-10-05T09:00:00Z") },
    { memberCode: "MBR-0037", name: "Hendra Wijaya", phone: "0877-4021-5566", birthDate: null, notes: null, points: 640, visits: 9, favoritePackage: "Regular", favoriteCapster: "Agus", joinedAt: new Date("2026-10-14T09:00:00Z") },
    { memberCode: "MBR-0045", name: "Yoga Permana", phone: "0896-5523-1189", birthDate: null, notes: null, points: 510, visits: 7, favoritePackage: "Basic", favoriteCapster: "Adi", joinedAt: new Date("2026-10-29T09:00:00Z") },
    { memberCode: "MBR-0052", name: "Aldi Firmansyah", phone: "0812-9001-7745", birthDate: null, notes: null, points: 430, visits: 6, favoritePackage: "Regular", favoriteCapster: "Reky", joinedAt: new Date("2026-11-06T09:00:00Z") },
    { memberCode: "MBR-0058", name: "Reza Maulana", phone: "0838-6612-2090", birthDate: null, notes: null, points: 365, visits: 5, favoritePackage: "Basic", favoriteCapster: "Agus", joinedAt: new Date("2026-11-10T09:00:00Z") },
    { memberCode: "MBR-0063", name: "Naufal Hakim", phone: "0851-3340-8812", birthDate: null, notes: null, points: 280, visits: 4, favoritePackage: "Premium", favoriteCapster: "Reky", joinedAt: new Date("2026-11-16T09:00:00Z") },
    { memberCode: "MBR-0071", name: "Iqbal Ramadhan", phone: "0819-0045-3367", birthDate: null, notes: null, points: 150, visits: 2, favoritePackage: "Basic", favoriteCapster: "Agus", joinedAt: new Date("2026-11-20T09:00:00Z") },
  ];

  const memberMap: Record<string, { id: string; name: string }> = {};
  const recentVisit = new Date();
  recentVisit.setDate(recentVisit.getDate() - 2);
  for (const m of membersData) {
    const saved = await prisma.member.upsert({
      where: { memberCode: m.memberCode },
      update: {},
      create: {
        ...m,
        lastVisitAt: recentVisit,
        isActive: true,
      },
    });
    memberMap[saved.memberCode] = saved;
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

  // Backfill TransactionItem for existing transactions & attach sample drinks if none exist yet
  const existingTransactions = await prisma.transaction.findMany({
    include: { items: true },
  });

  if (existingTransactions.length > 0) {
    const hasDrinkItems = existingTransactions.some((t) =>
      t.items.some((i) => i.itemType === ItemType.DRINK)
    );

    for (const tx of existingTransactions) {
      if (tx.items.length === 0 && tx.packageId) {
        const unitPrice = pkgMap[tx.packageName]?.price ?? tx.subtotal;
        await prisma.transactionItem.create({
          data: {
            transactionId: tx.id,
            itemType: ItemType.PACKAGE,
            packageId: tx.packageId,
            packageName: tx.packageName,
            packageDescription: tx.packageDescription,
            unitPrice,
            quantity: 1,
            lineTotal: unitPrice,
          },
        });
      }
    }

    if (!hasDrinkItems) {
      const targetOrders: Array<{ orderNumber: number; drinks: Array<{ name: string; qty: number }> }> = [
        { orderNumber: 42, drinks: [{ name: "Teh Pucuk", qty: 2 }, { name: "Ultra Milk", qty: 1 }] },
        { orderNumber: 41, drinks: [{ name: "Coca Cola", qty: 1 }] },
        { orderNumber: 40, drinks: [{ name: "Sprite", qty: 1 }, { name: "Teh Pucuk", qty: 1 }] },
        { orderNumber: 39, drinks: [{ name: "Fanta", qty: 1 }] },
        { orderNumber: 37, drinks: [{ name: "Coca Cola", qty: 2 }, { name: "Golda", qty: 1 }] },
        { orderNumber: 35, drinks: [{ name: "Teh Pucuk", qty: 2 }] },
        { orderNumber: 32, drinks: [{ name: "Sprite", qty: 2 }] },
        { orderNumber: 29, drinks: [{ name: "Ultra Milk", qty: 1 }] },
      ];

      for (const entry of targetOrders) {
        const tx = await prisma.transaction.findUnique({
          where: { orderNumber: entry.orderNumber },
        });
        if (!tx) continue;

        let addedTotal = 0;
        for (const dItem of entry.drinks) {
          const d = drinkMap[dItem.name];
          if (!d) continue;
          const lineTotal = d.price * dItem.qty;
          addedTotal += lineTotal;
          await prisma.transactionItem.create({
            data: {
              transactionId: tx.id,
              itemType: ItemType.DRINK,
              drinkId: d.id,
              packageName: d.name,
              packageDescription: "Minuman kemasan",
              unitPrice: d.price,
              quantity: dItem.qty,
              lineTotal,
            },
          });
        }
        if (addedTotal > 0) {
          const newTotal = tx.total + addedTotal;
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              subtotal: tx.subtotal + addedTotal,
              total: newTotal,
              memberId: tx.orderNumber === 42 ? memberMap["MBR-0012"]?.id ?? null : tx.memberId,
              customerName: tx.orderNumber === 42 ? "Rizky Pratama" : tx.customerName,
              cashReceived:
                tx.paymentMethod === PaymentMethod.TUNAI
                  ? Math.max(tx.cashReceived ?? newTotal, newTotal)
                  : null,
              changeAmount:
                tx.paymentMethod === PaymentMethod.TUNAI
                  ? Math.max(0, Math.max(tx.cashReceived ?? newTotal, newTotal) - newTotal)
                  : null,
            },
          });
        }
      }
    }
  }

  if (existingSetting) {
    return;
  }

  const bookingCount = await prisma.booking.count();
  if (bookingCount === 0) {
    await prisma.booking.createMany({
      data: [
        {
          customerName: "Rizky Pratama",
          customerPhone: "0812-3456-7801",
          isMember: true,
          scheduledTime: "10:00",
          status: BookingStatus.HADIR,
          packageId: pkgMap.Regular.id,
          capsterId: capMap.Agus.id,
        },
        {
          customerName: "Fajar Nugraha",
          customerPhone: "0813-2290-4412",
          isMember: false,
          scheduledTime: "10:30",
          status: BookingStatus.MENUNGGU,
          packageId: pkgMap.Basic.id,
          capsterId: capMap.Agus.id,
        },
        {
          customerName: "Dimas Saputra",
          customerPhone: "0857-1180-3321",
          isMember: false,
          scheduledTime: "11:00",
          status: BookingStatus.MENUNGGU,
          packageId: pkgMap.Premium.id,
          capsterId: capMap.Reky.id,
        },
        {
          customerName: "Bagas Wiratama",
          customerPhone: "0821-7788-9034",
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
      { orderNumber: 42, hour: 9, minute: 58, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, isMember: true, discountAmount: 0, discountValue: 0, customerName: "Rizky Pratama", cashReceived: 50000 },
      { orderNumber: 41, hour: 9, minute: 41, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 40, hour: 9, minute: 27, pkg: "Regular", cap: "Adi", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 39, hour: 9, minute: 12, pkg: "Basic", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 38, hour: 8, minute: 55, pkg: "Basic", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.REFUND, customerName: "Hendra Wijaya" },
      { orderNumber: 37, hour: 8, minute: 40, pkg: "Premium", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 60000 },
      { orderNumber: 36, hour: 8, minute: 31, pkg: "Basic", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 35, hour: 8, minute: 19, pkg: "Premium", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.DEBIT, status: TransactionStatus.SELESAI, customerName: "Bima Sakti" },
      { orderNumber: 34, hour: 8, minute: 5, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 33, hour: 7, minute: 58, pkg: "Regular", cap: "Reky", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, customerName: "Kevin Pratama", cashReceived: 50000 },
      { orderNumber: 32, hour: 10, minute: 15, pkg: "Regular", cap: "Agus", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Rama Wijaya" },
      { orderNumber: 31, hour: 11, minute: 10, pkg: "Premium", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 30, hour: 12, minute: 20, pkg: "Basic", cap: "Adi", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 29, hour: 13, minute: 5, pkg: "Premium", cap: "Agus", orderType: OrderType.BOOKING, method: PaymentMethod.DEBIT, status: TransactionStatus.SELESAI, customerName: "Deni Setiawan" },
      { orderNumber: 28, hour: 13, minute: 35, pkg: "Regular", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 27, hour: 13, minute: 50, pkg: "Basic", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI, customerName: "Gilang Ramadhan" },
      { orderNumber: 26, hour: 14, minute: 15, pkg: "Regular", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 40000 },
      { orderNumber: 25, hour: 15, minute: 25, pkg: "Basic", cap: "Reky", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
      { orderNumber: 24, hour: 16, minute: 10, pkg: "Premium", cap: "Adi", orderType: OrderType.BOOKING, method: PaymentMethod.TUNAI, status: TransactionStatus.SELESAI, cashReceived: 50000 },
      { orderNumber: 23, hour: 17, minute: 5, pkg: "Basic", cap: "Agus", orderType: OrderType.WALK_IN, method: PaymentMethod.QRIS, status: TransactionStatus.SELESAI },
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
          memberId: row.orderNumber === 42 ? memberMap["MBR-0012"]?.id ?? null : null,
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
          items: {
            create: [
              {
                itemType: ItemType.PACKAGE,
                packageId: p.id,
                packageName: p.name,
                packageDescription: p.description,
                unitPrice: p.price,
                quantity: 1,
                lineTotal: p.price,
              },
            ],
          },
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
