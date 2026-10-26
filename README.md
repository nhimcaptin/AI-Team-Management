# 🤝 AI Team

Antigravity, Claude và Codex làm việc như một team trong một group chat trên trình duyệt:

| Role | Mặc định | Việc làm |
|---|---|---|
| 🔍 Phân tích | Antigravity | Hiểu yêu cầu, đọc codebase, đưa ra phương án và kế hoạch |
| ⚖️ Phản biện | Claude | Tìm rủi ro, phản biện kế hoạch. Phải **AGREE** thì mới được code |
| 🛠️ Code | Codex | Viết code theo kế hoạch đã thống nhất, sửa theo review |

```
Phân tích ⇄ Phản biện (tối đa 3 vòng) → [Duyệt] → Code ⇄ Review x2 (tối đa 2 lần sửa) → [Duyệt] → Merge
```

- Bạn **nhắn vào nhóm bất kỳ lúc nào**. AI làm bước kế tiếp sẽ đọc tin của bạn.
- Công tắc **Auto**:
  - **Bật**: AI tự chạy đến hết.
  - **Tắt**: dừng chờ bạn bấm Duyệt/Từ chối trước khi code và trước khi merge.
  - Nếu 2 AI cãi nhau không xong, hoặc một AI bị lỗi, tool **luôn dừng hỏi bạn**, kể cả khi đang bật Auto.
- **Project có git:** code được viết trên branch riêng `ai-team/<task>`. Khi được duyệt, tool merge vào branch gốc trên máy bạn và **không bao giờ tự push**.
- **Project không có git:** AI sửa thẳng trong thư mục, không có branch hay merge. Tool tự so sánh file trước và sau khi code để biết file nào đã đổi, rồi đưa cho reviewer.

## Cài đặt (làm trên mỗi máy)

Cần có: **Node.js ≥ 20** và **git** (để dùng tính năng branch). Tool không có dependency, nên không cần `npm install`.

1. Clone repo. Nên để ở ổ D cho đỡ chật ổ C:
   ```bash
   git clone <url-repo> D:\ai-team
   ```
2. Kiểm tra và cài CLI cho 3 AI:
   ```bash
   npm run doctor
   ```
   - Tool tự dò CLI ở PATH, ở các bản Node cài bằng nvm, và bản đi kèm app desktop (Claude Desktop có sẵn Claude Code, app Codex có sẵn Codex). Có app desktop rồi thì thường không cần cài thêm.
   - Thiếu CLI nào thì cài tự động bằng `npm run doctor -- --install`, hoặc bấm **Cài đặt** trong ⚙️ Cài đặt → *CLI Trên Máy*. Chấm cạnh tên AI ở cột trái chuyển đỏ khi thiếu CLI.
   - Cài xong thì đăng nhập: `claude` rồi gõ `/login`, `codex login`, chạy `agy` một lần (dùng chung đăng nhập với app Antigravity).
3. Chạy: double-click **`start.cmd`**, hoặc chạy `npm start` rồi mở http://localhost:3939.

Muốn thử giao diện mà chưa tốn quota thì chạy `npm run mock`. Ở chế độ này các AI trả lời giả lập.

## Dùng

1. Bấm **+ Task mới** rồi nhập yêu cầu và đường dẫn project.
   - Nếu project dùng git: phải có ít nhất 1 commit và không có thay đổi chưa commit.
   - Nếu project không dùng git: nên tự sao lưu trước, vì AI sửa thẳng vào file.
2. Xem các AI trao đổi trong khung chat. Cột phải hiện bước hiện tại, số vòng và thời gian đã chạy.
3. Khi có thẻ ✋, bấm Duyệt hoặc Từ chối. Có thể kèm góp ý.
4. Kết thúc sẽ có báo cáo: branch, các file thay đổi, đã merge hay chưa.

