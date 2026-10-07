import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BatteryMedium, Camera,
  Clock3, Copy, Heart, MapPin, Menu, Minus, PackageCheck, Phone,
  Plus, ScanLine, ScanSearch, Search, ShoppingBag, UserRound, X, Zap,
} from "lucide-react";
import { api, apiMessage } from "./api";
import type { CartItem, OrderAdmin, Product, RepairAdmin, RepairStatus, RepairTrack } from "./types";

const repairStatuses: RepairStatus[] = [
  "Repair Booked", "Device Received", "Device Inspection", "Estimate Generated",
  "Customer Approval", "Repair In Progress", "Testing", "Ready for Pickup", "Delivered",
];
const orderStatuses = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];
const repairOptions = [
  "Screen replacement", "Battery replacement", "Charging problem", "Speaker problem",
  "Microphone problem", "Camera problem", "Software problem", "Water damage",
  "Back glass replacement", "Network problem", "Motherboard repair", "Other / custom problem",
];
const serviceTiles = [
  { name: "Screen replacement", price: "From ₹1,499", icon: ScanLine },
  { name: "Battery replacement", price: "From ₹899", icon: BatteryMedium },
  { name: "Charging problem", price: "From ₹599", icon: Zap },
  { name: "Camera problem", price: "From ₹799", icon: Camera },
];
const shopCategories = ["All", "Cases", "Audio", "Power"];

type Modal = "booking" | "booking-success" | "track" | "account" | "checkout" | "order-success" | "admin" | "search" | "product" | null;
type Offer = { name: string; description: string | null; discountType: string; discountValue: string; minimumOrderAmount: string };
type ReviewItem = { rating: number; comment: string | null; createdAt: string; customerName: string };
type SignedInUser = { id: number; name: string; role: string };
type OrderResult = { orderId: string; status: string; total: number };
type CustomerOrder = { id: number; orderNumber: string; totalAmount: string; status: string; createdAt: string };

