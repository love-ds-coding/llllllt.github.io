#!/usr/bin/env python3
"""
Simple test script for ASR evaluation
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from asr_eval import ASRBenchmark, WhisperEngine, TextNormalizer, Tokenizer, MetricsCalculator

def test_text_normalization():
    """Test text normalization"""
    print("Testing text normalization...")
    
    test_cases = [
        "Hello  World!",
        "你好世界",
        "Hello 世界",
        "Mixed   English   中文   Text"
    ]
    
    for text in test_cases:
        normalized = TextNormalizer.normalize(text)
        print(f"Original: '{text}' -> Normalized: '{normalized}'")

def test_tokenization():
    """Test mixed tokenization"""
    print("\nTesting tokenization...")
    
    test_cases = [
        "hello world",
        "你好世界",
        "hello 世界 world",
        "mixed english 中文 text"
    ]
    
    for text in test_cases:
        tokens = Tokenizer.tokenize(text)
        print(f"Text: '{text}'")
        print(f"Tokens: {tokens}")
        print()

def test_metrics():
    """Test metrics calculation"""
    print("Testing metrics calculation...")
    
    # Test case: perfect match
    ref_tokens = [("hello", "en"), ("世界", "zh"), ("world", "en")]
    hyp_tokens = [("hello", "en"), ("世界", "zh"), ("world", "en")]
    
    mer = MetricsCalculator.calculate_mer(ref_tokens, hyp_tokens)
    cer_zh = MetricsCalculator.calculate_cer_zh(ref_tokens, hyp_tokens)
    wer_en = MetricsCalculator.calculate_wer_en(ref_tokens, hyp_tokens)
    langid = MetricsCalculator.calculate_langid_accuracy(ref_tokens, hyp_tokens)
    
    print(f"Perfect match - MER: {mer:.4f}, CER-zh: {cer_zh:.4f}, WER-en: {wer_en:.4f}, LangID: {langid:.4f}")
    
    # Test case: with errors
    ref_tokens = [("hello", "en"), ("世界", "zh"), ("world", "en")]
    hyp_tokens = [("helo", "en"), ("世界", "zh"), ("word", "en")]
    
    mer = MetricsCalculator.calculate_mer(ref_tokens, hyp_tokens)
    cer_zh = MetricsCalculator.calculate_cer_zh(ref_tokens, hyp_tokens)
    wer_en = MetricsCalculator.calculate_wer_en(ref_tokens, hyp_tokens)
    langid = MetricsCalculator.calculate_langid_accuracy(ref_tokens, hyp_tokens)
    
    print(f"With errors - MER: {mer:.4f}, CER-zh: {cer_zh:.4f}, WER-en: {wer_en:.4f}, LangID: {langid:.4f}")

def main():
    """Run tests"""
    print("ASR Evaluation Script Tests")
    print("=" * 40)
    
    test_text_normalization()
    test_tokenization()
    test_metrics()
    
    print("\nTests completed!")

if __name__ == "__main__":
    main()

