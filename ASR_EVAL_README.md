# ASR Evaluation Script

This script benchmarks speech-to-text (ASR) engines on a folder of test recordings using a modular, pluggable engine interface.

## Features

- **Modular Engine Interface**: Easy to add new ASR engines
- **Comprehensive Metrics**: 
  - Mixed Token Error Rate (MER) for code-switch zh/en
  - Character Error Rate (CER) for Chinese only
  - Word Error Rate (WER) for English only
  - Language-ID accuracy
  - Processing time and Real-Time Factor (RTF)
- **Multiple Engine Support**: Whisper and FireRed ASR (with graceful fallback)
- **Clean CLI Interface**: Configurable via command-line arguments

## Usage

### Basic Usage
```bash
python asr_eval.py --audio_dir ./test_recordings --engines whisper
```

### Advanced Usage
```bash
python asr_eval.py --audio_dir ./test_recordings --engines whisper,firered --whisper_impl turbo --results ./custom_results.txt
```

### Command Line Options
- `--audio_dir`: Directory containing audio files (default: ./test_recordings)
- `--engines`: Comma-separated list of engines (default: whisper,firered)
- `--results`: Output results file (default: ./test_results/asr_report.txt)
- `--whisper_impl`: Whisper model variant (default: turbo)

## File Structure

The script expects:
- Audio files: `./test_recordings/*.{wav,mp3,m4a}`
- Reference transcripts: `./test_recordings/*.txt` (same basename as audio files)
- Output: `./test_results/asr_report.txt`

## Dependencies

Required packages (add to requirements.txt):
```
librosa>=0.10.0
soundfile>=0.12.0
torch>=1.13.0
openai-whisper==20250625
```

## Metrics Explanation

### Mixed Token Error Rate (MER)
- Tokenizes Chinese as characters and English as words
- Merges into one sequence
- Computes Levenshtein error rate = (subs + ins + dels) / tokens_ref

### Character Error Rate (CER-zh)
- Character error rate on Chinese characters only
- Calculated using Levenshtein distance

### Word Error Rate (WER-en)
- Word error rate on English spans only
- Calculated using Levenshtein distance

### Language-ID Accuracy
- After aligning ref/hyp mixed tokens
- Labels each token as zh (CJK) or en (A–Z/0–9 word)
- Computes fraction of aligned pairs where predicted label matches reference label

## Report Format

The script generates a two-section report:

### Section A: Aggregated Metrics
- Mean metrics across all files per engine
- File count and total audio duration
- Processing time and RTF statistics

### Section B: Per-File Metrics
- Detailed metrics for each file and engine
- Tabulated format for easy analysis

## Engine Support

### Whisper
- Uses OpenAI's Whisper implementation
- Supports all model variants (tiny, base, small, medium, large, turbo)
- Configurable via `--whisper_impl` parameter

### FireRed ASR
- Placeholder implementation (requires FireRed ASR package)
- Graceful fallback if not available

## Error Handling

- Graceful fallback for missing engines
- Continues processing if individual files fail
- Clear error messages and warnings
- Non-zero exit code if no files processed

## Example Output

```
================================================================================
ASR EVALUATION REPORT
================================================================================

NORMALIZATION RULES:
- Lowercase English text
- Normalize whitespace (multiple spaces -> single space)
- Remove special punctuation (keep basic punctuation)
- Chinese tokenization: per character
- English tokenization: per word (regex: [a-z0-9]+)

SECTION A: AGGREGATED METRICS
--------------------------------------------------

WHISPER-TURBO:
  Files processed: 5
  Total audio duration: 25.30s
  Mean MER: 0.1234
  Mean CER-zh: 0.0567
  Mean WER-en: 0.0890
  Mean LangID accuracy: 0.9456
  Mean processing time: 2.34s
  Mean RTF: 0.0925

SECTION B: PER-FILE METRICS
--------------------------------------------------
File                           Engine          MER      CER-zh   WER-en   LangID   Time(s)  RTF     
--------------------------------------------------------------------------------------------------------
test1.wav                      whisper-turbo   0.1000   0.0000   0.1000   1.0000   1.23     0.0615
test2.wav                      whisper-turbo   0.0500   0.0500   0.0000   1.0000   1.45     0.0725
...
```

## Testing

Run the test script to verify functionality:
```bash
python test_asr_eval.py
```

Create test data:
```bash
python create_test_data.py
```

## Summary

I've created a comprehensive ASR benchmarking script that meets all your requirements:

### **Main Script: `asr_eval.py`**
- **Modular Engine Interface**: Abstract base class with concrete implementations for Whisper and FireRed ASR
- **Comprehensive Metrics**: MER, CER-zh, WER-en, Language-ID accuracy, processing time, and RTF
- **Mixed Tokenization**: Chinese characters + English words with proper language labeling
- **Clean CLI**: Configurable via command-line arguments
- **Graceful Fallback**: Skips unavailable engines and continues processing
- **Robust Error Handling**: Continues on individual file failures

### **Key Features Implemented:**

1. **Two-Step Flow**: Load audio → transcribe with chosen engine
2. **Multiple Engine Support**: Whisper (with configurable model variants) and FireRed ASR
3. **Comprehensive Metrics**:
   - Mixed Token Error Rate (MER) for code-switch zh/en
   - CER-zh for Chinese characters only
   - WER-en for English words only
   - Language-ID accuracy with proper alignment
   - Processing time and RTF
4. **Text Normalization**: Consistent preprocessing for fair evaluation
5. **Report Generation**: Two-section report (aggregated + per-file metrics)
6. **CLI Interface**: All requested command-line options

### **Additional Files Created:**
- **`test_asr_eval.py`**: Test script for core functionality
- **`create_test_data.py`**: Script to create sample test data
- **`ASR_EVAL_README.md`**: Comprehensive documentation
- **Updated `requirements.txt`**: Added necessary dependencies

### **Usage Examples:**
```bash
# Basic usage
python asr_eval.py --audio_dir ./test_recordings --engines whisper

# Advanced usage with custom settings
python asr_eval.py --audio_dir ./test_recordings --engines whisper,firered --whisper_impl turbo --results ./custom_results.txt

# Test the implementation
python test_asr_eval.py
```

The script follows the exact specifications from the Whisper GitHub page and implements a placeholder for FireRed ASR. It processes all audio files in `./test_recordings/`, finds matching reference transcripts, and generates a comprehensive evaluation report. The implementation is self-contained in a single Python file with minimal dependencies and graceful fallback for missing packages.

