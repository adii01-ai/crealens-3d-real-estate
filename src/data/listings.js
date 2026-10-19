// Listings shown on the site — replace with the client's real properties.
// `image` is a path inside /public (e.g. '/images/my-house.jpg') or a full URL.
// Current photos are free-to-use stock images from Unsplash; swap in the client's own photos when available.

export const homes = [
  { title: 'Skyline Villa', location: 'Hillside Estates', price: '$1,250,000', beds: 5, baths: 4, area: '4,200 sq ft', tag: 'For sale', image: '/images/skyline-villa.jpg' },
  { title: 'Maple Garden House', location: 'Maple District', price: '$640,000', beds: 4, baths: 3, area: '2,600 sq ft', tag: 'For sale', image: '/images/garden-townhouse.jpg' },
  { title: 'Riverside Apartment', location: 'Old Harbour', price: '$2,800 / mo', beds: 2, baths: 2, area: '1,150 sq ft', tag: 'For rent', image: '/images/riverside-apartment.jpg' },
];

export const commercial = [
  { title: 'Crest Business Tower', location: 'Central Business District', price: '$45 / sq ft / yr', area: '12,000 sq ft', type: 'Office', tag: 'For lease', image: '/images/crest-tower.jpg' },
  { title: 'Market Street Retail', location: 'High Street', price: '$1,900,000', area: '3,400 sq ft', type: 'Retail', tag: 'For sale', image: '/images/market-street-retail.jpg' },
  { title: 'Northgate Logistics Hub', location: 'Northgate Industrial', price: '$9 / sq ft / yr', area: '48,000 sq ft', type: 'Warehouse', tag: 'For lease', image: '/images/northgate-warehouse.jpg' },
];
