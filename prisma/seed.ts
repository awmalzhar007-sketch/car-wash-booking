import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.oTPChallenge.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.washBay.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.brand.deleteMany();

  // 1. Create Brand
  const brand = await prisma.brand.create({
    data: {
      name: "Clean Car",
      slug: "clean-car",
      isActive: true,
    },
  });

  // 2. Create Branch 1: Maadi Branch
  const maadiBranch = await prisma.branch.create({
    data: {
      brandId: brand.id,
      name: "Maadi Branch",
      slug: "maadi-branch",
      address: "Road 9, Maadi, Cairo",
      phone: "+20 100 123 4567",
      qrIdentifier: "clean-car-maadi",
      openTime: "09:00",
      closeTime: "22:00",
      avgDurationMinutes: 30,
      isActive: true,
    },
  });

  // 3 bays for Maadi
  const maadiBay1 = await prisma.washBay.create({
    data: { branchId: maadiBranch.id, bayNumber: 1, name: "Bay 1", isActive: true },
  });
  const maadiBay2 = await prisma.washBay.create({
    data: { branchId: maadiBranch.id, bayNumber: 2, name: "Bay 2", isActive: true },
  });
  const maadiBay3 = await prisma.washBay.create({
    data: { branchId: maadiBranch.id, bayNumber: 3, name: "Bay 3", isActive: true },
  });

  // 3. Create Branch 2: Nasr City Branch
  const nasrBranch = await prisma.branch.create({
    data: {
      brandId: brand.id,
      name: "Nasr City Branch",
      slug: "nasr-city-branch",
      address: "Abbas El Akkad St, Nasr City, Cairo",
      phone: "+20 100 987 6543",
      qrIdentifier: "clean-car-nasr-city",
      openTime: "10:00",
      closeTime: "23:00",
      avgDurationMinutes: 30,
      isActive: true,
    },
  });

  // 2 bays for Nasr City
  await prisma.washBay.create({
    data: { branchId: nasrBranch.id, bayNumber: 1, name: "Bay 1", isActive: true },
  });
  await prisma.washBay.create({
    data: { branchId: nasrBranch.id, bayNumber: 2, name: "Bay 2", isActive: true },
  });

  // 3.5 Create Services & Pricing for each branch
  await prisma.service.createMany({
    data: [
      {
        branchId: maadiBranch.id,
        name: "Exterior Wash",
        description: "Foam wash, rinse & dry",
        price: 80,
        durationMinutes: 20,
        sortOrder: 1,
      },
      {
        branchId: maadiBranch.id,
        name: "Interior Vacuum & Wipe",
        description: "Full interior vacuum and dashboard wipe-down",
        price: 60,
        durationMinutes: 15,
        sortOrder: 2,
      },
      {
        branchId: maadiBranch.id,
        name: "Full Package (Exterior + Interior)",
        description: "Our most popular combo",
        price: 120,
        durationMinutes: 35,
        sortOrder: 3,
      },
      {
        branchId: maadiBranch.id,
        name: "Wax & Polish",
        description: "Protective wax coat with hand polish",
        price: 150,
        durationMinutes: 45,
        sortOrder: 4,
      },
      {
        branchId: nasrBranch.id,
        name: "Exterior Wash",
        description: "Foam wash, rinse & dry",
        price: 90,
        durationMinutes: 20,
        sortOrder: 1,
      },
      {
        branchId: nasrBranch.id,
        name: "Interior Vacuum & Wipe",
        description: "Full interior vacuum and dashboard wipe-down",
        price: 65,
        durationMinutes: 15,
        sortOrder: 2,
      },
      {
        branchId: nasrBranch.id,
        name: "Full Package (Exterior + Interior)",
        description: "Our most popular combo",
        price: 130,
        durationMinutes: 35,
        sortOrder: 3,
      },
    ],
  });

  // 4. Create Users
  const adminPasswordHash = await bcrypt.hash("admin12345", 10);
  const staffPasswordHash = await bcrypt.hash("staff123456", 10);

  // Admin
  await prisma.user.create({
    data: {
      email: "admin@cleancar.com",
      name: "System Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  // Branch Staff: Maadi
  await prisma.user.create({
    data: {
      email: "staff.maadi@cleancar.com",
      name: "Maadi Staff",
      passwordHash: staffPasswordHash,
      role: "BRANCH_STAFF",
      branchId: maadiBranch.id,
    },
  });

  // Branch Staff: Nasr City
  await prisma.user.create({
    data: {
      email: "staff.nasr@cleancar.com",
      name: "Nasr Staff",
      passwordHash: staffPasswordHash,
      role: "BRANCH_STAFF",
      branchId: nasrBranch.id,
    },
  });

  // 5. Create Sample Bookings for today to verify availability
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const today = `${year}-${month}-${day}`;

  await prisma.booking.create({
    data: {
      bookingNumber: "CW-1001",
      branchId: maadiBranch.id,
      assignedBayId: maadiBay1.id,
      customerName: "Ahmed Hassan",
      customerPhone: "+201011112222",
      bookingDate: today,
      startTime: "11:00",
      endTime: "11:30",
      status: "CONFIRMED",
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: "CW-1002",
      branchId: maadiBranch.id,
      assignedBayId: maadiBay2.id,
      customerName: "Mohamed Aly",
      customerPhone: "+201033334444",
      bookingDate: today,
      startTime: "11:00",
      endTime: "11:30",
      status: "CONFIRMED",
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: "CW-1000",
      branchId: maadiBranch.id,
      assignedBayId: maadiBay1.id,
      customerName: "Kareem Mahmoud",
      customerPhone: "+201012340000",
      bookingDate: today,
      startTime: "09:00",
      endTime: "09:30",
      status: "COMPLETED",
      servicesJson: JSON.stringify([
        { id: "s1", name: "Exterior Wash", price: 80, durationMinutes: 20 },
      ]),
      totalPrice: 80,
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: "CW-1003",
      branchId: maadiBranch.id,
      assignedBayId: maadiBay2.id,
      customerName: "Tarek Nour",
      customerPhone: "+201098760000",
      bookingDate: today,
      startTime: "09:30",
      endTime: "10:00",
      status: "COMPLETED",
      servicesJson: JSON.stringify([
        { id: "s2", name: "Full Package (Exterior + Interior)", price: 130, durationMinutes: 30 },
      ]),
      totalPrice: 130,
    },
  });

  // Note: Bay 3 at 11:00 remains free! So 11:00 is AVAILABLE in Maadi.

  console.log("Database seeded successfully!");
  console.log("Credentials:");
  console.log("- Admin: admin@cleancar.com / admin123456");
  console.log("- Maadi Staff: staff.maadi@cleancar.com / staff123456");
  console.log("- Nasr Staff: staff.nasr@cleancar.com / staff123456");
  console.log("- QR Maadi: clean-car-maadi (/book/clean-car-maadi)");
  console.log("- QR Nasr City: clean-car-nasr-city (/book/clean-car-nasr-city)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
