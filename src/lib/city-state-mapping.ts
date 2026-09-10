/**
 * City to State mapping for India
 * Used for auto-filling state when city is selected
 */

export const cityStateMapping: Record<string, string> = {
  // Andhra Pradesh
  'hyderabad': 'Andhra Pradesh',
  'visakhapatnam': 'Andhra Pradesh',
  'vijayawada': 'Andhra Pradesh',
  'tirupati': 'Andhra Pradesh',

  // Arunachal Pradesh
  'itanagar': 'Arunachal Pradesh',
  'naharlagun': 'Arunachal Pradesh',

  // Assam
  'guwahati': 'Assam',
  'dibrugarh': 'Assam',
  'silchar': 'Assam',

  // Bihar
  'patna': 'Bihar',
  'gaya': 'Bihar',
  'muzaffarpur': 'Bihar',

  // Chhattisgarh
  'raipur': 'Chhattisgarh',
  'bilaspur': 'Chhattisgarh',
  'durg': 'Chhattisgarh',

  // Goa
  'panaji': 'Goa',
  'margao': 'Goa',
  'vasco da gama': 'Goa',

  // Gujarat
  'ahmedabad': 'Gujarat',
  'surat': 'Gujarat',
  'vadodara': 'Gujarat',
  'rajkot': 'Gujarat',
  'gandhinagar': 'Gujarat',
  'anand': 'Gujarat',
  'jamnagar': 'Gujarat',
  'bhavnagar': 'Gujarat',

  // Haryana
  'faridabad': 'Haryana',
  'gurgaon': 'Haryana',
  'hisar': 'Haryana',
  'rohtak': 'Haryana',
  'chandigarh': 'Haryana',

  // Himachal Pradesh
  'shimla': 'Himachal Pradesh',
  'manali': 'Himachal Pradesh',
  'dharamshala': 'Himachal Pradesh',

  // Jharkhand
  'ranchi': 'Jharkhand',
  'jamshedpur': 'Jharkhand',
  'dhanbad': 'Jharkhand',
  'giridih': 'Jharkhand',

  // Karnataka
  'bangalore': 'Karnataka',
  'bengaluru': 'Karnataka',
  'mysore': 'Karnataka',
  'mangalore': 'Karnataka',
  'pune': 'Karnataka',
  'belagavi': 'Karnataka',
  'hubli': 'Karnataka',
  'tumkur': 'Karnataka',

  // Kerala
  'kochi': 'Kerala',
  'cochin': 'Kerala',
  'thrissur': 'Kerala',
  'kottayam': 'Kerala',
  'thiruvananthapuram': 'Kerala',
  'kozhikode': 'Kerala',
  'kannur': 'Kerala',

  // Madhya Pradesh
  'indore': 'Madhya Pradesh',
  'bhopal': 'Madhya Pradesh',
  'gwalior': 'Madhya Pradesh',
  'jabalpur': 'Madhya Pradesh',
  'ujjain': 'Madhya Pradesh',

  // Maharashtra
  'mumbai': 'Maharashtra',
  'pune': 'Maharashtra',
  'nagpur': 'Maharashtra',
  'aurangabad': 'Maharashtra',
  'nashik': 'Maharashtra',
  'thane': 'Maharashtra',
  'navi mumbai': 'Maharashtra',
  'kalyan': 'Maharashtra',
  'solapur': 'Maharashtra',
  'kolhapur': 'Maharashtra',

  // Manipur
  'imphal': 'Manipur',

  // Meghalaya
  'shillong': 'Meghalaya',

  // Mizoram
  'aizawl': 'Mizoram',

  // Nagaland
  'kohima': 'Nagaland',
  'dimapur': 'Nagaland',

  // Odisha
  'bhubaneswar': 'Odisha',
  'cuttack': 'Odisha',
  'rourkela': 'Odisha',
  'sambalpur': 'Odisha',

  // Punjab
  'chandigarh': 'Punjab',
  'amritsar': 'Punjab',
  'ludhiana': 'Punjab',
  'jalandhar': 'Punjab',
  'patiala': 'Punjab',
  'mohali': 'Punjab',

  // Rajasthan
  'jaipur': 'Rajasthan',
  'jodhpur': 'Rajasthan',
  'udaipur': 'Rajasthan',
  'kota': 'Rajasthan',
  'bikaner': 'Rajasthan',
  'ajmer': 'Rajasthan',

  // Sikkim
  'gangtok': 'Sikkim',

  // Tamil Nadu
  'chennai': 'Tamil Nadu',
  'coimbatore': 'Tamil Nadu',
  'madurai': 'Tamil Nadu',
  'salem': 'Tamil Nadu',
  'tirupur': 'Tamil Nadu',
  'erode': 'Tamil Nadu',
  'thanjavur': 'Tamil Nadu',

  // Telangana
  'hyderabad': 'Telangana',
  'warangal': 'Telangana',
  'nizamabad': 'Telangana',

  // Tripura
  'agartala': 'Tripura',

  // Uttar Pradesh
  'lucknow': 'Uttar Pradesh',
  'kanpur': 'Uttar Pradesh',
  'varanasi': 'Uttar Pradesh',
  'agra': 'Uttar Pradesh',
  'meerut': 'Uttar Pradesh',
  'ghaziabad': 'Uttar Pradesh',
  'noida': 'Uttar Pradesh',
  'greater noida': 'Uttar Pradesh',
  'allahabad': 'Uttar Pradesh',
  'bareilly': 'Uttar Pradesh',
  'mathura': 'Uttar Pradesh',
  'aligarh': 'Uttar Pradesh',

  // Uttarakhand
  'dehradun': 'Uttarakhand',
  'nainital': 'Uttarakhand',
  'rishikesh': 'Uttarakhand',

  // West Bengal
  'kolkata': 'West Bengal',
  'calcutta': 'West Bengal',
  'darjeeling': 'West Bengal',
  'asansol': 'West Bengal',
  'durgapur': 'West Bengal',

  // Delhi
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'dwarka': 'Delhi',
  'gurgaon': 'Delhi',

  // Union Territories
  'pondicherry': 'Puducherry',
  'puducherry': 'Puducherry',
  'lakshadweep': 'Lakshadweep',
  'ladakh': 'Ladakh',
  'jammu': 'Jammu and Kashmir',
  'srinagar': 'Jammu and Kashmir',
  'andaman': 'Andaman and Nicobar Islands',
  'port blair': 'Andaman and Nicobar Islands',
};

/**
 * Get state from city name
 * @param city City name
 * @returns State name or empty string if not found
 */
export function getStateFromCity(city: string): string {
  const normalized = city.toLowerCase().trim();
  return cityStateMapping[normalized] || '';
}

/**
 * Get list of all cities
 */
export function getAllCities(): string[] {
  return Object.keys(cityStateMapping).map(city => 
    city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );
}

/**
 * Get list of all states
 */
export function getAllStates(): string[] {
  const states = new Set(Object.values(cityStateMapping));
  return Array.from(states).sort();
}
