/**
 * Sales & CRM Seeder
 * 
 * Seeds CRM data:
 * - SalesRepresentatives: 20-30 sales reps with hierarchical structure
 * - Leads: 200-500 leads in various stages
 * - CallLogs: 500-1000 call records for NDR resolution
 */

import mongoose from 'mongoose';
import User from '../../mongoose/models/iam/users/user.model';
import Company from '../../mongoose/models/organization/core/company.model';
import SalesRepresentative from '../../mongoose/models/crm/sales/sales-representative.model';
import Lead from '../../mongoose/models/crm/leads/lead.model';
import CallLog from '../../mongoose/models/crm/communication/call-log.model';
import NDREvent from '../../mongoose/models/logistics/shipping/exceptions/ndr-event.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import { randomInt, selectRandom, selectWeightedFromObject, generateAlphanumeric } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { subDays, addDays } from '../utils/date.utils';
import { generateIndianName, generateIndianPhone, generateEmail } from '../data/customer-names.js';
import { selectBank, generateIFSC, generateAccountNumber, generatePAN } from '../data/indian-banks.js';


// Sales role distribution
const SALES_ROLE_DISTRIBUTION = {
    rep: 60,
    'team-lead': 25,
    manager: 10,
    director: 5,
};

// Lead source distribution
const LEAD_SOURCE_DISTRIBUTION = {
    website: 35,
    referral: 25,
    'cold-call': 20,
    'social-media': 15,
    event: 5,
};

// Lead status distribution
const LEAD_STATUS_DISTRIBUTION = {
    new: 25,
    contacted: 20,
    qualified: 20,
    proposal: 15,
    negotiation: 10,
    won: 7,
    lost: 3,
};

// Call status distribution
const CALL_STATUS_DISTRIBUTION = {
    completed: 40,
    answered: 25,
    no_answer: 20,
    busy: 10,
    failed: 5,
};

