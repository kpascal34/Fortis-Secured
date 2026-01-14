# Sample Data Population

This script populates your Appwrite database with sample clients, sites, guards, and shifts to help you get started quickly.

## Prerequisites

1. Ensure all Appwrite collections are created
2. Environment variables are set in `.env` file:
   - `VITE_APPWRITE_ENDPOINT`
   - `VITE_APPWRITE_PROJECT_ID`
   - `VITE_APPWRITE_DATABASE_ID`
   - `APPWRITE_API_KEY`
   - Collection IDs for: clients, sites, guards, shifts

## Installation

First, install dependencies if you haven't already:

```bash
npm install
```

## Running the Script

To populate sample data:

```bash
npm run seed:sample-data
```

## What Gets Created

### Clients (3)
1. **TechCorp Solutions Ltd** - Corporate security client
2. **Retail Chain UK** - Retail security client
3. **Prestige Events Ltd** - Event security client

### Sites (4)
1. **Headquarters Building** (TechCorp) - London
2. **Data Center** (TechCorp) - London
3. **Manchester Store** (Retail Chain) - Manchester
4. **Birmingham Arena** (Prestige Events) - Birmingham

### Guards (5)
- James Thompson (Full-time, London)
- Sophie Anderson (Full-time, Manchester)
- Marcus Williams (Part-time, Birmingham)
- Olivia Davis (Full-time, London)
- Daniel Martinez (Full-time, Manchester)

All guards have:
- Valid SIA licenses
- Contact information
- Qualifications
- Hourly rates

### Shifts (4)
- 2 shifts for tomorrow (1 scheduled, 1 unfilled)
- 2 shifts for day after tomorrow (1 scheduled, 1 unfilled)

Includes various shift types:
- Static Guarding
- Retail Security
- Event Security

## Smart Features

The script is **idempotent** - it checks if data already exists:
- If collections are empty, it creates sample data
- If data exists, it reports what's already there
- Safe to run multiple times

## After Running

Once the sample data is populated, you can:

1. **View Scheduling Board**: Navigate to the Scheduling page to see the Open Shifts section
2. **Create New Shifts**: Click "Add Shift" button to create additional shifts
3. **Assign Guards**: Click "Assign Guards" on any shift to assign security personnel
4. **Test Workflows**: Use the sample data to test the full scheduling workflow

## Troubleshooting

**Error: Collection not found**
- Make sure all collections are created first
- Run the collection setup scripts: `npm run setup:create-*`

**Error: Invalid API key**
- Check your `APPWRITE_API_KEY` in `.env`
- Ensure the API key has proper permissions

**Error: Document already exists**
- This is normal if you run the script multiple times
- The script will skip existing documents

## Next Steps

After populating sample data:
1. Log in to the portal
2. Navigate to Scheduling page
3. View the Open Shifts section
4. Create your first shift or assign guards to existing shifts
5. Explore other features with the sample data
