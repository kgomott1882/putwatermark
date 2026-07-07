type FooterGroup = {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
};

const footerGroups: FooterGroup[] = [
  {
    title: "Navigation",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Reset password", href: "/forgot-password" },
    ],
  },
  {
    title: "Features",
    links: [
      { label: "Watermarking", href: "#" },
      { label: "Background removal", href: "#" },
      { label: "Video support", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Blog", href: "#" },
      { label: "Privacy policy", href: "#" },
      { label: "Terms of service", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Guides", href: "#" },
      { label: "File types", href: "#" },
      { label: "Comparisons", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full bg-charcoal px-6 py-16 text-white sm:px-12 lg:px-20">
      <div className="w-full">
        <div className="grid gap-10 md:grid-cols-4 lg:gap-16">
          {footerGroups.map(({ title, links }) => (
            <div key={title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-battleship">
                {title}
              </h2>
              <ul className="mt-5 space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      className="text-sm text-white/70 transition hover:text-white"
                      href={href}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="text-sm text-white/50">
            © 2026 PutWatermark. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
