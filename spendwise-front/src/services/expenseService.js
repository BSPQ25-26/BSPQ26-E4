/**
 * @file Expense service: fetch wrappers over the expenses, categories
 * and dashboard endpoints of the SpendWise backend.
 *
 * Like the auth service, every function takes the bearer token
 * explicitly, returns the parsed JSON body on success, and throws an
 * `Error` carrying the backend-provided message on failure.
 *
 * @module services/expenseService
 */

/**
 * Base URL of the backend API. Hard-coded for local development; see
 * the analogous note in `authService.js`.
 *
 * @type {string}
 */
const API_BASE = "http://localhost:8080/api/v1";

/**
 * @typedef {Object} Category
 * @property {number} id - Category primary key.
 * @property {string} name - Category display name.
 * @property {string} [color] - Optional hex/RGB colour used by the charts.
 * @property {string} [icon] - Optional emoji or icon identifier.
 */

/**
 * @typedef {Object} Expense
 * @property {number} id - Expense primary key.
 * @property {number} amount - Positive amount in the user's currency.
 * @property {string} expense_date - ISO date string (`YYYY-MM-DD`).
 * @property {string} [description] - Free-text label.
 * @property {number|null} [category_id] - Foreign key to {@link Category}.
 * @property {string} [payment_method] - `"cash"`, `"card"`, `"transfer"`...
 * @property {Category} [categories] - Joined category row when expanded by the backend.
 */

/**
 * @typedef {Object} CategoryBreakdownItem
 * @property {string} name - Category display name (or `"Uncategorized"`).
 * @property {number} value - Total amount spent in that category.
 * @property {string} [icon] - Optional icon copied from the category.
 * @property {string} [color] - Optional colour copied from the category.
 */

/**
 * @typedef {Object} DailyBreakdownItem
 * @property {string} date - ISO date.
 * @property {number} day - Day of the month (1..31).
 * @property {number} amount - Total amount spent on that day.
 */

/**
 * @typedef {Object} ExpenseAnalytics
 * @property {number} month_total - Sum of all expenses in the period.
 * @property {CategoryBreakdownItem[]} category_breakdown - Totals per category, descending by amount.
 * @property {DailyBreakdownItem[]} daily_breakdown - Totals per day, ascending by date.
 */

/**
 * @typedef {Object} DashboardSummary
 * @property {number} total_monthly_spending - Total spending for the month.
 * @property {number} average_daily_costs - Average daily spend within the month.
 * @property {number} month - Month the summary refers to (1..12).
 * @property {number} year - Year the summary refers to.
 */

/**
 * @typedef {Object} ExpenseFilters
 * @property {number} [month] - Month filter (1..12); used together with `year`.
 * @property {number} [year] - Year filter; used together with `month`.
 * @property {number|string} [category_id] - Category filter.
 * @property {string} [start_date] - ISO start date (inclusive).
 * @property {string} [end_date] - ISO end date (inclusive).
 */

/**
 * Build the standard headers for an authenticated JSON request.
 *
 * @private
 * @param {string} token - Bearer token to attach.
 * @returns {Record<string, string>}
 */
function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/**
 * Fetch every available expense category. Categories are reference
 * data shared across users, so no filter is applied.
 *
 * @param {string} token - Bearer token.
 * @returns {Promise<Category[]>}
 * @throws {Error} If the backend errors out.
 */
export async function getCategories(token) {
  const res = await fetch(`${API_BASE}/categories/`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch categories");
  return data;
}

/**
 * Fetch the user's expenses with optional filters. Date filters and
 * the `month` + `year` pair can be combined; the backend layers them
 * into the SQL query.
 *
 * @param {string} token - Bearer token.
 * @param {ExpenseFilters} [filters] - Optional filtering options.
 * @returns {Promise<Expense[]>}
 * @throws {Error} If the backend errors out.
 */
export async function getExpenses(token, { month, year, category_id, start_date, end_date } = {}) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (year) params.set("year", year);
  if (category_id) params.set("category_id", category_id);
  if (start_date) params.set("start_date", start_date);
  if (end_date) params.set("end_date", end_date);
  const res = await fetch(`${API_BASE}/expenses/?${params}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch expenses");
  return data;
}

/**
 * Fetch the analytics payload (category and daily breakdowns) for the
 * given month/year filters.
 *
 * @param {string} token - Bearer token.
 * @param {Object} [filters] - Optional filtering options.
 * @param {number} [filters.month] - Month filter (1..12); used together with `year`.
 * @param {number} [filters.year] - Year filter; used together with `month`.
 * @returns {Promise<ExpenseAnalytics>}
 * @throws {Error} If the backend errors out.
 */
export async function getDashboardAnalytics(token, { month, year } = {}) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (year) params.set("year", year);
  const res = await fetch(`${API_BASE}/expenses/analytics?${params}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch dashboard analytics");
  return data;
}

/**
 * Create a new expense for the authenticated user.
 *
 * @param {string} token - Bearer token.
 * @param {Object} expenseData - Payload accepted by `POST /expenses/`.
 * @param {number} expenseData.amount - Positive amount.
 * @param {string} [expenseData.description] - Free-text label.
 * @param {number|null} [expenseData.category_id] - Optional category.
 * @param {string} expenseData.expense_date - ISO date string.
 * @param {string} [expenseData.payment_method] - Defaults to `"cash"` server-side.
 * @returns {Promise<Expense>} The newly created expense row.
 * @throws {Error} If the backend rejects the payload.
 */
export async function createExpense(token, expenseData) {
  const res = await fetch(`${API_BASE}/expenses/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(expenseData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create expense");
  return data;
}

/**
 * Patch an existing expense.
 *
 * @param {string} token - Bearer token.
 * @param {number} id - Primary key of the expense to update.
 * @param {Object} expenseData - Subset of the fields described in {@link createExpense}.
 * @returns {Promise<Expense>} The updated expense row.
 * @throws {Error} If the expense does not exist or does not belong to the caller.
 */
export async function updateExpense(token, id, expenseData) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(expenseData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update expense");
  return data;
}

/**
 * Delete an expense owned by the authenticated user. Idempotent from
 * the client's point of view: a missing row still resolves cleanly.
 *
 * @param {string} token - Bearer token.
 * @param {number} id - Primary key of the expense to delete.
 * @returns {Promise<void>}
 * @throws {Error} On non-204 / non-2xx responses.
 */
export async function deleteExpense(token, id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete expense");
  }
}

/**
 * Fetch the dashboard summary (total monthly spending and average
 * daily costs) for the given period.
 *
 * @param {string} token - Bearer token.
 * @param {Object} [filters] - Optional filtering options. Defaults to the current month server-side.
 * @param {number} [filters.month] - Month filter (1..12).
 * @param {number} [filters.year] - Year filter.
 * @returns {Promise<DashboardSummary>}
 * @throws {Error} If the backend errors out.
 */
export async function getDashboardSummary(token, { month, year } = {}) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (year) params.set("year", year);

  const res = await fetch(`${API_BASE}/dashboard/summary?${params}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch dashboard summary");
  return data;
}
