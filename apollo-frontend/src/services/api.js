const BASE = import.meta.env.VITE_API_BASE_URL || "";

/* ── Simple in-memory cache (stale-while-revalidate) ── */
const _cache = new Map(); // key → {data, ts}
const CACHE_TTL = 60_000; // 60 seconds

function cached(key, fetchFn) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data);
  return fetchFn().then(data => { _cache.set(key, {data, ts: Date.now()}); return data; });
}
export function invalidateCache(prefix) {
  _cache.forEach((_, k) => { if (!prefix || k.startsWith(prefix)) _cache.delete(k); });
}

async function request(path, options = {}) {
  const token = localStorage.getItem("accessToken");
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, {...options, headers});
  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const e = await res.json(); message = e.message || e.error || message; } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  const type = res.headers.get("content-type") || "";
  return type.includes("application/pdf") ? res.blob() : res.json();
}

export const api = {
  login: body => request("/api/auth/login", {method:"POST", body:JSON.stringify(body)}),
  me: () => request("/api/auth/me"),
  refresh: body => request("/api/auth/refresh", {method:"POST", body:JSON.stringify(body)}),
  customers: (page=0,size=20) => cached(`customers:${page}:${size}`, ()=>request(`/api/admin/customers/getAllCustomers?page=${page}&size=${size}`)),
  searchCustomers: (query="",page=0,size=20) => cached(`search:${query}:${page}:${size}`, ()=>request(`/api/admin/customers/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`)),
  customer: id => cached(`customer:${id}`, ()=>request(`/api/admin/customers/getCustomerUsingId/${id}`)),
  createCustomer: body => request("/api/admin/customers/create",{method:"POST",body:JSON.stringify(body)}),
  updateCustomer: (id,body) => request(`/api/admin/customers/updateCustomerUsingId/${id}`,{method:"PUT",body:JSON.stringify(body)}),
  deleteCustomer: id => request(`/api/admin/customers/deleteCustomerUsingId/${id}`,{method:"DELETE"}),
  updateServiceHistory: (id,body) => request(`/api/admin/customers/amc-contracts/${id}/service-history`,{method:"PUT",body:JSON.stringify(body)}),
  contractPdf: id => request(`/api/admin/documents/customers/${id}?documentType=AMC_CONTRACT`),
  billPreview: (id, documentType) => request(`/api/admin/documents/customers/${id}/bill-preview?documentType=${documentType}`),
  generateBillPdf: (documentType, body) => request(`/api/admin/documents/bills/generate?documentType=${documentType}`,{method:"POST",body:JSON.stringify(body)}),
  sendBillEmail: (documentType, to, body) => request(`/api/admin/documents/bills/send-email?documentType=${documentType}&to=${encodeURIComponent(to)}`,{method:"POST",body:JSON.stringify(body)}),
  sendBillWhatsapp: (documentType, phone, body) => request(`/api/admin/documents/bills/send-whatsapp?documentType=${documentType}&phone=${encodeURIComponent(phone)}`,{method:"POST",body:JSON.stringify(body)}),
  email: body => request("/api/admin/notifications/email",{method:"POST",body:JSON.stringify(body)}),
  contractEmail: body => request("/api/admin/notifications/email/contract",{method:"POST",body:JSON.stringify(body)}),
  whatsapp: body => request("/api/admin/notifications/whatsapp",{method:"POST",body:JSON.stringify(body)}),
  contractWhatsapp: body => request("/api/admin/notifications/whatsapp/contract",{method:"POST",body:JSON.stringify(body)}),
  refreshSecurity: () => request("/api/admin/security/config/refresh",{method:"POST"})
};