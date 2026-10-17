import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, Award, BadgeCheck, BriefcaseBusiness, Building2, Check, ChevronRight,
  CircleUserRound, Clock3, Copy, Download, Eye, FileBadge, FileText, FolderKanban,
  GraduationCap, Languages, Link2, MapPin, Plus, QrCode, Save, Share2, ShieldCheck,
  Star, Trash2, UserRound, Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import type {
  CvAchievement, CvCredential, CvEducation, CvLanguage, CvWorkExperience,
  PortfolioProject, Provider, ProviderCvProfile, ProviderCvReference,
} from '@/types';

type Section =
  | 'Overview' | 'My CV' | 'CV Builder' | 'My Portfolio' | 'Reputation'
  | 'Public Profile' | 'Share Profile' | 'Analytics' | 'Privacy & Settings'
  | 'Experience' | 'Education' | 'Skills' | 'Certifications' | 'Licenses'
  | 'Achievements' | 'Languages' | 'References' | 'Templates';

const navigation: { label: Section; icon: typeof FileText; group: string }[] = [
  { label: 'Overview', icon: Activity, group: 'CV & portfolio' },
  { label: 'My CV', icon: FileText, group: 'CV' },
  { label: 'CV Builder', icon: Save, group: 'CV' },
  { label: 'Experience', icon: BriefcaseBusiness, group: 'Professional profile' },
  { label: 'Education', icon: GraduationCap, group: 'Professional profile' },
  { label: 'Skills', icon: Wrench, group: 'Professional profile' },
  { label: 'Certifications', icon: BadgeCheck, group: 'Professional profile' },
  { label: 'Licenses', icon: FileBadge, group: 'Professional profile' },
  { label: 'Achievements', icon: Award, group: 'Professional profile' },
  { label: 'Languages', icon: Languages, group: 'Professional profile' },
  { label: 'References', icon: UserRound, group: 'Professional profile' },
  { label: 'Templates', icon: FileText, group: 'CV' },
  { label: 'My Portfolio', icon: FolderKanban, group: 'Portfolio' },
  { label: 'Reputation', icon: Star, group: 'Portfolio' },
  { label: 'Public Profile', icon: CircleUserRound, group: 'Profile' },
  { label: 'Share Profile', icon: Share2, group: 'Profile' },
  { label: 'Analytics', icon: Activity, group: 'Profile' },
  { label: 'Privacy & Settings', icon: ShieldCheck, group: 'Profile' },
];

const emptyCv = (providerId: string): ProviderCvProfile => ({
  provider_id: providerId,
  summary: '',
  experiences: [],
  education: [],
  skills: [],
  certifications: [],
  licenses: [],
  achievements: [],
  languages: [],
  template: 'Service Professional',
  is_published: false,
  updated_at: new Date().toISOString(),
});

type CvEntry = CvWorkExperience | CvEducation | CvCredential | CvAchievement | CvLanguage;
type CvListKey = 'experiences' | 'education' | 'certifications' | 'licenses' | 'achievements' | 'languages';

const experienceFields = [
  ['title', 'Job title'], ['company', 'Company / organization'], ['location', 'Location'],
  ['start_date', 'Start date'], ['end_date', 'End date'],
] as const;
const educationFields = [
  ['qualification', 'Qualification'], ['institution', 'Institution'], ['field', 'Field of study'],
  ['start_year', 'Start year'], ['end_year', 'Completion year'], ['grade', 'Grade'],
] as const;
const credentialFields = [
  ['name', 'Certificate / license name'], ['issuer', 'Issuing institution'],
  ['issued_on', 'Issue date'], ['expires_on', 'Expiry date'], ['status', 'Verification status'],
] as const;
const achievementFields = [
  ['title', 'Achievement'], ['issuer', 'Awarded by'], ['awarded_on', 'Date'], ['description', 'Description'],
] as const;
const languageFields = [
  ['name', 'Language'], ['proficiency', 'Proficiency'],
] as const;
const referenceFields = [
  ['name', 'Reference name'], ['role', 'Role'], ['organization', 'Organization'],
  ['phone', 'Phone'], ['email', 'Email'],
] as const;

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4"><h2 className="text-base font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
    {children}
  </section>;
}

