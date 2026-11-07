"""Reproducible training: TF-IDF + LogisticRegression, document-level split.
Usage (from apps/api):  python -m ml.train
Data: /data/doc_types.csv  (synthetic, clearly labelled). Outputs: model.joblib, metrics.json, MODEL_CARD.md"""
import csv, json, os, random
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "..", "..", "data", "doc_types.csv")
SEED = 42

LAB = ["Complete Blood Count Hemoglobin {n} g/dL WBC platelet reference range", "Blood glucose fasting {n} mg/dL laboratory report pathology",
       "Lab report test result unit reference range specimen collected pathologist", "Serum creatinine lipid profile result units normal range"]
RX = ["Rx Tab. {n} mg twice daily after meals for 7 days", "Prescription Cap. take one tablet at night dosage advice follow up",
      "Rx syrup 5ml three times daily medicine name dose duration", "Prescription advice drug 1+0+1 days refill"]
DIS = ["Discharge summary admitted on diagnosis hospital course discharged condition", "Discharge advice follow up after {n} days ward bed admission date",
       "Hospital discharge summary procedure performed condition at discharge", "Admission discharge date treatment given summary"]
OTH = ["Invoice payment receipt amount {n} thank you", "Appointment card visit timing reception", "Insurance claim form policy number",
       "Photo of a document with no medical content {n}"]


def make_data(n_per=60):
    random.seed(SEED)
    rows = []
    for label, tpls in (("lab", LAB), ("prescription", RX), ("discharge", DIS), ("other", OTH)):
        for i in range(n_per):
            rows.append({"doc_id": f"{label}-{i}", "label": label, "text": random.choice(tpls).format(n=random.randint(3, 500))})
    return rows


def main():
    if not os.path.exists(DATA):
        rows = make_data()
        os.makedirs(os.path.dirname(DATA), exist_ok=True)
        with open(DATA, "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=["doc_id", "label", "text"]); w.writeheader(); w.writerows(rows)
    rows = list(csv.DictReader(open(DATA)))
    X, y = [r["text"] for r in rows], [r["label"] for r in rows]
    # each row is its own document, so the split is document-level (no document appears in both sets)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=SEED, stratify=y)
    model = make_pipeline(TfidfVectorizer(ngram_range=(1, 2), min_df=1), LogisticRegression(max_iter=500))
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    labels = sorted(set(y))
    metrics = {"macro_f1": float(f1_score(yte, pred, average="macro")),
               "per_class_recall": dict(zip(labels, map(float, recall_score(yte, pred, average=None, labels=labels)))),
               "confusion_matrix": {"labels": labels, "matrix": confusion_matrix(yte, pred, labels=labels).tolist()},
               "n_train": len(Xtr), "n_test": len(Xte), "data": "synthetic", "label": "research prototype"}
    joblib.dump(model, os.path.join(HERE, "model.joblib"))
    json.dump(metrics, open(os.path.join(HERE, "metrics.json"), "w"), indent=2)
    open(os.path.join(HERE, "MODEL_CARD.md"), "w").write(f"""# Model card — document-type classifier (RESEARCH PROTOTYPE)
- Task: classify text into lab / prescription / discharge / other. Abstains to 'other' below 0.55 confidence.
- Model: TF-IDF (1-2 grams) + Logistic Regression, seed {SEED}.
- Data: synthetic, template-generated ({len(rows)} docs). Not real patient data.
- Metrics (held-out): macro-F1 {metrics['macro_f1']:.3f}; per-class recall {metrics['per_class_recall']}.
- Intended use: routing uploaded documents in a hackathon demo.
- Limitations: data is template-generated, so near-perfect scores only show the pipeline works; they are NOT clinical validation. Do not use for diagnosis or risk prediction.
""")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
