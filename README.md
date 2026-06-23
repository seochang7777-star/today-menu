cd back
pip install -r requirements.txt
flask --app run db init && flask --app run db migrate -m "init" && flask --app run db upgrade
python run.py          # :5000

# 터미널 2 — React
cd front
npm install
npm run dev            # :5173 → 자동으로 :5000 프록시
