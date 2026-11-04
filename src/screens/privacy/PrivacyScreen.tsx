import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { copy } from '../../config/copy';
import { site } from '../../config/site';
import { usePageTitle } from '../../lib/usePageTitle';
import s from './privacy.module.css';

/** 개인정보처리방침. 로그인하지 않아도 볼 수 있다. */
export default function PrivacyScreen() {
  usePageTitle(copy.privacy.title);
  const nav = useNavigate();
  return (
    <main className={s.page}>
      <h1 className={s.title}>{copy.privacy.title}</h1>
      <p className={s.muted}>{copy.privacy.effective(site.privacyEffective)}</p>
      <p>{copy.privacy.lead}</p>
      {copy.privacy.sections.map((sec, i) => (
        <Card key={sec.title} as="section" aria-labelledby={`privacy-${i}`}>
          <h2 id={`privacy-${i}`} className={s.h2}>
            {sec.title}
          </h2>
          <ul className={s.list}>
            {sec.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </Card>
      ))}
      <p>
        <a href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(copy.help.mailSubject)}`}>{copy.privacy.contact(site.contactEmail)}</a>
      </p>
      <p>
        {window.history.length > 1 ? (
          <button type="button" className={s.back} onClick={() => nav(-1)}>
            ← {copy.privacy.back}
          </button>
        ) : (
          <Link to="/">← {copy.common.toStart}</Link>
        )}
      </p>
    </main>
  );
}
