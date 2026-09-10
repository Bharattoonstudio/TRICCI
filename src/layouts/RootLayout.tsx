import { Helmet } from '@dr.pogodin/react-helmet';
import { type ReactElement } from 'react';
import { ScrollRestoration } from 'react-router-dom';

import Footer, { WhatsAppFloat } from '@/layouts/parts/Footer';
import Header from '@/layouts/parts/Header';
import Website from '@/layouts/Website';

/**
 * Root layout component that wraps all pages with consistent header and footer.
 *
 * The landing page (/) hides the header and footer — it is a fullscreen carousel only.
 * All other pages get the standard header + footer.
 */
interface RootLayoutProps {
  children: ReactElement;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <Website>
      <Helmet>
        <title>TRICCI &mdash; India&rsquo;s Smartest Recruitment Marketplace</title>
        <meta name="description" content="TRICCI connects employers, consultants, and candidates through India's first transparent, performance-driven recruitment aggregator. Post jobs free. Pay only on success." />
        <link rel="canonical" href="https://tricci.in" />
        <meta property="og:site_name" content="TRICCI" />
        <meta property="og:locale" content="en_IN" />
        {/* Google Search Console verification */}
        <meta name="google-site-verification" content="GQTJHyg3p5Gr00U_r_4K3EX-SGZySqYnCy4daQMbQcc" />
        {/* Bing Webmaster Tools verification */}
        <meta name="msvalidate.01" content="4C15EC7FC080543DAB80A16562C067D9" />
      </Helmet>
      <ScrollRestoration />
      <Header />
      {children}
      <Footer />
      <WhatsAppFloat />
    </Website>
  );
}
