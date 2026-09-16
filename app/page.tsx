'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarCheck,
  ChartNoAxesCombined,
  ChevronDown,
  CircleCheck,
  Clock3,
  Database,
  Download,
  Eye,
  FileText,
  Gauge,
  Home,
  Lightbulb,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: unknown,
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

const navItems = [
  { label: '오늘', icon: Home },
  { label: 'AI 진단', icon: Bot },
  { label: '계획과 실행', icon: CalendarCheck },
  { label: '매출·고객', icon: ChartNoAxesCombined },
  { label: '매출성장 9단계', icon: Gauge },
];
const storeOptions = ['해율푸드 전체', '해율만두전골', '곤드레밥집', '정담명가'] as const;
type StoreScope = (typeof storeOptions)[number];
type WorkspaceMember = {
  id:string;
  owner_id:string;
  user_id:string|null;
  email:string;
  display_name:string;
  role:'owner'|'manager'|'staff';
  store_scope:StoreScope;
  is_active:boolean;
  created_at:string;
};
const roleMenus: Record<WorkspaceMember['role'], string[]> = {
  owner: navItems.map(item => item.label),
  manager: ['오늘','AI 진단','계획과 실행','매출·고객','매출성장 9단계'],
  staff: ['오늘','계획과 실행'],
};
const roleNames: Record<WorkspaceMember['role'], string> = {
  owner: '오너', manager: '매장 책임자', staff: '직원',
};
const viewPaths:Record<string,string>={'오늘':'/','AI 진단':'/diagnosis','계획과 실행':'/tasks','매출·고객':'/sales','매출성장 9단계':'/growth','관리':'/manage/store'};
const managePaths:Record<string,string>={'매장 기본정보':'/manage/store','메뉴·가격':'/manage/menu','AI 운영원칙':'/manage/principles','백업·복원':'/manage/backup','해율 지식창고':'/manage/knowledge','전자여권 통계':'/manage/passport','변경 기록':'/manage/activity','계정·보안':'/manage/account'};
const pathView=(path:string)=>path.startsWith('/manage')?'관리':Object.entries(viewPaths).find(([,value])=>value===path)?.[0]||'오늘';
const pathManageSection=(path:string)=>Object.entries(managePaths).find(([,value])=>value===path)?.[0]||'매장 기본정보';
const tasks = [
  {
    title: '가을 버섯 경험 행사',
    store: '해율만두전골',
    area: '이벤트',
    meta: '9월 12일까지 결정',
    status: '결정 필요',
    tone: 'amber',
    description: '가을 버섯을 직접 보고 맛보는 짧은 매장 경험 행사를 검토합니다.',
    period: '9.1 — 9.12',
    budget: '20만원 이내',
    owner: '오너 · 점장',
    instruction: '행사 시간과 참여 방식을 먼저 정하고 고객 동선을 방해하지 않는지 확인하세요.',
    quote: '오늘 준비한 가을 버섯을 가까이에서 한번 보시겠어요?',
  },
  {
    title: '평일 저녁 포장 안내',
    store: '곤드레밥집',
    area: '고객관계',
    meta: '오늘 현장 반응 기록',
    status: '진행 중',
    tone: 'green',
    description: '저녁 방문 고객에게 가족용 한 끼 포장을 한 번만 자연스럽게 안내합니다.',
    period: '9.1 — 9.14',
    budget: '10만원 이내',
    owner: '점장 · 저녁 직원',
    instruction: '식사를 마친 고객에게 한 번만 안내하세요. 원하지 않으면 추가로 권하지 않습니다.',
    quote: '가족분들 드실 한 끼도 함께 준비해드릴까요?',
  },
  {
    title: '재방문 선물 결과 확인',
    store: '정담명가',
    area: '고객관계',
    meta: '결과 입력일 도착',
    status: '결과 확인',
    tone: 'blue',
    description: '재방문 고객에게 제공한 작은 선물의 반응과 다음 방문 의사를 확인합니다.',
    period: '9.1 — 9.15',
    budget: '15만원 이내',
    owner: '점장 · 홀 직원',
    instruction: '선물을 받은 고객의 반응만 간단히 기록하고 참여를 부담스럽게 권하지 않습니다.',
    quote: '다시 찾아주셔서 감사한 마음으로 작은 선물을 준비했습니다.',
  },
];
const stages = [
  '제품',
  '고객관계',
  '이벤트',
  '메시지',
  '브랜드',
  '직원·오너',
  '가격·수익',
  '핵심역량',
  '사업확장',
];
const diagnosisGuide: Record<string, { facts: string[]; metric: string }> = {
  제품: { facts: ['메뉴별 판매량과 고객 반응', '조리시간·품질 편차', '대표메뉴와 보완메뉴의 역할'], metric: '판매량·재주문·불만 변화' },
  고객관계: { facts: ['신규·재방문 고객 변화', '방문 주기와 이탈 신호', '선물·혜택 사용 결과'], metric: '재방문율·방문 간격 변화' },
  이벤트: { facts: ['행사 목적과 대상 고객', '비용과 현장 실행 가능성', '행사 전후 고객 반응'], metric: '참여수·추가매출·재방문 변화' },
  메시지: { facts: ['현재 사용 중인 안내 문구', '고객이 자주 묻는 질문', '채널별 반응 차이'], metric: '문의·선택·반응 변화' },
  브랜드: { facts: ['매장별 고정 메시지', '고객이 기억하는 강점', '홍보물과 현장 경험의 일치'], metric: '브랜드 언급·리뷰 내용 변화' },
  '직원·오너': { facts: ['담당과 실행 기준의 명확성', '반복되는 현장 문제', '교육·점검 기록'], metric: '누락·오류·처리시간 변화' },
  '가격·수익': { facts: ['메뉴별 가격·원가·판매량', '할인과 서비스 비용', '시간대별 수익 차이'], metric: '매출총이익·객단가 변화' },
  핵심역량: { facts: ['고객이 찾아오는 결정적 이유', '경쟁 매장이 따라 하기 어려운 요소', '품질을 유지하는 운영 기준'], metric: '대표 강점 선택·만족도 변화' },
  사업확장: { facts: ['현재 매장의 운영 안정성', '확장에 필요한 사람과 자금', '기존 매장에 미치는 영향'], metric: '투입 대비 수익·운영부담 변화' },
};
type SessionSummary = {
  store: string;
  month: string;
  rows: number;
  totalSales: number;
  totalCustomers: number | null;
  totalOrders: number | null;
  weekdays: { label: string; value: number }[];
  daily: {
    date: string;
    label: string;
    value: number;
    customers: number;
    orders: number;
  }[];
};
type ExecutionTask = {
  id:string;
  title:string;
  store:string;
  area:string;
  due:string;
  owner:string;
  status:'결정 필요'|'진행 중'|'결과 확인'|'완료';
  instruction:string;
  fieldNote:string;
  metricName?:string;
  beforeValue?:string;
  targetValue?:string;
  afterValue?:string;
  submittedAt?:string;
  approvedAt?:string;
  approvedBy?:string;
  reviewNote?:string;
};
type RecentQuestion = { id:string; question:string; store:string; area:string; createdAt:string };
type ManagementNotification = { id:string; taskId:string; tone:'amber'|'blue'|'red'; title:string; detail:string; createdAt:string };
type PassportStats = {
  generatedAt: string;
  summary: {
    totalCustomers: number;
    repeatCustomers: number;
    newCustomersThisMonth: number;
    vipCount: number;
    rewardsIssuedThisMonth: number;
    rewardsUsedThisMonth: number;
    longAbsent60Days: number;
  };
  stores: { id:string; name:string; todayVisits:number; totalVisits:number; newCustomersThisMonth:number }[];
};

const passportStatsUrl = 'https://haeyul-passport.vercel.app/api/cron/management-stats';

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readFileAsText(file: File) {
  if (typeof file.text === 'function') return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('파일 읽기 실패'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

const cloudStorageKeys = ['haeyul-analysis-workspace-v1','haeyul-store-drafts-v1','haeyul-menu-drafts-v1','haeyul-principle-draft-v1','haeyul-audit-log-v1'] as const;
type AuditLog={id:string;action:string;detail:string;actor:string;createdAt:string};
const auditLogChangedEvent='haeyul-audit-log-changed';
function appendAuditLog(action:string,detail:string,actor='오너'){
  try{const current=JSON.parse(window.localStorage.getItem('haeyul-audit-log-v1')||'[]') as AuditLog[];const next=[{id:createId(),action,detail,actor,createdAt:new Date().toISOString()},...current].slice(0,300);window.localStorage.setItem('haeyul-audit-log-v1',JSON.stringify(next));window.dispatchEvent(new Event(auditLogChangedEvent));window.dispatchEvent(new Event(localDataChangedEvent))}catch{}
  const storeName=storeOptions.slice(1).find(store=>detail.startsWith(store));
  void supabase.from('workspace_activity_logs').insert({action,detail,actor,store_name:storeName||null}).then(()=>{});
}

type SharedTaskRow={id:string;owner_id:string;store_name:string;title:string;area:string;due_date:string|null;assignee_name:string;status:ExecutionTask['status'];instruction:string;field_note:string;metric_name:string;before_value:string;target_value:string;after_value:string;submitted_at:string|null;approved_at:string|null;approved_by:string;review_note:string;updated_at:string};
const taskFromRow=(row:SharedTaskRow):ExecutionTask=>({id:row.id,title:row.title,store:row.store_name,area:row.area,due:row.due_date||'',owner:row.assignee_name,status:row.status,instruction:row.instruction,fieldNote:row.field_note,metricName:row.metric_name,beforeValue:row.before_value,targetValue:row.target_value,afterValue:row.after_value,submittedAt:row.submitted_at||'',approvedAt:row.approved_at||'',approvedBy:row.approved_by,reviewNote:row.review_note});
const taskToRow=(task:ExecutionTask,ownerId:string)=>({id:task.id,owner_id:ownerId,store_name:task.store,store_id:null,title:task.title,area:task.area,due_date:task.due||null,assignee_name:task.owner,status:task.status,instruction:task.instruction,field_note:task.fieldNote,metric_name:task.metricName||'',before_value:task.beforeValue||'',target_value:task.targetValue||'',after_value:task.afterValue||'',submitted_at:task.submittedAt||null,approved_at:task.approvedAt||null,approved_by:task.approvedBy||'',review_note:task.reviewNote||''});
type CloudSyncState = 'signed-out' | 'checking' | 'synced' | 'saving' | 'conflict' | 'error';
const localDataChangedEvent = 'haeyul-local-data-changed';
const cloudSyncRefreshEvent = 'haeyul-cloud-sync-refresh';
const cloudSyncStatusEvent = 'haeyul-cloud-sync-status';
const cloudSyncStateKey = 'haeyul-cloud-sync-state-v1';

function readLocalCloudPayload() {
  return Object.fromEntries(cloudStorageKeys.map(key => [key, window.localStorage.getItem(key)]));
}
function cloudPayloadMatchesLocal(payload: unknown) {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return cloudStorageKeys.every(key => (record[key] ?? null) === window.localStorage.getItem(key));
}
function publishCloudSyncState(state: CloudSyncState, updatedAt = '') {
  window.localStorage.setItem(cloudSyncStateKey, JSON.stringify({ state, updatedAt }));
  window.dispatchEvent(new CustomEvent(cloudSyncStatusEvent, { detail: { state, updatedAt } }));
}

function CloudAutoSync() {
  const userRef = useRef<User | null>(null);
  const stateRef = useRef<CloudSyncState>('checking');
  const versionRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const operationRef = useRef(0);

  useEffect(() => {
    let active = true;
    const setSyncState = (state: CloudSyncState, updatedAt = versionRef.current) => {
      stateRef.current = state;
      if (active) publishCloudSyncState(state, updatedAt);
    };
    const reconcile = async (user: User | null) => {
      const operation = ++operationRef.current;
      userRef.current = user;
      versionRef.current = '';
      if (!user) { setSyncState('signed-out', ''); return; }
      setSyncState('checking', '');
      const { data, error } = await supabase.from('workspace_snapshots').select('payload,updated_at').eq('user_id', user.id).maybeSingle();
      if (!active || operation !== operationRef.current || userRef.current?.id !== user.id) return;
      if (error) { setSyncState('error', ''); return; }
      if (!data) { setSyncState('conflict', ''); return; }
      versionRef.current = data.updated_at;
      setSyncState(cloudPayloadMatchesLocal(data.payload) ? 'synced' : 'conflict', data.updated_at);
    };
    const saveIfSafe = async () => {
      const user = userRef.current;
      const expectedVersion = versionRef.current;
      if (!user || stateRef.current !== 'synced' || !expectedVersion) return;
      const operation = ++operationRef.current;
      dirtyRef.current = false;
      setSyncState('saving');
      const nextVersion = new Date().toISOString();
      const { data, error } = await supabase.from('workspace_snapshots').update({ payload: readLocalCloudPayload(), schema_version: 1, updated_at: nextVersion }).eq('user_id', user.id).eq('updated_at', expectedVersion).select('updated_at').maybeSingle();
      if (!active || operation !== operationRef.current || userRef.current?.id !== user.id) return;
      if (error) { setSyncState('error'); return; }
      if (!data) { setSyncState('conflict'); return; }
      versionRef.current = data.updated_at;
      setSyncState('synced', data.updated_at);
      if (dirtyRef.current) scheduleSave();
    };
    const scheduleSave = () => {
      dirtyRef.current = true;
      if (stateRef.current !== 'synced') return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { void saveIfSafe(); }, 1500);
    };
    const refresh = () => {
      dirtyRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      void reconcile(userRef.current);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void reconcile(session?.user ?? null); });
    window.addEventListener(localDataChangedEvent, scheduleSave);
    window.addEventListener(cloudSyncRefreshEvent, refresh);
    void supabase.auth.getUser().then(({ data }) => reconcile(data.user));
    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      subscription.unsubscribe();
      window.removeEventListener(localDataChangedEvent, scheduleSave);
      window.removeEventListener(cloudSyncRefreshEvent, refresh);
    };
  }, []);
  return null;
}

function AccessGate({ status, user, member }: { status:'checking'|'signed-out'|'denied'|'ready'; user:User|null; member:WorkspaceMember|null }) {
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const sendLoginLink=async()=>{
    const clean=email.trim().toLowerCase();
    if(!clean)return;
    setBusy(true);setMessage('');
    const {error}=await supabase.auth.signInWithOtp({email:clean,options:{emailRedirectTo:window.location.origin,shouldCreateUser:true}});
    setBusy(false);
    setMessage(error?'로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.':'로그인 링크를 보냈습니다. 이메일에서 링크를 눌러 주세요.');
  };
  if(status==='checking')return <div className="access-screen"><div className="access-card compact"><div className="brand-mark">해</div><h1>접속 권한을 확인하고 있습니다</h1><p>잠시만 기다려 주세요.</p></div></div>;
  if(status==='denied')return <div className="access-screen"><div className="access-card"><div className="brand-mark">해</div><span className="access-eyebrow">해율 AI 경영실</span><h1>{member&&!member.is_active?'사용이 중지된 계정입니다.':'등록되지 않은 계정입니다.'}</h1><p>{user?.email} 계정은 현재 경영실 사용 권한이 없습니다. 오너에게 직원 계정 등록 또는 사용 상태 확인을 요청해 주세요.</p><button className="secondary-button" onClick={()=>void supabase.auth.signOut()}>다른 계정으로 로그인</button></div></div>;
  return <div className="access-screen"><div className="access-card"><div className="brand-mark">해</div><span className="access-eyebrow">해율 AI 경영실</span><h1>허용된 계정으로 로그인</h1><p>오너가 등록한 이메일로만 경영실에 접속할 수 있습니다.</p><label><span>이메일 주소</span><input type="email" value={email} onChange={event=>setEmail(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void sendLoginLink()}} placeholder="name@example.com" autoComplete="email"/></label><button className="primary-button" disabled={busy||!email.trim()} onClick={()=>void sendLoginLink()}>{busy?'보내는 중':'로그인 링크 받기'}</button>{message&&<div className="access-message">{message}</div>}<small>비밀번호 대신 이메일로 받은 안전한 로그인 링크를 사용합니다.</small></div></div>;
}

