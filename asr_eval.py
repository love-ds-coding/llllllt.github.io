#!/usr/bin/env python3
"""
ASR Benchmarking Tool

Usage:
    python asr_eval.py --audio_dir ./test_recordings --engines whisper,firered
    python asr_eval.py --whisper_impl turbo --results ./custom_results.txt

Optional dependencies (add to requirements.txt if needed):
    - openai-whisper (already included)
    - torch (for Whisper)
    - librosa (for audio duration)
    - soundfile (for audio loading)
    - FireRed ASR packages (if using FireRed engine)

This script benchmarks speech-to-text engines on a folder of test recordings.
"""

import os
import sys
import time
import argparse
import re
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod
import difflib

# Optional imports with graceful fallback
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    SOUNDFILE_AVAILABLE = False

# FireRed ASR - will be imported if available
FIRERED_AVAILABLE = False
try:
    # This would be the actual import for FireRed ASR
    # from firered_asr import FireRedASR  # Placeholder
    FIRERED_AVAILABLE = False  # Set to False since we don't have the actual package
except ImportError:
    FIRERED_AVAILABLE = False


@dataclass
class TranscriptionResult:
    """Result from ASR engine transcription"""
    text: str
    processing_time: float
    audio_duration: float
    metadata: Dict[str, Any]


@dataclass
class EvaluationMetrics:
    """Comprehensive evaluation metrics"""
    mer: float  # Mixed token error rate
    cer_zh: float  # Character error rate for Chinese
    wer_en: float  # Word error rate for English
    langid_accuracy: float  # Language identification accuracy
    processing_time: float
    rtf: float  # Real-time factor


class ASREngine(ABC):
    """Abstract base class for ASR engines"""
    
    @abstractmethod
    def transcribe(self, audio_path: str) -> TranscriptionResult:
        """Transcribe audio file and return result with timing"""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Get engine name"""
        pass


class WhisperEngine(ASREngine):
    """Whisper ASR engine adapter"""
    
    def __init__(self, model_size: str = "turbo"):
        if not WHISPER_AVAILABLE:
            raise ImportError("Whisper not available. Install with: pip install openai-whisper")
        
        self.model_size = model_size
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load Whisper model"""
        try:
            self.model = whisper.load_model(self.model_size)
        except Exception as e:
            raise RuntimeError(f"Failed to load Whisper model {self.model_size}: {e}")
    
    def transcribe(self, audio_path: str) -> TranscriptionResult:
        """Transcribe using Whisper"""
        if not LIBROSA_AVAILABLE:
            raise ImportError("librosa required for audio duration. Install with: pip install librosa")
        
        # Get audio duration
        try:
            audio_duration = librosa.get_duration(filename=audio_path)
        except Exception:
            audio_duration = 0.0
        
        # Transcribe
        start_time = time.time()
        try:
            result = self.model.transcribe(audio_path)
            text = result["text"].strip()
        except Exception as e:
            text = f"[ERROR: {e}]"
        processing_time = time.time() - start_time
        
        return TranscriptionResult(
            text=text,
            processing_time=processing_time,
            audio_duration=audio_duration,
            metadata={"model": self.model_size, "engine": "whisper"}
        )
    
    def get_name(self) -> str:
        return f"whisper-{self.model_size}"


class FireRedEngine(ASREngine):
    """FireRed ASR engine adapter (placeholder implementation)"""
    
    def __init__(self):
        if not FIRERED_AVAILABLE:
            raise ImportError("FireRed ASR not available. Install FireRed ASR packages.")
        
        # Placeholder - would initialize FireRed ASR here
        self.model = None
    
    def transcribe(self, audio_path: str) -> TranscriptionResult:
        """Transcribe using FireRed ASR (placeholder)"""
        if not LIBROSA_AVAILABLE:
            raise ImportError("librosa required for audio duration. Install with: pip install librosa")
        
        # Get audio duration
        try:
            audio_duration = librosa.get_duration(filename=audio_path)
        except Exception:
            audio_duration = 0.0
        
        # Placeholder transcription
        start_time = time.time()
        text = "[FireRed ASR not implemented - placeholder]"
        processing_time = time.time() - start_time
        
        return TranscriptionResult(
            text=text,
            processing_time=processing_time,
            audio_duration=audio_duration,
            metadata={"engine": "firered"}
        )
    
    def get_name(self) -> str:
        return "firered"


