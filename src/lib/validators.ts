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

export const capsterCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama capster wajib diisi").max(60),
  photoUrl: z.string().trim().optional().nullable(),
  bgColor: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const capsterUpdateSchema = capsterCreateSchema.partial();

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

export const transactionCreateSchema = z.object({
  orderType: z.enum(["WALK_IN", "BOOKING"]),
  customerName: z.string().trim().min(1).max(80).default("Umum"),
  isMember: z.boolean().default(false),
  packageId: z.string().min(1, "Paket wajib dipilih"),
  capsterId: z.string().min(1, "Capster wajib dipilih"),
  bookingId: z.string().optional().nullable(),
  discountType: z.enum(["PERCENT", "NOMINAL"]).optional().nullable(),
  discountValue: z.coerce.number().int().min(0).default(0),
  discountLabel: z.string().trim().max(80).optional().nullable(),
  voucherCode: z.string().trim().max(30).optional().nullable(),
  paymentMethod: z.enum(["TUNAI", "QRIS"]),
  cashReceived: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
  status: z.enum(["MENUNGGU_PEMBAYARAN", "SELESAI"]).optional().default("SELESAI"),
});

export const transactionUpdateSchema = z.object({
  status: z.enum(["MENUNGGU_PEMBAYARAN", "SELESAI", "REFUND"]).optional(),
  paymentMethod: z.enum(["TUNAI", "QRIS"]).optional(),
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