// Territories (Indian states/regions)
const TERRITORIES = [
    'North India', 'South India', 'East India', 'West India', 'Central India',
    'Delhi NCR', 'Mumbai MMR', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

// Lead tags
const LEAD_TAGS = [
    'high-value', 'urgent', 'enterprise', 'startup', 'returning',
    'wholesale', 'retail', 'fashion', 'electronics', 'b2b',
];

/**
 * Generate employee ID
 */
function generateEmployeeId(role: string, index: number): string {
    const prefix = role === 'director' ? 'DIR' : role === 'manager' ? 'MGR' : role === 'team-lead' ? 'TL' : 'SR';
    return `${prefix}-${String(index + 1).padStart(4, '0')}`;
}

/**
 * Generate bank details for sales rep
 */
function generateBankDetails(name: string): any {
    const bank = selectBank();
    return {
        accountNumber: generateAccountNumber(bank),
        ifscCode: generateIFSC(bank),
        accountHolderName: name,
        bankName: bank.name,
        panNumber: generatePAN(),
    };
}

/**
 * Generate KPI targets based on role
 */
function generateKPITargets(role: string): any {
    const baseRevenue = role === 'director' ? 5000000 : role === 'manager' ? 2000000 : role === 'team-lead' ? 1000000 : 500000;
    return {
        monthlyRevenue: baseRevenue + randomInt(-100000, 100000),
        monthlyOrders: role === 'rep' ? randomInt(50, 100) : randomInt(100, 500),
        conversionRate: randomInt(20, 40),
    };
}

/**
 * Generate performance metrics
 */
function generatePerformanceMetrics(role: string): any {
    const multiplier = role === 'director' ? 4 : role === 'manager' ? 3 : role === 'team-lead' ? 2 : 1;
    const orders = randomInt(50, 200) * multiplier;
    const revenue = orders * randomInt(500, 2000);
    const commission = revenue * (randomInt(5, 15) / 100);
    const paidPercentage = randomInt(60, 90) / 100;

    return {
        totalRevenue: revenue,
        totalOrders: orders,
        totalCommission: Math.round(commission),
        totalPaidCommission: Math.round(commission * paidPercentage),
        avgCommissionPerOrder: Math.round(commission / orders),
        lastUpdated: subDays(new Date(), randomInt(0, 7)),
    };
}

/**
 * Generate a lead
 */
function generateLead(salesRepId: mongoose.Types.ObjectId, companyId: mongoose.Types.ObjectId): any {
    const status = selectWeightedFromObject(LEAD_STATUS_DISTRIBUTION);
    const source = selectWeightedFromObject(LEAD_SOURCE_DISTRIBUTION);
    const estimatedValue = randomInt(10000, 500000);
    const createdAt = subDays(new Date(), randomInt(1, 90));

    const lead: any = {
        company: companyId,
        salesRepresentative: salesRepId,
        name: generateIndianName(),
        email: generateEmail(),
        phone: generateIndianPhone(),
        companyName: `${selectRandom(['Quick', 'Fast', 'Prime', 'Best', 'Top', 'Smart'])} ${selectRandom(['Commerce', 'Trade', 'Retail', 'Solutions', 'Mart', 'Store'])} ${selectRandom(['Pvt Ltd', 'LLP', 'Inc', 'Co'])}`,
        source,
        status,
        estimatedValue,
        notes: Math.random() > 0.5 ? `Follow up regarding ${selectRandom(['pricing', 'demo', 'integration', 'contract terms'])}` : undefined,
        tags: [selectRandom(LEAD_TAGS), ...(Math.random() > 0.5 ? [selectRandom(LEAD_TAGS)] : [])].filter((v, i, a) => a.indexOf(v) === i),
        createdAt,
        updatedAt: status === 'new' ? createdAt : addDays(createdAt, randomInt(1, 30)),
    };

    // Add conversion data for won leads
    if (status === 'won') {
        lead.actualValue = estimatedValue * (randomInt(80, 120) / 100);
        lead.conversionDate = addDays(createdAt, randomInt(7, 45));
    }

    // Add follow-up for active leads
    if (['contacted', 'qualified', 'proposal', 'negotiation'].includes(status)) {
        lead.nextFollowUp = addDays(new Date(), randomInt(1, 7));
        lead.lastContactedAt = subDays(new Date(), randomInt(0, 5));
    }

    return lead;
}

/**
 * Generate a call log
 */
function generateCallLog(
    ndrEventId: mongoose.Types.ObjectId,
    shipmentId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId,
    customerName: string,
    customerPhone: string
): any {
    const status = selectWeightedFromObject(CALL_STATUS_DISTRIBUTION);
    const createdAt = subDays(new Date(), randomInt(0, 30));

    const callLog: any = {
        ndrEvent: ndrEventId,
        shipment: shipmentId,
        customer: {
            name: customerName,
            phone: customerPhone,
        },
        callSid: `EXO${Date.now()}${generateAlphanumeric(8)}`,
        callProvider: selectRandom(['exotel', 'twilio', 'exotel']), // Exotel more common in India
        status,
        direction: Math.random() > 0.9 ? 'inbound' : 'outbound',
        duration: status === 'completed' || status === 'answered' ? randomInt(30, 300) : randomInt(0, 15),
        company: companyId,
        createdAt,
        updatedAt: createdAt,
    };

    // Add IVR responses for answered calls
    if (['completed', 'answered'].includes(status) && Math.random() > 0.5) {
        callLog.ivrResponses = [
            {
                option: randomInt(1, 4),
                timestamp: addDays(createdAt, 0),
                optionText: selectRandom(['Reschedule delivery', 'Update address', 'Cancel order', 'Speak to agent']),
            },
        ];
    }

    // Add recording URL for completed calls
    if (status === 'completed' && Math.random() > 0.5) {
        callLog.recordingUrl = `https://recordings.exotel.com/${callLog.callSid}.mp3`;
    }

    // Add callback for no_answer
    if (status === 'no_answer' && Math.random() > 0.5) {
        callLog.callbackScheduled = true;
        callLog.callbackTime = addDays(new Date(), randomInt(0, 2));
    }

    // Add error message for failed calls
    if (status === 'failed') {
        callLog.errorMessage = selectRandom([
            'Network error',
            'Invalid number',
            'Carrier unavailable',
            'Timeout',
        ]);
    }

    return callLog;
}

/**
 * Main seeder function
 */
export async function seedSalesCRM(): Promise<void> {
    const timer = createTimer();
    logger.step(17, 'Seeding Sales & CRM (Reps, Leads, Call Logs)');

    try {
        // Get admin users (they can be sales reps)
        const adminUsers = await User.find({ role: 'admin' }).limit(30).lean();
        const companies = await Company.find({ status: 'approved', isDeleted: false }).lean();

        if (adminUsers.length === 0 || companies.length === 0) {
            logger.warn('No admin users or approved companies found. Skipping sales CRM seeder.');
            return;
        }

        const salesReps: any[] = [];
        const leads: any[] = [];

        // Pick a subset of companies for sales operations
        const salesCompanies = companies.slice(0, Math.min(10, companies.length));
        let repIndex = 0;
        let directorId: any = undefined;
        let managerIds: any[] = [];
        let teamLeadIds: any[] = [];

        // Generate 20-30 sales reps with hierarchy
        for (let i = 0; i < Math.min(adminUsers.length, 25); i++) {
            const user = adminUsers[i] as any;
            const company = salesCompanies[i % salesCompanies.length] as any;
            const role = selectWeightedFromObject(SALES_ROLE_DISTRIBUTION);

            const salesRep: any = {
                user: user._id,
                company: company._id,
                employeeId: generateEmployeeId(role, repIndex++),
                role,
                territory: [selectRandom(TERRITORIES), ...(Math.random() > 0.5 ? [selectRandom(TERRITORIES)] : [])].filter((v, i, a) => a.indexOf(v) === i),
                commissionRules: [],
                status: Math.random() > 0.1 ? 'active' : 'inactive',
                onboardingDate: subDays(new Date(), randomInt(30, 365)),
                kpiTargets: generateKPITargets(role),
                performanceMetrics: generatePerformanceMetrics(role),
                bankDetails: generateBankDetails(user.name),
                razorpayContactId: `contact_${generateAlphanumeric(14)}`,
                razorpayFundAccountId: `fa_${generateAlphanumeric(14)}`,
            };

            // Set up hierarchy
            if (role === 'director') {
                directorId = user._id;
            } else if (role === 'manager') {
                salesRep.reportingTo = directorId;
                managerIds.push(user._id);
            } else if (role === 'team-lead') {
                salesRep.reportingTo = managerIds.length > 0 ? selectRandom(managerIds) : directorId;
                teamLeadIds.push(user._id);
            } else {
                salesRep.reportingTo = teamLeadIds.length > 0 ? selectRandom(teamLeadIds) :
                    managerIds.length > 0 ? selectRandom(managerIds) : directorId;
            }

            salesReps.push(salesRep);
        }

        // Insert sales reps
        const insertedReps = await SalesRepresentative.insertMany(salesReps, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
            logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate sales reps`);
            return err.insertedDocs || [];
        });

        const repIds = (Array.isArray(insertedReps) ? insertedReps : []).map((r: any) => r._id);

        // Generate leads for each company
        if (repIds.length > 0) {
            for (const company of salesCompanies) {
                const leadCount = randomInt(20, 50);
                for (let i = 0; i < leadCount; i++) {
                    const repId = selectRandom(repIds);
                    leads.push(generateLead(repId, company._id));
                }
            }

            if (leads.length > 0) {
                await Lead.insertMany(leads);
            }
        }

        // Generate call logs from existing NDR events
        // Get NDR events with their shipments in one query for efficiency
        const ndrEvents = await NDREvent.find({})
            .limit(500)
            .lean();

        const callLogs: any[] = [];

        logger.info(`Found ${ndrEvents.length} NDR events for call log generation`);

        // Get all shipment IDs from NDR events
        const shipmentIds = ndrEvents
            .map((ndr: any) => ndr.shipment)
            .filter(Boolean);

        // Fetch all shipments at once
        const shipments = await Shipment.find({
            _id: { $in: shipmentIds }
        }).lean();

        // Create a map for quick lookup
        const shipmentMap = new Map(
            shipments.map((s: any) => [s._id.toString(), s])
        );

        let noShipmentCount = 0;
        let noDetailsCount = 0;
        let successCount = 0;

        for (const ndr of ndrEvents) {
            const ndrAny = ndr as any;

            // Look up shipment from our map
            const shipment = shipmentMap.get(ndrAny.shipment?.toString());

            if (!shipment) {
                noShipmentCount++;
                continue;
            }

            // Check if shipment has delivery details
            if (!shipment.deliveryDetails?.recipientName || !shipment.deliveryDetails?.recipientPhone) {
                noDetailsCount++;
                continue;
            }

            successCount++;
            // Generate 1-2 call attempts per NDR
            const callCount = randomInt(1, 2);
            for (let i = 0; i < callCount; i++) {
                callLogs.push(generateCallLog(
                    ndrAny._id,
                    shipment._id,
                    ndrAny.company,
                    shipment.deliveryDetails.recipientName,
                    shipment.deliveryDetails.recipientPhone
                ));
            }
        }

        logger.info(`Call log generation: ${successCount} success, ${noShipmentCount} no shipment, ${noDetailsCount} missing details`);
        logger.info(`Generated ${callLogs.length} call logs from ${ndrEvents.length} NDR events`);

        if (callLogs.length > 0) {
            await CallLog.insertMany(callLogs, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate call logs`);
            });
        }

        logger.complete('sales-crm', salesReps.length + leads.length + callLogs.length, timer.elapsed());
        logger.table({
            'Sales Representatives': salesReps.length,
            'Leads': leads.length,
            'Call Logs': callLogs.length,
            'Total Records': salesReps.length + leads.length + callLogs.length,
        });

    } catch (error) {
        logger.error('Failed to seed sales CRM:', error);
        throw error;
    }
}
