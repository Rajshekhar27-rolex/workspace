import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database records...');
  await prisma.activityLog.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.customerRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  console.log('Seeding workspaces...');
  const apexWorkspace = await prisma.workspace.create({
    data: {
      name: 'Apex Auto Repair',
    },
  });

  const brightWorkspace = await prisma.workspace.create({
    data: {
      name: 'Bright Horizon Cleaning',
    },
  });

  console.log('Seeding users...');
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Apex',
      email: 'alice@apexauto.com',
      workspaceId: apexWorkspace.id,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Bright',
      email: 'bob@brighthorizon.com',
      workspaceId: brightWorkspace.id,
    },
  });

  console.log('Seeding requests for Apex Auto Repair...');
  const apexReq1 = await prisma.customerRequest.create({
    data: {
      workspaceId: apexWorkspace.id,
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.v@example.com',
      customerPhone: '555-0192',
      requestedService: 'Brake Inspection & Pad Replacement',
      details: 'Squeaking sound noticed during sudden braking on the front passenger side.',
      status: 'NEW',
      activities: {
        create: [
          {
            userId: alice.id,
            action: 'CREATED',
            details: 'Request submitted via online web form.',
          },
        ],
      },
    },
  });

  const apexReq2 = await prisma.customerRequest.create({
    data: {
      workspaceId: apexWorkspace.id,
      customerName: 'Elena Rostova',
      customerEmail: 'elena.r@example.com',
      customerPhone: '555-0144',
      requestedService: 'Full Synthetic Oil Change',
      details: 'Due for 50,000-mile service interval; requested synthetic oil.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: alice.id,
            action: 'CREATED',
            details: 'Customer called front desk.',
          },
          {
            userId: alice.id,
            action: 'STATUS_CHANGED',
            details: 'Reviewed vehicle requirements and marked request as QUALIFIED.',
          },
        ],
      },
    },
  });

  const apexReq3 = await prisma.customerRequest.create({
    data: {
      workspaceId: apexWorkspace.id,
      customerName: 'David Kim',
      customerEmail: 'dkim@example.com',
      customerPhone: '555-0188',
      requestedService: 'Transmission Fluid Flush',
      details: 'Vehicle hesitation between 2nd and 3rd gear.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: alice.id,
            action: 'CREATED',
            details: 'Inquiry received via email.',
          },
          {
            userId: alice.id,
            action: 'STATUS_CHANGED',
            details: 'Diagnostics verified; marked as QUALIFIED.',
          },
        ],
      },
    },
  });

  const apexReq4 = await prisma.customerRequest.create({
    data: {
      workspaceId: apexWorkspace.id,
      customerName: 'Samantha Green',
      customerEmail: 'sgreen@example.com',
      customerPhone: '555-0163',
      requestedService: 'Tire Rotation & Balance',
      details: 'Routine tire rotation.',
      status: 'CLOSED',
      activities: {
        create: [
          {
            userId: alice.id,
            action: 'CREATED',
            details: 'Customer inquiry received.',
          },
          {
            userId: alice.id,
            action: 'STATUS_CHANGED',
            details: 'Customer decided to postpone service. Marked CLOSED.',
          },
        ],
      },
    },
  });

  console.log('Seeding requests for Bright Horizon Cleaning...');
  const brightReq1 = await prisma.customerRequest.create({
    data: {
      workspaceId: brightWorkspace.id,
      customerName: 'Acme Logistics HQ',
      customerEmail: 'facilities@acmelogistics.com',
      customerPhone: '555-0210',
      requestedService: 'Commercial Deep Carpet Cleaning',
      details: '3 floors, approximately 12,000 sq ft office space over weekend.',
      status: 'NEW',
      activities: {
        create: [
          {
            userId: bob.id,
            action: 'CREATED',
            details: 'Quote request submitted through corporate contact portal.',
          },
        ],
      },
    },
  });

  const brightReq2 = await prisma.customerRequest.create({
    data: {
      workspaceId: brightWorkspace.id,
      customerName: 'Dr. Gregory House',
      customerEmail: 'ghouse@cliniccare.org',
      customerPhone: '555-0244',
      requestedService: 'Medical Office Sanitization',
      details: 'Full terminal cleaning and disinfection required for 4 examination rooms.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: bob.id,
            action: 'CREATED',
            details: 'Clinic coordinator reached out for urgent sanitation.',
          },
          {
            userId: bob.id,
            action: 'STATUS_CHANGED',
            details: 'Verified clinic compliance checklist. Status changed to QUALIFIED.',
          },
        ],
      },
    },
  });

  const brightReq3 = await prisma.customerRequest.create({
    data: {
      workspaceId: brightWorkspace.id,
      customerName: 'Metro High School',
      customerEmail: 'admin@metrohs.edu',
      customerPhone: '555-0277',
      requestedService: 'Gymnasium Floor Waxing & Strip',
      details: 'Annual floor resurfacing during spring break.',
      status: 'QUALIFIED',
      activities: {
        create: [
          {
            userId: bob.id,
            action: 'CREATED',
            details: 'Contract proposal received from school board.',
          },
          {
            userId: bob.id,
            action: 'STATUS_CHANGED',
            details: 'Supplies and crew schedule confirmed. Marked as QUALIFIED.',
          },
        ],
      },
    },
  });

  const brightReq4 = await prisma.customerRequest.create({
    data: {
      workspaceId: brightWorkspace.id,
      customerName: 'Downtown Yoga Studio',
      customerEmail: 'peace@downtownyoga.com',
      customerPhone: '555-0299',
      requestedService: 'Post-Construction Dust Removal',
      details: 'Renovation complete. Dust removal needed.',
      status: 'CLOSED',
      activities: {
        create: [
          {
            userId: bob.id,
            action: 'CREATED',
            details: 'Direct message inquiry.',
          },
          {
            userId: bob.id,
            action: 'STATUS_CHANGED',
            details: 'Studio completed cleanup independently. Request CLOSED.',
          },
        ],
      },
    },
  });

  console.log('Seeding completed successfully!');
  console.log(`Apex Auto Repair (ID: ${apexWorkspace.id}) - User: ${alice.name} (${alice.email}, ID: ${alice.id})`);
  console.log(`Bright Horizon Cleaning (ID: ${brightWorkspace.id}) - User: ${bob.name} (${bob.email}, ID: ${bob.id})`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
