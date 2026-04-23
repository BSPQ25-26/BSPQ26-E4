const API_BASE = "http://localhost:8080/api/v1";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function getCategories(token) {
  const res = await fetch(`${API_BASE}/categories/`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch categories");
  return data;
}

export async function getExpenses(token, { month, year } = {}) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (year) params.set("year", year);
  const res = await fetch(`${API_BASE}/expenses/?${params}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch expenses");
  return data;
}

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
