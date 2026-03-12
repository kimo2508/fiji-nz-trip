import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const TRIP_START = "2026-05-18";
const PACKING_CATEGORIES = ["Clothing", "Toiletries", "Documents", "Electronics", "Health", "Beach & Water", "Misc"];
const ACTIVITY_CATEGORIES = ["🍽️ Restaurant", "🏄 Activity", "🗺️ Sightseeing", "🚗 Transport", "📝 Note"];
const CAT_COLORS = {
  "🍽️ Restaurant": "#f4a261", "🏄 Activity": "#2a9d8f",
  "🗺️ Sightseeing": "#e76f51", "🚗 Transport": "#457b9d", "📝 Note": "#a8dadc",
};

const daysUntil = () => {
  const diff = new Date(TRIP_START) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// ── Styles (defined outside component so they never change) ───────────────────
const S = {
  app: { minHeight:"100vh", background:"#f0f9f9", fontFamily:"'Nunito',sans-serif", color:"#1a3a3a", maxWidth:480, margin:"0 auto", paddingBottom:90 },
  hdr: { background:"linear-gradient(135deg,#0a9396 0%,#005f73 100%)", padding:"20px 20px 60px", position:"relative", overflow:"hidden" },
  nav: { display:"flex", background:"#fff", borderBottom:"1px solid #e0f0f0", overflowX:"auto", position:"sticky", top:0, zIndex:50, boxShadow:"0 2px 8px rgba(0,100,100,0.08)" },
  nb: (a) => ({ flex:"0 0 auto", padding:"12px 14px", border:"none", cursor:"pointer", fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:700, letterSpacing:1, whiteSpace:"nowrap", background:a?"#0a9396":"transparent", color:a?"#fff":"#888", borderBottom:a?"2px solid #0a9396":"2px solid transparent" }),
  sec: { padding:16 },
  card: { background:"#fff", borderRadius:16, padding:16, marginBottom:12, boxShadow:"0 2px 12px rgba(0,100,100,0.06)" },
  btn: (v="primary") => ({ width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"Nunito,sans-serif", fontSize:15, fontWeight:800, letterSpacing:1, background:v==="primary"?"linear-gradient(135deg,#0a9396,#005f73)":v==="coral"?"linear-gradient(135deg,#e76f51,#c9503a)":"#f0f9f9", color:v==="ghost"?"#aaa":"#fff" }),
  sBtn: (active=false, color="#0a9396") => ({ padding:"7px 12px", borderRadius:20, border:`1px solid ${active?color:"#ddd"}`, cursor:"pointer", fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:700, background:active?color:"#fff", color:active?"#fff":"#888" }),
  inp: { width:"100%", padding:"11px 14px", background:"#f8fefe", border:"1px solid #c8e8e8", borderRadius:10, color:"#1a3a3a", fontFamily:"Nunito,sans-serif", fontSize:16, outline:"none", marginBottom:10, WebkitAppearance:"none" },
  lbl: { fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:800, color:"#0a9396", letterSpacing:1, marginBottom:4, display:"block", textTransform:"uppercase" },
  tag: (color) => ({ background:color+"22", color, padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:700, display:"inline-block" }),
  modal: { position:"fixed", inset:0, background:"rgba(0,60,60,0.6)", zIndex:300, display:"flex", alignItems:"flex-end" },
  modalBox: { background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px 20px 40px", width:"100%", maxHeight:"88vh", overflowY:"auto" },
};

// ── Modal wrapper (defined OUTSIDE main component so it never remounts) ───────
function Modal({ title, onSave, onClose, children }) {
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:800, color:"#005f73", fontFamily:"'Playfair Display',serif" }}>{title}</div>
          <button onClick={onClose} style={{ background:"#f0f0f0", border:"none", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:18, color:"#888" }}>×</button>
        </div>
        {children}
        <button onClick={onSave} style={{ ...S.btn(), marginTop:12 }}>SAVE</button>
      </div>
    </div>
  );
}

