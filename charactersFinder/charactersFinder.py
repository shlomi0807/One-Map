"""
One Piece Chapter Character Scraper
====================================
Uses the Fandom MediaWiki API (onepiece.fandom.com) to collect
character appearances per chapter and build a searchable index.

Outputs:
    1. onepiece_cache.json  - Raw chapter -> [characters]
    2. onepiece_index.json  - Character -> [list of chapters]
    3. onepiece_counts.json - Character -> total appearance count

Usage:
    python onepiece_scraper.py

Dependencies:
    pip install requests beautifulsoup4 tqdm
"""

import requests
import json
import time
import re
import sys
import logging
from pathlib import Path
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

# Path to the directory where this script is located (ensures files stay in charactersFinder)
SCRIPT_DIR = Path(__file__).parent

BASE_API_URL   = "https://onepiece.fandom.com/api.php"
CACHE_FILE     = SCRIPT_DIR / "onepiece_cache.json"      # Raw chapter→characters map
INDEX_FILE     = SCRIPT_DIR / "onepiece_index.json"      # Inverted character→chapters map
COUNT_FILE     = SCRIPT_DIR / "onepiece_counts.json"     # Character→total chapter count
MAX_WORKERS    = 6          # Parallel threads (be kind to the server)
REQUEST_DELAY  = 0.15       # Seconds between requests per thread
MAX_RETRIES    = 3          # Retries on transient HTTP errors
CHAPTER_LIMIT  = None       # Set e.g. 50 to test; None = fetch everything

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# 1. Fetch All Chapter Page Titles
# ──────────────────────────────────────────────────────────────────────────────

def fetch_chapter_titles() -> list[str]:
    """
    Query the wiki's allpages list via the MediaWiki API
    to find all pages starting with 'Chapter '.
    Handles pagination automatically (apcontinue).
    """
    titles: list[str] = []
    params = {
        "action":       "query",
        "list":         "allpages",
        "apprefix":     "Chapter ",  # Notice the space
        "apnamespace":  "0",         # Main article namespace
        "aplimit":      "500",
        "format":       "json",
    }

    log.info("📋 Fetching chapter list from wiki allpages...")
    while True:
        data = _api_get(params)
        if data is None:
            break

        pages = data.get("query", {}).get("allpages", [])
        for p in pages:
            title = p["title"]
            # Keep only "Chapter NNN" pages (skip subpages, talk pages, etc.)
            if re.match(r"^Chapter \d+$", title):
                titles.append(title)

        cont = data.get("continue", {}).get("apcontinue")
        if not cont:
            break
        params["apcontinue"] = cont

    # Sort numerically
    titles.sort(key=lambda t: int(t.split()[-1]))
    log.info(f"   Found {len(titles)} chapters.")

    if CHAPTER_LIMIT:
        titles = titles[:CHAPTER_LIMIT]
        log.info(f"   (Limited to first {CHAPTER_LIMIT} for testing)")

    return titles


# ──────────────────────────────────────────────────────────────────────────────
# 2. Parse Characters From a Single Chapter Page
# ──────────────────────────────────────────────────────────────────────────────

