/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();
const SHOULD_RESET = process.env.SEED_RESET !== "false";

const ROOM_BEDS_BY_SHARING = {
  SINGLE: ["A"],
  DOUBLE: ["A", "B"],
  TRIPLE: ["A", "B", "C"],
  DORMITORY: ["A", "B", "C", "D", "E", "F"]
};

const hostelSeed = {
  name: "Shantiniketan Residency Hostel",
  address: "12 Residency Road, Indiranagar, Bengaluru",
  contactNumber: "+91-8045012233",
  timezone: "Asia/Kolkata",
  status: "ACTIVE",
  electricityType: "METER_BASED",
  electricityRatePerUnit: "9.25",
  billingCycle: "MONTHLY",
  electricitySplitMode: "STAY_DURATION",
  floors: [
    {
      floorNumber: 1,
      label: "First Floor",
      rooms: [
        { roomNumber: "101", sharingType: "DOUBLE", genderRestriction: "MALE_ONLY", status: "ACTIVE", basePrice: "13500", attributes: { ac: true, smokingAllowed: false, attachedBath: true, wifi: true } },
        { roomNumber: "102", sharingType: "TRIPLE", genderRestriction: "MALE_ONLY", status: "ACTIVE", basePrice: "9800", attributes: { ac: false, smokingAllowed: false, attachedBath: true, wifi: true } },
        { roomNumber: "103", sharingType: "DORMITORY", genderRestriction: "MALE_ONLY", status: "ACTIVE", basePrice: "7600", attributes: { ac: false, smokingAllowed: false, attachedBath: false, wifi: true }, bedStatusOverrides: { F: "RESERVED" } },
        { roomNumber: "B101", sharingType: "DOUBLE", genderRestriction: "FEMALE_ONLY", status: "ACTIVE", basePrice: "13800", attributes: { ac: true, smokingAllowed: false, attachedBath: true, wifi: true } },
        { roomNumber: "B102", sharingType: "TRIPLE", genderRestriction: "FEMALE_ONLY", status: "ACTIVE", basePrice: "9600", attributes: { ac: false, smokingAllowed: false, attachedBath: true, wifi: true } },
        { roomNumber: "C101", sharingType: "SINGLE", genderRestriction: "ANY", status: "ACTIVE", basePrice: "22500", attributes: { ac: true, smokingAllowed: false, attachedBath: true, wifi: true } }
      ]
    },
    {
      floorNumber: 2,
      label: "Second Floor",
      rooms: [
        { roomNumber: "201", sharingType: "DOUBLE", genderRestriction: "MALE_ONLY", status: "ACTIVE", basePrice: "14200", attributes: { ac: true, smokingAllowed: false, attachedBath: true, wifi: true } },
        { roomNumber: "202", sharingType: "SINGLE", genderRestriction: "MALE_ONLY", status: "ACTIVE", basePrice: "18500", attributes: { ac: true, smokingAllowed: false, attachedBath: true, wifi: true } },
        { roomNumber: "B201", sharingType: "SINGLE", genderRestriction: "FEMALE_ONLY", status: "ACTIVE", basePrice: "19200", attributes: { ac: true, smokingAllowed: false, attachedBath: true, wifi: true } }
      ]
    }
  ]
};

