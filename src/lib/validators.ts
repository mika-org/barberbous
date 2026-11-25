import { z } from "zod";

export const packageCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama paket wajib diisi").max(60),
  description: z.string().trim().min(1, "Isi paket wajib diisi").max(200),
  price: z.coerce.number().int().min(0, "Harga tidak boleh negatif"),
  imageUrl: z.string().trim().optional().nullable(),
  badgeColor: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const packageUpdateSchema = packageCreateSchema.partial();

export const drinkCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama minuman wajib diisi").max(60),
  category: z.string().trim().min(1).max(60).optional().default("Minuman kemasan"),
  price: z.coerce.number().int().min(0, "Harga tidak boleh negatif"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif").default(0),
  minStock: z.coerce.number().int().min(0, "Batas minimum tidak boleh negatif").default(6),
  imageUrl: z.string().trim().optional().nullable(),
  badgeColor: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const drinkUpdateSchema = drinkCreateSchema.partial();

export const capsterCreateSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1, "Nama capster wajib diisi").max(60),
  phone: z.string().trim().min(1, "No. telepon wajib diisi").max(30).optional().default("0812-0000-0000"),
  photoUrl: z.string().trim().optional().nullable(),
  bgColor: z.string().trim().optional(),
  status: z.enum(["TERSEDIA", "MELAYANI", "ISTIRAHAT"]).optional().default("TERSEDIA"),
  rating: z.coerce.number().min(0).max(5).optional().default(4.9),
  joinedLabel: z.string().trim().max(30).optional().default("Jan 2026"),
  isActive: z.boolean().optional().default(true),
});

export const capsterUpdateSchema = capsterCreateSchema.partial();

export const memberCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama lengkap wajib diisi").max(80),
  phone: z.string().trim().min(6, "No. telepon wajib diisi").max(30),
  birthDate: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
  points: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const memberUpdateSchema = memberCreateSchema.partial();

export const bookingCreateSchema = z.object({
  customerName: z.string().trim().min(1, "Nama pelanggan wajib diisi").max(80),
  customerPhone: z.string().trim().max(30).optional().nullable(),
  isMember: z.boolean().optional().default(false),
  scheduledTime: z.string().trim().regex(/^\d{2}:\d{2}$/, "Format jam HH:MM"),
  packageId: z.string().min(1, "Paket wajib dipilih"),
  capsterId: z.string().min(1, "Capster wajib dipilih"),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const bookingUpdateSchema = z.object({
  status: z.enum(["HADIR", "MENUNGGU", "SELESAI", "BATAL"]).optional(),
  packageId: z.string().optional(),
  capsterId: z.string().optional(),
  scheduledTime: z.string().trim().optional(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const voucherApplySchema = z.object({
  code: z.string().trim().min(1, "Masukkan kode voucher").max(30),
  subtotal: z.coerce.number().int().min(0),
});

export const transactionItemInputSchema = z
  .object({
    itemType: z.enum(["PACKAGE", "DRINK"]).optional().default("PACKAGE"),
    packageId: z.string().min(1).optional(),
    drinkId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().min(1, "Jumlah minimal 1").max(50),
  })
  .refine(
    (item) =>
      (item.itemType === "PACKAGE" && Boolean(item.packageId)) ||
      (item.itemType === "DRINK" && Boolean(item.drinkId)) ||
      Boolean(item.packageId),
    { message: "Item transaksi tidak valid" }
  );

export const transactionCreateSchema = z
  .object({
    orderType: z.enum(["WALK_IN", "BOOKING"]),
    customerName: z.string().trim().min(1).max(80).default("Umum"),
    isMember: z.boolean().default(false),
    memberId: z.string().optional().nullable(),
    items: z.array(transactionItemInputSchema).min(1, "Pilih minimal 1 item").optional(),
    packageId: z.string().min(1).optional(),
    capsterId: z.string().optional().nullable(),
    bookingId: z.string().optional().nullable(),
    discountType: z.enum(["PERCENT", "NOMINAL"]).optional().nullable(),
    discountValue: z.coerce.number().int().min(0).default(0),
    discountLabel: z.string().trim().max(80).optional().nullable(),
    voucherCode: z.string().trim().max(30).optional().nullable(),
    paymentMethod: z.enum(["TUNAI", "QRIS", "DEBIT"]),
    cashReceived: z.coerce.number().int().min(0).optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
    status: z.enum(["MENUNGGU_PEMBAYARAN", "SELESAI"]).optional().default("SELESAI"),
  })
  .refine((data) => (data.items && data.items.length > 0) || Boolean(data.packageId), {
    message: "Pilih minimal 1 item layanan atau minuman",
    path: ["items"],
  });

export const transactionUpdateSchema = z.object({
  status: z.enum(["MENUNGGU_PEMBAYARAN", "SELESAI", "REFUND"]).optional(),
  paymentMethod: z.enum(["TUNAI", "QRIS", "DEBIT"]).optional(),
  cashReceived: z.coerce.number().int().min(0).optional().nullable(),
});

export const storeSettingUpdateSchema = z.object({
  storeName: z.string().trim().min(1).max(80).optional(),
  address: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  printerName: z.string().trim().min(1).max(80).optional(),
  printerConnection: z.string().trim().max(80).optional(),
  printerConnected: z.boolean().optional(),
  paperSize: z.enum(["58 mm", "80 mm"]).optional(),
  autoPrintReceipt: z.boolean().optional(),
  receiptFooter: z.string().trim().max(200).optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.coerce.number().int().min(0).max(100).optional(),
  serviceFeeEnabled: z.boolean().optional(),
  serviceFeeAmount: z.coerce.number().int().min(0).optional(),
  priceIncludesTax: z.boolean().optional(),
  tunaiEnabled: z.boolean().optional(),
  qrisEnabled: z.boolean().optional(),
  debitEnabled: z.boolean().optional(),
  qrisMerchantName: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(50),
  password: z.string().min(1, "Password wajib diisi").max(100),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/, "Username hanya boleh huruf, angka, titik, atau underscore"),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")),
  role: z.enum(["Owner", "Admin", "Kasir"]).default("Kasir"),
  isActive: z.boolean().optional().default(true),
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/, "Username hanya boleh huruf, angka, titik, atau underscore")
    .optional(),
  password: z.string().min(6, "Password minimal 6 karakter").max(100).optional().or(z.literal("")),
  role: z.enum(["Owner", "Admin", "Kasir"]).optional(),
  isActive: z.boolean().optional(),
});
