import React from "react";
import { createRoot } from "react-dom/client";
import { AlertCircle, BarChart3, CheckCircle2, ClipboardList, Clock3, FilePlus2, LogOut, Megaphone, ShieldCheck, Ticket, ThumbsUp, UserPlus } from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const categories = ["Infrastructure", "Academics", "Hostel", "Safety", "IT / ERP", "Other"];
const statuses = ["Pending", "In Progress", "Resolved"];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function timeRemaining(deadline) {
  if (!deadline) return "No deadline";
  const diff = new Date(deadline) - Date.now();
  const hours = Math.floor(Math.abs(diff) / 3600000);
  const minutes = Math.floor((Math.abs(diff) % 3600000) / 60000);
  return diff < 0 ? `Overdue by ${hours}h ${minutes}m` : `${hours}h ${minutes}m remaining`;
}

function statusClass(status) {
  if (status === "Resolved") return "status success";
  if (status === "In Progress") return "status warning";
  return "status neutral";
}

function priorityLabel(score) {
  if (score >= 80) return "Immediate";
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState("dashboard");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setView("dashboard");
  }

  if (loading) return <Shell><div className="empty">Loading Campify...</div></Shell>;

  if (!user) {
    return <AuthScreen onAuth={setUser} error={error} setError={setError} />;
  }

  return (
    <Shell user={user} view={view} setView={setView} logout={logout}>
      {user.role === "admin" ? (
        <AdminDashboard />
      ) : (
        <StudentApp user={user} view={view} setView={setView} />
      )}
    </Shell>
  );
}

function Shell({ children, user, view, setView, logout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={26} />
          <div>
            <strong>Campify</strong>
            <span>Campus governance</span>
          </div>
        </div>
        {user && (
          <nav>
            <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><BarChart3 size={18} />Dashboard</button>
            {user.role === "student" && <button className={view === "complaint" ? "active" : ""} onClick={() => setView("complaint")}><Megaphone size={18} />Complaint</button>}
            {user.role === "student" && <button className={view === "ticket" ? "active" : ""} onClick={() => setView("ticket")}><Ticket size={18} />Ticket</button>}
            <button onClick={logout}><LogOut size={18} />Logout</button>
          </nav>
        )}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function AuthScreen({ onAuth, error, setError }) {
  const [mode, setMode] = React.useState("login");
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <section className="auth-panel">
        <div className="auth-copy">
          <ShieldCheck size={34} />
          <h1>Campify</h1>
          <p>Transparent complaint handling, formal tickets, community signals, and SLA-aware administration.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="segmented">
            <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>Login</button>
            <button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>Sign up</button>
          </div>
          {mode === "signup" && <TextInput label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />}
          <TextInput label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
          <TextInput label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} required />
          {error && <p className="error"><AlertCircle size={16} />{error}</p>}
          <button className="primary" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}</button>
        </form>
      </section>
    </Shell>
  );
}

