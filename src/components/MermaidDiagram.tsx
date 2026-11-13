import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with editorial styling and suppress rogue error injection
mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  themeVariables: {
    primaryColor: '#f7f7f5',
    primaryTextColor: '#111111',
    primaryBorderColor: '#111111',
    lineColor: '#111111',
    secondaryColor: '#f4fce4',
    tertiaryColor: '#ffffff',
    edgeLabelBackground: '#ffffff',
  },
});

interface MermaidDiagramProps {
  chart: string;
}

/**
 * Robustly sanitizes LLM-generated Mermaid flowchart syntax to prevent parser crashes:
 * 1. Renames reserved keyword 'end' when used as a node identifier.
 * 2. Safely quotes all stadium node labels: id([label]) -> id(["label"]).
 * 3. Safely quotes all decision diamond labels: id{label} -> id{"label"}.
 * 4. Safely quotes all box node labels: id[label] -> id["label"].
 * 5. Safely quotes all edge labels: -->|label| -> -->|"label"|.
 * 6. Converts legacy inline labels: -- label --> -> -->|"label"|.
 * 7. Ensures valid flowchart header is present.
 */
function sanitizeMermaid(rawChart: string): string {
  let clean = rawChart.trim();
  // Strip outer markdown fences if present
  clean = clean.replace(/^```(?:mermaid)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Ensure starts with diagram type
  if (!/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)/m.test(clean)) {
    clean = 'flowchart TD\n' + clean;
  }

  const lines = clean.split('\n');
  const sanitized = lines.map((line) => {
    let l = line;
    // Skip comments
    if (/^\s*%%/.test(l)) return l;

    // 1. Rename reserved keyword 'end' when used as a node id or edge target
    l = l.replace(/(-->\s*)end(\b|[([{\s])/g, '$1finish$2');
    l = l.replace(/^(\s*)end(\b|[([{\s])/g, '$1finish$2');
    l = l.replace(/(\bend\b)(?=\s*\(\[|\s*\[|\s*\{)/g, 'finish');

    // 2. Stadium nodes: id([label]) -> id(["label"])
    l = l.replace(/(\b[a-zA-Z0-9_]+)\(\[\s*"?([^"\]]+)?"?\s*\]\)/g, (_, id, label) => {
      const text = (label || '').trim().replace(/"/g, "'");
      return `${id}(["${text}"])`;
    });

    // 3. Decision nodes: id{label} -> id{"label"}
    l = l.replace(/(\b[a-zA-Z0-9_]+)\{\s*"?([^"}]+)?"?\s*\}/g, (_, id, label) => {
      const text = (label || '').trim().replace(/"/g, "'");
      return `${id}{"${text}"}`;
    });

    // 4. Rectangular nodes: id[label] -> id["label"]
    l = l.replace(/(\b[a-zA-Z0-9_]+)\[\s*"?([^"\]]+)?"?\s*\]/g, (_, id, label) => {
      const text = (label || '').trim().replace(/"/g, "'");
      return `${id}["${text}"]`;
    });

    // 5. Quoted edge labels: -->|label| -> -->|"label"|
    l = l.replace(/(-->|\.->|==>)\s*\|\s*"?([^"|\n]+)?"?\s*\|/g, (_, arrow, label) => {
      const text = (label || '').trim().replace(/"/g, "'");
      return `${arrow}|"${text}"|`;
    });

    // 6. Convert inline -- label --> to -->|"label"|
    l = l.replace(/--\s*"?([^"->\n]+)?"?\s*-->/g, (_, label) => {
      const text = (label || '').trim().replace(/"/g, "'");
      return `-->|"${text}"|`;
    });

    return l;
  });

  return sanitized.join('\n');
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showSource, setShowSource] = useState<boolean>(false);
  const renderSeqRef = useRef<number>(0);

  useEffect(() => {
    let isCancelled = false;
    const currentSeq = ++renderSeqRef.current;
    const cleanChart = sanitizeMermaid(chart);

    async function executeRender() {
      // Small 30ms yield allows DOM and React layout to settle cleanly before D3 SVG measurement
      await new Promise((r) => setTimeout(r, 30));
      if (isCancelled || currentSeq !== renderSeqRef.current) return;

      // Attempt 1: Direct render with unique timestamped ID
      const id1 = `m_${Math.random().toString(36).substring(2, 8)}_${Date.now()}`;
      try {
        const { svg: renderedSvg } = await mermaid.render(id1, cleanChart);
        if (!isCancelled && currentSeq === renderSeqRef.current) {
          setSvg(renderedSvg);
          setHasError(false);
          return;
        }
      } catch (err1) {
        if (isCancelled || currentSeq !== renderSeqRef.current) return;
        console.warn('Initial mermaid render failed, retrying...', err1);
      }

      // Attempt 2: After 100ms backoff
      await new Promise((r) => setTimeout(r, 100));
      if (isCancelled || currentSeq !== renderSeqRef.current) return;

      const id2 = `m_${Math.random().toString(36).substring(2, 8)}_${Date.now()}_r`;
      try {
        const { svg: retrySvg } = await mermaid.render(id2, cleanChart);
        if (!isCancelled && currentSeq === renderSeqRef.current) {
          setSvg(retrySvg);
          setHasError(false);
          return;
        }
      } catch (err2) {
        if (isCancelled || currentSeq !== renderSeqRef.current) return;
        console.warn('Second mermaid render attempt failed, attempting final fallback...', err2);
      }

      // Attempt 3: Final fallback after 200ms
      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled || currentSeq !== renderSeqRef.current) return;

      const id3 = `m_${Math.random().toString(36).substring(2, 8)}_${Date.now()}_fb`;
      try {
        const { svg: fbSvg } = await mermaid.render(id3, cleanChart);
        if (!isCancelled && currentSeq === renderSeqRef.current) {
          setSvg(fbSvg);
          setHasError(false);
          return;
        }
      } catch (finalErr) {
        console.error('All automatic Mermaid render attempts exhausted:', finalErr);
        if (!isCancelled && currentSeq === renderSeqRef.current) {
          setHasError(true);
        }
      }
    }

    void executeRender();

    return () => {
      isCancelled = true;
    };
  }, [chart]);

  if (hasError) {
    return (
      <div className="my-3 p-3 bg-paper-sunk border border-rule text-xs font-mono">
        <div className="flex items-center justify-between mb-1 pb-1 border-b border-rule text-[10px] font-mono">
          <span className="text-ink-3 font-semibold uppercase tracking-wider">
            Diagram (Code View)
          </span>
          <button
            onClick={() => {
              setHasError(false);
              setSvg('');
              renderSeqRef.current++;
              const cleanChart = sanitizeMermaid(chart);
              const retryId = `m_${Math.random().toString(36).substring(2, 8)}_${Date.now()}`;
              void mermaid.render(retryId, cleanChart).then(
                ({ svg: rendered }) => setSvg(rendered),
                () => setHasError(true)
              );
            }}
            className="text-ink underline hover:text-ink-2 font-medium"
            title="Attempt to render flowchart as SVG"
          >
            Render Flowchart
          </button>
        </div>
        <pre className="overflow-x-auto text-ink-2 whitespace-pre font-mono text-[12px]">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 p-5 bg-paper-sunk border border-rule text-center">
        <span className="font-mono text-xs text-ink-3 uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 bg-lime-deep rounded-full animate-ping" />
          Rendering flowchart...
        </span>
      </div>
    );
  }

  return (
    <div className="my-4 border border-rule bg-paper-sunk p-3.5 overflow-hidden flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-2 pb-1.5 border-b border-rule text-[10px] font-mono uppercase tracking-wider text-ink-3">
        <span className="font-semibold text-ink">Course Flowchart</span>
        <div className="flex items-center gap-2 text-[10px]">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:text-ink text-ink-2 transition-colors underline"
            title={isExpanded ? 'Fit to compact size' : 'Expand diagram to full width'}
          >
            {isExpanded ? 'Fit View' : 'Expand View'}
          </button>
          <span>·</span>
          <button
            onClick={() => setShowSource(!showSource)}
            className="hover:text-ink text-ink-2 transition-colors underline"
            title="Toggle raw diagram syntax"
          >
            {showSource ? 'Hide Code' : 'View Code'}
          </button>
        </div>
      </div>
      <div
        className={`w-full overflow-x-auto flex justify-center p-3 bg-[#fdfdfc] border border-rule transition-all ${
          isExpanded
            ? '[&_svg]:max-w-full [&_svg]:h-auto'
            : '[&_svg]:max-w-[480px] [&_svg]:w-auto [&_svg]:max-h-[420px] [&_svg]:h-auto'
        }`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showSource && (
        <div className="w-full mt-2.5 pt-2 border-t border-rule text-xs font-mono">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-3 mb-1">Source Code</div>
          <pre className="p-2.5 bg-paper border border-rule overflow-x-auto text-[11px] text-ink-2 whitespace-pre">
            {chart}
          </pre>
        </div>
      )}
    </div>
  );
};
