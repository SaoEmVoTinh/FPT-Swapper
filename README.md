# FPT ClassSwap

Nền tảng kết nối sinh viên FPT để hỗ trợ đổi lớp học theo cơ chế matching hai chiều (Tinder-style) và định hướng mở rộng thành hệ sinh thái kết nối học tập (**ClassSwap**, **StudyBuddy**, **TeamFinder**).

> **Lưu ý quan trọng:** Đây là nền tảng hỗ trợ kết nối sinh viên, **không phải hệ thống đăng ký tín chỉ chính thức của FPT**. Match chỉ thể hiện sự đồng thuận ban đầu giữa hai sinh viên; sinh viên cần tự thực hiện thủ tục đổi lớp theo quy định của nhà trường.

## Cấu trúc dự án

- `frontend/`: Next.js (App Router) + React + TypeScript + Tailwind CSS
- `backend/`: Python FastAPI (Modular Monolith) + SQLAlchemy + Alembic + PostgreSQL
- `docker-compose.yml`: Môi trường phát triển local (PostgreSQL, Backend, Frontend)
- `FPT_ClassSwap_Project_Plan.md`: Tài liệu kế hoạch và định hướng triển khai

## Chạy nhanh (Development)

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Mở `http://localhost:3000`.

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API docs: `http://localhost:8000/api/v1/docs`

### Docker Compose
```bash
docker compose up --build
```

