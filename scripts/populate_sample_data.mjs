import { Client, Databases, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;

// Collection IDs
const CLIENTS_COLLECTION_ID = process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID;
const SITES_COLLECTION_ID = process.env.VITE_APPWRITE_SITES_COLLECTION_ID;
const GUARDS_COLLECTION_ID = process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID;
const SHIFTS_COLLECTION_ID = process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID;

// Sample clients data
const sampleClients = [
  {
    companyName: 'TechCorp Solutions Ltd',
    contactPerson: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+44 20 7946 0958',
    address: '123 Tech Street, London, EC2A 4BX',
    billingAddress: '123 Tech Street, London, EC2A 4BX',
    status: 'active',
    contractType: 'annual',
    paymentTerms: 30,
    serviceType: 'Corporate Security',
    notes: 'Premium client - 24/7 coverage required'
  },
  {
    companyName: 'Retail Chain UK',
    contactPerson: 'Michael Brown',
    email: 'michael.brown@retailchain.co.uk',
    phone: '+44 20 7946 0959',
    address: '456 High Street, Manchester, M1 2AB',
    billingAddress: '456 High Street, Manchester, M1 2AB',
    status: 'active',
    contractType: 'monthly',
    paymentTerms: 14,
    serviceType: 'Retail Security',
    notes: 'Multiple retail locations'
  },
  {
    companyName: 'Prestige Events Ltd',
    contactPerson: 'Emma Wilson',
    email: 'emma.wilson@prestigeevents.com',
    phone: '+44 20 7946 0960',
    address: '789 Event Plaza, Birmingham, B2 4QA',
    billingAddress: '789 Event Plaza, Birmingham, B2 4QA',
    status: 'active',
    contractType: 'project',
    paymentTerms: 7,
    serviceType: 'Event Security',
    notes: 'High-profile events and concerts'
  }
];

// Sample sites data (will be linked to clients)
const sampleSitesTemplate = [
  {
    siteName: 'Headquarters Building',
    siteType: 'Corporate Office',
    address: '123 Tech Street, London, EC2A 4BX',
    postcode: 'EC2A 4BX',
    city: 'London',
    accessInstructions: 'Main reception entrance. Security desk on ground floor.',
    emergencyContact: 'Building Manager: +44 20 7946 0970',
    requiresSIALicense: true,
    status: 'active'
  },
  {
    siteName: 'Data Center',
    siteType: 'Data Center',
    address: '10 Server Lane, London, E14 5AB',
    postcode: 'E14 5AB',
    city: 'London',
    accessInstructions: 'Biometric access required. Contact control room for entry.',
    emergencyContact: 'Control Room: +44 20 7946 0971',
    requiresSIALicense: true,
    status: 'active'
  },
  {
    siteName: 'Manchester Store',
    siteType: 'Retail',
    address: '456 High Street, Manchester, M1 2AB',
    postcode: 'M1 2AB',
    city: 'Manchester',
    accessInstructions: 'Staff entrance at rear. Key code provided.',
    emergencyContact: 'Store Manager: +44 161 234 5678',
    requiresSIALicense: true,
    status: 'active'
  },
  {
    siteName: 'Birmingham Arena',
    siteType: 'Event Venue',
    address: '789 Event Plaza, Birmingham, B2 4QA',
    postcode: 'B2 4QA',
    city: 'Birmingham',
    accessInstructions: 'Staff entrance Gate C. Event briefing required.',
    emergencyContact: 'Event Coordinator: +44 121 234 5678',
    requiresSIALicense: true,
    status: 'active'
  }
];

// Sample guards data
const sampleGuards = [
  {
    firstName: 'James',
    lastName: 'Thompson',
    email: 'james.thompson@fortissecured.com',
    phone: '+44 7700 900001',
    siaLicense: 'SIA123456789',
    siaExpiry: '2026-12-31',
    badgeNumber: 'FS-001',
    status: 'active',
    employmentType: 'full-time',
    hourlyRate: 12.50,
    startDate: '2024-01-15',
    emergencyContact: 'Mary Thompson: +44 7700 900101',
    address: '15 Guard Lane, London, SW1A 1AA',
    postcode: 'SW1A 1AA',
    city: 'London',
    qualifications: ['SIA Door Supervision', 'First Aid', 'Fire Marshal'],
    notes: 'Experienced security professional with 5+ years'
  },
  {
    firstName: 'Sophie',
    lastName: 'Anderson',
    email: 'sophie.anderson@fortissecured.com',
    phone: '+44 7700 900002',
    siaLicense: 'SIA987654321',
    siaExpiry: '2027-03-31',
    badgeNumber: 'FS-002',
    status: 'active',
    employmentType: 'full-time',
    hourlyRate: 13.00,
    startDate: '2024-02-01',
    emergencyContact: 'David Anderson: +44 7700 900102',
    address: '20 Security Street, Manchester, M1 1AA',
    postcode: 'M1 1AA',
    city: 'Manchester',
    qualifications: ['SIA Door Supervision', 'CCTV Operation', 'Conflict Management'],
    notes: 'Specialist in retail security'
  },
  {
    firstName: 'Marcus',
    lastName: 'Williams',
    email: 'marcus.williams@fortissecured.com',
    phone: '+44 7700 900003',
    siaLicense: 'SIA456789123',
    siaExpiry: '2026-09-30',
    badgeNumber: 'FS-003',
    status: 'active',
    employmentType: 'part-time',
    hourlyRate: 12.00,
    startDate: '2024-03-10',
    emergencyContact: 'Lisa Williams: +44 7700 900103',
    address: '8 Guard Avenue, Birmingham, B1 1AA',
    postcode: 'B1 1AA',
    city: 'Birmingham',
    qualifications: ['SIA Door Supervision', 'Event Security', 'Crowd Management'],
    notes: 'Excellent for event security roles'
  },
  {
    firstName: 'Olivia',
    lastName: 'Davis',
    email: 'olivia.davis@fortissecured.com',
    phone: '+44 7700 900004',
    siaLicense: 'SIA789123456',
    siaExpiry: '2027-06-30',
    badgeNumber: 'FS-004',
    status: 'active',
    employmentType: 'full-time',
    hourlyRate: 13.50,
    startDate: '2024-01-20',
    emergencyContact: 'Robert Davis: +44 7700 900104',
    address: '12 Patrol Road, London, E1 1AA',
    postcode: 'E1 1AA',
    city: 'London',
    qualifications: ['SIA Door Supervision', 'Close Protection', 'Advanced First Aid'],
    notes: 'High-profile client experience'
  },
  {
    firstName: 'Daniel',
    lastName: 'Martinez',
    email: 'daniel.martinez@fortissecured.com',
    phone: '+44 7700 900005',
    siaLicense: 'SIA321654987',
    siaExpiry: '2026-11-30',
    badgeNumber: 'FS-005',
    status: 'active',
    employmentType: 'full-time',
    hourlyRate: 12.75,
    startDate: '2024-02-15',
    emergencyContact: 'Ana Martinez: +44 7700 900105',
    address: '25 Watch Close, Manchester, M2 1AA',
    postcode: 'M2 1AA',
    city: 'Manchester',
    qualifications: ['SIA Door Supervision', 'CCTV Operation', 'Patrol Security'],
    notes: 'Reliable and professional'
  }
];

async function checkAndCreateClients() {
  console.log('📋 Checking clients collection...');
  
  try {
    const existingClients = await databases.listDocuments(
      DATABASE_ID,
      CLIENTS_COLLECTION_ID,
      [Query.limit(100)]
    );

    if (existingClients.documents.length === 0) {
      console.log('Creating sample clients...');
      const createdClients = [];
      
      for (const client of sampleClients) {
        try {
          const created = await databases.createDocument(
            DATABASE_ID,
            CLIENTS_COLLECTION_ID,
            ID.unique(),
            client
          );
          createdClients.push(created);
          console.log(`✓ Created client: ${client.companyName}`);
        } catch (error) {
          console.error(`✗ Failed to create client ${client.companyName}:`, error.message);
        }
      }
      
      return createdClients;
    } else {
      console.log(`✓ Found ${existingClients.documents.length} existing clients`);
      return existingClients.documents;
    }
  } catch (error) {
    console.error('Error checking clients:', error.message);
    return [];
  }
}

async function checkAndCreateSites(clients) {
  console.log('\n🏢 Checking sites collection...');
  
  try {
    const existingSites = await databases.listDocuments(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      [Query.limit(100)]
    );

    if (existingSites.documents.length === 0) {
      console.log('Creating sample sites...');
      const createdSites = [];
      
      // Link sites to clients
      const sitesData = [
        { ...sampleSitesTemplate[0], clientId: clients[0].$id }, // TechCorp HQ
        { ...sampleSitesTemplate[1], clientId: clients[0].$id }, // TechCorp Data Center
        { ...sampleSitesTemplate[2], clientId: clients[1].$id }, // Retail Chain Store
        { ...sampleSitesTemplate[3], clientId: clients[2].$id }, // Events Arena
      ];
      
      for (const site of sitesData) {
        try {
          const created = await databases.createDocument(
            DATABASE_ID,
            SITES_COLLECTION_ID,
            ID.unique(),
            site
          );
          createdSites.push(created);
          console.log(`✓ Created site: ${site.siteName}`);
        } catch (error) {
          console.error(`✗ Failed to create site ${site.siteName}:`, error.message);
        }
      }
      
      return createdSites;
    } else {
      console.log(`✓ Found ${existingSites.documents.length} existing sites`);
      return existingSites.documents;
    }
  } catch (error) {
    console.error('Error checking sites:', error.message);
    return [];
  }
}

async function checkAndCreateGuards() {
  console.log('\n👮 Checking guards collection...');
  
  try {
    const existingGuards = await databases.listDocuments(
      DATABASE_ID,
      GUARDS_COLLECTION_ID,
      [Query.limit(100)]
    );

    if (existingGuards.documents.length === 0) {
      console.log('Creating sample guards...');
      const createdGuards = [];
      
      for (const guard of sampleGuards) {
        try {
          const created = await databases.createDocument(
            DATABASE_ID,
            GUARDS_COLLECTION_ID,
            ID.unique(),
            guard
          );
          createdGuards.push(created);
          console.log(`✓ Created guard: ${guard.firstName} ${guard.lastName}`);
        } catch (error) {
          console.error(`✗ Failed to create guard ${guard.firstName} ${guard.lastName}:`, error.message);
        }
      }
      
      return createdGuards;
    } else {
      console.log(`✓ Found ${existingGuards.documents.length} existing guards`);
      return existingGuards.documents;
    }
  } catch (error) {
    console.error('Error checking guards:', error.message);
    return [];
  }
}

async function createSampleShifts(clients, sites) {
  console.log('\n📅 Checking shifts collection...');
  
  try {
    const existingShifts = await databases.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [Query.limit(100)]
    );

    if (existingShifts.documents.length === 0) {
      console.log('Creating sample shifts...');
      
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // Get day after tomorrow
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];
      
      const sampleShifts = [
        {
          clientId: clients[0].$id,
          siteId: sites[0].$id,
          date: tomorrowStr,
          startTime: '08:00',
          endTime: '16:00',
          shiftType: 'Static Guarding',
          requiredHeadcount: 2,
          payRate: 12.50,
          billRate: 18.00,
          breakMinutes: 30,
          paidBreak: true,
          status: 'scheduled',
          instructions: 'Monitor main entrance and reception area. Log all visitors.',
          uniformRequirement: 'Full uniform required',
          vehicleRequired: false
        },
        {
          clientId: clients[0].$id,
          siteId: sites[1].$id,
          date: tomorrowStr,
          startTime: '20:00',
          endTime: '08:00',
          shiftType: 'Static Guarding',
          requiredHeadcount: 1,
          payRate: 13.50,
          billRate: 20.00,
          breakMinutes: 60,
          paidBreak: true,
          status: 'unfilled',
          instructions: 'Night shift at data center. Patrol every 2 hours.',
          uniformRequirement: 'Full uniform required',
          vehicleRequired: false
        },
        {
          clientId: clients[1].$id,
          siteId: sites[2].$id,
          date: dayAfterStr,
          startTime: '10:00',
          endTime: '22:00',
          shiftType: 'Retail Security',
          requiredHeadcount: 1,
          payRate: 12.00,
          billRate: 17.00,
          breakMinutes: 60,
          paidBreak: false,
          status: 'scheduled',
          instructions: 'Monitor shop floor and prevent shoplifting.',
          uniformRequirement: 'Smart casual - store uniform provided',
          vehicleRequired: false
        },
        {
          clientId: clients[2].$id,
          siteId: sites[3].$id,
          date: dayAfterStr,
          startTime: '18:00',
          endTime: '02:00',
          shiftType: 'Event Security',
          requiredHeadcount: 3,
          payRate: 14.00,
          billRate: 21.00,
          breakMinutes: 30,
          paidBreak: true,
          status: 'unfilled',
          instructions: 'Concert event security. Crowd control and access management.',
          uniformRequirement: 'High-vis vest and radio required',
          vehicleRequired: false
        }
      ];
      
      const createdShifts = [];
      for (const shift of sampleShifts) {
        try {
          const created = await databases.createDocument(
            DATABASE_ID,
            SHIFTS_COLLECTION_ID,
            ID.unique(),
            shift
          );
          createdShifts.push(created);
          console.log(`✓ Created shift: ${shift.shiftType} at ${shift.date}`);
        } catch (error) {
          console.error(`✗ Failed to create shift:`, error.message);
        }
      }
      
      return createdShifts;
    } else {
      console.log(`✓ Found ${existingShifts.documents.length} existing shifts`);
      return existingShifts.documents;
    }
  } catch (error) {
    console.error('Error checking shifts:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting sample data population...\n');
  console.log(`Database ID: ${DATABASE_ID}`);
  console.log(`Clients Collection: ${CLIENTS_COLLECTION_ID}`);
  console.log(`Sites Collection: ${SITES_COLLECTION_ID}`);
  console.log(`Guards Collection: ${GUARDS_COLLECTION_ID}`);
  console.log(`Shifts Collection: ${SHIFTS_COLLECTION_ID}\n`);

  try {
    // Step 1: Check/Create Clients
    const clients = await checkAndCreateClients();
    
    if (clients.length === 0) {
      console.error('❌ No clients available. Cannot proceed with sites creation.');
      return;
    }

    // Step 2: Check/Create Sites (linked to clients)
    const sites = await checkAndCreateSites(clients);

    // Step 3: Check/Create Guards
    const guards = await checkAndCreateGuards();

    // Step 4: Create Sample Shifts
    if (sites.length > 0) {
      await createSampleShifts(clients, sites);
    }

    console.log('\n✅ Sample data population completed!');
    console.log('\nSummary:');
    console.log(`  - Clients: ${clients.length}`);
    console.log(`  - Sites: ${sites.length}`);
    console.log(`  - Guards: ${guards.length}`);
    console.log('\n📝 You can now:');
    console.log('  1. View the scheduling board to see open shifts');
    console.log('  2. Click "Add Shift" to create new shifts');
    console.log('  3. Click "Assign Guards" to assign guards to shifts');

  } catch (error) {
    console.error('❌ Error during data population:', error);
    process.exit(1);
  }
}

main();
