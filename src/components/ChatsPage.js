'use client';

import { Search, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import { useLanguage } from '@/lib/i18n/context';
import styles from './ChatsPage.module.css';

const FRAMEWORKS = [
  { value: 'playwright_js', label: 'Playwright JavaScript' },
  { value: 'playwright_python', label: 'Playwright Python' },
  { value: 'puppeteer_js', label: 'Puppeteer JavaScript' },
  { value: 'selenium_python', label: 'Selenium Python' },
  { value: 'cypress_js', label: 'Cypress JavaScript' },
];

function getScriptDisplayName(script) {
  if (!script?.target_url) return FRAMEWORKS.find((f) => f.value === script.framework)?.label || 'Script';
  try {
    const hostname = new URL(script.target_url).hostname.replace(/^www\./, '');
    const isRegeneration = (script.prompt || '').includes('Regeneration feedback');
    return isRegeneration ? `${hostname} (revisi)` : hostname;
  } catch {
    return script.target_url;
  }
}

export default function ChatsPage() {
  const { scripts, historyLoading, user, SUPABASE_ENABLED, activeScriptId, setPendingScript } = useWebWeave();
  const { t } = useLanguage();

  const handleNewChat = () => {
    setPendingScript(null);
    window.location.href = '/';
  };

  const handleOpenChat = (script) => {
    setPendingScript(script);
    window.location.href = '/';
  };

  return (
    <div className={styles.chatsView}>
      <header className={styles.chatsHeader}>
        <div>
          <h1 className={styles.chatsTitle}>Chats</h1>
          <p className={styles.chatsSubtitle}>{scripts.length} saved scripts</p>
        </div>
        <div className={styles.chatsHeaderActions}>
          <div className={styles.chatsSearchWrap}>
            <Search size={15} className={styles.chatsSearchIcon} />
            <input
              type="search"
              className={styles.chatsSearchInput}
              placeholder="Search chats..."
            />
          </div>
          <button type="button" className={styles.chatsNewChatBtn} onClick={handleNewChat}>
            <Sparkles size={16} />
            {t('sidebar.newAutomation')}
          </button>
        </div>
      </header>

      <div className={styles.chatsList}>
        {historyLoading && <div className={styles.chatsEmpty}>Loading...</div>}
        {!SUPABASE_ENABLED && <div className={styles.chatsEmpty}>Add Supabase env vars to enable chat history.</div>}
        {SUPABASE_ENABLED && !user && <div className={styles.chatsEmpty}>Sign in to view chat history.</div>}
        {user && !historyLoading && scripts.length === 0 && (
          <div className={styles.chatsEmpty}>No chats yet. Create your first automation.</div>
        )}
        {scripts.map((script) => {
          const isRegen = (script.prompt || '').includes('Regeneration feedback');
          const preview = (script.prompt || '').replace('Regeneration feedback from previous output:', '').substring(0, 80).trim();
          const time = script.created_at ? new Date(script.created_at) : null;
          const timeStr = time ? time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

          return (
            <button key={script.id} type="button" className={`${styles.chatItem} ${activeScriptId === script.id ? styles.chatItemActive : ''}`} onClick={() => handleOpenChat(script)}>
              <div className={styles.chatItemMain}>
                <span className={styles.chatItemName}>
                  {getScriptDisplayName(script)}
                  {isRegen && <RefreshCw size={12} className={styles.revisionIcon} />}
                </span>
                <span className={styles.chatItemPreview}>{preview}</span>
              </div>
              <span className={styles.chatItemTime}>{timeStr}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
