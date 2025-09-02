#!/usr/bin/env python3
"""
Create test data for ASR evaluation
"""

import os
from pathlib import Path

def create_test_data():
    """Create sample test data"""
    
    # Create test_recordings directory
    test_dir = Path("test_recordings")
    test_dir.mkdir(exist_ok=True)
    
    # Create sample reference files
    test_cases = [
        ("test1.txt", "Hello world, this is a test."),
        ("test2.txt", "你好世界，这是一个测试。"),
        ("test3.txt", "Hello 世界，this is a mixed 测试。"),
        ("test4.txt", "The quick brown fox jumps over the lazy dog."),
        ("test5.txt", "中文测试：语音识别系统评估。")
    ]
    
    for filename, content in test_cases:
        ref_file = test_dir / filename
        with open(ref_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Created reference file: {ref_file}")
    
    print(f"\nCreated {len(test_cases)} reference files in {test_dir}")
    print("Note: You'll need to add corresponding audio files (.wav, .mp3, .m4a) to test the full functionality")

if __name__ == "__main__":
    create_test_data()

