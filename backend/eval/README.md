# Kareerly Evaluation Harness

This directory contains the retrieval evaluation harness for Kareerly's vector-based job recommendation engine. It measures the quality of the candidate jobs surfaced for a user profile before any complex reranking.

## What it Measures

- **NDCG@10 (Normalized Discounted Cumulative Gain):** Measures ranking quality, penalizing relevant jobs that are ranked lower in the top 10.
- **MRR (Mean Reciprocal Rank):** Measures how far down a user has to swipe to find their *first* truly relevant job. Highly applicable to our swipe UI.
- **Hit Rate @ 5:** Boolean metric measuring if at least one relevant job is found in the first 5 swipes.

## Methodology: Hybrid LLM-as-a-Judge

To avoid the brittleness of a static dataset and the circular logic of a pure LLM evaluator, this harness uses a **hybrid approach**:
1. We maintain a static `golden_set.json` of synthetic user profiles.
2. We manually label a small subset of the live jobs database against these profiles to establish ground-truth relevance.
3. During evaluation, we use Groq (`llama-3.3-70b-versatile`) as an LLM judge to grade the top-10 retrieved jobs on a scale of 0-3.
4. We compute and report an **Agreement Score** between the LLM judge and the human labels for the overlapping subset. This validates the LLM judge's accuracy, allowing us to trust its scoring across the rest of the unlabelled dataset.

## How to Run

Ensure your `.env` contains `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

```bash
cd backend
python -m eval.run_eval
```

Results and historical runs are saved in `eval/results/`. 
*Note: Currently running against a baseline of ~69 jobs. The metrics will become more statistically meaningful as the scraped job pool scales.*
