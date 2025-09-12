#!/usr/bin/env python3
"""
Audio preprocessing utilities for different ASR models
"""

import os
import subprocess
import tempfile
from pathlib import Path
import librosa
import soundfile as sf

def preprocess_audio_for_firered(input_path: str, output_path: str = None) -> str:
    """
    Preprocess audio file for FireRedASR format requirements:
    - 16kHz sample rate
    - 16-bit PCM encoding
    - Mono channel
    
    Args:
        input_path: Path to input audio file
        output_path: Path for output file (optional, creates temp file if not provided)
    
    Returns:
        Path to the preprocessed audio file
    """
    if output_path is None:
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        output_path = os.path.join(temp_dir, f"firered_preprocessed_{os.path.basename(input_path)}")
    
    try:
        # Load audio file
        audio, sr = librosa.load(input_path, sr=16000, mono=True)
        
        # Save as 16kHz, 16-bit PCM WAV
        sf.write(output_path, audio, 16000, subtype='PCM_16')
        
        print(f"✅ Audio preprocessed for FireRedASR: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"❌ Error preprocessing audio for FireRedASR: {e}")
        raise

def preprocess_audio_with_ffmpeg(input_path: str, output_path: str = None) -> str:
    """
    Alternative preprocessing using FFmpeg (more reliable for some formats)
    
    Args:
        input_path: Path to input audio file
        output_path: Path for output file (optional, creates temp file if not provided)
    
    Returns:
        Path to the preprocessed audio file
    """
    if output_path is None:
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        output_path = os.path.join(temp_dir, f"firered_ffmpeg_{os.path.basename(input_path)}")
    
    try:
        # FFmpeg command to convert to 16kHz, 16-bit, mono
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ar', '16000',      # Sample rate: 16kHz
            '-ac', '1',          # Channels: mono
            '-acodec', 'pcm_s16le',  # Codec: 16-bit PCM
            '-y',                # Overwrite output file
            output_path
        ]
        
        # Run FFmpeg command
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg failed: {result.stderr}")
        
        print(f"✅ Audio preprocessed with FFmpeg for FireRedASR: {output_path}")
        return output_path
        
    except FileNotFoundError:
        print("❌ FFmpeg not found. Please install FFmpeg or use librosa preprocessing.")
        raise
    except Exception as e:
        print(f"❌ Error preprocessing audio with FFmpeg: {e}")
        raise

def get_audio_info(file_path: str) -> dict:
    """
    Get audio file information
    
    Args:
        file_path: Path to audio file
    
    Returns:
        Dictionary with audio file information
    """
    try:
        audio, sr = librosa.load(file_path, sr=None)
        duration = len(audio) / sr
        
        return {
            "sample_rate": sr,
            "channels": 1 if len(audio.shape) == 1 else audio.shape[1],
            "duration": duration,
            "samples": len(audio)
        }
    except Exception as e:
        print(f"❌ Error getting audio info: {e}")
        return {}

def is_audio_firered_compatible(file_path: str) -> bool:
    """
    Check if audio file is already in FireRedASR compatible format
    
    Args:
        file_path: Path to audio file
    
    Returns:
        True if compatible, False otherwise
    """
    try:
        info = get_audio_info(file_path)
        return (info.get("sample_rate") == 16000 and 
                info.get("channels") == 1)
    except:
        return False
