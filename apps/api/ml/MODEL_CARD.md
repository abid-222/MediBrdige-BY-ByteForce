# Model card — document-type classifier (RESEARCH PROTOTYPE)
- Task: classify text into lab / prescription / discharge / other. Abstains to 'other' below 0.55 confidence.
- Model: TF-IDF (1-2 grams) + Logistic Regression, seed 42.
- Data: synthetic, template-generated (240 docs). Not real patient data.
- Metrics (held-out): macro-F1 1.000; per-class recall {'discharge': 1.0, 'lab': 1.0, 'other': 1.0, 'prescription': 1.0}.
- Intended use: routing uploaded documents in a hackathon demo.
- Limitations: data is template-generated, so near-perfect scores only show the pipeline works; they are NOT clinical validation. Do not use for diagnosis or risk prediction.