export default function TripPlanner() {
  const [tab, setTab] = useState("home");
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [packing, setPacking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [packFilter, setPackFilter] = useState("All");

  // Separate state for each form to avoid re-render issues
  const [dayForm, setDayForm] = useState({ date:"", location:"", notes:"" });
  const [itemForm, setItemForm] = useState({ category:"🗺️ Sightseeing", title:"", time:"", details:"" });
  const [flightForm, setFlightForm] = useState({ from_location:"", to_location:"", airline:"", flight_number:"", departure:"", arrival:"", confirmation:"" });
  const [hotelForm, setHotelForm] = useState({ name:"", location:"", check_in:"", check_out:"", confirmation:"", notes:"" });
  const [packForm, setPackForm] = useState({ category:"Clothing", item:"" });

  const loadAll = useCallback(async () => {
    const [d, i, f, h, p] = await Promise.all([
      supabase.from("itinerary_days").select("*").order("date"),
      supabase.from("itinerary_items").select("*").order("time"),
      supabase.from("flights").select("*").order("departure"),
      supabase.from("hotels").select("*").order("check_in"),
      supabase.from("packing_items").select("*").order("category"),
    ]);
    if (d.data) setDays(d.data);
    if (i.data) setItems(i.data);
    if (f.data) setFlights(f.data);
    if (h.data) setHotels(h.data);
    if (p.data) setPacking(p.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const channels = [
      supabase.channel("days-ch").on("postgres_changes", { event:"*", schema:"public", table:"itinerary_days" }, loadAll).subscribe(),
      supabase.channel("items-ch").on("postgres_changes", { event:"*", schema:"public", table:"itinerary_items" }, loadAll).subscribe(),
      supabase.channel("flights-ch").on("postgres_changes", { event:"*", schema:"public", table:"flights" }, loadAll).subscribe(),
      supabase.channel("hotels-ch").on("postgres_changes", { event:"*", schema:"public", table:"hotels" }, loadAll).subscribe(),
      supabase.channel("packing-ch").on("postgres_changes", { event:"*", schema:"public", table:"packing_items" }, loadAll).subscribe(),
    ];
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, [loadAll]);

  const closeModal = () => setShowModal(null);

  const addDay = async () => {
    if (!dayForm.date || !dayForm.location) return;
    const { error } = await supabase.from("itinerary_days").insert({ date:dayForm.date, location:dayForm.location, notes:dayForm.notes });
    if (error) { alert("Error: " + error.message); return; }
    setDayForm({ date:"", location:"", notes:"" });
    closeModal();
    loadAll();
  };

  const deleteDay = async (id) => {
    await supabase.from("itinerary_days").delete().eq("id", id);
    if (activeDay === id) setActiveDay(null);
    loadAll();
  };

  const addItem = async () => {
    if (!itemForm.title || !activeDay) return;
    const { error } = await supabase.from("itinerary_items").insert({ day_id:activeDay, category:itemForm.category, title:itemForm.title, details:itemForm.details, time:itemForm.time, confirmed:false });
    if (error) { alert("Error: " + error.message); return; }
    setItemForm({ category:"🗺️ Sightseeing", title:"", time:"", details:"" });
    closeModal();
  };

  const toggleItem = async (item) => {
    await supabase.from("itinerary_items").update({ confirmed:!item.confirmed }).eq("id", item.id);
    loadAll();
  };

  const deleteItem = async (id) => { await supabase.from("itinerary_items").delete().eq("id", id); loadAll(); };

  const addFlight = async () => {
    if (!flightForm.from_location || !flightForm.to_location) return;
    const { error } = await supabase.from("flights").insert(flightForm);
    if (error) { alert("Error: " + error.message); return; }
    setFlightForm({ from_location:"", to_location:"", airline:"", flight_number:"", departure:"", arrival:"", confirmation:"" });
    closeModal();
    loadAll();
  };

  const deleteFlight = async (id) => { await supabase.from("flights").delete().eq("id", id); loadAll(); };

  const addHotel = async () => {
    if (!hotelForm.name || !hotelForm.location) return;
    const { error } = await supabase.from("hotels").insert(hotelForm);
    if (error) { alert("Error: " + error.message); return; }
    setHotelForm({ name:"", location:"", check_in:"", check_out:"", confirmation:"", notes:"" });
    closeModal();
    loadAll();
  };

  const deleteHotel = async (id) => { await supabase.from("hotels").delete().eq("id", id); loadAll(); };

  const addPackingItem = async () => {
    if (!packForm.item) return;
    const { error } = await supabase.from("packing_items").insert({ category:packForm.category, item:packForm.item, packed:false });
    if (error) { alert("Error: " + error.message); return; }
    setPackForm({ category:"Clothing", item:"" });
    closeModal();
  };

  const togglePacked = async (item) => { await supabase.from("packing_items").update({ packed:!item.packed }).eq("id", item.id); loadAll(); };
  const deletePackingItem = async (id) => { await supabase.from("packing_items").delete().eq("id", id); loadAll(); };

  const packedCount = packing.filter(p => p.packed).length;
  const activeDayItems = items.filter(i => i.day_id === activeDay);
  const filteredPacking = packFilter === "All" ? packing : packing.filter(p => p.category === packFilter);

  if (loading) return (
    <div style={{ ...S.app, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🌺</div>
        <div style={{ fontFamily:"Nunito,sans-serif", color:"#0a9396", fontWeight:700 }}>Loading your trip...</div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#0a9396;border-radius:2px}
        input::placeholder,textarea::placeholder{color:#aacece}
        select{appearance:none;-webkit-appearance:none;background:#f8fefe}
        textarea{resize:none;font-family:Nunito,sans-serif;font-size:16px}
        @keyframes su{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        .sl{animation:su 0.3s ease forwards}
        .hov:active{background:#f0fafa!important}
        @keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .bob{animation:wave 3s ease-in-out infinite}
      `}</style>

      {/* HEADER */}
      <div style={S.hdr}>
        <div style={{ position:"absolute", top:-60, right:-40, width:200, height:200, background:"rgba(255,255,255,0.05)", borderRadius:"50%" }}/>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:700, letterSpacing:3, marginBottom:6 }}>YOUR ADVENTURE AWAITS</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#fff", lineHeight:1.2, marginBottom:4 }}>Fiji & New Zealand</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>May 2026 ✈️</div>
        <div style={{ marginTop:16, display:"flex", gap:12 }}>
          {[{ v:daysUntil(), l:"DAYS TO GO" },{ v:days.length, l:"DAYS PLANNED" },{ v:`${packedCount}/${packing.length}`, l:"PACKED" }].map((s,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 14px", textAlign:"center", flex:1 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#fff", lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.7)", fontWeight:700, letterSpacing:1 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <svg style={{ position:"absolute", bottom:-2, left:0, right:0 }} viewBox="0 0 480 40" preserveAspectRatio="none" height="40"><path d="M0,20 C120,40 360,0 480,20 L480,40 L0,40 Z" fill="#f0f9f9"/></svg>
      </div>

      {/* NAV */}
      <div style={S.nav}>
        {[{id:"home",l:"🏠 HOME"},{id:"itinerary",l:"📅 ITINERARY"},{id:"flights",l:"✈️ FLIGHTS"},{id:"hotels",l:"🏨 HOTELS"},{id:"packing",l:"🎒 PACKING"}].map(t=>(
          <button key={t.id} style={S.nb(tab===t.id)} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {/* ── HOME ── */}
      {tab==="home" && (
        <div style={S.sec} className="sl">
          <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:800, color:"#0a9396", letterSpacing:2, marginBottom:10 }}>DESTINATIONS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            {[{ name:"Fiji", emoji:"🌺", desc:"Islands & beaches", bg:"linear-gradient(135deg,#e76f51,#c9503a)" },{ name:"New Zealand", emoji:"🌿", desc:"Adventure & nature", bg:"linear-gradient(135deg,#2a9d8f,#005f73)" }].map((d,i)=>(
              <div key={i} style={{ background:d.bg, borderRadius:16, padding:"18px 14px", color:"#fff" }}>
                <div className="bob" style={{ fontSize:32, marginBottom:8 }}>{d.emoji}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18 }}>{d.name}</div>
                <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{d.desc}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:800, color:"#0a9396", letterSpacing:2, marginBottom:14 }}>TRIP OVERVIEW</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[{icon:"✈️",label:"Flights",val:flights.length},{icon:"🏨",label:"Hotels",val:hotels.length},{icon:"🗓️",label:"Activities",val:items.length},{icon:"🎒",label:"Still to pack",val:packing.filter(p=>!p.packed).length}].map((s,i)=>(
                <div key={i} style={{ background:"#f0fafa", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:24 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, color:"#888", fontWeight:600 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {flights.length > 0 && (
            <div style={S.card}>
              <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:800, color:"#0a9396", letterSpacing:2, marginBottom:12 }}>NEXT FLIGHT</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:32 }}>✈️</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:16 }}>{flights[0].from_location} → {flights[0].to_location}</div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{flights[0].airline} {flights[0].flight_number} · {flights[0].departure}</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[{l:"ADD DAY",i:"📅",a:()=>{setTab("itinerary");setTimeout(()=>setShowModal("day"),200);}},{l:"ADD FLIGHT",i:"✈️",a:()=>{setTab("flights");setTimeout(()=>setShowModal("flight"),200);}},{l:"ADD HOTEL",i:"🏨",a:()=>{setTab("hotels");setTimeout(()=>setShowModal("hotel"),200);}},{l:"ADD TO PACK",i:"🎒",a:()=>{setTab("packing");setTimeout(()=>setShowModal("packing"),200);}}].map((b,i)=>(
              <button key={i} onClick={b.a} style={{ padding:"14px 10px", borderRadius:12, border:"1px solid #c8e8e8", background:"#fff", cursor:"pointer", fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:800, color:"#005f73", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{b.i}</div>{b.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ITINERARY ── */}
      {tab==="itinerary" && (
        <div style={S.sec} className="sl">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#005f73" }}>Itinerary</div>
            <button onClick={()=>setShowModal("day")} style={{ ...S.sBtn(true), fontSize:13 }}>+ ADD DAY</button>
          </div>
          {days.length === 0 ? (
            <div style={{ textAlign:"center", padding:"50px 20px" }}><div style={{ fontSize:48, marginBottom:12 }}>🗓️</div><div style={{ fontFamily:"Nunito,sans-serif", color:"#888" }}>No days planned yet. Add your first day!</div></div>
          ) : days.map(day => (
            <div key={day.id}>
              <div className="hov" style={{ ...S.card, cursor:"pointer", borderLeft:"4px solid #0a9396" }} onClick={()=>setActiveDay(activeDay===day.id?null:day.id)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#005f73" }}>{new Date(day.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div>
                    <div style={{ fontFamily:"Nunito,sans-serif", fontSize:13, color:"#0a9396", fontWeight:700, marginTop:2 }}>{day.location}</div>
                    {day.notes && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888", marginTop:4 }}>{day.notes}</div>}
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={S.tag("#0a9396")}>{items.filter(i=>i.day_id===day.id).length} items</span>
                    <button onClick={e=>{e.stopPropagation();deleteDay(day.id);}} style={{ background:"#fee", border:"none", color:"#e76f51", width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>×</button>
                  </div>
                </div>
              </div>
              {activeDay===day.id && (
                <div style={{ marginTop:-8, marginBottom:12, background:"#f0fafa", borderRadius:"0 0 16px 16px", padding:"12px 16px" }}>
                  <button onClick={()=>setShowModal("item")} style={{ ...S.btn("coral"), marginBottom:12, fontSize:13, padding:10 }}>+ ADD ACTIVITY / RESTAURANT</button>
                  {activeDayItems.length===0 ? (
                    <div style={{ textAlign:"center", padding:20, fontFamily:"Nunito,sans-serif", color:"#aaa", fontSize:13 }}>Nothing planned yet for this day.</div>
                  ) : activeDayItems.map(item=>(
                    <div key={item.id} style={{ background:"#fff", borderRadius:12, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"flex-start", gap:10, boxShadow:"0 1px 6px rgba(0,100,100,0.06)" }}>
                      <input type="checkbox" checked={item.confirmed} onChange={()=>toggleItem(item)} style={{ marginTop:3, accentColor:"#0a9396", width:16, height:16, cursor:"pointer" }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:700, textDecoration:item.confirmed?"line-through":"none", color:item.confirmed?"#aaa":"#1a3a3a" }}>{item.title}</span>
                          <span style={S.tag(CAT_COLORS[item.category]||"#888")}>{item.category}</span>
                        </div>
                        {item.time && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, color:"#0a9396", fontWeight:700, marginTop:2 }}>🕐 {item.time}</div>}
                        {item.details && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888", marginTop:3 }}>{item.details}</div>}
                      </div>
                      <button onClick={()=>deleteItem(item.id)} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:16 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FLIGHTS ── */}
      {tab==="flights" && (
        <div style={S.sec} className="sl">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#005f73" }}>Flights</div>
            <button onClick={()=>setShowModal("flight")} style={{ ...S.sBtn(true), fontSize:13 }}>+ ADD FLIGHT</button>
          </div>
          {flights.length===0 ? (
            <div style={{ textAlign:"center", padding:"50px 20px" }}><div style={{ fontSize:48, marginBottom:12 }}>✈️</div><div style={{ fontFamily:"Nunito,sans-serif", color:"#888" }}>No flights added yet.</div></div>
          ) : flights.map(f=>(
            <div key={f.id} style={{ ...S.card, borderLeft:"4px solid #457b9d" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#005f73" }}>{f.from_location}</div>
                    <div style={{ fontSize:18 }}>✈️</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#005f73" }}>{f.to_location}</div>
                  </div>
                  {f.airline && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:700, color:"#457b9d" }}>{f.airline} {f.flight_number}</div>}
                  {f.departure && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888", marginTop:4 }}>🛫 {f.departure}</div>}
                  {f.arrival && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888" }}>🛬 {f.arrival}</div>}
                  {f.confirmation && <div style={{ marginTop:8 }}><span style={S.tag("#0a9396")}>Conf: {f.confirmation}</span></div>}
                </div>
                <button onClick={()=>deleteFlight(f.id)} style={{ background:"#fee", border:"none", color:"#e76f51", width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HOTELS ── */}
      {tab==="hotels" && (
        <div style={S.sec} className="sl">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#005f73" }}>Hotels</div>
            <button onClick={()=>setShowModal("hotel")} style={{ ...S.sBtn(true), fontSize:13 }}>+ ADD HOTEL</button>
          </div>
          {hotels.length===0 ? (
            <div style={{ textAlign:"center", padding:"50px 20px" }}><div style={{ fontSize:48, marginBottom:12 }}>🏨</div><div style={{ fontFamily:"Nunito,sans-serif", color:"#888" }}>No hotels added yet.</div></div>
          ) : hotels.map(h=>(
            <div key={h.id} style={{ ...S.card, borderLeft:"4px solid #2a9d8f" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#005f73", marginBottom:4 }}>{h.name}</div>
                  <div style={{ fontFamily:"Nunito,sans-serif", fontSize:13, color:"#2a9d8f", fontWeight:700 }}>📍 {h.location}</div>
                  {h.check_in && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888", marginTop:6 }}>Check-in: {h.check_in}</div>}
                  {h.check_out && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888" }}>Check-out: {h.check_out}</div>}
                  {h.confirmation && <div style={{ marginTop:8 }}><span style={S.tag("#0a9396")}>Conf: {h.confirmation}</span></div>}
                  {h.notes && <div style={{ fontFamily:"Nunito,sans-serif", fontSize:12, color:"#888", marginTop:6 }}>{h.notes}</div>}
                </div>
                <button onClick={()=>deleteHotel(h.id)} style={{ background:"#fee", border:"none", color:"#e76f51", width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PACKING ── */}
      {tab==="packing" && (
        <div style={S.sec} className="sl">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#005f73" }}>Packing List</div>
            <button onClick={()=>setShowModal("packing")} style={{ ...S.sBtn(true), fontSize:13 }}>+ ADD ITEM</button>
          </div>
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:700, color:"#0a9396", marginBottom:8 }}>
              <span>PACKING PROGRESS</span><span>{packedCount} / {packing.length}</span>
            </div>
            <div style={{ background:"#e0f0f0", borderRadius:20, height:10, overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(90deg,#0a9396,#2a9d8f)", height:"100%", width:`${packing.length?Math.round(packedCount/packing.length*100):0}%`, borderRadius:20, transition:"width 0.4s ease" }}/>
            </div>
            <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, color:"#888", marginTop:6, textAlign:"right" }}>{packing.length?Math.round(packedCount/packing.length*100):0}% packed</div>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:10, marginBottom:14 }}>
            {["All",...PACKING_CATEGORIES].map(cat=>(
              <button key={cat} onClick={()=>setPackFilter(cat)} style={{ ...S.sBtn(packFilter===cat), flex:"0 0 auto", fontSize:11 }}>{cat}</button>
            ))}
          </div>
          {filteredPacking.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px" }}><div style={{ fontSize:40, marginBottom:8 }}>🎒</div><div style={{ fontFamily:"Nunito,sans-serif", color:"#888" }}>Nothing here yet.</div></div>
          ) : PACKING_CATEGORIES.filter(cat=>packFilter==="All"||cat===packFilter).map(cat=>{
            const catItems = filteredPacking.filter(p=>p.category===cat);
            if (!catItems.length) return null;
            return (
              <div key={cat} style={{ marginBottom:16 }}>
                <div style={{ fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:800, color:"#0a9396", letterSpacing:2, marginBottom:8 }}>{cat.toUpperCase()}</div>
                {catItems.map(item=>(
                  <div key={item.id} style={{ background:"#fff", borderRadius:12, padding:"11px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 6px rgba(0,100,100,0.05)" }}>
                    <input type="checkbox" checked={item.packed} onChange={()=>togglePacked(item)} style={{ accentColor:"#0a9396", width:18, height:18, cursor:"pointer", flexShrink:0 }}/>
                    <span style={{ fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:600, flex:1, textDecoration:item.packed?"line-through":"none", color:item.packed?"#aaa":"#1a3a3a" }}>{item.item}</span>
                    <button onClick={()=>deletePackingItem(item.id)} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:16 }}>×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALS ── */}
      {showModal==="day" && (
        <Modal title="Add Day" onSave={addDay} onClose={closeModal}>
          <div style={S.lbl}>DATE</div>
          <input type="date" style={S.inp} value={dayForm.date} onChange={e=>setDayForm(p=>({...p,date:e.target.value}))}/>
          <div style={S.lbl}>LOCATION</div>
          <input style={S.inp} placeholder="e.g. Nadi, Fiji" value={dayForm.location} onChange={e=>setDayForm(p=>({...p,location:e.target.value}))}/>
          <div style={S.lbl}>NOTES (optional)</div>
          <textarea style={{...S.inp,height:80}} placeholder="Any notes for this day..." value={dayForm.notes} onChange={e=>setDayForm(p=>({...p,notes:e.target.value}))}/>
        </Modal>
      )}

      {showModal==="item" && (
        <Modal title="Add Activity" onSave={addItem} onClose={closeModal}>
          <div style={S.lbl}>CATEGORY</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
            {ACTIVITY_CATEGORIES.map(cat=>(
              <button key={cat} onClick={()=>setItemForm(p=>({...p,category:cat}))} style={{ ...S.sBtn(itemForm.category===cat, CAT_COLORS[cat]||"#0a9396"), fontSize:12 }}>{cat}</button>
            ))}
          </div>
          <div style={S.lbl}>NAME</div>
          <input style={S.inp} placeholder="e.g. Snorkeling at coral reef" value={itemForm.title} onChange={e=>setItemForm(p=>({...p,title:e.target.value}))}/>
          <div style={S.lbl}>TIME (optional)</div>
          <input style={S.inp} placeholder="e.g. 9:00 AM" value={itemForm.time} onChange={e=>setItemForm(p=>({...p,time:e.target.value}))}/>
          <div style={S.lbl}>DETAILS (optional)</div>
          <textarea style={{...S.inp,height:80}} placeholder="Address, notes, booking info..." value={itemForm.details} onChange={e=>setItemForm(p=>({...p,details:e.target.value}))}/>
        </Modal>
      )}

      {showModal==="flight" && (
        <Modal title="Add Flight" onSave={addFlight} onClose={closeModal}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><div style={S.lbl}>FROM</div><input style={S.inp} placeholder="Los Angeles" value={flightForm.from_location} onChange={e=>setFlightForm(p=>({...p,from_location:e.target.value}))}/></div>
            <div><div style={S.lbl}>TO</div><input style={S.inp} placeholder="Nadi, Fiji" value={flightForm.to_location} onChange={e=>setFlightForm(p=>({...p,to_location:e.target.value}))}/></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><div style={S.lbl}>AIRLINE</div><input style={S.inp} placeholder="Fiji Airways" value={flightForm.airline} onChange={e=>setFlightForm(p=>({...p,airline:e.target.value}))}/></div>
            <div><div style={S.lbl}>FLIGHT #</div><input style={S.inp} placeholder="FJ800" value={flightForm.flight_number} onChange={e=>setFlightForm(p=>({...p,flight_number:e.target.value}))}/></div>
          </div>
          <div style={S.lbl}>DEPARTURE</div>
          <input style={S.inp} placeholder="May 18, 11:30 PM" value={flightForm.departure} onChange={e=>setFlightForm(p=>({...p,departure:e.target.value}))}/>
          <div style={S.lbl}>ARRIVAL</div>
          <input style={S.inp} placeholder="May 20, 6:45 AM" value={flightForm.arrival} onChange={e=>setFlightForm(p=>({...p,arrival:e.target.value}))}/>
          <div style={S.lbl}>CONFIRMATION #</div>
          <input style={S.inp} placeholder="ABC123" value={flightForm.confirmation} onChange={e=>setFlightForm(p=>({...p,confirmation:e.target.value}))}/>
        </Modal>
      )}

      {showModal==="hotel" && (
        <Modal title="Add Hotel" onSave={addHotel} onClose={closeModal}>
          <div style={S.lbl}>HOTEL NAME</div>
          <input style={S.inp} placeholder="e.g. Sheraton Fiji Resort" value={hotelForm.name} onChange={e=>setHotelForm(p=>({...p,name:e.target.value}))}/>
          <div style={S.lbl}>LOCATION</div>
          <input style={S.inp} placeholder="e.g. Denarau Island, Fiji" value={hotelForm.location} onChange={e=>setHotelForm(p=>({...p,location:e.target.value}))}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><div style={S.lbl}>CHECK-IN</div><input style={S.inp} placeholder="May 20" value={hotelForm.check_in} onChange={e=>setHotelForm(p=>({...p,check_in:e.target.value}))}/></div>
            <div><div style={S.lbl}>CHECK-OUT</div><input style={S.inp} placeholder="May 25" value={hotelForm.check_out} onChange={e=>setHotelForm(p=>({...p,check_out:e.target.value}))}/></div>
          </div>
          <div style={S.lbl}>CONFIRMATION #</div>
          <input style={S.inp} placeholder="ABC123" value={hotelForm.confirmation} onChange={e=>setHotelForm(p=>({...p,confirmation:e.target.value}))}/>
          <div style={S.lbl}>NOTES</div>
          <textarea style={{...S.inp,height:70}} placeholder="Pool view, breakfast included, etc." value={hotelForm.notes} onChange={e=>setHotelForm(p=>({...p,notes:e.target.value}))}/>
        </Modal>
      )}

      {showModal==="packing" && (
        <Modal title="Add Packing Item" onSave={addPackingItem} onClose={closeModal}>
          <div style={S.lbl}>CATEGORY</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
            {PACKING_CATEGORIES.map(cat=>(
              <button key={cat} onClick={()=>setPackForm(p=>({...p,category:cat}))} style={{ ...S.sBtn(packForm.category===cat), fontSize:12 }}>{cat}</button>
            ))}
          </div>
          <div style={S.lbl}>ITEM</div>
          <input style={S.inp} placeholder="e.g. Sunscreen SPF 50" value={packForm.item} onChange={e=>setPackForm(p=>({...p,item:e.target.value}))}/>
        </Modal>
      )}
    </div>
  );
}
