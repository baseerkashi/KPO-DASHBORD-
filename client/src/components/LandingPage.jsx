import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Upload, BarChart3, Brain, ShieldCheck, FileText, Zap,
  ArrowRight, ChevronDown, TrendingUp, Target, Globe,
  Database, Lock, CheckCircle2, BarChart2, Sparkles,
  Menu, X
} from "lucide-react";
import FeatureCard from "./landing/FeatureCard";
import StatsCounter from "./landing/StatsCounter";
import Logo from "./Logo";

const HeroScene = lazy(() => import("./landing/HeroScene"));

/* ──────────────────────────────────────────────────── */
/*  Landing Page                                        */
/* ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenu(false);
  };

  return (
    <div className="landing-root">
      {/* ─── NAVBAR ─────────────────────────────── */}
      <nav className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-nav-brand" onClick={() => scrollTo("hero")}>
            <div className="landing-logo-icon">
              <Logo className="w-7 h-7" />
            </div>
            <span className="landing-logo-text">Vertex</span>
          </div>

          <div className="landing-nav-links">
            <button onClick={() => scrollTo("features")}>Features</button>
            <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
            <button onClick={() => scrollTo("about")}>About</button>
            <button onClick={() => scrollTo("mission")}>Mission</button>
          </div>

          <div className="landing-nav-actions">
            <button onClick={() => navigate("/login")} className="landing-btn-login">
              Sign In
            </button>
            <button onClick={() => navigate("/login")} className="landing-btn-cta-nav">
              Get Started <ArrowRight size={16} />
            </button>
          </div>

          <button
            className="landing-mobile-toggle"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="landing-mobile-menu">
            <button onClick={() => scrollTo("features")}>Features</button>
            <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
            <button onClick={() => scrollTo("about")}>About</button>
            <button onClick={() => scrollTo("mission")}>Mission</button>
            <button onClick={() => { navigate("/login"); setMobileMenu(false); }} className="landing-btn-cta-nav" style={{width: "100%"}}>
              Get Started
            </button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─────────────────────────────── */}
      <section id="hero" className="landing-hero">
        <div className="landing-hero-3d">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Sparkles size={14} />
            <span>AI-Powered Financial Intelligence</span>
          </div>

          <h1 className="landing-hero-title">
            Transform Raw Data Into
            <span className="landing-gradient-text"> Credit-Grade </span>
            Financial Assessments
          </h1>

          <p className="landing-hero-subtitle">
            Vertex empowers KPO teams with institutional-grade analysis — Altman Z-Score,
            DuPont decomposition, industry benchmarking, and AI-driven risk scoring — all
            from a single CSV upload.
          </p>

          <div className="landing-hero-actions">
            <button onClick={() => navigate("/login")} className="landing-btn-primary">
              <span>Launch Dashboard</span>
              <ArrowRight size={18} />
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="landing-btn-secondary">
              See How It Works
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="landing-hero-trust">
            <div className="landing-trust-item">
              <Lock size={14} />
              <span>Bank-Grade Security</span>
            </div>
            <div className="landing-trust-item">
              <ShieldCheck size={14} />
              <span>Enterprise-grade security</span>
            </div>
            <div className="landing-trust-item">
              <Zap size={14} />
              <span>Sub-Second Analysis</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-scroll-indicator" onClick={() => scrollTo("features")}>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ─── PROBLEM STATEMENT ──────────────── */}
      <section className="landing-section landing-problem">
        <div className="landing-container">
          <div className="landing-problem-grid">
            <div className="landing-problem-stat">
              <span className="landing-problem-number">60%</span>
              <span className="landing-problem-label">of analyst time wasted on manual spreadsheet processing</span>
            </div>
            <div className="landing-problem-stat">
              <span className="landing-problem-number">₹50L+</span>
              <span className="landing-problem-label">average cost of a single misallocated credit assessment</span>
            </div>
            <div className="landing-problem-stat">
              <span className="landing-problem-number">3 weeks</span>
              <span className="landing-problem-label">typical turnaround for a comprehensive financial review</span>
            </div>
          </div>
          <p className="landing-problem-headline">
            Manual financial analysis is <strong>slow</strong>, <strong>error-prone</strong>, and <strong>unscalable</strong>.
            Vertex changes that.
          </p>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">CAPABILITIES</span>
            <h2 className="landing-section-title">Enterprise-Grade Analysis Suite</h2>
            <p className="landing-section-desc">
              Every tool a credit analyst needs — unified in one platform, powered by real financial models.
            </p>
          </div>

          <div className="landing-features-grid">
            <FeatureCard
              icon={BarChart3}
              title="Altman Z-Score"
              description="Industry-standard bankruptcy prediction model adapted for MSEs. Know distress probability before it's too late."
              index={0}
            />
            <FeatureCard
              icon={TrendingUp}
              title="DuPont Decomposition"
              description="Break ROE into its 3 drivers — margin, turnover, leverage — to pinpoint exactly where profitability leaks."
              index={1}
            />
            <FeatureCard
              icon={Target}
              title="Industry Benchmarking"
              description="Compare against 15+ industry medians. Know instantly if a 12% margin is excellent or dangerously low for the sector."
              index={2}
            />
            <FeatureCard
              icon={Brain}
              title="AI-Powered Insights"
              description="Gemini AI analyzes your data with chain-of-thought reasoning, citing specific metrics and industry context."
              index={3}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="10-Factor Risk Model"
              description="Weighted composite score across profitability, growth, volatility, liquidity, debt, and more. Not guesswork — math."
              index={4}
            />
            <FeatureCard
              icon={FileText}
              title="PDF Export & Audit"
              description="Client-ready reports with full audit trail. Every action logged, every analysis traceable."
              index={5}
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────── */}
      <section id="how-it-works" className="landing-section landing-how">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">WORKFLOW</span>
            <h2 className="landing-section-title">Three Steps. Zero Guesswork.</h2>
            <p className="landing-section-desc">
              From raw spreadsheet to institutional-grade assessment in under 60 seconds.
            </p>
          </div>

          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">01</div>
              <div className="landing-step-icon"><Upload size={32} strokeWidth={1.5} /></div>
              <h3>Upload Your Data</h3>
              <p>Drop a CSV or Excel file with financial data. We auto-detect columns, validate entries, and flag anomalies before processing.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step">
              <div className="landing-step-number">02</div>
              <div className="landing-step-icon"><BarChart2 size={32} strokeWidth={1.5} /></div>
              <h3>Instant Analysis</h3>
              <p>Our engine runs Altman Z-Score, DuPont decomposition, variance analysis, and industry benchmarking simultaneously.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step">
              <div className="landing-step-number">03</div>
              <div className="landing-step-icon"><Brain size={32} strokeWidth={1.5} /></div>
              <h3>AI-Driven Decision</h3>
              <p>Gemini AI synthesizes all metrics into actionable insights. Run scenario simulations. Export the final report as PDF.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS SECTION ──────────────────── */}
      <section className="landing-section landing-stats-section">
        <div className="landing-container">
          <div className="landing-stats-grid">
            <StatsCounter end={15} suffix="+" label="Industry Benchmarks" />
            <StatsCounter end={60} suffix="s" label="Analysis Time" />
            <StatsCounter end={10} suffix="x" label="Faster Assessments" />
            <StatsCounter end={3} suffix="" label="Institutional Models" />
          </div>
        </div>
      </section>

      {/* ─── ABOUT US ──────────────────────── */}
      <section id="about" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">ABOUT US</span>
            <h2 className="landing-section-title">Built by Analysts, for Analysts</h2>
          </div>

          <div className="landing-about-grid">
            <div className="landing-about-content">
              <p className="landing-about-lead">
                Vertex was born from a simple frustration: KPO analysts spend more time
                wrestling with spreadsheets than actually analyzing businesses.
              </p>
              <p>
                Our founding team — experienced credit analysts and software engineers —
                set out to build the tool they wished existed. One that doesn't just visualize
                numbers, but actually <em>understands</em> them. That applies real financial
                models, not heuristic guesses. That gives you the confidence to sign off on
                an assessment knowing the math is auditable and the methodology is sound.
              </p>
              <p>
                Today, Vertex combines decades of financial engineering methodology with
                cutting-edge AI to deliver analyses that would take a team of analysts
                days — in under a minute.
              </p>

              <div className="landing-about-highlights">
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Institutional-grade financial models</span>
                </div>
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Enterprise-grade data handling</span>
                </div>
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Built with React, Node.js, and Gemini AI</span>
                </div>
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Open architecture, your data stays yours</span>
                </div>
              </div>
            </div>

            <div className="landing-about-visual">
              <div className="landing-about-card">
                <div className="landing-about-card-icon">
                  <Globe size={40} strokeWidth={1} />
                </div>
                <h3>Global Standards</h3>
                <p>
                  Our analysis engine implements internationally recognized frameworks
                  including Altman Z-Score, DuPont Analysis, and Basel-aligned risk
                  weighting methodologies.
                </p>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-icon">
                  <Database size={40} strokeWidth={1} />
                </div>
                <h3>Data Integrity</h3>
                <p>
                  Every upload is validated, every calculation logged, every insight
                  traceable to source data. Full audit trail for regulatory compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MISSION ───────────────────────── */}
      <section id="mission" className="landing-section landing-mission">
        <div className="landing-container">
          <div className="landing-mission-inner">
            <span className="landing-section-tag">OUR MISSION</span>
            <h2 className="landing-mission-title">
              Democratize Institutional-Grade Financial Analysis
            </h2>
            <p className="landing-mission-desc">
              We believe every business — regardless of size — deserves access to the same
              calibre of financial analysis that Fortune 500 companies get. Vertex makes
              enterprise-grade credit assessment accessible, affordable, and instant. We're
              not building another dashboard — we're building the financial intelligence
              layer that KPO teams need to make better decisions, faster.
            </p>

            <div className="landing-mission-pillars">
              <div className="landing-mission-pillar">
                <div className="landing-pillar-icon"><Target size={28} /></div>
                <h4>Accuracy First</h4>
                <p>Every model is validated against peer-reviewed financial research.</p>
              </div>
              <div className="landing-mission-pillar">
                <div className="landing-pillar-icon"><Zap size={28} /></div>
                <h4>Speed Matters</h4>
                <p>What takes analysts days, we deliver in seconds.</p>
              </div>
              <div className="landing-mission-pillar">
                <div className="landing-pillar-icon"><Lock size={28} /></div>
                <h4>Trust & Transparency</h4>
                <p>Full audit trails. No black boxes. Every metric is traceable.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ───────────────────────── */}
      <section id="pricing" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">PRICING</span>
            <h2 className="landing-section-title">Transparent Plans for Any Scale</h2>
          </div>
          <div className="landing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
            <div className="landing-pricing-card" style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Free</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Perfect for testing the waters.</p>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '2rem' }}>₹0<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 2 Clients</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 5 Analyses/mo</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 3 AI Insights/mo</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> Altman Z-Score</li>
              </ul>
              <button onClick={() => navigate("/signup")} className="landing-btn-secondary" style={{ width: '100%', marginTop: '2rem' }}>Start Free</button>
            </div>
            <div className="landing-pricing-card" style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--accent-primary)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-primary)', color: '#000', padding: '0.25rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Most Popular</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Pro</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>For independent analysts.</p>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '2rem' }}>₹4,999<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 25 Clients</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 50 Analyses/mo</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> Unlimited AI Insights</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> DuPont & Benchmarks</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> PDF Reports</li>
              </ul>
              <button onClick={() => navigate("/signup")} className="landing-btn-primary" style={{ width: '100%', marginTop: '2rem' }}>Upgrade to Pro</button>
            </div>
            <div className="landing-pricing-card" style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Team</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>For growing KPO teams.</p>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '2rem' }}>₹70,000<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> Unlimited Clients</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 200 Analyses/mo</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> 5 Team Members</li>
                <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--success)" /> Audit Log Access</li>
              </ul>
              <button onClick={() => navigate("/signup")} className="landing-btn-secondary" style={{ width: '100%', marginTop: '2rem' }}>Start Team Trial</button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ────────────────────── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">TECHNOLOGY</span>
            <h2 className="landing-section-title">Enterprise Stack. Production Ready.</h2>
          </div>

          <div className="landing-tech-grid">
            {[
              { name: "React 18", desc: "Modern UI framework" },
              { name: "Node.js", desc: "Server runtime" },
              { name: "SQLite", desc: "Persistent data layer" },
              { name: "Gemini AI", desc: "Intelligence engine" },
              { name: "Chart.js", desc: "Data visualization" },
              { name: "JWT Auth", desc: "Secure authentication" },
              { name: "Three.js", desc: "3D visualization" },
              { name: "Express", desc: "API framework" },
            ].map((tech) => (
              <div key={tech.name} className="landing-tech-card">
                <div className="landing-tech-name">{tech.name}</div>
                <div className="landing-tech-desc">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────── */}
      <section className="landing-section landing-cta">
        <div className="landing-container">
          <div className="landing-cta-inner">
            <h2 className="landing-cta-title">
              Ready to Transform Your Financial Analysis?
            </h2>
            <p className="landing-cta-desc">
              Start with a free account. Upload your first dataset in under 2 minutes.
            </p>
            <div className="landing-cta-actions">
              <button onClick={() => navigate("/login")} className="landing-btn-primary landing-btn-lg">
                <span>Get Started Now</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="landing-footer-brand">
              <div className="landing-logo-icon">
                <Logo className="w-7 h-7" />
              </div>
              <span className="landing-logo-text">Vertex</span>
            </div>
            <p className="landing-footer-copy">
              © {new Date().getFullYear()} Vertex Intelligence. All rights reserved.
            </p>
            <div className="landing-footer-links">
              <button onClick={() => scrollTo("features")}>Features</button>
              <button onClick={() => scrollTo("about")}>About</button>
              <button onClick={() => scrollTo("mission")}>Mission</button>
              <button onClick={() => navigate("/login")}>Sign In</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
