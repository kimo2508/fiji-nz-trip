import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { S, C } from "./styles";

// ── DOCUMENT TYPES ───────────────────────────────────────────────────────────
const DOC_TYPES = [
  { v: "passport", l: "🛂 Passport" },
  { v: "visa", l: "📄 Visa / ETA" },
  { v: "drivers_license", l: "🪪 Driver's License" },
  { v: "idp", l: "🚗 Int'l Driving Permit" },
  { v: "birth_certificate", l: "📜 Birth Certificate" },
  { v: "consent_letter", l: "✍️ Parental Consent" },
  { v: "insurance_travel", l: "🛟 Travel Insurance" },
  { v: "insurance_health", l: "🏥 Health Insurance" },
  { v: "vaccination", l: "💉 Vaccination Record" },
  { v: "prescription", l: "💊 Prescription" },
  { v: "card_backup", l: "💳 Card Backup Info" },
  { v: "other", l: "📎 Other" },
];

const CONTACT_TYPES = [
  { v: "family", l: "👨‍👩‍👧 Family / Next of Kin" },
  { v: "embassy", l: "🏛️ Embassy / Consulate" },
  { v: "insurance", l: "🛟 Insurance Hotline" },
  { v: "medical", l: "🏥 Doctor / Medical" },
  { v: "local_emergency", l: "🚨 Local Emergency" },
  { v: "bank", l: "🏦 Bank / Card Loss" },
  { v: "other", l: "📞 Other" },
];

const docTypeLabel = (v) => DOC_TYPES.find((d) => d.v === v)?.l || v;
const contactTypeLabel = (v) => CONTACT_TYPES.find((c) => c.v === v)?.l || v;

