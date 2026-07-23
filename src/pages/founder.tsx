// /founder has been merged into /about — redirect permanently
import { Navigate } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
export default function FounderRedirect() {
  return (
    <>
      <Helmet>
        <title>Founder — TRICCI</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://tricci.in/about" />
      </Helmet>
      <Navigate to="/about" replace />
    </>
  );
}
