import { Helmet } from '@dr.pogodin/react-helmet';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import BlogPost from '../components/blog/BlogPost';
import BlogGrid from '../components/blog/BlogGrid';
import { getPostBySlug, getRelatedPosts } from '../lib/blog';
import type { BlogPost as BlogPostType } from '../lib/blog';
import ShareButtons from '../components/ShareButtons';

/**
 * Blog post detail page component
 *
 * Displays a single blog post with related posts.
 * Uses the slug parameter from the URL to find the post.
 */
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const foundPost = getPostBySlug(slug);
    setPost(foundPost);

    if (foundPost) {
      setRelatedPosts(getRelatedPosts(foundPost, 3));
    }

    setLoading(false);
  }, [slug]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  // Post not found - redirect to blog
  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {(() => {
        const canonicalUrl = `https://tricci.in/blog/${post.slug}`;
        const seoTitle = post.seoTitle ?? `${post.title} — TRICCI Blog`;
        const seoDesc = post.seoDescription ?? post.excerpt;
        // Use dynamic OG card; fall back to featuredImage if post has one
        const ogImage = post.featuredImage ?? `https://tricci.in/api/og?${new URLSearchParams({
          title: post.title,
          subtitle: `By ${post.author ?? 'TRICCI Editorial'} · ${new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          tag: post.tags?.[0] ?? 'Blog',
          type: 'blog',
        }).toString()}`;
        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: seoDesc,
          url: canonicalUrl,
          datePublished: post.publishedAt,
          ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
          author: {
            '@type': 'Person',
            name: post.author ?? 'TRICCI Editorial',
          },
          publisher: {
            '@type': 'Organization',
            name: 'TRICCI',
            url: 'https://tricci.in',
          },
          image: ogImage,
          keywords: post.tags?.join(', ') ?? '',
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
        };
        return (
          <Helmet>
            <title>{seoTitle}</title>
            <meta name="description" content={seoDesc} />
            <link rel="canonical" href={canonicalUrl} />
            <meta property="og:title" content={seoTitle} />
            <meta property="og:description" content={seoDesc} />
            <meta property="og:type" content="article" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:locale" content="en_IN" />
            <meta property="og:site_name" content="TRICCI" />
            <meta property="article:published_time" content={post.publishedAt} />
            {post.updatedAt && <meta property="article:modified_time" content={post.updatedAt} />}
            {post.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoTitle} />
            <meta name="twitter:description" content={seoDesc} />
            <meta name="twitter:image" content={ogImage} />
            <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
          </Helmet>
        );
      })()}

      {/* sr-only h1 for SEO — visible title is rendered inside BlogPost component */}
      <h1 className="sr-only">{post.title} — TRICCI Blog</h1>

      {/* Back to Blog Link */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Blog
        </Link>
      </div>

      {/* Blog Post Content */}
      <BlogPost post={post} />

      {/* ── Share strip ── */}
      <div className="max-w-4xl mx-auto px-4 py-8 border-t border-border mt-2">
        <ShareButtons
          url={`https://tricci.in/blog/${post.slug}`}
          title={post.seoTitle ?? post.title}
          description={post.excerpt}
          variant="full"
        />
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 border-t border-border mt-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Related Posts
          </h2>
          <BlogGrid posts={relatedPosts} variant="default" columns={3} />
        </div>
      )}

      {/* ── Cross-link strip: Blog ↔ Jobs ── */}
      <div className="border-t border-border bg-card/30 py-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All Recruitment Insights
          </Link>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Browse Open Roles in India →
          </Link>
        </div>
      </div>
    </div>
  );
}
