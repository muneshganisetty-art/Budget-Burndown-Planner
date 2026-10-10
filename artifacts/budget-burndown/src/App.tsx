import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CalendarDays,
  Check, ChevronDown, CircleAlert, CircleDollarSign, FileSpreadsheet,
  Gauge, LayoutDashboard, Pencil, Plus, Search, Trash2,
  Users, X, RefreshCw, ChartNoAxesCombined,
} from 'lucide-react';
import {
  getHealthCheckQueryKey, getListEmployeesQueryKey, getListBudgetsQueryKey,
  getGetDashboardQueryKey, useHealthCheck, useListEmployees, useCreateEmployee,
  useUpdateEmployee, useDeleteEmployee, useListBudgets, useCreateBudget,
  useUpdateBudget, useDeleteBudget, useGetDashboard,
} from '@workspace/api-client-react';
import type { BudgetEntry, Employee } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const currentYear = new Date().getFullYear();
const currency = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(value || 0);
const currencyPrecise = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value || 0);
const dateOnly = (date: string) => date.slice(0, 10);
const dateText = (date: string) => dateOnly(date) === '9999-12-31' ? 'Ongoing' : new Date(`${dateOnly(date)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 60000 } });
  const nav = [
    { href: '/', label: 'Annual overview', icon: LayoutDashboard },
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/budgets', label: 'Budget entries', icon: FileSpreadsheet },
  ];
  return <div className="app-shell">
    <aside className="sidebar" style={{ position: 'fixed', inset: '0 auto 0 0', width: 246, padding: '27px 16px 18px', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      <Link href="/" data-testid="link-brand" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 10px 30px', color: 'inherit', textDecoration: 'none' }}>
        <div style={{ width: 35, height: 35, background: '#d6a95d', color: '#203b40', display: 'grid', placeItems: 'center', borderRadius: 9 }}><ChartNoAxesCombined size={19} strokeWidth={2.3}/></div>
        <div><div className="display" style={{ fontWeight: 800, letterSpacing: '-.04em', fontSize: 15 }}>Budget Burndown</div><div style={{ color: '#aebbb2', fontSize: 10, marginTop: 2 }}>WORKFORCE PLANNER</div></div>
      </Link>
      <div className="eyebrow" style={{ padding: '0 11px 9px', color: '#94a79e' }}>Planning workspace</div>
      <nav style={{ display: 'grid', gap: 5 }}>
        {nav.map(item => {
          const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className="nav-item" data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 8, color: active ? '#f2efe2' : '#b6c2b8', background: active ? '#2e5152' : 'transparent', fontSize: 13, fontWeight: active ? 700 : 500, transition: 'background .18s ease, color .18s ease' }}>
            <Icon size={17} strokeWidth={1.8}/><span className="nav-label">{item.label}</span>{active && <span className="nav-indicator" style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: 99, background: '#d6a95d' }}/>}
          </Link>;
        })}
      </nav>
      <div style={{ marginTop: 'auto', borderTop: '1px solid #385356', padding: '17px 9px 5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#b8c5bb' }}>
          <span style={{ width: 7, height: 7, background: health.isError ? '#ce7165' : '#8cbb94', borderRadius: 9 }}/>
          {health.isLoading ? 'Connecting to workbook' : health.isError ? 'Workbook connection unavailable' : 'Workbook connected'}
        </div>
        <div className="mono" style={{ fontSize: 9, color: '#839790', marginTop: 8 }}>ROSTER + ALLOCATIONS</div>
      </div>
    </aside>
    <main className="main-area" style={{ marginLeft: 246, minHeight: '100dvh' }}>
      <header style={{ height: 60, borderBottom: '1px solid #e4dfd2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 42px', background: 'rgba(249,247,239,.78)' }}>
        <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: 6, background: '#b18a4e' }}/> FINANCE OPERATIONS <span style={{ color: '#c1bdaf' }}>/</span> WORKFORCE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#687771', fontSize: 11 }}><Activity size={14} color="#4e826e"/> Live workbook</div>
      </header>
      <div className="content-wrap">{children}</div>
    </main>
  </div>;
}

function PageTitle({ kicker, title, subtitle, action }: { kicker: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading fade-up" style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}>
    <div><div className="eyebrow" style={{ marginBottom: 8 }}>{kicker}</div><h1 className="display topbar-title" style={{ fontSize: 29, lineHeight: 1.15, letterSpacing: '-.045em', margin: 0, color: '#213b3e', fontWeight: 800 }}>{title}</h1><p style={{ margin: '8px 0 0', fontSize: 13, color: '#77817a' }}>{subtitle}</p></div>{action}
  </div>;
}

function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return <div className="panel" style={{ padding: 22, display: 'grid', gap: 15 }} aria-label="Loading data" data-testid="loading-skeleton">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: i ? 42 : 22, width: i === 1 ? '78%' : '100%' }}/>)}</div>;
}
function ErrorPanel({ onRetry, message = 'The workbook could not be reached.' }: { onRetry: () => void; message?: string }) {
  return <div className="panel" style={{ padding: 32, textAlign: 'center' }} role="alert"><CircleAlert size={24} color="#af5c4d" style={{ margin: '0 auto 10px' }}/><div className="display" style={{ fontWeight: 700, fontSize: 16 }}>Couldn’t load this view</div><p style={{ fontSize: 13, color: '#77817a', margin: '6px 0 18px' }}>{message}</p><button className="btn btn-quiet" onClick={onRetry} data-testid="button-retry"><RefreshCw size={14}/> Try again</button></div>;
}

function Metric({ label, value, note, icon: Icon, tone = 'green' }: { label: string; value: string; note: string; icon: typeof Gauge; tone?: 'green'|'gold'|'red'|'blue' }) {
  const colors = { green: ['#e3eee5','#386a53'], gold: ['#f3ead8','#94713a'], red: ['#f6e6df','#a14f43'], blue: ['#e2ecec','#3e7075'] };
  return <div className="panel" style={{ padding: '19px 20px 17px', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="eyebrow">{label}</span><span style={{ background: colors[tone][0], color: colors[tone][1], width: 29, height: 29, borderRadius: 8, display: 'grid', placeItems: 'center' }}><Icon size={15}/></span></div>
    <div className="display metric-value" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.045em', marginTop: 15, color: '#243e40' }}>{value}</div>
    <div style={{ fontSize: 11, color: '#7b867e', marginTop: 7 }}>{note}</div>
  </div>;
}

function ProjectionChart({ monthly }: { monthly: { month: number; label: string; projectedSpend: number; accruedSpend: number; budget: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 760, h = 250, left = 48, right = 15, top = 18, bottom = 34;
  const max = Math.max(1, ...monthly.map(m => Math.max(m.projectedSpend, m.budget, m.accruedSpend)));
  const x = (i: number) => left + i * (w - left - right) / Math.max(1, monthly.length - 1);
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  const projected = monthly.map((m, i) => `${i ? 'L':'M'}${x(i)},${y(m.projectedSpend)}`).join(' ');
  const accrued = monthly.map((m, i) => `${i ? 'L':'M'}${x(i)},${y(m.accruedSpend)}`).join(' ');
  const budgetPath = monthly.map((m, i) => `${i ? 'L':'M'}${x(i)},${y(m.budget)}`).join(' ');
  const area = `${projected} L${x(monthly.length-1)},${h-bottom} L${x(0)},${h-bottom} Z`;
  return <div style={{ width: '100%', position: 'relative' }}>
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', display:'block', overflow:'visible' }} role="img" aria-label="Monthly cumulative payroll projection compared with annual budget">
      <defs><linearGradient id="spend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#47866e" stopOpacity=".19"/><stop offset="100%" stopColor="#47866e" stopOpacity=".015"/></linearGradient></defs>
      {[0,.25,.5,.75,1].map((p,i)=><g key={i}><line x1={left} x2={w-right} y1={top+(h-top-bottom)*p} y2={top+(h-top-bottom)*p} className="chart-grid"/><text x={left-8} y={top+(h-top-bottom)*p+3} textAnchor="end" className="chart-label">{currency(max*(1-p)).replace('$','')}</text></g>)}
      <path d={area} fill="url(#spend-fill)"/>
      <path d={budgetPath} fill="none" stroke="#c29a53" strokeWidth="1.7" strokeDasharray="4 5"/>
      <path d={projected} fill="none" stroke="#37745f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      <path d={accrued} fill="none" stroke="#648da0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {monthly.map((m,i)=><g key={m.month} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}><circle cx={x(i)} cy={y(m.projectedSpend)} r={hover===i?5:2.8} fill="#37745f" stroke="#fbfaf5" strokeWidth="2"/><rect x={x(i)-10} y={top} width={20} height={h-top-bottom+6} fill="transparent"/><text x={x(i)} y={h-10} textAnchor="middle" className="chart-label" fill={hover===i?'#263f40':undefined}>{m.label.slice(0,3)}</text></g>)}
    </svg>
    {hover !== null && monthly[hover] && <div style={{ position:'absolute', left:`${Math.min(78,Math.max(10,(x(hover)/w)*100))}%`, top:8, background:'#203b40', color:'#f7f3e7', borderRadius:8, padding:'9px 11px', fontSize:10, lineHeight:1.65, boxShadow:'0 6px 20px #203b4030', pointerEvents:'none', zIndex:2 }}>
      <strong style={{ fontSize:11 }}>{monthly[hover].label}</strong><br/>Projected {currency(monthly[hover].projectedSpend)}<br/>Accrued {currency(monthly[hover].accruedSpend)}<br/>Budget {currency(monthly[hover].budget)}
    </div>}
  </div>;
}

function DashboardPage() {
  const [year, setYear] = useState(currentYear);
  const query = useGetDashboard({ year }, { query: { queryKey: getGetDashboardQueryKey({ year }) } });
  const budgetsQuery = useListBudgets({ query: { queryKey: getListBudgetsQueryKey() } });
  const dashboard = query.data;
  const years = Array.from(new Set([
    ...Array.from({ length: 7 }, (_, i) => currentYear - 2 + i),
    ...(budgetsQuery.data ?? []).map((budget) => budget.year),
  ])).sort((a, b) => a - b);
  const balance = dashboard?.projectedBalance ?? 0;
  const atRisk = balance < 0;
  return <>
    <PageTitle kicker="Annual plan / workforce costs" title="Budget overview" subtitle="A clear read on payroll against available project funding." action={<label className="year-select" style={{ display:'flex', alignItems:'center', gap:9, height:40, padding:'0 11px', border:'1px solid #ded9cb', borderRadius:8, background:'#fbfaf5', color:'#52615b' }}><CalendarDays size={15}/><span className="eyebrow" style={{ letterSpacing:'.05em' }}>Plan year</span><select value={year} onChange={e=>setYear(Number(e.target.value))} aria-label="Select plan year" data-testid="select-plan-year" style={{ border:0, outline:0, background:'transparent', fontWeight:700, color:'#263f40', cursor:'pointer' }}>{years.map(y=><option key={y}>{y}</option>)}</select><ChevronDown size={13}/></label>}/>
    {query.isLoading ? <div className="metric-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:13, marginBottom:17 }}>{[1,2,3,4].map(n=><div className="panel" key={n} style={{padding:20}}><div className="skeleton" style={{height:13,width:'55%'}}/><div className="skeleton" style={{height:28,width:'70%',marginTop:22}}/><div className="skeleton" style={{height:11,width:'62%',marginTop:13}}/></div>)}</div> : query.isError || !dashboard ? <ErrorPanel onRetry={()=>void query.refetch()}/> : <>
      <div className="metric-grid fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:13, marginBottom:17 }}>
        <Metric label="Annual budget" value={currency(dashboard.annualBudget)} note={`${dashboard.budgetEntries.length} funding ${dashboard.budgetEntries.length===1?'entry':'entries'} in ${year}`} icon={CircleDollarSign} tone="gold"/>
        <Metric label="Projected payroll" value={currency(dashboard.projectedPayroll)} note="Full-year run rate, prorated to active dates" icon={ChartNoAxesCombined} tone={atRisk?'red':'green'}/>
        <Metric label="Accrued to date" value={currency(dashboard.accruedPayroll)} note={`${dashboard.burnRate.toFixed(1)}% of annual funding used`} icon={ArrowDownRight} tone="blue"/>
        <Metric label="Projected balance" value={currency(balance)} note={atRisk?'Projected payroll exceeds available funds':'Remaining after projected payroll'} icon={atRisk?ArrowUpRight:Check} tone={atRisk?'red':'green'}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.8fr) minmax(250px,.8fr)', gap:16, marginBottom:16 }}>
        <section className="panel" style={{ padding:'21px 22px 13px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:15, marginBottom:15 }}><div><div className="eyebrow">Cumulative payroll trajectory</div><div className="display" style={{fontSize:17,fontWeight:800,letterSpacing:'-.025em',marginTop:5}}>Projected spend vs. funding</div></div><div className="mono" style={{fontSize:10,color:'#71817c',whiteSpace:'nowrap'}}>USD · {year}</div></div>
          <div style={{ display:'flex', gap:17, marginBottom:7, flexWrap:'wrap' }}>{[['#37745f','Projected'],['#648da0','Accrued'],['#c29a53','Annual budget']].map(([c,l])=><span key={l} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:10,color:'#71817c'}}><i style={{width:15,height:2,background:c,display:'inline-block'}}/>{l}</span>)}</div>
          {dashboard.monthlyProjection.length ? <ProjectionChart monthly={dashboard.monthlyProjection}/> : <div style={{padding:45,textAlign:'center',color:'#7c8980',fontSize:13}}>Monthly projection will appear when payroll data is available.</div>}
        </section>
        <section className="panel" style={{padding:'22px 21px',display:'flex',flexDirection:'column'}}>
          <div className="eyebrow">Workforce snapshot</div><div className="display" style={{fontSize:17,fontWeight:800,letterSpacing:'-.025em',marginTop:5}}>Roster at a glance</div>
          <div style={{marginTop:22,display:'flex',alignItems:'baseline',gap:8}}><span className="display" style={{fontSize:43,fontWeight:800,letterSpacing:'-.06em',color:'#263f40'}}>{dashboard.employeeCount}</span><span style={{fontSize:12,color:'#78847e'}}>employees</span></div>
          <div style={{height:1,background:'#ebe6db',margin:'18px 0'}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#667770'}}><span>Payroll utilization</span><span className="mono" style={{fontSize:11,color:atRisk?'#a14f43':'#39745e'}}>{dashboard.burnRate.toFixed(1)}%</span></div>
          <div style={{height:7,borderRadius:10,background:'#ebe9df',marginTop:9,overflow:'hidden'}}><div style={{width:`${Math.min(100,Math.max(0,dashboard.burnRate))}%`,height:'100%',background:atRisk?'#b55d4f':'#4c896d',borderRadius:10,transition:'width .4s ease'}}/></div>
          <div style={{marginTop:'auto',paddingTop:20,fontSize:11,lineHeight:1.6,color:'#7e8981'}}>{dashboard.calculationNote}</div>
        </section>
      </div>
      <section className="panel" style={{overflow:'hidden'}}>
        <div style={{padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #e9e4d9'}}><div><div className="eyebrow">Funding portfolio</div><div className="display" style={{fontWeight:800,fontSize:15,marginTop:4}}>Budget entries for {year}</div></div><Link href="/budgets" className="btn btn-quiet" data-testid="link-review-budgets" style={{textDecoration:'none',minHeight:34,fontSize:11}}>Review budgets <ArrowUpRight size={13}/></Link></div>
        {dashboard.budgetEntries.length ? <div className="table-wrap"><table style={{minWidth:500}}><thead><tr><th>Project</th><th>Clarity ID</th><th>Sponsor</th><th style={{textAlign:'right'}}>Allocation</th></tr></thead><tbody>{dashboard.budgetEntries.slice(0,5).map(b=><tr key={b.budgetId} data-testid={`row-dashboard-budget-${b.budgetId}`}><td style={{fontWeight:700,color:'#2c4545'}}>{b.projectId}</td><td className="mono">{b.clarityId}</td><td>{b.sponsorName}</td><td className="mono" style={{textAlign:'right',fontWeight:500}}>{currencyPrecise(b.amount)}</td></tr>)}</tbody></table></div> : <div style={{padding:'28px 20px',textAlign:'center',color:'#78847e',fontSize:12}}>No funding entries recorded for {year}. <Link href="/budgets" style={{color:'#39745e'}}>Add a budget entry</Link></div>}
      </section>
    </>}
  </>;
}

type EmployeeDraft = { employeeId: string; employeeName: string; employeeType: 'FTE'|'CNE'; hourlyRate: string; employmentBeginDate: string; employmentEndDate: string };
const blankEmployee: EmployeeDraft = { employeeId:'', employeeName:'', employeeType:'FTE', hourlyRate:'', employmentBeginDate:'', employmentEndDate:'9999-12-31' };
function EmployeeDialog({ initial, onClose, onSave, pending, errorText }: { initial?: Employee; onClose:()=>void; onSave:(draft:EmployeeDraft)=>void; pending:boolean; errorText?:string }) {
  const [draft,setDraft]=useState<EmployeeDraft>(initial ? {employeeId:initial.employeeId,employeeName:initial.employeeName,employeeType:initial.employeeType,hourlyRate:String(initial.hourlyRate),employmentBeginDate:dateOnly(initial.employmentBeginDate),employmentEndDate:dateOnly(initial.employmentEndDate)} : blankEmployee);
  const [error,setError]=useState('');
  const change=(key:keyof EmployeeDraft,value:string)=>setDraft(prev=>({...prev,[key]:value}));
  const submit=(e:FormEvent)=>{e.preventDefault();if(!draft.employeeName.trim()||(!initial&&!draft.employeeId.trim())||!draft.employmentBeginDate||Number(draft.hourlyRate)<0||!draft.hourlyRate){setError('Complete each required field with a valid rate.');return;} if(draft.employmentEndDate!=='9999-12-31'&&draft.employmentEndDate<draft.employmentBeginDate){setError('End date must be on or after the begin date.');return;}setError('');onSave(draft);};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title"><form onSubmit={submit}>
    <div style={{padding:'22px 24px 17px',borderBottom:'1px solid #e9e4d9',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><div className="eyebrow">{initial?'Roster maintenance':'New roster record'}</div><h2 id="employee-dialog-title" className="display" style={{fontSize:21,letterSpacing:'-.035em',margin:'5px 0 0',color:'#243f40'}}>{initial?'Edit employee':'Add employee'}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog" data-testid="button-close-employee"><X size={18}/></button></div>
    <div style={{padding:'20px 24px 23px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:15}}>
      <div className="field"><label htmlFor="employee-id">Employee ID</label><input id="employee-id" className="control mono" value={draft.employeeId} onChange={e=>change('employeeId',e.target.value)} disabled={!!initial} required placeholder="e.g. ENG-104" data-testid="input-employee-id"/></div>
      <div className="field"><label htmlFor="employee-type">Employee type</label><select id="employee-type" className="control" value={draft.employeeType} onChange={e=>change('employeeType',e.target.value)} data-testid="select-employee-type"><option value="FTE">FTE · Full-time employee</option><option value="CNE">CNE · Contract / non-employee</option></select></div>
      <div className="field" style={{gridColumn:'1/-1'}}><label htmlFor="employee-name">Employee name</label><input id="employee-name" className="control" value={draft.employeeName} onChange={e=>change('employeeName',e.target.value)} required placeholder="Full name" data-testid="input-employee-name"/></div>
      <div className="field"><label htmlFor="hourly-rate">Hourly rate (USD)</label><input id="hourly-rate" className="control mono" type="number" min="0" step=".01" value={draft.hourlyRate} onChange={e=>change('hourlyRate',e.target.value)} required placeholder="0.00" data-testid="input-hourly-rate"/></div>
      <div className="field"><label htmlFor="begin-date">Employment begins</label><input id="begin-date" className="control mono" type="date" value={draft.employmentBeginDate} onChange={e=>change('employmentBeginDate',e.target.value)} required data-testid="input-employment-begin-date"/></div>
      <div className="field" style={{gridColumn:'1/-1'}}><label htmlFor="end-date">Employment ends</label><input id="end-date" className="control mono" type="date" value={draft.employmentEndDate==='9999-12-31'?'':draft.employmentEndDate} onChange={e=>change('employmentEndDate',e.target.value||'9999-12-31')} data-testid="input-employment-end-date"/><span style={{fontSize:10,color:'#818a81'}}>Leave blank for ongoing employment.</span></div>
      {error&&<div role="alert" style={{gridColumn:'1/-1',color:'#a14f43',fontSize:12}}>{error}</div>}
      {errorText&&<div role="alert" style={{gridColumn:'1/-1',color:'#a14f43',fontSize:12}}>{errorText}</div>}
    </div><div style={{padding:'13px 24px',borderTop:'1px solid #e9e4d9',display:'flex',justifyContent:'flex-end',gap:9}}><button type="button" className="btn btn-quiet" onClick={onClose} data-testid="button-cancel-employee">Cancel</button><button className="btn btn-primary" type="submit" disabled={pending} data-testid="button-save-employee">{pending?'Saving…':initial?'Save changes':'Add employee'}</button></div>
  </form></div></div>;
}

function EmployeesPage() {
  const qc=useQueryClient();const query=useListEmployees({query:{queryKey:getListEmployeesQueryKey()}});
  const create=useCreateEmployee();const update=useUpdateEmployee();const remove=useDeleteEmployee();
  const [search,setSearch]=useState('');const [editing,setEditing]=useState<Employee|undefined>();const [adding,setAdding]=useState(false);
  const filtered=useMemo(()=> (query.data??[]).filter(e=>`${e.employeeId} ${e.employeeName} ${e.employeeType}`.toLowerCase().includes(search.toLowerCase())),[query.data,search]);
  const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:getListEmployeesQueryKey()}),qc.invalidateQueries({queryKey:getGetDashboardQueryKey()})]);
  const save=(draft:EmployeeDraft)=>{
    const common={employeeName:draft.employeeName.trim(),employeeType:draft.employeeType,hourlyRate:Number(draft.hourlyRate),employmentBeginDate:draft.employmentBeginDate,employmentEndDate:draft.employmentEndDate||'9999-12-31'};
    if(editing)update.mutate({employeeId:editing.employeeId,data:common},{onSuccess:()=>{void refresh();setEditing(undefined);}});
    else create.mutate({data:{...common,employeeId:draft.employeeId.trim()}},{onSuccess:()=>{void refresh();setAdding(false);}});
  };
  const deleteRecord=(e:Employee)=>{if(window.confirm(`Remove ${e.employeeName} (${e.employeeId}) from the roster?`))remove.mutate({employeeId:e.employeeId},{onSuccess:()=>void refresh()});};
  const pending=create.isPending||update.isPending;
  return <>
    <PageTitle kicker="Roster / workforce assumptions" title="Employees" subtitle="Maintain the people and rates that drive the payroll forecast." action={<button className="btn btn-primary" onClick={()=>setAdding(true)} data-testid="button-add-employee"><Plus size={16}/> Add employee</button>}/>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,marginBottom:14,flexWrap:'wrap'}}>
      <div style={{position:'relative',width:'min(100%,340px)'}}><Search size={15} style={{position:'absolute',left:12,top:13,color:'#7f8a81'}}/><input className="control" type="search" placeholder="Search name, ID or type…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:37}} aria-label="Search employees" data-testid="input-search-employees"/></div>
      <div className="eyebrow" data-testid="text-employee-count">{query.data?.length??0} roster records <span style={{color:'#c0baaa'}}>·</span> {filtered.length} shown</div>
    </div>
    {query.isLoading?<LoadingPanel rows={5}/>:query.isError?<ErrorPanel onRetry={()=>void query.refetch()}/>:filtered.length===0?<div className="panel" style={{padding:'55px 24px',textAlign:'center'}}><div style={{width:44,height:44,margin:'0 auto 14px',borderRadius:12,background:'#e8eee6',color:'#4a755c',display:'grid',placeItems:'center'}}><Users size={20}/></div><div className="display" style={{fontWeight:800,fontSize:17}}>{search?'No matching employees':'Your roster is empty'}</div><p style={{fontSize:12,color:'#78847e',margin:'7px 0 17px'}}>{search?'Try another name, ID or employment type.':'Add the employees whose payroll should be included in the projection.'}</p>{!search&&<button className="btn btn-primary" onClick={()=>setAdding(true)} data-testid="button-empty-add-employee"><Plus size={15}/> Add first employee</button>}</div>:
      <div className="panel" style={{overflow:'hidden'}}><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Type</th><th>Hourly rate</th><th>Employment begins</th><th>Employment ends</th><th style={{width:94}}><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(e=><tr key={e.employeeId} data-testid={`row-employee-${e.employeeId}`}><td><div style={{fontWeight:700,color:'#2b4445'}}>{e.employeeName}</div><div className="mono" style={{fontSize:10,color:'#849087',marginTop:3}}>{e.employeeId}</div></td><td><span className={`tag ${e.employeeType==='CNE'?'tag-cne':''}`}>{e.employeeType}</span></td><td className="mono">{currencyPrecise(e.hourlyRate)}<span style={{fontSize:10,color:'#8b9389'}}> / hr</span></td><td>{dateText(e.employmentBeginDate)}</td><td>{dateText(e.employmentEndDate)}</td><td><div style={{display:'flex',justifyContent:'flex-end',gap:2}}><button className="icon-btn" title="Edit employee" aria-label={`Edit ${e.employeeName}`} onClick={()=>setEditing(e)} data-testid={`button-edit-employee-${e.employeeId}`}><Pencil size={15}/></button><button className="icon-btn" title="Remove employee" aria-label={`Remove ${e.employeeName}`} onClick={()=>deleteRecord(e)} disabled={remove.isPending} data-testid={`button-delete-employee-${e.employeeId}`}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div></div>}
    {remove.isError&&<p role="alert" style={{fontSize:12,color:'#a14f43',marginTop:12}}>Could not remove employee. Try again.</p>}
    {(adding||editing)&&<EmployeeDialog initial={editing} pending={pending} errorText={create.isError||update.isError?'The employee record could not be saved. Check the details and try again.':undefined} onClose={()=>{setAdding(false);setEditing(undefined);}} onSave={save}/>}
  </>;
}

type BudgetDraft={projectId:string;clarityId:string;sponsorName:string;amount:string;year:string};
const blankBudget=(year=currentYear):BudgetDraft=>({projectId:'',clarityId:'',sponsorName:'',amount:'',year:String(year)});
function BudgetDialog({initial,onClose,onSave,pending,errorText}:{initial?:BudgetEntry;onClose:()=>void;onSave:(d:BudgetDraft)=>void;pending:boolean;errorText?:string}) {
  const [draft,setDraft]=useState<BudgetDraft>(initial?{projectId:initial.projectId,clarityId:initial.clarityId,sponsorName:initial.sponsorName,amount:String(initial.amount),year:String(initial.year)}:blankBudget());
  const [error,setError]=useState('');
  const change=(key:keyof BudgetDraft,value:string)=>setDraft(prev=>({...prev,[key]:value}));
  const submit=(e:FormEvent)=>{e.preventDefault();if(!draft.projectId.trim()||!draft.clarityId.trim()||!draft.sponsorName.trim()||!draft.amount||Number(draft.amount)<0||Number(draft.year)<2000||Number(draft.year)>9999){setError('Complete each required field with valid values.');return;}setError('');onSave(draft);};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title"><form onSubmit={submit}>
    <div style={{padding:'22px 24px 17px',borderBottom:'1px solid #e9e4d9',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><div className="eyebrow">{initial?'Allocation maintenance':'Funding record'}</div><h2 id="budget-dialog-title" className="display" style={{fontSize:21,letterSpacing:'-.035em',margin:'5px 0 0',color:'#243f40'}}>{initial?'Edit budget entry':'Add budget entry'}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog" data-testid="button-close-budget"><X size={18}/></button></div>
    <div style={{padding:'20px 24px 23px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:15}}>
      <div className="field"><label htmlFor="project-id">Project ID</label><input id="project-id" className="control mono" value={draft.projectId} onChange={e=>change('projectId',e.target.value)} required placeholder="e.g. PRJ-4821" data-testid="input-project-id"/></div>
      <div className="field"><label htmlFor="clarity-id">Clarity ID</label><input id="clarity-id" className="control mono" value={draft.clarityId} onChange={e=>change('clarityId',e.target.value)} required placeholder="e.g. 400172" data-testid="input-clarity-id"/></div>
      <div className="field" style={{gridColumn:'1/-1'}}><label htmlFor="sponsor-name">Sponsor name</label><input id="sponsor-name" className="control" value={draft.sponsorName} onChange={e=>change('sponsorName',e.target.value)} required placeholder="Budget owner or sponsor" data-testid="input-sponsor-name"/></div>
      <div className="field"><label htmlFor="budget-amount">Annual allocation (USD)</label><input id="budget-amount" className="control mono" type="number" min="0" step=".01" value={draft.amount} onChange={e=>change('amount',e.target.value)} required placeholder="0.00" data-testid="input-budget-amount"/></div>
      <div className="field"><label htmlFor="budget-year">Budget year</label><input id="budget-year" className="control mono" type="number" min="2000" max="9999" value={draft.year} onChange={e=>change('year',e.target.value)} required data-testid="input-budget-year"/></div>
      {error&&<div role="alert" style={{gridColumn:'1/-1',color:'#a14f43',fontSize:12}}>{error}</div>}
      {errorText&&<div role="alert" style={{gridColumn:'1/-1',color:'#a14f43',fontSize:12}}>{errorText}</div>}
    </div><div style={{padding:'13px 24px',borderTop:'1px solid #e9e4d9',display:'flex',justifyContent:'flex-end',gap:9}}><button type="button" className="btn btn-quiet" onClick={onClose} data-testid="button-cancel-budget">Cancel</button><button className="btn btn-primary" type="submit" disabled={pending} data-testid="button-save-budget">{pending?'Saving…':initial?'Save changes':'Add entry'}</button></div>
  </form></div></div>;
}

function BudgetsPage() {
  const qc=useQueryClient();const query=useListBudgets({query:{queryKey:getListBudgetsQueryKey()}});
  const create=useCreateBudget();const update=useUpdateBudget();const remove=useDeleteBudget();
  const [year,setYear]=useState('all');const [search,setSearch]=useState('');const [adding,setAdding]=useState(false);const [editing,setEditing]=useState<BudgetEntry|undefined>();
  const years=useMemo(()=>Array.from(new Set((query.data??[]).map(b=>b.year))).sort((a,b)=>b-a),[query.data]);
  const shown=useMemo(()=> (query.data??[]).filter(b=>(year==='all'||b.year===Number(year))&&`${b.projectId} ${b.clarityId} ${b.sponsorName}`.toLowerCase().includes(search.toLowerCase())),[query.data,year,search]);
  const total=shown.reduce((sum,b)=>sum+b.amount,0);
  const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:getListBudgetsQueryKey()}),qc.invalidateQueries({queryKey:getGetDashboardQueryKey()})]);
  const save=(d:BudgetDraft)=>{const body={projectId:d.projectId.trim(),clarityId:d.clarityId.trim(),sponsorName:d.sponsorName.trim(),amount:Number(d.amount),year:Number(d.year)};
    if(editing)update.mutate({budgetId:editing.budgetId,data:body},{onSuccess:()=>{void refresh();setEditing(undefined);}});
    else create.mutate({data:body},{onSuccess:()=>{void refresh();setAdding(false);}});
  };
  const deleteRecord=(b:BudgetEntry)=>{if(window.confirm(`Remove the ${b.year} allocation for ${b.projectId}?`))remove.mutate({budgetId:b.budgetId},{onSuccess:()=>void refresh()});};
  const pending=create.isPending||update.isPending;
  return <>
    <PageTitle kicker="Funding / annual allocations" title="Budget entries" subtitle="Review the annual funding records available to offset payroll." action={<button className="btn btn-primary" onClick={()=>setAdding(true)} data-testid="button-add-budget"><Plus size={16}/> Add budget entry</button>}/>
    <section className="panel" style={{padding:'18px 20px',display:'flex',alignItems:'center',gap:22,justifyContent:'space-between',flexWrap:'wrap',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <div style={{position:'relative',width:'min(100%,310px)'}}><Search size={15} style={{position:'absolute',left:12,top:13,color:'#7f8a81'}}/><input className="control" type="search" placeholder="Search project, Clarity ID, sponsor…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:37}} aria-label="Search budget entries" data-testid="input-search-budgets"/></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}><CalendarDays size={14} color="#75827b"/><select className="control" aria-label="Filter budget year" value={year} onChange={e=>setYear(e.target.value)} style={{height:38,width:130,padding:'0 10px'}} data-testid="select-budget-year"><option value="all">All years</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:13}}><div><div className="eyebrow">Visible allocation</div><div className="mono" style={{fontWeight:500,fontSize:18,color:'#2c4946',marginTop:3}} data-testid="text-budget-total">{currencyPrecise(total)}</div></div><div style={{width:1,height:35,background:'#e7e2d7'}}/><div><div className="eyebrow">Entries</div><div className="mono" style={{fontSize:17,color:'#2c4946',marginTop:3}}>{shown.length}</div></div></div>
    </section>
    {query.isLoading?<LoadingPanel rows={5}/>:query.isError?<ErrorPanel onRetry={()=>void query.refetch()}/>:shown.length===0?<div className="panel" style={{padding:'55px 24px',textAlign:'center'}}><div style={{width:44,height:44,margin:'0 auto 14px',borderRadius:12,background:'#f3ead9',color:'#94713a',display:'grid',placeItems:'center'}}><BriefcaseBusiness size={20}/></div><div className="display" style={{fontWeight:800,fontSize:17}}>{query.data?.length?'No matching budget entries':'No annual funding recorded'}</div><p style={{fontSize:12,color:'#78847e',margin:'7px 0 17px'}}>{query.data?.length?'Adjust the year or search criteria.':'Add funding allocations to see what is available for payroll.'}</p>{!query.data?.length&&<button className="btn btn-primary" onClick={()=>setAdding(true)} data-testid="button-empty-add-budget"><Plus size={15}/> Add first entry</button>}</div>:
      <div className="panel" style={{overflow:'hidden'}}><div className="table-wrap"><table><thead><tr><th>Project</th><th>Clarity ID</th><th>Sponsor</th><th>Plan year</th><th style={{textAlign:'right'}}>Allocation</th><th style={{width:94}}><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map(b=><tr key={b.budgetId} data-testid={`row-budget-${b.budgetId}`}><td><div style={{fontWeight:700,color:'#2b4445'}}>{b.projectId}</div><div className="mono" style={{fontSize:10,color:'#849087',marginTop:3}}>Record {b.budgetId}</div></td><td className="mono">{b.clarityId}</td><td>{b.sponsorName}</td><td><span className="tag">{b.year}</span></td><td className="mono" style={{textAlign:'right',fontWeight:500}}>{currencyPrecise(b.amount)}</td><td><div style={{display:'flex',justifyContent:'flex-end',gap:2}}><button className="icon-btn" title="Edit budget entry" aria-label={`Edit ${b.projectId} budget`} onClick={()=>setEditing(b)} data-testid={`button-edit-budget-${b.budgetId}`}><Pencil size={15}/></button><button className="icon-btn" title="Remove budget entry" aria-label={`Remove ${b.projectId} budget`} onClick={()=>deleteRecord(b)} disabled={remove.isPending} data-testid={`button-delete-budget-${b.budgetId}`}><Trash2 size={15}/></button></div></td></tr>)}</tbody><tfoot><tr><td colSpan={4} style={{fontSize:11,fontWeight:700,color:'#65736d',borderTop:'1px solid #e5e0d3'}}>TOTAL · {year==='all'?'ALL YEARS':year}</td><td className="mono" style={{textAlign:'right',fontWeight:700,color:'#2a4d43',borderTop:'1px solid #e5e0d3'}}>{currencyPrecise(total)}</td><td style={{borderTop:'1px solid #e5e0d3'}}/></tr></tfoot></table></div></div>}
    {remove.isError&&<p role="alert" style={{fontSize:12,color:'#a14f43',marginTop:12}}>Could not remove budget entry. Try again.</p>}
    {(adding||editing)&&<BudgetDialog initial={editing} pending={pending} errorText={create.isError||update.isError?'The budget entry could not be saved. Check the details and try again.':undefined} onClose={()=>{setAdding(false);setEditing(undefined);}} onSave={save}/>}
  </>;
}

function Router() {
  return <Shell><Switch><Route path="/" component={DashboardPage}/><Route path="/employees" component={EmployeesPage}/><Route path="/budgets" component={BudgetsPage}/><Route component={NotFound}/></Switch></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><Router/></WouterRouter></QueryClientProvider>;
}

export default App;
