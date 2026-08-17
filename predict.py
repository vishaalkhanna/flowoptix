"""
CLI wrapper for the task_classifier.pkl model.
Used as a subprocess fallback when model_weights.json is unavailable.

Usage:
    python predict.py "Write code for new feature"
Output (stdout, JSON):
    {"category": "development", "confidence": 0.94}
"""

import json
import pickle
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No task text provided"}))
        sys.exit(1)

    task_text = sys.argv[1]
    model_path = Path(__file__).parent / 'task_classifier.pkl'

    if not model_path.exists():
        print(json.dumps({"error": "Model not trained — run: python ml_model.py"}))
        sys.exit(1)

    with open(model_path, 'rb') as f:
        pipeline = pickle.load(f)

    proba = pipeline.predict_proba([task_text])[0]
    pred  = pipeline.predict([task_text])[0]
    conf  = float(max(proba))

    print(json.dumps({"category": pred, "confidence": round(conf, 4)}))


if __name__ == '__main__':
    main()
