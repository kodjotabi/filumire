import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { localizeHref, type Locale } from '@/lib/locale';
import { learnerDestination } from '@/lib/learner-navigation';
export function AccessLink({role,children,className,style,locale='en'}:{role:'learner'|'parent'|'teacher';children:ReactNode;className?:string;style?:CSSProperties;locale?:Locale}) {
 const url=learnerDestination(role === 'learner' ? 'start' : role, locale);
 return url ? <a href={url} className={className} style={style}>{children}</a> : <Link href={localizeHref('/access#'+role,locale)} className={className} style={style}>{children}</Link>;
}