function money(value: number | string) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function initialCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem("sk-mobiles-cart") ?? "[]") as CartItem[]; }
  catch { return []; }
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [categories, setCategories] = useState<string[]>(shopCategories);
  const [catalogError, setCatalogError] = useState("");
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [category, setCategory] = useState("All");
  const [modal, setModal] = useState<Modal>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [coupon, setCoupon] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [repairResult, setRepairResult] = useState("");
  const [tracking, setTracking] = useState<RepairTrack | null>(null);
  const [trackingError, setTrackingError] = useState("");
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [signedIn, setSignedIn] = useState<SignedInUser | null>(() => {
    try { return JSON.parse(localStorage.getItem("sk-mobiles-user") ?? "null") as SignedInUser | null; }
    catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [adminTab, setAdminTab] = useState<"repairs" | "orders">("repairs");
  const [adminRepairs, setAdminRepairs] = useState<RepairAdmin[]>([]);
  const [adminOrders, setAdminOrders] = useState<OrderAdmin[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all([api.get<Product[]>("/products"), api.get<string[] | { name: string }[]>("/categories"), api.get<Offer[]>("/offers"), api.get<ReviewItem[]>("/reviews")])
      .then(([productResponse, categoryResponse, offerResponse, reviewResponse]) => {
        if (!live) return;
        setProducts(productResponse.data);
        const names = categoryResponse.data.map((item) => typeof item === "string" ? item : item.name);
        setCategories(["All", ...names]);
        setOffers(offerResponse.data);
        setReviews(reviewResponse.data);
        setCatalogError("");
      })
      .catch((error: unknown) => { if (live) setCatalogError(apiMessage(error)); });
    return () => { live = false; };
  }, []);

  useEffect(() => { localStorage.setItem("sk-mobiles-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    const token = localStorage.getItem("sk-mobiles-token");
    if (!signedIn || !token) { setCustomerOrders([]); return; }
    let live = true;
    api.get<CustomerOrder[]>("/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => { if (live) setCustomerOrders(response.data); })
      .catch(() => { if (live) setCustomerOrders([]); });
    return () => { live = false; };
  }, [signedIn]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.body.classList.toggle("no-scroll", Boolean(modal || cartOpen));
    return () => document.body.classList.remove("no-scroll");
  }, [modal, cartOpen]);

  const visibleProducts = products.filter((product) => {
    const matchesCategory = category === "All" || product.category.toLowerCase() === category.toLowerCase();
    const haystack = `${product.name} ${product.brand ?? ""} ${product.category}`.toLowerCase();
    return matchesCategory && haystack.includes(searchText.toLowerCase());
  });
  const cartDetails = cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.id) })).filter((item) => item.product);
  const subtotal = cartDetails.reduce((total, item) => total + Number(item.product!.price) * item.quantity, 0);
  const estimatedDiscount = coupon.trim().toUpperCase() === "FIX10" && subtotal >= 499 ? Math.round(subtotal * 0.1) : 0;
  const delivery = subtotal >= 999 ? 0 : 49;
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { id: product.id, quantity: 1 }];
    });
    setToast(`${product.name} added to your bag.`);
  }

  function changeQuantity(productId: number, amount: number) {
    setCart((current) => current
      .map((item) => item.id === productId ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  }

  function showModal(next: Modal) {
    setFormError("");
    setTrackingError("");
    setModal(next);
    setCartOpen(false);
    setMenuOpen(false);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await api.post<{ repairId: string }>("/repairs", {
        name: values.get("name"), phone: values.get("phone"), email: values.get("email") || undefined,
        brand: values.get("brand"), model: values.get("model"), imei: values.get("imei") || undefined,
        problem: values.get("problem") || "Repair inspection requested.", service: values.get("service"),
        pickup: (form.elements.namedItem("pickup") as HTMLInputElement).checked,
        delivery: (form.elements.namedItem("delivery") as HTMLInputElement).checked,
      });
      setRepairResult(response.data.repairId);
      showModal("booking-success");
    } catch (error) { setFormError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  async function submitTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setTrackingError("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await api.get<RepairTrack>("/repairs/track", {
        params: { repairId: values.get("repairId"), phone: values.get("phone") },
      });
      setTracking(response.data);
    } catch (error) { setTracking(null); setTrackingError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const mode = String(values.mode);
    try {
      const response = await api.post<{ accessToken: string; user: SignedInUser }>(`/auth/${mode}`, mode === "register"
        ? { name: values.name, email: values.email, phone: values.phone, password: values.password }
        : { identifier: values.identifier, password: values.password });
      localStorage.setItem("sk-mobiles-token", response.data.accessToken);
      localStorage.setItem("sk-mobiles-user", JSON.stringify(response.data.user));
      setSignedIn(response.data.user);
      setToast(`Welcome, ${response.data.user.name.split(" ")[0]}.`);
      setModal(null);
    } catch (error) { setFormError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await api.post<OrderResult>("/orders", {
        name: values.get("name"), phone: values.get("phone"), address: values.get("address"),
        couponCode: coupon.trim() || undefined,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });
      setOrderResult(response.data);
      setCart([]);
      setCoupon("");
      showModal("order-success");
    } catch (error) { setFormError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  async function loadAdmin(key: string) {
    setBusy(true);
    setFormError("");
    try {
      const [repairsResponse, ordersResponse] = await Promise.all([
        api.get<RepairAdmin[]>("/admin/repairs", { headers: { "x-admin-key": key } }),
        api.get<OrderAdmin[]>("/admin/orders", { headers: { "x-admin-key": key } }),
      ]);
      setAdminRepairs(repairsResponse.data);
      setAdminOrders(ordersResponse.data);
      setAdminKey(key);
      setModal("admin");
    } catch (error) { setFormError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  async function updateRepair(repairCode: string, status: string) {
    try {
      await api.patch(`/admin/repairs/${encodeURIComponent(repairCode)}`, { status }, { headers: { "x-admin-key": adminKey } });
      setAdminRepairs((current) => current.map((repair) => repair.repairCode === repairCode ? { ...repair, status: status as RepairStatus } : repair));
      setToast(`${repairCode} updated.`);
    } catch (error) { setFormError(apiMessage(error)); }
  }

  async function updateOrder(orderNumber: string, status: string) {
    try {
      await api.patch(`/admin/orders/${encodeURIComponent(orderNumber)}`, { status }, { headers: { "x-admin-key": adminKey } });
      setAdminOrders((current) => current.map((order) => order.orderNumber === orderNumber ? { ...order, status } : order));
      setToast(`${orderNumber} updated.`);
    } catch (error) { setFormError(apiMessage(error)); }
  }

  function openAdmin() {
    setFormError("");
    if (adminKey) void loadAdmin(adminKey);
    else showModal("admin");
  }

  function renderDialog() {
    if (modal === "booking") return <>
      <p className="dialog-kicker">LET'S GET YOU SORTED</p><h2 id="dialog-title">Book a repair.</h2>
      <p className="dialog-intro">Tell us a little about your phone. We’ll confirm your booking and take it from there.</p>
      <form onSubmit={submitBooking}><div className="form-grid">
        <Field label="Your name *"><input name="name" required minLength={2} autoComplete="name" /></Field>
        <Field label="Mobile number *"><input name="phone" required type="tel" pattern="[0-9+ ()-]{10,20}" autoComplete="tel" /></Field>
        <Field label="Email"><input name="email" type="email" autoComplete="email" /></Field>
        <Field label="Mobile brand *"><select name="brand" required defaultValue=""><option value="" disabled>Choose a brand</option>{["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Nothing", "Other"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Mobile model *"><input name="model" required placeholder="e.g. Galaxy S25" /></Field>
        <Field label="IMEI number"><input name="imei" inputMode="numeric" minLength={15} maxLength={17} /></Field>
        <Field label="What needs fixing? *" full><select name="service" required defaultValue=""><option value="" disabled>Choose a repair</option>{repairOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Tell us what happened" full><textarea name="problem" maxLength={1200} placeholder="A few details help us come prepared." /></Field>
      </div><div className="check-row"><label><input type="checkbox" name="pickup" /> Pickup required</label><label><input type="checkbox" name="delivery" /> Delivery required</label></div>
        {formError && <ErrorMessage>{formError}</ErrorMessage>}<button className="button button-dark form-submit" disabled={busy}>{busy ? "Sending…" : "Request my booking"} <ArrowRight /></button>
      </form>
    </>;

    if (modal === "booking-success") return <>
      <p className="dialog-kicker">YOU'RE IN GOOD HANDS</p><h2 id="dialog-title">Booking requested.</h2>
      <div className="success-box"><strong className="success-code">{repairResult}</strong><p>Keep this repair ID handy to track your phone. We’ll contact you to confirm the next step.</p></div>
      <button className="button button-dark form-submit" onClick={() => { setTracking(null); showModal("track"); }}>Track this repair <ArrowRight /></button>
    </>;

    if (modal === "track") return <>
      <p className="dialog-kicker">NO GUESSING. JUST GOOD UPDATES.</p><h2 id="dialog-title">Track your repair.</h2>
      <p className="dialog-intro">Enter the repair ID from your booking and the mobile number used to book it.</p>
      <form onSubmit={submitTracking}><div className="form-grid">
        <Field label="Repair ID"><input name="repairId" required placeholder="REP-2026-00001" defaultValue={repairResult} /></Field>
        <Field label="Mobile number"><input name="phone" required type="tel" placeholder="Booking phone number" /></Field>
      </div>{trackingError && <ErrorMessage>{trackingError}</ErrorMessage>}<button className="button button-dark form-submit" disabled={busy}>{busy ? "Checking…" : "Show my repair"} <ArrowRight /></button></form>
      {tracking && <RepairProgress repair={tracking} />}
    </>;

    if (modal === "account") return <>
      <p className="dialog-kicker">A LITTLE MORE PERSONAL</p><h2 id="dialog-title">{signedIn ? `Hello, ${signedIn.name.split(" ")[0]}.` : "Welcome back."}</h2>
      {signedIn ? <><p className="dialog-intro">Signed in as {signedIn.name}. Your recent orders are here.</p><div className="customer-order-list">{customerOrders.length ? customerOrders.map((order) => <div className="order-line" key={order.id}><div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.status}</small></div><b>{money(order.totalAmount)}</b></div>) : <p className="empty-orders">No orders on this account yet.</p>}</div><button className="button button-dark form-submit" onClick={() => { localStorage.removeItem("sk-mobiles-token"); localStorage.removeItem("sk-mobiles-user"); setSignedIn(null); setToast("You’re signed out."); setModal(null); }}>Sign out</button></> : <>
        <p className="dialog-intro">Sign in or create an account to keep your orders and repairs together.</p>
        <form onSubmit={submitAccount}><div className="form-grid">
          <Field label="Sign in or register"><select name="mode" defaultValue="login"><option value="login">Sign in</option><option value="register">Create an account</option></select></Field>
          <Field label="Name (registration)"><input name="name" minLength={2} autoComplete="name" /></Field>
          <Field label="Email address"><input name="email" type="email" autoComplete="email" /></Field>
          <Field label="Mobile number"><input name="phone" type="tel" autoComplete="tel" /></Field>
          <Field label="Email or phone (sign in)"><input name="identifier" autoComplete="username" /></Field>
          <Field label="Password"><input name="password" type="password" minLength={8} required autoComplete="current-password" /></Field>
        </div>{formError && <ErrorMessage>{formError}</ErrorMessage>}<button className="button button-dark form-submit" disabled={busy}>{busy ? "Please wait…" : "Continue"} <ArrowRight /></button></form>
      </>}
    </>;

    if (modal === "checkout") return <>
      <p className="dialog-kicker">ALMOST YOURS</p><h2 id="dialog-title">Where should we send it?</h2>
      <p className="dialog-intro">Cash on delivery. Final totals are confirmed by the store before your order is placed.</p>
      <form onSubmit={submitCheckout}><div className="form-grid">
        <Field label="Your name"><input name="name" required defaultValue={signedIn?.name ?? ""} /></Field>
        <Field label="Mobile number"><input name="phone" type="tel" required defaultValue="" /></Field>
        <Field label="Delivery address" full><textarea name="address" minLength={8} required placeholder="House, street, area, city and pincode" /></Field>
      </div><div className="checkout-total"><span>Estimated total</span><strong>{money(subtotal - estimatedDiscount + delivery)}</strong></div>
        {formError && <ErrorMessage>{formError}</ErrorMessage>}<button className="button button-dark form-submit" disabled={busy}>{busy ? "Placing order…" : "Place order · Cash on delivery"} <ArrowRight /></button>
      </form>
    </>;

    if (modal === "order-success" && orderResult) return <>
      <p className="dialog-kicker">THANKS FOR SHOPPING LOCAL</p><h2 id="dialog-title">Order placed.</h2>
      <div className="success-box"><strong className="success-code">{orderResult.orderId}</strong><p>Your order is in. Status: {orderResult.status}.</p></div>
      <p className="dialog-intro">Confirmed total: <strong>{money(orderResult.total)}</strong> · Cash on delivery</p>
      <button className="button button-dark form-submit" onClick={openAdmin}>Open studio dashboard <ArrowRight /></button>
    </>;

    if (modal === "admin") return <>
      <p className="dialog-kicker">THE BACK OF THE HOUSE</p><h2 id="dialog-title">Studio dashboard.</h2>
      {!adminKey ? <><p className="dialog-intro">Enter the admin API key configured on the server.</p><form onSubmit={(event) => { event.preventDefault(); const key = String(new FormData(event.currentTarget).get("adminKey") ?? ""); void loadAdmin(key); }}><Field label="Admin API key"><input name="adminKey" type="password" required autoComplete="current-password" /></Field>{formError && <ErrorMessage>{formError}</ErrorMessage>}<button className="button button-dark form-submit" disabled={busy}>{busy ? "Checking…" : "Open dashboard"} <ArrowRight /></button></form></> : <>
        <div className="admin-stats"><div className="admin-stat"><small>TOTAL CUSTOMERS</small><strong>—</strong></div><div className="admin-stat"><small>OPEN REPAIRS</small><strong>{adminRepairs.filter((repair) => !["Delivered", "Cancelled"].includes(repair.status)).length}</strong></div><div className="admin-stat"><small>ORDERS</small><strong>{adminOrders.length}</strong></div></div>
        <div className="admin-tabbar"><button className={adminTab === "repairs" ? "active" : ""} onClick={() => setAdminTab("repairs")}>REPAIRS ({adminRepairs.length})</button><button className={adminTab === "orders" ? "active" : ""} onClick={() => setAdminTab("orders")}>ORDERS ({adminOrders.length})</button><button onClick={() => { setAdminKey(""); setFormError(""); }}>LOCK</button></div>
        {formError && <ErrorMessage>{formError}</ErrorMessage>}
        <div className="admin-list">{adminTab === "repairs" ? adminRepairs.map((repair) => <div className="admin-row" key={repair.repairCode}><strong>{repair.repairCode}<small>{repair.customerName} · {repair.deviceBrand} {repair.deviceModel}</small></strong><span>{repair.problemDescription}</span><select aria-label={`Status for ${repair.repairCode}`} value={repair.status} onChange={(event) => void updateRepair(repair.repairCode, event.target.value)}>{repairStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>) : adminOrders.map((order) => <div className="admin-row" key={order.orderNumber}><strong>{order.orderNumber}<small>{order.customerName} · {order.customerPhone}</small></strong><span>{money(order.totalAmount)}</span><select aria-label={`Status for ${order.orderNumber}`} value={order.status} onChange={(event) => void updateOrder(order.orderNumber, event.target.value)}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>)}</div>
      </>}
    </>;

    if (modal === "search") return <>
      <p className="dialog-kicker">FIND A GOOD FIX</p><h2 id="dialog-title">What are you looking for?</h2>
      <form className="search-row" onSubmit={(event) => { event.preventDefault(); setModal(null); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }}><input className="search-input" autoFocus placeholder="Try screen repair, battery or charger" value={searchText} onChange={(event) => setSearchText(event.target.value)} /><button className="button button-dark"><Search /> Search</button></form>
    </>;

    if (modal === "product" && selectedProduct) return <>
      <p className="dialog-kicker">{selectedProduct.brand} · {selectedProduct.category.toUpperCase()}</p>
      <div className="product-detail"><img src={selectedProduct.imageUrl ?? ""} alt={selectedProduct.name} /><div><h2 id="dialog-title">{selectedProduct.name}.</h2><div className="detail-rating">★★★★★ <span>Customer favourite</span></div><div className="detail-price">{money(selectedProduct.price)} <del>{money(selectedProduct.mrp)}</del></div><p>{selectedProduct.description}</p><p>{selectedProduct.stockQuantity} in stock · {selectedProduct.warrantyDays}-day warranty</p><button className="button button-dark" onClick={() => { addToCart(selectedProduct); setModal(null); }}>Add to bag <Plus /></button></div></div>
    </>;
    return null;
  }

  return <>
    <div className="announcement"><span>GOOD FIXES. BETTER DAYS.</span><span>Same-day repairs on selected services <button onClick={() => showModal("booking")}>Book a slot <ArrowUpRight /></button></span><button className="announcement-close" aria-label="Dismiss announcement" onClick={(event) => event.currentTarget.parentElement?.remove()}>×</button></div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="SK Mobiles, Accessories and Services"><img className="brand-logo" src="/sk-mobiles-logo.svg" alt="" /><span className="brand-name">SK Mobiles<small>Accessories &amp; Services</small></span></a>
      <nav className={menuOpen ? "main-nav menu-visible" : "main-nav"} aria-label="Main navigation"><a href="#repairs" onClick={() => setMenuOpen(false)}>Repairs</a><a href="#shop" onClick={() => setMenuOpen(false)}>Accessories</a><a href="#offers" onClick={() => setMenuOpen(false)}>Offers</a><a href="#visit" onClick={() => setMenuOpen(false)}>Visit us</a></nav>
      <div className="header-actions"><button className="icon-button search-trigger" aria-label="Search" onClick={() => showModal("search")}><Search /></button><button className="icon-button" aria-label="Account" onClick={() => showModal("account")}><UserRound /></button><button className="cart-trigger" onClick={() => setCartOpen(true)}><ShoppingBag /><span>Bag</span><b>{cartCount}</b></button><button className="menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen((open) => !open)}><Menu /></button></div>
    </header>

    <main id="home">
      <section className="hero"><div className="hero-image" role="img" aria-label="Smartphone ready for careful repair" /><div className="hero-shade" /><div className="hero-content"><p className="eyebrow light"><span /> YOUR NEIGHBOURHOOD PHONE PEOPLE</p><h1>Back in your<br />hands. <em>Better</em><br />than before.</h1><p className="hero-copy">Expert repairs, honest advice and the little things that make your phone feel new again.</p><div className="hero-actions"><button className="button button-lime" onClick={() => showModal("booking")}>Book a repair <ArrowUpRight /></button><a className="button button-outline" href="#shop">Shop accessories <ArrowRight /></a></div><div className="hero-proof"><div className="avatar-stack"><span>S</span><span>K</span><span>+</span></div><div><strong>Local repair team</strong><small>Helpful people, careful work</small></div><span className="proof-divider" /><div><strong>Shere, Karad</strong><small>Visit our repair studio</small></div></div></div><a className="hero-side-note" href="#repairs"><span>01 / REPAIR SERVICES</span><ArrowDownRight /></a></section>
      <div className="ticker"><div className="ticker-track"><span>REPAIRS THAT LAST</span><b>✳</b><span>NO SURPRISES</span><b>✳</b><span>GOOD TECH, BETTER PEOPLE</span><b>✳</b><span>REPAIRS THAT LAST</span><b>✳</b><span>NO SURPRISES</span><b>✳</b><span>GOOD TECH, BETTER PEOPLE</span></div></div>

      <section className="section services-section" id="repairs"><div className="section-heading"><div><p className="eyebrow"><span /> A LITTLE LESS STRESS</p><h2>We’ll get you<br /><em>reconnected.</em></h2></div><div className="heading-aside"><p>Cracked screen, stubborn battery or a phone that took an unexpected swim? We’ve seen it, fixed it, and can help you too.</p><button className="text-link" onClick={() => showModal("booking")}>Explore all repairs <ArrowUpRight /></button></div></div><div className="service-grid">{serviceTiles.map(({ name, price, icon: Icon }, index) => <button className="service-card" key={name} onClick={() => { showModal("booking"); setTimeout(() => { const select = document.querySelector<HTMLSelectElement>('select[name="service"]'); if (select) select.value = name; }, 0); }}><span className="service-number">0{index + 1}</span><span className="service-icon"><Icon /></span><span className="service-title">{name.split(" ").slice(0, -1).join(" ")}<br />{name.split(" ").at(-1)}</span><span className="service-meta">{price} <ArrowUpRight /></span></button>)}</div><div className="repair-track-strip"><span className="track-icon"><ScanSearch /></span><div><strong>Already left your phone with us?</strong><small>See exactly where things stand. No “just checking in” calls needed.</small></div><button className="button button-dark" onClick={() => { setTracking(null); showModal("track"); }}>Track your repair <ArrowUpRight /></button></div></section>

      <section className="offer-band" id="offers"><div className="offer-sticker">A LITTLE<br />TREAT <span>✳</span></div><div className="offer-content"><p className="eyebrow light"><span /> THE GOOD STUFF, FOR LESS</p><h2>Good things<br />come in <em>pairs.</em></h2><p>{offers[0]?.description ?? "Take 10% off your first accessories order. Your phone called it."}</p><button className="offer-code" onClick={() => { void navigator.clipboard?.writeText("FIX10"); setToast("Coupon FIX10 copied."); }}><span>YOUR CODE</span><strong>FIX10</strong><Copy /></button></div><div className="offer-image" role="img" aria-label="Mobile accessories" /><div className="offer-footnote">Minimum order ₹499. Terms apply.</div></section>

      <section className="section shop-section" id="shop"><div className="section-heading shop-heading"><div><p className="eyebrow"><span /> THE FINISHING TOUCH</p><h2>Small upgrades.<br /><em>Big difference.</em></h2></div><div className="heading-aside"><p>Good-looking, hard-working accessories picked by people who actually use them.</p><a className="text-link" href="#shop-grid">Shop all accessories <ArrowUpRight /></a></div></div><div className="shop-controls"><div className="category-tabs" role="tablist" aria-label="Product categories">{(categories.length ? categories : shopCategories).map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item === "All" ? "Everything" : item}</button>)}</div><label className="sort-label">{catalogError ? "CATALOG CONNECTION" : "CURATED FOR YOUR EVERYDAY"} <ArrowDownRight /></label></div>
        {catalogError ? <div className="catalog-message"><PackageCheck /><div><strong>Product catalogue is not connected yet.</strong><small>Configure the MySQL connection and run the seed SQL to load products.</small></div></div> : <div className="product-grid" id="shop-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><div className="product-photo" onClick={() => { setSelectedProduct(product); showModal("product"); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") { setSelectedProduct(product); showModal("product"); } }}><img src={product.imageUrl ?? ""} alt={product.name} loading="lazy" /><span className="product-badge">{product.stockQuantity > 0 ? "IN STOCK" : "SOLD OUT"}</span><button className={`wishlist-button ${wishlist.includes(product.id) ? "liked" : ""}`} aria-label="Toggle wishlist" onClick={(event) => { event.stopPropagation(); setWishlist((items) => items.includes(product.id) ? items.filter((id) => id !== product.id) : [...items, product.id]); }}><Heart fill={wishlist.includes(product.id) ? "currentColor" : "none"} /></button></div><div className="product-info"><div><span className="product-category">{product.brand ?? "SK MOBILES"} · {product.category.toUpperCase()}</span><h3>{product.name}</h3><div className="product-rating"><span>★</span> 4.8 <span>·</span> In stock: {product.stockQuantity}</div></div><div className="product-price"><del>{money(product.mrp)}</del>{money(product.price)}</div></div><button className="add-to-bag" disabled={product.stockQuantity < 1} onClick={() => addToCart(product)}>{product.stockQuantity < 1 ? "Out of stock" : "Add to bag"} <Plus /></button></article>)}{!visibleProducts.length && <div className="catalog-message">No accessories match this category yet.</div>}</div>}
      </section>

      <section className="why-section"><div className="why-image" role="img" aria-label="Mobile repair technician at work"><span>GOOD HANDS.<br /><em>GOOD AS NEW.</em></span></div><div className="why-content"><p className="eyebrow"><span /> WHY SK MOBILES?</p><h2>People first.<br />Phones second.</h2><p className="why-intro">Getting a phone fixed shouldn’t feel like a gamble. We keep it simple: straight answers, skilled hands and repairs we’re proud to put our name on.</p><div className="why-points"><div><span>01</span><p><strong>We tell it straight</strong><small>Clear estimates before we pick up a tool. Always.</small></p></div><div><span>02</span><p><strong>Good parts, proper work</strong><small>Quality components, checked by the people who fit them.</small></p></div><div><span>03</span><p><strong>We stand by our fixes</strong><small>Every repair comes with a 90-day service warranty.</small></p></div></div></div></section>

      {reviews.length > 0 && <section className="reviews-section"><div className="review-top"><p className="eyebrow light"><span /> KIND WORDS, KEPT REAL</p><div className="review-rating"><strong>{reviews[0].rating.toFixed(1)}</strong><span>{"★".repeat(reviews[0].rating)}<small>APPROVED CUSTOMER REVIEW</small></span></div></div><blockquote>“{reviews[0].comment}”</blockquote><div className="review-bottom"><span>{reviews[0].customerName.toUpperCase()} <small>CUSTOMER REVIEW · {new Date(reviews[0].createdAt).toLocaleDateString("en-IN")}</small></span><span>{reviews.length} approved review{reviews.length === 1 ? "" : "s"}</span></div></section>}

      <section className="visit-section" id="visit"><div className="visit-copy"><p className="eyebrow"><span /> COME SAY HELLO</p><h2>Good fixes.<br /><em>Right around</em><br />the corner.</h2><p>Visit SK Mobiles for a repair, a quick check or help choosing an accessory.</p><div className="visit-details"><div><MapPin /><p><strong>SK Mobiles Repair Studio</strong><small>Near Shere Station, Tal. Karad, Dist. Satara, Maharashtra 415108</small></p></div><div><UserRound /><p><strong>Suyog Sanjay Kalaskar</strong><small>Business contact · +91 77700 86388</small></p></div><div><Clock3 /><p><strong>Mon – Sat, 10am – 8pm</strong><small>Sunday, 11am – 5pm</small></p></div></div><div className="visit-actions"><a className="button button-dark" href="tel:+917770086388"><Phone /> Call the studio</a><a className="button button-light" href="https://wa.me/917770086388" target="_blank" rel="noreferrer"><UserRound /> WhatsApp us</a></div></div><a className="map-panel map-link" href="https://www.google.com/maps/search/?api=1&amp;query=SK%20Mobiles%2C%20Near%20Shere%20Station%2C%20Tal.%20Karad%2C%20Dist.%20Satara%2C%20Maharashtra%20415108" target="_blank" rel="noopener noreferrer" aria-label="Open SK Mobiles near Shere Station in Google Maps"><div className="map-grid" /><div className="map-route" /><div className="map-pin"><span><MapPin /></span><strong>SK Mobiles</strong><small>Shere Station</small></div><div className="map-label label-one">SHERE</div><div className="map-label label-two">KARAD</div><div className="map-label label-three">SATARA</div><span className="map-open">OPEN IN GOOGLE MAPS <ArrowUpRight /></span></a></section>
    </main>

    <footer className="site-footer"><a className="brand footer-brand" href="#home"><img className="brand-logo" src="/sk-mobiles-logo.svg" alt="" /><span className="brand-name">SK Mobiles</span></a><p>Accessories &amp; Services · Good fixes. Better days.</p><div className="footer-links"><a href="#repairs">Repairs</a><a href="#shop">Accessories</a><button onClick={() => { setTracking(null); showModal("track"); }}>Track a repair</button><button onClick={openAdmin}>Admin</button></div><span>© 2026 SK Mobiles, Accessories &amp; Services</span></footer>

    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" aria-label="Close dialog" onClick={() => setModal(null)}><X /></button>{renderDialog()}</section></div>}
    <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-label="Shopping bag" aria-hidden={!cartOpen}><div className="drawer-head"><div><p className="eyebrow"><span /> YOUR EVERYDAY KIT</p><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" aria-label="Close shopping bag" onClick={() => setCartOpen(false)}><X /></button></div><div className="cart-items">{cartDetails.length ? cartDetails.map((item) => <div className="cart-line" key={item.id}><img src={item.product!.imageUrl ?? ""} alt="" /><div><h3>{item.product!.name}</h3><p>{item.product!.brand}</p><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => changeQuantity(item.id, -1)}><Minus /></button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => changeQuantity(item.id, 1)}><Plus /></button></div></div><div><span className="line-price">{money(Number(item.product!.price) * item.quantity)}</span><button className="remove-item" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}>Remove</button></div></div>) : <div className="empty-state"><ShoppingBag /><br />Your bag is taking a little breather.<br />Find something good for your phone in the shop.</div>}</div>{cartDetails.length > 0 && <div className="cart-bottom"><div className="coupon-row"><input aria-label="Coupon code" placeholder="Coupon code" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} /><span>FIX10</span></div><div className="totals"><div><span>Subtotal</span><span>{money(subtotal)}</span></div>{estimatedDiscount > 0 && <div><span>FIX10 discount estimate</span><span>−{money(estimatedDiscount)}</span></div>}<div><span>Delivery {delivery === 0 ? "· free" : ""}</span><span>{delivery === 0 ? "FREE" : money(delivery)}</span></div><div className="total"><span>Estimated total</span><span>{money(subtotal - estimatedDiscount + delivery)}</span></div></div><button className="button button-dark checkout-button" onClick={() => { setFormError(""); setCartOpen(false); setModal("checkout"); }}>Continue to checkout <ArrowRight /></button></div>}</aside>
    {cartOpen && <button className="drawer-backdrop" aria-label="Close shopping bag" onClick={() => setCartOpen(false)} />}
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </>;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={`field ${full ? "full" : ""}`}><label>{label}{children}</label></div>;
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="form-error" role="alert">{children}</p>;
}

