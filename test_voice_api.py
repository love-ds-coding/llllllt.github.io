#!/usr/bin/env python3
"""
Comprehensive Test Script for Voice Notes API
Tests both voice-to-text and text summarization functionality
"""

import requests
import json
import os
import time
import wave
import struct
from datetime import datetime

BASE_URL = "http://localhost:5000"

class VoiceAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   {details}")
        print()
        
    def test_health_check(self):
        """Test basic health check"""
        try:
            response = self.session.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health Check", True, f"Status: {data.get('status')}, Models: {data.get('default_models')}")
                return True
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False
    
    def test_text_summarization_default(self):
        """Test text summarization with default model"""
        try:
            test_text = "This is a comprehensive test of the text summarization API. We are testing the Ollama integration with the default qwen3:0.6b model to ensure it can properly summarize text input and return meaningful results."
            
            data = {"text": test_text}
            response = self.session.post(
                f"{BASE_URL}/api/process-text", 
                json=data, 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("summary"):
                    self.log_test("Text Summarization (Default)", True, 
                                f"Summary: {result['summary'][:100]}... | Time: {result.get('timings', {}).get('total', 'N/A')}s")
                    return True
                else:
                    self.log_test("Text Summarization (Default)", False, "No summary in response")
                    return False
            else:
                self.log_test("Text Summarization (Default)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Text Summarization (Default)", False, f"Error: {str(e)}")
            return False
    
    def test_text_summarization_custom_model(self):
        """Test text summarization with custom model"""
        try:
            test_text = "Testing custom model selection for text summarization. This should use a different Ollama model than the default to demonstrate the flexibility of the API."
            
            data = {
                "text": test_text,
                "summ_model": "llama3.1:8b"  # Try a different model
            }
            response = self.session.post(
                f"{BASE_URL}/api/process-text", 
                json=data, 
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("summary"):
                    self.log_test("Text Summarization (Custom Model)", True, 
                                f"Model: llama3.1:8b | Summary: {result['summary'][:100]}... | Time: {result.get('timings', {}).get('total', 'N/A')}s")
                    return True
                else:
                    self.log_test("Text Summarization (Custom Model)", False, "No summary in response")
                    return False
            else:
                self.log_test("Text Summarization (Custom Model)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Text Summarization (Custom Model)", False, f"Error: {str(e)}")
            return False
    
    def create_test_audio(self, filename="test_audio.wav", duration=3):
        """Create a simple test audio file (sine wave)"""
        try:
            # Audio parameters
            sample_rate = 16000
            frequency = 440  # A4 note
            amplitude = 0.3
            
            # Generate sine wave
            samples = []
            for i in range(int(sample_rate * duration)):
                sample = amplitude * struct.pack('h', int(32767 * struct.unpack('f', struct.pack('f', 
                    struct.unpack('f', struct.pack('f', i * 2 * 3.14159 * frequency / sample_rate))[0]))[0]))
                samples.append(sample)
            
            # Write WAV file
            with wave.open(filename, 'w') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(b''.join(samples))
            
            print(f"🎵 Created test audio file: {filename} ({duration}s)")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create test audio: {str(e)}")
            return False
    
    def test_audio_processing_default(self):
        """Test audio processing with default models"""
        try:
            # Check if test audio exists, create if not
            test_audio = "test_audio.wav"
            if not os.path.exists(test_audio):
                if not self.create_test_audio(test_audio):
                    self.log_test("Audio Processing (Default)", False, "Could not create test audio file")
                    return False
            
            # Test audio processing
            with open(test_audio, 'rb') as f:
                files = {'audio': f}
                response = self.session.post(
                    f"{BASE_URL}/api/process-audio", 
                    files=files, 
                    timeout=120
                )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("transcript") and result.get("summary"):
                    timings = result.get('timings', {})
                    self.log_test("Audio Processing (Default)", True, 
                                f"Transcript: {result['transcript'][:100]}... | Summary: {result['summary'][:100]}... | Total Time: {timings.get('total', 'N/A')}s")
                    return True
                else:
                    self.log_test("Audio Processing (Default)", False, "Missing transcript or summary")
                    return False
            else:
                self.log_test("Audio Processing (Default)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Audio Processing (Default)", False, f"Error: {str(e)}")
            return False
    
    def test_audio_processing_custom_models(self):
        """Test audio processing with custom models"""
        try:
            test_audio = "test_audio.wav"
            if not os.path.exists(test_audio):
                if not self.create_test_audio(test_audio):
                    self.log_test("Audio Processing (Custom Models)", False, "Could not create test audio file")
                    return False
            
            # Test with custom models
            with open(test_audio, 'rb') as f:
                files = {'audio': f}
                data = {
                    'whisper_model': 'base',  # Try base instead of tiny
                    'summ_model': 'qwen3:1.7b'  # Try different summary model
                }
                response = self.session.post(
                    f"{BASE_URL}/api/process-audio", 
                    files=files, 
                    data=data,
                    timeout=120
                )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("transcript") and result.get("summary"):
                    timings = result.get('timings', {})
                    self.log_test("Audio Processing (Custom Models)", True, 
                                f"Whisper: base, Summary: mistral:7b | Total Time: {timings.get('total', 'N/A')}s")
                    return True
                else:
                    self.log_test("Audio Processing (Custom Models)", False, "Missing transcript or summary")
                    return False
            else:
                self.log_test("Audio Processing (Custom Models)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Audio Processing (Custom Models)", False, f"Error: {str(e)}")
            return False
    
    def test_notes_listing(self):
        """Test notes listing endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/api/notes", timeout=10)
            if response.status_code == 200:
                data = response.json()
                note_count = data.get("count", 0)
                self.log_test("Notes Listing", True, f"Found {note_count} notes")
                return True
            else:
                self.log_test("Notes Listing", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Notes Listing", False, f"Error: {str(e)}")
            return False
    
    def test_download_links(self):
        """Test download functionality"""
        try:
            # Get notes first
            response = self.session.get(f"{BASE_URL}/api/notes", timeout=10)
            if response.status_code != 200:
                self.log_test("Download Links", False, "Could not fetch notes")
                return False
            
            notes = response.json().get("notes", [])
            if not notes:
                self.log_test("Download Links", False, "No notes to test downloads")
                return False
            
            # Test download of first note
            note = notes[0]
            note_id = note["id"]
            note_type = note["type"]
            
            if note_type == "audio":
                # Test transcript download
                response = self.session.get(f"{BASE_URL}/api/download/{note_id}/transcript", timeout=10)
                if response.status_code == 200:
                    self.log_test("Download Links", True, f"Successfully downloaded transcript for note {note_id}")
                    return True
                else:
                    self.log_test("Download Links", False, f"Failed to download transcript: {response.status_code}")
                    return False
            else:
                # Test text download
                response = self.session.get(f"{BASE_URL}/api/download/{note_id}/text", timeout=10)
                if response.status_code == 200:
                    self.log_test("Download Links", True, f"Successfully downloaded text for note {note_id}")
                    return True
                else:
                    self.log_test("Download Links", False, f"Failed to download text: {response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_test("Download Links", False, f"Error: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        try:
            # Test invalid text request
            response = self.session.post(
                f"{BASE_URL}/api/process-text", 
                json={},  # Missing text field
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_test("Error Handling", True, "Properly handled missing text field")
                return True
            else:
                self.log_test("Error Handling", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Error Handling", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🧪 Starting Voice Notes API Tests...")
        print("=" * 60)
        
        # Check if server is running
        if not self.test_health_check():
            print("❌ Server is not responding. Make sure to start the API server first:")
            print("   python api_server.py")
            return
        
        # Run all tests
        tests = [
            self.test_text_summarization_default,
            self.test_text_summarization_custom_model,
            self.test_audio_processing_default,
            self.test_audio_processing_custom_models,
            self.test_notes_listing,
            self.test_download_links,
            self.test_error_handling
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
        
        # Generate summary report
        self.generate_report()
    
    def generate_report(self):
        """Generate test summary report"""
        print("📊 Test Summary Report")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['details']}")
        
        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"test_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        if failed_tests == 0:
            print("\n🎉 All tests passed! Your Voice Notes API is working correctly.")
        else:
            print(f"\n⚠️  {failed_tests} test(s) failed. Check the details above.")

def main():
    """Main function to run tests"""
    print("🎤 Voice Notes API Test Suite")
    print("Tests voice-to-text and text summarization functionality")
    print()
    
    # Check if required packages are available
    try:
        import requests
        import wave
        import struct
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Install with: pip install requests")
        return
    
    # Create tester and run tests
    tester = VoiceAPITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
