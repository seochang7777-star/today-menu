from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, emit
from datetime import datetime
import uuid
from app.models import ChatMessage
from app import db

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",
    supports_credentials=True
)

rooms = {} 
users = {}

@app.route("/api/rooms")
def get_rooms():
    return {
        "rooms": [
            {"id": room_id, "name": room["name"]}
            for room_id, room in rooms.items()
        ]
    }


@socketio.on("join")
def handle_join(data):
    username = data.get("username")
    room_id = data.get("room_id")

    if room_id not in rooms:
        emit("error", {"message": "존재하지 않는 채팅방입니다."})
        return

    join_room(room_id)

    users[username] = room_id

    emit("previous_messages", rooms[room_id]["messages"])

    emit(
        "system_message",
        {
            "message": f"{username}님이 입장했습니다.",
            "created_at": datetime.now().strftime("%H:%M:%S")
        },
        to=room_id
    )


@socketio.on("leave")
def handle_leave(data):
    username = data.get("username")
    room_id = users.get(username)

    if room_id:
        leave_room(room_id)
        users.pop(username, None)

        emit(
            "system_message",
            {
                "message": f"{username}님이 퇴장했습니다.",
                "created_at": datetime.now().strftime("%H:%M:%S")
            },
            to=room_id
        )


@socketio.on("send_message")
def handle_message(data):
    username = data.get("username")
    room_id = data.get("room_id")
    content = data.get("content")
    sender_id = data.get("sender_id") # 프론트에서 보내줄 때 꼭 포함하세요!

    # 1. 방 존재 여부 체크 (기존 로직 유지)
    if room_id not in rooms:
        emit("error", {"message": "존재하지 않는 방입니다."})
        return

    # 2. [추가] DB에 채팅 내용 저장
    msg_db = ChatMessage(
        party_id=room_id, 
        sender_id=sender_id, 
        content=content
    )
    db.session.add(msg_db)
    db.session.commit()

    # 3. 기존 rooms 리스트에도 업데이트 (실시간 유지용)
    message = {
        "id": msg_db.id, # DB에서 생성된 ID 사용 추천
        "username": username,
        "content": content,
        "created_at": datetime.now().strftime("%H:%M:%S")
    }
    rooms[room_id]["messages"].append(message)
    
    # 4. 방에 있는 모두에게 전송
    emit("receive_message", message, to=room_id)


@socketio.on("disconnect")
def handle_disconnect():
    print("클라이언트 연결 종료")


if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000)