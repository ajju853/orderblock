import time
import httpx
from typing import Dict, Any, Optional
from app.ai.prompts import SYSTEM_PROMPT, build_analysis_prompt
from app.models.schemas import AIChatResponse

OLLAMA_BASE_URL = "http://127.0.0.1:11434"

def generate_fallback_explanation(
    context: Dict[str, Any],
    selected_zone: Optional[Dict[str, Any]],
    question: str,
    language: str
) -> str:
    """Deterministic fallback explanation when Ollama is offline or busy."""
    symbol = context.get('symbol', 'Instrument')
    tf = context.get('timeframe', '15m')
    trend = context.get('trend', 'NEUTRAL')
    price = context.get('latest_price', 0.0)
    score = context.get('score', {}).get('overall_score', 0)
    
    if language in ["hi", "hinglish"]:
        text = f"**BlockMind Analysis (Local Engine Backup)**\n\n"
        text += f"- **Symbol:** {symbol} ({tf})\n"
        text += f"- **Current Price:** ₹{price}\n"
        text += f"- **Market Structure Trend:** {trend}\n"
        text += f"- **Setup Score:** {score}/100\n\n"
        
        if selected_zone:
            z_type = selected_zone.get('type', '').upper()
            z_hi = selected_zone.get('high')
            z_lo = selected_zone.get('low')
            z_status = selected_zone.get('status', '').upper()
            z_eq = selected_zone.get('eq_price')
            text += f"**Selected {z_type} Order Block Details:**\n"
            text += f"- **Zone Range:** ₹{z_lo} - ₹{z_hi} (50% Equilibrium: ₹{z_eq})\n"
            text += f"- **Status:** {z_status}\n"
            text += f"- **Displacement:** {selected_zone.get('displacement_pct')}%\n"
            text += f"- **Invalidation Level:** Price candle close {'below ₹' + str(z_lo) if z_type == 'BULLISH' else 'above ₹' + str(z_hi)}\n"
            text += f"- **Trading Context:** Agar price is zone mein retracement deta hai aur rejection wick show kare, tab 50% equilibrium test ke sath valid confirmation banti hai."
        else:
            text += f"Engine ne confirmed BOS/CHoCH breaks detect kiye hain. Chart par green/red order block zones fresh status mein hain. Kis zone par analysis chahiye, us par click karein."
        return text
    else:
        text = f"**BlockMind Analysis (Rule-Engine Mode)**\n\n"
        text += f"- **Asset:** {symbol} [{tf}]\n"
        text += f"- **Latest Price:** {price}\n"
        text += f"- **Structural Trend:** {trend}\n"
        text += f"- **Confluence Score:** {score}/100\n\n"
        if selected_zone:
            text += f"- **Order Block Type:** {selected_zone.get('type', '').upper()}\n"
            text += f"- **Zone Price Range:** {selected_zone.get('low')} - {selected_zone.get('high')}\n"
            text += f"- **Lifecycle State:** {selected_zone.get('status', '').upper()}\n"
            text += f"- **Invalidation Barrier:** Close beyond {'low' if selected_zone.get('type') == 'bullish' else 'high'}."
        return text


async def query_ollama(
    context: Dict[str, Any],
    question: str,
    selected_zone: Optional[Dict[str, Any]] = None,
    language: str = "hinglish",
    model: str = "qwen3:8b-fast",
    timeout_sec: float = 25.0
) -> AIChatResponse:
    start_time = time.time()
    prompt = build_analysis_prompt(context, question, selected_zone, language)
    
    payload = {
        "model": model,
        "prompt": prompt,
        "system": SYSTEM_PROMPT,
        "stream": False,
        "options": {
            "temperature": 0.2, # low temperature for strict factual consistency
            "num_predict": 512
        }
    }
    
    reply = ""
    model_used = model

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                reply = data.get("response", "").strip()
            else:
                # Try fallback model if model not found
                if "not found" in resp.text.lower() and model != "llama3.2:1b":
                    payload["model"] = "llama3.2:1b"
                    model_used = "llama3.2:1b"
                    resp2 = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
                    if resp2.status_code == 200:
                        reply = resp2.json().get("response", "").strip()
                    else:
                        reply = generate_fallback_explanation(context, selected_zone, question, language)
                else:
                    reply = generate_fallback_explanation(context, selected_zone, question, language)
    except Exception as e:
        reply = f"*(Local Ollama offline or taking longer to respond. Showing verified rule engine analysis)*\n\n" + \
                generate_fallback_explanation(context, selected_zone, question, language)

    elapsed = round((time.time() - start_time) * 1000, 2)
    
    return AIChatResponse(
        reply=reply,
        model_used=model_used,
        structured_context={
            "symbol": context.get("symbol"),
            "timeframe": context.get("timeframe"),
            "trend": context.get("trend"),
            "selected_zone_id": selected_zone.get("id") if selected_zone else None,
            "overall_score": context.get("score", {}).get("overall_score")
        },
        execution_time_ms=elapsed
    )