// Days until expiry (negative = already expired)
const daysToExpiry = (date) => {
  if (!date) return null;
  const diff = new Date(date + "T12:00:00") - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const expiryStatus = (date) => {
  const d = daysToExpiry(date);
  if (d === null) return null;
  if (d < 0) return { color: C.red, bg: C.redLight, label: `EXPIRED ${Math.abs(d)}d ago` };
  if (d < 180) return { color: C.red, bg: C.redLight, label: `${d}d to expiry — too soon!` };
  if (d < 365) return { color: C.amberDark, bg: C.amberLight, label: `Expires in ${d}d` };
  return { color: C.green, bg: C.greenLight, label: `Valid (${d}d)` };
};

// ── TWO-STAGE DELETE BUTTON ──────────────────────────────────────────────────
function ConfirmDelete({ onConfirm, label = "Delete?" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return (
      <button style={S.del} onClick={() => setArmed(true)} title="Delete">×</button>
    );
  }
  return (
    <button
      style={{
        background: C.red, color: "#fff", border: "none",
        borderRadius: 8, padding: "6px 10px", fontSize: 11,
        fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
      }}
      onClick={() => { setArmed(false); onConfirm(); }}
    >
      {label}
    </button>
  );
}

// ── ADDED BY BADGE (mirrors App.jsx) ─────────────────────────────────────────
function AddedBy({ userId, userMap, BADGE_COLORS }) {
  if (!userId || !userMap) return null;
  const name = userMap[userId] || "Someone";
  let hash = 0;
  for (let i = 0; i < (userId || "").length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  const color = BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
  return <span style={S.addedBy(color.bg, color.fg)}>👤 {name}</span>;
}

// ── MAIN VAULT TAB ───────────────────────────────────────────────────────────
export default function Vault({
  tripId, session, hasFullAccess, currentUserId, userMap, BADGE_COLORS, onChange,
}) {
  const [section, setSection] = useState("documents"); // documents | contacts
  const [docs, setDocs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // "doc" | "contact"
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState({}); // {docId: url}

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      supabase.from("travel_documents").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
      supabase.from("emergency_contacts").select("*").eq("trip_id", tripId).order("sort_order").order("created_at"),
    ]);
    let docRows = d.data || [];
    // Editors: scrub sensitive fields client-side as a belt-and-suspenders measure.
    // (Storage RLS already blocks file access for editors.)
    if (!hasFullAccess) {
      docRows = docRows.map((r) => ({ ...r, document_number: null, file_path: null }));
    }
    setDocs(docRows);
    setContacts(c.data || []);
    setLoading(false);
  }, [tripId, hasFullAccess]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`vault-${tripId}`);
    ["travel_documents", "emergency_contacts"].forEach((t) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `trip_id=eq.${tripId}` }, () => load());
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tripId, load]);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const closeModal = () => { setShowModal(null); setForm({}); setEditItem(null); };

  const openAddDoc = () => { setEditItem(null); setForm({ doc_type: "passport" }); setShowModal("doc"); };
  const openEditDoc = (d) => { setEditItem(d); setForm({ ...d }); setShowModal("doc"); };
  const openAddContact = () => { setEditItem(null); setForm({ contact_type: "family", is_24_7: false }); setShowModal("contact"); };
  const openEditContact = (c) => { setEditItem(c); setForm({ ...c }); setShowModal("contact"); };

  // ── DOC SAVE: inserts row, then optionally uploads file at {trip}/{docId}.{ext}
  const saveDoc = async () => {
    if (!form.label || !form.doc_type) return;
    setUploading(true);
    try {
      const payload = {
        trip_id: tripId,
        doc_type: form.doc_type,
        label: form.label.trim(),
        owner_name: form.owner_name?.trim() || null,
        expiry_date: form.expiry_date || null,
        issuing_country: form.issuing_country?.trim() || null,
        notes: form.notes?.trim() || null,
      };
      // Sensitive fields only writeable by full-access users
      if (hasFullAccess) {
        payload.document_number = form.document_number?.trim() || null;
      }

      let docId;
      if (editItem) {
        await supabase.from("travel_documents").update(payload).eq("id", editItem.id);
        docId = editItem.id;
      } else {
        const { data, error } = await supabase
          .from("travel_documents")
          .insert({ ...payload, created_by: currentUserId })
          .select("id")
          .single();
        if (error) throw error;
        docId = data.id;
      }

      // File upload (full-access only)
      if (hasFullAccess && form._file) {
        const file = form._file;
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${tripId}/${docId}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("travel-docs")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        await supabase.from("travel_documents").update({ file_path: path }).eq("id", docId);
      }

      closeModal();
      load();
      if (onChange) onChange();
    } catch (e) {
      console.error("saveDoc error:", e);
      alert(`Couldn't save document: ${e.message || e}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (d) => {
    // Try to delete file too, if any
    if (d.file_path) {
      await supabase.storage.from("travel-docs").remove([d.file_path]);
    }
    await supabase.from("travel_documents").delete().eq("id", d.id);
    setSignedUrls((prev) => { const n = { ...prev }; delete n[d.id]; return n; });
    load();
  };

  const viewFile = async (d) => {
    if (!d.file_path) return;
    if (signedUrls[d.id]) {
      window.open(signedUrls[d.id], "_blank", "noopener,noreferrer");
      return;
    }
    const { data, error } = await supabase.storage
      .from("travel-docs")
      .createSignedUrl(d.file_path, 60); // 60s — single-use feel
    if (error) {
      alert(`Couldn't get file: ${error.message}`);
      return;
    }
    setSignedUrls((p) => ({ ...p, [d.id]: data.signedUrl }));
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const saveContact = async () => {
    if (!form.name || !form.contact_type) return;
    const payload = {
      trip_id: tripId,
      contact_type: form.contact_type,
      name: form.name.trim(),
      relationship: form.relationship?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      notes: form.notes?.trim() || null,
      is_24_7: !!form.is_24_7,
    };
    if (editItem) {
      await supabase.from("emergency_contacts").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("emergency_contacts").insert({ ...payload, created_by: currentUserId });
    }
    closeModal();
    load();
  };

  const deleteContact = async (c) => {
    await supabase.from("emergency_contacts").delete().eq("id", c.id);
    load();
  };

  const canModify = (row) => hasFullAccess || row.created_by === currentUserId;

  if (loading) {
    return <div style={{ ...S.sec, textAlign: "center", color: C.textLight, padding: 40 }}>Loading vault…</div>;
  }

  // Sub-section nav
  const subTabs = [
    { id: "documents", l: `📁 DOCS (${docs.length})` },
    { id: "contacts", l: `📞 CONTACTS (${contacts.length})` },
  ];

  return (
    <div style={S.sec}>
      {/* sub-section toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, background: C.ice, padding: 4, borderRadius: 10 }}>
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            style={{
              flex: 1, padding: "10px 8px", border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 800, letterSpacing: 0.5, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              background: section === t.id ? C.white : "transparent",
              color: section === t.id ? C.primary : C.textLight,
              boxShadow: section === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Editor privacy notice */}
      {!hasFullAccess && section === "documents" && (
        <div style={{
          ...S.card, background: C.amberLight, border: `1px solid ${C.amber}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: C.amberDark, fontWeight: 700 }}>
            🔒 Document files and ID numbers are visible only to trip co-owners.
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {section === "documents" && (
        <>
          <button style={S.btn()} onClick={openAddDoc}>+ Add Document</button>

          {docs.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: C.textLight, marginTop: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 13 }}>No documents yet. Add passports, visas, insurance cards, etc.</div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {docs.map((d) => {
              const exp = expiryStatus(d.expiry_date);
              const editable = canModify(d);
              return (
                <div key={d.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, letterSpacing: 1, marginBottom: 4 }}>
                        {docTypeLabel(d.doc_type)}
                      </div>
                      <div style={{ fontWeight: 800, color: C.primaryDark, fontSize: 15 }}>{d.label}</div>
                      {d.owner_name && (
                        <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>👤 {d.owner_name}</div>
                      )}
                      {d.issuing_country && (
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>🌍 {d.issuing_country}</div>
                      )}
                      {hasFullAccess && d.document_number && (
                        <div style={{ fontSize: 12, color: C.textMid, marginTop: 2, fontFamily: "monospace" }}>
                          # {d.document_number}
                        </div>
                      )}
                      {exp && (
                        <div style={{
                          display: "inline-block", marginTop: 6, padding: "3px 8px",
                          borderRadius: 6, fontSize: 11, fontWeight: 800,
                          background: exp.bg, color: exp.color,
                        }}>
                          {exp.label}
                        </div>
                      )}
                      {d.notes && (
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 6, fontStyle: "italic" }}>
                          {d.notes}
                        </div>
                      )}
                      {hasFullAccess && d.file_path && (
                        <button
                          onClick={() => viewFile(d)}
                          style={{
                            marginTop: 8, padding: "6px 12px", fontSize: 11, fontWeight: 800,
                            background: C.primary, color: "#fff", border: "none", borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          📎 View File
                        </button>
                      )}
                      <AddedBy userId={d.created_by} userMap={userMap} BADGE_COLORS={BADGE_COLORS} />
                    </div>
                    {editable && (
                      <div style={{ display: "flex", gap: 4, marginLeft: 8, alignItems: "flex-start" }}>
                        <button style={S.btnSm(C.editBtn)} onClick={() => openEditDoc(d)}>✏️</button>
                        <ConfirmDelete onConfirm={() => deleteDoc(d)} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CONTACTS */}
      {section === "contacts" && (
        <>
          <button style={S.btn()} onClick={openAddContact}>+ Add Emergency Contact</button>

          {contacts.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: C.textLight, marginTop: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📞</div>
              <div style={{ fontSize: 13 }}>No contacts yet. Add family, embassy, insurance hotline.</div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {contacts.map((c) => {
              const editable = canModify(c);
              return (
                <div key={c.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, letterSpacing: 1, marginBottom: 4 }}>
                        {contactTypeLabel(c.contact_type)}
                        {c.is_24_7 && (
                          <span style={{ marginLeft: 6, padding: "1px 6px", background: C.greenLight, color: C.green, borderRadius: 4, fontSize: 10 }}>
                            24/7
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, color: C.primaryDark, fontSize: 15 }}>{c.name}</div>
                      {c.relationship && (
                        <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>{c.relationship}</div>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} style={{
                          display: "inline-block", marginTop: 6, padding: "4px 10px",
                          background: C.greenLight, color: C.green, borderRadius: 6,
                          fontSize: 13, fontWeight: 800, textDecoration: "none",
                        }}>
                          📞 {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <div style={{ marginTop: 4 }}>
                          <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: C.primary, textDecoration: "none" }}>
                            ✉️ {c.email}
                          </a>
                        </div>
                      )}
                      {c.notes && (
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 6, fontStyle: "italic" }}>
                          {c.notes}
                        </div>
                      )}
                      <AddedBy userId={c.created_by} userMap={userMap} BADGE_COLORS={BADGE_COLORS} />
                    </div>
                    {editable && (
                      <div style={{ display: "flex", gap: 4, marginLeft: 8, alignItems: "flex-start" }}>
                        <button style={S.btnSm(C.editBtn)} onClick={() => openEditContact(c)}>✏️</button>
                        <ConfirmDelete onConfirm={() => deleteContact(c)} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── DOC MODAL ──────────────────────────────────────────────────── */}
      {showModal === "doc" && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT DOCUMENT" : "ADD DOCUMENT"}</div>

            <div style={S.label}>TYPE</div>
            <select style={S.select} value={form.doc_type || "passport"} onChange={f("doc_type")}>
              {DOC_TYPES.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>

            <input style={S.input} placeholder="Label * (e.g. Tim's Passport)" value={form.label || ""} onChange={f("label")} />
            <input style={S.input} placeholder="Owner / Whose? (e.g. Tim, Mom)" value={form.owner_name || ""} onChange={f("owner_name")} />
            <input style={S.input} placeholder="Issuing country (e.g. United States)" value={form.issuing_country || ""} onChange={f("issuing_country")} />

            <div style={S.label}>EXPIRY DATE</div>
            <input style={S.input} type="date" value={form.expiry_date || ""} onChange={f("expiry_date")} />

            {hasFullAccess && (
              <>
                <div style={S.label}>DOCUMENT NUMBER (private — co-owners only)</div>
                <input style={S.input} placeholder="e.g. 123456789" value={form.document_number || ""} onChange={f("document_number")} />

                <div style={S.label}>ATTACH FILE (private — co-owners only)</div>
                <input
                  style={{ ...S.input, padding: "8px 12px" }}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setForm((p) => ({ ...p, _file: e.target.files?.[0] || null }))}
                />
                {editItem?.file_path && !form._file && (
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 8 }}>
                    Existing file attached. Choose new file to replace.
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.textLight, marginBottom: 8 }}>
                  JPG/PNG/PDF · max 10 MB · stored privately in Supabase Storage
                </div>
              </>
            )}

            <input style={S.input} placeholder="Notes (optional)" value={form.notes || ""} onChange={f("notes")} />

            <button style={S.btn()} onClick={saveDoc} disabled={uploading}>
              {uploading ? "Saving…" : editItem ? "Save Changes" : "Add Document"}
            </button>
            <button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal} disabled={uploading}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── CONTACT MODAL ──────────────────────────────────────────────── */}
      {showModal === "contact" && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT CONTACT" : "ADD CONTACT"}</div>

            <div style={S.label}>TYPE</div>
            <select style={S.select} value={form.contact_type || "family"} onChange={f("contact_type")}>
              {CONTACT_TYPES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>

            <input style={S.input} placeholder="Name *" value={form.name || ""} onChange={f("name")} />
            <input style={S.input} placeholder="Relationship (e.g. Mom, US Embassy Wellington)" value={form.relationship || ""} onChange={f("relationship")} />
            <input style={S.input} type="tel" placeholder="Phone (with country code, e.g. +1 555 1234)" value={form.phone || ""} onChange={f("phone")} />
            <input style={S.input} type="email" placeholder="Email" value={form.email || ""} onChange={f("email")} />

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <input
                type="checkbox" id="is_24_7"
                checked={form.is_24_7 === true || form.is_24_7 === "true"}
                onChange={(e) => setForm((p) => ({ ...p, is_24_7: e.target.checked }))}
                style={{ accentColor: C.primary }}
              />
              <label htmlFor="is_24_7" style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
                Available 24/7
              </label>
            </div>

            <input style={S.input} placeholder="Notes" value={form.notes || ""} onChange={f("notes")} />

            <button style={S.btn()} onClick={saveContact}>
              {editItem ? "Save Changes" : "Add Contact"}
            </button>
            <button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