def parse_characters_from_wikitext(wikitext: str) -> list[str]:
    """
    Extract character names from the 'Characters' section.
    Filters out Cover Pages, Flashbacks, and generic links.
    Returns a deduplicated list of character names.
    """
    characters: list[str] = []

    # ── 1. Locate the Characters section ──────────────────────────────────────
    section_pattern = re.compile(
        r"==\s*Characters(?: in Order of Appearance)?\s*==(.*?)(?=\n==\s*[^=]|\Z)",
        re.DOTALL | re.IGNORECASE,
    )
    match = section_pattern.search(wikitext)
    
    if match:
        raw_section = match.group(1)

        # ── 2. Filter out unwanted sub-sections and lines (Flashbacks/Covers) ─────
        valid_lines = []
        skip_current_subsection = False
        
        for line in raw_section.split('\n'):
            line_stripped = line.strip()
            # Check for Subheadings (=== Heading ===)
            if re.match(r"^===\s*(Cover Page|Flashback|Title Page|Cover Story|Short-Term).*?===", line_stripped, re.IGNORECASE):
                skip_current_subsection = True
                continue
            elif re.match(r"^===\s*(Chapter|Main|Story|Present).*?===", line_stripped, re.IGNORECASE):
                skip_current_subsection = False
                continue
                
            if skip_current_subsection:
                continue
                
            # Check for inline indicators on the specific line
            lower_line = line.lower()
            if any(keyword in lower_line for keyword in ["(flashback)", "(cover", "title page", "(mentioned)", "(picture)", "(silhouette)"]):
                continue
                
            valid_lines.append(line)

        clean_section = "\n".join(valid_lines)

        # ── 3. Extract Characters ─────────────────────────────────────────────────
        # Format A: {{CharBox|link=Name|...}}
        for m in re.finditer(r"\{\{CharBox[^}]*\|link=([^|}\n]+)", clean_section, re.IGNORECASE):
            name = _clean_name(m.group(1))
            if name and _looks_like_character(name):
                characters.append(name)

        # Format B: *[[Name]] or standard list items
        for line in clean_section.split('\n'):
            if line.strip().startswith('*'):
                for m in re.finditer(r"\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]", line):
                    name = _clean_name(m.group(1))
                    if name and _looks_like_character(name):
                        characters.append(name)
                        
    else:
        # ── SAFE FALLBACK ────────────────────────────────────────────────────────
        for m in re.finditer(r"\{\{CharBox[^}]*\|link=([^|}\n]+)", wikitext, re.IGNORECASE):
            name = _clean_name(m.group(1))
            if name and _looks_like_character(name):
                characters.append(name)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for c in characters:
        if c not in seen:
            seen.add(c)
            unique.append(c)

    return unique


def _clean_name(raw: str) -> str:
    """Strip wiki markup, whitespace, and known non-character suffixes."""
    name = raw.strip()
    name = re.sub(r"\s*\(.*?\)\s*$", "", name).strip()
    name = re.sub(r"[{}\[\]]", "", name).strip()
    return name


def _looks_like_character(name: str) -> bool:
    """
    Heuristic filter: skip obvious non-character wiki links and generic terms.
    """
    skip_prefixes = (
        "File:", "Category:", "Template:", "One Piece", "Chapter",
        "Episode", "Volume", "Arc", "Saga", "Grand Line", "Devil Fruit",
        "World Government", "Bounty",
    )
    
    skip_exact = {
        "pirate", "pirates", "marine", "marines", "citizen", "citizens",
        "animal", "animals", "villager", "villagers", "guard", "guards",
        "soldier", "soldiers", "agent", "agents", "ninja", "samurai",
        "mink", "giant", "giants", "human", "humans", "doctor", "king", 
        "queen", "prince", "princess", "unknown", "ship", "island"
    }

    if not name or len(name) <= 1 or name.isdigit():
        return False
        
    if name.lower() in skip_exact:
        return False
        
    if any(name.startswith(p) for p in skip_prefixes):
        return False
        
    return True


# ──────────────────────────────────────────────────────────────────────────────
# 3. Fetch One Chapter (wikitext → characters)
# ──────────────────────────────────────────────────────────────────────────────

def fetch_chapter(title: str) -> tuple[int, list[str]]:
    """
    Fetch the wikitext for a chapter page and return
    (chapter_number, [character_names]).
    """
    chapter_num = int(title.split()[-1])

    params = {
        "action":    "parse",
        "page":      title,
        "prop":      "wikitext",
        "format":    "json",
    }
    data = _api_get(params)
    if data is None or "parse" not in data:
        log.warning(f"⚠️  Could not fetch: {title}")
        return chapter_num, []

    wikitext  = data["parse"]["wikitext"]["*"]
    characters = parse_characters_from_wikitext(wikitext)
    return chapter_num, characters


# ──────────────────────────────────────────────────────────────────────────────
# 4. Build Full Cache: chapter_num → [characters]
# ──────────────────────────────────────────────────────────────────────────────

