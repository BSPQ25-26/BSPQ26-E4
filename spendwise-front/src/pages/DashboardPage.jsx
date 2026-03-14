import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategories, getExpenses, createExpense, updateExpense, deleteExpense } from "../services/expenseService";

const PAYMENT_METHODS = ["cash", "card", "transfer"];

const today = () => new Date().toISOString().split("T")[0];

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

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

  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const data = await getExpenses(token, { month, year });
      setExpenses(data);
    } catch {
      // silently fail — list stays empty
    } finally {
      setLoadingExpenses(false);
    }
  }, [token, month, year]);

  useEffect(() => {
    getCategories(token).then(setCategories).catch(() => {});
    fetchExpenses();
  }, [token, fetchExpenses]);

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
      await fetchExpenses();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteExpense(token, id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
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
      closeEdit();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  const monthTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Add Expense Form */}
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
