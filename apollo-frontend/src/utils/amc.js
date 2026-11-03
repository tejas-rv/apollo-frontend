/** Shared AMC contract helpers: plan tiers, billing frequencies and plan-based autofill. */

export const AMC_TIERS=["SILVER","GOLD","PLATINUM"];
export const AMC_FREQUENCIES=[["YEARLY","Yearly"],["HALF_YEARLY","Half-yearly"],["QUARTERLY","Quarterly"],["MONTHLY","Monthly"]];

export const isoToday=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const toIso=d=>d.toISOString().slice(0,10);

/** Adds months to yyyy-MM-dd, clamping to month end (same as Java LocalDate.plusMonths). */
export function addMonths(iso,months){
  const [y,m,d]=iso.split("-").map(Number);
  const target=new Date(Date.UTC(y,m-1+months,1));
  const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(d,lastDay));
  return toIso(target);
}

export function addDays(iso,days){
  const [y,m,d]=iso.split("-").map(Number);
  return toIso(new Date(Date.UTC(y,m-1,d+days)));
}

/** Lenient mapping of stored frequency text (e.g. "ANNUAL") to a billing frequency; null when unknown. */
export function normalizeFrequency(value){
  const v=String(value||"").trim().toUpperCase().replace(/[-\s]/g,"_");
  if(["YEARLY","ANNUAL","ANNUALLY","YEAR"].includes(v))return "YEARLY";
  if(["HALF_YEARLY","HALFYEARLY","SEMI_ANNUAL","SEMI_ANNUALLY"].includes(v))return "HALF_YEARLY";
  if(["QUARTERLY","QUARTER"].includes(v))return "QUARTERLY";
  if(["MONTHLY","MONTH"].includes(v))return "MONTHLY";
  return null;
}

/** Dates derived from the start date: one-year period, first payment at start, first service a month in. */
export function amcDatesFrom(startDate){
  if(!startDate)return {endDate:"",nextPaymentDate:"",nextServiceDate:""};
  return {
    endDate:addDays(addMonths(startDate,12),-1),
    nextPaymentDate:startDate,
    nextServiceDate:addMonths(startDate,1),
  };
}

export const planPrice=(plans,contractType)=>plans?.find(p=>p.contractType===contractType)?.amount;

/**
 * Autofills a contract when its plan (tier) is chosen: plan price, frequency, period dates and status.
 * Existing dates are kept; only blank ones are filled.
 */
export function autofillAmc(contract,contractType,plans,today=isoToday()){
  const price=planPrice(plans,contractType);
  const startDate=contract.startDate||today;
  const derived=amcDatesFrom(startDate);
  const keepStatus=contract.status&&!["PENDING","ACTIVE"].includes(contract.status);
  return {
    ...contract,
    contractType,
    amcAmount:price!=null?String(price):contract.amcAmount,
    paymentFrequency:normalizeFrequency(contract.paymentFrequency)||"YEARLY",
    startDate,
    endDate:contract.endDate||derived.endDate,
    nextPaymentDate:contract.nextPaymentDate||derived.nextPaymentDate,
    nextServiceDate:contract.nextServiceDate||derived.nextServiceDate,
    status:keepStatus?contract.status:(startDate>today?"PENDING":"ACTIVE"),
  };
}

/** When the start date changes, moves derived dates that were blank or still matched the old start date. */
export function withStartDate(contract,startDate){
  const before=amcDatesFrom(contract.startDate);
  const after=amcDatesFrom(startDate);
  const next={...contract,startDate};
  for(const k of ["endDate","nextPaymentDate","nextServiceDate"]){
    if(!contract[k]||contract[k]===before[k])next[k]=after[k];
  }
  return next;
}