class TextNormalizer:
    """Text normalization for consistent evaluation"""
    
    @staticmethod
    def normalize(text: str) -> str:
        """Normalize text for evaluation"""
        # Lowercase English
        text = text.lower()
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove all punctuation
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', '', text)
        
        return text.strip()


class Tokenizer:
    """Mixed tokenization for Chinese characters and English words"""
    
    @staticmethod
    def is_chinese_char(char: str) -> bool:
        """Check if character is Chinese (CJK)"""
        return '\u4e00' <= char <= '\u9fff'
    
    @staticmethod
    def is_english_word(word: str) -> bool:
        """Check if word is English (A-Z, 0-9)"""
        return bool(re.match(r'^[a-z0-9]+$', word))
    
    @staticmethod
    def tokenize(text: str) -> List[Tuple[str, str]]:
        """
        Tokenize text into mixed tokens
        Returns list of (token, language) tuples
        """
        tokens = []
        current_word = ""
        
        for char in text:
            if char.isspace():
                if current_word:
                    if Tokenizer.is_english_word(current_word):
                        tokens.append((current_word, "en"))
                    else:
                        # Treat non-English words as individual characters
                        for c in current_word:
                            if Tokenizer.is_chinese_char(c):
                                tokens.append((c, "zh"))
                            else:
                                tokens.append((c, "other"))
                    current_word = ""
            elif Tokenizer.is_chinese_char(char):
                if current_word:
                    if Tokenizer.is_english_word(current_word):
                        tokens.append((current_word, "en"))
                    else:
                        for c in current_word:
                            if Tokenizer.is_chinese_char(c):
                                tokens.append((c, "zh"))
                            else:
                                tokens.append((c, "other"))
                    current_word = ""
                tokens.append((char, "zh"))
            else:
                current_word += char
        
        # Handle remaining word
        if current_word:
            if Tokenizer.is_english_word(current_word):
                tokens.append((current_word, "en"))
            else:
                for c in current_word:
                    if Tokenizer.is_chinese_char(c):
                        tokens.append((c, "zh"))
                    else:
                        tokens.append((c, "other"))
        
        return tokens


