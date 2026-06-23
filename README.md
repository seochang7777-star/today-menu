처음 하실시
----
cd today-menu/back
pip install -r requirements.txt
flask --app run db init
flask --app run db migrate -m "init"
flask --app run db upgrade
python run.py
----
이후
cd back
python run.py
http://127.0.0.1:5000
----
오전 작업전

git checkout main
git pull origin main
git checkout 각자 브런치

이후 작업
---
