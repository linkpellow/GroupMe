export const HEADER_ALIASES: Record<string, string> = {
  // Universal fields - name fields
  first_name: 'firstName',
  firstname: 'firstName',
  'first name': 'firstName',
  last_name: 'lastName',
  lastname: 'lastName',
  'last name': 'lastName',

  // Contact fields - EXPANDED phone mappings
  phone: 'phone',
  Phone: 'phone', // Capital P
  PHONE: 'phone', // All caps
  primaryphone: 'phone',
  primary_phone: 'phone',
  phone_number: 'phone',
  phonenumber: 'phone',
  'phone number': 'phone',
  'Phone Number': 'phone', // Title case
  contact_phone: 'phone',
  mobile: 'phone',
  Mobile: 'phone',
  cell: 'phone',
  Cell: 'phone',

  // Name field mappings
  name: 'name',
  Name: 'name',
  NAME: 'name',
  fullname: 'name',
  'full name': 'name',
  'Full Name': 'name',

  // Email mappings
  email: 'email',
  Email: 'email',
  EMAIL: 'email',
  contact_email: 'email',
  'Email Address': 'email',

  // Demographic fields
  dob: 'dob',
  dateofbirth: 'dob',
  dateOfBirth: 'dob', // This is what marketplace CSV uses!
  date_of_birth: 'dob',
  birthdate: 'dob',
  birth_date: 'dob',
  'date of birth': 'dob',
  gender: 'gender',
  Gender: 'gender',
  height: 'height',
  Height: 'height',
  weight: 'weight',
  Weight: 'weight',

  // Address fields
  zipcode: 'zipcode',
  Zipcode: 'zipcode',
  zip: 'zipcode',
  Zip: 'zipcode',
  ZIP: 'zipcode',
  zip_code: 'zipcode',
  postalcode: 'zipcode',
  postalCode: 'zipcode', // This is what marketplace CSV uses!
  postal_code: 'zipcode',
  'postal code': 'zipcode',
  state: 'state',
  State: 'state',
  STATE: 'state',
  city: 'city',
  City: 'city',
  CITY: 'city',

  // NextGen specific fields
  customer_id: 'customerId',
  customer_name: 'name',
  lead_type: 'leadType',
  lead_status: 'leadStatus',

  // Marketplace specific fields
  vendor_name: 'vendorName',
  campaign_name: 'campaignName',
  number_id: 'numberId',
  campaign_id: 'campaignId',
  military: 'military',
  pregnant: 'pregnant',
  tobacco_user: 'tobaccoUser',
  household_size: 'householdSize',
  household_income: 'householdIncome',

  // Other fields
  notes: 'notes',
  Notes: 'notes',
  NOTES: 'notes',
};