function RepairProgress({ repair }: { repair: RepairTrack }) {
  const current = repairStatuses.indexOf(repair.status);
  return <div className="tracking-result"><p className="dialog-kicker">REPAIR STATUS · {repair.repairId}</p><h3>{repair.status}.</h3><p className="dialog-intro">Your {repair.brand} {repair.model} is in good hands. Here’s the latest.</p><div className="timeline">{repairStatuses.map((status, index) => <div className={`timeline-step ${index < current ? "done" : ""} ${index === current ? "current" : ""}`} key={status}><span className="timeline-dot" /><div><strong>{status}</strong><small>{repair.history.find((item) => item.status === status)?.createdAt ? new Date(repair.history.find((item) => item.status === status)!.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : index < current ? "Complete" : "Up next"}</small></div></div>)}</div><div className="repair-summary"><div><span>ISSUE</span><strong>{repair.problem}</strong></div><div><span>TECHNICIAN</span><strong>{repair.technician ?? "Being assigned"}</strong></div><div><span>ESTIMATED COST</span><strong>{repair.estimatedCost ? money(repair.estimatedCost) : "After inspection"}</strong></div><div><span>EXPECTED COMPLETION</span><strong>{repair.expectedCompletion ? new Date(repair.expectedCompletion).toLocaleDateString("en-IN") : "We’ll confirm shortly"}</strong></div></div>{repair.diagnosis && <p className="tracking-diagnosis"><strong>Latest note</strong><br />{repair.diagnosis}</p>}</div>;
}

export default App;