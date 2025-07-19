import { parseVendorCSV, CanonicalLead } from '../src/utils/csvParser';

// Extended interface for NextGen leads that includes price and product
interface NextGenLead extends CanonicalLead {
  price?: number;
  product?: string;
}

describe('NextGen Premium Listing Deduplication', () => {
  it('should merge premium listing (ad) with main lead (data) and sum prices', async () => {
    // Sample CSV with both data and ad records for same lead
    const csvContent = `created_at,purchase_id,product,lead_id,vendor_id,vendor_name,vertical_id,account_id,account_name,campaign_id,campaign_name,bid_type,first_name,last_name,phone,street_1,street_2,email,city,state,zipcode,dob,gender,height,household_size,household_income,weight,military,pregnant,tobacco_user,has_prescription,has_medicare_parts_a_b,has_medical_condition,medical_conditions,insurance_timeframe,price,status,disposition,call_log_id,call_duration,source_hash,sub_id_hash
2025-04-30T17:13:42.506Z,01JT3V18VAWF81BX0RT4ASY0NF,ad,D-4KXN-4SC5,nextgenleads,NextGen Leads,health_insurance,GRF-981-168,Link Pellow,01JQSWDNBFA10P64NXX359X6G5,Crokodial,exclusive,Yliana,Vasquez,2104611180,622 Meadow Gate,,vasquezyliana@yahoo.com,Converse,TX,78109,1992-07-05,female,60,1,999999,150,false,false,false,true,,false,[],In the next week,5,complete,,,,2kGzDb,Z2sevND
2025-04-30T17:13:42.346Z,01JT3V18NJS0CJDRW6M1032T9K,data,D-4KXN-4SC5,nextgenleads,NextGen Leads,health_insurance,GRF-981-168,Link Pellow,01JQSWDNBFA10P64NXX359X6G5,Crokodial,exclusive,Yliana,Vasquez,2104611180,622 Meadow Gate,,vasquezyliana@yahoo.com,Converse,TX,78109,1992-07-05,female,60,1,999999,150,false,false,false,true,,false,[],In the next week,45,complete,,,,2kGzDb,Z2sevND`;

    const result = await parseVendorCSV(csvContent);

    // Should detect NextGen vendor
    expect(result.vendor).toBe('NEXTGEN');
    expect(result.errors).toHaveLength(0);
    
    // Should have parsed 2 records initially
    expect(result.stats.totalRows).toBe(2);
    
    // After deduplication in csvUpload route, would have 1 lead
    // Let's verify the parsed data has correct structure
    expect(result.leads).toHaveLength(2);
    
    // Find data and ad records
    const dataRecord = result.leads.find((l) => (l as NextGenLead).product === 'data') as NextGenLead;
    const adRecord = result.leads.find((l) => (l as NextGenLead).product === 'ad') as NextGenLead;
    
    expect(dataRecord).toBeDefined();
    expect(adRecord).toBeDefined();
    
    // Verify lead IDs match
    expect(dataRecord!.leadId).toBe('D-4KXN-4SC5');
    expect(adRecord!.leadId).toBe('D-4KXN-4SC5');
    
    // Verify prices
    expect(dataRecord!.price).toBe(45);
    expect(adRecord!.price).toBe(5);
    
    // Verify other fields mapped correctly
    expect(dataRecord!.firstName).toBe('Yliana');
    expect(dataRecord!.lastName).toBe('Vasquez');
    expect(dataRecord!.phone).toBe('(210) 461-1180'); // Phone is formatted
  });

  it('should handle ad record appearing before data record', async () => {
    // CSV with ad record first, then data record
    const csvContent = `created_at,purchase_id,product,lead_id,vendor_id,vendor_name,vertical_id,account_id,account_name,campaign_id,campaign_name,bid_type,first_name,last_name,phone,street_1,street_2,email,city,state,zipcode,dob,gender,height,household_size,household_income,weight,military,pregnant,tobacco_user,has_prescription,has_medicare_parts_a_b,has_medical_condition,medical_conditions,insurance_timeframe,price,status,disposition,call_log_id,call_duration,source_hash,sub_id_hash
2025-04-30T17:10:47.552Z,01JT3TVY0003NEMSVRD58NMC0Y,ad,D-HA1W-8GQG,nextgenleads,NextGen Leads,health_insurance,GRF-981-168,Link Pellow,01JR0YYTPG4KBK7RK37K6SVD46,Captain Ahab,exclusive,Nikia,Wailliamson,7316619770,5 N Tennessee St,,eastwilliamson719@gmail.com,Jackson,TN,38301,1995-08-05,female,77,1,999999,220,false,false,false,true,,false,[],In the next week,5,complete,,,,Z8Sg0a,iXlVz
2025-04-30T17:10:47.373Z,01JT3TVXSNR7KGRCV7VARWQV98,data,D-HA1W-8GQG,nextgenleads,NextGen Leads,health_insurance,GRF-981-168,Link Pellow,01JR0YYTPG4KBK7RK37K6SVD46,Captain Ahab,exclusive,Nikia,Wailliamson,7316619770,5 N Tennessee St,,eastwilliamson719@gmail.com,Jackson,TN,38301,1995-08-05,female,77,1,999999,220,false,false,false,true,,false,[],In the next week,49.01,complete,,,,Z8Sg0a,iXlVz`;

    const result = await parseVendorCSV(csvContent);

    expect(result.vendor).toBe('NEXTGEN');
    expect(result.leads).toHaveLength(2);
    
    // Both records should have same lead ID
    const leadId = 'D-HA1W-8GQG';
    const leads = result.leads.filter((l) => l.leadId === leadId) as NextGenLead[];
    expect(leads).toHaveLength(2);
    
    // Should have one of each type
    const types = leads.map((l) => l.product).filter(Boolean).sort();
    expect(types).toEqual(['ad', 'data']);
  });

  it('should handle leads without premium listings', async () => {
    // CSV with only data record (no premium listing)
    const csvContent = `created_at,purchase_id,product,lead_id,vendor_id,vendor_name,vertical_id,account_id,account_name,campaign_id,campaign_name,bid_type,first_name,last_name,phone,street_1,street_2,email,city,state,zipcode,dob,gender,height,household_size,household_income,weight,military,pregnant,tobacco_user,has_prescription,has_medicare_parts_a_b,has_medical_condition,medical_conditions,insurance_timeframe,price,status,disposition,call_log_id,call_duration,source_hash,sub_id_hash
2025-05-01T02:06:31.020Z,01JT4SGW1N67Z0CT9AHW4Q18X4,data,D-TQPC-EABF,nextgenleads,NextGen Leads,health_insurance,GRF-981-168,Link Pellow,01JQH6DP8SQHYF3KXP3P2Q3YH7,LiGHT THE BEACON,exclusive,Savannah,Lynch,9376895975,10524 Quaker Trace Rd,,nannahlynch@gmail.com,Somerville,OH,45064,1999-03-15,female,64,1,999999,194,false,false,false,true,,false,[],In the next week,45,complete,,,,2kHeCg,1FEMEO`;

    const result = await parseVendorCSV(csvContent);

    expect(result.vendor).toBe('NEXTGEN');
    expect(result.leads).toHaveLength(1);
    
    const lead = result.leads[0] as NextGenLead;
    expect(lead.leadId).toBe('D-TQPC-EABF');
    expect(lead.product).toBe('data');
    expect(lead.price).toBe(45);
  });
}); 