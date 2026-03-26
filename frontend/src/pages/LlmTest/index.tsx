import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Loader2, Send, Sparkles, Square } from 'lucide-react';

import BackHomeButton from '@/components/common/BackHomeButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLlmChat } from '@/hooks/mutations/useLlmChat';
import type { LlmChatMessage } from '@/types/game';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const modelOptions = ['qwen3.5:0.8b', 'qwen3.5:latest'];

export default function LlmTest() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState(modelOptions[0]);
  const [typing, setTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const messageIdRef = useRef(0);
  const typingTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const llmChatMutation = useLlmChat();
  const isResponding = llmChatMutation.isPending || typing;

  const canSend = useMemo(
    () => input.trim().length > 0 && !llmChatMutation.isPending && !typing,
    [input, llmChatMutation.isPending, typing]
  );

  const createMessageId = () => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}`;
  };

  const typeAssistantReply = (messageId: string, fullText: string) => {
    return new Promise<void>((resolve) => {
      if (!fullText) {
        resolve();
        return;
      }

      let index = 0;
      typingTimerRef.current = window.setInterval(() => {
        index += 1;
        const partial = fullText.slice(0, index);

        setMessages((prev) =>
          prev.map((item) =>
            item.id === messageId ? { ...item, content: partial } : item
          )
        );

        if (index >= fullText.length) {
          if (typingTimerRef.current !== null) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          resolve();
        }
      }, 18);
    });
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        clearInterval(typingTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, llmChatMutation.isPending]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isResponding) {
      return;
    }

    const userMessageId = createMessageId();
    const history: LlmChatMessage[] = [
      ...messages.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: message },
    ];
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: message },
    ]);
    setInput('');

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await llmChatMutation.mutateAsync({
        payload: { message, messages: history, model },
        signal: controller.signal,
      });

      abortControllerRef.current = null;
      const assistantMessageId = createMessageId();
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: 'assistant', content: '' },
      ]);
      setTyping(true);
      await typeAssistantReply(assistantMessageId, response.data.reply);
      setTyping(false);
    } catch (err) {
      abortControllerRef.current = null;
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setTyping(false);
    }
  };

  const interruptResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (typingTimerRef.current !== null) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setTyping(false);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void onSubmit(event as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  return (
    <section className="relative flex h-[calc(100vh-5rem)] min-h-[640px] flex-col overflow-hidden rounded-2xl border border-border/70 shadow-sm max-w-screen-md mx-auto">
      <BackHomeButton />

      <CardHeader className="flex-row justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base">LLM 測試對話</CardTitle>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="llm-model">
            模型
          </label>
          <select
            id="llm-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs sm:text-sm"
          >
            {modelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent
        ref={messagesRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-5 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
      >
        {messages.length !== 0 &&
          messages.map((item) => (
            <div
              key={item.id}
              className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
                  item.role === 'user'
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border/70 bg-card text-card-foreground'
                }`}
              >
                <CardContent className="p-0">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {item.content}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}

        {llmChatMutation.isPending ? (
          <div className="flex justify-start">
            <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
              <CardContent className="inline-flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                LLM 思考中...
              </CardContent>
            </Card>
          </div>
        ) : null}
      </CardContent>

      <div className="bg-background/90 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
        <form className="mx-auto max-w-4xl" onSubmit={onSubmit}>
          <Card className="rounded-2xl border-input shadow-sm">
            <CardContent className="p-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="輸入訊息，按 Enter 送出..."
                className="max-h-44 min-h-24 resize-y border-0 bg-transparent shadow-none focus-visible:ring-0"
              />

              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  Shift + Enter 換行
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setMessages([]);
                    }}
                  >
                    清空
                  </Button>
                  <Button
                    type={isResponding ? 'button' : 'submit'}
                    variant={isResponding ? 'destructive' : 'default'}
                    disabled={!isResponding && !canSend}
                    onClick={isResponding ? interruptResponse : undefined}
                  >
                    {isResponding ? (
                      <>
                        <Square className="size-4" />
                        中斷
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        送出
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </section>
  );
}
