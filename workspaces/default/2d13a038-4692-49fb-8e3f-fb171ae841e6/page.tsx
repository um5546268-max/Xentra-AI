'use client';

import { FormEvent, useEffect, useState } from 'react';

const LAUNCH = new Date('2027-01-01T00:00:00+05:00').getTime();

function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, LAUNCH - (now ?? LAUNCH));
  const values = [
    [Math.floor(diff / 86400000), 'DAYS'],
    [Math.floor(diff / 3600000) % 24, 'HRS'],
    [Math.floor(diff / 60000) % 60, 'MIN'],
    [Math.floor(diff / 1000) % 60, 'SEC'],
  ] as const;

  return (
    <div className="countdown" aria-label="Launch countdown">
      {values.map(([n, label]) => (
        <div className="time" key={label}>
          <b>{String(n).padStart(2, '0')}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

const features = [
  ['01', 'AI Chat', 'Ask, create, explain, plan and solve problems inside one continuous AI workspace.'],
  ['02', 'Learning', 'Study school, college and languages. Import PDFs, audio or video and turn them into summaries, flashcards and quizzes.'],
  ['03', 'Research', 'Search the web, investigate topics and organize useful information into one answer.'],
  ['04', 'Code Workspace', 'Build and edit projects with an AI-assisted coding workspace, file explorer and developer tools.'],
  ['05', 'Browser Tasks', 'Give Xentra a website task and let it work through the browser instead of making you do every step manually.'],
  ['06', 'Shopping', 'Research products, compare options and help you make purchase decisions from one place.'],
  ['07', 'Xentra Connect', 'Chat with other Xentra users in the community. Social posts and Reels can come later.'],
  ['08', 'System Health', 'Check useful device health and performance information on supported computers and mobile devices.'],
  ['09', 'Files & Media', 'Bring your files and media into Xentra so the AI can work with the material you provide.'],
  ['10', 'Memory & Automations', 'Keep useful context and automate recurring work where the user chooses to enable it.'],
  ['11', 'Bee Hive', 'A planned multi-agent layer where separate worker bees can handle parallel research and browser jobs.'],
  ['12', 'One Workspace', 'Move between chat, learning, coding, research and tools without leaving the Xentra ecosystem.'],
];

const plans = [
  { name: 'Free', note: 'Start exploring Xentra', items: ['Unlimited AI chat', '3 searches / day', '3 deep research tasks / day', 'Unlimited coding', '5 AI coding uses / day', '3 file uploads / day', 'Up to 2 hours learning / day', '3 shopping uses / day', '3 browser tasks / day', '1 memory / day'] },
  { name: 'Pro', note: 'For serious daily use', items: ['Everything in Free', 'Higher research limits', 'More file and learning capacity', 'More AI coding capacity', 'More browser and shopping tasks', 'Expanded memory', 'Priority access to new tools'] },
  { name: 'Ultimate', note: 'Maximum Xentra workspace', items: ['Everything in Pro', 'Highest practical usage limits', 'Advanced AI workflows', 'Early access to major features', 'Premium workspace capabilities', 'Future Bee Hive access when released'] },
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ visitors: 0, waitlist: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/analytics', { method: 'POST' }).catch(() => {});
    fetch('/api/waitlist', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setStats({ visitors: Number(d.visitors || 0), waitlist: Number(d.waitlist || 0) }))
      .catch(() => {});
  }, []);

  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || 'You are on the list.');
      if (data.ok) {
        setStats(s => ({ ...s, waitlist: Number(data.count ?? s.waitlist + (data.already ? 0 : 1)) }));
        if (!data.already) setEmail('');
      }
    } catch {
      setMessage('Could not join right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="hero" id="top">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="grid-glow" />
        <nav className="nav">
          <a className="brand" href="#top" aria-label="Xentra home">
            <img src="/images/xentra-logo.png" alt="Xentra" />
            <span>XENTRA</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#workspace">Experience</a>
            <a href="#plans">Plans</a>
            <a href="#waitlist" className="nav-cta">Join waitlist</a>
          </div>
        </nav>

        <section className="hero-content">
          <div className="status"><i /> XENTRA AI · LAUNCHING 01.01.2027</div>
          <div className="hero-logo"><img src="/images/xentra-logo.png" alt="Xentra AI" /></div>
          <p className="eyebrow">YOUR AI AGENT</p>
          <h1>Think less about the tools.<br /><span>Get more done.</span></h1>
          <p className="lead">Xentra brings AI chat, learning, research, coding, browser tasks, shopping, files, community and device insights into one intelligent workspace.</p>
          <div className="hero-actions">
            <a className="primary" href="#waitlist">Join the waitlist <span>↗</span></a>
            <a className="secondary" href="#features">Explore Xentra <span>↓</span></a>
          </div>
          <p className="microcopy">Free to join · Launch updates · Early-access opportunities</p>
          <Countdown />
          <p className="countdown-caption">The Xentra era begins January 1, 2027.</p>
        </section>

        <div className="hero-product">
          <div className="window-top"><span /><span /><span /><em>Xentra AI workspace</em></div>
          <div className="window-body">
            <aside>
              <div className="mini-brand"><img src="/images/xentra-logo.png" alt="" /> Xentra</div>
              <div className="side-item active">✦ AI Chat</div>
              <div className="side-item">◈ Learning</div>
              <div className="side-item">⌘ Code</div>
              <div className="side-item">◎ Research</div>
              <div className="side-item">◌ Connect</div>
            </aside>
            <div className="mock-chat">
              <div className="mock-badge">XENTRA AGENT</div>
              <h3>What do you want to accomplish?</h3>
              <p>Xentra can help you research, learn, code, plan and work across your tools.</p>
              <div className="mock-actions"><span>Start learning</span><span>Research a topic</span><span>Build something</span></div>
              <div className="mock-input">Ask Xentra anything… <b>↑</b></div>
            </div>
          </div>
        </div>
      </div>

      <section className="live-strip">
        <div><strong>{stats.visitors.toLocaleString()}</strong><span>UNIQUE VISITORS</span></div>
        <div><strong>{stats.waitlist.toLocaleString()}</strong><span>WAITLIST MEMBERS</span></div>
        <div><strong>01.01.27</strong><span>PUBLIC LAUNCH</span></div>
        <div><strong>V1</strong><span>BUILD STATUS</span></div>
      </section>

      <section className="section intro" id="workspace">
        <div className="section-kicker">THE XENTRA EXPERIENCE</div>
        <h2>One workspace.<br /><span>Many ways to work.</span></h2>
        <p className="section-lead">Instead of opening a different app for every job, Xentra is designed around the work itself: ask, learn, research, build, connect and act.</p>
        <div className="bento">
          <article className="bento-card large cyan"><span className="bento-icon">✦</span><small>01 / CONVERSATION</small><h3>AI that moves with you.</h3><p>Start with a question, continue into research, turn the result into a study guide, or use it inside your coding workspace.</p><div className="floating-line">AI Chat <b>→</b> Research <b>→</b> Learning</div></article>
          <article className="bento-card purple"><span className="bento-icon">◈</span><small>02 / LEARNING</small><h3>Turn material into knowledge.</h3><p>PDF → summary → flashcards → quiz → points.</p><div className="progress"><i style={{ width: '72%' }} /></div><span className="tiny">72% session progress</span></article>
          <article className="bento-card"><span className="bento-icon">⌘</span><small>03 / BUILD</small><h3>Code with context.</h3><p>Files, editor, AI assistance and project work in one place.</p><div className="code-lines"><i /><i /><i /><i /></div></article>
          <article className="bento-card"><span className="bento-icon">◎</span><small>04 / ACT</small><h3>From answer to action.</h3><p>Browser tasks, shopping and research are designed to become useful outcomes.</p></article>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-heading-row"><div><div className="section-kicker">THE TOOLBOX</div><h2>Everything Xentra is being built to handle.</h2></div><p>Version 1 focuses on a practical all-in-one AI workspace. Some advanced agent features are planned for later releases.</p></div>
        <div className="feature-grid">
          {features.map(([num, title, text]) => <article className="feature-card" key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p><b>↗</b></article>)}
        </div>
      </section>

      <section className="agent-section">
        <div className="agent-copy"><div className="section-kicker">THE NEXT LAYER · VERSION 2</div><h2>Meet the <span>Bee Hive.</span></h2><p>When you are ready to add it, Xentra can introduce a multi-agent layer: multiple worker bees can take separate jobs, such as research or browser tasks, while you continue using Xentra.</p><div className="bee-pills"><span>Research Bee</span><span>Browser Bee</span><span>Shopping Bee</span><span>Task Bee</span><span>More to come</span></div></div>
        <div className="bee-orbit"><div className="orbit o1"/><div className="orbit o2"/><div className="bee-core"><img src="/images/xentra-logo.png" alt="Xentra" /><b>5</b><span>workers</span></div><div className="bee-dot d1">B1</div><div className="bee-dot d2">B2</div><div className="bee-dot d3">B3</div><div className="bee-dot d4">B4</div><div className="bee-dot d5">B5</div></div>
      </section>

      <section className="section" id="plans">
        <div className="section-heading"><div className="section-kicker">SIMPLE ACCESS</div><h2>Plans designed to stay approachable.</h2><p>These are the current product limits you described for the Xentra plan system. You can change pricing later without changing the site structure.</p></div>
        <div className="plans-grid">{plans.map((plan, i) => <article className={`plan ${i === 1 ? 'featured' : ''}`} key={plan.name}>{i === 1 && <div className="popular">MOST BALANCED</div>}<div className="plan-top"><div><h3>{plan.name}</h3><p>{plan.note}</p></div><span>{i === 0 ? '$0' : i === 1 ? 'Pro' : 'Ultimate'}</span></div><ul>{plan.items.map(item => <li key={item}>✓ {item}</li>)}</ul><a href="#waitlist">Get launch updates →</a></article>)}</div>
      </section>

      <section className="updates">
        <div><div className="section-kicker">STAY IN THE LOOP</div><h2>Know what Xentra is building next.</h2><p>Join the waitlist to receive launch news, feature announcements, early-access opportunities and important updates about Xentra.</p></div>
        <div className="update-cards"><div><b>01</b><strong>Launch updates</strong><span>Know when Xentra is ready.</span></div><div><b>02</b><strong>New features</strong><span>See what gets added to the platform.</span></div><div><b>03</b><strong>Early access</strong><span>Hear about opportunities before public release.</span></div></div>
      </section>

      <section className="waitlist" id="waitlist">
        <div className="waitlist-orb" />
        <div className="section-kicker">EARLY ACCESS</div>
        <h2>Be there from day one.</h2>
        <p>Join the Xentra waitlist and stay updated with launch news, new features, early access and important product updates.</p>
        <form onSubmit={join}><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Enter your email address" required /><button disabled={loading}>{loading ? 'Joining…' : 'Join Xentra'} <span>→</span></button></form>
        {message && <div className="form-message">{message}</div>}
        <small>No spam. Only important Xentra updates.</small>
        <div className="public-counts"><span><b>{stats.waitlist.toLocaleString()}</b> people on the waitlist</span><span><b>{stats.visitors.toLocaleString()}</b> visitors have explored Xentra</span></div>
      </section>

      <footer><div className="footer-brand"><img src="/images/xentra-logo.png" alt="Xentra" /><div><b>XENTRA AI</b><span>Your AI Agent.</span></div></div><div className="footer-links"><a href="#features">Features</a><a href="#plans">Plans</a><a href="#waitlist">Waitlist</a><a href="/admin">Private Admin</a></div><div className="footer-bottom">© 2026 Xentra AI · Launching January 1, 2027</div></footer>
    </main>
  );
}
