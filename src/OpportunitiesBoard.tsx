import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, BadgeCheck, Bookmark, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronDown, Clock3, FileText, Filter, Flame,
  Handshake, MapPin, Plus, Search, ShieldCheck, SlidersHorizontal, Users,
  Wrench, X, Upload,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

type OpportunityType = 'Service Request' | 'Job & Contract' | 'Tender' | 'Partnership';
type Urgency = 'Normal' | 'Urgent' | 'Within 24 hours';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: OpportunityType;
  category: string;
  location: string;
  distance: string;
  budget: number | null;
  budgetLabel: string;
  budgetType: string;
  urgency: Urgency;
  posted: string;
  requester: string;
  requesterRole: string;
  requesterRating: string;
  requesterReviews: number;
  image: string;
  tags: string[];
  requiredQuestions?: string[];
  requiredDocuments?: string[];
}

interface OpportunityApplication {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  applicantName: string;
  phone: string;
  email: string;
  proposal: string;
  expectedPrice: string;
  availability: string;
  answers: Record<string, string>;
  documents: Record<string, string>;
  submittedAt: string;
}

type OpportunitySection = 'All Opportunities' | OpportunityType;

const sections: { label: OpportunitySection; count: number; icon: typeof BriefcaseBusiness }[] = [
  { label: 'All Opportunities', count: 124, icon: BriefcaseBusiness },
  { label: 'Service Request', count: 78, icon: Wrench },
  { label: 'Job & Contract', count: 32, icon: Building2 },
  { label: 'Tender', count: 8, icon: FileText },
  { label: 'Partnership', count: 6, icon: Handshake },
];

const initialOpportunities: Opportunity[] = [
  { id: 'sample-plumbing', title: 'Need a Reliable Plumber for Water Tank Repair', description: 'We need a professional plumber to fix a leaking water tank and replace the outlet pipe. Urgent!', type: 'Service Request', category: 'Plumbing', location: 'Arua City', distance: '2.4 km away', budget: 80000, budgetLabel: 'UGX 80,000', budgetType: 'Budget', urgency: 'Urgent', posted: 'Posted 2 hours ago', requester: 'Sarah N.', requesterRole: 'Homeowner', requesterRating: '4.8', requesterReviews: 12, image: '/doc1-images/image14.jpeg', tags: ['Plumbing', 'Water Tank', 'Urgent'], requiredQuestions: ['Years of plumbing experience', 'When can you inspect the water tank?'], requiredDocuments: ['Portfolio / Work samples'] },
  { id: 'sample-electrical', title: 'Electrical Installation for New House', description: 'Looking for a certified electrician to complete electrical installation for a 3-bedroom house.', type: 'Job & Contract', category: 'Electrical', location: 'Arua Hill, Arua', distance: '5.1 km away', budget: 1200000, budgetLabel: 'UGX 1,200,000', budgetType: 'Project Budget', urgency: 'Normal', posted: 'Posted 1 day ago', requester: 'Thomas Okello', requesterRole: 'Business Owner', requesterRating: '4.6', requesterReviews: 18, image: '/doc1-images/image4.jpeg', tags: ['Electrical', 'Installation', 'Long Term'], requiredQuestions: ['Years of relevant electrical installation experience', 'Do you hold an electrical safety certificate?'], requiredDocuments: ['CV / Resume', 'Trade certificates'] },
  { id: 'sample-cleaning', title: 'Cleaning Services for Office Space', description: 'We are looking for a cleaning company to provide weekly cleaning services for our office.', type: 'Partnership', category: 'Cleaning', location: 'Arua Town', distance: '3.7 km away', budget: 250000, budgetLabel: 'UGX 250,000 / month', budgetType: 'Monthly Contract', urgency: 'Normal', posted: 'Posted 2 days ago', requester: 'Arua Business Hub', requesterRole: 'Organization', requesterRating: '4.9', requesterReviews: 25, image: '/doc1-images/image2.jpeg', tags: ['Cleaning', 'Office', 'Weekly'] },
  { id: 'sample-solar', title: 'Solar Installation for Community Center', description: 'Need a registered solar company to install a 5kW solar system for our community center.', type: 'Tender', category: 'Solar Energy', location: 'Lira Road, Arua', distance: '12.3 km away', budget: 8500000, budgetLabel: 'UGX 8,500,000', budgetType: 'Tender Budget', urgency: 'Within 24 hours', posted: 'Posted 3 days ago', requester: 'Community Dev. Org', requesterRole: 'Non-profit', requesterRating: '4.7', requesterReviews: 15, image: '/doc1-images/image12.jpeg', tags: ['Solar Energy', 'Installation', 'Tender'] },
];

