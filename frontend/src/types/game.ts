export type JudgeResult = 'pending' | 'success' | 'fail';

export interface PlayerState {
  hp: number;
  score: number;
}

export interface GameState {
  chapter_id: string;
  story_count: number;
  event_id: string | null;
  target_action: string | null;
  time_remaining_ms: number;
  judge_result: JudgeResult;
  is_game_over: boolean;
  ending_type: 'good' | 'bad' | null;
  ending_title: string | null;
  ending_story: string | null;
  player_state: PlayerState;
  story_segment: string;
}

export interface GameStateSnapshot extends GameState {
  event_end_time: number;
  server_time: number;
}

export interface EventRecord {
  event_id: string;
  chapter: number;
  text: string;
  target_action: string;
  success_text: string;
  fail_text: string;
  time_limit_ms: number;
  status: string;
  created_at: number;
  resolved_at: number | null;
}

export interface StoryResult {
  story_segment: string;
  tone: string;
  template_key: string;
}

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatPayload {
  message?: string;
  messages?: LlmChatMessage[];
  model?: string;
  system_prompt?: string;
}

export interface LlmChatResult {
  reply: string;
  model: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
