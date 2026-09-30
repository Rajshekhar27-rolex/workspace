import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed() {
  console.log('Clearing existing database records...');
  await prisma.activity.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.customerRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  console.log('Seeding Workspace A and User A...');
  const workspaceA = await prisma.workspace.create({
    data: {
      name: 'Apex Auto Repair',
    },
  });

  const userA = await prisma.user.create({
    data: {
      name: 'Alice Apex',
      email: 'alice@apexauto.com',
      workspaceId: workspaceA.id,
    },
  });

  console.log('Seeding Workspace B and User B...');
  const workspaceB = await prisma.workspace.create({
    data: {
      name: 'Bright Horizon Cleaning',
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: 'Bob Bright',
      email: 'bob@brighthorizon.com',
      workspaceId: workspaceB.id,
    },
  });

  console.log('Seeding customer requests for Workspace A (Apex Auto Repair)...');
  // Request 1: NEW
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceA.id,
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.v@example.com',
      customerPhone: '555-0192',
      requestedService: 'Brake Inspection & Pad Replacement',
      details: 'Squeaking sound noticed during sudden braking on the front passenger side.',
      status: 'NEW',
      activities: {
        create: [
          {
            userId: userA.id,
            action: 'CREATED',
            details: 'Request submitted via online web portal.',
          },
        ],
      },
    },
  });

  // Request 2: QUALIFIED (Ready for conversion)
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceA.id,
      customerName: 'Elena Rostova',
      customerEmail: 'elena.r@example.com',
      customerPhone: '555-0144',
      requestedService: 'Full Synthetic Oil Change',
      details: 'Due for 50,000-mile service interval; requested synthetic oil.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: userA.id,
            action: 'CREATED',
            details: 'Customer called front desk.',
          },
          {
            userId: userA.id,
            action: 'STATUS_CHANGED',
            details: 'Reviewed vehicle requirements and marked request as QUALIFIED.',
          },
        ],
      },
    },
  });

  // Request 3: QUALIFIED with existing WorkItem (demonstrates completed conversion)
  const apexReq3 = await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceA.id,
      customerName: 'David Kim',
      customerEmail: 'dkim@example.com',
      customerPhone: '555-0188',
      requestedService: 'Transmission Fluid Flush',
      details: 'Vehicle hesitation between 2nd and 3rd gear.',
      status: 'QUALIFIED',
      workItem: {
        create: {
          workspaceId: workspaceA.id,
          scheduledDate: new Date('2026-10-15T09:00:00.000Z'),
          notes: 'Bay 2 reserved with lead mechanic John.',
        },
      },
      activities: {
        create: [
          {
            userId: userA.id,
            action: 'CREATED',
            details: 'Inquiry received via email.',
          },
          {
            userId: userA.id,
            action: 'STATUS_CHANGED',
            details: 'Diagnostics verified; marked as QUALIFIED.',
          },
          {
            userId: userA.id,
            action: 'CONVERTED_TO_WORK_ITEM',
            details: 'Work item scheduled for 2026-10-15 09:00 UTC (Bay 2 reserved with lead mechanic John).',
          },
        ],
      },
    },
  });

  // Request 4: CLOSED
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceA.id,
      customerName: 'Samantha Green',
      customerEmail: 'sgreen@example.com',
      customerPhone: '555-0163',
      requestedService: 'Tire Rotation & Balance',
      details: 'Routine tire rotation.',
      status: 'CLOSED',
      activities: {
        create: [
          {
            userId: userA.id,
            action: 'CREATED',
            details: 'Customer inquiry received.',
          },
          {
            userId: userA.id,
            action: 'STATUS_CHANGED',
            details: 'Customer decided to postpone service. Marked CLOSED.',
          },
        ],
      },
    },
  });

  console.log('Seeding customer requests for Workspace B (Bright Horizon Cleaning)...');
  // Request 1: NEW
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceB.id,
      customerName: 'Acme Logistics HQ',
      customerEmail: 'facilities@acmelogistics.com',
      customerPhone: '555-0210',
      requestedService: 'Commercial Deep Carpet Cleaning',
      details: '3 floors, approximately 12,000 sq ft office space over weekend.',
      status: 'NEW',
      activities: {
        create: [
          {
            userId: userB.id,
            action: 'CREATED',
            details: 'Quote request submitted through corporate contact portal.',
          },
        ],
      },
    },
  });

  // Request 2: QUALIFIED (Ready for conversion)
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceB.id,
      customerName: 'Dr. Gregory House',
      customerEmail: 'ghouse@cliniccare.org',
      customerPhone: '555-0244',
      requestedService: 'Medical Office Sanitization',
      details: 'Full terminal cleaning and disinfection required for 4 examination rooms.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: userB.id,
            action: 'CREATED',
            details: 'Clinic coordinator reached out for urgent sanitation.',
          },
          {
            userId: userB.id,
            action: 'STATUS_CHANGED',
            details: 'Verified clinic compliance checklist. Status changed to QUALIFIED.',
          },
        ],
      },
    },
  });

  // Request 3: QUALIFIED
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceB.id,
      customerName: 'Metro High School',
      customerEmail: 'admin@metrohs.edu',
      customerPhone: '555-0277',
      requestedService: 'Gymnasium Floor Waxing & Strip',
      details: 'Annual floor resurfacing during spring break.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: userB.id,
            action: 'CREATED',
            details: 'Contract proposal received from school board.',
          },
          {
            userId: userB.id,
            action: 'STATUS_CHANGED',
            details: 'Supplies and crew schedule confirmed. Marked as QUALIFIED.',
          },
        ],
      },
    },
  });

  // Request 4: CLOSED
  await prisma.customerRequest.create({
    data: {
      workspaceId: workspaceB.id,
      customerName: 'Downtown Yoga Studio',
      customerEmail: 'peace@downtownyoga.com',
      customerPhone: '555-0299',
      requestedService: 'Post-Construction Dust Removal',
      details: 'Renovation complete. Dust removal needed.',
      status: 'CLOSED',
      activities: {
        create: [
          {
            userId: userB.id,
            action: 'CREATED',
            details: 'Direct message inquiry.',
          },
          {
            userId: userB.id,
            action: 'STATUS_CHANGED',
            details: 'Studio completed cleanup independently. Request CLOSED.',
          },
        ],
      },
    },
  });

  console.log('Seeding completed successfully!');
  console.log(`Workspace A: "${workspaceA.name}" (ID: ${workspaceA.id}) - User: ${userA.name} (${userA.email}, ID: ${userA.id})`);
  console.log(`Workspace B: "${workspaceB.name}" (ID: ${workspaceB.id}) - User: ${userB.name} (${userB.email}, ID: ${userB.id})`);
  console.log(`Seeded converted request in Workspace A: ${apexReq3.id}`);

  return {
    workspaceA,
    userA,
    workspaceB,
    userB,
  };
}

// When executed directly via tsx
if (process.argv[1]?.includes('seed')) {
  seed()
    .catch((e) => {
      console.error('Error seeding database:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
