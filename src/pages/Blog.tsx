import { Helmet } from '@dr.pogodin/react-helmet';
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BlogHero from '../components/blog/BlogHero';
import BlogGrid from '../components/blog/BlogGrid';
import { getBlogPosts, getPostsByCategory, getPostsByTag, paginatePosts, getAllCategories, getAllTags } from '../lib/blog';
import type { BlogPost } from '../lib/blog';

const BLOG_CANONICAL = 'https://tricci.in/blog';
const BLOG_OG_IMAGE = 'https://tricci.in/og-image.svg';

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'TRICCI Recruitment Insights',
  url: BLOG_CANONICAL,
  description: 'Expert articles on recruitment trends, consultant career guides, and hiring best practices for the Indian job market.',
  publisher: {
    '@type': 'Organization',
    name: 'TRICCI',
    url: 'https://tricci.in',
  },
};

/**
 * Blog page component
 *
 * Displays a list of blog posts with filtering and pagination.
 * Supports filtering by category and tag via URL search params.
 */
export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Get filter params
  const categoryFilter = searchParams.get('category');
  const tagFilter = searchParams.get('tag');
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    // Load posts based on filters
    let filteredPosts: BlogPost[];

    if (categoryFilter) {
      filteredPosts = getPostsByCategory(categoryFilter);
    } else if (tagFilter) {
      filteredPosts = getPostsByTag(tagFilter);
    } else {
      filteredPosts = getBlogPosts();
    }

    setPosts(filteredPosts);
    setCategories(getAllCategories());
    setTags(getAllTags());
  }, [categoryFilter, tagFilter]);

  // Paginate posts
  const { posts: paginatedPosts, pagination } = paginatePosts(posts, page, 9);

  // Clear filters
  const clearFilters = () => {
    setSearchParams({});
  };

  // Set category filter
  const setCategory = (category: string) => {
    setSearchParams({ category });
  };

  // Set tag filter
  const setTag = (tag: string) => {
    setSearchParams({ tag });
  };

  // Change page
  const goToPage = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (categoryFilter) params.category = categoryFilter;
    if (tagFilter) params.tag = tagFilter;
    setSearchParams(params);
  };

  const pageTitle = categoryFilter
    ? `${categoryFilter} Articles — TRICCI Blog`
    : 'Recruitment Insights Blog — TRICCI';
  const pageDescription =
    'Expert articles on India recruitment trends, independent consultant career guides, transparent hiring fees, and job search strategies for senior professionals.';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={BLOG_CANONICAL} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={BLOG_CANONICAL} />
        <meta property="og:image" content={BLOG_OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="TRICCI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={BLOG_OG_IMAGE} />
        <meta name="keywords" content="recruitment blog India, hiring trends India, independent recruiter guide, job search tips India, placement fee transparency" />
        <script type="application/ld+json">{JSON.stringify(blogJsonLd)}</script>
      </Helmet>

      <BlogHero
        title="Recruitment Insights"
        subtitle="Industry trends, hiring strategies, and expert perspectives for employers, consultants, and candidates navigating India's job market"
        variant="default"
      />
      <h1 className="sr-only">Recruitment Insights Blog — TRICCI</h1>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          {/* Active Filters */}
          {(categoryFilter || tagFilter) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filters:</span>
              {categoryFilter && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  Category: {categoryFilter}
                  <button
                    onClick={clearFilters}
                    className="hover:opacity-80 transition-opacity"
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {tagFilter && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  Tag: {tagFilter}
                  <button
                    onClick={clearFilters}
                    className="hover:opacity-80 transition-opacity"
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Category Filter Dropdown */}
          {categories.length > 0 && !categoryFilter && (
            <div className="relative">
              <select
                className="px-4 py-2 bg-card border border-border rounded-lg text-foreground text-sm font-medium hover:border-primary transition-colors cursor-pointer"
                onChange={(e) => setCategory(e.target.value)}
                value=""
              >
                <option value="">Filter by category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tag Filter */}
          {tags.length > 0 && !tagFilter && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center">Tags:</span>
              {tags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTag(tag)}
                  className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {pagination.totalPosts} {pagination.totalPosts === 1 ? 'post' : 'posts'}
            {categoryFilter && ` in ${categoryFilter}`}
            {tagFilter && ` tagged with ${tagFilter}`}
          </p>
        </div>

        {/* Blog Grid */}
        <BlogGrid posts={paginatedPosts} variant="default" columns={3} />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-2">
            <button
              onClick={() => goToPage(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="px-4 py-2 bg-card border border-border rounded-lg text-foreground font-medium hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    pageNum === pagination.currentPage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToPage(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 bg-card border border-border rounded-lg text-foreground font-medium hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Browse Open Roles strip ── */}
      <div className="border-t border-border bg-card/40 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Ready to act on what you've read?</p>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Browse Open Roles in India
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-sm leading-relaxed">
            Every role on TRICCI is sourced by a specialist consultant — no job-board noise, no agency markup. Senior positions across technology, product, data, sales, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/jobs"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              See Live Openings
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 border border-border text-foreground font-semibold text-sm px-7 py-3.5 rounded-xl hover:border-primary transition-colors"
            >
              Create Free Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
