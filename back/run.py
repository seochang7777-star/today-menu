import os
import eventlet
eventlet.monkey_patch()

# DATABASE_URL 강제 설정 확인
db_url = os.environ.get('DATABASE_URL', '')
if db_url:
    os.environ['SQLALCHEMY_DATABASE_URI'] = db_url
    print(f"DB URL: {db_url[:40]}")
else:
    print("WARNING: DATABASE_URL not set!")


from dotenv import load_dotenv
load_dotenv()

from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
