"""
FlowOptix ML Model — task category classifier.
Trains a scikit-learn TF-IDF + Multinomial Naive Bayes pipeline,
saves the model as task_classifier.pkl, and exports weights as
model_weights.json for pure-JS inference at runtime.

Usage:
    pip install -r requirements_ml.txt
    python ml_model.py

To retrain with new data from Supabase:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python ml_model.py

Environment variables (optional — falls back to .env):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import json
import math
import os
import pickle
import sys
from pathlib import Path

from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score

load_dotenv()

# ── Seed training data ─────────────────────────────────────────────────────
SEED_DATA = [
    # file ops
    ('open excel',                  'file ops'),
    ('copy data',                   'file ops'),
    ('paste data',                  'file ops'),
    ('upload file',                 'file ops'),
    ('download report',             'file ops'),
    ('save spreadsheet',            'file ops'),
    ('export csv',                  'file ops'),
    ('import data',                 'file ops'),
    ('open word document',          'file ops'),
    ('rename file',                 'file ops'),
    ('delete files',                'file ops'),
    ('move files',                  'file ops'),
    ('create folder',               'file ops'),
    ('open pdf',                    'file ops'),
    ('merge spreadsheets',          'file ops'),
    ('backup files',                'file ops'),
    ('extract zip',                 'file ops'),
    ('archive documents',           'file ops'),
    ('open google sheets',          'file ops'),
    ('edit spreadsheet',            'file ops'),
    ('format document',             'file ops'),
    ('convert pdf',                 'file ops'),
    ('sync files',                  'file ops'),
    ('compress files',              'file ops'),

    # communication
    ('send email',                  'communication'),
    ('reply to email',              'communication'),
    ('check slack',                 'communication'),
    ('join meeting',                'communication'),
    ('schedule meeting',            'communication'),
    ('write email',                 'communication'),
    ('respond to message',          'communication'),
    ('hop on a call',               'communication'),
    ('video call',                  'communication'),
    ('zoom meeting',                'communication'),
    ('teams call',                  'communication'),
    ('send slack message',          'communication'),
    ('reply to slack',              'communication'),
    ('post in channel',             'communication'),
    ('read emails',                 'communication'),
    ('compose message',             'communication'),
    ('answer phone',                'communication'),
    ('send notification',           'communication'),
    ('broadcast update',            'communication'),
    ('client call',                 'communication'),
    ('check messages',              'communication'),
    ('respond to comments',         'communication'),
    ('follow up email',             'communication'),
    ('send invite',                 'communication'),

    # development
    ('write code',                  'development'),
    ('review pull request',         'development'),
    ('fix bug',                     'development'),
    ('deploy app',                  'development'),
    ('run tests',                   'development'),
    ('code review',                 'development'),
    ('debug issue',                 'development'),
    ('write unit tests',            'development'),
    ('refactor code',               'development'),
    ('push to github',              'development'),
    ('merge pull request',          'development'),
    ('update api',                  'development'),
    ('build feature',               'development'),
    ('setup environment',           'development'),
    ('install dependencies',        'development'),
    ('optimize query',              'development'),
    ('write documentation',         'development'),
    ('create endpoint',             'development'),
    ('test api',                    'development'),
    ('commit changes',              'development'),
    ('resolve conflicts',           'development'),
    ('configure server',            'development'),
    ('implement feature',           'development'),
    ('fix typescript error',        'development'),
    ('deploy to production',        'development'),
    ('push to production',          'development'),
    ('release to production',       'development'),
    ('deploy to staging',           'development'),
    ('production release',          'development'),
    ('release build',               'development'),
    ('ship feature',                'development'),
    ('hotfix production',           'development'),

    # reporting
    ('generate report',             'reporting'),
    ('update dashboard',            'reporting'),
    ('create presentation',         'reporting'),
    ('analyze data',                'reporting'),
    ('review metrics',              'reporting'),
    ('compile report',              'reporting'),
    ('create charts',               'reporting'),
    ('review kpis',                 'reporting'),
    ('make slides',                 'reporting'),
    ('data analysis',               'reporting'),
    ('write summary',               'reporting'),
    ('prepare report',              'reporting'),
    ('check analytics',             'reporting'),
    ('monthly report',              'reporting'),
    ('weekly report',               'reporting'),
    ('build dashboard',             'reporting'),
    ('performance review',          'reporting'),
    ('track metrics',               'reporting'),
    ('visualize data',              'reporting'),
    ('export analytics',            'reporting'),
    ('create report',               'reporting'),
    ('review report',               'reporting'),

    # admin
    ('update jira ticket',          'admin'),
    ('fill timesheet',              'admin'),
    ('attend standup',              'admin'),
    ('organize calendar',           'admin'),
    ('plan sprint',                 'admin'),
    ('create ticket',               'admin'),
    ('update ticket',               'admin'),
    ('log hours',                   'admin'),
    ('manage backlog',              'admin'),
    ('prioritize tasks',            'admin'),
    ('write spec',                  'admin'),
    ('update roadmap',              'admin'),
    ('book travel',                 'admin'),
    ('submit expense',              'admin'),
    ('review budget',               'admin'),
    ('assign task',                 'admin'),
    ('check in',                    'admin'),
    ('retrospective',               'admin'),
    ('sprint planning',             'admin'),
    ('update confluence',           'admin'),
    ('project planning',            'admin'),
    ('manage team',                 'admin'),
    ('onboard new member',          'admin'),
    ('resource planning',           'admin'),

    # general
    ('read article',                'general'),
    ('research topic',              'general'),
    ('take notes',                  'general'),
    ('learn new skill',             'general'),
    ('personal task',               'general'),
    ('complete task',               'general'),
    ('work on project',             'general'),
    ('finish assignment',           'general'),
    ('review notes',                'general'),
    ('prepare for meeting',         'general'),
    ('think through problem',       'general'),
    ('brainstorm ideas',            'general'),
    ('miscellaneous task',          'general'),
]


def fetch_supabase_tasks():
    """Optionally fetch real task_logs from Supabase to augment training data."""
    url = os.getenv('SUPABASE_URL', '').strip()
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
    if not url or not key:
        print('[ml_model] No SUPABASE credentials — using seed data only.')
        return []
    try:
        from supabase import create_client
        client = create_client(url, key)
        resp = client.table('task_logs') \
            .select('task_name, category') \
            .not_.is_('category', 'null') \
            .neq('category', 'general') \
            .limit(500) \
            .execute()
        rows = resp.data or []
        data = [(r['task_name'], r['category']) for r in rows if r.get('task_name') and r.get('category')]
        print(f'[ml_model] Fetched {len(data)} labeled tasks from Supabase.')
        return data
    except Exception as e:
        print(f'[ml_model] Supabase fetch failed: {e}. Using seed data only.')
        return []


def export_weights(pipeline, classes, out_path: Path):
    """Export model weights as model_weights.json for pure-JS inference."""
    vectorizer: TfidfVectorizer = pipeline.named_steps['tfidf']
    nb: MultinomialNB = pipeline.named_steps['nb']

    vocab = vectorizer.get_feature_names_out().tolist()
    log_priors = {c: float(nb.class_log_prior_[i]) for i, c in enumerate(classes)}

    # log P(token | class) — shape: (n_classes, n_features)
    log_likelihood = {}
    for i, c in enumerate(classes):
        ll = {}
        for j, word in enumerate(vocab):
            ll[word] = float(nb.feature_log_prob_[i][j])
        log_likelihood[c] = ll

    # Unseen token: use minimum log-prob per class (smooth)
    unk_ll = {c: float(nb.feature_log_prob_[i].min()) for i, c in enumerate(classes)}

    weights = {
        'classes': classes,
        'vocabulary': vocab,
        'logPriors': log_priors,
        'logLikelihood': log_likelihood,
        'unkLogLikelihood': unk_ll,
        'idfValues': {w: float(vectorizer.idf_[j]) for j, w in enumerate(vocab)},
        'trainedAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        'engine': 'scikit-learn',
    }

    out_path.write_text(json.dumps(weights, indent=2))
    print(f'[ml_model] Weights exported -> {out_path}')


def main():
    supabase_data = fetch_supabase_tasks()
    all_data = SEED_DATA + supabase_data
    print(f'[ml_model] Total training examples: {len(all_data)}')

    texts  = [t for t, _ in all_data]
    labels = [l for _, l in all_data]
    classes = sorted(set(labels))

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            lowercase=True,
        )),
        ('nb', MultinomialNB(alpha=1.0)),
    ])
    pipeline.fit(texts, labels)

    # Cross-validation accuracy
    scores = cross_val_score(pipeline, texts, labels, cv=min(5, len(set(labels))), scoring='accuracy')
    print(f'[ml_model] CV accuracy: {scores.mean():.2%} ± {scores.std():.2%}')

    # Save .pkl
    pkl_path = Path(__file__).parent / 'task_classifier.pkl'
    with open(pkl_path, 'wb') as f:
        pickle.dump(pipeline, f)
    print(f'[ml_model] Model saved -> {pkl_path}')

    # Export JSON weights for JS
    weights_path = Path(__file__).parent / 'model_weights.json'
    export_weights(pipeline, classes, weights_path)

    # Quick smoke test
    test_cases = [
        ('Deploy to production', 'development'),
        ('Generate monthly report', 'reporting'),
        ('Send email to client', 'communication'),
        ('Open excel file', 'file ops'),
        ('Fill in timesheet', 'admin'),
    ]
    passed = 0
    for text, expected in test_cases:
        pred = pipeline.predict([text])[0]
        ok = pred == expected
        if ok:
            passed += 1
        mark = 'OK' if ok else 'FAIL'
        print(f'  [{mark}] "{text}" -> {pred}' + ('' if ok else f' (expected {expected})'))
    print(f'[ml_model] Smoke test: {passed}/{len(test_cases)}')
    print(f'[ml_model] CV accuracy (note: low CV on small dataset is expected): {scores.mean():.1%}')


if __name__ == '__main__':
    main()
