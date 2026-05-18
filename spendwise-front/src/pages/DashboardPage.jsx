/**
 * @file Dashboard page.
 *
 * Main authenticated screen of the application. Combines five tabs:
 *
 * - **Dashboard**: quick stats (total monthly spending and average
 *   daily costs), filter controls (category and date range) and two
 *   charts (pie by category, line by day).
 * - **Add Expense**: create form for new expenses plus a list of the
 *   filtered expenses with inline edit and delete actions.
 * - **Manage Categories**: CRUD for the user's own categories plus
 *   hide / restore of shared ones.
 * - **Alerts**: pending budget alerts with a dismiss action.
 * - **Settings**: profile editing (display name, currency, monthly
 *   income, language).
 *
 * The page reads its data from the auth and expense service modules and
 * keeps everything in local component state — there is no global store.
 * All user-visible strings flow through `react-i18next`; date and month
 * formatting follow `i18n.language` so the entire UI tracks the active
 * locale.
 *
 * @module pages/DashboardPage
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
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
  getAlertStatuses,
  dismissAlert,
  exportExpensesToCSV,
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
 * Payment methods accepted by the form. Kept as raw API values; the
 * UI looks up a translated label for each one through
 * `t("expenses.paymentMethods.<value>")`.
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
 * Predefined icons available for categories. Each entry pairs the emoji
 * with the i18n key that resolves to its translated label.
 *
 * @type {Array<{value: string, labelKey: string}>}
 */
