import asyncio
import json
from app.ml.features import FeatureEngineer
from app.ml.ensemble_engine import EnsembleScorer
from app.ml.normalization import Normalizer

async def benchmark():
    scorer = EnsembleScorer()
    
    test_cases = [
        {
            "name": "Unicode Homograph (Adversarial)",
            "url": "https://googIe.com/login", # Capital 'I' instead of 'l'
            "expected_risk": "Dangerous"
        },
        {
            "name": "URL Padding (Adversarial)",
            "url": "https://secure-login.com--------------------------/signin",
            "expected_risk": "Dangerous"
        },
        {
            "name": "Standard Phish (Behavioral)",
            "url": "https://account-update.top/verify",
            "payload": {
                "ml_behavior": {"evalCount": 5, "largeHexCount": 2},
                "interaction": {"hasGlobalKeylogger": True}
            },
            "expected_risk": "Dangerous"
        }
    ]

    print("🚀 ShadowTrace Neural Engine v4.1 Benchmark\n" + "="*50)
    
    for tc in test_cases:
        url = tc["url"]
        norm_url = Normalizer.normalize_url(url)
        
        payload = tc.get("payload", {})
        payload["full_url"] = norm_url
        
        features = FeatureEngineer.extract_all(payload)
        analysis = await scorer.calculate_ensemble_score(features)
        
        print(f"CASE: {tc['name']}")
        print(f"  URL: {url}")
        print(f"  NORM: {norm_url}")
        print(f"  SCORE: {analysis['final_score']}")
        print(f"  CONF: {analysis['confidence']}")
        print(f"  REASONS: {', '.join(analysis['reasons'])}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(benchmark())
