import { ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarDays, Clock3, MapPin, Scissors } from 'lucide-react';
import { useState } from 'react';
import './noir.css';
import NoirHeroShader from './NoirHeroShader';

const services = [
  ['01', 'Signature cut', 'Стрижка, укладка и горячее полотенце.', 'от 2 400 ₽'],
  ['02', 'Beard ritual', 'Контур, бритьё и уход для бороды.', 'от 1 800 ₽'],
  ['03', 'Full service', 'Полный ритуал для тех, кто ценит время.', 'от 3 900 ₽'],
];

const barbers = [
  ['Михаил', 'Классика и чистые линии', '01'],
  ['Артём', 'Текстура и свободная форма', '02'],
  ['Лев', 'Борода и точный контур', '03'],
];

export default function NoirPage({ onBack }: { onBack: () => void }) {
  const [bookingSent, setBookingSent] = useState(false);
  return (
    <div className="noir-page">
      <nav className="noir-nav">
        <button className="noir-back" onClick={onBack}><ArrowLeft size={15} /> PD.DEV / Projects</button>
        <a className="noir-logo" href="#noir-top">NOIR<span>—</span></a>
        <a className="noir-book noir-book-desktop" href="#noir-booking">Записаться <ArrowUpRight size={15} /></a>
        <a className="noir-menu-link" href="#noir-booking" aria-label="Записаться"><CalendarDays size={17} /></a>
      </nav>
      <main id="noir-top">
        <section className="noir-hero">
          <div className="noir-hero-copy">
            <p className="noir-eyebrow">NOIR / MEN'S GROOMING STUDIO</p>
            <h1>Свой ритм.<br /><i>Свой стиль.</i></h1>
            <p className="noir-hero-lead">Барбершоп в центре Москвы для тех, кто ценит точность, спокойствие и хорошую форму.</p>
            <a className="noir-outline-btn" href="#noir-booking">Выбрать время <ArrowDownRight size={16} /></a>
          </div>
          <div className="noir-hero-art" aria-label="Анимация NOIR">
            <NoirHeroShader />
            <div className="noir-shader-wash" />
          </div>
          <span className="noir-scroll">SCROLL TO EXPLORE <span /></span>
        </section>

        <section className="noir-studio noir-container" id="noir-studio">
          <div className="noir-section-label">01 / STUDIO</div>
          <div className="noir-studio-grid"><h2>Тихое место<br /><i>для себя.</i></h2><div><p className="noir-copy">NOIR — это несколько кресел, хороший свет и мастера, которым не нужно спешить. Мы работаем с формой, а не с потоком.</p><p className="noir-meta">Пн—Вс / 10:00—22:00<br />Большая Дмитровка, 16</p><a className="noir-text-link" href="#noir-booking">Как нас найти <ArrowUpRight size={15} /></a></div></div>
        </section>

        <section className="noir-services noir-container" id="noir-services">
          <div className="noir-section-label">02 / SERVICES</div><div className="noir-services-head"><h2>Форма<br /><i>имеет значение.</i></h2><Scissors size={30} strokeWidth={1} /></div>
          <div className="noir-service-list">{services.map(([index, title, copy, price]) => <a className="noir-service" href="#noir-booking" key={title}><span>{index}</span><div><h3>{title}</h3><p>{copy}</p></div><strong>{price}</strong><ArrowUpRight size={18} /></a>)}</div>
        </section>

        <section className="noir-barbers noir-container" id="noir-barbers"><div className="noir-section-label">03 / BARBERS</div><div className="noir-barbers-head"><h2>Люди, которые<br /><i>знают форму.</i></h2><p>Каждый мастер работает в своём почерке. Выберите тот, который ближе.</p></div><div className="noir-barber-grid">{barbers.map(([name, specialty, index]) => <a className="noir-barber" href="#noir-booking" key={name}><div className={`noir-portrait noir-portrait-${index}`}><span>{index}</span></div><div><h3>{name}</h3><p>{specialty}</p></div><ArrowUpRight size={17} /></a>)}</div></section>

        <section className="noir-works" id="noir-works"><div className="noir-container"><div className="noir-section-label">04 / WORKS</div><div className="noir-works-head"><h2>Чистая работа.<br /><i>Без лишнего.</i></h2><p>От первой линии до последнего штриха — всё держится на деталях.</p></div><div className="noir-gallery"><div className="noir-gallery-tile noir-gallery-wide"><span>01</span><div className="noir-profile-shape" /></div><div className="noir-gallery-tile noir-gallery-tall"><span>02</span><div className="noir-comb-shape" /></div><div className="noir-gallery-tile noir-gallery-small"><span>03</span><div className="noir-line-art" /></div></div></div></section>

        <section className="noir-experience noir-container"><div className="noir-section-label">05 / EXPERIENCE</div><div className="noir-experience-grid"><h2>Ритуал,<br /><i>а не услуга.</i></h2><div className="noir-experience-card"><div className="noir-clock"><Clock3 size={20} /><span>45—90 MIN</span></div><p>Начинаем с короткого разговора. Подбираем форму, работаем спокойно, заканчиваем укладкой, которая живёт дольше одного вечера.</p><div className="noir-rule" /><span>01 — консультация<br />02 — работа<br />03 — финальный штрих</span></div></div></section>

        <section className="noir-booking" id="noir-booking"><div className="noir-booking-inner"><div><div className="noir-section-label">06 / BOOKING</div><h2>Ваше время<br /><i>уже ждёт.</i></h2><p>Оставьте заявку — администратор подтвердит запись в течение часа.</p></div><form onSubmit={e => { e.preventDefault(); setBookingSent(true); }}><label>Имя<input required placeholder="Как к вам обращаться?" /></label><label>Телефон<input required placeholder="+7 (___) ___-__-__" /></label><label>Услуга<select required defaultValue=""><option value="" disabled>Выберите услугу</option><option>Signature cut</option><option>Beard ritual</option><option>Full service</option></select></label><button className="noir-submit" type="submit">{bookingSent ? 'Заявка принята' : 'Отправить заявку'} <ArrowUpRight size={16} /></button>{bookingSent && <p className="noir-form-note" role="status">Спасибо. Администратор свяжется с вами в течение часа.</p>}</form></div></section>
      </main>
      <footer className="noir-footer"><span>NOIR — MEN'S GROOMING STUDIO</span><span><MapPin size={14} /> Москва, Большая Дмитровка 16</span><a href="https://instagram.com" target="_blank" rel="noreferrer"><span aria-hidden="true">◎</span> Instagram</a></footer>
    </div>
  );
}
