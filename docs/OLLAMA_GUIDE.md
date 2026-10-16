# BlockMind AI — Local Ollama AI Setup & Troubleshooting Guide

BlockMind AI features an offline-capable, local AI Copilot that runs on your local machine using **Ollama**.

---

## 1. Supported Local Models

The platform is optimized for the following models detected on your system:
- **`qwen3:8b-fast` / `qwen3:8b` (Recommended)**: Exceptional multi-lingual support (Hindi, Hinglish, English) and deep quantitative structure comprehension.
- **`llama3.2:1b`**: Ultra-lightweight model with sub-second response times on standard CPUs and laptops.

You can download or switch models via standard Ollama CLI commands:
```bash
ollama run qwen3:8b-fast
ollama run llama3.2:1b
```

---

## 2. Ollama Service Verification

Ensure Ollama is running in the background:
```bash
ollama list
```
Test the HTTP endpoint directly:
```bash
curl http://127.0.0.1:11434/api/tags
```

---

## 3. Strict Grounding & Hallucination Prevention

The AI Assistant does **NOT** compute price indicators or guess market levels.
1. Python engine computes exact structure breaks, order blocks, equilibrium levels, and score factors.
2. Verified facts are passed in a structured JSON payload.
3. System prompt strictly constrains responses to the facts provided.

---

## 4. Offline Fallback Behavior

If the Ollama daemon is offline, uninstalled, or takes longer than the configured timeout, BlockMind AI **never fails or crashes**.
Instead, the deterministic rule-based explanation engine generates institutional analysis directly from the calculated order block attributes.
