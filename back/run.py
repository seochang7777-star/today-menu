from dotenv import load_dotenv
from app import create_app

# ➕ Flask 앱이 생성되기 전에 .env 파일의 환경 변수(OpenAI 키 등)를 먼저 주입!
load_dotenv()

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
