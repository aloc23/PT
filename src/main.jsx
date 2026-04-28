import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, Bus, MapPin, Clock, Trash2, Plus, Search, Calendar, List, ChevronLeft, ChevronRight, Users, UserPlus } from "lucide-react";
import "./styles.css";

const vehicleTypes = [
  "Mini Bus",
  "Coach",
  "Double Decker",
  "Accessible Bus",
  "Van",
];

const emptyForm = {
  customerName: "",
  vehicleType: "Mini Bus",
  pickupLocation: "",
  dropoffLocation: "",
  pickupDate: "",
  pickupTime: "",
  returnDate: "",
  returnTime: "",
  driverName: "",
  notes: "",
  status: "Scheduled",
};

function loadTrips() {
  try {
    return JSON.parse(localStorage.getItem("bus_trips")) || [];
  } catch {
    return [];
  }
}

function saveTrips(trips) {
  localStorage.setItem("bus_trips", JSON.stringify(trips));
}

function loadDrivers() {
  try {
    return JSON.parse(localStorage.getItem("bus_drivers")) || [];
  } catch {
    return [];
  }
}

function saveDrivers(drivers) {
  localStorage.setItem("bus_drivers", JSON.stringify(drivers));
}

function toDateTime(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`);
}

function App() {
  const [form, setForm] = useState(emptyForm);
  const [trips, setTrips] = useState(loadTrips);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('bus_viewMode') || 'list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);

  // Driver management state
  const [drivers, setDrivers] = useState(loadDrivers);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [driverFilter, setDriverFilter] = useState("");

  const isCurrentSelectionAvailable = useMemo(() => {
    if (!form.vehicleType || !form.pickupDate || !form.returnDate) return null;
    return isVehicleAvailable(form.vehicleType, form.pickupDate, form.pickupTime, form.returnDate, form.returnTime);
  }, [form.vehicleType, form.pickupDate, form.pickupTime, form.returnDate, form.returnTime, trips]);

  const filteredTrips = useMemo(() => {
    const q = search.toLowerCase();
    return trips
      .filter((trip) => {
        if (driverFilter && trip.driverName !== driverFilter) return false;
        return [
          trip.customerName,
          trip.vehicleType,
          trip.pickupLocation,
          trip.dropoffLocation,
          trip.driverName,
          trip.status,
          trip.returnDate || trip.dropoffDate,
          trip.returnTime || trip.dropoffTime,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aTime = toDateTime(a.pickupDate, a.pickupTime)?.getTime() || 0;
        const bTime = toDateTime(b.pickupDate, b.pickupTime)?.getTime() || 0;
        return aTime - bTime;
      });
  }, [trips, search, driverFilter]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addTrip(event) {
    event.preventDefault();

    const pickup = toDateTime(form.pickupDate, form.pickupTime);
    const returnDateTime = toDateTime(form.returnDate, form.returnTime);

    if (!form.customerName || !form.pickupLocation || !form.dropoffLocation || !pickup || !returnDateTime) {
      alert("Please fill in customer, locations, pickup date/time, and return date/time.");
      return;
    }

    if (returnDateTime <= pickup) {
      alert("Return date/time must be after pickup date/time.");
      return;
    }

    // Check vehicle availability
    if (!isVehicleAvailable(form.vehicleType, form.pickupDate, form.pickupTime, form.returnDate, form.returnTime)) {
      alert(`${form.vehicleType} is not available for the selected dates. Please choose different dates or another vehicle type.`);
      return;
    }

    const newTrip = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const nextTrips = [...trips, newTrip];
    setTrips(nextTrips);
    saveTrips(nextTrips);
    setForm(emptyForm);
  }

  function deleteTrip(id) {
    const nextTrips = trips.filter((trip) => trip.id !== id);
    setTrips(nextTrips);
    saveTrips(nextTrips);
  }

  function clearAll() {
    if (!confirm("Delete all schedules?")) return;
    setTrips([]);
    saveTrips([]);
  }

  function addDriver() {
    const name = newDriverName.trim();
    if (!name) {
      alert("Please enter a driver name.");
      return;
    }
    if (drivers.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      alert("A driver with that name already exists.");
      return;
    }
    const newDriver = { id: crypto.randomUUID(), name };
    const next = [...drivers, newDriver];
    setDrivers(next);
    saveDrivers(next);
    setNewDriverName("");
    setShowAddDriver(false);
    updateField("driverName", name);
  }

  function handleNewDriverKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDriver();
    }
  }

  // Calendar helper functions
  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function formatDateForComparison(date) {
    return date.toISOString().split('T')[0];
  }

  function getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(formatDateForComparison(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  function getTripsForDate(dateStr) {
    return filteredTrips.filter(trip => {
      const tripDates = getDateRange(trip.pickupDate, trip.returnDate || trip.dropoffDate);
      return tripDates.includes(dateStr);
    });
  }

  function isVehicleAvailable(vehicleType, pickupDate, pickupTime, returnDate, returnTime, excludeTripId = null) {
    const reqStart = toDateTime(pickupDate, pickupTime || '00:00');
    const reqEnd = toDateTime(returnDate, returnTime || '23:59');

    if (!reqStart || !reqEnd) return true;

    return !trips.some(trip => {
      if (trip.id === excludeTripId) return false;
      if (trip.vehicleType !== vehicleType) return false;

      const tripStart = toDateTime(trip.pickupDate, trip.pickupTime || '00:00');
      const tripEnd = toDateTime(
        trip.returnDate || trip.dropoffDate,
        trip.returnTime || trip.dropoffTime || '23:59'
      );

      if (!tripStart || !tripEnd) return false;

      // Ranges overlap if start1 < end2 AND end1 > start2
      return reqStart < tripEnd && reqEnd > tripStart;
    });
  }

  function navigateMonth(direction) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  }

  function openTripModal(trip) {
    setSelectedTrip(trip);
  }

  function closeTripModal() {
    setSelectedTrip(null);
  }

  function openDayModal(dateStr, dayTrips) {
    setSelectedDayData({ dateStr, trips: dayTrips });
  }

  function closeDayModal() {
    setSelectedDayData(null);
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Bus Driving Company</p>
          <h1>Vehicle Scheduling App</h1>
          <p className="subtitle">
            Schedule vehicle type, pickup/drop-off locations, dates, times, driver, and job status.
          </p>
        </div>
        <div className="heroCard">
          <CalendarDays size={34} />
          <strong>{trips.length}</strong>
          <span>Total trips</span>
        </div>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={addTrip}>
          <h2><Plus size={20} /> New Schedule</h2>

          <label>
            Customer / Company Name
            <input value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} placeholder="Example: Dublin Tours Ltd" />
          </label>

          <label>
            Vehicle Type
            <select value={form.vehicleType} onChange={(e) => updateField("vehicleType", e.target.value)}>
              {vehicleTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            {isCurrentSelectionAvailable === false && (
              <div className="availability-warning">
                ⚠️ This vehicle type is not available for the selected dates
              </div>
            )}
            {isCurrentSelectionAvailable === true && form.pickupDate && form.returnDate && (
              <div className="availability-success">
                ✅ This vehicle type is available for the selected dates
              </div>
            )}
          </label>

          <div className="two">
            <label>
              Pickup Date
              <input type="date" value={form.pickupDate} onChange={(e) => updateField("pickupDate", e.target.value)} />
            </label>
            <label>
              Pickup Time
              <input type="time" value={form.pickupTime} onChange={(e) => updateField("pickupTime", e.target.value)} />
            </label>
          </div>

          <div className="two">
            <label>
              Return Date
              <input type="date" value={form.returnDate} onChange={(e) => updateField("returnDate", e.target.value)} />
            </label>
            <label>
              Return Time
              <input type="time" value={form.returnTime} onChange={(e) => updateField("returnTime", e.target.value)} />
            </label>
          </div>

          <label>
            Pickup Location
            <input value={form.pickupLocation} onChange={(e) => updateField("pickupLocation", e.target.value)} placeholder="Airport Terminal 1" />
          </label>

          <label>
            Drop-off Location
            <input value={form.dropoffLocation} onChange={(e) => updateField("dropoffLocation", e.target.value)} placeholder="City Centre Hotel" />
          </label>

          <label>
            Driver
            <div className="driverInputRow">
              <select
                value={form.driverName}
                onChange={(e) => updateField("driverName", e.target.value)}
              >
                <option value="">— Select driver —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="addDriverBtn"
                onClick={() => setShowAddDriver((v) => !v)}
                title="Add a new driver"
              >
                <UserPlus size={16} />
                {showAddDriver ? "Cancel" : "Add Driver"}
              </button>
            </div>
            {showAddDriver && (
              <div className="addDriverRow">
                <input
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="Driver name"
                  onKeyDown={handleNewDriverKeyDown}
                />
                <button type="button" className="primary" onClick={addDriver}>Save</button>
              </div>
            )}
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </label>

          <label>
            Notes
            <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Passenger count, luggage, route notes..." />
          </label>

          <button className="primary" type="submit">Add Schedule</button>
        </form>

        <section className="card schedules">
          <div className="toolbar">
            <h2><Bus size={20} /> Schedules</h2>
            <div className="viewControls">
              <div className="viewToggle">
                <button 
                  className={`toggleButton ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => { setViewMode('list'); localStorage.setItem('bus_viewMode', 'list'); }}
                >
                  <List size={18} />
                  List
                </button>
                <button 
                  className={`toggleButton ${viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => { setViewMode('calendar'); localStorage.setItem('bus_viewMode', 'calendar'); }}
                >
                  <Calendar size={18} />
                  Calendar
                </button>
                <button
                  className={`toggleButton ${viewMode === 'drivers' ? 'active' : ''}`}
                  onClick={() => { setViewMode('drivers'); localStorage.setItem('bus_viewMode', 'drivers'); }}
                >
                  <Users size={18} />
                  Drivers
                </button>
              </div>
              <button className="danger" onClick={clearAll} disabled={!trips.length}>Clear All</button>
            </div>
          </div>

          <div className="search">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schedules..." />
          </div>

          {drivers.length > 0 && viewMode !== 'drivers' && (
            <div className="driverFilter">
              <Users size={16} />
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
              >
                <option value="">All drivers</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="calendarView">
              <div className="calendarHeader">
                <button className="navButton" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft size={20} />
                </button>
                <h3>
                  {currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                <button className="navButton" onClick={() => navigateMonth(1)}>
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="calendarGrid">
                <div className="dayHeader">Sun</div>
                <div className="dayHeader">Mon</div>
                <div className="dayHeader">Tue</div>
                <div className="dayHeader">Wed</div>
                <div className="dayHeader">Thu</div>
                <div className="dayHeader">Fri</div>
                <div className="dayHeader">Sat</div>
                
                {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                  <div key={`empty-${i}`} className="calendarDay empty"></div>
                ))}
                
                {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                  const dayNumber = i + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                  const dayTrips = getTripsForDate(dateStr);
                  const isToday = dateStr === formatDateForComparison(new Date());
                  
                  return (
                    <div key={dayNumber} className={`calendarDay ${isToday ? 'today' : ''}`}>
                      <span className="dayNumber">{dayNumber}</span>
                      {dayTrips.length > 0 && (
                        <div className="dayTrips">
                          {dayTrips.slice(0, 2).map((trip) => {
                            const isPickupDay = trip.pickupDate === dateStr;
                            const isReturnDay = (trip.returnDate || trip.dropoffDate) === dateStr;
                            const isMiddleDay = !isPickupDay && !isReturnDay;
                            
                            return (
                              <div 
                                key={trip.id} 
                                className={`tripIndicator ${trip.status.toLowerCase().replace(" ", "-")} ${
                                  isPickupDay ? 'pickup-day' : isReturnDay ? 'return-day' : 'middle-day'
                                }`}
                                onClick={() => openTripModal(trip)}
                              >
                                <span className="tripTime">
                                  {isPickupDay ? `↗ ${trip.pickupTime}` : 
                                   isReturnDay ? `↙ ${trip.returnTime || trip.dropoffTime}` : 
                                   '━━━'}
                                </span>
                                <span className="tripCustomer">{trip.customerName}</span>
                              </div>
                            );
                          })}
                          {dayTrips.length > 2 && (
                            <div className="moreTrips" onClick={() => openDayModal(dateStr, dayTrips)}>
                              +{dayTrips.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <>
              {filteredTrips.length === 0 ? (
                <div className="empty">No schedules yet.</div>
              ) : (
                <div className="tripList">
                  {filteredTrips.map((trip) => (
                    <article className="trip" key={trip.id}>
                      <div className="tripTop">
                        <div>
                          <h3>{trip.customerName}</h3>
                          <span className={`badge ${trip.status.toLowerCase().replace(" ", "-")}`}>{trip.status}</span>
                        </div>
                        <button className="iconButton" onClick={() => deleteTrip(trip.id)} aria-label="Delete trip">
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="details">
                        <p><Bus size={16} /> {trip.vehicleType}</p>
                        <p><Clock size={16} /> Pickup: {trip.pickupDate} at {trip.pickupTime}</p>
                        <p><Clock size={16} /> Return: {trip.returnDate || trip.dropoffDate} at {trip.returnTime || trip.dropoffTime}</p>
                        <p><MapPin size={16} /> {trip.pickupLocation} → {trip.dropoffLocation}</p>
                        {trip.driverName && <p>Driver: {trip.driverName}</p>}
                        {trip.notes && <p className="notes">{trip.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {viewMode === 'drivers' && (
            <div className="driversView">
              {drivers.length === 0 ? (
                <div className="empty">No drivers yet. Use the form on the left to add a driver.</div>
              ) : (
                drivers.map((driver) => {
                  const driverTrips = trips
                    .filter((t) => t.driverName === driver.name)
                    .sort((a, b) => {
                      const aTime = toDateTime(a.pickupDate, a.pickupTime)?.getTime() || 0;
                      const bTime = toDateTime(b.pickupDate, b.pickupTime)?.getTime() || 0;
                      return aTime - bTime;
                    });
                  return (
                    <div key={driver.id} className="driverSection">
                      <div className="driverSectionHeader">
                        <div className="driverSectionName">
                          <Users size={18} />
                          {driver.name}
                        </div>
                        <span className="driverTripCount">
                          {driverTrips.length} booking{driverTrips.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {driverTrips.length === 0 ? (
                        <div className="driverEmpty">No bookings assigned to this driver.</div>
                      ) : (
                        <div className="tripList">
                          {driverTrips.map((trip) => (
                            <article className="trip" key={trip.id} style={{ cursor: 'pointer' }} onClick={() => openTripModal(trip)}>
                              <div className="tripTop">
                                <div>
                                  <h3>{trip.customerName}</h3>
                                  <span className={`badge ${trip.status.toLowerCase().replace(" ", "-")}`}>{trip.status}</span>
                                </div>
                              </div>
                              <div className="details">
                                <p><Bus size={16} /> {trip.vehicleType}</p>
                                <p><Clock size={16} /> Pickup: {trip.pickupDate} at {trip.pickupTime}</p>
                                <p><Clock size={16} /> Return: {trip.returnDate || trip.dropoffDate} at {trip.returnTime || trip.dropoffTime}</p>
                                <p><MapPin size={16} /> {trip.pickupLocation} → {trip.dropoffLocation}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </section>

      {/* Trip Details Modal */}
      {selectedTrip && (
        <div className="modal-overlay" onClick={closeTripModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trip Details</h2>
              <button className="modal-close" onClick={closeTripModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="trip-detail-card">
                <div className="trip-detail-header">
                  <h3>{selectedTrip.customerName}</h3>
                  <span className={`badge ${selectedTrip.status.toLowerCase().replace(" ", "-")}`}>
                    {selectedTrip.status}
                  </span>
                </div>

                <div className="trip-details-grid">
                  <div className="detail-item">
                    <Bus size={16} />
                    <div>
                      <span className="detail-label">Vehicle Type</span>
                      <span className="detail-value">{selectedTrip.vehicleType}</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Clock size={16} />
                    <div>
                      <span className="detail-label">Pickup</span>
                      <span className="detail-value">
                        {selectedTrip.pickupDate} at {selectedTrip.pickupTime}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Clock size={16} />
                    <div>
                      <span className="detail-label">Return</span>
                      <span className="detail-value">
                        {selectedTrip.returnDate || selectedTrip.dropoffDate} at {selectedTrip.returnTime || selectedTrip.dropoffTime}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <MapPin size={16} />
                    <div>
                      <span className="detail-label">Route</span>
                      <span className="detail-value">
                        {selectedTrip.pickupLocation} → {selectedTrip.dropoffLocation}
                      </span>
                    </div>
                  </div>

                  {selectedTrip.driverName && (
                    <div className="detail-item">
                      <div className="driver-icon">👤</div>
                      <div>
                        <span className="detail-label">Driver</span>
                        <span className="detail-value">{selectedTrip.driverName}</span>
                      </div>
                    </div>
                  )}

                  {selectedTrip.notes && (
                    <div className="detail-item notes-item">
                      <div className="notes-icon">📝</div>
                      <div>
                        <span className="detail-label">Notes</span>
                        <span className="detail-value notes-text">{selectedTrip.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button className="danger" onClick={() => {
                    deleteTrip(selectedTrip.id);
                    closeTripModal();
                  }}>
                    <Trash2 size={16} />
                    Delete Trip
                  </button>
                  <button className="secondary" onClick={closeTripModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Day Overview Modal */}
      {selectedDayData && (
        <div className="modal-overlay" onClick={closeDayModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {new Date(selectedDayData.dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <button className="modal-close" onClick={closeDayModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="tripList">
                {selectedDayData.trips.map((trip) => (
                  <article
                    className="trip"
                    key={trip.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => { closeDayModal(); openTripModal(trip); }}
                  >
                    <div className="tripTop">
                      <div>
                        <h3>{trip.customerName}</h3>
                        <span className={`badge ${trip.status.toLowerCase().replace(' ', '-')}`}>{trip.status}</span>
                      </div>
                    </div>
                    <div className="details">
                      <p><Bus size={16} /> {trip.vehicleType}</p>
                      <p><Clock size={16} /> Pickup: {trip.pickupDate} at {trip.pickupTime}</p>
                      <p><Clock size={16} /> Return: {trip.returnDate || trip.dropoffDate} at {trip.returnTime || trip.dropoffTime}</p>
                      <p><MapPin size={16} /> {trip.pickupLocation} → {trip.dropoffLocation}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
