#!/usr/bin/env python3
"""
FireRedASR Engine for speech recognition
"""

import os
import sys
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add FireRedASR to path
FIRERED_PATH = os.path.join(os.path.dirname(__file__), "fireredasr")
if os.path.exists(FIRERED_PATH):
    sys.path.insert(0, FIRERED_PATH)

try:
    from fireredasr.models.fireredasr import FireRedAsr
    FIRERED_AVAILABLE = True
except ImportError:
    FIRERED_AVAILABLE = False
    print("❌ FireRedASR not available. Please install FireRedASR and ensure models are downloaded.")

from audio_utils import preprocess_audio_for_firered, is_audio_firered_compatible

class FireRedEngine:
    """FireRedASR engine for speech recognition"""
    
    def __init__(self, model_dir: str = "pretrained_models/FireRedASR-AED-L"):
        """
        Initialize FireRedASR engine
        
        Args:
            model_dir: Path to FireRedASR model directory
        """
        if not FIRERED_AVAILABLE:
            raise ImportError("FireRedASR not available. Please install FireRedASR.")
        
        self.model_dir = model_dir
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load FireRedASR model"""
        try:
            if not os.path.exists(self.model_dir):
                raise FileNotFoundError(f"Model directory not found: {self.model_dir}")
            
            print(f"🎤 Loading FireRedASR model from {self.model_dir}...")
            self.model = FireRedAsr.from_pretrained("aed", self.model_dir)
            print("✅ FireRedASR model loaded successfully")
            
        except Exception as e:
            raise RuntimeError(f"Failed to load FireRedASR model: {e}")
    
    def transcribe(self, audio_path: str, **kwargs) -> Dict[str, Any]:
        """
        Transcribe audio using FireRedASR
        
        Args:
            audio_path: Path to audio file
            **kwargs: Additional parameters for transcription
        
        Returns:
            Dictionary with transcription results
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        try:
            # Check if audio needs preprocessing
            if not is_audio_firered_compatible(audio_path):
                print("🔄 Preprocessing audio for FireRedASR...")
                preprocessed_path = preprocess_audio_for_firered(audio_path)
            else:
                preprocessed_path = audio_path
                print("✅ Audio already compatible with FireRedASR")
            
            # Prepare batch input (FireRedASR expects batch format)
            batch_uttid = ["transcription"]
            batch_wav_path = [preprocessed_path]
            
            # Default parameters for FireRedASR-AED
            transcribe_params = {
                "use_gpu": 0,
                "beam_size": 3,
                "nbest": 1,
                "decode_max_len": 0,
                "softmax_smoothing": 1.25,
                "aed_length_penalty": 0.6,
                "eos_penalty": 1.0,
                **kwargs  # Allow override of default parameters
            }
            
            print("🎵 Transcribing with FireRedASR...")
            results = self.model.transcribe(
                batch_uttid,
                batch_wav_path,
                transcribe_params
            )
            
            # Extract transcription text
            if results and len(results) > 0:
                transcription_result = results[0]
                text = transcription_result.get("text", "").strip()
            else:
                text = ""
            
            # Clean up temporary file if we created one
            if preprocessed_path != audio_path and os.path.exists(preprocessed_path):
                try:
                    os.remove(preprocessed_path)
                except:
                    pass
            
            return {
                "text": text,
                "model": "firered-aed",
                "engine": "firered",
                "metadata": {
                    "model_dir": self.model_dir,
                    "parameters": transcribe_params
                }
            }
            
        except Exception as e:
            print(f"❌ FireRedASR transcription error: {e}")
            return {
                "text": f"[ERROR: {e}]",
                "model": "firered-aed",
                "engine": "firered",
                "error": str(e)
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_type": "firered-aed",
            "model_dir": self.model_dir,
            "available": FIRERED_AVAILABLE,
            "loaded": self.model is not None
        }
