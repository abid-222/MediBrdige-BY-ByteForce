.PHONY: setup api web seed test train sql check
setup:
	cd apps/api && pip install -r requirements.txt && cp -n .env.example .env || true
	cd apps/web && npm install && cp -n .env.example .env.local || true
api:
	cd apps/api && uvicorn app.main:app --reload --port 8000
web:
	cd apps/web && npm run dev
seed:
	cd apps/api && python ../../scripts/seed.py
test:
	cd apps/api && python -m pytest -q
train:
	cd apps/api && python -m ml.train
sql:
	cd apps/api && python ../../scripts/gen_sql.py
check:
	cd apps/web && npm run check:i18n && npx tsc --noEmit && npx next lint && npm test
