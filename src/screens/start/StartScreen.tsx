import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { copy } from '../../config/copy';
import s from './StartScreen.module.css';

/** 시작 화면(BUILD_SPEC 6.1). M0: 로그인 버튼은 자리만, 예시 작품 둘러보기는 동작. */
export default function StartScreen() {
  const nav = useNavigate();
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="My Universe 로고" className={s.logo} />
        <p className={s.lead}>{copy.start.lead}</p>
        <h1 className={s.name}>{copy.brand.name}</h1>
        <p className={s.message}>{copy.brand.message}</p>
        <div className={s.actions}>
          <Button variant="accent" size="lg" disabled title={copy.start.loginSoon}>
            {copy.start.login}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => nav('/w/sample/home')}>
            {copy.start.sample}
          </Button>
        </div>
        <p className={s.note}>{copy.start.loginSoon}</p>
      </section>
      <section className={s.values}>
        {copy.start.values.map((v) => (
          <div key={v.title} className={s.value}>
            <h2>{v.title}</h2>
            <p>{v.body}</p>
          </div>
        ))}
      </section>
      <p className={s.notice}>{copy.start.aiNotice}</p>
    </div>
  );
}
