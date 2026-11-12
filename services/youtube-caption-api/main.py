from __future__ import annotations

import os
import re
import threading
import time
from collections import OrderedDict
from typing import Any
from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled, VideoUnavailable

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
CACHE_TTL_SECONDS = int(os.getenv("CAPTION_CACHE_TTL_SECONDS", "21600"))
CACHE_MAX_ITEMS = int(os.getenv("CAPTION_CACHE_MAX_ITEMS", "128"))

app = FastAPI(title="Student YouTube Caption API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in os.getenv("CORS_ORIGINS", "*").split(",") if item.strip()],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"]
)

_cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
_cache_lock = threading.Lock()


class Cue(BaseModel):
    text: str
    start: float
    duration: float


class CaptionResponse(BaseModel):
    video_id: str
    language: str
    is_generated: bool
    source: str
    cues: list[Cue]


def extract_video_id(value: str) -> str:
    raw = value.strip()
    if VIDEO_ID_RE.fullmatch(raw):
        return raw

    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    host = parsed.netloc.lower().split(":", 1)[0]
    path_parts = [part for part in parsed.path.split("/") if part]

    if host in {"youtu.be", "www.youtu.be"} and path_parts:
        candidate = path_parts[0]
    elif host.endswith("youtube.com"):
        if parsed.path == "/watch":
            candidate = parse_qs(parsed.query).get("v", [""])[0]
        elif path_parts and path_parts[0] in {"shorts", "embed", "live", "v"} and len(path_parts) > 1:
            candidate = path_parts[1]
        else:
            candidate = parse_qs(parsed.query).get("v", [""])[0]
    else:
        candidate = ""

    candidate = candidate.split("?", 1)[0].split("&", 1)[0].strip()
    if not VIDEO_ID_RE.fullmatch(candidate):
        raise HTTPException(status_code=422, detail="Invalid YouTube URL or video ID")
    return candidate


def cache_get(video_id: str) -> dict[str, Any] | None:
    now = time.time()
    with _cache_lock:
        cached = _cache.get(video_id)
        if not cached:
            return None
        created_at, value = cached
        if now - created_at > CACHE_TTL_SECONDS:
            _cache.pop(video_id, None)
            return None
        _cache.move_to_end(video_id)
        return value


def cache_put(video_id: str, value: dict[str, Any]) -> None:
    with _cache_lock:
        _cache[video_id] = (time.time(), value)
        _cache.move_to_end(video_id)
        while len(_cache) > CACHE_MAX_ITEMS:
            _cache.popitem(last=False)


def snippet_to_cue(snippet: Any) -> Cue | None:
    if isinstance(snippet, dict):
        text = str(snippet.get("text", "")).strip()
        start = float(snippet.get("start", 0))
        duration = float(snippet.get("duration", 0))
    else:
        text = str(getattr(snippet, "text", "")).strip()
        start = float(getattr(snippet, "start", 0))
        duration = float(getattr(snippet, "duration", 0))
    if not text:
        return None
    return Cue(text=text, start=max(0.0, start), duration=max(0.0, duration))


def fetch_track(video_id: str) -> dict[str, Any]:
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)
    tracks = list(transcript_list)

    # Manual English is preferred, followed by manually supplied alternatives.
    ordered: list[Any] = []
    for generated in (False, True):
        ordered.extend(
            track for track in tracks
            if bool(getattr(track, "is_generated", False)) == generated
            and any(str(getattr(track, "language_code", "")).lower().startswith(prefix) for prefix in ("en",))
        )
    # If English does not exist, use the first available manual track, then auto track.
    ordered.extend(track for track in tracks if track not in ordered and not bool(getattr(track, "is_generated", False)))
    ordered.extend(track for track in tracks if track not in ordered)

    errors: list[str] = []
    for track in ordered:
        try:
            fetched = track.fetch()
            raw_items = fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else fetched
            cues = [cue for item in raw_items if (cue := snippet_to_cue(item)) is not None]
            if cues:
                return {
                    "video_id": video_id,
                    "language": str(getattr(track, "language_code", "und")),
                    "is_generated": bool(getattr(track, "is_generated", False)),
                    "source": "youtube-transcript-api",
                    "cues": [cue.model_dump() for cue in cues[:2000]],
                }
        except Exception as exc:  # One broken language track must not stop fallback tracks.
            errors.append(str(exc))

    raise RuntimeError("No usable transcript track was returned by YouTube")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/transcript", response_model=CaptionResponse)
def transcript(video_id: str = Query(..., min_length=1, max_length=2048)) -> CaptionResponse:
    resolved_id = extract_video_id(video_id)
    cached = cache_get(resolved_id)
    if cached:
        return CaptionResponse.model_validate(cached)

    try:
        result = fetch_track(resolved_id)
    except (TranscriptsDisabled, NoTranscriptFound):
        raise HTTPException(status_code=404, detail="YouTube did not expose a usable caption track")
    except (VideoUnavailable, PermissionError) as exc:
        raise HTTPException(status_code=404, detail=str(exc) or "YouTube video is unavailable")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Caption provider request failed: {exc}")

    cache_put(resolved_id, result)
    return CaptionResponse.model_validate(result)