const residentsSeed = [
  { fullName: "Arjun Mehta", gender: "MALE", contact: "+91-9876500001", email: "arjun.mehta@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1234", status: "ACTIVE" },
  { fullName: "Vikram Singh", gender: "MALE", contact: "+91-9876500002", email: "vikram.singh@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1235", status: "ACTIVE" },
  { fullName: "Nikhil Patil", gender: "MALE", contact: "+91-9876500003", email: "nikhil.patil@seed.local", idProofType: "DRIVING_LICENSE", idProofNumber: "KA01-2024-0001", status: "ACTIVE" },
  { fullName: "Karan Joshi", gender: "MALE", contact: "+91-9876500004", email: "karan.joshi@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1236", status: "ACTIVE" },
  { fullName: "Aditya Kulkarni", gender: "MALE", contact: "+91-9876500005", email: "aditya.kulkarni@seed.local", idProofType: "PASSPORT", idProofNumber: "N1234567", status: "ACTIVE" },
  { fullName: "Priya Nair", gender: "FEMALE", contact: "+91-9876500006", email: "priya.nair@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1237", status: "ACTIVE" },
  { fullName: "Ananya Rao", gender: "FEMALE", contact: "+91-9876500007", email: "ananya.rao@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1238", status: "ACTIVE" },
  { fullName: "Sneha Verma", gender: "FEMALE", contact: "+91-9876500008", email: "sneha.verma@seed.local", idProofType: "DRIVING_LICENSE", idProofNumber: "KA05-2023-4422", status: "ACTIVE" },
  { fullName: "Riya Shah", gender: "FEMALE", contact: "+91-9876500009", email: "riya.shah@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1239", status: "ACTIVE" },
  { fullName: "Meera Iyer", gender: "FEMALE", contact: "+91-9876500010", email: "meera.iyer@seed.local", idProofType: "PASSPORT", idProofNumber: "P4455121", status: "ACTIVE" },
  { fullName: "Rohan Gupta", gender: "MALE", contact: "+91-9876500011", email: "rohan.gupta@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1240", status: "ACTIVE" },
  { fullName: "Pooja Kulkarni", gender: "FEMALE", contact: "+91-9876500012", email: "pooja.kulkarni@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1241", status: "ACTIVE" },
  { fullName: "Sanjay Reddy", gender: "MALE", contact: "+91-9876500013", email: "sanjay.reddy@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1242", status: "ACTIVE" },
  { fullName: "Kavya Menon", gender: "FEMALE", contact: "+91-9876500014", email: "kavya.menon@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1243", status: "PENDING" },
  { fullName: "Farhan Khan", gender: "MALE", contact: "+91-9876500015", email: "farhan.khan@seed.local", idProofType: "PASSPORT", idProofNumber: "L7788123", status: "PENDING" },
  { fullName: "Rahul Das", gender: "MALE", contact: "+91-9876500016", email: "rahul.das@seed.local", idProofType: "AADHAR", idProofNumber: "3928-1111-1244", status: "VACATED" }
];

const activeAllocationsSeed = [
  { residentEmail: "arjun.mehta@seed.local", bedCode: "1-101-A", startDate: "2026-01-05" },
  { residentEmail: "vikram.singh@seed.local", bedCode: "1-101-B", startDate: "2026-01-10" },
  { residentEmail: "nikhil.patil@seed.local", bedCode: "1-102-A", startDate: "2026-01-08" },
  { residentEmail: "karan.joshi@seed.local", bedCode: "1-102-B", startDate: "2026-01-11" },
  { residentEmail: "aditya.kulkarni@seed.local", bedCode: "2-201-A", startDate: "2026-01-03" },
  { residentEmail: "priya.nair@seed.local", bedCode: "1-B101-A", startDate: "2026-01-04" },
  { residentEmail: "rohan.gupta@seed.local", bedCode: "1-C101-A", startDate: "2026-01-02" },
  { residentEmail: "sanjay.reddy@seed.local", bedCode: "1-103-A", startDate: "2026-01-18" }
];

const historicalAllocationsSeed = [
  { residentEmail: "rahul.das@seed.local", bedCode: "2-202-A", startDate: "2025-08-01", endDate: "2025-12-31", status: "VACATED", notes: "Moved out after semester completion" }
];

const invoicesSeed = [
  { label: "ARJUN-FEB-2026", residentEmail: "arjun.mehta@seed.local", totalAmount: "13500", dueDate: "2026-02-10", status: "PAID" },
  { label: "VIKRAM-FEB-2026", residentEmail: "vikram.singh@seed.local", totalAmount: "13500", dueDate: "2026-02-10", status: "PARTIALLY_PAID" },
  { label: "NIKHIL-FEB-2026", residentEmail: "nikhil.patil@seed.local", totalAmount: "9800", dueDate: "2026-02-10", status: "OVERDUE" },
  { label: "KARAN-FEB-2026", residentEmail: "karan.joshi@seed.local", totalAmount: "9800", dueDate: "2026-03-05", status: "ISSUED" },
  { label: "ADITYA-FEB-2026", residentEmail: "aditya.kulkarni@seed.local", totalAmount: "14200", dueDate: "2026-02-10", status: "PAID" },
  { label: "PRIYA-FEB-2026", residentEmail: "priya.nair@seed.local", totalAmount: "13800", dueDate: "2026-02-10", status: "PAID" },
  { label: "ROHAN-FEB-2026", residentEmail: "rohan.gupta@seed.local", totalAmount: "22500", dueDate: "2026-02-10", status: "PAID" },
  { label: "POOJA-FEB-2026", residentEmail: "pooja.kulkarni@seed.local", totalAmount: "16500", dueDate: "2026-02-10", status: "PAID" },
  { label: "SANJAY-FEB-2026", residentEmail: "sanjay.reddy@seed.local", totalAmount: "7600", dueDate: "2026-02-10", status: "PAID" }
];

