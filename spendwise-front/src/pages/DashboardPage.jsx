import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getCategories,
  getExpenses,
  getDashboardAnalytics,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expenseService";
import {
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const PAYMENT_METHODS = ["cash", "card", "transfer"];

// Chart color palette matching SpendWise theme
const CHART_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6B7280'
];

const today = () => new Date().toISOString().split("T")[0];
const emptyAnalytics = {
  month_total: 0,
  category_breakdown: [],
  daily_breakdown: [],
};

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(today());
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Tab state - controls which view is displayed
  const [activeTab, setActiveTab] = useState("dashboard");

  const loadDashboardData = useCallback(async () => {
    setLoadingExpenses(true);
    setDashboardError("");

    const [expensesResult, analyticsResult] = await Promise.allSettled([
      getExpenses(token, { month, year }),
      getDashboardAnalytics(token, { month, year }),
    ]);

    if (expensesResult.status === "fulfilled") {
      setExpenses(expensesResult.value);
    } else {
      setExpenses([]);
    }

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value);
    } else {
      setAnalytics(emptyAnalytics);
    }

    if (expensesResult.status === "rejected" || analyticsResult.status === "rejected") {
      setDashboardError("Some dashboard data could not be loaded.");
    }

    setLoadingExpenses(false);
  }, [token, month, year]);

  useEffect(() => {
    getCategories(token).then(setCategories).catch(() => {});
    loadDashboardData();
  }, [token, loadDashboardData]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await createExpense(token, {
        amount: parseFloat(amount),
        description: description || null,
        category_id: categoryId ? parseInt(categoryId) : null,
        expense_date: expenseDate,
        payment_method: paymentMethod,
      });
      setAmount("");
      setDescription("");
      setExpenseDate(today());
      setCategoryId("");
      setPaymentMethod("cash");
      await loadDashboardData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteExpense(token, id);
      await loadDashboardData();
    } catch {
      // silently ignore
    }
  }

  function openEdit(expense) {
    setEditingExpense(expense);
    setEditAmount(String(parseFloat(expense.amount)));
    setEditDescription(expense.description || "");
    setEditDate(expense.expense_date);
    setEditCategoryId(expense.category_id ? String(expense.category_id) : "");
    setEditPaymentMethod(expense.payment_method || "cash");
    setEditError("");
  }

  function closeEdit() {
    setEditingExpense(null);
    setEditError("");
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setEditError("");
    setEditSubmitting(true);
    try {
      const updated = await updateExpense(token, editingExpense.id, {
        amount: parseFloat(editAmount),
        description: editDescription || null,
        category_id: editCategoryId ? parseInt(editCategoryId) : null,
        expense_date: editDate,
        payment_method: editPaymentMethod,
      });
      setExpenses((prev) =>
        prev.map((ex) => (ex.id === updated.id ? { ...ex, ...updated } : ex))
      );
      await loadDashboardData();
      closeEdit();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  const categoryData = activeTab === "dashboard" ? analytics.category_breakdown : [];
  const dailyData = activeTab === "dashboard" ? analytics.daily_breakdown : [];

  const monthTotal = analytics.month_total;
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-base font-bold text-gray-900">SpendWise</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="max-w-7xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "dashboard"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("add-expense")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "add-expense"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Add Expense
          </button>
        </nav>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Tab 1 Content - Dashboard with Charts */}
        {activeTab === "dashboard" && (
          <>
            {/* Month Total Summary */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-gray-900 capitalize">
                  {monthLabel}
                </h2>
                <span className="text-2xl font-bold text-indigo-600">
                  {monthTotal.toFixed(2)} {user?.currency || "EUR"}
                </span>
              </div>
            </section>

            {dashboardError && (
              <section className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-amber-800">{dashboardError}</p>
              </section>
            )}

            {loadingExpenses ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
                <p className="text-sm text-gray-400 text-center">Loading charts...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
                <p className="text-sm text-gray-400 text-center">
                  No expenses yet. Add your first expense to see charts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart - Expenses by Category */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Expenses by Category
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => entry.icon ? `${entry.icon} ${entry.name}` : entry.name}
                        labelLine={true}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${value.toFixed(2)} ${user?.currency || 'EUR'}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </section>

                {/* Line Chart - Daily Expenses */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Daily Expenses - {monthLabel}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="day"
                        label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{
                          value: `Amount (${user?.currency || 'EUR'})`,
                          angle: -90,
                          position: 'insideLeft'
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        labelFormatter={(day, payload) => payload?.[0]?.payload?.date || `Day ${day}`}
                        formatter={(value) => [
                          `${value.toFixed(2)} ${user?.currency || 'EUR'}`,
                          'Amount'
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        dot={{ fill: '#4F46E5', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </section>
              </div>
            )}
          </>
        )}

        {/* Tab 2 Content - Add Expense (keep existing functionality) */}
        {activeTab === "add-expense" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Add Expense Form - UNCHANGED */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Add expense</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: amount + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Row 2: category + payment method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— none —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Lunch, Groceries…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {submitting ? "Adding…" : "Add expense"}
            </button>
          </form>
        </section>

        {/* Expenses list */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 capitalize">{monthLabel}</h2>
            <span className="text-sm font-semibold text-indigo-600">
              {monthTotal.toFixed(2)} {user?.currency || "EUR"}
            </span>
          </div>

          {loadingExpenses ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No expenses this month yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl leading-none flex-shrink-0">
                      {expense.categories?.icon || "💳"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">
                        {expense.description || expense.categories?.name || "Expense"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {expense.expense_date} · {expense.payment_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {parseFloat(expense.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => openEdit(expense)}
                      className="text-gray-300 hover:text-indigo-500 transition-colors"
                      aria-label="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
          </div>
        )}
      </main>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Edit expense</h2>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Row 1: amount + date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: category + payment method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">— none —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch, Groceries…"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {editError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
