export const GRADES = ["K", "1", "2", "3", "4", "5"] as const;

export type Grade = (typeof GRADES)[number];

/** Grade 5 leaves Maple Hollow at the yearly rollover. */
export const GRADUATING_GRADE: Grade = "5";

export const CHANNELS = ["email", "sms"] as const;

export type Channel = (typeof CHANNELS)[number];

export interface HouseholdPreferences {
  dietaryNotes: string;
}

export interface Household {
  id: string;
  name: string;
  email: string;
  phone: string;
  reminderOptIn: Record<Channel, boolean>;
  preferences: HouseholdPreferences;
}

export interface Student {
  id: string;
  householdId: string;
  firstName: string;
  lastName: string;
  grade: Grade;
  archived: boolean;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  priceCents: number;
}

export interface MenuDay {
  id: string;
  label: string;
  /** UTC calendar day the meal is served, YYYY-MM-DD. */
  serviceDate: string;
  /** ISO-8601 instant after which ordering is locked. */
  cutoffAt: string;
  vendorId: string;
  itemIds: string[];
}

export interface Order {
  id: string;
  studentId: string;
  menuDayId: string;
  itemId: string;
  priceCents: number;
  placedAt: string;
}

export type PaymentMethod = "cash" | "check" | "mock-transfer";

export interface Payment {
  id: string;
  householdId: string;
  amountCents: number;
  receivedAt: string;
  method: PaymentMethod;
  reference: string;
}

export interface Reminder {
  id: string;
  householdId: string;
  menuDayId: string;
  channel: Channel;
  createdAt: string;
  body: string;
  /** Recorded locally. No email or SMS provider is called. */
  status: "mock-sent";
}

export interface LunchSnapshot {
  schoolName: string;
  schoolYearLabel: string;
  rolloverApplied: boolean;
  households: Household[];
  students: Student[];
  vendors: Vendor[];
  menuItems: MenuItem[];
  menuDays: MenuDay[];
  orders: Order[];
  payments: Payment[];
  reminders: Reminder[];
}
