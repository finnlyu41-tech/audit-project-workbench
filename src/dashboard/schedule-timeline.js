import { calendarDate } from './workspace-validation.js';
const DAY=86400000;
export const parseDate=value=>calendarDate(value)?new Date(`${value}T00:00:00Z`):null;
function dateAt(year,month,day=1) { const date=new Date(0); date.setUTCFullYear(year,month,day); date.setUTCHours(0,0,0,0); return date; }
const addDays=(date,days)=>new Date(date.getTime()+days*DAY);
const dayNumber=date=>date.getTime()/DAY;
export const dayOffset=(date,start)=>Math.round(dayNumber(date)-dayNumber(start));
const startOfMonth=date=>dateAt(date.getUTCFullYear(),date.getUTCMonth());
const addMonths=(date,months)=>dateAt(date.getUTCFullYear(),date.getUTCMonth()+months);
const endOfMonth=date=>addDays(addMonths(date,1),-1);
const startOfWeek=date=>addDays(date,-(date.getUTCDay()+6)%7);
const endOfWeek=date=>addDays(startOfWeek(date),6);
const bound=date=>new Date(Math.max(dateAt(1,0).getTime(),Math.min(dateAt(9999,11,31).getTime(),date.getTime())));
function segments(start,end,unit,pixelsPerDay,step=1) {
 const out=[], exclusive=addDays(end,1); let cursor=new Date(start);
 while(cursor<exclusive) {
  const boundary=unit==='year'?dateAt(cursor.getUTCFullYear()+step,0):dateAt(cursor.getUTCFullYear(),cursor.getUTCMonth()+step);
  const next=boundary<exclusive?boundary:exclusive;
  out.push({key:`${unit}-${cursor.toISOString()}`,date:new Date(cursor),width:dayOffset(next,cursor)*pixelsPerDay});
  cursor=next;
 } return out;
}
export function makeTimeline(rows,requestedPrecision='week',{minimumWidth=0,now=new Date()}={}) {
 const validNow=Number.isFinite(now.getTime())?now:new Date();
 const today=dateAt(validNow.getFullYear(),validNow.getMonth(),validNow.getDate());
 let earliest=today.getTime(),latest=earliest,supplied=false;
 for(const row of rows) for(const value of [row.startDate,row.dueDate,...(row.taxDeadlines||[]).map(d=>d.dueDate)]) {
  const date=parseDate(value); if(date) { supplied=true; earliest=Math.min(earliest,date.getTime()); latest=Math.max(latest,date.getTime()); }
 }
 if(!supplied) { earliest=addDays(today,-28).getTime(); latest=addDays(today,84).getTime(); }
 let precision=['day','week','month'].includes(requestedPrecision)?requestedPrecision:'week';
 const span=(latest-earliest)/DAY;
 if(precision==='day'&&span>780) precision='week';
 if(precision==='week'&&span>5400) precision='month';
 let rangeStart,rangeEnd,pixelsPerDay;
 if(precision==='day') {
  rangeStart=bound(startOfWeek(addDays(new Date(earliest),-3))); rangeEnd=bound(endOfWeek(addDays(new Date(latest),3)));
  rangeEnd=bound(new Date(Math.max(rangeEnd.getTime(),endOfWeek(addDays(rangeStart,41)).getTime()))); pixelsPerDay=36;
 } else if(precision==='week') {
  rangeStart=bound(startOfWeek(addDays(new Date(earliest),-7))); rangeEnd=bound(endOfWeek(addDays(new Date(latest),7)));
  rangeEnd=bound(new Date(Math.max(rangeEnd.getTime(),endOfWeek(addDays(rangeStart,83)).getTime())));
  const weeks=Math.ceil((dayOffset(rangeEnd,rangeStart)+1)/7); pixelsPerDay=(weeks>78?28:weeks>56?34:42)/7;
 } else {
  rangeStart=bound(startOfMonth(addMonths(new Date(earliest),-1))); rangeEnd=bound(endOfMonth(addMonths(new Date(latest),1)));
  rangeEnd=bound(new Date(Math.max(rangeEnd.getTime(),endOfMonth(addMonths(rangeStart,11)).getTime())));
  const months=(rangeEnd.getUTCFullYear()-rangeStart.getUTCFullYear())*12+rangeEnd.getUTCMonth()-rangeStart.getUTCMonth()+1;
  pixelsPerDay=(months>72?70:months>48?82:98)/30.4375;
 }
 const dayCount=dayOffset(rangeEnd,rangeStart)+1;
 pixelsPerDay=Math.max(pixelsPerDay,(Number.isFinite(minimumWidth)?Math.max(0,minimumWidth):0)/dayCount);
 const monthCount=(rangeEnd.getUTCFullYear()-rangeStart.getUTCFullYear())*12+rangeEnd.getUTCMonth()-rangeStart.getUTCMonth()+1;
 const coarse=monthCount>780,step=coarse?Math.ceil(monthCount/600):1;
 if(coarse) pixelsPerDay=Math.max(minimumWidth||600,600*70)/dayCount;
 const ticks=precision==='day'?Array.from({length:dayCount},(_,i)=>({date:addDays(rangeStart,i),width:pixelsPerDay}))
  :precision==='week'?Array.from({length:Math.ceil(dayCount/7)},(_,i)=>({date:addDays(rangeStart,i*7),width:Math.min(7,dayCount-i*7)*pixelsPerDay}))
    :segments(rangeStart,rangeEnd,'month',pixelsPerDay,step);
 const majorGroups=segments(rangeStart,rangeEnd,precision==='month'?'year':'month',pixelsPerDay,
  precision==='month'?Math.max(1,Math.ceil((rangeEnd.getUTCFullYear()-rangeStart.getUTCFullYear()+1)/600)):1);
 return {today,precision,requestedPrecision,coarse,rangeStart,rangeEnd,pixelsPerDay,ticks,majorGroups,width:dayCount*pixelsPerDay,
  gridWidth:(precision==='day'?1:precision==='month'?30.4375*step:7)*pixelsPerDay};
}
