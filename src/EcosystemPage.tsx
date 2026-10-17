import {
  ArrowRight, Award, BadgeCheck, BookOpen, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronRight, CircleHelp, FileText, Gauge, Home,
  LockKeyhole, MessageSquareText, ShieldCheck, Sparkles,
  UsersRound, Wifi,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import type { Page } from '@/types';
import { CommunitiesPage, HouseholdManagementPage, ServiceAssistantPage } from '@/NextPages';
import { OpportunitiesBoard } from '@/OpportunitiesBoard';
import { CvPortfolioPage } from '@/CvPortfolioPage';
import type { WorkspaceExperiencePageName } from '@/WorkspaceExperiencePages';

const WorkspaceExperiencePage = lazy(async () => {
  const module = await import('@/WorkspaceExperiencePages');
  return { default: module.WorkspaceExperiencePage };
});

type WorkspacePage = Extract<Page,
  | 'household' | 'learn' | 'opportunities' | 'communities' | 'events'
  | 'passport' | 'documents' | 'copilot' | 'business-copilot' | 'trust'
  | 'safety' | 'analytics' | 'notifications' | 'access'
>;

interface WorkspaceModule {
  page: WorkspacePage;
  title: string;
  shortTitle: string;
  description: string;
  icon: typeof Home;
  stage: string;
  sections: { title: string; items: string[] }[];
  nextSteps: { label: string; page: Page }[];
}

const workspaces: WorkspaceModule[] = [
  {
    page: 'household', shortTitle: 'Home care', title: 'Your household, looked after',
    description: 'Keep property details, service history, and maintenance planning connected to the people who care for your home.',
    icon: Home, stage: 'Connected to service records',
    sections: [
      { title: 'Home records', items: ['Properties and household assets', 'Upcoming and completed service bookings', 'Maintenance reminders linked to your home'] },
      { title: 'Service journey', items: ['Describe a household need', 'Compare providers and request a quote', 'Keep booking, conversation, and review history together'] },
    ],
    nextSteps: [{ label: 'Find a service', page: 'search' }, { label: 'View your dashboard', page: 'customer-dashboard' }, { label: 'Open wallet', page: 'wallet' }],
  },
  {
    page: 'learn', shortTitle: 'Learning', title: 'Build skills with evidence',
    description: 'Connect learning paths, assessments, practical work, mentors, and service opportunities without treating course attendance as a license.',
    icon: BookOpen, stage: 'Academy preview',
    sections: [
      { title: 'Learning paths', items: ['Trade fundamentals and safety training', 'Practical assignments and assessments', 'Course completion records and credentials'] },
      { title: 'Put learning to work', items: ['Find a mentor or eligible training event', 'Add assessed skills to your evidence record', 'Discover opportunities with requirements you can review'] },
    ],
    nextSteps: [{ label: 'Explore opportunities', page: 'opportunities' }, { label: 'View achievement passport', page: 'passport' }, { label: 'Meet the community', page: 'communities' }],
  },
  {
    page: 'opportunities', shortTitle: 'Opportunities', title: 'Find the next useful opportunity',
    description: 'Bring service work, contracts, learning, mentorship, and community projects into one explainable discovery flow.',
    icon: BriefcaseBusiness, stage: 'Opportunity preview',
    sections: [
      { title: 'Explore', items: ['Local service requests and longer-term contracts', 'Courses, mentors, competitions, and events', 'Business and community projects'] },
      { title: 'Understand the fit', items: ['Compare stated skills and experience requirements', 'Check service area, schedule, and credential requirements', 'Review evidence gaps before applying'] },
    ],
    nextSteps: [{ label: 'Plan learning', page: 'learn' }, { label: 'Improve your CV', page: 'documents' }, { label: 'Open career copilot', page: 'copilot' }],
  },
  {
    page: 'communities', shortTitle: 'Communities', title: 'Useful connections, not noisy feeds',
    description: 'Create space for local trades, learners, service teams, and professional communities to share useful work.',
    icon: UsersRound, stage: 'Community preview',
    sections: [
      { title: 'Community spaces', items: ['Local household-service communities', 'Trade and professional groups', 'Learning cohorts and project teams'] },
      { title: 'Healthy participation', items: ['Highlight useful resources and verified contributions', 'Give organizers clear moderation controls', 'Report or block unwanted contact'] },
    ],
    nextSteps: [{ label: 'View events', page: 'events' }, { label: 'Open messages', page: 'messages' }, { label: 'Visit safety center', page: 'safety' }],
  },
  {
    page: 'events', shortTitle: 'Events', title: 'Learn and meet through events',
    description: 'Connect workshops, practical training, mentorship sessions, and skills competitions to a participant’s learning record.',
    icon: CalendarDays, stage: 'Events preview',
    sections: [
      { title: 'Event formats', items: ['Trade workshops and safety training', 'Mentorship and community sessions', 'Skills challenges and competitions'] },
      { title: 'Before you attend', items: ['Review organizer and event details', 'Check eligibility, fees, location, and schedule', 'Keep attendance separate from assessment or certification'] },
    ],
    nextSteps: [{ label: 'Explore learning', page: 'learn' }, { label: 'Open communities', page: 'communities' }, { label: 'View wallet', page: 'wallet' }],
  },
  {
    page: 'passport', shortTitle: 'Achievement passport', title: 'A passport built from real evidence',
    description: 'Bring learning, service, project, mentorship, and community milestones together while showing where each claim came from.',
    icon: Award, stage: 'Evidence connection required',
    sections: [
      { title: 'Achievement categories', items: ['Learning paths, courses, and assessments', 'Completed services and customer-confirmed projects', 'Mentorship, community contribution, and eligible events'] },
      { title: 'Evidence status', items: ['Self-reported', 'Platform-recorded or customer-confirmed', 'Assessment-verified or issuer-verified'] },
    ],
    nextSteps: [{ label: 'Review trust evidence', page: 'trust' }, { label: 'Add learning evidence', page: 'learn' }, { label: 'Build your CV', page: 'documents' }],
  },
  {
    page: 'documents', shortTitle: 'CV & portfolio', title: 'Professional documents, grounded in your record',
    description: 'Prepare a CV, service profile, project portfolio, or application document from information you review and approve.',
    icon: FileText, stage: 'Document builder preview',
    sections: [
      { title: 'Document formats', items: ['Trade CV and service-provider profile', 'Skills and project portfolio', 'Cover letter and capability statement'] },
      { title: 'Keep it accurate', items: ['Choose which skills, projects, and credentials to include', 'See missing evidence instead of invented qualifications', 'Maintain separate versions for different opportunities'] },
    ],
    nextSteps: [{ label: 'Review your passport', page: 'passport' }, { label: 'Find opportunities', page: 'opportunities' }, { label: 'Check trust evidence', page: 'trust' }],
  },
  {
    page: 'copilot', shortTitle: 'Career copilot', title: 'A personal copilot for your next step',
    description: 'Plan learning, prepare applications, and explore service work using information you choose to share.',
    icon: Sparkles, stage: 'AI service not connected',
    sections: [
      { title: 'Personal workflows', items: ['Plan a career or service-business goal', 'Identify evidence gaps for a selected opportunity', 'Prepare interview practice and portfolio updates'] },
      { title: 'Ground rules', items: ['Suggestions must cite available profile evidence', 'Generated text needs your review before use', 'No fabricated skills, credentials, clients, or project history'] },
    ],
    nextSteps: [{ label: 'Explore opportunities', page: 'opportunities' }, { label: 'Plan learning', page: 'learn' }, { label: 'Open your CV workspace', page: 'documents' }],
  },
  {
    page: 'business-copilot', shortTitle: 'Business copilot', title: 'Tools for household-service businesses',
    description: 'Support provider discovery, opportunity drafting, customer communication, and operations using data the business is permitted to access.',
    icon: Building2, stage: 'AI service not connected',
    sections: [
      { title: 'Business workflows', items: ['Draft an opportunity for an authorized person to review', 'Organize applicant evidence against stated requirements', 'Prepare customer replies, quotes, and follow-ups for approval'] },
      { title: 'Business controls', items: ['Respect organization roles and data boundaries', 'Show evidence behind recommendations', 'Never auto-reject, publish, or move money'] },
    ],
    nextSteps: [{ label: 'Open business operations', page: 'admin' }, { label: 'Review analytics', page: 'analytics' }, { label: 'Manage messages', page: 'messages' }],
  },
  {
    page: 'trust', shortTitle: 'Trust & verification', title: 'Trust is evidence, not a score',
    description: 'Show what has been checked, by whom, when, and what evidence supports it. A badge is never a substitute for a license.',
    icon: BadgeCheck, stage: 'Verification records required',
    sections: [
      { title: 'Separate verification types', items: ['Identity and contact verification', 'Skills assessments and course completion', 'External credentials and issuer confirmation'] },
      { title: 'Professional evidence', items: ['Platform-recorded service history', 'Customer-confirmed projects and reviews', 'Self-reported claims clearly labeled as such'] },
    ],
    nextSteps: [{ label: 'View achievement passport', page: 'passport' }, { label: 'Explore providers', page: 'search' }, { label: 'Visit safety center', page: 'safety' }],
  },
  {
    page: 'safety', shortTitle: 'Safety center', title: 'Safety and privacy, built into the service',
    description: 'Protect people, homes, documents, conversations, and payments throughout the household-service lifecycle.',
    icon: ShieldCheck, stage: 'Safety controls preview',
    sections: [
      { title: 'Before and during a visit', items: ['Review provider and booking details', 'Keep exact home locations private until needed', 'Use booking-linked communication and report concerns'] },
      { title: 'Account and platform safety', items: ['Use strong authentication and session controls', 'Block or report unwanted contact', 'Escalate urgent danger to local emergency services'] },
    ],
    nextSteps: [{ label: 'Open service messages', page: 'messages' }, { label: 'Review trust evidence', page: 'trust' }, { label: 'Open account settings', page: 'customer-dashboard' }],
  },
  {
    page: 'analytics', shortTitle: 'Analytics', title: 'Useful measures with their source attached',
    description: 'Understand service activity, learning progress, opportunities, and earnings without turning activity into an opaque quality score.',
    icon: Gauge, stage: 'Analytics data connection required',
    sections: [
      { title: 'Personal and provider measures', items: ['Bookings, completed work, and response history', 'Learning progress and documented project evidence', 'Opportunity applications and outcomes'] },
      { title: 'Business and platform measures', items: ['Revenue, service demand, and operations', 'Aggregate geographic demand with privacy protections', 'Every report identifies its data source and time period'] },
    ],
    nextSteps: [{ label: 'Open provider dashboard', page: 'provider-dashboard' }, { label: 'Open wallet', page: 'wallet' }, { label: 'Review opportunities', page: 'opportunities' }],
  },
  {
    page: 'notifications', shortTitle: 'Notifications', title: 'A calmer, more useful notification center',
    description: 'Keep service, payment, safety, learning, and opportunity alerts contextual, prioritized, and under the user’s control.',
    icon: MessageSquareText, stage: 'Notification preferences preview',
    sections: [
      { title: 'Useful categories', items: ['Booking and service updates', 'Payments and account security', 'Learning, events, and relevant opportunities'] },
      { title: 'User controls', items: ['Choose categories and delivery channels', 'Set quiet hours with safety exceptions', 'Avoid duplicate push and SMS alerts'] },
    ],
    nextSteps: [{ label: 'View bookings', page: 'customer-dashboard' }, { label: 'Open messages', page: 'messages' }, { label: 'Review access options', page: 'access' }],
  },
  {
    page: 'access', shortTitle: 'Low-data access', title: 'HomiCare should work on a difficult connection',
    description: 'Prioritize essential service tasks on slower networks and make offline actions safe to retry when a connection returns.',
    icon: Wifi, stage: 'Device integrations not connected',
    sections: [
      { title: 'Low-data experience', items: ['Reduce large media and non-essential loading', 'Keep bookings, provider details, and service instructions accessible', 'Compress uploads with a user-controlled quality choice'] },
      { title: 'Offline and regional access', items: ['Queue messages and sync them without duplicates', 'Use SMS, USSD, and mobile-money adapters when configured', 'Support local currency, language, and service-area settings'] },
    ],
    nextSteps: [{ label: 'Find a service', page: 'search' }, { label: 'Open bookings', page: 'customer-dashboard' }, { label: 'Manage notifications', page: 'notifications' }],
  },
];

const workspaceLinks: { label: string; page: Page; icon: typeof Home }[] = [
  { label: 'Providers directory', page: 'providers', icon: BriefcaseBusiness },
  { label: 'Home care', page: 'household', icon: Home },
  { label: 'Learning', page: 'learn', icon: BookOpen },
  { label: 'Opportunities', page: 'opportunities', icon: BriefcaseBusiness },
  { label: 'Communities', page: 'communities', icon: UsersRound },
  { label: 'Events', page: 'events', icon: CalendarDays },
  { label: 'Achievement passport', page: 'passport', icon: Award },
  { label: 'CV & portfolio', page: 'documents', icon: FileText },
  { label: 'Career copilot', page: 'copilot', icon: Sparkles },
  { label: 'Business copilot', page: 'business-copilot', icon: Building2 },
  { label: 'Trust & verification', page: 'trust', icon: BadgeCheck },
  { label: 'Safety center', page: 'safety', icon: ShieldCheck },
  { label: 'Analytics', page: 'analytics', icon: Gauge },
  { label: 'Notifications', page: 'notifications', icon: MessageSquareText },
  { label: 'Low-data access', page: 'access', icon: Wifi },
];

export function EcosystemPage({ page }: { page: WorkspacePage }) {
  const { setCurrentPage } = useApp();
  if (page === 'household') return <HouseholdManagementPage />;
  if (page === 'copilot') return <ServiceAssistantPage />;
  if (page === 'communities') return <CommunitiesPage />;
  if (page === 'opportunities') return <OpportunitiesBoard />;
  if (page === 'documents') return <CvPortfolioPage />;
  if (['notifications', 'safety', 'trust', 'learn', 'events', 'business-copilot'].includes(page)) {
    return <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-500">Loading workspace…</div>}><WorkspaceExperiencePage page={page as WorkspaceExperiencePageName} /></Suspense>;
  }
  const workspace = workspaces.find((item) => item.page === page) ?? workspaces[0];
  const Icon = workspace.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-700">
            <Icon className="h-4 w-4" /> HomiCare workspace
          </div>
          <h1 className="text-3xl font-bold text-slate-950">{workspace.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{workspace.description}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
          <CircleHelp className="h-4 w-4" /> {workspace.stage}
        </span>
      </div>

      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="HomiCare workspaces">
        {workspaceLinks.map((item) => {
          const ItemIcon = item.icon;
          return (
            <button key={item.page} onClick={() => setCurrentPage(item.page)} className={`group flex min-h-16 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${item.page === page ? 'border-orange-700 bg-orange-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400 hover:bg-orange-50'}`}>
              <ItemIcon className={`h-5 w-5 shrink-0 ${item.page === page ? 'text-orange-100' : 'text-orange-700'}`} />
              <span className="text-sm font-medium">{item.label}</span>
              <ChevronRight className={`ml-auto h-4 w-4 ${item.page === page ? 'text-orange-200' : 'text-slate-400'}`} />
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {workspace.sections.map((section) => (
          <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{section.title}</h2>
            <ul className="space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" /> {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {['copilot', 'business-copilot', 'analytics', 'trust', 'safety', 'notifications', 'access', 'passport'].includes(page) && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-100 p-4 text-sm text-slate-600">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>This workspace describes the intended flow. Connect authenticated data and authorized server-side services before using it for real decisions or sensitive records.</p>
        </div>
      )}

      <section className="mt-7 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Continue in HomiCare</h2>
        <div className="flex flex-wrap gap-2">
          {workspace.nextSteps.map((step) => (
            <button key={step.label} onClick={() => setCurrentPage(step.page)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-400 hover:text-orange-800">
              {step.label}<ArrowRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </section>

      <p className="mt-7 text-xs leading-relaxed text-slate-500">HomiCare keeps service transactions, loyalty rewards, achievement points, professional credentials, and customer feedback as distinct records.</p>
    </div>
  );
}

export function isEcosystemPage(page: Page): page is WorkspacePage {
  return workspaces.some((workspace) => workspace.page === page);
}

export function getWorkspaceLinks() {
  return workspaceLinks;
}