const storageKey = 'homicare-opportunities-v1';
const applicationsStorageKey = 'homicare-opportunity-applications-v1';
const locations = ['All Locations', 'Arua City', 'Kampala', 'Gulu', 'Lira', 'Mbarara', 'Entebbe'];
const categories = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Painting', 'Gardening', 'Moving', 'Solar Energy', 'Construction', 'Appliance Repair', 'Laundry', 'Childcare', 'Catering', 'Other'];
const urgencyOptions: Urgency[] = ['Normal', 'Urgent', 'Within 24 hours'];
const documentOptions = ['CV / Resume', 'Trade certificates', 'Portfolio / Work samples', 'References'];
const standardQuestions = [
  'Years of relevant experience',
  'Relevant qualifications or certifications',
  'When can you start?',
  'Have you completed similar work before?',
];

function readOpportunities(): Opportunity[] {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return initialOpportunities;
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isOpportunity)) throw new Error('Saved opportunities data is invalid.');
  return [...parsed.map((item) => ({
    ...item,
    requiredQuestions: item.requiredQuestions || [],
    requiredDocuments: item.requiredDocuments || [],
  })), ...initialOpportunities];
}

function isOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string'
    && typeof item.description === 'string' && typeof item.location === 'string'
    && (item.type === 'Service Request' || item.type === 'Job & Contract' || item.type === 'Tender' || item.type === 'Partnership')
    && typeof item.category === 'string' && Array.isArray(item.tags)
    && (item.requiredQuestions === undefined || Array.isArray(item.requiredQuestions))
    && (item.requiredDocuments === undefined || Array.isArray(item.requiredDocuments));
}

function readApplications(): OpportunityApplication[] {
  const stored = window.localStorage.getItem(applicationsStorageKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isApplication)) throw new Error('Saved applications data is invalid.');
  return parsed;
}

function isApplication(value: unknown): value is OpportunityApplication {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.opportunityId === 'string'
    && typeof item.opportunityTitle === 'string' && typeof item.applicantName === 'string'
    && typeof item.phone === 'string' && typeof item.email === 'string'
    && typeof item.proposal === 'string' && item.answers !== null
    && typeof item.answers === 'object' && item.documents !== null
    && typeof item.documents === 'object';
}

function formatMoney(value: number) {
  return `UGX ${new Intl.NumberFormat('en-UG').format(value)}`;
}

function urgencyStyle(urgency: Urgency) {
  if (urgency === 'Urgent') return 'bg-red-100 text-red-700';
  if (urgency === 'Within 24 hours') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
}

function sectionHeading(section: OpportunitySection) {
  if (section === 'All Opportunities') return 'Available Opportunities';
  if (section === 'Service Request') return 'Service Requests';
  if (section === 'Job & Contract') return 'Jobs & Contracts';
  if (section === 'Tender') return 'Tenders';
  return 'Partnerships';
}

function defaultBudgetType(type: OpportunityType) {
  if (type === 'Tender') return 'Tender budget';
  if (type === 'Partnership') return 'Monthly contract';
  if (type === 'Job & Contract') return 'Project budget';
  return 'Negotiable';
}

