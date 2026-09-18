"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { getBrowserAppContext } from "@/lib/browser-context";
import { rupiah } from "@/lib/ui";
import {
  Banknote,
  Bike,
  Clock3,
  MapPin,
  MinusCircle,
  PackageCheck,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Truck,
  UserRoundPlus,
  X,
} from "lucide-react";

type Branch = {
  id: string;
  name: string;
  is_main: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  pickup_delivery_enabled: boolean;
  pickup_fee: number;
  delivery_fee: number;
  pickup_delivery_fee: number;
  pickup_min_order: number;
  delivery_min_order: number;
  service_area_text: string | null;
};

type Customer = { id: string; full_name: string; phone: string | null; email: string | null; address: string | null };

type CatalogService = {
  service_id: string;
  service_name: string;
  category_id: string | null;
  category_name: string;
  service_kind: string;
  pricing_mode: string;
  unit_label: string;
  resolved_price: number;
  resolved_min_quantity: number;
  resolved_estimated_minutes: number | null;
};

type Item = { service_id: string; quantity: string; unit_price: string; notes: string };
const blankItem: Item = { service_id: "", quantity: "1", unit_price: "0", notes: "" };

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ full_name: "", phone: "", email: "", address: "" });
  const [orderType, setOrderType] = useState("walk_in");
  const [promisedAt, setPromisedAt] = useState("");
  const [promisedManual, setPromisedManual] = useState(false);
  const [items, setItems] = useState<Item[]>([{ ...blankItem }]);
  const [discount, setDiscount] = useState("0");
  const [serviceFee, setServiceFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [logisticsNotes, setLogisticsNotes] = useState("");
  const [paidNow, setPaidNow] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [sourceRequest, setSourceRequest] = useState<any>(null);
  const [sourceRequestItems, setSourceRequestItems] = useState<any[]>([]);
  const [sourcePrepared, setSourcePrepared] = useState(false);

  const currentBranch = branches.find((branch) => branch.id === branchId) || null;

  async function load() {
    const ctx = await getBrowserAppContext();
    if (!ctx) return;
    const activeRequestId = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("request") || "") : "";
    setTenantId(ctx.tenantId);
    const [{ data: branchData }, { data: customerData }] = await Promise.all([
      supabase
        .from("branches")
        .select("id,name,is_main,pickup_enabled,delivery_enabled,pickup_delivery_enabled,pickup_fee,delivery_fee,pickup_delivery_fee,pickup_min_order,delivery_min_order,service_area_text")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true)
        .order("is_main", { ascending: false })
        .order("name"),
      supabase
        .from("customers")
        .select("id,full_name,phone,email,address")
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("full_name")
        .limit(500),
    ]);
    const branchRows = (branchData ?? []) as Branch[];
    const customerRows = (customerData ?? []) as Customer[];
    setBranches(branchRows);
    setCustomers(customerRows);

    if (activeRequestId) {
      const { data: requestRow, error: requestError } = await supabase
        .from("online_order_requests")
        .select("*,online_order_request_items(*)")
        .eq("id", activeRequestId)
        .eq("tenant_id", ctx.tenantId)
        .maybeSingle();
      if (requestError) setError(requestError.message);
      if (requestRow) {
        setSourceRequest(requestRow);
        setSourceRequestItems(requestRow.online_order_request_items ?? []);
        setBranchId(requestRow.branch_id);
        setOrderType(requestRow.request_type === "pickup" ? "pickup" : "walk_in");
        setPickupAddress(requestRow.request_type === "pickup" ? (requestRow.address || "") : "");
        setLogisticsNotes([`Request online ${requestRow.request_number}`, requestRow.notes].filter(Boolean).join(" • "));
        const matched = customerRows.find((row) => row.id === requestRow.customer_id || (row.phone && row.phone === requestRow.customer_phone));
        if (matched) setCustomerId(matched.id);
        else setQuickCustomer({ full_name: requestRow.customer_name || "", phone: requestRow.customer_phone || "", email: requestRow.customer_email || "", address: requestRow.address || "" });
      } else if (branchRows[0]) setBranchId(branchRows[0].id);
    } else if (branchRows[0]) {
      setBranchId(branchRows[0].id);
    }
  }

  async function loadCatalog(id: string) {
    if (!id) return;
    setLoadingCatalog(true);
    const { data, error: catalogError } = await supabase.rpc("get_cashier_catalog", { p_branch_id: id });
    setLoadingCatalog(false);
    if (catalogError) {
      setError(catalogError.message);
      return;
    }
    setCatalog((data ?? []) as CatalogService[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!branchId) return;
    loadCatalog(branchId);
    setItems([{ ...blankItem }]);
    setPromisedManual(false);
    const branch = branches.find((row) => row.id === branchId);
    if (orderType !== "walk_in") {
      const valid = orderType === "pickup" ? branch?.pickup_enabled : orderType === "delivery" ? branch?.delivery_enabled : branch?.pickup_delivery_enabled;
      if (!valid) setOrderType("walk_in");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (!sourceRequest || sourcePrepared || !catalog.length) return;
    const prepared = sourceRequestItems
      .map((row) => {
        const service = catalog.find((item) => item.service_id === row.service_id);
        if (!service) return null;
        return {
          service_id: row.service_id,
          quantity: String(Math.max(Number(row.quantity || 1), Number(service.resolved_min_quantity || 0), 0.1)),
          unit_price: String(service.resolved_price || 0),
          notes: row.notes || "",
        } as Item;
      })
      .filter(Boolean) as Item[];
    if (prepared.length) setItems(prepared);
    setSourcePrepared(true);
  }, [catalog, sourcePrepared, sourceRequest, sourceRequestItems]);

  function serviceFor(id: string) {
    return catalog.find((service) => service.service_id === id);
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function chooseService(index: number, serviceId: string) {
    const service = serviceFor(serviceId);
    updateItem(index, {
      service_id: serviceId,
      unit_price: String(service?.resolved_price ?? 0),
      quantity: String(Math.max(Number(service?.resolved_min_quantity || 0), 1)),
    });
  }

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0),
    [items]
  );

  const logisticsFee = useMemo(() => {
    if (!currentBranch) return 0;
    if (orderType === "pickup") return Number(currentBranch.pickup_fee || 0);
    if (orderType === "delivery") return Number(currentBranch.delivery_fee || 0);
    if (orderType === "pickup_delivery") {
      const combined = Number(currentBranch.pickup_delivery_fee || 0);
      return combined > 0 ? combined : Number(currentBranch.pickup_fee || 0) + Number(currentBranch.delivery_fee || 0);
    }
    return 0;
  }, [currentBranch, orderType]);

  const grand = Math.max(0, subtotal - Number(discount || 0) + Number(serviceFee || 0) + logisticsFee);

  const maxEstimate = useMemo(() => {
    return items.reduce((max, item) => {
      const service = serviceFor(item.service_id);
      return Math.max(max, Number(service?.resolved_estimated_minutes || 0));
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, catalog]);

  useEffect(() => {
    if (!promisedManual && maxEstimate > 0) setPromisedAt(localInputValue(new Date(Date.now() + maxEstimate * 60_000)));
  }, [maxEstimate, promisedManual]);

  useEffect(() => {
    if (Number(paidNow || 0) > grand) setPaidNow(String(grand));
  }, [grand, paidNow]);

  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    if (!keyword) return customers.slice(0, 30);
    return customers.filter((customer) => `${customer.full_name} ${customer.phone || ""} ${customer.email || ""}`.toLowerCase().includes(keyword)).slice(0, 30);
  }, [customers, customerSearch]);

  async function createQuickCustomer() {
    setError("");
    if (!quickCustomer.full_name.trim()) return setError("Nama pelanggan wajib diisi.");
    const { data, error: customerError } = await supabase
      .from("customers")
      .insert({
        tenant_id: tenantId,
        full_name: quickCustomer.full_name.trim(),
        phone: quickCustomer.phone.trim() || null,
        email: quickCustomer.email.trim() || null,
        address: quickCustomer.address.trim() || null,
      })
      .select("id,full_name,phone,email,address")
      .single();
    if (customerError || !data) return setError(customerError?.message || "Gagal menambahkan pelanggan.");
    const row = data as Customer;
    setCustomers((current) => [row, ...current]);
    setCustomerId(row.id);
    setQuickCustomer({ full_name: "", phone: "", email: "", address: "" });
    setShowQuickCustomer(false);
  }

  function validateLogistics() {
    if (!currentBranch) return "Cabang belum dipilih.";
    if (orderType === "pickup" && !currentBranch.pickup_enabled) return "Pickup tidak aktif di cabang ini.";
    if (orderType === "delivery" && !currentBranch.delivery_enabled) return "Delivery tidak aktif di cabang ini.";
    if (orderType === "pickup_delivery" && !currentBranch.pickup_delivery_enabled) return "Pickup + Delivery tidak aktif di cabang ini.";
    if ((orderType === "pickup" || orderType === "pickup_delivery") && subtotal < Number(currentBranch.pickup_min_order || 0)) return `Minimum order pickup ${rupiah(currentBranch.pickup_min_order)}.`;
    if ((orderType === "delivery" || orderType === "pickup_delivery") && subtotal < Number(currentBranch.delivery_min_order || 0)) return `Minimum order delivery ${rupiah(currentBranch.delivery_min_order)}.`;
    if ((orderType === "pickup" || orderType === "pickup_delivery") && !pickupAddress.trim()) return "Alamat pickup wajib diisi.";
    if ((orderType === "delivery" || orderType === "pickup_delivery") && !deliveryAddress.trim()) return "Alamat delivery wajib diisi.";
    return "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!branchId || items.some((item) => !item.service_id)) return setError("Cabang dan semua layanan wajib dipilih.");
    if (items.some((item) => Number(item.quantity) <= 0)) return setError("Jumlah/berat item harus lebih dari 0.");
    const logisticsError = validateLogistics();
    if (logisticsError) return setError(logisticsError);
    const payment = Math.max(0, Math.min(Number(paidNow || 0), grand));
    setSaving(true);

    let effectiveCustomerId = customerId;
    let customer = customers.find((row) => row.id === effectiveCustomerId);

    if (!effectiveCustomerId && sourceRequest) {
      const { data: createdCustomer, error: createdCustomerError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: sourceRequest.customer_name,
          phone: sourceRequest.customer_phone || null,
          email: sourceRequest.customer_email || null,
          address: sourceRequest.address || null,
        })
        .select("id,full_name,phone,email,address")
        .single();
      if (createdCustomerError || !createdCustomer) {
        setSaving(false);
        return setError(createdCustomerError?.message || "Gagal membuat pelanggan dari request online.");
      }
      effectiveCustomerId = createdCustomer.id;
      customer = createdCustomer as Customer;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        branch_id: branchId,
        customer_id: effectiveCustomerId || null,
        customer_name: customer?.full_name || sourceRequest?.customer_name || "Walk-in Customer",
        customer_phone: customer?.phone || sourceRequest?.customer_phone || null,
        order_type: orderType,
        tracking_token: sourceRequest?.public_token || undefined,
        order_source: sourceRequest ? (sourceRequest.request_type === "pickup" ? "online_pickup" : "online_dropoff") : "cashier",
        online_request_id: sourceRequest?.id || null,
        promised_at: promisedAt ? new Date(promisedAt).toISOString() : null,
        discount_amount: Number(discount || 0),
        service_fee: Number(serviceFee || 0),
        delivery_fee: logisticsFee,
        pickup_address: pickupAddress.trim() || null,
        delivery_address: deliveryAddress.trim() || null,
        logistics_notes: logisticsNotes.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      setSaving(false);
      return setError(orderError?.message || "Gagal membuat order.");
    }

    const itemPayload = items.map((item) => {
      const service = serviceFor(item.service_id);
      return {
        tenant_id: tenantId,
        branch_id: branchId,
        order_id: order.id,
        service_id: item.service_id,
        item_name: service?.service_name || "Laundry",
        pricing_mode: service?.pricing_mode || "weight",
        unit_label: service?.unit_label || "kg",
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        notes: item.notes.trim() || null,
      };
    });

    const { error: itemError } = await supabase.from("order_items").insert(itemPayload);
    if (itemError) {
      setSaving(false);
      return setError(itemError.message);
    }

    if (payment > 0) {
      const { error: paymentError } = await supabase.from("payments").insert({
        tenant_id: tenantId,
        branch_id: branchId,
        order_id: order.id,
        amount: payment,
        payment_method: paymentMethod,
        status: "verified",
        transaction_ref: paymentRef.trim() || null,
        verified_at: new Date().toISOString(),
      });
      if (paymentError) {
        setSaving(false);
        return setError(`Order tersimpan, tetapi pembayaran gagal dicatat: ${paymentError.message}`);
      }
    }

    if (sourceRequest?.id) {
      await supabase
        .from("online_order_requests")
        .update({ status: "converted", converted_order_id: order.id })
        .eq("id", sourceRequest.id);
    }

    setSaving(false);
    router.replace(`/orders/${order.id}`);
    router.refresh();
  }

  const orderTypes = [
    { value: "walk_in", label: "Datang ke Toko", icon: ShoppingBag, enabled: true },
    { value: "pickup", label: "Pickup", icon: Bike, enabled: currentBranch?.pickup_enabled === true },
    { value: "delivery", label: "Delivery", icon: Truck, enabled: currentBranch?.delivery_enabled === true },
    { value: "pickup_delivery", label: "Jemput + Antar", icon: MapPin, enabled: currentBranch?.pickup_delivery_enabled === true },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="content-kicker"><ShoppingBag size={14}/> CASHIER POS</div><h1 className="page-title mt-2">Order Baru</h1><p className="muted mt-1">Walk-in cepat, pickup/delivery optional, harga otomatis mengikuti cabang.</p></div>
        <div className="theme-card theme-card-4 px-4 py-3"><div className="text-xs font-bold text-slate-500">Grand Total</div><div className="text-xl font-black">{rupiah(grand)}</div></div>
      </div>

      {sourceRequest && <div className="theme-card theme-card-4 flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="text-xs font-bold uppercase text-slate-400">Konversi Request Online</div><div className="mt-1 font-black">{sourceRequest.request_number} • {sourceRequest.customer_name}</div><div className="text-xs text-slate-500">Data customer, alamat, dan layanan preferensi sudah diprefill. Kasir tetap menimbang dan mengkonfirmasi harga final.</div></div><a href={`/track/${sourceRequest.public_token}`} target="_blank" className="btn-secondary !py-2 text-sm">Buka Tracking</a></div>}

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="premium-panel p-5">
            <div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><ShoppingBag size={18}/></div><div><h2 className="section-title">Cabang & Jenis Order</h2><p className="text-xs text-slate-500">Pilihan antar/jemput hanya muncul jika diaktifkan di cabang.</p></div></div>
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div><label className="label">Cabang</label><select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_main ? " • Utama" : ""}</option>)}</select></div>
              <div><label className="label">Jenis Order</label><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{orderTypes.filter((type) => type.enabled).map((type) => { const Icon = type.icon; const active = orderType === type.value; return <button key={type.value} type="button" onClick={() => setOrderType(type.value)} className={`rounded-2xl p-3 text-left text-xs font-black transition ${active ? "text-white shadow-lg" : "bg-white/60 text-slate-600 hover:bg-white"}`} style={active ? { backgroundImage: "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))" } : undefined}><Icon size={18} className="mb-2"/>{type.label}</button>; })}</div></div>
            </div>
            {currentBranch?.service_area_text && orderType !== "walk_in" && <div className="mt-3 rounded-2xl bg-sky-50/80 p-3 text-sm text-sky-700"><b>Area layanan:</b> {currentBranch.service_area_text}</div>}
          </section>

          <section className="premium-panel p-5">
            <div className="premium-form-head flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Search size={18}/></div><div><h2 className="section-title">Pelanggan</h2><p className="text-xs text-slate-500">Boleh walk-in tanpa data, atau pilih/tambah pelanggan agar histori tersimpan.</p></div></div><button type="button" onClick={() => setShowQuickCustomer(true)} className="btn-secondary gap-2 !py-2 text-sm"><UserRoundPlus size={15}/> Tambah Cepat</button></div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]"><input className="input" placeholder="Cari nama / WhatsApp / email..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}/><select className="input" value={customerId} onChange={(e) => { const id = e.target.value; setCustomerId(id); const customer = customers.find((row) => row.id === id); if (customer?.address) { if (!pickupAddress) setPickupAddress(customer.address); if (!deliveryAddress) setDeliveryAddress(customer.address); } }}><option value="">Walk-in Customer / tanpa akun</option>{filteredCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}{customer.phone ? ` • ${customer.phone}` : ""}</option>)}</select></div>
            {showQuickCustomer && <div className="mt-4 rounded-3xl bg-white/55 p-4 ring-1 ring-white/80"><div className="mb-3 flex items-center justify-between"><div className="font-black">Tambah Pelanggan Cepat</div><button type="button" onClick={() => setShowQuickCustomer(false)} className="rounded-xl bg-white/70 p-2"><X size={16}/></button></div><div className="grid gap-3 md:grid-cols-2"><input className="input" placeholder="Nama pelanggan" value={quickCustomer.full_name} onChange={(e) => setQuickCustomer({ ...quickCustomer, full_name: e.target.value })}/><input className="input" placeholder="WhatsApp" value={quickCustomer.phone} onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}/><input className="input" type="email" placeholder="Email (opsional)" value={quickCustomer.email} onChange={(e) => setQuickCustomer({ ...quickCustomer, email: e.target.value })}/><input className="input" placeholder="Alamat (opsional)" value={quickCustomer.address} onChange={(e) => setQuickCustomer({ ...quickCustomer, address: e.target.value })}/></div><button type="button" onClick={createQuickCustomer} className="btn-primary mt-3 gap-2"><Save size={15}/> Simpan & Pilih</button></div>}
          </section>

          {(orderType === "pickup" || orderType === "delivery" || orderType === "pickup_delivery") && <section className="premium-panel p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Truck size={18}/></div><div><h2 className="section-title">Alamat Antar / Jemput</h2><p className="text-xs text-slate-500">Biaya otomatis mengikuti setting cabang.</p></div></div><div className="grid gap-3 md:grid-cols-2">{(orderType === "pickup" || orderType === "pickup_delivery") && <div><label className="label">Alamat Pickup</label><textarea className="input min-h-24" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Alamat pengambilan cucian"/></div>}{(orderType === "delivery" || orderType === "pickup_delivery") && <div><label className="label">Alamat Delivery</label><textarea className="input min-h-24" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Alamat pengantaran cucian"/></div>}</div><div className="mt-3"><label className="label">Catatan Kurir</label><input className="input" value={logisticsNotes} onChange={(e) => setLogisticsNotes(e.target.value)} placeholder="Patokan rumah, jam pickup, penerima, dll."/></div></section>}

          <section className="premium-panel p-5">
            <div className="premium-form-head flex items-center justify-between"><div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><PackageCheck size={18}/></div><div><h2 className="section-title">Item Laundry</h2><p className="text-xs text-slate-500">Harga dan minimum quantity diambil dari cabang terpilih.</p></div></div><button type="button" onClick={() => setItems((current) => [...current, { ...blankItem }])} className="btn-secondary gap-2 !py-2 text-sm"><Plus size={15}/> Item</button></div>
            {loadingCatalog && <div className="mb-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-700">Memuat katalog cabang...</div>}
            <div className="space-y-3">
              {items.map((item, index) => { const service = serviceFor(item.service_id); return <div key={index} className={`theme-card theme-card-${(index % 8) + 1} p-4`}><div className="grid gap-3 lg:grid-cols-[1fr_120px_160px_44px]"><select className="input" value={item.service_id} onChange={(e) => chooseService(index, e.target.value)} required><option value="">Pilih layanan / paket</option>{catalog.map((row) => <option key={row.service_id} value={row.service_id}>{row.category_name} • {row.service_name} — {rupiah(row.resolved_price)}/{row.unit_label}</option>)}</select><div><input className="input" type="number" step="0.1" min="0.1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })}/><div className="mt-1 text-center text-[10px] text-slate-400">{service?.unit_label || "qty"}</div></div><input className="input" type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(index, { unit_price: e.target.value })}/><button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-30"><MinusCircle size={18}/></button></div><div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"><input className="input" placeholder="Catatan item: noda, warna, jumlah pakaian..." value={item.notes} onChange={(e) => updateItem(index, { notes: e.target.value })}/><div className="rounded-xl bg-white/60 px-4 py-3 text-right"><div className="text-[10px] font-bold uppercase text-slate-400">Subtotal</div><div className="font-black">{rupiah(Number(item.quantity || 0) * Number(item.unit_price || 0))}</div></div></div>{service && <div className="mt-2 text-xs text-slate-500">Minimum {service.resolved_min_quantity || 0} {service.unit_label} • Estimasi {service.resolved_estimated_minutes ? `${Math.round(service.resolved_estimated_minutes / 60)} jam` : "-"}</div>}</div>; })}
            </div>
          </section>

          <section className="premium-panel p-5"><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Estimasi Selesai</label><div className="relative"><Clock3 className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" type="datetime-local" value={promisedAt} onChange={(e) => { setPromisedManual(true); setPromisedAt(e.target.value); }}/></div><div className="mt-1 text-xs text-slate-400">Otomatis mengikuti estimasi layanan terlama; boleh diubah kasir.</div></div><div><label className="label">Catatan Order</label><textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan khusus pelanggan/order..."/></div></div></section>
        </div>

        <aside className="space-y-5">
          <section className="premium-panel sticky top-20 p-5">
            <div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Banknote size={18}/></div><div><h2 className="section-title">Ringkasan Kasir</h2><p className="text-xs text-slate-500">Pembayaran boleh nol, sebagian, atau langsung lunas.</p></div></div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><b>{rupiah(subtotal)}</b></div>
              <div><label className="label">Diskon</label><input className="input text-right" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)}/></div>
              <div><label className="label">Service Fee</label><input className="input text-right" type="number" min="0" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)}/></div>
              <div className="flex justify-between rounded-xl bg-white/55 p-3"><span className="text-slate-500">Biaya antar/jemput</span><b>{rupiah(logisticsFee)}</b></div>
              <div className="border-t border-white/70 pt-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Grand Total</div><div className="mt-1 text-3xl font-black">{rupiah(grand)}</div></div>
              <div className="rounded-3xl bg-white/55 p-4"><div className="mb-3 font-black">Bayar Sekarang</div><div className="mb-2 grid grid-cols-3 gap-2"><button type="button" onClick={() => setPaidNow("0")} className="btn-secondary !px-2 !py-2 text-xs">Belum</button><button type="button" onClick={() => setPaidNow(String(Math.round(grand / 2)))} className="btn-secondary !px-2 !py-2 text-xs">50%</button><button type="button" onClick={() => setPaidNow(String(grand))} className="btn-secondary !px-2 !py-2 text-xs">Lunas</button></div><input className="input text-right" type="number" min="0" max={grand} value={paidNow} onChange={(e) => setPaidNow(e.target.value)}/>{Number(paidNow || 0) > 0 && <div className="mt-3 space-y-2"><select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Transfer</option><option value="qris">QRIS</option><option value="ewallet">E-Wallet</option><option value="other">Lainnya</option></select><input className="input" placeholder="Ref transaksi (opsional)" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}/></div>}</div>
              {error && <div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{error}</div>}
              <button className="btn-primary w-full gap-2" disabled={saving || loadingCatalog}><Save size={17}/>{saving ? "Menyimpan..." : "Buat Order & Masuk Produksi"}</button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
