#!/usr/bin/env python3
"""
Whisper + LLM Model Comparison Script

Compare different Whisper backends and Ollama models for audio transcription and summarization.

Features:
- Multiple Whisper backends (faster-whisper, openai-whisper)
- Multiple Ollama models (llama3.1:8b, mistral:7b, etc.)
- Timing measurements for each stage
- Quality metrics (WER if reference provided)
- Export results to CSV

Setup:
1. Install required packages: pip install -r notebook_requirements.txt
2. Ensure Ollama is running locally
3. Set your audio file paths and model preferences below
"""

import os
import time
import json
import requests
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# =============================================================================
# CONFIGURATION - MODIFY THESE VARIABLES
# =============================================================================

# Audio file paths (use absolute paths or relative to script)
AUDIO_PATHS = [
    "./sample_audio_1.wav",  # Replace with your audio files
    "./sample_audio_2.mp3",
]

# Reference texts for WER calculation (optional, same length as AUDIO_PATHS)
# Leave as None if no reference available
REFERENCE_TEXTS = [
    None,  # No reference for first file
    "This is a reference transcript for the second audio file.",
]

# Whisper models to test
WHISPER_MODELS = [
    "tiny",      # fastest, lowest quality
    "base",      # fast, decent quality
    "small",     # balanced
    "medium",    # higher quality, slower
    "large-v3",  # best quality, slowest
]

# Ollama models to test
OLLAMA_MODELS = [
    "llama3.1:8b",
    "mistral:7b",
    "llama3.1:1b",
    "qwen2.5:7b",
]

# Ollama base URL (change if running on different host/port)
OLLAMA_BASE_URL = "http://localhost:11434"

# Summary prompt template
SUMMARY_PROMPT_TEMPLATE = "Summarize this transcript in 2-3 sentences:\n\n{transcript}"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def transcribe_with_faster_whisper(audio_path: str, model_size: str) -> Tuple[str, float]:
    """Transcribe audio using faster-whisper"""
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        start_time = time.time()
        segments, info = model.transcribe(audio_path, beam_size=5)
        transcript = " ".join([segment.text for segment in segments])
        duration = time.time() - start_time
        return transcript.strip(), duration
    except Exception as e:
        return f"Error: {str(e)}", 0

def transcribe_with_openai_whisper(audio_path: str, model_size: str) -> Tuple[str, float]:
    """Transcribe audio using openai-whisper"""
    try:
        import whisper
        model = whisper.load_model(model_size)
        start_time = time.time()
        result = model.transcribe(audio_path)
        transcript = result["text"]
        duration = time.time() - start_time
        return transcript.strip(), duration
    except Exception as e:
        return f"Error: {str(e)}", 0

