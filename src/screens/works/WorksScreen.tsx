import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Tag } from '../../components/Tag';
import { BrandMark } from '../../components/BrandMark';
import { copy } from '../../config/copy';
import s from './WorksScreen.module.css';

/** 작품 목록(BUILD_SPEC 6.2). M0: 예시 작품 카드만 동작, 내 작품은 M1에서 DB 연결. */
export default function WorksScreen() {
  return (
    <div className={s.page}>
      <header className={s.bar}>
        <Link to="/" className={s.brand}>
          <BrandMark size={28} />
          <b>{copy.brand.name}</b>
        </Link>
        <Link to="/settings" className={s.settings}>
          {copy.settings.title}
        </Link>
      </header>
      <main className={s.main}>
        <div className={s.head}>
          <h1>{copy.works.title}</h1>
          <Button disabled title="M1에서 연결돼요">
            {copy.works.newWork}
          </Button>
        </div>
        <EmptyState title={copy.works.emptyTitle} body={copy.works.emptyBody} stage="M1" />
        <h2 className={s.sub}>예시 작품</h2>
        <Link to="/w/sample/home" className={s.cardLink}>
          <Card as="article" className={s.card}>
            <div className={s.cardTop}>
              <h3>별의 도서관</h3>
              <Tag tone="gold">{copy.works.sampleLabel}</Tag>
            </div>
            <p>판타지 · 6화 연재 · 책 속으로 들어가는 사서 견습생 리안의 이야기</p>
          </Card>
        </Link>
      </main>
    </div>
  );
}
