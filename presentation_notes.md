# Dàn ý trình bày Dashboard Consumer Complaints

## 1. Dataset và đề bài tự đề xuất

Dashboard sử dụng dataset `26k-consumer-complaints.csv` từ Plotly, gồm 28.156 khiếu nại tài chính trong giai đoạn 01/01/2015 - 19/03/2015. Bối cảnh đặt ra là một nhóm compliance/customer service của tổ chức tài chính cần theo dõi khối lượng khiếu nại, xác định khiếu nại nào còn mở, tiểu bang nào có nhiều vụ cần xử lý và vấn đề/công ty nào tạo ra nhiều workload nhất.

Vì dataset không có cột `Open/Closed` trực tiếp, trạng thái được suy luận như sau:

- `Company response = In progress`: Open.
- Các phản hồi còn lại như `Closed with explanation`, `Closed with monetary relief`, `Closed with non-monetary relief`, `Closed`, `Untimely response`: Closed.

## 2. Mục tiêu của Visualization Dashboard

Mục tiêu chính là hỗ trợ giám sát và ưu tiên xử lý khiếu nại tài chính. Người dùng cần nhanh chóng trả lời:

- Tổng số complaint trong khoảng thời gian đang chọn là bao nhiêu?
- Bao nhiêu complaint còn open và cần follow-up?
- Open complaint tập trung ở state nào?
- Issue nào xuất hiện nhiều nhất?
- Company nào tạo ra nhiều complaint nhất trong lát cắt dữ liệu đang xem?
- Các complaint open lâu nhất là những record nào?

Dashboard vì vậy được thiết kế theo hướng operational/compliance: ưu tiên tốc độ đọc, khả năng lọc nhanh và nhận diện điểm cần hành động.

## 3. Story được chọn để thể hiện

Story của dashboard là: "Từ toàn cảnh volume khiếu nại, tìm nhanh nhóm complaint còn mở và xác định nơi/vấn đề/công ty cần ưu tiên xử lý".

Luồng đọc đề xuất:

1. Nhìn KPI để biết workload tổng, số open, số closed và tỷ lệ open.
2. Xem stacked bar theo thời gian để phát hiện tuần nào có nhiều complaint/open complaint.
3. Xem hex map để biết state nào đang có nhiều open complaint.
4. Xem issue/company chart để biết nguyên nhân và đối tượng nổi bật.
5. Dùng bảng oldest open complaints để chuyển từ phân tích tổng hợp sang danh sách record cần xử lý.

## 4. Các lựa chọn hiển thị phản ánh story ra sao?

- KPI ở đầu dashboard vừa là số tổng quan vừa đóng vai trò color legend: màu cam là Open, màu xanh là Closed. Cách này giống tinh thần Chapter 20 vì người xem không cần tìm legend riêng.
- Stacked bar chart dùng Open ở segment dưới cùng, bám baseline. Điều này giúp so sánh open complaint giữa các tuần chính xác hơn, vì open complaint là phần quan trọng nhất.
- Hex map được dùng thay cho choropleth map. Mỗi state có diện tích bằng nhau, giúp state nhỏ như RI, DE, DC vẫn dễ nhìn và dễ click. Map đồng thời là bộ lọc tương tác.
- Horizontal stacked bar chart được dùng cho Issue và Company vì bar chart phù hợp cho so sánh định lượng giữa các nhóm danh mục.
- Bảng chi tiết tập trung vào các complaint open lâu nhất, giúp dashboard không chỉ dừng ở insight mà còn hỗ trợ hành động tiếp theo.
- Bộ lọc date, status, product, search và click filter trên chart/map cho phép người dùng đi từ tổng quan tới lát cắt cụ thể.

## 5. Ưu điểm của Dashboard

- Bám tốt scenario trong Chapter 20: theo dõi complaint, open/closed, time range, state filter và reason/category.
- Màu sắc nhất quán: Open luôn dùng cam, Closed luôn dùng xanh.
- KPI kiêm legend giúp giảm clutter.
- Hex map có giá trị phân tích và giá trị tương tác, không chỉ là trang trí.
- Open complaint được ưu tiên trong thiết kế stacked bar và bảng chi tiết.
- Dashboard chạy local, không phụ thuộc CDN hay framework bên ngoài.
- Có smoke test tự động cho các chức năng chính: load dữ liệu, filter, map click, search, reset, export.

## 6. Nhược điểm của Dashboard

- Dataset chỉ bao phủ giai đoạn ngắn từ 01/01/2015 đến 19/03/2015, nên trend dài hạn chưa mạnh.
- Dataset không có cột party/source giống dashboard trong sách, nên dashboard thay bằng Company. Điều này phù hợp dữ liệu nhưng không tái hiện hoàn toàn phần "complaints by party".
- Open/Closed là trạng thái suy luận từ `Company response`, không phải field nghiệp vụ chuẩn.
- Hex map hy sinh vị trí địa lý chính xác để đổi lấy tính dễ nhìn/dễ click.
- Các issue/company tên dài nên phải rút gọn label trên chart; người dùng cần hover hoặc xem bảng để thấy đầy đủ.
- Chưa có drill-down tới từng complaint detail page hoặc workflow cập nhật trạng thái xử lý.

## 7. Có thể improve Dashboard ở khía cạnh nào?

- Dùng dataset đầy đủ hơn từ CFPB để có thêm `Submitted via`, `Consumer narrative`, `Tags`, thời gian xử lý và dữ liệu nhiều năm.
- Bổ sung SLA metric: số ngày open, số complaint quá hạn, median response time, tỷ lệ timely response.
- Thêm filter theo channel/source nếu dataset có cột này để giống Chapter 20 hơn.
- Thêm small multiples hoặc trend theo product để so sánh workload giữa các dòng sản phẩm.
- Thêm tooltip giàu thông tin và detail drawer khi click một complaint trong bảng.
- Cải thiện accessibility: mô tả chart bằng text summary tự động và hỗ trợ keyboard tốt hơn cho mọi phần tử tương tác.
- Nếu triển khai thật, nên kết nối database/API thay vì đọc CSV tĩnh, đồng thời thêm phân quyền và audit log cho nhóm compliance.

## 8. Liên hệ nội dung Chapter 20

Dashboard này áp dụng các nguyên tắc chính trong Chapter 20:

- Chọn màu đơn giản và dùng nhất quán cho Open/Closed.
- Dùng bar chart cho so sánh định lượng.
- Khi dùng stacked bar, đặt phần quan trọng nhất ở baseline.
- Dùng hex map khi cần hiển thị/click tất cả state với diện tích ngang nhau.
- Tổ chức dashboard thành các khu vực rõ ràng để giảm clutter.
- Mỗi biểu đồ không chỉ để trang trí mà phải hỗ trợ câu hỏi phân tích hoặc hành động cụ thể.