export default function HomePage() {
  const router=useRouter();
  const pathname=usePathname();
  const [accessStatus,setAccessStatus]=useState<'checking'|'signed-out'|'denied'|'ready'>('checking');
  const [accessUser,setAccessUser]=useState<User|null>(null);
  const [currentMember,setCurrentMember]=useState<WorkspaceMember|null>(null);
  const [view, setView] = useState(()=>pathView(pathname));
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [salesSummaries, setSalesSummaries] = useState<SessionSummary[]>([]);
  const [adoptedTasks, setAdoptedTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [executionTasks, setExecutionTasks] = useState<ExecutionTask[]>([]);
  const [diagnosisStore, setDiagnosisStore] = useState('해율만두전골');
  const [diagnosisArea, setDiagnosisArea] = useState('제품');
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreScope>('해율푸드 전체');
  const [selectedSalesMonth, setSelectedSalesMonth] = useState('');
  const [readNotificationIds,setReadNotificationIds]=useState<string[]>([]);
  const [focusedTaskId,setFocusedTaskId]=useState('');
  const [manageSection,setManageSection]=useState(()=>pathManageSection(pathname));
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const sharedTasksReady=useRef(false);
  const sharedTaskSaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const sharedTaskBaseline=useRef<Record<string,string>>({});
  const allowedMenus=currentMember?roleMenus[currentMember.role]:[];
  const isOwner=currentMember?.role==='owner';
  const allowedStores:StoreScope[]=isOwner?[...storeOptions]:currentMember?[currentMember.store_scope]:[];
  const go = (name: string) => {
    if(name==='관리'&&!isOwner){toast('관리 메뉴는 오너만 사용할 수 있습니다.');return}
    if(name!=='관리'&&!allowedMenus.includes(name)){toast('현재 계정에 허용되지 않은 메뉴입니다.');return}
    setView(name);
    router.push(viewPaths[name]||'/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toast = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 2600);
  };
  const startQuick = (quickQuestion: string, area: string) => {
    setQuestion(quickQuestion);
    setDiagnosisArea(area);
    setSubmitted(false);
    go('AI 진단');
  };
  useEffect(()=>{
    let active=true;
    const resolveAccess=async(user:User|null)=>{
      if(!active)return;
      setAccessUser(user);setCurrentMember(null);
      if(!user){setAccessStatus('signed-out');return}
      setAccessStatus('checking');
      const {data,error}=await supabase.from('workspace_members').select('id,owner_id,user_id,email,display_name,role,store_scope,is_active,created_at').eq('user_id',user.id).maybeSingle();
      if(!active)return;
      const member=!error&&data?data as WorkspaceMember:null;
      setCurrentMember(member);
      setAccessStatus(member?.is_active?'ready':'denied');
    };
    void supabase.auth.getUser().then(({data})=>resolveAccess(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{void resolveAccess(session?.user??null)});
    return()=>{active=false;subscription.unsubscribe()};
  },[]);
  useEffect(()=>{setView(pathView(pathname));if(pathname.startsWith('/manage'))setManageSection(pathManageSection(pathname));window.scrollTo({top:0})},[pathname]);
  useEffect(()=>{
    if(!currentMember)return;
    if(currentMember.role!=='owner'){
      setSelectedStore(currentMember.store_scope);
      setDiagnosisStore(currentMember.store_scope);
    }
    if((view==='관리'&&currentMember.role!=='owner')||(view!=='관리'&&!roleMenus[currentMember.role].includes(view))){setView('오늘');router.replace('/')}
  },[currentMember,view,router]);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_management_diagnosis',
          title: '경영 진단 시작',
          description:
            '대상 매장의 경영 질문을 AI 진단 화면에 입력하고 분석 준비 상태로 전환합니다.',
          inputSchema: {
            type: 'object',
            properties: { question: { type: 'string', minLength: 2 } },
            required: ['question'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const q =
              typeof input === 'object' && input && 'question' in input
                ? String((input as { question: unknown }).question).trim()
                : '';
            if (q.length < 2)
              throw new Error('질문은 두 글자 이상이어야 합니다.');
            setQuestion(q);
            setSubmitted(false);
            setView('AI 진단');
            return { status: 'ready', view: 'AI 진단', question: q };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('haeyul-analysis-workspace-v1');
      if (saved) {
        const parsed = JSON.parse(saved) as {
          sessionSummary?: SessionSummary | null;
          salesSummaries?: SessionSummary[];
          adoptedTasks?: string[];
          completedTasks?: string[];
          executionTasks?: ExecutionTask[];
          diagnosisStore?: string;
          diagnosisArea?: string;
          recentQuestions?: RecentQuestion[];
          selectedStore?: StoreScope;
          selectedSalesMonth?: string;
          readNotificationIds?:string[];
        };
        const storedSummaries = Array.isArray(parsed.salesSummaries)
          ? parsed.salesSummaries
          : parsed.sessionSummary
            ? [parsed.sessionSummary]
            : [];
        setSalesSummaries(storedSummaries.filter(item => item && typeof item.store === 'string' && typeof item.month === 'string').map(item => ({
          ...item,
          daily: Array.isArray(item.daily) ? item.daily : [],
          weekdays: Array.isArray(item.weekdays) ? item.weekdays : [],
        })));
        if (Array.isArray(parsed.adoptedTasks))
          setAdoptedTasks(parsed.adoptedTasks);
        if (Array.isArray(parsed.completedTasks))
          setCompletedTasks(parsed.completedTasks);
        if (Array.isArray(parsed.executionTasks))
          setExecutionTasks(parsed.executionTasks);
        if (typeof parsed.diagnosisStore === 'string')
          setDiagnosisStore(parsed.diagnosisStore);
        if (typeof parsed.diagnosisArea === 'string')
          setDiagnosisArea(parsed.diagnosisArea);
        if (Array.isArray(parsed.recentQuestions))
          setRecentQuestions(parsed.recentQuestions.slice(0, 5));
        if (storeOptions.includes(parsed.selectedStore as StoreScope))
          setSelectedStore(parsed.selectedStore as StoreScope);
        if (typeof parsed.selectedSalesMonth === 'string')
          setSelectedSalesMonth(parsed.selectedSalesMonth);
        if(Array.isArray(parsed.readNotificationIds))setReadNotificationIds(parsed.readNotificationIds.filter(id=>typeof id==='string').slice(-100));
      }
    } catch {
    } finally {
      setWorkspaceReady(true);
    }
  }, []);
  useEffect(() => {
    if (!workspaceReady) return;
    try {
      window.localStorage.setItem(
        'haeyul-analysis-workspace-v1',
        JSON.stringify({ salesSummaries, adoptedTasks, completedTasks, executionTasks, diagnosisStore, diagnosisArea, recentQuestions, selectedStore, selectedSalesMonth, readNotificationIds }),
      );
      window.dispatchEvent(new Event(localDataChangedEvent));
    } catch {}
  }, [workspaceReady, salesSummaries, adoptedTasks, completedTasks, executionTasks, diagnosisStore, diagnosisArea, recentQuestions, selectedStore, selectedSalesMonth, readNotificationIds]);
  useEffect(()=>{
    if(!workspaceReady||!currentMember)return;
    let active=true;
    const loadSharedTasks=async()=>{
      const {data,error}=await supabase.from('execution_tasks').select('id,owner_id,store_name,title,area,due_date,assignee_name,status,instruction,field_note,metric_name,before_value,target_value,after_value,submitted_at,approved_at,approved_by,review_note,updated_at').order('updated_at',{ascending:false});
      if(!active||error)return;
      const rows=(data||[]) as SharedTaskRow[];
      if(rows.length){const tasks=rows.map(taskFromRow);sharedTaskBaseline.current=Object.fromEntries(tasks.map(task=>[task.id,JSON.stringify(taskToRow(task,currentMember.owner_id))]));setExecutionTasks(tasks)}
      else if(executionTasks.length&&currentMember.role==='owner'){const records=executionTasks.map(task=>taskToRow(task,currentMember.owner_id));const {error:importError}=await supabase.from('execution_tasks').upsert(records);if(!importError)sharedTaskBaseline.current=Object.fromEntries(records.map(record=>[record.id,JSON.stringify(record)]))}
      sharedTasksReady.current=true;
    };
    void loadSharedTasks();
    const channel=supabase.channel(`workspace-tasks-${currentMember.owner_id}`).on('postgres_changes',{event:'*',schema:'public',table:'execution_tasks'},()=>void loadSharedTasks()).subscribe();
    return()=>{active=false;sharedTasksReady.current=false;if(sharedTaskSaveTimer.current)clearTimeout(sharedTaskSaveTimer.current);void supabase.removeChannel(channel)};
  },[workspaceReady,currentMember]);
  useEffect(()=>{
    if(!sharedTasksReady.current||!currentMember)return;
    if(sharedTaskSaveTimer.current)clearTimeout(sharedTaskSaveTimer.current);
    sharedTaskSaveTimer.current=setTimeout(()=>{const records=executionTasks.map(task=>taskToRow(task,currentMember.owner_id));const changed=records.filter(record=>sharedTaskBaseline.current[record.id]!==JSON.stringify(record));if(!changed.length)return;void supabase.from('execution_tasks').upsert(changed).then(({error})=>{if(!error)for(const record of changed)sharedTaskBaseline.current[record.id]=JSON.stringify(record)})},500);
    return()=>{if(sharedTaskSaveTimer.current)clearTimeout(sharedTaskSaveTimer.current)};
  },[executionTasks,currentMember]);
  const scopedTasks = selectedStore === '해율푸드 전체'
    ? executionTasks
    : executionTasks.filter(task => task.store === selectedStore);
  const todayKey=new Date().toISOString().slice(0,10);
  const notifications=scopedTasks.flatMap<ManagementNotification>(task=>{
    if(task.status==='완료')return [];
    if(isOwner&&task.status==='결과 확인')return [{id:`${task.id}:review:${task.submittedAt||''}`,taskId:task.id,tone:'amber' as const,title:'결과 확인 요청',detail:`${task.store} · ${task.title}`,createdAt:task.submittedAt||todayKey}];
    if(!isOwner&&task.reviewNote)return [{id:`${task.id}:return:${task.reviewNote}`,taskId:task.id,tone:'red' as const,title:'보완 요청 도착',detail:`${task.title} · ${task.reviewNote}`,createdAt:todayKey}];
    if(task.due){const days=Math.ceil((new Date(`${task.due}T23:59:59`).getTime()-Date.now())/86400000);if(days<0)return [{id:`${task.id}:overdue:${task.due}`,taskId:task.id,tone:'red' as const,title:'기한이 지났습니다',detail:`${task.store} · ${task.title}`,createdAt:task.due}];if(days<=3)return [{id:`${task.id}:due:${task.due}`,taskId:task.id,tone:'blue' as const,title:days===0?'오늘 마감 과제':`${days}일 후 마감`,detail:`${task.store} · ${task.title}`,createdAt:task.due}]}
    return [];
  });
  const unreadNotificationCount=notifications.filter(item=>!readNotificationIds.includes(item.id)).length;
  const openNotification=(notification:ManagementNotification)=>{setReadNotificationIds(current=>current.includes(notification.id)?current:[...current,notification.id].slice(-100));setFocusedTaskId(notification.taskId);go('계획과 실행')};
  const openManage=(section='매장 기본정보')=>{if(!isOwner){toast('관리 메뉴는 오너만 사용할 수 있습니다.');return}setManageSection(section);setView('관리');router.push(managePaths[section]||viewPaths['관리']);window.scrollTo({top:0,behavior:'smooth'})};
  const markAllNotificationsRead=()=>setReadNotificationIds(current=>[...new Set([...current,...notifications.map(item=>item.id)])].slice(-100));
  const summariesInScope = selectedStore === '해율푸드 전체'
    ? salesSummaries
    : salesSummaries.filter(summary => summary.store === selectedStore);
  const sortedSummariesInScope = [...summariesInScope].sort((a, b) => b.month.localeCompare(a.month) || a.store.localeCompare(b.store));
  const scopedSessionSummary = sortedSummariesInScope.find(summary => `${summary.store}|${summary.month}` === selectedSalesMonth) ?? sortedSummariesInScope[0] ?? null;
  const saveSessionSummary = (summary: SessionSummary) => {
    setSalesSummaries(current => [
      ...current.filter(item => !(item.store === summary.store && item.month === summary.month)),
      summary,
    ]);
    setSelectedSalesMonth(`${summary.store}|${summary.month}`);
  };
  const changeStore = (store: StoreScope) => {
    if(!allowedStores.includes(store)){toast('담당 매장만 선택할 수 있습니다.');return}
    setSelectedStore(store);
    setSelectedSalesMonth('');
    if (store !== '해율푸드 전체') setDiagnosisStore(store);
    toast(`${store} 기준으로 화면을 변경했습니다.`);
  };
  if(accessStatus!=='ready'||!currentMember)return <AccessGate status={accessStatus} user={accessUser} member={currentMember}/>;
  const visibleNavItems=navItems.filter(item=>allowedMenus.includes(item.label));
  return (
    <div className="app-shell">
      <CloudAutoSync />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">해</div>
          <div>
            <strong>해율</strong>
            <span>AI 경영실</span>
          </div>
        </div>
        <nav aria-label="주요 메뉴">
          {visibleNavItems.map(({ label, icon: Icon }) => (
            <button
              onClick={() => go(label)}
              className={`nav-item ${view === label ? 'active' : ''}`}
              key={label}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          {isOwner&&<button
            onClick={() => go('관리')}
            className={`nav-item ${view === '관리' ? 'active' : ''}`}
          >
            <Settings size={20} />
            <span>관리</span>
          </button>}
          <div className="owner">
            <span>{currentMember.display_name.slice(0,2)||'해율'}</span>
            <div>
              <strong>{currentMember.display_name}</strong>
              <small>{roleNames[currentMember.role]} · {currentMember.store_scope}</small>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <Header sessionSummary={scopedSessionSummary} selectedStore={selectedStore} setSelectedStore={changeStore} storeChoices={allowedStores} notifications={notifications} unreadCount={unreadNotificationCount} readIds={readNotificationIds} onNotificationOpen={openNotification} onMarkAllRead={markAllNotificationsRead} />
        {view === '오늘' ? (
          <Today go={go} openManage={openManage} startQuick={startQuick} executionTasks={scopedTasks} salesSummaries={summariesInScope} selectedStore={selectedStore} canUseAi={currentMember.role!=='staff'} />
        ) : view === 'AI 진단' ? (
          <Diagnosis
            question={question}
            setQuestion={setQuestion}
            submitted={submitted}
            setSubmitted={setSubmitted}
            go={go}
            toast={toast}
            setExecutionTasks={setExecutionTasks}
            store={diagnosisStore}
            setStore={setDiagnosisStore}
            area={diagnosisArea}
            setArea={setDiagnosisArea}
            recentQuestions={recentQuestions}
            setRecentQuestions={setRecentQuestions}
            selectedStore={selectedStore}
            workspaceOwnerId={currentMember.owner_id}
            actorName={currentMember.display_name}
          />
        ) : view === '계획과 실행' ? (
          <Plans
            toast={toast}
            sessionSummary={scopedSessionSummary}
            adoptedTasks={scopedSessionSummary ? adoptedTasks : []}
            completedTasks={scopedSessionSummary ? completedTasks : []}
            setCompletedTasks={setCompletedTasks}
            selectedStore={selectedStore}
            executionTasks={executionTasks}
            setExecutionTasks={setExecutionTasks}
            role={currentMember.role}
            actorName={currentMember.display_name}
            workspaceOwnerId={currentMember.owner_id}
            focusedTaskId={focusedTaskId}
            onTaskFocused={()=>setFocusedTaskId('')}
          />
        ) : view === '매출·고객' ? (
          <Sales
            toast={toast}
            sessionSummary={scopedSessionSummary}
            saveSessionSummary={saveSessionSummary}
            salesSummaries={salesSummaries}
            availableSummaries={sortedSummariesInScope}
            selectedSalesMonth={scopedSessionSummary?.month ?? ''}
            setSelectedSalesMonth={setSelectedSalesMonth}
            adoptedTasks={adoptedTasks}
            setAdoptedTasks={setAdoptedTasks}
            setCompletedTasks={setCompletedTasks}
            selectedStore={selectedStore}
            openManage={openManage}
          />
        ) : view === '매출성장 9단계' ? (
          <Stages go={go} executionTasks={scopedTasks} sessionSummary={scopedSessionSummary} selectedStore={selectedStore} />
        ) : (
          <Manage toast={toast} requestedSection={manageSection} onSectionChange={section=>{setManageSection(section);router.push(managePaths[section]||viewPaths['관리'])}} />
        )}
      </main>
      <nav className="mobile-nav">
        {visibleNavItems.map(({ label, icon: Icon }) => (
          <button
            onClick={() => go(label)}
            className={view === label ? 'active' : ''}
            key={label}
          >
            <Icon size={20} />
            <span>{label.replace('매출성장 ', '')}</span>
          </button>
        ))}
        {isOwner&&<button
          onClick={() => go('관리')}
          className={view === '관리' ? 'active' : ''}
        >
          <Settings size={20} />
          <span>관리</span>
        </button>}
      </nav>
      {notice && (
        <div className="toast">
          <CircleCheck size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

function Header({ sessionSummary, selectedStore, setSelectedStore, storeChoices, notifications, unreadCount, readIds, onNotificationOpen, onMarkAllRead }: { sessionSummary: SessionSummary | null; selectedStore: StoreScope; setSelectedStore: (store: StoreScope) => void; storeChoices:StoreScope[]; notifications:ManagementNotification[]; unreadCount:number; readIds:string[]; onNotificationOpen:(notification:ManagementNotification)=>void; onMarkAllRead:()=>void }) {
  const [open,setOpen]=useState(false);
  return (
    <header className="topbar">
      <label className="store-select">
        <span className="store-dot" />
        <select aria-label="조회할 매장 선택" value={selectedStore} onChange={event => setSelectedStore(event.target.value as StoreScope)}>
          {storeChoices.map(store => <option key={store}>{store}</option>)}
        </select>
        <ChevronDown size={16} />
      </label>
      <div className="top-actions">
        <span className="data-date">{sessionSummary ? `${sessionSummary.store} · ${sessionSummary.month} 자료` : `${selectedStore} · 매출자료 없음`}</span>
        <div className="notification-wrap">
          <button className="icon-button" aria-label={`알림 ${unreadCount}개`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
            <Bell size={20} />
            {unreadCount>0&&<><i/><b>{unreadCount>9?'9+':unreadCount}</b></>}
          </button>
          {open&&<section className="notification-panel">
            <div className="notification-head"><div><strong>알림센터</strong><span>확인이 필요한 현장 과제</span></div>{unreadCount>0&&<button onClick={onMarkAllRead}>모두 읽음</button>}</div>
            <div className="notification-list">
              {notifications.map(item=><button key={item.id} className={readIds.includes(item.id)?'read':''} onClick={()=>{onNotificationOpen(item);setOpen(false)}}><span className={`notification-dot ${item.tone}`}/><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight size={15}/></button>)}
              {!notifications.length&&<div className="notification-empty"><CircleCheck size={26}/><strong>확인할 알림이 없습니다.</strong><span>새 요청이나 기한 임박 과제가 여기에 표시됩니다.</span></div>}
            </div>
          </section>}
        </div>
      </div>
    </header>
  );
}
function Heading({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-heading">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{copy}</span>
      </div>
      {action}
    </section>
  );
}
function Today({go,openManage,startQuick,executionTasks,salesSummaries,selectedStore,canUseAi}:{go:(v:string)=>void;openManage:(section?:string)=>void;startQuick:(question:string,area:string)=>void;executionTasks:ExecutionTask[];salesSummaries:SessionSummary[];selectedStore:StoreScope;canUseAi:boolean}) {
  const [passportStats,setPassportStats]=useState<PassportStats|null>(null);
  const [passportLoading,setPassportLoading]=useState(true);
  useEffect(()=>{let active=true;void supabase.auth.getSession().then(async({data})=>{if(!data.session){if(active)setPassportLoading(false);return}try{const response=await fetch(passportStatsUrl,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});if(response.ok&&active)setPassportStats(await response.json() as PassportStats)}finally{if(active)setPassportLoading(false)}});return()=>{active=false}},[]);
  const statusOrder:Record<ExecutionTask['status'],number>={'결정 필요':0,'진행 중':1,'결과 확인':2,'완료':3};
  const openTasks=executionTasks.filter(task=>task.status!=='완료');
  const todayDate=new Date();todayDate.setHours(0,0,0,0);
  const todayKey=[todayDate.getFullYear(),String(todayDate.getMonth()+1).padStart(2,'0'),String(todayDate.getDate()).padStart(2,'0')].join('-');
  const dueDays=(task:ExecutionTask)=>task.due?Math.round((new Date(`${task.due}T00:00:00`).getTime()-todayDate.getTime())/86400000):9999;
  const overdueTasks=openTasks.filter(task=>dueDays(task)<0);
  const todayTasks=openTasks.filter(task=>dueDays(task)===0);
  const weekTasks=openTasks.filter(task=>dueDays(task)>0&&dueDays(task)<=7);
  const recentlyCompleted=executionTasks.filter(task=>task.status==='완료'&&task.approvedAt&&Date.now()-new Date(task.approvedAt).getTime()<=7*86400000);
  const priorityTasks=[...openTasks].sort((a,b)=>dueDays(a)-dueDays(b)||statusOrder[a.status]-statusOrder[b.status]).slice(0,3);
  const focus=priorityTasks[0];
  const tone=(status:ExecutionTask['status'])=>status==='결정 필요'?'amber':status==='결과 확인'?'blue':'green';
  const taskCounts={
    decision:executionTasks.filter(task=>task.status==='결정 필요').length,
    active:executionTasks.filter(task=>task.status==='진행 중').length,
    review:executionTasks.filter(task=>task.status==='결과 확인').length,
    completed:executionTasks.filter(task=>task.status==='완료').length,
  };
  const passportStore = selectedStore === '해율푸드 전체' ? null : passportStats?.stores.find(item => item.name === selectedStore);
  const reportStores=(selectedStore==='해율푸드 전체'?storeOptions.slice(1):[selectedStore]).map(store=>{const storeTasks=executionTasks.filter(task=>task.store===store);const latest=[...salesSummaries].filter(summary=>summary.store===store).sort((a,b)=>b.month.localeCompare(a.month))[0];const customer=passportStats?.stores.find(item=>item.name===store);return {store,open:storeTasks.filter(task=>task.status!=='완료').length,overdue:storeTasks.filter(task=>task.status!=='완료'&&dueDays(task)<0).length,review:storeTasks.filter(task=>task.status==='결과 확인').length,completed:storeTasks.filter(task=>task.status==='완료').length,sales:latest?.totalSales??null,salesMonth:latest?.month??'',visits:customer?.totalVisits??null}});
  const downloadStoreReport=()=>{const headers=['매장','진행 과제','기한 초과','결과 확인','완료','최근 기준월','최근 매출','전자여권 누적 방문'];const rows=reportStores.map(item=>[item.store,item.open,item.overdue,item.review,item.completed,item.salesMonth,item.sales??'',item.visits??'']);const csv='\uFEFF'+[headers,...rows].map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`해율_매장운영보고서_${todayKey}.csv`;link.click();URL.revokeObjectURL(url)};
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="오늘 · 안전하게 저장"
        title="오늘의 경영실"
        copy="결정할 일, 실행 중인 일, 결과 확인 순서로 오늘 업무를 정리합니다."
        action={canUseAi?
          <button onClick={() => go('AI 진단')} className="primary-button">
            <Sparkles size={18} />
            <b>AI 진단 시작</b>
          </button>:undefined
        }
      />
      <div className="prototype-notice"><span>자동 저장</span><p>변경 내용은 먼저 이 기기에 저장되고, 로그인 상태에서는 Supabase에도 자동으로 동기화됩니다.</p></div>
      <section className="today-briefing">
        <div className="briefing-head"><div><span>{todayKey} · {selectedStore}</span><h2>오늘 업무 요약</h2></div><button onClick={()=>go('계획과 실행')}>일정 전체 보기 <ArrowRight size={15}/></button></div>
        <div className="briefing-metrics">
          <article className={overdueTasks.length?'danger':''}><span>기한 초과</span><strong>{overdueTasks.length}개</strong><small>{overdueTasks.length?'가장 먼저 확인':'지연 과제 없음'}</small></article>
          <article><span>오늘 마감</span><strong>{todayTasks.length}개</strong><small>오늘 안에 처리</small></article>
          <article><span>결과 확인</span><strong>{taskCounts.review}개</strong><small>오너 검토 대기</small></article>
          <article><span>최근 7일 완료</span><strong>{recentlyCompleted.length}개</strong><small>승인 완료 기준</small></article>
        </div>
        <div className="briefing-line"><Clock3 size={17}/><span>{overdueTasks.length?`기한이 지난 “${overdueTasks[0].title}”부터 확인하세요.`:todayTasks.length?`오늘 마감 과제 ${todayTasks.length}개를 먼저 처리하세요.`:weekTasks.length?`7일 이내 과제 ${weekTasks.length}개가 예정되어 있습니다.`:'긴급한 기한 과제가 없습니다.'}</span></div>
      </section>
      {canUseAi&&<><section className="ask-panel">
        <div className="ask-icon">
          <Bot size={22} />
        </div>
        <div className="ask-copy">
          <strong>지금 어떤 문제를 해결할까요?</strong>
          <span>
            매장 상황을 편하게 말씀해 주세요. 관련 자료와 9단계를 함께
            살펴봅니다.
          </span>
        </div>
        <button onClick={() => go('AI 진단')}>
          질문 입력하기
          <ArrowRight size={17} />
        </button>
      </section>
      <div className="quick-questions">
        {[
          ['매출 문제','최근 매출 흐름에서 먼저 확인할 문제를 찾아줘.','가격·수익'],
          ['고객 재방문','고객 재방문을 늘리기 위해 먼저 확인할 문제를 찾아줘.','고객관계'],
          ['이벤트','현재 매장에 맞는 이벤트 과제를 정리해줘.','이벤트'],
          ['메뉴 개선','대표 메뉴에서 먼저 개선할 점을 찾아줘.','제품'],
          ['가격·수익','가격과 수익에서 먼저 확인할 문제를 찾아줘.','가격·수익'],
        ].map(([label,quickQuestion,area]) => (
            <button onClick={() => startQuick(quickQuestion,area)} key={label}>
              {label}
            </button>
          ))}
      </div></>}
      <section className="passport-insight">
        <div>
          <span className="eyebrow">전자여권 · 고객관계</span>
          <h2>{passportLoading?'고객 통계를 확인하고 있습니다.':passportStats?`${selectedStore} 고객 현황`:'전자여권 통계 로그인이 필요합니다.'}</h2>
          <p>{passportStore?`누적 방문 ${passportStore.totalVisits.toLocaleString('ko-KR')}회 · 오늘 방문 ${passportStore.todayVisits.toLocaleString('ko-KR')}회`:passportStats?`전체 ${passportStats.summary.totalCustomers.toLocaleString('ko-KR')}명 중 재방문 고객 ${passportStats.summary.repeatCustomers.toLocaleString('ko-KR')}명 · VIP ${passportStats.summary.vipCount.toLocaleString('ko-KR')}명`:'관리의 계정·보안에서 로그인하면 고객관계 통계를 함께 확인합니다.'}</p>
        </div>
        {passportStats?<div className="passport-insight-values"><span>이번 달 신규 <b>{passportStore?.newCustomersThisMonth ?? passportStats.summary.newCustomersThisMonth}명</b></span><span>{passportStore?'누적 방문':'60일 이상 미방문'} <b>{passportStore?`${passportStore.totalVisits}회`:`${passportStats.summary.longAbsent60Days}명`}</b></span></div>:<button onClick={()=>openManage('전자여권 통계')} className="secondary-button">연결 확인</button>}
      </section>
      <div className="dashboard-grid">
        <section className="decision-section">
          <div className="section-title">
            <div>
              <h2>오늘 먼저 볼 일</h2>
              <span>{openTasks.length?openTasks.length+'개의 실제 과제가 기다리고 있습니다.':'등록된 실행 과제가 없습니다.'}</span>
            </div>
            <button onClick={() => go('계획과 실행')}>전체 보기</button>
          </div>
          <div className="task-list">
            {priorityTasks.map((t) => (
              <article className="task-row" key={t.id}>
                <div className={`status-icon ${tone(t.status)}`}>
                  <Clock3 size={18} />
                </div>
                <div className="task-main">
                  <span className="store-label">{t.store}</span>
                  <h3>{t.title}</h3>
                  <p>{t.due?'확인 기한 '+t.due:'기한 미정'} · {t.owner}</p>
                </div>
                <span className={`status ${tone(t.status)}`}>{t.status}</span>
                <button
                  onClick={() => go('계획과 실행')}
                  className="round-arrow"
                >
                  <ArrowRight size={18} />
                </button>
              </article>
            ))}
            {!priorityTasks.length&&<div className="chart-placeholder"><CircleCheck size={30}/><strong>오늘 확인할 과제가 없습니다.</strong><p>계획과 실행에서 새 과제를 등록해 주세요.</p></div>}
          </div>
        </section>
        <aside className="recommend-card">
          <div className="recommend-top">
            <span>
              <Lightbulb size={18} />
              오늘의 우선 확인
            </span>
            <small>{focus?'실제 과제':'대기 중'}</small>
          </div>
          <h2>{focus?focus.title:'먼저 실행 과제를 등록해 주세요.'}</h2>
          <p>{focus?(focus.instruction||'계획과 실행 화면에서 현장 안내와 확인 기준을 입력해 주세요.'):'등록한 과제 중 결정이 필요하거나 결과 확인이 필요한 항목을 우선 표시합니다.'}</p>
          <div className="evidence">
            <strong>판단 근거</strong>
            <span>{focus?`${focus.store} · ${focus.area} · ${focus.status}`:'등록 자료 없음'}</span>
          </div>
          <button onClick={() => go('계획과 실행')}>
            추천 내용 확인
            <ArrowRight size={17} />
          </button>
        </aside>
      </div>
      <section className="bottom-grid" aria-label="실행 과제 현황">
        {[
          [Clock3,'결정 필요',taskCounts.decision+'개','오너 확인 대기','amber'],
          [Target,'진행 중',taskCounts.active+'개','현장 실행 중','green'],
          [BriefcaseBusiness,'결과 확인',taskCounts.review+'개','현장 기록 검토','blue'],
          [CircleCheck,'완료',taskCounts.completed+'개','누적 완료 과제','green'],
        ].map(([Icon, label, value, copy, cardTone]) => (
          <button className="summary-block" key={String(label)} onClick={()=>go('계획과 실행')}>
            <div className={`summary-icon ${cardTone}`}>
              <Icon size={20} />
            </div>
            <div>
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
              <p>{String(copy)}</p>
            </div>
            <ArrowRight className="summary-arrow" size={16}/>
          </button>
        ))}
      </section>
      <section className="store-operations-report">
        <div className="section-title"><div><h2>매장별 운영 보고서</h2><span>과제 진행, 기한, 최근 매출과 고객 방문 자료를 한 번에 확인합니다.</span></div><button onClick={downloadStoreReport}><Download size={16}/>보고서 내려받기</button></div>
        <div className="operations-table"><div className="operations-row operations-header"><span>매장</span><span>진행</span><span>기한 초과</span><span>확인 대기</span><span>완료</span><span>최근 매출</span><span>누적 방문</span></div>{reportStores.map(item=><div className="operations-row" key={item.store}><strong>{item.store}</strong><span>{item.open}개</span><span className={item.overdue?'danger':''}>{item.overdue}개</span><span>{item.review}개</span><span>{item.completed}개</span><span>{item.sales===null?'자료 없음':`${item.sales.toLocaleString('ko-KR')}원`}<small>{item.salesMonth}</small></span><span>{item.visits===null?'연결 자료 없음':`${item.visits.toLocaleString('ko-KR')}회`}</span></div>)}</div>
      </section>
    </div>
  );
}

function Diagnosis({
  question,
  setQuestion,
  submitted,
  setSubmitted,
  go,
  toast,
  setExecutionTasks,
  store,
  setStore,
  area,
  setArea,
  recentQuestions,
  setRecentQuestions,
  selectedStore,
  workspaceOwnerId,
  actorName,
}: {
  question: string;
  setQuestion: (v: string) => void;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  go: (v: string) => void;
  toast: (s:string) => void;
  setExecutionTasks: React.Dispatch<React.SetStateAction<ExecutionTask[]>>;
  store: string;
  setStore: (v:string) => void;
  area: string;
  setArea: (v:string) => void;
  recentQuestions: RecentQuestion[];
  setRecentQuestions: React.Dispatch<React.SetStateAction<RecentQuestion[]>>;
  selectedStore: StoreScope;
  workspaceOwnerId: string;
  actorName: string;
}) {
  const [passportStats,setPassportStats]=useState<PassportStats|null>(null);
  const [savingTask,setSavingTask]=useState(false);
  useEffect(()=>{let active=true;void supabase.auth.getSession().then(async({data})=>{if(!data.session)return;const response=await fetch(passportStatsUrl,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});if(response.ok&&active)setPassportStats(await response.json() as PassportStats)}).catch(()=>{});return()=>{active=false}},[]);
  const submitDiagnosis=()=>{const clean=question.trim();if(!clean)return;setRecentQuestions(current=>[{id:createId(),question:clean,store,area,createdAt:new Date().toISOString()},...current.filter(item=>!(item.question===clean&&item.store===store&&item.area===area))].slice(0,5));setSubmitted(true)};
  const recallQuestion=(item:RecentQuestion)=>{setQuestion(item.question);setStore(item.store);setArea(item.area)};
  const guide=diagnosisGuide[area] ?? diagnosisGuide.제품;
  useEffect(() => {
    if (selectedStore !== '해율푸드 전체' && store !== selectedStore) {
      setStore(selectedStore);
      setSubmitted(false);
    }
  }, [selectedStore, setStore, setSubmitted, store]);
  const makeTask=async()=>{
    if(savingTask)return;
    const cleanQuestion=question.trim();
    if(!cleanQuestion){toast('진단 질문을 먼저 입력해 주세요.');return}
    const task:ExecutionTask={id:createId(),title:cleanQuestion.replace(/[?.!]$/,'').slice(0,48),store,area,due:'',owner:'오너',status:'결정 필요',instruction:`질문: ${cleanQuestion}\n확인할 사실: ${guide.facts.join(' / ')}`,fieldNote:'',metricName:guide.metric,beforeValue:'',targetValue:'',afterValue:''};
    setSavingTask(true);
    const {error}=await supabase.from('execution_tasks').upsert(taskToRow(task,workspaceOwnerId));
    setSavingTask(false);
    if(error){toast('준비표를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');return}
    setExecutionTasks(current=>[task,...current.filter(item=>item.id!==task.id)]);
    appendAuditLog('AI 진단 과제 등록',`${store} · ${task.title}`,actorName);
    toast('준비표를 결정 필요 과제로 저장했습니다.');
    go('계획과 실행');
  };
  return (
    <div className="page-wrap narrow">
      <Heading
        eyebrow="AI 진단"
        title="문제를 함께 살펴볼게요"
        copy="확인된 사실과 AI의 판단을 구분해 실행 가능한 방법만 제안합니다."
      />
      <div className="prototype-notice compact">
        <span>AI 연결 전 흐름 미리보기</span>
        <p>입력한 질문은 아직 실제 자료나 AI 분석과 연결되지 않습니다.</p>
      </div>
      {!submitted ? (
        <>
        <section className="question-card">
          <label htmlFor="question">어떤 문제를 해결하고 싶으세요?</label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="예: 곤드레밥집의 평일 저녁 매출을 올릴 방법을 찾아줘."
          />
          <div className="diagnosis-fields"><label><span>대상 매장</span><select value={store} onChange={e=>setStore(e.target.value)}><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label><label><span>9단계 영역</span><select value={area} onChange={e=>setArea(e.target.value)}>{stages.map(stage=><option key={stage}>{stage}</option>)}</select></label></div>
          <div className="form-row">
            <span>
              선택 · <b>{store} · {area}</b>
            </span>
            <button
              disabled={!question.trim()}
              onClick={submitDiagnosis}
              className="primary-button"
            >
              분석 시작
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
        {recentQuestions.length>0&&<section className="recent-questions"><div><strong>최근 질문</strong><span>이 기기에 저장된 질문을 다시 불러올 수 있습니다.</span></div><div className="recent-question-list">{recentQuestions.map(item=><button key={item.id} onClick={()=>recallQuestion(item)}><strong>{item.question}</strong><span>{item.store} · {item.area}</span></button>)}</div></section>}
        </>
      ) : (
        <section className="diagnosis-result">
          <button className="back-link" onClick={() => setSubmitted(false)}>
            <ArrowLeft size={16} />
            질문 수정
          </button>
          <div className="understood">
            <small>AI가 이해한 내용</small>
            <h2>{question}</h2>
            <div>
              <span>
                대상 매장 <b>{store}</b>
              </span>
              <span>
                주 단계 <b>{area}</b>
              </span>
              <span>
                자료 기준 <b>{area==='고객관계'&&passportStats?'전자여권 통계 연결':'확인 자료 기준'}</b>
              </span>
            </div>
          </div>
          <div className="result-grid">
            <article>
              <span className="fact-label">{area==='고객관계'&&passportStats?'전자여권 확인자료':'확인할 실제 자료'}</span>
              <h3>{area==='고객관계'&&passportStats?`전체 ${passportStats.summary.totalCustomers}명 · 재방문 ${passportStats.summary.repeatCustomers}명 · VIP ${passportStats.summary.vipCount}명`:'질문과 관련된 확인 자료를 먼저 찾습니다.'}</h3>
              <p>{area==='고객관계'&&passportStats?`이번 달 신규 ${passportStats.summary.newCustomersThisMonth}명, 60일 이상 미방문 ${passportStats.summary.longAbsent60Days}명입니다. 개인별 정보 없이 집계 수치만 사용합니다.`:'매출·고객·운영 기록에서 확인된 사실만 이 영역에 표시합니다.'}</p>
            </article>
            <article>
              <span className="ai-label">AI 연결 후 제공</span>
              <h3>확인된 사실과 해율의 운영원칙을 바탕으로 제안합니다.</h3>
              <p>
                실제 연결 전에는 특정 원인이나 실행안을 확정해 표시하지
                않습니다.
              </p>
            </article>
          </div>
          <section className="diagnosis-framework" aria-label="진단 검토 순서">
            <div className="section-title">
              <div>
                <h2>진단 검토 순서</h2>
                <span>자료가 연결되면 같은 순서로 근거와 실행안을 채웁니다.</span>
              </div>
              <span className="soft-tag">{store} · {area}</span>
            </div>
            <div className="diagnosis-steps">
              <article>
                <b>1</b><span>확인할 사실</span>
                <ul>{guide.facts.map(item=><li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <b>2</b><span>문제 판단</span>
                <p>확정정보와 실제 수치를 구분하고, 근거가 부족하면 ‘확인 필요’로 남깁니다.</p>
              </article>
              <article>
                <b>3</b><span>실행 우선순위</span>
                <p>효과·비용·현장 난이도를 비교해 한 번에 한 가지 과제만 먼저 정합니다.</p>
              </article>
              <article>
                <b>4</b><span>결과 확인</span>
                <p>{guide.metric}를 실행 전과 실행 후 같은 기준으로 비교합니다.</p>
              </article>
            </div>
          </section>
          <div className="plan-preview">
            <div>
              <span>오너 검토용 준비표</span>
              <h2>질문과 확인 기준을 실행과제로 넘기기</h2>
              <p>확인할 사실과 결과 지표를 함께 저장하고, 실제 실행안은 오너 검토 후 확정합니다.</p>
            </div>
            <button
              onClick={()=>void makeTask()}
              disabled={savingTask}
              className="primary-button"
            >
              {savingTask?'저장 중':'준비표 저장'}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function TaskPerformance({tasks}:{tasks:ExecutionTask[]}){
  const completed=tasks.filter(task=>task.status==='완료').sort((a,b)=>(b.approvedAt||'').localeCompare(a.approvedAt||''));
  const numeric=(value?:string)=>{if(!value)return null;const match=value.replaceAll(',','').match(/-?\d+(?:\.\d+)?/);return match?Number(match[0]):null};
  const measured=completed.map(task=>({...task,targetNumber:numeric(task.targetValue),afterNumber:numeric(task.afterValue)})).filter(task=>task.targetNumber!==null&&task.afterNumber!==null);
  const achieved=measured.filter(task=>(task.afterNumber as number)>=(task.targetNumber as number));
  const rate=measured.length?Math.round(achieved.length/measured.length*100):null;
  return <section className="task-performance">
    <div className="section-title"><div><h2>완료 과제 성과</h2><span>오너가 승인한 과제의 목표와 실제 결과를 비교합니다.</span></div><span className="draft-count">누적 {completed.length}개</span></div>
    <div className="performance-summary"><article><span>승인 완료</span><strong>{completed.length}개</strong><small>현재 선택 매장 기준</small></article><article><span>수치 비교 가능</span><strong>{measured.length}개</strong><small>목표·실행 후 입력 과제</small></article><article><span>목표 달성</span><strong>{achieved.length}개</strong><small>실행 후 ≥ 목표</small></article><article><span>목표 달성률</span><strong>{rate===null?'자료 없음':`${rate}%`}</strong><small>비교 가능한 과제 기준</small></article></div>
    {completed.length?<div className="performance-history">{completed.slice(0,6).map(task=>{const target=numeric(task.targetValue);const after=numeric(task.afterValue);const hasResult=target!==null&&after!==null;const success=hasResult&&(after as number)>=(target as number);return <article key={task.id}><span className={`performance-state ${!hasResult?'neutral':success?'success':'miss'}`}>{!hasResult?'기록 완료':success?'목표 달성':'목표 미달'}</span><div><strong>{task.title}</strong><small>{task.store} · {task.metricName||'확인 지표 미입력'} · {task.approvedAt?new Date(task.approvedAt).toLocaleDateString('ko-KR'):'승인일 미기록'}</small></div><div className="performance-values"><span>목표 <b>{task.targetValue||'—'}</b></span><ArrowRight size={14}/><span>결과 <b>{task.afterValue||'—'}</b></span></div></article>})}</div>:<div className="schedule-empty"><CircleCheck size={22}/><span>아직 오너가 승인한 완료 과제가 없습니다.</span></div>}
  </section>;
}

function TaskSchedule({tasks,onSelect}:{tasks:ExecutionTask[];onSelect:(task:ExecutionTask)=>void}){
  const [period,setPeriod]=useState<'all'|'overdue'|'today'|'week'|'undated'>('all');
  const today=new Date();today.setHours(0,0,0,0);
  const dayMs=86400000;
  const classify=(task:ExecutionTask)=>{
    if(!task.due)return 'undated' as const;
    const due=new Date(`${task.due}T00:00:00`);const days=Math.round((due.getTime()-today.getTime())/dayMs);
    if(days<0)return 'overdue' as const;if(days===0)return 'today' as const;if(days<=7)return 'week' as const;return 'later' as const;
  };
  const activeTasks=tasks.filter(task=>task.status!=='완료');
  const counts={overdue:activeTasks.filter(task=>classify(task)==='overdue').length,today:activeTasks.filter(task=>classify(task)==='today').length,week:activeTasks.filter(task=>classify(task)==='week').length,undated:activeTasks.filter(task=>classify(task)==='undated').length};
  const visible=activeTasks.filter(task=>period==='all'||classify(task)===period).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  const dateLabel=(task:ExecutionTask)=>{const kind=classify(task);if(kind==='undated')return '기한 미정';if(kind==='today')return '오늘 마감';if(kind==='overdue')return `${Math.abs(Math.round((new Date(`${task.due}T00:00:00`).getTime()-today.getTime())/dayMs))}일 지남`;return new Date(`${task.due}T00:00:00`).toLocaleDateString('ko-KR',{month:'short',day:'numeric',weekday:'short'})};
  return <section className="task-schedule">
    <div className="section-title"><div><h2>과제 일정표</h2><span>오늘 처리할 일과 기한이 지난 일을 먼저 확인합니다.</span></div><span className="draft-count">진행 과제 {activeTasks.length}개</span></div>
    <div className="schedule-summary">
      {([['overdue','기한 초과',counts.overdue,'red'],['today','오늘 마감',counts.today,'amber'],['week','7일 이내',counts.week,'blue'],['undated','기한 미정',counts.undated,'gray']] as const).map(([key,label,count,tone])=><button key={key} className={`${period===key?'active ':''}${tone}`} onClick={()=>setPeriod(period===key?'all':key)}><span>{label}</span><strong>{count}개</strong></button>)}
    </div>
    {visible.length>0?<div className="schedule-list">{visible.slice(0,8).map(task=><button key={task.id} onClick={()=>onSelect(task)}><span className={`schedule-date ${classify(task)}`}>{dateLabel(task)}</span><span><strong>{task.title}</strong><small>{task.store} · {task.owner} · {task.status}</small></span><ArrowRight size={16}/></button>)}</div>:<div className="schedule-empty"><CircleCheck size={22}/><span>선택한 기간에 처리할 과제가 없습니다.</span></div>}
  </section>;
}

function Plans({
  toast,
  sessionSummary,
  adoptedTasks,
  completedTasks,
  setCompletedTasks,
  executionTasks,
  setExecutionTasks,
  selectedStore,
  role,
  actorName,
  workspaceOwnerId,
  focusedTaskId,
  onTaskFocused,
}: {
  toast: (s: string) => void;
  sessionSummary: SessionSummary | null;
  adoptedTasks: string[];
  completedTasks: string[];
  setCompletedTasks: React.Dispatch<React.SetStateAction<string[]>>;
  executionTasks: ExecutionTask[];
  setExecutionTasks: React.Dispatch<React.SetStateAction<ExecutionTask[]>>;
  selectedStore: StoreScope;
  role: WorkspaceMember['role'];
  actorName:string;
  workspaceOwnerId:string;
  focusedTaskId:string;
  onTaskFocused:()=>void;
}) {
  const canManage=role!=='staff';
  const isOwner=role==='owner';
  const [showCreate,setShowCreate]=useState(false);
  const [showExamples,setShowExamples]=useState(false);
  const [savingTaskId,setSavingTaskId]=useState('');
  const [taskQuery,setTaskQuery]=useState('');
  const [taskStore,setTaskStore]=useState('전체 매장');
  const [taskStatus,setTaskStatus]=useState('전체 상태');
  const emptyTask = (storeName = '해율만두전골') => ({title:'',store:storeName,area:'제품',due:'',owner:'오너',instruction:'',metricName:'',beforeValue:'',targetValue:'',afterValue:''});
  const [newTask,setNewTask]=useState(emptyTask());
  useEffect(() => {
    const nextStore = selectedStore === '해율푸드 전체' ? '전체 매장' : selectedStore;
    setTaskStore(nextStore);
    if (selectedStore !== '해율푸드 전체') {
      setNewTask(current => ({...current, store: selectedStore}));
    }
  }, [selectedStore]);
  const taskIsInScope=(task:ExecutionTask)=>selectedStore==='해율푸드 전체'||task.store===selectedStore;
  const addTask=async()=>{if(!newTask.title.trim()||savingTaskId)return;const safeStore=selectedStore==='해율푸드 전체'?newTask.store:selectedStore;const task:ExecutionTask={id:createId(),...newTask,store:safeStore,title:newTask.title.trim(),status:'결정 필요',fieldNote:''};setSavingTaskId(task.id);const {error}=await supabase.from('execution_tasks').upsert(taskToRow(task,workspaceOwnerId));setSavingTaskId('');if(error){toast('과제를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');return}setExecutionTasks(current=>[task,...current.filter(item=>item.id!==task.id)]);appendAuditLog('과제 등록',`${safeStore} · ${task.title}`,actorName);setNewTask(emptyTask(selectedStore === '해율푸드 전체' ? '해율만두전골' : selectedStore));setShowCreate(false);toast('새 과제와 확인 지표를 저장했습니다.')};
  const updateTask=(id:string,changes:Partial<ExecutionTask>)=>setExecutionTasks(current=>current.map(task=>task.id===id&&taskIsInScope(task)?{...task,...changes}:task));
  const saveWorkflowTask=async(task:ExecutionTask,changes:Partial<ExecutionTask>,action:string,message:string,detail?:string)=>{if(savingTaskId)return;const next={...task,...changes};setSavingTaskId(task.id);const {error}=await supabase.from('execution_tasks').upsert(taskToRow(next,workspaceOwnerId));setSavingTaskId('');if(error){toast('변경 내용을 저장하지 못했습니다. 다시 시도해 주세요.');return false}setExecutionTasks(current=>current.map(item=>item.id===task.id?next:item));appendAuditLog(action,detail||`${task.store} · ${task.title}`,actorName);toast(message);return true};
  const startTask=(task:ExecutionTask)=>void saveWorkflowTask(task,{status:'진행 중',reviewNote:''},'과제 실행 시작','과제를 진행 중으로 변경했습니다.');
  const submitTask=(task:ExecutionTask)=>{if(!task.fieldNote.trim()&&!task.afterValue?.trim()){toast('현장 기록이나 실행 후 결과를 먼저 입력해 주세요.');return}void saveWorkflowTask(task,{status:'결과 확인',submittedAt:new Date().toISOString(),approvedAt:'',approvedBy:'',reviewNote:''},'결과 확인 요청','결과를 오너 확인 대기로 제출했습니다.')};
  const approveTask=(task:ExecutionTask)=>void saveWorkflowTask(task,{status:'완료',approvedAt:new Date().toISOString(),approvedBy:actorName,reviewNote:''},'과제 승인 완료','현장 결과를 승인하고 과제를 완료했습니다.');
  const returnTask=(task:ExecutionTask)=>{const note=window.prompt('다시 확인할 내용을 직원에게 남겨 주세요.',task.reviewNote||'');if(note===null)return;const reviewNote=note.trim()||'결과를 보완해 다시 제출해 주세요.';void saveWorkflowTask(task,{status:'진행 중',reviewNote,approvedAt:'',approvedBy:''},'과제 보완 요청','과제를 보완 요청 상태로 돌렸습니다.',`${task.store} · ${task.title} · ${reviewNote}`)};
  const scopedExecutionTasks = selectedStore === '해율푸드 전체' ? executionTasks : executionTasks.filter(task => task.store === selectedStore);
  const actualCounts={all:scopedExecutionTasks.length,decision:scopedExecutionTasks.filter(task=>task.status==='결정 필요').length,active:scopedExecutionTasks.filter(task=>task.status==='진행 중').length,review:scopedExecutionTasks.filter(task=>task.status==='결과 확인').length,done:scopedExecutionTasks.filter(task=>task.status==='완료').length};
  const visibleTasks=scopedExecutionTasks.filter(task=>{const query=taskQuery.trim().toLowerCase();const matchesQuery=!query||[task.title,task.store,task.area,task.owner,task.instruction,task.fieldNote].some(value=>value.toLowerCase().includes(query));return matchesQuery&&(taskStore==='전체 매장'||task.store===taskStore)&&(taskStatus==='전체 상태'||task.status===taskStatus)});
  useEffect(()=>{if(!focusedTaskId)return;const task=scopedExecutionTasks.find(item=>item.id===focusedTaskId);if(task){setTaskQuery(task.title);setTaskStore(selectedStore==='해율푸드 전체'?task.store:selectedStore);setTaskStatus('전체 상태');window.setTimeout(()=>document.getElementById(`task-${task.id}`)?.scrollIntoView({behavior:'smooth',block:'center'}),50)}onTaskFocused()},[focusedTaskId,onTaskFocused,scopedExecutionTasks,selectedStore]);
  const removeTask=(task:ExecutionTask)=>{if(!window.confirm(`“${task.title}” 과제를 삭제할까요? 삭제한 과제는 백업 파일이 없으면 복구할 수 없습니다.`))return;setExecutionTasks(current=>current.filter(item=>item.id!==task.id));void supabase.from('execution_tasks').delete().eq('owner_id',workspaceOwnerId).eq('id',task.id);appendAuditLog('과제 삭제',`${task.store} · ${task.title}`,actorName);toast('과제를 삭제했습니다.')};
  const clearCompleted=()=>{const targets=scopedExecutionTasks.filter(task=>task.status==='완료');const count=targets.length;if(!count)return;if(!window.confirm(`현재 선택 범위의 완료 과제 ${count}개를 모두 삭제할까요?`))return;setExecutionTasks(current=>current.filter(task=>task.status!=='완료'||(selectedStore!=='해율푸드 전체'&&task.store!==selectedStore)));void supabase.from('execution_tasks').delete().eq('owner_id',workspaceOwnerId).in('id',targets.map(task=>task.id));appendAuditLog('완료 과제 일괄 정리',`${selectedStore} · ${count}개`,actorName);toast('완료된 과제를 정리했습니다.')};
  const downloadTaskReport=()=>{const escape=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;const headers=['매장','과제명','영역','담당','기한','상태','확인지표','실행 전','목표','실행 후','현장 기록','보완 요청','제출일','승인일','승인자'];const rows=scopedExecutionTasks.map(task=>[task.store,task.title,task.area,task.owner,task.due,task.status,task.metricName,task.beforeValue,task.targetValue,task.afterValue,task.fieldNote,task.reviewNote,task.submittedAt,task.approvedAt,task.approvedBy]);const csv='\uFEFF'+[headers,...rows].map(row=>row.map(escape).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`해율_과제보고서_${selectedStore}_${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);toast('현재 선택 범위의 과제 보고서를 내려받았습니다.')};
  const exampleTasks=selectedStore==='해율푸드 전체'?tasks:tasks.filter(task=>task.store===selectedStore);
  const exampleTask=exampleTasks[0];
  const exampleCounts={decision:exampleTasks.filter(task=>task.status==='결정 필요').length,active:exampleTasks.filter(task=>task.status==='진행 중').length,review:exampleTasks.filter(task=>task.status==='결과 확인').length};
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="계획과 실행"
        title="실행 과제"
        copy="오너가 승인한 계획만 현장 과제가 됩니다."
        action={<div className="task-heading-actions"><button className="secondary-button" disabled={!scopedExecutionTasks.length} onClick={downloadTaskReport}><Download size={17}/><b>보고서</b></button>{canManage&&<button onClick={()=>setShowCreate(value=>!value)} className="primary-button"><Plus size={18}/><b>{showCreate?'입력 닫기':'새 과제'}</b></button>}</div>
        }
      />
      <TaskSchedule tasks={scopedExecutionTasks} onSelect={task=>{setTaskQuery(task.title);setTaskStatus('전체 상태');window.setTimeout(()=>document.querySelector('.real-task-board')?.scrollIntoView({behavior:'smooth'}),0)}}/>
      <TaskPerformance tasks={scopedExecutionTasks}/>
      {showCreate&&<section className="task-create"><div className="section-title"><div><h2>새 실행 과제</h2><span>오너가 확인한 과제만 등록하세요.</span></div></div><div className="task-create-grid"><label><span>과제명</span><input value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})} placeholder="예: 평일 저녁 포장 안내" autoFocus/></label><label><span>대상 매장</span><select value={newTask.store} onChange={e=>setNewTask({...newTask,store:e.target.value})}><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label><label><span>9단계 영역</span><select value={newTask.area} onChange={e=>setNewTask({...newTask,area:e.target.value})}>{stages.map(stage=><option key={stage}>{stage}</option>)}</select></label><label><span>확인 기한</span><input type="date" value={newTask.due} onChange={e=>setNewTask({...newTask,due:e.target.value})}/></label><label><span>담당</span><input value={newTask.owner} onChange={e=>setNewTask({...newTask,owner:e.target.value})}/></label><label><span>확인 지표</span><input value={newTask.metricName} onChange={e=>setNewTask({...newTask,metricName:e.target.value})} placeholder="예: 평일 저녁 포장 주문 수"/></label><label className="wide"><span>현장 안내</span><textarea value={newTask.instruction} onChange={e=>setNewTask({...newTask,instruction:e.target.value})} placeholder="직원이 바로 실행할 수 있도록 짧게 적어주세요."/></label><label><span>실행 전 수치</span><input value={newTask.beforeValue} onChange={e=>setNewTask({...newTask,beforeValue:e.target.value})} placeholder="예: 하루 3건"/></label><label><span>목표 수치</span><input value={newTask.targetValue} onChange={e=>setNewTask({...newTask,targetValue:e.target.value})} placeholder="예: 하루 6건"/></label></div><div className="task-create-actions"><span>등록이 완료된 과제만 화면과 클라우드에 표시됩니다.</span><button className="primary-button" disabled={!newTask.title.trim()||!!savingTaskId} onClick={()=>void addTask()}>{savingTaskId?'저장 중':'과제 등록'}</button></div></section>}
      {scopedExecutionTasks.length>0&&<section className="real-task-board">
        <div className="section-title"><div><h2>내 실행 과제</h2><span>{selectedStore} 기준 · 필요한 과제를 찾고 상태와 현장 기록을 바로 수정할 수 있습니다.</span></div><span className="draft-count">{scopedExecutionTasks.filter(task=>task.status==='완료').length}/{scopedExecutionTasks.length} 완료</span></div>
        <div className="actual-task-tabs" aria-label="실제 과제 상태별 보기">
          {[['전체',actualCounts.all,'전체 상태'],['결정 필요',actualCounts.decision,'결정 필요'],['진행 중',actualCounts.active,'진행 중'],['결과 확인',actualCounts.review,'결과 확인'],['완료',actualCounts.done,'완료']].map(([label,count,value])=><button key={String(label)} className={taskStatus===value?'active':''} onClick={()=>setTaskStatus(String(value))}><span>{label}</span><b>{count}</b></button>)}
        </div>
        {isOwner&&scopedExecutionTasks.some(task=>task.status==='결과 확인')&&<div className="review-queue-banner"><div><Eye size={19}/><span><strong>오너 확인 대기 {scopedExecutionTasks.filter(task=>task.status==='결과 확인').length}건</strong><small>직원이 제출한 현장 결과를 확인하고 승인하거나 보완 요청해 주세요.</small></span></div><button onClick={()=>setTaskStatus('결과 확인')}>확인할 과제만 보기</button></div>}
        <div className="task-tools">
          <label><span>과제 검색</span><input value={taskQuery} onChange={e=>setTaskQuery(e.target.value)} placeholder="과제명, 담당, 현장 기록 검색"/></label>
          <label><span>매장</span><select value={taskStore} onChange={e=>setTaskStore(e.target.value)}><option>전체 매장</option><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label>
          <label><span>상태</span><select value={taskStatus} onChange={e=>setTaskStatus(e.target.value)}><option>전체 상태</option><option>결정 필요</option><option>진행 중</option><option>결과 확인</option><option>완료</option></select></label>
          {isOwner&&<button className="completed-clear" disabled={!scopedExecutionTasks.some(task=>task.status==='완료')} onClick={clearCompleted}><Trash2 size={16}/>완료 과제 정리</button>}
        </div>
        <div className="task-result-count">선택 범위 {scopedExecutionTasks.length}개 중 {visibleTasks.length}개 표시</div>
        <div className="real-task-list">
          {visibleTasks.map(task=>(
            <article id={`task-${task.id}`} key={task.id} className={`task-workflow-card ${task.status==='결과 확인'?'awaiting-review':''}`}>
              <div className="real-task-head">
                <div><span>{task.store} · {task.area}</span><input aria-label="과제명" value={task.title} readOnly={!canManage} onChange={e=>updateTask(task.id,{title:e.target.value})}/></div>
                <select aria-label={task.title+' 상태'} value={task.status} disabled={!canManage||task.status==='완료'} onChange={e=>updateTask(task.id,{status:e.target.value as ExecutionTask['status']})}><option>결정 필요</option><option>진행 중</option><option>결과 확인</option>{isOwner&&<option>완료</option>}</select>
              </div>
              <div className="real-task-meta"><span>담당 <b>{task.owner}</b></span><span>기한 <b>{task.due||'미정'}</b></span></div>
              {task.reviewNote&&<div className="review-return-note"><strong>보완 요청</strong><span>{task.reviewNote}</span></div>}
              <label><span>현장 안내</span><textarea value={task.instruction} readOnly={!canManage} onChange={e=>updateTask(task.id,{instruction:e.target.value})} placeholder="실행 방법을 입력하세요."/></label>
              <section className="task-result-fields">
                <label><span>확인 지표</span><input value={task.metricName||''} readOnly={!canManage} onChange={e=>updateTask(task.id,{metricName:e.target.value})} placeholder="예: 포장 주문 수"/></label>
                <label><span>실행 전</span><input value={task.beforeValue||''} readOnly={!canManage} onChange={e=>updateTask(task.id,{beforeValue:e.target.value})} placeholder="예: 하루 3건"/></label>
                <label><span>목표</span><input value={task.targetValue||''} readOnly={!canManage} onChange={e=>updateTask(task.id,{targetValue:e.target.value})} placeholder="예: 하루 6건"/></label>
                <label><span>실행 후</span><input value={task.afterValue||''} readOnly={task.status==='완료'} onChange={e=>updateTask(task.id,{afterValue:e.target.value})} placeholder="결과 입력"/></label>
              </section>
              <label><span>현장 기록</span><textarea value={task.fieldNote} readOnly={task.status==='완료'} onChange={e=>updateTask(task.id,{fieldNote:e.target.value})} placeholder="고객 반응, 직원 의견, 결과를 기록하세요."/></label>
              {task.afterValue&&<div className="task-result-summary"><CircleCheck size={17}/><span><b>{task.metricName||'확인 지표'}</b> · 실행 전 {task.beforeValue||'미입력'} → 실행 후 {task.afterValue}{task.targetValue?` · 목표 ${task.targetValue}`:''}</span></div>}
              <div className="workflow-history">{task.submittedAt&&<span>제출 {new Date(task.submittedAt).toLocaleString('ko-KR')}</span>}{task.approvedAt&&<span>승인 {new Date(task.approvedAt).toLocaleString('ko-KR')} · {task.approvedBy}</span>}</div>
              <div className="task-card-foot">
                <small>{task.status==='결과 확인'?'오너 확인을 기다리고 있습니다.':task.status==='완료'?'오너 승인이 완료되었습니다.':'현장 기록을 입력한 뒤 결과 확인을 요청하세요.'}</small>
                <div className="workflow-actions">
                  {task.status==='결정 필요'&&<button className="submit-review" disabled={savingTaskId===task.id} onClick={()=>startTask(task)}><Target size={15}/>{savingTaskId===task.id?'저장 중':'실행 시작'}</button>}
                  {task.status==='진행 중'&&<button className="submit-review" disabled={savingTaskId===task.id} onClick={()=>submitTask(task)}><CircleCheck size={15}/>{savingTaskId===task.id?'저장 중':'결과 확인 요청'}</button>}
                  {isOwner&&task.status==='결과 확인'&&<><button className="return-task" disabled={savingTaskId===task.id} onClick={()=>returnTask(task)}>보완 요청</button><button className="approve-task" disabled={savingTaskId===task.id} onClick={()=>approveTask(task)}><CircleCheck size={15}/>{savingTaskId===task.id?'저장 중':'승인·완료'}</button></>}
                  {isOwner&&<button onClick={()=>removeTask(task)} aria-label={task.title+' 삭제'}><Trash2 size={15}/>삭제</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!visibleTasks.length&&<div className="task-empty"><strong>조건에 맞는 과제가 없습니다.</strong><span>검색어나 필터를 바꿔 주세요.</span></div>}
      </section>}
      {adoptedTasks.length > 0 && (
        <section className="session-plan-board">
          <div className="section-title">
            <div>
              <h2>자료에서 채택한 확인 과제</h2>
              <span>{sessionSummary?.store} · 변경 내용이 자동 저장됩니다.</span>
            </div>
            <span className="draft-count">
              {completedTasks.length}/{adoptedTasks.length} 완료
            </span>
          </div>
          <div className="session-plan-list">
            {adoptedTasks.map((id, index) => {
              const days = sessionSummary?.daily || [];
              const size = Math.min(7, Math.floor(days.length / 2));
              const previous = size ? days.slice(-(size * 2), -size) : [];
              const current = size ? days.slice(-size) : [];
              const sum = (items: typeof days) =>
                items.reduce((total, item) => total + item.value, 0);
              const before = sum(previous);
              const now = sum(current);
              const change = before
                ? Math.round(((now - before) / before) * 100)
                : null;
              const best = sessionSummary?.weekdays.reduce((a, b) =>
                a.value >= b.value ? a : b,
              );
              const info =
                id === 'sales-flow'
                  ? {
                      title:
                        change == null
                          ? '비교 자료 범위 확보하기'
                          : change < 0
                            ? '최근 매출 하락 원인 확인하기'
                            : '매출 상승 흐름 재현하기',
                      area: '매출 흐름',
                    }
                  : id === 'strong-weekday'
                    ? {
                        title:
                          (best?.label || '강한') + '요일 운영 기준 정리하기',
                        area: '요일 운영',
                      }
                    : {
                        title:
                          sessionSummary?.totalCustomers != null ||
                          sessionSummary?.totalOrders != null
                            ? '고객·주문 효율 함께 점검하기'
                            : '고객 수 또는 주문 건수 연결하기',
                        area: '효율 점검',
                      };
              const done = completedTasks.includes(id);
              return (
                <article
                  className={
                    done ? 'session-plan-item done' : 'session-plan-item'
                  }
                  key={id}
                >
                  <div className="draft-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <span>{info.area}</span>
                    <strong>{info.title}</strong>
                    <small>
                      {done ? '확인 완료' : '오너가 채택한 확인 과제'}
                    </small>
                  </div>
                  <button
                    onClick={() =>
                      setCompletedTasks((current) =>
                        current.includes(id)
                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      )
                    }
                  >
                    {done ? '완료 취소' : '완료 표시'}
                  </button>
                </article>
              );
            })}
          </div>
          <div className="session-plan-help">
            <CircleCheck size={17} />
            <span>
              필요한 항목은 새 실행 과제로 등록해 담당자·기한·현장 기록까지 관리할 수 있습니다.
            </span>
          </div>
        </section>
      )}
      <section className="example-section">
        <button className="example-toggle" onClick={()=>setShowExamples(value=>!value)} aria-expanded={showExamples}>
          <span><b>기능 사용 예시</b><small>실제 과제가 아닌 참고 화면입니다.</small></span>
          <span>{showExamples?'예시 접기':'예시 보기'} <ChevronDown size={17}/></span>
        </button>
      {showExamples&&<><div className="filter-tabs">
        {[`참고 예시 ${exampleTasks.length}`, `결정 필요 ${exampleCounts.decision}`, `진행 중 ${exampleCounts.active}`, `결과 확인 ${exampleCounts.review}`].map((x,i)=><button disabled className={i===0?'active':''} key={x}>{x}</button>)}
      </div>
      <div className="plan-layout">
        <section className="plan-list">
          {exampleTasks.map((t, i) => (
            <button
              disabled
              className={i === 0 ? 'selected' : ''}
              key={t.title}
            >
              <span className={`status ${t.tone}`}>{t.status}</span>
              <strong>{t.title}</strong>
              <small>
                {t.store} · {t.meta}
              </small>
            </button>
          ))}
        </section>
        {exampleTask&&<section className="plan-detail">
          <div className="detail-head">
            <div>
              <span className="example-detail-tag">사용 예시</span>
              <span className="store-label">{exampleTask.store} · {exampleTask.area}</span>
              <h2>{exampleTask.title}</h2>
              <p>{exampleTask.description}</p>
            </div>
            <span className={`status ${exampleTask.tone}`}>{exampleTask.status}</span>
          </div>
          <div className="detail-metrics">
            <div>
              <span>실행 기간</span>
              <b>{exampleTask.period}</b>
            </div>
            <div>
              <span>예상 비용</span>
              <b>{exampleTask.budget}</b>
            </div>
            <div>
              <span>담당</span>
              <b>{exampleTask.owner}</b>
            </div>
          </div>
          <div className="instruction">
            <h3>오늘 현장 안내</h3>
            <p>{exampleTask.instruction}</p>
            <blockquote>“{exampleTask.quote}”</blockquote>
          </div>
          <div className="detail-actions">
            <button
              disabled
              title="위쪽의 실제 실행 과제에서 사용할 수 있습니다."
              className="secondary-button"
            >
              예시 안내문
            </button>
            <button
              disabled
              title="위쪽의 실제 실행 과제에서 기록할 수 있습니다."
              className="primary-button"
            >
              예시 현장 기록
            </button>
          </div>
        </section>}
      </div></>}
      </section>
    </div>
  );
}

function Sales({
  toast,
  sessionSummary,
  saveSessionSummary,
  salesSummaries,
  availableSummaries,
  selectedSalesMonth,
  setSelectedSalesMonth,
  adoptedTasks,
  setAdoptedTasks,
  setCompletedTasks,
  selectedStore,
  openManage,
}: {
  toast: (s: string) => void;
  sessionSummary: SessionSummary | null;
  saveSessionSummary: (summary: SessionSummary) => void;
  salesSummaries: SessionSummary[];
  availableSummaries: SessionSummary[];
  selectedSalesMonth: string;
  setSelectedSalesMonth: (value: string) => void;
  adoptedTasks: string[];
  setAdoptedTasks: React.Dispatch<React.SetStateAction<string[]>>;
  setCompletedTasks: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStore: StoreScope;
  openManage:(section?:string)=>void;
}) {
  type FileInfo = {
    name: string;
    size: string;
    kind: string;
    rows: number;
    columns: string[];
    issues: string[];
    preview: string[][];
    data: string[][];
  };
  type SalesImportHistory = {
    id: string;
    storeName: string;
    periodMonth: string;
    rowCount: number;
    sourceFilename: string;
    importedAt: string;
    status: 'approved' | 'replaced';
  };

  const [importOpen, setImportOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [mapping, setMapping] = useState({
    date: '',
    sales: '',
    customers: '',
    orders: '',
  });
  const [confirmed, setConfirmed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const [salesHistory, setSalesHistory] = useState<SalesImportHistory[]>([]);
  const [store, setStore] = useState('해율만두전골');
  const [passportStats,setPassportStats]=useState<PassportStats|null>(null);
  const [passportLoading,setPassportLoading]=useState(true);
  useEffect(() => {
    if (selectedStore !== '해율푸드 전체') setStore(selectedStore);
  }, [selectedStore]);
  const [month, setMonth] = useState('2026-08');
  const loadSalesHistory = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setSalesHistory([]); return; }
    const { data, error } = await supabase
      .from('sales_imports')
      .select('id,period_month,row_count,source_filename,imported_at,status,stores!sales_imports_store_owner_fkey(name)')
      .order('imported_at', { ascending: false })
      .limit(8);
    if (error || !data) return;
    setSalesHistory(data.map((item) => {
      const related = item.stores as unknown as { name?: string } | { name?: string }[] | null;
      const storeName = Array.isArray(related) ? related[0]?.name : related?.name;
      return {
        id: String(item.id),
        storeName: storeName || '매장',
        periodMonth: String(item.period_month),
        rowCount: Number(item.row_count),
        sourceFilename: String(item.source_filename || ''),
        importedAt: String(item.imported_at),
        status: item.status as 'approved' | 'replaced',
      };
    }));
  };
  useEffect(() => { void loadSalesHistory(); }, []);
  useEffect(()=>{let active=true;void supabase.auth.getSession().then(async({data})=>{if(!data.session){if(active)setPassportLoading(false);return}try{const response=await fetch(passportStatsUrl,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});if(response.ok&&active)setPassportStats(await response.json() as PassportStats)}finally{if(active)setPassportLoading(false)}});return()=>{active=false}},[]);
  const reset = () => {
    setFileInfo(null);
    setMapping({ date: '', sales: '', customers: '', orders: '' });
    setConfirmed(false);
    setApproved(false);
    setImportOpen(false);
  };
  const inspectFile = async (file?: File) => {
    if (!file) {
      setFileInfo(null);
      setMapping({ date: '', sales: '', customers: '', orders: '' });
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const base = {
      name: file.name,
      size:
        file.size < 1048576
          ? Math.max(1, Math.round(file.size / 1024)) + ' KB'
          : (file.size / 1048576).toFixed(1) + ' MB',
      kind: ext === 'csv' ? 'CSV' : 'Excel',
      rows: 0,
      columns: [] as string[],
      issues: [] as string[],
      preview: [] as string[][],
      data: [] as string[][],
    };
    setConfirmed(false);
    setApproved(false);
    if (file.size > 10 * 1048576) {
      setMapping({ date: '', sales: '', customers: '', orders: '' });
      setFileInfo({
        ...base,
        issues: [
          '파일이 10MB보다 큽니다. 필요한 시트만 남긴 뒤 다시 선택해 주세요.',
        ],
      });
      return;
    }
    if (ext === 'xls') {
      setMapping({ date: '', sales: '', customers: '', orders: '' });
      setFileInfo({
        ...base,
        issues: [
          '오래된 XLS 형식입니다. Excel에서 XLSX로 다시 저장한 뒤 선택해 주세요.',
        ],
      });
      return;
    }
    try {
      let columns: string[] = [];
      let data: string[][] = [];
      if (ext === 'csv') {
        const content = await readFileAsText(file);
        const lines = content
          .replace(/^\uFEFF/, '')
          .replace(/(?:\r?\n)+$/, '')
          .split(/\r?\n/);
        const parse = (line: string) =>
          line
            .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map((x) => x.trim().replace(/^"|"$/g, ''));
        columns = lines[0] ? parse(lines[0]) : [];
        data = lines.slice(1).map(parse);
      } else if (ext === 'xlsx') {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await readFileAsArrayBuffer(file));
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error('시트 없음');
        const cellText = (cell: { value: unknown; text: string }) => {
          if (cell.value instanceof Date) {
            const date = cell.value;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }
          return cell.text.trim();
        };
        const readRow = (rowNumber: number) => {
          const row = sheet.getRow(rowNumber);
          return Array.from({ length: sheet.columnCount }, (_, index) =>
            cellText(row.getCell(index + 1)),
          );
        };
        columns = readRow(1);
        data = Array.from(
          { length: Math.max(0, sheet.rowCount - 1) },
          (_, index) => readRow(index + 2),
        );
      } else {
        throw new Error('지원하지 않는 형식');
      }
      const preview = data.slice(0, 3);
      const issues: string[] = [];
      if (!columns.some((x) => /날짜|일자|date/i.test(x)))
        issues.push('날짜 열을 찾지 못했습니다.');
      if (!columns.some((x) => /매출|금액|합계|sales|amount/i.test(x)))
        issues.push('매출액 열을 찾지 못했습니다.');
      if (!data.length) issues.push('매출 데이터 행이 없습니다.');
      const pick = (pattern: RegExp) =>
        columns.find((x) => pattern.test(x)) || '';
      setMapping({
        date: pick(/날짜|일자|date/i),
        sales: pick(/매출|금액|합계|sales|amount/i),
        customers: pick(/고객|인원|객수|customer|guest/i),
        orders: pick(/주문|건수|order/i),
      });
      setFileInfo({
        ...base,
        rows: data.length,
        columns,
        preview,
        data,
        issues,
      });
    } catch {
      setMapping({ date: '', sales: '', customers: '', orders: '' });
      setFileInfo({
        ...base,
        issues: [
          ext === 'xlsx'
            ? 'Excel 파일을 읽지 못했습니다. 암호 또는 파일 손상 여부를 확인해 주세요.'
            : '파일을 읽지 못했습니다. 다른 CSV 파일을 선택해 주세요.',
        ],
      });
    }
  };
  const mappedValue = (row: string[], column: string) => {
    const index = fileInfo?.columns.indexOf(column) ?? -1;
    return index >= 0 ? row[index] || '' : '';
  };
  const numberValue = (value: string) =>
    Number(value.replace(/[^0-9.-]/g, '')) || 0;
  const showWon = (value: number) =>
    new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원';
  const assessRows = () => {
    const details: { row: number; reason: string }[] = [];
    const validData: string[][] = [];
    const seen = new Set<string>();
    let blank = 0,
      summary = 0,
      duplicates = 0,
      invalidDate = 0,
      invalidSales = 0;
    (fileInfo?.data || []).forEach((row, index) => {
      const rowNumber = index + 2;
      const normalized = row.map((x) => x.trim()).join('|');
      if (row.every((x) => !x.trim())) {
        blank++;
        details.push({ row: rowNumber, reason: '빈 행' });
        return;
      }
      if (
        row.some((x) => /^(합계|총계|소계|total|subtotal)$/i.test(x.trim()))
      ) {
        summary++;
        details.push({ row: rowNumber, reason: '합계 행' });
        return;
      }
      if (seen.has(normalized)) {
        duplicates++;
        details.push({ row: rowNumber, reason: '완전히 같은 중복 행' });
        return;
      }
      seen.add(normalized);
      const rawDate = mappedValue(row, mapping.date)
        .trim()
        .replace(/[./]/g, '-');
      if (!rawDate || Number.isNaN(new Date(rawDate).getTime())) {
        invalidDate++;
        details.push({ row: rowNumber, reason: '날짜 확인 필요' });
        return;
      }
      const rawSales = mappedValue(row, mapping.sales).trim();
      const cleaned = rawSales.replace(/[^0-9.-]/g, '');
      if (!rawSales || !cleaned || Number.isNaN(Number(cleaned))) {
        invalidSales++;
        details.push({ row: rowNumber, reason: '매출액 확인 필요' });
        return;
      }
      validData.push(row);
    });
    return {
      blank,
      summary,
      duplicates,
      invalidDate,
      invalidSales,
      usable: validData.length,
      details,
      validData,
    };
  };
  const assessment = assessRows();
  const checked =
    !!fileInfo && assessment.usable > 0 && !!mapping.date && !!mapping.sales;
  const reviewRows = assessment.validData.slice(0, 3).map((row) => {
    const date = mappedValue(row, mapping.date);
    const sales = mappedValue(row, mapping.sales);
    const customers = mapping.customers
      ? mappedValue(row, mapping.customers)
      : '';
    return { date, sales, customers, issue: '정상' };
  });
  const comparisonStores = selectedStore === '해율푸드 전체'
    ? storeOptions.slice(1)
    : [selectedStore];
  const comparisonMonth = sessionSummary?.month ?? '';
  const currentComparison = salesSummaries.filter(summary => comparisonStores.includes(summary.store as typeof comparisonStores[number]) && summary.month === comparisonMonth);
  const priorMonth = [...new Set(salesSummaries
    .filter(summary => comparisonStores.includes(summary.store as typeof comparisonStores[number]) && summary.month < comparisonMonth)
    .map(summary => summary.month))].sort((a,b) => b.localeCompare(a))[0] ?? '';
  const priorComparison = salesSummaries.filter(summary => comparisonStores.includes(summary.store as typeof comparisonStores[number]) && summary.month === priorMonth);
  const sumSales = (items: SessionSummary[]) => items.reduce((sum,item) => sum + item.totalSales, 0);
  const sumCustomers = (items: SessionSummary[]) => items.reduce((sum,item) => sum + (item.totalCustomers ?? 0), 0);
  const currentSales = sumSales(currentComparison);
  const priorSales = sumSales(priorComparison);
  const currentCustomers = sumCustomers(currentComparison);
  const priorCustomers = sumCustomers(priorComparison);
  const currentAverage = currentCustomers ? Math.round(currentSales/currentCustomers) : null;
  const priorAverage = priorCustomers ? Math.round(priorSales/priorCustomers) : null;
  const changeRate = (current:number|null, previous:number|null) => current != null && previous ? Math.round((current-previous)/previous*100) : null;
  const rateText = (rate:number|null) => rate == null ? '비교자료 없음' : `${rate >= 0 ? '+' : ''}${rate}%`;
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="매출·고객"
        title="매출과 고객 변화"
        copy="실제 등록된 자료의 기준기간을 함께 표시합니다."
        action={
          <button
            onClick={() => setImportOpen(true)}
            className="primary-button"
          >
            <Upload size={18} />
            매출 엑셀 등록
          </button>
        }
      />
      {!importOpen && (
        <section className="sales-scope-bar" aria-label="저장된 매출자료 선택">
          <div>
            <span>조회 자료</span>
            <strong>{selectedStore} · 저장된 매출자료 {availableSummaries.length}건</strong>
          </div>
          {availableSummaries.length ? (
            <select
              aria-label="조회할 매장과 기준월"
              value={sessionSummary ? `${sessionSummary.store}|${sessionSummary.month}` : selectedSalesMonth}
              onChange={event => setSelectedSalesMonth(event.target.value)}
            >
              {availableSummaries.map(summary => (
                <option key={`${summary.store}|${summary.month}`} value={`${summary.store}|${summary.month}`}>
                  {summary.store} · {summary.month}
                </option>
              ))}
            </select>
          ) : (
            <small>이 선택 범위에 등록된 매출자료가 없습니다.</small>
          )}
          <small>전체 누적 {salesSummaries.length}건</small>
        </section>
      )}
      {!importOpen && comparisonMonth && (
        <section className="sales-comparison" aria-label="매장별 월간 비교">
          <div className="section-title">
            <div><h2>{comparisonMonth} 매출 비교</h2><span>{priorMonth ? `${priorMonth} 대비 변화` : '이전 월 자료를 등록하면 증감률을 표시합니다.'}</span></div>
            <span className="comparison-range">{selectedStore}</span>
          </div>
          <div className="comparison-totals">
            <article><span>매출</span><strong>{showWon(currentSales)}</strong><small>{rateText(changeRate(currentSales,priorSales))}</small></article>
            <article><span>고객 수</span><strong>{currentCustomers ? `${currentCustomers.toLocaleString()}명` : '자료 없음'}</strong><small>{rateText(changeRate(currentCustomers||null,priorCustomers||null))}</small></article>
            <article><span>객단가</span><strong>{currentAverage ? showWon(currentAverage) : '자료 없음'}</strong><small>{rateText(changeRate(currentAverage,priorAverage))}</small></article>
          </div>
          <div className="store-comparison-grid">
            {comparisonStores.map(storeName => {
              const current = currentComparison.find(summary => summary.store === storeName);
              const previous = priorComparison.find(summary => summary.store === storeName);
              const customers = current?.totalCustomers ?? null;
              const average = current && customers ? Math.round(current.totalSales/customers) : null;
              return <article key={storeName} className={current ? '' : 'empty'}>
                <div><span>{storeName}</span><small>{comparisonMonth}</small></div>
                <strong>{current ? showWon(current.totalSales) : '자료 없음'}</strong>
                <dl><div><dt>전월 대비</dt><dd>{current ? rateText(changeRate(current.totalSales,previous?.totalSales??null)) : '—'}</dd></div><div><dt>고객 수</dt><dd>{customers!=null?`${customers.toLocaleString()}명`:'자료 없음'}</dd></div><div><dt>객단가</dt><dd>{average?showWon(average):'자료 없음'}</dd></div></dl>
              </article>;
            })}
          </div>
        </section>
      )}
      {importOpen && (
        <section className="sales-import" aria-label="매출 엑셀 등록">
          <div className="import-head">
            <div>
              <span>매출자료 등록</span>
              <h2>POS 엑셀을 확인해 반영합니다</h2>
              <p>파일 검사는 이 브라우저 안에서만 진행됩니다.</p>
            </div>
            <button aria-label="등록 화면 닫기" onClick={reset}>
              ×
            </button>
          </div>
          <div className="import-steps">
            {['파일 선택', '자료 정보 확인', '오류·중복 점검', '반영 승인'].map(
              (x, i) => (
                <div
                  className={
                    i === 0 || (fileInfo && i <= 2) || (approved && i === 3)
                      ? 'active'
                      : ''
                  }
                  key={x}
                >
                  <b>{i + 1}</b>
                  <span>{x}</span>
                </div>
              ),
            )}
          </div>
          <div className="import-form">
            <label className="file-drop">
              <Upload size={26} />
              <strong>{fileInfo?.name || 'POS 매출 파일을 선택하세요'}</strong>
              <span>
                {fileInfo
                  ? fileInfo.kind + ' · ' + fileInfo.size
                  : 'CSV와 XLSX를 이 브라우저에서 바로 검사'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => inspectFile(e.target.files?.[0])}
              />
              <small>{fileInfo ? '다른 파일 선택' : '파일 선택'}</small>
            </label>
            <div className="import-fields">
              <label>
                <span>대상 매장</span>
                <select
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                >
                  <option>해율만두전골</option>
                  <option>곤드레밥집</option>
                  <option>정담명가</option>
                </select>
              </label>
              <label>
                <span>기준월</span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </label>
            </div>
            {fileInfo && (
              <div className="inspection-result">
                <div className="inspection-summary">
                  <div>
                    <span>검사 결과</span>
                    <strong>
                      {checked
                        ? '기본 형식 확인 완료'
                        : '확인할 항목이 있습니다'}
                    </strong>
                  </div>
                  <span className={checked ? 'status green' : 'status amber'}>
                    {checked ? '검사 완료' : '확인 필요'}
                  </span>
                </div>
                <div className="inspection-stats">
                  <span>
                    자료 행{' '}
                    <b>
                      {fileInfo.rows
                        ? fileInfo.rows.toLocaleString() + '개'
                        : '확인 필요'}
                    </b>
                  </span>
                  <span>
                    열 항목{' '}
                    <b>
                      {fileInfo.columns.length
                        ? fileInfo.columns.length + '개'
                        : '연결 후 확인'}
                    </b>
                  </span>
                  <span>
                    대상{' '}
                    <b>
                      {store} · {month}
                    </b>
                  </span>
                </div>
                {fileInfo.issues.length > 0 && (
                  <ul className="issue-list">
                    {fileInfo.issues.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                {fileInfo.columns.length > 0 && (
                  <div className="column-preview">
                    <span>확인된 열</span>
                    <p>{fileInfo.columns.join(' · ')}</p>
                  </div>
                )}
              </div>
            )}
            {(fileInfo?.columns.length || 0) > 0 && (
              <section className="audit-panel">
                <div className="audit-head">
                  <div>
                    <span>전체 자료 검사</span>
                    <h3>
                      {assessment.details.length
                        ? '제외할 행을 확인했습니다'
                        : '모든 행을 사용할 수 있습니다'}
                    </h3>
                    <p>문제가 있는 행은 임시 분석에서 자동으로 제외됩니다.</p>
                  </div>
                  <span
                    className={
                      assessment.details.length
                        ? 'status amber'
                        : 'status green'
                    }
                  >
                    {assessment.usable.toLocaleString()}개 사용 가능
                  </span>
                </div>
                <div className="audit-stats">
                  <article>
                    <span>빈 행</span>
                    <strong>{assessment.blank}</strong>
                  </article>
                  <article>
                    <span>합계 행</span>
                    <strong>{assessment.summary}</strong>
                  </article>
                  <article>
                    <span>중복 행</span>
                    <strong>{assessment.duplicates}</strong>
                  </article>
                  <article>
                    <span>날짜 오류</span>
                    <strong>{assessment.invalidDate}</strong>
                  </article>
                  <article>
                    <span>매출 오류</span>
                    <strong>{assessment.invalidSales}</strong>
                  </article>
                </div>
                {assessment.details.length > 0 && (
                  <div className="audit-details">
                    {assessment.details.slice(0, 6).map((item) => (
                      <span key={`${item.row}-${item.reason}`}>
                        <b>{item.row}행</b>
                        {item.reason}
                      </span>
                    ))}
                    {assessment.details.length > 6 && (
                      <small>
                        외 {assessment.details.length - 6}개 문제 행
                      </small>
                    )}
                  </div>
                )}
              </section>
            )}
            {(fileInfo?.columns.length || 0) > 0 && (
              <section className="mapping-panel">
                <div className="mapping-head">
                  <div>
                    <span>자료 항목 연결</span>
                    <h3>POS 열을 경영실 항목에 맞춥니다</h3>
                    <p>자동 연결이 다르면 목록에서 올바른 열을 선택하세요.</p>
                  </div>
                  <span
                    className={
                      mapping.date && mapping.sales
                        ? 'status green'
                        : 'status amber'
                    }
                  >
                    {mapping.date && mapping.sales
                      ? '필수 항목 연결됨'
                      : '필수 항목 확인'}
                  </span>
                </div>
                <div className="mapping-grid">
                  {(
                    [
                      ['date', '날짜', '필수'],
                      ['sales', '매출액', '필수'],
                      ['customers', '고객 수', '선택'],
                      ['orders', '주문 건수', '선택'],
                    ] as const
                  ).map(([key, label, required]) => (
                    <label key={key}>
                      <span>
                        {label}
                        <small>{required}</small>
                      </span>
                      <select
                        value={mapping[key]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [key]: e.target.value })
                        }
                      >
                        <option value="">연결하지 않음</option>
                        {fileInfo!.columns.map((col) => (
                          <option key={col}>{col}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="mapping-note">
                  <CircleCheck size={17} />
                  <span>
                    날짜와 매출액이 연결되어야 다음 검토 단계로 이동할 수
                    있습니다.
                  </span>
                </div>
              </section>
            )}
            {checked && (
              <section className="review-panel">
                <div className="review-head">
                  <div>
                    <span>반영 전 검토</span>
                    <h3>실제 자료 일부를 먼저 확인하세요</h3>
                    <p>
                      처음 3개 행만 표시하며, 아직 경영실에 저장하지 않습니다.
                    </p>
                  </div>
                  <span
                    className={
                      reviewRows.every((x) => x.issue === '정상')
                        ? 'status green'
                        : 'status amber'
                    }
                  >
                    {reviewRows.every((x) => x.issue === '정상')
                      ? '표시 행 정상'
                      : '확인 필요'}
                  </span>
                </div>
                <div className="review-table">
                  <div className="review-row review-header">
                    <span>날짜</span>
                    <span>매출액</span>
                    <span>고객 수</span>
                    <span>검사 결과</span>
                  </div>
                  {reviewRows.map((row, i) => (
                    <div className="review-row" key={i}>
                      <span>{row.date || '—'}</span>
                      <strong>{row.sales || '—'}</strong>
                      <span>{row.customers || '연결 안 함'}</span>
                      <span
                        className={
                          row.issue === '정상'
                            ? 'review-state good'
                            : 'review-state warn'
                        }
                      >
                        {row.issue}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="review-summary">
                  <div>
                    <span>전체 자료</span>
                    <b>{assessment.usable.toLocaleString()}개 행</b>
                  </div>
                  <div>
                    <span>현재 미리보기</span>
                    <b>{reviewRows.length}개 행</b>
                  </div>
                  <div>
                    <span>저장 상태</span>
                    <b>{approved ? '승인 준비 완료' : '반영 전'}</b>
                  </div>
                </div>
              </section>
            )}
            {checked && (
              <section
                className={
                  approved ? 'approval-panel approved' : 'approval-panel'
                }
              >
                <div className="approval-title">
                  <div className="approval-icon">
                    <CircleCheck size={22} />
                  </div>
                  <div>
                    <span>오너 최종 확인</span>
                    <h3>
                      {approved
                        ? '승인 준비가 완료되었습니다'
                        : '자료 반영을 승인하시겠습니까?'}
                    </h3>
                    <p>
                      {approved
                        ? '승인한 분석 요약이 저장되었으며 로그인 상태에서는 클라우드와 자동 동기화됩니다.'
                        : '매장, 기준월, 자료 행 수와 연결 항목을 마지막으로 확인하세요.'}
                    </p>
                  </div>
                </div>
                <div className="approval-details">
                  <div>
                    <span>대상 매장</span>
                    <b>{store}</b>
                  </div>
                  <div>
                    <span>기준월</span>
                    <b>{month}</b>
                  </div>
                  <div>
                    <span>반영 예정</span>
                    <b>{assessment.usable.toLocaleString()}개 행</b>
                  </div>
                  <div>
                    <span>필수 연결</span>
                    <b>
                      {mapping.date} · {mapping.sales}
                    </b>
                  </div>
                </div>
                {!approved ? (
                  <>
                    <label className="approval-confirm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      <span>
                        검토한 자료가 선택한 매장과 기준월에 해당함을
                        확인했습니다.
                      </span>
                    </label>
                    <button
                      className="primary-button approval-button"
                      disabled={!confirmed || savingImport}
                      onClick={async () => {
                        if (!fileInfo) return;
                        const totalSales = assessment.validData.reduce(
                          (sum, row) =>
                            sum + numberValue(mappedValue(row, mapping.sales)),
                          0,
                        );
                        const totalCustomers = mapping.customers
                          ? assessment.validData.reduce(
                              (sum, row) =>
                                sum +
                                numberValue(
                                  mappedValue(row, mapping.customers),
                                ),
                              0,
                            )
                          : null;
                        const totalOrders = mapping.orders
                          ? assessment.validData.reduce(
                              (sum, row) =>
                                sum +
                                numberValue(mappedValue(row, mapping.orders)),
                              0,
                            )
                          : null;
                        const labels = [
                          '월',
                          '화',
                          '수',
                          '목',
                          '금',
                          '토',
                          '일',
                        ];
                        const totals = [0, 0, 0, 0, 0, 0, 0];
                        const dailyTotals = new Map<
                          string,
                          { value: number; customers: number; orders: number }
                        >();
                        assessment.validData.forEach((row) => {
                          const raw = mappedValue(row, mapping.date)
                            .trim()
                            .replace(/[./]/g, '-');
                          const date = new Date(raw);
                          if (!Number.isNaN(date.getTime())) {
                            const day = (date.getDay() + 6) % 7;
                            const value = numberValue(
                              mappedValue(row, mapping.sales),
                            );
                            totals[day] += value;
                            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            const current = dailyTotals.get(key) || {
                              value: 0,
                              customers: 0,
                              orders: 0,
                            };
                            dailyTotals.set(key, {
                              value: current.value + value,
                              customers:
                                current.customers +
                                (mapping.customers
                                  ? numberValue(
                                      mappedValue(row, mapping.customers),
                                    )
                                  : 0),
                              orders:
                                current.orders +
                                (mapping.orders
                                  ? numberValue(
                                      mappedValue(row, mapping.orders),
                                    )
                                  : 0),
                            });
                          }
                        });
                        const weekdays = labels.map((label, i) => ({
                          label,
                          value: totals[i],
                        }));
                        const daily = [...dailyTotals.entries()]
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([date, values]) => ({
                            date,
                            label: `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`,
                            ...values,
                          }));
                        if (daily.some((row) => !row.date.startsWith(month + '-'))) {
                          toast('선택한 기준월과 다른 날짜가 포함되어 있어 반영을 중단했습니다.');
                          return;
                        }
                        const { data: authData } = await supabase.auth.getUser();
                        if (!authData.user) {
                          toast('정식 반영을 위해 관리의 계정·보안에서 먼저 로그인해 주세요.');
                          return;
                        }
                        const storeSlugs: Record<string, string> = {
                          '해율만두전골': 'haeyul-mandu-jeongol',
                          '곤드레밥집': 'gondre-bapjip',
                          '정담명가': 'jeongdam-myeongga',
                        };
                        const safeStore = selectedStore === '해율푸드 전체' ? store : selectedStore;
                        setSavingImport(true);
                        const { error: saveError } = await supabase.rpc('save_sales_import', {
                          p_store_name: safeStore,
                          p_store_slug: storeSlugs[safeStore],
                          p_period_month: month + '-01',
                          p_source_filename: fileInfo.name,
                          p_rows: daily.map((row) => ({
                            sales_date: row.date,
                            sales_amount: row.value,
                            customer_count: mapping.customers ? row.customers : null,
                            order_count: mapping.orders ? row.orders : null,
                          })),
                        });
                        setSavingImport(false);
                        if (saveError) {
                          toast('Supabase에 매출자료를 반영하지 못했습니다. 자료와 로그인 상태를 확인해 주세요.');
                          return;
                        }
                        saveSessionSummary({
                          store: safeStore,
                          month,
                          rows: assessment.usable,
                          totalSales,
                          totalCustomers,
                          totalOrders,
                          weekdays,
                          daily,
                        });
                        setAdoptedTasks([]);
                        setCompletedTasks([]);
                        setApproved(true);
                        await loadSalesHistory();
                        toast(
                          '승인한 매출자료를 Supabase에 정식 반영했습니다.',
                        );
                      }}
                    >
                      <CircleCheck size={17} />
                      {savingImport ? '반영 중' : '반영 승인'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="approval-complete">
                      <CircleCheck size={18} />
                      <span>
                        <b>분석 자료 반영이 완료되었습니다.</b> 아래 버튼으로 이번
                        승인 결과를 확인할 수 있습니다.
                      </span>
                    </div>
                    <button
                      className="primary-button approval-button"
                      onClick={() => setImportOpen(false)}
                    >
                      <ChartNoAxesCombined size={17} />
                      승인 분석 보기
                    </button>
                  </>
                )}
              </section>
            )}
            <div className="import-checks">
              <h3>반영 전에 확인하는 항목</h3>
              <ul>
                <li>
                  <CircleCheck size={17} />
                  날짜·매출액 형식 오류
                </li>
                <li>
                  <CircleCheck size={17} />
                  같은 날짜의 중복 등록
                </li>
                <li>
                  <CircleCheck size={17} />빈 행과 합계 행 분리
                </li>
                <li>
                  <CircleCheck size={17} />
                  매장·기준월 일치 여부
                </li>
              </ul>
            </div>
          </div>
          <div className="import-footer">
            <button className="secondary-button" onClick={reset}>
              취소
            </button>
            <button
              className="primary-button"
              disabled={!fileInfo}
              onClick={() =>
                toast(
                  checked
                    ? '검사가 끝났습니다. 오너 확인 후 분석 자료로 반영할 수 있습니다.'
                    : '표시된 확인 사항을 해결한 뒤 반영할 수 있습니다.',
                )
              }
            >
              <b>{checked ? '반영 전 검토' : '검사 결과 확인'}</b>
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
      {!importOpen && (
        <>
          <div
            className={
              sessionSummary ? 'source-banner session' : 'source-banner'
            }
          >
            <Database size={19} />
            <span>
              <b>
                {sessionSummary
                  ? sessionSummary.store + ' · ' + sessionSummary.month
                  : '2026년 8월 POS 매출 엑셀'}
              </b>
              {sessionSummary && (
                <small>
                  승인된 분석 요약 · 원본 파일은 저장하지 않습니다.
                </small>
              )}
            </span>
            <button onClick={() => setImportOpen(true)}>
              {sessionSummary ? '자료 다시 선택' : '자료 등록'}
            </button>
          </div>
          {salesHistory.length > 0 && (
            <section className="sales-history">
              <div className="section-title"><div><h2>최근 매출자료 등록 이력</h2><span>승인본과 같은 기간에 교체된 이전 자료를 함께 표시합니다.</span></div></div>
              <div className="sales-history-list">
                {salesHistory.map((item) => (
                  <article key={item.id}>
                    <div><strong>{item.storeName} · {item.periodMonth.slice(0, 7)}</strong><span>{item.sourceFilename || '파일명 없음'} · {item.rowCount.toLocaleString()}일</span></div>
                    <div><span className={`status ${item.status === 'approved' ? 'green' : 'amber'}`}>{item.status === 'approved' ? '현재 승인본' : '교체됨'}</span><small>{new Date(item.importedAt).toLocaleString('ko-KR')}</small></div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className="metric-grid four">
            <article>
              <span>{sessionSummary ? '승인 매출 합계' : '8월 매출'}</span>
              <strong>
                {sessionSummary
                  ? showWon(sessionSummary.totalSales)
                  : '자료 연결 대기'}
              </strong>
              <small>
                {sessionSummary
                  ? sessionSummary.rows.toLocaleString() + '개 행 합계'
                  : '실제 엑셀 등록 후 표시'}
              </small>
            </article>
            <article>
              <span>고객 수</span>
              <strong>
                {sessionSummary?.totalCustomers != null
                  ? sessionSummary.totalCustomers.toLocaleString() + '명'
                  : '자료 연결 대기'}
              </strong>
              <small>
                {sessionSummary?.totalCustomers != null
                  ? '고객 수 열 합계'
                  : '개인정보 없이 집계'}
              </small>
            </article>
            <article>
              <span>고객 1명당 매출</span>
              <strong>
                {sessionSummary?.totalCustomers
                  ? showWon(
                      sessionSummary.totalSales / sessionSummary.totalCustomers,
                    )
                  : '자료 연결 대기'}
              </strong>
              <small>
                {sessionSummary?.totalCustomers
                  ? '매출 ÷ 고객 수'
                  : '고객 수 연결 후 계산'}
              </small>
            </article>
            <article>
              <span>주문 1건당 매출</span>
              <strong>
                {sessionSummary?.totalOrders
                  ? showWon(
                      sessionSummary.totalSales / sessionSummary.totalOrders,
                    )
                  : '자료 연결 대기'}
              </strong>
              <small>
                {sessionSummary?.totalOrders
                  ? sessionSummary.totalOrders.toLocaleString() + '건 기준'
                  : '주문 건수 연결 후 계산'}
              </small>
            </article>
          </section>
          {sessionSummary &&
            (() => {
              const days = sessionSummary.daily;
              const size = Math.min(7, Math.floor(days.length / 2));
              const previous = size ? days.slice(-(size * 2), -size) : [];
              const current = size ? days.slice(-size) : [];
              const sum = (
                items: typeof days,
                key: 'value' | 'customers' | 'orders',
              ) => items.reduce((total, item) => total + item[key], 0);
              const rate = (before: number, now: number) =>
                before ? Math.round(((now - before) / before) * 100) : null;
              const describe = (value: number | null) =>
                value == null
                  ? '비교 자료가 더 필요합니다.'
                  : value === 0
                    ? '직전 기간과 같은 수준입니다.'
                    : '직전 기간보다 ' +
                      Math.abs(value) +
                      '% ' +
                      (value > 0 ? '늘었습니다.' : '줄었습니다.');
              const salesChange = size
                ? rate(sum(previous, 'value'), sum(current, 'value'))
                : null;
              const previousCustomers = sum(previous, 'customers');
              const currentCustomers = sum(current, 'customers');
              const customerChange =
                size && previousCustomers && currentCustomers
                  ? rate(
                      sum(previous, 'value') / previousCustomers,
                      sum(current, 'value') / currentCustomers,
                    )
                  : null;
              const previousOrders = sum(previous, 'orders');
              const currentOrders = sum(current, 'orders');
              const orderChange =
                size && previousOrders && currentOrders
                  ? rate(
                      sum(previous, 'value') / previousOrders,
                      sum(current, 'value') / currentOrders,
                    )
                  : null;
              const bestWeekday = sessionSummary.weekdays.reduce(
                (best, item) => (item.value > best.value ? item : best),
                sessionSummary.weekdays[0],
              );
              const tone = (value: number | null) =>
                value == null ? 'neutral' : value >= 0 ? 'good' : 'watch';
              const signals = [
                {
                  label: '매출 흐름',
                  title: size ? '최근 ' + size + '일 매출' : '기간 비교 준비',
                  body: size
                    ? describe(salesChange)
                    : '비교할 날짜가 더 필요합니다.',
                  tone: tone(salesChange),
                },
                {
                  label: '강한 요일',
                  title: bestWeekday
                    ? bestWeekday.label + '요일'
                    : '요일 분석 준비',
                  body: bestWeekday
                    ? '매출 합계 ' +
                      showWon(bestWeekday.value) +
                      '로 가장 높습니다.'
                    : '요일 자료가 더 필요합니다.',
                  tone: 'good',
                },
                {
                  label: '고객 효율',
                  title:
                    customerChange == null
                      ? '고객 수 열 연결 필요'
                      : '고객 1명당 매출',
                  body:
                    customerChange == null
                      ? '고객 수가 있는 자료를 올리면 비교합니다.'
                      : describe(customerChange),
                  tone: tone(customerChange),
                },
                {
                  label: '주문 효율',
                  title:
                    orderChange == null
                      ? '주문 건수 열 연결 필요'
                      : '주문 1건당 매출',
                  body:
                    orderChange == null
                      ? '주문 건수가 있는 자료를 올리면 비교합니다.'
                      : describe(orderChange),
                  tone: tone(orderChange),
                },
              ];
              return (
                <section className="signal-summary">
                  <div className="section-title">
                    <div>
                      <h2>핵심 경영 신호</h2>
                      <span>
                        업로드 자료에서 바로 확인할 수 있는 변화만 정리합니다.
                      </span>
                    </div>
                    <span className="soft-tag">자동 요약</span>
                  </div>
                  <div className="signal-grid">
                    {signals.map((signal) => (
                      <article
                        className={'signal-card ' + signal.tone}
                        key={signal.label}
                      >
                        <span>{signal.label}</span>
                        <strong>{signal.title}</strong>
                        <p>{signal.body}</p>
                        <small>자료로 확인됨</small>
                      </article>
                    ))}
                  </div>
                  <p className="signal-note">
                    숫자에서 확인된 신호입니다. 행사·날씨·휴무·현장 반응을 함께
                    확인한 뒤 결정하세요.
                  </p>
                </section>
              );
            })()}
          {sessionSummary &&
            (() => {
              const days = sessionSummary.daily;
              const size = Math.min(7, Math.floor(days.length / 2));
              const previous = size ? days.slice(-(size * 2), -size) : [];
              const current = size ? days.slice(-size) : [];
              const total = (
                items: typeof days,
                key: 'value' | 'customers' | 'orders',
              ) => items.reduce((sum, item) => sum + item[key], 0);
              const salesBefore = total(previous, 'value');
              const salesNow = total(current, 'value');
              const salesChange = salesBefore
                ? Math.round(((salesNow - salesBefore) / salesBefore) * 100)
                : null;
              const best = sessionSummary.weekdays.reduce((a, b) =>
                a.value >= b.value ? a : b,
              );
              const efficiencyReady =
                sessionSummary.totalCustomers != null ||
                sessionSummary.totalOrders != null;
              const tasks = [
                {
                  id: 'sales-flow',
                  priority: '우선 확인',
                  title:
                    salesChange == null
                      ? '비교 자료 범위 확보하기'
                      : salesChange < 0
                        ? '최근 매출 하락 원인 확인하기'
                        : '매출 상승 흐름 재현하기',
                  reason:
                    salesChange == null
                      ? '직전 기간과 비교하려면 날짜별 자료가 더 필요합니다.'
                      : '최근 ' +
                        size +
                        '일 매출이 직전 기간보다 ' +
                        Math.abs(salesChange) +
                        '% ' +
                        (salesChange < 0 ? '줄었습니다.' : '늘었습니다.'),
                  action:
                    salesChange == null
                      ? '최소 2개 기간의 날짜별 매출 자료를 준비합니다.'
                      : salesChange < 0
                        ? '해당 기간의 휴무·행사·날씨·품절 기록을 대조합니다.'
                        : '잘 팔린 메뉴와 운영 조건을 확인해 다음 주에도 반복합니다.',
                  check: '현장 기록과 숫자가 함께 확인되면 완료',
                },
                {
                  id: 'strong-weekday',
                  priority: '운영 점검',
                  title: best.label + '요일 운영 기준 정리하기',
                  reason:
                    best.label +
                    '요일 매출 합계가 ' +
                    showWon(best.value) +
                    '로 가장 높습니다.',
                  action:
                    '인력 배치·재료 준비·대표 메뉴 노출이 충분했는지 확인합니다.',
                  check: '다음 ' + best.label + '요일 준비 항목 3개 확정',
                },
                {
                  id: 'efficiency',
                  priority: efficiencyReady ? '효율 점검' : '자료 보완',
                  title: efficiencyReady
                    ? '고객·주문 효율 함께 점검하기'
                    : '고객 수 또는 주문 건수 연결하기',
                  reason: efficiencyReady
                    ? '총매출과 단위당 매출을 함께 봐야 실제 변화를 구분할 수 있습니다.'
                    : '현재 자료만으로는 고객·주문 단위의 효율을 판단할 수 없습니다.',
                  action: efficiencyReady
                    ? '고객 수·주문 수 변화와 매출 변화를 같은 기간으로 비교합니다.'
                    : '다음 자료 등록 때 고객 수 또는 주문 건수 열을 선택합니다.',
                  check: efficiencyReady
                    ? '총매출과 효율 변화의 방향 확인'
                    : '효율 카드에 실제 수치가 표시되면 완료',
                },
              ];
              return (
                <section className="action-drafts">
                  <div className="section-title">
                    <div>
                      <h2>실행 과제 초안</h2>
                      <span>
                        경영 신호를 확인 행동으로 바꿨습니다. 필요한 과제만
                        채택하세요.
                      </span>
                    </div>
                    <span className="draft-count">
                      {adoptedTasks.length}/{tasks.length} 채택
                    </span>
                  </div>
                  <div className="draft-list">
                    {tasks.map((task, index) => {
                      const adopted = adoptedTasks.includes(task.id);
                      return (
                        <article
                          className={
                            adopted ? 'draft-card adopted' : 'draft-card'
                          }
                          key={task.id}
                        >
                          <div className="draft-number">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="draft-copy">
                            <span>{task.priority}</span>
                            <h3>{task.title}</h3>
                            <p>
                              <b>근거</b>
                              {task.reason}
                            </p>
                            <p>
                              <b>권장 행동</b>
                              {task.action}
                            </p>
                            <small>
                              <CircleCheck size={14} />
                              {task.check}
                            </small>
                          </div>
                          <button
                            className={
                              adopted ? 'adopt-button adopted' : 'adopt-button'
                            }
                            onClick={() => {
                              setAdoptedTasks((current) => {
                                const removing = current.includes(task.id);
                                if (removing)
                                  setCompletedTasks((done) =>
                                    done.filter((id) => id !== task.id),
                                  );
                                return removing
                                  ? current.filter((id) => id !== task.id)
                                  : [...current, task.id];
                              });
                            }}
                          >
                            {adopted ? '채택됨' : '과제 채택'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  <p className="draft-note">
                    채택 상태는 자동 저장되며 로그인한 다른 기기에서도 불러올 수 있습니다.
                  </p>
                </section>
              );
            })()}
          <div className="sales-grid">
            <section className="empty-chart">
              <div className="section-title">
                <div>
                  <h2>요일별 매출 흐름</h2>
                  <span>
                    {sessionSummary
                      ? '승인 자료를 요일별 합계로 비교합니다.'
                      : '실제 자료가 등록되면 자동으로 비교합니다.'}
                  </span>
                </div>
              </div>
              {sessionSummary ? (
                <div className="weekday-chart">
                  {sessionSummary.weekdays.map((day) => {
                    const max = Math.max(
                      ...sessionSummary.weekdays.map((x) => x.value),
                      1,
                    );
                    return (
                      <div className="weekday-bar" key={day.label}>
                        <span>{day.value ? showWon(day.value) : '0원'}</span>
                        <div>
                          <i
                            style={{
                              height:
                                Math.max(
                                  4,
                                  Math.round((day.value / max) * 100),
                                ) + '%',
                            }}
                          />
                        </div>
                        <b>{day.label}</b>
                      </div>
                    );
                  })}
                  <div className="chart-insight">
                    <Lightbulb size={17} />
                    <span>
                      {sessionSummary.weekdays.some((x) => x.value > 0) ? (
                        <>
                          <b>
                            {
                              sessionSummary.weekdays.reduce((a, b) =>
                                a.value >= b.value ? a : b,
                              ).label
                            }
                            요일
                          </b>{' '}
                          매출이 가장 높습니다.
                        </>
                      ) : (
                        '날짜 형식을 확인하면 요일별 매출을 표시할 수 있습니다.'
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="chart-placeholder">
                  <ChartNoAxesCombined size={34} />
                  <strong>아직 확정된 매출 수치가 없습니다.</strong>
                  <p>
                    CSV 또는 XLSX를 등록하면 오류와 중복을 먼저 확인한 뒤
                    반영합니다.
                  </p>
                </div>
              )}
            </section>
            <section className="customer-card">
              <span className="eyebrow">전자여권 통계</span>
              <h2>{passportLoading?'고객 통계 확인 중':'고객관계'}</h2>
              <ul>
                <li>
                  <span>신규 가입</span>
                  <b>{passportStats?`${passportStats.summary.newCustomersThisMonth.toLocaleString('ko-KR')}명`:'연결 확인 필요'}</b>
                </li>
                <li>
                  <span>재방문</span>
                  <b>{passportStats?`${passportStats.summary.repeatCustomers.toLocaleString('ko-KR')}명`:'연결 확인 필요'}</b>
                </li>
                <li>
                  <span>60일 이상 미방문</span>
                  <b>{passportStats?`${passportStats.summary.longAbsent60Days.toLocaleString('ko-KR')}명`:'연결 확인 필요'}</b>
                </li>
              </ul>
              <button
                onClick={() => openManage('전자여권 통계')}
                className="secondary-button"
              >
                {passportStats?'통계 상세 보기':'통계 연결 확인'}
              </button>
            </section>
          </div>
          {sessionSummary && (
            <section className="daily-analysis">
              <div className="section-title">
                <div>
                  <h2>일자별 매출 추이</h2>
                  <span>날짜별 합계와 전일 대비 변화를 확인합니다.</span>
                </div>
              </div>
              {sessionSummary.daily.length ? (
                <>
                  <div className="daily-bars">
                    {sessionSummary.daily.map((day, index) => {
                      const max = Math.max(
                        ...sessionSummary.daily.map((x) => x.value),
                        1,
                      );
                      const previous = index
                        ? sessionSummary.daily[index - 1].value
                        : 0;
                      const change =
                        index && previous
                          ? Math.round(
                              ((day.value - previous) / previous) * 100,
                            )
                          : null;
                      return (
                        <div className="daily-bar" key={day.date}>
                          <span>{showWon(day.value)}</span>
                          <div>
                            <i
                              style={{
                                height:
                                  Math.max(
                                    4,
                                    Math.round((day.value / max) * 100),
                                  ) + '%',
                              }}
                            />
                          </div>
                          <b>{day.label}</b>
                          <small
                            className={
                              change == null ? '' : change >= 0 ? 'up' : 'down'
                            }
                          >
                            {change == null
                              ? '첫날'
                              : `${change >= 0 ? '+' : ''}${change}%`}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                  <div className="daily-insights">
                    {(() => {
                      const high = sessionSummary.daily.reduce((a, b) =>
                        a.value >= b.value ? a : b,
                      );
                      const low = sessionSummary.daily.reduce((a, b) =>
                        a.value <= b.value ? a : b,
                      );
                      const weekend = sessionSummary.daily.filter((x) => {
                        const d = new Date(x.date).getDay();
                        return d === 0 || d === 6;
                      });
                      const weekday = sessionSummary.daily.filter((x) => {
                        const d = new Date(x.date).getDay();
                        return d !== 0 && d !== 6;
                      });
                      const average = (items: { value: number }[]) =>
                        items.length
                          ? items.reduce((sum, x) => sum + x.value, 0) /
                            items.length
                          : 0;
                      return (
                        <>
                          <article>
                            <span>최고 매출일</span>
                            <strong>
                              {high.label} · {showWon(high.value)}
                            </strong>
                          </article>
                          <article>
                            <span>최저 매출일</span>
                            <strong>
                              {low.label} · {showWon(low.value)}
                            </strong>
                          </article>
                          <article>
                            <span>주중 하루 평균</span>
                            <strong>{showWon(average(weekday))}</strong>
                          </article>
                          <article>
                            <span>주말 하루 평균</span>
                            <strong>{showWon(average(weekend))}</strong>
                          </article>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="daily-empty">
                  날짜 형식을 확인하면 일자별 추이를 표시할 수 있습니다.
                </div>
              )}
            </section>
          )}
          {sessionSummary && sessionSummary.daily.length >= 2 &&
            (() => {
              const days = sessionSummary.daily;
              const size = Math.min(7, Math.floor(days.length / 2));
              const previous = days.slice(-(size * 2), -size);
              const current = days.slice(-size);
              const sum = (items: { value: number }[]) =>
                items.reduce((total, item) => total + item.value, 0);
              const previousTotal = sum(previous);
              const currentTotal = sum(current);
              const change = previousTotal
                ? Math.round(
                    ((currentTotal - previousTotal) / previousTotal) * 100,
                  )
                : null;
              const range = (items: { label: string }[]) =>
                items.length === 1
                  ? items[0].label
                  : items[0].label + ' — ' + items[items.length - 1].label;
              const labels = ['일', '월', '화', '수', '목', '금', '토'];
              const totals = (items: { date: string; value: number }[]) => {
                const values = [0, 0, 0, 0, 0, 0, 0];
                items.forEach(
                  (item) =>
                    (values[new Date(item.date).getDay()] += item.value),
                );
                return values;
              };
              const before = totals(previous);
              const now = totals(current);
              const clues = labels.map((label, index) => ({
                label,
                delta: now[index] - before[index],
              }));
              const clue = clues.reduce((a, b) =>
                Math.abs(a.delta) >= Math.abs(b.delta) ? a : b,
              );
              const max = Math.max(previousTotal, currentTotal, 1);
              return (
                <section className="period-comparison">
                  <div className="section-title">
                    <div>
                      <h2>기간별 매출 비교</h2>
                      <span>
                        최근 {size}일과 직전 {size}일을 같은 길이로 비교합니다.
                      </span>
                    </div>
                    <span
                      className={
                        change == null
                          ? 'comparison-change'
                          : change >= 0
                            ? 'comparison-change up'
                            : 'comparison-change down'
                      }
                    >
                      {change == null
                        ? '비교 기준 없음'
                        : (change >= 0 ? '+' : '') + change + '%'}
                    </span>
                  </div>
                  <div className="period-cards">
                    <article>
                      <span>직전 기간 · {range(previous)}</span>
                      <strong>{showWon(previousTotal)}</strong>
                      <small>하루 평균 {showWon(previousTotal / size)}</small>
                      <div>
                        <i
                          style={{
                            width:
                              Math.round((previousTotal / max) * 100) + '%',
                          }}
                        />
                      </div>
                    </article>
                    <article className="current">
                      <span>최근 기간 · {range(current)}</span>
                      <strong>{showWon(currentTotal)}</strong>
                      <small>하루 평균 {showWon(currentTotal / size)}</small>
                      <div>
                        <i
                          style={{
                            width: Math.round((currentTotal / max) * 100) + '%',
                          }}
                        />
                      </div>
                    </article>
                  </div>
                  <div className="change-clue">
                    <Lightbulb size={19} />
                    <div>
                      <span>자료에서 확인된 변화 단서</span>
                      <strong>
                        {clue.delta === 0
                          ? '요일별 매출 구성에 큰 변화가 없습니다.'
                          : clue.label +
                            '요일 매출이 직전 기간보다 ' +
                            showWon(Math.abs(clue.delta)) +
                            ' ' +
                            (clue.delta > 0 ? '늘어' : '줄어') +
                            ' 가장 큰 차이를 보였습니다.'}
                      </strong>
                      <p>
                        실제 원인은 행사·날씨·휴무·현장 기록과 함께 확인해야
                        합니다.
                        {days.length < 14
                          ? ' 비교 자료가 더 쌓이면 판단이 더 정확해집니다.'
                          : ''}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })()}
          {sessionSummary && sessionSummary.daily.length >= 2 &&
            (sessionSummary.totalCustomers != null ||
              sessionSummary.totalOrders != null) &&
            (() => {
              const days = sessionSummary.daily;
              const size = Math.min(7, Math.floor(days.length / 2));
              const previous = days.slice(-(size * 2), -size);
              const current = days.slice(-size);
              const sum = (
                items: typeof days,
                key: 'value' | 'customers' | 'orders',
              ) => items.reduce((total, item) => total + item[key], 0);
              const rate = (before: number, now: number) =>
                before ? Math.round(((now - before) / before) * 100) : null;
              const customerBefore = sum(previous, 'customers')
                ? sum(previous, 'value') / sum(previous, 'customers')
                : null;
              const customerNow = sum(current, 'customers')
                ? sum(current, 'value') / sum(current, 'customers')
                : null;
              const orderBefore = sum(previous, 'orders')
                ? sum(previous, 'value') / sum(previous, 'orders')
                : null;
              const orderNow = sum(current, 'orders')
                ? sum(current, 'value') / sum(current, 'orders')
                : null;
              const efficiencyCard = (
                label: string,
                before: number | null,
                now: number | null,
              ) => {
                const change =
                  before != null && now != null ? rate(before, now) : null;
                return (
                  <article>
                    <span>{label}</span>
                    <div>
                      <small>직전</small>
                      <b>{before != null ? showWon(before) : '자료 없음'}</b>
                    </div>
                    <ArrowRight size={17} />
                    <div>
                      <small>최근</small>
                      <b>{now != null ? showWon(now) : '자료 없음'}</b>
                    </div>
                    <strong
                      className={
                        change == null ? '' : change >= 0 ? 'up' : 'down'
                      }
                    >
                      {change == null
                        ? '비교 대기'
                        : (change >= 0 ? '+' : '') + change + '%'}
                    </strong>
                  </article>
                );
              };
              return (
                <section className="efficiency-analysis">
                  <div className="section-title">
                    <div>
                      <h2>고객·주문 효율 변화</h2>
                      <span>
                        같은 기간의 고객 1명당 매출과 주문 1건당 매출을
                        비교합니다.
                      </span>
                    </div>
                  </div>
                  <div className="efficiency-cards">
                    {sessionSummary.totalCustomers != null &&
                      efficiencyCard(
                        '고객 1명당 매출',
                        customerBefore,
                        customerNow,
                      )}
                    {sessionSummary.totalOrders != null &&
                      efficiencyCard('주문 1건당 매출', orderBefore, orderNow)}
                  </div>
                  <div className="efficiency-note">
                    <CircleCheck size={17} />
                    <span>
                      수치 상승은 고객 수나 주문 수 감소로도 나타날 수 있으므로
                      총매출 변화와 함께 확인하세요.
                    </span>
                  </div>
                </section>
              );
            })()}
        </>
      )}
    </div>
  );
}

function Stages({go,executionTasks,sessionSummary,selectedStore}:{go:(v:string)=>void;executionTasks:ExecutionTask[];sessionSummary:SessionSummary|null;selectedStore:StoreScope}) {
  const [selectedStage,setSelectedStage]=useState(stages[0]);
  const active=executionTasks.filter(task=>task.status!=='완료');
  const completed=executionTasks.filter(task=>task.status==='완료');
  const covered=stages.filter(name=>executionTasks.some(task=>task.area===name)).length;
  const selectedTasks=executionTasks.filter(task=>task.area===selectedStage);
  const selectedOpen=selectedTasks.filter(task=>task.status!=='완료');
  const selectedDone=selectedTasks.filter(task=>task.status==='완료');
  const selectedGuide=diagnosisGuide[selectedStage];
  const selectedState=selectedTasks.some(task=>task.status==='결과 확인')?'결과 확인':selectedOpen.length?'실행 중':selectedDone.length?'완료':'점검 전';
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="매출성장 9단계"
        title="경영의 빈틈을 한눈에"
        copy={`${selectedStore} · 점수가 아니라 현재 문제와 실행 과제를 중심으로 봅니다.`}
        action={
          <button onClick={() => go('AI 진단')} className="primary-button">
            <Sparkles size={18} />
            종합 진단
          </button>
        }
      />
      <div className="prototype-notice compact"><span>실제 등록 기준</span><p>과제와 매출자료가 없는 단계는 임의로 양호 판정하지 않습니다.</p></div>
      <div className="stage-summary">
        <div>
          <strong>9단계 중 {covered}개</strong>
          <span>실제 과제가 등록되었습니다.</span>
        </div>
        <p>진행할 과제 {active.length}개 · 완료 과제 {completed.length}개{sessionSummary?` · ${sessionSummary.store} ${sessionSummary.month} 매출자료 확인됨`:' · 매출자료 등록 대기'}</p>
      </div>
      <section className="stages-grid">
        {stages.map((name, i) => {
          const related=executionTasks.filter(task=>task.area===name);const open=related.filter(task=>task.status!=='완료');const done=related.length-open.length;const hasResult=related.some(task=>task.status==='결과 확인');const hasSales=name==='가격·수익'&&!!sessionSummary;const state=hasResult?'결과 확인':open.length?'실행 중':done?'완료':'점검 전';const stateClass=hasResult?'result':open.length?'check':done?'good':'neutral';
          return <button key={name} className={selectedStage===name?'selected':''} onClick={() => setSelectedStage(name)} aria-pressed={selectedStage===name}>
            <span className="stage-number">{i + 1}</span>
            <div>
              <h2>{name}</h2>
              <p>{related.length?`진행 ${open.length}개 · 완료 ${done}개`:hasSales?`${sessionSummary?.month} 매출자료 확인 가능`:'확인할 사실부터 점검'}</p>
            </div>
            <span
              className={`stage-state ${stateClass}`}
            >
              {state}
            </span>
            <ArrowRight size={17} />
          </button>})}
      </section>
      <section className="stage-checklist">
        <div className="stage-checklist-head">
          <div><span>{stages.indexOf(selectedStage)+1}단계 실사용 점검표</span><h2>{selectedStage}</h2></div>
          <strong className={`stage-state ${selectedState==='완료'?'good':selectedState==='결과 확인'?'result':selectedState==='실행 중'?'check':'neutral'}`}>{selectedState}</strong>
        </div>
        <div className="stage-checklist-grid">
          <article>
            <span>1. 현재 상태</span>
            <strong>{selectedTasks.length?`등록 과제 ${selectedTasks.length}개`:'등록된 과제가 없습니다.'}</strong>
            <p>{selectedOpen.length?`진행할 과제 ${selectedOpen.length}개를 먼저 확인하세요.`:selectedDone.length?`완료 과제 ${selectedDone.length}개의 결과를 기준으로 다음 점검을 준비하세요.`:'확인된 사실을 모아 진단을 시작하세요.'}</p>
          </article>
          <article>
            <span>2. 확인할 문제</span>
            <ul>{selectedGuide.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>
          </article>
          <article>
            <span>3. 실행 과제</span>
            {selectedOpen.length?<ul>{selectedOpen.slice(0,3).map(task=><li key={task.id}><b>{task.title}</b><small>{task.store} · {task.status}</small></li>)}</ul>:<p>진행 중인 과제가 없습니다. 사실 확인 후 실행할 한 가지를 정하세요.</p>}
          </article>
          <article>
            <span>4. 결과 기록</span>
            <strong>{selectedGuide.metric}</strong>
            <p>{selectedTasks.some(task=>task.fieldNote.trim())?'현장 기록이 입력된 과제가 있습니다. 변화 여부를 확인하세요.':'과제 전·후 수치와 현장 반응을 기록하면 판단 근거가 남습니다.'}</p>
          </article>
        </div>
        <div className="stage-checklist-actions">
          <p>임의 점수 없이 확인된 사실과 과제 기록으로만 단계를 판단합니다.</p>
          <button className="secondary-button" onClick={()=>go(selectedTasks.length?'계획과 실행':'AI 진단')}>{selectedTasks.length?'과제 확인':'이 단계 진단'}<ArrowRight size={16}/></button>
        </div>
      </section>
    </div>
  );
}

function AuditLogPanel({toast}:{toast:(s:string)=>void}){
  const [logs,setLogs]=useState<AuditLog[]>([]);const [query,setQuery]=useState('');
  const load=async()=>{const {data}=await supabase.from('workspace_activity_logs').select('id,action,detail,actor,created_at').order('created_at',{ascending:false}).limit(300);if(data){setLogs(data.map(row=>({id:String(row.id),action:String(row.action),detail:String(row.detail),actor:String(row.actor),createdAt:String(row.created_at)})));return}try{setLogs(JSON.parse(window.localStorage.getItem('haeyul-audit-log-v1')||'[]') as AuditLog[])}catch{setLogs([])}};
  useEffect(()=>{const refresh=()=>void load();refresh();window.addEventListener(auditLogChangedEvent,refresh);const channel=supabase.channel('workspace-activity-log').on('postgres_changes',{event:'INSERT',schema:'public',table:'workspace_activity_logs'},refresh).subscribe();return()=>{window.removeEventListener(auditLogChangedEvent,refresh);void supabase.removeChannel(channel)}},[]);
  const visible=logs.filter(log=>!query.trim()||[log.action,log.detail,log.actor].some(value=>value.toLowerCase().includes(query.trim().toLowerCase())));
  const download=()=>{const rows=[['일시','사용자','작업','상세'],...visible.map(log=>[new Date(log.createdAt).toLocaleString('ko-KR'),log.actor,log.action,log.detail])];const csv='\uFEFF'+rows.map(row=>row.map(value=>`"${value.replaceAll('"','""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`해율_관리변경기록_${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);toast('변경 기록을 내려받았습니다.')};
  return <><ManageHead step="관리 기록" title="변경 기록" copy="과제와 주요 관리정보에서 누가 무엇을 변경했는지 확인합니다."/><div className="audit-log-tools"><label><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="작업, 상세내용, 사용자 검색"/></label><button className="secondary-button" disabled={!visible.length} onClick={download}><Download size={16}/>기록 내려받기</button></div><div className="audit-log-summary"><article><span>전체 기록</span><strong>{logs.length}건</strong></article><article><span>검색 결과</span><strong>{visible.length}건</strong></article><article><span>최근 변경</span><strong>{logs[0]?new Date(logs[0].createdAt).toLocaleDateString('ko-KR'):'없음'}</strong></article></div>{visible.length?<div className="audit-log-list">{visible.map(log=><article key={log.id}><span className="audit-log-icon"><Settings size={16}/></span><div><strong>{log.action}</strong><p>{log.detail}</p></div><div><b>{log.actor}</b><span>{new Date(log.createdAt).toLocaleString('ko-KR')}</span></div></article>)}</div>:<div className="schedule-empty"><CircleCheck size={22}/><span>표시할 변경 기록이 없습니다.</span></div>}</>;
}

function Manage({ toast, requestedSection, onSectionChange }: { toast: (s: string) => void; requestedSection:string; onSectionChange:(section:string)=>void }) {
  const [section, setSection] = useState('매장 기본정보');
  useEffect(()=>{if(requestedSection)setSection(requestedSection)},[requestedSection]);
  const [store, setStore] = useState('해율만두전골');
  const stores = ['해율만두전골', '곤드레밥집', '정담명가'];
  const initialMenus = () =>
    Object.fromEntries(
      stores.map((name) => [
        name,
        name === '해율만두전골'
          ? [
              {
                name: '해율 만두전골',
                category: '대표메뉴',
                price: '',
                status: '판매 중',
              },
              {
                name: '자연 만두강정',
                category: '보완메뉴',
                price: '',
                status: '판매 중',
              },
              {
                name: '계절 버섯 한 접시',
                category: '계절메뉴',
                price: '',
                status: '검토 중',
              },
            ]
          : [],
      ]),
    );
  const principles = [
    '무조건적인 가격할인을 우선하지 않는다.',
    '할인보다 선물·서비스·경험을 먼저 검토한다.',
    '기존 메뉴와 식재료를 최대한 활용한다.',
    '세 매장의 브랜드 메시지를 섞지 않는다.',
    '직원의 설명과 준비가 복잡하지 않아야 한다.',
    '확인된 사실과 AI 판단을 명확히 구분한다.',
  ];
  const initialStoreDrafts = () =>
    Object.fromEntries(
      stores.map((name) => [
        name,
        name === '해율만두전골' ? { name, copy:'자연진미, 해율', customers:'가족 외식 고객, 건강한 한 끼를 찾는 중장년 고객', menu:'풍미버섯전골', purpose:'가족 식사 · 건강한 외식', standard:'가격 할인보다 식재료·서비스·경험의 가치를 먼저 제안합니다.' }
        : name === '곤드레밥집' ? { name, copy:'밥이 보약이랬지. 곤드레밥집.', customers:'건강한 집밥과 편안한 한 끼를 찾는 50대 이상 고객', menu:'곤드레밥 정식', purpose:'일상 식사 · 부모님과 함께하는 식사', standard:'밥 한 그릇의 정성과 편안함이 고객에게 일관되게 전달되어야 합니다.' }
        : { name, copy:'탕 맛 좋다, 정담명가', customers:'든든한 보양식과 익숙한 탕 한 끼를 찾는 고객', menu:'남원추어탕', purpose:'일상 보양식 · 가족 식사', standard:'좋은 재료와 깊은 탕 맛을 가장 먼저 판단하고 알기 쉽게 전달합니다.' },
      ]),
    );
  const [storeDrafts, setStoreDrafts] =
    useState<
      Record<
        string,
        {
          name: string;
          copy: string;
          customers: string;
          menu: string;
          purpose: string;
          standard: string;
        }
      >
    >(initialStoreDrafts);
  const [draftSaved, setDraftSaved] = useState(false);
  const [menuDrafts, setMenuDrafts] =
    useState<
      Record<
        string,
        { name: string; category: string; price: string; status: string }[]
      >
    >(initialMenus);
  const [principleDraft, setPrincipleDraft] = useState({
    enabled: principles.map(() => true),
    custom: '',
  });
  const [lastBackup, setLastBackup] = useState('');
  const [savedGroupCount, setSavedGroupCount] = useState(0);
  const backupKeys = [
    'haeyul-analysis-workspace-v1',
    'haeyul-store-drafts-v1',
    'haeyul-menu-drafts-v1',
    'haeyul-principle-draft-v1',
    'haeyul-audit-log-v1',
  ] as const;
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('haeyul-store-drafts-v1');
      if (saved) {
        setStoreDrafts((current) => ({ ...current, ...JSON.parse(saved) }));
        setDraftSaved(true);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const menus = window.localStorage.getItem('haeyul-menu-drafts-v1');
      const rules = window.localStorage.getItem('haeyul-principle-draft-v1');
      if (menus) {
        setMenuDrafts((current) => ({ ...current, ...JSON.parse(menus) }));
        setDraftSaved(true);
      }
      if (rules) {
        setPrincipleDraft((current) => ({ ...current, ...JSON.parse(rules) }));
        setDraftSaved(true);
      }
      setLastBackup(window.localStorage.getItem('haeyul-backup-last-v1') || '');
      setSavedGroupCount(backupKeys.filter((key) => window.localStorage.getItem(key)).length);
    } catch {}
  }, []);
  const storeDraft = storeDrafts[store];
  const updateStore = (field: keyof typeof storeDraft, value: string) => {
    setDraftSaved(false);
    setStoreDrafts((current) => ({
      ...current,
      [store]: { ...current[store], [field]: value },
    }));
  };
  const saveStoreDraft = () => {
    window.localStorage.setItem(
      'haeyul-store-drafts-v1',
      JSON.stringify(storeDrafts),
    );
    window.dispatchEvent(new Event(localDataChangedEvent));
    setDraftSaved(true);
    setSavedGroupCount(backupKeys.filter((key) => window.localStorage.getItem(key)).length);
    appendAuditLog('매장 기본정보 저장',store);
    toast('매장 기본정보를 저장했습니다.');
  };
  const menuRows = menuDrafts[store] || [];
  const updateMenu = (
    index: number,
    field: 'name' | 'category' | 'price' | 'status',
    value: string,
  ) => {
    setDraftSaved(false);
    setMenuDrafts((current) => ({
      ...current,
      [store]: menuRows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));
  };
  const removeMenu = (index:number) => {
    if (!window.confirm(`“${menuRows[index].name}” 메뉴를 목록에서 삭제할까요?`)) return;
    setDraftSaved(false);
    setMenuDrafts(current=>({...current,[store]:menuRows.filter((_,i)=>i!==index)}));
  };
  const saveMenus = () => {
    window.localStorage.setItem(
      'haeyul-menu-drafts-v1',
      JSON.stringify(menuDrafts),
    );
    window.dispatchEvent(new Event(localDataChangedEvent));
    setDraftSaved(true);
    setSavedGroupCount(backupKeys.filter((key) => window.localStorage.getItem(key)).length);
    appendAuditLog('메뉴·가격 저장',`${store} · ${menuRows.length}개 메뉴`);
    toast('메뉴와 가격을 저장했습니다.');
  };
  const savePrinciples = () => {
    window.localStorage.setItem(
      'haeyul-principle-draft-v1',
      JSON.stringify(principleDraft),
    );
    window.dispatchEvent(new Event(localDataChangedEvent));
    setDraftSaved(true);
    setSavedGroupCount(backupKeys.filter((key) => window.localStorage.getItem(key)).length);
    appendAuditLog('AI 운영원칙 저장','공통 운영원칙 변경');
    toast('AI 운영원칙을 저장했습니다.');
  };
  const exportBackup = () => {
    const exportedAt = new Date().toISOString();
    const data = Object.fromEntries(
      backupKeys.map((key) => [key, window.localStorage.getItem(key)]),
    );
    const blob = new Blob(
      [JSON.stringify({ schema: 'haeyul-ai-office-backup', version: 1, exportedAt, data }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `haeyul-ai-office-backup-${exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    window.localStorage.setItem('haeyul-backup-last-v1', exportedAt);
    setLastBackup(exportedAt);
    appendAuditLog('전체 백업 저장',exportedAt);
    toast('전체 데이터를 백업 파일로 저장했습니다.');
  };
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await readFileAsText(file)) as {
        schema?: string;
        version?: number;
        data?: Record<string, unknown>;
      };
      if (backup.schema !== 'haeyul-ai-office-backup' || backup.version !== 1 || !backup.data)
        throw new Error('invalid');
      for (const key of backupKeys) {
        const value = backup.data[key];
        if (value !== null && typeof value !== 'string') throw new Error('invalid');
        if (typeof value === 'string') JSON.parse(value);
      }
      if (!window.confirm('현재 이 기기에 저장된 내용을 백업 파일의 내용으로 바꿀까요?')) return;
      for (const key of backupKeys) {
        const value = backup.data[key];
        if (typeof value === 'string') window.localStorage.setItem(key, value);
        else window.localStorage.removeItem(key);
      }
      appendAuditLog('전체 백업 복원',file.name);
      toast('백업을 복원했습니다. 화면을 새로 불러옵니다.');
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      toast('해율 AI 경영실에서 만든 올바른 백업 파일이 아닙니다.');
    }
  };
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="관리"
        title="기본정보와 지식창고"
        copy="AI가 해율푸드를 정확히 이해하는 데 필요한 기준을 준비합니다."
      />
      <div className="connection-banner">
        <div>
          <Database size={20} />
          <span>
            <b>기기 저장 사용 중</b>
            <small>
              직접 연결이 필요한 지식창고와 전자여권은 각 메뉴에서 준비 상태를 확인합니다.
            </small>
          </span>
        </div>
        <span className={`status ${draftSaved ? 'green' : 'amber'}`}>
          {draftSaved ? '입력 저장됨' : '변경사항 있음'}
        </span>
      </div>
      <div className="manage-layout">
        <aside className="manage-menu">
          {[
            [Database, '매장 기본정보'],
            [FileText, '메뉴·가격'],
            [Bot, 'AI 운영원칙'],
            [Download, '백업·복원'],
            [Upload, '해율 지식창고'],
            [Users, '전자여권 통계'],
            [Eye, '변경 기록'],
            [Settings, '계정·보안'],
          ].map(([Icon, title]) => (
            <button
              className={section === title ? 'active' : ''}
              key={String(title)}
              onClick={() => {setSection(String(title));onSectionChange(String(title))}}
            >
              <Icon size={19} />
              <span>{String(title)}</span>
              <ArrowRight size={16} />
            </button>
          ))}
        </aside>
        <section className="manage-detail">
          {section === '매장 기본정보' ? (
            <>
              <ManageHead
                step="1 / 3"
                title="매장 기본정보"
                copy="AI 진단과 실행계획에서 가장 먼저 확인하는 확정정보입니다."
              />
              <StoreTabs stores={stores} store={store} setStore={setStore} />
              <form
                className="store-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveStoreDraft();
                }}
              >
                <label>
                  <span>매장명</span>
                  <input
                    value={storeDraft.name}
                    onChange={(e) => updateStore('name', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>대표 문구</span>
                  <input
                    value={storeDraft.copy}
                    onChange={(e) => updateStore('copy', e.target.value)}
                    placeholder="매장의 대표 문구를 입력하세요"
                  />
                </label>
                <label className="wide">
                  <span>주요 고객층</span>
                  <textarea
                    value={storeDraft.customers}
                    onChange={(e) => updateStore('customers', e.target.value)}
                  />
                </label>
                <label>
                  <span>대표 메뉴</span>
                  <input
                    value={storeDraft.menu}
                    onChange={(e) => updateStore('menu', e.target.value)}
                    placeholder="대표 메뉴를 입력하세요"
                  />
                </label>
                <label>
                  <span>방문 목적</span>
                  <input
                    value={storeDraft.purpose}
                    onChange={(e) => updateStore('purpose', e.target.value)}
                  />
                </label>
                <label className="wide">
                  <span>운영 기준</span>
                  <textarea
                    value={storeDraft.standard}
                    onChange={(e) => updateStore('standard', e.target.value)}
                  />
                </label>
                <FormFooter saved={draftSaved} />
              </form>
            </>
          ) : section === '메뉴·가격' ? (
            <>
              <ManageHead
                step="2 / 3"
                title="메뉴·가격"
                copy="AI가 수익성과 실행 가능성을 판단할 때 참고할 메뉴 기준입니다."
              />
              <StoreTabs stores={stores} store={store} setStore={setStore} />
              <div className="menu-toolbar">
                <div>
                  <b>{store}</b>
                  <span>메뉴 {menuRows.length}개 · 실제 가격만 입력하세요</span>
                </div>
                <button
                  className="secondary-button"
                  onClick={() =>
                    (setDraftSaved(false),setMenuDrafts((current) => ({
                      ...current,
                      [store]: [
                        ...menuRows,
                        {
                          name: '새 메뉴',
                          category: '보완메뉴',
                          price: '',
                          status: '검토 중',
                        },
                      ],
                    })))
                  }
                >
                  <Plus size={16} />
                  메뉴 추가
                </button>
              </div>
              <div className="menu-table">
                <div className="menu-row menu-header">
                  <span>메뉴명</span>
                  <span>구분</span>
                  <span>가격</span>
                  <span>상태</span>
                  <span>삭제</span>
                </div>
                {menuRows.length ? (
                  menuRows.map((row, index) => (
                    <div className="menu-row" key={index}>
                      <label className="menu-field">
                        <span>메뉴명</span>
                        <input
                          aria-label={'메뉴 ' + (index + 1) + ' 이름'}
                          value={row.name}
                          onChange={(e) =>
                            updateMenu(index, 'name', e.target.value)
                          }
                        />
                      </label>
                      <label className="menu-field">
                        <span>구분</span>
                        <select
                          value={row.category}
                          onChange={(e) =>
                            updateMenu(index, 'category', e.target.value)
                          }
                        >
                          <option>대표메뉴</option>
                          <option>보완메뉴</option>
                          <option>계절메뉴</option>
                        </select>
                      </label>
                      <label className="menu-field">
                        <span>가격</span>
                        <input
                          aria-label={row.name + ' 가격'}
                          value={row.price}
                          onChange={(e) =>
                            updateMenu(index, 'price', e.target.value)
                          }
                          inputMode="numeric"
                          placeholder="가격 입력"
                        />
                      </label>
                      <label className="menu-field">
                        <span>상태</span>
                        <select
                          aria-label={row.name + ' 상태'}
                          value={row.status}
                          onChange={(e) =>
                            updateMenu(index, 'status', e.target.value)
                          }
                        >
                          <option>판매 중</option>
                          <option>검토 중</option>
                          <option>판매 중지</option>
                        </select>
                      </label>
                      <button className="menu-delete" type="button" aria-label={row.name+' 삭제'} onClick={()=>removeMenu(index)}><Trash2 size={17}/></button>
                    </div>
                  ))
                ) : (
                  <div className="daily-empty">
                    등록된 메뉴가 없습니다. 메뉴 추가를 눌러 입력하세요.
                  </div>
                )}
              </div>
              <div className="panel-footer">
                <div className="form-help">
                  <CircleCheck size={17} />
                  <span>입력 내용은 현재 브라우저에만 보관됩니다.</span>
                </div>
                <button className="primary-button" onClick={saveMenus}>
                  저장
                </button>
              </div>
            </>
          ) : section === 'AI 운영원칙' ? (
            <>
              <ManageHead
                step="3 / 3"
                title="AI 운영원칙"
                copy="모든 진단과 마케팅 제안에 공통으로 적용할 해율의 판단 기준입니다."
              />
              <div className="principles-list">
                {principles.map((rule, i) => (
                  <label key={rule}>
                    <input
                      type="checkbox"
                      checked={principleDraft.enabled[i] ?? true}
                      onChange={(e) =>
                        (setDraftSaved(false),setPrincipleDraft((current) => ({
                          ...current,
                          enabled: current.enabled.map((value, index) =>
                            index === i ? e.target.checked : value,
                          ),
                        })))
                      }
                    />
                    <span>
                      <b>{i + 1}</b>
                      {rule}
                    </span>
                  </label>
                ))}
              </div>
              <label className="custom-principle">
                <span>추가 경영원칙</span>
                <textarea
                  value={principleDraft.custom}
                  onChange={(e) =>
                    (setDraftSaved(false),setPrincipleDraft((current) => ({
                      ...current,
                      custom: e.target.value,
                    })))
                  }
                  placeholder="제이비님의 추가 원칙을 입력하세요."
                />
              </label>
              <div className="panel-footer">
                <div className="form-help">
                  <CircleCheck size={17} />
                  <span>
                    가격 변경·혜택·외부발송은 항상 오너 승인을 거칩니다.
                  </span>
                </div>
                <button className="primary-button" onClick={savePrinciples}>
                  저장
                </button>
              </div>
            </>
          ) : section === '백업·복원' ? (
            <>
              <ManageHead
                step="기기 데이터 보호"
                title="백업·복원"
                copy="클라우드 동기화와 별도로 전체 데이터를 파일에 보관하거나 복원합니다."
              />
              <div className="backup-summary">
                <div><span>저장된 데이터 영역</span><strong>{savedGroupCount} / {backupKeys.length}</strong><small>분석·과제, 매장, 메뉴, 운영원칙</small></div>
                <div><span>최근 백업</span><strong>{lastBackup ? new Date(lastBackup).toLocaleDateString('ko-KR') : '아직 없음'}</strong><small>{lastBackup ? new Date(lastBackup).toLocaleString('ko-KR') : '첫 백업을 만들어 주세요.'}</small></div>
              </div>
              <div className="backup-actions">
                <article>
                  <div className="backup-icon"><Download size={22}/></div>
                  <div><h3>전체 데이터 내보내기</h3><p>현재 이 브라우저에 저장된 내용을 하나의 백업 파일로 내려받습니다.</p></div>
                  <button className="primary-button" onClick={exportBackup}>백업 파일 저장</button>
                </article>
                <article>
                  <div className="backup-icon"><Upload size={22}/></div>
                  <div><h3>백업 파일 불러오기</h3><p>해율 AI 경영실에서 만든 백업 파일을 검사한 후 현재 데이터로 복원합니다.</p></div>
                  <label className="secondary-button backup-file">백업 파일 선택<input type="file" accept="application/json,.json" onChange={(event)=>{void importBackup(event.target.files?.[0]);event.currentTarget.value=''}}/></label>
                </article>
              </div>
              <div className="backup-warning"><CircleCheck size={18}/><span>복원 전 확인창이 표시됩니다. 백업 파일은 직접 보관해야 하며 서버로 전송되지 않습니다.</span></div>
            </>
          ) : section === '해율 지식창고' ? (
            <KnowledgePanel toast={toast} />
          ) : section === '전자여권 통계' ? (
            <PassportPanel toast={toast} />
          ) : section === '변경 기록' ? (
            <AuditLogPanel toast={toast}/>
          ) : (
            <AccountSecurity toast={toast} />
          )}
        </section>
      </div>
      <div className="principle-card">
        <div>
          <span>오너 전용 보호</span>
          <h2>현재 홈페이지는 비공개로 게시되어 있습니다.</h2>
          <p>
            허용된 계정만 접속할 수 있으며, Supabase 연결 후에도 모든 저장자료에
            사용자별 접근규칙을 적용합니다.
          </p>
        </div>
        <span className="status green">보호 중</span>
      </div>
    </div>
  );
}

type KnowledgeDocument = {
  id: string;
  store_scope: string;
  category: string;
  title: string;
  source_date: string | null;
  object_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};
function KnowledgePanel({ toast }: { toast: (s: string) => void }) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [storeScope, setStoreScope] = useState('해율푸드 전체');
  const [category, setCategory] = useState('브랜드');
  const [sourceDate, setSourceDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [query, setQuery] = useState('');
  const [filterStore, setFilterStore] = useState('전체 매장');
  const [filterCategory, setFilterCategory] = useState('전체 종류');
  const [preview, setPreview] = useState<{document:KnowledgeDocument;kind:'image'|'pdf'|'text';url?:string;text?:string}|null>(null);
  const previewUrlRef = useRef('');
  const mimeByExtension: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv', txt: 'text/plain', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
  };
  const loadDocuments = async () => {
    const { data: authData } = await supabase.auth.getUser();
    setLoggedIn(!!authData.user);
    if (!authData.user) { setDocuments([]); return; }
    const { data, error } = await supabase.from('knowledge_documents').select('*').order('created_at', { ascending: false });
    if (!error && data) setDocuments(data as KnowledgeDocument[]);
  };
  useEffect(() => { void loadDocuments(); }, []);
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);
  const selectFile = (selected?: File) => {
    if (!selected) return;
    const extension = selected.name.split('.').pop()?.toLowerCase() || '';
    if (!mimeByExtension[extension]) { toast('PDF, DOCX, XLSX, CSV, TXT, JPG, PNG, WEBP 파일만 등록할 수 있습니다.'); return; }
    if (selected.size > 10 * 1024 * 1024) { toast('파일은 10MB 이하만 등록할 수 있습니다.'); return; }
    setFile(selected);
    if (!title.trim()) setTitle(selected.name.replace(/\.[^.]+$/, '').slice(0, 200));
  };
  const uploadDocument = async () => {
    if (!file || !title.trim() || busy) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { toast('관리의 계정·보안에서 먼저 로그인해 주세요.'); return; }
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = mimeByExtension[extension];
    if (!mimeType) { toast('지원하지 않는 파일 형식입니다.'); return; }
    const objectPath = `${authData.user.id}/${createId()}.${extension}`;
    setBusy(true);
    const { error: uploadError } = await supabase.storage.from('haeyul-knowledge').upload(objectPath, file, { contentType: mimeType, upsert: false });
    if (uploadError) { setBusy(false); toast('파일을 업로드하지 못했습니다. 로그인과 파일 형식을 확인해 주세요.'); return; }
    const { error: metadataError } = await supabase.from('knowledge_documents').insert({
      owner_id: authData.user.id,
      store_scope: storeScope,
      category,
      title: title.trim(),
      source_date: sourceDate || null,
      object_path: objectPath,
      original_filename: file.name.slice(0, 255),
      mime_type: mimeType,
      size_bytes: file.size,
    });
    if (metadataError) {
      await supabase.storage.from('haeyul-knowledge').remove([objectPath]);
      setBusy(false);
      toast('문서 정보를 저장하지 못해 업로드를 취소했습니다.');
      return;
    }
    setFile(null); setTitle(''); setSourceDate(''); setBusy(false);
    await loadDocuments();
    toast('문서를 해율 지식창고에 등록했습니다.');
  };
  const downloadDocument = async (document: KnowledgeDocument) => {
    const { data, error } = await supabase.storage.from('haeyul-knowledge').download(document.object_path);
    if (error || !data) { toast('문서를 내려받지 못했습니다.'); return; }
    const url = URL.createObjectURL(data);
    const link = window.document.createElement('a');
    link.href = url; link.download = document.original_filename; link.click();
    URL.revokeObjectURL(url);
  };
  const closePreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreview(null);
  };
  const previewDocument = async (document: KnowledgeDocument) => {
    const isImage = document.mime_type.startsWith('image/');
    const isPdf = document.mime_type === 'application/pdf';
    const isText = document.mime_type.startsWith('text/') || /\.(txt|csv)$/i.test(document.original_filename);
    if (!isImage && !isPdf && !isText) {
      toast('Word와 Excel 파일은 미리보기를 지원하지 않습니다. 받기 버튼으로 확인해 주세요.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.storage.from('haeyul-knowledge').download(document.object_path);
    setBusy(false);
    if (error || !data) { toast('미리보기 파일을 불러오지 못했습니다.'); return; }
    closePreview();
    if (isText) {
      const text = (await data.text()).slice(0, 50000);
      setPreview({document,kind:'text',text});
      return;
    }
    const url = URL.createObjectURL(data);
    previewUrlRef.current = url;
    setPreview({document,kind:isImage?'image':'pdf',url});
  };
  const deleteDocument = async (document: KnowledgeDocument) => {
    if (!window.confirm(`“${document.title}” 문서를 삭제할까요? 삭제 후에는 백업 없이 복구할 수 없습니다.`)) return;
    setBusy(true);
    const { error: fileError } = await supabase.storage.from('haeyul-knowledge').remove([document.object_path]);
    if (fileError) { setBusy(false); toast('문서 파일을 삭제하지 못했습니다.'); return; }
    const { error } = await supabase.from('knowledge_documents').delete().eq('id', document.id);
    setBusy(false);
    if (error) { toast('문서 목록을 정리하지 못했습니다.'); return; }
    await loadDocuments();
    toast('지식창고에서 문서를 삭제했습니다.');
  };
  const cleanQuery = query.trim().toLowerCase();
  const filteredDocuments = documents.filter(document => {
    const matchesQuery = !cleanQuery || [document.title,document.original_filename].some(value => value.toLowerCase().includes(cleanQuery));
    const matchesStore = filterStore === '전체 매장' || document.store_scope === filterStore || document.store_scope === '해율푸드 전체';
    const matchesCategory = filterCategory === '전체 종류' || document.category === filterCategory;
    return matchesQuery && matchesStore && matchesCategory;
  });
  return <>
    <ManageHead step="자료 저장" title="해율 지식창고" copy="브랜드·레시피·직원규칙·운영문서를 비공개로 저장하고 AI 참고 범위를 분류합니다." />
    {!loggedIn && <div className="knowledge-login"><CircleCheck size={18}/><span>문서를 등록하려면 먼저 계정·보안에서 Supabase에 로그인해 주세요.</span></div>}
    <div className="knowledge-upload-form">
      <label className="upload-zone">
        <Upload size={28}/><strong>{file ? file.name : '문서를 선택하세요'}</strong>
        <span>PDF, Word, Excel, CSV, 텍스트, 이미지 · 파일당 최대 10MB</span>
        <input type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp" onChange={event => { selectFile(event.target.files?.[0]); event.currentTarget.value=''; }}/>
        <small>{file ? '다른 파일 선택' : '파일 선택'}</small>
      </label>
      <div className="knowledge-fields">
        <label className="wide"><span>자료 이름</span><input value={title} maxLength={200} onChange={event=>setTitle(event.target.value)} placeholder="예: 해율 브랜드 에센스"/></label>
        <label><span>대상 매장</span><select value={storeScope} onChange={event=>setStoreScope(event.target.value)}><option>해율푸드 전체</option><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label>
        <label><span>자료 종류</span><select value={category} onChange={event=>setCategory(event.target.value)}><option>브랜드</option><option>레시피</option><option>직원규칙</option><option>운영문서</option><option>기타</option></select></label>
        <label><span>기준일</span><input type="date" value={sourceDate} onChange={event=>setSourceDate(event.target.value)}/></label>
      </div>
      <button className="primary-button knowledge-submit" disabled={!loggedIn || !file || !title.trim() || busy} onClick={uploadDocument}>{busy ? '처리 중' : '지식창고에 등록'}</button>
    </div>
    <div className="knowledge-section">
      <div className="section-title"><div><h2>등록된 자료</h2><span>파일은 비공개이며 로그인한 소유자만 열 수 있습니다.</span></div><strong>{filteredDocuments.length} / {documents.length}개</strong></div>
      <div className="knowledge-tools">
        <label><span>자료 검색</span><div><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="자료명 또는 파일명 검색"/></div></label>
        <label><span>매장</span><select value={filterStore} onChange={event=>setFilterStore(event.target.value)}><option>전체 매장</option><option>해율푸드 전체</option><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label>
        <label><span>자료 종류</span><select value={filterCategory} onChange={event=>setFilterCategory(event.target.value)}><option>전체 종류</option><option>브랜드</option><option>레시피</option><option>직원규칙</option><option>운영문서</option><option>기타</option></select></label>
      </div>
      {filteredDocuments.length ? filteredDocuments.map(document => <div className="knowledge-row" key={document.id}>
        <div className="summary-icon green"><FileText size={19}/></div>
        <div><strong>{document.title}</strong><span>{document.store_scope} · {document.category}{document.source_date ? ` · ${document.source_date}` : ''}<br/>{document.original_filename} · {Math.max(1, Math.round(document.size_bytes/1024)).toLocaleString()} KB</span></div>
        <div className="knowledge-actions"><button className="secondary-button" disabled={busy} onClick={()=>void previewDocument(document)}><Eye size={15}/>미리보기</button><button className="secondary-button" disabled={busy} onClick={()=>void downloadDocument(document)}><Download size={15}/>받기</button><button className="knowledge-delete" disabled={busy} onClick={()=>void deleteDocument(document)}><Trash2 size={15}/>삭제</button></div>
      </div>) : <div className="task-empty"><strong>{documents.length?'검색 조건에 맞는 자료가 없습니다.':'등록된 지식자료가 없습니다.'}</strong><span>{documents.length?'검색어나 필터를 바꿔 주세요.':'브랜드 기준이나 운영문서부터 한 개씩 등록해 주세요.'}</span></div>}
    </div>
    {preview&&<div className="knowledge-preview-backdrop" role="dialog" aria-modal="true" aria-label={preview.document.title+' 미리보기'} onMouseDown={event=>{if(event.target===event.currentTarget)closePreview()}}><section className="knowledge-preview"><header><div><span>{preview.document.store_scope} · {preview.document.category}</span><h2>{preview.document.title}</h2><small>{preview.document.original_filename}</small></div><button onClick={closePreview} aria-label="미리보기 닫기"><X size={22}/></button></header><div className="knowledge-preview-body">{preview.kind==='image'?<img src={preview.url} alt={preview.document.title}/>:preview.kind==='pdf'?<iframe src={preview.url} title={preview.document.title}/>:<pre>{preview.text||'내용이 없습니다.'}</pre>}</div><footer><button className="secondary-button" onClick={closePreview}>닫기</button><button className="primary-button" onClick={()=>void downloadDocument(preview.document)}><Download size={16}/>파일 받기</button></footer></section></div>}
  </>;
}
function ManageHead({
  step,
  title,
  copy,
}: {
  step: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="manage-detail-head">
      <div>
        <span>{step}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <CircleCheck size={26} />
    </div>
  );
}
function StoreTabs({
  stores,
  store,
  setStore,
}: {
  stores: string[];
  store: string;
  setStore: (v: string) => void;
}) {
  return (
    <div className="store-tabs">
      {stores.map((name) => (
        <button
          type="button"
          className={store === name ? 'active' : ''}
          onClick={() => setStore(name)}
          key={name}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
function FormFooter({ saved }: { saved: boolean }) {
  return (
    <>
      <div className="form-help">
        <CircleCheck size={17} />
        <span>
          {saved
            ? '이 기기에 저장되며 로그인 상태에서는 클라우드와 자동 동기화됩니다.'
            : '입력 후 안전하게 저장할 수 있습니다.'}
        </span>
      </div>
      <button className="primary-button" type="submit">
        저장
      </button>
    </>
  );
}

function PassportPanel({ toast }: { toast: (s: string) => void }) {
  const [stats,setStats]=useState<PassportStats|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const loadStats=async()=>{
    setLoading(true);setError('');
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setLoading(false);setError('먼저 관리의 계정·보안에서 로그인해 주세요.');return}
    try{
      const response=await fetch(passportStatsUrl,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
      if(!response.ok)throw new Error(response.status===401?'로그인 권한을 확인해 주세요.':'전자여권 통계를 불러오지 못했습니다.');
      setStats(await response.json() as PassportStats);
    }catch(cause){setError(cause instanceof Error?cause.message:'전자여권 통계를 불러오지 못했습니다.')}finally{setLoading(false)}
  };
  useEffect(()=>{void loadStats()},[]);
  const summary=stats?.summary;
  const giftRate=summary&&summary.rewardsIssuedThisMonth>0?`${Math.round(summary.rewardsUsedThisMonth/summary.rewardsIssuedThisMonth*100)}%`:'자료 없음';
  const metrics = [
    ['전체 가입자',summary?`${summary.totalCustomers.toLocaleString('ko-KR')}명`:'—'],
    ['이번 달 신규',summary?`${summary.newCustomersThisMonth.toLocaleString('ko-KR')}명`:'—'],
    ['재방문 고객',summary?`${summary.repeatCustomers.toLocaleString('ko-KR')}명`:'—'],
    ['VIP 고객',summary?`${summary.vipCount.toLocaleString('ko-KR')}명`:'—'],
    ['60일 이상 미방문',summary?`${summary.longAbsent60Days.toLocaleString('ko-KR')}명`:'—'],
    ['이번 달 선물 사용률',giftRate],
  ];
  return (
    <>
      <ManageHead
        step="외부 연결 준비"
        title="전자여권 통계"
        copy="현재 운영 중인 전자여권에서 개인정보 없이 집계된 통계만 가져옵니다."
      />
      <div className="passport-status">
        <div className="passport-status-head">
          <div className="summary-icon amber">
            <Users size={21} />
          </div>
          <div>
            <span>현재 상태</span>
            <h3>{loading?'전자여권 통계 확인 중':stats?'전자여권 연결됨':'전자여권 연결 확인 필요'}</h3>
            <p>{error||'기존 전자여권 자료를 변경하지 않고 집계 통계만 읽습니다.'}</p>
          </div>
          <span className={`status ${stats?'green':'amber'}`}>{loading?'확인 중':stats?'연결됨':'확인 필요'}</span>
        </div>
        <dl>
          <div>
            <dt>연결 방식</dt>
            <dd>보호된 통계 API</dd>
          </div>
          <div>
            <dt>권장 순서</dt>
            <dd>오너 로그인 · 읽기 전용</dd>
          </div>
          <div>
            <dt>마지막 동기화</dt>
            <dd>{stats?new Date(stats.generatedAt).toLocaleString('ko-KR'):'—'}</dd>
          </div>
        </dl>
        <div className="passport-actions">
          <button
            className="secondary-button"
            disabled={loading}
            onClick={()=>void loadStats().then(()=>toast('전자여권 통계 연결을 다시 확인했습니다.'))}
          >
            통계 새로고침
          </button>
          <button
            className="primary-button"
            onClick={() =>
              toast('엑셀 가져오기는 안전한 저장공간 연결 후 활성화됩니다.')
            }
          >
            <Upload size={17} />
            엑셀로 가져오기
          </button>
        </div>
      </div>
      <div className="passport-metrics">
        {metrics.map((label) => (
          <article className="passport-metric" key={label[0]}>
            <span>{label[0]}</span>
            <strong>{loading?'확인 중':label[1]}</strong>
            <small>{stats?'전자여권 집계 기준':'집계 통계만 사용'}</small>
          </article>
        ))}
      </div>
      <div className="privacy-card">
        <div>
          <CircleCheck size={20} />
          <span>
            <strong>개인정보는 가져오지 않습니다.</strong>
            <small>
              이름·전화번호·생년월일·개인별 상세 방문기록은 이 경영실에 저장하지
              않습니다.
            </small>
          </span>
        </div>
        <span className="status green">집계 전용</span>
      </div>
      <div className="connect-checklist">
        <h3>연결 전에 확인할 정보</h3>
        <ol>
          <li>
            <b>1</b>
            <span>
              <strong>전자여권 운영업체 또는 시스템 이름</strong>
              <small>누가 운영하고 있는지 확인합니다.</small>
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>API 제공 여부</strong>
              <small>가능하면 자동으로 집계 통계만 읽습니다.</small>
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              <strong>CSV·엑셀 내보내기 가능 여부</strong>
              <small>API가 없을 때 안전한 임시 연결 방식으로 사용합니다.</small>
            </span>
          </li>
        </ol>
      </div>
    </>
  );
}

function AccountSecurity({ toast }: { toast: (s: string) => void }) {
  const [user,setUser]=useState<User|null>(null);
  const [email,setEmail]=useState('');
  const [authBusy,setAuthBusy]=useState(false);
  const [syncBusy,setSyncBusy]=useState(false);
  const [cloudUpdatedAt,setCloudUpdatedAt]=useState('');
  const [autoSyncState,setAutoSyncState]=useState<CloudSyncState>('checking');
  const [members,setMembers]=useState<WorkspaceMember[]>([]);
  const [memberBusy,setMemberBusy]=useState(false);
  const [showMemberForm,setShowMemberForm]=useState(false);
  const [memberDraft,setMemberDraft]=useState({email:'',displayName:'',role:'staff' as 'manager'|'staff',storeScope:'해율만두전골' as StoreScope});
  useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setUser(data.user)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(active)setUser(session?.user??null)});return()=>{active=false;subscription.unsubscribe()}},[]);
  useEffect(()=>{if(!user){setCloudUpdatedAt('');return}void supabase.from('workspace_snapshots').select('updated_at').eq('user_id',user.id).maybeSingle().then(({data})=>setCloudUpdatedAt(data?.updated_at||''))},[user]);
  const loadMembers=async()=>{if(!user){setMembers([]);return}const {data,error}=await supabase.from('workspace_members').select('id,owner_id,user_id,email,display_name,role,store_scope,is_active,created_at').order('created_at');if(error){toast('계정 목록을 불러오지 못했습니다.');return}setMembers((data||[]) as WorkspaceMember[])};
  useEffect(()=>{void loadMembers()},[user]);
  useEffect(()=>{try{const saved=JSON.parse(window.localStorage.getItem(cloudSyncStateKey)||'null') as {state?:CloudSyncState;updatedAt?:string}|null;if(saved?.state)setAutoSyncState(saved.state);if(saved?.updatedAt)setCloudUpdatedAt(saved.updatedAt)}catch{}const onStatus=(event:Event)=>{const detail=(event as CustomEvent<{state:CloudSyncState;updatedAt:string}>).detail;setAutoSyncState(detail.state);if(detail.updatedAt)setCloudUpdatedAt(detail.updatedAt)};window.addEventListener(cloudSyncStatusEvent,onStatus);return()=>window.removeEventListener(cloudSyncStatusEvent,onStatus)},[]);
  const sendLoginLink=async()=>{const clean=email.trim();if(!clean)return;setAuthBusy(true);const {error}=await supabase.auth.signInWithOtp({email:clean,options:{emailRedirectTo:window.location.origin,shouldCreateUser:true}});setAuthBusy(false);toast(error?'로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.':'로그인 링크를 이메일로 보냈습니다. 메일에서 링크를 눌러 주세요.')};
  const saveToCloud=async()=>{if(!user)return;setSyncBusy(true);const updatedAt=new Date().toISOString();const {data,error}=await supabase.from('workspace_snapshots').upsert({user_id:user.id,payload:readLocalCloudPayload(),schema_version:1,updated_at:updatedAt},{onConflict:'user_id'}).select('updated_at').single();setSyncBusy(false);if(error){toast('클라우드 저장에 실패했습니다. 다시 시도해 주세요.');return}setCloudUpdatedAt(data.updated_at);window.dispatchEvent(new Event(cloudSyncRefreshEvent));toast('이 기기의 데이터를 Supabase에 저장했습니다.')};
  const loadFromCloud=async()=>{if(!user)return;setSyncBusy(true);const {data,error}=await supabase.from('workspace_snapshots').select('payload,updated_at').eq('user_id',user.id).maybeSingle();setSyncBusy(false);if(error){toast('클라우드 데이터를 불러오지 못했습니다.');return}if(!data){toast('이 계정에 저장된 클라우드 데이터가 없습니다.');return}if(!window.confirm('현재 이 기기의 내용을 클라우드에 저장된 내용으로 바꿀까요?'))return;try{const payload=data.payload as Record<string,unknown>;for(const key of cloudStorageKeys){const value=payload?.[key];if(value!==null&&typeof value!=='string')throw new Error('invalid');if(typeof value==='string')JSON.parse(value)}for(const key of cloudStorageKeys){const value=payload[key];if(typeof value==='string')window.localStorage.setItem(key,value);else window.localStorage.removeItem(key)}publishCloudSyncState('synced',data.updated_at);toast('클라우드 데이터를 불러왔습니다. 화면을 새로 엽니다.');window.setTimeout(()=>window.location.reload(),700)}catch{toast('클라우드 데이터 형식이 올바르지 않아 복원을 중단했습니다.')}};
  const signOut=async()=>{await supabase.auth.signOut();setUser(null);setMembers([]);toast('Supabase 계정에서 로그아웃했습니다.')};
  const addMember=async()=>{if(!user||!memberDraft.email.trim()||!memberDraft.displayName.trim())return;setMemberBusy(true);const {error}=await supabase.from('workspace_members').insert({owner_id:user.id,email:memberDraft.email.trim().toLowerCase(),display_name:memberDraft.displayName.trim(),role:memberDraft.role,store_scope:memberDraft.storeScope,created_by:user.id});setMemberBusy(false);if(error){toast(error.code==='23505'?'이미 등록된 이메일입니다.':'직원 계정을 등록하지 못했습니다.');return}setMemberDraft({email:'',displayName:'',role:'staff',storeScope:'해율만두전골'});setShowMemberForm(false);await loadMembers();toast('직원 계정을 등록했습니다. 해당 이메일로 로그인하면 자동 연결됩니다.')};
  const updateMember=async(member:WorkspaceMember,changes:Partial<WorkspaceMember>)=>{if(member.role==='owner')return;setMemberBusy(true);const {error}=await supabase.from('workspace_members').update(changes).eq('id',member.id);setMemberBusy(false);if(error){toast('계정 권한을 변경하지 못했습니다.');return}await loadMembers();toast('계정 권한을 변경했습니다.')};
  const removeMember=async(member:WorkspaceMember)=>{if(member.role==='owner'||!window.confirm(`“${member.display_name}” 계정을 삭제할까요?`))return;setMemberBusy(true);const {error}=await supabase.from('workspace_members').delete().eq('id',member.id);setMemberBusy(false);if(error){toast('계정을 삭제하지 못했습니다.');return}await loadMembers();toast('직원 계정을 삭제했습니다.')};
  const roleLabel=(role:WorkspaceMember['role'])=>role==='owner'?'오너':role==='manager'?'매장 책임자':'직원';
  return (
    <>
      <ManageHead
        step="보안 기준"
        title="계정·보안"
        copy="누가 어떤 정보를 볼 수 있는지 역할별로 제한합니다."
      />
      <section className="cloud-account">
        <div className="cloud-account-head"><div><span>Supabase 사용자 저장</span><h3>{user?'클라우드 연결됨':'이메일로 연결하기'}</h3><p>{user?`${user.email||'확인된 계정'} · 사용자별 보호 적용`:'로그인 링크를 받을 이메일을 입력하세요.'}</p></div><span className={`status ${user?'green':'amber'}`}>{user?'연결됨':'로그인 필요'}</span></div>
        {!user?<div className="cloud-login"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일 주소" aria-label="Supabase 로그인 이메일"/><button className="primary-button" disabled={!email.trim()||authBusy} onClick={sendLoginLink}>{authBusy?'보내는 중':'로그인 링크 보내기'}</button></div>:<><div className={`cloud-sync-state ${autoSyncState}`}><span>{autoSyncState==='synced'?'자동 저장 중':autoSyncState==='saving'?'클라우드에 저장 중':autoSyncState==='conflict'?'저장 방향 선택 필요':autoSyncState==='error'?'연결 확인 필요':'클라우드 확인 중'}</span><small>{autoSyncState==='conflict'?'다른 기기 자료와 차이가 있습니다. 아래에서 보관할 쪽을 선택하세요.':'변경 내용은 안전 확인 후 자동으로 저장됩니다.'}</small></div><div className="cloud-sync-actions"><button className="primary-button" disabled={syncBusy} onClick={saveToCloud}><Upload size={17}/>{syncBusy?'처리 중':'이 기기 자료 저장'}</button><button className="secondary-button" disabled={syncBusy} onClick={loadFromCloud}><Download size={17}/>클라우드 자료 불러오기</button><button className="cloud-signout" onClick={signOut}>로그아웃</button></div><small className="cloud-updated">{cloudUpdatedAt?`마지막 클라우드 저장 ${new Date(cloudUpdatedAt).toLocaleString('ko-KR')}`:'아직 클라우드에 저장된 자료가 없습니다.'}</small></>}
        <div className="cloud-guide"><CircleCheck size={17}/><span>같은 자료가 확인되면 이후 변경은 자동 저장됩니다. 차이가 생기면 자동 저장을 멈추고 ‘이 기기 자료 저장’ 또는 ‘클라우드 자료 불러오기’를 선택하게 합니다.</span></div>
      </section>
      <div className="security-overview">
        <div className="security-lock">
          <div className="summary-icon green">
            <Settings size={22} />
          </div>
          <div>
            <span>현재 접속 방식</span>
            <h3>오너 전용 비공개 접속</h3>
            <p>허용된 해율 오너 계정만 홈페이지를 열 수 있습니다.</p>
          </div>
        </div>
        <span className="status green">보호 중</span>
      </div>
      <div className="security-facts">
        <article>
          <span>현재 권한</span>
          <strong>오너</strong>
          <small>전체 보기 및 승인</small>
        </article>
        <article>
          <span>직원 계정</span>
          <strong>{members.filter(member=>member.role!=='owner').length}명</strong>
          <small>등록된 책임자·직원</small>
        </article>
        <article>
          <span>외부 공개</span>
          <strong>비공개</strong>
          <small>검색·일반 접속 차단</small>
        </article>
      </div>
      <section className="role-section">
        <div className="section-title">
          <div>
            <h2>역할별 접근 기준</h2>
            <span>직원 계정은 실제 운영 범위를 확인한 뒤 추가합니다.</span>
          </div>
        </div>
        {showMemberForm&&<div className="member-create"><label><span>이름</span><input value={memberDraft.displayName} onChange={event=>setMemberDraft({...memberDraft,displayName:event.target.value})} placeholder="예: 해율 점장"/></label><label><span>이메일</span><input type="email" value={memberDraft.email} onChange={event=>setMemberDraft({...memberDraft,email:event.target.value})} placeholder="로그인에 사용할 이메일"/></label><label><span>역할</span><select value={memberDraft.role} onChange={event=>setMemberDraft({...memberDraft,role:event.target.value as 'manager'|'staff'})}><option value="manager">매장 책임자</option><option value="staff">직원</option></select></label><label><span>담당 매장</span><select value={memberDraft.storeScope} onChange={event=>setMemberDraft({...memberDraft,storeScope:event.target.value as StoreScope})}><option>해율푸드 전체</option><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label><div><button className="secondary-button" onClick={()=>setShowMemberForm(false)}>취소</button><button className="primary-button" disabled={memberBusy||!memberDraft.email.trim()||!memberDraft.displayName.trim()} onClick={()=>void addMember()}>{memberBusy?'등록 중':'계정 등록'}</button></div></div>}
        <div className="role-table">
          {members.map(member => (
            <div className="role-row member-row" key={member.id}>
              <div className="role-badge">{member.display_name.slice(0, 1)||'직'}</div>
              <div>
                <strong>{member.display_name||roleLabel(member.role)}</strong>
                <span>{member.email} · {member.user_id?'로그인 연결됨':'첫 로그인 대기'}</span>
              </div>
              <select aria-label={member.display_name+' 역할'} value={member.role} disabled={member.role==='owner'||memberBusy} onChange={event=>void updateMember(member,{role:event.target.value as WorkspaceMember['role']})}><option value="owner">오너</option><option value="manager">매장 책임자</option><option value="staff">직원</option></select>
              <select aria-label={member.display_name+' 담당 매장'} value={member.store_scope} disabled={member.role==='owner'||memberBusy} onChange={event=>void updateMember(member,{store_scope:event.target.value as StoreScope})}><option>해율푸드 전체</option><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select>
              <button className={`member-state ${member.is_active?'active':'inactive'}`} disabled={member.role==='owner'||memberBusy} onClick={()=>void updateMember(member,{is_active:!member.is_active})}>{member.is_active?'사용 중':'중지됨'}</button>
              {member.role!=='owner'&&<button className="member-delete" disabled={memberBusy} onClick={()=>void removeMember(member)} aria-label={member.display_name+' 계정 삭제'}><Trash2 size={16}/></button>}
            </div>
          ))}
        </div>
      </section>
      <div className="security-notice">
        <CircleCheck size={20} />
        <div>
          <strong>중요 작업은 항상 오너 승인 후 실행합니다.</strong>
          <p>
            가격 변경, 고객 메시지 발송, 혜택 제공, 계정 추가는 AI가 자동으로
            실행하지 않습니다.
          </p>
        </div>
      </div>
      <div className="security-actions">
        <button
          className="secondary-button"
          disabled={!user}
          onClick={() => setShowMemberForm(value=>!value)}
        >
          <Plus size={17}/>{showMemberForm?'입력 닫기':'직원 계정 추가'}
        </button>
        <button
          className="primary-button"
          onClick={() =>
            toast('현재 비공개·오너 전용 보안 기준을 확인했습니다.')
          }
        >
          <CircleCheck size={17} />
          보안 기준 확인
        </button>
      </div>
    </>
  );
}
