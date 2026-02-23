import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.ml.features import FeatureEngineer
from app.ml.ensemble_engine import EnsembleScorer
from app.ml.whitelist_manager import WhitelistManager
from app.ml.normalization import Normalizer

logger = logging.getLogger("shadowtrace.services.risk_scorer")
scorer = EnsembleScorer()
whitelist = WhitelistManager()

def classify_risk(score: float) -> str:
    if score <= 30: return "Safe"
    elif score <= 60: return "Suspicious"
    return "Dangerous"

async def evaluate(request: AnalyzeRequest, db: AsyncIOMotorDatabase) -> AnalyzeResponse:
    try:
        # 0. Adversarial Normalization
        original_url = request.fullURL or request.domain.fullURL
        normalized_url = Normalizer.normalize_url(original_url)
        
        # 1. False Positive Mitigation: Whitelist Check
        domain_name = request.domain.hostname
        if whitelist.is_trusted(domain_name):
            return AnalyzeResponse(
                risk_score=0.0,
                risk_level="Safe",
                reasons=["Neural Consensus: Domain belongs to global trust-tier (Whitelist)"],
                confidence=1.0,
                source="whitelist"
            )

        # 2. Pipeline: Feature Engineering
        raw_payload = request.model_dump()
        raw_payload["full_url"] = normalized_url # Use normalized URL for feature extraction
        features = FeatureEngineer.extract_all(raw_payload)
        
        # 3. Pipeline: ML Ensemble Inference
        analysis = await scorer.calculate_ensemble_score(features)
        
        final_score = analysis["final_score"]
        
        # 4. Risk Decay for Historically Safe Domains
        try:
            last_entry = await db.scan_logs.find_one(
                {"domain": domain_name, "final_risk_score": {"$lt": 40}},
                sort=[("timestamp", -1)]
            )
            if last_entry:
                final_score = whitelist.apply_risk_decay(final_score, last_entry["timestamp"].replace(tzinfo=timezone.utc))
        except Exception as e:
            logger.error(f"Decay check failed: {e}")

        risk_level = classify_risk(final_score)
        
        # 5. Log results to MongoDB
        try:
            now = datetime.now(timezone.utc)
            log_entry = {
                "domain": domain_name,
                "full_url": normalized_url,
                "original_url": original_url,
                "confidence": analysis["confidence"],
                "final_risk_score": final_score,
                "risk_level": risk_level,
                "reasons": analysis["reasons"],
                "engine_scores": analysis["layer_scores"],
                "explainability": analysis["explainability"],
                "network_requests": raw_payload.get("network_requests", []),
                "timestamp": now,
            }
            await db.scan_logs.insert_one(log_entry)
        except Exception as e:
            logger.error(f"Log failed: {e}")

        return AnalyzeResponse(
            risk_score=final_score,
            risk_level=risk_level,
            reasons=analysis["reasons"],
            confidence=analysis["confidence"],
            engine_scores=analysis["layer_scores"],
            explainability=analysis["explainability"]
        )

    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        return AnalyzeResponse(
            risk_score=0,
            risk_level="Safe",
            reasons=["Internal ML analysis failure"],
            confidence=0.0
        )
