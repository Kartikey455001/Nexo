"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BusinessSuitePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"listings" | "payments" | "appointments" | "clients">(
    "listings"
  );

  // Listings state
  const [listings, setListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingCurrency, setListingCurrency] = useState("USD");
  const [listingImageUrl, setListingImageUrl] = useState("");
  const [listingCategory, setListingCategory] = useState("General");
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Appointments state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [appointmentClientName, setAppointmentClientName] = useState("");
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentDuration, setAppointmentDuration] = useState("30");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchListings();
    fetchPayments();
    fetchAppointments();
  }, []);

  const fetchListings = async () => {
    setIsLoadingListings(true);
    try {
      const res = await api.get("/business/listings/my").catch(() => ({ data: [] }));
      setListings(res.data || []);
    } catch {
      // silently handled
    } finally {
      setIsLoadingListings(false);
    }
  };

  const fetchPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const res = await api.get("/business/payments/my").catch(() => ({ data: [] }));
      setPayments(res.data || []);
    } catch {
      // silently handled
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await api.get("/business/appointments/my").catch(() => ({ data: [] }));
      setAppointments(res.data || []);
    } catch {
      // silently handled
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  // Handlers for Listings
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingTitle.trim() || !listingPrice) return;
    setIsSubmittingListing(true);
    try {
      await api.post("/business/listings", {
        title: listingTitle.trim(),
        description: listingDescription.trim(),
        price: parseFloat(listingPrice),
        currency: listingCurrency,
        imageUrl: listingImageUrl.trim() || undefined,
        category: listingCategory.trim() || undefined,
        inStock: true,
      });
      setShowAddListingModal(false);
      setListingTitle("");
      setListingDescription("");
      setListingPrice("");
      setListingImageUrl("");
      await fetchListings();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create listing.");
    } finally {
      setIsSubmittingListing(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await api.delete(`/business/listings/${id}`);
      setListings((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert("Failed to delete listing.");
    }
  };

  // Handlers for Payments
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !paymentDescription.trim()) return;
    setIsSubmittingPayment(true);
    try {
      await api.post("/business/payments", {
        customerName: paymentCustomerName.trim() || undefined,
        amount: parseFloat(paymentAmount),
        currency: paymentCurrency,
        description: paymentDescription.trim(),
      });
      setShowAddPaymentModal(false);
      setPaymentCustomerName("");
      setPaymentAmount("");
      setPaymentDescription("");
      await fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create payment request.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleMarkPaymentPaid = async (id: string) => {
    try {
      await api.patch(`/business/payments/${id}/pay`, {
        paymentMethod: "MANUAL_CONFIRMED",
      });
      await fetchPayments();
    } catch {
      alert("Failed to update payment status.");
    }
  };

  // Handlers for Appointments
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentTitle.trim() || !appointmentDate || !appointmentTime) return;
    setIsSubmittingAppointment(true);
    try {
      const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}`);
      await api.post("/business/appointments", {
        clientName: appointmentClientName.trim() || undefined,
        title: appointmentTitle.trim(),
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: parseInt(appointmentDuration) || 30,
        notes: appointmentNotes.trim() || undefined,
        meetingLink: `/chat`,
      });
      setShowAddAppointmentModal(false);
      setAppointmentClientName("");
      setAppointmentTitle("");
      setAppointmentDate("");
      setAppointmentTime("");
      setAppointmentNotes("");
      await fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to schedule appointment.");
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleUpdateAppointmentStatus = async (
    id: string,
    status: "CONFIRMED" | "CANCELLED" | "COMPLETED"
  ) => {
    try {
      await api.patch(`/business/appointments/${id}/status`, { status });
      await fetchAppointments();
    } catch {
      alert("Failed to update appointment status.");
    }
  };

  // Metrics
  const totalRevenue = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingRevenue = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeListingsCount = listings.filter((l) => l.inStock).length;
  const upcomingMeetingsCount = appointments.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED").length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full selection:bg-cyan-300 selection:text-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="p-2.5 rounded-xl glass hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Business Command Center
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-400/20">
                <Sparkles className="w-3 h-3 text-cyan-300" />
                Verified Business
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {user?.businessName || "Your Business"} · Manage listings, client payments, meetings and conversations
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === "listings" && (
            <button
              onClick={() => setShowAddListingModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-md shadow-cyan-400/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Product / Service
            </button>
          )}
          {activeTab === "payments" && (
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-md shadow-cyan-400/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Payment Request
            </button>
          )}
          {activeTab === "appointments" && (
            <button
              onClick={() => setShowAddAppointmentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-md shadow-cyan-400/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Schedule Client Meeting
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Collected Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" /> Paid Invoices
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Pending Payments</span>
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ${pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-400 mt-1 font-mono">Awaiting customer clearance</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Active Listings</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{activeListingsCount}</div>
          <p className="text-[11px] text-cyan-300 mt-1 font-mono">Showcased in client chat</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Upcoming Meetings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-400/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{upcomingMeetingsCount}</div>
          <p className="text-[11px] text-indigo-300 mt-1 font-mono">Scheduled with clients</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("listings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "listings"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Package className="w-4 h-4 text-cyan-300" />
          Catalog Listings ({listings.length})
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "payments"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          Payment Invoices ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "appointments"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-400" />
          Appointments & Meetings ({appointments.length})
        </button>
      </div>

      {/* TAB 1: LISTINGS */}
      {activeTab === "listings" && (
        <div>
          {isLoadingListings ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-300 mb-2" />
              <span>Loading your catalog...</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center bg-white/[0.01]">
              <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No products or listings yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5">
                Add your services, digital products, consulting packages, or items so you can showcase
                and send them directly to clients in chat.
              </p>
              <button
                onClick={() => setShowAddListingModal(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-lg shadow-cyan-400/20 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Your First Listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[#0f141d] overflow-hidden flex flex-col group hover:border-cyan-300/30 transition-all"
                >
                  <div className="h-44 w-full bg-zinc-900 relative overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <Package className="w-10 h-10 mb-1" />
                        <span className="text-[10px]">No image provided</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-medium text-cyan-300 border border-white/10">
                      {item.category || "General"}
                    </span>
                    <button
                      onClick={() => handleDeleteListing(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 hover:bg-rose-500 text-zinc-400 hover:text-white backdrop-blur-md flex items-center justify-center transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                        <span className="font-bold text-sm text-cyan-300">
                          {item.currency} {item.price}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Available / In Stock
                      </span>
                      <Link
                        href="/chat"
                        className="text-cyan-300 hover:underline flex items-center gap-1 font-medium"
                      >
                        Share in Chat
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === "payments" && (
        <div>
          {isLoadingPayments ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
              <span>Loading payment records...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center bg-white/[0.01]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No payment invoices yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5">
                Issue payment requests to clients directly inside chat. Clients can pay with one click,
                and you receive instant verification.
              </p>
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-lg shadow-cyan-400/20 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Payment Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-[#0f141d] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-white">{p.description}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Client: <span className="text-zinc-200">{p.customerName || "Direct Client"}</span> ·{" "}
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                    <div className="text-right">
                      <div className="font-bold text-lg text-white">
                        {p.currency} {p.amount}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {p.status === "PAID" ? `Paid on ${new Date(p.paidAt).toLocaleDateString()}` : "Awaiting payment"}
                      </div>
                    </div>

                    {p.status === "PENDING" && (
                      <button
                        onClick={() => handleMarkPaymentPaid(p.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-md shadow-emerald-500/20"
                      >
                        Confirm Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <div>
          {isLoadingAppointments ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span>Loading scheduled meetings...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center bg-white/[0.01]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No scheduled appointments</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5">
                Schedule client consults, project demos, and review meetings. Send invitations right in
                chat with built-in NEXO video call integration.
              </p>
              <button
                onClick={() => setShowAddAppointmentModal(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-lg shadow-cyan-400/20 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Schedule First Meeting
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-white/10 bg-[#0f141d] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-white">{a.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            a.status === "CONFIRMED"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : a.status === "COMPLETED"
                              ? "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30"
                              : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Client: <span className="text-zinc-200">{a.clientName || "Direct Client"}</span> ·{" "}
                        {a.notes ? a.notes : "NEXO HD Video Meeting"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5 justify-end">
                        <Clock className="w-3.5 h-3.5 text-cyan-300" />
                        {new Date(a.scheduledAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-[10px] text-zinc-500">{a.durationMinutes} minutes duration</div>
                    </div>

                    <Link
                      href="/chat"
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-400/20 inline-flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join Call
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD LISTING */}
      {showAddListingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-300" />
                Add Product or Service Listing
              </h3>
              <button
                onClick={() => setShowAddListingModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  value={listingTitle}
                  onChange={(e) => setListingTitle(e.target.value)}
                  placeholder="e.g. Website Development Package, Consulting (1hr)"
                  className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-cyan-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Currency</label>
                  <select
                    value={listingCurrency}
                    onChange={(e) => setListingCurrency(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#161b26] px-3 text-xs text-zinc-200 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Category</label>
                <input
                  type="text"
                  value={listingCategory}
                  onChange={(e) => setListingCategory(e.target.value)}
                  placeholder="e.g. Consulting, Design, Software, Merchandise"
                  className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={listingDescription}
                  onChange={(e) => setListingDescription(e.target.value)}
                  placeholder="Details of what the client receives..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-cyan-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={listingImageUrl}
                  onChange={(e) => setListingImageUrl(e.target.value)}
                  placeholder="https://example.com/product.jpg"
                  className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-cyan-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddListingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingListing}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-md shadow-cyan-400/20 disabled:opacity-50"
                >
                  {isSubmittingListing ? "Adding..." : "Save Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PAYMENT REQUEST */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Create Client Payment Request
              </h3>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Customer / Client Name
                </label>
                <input
                  type="text"
                  value={paymentCustomerName}
                  onChange={(e) => setPaymentCustomerName(e.target.value)}
                  placeholder="e.g. Acme Corp / Sarah Jenkins"
                  className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Currency</label>
                  <select
                    value={paymentCurrency}
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#161b26] px-3 text-xs text-zinc-200 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Invoice / Request Note *
                </label>
                <textarea
                  rows={3}
                  required
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="e.g. Phase 1 Frontend Deliverables, Retainer for November..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs shadow-md shadow-emerald-400/20 disabled:opacity-50"
                >
                  {isSubmittingPayment ? "Creating..." : "Issue Payment Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD APPOINTMENT */}
      {showAddAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Schedule Client Meeting
              </h3>
              <button
                onClick={() => setShowAddAppointmentModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  placeholder="e.g. Discovery & Requirement Call"
                  className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Client / Attendee Name
                </label>
                <input
                  type="text"
                  value={appointmentClientName}
                  onChange={(e) => setAppointmentClientName(e.target.value)}
                  placeholder="e.g. Jonathan Vance"
                  className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Duration</label>
                <select
                  value={appointmentDuration}
                  onChange={(e) => setAppointmentDuration(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/10 bg-[#161b26] px-3 text-xs text-zinc-200 outline-none"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Notes / Agenda</label>
                <textarea
                  rows={2}
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Meeting agenda and preparation notes..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAppointmentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAppointment}
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSubmittingAppointment ? "Scheduling..." : "Schedule Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
