import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2, RotateCcw, Trophy, Zap, Brain, Grid3x3, ChevronRight,
  Bot, Sparkles, Upload, FileText, CheckCircle, Building2,
  GraduationCap, Users, Send, Shield, ExternalLink, Loader2, Star,
  Share2, Copy, Check
} from 'lucide-react';

import { trackAiCopilotLaunch, trackGameShare } from '@/lib/analytics';
const _TIC_GPT = `https://chatgpt.com/g/g-6a1b310c327c8191a48366560e14fd6e-tic-1-0-talent-intelligence-copilot`;

function _openTic(prompt: string, action = 'custom') {
  trackAiCopilotLaunch(action, 'refresh');
  window.open(`${_TIC_GPT}?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
}

async function _readPdf(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      let raw = '';
      for (let i = 0; i < bytes.length; i++) {
        const c = bytes[i];
        if (c >= 32 && c < 127) raw += String.fromCharCode(c);
        else if (c === 10 || c === 13) raw += ' ';
      }
      const btEt = raw.match(/BT[\s\S]*?ET/g) ?? [];
      let out = btEt.join(' ').replace(/\(([^)]+)\)/g, '$1 ').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, '\n').trim();
      if (out.length < 100) out = raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, '\n').trim();
      resolve(out.slice(0, 6000));
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Social Share ─────────────────────────────────────────────────────────────
const GAME_SHARE_COPY: Record<string, { verb: string; emoji: string; challenge: string }> = {
  tictactoe: { verb: 'won a game of',   emoji: '⭕❌', challenge: 'Think you can beat me? Challenge accepted?' },
  '2048':    { verb: 'scored',          emoji: '🔢',   challenge: 'Can you beat my score? Give it a shot!' },
  snake:     { verb: 'scored',          emoji: '🐍',   challenge: 'Think you can outlast me? Try it!' },
  sudoku:    { verb: 'just solved',     emoji: '🧩',   challenge: 'Can you crack it too? Give it a go!' },
};

function buildShareText(gameId: string, gameLabel: string, score?: number): string {
  const copy = GAME_SHARE_COPY[gameId] ?? { verb: 'played', emoji: '🎮', challenge: 'Come play!' };
  const scoreStr = score !== undefined ? ` with a score of ${score}` : '';
  return `${copy.emoji} I just ${copy.verb} ${gameLabel}${scoreStr} on TRICCI's Let's Refresh page!\n\n${copy.challenge}\n\n🎮 Play now → https://tricci.in/refresh\n\n#TRICCI #Recruitment #LetsMakeHiringFun`;
}

interface ShareBarProps {
  gameId: string;
  gameLabel: string;
  score?: number;
  visible: boolean;
}

function ShareBar({ gameId, gameLabel, score, visible }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(gameId, gameLabel, score);
  const url = 'https://tricci.in/refresh';

  const shareWhatsApp = () => { trackGameShare(gameId, 'whatsapp', score); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); };
  const shareTwitter  = () => { trackGameShare(gameId, 'twitter', score);   window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); };
  const shareLinkedIn = () => { trackGameShare(gameId, 'linkedin', score);  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); };
  const copyLink = async () => {
    trackGameShare(gameId, 'copy', score);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="mt-6 w-full max-w-sm mx-auto"
        >
          <div className="bg-gradient-to-br from-primary/8 via-secondary/5 to-background border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 size={14} className="text-primary" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Share your achievement</p>
            </div>

            {/* Preview text */}
            <div className="bg-background/70 border border-border rounded-xl p-3 mb-3 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
              {text}
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* WhatsApp */}
              <button onClick={shareWhatsApp}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 hover:bg-[#25D366]/20 transition-colors group">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-[9px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">WhatsApp</span>
              </button>

              {/* Twitter / X */}
              <button onClick={shareTwitter}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors group">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-[9px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">X / Twitter</span>
              </button>

              {/* LinkedIn */}
              <button onClick={shareLinkedIn}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[#0A66C2]/10 border border-[#0A66C2]/25 hover:bg-[#0A66C2]/20 transition-colors group">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#0A66C2]">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-[9px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">LinkedIn</span>
              </button>

              {/* Copy */}
              <button onClick={copyLink}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors group ${
                  copied ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/40 border-border hover:bg-muted/70'
                }`}>
                {copied
                  ? <Check size={18} className="text-green-400" />
                  : <Copy size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                }
                <span className={`text-[9px] font-semibold transition-colors ${copied ? 'text-green-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CV Upload + AI Launch ────────────────────────────────────────────────────
function CvAiLauncher() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [launched, setLaunched] = useState(false);

  const handleFile = (f: File) => {
    if (f.type === 'application/pdf') { setFile(f); setLaunched(false); }
  };

  const launch = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await _readPdf(file);
      const prompt = `You are TIC 1.0 — Talent Intelligence Copilot on TRICCI, India's recruitment platform.

A candidate has uploaded their CV. Do the following in order:

**STEP 1 — PARSE**
Extract and present as a clean summary:
- Full name, current title, location
- Total years of experience
- Current CTC & expected CTC (if mentioned)
- Notice period
- Top 10 skills
- Last 3 roles (title, company, duration)
- Education

**STEP 2 — ATS-OPTIMISED CV REWRITE**
Rewrite the CV to achieve 80–90% ATS shortlisting rate at top Indian companies. Rules:
- 3-line professional summary packed with keywords
- Strong action verbs + quantified impact on every bullet (use estimates if not stated)
- ATS Keywords section with 15–20 industry terms
- Sections: Summary | Core Skills | Professional Experience | Education | Certifications
- Max 2 pages
- Include CTC and notice period clearly

**STEP 3 — ATS SCORE & FEEDBACK**
Give an estimated ATS score (out of 100) and 3 specific improvements the candidate can make.

--- CV CONTENT ---
${text}
--- END CV ---`;
      _openTic(prompt);
      setLaunched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragging ? 'border-primary bg-primary/10' :
          file ? 'border-green-500/50 bg-green-500/5 hover:border-green-500/70' :
          'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <FileText size={22} className="text-green-400" />
            </div>
            <p className="text-sm font-bold text-foreground">{file.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
              <CheckCircle size={12} /> Ready — click to replace
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Upload size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Drop your CV here or click to upload</p>
            <p className="text-xs text-muted-foreground">PDF only · Max 5 MB</p>
          </div>
        )}
      </div>

      {/* Launch button */}
      <AnimatePresence>
        {file && !launched && (
          <motion.button
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={launch} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Preparing your CV…</> : <><Sparkles size={15} /> Parse & Generate ATS CV</>}
          </motion.button>
        )}
        {launched && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
              <CheckCircle size={15} /> Sent to AI — check your new tab!
            </div>
            <p className="text-xs text-muted-foreground text-center">Your ATS-optimised CV is being generated. Copy it back to your profile once done.</p>
            <button onClick={() => { setLaunched(false); launch(); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">
              <Zap size={11} /> Run again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What happens */}
      {!launched && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: FileText, label: 'Parses your CV', color: '#E8470A' },
            { icon: Brain, label: 'Rewrites for ATS', color: '#6B4FBB' },
            { icon: Star, label: 'Scores & advises', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-muted/40 border border-border text-center">
              <s.icon size={13} style={{ color: s.color }} />
              <p className="text-[10px] font-semibold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick Prompt Card ────────────────────────────────────────────────────────
function QuickCard({ icon: Icon, color, title, desc, prompt }: {
  icon: React.ElementType; color: string; title: string; desc: string; prompt: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={() => _openTic(prompt)}
      className="group flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 text-left transition-all duration-150 w-full"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110"
        style={{ backgroundColor: color + '18', border: `1.5px solid ${color}30` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <ExternalLink size={11} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </motion.button>
  );
}

// ─── Inline Ask Box ───────────────────────────────────────────────────────────
function AskBox() {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { _openTic(val.trim()); setVal(''); } }}
        placeholder="e.g. How do I negotiate a 30% salary hike?"
        className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <button onClick={() => { if (val.trim()) { _openTic(val.trim()); setVal(''); } }} disabled={!val.trim()}
        className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0">
        <Send size={15} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type GameId = 'tictactoe' | 'sudoku' | '2048' | 'snake';

// ─────────────────────────────────────────────
// TIC TAC TOE
// ─────────────────────────────────────────────
type TTTBoard = (null | 'X' | 'O')[];

function checkWinner(board: TTTBoard): 'X' | 'O' | 'draw' | null {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as 'X' | 'O';
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}

function TicTacToe({ onShare }: { onShare?: () => void }) {
  const [board, setBoard] = useState<TTTBoard>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const winner = checkWinner(board);
  const sharedRef = useRef(false);

  // Trigger share once when there's a winner or draw
  useEffect(() => {
    if ((winner === 'X' || winner === 'O' || winner === 'draw') && !sharedRef.current) {
      sharedRef.current = true;
      onShare?.();
    }
  }, [winner, onShare]);

  function handleClick(i: number) {
    if (board[i] || winner) return;
    const next = [...board];
    next[i] = xIsNext ? 'X' : 'O';
    setBoard(next);
    setXIsNext(!xIsNext);
  }

  function reset() { setBoard(Array(9).fill(null)); setXIsNext(true); sharedRef.current = false; }

  const statusText = winner
    ? winner === 'draw' ? "It's a draw!" : `Player ${winner} wins! 🎉`
    : `Player ${xIsNext ? 'X' : 'O'}'s turn`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-sm font-bold text-foreground bg-muted px-4 py-2 rounded-full">{statusText}</div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: cell || winner ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick(i)}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl text-3xl font-black border-2 transition-all duration-150 ${
              cell === 'X' ? 'bg-primary/10 border-primary text-primary' :
              cell === 'O' ? 'bg-secondary/10 border-secondary text-secondary' :
              'bg-card border-border hover:border-primary/40 hover:bg-muted/50 cursor-pointer'
            }`}
          >
            {cell}
          </motion.button>
        ))}
      </div>
      <button onClick={reset}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-xl hover:border-primary transition-colors">
        <RotateCcw size={14} /> New Game
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// 2048
// ─────────────────────────────────────────────
type Grid2048 = number[][];

function newGrid(): Grid2048 {
  const g: Grid2048 = Array.from({ length: 4 }, () => Array(4).fill(0));
  addTile(g); addTile(g);
  return g;
}

function addTile(g: Grid2048) {
  const empty: [number,number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (g[r][c] === 0) empty.push([r,c]);
  if (!empty.length) return;
  const [r,c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slideRow(row: number[]): { row: number[]; score: number } {
  const filtered = row.filter(x => x !== 0);
  let score = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i+1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered.splice(i+1, 1);
    }
  }
  while (filtered.length < 4) filtered.push(0);
  return { row: filtered, score };
}

function moveGrid(g: Grid2048, dir: string): { grid: Grid2048; score: number; moved: boolean } {
  const clone = g.map(r => [...r]);
  let score = 0;
  let moved = false;

  function processRows(grid: Grid2048) {
    for (let r = 0; r < 4; r++) {
      const { row, score: s } = slideRow(grid[r]);
      if (row.join() !== grid[r].join()) moved = true;
      grid[r] = row;
      score += s;
    }
  }

  function transpose(grid: Grid2048) {
    for (let r = 0; r < 4; r++) for (let c = r+1; c < 4; c++) {
      [grid[r][c], grid[c][r]] = [grid[c][r], grid[r][c]];
    }
  }

  function reverseRows(grid: Grid2048) {
    for (let r = 0; r < 4; r++) grid[r].reverse();
  }

  if (dir === 'left') { processRows(clone); }
  else if (dir === 'right') { reverseRows(clone); processRows(clone); reverseRows(clone); }
  else if (dir === 'up') { transpose(clone); processRows(clone); transpose(clone); }
  else if (dir === 'down') { transpose(clone); reverseRows(clone); processRows(clone); reverseRows(clone); transpose(clone); }

  if (moved) addTile(clone);
  return { grid: clone, score, moved };
}

const TILE_COLORS: Record<number, string> = {
  0: 'bg-muted/30 text-transparent',
  2: 'bg-amber-100 text-amber-900',
  4: 'bg-amber-200 text-amber-900',
  8: 'bg-orange-300 text-white',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-primary text-white',
  128: 'bg-yellow-400 text-white',
  256: 'bg-yellow-500 text-white',
  512: 'bg-secondary text-white',
  1024: 'bg-purple-600 text-white',
  2048: 'bg-gradient-to-br from-yellow-400 to-primary text-white',
};

function Game2048({ onShare }: { onShare?: (score: number) => void }) {
  const [grid, setGrid] = useState<Grid2048>(newGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const sharedRef = useRef(false);

  const move = useCallback((dir: string) => {
    if (gameOver) return;
    setGrid(g => {
      const { grid: ng, score: s, moved } = moveGrid(g, dir);
      if (!moved) return g;
      setScore(prev => {
        const next = prev + s;
        setBest(b => Math.max(b, next));
        return next;
      });
      // check game over
      const hasMove = ng.some((row, r) => row.some((cell, c) => {
        if (cell === 0) return true;
        if (c < 3 && ng[r][c+1] === cell) return true;
        if (r < 3 && ng[r+1][c] === cell) return true;
        return false;
      }));
      if (!hasMove) setGameOver(true);
      return ng;
    });
  }, [gameOver]);

  // Trigger share on game over
  useEffect(() => {
    if (gameOver && !sharedRef.current) {
      sharedRef.current = true;
      onShare?.(score);
    }
  }, [gameOver, score, onShare]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, string> = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  function reset() { setGrid(newGrid()); setScore(0); setGameOver(false); sharedRef.current = false; }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="text-center px-4 py-2 bg-muted rounded-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</p>
          <p className="text-xl font-black text-foreground">{score}</p>
        </div>
        <div className="text-center px-4 py-2 bg-muted rounded-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Best</p>
          <p className="text-xl font-black text-foreground">{best}</p>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-xl hover:border-primary transition-colors">
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="bg-muted p-2 rounded-2xl grid grid-cols-4 gap-2">
        {grid.flat().map((val, i) => (
          <div key={i}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-black text-sm sm:text-base transition-all duration-100 ${TILE_COLORS[val] ?? 'bg-primary text-white'}`}>
            {val !== 0 ? val : ''}
          </div>
        ))}
      </div>

      {/* Swipe controls for mobile */}
      <div className="grid grid-cols-3 gap-1 mt-1">
        {[['','↑',''],['←','↓','→']].map((row, ri) => (
          row.map((btn, ci) => btn ? (
            <button key={`${ri}-${ci}`} onClick={() => move({ '↑':'up','↓':'down','←':'left','→':'right' }[btn]!)}
              className="w-10 h-10 rounded-lg bg-card border border-border text-lg font-bold hover:border-primary hover:bg-muted transition-colors">
              {btn}
            </button>
          ) : <div key={`${ri}-${ci}`} />)
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Use arrow keys or buttons to move</p>

      {gameOver && (
        <div className="text-center">
          <p className="text-lg font-black text-foreground mb-2">Game Over! Score: {score}</p>
          <button onClick={reset} className="bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SNAKE
// ─────────────────────────────────────────────
const COLS = 20, ROWS = 16;
type Pos = { x: number; y: number };

function randomFood(snake: Pos[]): Pos {
  let pos: Pos;
  do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

function Snake({ onShare }: { onShare?: (score: number) => void }) {
  const initSnake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
  const [snake, setSnake] = useState<Pos[]>(initSnake);
  const [food, setFood] = useState<Pos>({ x: 15, y: 8 });
  const [dir, setDir] = useState<Pos>({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const sharedRef = useRef(false);

  // Trigger share on death
  useEffect(() => {
    if (dead && !sharedRef.current) {
      sharedRef.current = true;
      onShare?.(score);
    }
  }, [dead, score, onShare]);

  const tick = useCallback(() => {
    setSnake(prev => {
      const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || prev.some(s => s.x === head.x && s.y === head.y)) {
        setRunning(false); setDead(true); return prev;
      }
      const next = [head, ...prev];
      setFood(f => {
        if (head.x === f.x && head.y === f.y) {
          setScore(s => s + 10);
          return randomFood(next);
        }
        next.pop();
        return f;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 130);
    return () => clearInterval(id);
  }, [running, tick]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Pos> = {
        ArrowUp: { x:0, y:-1 }, ArrowDown: { x:0, y:1 },
        ArrowLeft: { x:-1, y:0 }, ArrowRight: { x:1, y:0 },
        w: { x:0, y:-1 }, s: { x:0, y:1 }, a: { x:-1, y:0 }, d: { x:1, y:0 },
      };
      if (map[e.key]) {
        const nd = map[e.key];
        if (nd.x !== -dirRef.current.x || nd.y !== -dirRef.current.y) setDir(nd);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function reset() {
    setSnake(initSnake); setFood({ x: 15, y: 8 }); setDir({ x:1, y:0 });
    setScore(0); setDead(false); setRunning(false); sharedRef.current = false;
  }

  const cellSize = 18;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="text-center px-4 py-2 bg-muted rounded-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</p>
          <p className="text-xl font-black text-foreground">{score}</p>
        </div>
        {!running && !dead && (
          <button onClick={() => setRunning(true)}
            className="bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            {score === 0 ? 'Start Game' : 'Resume'}
          </button>
        )}
        {running && (
          <button onClick={() => setRunning(false)}
            className="border border-border text-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:border-primary transition-colors">
            Pause
          </button>
        )}
        <button onClick={reset}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-xl hover:border-primary transition-colors">
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="relative bg-card border-2 border-border rounded-2xl overflow-hidden"
        style={{ width: COLS * cellSize, height: ROWS * cellSize }}>
        {/* Grid lines */}
        <svg className="absolute inset-0 opacity-5" width={COLS * cellSize} height={ROWS * cellSize}>
          {Array.from({ length: COLS }).map((_, i) => (
            <line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={ROWS * cellSize} stroke="currentColor" strokeWidth="1" />
          ))}
          {Array.from({ length: ROWS }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * cellSize} x2={COLS * cellSize} y2={i * cellSize} stroke="currentColor" strokeWidth="1" />
          ))}
        </svg>

        {/* Food */}
        <div className="absolute rounded-full bg-red-500 shadow-lg shadow-red-500/50 transition-all duration-100"
          style={{ left: food.x * cellSize + 2, top: food.y * cellSize + 2, width: cellSize - 4, height: cellSize - 4 }} />

        {/* Snake */}
        {snake.map((seg, i) => (
          <div key={i} className={`absolute rounded-sm transition-all duration-100 ${i === 0 ? 'bg-primary shadow-sm shadow-primary/50' : 'bg-primary/70'}`}
            style={{ left: seg.x * cellSize + 1, top: seg.y * cellSize + 1, width: cellSize - 2, height: cellSize - 2 }} />
        ))}

        {/* Overlay */}
        {!running && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              {dead ? (
                <>
                  <p className="text-xl font-black text-foreground mb-1">Game Over!</p>
                  <p className="text-sm text-muted-foreground mb-3">Score: {score}</p>
                  <button onClick={reset} className="bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                    Play Again
                  </button>
                </>
              ) : (
                <button onClick={() => setRunning(true)}
                  className="bg-primary text-primary-foreground text-sm font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
                  {score === 0 ? '▶ Start' : '▶ Resume'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* D-pad for mobile */}
      <div className="grid grid-cols-3 gap-1">
        {[['','↑',''],['←','↓','→']].map((row, ri) => (
          row.map((btn, ci) => btn ? (
            <button key={`${ri}-${ci}`}
              onClick={() => {
                const map: Record<string, Pos> = { '↑':{x:0,y:-1},'↓':{x:0,y:1},'←':{x:-1,y:0},'→':{x:1,y:0} };
                const nd = map[btn];
                if (nd.x !== -dirRef.current.x || nd.y !== -dirRef.current.y) setDir(nd);
              }}
              className="w-10 h-10 rounded-lg bg-card border border-border text-lg font-bold hover:border-primary hover:bg-muted transition-colors">
              {btn}
            </button>
          ) : <div key={`${ri}-${ci}`} />)
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Arrow keys / WASD or buttons</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUDOKU
// ─────────────────────────────────────────────
const SUDOKU_PUZZLE = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9],
];
const SUDOKU_SOLUTION = [
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9],
];

function Sudoku({ onShare }: { onShare?: () => void }) {
  const [grid, setGrid] = useState(() => SUDOKU_PUZZLE.map(r => [...r]));
  const [selected, setSelected] = useState<[number,number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const sharedRef = useRef(false);

  // Trigger share once on solve
  useEffect(() => {
    if (solved && !sharedRef.current) {
      sharedRef.current = true;
      onShare?.();
    }
  }, [solved, onShare]);

  function handleInput(r: number, c: number, val: string) {
    if (SUDOKU_PUZZLE[r][c] !== 0) return;
    const num = parseInt(val) || 0;
    if (num < 0 || num > 9) return;
    const next = grid.map(row => [...row]);
    next[r][c] = num;
    setGrid(next);

    // validate
    const errs = new Set<string>();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (next[i][j] !== 0 && next[i][j] !== SUDOKU_SOLUTION[i][j]) errs.add(`${i}-${j}`);
    }
    setErrors(errs);
    setSolved(errs.size === 0 && next.every((row, ri) => row.every((cell, ci) => cell === SUDOKU_SOLUTION[ri][ci])));
  }

  function handleNumPad(num: number) {
    if (!selected) return;
    handleInput(selected[0], selected[1], String(num));
  }

  function reset() { setGrid(SUDOKU_PUZZLE.map(r => [...r])); setErrors(new Set()); setSolved(false); setSelected(null); sharedRef.current = false; }

  return (
    <div className="flex flex-col items-center gap-4">
      {solved && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-500 font-bold text-sm px-4 py-2 rounded-full">
          <Trophy size={14} /> Solved! Brilliant!
        </motion.div>
      )}

      {/* Grid */}
      <div className="border-2 border-foreground/30 rounded-xl overflow-hidden">
        {grid.map((row, r) => (
          <div key={r} className={`flex ${r === 2 || r === 5 ? 'border-b-2 border-foreground/30' : ''}`}>
            {row.map((cell, c) => {
              const isFixed = SUDOKU_PUZZLE[r][c] !== 0;
              const isSelected = selected?.[0] === r && selected?.[1] === c;
              const isError = errors.has(`${r}-${c}`);
              const isSameNum = selected && cell !== 0 && grid[selected[0]][selected[1]] === cell;
              return (
                <input
                  key={c}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={cell || ''}
                  readOnly={isFixed}
                  onFocus={() => setSelected([r, c])}
                  onChange={e => handleInput(r, c, e.target.value.slice(-1))}
                  className={`w-9 h-9 sm:w-10 sm:h-10 text-center text-sm font-bold outline-none transition-colors
                    ${c === 2 || c === 5 ? 'border-r-2 border-foreground/30' : 'border-r border-border'}
                    ${isFixed ? 'bg-muted text-foreground cursor-default' : 'bg-card cursor-pointer'}
                    ${isSelected ? 'bg-primary/20 text-primary' : ''}
                    ${isError ? 'text-red-500 bg-red-500/10' : ''}
                    ${isSameNum && !isSelected ? 'bg-primary/10' : ''}
                  `}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Number pad */}
      <div className="flex gap-1.5">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleNumPad(n)}
            className="w-9 h-9 rounded-lg bg-card border border-border text-sm font-bold hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors">
            {n}
          </button>
        ))}
        <button onClick={() => handleNumPad(0)}
          className="w-9 h-9 rounded-lg bg-card border border-border text-xs font-bold hover:border-red-400 hover:text-red-400 transition-colors">
          ✕
        </button>
      </div>

      <button onClick={reset}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-xl hover:border-primary transition-colors">
        <RotateCcw size={14} /> Reset Puzzle
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAME CONFIG
// ─────────────────────────────────────────────
const GAMES: { id: GameId; label: string; emoji: string; desc: string; icon: React.ElementType; color: string }[] = [
  { id: 'tictactoe', label: 'Tic Tac Toe', emoji: '⭕', desc: 'Classic 3×3 strategy', icon: Grid3x3, color: '#E8470A' },
  { id: '2048',      label: '2048',        emoji: '🔢', desc: 'Slide & merge tiles',  icon: Zap,     color: '#6B4FBB' },
  { id: 'snake',     label: 'Snake',       emoji: '🐍', desc: 'Eat, grow, survive',   icon: Gamepad2, color: '#22c55e' },
  { id: 'sudoku',    label: 'Sudoku',      emoji: '🧩', desc: 'Fill the 9×9 grid',   icon: Brain,   color: '#f59e0b' },
];

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function RefreshPage() {
  const [active, setActive] = useState<GameId>('tictactoe');
  const [shareScore, setShareScore] = useState<number | undefined>(undefined);
  const [shareVisible, setShareVisible] = useState(false);
  const game = GAMES.find(g => g.id === active)!;

  // When game changes, reset share state
  const handleGameChange = (id: GameId) => {
    setActive(id);
    setShareScore(undefined);
    setShareVisible(false);
  };

  const triggerShare = (score?: number) => {
    setShareScore(score);
    setShareVisible(true);
  };

  return (
    <>
      <Helmet>
        <title>Let's Refresh — Play Games | TRICCI</title>
        <meta name="description" content="Take a break and recharge. Play Tic Tac Toe, 2048, Snake, and Sudoku — free mini-games on TRICCI." />
        <link rel="canonical" href="https://tricci.in/refresh" />
        <meta property="og:title" content="Let's Refresh — Play Games | TRICCI" />
        <meta property="og:description" content="Take a break and recharge. Play Tic Tac Toe, 2048, Snake, and Sudoku — free mini-games on TRICCI." />
        <meta property="og:url" content="https://tricci.in/refresh" />
        <meta property="og:type" content="website" />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <img
          src="/airo-assets/images/pages/refresh/hero"
          alt="Arcade games"
          className="w-full h-52 sm:h-64 object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3 backdrop-blur-sm">
              <Gamepad2 size={12} /> Take a Break
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Let's Refresh 🎮
            </h1>
            <p className="text-white/70 text-sm max-w-md">
              Step away from the grind for a moment. A quick game resets your focus.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Game selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {GAMES.map(g => (
            <motion.button
              key={g.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleGameChange(g.id)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                active === g.id
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <span className="text-3xl">{g.emoji}</span>
              <div>
                <p className="text-sm font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{g.label}</p>
                <p className="text-[11px] text-muted-foreground">{g.desc}</p>
              </div>
              {active === g.id && (
                <motion.div layoutId="activeGame"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <ChevronRight size={9} className="text-white" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Game panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="bg-card border border-border rounded-3xl p-6 sm:p-10 flex flex-col items-center"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: game.color + '20' }}>
                <game.icon size={18} style={{ color: game.color }} />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{game.label}</h2>
                <p className="text-xs text-muted-foreground">{game.desc}</p>
              </div>
            </div>

            {active === 'tictactoe' && <TicTacToe onShare={() => triggerShare(undefined)} />}
            {active === '2048'      && <Game2048 onShare={(s) => triggerShare(s)} />}
            {active === 'snake'     && <Snake onShare={(s) => triggerShare(s)} />}
            {active === 'sudoku'    && <Sudoku onShare={() => triggerShare(undefined)} />}

            {/* Share bar — appears after a win/game-over */}
            <ShareBar
              gameId={active}
              gameLabel={game.label}
              score={shareScore}
              visible={shareVisible}
            />
          </motion.div>
        </AnimatePresence>

        {/* Back to work nudge */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">Recharged? There are great roles waiting for you.</p>
          <a href="/jobs"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
            Browse Open Roles <ChevronRight size={14} />
          </a>
        </div>

        {/* ── TIC AI COPILOT SECTION ── */}
        <div className="mt-16">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              <Bot size={12} /> AI Copilot
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Meet TIC 1.0 — Your Talent Intelligence Copilot
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
              Whether you're a candidate optimising your CV, an employer writing job descriptions, or a consultant sharpening your craft — TIC 1.0 has you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT — CV Upload + ATS Generator */}
            <div className="bg-card border border-border rounded-3xl p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    Upload CV → Get ATS-Optimised Version
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For candidates. Upload your PDF — AI parses it and rewrites it for 80–90% shortlisting rate at top Indian companies.
                  </p>
                </div>
              </div>
              <CvAiLauncher />
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border">
                <Shield size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your CV is processed locally in your browser — it's never stored by TRICCI. The AI session opens privately in ChatGPT.
                </p>
              </div>
            </div>

            {/* RIGHT — Quick launch cards + Ask box */}
            <div className="space-y-4">
              {/* Role cards */}
              <div className="space-y-3">
                <QuickCard
                  icon={Building2} color="#22c55e"
                  title="HR & Hiring Advice"
                  desc="For employers — JD writing, interview frameworks, offer structuring, and hiring best practices."
                  prompt={`I'm an HR professional / hiring manager in India. I need expert guidance on: writing compelling job descriptions that attract top talent, structuring interview processes, evaluating candidates objectively, offer negotiation, and best practices for senior hiring in the Indian market. Please provide comprehensive HR strategy and hiring best practices.`}
                />
                <QuickCard
                  icon={Users} color="#6B4FBB"
                  title="Recruitment Consulting Masterclass"
                  desc="For consultants — sourcing strategies, fee structures, client management, and building your desk."
                  prompt={`I'm a recruitment consultant in India (or aspiring to be one). Please teach me: how independent recruitment consultants operate, how to source senior candidates effectively using LinkedIn and other tools, how to structure fees and negotiate with clients, how to build a strong client base, and what strategies top consultants use to close mandates. Give me a comprehensive masterclass.`}
                />
                <QuickCard
                  icon={GraduationCap} color="#f59e0b"
                  title="Learn HR & Talent Management"
                  desc="For anyone — understand HR policies, labour laws, talent strategy, and workforce planning."
                  prompt={`I want to learn about HR and talent management in India. Please cover: key HR concepts (talent acquisition, performance management, L&D, compensation), important Indian labour laws every professional should know, how talent strategy works at different company sizes, and how to build a career in HR. Make it practical and India-specific.`}
                />
              </div>

              {/* Ask anything */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ask Anything</p>
                <AskBox />
                <div className="flex flex-wrap gap-2">
                  {[
                    'How to negotiate salary?',
                    'Write a JD for a CTO role',
                    'What is a good notice period clause?',
                    'How to ace a panel interview?',
                  ].map(q => (
                    <button key={q} onClick={() => _openTic(q)}
                      className="text-[11px] font-medium text-muted-foreground border border-border px-2.5 py-1 rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Capabilities strip */}
          <div className="mt-6 bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">What TIC 1.0 Can Do For You</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: 'Parse & rewrite CVs', color: '#E8470A' },
                { icon: Brain, label: 'ATS score & feedback', color: '#6B4FBB' },
                { icon: Building2, label: 'HR policy guidance', color: '#22c55e' },
                { icon: Users, label: 'Recruiter strategies', color: '#f59e0b' },
                { icon: Sparkles, label: 'Cover letter writing', color: '#E8470A' },
                { icon: GraduationCap, label: 'Interview prep (STAR)', color: '#6B4FBB' },
                { icon: Zap, label: 'Salary negotiation', color: '#22c55e' },
                { icon: Trophy, label: 'Career path planning', color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '18' }}>
                    <item.icon size={13} style={{ color: item.color }} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