export function CvPortfolioPage() {
  const { setCurrentPage, setSelectedProviderId } = useApp();
  const [section, setSection] = useState<Section>('Overview');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [profileMediaId, setProfileMediaId] = useState('');
  const [cv, setCv] = useState<ProviderCvProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [references, setReferences] = useState<ProviderCvReference[]>([]);
  const [hasAccountSession, setHasAccountSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [skillDraft, setSkillDraft] = useState('');
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [projectDraft, setProjectDraft] = useState({ title: '', category: '', description: '', location: '', completion_date: '', services: '', project_value: '' });
  const [projectFiles, setProjectFiles] = useState<{ before: File | null; during: File | null; after: File | null }>({ before: null, during: null, after: null });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    setIsOwner(false);
    setProfileMediaId('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError;
      setHasAccountSession(Boolean(authData.user));
      let providerRecord: Provider | null = null;
      let isOwner = false;
      if (authData.user) {
        const { data, error: providerError } = await supabase.from('providers').select('*').eq('user_id', authData.user.id).maybeSingle();
        if (providerError) throw providerError;
        providerRecord = data;
        isOwner = Boolean(data);
      }
      if (!providerRecord) {
        const { data, error: directoryError } = await supabase.from('public_provider_profiles').select('*').order('rating', { ascending: false }).limit(1).maybeSingle();
        if (directoryError) throw directoryError;
        providerRecord = data;
      }
      if (!providerRecord) {
        setProvider(null);
        setCv(null);
        setProjects([]);
        setReferences([]);
        setError('No provider profile is available yet. Create a provider profile before building a professional CV.');
        return;
      }
      setProvider(providerRecord);
      setIsOwner(isOwner);
      if (isOwner && authData.user) {
        const { data: ownerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('public_id')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        setProfileMediaId(ownerProfile?.public_id || '');
      }
      const [cvResult, projectResult] = await Promise.all([
        supabase.from('provider_cv_profiles').select('*').eq('provider_id', providerRecord.id).maybeSingle(),
        supabase.from('public_provider_portfolio').select('*').eq('provider_id', providerRecord.id).order('created_at', { ascending: false }),
      ]);
      if (cvResult.error && !/provider_cv_profiles|schema cache|does not exist/i.test(cvResult.error.message)) throw cvResult.error;
      if (projectResult.error) throw projectResult.error;
      const loadedCv = (cvResult.data as ProviderCvProfile | null) || emptyCv(providerRecord.id);
      if (!loadedCv.summary && providerRecord.bio) loadedCv.summary = providerRecord.bio;
      if (!loadedCv.skills?.length && providerRecord.skills?.length) loadedCv.skills = providerRecord.skills;
      setCv(loadedCv);
      setSummaryDraft(loadedCv.summary);
      setProjects(projectResult.data || []);
      if (isOwner) {
        const { data: referenceData, error: referenceError } = await supabase.from('provider_cv_references').select('*').eq('provider_id', providerRecord.id).order('created_at');
        if (referenceError && !/provider_cv_references|schema cache|does not exist/i.test(referenceError.message)) throw referenceError;
        setReferences(referenceData || []);
      } else {
        setReferences([]);
      }
      if (cvResult.error && !cvResult.data) {
        setError('Your CV database migration is not applied yet. Profile details below use your existing provider record; CV changes cannot be saved until the provider CV migration is applied.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CV and portfolio data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const publicUrl = useMemo(() => provider ? new URL(`/providers/${encodeURIComponent(provider.id)}`, window.location.origin).toString() : '', [provider]);
  const completedCount = provider?.completed_jobs || 0;
  const verifiedProjects = projects.filter((project) => project.customer_confirmed).length;
  const photoCount = projects.reduce((count, project) => count + Number(Boolean(project.before_image_url)) + Number(Boolean(project.during_image_url)) + Number(Boolean(project.after_image_url)), 0);

  const saveCv = async (updates: Partial<ProviderCvProfile>): Promise<boolean> => {
    if (!provider || !cv || !isOwner) return false;
    const next = { ...cv, ...updates, provider_id: provider.id, updated_at: new Date().toISOString() };
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: saveError } = await supabase.from('provider_cv_profiles').upsert(next, { onConflict: 'provider_id' });
      if (saveError) throw saveError;
      setCv(next);
      setSummaryDraft(next.summary);
      setNotice('CV saved.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CV could not be saved. Apply the provider CV migration and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (key: CvListKey, item: CvEntry) => {
    if (!cv) return false;
    const values = (cv[key] || []) as CvEntry[];
    return saveCv({ [key]: [...values, item] } as Partial<ProviderCvProfile>);
  };

  const removeItem = async (key: CvListKey, id: string) => {
    if (!cv) return;
    const values = (cv[key] || []) as CvEntry[];
    await saveCv({ [key]: values.filter((item) => item.id !== id) } as Partial<ProviderCvProfile>);
  };

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider || !isOwner) return;
    const selectedFiles = Object.values(projectFiles).filter((file): file is File => file !== null);
    if (selectedFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 50 * 1024 * 1024)) {
      setError('Project photos must be JPG, PNG, or WebP files up to 50 MB each.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const uploadedPaths: string[] = [];
    try {
      const uploadedImages: { before_image_url: string | null; during_image_url: string | null; after_image_url: string | null } = {
        before_image_url: editingProject?.before_image_url || null,
        during_image_url: editingProject?.during_image_url || null,
        after_image_url: editingProject?.after_image_url || null,
      };
      for (const stage of ['before', 'during', 'after'] as const) {
        const file = projectFiles[stage];
        if (!file) continue;
        const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
        if (!profileMediaId) throw new Error('Your public profile ID is missing, so project photos cannot be uploaded.');
        const storagePath = `${profileMediaId}/portfolio/${makeId()}/${stage}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('profile-media').upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(storagePath);
        uploadedImages[`${stage}_image_url` as keyof typeof uploadedImages] = storagePath;
      }
      const payload = {
        provider_id: provider.id,
        title: projectDraft.title.trim(),
        category: projectDraft.category.trim(),
        description: projectDraft.description.trim(),
        location: projectDraft.location.trim() || null,
        completion_date: projectDraft.completion_date || null,
        project_value: projectDraft.project_value ? Number(projectDraft.project_value) : null,
        services_performed: projectDraft.services.split(',').map((item) => item.trim()).filter(Boolean),
        ...uploadedImages,
        customer_confirmed: editingProject?.customer_confirmed || false,
      };
      const projectResult = editingProject
        ? await supabase.from('portfolio_projects').update(payload).eq('id', editingProject.id)
        : await supabase.from('portfolio_projects').insert(payload);
      if (projectResult.error) throw projectResult.error;
      if (editingProject) {
        const replacedPaths = [
          editingProject.before_image_url !== uploadedImages.before_image_url ? editingProject.before_image_url : null,
          editingProject.during_image_url !== uploadedImages.during_image_url ? editingProject.during_image_url : null,
          editingProject.after_image_url !== uploadedImages.after_image_url ? editingProject.after_image_url : null,
        ].filter((path): path is string => Boolean(path && !path.includes('://')));
        if (replacedPaths.length) {
          const { error: cleanupError } = await supabase.storage.from('profile-media').remove(replacedPaths);
          if (cleanupError) setError(`Project saved, but old photo files could not be removed: ${cleanupError.message}`);
        }
      }
      setProjectDraft({ title: '', category: '', description: '', location: '', completion_date: '', services: '', project_value: '' });
      setProjectFiles({ before: null, during: null, after: null });
      setEditingProject(null);
      setProjectFormOpen(false);
      setNotice(`Portfolio project ${editingProject ? 'updated' : 'added'}. HomiCare verification is shown only after customer confirmation.`);
      await loadWorkspace();
    } catch (cause) {
      if (uploadedPaths.length) await supabase.storage.from('profile-media').remove(uploadedPaths);
      setError(cause instanceof Error ? cause.message : 'Project could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const editProject = (project: PortfolioProject) => {
    setEditingProject(project);
    setProjectDraft({
      title: project.title,
      category: project.category,
      description: project.description || '',
      location: project.location || '',
      completion_date: project.completion_date || '',
      services: project.services_performed?.join(', ') || '',
      project_value: project.project_value === null ? '' : String(project.project_value),
    });
    setProjectFiles({ before: null, during: null, after: null });
    setProjectFormOpen(true);
  };

  const deleteProject = async (project: PortfolioProject) => {
    if (!window.confirm(`Delete "${project.title}" from your portfolio?`)) return;
    const { error: deleteError } = await supabase.from('portfolio_projects').delete().eq('id', project.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProjects((current) => current.filter((item) => item.id !== project.id));
    const mediaPaths = [project.before_image_url, project.during_image_url, project.after_image_url]
      .filter((path): path is string => Boolean(path && !path.includes('://')));
    if (mediaPaths.length) {
      const { error: storageError } = await supabase.storage.from('profile-media').remove(mediaPaths);
      if (storageError) setError(`Project deleted, but some photo files could not be removed: ${storageError.message}`);
      else setNotice('Portfolio project deleted.');
    } else {
      setNotice('Portfolio project deleted.');
    }
  };

  const saveReference = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider || !isOwner) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase.from('provider_cv_references').insert({
        provider_id: provider.id,
        name: String(form.get('name') || ''),
        role: String(form.get('role') || ''),
        organization: String(form.get('organization') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
      }).select('*').single();
      if (insertError) throw insertError;
      setReferences((current) => [...current, data]);
      formElement.reset();
      setNotice('Reference saved privately. References are not shown on public profiles.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reference could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const deleteReference = async (reference: ProviderCvReference) => {
    const { error: deleteError } = await supabase.from('provider_cv_references').delete().eq('id', reference.id);
    if (deleteError) setError(deleteError.message);
    else setReferences((current) => current.filter((item) => item.id !== reference.id));
  };

  const addSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const skill = skillDraft.trim();
    if (!cv || !skill || cv.skills.includes(skill)) return;
    if (await saveCv({ skills: [...cv.skills, skill] })) setSkillDraft('');
  };

  const downloadCv = () => {
    if (!provider || !cv) return;
    window.print();
  };

  const shareProfile = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setNotice('Professional profile link copied.');
    } catch {
      setError('The profile link could not be copied in this browser.');
    }
  };

  const startProviderProfile = () => {
    if (!provider) return;
    setSelectedProviderId(provider.id);
    setCurrentPage('provider');
  };

  const addStructuredItem = <T extends CvEntry>(
    key: 'experiences' | 'education' | 'certifications' | 'licenses' | 'achievements' | 'languages',
    fields: readonly (readonly [string, string])[],
    createItem: (values: Record<string, string>) => T,
  ) => {
    return <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const values = Object.fromEntries(new FormData(formElement).entries()) as Record<string, string>;
      if (await addItem(key, createItem(values))) formElement.reset();
    }}>
      {fields.map(([field, label]) => field === 'description'
        ? <label key={field} className="block text-xs font-semibold text-slate-700 sm:col-span-2">{label}<textarea name={field} rows={3} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        : <label key={field} className="block text-xs font-semibold text-slate-700">{label}<input name={field} required={['title', 'company', 'qualification', 'institution', 'name'].includes(field)} type={field.includes('date') || field === 'issued_on' || field === 'expires_on' || field === 'awarded_on' ? 'date' : 'text'} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>)}
      {key === 'experiences' && <label className="flex items-center gap-2 text-xs font-medium text-slate-700"><input name="current" type="checkbox" className="accent-orange-600" />I currently work here</label>}
      {key === 'achievements' && <label className="flex items-center gap-2 text-xs font-medium text-slate-700"><input name="verified" type="checkbox" className="accent-orange-600" />Verified by HomiCare or issuer</label>}
      {key === 'languages' && <label className="block text-xs font-semibold text-slate-700">Proficiency<select name="proficiency" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"><option>Native</option><option>Fluent</option><option>Advanced</option><option>Intermediate</option><option>Basic</option></select></label>}
      <div className="sm:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"><Plus className="h-4 w-4" />Add item</button></div>
    </form>;
  };

  const renderItems = <T extends { id: string }>(
    values: T[],
    key: 'experiences' | 'education' | 'certifications' | 'licenses' | 'achievements' | 'languages',
    title: (item: T) => string,
    subtitle: (item: T) => string,
  ) => values.length ? <div className="mb-5 space-y-2">{values.map((item) => <article key={item.id} className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 p-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-700"><Check className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-900">{title(item)}</h3><p className="mt-0.5 text-xs text-slate-600">{subtitle(item)}</p></div>{isOwner && <button aria-label={`Remove ${title(item)}`} onClick={() => void removeItem(key, item.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</article>)}</div> : <p className="mb-4 rounded-md bg-slate-50 p-3 text-xs text-slate-500">No entries added yet.</p>;

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-slate-500">Loading CV and portfolio...</div>;
  if (!provider || !cv) return <div className="mx-auto max-w-3xl px-4 py-12"><Panel title="CV & Portfolio">{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button onClick={() => setCurrentPage(hasAccountSession ? 'provider-onboarding' : 'login')} className="mt-4 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white">{hasAccountSession ? 'Create provider profile' : 'Sign in to manage CV & Portfolio'}</button></Panel></div>;

  const ownerOnlyPage = ['CV Builder', 'Experience', 'Education', 'Skills', 'Certifications', 'Licenses', 'Achievements', 'Languages', 'References', 'Privacy & Settings'].includes(section);
  const body = (() => {
    if (section === 'Overview') return <div className="space-y-3">
      <section className="grid gap-3 rounded-xl border border-orange-100 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px]">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">HomiCare professional identity</p><h1 className="mt-1 text-2xl font-black text-slate-950">CV &amp; Portfolio</h1><p className="mt-1 text-xs font-semibold text-slate-700">Build your professional identity</p><p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-600">Create a CV and portfolio grounded in your skills, work history, and completed projects.</p>
          <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSection('CV Builder')} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />Create CV</button><button onClick={() => { setSection('My Portfolio'); setProjectFormOpen(true); }} className="inline-flex items-center gap-2 rounded-md border border-orange-500 px-4 py-2 text-xs font-bold text-orange-800"><Plus className="h-4 w-4" />Add Portfolio Project</button></div>
        </div>
        <div className="rounded-lg border border-slate-100 p-3"><div className="flex justify-between text-xs font-bold"><span>Profile completion</span><span>{Math.min(100, Math.round([provider.full_name, provider.professional_title, cv.summary, cv.experiences.length, cv.education.length, cv.skills.length, cv.certifications.length].filter(Boolean).length / 7 * 100))}%</span></div><div className="my-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, Math.round([provider.full_name, provider.professional_title, cv.summary, cv.experiences.length, cv.education.length, cv.skills.length, cv.certifications.length].filter(Boolean).length / 7 * 100))}%` }} /></div><ul className="space-y-1 text-[10px] text-slate-600">{[['Personal information', Boolean(provider.full_name)], ['Professional summary', Boolean(cv.summary)], ['Experience', cv.experiences.length > 0], ['Skills', cv.skills.length > 0], ['Education', cv.education.length > 0], ['Certifications', cv.certifications.length > 0], ['References', references.length > 0]].map(([label, done]) => <li key={String(label)} className="flex items-center gap-2"><span className={done ? 'text-emerald-600' : 'text-slate-300'}>{done ? '✓' : '○'}</span>{label}</li>)}</ul><button onClick={() => setSection('CV Builder')} className="mt-3 w-full rounded-md bg-orange-50 px-3 py-2 text-[10px] font-bold text-orange-800">Complete Profile</button></div>
      </section>
      <section className="grid gap-3 rounded-xl border border-orange-100 bg-white p-4 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_minmax(220px,0.8fr)] sm:items-center">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-orange-100 text-xl font-bold text-orange-800">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt="" className="h-full w-full object-cover" /> : provider.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</div>
        <div><h2 className="text-lg font-bold text-slate-950">{provider.full_name}</h2><p className="text-xs text-slate-600">{provider.professional_title}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3" />{provider.location}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="font-bold text-orange-700">★ {provider.rating.toFixed(1)}</span><span className="text-emerald-700">{provider.identity_verified ? '✓ Verified provider' : 'Verification not complete'}</span></div><div className="mt-3 flex gap-2"><button onClick={startProviderProfile} className="rounded-md border border-orange-300 px-3 py-1.5 text-[10px] font-semibold text-orange-800">View Public Profile</button><button onClick={() => setSection('Share Profile')} className="rounded-md border border-orange-300 px-3 py-1.5 text-[10px] font-semibold text-orange-800"><Share2 className="mr-1 inline h-3 w-3" />Share Profile</button></div></div>
        <blockquote className="rounded-lg bg-orange-50 p-4 text-xs leading-relaxed text-slate-700">“{cv.summary || provider.bio || 'Add a professional summary to introduce your services and experience.'}”</blockquote>
      </section>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="My CV" description={`Updated ${cv.updated_at ? new Date(cv.updated_at).toLocaleDateString() : 'not yet'}`}>
          <div className="flex items-center gap-3"><FileText className="h-10 w-10 text-orange-600" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{cv.template} CV</p><p className="text-xs text-slate-500">Status: {cv.is_published ? 'Published' : 'Private draft'}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSection('My CV')} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white"><Eye className="mr-1 inline h-3.5 w-3.5" />Preview</button><button onClick={() => setSection('CV Builder')} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800">Edit</button><button onClick={downloadCv} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800"><Download className="mr-1 inline h-3.5 w-3.5" />Print / Save PDF</button></div>
        </Panel>
        <Panel title="My Portfolio" description="Projects and verified work">
          <div className="grid grid-cols-3 gap-2 text-center">{[{ value: projects.length, label: 'Projects' }, { value: photoCount, label: 'Photos' }, { value: verifiedProjects, label: 'Verified projects' }].map((item) => <div key={item.label} className="rounded-md border border-slate-100 p-3"><p className="text-lg font-black text-slate-900">{item.value}</p><p className="text-[10px] text-slate-500">{item.label}</p></div>)}</div><div className="mt-3 flex gap-2"><button onClick={() => setSection('My Portfolio')} className="flex-1 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">View Portfolio</button><button onClick={() => { setSection('My Portfolio'); setProjectFormOpen(true); }} className="flex-1 rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800">Add Project</button></div>
        </Panel>
        <Panel title="Professional Reputation" description="Based on recorded HomiCare data">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ value: `★ ${provider.rating.toFixed(1)}`, label: `${provider.review_count} reviews` }, { value: completedCount, label: 'Completed services' }, { value: `${provider.on_time_rate}%`, label: 'On-time completion' }, { value: `${provider.response_rate}%`, label: 'Response rate' }].map((item) => <div key={item.label} className="rounded-md bg-orange-50 p-3"><p className="font-bold text-orange-800">{item.value}</p><p className="mt-1 text-[10px] text-slate-600">{item.label}</p></div>)}</div><button onClick={() => setSection('Reputation')} className="mt-3 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">View Reputation</button>
        </Panel>
        <Panel title="Public Profile" description={cv.is_published ? 'Published to customers and employers' : 'Private until you publish your CV'}>
          <div className="truncate text-xs text-slate-600"><Link2 className="mr-1 inline h-3.5 w-3.5" />{publicUrl}</div><div className="mt-3 flex flex-wrap gap-2"><button onClick={startProviderProfile} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">View Profile</button><button onClick={shareProfile} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800"><Copy className="mr-1 inline h-3.5 w-3.5" />Copy Link</button><button onClick={() => setSection('Share Profile')} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800"><QrCode className="mr-1 inline h-3.5 w-3.5" />Share options</button></div>
        </Panel>
      </div>
      <Panel title="Quick Actions">{<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{[['Create CV', 'CV Builder'], ['Add Portfolio Project', 'My Portfolio'], ['Add Certificate', 'Certifications'], ['Add Experience', 'Experience'], ['Share Profile', 'Share Profile'], ['Download PDF', 'My CV']].map(([label, target]) => <button key={label} onClick={() => { setSection(target as Section); if (target === 'My Portfolio') setProjectFormOpen(true); }} className="rounded-md bg-orange-50 px-3 py-4 text-xs font-semibold text-orange-800 hover:bg-orange-100"><Plus className="mx-auto mb-1 h-4 w-4" />{label}</button>)}</div>}</Panel>
    </div>;

    if (section === 'CV Builder' || section === 'My CV') return <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] print:block">
      {section === 'CV Builder' && <Panel title="CV Builder" description="Edit your professional summary and then add your experience, education, and credentials using the sections in the navigation.">
        <label className="block text-xs font-semibold text-slate-700">Professional summary<textarea value={summaryDraft} maxLength={1000} onChange={(event) => setSummaryDraft(event.target.value)} rows={8} placeholder="Describe your experience, strengths, and the work you do. Keep each claim accurate." className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><p className="mt-1 text-right text-[10px] text-slate-500">{summaryDraft.length}/1,000</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={saving || !isOwner} onClick={() => void saveCv({ summary: summaryDraft })} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="mr-1 inline h-3.5 w-3.5" />Save summary</button><button onClick={() => setSection('Templates')} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800">Choose template</button></div>
      </Panel>}
      <article className="cv-print-area rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="border-b-2 border-orange-500 pb-4"><h1 className="text-2xl font-black text-slate-950">{provider.full_name}</h1><p className="mt-1 text-sm font-semibold text-orange-800">{provider.professional_title}</p><p className="mt-1 text-xs text-slate-500">{provider.location}</p></div>
        {cv.summary && <section className="mt-4"><h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">Professional Summary</h2><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{section === 'CV Builder' ? summaryDraft : cv.summary}</p></section>}
        {cv.experiences.length > 0 && <section className="mt-4"><h2 className="text-xs font-bold uppercase tracking-wide">Experience</h2>{cv.experiences.map((item) => <div key={item.id} className="mt-2"><p className="text-xs font-bold">{item.title} · {item.company}</p><p className="text-[10px] text-slate-500">{item.location} · {item.start_date} – {item.current ? 'Present' : item.end_date}</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.description}</p></div>)}</section>}
        {cv.education.length > 0 && <section className="mt-4"><h2 className="text-xs font-bold uppercase tracking-wide">Education</h2>{cv.education.map((item) => <p key={item.id} className="mt-1 text-xs text-slate-700">{item.qualification}, {item.institution} · {item.start_year}–{item.end_year}</p>)}</section>}
        {cv.skills.length > 0 && <section className="mt-4"><h2 className="text-xs font-bold uppercase tracking-wide">Skills</h2><p className="mt-1 text-xs text-slate-600">{cv.skills.join(' · ')}</p></section>}
        {cv.certifications.length > 0 && <section className="mt-4"><h2 className="text-xs font-bold uppercase tracking-wide">Certifications</h2>{cv.certifications.map((item) => <p key={item.id} className="mt-1 text-xs text-slate-700">{item.name} · {item.issuer} · {item.status || 'Self-reported'}</p>)}</section>}
        {cv.languages.length > 0 && <section className="mt-4"><h2 className="text-xs font-bold uppercase tracking-wide">Languages</h2><p className="mt-1 text-xs text-slate-600">{cv.languages.map((item) => `${item.name} (${item.proficiency})`).join(' · ')}</p></section>}
        <div className="mt-6 border-t border-slate-100 pt-3 text-[9px] text-slate-400">HomiCare CV · Review qualifications and evidence before sharing.</div>
      </article>
      {section === 'My CV' && <div className="flex flex-wrap gap-2 lg:col-span-2"><button onClick={downloadCv} className="rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white"><Download className="mr-1 inline h-4 w-4" />Print / Save PDF</button><button onClick={() => setSection('CV Builder')} className="rounded-md border border-orange-300 px-4 py-2 text-xs font-semibold text-orange-800">Edit CV</button></div>}
    </div>;

    if (section === 'Experience') return <Panel title="Work Experience" description="Add work history. Use dates and achievements you can substantiate.">{renderItems(cv.experiences, 'experiences', (item: CvWorkExperience) => item.title, (item: CvWorkExperience) => `${item.company} · ${item.location} · ${item.start_date}–${item.current ? 'Present' : item.end_date}`)}{isOwner ? addStructuredItem('experiences', experienceFields, (values) => ({ id: makeId(), title: values.title || '', company: values.company || '', location: values.location || '', start_date: values.start_date || '', end_date: values.current === 'on' ? '' : values.end_date || '', current: values.current === 'on', description: values.description || '' })) : <p className="text-xs text-slate-500">Only the profile owner can edit experience.</p>}</Panel>;
    if (section === 'Education') return <Panel title="Education" description="Add qualifications and training. Credentials are not automatically verified.">{renderItems(cv.education, 'education', (item: CvEducation) => item.qualification, (item: CvEducation) => `${item.institution} · ${item.field} · ${item.start_year}–${item.end_year}`)}{isOwner ? addStructuredItem('education', educationFields, (values) => ({ id: makeId(), qualification: values.qualification || '', institution: values.institution || '', field: values.field || '', start_year: values.start_year || '', end_year: values.end_year || '', grade: values.grade || '', description: values.description || '' })) : null}</Panel>;
    if (section === 'Skills') return <Panel title="Skills" description="Skills are self-reported unless supported by a verification record.">{cv.skills.length ? <div className="mb-4 flex flex-wrap gap-2">{cv.skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900">{skill}{isOwner && <button aria-label={`Remove ${skill}`} onClick={() => void saveCv({ skills: cv.skills.filter((item) => item !== skill) })} className="ml-1 text-orange-700">×</button>}</span>)}</div> : <p className="mb-3 text-xs text-slate-500">No skills listed yet.</p>}{isOwner && <form onSubmit={addSkill} className="flex gap-2"><input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} placeholder="Add a skill" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />Add</button></form>}</Panel>;
    if (section === 'Certifications' || section === 'Licenses') {
      const key = section === 'Certifications' ? 'certifications' : 'licenses';
      const values = cv[key];
      return <Panel title={section} description="Added credentials are self-reported. HomiCare does not mark them verified without an approved verification record. Credential numbers are not collected on public CVs.">{renderItems(values, key, (item: CvCredential) => item.name, (item: CvCredential) => `${item.issuer} · ${item.status || 'Self-reported'}${item.expires_on ? ` · Expires ${item.expires_on}` : ''}`)}{isOwner ? addStructuredItem(key, credentialFields, (formValues) => ({ id: makeId(), name: formValues.name || '', issuer: formValues.issuer || '', issued_on: formValues.issued_on || '', expires_on: formValues.expires_on || '', status: 'Self-reported' })) : null}</Panel>;
    }
    if (section === 'Achievements') return <Panel title="Achievements & Awards" description="System-generated HomiCare achievements cannot be manually claimed.">{renderItems(cv.achievements, 'achievements', (item: CvAchievement) => `${item.title}${item.verified ? ' · Verified' : ' · Self-reported'}`, (item: CvAchievement) => `${item.issuer} · ${item.awarded_on}`)}{isOwner ? addStructuredItem('achievements', achievementFields, (values) => ({ id: makeId(), title: values.title || '', issuer: values.issuer || '', awarded_on: values.awarded_on || '', description: values.description || '', verified: false })) : null}</Panel>;
    if (section === 'Languages') return <Panel title="Languages">{renderItems(cv.languages, 'languages', (item: CvLanguage) => item.name, (item: CvLanguage) => item.proficiency)}{isOwner ? addStructuredItem('languages', languageFields, (values) => ({ id: makeId(), name: values.name || '', proficiency: values.proficiency || 'Intermediate' })) : null}</Panel>;
    if (section === 'References') return <Panel title="Professional References" description="References are private and are never exposed on your public profile.">{!isOwner && <p className="text-xs text-slate-500">References are visible only to the provider.</p>}{references.map((item) => <div key={item.id} className="mb-2 flex items-center justify-between rounded-md bg-slate-50 p-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.role} · {item.organization}</p><p className="mt-1 text-xs text-slate-500">{item.phone} {item.email}</p></div><button onClick={() => void deleteReference(item)} aria-label={`Delete reference ${item.name}`} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}{isOwner && <form onSubmit={saveReference} className="grid gap-3 sm:grid-cols-2">{referenceFields.map(([field, label]) => <label key={field} className="block text-xs font-semibold">{label}<input name={field} type={field === 'email' ? 'email' : 'text'} required={field === 'name'} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>)}<button className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />Add private reference</button></form>}</Panel>;
    if (section === 'Templates') return <Panel title="CV Templates" description="Choose how your approved CV details are presented.">{['Professional', 'Modern', 'Technical', 'Service Professional', 'ATS Minimal'].map((template) => <button key={template} onClick={() => void saveCv({ template })} className={`mr-2 mt-2 rounded-md border px-4 py-3 text-left text-sm font-semibold ${cv.template === template ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-slate-200 text-slate-700'}`}>{template}{cv.template === template && <Check className="ml-2 inline h-4 w-4" />}</button>)}</Panel>;
    if (section === 'My Portfolio') return <div className="space-y-4"><Panel title="My Portfolio" description="HomiCare-verified work is identified only after a linked booking is completed and customer-confirmed."><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-600">{projects.length} projects · {photoCount} project images · {verifiedProjects} verified</p>{isOwner && <button onClick={() => setProjectFormOpen((open) => !open)} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" />Add project</button>}</div>
        {projectFormOpen && isOwner && <form onSubmit={saveProject} className="mb-5 grid gap-3 rounded-lg border border-orange-100 bg-orange-50/40 p-3 sm:grid-cols-2">{[['title', 'Project title'], ['category', 'Category'], ['location', 'Location'], ['completion_date', 'Completion date'], ['services', 'Services performed (comma separated)'], ['project_value', 'Project value (UGX)']].map(([key, label]) => <label key={key} className="block text-xs font-semibold text-slate-700">{label}<input value={projectDraft[key as keyof typeof projectDraft]} onChange={(event) => setProjectDraft((current) => ({ ...current, [key]: event.target.value }))} type={key === 'completion_date' ? 'date' : key === 'project_value' ? 'number' : 'text'} min={key === 'project_value' ? '0' : undefined} required={key === 'title' || key === 'category'} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>)}<label className="block text-xs font-semibold text-slate-700 sm:col-span-2">Description<textarea value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>{(['before', 'during', 'after'] as const).map((stage) => <label key={stage} className="block text-xs font-semibold capitalize text-slate-700">{stage} photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProjectFiles((current) => ({ ...current, [stage]: event.target.files?.[0] || null }))} className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-xs file:mr-2 file:border-0 file:bg-slate-100 file:px-2 file:py-2" /><span className="mt-1 block truncate text-[10px] font-normal text-slate-500">{projectFiles[stage]?.name || 'Optional · JPG, PNG, WebP · max 50 MB'}</span></label>)}<div className="flex gap-2"><button disabled={saving} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : editingProject ? 'Save Changes' : 'Save Project'}</button><button type="button" onClick={() => { setProjectFormOpen(false); setEditingProject(null); setProjectFiles({ before: null, during: null, after: null }); setProjectDraft({ title: '', category: '', description: '', location: '', completion_date: '', services: '', project_value: '' }); }} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button></div></form>}
        {projects.length === 0 ? <p className="rounded-md bg-slate-50 p-5 text-center text-xs text-slate-500">No portfolio projects yet. Add completed work with an accurate description and photos.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <article key={project.id} className="overflow-hidden rounded-lg border border-slate-100"><div className="grid aspect-[16/7] grid-cols-3 gap-0.5 bg-slate-100">{[project.before_image_url, project.during_image_url, project.after_image_url].map((url, index) => url ? <ProfileMediaImage key={index} source={url} alt={`${project.title} ${['before', 'during', 'after'][index]}`} className="h-full w-full object-cover" /> : <div key={index} className="grid place-items-center text-[9px] text-slate-400">{['Before', 'During', 'After'][index]}</div>)}</div><div className="p-3"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold">{project.title}</h3>{isOwner && <div className="flex shrink-0 gap-1"><button onClick={() => editProject(project)} aria-label={`Edit ${project.title}`} className="rounded px-2 py-1 text-[10px] font-semibold text-orange-800 hover:bg-orange-50">Edit</button><button onClick={() => void deleteProject(project)} aria-label={`Delete ${project.title}`} className="rounded px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50">Delete</button></div>}</div><p className="mt-1 text-[10px] text-slate-500">{project.category} · {project.location || provider.location}</p><p className="mt-2 line-clamp-3 text-xs text-slate-600">{project.description || 'No project description supplied.'}</p>{project.project_value !== null && <p className="mt-2 text-[10px] text-slate-500">Project value: UGX {project.project_value.toLocaleString()}</p>}{project.customer_confirmed && <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><BadgeCheck className="h-3 w-3" />Customer-confirmed HomiCare work</span>}</div></article>)}</div>}
      </Panel></div>;
    if (section === 'Reputation') return <Panel title="Professional Reputation" description="These measures are based on HomiCare booking, review, and project records.">{<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Rating', value: `${provider.rating.toFixed(1)} / 5`, icon: Star }, { label: 'Completed services', value: completedCount, icon: BriefcaseBusiness }, { label: 'Customer reviews', value: provider.review_count, icon: BadgeCheck }, { label: 'Verified projects', value: verifiedProjects, icon: ShieldCheck }, { label: 'On-time completion', value: `${provider.on_time_rate}%`, icon: Clock3 }, { label: 'Response rate', value: `${provider.response_rate}%`, icon: Activity }].map((item) => <div key={item.label} className="rounded-lg border border-slate-100 p-4"><item.icon className="h-5 w-5 text-orange-600" /><p className="mt-2 text-xl font-black">{item.value}</p><p className="text-xs text-slate-500">{item.label}</p></div>)}</div>}</Panel>;
    if (section === 'Public Profile') return <Panel title="Public Profile" description="The public profile shows published CV data with your services, reviews, and portfolio."><p className="text-sm font-semibold">{provider.full_name} · {provider.professional_title}</p><p className="mt-1 text-xs text-slate-500">{publicUrl}</p><p className="mt-3 text-xs text-slate-600">{cv.is_published ? 'Your CV is published.' : 'Your CV is not published; public viewers only see existing public provider details.'}</p><div className="mt-4 flex gap-2"><button onClick={startProviderProfile} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">Preview Public Profile</button><button onClick={() => setSection('Privacy & Settings')} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800">Privacy settings</button></div></Panel>;
    if (section === 'Share Profile') return <Panel title="Share Professional Profile" description="Share the public provider profile URL. It respects the provider's publication and visibility settings."><p className="break-all rounded-md bg-slate-50 p-3 text-xs text-slate-700">{publicUrl}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={shareProfile} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white"><Copy className="mr-1 inline h-4 w-4" />Copy link</button><button onClick={async () => { if (navigator.share) { try { await navigator.share({ title: `${provider.full_name} | HomiCare`, text: provider.professional_title, url: publicUrl }); } catch (cause) { if (cause instanceof Error && cause.name !== 'AbortError') setError('Share sheet could not be opened.'); } } else { setError('Native sharing is not available in this browser. Use Copy link instead.'); } }} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800"><Share2 className="mr-1 inline h-4 w-4" />Share</button><button onClick={startProviderProfile} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800"><QrCode className="mr-1 inline h-4 w-4" />Open profile QR options</button></div><p className="mt-3 text-[10px] text-slate-500">A QR image is not generated in this version; the shareable profile link is ready to copy or send.</p></Panel>;
    if (section === 'Analytics') return <Panel title="Profile Analytics" description="Only analytics currently recorded by HomiCare are shown."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Profile views', value: 'Not available' }, { label: 'CV downloads', value: 'Not tracked' }, { label: 'Portfolio views', value: 'Not tracked' }, { label: 'Booking conversions', value: 'Not available' }].map((item) => <div key={item.label} className="rounded-lg bg-slate-50 p-4"><p className="font-bold text-slate-800">{item.value}</p><p className="text-xs text-slate-500">{item.label}</p></div>)}</div><p className="mt-3 text-xs text-slate-500">Analytics are not collected yet; no activity counts are simulated.</p></Panel>;
    if (section === 'Privacy & Settings') return <Panel title="Privacy & Visibility" description="Only publish details you want customers and employers to see."><div className="flex items-center justify-between gap-4 rounded-md border border-slate-100 p-3"><div><p className="text-sm font-semibold">Publish CV on public profile</p><p className="text-xs text-slate-500">Makes your CV summary, experience, education, skills, credentials, and languages visible.</p></div><input type="checkbox" checked={cv.is_published} disabled={!isOwner || saving} onChange={(event) => void saveCv({ is_published: event.target.checked })} className="h-5 w-5 accent-orange-600" /></div><p className="mt-3 text-xs text-slate-500">Private references and credential documents are not included in public profile data. Provider contact details follow existing provider visibility settings.</p></Panel>;
    return <Panel title="Choose a CV template">{['Professional', 'Modern', 'Technical', 'Service Professional', 'ATS Minimal'].map((template) => <button key={template} onClick={() => void saveCv({ template })} className={`mr-2 mt-2 rounded-md border px-4 py-3 text-sm font-semibold ${cv.template === template ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>{template}</button>)}</Panel>;
  })();

  return <div className="min-h-[calc(100dvh-4rem)] bg-slate-50">
    <div className="mx-auto grid max-w-[1500px] gap-3 px-3 py-4 lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-2">
        <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">CV &amp; Portfolio</p>
        {navigation.map((item, index) => <div key={item.label}>{(index === 0 || navigation[index - 1].group !== item.group) && <p className="px-2 pb-1 pt-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">{item.group}</p>}<button onClick={() => setSection(item.label)} aria-current={section === item.label ? 'page' : undefined} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-medium ${section === item.label ? 'bg-orange-600 text-white' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-800'}`}><item.icon className="h-3.5 w-3.5" />{item.label}</button></div>)}
        <button onClick={() => setCurrentPage('provider-dashboard')} className="mt-3 flex w-full items-center gap-2 border-t border-slate-100 px-2 py-3 text-left text-xs font-semibold text-slate-600"><Building2 className="h-4 w-4" />Back to Dashboard</button>
      </aside>
      <main className="min-w-0 space-y-3">
        {error && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}<button onClick={() => void loadWorkspace()} className="ml-2 font-bold underline">Retry</button></p>}
        {notice && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
        {ownerOnlyPage && !isOwner && <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">You are viewing a public provider profile. Sign in as the provider to edit CV information.</p>}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">Professional identity</p><h1 className="mt-1 text-xl font-black text-slate-950">{section}</h1><p className="mt-1 text-xs text-slate-600">{provider.full_name} · {provider.professional_title}</p></div>{section !== 'Overview' && <button onClick={() => setSection('Overview')} className="inline-flex items-center gap-1 text-xs font-semibold text-orange-800">Overview<ChevronRight className="h-3.5 w-3.5" /></button>}</header>
        {body}
        <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-[10px] text-slate-500"><span>Only HomiCare-confirmed records are labeled verified.</span><button onClick={startProviderProfile} className="font-semibold text-orange-800">View public provider profile</button></footer>
      </main>
    </div>
    <style>{'@media print { body * { visibility: hidden; } .cv-print-area, .cv-print-area * { visibility: visible; } .cv-print-area { position: absolute; inset: 0; width: 100%; border: 0; box-shadow: none; } }'}</style>
  </div>;
}