export function OpportunitiesBoard() {
  const { userRole } = useApp();
  const initialLoad = useMemo(() => {
    try {
      return { items: readOpportunities(), error: '' };
    } catch (error) {
      return {
        items: initialOpportunities,
        error: error instanceof Error ? error.message : 'Could not read saved opportunities.',
      };
    }
  }, []);
  const [opportunities, setOpportunities] = useState(initialLoad.items);
  const [storageError, setStorageError] = useState(initialLoad.error);
  const [allowPersistence, setAllowPersistence] = useState(!initialLoad.error);
  const [section, setSection] = useState<OpportunitySection>('All Opportunities');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Arua City');
  const [category, setCategory] = useState('All Categories');
  const [budget, setBudget] = useState('Any Budget');
  const [sort, setSort] = useState('Newest First');
  const [urgencies, setUrgencies] = useState<Urgency[]>(urgencyOptions);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const initialApplications = useMemo(() => {
    try {
      return { items: readApplications(), error: '' };
    } catch (error) {
      return {
        items: [],
        error: error instanceof Error ? error.message : 'Could not read saved applications.',
      };
    }
  }, []);
  const [applications, setApplications] = useState(initialApplications.items);
  const [applicationError, setApplicationError] = useState(initialApplications.error);
  const allowApplicationPersistence = !initialApplications.error;
  const [postOpen, setPostOpen] = useState(false);
  const [applicationTarget, setApplicationTarget] = useState<Opportunity | null>(null);
  const [details, setDetails] = useState<Opportunity | null>(null);
  const [notice, setNotice] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [employerQuestions, setEmployerQuestions] = useState<string[]>([]);
  const [employerDocuments, setEmployerDocuments] = useState<string[]>([]);
  const [applicant, setApplicant] = useState({
    name: '',
    phone: '',
    email: '',
    proposal: '',
    expectedPrice: '',
    availability: '',
  });
  const [applicationAnswers, setApplicationAnswers] = useState<Record<string, string>>({});
  const [applicationDocuments, setApplicationDocuments] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({
    type: 'Service Request' as OpportunityType,
    title: '',
    description: '',
    category: 'Plumbing',
    location: 'Arua City',
    budget: '',
    budgetType: 'Negotiable',
    urgency: 'Normal' as Urgency,
  });

  useEffect(() => {
    if (!allowPersistence) return;
    try {
      const saved = opportunities.filter((item) => !item.id.startsWith('sample-'));
      window.localStorage.setItem(storageKey, JSON.stringify(saved));
      setStorageError('');
    } catch {
      setStorageError('Your browser could not save changes. New opportunities will only remain until you leave this page.');
    }
  }, [allowPersistence, opportunities]);

  useEffect(() => {
    if (!allowApplicationPersistence) return;
    try {
      window.localStorage.setItem(applicationsStorageKey, JSON.stringify(applications));
      setApplicationError('');
    } catch {
      setApplicationError('Applications could not be saved in this browser. Keep a copy of your answers before closing this page.');
    }
  }, [allowApplicationPersistence, applications]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const result = opportunities.filter((item) => {
      if (section !== 'All Opportunities' && item.type !== section) return false;
      if (location !== 'All Locations' && !item.location.toLowerCase().includes(location.toLowerCase().replace(' city', ''))) return false;
      if (category !== 'All Categories' && item.category !== category) return false;
      if (!urgencies.includes(item.urgency)) return false;
      if (budget === 'Under UGX 100,000' && (item.budget === null || item.budget >= 100000)) return false;
      if (budget === 'UGX 100,000–500,000' && (item.budget === null || item.budget < 100000 || item.budget > 500000)) return false;
      if (budget === 'UGX 500,000–1,000,000' && (item.budget === null || item.budget < 500000 || item.budget > 1000000)) return false;
      if (budget === 'UGX 1,000,000+' && (item.budget === null || item.budget < 1000000)) return false;
      return !search || `${item.title} ${item.description} ${item.category} ${item.location} ${item.type} ${item.requester}`.toLowerCase().includes(search);
    });
    return result.sort((first, second) => sort === 'Highest Budget'
      ? (second.budget || 0) - (first.budget || 0)
      : sort === 'Urgency'
        ? urgencyOptions.indexOf(second.urgency) - urgencyOptions.indexOf(first.urgency)
        : 0);
  }, [budget, category, location, opportunities, query, section, sort, urgencies]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const openApplication = (opportunity: Opportunity) => {
    setApplicant({ name: '', phone: '', email: '', proposal: '', expectedPrice: '', availability: '' });
    setApplicationAnswers({});
    setApplicationDocuments({});
    setApplicationTarget(opportunity);
    setDetails(null);
  };

  const submitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicationTarget) return;
    const questions = applicationTarget.requiredQuestions || [];
    const missingAnswer = questions.find((question) => !applicationAnswers[question]?.trim());
    const missingDocument = (applicationTarget.requiredDocuments || []).find((document) => !applicationDocuments[document]);
    const proposedPrice = Number(applicant.expectedPrice.replace(/[^\d]/g, ''));
    if (!Number.isSafeInteger(proposedPrice) || proposedPrice <= 0) {
      notify('Enter a valid proposed price in UGX.');
      return;
    }
    if (missingAnswer) {
      notify(`Please answer: ${missingAnswer}`);
      return;
    }
    if (missingDocument) {
      notify(`Please attach the required ${missingDocument}.`);
      return;
    }
    const application: OpportunityApplication = {
      id: `application-${Date.now()}`,
      opportunityId: applicationTarget.id,
      opportunityTitle: applicationTarget.title,
      applicantName: applicant.name.trim(),
      phone: applicant.phone.trim(),
      email: applicant.email.trim(),
      proposal: applicant.proposal.trim(),
      expectedPrice: formatMoney(proposedPrice),
      availability: applicant.availability,
      answers: applicationAnswers,
      documents: applicationDocuments,
      submittedAt: new Date().toISOString(),
    };
    setApplications((current) => [...current, application]);
    setApplicationTarget(null);
    notify('Application submitted on this device. It has not been sent to the employer.');
  };

  const submitOpportunity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title || !description) return;
    const numericBudget = draft.budget.trim() ? Number(draft.budget.replace(/[^\d]/g, '')) : null;
    if (draft.budget.trim() && (!numericBudget || !Number.isSafeInteger(numericBudget))) {
      notify('Enter a valid budget amount in UGX.');
      return;
    }
    const newOpportunity: Opportunity = {
      id: `user-${Date.now()}`,
      title,
      description,
      type: draft.type,
      category: draft.category,
      location: draft.location,
      distance: 'Local opportunity',
      budget: numericBudget,
      budgetLabel: numericBudget ? formatMoney(numericBudget) : 'Request a quote',
      budgetType: numericBudget ? draft.budgetType : 'Quote requested',
      urgency: draft.urgency,
      posted: 'Posted just now',
      requester: userRole === 'provider' ? 'HomiCare Provider' : userRole === 'admin' ? 'HomiCare Admin' : 'HomiCare Member',
      requesterRole: userRole === 'provider' ? 'Service Provider' : userRole === 'admin' ? 'Administrator' : 'Member',
      requesterRating: 'New',
      requesterReviews: 0,
      image: draft.category === 'Plumbing' ? '/doc1-images/image3.jpeg'
        : draft.category === 'Electrical' ? '/doc1-images/image4.jpeg'
          : draft.category === 'Cleaning' ? '/doc1-images/image2.jpeg'
            : draft.category === 'Solar Energy' ? '/doc1-images/image12.jpeg'
              : '/doc1-images/image14.jpeg',
      tags: [draft.category, draft.urgency === 'Normal' ? draft.type : draft.urgency],
      requiredQuestions: employerQuestions,
      requiredDocuments: employerDocuments,
    };
    setAllowPersistence(true);
    setOpportunities((current) => [newOpportunity, ...current]);
    setSection(newOpportunity.type);
    setLocation(newOpportunity.location);
    setCategory('All Categories');
    setQuery('');
    setPostOpen(false);
    setEmployerQuestions([]);
    setEmployerDocuments([]);
    setCustomQuestion('');
    setDraft({ type: 'Service Request', title: '', description: '', category: 'Plumbing', location: 'Arua City', budget: '', budgetType: 'Negotiable', urgency: 'Normal' });
    notify(`Opportunity posted in ${newOpportunity.type}`);
  };

  const addEmployerQuestion = () => {
    const question = customQuestion.trim();
    if (!question || employerQuestions.includes(question)) return;
    setEmployerQuestions((current) => [...current, question]);
    setCustomQuestion('');
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_250px] lg:px-6">
        <main className="min-w-0 space-y-3">
          <header className="relative min-h-[145px] overflow-hidden rounded-xl border border-orange-100 bg-orange-50 px-5 py-5 sm:min-h-[170px] sm:px-7">
            <img src="/doc1-images/image14.jpeg" alt="" className="absolute inset-y-0 right-0 h-full w-2/3 object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50 via-orange-50/95 to-orange-50/20" />
            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700">Opportunities</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Find Real Opportunities</h1>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-700 sm:text-sm">Discover jobs, contracts, tenders and service requests from homeowners, businesses and communities.</p>
              <div className="mt-4 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                <HeroBenefit icon={Wrench} title="Get Paid Work" subtitle="Verified requests" />
                <HeroBenefit icon={BriefcaseBusiness} title="Grow Your Skills" subtitle="Training & learning" />
                <HeroBenefit icon={Users} title="Build Network" subtitle="Connect & collaborate" />
                <HeroBenefit icon={ShieldCheck} title="Trusted & Secure" subtitle="Verified clients" />
              </div>
            </div>
          </header>

          <nav aria-label="Opportunity sections" className="flex gap-1.5 overflow-x-auto pb-1">
            {sections.map((item) => {
              const Icon = item.icon;
              return <button key={item.label} onClick={() => setSection(item.label)} aria-current={section === item.label ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold transition ${section === item.label ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50'}`}><Icon className="h-3.5 w-3.5" />{item.label === 'Service Request' ? 'Service Requests' : item.label === 'Job & Contract' ? 'Jobs & Contracts' : item.label === 'Tender' ? 'Tenders' : item.label === 'Partnership' ? 'Partnerships' : item.label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${section === item.label ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{item.count + opportunities.filter((opp) => !opp.id.startsWith('sample-') && (item.label === 'All Opportunities' || opp.type === item.label)).length}</span></button>;
            })}
          </nav>

          <section className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <label className="flex min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search opportunities (e.g. plumber, electrician, cleaning...)" className="min-w-0 flex-1 text-xs outline-none" /></label>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><MapPin className="h-3.5 w-3.5 text-orange-600" /><select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} className="max-w-28 bg-transparent outline-none"><option>All Locations</option>{locations.slice(1).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="h-3 w-3 text-slate-400" /></label>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" /><select aria-label="Sort opportunities" value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none"><option>Newest First</option><option>Highest Budget</option><option>Urgency</option></select></label>
            <button onClick={() => setPostOpen(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-600"><Plus className="h-4 w-4" /> Post Opportunity</button>
          </section>

          {storageError && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{storageError} Your current listings are still available in this page.</p>}
          <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">{sectionHeading(section)}</h2><span className="text-[10px] text-slate-500">{filtered.length} matching listings</span></div>
          <div className="space-y-2.5">
            {filtered.length ? filtered.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} saved={savedIds.includes(opportunity.id)} applied={applications.some((application) => application.opportunityId === opportunity.id)} onSave={() => setSavedIds((current) => current.includes(opportunity.id) ? current.filter((id) => id !== opportunity.id) : [...current, opportunity.id])} onDetails={() => setDetails(opportunity)} onApply={() => openApplication(opportunity)} />) : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-sm font-bold">No opportunities match those filters</h3><p className="mt-1 text-xs text-slate-500">Adjust your search, filters or location to see more opportunities.</p><button onClick={() => { setSection('All Opportunities'); setCategory('All Categories'); setLocation('All Locations'); setBudget('Any Budget'); setUrgencies(urgencyOptions); setQuery(''); }} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Clear filters</button></div>}
          </div>
          {applicationError && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{applicationError}</p>}
        </main>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-extrabold"><Filter className="h-4 w-4 text-orange-600" />Quick Filters</h2><button onClick={() => { setCategory('All Categories'); setLocation('All Locations'); setBudget('Any Budget'); setUrgencies(urgencyOptions); }} className="text-[10px] font-semibold text-blue-600">Clear all</button></div>
            <fieldset><legend className="mb-1.5 text-[10px] font-bold">Opportunity Type</legend>{sections.slice(1).map((item) => <label key={item.label} className="flex items-center gap-2 py-1 text-[10px]"><input type="checkbox" checked={section === item.label} onChange={(event) => setSection(event.target.checked ? item.label : 'All Opportunities')} className="accent-orange-500" />{item.label === 'Service Request' ? 'Service Requests' : item.label === 'Job & Contract' ? 'Jobs & Contracts' : `${item.label}s`}<span className="ml-auto text-slate-400">{item.count}</span></label>)}</fieldset>
            <label className="mt-2 block text-[10px] font-bold">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-[10px] font-normal"><option>All Categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="mt-2 block text-[10px] font-bold">Budget Range<select value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-[10px] font-normal"><option>Any Budget</option><option>Under UGX 100,000</option><option>UGX 100,000–500,000</option><option>UGX 500,000–1,000,000</option><option>UGX 1,000,000+</option></select></label>
            <fieldset className="mt-2"><legend className="mb-1 text-[10px] font-bold">Urgency</legend>{urgencyOptions.map((item) => <label key={item} className="flex items-center gap-2 py-1 text-[10px]"><input type="checkbox" checked={urgencies.includes(item)} onChange={() => setUrgencies((current) => current.includes(item) ? current.filter((urgency) => urgency !== item) : [...current, item])} className="accent-orange-500" /><span className={`h-2 w-2 rounded-full ${item === 'Normal' ? 'bg-green-500' : item === 'Urgent' ? 'bg-red-500' : 'bg-orange-500'}`} />{item}</label>)}</fieldset>
            <button onClick={() => notify('Opportunity filters applied')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-[11px] font-bold text-white hover:bg-orange-600"><SlidersHorizontal className="h-3.5 w-3.5" />Apply Filters</button>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold"><Flame className="h-4 w-4 text-orange-500" />Top Opportunities</h2>
            {[['Plumbing', 28, 'green'], ['Electrical', 24, 'blue'], ['Cleaning', 18, 'purple'], ['Solar Energy', 12, 'orange'], ['Construction', 10, 'slate']].map(([name, count, color]) => <button key={String(name)} onClick={() => { setCategory(String(name)); setSection('All Opportunities'); }} className="flex w-full items-center gap-2 border-t border-slate-100 py-2 text-left text-[10px]"><span className={`h-2 w-2 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : color === 'orange' ? 'bg-orange-500' : 'bg-slate-500'}`} /><span className="flex-1">{name}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold">{count}</span></button>)}
          </section>
          <section className="rounded-xl border border-orange-100 bg-orange-50 p-3.5"><h2 className="text-xs font-extrabold">Are you a provider?</h2><p className="mt-1 text-[10px] leading-relaxed text-slate-600">Find exciting jobs and partnerships on HomiCare.</p><button onClick={() => setPostOpen(true)} className="mt-3 w-full rounded-lg bg-orange-500 px-3 py-2.5 text-[10px] font-bold text-white">Post an Opportunity <ArrowRight className="ml-1 inline h-3 w-3" /></button></section>
          {savedIds.length > 0 && <section className="rounded-xl border border-blue-100 bg-blue-50 p-3"><h2 className="text-xs font-bold">Saved Opportunities</h2><p className="mt-1 text-[10px] text-slate-600">{savedIds.length} listing{savedIds.length === 1 ? '' : 's'} saved during this visit.</p></section>}
          {applications.length > 0 && <section className="rounded-xl border border-green-100 bg-green-50 p-3"><h2 className="text-xs font-bold">My Applications</h2><p className="mt-1 text-[10px] text-slate-600">{applications.length} application{applications.length === 1 ? '' : 's'} submitted on this device.</p></section>}
        </aside>
      </div>

      {postOpen && <Modal title="Post an Opportunity" onClose={() => setPostOpen(false)}>
        <form onSubmit={submitOpportunity} className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">Choose the section that best fits your listing. Your opportunity will appear under that section.</p>
          <label className="block text-xs font-bold">Opportunity section<select value={draft.type} onChange={(event) => { const type = event.target.value as OpportunityType; setDraft((current) => ({ ...current, type, budgetType: defaultBudgetType(type) })); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal">{sections.slice(1).map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
          <label className="block text-xs font-bold">Title<input required maxLength={100} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Need a plumber to repair a water tank" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
          <label className="block text-xs font-bold">Description<textarea required maxLength={1500} rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the work, scope, requirements and timing..." className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">Service category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-xs font-bold">Location<select value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal">{locations.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-xs font-bold">Budget in UGX (optional)<input inputMode="numeric" value={draft.budget} onChange={(event) => setDraft((current) => ({ ...current, budget: event.target.value }))} placeholder="e.g. 80000" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
            <label className="text-xs font-bold">Budget type<select value={draft.budgetType} onChange={(event) => setDraft((current) => ({ ...current, budgetType: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option>Negotiable</option><option>Fixed budget</option><option>Monthly contract</option><option>Project budget</option><option>Tender budget</option><option>Request a quote</option></select></label>
            <label className="text-xs font-bold sm:col-span-2">Urgency<select value={draft.urgency} onChange={(event) => setDraft((current) => ({ ...current, urgency: event.target.value as Urgency }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal">{urgencyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <section className="rounded-xl border border-slate-200 p-3">
            <h3 className="text-xs font-extrabold">Application requirements</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Applicants must answer the questions you select and attach each selected document before submitting.</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{standardQuestions.map((question) => <label key={question} className="flex items-start gap-2 text-[10px] text-slate-700"><input type="checkbox" checked={employerQuestions.includes(question)} onChange={() => setEmployerQuestions((current) => current.includes(question) ? current.filter((item) => item !== question) : [...current, question])} className="mt-0.5 accent-orange-500" />{question}</label>)}</div>
            {employerQuestions.filter((question) => !standardQuestions.includes(question)).map((question) => <div key={question} className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-[10px]">{question}<button type="button" onClick={() => setEmployerQuestions((current) => current.filter((item) => item !== question))} aria-label={`Remove ${question}`}><X className="h-3.5 w-3.5 text-slate-500" /></button></div>)}
            <div className="mt-2 flex gap-2"><input value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addEmployerQuestion(); } }} maxLength={120} placeholder="Add a required question for applicants" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] outline-none focus:border-orange-400" /><button type="button" onClick={addEmployerQuestion} disabled={!customQuestion.trim()} className="rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold disabled:opacity-50">Add</button></div>
            <h4 className="mt-3 text-[10px] font-bold">Required documents</h4>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2">{documentOptions.map((document) => <label key={document} className="flex items-center gap-2 text-[10px] text-slate-700"><input type="checkbox" checked={employerDocuments.includes(document)} onChange={() => setEmployerDocuments((current) => current.includes(document) ? current.filter((item) => item !== document) : [...current, document])} className="accent-orange-500" />{document}</label>)}</div>
          </section>
          <p className="rounded-lg bg-amber-50 p-2.5 text-[10px] leading-relaxed text-amber-900"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Listings are saved on this device only. HomiCare does not yet send them to other users or verify posts.</p>
          <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setPostOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={!draft.title.trim() || !draft.description.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Publish opportunity</button></div>
        </form>
      </Modal>}
      {details && <Modal title="Opportunity details" onClose={() => setDetails(null)}>
        <div className="space-y-3">
          <img src={details.image} alt="" className="h-36 w-full rounded-xl object-cover" />
          <span className="inline-block rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">{details.type}</span>
          <h3 className="text-lg font-extrabold">{details.title}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{details.description}</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><p><MapPin className="mr-1 inline h-3.5 w-3.5 text-orange-600" />{details.location}</p><p><CalendarDays className="mr-1 inline h-3.5 w-3.5 text-orange-600" />{details.posted}</p><p><BriefcaseBusiness className="mr-1 inline h-3.5 w-3.5 text-orange-600" />{details.category}</p><p><span className={`rounded-full px-2 py-0.5 ${urgencyStyle(details.urgency)}`}>{details.urgency}</span></p></div>
          <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><div><p className="text-[10px] text-slate-500">{details.budgetType}</p><p className="text-base font-extrabold text-green-700">{details.budgetLabel}</p></div><div className="text-right"><p className="flex items-center justify-end gap-1 text-xs font-bold">{details.requester}{details.requesterRating !== 'New' && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}</p><p className="mt-1 text-[10px] text-slate-500">{details.requesterRole}{details.requesterReviews ? ` · ★ ${details.requesterRating} (${details.requesterReviews} reviews)` : ''}</p></div></div>
          <button onClick={() => openApplication(details)} disabled={applications.some((application) => application.opportunityId === details.id)} className="w-full rounded-lg bg-orange-500 py-2.5 text-xs font-bold text-white disabled:bg-green-600">{applications.some((application) => application.opportunityId === details.id) ? 'Application submitted' : 'Apply now'}</button>
        </div>
      </Modal>}
      {applicationTarget && <Modal title="Apply for this opportunity" onClose={() => setApplicationTarget(null)}>
        <form onSubmit={submitApplication} className="space-y-3">
          <div className="rounded-xl bg-orange-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">{applicationTarget.type}</p><h3 className="mt-1 text-sm font-extrabold">{applicationTarget.title}</h3><p className="mt-1 text-[10px] text-slate-600">{applicationTarget.location} · {applicationTarget.budgetLabel}</p></div>
          <p className="text-xs leading-relaxed text-slate-600">Complete your contact and proposal details, then answer every requirement the employer added.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">Full name<input required maxLength={100} autoComplete="name" value={applicant.name} onChange={(event) => setApplicant((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
            <label className="text-xs font-bold">Phone number<input required type="tel" autoComplete="tel" maxLength={30} value={applicant.phone} onChange={(event) => setApplicant((current) => ({ ...current, phone: event.target.value }))} placeholder="+256..." className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
            <label className="text-xs font-bold sm:col-span-2">Email address<input required type="email" autoComplete="email" maxLength={150} value={applicant.email} onChange={(event) => setApplicant((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
            <label className="text-xs font-bold">Your proposed price (UGX)<input required inputMode="numeric" value={applicant.expectedPrice} onChange={(event) => setApplicant((current) => ({ ...current, expectedPrice: event.target.value }))} placeholder="e.g. 75000" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
            <label className="text-xs font-bold">Availability<select required value={applicant.availability} onChange={(event) => setApplicant((current) => ({ ...current, availability: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option value="">Choose availability</option><option>Available now</option><option>Available tomorrow</option><option>Available this week</option><option>Available next week</option><option>Discuss availability</option></select></label>
          </div>
          <label className="block text-xs font-bold">Proposal / cover note<textarea required minLength={10} maxLength={2000} rows={4} value={applicant.proposal} onChange={(event) => setApplicant((current) => ({ ...current, proposal: event.target.value }))} placeholder="Explain why you are suitable, how you would do the work and your estimated completion time." className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
          {(applicationTarget.requiredQuestions || []).length > 0 && <section className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
            <h4 className="text-xs font-extrabold">Employer-required details</h4>
            {(applicationTarget.requiredQuestions || []).map((question) => <label key={question} className="block text-xs font-semibold">{question}<textarea required maxLength={1000} rows={2} value={applicationAnswers[question] || ''} onChange={(event) => setApplicationAnswers((current) => ({ ...current, [question]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>)}
          </section>}
          {(applicationTarget.requiredDocuments || []).length > 0 && <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <h4 className="text-xs font-extrabold">Required attachments</h4>
            {(applicationTarget.requiredDocuments || []).map((document) => <label key={document} className="block text-xs font-semibold">{document} <span className="text-red-600">*</span><span className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-[10px] font-normal text-slate-600"><Upload className="h-4 w-4 text-blue-600" />{applicationDocuments[document] || 'Choose a file'}<input required type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { notify('Each application attachment must be under 5 MB.'); event.currentTarget.value = ''; return; } setApplicationDocuments((current) => ({ ...current, [document]: file.name })); }} className="ml-auto max-w-[180px] text-[9px]" /></span></label>)}
            <p className="text-[10px] leading-relaxed text-slate-600">Attachments are selected on this device only and are not uploaded to the employer.</p>
          </section>}
          <p className="rounded-lg bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-green-700" />Your application is stored in this browser only. This prototype does not send your details or attachments to the employer.</p>
          <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setApplicationTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={!applicant.name.trim() || !applicant.phone.trim() || !applicant.email.trim() || !applicant.expectedPrice.trim() || !applicant.availability || applicant.proposal.trim().length < 10 || (applicationTarget.requiredQuestions || []).some((question) => !applicationAnswers[question]?.trim()) || (applicationTarget.requiredDocuments || []).some((document) => !applicationDocuments[document])} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Submit Application</button></div>
        </form>
      </Modal>}
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">{notice}</div>}
    </div>
  );
}

function HeroBenefit({ icon: Icon, title, subtitle }: { icon: typeof Wrench; title: string; subtitle: string }) {
  return <div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/85 text-orange-600"><Icon className="h-4 w-4" /></span><span><span className="block text-[9px] font-extrabold leading-tight">{title}</span><span className="mt-0.5 block text-[8px] text-slate-600">{subtitle}</span></span></div>;
}

function OpportunityCard({ opportunity, saved, applied, onSave, onDetails, onApply }: {
  opportunity: Opportunity;
  saved: boolean;
  applied: boolean;
  onSave: () => void;
  onDetails: () => void;
  onApply: () => void;
}) {
  const typeColor = opportunity.type === 'Service Request' ? 'bg-green-600' : opportunity.type === 'Tender' ? 'bg-purple-600' : opportunity.type === 'Partnership' ? 'bg-orange-600' : 'bg-blue-600';
  return <article className="grid gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:grid-cols-[118px_minmax(0,1fr)_120px_150px] sm:items-center">
    <div className="relative h-28 overflow-hidden rounded-lg bg-slate-100 sm:h-[98px]"><img src={opportunity.image} alt="" className="h-full w-full object-cover" /><span className={`absolute left-1.5 top-1.5 rounded-md px-2 py-1 text-[9px] font-bold text-white ${typeColor}`}>{opportunity.type}</span></div>
    <div className="min-w-0 self-start sm:self-center">
      <h3 className="text-sm font-extrabold leading-snug">{opportunity.title}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500"><span><MapPin className="mr-0.5 inline h-3 w-3" />{opportunity.location}</span><span>⌖ {opportunity.distance}</span><span><Clock3 className="mr-0.5 inline h-3 w-3" />{opportunity.posted}</span></p>
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-slate-600">{opportunity.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">{opportunity.tags.map((tag) => <span key={tag} className={`rounded-full px-2 py-1 text-[9px] font-semibold ${tag === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-purple-50 text-purple-700'}`}>{tag}</span>)}</div>
    </div>
    <div className="flex flex-row items-center justify-between gap-2 sm:flex-col">
    <div className="min-w-24 rounded-lg bg-green-50 px-3 py-2 text-center"><p className="text-[9px] font-semibold text-green-700">{opportunity.budgetType}</p><p className="mt-0.5 text-xs font-extrabold text-green-700">{opportunity.budgetLabel}</p></div>
      <div className="flex gap-1.5 sm:w-full sm:flex-col"><button onClick={onDetails} className="rounded-lg bg-orange-500 px-3 py-2 text-[10px] font-bold text-white hover:bg-orange-600">View Details <ArrowRight className="ml-1 inline h-3 w-3" /></button><button onClick={onApply} disabled={applied} className="rounded-lg border border-orange-200 px-3 py-2 text-[10px] font-bold text-orange-700 hover:bg-orange-50 disabled:border-green-200 disabled:text-green-700">{applied ? <><Check className="mr-1 inline h-3 w-3" />Interested</> : 'Apply Now'}</button></div>
    </div>
    <div className="flex items-center gap-2 border-t border-slate-100 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-800">{opportunity.requester.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{opportunity.requester}</p><p className="truncate text-[9px] text-slate-500">{opportunity.requesterRole}</p><p className="mt-1 text-[9px] text-amber-600">{opportunity.requesterRating === 'New' ? 'New member' : `★ ${opportunity.requesterRating} (${opportunity.requesterReviews} reviews)`}</p></div><button onClick={onSave} aria-label={saved ? 'Remove saved opportunity' : 'Save opportunity'} className={`self-start rounded p-1 ${saved ? 'text-orange-600' : 'text-slate-400 hover:text-orange-600'}`}><Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
  </article>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3.5"><h2 className="text-sm font-extrabold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></header><div className="p-4">{children}</div></section></div>;
}
