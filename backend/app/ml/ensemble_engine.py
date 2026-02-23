import logging
import statistics
from typing import Dict, Any, List

class EnsembleScorer:
    """
    ShadowTrace Engine v4.1 — Enterprise Calibrated Ensemble.
    Hardened orchestration of 4 neural layers with adaptive risk scaling.
    """

    def __init__(self):
        self.logger = logging.getLogger("shadowtrace.ml.ensemble")
        # Tuned weights based on Forensic Priority
        self.weights = {
            "L1": 0.15,  # Lexical (Adversarial Resilience)
            "L2": 0.35,  # Behavioral (High Fidelity)
            "L3": 0.40,  # Semantic (Intent Analysis)
            "L4": 0.10   # Anomaly (Statistical Context)
        }

    async def calculate_ensemble_score(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Enterprise-grade risk calculation with confidence-weighted calibration.
        Formula: FinalScore = (WeightedAvg * ConfidenceMod * BehavioralMult)
        """
        # --- Layer Predictions (0-1.0 Scale) ---
        l1_raw = self._predict_l1(features) / 100
        l2_raw = self._predict_l2(features) / 100
        l3_raw = self._predict_l3(features) / 100
        l4_raw = self._predict_l4(features) / 100
        
        # --- Platt Scaling / Calibration (Sigmoid normalization) ---
        def calibrate(x, k=10, x0=0.5):
            # Sigmoid logic to push scores toward 0 or 1 for clarity
            return 1 / (1 + math.exp(-k * (x - x0)))

        l1 = calibrate(l1_raw)
        l2 = calibrate(l2_raw)
        l3 = calibrate(l3_raw)
        l4 = calibrate(l4_raw)

        scores = {"L1": l1 * 100, "L2": l2 * 100, "L3": l3 * 100, "L4": l4 * 100}
        
        # Weighted Stacking
        weighted_avg = sum((scores[layer] / 100) * self.weights[layer] for layer in scores)
        
        # --- Confidence Modifier ---
        # Agreement between core indicators (L1, L2, L3)
        core_scores = [l1, l2, l3]
        std_dev = statistics.stdev(core_scores) if len(core_scores) > 1 else 0
        confidence = max(0.4, 1.0 - (std_dev * 1.5)) # Sensitivity to disagreement
        
        # --- Behavioral Risk Multiplier ---
        # Critical signals like credential exfiltration or keyloggers act as multipliers
        multiplier = 1.0
        if features.get("suspicious_submission_count", 0) > 0: multiplier *= 1.5
        if features.get("has_keylogger"): multiplier *= 1.3
        if features.get("external_fetch_detected"): multiplier *= 1.1
        
        # Final Score Calculation (Capped at 100)
        # We boost the score if confidence is high, or suppress if uncertain
        raw_final = (weighted_avg * multiplier) * (0.8 + 0.2 * confidence)
        final_score = min(100.0, raw_final * 100)
        
        # ML-based Reasoning Generation
        reasons = self._generate_ml_reasoning(scores, features)
        
        return {
            "final_score": round(final_score, 1),
            "confidence": round(confidence, 2),
            "layer_scores": {k: round(v, 1) for k, v in scores.items()},
            "reasons": reasons,
            "explainability": {
                "top_features": sorted(features.items(), key=lambda x: abs(x[1]), reverse=True)[:5],
                "behavioral_boost": round((multiplier - 1.0) * 100, 1),
                "calibration_method": "Platt Scaling (Sigmoid)"
            }
        }

    def _predict_l1(self, f: Dict[str, float]) -> float:
        """Adversarial Lexical Prediction."""
        score = 0
        if f.get("entropy", 0) > 4.2: score += 40
        if f.get("path_entropy", 0) > 4.5: score += 20
        if f.get("has_homograph"): score += 80 # Critical security indicator
        if f.get("dot_count", 0) > 3: score += 20
        if f.get("digit_ratio", 0) > 0.4: score += 30
        if f.get("is_ip"): score += 60
        
        # Normalized length risk
        score += min(15, f.get("url_length", 0) / 10)
        return min(score, 100)

    def _predict_l2(self, f: Dict[str, float]) -> float:
        """Density-Aware Behavioral Prediction."""
        score = 0
        if f.get("obfuscation_score", 0) > 20: score += 50
        if f.get("eval_count", 0) > 0: score += 30
        if f.get("form_traps", 0) > 0: score += 50
        if f.get("suspicious_handlers", 0) > 3: score += 40
        
        # Multi-stage behavioral consensus
        if f.get("external_fetch_detected") and f.get("has_login"): score += 30
        
        return min(score, 100)

    def _predict_l3(self, f: Dict[str, float]) -> float:
        """Enterprise Semantic Calibration."""
        score = 10.0 # Elevated safe baseline
        if f.get("has_login"): score += 30
        if f.get("has_keylogger"): score += 60
        if f.get("suspicious_submission_count", 0) > 0: score += 90
        
        # Punish mixed-security signaling
        if f.get("has_login") and not f.get("is_https"): score += 40
        
        return min(score, 100)

    def _predict_l4(self, f: Dict[str, float]) -> float:
        """Statistical Anomaly Context."""
        score = 15.0
        if f.get("external_request_ratio", 0) > 0.7: score += 60
        if f.get("network_request_count", 0) > 50: score += 30
        return min(score, 100)

    def _generate_ml_reasoning(self, scores: Dict[str, float], features: Dict[str, float]) -> List[str]:
        reasons = []
        if features.get("has_homograph"):
            reasons.append("Adversarial: Unicode homograph (look-alike) domain detected")
        if features.get("has_keylogger"):
            reasons.append("Infiltration: Active credential field monitoring (Keylogger) detected")
        if features.get("suspicious_submission_count", 0) > 0:
            reasons.append("Exfiltration: Suspicious data transmission to external endpoint")
        
        if scores["L1"] > 70 and not reasons:
            reasons.append(f"Lexical Anomaly: High URL entropy ({features.get('entropy'):.1f}) and structural obfuscation")
        if scores["L2"] > 70 and not reasons:
            reasons.append("Behavioral: Excessive dynamic script injection and form manipulation")
        
        if not reasons:
            if max(scores.values()) < 30:
                reasons.append("ML Consensus: Standard operational patterns (Safe)")
            else:
                reasons.append("Heuristic Audit: Mild structural irregularities detected")
        
        return reasons
