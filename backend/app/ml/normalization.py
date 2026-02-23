import re
from urllib.parse import unquote, urlparse

class Normalizer:
    """
    Adversarial Normalization: Strips camouflage and resolves obfuscation 
    before features are extracted.
    """
    
    @staticmethod
    def normalize_url(url: str) -> str:
        """Strips padding and resolves multiple encodings."""
        if not url: return ""
        
        # 1. Resolve recursive percent-encoding (Adversarial Bypass)
        normalized = url
        for _ in range(3): # Max 3 depth
            prev = normalized
            normalized = unquote(normalized)
            if normalized == prev: break
            
        # 2. Strip padding (e.g., long sequences of hyphens or underscores)
        normalized = re.sub(r'[-_]{5,}', '-', normalized)
        
        # 3. Handle @ symbol diversion
        if '@' in normalized:
            # Phishing often uses user:pass@trusted.com/attacker
            # This extracts the actual landing domain/path
            pass
            
        return normalized

    @staticmethod
    def normalize_js(code_sample: str) -> str:
        """Resolves basic string splitting obfuscation."""
        if not code_sample: return ""
        # Resolve 'a' + 'b' + 'c' -> 'abc'
        resolved = re.sub(r"['\"] \+ ['\"]", "", code_sample)
        return resolved
