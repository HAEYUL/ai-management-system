'use client';

import { useEffect, useRef, useState } from 'react';
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
  FileText,
  Gauge,
  Home,
  Lightbulb,
  Plus,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
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
const tasks = [
  {
    title: '가을 버섯 경험 행사',
    store: '해율만두전골',
    meta: '9월 12일까지 결정',
    status: '결정 필요',
    tone: 'amber',
  },
  {
    title: '평일 저녁 포장 안내',
    store: '곤드레밥집',
    meta: '오늘 현장 반응 기록',
    status: '진행 중',
    tone: 'green',
  },
  {
    title: '재방문 선물 결과 확인',
    store: '정담명가',
    meta: '결과 입력일 도착',
    status: '결과 확인',
    tone: 'blue',
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
type ExecutionTask = { id:string; title:string; store:string; area:string; due:string; owner:string; status:'결정 필요'|'진행 중'|'결과 확인'|'완료'; instruction:string; fieldNote:string };
type RecentQuestion = { id:string; question:string; store:string; area:string; createdAt:string };
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

const cloudStorageKeys = ['haeyul-analysis-workspace-v1','haeyul-store-drafts-v1','haeyul-menu-drafts-v1','haeyul-principle-draft-v1'] as const;
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

export default function HomePage() {
  const [view, setView] = useState('오늘');
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(
    null,
  );
  const [adoptedTasks, setAdoptedTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [executionTasks, setExecutionTasks] = useState<ExecutionTask[]>([]);
  const [diagnosisStore, setDiagnosisStore] = useState('해율만두전골');
  const [diagnosisArea, setDiagnosisArea] = useState('제품');
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([]);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const go = (name: string) => {
    setView(name);
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
          adoptedTasks?: string[];
          completedTasks?: string[];
          executionTasks?: ExecutionTask[];
          diagnosisStore?: string;
          diagnosisArea?: string;
          recentQuestions?: RecentQuestion[];
        };
        if (parsed.sessionSummary) {
          setSessionSummary({
            ...parsed.sessionSummary,
            daily: Array.isArray(parsed.sessionSummary.daily) ? parsed.sessionSummary.daily : [],
            weekdays: Array.isArray(parsed.sessionSummary.weekdays) ? parsed.sessionSummary.weekdays : [],
          });
        }
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
        JSON.stringify({ sessionSummary, adoptedTasks, completedTasks, executionTasks, diagnosisStore, diagnosisArea, recentQuestions }),
      );
      window.dispatchEvent(new Event(localDataChangedEvent));
    } catch {}
  }, [workspaceReady, sessionSummary, adoptedTasks, completedTasks, executionTasks, diagnosisStore, diagnosisArea, recentQuestions]);
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
          {navItems.map(({ label, icon: Icon }) => (
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
          <button
            onClick={() => go('관리')}
            className={`nav-item ${view === '관리' ? 'active' : ''}`}
          >
            <Settings size={20} />
            <span>관리</span>
          </button>
          <div className="owner">
            <span>JB</span>
            <div>
              <strong>제이비</strong>
              <small>오너 계정</small>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <Header sessionSummary={sessionSummary} />
        {view === '오늘' ? (
          <Today go={go} startQuick={startQuick} executionTasks={executionTasks} />
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
          />
        ) : view === '계획과 실행' ? (
          <Plans
            toast={toast}
            sessionSummary={sessionSummary}
            adoptedTasks={adoptedTasks}
            completedTasks={completedTasks}
            setCompletedTasks={setCompletedTasks}
            executionTasks={executionTasks}
            setExecutionTasks={setExecutionTasks}
          />
        ) : view === '매출·고객' ? (
          <Sales
            toast={toast}
            sessionSummary={sessionSummary}
            setSessionSummary={setSessionSummary}
            adoptedTasks={adoptedTasks}
            setAdoptedTasks={setAdoptedTasks}
            setCompletedTasks={setCompletedTasks}
          />
        ) : view === '매출성장 9단계' ? (
          <Stages go={go} executionTasks={executionTasks} sessionSummary={sessionSummary} />
        ) : (
          <Manage toast={toast} />
        )}
      </main>
      <nav className="mobile-nav">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            onClick={() => go(label)}
            className={view === label ? 'active' : ''}
            key={label}
          >
            <Icon size={20} />
            <span>{label.replace('매출성장 ', '')}</span>
          </button>
        ))}
        <button
          onClick={() => go('관리')}
          className={view === '관리' ? 'active' : ''}
        >
          <Settings size={20} />
          <span>관리</span>
        </button>
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

