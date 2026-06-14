'use client';

import { useState } from 'react';
import { Folder, Plus, Search, ArrowRight, Globe, Clock, FileText, X, Trash2 } from 'lucide-react';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import { useLanguage } from '@/lib/i18n/context';
import styles from './ProjectsPage.module.css';

const FRAMEWORKS = [
  { value: 'playwright_js', label: 'Playwright JavaScript' },
  { value: 'playwright_python', label: 'Playwright Python' },
  { value: 'puppeteer_js', label: 'Puppeteer JavaScript' },
  { value: 'selenium_python', label: 'Selenium Python' },
  { value: 'cypress_js', label: 'Cypress JavaScript' },
];

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || ''; }
}

export default function ProjectsPage() {
  const { projects, scripts, supabase, getAuthHeaders, setSelectedProjectId, loadPrivateData } = useWebWeave();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const searchTerm = search.trim().toLowerCase();
  const visibleProjects = projects.filter((p) => {
    if (!searchTerm) return true;
    return (p.name || '').toLowerCase().includes(searchTerm) || (p.description || '').toLowerCase().includes(searchTerm) || (p.target_domain || '').toLowerCase().includes(searchTerm);
  });

  const handleSelectProject = (project) => {
    window.location.href = `/?project=${encodeURIComponent(project.id)}`;
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its scripts?')) return;
    const headers = await getAuthHeaders().catch(() => null);
    if (!headers) return;
    const res = await fetch(`/api/projects?id=${encodeURIComponent(projectId)}`, { method: 'DELETE', headers });
    if (res.ok) await loadPrivateData();
  };

  const handleNewAutomation = (project) => {
    window.location.href = `/?project=${encodeURIComponent(project?.id || '')}`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), target_domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create project');
      setSelectedProjectId(data.project.id);
      await loadPrivateData();
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewDomain('');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const getScriptCount = (projectId) => scripts.filter((s) => s.project_id === projectId).length;
  const getLastScript = (projectId) => {
    const projectScripts = scripts.filter((s) => s.project_id === projectId);
    if (!projectScripts.length) return null;
    return projectScripts.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} placeholder="Search projects..." />
            {search && <button type="button" className={styles.searchClear} onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </header>

      {projects.length === 0 && !searchTerm ? (
        <div className={styles.emptyState}>
          <Folder size={48} className={styles.emptyIcon} />
          <h2>No projects yet</h2>
          <p>Create a project to organize your automation scripts by client, website, or workflow.</p>
          <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create your first project
          </button>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={48} className={styles.emptyIcon} />
          <h2>No projects match</h2>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleProjects.map((project) => {
            const count = getScriptCount(project.id);
            const lastScript = getLastScript(project.id);
            const timeStr = lastScript ? new Date(lastScript.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No scripts yet';
            const lastPreview = lastScript ? ((lastScript.prompt || '').replace('Regeneration feedback from previous output:', '').substring(0, 60).trim()) : '';

            return (
              <button key={project.id} type="button" className={styles.card} onClick={() => handleSelectProject(project)}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIcon}><Folder size={20} /></div>
                  <div className={styles.cardMeta}>
                    <h3 className={styles.cardName}>{project.name}</h3>
                    {project.target_domain && (
                      <span className={styles.cardDomain}><Globe size={11} /> {extractDomain(project.target_domain)}</span>
                    )}
                  </div>
                  <ArrowRight size={16} className={styles.cardArrow} />
                </div>

                {project.description && <p className={styles.cardDesc}>{project.description}</p>}

                <div className={styles.cardFooter}>
                  <span className={styles.cardStat}><FileText size={13} /> {count} script{count !== 1 ? 's' : ''}</span>
                  <span className={styles.cardStat}><Clock size={13} /> {timeStr}</span>
                </div>

                {lastPreview && <p className={styles.cardPreview}>{lastPreview}</p>}
                <button type="button" className={styles.cardDelete} onClick={(e) => handleDeleteProject(e, project.id)} title="Delete project">
                  <Trash2 size={14} />
                </button>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setShowCreate(false)} />
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>New Project</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Project name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={styles.fieldInput} placeholder="e.g. Client Website QA" autoFocus required maxLength={80} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Target domain (optional)</label>
                <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className={styles.fieldInput} placeholder="e.g. example.com" maxLength={240} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Description (optional)</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={styles.fieldTextarea} placeholder="Brief description of this project..." rows={3} maxLength={500} />
              </div>
              {createError && <p className={styles.fieldError}>{createError}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={creating || !newName.trim()}>{creating ? 'Creating...' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
