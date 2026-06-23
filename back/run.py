from app import create_app

# 1. 앱을 생성합니다. (app 폴더의 __init__.py에서 정의)
app = create_app()

if __name__ == '__main__':
    # 2. 서버를 실행합니다.
    # debug=True는 개발 중 코드 변경을 즉시 반영해줍니다.
    app.run(host='0.0.0.0', port=5000, debug=True)