const paymentsSeed = [
  { invoiceLabel: "ARJUN-FEB-2026", residentEmail: "arjun.mehta@seed.local", amount: "13500", method: "UPI", reference: "UPI-ARJUN-20260207", receivedAt: "2026-02-07" },
  { invoiceLabel: "VIKRAM-FEB-2026", residentEmail: "vikram.singh@seed.local", amount: "8000", method: "UPI", reference: "UPI-VIKRAM-20260209", receivedAt: "2026-02-09" },
  { invoiceLabel: "ADITYA-FEB-2026", residentEmail: "aditya.kulkarni@seed.local", amount: "14200", method: "CARD", reference: "CARD-ADITYA-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "PRIYA-FEB-2026", residentEmail: "priya.nair@seed.local", amount: "13800", method: "UPI", reference: "UPI-PRIYA-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "ROHAN-FEB-2026", residentEmail: "rohan.gupta@seed.local", amount: "22500", method: "BANK_TRANSFER", reference: "NEFT-ROHAN-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "POOJA-FEB-2026", residentEmail: "pooja.kulkarni@seed.local", amount: "16500", method: "UPI", reference: "UPI-POOJA-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "SANJAY-FEB-2026", residentEmail: "sanjay.reddy@seed.local", amount: "7600", method: "CASH", reference: "CASH-SANJAY-20260210", receivedAt: "2026-02-10" }
];

const complaintsSeed = [
  { title: "Leaking tap in Room 101", category: "WATER", description: "Bathroom tap has constant leakage.", status: "OPEN", residentEmail: "nikhil.patil@seed.local", roomCode: "1-101" },
  { title: "Wi-Fi unstable in Floor 1", category: "OTHER", description: "Frequent packet loss.", status: "IN_PROGRESS", residentEmail: "rohan.gupta@seed.local", roomCode: "1-C101" },
  { title: "Light flickering in Room B201", category: "ELECTRICITY", description: "Tube light flickering.", status: "OPEN", residentEmail: "priya.nair@seed.local", roomCode: "2-B201" }
];

const noticesSeed = [
  { title: "Monthly Water Tank Cleaning - 3 March", body: "Water supply unavailable.", audience: "ALL_RESIDENTS", status: "PUBLISHED", publishedAt: "2026-02-28T06:00:00.000Z" },
  { title: "Revised Hostel Entry Timings", body: "Weekday entry cutoff is 10:30 PM.", audience: "ALL", status: "PUBLISHED", publishedAt: "2026-02-20T12:00:00.000Z" }
];

const electricityMetersSeed = [
  { roomCode: "1-101", meterNumber: "101-MTR-1", installationDate: "2026-01-01" },
  { roomCode: "1-102", meterNumber: "102-MTR-1", installationDate: "2026-01-01" },
  { roomCode: "1-B101", meterNumber: "B101-MTR-1", installationDate: "2026-01-01" }
];

const meterReadingsSeed = [
  {
    roomCode: "1-101",
    readings: [
      { readingDate: "2026-02-01", previousReading: null, currentReading: "1200", unitsConsumed: null, status: "VALID", notes: "Baseline" },
      { readingDate: "2026-03-01", previousReading: "1200", currentReading: "1280", unitsConsumed: "80", status: "VALID", notes: "Feb usage" }
    ]
  },
  {
    roomCode: "1-102",
    readings: [
      { readingDate: "2026-02-01", previousReading: null, currentReading: "980", unitsConsumed: null, status: "VALID", notes: "Baseline" },
      { readingDate: "2026-03-01", previousReading: "980", currentReading: "1040", unitsConsumed: "60", status: "VALID", notes: "Feb usage" }
    ]
  }
];

const electricityBillsSeed = [
  {
    roomCode: "1-101",
    billingPeriodStart: "2026-02-01",
    billingPeriodEnd: "2026-02-28",
    unitsConsumed: "80",
    unitRate: "9.25",
    totalAmount: "740",
    status: "FINALIZED",
    splitMode: "EQUAL",
    shares: [
      { residentEmail: "arjun.mehta@seed.local", stayDays: 28, amount: "370" },
      { residentEmail: "vikram.singh@seed.local", stayDays: 28, amount: "370" }
    ]
  }
];

function toDate(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

async function resetDatabase() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.electricityBill.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.electricityMeter.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.adminUser.deleteMany();
}

