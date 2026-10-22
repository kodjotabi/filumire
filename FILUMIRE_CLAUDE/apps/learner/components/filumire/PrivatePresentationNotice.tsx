"use client";
import { useEffect, useState } from 'react';
import { useLanguage } from './language';

type Scope = { authored: number; mapped: number };

/** Shown only when the server reports the private presentation scope; nothing offline or when disabled. */
export function PrivatePresentationNotice() {
  const [language] = useLanguage();
  const [scope, setScope] = useState<Scope | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/presentation-scope', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!cancelled && result?.enabled) setScope({ authored: result.authored, mapped: result.mapped }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!scope) return null;
  const { authored, mapped } = scope;
  return <aside className="privatePresentationNotice" aria-label={language === 'fr' ? 'Portée de la présentation' : 'Presentation scope'}
    style={{ padding: '10px 16px', background: '#fff5d6', color: '#493b17', fontSize: '14px', textAlign: 'center' }}>
    {language === 'fr'
      ? `Présentation privée — Basic 7–9 : ${authored}/${mapped} activités du programme rédigées et testées. Validation pédagogique et française en attente. Les progrès concernent les activités disponibles.`
      : `Private presentation — Basic 7–9: ${authored}/${mapped} curriculum activities authored and tested. Educational and French approval pending. Progress covers available activities.`}
    <style jsx global>{`
      @media (min-width: 1024px) {
        body:has(.learnerUi) > .privatePresentationNotice { margin-left: var(--filumire-sidebar-width); }
      }
    `}</style>
  </aside>;
}
