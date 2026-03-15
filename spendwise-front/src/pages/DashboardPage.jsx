import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const displayName = user?.full_name || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">SpendWise</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.full_name || "—"}
              </h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-3">
            <ProfileRow label="User ID" value={user?.id} mono />
            <ProfileRow label="Email" value={user?.email} />
            {user?.full_name && (
              <ProfileRow label="Full name" value={user.full_name} />
            )}
            {user?.currency && (
              <ProfileRow label="Currency" value={user.currency} />
            )}
            {user?.monthly_income != null && (
              <ProfileRow
                label="Monthly income"
                value={`${user.currency || ""} ${user.monthly_income}`}
              />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          You are signed in as <span className="font-medium">{user?.email}</span>
        </p>
      </main>
    </div>
  );
}

function ProfileRow({ label, value, mono }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}
