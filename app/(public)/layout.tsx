/**
 * (public) route group — pass-through wrapper.
 *
 * Why this is now minimal: the auth pages (sign-in, sign-up) ship with
 * their own full-screen `AuthShell` chrome. The anonymous tracker page
 * already wraps itself in `<PageShell displayVariant="flat">`. The
 * previous header + footer chrome was redundant for both surfaces and
 * made the auth pages feel like a generic public site instead of a
 * focused, Stripe/Vercel-style auth surface.
 *
 * Layout responsibilities that remain centralised:
 *   - Pass through {children} untouched so each public page owns its
 *     own chrome (AuthShell for sign-in/up, PageShell for tracker).
 *   - No data fetching, no JS, no chrome. Pure server component.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