class MetricsCalculator:
    """Calculate various ASR evaluation metrics"""
    
    @staticmethod
    def levenshtein_distance(s1: List[str], s2: List[str]) -> Tuple[int, int, int, int]:
        """
        Calculate Levenshtein distance between two sequences
        Returns (substitutions, insertions, deletions, total_ops)
        """
        m, n = len(s1), len(s2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        # Initialize
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
        
        # Fill dp table
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if s1[i-1] == s2[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        
        # Backtrack to count operations
        i, j = m, n
        subs = ins = dels = 0
        
        while i > 0 or j > 0:
            if i > 0 and j > 0 and s1[i-1] == s2[j-1]:
                i -= 1
                j -= 1
            elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
                subs += 1
                i -= 1
                j -= 1
            elif j > 0 and dp[i][j] == dp[i][j-1] + 1:
                ins += 1
                j -= 1
            else:
                dels += 1
                i -= 1
        
        return subs, ins, dels, subs + ins + dels
    
    @staticmethod
    def calculate_mer(ref_tokens: List[Tuple[str, str]], hyp_tokens: List[Tuple[str, str]]) -> float:
        """Calculate Mixed Token Error Rate"""
        ref_token_list = [token for token, _ in ref_tokens]
        hyp_token_list = [token for token, _ in hyp_tokens]
        
        subs, ins, dels, total_ops = MetricsCalculator.levenshtein_distance(ref_token_list, hyp_token_list)
        total_ref = len(ref_token_list)
        
        return total_ops / total_ref if total_ref > 0 else 0.0
    
    @staticmethod
    def calculate_cer_zh(ref_tokens: List[Tuple[str, str]], hyp_tokens: List[Tuple[str, str]]) -> float:
        """Calculate Character Error Rate for Chinese only"""
        ref_zh = [token for token, lang in ref_tokens if lang == "zh"]
        hyp_zh = [token for token, lang in hyp_tokens if lang == "zh"]
        
        if not ref_zh:
            return 0.0
        
        subs, ins, dels, total_ops = MetricsCalculator.levenshtein_distance(ref_zh, hyp_zh)
        return total_ops / len(ref_zh)
    
    @staticmethod
    def calculate_wer_en(ref_tokens: List[Tuple[str, str]], hyp_tokens: List[Tuple[str, str]]) -> float:
        """Calculate Word Error Rate for English only"""
        ref_en = [token for token, lang in ref_tokens if lang == "en"]
        hyp_en = [token for token, lang in hyp_tokens if lang == "en"]
        
        if not ref_en:
            return 0.0
        
        subs, ins, dels, total_ops = MetricsCalculator.levenshtein_distance(ref_en, hyp_en)
        return total_ops / len(ref_en)
    
    @staticmethod
    def calculate_langid_accuracy(ref_tokens: List[Tuple[str, str]], hyp_tokens: List[Tuple[str, str]]) -> float:
        """Calculate Language ID accuracy"""
        # Align tokens using edit distance
        ref_token_list = [token for token, _ in ref_tokens]
        hyp_token_list = [token for token, _ in hyp_tokens]
        
        # Use difflib for alignment
        matcher = difflib.SequenceMatcher(None, ref_token_list, hyp_token_list)
        matches = matcher.get_matching_blocks()
        
        correct_langid = 0
        total_aligned = 0
        
        for match in matches:
            if match.size > 0:
                for i in range(match.size):
                    ref_idx = match.a + i
                    hyp_idx = match.b + i
                    if ref_idx < len(ref_tokens) and hyp_idx < len(hyp_tokens):
                        ref_lang = ref_tokens[ref_idx][1]
                        hyp_lang = hyp_tokens[hyp_idx][1]
                        if ref_lang == hyp_lang:
                            correct_langid += 1
                        total_aligned += 1
        
        return correct_langid / total_aligned if total_aligned > 0 else 0.0


class ASRBenchmark:
    """Main ASR benchmarking class"""
    
    def __init__(self, audio_dir: str, results_file: str):
        self.audio_dir = Path(audio_dir)
        self.results_file = Path(results_file)
        self.engines: Dict[str, ASREngine] = {}
        self.results: Dict[str, Dict[str, EvaluationMetrics]] = {}
        
        # Create results directory
        self.results_file.parent.mkdir(parents=True, exist_ok=True)
    
    def add_engine(self, engine: ASREngine):
        """Add an ASR engine"""
        self.engines[engine.get_name()] = engine
    
    def discover_audio_files(self) -> List[Tuple[str, str]]:
        """Discover audio files and their reference transcripts"""
        audio_files = []
        extensions = {'.wav', '.mp3', '.m4a'}
        
        for audio_file in self.audio_dir.glob('*'):
            if audio_file.suffix.lower() in extensions:
                ref_file = audio_file.with_suffix('.txt')
                if ref_file.exists():
                    audio_files.append((str(audio_file), str(ref_file)))
                else:
                    print(f"Warning: No reference file found for {audio_file}")
        
        return audio_files
    
    def load_reference(self, ref_file: str) -> str:
        """Load reference transcript"""
        try:
            with open(ref_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            print(f"Error loading reference {ref_file}: {e}")
            return ""
    
    def evaluate_file(self, audio_file: str, ref_file: str, engine: ASREngine) -> EvaluationMetrics:
        """Evaluate a single file with an engine"""
        # Load reference
        ref_text = self.load_reference(ref_file)
        if not ref_text:
            return EvaluationMetrics(0, 0, 0, 0, 0, 0)
        
        # Transcribe
        try:
            result = engine.transcribe(audio_file)
            # Print transcribed text
            print(f"  Transcribed: {result.text}")
        except Exception as e:
            print(f"Error transcribing {audio_file} with {engine.get_name()}: {e}")
            return EvaluationMetrics(0, 0, 0, 0, 0, 0)
        
        # Normalize texts
        ref_norm = TextNormalizer.normalize(ref_text)
        hyp_norm = TextNormalizer.normalize(result.text)
        
        # Tokenize
        ref_tokens = Tokenizer.tokenize(ref_norm)
        hyp_tokens = Tokenizer.tokenize(hyp_norm)
        
        # Calculate metrics
        mer = MetricsCalculator.calculate_mer(ref_tokens, hyp_tokens)
        cer_zh = MetricsCalculator.calculate_cer_zh(ref_tokens, hyp_tokens)
        wer_en = MetricsCalculator.calculate_wer_en(ref_tokens, hyp_tokens)
        langid_accuracy = MetricsCalculator.calculate_langid_accuracy(ref_tokens, hyp_tokens)
        
        # Calculate RTF
        rtf = result.processing_time / result.audio_duration if result.audio_duration > 0 else 0
        
        return EvaluationMetrics(
            mer=mer,
            cer_zh=cer_zh,
            wer_en=wer_en,
            langid_accuracy=langid_accuracy,
            processing_time=result.processing_time,
            rtf=rtf
        )
    
    def run_benchmark(self):
        """Run the complete benchmark"""
        audio_files = self.discover_audio_files()
        
        if not audio_files:
            print("No audio files found with reference transcripts")
            return False
        
        print(f"Found {len(audio_files)} audio files")
        print(f"Testing {len(self.engines)} engines: {', '.join(self.engines.keys())}")
        
        # Initialize results structure
        for engine_name in self.engines.keys():
            self.results[engine_name] = {}
        
        # Process each file with each engine
        for audio_file, ref_file in audio_files:
            filename = Path(audio_file).name
            print(f"Processing {filename}...")
            
            for engine_name, engine in self.engines.items():
                metrics = self.evaluate_file(audio_file, ref_file, engine)
                self.results[engine_name][filename] = metrics
        
        return True
    
    def generate_report(self) -> str:
        """Generate comprehensive evaluation report"""
        report_lines = []
        
        # Header
        report_lines.append("=" * 80)
        report_lines.append("ASR EVALUATION REPORT")
        report_lines.append("=" * 80)
        report_lines.append("")
        
        # Normalization rules
        report_lines.append("NORMALIZATION RULES:")
        report_lines.append("- Lowercase English text")
        report_lines.append("- Normalize whitespace (multiple spaces -> single space)")
        report_lines.append("- Remove special punctuation (keep basic punctuation)")
        report_lines.append("- Chinese tokenization: per character")
        report_lines.append("- English tokenization: per word (regex: [a-z0-9]+)")
        report_lines.append("")
        
        # Language ID handling
        report_lines.append("LANGUAGE ID ACCURACY:")
        report_lines.append("- Align reference and hypothesis tokens using edit distance")
        report_lines.append("- For aligned token pairs, check if language labels match")
        report_lines.append("- Insertions/deletions: not counted in accuracy (only aligned pairs)")
        report_lines.append("")
        
        # Section A: Aggregated metrics
        report_lines.append("SECTION A: AGGREGATED METRICS")
        report_lines.append("-" * 50)
        
        for engine_name in self.engines.keys():
            if not self.results[engine_name]:
                continue
                
            metrics_list = list(self.results[engine_name].values())
            file_count = len(metrics_list)
            
            # Calculate means
            mean_mer = sum(m.mer for m in metrics_list) / file_count
            mean_cer_zh = sum(m.cer_zh for m in metrics_list) / file_count
            mean_wer_en = sum(m.wer_en for m in metrics_list) / file_count
            mean_langid = sum(m.langid_accuracy for m in metrics_list) / file_count
            mean_time = sum(m.processing_time for m in metrics_list) / file_count
            mean_rtf = sum(m.rtf for m in metrics_list) / file_count
            
            # Total audio duration
            total_duration = sum(m.processing_time / m.rtf if m.rtf > 0 else 0 for m in metrics_list)
            
            report_lines.append(f"\n{engine_name.upper()}:")
            report_lines.append(f"  Files processed: {file_count}")
            report_lines.append(f"  Total audio duration: {total_duration:.2f}s")
            report_lines.append(f"  Mean MER: {mean_mer:.4f}")
            report_lines.append(f"  Mean CER-zh: {mean_cer_zh:.4f}")
            report_lines.append(f"  Mean WER-en: {mean_wer_en:.4f}")
            report_lines.append(f"  Mean LangID accuracy: {mean_langid:.4f}")
            report_lines.append(f"  Mean processing time: {mean_time:.2f}s")
            report_lines.append(f"  Mean RTF: {mean_rtf:.4f}")
        
        # Section B: Per-file metrics
        report_lines.append("\n\nSECTION B: PER-FILE METRICS")
        report_lines.append("-" * 50)
        
        # Get all filenames
        all_files = set()
        for engine_results in self.results.values():
            all_files.update(engine_results.keys())
        all_files = sorted(all_files)
        
        # Create table header
        header = f"{'File':<30} {'Engine':<15} {'MER':<8} {'CER-zh':<8} {'WER-en':<8} {'LangID':<8} {'Time(s)':<8} {'RTF':<8}"
        report_lines.append(header)
        report_lines.append("-" * len(header))
        
        # Add data rows
        for filename in all_files:
            for engine_name in self.engines.keys():
                if filename in self.results[engine_name]:
                    metrics = self.results[engine_name][filename]
                    row = f"{filename:<30} {engine_name:<15} {metrics.mer:<8.4f} {metrics.cer_zh:<8.4f} {metrics.wer_en:<8.4f} {metrics.langid_accuracy:<8.4f} {metrics.processing_time:<8.2f} {metrics.rtf:<8.4f}"
                    report_lines.append(row)
        
        return "\n".join(report_lines)
    
    def save_report(self, report: str):
        """Save report to file"""
        with open(self.results_file, 'w', encoding='utf-8') as f:
            f.write(report)


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description="ASR Benchmarking Tool")
    parser.add_argument("--audio_dir", default="./test_recordings", 
                       help="Directory containing audio files (default: ./test_recordings)")
    parser.add_argument("--engines", default="whisper,firered", 
                       help="Comma-separated list of engines (default: whisper,firered)")
    parser.add_argument("--results", default="./test_results/asr_report.txt",
                       help="Output results file (default: ./test_results/asr_report.txt)")
    parser.add_argument("--whisper_impl", default="turbo",
                       help="Whisper model variant (default: turbo)")
    
    args = parser.parse_args()
    
    # Create benchmark instance
    benchmark = ASRBenchmark(args.audio_dir, args.results)
    
    # Add engines based on availability and user selection
    engines_to_add = [e.strip() for e in args.engines.split(',')]
    
    for engine_name in engines_to_add:
        try:
            if engine_name == "whisper":
                if WHISPER_AVAILABLE:
                    engine = WhisperEngine(args.whisper_impl)
                    benchmark.add_engine(engine)
                    print(f"Added Whisper engine with model: {args.whisper_impl}")
                else:
                    print("Whisper not available - skipping")
            
            elif engine_name == "firered":
                if FIRERED_AVAILABLE:
                    engine = FireRedEngine()
                    benchmark.add_engine(engine)
                    print("Added FireRed ASR engine")
                else:
                    print("FireRed ASR not available - skipping")
            
            else:
                print(f"Unknown engine: {engine_name}")
        
        except Exception as e:
            print(f"Failed to initialize {engine_name}: {e}")
    
    if not benchmark.engines:
        print("No engines available. Exiting.")
        sys.exit(1)
    
    # Run benchmark
    success = benchmark.run_benchmark()
    if not success:
        print("Benchmark failed - no files processed")
        sys.exit(1)
    
    # Generate and save report
    report = benchmark.generate_report()
    benchmark.save_report(report)
    
    # Print report to stdout
    print("\n" + report)
    
    print(f"\nReport saved to: {args.results}")


if __name__ == "__main__":
    main()
