import { motion } from 'framer-motion'
import { ArrowUpRight, BrainCircuit, Check, Code2, Mail, Menu, MessageCircle, Send, Sparkles, Workflow, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import ClickSpark from './ClickSpark'
import './planet.css'
import LineWaves from './LineWaves'
import MagicCard from './MagicCard'
import ParticleText from './ParticleText'
import MiniGame from './MiniGame'
import useProjectViewport from './useProjectViewport'
import NoirPage from './NoirPage'

const Planet = lazy(() => import('./Planet'))

const services = [
  ['01', 'Цифровые продукты', 'Определяю логику, сценарии и интерфейс, чтобы продуктом было легко пользоваться.', 'product'],
  ['02', 'Веб-разработка', 'Делаю быстрые сайты и веб-приложения с ясной структурой.', 'web'],
  ['03', 'Автоматизация', 'Убираю ручные шаги и связываю сервисы вокруг вашего процесса.', 'auto'],
  ['04', 'UI / UX', 'Прорабатываю интерфейс до деталей: иерархия, ритм и состояния.', 'ux'],
] as const

function Icon({ type }: { type: string }) {
  if (type === 'product') return <BrainCircuit />
  if (type === 'web') return <Code2 />
  if (type === 'auto') return <Workflow />
  return <Sparkles />
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [route, setRoute] = useState(window.location.hash)
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash)
    const onPath = () => setPathname(window.location.pathname)
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onPath)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onPath)
    }
  }, [])

  const isNoir = pathname === '/projects/noir'

  useEffect(() => {
    if (isNoir) window.scrollTo({ top: 0, behavior: 'instant' })
    else if (route === '#about') document.getElementById('about')?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [route, isNoir])

  useProjectViewport(!isNoir)

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const message = [
      `Имя: ${data.get('name') || 'не указано'}`,
      `Email: ${data.get('email') || 'не указано'}`,
      `Задача: ${data.get('project') || 'не указана'}`,
    ].join('\n')
    window.open(`https://t.me/Vetrikzz?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  if (isNoir) return <NoirPage onBack={() => { window.location.href = '/#top' }} />

  return (
    <ClickSpark>
      <div className="site">
        <header className="nav">
          <a className="brand" href="#top"><span className="brand-mark">/</span><span>PD<span className="muted">.DEV</span></span></a>
          <nav className={open ? 'nav-links open' : 'nav-links'}>
            {['Услуги', 'Обо мне', 'Контакты'].map((item, index) => <a key={item} href={['#services', '#about', '#contact'][index]} onClick={() => setOpen(false)}>{item}</a>)}
          </nav>
          <a className="nav-cta" href="#contact">Обсудить проект <ArrowUpRight size={15} /></a>
          <button className="menu" onClick={() => setOpen(!open)} aria-label="Меню">{open ? <X /> : <Menu />}</button>
        </header>

        <main id="top">
          <section className="hero">
            <LineWaves />
            <div className="hero-glow" />
            <div className="hero-content">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="eyebrow"><span className="status-dot" /> WEB DEVELOPER <span>·</span> МОСКВА / REMOTE</motion.div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>Создаю сайты и<br /><em>сервисы</em> для бизнеса</motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Собираю сайты, веб-приложения<br className="desktop" /> и автоматизацию под конкретную задачу.</motion.p>
              <div className="hero-actions"><a className="button primary" href="#about">Узнать больше <ArrowUpRight size={17} /></a><a className="button ghost" href="#contact">Связаться <Mail size={16} /></a></div>
            </div>
            <div className="hero-meta"><span>01 / 04</span><span className="scroll-line" /><span>SCROLL TO EXPLORE</span></div>
          </section>

          <section className="section services" id="services">
            <div className="section-head">
              <span className="section-kicker">01 / КОМПЕТЕНЦИИ</span>
              <ParticleText text="Собираю сложное" fontFamily="'Inter', sans-serif" align="left" className="particle-heading" />
              <h2 className="services-subtitle"><span>в рабочий результат</span></h2>
              <p>Разбираюсь в задаче, проектирую сценарии и пишу код, который можно поддерживать.</p>
            </div>
            <div className="service-grid">{services.map(([number, title, description, type]) => <MagicCard className="service-card" key={title}><div className="service-top"><span>{number}</span><Icon type={type} /></div><h3>{title}</h3><p>{description}</p><span className="card-arrow"><ArrowUpRight size={17} /></span></MagicCard>)}</div>
          </section>

          <MiniGame />

          <section className="why">
            <div className="why-inner">
              <span className="section-kicker">03 / ПОДХОД</span>
              <h2>Вникаю в задачу<br /><em>отвечаю результатом</em></h2>
              <div className="why-grid">
                <div className="why-copy"><p>Работаю рядом с командой: задаю вопросы, фиксирую решения и довожу задачу до запуска.</p><a className="text-link" href="#about">Больше обо мне <ArrowUpRight size={16} /></a></div>
                <div className="principles">{['Сроки, о которых договорились', 'Код, который можно развивать', 'Связь без лишних созвонов'].map((item, index) => <div className="principle" key={item}><span>0{index + 1}</span><b>{item}</b><Check size={16} /></div>)}</div>
              </div>
            </div>
          </section>

          <section className="section about" id="about">
            <div className="about-visual"><Suspense fallback={<div className="planet"><div className="planet-stage" /></div>}><Planet /></Suspense></div>
            <div className="about-copy"><span className="section-kicker">04 / ОБО МНЕ</span><h2>Веб-разработчик<br /><span>и создатель продуктов</span></h2><p>Проектирую и разрабатываю цифровые продукты для людей и команд. Соединяю ясный интерфейс, продуманную логику и техническую основу, которую легко поддерживать.</p><p className="muted-copy">Сейчас открыт к новым задачам и сильным коллаборациям.</p><a className="button ghost" href="#contact">Давайте знакомиться <ArrowUpRight size={16} /></a></div>
          </section>

          <section className="contact" id="contact">
            <div className="contact-inner">
              <div><span className="section-kicker">05 / КОНТАКТЫ</span><h2>Есть идея?<br /><em>Давайте обсудим</em></h2><p>Опишите задачу. Я отвечу в течение одного рабочего дня.</p><div className="contact-links"><a href="mailto:starsbs1607@gmail.com"><Mail size={17} /> starsbs1607@gmail.com</a><a href="https://t.me/Vetrikzz" target="_blank" rel="noreferrer"><MessageCircle size={17} /> Telegram</a></div></div>
              <form onSubmit={handleContactSubmit}><label>Ваше имя<input name="name" placeholder="Как к вам обращаться?" /></label><label>Email<input name="email" type="email" placeholder="you@company.com" /></label><label>Расскажите о проекте<textarea name="project" placeholder="Коротко опишите задачу" rows={4} /></label><button className="button primary" type="submit">Написать в Telegram <Send size={16} /></button></form>
            </div>
          </section>
        </main>

        <footer><span>© 2025 PD.DEV: Web Developer</span><span>Сделано с вниманием к деталям</span><a href="#top">Наверх</a></footer>
      </div>
    </ClickSpark>
  )
}