async function upsertInvoice(data) {
  const existing = await prisma.invoice.findFirst({
    where: {
      residentId: data.residentId,
      allocationId: data.allocationId ?? null,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.invoice.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.invoice.create({ data });
}

async function ensureDemoDataset() {
  if (SHOULD_RESET) {
    await resetDatabase();
  }

  const superAdmin = await prisma.adminUser.upsert({
    where: { email: "admin@seed.local" },
    update: { name: "Super Administrator", username: "admin", passwordHash: "seed-hash-admin", role: "SUPER_ADMIN", status: "ACTIVE" },
    create: { name: "Super Administrator", username: "admin", email: "admin@seed.local", passwordHash: "seed-hash-admin", role: "SUPER_ADMIN", status: "ACTIVE" }
  });

  const owner1 = await prisma.adminUser.upsert({
    where: { email: "owner1@seed.local" },
    update: { name: "Hostel Owner 1", username: "owner1", passwordHash: "seed-hash-owner1", role: "OWNER", status: "ACTIVE" },
    create: { name: "Hostel Owner 1", username: "owner1", email: "owner1@seed.local", passwordHash: "seed-hash-owner1", role: "OWNER", status: "ACTIVE" }
  });

  const owner2 = await prisma.adminUser.upsert({
    where: { email: "owner2@seed.local" },
    update: { name: "Hostel Owner 2", username: "owner2", passwordHash: "seed-hash-owner2", role: "OWNER", status: "ACTIVE" },
    create: { name: "Hostel Owner 2", username: "owner2", email: "owner2@seed.local", passwordHash: "seed-hash-owner2", role: "OWNER", status: "ACTIVE" }
  });

  const hostel = await prisma.hostel.create({
    data: {
      name: hostelSeed.name,
      address: hostelSeed.address,
      contactNumber: hostelSeed.contactNumber,
      timezone: hostelSeed.timezone,
      status: hostelSeed.status,
      admins: {
        connect: [
          { id: owner1.id },
          { id: owner2.id }
        ]
      }
    }
  });

  const roomsByCode = new Map();
  const bedsByCode = new Map();
  const metersByRoomCode = new Map();

  for (const floorSeed of hostelSeed.floors) {
    const floor = await prisma.floor.create({
      data: { hostelId: hostel.id, floorNumber: floorSeed.floorNumber, label: floorSeed.label }
    });

    for (const roomSeed of floorSeed.rooms) {
      const room = await prisma.room.create({
        data: {
          floorId: floor.id,
          roomNumber: roomSeed.roomNumber,
          sharingType: roomSeed.sharingType,
          genderRestriction: roomSeed.genderRestriction,
          status: roomSeed.status,
          basePrice: roomSeed.basePrice,
          attributes: roomSeed.attributes
        }
      });

      const roomCode = `${floorSeed.floorNumber}-${roomSeed.roomNumber}`;
      roomsByCode.set(roomCode, room);

      const bedNumbers = ROOM_BEDS_BY_SHARING[roomSeed.sharingType] || [];
      for (const bedNumber of bedNumbers) {
        const defaultStatus = roomSeed.status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE";
        const status = roomSeed.bedStatusOverrides?.[bedNumber] || defaultStatus;
        const bed = await prisma.bed.create({
          data: { roomId: room.id, bedNumber, status }
        });

        const bedCode = `${roomCode}-${bedNumber}`;
        bedsByCode.set(bedCode, bed);
      }
    }
  }

  for (const meterSeed of electricityMetersSeed) {
    const room = roomsByCode.get(meterSeed.roomCode);
    if (!room) throw new Error(`Room not found for meter: ${meterSeed.roomCode}`);

    const meter = await prisma.electricityMeter.create({
      data: {
        id: randomUUID(),
        roomId: room.id,
        meterNumber: meterSeed.meterNumber,
        installationDate: toDate(meterSeed.installationDate),
        isActive: true
      }
    });
    metersByRoomCode.set(meterSeed.roomCode, meter);
  }

  for (const readingSeed of meterReadingsSeed) {
    const meter = metersByRoomCode.get(readingSeed.roomCode);
    if (!meter) throw new Error(`Meter not found for reading: ${readingSeed.roomCode}`);

    for (const reading of readingSeed.readings) {
      await prisma.meterReading.create({
        data: {
          id: randomUUID(),
          meterId: meter.id,
          readingDate: toDate(reading.readingDate),
          previousReading: reading.previousReading ?? reading.currentReading,
          currentReading: reading.currentReading,
          unitsConsumed: reading.unitsConsumed ?? "0",
          status: reading.status,
          createdBy: owner1.id,
          notes: reading.notes
        }
      });
    }
  }

  const residentsByEmail = new Map();
  for (const residentSeed of residentsSeed) {
    const resident = await prisma.resident.upsert({
      where: { email: residentSeed.email },
      update: residentSeed,
      create: residentSeed
    });
    residentsByEmail.set(residentSeed.email, resident);
  }

  const activeAllocationByResidentEmail = new Map();
  for (const allocationSeed of activeAllocationsSeed) {
    const resident = residentsByEmail.get(allocationSeed.residentEmail);
    const bed = bedsByCode.get(allocationSeed.bedCode);
    if (!resident || !bed) throw new Error(`Mapping failed for active allocation: ${allocationSeed.residentEmail}`);

    const startDate = toDate(allocationSeed.startDate);
    const allocation = await prisma.allocation.create({
      data: {
        residentId: resident.id,
        bedId: bed.id,
        startDate,
        status: "ACTIVE",
        notes: "Active allocation",
        createdById: owner1.id
      }
    });
    activeAllocationByResidentEmail.set(allocationSeed.residentEmail, allocation);
    await prisma.bed.update({ where: { id: bed.id }, data: { status: "OCCUPIED" } });
  }

  const invoicesByLabel = new Map();
  for (const invoiceSeed of invoicesSeed) {
    const resident = residentsByEmail.get(invoiceSeed.residentEmail);
    if (!resident) throw new Error(`Resident not found for invoice: ${invoiceSeed.label}`);

    const allocationId = activeAllocationByResidentEmail.get(invoiceSeed.residentEmail)?.id || null;
    const invoice = await upsertInvoice({
      residentId: resident.id,
      allocationId,
      periodStart: toDate("2026-02-01"),
      periodEnd: toDate("2026-02-28"),
      totalAmount: invoiceSeed.totalAmount,
      dueDate: toDate(invoiceSeed.dueDate),
      status: invoiceSeed.status
    });
    invoicesByLabel.set(invoiceSeed.label, invoice);
  }

  for (const paymentSeed of paymentsSeed) {
    const resident = residentsByEmail.get(paymentSeed.residentEmail);
    const invoice = invoicesByLabel.get(paymentSeed.invoiceLabel);
    if (!resident || !invoice) throw new Error(`Mapping failed for payment: ${paymentSeed.reference}`);

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        residentId: resident.id,
        amount: paymentSeed.amount,
        method: paymentSeed.method,
        status: "COMPLETED",
        reference: paymentSeed.reference,
        receivedAt: toDate(paymentSeed.receivedAt),
        receivedById: owner1.id,
        notes: "Rent collection"
      }
    });
  }

  for (const billSeed of electricityBillsSeed) {
    const room = roomsByCode.get(billSeed.roomCode);
    if (!room) throw new Error(`Room not found for bill: ${billSeed.roomCode}`);

    const billId = randomUUID();
    await prisma.electricityBill.create({
      data: {
        id: billId,
        roomId: room.id,
        billingPeriodStart: toDate(billSeed.billingPeriodStart),
        billingPeriodEnd: toDate(billSeed.billingPeriodEnd),
        unitsConsumed: billSeed.unitsConsumed,
        unitRate: billSeed.unitRate,
        totalAmount: billSeed.totalAmount,
        status: billSeed.status
      }
    });

    for (const shareSeed of billSeed.shares) {
      const resident = residentsByEmail.get(shareSeed.residentEmail);
      if (!resident) continue;
      const allocationId = activeAllocationByResidentEmail.get(shareSeed.residentEmail)?.id || null;
      await prisma.invoice.create({
        data: {
          residentId: resident.id,
          allocationId,
          periodStart: toDate(billSeed.billingPeriodStart),
          periodEnd: toDate(billSeed.billingPeriodEnd),
          totalAmount: shareSeed.amount,
          dueDate: toDate(billSeed.billingPeriodEnd),
          status: "ISSUED",
          roomId: room.id,
          sourceBillId: billId,
          type: "ELECTRICITY"
        }
      });
    }
  }

  for (const complaintSeed of complaintsSeed) {
    const resident = residentsByEmail.get(complaintSeed.residentEmail);
    const room = roomsByCode.get(complaintSeed.roomCode);
    if (!resident) continue;
    await prisma.complaint.create({
      data: {
        residentId: resident.id,
        hostelId: hostel.id,
        roomId: room?.id || null,
        category: complaintSeed.category,
        title: complaintSeed.title,
        description: complaintSeed.description,
        status: complaintSeed.status
      }
    });
  }

  return { hostel: hostel.name, rooms: await prisma.room.count(), residents: await prisma.resident.count() };
}

ensureDemoDataset()
  .then((res) => console.log("Seeded:", res))
  .catch((err) => { console.error("Failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
