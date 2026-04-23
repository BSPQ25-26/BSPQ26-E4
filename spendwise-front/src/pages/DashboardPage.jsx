import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getCategories,
  getExpenses,
  getDashboardAnalytics,
  getDashboardSummary,
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
} from "recharts";

const PAYMENT_METHODS = ["cash", "card", "transfer"];

const CHART_COLORS = [
  "#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#6B7280"
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
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(today());
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingExpense, setEditingExpense] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");

  const loadDashboardData = useCallback(async () => {
    setLoadingExpenses(true);
    setDashboardError("");

    const filters = {};
    if (selectedCategory) filters.category_id = selectedCategory;
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    if (!startDate && !endDate) {
      filters.month = month;
      filters.year = year;
    }

    const [expensesResult, analyticsResult] = await Promise.allSettled([
      getExpenses(token, filters),
      getDashboardAnalytics(token, filters),
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
  }, [token, month, year, selectedCategory, startDate, endDate]);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getDashboardSummary(token, { month, year });
      setSummaryData(data);
    } catch {
      setSummaryData(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [token, month, year]);

  useEffect(() => {
    getCategories(token).then(setCategories).catch(() => {});
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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
      await fetchSummary();
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
      await fetchSummary();
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
      await fetchSummary();
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
  const monthLabel = startDate && endDate ? `${startDate} to ${endDate}` :
    startDate ? `From ${startDate}` :
    endDate ? `Until ${endDate}` :
    now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
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
        {activeTab === "dashboard" && (
          <>
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

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Official Backend Summary</h3>
                <div className="flex gap-2">
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((itemMonth) => {
                      const date = new Date(2000, itemMonth - 1, 1);
                      return (
                        <option key={itemMonth} value={itemMonth}>
                          {date.toLocaleString("default", { month: "long" })}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((itemYear) => (
                      <option key={itemYear} value={itemYear}>{itemYear}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Monthly Spending</h3>
                  <div className="text-2xl font-bold text-indigo-600">
                    {loadingSummary ? "..." : `${summaryData?.total_monthly_spending?.toFixed(2) || "0.00"} ${user?.currency || "EUR"}`}
                  </div>
                </section>
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Average Daily Costs</h3>
                  <div className="text-2xl font-bold text-emerald-600">
                    {loadingSummary ? "..." : `${summaryData?.average_daily_costs?.toFixed(2) || "0.00"} ${user?.currency || "EUR"}`}
                  </div>
                </section>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

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
                        labelLine
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${value.toFixed(2)} ${user?.currency || "EUR"}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </section>

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Daily Expenses - {monthLabel}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="day"
                        label={{ value: "Day of Month", position: "insideBottom", offset: -5 }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{
                          value: `Amount (${user?.currency || "EUR"})`,
                          angle: -90,
                          position: "insideLeft"
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        labelFormatter={(day, payload) => payload?.[0]?.payload?.date || `Day ${day}`}
                        formatter={(value) => [
                          `${value.toFixed(2)} ${user?.currency || "EUR"}`,
                          "Amount"
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        dot={{ fill: "#4F46E5", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </section>
              </div>
            )}
          </>
        )}

        {activeTab === "add-expense" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Add expense</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
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
