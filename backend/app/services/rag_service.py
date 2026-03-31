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
        keywords=("輸出", "格式", "故事", "敘事", "llm", "回覆"),
        content=(
            "輸出規則: 只輸出可直接給玩家看的繁體中文敘事內容，"
            "避免條列、JSON、Markdown 與前後置解釋。"
        ),
    ),
    RagChunk(
        id="chapter_1",
        keywords=("chapter-1", "chapter1", "叢林", "開場"),
        content=(
            "章節1場景: 潮濕叢林探索。敘事重點是生存壓迫感、"
            "尋找洞穴線索，結尾可用『就在這一刻...』收束。"
        ),
    ),
    RagChunk(
        id="chapter_2",
        keywords=("chapter-2", "chapter2", "河流", "木橋"),
        content=(
            "章節2場景: 河流木橋。敘事重點是濕滑橋面與失足風險，"
            "維持前進張力與臨場危機。"
        ),
    ),
    RagChunk(
        id="chapter_3",
        keywords=("chapter-3", "chapter3", "洞穴", "追逐"),
        content=(
            "章節3場景: 洞穴追逐。敘事重點是回音、壓迫、"
            "被追逐的不確定感，節奏可更急促。"
        ),
    ),
    RagChunk(
        id="action_map",
        keywords=("crouch", "jump", "run_forward", "push", "動作", "目標動作"),
        content=(
            "動作語意: crouch=下蹲, jump=跳躍, run_forward=向前跑, push=推開。"
            "描述事件時，請維持動作語意一致。"
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
