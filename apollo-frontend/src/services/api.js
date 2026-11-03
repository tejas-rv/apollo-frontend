const BASE = import.meta.env.VITE_API_BASE_URL || "";

/* ── Simple in-memory cache (stale-while-revalidate) ── */
const _cache = new Map(); // key → {data, ts}
const CACHE_TTL = 60_000; // 60 seconds
let refreshInFlight = null;

function cached(key, fetchFn) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data);
  return fetchFn().then(data => { _cache.set(key, {data, ts: Date.now()}); return data; });
}
export function invalidateCache(prefix) {
  _cache.forEach((_, k) => { if (!prefix || k.startsWith(prefix)) _cache.delete(k); });
}

const NO_AUTO_LOGOUT_PATHS = ["/api/auth/login", "/api/auth/refresh", "/api/auth/change-password"];
const SESSION_KEYS = ["accessToken","refreshToken","userRole","username"];

export function clearSession() {
  SESSION_KEYS.forEach(key => localStorage.removeItem(key));
  invalidateCache();
}

async function refreshAccessToken() {
  const refreshToken=localStorage.getItem("refreshToken");
  if(!refreshToken)return null;
  if(!refreshInFlight){
    refreshInFlight=fetch(`${BASE}/api/auth/refresh`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({refreshToken})
    }).then(async response=>{
      if(!response.ok)throw new Error("Session expired");
      const tokens=await response.json();
      if(!tokens.accessToken||!tokens.refreshToken)throw new Error("Invalid refresh response");
      localStorage.setItem("accessToken",tokens.accessToken);
      localStorage.setItem("refreshToken",tokens.refreshToken);
      return tokens.accessToken;
    }).catch(()=>null).finally(()=>{refreshInFlight=null});
  }
  return refreshInFlight;
}

