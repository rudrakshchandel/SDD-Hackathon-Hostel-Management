/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

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
  blocks: [
    {
      name: "A",
      description: "Boys Block",
      floors: [
        {
          floorNumber: 1,
          label: "First Floor",
          rooms: [
            {
              roomNumber: "101",
              sharingType: "DOUBLE",
              genderRestriction: "MALE_ONLY",
              status: "ACTIVE",
              basePrice: "13500",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "102",
              sharingType: "TRIPLE",
              genderRestriction: "MALE_ONLY",
              status: "ACTIVE",
              basePrice: "9800",
              attributes: {
                ac: false,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "103",
              sharingType: "DORMITORY",
              genderRestriction: "MALE_ONLY",
              status: "ACTIVE",
              basePrice: "7600",
              attributes: {
                ac: false,
                smokingAllowed: false,
                attachedBath: false,
                wifi: true
              },
              bedStatusOverrides: {
                F: "RESERVED"
              }
            }
          ]
        },
        {
          floorNumber: 2,
          label: "Second Floor",
          rooms: [
            {
              roomNumber: "201",
              sharingType: "DOUBLE",
              genderRestriction: "MALE_ONLY",
              status: "ACTIVE",
              basePrice: "14200",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "202",
              sharingType: "SINGLE",
              genderRestriction: "MALE_ONLY",
              status: "ACTIVE",
              basePrice: "18500",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "203",
              sharingType: "TRIPLE",
              genderRestriction: "MALE_ONLY",
              status: "ACTIVE",
              basePrice: "10200",
              attributes: {
                ac: false,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            }
          ]
        }
      ]
    },
    {
      name: "B",
      description: "Girls Block",
      floors: [
        {
          floorNumber: 1,
          label: "First Floor",
          rooms: [
            {
              roomNumber: "101",
              sharingType: "DOUBLE",
              genderRestriction: "FEMALE_ONLY",
              status: "ACTIVE",
              basePrice: "13800",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "102",
              sharingType: "TRIPLE",
              genderRestriction: "FEMALE_ONLY",
              status: "ACTIVE",
              basePrice: "9600",
              attributes: {
                ac: false,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "103",
              sharingType: "DOUBLE",
              genderRestriction: "FEMALE_ONLY",
              status: "ACTIVE",
              basePrice: "10800",
              attributes: {
                ac: false,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            }
          ]
        },
        {
          floorNumber: 2,
          label: "Second Floor",
          rooms: [
            {
              roomNumber: "201",
              sharingType: "SINGLE",
              genderRestriction: "FEMALE_ONLY",
              status: "ACTIVE",
              basePrice: "19200",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "202",
              sharingType: "TRIPLE",
              genderRestriction: "FEMALE_ONLY",
              status: "ACTIVE",
              basePrice: "11800",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "203",
              sharingType: "DOUBLE",
              genderRestriction: "FEMALE_ONLY",
              status: "MAINTENANCE",
              basePrice: "12500",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            }
          ]
        }
      ]
    },
    {
      name: "C",
      description: "Working Professionals Wing",
      floors: [
        {
          floorNumber: 1,
          label: "First Floor",
          rooms: [
            {
              roomNumber: "101",
              sharingType: "SINGLE",
              genderRestriction: "ANY",
              status: "ACTIVE",
              basePrice: "22500",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "102",
              sharingType: "DOUBLE",
              genderRestriction: "ANY",
              status: "ACTIVE",
              basePrice: "16500",
              attributes: {
                ac: true,
                smokingAllowed: false,
                attachedBath: true,
                wifi: true
              }
            },
            {
              roomNumber: "103",
              sharingType: "DOUBLE",
              genderRestriction: "ANY",
              status: "ACTIVE",
              basePrice: "12900",
              attributes: {
                ac: false,
                smokingAllowed: true,
                attachedBath: true,
                wifi: true
              },
              bedStatusOverrides: {
                B: "MAINTENANCE"
              }
            }
          ]
        }
      ]
    }
  ]
};

const residentsSeed = [
  {
    fullName: "Arjun Mehta",
    gender: "MALE",
    contact: "+91-9876500001",
    email: "arjun.mehta@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1234",
    status: "ACTIVE"
  },
  {
    fullName: "Vikram Singh",
    gender: "MALE",
    contact: "+91-9876500002",
    email: "vikram.singh@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1235",
    status: "ACTIVE"
  },
  {
    fullName: "Nikhil Patil",
    gender: "MALE",
    contact: "+91-9876500003",
    email: "nikhil.patil@seed.local",
    idProofType: "DRIVING_LICENSE",
    idProofNumber: "KA01-2024-0001",
    status: "ACTIVE"
  },
  {
    fullName: "Karan Joshi",
    gender: "MALE",
    contact: "+91-9876500004",
    email: "karan.joshi@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1236",
    status: "ACTIVE"
  },
  {
    fullName: "Aditya Kulkarni",
    gender: "MALE",
    contact: "+91-9876500005",
    email: "aditya.kulkarni@seed.local",
    idProofType: "PASSPORT",
    idProofNumber: "N1234567",
    status: "ACTIVE"
  },
  {
    fullName: "Priya Nair",
    gender: "FEMALE",
    contact: "+91-9876500006",
    email: "priya.nair@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1237",
    status: "ACTIVE"
  },
  {
    fullName: "Ananya Rao",
    gender: "FEMALE",
    contact: "+91-9876500007",
    email: "ananya.rao@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1238",
    status: "ACTIVE"
  },
  {
    fullName: "Sneha Verma",
    gender: "FEMALE",
    contact: "+91-9876500008",
    email: "sneha.verma@seed.local",
    idProofType: "DRIVING_LICENSE",
    idProofNumber: "KA05-2023-4422",
    status: "ACTIVE"
  },
  {
    fullName: "Riya Shah",
    gender: "FEMALE",
    contact: "+91-9876500009",
    email: "riya.shah@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1239",
    status: "ACTIVE"
  },
  {
    fullName: "Meera Iyer",
    gender: "FEMALE",
    contact: "+91-9876500010",
    email: "meera.iyer@seed.local",
    idProofType: "PASSPORT",
    idProofNumber: "P4455121",
    status: "ACTIVE"
  },
  {
    fullName: "Rohan Gupta",
    gender: "MALE",
    contact: "+91-9876500011",
    email: "rohan.gupta@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1240",
    status: "ACTIVE"
  },
  {
    fullName: "Pooja Kulkarni",
    gender: "FEMALE",
    contact: "+91-9876500012",
    email: "pooja.kulkarni@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1241",
    status: "ACTIVE"
  },
  {
    fullName: "Sanjay Reddy",
    gender: "MALE",
    contact: "+91-9876500013",
    email: "sanjay.reddy@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1242",
    status: "ACTIVE"
  },
  {
    fullName: "Kavya Menon",
    gender: "FEMALE",
    contact: "+91-9876500014",
    email: "kavya.menon@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1243",
    status: "PENDING"
  },
  {
    fullName: "Farhan Khan",
    gender: "MALE",
    contact: "+91-9876500015",
    email: "farhan.khan@seed.local",
    idProofType: "PASSPORT",
    idProofNumber: "L7788123",
    status: "PENDING"
  },
  {
    fullName: "Rahul Das",
    gender: "MALE",
    contact: "+91-9876500016",
    email: "rahul.das@seed.local",
    idProofType: "AADHAR",
    idProofNumber: "3928-1111-1244",
    status: "VACATED"
  }
];

const activeAllocationsSeed = [
  { residentEmail: "arjun.mehta@seed.local", bedCode: "A-1-101-A", startDate: "2026-01-05" },
  { residentEmail: "vikram.singh@seed.local", bedCode: "A-1-101-B", startDate: "2026-01-10" },
  { residentEmail: "nikhil.patil@seed.local", bedCode: "A-1-102-A", startDate: "2026-01-08" },
  { residentEmail: "karan.joshi@seed.local", bedCode: "A-1-102-B", startDate: "2026-01-11" },
  { residentEmail: "aditya.kulkarni@seed.local", bedCode: "A-2-201-A", startDate: "2026-01-03" },
  { residentEmail: "priya.nair@seed.local", bedCode: "B-1-101-A", startDate: "2026-01-04" },
  { residentEmail: "ananya.rao@seed.local", bedCode: "B-1-101-B", startDate: "2026-01-09" },
  { residentEmail: "sneha.verma@seed.local", bedCode: "B-1-102-A", startDate: "2026-01-06" },
  { residentEmail: "riya.shah@seed.local", bedCode: "B-1-102-B", startDate: "2026-01-07" },
  { residentEmail: "meera.iyer@seed.local", bedCode: "B-2-201-A", startDate: "2026-01-12" },
  { residentEmail: "rohan.gupta@seed.local", bedCode: "C-1-101-A", startDate: "2026-01-02" },
  { residentEmail: "pooja.kulkarni@seed.local", bedCode: "C-1-102-A", startDate: "2026-01-15" },
  { residentEmail: "sanjay.reddy@seed.local", bedCode: "A-1-103-A", startDate: "2026-01-18" }
];

const historicalAllocationsSeed = [
  {
    residentEmail: "rahul.das@seed.local",
    bedCode: "A-2-202-A",
    startDate: "2025-08-01",
    endDate: "2025-12-31",
    status: "VACATED",
    notes: "Moved out after semester completion"
  },
  {
    residentEmail: "pooja.kulkarni@seed.local",
    bedCode: "B-1-103-A",
    startDate: "2025-10-01",
    endDate: "2026-01-31",
    status: "TRANSFERRED",
    notes: "Transferred to professional wing"
  }
];

const invoicesSeed = [
  { label: "ARJUN-FEB-2026", residentEmail: "arjun.mehta@seed.local", totalAmount: "13500", dueDate: "2026-02-10", status: "PAID" },
  { label: "VIKRAM-FEB-2026", residentEmail: "vikram.singh@seed.local", totalAmount: "13500", dueDate: "2026-02-10", status: "PARTIALLY_PAID" },
  { label: "NIKHIL-FEB-2026", residentEmail: "nikhil.patil@seed.local", totalAmount: "9800", dueDate: "2026-02-10", status: "OVERDUE" },
  { label: "KARAN-FEB-2026", residentEmail: "karan.joshi@seed.local", totalAmount: "9800", dueDate: "2026-03-05", status: "ISSUED" },
  { label: "ADITYA-FEB-2026", residentEmail: "aditya.kulkarni@seed.local", totalAmount: "14200", dueDate: "2026-02-10", status: "PAID" },
  { label: "PRIYA-FEB-2026", residentEmail: "priya.nair@seed.local", totalAmount: "13800", dueDate: "2026-02-10", status: "PAID" },
  { label: "ANANYA-FEB-2026", residentEmail: "ananya.rao@seed.local", totalAmount: "13800", dueDate: "2026-02-10", status: "PARTIALLY_PAID" },
  { label: "SNEHA-FEB-2026", residentEmail: "sneha.verma@seed.local", totalAmount: "9600", dueDate: "2026-02-10", status: "OVERDUE" },
  { label: "RIYA-FEB-2026", residentEmail: "riya.shah@seed.local", totalAmount: "9600", dueDate: "2026-02-10", status: "PAID" },
  { label: "MEERA-FEB-2026", residentEmail: "meera.iyer@seed.local", totalAmount: "19200", dueDate: "2026-03-06", status: "ISSUED" },
  { label: "ROHAN-FEB-2026", residentEmail: "rohan.gupta@seed.local", totalAmount: "22500", dueDate: "2026-02-10", status: "PAID" },
  { label: "POOJA-FEB-2026", residentEmail: "pooja.kulkarni@seed.local", totalAmount: "16500", dueDate: "2026-02-10", status: "PAID" },
  { label: "SANJAY-FEB-2026", residentEmail: "sanjay.reddy@seed.local", totalAmount: "7600", dueDate: "2026-02-10", status: "PAID" },
  { label: "KAVYA-FEB-2026", residentEmail: "kavya.menon@seed.local", totalAmount: "11800", dueDate: "2026-03-10", status: "DRAFT", includeAllocation: false }
];

const paymentsSeed = [
  { invoiceLabel: "ARJUN-FEB-2026", residentEmail: "arjun.mehta@seed.local", amount: "13500", method: "UPI", reference: "UPI-ARJUN-20260207", receivedAt: "2026-02-07" },
  { invoiceLabel: "VIKRAM-FEB-2026", residentEmail: "vikram.singh@seed.local", amount: "8000", method: "UPI", reference: "UPI-VIKRAM-20260209", receivedAt: "2026-02-09" },
  { invoiceLabel: "ADITYA-FEB-2026", residentEmail: "aditya.kulkarni@seed.local", amount: "14200", method: "CARD", reference: "CARD-ADITYA-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "PRIYA-FEB-2026", residentEmail: "priya.nair@seed.local", amount: "13800", method: "UPI", reference: "UPI-PRIYA-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "ANANYA-FEB-2026", residentEmail: "ananya.rao@seed.local", amount: "10000", method: "BANK_TRANSFER", reference: "NEFT-ANANYA-20260209", receivedAt: "2026-02-09" },
  { invoiceLabel: "RIYA-FEB-2026", residentEmail: "riya.shah@seed.local", amount: "9600", method: "UPI", reference: "UPI-RIYA-20260207", receivedAt: "2026-02-07" },
  { invoiceLabel: "ROHAN-FEB-2026", residentEmail: "rohan.gupta@seed.local", amount: "22500", method: "BANK_TRANSFER", reference: "NEFT-ROHAN-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "POOJA-FEB-2026", residentEmail: "pooja.kulkarni@seed.local", amount: "16500", method: "UPI", reference: "UPI-POOJA-20260208", receivedAt: "2026-02-08" },
  { invoiceLabel: "SANJAY-FEB-2026", residentEmail: "sanjay.reddy@seed.local", amount: "7600", method: "CASH", reference: "CASH-SANJAY-20260210", receivedAt: "2026-02-10" }
];

const complaintsSeed = [
  {
    title: "Leaking tap in Room A-102",
    category: "WATER",
    description: "Bathroom tap has constant leakage and needs replacement.",
    status: "OPEN",
    residentEmail: "nikhil.patil@seed.local",
    roomCode: "A-1-102"
  },
  {
    title: "Wi-Fi unstable in Block C",
    category: "OTHER",
    description: "Frequent packet loss during working hours on C floor 1.",
    status: "IN_PROGRESS",
    residentEmail: "rohan.gupta@seed.local",
    roomCode: "C-1-101"
  },
  {
    title: "Light flickering in corridor B2",
    category: "ELECTRICITY",
    description: "Two tube lights near Room B-201 are flickering continuously.",
    status: "OPEN",
    residentEmail: "meera.iyer@seed.local",
    roomCode: "B-2-201"
  },
  {
    title: "Housekeeping delay in Room B-102",
    category: "CLEANLINESS",
    description: "Requested cleaning was delayed for two consecutive days.",
    status: "CLOSED",
    residentEmail: "riya.shah@seed.local",
    roomCode: "B-1-102",
    resolutionNotes: "Schedule corrected and housekeeping checklist updated.",
    closedAt: "2026-02-15"
  }
];

const noticesSeed = [
  {
    title: "Monthly Water Tank Cleaning - 3 March",
    body: "Water supply will be unavailable from 10:00 AM to 1:00 PM on 3 March for scheduled tank cleaning.",
    audience: "ALL_RESIDENTS",
    status: "PUBLISHED",
    publishedAt: "2026-02-28T06:00:00.000Z"
  },
  {
    title: "Revised Hostel Entry Timings",
    body: "Weekday entry cutoff is 10:30 PM. Weekend cutoff is 11:30 PM. Late entry requires warden approval.",
    audience: "ALL",
    status: "PUBLISHED",
    publishedAt: "2026-02-20T12:00:00.000Z"
  },
  {
    title: "Quarterly Fire Drill Notice",
    body: "Mandatory fire drill is planned next week. Exact timing will be announced 24 hours in advance.",
    audience: "ALL",
    status: "DRAFT"
  }
];

function toDate(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

async function resetDatabase() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.block.deleteMany();
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

  const warden = await prisma.adminUser.upsert({
    where: { email: "warden@seed.local" },
    update: {
      name: "Hostel Warden",
      username: "warden",
      passwordHash: "seed-hash-warden",
      status: "ACTIVE"
    },
    create: {
      name: "Hostel Warden",
      username: "warden",
      email: "warden@seed.local",
      passwordHash: "seed-hash-warden",
      status: "ACTIVE"
    }
  });

  const accountant = await prisma.adminUser.upsert({
    where: { email: "accounts@seed.local" },
    update: {
      name: "Accounts Admin",
      username: "accounts",
      passwordHash: "seed-hash-accounts",
      status: "ACTIVE"
    },
    create: {
      name: "Accounts Admin",
      username: "accounts",
      email: "accounts@seed.local",
      passwordHash: "seed-hash-accounts",
      status: "ACTIVE"
    }
  });

  const hostel = await prisma.hostel.create({
    data: {
      name: hostelSeed.name,
      address: hostelSeed.address,
      contactNumber: hostelSeed.contactNumber,
      timezone: hostelSeed.timezone,
      status: hostelSeed.status
    }
  });

  const roomsByCode = new Map();
  const bedsByCode = new Map();

  for (const blockSeed of hostelSeed.blocks) {
    const block = await prisma.block.create({
      data: {
        hostelId: hostel.id,
        name: blockSeed.name,
        description: blockSeed.description
      }
    });

    for (const floorSeed of blockSeed.floors) {
      const floor = await prisma.floor.create({
        data: {
          blockId: block.id,
          floorNumber: floorSeed.floorNumber,
          label: floorSeed.label
        }
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

        const roomCode = `${blockSeed.name}-${floorSeed.floorNumber}-${roomSeed.roomNumber}`;
        roomsByCode.set(roomCode, room);

        const bedNumbers = ROOM_BEDS_BY_SHARING[roomSeed.sharingType] || [];
        for (const bedNumber of bedNumbers) {
          const defaultStatus = roomSeed.status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE";
          const status = roomSeed.bedStatusOverrides?.[bedNumber] || defaultStatus;
          const bed = await prisma.bed.create({
            data: {
              roomId: room.id,
              bedNumber,
              status
            }
          });

          const bedCode = `${roomCode}-${bedNumber}`;
          bedsByCode.set(bedCode, bed);
        }
      }
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

    if (!resident || !bed) {
      throw new Error(`Seed mapping failed for active allocation: ${allocationSeed.residentEmail}`);
    }

    const startDate = toDate(allocationSeed.startDate);
    const allocation = await prisma.allocation.upsert({
      where: {
        residentId_bedId_startDate: {
          residentId: resident.id,
          bedId: bed.id,
          startDate
        }
      },
      update: {
        status: "ACTIVE",
        endDate: null,
        notes: "Active resident allocation",
        createdById: warden.id
      },
      create: {
        residentId: resident.id,
        bedId: bed.id,
        startDate,
        status: "ACTIVE",
        notes: "Active resident allocation",
        createdById: warden.id
      }
    });

    activeAllocationByResidentEmail.set(allocationSeed.residentEmail, allocation);

    await prisma.bed.update({
      where: { id: bed.id },
      data: { status: "OCCUPIED" }
    });
  }

  for (const allocationSeed of historicalAllocationsSeed) {
    const resident = residentsByEmail.get(allocationSeed.residentEmail);
    const bed = bedsByCode.get(allocationSeed.bedCode);

    if (!resident || !bed) {
      throw new Error(`Seed mapping failed for historical allocation: ${allocationSeed.residentEmail}`);
    }

    const startDate = toDate(allocationSeed.startDate);
    const endDate = toDate(allocationSeed.endDate);

    await prisma.allocation.upsert({
      where: {
        residentId_bedId_startDate: {
          residentId: resident.id,
          bedId: bed.id,
          startDate
        }
      },
      update: {
        status: allocationSeed.status,
        endDate,
        notes: allocationSeed.notes,
        createdById: warden.id
      },
      create: {
        residentId: resident.id,
        bedId: bed.id,
        startDate,
        endDate,
        status: allocationSeed.status,
        notes: allocationSeed.notes,
        createdById: warden.id
      }
    });
  }

  const invoicesByLabel = new Map();
  const periodStart = toDate("2026-02-01");
  const periodEnd = toDate("2026-02-28");

  for (const invoiceSeed of invoicesSeed) {
    const resident = residentsByEmail.get(invoiceSeed.residentEmail);
    if (!resident) {
      throw new Error(`Resident not found for invoice: ${invoiceSeed.label}`);
    }

    const allocationId =
      invoiceSeed.includeAllocation === false
        ? null
        : activeAllocationByResidentEmail.get(invoiceSeed.residentEmail)?.id || null;

    const invoice = await upsertInvoice({
      residentId: resident.id,
      allocationId,
      periodStart,
      periodEnd,
      totalAmount: invoiceSeed.totalAmount,
      dueDate: toDate(invoiceSeed.dueDate),
      status: invoiceSeed.status
    });

    invoicesByLabel.set(invoiceSeed.label, invoice);
  }

  for (const paymentSeed of paymentsSeed) {
    const resident = residentsByEmail.get(paymentSeed.residentEmail);
    const invoice = invoicesByLabel.get(paymentSeed.invoiceLabel);

    if (!resident || !invoice) {
      throw new Error(`Payment mapping failed for reference: ${paymentSeed.reference}`);
    }

    await prisma.payment.upsert({
      where: {
        reference: paymentSeed.reference
      },
      update: {
        invoiceId: invoice.id,
        residentId: resident.id,
        amount: paymentSeed.amount,
        method: paymentSeed.method,
        status: "COMPLETED",
        receivedAt: toDate(paymentSeed.receivedAt),
        receivedById: accountant.id,
        notes: "Seeded INR rent collection"
      },
      create: {
        invoiceId: invoice.id,
        residentId: resident.id,
        amount: paymentSeed.amount,
        method: paymentSeed.method,
        status: "COMPLETED",
        reference: paymentSeed.reference,
        receivedAt: toDate(paymentSeed.receivedAt),
        receivedById: accountant.id,
        notes: "Seeded INR rent collection"
      }
    });
  }

  for (const complaintSeed of complaintsSeed) {
    const resident = residentsByEmail.get(complaintSeed.residentEmail);
    const room = complaintSeed.roomCode ? roomsByCode.get(complaintSeed.roomCode) : null;

    if (!resident) {
      throw new Error(`Resident not found for complaint: ${complaintSeed.title}`);
    }

    const existing = await prisma.complaint.findFirst({
      where: { title: complaintSeed.title },
      select: { id: true }
    });

    const complaintData = {
      residentId: resident.id,
      hostelId: hostel.id,
      roomId: room ? room.id : null,
      category: complaintSeed.category,
      title: complaintSeed.title,
      description: complaintSeed.description,
      status: complaintSeed.status,
      resolutionNotes: complaintSeed.resolutionNotes ?? null,
      closedAt: complaintSeed.closedAt ? new Date(`${complaintSeed.closedAt}T12:00:00.000Z`) : null,
      closedById: complaintSeed.status === "CLOSED" ? warden.id : null
    };

    if (existing) {
      await prisma.complaint.update({
        where: { id: existing.id },
        data: complaintData
      });
    } else {
      await prisma.complaint.create({ data: complaintData });
    }
  }

  for (const noticeSeed of noticesSeed) {
    const existing = await prisma.notice.findFirst({
      where: { title: noticeSeed.title },
      select: { id: true }
    });

    const noticeData = {
      title: noticeSeed.title,
      body: noticeSeed.body,
      audience: noticeSeed.audience,
      status: noticeSeed.status,
      publishedAt: noticeSeed.publishedAt ? new Date(noticeSeed.publishedAt) : null,
      hostelId: hostel.id,
      createdById: warden.id
    };

    if (existing) {
      await prisma.notice.update({
        where: { id: existing.id },
        data: noticeData
      });
    } else {
      await prisma.notice.create({ data: noticeData });
    }
  }

  const [roomsCount, bedsCount, residentsCount, activeResidents, activeAllocations, invoicesCount] =
    await Promise.all([
      prisma.room.count(),
      prisma.bed.count(),
      prisma.resident.count(),
      prisma.resident.count({ where: { status: "ACTIVE" } }),
      prisma.allocation.count({ where: { status: "ACTIVE" } }),
      prisma.invoice.count()
    ]);

  return {
    hostel: hostel.name,
    roomsCount,
    bedsCount,
    residentsCount,
    activeResidents,
    activeAllocations,
    invoicesCount,
    currency: "INR"
  };
}

async function main() {
  const summary = await ensureDemoDataset();
  console.log("Database seeded:", summary);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
