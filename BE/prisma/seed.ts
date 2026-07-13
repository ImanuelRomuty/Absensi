import "dotenv/config";
import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/crypto.js";

async function upsertEmployee(data: {
  name: string;
  employeeCode: string;
  department?: string;
  managerId?: string | null;
  locationIds?: string[];
}) {
  return prisma.employee.upsert({
    where: { employeeCode: data.employeeCode },
    update: {
      name: data.name,
      department: data.department,
      managerId: data.managerId ?? null,
      isActive: true,
    },
    create: {
      name: data.name,
      employeeCode: data.employeeCode,
      department: data.department,
      managerId: data.managerId ?? null,
      locations: data.locationIds?.length
        ? { create: data.locationIds.map((locationId) => ({ locationId })) }
        : undefined,
    },
  });
}

async function upsertUser(data: {
  email: string;
  password: string;
  role: Role;
  employeeId: string;
}) {
  const passwordHash = await hashPassword(data.password);
  return prisma.user.upsert({
    where: { email: data.email.toLowerCase() },
    update: {
      passwordHash,
      role: data.role,
      employeeId: data.employeeId,
      isActive: true,
    },
    create: {
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      employeeId: data.employeeId,
    },
  });
}

async function main() {
  let office = await prisma.location.findFirst({
    where: { name: "Kantor Pusat Jakarta" },
  });
  if (!office) {
    office = await prisma.location.create({
      data: {
        name: "Kantor Pusat Jakarta",
        latitude: -6.2088,
        longitude: 106.8456,
        radiusMeters: 150,
        isActive: true,
      },
    });
  } else {
    office = await prisma.location.update({
      where: { id: office.id },
      data: {
        latitude: -6.2088,
        longitude: 106.8456,
        radiusMeters: 150,
        isActive: true,
      },
    });
  }

  const superAdminEmp = await upsertEmployee({
    name: "Super Admin",
    employeeCode: "SA001",
    department: "IT",
    locationIds: [office.id],
  });
  const hrEmp = await upsertEmployee({
    name: "HR Admin",
    employeeCode: "HR001",
    department: "HR",
    locationIds: [office.id],
  });
  const managerEmp = await upsertEmployee({
    name: "Budi Manager",
    employeeCode: "MG001",
    department: "Operations",
    locationIds: [office.id],
  });
  const emp1 = await upsertEmployee({
    name: "Ani Karyawan",
    employeeCode: "EMP001",
    department: "Operations",
    managerId: managerEmp.id,
    locationIds: [office.id],
  });
  const emp2 = await upsertEmployee({
    name: "Citra Karyawan",
    employeeCode: "EMP002",
    department: "Operations",
    managerId: managerEmp.id,
    locationIds: [office.id],
  });

  // Ensure location links for upserted employees without recreate
  for (const employeeId of [
    superAdminEmp.id,
    hrEmp.id,
    managerEmp.id,
    emp1.id,
    emp2.id,
  ]) {
    await prisma.employeeLocation.upsert({
      where: {
        employeeId_locationId: { employeeId, locationId: office.id },
      },
      update: {},
      create: { employeeId, locationId: office.id },
    });
  }

  await upsertUser({
    email: "superadmin@masarif.local",
    password: "Password123!",
    role: Role.SUPER_ADMIN,
    employeeId: superAdminEmp.id,
  });
  await upsertUser({
    email: "hr@masarif.local",
    password: "Password123!",
    role: Role.HR_ADMIN,
    employeeId: hrEmp.id,
  });
  await upsertUser({
    email: "manager@masarif.local",
    password: "Password123!",
    role: Role.MANAGER,
    employeeId: managerEmp.id,
  });
  await upsertUser({
    email: "ani@masarif.local",
    password: "Password123!",
    role: Role.EMPLOYEE,
    employeeId: emp1.id,
  });
  await upsertUser({
    email: "citra@masarif.local",
    password: "Password123!",
    role: Role.EMPLOYEE,
    employeeId: emp2.id,
  });

  const leaveTypes = [
    { code: "ANNUAL", name: "Cuti Tahunan", paid: true, defaultDaysYear: 12 },
    { code: "SICK", name: "Cuti Sakit", paid: true, defaultDaysYear: 12 },
    { code: "UNPAID", name: "Cuti Tidak Dibayar", paid: false, defaultDaysYear: 5 },
  ] as const;

  const year = new Date().getUTCFullYear();
  const seededTypes = [];
  for (const lt of leaveTypes) {
    const row = await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: {
        name: lt.name,
        paid: lt.paid,
        defaultDaysYear: lt.defaultDaysYear,
        isActive: true,
      },
      create: {
        code: lt.code,
        name: lt.name,
        paid: lt.paid,
        defaultDaysYear: lt.defaultDaysYear,
        isActive: true,
      },
    });
    seededTypes.push(row);
  }

  for (const employeeId of [emp1.id, emp2.id, managerEmp.id, hrEmp.id]) {
    for (const lt of seededTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: lt.id,
            year,
          },
        },
        update: {
          entitledDays: lt.defaultDaysYear,
        },
        create: {
          employeeId,
          leaveTypeId: lt.id,
          year,
          entitledDays: lt.defaultDaysYear,
          usedDays: 0,
          remainingDays: lt.defaultDaysYear,
        },
      });
    }
  }

  console.log("Seed completed.");
  console.log("Accounts (password: Password123!):");
  console.log("- superadmin@masarif.local (SUPER_ADMIN)");
  console.log("- hr@masarif.local (HR_ADMIN)");
  console.log("- manager@masarif.local (MANAGER)");
  console.log("- ani@masarif.local (EMPLOYEE)");
  console.log("- citra@masarif.local (EMPLOYEE)");
  console.log(`Leave types seeded for year ${year}: ANNUAL, SICK, UNPAID`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
