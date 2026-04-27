/**
 * @file Dashboard page.
 *
 * Main authenticated screen of the application. Combines two tabs:
 *
 * - **Dashboard**: quick stats (total monthly spending and average
 *   daily costs), filter controls (category and date range) and two
 *   charts (pie by category, line by day).
 * - **Add Expense**: create form for new expenses plus a list of the
 *   filtered expenses with inline edit and delete actions.
 *
 * The page reads its data from the auth and expense service modules and
 * keeps everything in local component state — there is no global store.
 *
 * @module pages/DashboardPage
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getCategories,
  getHiddenCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  hideCategory,
  unhideCategory,
  getExpenses,
  getDashboardAnalytics,
  getDashboardSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  getAlerts,
  dismissAlert,
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

/**
 * Payment methods accepted by the form. Kept in sync with the backend's
 * default `payment_method` values.
 *
 * @type {string[]}
 */
const PAYMENT_METHODS = ["cash", "card", "transfer"];

/**
 * Fallback palette for the category pie chart slices. Used in the order
 * the slices appear when a category does not specify its own colour.
 *
 * @type {string[]}
 */
const CHART_COLORS = [
  "#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#6B7280"
];

/**
 * Predefined icons available for categories so users do not need to
 * type emojis manually from the keyboard.
 *
 * @type {{ value: string, label: string }[]}
 */
const CATEGORY_ICONS = [
  { value: "🏷️", label: "Generic" },
  { value: "🍔", label: "Food" },
  { value: "🛒", label: "Groceries" },
  { value: "🏠", label: "Home" },
  { value: "🚗", label: "Transport" },
  { value: "⛽", label: "Fuel" },
  { value: "💡", label: "Bills" },
  { value: "🎬", label: "Entertainment" },
  { value: "🩺", label: "Health" },
  { value: "✈️", label: "Travel" },
  { value: "🎓", label: "Education" },
  { value: "🐶", label: "Pets" },
  { value: "🎁", label: "Gifts" },
  { value: "👕", label: "Clothes" },
  { value: "💼", label: "Work" },
  { value: "💳", label: "Other" },
];

/**
 * Return today's date as an ISO `YYYY-MM-DD` string. Used as the default
 * value for the "expense date" inputs.
 *
 * @returns {string}
 */
const today = () => new Date().toISOString().split("T")[0];

/**
 * Analytics shape used while we are still loading or when the request
 * fails, so the rest of the component can keep iterating over the same
 * keys without `undefined` checks.
 *
 * @type {{ month_total: number, category_breakdown: Array, daily_breakdown: Array }}
 */
const emptyAnalytics = {
  month_total: 0,
  category_breakdown: [],
  daily_breakdown: [],
};

