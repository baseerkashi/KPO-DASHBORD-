import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, BarChart3, ShieldCheck, FileText, Zap,
  ArrowRight, ChevronDown, Target,
  Database, Lock, CheckCircle2, BarChart2, Sparkles,
  Menu, X, AlertTriangle, LifeBuoy, Sliders,
  Clock, TrendingDown, DollarSign, ArrowUpRight, Scale, Check
} from "lucide-react";
import FeatureCard from "./landing/FeatureCard";
import Logo from "./Logo";

/* ──────────────────────────────────────────────────── */
/*  Landing Page — Financial Triage & Turnaround Advisor*/
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
            <button onClick={() => scrollTo("features")}>Capabilities</button>
            <button onClick={() => scrollTo("how-it-works")}>Restructuring Workflow</button>
            <button onClick={() => scrollTo("about")}>Methodology</button>
            <button onClick={() => scrollTo("mission")}>Mission</button>
          </div>

          <div className="landing-nav-actions">
            <button onClick={() => navigate("/login")} className="landing-btn-login">
              Sign In
            </button>
            <button onClick={() => navigate("/signup")} className="landing-btn-secondary py-2 px-3 text-xs">
              Create Account
            </button>
            <button onClick={() => navigate("/login")} className="landing-btn-cta-nav">
              Launch Turnaround Workspace <ArrowRight size={16} />
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
            <button onClick={() => scrollTo("features")}>Capabilities</button>
            <button onClick={() => scrollTo("how-it-works")}>Restructuring Workflow</button>
            <button onClick={() => scrollTo("about")}>Methodology</button>
            <button onClick={() => scrollTo("mission")}>Mission</button>
            <div className="pt-2 flex flex-col gap-2 w-full">
              <button 
                onClick={() => { navigate("/login"); setMobileMenu(false); }} 
                className="landing-btn-cta-nav w-full justify-center"
              >
                Launch Turnaround Workspace
              </button>
              <button 
                onClick={() => { navigate("/signup"); setMobileMenu(false); }} 
                className="landing-btn-secondary w-full justify-center text-center"
              >
                Create Account
              </button>
              <button 
                onClick={() => { navigate("/login"); setMobileMenu(false); }} 
                className="text-xs text-slate-400 py-1 text-center"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ─────────────────────────────── */}
      <section id="hero" className="landing-hero">
        <div className="landing-hero-content" style={{ maxWidth: "1160px" }}>
          <div className="landing-hero-badge">
            <Sparkles size={14} />
            <span>Emergency Financial Triage & Turnaround Advisor</span>
          </div>

          <h1 className="landing-hero-title">
            Navigating a Cash Crisis?
            <span className="landing-gradient-text"> Rapid Restructuring </span>
            for Distressed Businesses
          </h1>

          <p className="landing-hero-subtitle">
            Vertex operates as your Chief Restructuring Officer in a box — diagnosing cash runway,
            prioritizing high-impact liquidity moves with minimal operational pain, and generating
            battle-tested survival playbooks with institutional math.
          </p>

          <div className="landing-hero-actions">
            <button onClick={() => navigate("/login")} className="landing-btn-primary">
              <span>Launch Turnaround Workspace</span>
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate("/signup")} className="landing-btn-secondary">
              <span>Create Account</span>
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="landing-btn-secondary">
              <span>See Restructuring Flow</span>
              <ChevronDown size={18} />
            </button>
          </div>

          {/* ─── CRISP EXECUTIVE UI PREVIEW CARD ─── */}
          <div className="mt-12 text-left rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-md">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-slate-400 font-medium hidden sm:inline">
                  Vertex Turnaround Cockpit — Apex Global Logistics LLC (Distressed Assessment)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Deterministic Engine Active
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {/* Sample Vital Signs Strip */}
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Sample Vital Signs Strip
                    </span>
                    <span className="rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 border border-rose-500/30">
                      Distress Detected
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    Recovery Plan: Balanced Playbook Active
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: Runway */}
                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Cash Runway Evolution</span>
                      <Clock className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-white">
                        48 Days
                      </span>
                      <ArrowRight className="h-4 w-4 text-emerald-400 inline" />
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-400">
                        139 Days
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-400 font-semibold">
                      +91 Days Gained with Recovery Plan
                    </p>
                  </div>

                  {/* Card 2: Net Burn */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Net Monthly Burn</span>
                      <TrendingDown className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-rose-400 line-through opacity-70">
                        -$42k
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-400">
                        -$14.5k
                      </span>
                      <span className="text-xs text-slate-400">/mo</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      -$27,500/mo operating burn saved
                    </p>
                  </div>

                  {/* Card 3: Liquidity Pool */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Effective Liquidity Pool</span>
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-white">
                        $67,200
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        (+$35,000)
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Accelerated AR Wire Standstill
                    </p>
                  </div>

                  {/* Card 4: Breakeven Gap */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Breakeven Gap</span>
                      <Scale className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-white">
                        $14,500
                      </span>
                      <span className="text-xs text-slate-400">/mo</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Down 65% from baseline gap
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample 4-Quadrant Impact vs. Pain Matrix Workflow */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    4-Quadrant Impact vs. Pain Restructuring Workflow
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Prioritizing Liquidity with Minimum Operational Trauma
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {/* Quadrant 1: Quick Wins */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        Quadrant 1: Quick Wins (High Impact, Low Pain)
                      </span>
                      <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                        ENGAGED
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      Accelerate Overdue AR via 5% Quick-Pay Settlement
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Injects immediate wire capital from creditworthy accounts with zero customer disruption.
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-xs font-mono text-emerald-400 font-semibold">
                      <span>+$35,000 Liquid Cash</span>
                      <span>•</span>
                      <span>+25 Days Runway</span>
                    </div>
                  </div>

                  {/* Quadrant 2: Strategic Fixes */}
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        Quadrant 2: Strategic Fixes (High Impact, High Pain)
                      </span>
                      <span className="rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5">
                        ENGAGED
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      Tiered 15% Executive & Management Salary Deferral
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Preserves frontline operational staff while drastically dropping monthly payroll outflows.
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-xs font-mono text-indigo-400 font-semibold">
                      <span>-$15,000/mo Burn</span>
                      <span>•</span>
                      <span>+34 Days Runway</span>
                    </div>
                  </div>

                  {/* Quadrant 3: Low-Hanging Fruit */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5" />
                        Quadrant 3: Low-Hanging Fruit (Low Impact, Low Pain)
                      </span>
                      <span className="rounded bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5">
                        ENGAGED
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      Freeze Non-Essential SaaS Subscriptions & Discretionary T&E
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Instant cancellation of unused vendor seats and duplicate marketing software tools.
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-xs font-mono text-slate-300 font-semibold">
                      <span>-$12,500/mo Burn</span>
                      <span>•</span>
                      <span>+32 Days Runway</span>
                    </div>
                  </div>

                  {/* Quadrant 4: Distractions */}
                  <div className="rounded-xl border border-rose-900/30 bg-rose-950/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Quadrant 4: Distractions (Low Impact, High Pain)
                      </span>
                      <span className="rounded bg-rose-900/40 text-rose-300 text-[10px] font-bold px-2 py-0.5">
                        AVOIDED
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      Premature Core Operational Headcount Reductions
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Destroys revenue-generating capacity with negligible immediate liquidity benefit.
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-xs font-mono text-rose-400 font-semibold">
                      <span>Operational Friction Only</span>
                      <span>•</span>
                      <span>Playbook Excluded</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Footer Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Institutional Restructuring Memo & Full Audit Trail Auto-Generated
                </span>
                <span className="font-mono text-slate-400">
                  Export PDF Ready · Zero Hallucinated Values
                </span>
              </div>
            </div>
          </div>

          <div className="landing-hero-trust">
            <div className="landing-trust-item">
              <Lock size={14} />
              <span>Strict Data Confidentiality</span>
            </div>
            <div className="landing-trust-item">
              <ShieldCheck size={14} />
              <span>Auditable Financial Calculations</span>
            </div>
            <div className="landing-trust-item">
              <Zap size={14} />
              <span>Immediate Liquidity Triage</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-scroll-indicator" onClick={() => scrollTo("features")}>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ─── GROUNDED PROBLEM STATEMENT ──────────────── */}
      <section className="landing-section landing-problem">
        <div className="landing-container">
          <div className="landing-problem-grid">
            <div className="landing-problem-stat">
              <span className="landing-problem-number">&lt;60 Days</span>
              <span className="landing-problem-label">median cash runway available to distressed businesses before seeking intervention</span>
            </div>
            <div className="landing-problem-stat">
              <span className="landing-problem-number">72 Hours</span>
              <span className="landing-problem-label">critical window to stabilize vendor and payroll commitments during cash stress</span>
            </div>
            <div className="landing-problem-stat">
              <span className="landing-problem-number">100%</span>
              <span className="landing-problem-label">deterministic financial math derived strictly from uploaded records—zero hallucinated metrics</span>
            </div>
          </div>
          <p className="landing-problem-headline">
            When revenue drops, generic accounting advice isn't enough. You need <strong>decisive triage</strong>, <strong>honest math</strong>, and a <strong>realistic survival plan</strong>.
          </p>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">CAPABILITIES</span>
            <h2 className="landing-section-title">Institutional Restructuring Toolkit</h2>
            <p className="landing-section-desc">
              Every tool a turnaround practitioner needs to stem losses, extend runway, and guide executive decisions.
            </p>
          </div>

          <div className="landing-features-grid">
            <FeatureCard
              icon={AlertTriangle}
              title="Crisis Diagnosis"
              description="Burn rate analysis, true cash runway projections, and working capital vulnerability mapping."
              index={0}
            />
            <FeatureCard
              icon={Sliders}
              title="Impact vs. Pain Prioritization"
              description="Quantify cash levers by execution speed and dollar magnitude versus operational friction and team morale."
              index={1}
            />
            <FeatureCard
              icon={LifeBuoy}
              title="Survival Playbooks"
              description="Calibrate actionable scenarios across Quick Wins, Balanced Recovery, and Maximum Survival presets."
              index={2}
            />
            <FeatureCard
              icon={BarChart3}
              title="Verified Solvency Math"
              description="Altman Z'-Score and DuPont analysis computed strictly when verifiable balance sheet columns exist—no fake proxies."
              index={3}
            />
            <FeatureCard
              icon={Target}
              title="Industry Reality Check"
              description="Benchmark your cost structure and margins against 14 sector medians to spot where cash leaks."
              index={4}
            />
            <FeatureCard
              icon={FileText}
              title="Executive Turnaround Memo"
              description="Generate formal, client-ready restructuring reports and audit logs for lenders, partners, and advisors."
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
            <h2 className="landing-section-title">From Distress to Defensible Plan</h2>
            <p className="landing-section-desc">
              A structured diagnostic process built for high-stakes turnaround scenarios.
            </p>
          </div>

          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">01</div>
              <div className="landing-step-icon"><Upload size={32} strokeWidth={1.5} /></div>
              <h3>Ingest Financial Records</h3>
              <p>Upload historical monthly financials. The intake pipeline detects columns, checks balance sheet validity, and flags anomalies.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step">
              <div className="landing-step-number">02</div>
              <div className="landing-step-icon"><BarChart2 size={32} strokeWidth={1.5} /></div>
              <h3>Deep Triage & Solvency</h3>
              <p>Evaluate liquidity ratios, burn volatility, sector benchmark variances, and multi-factor distress probabilities.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step">
              <div className="landing-step-number">03</div>
              <div className="landing-step-icon"><ShieldCheck size={32} strokeWidth={1.5} /></div>
              <h3>Execute Recovery Strategy</h3>
              <p>Simulate cost-containment scenarios, sequence immediate stabilization levers, and export auditable turnaround reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT US ──────────────────────── */}
      <section id="about" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">METHODOLOGY</span>
            <h2 className="landing-section-title">Principled Financial Advisory</h2>
          </div>

          <div className="landing-about-grid">
            <div className="landing-about-content">
              <p className="landing-about-lead">
                Vertex replaces panic with structured financial engineering when businesses face existential pressure.
              </p>
              <p>
                Turnaround advisory requires complete mathematical honesty. We refuse to substitute fabricated estimates
                for real balance sheet data, and we reject optimistic vanity metrics that obscure distress.
              </p>
              <p>
                Whether you are an independent advisor guiding a client through renegotiations or an owner building a
                recovery blueprint, Vertex provides the analytical rigor needed to make difficult calls with confidence.
              </p>

              <div className="landing-about-highlights">
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Strict verification—no proxy math on balance sheets</span>
                </div>
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Pragmatic cost-rationalization simulations</span>
                </div>
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Sector benchmarks across 14 industry verticals</span>
                </div>
                <div className="landing-about-highlight">
                  <CheckCircle2 size={20} />
                  <span>Deterministic reporting with auditable logs</span>
                </div>
              </div>
            </div>

            <div className="landing-about-visual">
              <div className="landing-about-card">
                <div className="landing-about-card-icon">
                  <ShieldCheck size={40} strokeWidth={1} />
                </div>
                <h3>Honest Metrics</h3>
                <p>
                  Solvency models like Altman Z'-Score only compute when total assets and equity are explicitly provided.
                  When data is missing, we clearly report insufficient data instead of guessing.
                </p>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-icon">
                  <Database size={40} strokeWidth={1} />
                </div>
                <h3>Defensible Audit Trails</h3>
                <p>
                  Every scenario, data ingestion event, and report generation is captured in persistent audit records to ensure
                  compliance and stakeholder accountability.
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
              Equip Every Distressed Enterprise With Expert Restructuring Tools
            </h2>
            <p className="landing-mission-desc">
              High-end turnaround consultancies charge five-figure monthly retainers that small businesses in crisis cannot afford.
              Vertex democratizes institutional restructuring tools—giving business owners and advisors the exact framework
              needed to protect payroll, conserve capital, and regain solvency.
            </p>

            <div className="landing-mission-pillars">
              <div className="landing-mission-pillar">
                <div className="landing-pillar-icon"><Target size={28} /></div>
                <h4>Speed & Clarity</h4>
                <p>Identify critical cash drains in minutes so leadership can act immediately.</p>
              </div>
              <div className="landing-mission-pillar">
                <div className="landing-pillar-icon"><Zap size={28} /></div>
                <h4>Realistic Scenarios</h4>
                <p>Model Quick Wins, Balanced Recovery, and Maximum Survival pathways without false optimism.</p>
              </div>
              <div className="landing-mission-pillar">
                <div className="landing-pillar-icon"><Lock size={28} /></div>
                <h4>Fiduciary Integrity</h4>
                <p>Transparent formulas and private data storage that respect your financial privacy.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ────────────────────── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">ARCHITECTURE</span>
            <h2 className="landing-section-title">Reliable, Self-Contained Technology Stack</h2>
          </div>

          <div className="landing-tech-grid">
            {[
              { name: "React 18", desc: "Responsive workspace UI" },
              { name: "Node.js & Express", desc: "Financial computation engine" },
              { name: "SQLite (WAL)", desc: "ACID-compliant storage" },
              { name: "PDFKit", desc: "Server-side report generation" },
              { name: "Chart.js", desc: "Trend & variance visualization" },
              { name: "Gemini AI", desc: "Qualitative synthesis & advisory" },
              { name: "JWT Auth", desc: "Workspace isolation" },
              { name: "Tailwind CSS", desc: "High-contrast executive layout" },
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
              Take Control of Your Financial Trajectory
            </h2>
            <p className="landing-cta-desc">
              Access the turnaround workspace or create an account to run immediate financial triage.
            </p>
            <div className="landing-cta-actions">
              <button onClick={() => navigate("/login")} className="landing-btn-primary landing-btn-lg">
                <span>Launch Turnaround Workspace</span>
                <ArrowRight size={20} />
              </button>
              <button onClick={() => navigate("/signup")} className="landing-btn-secondary landing-btn-lg">
                <span>Create Account</span>
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
              © {new Date().getFullYear()} Vertex Financial Turnaround. All rights reserved.
            </p>
            <div className="landing-footer-links">
              <button onClick={() => scrollTo("features")}>Capabilities</button>
              <button onClick={() => scrollTo("about")}>Methodology</button>
              <button onClick={() => scrollTo("mission")}>Mission</button>
              <button onClick={() => navigate("/login")}>Sign In</button>
              <button onClick={() => navigate("/signup")}>Create Account</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
