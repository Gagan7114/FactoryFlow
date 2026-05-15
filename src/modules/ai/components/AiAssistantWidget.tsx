import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { useAskAssistant } from '@/modules/ai/api';
import type { AiAssistantSource } from '@/modules/ai/types';
import { Badge, Button, Textarea } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AiAssistantSource[];
};

const suggestedQuestions = [
  'Why is Generate Boxes not working?',
  'Find latest boxes for FG0000004',
  'Explain status code 400 in label generation',
];

type AssistantMarkdownBlock =
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'list';
      ordered: boolean;
      items: string[];
    };

function parseAssistantMarkdown(content: string): AssistantMarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: AssistantMarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listBlock: Extract<AssistantMarkdownBlock, { type: 'list' }> | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join(' '),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listBlock) return;
    blocks.push(listBlock);
    listBlock = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    const listMatch = bulletMatch ?? numberedMatch;

    if (listMatch) {
      const ordered = Boolean(numberedMatch);
      flushParagraph();
      if (!listBlock || listBlock.ordered !== ordered) {
        flushList();
        listBlock = { type: 'list', ordered, items: [] };
      }
      listBlock.items.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const content = token.slice(2, -2);
    if (token.startsWith('**')) {
      nodes.push(
        <strong className="font-semibold" key={`${keyPrefix}-bold-${match.index}`}>
          {content}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.82em]"
          key={`${keyPrefix}-code-${match.index}`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function AssistantMessageContent({ content }: { content: string }) {
  const blocks = parseAssistantMarkdown(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 leading-6">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'paragraph') {
          return (
            <p key={`paragraph-${blockIndex}`}>
              {renderInlineMarkdown(block.text, `paragraph-${blockIndex}`)}
            </p>
          );
        }

        const ListTag = block.ordered ? 'ol' : 'ul';
        return (
          <ListTag
            className={cn(
              'ml-4 space-y-1',
              block.ordered ? 'list-decimal' : 'list-disc',
            )}
            key={`list-${blockIndex}`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`list-${blockIndex}-${itemIndex}`}>
                {renderInlineMarkdown(item, `list-${blockIndex}-${itemIndex}`)}
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}

function getAssistantErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'AI assistant is unavailable right now.';
}

export function AiAssistantWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const askAssistant = useAskAssistant();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, askAssistant.isPending]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || askAssistant.isPending) return;

    const nextMessageId = (suffix: string) => {
      messageIdRef.current += 1;
      return `${messageIdRef.current}-${suffix}`;
    };

    const userMessage: ChatMessage = {
      id: nextMessageId('user'),
      role: 'user',
      content: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');

    askAssistant.mutate(
      {
        question: trimmed,
        page: location.pathname,
      },
      {
        onSuccess: (response) => {
          setMessages((current) => [
            ...current,
            {
              id: nextMessageId('assistant'),
              role: 'assistant',
              content: response.answer,
              sources: response.sources,
            },
          ]);
        },
        onError: (error) => {
          const message = getAssistantErrorMessage(error);
          setMessages((current) => [
            ...current,
            {
              id: nextMessageId('assistant-error'),
              role: 'assistant',
              content: message,
            },
          ]);
          toast.error(message);
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(question);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen && (
        <section className="mb-3 flex h-[560px] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border bg-background shadow-xl">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Factory AI</h2>
                <p className="text-xs text-muted-foreground">Read-only assistant</p>
              </div>
            </div>
            <Button
              aria-label="Close AI assistant"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                {suggestedQuestions.map((item) => (
                  <button
                    className="block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    key={item}
                    type="button"
                    onClick={() => ask(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                key={message.id}
              >
                <div
                  className={cn(
                    'max-w-[86%] rounded-lg px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {message.role === 'assistant' ? (
                    <AssistantMessageContent content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.sources.map((source) => (
                        <Badge
                          key={`${message.id}-${source.type}-${source.label}`}
                          variant="outline"
                        >
                          {source.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {askAssistant.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <form className="border-t p-3" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Textarea
                className="min-h-11 resize-none"
                placeholder="Ask about labels, boxes, pallets, batches..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    ask(question);
                  }
                }}
              />
              <Button
                aria-label="Send question"
                className="h-11 w-11 shrink-0"
                disabled={!question.trim() || askAssistant.isPending}
                size="icon"
                type="submit"
              >
                {askAssistant.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
          </form>
        </section>
      )}

      <Button
        aria-label="Open AI assistant"
        className="h-12 w-12 rounded-full shadow-lg"
        size="icon"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <MessageCircle />
      </Button>
    </div>
  );
}
