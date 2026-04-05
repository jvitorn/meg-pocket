"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content?: string | null;
  className?: string;
};

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "label"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

function inlineMarkdown(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(pattern);

  return parts
    .filter(Boolean)
    .map((part, index) => {
      if (/^`[^`]+`$/.test(part)) {
        return (
          <code key={`${part}-${index}`} className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground/90">
            {part.slice(1, -1)}
          </code>
        );
      }

      if (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part)) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
      }

      if (/^\*[^*]+\*$/.test(part) || /^_[^_]+_$/.test(part)) {
        return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
      }

      return <span key={`${part}-${index}`}>{part}</span>;
    });
}

function parseMarkdownBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ kind: "list", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    if (/^\[(.+)\]$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "label", text: line.slice(1, -1).trim() });
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "quote", text: line.replace(/^>\s?/, "") });
      continue;
    }

    if (/^([-*•])\s+/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^([-*•])\s+/, ""));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const safeContent = content?.trim() ?? "";
  if (!safeContent) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Sem descrição disponível.</p>;
  }

  const blocks = parseMarkdownBlocks(safeContent);

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const levelClass =
            block.level === 1
              ? "text-xl"
              : block.level === 2
                ? "text-lg"
                : "text-base";

          return (
            <h3 key={`${block.kind}-${index}`} className={cn("font-semibold tracking-tight text-foreground", levelClass)}>
              {inlineMarkdown(block.text)}
            </h3>
          );
        }

        if (block.kind === "label") {
          return (
            <div
              key={`${block.kind}-${index}`}
              className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              {block.text}
            </div>
          );
        }

        if (block.kind === "quote") {
          return (
            <blockquote
              key={`${block.kind}-${index}`}
              className="border-l-2 border-primary/60 bg-primary/5 px-4 py-3 text-sm leading-7 text-foreground/90"
            >
              {inlineMarkdown(block.text)}
            </blockquote>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={`${block.kind}-${index}`} className="space-y-2 pl-1 text-sm leading-7 text-foreground/90">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                  <span className="flex-1">{inlineMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`${block.kind}-${index}`} className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
            {inlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}

