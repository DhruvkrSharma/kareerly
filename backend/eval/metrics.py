import math
from typing import List

def ndcg_at_k(relevances: List[int], k: int = 10) -> float:
    """
    Computes Normalized Discounted Cumulative Gain (NDCG) at K.
    Relevances are expected to be integers (e.g., 0-3).
    """
    if not relevances:
        return 0.0

    k = min(k, len(relevances))
    
    def dcg(rel: List[int]) -> float:
        score = 0.0
        for i in range(k):
            # Using the standard formulation: (2^rel - 1) / log2(i + 2)
            score += (pow(2, rel[i]) - 1) / math.log2(i + 2)
        return score

    actual_dcg = dcg(relevances)
    ideal_relevances = sorted(relevances, reverse=True)
    ideal_dcg = dcg(ideal_relevances)

    if ideal_dcg == 0:
        return 0.0
    return actual_dcg / ideal_dcg

def mrr(relevances: List[int], threshold: int = 2) -> float:
    """
    Computes Mean Reciprocal Rank (MRR).
    Finds the first item with relevance >= threshold.
    """
    for i, rel in enumerate(relevances):
        if rel >= threshold:
            return 1.0 / (i + 1)
    return 0.0

def hit_rate_at_k(relevances: List[int], k: int = 5, threshold: int = 2) -> bool:
    """
    Computes Hit Rate at K. Returns True if at least one item in the top K
    has relevance >= threshold.
    """
    k = min(k, len(relevances))
    for i in range(k):
        if relevances[i] >= threshold:
            return True
    return False
