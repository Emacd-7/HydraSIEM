
class LogNormalizer:
    """
    Splunk-inspired Common Information Model (CIM) Normalizer.
    Ensures all logs (from any source) map to standard fields:
    - timestamp, user, src_ip, dest_ip, action, signature, severity
    """
    
    @staticmethod
    def normalize(raw_log):
        # Default mapping for our simulator logs
        # Simulator output: {'timestamp', 'user_id', 'action', 'resource_id', 'data_volume', 'is_malicious', 'source_ip'}
        
        normalized = {
            'timestamp': raw_log.get('timestamp'),
            'user': raw_log.get('user_id') or raw_log.get('user') or 'unknown',
            'src_ip': raw_log.get('source_ip') or '0.0.0.0',
            'dest': raw_log.get('resource_id') or raw_log.get('dest') or 'unknown',
            'action': raw_log.get('action') or 'unknown',
            'bytes': raw_log.get('data_volume', 0),
            'vendor_severity': 'High' if raw_log.get('is_malicious') else 'Informational'
        }
        
        # Calculate derived urgency (RBA prep)
        # Map actions to CIM-like signatures
        if 'Login' in normalized['action']:
            normalized['signature'] = 'Authentication Event'
            normalized['risk_increment'] = 5 # RBA Base
        elif 'File' in normalized['action']:
            normalized['signature'] = 'Data Access'
            normalized['risk_increment'] = 15
        elif 'Upload' in normalized['action']:
            normalized['signature'] = 'Data Exfiltration'
            normalized['risk_increment'] = 25
        else:
            normalized['signature'] = 'Unknown Activity'
            normalized['risk_increment'] = 0
            
        # Malware / Attack flag overrides
        if raw_log.get('is_malicious'):
            normalized['risk_increment'] += 40
            normalized['category'] = 'Threat'
        else:
            normalized['category'] = 'Network'
            
        return normalized