/**
 * Dashboard page component.
 *
 * Owns a fairly large amount of local state because it powers both the
 * stats panel and the create / edit / delete flow for expenses:
 *
 * - **Filters**: month/year for the summary, plus category and date
 *   range for the expense list and analytics.
 * - **Async data**: categories, expenses, analytics and summary, each
 *   with its own loading flag and error fallback.
 * - **Forms**: separate state for the inline "Add expense" form and for
 *   the modal "Edit expense" form, including submission flags.
 * - **UI**: which tab is active (`dashboard` vs `add-expense`).
 *
 * Side effects:
 *
 * - Fetches categories once on mount.
 * - Re-fetches expenses + analytics whenever any filter changes.
 * - Re-fetches the summary whenever the month or year changes.
 * - Calls the auth context's `logout` and navigates back to `/login`.
 *
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
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

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#4F46E5");
  const [categoryIcon, setCategoryIcon] = useState("🏷️");
  const [categoryFormError, setCategoryFormError] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("#4F46E5");
  const [editCategoryIcon, setEditCategoryIcon] = useState("🏷️");
  const [editCategoryError, setEditCategoryError] = useState("");
  const [editCategorySubmitting, setEditCategorySubmitting] = useState(false);

  const [alerts, setAlerts] = useState([]);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getAlerts(token);
      setAlerts(data);
    } catch {
      setAlerts([]);
    }
  }, [token]);

  const [settingsFullName, setSettingsFullName] = useState("");
  const [settingsCurrency, setSettingsCurrency] = useState("");
  const [settingsIncome, setSettingsIncome] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");

  const loadCategories = useCallback(async () => {
    const [visibleCategories, hiddenSharedCategories] = await Promise.all([
      getCategories(token),
      getHiddenCategories(token),
    ]);
    setCategories(visibleCategories);
    setHiddenCategories(hiddenSharedCategories);

    const ids = new Set(visibleCategories.map((category) => String(category.id)));
    setSelectedCategory((prev) => (prev && !ids.has(String(prev)) ? "" : prev));
    setCategoryId((prev) => (prev && !ids.has(String(prev)) ? "" : prev));
    setEditCategoryId((prev) => (prev && !ids.has(String(prev)) ? "" : prev));
  }, [token]);

  /**
   * Reload the expenses and the analytics payload using the current
   * filter state. Both requests are run with `Promise.allSettled` so a
   * failure in one does not blank out the other; errors are surfaced
   * via the inline `dashboardError` banner.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Fetch the monthly summary (total + daily average) for the currently
   * selected month and year. Resets to `null` on failure.
   *
   * @returns {Promise<void>}
   */
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
    if (user) {
      setSettingsFullName(user.full_name || "");
      setSettingsCurrency(user.currency || "EUR");
      setSettingsIncome(user.monthly_income != null ? String(user.monthly_income) : "");
    }
  }, [user]);

  useEffect(() => {
    loadCategories().catch(() => {});
  }, [loadCategories]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  /**
   * Sign the user out (both server-side and locally via the auth
   * context) and bounce back to the login page.
   *
   * @returns {Promise<void>}
   */
  async function handleDismissAlert(id) {
    try {
      await dismissAlert(token, id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Best-effort: swallow so a transient error doesn't block the UI.
    }
  }

  async function handleSettingsSubmit(e) {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess(false);
    setSettingsSubmitting(true);
    try {
      const payload = {};
      if (settingsFullName.trim()) payload.full_name = settingsFullName.trim();
      if (settingsCurrency) payload.currency = settingsCurrency;
      if (settingsIncome !== "") payload.monthly_income = parseFloat(settingsIncome);
      await updateUser(payload);
      setSettingsSuccess(true);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  /**
   * Submit handler for the "Add expense" form. Builds the payload from
   * the form state, calls the API, resets the inputs, and refreshes
   * both the dashboard data and the summary so the new expense is
   * visible immediately.
   *
   * @param {Event} e
   * @returns {Promise<void>}
   */
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

  /**
   * Delete an expense by id and refresh the dashboard data. Errors are
   * intentionally swallowed: the delete is idempotent on the backend
   * and a transient failure should not block the UI.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  async function handleDelete(id) {
    try {
      await deleteExpense(token, id);
      await loadDashboardData();
      await fetchSummary();
    } catch {
      // Best-effort: swallow network glitches so the UI stays responsive.
    }
  }

  /**
   * Open the edit modal for a given expense, prefilling the form with
   * its current values.
   *
   * @param {Expense} expense
   */
  function openEdit(expense) {
    setEditingExpense(expense);
    setEditAmount(String(parseFloat(expense.amount)));
    setEditDescription(expense.description || "");
    setEditDate(expense.expense_date);
    setEditCategoryId(expense.category_id ? String(expense.category_id) : "");
    setEditPaymentMethod(expense.payment_method || "cash");
    setEditError("");
  }

  /**
   * Close the edit modal without persisting any changes.
   */
  function closeEdit() {
    setEditingExpense(null);
    setEditError("");
  }

  /**
   * Submit handler for the "Edit expense" form. Sends the patched
   * fields to the backend, applies the response into the local
   * `expenses` array (so the list updates instantly even before the
   * full refetch resolves), then refreshes the dashboard and closes
   * the modal.
   *
   * @param {Event} e
   * @returns {Promise<void>}
   */
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

  async function handleCategorySubmit(e) {
    e.preventDefault();
    setCategoryFormError("");
    setCategorySubmitting(true);
    try {
      await createCategory(token, {
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
        color: categoryColor || null,
        icon: categoryIcon.trim() || null,
      });
      setCategoryName("");
      setCategoryDescription("");
      setCategoryColor("#4F46E5");
      setCategoryIcon("🏷️");
      await loadCategories();
    } catch (err) {
      setCategoryFormError(err.message);
    } finally {
      setCategorySubmitting(false);
    }
  }

  function openCategoryEdit(category) {
    setEditingCategory(category);
    setEditCategoryName(category.name || "");
    setEditCategoryDescription(category.description || "");
    setEditCategoryColor(category.color || "#4F46E5");
    setEditCategoryIcon(category.icon || "🏷️");
    setEditCategoryError("");
  }

  function closeCategoryEdit() {
    setEditingCategory(null);
    setEditCategoryError("");
  }

  async function handleCategoryUpdate(e) {
    e.preventDefault();
    setEditCategoryError("");
    setEditCategorySubmitting(true);
    try {
      await updateCategory(token, editingCategory.id, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || null,
        color: editCategoryColor || null,
        icon: editCategoryIcon.trim() || null,
      });
      await loadCategories();
      closeCategoryEdit();
    } catch (err) {
      setEditCategoryError(err.message);
    } finally {
      setEditCategorySubmitting(false);
    }
  }

  async function handleCategoryDelete(id) {
    setCategoryFormError("");
    try {
      await deleteCategory(token, id);
      await loadCategories();
    } catch (err) {
      setCategoryFormError(err.message);
    }
  }

  async function handleHideCategory(id) {
    setCategoryFormError("");
    try {
      await hideCategory(token, id);
      await loadCategories();
    } catch (err) {
      setCategoryFormError(err.message);
    }
  }

  async function handleUnhideCategory(id) {
    setCategoryFormError("");
    try {
      await unhideCategory(token, id);
      await loadCategories();
    } catch (err) {
      setCategoryFormError(err.message);
    }
  }

  const categoryData = activeTab === "dashboard" ? analytics.category_breakdown : [];
  const dailyData = activeTab === "dashboard" ? analytics.daily_breakdown : [];
  const myCategories = categories.filter((category) => category.user_id);
  const sharedCategories = categories.filter((category) => !category.user_id);

  // Compute Quick Stats from local expenses array
  const monthTotal = analytics.month_total;
  const selectedRangeDays = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1)
    : now.getDate();
  const dailyAverage = monthTotal / selectedRangeDays;

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
            onClick={() => setActiveTab("alerts")}
            className="relative text-gray-400 hover:text-indigo-600 transition-colors"
            aria-label="Alerts"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
            </svg>
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {alerts.length > 9 ? "9+" : alerts.length}
              </span>
            )}
          </button>
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
          <button
            onClick={() => setActiveTab("manage-categories")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "manage-categories"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Manage Categories
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`relative py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "alerts"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Alerts
            {alerts.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {alerts.length > 9 ? "9+" : alerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {activeTab === "dashboard" && (
          <>
            {dashboardError && (
              <section className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-amber-800">{dashboardError}</p>
              </section>
            )}

            {/* Backend Summary */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Quick Stats</h3>
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

            {/* Filters */}
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
                        <span className="text-xl leading-none shrink-0">
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
                      <div className="flex items-center gap-3 shrink-0">
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

        {activeTab === "alerts" && (
          <div className="max-w-2xl mx-auto">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Alerts</h2>
                <span className="text-sm text-gray-500">{alerts.length} pending</span>
              </div>

              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm text-gray-400">No pending alerts. You are within all your budgets.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {alerts.map((alert) => (
                    <li key={alert.id} className="flex items-start justify-between gap-4 py-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            Budget exceeded
                            {alert.budgets && (
                              <span className="font-normal text-gray-500">
                                {" "}— limit {parseFloat(alert.budgets.amount).toFixed(2)} {user?.currency || "EUR"} ({alert.budgets.month}/{alert.budgets.year})
                              </span>
                            )}
                          </p>
                          {alert.expenses && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Triggered by: {alert.expenses.description || "expense"} · {parseFloat(alert.expenses.amount).toFixed(2)} {user?.currency || "EUR"}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(alert.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="shrink-0 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Dismiss
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-lg mx-auto">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Profile & Preferences</h2>
              <p className="text-sm text-gray-500 mb-6">Changes are saved immediately to your account.</p>

              <form onSubmit={handleSettingsSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={settingsFullName}
                    onChange={(e) => { setSettingsFullName(e.target.value); setSettingsSuccess(false); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                  <select
                    value={settingsCurrency}
                    onChange={(e) => { setSettingsCurrency(e.target.value); setSettingsSuccess(false); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {["EUR", "USD", "GBP", "JPY", "CHF", "CAD", "AUD", "MXN", "BRL"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Income (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={settingsIncome}
                    onChange={(e) => { setSettingsIncome(e.target.value); setSettingsSuccess(false); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {settingsError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{settingsError}</p>
                )}
                {settingsSuccess && (
                  <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Profile updated successfully.</p>
                )}

                <button
                  type="submit"
                  disabled={settingsSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {settingsSubmitting ? "Saving…" : "Save changes"}
                </button>
              </form>
            </section>
          </div>
        )}

        {activeTab === "manage-categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Create category</h2>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Groceries"
                  />
                </div>

                <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                    <select
                      value={categoryIcon}
                      onChange={(e) => setCategoryIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {CATEGORY_ICONS.map((iconOption) => (
                        <option key={iconOption.value} value={iconOption.value}>
                          {iconOption.value} {iconOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        className="h-10 w-12 rounded border border-gray-300 bg-white"
                      />
                      <input
                        type="text"
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    rows="4"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Meals, groceries and supermarket purchases."
                  />
                </div>

                {categoryFormError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{categoryFormError}</p>
                )}

                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {categorySubmitting ? "Saving…" : "Create category"}
                </button>
              </form>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Available categories</h2>
                <span className="text-sm text-gray-500">{myCategories.length} mine · {sharedCategories.length} shared</span>
              </div>

              {categories.length === 0 && hiddenCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No categories available yet.</p>
              ) : (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">My Categories</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{myCategories.length}</span>
                    </div>

                    {myCategories.length === 0 ? (
                      <p className="text-sm text-gray-400">You have not created any personal categories yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myCategories.map((category) => (
                          <article
                            key={category.id}
                            className="rounded-2xl border border-gray-200 p-4 bg-gray-50 flex flex-col gap-4"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-black/5"
                                  style={{ backgroundColor: category.color || "#E5E7EB" }}
                                >
                                  {category.icon || "🏷️"}
                                </span>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 truncate">{category.name}</h3>
                                  <p className="text-xs text-gray-500">{category.color || "No color"}</p>
                                </div>
                              </div>
                              {category.description && (
                                <p className="text-sm text-gray-600 mt-3">{category.description}</p>
                              )}
                            </div>

                            <div className="flex gap-3 mt-auto">
                              <button
                                type="button"
                                onClick={() => openCategoryEdit(category)}
                                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-white transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCategoryDelete(category.id)}
                                className="flex-1 bg-red-50 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Shared Categories</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{sharedCategories.length}</span>
                    </div>

                    {sharedCategories.length === 0 ? (
                      <p className="text-sm text-gray-400">No shared categories are currently visible.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sharedCategories.map((category) => (
                          <article
                            key={category.id}
                            className="rounded-2xl border border-gray-200 p-4 bg-gray-50 flex flex-col gap-4"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-black/5"
                                  style={{ backgroundColor: category.color || "#E5E7EB" }}
                                >
                                  {category.icon || "🏷️"}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{category.name}</h3>
                                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                      Shared
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">{category.color || "No color"}</p>
                                </div>
                              </div>
                              {category.description && (
                                <p className="text-sm text-gray-600 mt-3">{category.description}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleHideCategory(category.id)}
                              className="mt-auto w-full border border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium py-2.5 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              Hide from my categories
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Hidden Shared Categories</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{hiddenCategories.length}</span>
                    </div>

                    {hiddenCategories.length === 0 ? (
                      <p className="text-sm text-gray-400">You have not hidden any shared categories.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hiddenCategories.map((category) => (
                          <article
                            key={category.id}
                            className="rounded-2xl border border-dashed border-gray-300 p-4 bg-white flex flex-col gap-4"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-black/5 opacity-60"
                                  style={{ backgroundColor: category.color || "#E5E7EB" }}
                                >
                                  {category.icon || "🏷️"}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{category.name}</h3>
                                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                      Hidden
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">{category.color || "No color"}</p>
                                </div>
                              </div>
                              {category.description && (
                                <p className="text-sm text-gray-600 mt-3">{category.description}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUnhideCategory(category.id)}
                              className="mt-auto w-full border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Restore to my categories
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Edit category</h2>
              <button
                onClick={closeCategoryEdit}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close category editor"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCategoryUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                  <select
                    value={editCategoryIcon}
                    onChange={(e) => setEditCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {CATEGORY_ICONS.map((iconOption) => (
                      <option key={iconOption.value} value={iconOption.value}>
                        {iconOption.value} {iconOption.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editCategoryColor}
                      onChange={(e) => setEditCategoryColor(e.target.value)}
                      className="h-10 w-12 rounded border border-gray-300 bg-white"
                    />
                    <input
                      type="text"
                      value={editCategoryColor}
                      onChange={(e) => setEditCategoryColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  rows="4"
                  value={editCategoryDescription}
                  onChange={(e) => setEditCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {editCategoryError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editCategoryError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeCategoryEdit}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editCategorySubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {editCategorySubmitting ? "Saving…" : "Save category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
