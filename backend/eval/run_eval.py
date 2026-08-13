import os
import json
import asyncio
from datetime import datetime
from pathlib import Path

# Adjust python path if run from backend/ directory
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.embedding_service import EmbeddingService
from app.core.database import supabase_rpc, get_supabase_client
from eval.judge import evaluate_relevance_llm, compute_agreement
from eval.metrics import ndcg_at_k, mrr, hit_rate_at_k

EVAL_DIR = Path(__file__).parent
GOLDEN_SET_PATH = EVAL_DIR / "golden_set.json"
RESULTS_DIR = EVAL_DIR / "results"

async def fetch_job_details(job_ids: list[int]) -> dict:
    """Fetches job details for a list of job IDs from Supabase."""
    if not job_ids:
        return {}
    
    supabase = get_supabase_client()
    # Postgrest syntax: id.in.(1,2,3)
    id_list = ",".join(map(str, job_ids))
    res = supabase.table("jobs").select("*").in_("id", job_ids).execute()
    return {j["id"]: j for j in res.data}

async def run_evaluation():
    print("🚀 Starting Kareerly Retrieval Evaluation...")
    RESULTS_DIR.mkdir(exist_ok=True)
    
    with open(GOLDEN_SET_PATH, "r") as f:
        profiles = json.load(f)
        
    embedding_service = EmbeddingService()
    
    all_ndcg = []
    all_mrr = []
    all_hit_rate = []
    
    # For agreement tracking
    human_labels_flat = []
    llm_scores_flat = []
    
    results_log = []
    
    for profile in profiles:
        print(f"\nEvaluating Profile: {profile['profile_id']}")
        
        # 1. Exact Production Retrieval Path
        skills = " ".join(profile.get("skills", []) or [])
        roles = " ".join(profile.get("preferred_roles", []) or [])
        profile_text = f"{roles} {skills} {profile.get('experience_years', 0)} years experience"
        
        print("  - Generating embedding...")
        profile_embedding = embedding_service.generate_embedding(profile_text)
        
        print("  - Running match_jobs RPC...")
        try:
            matches = await supabase_rpc("match_jobs", {
                "query_embedding": profile_embedding,
                "match_threshold": 0.3,
                "match_count": 10,
            })
        except Exception as e:
            print(f"  ❌ RPC failed: {e}")
            matches = []
            
        retrieved_job_ids = [m["id"] for m in matches]
        print(f"  - Retrieved {len(retrieved_job_ids)} jobs")
        
        if not retrieved_job_ids:
            all_ndcg.append(0.0)
            all_mrr.append(0.0)
            all_hit_rate.append(0.0)
            continue
            
        # 2. Fetch full job details for the retrieved jobs
        job_details = await fetch_job_details(retrieved_job_ids)
        
        # Build mapping of human labels if available
        human_label_map = {item["job_id"]: item["label"] for item in profile.get("labeled_jobs", [])}
        
        # 3. Grade the retrieved jobs using the LLM judge
        relevances = []
        for j_id in retrieved_job_ids:
            job = job_details.get(j_id)
            if not job:
                relevances.append(0)
                continue
                
            score = evaluate_relevance_llm(profile, job)
            relevances.append(score)
            
            # If we have a human label for this job, track for agreement
            if j_id in human_label_map:
                human_labels_flat.append(human_label_map[j_id])
                llm_scores_flat.append(score)
                
        # 4. Compute Metrics
        p_ndcg = ndcg_at_k(relevances, k=10)
        p_mrr = mrr(relevances, threshold=2) # 2 = Good Match
        p_hit_rate = hit_rate_at_k(relevances, k=5, threshold=2)
        
        all_ndcg.append(p_ndcg)
        all_mrr.append(p_mrr)
        all_hit_rate.append(1.0 if p_hit_rate else 0.0)
        
        print(f"  -> NDCG@10: {p_ndcg:.3f} | MRR: {p_mrr:.3f} | HitRate@5: {p_hit_rate}")
        
        results_log.append({
            "profile_id": profile["profile_id"],
            "retrieved_jobs": retrieved_job_ids,
            "relevances_scored": relevances,
            "metrics": {
                "ndcg_10": p_ndcg,
                "mrr": p_mrr,
                "hit_rate_5": p_hit_rate
            }
        })
        
    # Aggregate
    avg_ndcg = sum(all_ndcg) / len(all_ndcg) if all_ndcg else 0.0
    avg_mrr = sum(all_mrr) / len(all_mrr) if all_mrr else 0.0
    avg_hr = sum(all_hit_rate) / len(all_hit_rate) if all_hit_rate else 0.0
    agreement = compute_agreement(human_labels_flat, llm_scores_flat)
    
    print("\n" + "="*50)
    print("📊 EVALUATION SUMMARY")
    print("="*50)
    print(f"Profiles Evaluated: {len(profiles)}")
    print(f"Average NDCG@10:    {avg_ndcg:.3f}")
    print(f"Average MRR:        {avg_mrr:.3f}")
    print(f"Hit Rate @ 5:       {avg_hr:.1%}")
    print("-" * 50)
    
    if human_labels_flat:
        print(f"🧑‍⚖️ LLM Judge Agreement: {agreement:.1f}% (over {len(human_labels_flat)} labeled pairs)")
        if agreement < 70.0:
            print("⚠️  WARNING: Agreement is below 70%. The LLM judge may be diverging from human expectations.")
    else:
        print("🧑‍⚖️ LLM Judge Agreement: N/A (no human labels found)")
    print("="*50)
    
    # Save output
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = RESULTS_DIR / f"{timestamp}.json"
    with open(out_file, "w") as f:
        json.dump({
            "summary": {
                "avg_ndcg_10": avg_ndcg,
                "avg_mrr": avg_mrr,
                "hit_rate_5": avg_hr,
                "judge_agreement_pct": agreement,
                "total_profiles": len(profiles),
                "labeled_pairs_evaluated": len(human_labels_flat)
            },
            "profiles": results_log
        }, f, indent=2)
    print(f"\n💾 Results saved to {out_file}")

if __name__ == "__main__":
    asyncio.run(run_evaluation())
