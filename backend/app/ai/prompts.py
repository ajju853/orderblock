from typing import Dict, Any, Optional

SYSTEM_PROMPT = """You are BlockMind AI, an elite institutional trading and market structure assistant (Order Block, BOS, CHoCH, Liquidity, FVG analyst).
You explain deterministic calculations performed by the Python trading engine.

CRITICAL RULES:
1. ONLY reference the verified market data and calculated numbers supplied in the prompt context. NEVER invent prices, fake candles, or make up signals.
2. NEVER guarantee profits or give financial advice. Always highlight risk management, stop-loss / invalidation levels, and mitigation rules.
3. Be crystal clear, concise, and structured. Use bullet points and bold highlights.
4. Language instruction: If asked in Hindi/Hinglish, explain in friendly, direct Hinglish ("Bhai", "Ye zone is level par confirm hua", "Agar price iske niche close ho jaye toh invalidate ho jayega"). If English, use professional institutional SMC terminology.
"""

def build_analysis_prompt(
    context: Dict[str, Any],
    question: str,
    selected_zone: Optional[Dict[str, Any]] = None,
    language: str = "hinglish"
) -> str:
    lang_instruction = "Respond in natural Hindi / Hinglish." if language in ["hi", "hinglish"] else "Respond in clear English."

    zone_info = "None selected"
    if selected_zone:
        zone_info = f"""
- Type: {selected_zone.get('type', '').upper()} Order Block
- Boundaries: High = {selected_zone.get('high')}, Low = {selected_zone.get('low')}, 50% Equilibrium = {selected_zone.get('eq_price')}
- Status: {selected_zone.get('status', '').upper()} (Retests count: {selected_zone.get('test_count', 0)})
- Source Candle Time: {selected_zone.get('source_candle_time')}
- Invalidation Rule: Price close beyond {'Low' if selected_zone.get('type') == 'bullish' else 'High'}
- Displacement: {selected_zone.get('displacement_pct')}%
"""

    prompt = f"""[MARKET ENGINE VERIFIED CONTEXT]
Symbol: {context.get('symbol')}
Timeframe: {context.get('timeframe')}
Latest Price: {context.get('latest_price')}
Market Structure Trend: {context.get('trend')}
Setup Score: {context.get('score', {}).get('overall_score')}/100 ({context.get('score', {}).get('direction')})
Score Factors: {context.get('score', {}).get('factors')}
Active Order Blocks: {len(context.get('order_blocks', []))} detected
Structure Events (BOS/CHoCH): {len(context.get('structure_events', []))} events confirmed
Fair Value Gaps (FVG): {len(context.get('fvgs', []))} gaps

[SELECTED ZONE DETAILS]
{zone_info}

[USER QUESTION]
{question}

[LANGUAGE INSTRUCTION]
{lang_instruction}

Analyze and explain the market context based ONLY on the verified data above.
"""
    return prompt
