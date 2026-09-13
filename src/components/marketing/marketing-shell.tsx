import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const nav = [
  ["Product", "/product"],
  ["Solutions", "/solutions/founders"],
  ["Resources", "/resources"],
  ["Pricing", "/pricing"],
] as const;

export function LogoLockup() {
  return (
    <Link
      className="marketing-logo"
      href="/"
      aria-label="Web Content Flow home"
    >
      <Image
        alt=""
        aria-hidden
        height={36}
        src="/brand/symbol/flow-mark.svg"
        width={36}
      />
      <span>Web Content Flow</span>
    </Link>
  );
}

export function MarketingHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="announcement" aria-label="Private beta status">
        <span>Private beta preparation is underway.</span>
        <Link href="/contact">Request early access</Link>
      </aside>
      <header className="marketing-header">
        <div className="marketing-container header-inner">
          <LogoLockup />
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(([label, href]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="text-action" href="/sign-in">
              Sign in
            </Link>
            <Link className="marketing-button compact" href="/contact">
              Join the private beta
            </Link>
          </div>
          <details className="mobile-menu">
            <summary aria-label="Open navigation">Menu</summary>
            <nav aria-label="Mobile navigation">
              {nav.map(([label, href]) => (
                <Link href={href} key={href}>
                  {label}
                </Link>
              ))}
              <Link href="/sign-in">Sign in</Link>
              <Link href="/contact">Join the private beta</Link>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter() {
  const groups = {
    Product: [
      ["Overview", "/product"],
      ["Brand Profile", "/product/brand-profile"],
      ["Website", "/product/website"],
      ["Calendar", "/product/calendar"],
    ],
    Solutions: [
      ["Founders", "/solutions/founders"],
      ["Marketing teams", "/solutions/marketing-teams"],
      ["Agencies", "/solutions/agencies"],
    ],
    Resources: [
      ["Guides", "/resources/guides"],
      ["Blog", "/resources/blog"],
      ["Security", "/security"],
    ],
    Company: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Sign in", "/sign-in"],
    ],
    Legal: [
      ["Privacy", "/legal/privacy"],
      ["Terms", "/legal/terms"],
      ["Cookies", "/legal/cookies"],
    ],
  } as const;
  return (
    <footer className="marketing-footer">
      <div className="marketing-container footer-grid">
        <div>
          <LogoLockup />
          <p>Create once. Flow everywhere.</p>
        </div>
        {Object.entries(groups).map(([title, links]) => (
          <nav aria-label={title} key={title}>
            <h2>{title}</h2>
            {links.map(([label, href]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="marketing-container footer-bottom">
        <span>© 2026 Web Content Flow</span>
        <span>Content that flows from strategy.</span>
      </div>
    </footer>
  );
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-site">
      <MarketingHeader />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`marketing-section ${className}`} id={id}>
      <div className="marketing-container">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <header className="section-header">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {copy ? <p>{copy}</p> : null}
    </header>
  );
}

export function BetaCta() {
  return (
    <Section className="beta-cta">
      <div className="cta-panel">
        <p className="eyebrow">PRIVATE BETA</p>
        <h2>Build content that moves forward.</h2>
        <p>
          Join the private-beta list and be among the first to test a connected
          workflow from strategy to content.
        </p>
        <div className="button-row">
          <Link className="marketing-button" href="/contact">
            Request early access <ArrowRight aria-hidden size={18} />
          </Link>
          <Link className="marketing-button secondary" href="/about">
            Why we are building it
          </Link>
        </div>
      </div>
    </Section>
  );
}
