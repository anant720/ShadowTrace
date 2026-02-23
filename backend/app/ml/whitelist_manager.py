import logging
from typing import Set, Dict
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("shadowtrace.ml.whitelist")

class WhitelistManager:
    """
    Manages trusted domain memory and risk decay to minimize false positives.
    """
    
    def __init__(self):
        # In a real enterprise app, this would be backed by a Redis/DB cache 
        # of the Tranco/Alexa Top 1M domains.
        self.static_whitelist: Set[str] = {
            "google.com", "microsoft.com", "apple.com", "amazon.com",
            "facebook.com", "github.com", "linkedin.com", "netflix.com",
            "twitter.com", "gmail.com", "outlook.com", "zoom.us"
        }
        
    def is_trusted(self, domain: str) -> bool:
        """Check if domain is in the top-tier trust list."""
        if not domain: return False
        # Match exact or parent domain
        parts = domain.split('.')
        for i in range(len(parts) - 1):
            d = '.'.join(parts[i:])
            if d in self.static_whitelist:
                return True
        return False

    def apply_risk_decay(self, current_score: float, last_seen: datetime) -> float:
        """
        Historically safe domains have their risk scores decayed over time.
        Reduces FP for sites with long-standing clean history.
        """
        if not last_seen: return current_score
        
        days_since = (datetime.now(timezone.utc) - last_seen).days
        if days_since > 30:
            # Decay score by 50% after 30 days of no flags
            return current_score * 0.5
        elif days_since > 7:
            # Decay score by 20% after 7 days
            return current_score * 0.8
            
        return current_score