def summarize_with_ollama(text: str, model_name: str, base_url: str) -> Tuple[str, float]:
    """Summarize text using Ollama"""
    try:
        prompt = SUMMARY_PROMPT_TEMPLATE.format(transcript=text)
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }
        
        start_time = time.time()
        response = requests.post(f"{base_url}/api/generate", json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        summary = result.get("response", "No response")
        duration = time.time() - start_time
        
        return summary.strip(), duration
    except Exception as e:
        return f"Error: {str(e)}", 0

def calculate_wer(reference: str, hypothesis: str) -> Optional[float]:
    """Calculate Word Error Rate between reference and hypothesis"""
    if not reference or not hypothesis or 'Error:' in hypothesis:
        return None
    try:
        from jiwer import wer
        return wer(reference, hypothesis)
    except Exception:
        return None

def check_ollama_model_availability(model_name: str, base_url: str) -> bool:
    """Check if an Ollama model is available"""
    try:
        response = requests.get(f"{base_url}/api/tags", timeout=10)
        if response.status_code == 200:
            models = response.json().get("models", [])
            return any(model["name"] == model_name for model in models)
        return False
    except Exception:
        return False

def add_custom_whisper_backend(name: str, transcribe_func):
    """Add a custom Whisper backend"""
    global whisper_backends
    whisper_backends[name] = transcribe_func
    print(f"✅ Added custom Whisper backend: {name}")

def add_custom_ollama_model(name: str):
    """Add a custom Ollama model to the test list"""
    global OLLAMA_MODELS
    if name not in OLLAMA_MODELS:
        OLLAMA_MODELS.append(name)
        print(f"✅ Added Ollama model: {name}")
    else:
        print(f"⚠️  Model {name} already in list")

def add_custom_whisper_model_size(size: str):
    """Add a custom Whisper model size to test"""
    global WHISPER_MODELS
    if size not in WHISPER_MODELS:
        WHISPER_MODELS.append(size)
        print(f"✅ Added Whisper model size: {size}")
    else:
        print(f"⚠️  Model size {size} already in list")

# =============================================================================
# MAIN COMPARISON FUNCTION
# =============================================================================

def run_comparison() -> List[Dict]:
    """Run the full comparison across all models and audio files"""
    
    if not whisper_backends or not available_ollama_models or not valid_audio_paths:
        print("❌ Cannot run comparison - missing required components")
        return []
    
    results = []
    total_tests = len(whisper_backends) * len(WHISPER_MODELS) * len(available_ollama_models) * len(valid_audio_paths)
    current_test = 0
    
    print(f"🚀 Starting comparison ({total_tests} total tests)...")
    
    for audio_idx, audio_path in enumerate(valid_audio_paths):
        audio_name = os.path.basename(audio_path)
        reference_text = REFERENCE_TEXTS[audio_idx] if audio_idx < len(REFERENCE_TEXTS) else None
        
        print(f"\n🎵 Processing audio: {audio_name}")
        
        for whisper_backend_name, whisper_backend in whisper_backends.items():
            for whisper_model_size in WHISPER_MODELS:
                
                # Skip if model size not supported by backend
                if whisper_backend_name == 'faster-whisper' and whisper_model_size not in ['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']:
                    continue
                if whisper_backend_name == 'openai-whisper' and whisper_model_size not in ['tiny', 'base', 'small', 'medium', 'large']:
                    continue
                
                print(f"  🎤 {whisper_backend_name} ({whisper_model_size})")
                
                # Transcribe
                if whisper_backend_name == 'faster-whisper':
                    transcript, transcribe_time = transcribe_with_faster_whisper(audio_path, whisper_model_size)
                else:
                    transcript, transcribe_time = transcribe_with_openai_whisper(audio_path, whisper_model_size)
                
                # Skip if transcription failed
                if 'Error:' in transcript:
                    print(f"    ❌ Transcription failed: {transcript}")
                    continue
                
                for ollama_model in available_ollama_models:
                    current_test += 1
                    print(f"    🤖 {ollama_model} ({current_test}/{total_tests})")
                    
                    # Summarize
                    summary, summarize_time = summarize_with_ollama(transcript, ollama_model, OLLAMA_BASE_URL)
                    
                    # Calculate metrics
                    transcript_length = len(transcript.split())
                    summary_length = len(summary.split()) if 'Error:' not in summary else 0
                    
                    # Calculate WER if reference available
                    wer_score = None
                    if reference_text:
                        wer_score = calculate_wer(reference_text, transcript)
                    
                    # Store results
                    result = {
                        'audio_file': audio_name,
                        'whisper_backend': whisper_backend_name,
                        'whisper_model': whisper_model_size,
                        'ollama_model': ollama_model,
                        'transcribe_time': round(transcribe_time, 3),
                        'summarize_time': round(summarize_time, 3),
                        'total_time': round(transcribe_time + summarize_time, 3),
                        'transcript_length': transcript_length,
                        'summary_length': summary_length,
                        'wer_score': round(wer_score, 4) if wer_score is not None else None,
                        'transcript_preview': transcript[:100] + '...' if len(transcript) > 100 else transcript,
                        'summary_preview': summary[:100] + '...' if len(summary) > 100 else summary,
                        'timestamp': datetime.now().isoformat(),
                    }
                    
                    results.append(result)
                    
                    # Print progress
                    status = "✅" if 'Error:' not in summary else "⚠️"
                    print(f"      {status} {result['total_time']}s | {transcript_length} words | {summary_length} words")
    
    print(f"\n🎉 Comparison complete! {len(results)} successful tests")
    return results

def display_results(results: List[Dict]):
    """Display results as a comparison table"""
    if not results:
        print("❌ No results to display")
        return
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Reorder columns for better readability
    column_order = [
        'audio_file', 'whisper_backend', 'whisper_model', 'ollama_model',
        'total_time', 'transcribe_time', 'summarize_time',
        'transcript_length', 'summary_length', 'wer_score',
        'transcript_preview', 'summary_preview'
    ]
    df = df[column_order]
    
    # Display summary statistics
    print("📊 Summary Statistics:")
    print("=" * 50)
    
    # Fastest combinations
    fastest = df.loc[df['total_time'].idxmin()]
    print(f"🏃 Fastest: {fastest['whisper_backend']} ({fastest['whisper_model']}) + {fastest['ollama_model']}")
    print(f"   Time: {fastest['total_time']}s | Audio: {fastest['audio_file']}")
    
    # Best quality (lowest WER)
    wer_results = df[df['wer_score'].notna()]
    if not wer_results.empty:
        best_quality = wer_results.loc[wer_results['wer_score'].idxmin()]
        print(f"\n🎯 Best Quality: {best_quality['whisper_backend']} ({best_quality['whisper_model']}) + {best_quality['ollama_model']}")
        print(f"   WER: {best_quality['wer_score']:.4f} | Audio: {best_quality['audio_file']}")
    
    # Model performance comparison
    print(f"\n📈 Model Performance:")
    print("-" * 30)
    
    # Whisper performance
    whisper_stats = df.groupby(['whisper_backend', 'whisper_model'])['transcribe_time'].agg(['mean', 'min', 'max']).round(3)
    print("Whisper Models (avg transcribe time):")
    print(whisper_stats)
    
    # Ollama performance
    ollama_stats = df.groupby('ollama_model')['summarize_time'].agg(['mean', 'min', 'max']).round(3)
    print("\nOllama Models (avg summarize time):")
    print(ollama_stats)
    
    # Display full results table
    print(f"\n📋 Full Results Table ({len(df)} rows):")
    print("=" * 80)
    
    # Format display
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', 50)
    
    print(df)
    
    return df

def export_results(results: List[Dict], filename: str = None):
    """Export results to CSV"""
    if not results:
        print("❌ No results to export")
        return None
    
    # Create filename with timestamp if not provided
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"whisper_llm_comparison_{timestamp}.csv"
    
    # Export to CSV
    df = pd.DataFrame(results)
    df.to_csv(filename, index=False)
    
    print(f"💾 Results exported to: {filename}")
    print(f"📁 File size: {os.path.getsize(filename)} bytes")
    
    # Show file location
    abs_path = os.path.abspath(filename)
    print(f"📍 Absolute path: {abs_path}")
    
    # Preview first few lines
    print(f"\n📖 CSV Preview (first 3 rows):")
    print("-" * 50)
    with open(filename, 'r') as f:
        for i, line in enumerate(f):
            if i < 4:  # Header + 3 data rows
                print(line.strip())
            else:
                break
    
    return filename

# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("🔧 Setting up Whisper + LLM comparison...")
    
    # Try to import Whisper backends (some may not be installed)
    whisper_backends = {}
    
    try:
        from faster_whisper import WhisperModel
        whisper_backends['faster-whisper'] = WhisperModel
        print("✅ faster-whisper imported")
    except ImportError:
        print("❌ faster-whisper not installed (pip install faster-whisper)")
    
    try:
        import whisper
        whisper_backends['openai-whisper'] = whisper
        print("✅ openai-whisper imported")
    except ImportError:
        print("❌ openai-whisper not installed (pip install openai-whisper)")
    
    # Check if we have any Whisper backends
    if not whisper_backends:
        print("\n⚠️  No Whisper backends available! Install at least one:")
        print("   pip install faster-whisper  # Recommended")
        print("   pip install openai-whisper")
        exit(1)
    
    # Check Ollama models
    print(f"\n🔍 Checking Ollama models...")
    available_ollama_models = []
    for model in OLLAMA_MODELS:
        if check_ollama_model_availability(model, OLLAMA_BASE_URL):
            available_ollama_models.append(model)
            print(f"✅ Ollama model available: {model}")
        else:
            print(f"❌ Ollama model not available: {model}")
    
    if not available_ollama_models:
        print("\n⚠️  No Ollama models available! Make sure Ollama is running.")
        print(f"   Check: {OLLAMA_BASE_URL}/api/tags")
        exit(1)
    
    # Check audio files
    print(f"\n🔍 Checking audio files...")
    valid_audio_paths = []
    for i, path in enumerate(AUDIO_PATHS):
        if os.path.exists(path):
            valid_audio_paths.append(path)
            print(f"✅ Audio file exists: {path}")
        else:
            print(f"❌ Audio file not found: {path}")
    
    if not valid_audio_paths:
        print("\n⚠️  No valid audio files found! Update AUDIO_PATHS above.")
        exit(1)
    
    print(f"\n📊 Configuration:")
    print(f"   Audio files: {len(valid_audio_paths)}")
    print(f"   Whisper backends: {len(whisper_backends)}")
    print(f"   Whisper models: {len(WHISPER_MODELS)}")
    print(f"   Ollama models: {len(available_ollama_models)}")
    print(f"   Ollama URL: {OLLAMA_BASE_URL}")
    
    # Run the comparison
    print(f"\n🚀 Starting comparison...")
    comparison_results = run_comparison()
    
    if comparison_results:
        # Display results
        print(f"\n📊 Displaying results...")
        df = display_results(comparison_results)
        
        # Export results
        print(f"\n💾 Exporting results...")
        export_results(comparison_results)
        
        print(f"\n✅ All done! Check the CSV file for detailed results.")
    else:
        print(f"\n❌ No results generated. Check the configuration and try again.")