def build_chapter_cache(titles: list[str]) -> dict[int, list[str]]:
    """
    Fetch all chapters in parallel (MAX_WORKERS threads).
    Returns {chapter_number: [character, ...], ...}.
    Results are streamed to CACHE_FILE incrementally.
    """
    cache: dict[int, list[str]] = {}
    if CACHE_FILE.exists():
        try:
            raw = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            cache = {int(k): v for k, v in raw.items()}
            log.info(f"   Loaded {len(cache)} cached chapters from {CACHE_FILE}.")
        except Exception as e:
            log.warning(f"Cache load failed ({e}); starting fresh.")

    to_fetch = [t for t in titles if int(t.split()[-1]) not in cache]
    
    if not to_fetch:
        log.info(f"🌐 All {len(titles)} chapters are already cached!")
        return cache

    log.info(f"🌐 Fetching {len(to_fetch)} chapters "
             f"({len(titles) - len(to_fetch)} already cached)…")

    try:
        from tqdm import tqdm
        progress = tqdm(total=len(to_fetch), unit="ch", ncols=80)
        use_tqdm = True
    except ImportError:
        log.info("   (install tqdm for a progress bar)")
        progress = None
        use_tqdm = False

    completed = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_chapter, t): t for t in to_fetch}
        for future in as_completed(futures):
            title = futures[future]
            try:
                chapter_num, characters = future.result()
                cache[chapter_num] = characters
            except Exception as e:
                log.error(f"Error on {title}: {e}")

            completed += 1
            if use_tqdm:
                progress.update(1)
            elif completed % 50 == 0:
                log.info(f"   Progress: {completed}/{len(to_fetch)}")

            if completed % 25 == 0:
                _save_json(CACHE_FILE, {str(k): v for k, v in cache.items()})

    if use_tqdm:
        progress.close()

    _save_json(CACHE_FILE, {str(k): v for k, v in cache.items()})
    log.info(f"✅ Chapter cache saved → {CACHE_FILE}")
    return cache


# ──────────────────────────────────────────────────────────────────────────────
# 5. Build Inverted Index: character → [chapters] & character → count
# ──────────────────────────────────────────────────────────────────────────────

def build_character_index(
    chapter_cache: dict[int, list[str]]
) -> dict[str, list[int]]:
    """
    Invert the chapter→characters map to character→[chapters].
    Each character's chapter list is stored in descending order (newest first).
    Also generates a character→count JSON file sorted by appearances (descending).
    """
    index: dict[str, list[int]] = defaultdict(list)

    for chapter_num, characters in chapter_cache.items():
        for char in characters:
            index[char].append(chapter_num)

    # Sort each list descending (newest → oldest) and convert to plain dict
    result = {
        char: sorted(chapters, reverse=True)
        for char, chapters in index.items()
    }

    # Save onepiece_index.json
    _save_json(INDEX_FILE, result)
    log.info(f"✅ Character index saved → {INDEX_FILE}  "
             f"({len(result)} unique characters)")

    # Build character -> count dictionary
    counts_result = {
        char: len(chapters)
        for char, chapters in result.items()
    }
    
    # Sort the dictionary by count (value) in descending order
    sorted_counts = dict(sorted(counts_result.items(), key=lambda item: item[1], reverse=True))
    
    _save_json(COUNT_FILE, sorted_counts)
    log.info(f"✅ Character counts saved → {COUNT_FILE}")

    return result


# ──────────────────────────────────────────────────────────────────────────────
# 6. Interactive Search
# ──────────────────────────────────────────────────────────────────────────────

def search_character(
    index: dict[str, list[int]],
    query: str,
) -> Optional[list[int]]:
    """
    Case-insensitive lookup. Returns chapter list (descending) or None.
    If exact match not found, suggests similar names.
    """
    query_lower = query.strip().lower()
    for name, chapters in index.items():
        if name.lower() == query_lower:
            return chapters

    candidates = [
        name for name in index if query_lower in name.lower()
    ]
    if candidates:
        print(f"\n❓ '{query}' not found exactly. Did you mean:")
        for c in candidates[:10]:
            print(f"   • {c}  ({len(index[c])} appearances)")
        return None

    print(f"\n❌ Character '{query}' not found in the index.")
    return None


