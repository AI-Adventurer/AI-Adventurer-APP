#!/usr/bin/env python3
"""
Edge API 測試腳本

用於測試 Jetson Nano Edge API 的各個端點。
"""

import requests
import json
import time
from typing import Any

BASE_URL = "http://localhost:8000"


def test_post_frame():
    """測試 POST /edge/frames"""
    print("\n=== Testing POST /edge/frames ===")
    
    payload = {
        "timestamp": time.time(),
        "source": "jetson-01",
        "frame_id": 1,
        "action_scores": {
            "stand": 0.1,
            "crouch": 0.82,
            "jump": 0.03,
            "background": 0.05
        },
        "stable_action": "crouch",
        "confidence": 0.82,
        "pose": {
            "points": [
                [0.512, 0.103, -0.021],
                [0.438, 0.221, -0.034],
                [0.587, 0.219, -0.031],
            ] + [[0.5, 0.5, 0.0]] * 30
        },
        "skeleton_sequence": {
            "layout": "mediapipe_pose_33",
            "shape": [2, 33, 3],
            "frames": [
                [
                    [0.512, 0.103, -0.021],
                    [0.438, 0.221, -0.034],
                    [0.587, 0.219, -0.031]
                ] + [[0.5, 0.5, 0.0]] * 30  # 填充到 33 個點
            ] * 2  # 2 幀
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/edge/frames", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 201 or response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_get_latest_frames():
    """測試 GET /edge/frames/latest"""
    print("\n=== Testing GET /edge/frames/latest ===")
    
    try:
        response = requests.get(f"{BASE_URL}/edge/frames/latest")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_get_devices():
    """測試 GET /edge/devices"""
    print("\n=== Testing GET /edge/devices ===")
    
    try:
        response = requests.get(f"{BASE_URL}/edge/devices")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_get_device_info():
    """測試 GET /edge/devices/<source>"""
    print("\n=== Testing GET /edge/devices/<source> ===")
    
    try:
        response = requests.get(f"{BASE_URL}/edge/devices/jetson-01")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200 or response.status_code == 404
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_get_latest_frame_by_source():
    """測試 GET /edge/frames/latest/<source>"""
    print("\n=== Testing GET /edge/frames/latest/<source> ===")
    
    try:
        response = requests.get(f"{BASE_URL}/edge/frames/latest/jetson-01")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200 or response.status_code == 404
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_get_stats():
    """測試 GET /edge/stats"""
    print("\n=== Testing GET /edge/stats ===")
    
    try:
        response = requests.get(f"{BASE_URL}/edge/stats")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_invalid_frame():
    """測試無效幀數據"""
    print("\n=== Testing Invalid Frame ===")
    
    # 缺少 source 欄位
    payload = {
        "timestamp": time.time(),
        "frame_id": 1,
        "action_scores": {"stand": 0.5},
        # 缺少 source, stable_action, confidence, skeleton_sequence
    }
    
    try:
        response = requests.post(f"{BASE_URL}/edge/frames", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 400
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    """運行所有測試"""
    print("=" * 60)
    print("Edge API 測試")
    print("=" * 60)
    
    results = {}
    
    # 發送有效數據
    results["POST /edge/frames (valid)"] = test_post_frame()
    
    # 等待一下讓數據處理
    time.sleep(0.5)
    
    # 查詢數據
    results["GET /edge/frames/latest"] = test_get_latest_frames()
    results["GET /edge/frames/latest/<source>"] = test_get_latest_frame_by_source()
    results["GET /edge/devices"] = test_get_devices()
    results["GET /edge/devices/<source>"] = test_get_device_info()
    results["GET /edge/stats"] = test_get_stats()
    
    # 測試無效數據
    results["POST /edge/frames (invalid)"] = test_invalid_frame()
    
    # 列印總結
    print("\n" + "=" * 60)
    print("測試結果總結")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n總計: {passed}/{total} 通過")
    
    if passed == total:
        print("\n✓ 所有測試通過！")
        return 0
    else:
        print(f"\n✗ {total - passed} 個測試失敗")
        return 1


if __name__ == "__main__":
    exit(main())
