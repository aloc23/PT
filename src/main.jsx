import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays, Bus, MapPin, Clock, Trash2, Plus, Search, Calendar,
  List, ChevronLeft, ChevronRight, Users, Settings, Pencil, LogOut, Cloud, CloudOff,
} from "lucide-react";
import "./styles.css";
import { supabase } from "./supabaseClient.js";
import { useAuth } from "./auth/useAuth.js";
import AuthGate from "./auth/AuthGate.jsx";
import { useCloudCollection } from "./data/useCloudCollection.js";

const emptyForm = {
  customerName: "",
  bookingReferenceNumber: "",
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

const DEFAULT_VEHICLE_NAMES = [
  "Mini Bus",
  "Coach",
  "Double Decker",
  "Accessible Bus",
  "Van",
];

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const NOON_TIME = "T12:00:00";

function toDateTime(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`);
}

// ---------- Top-level: gate the whole app on auth ---------------------------

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="authPage">
        <div className="authCard">
          <p style={{ margin: 0, color: "#697792" }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (!user) return <AuthGate />;

  return <App user={user} />;
}

// ---------- The original app, rewired to the cloud --------------------------

function App({ user }) {
  const [form, setForm] = useState(emptyForm);
  const [trips, setTrips, tripsMeta] = useCloudCollection("trips", user);
  const [drivers, setDrivers, driversMeta] = useCloudCollection("drivers", user);
  const [vehicles, setVehicles, vehiclesMeta] = useCloudCollection("vehicles", user);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("bus_viewMode") || "list"
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [quickAddForm, setQuickAddForm] = useState(emptyForm);

  // Driver management state
  const [newDriverName, setNewDriverName] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [showManageDrivers, setShowManageDrivers] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [editingDriverName, setEditingDriverName] = useState("");

  // Vehicle management state
  const [showManageVehicles, setShowManageVehicles] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingVehicleName, setEditingVehicleName] = useState("");

  // Online/offline indicator
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Seed default vehicles for new accounts (only once everything has loaded
  // and we've confirmed the user truly has zero vehicles in the cloud).
  useEffect(() => {
    if (vehiclesMeta.status !== "ready") return;
    if (vehicles.length > 0) return;
    const defaults = DEFAULT_VEHICLE_NAMES.map((name) => ({
      id: crypto.randomUUID(),
      name,
    }));
    setVehicles(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclesMeta.status]);

  // One-time migration: if this device has legacy localStorage data from the
  // pre-cloud version, push it up to the user's cloud (once trips is ready
  // and empty, so we don't clobber anything).
  const [migrateState, setMigrateState] = useState("idle"); // idle | available | running | done
  useEffect(() => {
    if (tripsMeta.status !== "ready" || driversMeta.status !== "ready" || vehiclesMeta.status !== "ready") return;
    const hasLegacy =
      !!localStorage.getItem("bus_trips") ||
      !!localStorage.getItem("bus_drivers");
    if (hasLegacy && migrateState === "idle") setMigrateState("available");
  }, [tripsMeta.status, driversMeta.status, vehiclesMeta.status, migrateState]);

  function runMigration() {
    setMigrateState("running");
    try {
      const legacyTrips = JSON.parse(localStorage.getItem("bus_trips") || "[]");
      const legacyDrivers = JSON.parse(localStorage.getItem("bus_drivers") || "[]");
      const legacyVehicles = JSON.parse(localStorage.getItem("bus_vehicles") || "[]");

      // Avoid duplicates by name where reasonable
      const existingDriverNames = new Set(drivers.map((d) => d.name.toLowerCase()));
      const driversToAdd = legacyDrivers
        .filter((d) => d?.name && !existingDriverNames.has(d.name.toLowerCase()))
        .map((d) => ({ id: crypto.randomUUID(), name: d.name }));
      if (driversToAdd.length > 0) setDrivers([...drivers, ...driversToAdd]);

      const existingVehicleNames = new Set(vehicles.map((v) => v.name.toLowerCase()));
      const vehiclesToAdd = legacyVehicles
        .filter((v) => v?.name && !existingVehicleNames.has(v.name.toLowerCase()))
        .map((v) => ({ id: crypto.randomUUID(), name: v.name }));
      if (vehiclesToAdd.length > 0) setVehicles([...vehicles, ...vehiclesToAdd]);

      const tripsToAdd = legacyTrips.map((t) => ({
        ...t,
        id: t.id || crypto.randomUUID(),
        createdAt: t.createdAt || new Date().toISOString(),
      }));
      if (tripsToAdd.length > 0) setTrips([...trips, ...tripsToAdd]);

      // Clear legacy keys so we don't prompt again. (Keep bus_viewMode — that's
      // a per-device UI preference, not synced.)
      localStorage.removeItem("bus_trips");
      localStorage.removeItem("bus_drivers");
      localStorage.removeItem("bus_vehicles");
      setMigrateState("done");
    } catch (err) {
      console.warn("migration failed", err);
      setMigrateState("done");
    }
  }

  function dismissMigration() {
    localStorage.removeItem("bus_trips");
    localStorage.removeItem("bus_drivers");
    localStorage.removeItem("bus_vehicles");
    setMigrateState("done");
  }

  // ---- Derived state ------------------------------------------------------

  const isCurrentSelectionAvailable = useMemo(() => {
    if (!form.vehicleType || !form.pickupDate || !form.returnDate) return null;
    return isVehicleAvailable(
      form.vehicleType,
      form.pickupDate,
      form.pickupTime,
      form.returnDate,
      form.returnTime
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vehicleType, form.pickupDate, form.pickupTime, form.returnDate, form.returnTime, trips]);

  const filteredTrips = useMemo(() => {
    const q = search.toLowerCase();
    return trips
      .filter((trip) => {
        if (driverFilter && trip.driverName !== driverFilter) return false;
        return [
          trip.customerName,
          trip.bookingReferenceNumber,
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

  const isQuickSelectionAvailable = useMemo(() => {
    if (!quickAddForm.vehicleType || !quickAddForm.pickupDate || !quickAddForm.returnDate) return null;
    return isVehicleAvailable(
      quickAddForm.vehicleType,
      quickAddForm.pickupDate,
      quickAddForm.pickupTime,
      quickAddForm.returnDate,
      quickAddForm.returnTime
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    quickAddForm.vehicleType,
    quickAddForm.pickupDate,
    quickAddForm.pickupTime,
    quickAddForm.returnDate,
    quickAddForm.returnTime,
    trips,
  ]);

  const yearOptions = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => year - 5 + i);
  }, []);

  // ---- Mutations ----------------------------------------------------------

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addTrip(event) {
    event.preventDefault();

    if (createTrip(form)) {
      setForm(emptyForm);
    }
  }

  function createTrip(sourceForm) {
    const pickup = toDateTime(sourceForm.pickupDate, sourceForm.pickupTime);
    const returnDateTime = toDateTime(sourceForm.returnDate, sourceForm.returnTime);

    if (!sourceForm.customerName || !sourceForm.pickupLocation || !sourceForm.dropoffLocation || !pickup || !returnDateTime) {
      alert("Please fill in customer, locations, pickup date/time, and return date/time.");
      return false;
    }

    if (returnDateTime <= pickup) {
      alert("Return date/time must be after pickup date/time.");
      return false;
    }

    if (!isVehicleAvailable(sourceForm.vehicleType, sourceForm.pickupDate, sourceForm.pickupTime, sourceForm.returnDate, sourceForm.returnTime)) {
      alert(`${sourceForm.vehicleType} is not available for the selected dates. Please choose different dates or another vehicle type.`);
      return false;
    }

    const newTrip = {
      ...sourceForm,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setTrips([...trips, newTrip]);
    return true;
  }

  function addQuickTrip(event) {
    event.preventDefault();
    if (createTrip(quickAddForm)) {
      setQuickAddDate(null);
      setQuickAddForm(emptyForm);
    }
  }

  function updateQuickField(field, value) {
    setQuickAddForm((current) => ({ ...current, [field]: value }));
  }

  function deleteTrip(id) {
    setTrips(trips.filter((trip) => trip.id !== id));
  }

  function clearAll() {
    if (!confirm("Delete all schedules?")) return;
    setTrips([]);
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
    setDrivers([...drivers, newDriver]);
    setNewDriverName("");
    updateField("driverName", name);
  }

  function startEditDriver(driver) {
    setEditingDriverId(driver.id);
    setEditingDriverName(driver.name);
  }

  function saveEditDriver() {
    const name = editingDriverName.trim();
    if (!name) {
      alert("Please enter a driver name.");
      return;
    }
    const oldDriver = drivers.find((d) => d.id === editingDriverId);
    if (!oldDriver) return;
    if (
      name.toLowerCase() !== oldDriver.name.toLowerCase() &&
      drivers.some((d) => d.name.toLowerCase() === name.toLowerCase())
    ) {
      alert("A driver with that name already exists.");
      return;
    }
    const oldName = oldDriver.name;
    setDrivers(drivers.map((d) => (d.id === editingDriverId ? { ...d, name } : d)));
    if (oldName !== name) {
      setTrips(
        trips.map((t) => (t.driverName === oldName ? { ...t, driverName: name } : t))
      );
      if (form.driverName === oldName) updateField("driverName", name);
    }
    setEditingDriverId(null);
    setEditingDriverName("");
  }

  function cancelEditDriver() {
    setEditingDriverId(null);
    setEditingDriverName("");
  }

  function deleteDriver(id) {
    const driver = drivers.find((d) => d.id === id);
    if (!driver) return;
    const driverTrips = trips.filter((t) => t.driverName === driver.name);
    const message =
      driverTrips.length > 0
        ? `"${driver.name}" is assigned to ${driverTrips.length} trip(s). Delete anyway?`
        : `Delete driver "${driver.name}"?`;
    if (!confirm(message)) return;
    setDrivers(drivers.filter((d) => d.id !== id));
    if (form.driverName === driver.name) updateField("driverName", "");
  }

  function addVehicle() {
    const name = newVehicleName.trim();
    if (!name) {
      alert("Please enter a vehicle name.");
      return;
    }
    if (vehicles.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      alert("A vehicle with that name already exists.");
      return;
    }
    const newVehicle = { id: crypto.randomUUID(), name };
    setVehicles([...vehicles, newVehicle]);
    setNewVehicleName("");
  }

  function startEditVehicle(vehicle) {
    setEditingVehicleId(vehicle.id);
    setEditingVehicleName(vehicle.name);
  }

  function saveEditVehicle() {
    const name = editingVehicleName.trim();
    if (!name) {
      alert("Please enter a vehicle name.");
      return;
    }
    const oldVehicle = vehicles.find((v) => v.id === editingVehicleId);
    if (!oldVehicle) return;
    if (
      name.toLowerCase() !== oldVehicle.name.toLowerCase() &&
      vehicles.some((v) => v.name.toLowerCase() === name.toLowerCase())
    ) {
      alert("A vehicle with that name already exists.");
      return;
    }
    const oldName = oldVehicle.name;
    setVehicles(
      vehicles.map((v) => (v.id === editingVehicleId ? { ...v, name } : v))
    );
    if (oldName !== name) {
      setTrips(
        trips.map((t) => (t.vehicleType === oldName ? { ...t, vehicleType: name } : t))
      );
      if (form.vehicleType === oldName) updateField("vehicleType", name);
    }
    setEditingVehicleId(null);
    setEditingVehicleName("");
  }

  function cancelEditVehicle() {
    setEditingVehicleId(null);
    setEditingVehicleName("");
  }

  function deleteVehicle(id) {
    setVehicles(vehicles.filter((v) => v.id !== id));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // ---- Calendar / availability helpers ------------------------------------

  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function formatDateForComparison(date) {
    return date.toISOString().split("T")[0];
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
    return filteredTrips.filter((trip) => {
      const tripDates = getDateRange(trip.pickupDate, trip.returnDate || trip.dropoffDate);
      return tripDates.includes(dateStr);
    });
  }

  function isVehicleAvailable(vehicleType, pickupDate, pickupTime, returnDate, returnTime, excludeTripId = null) {
    const reqStart = toDateTime(pickupDate, pickupTime || "00:00");
    const reqEnd = toDateTime(returnDate, returnTime || "23:59");
    if (!reqStart || !reqEnd) return true;

    return !trips.some((trip) => {
      if (trip.id === excludeTripId) return false;
      if (trip.vehicleType !== vehicleType) return false;
      const tripStart = toDateTime(trip.pickupDate, trip.pickupTime || "00:00");
      const tripEnd = toDateTime(
        trip.returnDate || trip.dropoffDate,
        trip.returnTime || trip.dropoffTime || "23:59"
      );
      if (!tripStart || !tripEnd) return false;
      return reqStart < tripEnd && reqEnd > tripStart;
    });
  }

  function navigateMonth(direction) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  }

  function jumpToMonth(monthIndex) {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
  }

  function jumpToYear(year) {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function openQuickAddModal(dateStr) {
    setQuickAddDate(dateStr);
    setQuickAddForm({
      ...emptyForm,
      pickupDate: dateStr,
      returnDate: dateStr,
    });
  }

  function closeQuickAddModal() {
    setQuickAddDate(null);
    setQuickAddForm(emptyForm);
  }

  function openTripModal(trip) { setSelectedTrip(trip); }
  function closeTripModal() { setSelectedTrip(null); }
  function openDayModal(dateStr, dayTrips) { setSelectedDayData({ dateStr, trips: dayTrips }); }
  function closeDayModal() { setSelectedDayData(null); }

  // ---- Render -------------------------------------------------------------

  return (
    <main className="page">
      <section className="hero">
        <div>
          <div className="sessionBar">
            <span className="sessionEmail">
              Signed in as <strong style={{ marginLeft: 4 }}>{user.email || user.id}</strong>
            </span>
            <span className={`syncBadge ${isOnline ? "" : "offline"}`}>
              {isOnline ? <Cloud size={14} /> : <CloudOff size={14} />}
              {isOnline ? "Synced" : "Offline — will sync when online"}
            </span>
            <button className="signOutBtn" onClick={handleSignOut}>
              <LogOut size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Sign out
            </button>
          </div>

          <p className="eyebrow">Priority Transfers</p>
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

      {migrateState === "available" && (
        <div className="migratePrompt">
          <span>
            We found schedules saved on this device from the offline version.
            Move them into your cloud account?
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="primary" onClick={runMigration}>Import</button>
            <button className="iconButton" onClick={dismissMigration}>Dismiss</button>
          </span>
        </div>
      )}

      <section className="grid">
        <form className="card form" onSubmit={addTrip}>
          <h2><Plus size={20} /> New Schedule</h2>
          <ScheduleFormFields
            form={form}
            updateField={updateField}
            vehicles={vehicles}
            drivers={drivers}
            isSelectionAvailable={isCurrentSelectionAvailable}
            onManageVehicles={() => setShowManageVehicles(true)}
            onManageDrivers={() => setShowManageDrivers(true)}
          />

          <button className="primary" type="submit">Add Schedule</button>
        </form>

        <section className="card schedules">
          <div className="toolbar">
            <h2><Bus size={20} /> Schedules</h2>
            <div className="viewControls">
              <div className="viewToggle">
                <button
                  className={`toggleButton ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => { setViewMode("list"); localStorage.setItem("bus_viewMode", "list"); }}
                >
                  <List size={18} />
                  List
                </button>
                <button
                  className={`toggleButton ${viewMode === "calendar" ? "active" : ""}`}
                  onClick={() => { setViewMode("calendar"); localStorage.setItem("bus_viewMode", "calendar"); }}
                >
                  <Calendar size={18} />
                  Calendar
                </button>
                <button
                  className={`toggleButton ${viewMode === "drivers" ? "active" : ""}`}
                  onClick={() => { setViewMode("drivers"); localStorage.setItem("bus_viewMode", "drivers"); }}
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

          {drivers.length > 0 && viewMode !== "drivers" && (
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

          {viewMode === "calendar" && (
            <div className="calendarView">
              <div className="calendarHeader">
                <button className="navButton" onClick={() => navigateMonth(-1)} title="Previous month">
                  <ChevronLeft size={20} />
                </button>
                <div className="calendarHeaderControls">
                  <h3>
                    {currentDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <div className="calendarSelectors">
                    <select
                      value={currentDate.getMonth()}
                      onChange={(e) => jumpToMonth(Number(e.target.value))}
                      aria-label="Select month"
                    >
                      {MONTH_OPTIONS.map((month, index) => (
                        <option key={month} value={index}>{month}</option>
                      ))}
                    </select>
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => jumpToYear(Number(e.target.value))}
                      aria-label="Select year"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <button className="todayButton" type="button" onClick={goToToday}>Today</button>
                  </div>
                </div>
                <button className="navButton" onClick={() => navigateMonth(1)} title="Next month">
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
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
                  const dayTrips = getTripsForDate(dateStr);
                  const isToday = dateStr === formatDateForComparison(new Date());

                  return (
                    <div
                      key={dayNumber}
                      className={`calendarDay ${isToday ? "today" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openQuickAddModal(dateStr)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openQuickAddModal(dateStr);
                        }
                      }}
                      title="Click to add a booking for this date"
                    >
                      <span className="dayNumber">{dayNumber}</span>
                      <div className="addHint">+ Add booking</div>
                      {dayTrips.length > 0 && (
                        <div className="dayTrips">
                          {dayTrips.slice(0, 2).map((trip) => {
                            const isPickupDay = trip.pickupDate === dateStr;
                            const isReturnDay = (trip.returnDate || trip.dropoffDate) === dateStr;
                            return (
                              <div
                                key={trip.id}
                                className={`tripIndicator ${trip.status.toLowerCase().replace(" ", "-")} ${
                                  isPickupDay ? "pickup-day" : isReturnDay ? "return-day" : "middle-day"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTripModal(trip);
                                }}
                              >
                                <span className="tripTime">
                                  {isPickupDay ? `↗ ${trip.pickupTime}` :
                                   isReturnDay ? `↙ ${trip.returnTime || trip.dropoffTime}` :
                                   "━━━"}
                                </span>
                                <span className="tripCustomer">{trip.customerName}</span>
                              </div>
                            );
                          })}
                          {dayTrips.length > 2 && (
                            <div
                              className="moreTrips"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDayModal(dateStr, dayTrips);
                              }}
                            >
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

          {viewMode === "list" && (
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
                        {trip.bookingReferenceNumber && <p>Ref: {trip.bookingReferenceNumber}</p>}
                        {trip.notes && <p className="notes">{trip.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {viewMode === "drivers" && (
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
                          {driverTrips.length} booking{driverTrips.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {driverTrips.length === 0 ? (
                        <div className="driverEmpty">No bookings assigned to this driver.</div>
                      ) : (
                        <div className="tripList">
                          {driverTrips.map((trip) => (
                            <article className="trip" key={trip.id} style={{ cursor: "pointer" }} onClick={() => openTripModal(trip)}>
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
              <button className="modal-close" onClick={closeTripModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="trip-detail-card">
                <div className="trip-detail-header">
                  <h3>{selectedTrip.customerName}</h3>
                  <span className={`badge ${selectedTrip.status.toLowerCase().replace(" ", "-")}`}>{selectedTrip.status}</span>
                </div>

                <div className="trip-details-grid">
                  <div className="detail-item">
                    <Bus size={16} />
                    <div>
                      <span className="detail-label">Vehicle Type</span>
                      <span className="detail-value">{selectedTrip.vehicleType}</span>
                    </div>
                  </div>

                  {selectedTrip.bookingReferenceNumber && (
                    <div className="detail-item">
                      <div className="notes-icon">🔖</div>
                      <div>
                        <span className="detail-label">Booking Reference</span>
                        <span className="detail-value">{selectedTrip.bookingReferenceNumber}</span>
                      </div>
                    </div>
                  )}

                  <div className="detail-item">
                    <Clock size={16} />
                    <div>
                      <span className="detail-label">Pickup</span>
                      <span className="detail-value">{selectedTrip.pickupDate} at {selectedTrip.pickupTime}</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Clock size={16} />
                    <div>
                      <span className="detail-label">Return</span>
                      <span className="detail-value">{selectedTrip.returnDate || selectedTrip.dropoffDate} at {selectedTrip.returnTime || selectedTrip.dropoffTime}</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <MapPin size={16} />
                    <div>
                      <span className="detail-label">Route</span>
                      <span className="detail-value">{selectedTrip.pickupLocation} → {selectedTrip.dropoffLocation}</span>
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
                  <button className="danger" onClick={() => { deleteTrip(selectedTrip.id); closeTripModal(); }}>
                    <Trash2 size={16} />
                    Delete Trip
                  </button>
                  <button className="secondary" onClick={closeTripModal}>Close</button>
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
                  {new Date(selectedDayData.dateStr + NOON_TIME).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
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
                    style={{ cursor: "pointer" }}
                    onClick={() => { closeDayModal(); openTripModal(trip); }}
                  >
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
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {quickAddDate && (
        <div className="modal-overlay" onClick={closeQuickAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                New Booking — {new Date(quickAddDate + NOON_TIME).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <button className="modal-close" onClick={closeQuickAddModal}>×</button>
            </div>
            <div className="modal-body">
              <form className="form" onSubmit={addQuickTrip}>
                <ScheduleFormFields
                  form={quickAddForm}
                  updateField={updateQuickField}
                  vehicles={vehicles}
                  drivers={drivers}
                  isSelectionAvailable={isQuickSelectionAvailable}
                  onManageVehicles={() => setShowManageVehicles(true)}
                  onManageDrivers={() => setShowManageDrivers(true)}
                />
                <div className="modal-actions">
                  <button className="primary" type="submit">Add Schedule</button>
                  <button className="secondary" type="button" onClick={closeQuickAddModal}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Vehicles Modal */}
      {showManageVehicles && (
        <div className="modal-overlay" onClick={() => { setShowManageVehicles(false); cancelEditVehicle(); setNewVehicleName(""); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Bus size={20} /> Manage Vehicles</h2>
              <button className="modal-close" onClick={() => { setShowManageVehicles(false); cancelEditVehicle(); setNewVehicleName(""); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="manageList">
                {vehicles.length === 0 ? (
                  <div className="empty">No vehicles yet. Add one below.</div>
                ) : (
                  vehicles.map((v) => (
                    <div key={v.id} className="manageItem">
                      {editingVehicleId === v.id ? (
                        <div className="manageItemEdit">
                          <input
                            value={editingVehicleName}
                            onChange={(e) => setEditingVehicleName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); saveEditVehicle(); }
                              if (e.key === "Escape") cancelEditVehicle();
                            }}
                            autoFocus
                          />
                          <button type="button" className="primary" onClick={saveEditVehicle}>Save</button>
                          <button type="button" className="iconButton" onClick={cancelEditVehicle}>✕</button>
                        </div>
                      ) : (
                        <div className="manageItemView">
                          <span className="manageItemName">{v.name}</span>
                          <div className="manageItemActions">
                            <button type="button" className="iconButton" onClick={() => startEditVehicle(v)} title="Edit vehicle name">
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="iconButton" onClick={() => deleteVehicle(v.id)} title="Delete vehicle">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="addDriverRow" style={{ marginTop: "16px", borderTop: "1px solid #f0f4f8", paddingTop: "16px" }}>
                <input
                  value={newVehicleName}
                  onChange={(e) => setNewVehicleName(e.target.value)}
                  placeholder="New vehicle name"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVehicle(); } }}
                />
                <button type="button" className="primary" onClick={addVehicle}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Drivers Modal */}
      {showManageDrivers && (
        <div className="modal-overlay" onClick={() => { setShowManageDrivers(false); cancelEditDriver(); setNewDriverName(""); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Users size={20} /> Manage Drivers</h2>
              <button className="modal-close" onClick={() => { setShowManageDrivers(false); cancelEditDriver(); setNewDriverName(""); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="manageList">
                {drivers.length === 0 ? (
                  <div className="empty">No drivers yet. Add one below.</div>
                ) : (
                  drivers.map((d) => (
                    <div key={d.id} className="manageItem">
                      {editingDriverId === d.id ? (
                        <div className="manageItemEdit">
                          <input
                            value={editingDriverName}
                            onChange={(e) => setEditingDriverName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); saveEditDriver(); }
                              if (e.key === "Escape") cancelEditDriver();
                            }}
                            autoFocus
                          />
                          <button type="button" className="primary" onClick={saveEditDriver}>Save</button>
                          <button type="button" className="iconButton" onClick={cancelEditDriver}>✕</button>
                        </div>
                      ) : (
                        <div className="manageItemView">
                          <span className="manageItemName">{d.name}</span>
                          <div className="manageItemActions">
                            <button type="button" className="iconButton" onClick={() => startEditDriver(d)} title="Edit driver name">
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="iconButton" onClick={() => deleteDriver(d.id)} title="Delete driver">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="addDriverRow" style={{ marginTop: "16px", borderTop: "1px solid #f0f4f8", paddingTop: "16px" }}>
                <input
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="New driver name"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDriver(); } }}
                />
                <button type="button" className="primary" onClick={addDriver}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ScheduleFormFields({
  form,
  updateField,
  vehicles,
  drivers,
  isSelectionAvailable,
  onManageVehicles,
  onManageDrivers,
}) {
  return (
    <>
      <label>
        Customer / Company Name
        <input value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} placeholder="Example: Dublin Tours Ltd" />
      </label>

      <label>
        Booking Reference Number
        <input value={form.bookingReferenceNumber} onChange={(e) => updateField("bookingReferenceNumber", e.target.value)} placeholder="e.g. BRN-12345" />
      </label>

      <label>
        Vehicle Type
        <div className="driverInputRow">
          <select value={form.vehicleType} onChange={(e) => updateField("vehicleType", e.target.value)}>
            {form.vehicleType && !vehicles.some((v) => v.name === form.vehicleType) && (
              <option value={form.vehicleType} aria-label={`Vehicle not found: ${form.vehicleType}`}>(missing) {form.vehicleType}</option>
            )}
            {vehicles.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
          </select>
          <button
            type="button"
            className="addDriverBtn"
            onClick={onManageVehicles}
            title="Manage vehicles"
          >
            <Settings size={16} />
            Manage
          </button>
        </div>
        {isSelectionAvailable === false && (
          <div className="availability-warning">
            ⚠️ This vehicle type is not available for the selected dates
          </div>
        )}
        {isSelectionAvailable === true && form.pickupDate && form.returnDate && (
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
            onClick={onManageDrivers}
            title="Manage drivers"
          >
            <Settings size={16} />
            Manage
          </button>
        </div>
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
    </>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