def interactive_search(index: dict[str, list[int]]) -> None:
    """REPL loop: prompt for character names and display results."""
    if not index:
        print("\n❌ Index is empty. No characters were found to search.")
        return

    total_chars    = len(index)
    total_chapters = max((max(v) for v in index.values() if v), default=0)

    print("\n" + "═" * 60)
    print("  🏴‍☠️  One Piece Character Search")
    print(f"  {total_chars:,} characters indexed across {total_chapters:,} chapters")
    print("  Type a character name (or 'quit' to exit)")
    print("═" * 60)

    while True:
        try:
            query = input("\n👤 Character name: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye! ☠️")
            break

        if not query or query.lower() in {"quit", "exit", "q"}:
            print("Bye! ☠️")
            break

        chapters = search_character(index, query)
        if chapters:
            exact_name = next(
                n for n in index if n.lower() == query.strip().lower()
            )
            print(f"\n✅ {exact_name}  —  {len(chapters)} appearances")
            print(f"   Chapters (newest → oldest):")

            row: list[str] = []
            for i, ch in enumerate(chapters, 1):
                row.append(str(ch))
                if i % 15 == 0:
                    print("   " + ", ".join(row))
                    row = []
            if row:
                print("   " + ", ".join(row))


# ──────────────────────────────────────────────────────────────────────────────
# Utility Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _api_get(params: dict, retries: int = MAX_RETRIES) -> Optional[dict]:
    """
    Perform a GET request to the Fandom MediaWiki API with retry logic.
    Returns parsed JSON dict or None on failure.
    """
    params.setdefault("format", "json")

    headers = {
        "User-Agent": (
            "OnePieceCharacterScraper/1.3 "
            "(educational project; github.com/example)"
        )
    }

    for attempt in range(1, retries + 1):
        try:
            time.sleep(REQUEST_DELAY)
            resp = requests.get(
                BASE_API_URL,
                params=params,
                headers=headers,
                timeout=20,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            if resp.status_code == 429:           # Rate-limited
                wait = 2 ** attempt
                log.warning(f"Rate-limited; waiting {wait}s…")
                time.sleep(wait)
            else:
                log.error(f"HTTP {resp.status_code}: {e}")
                return None
        except requests.exceptions.RequestException as e:
            if attempt < retries:
                log.warning(f"Request error ({e}); retry {attempt}/{retries}…")
                time.sleep(2 ** attempt)
            else:
                log.error(f"Failed after {retries} retries: {e}")
                return None

    return None


def _save_json(path: Path, data: dict) -> None:
    """Write dict to a JSON file atomically (write to tmp, then rename)."""
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def load_index_from_disk() -> Optional[dict[str, list[int]]]:
    """Load a previously built index from disk if available."""
    if INDEX_FILE.exists():
        raw = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        return {k: [int(x) for x in v] for k, v in raw.items()}
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("\n🏴‍☠️  One Piece Chapter Character Scraper")
    print("─" * 45)

    index = load_index_from_disk()

    if index:
        log.info(f"📂 Loaded existing index from {INDEX_FILE} "
                 f"({len(index):,} characters).")
        
        # Ensure count file is updated/created and sorted even when reading existing index
        counts_result = {char: len(chapters) for char, chapters in index.items()}
        sorted_counts = dict(sorted(counts_result.items(), key=lambda item: item[1], reverse=True))
        _save_json(COUNT_FILE, sorted_counts)
        log.info(f"✅ Character counts updated → {COUNT_FILE}")

        rebuild = input(
            "\n🔄 Rebuild index from scratch? [y/N]: "
        ).strip().lower()
        if rebuild != "y":
            interactive_search(index)
            return

    # Step 1: Get all chapter titles
    titles = fetch_chapter_titles()
    if not titles:
        log.error("No chapters found. Check network / wiki structure.")
        sys.exit(1)

    # Step 2: Fetch each chapter and extract characters (parallel, cached)
    chapter_cache = build_chapter_cache(titles)

    # Step 3: Build inverted index and character counts
    index = build_character_index(chapter_cache)

    # Step 4: Demo output
    print("\n" + "─" * 45)
    print("📊 Sample entries from the index:")
    sample_chars = ["Monkey D. Luffy", "Roronoa Zoro", "Nami", "Sanji", "Nico Robin"]
    for char in sample_chars:
        chapters = search_character(index, char)
        if chapters:
            preview = chapters[:8]
            print(f"  {char:22s} → {preview}{'…' if len(chapters) > 8 else ''}")

    # Step 5: Interactive search
    interactive_search(index)


if __name__ == "__main__":
    main()