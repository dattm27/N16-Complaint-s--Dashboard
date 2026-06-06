# Consumer Complaints Dashboard

Dashboard tự code lại theo tinh thần Chapter 20 - Complaints Dashboard: canvas trắng, tiêu đề lớn màu teal, KPI kiêm legend màu, stacked bar theo thời gian, hex map làm bộ lọc state, và hai biểu đồ đối chiếu Closed/Open theo reason/party.

## Dataset

- File local: `data/consumer_complaints.csv`
- Nguồn: Plotly datasets, `26k-consumer-complaints.csv`
- Số dòng dữ liệu: 28,156 complaints
- Khoảng thời gian: 2015-01-01 đến 2015-03-19

Quy ước trạng thái:

- `Company response = In progress` -> `Open`
- Các giá trị phản hồi còn lại -> `Closed`

## Chạy dashboard

Từ thư mục này:

```bash
python3 -m http.server 4173
```

Mở:

```text
http://127.0.0.1:4173/index.html
```

## Test tính năng

```bash
npm test
```

Smoke test kiểm tra:

- Dashboard load đúng 28,156 records.
- Open complaints được tính từ `In progress`.
- Filter status hoạt động.
- Click state trên hex map lọc toàn dashboard.
- Source Type/Product filter thu hẹp dữ liệu.
- Reset trả dashboard về trạng thái ban đầu.
- Screenshot lưu tại `artifacts/dashboard-smoke.png`.
- Mobile screenshot lưu tại `artifacts/dashboard-mobile.png`.