async function request(path, options = {}) {
  const token = localStorage.getItem("accessToken");
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const requestOptions={...options,headers};
  let res=await fetch(`${BASE}${path}`,requestOptions);
  if(res.status===401&&!NO_AUTO_LOGOUT_PATHS.some(p=>path.startsWith(p))){
    const refreshed=await refreshAccessToken();
    if(refreshed){
      const retryHeaders=new Headers(headers);
      retryHeaders.set("Authorization",`Bearer ${refreshed}`);
      res=await fetch(`${BASE}${path}`,{...requestOptions,headers:retryHeaders});
    }
  }
  if(res.status===401&&!NO_AUTO_LOGOUT_PATHS.some(p=>path.startsWith(p))){
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      if (type.includes("application/json")) { const e = await res.json(); message = e.message || e.error || message; }
      else { const text = await res.text(); if (text) message = text; }
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  if (type.includes("application/pdf") || type.includes("spreadsheetml")) return res.blob();
  if (type.includes("application/json")) return res.json();
  return res.text();
}

export const api = {
  login: body => request("/api/auth/login", {method:"POST", body:JSON.stringify(body)}),
  me: () => request("/api/auth/me"),
  refresh: body => request("/api/auth/refresh", {method:"POST", body:JSON.stringify(body)}),
  customers: (page=0,size=20) => cached(`customers:${page}:${size}`, ()=>request(`/api/admin/customers/getAllCustomers?page=${page}&size=${size}`)),
  searchCustomers: (query="",page=0,size=20) => cached(`search:${query}:${page}:${size}`, ()=>request(`/api/admin/customers/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`)),
  customer: id => cached(`customer:${id}`, ()=>request(`/api/admin/customers/getCustomerUsingId/${id}`)),
  createCustomer: async body => {
    const result=await request("/api/admin/customers/create",{method:"POST",body:JSON.stringify(body)});
    invalidateCache();
    return result;
  },
  updateCustomer: async (id,body) => {
    const result=await request(`/api/admin/customers/updateCustomerUsingId/${id}`,{method:"PUT",body:JSON.stringify(body)});
    invalidateCache();
    return result;
  },
  deleteCustomer: async id => {
    const result=await request(`/api/admin/customers/deleteCustomerUsingId/${id}`,{method:"DELETE"});
    invalidateCache();
    return result;
  },
  updateServiceHistory: async (id,body) => {
    const result=await request(`/api/admin/customers/amc-contracts/${id}/service-history`,{method:"PUT",body:JSON.stringify(body)});
    invalidateCache();
    return result;
  },
  contractPdf: id => request(`/api/admin/documents/customers/${id}?documentType=AMC_CONTRACT`),
  amcContractPdf: (customerId, contractId) => request(`/api/admin/documents/customers/${customerId}/amc-contracts/${contractId}`),
  billPreview: (id, documentType) => request(`/api/admin/documents/customers/${id}/bill-preview?documentType=${documentType}`),
  generateBillPdf: (documentType, body) => request(`/api/admin/documents/bills/generate?documentType=${documentType}`,{method:"POST",body:JSON.stringify(body)}),
  sendBillEmail: (documentType, to, body) => request(`/api/admin/documents/bills/send-email?documentType=${documentType}&to=${encodeURIComponent(to)}`,{method:"POST",body:JSON.stringify(body)}),
  sendBillWhatsapp: (documentType, phone, body) => request(`/api/admin/documents/bills/send-whatsapp?documentType=${documentType}&phone=${encodeURIComponent(phone)}`,{method:"POST",body:JSON.stringify(body)}),
  amcPlans: () => request("/api/admin/amc-plans"),
  updateAmcPlan: (contractType, amount) => request(`/api/admin/amc-plans/${contractType}`,{method:"PUT",body:JSON.stringify({amount})}),
  customerAmcBilling: customerId => request(`/api/admin/bills/customers/${customerId}/amc-contracts`),
  createAmcContract: async (customerId, body) => {
    const result=await request(`/api/admin/bills/customers/${customerId}/amc-contracts`,{method:"POST",body:JSON.stringify(body)});
    invalidateCache();
    return result;
  },
  billDraft: body => request("/api/admin/bills/draft",{method:"POST",body:JSON.stringify(body)}),
  createBill: body => request("/api/admin/bills",{method:"POST",body:JSON.stringify(body)}),
  bills: (params={}) => {
    const q=new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")q.set(k,v);});
    return request(`/api/admin/bills?${q.toString()}`);
  },
  serviceVisits: (params={}) => {
    const q=new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!==""&&v!==false)q.set(k,v);});
    return request(`/api/admin/services?${q.toString()}`);
  },
  serviceVisitSummary: () => request("/api/admin/services/summary"),
  serviceVisitHistory: id => request(`/api/admin/services/${id}/reschedules`),
  rescheduleVisit: async (id, body) => {
    const r=await request(`/api/admin/services/${id}/reschedule`,{method:"POST",body:JSON.stringify(body)});
    invalidateCache();
    return r;
  },
  savedBillPdf: id => request(`/api/admin/bills/${id}/pdf`),
  sendSavedBillEmail: (id, to) => request(`/api/admin/bills/${id}/send-email?to=${encodeURIComponent(to)}`,{method:"POST"}),
  sendSavedBillWhatsapp: (id, phone) => request(`/api/admin/bills/${id}/send-whatsapp?phone=${encodeURIComponent(phone)}`,{method:"POST"}),
  markBillPaid: (id, paidDate, paymentReference) => request(`/api/admin/bills/${id}/paid`,{method:"PUT",body:JSON.stringify({paidDate,paymentReference})}),
  markBillUnpaid: id => request(`/api/admin/bills/${id}/unpaid`,{method:"PUT"}),
  cancelBill: id => request(`/api/admin/bills/${id}/cancel`,{method:"PUT"}),
  nextInvoiceNumber: () => request("/api/admin/bills/next-invoice-number"),
  billSummary: (from, to) => request(`/api/admin/bills/summary?from=${from}&to=${to}`),
  email: body => request("/api/admin/notifications/email",{method:"POST",body:JSON.stringify(body)}),
  contractEmail: body => request("/api/admin/notifications/email/contract",{method:"POST",body:JSON.stringify(body)}),
  whatsapp: body => request("/api/admin/notifications/whatsapp",{method:"POST",body:JSON.stringify(body)}),
  contractWhatsapp: body => request("/api/admin/notifications/whatsapp/contract",{method:"POST",body:JSON.stringify(body)}),
  changePassword: body => request("/api/auth/change-password",{method:"PUT",body:JSON.stringify(body)}),
  submitEnquiry: body => request("/api/public/enquiries",{method:"POST",body:JSON.stringify(body)}),
  adminEnquiries: (params={}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!=null));
    return request(`/api/admin/enquiries?${q.toString()}`);
  },
  adminEnquiry: id => request(`/api/admin/enquiries/${id}`),
  updateEnquiryStatus: (id,status) => request(`/api/admin/enquiries/${id}/status`,{method:"PUT",body:JSON.stringify({status})}),
  convertEnquiryToWorkOrder: id => request(`/api/admin/enquiries/${id}/convert-to-work-order`,{method:"POST"}),
  convertEnquiryToCustomer: (id,body) => request(`/api/admin/enquiries/${id}/convert-to-customer`,{method:"POST",body:JSON.stringify(body)}),
  quotations: (params={}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!=null));
    return request(`/api/admin/quotations?${q.toString()}`);
  },
  pendingQuotations: (params={}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!=null));
    return request(`/api/admin/enquiries/quotation-pending?${q.toString()}`);
  },
  createQuotation: body => request("/api/admin/quotations",{method:"POST",body:JSON.stringify(body)}),
  updateQuotationStatus: (id,status) => request(`/api/admin/quotations/${id}/status`,{method:"PUT",body:JSON.stringify({status})}),
  workOrders: (params={}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!=null));
    return request(`/api/admin/work-orders?${q.toString()}`);
  },
  // User management (ADMIN / OFFICE / ENGINEER)
  listUsers: type => request(`/api/admin/users${type?`?type=${encodeURIComponent(type)}`:""}`),
  user: id => request(`/api/admin/users/${id}`),
  createUser: body => request("/api/admin/users",{method:"POST",body:JSON.stringify(body)}),
  updateUser: (id, body) => request(`/api/admin/users/${id}`,{method:"PUT",body:JSON.stringify(body)}),
  updateUserStatus: (id, enabled) => request(`/api/admin/users/${id}/status`,{method:"PATCH",body:JSON.stringify({enabled})}),
  deleteUser: id => request(`/api/admin/users/${id}`,{method:"DELETE"}),
  resetPassword: body => request("/api/auth/reset-password",{method:"POST",body:JSON.stringify(body)}),
  // Engineer portal
  engineerDashboard: () => request("/api/engineer/dashboard"),
  engineerCustomers: (query, page=0, size=20) => query
    ? cached(`eng-search:${query}:${page}`, ()=>request(`/api/engineer/customers?query=${encodeURIComponent(query)}&page=${page}&size=${size}`))
    : cached(`eng-customers:${page}:${size}`, ()=>request(`/api/engineer/customers?page=${page}&size=${size}`)),
  engineerCustomer: id => cached(`eng-customer:${id}`, ()=>request(`/api/engineer/customers/${id}`)),
  engineerChecklistTemplate: () => cached("eng-checklist", ()=>request("/api/engineer/service-reports/checklist-template")),
  engineerMyReports: (page=0, size=20) => request(`/api/engineer/service-reports?page=${page}&size=${size}`),
  engineerReport: id => request(`/api/engineer/service-reports/${id}`),
  engineerSubmitReport: body => request("/api/engineer/service-reports", {method:"POST", body:JSON.stringify(body)}),
  engineerReportPdf: id => request(`/api/engineer/service-reports/${id}/pdf`),
  // Google Drive documents
  driveGenerateCustomerDocuments: customerId => request(`/api/google-drive/customer-documents/${customerId}`,{method:"POST"}),
  driveListFiles: (customerId, category) => request(`/api/google-drive/files?customerId=${customerId}&category=${category}`),
  driveFileMetadata: fileId => request(`/api/google-drive/files/${fileId}`),
  driveDownloadFile: fileId => request(`/api/google-drive/download/${fileId}`),
  driveDeleteFile: fileId => request(`/api/google-drive/files/${fileId}`,{method:"DELETE"}),
  driveUploadLiftImage: (customerId, liftId, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/google-drive/customer-documents/${customerId}/lifts/${liftId}/images`,{method:"POST",body:form});
  },
  driveListLiftImages: (customerId, liftId) => request(`/api/google-drive/customer-documents/${customerId}/lifts/${liftId}/images`),
  // Customer data import / export (admin only). fromGoogleDrive/toGoogleDrive=true uses
  // Apollo_Elevator_Customer_Data.xlsx in the configured Google Drive folder.
  importCustomerData: async ({fromGoogleDrive, file, mode = "MERGE"}) => {
    const form = new FormData();
    if (!fromGoogleDrive && file) form.append("file", file);
    const result = await request(`/api/admin/customers/data/import?fromGoogleDrive=${!!fromGoogleDrive}&mode=${encodeURIComponent(mode)}`,{method:"POST",body:form});
    invalidateCache();
    return result;
  },
  exportCustomerData: (toGoogleDrive, includeCompleted = true) =>
    request(`/api/admin/customers/data/export?toGoogleDrive=${!!toGoogleDrive}&includeCompleted=${!!includeCompleted}`),
};