function Header({ sessionSummary }: { sessionSummary: SessionSummary | null }) {
  return (
    <header className="topbar">
      <button className="store-select">
        <span className="store-dot" />
        해율푸드 전체
        <ChevronDown size={16} />
      </button>
      <div className="top-actions">
        <span className="data-date">{sessionSummary ? `${sessionSummary.store} · ${sessionSummary.month} 자료` : '매출자료 연결 전'}</span>
        <button className="icon-button" aria-label="알림">
          <Bell size={20} />
          <i />
        </button>
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
function Today({go,startQuick,executionTasks}:{go:(v:string)=>void;startQuick:(question:string,area:string)=>void;executionTasks:ExecutionTask[]}) {
  const statusOrder:Record<ExecutionTask['status'],number>={'결정 필요':0,'진행 중':1,'결과 확인':2,'완료':3};
  const openTasks=executionTasks.filter(task=>task.status!=='완료');
  const priorityTasks=[...openTasks].sort((a,b)=>statusOrder[a.status]-statusOrder[b.status]||a.due.localeCompare(b.due)).slice(0,3);
  const focus=priorityTasks[0];
  const tone=(status:ExecutionTask['status'])=>status==='결정 필요'?'amber':status==='결과 확인'?'blue':'green';
  const taskCounts={
    decision:executionTasks.filter(task=>task.status==='결정 필요').length,
    active:executionTasks.filter(task=>task.status==='진행 중').length,
    review:executionTasks.filter(task=>task.status==='결과 확인').length,
    completed:executionTasks.filter(task=>task.status==='완료').length,
  };
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="오늘 · 안전하게 저장"
        title="오늘의 경영실"
        copy="결정할 일, 실행 중인 일, 결과 확인 순서로 오늘 업무를 정리합니다."
        action={
          <button onClick={() => go('AI 진단')} className="primary-button">
            <Sparkles size={18} />
            <b>AI 진단 시작</b>
          </button>
        }
      />
      <div className="prototype-notice"><span>자동 저장</span><p>변경 내용은 먼저 이 기기에 저장되고, 로그인 상태에서는 Supabase에도 자동으로 동기화됩니다.</p></div>
      <section className="ask-panel">
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
      </div>
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
}) {
  const submitDiagnosis=()=>{const clean=question.trim();if(!clean)return;setRecentQuestions(current=>[{id:createId(),question:clean,store,area,createdAt:new Date().toISOString()},...current.filter(item=>!(item.question===clean&&item.store===store&&item.area===area))].slice(0,5));setSubmitted(true)};
  const recallQuestion=(item:RecentQuestion)=>{setQuestion(item.question);setStore(item.store);setArea(item.area)};
  const guide=diagnosisGuide[area] ?? diagnosisGuide.제품;
  const makeTask=()=>{const title=question.trim().replace(/[?.!]$/,'').slice(0,48);setExecutionTasks(current=>[{id:createId(),title,store,area,due:'',owner:'오너',status:'결정 필요',instruction:`질문: ${question.trim()}\n확인할 사실: ${guide.facts.join(' / ')}\n확인 지표: ${guide.metric}`,fieldNote:''},...current]);toast('진단 준비표를 검토용 과제로 전환했습니다.');go('계획과 실행')};
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
                자료 기준 <b>연결 전</b>
              </span>
            </div>
          </div>
          <div className="result-grid">
            <article>
              <span className="fact-label">실제 자료 연결 후 제공</span>
              <h3>질문과 관련된 확인 자료를 먼저 찾습니다.</h3>
              <p>매출·고객·운영 기록에서 확인된 사실만 이 영역에 표시합니다.</p>
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
              onClick={makeTask}
              className="primary-button"
            >
              준비표 저장
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Plans({
  toast,
  sessionSummary,
  adoptedTasks,
  completedTasks,
  setCompletedTasks,
  executionTasks,
  setExecutionTasks,
}: {
  toast: (s: string) => void;
  sessionSummary: SessionSummary | null;
  adoptedTasks: string[];
  completedTasks: string[];
  setCompletedTasks: React.Dispatch<React.SetStateAction<string[]>>;
  executionTasks: ExecutionTask[];
  setExecutionTasks: React.Dispatch<React.SetStateAction<ExecutionTask[]>>;
}) {
  const [showCreate,setShowCreate]=useState(false);
  const [taskQuery,setTaskQuery]=useState('');
  const [taskStore,setTaskStore]=useState('전체 매장');
  const [taskStatus,setTaskStatus]=useState('전체 상태');
  const [newTask,setNewTask]=useState({title:'',store:'해율만두전골',area:'제품',due:'',owner:'오너',instruction:''});
  const addTask=()=>{if(!newTask.title.trim())return;setExecutionTasks(current=>[{id:createId(),...newTask,title:newTask.title.trim(),status:'결정 필요',fieldNote:''},...current]);setNewTask({title:'',store:'해율만두전골',area:'제품',due:'',owner:'오너',instruction:''});setShowCreate(false);toast('새 과제를 저장했습니다.')};
  const updateTask=(id:string,changes:Partial<ExecutionTask>)=>setExecutionTasks(current=>current.map(task=>task.id===id?{...task,...changes}:task));
  const visibleTasks=executionTasks.filter(task=>{const query=taskQuery.trim().toLowerCase();const matchesQuery=!query||[task.title,task.store,task.area,task.owner,task.instruction,task.fieldNote].some(value=>value.toLowerCase().includes(query));return matchesQuery&&(taskStore==='전체 매장'||task.store===taskStore)&&(taskStatus==='전체 상태'||task.status===taskStatus)});
  const removeTask=(task:ExecutionTask)=>{if(!window.confirm(`“${task.title}” 과제를 삭제할까요? 삭제한 과제는 백업 파일이 없으면 복구할 수 없습니다.`))return;setExecutionTasks(current=>current.filter(item=>item.id!==task.id));toast('과제를 삭제했습니다.')};
  const clearCompleted=()=>{const count=executionTasks.filter(task=>task.status==='완료').length;if(!count)return;if(!window.confirm(`완료된 과제 ${count}개를 모두 삭제할까요?`))return;setExecutionTasks(current=>current.filter(task=>task.status!=='완료'));toast('완료된 과제를 정리했습니다.')};
  return (
    <div className="page-wrap">
      <Heading
        eyebrow="계획과 실행"
        title="실행 과제"
        copy="오너가 승인한 계획만 현장 과제가 됩니다."
        action={
          <button onClick={()=>setShowCreate(value=>!value)} className="primary-button">
            <Plus size={18} />
            <b>{showCreate?'입력 닫기':'새 과제'}</b>
          </button>
        }
      />
      {showCreate&&<section className="task-create"><div className="section-title"><div><h2>새 실행 과제</h2><span>오너가 확인한 과제만 등록하세요.</span></div></div><div className="task-create-grid"><label><span>과제명</span><input value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})} placeholder="예: 평일 저녁 포장 안내" autoFocus/></label><label><span>대상 매장</span><select value={newTask.store} onChange={e=>setNewTask({...newTask,store:e.target.value})}><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label><label><span>9단계 영역</span><select value={newTask.area} onChange={e=>setNewTask({...newTask,area:e.target.value})}>{stages.map(stage=><option key={stage}>{stage}</option>)}</select></label><label><span>확인 기한</span><input type="date" value={newTask.due} onChange={e=>setNewTask({...newTask,due:e.target.value})}/></label><label><span>담당</span><input value={newTask.owner} onChange={e=>setNewTask({...newTask,owner:e.target.value})}/></label><label className="wide"><span>현장 안내</span><textarea value={newTask.instruction} onChange={e=>setNewTask({...newTask,instruction:e.target.value})} placeholder="직원이 바로 실행할 수 있도록 짧게 적어주세요."/></label></div><div className="task-create-actions"><span>기기에 저장되며 로그인 상태에서는 클라우드와 자동 동기화됩니다.</span><button className="primary-button" disabled={!newTask.title.trim()} onClick={addTask}>과제 등록</button></div></section>}
      {executionTasks.length>0&&<section className="real-task-board">
        <div className="section-title"><div><h2>내 실행 과제</h2><span>필요한 과제를 찾고 상태와 현장 기록을 바로 수정할 수 있습니다.</span></div><span className="draft-count">{executionTasks.filter(task=>task.status==='완료').length}/{executionTasks.length} 완료</span></div>
        <div className="task-tools">
          <label><span>과제 검색</span><input value={taskQuery} onChange={e=>setTaskQuery(e.target.value)} placeholder="과제명, 담당, 현장 기록 검색"/></label>
          <label><span>매장</span><select value={taskStore} onChange={e=>setTaskStore(e.target.value)}><option>전체 매장</option><option>해율만두전골</option><option>곤드레밥집</option><option>정담명가</option></select></label>
          <label><span>상태</span><select value={taskStatus} onChange={e=>setTaskStatus(e.target.value)}><option>전체 상태</option><option>결정 필요</option><option>진행 중</option><option>결과 확인</option><option>완료</option></select></label>
          <button className="completed-clear" disabled={!executionTasks.some(task=>task.status==='완료')} onClick={clearCompleted}><Trash2 size={16}/>완료 과제 정리</button>
        </div>
        <div className="task-result-count">전체 {executionTasks.length}개 중 {visibleTasks.length}개 표시</div>
        <div className="real-task-list">{visibleTasks.map(task=><article key={task.id}><div className="real-task-head"><div><span>{task.store} · {task.area}</span><input aria-label="과제명" value={task.title} onChange={e=>updateTask(task.id,{title:e.target.value})}/></div><select aria-label={task.title+' 상태'} value={task.status} onChange={e=>updateTask(task.id,{status:e.target.value as ExecutionTask['status']})}><option>결정 필요</option><option>진행 중</option><option>결과 확인</option><option>완료</option></select></div><div className="real-task-meta"><span>담당 <b>{task.owner}</b></span><span>기한 <b>{task.due||'미정'}</b></span></div><label><span>현장 안내</span><textarea value={task.instruction} onChange={e=>updateTask(task.id,{instruction:e.target.value})} placeholder="실행 방법을 입력하세요."/></label><label><span>현장 기록</span><textarea value={task.fieldNote} onChange={e=>updateTask(task.id,{fieldNote:e.target.value})} placeholder="고객 반응, 직원 의견, 결과를 기록하세요."/></label><div className="task-card-foot"><small>입력 내용은 자동 저장됩니다.</small><button onClick={()=>removeTask(task)} aria-label={task.title+' 삭제'}><Trash2 size={15}/>삭제</button></div></article>)}</div>
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
      <div className="filter-tabs">
        {['예시 과제 3', '결정 필요 1', '진행 중 1', '결과 확인 1'].map(
          (x, i) => (
            <button disabled className={i === 0 ? 'active' : ''} key={x}>
              {x}
            </button>
          ),
        )}
      </div>
      <div className="plan-layout">
        <section className="plan-list">
          {tasks.map((t, i) => (
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
        <section className="plan-detail">
          <div className="detail-head">
            <div>
              <span className="example-detail-tag">사용 예시</span>
              <span className="store-label">곤드레밥집 · 고객관계</span>
              <h2>평일 저녁 포장 안내</h2>
              <p>
                저녁 방문 고객에게 가족용 한 끼 포장을 한 번만 자연스럽게
                안내합니다.
              </p>
            </div>
            <span className="status green">진행 중</span>
          </div>
          <div className="detail-metrics">
            <div>
              <span>실행 기간</span>
              <b>9.1 — 9.14</b>
            </div>
            <div>
              <span>예상 비용</span>
              <b>10만원 이내</b>
            </div>
            <div>
              <span>담당</span>
              <b>점장 · 저녁 직원</b>
            </div>
          </div>
          <div className="instruction">
            <h3>오늘 현장 안내</h3>
            <p>
              식사를 마친 고객에게 한 번만 안내하세요. 원하지 않으면 추가로
              권하지 않습니다.
            </p>
            <blockquote>
              “가족분들 드실 한 끼도 함께 준비해드릴까요?”
            </blockquote>
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
        </section>
      </div>
    </div>
  );
}

function Sales({
  toast,
  sessionSummary,
  setSessionSummary,
  adoptedTasks,
  setAdoptedTasks,
  setCompletedTasks,
}: {
  toast: (s: string) => void;
  sessionSummary: SessionSummary | null;
  setSessionSummary: React.Dispatch<
    React.SetStateAction<SessionSummary | null>
  >;
  adoptedTasks: string[];
  setAdoptedTasks: React.Dispatch<React.SetStateAction<string[]>>;
  setCompletedTasks: React.Dispatch<React.SetStateAction<string[]>>;
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
                        setSavingImport(true);
                        const { error: saveError } = await supabase.rpc('save_sales_import', {
                          p_store_name: store,
                          p_store_slug: storeSlugs[store],
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
                        setSessionSummary({
                          store,
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
              <h2>고객관계</h2>
              <ul>
                <li>
                  <span>신규 가입</span>
                  <b>통계 입력 필요</b>
                </li>
                <li>
                  <span>재방문</span>
                  <b>통계 입력 필요</b>
                </li>
                <li>
                  <span>60일 이상 미방문</span>
                  <b>통계 입력 필요</b>
                </li>
              </ul>
              <button
                onClick={() =>
                  toast(
                    '관리의 전자여권 통계 화면에서 연결 준비를 확인할 수 있습니다.',
                  )
                }
                className="secondary-button"
              >
                통계 연결 확인
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

function Stages({go,executionTasks,sessionSummary}:{go:(v:string)=>void;executionTasks:ExecutionTask[];sessionSummary:SessionSummary|null}) {
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
        copy="점수가 아니라 현재 문제와 실행 과제를 중심으로 봅니다."
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

function Manage({ toast }: { toast: (s: string) => void }) {
  const [section, setSection] = useState('매장 기본정보');
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
            [Settings, '계정·보안'],
          ].map(([Icon, title]) => (
            <button
              className={section === title ? 'active' : ''}
              key={String(title)}
              onClick={() => setSection(String(title))}
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
      <div className="section-title"><div><h2>등록된 자료</h2><span>파일은 비공개이며 로그인한 소유자만 열 수 있습니다.</span></div><strong>{documents.length}개</strong></div>
      {documents.length ? documents.map(document => <div className="knowledge-row" key={document.id}>
        <div className="summary-icon green"><FileText size={19}/></div>
        <div><strong>{document.title}</strong><span>{document.store_scope} · {document.category}{document.source_date ? ` · ${document.source_date}` : ''}<br/>{document.original_filename} · {Math.max(1, Math.round(document.size_bytes/1024)).toLocaleString()} KB</span></div>
        <div className="knowledge-actions"><button className="secondary-button" disabled={busy} onClick={()=>void downloadDocument(document)}><Download size={15}/>받기</button><button className="knowledge-delete" disabled={busy} onClick={()=>void deleteDocument(document)}><Trash2 size={15}/>삭제</button></div>
      </div>) : <div className="task-empty"><strong>등록된 지식자료가 없습니다.</strong><span>브랜드 기준이나 운영문서부터 한 개씩 등록해 주세요.</span></div>}
    </div>
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
  useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setUser(data.user)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(active)setUser(session?.user??null)});return()=>{active=false;subscription.unsubscribe()}},[]);
  useEffect(()=>{if(!user){setCloudUpdatedAt('');return}void supabase.from('workspace_snapshots').select('updated_at').eq('user_id',user.id).maybeSingle().then(({data})=>setCloudUpdatedAt(data?.updated_at||''))},[user]);
  useEffect(()=>{try{const saved=JSON.parse(window.localStorage.getItem(cloudSyncStateKey)||'null') as {state?:CloudSyncState;updatedAt?:string}|null;if(saved?.state)setAutoSyncState(saved.state);if(saved?.updatedAt)setCloudUpdatedAt(saved.updatedAt)}catch{}const onStatus=(event:Event)=>{const detail=(event as CustomEvent<{state:CloudSyncState;updatedAt:string}>).detail;setAutoSyncState(detail.state);if(detail.updatedAt)setCloudUpdatedAt(detail.updatedAt)};window.addEventListener(cloudSyncStatusEvent,onStatus);return()=>window.removeEventListener(cloudSyncStatusEvent,onStatus)},[]);
  const sendLoginLink=async()=>{const clean=email.trim();if(!clean)return;setAuthBusy(true);const {error}=await supabase.auth.signInWithOtp({email:clean,options:{emailRedirectTo:window.location.origin,shouldCreateUser:true}});setAuthBusy(false);toast(error?'로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.':'로그인 링크를 이메일로 보냈습니다. 메일에서 링크를 눌러 주세요.')};
  const saveToCloud=async()=>{if(!user)return;setSyncBusy(true);const updatedAt=new Date().toISOString();const {data,error}=await supabase.from('workspace_snapshots').upsert({user_id:user.id,payload:readLocalCloudPayload(),schema_version:1,updated_at:updatedAt},{onConflict:'user_id'}).select('updated_at').single();setSyncBusy(false);if(error){toast('클라우드 저장에 실패했습니다. 다시 시도해 주세요.');return}setCloudUpdatedAt(data.updated_at);window.dispatchEvent(new Event(cloudSyncRefreshEvent));toast('이 기기의 데이터를 Supabase에 저장했습니다.')};
  const loadFromCloud=async()=>{if(!user)return;setSyncBusy(true);const {data,error}=await supabase.from('workspace_snapshots').select('payload,updated_at').eq('user_id',user.id).maybeSingle();setSyncBusy(false);if(error){toast('클라우드 데이터를 불러오지 못했습니다.');return}if(!data){toast('이 계정에 저장된 클라우드 데이터가 없습니다.');return}if(!window.confirm('현재 이 기기의 내용을 클라우드에 저장된 내용으로 바꿀까요?'))return;try{const payload=data.payload as Record<string,unknown>;for(const key of cloudStorageKeys){const value=payload?.[key];if(value!==null&&typeof value!=='string')throw new Error('invalid');if(typeof value==='string')JSON.parse(value)}for(const key of cloudStorageKeys){const value=payload[key];if(typeof value==='string')window.localStorage.setItem(key,value);else window.localStorage.removeItem(key)}publishCloudSyncState('synced',data.updated_at);toast('클라우드 데이터를 불러왔습니다. 화면을 새로 엽니다.');window.setTimeout(()=>window.location.reload(),700)}catch{toast('클라우드 데이터 형식이 올바르지 않아 복원을 중단했습니다.')}};
  const signOut=async()=>{await supabase.auth.signOut();setUser(null);toast('Supabase 계정에서 로그아웃했습니다.')};
  const rules = [
    ['오너', '모든 경영자료 확인 · 승인 · 설정 변경', '현재 사용 중'],
    ['매장 책임자', '담당 매장의 과제와 결과만 확인', '추후 추가'],
    ['직원', '배정된 실행 안내와 현장 기록만 사용', '추후 추가'],
  ];
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
          <strong>아직 없음</strong>
          <small>필요할 때만 추가</small>
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
        <div className="role-table">
          {rules.map(([role, scope, state]) => (
            <div className="role-row" key={role}>
              <div className="role-badge">{role.slice(0, 1)}</div>
              <div>
                <strong>{role}</strong>
                <span>{scope}</span>
              </div>
              <span
                className={
                  state === '현재 사용 중' ? 'status green' : 'status amber'
                }
              >
                {state}
              </span>
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
          onClick={() =>
            toast('직원 역할과 담당 매장을 정한 뒤 계정을 추가할 수 있습니다.')
          }
        >
          직원 계정 추가 준비
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
