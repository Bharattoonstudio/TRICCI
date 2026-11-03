import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Stored job descriptions can lose their line breaks, which runs headings and
// "**Label:**" lines together. Put the breaks back so the Markdown renders.
function formatJobDescription(text: string): string {
  return text
    .replace(/\s+(#{2,4}\s)/g, '\n\n$1')
    .replace(/\s+(\*\*[^*\n]{2,60}:\*\*)/g, '\n\n$1');
}

// Headings and bold text inherit the colour of the parent, so the same
// component works on light and dark pages.
const components = {
  h1: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-base font-black text-current mt-6 mb-2" {...p} />,
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-base font-black text-current mt-6 mb-2" {...p} />,
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h4 className="text-sm font-bold text-current mt-5 mb-1.5 uppercase tracking-wide" {...p} />,
  h4: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h4 className="text-sm font-bold text-current mt-4 mb-1" {...p} />,
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => <p className="mb-3 leading-relaxed" {...p} />,
  strong: (p: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold text-current" {...p} />,
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-5 mb-3 space-y-1.5" {...p} />,
  ol: (p: React.OlHTMLAttributes<HTMLOListElement>) => <ol className="list-decimal pl-5 mb-3 space-y-1.5" {...p} />,
  li: (p: React.LiHTMLAttributes<HTMLLIElement>) => <li className="leading-relaxed" {...p} />,
  a: (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a className="text-primary underline" target="_blank" rel="noopener noreferrer" {...p} />,
};

export default function JobDescription({ text, className = '' }: { text: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className={`leading-relaxed ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{formatJobDescription(text)}</ReactMarkdown>
    </div>
  );
}
