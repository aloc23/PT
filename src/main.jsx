import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, Bus, MapPin, Clock, Trash2, Plus, Search } from "lucide-react";
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
  dropoffDate: "",
  dropoffTime: "",
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

function toDateTime(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`);
}

function App() {
  const [form, setForm] = useState(emptyForm);
  const [trips, setTrips] = useState(loadTrips);
  const [search, setSearch] = useState("");

  const filteredTrips = useMemo(() => {
    const q = search.toLowerCase();
    return trips
      .filter((trip) =>
        [
          trip.customerName,
          trip.vehicleType,
          trip.pickupLocation,
          trip.dropoffLocation,
          trip.driverName,
          trip.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .sort((a, b) => {
        const aTime = toDateTime(a.pickupDate, a.pickupTime)?.getTime() || 0;
        const bTime = toDateTime(b.pickupDate, b.pickupTime)?.getTime() || 0;
        return aTime - bTime;
      });
  }, [trips, search]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addTrip(event) {
    event.preventDefault();

    const pickup = toDateTime(form.pickupDate, form.pickupTime);
    const dropoff = toDateTime(form.dropoffDate, form.dropoffTime);

    if (!form.customerName || !form.pickupLocation || !form.dropoffLocation || !pickup || !dropoff) {
      alert("Please fill in customer, locations, pickup date/time, and drop-off date/time.");
      return;
    }

    if (dropoff <= pickup) {
      alert("Drop-off date/time must be after pickup date/time.");
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
              Drop-off Date
              <input type="date" value={form.dropoffDate} onChange={(e) => updateField("dropoffDate", e.target.value)} />
            </label>
            <label>
              Drop-off Time
              <input type="time" value={form.dropoffTime} onChange={(e) => updateField("dropoffTime", e.target.value)} />
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
            Driver Name
            <input value={form.driverName} onChange={(e) => updateField("driverName", e.target.value)} placeholder="Optional" />
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
            <button className="danger" onClick={clearAll} disabled={!trips.length}>Clear All</button>
          </div>

          <div className="search">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schedules..." />
          </div>

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
                    <p><Clock size={16} /> Drop-off: {trip.dropoffDate} at {trip.dropoffTime}</p>
                    <p><MapPin size={16} /> {trip.pickupLocation} → {trip.dropoffLocation}</p>
                    {trip.driverName && <p>Driver: {trip.driverName}</p>}
                    {trip.notes && <p className="notes">{trip.notes}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
