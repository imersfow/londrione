import Link from "next/link";
import {
  ArrowRight,
  Bike,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { normalizeTheme, themeCssVars } from "@/lib/theme";
import {
  formatEstimate,
  normalizeHomepageConfig,
  type PublicHomepageData,
  waLink,
} from "@/lib/homepage";
import { rupiah } from "@/lib/ui";

function branchAddress(branch: PublicHomepageData["selected_branch"]) {
  if (!branch) return "";
  return [branch.address, branch.city, branch.province].filter(Boolean).join(", ");
}

export function PublicHomepage({ data }: { data: PublicHomepageData }) {
  const config = normalizeHomepageConfig(data.homepage_config);
  const theme = normalizeTheme(data.theme_config);
  const branch = data.selected_branch ?? null;
  const branches = data.branches ?? [];
  const services = data.services ?? [];
  const hasMultipleBranches = branches.length > 1;
  const hasSingleBranch = branches.length === 1;
  const businessName = data.business_name || "Laundry";
  const appName = data.app_name || businessName;
  const wa = waLink(branch?.phone, `Halo ${businessName}, saya ingin bertanya tentang layanan laundry${branch?.name ? ` di ${branch.name}` : ""}.`);
  const heroStyle = config.hero_background_url
    ? {
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 82%, transparent), color-mix(in srgb, var(--brand-secondary) 82%, transparent)), url(${config.hero_background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const grouped = services.reduce<Record<string, typeof services>>((acc, service) => {
    const key = service.category_name || "Layanan";
    (acc[key] ||= []).push(service);
    return acc;
  }, {});

  return (
    <div className="public-home min-h-screen text-slate-900" style={themeCssVars(theme)}>
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200">
              {data.logo_url ? <img src={data.logo_url} alt={appName} className="h-full w-full object-cover"/> : <span className="text-lg font-black" style={{color:"var(--brand-primary)"}}>{appName.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="min-w-0"><div className="truncate text-lg font-black">{appName}</div><div className="hidden truncate text-xs text-slate-500 sm:block">{data.app_tagline}</div></div>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#prices" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex">Harga</a>
            <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">Login</Link>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="public-btn-primary"><MessageCircle size={16}/> WhatsApp</a>}
          </div>
        </div>
      </header>

      <main>
        <section className="public-hero" style={heroStyle}>
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="public-kicker"><Sparkles size={15}/> {config.hero_badge}</div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{config.hero_title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{hasMultipleBranches ? config.hero_subtitle : config.hero_subtitle.replace(/,? dan cabang yang paling dekat dengan Anda\.?/i, ".").replace(/cabang yang paling dekat dengan Anda\.?/i, "")}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {config.show_prices && <a href="#prices" className="public-btn-primary">{config.hero_cta_label}<ArrowRight size={17}/></a>}
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="public-btn-secondary"><MessageCircle size={17}/>{config.hero_secondary_label}</a>}
              </div>
              {branch && <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-600"><span className="public-chip"><MapPin size={14}/>{branch.name}</span>{branch.opening_hours && <span className="public-chip"><Clock3 size={14}/>{branch.opening_hours}</span>}{branch.pickup_enabled && <span className="public-chip"><Bike size={14}/>Pickup tersedia</span>}{branch.delivery_enabled && <span className="public-chip"><Truck size={14}/>Delivery tersedia</span>}</div>}
            </div>
            <div className="public-hero-card">
              <div className="text-xs font-black uppercase tracking-[.18em] text-slate-500">Cabang Aktif</div>
              <div className="mt-2 text-2xl font-black">{branch?.name || "Cabang Utama"}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">{branchAddress(branch) || "Alamat cabang dapat diatur dari dashboard."}</div>
              <div className={`mt-5 grid gap-3 ${hasMultipleBranches ? "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                <div className="public-mini-card"><PackageCheck size={18}/><div><div className="font-black">{services.length}</div><div className="text-xs text-slate-500">Layanan publik</div></div></div>
                {hasMultipleBranches && <div className="public-mini-card"><Shirt size={18}/><div><div className="font-black">{branches.length}</div><div className="text-xs text-slate-500">Cabang tersedia</div></div></div>}
              </div>
              {(branch?.pickup_enabled || branch?.delivery_enabled) && <div className="mt-5 rounded-2xl bg-white/60 p-4 text-sm text-slate-600 ring-1 ring-white/80"><b className="text-slate-800">Antar jemput:</b> {[branch.pickup_enabled ? "Pickup" : "", branch.delivery_enabled ? "Delivery" : ""].filter(Boolean).join(" & ")}{branch.service_area_text ? ` • ${branch.service_area_text}` : ""}{branch.delivery_radius_km ? ` • Radius ${branch.delivery_radius_km} km` : ""}</div>}
            </div>
          </div>
        </section>

        {config.show_branches && hasMultipleBranches && <section className="public-section public-section-soft">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="public-section-head"><div><div className="public-kicker">CABANG</div><h2>{config.branches_title}</h2><p>Pilih cabang untuk melihat harga, estimasi, dan layanan yang berlaku di lokasi tersebut.</p></div></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {branches.map((item, index) => <Link key={item.id} href={`/?branch=${item.id}`} className={`public-branch-card ${item.id === branch?.id ? "public-branch-card-active" : ""}`} style={{backgroundImage:`linear-gradient(135deg,var(--card-${(index%8)+1}-from),var(--card-${(index%8)+1}-to))`}}>
                <div className="flex items-start justify-between gap-4"><div><div className="text-lg font-black">{item.name}</div><div className="mt-1 text-sm text-slate-500">{[item.city,item.province].filter(Boolean).join(", ") || item.address || "Alamat belum diisi"}</div></div>{item.is_main && <span className="public-badge">Utama</span>}</div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">{item.pickup_enabled && <span className="public-chip">Pickup</span>}{item.delivery_enabled && <span className="public-chip">Delivery</span>}{item.opening_hours && <span className="public-chip">{item.opening_hours}</span>}</div>
              </Link>)}
            </div>
          </div>
        </section>}

        {config.show_services && services.length > 0 && <section className="public-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="public-section-head"><div><div className="public-kicker">LAYANAN</div><h2>{config.services_title}</h2><p>{config.services_subtitle}</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.slice(0,12).map((service,index)=><div key={service.id} className="public-service-card" style={{backgroundImage:`linear-gradient(135deg,var(--card-${(index%8)+1}-from),var(--card-${(index%8)+1}-to))`}}><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/65" style={{color:"var(--brand-primary)"}}><Shirt size={19}/></div><div className="mt-4 text-xs font-black uppercase tracking-[.12em] text-slate-400">{service.category_name}</div><div className="mt-1 text-lg font-black">{service.name}</div><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{service.description || "Layanan laundry profesional untuk kebutuhan Anda."}</p>{service.estimated_minutes ? <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-600"><Clock3 size={13}/>{formatEstimate(service.estimated_minutes)}</div> : null}</div>)}
            </div>
          </div>
        </section>}

        {config.show_prices && services.length > 0 && <section id="prices" className="public-section public-section-soft scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="public-section-head"><div><div className="public-kicker">HARGA CABANG</div><h2>{config.prices_title}</h2><p>{hasMultipleBranches ? config.prices_subtitle : config.prices_subtitle.replace(/Harga dapat berbeda di setiap cabang\.?/i, "Harga layanan yang tersedia saat ini.")} {hasMultipleBranches && branch ? `Saat ini menampilkan ${branch.name}.` : ""}</p></div></div>
            <div className="space-y-5">
              {Object.entries(grouped).map(([category, items])=><div key={category} className="public-price-group"><div className="public-price-group-head"><div><div className="text-xs font-black uppercase tracking-[.15em] text-white/75">Kategori</div><div className="mt-1 text-xl font-black text-white">{category}</div></div><div className="rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white">{items.length} layanan</div></div><div className="divide-y divide-slate-100/80">{items.map((service)=><div key={service.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><div className="font-black">{service.name}</div><div className="mt-1 text-xs text-slate-500">{service.min_quantity ? `Min. ${service.min_quantity} ${service.unit_label || ""}` : service.service_kind === "package" ? "Paket laundry" : `Per ${service.unit_label || "layanan"}`}</div></div><div className="text-sm font-bold text-slate-500">{service.estimated_minutes ? formatEstimate(service.estimated_minutes) : "Estimasi hubungi kami"}</div><div className="text-right"><div className="text-lg font-black" style={{color:"var(--brand-primary)"}}>{service.price_visible && service.price != null ? rupiah(service.price) : "Hubungi Kami"}</div><div className="text-[11px] text-slate-400">{service.price_visible && service.price != null ? `/${service.unit_label || "layanan"}` : "Harga disembunyikan"}</div></div></div>)}</div></div>)}
            </div>
          </div>
        </section>}

        {config.show_about && <section className="public-section"><div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8"><div className="public-about-card"><div className="public-kicker">TENTANG KAMI</div><h2 className="mt-4 text-3xl font-black sm:text-4xl">{config.about_title}</h2><p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{hasMultipleBranches ? config.about_body : config.about_body.replace(/,? dan cabang/gi, "").replace(/cabang,? /gi, "")}</p>{wa && <a href={wa} target="_blank" rel="noreferrer" className="public-btn-primary mt-6"><MessageCircle size={17}/>Hubungi {branch?.name || businessName}</a>}</div>{config.show_stats && <div className="grid grid-cols-2 gap-4">{config.stats.slice(0,4).map((stat,index)=><div key={`${stat.label}-${index}`} className="public-stat-card" style={{backgroundImage:`linear-gradient(135deg,var(--card-${(index%8)+1}-from),var(--card-${(index%8)+1}-to))`}}><div className="text-2xl font-black" style={{color:"var(--brand-primary)"}}>{stat.value}</div><div className="mt-1 text-sm font-semibold text-slate-500">{stat.label}</div></div>)}</div>}</div></section>}

        {config.show_testimonials && config.testimonials.length > 0 && <section className="public-section public-section-soft"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="public-section-head"><div><div className="public-kicker">TESTIMONIAL</div><h2>{config.testimonials_title}</h2></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{config.testimonials.map((item,index)=><div key={`${item.name}-${index}`} className="public-testimonial"><div className="flex gap-1 text-amber-400">{Array.from({length:Math.min(5,Math.max(1,Number(item.rating||5)))},(_,i)=><Star key={i} size={15} fill="currentColor"/>)}</div><p className="mt-4 text-sm leading-7 text-slate-600">“{item.text}”</p><div className="mt-5 font-black">{item.name}</div><div className="text-xs text-slate-400">{item.meta}</div></div>)}</div></div></section>}

        {config.show_contact && <section className="public-section"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div className="public-contact-card"><div><div className="text-3xl font-black text-white">{config.contact_title}</div><p className="mt-2 max-w-2xl text-white/75">{hasMultipleBranches ? config.contact_text : config.contact_text.replace(/Pilih cabang dan /i, "")}</p>{branchAddress(branch) && <div className="mt-4 flex items-center gap-2 text-sm text-white/70"><MapPin size={15}/>{branchAddress(branch)}</div>}</div>{wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-5 py-3 font-black text-slate-900 shadow-lg"><span className="inline-flex items-center gap-2"><MessageCircle size={18}/>WhatsApp Sekarang</span></a>}</div></div></section>}
      </main>

      {config.show_footer && <footer className="border-t border-slate-200/70 bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div><div className="font-black">{appName}</div><div className="mt-1 text-sm text-white/55">{config.footer_text}</div></div><div className="text-xs text-white/45">© {new Date().getFullYear()} {businessName}</div></div></footer>}
    </div>
  );
}