const CATEGORY_ICONS = [
  { value: "🏷️", labelKey: "categories.icons.Generic" },
  { value: "🍔", labelKey: "categories.icons.Food" },
  { value: "🛒", labelKey: "categories.icons.Groceries" },
  { value: "🏠", labelKey: "categories.icons.Home" },
  { value: "🚗", labelKey: "categories.icons.Transport" },
  { value: "⛽", labelKey: "categories.icons.Fuel" },
  { value: "💡", labelKey: "categories.icons.Bills" },
  { value: "🎬", labelKey: "categories.icons.Entertainment" },
  { value: "🩺", labelKey: "categories.icons.Health" },
  { value: "✈️", labelKey: "categories.icons.Travel" },
  { value: "🎓", labelKey: "categories.icons.Education" },
  { value: "🐶", labelKey: "categories.icons.Pets" },
  { value: "🎁", labelKey: "categories.icons.Gifts" },
  { value: "👕", labelKey: "categories.icons.Clothes" },
  { value: "💼", labelKey: "categories.icons.Work" },
  { value: "💳", labelKey: "categories.icons.Other" },
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
 * Owns a fairly large amount of local state because it powers the
 * stats panel, the create / edit / delete flow for expenses, and the
 * category management screen.
 *
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  const { t, i18n } = useTranslation();
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
  const [showBudgetComparison, setShowBudgetComparison] = useState(false);
  const [alertStatuses, setAlertStatuses] = useState([]);
  const [loadingAlertStatuses, setLoadingAlertStatuses] = useState(false);
  const [alertStatusError, setAlertStatusError] = useState("");

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getAlerts(token);
      setAlerts(data);
    } catch {
      setAlerts([]);
    }
  }, [token]);

  const loadAlertStatuses = useCallback(async () => {
    setLoadingAlertStatuses(true);
    setAlertStatusError("");
    try {
      const data = await getAlertStatuses(token, { month, year });
      setAlertStatuses(data);
    } catch (err) {
      setAlertStatuses([]);
      setAlertStatusError(err.message || t("dashboard.budgetComparison.loadError"));
    } finally {
      setLoadingAlertStatuses(false);
    }
  }, [token, month, year, t]);

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
      setDashboardError(t("dashboard.error"));
    }

    setLoadingExpenses(false);
  }, [token, month, year, selectedCategory, startDate, endDate, t, user?.currency]);

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
  }, [token, month, year, user?.currency]);

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

  useEffect(() => {
    if (showBudgetComparison) {
      loadAlertStatuses();
    }
  }, [showBudgetComparison, loadAlertStatuses]);

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
        currency: user?.currency || "EUR",
      });
      setAmount("");
      setDescription("");
      setExpenseDate(today());
      setCategoryId("");
      setPaymentMethod("cash");
      await loadDashboardData();
      await fetchSummary();
      if (showBudgetComparison) await loadAlertStatuses();
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
      if (showBudgetComparison) await loadAlertStatuses();
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
   * Submit handler for the "Edit expense" form.
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
        currency: user?.currency || "EUR",
      });
      setExpenses((prev) =>
        prev.map((ex) => (ex.id === updated.id ? { ...ex, ...updated } : ex))
      );
      await loadDashboardData();
      await fetchSummary();
      if (showBudgetComparison) await loadAlertStatuses();
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

  /**
   * Build a filename that embeds the active period and trigger the CSV
   * download using the expenses already loaded into component state.
   *
   * @returns {void}
   */
  function handleExportCSV() {
    const periodLabel = startDate && endDate
      ? `${startDate}_${endDate}`
      : `${year}-${String(month).padStart(2, "0")}`;
    exportExpensesToCSV(expenses, `spendwise-expenses-${periodLabel}.xlsx`);
  }

  // Compute Quick Stats from local expenses array.
  const monthTotal = analytics.month_total;

  // Human-friendly label for the active period. Uses the i18n month
  // name when no explicit range is set so the heading tracks the
  // current locale (English → "May 2026", Spanish → "mayo de 2026",
  // Basque → "2026 maiatza", etc.).
  const monthLabel = startDate && endDate
    ? t("dashboard.monthLabel.range", { start: startDate, end: endDate })
    : startDate
      ? t("dashboard.monthLabel.from", { start: startDate })
      : endDate
        ? t("dashboard.monthLabel.until", { end: endDate })
        : now.toLocaleString(i18n.language, { month: "long", year: "numeric" });

  const currency = user?.currency || "EUR";

  // Helper used by the budget comparison widget (introduced in main)
  // to render money values with the user's selected currency.
  const formatMoney = (value) => `${Number(value || 0).toFixed(2)} ${currency}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-base font-bold text-gray-900">{t("common.appName")}</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">
            {user?.email}
          </span>
          <LanguageSwitcher />
          <button
            onClick={() => setActiveTab("alerts")}
            className="relative text-gray-400 hover:text-indigo-600 transition-colors"
            aria-label={t("nav.alertsAria")}
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
            {t("nav.signOut")}
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
            {t("nav.dashboard")}
          </button>
          <button
            onClick={() => setActiveTab("add-expense")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "add-expense"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t("nav.addExpense")}
          </button>
          <button
            onClick={() => setActiveTab("manage-categories")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "manage-categories"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t("nav.manageCategories")}
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`relative py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "alerts"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t("nav.alerts")}
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
            {t("nav.settings")}
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
                <h3 className="text-sm font-semibold text-gray-700">{t("dashboard.quickStats")}</h3>
                <div className="flex flex-wrap justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">{t("dashboard.budgetComparison.toggle")}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showBudgetComparison}
                      aria-label={t("dashboard.budgetComparison.toggle")}
                      onClick={() => setShowBudgetComparison((prev) => !prev)}
                      className={`relative inline-flex h-10 w-20 shrink-0 items-center overflow-hidden border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        showBudgetComparison
                          ? "border-emerald-400 bg-emerald-400"
                          : "border-gray-300 bg-gray-200"
                      }`}
                      style={{ borderRadius: "9999px" }}
                    >
                      <span
                        className={`inline-block h-9 w-9 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          showBudgetComparison ? "translate-x-10" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
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
                            {date.toLocaleString(i18n.language, { month: "long" })}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{t("dashboard.totalMonthly")}</h3>
                  <div className="text-2xl font-bold text-indigo-600">
                    {loadingSummary ? "..." : `${summaryData?.total_monthly_spending?.toFixed(2) || "0.00"} ${currency}`}
                  </div>
                </section>
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{t("dashboard.averageDaily")}</h3>
                  <div className="text-2xl font-bold text-emerald-600">
                    {loadingSummary ? "..." : `${summaryData?.average_daily_costs?.toFixed(2) || "0.00"} ${currency}`}
                  </div>
                </section>
              </div>

              {showBudgetComparison && (
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">{t("dashboard.budgetComparison.heading")}</h3>
                      <p className="text-xs text-gray-500">
                        {t("dashboard.budgetComparison.subtitle", { month, year })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadAlertStatuses}
                      disabled={loadingAlertStatuses}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {loadingAlertStatuses ? t("dashboard.budgetComparison.refreshing") : t("dashboard.budgetComparison.refresh")}
                    </button>
                  </div>

                  {loadingAlertStatuses ? (
                    <p className="text-sm text-gray-400 text-center py-6">{t("dashboard.budgetComparison.loading")}</p>
                  ) : alertStatusError ? (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{alertStatusError}</p>
                  ) : alertStatuses.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      {t("dashboard.budgetComparison.noLimits")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {alertStatuses.map((status) => {
                        const spent = Number(status.spent_amount || 0);
                        const limit = Number(status.limit_amount || 0);
                        const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                        const accentColor = status.category_color || (status.is_over_limit ? "#DC2626" : "#059669");

                        return (
                          <article
                            key={status.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                                  style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
                                >
                                  {status.category_icon || "💰"}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                                    {status.category_name || t("dashboard.budgetComparison.overallBudget")}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {t("dashboard.budgetComparison.limit", { amount: formatMoney(status.limit_amount) })}
                                  </p>
                                </div>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                status.is_over_limit
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {status.is_over_limit ? t("dashboard.budgetComparison.exceeded") : t("dashboard.budgetComparison.ok")}
                              </span>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={status.is_over_limit ? "h-full bg-red-500" : "h-full bg-emerald-500"}
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-gray-400">{t("dashboard.budgetComparison.spent")}</p>
                                <p className="font-semibold text-gray-900">{formatMoney(status.spent_amount)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">{t("dashboard.budgetComparison.remaining")}</p>
                                <p className={status.remaining_amount < 0 ? "font-semibold text-red-600" : "font-semibold text-gray-900"}>
                                  {formatMoney(status.remaining_amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">{t("dashboard.budgetComparison.status")}</p>
                                <p className="font-semibold text-gray-900">{status.status}</p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </section>

            {/* Filters */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">{t("dashboard.filters")}</h3>
                <div className="flex items-center gap-3">
                  <button
                    id="download-csv-btn"
                    onClick={handleExportCSV}
                    disabled={expenses.length === 0}
                    title={expenses.length === 0 ? t("dashboard.downloadCsvDisabled") : t("dashboard.downloadCsvHint")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {t("dashboard.downloadCsv")}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {t("dashboard.clearFilters")}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("dashboard.category")}</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">{t("dashboard.allCategories")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("dashboard.startDate")}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("dashboard.endDate")}</label>
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
                <p className="text-sm text-gray-400 text-center">{t("dashboard.loadingCharts")}</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
                <p className="text-sm text-gray-400 text-center">
                  {t("dashboard.noExpenses")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    {t("dashboard.expensesByCategory")}
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
                        formatter={(value) => `${value.toFixed(2)} ${currency}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </section>

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    {t("dashboard.dailyExpenses", { label: monthLabel })}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="day"
                        label={{ value: t("dashboard.dayOfMonth"), position: "insideBottom", offset: -5 }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{
                          value: t("dashboard.amountAxis", { currency }),
                          angle: -90,
                          position: "insideLeft"
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        labelFormatter={(day, payload) => payload?.[0]?.payload?.date || t("dashboard.dayFallback", { day })}
                        formatter={(value) => [
                          `${value.toFixed(2)} ${currency}`,
                          t("dashboard.amount")
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
              <h2 className="text-base font-semibold text-gray-900 mb-5">{t("expenses.add")}</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t("expenses.amount")} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder={t("expenses.amountPlaceholder")}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t("expenses.date")} <span className="text-red-400">*</span>
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("expenses.category")}</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">{t("common.none")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("expenses.payment")}</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{t(`expenses.paymentMethods.${m}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("expenses.description")}</label>
                  <input
                    type="text"
                    placeholder={t("expenses.descriptionPlaceholder")}
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
                  {submitting ? t("expenses.submitting") : t("expenses.submit")}
                </button>
              </form>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900 capitalize">{monthLabel}</h2>
                <span className="text-sm font-semibold text-indigo-600">
                  {monthTotal.toFixed(2)} {currency}
                </span>
              </div>

              {loadingExpenses ? (
                <p className="text-sm text-gray-400 text-center py-6">{t("common.loadingShort")}</p>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t("expenses.emptyMonth")}</p>
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
                            {expense.description || expense.categories?.name || t("expenses.defaultName")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {expense.expense_date} · {expense.payment_method ? t(`expenses.paymentMethods.${expense.payment_method}`, { defaultValue: expense.payment_method }) : ""}
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
                          aria-label={t("expenses.editAria")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                          aria-label={t("expenses.deleteAria")}
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
                <h2 className="text-base font-semibold text-gray-900">{t("alerts.title")}</h2>
                <span className="text-sm text-gray-500">{t("alerts.pending", { count: alerts.length })}</span>
              </div>

              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm text-gray-400">{t("alerts.empty")}</p>
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
                            {t("alerts.budgetExceeded")}
                            {alert.budgets && (
                              <span className="font-normal text-gray-500">
                                {t("alerts.limit", {
                                  amount: parseFloat(alert.budgets.amount).toFixed(2),
                                  currency,
                                  month: alert.budgets.month,
                                  year: alert.budgets.year,
                                })}
                              </span>
                            )}
                          </p>
                          {alert.expenses && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t("alerts.triggeredBy", {
                                name: alert.expenses.description || t("alerts.expenseFallback"),
                                amount: parseFloat(alert.expenses.amount).toFixed(2),
                                currency,
                              })}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(alert.created_at).toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="shrink-0 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {t("alerts.dismiss")}
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
              <h2 className="text-base font-semibold text-gray-900 mb-1">{t("settings.title")}</h2>
              <p className="text-sm text-gray-500 mb-6">{t("settings.subtitle")}</p>

              <form onSubmit={handleSettingsSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.email")}</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.displayName")}</label>
                  <input
                    type="text"
                    placeholder={t("settings.displayNamePlaceholder")}
                    value={settingsFullName}
                    onChange={(e) => { setSettingsFullName(e.target.value); setSettingsSuccess(false); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.currency")}</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.income")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("settings.incomePlaceholder")}
                    value={settingsIncome}
                    onChange={(e) => { setSettingsIncome(e.target.value); setSettingsSuccess(false); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Language preference lives next to the rest of the
                    profile fields so a logged-in user can sync it to
                    their account without leaving Settings. */}
                <LanguageSwitcher variant="full" />

                {settingsError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{settingsError}</p>
                )}
                {settingsSuccess && (
                  <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">{t("settings.success")}</p>
                )}

                <button
                  type="submit"
                  disabled={settingsSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {settingsSubmitting ? t("settings.saving") : t("settings.save")}
                </button>
              </form>
            </section>
          </div>
        )}

        {activeTab === "manage-categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">{t("categories.createTitle")}</h2>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t("categories.name")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("categories.namePlaceholder")}
                  />
                </div>

                <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("categories.icon")}</label>
                    <select
                      value={categoryIcon}
                      onChange={(e) => setCategoryIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {CATEGORY_ICONS.map((iconOption) => (
                        <option key={iconOption.value} value={iconOption.value}>
                          {iconOption.value} {t(iconOption.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("categories.color")}</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("categories.description")}</label>
                  <textarea
                    rows="4"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder={t("categories.descriptionPlaceholder")}
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
                  {categorySubmitting ? t("common.saving") : t("categories.submit")}
                </button>
              </form>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">{t("categories.available")}</h2>
                <span className="text-sm text-gray-500">{t("categories.summary", { mine: myCategories.length, shared: sharedCategories.length })}</span>
              </div>

              {categories.length === 0 && hiddenCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{t("categories.emptyAll")}</p>
              ) : (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">{t("categories.myCategories")}</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{myCategories.length}</span>
                    </div>

                    {myCategories.length === 0 ? (
                      <p className="text-sm text-gray-400">{t("categories.myEmpty")}</p>
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
                                  <p className="text-xs text-gray-500">{category.color || t("categories.noColor")}</p>
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
                                {t("common.edit")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCategoryDelete(category.id)}
                                className="flex-1 bg-red-50 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                {t("common.delete")}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">{t("categories.sharedCategories")}</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{sharedCategories.length}</span>
                    </div>

                    {sharedCategories.length === 0 ? (
                      <p className="text-sm text-gray-400">{t("categories.sharedEmpty")}</p>
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
                                      {t("categories.sharedBadge")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">{category.color || t("categories.noColor")}</p>
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
                              {t("categories.hide")}
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">{t("categories.hiddenCategories")}</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{hiddenCategories.length}</span>
                    </div>

                    {hiddenCategories.length === 0 ? (
                      <p className="text-sm text-gray-400">{t("categories.hiddenEmpty")}</p>
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
                                      {t("categories.hiddenBadge")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">{category.color || t("categories.noColor")}</p>
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
                              {t("categories.restore")}
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
              <h2 className="text-base font-semibold text-gray-900">{t("expenses.edit.title")}</h2>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label={t("expenses.edit.closeAria")}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t("expenses.amount")} <span className="text-red-400">*</span>
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
                    {t("expenses.date")} <span className="text-red-400">*</span>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("expenses.category")}</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">{t("common.none")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("expenses.payment")}</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{t(`expenses.paymentMethods.${m}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("expenses.description")}</label>
                <input
                  type="text"
                  placeholder={t("expenses.descriptionPlaceholder")}
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
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {editSubmitting ? t("expenses.edit.saving") : t("expenses.edit.save")}
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
              <h2 className="text-base font-semibold text-gray-900">{t("categories.edit.title")}</h2>
              <button
                onClick={closeCategoryEdit}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label={t("categories.edit.closeAria")}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCategoryUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("categories.name")} <span className="text-red-400">*</span>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("categories.icon")}</label>
                  <select
                    value={editCategoryIcon}
                    onChange={(e) => setEditCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {CATEGORY_ICONS.map((iconOption) => (
                      <option key={iconOption.value} value={iconOption.value}>
                        {iconOption.value} {t(iconOption.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("categories.color")}</label>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("categories.description")}</label>
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
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={editCategorySubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {editCategorySubmitting ? t("common.saving") : t("categories.edit.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
