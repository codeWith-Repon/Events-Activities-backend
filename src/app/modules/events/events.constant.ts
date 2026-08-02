export const eventSearchableFields = ["title", "category", "location", "description"]

// `location` and `date` are matched specially in getAllEvents (partial match /
// day range) rather than the exact-equals the other keys get.
export const eventFilterableFields = ["searchTerm", "status", "category", "hostId", "id", "location", "date"]