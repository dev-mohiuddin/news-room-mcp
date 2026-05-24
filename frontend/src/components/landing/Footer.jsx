import Logo from "@/components/shared/Logo";

// Social brand icons aren't shipped by current lucide-react version;
// inline SVGs keep the visual identity without extra dependencies.
const Twitter = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const Linkedin = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.86-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.65-1.86 3.4-1.86 3.64 0 4.31 2.4 4.31 5.51v6.24zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
  </svg>
);
const Github = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.4-4.04-1.4-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .3" />
  </svg>
);
const Youtube = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
  </svg>
);

const COL_PRODUCT = [
  "Features",
  "How It Works",
  "Pricing",
  "Changelog",
  "Roadmap",
  "API Docs",
];
const COL_COMPANY = ["About", "Blog", "Careers", "Press Kit", "Partners", "Contact"];
const COL_LEGAL = [
  "Privacy Policy",
  "Terms of Service",
  "Cookie Policy",
  "Security",
  "Status Page",
  "Support",
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 glass">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
            AI-powered publishing for modern content teams.
          </p>
          <div className="mt-5 flex gap-3">
            {[Twitter, Linkedin, Github, Youtube].map((Ic, i) => (
              <a
                key={i}
                href="#"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md glass border border-white/10 hover:border-white/20 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Ic className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title="Product" items={COL_PRODUCT} />
        <FooterColumn title="Company" items={COL_COMPANY} />
        <FooterColumn title="Legal & Support" items={COL_LEGAL} />
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Newsroom MCP. Built with ❤ and AI.
          </p>
          <p className="text-xs text-muted-foreground">
            Made for publishers, by publishers.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it}>
            <a
              href="#"
              className="text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              {it}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