**Task đã xong vẫn nhắn tiếp được.** Tin nhắn sẽ thành *yêu cầu tiếp theo*: cả nhóm chạy lại quy trình, có ngữ cảnh của các yêu cầu trước. Nếu branch cũ chưa merge thì code tiếp trên branch đó; nếu đã merge thì tạo branch mới.

**Tab Branch** (cột phải, cạnh tab Tiến độ) cho project của task đang mở:
- Cây branch giống VS Code: gom theo thư mục (`ai-team/…`), ✓ là branch hiện tại, ↓↑ là số commit chậm/nhanh hơn remote.
- **Double-click** vào branch để checkout.
- **Chuột phải** vào branch để mở menu: Checkout, Fetch, Pull (chỉ fast-forward, không tạo merge commit), Push, Merge vào branch hiện tại, Copy tên branch.
- Rê chuột lên branch để xem commit mới nhất.
- Có ô tìm branch, nút ⟳ tải lại và nút ⇣ fetch remote.
- Repo chưa có remote thì có ô dán link để liên kết.
- Bị chặn khi project có thay đổi chưa commit hoặc có task đang chạy. Merge bị conflict thì tự huỷ để repo trở lại như cũ.
- Project không có git thì tab hiện "Vui lòng liên kết git".
- Push chỉ xảy ra khi bạn chọn Push trong menu và xác nhận. Pipeline của AI không bao giờ tự push.

**⚙️ Cài đặt:**
- Chọn AI cho từng role, model cho từng AI (để trống là dùng model mặc định của CLI).
- Đổi tên, màu và ảnh avatar cho từng AI.
- Chỉnh số vòng phản biện, số lần sửa, Auto mặc định.
- Lưu vào `ai-team.config.local.json`, nên mỗi máy có cài đặt riêng.

Lịch sử chat và prompt của từng lượt gọi AI nằm trong `<project>/.ai-team/<task>/`. Thư mục này tự được thêm vào `.git/info/exclude`, nên không lẫn vào commit.

## Cấu hình

Cấu hình chung nằm trong `ai-team.config.json`, file này được commit. Muốn chỉnh riêng cho từng máy thì tạo `ai-team.config.local.json` (file này không commit), chỉ ghi những gì cần đổi, ví dụ:

```json
{
  "port": 4000,
  "roles": { "analyst": "claude", "critic": "antigravity", "coder": "codex" },
  "maxDebateRounds": 2,
  "agents": { "codex": { "command": "C:\\tools\\codex.cmd" } }
}
```

- `roles`: đổi AI nào làm role nào.
- `agents.<tên>.args.read` / `args.write`: tham số CLI khi chỉ đọc / khi được ghi file. Chỉnh ở đây nếu CLI đổi flag sau khi cập nhật.
- `agents.<tên>.env`: biến môi trường riêng cho CLI đó.
- `timeoutMinutes`: thời gian tối đa cho mỗi lượt gọi.

## Dung lượng ổ C

- Bản thân tool **dưới 1 MB**. Lịch sử chat nằm trong thư mục project, tức là ở ổ chứa project.
- Phần tốn dung lượng là **dữ liệu của các CLI** trong thư mục user (`~/.codex`, `~/.claude`, `~/.gemini`):
  - Codex được gọi với `--ephemeral`, nên các lượt chạy từ tool không lưu session.
  - Claude và Antigravity vẫn lưu session như bình thường. `clean-sessions` không đụng vào `~/.gemini` vì đó cũng là dữ liệu của app Antigravity.
- `npm run doctor` hiện dung lượng từng thư mục.
- `npm run clean-sessions -- --days 14` xoá session cũ hơn 14 ngày. Lệnh này hỏi xác nhận trước khi xoá và không đụng tới đăng nhập.

## Cấu trúc

```
src/server.js        HTTP + SSE + API
src/orchestrator.js  pipeline: phân tích ⇄ phản biện → code ⇄ review → merge
src/agents.js        gọi CLI, đọc output stream
src/prompts.js       prompt cho từng role
src/mock.js          AI giả lập để thử
public/              giao diện chat
scripts/             doctor, clean-sessions
```
