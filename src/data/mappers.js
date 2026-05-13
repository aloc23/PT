// Translates between the UI's camelCase shape and the DB's snake_case columns.
// Keep these in sync with supabase/migrations/0001_init.sql.

export const tripFromRow = (row) => ({
  id: row.id,
  customerName: row.customer_name ?? "",
  bookingReferenceNumber: row.booking_reference_number ?? "",
  vehicleType: row.vehicle_type ?? "",
  pickupLocation: row.pickup_location ?? "",
  dropoffLocation: row.dropoff_location ?? "",
  pickupDate: row.pickup_date ?? "",
  pickupTime: row.pickup_time ?? "",
  returnDate: row.return_date ?? "",
  returnTime: row.return_time ?? "",
  hasReturnTrip: row.has_return_trip ?? false,
  returnPickupDate: row.return_pickup_date ?? "",
  returnPickupTime: row.return_pickup_time ?? "",
  returnDropoffDate: row.return_dropoff_date ?? "",
  returnDropoffTime: row.return_dropoff_time ?? "",
  driverName: row.driver_name ?? "",
  notes: row.notes ?? "",
  status: row.status ?? "Scheduled",
  createdAt: row.created_at ?? new Date().toISOString(),
});

export const tripToRow = (trip, userId) => ({
  id: trip.id,
  user_id: userId,
  customer_name: trip.customerName ?? "",
  booking_reference_number: trip.bookingReferenceNumber ?? "",
  vehicle_type: trip.vehicleType ?? "",
  pickup_location: trip.pickupLocation ?? "",
  dropoff_location: trip.dropoffLocation ?? "",
  pickup_date: trip.pickupDate || null,
  pickup_time: trip.pickupTime || null,
  return_date: trip.returnDate || trip.dropoffDate || null,
  return_time: trip.returnTime || trip.dropoffTime || null,
  has_return_trip: Boolean(trip.hasReturnTrip),
  return_pickup_date: trip.returnPickupDate || null,
  return_pickup_time: trip.returnPickupTime || null,
  return_dropoff_date: trip.returnDropoffDate || null,
  return_dropoff_time: trip.returnDropoffTime || null,
  driver_name: trip.driverName ?? "",
  notes: trip.notes ?? "",
  status: trip.status ?? "Scheduled",
  created_at: trip.createdAt || new Date().toISOString(),
});

export const namedFromRow = (row) => ({
  id: row.id,
  name: row.name ?? "",
});

export const namedToRow = (item, userId) => ({
  id: item.id,
  user_id: userId,
  name: item.name ?? "",
});

export const collectionConfigs = {
  trips: {
    table: "trips",
    fromRow: tripFromRow,
    toRow: tripToRow,
  },
  drivers: {
    table: "drivers",
    fromRow: namedFromRow,
    toRow: namedToRow,
  },
  vehicles: {
    table: "vehicles",
    fromRow: namedFromRow,
    toRow: namedToRow,
  },
};