function StudentApp({ user, view, setView }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    return api("/student/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (view === "complaint") return <IssueForm mode="complaint" onDone={() => { setView("dashboard"); load(); }} />;
  if (view === "ticket") return <IssueForm mode="ticket" onDone={() => { setView("dashboard"); load(); }} />;

  return (
    <section>
      <Header title={`Welcome, ${user.publicId}`} subtitle="Manage your complaints, tickets, and campus-wide updates." />
      {error && <Notice message={error} />}
      {!data ? <div className="empty">Loading dashboard...</div> : (
        <div className="dashboard-grid">
          <Panel title="My Tickets" icon={<Ticket size={18} />} action={<button onClick={() => setView("ticket")}><FilePlus2 size={16} />New</button>}>
            <CardList items={data.myTickets} empty="No tickets submitted." ticket />
          </Panel>
          <Panel title="My Complaints" icon={<ClipboardList size={18} />} action={<button onClick={() => setView("complaint")}><FilePlus2 size={16} />New</button>}>
            <CardList items={data.complaints} empty="No complaints yet." />
          </Panel>
          <Panel title="All Complaints" icon={<Megaphone size={18} />} wide>
            <CardList items={data.allComplaints} empty="No public complaints yet." onUpvote={async (id) => { await api(`/student/complaints/${id}/upvote`, { method: "POST" }); await load(); }} currentUserId={user.id} />
          </Panel>
        </div>
      )}
    </section>
  );
}

function IssueForm({ mode, onDone }) {
  const [form, setForm] = React.useState({});
  const [proof, setProof] = React.useState(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const isTicket = mode === "ticket";

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (proof) body.append("proof", proof);
    try {
      await api(isTicket ? "/student/tickets" : "/student/complaints", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <Header title={isTicket ? "Raise Formal Ticket" : "Raise Complaint"} subtitle={isTicket ? "Formal tickets carry a 48-hour SLA and require contact details." : "Submit a campus concern with optional proof."} />
      <form className="issue-form" onSubmit={submit}>
        <div className="form-section">
          <h2>Issue Details</h2>
          <TextInput label="Title" value={form.title || ""} onChange={(v) => setField("title", v)} required />
          <label>Description<textarea rows="5" value={form.description || ""} onChange={(e) => setField("description", e.target.value)} required /></label>
          <label>Category<select value={form.category || ""} onChange={(e) => setField("category", e.target.value)} required><option value="">Select category</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <TextInput label="Location" value={form.location || ""} onChange={(v) => setField("location", v)} required />
          <label>Proof<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg" onChange={(e) => setProof(e.target.files[0])} /></label>
        </div>
        {isTicket && (
          <div className="form-section">
            <h2>Student Contact</h2>
            <TextInput label="Your Name" value={form.studentName || ""} onChange={(v) => setField("studentName", v)} required />
            <TextInput label="Class / Department" value={form.studentClass || ""} onChange={(v) => setField("studentClass", v)} required />
            <TextInput label="Email" type="email" value={form.contactEmail || ""} onChange={(v) => setField("contactEmail", v)} required />
            <TextInput label="Contact Number" value={form.contactNumber || ""} onChange={(v) => setField("contactNumber", v)} required />
          </div>
        )}
        {error && <Notice message={error} />}
        <button className="primary" disabled={busy}>{busy ? "Submitting..." : isTicket ? "Submit Ticket" : "Submit Complaint"}</button>
      </form>
    </section>
  );
}

function AdminDashboard() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    return api("/admin/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    await api(`/admin/complaints/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <section>
      <Header title="Admin Dashboard" subtitle="Prioritize urgent issues, track SLA health, and close the loop." />
      {error && <Notice message={error} />}
      {!data ? <div className="empty">Loading dashboard...</div> : (
        <>
          <div className="metrics">
            <Metric label="Total Tickets" value={data.metrics.totalTickets} />
            <Metric label="Active Tickets" value={data.metrics.activeTickets} />
            <Metric label="Overdue Tickets" value={data.metrics.overdueTickets} danger />
            <Metric label="Active Complaints" value={data.metrics.activeNormalComplaints} />
            <Metric label="Avg Resolution" value={`${data.metrics.avgResolution.toFixed(1)}h`} />
            <Metric label="SLA Compliance" value={`${data.metrics.slaCompliance.toFixed(1)}%`} />
            <Metric label="Overdue Rate" value={`${data.metrics.overdueRate.toFixed(1)}%`} />
          </div>
          <Panel title="Active Tickets" icon={<Ticket size={18} />}>
            <CardList items={data.activeTickets} empty="No active tickets." admin onStatus={updateStatus} ticket />
          </Panel>
          <Panel title="Normal Complaints" icon={<Megaphone size={18} />}>
            <CardList items={data.complaints} empty="No active complaints." admin onStatus={updateStatus} />
          </Panel>
          <div className="archives">
            <Panel title="Resolved Tickets" icon={<CheckCircle2 size={18} />}>
              <CardList items={data.resolvedTickets} empty="No resolved tickets." ticket compact />
            </Panel>
            <Panel title="Resolved Complaints" icon={<CheckCircle2 size={18} />}>
              <CardList items={data.resolvedComplaints} empty="No resolved complaints." compact />
            </Panel>
          </div>
        </>
      )}
    </section>
  );
}

function CardList({ items, empty, onUpvote, currentUserId, admin, onStatus, ticket, compact }) {
  if (!items.length) return <div className="empty">{empty}</div>;
  return <div className={compact ? "cards compact" : "cards"}>{items.map((item) => <IssueCard key={item.id} item={item} onUpvote={onUpvote} currentUserId={currentUserId} admin={admin} onStatus={onStatus} ticket={ticket} />)}</div>;
}

function IssueCard({ item, onUpvote, currentUserId, admin, onStatus, ticket }) {
  const [open, setOpen] = React.useState(false);
  return (
    <article className="issue-card">
      <div className="card-top">
        <div className="avatar">{item.publicId?.charAt(0)?.toUpperCase() || "U"}</div>
        <div className="issue-main">
          <div className="meta">u/{item.publicId} · {item.category} · {item.location}</div>
          <h3>{item.title}</h3>
          <div className="badges">
            <span className={statusClass(item.status)}>{item.status}</span>
            <span className="pill"><ThumbsUp size={14} />{item.upvotes}</span>
            {ticket && <span className="pill"><Clock3 size={14} />{timeRemaining(item.ticketDeadline)}</span>}
            {admin && <span className="pill">{priorityLabel(item.priorityScore)} priority</span>}
          </div>
        </div>
        <button className="ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "Details"}</button>
      </div>
      {open && (
        <div className="details">
          <p>{item.description}</p>
          <dl>
            <div><dt>Created</dt><dd>{formatDate(item.createdAt)}</dd></div>
            {item.resolvedAt && <div><dt>Resolved</dt><dd>{formatDate(item.resolvedAt)}</dd></div>}
            {ticket && <div><dt>Deadline</dt><dd>{formatDate(item.ticketDeadline)}</dd></div>}
            {item.resolutionHours !== undefined && <div><dt>Resolution</dt><dd>{item.resolutionHours}h</dd></div>}
          </dl>
          {ticket && item.contactEmail && <StudentContact item={item} />}
          <Proofs proofs={item.proofs} />
          <div className="card-actions">
            {onUpvote && item.userId !== currentUserId && <button onClick={() => onUpvote(item.id)}><ThumbsUp size={16} />{item.hasUpvoted ? "Upvoted" : "Upvote"}</button>}
            {admin && onStatus && <select value={item.status} onChange={(e) => onStatus(item.id, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select>}
          </div>
        </div>
      )}
    </article>
  );
}

function StudentContact({ item }) {
  return (
    <div className="contact">
      <strong>Student Contact</strong>
      <span>{item.studentName}</span>
      <span>{item.studentClass}</span>
      <span>{item.contactEmail}</span>
      <span>{item.contactNumber}</span>
    </div>
  );
}

function Proofs({ proofs }) {
  if (!proofs?.length) return null;
  return (
    <div className="proofs">
      {proofs.map((proof) => {
        if (proof.fileType.startsWith("image")) return <img key={proof.url} src={proof.url} alt={proof.originalName || "Proof"} />;
        if (proof.fileType.startsWith("video")) return <video key={proof.url} src={proof.url} controls />;
        if (proof.fileType.startsWith("audio")) return <audio key={proof.url} src={proof.url} controls />;
        return null;
      })}
    </div>
  );
}

function Header({ title, subtitle }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div></header>;
}

function Panel({ title, icon, action, children, wide }) {
  return <section className={wide ? "panel wide" : "panel"}><div className="panel-head"><h2>{icon}{title}</h2>{action}</div>{children}</section>;
}

function Metric({ label, value, danger }) {
  return <div className={danger ? "metric danger" : "metric"}><span>{label}</span><strong>{value}</strong></div>;
}

function TextInput({ label, type = "text", value, onChange, required }) {
  return <label>{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}

function Notice({ message }) {
  return <p className="error"><AlertCircle size={16} />{message}</p>;
}

createRoot(document.getElementById("root")).render(<App />);
