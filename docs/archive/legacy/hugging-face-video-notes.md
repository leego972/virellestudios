# Hugging Face Video Generation API - Critical Findings

## KEY INSIGHT:
- The "HF Inference" provider (serverless, free) focuses on **CPU inference** (text, embeddings, etc.)
- **Text-to-Video** on HF goes through **third-party providers**: fal-ai, Replicate, etc.
- These providers are NOT free — they are pay-per-use
- The direct HF Inference API endpoint may work for some models but is unreliable for video

## What actually works for FREE video generation:
1. **fal.ai** via HF router — still requires payment
2. **Replicate** via HF router — still requires payment
3. Direct HF Inference API with LTX-Video — may work but very slow and unreliable

## Best approach for Virelle Studios:
Since the platform already has **Runway** and **OpenAI** API keys in env.ts:
- Use the **platform's own Runway/OpenAI keys** as the default for ALL users
- The platform absorbs the cost (it's cheap: ~$0.05-0.10/sec for Runway)
- Users can optionally bring their own keys for priority/faster access
- HF can remain as a "free" option but with clear warning about slower/lower quality

## Platform keys available:
- `ENV.openaiApiKey` — OpenAI (Sora)
- `ENV.runwayApiKey` — Runway ML
