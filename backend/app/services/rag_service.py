from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RagChunk:
    id: str
    keywords: tuple[str, ...]
    content: str


_KNOWLEDGE_BASE: tuple[RagChunk, ...] = (
    RagChunk(
        id="output_style",
        keywords=("輸出", "格式", "故事", "敘事", "llm", "回覆", "繁體"),
        content=(
            "輸出規則: 只輸出可直接給玩家看的繁體中文敘事內容，"
            "避免條列、JSON、Markdown 與前後置解釋。"
        ),
    ),
    RagChunk(
        id="core_worldview",
        keywords=("半導體", "夢境", "小廖", "晶圓", "課堂", "世界觀"),
        content=(
            "世界觀一致性: 主角是上課睡著的小廖，夢見自己縮小進入半導體世界。"
            "敘事要把冒險感與半導體知識點（電子、矽、摻雜、製程、記憶體、訊號）自然融合。"
        ),
    ),
    RagChunk(
        id="chapter_1_style",
        keywords=("chapter-1", "chapter1", "第一章", "1-", "loop 1", "loop 10"),
        content=(
            "第一章風格: 晶圓工廠與能帶概念的探索感。"
            "可描寫銀白色紋路、製程光影、前往核心區的路，"
            "並維持『就在這一刻...』的節奏收束。"
        ),
    ),
    RagChunk(
        id="chapter_2_style",
        keywords=("chapter-2", "chapter2", "第二章", "2-", "loop 11", "loop 20"),
        content=(
            "第二章風格: 記憶體核心與資料脈衝的高速壓迫感。"
            "可描寫位元平台、訊號穩定、雜訊干擾與出口考驗，"
            "逐步推進到夢境結束前的收束感。"
        ),
    ),
    RagChunk(
        id="loop_pacing",
        keywords=("loop", "20", "進度", "1-1", "2-10", "段落"),
        content=(
            "進度節奏: 全程共 20 段劇情，前 10 段偏製程與基礎概念，"
            "後 10 段偏記憶體與訊號。每段應有微小推進，不可重複同一句型。"
        ),
    ),
    RagChunk(
        id="gameplay_loop",
        keywords=("事件", "劇情", "成功", "失敗", "分數", "血量"),
        content=(
            "遊戲節奏: 劇情鋪陳 -> 事件挑戰 -> 成功/失敗回饋 -> 下一段劇情。"
            "文字應反映目前階段，不要跨階段劇透。"
        ),
    ),
)


def _score_chunk(query: str, chunk: RagChunk) -> int:
    score = 0
    for keyword in chunk.keywords:
        if keyword and keyword in query:
            score += 1
    return score


def retrieve(query: str, *, top_k: int = 3) -> list[RagChunk]:
    normalized_query = (query or "").strip().lower()
    if not normalized_query:
        return []

    scored: list[tuple[int, RagChunk]] = []
    for chunk in _KNOWLEDGE_BASE:
        score = _score_chunk(normalized_query, chunk)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored[: max(1, top_k)]]


def format_rag_context(query: str, *, top_k: int = 3) -> str | None:
    chunks = retrieve(query, top_k=top_k)
    if not chunks:
        return None

    lines = ["[RAG Context]"]
    for chunk in chunks:
        lines.append(f"- {chunk.content}")
    return "\n".join(lines)


def append_rag_to_prompt(prompt: str, query: str, *, top_k: int = 3) -> str:
    rag_context = format_rag_context(query, top_k=top_k)
    if not rag_context:
        return prompt
    return f"{prompt}\n\n{rag_context}"


def append_rag_to_system_prompt(system_prompt: str | None, query: str, *, top_k: int = 3) -> str | None:
    rag_context = format_rag_context(query, top_k=top_k)
    if not rag_context:
        return system_prompt

    base = (system_prompt or "").strip()
    if not base:
        return rag_context
    return f"{base}\n\n{rag_context}"
